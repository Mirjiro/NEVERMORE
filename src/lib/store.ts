export interface StorePack {
  amountLabel: string;
  price: string;
}

/** Real-money packs — buttons are disabled, this is a design-only placeholder (no payments yet). */
export const GOLD_PACKS: StorePack[] = [
  { amountLabel: "1,000", price: "$0.99" },
  { amountLabel: "6,000", price: "$4.99" },
  { amountLabel: "15K", price: "$9.99" },
  { amountLabel: "32K", price: "$19.99" },
  { amountLabel: "90K", price: "$49.99" },
  { amountLabel: "250K", price: "$99.99" },
];

export const DIAMOND_PACKS: StorePack[] = [
  { amountLabel: "500", price: "$4.99" },
  { amountLabel: "1,200", price: "$9.99" },
  { amountLabel: "2,500", price: "$19.99" },
  { amountLabel: "10K", price: "$49.99" },
  { amountLabel: "50K", price: "$99.99" },
];

export interface StoreDeal {
  name: string;
  goldLabel: string;
  diamondLabel: string;
  price: string;
}

/** Also design-only/disabled — bundled real-money offers. */
export const DEALS: StoreDeal[] = [
  { name: "Small", goldLabel: "5,500 Gold", diamondLabel: "1,000 Diamonds", price: "$9.99" },
  { name: "Medium", goldLabel: "9,000 Gold", diamondLabel: "3,000 Diamonds", price: "$19.99" },
  { name: "Large", goldLabel: "50K Gold", diamondLabel: "6,000 Diamonds", price: "$49.99" },
  { name: "Extreme", goldLabel: "100K Gold", diamondLabel: "15K Diamonds", price: "$99.99" },
];

export interface ExchangeOption {
  gainAmount: number;
  gainLabel: string;
  costAmount: number;
  costLabel: string;
}

/** Functional: spend Gold, receive Diamonds. */
export const DIAMOND_EXCHANGE: ExchangeOption[] = [
  { gainAmount: 10, gainLabel: "10 Diamonds", costAmount: 50_000, costLabel: "50K Gold" },
  { gainAmount: 100, gainLabel: "100 Diamonds", costAmount: 500_000, costLabel: "500K Gold" },
  { gainAmount: 1_000, gainLabel: "1,000 Diamonds", costAmount: 2_000_000, costLabel: "2M Gold" },
  { gainAmount: 5_000, gainLabel: "5,000 Diamonds", costAmount: 10_000_000, costLabel: "10M Gold" },
];

/** Functional: spend Diamonds, receive Gold. */
export const GOLD_EXCHANGE: ExchangeOption[] = [
  { gainAmount: 20_000, gainLabel: "20K Gold", costAmount: 10, costLabel: "10 Diamonds" },
  { gainAmount: 200_000, gainLabel: "200K Gold", costAmount: 100, costLabel: "100 Diamonds" },
  { gainAmount: 1_000_000, gainLabel: "1M Gold", costAmount: 1_000, costLabel: "1,000 Diamonds" },
  { gainAmount: 5_000_000, gainLabel: "5M Gold", costAmount: 5_000, costLabel: "5,000 Diamonds" },
];
