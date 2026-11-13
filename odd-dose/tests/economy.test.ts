/**
 * v1.4 economy: no Charge, Quick Sell, free Starter tray, profitable contracts.
 * A simple honest bot (no BACKDOOR, no mail, no speed-ups, no resets) plays each "stuck" scenario.
 */
import { describe, expect, it } from "vitest";
import { BALANCE } from "../src/config/balance";
import { COMMON_IDS, PILLS, PILL_BY_ID } from "../src/data/pills";
import {
  advance, availableSpecimens, checkOrder, collectCopy, collectFreeCopy, collectMachine, copierMaxBatch, copierQuote, countExact,
  createInitialState, frontierPills, isKnown, orderCopyCost, quickSell, quickSellPrice, sanitize, sellPrice, shipOrder, startCopy,
  startFreeCopy, startMachine,
} from "../src/engine/game";
import { seeded } from "../src/engine/random";
import { RARITIES } from "../src/engine/types";
import type { GameState, Order, Rng, Star } from "../src/engine/types";

const T0 = 1_800_000_000_000;
const MIN = 60_000;

/** One honest play loop, one decision round per minute. Returns the state at the end. */
function play(s: GameState, minutes: number, rng: Rng, opts: { quickSell?: boolean } = {}) {
  let t = s.lastTickAt;
  for (let m = 0; m < minutes; m++) {
    t += MIN;
    advance(s, t, rng);
    // collect anything finished
    for (const mc of s.machines) if (mc.job && mc.job.endsAt <= t) collectMachine(s, mc.id, t);
    if (s.copier && s.copier.endsAt <= t) collectCopy(s, t);
    if (s.freeCopier && s.freeCopier.endsAt <= t) collectFreeCopy(s, t);
    // ship whatever is ready
    for (const o of s.orders.filter((x) => x.status === "open")) if (checkOrder(s, o.id).ready) shipOrder(s, o.id, t, rng);
    // what do open orders still need?
    const open = s.orders.filter((x) => x.status === "open").sort((a, b) => a.expiresAt - b.expiresAt);
    const needs = open.flatMap((o: Order) => o.lines.map((l) => ({ ...l, missing: l.quantity - availableSpecimens(s, l.pillId, l.minStar).length })))
      .filter((l) => l.missing > 0 && l.minStar === 0);
    // discover needed unknown pills in the free Machine
    const free = s.machines.slice(0, 1).find((mc) => !mc.job);
    const unknownNeed = needs.find((l) => !isKnown(s, l.pillId) && PILL_BY_ID[l.pillId].parents);
    if (free && unknownNeed) {
      const [a, b] = PILL_BY_ID[unknownNeed.pillId].parents!;
      const okA = availableSpecimens(s, a).length >= (a === b ? 2 : 1), okB = availableSpecimens(s, b).length >= 1;
      if (isKnown(s, a) && isKnown(s, b) && okA && okB) startMachine(s, free.id, a, b, t, rng);
    }
    // manufacture known needs: paid Copier when affordable, free Starter tray for starter pills
    const knownNeed = needs.find((l) => isKnown(s, l.pillId));
    if (knownNeed && !s.copier) {
      const q = Math.min(knownNeed.missing, copierMaxBatch(s));
      if (s.cash >= copierQuote(s, knownNeed.pillId, q).cost) startCopy(s, knownNeed.pillId, q, t, rng);
    }
    if (!s.freeCopier) {
      const starterNeed = needs.find((l) => COMMON_IDS.includes(l.pillId));
      startFreeCopy(s, starterNeed?.pillId ?? "happy", t, rng);
    }
    // parents for a needed discovery
    if (unknownNeed && !s.freeCopier) {
      const missingParent = PILL_BY_ID[unknownNeed.pillId].parents!.find((p) => COMMON_IDS.includes(p) && availableSpecimens(s, p).length === 0);
      if (missingParent) startFreeCopy(s, missingParent, t, rng);
    }
    // broke and nothing shippable soon: quick-sell spare starter pills
    if (opts.quickSell && s.cash < 10) {
      for (const id of COMMON_IDS) {
        const spare = countExact(s, id, 0) - needs.filter((l) => l.pillId === id).reduce((a, l) => a + l.quantity, 0);
        if (spare > 0) quickSell(s, id, 0, spare);
      }
    }
  }
  return s;
}

function broke(seed: number, mutate?: (s: GameState) => void) {
  const s = createInitialState(T0, seeded(seed));
  s.cash = 0;
  s.specimens = [];
  mutate?.(s);
  return s;
}

describe("Charge is gone", () => {
  it("new games have no Charge and the Scanner costs only Gold", () => {
    const s = createInitialState(T0);
    expect("charge" in s).toBe(false);
    expect(Object.keys(BALANCE.scanner)).not.toContain("chargeCost");
    expect((BALANCE as Record<string, unknown>).charge).toBeUndefined();
  });
});

describe("Quick Sell", () => {
  it("sells exact star tiers only, never reserved pills, and pays exactly once", () => {
    const s = createInitialState(T0, seeded(1));
    s.specimens.push({ id: "st1", pillId: "happy", star: 1, identified: true, acquiredAt: T0, source: "copier" });
    s.specimens.push({ id: "st2", pillId: "happy", star: 2, identified: true, acquiredAt: T0, source: "copier" });
    startMachine(s, "machine_1", "happy", "sad", T0); // reserves one Base Happy
    const cash = s.cash;
    expect(() => quickSell(s, "happy", 0, 2)).toThrow(/in use/); // only 1 Base Happy is free
    expect(s.cash).toBe(cash);
    const r = quickSell(s, "happy", 0, 1);
    expect(r.payout).toBe(quickSellPrice("happy", 0));
    expect(s.cash).toBe(cash + r.payout);
    expect(countExact(s, "happy", 1)).toBe(1);
    expect(countExact(s, "happy", 2)).toBe(1);
    expect(s.specimens.filter((x) => x.pillId === "happy" && x.reservedBy).length).toBe(1);
    const r1 = quickSell(s, "happy", 1, 1);
    expect(r1.payout).toBe(BALANCE.quickSell.price.common * BALANCE.quickSell.starMult[1]);
    expect(countExact(s, "happy", 2)).toBe(1);
  });
  it("works at Level 1 without BACKDOOR", () => {
    const s = createInitialState(T0);
    expect(s.upgrades.backdoor).toBeUndefined();
    expect(quickSell(s, "calm", 0, 2).sold).toBe(2);
  });
  it("pays less than contracts and BACKDOOR (at normal market prices)", () => {
    const s = createInitialState(T0);
    for (const p of PILLS) for (const star of [0, 1, 2] as Star[]) {
      s.market.index[p.id] = 1;
      expect(quickSellPrice(p.id, star)).toBeLessThan(sellPrice(s, p.id, star));
      expect(quickSellPrice(p.id, star)).toBeLessThan(BALANCE.pillValue[p.rarity] * BALANCE.stars.valueMult[star] * BALANCE.orders.payoutMult[0]);
    }
  });
  it("copying just to quick-sell always loses Gold (even counting lucky stars)", () => {
    for (const r of RARITIES) {
      const [b, s1, s2] = BALANCE.stars.defaultWeights;
      const total = b + s1 + s2;
      const ev = BALANCE.quickSell.price[r] * (b + s1 * BALANCE.quickSell.starMult[1] + s2 * BALANCE.quickSell.starMult[2]) / total;
      expect(ev).toBeLessThan(BALANCE.copier.costPerPill[r]);
    }
  });
});

describe("Starter tray (free recovery batches)", () => {
  it("makes 3 starter pills in 2 minutes for 0g, even with no pills and the paid Copier busy", () => {
    const s = broke(2);
    s.cash = 1e6; startCopy(s, "angry", 11, T0); s.cash = 0; // paid Copier busy
    const job = startFreeCopy(s, "calm", T0);
    expect(job.cost).toBe(0);
    expect(job.endsAt - T0).toBe(2 * MIN);
    expect(() => collectFreeCopy(s, T0 + MIN)).toThrow(/Still/);
    expect(collectFreeCopy(s, T0 + 2 * MIN).quantity).toBe(3);
    expect(availableSpecimens(s, "calm").length).toBe(3);
    expect(() => collectFreeCopy(s, T0 + 2 * MIN)).toThrow();
    expect(s.cash).toBe(0);
  });
  it("only the six starter pills; one batch at a time", () => {
    const s = broke(3, (x) => { x.known.push("zen"); });
    expect(() => startFreeCopy(s, "zen", T0)).toThrow(/starter/);
    startFreeCopy(s, "happy", T0);
    expect(() => startFreeCopy(s, "sad", T0)).toThrow(/busy/);
  });
  it("is a recovery path, not a money farm: tray + quick-sell alone stays modest per hour", () => {
    const s = broke(4);
    let t = T0;
    for (let i = 0; i < 30; i++) { startFreeCopy(s, "happy", t); t += 2 * MIN; collectFreeCopy(s, t); quickSell(s, "happy", 0, countExact(s, "happy", 0)); }
    expect(s.cash).toBeGreaterThan(0);
    expect(s.cash).toBeLessThan(250); // per hour; contracts pay far more
  });
  it("old saves get an empty Starter tray", () => {
    const old = createInitialState(T0) as GameState & { freeCopier?: unknown };
    delete old.freeCopier;
    expect(sanitize(JSON.parse(JSON.stringify(old))).freeCopier).toBeNull();
  });
});

describe("Contracts are profitable", () => {
  it("every order pays at least 1.6× what the Copier charges to make it", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = createInitialState(T0, seeded(seed));
      s.xp = seed * 150; // across levels
      for (const id of ["bittersweet", "zen", "focus", "love", "nirvana"]) if (!s.known.includes(id)) s.known.push(id);
      for (let i = 0; i < 6; i++) { s.nextOrderAt = s.lastTickAt; s.orders = s.orders.filter((o) => o.status !== "open"); advance(s, s.lastTickAt + 1, seeded(seed * 100 + i)); }
      for (const o of s.orders) expect(o.payout).toBeGreaterThanOrEqual(Math.floor(orderCopyCost(o.lines) * BALANCE.orders.minPayoutOverCopyCost));
    }
  });
  it("early orders only ask for Known pills or one-step discoveries from Known pills", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = createInitialState(T0, seeded(seed));
      const frontier = new Set(frontierPills(s).map((p) => p.id));
      advance(s, T0 + 3 * 3_600_000, seeded(seed));
      for (const o of s.orders) for (const l of o.lines) expect(isKnown(s, l.pillId) || frontier.has(l.pillId)).toBe(true);
      for (const o of s.orders.filter((x) => x.status === "open")) expect(o.expiresAt - o.createdAt).toBeGreaterThanOrEqual(BALANCE.orders.deadlineMs[0]);
    }
  });
});

describe("Never stuck: every scenario has a route to more Gold (no BACKDOOR, no purchases)", () => {
  const scenarios: [string, (seed: number) => GameState][] = [
    ["0g and no inventory", (seed) => broke(seed)],
    ["0g with several Known recipes", (seed) => broke(seed, (s) => { s.known.push("bittersweet", "zen", "flow", "focus"); })],
    ["multiple unfinished contracts", (seed) => broke(seed, (s) => { for (let i = 0; i < 3; i++) { s.nextOrderAt = s.lastTickAt; advance(s, s.lastTickAt + 1, seeded(seed + i)); } })],
    ["an occupied Machine", (seed) => broke(seed, (s) => {
      s.specimens.push({ id: "p1", pillId: "fear", star: 0, identified: true, acquiredAt: T0, source: "start" }, { id: "p2", pillId: "fear", star: 0, identified: true, acquiredAt: T0, source: "start" });
      startMachine(s, "machine_1", "fear", "fear", T0);
      s.machines[0].job!.endsAt = T0 + 10 * 3_600_000; // stuck busy for 10 hours
    })],
    ["an occupied Copier", (seed) => broke(seed, (s) => {
      s.cash = 1e6; startCopy(s, "angry", 11, T0); s.cash = 0;
      s.copier!.endsAt = T0 + 10 * 3_600_000; // stuck busy for 10 hours
    })],
  ];
  for (const [name, make] of scenarios) {
    it(name, () => {
      for (const seed of [11, 22, 33]) {
        const s = make(seed);
        const start = s.cash;
        play(s, 120, seeded(seed), { quickSell: true });
        expect(s.cash, `${name} seed ${seed}`).toBeGreaterThan(start);
        expect(s.upgrades.backdoor).toBeUndefined();
      }
    });
  }
  it("a fresh player grows steadily over a few hours by doing contracts", () => {
    const s = createInitialState(T0, seeded(7));
    play(s, 240, seeded(7));
    expect(s.stats.shipments).toBeGreaterThanOrEqual(5);
    expect(s.cash).toBeGreaterThan(BALANCE.start.cash);
  });
});
