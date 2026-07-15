"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Origin, PackType } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ORIGIN_THEME } from "@/lib/originTheme";
import OriginPackInfoModal from "./OriginPackInfoModal";

const PACK_BG =
  "bg-[radial-gradient(ellipse_at_center,_#6b4423_0%,_#3b2415_55%,_#0d0805_100%)] border-amber-900/60";

export default function OriginRevealCard({
  packType,
  origin,
  onTapToReveal,
}: {
  packType: PackType;
  origin: Origin;
  onTapToReveal: () => void;
}) {
  const [settled, setSettled] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const theme = ORIGIN_THEME[origin];

  return (
    <div className="relative">
      <div className="relative mx-auto h-80 w-56 sm:h-96 sm:w-64" style={{ perspective: 1200 }}>
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 540 }}
          transition={{ duration: 0.9, ease: [0.25, 0.8, 0.3, 1] }}
          onAnimationComplete={() => setSettled(true)}
        >
          {/* Front: pack placeholder art (not Origin-specific yet) */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 px-3 text-center",
              PACK_BG,
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="font-serif text-base font-bold leading-tight tracking-wide text-zinc-100 sm:text-lg">
              <div>NEVERMORE:</div>
              <div>ORIGIN BOX</div>
            </div>
            <div
              className={cn(
                "mt-3 font-sans text-xs italic tracking-[0.2em] text-zinc-400",
                packType === "Elite" && "text-white [text-shadow:0_0_8px_rgba(255,255,255,0.55)]",
              )}
            >
              {packType}
            </div>
          </div>

          {/* Back: origin-specific cover */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 px-3 text-center",
              theme.bg,
              theme.border,
            )}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="font-serif text-lg font-bold tracking-wide text-zinc-100 sm:text-xl">ORIGIN:</div>
            <div className="mt-1 font-serif text-lg font-bold tracking-wide text-zinc-100 sm:text-xl">
              {origin} Pack
            </div>
          </div>
        </motion.div>

        {settled && (
          <button
            onClick={onTapToReveal}
            className="absolute inset-0 rounded-xl"
            aria-label="Tap to reveal your card"
          />
        )}
      </div>

      {settled && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ opacity: { duration: 1.4, repeat: Infinity } }}
            className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-300"
          >
            Tap To Reveal
          </motion.p>
          <button
            onClick={() => setInfoOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 font-serif text-xs italic text-zinc-300"
            aria-label={`${origin} Pack info`}
          >
            i
          </button>
        </div>
      )}

      <OriginPackInfoModal
        open={infoOpen}
        origin={origin}
        packType={packType}
        onClose={() => setInfoOpen(false)}
      />
    </div>
  );
}
