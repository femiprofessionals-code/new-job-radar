/**
 * Sessions — real accounts only. A session token cookie maps to
 * jobradar.sessions → jobradar.users. No session ⇒ redirect to /login.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { SESSION_COOKIE } from "@/lib/auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "candidate" | "expert";
  expertId: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const [row] = await db
    .select({ user: tables.users, session: tables.sessions })
    .from(tables.sessions)
    .innerJoin(tables.users, eq(tables.sessions.userId, tables.users.id))
    .where(and(eq(tables.sessions.token, token), gt(tables.sessions.expiresAt, new Date())));
  if (!row) return null;

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
  };
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
