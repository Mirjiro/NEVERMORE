"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { TabName } from "@/lib/tabs";
import { cn } from "@/lib/cn";
import { CURRENCY_ICONS } from "@/lib/currencyIcons";
import { computeIdleGold, IDLE_CAP_HOURS } from "@/lib/idleRewards";

const PET_REACTIONS = [
  "Mrrn?",
  "*stretches*",
  "The Realm stirs...",
  "It nuzzles your hand.",
  "A low, contented purr.",
  "It watches you, waiting.",
];

/**
 * Home hub — infrastructure only for now. The illustrated Mortal Realm
 * background/pet art is still being made; this ships the layout, idle-Gold
 * mechanic, pet-tap interaction, and Cave/Farm/Market/Origin navigation
 * against a flat placeholder backdrop, structured the same way
 * OriginBackground is (one full-bleed layer) so the real art is a drop-in
 * swap later rather than a rebuild.
 */
export default function RealmTab({
  lastIdleCollectAt,
  onCollectIdleGold,
  onNavigate,
}: {
  lastIdleCollectAt: number | null;
  onCollectIdleGold: () => void;
  onNavigate: (tab: TabName) => void;
}) {
  // RealmTab only ever mounts client-side (activeTab starts as "Origin", so
  // this is never part of the initial SSR/hydration pass) — a lazy Date.now()
  // initializer is safe here, unlike AppShell's gold/diamonds defaults.
  const [now, setNow] = useState(() => Date.now());
  const [caveOpen, setCaveOpen] = useState(false);
  const [petLine, setPetLine] = useState<string | null>(null);
  const [reactionId, setReactionId] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const accruedGold = lastIdleCollectAt !== null ? computeIdleGold(lastIdleCollectAt, now) : 0;

  const petTap = () => {
    setPetLine(PET_REACTIONS[Math.floor(Math.random() * PET_REACTIONS.length)]);
    setReactionId((id) => id + 1);
  };

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* TEMP flat placeholder backdrop — swap for the illustrated Mortal Realm
          scene here once that art exists; nothing else about this layout changes. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-6">
        <div className="mb-6 shrink-0">
          <p className="text-xs uppercase tracking-widest text-ink-faint">Welcome back to</p>
          <h1 className="text-2xl font-bold text-ink">The Mortal Realm</h1>
        </div>

        <button
          onClick={onCollectIdleGold}
          disabled={accruedGold <= 0}
          className="mb-6 flex shrink-0 items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3.5 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Idle Gold</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-ink">
              <img src={CURRENCY_ICONS.gold} alt="" className="h-5 w-5 object-contain" />
              {accruedGold > 0 ? `+${accruedGold.toLocaleString()}` : "Fully collected"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              accruedGold > 0 ? "bg-amber-500/90 text-ink-dark" : "bg-zinc-800 text-ink-faint",
            )}
          >
            {accruedGold > 0 ? "Collect" : `Caps at ${IDLE_CAP_HOURS}h`}
          </span>
        </button>

        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <motion.button
            onClick={petTap}
            whileTap={{ scale: 0.88 }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center"
            aria-label="Your pet"
          >
            <img
              src={CURRENCY_ICONS.creature}
              alt=""
              draggable={false}
              className="h-full w-full select-none object-contain"
            />
          </motion.button>
          <AnimatePresence mode="wait">
            {petLine && (
              <motion.p
                key={reactionId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm italic text-ink-muted"
              >
                {petLine}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 grid shrink-0 grid-cols-4 gap-2">
          <QuickAccessButton label="Cave" onClick={() => setCaveOpen(true)} />
          <QuickAccessButton label="Farm" icon="/assets/tab-icons/farm.png" onClick={() => onNavigate("Farm")} />
          <QuickAccessButton label="Market" icon="/assets/tab-icons/market.png" onClick={() => onNavigate("Market")} />
          <QuickAccessButton label="Origin" icon="/assets/tab-icons/origin.png" onClick={() => onNavigate("Origin")} />
        </div>
      </div>

      <CaveOverlay open={caveOpen} onClose={() => setCaveOpen(false)} />
    </div>
  );
}

function QuickAccessButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  /** Omitted for destinations without art yet (Cave) — renders a flat placeholder glyph. */
  icon?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/70 py-3 transition active:scale-95"
    >
      {icon ? (
        <img src={icon} alt="" draggable={false} className="h-7 w-7 select-none object-contain" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-ink-faint">
          ?
        </span>
      )}
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
    </button>
  );
}

// Portaled to <body> for the same reason as every other OriginTab modal (see
// StoreModal) — an in-place overlay here would sit trapped behind the bottom
// TabBar's z-50 stacking context.
function CaveOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-10 text-center"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-ink">The Cave</h2>
            <p className="text-sm text-ink-faint">
              Something stirs in the dark below the Realm — not ready to be faced yet.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-semibold text-ink-muted transition active:scale-95"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
