/**
 * Local player profiles (device-only "login").
 * Each username gets its own save slot. No passwords and no server — progress lives in this browser.
 */
export const LEGACY_SAVE_KEY = "oddDose.save.v1";
const PROFILES_KEY = "oddDose.profiles";
const SESSION_KEY = "oddDose.session";

export interface ProfileStore { remembered: string | null; names: string[] }

const safeGet = (k: string, store: Storage | undefined = globalThis.localStorage) => { try { return store?.getItem(k) ?? null; } catch { return null; } };
const safeSet = (k: string, v: string, store: Storage | undefined = globalThis.localStorage) => { try { store?.setItem(k, v); } catch { /* storage blocked */ } };
const safeDel = (k: string, store: Storage | undefined = globalThis.localStorage) => { try { store?.removeItem(k); } catch { /* ignore */ } };

/** Trim, collapse spaces. Display form keeps the player's capitalization. */
export const cleanName = (raw: string) => raw.trim().replace(/\s+/g, " ");

/** Returns an error message, or null if the name is fine. */
export function validateName(raw: string): string | null {
  const n = cleanName(raw);
  if (n.length < 2) return "At least 2 characters, please.";
  if (n.length > 16) return "16 characters max.";
  if (!/^[\p{L}\p{N} _.-]+$/u.test(n)) return "Letters, numbers, spaces, - _ . only.";
  return null;
}

/** Save slot for a player. Case-insensitive: "Mira" and "mira" are the same player. */
export const saveKeyFor = (name: string) => `${LEGACY_SAVE_KEY}:${cleanName(name).toLowerCase()}`;

export function readProfiles(): ProfileStore {
  try {
    const p = JSON.parse(safeGet(PROFILES_KEY) ?? "null");
    if (p && Array.isArray(p.names)) return { remembered: typeof p.remembered === "string" ? p.remembered : null, names: p.names };
  } catch { /* corrupt */ }
  return { remembered: null, names: [] };
}
const writeProfiles = (p: ProfileStore) => safeSet(PROFILES_KEY, JSON.stringify(p));

/** The player to auto-sign-in: remembered on this device, or signed in earlier in this tab. */
export function currentPlayer(): string | null {
  return readProfiles().remembered ?? safeGet(SESSION_KEY, globalThis.sessionStorage);
}

/**
 * Sign a player in. Adds them to the device's player list; if `remember`, they skip login next time.
 * The very first player to sign in inherits any pre-login save so no progress is lost.
 */
export function signIn(rawName: string, remember: boolean): string {
  const name = cleanName(rawName);
  const err = validateName(name);
  if (err) throw new Error(err);
  const p = readProfiles();
  const key = saveKeyFor(name);
  const legacy = safeGet(LEGACY_SAVE_KEY);
  if (legacy && !safeGet(key) && p.names.length === 0) {
    safeSet(key, legacy);
    safeDel(LEGACY_SAVE_KEY);
  }
  if (!p.names.some((n) => n.toLowerCase() === name.toLowerCase())) p.names.push(name);
  p.remembered = remember ? name : null;
  writeProfiles(p);
  safeSet(SESSION_KEY, name, globalThis.sessionStorage);
  return name;
}

/** Sign out: forget the remembered player on this device (their save stays). */
export function signOut() {
  const p = readProfiles();
  p.remembered = null;
  writeProfiles(p);
  safeDel(SESSION_KEY, globalThis.sessionStorage);
}
