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
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden px-4">
      {/* Header — fixed within the layout, never scrolls */}
      <header className="shrink-0 pt-4 text-center">
        <h1 className="text-2xl font-bold tracking-wide text-zinc-50">NEVERMORE</h1>
      </header>

      {/* Currency row — fixed within the layout, never scrolls */}
      <div className="shrink-0 py-3">
        <InventoryBar gold={gold} diamonds={diamonds} seeds={totalSeeds} creatures={creatures} />
      </div>

      <AnimatePresence mode="wait">
        {pull ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto"
          >
            <RevealFlow pull={pull} onDismiss={() => setPull(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="tiles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {/* Carousel region — the ONLY scrollable area on this screen */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <PackCarousel active={activePack} onSwitch={setActivePack} />
            </div>

            {/* Purchase controls — fixed directly above bottom navigation */}
            <div className="flex shrink-0 flex-col items-center gap-2 pb-4 pt-2">
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

              {/* Reserve fixed height regardless of content so the block above never shifts. */}
              <p className={cn("text-center text-xs text-zinc-500", canAfford && "invisible")}>
                Not enough {config.currency} for {activePack === "Elite" ? "an" : "a"} {activePack} Origin Box.
              </p>

              <div className={cn("w-full", freePacks <= 0 && "invisible pointer-events-none")}>
                <button
                  onClick={openFreePack}
                  disabled={freePacks <= 0}
                  className="w-full rounded-full border border-yellow-400/60 bg-yellow-400/10 px-6 py-3 text-sm font-semibold text-yellow-200 transition active:scale-95"
                >
                  Open Free Origin Box ({freePacks})
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PackInfoModal open={infoOpen} packType={activePack} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
