import { getDb } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  for (const t of ["users", "jobs", "job_matches", "applications", "experts", "expert_services", "review_requests", "interviews", "mock_sessions", "health_snapshots", "copilot_actions", "documents", "review_feedback", "interview_kits", "transactions", "notifications"]) {
    const r = await db.execute(sql.raw(`select count(*) c from ${t}`));
    console.log(t, r.rows[0]?.c);
  }
  process.exit(0);
}
main();
