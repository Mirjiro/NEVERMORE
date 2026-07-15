"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { ORIGIN_ODDS, PACK_CONFIG, BOX_DESCRIPTIONS } from "@/lib/odds";

export default function PackInfoModal({
  open,
  packType,
  onClose,
}: {
  open: boolean;
  packType: PackType;
  onClose: () => void;
}) {
  const config = PACK_CONFIG[packType];
  const originOdds = Object.entries(ORIGIN_ODDS);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-zinc-800 bg-zinc-950 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 pb-3 pt-5">
              <div>
                <h2 className="text-base font-bold text-zinc-50">
                  {config.label} Origin Box — {config.cost.toLocaleString()} {config.currency}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">{BOX_DESCRIPTIONS[packType]}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-400"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Origin Odds</h3>
              {originOdds.map(([origin, pct], i) => (
                <div
                  key={origin}
                  className={`flex items-center justify-between py-1.5 text-sm ${i > 0 ? "border-t border-zinc-900" : ""}`}
                >
                  <span className="text-zinc-300">{origin} Pack</span>
                  <span className="font-mono text-zinc-100">{pct}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
