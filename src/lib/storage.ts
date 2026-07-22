import type { Origin, PullResult } from "./types";

/** Bumped whenever the shape below changes, so an old/incompatible save is
 * discarded instead of crashing on missing fields. */
const STORAGE_KEY = "nevermore-save-v1";

/** Most recent pulls kept for the History feed — enough to feel like a real
 * log without letting localStorage grow unbounded over a long session. */
const MAX_HISTORY = 200;

export interface HistoryEntry {
  timestamp: number;
  pull: PullResult;
}

export interface SaveData {
  gold: number;
  diamonds: number;
  seedsByOrigin: Record<Origin, number>;
  creatures: number;
  /** Keyed by `${origin}::${cardName}` — compound key so two Origins never
   * collide even if a card name were ever reused. */
  collection: Record<string, number>;
  history: HistoryEntry[];
}

export function collectionKey(origin: Origin, name: string): string {
  return `${origin}::${name}`;
}

/**
 * Reads and validates the saved game. Returns null for a first-ever visit,
 * a corrupted value, or a save written by an incompatible earlier version
 * (the version lives in the key itself, so this mostly guards against
 * hand-edited/corrupted localStorage rather than real migrations).
 */
export function loadSave(): SaveData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.gold !== "number" ||
      typeof parsed.diamonds !== "number" ||
      typeof parsed.creatures !== "number" ||
      typeof parsed.seedsByOrigin !== "object" ||
      typeof parsed.collection !== "object" ||
      !Array.isArray(parsed.history)
    ) {
      return null;
    }
    return parsed as SaveData;
  } catch {
    // Corrupted JSON, or localStorage unavailable (private-browsing quirks,
    // storage disabled) — treat exactly like a fresh save rather than crash.
    return null;
  }
}

export function writeSave(data: SaveData): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed: SaveData = {
      ...data,
      history: data.history.slice(-MAX_HISTORY),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded or storage disabled mid-session — losing persistence
    // for this write is fine; gameplay itself must never throw over it.
  }
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear either way.
  }
}
