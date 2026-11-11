import { SAVE_VERSION, createInitialState, sanitize } from "../engine/game";
import type { GameState } from "../engine/types";

export const SAVE_KEY = "oddDose.save.v1";

export function loadGame(now: number): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return parseSave(raw);
  } catch {
    /* storage blocked or corrupt — start fresh */
  }
  return createInitialState(now);
}

export function parseSave(raw: string): GameState {
  const data = JSON.parse(raw) as GameState;
  if (!data || typeof data !== "object" || data.version !== SAVE_VERSION || !Array.isArray(data.specimens)) {
    throw new Error("Not a valid ODD DOSE save.");
  }
  const base = createInitialState(data.createdAt ?? Date.now());
  // Fill any fields missing from older saves, then repair invariants.
  return sanitize({ ...base, ...data, stats: { ...base.stats, ...data.stats }, market: { ...base.market, ...data.market } });
}

export function saveGame(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Portable save code: base64 of the JSON. */
export const exportSave = (s: GameState) => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
export const importSave = (code: string) => parseSave(decodeURIComponent(escape(atob(code.trim()))));
