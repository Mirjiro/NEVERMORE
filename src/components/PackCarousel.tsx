"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PanInfo, Transition } from "framer-motion";
import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";
import PackFront, { TILE_WIDTH } from "./PackFront";

// Exactly two Origin Boxes exist and only ever will — this is deliberately
// not a generic N-item carousel. Fixed left-to-right order: Classic always
// occupies the "left" position when it isn't centered, Elite the "right".
const PACKS: readonly PackType[] = ["Classic", "Elite"];

// Fallback used only for the handful of frames before the ResizeObserver
// below reports a real measurement (a single, non-nested clamp() — safe
// across browsers since it isn't wrapped inside calc()).
const FALLBACK_HEIGHT = "clamp(268px, 84vw, 468px)";

// How far the inactive box peeks in from its side, as a percentage of its
// own width (so it scales with TILE_WIDTH's own clamp rather than needing a
// second breakpoint-aware constant).
const PEEK_PERCENT = 48;
const INACTIVE_SCALE = 0.88;
const INACTIVE_BLUR = "1.5px";

const SWIPE_OFFSET_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 500;

// Weighty-but-responsive spring — the one motion curve every position/scale/
// blur change in this carousel animates through, so a swipe-commit and a
// dot-tap read as the same confident, premium settle.
const CAROUSEL_SPRING: Transition = { type: "spring", stiffness: 280, damping: 30, mass: 0.9 };

function targetFor(pack: PackType, active: PackType) {
  if (pack === active) return { x: "0%", scale: 1, blur: "0px" };
  const side = pack === "Classic" ? -1 : 1;
  return { x: `${side * PEEK_PERCENT}%`, scale: INACTIVE_SCALE, blur: INACTIVE_BLUR };
}

export default function PackCarousel({
  active,
  onSwitch,
}: {
  active: PackType;
  onSwitch: (pack: PackType) => void;
}) {
  const measureRef = useRef<HTMLDivElement>(null);

  // Measure the box's rendered height directly in JS, rather than
  // recomputing its width-driven aspect-ratio math a second time in a nested
  // calc(clamp(...)) CSS expression — nested math functions inside calc()
  // have a history of inconsistent support/resolution across browsers, so
  // reading the real box height straight from layout sidesteps that class of
  // bug entirely and guarantees the carousel region always matches exactly
  // what got rendered, everywhere.
  //
  // This reads a dedicated sizer element — not either actual box — so the
  // measurement is never coupled to whichever pack happens to be active when
  // ResizeObserver first fires (both share the same aspect ratio anyway).
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setMeasuredHeight(el.getBoundingClientRect().height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = measuredHeight != null ? `${measuredHeight}px` : FALLBACK_HEIGHT;

  const handleDragEnd = (pack: PackType, info: PanInfo) => {
    if (pack !== active) return;
    const swipedLeft = info.offset.x < -SWIPE_OFFSET_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD;
    const swipedRight = info.offset.x > SWIPE_OFFSET_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD;
    if (pack === "Classic" && swipedLeft) onSwitch("Elite");
    else if (pack === "Elite" && swipedRight) onSwitch("Classic");
  };

  return (
    <div className="relative w-full shrink-0 overflow-visible" style={{ height }}>
      {/* Dedicated, invisible sizing reference — see the comment above
          measuredHeight for why this can't just read one of the boxes below. */}
      <div
        aria-hidden
        className="invisible absolute left-0 top-0"
        style={{ width: TILE_WIDTH, aspectRatio: "2999 / 4000" }}
      >
        <div ref={measureRef} className="pt-0 pb-2" style={{ height: "100%" }} />
      </div>

      {PACKS.map((pack) => {
        const isActive = pack === active;
        const target = targetFor(pack, active);
        return (
          <motion.div
            key={pack}
            drag={isActive ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            dragMomentum={false}
            onDragEnd={(_, info) => handleDragEnd(pack, info)}
            onClick={() => {
              if (!isActive) onSwitch(pack);
            }}
            animate={{ x: target.x, scale: target.scale, filter: `blur(${target.blur})` }}
            transition={CAROUSEL_SPRING}
            className={cn("absolute inset-0 flex items-start justify-center pt-0 pb-2", !isActive && "cursor-pointer")}
            style={{ zIndex: isActive ? 2 : 1, touchAction: "pan-y" }}
          >
            <PackFront packType={pack} active={isActive} />
          </motion.div>
        );
      })}

      {/* Vertical two-position indicator, beside the carousel */}
      <div className="absolute right-1 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2">
        {PACKS.map((pack) => (
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
