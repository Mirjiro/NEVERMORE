import { BALANCE } from "./balance";

/** HQ upgrades. Each upgrade has tiers; the player owns 0..tiers.length of them. */
export interface UpgradeTier {
  cost: number;
  level: number; // company level required
  label: string;
}
export interface UpgradeDef {
  id: string;
  name: string;
  group: "Lab" | "Copier" | "Business" | "Access";
  desc: string;
  tiers: UpgradeTier[];
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "machines", name: "Additional Machine", group: "Lab",
    desc: "Install another Lab Machine. Each Machine works independently.",
    tiers: [
      { cost: 1500, level: 2, label: "2nd Machine" },
      { cost: 6000, level: 4, label: "3rd Machine" },
    ],
  },
  {
    id: "incubation", name: "Incubator Tuning", group: "Lab",
    desc: "Machines incubate 15% faster per tier.",
    tiers: [
      { cost: 800, level: 2, label: "−15% time" },
      { cost: 2500, level: 4, label: "−30% time" },
      { cost: 8000, level: 6, label: "−45% time" },
    ],
  },
  {
    id: "scanner", name: "Scanner", group: "Access",
    desc: "Unlocks the Lab Scanner for identifying ? specimens.",
    tiers: [{ cost: 300, level: 1, label: "Install Scanner" }],
  },
  {
    id: "copierSpeed", name: "Copier Motor", group: "Copier",
    desc: "Copier batches finish 20% faster per tier.",
    tiers: [
      { cost: 400, level: 1, label: "−20% time" },
      { cost: 1500, level: 3, label: "−40% time" },
      { cost: 5000, level: 5, label: "−60% time" },
    ],
  },
  {
    id: "copierBatch", name: "Copier Tray", group: "Copier",
    desc: "Raise the maximum batch quantity.",
    tiers: [
      { cost: 600, level: 2, label: "Max batch 22" },
      { cost: 2400, level: 4, label: "Max batch 44" },
    ],
  },
  {
    id: "sales", name: "Sales Team", group: "Business",
    desc: "Order payouts +10% per tier.",
    tiers: [
      { cost: 1000, level: 2, label: "+10% payouts" },
      { cost: 4000, level: 5, label: "+20% payouts" },
    ],
  },
  {
    id: "pr", name: "PR Agency", group: "Business",
    desc: "Popularity grows 50% faster from shipments.",
    tiers: [{ cost: 1200, level: 3, label: "+50% popularity gain" }],
  },
  {
    id: "backdoor", name: "BACKDOOR Access", group: "Access",
    desc: "A key to the simulated underground market. Buy, sell, follow the FIRE list.",
    tiers: [{ cost: 2000, level: 5, label: "Unlock BACKDOOR" }],
  },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** Upgrade effect helpers (pure functions of owned tiers). */
export const EFFECTS = {
  machineCount: (t: number) => 1 + t,
  incubationMult: (t: number) => 1 - 0.15 * t,
  copierTimeMult: (t: number) => 1 - 0.2 * t,
  copierMaxBatch: (t: number) => BALANCE.copier.baseMaxBatch * 2 ** t,
  payoutMult: (t: number) => 1 + 0.1 * t,
  popularityGainMult: (t: number) => 1 + 0.5 * t,
};
