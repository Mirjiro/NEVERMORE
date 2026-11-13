/**
 * v1.5 economy: the Copier is free; Gold comes from contracts and Quick Sell; rushing never mints Gold;
 * ordinary orders fit the player's progress. A no-cheats bot plays every "stuck" scenario using the real engine.
 */
import { describe, expect, it } from "vitest";
import { BALANCE } from "../src/config/balance";
import { COMMON_IDS, PILLS, PILL_BY_ID } from "../src/data/pills";
import { ORDER_LINES_BY_TYPE, CONFIDENTIAL_LINES } from "../src/data/content";
import {
  advance, availableSpecimens, buyUpgrade, checkOrder, collectCopy, collectMachine, companyLevel, copierMaxBatch, copierQuote,
  copierSpeedUpCost, countExact, createInitialState, frontierPills, instantSaleValue, isKnown, machineSpeedUpCost, orderCopyTime,
  quickSell, quickSellPrice, sanitize, shipOrder, startCopy, startMachine,
} from "../src/engine/game";
import { seeded } from "../src/engine/random";
import { RARITIES } from "../src/engine/types";
import type { CopierJob, GameState, Order, Rng, Star } from "../src/engine/types";

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

/** Honest play, one decision round per minute: no BACKDOOR, no mail, no speed-ups, no edits. */
function play(s: GameState, minutes: number, rng: Rng, opts: { sellSpare?: boolean } = { sellSpare: true }) {
  let t = s.lastTickAt;
  for (let m = 0; m < minutes; m++) {
    t += MIN;
    advance(s, t, rng);
    for (const mc of s.machines) if (mc.job && mc.job.endsAt <= t) collectMachine(s, mc.id, t);
    if (s.copier && s.copier.endsAt <= t) collectCopy(s, t);
    for (const o of s.orders.filter((x) => x.status === "open")) if (checkOrder(s, o.id).ready) shipOrder(s, o.id, t, rng);
    const open = s.orders.filter((x) => x.status === "open").sort((a, b) => a.expiresAt - b.expiresAt);
    const needs = open.flatMap((o: Order) => o.lines.map((l) => ({ ...l, missing: l.quantity - availableSpecimens(s, l.pillId, l.minStar).length })))
      .filter((l) => l.missing > 0 && l.minStar === 0);
    // Breed a needed undiscovered pill when its parents are on hand.
    const freeMachine = s.machines.slice(0, 1).find((mc) => !mc.job);
    const unknownNeed = needs.find((l) => !isKnown(s, l.pillId) && PILL_BY_ID[l.pillId].parents);
    if (freeMachine && unknownNeed) {
      const [a, b] = PILL_BY_ID[unknownNeed.pillId].parents!;
      const okA = availableSpecimens(s, a).length >= (a === b ? 2 : 1), okB = availableSpecimens(s, b).length >= 1;
      if (isKnown(s, a) && isKnown(s, b) && okA && okB) startMachine(s, freeMachine.id, a, b, t, rng);
    }
    // Free Copier: make what orders need (incl. missing parents), otherwise something to sell.
    if (!s.copier) {
      const parentNeed = unknownNeed && PILL_BY_ID[unknownNeed.pillId].parents!.find((p) => isKnown(s, p) && availableSpecimens(s, p).length < 2);
      const target = needs.find((l) => isKnown(s, l.pillId))?.pillId ?? parentNeed ?? "happy";
      startCopy(s, target, copierMaxBatch(s, target), t, rng);
    }
    // Sell spare pills nobody has asked for.
    if (opts.sellSpare) {
      for (const p of PILLS) {
        if (!isKnown(s, p.id)) continue;
        const wanted = needs.filter((l) => l.pillId === p.id).reduce((a, l) => a + l.quantity, 0) + 2; // keep a couple for breeding
        const spare = countExact(s, p.id, 0) - wanted;
        if (spare > 0) quickSell(s, p.id, 0, spare);
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

describe("The Copier is free", () => {
  it("copies any Known pill at 0g with no pills owned, for every rarity", () => {
    const s = broke(1, (x) => { x.known = PILLS.map((p) => p.id); });
    let t = T0;
    for (const r of RARITIES) {
      const p = PILLS.find((x) => x.rarity === r)!;
      const job = startCopy(s, p.id, copierMaxBatch(s, p.id), t);
      expect(job.cost).toBe(0);
      expect(s.cash).toBe(0);
      t = job.endsAt;
      expect(collectCopy(s, t).quantity).toBe(copierMaxBatch(s, p.id));
    }
  });
  it("rarer pills come in smaller, slower batches; upgrades raise both limits", () => {
    const s = createInitialState(T0);
    const per = (id: string) => copierQuote(s, id, 1).ms;
    expect(copierMaxBatch(s, "happy")).toBeGreaterThan(copierMaxBatch(s, "zen"));
    expect(copierMaxBatch(s, "zen")).toBeGreaterThan(copierMaxBatch(s, "love"));
    expect(per("love")).toBeGreaterThan(per("zen"));
    expect(per("zen")).toBeGreaterThan(per("happy"));
    s.upgrades.copierBatch = 1; s.upgrades.copierSpeed = 1;
    expect(copierMaxBatch(s, "happy")).toBe(22);
    expect(copierQuote(s, "happy", 11).ms).toBeLessThan(180_000);
  });
  it("still has a real timer — no instant duplication", () => {
    const s = broke(2);
    startCopy(s, "happy", 1, T0);
    expect(() => collectCopy(s, T0)).toThrow(/Still/);
    expect(() => startCopy(s, "sad", 1, T0)).toThrow(/already running/);
  });
});

describe("Rushing can never mint Gold", () => {
  it("Copier: rush cost always exceeds what the rushed batch sells for instantly (Quick Sell or BACKDOOR at peak prices)", () => {
    for (const r of RARITIES) {
      const s = createInitialState(T0, seeded(3));
      s.known = PILLS.map((p) => p.id);
      s.xp = 1e6; s.cash = 1e9; buyUpgrade(s, "backdoor");
      const p = PILLS.find((x) => x.rarity === r)!;
      s.market.index[p.id] = BALANCE.market.indexRange[1]; // best possible market
      const n = copierMaxBatch(s, p.id);
      startCopy(s, p.id, n, T0);
      const cost = copierSpeedUpCost(s, T0);
      // Expected value of the batch including lucky stars:
      const [b, s1, s2] = BALANCE.stars.defaultWeights, tot = b + s1 + s2;
      const ev = n * (b * instantSaleValue(s, p.id, 0) + s1 * instantSaleValue(s, p.id, 1) + s2 * instantSaleValue(s, p.id, 2)) / tot;
      expect(cost, r).toBeGreaterThan(ev);
    }
  });
  it("Machine: rushing an identical-pair breed costs more than the result sells for", () => {
    for (const r of RARITIES) {
      const s = createInitialState(T0, seeded(4));
      const p = PILLS.find((x) => x.rarity === r)!;
      s.known.push(p.id);
      s.specimens.push({ id: "a", pillId: p.id, star: 0, identified: true, acquiredAt: T0, source: "reward" }, { id: "b", pillId: p.id, star: 0, identified: true, acquiredAt: T0, source: "reward" });
      startMachine(s, "machine_1", p.id, p.id, T0);
      expect(machineSpeedUpCost(s, "machine_1", T0), r).toBeGreaterThan(quickSellPrice(p.id, 0));
    }
  });
  it("a bot that rushes every Copier batch and quick-sells it only loses Gold", () => {
    const s = createInitialState(T0, seeded(5));
    s.cash = 5000;
    let t = T0;
    for (let i = 0; i < 50 && s.cash > 100; i++) {
      startCopy(s, "happy", 11, t);
      const cost = copierSpeedUpCost(s, t);
      if (s.cash < cost) break;
      s.cash -= cost; s.copier!.endsAt = t;
      collectCopy(s, t);
      quickSell(s, "happy", 0, countExact(s, "happy", 0));
      t += 1000;
    }
    expect(s.cash).toBeLessThan(5000);
  });
});

describe("Quick Sell", () => {
  it("exact star tier only, never reserved pills, pays exactly once, at Level 1", () => {
    const s = createInitialState(T0, seeded(1));
    s.specimens.push({ id: "st1", pillId: "happy", star: 1, identified: true, acquiredAt: T0, source: "copier" });
    startMachine(s, "machine_1", "happy", "sad", T0);
    const cash = s.cash;
    expect(() => quickSell(s, "happy", 0, 2)).toThrow(/in use/);
    expect(s.cash).toBe(cash);
    const r = quickSell(s, "happy", 0, 1);
    expect(s.cash).toBe(cash + r.payout);
    expect(countExact(s, "happy", 1)).toBe(1);
  });
  it("contracts pay clearly better than Quick Sell", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = createInitialState(T0, seeded(seed));
      s.xp = seed * 200;
      s.known.push("bittersweet", "zen", "focus", "love");
      for (let i = 0; i < 5; i++) { s.nextOrderAt = s.lastTickAt; s.orders = s.orders.filter((o) => o.status !== "open"); advance(s, s.lastTickAt + 1, seeded(seed * 7 + i)); }
      for (const o of s.orders) {
        const quick = o.lines.reduce((a, l) => a + l.quantity * quickSellPrice(l.pillId, l.minStar), 0);
        expect(o.payout).toBeGreaterThanOrEqual(quick * BALANCE.orders.minPayoutOverQuickSell);
      }
    }
  });
});

describe("Order generation fits the player's progress", () => {
  /** Generate many ordinary orders for a player at `level` who knows `known`. */
  function ordersAt(level: number, known: string[], n = 120) {
    const out: { s: GameState; o: Order }[] = [];
    for (let seed = 1; out.length < n; seed++) {
      const s = createInitialState(T0, seeded(seed));
      s.xp = BALANCE.company.levelXp[level - 1];
      for (const k of known) if (!s.known.includes(k)) s.known.push(k);
      s.nextOrderAt = s.lastTickAt;
      s.orders = [];
      advance(s, s.lastTickAt + 1, seeded(seed * 13));
      for (const o of s.orders) out.push({ s, o });
    }
    return out;
  }
  const L3_KNOWN = ["bittersweet", "pride", "zen", "despair", "violent", "melancholy", "thrill", "ruin" /* Known Epic via gacha */];

  it("Levels 1–3: no undiscovered Epics, no Known Epics, Commons and accessible Rares only", () => {
    for (const lv of [1, 2, 3]) {
      for (const { s, o } of ordersAt(lv, L3_KNOWN)) {
        expect(companyLevel(s)).toBe(lv);
        for (const l of o.lines) {
          const p = PILL_BY_ID[l.pillId];
          const ok = p.rarity === "common" || (p.rarity === "rare" && (isKnown(s, p.id) || frontierPills(s).some((f) => f.id === p.id)));
          if (!o.confidential) expect(ok, `L${lv} ${p.name}`).toBe(true);
          if (!isKnown(s, p.id)) expect(["rare", "epic"]).toContain(p.rarity); // special requests may stretch one tier
          if (!isKnown(s, p.id) && !o.confidential) expect(p.rarity).toBe("rare");
        }
      }
    }
  });
  it("the reported order (Ruin ×2 + Happy ×5 at Level 3) can no longer be generated as an ordinary order", () => {
    for (const { o } of ordersAt(3, L3_KNOWN, 300)) if (!o.confidential) expect(o.lines.some((l) => l.pillId === "ruin")).toBe(false);
  });
  it("size scales with level", () => {
    const avgQty = (lv: number) => { const os = ordersAt(lv, L3_KNOWN, 150).map((x) => x.o); return os.reduce((a, o) => a + o.lines.reduce((b, l) => b + l.quantity, 0), 0) / os.length; };
    expect(avgQty(6)).toBeGreaterThan(avgQty(1));
    for (const { o } of ordersAt(1, [])) expect(o.lines.length).toBeLessThanOrEqual(2);
  });
  it("deadlines are easily achievable with one free Copier", () => {
    for (const lv of [1, 3, 6, 9]) for (const { s, o } of ordersAt(lv, L3_KNOWN, 60)) {
      expect(orderCopyTime(s, o.lines)).toBeLessThan((o.expiresAt - o.createdAt) / 10);
    }
  });
  it("descriptions fit the request and don't repeat across the desk", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createInitialState(T0, seeded(seed));
      s.xp = 2000;
      for (let i = 0; i < 5; i++) { s.nextOrderAt = s.lastTickAt; advance(s, s.lastTickAt + 1, seeded(seed + i * 31)); }
      const open = s.orders.filter((o) => o.status === "open");
      expect(new Set(open.map((o) => o.description)).size).toBe(open.length);
      for (const o of open.filter((x) => x.createdAt > T0)) {
        const pool = o.confidential ? CONFIDENTIAL_LINES : ORDER_LINES_BY_TYPE[PILL_BY_ID[o.lines[0].pillId].types[0]];
        expect(pool).toContain(o.description);
      }
    }
  });
});

describe("Never stuck: every state has a natural route to Gold", () => {
  const scenarios: [string, (seed: number) => GameState][] = [
    ["0g and zero owned pills", (seed) => broke(seed)],
    ["0g and an occupied Machine", (seed) => broke(seed, (s) => {
      s.specimens.push({ id: "p1", pillId: "fear", star: 0, identified: true, acquiredAt: T0, source: "start" }, { id: "p2", pillId: "fear", star: 0, identified: true, acquiredAt: T0, source: "start" });
      startMachine(s, "machine_1", "fear", "fear", T0);
      s.machines[0].job!.endsAt = T0 + 10 * HOUR;
    })],
    ["0g with BACKDOOR locked and Known recipes", (seed) => broke(seed, (s) => { s.known.push("bittersweet", "zen", "flow", "focus"); s.xp = BALANCE.company.levelXp[4]; })],
    ["several orders needing undiscovered pills", (seed) => broke(seed, (s) => {
      s.orders = ["void", "ruin", "love", "heroism", "nirvana"].map((id, i) => ({ id: `ord_x${i}`, sender: "X", senderKind: "Company", title: "Hard", description: "x", lines: [{ pillId: id, quantity: 2, minStar: 0 as Star }], payout: 900, createdAt: T0, expiresAt: T0 + 48 * HOUR, confidential: false, status: "open" as const }));
      s.nextOrderAt = T0 + 30 * HOUR; // no fresh orders for a while
    })],
    ["the Copier busy with another batch", (seed) => broke(seed, (s) => { s.known.push("zen"); startCopy(s, "zen", copierMaxBatch(s, "zen"), T0); })],
  ];
  for (const [name, make] of scenarios) {
    it(name, () => {
      for (const seed of [11, 22, 33]) {
        const s = make(seed);
        play(s, 90, seeded(seed));
        expect(s.cash, `${name} seed ${seed}`).toBeGreaterThan(0);
        expect(s.upgrades.backdoor).toBeUndefined();
      }
    });
  }

  it("a returning player whose save was financially stuck (Level 3, 38g) recovers and progresses", () => {
    const s = createInitialState(T0 - 5 * HOUR, seeded(9));
    s.xp = BALANCE.company.levelXp[2] + 40;
    s.cash = 38;
    s.known.push("bittersweet", "pride", "despair", "violent");
    s.specimens = s.specimens.slice(0, 3);
    s.orders = [{ id: "ord_stuck", sender: "X", senderKind: "Company", title: "Old", description: "x", lines: [{ pillId: "ruin", quantity: 2, minStar: 0 }, { pillId: "happy", quantity: 5, minStar: 0 }], payout: 600, createdAt: T0 - 5 * HOUR, expiresAt: T0 + 40 * HOUR, confidential: false, status: "open" }];
    // the old Starter tray had a batch running; it is folded into the Copier on load
    (s as GameState & { freeCopier: CopierJob }).freeCopier = { jobId: "cp_old", pillId: "calm", quantity: 3, stars: [0, 0, 0], cost: 0, startedAt: T0 - MIN, endsAt: T0 + MIN, free: true };
    const loaded = sanitize(JSON.parse(JSON.stringify(s)));
    expect("freeCopier" in loaded).toBe(false);
    expect(loaded.copier?.pillId).toBe("calm");
    loaded.lastTickAt = T0;
    play(loaded, 4 * 60, seeded(9));
    expect(loaded.cash).toBeGreaterThan(300); // enough for real purchases (e.g. the Scanner)
    expect(loaded.stats.shipments).toBeGreaterThanOrEqual(3);
    buyUpgrade(loaded, "scanner");
    expect(loaded.upgrades.scanner).toBe(1);
  });

  it("from 0g and nothing: free copies → quick sell/ship → first upgrade, without intervention", () => {
    const s = broke(12);
    play(s, 3 * 60, seeded(12));
    expect(s.stats.shipments).toBeGreaterThanOrEqual(2);
    expect(s.cash).toBeGreaterThanOrEqual(300);
  });

  it("migration: a Starter tray batch running alongside a Copier batch is delivered, nothing lost", () => {
    const s = createInitialState(T0, seeded(1));
    startCopy(s, "sad", 5, T0);
    (s as GameState & { freeCopier: CopierJob }).freeCopier = { jobId: "cp_t", pillId: "angry", quantity: 3, stars: [0, 1, 0], cost: 0, startedAt: T0, endsAt: T0 + MIN, free: true };
    const before = countExact(s, "angry", 0) + countExact(s, "angry", 1);
    const loaded = sanitize(JSON.parse(JSON.stringify(s)));
    expect(loaded.copier?.pillId).toBe("sad");
    expect(countExact(loaded, "angry", 0) + countExact(loaded, "angry", 1)).toBe(before + 3);
    expect(countExact(loaded, "angry", 1)).toBe(1);
  });

  it("starter Commons stay copyable forever (they're always Known)", () => {
    const s = broke(13);
    for (const id of COMMON_IDS) expect(isKnown(s, id)).toBe(true);
  });
});
