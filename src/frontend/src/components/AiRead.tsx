import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveStore } from "@/lib/liveStore";
import type { Play } from "@/types/ticker";
import { KeyRound, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";

// Lightweight renderer for the model's markdown-ish output (#### headings,
// - bullets). Avoids pulling in a full markdown dependency for a few sections.
function RenderNote({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        const key = `${i}-${line.slice(0, 12)}`;
        if (line.startsWith("###")) {
          return (
            <h4
              key={key}
              className="font-display text-sm font-semibold text-primary mt-3"
            >
              {line.replace(/^#+\s*/, "")}
            </h4>
          );
        }
        if (/^[-*]\s+/.test(line)) {
          return (
            <p key={key} className="text-sm text-foreground/90 pl-4 -indent-3">
              • {line.replace(/^[-*]\s+/, "")}
            </p>
          );
        }
        if (line === "") return <div key={key} className="h-1" />;
        return (
          <p key={key} className="text-sm text-foreground/90 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function AiRead({ play }: { play: Play }) {
  const aiKey = useLiveStore((s) => s.aiKey);
  const setAiKey = useLiveStore((s) => s.setAiKey);
  const note = useLiveStore((s) => s.aiNotes[play.symbol]);
  const analyze = useLiveStore((s) => s.analyze);

  const [keyDraft, setKeyDraft] = useState("");
  const hasKey = aiKey.length > 0;

  const submitKey = (e: FormEvent) => {
    e.preventDefault();
    setAiKey(keyDraft);
    setKeyDraft("");
  };

  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 mb-6"
      data-ocid="ai.read"
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            AI read
          </h2>
        </div>
        {hasKey && (
          <Button
            size="sm"
            variant="outline"
            disabled={note?.status === "loading"}
            onClick={() => void analyze(play)}
          >
            {note?.status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Thinking…
              </>
            ) : note?.status === "ok" ? (
              "Regenerate"
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" /> Generate
              </>
            )}
          </Button>
        )}
      </div>

      {!hasKey ? (
        <form onSubmit={submitKey} className="space-y-2">
          <label
            htmlFor="ai-key"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" /> Anthropic API key
          </label>
          <div className="flex gap-2">
            <Input
              id="ai-key"
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-ant-..."
              className="bg-muted/50"
            />
            <Button type="submit" disabled={!keyDraft.trim()}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Generates a plain-language read of the converged signals using
            Claude Haiku (cheap, runs only when you click). Your key is stored
            in this browser and sent directly to Anthropic — use a personal key.
          </p>
        </form>
      ) : note?.status === "error" ? (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{note.error}</span>
        </div>
      ) : note?.status === "ok" && note.text ? (
        <>
          <RenderNote text={note.text} />
          <p className="text-[11px] text-muted-foreground mt-4">
            AI-generated from the engine's signals · research only, not
            financial advice.
          </p>
        </>
      ) : note?.status === "loading" ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading the signals…
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Get a plain-language read of why these signals do (or don't) line up —
          bull case, bear case, and what would invalidate the setup.
        </p>
      )}
    </div>
  );
}
