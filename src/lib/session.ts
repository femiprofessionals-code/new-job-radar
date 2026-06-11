/**
 * Sessions.
 *
 * Real accounts: token cookie → jobradar.sessions → jobradar.users.
 * Demo personas: the `jr_persona` cookie (set from the login page's "explore
 * the demo" buttons) maps to the seeded demo users — used only when no real
 * session exists, so the product is explorable without an account.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { DEMO_CANDIDATE_ID, DEMO_EXPERT_USER_ID, DEMO_EXPERT_ID } from "@/db/seed";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "candidate" | "expert";
  expertId: string | null;
  isDemo: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const db = await getDb();

  // 1) Real session
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const [row] = await db
      .select({ user: tables.users, session: tables.sessions })
      .from(tables.sessions)
      .innerJoin(tables.users, eq(tables.sessions.userId, tables.users.id))
      .where(and(eq(tables.sessions.token, token), gt(tables.sessions.expiresAt, new Date())));
    if (row) {
      let expertId: string | null = null;
      if (row.user.role === "expert") {
        const [e] = await db
          .select({ id: tables.experts.id })
          .from(tables.experts)
          .where(eq(tables.experts.userId, row.user.id));
        expertId = e?.id ?? null;
      }
      return {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        role: row.user.role === "expert" ? "expert" : "candidate",
        expertId,
        isDemo: false,
      };
    }
  }

  // 2) Demo persona fallback
  const persona = store.get("jr_persona")?.value;
  if (persona === "candidate" || persona === "expert") {
    const userId = persona === "expert" ? DEMO_EXPERT_USER_ID : DEMO_CANDIDATE_ID;
    const [user] = await db.select().from(tables.users).where(eq(tables.users.id, userId));
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: persona,
        expertId: persona === "expert" ? DEMO_EXPERT_ID : null,
        isDemo: true,
      };
    }
  }

  return null;
}

/** For pages/actions that need an authenticated user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Candidate pages that need a completed profile (post-onboarding). */
export async function requireCandidateProfile(userId: string) {
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(tables.candidateProfiles)
    .where(eq(tables.candidateProfiles.userId, userId));
  if (!profile) redirect("/onboarding");
  return profile;
}
