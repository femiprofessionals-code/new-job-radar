import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FileText,
  Mail,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { getApplicationDetail } from "@/lib/data";
import {
  completeFollowUp,
  generateCoverLetterAction,
  generateTailoredResume,
} from "@/app/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CompanyMark,
  Separator,
} from "@/components/ui/primitives";
import { StageSelect } from "@/components/stage-select";
import { PendingButton } from "@/components/pending-button";
import { getDb, tables } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import { atsReport } from "@/lib/engines/documents";
import { formatSalaryRange, timeAgo } from "@/lib/utils";

export const metadata = { title: "Application" };

export default async function ApplicationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await requireUser();
  const app = await getApplicationDetail(user.id, id);
  if (!app) notFound();

  const ats = app.resumeDoc ? atsReport(app.resumeDoc.content, app.job) : null;

  const db = await getDb();
  const masters = await db
    .select({ id: tables.documents.id })
    .from(tables.documents)
    .where(
      and(
        eq(tables.documents.userId, user.id),
        eq(tables.documents.type, "resume"),
        isNull(tables.documents.baseDocumentId)
      )
    )
    .limit(1);
  const hasMasterResume = masters.length > 0;

  return (
    <div className="mx-auto flex max-w-6xl animate-fade-up flex-col gap-4">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} /> Back to pipeline
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <CompanyMark company={app.job.company} size={48} />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight">{app.job.title}</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {app.job.company} · {app.job.location} ·{" "}
              {formatSalaryRange(app.job.salaryMin, app.job.salaryMax)}
            </p>
            {app.match && (
              <p className="mt-1 text-xs text-ink-muted">
                Interview probability{" "}
                <span className="tabular font-bold text-signal">{app.match.interviewProbability}%</span>{" "}
                · match {app.match.matchScore}/100 ·{" "}
                <Link href={`/opportunities/${app.jobId}`} className="text-signal hover:underline">
                  full analysis
                </Link>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">Stage</p>
              <StageSelect applicationId={app.id} stage={app.stage} className="h-9 px-3 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up due */}
      {app.nextActionAt && app.nextActionAt < new Date() && (
        <Card className="border-danger/30 bg-danger-soft">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <p className="text-xs font-medium text-danger">
              Overdue: {app.nextActionLabel ?? "Follow up"} — short, specific follow-ups lift reply rates
              ~30%.
            </p>
            <form action={completeFollowUp.bind(null, app.id)}>
              <Button size="sm" variant="outline">
                <Send size={12} /> Mark sent
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Documents */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <FileText size={14} className="text-signal" /> Tailored Resume
              </CardTitle>
              {hasMasterResume ? (
                <form action={generateTailoredResume.bind(null, app.id)}>
                  <PendingButton size="sm" variant="secondary" pendingText="Tailoring resume…">
                    <Sparkles size={13} /> {app.resumeDoc?.jobId ? "Regenerate" : "Generate tailored resume"}
                  </PendingButton>
                </form>
              ) : (
                <Link
                  href="/settings"
                  className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-1.5 text-xs font-medium text-warn hover:bg-warn/20"
                >
                  Add your master resume in Settings first →
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {app.resumeDoc ? (
                <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-edge bg-surface-2 p-4 font-mono text-[11px] leading-relaxed text-ink-muted">
                  {app.resumeDoc.content}
                </pre>
              ) : (
                <p className="py-6 text-center text-xs text-ink-faint">
                  No resume attached yet — generate a tailored version for this role.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Mail size={14} className="text-info" /> Cover Letter
              </CardTitle>
              <form action={generateCoverLetterAction.bind(null, app.id)}>
                <PendingButton size="sm" variant="secondary" pendingText="Writing letter…">
                  <Sparkles size={13} /> {app.coverDoc ? "Regenerate" : "Generate cover letter"}
                </PendingButton>
              </form>
            </CardHeader>
            <CardContent>
              {app.coverDoc ? (
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-edge bg-surface-2 p-4 font-mono text-[11px] leading-relaxed text-ink-muted">
                  {app.coverDoc.content}
                </pre>
              ) : (
                <p className="py-6 text-center text-xs text-ink-faint">
                  No cover letter yet — generate one grounded in your profile and this role.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ATS + timeline */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>ATS Optimization</CardTitle>
              {ats && (
                <Badge tone={ats.score >= 75 ? "signal" : ats.score >= 55 ? "warn" : "danger"}>
                  {ats.score}/100
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {ats ? (
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Keyword coverage
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ats.matchedKeywords.map((k) => (
                        <Badge key={k} tone="signal">
                          <Check size={10} /> {k}
                        </Badge>
                      ))}
                      {ats.missingKeywords.map((k) => (
                        <Badge key={k} tone="danger">
                          <X size={10} /> {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Prioritized fixes
                    </p>
                    <ul className="space-y-1.5">
                      {ats.fixes.map((f, i) => (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
                          <span className="tabular font-bold text-signal">{i + 1}.</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-ink-faint">
                  Generate a resume to see its ATS report.
                </p>
              )}
            </CardContent>
          </Card>

          {app.interviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Interviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {app.interviews.map((iv) => (
                  <div key={iv.id} className="rounded-lg border border-edge bg-surface-2 p-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium capitalize text-ink">
                        {iv.type.replace("_", " ")}
                      </p>
                      <Badge tone={iv.status === "completed" ? "signal" : "info"}>{iv.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {iv.scheduledAt.toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {iv.interviewer && ` · ${iv.interviewer}`}
                    </p>
                    {iv.outcome && <p className="mt-1 text-[11px] text-signal">{iv.outcome}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l border-edge pl-4">
                {app.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.31rem] top-1 h-2 w-2 rounded-full bg-signal" />
                    <p className="text-xs text-ink">{e.detail ?? e.type}</p>
                    <p className="text-[10px] text-ink-faint">{timeAgo(e.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
