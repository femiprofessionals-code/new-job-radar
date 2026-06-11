"use server";

/**
 * Server actions — all writes flow through here.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { getSessionUser } from "@/lib/session";
import { tailorResume, draftCoverLetter } from "@/lib/engines/documents";
import { scoreAts } from "@/lib/engines/scoring";
import { answerCopilot, type CopilotContext } from "@/lib/engines/copilot";
import { getDashboard } from "@/lib/data";
import {
  firstQuestion,
  nextInterviewerTurn,
  scoreMock,
} from "@/lib/engines/mock-interview";
import type { ApplicationStage, ServiceType } from "@/db/schema";

const uid = () => crypto.randomUUID();

/* ── Persona (demo auth) ── */

export async function switchPersona(persona: "candidate" | "expert") {
  const store = await cookies();
  store.set("jr_persona", persona, { path: "/" });
  redirect(persona === "expert" ? "/experts/queue" : "/");
}

/* ── Opportunities → Applications ── */

export async function saveOpportunity(jobId: string): Promise<void> {
  const user = await getSessionUser();
  const db = await getDb();
  const id = uid();
  await db
    .insert(tables.applications)
    .values({ id, userId: user.id, jobId, stage: "saved" })
    .onConflictDoNothing();
  await db.insert(tables.applicationEvents).values({
    id: uid(),
    applicationId: id,
    type: "created",
    detail: "Saved from Opportunities",
  });
  revalidatePath("/opportunities");
  revalidatePath("/applications");
}

export async function moveApplicationStage(applicationId: string, stage: ApplicationStage) {
  const user = await getSessionUser();
  const db = await getDb();
  const now = new Date();
  await db
    .update(tables.applications)
    .set({
      stage,
      lastActivityAt: now,
      appliedAt: stage === "applied" ? now : undefined,
      nextActionAt:
        stage === "applied" ? new Date(now.getTime() + 5 * 86_400_000) : null,
      nextActionLabel: stage === "applied" ? "Send follow-up to recruiter" : null,
    })
    .where(and(eq(tables.applications.id, applicationId), eq(tables.applications.userId, user.id)));
  await db.insert(tables.applicationEvents).values({
    id: uid(),
    applicationId,
    type: "stage_change",
    detail: `Moved to ${stage.replace("_", " ")}`,
  });
  revalidatePath("/applications");
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/");
}

export async function completeFollowUp(applicationId: string) {
  const user = await getSessionUser();
  const db = await getDb();
  await db
    .update(tables.applications)
    .set({ nextActionAt: null, nextActionLabel: null, lastActivityAt: new Date() })
    .where(and(eq(tables.applications.id, applicationId), eq(tables.applications.userId, user.id)));
  await db.insert(tables.applicationEvents).values({
    id: uid(),
    applicationId,
    type: "follow_up",
    detail: "Follow-up sent",
  });
  revalidatePath("/applications");
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/");
}

/* ── Document generation ── */

export async function generateTailoredResume(applicationId: string) {
  const user = await getSessionUser();
  const db = await getDb();
  const [app] = await db
    .select()
    .from(tables.applications)
    .where(and(eq(tables.applications.id, applicationId), eq(tables.applications.userId, user.id)));
  if (!app) return;
  const [job] = await db.select().from(tables.jobs).where(eq(tables.jobs.id, app.jobId));
  const [base] = await db
    .select()
    .from(tables.documents)
    .where(
      and(
        eq(tables.documents.userId, user.id),
        eq(tables.documents.type, "resume"),
        sql`${tables.documents.baseDocumentId} IS NULL`
      )
    )
    .limit(1);
  if (!base || !job) return;

  const content = await tailorResume(base, job);
  const docId = uid();
  await db.insert(tables.documents).values({
    id: docId,
    userId: user.id,
    type: "resume",
    title: `Resume — ${job.company} (${job.title})`,
    content,
    baseDocumentId: base.id,
    jobId: job.id,
    atsScore: scoreAts(content, job.skills as string[]),
  });
  await db
    .update(tables.applications)
    .set({ resumeDocumentId: docId, lastActivityAt: new Date() })
    .where(eq(tables.applications.id, applicationId));
  await db.insert(tables.applicationEvents).values({
    id: uid(),
    applicationId,
    type: "document",
    detail: "Tailored resume generated",
  });
  revalidatePath(`/applications/${applicationId}`);
}

export async function generateCoverLetterAction(applicationId: string) {
  const user = await getSessionUser();
  const db = await getDb();
  const [app] = await db
    .select()
    .from(tables.applications)
    .where(and(eq(tables.applications.id, applicationId), eq(tables.applications.userId, user.id)));
  if (!app) return;
  const [job] = await db.select().from(tables.jobs).where(eq(tables.jobs.id, app.jobId));
  const [profile] = await db
    .select()
    .from(tables.candidateProfiles)
    .where(eq(tables.candidateProfiles.userId, user.id));
  if (!job) return;

  const content = await draftCoverLetter(user.name, profile?.summary ?? null, job);
  const docId = uid();
  await db.insert(tables.documents).values({
    id: docId,
    userId: user.id,
    type: "cover_letter",
    title: `Cover Letter — ${job.company}`,
    content,
    jobId: job.id,
    atsScore: scoreAts(content, job.skills as string[]),
  });
  await db
    .update(tables.applications)
    .set({ coverLetterDocumentId: docId, lastActivityAt: new Date() })
    .where(eq(tables.applications.id, applicationId));
  await db.insert(tables.applicationEvents).values({
    id: uid(),
    applicationId,
    type: "document",
    detail: "Cover letter generated",
  });
  revalidatePath(`/applications/${applicationId}`);
}

/* ── Expert marketplace: review queue ── */

export async function requestReview(input: {
  serviceType: ServiceType;
  documentId: string | null;
  targetExpertId?: string | null;
  priceCents: number;
  instructions: string;
}) {
  const user = await getSessionUser();
  const db = await getDb();
  const id = uid();
  await db.insert(tables.reviewRequests).values({
    id,
    candidateId: user.id,
    serviceType: input.serviceType,
    documentId: input.documentId,
    targetExpertId: input.targetExpertId ?? null,
    status: "available",
    priceCents: input.priceCents,
    instructions: input.instructions,
  });
  await db.insert(tables.transactions).values({
    id: uid(),
    userId: user.id,
    reviewRequestId: id,
    description: `${input.serviceType.replace(/_/g, " ")} — escrow`,
    amountCents: input.priceCents,
    platformFeeCents: Math.round(input.priceCents * 0.2),
    status: "pending",
  });
  revalidatePath("/experts");
  revalidatePath("/experts/queue");
}

/**
 * Atomic claim. The UPDATE's WHERE clause enforces single-assignment at the
 * database level: two concurrent claims race on `status = 'available'` and
 * exactly one matches the row. No row returned ⇒ someone else won.
 */
export async function claimReview(reviewRequestId: string): Promise<{ ok: boolean; reason?: string }> {
  const user = await getSessionUser();
  if (!user.expertId) return { ok: false, reason: "Not an expert account" };
  const db = await getDb();
  const claimed = await db
    .update(tables.reviewRequests)
    .set({
      status: "claimed",
      claimedBy: user.expertId,
      claimedAt: new Date(),
      lockExpiresAt: new Date(Date.now() + 24 * 3_600_000),
    })
    .where(
      and(
        eq(tables.reviewRequests.id, reviewRequestId),
        eq(tables.reviewRequests.status, "available"),
        sql`${tables.reviewRequests.claimedBy} IS NULL`
      )
    )
    .returning({ id: tables.reviewRequests.id });

  revalidatePath("/experts/queue");
  if (!claimed.length) return { ok: false, reason: "Already claimed by another expert" };
  return { ok: true };
}

export async function releaseClaim(reviewRequestId: string) {
  const user = await getSessionUser();
  if (!user.expertId) return;
  const db = await getDb();
  await db
    .update(tables.reviewRequests)
    .set({ status: "available", claimedBy: null, claimedAt: null, lockExpiresAt: null })
    .where(
      and(
        eq(tables.reviewRequests.id, reviewRequestId),
        eq(tables.reviewRequests.claimedBy, user.expertId),
        eq(tables.reviewRequests.status, "claimed")
      )
    );
  revalidatePath("/experts/queue");
}

export async function deliverFeedback(input: {
  reviewRequestId: string;
  summary: string;
  scorecard: { dimension: string; score: number; note: string }[];
  suggestions: string[];
}) {
  const user = await getSessionUser();
  if (!user.expertId) return;
  const db = await getDb();
  const [req] = await db
    .select()
    .from(tables.reviewRequests)
    .where(
      and(
        eq(tables.reviewRequests.id, input.reviewRequestId),
        eq(tables.reviewRequests.claimedBy, user.expertId)
      )
    );
  if (!req || !["claimed", "in_progress"].includes(req.status)) return;

  await db.insert(tables.reviewFeedback).values({
    id: uid(),
    reviewRequestId: input.reviewRequestId,
    expertId: user.expertId,
    summary: input.summary,
    scorecard: input.scorecard,
    suggestions: input.suggestions,
  });
  await db
    .update(tables.reviewRequests)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(eq(tables.reviewRequests.id, input.reviewRequestId));
  await db.insert(tables.notifications).values({
    id: uid(),
    userId: req.candidateId,
    kind: "review",
    title: "Your expert review was delivered",
    body: "Open it to see the scorecard and suggested fixes.",
    href: "/experts",
  });
  revalidatePath("/experts/queue");
  revalidatePath("/experts");
}

export async function acceptReview(reviewRequestId: string, rating: number, comment: string) {
  const user = await getSessionUser();
  const db = await getDb();
  const [req] = await db
    .select()
    .from(tables.reviewRequests)
    .where(
      and(
        eq(tables.reviewRequests.id, reviewRequestId),
        eq(tables.reviewRequests.candidateId, user.id),
        eq(tables.reviewRequests.status, "delivered")
      )
    );
  if (!req) return;

  await db
    .update(tables.reviewRequests)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(tables.reviewRequests.id, reviewRequestId));
  await db
    .update(tables.reviewFeedback)
    .set({ candidateRating: rating, candidateComment: comment || null })
    .where(eq(tables.reviewFeedback.reviewRequestId, reviewRequestId));
  await db
    .update(tables.transactions)
    .set({ status: "succeeded" })
    .where(eq(tables.transactions.reviewRequestId, reviewRequestId));

  if (req.claimedBy) {
    // Recompute expert rating
    const stats = await db
      .select({
        avg: sql<number>`avg(${tables.reviewFeedback.candidateRating})`,
        cnt: sql<number>`count(${tables.reviewFeedback.candidateRating})`,
      })
      .from(tables.reviewFeedback)
      .where(
        and(
          eq(tables.reviewFeedback.expertId, req.claimedBy),
          sql`${tables.reviewFeedback.candidateRating} IS NOT NULL`
        )
      );
    await db
      .update(tables.experts)
      .set({
        servicesCompleted: sql`${tables.experts.servicesCompleted} + 1`,
        rating: Number(stats[0].avg) || undefined,
      })
      .where(eq(tables.experts.id, req.claimedBy));
  }
  revalidatePath("/experts");
  revalidatePath("/");
}

/* ── Mock interviews ── */

export async function startMockSession(focus: string, targetCompany?: string) {
  const user = await getSessionUser();
  const db = await getDb();
  const id = uid();
  await db.insert(tables.mockSessions).values({
    id,
    userId: user.id,
    mode: "ai",
    focus,
    targetCompany: targetCompany || null,
    status: "in_progress",
    transcript: [
      {
        role: "interviewer",
        content: `Welcome — I'll be your ${focus.replace("_", " ")} interviewer today${targetCompany ? `, running a ${targetCompany}-style loop` : ""}. We'll go through a few questions; answer as you would in a real interview. First question: ${firstQuestion(focus)}`,
        at: new Date().toISOString(),
      },
    ],
  });
  redirect(`/interviews/mock/${id}`);
}

export async function sendMockAnswer(sessionId: string, answer: string) {
  const user = await getSessionUser();
  const db = await getDb();
  const [session] = await db
    .select()
    .from(tables.mockSessions)
    .where(and(eq(tables.mockSessions.id, sessionId), eq(tables.mockSessions.userId, user.id)));
  if (!session || session.status !== "in_progress") return;

  const transcript = [
    ...session.transcript,
    { role: "candidate" as const, content: answer, at: new Date().toISOString() },
  ];
  const { message, isClosing } = await nextInterviewerTurn(
    session.focus,
    transcript,
    session.targetCompany
  );
  transcript.push({ role: "interviewer", content: message, at: new Date().toISOString() });

  if (isClosing) {
    const { score, scorecard } = scoreMock(session.focus, transcript);
    await db
      .update(tables.mockSessions)
      .set({ transcript, status: "completed", score, scorecard, completedAt: new Date() })
      .where(eq(tables.mockSessions.id, sessionId));
  } else {
    await db.update(tables.mockSessions).set({ transcript }).where(eq(tables.mockSessions.id, sessionId));
  }
  revalidatePath(`/interviews/mock/${sessionId}`);
}

/* ── Copilot ── */

export async function askCopilotAction(question: string) {
  const user = await getSessionUser();
  const db = await getDb();
  const d = await getDashboard(user.id);

  const ctx: CopilotContext = {
    name: user.name,
    headline: d.profile.headline,
    healthScore: d.health.score,
    interviewProbability: d.interviewProbability,
    applicationsThisWeek: d.applicationsThisWeek,
    weeklyGoal: d.profile.weeklyApplicationGoal,
    responseRate: d.responseRate,
    interviewsUpcoming: d.upcomingInterviews.length,
    overdueFollowUps: d.overdueFollowUps,
    topOpportunities: d.topOpportunities.map((o) => ({
      title: o.job.title,
      company: o.job.company,
      probability: o.interviewProbability,
    })),
    bestResumeAts: d.health.breakdown.find((b) => b.dimension === "Resume Quality")?.score ?? null,
    avgMockScore: d.avgMockScore,
    pendingActions: d.actions.map((a) => ({ title: a.title, impact: a.impact })),
    pipeline: d.pipeline,
  };

  await db.insert(tables.copilotMessages).values({
    id: uid(),
    userId: user.id,
    role: "user",
    content: question,
  });
  const reply = await answerCopilot(ctx, question);
  await db.insert(tables.copilotMessages).values({
    id: uid(),
    userId: user.id,
    role: "copilot",
    content: reply,
  });
  revalidatePath("/copilot");
  return reply;
}

export async function resolveCopilotAction(actionId: string, status: "done" | "dismissed") {
  const user = await getSessionUser();
  const db = await getDb();
  await db
    .update(tables.copilotActions)
    .set({ status, resolvedAt: new Date() })
    .where(and(eq(tables.copilotActions.id, actionId), eq(tables.copilotActions.userId, user.id)));
  revalidatePath("/");
}

/* ── FormData wrappers (used by plain server-component forms) ── */

export async function requestReviewForm(formData: FormData) {
  await requestReview({
    serviceType: String(formData.get("serviceType")) as ServiceType,
    documentId: (formData.get("documentId") as string) || null,
    targetExpertId: (formData.get("targetExpertId") as string) || null,
    priceCents: Number(formData.get("priceCents")),
    instructions: String(formData.get("instructions") ?? ""),
  });
  redirect("/experts?tab=reviews");
}

export async function deliverFeedbackForm(formData: FormData) {
  const dims = ["Overall Quality", "Clarity & Impact", "Market Fit"];
  const scorecard = dims
    .map((dimension, i) => ({
      dimension,
      score: Number(formData.get(`score_${i}`) ?? 0),
      note: String(formData.get(`note_${i}`) ?? ""),
    }))
    .filter((s) => s.score > 0);
  const suggestions = String(formData.get("suggestions") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  await deliverFeedback({
    reviewRequestId: String(formData.get("reviewRequestId")),
    summary: String(formData.get("summary") ?? ""),
    scorecard,
    suggestions,
  });
}

export async function acceptReviewForm(formData: FormData) {
  await acceptReview(
    String(formData.get("reviewRequestId")),
    Number(formData.get("rating") ?? 5),
    String(formData.get("comment") ?? "")
  );
}

export async function askCopilotForm(formData: FormData) {
  const q = String(formData.get("question") ?? "").trim();
  if (q) await askCopilotAction(q);
}

export async function startMockForm(formData: FormData) {
  await startMockSession(
    String(formData.get("focus")),
    String(formData.get("targetCompany") ?? "") || undefined
  );
}

export async function sendMockAnswerForm(formData: FormData) {
  const answer = String(formData.get("answer") ?? "").trim();
  if (answer) await sendMockAnswer(String(formData.get("sessionId")), answer);
}

/* ── Misc ── */

export async function markAllNotificationsRead() {
  const user = await getSessionUser();
  const db = await getDb();
  await db
    .update(tables.notifications)
    .set({ readAt: new Date() })
    .where(eq(tables.notifications.userId, user.id));
  revalidatePath("/", "layout");
}

export async function changePlan(plan: "free" | "pro" | "accelerator" | "elite") {
  const user = await getSessionUser();
  const db = await getDb();
  await db
    .update(tables.candidateProfiles)
    .set({ plan })
    .where(eq(tables.candidateProfiles.userId, user.id));
  await db
    .update(tables.subscriptions)
    .set({ plan })
    .where(eq(tables.subscriptions.userId, user.id));
  revalidatePath("/settings");
}
