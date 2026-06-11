import {
  auditFamilies,
  auditTone,
  maximumObservableScore,
  surfacedBlocker,
  usefulProviderAudits,
} from "@/lib/evidenceAudit";
import type { Play, ProviderAudit } from "@/types/ticker";
import { AlertTriangle, Check, CircleOff, Database } from "lucide-react";

export function EvidenceAuditPanel({
  play,
  providerAudits,
}: {
  play: Play;
  providerAudits: ProviderAudit[];
}) {
  const families = auditFamilies(play);
  const maximum = maximumObservableScore(play);
  const audits = usefulProviderAudits(providerAudits);

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Evidence acquisition audit
        </h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        This explains whether a low result means negative evidence or an
        inability to observe the evidence. Scoring thresholds are unchanged.
      </p>

      <div className="mb-4 grid gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Current score / maximum observable with this scan
          </p>
          <p className="font-mono text-xl font-bold text-foreground">
            {play.convergenceScore} / {maximum}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Why it did not surface
          </p>
          <p className="text-sm text-foreground">{surfacedBlocker(play)}</p>
        </div>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-2">
        {families.map((family) => (
          <div key={family.key} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {family.label}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {family.score} score · {family.coverage}% measurable
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {family.positive} positive · {family.negative} sourced negative ·{" "}
              {family.missing} missing
            </p>
            <p className="mt-1 text-xs text-foreground">{family.verdict}</p>
          </div>
        ))}
      </div>

      <details className="rounded-lg border border-border bg-muted/20">
        <summary className="cursor-pointer p-3 text-sm font-semibold text-foreground">
          Provider request log ({audits.length})
        </summary>
        <div className="space-y-2 border-t border-border p-3">
          {audits.map((audit, index) => (
            <div
              key={`${audit.provider}-${audit.area}-${index}`}
              className="flex items-start gap-2 text-xs"
            >
              {audit.status === "success" ? (
                <Check className="mt-0.5 h-3.5 w-3.5 text-primary" />
              ) : audit.status === "error" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-destructive" />
              ) : (
                <CircleOff className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              )}
              <div>
                <span className={`font-semibold ${auditTone(audit.status)}`}>
                  {audit.provider} · {audit.area} · {audit.status}
                </span>
                <p className="text-muted-foreground">{audit.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
