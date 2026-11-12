/**
 * Desk shipping flow (pure, UI-side): check items → tap paper to stamp APPROVED → SHIP.
 * Stamping never touches inventory, cash or order status; only engine.shipOrder does that.
 */
/** x = % of paper width, y = px from the top of the paper content. */
export interface Stamp { x: number; y: number; rot: number; seed: number }
export interface ShipFlow { checked: Record<string, boolean>; stamp: Stamp | null }

export const initialFlow = (): ShipFlow => ({ checked: {}, stamp: null });

/** Check/uncheck a requirement. Checking needs inventory; unchecking clears any stamp. */
export function toggleCheck(f: ShipFlow, pillId: string, value: boolean, hasInventory: boolean): ShipFlow {
  if (value && !hasInventory) return f;
  return { checked: { ...f.checked, [pillId]: value }, stamp: value ? f.stamp : null };
}

export const allChecked = (f: ShipFlow, pillIds: string[]) => pillIds.length > 0 && pillIds.every((id) => f.checked[id]);

/** May the paper be stamped right now? (once per attempt) */
export const canStamp = (f: ShipFlow, pillIds: string[], ready: boolean, open: boolean) =>
  open && ready && allChecked(f, pillIds) && !f.stamp;

export function applyStamp(f: ShipFlow, pillIds: string[], ready: boolean, open: boolean, at: Omit<Stamp, "seed" | "rot">, rand: () => number = Math.random): ShipFlow {
  if (!canStamp(f, pillIds, ready, open)) return f;
  return { ...f, stamp: { ...at, rot: -14 + rand() * 18, seed: Math.floor(rand() * 1000) } };
}

/** SHIP is enabled only when every item is checked, inventory is ready and the paper is stamped. */
export const canShip = (f: ShipFlow, pillIds: string[], ready: boolean, open: boolean) =>
  open && ready && allChecked(f, pillIds) && !!f.stamp;

/** Friendly deadline: "2 days", "5 hours", "40 min". */
export function friendlyDue(ms: number): string {
  if (ms <= 0) return "now";
  const h = ms / 3_600_000;
  if (h >= 24) { const d = Math.round(h / 24); return `${d} day${d > 1 ? "s" : ""}`; }
  if (h >= 1) { const r = Math.round(h); return `${r} hour${r > 1 ? "s" : ""}`; }
  return `${Math.max(1, Math.round(ms / 60_000))} min`;
}
