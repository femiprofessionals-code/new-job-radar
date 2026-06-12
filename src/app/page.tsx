import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  FileText,
  KanbanSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { Badge, Button, Card, CardContent } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Job Radar — Stop applying. Start interviewing.",
  description:
    "The AI + human career acceleration platform. Every job scored with your personal interview probability. Tailored applications, expert reviews, and interview prep — one system built to get you hired faster.",
};

const PILLARS = [
  {
    icon: Target,
    title: "Opportunity Engine",
    body: "Thousands of real jobs, refreshed daily — each scored with your personal Interview Probability, strength analysis, skill gaps, and competition estimate. Apply where you actually compete.",
  },
  {
    icon: FileText,
    title: "Application Engine",
    body: "Tailored resumes and cover letters generated per role, ATS reports with keyword coverage and prioritized fixes, and a 9-stage pipeline that never lets a follow-up slip.",
  },
  {
    icon: Sparkles,
    title: "Career Copilot",
    body: "An AI career manager grounded in your live pipeline. It always answers one question: what should I do next to increase my chance of getting interviews?",
  },
  {
    icon: Users,
    title: "Expert Marketplace",
    body: "Verified recruiters, hiring managers, and coaches review your materials and run mock interviews — with escrowed payments and interview-success track records.",
  },
  {
    icon: Bot,
    title: "Interview Engine",
    body: "Scored AI mock interviews with dimension-level feedback, company-specific interview kits, and an Interview Readiness score that climbs with every rep.",
  },
  {
    icon: BarChart3,
    title: "Career Intelligence",
    body: "Your search measured like the funnel it is: interview rate, response rate, time-to-interview, Career Health score, and the skill gaps recurring across your market.",
  },
];

const PLANS = [
  { name: "Free", price: "$0", blurb: "Start scanning", features: ["Opportunity discovery & scoring", "Application tracking", "Basic AI assistance"], cta: "Start free", highlight: false },
  { name: "Pro", price: "$19/mo", blurb: "Apply at full speed", features: ["Unlimited AI resume & letter optimization", "Unlimited ATS reports", "Full-context Copilot"], cta: "Start with Pro", highlight: false },
  { name: "Accelerator", price: "$49/mo", blurb: "Humans + AI", features: ["Everything in Pro", "2 expert review credits / month", "AI mock interviews with scoring", "Company interview kits"], cta: "Accelerate", highlight: true },
  { name: "Elite", price: "$199/mo", blurb: "Managed career", features: ["Everything in Accelerator", "Dedicated career advisor", "Unlimited expert access"], cta: "Go Elite", highlight: false },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="bg-grid min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-edge bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-soft">
              <Radar size={16} className="text-signal" />
            </span>
            <span className="text-[15px] font-bold tracking-tight">
              Job<span className="text-signal">Radar</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center md:pt-28">
        <Badge tone="signal" className="mb-5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-signal rounded-full bg-signal" />
          Radar active · thousands of real jobs scored daily
        </Badge>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Stop applying.
          <br />
          <span className="text-signal">Start interviewing.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg">
          Job Radar is not a job board. It&apos;s a career acceleration system — AI and human
          experts working one metric: <span className="text-ink">your interview rate</span>. Every
          job scored against your profile. Every application tailored. Every interview rehearsed.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg">
              Activate your radar <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="secondary">
              I&apos;m a career expert — earn here
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          Free to start · no card required · your radar is live in 2 minutes
        </p>
      </section>

      {/* Proof strip */}
      <section className="border-y border-edge bg-surface/60">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-8 text-center md:grid-cols-4">
          {[
            { v: "8,000+", l: "real jobs on the radar" },
            { v: "Daily", l: "automatic radar refresh" },
            { v: "0–100", l: "Career Health score" },
            { v: "1 goal", l: "interviews earned" },
          ].map((s) => (
            <div key={s.l}>
              <p className="tabular text-2xl font-bold text-signal">{s.v}</p>
              <p className="mt-1 text-xs text-ink-muted">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
          Your career, run like a system
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: "1", t: "Light up your radar", b: "Tell us your skills, targets, and resume. Every job on the platform is instantly scored with your personal interview probability." },
            { n: "2", t: "Apply with unfair advantage", b: "Tailored resume and cover letter per role, ATS-checked, gap-aware. Follow-ups tracked so nothing slips." },
            { n: "3", t: "Convert interviews", b: "Company interview kits, scored AI mocks, and human experts who've sat on the other side of the table." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-xl border border-edge bg-surface p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-soft text-sm font-bold text-signal">
                {s.n}
              </span>
              <h3 className="mt-3 text-base font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="border-t border-edge bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            Six engines. One outcome.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ink-muted">
            Everything in Job Radar optimizes a single number: how many interviews you earn.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <Card key={p.title} className="transition-colors hover:border-signal/30">
                <CardContent className="p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-soft">
                    <p.icon size={17} className="text-signal" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{p.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Experts */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <Badge tone="violet" className="mb-3">
              For career experts
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Recruiters & coaches: get paid for your eye
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Resume reviews, mock interviews, coaching, and salary negotiation — claim work from a
              live queue, deliver structured feedback, keep 80% of every engagement.
            </p>
            <ul className="mt-4 space-y-2">
              {[
                "Atomic claim queue — work is locked to you, never double-assigned",
                "Candidate documents stay private until you claim",
                "Your interview-success rate becomes your storefront",
              ].map((f) => (
                <li key={f} className="flex gap-2 text-sm text-ink-muted">
                  <Check size={15} className="mt-0.5 shrink-0 text-signal" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-5 inline-block">
              <Button variant="secondary">
                Join as an expert <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
          <div className="rounded-xl border border-edge bg-surface p-6">
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <ShieldCheck size={14} className="text-signal" /> Review queue · live
            </div>
            {[
              { t: "Resume review · Senior Frontend", p: "$79" },
              { t: "Mock interview · System design", p: "$119" },
              { t: "Cover letter review · Product Manager", p: "$47" },
            ].map((r) => (
              <div
                key={r.t}
                className="mt-3 flex items-center justify-between rounded-lg border border-edge bg-surface-2 px-3 py-2.5"
              >
                <p className="text-xs text-ink">{r.t}</p>
                <p className="tabular text-xs font-bold text-signal">{r.p}</p>
              </div>
            ))}
            <p className="mt-3 text-right text-[11px] text-ink-faint">your payout (80%) shown</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-edge bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            Priced like a tool. Pays back like a raise.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "flex flex-col rounded-xl border p-5",
                  p.highlight ? "border-signal/50 bg-signal-soft" : "border-edge bg-surface"
                )}
              >
                {p.highlight && <Badge tone="signal" className="mb-2 self-start">Most popular</Badge>}
                <p className="text-sm font-bold">{p.name}</p>
                <p className="mt-1 text-2xl font-bold">{p.price}</p>
                <p className="text-xs text-ink-muted">{p.blurb}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-1.5 text-xs leading-snug text-ink-muted">
                      <Check size={13} className="mt-0.5 shrink-0 text-signal" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-5">
                  <Button variant={p.highlight ? "primary" : "secondary"} size="sm" className="w-full">
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <KanbanSquare size={28} className="mx-auto text-signal" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
          The next interview is the only metric that matters.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
          Two minutes to set up. Every job scored for you, forever after.
        </p>
        <Link href="/signup" className="mt-6 inline-block">
          <Button size="lg">
            Activate your radar <ArrowRight size={16} />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-ink-faint md:flex-row">
          <div className="flex items-center gap-2">
            <Radar size={13} className="text-signal" />
            <span>
              Job<span className="text-signal">Radar</span> — the career acceleration platform
            </span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/signup" className="hover:text-ink">Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
