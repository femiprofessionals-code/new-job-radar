/**
 * Legacy job sync — flows jobs from the scraper's `public.jobs` table into
 * `jobradar.jobs`, then scores new jobs for every candidate.
 *
 * - Source database: LEGACY_DATABASE_URL, falling back to DATABASE_URL
 *   (covers both "old tables in the same Supabase project" and "separate
 *   project" setups).
 * - Column layout is auto-detected against common naming conventions and
 *   reported by dry runs; nothing outside `public.jobs` (and, if present,
 *   `public.companies` for company names) is read. Nothing in `public` is
 *   ever written.
 * - Idempotent: rows upsert on a deterministic id (`lg-<legacy id>`), so the
 *   sync can run on a schedule while the scraper keeps writing.
 */
import postgres from "postgres";
import { inArray, sql as dsql } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { extractSkills, inferSeniority } from "@/lib/ingest/normalize";
import { scoreJobsForAllCandidates } from "@/lib/ingest/score";

/* ── Column detection ── */

const ALIASES: Record<string, string[]> = {
  id: ["id", "job_id", "uuid", "external_id"],
  title: ["title", "job_title", "position", "role", "name"],
  company: ["company", "company_name", "employer", "organization"],
  companyId: ["company_id"],
  location: ["location", "city", "job_location", "locations"],
  remote: ["remote", "is_remote", "remote_ok", "workplace_type", "work_mode", "location_type"],
  salaryMin: ["salary_min", "min_salary", "salary_from", "compensation_min", "salary_low"],
  salaryMax: ["salary_max", "max_salary", "salary_to", "compensation_max", "salary_high"],
  description: ["description", "job_description", "details", "body", "content", "summary"],
  skills: ["skills", "tags", "keywords", "technologies", "stack", "skill_tags"],
  seniority: ["seniority", "level", "experience_level", "seniority_level", "job_level"],
  url: ["url", "apply_url", "job_url", "link", "application_url", "absolute_url", "redirect_url"],
  postedAt: ["posted_at", "published_at", "date_posted", "created_at", "first_seen_at", "scraped_at"],
  active: ["active", "is_active", "is_open", "status", "is_expired", "closed"],
  source: ["source", "board", "site", "origin", "provider"],
};

export interface ColumnMapping {
  [field: string]: string | null;
}

export interface SyncReport {
  sourceTable: string;
  totalLegacyRows: number;
  mapping: ColumnMapping;
  unmappedColumns: string[];
  inserted: number;
  updated: number;
  skipped: number;
  matchesCreated: number;
  candidatesScored: number;
  sample?: Record<string, unknown>;
  dryRun: boolean;
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (s.startsWith("[")) {
      try { return (JSON.parse(s) as unknown[]).map(String).filter(Boolean); } catch { /* fall through */ }
    }
    return s.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  // Treat values that look like "150" as $150k
  return n < 1000 ? Math.round(n * 1000) : Math.round(n);
}

function toBoolActive(field: string | null, v: unknown): boolean {
  if (!field || v === null || v === undefined) return true;
  const s = String(v).toLowerCase();
  if (["is_expired", "closed"].includes(field)) return !(v === true || s === "true" || s === "1");
  if (field === "status") return ["active", "open", "published", "live", ""].includes(s);
  if (["remote", "f", "false", "0", "no", "inactive", "expired", "closed"].includes(s)) return false;
  return Boolean(v);
}

function toRemote(field: string | null, v: unknown, location: string): boolean {
  const locRemote = /remote/i.test(location);
  if (!field || v === null || v === undefined) return locRemote;
  const s = String(v).toLowerCase();
  if (["workplace_type", "work_mode", "location_type"].includes(field)) return /remote/.test(s);
  return v === true || s === "true" || s === "1" || s === "yes" || locRemote;
}

/* ── Sync ── */

export async function syncLegacyJobs(opts: { dryRun?: boolean; limit?: number } = {}): Promise<SyncReport> {
  const sourceUrl = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
  if (!sourceUrl) {
    throw new Error(
      "No source database configured. Set LEGACY_DATABASE_URL (or DATABASE_URL) to the project containing public.jobs."
    );
  }
  const legacy = postgres(sourceUrl, { prepare: false, max: 2 });

  try {
    // Introspect public.jobs
    const cols = await legacy<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'jobs'
      order by ordinal_position`;
    if (!cols.length) throw new Error("public.jobs not found in the source database.");
    const available = new Set(cols.map((c) => c.column_name));

    const mapping: ColumnMapping = {};
    for (const [field, aliases] of Object.entries(ALIASES)) {
      mapping[field] = aliases.find((a) => available.has(a)) ?? null;
    }
    const mappedCols = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const unmappedColumns = [...available].filter((c) => !mappedCols.has(c));

    if (!mapping.id || !mapping.title) {
      throw new Error(
        `Could not detect required columns (id, title) in public.jobs. Found: ${[...available].join(", ")}`
      );
    }

    // Optional companies lookup
    let companyNames = new Map<string, string>();
    if (!mapping.company && mapping.companyId) {
      const companyTables = await legacy<{ table_name: string }[]>`
        select table_name from information_schema.tables
        where table_schema = 'public' and table_name = 'companies'`;
      if (companyTables.length) {
        const companyCols = await legacy<{ column_name: string }[]>`
          select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'companies'`;
        const cAvail = new Set(companyCols.map((c) => c.column_name));
        const nameCol = ["name", "company_name", "title"].find((c) => cAvail.has(c));
        if (nameCol) {
          const rows = await legacy.unsafe(`select id, "${nameCol}" as name from public.companies`);
          companyNames = new Map(rows.map((r: Record<string, unknown>) => [String(r.id), String(r.name)]));
        }
      }
    }

    const [{ count: totalLegacyRows }] = await legacy<{ count: number }[]>`
      select count(*)::int as count from public.jobs`;

    const limit = opts.limit ?? 20000;
    const selectCols = [...mappedCols].map((c) => `"${c}"`).join(", ");
    const orderBy = mapping.postedAt ? `order by "${mapping.postedAt}" desc nulls last` : "";
    const rows: Record<string, unknown>[] = await legacy.unsafe(
      `select ${selectCols} from public.jobs ${orderBy} limit ${limit}`
    );

    const get = (row: Record<string, unknown>, field: string) =>
      mapping[field] ? row[mapping[field] as string] : null;

    const transformed = rows.flatMap((row) => {
      const legacyId = String(get(row, "id") ?? "");
      const title = String(get(row, "title") ?? "").trim();
      if (!legacyId || !title) return [];

      const description = String(get(row, "description") ?? "").trim();
      const company =
        String(get(row, "company") ?? "").trim() ||
        companyNames.get(String(get(row, "companyId") ?? "")) ||
        "Unknown Company";
      const location = String(get(row, "location") ?? "").trim() || "Not specified";
      const skillsRaw = toList(get(row, "skills"));
      const skills = skillsRaw.length >= 2 ? skillsRaw.slice(0, 10) : extractSkills(`${title} ${description}`);
      const postedRaw = get(row, "postedAt");
      const postedAt = postedRaw ? new Date(String(postedRaw)) : new Date();

      return [{
        id: `lg-${legacyId}`,
        title,
        company,
        companyDomain: null,
        location,
        remote: toRemote(mapping.remote, get(row, "remote"), location),
        salaryMin: toNumber(get(row, "salaryMin")),
        salaryMax: toNumber(get(row, "salaryMax")),
        description: description || `${title} at ${company}. See the original posting for full details.`,
        requirements: [],
        skills,
        seniority: inferSeniority(title, get(row, "seniority") as string | null),
        url: (get(row, "url") as string) || null,
        source: (get(row, "source") as string) || "scraper",
        applicantEstimate: null,
        postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
        active: toBoolActive(mapping.active, get(row, "active")),
      }];
    });

    if (opts.dryRun) {
      return {
        sourceTable: "public.jobs",
        totalLegacyRows,
        mapping,
        unmappedColumns,
        inserted: transformed.length,
        updated: 0,
        skipped: rows.length - transformed.length,
        matchesCreated: 0,
        candidatesScored: 0,
        sample: transformed[0],
        dryRun: true,
      };
    }

    // Upsert into jobradar.jobs
    const db = await getDb();
    const ids = transformed.map((t) => t.id);
    const existing = ids.length
      ? await db.select({ id: tables.jobs.id }).from(tables.jobs).where(inArray(tables.jobs.id, ids))
      : [];
    const existingIds = new Set(existing.map((e) => e.id));

    const BATCH = 500;
    for (let i = 0; i < transformed.length; i += BATCH) {
      const batch = transformed.slice(i, i + BATCH);
      await db
        .insert(tables.jobs)
        .values(batch)
        .onConflictDoUpdate({
          target: tables.jobs.id,
          set: {
            title: dsql`excluded.title`,
            salaryMin: dsql`excluded.salary_min`,
            salaryMax: dsql`excluded.salary_max`,
            active: dsql`excluded.active`,
            url: dsql`excluded.url`,
            postedAt: dsql`excluded.posted_at`,
          },
        });
    }
    const inserted = transformed.filter((t) => !existingIds.has(t.id)).length;
    const updated = transformed.length - inserted;

    // Score new jobs for every candidate with a profile
    const scored = await scoreJobsForAllCandidates(transformed);
    const matchesCreated = scored.matchesCreated;
    const profilesCount = scored.candidatesScored;

    return {
      sourceTable: "public.jobs",
      totalLegacyRows,
      mapping,
      unmappedColumns,
      inserted,
      updated,
      skipped: rows.length - transformed.length,
      matchesCreated,
      candidatesScored: profilesCount,
      dryRun: false,
    };
  } finally {
    await legacy.end({ timeout: 5 });
  }
}
