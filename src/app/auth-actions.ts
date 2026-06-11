"use server";

/**
 * Authentication + onboarding actions.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import {
  hashPassword,
  verifyPassword,
  newSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
} from "@/lib/auth";
import { getSessionUser, requireUser } from "@/lib/session";
import { analyzeMatch, scoreAts } from "@/lib/engines/scoring";

const uid = () => crypto.randomUUID();

async function startSession(userId: string) {
  const db = await getDb();
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await db.insert(tables.sessions).values({ token, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });
  // A real session supersedes any demo persona.
  store.delete("jr_persona");
}

export interface AuthState {
  error?: string;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "expert" ? "expert" : "candidate";

  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = await getDb();
  const [existing] = await db.select().from(tables.users).where(eq(tables.users.email, email));
  if (existing) return { error: "An account with this email already exists — try logging in." };

  const userId = uid();
  await db.insert(tables.users).values({
    id: userId,
    email,
    name,
    role,
    passwordHash: hashPassword(password),
  });
  await startSession(userId);
  redirect("/onboarding");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const db = await getDb();
  const [user] = await db.select().from(tables.users).where(eq(tables.users.email, email));
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }
  await startSession(user.id);
  redirect("/");
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(tables.sessions).where(eq(tables.sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
  store.delete("jr_persona");
  redirect("/login");
}

/* ── Onboarding ── */

function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Score every active job for this user — their radar lights up instantly. */
async function computeMatchesForUser(userId: string) {
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(tables.candidateProfiles)
    .where(eq(tables.candidateProfiles.userId, userId));
  if (!profile) return;

  const resumes = await db
    .select()
    .from(tables.documents)
    .where(eq(tables.documents.userId, userId));
  const bestAts = resumes
    .filter((d) => d.type === "resume")
    .reduce<number | null>((b, d) => (d.atsScore !== null && (b === null || d.atsScore > b) ? d.atsScore : b), null);

  const signal = {
    skills: profile.skills as string[],
    yearsExperience: profile.yearsExperience,
    targetRoles: profile.targetRoles as string[],
    resumeAtsScore: bestAts,
  };

  const jobs = await db.select().from(tables.jobs).where(eq(tables.jobs.active, true));
  await db.delete(tables.jobMatches).where(eq(tables.jobMatches.userId, userId));
  if (!jobs.length) return;
  await db.insert(tables.jobMatches).values(
    jobs.map((j) => {
      const a = analyzeMatch(signal, {
        title: j.title,
        skills: j.skills as string[],
        seniority: j.seniority,
        postedAt: j.postedAt,
        applicantEstimate: j.applicantEstimate,
        remote: j.remote,
      });
      return {
        id: uid(),
        userId,
        jobId: j.id,
        interviewProbability: a.interviewProbability,
        matchScore: a.matchScore,
        matchReasons: a.matchReasons,
        strengths: a.strengths,
        gaps: a.gaps,
        priority: a.priority,
        competition: a.competition,
      };
    })
  );
}

export async function completeCandidateOnboarding(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();

  const headline = String(formData.get("headline") ?? "").trim();
  const yearsExperience = Math.max(0, Math.min(50, Number(formData.get("yearsExperience") ?? 0)));
  const skills = parseList(formData.get("skills"));
  const targetRoles = parseList(formData.get("targetRoles"));
  const location = String(formData.get("location") ?? "").trim() || null;
  const resumeText = String(formData.get("resume") ?? "").trim();

  await db
    .insert(tables.candidateProfiles)
    .values({
      userId: user.id,
      headline: headline || null,
      location,
      yearsExperience,
      skills,
      targetRoles,
      plan: "free",
      weeklyApplicationGoal: 10,
    })
    .onConflictDoNothing();

  await db
    .insert(tables.subscriptions)
    .values({ id: uid(), userId: user.id, plan: "free", status: "active" })
    .onConflictDoNothing();

  if (resumeText.length > 100) {
    await db.insert(tables.documents).values({
      id: uid(),
      userId: user.id,
      type: "resume",
      title: `Master Resume — ${user.name}`,
      content: resumeText,
      atsScore: scoreAts(resumeText, skills),
    });
  }

  await computeMatchesForUser(user.id);

  await db.insert(tables.copilotActions).values([
    {
      id: uid(),
      userId: user.id,
      kind: "apply",
      title: "Apply to your first 3 high-probability roles",
      description:
        "Your radar is live. Start with the top of the list — fresh, high-probability postings convert 3–4× better.",
      impact: "Start the pipeline",
      href: "/opportunities",
      priority: "critical",
    },
    {
      id: uid(),
      userId: user.id,
      kind: "interview_prep",
      title: "Run a baseline AI mock interview",
      description: "15 minutes gives you a scored baseline and your first Interview Readiness number.",
      impact: "Baseline your readiness",
      href: "/interviews",
      priority: "high",
    },
    ...(resumeText.length > 100
      ? []
      : [
          {
            id: uid(),
            userId: user.id,
            kind: "resume" as const,
            title: "Add your master resume",
            description:
              "Without a resume the Application Engine can't tailor documents or compute ATS scores.",
            impact: "Unblocks tailoring + ATS",
            href: "/settings",
            priority: "critical" as const,
          },
        ]),
  ]);

  const matches = await db
    .select({ p: tables.jobMatches.interviewProbability })
    .from(tables.jobMatches)
    .where(eq(tables.jobMatches.userId, user.id));
  const top3 = matches.map((m) => m.p).sort((a, b) => b - a).slice(0, 3);
  await db.insert(tables.healthSnapshots).values({
    id: uid(),
    userId: user.id,
    score: resumeText.length > 100 ? 42 : 30,
    interviewProbability: top3.length
      ? Math.round(top3.reduce((a, b) => a + b, 0) / top3.length)
      : 0,
    breakdown: [],
  });

  redirect("/");
}

export async function completeExpertOnboarding(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();

  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const yearsExperience = Math.max(0, Math.min(50, Number(formData.get("yearsExperience") ?? 0)));
  const categories = formData.getAll("categories").map(String).slice(0, 7);
  const specializations = parseList(formData.get("specializations"));

  const expertId = uid();
  await db
    .insert(tables.experts)
    .values({
      id: expertId,
      userId: user.id,
      headline: headline || "Career Expert",
      bio: bio || "Experienced career professional.",
      categories,
      specializations,
      industries: [],
      yearsExperience,
      verified: false,
      availableNow: true,
    })
    .onConflictDoNothing();

  const wantsResume = categories.some((c) =>
    ["resume_expert", "ats_expert", "recruiter"].includes(c)
  );
  const wantsMock = categories.some((c) => ["interview_coach", "hiring_manager"].includes(c));
  const services = [
    ...(wantsResume
      ? [{ type: "resume_review" as const, title: "Deep Resume Review", description: "Line-by-line review with rewrite suggestions and an ATS keyword audit.", priceCents: 9900, turnaroundHours: 48 }]
      : []),
    ...(wantsMock
      ? [{ type: "mock_interview" as const, title: "60-min Mock Interview", description: "Realistic interview with a detailed scorecard and improvement plan.", priceCents: 14900, turnaroundHours: 72 }]
      : []),
  ];
  if (!services.length)
    services.push({
      type: "coaching" as unknown as "resume_review",
      title: "Career Strategy Session",
      description: "45-minute 1:1 on targeting, narrative, and an action plan.",
      priceCents: 9900,
      turnaroundHours: 72,
    });
  await db.insert(tables.expertServices).values(
    services.map((s) => ({ id: uid(), expertId, ...s }))
  );

  redirect("/experts/queue");
}

/* ── Profile editing (Settings) ── */

export async function updateCandidateProfile(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .update(tables.candidateProfiles)
    .set({
      headline: String(formData.get("headline") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      yearsExperience: Math.max(0, Math.min(50, Number(formData.get("yearsExperience") ?? 0))),
      skills: parseList(formData.get("skills")),
      targetRoles: parseList(formData.get("targetRoles")),
      weeklyApplicationGoal: Math.max(1, Math.min(50, Number(formData.get("weeklyGoal") ?? 10))),
    })
    .where(eq(tables.candidateProfiles.userId, user.id));
  // Profile changed → rescore the radar.
  await computeMatchesForUser(user.id);
  redirect("/settings");
}

export async function addMasterResume(formData: FormData) {
  const user = await requireUser();
  const content = String(formData.get("resume") ?? "").trim();
  if (content.length < 100) return;
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(tables.candidateProfiles)
    .where(eq(tables.candidateProfiles.userId, user.id));
  await db.insert(tables.documents).values({
    id: uid(),
    userId: user.id,
    type: "resume",
    title: `Master Resume — ${user.name}`,
    content,
    atsScore: scoreAts(content, (profile?.skills as string[]) ?? []),
  });
  await computeMatchesForUser(user.id);
  redirect("/settings");
}

/* Demo persona entry (from the login page) */
export async function enterDemo(persona: "candidate" | "expert") {
  const current = await getSessionUser();
  if (current && !current.isDemo) redirect("/");
  const store = await cookies();
  store.set("jr_persona", persona, { path: "/" });
  redirect(persona === "expert" ? "/experts/queue" : "/");
}
