"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { rollPull, rollOrigin, PACK_CONFIG } from "@/lib/odds";
import type { PackType, PullResult } from "@/lib/types";
import { cn } from "@/lib/cn";
import InventoryBar from "./InventoryBar";
import OriginBackground from "./OriginBackground";
import PackCarousel from "./PackCarousel";
import PackInfoModal from "./PackInfoModal";
import RevealFlow from "./RevealFlow";
import RevealDeck from "./RevealDeck";
import StoreModal from "./StoreModal";

const PURCHASE_BUTTON_ASSETS: Record<
  PackType,
  { x1Src: string; x1Ratio: string; x10Src: string; x10Ratio: string; infoSrc: string; infoRatio: string }
> = {
  Classic: {
    x1Src: "/assets/buttons/classic-open-x1.webp",
    x1Ratio: "340 / 191",
    x10Src: "/assets/buttons/classic-open-x10.webp",
    x10Ratio: "340 / 195",
    infoSrc: "/assets/buttons/info-icon.webp",
    infoRatio: "130 / 148",
  },
  Elite: {
    x1Src: "/assets/buttons/elite-open-x1.webp",
    x1Ratio: "340 / 186",
    x10Src: "/assets/buttons/elite-open-x10.webp",
    x10Ratio: "340 / 192",
    infoSrc: "/assets/buttons/elite-info-icon.webp",
    infoRatio: "130 / 157",
  },
};

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

  // Both packs' afford states are computed regardless of which is active —
  // the button rows below stay permanently mounted (see comment there), so
  // both need their own disabled state at all times, not just the active one.
  const canAffordClassicX1 = gold >= PACK_CONFIG.Classic.costX1;
  const canAffordClassicX10 = gold >= PACK_CONFIG.Classic.costX10;
  const canAffordEliteX1 = diamonds >= PACK_CONFIG.Elite.costX1;
  const canAffordEliteX10 = diamonds >= PACK_CONFIG.Elite.costX10;

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
    <div className="relative isolate mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden px-4">
      <OriginBackground active={activePack} />

      {/* Header — fixed within the layout, never scrolls */}
      <header className="relative shrink-0 pt-4 text-center">
        <img
          src="/assets/header/logo-glow.webp"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none object-cover"
          style={{
            left: -16,
            right: -16,
            top: -24,
            height: "calc(100% + 24px)",
            width: "calc(100% + 32px)",
            // Tailwind's Preflight sets `img { max-width: 100% }` globally,
            // which silently clamps the explicit width above back down to
            // exactly the header's own width — discarding the overscan meant
            // to keep this image's hard edges from landing at a visible
            // boundary against the background.
            maxWidth: "none",
            objectPosition: "bottom",
          }}
        />
        <h1 className="relative">
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
              {/* Both packs' button rows stay permanently mounted (crossfaded via
                  opacity, never conditionally rendered) so their image assets are
                  fetched and decoded well before the user ever switches to them —
                  otherwise the first switch to a pack shows its old <img> src still
                  on screen for as long as the new one takes to load over the network. */}
              <div className="relative flex items-center justify-center" style={{ height: 64 }}>
                {(["Classic", "Elite"] as const).map((pack) => {
                  const assets = PURCHASE_BUTTON_ASSETS[pack];
                  const rowConfig = PACK_CONFIG[pack];
                  const rowCanAffordX1 = pack === "Classic" ? canAffordClassicX1 : canAffordEliteX1;
                  const rowCanAffordX10 = pack === "Classic" ? canAffordClassicX10 : canAffordEliteX10;
                  const isRowActive = activePack === pack;
                  return (
                    <div
                      key={pack}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center gap-4 transition-opacity duration-150",
                        isRowActive ? "opacity-100" : "pointer-events-none opacity-0",
                      )}
                    >
                      <button
                        onClick={() => openActivePack(1)}
                        disabled={!rowCanAffordX1}
                        aria-label={`Open X1 — ${rowConfig.costX1.toLocaleString()} ${rowConfig.currency}`}
                        className="shrink-0 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <img
                          src={assets.x1Src}
                          alt=""
                          draggable={false}
                          className="pointer-events-none select-none"
                          style={{ height: 64, aspectRatio: assets.x1Ratio }}
                        />
                      </button>
                      <button
                        onClick={() => openActivePack(10)}
                        disabled={!rowCanAffordX10}
                        aria-label={`Open X10 — ${rowConfig.costX10.toLocaleString()} ${rowConfig.currency}`}
                        className="shrink-0 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <img
                          src={assets.x10Src}
                          alt=""
                          draggable={false}
                          className="pointer-events-none select-none"
                          style={{ height: 64, aspectRatio: assets.x10Ratio }}
                        />
                      </button>
                      <button
                        onClick={() => setInfoOpen(true)}
                        aria-label={`${pack} Origin Box rate info`}
                        className="shrink-0 transition active:scale-95"
                      >
                        <img
                          src={assets.infoSrc}
                          alt=""
                          draggable={false}
                          className="pointer-events-none select-none"
                          style={{ height: 44, aspectRatio: assets.infoRatio }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {!canAffordX1 && (
                <div className="absolute left-0 right-0 top-full mt-2 flex items-center justify-center gap-2">
                  <p className="whitespace-nowrap text-center text-xs text-ink-faint">
                    Not enough {config.currency} for {activePack === "Elite" ? "an" : "a"} {activePack} Origin Box.
                  </p>

                  <button
                    type="button"
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
