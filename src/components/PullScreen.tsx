"use client";

import { useCallback, useState } from "react";
import { rollPull } from "@/lib/odds";
import type { PullResult, Rarity } from "@/lib/types";
import { RARITY_STYLES } from "@/lib/rarityStyles";
import { playRaritySound } from "@/lib/sound";
import { cn } from "@/lib/cn";
import CardFace from "./CardFace";
import Slot2Display from "./Slot2Display";
import InventoryBar from "./InventoryBar";
import ScreenFlash, { FlashSignal } from "./ScreenFlash";

const STARTING_GOLD = 100_000;
const PACK_COST = 5_000;

export default function PullScreen() {
  const [gold, setGold] = useState(STARTING_GOLD);
  const [diamonds, setDiamonds] = useState(0);
  const [seeds, setSeeds] = useState(0);
  const [creatures, setCreatures] = useState(0);
  const [freePacks, setFreePacks] = useState(0);

  const [result, setResult] = useState<PullResult | null>(null);
  const [pullId, setPullId] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flashSignal, setFlashSignal] = useState<FlashSignal | null>(null);

  const applySlot2 = useCallback((pull: PullResult) => {
    const slot2 = pull.slot2;
    switch (slot2.type) {
      case "Gold":
        setGold((g) => g + slot2.amount);
        break;
      case "Diamonds":
        setDiamonds((d) => d + slot2.amount);
        break;
      case "Seed":
        setSeeds((s) => s + 1);
        break;
      case "Creature":
        setCreatures((c) => c + 1);
        break;
      case "OriginCardPack":
        setFreePacks((f) => f + 1);
        break;
      case "Card":
        break;
    }
  }, []);

  const openPack = useCallback(
    (free: boolean) => {
      if (isAnimating) return;
      if (free) {
        if (freePacks <= 0) return;
        setFreePacks((f) => f - 1);
      } else {
        if (gold < PACK_COST) return;
        setGold((g) => g - PACK_COST);
      }
      const pull = rollPull();
      applySlot2(pull);
      setResult(pull);
      setPullId((id) => id + 1);
      setIsAnimating(true);
    },
    [gold, freePacks, isAnimating, applySlot2],
  );

  const handleRevealed = useCallback((rarity: Rarity) => {
    setIsAnimating(false);
    playRaritySound(rarity);
    const style = RARITY_STYLES[rarity];
    if (style.screenFlash) {
      setFlashSignal({ key: Date.now(), type: style.screenFlash });
    }
  }, []);

  const canPay = gold >= PACK_COST;
  const outOfOptions = !canPay && freePacks <= 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-6 px-4 py-8">
      <ScreenFlash signal={flashSignal} />

      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-wide text-zinc-50">NEVERMORE</h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">
          Classic Pack · Prototype
        </p>
      </header>

      <InventoryBar gold={gold} diamonds={diamonds} seeds={seeds} creatures={creatures} />

      <div className="flex min-h-[24rem] w-full flex-col items-center justify-center">
        {result ? (
          <>
            <CardFace
              key={pullId}
              origin={result.slot1.origin}
              rarity={result.slot1.rarity}
              name={result.slot1.name}
              onFlipComplete={() => handleRevealed(result.slot1.rarity)}
            />
            <Slot2Display slot2={result.slot2} pullId={pullId} />
          </>
        ) : (
          <div className="flex h-80 w-56 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 text-center text-sm text-zinc-500 sm:h-96 sm:w-64">
            Open a pack to begin
          </div>
        )}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {freePacks > 0 && (
          <button
            onClick={() => openPack(true)}
            disabled={isAnimating}
            className="w-full rounded-full border border-yellow-400/60 bg-yellow-400/10 px-6 py-3 text-sm font-semibold text-yellow-200 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Open Free Pack ({freePacks})
          </button>
        )}

        <button
          onClick={() => openPack(false)}
          disabled={!canPay || isAnimating}
          className={cn(
            "w-full rounded-full px-6 py-4 text-base font-bold text-zinc-950 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
            "bg-gradient-to-b from-zinc-100 to-zinc-300 shadow-lg shadow-black/40",
          )}
        >
          {result ? "Pull Again" : "Open Classic Pack"} — {PACK_COST.toLocaleString()} Gold
        </button>

        {outOfOptions && (
          <p className="text-center text-xs text-zinc-500">
            Out of Gold. Session over — refresh to start again.
          </p>
        )}
      </div>
    </div>
  );
}
