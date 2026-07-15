"use client";

import { motion } from "framer-motion";
import type { Slot2Result } from "@/lib/types";
import { RARITY_STYLES } from "@/lib/rarityStyles";
import { cn } from "@/lib/cn";

function slot2Content(slot2: Slot2Result): { icon: string; title: string; subtitle: string; accent: string } {
  switch (slot2.type) {
    case "Card":
      return {
        icon: "🃏",
        title: slot2.name,
        subtitle: `${slot2.origin} · ${RARITY_STYLES[slot2.rarity].label}`,
        accent: RARITY_STYLES[slot2.rarity].accent,
      };
    case "Seed":
      return { icon: "🌱", title: "Seed", subtitle: "+1 added to inventory", accent: "text-emerald-300" };
    case "Gold":
      return { icon: "🪙", title: `+${slot2.amount.toLocaleString()} Gold`, subtitle: "added to balance", accent: "text-amber-300" };
    case "Diamonds":
      return { icon: "💎", title: `+${slot2.amount} Diamonds`, subtitle: "added to balance", accent: "text-cyan-300" };
    case "OriginCardPack":
      return { icon: "🎁", title: "Origin Card Pack!", subtitle: "+1 Free Classic Pack", accent: "text-yellow-300" };
    case "Creature":
      return { icon: "🐾", title: "Creature", subtitle: "+1 added to inventory", accent: "text-rose-300" };
  }
}

export default function Slot2Display({ slot2, pullId }: { slot2: Slot2Result; pullId: number }) {
  const { icon, title, subtitle, accent } = slot2Content(slot2);

  return (
    <motion.div
      key={pullId}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.35, ease: "easeOut" }}
      className="mx-auto mt-4 flex w-full max-w-xs items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3"
    >
      <span className="text-2xl leading-none">{icon}</span>
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-semibold", accent)}>{title}</p>
        <p className="truncate text-xs text-zinc-400">{subtitle}</p>
      </div>
    </motion.div>
  );
}
