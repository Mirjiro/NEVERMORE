"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { CURRENCY_ICONS } from "@/lib/currencyIcons";
import { computeIdleGold } from "@/lib/idleRewards";
import {
  REALM_DOCK_CHIP_SIZE_PX,
  REALM_EDGE_INSET_PX,
  REALM_PET_SIZE_PX,
  REALM_TEXT_SHADOW_LG,
  REALM_TEXT_SHADOW_SM,
  REALM_TOP_GAP_PX,
} from "@/lib/realmLayout";
import RealmBackground from "./RealmBackground";

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
 * background/pet art is still being made; every element here is a floating
 * overlay (text with a drop-shadow, glass chips) rather than a boxed panel,
 * so the eventual artwork reads as the hero of the screen and the UI reads
 * as sitting on top of the world instead of a dashboard laid over it. See
 * RealmBackground for how the real scene drops in later.
 */
export default function RealmTab({
  lastIdleCollectAt,
  onCollectIdleGold,
}: {
  lastIdleCollectAt: number | null;
  onCollectIdleGold: () => void;
}) {
  // RealmTab only ever mounts client-side (activeTab starts as "Origin", so
  // this is never part of the initial SSR/hydration pass) — a lazy Date.now()
  // initializer is safe here, unlike AppShell's gold/diamonds defaults.
  const [now, setNow] = useState(() => Date.now());
  const [openStub, setOpenStub] = useState<StubDestination | null>(null);
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
      <RealmBackground />

      <div
        className="relative flex min-h-0 flex-1 flex-col"
        style={{ paddingLeft: REALM_EDGE_INSET_PX, paddingRight: REALM_EDGE_INSET_PX, paddingTop: REALM_TOP_GAP_PX }}
      >
        {/* Top zone: identity + idle reward. Text sits directly on the scene
            (drop-shadow for legibility, no card behind it); the idle chip is
            the one piece of real UI here, kept small and glassy. */}
        <div className="shrink-0">
          <p
            className="text-xs uppercase tracking-[0.2em] text-ink-faint"
            style={{ textShadow: REALM_TEXT_SHADOW_SM }}
          >
            Welcome back to
          </p>
          <h1
            className="text-[26px] font-bold leading-tight text-ink"
            style={{ textShadow: REALM_TEXT_SHADOW_LG }}
          >
            The Mortal Realm
          </h1>

          <button
            onClick={onCollectIdleGold}
            disabled={accruedGold <= 0}
            className={cn(
              "mt-4 flex items-center gap-2 rounded-full border px-3.5 py-2 backdrop-blur-md transition active:scale-95 disabled:active:scale-100",
              accruedGold > 0
                ? "border-amber-400/40 bg-amber-950/40 shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                : "border-white/10 bg-black/25",
            )}
          >
            <img src={CURRENCY_ICONS.gold} alt="" className="h-4 w-4 shrink-0 object-contain" />
            <span className={cn("text-sm font-semibold", accruedGold > 0 ? "text-amber-200" : "text-ink-faint")}>
              {accruedGold > 0 ? `+${accruedGold.toLocaleString()} Gold ready` : "Idle Gold collected"}
            </span>
          </button>
        </div>

        {/* Hero zone: the pet stands low in the open space, leaving the sky
            clear above it for the eventual illustrated scene — reads as a
            character standing in the world rather than centered UI chrome. */}
        <div className="flex flex-1 flex-col items-center justify-end gap-2 pb-10">
          <AnimatePresence mode="wait">
            {petLine && (
              <motion.p
                key={reactionId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm italic text-ink-muted"
                style={{ textShadow: REALM_TEXT_SHADOW_SM }}
              >
                {petLine}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            onClick={petTap}
            whileTap={{ scale: 0.88 }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex items-center justify-center drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)]"
            style={{ height: REALM_PET_SIZE_PX, width: REALM_PET_SIZE_PX }}
            aria-label="Your pet"
          >
            <img
              src={CURRENCY_ICONS.creature}
              alt=""
              draggable={false}
              className="h-full w-full select-none object-contain"
            />
          </motion.button>
          {/* Contact shadow — grounds the pet against whatever's behind it,
              independent of what the eventual background art looks like. */}
          <div className="h-2.5 w-16 rounded-full bg-black/50 blur-md" />
        </div>

        {/* Bottom zone: home-specific actions as floating glass chips — the
            bottom TabBar below already handles navigation between the
            game's major sections, so this row never duplicates it. */}
        <div className="mb-2 flex shrink-0 justify-center gap-6">
          <DockChip label="Pet" icon={CURRENCY_ICONS.creature} onClick={petTap} />
          <DockChip label="Home" onClick={() => setOpenStub("Home")} />
          <DockChip label="Cave" onClick={() => setOpenStub("Cave")} />
          <DockChip label="Inventory" onClick={() => setOpenStub("Inventory")} />
        </div>
      </div>

      <RealmStubOverlay destination={openStub} onClose={() => setOpenStub(null)} />
    </div>
  );
}

type StubDestination = "Home" | "Cave" | "Inventory";

const STUB_CONTENT: Record<StubDestination, { title: string; description: string }> = {
  Home: {
    title: "Home",
    description: "Step inside? Not built yet — the Realm's interior is still being furnished.",
  },
  Cave: {
    title: "The Cave",
    description: "Something stirs in the dark below the Realm — not ready to be faced yet.",
  },
  Inventory: {
    title: "Inventory",
    description: "Your hoard isn't ready to be sorted through yet — check back soon.",
  },
};

function DockChip({
  label,
  icon,
  onClick,
}: {
  label: string;
  /** Omitted for destinations without art yet — renders a flat placeholder glyph. */
  icon?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span
        className="flex items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-md transition active:scale-90"
        style={{ height: REALM_DOCK_CHIP_SIZE_PX, width: REALM_DOCK_CHIP_SIZE_PX }}
      >
        {icon ? (
          <img src={icon} alt="" draggable={false} className="h-7 w-7 select-none object-contain" />
        ) : (
          <span className="text-xs font-bold text-ink-faint">?</span>
        )}
      </span>
      <span
        className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted"
        style={{ textShadow: REALM_TEXT_SHADOW_SM }}
      >
        {label}
      </span>
    </button>
  );
}

// Portaled to <body> for the same reason as every other OriginTab modal (see
// StoreModal) — an in-place overlay here would sit trapped behind the bottom
// TabBar's z-50 stacking context. Shared by every not-yet-built Realm
// destination (Home/Cave/Inventory) rather than one overlay per destination.
function RealmStubOverlay({ destination, onClose }: { destination: StubDestination | null; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  const content = destination ? STUB_CONTENT[destination] : null;

  return createPortal(
    <AnimatePresence>
      {content && (
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
            <h2 className="text-xl font-bold text-ink">{content.title}</h2>
            <p className="text-sm text-ink-faint">{content.description}</p>
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
