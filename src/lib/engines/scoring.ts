/**
 * Opportunity scoring engine.
 *
 * Computes Interview Probability — Job Radar's core currency — for a
 * candidate/job pair, with an explainable breakdown (strengths, gaps,
 * reasons). Deterministic and rule-based so demo mode is instant and free;
 * the AI layer (src/lib/ai) can enrich explanations when keys are present.
 */

export interface CandidateSignal {
  skills: string[];
  yearsExperience: number;
  targetRoles: string[];
  resumeAtsScore?: number | null;
}

export interface JobSignal {
  title: string;
  skills: string[];
  seniority: string;
  postedAt: Date;
  applicantEstimate?: number | null;
  remote?: boolean;
}

export interface MatchAnalysis {
  matchScore: number; // 0–100 fit
  interviewProbability: number; // 0–100 chance of interview if applied well
  matchReasons: string[];
  strengths: string[];
  gaps: string[];
  priority: "critical" | "high" | "medium" | "low";
  competition: "low" | "medium" | "high";
}

const SENIORITY_YEARS: Record<string, [number, number]> = {
  junior: [0, 2],
  mid: [2, 5],
  senior: [5, 9],
  staff: [8, 14],
  principal: [10, 20],
  lead: [6, 12],
  director: [10, 25],
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

export function analyzeMatch(candidate: CandidateSignal, job: JobSignal): MatchAnalysis {
  const candidateSkills = new Set(candidate.skills.map(norm));
  const jobSkills = job.skills.map(norm);

  const matched = jobSkills.filter((s) => candidateSkills.has(s));
  const missing = jobSkills.filter((s) => !candidateSkills.has(s));
  const skillCoverage = jobSkills.length ? matched.length / jobSkills.length : 0.5;

  // Seniority alignment
  const range = SENIORITY_YEARS[norm(job.seniority)] ?? [2, 8];
  let seniorityFit: number;
  if (candidate.yearsExperience >= range[0] && candidate.yearsExperience <= range[1]) {
    seniorityFit = 1;
  } else if (candidate.yearsExperience > range[1]) {
    seniorityFit = Math.max(0.55, 1 - (candidate.yearsExperience - range[1]) * 0.08);
  } else {
    seniorityFit = Math.max(0.25, 1 - (range[0] - candidate.yearsExperience) * 0.18);
  }

  // Title alignment with target roles
  const title = norm(job.title);
  const titleFit = candidate.targetRoles.some((r) =>
    title.includes(norm(r)) || norm(r).includes(title)
  )
    ? 1
    : candidate.targetRoles.some((r) =>
          norm(r).split(" ").some((w) => w.length > 3 && title.includes(w))
        )
      ? 0.7
      : 0.4;

  const matchScore = Math.round(
    100 * (skillCoverage * 0.5 + seniorityFit * 0.3 + titleFit * 0.2)
  );

  // Competition: applicant volume + posting freshness
  const daysOld = Math.max(0, (Date.now() - job.postedAt.getTime()) / 86_400_000);
  const applicants = job.applicantEstimate ?? 120;
  const competition: MatchAnalysis["competition"] =
    applicants > 220 || (job.remote && applicants > 150)
      ? "high"
      : applicants > 90
        ? "medium"
        : "low";

  const freshness = daysOld <= 2 ? 1 : daysOld <= 7 ? 0.85 : daysOld <= 14 ? 0.65 : 0.45;
  const competitionFactor = competition === "low" ? 1 : competition === "medium" ? 0.8 : 0.6;
  const atsFactor = candidate.resumeAtsScore ? 0.7 + (candidate.resumeAtsScore / 100) * 0.3 : 0.85;

  const interviewProbability = Math.round(
    Math.min(94, Math.max(3, matchScore * 0.72 * freshness * competitionFactor * atsFactor + 8))
  );

  const priority: MatchAnalysis["priority"] =
    interviewProbability >= 70 && freshness >= 0.85
      ? "critical"
      : interviewProbability >= 55
        ? "high"
        : interviewProbability >= 35
          ? "medium"
          : "low";

  const matchReasons: string[] = [];
  if (skillCoverage >= 0.7)
    matchReasons.push(
      `You match ${matched.length} of ${jobSkills.length} required skills — a top-tier overlap.`
    );
  else if (skillCoverage >= 0.4)
    matchReasons.push(
      `You cover ${matched.length} of ${jobSkills.length} required skills; targeted tailoring closes the rest.`
    );
  else matchReasons.push(`Skill overlap is thin (${matched.length}/${jobSkills.length}) — apply only with strong tailoring.`);

  if (seniorityFit >= 0.9)
    matchReasons.push(`Your ${candidate.yearsExperience} years of experience sit squarely in the ${job.seniority} band.`);
  else if (candidate.yearsExperience > range[1])
    matchReasons.push(`You may read as overqualified — position your seniority as scope, not just tenure.`);
  else matchReasons.push(`This role typically expects ${range[0]}+ years; lead with outcomes to offset the gap.`);

  if (daysOld <= 2) matchReasons.push("Posted in the last 48 hours — early applicants get 3–4× more recruiter views.");
  else if (daysOld > 14) matchReasons.push("Posting is over two weeks old — the pipeline may already be deep.");

  const strengths = matched.slice(0, 6).map((s) => titleCase(s));
  const gaps = missing.slice(0, 5).map((s) => titleCase(s));

  return { matchScore, interviewProbability, matchReasons, strengths, gaps, priority, competition };
}

function titleCase(s: string) {
  return s
    .split(" ")
    .map((w) => (w.length <= 3 && w === w.toLowerCase() && /^[a-z]+$/.test(w) && ["api", "aws", "gcp", "sql", "css", "ci", "cd", "ml", "ai", "llm"].includes(w) ? w.toUpperCase() : w[0]?.toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Simple ATS score for a document against a job's skills. */
export function scoreAts(content: string, jobSkills: string[]): number {
  const text = content.toLowerCase();
  const hits = jobSkills.filter((s) => text.includes(s.toLowerCase())).length;
  const coverage = jobSkills.length ? hits / jobSkills.length : 0.6;
  const hasMetrics = /\d+%|\$\d|\d+x|increased|reduced|grew|saved/i.test(content) ? 1 : 0.7;
  const lengthOk = content.length > 1200 && content.length < 6500 ? 1 : 0.8;
  return Math.round(Math.min(98, 100 * (coverage * 0.6 + 0.2 * hasMetrics + 0.2 * lengthOk)));
}
