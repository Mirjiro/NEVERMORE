"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ORIGIN_ODDS, RARITY_ODDS, SLOT2_ODDS, PACK_CONFIG } from "@/lib/odds";

function OddsRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-zinc-300">{label}</span>
      <span className="font-mono text-zinc-100">{pct}%</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </div>
  );
}

export default function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-50">Pack Rates</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400"
              >
                ✕
              </button>
            </div>

            <Section title={`Classic Origin Pack — ${PACK_CONFIG.Classic.cost.toLocaleString()} Gold`}>
              <p className="mb-2 text-xs text-zinc-500">Step 1: which Origin the pack draws from.</p>
              {Object.entries(ORIGIN_ODDS).map(([origin, pct]) => (
                <OddsRow key={origin} label={origin} pct={pct} />
              ))}
            </Section>

            <Section title="Card Rarity (Slot 1)">
              {Object.entries(RARITY_ODDS)
                .filter(([, pct]) => pct > 0)
                .map(([rarity, pct]) => (
                  <OddsRow key={rarity} label={rarity} pct={pct} />
                ))}
              <p className="mt-1 text-xs text-zinc-600">Mythic and Forbidden cannot drop from a Classic Pack.</p>
            </Section>

            <Section title="Slot 2">
              {Object.entries(SLOT2_ODDS).map(([outcome, pct]) => (
                <OddsRow key={outcome} label={outcome.replace(/([A-Z])/g, " $1").trim()} pct={pct} />
              ))}
            </Section>

            <Section title={`Elite Origin Pack — ${PACK_CONFIG.Elite.cost} Diamonds`}>
              <p className="text-sm text-zinc-500">Rates coming soon — Elite isn&apos;t open for pulls yet.</p>
            </Section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
