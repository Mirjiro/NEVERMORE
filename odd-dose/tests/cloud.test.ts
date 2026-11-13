import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState, startMachine } from "../src/engine/game";
import { seeded } from "../src/engine/random";
import type { GameState } from "../src/engine/types";
import {
  _resetCloud, connectCloud, createCloudSaver, nameKey, packSave, readCloudProfile, readCloudSave, unpackSave, writeCloudProfile,
} from "../src/store/cloud";
import { parseSave } from "../src/store/persistence";

/** In-memory stand-in for the claude.ai runtime's db + user capabilities. */
function fakeRuntime(uid: string | null = "u_test") {
  const docs = new Map<string, Record<string, unknown>>();
  const writes: string[] = [];
  const segOk = (p: string) => p.split("/").every((s) => /^[A-Za-z0-9_\-.~:@+]+$/.test(s)) && p.split("/").length % 2 === 0;
  const db = {
    doc(path: string) {
      if (!segOk(path)) throw new TypeError("bad path " + path);
      return {
        get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
        set: async (d: Record<string, unknown>) => { writes.push(path); docs.set(path, JSON.parse(JSON.stringify(d))); },
      };
    },
  };
  const user = { id: async () => uid };
  return { runtime: { use: async (n: string) => (n === "db" ? db : n === "user" ? user : null) }, docs, writes };
}

beforeEach(() => _resetCloud());

describe("connecting to the account", () => {
  it("is null outside claude.ai, when a capability is missing, or when signed out", async () => {
    expect(await connectCloud(undefined)).toBeNull();
    _resetCloud();
    expect(await connectCloud({ use: async () => null })).toBeNull();
    _resetCloud();
    expect(await connectCloud(fakeRuntime(null).runtime)).toBeNull();
  });
  it("gives up after the timeout when the host never answers", async () => {
    vi.useFakeTimers();
    const p = connectCloud({ use: () => new Promise(() => {}) });
    await vi.advanceTimersByTimeAsync(4100);
    expect(await p).toBeNull();
    vi.useRealTimers();
  });
  it("connects with the viewer id", async () => {
    const c = await connectCloud(fakeRuntime().runtime);
    expect(c?.uid).toBe("u_test");
  });
});

describe("remembered player in the account", () => {
  it("round-trips the profile in the viewer's private subtree", async () => {
    const f = fakeRuntime();
    const c = (await connectCloud(f.runtime))!;
    expect(await readCloudProfile(c)).toBeNull();
    await writeCloudProfile(c, { remembered: "Mira", names: ["Mira", "Theo"] });
    expect(f.writes).toEqual(["data/users/u_test/profile"]);
    expect(await readCloudProfile(c)).toEqual({ remembered: "Mira", names: ["Mira", "Theo"] });
  });
  it("name keys are always valid path segments", () => {
    for (const n of ["Mira", "Zoë 2", "a.b-c_d", "日本"]) expect(nameKey(n)).toMatch(/^[a-z0-9_]+$/);
    expect(nameKey("Mira")).toBe(nameKey(" mira "));
  });
});

describe("saves in the account", () => {
  const T0 = 1_800_000_000_000;
  it("pack/unpack is lossless (including in-Machine reservations)", () => {
    const s = createInitialState(T0, seeded(3));
    startMachine(s, "machine_1", "happy", "sad", T0);
    const back = parseSave(unpackSave(packSave(s)));
    expect(back).toEqual(parseSave(JSON.stringify(s)));
    const fixture = readFileSync(new URL("./fixtures/save-v1.0.json", import.meta.url), "utf8");
    expect(parseSave(unpackSave(packSave(JSON.parse(fixture) as GameState)))).toEqual(parseSave(fixture));
  });
  it("saver writes after a pause, once per change, newest state wins", async () => {
    vi.useFakeTimers();
    const f = fakeRuntime();
    const c = (await connectCloud(f.runtime))!;
    const saver = createCloudSaver(c, "Mira", 1000);
    const s = createInitialState(T0, seeded(1));
    saver.schedule(s);
    saver.schedule({ ...s, cash: 999 });
    await vi.advanceTimersByTimeAsync(1100);
    expect(f.writes.length).toBe(1);
    const remote = await readCloudSave(c, "Mira");
    expect(parseSave(remote!.json).cash).toBe(999);
    saver.schedule({ ...s, cash: 999 }); // unchanged → no write
    await vi.advanceTimersByTimeAsync(1100);
    expect(f.writes.length).toBe(1);
    vi.useRealTimers();
  });
  it("each player has a separate account save", async () => {
    const f = fakeRuntime();
    const c = (await connectCloud(f.runtime))!;
    const a = createCloudSaver(c, "Mira", 0);
    const b = createCloudSaver(c, "Theo", 0);
    a.schedule({ ...createInitialState(T0), cash: 1 }); a.flush();
    b.schedule({ ...createInitialState(T0), cash: 2 }); b.flush();
    await new Promise((r) => setTimeout(r, 10));
    expect(parseSave((await readCloudSave(c, "Mira"))!.json).cash).toBe(1);
    expect(parseSave((await readCloudSave(c, "Theo"))!.json).cash).toBe(2);
  });
});
