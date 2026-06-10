import type { Play } from "@/types/ticker";

// On-click AI "read" of a scored Play, using Claude Haiku 4.5 — the cheapest
// model, sized for short, occasional analyses. Called directly from the browser
// (per the project's client-side architecture) with the user's own Anthropic
// key. The key is sent from the browser, so this is a personal-use convenience;
// the UI says so plainly.
//
// Wire format and the browser-direct header are the documented Anthropic
// Messages API contract; we use fetch rather than bundling the SDK to keep the
// build lean.
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

function summarizePlay(play: Play): string {
  const lines: string[] = [];
  lines.push(`Ticker: ${play.symbol} (${play.name}) — sector ${play.sector}`);
  lines.push(`Price: $${play.price.toFixed(2)}`);
  lines.push(`Lifecycle stage: ${play.stage}`);
  lines.push(
    `Convergence score: ${play.convergenceScore}/100 across ${play.categoriesAligned}/4 independent evidence families; weighted data coverage=${play.dataCoverage}%; surfaced=${play.surfaced}`,
  );
  lines.push(`Engine-recommended instrument: ${play.instrument}`);
  if (play.fatigueWarning) lines.push(`Fatigue note: ${play.fatigueWarning}`);
  lines.push("");
  lines.push("Signals by category:");
  for (const c of play.categories) {
    if (!c.available) {
      lines.push(`- ${c.label}: NO DATA SOURCE CONNECTED`);
      continue;
    }
    const fired = c.signals.filter((s) => s.available !== false && s.fired);
    const quiet = c.signals.filter((s) => s.available !== false && !s.fired);
    const noData = c.signals.filter((s) => s.available === false);
    const parts: string[] = [
      `score ${c.score}/100${c.aligned ? " (aligned)" : ""}`,
    ];
    if (fired.length)
      parts.push(`fired: ${fired.map((s) => s.name).join(", ")}`);
    if (quiet.length)
      parts.push(`quiet: ${quiet.map((s) => s.name).join(", ")}`);
    if (noData.length)
      parts.push(`no data: ${noData.map((s) => s.name).join(", ")}`);
    lines.push(`- ${c.label}: ${parts.join(" | ")}`);
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a markets-analysis assistant inside AlphaConverge, a signal-convergence screener. You are given the engine's computed signals for ONE stock. Write a brief, plain-language read for a user who knows technical analysis but is newer to fundamentals.

Rules:
- Be concrete and cite the specific signals provided. Do not invent data the engine didn't give you.
- Explicitly note which signal categories had NO DATA, so the user knows the picture is partial.
- No hype, no price targets, no "buy/sell" directive. This is research, not financial advice.
- Keep it tight. Use exactly these four short sections as markdown headings:
### The read
(2-3 sentences)
### Bull case
(2-3 bullets)
### Bear case / risks
(2-3 bullets)
### What would invalidate it
(1-2 bullets)`;

export async function analyzePlay(play: Play, apiKey: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // Required to permit a direct browser-origin call.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here are the computed signals. Write the read.\n\n${summarizePlay(play)}`,
          },
        ],
      }),
    });
  } catch (e) {
    throw new Error(
      `Network error reaching Anthropic: ${(e as Error).message}`,
    );
  }

  const data = (await res.json().catch(() => ({}))) as AnthropicResponse;
  if (!res.ok) {
    throw new Error(
      data.error?.message || `Anthropic returned HTTP ${res.status}`,
    );
  }
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Empty response from the model.");
  return text;
}
