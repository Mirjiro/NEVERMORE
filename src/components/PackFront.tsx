"use client";

import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { ORIGIN_BOX_ASSETS, BOX_IDLE_ANIMATE, BOX_IDLE_TRANSITION } from "@/lib/originBoxAssets";
import { cn } from "@/lib/cn";

/**
 * Both tiles size purely off viewport width (clamp), never off an ancestor's
 * resolved height. `aspect-ratio` combined with `height: 100%` requires
 * percentage-height to resolve correctly through several nested flex layers,
 * which is a known source of cross-browser inconsistency — width-only sizing
 * has no such dependency and renders identically everywhere.
 */
export const TILE_WIDTH = "clamp(260px, 84vw, 460px)";

export default function PackFront({ packType, active = true }: { packType: PackType; active?: boolean }) {
  const assets = ORIGIN_BOX_ASSETS[packType];

  return (
    <motion.div
      // Only the active slide gets the idle bob — an inactive carousel slide
      // (scaled down, blurred, mostly out of focus) has no reason to keep
      // running an infinite Framer Motion animation, and having both slides
      // animate at once doubles the continuous main-thread work for a
      // second box nobody is looking at, right when the CSS scale/opacity
      // transition between them needs the thread free to render smoothly.
      animate={active ? BOX_IDLE_ANIMATE : { y: 0, rotate: 0 }}
      transition={active ? BOX_IDLE_TRANSITION : { duration: 0 }}
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
