import type { Rarity } from "./types";

export type ParticleLevel = "none" | "subtle" | "burst" | "storm";

export interface RarityStyle {
  label: string;
  /** Tailwind classes for the card border. */
  border: string;
  /** Tailwind classes for the glow (box-shadow). */
  glow: string;
  /** Card text accent color. */
  accent: string;
  shimmer: boolean;
  pulsing: boolean;
  iridescent: boolean;
  crackle: boolean;
  particles: ParticleLevel;
  screenFlash: false | "gold" | "void";
  screenShake: boolean;
  /** Extra silent beat (ms) before the flip starts. */
  silenceBeatMs: number;
  flipDurationS: number;
}

export const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  Common: {
    label: "Common",
    border: "border-zinc-500",
    glow: "shadow-none",
    accent: "text-zinc-300",
    shimmer: false,
    pulsing: false,
    iridescent: false,
    crackle: false,
    particles: "none",
    screenFlash: false,
    screenShake: false,
    silenceBeatMs: 0,
    flipDurationS: 0.35,
  },
  Rare: {
    label: "Rare",
    border: "border-blue-400",
    glow: "shadow-[0_0_22px_4px_rgba(96,165,250,0.55)]",
    accent: "text-blue-300",
    shimmer: true,
    pulsing: false,
    iridescent: false,
    crackle: false,
    particles: "none",
    screenFlash: false,
    screenShake: false,
    silenceBeatMs: 0,
    flipDurationS: 0.5,
  },
  Epic: {
    label: "Epic",
    border: "border-purple-400",
    glow: "shadow-[0_0_32px_8px_rgba(192,132,252,0.65)]",
    accent: "text-purple-300",
    shimmer: true,
    pulsing: true,
    iridescent: false,
    crackle: false,
    particles: "subtle",
    screenFlash: false,
    screenShake: false,
    silenceBeatMs: 100,
    flipDurationS: 0.6,
  },
  Legendary: {
    label: "Legendary",
    border: "border-yellow-400",
    glow: "shadow-[0_0_48px_14px_rgba(250,204,21,0.8)]",
    accent: "text-yellow-300",
    shimmer: true,
    pulsing: true,
    iridescent: false,
    crackle: false,
    particles: "burst",
    screenFlash: "gold",
    screenShake: false,
    silenceBeatMs: 200,
    flipDurationS: 0.75,
  },
  Mythic: {
    label: "Mythic",
    border: "border-fuchsia-300",
    glow: "shadow-[0_0_55px_16px_rgba(217,70,239,0.55)]",
    accent: "text-fuchsia-200",
    shimmer: true,
    pulsing: true,
    iridescent: true,
    crackle: false,
    particles: "storm",
    screenFlash: "gold",
    screenShake: true,
    silenceBeatMs: 300,
    flipDurationS: 0.9,
  },
  Forbidden: {
    label: "Forbidden",
    border: "border-black",
    glow: "shadow-[0_0_60px_18px_rgba(126,34,206,0.65)]",
    accent: "text-red-400",
    shimmer: false,
    pulsing: false,
    iridescent: false,
    crackle: true,
    particles: "storm",
    screenFlash: "void",
    screenShake: true,
    silenceBeatMs: 700,
    flipDurationS: 1.0,
  },
};
