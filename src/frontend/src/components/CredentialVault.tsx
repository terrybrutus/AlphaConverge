import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  decryptCredentialVault,
  encryptCredentialVault,
} from "@/lib/credentialVault";
import { useLiveStore } from "@/lib/liveStore";
import { createWatchlistActor } from "@/lib/watchlistActor";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";

export function CredentialVault() {
  const { isAuthenticated } = useInternetIdentity();
  const { actor } = useActor(createWatchlistActor);
  const priceKeys = useLiveStore((s) => s.priceKeys);
  const finnhubKey = useLiveStore((s) => s.finnhubKey);
  const aiKey = useLiveStore((s) => s.aiKey);
  const priceProvider = useLiveStore((s) => s.priceProvider);
  const setPriceKey = useLiveStore((s) => s.setPriceKey);
  const setFinnhubKey = useLiveStore((s) => s.setFinnhubKey);
  const setAiKey = useLiveStore((s) => s.setAiKey);
  const setPriceProvider = useLiveStore((s) => s.setPriceProvider);
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<string>();

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
        { priceKeys, finnhubKey, aiKey, priceProvider },
        passphrase,
      );
      await actor.setCredentialVault(vault);
      setPassphrase("");
      setStatus("Encrypted vault saved");
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
      setAiKey(payload.aiKey);
      setPriceProvider(payload.priceProvider);
      setPassphrase("");
      setStatus("Vault unlocked for this session");
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-card/50 p-3">
      <label
        htmlFor="vault-passphrase"
        className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <LockKeyhole className="h-3.5 w-3.5" /> Encrypted cross-device key vault
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
              !aiKey)
          }
          onClick={() => void save()}
        >
          Save encrypted
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Encryption and decryption happen in your browser. The canister stores
        ciphertext only. Your passphrase cannot be recovered.
      </p>
      {status && <p className="mt-1 text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}
