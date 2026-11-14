/**
 * ODD DOSE — the one place pill prices are calculated.
 * Tunables live in BALANCE.values (src/config/balance.ts). Never compute prices in UI code.
 *
 *   Quick Sell  = values.quickSell[rarity] × values.starMult[star]   (Vault, fixed, instant)
 *   Ship value  = values.ship[rarity]      × values.starMult[star]   (Desk orders; always > Quick Sell)
 *   Market ref. = Ship value (BACKDOOR prices move around this with the live market index)
 */
import { BALANCE } from "../config/balance";
import { PILL_BY_ID } from "../data/pills";
import type { Rarity, Star } from "./types";

const rarityOf = (pillId: string): Rarity => {
  const p = PILL_BY_ID[pillId];
  if (!p) throw new Error(`Unknown pill: ${pillId}`);
  return p.rarity;
};

export const starMult = (star: Star): number => BALANCE.values.starMult[star];

/** Fixed Gold for one pill of this exact star tier, sold straight from the Vault. */
export const quickSellValue = (pillId: string, star: Star = 0): number => BALANCE.values.quickSell[rarityOf(pillId)] * starMult(star);

/** What one pill of this star tier is worth when shipped through a Desk order. */
export const shipValue = (pillId: string, star: Star = 0): number => BALANCE.values.ship[rarityOf(pillId)] * starMult(star);

/** BACKDOOR's reference price before the live market index is applied. */
export const marketReference = (pillId: string, star: Star = 0): number => shipValue(pillId, star);

export interface PayoutBreakdown {
  /** One entry per requested line: quantity × ship value of the required star tier. */
  lines: { pillId: string; quantity: number; minStar: Star; each: number; subtotal: number }[];
  base: number;
  /** Clearly labelled bonuses only (no hidden or random adjustments). */
  bonuses: { label: string; amount: number }[];
  total: number;
}

/**
 * Order Reward = Σ (ship value of the required tier × quantity), plus clearly defined bonuses.
 * `confidential` adds the Confidential premium; `salesTier` adds Sales Team's +10% per tier.
 */
export function orderPayoutBreakdown(lines: { pillId: string; quantity: number; minStar: Star }[], opts: { confidential?: boolean; salesTier?: number } = {}): PayoutBreakdown {
  const out = lines.map((l) => {
    const each = shipValue(l.pillId, l.minStar);
    return { pillId: l.pillId, quantity: l.quantity, minStar: l.minStar, each, subtotal: each * l.quantity };
  });
  const base = out.reduce((a, l) => a + l.subtotal, 0);
  const bonuses: PayoutBreakdown["bonuses"] = [];
  if (opts.confidential) {
    const m = BALANCE.orders.confidentialPayoutBonus;
    bonuses.push({ label: `Confidential premium ×${m}`, amount: Math.round(base * (m - 1)) });
  }
  if (opts.salesTier) {
    bonuses.push({ label: `Sales Team +${opts.salesTier * 10}%`, amount: Math.round(base * 0.1 * opts.salesTier) });
  }
  return { lines: out, base, bonuses, total: base + bonuses.reduce((a, b) => a + b.amount, 0) };
}
