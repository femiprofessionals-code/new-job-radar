/**
 * AI provider layer.
 *
 * Every AI feature in Job Radar calls `generate()` — never an SDK directly.
 * - ANTHROPIC_API_KEY set → Claude (primary)
 * - OPENAI_API_KEY set   → OpenAI (fallback)
 * - neither              → demo synthesizer (deterministic, data-driven)
 *
 * Adding real keys upgrades every feature at once with zero code changes.
 */

export interface GenerateOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export type AiMode = "claude" | "openai" | "demo";

export function aiMode(): AiMode {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "demo";
}

export async function generate(
  opts: GenerateOptions,
  demoFallback: () => string | Promise<string>
): Promise<{ text: string; mode: AiMode }> {
  const mode = aiMode();

  // A misconfigured or failing AI provider must never break the product —
  // every feature degrades to the demo generator and the error is logged.
  try {
    if (mode === "claude") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic();
      const res = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
      });
      const text = res.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("");
      if (text.trim()) return { text, mode };
    }

    if (mode === "openai") {
      const { default: OpenAI } = await import("openai");
      // OPENAI_BASE_URL allows any OpenAI-compatible provider — including the
      // free tiers of Google Gemini and Groq (see .env.example).
      const client = new OpenAI({
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      });
      const res = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        max_tokens: opts.maxTokens ?? 1024,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.prompt },
        ],
      });
      const text = res.choices[0]?.message?.content ?? "";
      if (text.trim()) return { text, mode };
    }
  } catch (e) {
    console.error(
      `[ai] ${mode} provider failed, falling back to demo generation:`,
      e instanceof Error ? e.message : e
    );
  }

  return { text: await demoFallback(), mode: "demo" };
}
