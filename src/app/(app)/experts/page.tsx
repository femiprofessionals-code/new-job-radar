import Link from "next/link";
import { BadgeCheck, Clock, Star, Zap } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getCandidateReviews, getExperts } from "@/lib/data";
import { acceptReviewForm } from "@/app/actions";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Progress,
  Select,
  Separator,
  Textarea,
} from "@/components/ui/primitives";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";

export const metadata = { title: "Expert Marketplace" };

const CATEGORIES = [
  { id: "", label: "All experts" },
  { id: "resume_expert", label: "Resume Experts" },
  { id: "ats_expert", label: "ATS Experts" },
  { id: "recruiter", label: "Recruiters" },
  { id: "hiring_manager", label: "Hiring Managers" },
  { id: "interview_coach", label: "Interview Coaches" },
  { id: "career_coach", label: "Career Coaches" },
  { id: "executive_advisor", label: "Executive Advisors" },
];

const STATUS_TONE: Record<string, "neutral" | "info" | "warn" | "signal" | "violet" | "danger"> = {
  available: "warn",
  claimed: "info",
  in_progress: "info",
  delivered: "violet",
  completed: "signal",
  cancelled: "neutral",
};

export default async function ExpertsPage(props: {
  searchParams: Promise<{ category?: string; tab?: string }>;
}) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const tab = sp.tab === "reviews" && user.role === "candidate" ? "reviews" : "marketplace";
  const [experts, myReviews] = await Promise.all([
    getExperts({ category: sp.category || undefined }),
    user.role === "candidate" ? getCandidateReviews(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl animate-fade-up flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Career Expert Marketplace</h1>
        <p className="text-sm text-ink-muted">
          Verified recruiters, hiring managers, and coaches — human signal that converts applications
          into interviews.
        </p>
      </div>

      {/* Tabs */}
      {user.role === "candidate" && (
        <div className="flex gap-1 border-b border-edge">
          {[
            { id: "marketplace", label: "Find an expert" },
            { id: "reviews", label: `My reviews (${myReviews.length})` },
          ].map((t) => (
            <Link
              key={t.id}
              href={t.id === "reviews" ? "/experts?tab=reviews" : "/experts"}
              className={cn(
                "border-b-2 px-3 py-2 text-sm",
                tab === t.id
                  ? "border-signal font-medium text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}

      {tab === "marketplace" ? (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={c.id ? `/experts?category=${c.id}` : "/experts"}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  (sp.category ?? "") === c.id
                    ? "border-signal/40 bg-signal-soft text-signal"
                    : "border-edge-strong text-ink-muted hover:text-ink"
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>

          {/* Expert grid */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {experts.map((e) => {
              const fromPrice = e.services.length
                ? Math.min(...e.services.map((s) => s.priceCents))
                : null;
              return (
                <Link key={e.id} href={`/experts/${e.id}`}>
                  <Card className="h-full transition-colors hover:border-signal/30">
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={e.name} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1 text-sm font-semibold text-ink">
                            {e.name}
                            {e.verified && <BadgeCheck size={14} className="shrink-0 text-info" />}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{e.headline}</p>
                        </div>
                        {e.availableNow && (
                          <Badge tone="signal" className="shrink-0">
                            <Zap size={10} /> Available
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(e.specializations as string[]).slice(0, 3).map((s) => (
                          <Badge key={s} tone="outline">
                            {s}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-auto grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-2.5 text-center">
                        <div>
                          <p className="flex items-center justify-center gap-0.5 text-xs font-bold text-ink">
                            <Star size={11} className="fill-warn text-warn" />
                            {e.rating.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-ink-faint">{e.reviewsCount} reviews</p>
                        </div>
                        <div>
                          <p className="tabular text-xs font-bold text-signal">
                            {e.interviewSuccessRate != null ? `${e.interviewSuccessRate}%` : "—"}
                          </p>
                          <p className="text-[10px] text-ink-faint">interview rate</p>
                        </div>
                        <div>
                          <p className="flex items-center justify-center gap-0.5 text-xs font-bold text-ink">
                            <Clock size={11} className="text-ink-faint" />
                            {e.avgResponseMinutes < 120
                              ? `${e.avgResponseMinutes}m`
                              : `${Math.round(e.avgResponseMinutes / 60)}h`}
                          </p>
                          <p className="text-[10px] text-ink-faint">response</p>
                        </div>
                      </div>

                      {fromPrice !== null && (
                        <p className="text-xs text-ink-muted">
                          From <span className="font-semibold text-ink">{formatCurrency(fromPrice)}</span> ·{" "}
                          {e.servicesCompleted.toLocaleString()} services completed
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        /* My reviews */
        <div className="flex flex-col gap-3">
          {myReviews.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-ink-muted">
                No reviews yet — pick an expert and get human eyes on your materials.
              </CardContent>
            </Card>
          )}
          {myReviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold capitalize text-ink">
                      {r.serviceType.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {r.expertName ? `Expert: ${r.expertName} · ` : "Waiting for an expert to claim · "}
                      requested {timeAgo(r.createdAt)} · {formatCurrency(r.priceCents)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status] ?? "neutral"} className="capitalize">
                    {r.status.replace("_", " ")}
                  </Badge>
                </div>

                {r.feedback && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-sm leading-relaxed text-ink">“{r.feedback.summary}”</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="space-y-1.5">
                        {r.feedback.scorecard.map((s) => (
                          <div key={s.dimension} className="flex items-center gap-2">
                            <span className="w-36 truncate text-[11px] text-ink-muted">{s.dimension}</span>
                            <Progress value={s.score * 10} tone={s.score >= 7 ? "signal" : "warn"} className="flex-1" />
                            <span className="tabular w-8 text-right text-[11px]">{s.score}/10</span>
                          </div>
                        ))}
                      </div>
                      <ul className="space-y-1">
                        {r.feedback.suggestions.map((s, i) => (
                          <li key={i} className="flex gap-1.5 text-[11px] text-ink-muted">
                            <span className="text-signal">→</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {r.status === "delivered" && (
                      <form action={acceptReviewForm} className="mt-4 rounded-lg border border-edge bg-surface-2 p-3">
                        <input type="hidden" name="reviewRequestId" value={r.id} />
                        <p className="text-xs font-medium text-ink">
                          Accept this review to release payment to {r.expertName}
                        </p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                          <Select name="rating" defaultValue="5" className="shrink-0">
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>
                                {"★".repeat(n)} ({n})
                              </option>
                            ))}
                          </Select>
                          <Textarea
                            name="comment"
                            rows={1}
                            placeholder="Optional: leave a public comment…"
                            className="flex-1"
                          />
                          <Button type="submit" size="md" className="shrink-0">
                            Accept & release payment
                          </Button>
                        </div>
                      </form>
                    )}

                    {r.feedback.candidateRating && (
                      <p className="mt-3 text-xs text-ink-muted">
                        Your rating:{" "}
                        <span className="text-warn">{"★".repeat(r.feedback.candidateRating)}</span>
                        {r.feedback.candidateComment && ` — “${r.feedback.candidateComment}”`}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
