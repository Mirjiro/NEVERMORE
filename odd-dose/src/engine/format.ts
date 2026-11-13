/** The game's only currency is Gold, written with a lowercase g: 50g, 1,250g, 10,000g. */
export const gold = (n: number): string => `${Math.round(n).toLocaleString("en-US")}g`;
