import type {
  CategoryKey,
  Play,
  ProviderAudit,
  ProviderAuditStatus,
} from "@/types/ticker";

const COMPANY_KEYS: CategoryKey[] = [
  "fundamental",
  "microstructure",
  "sentiment",
];

export interface FamilyAudit {
  key: CategoryKey;
  label: string;
  score: number;
  coverage: number;
  positive: number;
  negative: number;
  missing: number;
  verdict: string;
}

export function auditFamilies(play: Play): FamilyAudit[] {
  return play.categories
    .filter((category) => category.key !== "macro")
    .map((category) => {
      const positive = category.signals.filter(
        (signal) => signal.available !== false && signal.fired,
      ).length;
      const negative = category.signals.filter(
        (signal) => signal.available !== false && !signal.fired,
      ).length;
      const missing = category.signals.filter(
        (signal) => signal.available === false,
      ).length;
      let verdict = "Sourced evidence did not meet the alignment threshold.";
      if (category.aligned) verdict = "Aligned from sourced evidence.";
      else if (category.coverage < 50)
        verdict = `Cannot align: only ${category.coverage}% of this family was measurable.`;
      else if (positive === 0)
        verdict = "Measurable, but none of its confirming signals fired.";

      return {
        key: category.key,
        label: category.label,
        score: category.score,
        coverage: category.coverage,
        positive,
        negative,
        missing,
        verdict,
      };
    });
}

export function maximumObservableScore(play: Play): number {
  const blend: Partial<Record<CategoryKey, number>> = {
    technical: 0.32,
    fundamental: 0.28,
    microstructure: 0.24,
    sentiment: 0.16,
  };
  return Math.round(
    play.categories.reduce(
      (total, category) =>
        total + category.coverage * (blend[category.key] ?? 0),
      0,
    ),
  );
}

export function surfacedBlocker(play: Play): string {
  const technical = play.categories.find(
    (category) => category.key === "technical",
  );
  if (!technical?.aligned) {
    return technical && technical.coverage >= 50
      ? "Technical evidence was measured but did not align."
      : "Technical evidence is not sufficiently measurable.";
  }
  const aligned = play.categories.filter(
    (category) => COMPANY_KEYS.includes(category.key) && category.aligned,
  ).length;
  if (aligned >= 2) return "Strict Surfaced requirements are met.";
  const unmeasurable = play.categories
    .filter(
      (category) =>
        COMPANY_KEYS.includes(category.key) &&
        !category.aligned &&
        category.coverage < 50,
    )
    .map((category) => category.label);
  return unmeasurable.length > 0
    ? `Needs ${2 - aligned} more non-price confirmation(s); currently not measurable enough: ${unmeasurable.join(", ")}.`
    : `Needs ${2 - aligned} more non-price confirmation(s); the measured evidence did not align.`;
}

export function auditTone(status: ProviderAuditStatus): string {
  if (status === "success") return "text-primary";
  if (status === "partial") return "text-chart-4";
  if (status === "error") return "text-destructive";
  return "text-muted-foreground";
}

export function usefulProviderAudits(audits: ProviderAudit[]): ProviderAudit[] {
  return audits.filter(
    (audit) => audit.status !== "not-configured" || audit.area !== "profile",
  );
}
