import type { Origin, Rarity } from "./types";
import { CARD_POOL } from "./cardPool";
import { RARITY_ORDER } from "./rarityStyles";
import { collectionKey } from "./storage";

/** Gold value per duplicate copy of a card, scaled by rarity — roughly a
 * tenth of that rarity's rough "worth" relative to a Classic Origin Box
 * (2,000 Gold), so selling duplicates meaningfully helps but never comes
 * close to funding pulls on its own. */
export const DUPLICATE_SELL_VALUE: Record<Rarity, number> = {
  Common: 50,
  Rare: 150,
  Epic: 400,
  Legendary: 1000,
  Mythic: 3000,
  Forbidden: 8000,
};

/** Built once from CARD_POOL: `${origin}::${name}` -> that card's rarity. */
const NAME_TO_RARITY = new Map<string, Rarity>();
for (const origin of Object.keys(CARD_POOL) as Origin[]) {
  for (const rarity of RARITY_ORDER) {
    for (const name of CARD_POOL[origin][rarity]) {
      NAME_TO_RARITY.set(collectionKey(origin, name), rarity);
    }
  }
}

function rarityForKey(key: string): Rarity | undefined {
  return NAME_TO_RARITY.get(key);
}

export interface DuplicateSummary {
  totalGold: number;
  totalCards: number;
}

/** A card's first copy is kept for the collection display — only copies
 * beyond the first ("duplicates") are ever counted as sellable. */
export function summarizeDuplicates(collection: Record<string, number>): DuplicateSummary {
  let totalGold = 0;
  let totalCards = 0;
  for (const [key, count] of Object.entries(collection)) {
    if (count <= 1) continue;
    const rarity = rarityForKey(key);
    if (!rarity) continue;
    const extra = count - 1;
    totalGold += extra * DUPLICATE_SELL_VALUE[rarity];
    totalCards += extra;
  }
  return { totalGold, totalCards };
}

/** Sells every duplicate down to exactly one kept copy per card. */
export function sellAllDuplicates(collection: Record<string, number>): Record<string, number> {
  const next = { ...collection };
  for (const key of Object.keys(next)) {
    if (next[key] > 1) next[key] = 1;
  }
  return next;
}
