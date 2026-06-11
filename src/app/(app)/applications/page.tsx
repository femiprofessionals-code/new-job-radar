import Link from "next/link";
import { AlertCircle, Send } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getApplicationsBoard } from "@/lib/data";
import { completeFollowUp } from "@/app/actions";
import { Badge, Button, Card, CardContent, CompanyMark } from "@/components/ui/primitives";
import { StageSelect } from "@/components/stage-select";
import { STAGES } from "@/lib/stages";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const user = await requireUser();
  const cards = await getApplicationsBoard(user.id);
  const overdue = cards.filter((c) => c.nextActionAt && c.nextActionAt < new Date());

  return (
    <div className="mx-auto flex max-w-[88rem] animate-fade-up flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Application Engine</h1>
        <p className="text-sm text-ink-muted">
          {cards.length} applications in the pipeline ·{" "}
          {cards.filter((c) => ["interview", "final_round", "offer"].includes(c.stage)).length} converted to
          interviews
        </p>
      </div>

      {/* Follow-up alerts */}
      {overdue.length > 0 && (
        <Card className="border-danger/30 bg-danger-soft">
          <CardContent className="flex flex-col gap-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
              <AlertCircle size={14} /> {overdue.length} follow-up{overdue.length > 1 ? "s" : ""} overdue —
              following up lifts response rates ~30%
            </p>
            <div className="flex flex-wrap gap-2">
              {overdue.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-2.5 py-1.5"
                >
                  <CompanyMark company={c.job.company} size={22} />
                  <span className="text-xs text-ink">
                    {c.job.company} · {c.nextActionLabel}
                  </span>
                  <form action={completeFollowUp.bind(null, c.id)}>
                    <Button size="sm" variant="outline" type="submit" className="h-6 text-[11px]">
                      <Send size={11} /> Done
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban board */}
      <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
        <div className="flex min-w-max gap-3 pb-2">
          {STAGES.map((stage) => {
            const items = cards.filter((c) => c.stage === stage.id);
            return (
              <div key={stage.id} className="flex w-64 shrink-0 flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    {stage.label}
                  </p>
                  <Badge
                    tone={
                      stage.id === "offer"
                        ? "signal"
                        : stage.id === "rejected"
                          ? "danger"
                          : ["interview", "final_round"].includes(stage.id)
                            ? "info"
                            : "neutral"
                    }
                  >
                    {items.length}
                  </Badge>
                </div>
                <div className="flex min-h-32 flex-col gap-2 rounded-xl bg-surface p-2">
                  {items.map((c) => (
                    <div key={c.id} className="rounded-lg border border-edge bg-surface-2 p-2.5">
                      <Link href={`/applications/${c.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <CompanyMark company={c.job.company} size={26} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-ink hover:text-signal">
                              {c.job.title}
                            </p>
                            <p className="truncate text-[11px] text-ink-muted">{c.job.company}</p>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StageSelect applicationId={c.id} stage={c.stage} />
                        {c.match && (
                          <span
                            className={`tabular text-[11px] font-bold ${
                              c.match.interviewProbability >= 60 ? "text-signal" : "text-ink-muted"
                            }`}
                          >
                            {c.match.interviewProbability}%
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-faint">
                        <span>{timeAgo(c.lastActivityAt)}</span>
                        {c.resumeDoc?.atsScore != null && <span>ATS {c.resumeDoc.atsScore}</span>}
                        {c.nextActionAt && c.nextActionAt < new Date() && (
                          <span className="text-danger">follow up!</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="py-4 text-center text-[11px] text-ink-faint">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
