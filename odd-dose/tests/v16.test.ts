/** v1.6 Gold economy & shipping rebalance — runs the real engine. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BALANCE } from "../src/config/balance";
import { MAIL_TEMPLATES } from "../src/data/content";
import { PILLS, PILL_BY_ID } from "../src/data/pills";
import {
  advance, availableSpecimens, buyListing, buyUpgrade, checkOrder, collectCopy, collectMachine, companyLevel, copierMaxBatch, countExact,
  createInitialState, isKnown, listingPrice, mailPrice, quickSell, sanitize, sellPrice, shipOrder, startCopy, startMachine,
} from "../src/engine/game";
import { seeded } from "../src/engine/random";
import { orderPayoutBreakdown, quickSellValue, shipValue } from "../src/engine/values";
import { RARITIES } from "../src/engine/types";
import type { GameState, Order, OrderLine, Rng, Star } from "../src/engine/types";
import { parseSave } from "../src/store/persistence";

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

/** Honest player: ship what's ready, copy exactly what orders need, breed needed discoveries, sell spares. */
function play(s: GameState, minutes: number, rng: Rng) {
  let t = s.lastTickAt;
  for (let m = 0; m < minutes; m++) {
    t += MIN;
    advance(s, t, rng);
    for (const mc of s.machines) if (mc.job && mc.job.endsAt <= t) collectMachine(s, mc.id, t);
    if (s.copier && s.copier.endsAt <= t) collectCopy(s, t);
    for (const o of s.orders.filter((x) => x.status === "open")) if (checkOrder(s, o.id).ready) shipOrder(s, o.id, t, rng);
    const open = s.orders.filter((x) => x.status === "open").sort((a, b) => a.expiresAt - b.expiresAt);
    const needs = open.flatMap((o: Order) => o.lines.map((l) => ({ ...l, missing: l.quantity - availableSpecimens(s, l.pillId, l.minStar).length }))).filter((l) => l.missing > 0 && l.minStar === 0);
    const unknownNeed = needs.find((l) => !isKnown(s, l.pillId) && PILL_BY_ID[l.pillId].parents);
    const free = s.machines.slice(0, 1).find((mc) => !mc.job);
    if (free && unknownNeed) {
      const [a, b] = PILL_BY_ID[unknownNeed.pillId].parents!;
      if (isKnown(s, a) && isKnown(s, b) && availableSpecimens(s, a).length >= (a === b ? 2 : 1) && availableSpecimens(s, b).length >= 1) startMachine(s, free.id, a, b, t, rng);
    }
    if (!s.copier) {
      const need = needs.find((l) => isKnown(s, l.pillId));
      const parent = unknownNeed && PILL_BY_ID[unknownNeed.pillId].parents!.find((p) => isKnown(s, p) && availableSpecimens(s, p).length < 2);
      if (need) startCopy(s, need.pillId, Math.min(need.missing, copierMaxBatch(s, need.pillId)), t, rng);
      else if (parent) startCopy(s, parent, 2, t, rng);
      else startCopy(s, "happy", copierMaxBatch(s, "happy"), t, rng);
    }
    for (const p of PILLS) {
      if (!isKnown(s, p.id)) continue;
      const wanted = open.flatMap((o) => o.lines).filter((l) => l.pillId === p.id).reduce((a, l) => a + l.quantity, 0) + 2;
      const spare = countExact(s, p.id, 0) - wanted;
      if (spare > 0) quickSell(s, p.id, 0, spare);
    }
  }
  return s;
}

const line = (pillId: string, quantity: number, minStar: Star = 0): OrderLine => ({ pillId, quantity, minStar });

describe("Central pill values", () => {
  it("match the target table", () => {
    expect(BALANCE.values.quickSell).toEqual({ common: 15, rare: 75, epic: 400, legendary: 1600, secret: 6000 });
    expect(BALANCE.values.ship).toEqual({ common: 40, rare: 200, epic: 950, legendary: 3800, secret: 14000 });
  });
  it("shipping beats Quick Sell for every rarity and star tier; higher rarity is worth meaningfully more", () => {
    let prevShip = 0, prevQuick = 0;
    for (const r of RARITIES) {
      const id = PILLS.find((p) => p.rarity === r)!.id;
      for (const star of [0, 1, 2] as Star[]) expect(shipValue(id, star)).toBeGreaterThan(quickSellValue(id, star) * 2);
      expect(shipValue(id)).toBeGreaterThan(prevShip * 3);
      expect(quickSellValue(id)).toBeGreaterThan(prevQuick * 3);
      prevShip = shipValue(id); prevQuick = quickSellValue(id);
    }
  });
  it("stars are worth considerably more, with the same multiplier everywhere", () => {
    expect(quickSellValue("happy", 1)).toBe(15 * BALANCE.values.starMult[1]);
    expect(quickSellValue("happy", 2)).toBe(15 * BALANCE.values.starMult[2]);
    expect(shipValue("happy", 1) / shipValue("happy")).toBe(quickSellValue("happy", 1) / quickSellValue("happy"));
    expect(BALANCE.values.starMult[1]).toBeGreaterThanOrEqual(4);
    expect(BALANCE.values.starMult[2]).toBeGreaterThan(BALANCE.values.starMult[1] * 3);
  });
});

describe("Order rewards = Σ ship value × quantity", () => {
  it("HOT UNDER THE COLLAR: Angry ×3 + Manic ×1 = 320g", () => {
    expect(orderPayoutBreakdown([line("angry", 3), line("manic", 1)]).total).toBe(320);
  });
  it("FOR THE BLUES: Ruin ×2 + Happy ×5 = 2,100g", () => {
    expect(orderPayoutBreakdown([line("ruin", 2), line("happy", 5)]).total).toBe(2100);
  });
  it("bonuses are labelled and exact (Confidential premium, Sales Team)", () => {
    const b = orderPayoutBreakdown([line("angry", 3), line("manic", 1)], { confidential: true, salesTier: 1 });
    expect(b.base).toBe(320);
    expect(b.bonuses.map((x) => x.label)).toEqual([`Confidential premium ×${BALANCE.orders.confidentialPayoutBonus}`, "Sales Team +10%"]);
    expect(b.total).toBe(320 + b.bonuses[0].amount + 32);
  });
  it("generated orders carry exactly that reward (no random or hidden adjustments)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = createInitialState(T0, seeded(seed));
      s.xp = seed * 60;
      for (let i = 0; i < 4; i++) { s.nextOrderAt = s.lastTickAt; s.orders = s.orders.filter((o) => o.status !== "open"); advance(s, s.lastTickAt + 1, seeded(seed * 3 + i)); }
      for (const o of s.orders) {
        const b = orderPayoutBreakdown(o.lines, { confidential: o.confidential, salesTier: s.upgrades.sales ?? 0 });
        expect(o.payout).toBe(b.total);
        expect(o.breakdown?.base).toBe(b.base);
      }
    }
  });
  it("a ★ order pays the star premium and consumes the ★ specimen, not Base", () => {
    const s = createInitialState(T0, seeded(1));
    s.specimens.push({ id: "s1", pillId: "happy", star: 1, identified: true, acquiredAt: T0, source: "copier" });
    const b = orderPayoutBreakdown([line("happy", 1, 1)]);
    s.orders.push({ id: "ord_s", sender: "X", senderKind: "Customer", title: "t", description: "d", lines: [line("happy", 1, 1)], payout: b.total, createdAt: T0, expiresAt: T0 + 9 * HOUR, confidential: false, status: "open" });
    const cash = s.cash;
    shipOrder(s, "ord_s", T0);
    expect(s.cash - cash).toBe(40 * BALANCE.values.starMult[1]);
    expect(countExact(s, "happy", 1)).toBe(0);
    expect(countExact(s, "happy", 0)).toBe(2);
  });
});

describe("Existing saves", () => {
  function oldSave(): GameState {
    const s = createInitialState(T0, seeded(2));
    delete s.econVersion;
    s.orders = [
      { id: "o_low", sender: "X", senderKind: "Company", title: "t", description: "d", lines: [line("angry", 3), line("manic", 1)], payout: 75, createdAt: T0, expiresAt: T0 + 9 * HOUR, confidential: false, status: "open" },
      { id: "o_high", sender: "X", senderKind: "Company", title: "t", description: "d", lines: [line("happy", 1)], payout: 999, createdAt: T0, expiresAt: T0 + 9 * HOUR, confidential: false, status: "open" },
      { id: "o_done", sender: "X", senderKind: "Company", title: "t", description: "d", lines: [line("calm", 2)], payout: 25, createdAt: T0, expiresAt: T0 + 9 * HOUR, confidential: false, status: "shipped", shippedAt: T0 },
    ];
    return s;
  }
  it("open orders are raised to the new reward, never reduced; shipped orders untouched; nothing else changes", () => {
    const old = oldSave();
    const before = JSON.parse(JSON.stringify(old)) as GameState;
    const s = sanitize(JSON.parse(JSON.stringify(old)));
    expect(s.orders.find((o) => o.id === "o_low")!.payout).toBe(320);
    expect(s.orders.find((o) => o.id === "o_high")!.payout).toBe(999);
    expect(s.orders.find((o) => o.id === "o_done")!.payout).toBe(25);
    expect(s.cash).toBe(before.cash);
    expect(s.specimens).toEqual(before.specimens);
    expect(s.known).toEqual(before.known);
    expect(s.xp).toBe(before.xp);
    expect(s.orders.map((o) => [o.id, o.expiresAt, o.lines])).toEqual(before.orders.map((o) => [o.id, o.expiresAt, o.lines]));
  });
  it("the migration also runs through the real save loader (parseSave), not only sanitize", () => {
    const s = parseSave(JSON.stringify(oldSave()));
    expect(s.orders.find((o) => o.id === "o_low")!.payout).toBe(320);
    expect(s.econVersion).toBe(2);
  });
  it("migration runs once (later reloads never re-price)", () => {
    const s = sanitize(JSON.parse(JSON.stringify(oldSave())));
    s.orders[0].payout = 10; // e.g. a later rule change — must not be touched again
    expect(sanitize(JSON.parse(JSON.stringify(s))).orders[0].payout).toBe(10);
    expect(parseSave(JSON.stringify(s)).orders[0].payout).toBe(10);
  });
  it("the real v1.0 save fixture still loads and plays", () => {
    const st = parseSave(readFileSync(new URL("./fixtures/save-v1.0.json", import.meta.url), "utf8"));
    expect(st.econVersion).toBe(2);
    play(st, 30, seeded(3));
    expect(st.cash).toBeGreaterThan(0);
  });
});

describe("No duplication or arbitrage", () => {
  it("BACKDOOR buy → Quick Sell or → BACKDOOR sell always loses", () => {
    const s = createInitialState(T0, seeded(8));
    s.cash = 1e9; s.xp = 1e6; buyUpgrade(s, "backdoor");
    for (let round = 0; round < 30; round++) {
      advance(s, s.market.nextRotateAt + 1, seeded(round));
      for (const l of s.market.listings) {
        s.market.index[l.pillId] = BALANCE.market.indexRange[0]; // cheapest possible market
        const ask = listingPrice(s, l);
        expect(quickSellValue(l.pillId, l.star)).toBeLessThan(ask);
        expect(sellPrice(s, l.pillId, l.star)).toBeLessThan(ask);
        while (l.stock > 0) { const c = s.cash; buyListing(s, l.id, s.lastTickAt); quickSell(s, l.pillId, l.star, 1); expect(s.cash).toBeLessThan(c); }
      }
    }
  });
  it("mail offers cost more than their pulls' expected Quick Sell value", () => {
    for (const t of MAIL_TEMPLATES) {
      const total = RARITIES.reduce((a, r) => a + t.odds[r], 0);
      const ev = RARITIES.reduce((a, r) => a + (t.odds[r] / total) * BALANCE.values.quickSell[r], 0) * 1.09; // incl. lucky stars
      expect(mailPrice(t.odds, t.pulls)).toBeGreaterThan(ev * t.pulls);
    }
  });
});

describe("Gameplay simulations (no cheats, BACKDOOR locked)", () => {
  const fresh = (seed: number) => createInitialState(T0, seeded(seed));
  it("1+10. a new Level 1 player reaches Level 5 through normal play in a sensible time", () => {
    const s = fresh(7);
    let hit5 = 0;
    for (let q = 1; q <= 48 && !hit5; q++) { play(s, 15, seeded(7 + q)); if (companyLevel(s) >= 5) hit5 = q / 4; }
    expect(hit5).toBeGreaterThanOrEqual(3);  // not trivial
    expect(hit5).toBeLessThanOrEqual(12);    // not a grind (for a perfect, always-on player)
    expect(s.upgrades.backdoor).toBeUndefined();
  });
  it("2. a Level 3 player with 38g recovers and earns", () => {
    const s = fresh(9);
    s.xp = BALANCE.company.levelXp[2]; s.cash = 38;
    play(s, 60, seeded(9));
    expect(s.cash).toBeGreaterThan(300);
  });
  it("3+8. 0g and no inventory: free copies + Quick Sell recover Gold", () => {
    const s = fresh(10);
    s.cash = 0; s.specimens = []; s.orders = []; s.nextOrderAt = T0 + 10 * HOUR; // no orders at all
    play(s, 60, seeded(10));
    expect(s.cash).toBeGreaterThan(150);
  });
  it("5. manufacturing and shipping Commons pays well per hour of Copier time", () => {
    const s = fresh(11);
    s.cash = 0;
    play(s, 120, seeded(11));
    expect(s.stats.shipments).toBeGreaterThanOrEqual(6);
    expect(s.stats.revenue).toBeGreaterThan(1000);
  });
  it("6. discovering and shipping a Rare and an Epic", () => {
    const s = fresh(12);
    s.xp = BALANCE.company.levelXp[4]; // Level 5: Epic discoveries allowed in ordinary orders
    s.known.push("zen", "shock");      // Enlightenment = Zen + Shock is one step away
    s.specimens.push({ id: "z", pillId: "zen", star: 0, identified: true, acquiredAt: T0, source: "reward" }, { id: "k", pillId: "shock", star: 0, identified: true, acquiredAt: T0, source: "reward" });
    s.orders = [
      { id: "o_rare", sender: "X", senderKind: "Researcher", title: "t", description: "d", lines: [line("bittersweet", 1)], payout: orderPayoutBreakdown([line("bittersweet", 1)]).total, createdAt: T0, expiresAt: T0 + 24 * HOUR, confidential: false, status: "open" },
      { id: "o_epic", sender: "X", senderKind: "Researcher", title: "t", description: "d", lines: [line("enlightenment", 1)], payout: orderPayoutBreakdown([line("enlightenment", 1)]).total, createdAt: T0, expiresAt: T0 + 24 * HOUR, confidential: false, status: "open" },
    ];
    const cash = s.cash;
    play(s, 120, seeded(12));
    expect(s.orders.find((o) => o.id === "o_rare")!.status).toBe("shipped");
    expect(s.orders.find((o) => o.id === "o_epic")!.status).toBe("shipped");
    expect(s.cash - cash).toBeGreaterThanOrEqual(1150);
  });
  it("7. selling ★ and ★★ through Quick Sell pays the premium for exactly that tier", () => {
    const s = fresh(13);
    s.specimens.push({ id: "a", pillId: "zen", star: 1, identified: true, acquiredAt: T0, source: "copier" }, { id: "b", pillId: "zen", star: 2, identified: true, acquiredAt: T0, source: "copier" });
    s.known.push("zen");
    expect(quickSell(s, "zen", 1, 1).payout).toBe(75 * BALANCE.values.starMult[1]);
    expect(quickSell(s, "zen", 2, 1).payout).toBe(75 * BALANCE.values.starMult[2]);
    expect(() => quickSell(s, "zen", 0, 1)).toThrow();
  });
  it("9. repeated Copier batches + Quick Sell alone stay modest (no economy-trivialising faucet)", () => {
    const s = fresh(14);
    s.cash = 0; s.orders = []; s.nextOrderAt = T0 + 1e9;
    let t = T0;
    while (t < T0 + 2 * HOUR) {
      startCopy(s, "happy", copierMaxBatch(s, "happy"), t);
      t = s.copier!.endsAt; collectCopy(s, t);
      quickSell(s, "happy", 0, countExact(s, "happy", 0));
    }
    expect(s.cash / 2).toBeLessThan(700);  // per hour
    expect(s.cash / 2).toBeGreaterThan(200);
  });
  it("Desk orders out-earn Quick Sell over a session", () => {
    const s = fresh(15);
    const cash = s.cash;
    play(s, 6 * 60, seeded(15));
    const shipped = s.stats.revenue;
    expect(shipped).toBeGreaterThan((s.cash - cash - shipped) * 3);
  });
});
