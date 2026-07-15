"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { rollPull, PACK_CONFIG } from "@/lib/odds";
import type { PullResult } from "@/lib/types";
import InventoryBar from "./InventoryBar";
import PackFront from "./PackFront";
import InfoModal from "./InfoModal";
import RevealFlow from "./RevealFlow";

export default function OriginTab({
  gold,
  diamonds,
  totalSeeds,
  creatures,
  freePacks,
  onSpendGold,
  onSpendFreePack,
  onApplyPull,
}: {
  gold: number;
  diamonds: number;
  totalSeeds: number;
  creatures: number;
  freePacks: number;
  onSpendGold: (amount: number) => void;
  onSpendFreePack: () => void;
  onApplyPull: (pull: PullResult) => void;
}) {
  const [pull, setPull] = useState<PullResult | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const canAffordClassic = gold >= PACK_CONFIG.Classic.cost;

  const openClassic = () => {
    if (!canAffordClassic) return;
    onSpendGold(PACK_CONFIG.Classic.cost);
    const result = rollPull("Classic");
    onApplyPull(result);
    setPull(result);
  };

  const openFreePack = () => {
    if (freePacks <= 0) return;
    onSpendFreePack();
    const result = rollPull("Classic");
    onApplyPull(result);
    setPull(result);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-6 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-wide text-zinc-50">NEVERMORE</h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Origin</p>
      </header>

      <InventoryBar gold={gold} diamonds={diamonds} seeds={totalSeeds} creatures={creatures} />

      <AnimatePresence mode="wait">
        {pull ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center"
          >
            <RevealFlow pull={pull} onDismiss={() => setPull(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="tiles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-4"
          >
            <div className="flex w-full items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Origin Packs</h2>
              <button
                onClick={() => setInfoOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-600 font-serif text-sm italic text-zinc-300"
                aria-label="Pack rate info"
              >
                i
              </button>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <PackFront
                packType="Classic"
                priceLabel={`${PACK_CONFIG.Classic.cost.toLocaleString()} Gold`}
                onTap={canAffordClassic ? openClassic : undefined}
                disabled={!canAffordClassic}
              />
              <PackFront
                packType="Elite"
                priceLabel={`${PACK_CONFIG.Elite.cost} Diamonds`}
                disabled
                disabledLabel="Coming Soon"
              />
            </div>

            {freePacks > 0 && (
              <button
                onClick={openFreePack}
                className="w-full rounded-full border border-yellow-400/60 bg-yellow-400/10 px-6 py-3 text-sm font-semibold text-yellow-200 transition active:scale-95"
              >
                Open Free Pack ({freePacks})
              </button>
            )}

            {!canAffordClassic && freePacks === 0 && (
              <p className="text-center text-xs text-zinc-500">
                Not enough Gold for a Classic Origin Pack.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
