"use client";

import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import {
  CLASSIC_ORIGIN_BOX_ASSETS,
  ELITE_ORIGIN_BOX_ASSETS,
  BOX_IDLE_ANIMATE,
  BOX_IDLE_TRANSITION,
} from "@/lib/originBoxAssets";
import { cn } from "@/lib/cn";

/**
 * Both tiles size purely off viewport width (clamp), never off an ancestor's
 * resolved height. `aspect-ratio` combined with `height: 100%` requires
 * percentage-height to resolve correctly through several nested flex layers,
 * which is a known source of cross-browser inconsistency — width-only sizing
 * has no such dependency and renders identically everywhere.
 */
export const TILE_WIDTH = "clamp(260px, 84vw, 460px)";

const BOX_ASSETS: Record<PackType, { lidSrc: string; baseSrc: string }> = {
  Classic: CLASSIC_ORIGIN_BOX_ASSETS,
  Elite: ELITE_ORIGIN_BOX_ASSETS,
};

export default function PackFront({ packType, active = true }: { packType: PackType; active?: boolean }) {
  const assets = BOX_ASSETS[packType];

  return (
    <motion.div
      animate={BOX_IDLE_ANIMATE}
      transition={BOX_IDLE_TRANSITION}
      className={cn("relative", active && "drop-shadow-[0_0_28px_rgba(217,150,60,0.45)]")}
      style={{ width: TILE_WIDTH, aspectRatio: "2999 / 4000" }}
    >
      <img
        src={assets.baseSrc}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full select-none"
        style={{ objectFit: "contain" }}
      />
      <img
        src={assets.lidSrc}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full select-none"
        style={{ objectFit: "contain" }}
      />
    </motion.div>
  );
}
