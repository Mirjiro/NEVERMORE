/** Small daily-habit reward, not the primary Gold faucet — Origin pulls stay
 * the main progression loop. Accrual stops at the cap rather than banking
 * indefinitely, so skipping a day doesn't create a growing backlog. */
export const IDLE_GOLD_PER_HOUR = 500;
export const IDLE_CAP_HOURS = 8;

const MS_PER_HOUR = 60 * 60 * 1000;
const IDLE_CAP_MS = IDLE_CAP_HOURS * MS_PER_HOUR;

/** Gold accrued between `lastCollectAt` and `now`, capped at `IDLE_CAP_HOURS`. */
export function computeIdleGold(lastCollectAt: number, now: number): number {
  const elapsedMs = Math.min(Math.max(0, now - lastCollectAt), IDLE_CAP_MS);
  return Math.floor((elapsedMs / MS_PER_HOUR) * IDLE_GOLD_PER_HOUR);
}
