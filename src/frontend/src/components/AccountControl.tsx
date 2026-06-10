import { Button } from "@/components/ui/button";
import { useLiveStore } from "@/lib/liveStore";
import { createWatchlistActor } from "@/lib/watchlistActor";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Cloud, LogIn, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AccountControl() {
  const {
    identity,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    login,
    clear,
  } = useInternetIdentity();
  const { actor } = useActor(createWatchlistActor);
  const symbols = useLiveStore((s) => s.symbols);
  const replaceSymbols = useLiveStore((s) => s.replaceSymbols);
  const clearUserSession = useLiveStore((s) => s.clearUserSession);
  const [status, setStatus] = useState<string>();
  const activePrincipal = useRef<string | undefined>(undefined);
  const lastSynced = useRef<string[]>([]);

  useEffect(() => {
    const principal = identity?.getPrincipal().toString();
    if (!isAuthenticated || !actor || !principal) return;
    if (activePrincipal.current === principal) return;
    clearUserSession();
    activePrincipal.current = principal;
    lastSynced.current = [];
    void actor
      .getWatchlist()
      .then((remote) => {
        if (activePrincipal.current !== principal) return;
        replaceSymbols(remote);
        lastSynced.current = remote;
        if (remote.length > 0) setStatus(`Loaded ${remote.length}`);
      })
      .catch(() => {
        if (activePrincipal.current === principal) setStatus("Load failed");
      });
  }, [
    actor,
    clearUserSession,
    identity,
    isAuthenticated,
    replaceSymbols,
  ]);

  if (!isAuthenticated) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isInitializing || isLoggingIn}
        onClick={login}
        title="Sign in to sync your watchlist across devices"
      >
        <LogIn className="w-4 h-4 md:mr-1.5" />
        <span className="hidden md:inline">Sign in</span>
      </Button>
    );
  }

  const save = async () => {
    if (!actor) return;
    if (
      symbols.length === lastSynced.current.length &&
      symbols.every((symbol, index) => symbol === lastSynced.current[index])
    ) {
      setStatus("Already synced");
      return;
    }
    setStatus("Saving...");
    try {
      await actor.setWatchlist(symbols);
      lastSynced.current = [...symbols];
      setStatus(`Saved ${symbols.length}`);
    } catch {
      setStatus("Save failed");
    }
  };

  const logout = () => {
    activePrincipal.current = undefined;
    lastSynced.current = [];
    clearUserSession();
    setStatus(undefined);
    clear();
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void save()}
      >
        <Cloud className="w-4 h-4 md:mr-1.5" />
        <span className="hidden md:inline">{status ?? "Sync watchlist"}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={logout}
        title={`Sign out ${identity?.getPrincipal().toString() ?? ""}`}
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}
