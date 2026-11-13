import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { advance, companyLevel, createInitialState } from "../engine/game";
import type { Reveal } from "../engine/game";
import { GameError } from "../engine/types";
import type { GameState, Rng } from "../engine/types";
import { clearSave, loadGame, saveGame } from "./persistence";

export interface Toast { id: number; text: string; tone: "info" | "good" | "bad" }

export type RevealInfo =
  | { kind: "machine"; reveal: Reveal }
  | { kind: "copier"; pillId: string; quantity: number; stars: number[] }
  | { kind: "mail"; results: { pillId: string; star: number; identified: boolean; isNew: boolean }[]; name: string }
  | { kind: "level"; level: number };

interface Ctx {
  state: GameState;
  now: number;
  /** Run an engine action on a clone. Returns the action's value, or undefined if it failed (a toast is shown). */
  act: <T>(fn: (s: GameState, now: number, rng: Rng) => T) => T | undefined;
  toast: (text: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
  reveal: RevealInfo | null;
  setReveal: (r: RevealInfo | null) => void;
  replaceState: (s: GameState) => void;
  resetGame: () => void;
  /** Signed-in player name and sign-out (device-local profiles). */
  player: string;
  signOut: () => void;
}

const GameCtx = createContext<Ctx | null>(null);

const clone = (s: GameState): GameState => structuredClone(s);

export function GameProvider({ children, saveKey, player, onSignOut }: { children: ReactNode; saveKey: string; player: string; onSignOut: () => void }) {
  const [state, setState] = useState<GameState>(() => {
    const s = loadGame(Date.now(), saveKey);
    advance(s, Date.now());
    return s;
  });
  const ref = useRef(state);
  const [now, setNow] = useState(Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [reveal, setRevealState] = useState<RevealInfo | null>(null);
  const revealQueue = useRef<RevealInfo[]>([]);
  const toastId = useRef(0);

  const commit = useCallback((s: GameState) => {
    const prevLevel = companyLevel(ref.current);
    ref.current = s;
    setState(s);
    saveGame(s, saveKey);
    const lv = companyLevel(s);
    if (lv > prevLevel) queueReveal({ kind: "level", level: lv });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const queueReveal = (r: RevealInfo) => {
    revealQueue.current.push(r);
    setRevealState((cur) => cur ?? revealQueue.current.shift() ?? null);
  };
  const setReveal = useCallback((r: RevealInfo | null) => {
    if (r) queueReveal(r);
    else setRevealState(revealQueue.current.shift() ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = useCallback(<T,>(fn: (s: GameState, now: number, rng: Rng) => T): T | undefined => {
    const t = Date.now();
    const s = clone(ref.current);
    try {
      advance(s, t);
      const out = fn(s, t, Math.random);
      commit(s);
      return out;
    } catch (e) {
      if (e instanceof GameError) toast(e.message, "bad");
      else { console.error(e); toast("Something went wrong.", "bad"); }
      return undefined;
    }
  }, [commit, toast]);

  // Real-time clock: advance the world every second.
  useEffect(() => {
    let lastSave = Date.now();
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const s = clone(ref.current);
      advance(s, t);
      ref.current = s;
      setState(s);
      if (t - lastSave > 5000) { saveGame(s, saveKey); lastSave = t; }
    }, 1000);
    const flush = () => saveGame(ref.current, saveKey);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  const replaceState = useCallback((s: GameState) => { advance(s, Date.now()); commit(s); }, [commit]);
  const resetGame = useCallback(() => {
    clearSave(saveKey);
    const s = createInitialState(Date.now());
    ref.current = s;
    setState(s);
    saveGame(s, saveKey);
  }, []);

  const value = useMemo(
    () => ({ state, now, act, toast, toasts, reveal, setReveal, replaceState, resetGame, player, signOut: () => { saveGame(ref.current, saveKey); onSignOut(); } }),
    [state, now, act, toast, toasts, reveal, setReveal, replaceState, resetGame, player, saveKey, onSignOut],
  );
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
}
