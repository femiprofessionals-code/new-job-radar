/**
 * Job sync endpoint — triggered by Vercel Cron (daily, see vercel.json) or
 * manually. Protected by CRON_SECRET when set (Vercel sends it as a Bearer
 * token automatically for cron invocations).
 *
 *   GET /api/sync/jobs?dryRun=1   → detect mapping, change nothing
 *   GET /api/sync/jobs            → run the sync
 */
import { NextRequest, NextResponse } from "next/server";
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

  try {
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
    const report = await syncLegacyJobs({ dryRun });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
