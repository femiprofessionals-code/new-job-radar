/**
 * Daily radar refresh — triggered by Vercel Cron (see vercel.json) or
 * manually. Protected by CRON_SECRET when set (Vercel sends it as a Bearer
 * token automatically for cron invocations).
 *
 * Runs two pipelines:
 *  1. Native ingestion — free public job APIs (Greenhouse, Lever, Remotive,
 *     Arbeitnow) straight into jobradar.jobs. Always runs.
 *  2. Legacy scraper sync — public.jobs → jobradar.jobs. Only when
 *     LEGACY_DATABASE_URL is configured.
 *
 *   GET /api/sync/jobs?dryRun=1   → fetch + detect, change nothing
 *   GET /api/sync/jobs            → run everything
 *   GET /api/sync/jobs?only=ingest|legacy  → run one pipeline
 */
import { NextRequest, NextResponse } from "next/server";
import { ingestJobs } from "@/lib/ingest";
import { syncLegacyJobs } from "@/lib/sync/legacy-jobs";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const only = req.nextUrl.searchParams.get("only");

  const out: Record<string, unknown> = {};

  if (only !== "legacy") {
    try {
      out.ingest = await ingestJobs({ dryRun });
    } catch (e) {
      out.ingest = { error: e instanceof Error ? e.message : "Ingestion failed" };
    }
  }

  if (only !== "ingest" && process.env.LEGACY_DATABASE_URL) {
    try {
      out.legacy = await syncLegacyJobs({ dryRun });
    } catch (e) {
      out.legacy = { error: e instanceof Error ? e.message : "Legacy sync failed" };
    }
  }

  return NextResponse.json(out);
}
