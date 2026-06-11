import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDashboard } from "@/lib/data";
import { resolveCopilotAction } from "@/app/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CompanyMark,
  Progress,
  ScoreRing,
  Stat,
} from "@/components/ui/primitives";
import { TrendChart } from "@/components/charts";
import { healthLabel } from "@/lib/engines/career-health";
import { timeAgo } from "@/lib/utils";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user.role === "expert") redirect("/experts/queue");
  const d = await getDashboard(user.id);
  const hl = healthLabel(d.health.score);
  const heroAction = d.actions[0];

  const trendData = [
    ...d.healthHistory.map((h) => ({
      label: h.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      health: h.score,
      probability: h.interviewProbability,
    })),
    { label: "Now", health: d.health.score, probability: d.interviewProbability },
  ];

  const firstName = user.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto flex max-w-6xl animate-fade-up flex-col gap-5">
      {/* Header + hero action */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Mission control — everything here optimizes one thing:{" "}
            <span className="text-signal">getting you to interviews faster</span>.
          </p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <Stat label="Interviews Earned" value={d.interviewsEarned} tone="signal" sub="North star" />
          <div className="h-10 w-px bg-edge" />
          <Stat label="Offers" value={d.offers} />
        </div>
      </div>

      {heroAction && (
        <Card className="border-signal/25 bg-gradient-to-r from-signal-soft to-transparent">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-soft">
              <Sparkles size={18} className="text-signal" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-signal">
                Copilot · Recommended next action
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{heroAction.title}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{heroAction.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="signal">{heroAction.impact}</Badge>
              <Link href={heroAction.href ?? "/copilot"}>
                <Button size="sm">
                  Do it now <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <Stat
              label="Applications this week"
              value={`${d.applicationsThisWeek}/${d.profile.weeklyApplicationGoal}`}
              sub={
                d.applicationsThisWeek >= d.profile.weeklyApplicationGoal
                  ? "Goal hit — volume compounds"
                  : `${d.profile.weeklyApplicationGoal - d.applicationsThisWeek} to weekly goal`
              }
            />
            <Progress
              className="mt-3"
              value={(d.applicationsThisWeek / d.profile.weeklyApplicationGoal) * 100}
              tone={d.applicationsThisWeek >= d.profile.weeklyApplicationGoal ? "signal" : "warn"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stat
              label="Response rate"
              value={`${d.responseRate}%`}
              tone={d.responseRate >= 15 ? "signal" : "warn"}
              sub={d.responseRate >= 15 ? "Above the 15% healthy bar" : "Healthy band is 15–20%"}
            />
            <Progress className="mt-3" value={d.responseRate} tone={d.responseRate >= 15 ? "signal" : "warn"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stat
              label="Interview probability"
              value={`${d.interviewProbability}%`}
              tone="info"
              sub="Avg of your top 3 open matches"
            />
            <Progress className="mt-3" value={d.interviewProbability} tone="info" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stat
              label="Overdue follow-ups"
              value={d.overdueFollowUps}
              tone={d.overdueFollowUps > 0 ? "danger" : "signal"}
              sub={d.overdueFollowUps > 0 ? "Clearing these lifts replies ~30%" : "Fully caught up"}
            />
            <Progress className="mt-3" value={d.overdueFollowUps > 0 ? 100 : 0} tone="danger" />
          </CardContent>
        </Card>
      </div>

      {/* Health + trend + interviews */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Career Health Score</CardTitle>
            <Badge tone={hl.tone}>{hl.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ScoreRing value={d.health.score} label="/ 100" size={104} />
              <div className="flex-1 space-y-2">
                {d.health.breakdown.slice(0, 4).map((b) => (
                  <div key={b.dimension}>
                    <div className="mb-0.5 flex justify-between text-[11px]">
                      <span className="text-ink-muted">{b.dimension}</span>
                      <span className="tabular text-ink">{b.score}</span>
                    </div>
                    <Progress value={b.score} tone={b.score >= 70 ? "signal" : b.score >= 45 ? "warn" : "danger"} />
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/insights"
              className="mt-3 inline-flex items-center gap-1 text-xs text-signal hover:underline"
            >
              Full breakdown & insights <ArrowUpRight size={12} />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interview Probability Trend</CardTitle>
            <Badge tone="info">8 weeks</Badge>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} dataKey="probability" secondaryKey="health" height={170} />
            <p className="mt-1 text-[11px] text-ink-faint">
              <span className="text-signal">●</span> Interview probability ·{" "}
              <span className="text-info">●</span> Career health
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Interviews</CardTitle>
            <Link href="/interviews" className="text-xs text-signal hover:underline">
              Prep hub
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.upcomingInterviews.length === 0 && (
              <p className="py-6 text-center text-xs text-ink-faint">
                No interviews scheduled yet — your pipeline below is how we change that.
              </p>
            )}
            {d.upcomingInterviews.slice(0, 3).map((iv) => (
              <Link
                key={iv.id}
                href="/interviews"
                className="flex items-center gap-3 rounded-lg border border-edge bg-surface-2 p-2.5 transition-colors hover:border-edge-strong"
              >
                {iv.job ? <CompanyMark company={iv.job.company} size={32} /> : <Calendar size={20} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">
                    {iv.job ? `${iv.job.company} — ${iv.job.title}` : "Interview"}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {iv.type.replace("_", " ")} ·{" "}
                    {iv.scheduledAt.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <ArrowRight size={14} className="shrink-0 text-ink-faint" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Action queue + top opportunities */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Action Queue</CardTitle>
            <Badge tone="neutral">{d.actions.length} pending</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.actions.length === 0 && (
              <p className="py-6 text-center text-xs text-ink-faint">
                Queue clear. Ask the Copilot what to do next.
              </p>
            )}
            {d.actions.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-edge bg-surface-2 p-3">
                <Badge
                  tone={a.priority === "critical" ? "danger" : a.priority === "high" ? "warn" : "info"}
                  className="mt-0.5 shrink-0"
                >
                  {a.priority}
                </Badge>
                <div className="min-w-0 flex-1">
                  <Link href={a.href ?? "/copilot"} className="text-xs font-medium text-ink hover:text-signal">
                    {a.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">{a.description}</p>
                  <p className="mt-1 text-[11px] font-medium text-signal">{a.impact}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <form action={resolveCopilotAction.bind(null, a.id, "done")}>
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-signal-soft hover:text-signal"
                      title="Mark done"
                    >
                      <Check size={13} />
                    </button>
                  </form>
                  <form action={resolveCopilotAction.bind(null, a.id, "dismissed")}>
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger"
                      title="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Target size={14} className="text-signal" /> Highest-Probability Opportunities
            </CardTitle>
            <Link href="/opportunities" className="text-xs text-signal hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.topOpportunities.map((o) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.jobId}`}
                className="flex items-center gap-3 rounded-lg border border-edge bg-surface-2 p-2.5 transition-colors hover:border-signal/30"
              >
                <CompanyMark company={o.job.company} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{o.job.title}</p>
                  <p className="truncate text-[11px] text-ink-muted">
                    {o.job.company} · {o.job.location} · {timeAgo(o.job.postedAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-bold text-signal">{o.interviewProbability}%</p>
                  <p className="text-[10px] text-ink-faint">interview prob.</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Expert feedback */}
      {d.latestFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Expert Feedback</CardTitle>
            <Link href="/experts" className="text-xs text-signal hover:underline">
              All reviews
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex-1">
                <p className="text-xs text-ink-muted">
                  <span className="font-medium text-ink">{d.latestFeedback.expertName}</span> ·{" "}
                  {d.latestFeedback.serviceType.replace(/_/g, " ")} · {timeAgo(d.latestFeedback.createdAt)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink">“{d.latestFeedback.summary}”</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5 md:w-64">
                {d.latestFeedback.scorecard.map((s) => (
                  <div key={s.dimension} className="flex items-center gap-2">
                    <span className="w-36 truncate text-[11px] text-ink-muted">{s.dimension}</span>
                    <Progress value={s.score * 10} tone={s.score >= 7 ? "signal" : "warn"} className="flex-1" />
                    <span className="tabular w-7 text-right text-[11px] text-ink">{s.score}/10</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
