import type { PackType } from "./types";
import { AMOUNT_RANGES, ORIGIN_CARD_PACK_DISPLAY_NAME } from "./odds";

/**
 * Generic bonus-outcome labels for the probability legend shown in info
 * modals. Distinct from getSlot2Content, which formats an actual rolled
 * result (a specific amount/name), not a category label.
 */
export function formatBonusLabel(outcome: string, packType: PackType): string {
  const { gold, diamonds } = AMOUNT_RANGES[packType];
  switch (outcome) {
    case "Card":
      return "+1 Card";
    case "Seed":
      return "Origin Seed";
    case "Gold":
      return `Gold · ${gold[0].toLocaleString()}–${gold[1].toLocaleString()}`;
    case "Diamonds":
      return `Diamonds · ${diamonds[0].toLocaleString()}–${diamonds[1].toLocaleString()}`;
    case "Creature":
      return "Creature";
    case "OriginCardPack":
      return ORIGIN_CARD_PACK_DISPLAY_NAME;
    default:
      return outcome;
  }
}
