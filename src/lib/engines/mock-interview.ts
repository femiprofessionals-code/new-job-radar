/**
 * AI Mock Interview engine. Question selection, follow-up generation, and
 * scoring. Uses the AI provider when keys exist; a curated interviewer
 * playbook in demo mode.
 */
import { generate } from "@/lib/ai/provider";

export const FOCUS_AREAS = [
  { id: "behavioral", label: "Behavioral", description: "STAR storytelling, leadership, conflict, failure." },
  { id: "technical", label: "Technical", description: "Problem solving, architecture, trade-off communication." },
  { id: "system_design", label: "System Design", description: "Scalability, data modeling, infrastructure judgment." },
  { id: "company", label: "Company-Specific", description: "Tailored to a target company's known loop and values." },
] as const;

const QUESTION_BANK: Record<string, string[]> = {
  behavioral: [
    "Tell me about a time you had to influence a decision without having authority.",
    "Describe a project that failed or fell short. What did you do?",
    "Tell me about a conflict with a teammate over technical direction. How was it resolved?",
    "What's the piece of work you're most proud of, and what was your specific contribution?",
    "Tell me about a time you received hard feedback. What changed afterward?",
    "Describe a time you had to deliver under an unrealistic deadline.",
  ],
  technical: [
    "Walk me through the architecture of the most complex system you've worked on.",
    "A page in production is suddenly slow. Walk me through your diagnosis, step by step.",
    "How do you decide between fixing tech debt and shipping features? Give a real example.",
    "Describe a bug that took you days to find. What made it hard, and what did you learn?",
    "How would you design the testing strategy for a critical payment flow?",
    "What's a technical decision you made that you'd reverse today? Why?",
  ],
  system_design: [
    "Design a rate limiter for a public API. Walk me through your approach.",
    "How would you design the backend for a real-time collaborative document editor?",
    "Design a notification system that supports email, push, and in-app channels at 10M users.",
    "How would you migrate a monolith to services without freezing feature work?",
    "Design a job queue that guarantees at-least-once processing. What are the failure modes?",
  ],
  company: [
    "Why this company, specifically? What about the product resonates with you?",
    "Which of our product's surfaces would you improve first, and how would you measure success?",
    "Our team values speed with quality. Tell me about a time you delivered both.",
    "Where do you see this product in two years, and what role would you want in getting there?",
  ],
};

export function firstQuestion(focus: string): string {
  const bank = QUESTION_BANK[focus] ?? QUESTION_BANK.behavioral;
  return bank[0];
}

export async function nextInterviewerTurn(
  focus: string,
  transcript: { role: string; content: string }[],
  targetCompany?: string | null
): Promise<{ message: string; isClosing: boolean }> {
  const answered = transcript.filter((t) => t.role === "candidate").length;
  const bank = QUESTION_BANK[focus] ?? QUESTION_BANK.behavioral;
  const isClosing = answered >= Math.min(4, bank.length);

  const { text } = await generate(
    {
      system: `You are a rigorous, fair ${focus} interviewer${targetCompany ? ` at ${targetCompany}` : ""}. Ask one question at a time. Push past surface-level answers with one short follow-up when an answer lacks specifics or measurable results, otherwise move to a new question. Be professional and concise.${isClosing ? " The interview is ending: thank the candidate briefly and tell them their scorecard is being prepared." : ""}`,
      prompt: `Transcript so far:\n${transcript.map((t) => `${t.role}: ${t.content}`).join("\n\n")}\n\n${isClosing ? "Close the interview." : "Respond with your next interviewer turn (one question)."}`,
      maxTokens: 300,
    },
    () => {
      if (isClosing)
        return "That's everything from my side — thank you, this was a strong conversation. I'm compiling your scorecard now; you'll see dimension-level scores and specific improvement notes in a moment.";
      const last = transcript[transcript.length - 1];
      const lastAnswer = last?.role === "candidate" ? last.content : "";
      const needsFollowUp =
        lastAnswer.length > 0 && lastAnswer.length < 220 && !/\d/.test(lastAnswer) && answered % 2 === 1;
      if (needsFollowUp)
        return "Can you make that more concrete? What was your specific contribution, and what was the measurable result?";
      return bank[answered % bank.length];
    }
  );
  return { message: text, isClosing };
}

export interface MockScore {
  score: number;
  scorecard: { dimension: string; score: number; note: string }[];
}

export function scoreMock(
  focus: string,
  transcript: { role: string; content: string }[]
): MockScore {
  const answers = transcript.filter((t) => t.role === "candidate").map((t) => t.content);
  const joined = answers.join(" ");
  const avgLen = answers.length ? joined.length / answers.length : 0;

  const hasMetrics = /\d+%|\$\d|\d+x|\b\d{2,}\b/.test(joined);
  const hasStructure = /first|then|result|outcome|because|so that|impact/i.test(joined);
  const hasOwnership = /\bI\b/.test(joined) && !/\bwe\b.*\bwe\b.*\bwe\b/i.test(joined);
  const concise = avgLen > 150 && avgLen < 900;

  const dims = [
    {
      dimension: focus === "behavioral" ? "Structure (STAR)" : "Problem Decomposition",
      score: hasStructure ? 8 : 5,
      note: hasStructure
        ? "Answers follow a clear arc from situation to result."
        : "Answers wander — anchor each one: situation, action, result.",
    },
    {
      dimension: "Specificity & Evidence",
      score: hasMetrics ? 8 : 4,
      note: hasMetrics
        ? "Good use of concrete numbers — keep quantifying."
        : "No measurable results mentioned. Numbers are what interviewers remember.",
    },
    {
      dimension: "Ownership Signals",
      score: hasOwnership ? 8 : 6,
      note: hasOwnership
        ? "Clear personal contribution in your stories."
        : "Too much 'we' — make your individual contribution unmistakable.",
    },
    {
      dimension: "Conciseness",
      score: concise ? 8 : 5,
      note: concise
        ? "Well-calibrated answer length."
        : avgLen <= 150
          ? "Answers are thin — aim for 60–90 seconds with one full example."
          : "Answers run long — practice a 90-second cap per question.",
    },
  ];
  const score = Math.round((dims.reduce((a, d) => a + d.score, 0) / (dims.length * 10)) * 100);
  return { score, scorecard: dims };
}
