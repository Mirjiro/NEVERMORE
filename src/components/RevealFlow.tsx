"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { CreatureRarity, PullResult } from "@/lib/types";
import { RARITY_STYLES } from "@/lib/rarityStyles";
import { getSlot2Content } from "@/lib/slot2Content";
import { playRaritySound } from "@/lib/sound";
import { CLASSIC_ORIGIN_BOX_ASSETS } from "@/lib/originBoxAssets";
import { cn } from "@/lib/cn";
import OriginRevealCard from "./OriginRevealCard";
import ClassicOriginBoxOpening from "./ClassicOriginBoxOpening";
import CardFace from "./CardFace";
import Slot2Card from "./Slot2Card";
import CreatureCard from "./CreatureCard";
import ScreenFlash, { FlashSignal } from "./ScreenFlash";

type Stage = "origin" | "rewards";

const SWIPE_THRESHOLD = 70;
const REWARD_COUNT = 2; // Card, Bonus
const SUMMARY_POSITION = REWARD_COUNT; // 2
const ADVANCE_LOCK_MS = 250;

export default function RevealFlow({ pull, onDismiss }: { pull: PullResult; onDismiss: () => void }) {
  const [stage, setStage] = useState<Stage>("origin");
  const [position, setPosition] = useState(0);
  const [flashSignal, setFlashSignal] = useState<FlashSignal | null>(null);
  const locked = useRef(false);

  const goTo = useCallback((next: number) => {
    if (locked.current) return;
    if (next < 0 || next > SUMMARY_POSITION) return;
    locked.current = true;
    setPosition(next);
    setTimeout(() => {
      locked.current = false;
    }, ADVANCE_LOCK_MS);
  }, []);

  const advance = useCallback(() => {
    if (locked.current) return;
    if (position >= SUMMARY_POSITION) {
      locked.current = true;
      onDismiss();
      return;
    }
    goTo(position + 1);
  }, [position, goTo, onDismiss]);

  const goBack = useCallback(() => {
    if (position <= 0) return;
    goTo(position - 1);
  }, [position, goTo]);

  const handleCardRevealed = () => {
    playRaritySound(pull.slot1.rarity);
    const style = RARITY_STYLES[pull.slot1.rarity];
    if (style.screenFlash) {
      setFlashSignal({ key: Date.now(), type: style.screenFlash });
    }
  };

  const handleCreatureRevealed = (rarity: CreatureRarity) => {
    playRaritySound(rarity);
    setFlashSignal({ key: Date.now(), type: "pink" });
  };

  if (stage === "origin") {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-3 py-4">
        {pull.packType === "Classic" ? (
          <ClassicOriginBoxOpening
            lidSrc={CLASSIC_ORIGIN_BOX_ASSETS.lidSrc}
            baseSrc={CLASSIC_ORIGIN_BOX_ASSETS.baseSrc}
            onOpened={() => setStage("rewards")}
          />
        ) : (
          <OriginRevealCard packType={pull.packType} origin={pull.origin} onTapToReveal={() => setStage("rewards")} />
        )}
      </div>
    );
  }

  const slot1Style = RARITY_STYLES[pull.slot1.rarity];
  const slot2Content = getSlot2Content(pull.slot2);

  function handleBonusCreatureRevealed() {
    if (pull.slot2.type === "Creature") handleCreatureRevealed(pull.slot2.rarity);
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-4 py-4">
      <ScreenFlash signal={flashSignal} />

      {/* Full reveal-stage background: tapping anywhere here advances/collects */}
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={position < SUMMARY_POSITION ? "Continue to next reward" : "Collect and continue"}
        onClick={advance}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            advance();
          }
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3" onClick={advance}>
        {position === 0 && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) advance();
              else if (info.offset.x > SWIPE_THRESHOLD) goBack();
            }}
          >
            <CardFace
              origin={pull.slot1.origin}
              rarity={pull.slot1.rarity}
              name={pull.slot1.name}
              reverse
              onFlipComplete={handleCardRevealed}
            />
          </motion.div>
        )}

        {position === 1 && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) advance();
              else if (info.offset.x > SWIPE_THRESHOLD) goBack();
            }}
          >
            {pull.slot2.type === "Card" ? (
              <CardFace origin={pull.slot2.origin} rarity={pull.slot2.rarity} name={pull.slot2.name} />
            ) : pull.slot2.type === "Creature" ? (
              <CreatureCard creature={pull.slot2} onFlipComplete={handleBonusCreatureRevealed} />
            ) : (
              <Slot2Card slot2={pull.slot2} />
            )}
          </motion.div>
        )}

        {position === SUMMARY_POSITION && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE_THRESHOLD) goBack();
            }}
            className="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-6 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Collected</p>

            <div className="flex w-full items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <span className={cn("text-sm font-semibold", slot1Style.accent)}>{pull.slot1.name}</span>
              <span className="text-xs text-zinc-500">
                {pull.origin} · {slot1Style.label}
              </span>
            </div>

            <div className="flex w-full items-center justify-between gap-3">
              <span className={cn("text-sm font-semibold", slot2Content.accent)}>{slot2Content.title}</span>
              <span className="text-xs text-zinc-500">{slot2Content.subtitle}</span>
            </div>
          </motion.div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              goBack();
            }}
            disabled={position === 0}
            className="px-2 text-lg text-zinc-500 disabled:opacity-20"
            aria-label="Previous reward"
          >
            ‹
          </button>
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            {position < SUMMARY_POSITION ? `${position + 1} / ${REWARD_COUNT}` : "Collected"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              advance();
            }}
            className="px-2 text-lg text-zinc-500"
            aria-label={position < SUMMARY_POSITION ? "Next reward" : "Continue"}
          >
            ›
          </button>
        </div>

        <p className="text-[11px] text-zinc-600">Tap or swipe to continue</p>
      </div>
    </div>
  );
}
