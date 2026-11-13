/** v1.2 validation: Gold currency, no-spoiler Machine view, Copier batches, rarity outlines. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PILLS } from "../src/data/pills";
import { collectCopy, collectMachine, createInitialState, incubationView, scanSpecimen, startCopy, startMachine, vaultStacks } from "../src/engine/game";
import { gold } from "../src/engine/format";
import { seeded } from "../src/engine/random";
import { GameError, RARITIES } from "../src/engine/types";
import { PillCard } from "../src/ui/components/PillCard";

const T0 = 1_800_000_000_000;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(p) ? [p] : [];
  });
}

describe("Gold currency", () => {
  it("formats with a lowercase g", () => {
    expect(gold(50)).toBe("50g");
    expect(gold(400)).toBe("400g");
    expect(gold(1250)).toBe("1,250g");
    expect(gold(10000)).toBe("10,000g");
    expect(gold(54.6)).toBe("55g");
  });
  it("no dollar amounts or 'Cash' labels remain in player-facing source", () => {
    const src = files(join(__dirname, "../src"));
    for (const f of src) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/\$\$\{|["'>]\$\d|\$\d+[\s,.)]/);
      expect(text, f).not.toMatch(/>\s*Cash\s*</);
      expect(text, f).not.toMatch(/Not enough Cash/);
    }
  });
  it("engine errors speak Gold; balances are unchanged by formatting", () => {
    const s = createInitialState(T0, seeded(1));
    s.cash = 10;
    let msg = "";
    s.upgrades.scanner = 1;
    s.specimens.push({ id: "u1", pillId: "void", star: 0, identified: false, acquiredAt: T0, source: "mail" });
    try { scanSpecimen(s, "u1", T0); } catch (e) { msg = (e as GameError).message; }
    expect(msg).toBe("Not enough Gold (need 250g).");
    expect(s.cash).toBe(10);
  });
});

describe("No spoilers in the Machine", () => {
  it("an undiscovered result shows nothing identifying until collected", () => {
    const s = createInitialState(T0, seeded(2));
    startMachine(s, "machine_1", "happy", "sad", T0);
    const view = incubationView(s, s.machines[0].job!);
    expect(view.known).toBe(false);
    expect(view.pillId).toBeNull();
    expect(view.label).toBe("Something is forming…");
    expect(JSON.stringify(view)).not.toMatch(/bittersweet/i);
    const rev = collectMachine(s, "machine_1", s.machines[0].job!.endsAt);
    expect(rev.pillId).toBe("bittersweet");
  });
  it("a known result may be named", () => {
    const s = createInitialState(T0, seeded(3));
    startMachine(s, "machine_1", "calm", "calm", T0);
    expect(incubationView(s, s.machines[0].job!)).toEqual({ known: true, pillId: "calm", label: "Making Calm" });
  });
  it("the Lab UI never reads the job result directly (it goes through incubationView)", () => {
    const lab = readFileSync(join(__dirname, "../src/ui/screens/LabScreen.tsx"), "utf8");
    expect(lab).not.toMatch(/job\.resultPillId|job\.resultStar/);
  });
});

describe("Copier batches", () => {
  it("returns the exact count and keeps star variants as separate stacks", () => {
    const s = createInitialState(T0, seeded(4));
    let i = 0;
    const rng = () => [0.995, 0.9999, 0.1][i++ % 3]; // forces ★, ★★, Base, ...
    startCopy(s, "happy", 9, T0, rng);
    const out = collectCopy(s, T0 + 1e7);
    expect(out.quantity).toBe(9);
    expect(out.stars.length).toBe(9);
    const stacks = vaultStacks(s).filter((x) => x.pillId === "happy");
    const byStar = Object.fromEntries(stacks.map((x) => [x.star, x.count]));
    expect(byStar[0]).toBe(2 + out.stars.filter((x) => x === 0).length);
    expect(byStar[1]).toBe(out.stars.filter((x) => x === 1).length);
    expect(byStar[2]).toBe(out.stars.filter((x) => x === 2).length);
    expect(byStar[1]).toBeGreaterThan(0);
    expect(byStar[2]).toBeGreaterThan(0);
  });
});

describe("Vault rarity outlines", () => {
  it("each card carries its real rarity class", () => {
    for (const r of RARITIES) {
      const p = PILLS.find((x) => x.rarity === r)!;
      const html = renderToStaticMarkup(createElement(PillCard, { pillId: p.id, qty: 1 }));
      expect(html).toContain(`r-${r}`);
      for (const other of RARITIES.filter((o) => o !== r)) expect(html).not.toContain(`pcard-card r-${other}`);
    }
  });
});
