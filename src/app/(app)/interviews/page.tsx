import Link from "next/link";
import { BookOpen, Bot, Calendar, Play, UserRound } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getInterviewHub } from "@/lib/data";
import { startMockForm } from "@/app/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CompanyMark,
  Input,
  ScoreRing,
  Select,
} from "@/components/ui/primitives";
import { FOCUS_AREAS } from "@/lib/engines/mock-interview";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Interviews" };

export default async function InterviewsPage() {
  const user = await requireUser();
  const hub = await getInterviewHub(user.id);
  const upcoming = hub.interviews.filter(
    (i) => i.status === "scheduled" && i.scheduledAt >= new Date()
  );
  const completedMocks = hub.mocks.filter((m) => m.status === "completed");

  return (
    <div className="mx-auto flex max-w-6xl animate-fade-up flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Interview Engine</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Interviews are where the pipeline converts. Practice like it&apos;s real.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-2">
          <ScoreRing value={hub.readiness} size={56} stroke={5} />
          <div>
            <p className="text-xs font-semibold text-ink">Interview Readiness</p>
            <p className="text-[11px] text-ink-muted">
              {completedMocks.length} mock{completedMocks.length === 1 ? "" : "s"} completed — each rep
              raises this
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming + kits */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Calendar size={14} className="text-info" /> Upcoming Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 && (
                <p className="py-6 text-center text-xs text-ink-faint">
                  Nothing scheduled — keep the application volume up.
                </p>
              )}
              {upcoming.map((iv) => (
                <div key={iv.id} className="rounded-lg border border-edge bg-surface-2 p-3">
                  <div className="flex items-center gap-2.5">
                    {iv.job && <CompanyMark company={iv.job.company} size={30} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">
                        {iv.job ? `${iv.job.company} — ${iv.job.title}` : "Interview"}
                      </p>
                      <p className="text-[11px] capitalize text-ink-muted">
                        {iv.type.replace("_", " ")} · {iv.durationMinutes} min
                        {iv.interviewer && ` · ${iv.interviewer}`}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-info">
                    {iv.scheduledAt.toLocaleString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-violet" /> Company Interview Kits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hub.kits.map((k) => (
                <Link
                  key={k.id}
                  href={`/interviews/kits/${k.id}`}
                  className="flex items-center gap-3 rounded-lg border border-edge bg-surface-2 p-2.5 transition-colors hover:border-violet/40"
                >
                  <CompanyMark company={k.company} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink">{k.company}</p>
                    <p className="truncate text-[11px] text-ink-muted">{k.role}</p>
                  </div>
                  <Badge tone="violet">{k.questions.length} questions</Badge>
                </Link>
              ))}
              {hub.kits.length === 0 && (
                <p className="py-4 text-center text-xs text-ink-faint">
                  Kits generate automatically when applications reach the interview stage.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mock interviews */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="border-signal/25">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Bot size={14} className="text-signal" /> Start an AI Mock Interview
              </CardTitle>
              <Badge tone="signal">Scored + scorecard</Badge>
            </CardHeader>
            <CardContent>
              <form action={startMockForm} className="flex flex-col gap-2 sm:flex-row">
                <Select name="focus" className="flex-1" defaultValue="behavioral">
                  {FOCUS_AREAS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} — {f.description}
                    </option>
                  ))}
                </Select>
                <Input
                  name="targetCompany"
                  placeholder="Target company (optional)"
                  className="sm:w-52"
                />
                <Button type="submit">
                  <Play size={14} /> Start session
                </Button>
              </form>
              <p className="mt-2 text-[11px] text-ink-faint">
                ~15 minutes · realistic follow-ups · dimension-level scorecard at the end. Candidates who
                mock weekly convert interviews ~2× better.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hub.mocks.length === 0 && (
                <p className="py-6 text-center text-xs text-ink-faint">
                  No sessions yet — your first baseline mock takes 15 minutes.
                </p>
              )}
              {hub.mocks.map((m) => (
                <Link
                  key={m.id}
                  href={`/interviews/mock/${m.id}`}
                  className="flex items-center gap-3 rounded-lg border border-edge bg-surface-2 p-3 transition-colors hover:border-edge-strong"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3">
                    {m.mode === "ai" ? (
                      <Bot size={16} className="text-signal" />
                    ) : (
                      <UserRound size={16} className="text-violet" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium capitalize text-ink">
                      {m.focus.replace("_", " ")} {m.mode === "ai" ? "· AI interviewer" : "· human expert"}
                      {m.targetCompany && ` · ${m.targetCompany}`}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {m.status === "completed"
                        ? `Completed ${m.completedAt ? timeAgo(m.completedAt) : ""}`
                        : m.status === "in_progress"
                          ? "In progress — resume session"
                          : m.scheduledAt
                            ? `Scheduled ${m.scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
                            : m.status}
                    </p>
                  </div>
                  {m.score !== null ? (
                    <span
                      className={`tabular text-base font-bold ${m.score >= 75 ? "text-signal" : m.score >= 55 ? "text-warn" : "text-danger"}`}
                    >
                      {m.score}
                    </span>
                  ) : (
                    <Badge tone={m.status === "in_progress" ? "warn" : "info"} className="capitalize">
                      {m.status.replace("_", " ")}
                    </Badge>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
