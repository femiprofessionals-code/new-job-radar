import { TrendingUp } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getDashboard, getApplicationsBoard } from "@/lib/data";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  ScoreRing,
  Stat,
} from "@/components/ui/primitives";
import { FunnelChart, TrendChart } from "@/components/charts";
import { healthLabel } from "@/lib/engines/career-health";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const user = await getSessionUser();
  const [d, board] = await Promise.all([getDashboard(user.id), getApplicationsBoard(user.id)]);
  const hl = healthLabel(d.health.score);

  const funnel = [
    { label: "Applied", value: board.filter((b) => !["saved", "preparing", "reviewed"].includes(b.stage)).length },
    { label: "Response", value: board.filter((b) => ["assessment", "interview", "final_round", "offer"].includes(b.stage)).length },
    { label: "Interview", value: board.filter((b) => ["interview", "final_round", "offer"].includes(b.stage)).length },
    { label: "Final", value: board.filter((b) => ["final_round", "offer"].includes(b.stage)).length },
    { label: "Offer", value: board.filter((b) => b.stage === "offer").length },
  ];

  const trendData = [
    ...d.healthHistory.map((h) => ({
      label: h.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      health: h.score,
      probability: h.interviewProbability,
    })),
    { label: "Now", health: d.health.score, probability: d.interviewProbability },
  ];

  // Skill gap frequency across the candidate's top matches
  const gapCounts = new Map<string, number>();
  for (const o of d.topOpportunities) for (const g of o.gaps) gapCounts.set(g, (gapCounts.get(g) ?? 0) + 1);
  const allGaps = [...gapCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const interviewRate = funnel[0].value ? Math.round((funnel[2].value / funnel[0].value) * 100) : 0;
  const offerRate = funnel[2].value ? Math.round((funnel[4].value / funnel[2].value) * 100) : 0;
  const appliedApps = board.filter((b) => b.appliedAt);
  const interviewed = board.filter((b) => ["interview", "final_round", "offer"].includes(b.stage) && b.appliedAt);
  const avgDaysToInterview = interviewed.length
    ? Math.round(
        interviewed.reduce(
          (acc, b) => acc + Math.max(1, (b.lastActivityAt.getTime() - b.appliedAt!.getTime()) / 86_400_000),
          0
        ) / interviewed.length
      )
    : null;

  return (
    <div className="mx-auto flex max-w-6xl animate-fade-up flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Career Intelligence</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your search, measured like a funnel — because that&apos;s what it is.
        </p>
      </div>

      {/* Key rates */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <Stat label="Interviews Earned" value={d.interviewsEarned} tone="signal" sub="North star metric" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stat label="Interview Rate" value={`${interviewRate}%`} sub="applied → interview" tone={interviewRate >= 15 ? "signal" : "warn"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stat label="Response Rate" value={`${d.responseRate}%`} sub="healthy band: 15–20%" tone={d.responseRate >= 15 ? "signal" : "warn"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stat label="Offer Rate" value={`${offerRate}%`} sub="interview → offer" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stat
              label="Time to Interview"
              value={avgDaysToInterview != null ? `${avgDaysToInterview}d` : "—"}
              sub="avg, applied → interview"
              tone="info"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Application Funnel</CardTitle>
            <Badge tone="neutral">{appliedApps.length} applications</Badge>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnel} />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
              Every stage drop-off is a fixable problem: low response → materials & targeting; low
              interview→final → interview practice; low final→offer → closing & negotiation (book an
              expert).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Probability & Health Trend</CardTitle>
            <Badge tone="info">
              <TrendingUp size={11} /> 8 weeks
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} dataKey="probability" secondaryKey="health" height={220} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Health deep dive */}
        <Card>
          <CardHeader>
            <CardTitle>Career Health — Full Breakdown</CardTitle>
            <Badge tone={hl.tone}>
              {d.health.score}/100 · {hl.label}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <div className="flex justify-center">
              <ScoreRing value={d.health.score} size={110} />
            </div>
            <div className="flex-1 space-y-3">
              {d.health.breakdown.map((b) => (
                <div key={b.dimension}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">
                      {b.dimension}{" "}
                      <span className="text-[10px] text-ink-faint">×{Math.round(b.weight * 100)}%</span>
                    </span>
                    <span className="tabular text-ink-muted">{b.score}</span>
                  </div>
                  <Progress value={b.score} tone={b.score >= 70 ? "signal" : b.score >= 45 ? "warn" : "danger"} />
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{b.insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skill gaps */}
        <Card>
          <CardHeader>
            <CardTitle>Recurring Skill Gaps in Your Market</CardTitle>
          </CardHeader>
          <CardContent>
            {allGaps.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-faint">
                No recurring gaps across your top matches — your skill set maps tightly to your market.
              </p>
            ) : (
              <div className="space-y-3">
                {allGaps.map(([gap, count]) => (
                  <div key={gap}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="font-medium text-ink">{gap}</span>
                      <span className="text-ink-muted">
                        in {count} of your top {d.topOpportunities.length} matches
                      </span>
                    </div>
                    <Progress value={(count / Math.max(1, d.topOpportunities.length)) * 100} tone="warn" />
                  </div>
                ))}
                <p className="pt-1 text-[11px] leading-relaxed text-ink-faint">
                  Closing your top recurring gap typically expands your high-probability opportunity band
                  by 15–25%. Add adjacent experience to your resume narrative, or build a small proof
                  project.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
