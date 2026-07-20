"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Slot2Result } from "@/lib/types";
import { CREATURE_STYLES } from "@/lib/creatureStyles";
import { cn } from "@/lib/cn";
import ParticleBurst from "./ParticleBurst";

type CreaturePull = Extract<Slot2Result, { type: "Creature" }>;

/**
 * Cinematic reveal for the rare Creature bonus outcome — a placeholder
 * pink-glass cosmetic (with a distinct black/pink-outline variant for
 * Forbidden) meant to stand in until real creature art exists. Slower,
 * more dramatic flip timing than a normal card, scaled by rarity.
 */
export default function CreatureCard({
  creature,
  onFlipComplete,
}: {
  creature: CreaturePull;
  onFlipComplete?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const style = CREATURE_STYLES[creature.rarity];

  return (
    <div className="relative mx-auto h-80 w-56 sm:h-96 sm:w-64" style={{ perspective: 1400 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{
          rotateY: {
            duration: style.flipDurationS,
            delay: style.silenceBeatMs / 1000,
            ease: [0.16, 0.85, 0.2, 1],
          },
          scale: {
            duration: style.flipDurationS + 0.3,
            delay: style.silenceBeatMs / 1000,
            ease: [0.16, 0.85, 0.2, 1],
          },
        }}
        onAnimationComplete={() => {
          setRevealed(true);
          onFlipComplete?.();
        }}
      >
        {/* Back: blank cover shown before the cinematic flip */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-zinc-700 bg-zinc-950"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="font-serif text-2xl tracking-[0.3em] text-ink-faint">NM</span>
        </div>

        {/* Front: the creature reveal */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 p-3 text-center backdrop-blur-md",
            style.border,
            style.glow,
            style.glassBg,
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className={cn("text-[10px] uppercase tracking-widest sm:text-xs", style.labelAccent)}>
            {creature.origin} Creature
          </span>
          <span
            className={cn("mt-3 text-center text-lg font-bold sm:text-xl", style.nameClass)}
            style={creature.rarity === "Forbidden" ? { WebkitTextStroke: "1.2px #f472b6" } : undefined}
          >
            {creature.name}
          </span>
          <span className={cn("mt-3 text-[10px] font-bold uppercase tracking-wider sm:text-xs", style.labelAccent)}>
            {creature.rarity}
          </span>

          {revealed && <ParticleBurst level={style.particles} colorClass="text-pink-300" />}
        </div>
      </motion.div>
    </div>
  );
}
