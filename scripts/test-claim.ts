import { getDb, tables } from "../src/db";
import { and, eq, sql } from "drizzle-orm";

async function claim(expertId: string, reviewId: string) {
  const db = await getDb();
  return db
    .update(tables.reviewRequests)
    .set({ status: "claimed", claimedBy: expertId, claimedAt: new Date() })
    .where(
      and(
        eq(tables.reviewRequests.id, reviewId),
        eq(tables.reviewRequests.status, "available"),
        sql`${tables.reviewRequests.claimedBy} IS NULL`
      )
    )
    .returning({ id: tables.reviewRequests.id });
}

async function main() {
  const db = await getDb();
  // reset rr-003 to available
  await db.update(tables.reviewRequests)
    .set({ status: "available", claimedBy: null, claimedAt: null })
    .where(eq(tables.reviewRequests.id, "rr-003"));

  // two experts race for the same review
  const [a, b] = await Promise.all([claim("expert-01", "rr-003"), claim("expert-02", "rr-003")]);
  const winners = [a.length, b.length];
  console.log("claim results (rows updated):", winners);
  const [row] = await db.select().from(tables.reviewRequests).where(eq(tables.reviewRequests.id, "rr-003"));
  console.log("final state:", row.status, "claimedBy:", row.claimedBy);
  if (winners.filter((w) => w === 1).length === 1) console.log("PASS: exactly one claim succeeded");
  else { console.log("FAIL: duplicate or zero assignment"); process.exit(1); }

  // restore seed state
  await db.update(tables.reviewRequests)
    .set({ status: "available", claimedBy: null, claimedAt: null })
    .where(eq(tables.reviewRequests.id, "rr-003"));
  process.exit(0);
}
main();
