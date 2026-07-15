import type { Origin, Rarity } from "./types";

/**
 * Two names per Origin/Rarity cell (original Card name + merged former Item
 * name). One is picked at random whenever that cell is rolled.
 * Source: NEVERMORE Prototype Spec v0.1, Card Set table.
 */
export const CARD_POOL: Record<Origin, Record<Rarity, [string, string]>> = {
  Vampire: {
    Common: ["Thirst", "Rosary"],
    Rare: ["Bloodkiss", "Bloodstone"],
    Epic: ["Nightfall", "Crimson Dagger"],
    Legendary: ["Crimson Essence", "Nightfall Ring"],
    Mythic: ["Bloodmoon", "Bloodmoon Elixir"],
    Forbidden: ["Blood of Zenith", "Blood Grail"],
  },
  Fae: {
    Common: ["Petal", "Dewdrop"],
    Rare: ["Whisper", "Glimmer Ring"],
    Epic: ["Thornveil", "Everlace"],
    Legendary: ["Zenith-Sight", "Dreamglass"],
    Mythic: ["Glamour", "Honeywine"],
    Forbidden: ["Everbloom", "Heart of Evergreen"],
  },
  Demon: {
    Common: ["Abyss", "Hellstone"],
    Rare: ["Hellfire", "Dreadstone"],
    Epic: ["Obsidian", "Toxic Skull"],
    Legendary: ["Illusion", "Infernal Chains"],
    Mythic: ["Zenith's Wrath", "Blight Ring"],
    Forbidden: ["Chaos Essence", "Chaos Core"],
  },
  Angel: {
    Common: ["Glimpse", "Lightstone"],
    Rare: ["Beauty", "Dawn Feather"],
    Epic: ["Halo", "Sundrop"],
    Legendary: ["Essence of Sunlight", "Morningstar"],
    Mythic: ["Blaze of Glory", "Ivory Ring"],
    Forbidden: ["Holy Crown of Zenith", "Seraph's Halo"],
  },
  Mage: {
    Common: ["Spell", "Glyph"],
    Rare: ["Runes", "Runestone"],
    Epic: ["Arcane Charm", "Catalyst"],
    Legendary: ["Zenith's Hex", "Spellcore"],
    Mythic: ["Omen Origin Essence", "Grimoire"],
    Forbidden: ["Philosopher's Stone", "Obelisk"],
  },
  Werewolf: {
    Common: ["Howl", "Claw"],
    Rare: ["Eclipse", "Fang Necklace"],
    Epic: ["Moonlight Essence", "Wolfsbane Serum"],
    Legendary: ["Midnight Oracle", "Moondrops"],
    Mythic: ["Silver Fang", "Grimstone"],
    Forbidden: ["Strength of Zenith", "Alpha's Fang"],
  },
  Royal: {
    Common: ["Crown", "Heirloom"],
    Rare: ["Imperial Scroll", "Diamond Tiara"],
    Epic: ["Legion", "Goldleaf"],
    Legendary: ["Exile", "Fabergé Egg"],
    Mythic: ["Essence of Dynasty", "Dynasty Ring"],
    Forbidden: ["Zenith's Oath", "Eternal Crown"],
  },
};

export function pickCardName(origin: Origin, rarity: Rarity): string {
  const [a, b] = CARD_POOL[origin][rarity];
  return Math.random() < 0.5 ? a : b;
}
