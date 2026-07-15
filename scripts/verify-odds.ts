import { rollPull, ORIGIN_ODDS, RARITY_ODDS, SLOT2_ODDS } from "../src/lib/odds.ts";
import { CARD_POOL } from "../src/lib/cardPool.ts";

/**
 * Simulates a large batch of pulls and checks the actual distribution
 * against the odds tables in src/lib/odds.ts, plus sanity-checks the card
 * pool data itself. Run with: npm run verify:odds
 *
 * This exists to catch odds/data bugs (e.g. a Classic Pack somehow producing
 * a Mythic card, or a rarity cell missing a name) before they ship, since
 * nothing else in this client-only prototype would ever flag that.
 */

const SAMPLE_SIZE = 500_000;
const TOLERANCE_PP = 0.5; // percentage points of slack before flagging a mismatch

const failures: string[] = [];

function tally(keys: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const k of keys) counts[k] = 0;
  return counts;
}

function checkDistribution(
  label: string,
  odds: Record<string, number>,
  counts: Record<string, number>,
  total: number,
) {
  for (const key of Object.keys(odds)) {
    const expectedPct = odds[key];
    const actualPct = ((counts[key] ?? 0) / total) * 100;
    const diff = Math.abs(actualPct - expectedPct);
    const ok = diff <= TOLERANCE_PP;
    console.log(
      `  ${key.padEnd(16)} expected ${expectedPct.toFixed(2).padStart(6)}%  actual ${actualPct.toFixed(2).padStart(6)}%  ${ok ? "OK" : "FAIL"}`,
    );
    if (!ok) {
      failures.push(`${label}: "${key}" expected ~${expectedPct}%, got ${actualPct.toFixed(2)}% (n=${total})`);
    }
  }
}

console.log(`Simulating ${SAMPLE_SIZE.toLocaleString()} Classic Pack pulls...\n`);

const originCounts = tally(Object.keys(ORIGIN_ODDS));
const rarityCounts = tally(Object.keys(RARITY_ODDS));
const slot2Counts = tally(Object.keys(SLOT2_ODDS));

for (let i = 0; i < SAMPLE_SIZE; i++) {
  const pull = rollPull();
  originCounts[pull.origin]++;
  rarityCounts[pull.rarity]++;
  slot2Counts[pull.slot2.type]++;
}

console.log("Origin distribution:");
checkDistribution("Origin", ORIGIN_ODDS, originCounts, SAMPLE_SIZE);

console.log("\nRarity distribution (Classic Pack):");
checkDistribution("Rarity", RARITY_ODDS, rarityCounts, SAMPLE_SIZE);

if (rarityCounts.Mythic > 0 || rarityCounts.Forbidden > 0) {
  failures.push(
    `Rarity: Classic Pack produced Mythic (${rarityCounts.Mythic}) or Forbidden (${rarityCounts.Forbidden}) pulls — these must be unreachable from this pack type.`,
  );
}

console.log("\nSlot 2 distribution:");
checkDistribution("Slot2", SLOT2_ODDS, slot2Counts, SAMPLE_SIZE);

console.log("\nCard pool integrity:");
let poolIssues = 0;
let cellCount = 0;
for (const [origin, rarities] of Object.entries(CARD_POOL)) {
  for (const [rarity, names] of Object.entries(rarities)) {
    cellCount++;
    const [a, b] = names as [string, string];
    if (!a || !b || a === b) {
      failures.push(`CardPool: ${origin}/${rarity} has invalid or duplicate names: "${a}", "${b}"`);
      poolIssues++;
    }
  }
}
console.log(
  poolIssues === 0
    ? `  all ${cellCount} Origin/Rarity cells have 2 distinct names — OK`
    : `  ${poolIssues} issue(s) found across ${cellCount} cells`,
);

console.log("\n" + "=".repeat(50));
if (failures.length > 0) {
  console.error(`\n${failures.length} CHECK(S) FAILED:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
} else {
  console.log("\nAll odds and card pool checks passed.");
}
