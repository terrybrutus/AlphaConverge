import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  decryptCredentialVault,
  encryptCredentialVault,
} from "@/lib/credentialVault";
import { useLiveStore } from "@/lib/liveStore";
import { createWatchlistActor } from "@/lib/watchlistActor";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function CredentialVault() {
  const { isAuthenticated } = useInternetIdentity();
  const { actor } = useActor(createWatchlistActor);
  const priceKeys = useLiveStore((s) => s.priceKeys);
  const finnhubKey = useLiveStore((s) => s.finnhubKey);
  const fmpKey = useLiveStore((s) => s.fmpKey);
  const simfinKey = useLiveStore((s) => s.simfinKey);
  const tiingoKey = useLiveStore((s) => s.tiingoKey);
  const aiKey = useLiveStore((s) => s.aiKey);
  const priceProvider = useLiveStore((s) => s.priceProvider);
  const setPriceKey = useLiveStore((s) => s.setPriceKey);
  const setFinnhubKey = useLiveStore((s) => s.setFinnhubKey);
  const setFmpKey = useLiveStore((s) => s.setFmpKey);
  const setSimfinKey = useLiveStore((s) => s.setSimfinKey);
  const setTiingoKey = useLiveStore((s) => s.setTiingoKey);
  const setAiKey = useLiveStore((s) => s.setAiKey);
  const setPriceProvider = useLiveStore((s) => s.setPriceProvider);
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<string>();
  const [unlocked, setUnlocked] = useState(false);
  const [hasVault, setHasVault] = useState(false);
  const [hint, setHint] = useState(
    () => localStorage.getItem("alphaconverge-vault-hint") ?? "",
  );
  const keyCount = [
    ...Object.values(priceKeys),
    finnhubKey,
    fmpKey,
    simfinKey,
    tiingoKey,
    aiKey,
  ].filter(Boolean).length;

  useEffect(() => {
    if (!actor) return;
    void actor
      .getCredentialVault()
      .then((remote) => setHasVault(remote.length > 0));
  }, [actor]);

  if (!isAuthenticated) {
    return (
      <p className="mb-4 text-xs text-muted-foreground">
        Sign in with Internet Identity to optionally sync an encrypted API-key
        vault across devices.
      </p>
    );
  }

  const save = async () => {
    if (!actor) return;
    setStatus("Encrypting...");
    try {
      const vault = await encryptCredentialVault(
        {
          priceKeys,
          finnhubKey,
          fmpKey,
          simfinKey,
          tiingoKey,
          aiKey,
          priceProvider,
        },
        passphrase,
      );
      await actor.setCredentialVault(vault);
      setPassphrase("");
      setHasVault(true);
      setUnlocked(true);
      setStatus("Encrypted vault updated successfully");
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const unlock = async () => {
    if (!actor) return;
    setStatus("Unlocking...");
    try {
      const remote = await actor.getCredentialVault();
      if (remote.length === 0) throw new Error("No encrypted vault saved yet.");
      const payload = await decryptCredentialVault(remote[0], passphrase);
      setPriceKey("alphaVantage", payload.priceKeys.alphaVantage);
      setPriceKey("twelveData", payload.priceKeys.twelveData);
      setFinnhubKey(payload.finnhubKey);
      setFmpKey(payload.fmpKey);
      setSimfinKey(payload.simfinKey);
      setTiingoKey(payload.tiingoKey);
      setAiKey(payload.aiKey);
      setPriceProvider(payload.priceProvider);
      setPassphrase("");
      setUnlocked(true);
      setStatus("Vault unlocked for this session");
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  return (
    <div
      className={`mb-4 rounded-xl border p-4 ${
        unlocked
          ? "border-primary/50 bg-primary/10"
          : "border-border bg-card/50"
      }`}
    >
      <label
        htmlFor="vault-passphrase"
        className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        {unlocked ? (
          <ShieldCheck className="h-4 w-4 text-primary" />
        ) : (
          <LockKeyhole className="h-3.5 w-3.5" />
        )}
        Encrypted cross-device key vault
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${
            unlocked
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {unlocked
            ? `Unlocked · ${keyCount} keys loaded`
            : hasVault
              ? "Locked · saved vault found"
              : "No saved vault"}
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="vault-passphrase"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Vault passphrase (12+ characters)"
          className="min-w-52 flex-1 bg-muted/50"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!passphrase}
          onClick={() => void unlock()}
        >
          Unlock
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={
            !passphrase ||
            (!priceKeys.alphaVantage &&
              !priceKeys.twelveData &&
              !finnhubKey &&
              !fmpKey &&
              !simfinKey &&
              !tiingoKey &&
              !aiKey)
          }
          onClick={() => void save()}
        >
          {hasVault ? "Update encrypted vault" : "Save encrypted vault"}
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          value={hint}
          onChange={(event) => setHint(event.target.value)}
          placeholder="Optional passphrase hint (stored only in this browser)"
          className="bg-muted/50 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            localStorage.setItem("alphaconverge-vault-hint", hint);
            setStatus("Hint saved only in this browser");
          }}
        >
          Save hint
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Encryption and decryption happen in your browser. The canister stores
        ciphertext only. Your passphrase cannot be recovered. Saving again
        replaces the encrypted vault with the keys active in this session. A
        hint should remind you without revealing the passphrase.
      </p>
      {status && <p className="mt-1 text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}
