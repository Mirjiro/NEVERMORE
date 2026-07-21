import { pickCardName } from "./cardPool.ts";
import { CREATURE_NAMES, CREATURE_RARITY_ODDS } from "./creatures.ts";
import type { Origin, PackType, PullResult, Rarity, Slot2Result } from "./types";

export const PACK_CONFIG: Record<
  PackType,
  { label: string; costX1: number; costX10: number; currency: "Gold" | "Diamonds"; available: boolean }
> = {
  Classic: { label: "Classic", costX1: 2_000, costX10: 18_000, currency: "Gold", available: true },
  Elite: { label: "Elite", costX1: 100, costX10: 800, currency: "Diamonds", available: true },
};

/** Concise product description shown in the Box-level info modal. */
export const BOX_DESCRIPTIONS: Record<PackType, string> = {
  Classic: "Contains one random Origin Pack with cards/bonus ranging from Common through Legendary.",
  Elite: "Contains one random Origin Pack with cards/bonus ranging from Legendary through Forbidden.",
};

function weightedPick<T extends string>(table: Record<T, number>): T {
  const entries = Object.entries(table) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Origin Drop Odds — same table for both pack types. */
export const ORIGIN_ODDS: Record<Origin, number> = {
  Royal: 30,
  Werewolf: 25,
  Mage: 20,
  Fae: 15,
  Vampire: 8,
  Demon: 1,
  Angel: 1,
};

/** Classic Pack rarity odds. Mythic/Forbidden never surface from this pack type. */
export const RARITY_ODDS_CLASSIC: Record<Rarity, number> = {
  Common: 60,
  Rare: 30,
  Epic: 9,
  Legendary: 1,
  Mythic: 0,
  Forbidden: 0,
};

/** Elite Pack rarity odds. Only the top three rarities ever surface. */
export const RARITY_ODDS_ELITE: Record<Rarity, number> = {
  Common: 0,
  Rare: 0,
  Epic: 0,
  Legendary: 60,
  Mythic: 35,
  Forbidden: 5,
};

export function getRarityOdds(packType: PackType): Record<Rarity, number> {
  return packType === "Elite" ? RARITY_ODDS_ELITE : RARITY_ODDS_CLASSIC;
}

type ClassicSlot2Outcome = "Card" | "Seed" | "Gold" | "Diamonds" | "Creature";
type EliteSlot2Outcome = "Card" | "Seed" | "Gold" | "Diamonds" | "Creature";

export const SLOT2_ODDS_CLASSIC: Record<ClassicSlot2Outcome, number> = {
  Card: 50,
  Seed: 30,
  Gold: 15,
  Diamonds: 4.5,
  Creature: 0.5,
};

export const SLOT2_ODDS_ELITE: Record<EliteSlot2Outcome, number> = {
  Card: 50,
  Seed: 25,
  Gold: 10,
  Diamonds: 10,
  Creature: 5,
};

export function getSlot2Odds(packType: PackType): Record<string, number> {
  return packType === "Elite" ? SLOT2_ODDS_ELITE : SLOT2_ODDS_CLASSIC;
}

/** Gold/Diamonds drop amount ranges, inclusive, per pack type. */
export const AMOUNT_RANGES: Record<PackType, { gold: [number, number]; diamonds: [number, number] }> = {
  Classic: { gold: [100, 5_000], diamonds: [1, 50] },
  Elite: { gold: [10_000, 50_000], diamonds: [500, 1_000] },
};

export function rollOrigin(): Origin {
  return weightedPick(ORIGIN_ODDS);
}

export function rollRarity(packType: PackType = "Classic"): Rarity {
  return weightedPick(getRarityOdds(packType));
}

function rollSlot2(origin: Origin, packType: PackType): Slot2Result {
  const { gold, diamonds } = AMOUNT_RANGES[packType];
  const outcome = weightedPick(getSlot2Odds(packType)) as ClassicSlot2Outcome;
  switch (outcome) {
    case "Card": {
      // Independent roll from the same rarity table as the guaranteed card —
      // not a copy of Slot 1's rarity, so it can land on a different tier.
      const bonusRarity = rollRarity(packType);
      return { type: "Card", origin, rarity: bonusRarity, name: pickCardName(origin, bonusRarity) };
    }
    case "Seed":
      return { type: "Seed", origin };
    case "Gold":
      return { type: "Gold", amount: randInt(gold[0], gold[1]) };
    case "Diamonds":
      return { type: "Diamonds", amount: randInt(diamonds[0], diamonds[1]) };
    case "Creature": {
      const creatureRarity = weightedPick(CREATURE_RARITY_ODDS);
      return { type: "Creature", origin, rarity: creatureRarity, name: CREATURE_NAMES[origin][creatureRarity] };
    }
  }
}

/**
 * Runs the full pack pull: Origin roll -> Slot 1 card -> Slot 2 outcome.
 * Pass a fixed `origin` to lock a batch of pulls (an x10 open) to the single
 * Origin Pack it's supposed to represent — every card and bonus in the batch
 * then comes from that same Origin, matching how an x1 open already works.
 */
export function rollPull(packType: PackType = "Classic", origin: Origin = rollOrigin()): PullResult {
  const rarity = rollRarity(packType);
  const slot1 = { origin, rarity, name: pickCardName(origin, rarity) };
  const slot2 = rollSlot2(origin, packType);
  return { packType, origin, rarity, slot1, slot2 };
}
