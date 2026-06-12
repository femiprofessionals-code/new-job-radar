# How Job Radar Was Built (with Claude) — and How It Was Launched

A step-by-step record of building a production SaaS — an AI + human career
acceleration platform — from an empty repository to a live, deployed product,
in a continuous collaboration between a founder and Claude (Anthropic's AI,
running in Claude Code). Total cash spent on infrastructure: **$0/month**
(every service on a free tier).

---

## Phase 0 — The brief

It started with a product vision, not a technical spec. The founder wrote a
mission-level prompt:

> "Job Radar is not a job board. It's an AI and Human Career Acceleration
> Platform that systematically increases a candidate's probability of getting
> interviews. Every feature must optimize one outcome: GETTING USERS TO
> INTERVIEWS FASTER."

It defined a north-star metric (Interviews Earned), six product pillars
(Career Copilot, Opportunity Engine, Application Engine, Expert Marketplace,
Interview Engine, Career Intelligence), a navigation structure, subscription
tiers, and design inspiration (Linear, Stripe Dashboard, Notion).

**Lesson:** the more your prompt reads like a real product brief — metrics,
philosophy, constraints — the better the system you get back. Claude then
asked four clarifying questions before writing any code (scope, API keys,
data source, branding) and the answers shaped every decision after.

## Phase 1 — Foundation (scaffold, design system, database)

1. **Scaffold:** `create-next-app` → Next.js 16 (App Router, Turbopack),
   TypeScript, Tailwind CSS 4.
2. **Design system:** a custom dark-first token set in `globals.css` —
   near-black canvas, a single "radar green" signal color, semantic tones,
   tabular numerals, subtle grid texture. All components hand-built
   (shadcn-style primitives) instead of pulling a UI kit.
3. **Database schema first:** 20 Drizzle ORM tables covering every pillar —
   users, profiles, jobs, scored matches, a 9-stage application pipeline,
   documents, experts, services, an atomic review queue, interviews, mock
   sessions, health snapshots, copilot actions, subscriptions, transactions,
   notifications.
4. **The demo-mode trick:** instead of requiring Postgres on day one, the app
   booted an **embedded PostgreSQL (PGlite)** — real SQL, real migrations,
   real transactions, zero setup. The same Drizzle schema and queries would
   later run unchanged against Supabase. *Demo vs production became a config
   switch, not a rewrite.*
5. **Deterministic seed:** a generated demo world (60 jobs, 12 experts, a
   mid-search candidate with a live pipeline) so every screen demoed with
   realistic data instantly.

## Phase 2 — The intelligence layer

Rule-based engines first, AI second — so the product worked without any API
key and could be upgraded later without refactoring:

- **Scoring engine** — Interview Probability per candidate/job pair from
  skill overlap, seniority fit, title alignment, posting freshness, and
  competition, with explainable reasons/strengths/gaps.
- **Career Health engine** — a 0–100 score from seven weighted dimensions,
  each with an actionable insight.
- **Copilot engine** — answers "what should I do next?" from the user's live
  pipeline data.
- **Mock interview engine** — question banks, follow-up logic, and a scored
  scorecard.
- **AI provider seam** — one `generate()` function: Claude if
  `ANTHROPIC_API_KEY` exists, any OpenAI-compatible API (Gemini/Groq free
  tiers) if `OPENAI_API_KEY` + `OPENAI_BASE_URL` exist, built-in generation
  otherwise. Later hardened so **a failing AI provider falls back instead of
  crashing the feature**.

## Phase 3 — The product surfaces

All seven sections in one pass: mission-control dashboard, Opportunities
(scored list + deep analysis pages), Applications (kanban + tailored
resume/cover letter generation + ATS reports), Experts (marketplace, profiles,
review requests), the expert-side Review Queue, Interviews (AI mocks, company
kits, readiness score), Insights (funnel analytics), Settings.

**The hardest backend piece** — the marketplace's atomic claim — was a single
conditional SQL `UPDATE … WHERE status = 'available' AND claimed_by IS NULL
RETURNING id`. Two experts racing for the same review: exactly one wins,
guaranteed by the database. Proven with a race test before shipping. Candidate
documents are only joined into queue queries for the claim holder.

**Testing as we went:** every phase ended with verification — `next build`
green, ESLint clean, browser automation (Playwright) clicking through real
flows, and screenshots reviewed visually before each push.

## Phase 4 — Launch to Vercel + Supabase

1. **GitHub:** pushed to `main` (the repo's primary branch).
2. **Vercel:** imported the repo → deployed. Two serverless gotchas were fixed
   the moment they appeared: writable paths only under `/tmp`, and runtime
   files (migrations, WASM) explicitly traced into function bundles.
3. **Supabase:** all platform tables created inside an **isolated `jobradar`
   Postgres schema** — so migrations could never collide with tables that
   already existed in the project (a legacy scraper's `public.jobs`).
   Table creation was done by pasting generated SQL into Supabase's SQL
   Editor; `DATABASE_URL` (the Transaction-pooler string) connected the app.
4. **Environment variables** (Vercel → Settings → Environment Variables):
   `DATABASE_URL`, `CRON_SECRET` (a made-up password protecting the sync
   endpoint), AI keys, later `RESEND_API_KEY` + `APP_URL`. **Every variable
   upgrades one subsystem — Settings → Integrations shows Live/Off per key.**

## Phase 5 — Real users (auth)

Self-contained authentication, zero external dependencies:

- Email + password with **scrypt** hashing (Node's built-in crypto) and
  database-backed 30-day sessions.
- Role choice at signup: job seeker or career expert, each with its own
  onboarding.
- **Candidate onboarding lights up the radar:** the moment a profile is
  saved, every job on the platform is scored with that person's interview
  probability.
- Editing your profile in Settings rescores the entire radar.
- Later: forgot-password flow (one-time, single-use, 1-hour tokens; resets all
  sessions) with email delivery.

## Phase 6 — Real jobs (the pipeline)

Two complementary pipelines, both running on a daily Vercel Cron:

1. **Legacy scraper sync** — an importer that *introspects* an existing
   scraper's `public.jobs` table, auto-detects its column layout across common
   naming conventions, joins `companies` for names, normalizes salaries,
   extracts skills from descriptions, and upserts idempotently. A `dryRun=1`
   mode reports the detected mapping before changing anything.
2. **Native ingestion** — keyless fetchers for Greenhouse public boards,
   Lever postings, Remotive, and Arbeitnow. Normalization (HTML→text, salary
   parsing, seniority inference), stale-posting deactivation, and
   per-candidate scoring of every new job.

The first production run imported **8,700+ real jobs** — and its JSON report
revealed three real-world bugs (HTML-escaped descriptions, undetected location
columns, dead Lever boards) that were fixed the same hour, with
**self-repairing upserts** so the next run healed the data already in the
database.

**Lesson:** ship the pipeline with a dry-run mode and a detailed report.
Production data always surprises you; the report turns surprises into
15-minute fixes.

## Phase 7 — Graduation (removing demo mode)

Once real auth and real jobs existed, the scaffolding came out:

- Demo personas, the persona switcher, and demo login buttons — deleted.
- Production databases are never auto-seeded; the seeded sandbox lives on
  only for local development.
- A cleanup SQL purged the demo users/experts/jobs from production.
- Honest labels everywhere: integration badges read Live/Off, AI shows
  "Built-in intelligence" when no key is set.

## Phase 8 — Polish for the public

- **Landing page** at the root — hero ("Stop applying. Start interviewing."),
  the six engines, an experts-earn-here section, pricing, CTAs. Logged-in
  users skip it and land on `/dashboard`.
- **Password reset + transactional email** via Resend's free REST API (no
  SDK): reset links, welcome emails, "your review was delivered" emails.
- **UX fixes from real usage:** loading spinners on every slow action,
  dropdowns that close on outside click (and a follow-up fix when that broke
  form submission — closing a menu mid-click cancels the form inside it),
  clear guidance when a feature needs a prerequisite ("Add your master resume
  in Settings first →").

## The launch checklist (as executed)

1. Push to GitHub `main`
2. Vercel: import repo → add env vars → deploy
3. Supabase: run schema SQL in the SQL Editor (isolated `jobradar` schema)
4. Add `DATABASE_URL` → redeploy
5. Trigger `/api/sync/jobs` once → verify the JSON report → daily cron takes
   over
6. Run the demo-data cleanup SQL
7. Create your real account → onboard → the radar scores everything for you
8. (Optional, free) AI keys via Gemini/Groq; email via Resend

**Still simulated at time of writing:** payments. Plan switches and expert
payouts are recorded but no money moves — that's the Stripe + Stripe Connect
integration, the final step from product to business.

## What made the collaboration work

- **Brief like a founder, not a ticket.** Metrics and philosophy in the
  prompt produced coherent architecture, not just code.
- **Demo-mode-first.** The product was demo-able in hours and production
  paths were seams, not rewrites.
- **Verify everything.** Builds, lint, race tests, browser automation,
  screenshots — before every push.
- **Production output is the best bug report.** Real sync reports, real error
  screens, and real user clicks ("sign out didn't work") drove the last 20%.
- **One change, one deploy, one verification.** Small loops, fast feedback.
