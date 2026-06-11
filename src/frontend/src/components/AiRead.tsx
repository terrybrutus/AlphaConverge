import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveStore } from "@/lib/liveStore";
import type { Play } from "@/types/ticker";
import { KeyRound, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";

function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong
            key={`${index}-${part}`}
            className="font-semibold text-foreground"
          >
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function RenderNote({ text }: { text: string }) {
  const headings = [
    "The read",
    "Bull case",
    "Bear case / risks",
    "What would invalidate it",
  ];
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((raw, index) => {
        const line = raw.trimEnd();
        const key = `${index}-${line.slice(0, 12)}`;
        if (line.startsWith("###") || headings.includes(line)) {
          return (
            <h4
              key={key}
              className="mt-3 font-display text-sm font-semibold text-primary"
            >
              {line.replace(/^#+\s*/, "")}
            </h4>
          );
        }
        if (/^(?:[-*]|•)\s+/.test(line)) {
          return (
            <p key={key} className="-indent-3 pl-4 text-sm text-foreground/90">
              • <InlineMarkdown text={line.replace(/^(?:[-*]|•)\s+/, "")} />
            </p>
          );
        }
        if (line === "") return <div key={key} className="h-1" />;
        return (
          <p key={key} className="text-sm leading-relaxed text-foreground/90">
            <InlineMarkdown text={line} />
          </p>
        );
      })}
    </div>
  );
}

export function AiRead({ play }: { play: Play }) {
  const aiKey = useLiveStore((state) => state.aiKey);
  const setAiKey = useLiveStore((state) => state.setAiKey);
  const note = useLiveStore((state) => state.aiNotes[play.symbol]);
  const analyze = useLiveStore((state) => state.analyze);
  const [keyDraft, setKeyDraft] = useState("");
  const hasKey = aiKey.length > 0;

  const submitKey = (event: FormEvent) => {
    event.preventDefault();
    setAiKey(keyDraft);
    setKeyDraft("");
  };

  return (
    <div
      className="mb-6 rounded-2xl border border-border bg-card p-6"
      data-ocid="ai.read"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
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
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Thinking...
              </>
            ) : note?.status === "ok" ? (
              "Regenerate"
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" /> Generate
              </>
            )}
          </Button>
        )}
      </div>

      {!hasKey ? (
        <form onSubmit={submitKey} className="space-y-2">
          <label
            htmlFor="ai-key"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <KeyRound className="h-3.5 w-3.5" /> Anthropic API key
          </label>
          <div className="flex gap-2">
            <Input
              id="ai-key"
              type="password"
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder="sk-ant-..."
              className="bg-muted/50"
            />
            <Button type="submit" disabled={!keyDraft.trim()}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Generates an explanation of sourced signals using Claude Haiku. It
            does not search the web or change scores.
          </p>
        </form>
      ) : note?.status === "error" ? (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{note.error}</span>
        </div>
      ) : note?.status === "ok" && note.text ? (
        <>
          <RenderNote text={note.text} />
          <p className="mt-4 text-[11px] text-muted-foreground">
            AI-generated from the engine's sourced signals. Research only, not
            financial advice.
          </p>
        </>
      ) : note?.status === "loading" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading the signals...
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Get a plain-language read of why these signals do or do not line up,
          including the bull case, risks, and invalidation conditions.
        </p>
      )}
    </div>
  );
}
