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

/** Creatures only ever roll among the top three rarities. */
export type CreatureRarity = "Legendary" | "Mythic" | "Forbidden";

export type PackType = "Classic" | "Elite";

export interface CardSlot {
  origin: Origin;
  rarity: Rarity;
  name: string;
}

export type Slot2Result =
  | { type: "Card"; origin: Origin; rarity: Rarity; name: string }
  | { type: "Seed"; origin: Origin }
  | { type: "Gold"; amount: number }
  | { type: "Diamonds"; amount: number }
  | { type: "OriginCardPack" }
  | { type: "Creature"; origin: Origin; rarity: CreatureRarity; name: string };

export interface PullResult {
  packType: PackType;
  origin: Origin;
  rarity: Rarity;
  slot1: CardSlot;
  slot2: Slot2Result;
}
