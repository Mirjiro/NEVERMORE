export type Origin =
  | "Vampire"
  | "Fae"
  | "Demon"
  | "Angel"
  | "Mage"
  | "Werewolf"
  | "Royal";

export type Rarity =
  | "Common"
  | "Rare"
  | "Epic"
  | "Legendary"
  | "Mythic"
  | "Forbidden";

export interface CardSlot {
  origin: Origin;
  rarity: Rarity;
  name: string;
}

export type Slot2Result =
  | { type: "Card"; origin: Origin; rarity: Rarity; name: string }
  | { type: "Seed" }
  | { type: "Gold"; amount: number }
  | { type: "Diamonds"; amount: number }
  | { type: "OriginCardPack" }
  | { type: "Creature" };

export interface PullResult {
  origin: Origin;
  rarity: Rarity;
  slot1: CardSlot;
  slot2: Slot2Result;
}
