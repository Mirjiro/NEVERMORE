import { describe, expect, it } from "vitest";
import { BALANCE } from "../src/config/balance";
import { PILLS, PILL_BY_ID } from "../src/data/pills";
import {
  advance, availableSpecimens, buyListing, buyUpgrade, collectCopy, collectMachine, companyLevel, copierQuote,
  createInitialState, fireList, listingPrice, openMail, rollMailPull, sanitize, scanSpecimen, sellPill, sellPrice,
  shipOrder, speedUpCopy, speedUpMachine, startCopy, startMachine,
} from "../src/engine/game";
import { seeded } from "../src/engine/random";
import { RECIPE_TABLE, previewBreed, resolveBreed } from "../src/engine/recipes";
import { GameError, RARITIES } from "../src/engine/types";
import type { GameState, Rarity } from "../src/engine/types";

const T0 = 1_800_000_000_000;
const fresh = (seed = 1) => createInitialState(T0, seeded(seed));
const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s));

/** The canonical recipe list, copied verbatim from the spec. */
const CANON: [string, string, string][] = [
  ["Bittersweet", "Happy", "Sad"], ["Pride", "Happy", "Angry"], ["Zen", "Happy", "Calm"], ["Thrill", "Happy", "Fear"],
  ["Euphoria", "Happy", "Excited"], ["Bitter", "Sad", "Angry"], ["Melancholy", "Sad", "Calm"], ["Despair", "Sad", "Fear"],
  ["Manic", "Sad", "Excited"], ["Focus", "Calm", "Angry"], ["Brave", "Fear", "Angry"], ["Violent", "Excited", "Angry"],
  ["Numb", "Calm", "Fear"], ["Flow", "Calm", "Excited"], ["Shock", "Fear", "Excited"],
  ["Enlightenment", "Zen", "Shock"], ["Heroism", "Brave", "Flow"], ["Awesome", "Zen", "Violent"], ["Ego", "Pride", "Despair"],
  ["Trance", "Numb", "Euphoria"], ["Melodrama", "Bittersweet", "Violent"], ["Psycho", "Manic", "Brave"],
  ["Nostalgia", "Melancholy", "Thrill"], ["Obsession", "Focus", "Despair"], ["Triumph", "Pride", "Numb"],
  ["Epiphany", "Focus", "Thrill"], ["Disgust", "Bitter", "Numb"], ["Mania", "Bitter", "Thrill"], ["Panic", "Shock", "Bitter"],
  ["Ecstasy", "Euphoria", "Melancholy"], ["Love", "Flow", "Bittersweet"], ["Toxic", "Melancholy", "Violent"],
  ["Ruin", "Despair", "Violent"], ["Overdrive", "Manic", "Focus"], ["Void", "Zen", "Despair"],
  ["Divined", "Enlightenment", "Awesome"], ["Ruthless", "Heroism", "Triumph"], ["Nothing", "Ruin", "Disgust"],
  ["Evil", "Psycho", "Mania"], ["Nirvana", "Ecstasy", "Love"], ["Possessed", "Trance", "Obsession"],
  ["Immortal", "Divined", "Nothing"], ["Oblivion", "Nirvana", "Ruthless"],
];
const byName = (n: string) => PILLS.find((p) => p.name === n)!.id;

/** Give the player a Known pill with N available specimens. */
function grant(s: GameState, pillId: string, n: number, star: 0 | 1 | 2 = 0) {
  if (!s.known.includes(pillId)) { s.known.push(pillId); s.discovery[pillId] = { at: T0, bestStar: 0, how: "test" }; }
  for (let i = 0; i < n; i++) s.specimens.push({ id: `t_${pillId}_${star}_${i}_${Math.random()}`, pillId, star, identified: true, acquiredAt: T0, source: "reward" });
}

describe("catalog", () => {
  it("1. has exactly 49 unique pills", () => {
    expect(PILLS.length).toBe(49);
    expect(new Set(PILLS.map((p) => p.id)).size).toBe(49);
    expect(new Set(PILLS.map((p) => p.name)).size).toBe(49);
  });
  it("2. rarity counts are 6/15/20/6/2", () => {
    const c = (r: Rarity) => PILLS.filter((p) => p.rarity === r).length;
    expect(RARITIES.map(c)).toEqual([6, 15, 20, 6, 2]);
    expect(PILLS.filter((p) => p.rarity === "common").map((p) => p.name).sort()).toEqual(["Angry", "Calm", "Excited", "Fear", "Happy", "Sad"]);
    expect(PILL_BY_ID.love.rarity).toBe("epic");
  });
  it("has 43 registered recipes matching the canon", () => {
    expect(RECIPE_TABLE.size).toBe(43);
    expect(CANON.length).toBe(43);
  });
  it("inherits Types through full ancestry", () => {
    expect(PILL_BY_ID.happy.types).toEqual(["happy"]);
    expect(PILL_BY_ID.bittersweet.types).toEqual(["happy", "sad"]);
    expect(PILL_BY_ID.zen.types).toEqual(["happy", "calm"]);
    expect(PILL_BY_ID.enlightenment.types.sort()).toEqual(["calm", "excited", "fear", "happy"]);
  });
});

describe("breeding", () => {
  it("3+4. all 43 recipes give the right result, in either order", () => {
    for (const [res, a, b] of CANON) {
      const [ra, rb, rr] = [byName(a), byName(b), byName(res)];
      for (let i = 0; i < 20; i++) {
        expect(resolveBreed(ra, rb).kind === "recipe" && (resolveBreed(ra, rb) as { resultId: string }).resultId).toBe(rr);
        expect((resolveBreed(rb, ra) as { resultId: string }).resultId).toBe(rr);
      }
    }
  });
  it("5. identical parents produce the same pill", () => {
    for (const p of PILLS) expect(resolveBreed(p.id, p.id)).toEqual({ kind: "identical", resultId: p.id });
  });
  it("6. shared-Type fallback never overrides a recipe; returns only a parent", () => {
    // Zen (happy,calm) + Shock (fear,excited) share nothing but are a recipe; Euphoria+Melancholy share none but are a recipe.
    expect(previewBreed("zen", "shock").kind).toBe("recipe");
    for (const a of PILLS) for (const b of PILLS) {
      const pv = previewBreed(a.id, b.id);
      if (RECIPE_TABLE.has([a.id, b.id].sort().join("+"))) expect(pv.kind).toBe("recipe");
      const r = resolveBreed(a.id, b.id, seeded(a.id.length * 31 + b.id.length));
      if (r.kind === "shared") expect([a.id, b.id]).toContain(r.resultId);
    }
    // Happy + Zen share Happy, no recipe → Happy or Zen only, ~50/50
    const rng = seeded(7);
    let zen = 0;
    for (let i = 0; i < 4000; i++) { const r = resolveBreed("happy", "zen", rng); if (r.kind !== "shared") throw new Error(); if (r.resultId === "zen") zen++; }
    expect(zen / 4000).toBeGreaterThan(0.46);
    expect(zen / 4000).toBeLessThan(0.54);
  });
  it("no shared Types and no recipe → No Reaction", () => {
    expect(previewBreed("bittersweet", "shock").kind).toBe("none");
  });
});

describe("machine", () => {
  it("7+9. returns both parents, adds one pill, costs nothing", () => {
    const s = fresh();
    const before = s.specimens.length;
    const r = startMachine(s, "machine_1", "happy", "sad", T0);
    expect(r.kind).toBe("started");
    expect(s.cash).toBe(BALANCE.start.cash);
    expect(availableSpecimens(s, "happy").length).toBe(1); // one reserved
    expect(() => collectMachine(s, "machine_1", T0 + 1000)).toThrow(GameError);
    const job = s.machines[0].job!;
    expect(job.endsAt - T0).toBe(BALANCE.machine.incubationMs.rare);
    const rev = collectMachine(s, "machine_1", job.endsAt);
    expect(rev.pillId).toBe("bittersweet");
    expect(rev.isNew).toBe(true);
    expect(s.specimens.length).toBe(before + 1);
    expect(availableSpecimens(s, "happy").length).toBe(2);
    expect(availableSpecimens(s, "sad").length).toBe(2);
    expect(s.known).toContain("bittersweet");
    expect(() => collectMachine(s, "machine_1", job.endsAt)).toThrow(GameError); // claim once
  });
  it("8. timers survive save/reload using real time", () => {
    const s = fresh();
    startMachine(s, "machine_1", "calm", "calm", T0);
    const saved = JSON.stringify(s);
    const loaded = sanitize(JSON.parse(saved));
    advance(loaded, T0 + 31_000);
    expect(collectMachine(loaded, "machine_1", T0 + 31_000).pillId).toBe("calm");
  });
  it("identical requires two available copies; specimen can't be in two machines", () => {
    const s = fresh();
    s.upgrades.machines = 1;
    startMachine(s, "machine_1", "happy", "happy", T0);
    expect(() => startMachine(s, "machine_2", "happy", "sad", T0)).toThrow(/No available Happy/);
  });
  it("no reaction starts no timer and reserves nothing", () => {
    const s = fresh();
    grant(s, "bittersweet", 1); grant(s, "shock", 1);
    expect(startMachine(s, "machine_1", "bittersweet", "shock", T0).kind).toBe("none");
    expect(s.machines[0].job).toBeNull();
    expect(s.specimens.some((x) => x.reservedBy)).toBe(false);
  });
  it("only installed machines usable; unknown pills rejected; speed-up charges cash", () => {
    const s = fresh();
    expect(() => startMachine(s, "machine_2", "happy", "sad", T0)).toThrow(/installed/);
    expect(() => startMachine(s, "machine_1", "happy", "zen", T0)).toThrow(/Known/);
    startMachine(s, "machine_1", "happy", "sad", T0);
    const cost = speedUpMachine(s, "machine_1", T0);
    expect(cost).toBeGreaterThanOrEqual(3 * BALANCE.speedUp.cashPerMinute);
    expect(s.cash).toBe(BALANCE.start.cash - cost);
    collectMachine(s, "machine_1", T0);
  });
});

describe("copier", () => {
  it("10+11. Happy ×11 is free, takes 3 min and makes exactly 11", () => {
    const s = fresh();
    const q = copierQuote(s, "happy", 11);
    expect(q.ms).toBe(180_000);
    const before = availableSpecimens(s, "happy").length;
    startMachine(s, "machine_1", "calm", "calm", T0); // copier works while machine busy
    startCopy(s, "happy", 11, T0);
    expect(s.cash).toBe(BALANCE.start.cash);
    expect(() => collectCopy(s, T0 + 179_000)).toThrow(GameError);
    const out = collectCopy(s, T0 + 180_000);
    expect(out.quantity).toBe(11);
    expect(availableSpecimens(s, "happy").length).toBe(before + 11);
    expect(() => collectCopy(s, T0 + 180_000)).toThrow(GameError);
  });
  it("rejects unknown pills and oversize batches; works at 0g", () => {
    const s = fresh();
    expect(() => startCopy(s, "zen", 1, T0)).toThrow(/Known/);
    expect(() => startCopy(s, "happy", 12, T0)).toThrow(/Max batch/);
    s.cash = 0;
    startCopy(s, "happy", 11, T0);
    expect(s.cash).toBe(0);
  });
  it("12. stars are rolled per pill and stored separately from rarity", () => {
    const s = fresh();
    s.cash = 1e9;
    s.upgrades.copierBatch = 2;
    const rng = seeded(3);
    let stars = 0, total = 0;
    for (let i = 0; i < 300; i++) {
      startCopy(s, "happy", 44, T0, rng);
      speedUpCopy(s, T0);
      const out = collectCopy(s, T0);
      total += out.quantity;
      stars += out.stars.filter((x) => x > 0).length;
    }
    expect(total).toBe(13_200);
    const rate = stars / total;
    expect(rate).toBeGreaterThan(0.011);
    expect(rate).toBeLessThan(0.021);
    const starred = s.specimens.find((x) => x.star > 0)!;
    expect(PILL_BY_ID[starred.pillId].rarity).toBe("common");
    expect(s.discovery.happy.bestStar).toBeGreaterThan(0);
  });
});

describe("scanner", () => {
  function withUnknown() {
    const s = fresh();
    s.upgrades.scanner = 1;
    s.specimens.push({ id: "unk1", pillId: "void", star: 0, identified: false, acquiredAt: T0, source: "mail" });
    return s;
  }
  it("13. Known pills cannot be scanned", () => {
    const s = withUnknown();
    const happy = s.specimens.find((x) => x.pillId === "happy")!;
    expect(() => scanSpecimen(s, happy.id, T0)).toThrow(/Known/);
  });
  it("14. costs 250g (no Charge) and follows outcome odds", () => {
    const s = withUnknown();
    const r = scanSpecimen(clone(s) as GameState, "unk1", T0, seeded(1));
    expect(r).toBeTruthy();
    const one = clone(s);
    scanSpecimen(one, "unk1", T0, seeded(2));
    expect(one.cash).toBe(BALANCE.start.cash - 250);
    expect("charge" in one).toBe(false);
    const counts: Record<string, number> = { identify: 0, clue: 0, transform: 0, destroy: 0 };
    const rng = seeded(9);
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const t = clone(s);
      counts[scanSpecimen(t, "unk1", T0, rng).kind]++;
    }
    expect(counts.identify / N).toBeCloseTo(0.35, 1);
    expect(counts.clue / N).toBeCloseTo(0.3, 1);
    expect(counts.transform / N).toBeCloseTo(0.2, 1);
    expect(counts.destroy / N).toBeCloseTo(0.15, 1);
  });
  it("outcomes have the right effects; can't scan without Gold", () => {
    const s = withUnknown();
    s.cash = 100;
    expect(() => scanSpecimen(s, "unk1", T0)).toThrow(/Gold/);
    expect(s.cash).toBe(100);
    s.cash = BALANCE.start.cash;
    expect(s.cash).toBe(BALANCE.start.cash);
    // identify (roll 0 → identify)
    const a = withUnknown();
    expect(scanSpecimen(a, "unk1", T0, () => 0).kind).toBe("identify");
    expect(a.known).toContain("void");
    // clue → draft
    const b = withUnknown();
    const drafts = b.drafts.length;
    expect(scanSpecimen(b, "unk1", T0, () => 0.5).kind).toBe("clue");
    expect(b.drafts.length).toBe(drafts + 1);
    // destroy
    const d = withUnknown();
    expect(scanSpecimen(d, "unk1", T0, () => 0.99).kind).toBe("destroy");
    expect(d.specimens.find((x) => x.id === "unk1")).toBeUndefined();
  });
});

describe("orders & shipping", () => {
  it("17+18. validates inventory, consumes it and pays exactly once", () => {
    const s = fresh();
    const calmOrder = s.orders.find((o) => o.lines[0].pillId === "calm")!;
    const bsOrder = s.orders.find((o) => o.lines[0].pillId === "bittersweet")!;
    expect(() => shipOrder(s, bsOrder.id, T0)).toThrow(/everything/);
    const cash = s.cash;
    shipOrder(s, calmOrder.id, T0);
    expect(s.cash).toBe(cash + calmOrder.payout);
    expect(availableSpecimens(s, "calm").length).toBe(0);
    expect(() => shipOrder(s, calmOrder.id, T0)).toThrow(/Already shipped/);
    expect(s.cash).toBe(cash + calmOrder.payout);
    expect(s.stats.shipments).toBe(1);
    // Discovery record survives shipping the last copy
    expect(s.known).toContain("calm");
  });
  it("reserved (in-machine) pills can't be shipped", () => {
    const s = fresh();
    const o = s.orders.find((x) => x.lines[0].pillId === "calm")!;
    startMachine(s, "machine_1", "calm", "calm", T0);
    expect(() => shipOrder(s, o.id, T0)).toThrow(/everything/);
  });
  it("orders arrive over time, capped at max and offline catch-up", () => {
    const s = fresh();
    advance(s, T0 + 30 * 24 * 3_600_000, seeded(4)); // a month away
    const open = s.orders.filter((o) => o.status === "open");
    expect(open.length).toBeLessThanOrEqual(BALANCE.orders.maxActive);
    expect(open.length).toBeLessThanOrEqual(BALANCE.orders.offlineCatchUp);
    for (const o of s.orders) for (const l of o.lines) expect(PILL_BY_ID[l.pillId]).toBeTruthy();
  });
});

describe("Charge removed", () => {
  it("old saves with Charge load cleanly and the field is dropped", () => {
    const old = { ...fresh(), charge: 37, chargeUpdatedAt: T0 } as GameState & { charge: number };
    const s = sanitize(JSON.parse(JSON.stringify(old)));
    expect("charge" in s).toBe(false);
    expect("chargeUpdatedAt" in s).toBe(false);
    advance(s, T0 + 1e9);
    expect("charge" in s).toBe(false);
  });
});

describe("mail gacha", () => {
  it("19. pull distribution matches advertised odds", () => {
    const offer = { odds: { common: 60, rare: 25, epic: 10, legendary: 4, secret: 1 }, starOdds: [98.4, 1.5, 0.1] as [number, number, number] };
    const rng = seeded(11);
    const N = 50_000;
    const c: Record<string, number> = {};
    for (let i = 0; i < N; i++) { const r = rollMailPull(offer, rng); c[r.rarity] = (c[r.rarity] ?? 0) + 1; }
    expect(c.common / N).toBeCloseTo(0.6, 1);
    expect(c.rare / N).toBeCloseTo(0.25, 1);
    expect(c.epic / N).toBeCloseTo(0.1, 1);
    expect(c.legendary / N).toBeCloseTo(0.04, 1);
    expect(c.secret / N).toBeGreaterThan(0.007);
    expect(c.secret / N).toBeLessThan(0.013);
  });
  it("identified mail makes pills Known; can't open twice", () => {
    const s = fresh();
    advance(s, T0 + 4 * 60_000, seeded(2));
    const offer = s.mail[0];
    offer.identified = true;
    s.cash = 10_000;
    const res = openMail(s, offer.id, T0 + 4 * 60_000, seeded(5));
    expect(res.length).toBe(offer.pulls);
    for (const r of res) expect(s.known).toContain(r.pillId);
    expect(() => openMail(s, offer.id, T0 + 4 * 60_000)).toThrow(/Already/);
  });
});

describe("BACKDOOR", () => {
  it("20. instant buy→sell can never create Cash", () => {
    const s = fresh();
    s.cash = 1e7;
    s.xp = 1e6;
    buyUpgrade(s, "backdoor");
    const rng = seeded(8);
    for (let round = 0; round < 50; round++) {
      advance(s, s.market.nextRotateAt + 1, rng);
      for (const l of s.market.listings) {
        while (l.stock > 0) {
          const before = s.cash;
          const { price } = buyListing(s, l.id, s.lastTickAt);
          expect(sellPrice(s, l.pillId, l.star)).toBeLessThan(price);
          sellPill(s, l.pillId, l.star, s.lastTickAt);
          expect(s.cash).toBeLessThan(before);
        }
      }
    }
    expect(fireList(s).length).toBeLessThanOrEqual(BALANCE.market.fireListSize);
  });
  it("buying a pill makes it Known; reserved pills can't be sold; locked before upgrade", () => {
    const s = fresh();
    advance(s, T0 + 1);
    expect(() => buyListing(s, s.market.listings[0].id, T0)).toThrow(/locked/);
    s.xp = 1e6; s.cash = 1e7;
    buyUpgrade(s, "backdoor");
    const l = s.market.listings[0];
    buyListing(s, l.id, T0);
    expect(s.known).toContain(l.pillId);
    expect(listingPrice(s, l)).toBeGreaterThan(0);
    startMachine(s, "machine_1", "fear", "fear", T0);
    s.specimens.filter((x) => x.pillId === "fear").forEach((x) => (x.reservedBy = "machine_1"));
    expect(() => sellPill(s, "fear", 0, T0)).toThrow(/reserved/);
  });
});

describe("HQ & progression", () => {
  it("upgrades need level and cash; cash never negative", () => {
    const s = fresh();
    expect(() => buyUpgrade(s, "machines")).toThrow(/Level 2/);
    s.xp = BALANCE.company.levelXp[1];
    expect(companyLevel(s)).toBe(2);
    s.cash = 100;
    expect(() => buyUpgrade(s, "machines")).toThrow(/Gold/);
    expect(s.cash).toBe(100);
    s.cash = 1500;
    buyUpgrade(s, "machines");
    expect(s.cash).toBe(0);
    expect(startMachine(s, "machine_2", "happy", "sad", T0).kind).toBe("started");
  });
  it("24. a new player can discover, manufacture, ship, earn and upgrade", () => {
    let s = fresh(21);
    const rng = seeded(21);
    let now = T0;
    // discover Bittersweet
    startMachine(s, "machine_1", "happy", "sad", now, rng);
    now += BALANCE.machine.incubationMs.rare;
    advance(s, now, rng);
    expect(collectMachine(s, "machine_1", now).isNew).toBe(true);
    // ship both starter orders
    for (const o of s.orders.filter((x) => x.status === "open" && ["calm", "bittersweet"].includes(x.lines[0].pillId))) shipOrder(s, o.id, now, rng);
    // manufacture
    startCopy(s, "happy", 11, now, rng);
    now += 180_000;
    collectCopy(s, now);
    // upgrade
    buyUpgrade(s, "scanner");
    expect(s.upgrades.scanner).toBe(1);
    expect(s.stats.shipments).toBe(2);
    s = sanitize(JSON.parse(JSON.stringify(s)));
    expect(s.known).toContain("bittersweet");
  });
});
