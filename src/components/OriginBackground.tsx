"use client";

import { motion } from "framer-motion";
import type { Transition } from "framer-motion";
import type { PackType } from "@/lib/types";

const BACKGROUND_SRC: Record<PackType, string> = {
  Classic: "/assets/backgrounds/classic-bg.webp",
  Elite: "/assets/backgrounds/elite-bg.webp",
};

// One-way duration before the drift mirrors back — 18-24s per pack, slightly
// offset between the two so they don't drift in visible lockstep.
const DRIFT_TRANSITION: Record<PackType, Transition> = {
  Classic: { duration: 21, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
  Elite: { duration: 23, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
};

const VIGNETTE_TRANSITION: Transition = {
  duration: 14,
  repeat: Infinity,
  repeatType: "mirror",
  ease: "easeInOut",
};

function BackgroundLayer({ pack, active }: { pack: PackType; active: boolean }) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-700 ease-out"
      style={{ opacity: active ? 1 : 0 }}
    >
      {/* Overscanned beyond the frame so the drift's scale/translate never
          exposes an edge, regardless of the source image's aspect ratio. */}
      <motion.div
        className="absolute"
        style={{ top: -16, bottom: -16, left: -16, right: -16 }}
        animate={{ scale: [1, 1.015], y: [0, -4] }}
        transition={DRIFT_TRANSITION[pack]}
      >
        <img
          src={BACKGROUND_SRC[pack]}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover"
          style={{ filter: "blur(0.8px) brightness(0.9)" }}
        />
      </motion.div>
    </div>
  );
}

/**
 * Full-bleed, cinematic backdrop for the Origin tab — one persistent layer per
 * pack, crossfaded via opacity rather than mounted/unmounted, so the drift
 * animation underneath never restarts when the active pack switches.
 */
export default function OriginBackground({ active }: { active: PackType }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 -left-4 -right-4 -z-10 overflow-hidden">
      <BackgroundLayer pack="Classic" active={active === "Classic"} />
      <BackgroundLayer pack="Elite" active={active === "Elite"} />
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.45, 0.48] }}
        transition={VIGNETTE_TRANSITION}
        style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 42%, rgba(0,0,0,0.75) 100%)" }}
      />
    </div>
  );
}
