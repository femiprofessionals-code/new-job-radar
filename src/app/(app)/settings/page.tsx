import { Check, KeyRound, Sparkles } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { requireUser } from "@/lib/session";
import { changePlan } from "@/app/actions";
import { updateCandidateProfile, addMasterResume } from "@/app/auth-actions";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Textarea,
  CardHeader,
  CardTitle,
  Separator,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Plan } from "@/db/schema";

export const metadata = { title: "Settings" };

const PLANS: {
  id: Plan;
  name: string;
  price: string;
  blurb: string;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    blurb: "Start scanning",
    features: ["Opportunity discovery & scoring", "Basic AI assistance", "Application tracking"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19/mo",
    blurb: "Apply at full speed",
    features: ["Unlimited AI resume & letter optimization", "Unlimited ATS reports", "Copilot with full pipeline context", "Priority opportunity refresh"],
  },
  {
    id: "accelerator",
    name: "Accelerator",
    price: "$49/mo",
    blurb: "Humans + AI",
    features: ["Everything in Pro", "2 expert review credits / month", "AI mock interviews with scoring", "Company interview kits"],
  },
  {
    id: "elite",
    name: "Elite",
    price: "$199/mo",
    blurb: "Managed career",
    features: ["Everything in Accelerator", "Dedicated career advisor", "Unlimited expert access", "Premium support & negotiation help"],
  },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(tables.candidateProfiles)
    .where(eq(tables.candidateProfiles.userId, user.id));
  const resumes = await db
    .select({ id: tables.documents.id })
    .from(tables.documents)
    .where(and(eq(tables.documents.userId, user.id), eq(tables.documents.type, "resume")));
  const hasResume = resumes.length > 0;

  const integrations = [
    {
      name: "Database (Supabase / Postgres)",
      env: "DATABASE_URL",
      configured: !!process.env.DATABASE_URL,
      demo: "Embedded PGlite database (.data/pglite)",
    },
    {
      name: "Claude (Anthropic)",
      env: "ANTHROPIC_API_KEY",
      configured: !!process.env.ANTHROPIC_API_KEY,
      demo: "Deterministic demo intelligence",
    },
    {
      name: "OpenAI (fallback)",
      env: "OPENAI_API_KEY",
      configured: !!process.env.OPENAI_API_KEY,
      demo: "Deterministic demo intelligence",
    },
    {
      name: "Stripe (subscriptions)",
      env: "STRIPE_SECRET_KEY",
      configured: !!process.env.STRIPE_SECRET_KEY,
      demo: "Simulated billing — plan switches apply instantly",
    },
    {
      name: "Stripe Connect (expert payouts)",
      env: "STRIPE_CONNECT_CLIENT_ID",
      configured: !!process.env.STRIPE_CONNECT_CLIENT_ID,
      demo: "Simulated escrow & 80/20 payout split",
    },
    {
      name: "Inngest (background jobs)",
      env: "INNGEST_EVENT_KEY",
      configured: !!process.env.INNGEST_EVENT_KEY,
      demo: "Jobs run inline (synchronously)",
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl animate-fade-up flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Profile, plan, and platform integrations.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <Badge tone={user.role === "expert" ? "violet" : "signal"} className="capitalize">
            {user.role}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={user.name} size={56} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="text-xs text-ink-muted">{user.email}</p>
            {profile && (
              <>
                <p className="mt-1 text-xs text-ink-muted">{profile.headline}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(profile.skills as string[]).map((s) => (
                    <Badge key={s} tone="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
          {profile && (
            <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-right">
              <div>
                <p className="text-ink-faint">Experience</p>
                <p className="font-semibold text-ink">{profile.yearsExperience} years</p>
              </div>
              <div>
                <p className="text-ink-faint">Weekly goal</p>
                <p className="font-semibold text-ink">{profile.weeklyApplicationGoal} apps</p>
              </div>
              <div>
                <p className="text-ink-faint">Target comp</p>
                <p className="font-semibold text-ink">
                  {profile.targetSalaryMin ? `$${Math.round(profile.targetSalaryMin / 1000)}k+` : "—"}
                </p>
              </div>
              <div>
                <p className="text-ink-faint">Review credits</p>
                <p className="font-semibold text-signal">{profile.reviewCredits}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit profile (real candidate accounts) */}
      {profile && !user.isDemo && (
        <Card>
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <p className="text-[11px] text-ink-faint">Saving rescores every opportunity on your radar</p>
          </CardHeader>
          <CardContent>
            <form action={updateCandidateProfile} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Headline</label>
                  <Input name="headline" defaultValue={profile.headline ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Location</label>
                  <Input name="location" defaultValue={profile.location ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Years of experience</label>
                  <Input name="yearsExperience" type="number" min={0} max={50} defaultValue={profile.yearsExperience} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Weekly application goal</label>
                  <Input name="weeklyGoal" type="number" min={1} max={50} defaultValue={profile.weeklyApplicationGoal} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Skills (comma-separated)</label>
                <Textarea name="skills" rows={2} defaultValue={(profile.skills as string[]).join(", ")} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Target roles (comma-separated)</label>
                <Input name="targetRoles" defaultValue={(profile.targetRoles as string[]).join(", ")} />
              </div>
              <Button type="submit" size="sm">Save & rescore radar</Button>
            </form>

            {!hasResume && (
              <form action={addMasterResume} className="mt-5 border-t border-edge pt-4">
                <p className="text-xs font-semibold text-warn">
                  No master resume yet — tailoring and ATS scoring are blocked until you add one.
                </p>
                <Textarea name="resume" rows={6} required className="mt-2" placeholder="Paste the full text of your resume…" />
                <Button type="submit" size="sm" className="mt-2">Save master resume</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <p className="text-[11px] text-ink-faint">Demo mode: switching is instant, no payment</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => {
                const active = profile.plan === p.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex flex-col rounded-xl border p-4",
                      active ? "border-signal/50 bg-signal-soft" : "border-edge bg-surface-2"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-ink">{p.name}</p>
                      {active && <Badge tone="signal">Current</Badge>}
                    </div>
                    <p className="mt-1 text-lg font-bold text-ink">{p.price}</p>
                    <p className="text-[11px] text-ink-muted">{p.blurb}</p>
                    <ul className="mt-3 flex-1 space-y-1.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-1.5 text-[11px] leading-snug text-ink-muted">
                          <Check size={12} className="mt-0.5 shrink-0 text-signal" /> {f}
                        </li>
                      ))}
                    </ul>
                    {!active && (
                      <form action={changePlan.bind(null, p.id)} className="mt-3">
                        <Button
                          type="submit"
                          size="sm"
                          variant={p.id === "elite" || p.id === "accelerator" ? "primary" : "secondary"}
                          className="w-full"
                        >
                          Switch to {p.name}
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <KeyRound size={14} className="text-warn" /> Integrations — going live
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs leading-relaxed text-ink-muted">
            Job Radar runs fully in demo mode with zero external services. Each integration upgrades a
            subsystem the moment its environment variable is set — no code changes. Add keys to{" "}
            <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px]">.env.local</code>{" "}
            (or your Vercel project settings) and restart.
          </p>
          <Separator className="my-3" />
          <div className="space-y-2">
            {integrations.map((i) => (
              <div
                key={i.env}
                className="flex flex-col gap-1 rounded-lg border border-edge bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-medium text-ink">{i.name}</p>
                  <p className="font-mono text-[11px] text-ink-faint">{i.env}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!i.configured && <p className="text-[11px] text-ink-faint">{i.demo}</p>}
                  <Badge tone={i.configured ? "signal" : "warn"}>
                    {i.configured ? "Live" : "Demo"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-signal" />
            Full go-live walkthrough (Supabase migration, Stripe products, Connect onboarding, Inngest
            functions, Vercel deploy) is in the repository README under “Going live”.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
