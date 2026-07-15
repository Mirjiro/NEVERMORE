"use client";

import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import PackFront from "./PackFront";

const OTHER: Record<PackType, PackType> = { Classic: "Elite", Elite: "Classic" };
const SWIPE_THRESHOLD = 60;

export default function PackCarousel({
  active,
  onSwitch,
}: {
  active: PackType;
  onSwitch: (pack: PackType) => void;
}) {
  const other = OTHER[active];

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        key={active}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.5}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.y) > SWIPE_THRESHOLD) onSwitch(other);
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <PackFront packType={active} size="focused" />
      </motion.div>

      <button type="button" onClick={() => onSwitch(other)} aria-label={`Switch to ${other} Origin Pack`}>
        <PackFront packType={other} size="peek" dimmed />
      </button>
    </div>
  );
}
