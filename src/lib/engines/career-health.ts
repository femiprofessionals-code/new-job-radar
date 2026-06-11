/**
 * Career Health Engine — Job Radar's signature 0–100 score.
 *
 * Seven weighted dimensions, each with an actionable insight. The score is
 * recomputed from live data on every dashboard load and snapshotted for
 * trend analysis.
 */

export interface HealthInputs {
  resumeAtsScore: number | null; // best resume ATS score
  applicationsLast7Days: number;
  weeklyGoal: number;
  avgMatchScoreOfApplied: number | null; // market alignment
  skillCoverageAvg: number | null; // 0–1 across top matches
  followUpsDue: number;
  followUpsTotal: number;
  mockAvgScore: number | null; // 0–100
  expertReviewsCompleted: number;
}

export interface HealthDimension {
  dimension: string;
  score: number; // 0–100
  weight: number;
  insight: string;
}

export interface HealthResult {
  score: number;
  breakdown: HealthDimension[];
}

export function computeCareerHealth(i: HealthInputs): HealthResult {
  const dims: HealthDimension[] = [];

  const resume = i.resumeAtsScore ?? 40;
  dims.push({
    dimension: "Resume Quality",
    score: resume,
    weight: 0.2,
    insight:
      resume >= 80
        ? "Your resume is ATS-strong. Keep tailoring per application."
        : resume >= 60
          ? "Solid base — add quantified outcomes to your top 3 bullets."
          : "Your resume is leaking interviews. Run AI optimization or book an expert review.",
  });

  const consistency = Math.min(100, Math.round((i.applicationsLast7Days / Math.max(1, i.weeklyGoal)) * 100));
  dims.push({
    dimension: "Application Consistency",
    score: consistency,
    weight: 0.18,
    insight:
      consistency >= 100
        ? "You hit your weekly application goal. Volume compounds."
        : `You're at ${i.applicationsLast7Days}/${i.weeklyGoal} applications this week — ${Math.max(0, i.weeklyGoal - i.applicationsLast7Days)} more to stay on pace.`,
  });

  const alignment = i.avgMatchScoreOfApplied ?? 50;
  dims.push({
    dimension: "Market Alignment",
    score: Math.round(alignment),
    weight: 0.16,
    insight:
      alignment >= 70
        ? "You're applying to roles where you genuinely compete."
        : "Too many low-fit applications dilute your response rate. Prioritize 60%+ matches.",
  });

  const skillRel = Math.round((i.skillCoverageAvg ?? 0.5) * 100);
  dims.push({
    dimension: "Skill Relevance",
    score: skillRel,
    weight: 0.14,
    insight:
      skillRel >= 70
        ? "Your skill set maps tightly to your target market."
        : "Close 1–2 recurring skill gaps to unlock a wider band of high-probability roles.",
  });

  const followUp =
    i.followUpsTotal === 0 ? 70 : Math.round(100 * (1 - i.followUpsDue / Math.max(1, i.followUpsTotal)));
  dims.push({
    dimension: "Follow-Up Discipline",
    score: followUp,
    weight: 0.12,
    insight:
      i.followUpsDue === 0
        ? "No overdue follow-ups. Recruiters notice persistence."
        : `${i.followUpsDue} follow-up${i.followUpsDue > 1 ? "s" : ""} overdue — following up lifts response rates ~30%.`,
  });

  const mock = i.mockAvgScore ?? 45;
  dims.push({
    dimension: "Interview Performance",
    score: Math.round(mock),
    weight: 0.12,
    insight:
      mock >= 75
        ? "Mock scores show you convert interviews well. Stay sharp."
        : "Run a mock interview this week — practice is the highest-leverage prep.",
  });

  const expertVal = Math.min(100, 40 + i.expertReviewsCompleted * 20);
  dims.push({
    dimension: "Expert Validation",
    score: expertVal,
    weight: 0.08,
    insight:
      i.expertReviewsCompleted > 0
        ? `${i.expertReviewsCompleted} expert review${i.expertReviewsCompleted > 1 ? "s" : ""} completed — human signal de-risks your materials.`
        : "No expert has validated your materials yet. One review typically finds 5+ fixable issues.",
  });

  const score = Math.round(dims.reduce((acc, d) => acc + d.score * d.weight, 0));
  return { score, breakdown: dims };
}

export function healthLabel(score: number): { label: string; tone: "signal" | "info" | "warn" | "danger" } {
  if (score >= 80) return { label: "Excellent", tone: "signal" };
  if (score >= 65) return { label: "Strong", tone: "info" };
  if (score >= 45) return { label: "Needs Focus", tone: "warn" };
  return { label: "At Risk", tone: "danger" };
}
