"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { rollPull, rollOrigin, PACK_CONFIG, QUANTITY_TIERS, costForQuantity, type Quantity } from "@/lib/odds";
import type { PackType, PullResult } from "@/lib/types";
import { cn } from "@/lib/cn";
import type { HistoryEntry } from "@/lib/storage";
import InventoryBar from "./InventoryBar";
import OriginBackground from "./OriginBackground";
import PackCarousel from "./PackCarousel";
import PackInfoModal from "./PackInfoModal";
import RevealFlow from "./RevealFlow";
import RevealDeck from "./RevealDeck";
import StoreModal from "./StoreModal";
import HistoryModal from "./HistoryModal";

const INFO_BUTTON_ASSETS: Record<PackType, { infoSrc: string; infoRatio: string }> = {
  Classic: { infoSrc: "/assets/buttons/info-icon.webp", infoRatio: "130 / 148" },
  Elite: { infoSrc: "/assets/buttons/elite-info-icon.webp", infoRatio: "130 / 157" },
};

/** Shared with TabBar's own hide animation so both read as one cohesive motion. */
const CHROME_TRANSITION = { duration: 0.45, ease: [0.16, 0.84, 0.24, 1] as const };

const HISTORY_ICON = "/assets/icons/scroll.webp";
const ADD_FUNDS_ICON = "/assets/icons/plus.webp";

export default function OriginTab({
  gold,
  diamonds,
  totalSeeds,
  creatures,
  collection,
  history,
  onSpendGold,
  onSpendDiamonds,
  onAddGold,
  onAddDiamonds,
  onApplyPull,
  onSellDuplicates,
  onResetProgress,
  onRevealChange,
}: {
  gold: number;
  diamonds: number;
  totalSeeds: number;
  creatures: number;
  collection: Record<string, number>;
  history: HistoryEntry[];
  onSpendGold: (amount: number) => void;
  onSpendDiamonds: (amount: number) => void;
  onAddGold: (amount: number) => void;
  onAddDiamonds: (amount: number) => void;
  onApplyPull: (pull: PullResult) => void;
  onSellDuplicates: () => void;
  onResetProgress: () => void;
  /** Fires whenever the reveal stage (X1/X10 opening) opens or closes, so the
   * bottom dock (owned by a sibling component) can hide/reappear in sync. */
  onRevealChange?: (active: boolean) => void;
}) {
  const [activePack, setActivePack] = useState<PackType>("Classic");
  const [quantity, setQuantity] = useState<Quantity>(1);
  const [pulls, setPulls] = useState<PullResult[] | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyOpenedAt, setHistoryOpenedAt] = useState(0);

  const inReveal = pulls !== null;

  // A ref (not state) because it must block a second `openActivePack` call
  // that lands in the same tick as the first, before React has had a chance
  // to re-render and unmount the Open X1/X10 buttons — a burst of rapid taps
  // on a slow device previously fired the roll+spend logic once per tap,
  // silently deducting currency multiple times while only the last roll's
  // results ever reached the screen.
  const openingLock = useRef(false);

  // Called synchronously alongside setPulls (never via a useEffect keyed on
  // `pulls`) so React batches this with OriginTab's own re-render into the
  // same commit — an effect fires on a later pass, which left the dock's
  // hide animation starting a beat behind the header's own.
  const setRevealState = (results: PullResult[] | null) => {
    setPulls(results);
    onRevealChange?.(results !== null);
    if (results === null) openingLock.current = false;
  };

  // Guards handleCollect so it only ever takes effect once per reveal, even
  // though RevealFlow can call it more than once if the player swipes back
  // to a reward and forward again past the Collected screen.
  const collectedRef = useRef(false);

  // Cost and rewards are deliberately NOT applied when the box is opened —
  // only once the player actually reaches the Collected screen, so the top
  // bar (hidden throughout the reveal anyway, but this keeps the underlying
  // state honest) never reflects a pull the player hasn't seen yet. `pulls`
  // itself carries everything needed to know what to charge/grant: its
  // length is always one of the QUANTITY_TIERS (openActivePack only ever
  // passes one of those), and its packType says which currency the cost
  // came out of.
  const handleCollect = useCallback(() => {
    if (collectedRef.current || !pulls) return;
    collectedRef.current = true;
    const packType = pulls[0].packType;
    const cost = costForQuantity(packType, pulls.length as Quantity);
    if (packType === "Classic") onSpendGold(cost);
    else onSpendDiamonds(cost);
    pulls.forEach(onApplyPull);
  }, [pulls, onSpendGold, onSpendDiamonds, onApplyPull]);

  // Measures the top bar's own natural (uncollapsed) height so it can be
  // animated down to 0 and back — a real pixel value, never "auto", which
  // Framer Motion can't tween directly.
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setTopBarHeight(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const config = PACK_CONFIG[activePack];
  const balance = activePack === "Classic" ? gold : diamonds;
  const cost = costForQuantity(activePack, quantity);
  const canAfford = balance >= cost;

  const openActivePack = (count: Quantity) => {
    if (openingLock.current) return;
    const openCost = costForQuantity(activePack, count);
    if (balance < openCost) return;
    openingLock.current = true;
    // Cost isn't spent and rewards aren't applied here — only once the
    // player reaches the Collected screen, via handleCollect. Affordability
    // is still checked now (nothing else can change the balance mid-reveal,
    // since the purchase controls are hidden for the whole reveal).
    const batchOrigin = rollOrigin();
    const results =
      count === 1 ? [rollPull(activePack)] : Array.from({ length: count }, () => rollPull(activePack, batchOrigin));
    collectedRef.current = false;
    setRevealState(results);
  };

  return (
    <div className="relative isolate mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden px-4">
      <OriginBackground active={activePack} visible={!inReveal} />

      {/* Header + currency row collapse away together for the reveal-stage
          presentation — a real measured pixel height (never "auto", which
          Framer Motion can't tween) animating down to 0 reclaims the space
          for the reveal stage below, while the inner wrapper's own opacity/y
          gives the "swipe up and away" motion. */}
      <motion.div
        className="shrink-0 overflow-hidden"
        initial={false}
        animate={{ height: inReveal ? 0 : (topBarHeight ?? "auto") }}
        transition={CHROME_TRANSITION}
      >
        <motion.div
          ref={topBarRef}
          initial={false}
          animate={{ opacity: inReveal ? 0 : 1, y: inReveal ? -28 : 0 }}
          transition={CHROME_TRANSITION}
        >
          {/* Header — fixed within the layout, never scrolls */}
          <header className="relative shrink-0 pt-4 text-center">
            <img
              src="/assets/header/logo-glow.webp"
              alt=""
              draggable={false}
              className="pointer-events-none absolute select-none object-cover"
              style={{
                left: -16,
                right: -16,
                top: -24,
                height: "calc(100% + 24px)",
                width: "calc(100% + 32px)",
                // Tailwind's Preflight sets `img { max-width: 100% }` globally,
                // which silently clamps the explicit width above back down to
                // exactly the header's own width — discarding the overscan meant
                // to keep this image's hard edges from landing at a visible
                // boundary against the background.
                maxWidth: "none",
                objectPosition: "bottom",
                filter: "blur(10px)",
              }}
            />
            <h1 className="relative">
              <img
                src="/assets/logo/nevermore-wordmark.webp"
                alt="NEVERMORE"
                draggable={false}
                className="mx-auto h-auto select-none"
                style={{ width: "clamp(220px, 62vw, 300px)" }}
              />
            </h1>

            <button
              onClick={() => {
                setHistoryOpenedAt(Date.now());
                setHistoryOpen(true);
              }}
              aria-label="View duplicates and recent pulls"
              className="absolute right-0 top-8 flex h-9 w-9 items-center justify-center transition active:scale-95"
            >
              <img src={HISTORY_ICON} alt="" draggable={false} className="h-full w-full select-none object-contain" />
            </button>
          </header>

          {/* Currency row — fixed within the layout, never scrolls */}
          <div className="shrink-0 py-3">
            <InventoryBar gold={gold} diamonds={diamonds} seeds={totalSeeds} creatures={creatures} />
          </div>
        </motion.div>
      </motion.div>

      {/* `relative` + `flex-1` on this wrapper (not the individual branches)
          so "reveal" and "tiles" can crossfade as absolutely-positioned
          overlays without splitting the available flex space between them
          mid-transition — letting AnimatePresence run its default
          simultaneous exit/enter (no `mode="wait"`) instead of a strictly
          sequential one, which previously left a ~400ms dead gap with
          neither view visible while the header/dock were already retracting. */}
      <div className="relative min-h-0 flex-1">
        <AnimatePresence>
        {pulls ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // `fixed` (not `absolute`) so this centers against the full
            // viewport, independent of this flex-1 region's own height —
            // which is actively shrinking/growing as the header and dock
            // collapse away (CHROME_TRANSITION, 450ms). Centering against
            // the live-animating flex box made the box visibly keep
            // resettling for ~150ms after it first appeared.
            className="fixed inset-0 mx-auto flex w-full max-w-md flex-col items-center justify-center overflow-y-auto"
          >
            {pulls.length === 1 ? (
              <RevealFlow pull={pulls[0]} onCollect={handleCollect} onDismiss={() => setRevealState(null)} />
            ) : (
              <RevealDeck pulls={pulls} onCollect={handleCollect} onDismiss={() => setRevealState(null)} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="tiles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // Deliberately quicker than "reveal"'s own fade-in (the Framer
            // Motion default, ~0.3s) — the two views sit at different
            // positions/sizes (this one's box follows the carousel's own
            // layout, the reveal stage's is centered in the full reclaimed
            // height), so a long crossfade briefly shows two overlapping
            // box illustrations. Clearing this one away fast keeps that
            // window brief instead of a lingering double-image.
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain"
            style={{ top: "clamp(-28px, -2svh, -4px)" }}
          >
            {/* This region normally never needs to scroll — the box, buttons,
                and any optional content (insufficient-currency message, free
                Origin Box button) all fit within the available space. But on
                a short viewport with the free-box button present, the total
                content can exceed the space between the currency row and the
                dock; overflow-y-auto (rather than overflow-hidden) lets the
                user scroll those last few pixels into view instead of the
                free-box button silently ending up invisible behind the fixed
                dock. PackCarousel's own internal scroll-snap (for switching
                between Classic/Elite) still works independently within it. */}
            <PackCarousel active={activePack} onSwitch={setActivePack} />

            {/* Purchase controls — sit directly beneath the box */}
            <div
              className="relative z-20 flex shrink-0 flex-col items-center gap-2 pb-[6px] pt-2"
              style={{ transform: "translateY(-32px)" }}
            >
              {/* Crossfades on pack switch (cost/currency/color all change) —
                  quick and low-amplitude on purpose, matching the carousel's
                  own "confident, not flashy" motion language. */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePack}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <QuantitySelector packType={activePack} quantity={quantity} onChange={setQuantity} />

                    <button
                      onClick={() => openActivePack(quantity)}
                      disabled={!canAfford}
                      className={cn(
                        "rounded-full px-9 py-3 text-sm font-bold uppercase tracking-[0.08em] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                        activePack === "Classic"
                          ? "bg-gradient-to-b from-amber-300 to-amber-600 text-zinc-950 shadow-[0_4px_14px_rgba(217,150,60,0.35)]"
                          : "bg-gradient-to-b from-cyan-300 to-violet-500 text-zinc-950 shadow-[0_4px_14px_rgba(139,92,246,0.35)]",
                      )}
                    >
                      Open
                    </button>
                  </div>

                  <p className={cn("text-xs font-semibold", canAfford ? "text-ink-muted" : "text-red-400")}>
                    {cost.toLocaleString()} {config.currency}
                  </p>

                  <div className="flex items-center gap-2">
                    {!canAfford && (
                      <>
                        <p className="whitespace-nowrap text-xs text-ink-faint">Not enough {config.currency}</p>
                        <button
                          type="button"
                          onClick={() => setStoreOpen(true)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center transition active:scale-95"
                          aria-label="Buy Gold or Diamonds"
                        >
                          <img
                            src={ADD_FUNDS_ICON}
                            alt=""
                            draggable={false}
                            className="h-full w-full select-none object-contain"
                          />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setInfoOpen(true)}
                      aria-label={`${activePack} Origin Box rate info`}
                      className="shrink-0 transition active:scale-95"
                    >
                      <img
                        src={INFO_BUTTON_ASSETS[activePack].infoSrc}
                        alt=""
                        draggable={false}
                        className="pointer-events-none select-none"
                        style={{ height: 30, aspectRatio: INFO_BUTTON_ASSETS[activePack].infoRatio }}
                      />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Absorbs remaining vertical space below the buttons instead of
                letting the carousel region stretch and push them down. */}
            <div className="min-h-0 flex-1" />
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <PackInfoModal open={infoOpen} packType={activePack} onClose={() => setInfoOpen(false)} />
      <StoreModal
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        gold={gold}
        diamonds={diamonds}
        onSpendGold={onSpendGold}
        onSpendDiamonds={onSpendDiamonds}
        onAddGold={onAddGold}
        onAddDiamonds={onAddDiamonds}
      />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        now={historyOpenedAt}
        collection={collection}
        history={history}
        onSellDuplicates={onSellDuplicates}
        onResetProgress={onResetProgress}
      />
    </div>
  );
}

/**
 * `[ x1 ▼ ]` — tap to open a short menu of every supported quantity
 * (1/10/20/50/100), each showing its own total cost so switching tiers is a
 * single direct tap rather than stepping through them one at a time. Opens
 * upward: this control sits low in the layout, close to the bottom dock.
 */
function QuantitySelector({
  packType,
  quantity,
  onChange,
}: {
  packType: PackType;
  quantity: Quantity;
  onChange: (quantity: Quantity) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Select quantity"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-bold text-ink transition active:scale-95"
      >
        x{quantity}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={cn("transition-transform", open && "rotate-180")}
        >
          <path d="M1.5 3.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-1/2 z-30 mb-2 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
          >
            {QUANTITY_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  onChange(tier);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition",
                  tier === quantity ? "bg-zinc-800 text-ink" : "text-ink-muted hover:bg-zinc-800/60",
                )}
              >
                <span className="font-semibold">x{tier}</span>
                <span className="text-xs text-ink-faint">{costForQuantity(packType, tier).toLocaleString()}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
