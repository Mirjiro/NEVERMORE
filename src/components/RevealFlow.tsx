"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { PullResult } from "@/lib/types";
import { RARITY_STYLES } from "@/lib/rarityStyles";
import { getSlot2Content } from "@/lib/slot2Content";
import { playRaritySound } from "@/lib/sound";
import { cn } from "@/lib/cn";
import OriginRevealCard from "./OriginRevealCard";
import CardFace from "./CardFace";
import Slot2Card from "./Slot2Card";
import ScreenFlash, { FlashSignal } from "./ScreenFlash";

type Stage = "origin" | "card" | "slot2" | "summary";

const SWIPE_THRESHOLD = 90;
const SUMMARY_AUTO_DISMISS_MS = 3000;

export default function RevealFlow({ pull, onDismiss }: { pull: PullResult; onDismiss: () => void }) {
  const [stage, setStage] = useState<Stage>("origin");
  const [flashSignal, setFlashSignal] = useState<FlashSignal | null>(null);

  const handleCardRevealed = () => {
    playRaritySound(pull.slot1.rarity);
    const style = RARITY_STYLES[pull.slot1.rarity];
    if (style.screenFlash) {
      setFlashSignal({ key: Date.now(), type: style.screenFlash });
    }
  };

  useEffect(() => {
    if (stage !== "summary") return;
    const timer = setTimeout(onDismiss, SUMMARY_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [stage, onDismiss]);

  const slot1Style = RARITY_STYLES[pull.slot1.rarity];
  const slot2Content = getSlot2Content(pull.slot2);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 py-4">
      <ScreenFlash signal={flashSignal} />

      {stage === "origin" && (
        <OriginRevealCard packType={pull.packType} origin={pull.origin} onTapToReveal={() => setStage("card")} />
      )}

      {stage === "card" && (
        <>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) setStage("slot2");
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
          <p className="text-xs uppercase tracking-widest text-zinc-500">Swipe</p>
        </>
      )}

      {stage === "slot2" && (
        <>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE_THRESHOLD) setStage("summary");
            }}
          >
            <Slot2Card slot2={pull.slot2} />
          </motion.div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Swipe</p>
        </>
      )}

      {stage === "summary" && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onDismiss}
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

          <p className="text-[11px] text-zinc-600">Tap anywhere to continue</p>
        </motion.button>
      )}
    </div>
  );
}
