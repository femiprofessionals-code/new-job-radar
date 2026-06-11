/**
 * Manual job sync runner.
 *
 *   npx tsx scripts/sync-jobs.ts --dry-run   # inspect column mapping, change nothing
 *   npx tsx scripts/sync-jobs.ts             # run the sync
 *
 * Requires DATABASE_URL (and LEGACY_DATABASE_URL if the scraper's tables live
 * in a different database). Reads .env.local automatically.
 */
import fs from "fs";
import path from "path";

// Minimal .env.local loader (no dependency)
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const { syncLegacyJobs } = await import("../src/lib/sync/legacy-jobs");
  const dryRun = process.argv.includes("--dry-run");
  const report = await syncLegacyJobs({ dryRun });
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
