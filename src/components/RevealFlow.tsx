"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { PullResult } from "@/lib/types";
import { RARITY_STYLES } from "@/lib/rarityStyles";
import { playRaritySound } from "@/lib/sound";
import OriginRevealCard from "./OriginRevealCard";
import CardFace from "./CardFace";
import Slot2Card from "./Slot2Card";
import ScreenFlash, { FlashSignal } from "./ScreenFlash";

type Stage = "origin" | "card" | "slot2";

const SWIPE_THRESHOLD = 90;

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
          <p className="text-xs text-zinc-500">← Swipe to see your 2nd reward</p>
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
              if (info.offset.x > SWIPE_THRESHOLD) onDismiss();
            }}
          >
            <Slot2Card slot2={pull.slot2} />
          </motion.div>
          <p className="text-xs text-zinc-500">Swipe to collect →</p>
        </>
      )}
    </div>
  );
}
