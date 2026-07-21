"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Origin, PackType } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ORIGIN_THEME } from "@/lib/originTheme";
import OriginPackInfoModal from "./OriginPackInfoModal";

/**
 * Sits between the box-opening animation and the card reveal: once the box
 * has visually opened, this shows which Origin Pack it contained (themed per
 * Origin) and waits for an explicit tap before advancing to the cards —
 * mirroring the box-opening step, this is a deliberate beat rather than an
 * auto-advance.
 */
export default function OriginPackCover({
  packType,
  origin,
  onTapToReveal,
}: {
  packType: PackType;
  origin: Origin;
  onTapToReveal: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const theme = ORIGIN_THEME[origin];

  return (
    <div className="relative flex flex-col items-center">
      <motion.button
        type="button"
        onClick={onTapToReveal}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "relative flex h-80 w-56 flex-col items-center justify-center rounded-xl border-2 px-3 text-center sm:h-96 sm:w-64",
          theme.bg,
          theme.border,
        )}
        aria-label="Tap to reveal your card"
      >
        <div className="font-serif text-lg font-bold tracking-wide text-ink sm:text-xl">ORIGIN:</div>
        <div className="mt-1 font-serif text-lg font-bold tracking-wide text-ink sm:text-xl">{origin} Pack</div>
      </motion.button>

      <div className="mt-4 flex flex-col items-center gap-2">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ opacity: { duration: 1.4, repeat: Infinity } }}
          className="text-center text-sm font-semibold uppercase tracking-widest text-ink-muted"
        >
          Tap To Reveal
        </motion.p>
        <button
          onClick={() => setInfoOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 font-serif text-xs italic text-ink-muted"
          aria-label={`${origin} Pack info`}
        >
          i
        </button>
      </div>

      <OriginPackInfoModal open={infoOpen} origin={origin} packType={packType} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
