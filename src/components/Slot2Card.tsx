"use client";

import type { Slot2Result } from "@/lib/types";
import { getSlot2Content } from "@/lib/slot2Content";
import { cn } from "@/lib/cn";

export default function Slot2Card({ slot2 }: { slot2: Slot2Result }) {
  const { icon, title, subtitle, accent } = getSlot2Content(slot2);

  return (
    <div className="flex h-80 w-56 flex-col items-center justify-center rounded-xl border-2 border-zinc-700 bg-zinc-900 px-4 text-center shadow-lg shadow-black/40 sm:h-96 sm:w-64">
      <span className="text-4xl">{icon}</span>
      <p className={cn("mt-4 text-lg font-semibold", accent)}>{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
    </div>
  );
}
