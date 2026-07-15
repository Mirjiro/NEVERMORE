"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Origin, Rarity } from "@/lib/types";
import { RARITY_STYLES } from "@/lib/rarityStyles";
import { cn } from "@/lib/cn";
import ParticleBurst from "./ParticleBurst";

export default function CardFace({
  origin,
  rarity,
  name,
  size = "lg",
  onFlipComplete,
}: {
  origin: Origin;
  rarity: Rarity;
  name: string;
  size?: "lg" | "sm";
  onFlipComplete?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const style = RARITY_STYLES[rarity];

  const dims =
    size === "lg"
      ? "w-56 h-80 sm:w-64 sm:h-96"
      : "w-24 h-36 sm:w-28 sm:h-40";

  return (
    <div className={cn("relative mx-auto", dims)} style={{ perspective: 1200 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{
          duration: style.flipDurationS,
          delay: style.silenceBeatMs / 1000,
          ease: [0.25, 0.8, 0.3, 1],
        }}
        onAnimationComplete={() => {
          setRevealed(true);
          onFlipComplete?.();
        }}
      >
        {/* Front face */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 bg-zinc-900 p-3 overflow-hidden",
            style.border,
            style.glow,
            style.crackle && "animate-[crackle_1.4s_ease-in-out_infinite]",
            style.iridescent && "animate-[iridescent_3s_linear_infinite]",
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          {style.shimmer && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent"
              initial={{ x: "-120%" }}
              animate={{ x: "120%" }}
              transition={{ duration: 1.1, delay: style.silenceBeatMs / 1000 + 0.1 }}
            />
          )}
          <span className={cn("text-[10px] sm:text-xs uppercase tracking-widest", style.accent)}>
            {origin}
          </span>
          <span
            className={cn(
              "mt-3 text-center font-semibold text-white",
              size === "lg" ? "text-lg sm:text-xl" : "text-xs sm:text-sm",
            )}
          >
            {name}
          </span>
          <span className={cn("mt-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider", style.accent)}>
            {style.label}
          </span>

          {revealed && style.particles !== "none" && (
            <ParticleBurst level={style.particles} colorClass={style.accent} />
          )}
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-zinc-700 bg-zinc-950"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="font-serif text-2xl tracking-[0.3em] text-zinc-600">NM</span>
        </div>
      </motion.div>
    </div>
  );
}
