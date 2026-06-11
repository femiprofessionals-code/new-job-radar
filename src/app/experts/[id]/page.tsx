import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, ShieldCheck, Star, Zap } from "lucide-react";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { getSessionUser } from "@/lib/session";
import { getExpertDetail } from "@/lib/data";
import { requestReviewForm } from "@/app/actions";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Separator,
  Stat,
  Textarea,
} from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Expert" };

export default async function ExpertDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getSessionUser();
  const expert = await getExpertDetail(id);
  if (!expert) notFound();

  // Candidate's documents for attaching to a review request
  const db = await getDb();
  const myDocs =
    user.role === "candidate"
      ? await db
          .select()
          .from(tables.documents)
          .where(and(eq(tables.documents.userId, user.id), isNull(tables.documents.jobId)))
      : [];

  return (
    <div className="mx-auto flex max-w-5xl animate-fade-up flex-col gap-4">
      <Link href="/experts" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft size={13} /> Back to marketplace
      </Link>

      {/* Profile header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row">
          <Avatar name={expert.name} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
              {expert.name}
              {expert.verified && <BadgeCheck size={18} className="text-info" />}
              {expert.availableNow && (
                <Badge tone="signal">
                  <Zap size={10} /> Available now
                </Badge>
              )}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{expert.headline}</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{expert.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(expert.categories as string[]).map((c) => (
                <Badge key={c} tone="violet" className="capitalize">
                  {c.replace(/_/g, " ")}
                </Badge>
              ))}
              {(expert.specializations as string[]).map((s) => (
                <Badge key={s} tone="outline">
                  {s}
                </Badge>
              ))}
              {(expert.industries as string[]).map((s) => (
                <Badge key={s} tone="neutral">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-1 md:gap-y-3">
            <Stat
              label="Rating"
              value={
                <span className="flex items-center gap-1">
                  <Star size={16} className="fill-warn text-warn" /> {expert.rating.toFixed(1)}
                </span>
              }
              sub={`${expert.reviewsCount} reviews`}
            />
            <Stat
              label="Interview success"
              value={expert.interviewSuccessRate != null ? `${expert.interviewSuccessRate}%` : "—"}
              tone="signal"
              sub="clients reaching interviews"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trust strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: ShieldCheck, label: "Identity & experience verified", show: expert.verified },
          { icon: Clock, label: `Responds in ~${expert.avgResponseMinutes < 120 ? `${expert.avgResponseMinutes} min` : `${Math.round(expert.avgResponseMinutes / 60)} hrs`}`, show: true },
          { icon: Star, label: `${expert.servicesCompleted.toLocaleString()} services completed`, show: true },
          { icon: BadgeCheck, label: `${expert.yearsExperience} yrs industry experience`, show: true },
        ]
          .filter((i) => i.show)
          .map((i, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-xl border border-edge bg-surface p-3">
              <i.icon size={16} className="shrink-0 text-signal" />
              <p className="text-xs text-ink-muted">{i.label}</p>
            </div>
          ))}
      </div>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <p className="text-[11px] text-ink-faint">
            Payment is held in escrow and released when you accept the work
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {expert.services.map((s) => (
            <div key={s.id} className="rounded-xl border border-edge bg-surface-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{s.description}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Turnaround: {s.turnaroundHours}h · {formatCurrency(s.priceCents)}
                  </p>
                </div>
                <p className="tabular text-lg font-bold text-ink">{formatCurrency(s.priceCents)}</p>
              </div>

              {user.role === "candidate" && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-signal hover:underline">
                    Request this service →
                  </summary>
                  <form action={requestReviewForm} className="mt-3 space-y-2 border-t border-edge pt-3">
                    <input type="hidden" name="serviceType" value={s.type} />
                    <input type="hidden" name="targetExpertId" value={expert.id} />
                    <input type="hidden" name="priceCents" value={s.priceCents} />
                    {["resume_review", "cover_letter_review"].includes(s.type) && (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-ink-muted">
                          Document to review
                        </label>
                        <Select name="documentId" className="w-full">
                          {myDocs
                            .filter((d) =>
                              s.type === "resume_review"
                                ? d.type === "resume"
                                : d.type === "cover_letter"
                            )
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.title}
                              </option>
                            ))}
                        </Select>
                        <p className="mt-1 text-[10px] text-ink-faint">
                          Your document stays private until {expert.name.split(" ")[0]} claims the review.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-ink-muted">
                        What should the expert focus on?
                      </label>
                      <Textarea
                        name="instructions"
                        rows={2}
                        required
                        placeholder="e.g. Targeting senior frontend roles — is my impact coming through?"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      Request for {formatCurrency(s.priceCents)} (escrow)
                    </Button>
                  </form>
                </details>
              )}
            </div>
          ))}
          {expert.services.length === 0 && (
            <p className="py-6 text-center text-xs text-ink-faint">No active services listed.</p>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="pb-4 text-center text-[11px] text-ink-faint">
        Experts on Job Radar are paid through Stripe Connect with a 20% platform fee. Reviews flow
        through the atomic claim queue — no expert sees your documents before claiming your request.
      </p>
    </div>
  );
}
