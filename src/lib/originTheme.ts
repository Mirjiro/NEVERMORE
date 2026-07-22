import type { Origin } from "./types";

/**
 * Per-Origin placeholder cover theme for the post-purchase "ORIGIN: X Pack"
 * reveal face, so each Origin reads as visually distinct before real art
 * exists. The pre-flip pack face (Classic/Elite) stays generic since it
 * hasn't been identified as an Origin yet. `accent` is a restrained text
 * color reused for small Origin-specific UI touches (e.g. modal titles).
 * `bar` is the matching solid-fill background class for the same color —
 * kept as its own literal class (rather than deriving it from `accent` at
 * runtime, e.g. via string replace) because Tailwind's build-time class
 * scanner only generates CSS for class names it can find as literal
 * strings in source; a runtime-constructed class name would silently
 * produce no styles at all.
 */
export const ORIGIN_THEME: Record<Origin, { bg: string; border: string; accent: string; bar: string }> = {
  Vampire: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#5c1a1a_0%,_#2e0d0d_55%,_#0a0505_100%)]",
    border: "border-red-900/70",
    accent: "text-red-400",
    bar: "bg-red-400",
  },
  Fae: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#1f4d3a_0%,_#123024_55%,_#050b09_100%)]",
    border: "border-emerald-900/70",
    accent: "text-emerald-400",
    bar: "bg-emerald-400",
  },
  Demon: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#3a0f0f_0%,_#1a0505_55%,_#050202_100%)]",
    border: "border-red-950",
    accent: "text-red-500",
    bar: "bg-red-500",
  },
  Angel: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#5c4f2a_0%,_#332c17_55%,_#0f0d06_100%)]",
    border: "border-amber-100/40",
    accent: "text-amber-200",
    bar: "bg-amber-200",
  },
  Mage: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#3a2a5c_0%,_#211735_55%,_#08050f_100%)]",
    border: "border-indigo-800/70",
    accent: "text-indigo-400",
    bar: "bg-indigo-400",
  },
  Werewolf: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#3f3a35_0%,_#221f1c_55%,_#0a0908_100%)]",
    border: "border-zinc-500/60",
    accent: "text-zinc-300",
    bar: "bg-zinc-300",
  },
  Royal: {
    bg: "bg-[radial-gradient(ellipse_at_center,_#4a2d5c_0%,_#2a1935_55%,_#0c0710_100%)]",
    border: "border-purple-800/70",
    accent: "text-purple-400",
    bar: "bg-purple-400",
  },
};
