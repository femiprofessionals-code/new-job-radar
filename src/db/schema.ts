import {
  pgSchema,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * All platform tables live in a dedicated Postgres schema so migrations are
 * safe to run against a database that already contains other applications'
 * tables (e.g. a legacy `public.jobs`). Nothing outside this namespace is
 * ever touched.
 */
export const jobradar = pgSchema("jobradar");

/* ────────────────────────── Enums ────────────────────────── */

export const userRole = jobradar.enum("user_role", ["candidate", "expert", "admin"]);

export const plan = jobradar.enum("plan", ["free", "pro", "accelerator", "elite"]);

export const applicationStage = jobradar.enum("application_stage", [
  "saved",
  "preparing",
  "reviewed",
  "applied",
  "assessment",
  "interview",
  "final_round",
  "offer",
  "rejected",
]);

export const documentType = jobradar.enum("document_type", [
  "resume",
  "cover_letter",
  "linkedin",
]);

export const serviceType = jobradar.enum("service_type", [
  "resume_review",
  "cover_letter_review",
  "linkedin_review",
  "mock_interview",
  "coaching",
  "salary_negotiation",
]);

export const expertCategory = jobradar.enum("expert_category", [
  "resume_expert",
  "ats_expert",
  "recruiter",
  "hiring_manager",
  "interview_coach",
  "career_coach",
  "executive_advisor",
]);

export const reviewStatus = jobradar.enum("review_status", [
  "available",
  "claimed",
  "in_progress",
  "delivered",
  "completed",
  "cancelled",
]);

export const interviewType = jobradar.enum("interview_type", [
  "phone_screen",
  "technical",
  "behavioral",
  "system_design",
  "onsite",
  "final",
]);

export const interviewStatus = jobradar.enum("interview_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const mockMode = jobradar.enum("mock_mode", ["ai", "human"]);

export const mockStatus = jobradar.enum("mock_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const actionStatus = jobradar.enum("action_status", [
  "pending",
  "done",
  "dismissed",
]);

export const priority = jobradar.enum("priority", ["critical", "high", "medium", "low"]);

export const competition = jobradar.enum("competition", ["low", "medium", "high"]);

export const txStatus = jobradar.enum("tx_status", [
  "pending",
  "succeeded",
  "refunded",
  "failed",
]);

/* ────────────────────────── Identity ────────────────────────── */

export const users = jobradar.table("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("candidate"),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = jobradar.table(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const candidateProfiles = jobradar.table("candidate_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  headline: text("headline"),
  location: text("location"),
  yearsExperience: integer("years_experience").notNull().default(0),
  targetRoles: jsonb("target_roles").$type<string[]>().notNull().default([]),
  targetSalaryMin: integer("target_salary_min"),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  summary: text("summary"),
  linkedinUrl: text("linkedin_url"),
  plan: plan("plan").notNull().default("free"),
  reviewCredits: integer("review_credits").notNull().default(0),
  weeklyApplicationGoal: integer("weekly_application_goal").notNull().default(10),
});

/* ────────────────────────── Opportunity Engine ────────────────────────── */

export const jobs = jobradar.table(
  "jobs",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    companyDomain: text("company_domain"),
    location: text("location").notNull(),
    remote: boolean("remote").notNull().default(false),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    description: text("description").notNull(),
    requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    seniority: text("seniority").notNull(),
    source: text("source").notNull().default("seed"),
    applicantEstimate: integer("applicant_estimate"),
    postedAt: timestamp("posted_at").notNull().defaultNow(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("jobs_posted_idx").on(t.postedAt)]
);

export const jobMatches = jobradar.table(
  "job_matches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    interviewProbability: integer("interview_probability").notNull(),
    matchScore: integer("match_score").notNull(),
    matchReasons: jsonb("match_reasons").$type<string[]>().notNull().default([]),
    strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
    gaps: jsonb("gaps").$type<string[]>().notNull().default([]),
    priority: priority("priority").notNull().default("medium"),
    competition: competition("competition").notNull().default("medium"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("job_matches_user_job_idx").on(t.userId, t.jobId)]
);

/* ────────────────────────── Application Engine ────────────────────────── */

export const documents = jobradar.table("documents", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: documentType("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  baseDocumentId: text("base_document_id"),
  jobId: text("job_id").references(() => jobs.id),
  atsScore: integer("ats_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const applications = jobradar.table(
  "applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id),
    stage: applicationStage("stage").notNull().default("saved"),
    resumeDocumentId: text("resume_document_id").references(() => documents.id),
    coverLetterDocumentId: text("cover_letter_document_id").references(
      () => documents.id
    ),
    notes: text("notes"),
    appliedAt: timestamp("applied_at"),
    nextActionAt: timestamp("next_action_at"),
    nextActionLabel: text("next_action_label"),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("applications_user_job_idx").on(t.userId, t.jobId),
    index("applications_stage_idx").on(t.stage),
  ]
);

export const applicationEvents = jobradar.table("application_events", {
  id: text("id").primaryKey(),
  applicationId: text("application_id")
    .notNull()
    .references(() => applications.id),
  type: text("type").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ────────────────────────── Expert Marketplace ────────────────────────── */

export const experts = jobradar.table("experts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  headline: text("headline").notNull(),
  bio: text("bio").notNull(),
  categories: jsonb("categories").$type<string[]>().notNull().default([]),
  industries: jsonb("industries").$type<string[]>().notNull().default([]),
  specializations: jsonb("specializations").$type<string[]>().notNull().default([]),
  verified: boolean("verified").notNull().default(false),
  yearsExperience: integer("years_experience").notNull().default(0),
  rating: real("rating").notNull().default(0),
  reviewsCount: integer("reviews_count").notNull().default(0),
  servicesCompleted: integer("services_completed").notNull().default(0),
  interviewSuccessRate: integer("interview_success_rate"),
  avgResponseMinutes: integer("avg_response_minutes").notNull().default(240),
  availableNow: boolean("available_now").notNull().default(true),
  stripeConnectAccountId: text("stripe_connect_account_id"),
});

export const expertServices = jobradar.table("expert_services", {
  id: text("id").primaryKey(),
  expertId: text("expert_id")
    .notNull()
    .references(() => experts.id),
  type: serviceType("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  turnaroundHours: integer("turnaround_hours").notNull().default(48),
  active: boolean("active").notNull().default(true),
});

/* Review queue — experts never see documents before an atomic claim. */
export const reviewRequests = jobradar.table(
  "review_requests",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => users.id),
    serviceType: serviceType("service_type").notNull(),
    documentId: text("document_id").references(() => documents.id),
    applicationId: text("application_id").references(() => applications.id),
    targetExpertId: text("target_expert_id").references(() => experts.id),
    status: reviewStatus("status").notNull().default("available"),
    claimedBy: text("claimed_by").references(() => experts.id),
    claimedAt: timestamp("claimed_at"),
    lockExpiresAt: timestamp("lock_expires_at"),
    priceCents: integer("price_cents").notNull(),
    instructions: text("instructions"),
    deliveredAt: timestamp("delivered_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("review_requests_status_idx").on(t.status)]
);

export const reviewFeedback = jobradar.table("review_feedback", {
  id: text("id").primaryKey(),
  reviewRequestId: text("review_request_id")
    .notNull()
    .unique()
    .references(() => reviewRequests.id),
  expertId: text("expert_id")
    .notNull()
    .references(() => experts.id),
  summary: text("summary").notNull(),
  scorecard: jsonb("scorecard")
    .$type<{ dimension: string; score: number; note: string }[]>()
    .notNull()
    .default([]),
  suggestions: jsonb("suggestions").$type<string[]>().notNull().default([]),
  candidateRating: integer("candidate_rating"),
  candidateComment: text("candidate_comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ────────────────────────── Interview Engine ────────────────────────── */

export const interviews = jobradar.table("interviews", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  applicationId: text("application_id").references(() => applications.id),
  type: interviewType("type").notNull(),
  status: interviewStatus("status").notNull().default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  interviewer: text("interviewer"),
  notes: text("notes"),
  outcome: text("outcome"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mockSessions = jobradar.table("mock_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  mode: mockMode("mode").notNull().default("ai"),
  expertId: text("expert_id").references(() => experts.id),
  focus: text("focus").notNull(),
  targetCompany: text("target_company"),
  targetRole: text("target_role"),
  status: mockStatus("status").notNull().default("in_progress"),
  score: integer("score"),
  scorecard: jsonb("scorecard")
    .$type<{ dimension: string; score: number; note: string }[]>()
    .notNull()
    .default([]),
  transcript: jsonb("transcript")
    .$type<{ role: "interviewer" | "candidate"; content: string; at: string }[]>()
    .notNull()
    .default([]),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const interviewKits = jobradar.table("interview_kits", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  overview: text("overview").notNull(),
  stages: jsonb("stages")
    .$type<{ name: string; description: string; tips: string[] }[]>()
    .notNull()
    .default([]),
  questions: jsonb("questions")
    .$type<{ category: string; question: string; guidance: string }[]>()
    .notNull()
    .default([]),
  values: jsonb("values").$type<string[]>().notNull().default([]),
});

/* ────────────────────────── Career Health & Copilot ────────────────────────── */

export const healthSnapshots = jobradar.table(
  "health_snapshots",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    score: integer("score").notNull(),
    breakdown: jsonb("breakdown")
      .$type<{ dimension: string; score: number; weight: number; insight: string }[]>()
      .notNull()
      .default([]),
    interviewProbability: integer("interview_probability").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("health_user_created_idx").on(t.userId, t.createdAt)]
);

export const copilotActions = jobradar.table("copilot_actions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  impact: text("impact").notNull(),
  href: text("href"),
  priority: priority("priority").notNull().default("medium"),
  status: actionStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const copilotMessages = jobradar.table("copilot_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull(), // "user" | "copilot"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ────────────────────────── Billing ────────────────────────── */

export const subscriptions = jobradar.table("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  plan: plan("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
});

export const transactions = jobradar.table("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expertId: text("expert_id").references(() => experts.id),
  reviewRequestId: text("review_request_id").references(() => reviewRequests.id),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull().default(0),
  status: txStatus("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = jobradar.table("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ────────────────────────── Types ────────────────────────── */

export type User = typeof users.$inferSelect;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobMatch = typeof jobMatches.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Expert = typeof experts.$inferSelect;
export type ExpertService = typeof expertServices.$inferSelect;
export type ReviewRequest = typeof reviewRequests.$inferSelect;
export type ReviewFeedbackRow = typeof reviewFeedback.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type MockSession = typeof mockSessions.$inferSelect;
export type InterviewKit = typeof interviewKits.$inferSelect;
export type HealthSnapshot = typeof healthSnapshots.$inferSelect;
export type CopilotAction = typeof copilotActions.$inferSelect;
export type CopilotMessage = typeof copilotMessages.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export type ApplicationStage = (typeof applicationStage.enumValues)[number];
export type ServiceType = (typeof serviceType.enumValues)[number];
export type ReviewStatus = (typeof reviewStatus.enumValues)[number];
export type Plan = (typeof plan.enumValues)[number];
