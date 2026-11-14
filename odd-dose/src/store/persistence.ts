import { SAVE_VERSION, createInitialState, sanitize } from "../engine/game";
import type { GameState } from "../engine/types";

export const SAVE_KEY = "oddDose.save.v1";

export function loadGame(now: number, key = SAVE_KEY): GameState {
  try {
    const raw = localStorage.getItem(key);
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
  // econVersion must come from the save itself (a fresh game's default would skip one-time migrations).
  return sanitize({ ...base, ...data, econVersion: data.econVersion, stats: { ...base.stats, ...data.stats }, market: { ...base.market, ...data.market } });
}

export function saveGame(s: GameState, key = SAVE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearSave(key = SAVE_KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Portable save code: base64 of the JSON. */
export const exportSave = (s: GameState) => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
export const importSave = (code: string) => parseSave(decodeURIComponent(escape(atob(code.trim()))));
