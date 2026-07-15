import type { Origin } from "./types";

/**
 * Per-Origin placeholder cover theme for the post-purchase "ORIGIN: X Pack"
 * reveal face, so each Origin reads as visually distinct before real art
 * exists. The pre-flip pack face (Classic/Elite) stays generic since it
 * hasn't been identified as an Origin yet.
 */
export const ORIGIN_THEME: Record<Origin, { bg: string; border: string }> = {
  Vampire: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#5c1a1a_0%,_#2e0d0d_55%,_#0a0505_100%)]",
    border: "border-red-900/70",
  },
  Fae: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#1f4d3a_0%,_#123024_55%,_#050b09_100%)]",
    border: "border-emerald-900/70",
  },
  Demon: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#3a0f0f_0%,_#1a0505_55%,_#050202_100%)]",
    border: "border-red-950",
  },
  Angel: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#5c4f2a_0%,_#332c17_55%,_#0f0d06_100%)]",
    border: "border-amber-100/40",
  },
  Mage: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#3a2a5c_0%,_#211735_55%,_#08050f_100%)]",
    border: "border-indigo-800/70",
  },
  Werewolf: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#3f3a35_0%,_#221f1c_55%,_#0a0908_100%)]",
    border: "border-zinc-500/60",
  },
  Royal: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#4a2d5c_0%,_#2a1935_55%,_#0c0710_100%)]",
    border: "border-purple-800/70",
  },
};
