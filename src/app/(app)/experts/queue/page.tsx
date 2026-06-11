import { redirect } from "next/navigation";
import { FileText, Lock, ShieldCheck, Undo2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getExpertQueue } from "@/lib/data";
import { deliverFeedbackForm, releaseClaim } from "@/app/actions";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Separator,
  Stat,
  Textarea,
} from "@/components/ui/primitives";
import { ClaimButton } from "@/components/claim-button";
import { formatCurrency, timeAgo } from "@/lib/utils";

export const metadata = { title: "Review Queue" };

export default async function QueuePage() {
  const user = await requireUser();
  if (!user.expertId) redirect("/experts");
  const q = await getExpertQueue(user.expertId);

  return (
    <div className="mx-auto flex max-w-5xl animate-fade-up flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Review Queue</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Claim work, deliver feedback, get paid. Documents unlock only after you claim.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Active claims" value={q.mine.length} tone="info" />
          <Stat label="Completed" value={q.completed.length} />
          <Stat label="Earnings (80%)" value={formatCurrency(q.earningsCents)} tone="signal" />
        </div>
      </div>

      {/* Confidentiality note */}
      <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface p-3">
        <ShieldCheck size={16} className="shrink-0 text-signal" />
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-ink">Atomic claim system:</span> claiming locks the request
          to you at the database level — duplicate assignment is impossible. Candidate documents are
          never visible before a successful claim, and your claim lock expires after 24h of inactivity.
        </p>
      </div>

      {/* My active claims */}
      {q.mine.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Active Claims</CardTitle>
            <Badge tone="info">{q.mine.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {q.mine.map((r) => (
              <div key={r.id} className="rounded-xl border border-edge bg-surface-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.candidateName} size={36} />
                    <div>
                      <p className="text-sm font-semibold capitalize text-ink">
                        {r.serviceType.replace(/_/g, " ")} · {r.candidateName}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {r.candidateHeadline ?? "Candidate"} · claimed {r.claimedAt ? timeAgo(r.claimedAt) : ""}
                        {r.lockExpiresAt && ` · lock expires ${timeAgo(r.lockExpiresAt).replace(" ago", "")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.status === "delivered" ? "violet" : "info"} className="capitalize">
                      {r.status.replace("_", " ")}
                    </Badge>
                    <p className="tabular text-sm font-bold text-signal">
                      {formatCurrency(Math.round(r.priceCents * 0.8))}
                    </p>
                    {r.status === "claimed" && (
                      <form action={releaseClaim.bind(null, r.id)}>
                        <Button variant="ghost" size="sm" title="Release back to queue">
                          <Undo2 size={13} />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>

                {r.instructions && (
                  <p className="mt-3 rounded-lg bg-surface p-2.5 text-xs italic text-ink-muted">
                    Candidate brief: “{r.instructions}”
                  </p>
                )}

                {r.document && (
                  <details className="mt-3" open={r.status !== "delivered"}>
                    <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-info hover:underline">
                      <FileText size={13} /> {r.document.title} (unlocked by your claim)
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-edge bg-surface p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                      {r.document.content}
                    </pre>
                  </details>
                )}

                {r.status !== "delivered" ? (
                  <form action={deliverFeedbackForm} className="mt-4 space-y-3 border-t border-edge pt-4">
                    <input type="hidden" name="reviewRequestId" value={r.id} />
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                      Deliver feedback
                    </p>
                    <Textarea
                      name="summary"
                      rows={3}
                      required
                      placeholder="Overall assessment — candid, specific, actionable…"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      {["Overall Quality", "Clarity & Impact", "Market Fit"].map((dim, i) => (
                        <div key={dim} className="rounded-lg border border-edge bg-surface p-2.5">
                          <p className="text-[11px] font-medium text-ink">{dim}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Select name={`score_${i}`} defaultValue="7" className="h-8 text-xs">
                              {Array.from({ length: 10 }, (_, n) => 10 - n).map((n) => (
                                <option key={n} value={n}>
                                  {n}/10
                                </option>
                              ))}
                            </Select>
                            <Input name={`note_${i}`} placeholder="One-line note" className="h-8 text-xs" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <Textarea
                      name="suggestions"
                      rows={3}
                      placeholder={"Prioritized suggestions — one per line\ne.g. Lead with the migration story in your summary"}
                    />
                    <Button type="submit" size="sm">
                      Deliver feedback to {r.candidateName.split(" ")[0]}
                    </Button>
                  </form>
                ) : (
                  <p className="mt-3 text-xs text-ink-muted">
                    Delivered {r.deliveredAt ? timeAgo(r.deliveredAt) : ""} — payment releases when the
                    candidate accepts.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available queue */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reviews</CardTitle>
          <Badge tone="warn">{q.available.length} open</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.available.length === 0 && (
            <p className="py-8 text-center text-xs text-ink-faint">
              Queue is clear — new requests appear here in real time.
            </p>
          )}
          {q.available.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-edge bg-surface-2 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={r.candidateName} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize text-ink">
                    {r.serviceType.replace(/_/g, " ")}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {r.candidateName} · {r.candidateHeadline ?? "Candidate"} · posted{" "}
                    {timeAgo(r.createdAt)}
                  </p>
                  {r.instructions && (
                    <p className="mt-1 line-clamp-1 text-[11px] italic text-ink-faint">
                      “{r.instructions}”
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-faint">
                    <Lock size={10} /> Document locked until claimed
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                <div className="text-right">
                  <p className="tabular text-base font-bold text-signal">
                    {formatCurrency(Math.round(r.priceCents * 0.8))}
                  </p>
                  <p className="text-[10px] text-ink-faint">your payout (80%)</p>
                </div>
                <ClaimButton reviewRequestId={r.id} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Completed */}
      {q.completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.completed.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-edge bg-surface-2 p-3">
                <p className="text-xs text-ink">
                  <span className="font-medium capitalize">{r.serviceType.replace(/_/g, " ")}</span> ·{" "}
                  {r.candidateName} · {r.completedAt ? timeAgo(r.completedAt) : ""}
                </p>
                <p className="tabular text-xs font-bold text-signal">
                  +{formatCurrency(Math.round(r.priceCents * 0.8))}
                </p>
              </div>
            ))}
            <Separator className="my-2" />
            <p className="text-right text-xs text-ink-muted">
              Paid out via Stripe Connect · total{" "}
              <span className="tabular font-bold text-signal">{formatCurrency(q.earningsCents)}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
