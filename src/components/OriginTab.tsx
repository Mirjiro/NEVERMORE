"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { rollPull, rollOrigin, PACK_CONFIG } from "@/lib/odds";
import type { PackType, PullResult } from "@/lib/types";
import { cn } from "@/lib/cn";
import InventoryBar from "./InventoryBar";
import PackCarousel from "./PackCarousel";
import PackInfoModal from "./PackInfoModal";
import RevealFlow from "./RevealFlow";
import RevealDeck from "./RevealDeck";
import StoreModal from "./StoreModal";

export default function OriginTab({
  gold,
  diamonds,
  totalSeeds,
  creatures,
  onSpendGold,
  onSpendDiamonds,
  onAddGold,
  onAddDiamonds,
  onApplyPull,
}: {
  gold: number;
  diamonds: number;
  totalSeeds: number;
  creatures: number;
  onSpendGold: (amount: number) => void;
  onSpendDiamonds: (amount: number) => void;
  onAddGold: (amount: number) => void;
  onAddDiamonds: (amount: number) => void;
  onApplyPull: (pull: PullResult) => void;
}) {
  const [activePack, setActivePack] = useState<PackType>("Classic");
  const [pulls, setPulls] = useState<PullResult[] | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  const config = PACK_CONFIG[activePack];
  const balance = activePack === "Classic" ? gold : diamonds;
  const canAffordX1 = balance >= config.costX1;
  const canAffordX10 = balance >= config.costX10;

  const openActivePack = (count: 1 | 10) => {
    const cost = count === 1 ? config.costX1 : config.costX10;
    if (balance < cost) return;
    if (activePack === "Classic") onSpendGold(cost);
    else onSpendDiamonds(cost);
    // An x10 open is 10 pulls from a single Origin Pack — lock every card and
    // bonus in the batch to one shared Origin, same as a single x1 open does.
    const batchOrigin = rollOrigin();
    const results =
      count === 1 ? [rollPull(activePack)] : Array.from({ length: count }, () => rollPull(activePack, batchOrigin));
    results.forEach(onApplyPull);
    setPulls(results);
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden px-4">
      {/* Header — fixed within the layout, never scrolls */}
      <header className="shrink-0 pt-4 text-center">
        <h1>
          <img
            src="/assets/logo/nevermore-wordmark.png"
            alt="NEVERMORE"
            draggable={false}
            className="mx-auto h-auto select-none"
            style={{ width: "clamp(220px, 62vw, 300px)" }}
          />
        </h1>
      </header>

      {/* Currency row — fixed within the layout, never scrolls */}
      <div className="shrink-0 py-3">
        <InventoryBar gold={gold} diamonds={diamonds} seeds={totalSeeds} creatures={creatures} />
      </div>

      <AnimatePresence mode="wait">
        {pulls ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto"
          >
            {pulls.length === 1 ? (
              <RevealFlow pull={pulls[0]} onDismiss={() => setPulls(null)} />
            ) : (
              <RevealDeck pulls={pulls} onDismiss={() => setPulls(null)} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="tiles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
            style={{ top: "clamp(-28px, -2svh, -4px)" }}
          >
            {/* This region normally never needs to scroll — the box, buttons,
                and any optional content (insufficient-currency message, free
                Origin Box button) all fit within the available space. But on
                a short viewport with the free-box button present, the total
                content can exceed the space between the currency row and the
                dock; overflow-y-auto (rather than overflow-hidden) lets the
                user scroll those last few pixels into view instead of the
                free-box button silently ending up invisible behind the fixed
                dock. PackCarousel's own internal scroll-snap (for switching
                between Classic/Elite) still works independently within it. */}
            <PackCarousel active={activePack} onSwitch={setActivePack} />

            {/* Purchase controls — sit directly beneath the box */}
            <div
              className="relative z-20 flex shrink-0 flex-col items-center gap-3 pb-[6px] pt-2"
              style={{ transform: "translateY(-32px)" }}
            >
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => openActivePack(1)}
                  disabled={!canAffordX1}
                  className={cn(
                    "flex min-w-[112px] flex-col items-center rounded-full px-5 py-3 leading-tight transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                    "bg-gradient-to-b from-zinc-100 to-zinc-300 shadow-lg shadow-black/40",
                  )}
                >
                  <span className="text-base font-bold text-ink-dark">Open X1</span>
                  <span className="text-xs font-medium text-ink-dark">
                    {config.costX1.toLocaleString()} {config.currency}
                  </span>
                </button>
                <button
                  onClick={() => openActivePack(10)}
                  disabled={!canAffordX10}
                  className={cn(
                    "flex min-w-[112px] flex-col items-center rounded-full px-5 py-3 leading-tight transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                    "bg-gradient-to-b from-zinc-100 to-zinc-300 shadow-lg shadow-black/40",
                  )}
                >
                  <span className="text-base font-bold text-ink-dark">Open X10</span>
                  <span className="text-xs font-medium text-ink-dark">
                    {config.costX10.toLocaleString()} {config.currency}
                  </span>
                </button>
                <button
                  onClick={() => setInfoOpen(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-600 font-serif text-base italic text-ink-muted"
                  aria-label={`${activePack} Origin Box rate info`}
                >
                  i
                </button>
              </div>

              {!canAffordX1 && (
                <div className="flex items-center justify-center gap-2">
                  <p className="text-center text-xs text-ink-faint">
                    Not enough {config.currency} for {activePack === "Elite" ? "an" : "a"} {activePack} Origin Box.
                  </p>
                  <button
                    onClick={() => setStoreOpen(true)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-500 text-xs font-bold leading-none text-ink-muted"
                    aria-label="Buy Gold or Diamonds"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Absorbs remaining vertical space below the buttons instead of
                letting the carousel region stretch and push them down. */}
            <div className="min-h-0 flex-1" />
          </motion.div>
        )}
      </AnimatePresence>

      <PackInfoModal open={infoOpen} packType={activePack} onClose={() => setInfoOpen(false)} />
      <StoreModal
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        gold={gold}
        diamonds={diamonds}
        onSpendGold={onSpendGold}
        onSpendDiamonds={onSpendDiamonds}
        onAddGold={onAddGold}
        onAddDiamonds={onAddDiamonds}
      />
    </div>
  );
}
