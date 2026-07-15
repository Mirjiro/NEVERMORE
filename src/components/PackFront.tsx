"use client";

import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";

const PACK_BG =
  "bg-[radial-gradient(ellipse_at_center,_#6b4423_0%,_#3b2415_55%,_#0d0805_100%)] border-amber-900/60";

/** Placeholder Box art (brown/vignette background + wordmark) until real art ships. */
export default function PackFront({ packType }: { packType: PackType }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/5] h-[85%] max-h-[420px] w-auto flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-4 text-center",
        PACK_BG,
      )}
    >
      <div className="font-serif text-lg font-bold leading-tight tracking-wide text-zinc-100 sm:text-xl">
        <div>NEVERMORE:</div>
        <div>ORIGIN BOX</div>
      </div>

      <div
        className={cn(
          "mt-3 font-sans text-sm italic tracking-[0.2em] text-zinc-400",
          packType === "Elite" && "text-white [text-shadow:0_0_8px_rgba(255,255,255,0.55)]",
        )}
      >
        {packType}
      </div>
    </div>
  );
}
