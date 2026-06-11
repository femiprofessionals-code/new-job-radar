/**
 * Application Engine document generation: tailored resumes, cover letters,
 * and ATS optimization. Real model output when AI keys are configured;
 * deterministic high-quality templating in demo mode.
 */
import { generate } from "@/lib/ai/provider";
import type { Job, Document } from "@/db/schema";

export async function tailorResume(base: Document, job: Job): Promise<string> {
  const { text } = await generate(
    {
      system:
        "You are an elite resume writer. Rewrite the resume to target the specific job: mirror its exact keywords where truthful, reorder bullets so the most relevant impact leads, and keep every claim grounded in the original. Return only the resume text.",
      prompt: `JOB POSTING\nTitle: ${job.title}\nCompany: ${job.company}\nSkills: ${(job.skills as string[]).join(", ")}\nRequirements:\n${(job.requirements as string[]).join("\n")}\n\nBASE RESUME\n${base.content}`,
      maxTokens: 2000,
    },
    () => demoTailorResume(base, job)
  );
  return text;
}

function demoTailorResume(base: Document, job: Job): string {
  const skills = job.skills as string[];
  const targetLine = `TARGET: ${job.title} — ${job.company}`;
  const keywordLine = `CORE MATCH: ${skills.join(" · ")}`;
  return base.content
    .replace(/^/, `${targetLine}\n${keywordLine}\n\n`)
    .replace(
      "SUMMARY\n",
      `SUMMARY\n[Tailored for ${job.company}] `
    )
    .replace(
      /SKILLS\n.*$/m,
      `SKILLS\n${[...new Set([...skills, "React", "TypeScript", "Design Systems", "CI/CD"])].join(", ")}`
    );
}

export async function draftCoverLetter(
  candidateName: string,
  summary: string | null,
  job: Job
): Promise<string> {
  const { text } = await generate(
    {
      system:
        "You write sharp, specific cover letters: 3 short paragraphs, no clichés, one quantified achievement, one company-specific hook, a direct closing ask. Return only the letter.",
      prompt: `Candidate: ${candidateName}\nBackground: ${summary ?? "experienced professional"}\n\nJob: ${job.title} at ${job.company}\nDescription: ${job.description.slice(0, 800)}\nSkills sought: ${(job.skills as string[]).join(", ")}`,
      maxTokens: 600,
    },
    () => demoCoverLetter(candidateName, summary, job)
  );
  return text;
}

function demoCoverLetter(name: string, summary: string | null, job: Job): string {
  const skills = (job.skills as string[]).slice(0, 3).join(", ");
  return `Dear ${job.company} Hiring Team,

I'm applying for the ${job.title} role. ${summary ?? "I bring deep, relevant experience to this position."} The work your team is doing is exactly the kind of product surface I want to own — and the stack you've built on (${skills}) is where I do my best work.

At my current company I led a Next.js migration across a 4M-MAU product, cutting p75 LCP 38% and lifting organic signups 12%. That mix of user-facing impact and engineering rigor is what I'd bring to ${job.company} from week one.

I'd welcome a conversation about how I can help your team ship faster with higher quality. When would be a good time to talk?

Best,
${name}`;
}

export interface AtsReport {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  fixes: string[];
}

export function atsReport(content: string, job: Job): AtsReport {
  const text = content.toLowerCase();
  const skills = job.skills as string[];
  const matched = skills.filter((s) => text.includes(s.toLowerCase()));
  const missing = skills.filter((s) => !text.includes(s.toLowerCase()));
  const hasMetrics = /\d+%|\$\d|\d+x|increased|reduced|grew|saved/i.test(content);
  const goodLength = content.length > 1200 && content.length < 6500;

  const fixes: string[] = [];
  if (missing.length) fixes.push(`Add missing keywords verbatim where truthful: ${missing.join(", ")}`);
  if (!hasMetrics) fixes.push("Quantify your top three bullets — numbers stop screeners from scrolling");
  if (!goodLength) fixes.push(content.length <= 1200 ? "Resume is thin — expand your most relevant role with outcome bullets" : "Trim to one–two pages; cut your oldest role to two bullets");
  if (/\t|\|{2,}/.test(content)) fixes.push("Remove table/column formatting — many ATS parsers drop multi-column content");
  if (!fixes.length) fixes.push("Strong ATS posture — focus on per-application keyword mirroring");

  const coverage = skills.length ? matched.length / skills.length : 0.6;
  const score = Math.round(Math.min(98, 100 * (coverage * 0.6 + (hasMetrics ? 0.2 : 0.14) + (goodLength ? 0.2 : 0.16))));
  return { score, matchedKeywords: matched, missingKeywords: missing, fixes };
}
