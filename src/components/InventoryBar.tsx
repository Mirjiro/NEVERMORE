"use client";

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
    { icon: "🪙", label: "Gold", value: gold.toLocaleString() },
    { icon: "💎", label: "Diamonds", value: diamonds.toLocaleString() },
    { icon: "🌱", label: "Seeds", value: seeds.toLocaleString() },
    { icon: "🐾", label: "Creatures", value: creatures.toLocaleString() },
  ];

  return (
    <div className="grid w-full max-w-xs grid-cols-2 gap-2 sm:max-w-sm sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-lg border border-zinc-800 bg-zinc-900/60 py-2"
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span className="mt-1 text-sm font-semibold text-zinc-100">{item.value}</span>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
