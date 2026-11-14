/**
 * ODD DOSE — game engine. Pure functions over GameState; no UI.
 *
 * Convention: every action MUTATES the state it is given and throws GameError on invalid input
 * BEFORE mutating. The store always passes a fresh clone, so a thrown action never corrupts the save.
 */
import { BALANCE } from "../config/balance";
import { EFFECTS, UPGRADES, UPGRADE_BY_ID } from "../config/upgrades";
import {
  ANONYMOUS_SENDERS, CONFIDENTIAL_LINES, FRONTIER_HINT_LINES, MAIL_TEMPLATES, NEWSPAPERS, ORDER_LINES_BY_TYPE, ORDER_TITLES, REACTIONS, SENDERS, WELCOME,
} from "../data/content";
import type { Sender } from "../data/content";
import { COMMON_IDS, PILLS, PILL_BY_ID, PILL_IDS, RARITY_LABEL, TYPE_LABEL, pillsOfRarity } from "../data/pills";
import { gold } from "./format";
import { marketReference, orderPayoutBreakdown, quickSellValue } from "./values";
import { pick, randInt, randRange, weightedIndex } from "./random";
import { resolveBreed } from "./recipes";
import {
  GameError, RARITIES,
} from "./types";
import type {
  CopierJob, Draft, MachineJob, GameState, MailOffer, Order, OrderLine, PillDef, Rarity, Rng, Specimen, SpecimenSource, Star,
} from "./types";

export const SAVE_VERSION = 1;

// ================================================================ helpers

export function newId(s: GameState, prefix: string): string {
  s.idCounter += 1;
  return `${prefix}_${s.idCounter.toString(36)}`;
}

export function pillDef(id: string): PillDef {
  const p = PILL_BY_ID[id];
  if (!p) throw new GameError(`Unknown pill: ${id}`);
  return p;
}

export const isKnown = (s: GameState, pillId: string) => s.known.includes(pillId);
export const upgradeTier = (s: GameState, id: string) => s.upgrades[id] ?? 0;

export function levelFromXp(xp: number): number {
  const t = BALANCE.company.levelXp;
  let lv = 1;
  for (let i = 0; i < t.length; i++) if (xp >= t[i]) lv = i + 1;
  return lv;
}
export const companyLevel = (s: GameState) => levelFromXp(s.xp);
export function levelProgress(s: GameState): { level: number; into: number; need: number | null } {
  const lv = companyLevel(s);
  const t = BALANCE.company.levelXp;
  if (lv >= t.length) return { level: lv, into: s.xp - t[t.length - 1], need: null };
  return { level: lv, into: s.xp - t[lv - 1], need: t[lv] - t[lv - 1] };
}

export const machineCount = (s: GameState) =>
  Math.min(BALANCE.machine.maxMachines, EFFECTS.machineCount(upgradeTier(s, "machines")));
/** Largest Copier batch for this pill (rarer pills come in smaller batches). */
export const copierMaxBatch = (s: GameState, pillId = "happy") =>
  BALANCE.copier.maxBatch[pillDef(pillId).rarity] * EFFECTS.copierBatchMult(upgradeTier(s, "copierBatch"));
export const scannerUnlocked = (s: GameState) => upgradeTier(s, "scanner") > 0;
export const backdoorUnlocked = (s: GameState) => upgradeTier(s, "backdoor") > 0;

export function starWeights(rarity: Rarity): [number, number, number] {
  return BALANCE.stars.byRarity[rarity] ?? BALANCE.stars.defaultWeights;
}
export function rollStar(rng: Rng, weights: readonly [number, number, number]): Star {
  return weightedIndex(rng, weights) as Star;
}
export function rollStarFor(rng: Rng, rarity: Rarity, boost = 1): Star {
  const [b, s1, s2] = starWeights(rarity);
  return rollStar(rng, [b, s1 * boost, s2 * boost]);
}

/** Specimens that can be used right now (identified and not inside a Machine). */
export function availableSpecimens(s: GameState, pillId: string, minStar: Star = 0): Specimen[] {
  return s.specimens
    .filter((x) => x.pillId === pillId && x.identified && !x.reservedBy && x.star >= minStar)
    .sort((a, b) => a.star - b.star || a.acquiredAt - b.acquiredAt);
}
export const countAvailable = (s: GameState, pillId: string, minStar: Star = 0) =>
  availableSpecimens(s, pillId, minStar).length;

export function ownedCounts(s: GameState, pillId: string) {
  const mine = s.specimens.filter((x) => x.pillId === pillId && x.identified);
  return {
    total: mine.length,
    reserved: mine.filter((x) => x.reservedBy).length,
    byStar: [0, 1, 2].map((st) => mine.filter((x) => x.star === st).length) as [number, number, number],
  };
}

export interface Stack { pillId: string; star: Star; count: number; reserved: number; specimenIds: string[] }

/**
 * Vault view: physically owned, identified specimens grouped by pill + exact star tier.
 * Purely a view — individual specimen records are untouched.
 */
export function vaultStacks(s: GameState): Stack[] {
  const map = new Map<string, Stack>();
  for (const sp of s.specimens) {
    if (!sp.identified) continue;
    const key = `${sp.pillId}|${sp.star}`;
    const st = map.get(key) ?? { pillId: sp.pillId, star: sp.star, count: 0, reserved: 0, specimenIds: [] };
    st.count++;
    if (sp.reservedBy) st.reserved++;
    st.specimenIds.push(sp.id);
    map.set(key, st);
  }
  const order = new Map(PILL_IDS.map((id, i) => [id, i]));
  return [...map.values()].sort((a, b) => (order.get(a.pillId)! - order.get(b.pillId)!) || a.star - b.star);
}

/** Count of available (unreserved) specimens with exactly this star tier. */
export const countExact = (s: GameState, pillId: string, star: Star) =>
  s.specimens.filter((x) => x.pillId === pillId && x.identified && !x.reservedBy && x.star === star).length;

function addSpecimen(s: GameState, pillId: string, star: Star, identified: boolean, source: SpecimenSource, now: number): Specimen {
  pillDef(pillId);
  const sp: Specimen = {
    id: newId(s, "sp"),
    pillId,
    star,
    identified: identified || isKnown(s, pillId),
    acquiredAt: now,
    source,
  };
  s.specimens.push(sp);
  if (sp.identified) noteBestStar(s, pillId, star);
  return sp;
}

function noteBestStar(s: GameState, pillId: string, star: Star) {
  const d = s.discovery[pillId];
  if (d && star > d.bestStar) d.bestStar = star;
}

/** Make a pill Known ✓. Returns true the first time. Records permanent discovery history. */
export function makeKnown(s: GameState, pillId: string, how: string, now: number): boolean {
  const def = pillDef(pillId);
  if (isKnown(s, pillId)) return false;
  s.known.push(pillId);
  const best = s.specimens.filter((x) => x.pillId === pillId).reduce<Star>((m, x) => (x.star > m ? x.star : m), 0);
  s.discovery[pillId] = { at: now, bestStar: best, how };
  for (const sp of s.specimens) if (sp.pillId === pillId) sp.identified = true;
  s.xp += BALANCE.company.xp.discovery[def.rarity];
  if (def.rarity === "epic" || def.rarity === "legendary" || def.rarity === "secret") {
    addNews(s, now, {
      kind: "newspaper",
      from: NEWSPAPERS.mastheads[s.idCounter % NEWSPAPERS.mastheads.length],
      title: `BREAKTHROUGH: ODD DOSE produces ${def.name}`,
      body: `Sources confirm a new ${RARITY_LABEL[def.rarity]} compound. "${def.flavor}"`,
      pillId,
    });
  }
  return true;
}

export function addDraft(s: GameState, now: number, d: Omit<Draft, "id" | "at" | "read">): Draft | null {
  if (s.drafts.some((x) => x.title === d.title && x.body === d.body)) return null;
  const draft: Draft = { ...d, id: newId(s, "dr"), at: now, read: false };
  s.drafts.unshift(draft);
  if (s.drafts.length > 120) s.drafts.length = 120;
  return draft;
}

function addNews(s: GameState, now: number, n: { kind: GameState["news"][number]["kind"]; from: string; title: string; body: string; pillId?: string }) {
  s.news.unshift({ ...n, id: newId(s, "nw"), at: now, read: false });
  if (s.news.length > 40) s.news.length = 40;
}

function spendCash(s: GameState, amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new GameError("Invalid amount.");
  if (s.cash < amount) throw new GameError(`Not enough Gold (need ${gold(amount)}).`);
  s.cash -= amount;
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const typeList = (p: PillDef) => p.types.map((t) => TYPE_LABEL[t]).join(" + ");

// ================================================================ initial state

export function createInitialState(now: number, rng: Rng = Math.random): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    createdAt: now,
    lastTickAt: now,
    idCounter: 0,
    cash: BALANCE.start.cash,
    xp: 0,
    popularity: 5,
    popularityUpdatedAt: now,
    known: [],
    discovery: {},
    specimens: [],
    machines: [],
    copier: null,
    upgrades: {},
    orders: [],
    news: [],
    mail: [],
    drafts: [],
    market: { index: {}, history: {}, listings: [], nextStepAt: now + BALANCE.market.stepMs, nextRotateAt: now, transactions: [] },
    stats: { shipments: 0, revenue: 0, pillsMade: 0, machineRuns: 0, copierRuns: 0, scans: 0, mailOpened: 0, spentUpgrades: 0 },
    nextOrderAt: now + 2 * 60_000,
    nextNewsAt: now + 4 * 60_000,
    nextMailAt: now + BALANCE.mail.firstMailMs,
    nextHistoryAt: now,
    valueHistory: [],
    pendingReactions: [],
    econVersion: 2,
  };
  for (let i = 0; i < BALANCE.machine.maxMachines; i++) s.machines.push({ id: `machine_${i + 1}`, job: null });
  for (const id of COMMON_IDS) {
    s.known.push(id);
    s.discovery[id] = { at: now, bestStar: 0, how: "starter" };
    for (let i = 0; i < BALANCE.start.copiesOfEachCommon; i++) addSpecimen(s, id, 0, true, "start", now);
  }
  for (const id of PILL_IDS) {
    s.market.index[id] = Number((0.85 + rng() * 0.3).toFixed(3));
    s.market.history[id] = [s.market.index[id]];
  }
  addNews(s, now, { kind: "welcome", from: "The Board", title: WELCOME.title, body: WELCOME.body });
  addDraft(s, now, { source: "document", title: "Company charter", body: "Six Common pills — Happy, Sad, Angry, Calm, Fear, Excited — are also the six Types. Every pill inherits Types from its ancestors. Two different pills with no recipe but a shared Type will just give you one of the parents back." });
  // Two starter orders: one shippable right now, one that teaches breeding.
  s.orders.push(makeOrder(s, now, rng, { sender: SENDERS[0], lines: [{ pillId: "calm", quantity: 2, minStar: 0 }] }));
  s.orders.push(makeOrder(s, now, rng, { sender: SENDERS[8], lines: [{ pillId: "bittersweet", quantity: 1, minStar: 0 }] }));
  addDraft(s, now, { source: "file", title: "Requested: Bittersweet", body: "Dr. Sato wants Bittersweet (Rare). Rumor says it carries Happy + Sad Types.", pillId: "bittersweet" });
  recordHistory(s, now);
  return s;
}

// ================================================================ time advance

/** Bring the world up to `now`: popularity, orders, news, mail, market, reactions. */
export function advance(s: GameState, now: number, rng: Rng = Math.random): void {
  if (now < s.lastTickAt) now = s.lastTickAt; // clock went backwards: ignore
  // Popularity decay (gentle)
  const hours = (now - s.popularityUpdatedAt) / 3_600_000;
  if (hours > 0) {
    s.popularity = Math.max(0, s.popularity - hours * BALANCE.company.popularity.decayPerHour);
    s.popularityUpdatedAt = now;
  }
  // Orders: expire, prune, generate
  for (const o of s.orders) if (o.status === "open" && o.expiresAt <= now) o.status = "expired";
  const done = s.orders.filter((o) => o.status !== "open");
  if (done.length > 30) {
    const drop = new Set(done.slice(0, done.length - 30).map((o) => o.id));
    s.orders = s.orders.filter((o) => !drop.has(o.id));
  }
  let made = 0;
  while (s.nextOrderAt <= now) {
    const open = s.orders.filter((o) => o.status === "open").length;
    if (open >= BALANCE.orders.maxActive || made >= BALANCE.orders.offlineCatchUp) {
      s.nextOrderAt = now + orderInterval(s, rng);
      break;
    }
    s.orders.push(makeOrder(s, Math.max(s.nextOrderAt, now - 1), rng));
    made++;
    s.nextOrderAt += orderInterval(s, rng);
  }
  // Follow-up reactions
  const due = s.pendingReactions.filter((r) => r.at <= now);
  s.pendingReactions = s.pendingReactions.filter((r) => r.at > now);
  for (const r of due) deliverReaction(s, r.orderId, now, rng);
  // Newspapers
  made = 0;
  while (s.nextNewsAt <= now) {
    if (made >= BALANCE.news.offlineCatchUp) { s.nextNewsAt = now + randRange(rng, BALANCE.news.intervalMs); break; }
    publishNewspaper(s, now, rng);
    made++;
    s.nextNewsAt += randRange(rng, BALANCE.news.intervalMs);
  }
  // Mail offers
  for (const m of s.mail) if (m.status === "sealed" && m.expiresAt <= now) m.status = "expired";
  s.mail = s.mail.filter((m) => m.status === "sealed" || now - m.createdAt < 6 * 3_600_000).slice(0, 12);
  made = 0;
  // Older saves may have mail scheduled on the previous, slower timetable.
  s.nextMailAt = Math.min(s.nextMailAt, now + BALANCE.mail.intervalMs[1]);
  while (s.nextMailAt <= now) {
    const sealed = s.mail.filter((m) => m.status === "sealed").length;
    if (sealed >= BALANCE.mail.maxOffers || made >= BALANCE.mail.offlineCatchUp) {
      s.nextMailAt = now + randRange(rng, BALANCE.mail.intervalMs);
      break;
    }
    s.mail.unshift(makeMailOffer(s, now, rng));
    made++;
    s.nextMailAt += randRange(rng, BALANCE.mail.intervalMs);
  }
  // Market
  let steps = 0;
  while (s.market.nextStepAt <= now) {
    if (steps >= BALANCE.market.maxOfflineSteps) { s.market.nextStepAt = now + BALANCE.market.stepMs; break; }
    marketStep(s, rng, now);
    steps++;
    s.market.nextStepAt += BALANCE.market.stepMs;
  }
  if (s.market.nextRotateAt <= now) {
    rotateListings(s, rng);
    s.market.nextRotateAt = now + BALANCE.market.rotateMs;
  }
  // Company value history
  if (s.nextHistoryAt <= now) {
    recordHistory(s, now);
    s.nextHistoryAt = now + BALANCE.company.historyEveryMs;
  }
  s.lastTickAt = now;
}


// ================================================================ machine

export function incubationMs(s: GameState, rarity: Rarity): number {
  return Math.round(BALANCE.machine.incubationMs[rarity] * EFFECTS.incubationMult(upgradeTier(s, "incubation")));
}

export function speedUpCost(endsAt: number, now: number): number {
  const remaining = endsAt - now;
  if (remaining <= 0) return 0;
  return Math.max(BALANCE.speedUp.minimum, Math.ceil(remaining / 60_000) * BALANCE.speedUp.cashPerMinute);
}

export type MachineStartResult = { kind: "started"; endsAt: number } | { kind: "none" };

export function startMachine(s: GameState, machineId: string, pillA: string, pillB: string, now: number, rng: Rng = Math.random): MachineStartResult {
  const idx = s.machines.findIndex((m) => m.id === machineId);
  if (idx < 0 || idx >= machineCount(s)) throw new GameError("That Machine isn't installed.");
  const m = s.machines[idx];
  if (m.job) throw new GameError("That Machine is busy.");
  for (const id of [pillA, pillB]) {
    pillDef(id);
    if (!isKnown(s, id)) throw new GameError("Only Known ✓ pills can go into the Machine.");
  }
  let specA: Specimen | undefined;
  let specB: Specimen | undefined;
  if (pillA === pillB) {
    const avail = availableSpecimens(s, pillA);
    if (avail.length < 2) throw new GameError(`You need two available ${PILL_BY_ID[pillA].name} pills.`);
    [specA, specB] = avail;
  } else {
    specA = availableSpecimens(s, pillA)[0];
    specB = availableSpecimens(s, pillB)[0];
    if (!specA) throw new GameError(`No available ${PILL_BY_ID[pillA].name} pill.`);
    if (!specB) throw new GameError(`No available ${PILL_BY_ID[pillB].name} pill.`);
  }
  const res = resolveBreed(pillA, pillB, rng);
  if (res.kind === "none") return { kind: "none" }; // Rule 4: no timer, parents untouched
  const def = pillDef(res.resultId);
  const star = rollStarFor(rng, def.rarity);
  specA.reservedBy = m.id;
  specB.reservedBy = m.id;
  m.job = {
    jobId: newId(s, "job"),
    parentSpecimenIds: [specA.id, specB.id],
    parentPillIds: [pillA, pillB],
    resultPillId: def.id,
    resultStar: star,
    resultRarity: def.rarity,
    startedAt: now,
    endsAt: now + incubationMs(s, def.rarity),
    rule: res.kind,
  };
  s.stats.machineRuns++;
  return { kind: "started", endsAt: m.job.endsAt };
}

export interface Reveal {
  pillId: string;
  star: Star;
  isNew: boolean;
  rarity: Rarity;
  rule: string;
}

export function collectMachine(s: GameState, machineId: string, now: number): Reveal {
  const m = s.machines.find((x) => x.id === machineId);
  if (!m || !m.job) throw new GameError("Nothing to collect.");
  if (now < m.job.endsAt) throw new GameError("Still incubating.");
  const job = m.job;
  m.job = null; // claim exactly once
  for (const sp of s.specimens) if (sp.reservedBy === m.id) delete sp.reservedBy;
  const isNew = makeKnown(s, job.resultPillId, "machine", now);
  addSpecimen(s, job.resultPillId, job.resultStar, true, "machine", now);
  s.stats.pillsMade++;
  return { pillId: job.resultPillId, star: job.resultStar, isNew, rarity: job.resultRarity, rule: job.rule };
}

/**
 * What the Machine is allowed to show about a job before collection.
 * Undiscovered results never leak name, art or star. Stars are never shown before collection.
 */
export function incubationView(s: GameState, job: MachineJob): { known: boolean; pillId: string | null; label: string } {
  const known = isKnown(s, job.resultPillId);
  return known
    ? { known, pillId: job.resultPillId, label: `Making ${PILL_BY_ID[job.resultPillId].name}` }
    : { known, pillId: null, label: "Something is forming…" };
}

/** Gold these pills could fetch instantly right now (Quick Sell, or BACKDOOR once unlocked). */
export function instantSaleValue(s: GameState, pillId: string, star: Star = 0): number {
  const q = quickSellPrice(pillId, star);
  return backdoorUnlocked(s) ? Math.max(q, sellPrice(s, pillId, star)) : q;
}

/** Time-based rush price, but never below RUSH × the instant sale value of the skipped share of the job. */
function rushCost(startedAt: number, endsAt: number, now: number, saleValue: number): number {
  const base = speedUpCost(endsAt, now);
  if (base === 0) return 0;
  const skipped = (endsAt - now) / Math.max(1, endsAt - startedAt);
  return Math.max(base, Math.ceil(saleValue * BALANCE.speedUp.rushOverSaleValue * skipped));
}

export function machineSpeedUpCost(s: GameState, machineId: string, now: number): number {
  const job = s.machines.find((x) => x.id === machineId)?.job;
  if (!job) return 0;
  // Priced on a Base copy of the result so the price never hints at a ★.
  return rushCost(job.startedAt, job.endsAt, now, instantSaleValue(s, job.resultPillId, 0));
}

export function speedUpMachine(s: GameState, machineId: string, now: number): number {
  const m = s.machines.find((x) => x.id === machineId);
  if (!m || !m.job) throw new GameError("Nothing to speed up.");
  const cost = machineSpeedUpCost(s, machineId, now);
  if (cost === 0) return 0;
  spendCash(s, cost);
  m.job.endsAt = now;
  return cost;
}

// ================================================================ copier (free)

/** How long a free Copier batch takes. The Copier never costs Gold. */
export function copierQuote(s: GameState, pillId: string, quantity: number) {
  const def = pillDef(pillId);
  const c = BALANCE.copier;
  const ms = Math.max(c.minBatchMs, Math.round(c.msPerPill[def.rarity] * quantity * EFFECTS.copierTimeMult(upgradeTier(s, "copierSpeed"))));
  return { ms, maxBatch: copierMaxBatch(s, pillId) };
}

export function startCopy(s: GameState, pillId: string, quantity: number, now: number, rng: Rng = Math.random): CopierJob {
  const def = pillDef(pillId);
  if (s.copier) throw new GameError("The Copier is already running.");
  if (!isKnown(s, pillId)) throw new GameError("Only Known ✓ pills can be copied.");
  if (!Number.isInteger(quantity) || quantity < 1) throw new GameError("Choose a quantity.");
  const max = copierMaxBatch(s, pillId);
  if (quantity > max) throw new GameError(`Max batch for ${def.name} is ${max}.`);
  const q = copierQuote(s, pillId, quantity);
  const stars: Star[] = [];
  for (let i = 0; i < quantity; i++) stars.push(rollStarFor(rng, def.rarity));
  s.copier = { jobId: newId(s, "cp"), pillId, quantity, stars, cost: 0, startedAt: now, endsAt: now + q.ms };
  s.stats.copierRuns++;
  return s.copier;
}

export function collectCopy(s: GameState, now: number): { pillId: string; quantity: number; stars: Star[] } {
  const job = s.copier;
  if (!job) throw new GameError("Nothing to collect.");
  if (now < job.endsAt) throw new GameError("Still copying.");
  s.copier = null; // claim exactly once
  for (const st of job.stars) addSpecimen(s, job.pillId, st, true, "copier", now);
  s.stats.pillsMade += job.quantity;
  return { pillId: job.pillId, quantity: job.quantity, stars: job.stars };
}

export function copierSpeedUpCost(s: GameState, now: number): number {
  const job = s.copier;
  if (!job) return 0;
  return rushCost(job.startedAt, job.endsAt, now, instantSaleValue(s, job.pillId, 0) * job.quantity);
}

export function speedUpCopy(s: GameState, now: number): number {
  if (!s.copier) throw new GameError("Nothing to speed up.");
  const cost = copierSpeedUpCost(s, now);
  if (cost === 0) return 0;
  spendCash(s, cost);
  s.copier.endsAt = now;
  return cost;
}

// ================================================================ quick sell (Vault)

/** Fixed Gold for one pill of this exact star tier, sold straight from the Vault. */
export function quickSellPrice(pillId: string, star: Star): number {
  pillDef(pillId);
  return quickSellValue(pillId, star);
}

/** Sell `quantity` available pills of this exact star tier. Never touches other tiers or reserved pills; pays once. */
export function quickSell(s: GameState, pillId: string, star: Star, quantity: number): { sold: number; payout: number } {
  pillDef(pillId);
  if (!Number.isInteger(quantity) || quantity < 1) throw new GameError("Choose how many to sell.");
  const avail = s.specimens.filter((x) => x.pillId === pillId && x.star === star && x.identified && !x.reservedBy);
  if (avail.length < quantity) throw new GameError("You don't have that many to sell (pills in use can't be sold).");
  const take = new Set(avail.sort((a, b) => a.acquiredAt - b.acquiredAt).slice(0, quantity).map((x) => x.id));
  s.specimens = s.specimens.filter((x) => !take.has(x.id));
  const payout = quickSellPrice(pillId, star) * quantity;
  s.cash += payout;
  return { sold: quantity, payout };
}

// ================================================================ scanner

export type ScanOutcome =
  | { kind: "identify"; pillId: string; isNew: boolean }
  | { kind: "clue"; draftTitle: string }
  | { kind: "transform"; pillId: string; identified: boolean }
  | { kind: "destroy" };

export const SCAN_OUTCOMES = ["identify", "clue", "transform", "destroy"] as const;

export function scanSpecimen(s: GameState, specimenId: string, now: number, rng: Rng = Math.random): ScanOutcome {
  if (!scannerUnlocked(s)) throw new GameError("Install the Scanner at HQ first.");
  const sp = s.specimens.find((x) => x.id === specimenId);
  if (!sp) throw new GameError("Specimen not found.");
  if (sp.identified || isKnown(s, sp.pillId)) throw new GameError("Known ✓ pills can't be scanned.");
  if (sp.reservedBy) throw new GameError("That specimen is in use.");
  const { cashCost, outcomes } = BALANCE.scanner;
  if (s.cash < cashCost) throw new GameError(`Not enough Gold (need ${gold(cashCost)}).`);
  spendCash(s, cashCost);
  s.stats.scans++;
  const kind = SCAN_OUTCOMES[weightedIndex(rng, SCAN_OUTCOMES.map((k) => outcomes[k]))];
  const def = pillDef(sp.pillId);
  switch (kind) {
    case "identify": {
      const isNew = makeKnown(s, sp.pillId, "scanner", now);
      sp.identified = true;
      noteBestStar(s, sp.pillId, sp.star);
      addDraft(s, now, { source: "scanner", title: `Scanner: identified ${def.name}`, body: `Specimen ${sp.id} is ${def.name} (${RARITY_LABEL[def.rarity]}). Types: ${typeList(def)}.`, pillId: def.id });
      return { kind, pillId: sp.pillId, isNew };
    }
    case "clue": {
      let parentHint = "It appears to be a base compound.";
      if (def.parents) {
        const p = PILL_BY_ID[pick(rng, def.parents)];
        parentHint = isKnown(s, p.id)
          ? `One of its parents reads as ${p.name}.`
          : `One of its parents is an unidentified ${RARITY_LABEL[p.rarity]} pill.`;
      }
      const title = `Scanner clue: ${RARITY_LABEL[def.rarity]} specimen`;
      addDraft(s, now, { source: "scanner", title, body: `A ${RARITY_LABEL[def.rarity]} compound with ${typeList(def)} Types. ${parentHint}`, pillId: def.id });
      return { kind, draftTitle: title };
    }
    case "transform": {
      const pool = pillsOfRarity(def.rarity).filter((p) => p.id !== def.id);
      const next = pick(rng, pool.length ? pool : PILLS);
      sp.pillId = next.id;
      sp.identified = isKnown(s, next.id);
      if (sp.identified) noteBestStar(s, next.id, sp.star);
      return { kind, pillId: next.id, identified: sp.identified };
    }
    default: {
      s.specimens = s.specimens.filter((x) => x.id !== sp.id);
      return { kind: "destroy" };
    }
  }
}

// ================================================================ orders & shipping

function orderInterval(s: GameState, rng: Rng): number {
  const speed = 1 - (s.popularity / BALANCE.company.popularity.max) * BALANCE.company.popularity.orderSpeedAtMax;
  return randRange(rng, BALANCE.orders.intervalMs) * speed;
}

/** Undiscovered pills whose two parents are both Known (good targets to ask for). */
export function frontierPills(s: GameState): PillDef[] {
  return PILLS.filter((p) => p.parents && !isKnown(s, p.id) && isKnown(s, p.parents[0]) && isKnown(s, p.parents[1]));
}

const ORDER_RARITY_WEIGHT: Record<Rarity, number> = { common: 10, rare: 6, epic: 3, legendary: 1, secret: 0.4 };

/** Order Reward = Σ ship value × quantity, plus clearly labelled bonuses (Confidential premium, Sales Team). */
export function orderPayout(s: GameState, lines: OrderLine[], confidential: boolean) {
  return orderPayoutBreakdown(lines, { confidential, salesTier: upgradeTier(s, "sales") });
}

/** Roughly how long the (free) Copier needs to make an order's pills from scratch. */
export function orderCopyTime(s: GameState, lines: OrderLine[]): number {
  return lines.reduce((sum, l) => {
    const max = copierMaxBatch(s, l.pillId);
    const full = Math.floor(l.quantity / max), rest = l.quantity % max;
    return sum + full * copierQuote(s, l.pillId, max).ms + (rest ? copierQuote(s, l.pillId, rest).ms : 0);
  }, 0);
}

/** Rarities an ordinary order may ask for at this level: Known ones, and undiscovered ones the player can make next. */
export function orderableRarity(s: GameState, rarity: Rarity, known: boolean, special = false): boolean {
  const lv = companyLevel(s) + (special ? 2 : 0);
  const o = BALANCE.orders;
  return known ? lv >= o.knownRarityFromLevel[rarity] : lv >= o.discoveryRarityFromLevel[rarity];
}

/** How many lines and how many of each pill, scaled with company level. */
function orderShape(lv: number, rng: Rng) {
  const counts = lv <= 2 ? [1, 1, 1, 2] : lv <= 4 ? [1, 1, 2, 2] : [1, 1, 2, 2, 3];
  const qty: Record<Rarity, [number, number]> = {
    common: [2, Math.min(8, 2 + lv)],
    rare: [1, lv >= 3 ? 3 : 2],
    epic: [1, lv >= 6 ? 2 : 1],
    legendary: [1, 1],
    secret: [1, 1],
  };
  return { count: counts[Math.floor(rng() * counts.length)], qty };
}

function makeOrder(s: GameState, now: number, rng: Rng, forced?: { sender: Sender; lines: OrderLine[] }): Order {
  const lv = companyLevel(s);
  const cfg = BALANCE.orders;
  const confidential = !forced && lv >= cfg.confidentialFromLevel && rng() < cfg.confidentialChance;
  const sender = forced?.sender ?? (confidential ? pick(rng, ANONYMOUS_SENDERS) : pick(rng, SENDERS));
  let lines: OrderLine[];
  if (forced) lines = forced.lines;
  else {
    // Ordinary orders: Known pills the company is ready for (everything Known can be copied for free).
    let pool = PILLS.filter((p) => isKnown(s, p.id) && orderableRarity(s, p.rarity, true, confidential));
    if (!pool.length) pool = PILLS.filter((p) => p.rarity === "common");
    const shape = orderShape(lv, rng);
    const count = Math.min(pool.length, shape.count);
    lines = [];
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      const choices = pool.filter((p) => !used.has(p.id));
      const p = choices[weightedIndex(rng, choices.map((c) => ORDER_RARITY_WEIGHT[c.rarity] * (confidential && c.rarity !== "common" ? 2 : 1)))];
      used.add(p.id);
      lines.push({ pillId: p.id, quantity: randInt(rng, shape.qty[p.rarity]), minStar: 0 });
    }
    // Sometimes: one pill the player can discover next (both parents Known), within the level's rarity limit.
    const frontier = frontierPills(s).filter((p) => orderableRarity(s, p.rarity, false, confidential));
    if (frontier.length && rng() < cfg.frontierChance) {
      const fp = pick(rng, frontier);
      lines[lines.length - 1] = { pillId: fp.id, quantity: 1, minStar: 0 };
      addDraft(s, now, {
        source: confidential ? "confidential" : "file",
        title: `Requested: ${fp.name}`,
        body: `${sender.name} asked for ${fp.name} (${RARITY_LABEL[fp.rarity]}). ` + pick(rng, FRONTIER_HINT_LINES).replace("{types}", typeList(fp)),
        pillId: fp.id,
      });
    } else if (lv >= cfg.starOrdersFromLevel && rng() < cfg.starOrderChance) {
      const commons = lines.filter((l) => PILL_BY_ID[l.pillId].rarity === "common");
      const target = commons[0] ?? lines[0];
      target.minStar = 1;
      target.quantity = 1;
    }
    const merged = new Map<string, OrderLine>();
    for (const l of lines) {
      const m = merged.get(l.pillId);
      if (m) { m.quantity += l.quantity; m.minStar = Math.max(m.minStar, l.minStar) as Star; } else merged.set(l.pillId, { ...l });
    }
    lines = [...merged.values()];
  }
  const mainType = PILL_BY_ID[lines[0].pillId].types[0];
  const confidentialFile = confidential || sender.kind === "Anonymous";
  // Short line that fits what's being asked for, and isn't already on the desk.
  const onDesk = new Set(s.orders.filter((o) => o.status === "open").map((o) => o.description));
  const linePool = confidentialFile ? CONFIDENTIAL_LINES : ORDER_LINES_BY_TYPE[mainType];
  const fresh = linePool.filter((l) => !onDesk.has(l));
  return {
    id: newId(s, "ord"),
    sender: sender.name,
    senderKind: sender.kind,
    title: confidentialFile ? "Confidential" : pick(rng, ORDER_TITLES[mainType]),
    description: pick(rng, fresh.length ? fresh : linePool),
    lines,
    ...(() => { const b = orderPayout(s, lines, confidential); return { payout: b.total, breakdown: { base: b.base, bonuses: b.bonuses } }; })(),
    createdAt: now,
    expiresAt: now + randRange(rng, cfg.deadlineMs),
    confidential: confidentialFile,
    status: "open",
  };
}

export interface LineCheck { line: OrderLine; available: number; ok: boolean }

export function checkOrder(s: GameState, orderId: string): { order: Order; lines: LineCheck[]; ready: boolean } {
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) throw new GameError("Order not found.");
  const lines = order.lines.map((line) => {
    const available = countAvailable(s, line.pillId, line.minStar);
    return { line, available, ok: available >= line.quantity };
  });
  return { order, lines, ready: order.status === "open" && lines.every((l) => l.ok) };
}

export function shipOrder(s: GameState, orderId: string, now: number, rng: Rng = Math.random): { payout: number } {
  const { order, ready } = checkOrder(s, orderId);
  if (order.status !== "open") throw new GameError(order.status === "shipped" ? "Already shipped." : "This order has expired.");
  if (now > order.expiresAt) throw new GameError("This order has expired.");
  if (!ready) throw new GameError("You don't have everything this order needs.");
  // Pick exact specimens (lowest qualifying stars first, so ★ pills are kept when not required).
  const take = new Set<string>();
  for (const line of order.lines) {
    const avail = availableSpecimens(s, line.pillId, line.minStar).filter((x) => !take.has(x.id));
    if (avail.length < line.quantity) throw new GameError("You don't have everything this order needs.");
    avail.slice(0, line.quantity).forEach((x) => take.add(x.id));
  }
  s.specimens = s.specimens.filter((x) => !take.has(x.id));
  order.status = "shipped";
  order.shippedAt = now;
  s.cash += order.payout;
  s.stats.shipments++;
  s.stats.revenue += order.payout;
  s.xp += Math.round(order.payout * BALANCE.company.xp.shipPerDollar);
  const pop = BALANCE.company.popularity;
  const rarityBonus = Math.max(...order.lines.map((l) => pop.perRarityBonus[PILL_BY_ID[l.pillId].rarity]));
  s.popularity = Math.min(pop.max, s.popularity + (pop.perShipment + rarityBonus) * EFFECTS.popularityGainMult(upgradeTier(s, "pr")));
  s.popularityUpdatedAt = now;
  s.pendingReactions.push({ at: now + randRange(rng, BALANCE.orders.reactionDelayMs), orderId: order.id });
  return { payout: order.payout };
}

export function dismissOrder(s: GameState, orderId: string) {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o) return;
  if (o.status === "open") throw new GameError("Open orders stay on the desk until shipped or expired.");
  s.orders = s.orders.filter((x) => x.id !== orderId);
}

function deliverReaction(s: GameState, orderId: string, now: number, rng: Rng) {
  const o = s.orders.find((x) => x.id === orderId);
  const sender = o?.sender ?? "A satisfied client";
  const conf = o?.confidential ?? false;
  addNews(s, now, {
    kind: "letter",
    from: sender,
    title: conf ? "A short, unsigned note" : `Letter from ${sender}`,
    body: pick(rng, conf ? REACTIONS.confidential : REACTIONS.thanks).replace("{sender}", sender),
  });
  // Sometimes a happy client orders again right away.
  const open = s.orders.filter((x) => x.status === "open").length;
  if (o && open < BALANCE.orders.maxActive && rng() < 0.3) {
    const snd = [...SENDERS, ...ANONYMOUS_SENDERS].find((x) => x.name === o.sender);
    if (snd) {
      const repeat = makeOrder(s, now, rng);
      repeat.sender = snd.name;
      repeat.senderKind = snd.kind;
      repeat.title = "Back for More";
      repeat.description = "That last batch was perfect. Again, please!";
      s.orders.push(repeat);
    }
  }
}

function publishNewspaper(s: GameState, now: number, rng: Rng) {
  const masthead = pick(rng, NEWSPAPERS.mastheads);
  const frontier = frontierPills(s);
  // Rumors give genuine hints about undiscovered recipes.
  const rumorPool = PILLS.filter((p) => p.parents && !isKnown(s, p.id) && (isKnown(s, p.parents[0]) || isKnown(s, p.parents[1])));
  if (rumorPool.length && rng() < 0.55) {
    const target = frontier.length && rng() < 0.6 ? pick(rng, frontier) : pick(rng, rumorPool);
    const knownParent = target.parents!.find((p) => isKnown(s, p))!;
    const title = `Rumor mill: what goes with ${PILL_BY_ID[knownParent].name}?`;
    const body = `Insiders whisper that ${PILL_BY_ID[knownParent].name} is one half of a ${RARITY_LABEL[target.rarity]} compound carrying ${typeList(target)} Types.`;
    addNews(s, now, { kind: "newspaper", from: masthead, title, body });
    addDraft(s, now, { source: "newspaper", title, body, pillId: target.id });
    return;
  }
  const item = pick(rng, NEWSPAPERS.ambient);
  addNews(s, now, { kind: "newspaper", from: masthead, title: item.title, body: item.body });
}

export function markNewsRead(s: GameState, id: string) {
  const n = s.news.find((x) => x.id === id);
  if (n) n.read = true;
}
export function dismissNews(s: GameState, id: string) {
  s.news = s.news.filter((x) => x.id !== id);
}

// ================================================================ mail gacha

/** Sealed-offer price: expected Quick Sell value of its pulls × a margin, so buying just to resell loses Gold. */
export function mailPrice(odds: Record<Rarity, number>, pulls: number): number {
  const total = RARITIES.reduce((a, r) => a + odds[r], 0) || 1;
  const [b, s1, s2] = BALANCE.stars.defaultWeights;
  const starEv = (b + s1 * BALANCE.values.starMult[1] + s2 * BALANCE.values.starMult[2]) / (b + s1 + s2);
  const ev = RARITIES.reduce((a, r) => a + (odds[r] / total) * BALANCE.values.quickSell[r], 0) * starEv;
  const bulk = pulls >= 3 ? BALANCE.mail.bulkDiscount : 1;
  return Math.max(5, Math.round((ev * BALANCE.mail.priceOverQuickSellEV * bulk * pulls) / 5) * 5);
}

function makeMailOffer(s: GameState, now: number, rng: Rng): MailOffer {
  const t = MAIL_TEMPLATES[weightedIndex(rng, [5, 3, 3, 2, 2])];
  return {
    id: newId(s, "mail"),
    name: t.name,
    seller: t.seller,
    blurb: t.blurb,
    price: mailPrice(t.odds, t.pulls),
    pulls: t.pulls,
    identified: t.identified,
    odds: { ...t.odds },
    starOdds: [...BALANCE.stars.defaultWeights] as [number, number, number],
    createdAt: now,
    expiresAt: now + BALANCE.mail.offerLifetimeMs,
    status: "sealed",
  };
}

/** Roll one gacha pull using exactly the advertised odds. */
export function rollMailPull(offer: Pick<MailOffer, "odds" | "starOdds">, rng: Rng): { pillId: string; star: Star; rarity: Rarity } {
  const rarity = RARITIES[weightedIndex(rng, RARITIES.map((r) => offer.odds[r]))];
  const pool = pillsOfRarity(rarity);
  const p = pool[Math.floor(rng() * pool.length)];
  return { pillId: p.id, star: rollStar(rng, offer.starOdds), rarity };
}

export function openMail(s: GameState, offerId: string, now: number, rng: Rng = Math.random): NonNullable<MailOffer["results"]> {
  const offer = s.mail.find((m) => m.id === offerId);
  if (!offer) throw new GameError("Offer not found.");
  if (offer.status !== "sealed") throw new GameError(offer.status === "opened" ? "Already opened." : "This offer has expired.");
  if (now > offer.expiresAt) throw new GameError("This offer has expired.");
  spendCash(s, offer.price);
  const results: NonNullable<MailOffer["results"]> = [];
  for (let i = 0; i < offer.pulls; i++) {
    const r = rollMailPull(offer, rng);
    let isNew = false;
    if (offer.identified) isNew = makeKnown(s, r.pillId, "mail", now);
    const sp = addSpecimen(s, r.pillId, r.star, offer.identified, "mail", now);
    results.push({ pillId: r.pillId, star: r.star, identified: sp.identified, isNew });
  }
  offer.status = "opened";
  offer.results = results;
  s.stats.mailOpened++;
  if (!offer.identified && results.some((r) => !r.identified)) {
    addDraft(s, now, { source: "document", title: "Unlabeled parcel received", body: "Some specimens arrived without labels (?). The Scanner in the Lab can try to identify them." });
  }
  return results;
}

export function dismissMail(s: GameState, offerId: string) {
  s.mail = s.mail.filter((m) => m.id !== offerId);
}

// ================================================================ HQ upgrades

export function upgradeNextTier(s: GameState, id: string) {
  const u = UPGRADE_BY_ID[id];
  if (!u) throw new GameError("Unknown upgrade.");
  return u.tiers[upgradeTier(s, id)] ?? null;
}

export function buyUpgrade(s: GameState, id: string) {
  const tier = upgradeNextTier(s, id);
  if (!tier) throw new GameError("Already fully upgraded.");
  if (companyLevel(s) < tier.level) throw new GameError(`Requires company Level ${tier.level}.`);
  if (id === "backdoor" && companyLevel(s) < BALANCE.market.unlockLevel) throw new GameError(`Requires company Level ${BALANCE.market.unlockLevel}.`);
  spendCash(s, tier.cost);
  s.upgrades[id] = upgradeTier(s, id) + 1;
  s.stats.spentUpgrades += tier.cost;
  return tier;
}

// ================================================================ company

export function inventoryValue(s: GameState): number {
  return s.specimens.reduce((sum, sp) => sum + quickSellValue(sp.pillId, sp.star), 0);
}

export function companyValue(s: GameState) {
  const inventory = inventoryValue(s);
  const equipment = UPGRADES.reduce((sum, u) => sum + u.tiers.slice(0, upgradeTier(s, u.id)).reduce((a, t) => a + t.cost, 0), 0) * 0.7 + 500;
  const discoveries = s.known.reduce((sum, id) => sum + BALANCE.values.ship[PILL_BY_ID[id].rarity] * 2, 0);
  const performance = s.stats.revenue * 0.25 + s.popularity * 20;
  const total = s.cash + inventory + equipment + discoveries + performance;
  return { total: Math.round(total), cash: s.cash, inventory: Math.round(inventory), equipment: Math.round(equipment), discoveries, performance: Math.round(performance) };
}

function recordHistory(s: GameState, now: number) {
  s.valueHistory.push({ at: now, value: companyValue(s).total });
  if (s.valueHistory.length > BALANCE.company.historyPoints) s.valueHistory.splice(0, s.valueHistory.length - BALANCE.company.historyPoints);
}

// ================================================================ BACKDOOR market

export function marketPrice(s: GameState, pillId: string, star: Star): number {
  pillDef(pillId);
  return marketReference(pillId, star) * (s.market.index[pillId] ?? 1);
}
export function listingPrice(s: GameState, l: { pillId: string; star: Star; premium: number }): number {
  return Math.max(1, Math.round(marketPrice(s, l.pillId, l.star) * l.premium));
}
export function sellPrice(s: GameState, pillId: string, star: Star): number {
  return Math.max(1, Math.floor(marketPrice(s, pillId, star) * BALANCE.market.bidRatio));
}

function clampIndex(x: number) {
  const [lo, hi] = BALANCE.market.indexRange;
  return Math.min(hi, Math.max(lo, x));
}

function marketStep(s: GameState, rng: Rng, now: number) {
  const vol = BALANCE.market.volatility;
  for (const id of PILL_IDS) {
    const cur = s.market.index[id] ?? 1;
    const shock = (rng() + rng() + rng() - 1.5) * vol * 1.4; // ~normal
    const drift = (1 - cur) * 0.04;
    const next = clampIndex(cur * Math.exp(shock + drift));
    s.market.index[id] = Number(next.toFixed(4));
    const h = (s.market.history[id] ??= []);
    h.push(s.market.index[id]);
    if (h.length > BALANCE.market.historyLength) h.splice(0, h.length - BALANCE.market.historyLength);
  }
  // Occasional hype spike → market rumor
  if (rng() < 0.12) {
    const p = pick(rng, PILLS.filter((x) => x.rarity !== "secret"));
    s.market.index[p.id] = Number(clampIndex(s.market.index[p.id] * 1.25).toFixed(4));
    if (backdoorUnlocked(s)) addDraft(s, now, { source: "market", title: `BACKDOOR chatter: ${p.name} heating up`, body: `Traders are suddenly paying more for ${p.name} (${RARITY_LABEL[p.rarity]}).`, pillId: p.id });
  }
}

const LISTING_RARITY_WEIGHT: Record<Rarity, number> = { common: 5, rare: 5, epic: 3, legendary: 1.2, secret: 0.3 };

function rotateListings(s: GameState, rng: Rng) {
  const cfg = BALANCE.market;
  const listings = [];
  const used = new Set<string>();
  for (let i = 0; i < cfg.listings; i++) {
    const choices = PILLS.filter((p) => !used.has(p.id));
    const p = choices[weightedIndex(rng, choices.map((c) => LISTING_RARITY_WEIGHT[c.rarity]))];
    used.add(p.id);
    listings.push({
      id: newId(s, "lst"),
      pillId: p.id,
      star: rollStarFor(rng, p.rarity, cfg.listingStarBoost),
      premium: Number(randRange(rng, cfg.askPremium).toFixed(3)),
      stock: randInt(rng, cfg.stock),
    });
  }
  s.market.listings = listings;
}

function pushTx(s: GameState, now: number, kind: "buy" | "sell", pillId: string, star: Star, price: number) {
  s.market.transactions.unshift({ id: newId(s, "tx"), at: now, kind, pillId, star, price });
  if (s.market.transactions.length > BALANCE.market.transactionHistory) s.market.transactions.length = BALANCE.market.transactionHistory;
}

export function buyListing(s: GameState, listingId: string, now: number) {
  if (!backdoorUnlocked(s)) throw new GameError("BACKDOOR is locked.");
  const l = s.market.listings.find((x) => x.id === listingId);
  if (!l || l.stock <= 0) throw new GameError("Sold out.");
  const price = listingPrice(s, l);
  spendCash(s, price);
  l.stock -= 1;
  const isNew = makeKnown(s, l.pillId, "backdoor", now);
  addSpecimen(s, l.pillId, l.star, true, "market", now);
  s.market.index[l.pillId] = Number(clampIndex((s.market.index[l.pillId] ?? 1) * (1 + BALANCE.market.buyImpact)).toFixed(4));
  pushTx(s, now, "buy", l.pillId, l.star, price);
  return { price, isNew };
}

export function sellPill(s: GameState, pillId: string, star: Star, now: number) {
  if (!backdoorUnlocked(s)) throw new GameError("BACKDOOR is locked.");
  const sp = s.specimens.find((x) => x.pillId === pillId && x.star === star && x.identified && !x.reservedBy);
  if (!sp) throw new GameError("No available pill to sell (reserved pills can't be sold).");
  const price = sellPrice(s, pillId, star);
  s.specimens = s.specimens.filter((x) => x.id !== sp.id);
  s.cash += price;
  s.market.index[pillId] = Number(clampIndex((s.market.index[pillId] ?? 1) * (1 - BALANCE.market.saleImpact)).toFixed(4));
  pushTx(s, now, "sell", pillId, star, price);
  return { price };
}

/** Pills rising fastest over recent history. */
export function fireList(s: GameState): { pillId: string; change: number }[] {
  return PILL_IDS.map((id) => {
    const h = s.market.history[id] ?? [1];
    const from = h[Math.max(0, h.length - 7)];
    return { pillId: id, change: (s.market.index[id] ?? 1) / from - 1 };
  })
    .filter((x) => x.change > 0.01)
    .sort((a, b) => b.change - a.change)
    .slice(0, BALANCE.market.fireListSize);
}

// ================================================================ save integrity

/** Repair a loaded save so invariants hold (no orphan reservations, no invalid pills, etc.). */
export function sanitize(s: GameState): GameState {
  s.cash = Math.max(0, Number.isFinite(s.cash) ? s.cash : 0);
  // v1.6: open orders get the new ship-value reward if it is higher; promised rewards are never reduced,
  // shipped/expired orders are untouched (no retroactive Gold).
  if ((s.econVersion ?? 0) < 2) {
    for (const o of s.orders) {
      if (o.status !== "open" || !o.lines.every((l) => PILL_BY_ID[l.pillId])) continue;
      const b = orderPayoutBreakdown(o.lines, { confidential: o.confidential, salesTier: s.upgrades?.sales ?? 0 });
      if (b.total > o.payout) { o.payout = b.total; o.breakdown = { base: b.base, bonuses: b.bonuses }; }
    }
    s.econVersion = 2;
  }
  // v1.5: the Starter tray was folded into the (now free) Copier.
  const legacyTray = (s as GameState & { freeCopier?: CopierJob | null }).freeCopier;
  if (legacyTray) {
    if (!s.copier) s.copier = { ...legacyTray, free: undefined };
    else for (const st of legacyTray.stars) addSpecimen(s, legacyTray.pillId, st, true, "copier", s.lastTickAt || Date.now());
  }
  delete (s as GameState & { freeCopier?: unknown }).freeCopier;
  // Charge was removed in v1.4: drop it from older saves.
  const legacy = s as GameState & { charge?: unknown; chargeUpdatedAt?: unknown };
  delete legacy.charge;
  delete legacy.chargeUpdatedAt;
  s.known = [...new Set(s.known.filter((id) => PILL_BY_ID[id]))];
  s.specimens = s.specimens.filter((x) => PILL_BY_ID[x.pillId]);
  const seen = new Set<string>();
  s.specimens = s.specimens.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  while (s.machines.length < BALANCE.machine.maxMachines) s.machines.push({ id: `machine_${s.machines.length + 1}`, job: null });
  const activeParents = new Map<string, string>();
  for (const m of s.machines) {
    if (m.job && !PILL_BY_ID[m.job.resultPillId]) m.job = null;
    if (m.job) for (const pid of m.job.parentSpecimenIds) activeParents.set(pid, m.id);
  }
  for (const sp of s.specimens) {
    const holder = activeParents.get(sp.id);
    if (holder) sp.reservedBy = holder;
    else delete sp.reservedBy;
    if (s.known.includes(sp.pillId)) sp.identified = true;
  }
  return s;
}
