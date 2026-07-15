import {
  rollPull,
  ORIGIN_ODDS,
  RARITY_ODDS_CLASSIC,
  RARITY_ODDS_ELITE,
  SLOT2_ODDS_CLASSIC,
  SLOT2_ODDS_ELITE,
  AMOUNT_RANGES,
} from "../src/lib/odds.ts";
import { CARD_POOL } from "../src/lib/cardPool.ts";
import type { PackType } from "../src/lib/types.ts";

/**
 * Simulates large batches of pulls for both pack types and checks the actual
 * distribution against the odds tables in src/lib/odds.ts, plus sanity-checks
 * the card pool data itself. Run with: npm run verify:odds
 *
 * This exists to catch odds/data bugs (e.g. a Classic Pack somehow producing
 * a Mythic card, or an Elite Gold drop outside its range) before they ship,
 * since nothing else in this client-only prototype would ever flag that.
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

function verifyPackType(packType: PackType) {
  console.log(`\n${"#".repeat(50)}\n${packType} Origin Pack — simulating ${SAMPLE_SIZE.toLocaleString()} pulls\n${"#".repeat(50)}`);

  const rarityOdds = packType === "Elite" ? RARITY_ODDS_ELITE : RARITY_ODDS_CLASSIC;
  const slot2Odds = packType === "Elite" ? SLOT2_ODDS_ELITE : SLOT2_ODDS_CLASSIC;
  const { gold, diamonds } = AMOUNT_RANGES[packType];

  const originCounts = tally(Object.keys(ORIGIN_ODDS));
  const rarityCounts = tally(Object.keys(rarityOdds));
  const slot2Counts = tally(Object.keys(slot2Odds));
  let goldOutOfRange = 0;
  let diamondsOutOfRange = 0;

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const pull = rollPull(packType);
    originCounts[pull.origin]++;
    rarityCounts[pull.rarity]++;
    slot2Counts[pull.slot2.type]++;
    if (pull.slot2.type === "Gold" && (pull.slot2.amount < gold[0] || pull.slot2.amount > gold[1])) {
      goldOutOfRange++;
    }
    if (pull.slot2.type === "Diamonds" && (pull.slot2.amount < diamonds[0] || pull.slot2.amount > diamonds[1])) {
      diamondsOutOfRange++;
    }
  }

  console.log("\nOrigin distribution:");
  checkDistribution("Origin", ORIGIN_ODDS, originCounts, SAMPLE_SIZE);

  console.log("\nRarity distribution:");
  checkDistribution("Rarity", rarityOdds, rarityCounts, SAMPLE_SIZE);

  for (const [rarity, pct] of Object.entries(rarityOdds)) {
    if (pct === 0 && rarityCounts[rarity] > 0) {
      failures.push(`${packType} Rarity: "${rarity}" should be unreachable but got ${rarityCounts[rarity]} pulls.`);
    }
  }

  console.log("\nSlot 2 distribution:");
  checkDistribution("Slot2", slot2Odds, slot2Counts, SAMPLE_SIZE);

  if (goldOutOfRange > 0) {
    failures.push(`${packType} Gold: ${goldOutOfRange} drop(s) fell outside [${gold[0]}, ${gold[1]}]`);
  }
  if (diamondsOutOfRange > 0) {
    failures.push(`${packType} Diamonds: ${diamondsOutOfRange} drop(s) fell outside [${diamonds[0]}, ${diamonds[1]}]`);
  }
  console.log(`\nAmount ranges: Gold out-of-range: ${goldOutOfRange}, Diamonds out-of-range: ${diamondsOutOfRange}`);
}

verifyPackType("Classic");
verifyPackType("Elite");

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
