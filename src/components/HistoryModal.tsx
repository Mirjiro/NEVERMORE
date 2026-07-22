"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Origin } from "@/lib/types";
import type { HistoryEntry } from "@/lib/storage";
import { collectionKey } from "@/lib/storage";
import { CARD_POOL } from "@/lib/cardPool";
import { ORIGIN_THEME } from "@/lib/originTheme";
import { RARITY_STYLES, RARITY_ORDER } from "@/lib/rarityStyles";
import { getSlot2Content } from "@/lib/slot2Content";
import { cn } from "@/lib/cn";

const ORIGINS: Origin[] = ["Vampire", "Fae", "Demon", "Angel", "Mage", "Werewolf", "Royal"];

/** 6 rarities x 2 named cards each, fixed by the card pool's own shape. */
const CARDS_PER_ORIGIN = RARITY_ORDER.length * 2;

const RECENT_LIMIT = 40;

function relativeTime(timestamp: number, now: number): string {
  const sec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function HistoryModal({
  open,
  onClose,
  collection,
  history,
  now,
}: {
  open: boolean;
  onClose: () => void;
  collection: Record<string, number>;
  history: HistoryEntry[];
  /** Captured by the caller at the moment the modal is opened (an event
   * handler, not render, is the only place `Date.now()` may be called) — a
   * live-ticking clock isn't worth the render cost for a "3m ago" label, and
   * one timestamp per open reads correctly for as long as the sheet is
   * realistically left open. */
  now: number;
}) {
  const recent = history.length ? [...history].reverse().slice(0, RECENT_LIMIT) : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-zinc-800 bg-zinc-950 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-5 pb-3 pt-5">
              <div>
                <h2 className="text-base font-bold text-ink">Collection</h2>
                <p className="mt-1 text-xs text-ink-faint">Cards discovered &amp; recent pulls</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-ink-muted"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Collection Progress
              </h3>
              <div className="flex flex-col gap-3">
                {ORIGINS.map((origin) => {
                  const theme = ORIGIN_THEME[origin];
                  const ownedCount = RARITY_ORDER.reduce((sum, rarity) => {
                    const [nameA, nameB] = CARD_POOL[origin][rarity];
                    const owned = [nameA, nameB].filter((name) => collection[collectionKey(origin, name)] > 0);
                    return sum + owned.length;
                  }, 0);
                  const pct = Math.round((ownedCount / CARDS_PER_ORIGIN) * 100);
                  return (
                    <div key={origin}>
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn("font-semibold", theme.accent)}>{origin}</span>
                        <span className="font-mono text-xs text-ink-faint">
                          {ownedCount}/{CARDS_PER_ORIGIN}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", theme.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Recent Pulls
              </h3>
              {recent.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-faint">
                  No pulls yet — open an Origin Box to get started.
                </p>
              ) : (
                <div className="flex flex-col">
                  {recent.map((entry, i) => {
                    const slot1Style = RARITY_STYLES[entry.pull.slot1.rarity];
                    const slot2Content = getSlot2Content(entry.pull.slot2);
                    return (
                      <div
                        key={`${entry.timestamp}-${i}`}
                        className={cn("flex items-center justify-between gap-3 py-2", i > 0 && "border-t border-zinc-900")}
                      >
                        <div className="min-w-0">
                          <p className={cn("truncate text-sm font-semibold", slot1Style.accent)}>
                            {entry.pull.slot1.name}
                          </p>
                          <p className="truncate text-xs text-ink-faint">
                            {entry.pull.origin} · {slot1Style.label} · Bonus: {slot2Content.title}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-ink-faint">{relativeTime(entry.timestamp, now)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
