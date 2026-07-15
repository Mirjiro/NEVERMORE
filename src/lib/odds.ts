import { pickCardName } from "./cardPool";
import { Origin, PullResult, Rarity, Slot2Result } from "./types";

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

/** Origin Drop Odds — Classic Pack rolls an Origin before rolling a card. */
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
export const RARITY_ODDS: Record<Rarity, number> = {
  Common: 60,
  Rare: 30,
  Epic: 9,
  Legendary: 1,
  Mythic: 0,
  Forbidden: 0,
};

type Slot2Outcome = "Card" | "Seed" | "Gold" | "Diamonds" | "OriginCardPack" | "Creature";

export const SLOT2_ODDS: Record<Slot2Outcome, number> = {
  Card: 50,
  Seed: 30,
  Gold: 15,
  Diamonds: 3,
  OriginCardPack: 1.5,
  Creature: 0.5,
};

export function rollOrigin(): Origin {
  return weightedPick(ORIGIN_ODDS);
}

export function rollRarity(): Rarity {
  return weightedPick(RARITY_ODDS);
}

function rollSlot2Outcome(): Slot2Outcome {
  return weightedPick(SLOT2_ODDS);
}

function rollSlot2(origin: Origin, rarity: Rarity): Slot2Result {
  const outcome = rollSlot2Outcome();
  switch (outcome) {
    case "Card":
      return { type: "Card", origin, rarity, name: pickCardName(origin, rarity) };
    case "Seed":
      return { type: "Seed" };
    case "Gold":
      return { type: "Gold", amount: randInt(100, 5000) };
    case "Diamonds":
      return { type: "Diamonds", amount: randInt(1, 50) };
    case "OriginCardPack":
      return { type: "OriginCardPack" };
    case "Creature":
      return { type: "Creature" };
  }
}

/** Runs the full pack pull: Origin roll -> Slot 1 card -> Slot 2 outcome. */
export function rollPull(): PullResult {
  const origin = rollOrigin();
  const rarity = rollRarity();
  const slot1 = { origin, rarity, name: pickCardName(origin, rarity) };
  const slot2 = rollSlot2(origin, rarity);
  return { origin, rarity, slot1, slot2 };
}
