import type { CreatureRarity, Origin } from "./types";

/** Named creature per Origin/Rarity — the Creature bonus outcome's rarity tier. */
export const CREATURE_NAMES: Record<Origin, Record<CreatureRarity, string>> = {
  Vampire: { Legendary: "Nocturne", Mythic: "Bloodnyx", Forbidden: "The First" },
  Fae: { Legendary: "Everthorne", Mythic: "Mossara", Forbidden: "Evergreen" },
  Demon: { Legendary: "Volkrin", Mythic: "Malgore", Forbidden: "Incarnate" },
  Angel: { Legendary: "Luxus", Mythic: "Aureon", Forbidden: "Empyrean" },
  Mage: { Legendary: "Arcal", Mythic: "Hexic", Forbidden: "Infinital" },
  Werewolf: { Legendary: "Greyscar", Mythic: "Longtooth", Forbidden: "Dirac" },
  Royal: { Legendary: "King's Bane", Mythic: "Valon", Forbidden: "Thronekeeper" },
};

/** Rarity odds for a Creature bonus outcome — independent of, and beneath, the Slot 2 Creature odds itself. */
export const CREATURE_RARITY_ODDS: Record<CreatureRarity, number> = {
  Legendary: 60,
  Mythic: 30,
  Forbidden: 10,
};
