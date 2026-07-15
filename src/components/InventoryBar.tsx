"use client";

import { Fragment } from "react";

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
    { icon: "🪙", value: gold.toLocaleString() },
    { icon: "💎", value: diamonds.toLocaleString() },
    { icon: "🌱", value: seeds.toLocaleString() },
    { icon: "🐾", value: creatures.toLocaleString() },
  ];

  return (
    <div className="flex w-full items-center justify-center gap-2 text-sm text-zinc-200 sm:gap-3">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-zinc-700">·</span>}
          <span className="flex items-center gap-1">
            <span className="text-sm leading-none">{item.icon}</span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}
