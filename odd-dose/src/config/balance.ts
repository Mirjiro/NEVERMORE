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
    copiesOfEachCommon: 2,
    machines: 1,
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

  /** Gold to finish a timer early: per remaining minute (rounded up), with a minimum. */
  speedUp: {
    cashPerMinute: 4,
    minimum: 2,
    /** Rushing never pays: a rush costs at least this × the instant sale value of what it finishes
     *  (scaled by the share of time skipped), so rush-then-sell always loses Gold. */
    rushOverSaleValue: 1.25,
  },

  // ---------------------------------------------------------------- copier
  copier: {
    /** The Copier is FREE to run. Time and batch size are the only limits. */
    /** Largest batch per rarity before upgrades (Copier Tray tiers double it). */
    maxBatch: { common: 11, rare: 6, epic: 3, legendary: 1, secret: 1 } as Record<Rarity, number>,
    /** Time per pill (before Faster Copier upgrades). Tuned so copy-and-Quick-Sell alone earns ~450–1,000g per hour
     *  (Quick Sell value ÷ time); contracts are the better income. Happy ×11 = 22 minutes. */
    msPerPill: { common: 2 * MIN, rare: 8 * MIN, epic: 40 * MIN, legendary: 2 * HOUR, secret: 6 * HOUR } as Record<Rarity, number>,
    minBatchMs: 10 * SEC,
  },

  // ---------------------------------------------------------------- quick sell (Vault)
  /** Fixed Gold paid per pill when selling straight from the Vault. Deliberately below contract
   *  rewards, BACKDOOR bids and Copier costs, so copying to quick-sell always loses Gold. */
  /**
   * PILL VALUES — the single source of every pill price (see src/engine/values.ts).
   *   quickSell: fixed Gold per pill from the Vault (instant, from Level 1)
   *   ship:      Gold per pill when shipped in a Desk order (always well above Quick Sell)
   *   starMult:  [Base, ★, ★★] multiplier, shared by Quick Sell, shipping and BACKDOOR
   * BACKDOOR prices move around `ship` with the live market index.
   */
  values: {
    quickSell: { common: 15, rare: 75, epic: 400, legendary: 1600, secret: 6000 } as Record<Rarity, number>,
    ship: { common: 40, rare: 200, epic: 950, legendary: 3800, secret: 14000 } as Record<Rarity, number>,
    starMult: [1, 5, 25] as [number, number, number],
  },

  // ---------------------------------------------------------------- stars
  stars: {
    /** Weights for [Base, ★, ★★]. */
    defaultWeights: [98.4, 1.5, 0.1] as [number, number, number],
    /** Optional per-rarity overrides. */
    byRarity: {} as Partial<Record<Rarity, [number, number, number]>>,
  },

  // ---------------------------------------------------------------- scanner
  scanner: {
    cashCost: 250,
    outcomes: { identify: 35, clue: 30, transform: 20, destroy: 15 },
  },

  // ---------------------------------------------------------------- orders
  orders: {
    maxActive: 5,
    intervalMs: [5 * MIN, 9 * MIN] as [number, number],
    deadlineMs: [24 * HOUR, 72 * HOUR] as [number, number],
    /** Max orders generated to "catch up" after the game was closed. */
    offlineCatchUp: 2,
    confidentialFromLevel: 2,
    confidentialChance: 0.18,
    /** Confidential (special) requests pay this multiple of the ordinary reward, shown as a labelled premium. */
    confidentialPayoutBonus: 2.5,
    starOrdersFromLevel: 3,
    starOrderChance: 0.08,
    /** Chance an order asks for an undiscovered pill whose parents are both Known. */
    frontierChance: 0.3,
    quantity: { common: [2, 6], rare: [1, 3], epic: [1, 2], legendary: [1, 1], secret: [1, 1] } as Record<Rarity, [number, number]>,
    reactionDelayMs: [2 * MIN, 8 * MIN] as [number, number],
    /** Ordinary orders only ask for Known pills of a rarity once the company reaches this level. */
    knownRarityFromLevel: { common: 1, rare: 1, epic: 4, legendary: 6, secret: 8 } as Record<Rarity, number>,
    /** Ordinary orders may ask for an undiscovered pill (both parents Known) of this rarity from this level.
     *  Confidential "special" requests get it two levels earlier. */
    discoveryRarityFromLevel: { common: 99, rare: 1, epic: 5, legendary: 8, secret: 99 } as Record<Rarity, number>,
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
    /** Offer price = expected Quick Sell value of its pulls × this (so mail is for collecting/shipping, not reselling). */
    priceOverQuickSellEV: 1.3,
    /** Multi-pull crates (3+) get this discount. */
    bulkDiscount: 0.92,
  },

  // ---------------------------------------------------------------- company
  company: {
    /** Total XP needed to reach each level (index 0 = level 1). */
    levelXp: [0, 120, 350, 800, 1600, 3000, 5200, 8500, 13000, 20000],
    xp: {
      /** XP per Gold earned from shipping (lowered in v1.6 when ship values rose ~5×). */
      shipPerDollar: 0.1,
      discovery: { common: 0, rare: 40, epic: 120, legendary: 400, secret: 1200 } as Record<Rarity, number>,
    },
    popularity: {
      max: 100,
      perShipment: 2,
      perRarityBonus: { common: 0, rare: 1, epic: 3, legendary: 6, secret: 12 } as Record<Rarity, number>,
      /** Popularity lost per real hour (gentle). */
      decayPerHour: 0.5,
      /** At 100 popularity: payouts × (1 + this). */
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
