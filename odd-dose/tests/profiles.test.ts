import { beforeEach, describe, expect, it } from "vitest";
import { LEGACY_SAVE_KEY, currentPlayer, readProfiles, saveKeyFor, signIn, signOut, validateName } from "../src/store/profiles";

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemStorage() as unknown as Storage;
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = new MemStorage() as unknown as Storage;
});
/** Simulate closing the browser: session storage is gone, local storage stays. */
const restartBrowser = () => { (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = new MemStorage() as unknown as Storage; };

describe("player names", () => {
  it("validates length and characters", () => {
    expect(validateName("M")).toMatch(/2 characters/);
    expect(validateName("x".repeat(17))).toMatch(/16/);
    expect(validateName("<script>")).toMatch(/Letters/);
    expect(validateName("  Mira  ")).toBeNull();
    expect(validateName("Zoë_2")).toBeNull();
  });
  it("save slots are case-insensitive and separate per player", () => {
    expect(saveKeyFor("Mira")).toBe(saveKeyFor("  mira "));
    expect(saveKeyFor("Mira")).not.toBe(saveKeyFor("Theo"));
  });
});

describe("remember me", () => {
  it("a remembered player is signed in again after the browser restarts", () => {
    signIn("Mira", true);
    restartBrowser();
    expect(currentPlayer()).toBe("Mira");
  });
  it("without remember, the name lasts only for this session", () => {
    signIn("Theo", false);
    expect(currentPlayer()).toBe("Theo");
    restartBrowser();
    expect(currentPlayer()).toBeNull();
    expect(readProfiles().names).toContain("Theo"); // still offered as a known player
  });
  it("sign out forgets the remembered player but keeps their save", () => {
    signIn("Mira", true);
    localStorage.setItem(saveKeyFor("Mira"), "{\"x\":1}");
    signOut();
    expect(currentPlayer()).toBeNull();
    expect(localStorage.getItem(saveKeyFor("Mira"))).toBe("{\"x\":1}");
  });
  it("rejects invalid names without changing anything", () => {
    expect(() => signIn("!", true)).toThrow();
    expect(readProfiles().names).toEqual([]);
  });
});

describe("existing progress", () => {
  it("the first player to sign in inherits the pre-login save; later players start fresh", () => {
    localStorage.setItem(LEGACY_SAVE_KEY, "{\"old\":true}");
    signIn("Mira", true);
    expect(localStorage.getItem(saveKeyFor("Mira"))).toBe("{\"old\":true}");
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    signIn("Theo", true);
    expect(localStorage.getItem(saveKeyFor("Theo"))).toBeNull();
    expect(readProfiles().names).toEqual(["Mira", "Theo"]);
    expect(currentPlayer()).toBe("Theo");
  });
});
