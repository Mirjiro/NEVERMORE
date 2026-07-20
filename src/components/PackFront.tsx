"use client";

import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { CLASSIC_ORIGIN_BOX_ASSETS, CLASSIC_BOX_IDLE_ANIMATE, CLASSIC_BOX_IDLE_TRANSITION } from "@/lib/originBoxAssets";
import { cn } from "@/lib/cn";

const PACK_BG =
  "bg-[radial-gradient(ellipse_at_center,_#6b4423_0%,_#3b2415_55%,_#0d0805_100%)] border-amber-900/60";

/**
 * Both tiles fill whatever vertical room the carousel slide actually has —
 * `height: 100%` plus `aspect-ratio` derives the width, so the tile grows to
 * use available height on tall screens instead of leaving it empty — capped
 * by TILE_MAX_WIDTH so it never overflows a narrow screen's width.
 */
const TILE_MAX_WIDTH = "min(90vw, 500px)";

/** Placeholder Box art (brown/vignette background + wordmark) until real art ships. */
export default function PackFront({ packType, active = true }: { packType: PackType; active?: boolean }) {
  if (packType === "Classic") {
    return (
      <motion.div
        animate={CLASSIC_BOX_IDLE_ANIMATE}
        transition={CLASSIC_BOX_IDLE_TRANSITION}
        className={cn("relative", active && "drop-shadow-[0_0_28px_rgba(217,150,60,0.45)]")}
        style={{ height: "100%", maxWidth: TILE_MAX_WIDTH, aspectRatio: "2999 / 4000" }}
      >
        <img
          src={CLASSIC_ORIGIN_BOX_ASSETS.baseSrc}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
          style={{ objectFit: "contain" }}
        />
        <img
          src={CLASSIC_ORIGIN_BOX_ASSETS.lidSrc}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
          style={{ objectFit: "contain" }}
        />
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-4 text-center",
        PACK_BG,
        active && "shadow-[0_0_32px_-4px_rgba(217,150,60,0.45)]",
      )}
      style={{ height: "100%", maxWidth: TILE_MAX_WIDTH, aspectRatio: "4 / 5" }}
    >
      <div className="font-serif text-lg font-bold leading-tight tracking-wide text-ink sm:text-xl">
        <div>NEVERMORE:</div>
        <div>ORIGIN BOX</div>
      </div>

      <div className="mt-3 font-sans text-sm italic tracking-[0.2em] text-white [text-shadow:0_0_8px_rgba(255,255,255,0.55)]">
        {packType}
      </div>
    </div>
  );
}
