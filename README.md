# Job Radar

**The AI + Human Career Acceleration Platform.** Not a job board — a system that
systematically increases a candidate's probability of getting interviews.

Every entity, engine, screen, and marketplace interaction in this codebase optimizes
one outcome: **getting users to interviews faster.**

- **North star:** Interviews Earned
- **Secondary metrics:** Interview Rate · Response Rate · Offer Rate · Time to Interview · Career Health Score · Expert Review Completion Rate

---

## Quick start (zero configuration)

```bash
npm install
npm run dev
```

Open http://localhost:3000. That's it.

Demo mode boots an **embedded PostgreSQL** (PGlite) at `.data/pglite`, runs real SQL
migrations, and seeds a complete world: a candidate mid-search (Alex Morgan), 60
scored opportunities, an 18-application pipeline, 12 marketplace experts, a live
review queue, interviews, mock sessions, and an 8-week career-health history.

Use the avatar menu (top right) to switch personas:

| Persona | View |
|---|---|
| **Alex Morgan** (candidate) | Mission control, opportunities, pipeline, copilot, interview prep |
| **Sarah Chen** (expert) | Review queue: claim → review → deliver → get paid |

## Product pillars

1. **Career Copilot** (`/copilot`) — an AI career manager grounded in the user's live
   pipeline. Always answers: *"What should I do next to increase my chance of getting
   interviews?"* Generates a prioritized action queue surfaced on Home.
2. **Opportunity Engine** (`/opportunities`) — every role is scored with **Interview
   Probability**, match explanation, strength/gap analysis, application priority, and a
   competition estimate (`src/lib/engines/scoring.ts`).
3. **Application Engine** (`/applications`) — 9-stage pipeline (Saved → … → Offer),
   tailored resume + cover letter generation, ATS optimization reports, follow-up
   discipline tracking.
4. **Career Expert Marketplace** (`/experts`) — verified recruiters, hiring managers,
   ATS specialists, and coaches with interview-success metrics, escrowed payments, and
   an 80/20 payout split.
5. **Interview Engine** (`/interviews`) — scored AI mock interviews with dimension-level
   scorecards, human mocks with experts, company-specific interview kits, and an
   Interview Readiness score.
6. **Career Intelligence** (`/insights`) — funnel analytics, probability/health trends,
   recurring skill-gap analysis across the user's market.

### Career Health Engine

A signature 0–100 score (`src/lib/engines/career-health.ts`) computed from seven
weighted dimensions — Resume Quality, Application Consistency, Market Alignment, Skill
Relevance, Follow-Up Discipline, Interview Performance, Expert Validation — each with
an actionable insight. Snapshotted weekly for trend analysis.

### Review queue — atomic claim system

Experts **never** see candidate documents before claiming. The claim is a single
`UPDATE … WHERE status = 'available' AND claimed_by IS NULL RETURNING id` — database-level
locking that makes duplicate assignment impossible (two racing claims: exactly one row
match wins). Claims carry a 24h lock expiry. Document content is only joined into
queue queries for the lock holder (`getExpertQueue` in `src/lib/data.ts`).

```
Available → Claim (atomic lock) → Document access → Review → Feedback → Delivered → Completed (payment released)
```

Verified by `scripts/test-claim.ts`.

## Architecture

| Layer | Technology | Demo mode | Production |
|---|---|---|---|
| Framework | Next.js 16 (App Router, RSC, server actions) + TypeScript | ✅ | Vercel |
| Styling | Tailwind CSS 4 + custom design system (`globals.css`) | ✅ | — |
| Database | Drizzle ORM + PostgreSQL | embedded PGlite | Supabase (`DATABASE_URL`) |
| AI | Provider layer (`src/lib/ai/provider.ts`) | deterministic synthesizer | Claude → OpenAI fallback |
| Payments | Stripe + Stripe Connect service seam | simulated escrow/payouts | live keys |
| Background jobs | Inngest seam | inline execution | event keys |
| Auth | Session module (`src/lib/session.ts`) | persona switcher | Supabase Auth |

**The demo/production switch is config, not code.** Every external service sits behind
a seam; setting an environment variable upgrades that subsystem (see `.env.example`
and Settings → Integrations, which shows live status per integration).

```
src/
├── app/                    # Routes: /, opportunities, applications, experts(+queue),
│   │                       #   interviews(+mock, +kits), copilot, insights, settings
│   └── actions.ts          # All mutations (server actions), incl. atomic claimReview
├── components/             # Design system primitives, charts, shell
├── db/
│   ├── schema.ts           # Full Drizzle schema — 20 tables across all pillars
│   ├── index.ts            # Driver switch: PGlite (demo) ⇄ Postgres (prod)
│   └── seed.ts             # Deterministic demo world generator
└── lib/
    ├── engines/            # scoring, career-health, copilot, documents, mock-interview
    ├── ai/provider.ts      # Claude / OpenAI / demo switch
    ├── data.ts             # Read layer for every page
    └── session.ts          # Demo personas → swap for Supabase Auth
```

## Subscriptions

| Plan | Price | Includes |
|---|---|---|
| Free | $0 | Opportunity discovery & scoring, basic AI |
| Pro | $19/mo | Unlimited AI optimization, ATS reports, full-context Copilot |
| Accelerator | $49/mo | + 2 expert review credits/mo, AI mocks, interview kits |
| Elite | $199/mo | + dedicated advisor, unlimited expert access, premium support |

Experts earn through resume/cover-letter/LinkedIn reviews, mock interviews, coaching,
and salary negotiation — Stripe Connect payouts at an 80/20 split.

## Going live

1. **Database (Supabase)** — set `DATABASE_URL` and run `npx drizzle-kit migrate`.
   All platform tables live in an isolated **`jobradar` Postgres schema**, so the
   migration is safe to run against a database that already contains other
   applications' tables (a legacy `public.jobs`, scrapers, etc.) — nothing outside
   the `jobradar` namespace is read or written.
2. **AI (Claude)** — set `ANTHROPIC_API_KEY`. Copilot chat, resume tailoring, cover
   letters, and mock interviews switch from the demo synthesizer to real model calls
   instantly. `OPENAI_API_KEY` enables the fallback provider.
3. **Stripe** — create products for Pro/Accelerator/Elite, set `STRIPE_SECRET_KEY` +
   webhook secret; replace the `changePlan` demo action with Checkout sessions (the
   subscription table is already Stripe-shaped: customer id, subscription id, period end).
4. **Stripe Connect** — set `STRIPE_CONNECT_CLIENT_ID`; onboard experts to Express
   accounts (`experts.stripe_connect_account_id` is ready), move `requestReview` escrow
   to PaymentIntents with `transfer_data` on acceptance.
5. **Inngest** — set event/signing keys and lift the inline work into functions:
   radar refresh (re-score matches), claim-lock expiry sweep, weekly health snapshots,
   notification digests.
6. **Auth (Supabase)** — replace `src/lib/session.ts` with Supabase Auth session
   lookup; the `users` table is the only integration point.
7. **Deploy** — push to Vercel. `next build` is green with zero config.

## Job pipeline (native ingestion)

The platform feeds itself — no external scraper required. `src/lib/ingest` pulls
from free, keyless public job APIs on the daily cron (`/api/sync/jobs`,
`vercel.json`):

- **Greenhouse boards** (`INGEST_GREENHOUSE_BOARDS`, comma-separated company slugs)
- **Lever postings** (`INGEST_LEVER_COMPANIES`)
- **Remotive** and **Arbeitnow** (no config)

Each run normalizes (HTML → text, salary parsing, skill extraction, seniority
inference), upserts (`gh-`/`lv-`/`rmtv-`/`arb-` ids), deactivates postings that
disappeared from their source, and scores new jobs for every candidate. Per-source
failures are reported, never fatal. Test: `npx tsx scripts/test-ingest.ts`.

## Legacy scraper sync (optional)

`src/lib/sync/legacy-jobs.ts` flows jobs from a scraper's `public.jobs` table into
`jobradar.jobs`, auto-detecting the column layout (title/company/salary/skills/url/…
across common naming conventions), joining `public.companies` for names when needed,
extracting skills from descriptions when absent, and scoring every new job for every
candidate. Idempotent upserts (`lg-<id>`) make it safe on a schedule.

- Manual: `npx tsx scripts/sync-jobs.ts --dry-run` (inspect mapping), then without the flag
- Deployed: `GET /api/sync/jobs` — runs daily via Vercel Cron (`vercel.json`),
  protected by `CRON_SECRET`
- Source DB: `LEGACY_DATABASE_URL` if the scraper writes to a different database,
  otherwise `DATABASE_URL`

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run lint         # eslint
npx tsx scripts/test-db.ts      # boot, migrate, seed, verify row counts
npx tsx scripts/test-claim.ts   # prove atomic claim under race
npx drizzle-kit generate        # regenerate SQL migrations after schema changes
```
