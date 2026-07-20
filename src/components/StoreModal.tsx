"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  GOLD_PACKS,
  DIAMOND_PACKS,
  DEALS,
  DIAMOND_EXCHANGE,
  GOLD_EXCHANGE,
  REDEEM_CODES,
  type ExchangeOption,
} from "@/lib/store";

export default function StoreModal({
  open,
  onClose,
  gold,
  diamonds,
  onSpendGold,
  onSpendDiamonds,
  onAddGold,
  onAddDiamonds,
}: {
  open: boolean;
  onClose: () => void;
  gold: number;
  diamonds: number;
  onSpendGold: (amount: number) => void;
  onSpendDiamonds: (amount: number) => void;
  onAddGold: (amount: number) => void;
  onAddDiamonds: (amount: number) => void;
}) {
  const buyDiamondsWithGold = (opt: ExchangeOption) => {
    if (gold < opt.costAmount) return;
    onSpendGold(opt.costAmount);
    onAddDiamonds(opt.gainAmount);
  };

  const buyGoldWithDiamonds = (opt: ExchangeOption) => {
    if (diamonds < opt.costAmount) return;
    onSpendDiamonds(opt.costAmount);
    onAddGold(opt.gainAmount);
  };

  const [codeInput, setCodeInput] = useState("");
  const [codeMessage, setCodeMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const redeemCode = () => {
    const reward = REDEEM_CODES[codeInput.trim()];
    if (!reward) {
      setCodeMessage({ text: "Invalid code.", ok: false });
      return;
    }
    onAddGold(reward.gold);
    onAddDiamonds(reward.diamonds);
    setCodeMessage({
      text: `+${reward.gold.toLocaleString()} Gold, +${reward.diamonds.toLocaleString()} Diamonds!`,
      ok: true,
    });
    setCodeInput("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex h-[85vh] w-full max-w-md flex-col rounded-2xl border border-zinc-800 bg-zinc-950"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-bold text-ink">Store</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-ink-muted"
                aria-label="Close store"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Section title="Buy Gold" icon="🪙" accent="text-amber-300">
                <div className="grid grid-cols-3 gap-2">
                  {GOLD_PACKS.map((p) => (
                    <PurchaseTile key={p.amountLabel} icon="🪙" amountLabel={p.amountLabel} price={p.price} />
                  ))}
                </div>
              </Section>

              <Section title="Buy Diamonds" icon="💎" accent="text-cyan-300">
                <div className="grid grid-cols-3 gap-2">
                  {DIAMOND_PACKS.map((p) => (
                    <PurchaseTile key={p.amountLabel} icon="💎" amountLabel={p.amountLabel} price={p.price} />
                  ))}
                </div>
              </Section>

              <Section title="Deals" icon="🎁" accent="text-yellow-300">
                <div className="flex flex-col gap-2">
                  {DEALS.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{d.name}</p>
                        <p className="truncate text-xs text-ink-muted">
                          🪙 {d.goldLabel} · 💎 {d.diamondLabel}
                        </p>
                      </div>
                      <button
                        disabled
                        className="shrink-0 cursor-not-allowed rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-ink-faint"
                      >
                        {d.price}
                      </button>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Convert Gold/Diamonds" icon="🔄" accent="text-ink-muted">
                <ExchangeBox
                  title="Diamond Exchange"
                  colorClass="border-sky-300/40 bg-sky-400/10"
                  textClass="text-sky-200"
                  options={DIAMOND_EXCHANGE}
                  canAfford={(opt) => gold >= opt.costAmount}
                  onBuy={buyDiamondsWithGold}
                />
                <div className="h-3" />
                <ExchangeBox
                  title="Gold Exchange"
                  colorClass="border-amber-300/40 bg-amber-400/10"
                  textClass="text-amber-200"
                  options={GOLD_EXCHANGE}
                  canAfford={(opt) => diamonds >= opt.costAmount}
                  onBuy={buyGoldWithDiamonds}
                />
              </Section>

              <Section title="Codes" icon="🔑" accent="text-emerald-300">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    redeemCode();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      setCodeMessage(null);
                    }}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-ink-dark transition active:scale-95"
                  >
                    Enter
                  </button>
                </form>
                {codeMessage && (
                  <p className={cn("mt-2 text-xs font-medium", codeMessage.ok ? "text-emerald-300" : "text-red-400")}>
                    {codeMessage.text}
                  </p>
                )}
              </Section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className={cn("mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider", accent)}>
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function PurchaseTile({ icon, amountLabel, price }: { icon: string; amountLabel: string; price: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-3">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-semibold text-ink">{amountLabel}</span>
      <button
        disabled
        className="mt-1 w-full cursor-not-allowed rounded-full bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-ink-faint"
      >
        {price}
      </button>
    </div>
  );
}

function ExchangeBox({
  title,
  colorClass,
  textClass,
  options,
  canAfford,
  onBuy,
}: {
  title: string;
  colorClass: string;
  textClass: string;
  options: ExchangeOption[];
  canAfford: (opt: ExchangeOption) => boolean;
  onBuy: (opt: ExchangeOption) => void;
}) {
  return (
    <div className={cn("rounded-xl border p-3", colorClass)}>
      <h4 className={cn("mb-2 text-xs font-bold uppercase tracking-wide", textClass)}>{title}</h4>
      <div className="flex flex-col gap-1.5">
        {options.map((opt) => {
          const affordable = canAfford(opt);
          return (
            <button
              key={opt.gainLabel}
              onClick={() => onBuy(opt)}
              disabled={!affordable}
              className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className={cn("font-semibold", textClass)}>{opt.gainLabel}</span>
              <span className="text-xs text-ink-muted">for {opt.costLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
