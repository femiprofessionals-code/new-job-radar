import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Lightbulb,
  MapPin,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { getOpportunity } from "@/lib/data";
import { saveOpportunity } from "@/app/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CompanyMark,
  ScoreRing,
  Separator,
} from "@/components/ui/primitives";
import { formatSalaryRange, timeAgo } from "@/lib/utils";

export const metadata = { title: "Opportunity" };

export default async function OpportunityDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await requireUser();
  const o = await getOpportunity(user.id, id);
  if (!o) notFound();

  return (
    <div className="mx-auto flex max-w-5xl animate-fade-up flex-col gap-4">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} /> Back to radar
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <CompanyMark company={o.job.company} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight">{o.job.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-muted">
              <span className="font-medium text-ink">{o.job.company}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {o.job.location}
              </span>
              <span>{formatSalaryRange(o.job.salaryMin, o.job.salaryMax)}</span>
              <span>Posted {timeAgo(o.job.postedAt)}</span>
              <Badge tone={o.competition === "low" ? "signal" : o.competition === "medium" ? "warn" : "danger"}>
                <Users size={10} /> ~{o.job.applicantEstimate} applicants · {o.competition} competition
              </Badge>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <div className="flex flex-col items-center">
              <ScoreRing value={o.interviewProbability} size={84} label="interview prob." />
            </div>
            <div className="flex flex-col gap-2">
              {o.job.url && (
                <a href={o.job.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    Apply on company site ↗
                  </Button>
                </a>
              )}
              {o.application ? (
                <Link href={`/applications/${o.application.id}`}>
                  <Button variant="secondary">In pipeline → {o.application.stage.replace("_", " ")}</Button>
                </Link>
              ) : (
                <form action={saveOpportunity.bind(null, o.jobId)}>
                  <Button type="submit">
                    <Bookmark size={15} /> Save & start application
                  </Button>
                </form>
              )}
              <Badge
                tone={o.priority === "critical" ? "danger" : o.priority === "high" ? "warn" : "info"}
                className="justify-center"
              >
                {o.priority} priority
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid--cols-3 lg:grid-cols-3">
        {/* Analysis */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-signal" /> Why this score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {o.matchReasons.map((r, i) => (
                <p key={i} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
                  <Lightbulb size={13} className="mt-0.5 shrink-0 text-warn" />
                  {r}
                </p>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">Overall match score</span>
                <span className="tabular font-bold text-ink">{o.matchScore}/100</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strength Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {o.strengths.map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal-soft">
                    <Check size={10} className="text-signal" />
                  </span>
                  <span className="text-ink">{s}</span>
                  <span className="ml-auto text-[10px] text-ink-faint">you have this</span>
                </div>
              ))}
              {o.gaps.length > 0 && <Separator className="my-2" />}
              {o.gaps.map((g) => (
                <div key={g} className="flex items-center gap-2 text-xs">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger-soft">
                    <X size={10} className="text-danger" />
                  </span>
                  <span className="text-ink-muted">{g}</span>
                  <span className="ml-auto text-[10px] text-ink-faint">skill gap</span>
                </div>
              ))}
              {o.gaps.length > 0 && (
                <p className="pt-1 text-[11px] leading-relaxed text-ink-faint">
                  Gaps aren&apos;t disqualifiers — address them head-on in your tailored resume and cover
                  letter, or close them with adjacent experience.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Role Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
              {o.job.description.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <Separator className="my-4" />
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Requirements
            </p>
            <ul className="space-y-1.5">
              {(o.job.requirements as string[]).map((r, i) => (
                <li key={i} className="flex gap-2 text-xs text-ink-muted">
                  <span className="text-signal">—</span> {r}
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(o.job.skills as string[]).map((s) => {
                const have = o.strengths.some((st) => st.toLowerCase() === s.toLowerCase());
                return (
                  <Badge key={s} tone={have ? "signal" : "outline"}>
                    {have && <Check size={10} />} {s}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
