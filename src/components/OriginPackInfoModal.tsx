"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Origin, PackType } from "@/lib/types";
import { getRarityOdds, getSlot2Odds, AMOUNT_RANGES } from "@/lib/odds";

function formatOutcomeLabel(outcome: string, packType: PackType): string {
  const label = outcome.replace(/([A-Z])/g, " $1").trim();
  const { gold, diamonds } = AMOUNT_RANGES[packType];
  if (outcome === "Gold") return `${label} (${gold[0].toLocaleString()}–${gold[1].toLocaleString()})`;
  if (outcome === "Diamonds") return `${label} (${diamonds[0].toLocaleString()}–${diamonds[1].toLocaleString()})`;
  return label;
}

export default function OriginPackInfoModal({
  open,
  origin,
  packType,
  onClose,
}: {
  open: boolean;
  origin: Origin;
  packType: PackType;
  onClose: () => void;
}) {
  const rarityOdds = Object.entries(getRarityOdds(packType)).filter(([, pct]) => pct > 0);
  const slot2Odds = Object.entries(getSlot2Odds(packType));

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
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-50">
                {origin} {packType} Pack
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm font-semibold text-emerald-400">Card: 100% guaranteed</p>

            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Card Rarity</h3>
            {rarityOdds.map(([rarity, pct]) => (
              <div key={rarity} className="flex items-center justify-between py-1 text-sm">
                <span className="text-zinc-300">{rarity}</span>
                <span className="font-mono text-zinc-100">{pct}%</span>
              </div>
            ))}

            <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Slot 2 (2nd Reward)
            </h3>
            {slot2Odds.map(([outcome, pct]) => (
              <div key={outcome} className="flex items-center justify-between py-1 text-sm">
                <span className="text-zinc-300">{formatOutcomeLabel(outcome, packType)}</span>
                <span className="font-mono text-zinc-100">{pct}%</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
