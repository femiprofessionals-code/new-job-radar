/**
 * Scores a set of jobs for every candidate with a profile — used by both the
 * native ingestion pipeline and the legacy scraper sync. Only creates match
 * rows that don't already exist, so it's safe to call repeatedly.
 */
import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { analyzeMatch } from "@/lib/engines/scoring";

const uid = () => crypto.randomUUID();
const BATCH = 500;

export interface ScorableJob {
  id: string;
  title: string;
  skills: string[];
  seniority: string;
  postedAt: Date;
  remote: boolean;
  active: boolean;
  applicantEstimate?: number | null;
}

export async function scoreJobsForAllCandidates(
  jobs: ScorableJob[]
): Promise<{ matchesCreated: number; candidatesScored: number }> {
  const db = await getDb();
  const activeJobs = jobs.filter((j) => j.active);
  if (!activeJobs.length) return { matchesCreated: 0, candidatesScored: 0 };

  const profiles = await db.select().from(tables.candidateProfiles);
  let matchesCreated = 0;

  for (const profile of profiles) {
    const existing = await db
      .select({ jobId: tables.jobMatches.jobId })
      .from(tables.jobMatches)
      .where(eq(tables.jobMatches.userId, profile.userId));
    const have = new Set(existing.map((e) => e.jobId));

    const docs = await db
      .select({ atsScore: tables.documents.atsScore })
      .from(tables.documents)
      .where(eq(tables.documents.userId, profile.userId));
    const bestAts = docs.reduce<number | null>(
      (b, d) => (d.atsScore !== null && (b === null || d.atsScore > b) ? d.atsScore : b),
      null
    );

    const signal = {
      skills: profile.skills as string[],
      yearsExperience: profile.yearsExperience,
      targetRoles: profile.targetRoles as string[],
      resumeAtsScore: bestAts,
    };

    const rows = activeJobs
      .filter((j) => !have.has(j.id))
      .map((j) => {
        const a = analyzeMatch(signal, {
          title: j.title,
          skills: j.skills,
          seniority: j.seniority,
          postedAt: j.postedAt,
          applicantEstimate: j.applicantEstimate ?? null,
          remote: j.remote,
        });
        return {
          id: uid(),
          userId: profile.userId,
          jobId: j.id,
          interviewProbability: a.interviewProbability,
          matchScore: a.matchScore,
          matchReasons: a.matchReasons,
          strengths: a.strengths,
          gaps: a.gaps,
          priority: a.priority,
          competition: a.competition,
        };
      });

    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(tables.jobMatches).values(rows.slice(i, i + BATCH)).onConflictDoNothing();
    }
    matchesCreated += rows.length;
  }

  return { matchesCreated, candidatesScored: profiles.length };
}
