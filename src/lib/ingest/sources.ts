/**
 * Free, keyless job sources. Each fetcher returns normalized jobs and never
 * throws — failures surface in the per-source report instead of killing the
 * daily run.
 *
 * Sources:
 *  - Greenhouse public boards   (per-company, INGEST_GREENHOUSE_BOARDS)
 *  - Lever public postings      (per-company, INGEST_LEVER_COMPANIES)
 *  - Remotive                   (remote jobs, no config)
 *  - Arbeitnow                  (remote/EU jobs, no config)
 */
import {
  type NormalizedJob,
  extractSkills,
  inferSeniority,
  htmlToText,
  slugDomain,
} from "./normalize";

export interface SourceResult {
  source: string;
  ok: boolean;
  jobs: NormalizedJob[];
  error?: string;
}

const UA = { "User-Agent": "JobRadar/1.0 (job aggregation; contact: admin@jobradar.app)" };
const PER_SOURCE_CAP = 300;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
  return res.json() as Promise<T>;
}

const envList = (name: string, fallback: string[]): string[] => {
  const v = process.env[name];
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback;
};

/* ── Greenhouse ── */

const DEFAULT_GREENHOUSE_BOARDS = ["stripe", "airbnb", "gitlab", "cloudflare", "datadog", "duolingo"];

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  content?: string;
}

export async function fetchGreenhouse(): Promise<SourceResult[]> {
  const boards = envList("INGEST_GREENHOUSE_BOARDS", DEFAULT_GREENHOUSE_BOARDS);
  return Promise.all(
    boards.map(async (board): Promise<SourceResult> => {
      const source = `greenhouse:${board}`;
      try {
        const data = await getJson<{ jobs: GreenhouseJob[] }>(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`
        );
        const company = board.charAt(0).toUpperCase() + board.slice(1);
        const jobs = (data.jobs ?? []).slice(0, PER_SOURCE_CAP).map((j): NormalizedJob => {
          const description = htmlToText(j.content ?? "").slice(0, 12_000);
          const location = j.location?.name?.trim() || "Not specified";
          return {
            id: `gh-${board}-${j.id}`,
            title: j.title.trim(),
            company,
            companyDomain: slugDomain(company),
            location,
            remote: /remote/i.test(location),
            salaryMin: null,
            salaryMax: null,
            description: description || `${j.title} at ${company}.`,
            requirements: [],
            skills: extractSkills(`${j.title} ${description}`),
            seniority: inferSeniority(j.title),
            url: j.absolute_url ?? null,
            source: "greenhouse",
            applicantEstimate: null,
            postedAt: j.updated_at ? new Date(j.updated_at) : new Date(),
            active: true,
          };
        });
        return { source, ok: true, jobs };
      } catch (e) {
        return { source, ok: false, jobs: [], error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
}

/* ── Lever ── */

const DEFAULT_LEVER_COMPANIES = ["voleon", "kraken", "palantir"];

interface LeverJob {
  id: string;
  text: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: { location?: string; commitment?: string; team?: string };
  workplaceType?: string;
  descriptionPlain?: string;
  description?: string;
  salaryRange?: { min?: number; max?: number };
}

export async function fetchLever(): Promise<SourceResult[]> {
  const companies = envList("INGEST_LEVER_COMPANIES", DEFAULT_LEVER_COMPANIES);
  return Promise.all(
    companies.map(async (slug): Promise<SourceResult> => {
      const source = `lever:${slug}`;
      try {
        const data = await getJson<LeverJob[]>(
          `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
        );
        const company = slug.charAt(0).toUpperCase() + slug.slice(1);
        const jobs = (data ?? []).slice(0, PER_SOURCE_CAP).map((j): NormalizedJob => {
          const description = (j.descriptionPlain ?? htmlToText(j.description ?? "")).slice(0, 12_000);
          const location = j.categories?.location?.trim() || "Not specified";
          return {
            id: `lv-${slug}-${j.id}`,
            title: j.text.trim(),
            company,
            companyDomain: slugDomain(company),
            location,
            remote: j.workplaceType === "remote" || /remote/i.test(location),
            salaryMin: j.salaryRange?.min ?? null,
            salaryMax: j.salaryRange?.max ?? null,
            description: description || `${j.text} at ${company}.`,
            requirements: [],
            skills: extractSkills(`${j.text} ${description}`),
            seniority: inferSeniority(j.text),
            url: j.hostedUrl ?? j.applyUrl ?? null,
            source: "lever",
            applicantEstimate: null,
            postedAt: j.createdAt ? new Date(j.createdAt) : new Date(),
            active: true,
          };
        });
        return { source, ok: true, jobs };
      } catch (e) {
        return { source, ok: false, jobs: [], error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
}

/* ── Remotive ── */

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  url: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  publication_date?: string;
  tags?: string[];
}

export async function fetchRemotive(): Promise<SourceResult> {
  const source = "remotive";
  try {
    const data = await getJson<{ jobs: RemotiveJob[] }>(
      "https://remotive.com/api/remote-jobs?limit=300"
    );
    const jobs = (data.jobs ?? []).slice(0, PER_SOURCE_CAP).map((j): NormalizedJob => {
      const description = htmlToText(j.description ?? "").slice(0, 12_000);
      const salary = parseSalaryText(j.salary ?? "");
      return {
        id: `rmtv-${j.id}`,
        title: j.title.trim(),
        company: j.company_name.trim(),
        companyDomain: slugDomain(j.company_name),
        location: j.candidate_required_location?.trim() || "Remote",
        remote: true,
        salaryMin: salary.min,
        salaryMax: salary.max,
        description: description || `${j.title} at ${j.company_name}.`,
        requirements: [],
        skills:
          (j.tags ?? []).length >= 2
            ? (j.tags ?? []).slice(0, 10)
            : extractSkills(`${j.title} ${description}`),
        seniority: inferSeniority(j.title),
        url: j.url ?? null,
        source: "remotive",
        applicantEstimate: null,
        postedAt: j.publication_date ? new Date(j.publication_date) : new Date(),
        active: true,
      };
    });
    return { source, ok: true, jobs };
  } catch (e) {
    return { source, ok: false, jobs: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/* ── Arbeitnow ── */

interface ArbeitnowJob {
  slug: string;
  title: string;
  company_name: string;
  url: string;
  location?: string;
  remote?: boolean;
  description?: string;
  tags?: string[];
  created_at?: number;
}

export async function fetchArbeitnow(): Promise<SourceResult> {
  const source = "arbeitnow";
  try {
    const data = await getJson<{ data: ArbeitnowJob[] }>(
      "https://www.arbeitnow.com/api/job-board-api"
    );
    const jobs = (data.data ?? []).slice(0, PER_SOURCE_CAP).map((j): NormalizedJob => {
      const description = htmlToText(j.description ?? "").slice(0, 12_000);
      return {
        id: `arb-${j.slug}`,
        title: j.title.trim(),
        company: j.company_name.trim(),
        companyDomain: slugDomain(j.company_name),
        location: j.location?.trim() || (j.remote ? "Remote" : "Not specified"),
        remote: Boolean(j.remote),
        salaryMin: null,
        salaryMax: null,
        description: description || `${j.title} at ${j.company_name}.`,
        requirements: [],
        skills:
          (j.tags ?? []).length >= 2
            ? (j.tags ?? []).slice(0, 10)
            : extractSkills(`${j.title} ${description}`),
        seniority: inferSeniority(j.title),
        url: j.url ?? null,
        source: "arbeitnow",
        applicantEstimate: null,
        postedAt: j.created_at ? new Date(j.created_at * 1000) : new Date(),
        active: true,
      };
    });
    return { source, ok: true, jobs };
  } catch (e) {
    return { source, ok: false, jobs: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/* ── Helpers ── */

function parseSalaryText(s: string): { min: number | null; max: number | null } {
  // Handles "$120,000 - $150,000", "120k-150k", "$90k+"
  const nums = [...s.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?/gi)]
    .map((m) => {
      let n = Number(m[1].replace(/,/g, ""));
      if (m[2]) n *= 1000;
      return n;
    })
    .filter((n) => n >= 10_000 && n <= 2_000_000);
  if (!nums.length) return { min: null, max: null };
  return { min: Math.min(...nums), max: nums.length > 1 ? Math.max(...nums) : null };
}
