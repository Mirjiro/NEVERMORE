"use client";

import { motion } from "framer-motion";
import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Placeholder pack art (brown/vignette background + wordmark) until real art
 * ships. Doubles as the selectable tile on the Origin tab and, via layoutId,
 * morphs into the reveal-stage card when opened.
 */
export default function PackFront({
  packType,
  priceLabel,
  disabled = false,
  disabledLabel,
  size = "tile",
  onTap,
}: {
  packType: PackType;
  priceLabel: string;
  disabled?: boolean;
  /** Shown as a badge overlay when disabled, e.g. "Coming Soon". Omit for a plain dim (e.g. can't afford it yet). */
  disabledLabel?: string;
  size?: "tile" | "full";
  onTap?: () => void;
}) {
  const dims = size === "tile" ? "w-full aspect-[3/4] max-w-[168px]" : "w-56 h-80 sm:w-64 sm:h-96";

  return (
    <motion.button
      type="button"
      layoutId={`pack-${packType}`}
      onClick={onTap}
      disabled={disabled || !onTap}
      whileTap={!disabled && onTap ? { scale: 0.96 } : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-amber-900/60",
        "bg-[radial-gradient(ellipse_at_center,_#6b4423_0%,_#3b2415_55%,_#0d0805_100%)]",
        "flex flex-col items-center justify-center px-3 text-center shadow-lg shadow-black/50",
        dims,
        disabled && (disabledLabel ? "opacity-90" : "opacity-50"),
      )}
    >
      <div className="font-serif text-base font-bold leading-tight tracking-wide text-zinc-100 sm:text-lg">
        <div>NEVERMORE:</div>
        <div>ORIGIN PACK</div>
      </div>

      <div
        className={cn(
          "mt-3 font-sans text-xs italic tracking-[0.2em] text-zinc-400",
          packType === "Elite" && "text-white [text-shadow:0_0_8px_rgba(255,255,255,0.55)]",
        )}
      >
        {packType}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold text-zinc-200">
        {priceLabel}
      </div>

      {disabled && disabledLabel && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
          <span className="rounded-full border border-zinc-400 px-3 py-1 text-[11px] uppercase tracking-wider text-zinc-200">
            {disabledLabel}
          </span>
        </div>
      )}
    </motion.button>
  );
}
