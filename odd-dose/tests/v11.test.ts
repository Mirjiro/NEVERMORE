/** Validation for the v1.1 gameplay/UI update (Vault stacks, star handling, Desk stamp flow, save compatibility). */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  advance, availableSpecimens, buyUpgrade, collectCopy, countExact, createInitialState, sellPill, shipOrder, startCopy, startMachine, vaultStacks,
} from "../src/engine/game";
import { seeded } from "../src/engine/random";
import type { GameState, OrderLine, Star } from "../src/engine/types";
import { parseSave } from "../src/store/persistence";
import { applyStamp, canShip, canStamp, initialFlow, toggleCheck } from "../src/ui/shipFlow";
import { PillCard } from "../src/ui/components/PillCard";

const T0 = 1_800_000_000_000;
const fresh = () => createInitialState(T0, seeded(1));
let n = 0;
function give(s: GameState, pillId: string, count: number, star: Star = 0) {
  if (!s.known.includes(pillId)) { s.known.push(pillId); s.discovery[pillId] = { at: T0, bestStar: 0, how: "test" }; }
  for (let i = 0; i < count; i++) s.specimens.push({ id: `g${n++}`, pillId, star, identified: true, acquiredAt: T0, source: "reward" });
}
function addOrder(s: GameState, lines: OrderLine[]) {
  const o = { id: `ord_t${n++}`, sender: "Test", senderKind: "Customer", title: "Test", description: "Hi.", lines, payout: 100, createdAt: T0, expiresAt: T0 + 1e9, confidential: false, status: "open" as const };
  s.orders.push(o);
  return o;
}

describe("Vault = what I own", () => {
  it("1+2+3. shows only owned pills; Notebook keeps Known; Copier still makes zero-stock pills", () => {
    const s = fresh();
    const calm = s.orders.find((o) => o.lines[0].pillId === "calm")!;
    shipOrder(s, calm.id, T0); // ships both Calm
    expect(vaultStacks(s).some((x) => x.pillId === "calm")).toBe(false);
    expect(s.known).toContain("calm");
    expect(s.discovery.calm).toBeTruthy();
    startCopy(s, "calm", 3, T0);
    collectCopy(s, T0 + 1e7);
    expect(vaultStacks(s).find((x) => x.pillId === "calm")?.count).toBe(3);
  });
  it("unidentified ? specimens are not shown as named stacks", () => {
    const s = fresh();
    s.specimens.push({ id: "u1", pillId: "void", star: 0, identified: false, acquiredAt: T0, source: "mail" });
    expect(vaultStacks(s).some((x) => x.pillId === "void")).toBe(false);
  });
  it("4+5. identical pill+star stack; different stars are separate cards", () => {
    const s = fresh();
    give(s, "happy", 10); // + 2 starter = 12
    give(s, "happy", 2, 1);
    give(s, "happy", 1, 2);
    const happy = vaultStacks(s).filter((x) => x.pillId === "happy");
    expect(happy.map((x) => [x.star, x.count])).toEqual([[0, 12], [1, 2], [2, 1]]);
    // underlying specimen records untouched
    expect(happy.reduce((a, x) => a + x.specimenIds.length, 0)).toBe(15);
  });
  it("reserved (in-Machine) specimens are still owned and flagged", () => {
    const s = fresh();
    startMachine(s, "machine_1", "happy", "sad", T0);
    const h = vaultStacks(s).find((x) => x.pillId === "happy" && x.star === 0)!;
    expect(h.count).toBe(2);
    expect(h.reserved).toBe(1);
  });
});

describe("Star presentation (PillCard)", () => {
  const html = (star: Star) => renderToStaticMarkup(createElement(PillCard, { pillId: "happy", star, qty: 4 }));
  it("6. Base pills show no star UI at all", () => {
    const h = html(0);
    expect(h).not.toContain("★");
    expect(h).not.toMatch(/star-\d|pcard-stars/);
    expect(h).toContain("Happy");
    expect(h).toContain("Common");
  });
  it("7. ★ and ★★ only on starred specimens", () => {
    expect(html(1)).toContain("★");
    expect(html(1)).not.toContain("★★");
    expect(html(2)).toContain("★★");
  });
});

describe("Star-safe transactions", () => {
  it("8. selling Base never sells a starred variant", () => {
    const s = fresh();
    s.xp = 1e6; s.cash = 1e6;
    buyUpgrade(s, "backdoor");
    give(s, "happy", 1, 1);
    sellPill(s, "happy", 0, T0);
    sellPill(s, "happy", 0, T0);
    expect(countExact(s, "happy", 1)).toBe(1);
    expect(() => sellPill(s, "happy", 0, T0)).toThrow();
    expect(countExact(s, "happy", 1)).toBe(1);
  });
  it("9. shipping deducts Base copies first; ★ orders take starred copies", () => {
    const s = fresh();
    give(s, "happy", 8); // 10 base
    give(s, "happy", 1, 1);
    give(s, "happy", 1, 2);
    const plain = addOrder(s, [{ pillId: "happy", quantity: 3, minStar: 0 }]);
    shipOrder(s, plain.id, T0);
    expect(countExact(s, "happy", 0)).toBe(7);
    expect(countExact(s, "happy", 1)).toBe(1);
    expect(countExact(s, "happy", 2)).toBe(1);
    const starred = addOrder(s, [{ pillId: "happy", quantity: 1, minStar: 1 }]);
    shipOrder(s, starred.id, T0);
    expect(countExact(s, "happy", 0)).toBe(7);
    expect(countExact(s, "happy", 1)).toBe(0); // used the ★, kept the ★★
    expect(countExact(s, "happy", 2)).toBe(1);
  });
  it("Machine picks Base copies before starred ones", () => {
    const s = fresh();
    give(s, "sad", 1, 2);
    startMachine(s, "machine_1", "sad", "sad", T0);
    expect(s.specimens.find((x) => x.star === 2 && x.pillId === "sad")!.reservedBy).toBeUndefined();
    expect(availableSpecimens(s, "sad").map((x) => x.star)).toEqual([2]);
  });
});

describe("Desk files are short", () => {
  it("13. regular orders: short title, one sentence, no pill lists", () => {
    const s = fresh();
    s.xp = 5000;
    advance(s, T0 + 3 * 86_400_000, seeded(5));
    const fresh_ = [];
    for (let i = 0; i < 40; i++) {
      s.nextOrderAt = s.lastTickAt;
      advance(s, s.lastTickAt + 1, seeded(i));
      fresh_.push(...s.orders.filter((o) => o.status === "open" && o.createdAt > T0));
      s.orders = s.orders.filter((o) => !(o.status === "open" && o.createdAt > T0));
    }
    expect(fresh_.length).toBeGreaterThan(20);
    for (const o of fresh_) {
      expect(o.title.length).toBeLessThanOrEqual(24);
      expect(o.description.length).toBeLessThanOrEqual(60);
      expect(o.description).not.toMatch(/\d+×/);
    }
  });
});

describe("Stamp-to-ship flow", () => {
  const ids = ["happy", "calm"];
  it("14. checking items never stamps", () => {
    let f = initialFlow();
    f = toggleCheck(f, "happy", true, true);
    f = toggleCheck(f, "calm", true, true);
    expect(f.stamp).toBeNull();
  });
  it("can't check an item without inventory", () => {
    expect(toggleCheck(initialFlow(), "happy", true, false).checked.happy).toBeUndefined();
  });
  it("15+17+18. stamp only when eligible; SHIP needs stamp; stamp once; unchecking clears it", () => {
    let f = initialFlow();
    expect(canStamp(f, ids, true, true)).toBe(false);
    f = applyStamp(f, ids, true, true, { x: 50, y: 100 });
    expect(f.stamp).toBeNull(); // not all checked
    f = toggleCheck(toggleCheck(f, "happy", true, true), "calm", true, true);
    expect(canShip(f, ids, true, true)).toBe(false); // not stamped yet
    expect(applyStamp(f, ids, false, true, { x: 50, y: 100 }).stamp).toBeNull(); // inventory not ready
    f = applyStamp(f, ids, true, true, { x: 40, y: 120 });
    expect(f.stamp).not.toBeNull();
    const again = applyStamp(f, ids, true, true, { x: 70, y: 300 });
    expect(again.stamp).toEqual(f.stamp); // once per attempt
    expect(canShip(f, ids, true, true)).toBe(true);
    expect(canShip(f, ids, false, true)).toBe(false); // inventory vanished
    expect(canShip(f, ids, true, false)).toBe(false); // order closed
    f = toggleCheck(f, "calm", false, true);
    expect(f.stamp).toBeNull();
    expect(canShip(f, ids, true, true)).toBe(false);
  });
  it("19+20. stamping changes nothing in the game; shipping pays once and completes", () => {
    const s = fresh();
    const o = s.orders.find((x) => x.lines[0].pillId === "calm")!;
    const before = JSON.stringify(s);
    let f = toggleCheck(initialFlow(), "calm", true, true);
    f = applyStamp(f, ["calm"], true, true, { x: 50, y: 50 });
    expect(JSON.stringify(s)).toBe(before);
    const cash = s.cash;
    shipOrder(s, o.id, T0);
    expect(() => shipOrder(s, o.id, T0)).toThrow();
    expect(s.cash).toBe(cash + o.payout);
    expect(s.orders.find((x) => x.id === o.id)!.status).toBe("shipped");
  });
});

describe("Save compatibility", () => {
  it("24. a save made by the previous release loads with everything intact", () => {
    const raw = readFileSync(new URL("./fixtures/save-v1.0.json", import.meta.url), "utf8");
    const old = JSON.parse(raw) as GameState;
    const s = parseSave(raw);
    expect(s.cash).toBe(old.cash);
    expect(s.known).toEqual(old.known);
    expect(s.specimens.length).toBe(old.specimens.length);
    expect(s.machines[0].job?.resultPillId).toBe(old.machines[0].job?.resultPillId);
    expect(s.specimens.filter((x) => x.reservedBy).length).toBe(2);
    expect(s.copier?.quantity).toBe(5);
    expect(s.orders.length).toBe(old.orders.length);
    const happy = vaultStacks(s).filter((x) => x.pillId === "happy").map((x) => x.star);
    expect(happy).toEqual([0, 1, 2]);
    // still playable: collect the running jobs
    advance(s, s.copier!.endsAt);
    expect(collectCopy(s, s.copier!.endsAt).quantity).toBe(5);
  });
});
