"use client";

import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";

const PACK_BG =
  "bg-[radial-gradient(ellipse_at_center,_#6b4423_0%,_#3b2415_55%,_#0d0805_100%)] border-amber-900/60";

/**
 * Placeholder pack art (brown/vignette background + wordmark) until real art
 * ships. Purely presentational — the parent decides sizing/interactivity.
 */
export default function PackFront({
  packType,
  size = "focused",
  dimmed = false,
}: {
  packType: PackType;
  size?: "focused" | "peek";
  dimmed?: boolean;
}) {
  const dims = size === "focused" ? "w-56 h-80 sm:w-64 sm:h-96" : "w-32 h-44 sm:w-36 sm:h-52";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-3 text-center shadow-lg shadow-black/50",
        PACK_BG,
        dims,
        dimmed && "opacity-55",
      )}
    >
      <div
        className={cn(
          "font-serif font-bold leading-tight tracking-wide text-zinc-100",
          size === "focused" ? "text-base sm:text-lg" : "text-xs",
        )}
      >
        <div>NEVERMORE:</div>
        <div>ORIGIN PACK</div>
      </div>

      <div
        className={cn(
          "mt-2 font-sans italic tracking-[0.2em] text-zinc-400",
          size === "focused" ? "text-xs" : "text-[9px]",
          packType === "Elite" && "text-white [text-shadow:0_0_8px_rgba(255,255,255,0.55)]",
        )}
      >
        {packType}
      </div>
    </div>
  );
}
