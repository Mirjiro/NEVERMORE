"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Origin, PackType, Rarity } from "@/lib/types";
import { getRarityOdds, getSlot2Odds } from "@/lib/odds";
import { formatBonusLabel } from "@/lib/bonusLabels";
import { CARD_POOL } from "@/lib/cardPool";
import { ORIGIN_THEME } from "@/lib/originTheme";
import { cn } from "@/lib/cn";

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
  const theme = ORIGIN_THEME[origin];
  const rarityOdds = Object.entries(getRarityOdds(packType)).filter(([, pct]) => pct > 0);
  const bonusOdds = Object.entries(getSlot2Odds(packType));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
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
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-5 pb-3 pt-5">
              <div>
                <h2 className={cn("text-base font-bold", theme.accent)}>{origin} Pack</h2>
                <p className="mt-1 text-xs text-ink-faint">{packType} Origin Box</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-ink-muted"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Guaranteed Card
              </h3>
              {rarityOdds.map(([rarity, pct], i) => {
                const [nameA, nameB] = CARD_POOL[origin][rarity as Rarity];
                return (
                  <div key={rarity} className={cn("py-2", i > 0 && "border-t border-zinc-900")}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink">{rarity}</span>
                      <span className="font-mono text-ink">{pct}%</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {nameA} · {nameB}
                    </p>
                  </div>
                );
              })}

              <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-ink-faint">Bonus</h3>
              {bonusOdds.map(([outcome, pct], i) => (
                <div
                  key={outcome}
                  className={cn(
                    "flex items-center justify-between py-1.5 text-sm",
                    i > 0 && "border-t border-zinc-900",
                  )}
                >
                  <span className="text-ink-muted">{formatBonusLabel(outcome, packType)}</span>
                  <span className="font-mono text-ink">{pct}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
