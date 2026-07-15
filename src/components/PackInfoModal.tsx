"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { getRarityOdds, PACK_CONFIG } from "@/lib/odds";

export default function PackInfoModal({
  open,
  packType,
  onClose,
}: {
  open: boolean;
  packType: PackType;
  onClose: () => void;
}) {
  const rarityOdds = Object.entries(getRarityOdds(packType)).filter(([, pct]) => pct > 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-50">
                {PACK_CONFIG[packType].label} Origin Pack — {PACK_CONFIG[packType].cost.toLocaleString()}{" "}
                {PACK_CONFIG[packType].currency}
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-400"
              >
                ✕
              </button>
            </div>

            {rarityOdds.map(([rarity, pct]) => (
              <div key={rarity} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-zinc-300">{rarity}</span>
                <span className="font-mono text-zinc-100">{pct}%</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
