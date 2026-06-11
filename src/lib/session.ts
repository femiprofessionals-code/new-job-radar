/**
 * Demo session.
 *
 * Demo mode ships two personas — a candidate (Alex Morgan) and a marketplace
 * expert (Sarah Chen) — switchable from the UI so both sides of the
 * marketplace are explorable. Swapping this module for Supabase Auth is the
 * documented production path (see README: "Going live").
 */
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { DEMO_CANDIDATE_ID, DEMO_EXPERT_USER_ID, DEMO_EXPERT_ID } from "@/db/seed";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "candidate" | "expert";
  expertId: string | null;
}

export async function getSessionUser(): Promise<SessionUser> {
  const store = await cookies();
  const persona = store.get("jr_persona")?.value === "expert" ? "expert" : "candidate";
  const userId = persona === "expert" ? DEMO_EXPERT_USER_ID : DEMO_CANDIDATE_ID;

  const db = await getDb();
  const [user] = await db.select().from(tables.users).where(eq(tables.users.id, userId));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: persona,
    expertId: persona === "expert" ? DEMO_EXPERT_ID : null,
  };
}
