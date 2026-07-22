"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { HistoryEntry } from "@/lib/storage";
import { RARITY_STYLES } from "@/lib/rarityStyles";
import { getSlot2Content } from "@/lib/slot2Content";
import { summarizeDuplicates } from "@/lib/duplicateValue";
import { cn } from "@/lib/cn";

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
  onSellDuplicates,
  onResetProgress,
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
  onSellDuplicates: () => void;
  onResetProgress: () => void;
}) {
  const recent = history.length ? [...history].reverse().slice(0, RECENT_LIMIT) : [];
  const duplicates = summarizeDuplicates(collection);

  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleResetClick() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      resetTimeoutRef.current = setTimeout(() => setConfirmingReset(false), 4000);
      return;
    }
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    setConfirmingReset(false);
    onResetProgress();
    onClose();
  }

  // See PackInfoModal for why this is portaled to <body> rather than
  // rendered in place (OriginTab's `isolate` traps in-place modals behind
  // the bottom TabBar's z-50, invisibly).
  if (typeof document === "undefined") return null;

  return createPortal(
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
                <h2 className="text-base font-bold text-ink">History</h2>
                <p className="mt-1 text-xs text-ink-faint">Duplicates &amp; recent pulls</p>
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
              {duplicates.totalCards > 0 && (
                <>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Duplicates</h3>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {duplicates.totalCards} duplicate {duplicates.totalCards === 1 ? "card" : "cards"}
                      </p>
                      <p className="text-xs text-ink-faint">
                        Worth 🪙 {duplicates.totalGold.toLocaleString()} Gold · one copy of each card is always kept
                      </p>
                    </div>
                    <button
                      onClick={onSellDuplicates}
                      className="shrink-0 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-ink-dark transition active:scale-95"
                    >
                      Sell All
                    </button>
                  </div>
                </>
              )}

              <h3
                className={cn(
                  "mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint",
                  duplicates.totalCards > 0 && "mt-5",
                )}
              >
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

              <div className="mt-6 border-t border-zinc-900 pt-4 text-center">
                <button
                  onClick={handleResetClick}
                  className={cn(
                    "text-xs font-medium transition",
                    confirmingReset ? "font-semibold text-red-400" : "text-ink-faint",
                  )}
                >
                  {confirmingReset ? "Tap again to erase all progress — cannot be undone" : "Reset Progress"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
