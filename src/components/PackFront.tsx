"use client";

import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";

const PACK_BG =
  "bg-[radial-gradient(ellipse_at_center,_#6b4423_0%,_#3b2415_55%,_#0d0805_100%)] border-amber-900/60";

/** Placeholder Box art (brown/vignette background + wordmark) until real art ships. */
export default function PackFront({
  packType,
  size = "focused",
}: {
  packType: PackType;
  size?: "focused" | "peek";
}) {
  const dims = size === "focused" ? "h-80 w-56 sm:h-96 sm:w-64" : "h-36 w-28 sm:h-40 sm:w-32";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-3 text-center",
        PACK_BG,
        dims,
      )}
    >
      <div
        className={cn(
          "font-serif font-bold leading-tight tracking-wide text-zinc-100",
          size === "focused" ? "text-base sm:text-lg" : "text-[10px]",
        )}
      >
        <div>NEVERMORE:</div>
        <div>ORIGIN BOX</div>
      </div>

      <div
        className={cn(
          "mt-2 font-sans italic tracking-[0.2em] text-zinc-400",
          size === "focused" ? "text-xs" : "text-[8px]",
          packType === "Elite" && "text-white [text-shadow:0_0_8px_rgba(255,255,255,0.55)]",
        )}
      >
        {packType}
      </div>
    </div>
  );
}
