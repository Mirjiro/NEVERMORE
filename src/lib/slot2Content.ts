import type { Slot2Result } from "./types";
import { RARITY_STYLES } from "./rarityStyles";
import { ORIGIN_CARD_PACK_DISPLAY_NAME } from "./odds";

export interface Slot2Content {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
}

export function getSlot2Content(slot2: Slot2Result): Slot2Content {
  switch (slot2.type) {
    case "Card":
      return {
        icon: "🃏",
        title: slot2.name,
        subtitle: `${slot2.origin} · ${RARITY_STYLES[slot2.rarity].label}`,
        accent: RARITY_STYLES[slot2.rarity].accent,
      };
    case "Seed":
      return {
        icon: "🌱",
        title: `${slot2.origin} Seeds`,
        subtitle: "+1 added to inventory",
        accent: "text-emerald-300",
      };
    case "Gold":
      return {
        icon: "🪙",
        title: `+${slot2.amount.toLocaleString()} Gold`,
        subtitle: "added to balance",
        accent: "text-amber-300",
      };
    case "Diamonds":
      return {
        icon: "💎",
        title: `+${slot2.amount} Diamonds`,
        subtitle: "added to balance",
        accent: "text-cyan-300",
      };
    case "OriginCardPack":
      return {
        icon: "🎁",
        title: `${ORIGIN_CARD_PACK_DISPLAY_NAME}!`,
        subtitle: "+1 added to inventory",
        accent: "text-yellow-300",
      };
    case "Creature":
      return { icon: "🐾", title: "Creature", subtitle: "+1 added to inventory", accent: "text-rose-300" };
  }
}

/** Short confirmation text for the RevealDeck bonus-pickup toast. */
export function getBonusToastText(slot2: Slot2Result): string {
  switch (slot2.type) {
    case "Card":
      return "+1 Card";
    case "Seed":
      return "+Seeds";
    case "Gold":
      return "+Gold";
    case "Diamonds":
      return "+Diamonds";
    case "OriginCardPack":
      return "+1 Origin Box";
    case "Creature":
      return "+Creature";
  }
}
