import Link from "next/link";
import { PendingButton } from "@/components/pending-button";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Send } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getMockSession } from "@/lib/data";
import { sendMockAnswerForm } from "@/app/actions";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  ScoreRing,
  Textarea,
} from "@/components/ui/primitives";

export const metadata = { title: "Mock Interview" };

export default async function MockSessionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser();
  const session = await getMockSession(user.id, id);
  if (!session) notFound();

  const done = session.status === "completed";

  return (
    <div className="mx-auto flex max-w-3xl animate-fade-up flex-col gap-4">
      <Link href="/interviews" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <ArrowLeft size={13} /> Interview engine
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold capitalize tracking-tight">
            {session.focus.replace("_", " ")} Mock Interview
            {session.targetCompany && ` · ${session.targetCompany}`}
          </h1>
          <p className="text-xs text-ink-muted">
            AI interviewer · answer as you would in a real interview
          </p>
        </div>
        <Badge tone={done ? "signal" : "warn"} className="capitalize">
          {session.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Scorecard (completed) */}
      {done && (
        <Card className="border-signal/25">
          <CardHeader>
            <CardTitle>Scorecard</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex justify-center">
              <ScoreRing value={session.score ?? 0} size={100} label="/ 100" />
            </div>
            <div className="flex-1 space-y-2.5">
              {session.scorecard.map((s) => (
                <div key={s.dimension}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="font-medium text-ink">{s.dimension}</span>
                    <span className="tabular text-ink-muted">{s.score}/10</span>
                  </div>
                  <Progress value={s.score * 10} tone={s.score >= 7 ? "signal" : s.score >= 5 ? "warn" : "danger"} />
                  <p className="mt-0.5 text-[11px] text-ink-muted">{s.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {session.transcript.map((t, i) => (
            <div key={i} className={`flex gap-3 ${t.role === "candidate" ? "flex-row-reverse" : ""}`}>
              {t.role === "interviewer" ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-soft">
                  <Bot size={15} className="text-signal" />
                </span>
              ) : (
                <Avatar name={user.name} size={32} />
              )}
              <div
                className={`max-w-[85%] rounded-xl p-3 text-sm leading-relaxed ${
                  t.role === "interviewer"
                    ? "rounded-tl-sm bg-surface-2 text-ink"
                    : "rounded-tr-sm bg-signal-soft text-ink"
                }`}
              >
                {t.content}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Answer box */}
      {!done && (
        <form action={sendMockAnswerForm} className="sticky bottom-20 flex flex-col gap-2 rounded-xl border border-edge-strong bg-surface-2 p-3 md:bottom-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <Textarea
            name="answer"
            rows={4}
            required
            autoFocus
            placeholder="Speak your answer out loud, then type it here as you said it. Aim for 60–90 seconds of content with one concrete example."
            className="border-0 bg-transparent p-1 focus:border-0"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-ink-faint">
              Tip: structure with STAR — situation, task, action, result.
            </p>
            <PendingButton size="sm" pendingText="Interviewer is responding…">
              <Send size={13} /> Submit answer
            </PendingButton>
          </div>
        </form>
      )}

      {done && (
        <div className="flex justify-center pb-6">
          <Link href="/interviews">
            <Button variant="secondary">Run another session</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
