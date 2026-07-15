"use client";

import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";
import PackFront from "./PackFront";

const ORDER: PackType[] = ["Classic", "Elite"];
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
  const peekIsAbove = ORDER.indexOf(other) < ORDER.indexOf(active);

  const peek = (
    <motion.div
      key={other}
      className="pointer-events-none"
      initial={false}
      animate={{ opacity: 0.3, scale: 0.95, filter: "blur(4px) saturate(0.5)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <PackFront packType={other} size="peek" />
    </motion.div>
  );

  const focused = (
    <motion.div
      key={active}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.y) > SWIPE_THRESHOLD) onSwitch(other);
      }}
      initial={{ opacity: 0.6, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="z-10 cursor-grab rounded-xl shadow-[0_0_32px_-4px_rgba(217,150,60,0.45)] active:cursor-grabbing"
    >
      <PackFront packType={active} size="focused" />
    </motion.div>
  );

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex flex-col items-center gap-4">
        {peekIsAbove && peek}
        {focused}
        {!peekIsAbove && peek}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {ORDER.map((pack) => (
          <button
            key={pack}
            type="button"
            onClick={() => onSwitch(pack)}
            aria-label={`Show ${pack} Origin Box`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              pack === active ? "w-5 bg-zinc-200" : "w-1.5 bg-zinc-700",
            )}
          />
        ))}
      </div>
    </div>
  );
}
