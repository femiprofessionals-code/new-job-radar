/**
 * Data access layer — every page reads through these queries.
 */
import { and, asc, desc, eq, gte, inArray, isNull, isNotNull, lt, sql } from "drizzle-orm";
import { getDb, tables } from "@/db";
import {
  computeCareerHealth,
  type HealthResult,
} from "@/lib/engines/career-health";
import type {
  Application,
  ApplicationStage,
  CandidateProfile,
  CopilotAction,
  Document,
  Expert,
  ExpertService,
  HealthSnapshot,
  Interview,
  InterviewKit,
  Job,
  JobMatch,
  MockSession,
  ReviewFeedbackRow,
  ReviewRequest,
  User,
} from "@/db/schema";

const APPLIED_STAGES: ApplicationStage[] = [
  "applied",
  "assessment",
  "interview",
  "final_round",
  "offer",
  "rejected",
];
const RESPONSE_STAGES: ApplicationStage[] = [
  "assessment",
  "interview",
  "final_round",
  "offer",
];

export interface DashboardData {
  profile: CandidateProfile;
  health: HealthResult;
  healthHistory: HealthSnapshot[];
  interviewProbability: number;
  applicationsThisWeek: number;
  responseRate: number;
  interviewsEarned: number;
  offers: number;
  upcomingInterviews: (Interview & { job: Job | null })[];
  actions: CopilotAction[];
  latestFeedback: (ReviewFeedbackRow & { expertName: string; serviceType: string }) | null;
  topOpportunities: (JobMatch & { job: Job })[];
  pipeline: Record<string, number>;
  overdueFollowUps: number;
  avgMockScore: number | null;
}

export async function getDashboard(userId: string): Promise<DashboardData> {
  const db = await getDb();

  const [profile] = await db
    .select()
    .from(tables.candidateProfiles)
    .where(eq(tables.candidateProfiles.userId, userId));

  const apps = await db
    .select()
    .from(tables.applications)
    .where(eq(tables.applications.userId, userId));

  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const appliedApps = apps.filter((a) => APPLIED_STAGES.includes(a.stage));
  const applicationsThisWeek = apps.filter(
    (a) => (a.appliedAt ?? a.createdAt) >= weekAgo && a.stage !== "saved"
  ).length;
  const responded = appliedApps.filter((a) => RESPONSE_STAGES.includes(a.stage));
  const responseRate = appliedApps.length
    ? Math.round((responded.length / appliedApps.length) * 100)
    : 0;
  const interviewsEarned = apps.filter((a) =>
    ["interview", "final_round", "offer"].includes(a.stage)
  ).length;
  const offers = apps.filter((a) => a.stage === "offer").length;
  const overdueFollowUps = apps.filter(
    (a) => a.nextActionAt && a.nextActionAt < new Date()
  ).length;

  const pipeline: Record<string, number> = {};
  for (const a of apps) pipeline[a.stage] = (pipeline[a.stage] ?? 0) + 1;

  // Matches for market alignment + top opportunities
  const matches = await db
    .select()
    .from(tables.jobMatches)
    .where(eq(tables.jobMatches.userId, userId))
    .orderBy(desc(tables.jobMatches.interviewProbability));

  const appliedJobIds = new Set(apps.map((a) => a.jobId));
  const openMatches = matches.filter((m) => !appliedJobIds.has(m.jobId));
  const topMatchRows = openMatches.slice(0, 5);
  const topJobs = topMatchRows.length
    ? await db
        .select()
        .from(tables.jobs)
        .where(inArray(tables.jobs.id, topMatchRows.map((m) => m.jobId)))
    : [];
  const topOpportunities = topMatchRows.map((m) => ({
    ...m,
    job: topJobs.find((j) => j.id === m.jobId)!,
  }));

  const appliedMatchScores = matches
    .filter((m) => appliedJobIds.has(m.jobId))
    .map((m) => m.matchScore);
  const avgMatchScoreOfApplied = appliedMatchScores.length
    ? appliedMatchScores.reduce((a, b) => a + b, 0) / appliedMatchScores.length
    : null;
  const top20 = matches.slice(0, 20);
  const skillCoverageAvg = top20.length
    ? top20.reduce((acc, m) => acc + m.matchScore / 100, 0) / top20.length
    : null;

  const docs = await db
    .select()
    .from(tables.documents)
    .where(and(eq(tables.documents.userId, userId), eq(tables.documents.type, "resume")));
  const bestResumeAts = docs.reduce<number | null>(
    (best, d) => (d.atsScore !== null && (best === null || d.atsScore > best) ? d.atsScore : best),
    null
  );

  const mocks = await db
    .select()
    .from(tables.mockSessions)
    .where(and(eq(tables.mockSessions.userId, userId), eq(tables.mockSessions.status, "completed")));
  const mockScores = mocks.filter((m) => m.score !== null).map((m) => m.score!);
  const avgMockScore = mockScores.length
    ? Math.round(mockScores.reduce((a, b) => a + b, 0) / mockScores.length)
    : null;

  const completedReviews = await db
    .select()
    .from(tables.reviewRequests)
    .where(
      and(
        eq(tables.reviewRequests.candidateId, userId),
        eq(tables.reviewRequests.status, "completed")
      )
    );

  const health = computeCareerHealth({
    resumeAtsScore: bestResumeAts,
    applicationsLast7Days: applicationsThisWeek,
    weeklyGoal: profile.weeklyApplicationGoal,
    avgMatchScoreOfApplied,
    skillCoverageAvg,
    followUpsDue: overdueFollowUps,
    followUpsTotal: apps.filter((a) => a.nextActionAt).length,
    mockAvgScore: avgMockScore,
    expertReviewsCompleted: completedReviews.length,
  });

  const healthHistory = await db
    .select()
    .from(tables.healthSnapshots)
    .where(eq(tables.healthSnapshots.userId, userId))
    .orderBy(asc(tables.healthSnapshots.createdAt));

  const interviewProbability = topMatchRows.length
    ? Math.round(
        topMatchRows.slice(0, 3).reduce((a, m) => a + m.interviewProbability, 0) /
          Math.min(3, topMatchRows.length)
      )
    : 0;

  const upcoming = await db
    .select()
    .from(tables.interviews)
    .where(
      and(
        eq(tables.interviews.userId, userId),
        eq(tables.interviews.status, "scheduled"),
        gte(tables.interviews.scheduledAt, new Date())
      )
    )
    .orderBy(asc(tables.interviews.scheduledAt));
  const upcomingApps = apps.filter((a) => upcoming.some((i) => i.applicationId === a.id));
  const upcomingJobIds = upcomingApps.map((a) => a.jobId);
  const upcomingJobs = upcomingJobIds.length
    ? await db.select().from(tables.jobs).where(inArray(tables.jobs.id, upcomingJobIds))
    : [];
  const upcomingInterviews = upcoming.map((i) => {
    const app = apps.find((a) => a.id === i.applicationId);
    return { ...i, job: upcomingJobs.find((j) => j.id === app?.jobId) ?? null };
  });

  const actions = await db
    .select()
    .from(tables.copilotActions)
    .where(and(eq(tables.copilotActions.userId, userId), eq(tables.copilotActions.status, "pending")))
    .orderBy(asc(tables.copilotActions.priority), desc(tables.copilotActions.createdAt));

  const feedbackRows = await db
    .select({
      feedback: tables.reviewFeedback,
      request: tables.reviewRequests,
      expert: tables.experts,
      expertUser: tables.users,
    })
    .from(tables.reviewFeedback)
    .innerJoin(tables.reviewRequests, eq(tables.reviewFeedback.reviewRequestId, tables.reviewRequests.id))
    .innerJoin(tables.experts, eq(tables.reviewFeedback.expertId, tables.experts.id))
    .innerJoin(tables.users, eq(tables.experts.userId, tables.users.id))
    .where(eq(tables.reviewRequests.candidateId, userId))
    .orderBy(desc(tables.reviewFeedback.createdAt))
    .limit(1);
  const latestFeedback = feedbackRows[0]
    ? {
        ...feedbackRows[0].feedback,
        expertName: feedbackRows[0].expertUser.name,
        serviceType: feedbackRows[0].request.serviceType,
      }
    : null;

  return {
    profile,
    health,
    healthHistory,
    interviewProbability,
    applicationsThisWeek,
    responseRate,
    interviewsEarned,
    offers,
    upcomingInterviews,
    actions,
    latestFeedback,
    topOpportunities,
    pipeline,
    overdueFollowUps,
    avgMockScore,
  };
}

/* ── Opportunities ── */

export interface OpportunityRow extends JobMatch {
  job: Job;
  applicationId: string | null;
}

export async function getOpportunities(
  userId: string,
  opts: { q?: string; minProbability?: number; remoteOnly?: boolean; sort?: "probability" | "recent" } = {}
): Promise<OpportunityRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ match: tables.jobMatches, job: tables.jobs })
    .from(tables.jobMatches)
    .innerJoin(tables.jobs, eq(tables.jobMatches.jobId, tables.jobs.id))
    .where(and(eq(tables.jobMatches.userId, userId), eq(tables.jobs.active, true)));

  const apps = await db
    .select({ id: tables.applications.id, jobId: tables.applications.jobId })
    .from(tables.applications)
    .where(eq(tables.applications.userId, userId));
  const appByJob = new Map(apps.map((a) => [a.jobId, a.id]));

  let out = rows.map((r) => ({
    ...r.match,
    job: r.job,
    applicationId: appByJob.get(r.job.id) ?? null,
  }));

  if (opts.q) {
    const q = opts.q.toLowerCase();
    out = out.filter(
      (o) =>
        o.job.title.toLowerCase().includes(q) ||
        o.job.company.toLowerCase().includes(q) ||
        (o.job.skills as string[]).some((s) => s.toLowerCase().includes(q))
    );
  }
  if (opts.minProbability) out = out.filter((o) => o.interviewProbability >= opts.minProbability!);
  if (opts.remoteOnly) out = out.filter((o) => o.job.remote);

  out.sort((a, b) =>
    opts.sort === "recent"
      ? b.job.postedAt.getTime() - a.job.postedAt.getTime()
      : b.interviewProbability - a.interviewProbability
  );
  return out;
}

export async function getOpportunity(userId: string, jobId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ match: tables.jobMatches, job: tables.jobs })
    .from(tables.jobMatches)
    .innerJoin(tables.jobs, eq(tables.jobMatches.jobId, tables.jobs.id))
    .where(and(eq(tables.jobMatches.userId, userId), eq(tables.jobMatches.jobId, jobId)));
  if (!row) return null;
  const [app] = await db
    .select()
    .from(tables.applications)
    .where(and(eq(tables.applications.userId, userId), eq(tables.applications.jobId, jobId)));
  return { ...row.match, job: row.job, application: app ?? null };
}

/* ── Applications ── */

export interface BoardCard extends Application {
  job: Job;
  match: JobMatch | null;
  resumeDoc: Document | null;
}

export async function getApplicationsBoard(userId: string): Promise<BoardCard[]> {
  const db = await getDb();
  const apps = await db
    .select()
    .from(tables.applications)
    .where(eq(tables.applications.userId, userId))
    .orderBy(desc(tables.applications.lastActivityAt));
  if (!apps.length) return [];
  const jobIds = apps.map((a) => a.jobId);
  const jobs = await db.select().from(tables.jobs).where(inArray(tables.jobs.id, jobIds));
  const matches = await db
    .select()
    .from(tables.jobMatches)
    .where(and(eq(tables.jobMatches.userId, userId), inArray(tables.jobMatches.jobId, jobIds)));
  const docIds = apps.map((a) => a.resumeDocumentId).filter(Boolean) as string[];
  const docs = docIds.length
    ? await db.select().from(tables.documents).where(inArray(tables.documents.id, docIds))
    : [];
  return apps.map((a) => ({
    ...a,
    job: jobs.find((j) => j.id === a.jobId)!,
    match: matches.find((m) => m.jobId === a.jobId) ?? null,
    resumeDoc: docs.find((d) => d.id === a.resumeDocumentId) ?? null,
  }));
}

export async function getApplicationDetail(userId: string, id: string) {
  const db = await getDb();
  const [app] = await db
    .select()
    .from(tables.applications)
    .where(and(eq(tables.applications.id, id), eq(tables.applications.userId, userId)));
  if (!app) return null;
  const [job] = await db.select().from(tables.jobs).where(eq(tables.jobs.id, app.jobId));
  const [match] = await db
    .select()
    .from(tables.jobMatches)
    .where(and(eq(tables.jobMatches.userId, userId), eq(tables.jobMatches.jobId, app.jobId)));
  const events = await db
    .select()
    .from(tables.applicationEvents)
    .where(eq(tables.applicationEvents.applicationId, id))
    .orderBy(desc(tables.applicationEvents.createdAt));
  const docIds = [app.resumeDocumentId, app.coverLetterDocumentId].filter(Boolean) as string[];
  const docs = docIds.length
    ? await db.select().from(tables.documents).where(inArray(tables.documents.id, docIds))
    : [];
  const ivs = await db
    .select()
    .from(tables.interviews)
    .where(eq(tables.interviews.applicationId, id))
    .orderBy(asc(tables.interviews.scheduledAt));
  return {
    ...app,
    job,
    match: match ?? null,
    events,
    resumeDoc: docs.find((d) => d.id === app.resumeDocumentId) ?? null,
    coverDoc: docs.find((d) => d.id === app.coverLetterDocumentId) ?? null,
    interviews: ivs,
  };
}

/* ── Experts marketplace ── */

export interface ExpertCard extends Expert {
  name: string;
  services: ExpertService[];
}

export async function getExperts(opts: { category?: string; q?: string } = {}): Promise<ExpertCard[]> {
  const db = await getDb();
  const rows = await db
    .select({ expert: tables.experts, user: tables.users })
    .from(tables.experts)
    .innerJoin(tables.users, eq(tables.experts.userId, tables.users.id));
  const services = await db.select().from(tables.expertServices);
  let out = rows.map((r) => ({
    ...r.expert,
    name: r.user.name,
    services: services.filter((s) => s.expertId === r.expert.id),
  }));
  if (opts.category)
    out = out.filter((e) => (e.categories as string[]).includes(opts.category!));
  if (opts.q) {
    const q = opts.q.toLowerCase();
    out = out.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.headline.toLowerCase().includes(q) ||
        (e.specializations as string[]).some((s) => s.toLowerCase().includes(q))
    );
  }
  out.sort((a, b) => b.rating * Math.log(b.reviewsCount + 1) - a.rating * Math.log(a.reviewsCount + 1));
  return out;
}

export async function getExpertDetail(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ expert: tables.experts, user: tables.users })
    .from(tables.experts)
    .innerJoin(tables.users, eq(tables.experts.userId, tables.users.id))
    .where(eq(tables.experts.id, id));
  if (!row) return null;
  const services = await db
    .select()
    .from(tables.expertServices)
    .where(eq(tables.expertServices.expertId, id));
  return { ...row.expert, name: row.user.name, services };
}

export async function getCandidateReviews(userId: string) {
  const db = await getDb();
  const requests = await db
    .select()
    .from(tables.reviewRequests)
    .where(eq(tables.reviewRequests.candidateId, userId))
    .orderBy(desc(tables.reviewRequests.createdAt));
  if (!requests.length) return [];
  const expertIds = requests.map((r) => r.claimedBy).filter(Boolean) as string[];
  const expertRows = expertIds.length
    ? await db
        .select({ expert: tables.experts, user: tables.users })
        .from(tables.experts)
        .innerJoin(tables.users, eq(tables.experts.userId, tables.users.id))
        .where(inArray(tables.experts.id, expertIds))
    : [];
  const feedback = await db
    .select()
    .from(tables.reviewFeedback)
    .where(inArray(tables.reviewFeedback.reviewRequestId, requests.map((r) => r.id)));
  return requests.map((r) => ({
    ...r,
    expertName: expertRows.find((e) => e.expert.id === r.claimedBy)?.user.name ?? null,
    feedback: feedback.find((f) => f.reviewRequestId === r.id) ?? null,
  }));
}

/* ── Expert-side queue ── */

export interface QueueItem extends ReviewRequest {
  candidateName: string;
  candidateHeadline: string | null;
  document: Document | null; // null until claimed by this expert
}

export async function getExpertQueue(expertId: string): Promise<{
  available: QueueItem[];
  mine: QueueItem[];
  completed: QueueItem[];
  earningsCents: number;
}> {
  const db = await getDb();
  const requests = await db
    .select({
      request: tables.reviewRequests,
      candidate: tables.users,
      profile: tables.candidateProfiles,
    })
    .from(tables.reviewRequests)
    .innerJoin(tables.users, eq(tables.reviewRequests.candidateId, tables.users.id))
    .leftJoin(tables.candidateProfiles, eq(tables.candidateProfiles.userId, tables.users.id))
    .orderBy(desc(tables.reviewRequests.createdAt));

  const claimedIds = requests
    .filter((r) => r.request.claimedBy === expertId && r.request.documentId)
    .map((r) => r.request.documentId!) as string[];
  const docs = claimedIds.length
    ? await db.select().from(tables.documents).where(inArray(tables.documents.id, claimedIds))
    : [];

  const toItem = (r: (typeof requests)[number]): QueueItem => ({
    ...r.request,
    candidateName: r.candidate.name,
    candidateHeadline: r.profile?.headline ?? null,
    // CONFIDENTIALITY GUARANTEE: document content is only attached when this
    // expert holds the claim.
    document:
      r.request.claimedBy === expertId
        ? docs.find((d) => d.id === r.request.documentId) ?? null
        : null,
  });

  const available = requests.filter((r) => r.request.status === "available").map(toItem);
  const mine = requests
    .filter(
      (r) =>
        r.request.claimedBy === expertId &&
        ["claimed", "in_progress", "delivered"].includes(r.request.status)
    )
    .map(toItem);
  const completed = requests
    .filter((r) => r.request.claimedBy === expertId && r.request.status === "completed")
    .map(toItem);
  const earningsCents = completed.reduce((acc, r) => acc + Math.round(r.priceCents * 0.8), 0);

  return { available, mine, completed, earningsCents };
}

/* ── Interviews ── */

export async function getInterviewHub(userId: string) {
  const db = await getDb();
  const ivs = await db
    .select()
    .from(tables.interviews)
    .where(eq(tables.interviews.userId, userId))
    .orderBy(asc(tables.interviews.scheduledAt));
  const appIds = ivs.map((i) => i.applicationId).filter(Boolean) as string[];
  const apps = appIds.length
    ? await db.select().from(tables.applications).where(inArray(tables.applications.id, appIds))
    : [];
  const jobIds = apps.map((a) => a.jobId);
  const jobs = jobIds.length
    ? await db.select().from(tables.jobs).where(inArray(tables.jobs.id, jobIds))
    : [];
  const mocks = await db
    .select()
    .from(tables.mockSessions)
    .where(eq(tables.mockSessions.userId, userId))
    .orderBy(desc(tables.mockSessions.createdAt));
  const kits = await db.select().from(tables.interviewKits);
  const completedMocks = mocks.filter((m) => m.status === "completed" && m.score !== null);
  const readiness = completedMocks.length
    ? Math.round(
        completedMocks.reduce((a, m) => a + m.score!, 0) / completedMocks.length * 0.7 +
          Math.min(30, completedMocks.length * 10)
      )
    : 25;
  return {
    interviews: ivs.map((i) => {
      const app = apps.find((a) => a.id === i.applicationId);
      return { ...i, job: jobs.find((j) => j.id === app?.jobId) ?? null };
    }),
    mocks,
    kits,
    readiness: Math.min(100, readiness),
  };
}

export async function getMockSession(userId: string, id: string): Promise<MockSession | null> {
  const db = await getDb();
  const [m] = await db
    .select()
    .from(tables.mockSessions)
    .where(and(eq(tables.mockSessions.id, id), eq(tables.mockSessions.userId, userId)));
  return m ?? null;
}

export async function getKit(id: string): Promise<InterviewKit | null> {
  const db = await getDb();
  const [k] = await db.select().from(tables.interviewKits).where(eq(tables.interviewKits.id, id));
  return k ?? null;
}

/* ── Copilot ── */

export async function getCopilotThread(userId: string) {
  const db = await getDb();
  return db
    .select()
    .from(tables.copilotMessages)
    .where(eq(tables.copilotMessages.userId, userId))
    .orderBy(asc(tables.copilotMessages.createdAt));
}

/* ── Notifications ── */

export async function getNotifications(userId: string) {
  const db = await getDb();
  return db
    .select()
    .from(tables.notifications)
    .where(eq(tables.notifications.userId, userId))
    .orderBy(desc(tables.notifications.createdAt))
    .limit(10);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = await getDb();
  const r = await db
    .select({ c: sql<number>`count(*)` })
    .from(tables.notifications)
    .where(and(eq(tables.notifications.userId, userId), isNull(tables.notifications.readAt)));
  return Number(r[0].c);
}
