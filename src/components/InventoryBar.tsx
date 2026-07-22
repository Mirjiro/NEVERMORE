"use client";

import { Fragment } from "react";
import { CURRENCY_ICONS } from "@/lib/currencyIcons";

export default function InventoryBar({
  gold,
  diamonds,
  seeds,
  creatures,
}: {
  gold: number;
  diamonds: number;
  seeds: number;
  creatures: number;
}) {
  const items = [
    { icon: CURRENCY_ICONS.gold, value: gold.toLocaleString() },
    { icon: CURRENCY_ICONS.diamond, value: diamonds.toLocaleString() },
    { icon: CURRENCY_ICONS.seed, value: seeds.toLocaleString() },
    { icon: CURRENCY_ICONS.creature, value: creatures.toLocaleString() },
  ];

  return (
    <div className="flex w-full items-center justify-center gap-2 text-sm text-ink sm:gap-3">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-ink-faint">·</span>}
          <span className="flex items-center gap-1">
            <img src={item.icon} alt="" draggable={false} className="h-4 w-4 select-none object-contain" />
            <span className="font-semibold tabular-nums">{item.value}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}
