/**
 * ODD DOSE — centralized balance configuration.
 * Every tunable gameplay number lives here. These are TEST values, not final balance.
 * UI components must never hard-code gameplay constants.
 */
import type { Rarity } from "../engine/types";

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

export const BALANCE = {
  // ---------------------------------------------------------------- start
  start: {
    cash: 600,
    charge: 100,
    copiesOfEachCommon: 2,
    machines: 1,
  },

  // ---------------------------------------------------------------- charge
  charge: {
    max: 100,
    regenEveryMs: 3 * MIN, // 1 Charge every 3 minutes
  },

  // ---------------------------------------------------------------- machine
  machine: {
    maxMachines: 3,
    incubationMs: {
      common: 30 * SEC,
      rare: 3 * MIN,
      epic: 12 * MIN,
      legendary: 45 * MIN,
      secret: 120 * MIN,
    } as Record<Rarity, number>,
    /** Rule 3: chance the shared-Type fallback returns parent A (else parent B). */
    sharedTypeParentAChance: 0.5,
  },

  /** Cash to finish a timer early: per remaining minute (rounded up), with a minimum. */
  speedUp: {
    cashPerMinute: 4,
    minimum: 2,
  },

  // ---------------------------------------------------------------- copier
  copier: {
    baseMaxBatch: 11,
    /** Cash cost per pill copied. Common $5 → Happy ×11 = $55. */
    costPerPill: { common: 5, rare: 28, epic: 140, legendary: 700, secret: 3800 } as Record<Rarity, number>,
    /** Time for a batch of `referenceBatch` pills; scales linearly with quantity. Happy ×11 = 3 min. */
    referenceBatch: 11,
    referenceBatchMs: {
      common: 3 * MIN,
      rare: 10 * MIN,
      epic: 30 * MIN,
      legendary: 90 * MIN,
      secret: 240 * MIN,
    } as Record<Rarity, number>,
    minBatchMs: 10 * SEC,
  },

  // ---------------------------------------------------------------- stars
  stars: {
    /** Weights for [Base, ★, ★★]. */
    defaultWeights: [98.4, 1.5, 0.1] as [number, number, number],
    /** Optional per-rarity overrides. */
    byRarity: {} as Partial<Record<Rarity, [number, number, number]>>,
    /** Value multipliers for [Base, ★, ★★]. */
    valueMult: [1, 6, 40] as [number, number, number],
  },

  // ---------------------------------------------------------------- scanner
  scanner: {
    cashCost: 250,
    chargeCost: 25,
    outcomes: { identify: 35, clue: 30, transform: 20, destroy: 15 },
  },

  // ---------------------------------------------------------------- value
  /** Reference value of a Base pill by rarity (orders, market, company value). */
  pillValue: { common: 8, rare: 45, epic: 220, legendary: 1100, secret: 6000 } as Record<Rarity, number>,

  // ---------------------------------------------------------------- orders
  orders: {
    maxActive: 5,
    intervalMs: [5 * MIN, 9 * MIN] as [number, number],
    deadlineMs: [24 * HOUR, 72 * HOUR] as [number, number],
    /** Max orders generated to "catch up" after the game was closed. */
    offlineCatchUp: 2,
    payoutMult: [1.4, 1.9] as [number, number],
    confidentialFromLevel: 2,
    confidentialChance: 0.18,
    /** Confidential requests pay this much more than an ordinary order for the same pills. */
    confidentialPayoutBonus: 2.5,
    starOrdersFromLevel: 3,
    starOrderChance: 0.08,
    /** Chance an order asks for an undiscovered pill whose parents are both Known. */
    frontierChance: 0.3,
    quantity: { common: [2, 6], rare: [1, 3], epic: [1, 2], legendary: [1, 1], secret: [1, 1] } as Record<Rarity, [number, number]>,
    reactionDelayMs: [2 * MIN, 8 * MIN] as [number, number],
  },

  // ---------------------------------------------------------------- news & mail
  news: {
    intervalMs: [10 * MIN, 18 * MIN] as [number, number],
    maxOnDesk: 6,
    offlineCatchUp: 1,
  },
  mail: {
    firstMailMs: 1 * MIN,
    intervalMs: [4 * MIN, 7 * MIN] as [number, number],
    maxOffers: 4,
    offlineCatchUp: 1,
    offerLifetimeMs: 36 * HOUR,
  },

  // ---------------------------------------------------------------- company
  company: {
    /** Total XP needed to reach each level (index 0 = level 1). */
    levelXp: [0, 120, 350, 800, 1600, 3000, 5200, 8500, 13000, 20000],
    xp: {
      shipPerDollar: 0.5,
      discovery: { common: 0, rare: 40, epic: 120, legendary: 400, secret: 1200 } as Record<Rarity, number>,
    },
    popularity: {
      max: 100,
      perShipment: 2,
      perRarityBonus: { common: 0, rare: 1, epic: 3, legendary: 6, secret: 12 } as Record<Rarity, number>,
      /** Popularity lost per real hour (gentle). */
      decayPerHour: 0.5,
      /** At 100 popularity: payouts × (1 + this). */
      payoutBonusAtMax: 0.5,
      /** At 100 popularity: order interval × (1 − this). */
      orderSpeedAtMax: 0.4,
    },
    historyEveryMs: 10 * MIN,
    historyPoints: 36,
  },

  // ---------------------------------------------------------------- backdoor market
  market: {
    unlockLevel: 5,
    stepMs: 5 * MIN,
    maxOfflineSteps: 48,
    rotateMs: 20 * MIN,
    listings: 6,
    stock: [1, 3] as [number, number],
    /** Random walk volatility per step. */
    volatility: 0.06,
    indexRange: [0.5, 3] as [number, number],
    /** Listing ask = market price × [min,max] premium. Always > 1 to block arbitrage. */
    askPremium: [1.15, 1.4] as [number, number],
    /** Sell (bid) = market price × this. Always < min ask premium. */
    bidRatio: 0.6,
    /** Each sale of a pill lowers its index by this fraction; each buy raises it. */
    saleImpact: 0.04,
    buyImpact: 0.03,
    fireListSize: 5,
    historyLength: 24,
    transactionHistory: 60,
    /** Listing star chance multiplier vs. normal roll (market specimens are curated). */
    listingStarBoost: 4,
  },
} as const;

export const TIME = { SEC, MIN, HOUR };
