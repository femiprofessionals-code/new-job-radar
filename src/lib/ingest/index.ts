/**
 * Native job ingestion — the platform's own pipeline, no scraper required.
 *
 * Fetches from free public job APIs (Greenhouse boards, Lever postings,
 * Remotive, Arbeitnow), normalizes, upserts into jobradar.jobs, deactivates
 * postings that disappeared from their source, and scores new jobs for every
 * candidate. Runs on the daily cron (/api/sync/jobs) and on demand.
 */
import { and, eq, inArray, like, notInArray, sql as dsql } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { fetchGreenhouse, fetchLever, fetchRemotive, fetchArbeitnow, type SourceResult } from "./sources";
import { scoreJobsForAllCandidates } from "./score";
import type { NormalizedJob } from "./normalize";

const BATCH = 500;

export interface IngestReport {
  sources: { source: string; ok: boolean; fetched: number; error?: string }[];
  fetched: number;
  inserted: number;
  updated: number;
  deactivated: number;
  matchesCreated: number;
  candidatesScored: number;
  dryRun: boolean;
  sample?: NormalizedJob;
}

const SOURCE_PREFIXES: Record<string, string> = {
  greenhouse: "gh-",
  lever: "lv-",
  remotive: "rmtv-",
  arbeitnow: "arb-",
};

export async function ingestJobs(opts: { dryRun?: boolean } = {}): Promise<IngestReport> {
  const enabled = (process.env.INGEST_SOURCES ?? "greenhouse,lever,remotive,arbeitnow")
    .split(",")
    .map((s) => s.trim());

  const results: SourceResult[] = [];
  if (enabled.includes("greenhouse")) results.push(...(await fetchGreenhouse()));
  if (enabled.includes("lever")) results.push(...(await fetchLever()));
  if (enabled.includes("remotive")) results.push(await fetchRemotive());
  if (enabled.includes("arbeitnow")) results.push(await fetchArbeitnow());

  // De-duplicate by id (a job can't appear twice within a run)
  const byId = new Map<string, NormalizedJob>();
  for (const r of results) for (const j of r.jobs) if (j.title) byId.set(j.id, j);
  const jobs = [...byId.values()];

  const report: IngestReport = {
    sources: results.map((r) => ({
      source: r.source,
      ok: r.ok,
      fetched: r.jobs.length,
      ...(r.error ? { error: r.error } : {}),
    })),
    fetched: jobs.length,
    inserted: 0,
    updated: 0,
    deactivated: 0,
    matchesCreated: 0,
    candidatesScored: 0,
    dryRun: Boolean(opts.dryRun),
    sample: jobs[0],
  };
  if (opts.dryRun || !jobs.length) return report;

  const db = await getDb();
  const ids = jobs.map((j) => j.id);

  // What already exists?
  const existing: { id: string }[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    existing.push(
      ...(await db
        .select({ id: tables.jobs.id })
        .from(tables.jobs)
        .where(inArray(tables.jobs.id, chunk)))
    );
  }
  const existingIds = new Set(existing.map((e) => e.id));

  // Upsert
  for (let i = 0; i < jobs.length; i += BATCH) {
    await db
      .insert(tables.jobs)
      .values(jobs.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: tables.jobs.id,
        set: {
          title: dsql`excluded.title`,
          location: dsql`excluded.location`,
          remote: dsql`excluded.remote`,
          salaryMin: dsql`excluded.salary_min`,
          salaryMax: dsql`excluded.salary_max`,
          url: dsql`excluded.url`,
          active: dsql`excluded.active`,
        },
      });
  }
  report.inserted = jobs.filter((j) => !existingIds.has(j.id)).length;
  report.updated = jobs.length - report.inserted;

  // Deactivate postings that disappeared from a source that fetched OK
  const okSources = new Set(
    results.filter((r) => r.ok).map((r) => r.source.split(":")[0])
  );
  for (const src of okSources) {
    const prefix = SOURCE_PREFIXES[src];
    if (!prefix) continue;
    const seenForSource = jobs.filter((j) => j.id.startsWith(prefix)).map((j) => j.id);
    const gone = await db
      .update(tables.jobs)
      .set({ active: false })
      .where(
        and(
          like(tables.jobs.id, `${prefix}%`),
          eq(tables.jobs.active, true),
          seenForSource.length ? notInArray(tables.jobs.id, seenForSource) : undefined
        )
      )
      .returning({ id: tables.jobs.id });
    report.deactivated += gone.length;
  }

  // Score new jobs for everyone
  const scored = await scoreJobsForAllCandidates(jobs);
  report.matchesCreated = scored.matchesCreated;
  report.candidatesScored = scored.candidatesScored;

  return report;
}
