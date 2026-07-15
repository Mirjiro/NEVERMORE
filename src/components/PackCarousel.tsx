"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";
import PackFront from "./PackFront";

const ORDER: PackType[] = ["Classic", "Elite"];
const GAP = 24;
const PEEK = 110; // px of the neighboring box kept visible at rest
// Must match PackFront's "focused" Tailwind height classes (h-96 / sm:h-[28rem]).
const BOX_H_MOBILE = 384;
const BOX_H_SM = 448;
const SM_BREAKPOINT = 640;
const SWIPE_THRESHOLD = 55;

export default function PackCarousel({
  active,
  onSwitch,
}: {
  active: PackType;
  onSwitch: (pack: PackType) => void;
}) {
  const activeIndex = ORDER.indexOf(active);
  const [boxHeight, setBoxHeight] = useState(BOX_H_MOBILE);

  useEffect(() => {
    const update = () => setBoxHeight(window.innerWidth >= SM_BREAKPOINT ? BOX_H_SM : BOX_H_MOBILE);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const trackHeight = ORDER.length * boxHeight + (ORDER.length - 1) * GAP;
  const windowHeight = boxHeight + GAP + PEEK;
  const maxScroll = trackHeight - windowHeight;
  // Index 0 top-aligns (peek shows below); the last index bottom-aligns (peek shows above).
  const yFor = (index: number) => (index === 0 ? 0 : -maxScroll * (index / (ORDER.length - 1)));

  return (
    <div className="flex w-full items-center justify-center gap-3">
      <div className="relative overflow-hidden" style={{ height: windowHeight }}>
        <motion.div
          className="flex flex-col items-center"
          style={{ gap: GAP }}
          animate={{ y: yFor(activeIndex) }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.y < -SWIPE_THRESHOLD && activeIndex < ORDER.length - 1) {
              onSwitch(ORDER[activeIndex + 1]);
            } else if (info.offset.y > SWIPE_THRESHOLD && activeIndex > 0) {
              onSwitch(ORDER[activeIndex - 1]);
            }
          }}
        >
          {ORDER.map((pack) => {
            const isActive = pack === active;
            return (
              <motion.div
                key={pack}
                animate={{
                  scale: isActive ? 1 : 0.8,
                  opacity: isActive ? 1 : 0.3,
                  filter: isActive ? "blur(0px) saturate(1)" : "blur(4px) saturate(0.5)",
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "rounded-xl",
                  isActive && "shadow-[0_0_32px_-4px_rgba(217,150,60,0.45)]",
                  !isActive && "pointer-events-none",
                )}
              >
                <PackFront packType={pack} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Vertical two-position indicator */}
      <div className="flex flex-col items-center gap-2">
        {ORDER.map((pack) => (
          <button
            key={pack}
            type="button"
            onClick={() => onSwitch(pack)}
            aria-label={`Show ${pack} Origin Box`}
            className={cn(
              "w-1.5 rounded-full transition-all",
              pack === active ? "h-5 bg-zinc-200" : "h-1.5 bg-zinc-700",
            )}
          />
        ))}
      </div>
    </div>
  );
}
