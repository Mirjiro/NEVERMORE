"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PullResult } from "@/lib/types";
import { RARITY_STYLES, RARITY_ORDER } from "@/lib/rarityStyles";
import { getSlot2Content, getBonusToastText } from "@/lib/slot2Content";
import { playRaritySound } from "@/lib/sound";
import { cn } from "@/lib/cn";
import CardFace from "./CardFace";
import Slot2Card from "./Slot2Card";
import ScreenFlash, { FlashSignal } from "./ScreenFlash";

type DeckItem = { kind: "card" | "bonus"; pull: PullResult };
type Toast = { key: number; text: string; leftPercent: number };

const SWIPE_THRESHOLD = 70;
const ADVANCE_LOCK_MS = 250;
const TOAST_DURATION_S = 1.6;

/**
 * Sequential one-at-a-time reveal for a batch of pulls (x10 opens): the 10
 * guaranteed cards first — lowest rarity to highest — then the 10 bonuses.
 * Unlike the single-pull RevealFlow this is forward-only — a revealed item is
 * discarded on advance, not something you can swipe back to.
 */
export default function RevealDeck({ pulls, onDismiss }: { pulls: PullResult[]; onDismiss: () => void }) {
  const guaranteedCount = pulls.length;
  const sortedPulls = [...pulls].sort(
    (a, b) => RARITY_ORDER.indexOf(a.slot1.rarity) - RARITY_ORDER.indexOf(b.slot1.rarity),
  );
  const items: DeckItem[] = [
    ...sortedPulls.map((pull) => ({ kind: "card" as const, pull })),
    ...sortedPulls.map((pull) => ({ kind: "bonus" as const, pull })),
  ];
  const total = items.length;

  const [current, setCurrent] = useState(0);
  const [flashSignal, setFlashSignal] = useState<FlashSignal | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const locked = useRef(false);

  const handleCardRevealed = (rarity: PullResult["rarity"]) => {
    playRaritySound(rarity);
    const style = RARITY_STYLES[rarity];
    if (style.screenFlash) {
      setFlashSignal({ key: Date.now(), type: style.screenFlash });
    }
  };

  function advance() {
    if (locked.current) return;
    locked.current = true;

    const next = Math.min(current + 1, total);
    // Fire the pickup toast the moment a bonus is revealed, not on the swipe
    // that dismisses it — that way the very last bonus's toast still gets to
    // play out on the deck stage instead of being cut off by the summary.
    if (next < total && next >= guaranteedCount) {
      const upcoming = items[next];
      setToast({ key: next, text: getBonusToastText(upcoming.pull.slot2), leftPercent: 20 + Math.random() * 60 });
    }
    setCurrent(next);

    setTimeout(() => {
      locked.current = false;
    }, ADVANCE_LOCK_MS);
  }

  if (current >= total) {
    return <DeckSummary pulls={pulls} onDismiss={onDismiss} />;
  }

  const item = items[current];
  const bonus = item.pull.slot2;
  const isBonusRound = current >= guaranteedCount;

  function revealCurrentCard() {
    if (item.kind === "card") {
      handleCardRevealed(item.pull.slot1.rarity);
    } else if (bonus.type === "Card") {
      handleCardRevealed(bonus.rarity);
    }
  }

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-4 py-4">
      <ScreenFlash signal={flashSignal} />

      <div
        className="absolute inset-0 z-0 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label="Reveal next"
        onClick={advance}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            advance();
          }
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3" onClick={advance}>
        {isBonusRound && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold uppercase tracking-[0.35em] text-yellow-300 [text-shadow:0_0_12px_rgba(250,204,21,0.85)]"
          >
            Bonus
          </motion.p>
        )}

        {/* Decorative deck stack behind the current item */}
        <div className="relative">
          <div className="pointer-events-none absolute left-2 top-2 h-80 w-56 rounded-xl border-2 border-zinc-800 bg-zinc-900/40 sm:h-96 sm:w-64" />
          <div className="pointer-events-none absolute left-1 top-1 h-80 w-56 rounded-xl border-2 border-zinc-800 bg-zinc-900/55 sm:h-96 sm:w-64" />

          <motion.div
            key={current}
            className="relative z-10"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) advance();
            }}
          >
            {item.kind === "card" ? (
              <CardFace
                origin={item.pull.slot1.origin}
                rarity={item.pull.slot1.rarity}
                name={item.pull.slot1.name}
                onFlipComplete={revealCurrentCard}
              />
            ) : bonus.type === "Card" ? (
              <CardFace origin={bonus.origin} rarity={bonus.rarity} name={bonus.name} onFlipComplete={revealCurrentCard} />
            ) : (
              <Slot2Card slot2={bonus} />
            )}
          </motion.div>
        </div>

        {/* Bonus pickup confirmation — random horizontal spot, slow fade, never replays. */}
        <div className="relative h-6 w-56 sm:w-64">
          <AnimatePresence>
            {toast && (
              <motion.span
                key={toast.key}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 1, 0], y: -18 }}
                transition={{ duration: TOAST_DURATION_S, times: [0, 0.15, 0.75, 1], ease: "easeOut" }}
                onAnimationComplete={() => setToast(null)}
                className="absolute top-0 whitespace-nowrap text-sm font-bold text-yellow-300 [text-shadow:0_0_8px_rgba(250,204,21,0.7)]"
                style={{ left: `${toast.leftPercent}%`, transform: "translateX(-50%)" }}
              >
                {toast.text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <span className="text-xs uppercase tracking-widest text-zinc-500">
          {current + 1} / {total}
        </span>
        <p className="text-[11px] text-zinc-600">Tap or swipe to reveal next</p>
      </div>
    </div>
  );
}

function DeckSummary({ pulls, onDismiss }: { pulls: PullResult[]; onDismiss: () => void }) {
  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-3 py-4">
      {/* Full-stage tap target, matching the deck stage — not just the panel itself. */}
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label="Collect and continue"
        onClick={onDismiss}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDismiss();
          }
        }}
      />

      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onDismiss}
        className="relative z-10 flex max-h-[70vh] w-full max-w-xs flex-col items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-5 text-center"
      >
        <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Collected · {pulls.length}x Open
        </p>

        <div className="w-full flex-1 overflow-y-auto text-left">
          {pulls.map((pull, i) => {
            const slot1Style = RARITY_STYLES[pull.slot1.rarity];
            const slot2Content = getSlot2Content(pull.slot2);
            return (
              <div key={i} className={cn("py-2", i > 0 && "border-t border-zinc-800")}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm font-semibold", slot1Style.accent)}>{pull.slot1.name}</span>
                  <span className="shrink-0 text-[11px] text-zinc-500">
                    {pull.origin} · {slot1Style.label}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className={cn("truncate text-xs font-medium", slot2Content.accent)}>{slot2Content.title}</span>
                  <span className="shrink-0 text-[11px] text-zinc-500">{slot2Content.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="shrink-0 text-[11px] text-zinc-600">Tap anywhere to continue</p>
      </motion.button>
    </div>
  );
}
