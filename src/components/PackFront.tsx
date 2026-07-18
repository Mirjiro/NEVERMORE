"use client";

import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { CLASSIC_ORIGIN_BOX_ASSETS, CLASSIC_BOX_IDLE_ANIMATE, CLASSIC_BOX_IDLE_TRANSITION } from "@/lib/originBoxAssets";
import { cn } from "@/lib/cn";

const PACK_BG =
  "bg-[radial-gradient(ellipse_at_center,_#6b4423_0%,_#3b2415_55%,_#0d0805_100%)] border-amber-900/60";

/** Placeholder Box art (brown/vignette background + wordmark) until real art ships. */
export default function PackFront({ packType, active = true }: { packType: PackType; active?: boolean }) {
  if (packType === "Classic") {
    return (
      <motion.div
        animate={CLASSIC_BOX_IDLE_ANIMATE}
        transition={CLASSIC_BOX_IDLE_TRANSITION}
        className={cn(
          "relative aspect-[4/5] h-[92%] max-h-[480px] w-auto",
          active && "drop-shadow-[0_0_28px_rgba(217,150,60,0.45)]",
        )}
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
        "relative flex aspect-[4/5] h-[92%] max-h-[480px] w-auto flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-4 text-center",
        PACK_BG,
        active && "shadow-[0_0_32px_-4px_rgba(217,150,60,0.45)]",
      )}
    >
      <div className="font-serif text-lg font-bold leading-tight tracking-wide text-zinc-100 sm:text-xl">
        <div>NEVERMORE:</div>
        <div>ORIGIN BOX</div>
      </div>

      <div className="mt-3 font-sans text-sm italic tracking-[0.2em] text-zinc-400 text-white [text-shadow:0_0_8px_rgba(255,255,255,0.55)]">
        {packType}
      </div>
    </div>
  );
}
