import type { CreateActorOptions } from "@caffeineai/core-infrastructure";
import { Actor, type ActorSubclass, HttpAgent } from "@icp-sdk/core/agent";
import type { IDL } from "@icp-sdk/core/candid";

export interface WatchlistService {
  getWatchlist: () => Promise<string[]>;
  setWatchlist: (symbols: string[]) => Promise<void>;
  getCredentialVault: () => Promise<[] | [string]>;
  setCredentialVault: (vault: string) => Promise<void>;
}

const idlFactory: IDL.InterfaceFactory = ({ IDL: I }) =>
  I.Service({
    getWatchlist: I.Func([], [I.Vec(I.Text)], ["query"]),
    setWatchlist: I.Func([I.Vec(I.Text)], [], []),
    getCredentialVault: I.Func([], [I.Opt(I.Text)], ["query"]),
    setCredentialVault: I.Func([I.Text], [], []),
  });

export function createWatchlistActor(
  canisterId: string,
  _uploadFile: unknown,
  _downloadFile: unknown,
  options: CreateActorOptions = {},
): ActorSubclass<WatchlistService> {
  const agent =
    options.agent ??
    HttpAgent.createSync({
      ...options.agentOptions,
    });
  return Actor.createActor<WatchlistService>(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
}
