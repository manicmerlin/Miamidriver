"use client";

// Lightweight client-side store for the demo. Persists to localStorage.
// In production, this becomes Postgres (Supabase/Neon) + a proper auth session.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Grade } from "./packs";

export type Tier = "Trial" | "Darling" | "Bombshell" | "Icon";

export interface VaultItem {
  id: string;
  packId: string;
  presetId: string;
  prompt: string;
  grade: Grade;
  createdAt: number;
  favorite: boolean;
  postedTo: string[];               // user-tracked posting log
  art: string;                      // gradient css for placeholder render
  watermark: "invisible" | "visible-corner" | "off";
  aiTagged: true;                   // never disable; protects the user
  type: "image" | "video";
  /** if part of a multi-cut set, all members share the same setId */
  setId?: string;
  /** total members in the set this item belongs to */
  setSize?: number;
  /** position within the set (1-indexed) */
  setIndex?: number;
}

export interface AccountState {
  tier: Tier;
  credits: number;
  idVerified: boolean;
  modelTrained: boolean;
  trainingProgress: number;         // 0..100, advances during /welcome
  watermark: "invisible" | "visible-corner" | "off";
  consent2257: boolean;
  vault: VaultItem[];
  visibleAiBadge: boolean;          // user can choose visible badge in addition to EXIF
}

const DEFAULT: AccountState = {
  tier: "Darling",
  credits: 200,
  idVerified: false,
  modelTrained: false,
  trainingProgress: 0,
  watermark: "invisible",
  consent2257: false,
  vault: [],
  visibleAiBadge: false,
};

const KEY = "ladida.account.v1";

type Patch = Partial<AccountState> | ((s: AccountState) => Partial<AccountState>);

const Ctx = createContext<{
  state: AccountState;
  set: (patch: Patch) => void;
  spend: (n: number) => boolean;
  topUp: (n: number) => void;
  pushVault: (item: VaultItem) => void;
  toggleFavorite: (id: string) => void;
  removeVault: (ids: string[]) => void;
  reset: () => void;
} | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccountState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  // Action callbacks are stable across renders. Anything that needs the current
  // state reads it inside the functional setState updater. This is what stops
  // useEffects that list these as deps from looping.
  const actions = useMemo(
    () => ({
      set: (patch: Patch) =>
        setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) })),
      spend: (n: number) => {
        let ok = false;
        setState((s) => {
          if (s.credits < n) return s;
          ok = true;
          return { ...s, credits: s.credits - n };
        });
        return ok;
      },
      topUp: (n: number) => setState((s) => ({ ...s, credits: s.credits + n })),
      pushVault: (item: VaultItem) =>
        setState((s) => ({ ...s, vault: [item, ...s.vault] })),
      toggleFavorite: (id: string) =>
        setState((s) => ({
          ...s,
          vault: s.vault.map((v) => (v.id === id ? { ...v, favorite: !v.favorite } : v)),
        })),
      removeVault: (ids: string[]) =>
        setState((s) => ({ ...s, vault: s.vault.filter((v) => !ids.includes(v.id)) })),
      reset: () => setState(DEFAULT),
    }),
    [],
  );

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAccount must be used inside <StateProvider>");
  return c;
}

// Small derived hook used by the top bar
export function useCredits() {
  const c = useContext(Ctx);
  return {
    credits: c?.state.credits ?? 0,
    tier: c?.state.tier ?? "Trial",
  };
}
