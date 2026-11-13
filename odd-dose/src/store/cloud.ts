/**
 * Account sync through the claude.ai artifact runtime (`db` + `user` capabilities).
 *
 * When the game runs as a claude.ai artifact, the remembered player and each player's save are kept in the
 * viewer's PRIVATE subtree `data/users/<id>/` — readable and writable only by that viewer. This survives cleared
 * browser storage and follows the viewer to other devices. Outside claude.ai (local dev, a downloaded copy,
 * a host that never answers) every call quietly no-ops and the game uses browser storage only.
 */
import type { GameState, Specimen } from "../engine/types";
import { cleanName } from "./profiles";

/* Minimal structural types for the parts of the runtime we use. */
interface DocSnap { exists: boolean; data(): Record<string, unknown> | undefined }
interface DocRef { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void> }
export interface CloudDb { doc(path: string): DocRef }
interface UserNs { id(): Promise<string | null> }
interface ClaudeRuntime { use(name: string): Promise<unknown> }

export interface Cloud { db: CloudDb; uid: string }
export interface CloudProfile { remembered: string | null; names: string[] }

const TIMEOUT_MS = 4000;
const MAX_DOC_BYTES = 240_000; // store limit is 256 KiB per document

let cloudPromise: Promise<Cloud | null> | null = null;

/** Connect once (memoized). Resolves null when not running inside claude.ai or not signed in. */
export function connectCloud(runtime: ClaudeRuntime | undefined = (globalThis as { claude?: ClaudeRuntime }).claude): Promise<Cloud | null> {
  if (cloudPromise) return cloudPromise;
  cloudPromise = (async () => {
    if (!runtime || typeof runtime.use !== "function") return null;
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS));
    try {
      const pair = await Promise.race([Promise.all([runtime.use("db"), runtime.use("user")]), timeout]);
      if (!pair) return null;
      const [db, user] = pair as [CloudDb | null, UserNs | null];
      if (!db || !user) return null;
      const uid = await Promise.race([user.id(), timeout]);
      return uid ? { db, uid } : null;
    } catch {
      return null;
    }
  })();
  return cloudPromise;
}
/** Tests only. */
export const _resetCloud = () => { cloudPromise = null; };

/** Document-safe key for a player name (path segments allow only a-z 0-9 _ - . ~ : @ +). */
export function nameKey(name: string): string {
  return Array.from(cleanName(name).toLowerCase())
    .map((c) => (/[a-z0-9]/.test(c) ? c : `_${c.codePointAt(0)!.toString(16)}`))
    .join("")
    .slice(0, 180);
}
const profilePath = (uid: string) => `data/users/${uid}/profile`;
const savePath = (uid: string, name: string) => `data/users/${uid}/save-${nameKey(name)}`;

export async function readCloudProfile(c: Cloud): Promise<CloudProfile | null> {
  try {
    const snap = await c.db.doc(profilePath(c.uid)).get();
    const d = snap.exists ? snap.data() : undefined;
    if (!d) return null;
    return { remembered: typeof d.remembered === "string" ? d.remembered : null, names: Array.isArray(d.names) ? (d.names as string[]) : [] };
  } catch { return null; }
}

export async function writeCloudProfile(c: Cloud, p: CloudProfile): Promise<void> {
  try { await c.db.doc(profilePath(c.uid)).set({ remembered: p.remembered, names: p.names.slice(0, 50), updatedAt: Date.now() }); } catch { /* offline / read-only viewer */ }
}

/* Saves are packed (specimens as tuples) to stay well under the per-document size limit. */
type PackedSpecimen = [string, string, number, 0 | 1, number, string, string];
export function packSave(s: GameState): string {
  const { specimens, ...rest } = s;
  const packed: PackedSpecimen[] = specimens.map((x) => [x.id, x.pillId, x.star, x.identified ? 1 : 0, x.acquiredAt, x.source, x.reservedBy ?? ""]);
  return JSON.stringify({ ...rest, specimens: undefined, _packedSpecimens: packed });
}
export function unpackSave(json: string): string {
  const d = JSON.parse(json) as Record<string, unknown> & { _packedSpecimens?: PackedSpecimen[] };
  const packed = d._packedSpecimens ?? [];
  delete d._packedSpecimens;
  d.specimens = packed.map(([id, pillId, star, identified, acquiredAt, source, reservedBy]): Specimen => ({
    id, pillId, star: star as Specimen["star"], identified: identified === 1, acquiredAt, source: source as Specimen["source"], ...(reservedBy ? { reservedBy } : {}),
  }));
  return JSON.stringify(d);
}

/** The cloud copy of a player's save as plain save JSON, with the time it was last played, or null. */
export async function readCloudSave(c: Cloud, name: string): Promise<{ json: string; at: number } | null> {
  try {
    const snap = await c.db.doc(savePath(c.uid, name)).get();
    const d = snap.exists ? snap.data() : undefined;
    if (!d || typeof d.packed !== "string") return null;
    return { json: unpackSave(d.packed), at: typeof d.at === "number" ? d.at : 0 };
  } catch { return null; }
}

/** Debounced, one-at-a-time cloud saver. Writes only after real actions, never on the clock. */
export function createCloudSaver(c: Cloud, name: string, delayMs = 6000) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: GameState | null = null;
  let inFlight = false;
  let lastJson = "";
  let tooBig = false;
  const flush = async () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending || inFlight || tooBig) return;
    const s = pending; pending = null;
    const packed = packSave(s);
    if (packed === lastJson) return;
    if (packed.length > MAX_DOC_BYTES) { tooBig = true; return; } // keep playing on local storage
    inFlight = true;
    try { await c.db.doc(savePath(c.uid, name)).set({ packed, at: s.lastTickAt, v: 1 }); lastJson = packed; } catch { /* retry on next change */ }
    inFlight = false;
    if (pending) schedule(pending);
  };
  const schedule = (s: GameState) => {
    pending = s;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), delayMs);
  };
  return { schedule, flush: () => void flush() };
}
