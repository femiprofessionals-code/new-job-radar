CREATE SCHEMA "jobradar";
--> statement-breakpoint
CREATE TYPE "jobradar"."action_status" AS ENUM('pending', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "jobradar"."application_stage" AS ENUM('saved', 'preparing', 'reviewed', 'applied', 'assessment', 'interview', 'final_round', 'offer', 'rejected');--> statement-breakpoint
CREATE TYPE "jobradar"."competition" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "jobradar"."document_type" AS ENUM('resume', 'cover_letter', 'linkedin');--> statement-breakpoint
CREATE TYPE "jobradar"."expert_category" AS ENUM('resume_expert', 'ats_expert', 'recruiter', 'hiring_manager', 'interview_coach', 'career_coach', 'executive_advisor');--> statement-breakpoint
CREATE TYPE "jobradar"."interview_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "jobradar"."interview_type" AS ENUM('phone_screen', 'technical', 'behavioral', 'system_design', 'onsite', 'final');--> statement-breakpoint
CREATE TYPE "jobradar"."mock_mode" AS ENUM('ai', 'human');--> statement-breakpoint
CREATE TYPE "jobradar"."mock_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "jobradar"."plan" AS ENUM('free', 'pro', 'accelerator', 'elite');--> statement-breakpoint
CREATE TYPE "jobradar"."priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "jobradar"."review_status" AS ENUM('available', 'claimed', 'in_progress', 'delivered', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "jobradar"."service_type" AS ENUM('resume_review', 'cover_letter_review', 'linkedin_review', 'mock_interview', 'coaching', 'salary_negotiation');--> statement-breakpoint
CREATE TYPE "jobradar"."tx_status" AS ENUM('pending', 'succeeded', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "jobradar"."user_role" AS ENUM('candidate', 'expert', 'admin');--> statement-breakpoint
CREATE TABLE "jobradar"."application_events" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"type" text NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"stage" "jobradar"."application_stage" DEFAULT 'saved' NOT NULL,
	"resume_document_id" text,
	"cover_letter_document_id" text,
	"notes" text,
	"applied_at" timestamp,
	"next_action_at" timestamp,
	"next_action_label" text,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."candidate_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"headline" text,
	"location" text,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"target_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_salary_min" integer,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"linkedin_url" text,
	"plan" "jobradar"."plan" DEFAULT 'free' NOT NULL,
	"review_credits" integer DEFAULT 0 NOT NULL,
	"weekly_application_goal" integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."copilot_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"impact" text NOT NULL,
	"href" text,
	"priority" "jobradar"."priority" DEFAULT 'medium' NOT NULL,
	"status" "jobradar"."action_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "jobradar"."copilot_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "jobradar"."document_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"base_document_id" text,
	"job_id" text,
	"ats_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."expert_services" (
	"id" text PRIMARY KEY NOT NULL,
	"expert_id" text NOT NULL,
	"type" "jobradar"."service_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price_cents" integer NOT NULL,
	"turnaround_hours" integer DEFAULT 48 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."experts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"industries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specializations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"services_completed" integer DEFAULT 0 NOT NULL,
	"interview_success_rate" integer,
	"avg_response_minutes" integer DEFAULT 240 NOT NULL,
	"available_now" boolean DEFAULT true NOT NULL,
	"stripe_connect_account_id" text,
	CONSTRAINT "experts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "jobradar"."health_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interview_probability" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."interview_kits" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"overview" text NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"values" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."interviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text,
	"type" "jobradar"."interview_type" NOT NULL,
	"status" "jobradar"."interview_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 45 NOT NULL,
	"interviewer" text,
	"notes" text,
	"outcome" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."job_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"interview_probability" integer NOT NULL,
	"match_score" integer NOT NULL,
	"match_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" "jobradar"."priority" DEFAULT 'medium' NOT NULL,
	"competition" "jobradar"."competition" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"company_domain" text,
	"location" text NOT NULL,
	"remote" boolean DEFAULT false NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"description" text NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seniority" text NOT NULL,
	"source" text DEFAULT 'seed' NOT NULL,
	"applicant_estimate" integer,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."mock_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mode" "jobradar"."mock_mode" DEFAULT 'ai' NOT NULL,
	"expert_id" text,
	"focus" text NOT NULL,
	"target_company" text,
	"target_role" text,
	"status" "jobradar"."mock_status" DEFAULT 'in_progress' NOT NULL,
	"score" integer,
	"scorecard" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."review_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"review_request_id" text NOT NULL,
	"expert_id" text NOT NULL,
	"summary" text NOT NULL,
	"scorecard" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"candidate_rating" integer,
	"candidate_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_feedback_review_request_id_unique" UNIQUE("review_request_id")
);
--> statement-breakpoint
CREATE TABLE "jobradar"."review_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"service_type" "jobradar"."service_type" NOT NULL,
	"document_id" text,
	"application_id" text,
	"target_expert_id" text,
	"status" "jobradar"."review_status" DEFAULT 'available' NOT NULL,
	"claimed_by" text,
	"claimed_at" timestamp,
	"lock_expires_at" timestamp,
	"price_cents" integer NOT NULL,
	"instructions" text,
	"delivered_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan" "jobradar"."plan" DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "jobradar"."transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expert_id" text,
	"review_request_id" text,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"platform_fee_cents" integer DEFAULT 0 NOT NULL,
	"status" "jobradar"."tx_status" DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobradar"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "jobradar"."user_role" DEFAULT 'candidate' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "jobradar"."application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "jobradar"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobradar"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."applications" ADD CONSTRAINT "applications_resume_document_id_documents_id_fk" FOREIGN KEY ("resume_document_id") REFERENCES "jobradar"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."applications" ADD CONSTRAINT "applications_cover_letter_document_id_documents_id_fk" FOREIGN KEY ("cover_letter_document_id") REFERENCES "jobradar"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."copilot_actions" ADD CONSTRAINT "copilot_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."copilot_messages" ADD CONSTRAINT "copilot_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."documents" ADD CONSTRAINT "documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobradar"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."expert_services" ADD CONSTRAINT "expert_services_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "jobradar"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."experts" ADD CONSTRAINT "experts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."health_snapshots" ADD CONSTRAINT "health_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."interviews" ADD CONSTRAINT "interviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "jobradar"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."job_matches" ADD CONSTRAINT "job_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."job_matches" ADD CONSTRAINT "job_matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobradar"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."mock_sessions" ADD CONSTRAINT "mock_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."mock_sessions" ADD CONSTRAINT "mock_sessions_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "jobradar"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."review_feedback" ADD CONSTRAINT "review_feedback_review_request_id_review_requests_id_fk" FOREIGN KEY ("review_request_id") REFERENCES "jobradar"."review_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."review_feedback" ADD CONSTRAINT "review_feedback_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "jobradar"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."review_requests" ADD CONSTRAINT "review_requests_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."review_requests" ADD CONSTRAINT "review_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "jobradar"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."review_requests" ADD CONSTRAINT "review_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "jobradar"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."review_requests" ADD CONSTRAINT "review_requests_target_expert_id_experts_id_fk" FOREIGN KEY ("target_expert_id") REFERENCES "jobradar"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."review_requests" ADD CONSTRAINT "review_requests_claimed_by_experts_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "jobradar"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "jobradar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."transactions" ADD CONSTRAINT "transactions_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "jobradar"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobradar"."transactions" ADD CONSTRAINT "transactions_review_request_id_review_requests_id_fk" FOREIGN KEY ("review_request_id") REFERENCES "jobradar"."review_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_job_idx" ON "jobradar"."applications" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "applications_stage_idx" ON "jobradar"."applications" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "health_user_created_idx" ON "jobradar"."health_snapshots" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_matches_user_job_idx" ON "jobradar"."job_matches" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "jobs_posted_idx" ON "jobradar"."jobs" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "review_requests_status_idx" ON "jobradar"."review_requests" USING btree ("status");