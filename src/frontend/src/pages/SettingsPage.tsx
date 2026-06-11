import { CredentialVault } from "@/components/CredentialVault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type PriceProvider, useLiveStore } from "@/lib/liveStore";
import { KeyRound, Settings } from "lucide-react";
import { type FormEvent, useState } from "react";

const PROVIDERS: Record<
  PriceProvider,
  { label: string; signup: string; note: string }
> = {
  alphaVantage: {
    label: "Alpha Vantage",
    signup: "https://www.alphavantage.co/support/#api-key",
    note: "About 25 requests/day on the free tier.",
  },
  twelveData: {
    label: "Twelve Data",
    signup: "https://twelvedata.com/pricing",
    note: "About 800 requests/day and 8/min on the free tier.",
  },
};

function KeyForm({
  label,
  active,
  onSave,
  signup,
  note,
}: {
  label: string;
  active: boolean;
  onSave: (value: string) => void;
  signup: string;
  note: string;
}) {
  const [draft, setDraft] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
    setDraft("");
  };
  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-primary" /> {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {active ? "Active this session" : "Not configured"}
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={active ? "Enter a replacement key" : "Paste API key"}
        />
        <Button type="submit" disabled={!draft.trim()}>
          Save
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {note}{" "}
        <a
          href={signup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Get a key
        </a>
      </p>
    </form>
  );
}

export function SettingsPage() {
  const priceProvider = useLiveStore((state) => state.priceProvider);
  const priceKeys = useLiveStore((state) => state.priceKeys);
  const entries = useLiveStore((state) => state.entries);
  const finnhubKey = useLiveStore((state) => state.finnhubKey);
  const aiKey = useLiveStore((state) => state.aiKey);
  const setPriceProvider = useLiveStore((state) => state.setPriceProvider);
  const setPriceKey = useLiveStore((state) => state.setPriceKey);
  const setFinnhubKey = useLiveStore((state) => state.setFinnhubKey);
  const setAiKey = useLiveStore((state) => state.setAiKey);

  const savePriceKey = (provider: PriceProvider, value: string) => {
    setPriceKey(provider, value);
  };
  const scanning = Object.values(entries).some(
    (entry) => entry.status === "loading",
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="mb-7">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
            <Settings className="h-4 w-4" /> Settings
          </p>
          <h1 className="font-display text-3xl font-bold">Data connections</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Keys stay in memory unless you explicitly save the encrypted
            cross-device vault. Scans and provider calls remain browser-side and
            do not consume canister cycles.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Active price source</p>
          <div className="mt-2 flex gap-2">
            {(Object.keys(PROVIDERS) as PriceProvider[]).map((provider) => (
              <Button
                key={provider}
                type="button"
                variant={priceProvider === provider ? "default" : "outline"}
                disabled={scanning}
                onClick={() => setPriceProvider(provider)}
              >
                {PROVIDERS[provider].label}
              </Button>
            ))}
          </div>
          {scanning && (
            <p className="mt-2 text-xs text-muted-foreground">
              Finish the current scan before switching price sources.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {(Object.keys(PROVIDERS) as PriceProvider[]).map((provider) => (
            <KeyForm
              key={provider}
              label={`${PROVIDERS[provider].label} price key`}
              active={!!priceKeys[provider]}
              onSave={(value) => savePriceKey(provider, value)}
              signup={PROVIDERS[provider].signup}
              note={PROVIDERS[provider].note}
            />
          ))}
          <KeyForm
            label="Finnhub fundamentals and news key"
            active={!!finnhubKey}
            onSave={setFinnhubKey}
            signup="https://finnhub.io/register"
            note="Currently adds insider transactions, company profile, and headline sentiment."
          />
          <KeyForm
            label="Anthropic AI-read key"
            active={!!aiKey}
            onSave={setAiKey}
            signup="https://console.anthropic.com/"
            note="Optional and used only when you click AI read."
          />
        </div>

        <div className="mt-6">
          <CredentialVault />
        </div>
      </div>
    </div>
  );
}
