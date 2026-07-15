"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { rollPull, PACK_CONFIG } from "@/lib/odds";
import type { PackType, PullResult } from "@/lib/types";
import { cn } from "@/lib/cn";
import InventoryBar from "./InventoryBar";
import PackCarousel from "./PackCarousel";
import PackInfoModal from "./PackInfoModal";
import RevealFlow from "./RevealFlow";

export default function OriginTab({
  gold,
  diamonds,
  totalSeeds,
  creatures,
  freePacks,
  onSpendGold,
  onSpendDiamonds,
  onSpendFreePack,
  onApplyPull,
}: {
  gold: number;
  diamonds: number;
  totalSeeds: number;
  creatures: number;
  freePacks: number;
  onSpendGold: (amount: number) => void;
  onSpendDiamonds: (amount: number) => void;
  onSpendFreePack: () => void;
  onApplyPull: (pull: PullResult) => void;
}) {
  const [activePack, setActivePack] = useState<PackType>("Classic");
  const [pull, setPull] = useState<PullResult | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const config = PACK_CONFIG[activePack];
  const balance = activePack === "Classic" ? gold : diamonds;
  const canAfford = balance >= config.cost;

  const openActivePack = () => {
    if (!canAfford) return;
    if (activePack === "Classic") onSpendGold(config.cost);
    else onSpendDiamonds(config.cost);
    const result = rollPull(activePack);
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-5 px-4 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-wide text-zinc-50">NEVERMORE</h1>
      </header>

      <InventoryBar gold={gold} diamonds={diamonds} seeds={totalSeeds} creatures={creatures} />

      <AnimatePresence mode="wait">
        {pull ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-1 flex-col items-center"
          >
            <RevealFlow pull={pull} onDismiss={() => setPull(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="tiles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-1 flex-col items-center justify-center gap-3"
          >
            <PackCarousel active={activePack} onSwitch={setActivePack} />

            <div className="flex items-center gap-3">
              <button
                onClick={openActivePack}
                disabled={!canAfford}
                className={cn(
                  "rounded-full px-6 py-3 text-sm font-bold text-zinc-950 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                  "bg-gradient-to-b from-zinc-100 to-zinc-300 shadow-lg shadow-black/40",
                )}
              >
                {config.cost.toLocaleString()} {config.currency}
              </button>
              <button
                onClick={() => setInfoOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 font-serif text-sm italic text-zinc-300"
                aria-label={`${activePack} Origin Box rate info`}
              >
                i
              </button>
            </div>

            {!canAfford && (
              <p className="text-center text-xs text-zinc-500">
                Not enough {config.currency} for {activePack === "Elite" ? "an" : "a"} {activePack} Origin Box.
              </p>
            )}

            {freePacks > 0 && (
              <button
                onClick={openFreePack}
                className="w-full rounded-full border border-yellow-400/60 bg-yellow-400/10 px-6 py-3 text-sm font-semibold text-yellow-200 transition active:scale-95"
              >
                Open Free Origin Box ({freePacks})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <PackInfoModal open={infoOpen} packType={activePack} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
