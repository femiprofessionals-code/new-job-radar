import { Send, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser, requireCandidateProfile } from "@/lib/session";
import { getCopilotThread, getDashboard } from "@/lib/data";
import { askCopilotForm } from "@/app/actions";
import {
  Avatar,
  Badge,
  Card,
  CardContent,
  Textarea,
} from "@/components/ui/primitives";
import { PendingButton } from "@/components/pending-button";
import { aiMode } from "@/lib/ai/provider";

export const metadata = { title: "Career Copilot" };

const SUGGESTED = [
  "What should I do next to get more interviews?",
  "Why am I not getting more responses?",
  "How do I prep for my upcoming interviews?",
  "Is my resume good enough for the roles I want?",
  "Which opportunities should I apply to this week?",
];

function renderMarkdownish(text: string) {
  // Minimal renderer for the copilot's bold + line-break formatting.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default async function CopilotPage() {
  const user = await requireUser();
  if (user.role === "expert") redirect("/experts/queue");
  await requireCandidateProfile(user.id);
  const [thread, d] = await Promise.all([getCopilotThread(user.id), getDashboard(user.id)]);
  const mode = aiMode();

  return (
    <div className="mx-auto flex max-w-3xl animate-fade-up flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles size={18} className="text-signal" /> Career Copilot
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your AI career manager. One job: more interviews, faster.
          </p>
        </div>
        <Badge tone={mode === "demo" ? "warn" : "signal"}>
          {mode === "demo" ? "Demo intelligence" : mode === "claude" ? "Claude" : "OpenAI"}
        </Badge>
      </div>

      {/* Live context strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Health", value: `${d.health.score}/100` },
          { label: "Interview prob.", value: `${d.interviewProbability}%` },
          { label: "Apps this week", value: `${d.applicationsThisWeek}/${d.profile.weeklyApplicationGoal}` },
          { label: "Follow-ups due", value: String(d.overdueFollowUps) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-edge bg-surface px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-ink-faint">{s.label}</p>
            <p className="tabular text-sm font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-[11px] text-ink-faint">
        The Copilot reads your live pipeline before every answer — its advice is grounded in your real
        data, never generic.
      </p>

      {/* Thread */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {thread.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-ink">Ask me anything about your search.</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink-muted">
                I&apos;ve already analyzed your pipeline, materials, and market. Try one of these:
              </p>
            </div>
          )}
          {thread.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {m.role === "copilot" ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-soft">
                  <Sparkles size={14} className="text-signal" />
                </span>
              ) : (
                <Avatar name={user.name} size={32} />
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-3 text-sm leading-relaxed ${
                  m.role === "copilot"
                    ? "rounded-tl-sm bg-surface-2 text-ink-muted"
                    : "rounded-tr-sm bg-signal-soft text-ink"
                }`}
              >
                {renderMarkdownish(m.content)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggested prompts */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED.map((s) => (
          <form key={s} action={askCopilotForm}>
            <input type="hidden" name="question" value={s} />
            <button className="rounded-full border border-edge-strong px-3 py-1 text-xs text-ink-muted transition-colors hover:border-signal/40 hover:text-signal">
              {s}
            </button>
          </form>
        ))}
      </div>

      {/* Composer */}
      <form
        action={askCopilotForm}
        className="sticky bottom-20 flex flex-col gap-2 rounded-xl border border-edge-strong bg-surface-2 p-3 md:bottom-4"
      >
        <Textarea
          name="question"
          rows={2}
          required
          placeholder="What should I do next to increase my chance of getting interviews?"
          className="border-0 bg-transparent p-1 focus:border-0"
        />
        <div className="flex justify-end">
          <PendingButton size="sm" pendingText="Analyzing your pipeline…">
            <Send size={13} /> Ask Copilot
          </PendingButton>
        </div>
      </form>
    </div>
  );
}
