import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { getKit } from "@/lib/data";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CompanyMark,
} from "@/components/ui/primitives";

export const metadata = { title: "Interview Kit" };

export default async function KitPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const kit = await getKit(id);
  if (!kit) notFound();

  return (
    <div className="mx-auto flex max-w-4xl animate-fade-up flex-col gap-4">
      <Link href="/interviews" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft size={13} /> Interview engine
      </Link>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <CompanyMark company={kit.company} size={52} />
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {kit.company} Interview Kit
            </h1>
            <p className="text-sm text-ink-muted">{kit.role}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kit.values.map((v) => (
                <Badge key={v} tone="violet">
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How {kit.company} interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-ink-muted">{kit.overview}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loop stages</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-4 border-l border-edge pl-5">
            {kit.stages.map((s, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.66rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-signal-soft text-[10px] font-bold text-signal">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{s.description}</p>
                <ul className="mt-1.5 space-y-1">
                  {s.tips.map((t, j) => (
                    <li key={j} className="flex gap-1.5 text-[11px] text-ink-muted">
                      <Lightbulb size={12} className="mt-0.5 shrink-0 text-warn" /> {t}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Likely questions & how to answer them</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {kit.questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-edge bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink">“{q.question}”</p>
                <Badge tone="outline" className="shrink-0">
                  {q.category}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                <span className="font-semibold text-signal">Coach&apos;s guidance: </span>
                {q.guidance}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
