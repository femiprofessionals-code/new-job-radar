/**
 * Career Copilot engine.
 *
 * The Copilot's contract: always answer "what should I do next to increase
 * my chance of getting interviews?" Its answers are grounded in the user's
 * live pipeline state, which is assembled here into a context object and
 * passed to the AI layer (real model when keys exist, deterministic
 * synthesizer in demo mode).
 */
import { generate } from "@/lib/ai/provider";

export interface CopilotContext {
  name: string;
  headline: string | null;
  healthScore: number;
  interviewProbability: number;
  applicationsThisWeek: number;
  weeklyGoal: number;
  responseRate: number; // 0–100
  interviewsUpcoming: number;
  overdueFollowUps: number;
  topOpportunities: { title: string; company: string; probability: number }[];
  bestResumeAts: number | null;
  avgMockScore: number | null;
  pendingActions: { title: string; impact: string }[];
  pipeline: Record<string, number>;
}

const SYSTEM = `You are the Job Radar Career Copilot — a sharp, candid career manager whose single objective is getting this candidate more interviews, faster. Ground every answer in the candidate's live data provided. Be specific, prioritized, and brief. Always end with the single highest-leverage next action. Never be vague or generically encouraging.`;

export async function answerCopilot(
  ctx: CopilotContext,
  question: string
): Promise<string> {
  const prompt = `Candidate state:
${JSON.stringify(ctx, null, 2)}

Candidate question: ${question}`;

  const { text } = await generate(
    { system: SYSTEM, prompt, maxTokens: 700 },
    () => demoAnswer(ctx, question)
  );
  return text;
}

/* ── Demo synthesizer: data-driven, deterministic ── */

function demoAnswer(ctx: CopilotContext, question: string): string {
  const q = question.toLowerCase();

  if (q.includes("why") && (q.includes("not getting") || q.includes("no interview") || q.includes("response"))) {
    return diagnose(ctx);
  }
  if (q.includes("resume")) {
    return resumeAdvice(ctx);
  }
  if (q.includes("interview") && (q.includes("prep") || q.includes("ready") || q.includes("practice"))) {
    return interviewPrep(ctx);
  }
  if (q.includes("follow")) {
    return followUps(ctx);
  }
  if (q.includes("apply") || q.includes("opportunit") || q.includes("job")) {
    return opportunities(ctx);
  }
  return nextBest(ctx);
}

function diagnose(ctx: CopilotContext): string {
  const lines: string[] = [`Here's my read on your pipeline, ${ctx.name.split(" ")[0]}:`, ""];
  if (ctx.responseRate < 15)
    lines.push(`**1. Response rate is ${ctx.responseRate}% — below the 15–20% healthy band.** The usual causes in order: resume-job fit, ATS formatting, application timing. Your best resume scores ${ctx.bestResumeAts ?? "—"}/100 on ATS, so focus on fit: apply only to roles above 60% match.`);
  else
    lines.push(`**1. Your response rate (${ctx.responseRate}%) is actually healthy.** The bottleneck isn't your materials — it's volume and follow-through.`);
  if (ctx.applicationsThisWeek < ctx.weeklyGoal)
    lines.push(`**2. Volume is under target.** You're at ${ctx.applicationsThisWeek}/${ctx.weeklyGoal} this week. Interviews are a numbers game played with quality applications — both matter.`);
  if (ctx.overdueFollowUps > 0)
    lines.push(`**3. ${ctx.overdueFollowUps} follow-up${ctx.overdueFollowUps > 1 ? "s are" : " is"} overdue.** Following up within 5–7 days lifts reply rates ~30%, and almost nobody does it. Free interviews are sitting there.`);
  lines.push("", `**Do this next:** ${ctx.overdueFollowUps > 0 ? "send your overdue follow-ups today — it takes 10 minutes and has the highest ROI of anything on your list." : `apply to your top match (${ctx.topOpportunities[0] ? `${ctx.topOpportunities[0].title} at ${ctx.topOpportunities[0].company}, ${ctx.topOpportunities[0].probability}% interview probability` : "see Opportunities"}).`}`);
  return lines.join("\n");
}

function resumeAdvice(ctx: CopilotContext): string {
  const ats = ctx.bestResumeAts ?? 0;
  return [
    `Your master resume currently scores **${ats}/100** on ATS compatibility.`,
    "",
    ats >= 80
      ? "That's strong — your base document isn't the problem. The lever now is **per-application tailoring**: mirroring exact keywords from each posting typically adds 8–15 ATS points and signals fit to human screeners."
      : "That's leaving interviews on the table. Three fixes with the highest yield: (1) flatten any multi-column sections — ATS parsers drop them, (2) mirror exact keywords from target postings, (3) quantify your top three bullets.",
    "",
    "**Do this next:** open your highest-probability saved opportunity and generate a tailored resume for it — then have an expert validate it (you have review credits on your plan).",
  ].join("\n");
}

function interviewPrep(ctx: CopilotContext): string {
  return [
    ctx.interviewsUpcoming > 0
      ? `You have **${ctx.interviewsUpcoming} interview${ctx.interviewsUpcoming > 1 ? "s" : ""} coming up** — this is where the entire pipeline converts, so prep beats everything else this week.`
      : "No interviews scheduled yet — so the goal is volume + follow-ups. But staying interview-sharp matters: candidates who mock weekly convert ~2× better when calls come.",
    "",
    ctx.avgMockScore !== null
      ? `Your mock average is **${ctx.avgMockScore}/100**. ${ctx.avgMockScore >= 75 ? "You're converting well — polish, don't rebuild." : "Under 75 means reps will pay off fast. Your weakest dimension is conciseness — practice 90-second answers."}`
      : "You haven't run a mock yet — your first AI mock takes 15 minutes and gives you a scored baseline.",
    "",
    "**Do this next:** open the company interview kit for your nearest interview, then run one targeted AI mock on its weakest area.",
  ].join("\n");
}

function followUps(ctx: CopilotContext): string {
  return ctx.overdueFollowUps > 0
    ? `You have **${ctx.overdueFollowUps} overdue follow-up${ctx.overdueFollowUps > 1 ? "s" : ""}**. Template that works: 2 sentences, reference something specific about the role, restate your strongest relevant result, ask a direct question. Send them today — follow-ups lift response rates ~30% and take minutes.\n\n**Do this next:** go to Applications, filter by "needs follow-up", and clear the list.`
    : `You're fully caught up on follow-ups — good discipline. Next leverage point: ${ctx.applicationsThisWeek < ctx.weeklyGoal ? `get to your weekly goal (${ctx.applicationsThisWeek}/${ctx.weeklyGoal} so far)` : "prep for your upcoming interviews"}.`;
}

function opportunities(ctx: CopilotContext): string {
  const tops = ctx.topOpportunities
    .slice(0, 3)
    .map((o, i) => `${i + 1}. **${o.title}** at ${o.company} — ${o.probability}% interview probability`)
    .join("\n");
  return [
    "Your highest-probability open opportunities right now:",
    "",
    tops || "No scored opportunities yet — refresh your radar in Opportunities.",
    "",
    "Apply top-down: fresh, high-probability postings convert 3–4× better than older ones. Tailor the resume for each (it's 2 minutes with generation) — never send the master copy.",
    "",
    "**Do this next:** open #1 and generate a tailored resume.",
  ].join("\n");
}

function nextBest(ctx: CopilotContext): string {
  const action = ctx.pendingActions[0];
  return [
    `Quick state of play: Career Health **${ctx.healthScore}/100**, interview probability trending at **${ctx.interviewProbability}%**, ${ctx.applicationsThisWeek}/${ctx.weeklyGoal} applications this week, ${ctx.interviewsUpcoming} interview${ctx.interviewsUpcoming === 1 ? "" : "s"} scheduled.`,
    "",
    `Your pipeline: ${Object.entries(ctx.pipeline).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(" · ")}.`,
    "",
    action
      ? `**The single highest-leverage thing you can do right now: ${action.title}** (${action.impact}). Everything else can wait until that's done.`
      : "**Do this next:** apply to your top-scored opportunity — momentum is the metric.",
  ].join("\n");
}
