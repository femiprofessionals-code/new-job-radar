import Link from "next/link";
import { Bookmark, Check, MapPin, Search, Users } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getOpportunities } from "@/lib/data";
import { saveOpportunity } from "@/app/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CompanyMark,
  Input,
  Select,
} from "@/components/ui/primitives";
import { formatSalaryRange, timeAgo } from "@/lib/utils";

export const metadata = { title: "Opportunities" };

export default async function OpportunitiesPage(props: {
  searchParams: Promise<{ q?: string; min?: string; remote?: string; sort?: string }>;
}) {
  const sp = await props.searchParams;
  const user = await getSessionUser();
  const rows = await getOpportunities(user.id, {
    q: sp.q,
    minProbability: sp.min ? Number(sp.min) : undefined,
    remoteOnly: sp.remote === "1",
    sort: sp.sort === "recent" ? "recent" : "probability",
  });

  const freshCutoff = new Date(new Date().getTime() - 2 * 86_400_000);
  const fresh = rows.filter(
    (r) => r.job.postedAt > freshCutoff && r.interviewProbability >= 60
  ).length;

  return (
    <div className="mx-auto flex max-w-6xl animate-fade-up flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Opportunity Engine</h1>
        <p className="text-sm text-ink-muted">
          {rows.length} scored opportunities on your radar
          {fresh > 0 && (
            <>
              {" · "}
              <span className="text-signal">
                {fresh} fresh high-probability {fresh === 1 ? "role" : "roles"} — apply early for 3–4×
                more recruiter views
              </span>
            </>
          )}
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search title, company, skill…" className="pl-8" />
        </div>
        <Select name="min" defaultValue={sp.min ?? ""}>
          <option value="">Any probability</option>
          <option value="40">≥ 40% probability</option>
          <option value="55">≥ 55% probability</option>
          <option value="70">≥ 70% probability</option>
        </Select>
        <Select name="sort" defaultValue={sp.sort ?? "probability"}>
          <option value="probability">Sort: interview probability</option>
          <option value="recent">Sort: most recent</option>
        </Select>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-edge-strong bg-surface-2 px-3 text-sm text-ink-muted">
          <input type="checkbox" name="remote" value="1" defaultChecked={sp.remote === "1"} className="accent-[var(--color-signal)]" />
          Remote only
        </label>
        <Button type="submit" variant="secondary" size="md">
          Apply filters
        </Button>
      </form>

      {/* List */}
      <div className="flex flex-col gap-2">
        {rows.map((o) => (
          <Card key={o.id} className="transition-colors hover:border-edge-strong">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Link href={`/opportunities/${o.jobId}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CompanyMark company={o.job.company} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{o.job.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                    <span>{o.job.company}</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin size={11} /> {o.job.location}
                    </span>
                    <span>{formatSalaryRange(o.job.salaryMin, o.job.salaryMax)}</span>
                    <span>{timeAgo(o.job.postedAt)}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {o.strengths.slice(0, 3).map((s) => (
                      <Badge key={s} tone="signal">
                        <Check size={10} /> {s}
                      </Badge>
                    ))}
                    {o.gaps.slice(0, 2).map((g) => (
                      <Badge key={g} tone="outline">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>

              <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-ink-faint">Competition</p>
                    <Badge
                      tone={o.competition === "low" ? "signal" : o.competition === "medium" ? "warn" : "danger"}
                      className="mt-0.5"
                    >
                      <Users size={10} /> {o.competition}
                    </Badge>
                  </div>
                  <div className="w-16 text-right">
                    <p
                      className={`tabular text-xl font-bold ${
                        o.interviewProbability >= 60
                          ? "text-signal"
                          : o.interviewProbability >= 40
                            ? "text-warn"
                            : "text-ink-muted"
                      }`}
                    >
                      {o.interviewProbability}%
                    </p>
                    <p className="text-[10px] text-ink-faint">interview prob.</p>
                  </div>
                </div>
                {o.applicationId ? (
                  <Link href={`/applications/${o.applicationId}`}>
                    <Button variant="secondary" size="sm">
                      In pipeline
                    </Button>
                  </Link>
                ) : (
                  <form action={saveOpportunity.bind(null, o.jobId)}>
                    <Button variant="outline" size="sm" type="submit">
                      <Bookmark size={13} /> Save
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-ink-muted">
              Nothing on the radar for these filters — widen the probability threshold.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
