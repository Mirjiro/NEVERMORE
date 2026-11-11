/**
 * Breeding resolver. Rules, applied in order:
 *  1. Registered recipe → the registered pill (always wins).
 *  2. Identical parents → another copy of that pill.
 *  3. Different pills sharing ≥1 Type → one of the two parents (configurable odds).
 *  4. No shared Types → "No Reaction".
 *  5. Order never matters.
 */
import { BALANCE } from "../config/balance";
import { PILLS, PILL_BY_ID } from "../data/pills";
import type { Rng } from "./types";

export function recipeKey(a: string, b: string): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`;
}

/** O(1) lookup: unordered parent pair → result pill id. */
export const RECIPE_TABLE: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const p of PILLS) {
    if (!p.parents) continue;
    const key = recipeKey(p.parents[0], p.parents[1]);
    if (m.has(key)) throw new Error(`Duplicate recipe ${key}`);
    m.set(key, p.id);
  }
  return m;
})();

/** Which registered recipes use this pill as a parent (for hints). */
export function recipesUsing(pillId: string): string[] {
  return PILLS.filter((p) => p.parents && p.parents.includes(pillId)).map((p) => p.id);
}

export function sharesType(a: string, b: string): boolean {
  const ta = PILL_BY_ID[a].types;
  return PILL_BY_ID[b].types.some((t) => ta.includes(t));
}

export type BreedPreview =
  | { kind: "recipe"; resultId: string }
  | { kind: "identical"; resultId: string }
  | { kind: "shared"; options: [string, string] }
  | { kind: "none" };

/** Deterministic description of what a pair can make (no randomness). */
export function previewBreed(a: string, b: string): BreedPreview {
  if (!PILL_BY_ID[a] || !PILL_BY_ID[b]) throw new Error(`Invalid pill ${a} or ${b}`);
  const reg = RECIPE_TABLE.get(recipeKey(a, b));
  if (reg) return { kind: "recipe", resultId: reg };
  if (a === b) return { kind: "identical", resultId: a };
  if (sharesType(a, b)) return { kind: "shared", options: [a, b] };
  return { kind: "none" };
}

export type BreedResult =
  | { kind: "recipe" | "identical" | "shared"; resultId: string }
  | { kind: "none" };

export function resolveBreed(a: string, b: string, rng: Rng = Math.random): BreedResult {
  const p = previewBreed(a, b);
  switch (p.kind) {
    case "recipe":
    case "identical":
      return { kind: p.kind, resultId: p.resultId };
    case "shared": {
      const pickA = rng() < BALANCE.machine.sharedTypeParentAChance;
      // Order must not matter: sort options so "parent A" is stable regardless of slot order.
      const [x, y] = [...p.options].sort();
      return { kind: "shared", resultId: pickA ? x : y };
    }
    default:
      return { kind: "none" };
  }
}
