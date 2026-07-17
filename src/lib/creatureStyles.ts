import type { CreatureRarity } from "./types";
import type { ParticleLevel } from "./rarityStyles";

export interface CreatureStyle {
  /** Card border — the "glass rim". */
  border: string;
  /** Outer glow + inner glass-rim highlight (box-shadow). */
  glow: string;
  /** Translucent glass-panel tint. */
  glassBg: string;
  /** Small uppercase origin/rarity label color. */
  labelAccent: string;
  /** Name text color + glow classes. */
  nameClass: string;
  particles: ParticleLevel;
  screenShake: boolean;
  /** Extra silent beat (ms) before the cinematic flip starts. */
  silenceBeatMs: number;
  flipDurationS: number;
}

/**
 * Placeholder creature cosmetics — bright pink glass-rimmed glow for
 * Legendary/Mythic, a distinct black-glass/pink-outline treatment for
 * Forbidden. Meant to stand in until real creature art exists.
 */
export const CREATURE_STYLES: Record<CreatureRarity, CreatureStyle> = {
  Legendary: {
    border: "border-pink-400",
    glow: "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_0_45px_14px_rgba(236,72,153,0.7)]",
    glassBg: "bg-pink-500/10",
    labelAccent: "text-pink-200",
    nameClass: "text-pink-300 [text-shadow:0_0_16px_rgba(236,72,153,0.95),0_0_32px_rgba(236,72,153,0.55)]",
    particles: "burst",
    screenShake: false,
    silenceBeatMs: 250,
    flipDurationS: 1.1,
  },
  Mythic: {
    border: "border-pink-300",
    glow: "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_0_60px_18px_rgba(219,39,119,0.75)]",
    glassBg: "bg-pink-500/15",
    labelAccent: "text-pink-100",
    nameClass: "text-pink-200 [text-shadow:0_0_18px_rgba(236,72,153,1),0_0_36px_rgba(219,39,119,0.7)]",
    particles: "storm",
    screenShake: true,
    silenceBeatMs: 400,
    flipDurationS: 1.4,
  },
  Forbidden: {
    border: "border-black",
    glow: "shadow-[inset_0_0_0_1px_rgba(244,114,182,0.4),0_0_70px_22px_rgba(157,23,77,0.85)]",
    glassBg: "bg-black/60",
    labelAccent: "text-pink-300",
    nameClass: "text-black [text-shadow:0_0_6px_#f472b6,0_0_12px_#ec4899,0_0_22px_#db2777]",
    particles: "storm",
    screenShake: true,
    silenceBeatMs: 700,
    flipDurationS: 1.8,
  },
};
