/** ODD DOSE — shared game types. Pure data; no UI. */

export type Rarity = "common" | "rare" | "epic" | "legendary" | "secret";
export const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary", "secret"];

export type EmotionType = "happy" | "sad" | "angry" | "calm" | "fear" | "excited";
export const EMOTION_TYPES: EmotionType[] = ["happy", "sad", "angry", "calm", "fear", "excited"];

/** 0 = Base, 1 = ★ (S1), 2 = ★★ (S2) */
export type Star = 0 | 1 | 2;

export type Eyes = "dot" | "happy" | "sad" | "angry" | "closed" | "wide" | "star" | "spiral" | "x" | "heart" | "void" | "line" | "wink";
export type Mouth = "smile" | "frown" | "flat" | "open" | "grin" | "o" | "zigzag" | "wave" | "smirk" | "none" | "teeth";

export interface PillFace {
  eyes: Eyes;
  mouth: Mouth;
  brows?: "angry" | "worried" | "raised";
}

export interface PillDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Registered recipe parents (pill ids). Commons have none. */
  parents?: [string, string];
  /** Inherited emotional Types (computed from ancestry). */
  types: EmotionType[];
  /** Tablet body color and secondary (coating / rim) color. */
  color: string;
  color2: string;
  face: PillFace;
  flavor: string;
}

export interface Specimen {
  id: string;
  pillId: string;
  star: Star;
  /** false = a "?" unidentified specimen. Specimens of Known pills are always identified. */
  identified: boolean;
  acquiredAt: number;
  source: SpecimenSource;
  /** Machine id currently holding this specimen as a parent. */
  reservedBy?: string;
}

export type SpecimenSource = "start" | "machine" | "copier" | "mail" | "market" | "scanner" | "reward";

export interface MachineJob {
  jobId: string;
  parentSpecimenIds: [string, string];
  parentPillIds: [string, string];
  resultPillId: string;
  resultStar: Star;
  resultRarity: Rarity;
  startedAt: number;
  endsAt: number;
  /** How the result was decided (registered recipe / identical / shared type). */
  rule: "recipe" | "identical" | "shared";
}

export interface Machine {
  id: string;
  job: MachineJob | null;
}

export interface CopierJob {
  jobId: string;
  pillId: string;
  quantity: number;
  stars: Star[]; // rolled at start, one per pill
  cost: number;
  startedAt: number;
  endsAt: number;
  /** Legacy (v1.4 Starter tray). */
  free?: boolean;
}

export interface OrderLine {
  pillId: string;
  quantity: number;
  minStar: Star;
}

export interface Order {
  id: string;
  sender: string;
  senderKind: string;
  title: string;
  description: string;
  lines: OrderLine[];
  payout: number;
  createdAt: number;
  expiresAt: number;
  confidential: boolean;
  status: "open" | "shipped" | "expired";
  shippedAt?: number;
  /** How the reward was calculated (v1.6+). Older orders may not have it. */
  breakdown?: { base: number; bonuses: { label: string; amount: number }[] };
}

export interface NewsItem {
  id: string;
  kind: "newspaper" | "letter" | "report" | "welcome";
  title: string;
  body: string;
  from: string;
  at: number;
  read: boolean;
  pillId?: string;
}

export interface MailOffer {
  id: string;
  name: string;
  seller: string;
  blurb: string;
  price: number;
  pulls: number;
  identified: boolean;
  /** Rarity weights (percent). */
  odds: Record<Rarity, number>;
  /** Star weights for [Base, ★, ★★] (percent). */
  starOdds: [number, number, number];
  createdAt: number;
  expiresAt: number;
  status: "sealed" | "opened" | "expired";
  results?: { pillId: string; star: Star; identified: boolean; isNew: boolean }[];
}

export interface Draft {
  id: string;
  at: number;
  source: "file" | "document" | "newspaper" | "scanner" | "confidential" | "market" | "event";
  title: string;
  body: string;
  /** Related pill (used for de-duplication). */
  pillId?: string;
  read: boolean;
}

export interface Listing {
  id: string;
  pillId: string;
  star: Star;
  /** Ask premium over the live market price (always > 1, so buy→sell can't profit instantly). */
  premium: number;
  stock: number;
}

export interface Transaction {
  id: string;
  at: number;
  kind: "buy" | "sell";
  pillId: string;
  star: Star;
  price: number;
}

export interface MarketState {
  /** Per-pill price index (1 = reference value). */
  index: Record<string, number>;
  history: Record<string, number[]>;
  listings: Listing[];
  nextStepAt: number;
  nextRotateAt: number;
  transactions: Transaction[];
}

export interface Stats {
  shipments: number;
  revenue: number;
  pillsMade: number;
  machineRuns: number;
  copierRuns: number;
  scans: number;
  mailOpened: number;
  spentUpgrades: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastTickAt: number;
  idCounter: number;
  cash: number;
  xp: number;
  popularity: number;
  popularityUpdatedAt: number;
  /** Pill ids the player has Known ✓. */
  known: string[];
  /** Permanent discovery records (never erased by selling/shipping). */
  discovery: Record<string, { at: number; bestStar: Star; how: string }>;
  specimens: Specimen[];
  machines: Machine[];
  copier: CopierJob | null;
  upgrades: Record<string, number>;
  orders: Order[];
  news: NewsItem[];
  mail: MailOffer[];
  drafts: Draft[];
  market: MarketState;
  stats: Stats;
  nextOrderAt: number;
  nextNewsAt: number;
  nextMailAt: number;
  nextHistoryAt: number;
  valueHistory: { at: number; value: number }[];
  /** Economy revision applied to this save (used for one-time migrations). */
  econVersion?: number;
  /** Scheduled follow-up reactions. */
  pendingReactions: { at: number; orderId: string }[];
}

/** Thrown for any invalid player action. Message is player-facing. */
export class GameError extends Error {}

export type Rng = () => number;
