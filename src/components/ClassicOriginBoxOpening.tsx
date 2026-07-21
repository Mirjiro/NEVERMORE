"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { BOX_IDLE_ANIMATE, BOX_IDLE_TRANSITION } from "@/lib/originBoxAssets";
import { cn } from "@/lib/cn";

export type ClassicOriginBoxOpeningProps = {
  lidSrc: string;
  baseSrc: string;
  onOpened?: () => void;
  disabled?: boolean;
  className?: string;
};

type BoxState = "idle" | "pressing" | "opening" | "open";

/**
 * The supplied art's native canvas ratio (both assets are 2999x4000) — used
 * to size the shared wrapper so `object-fit: contain` never distorts either
 * layer. Update this if the source art is ever regenerated at a new size.
 */
const ART_ASPECT_RATIO = "2999 / 4000";

/**
 * Calibration for the lid's resting position over the base. The two supplied
 * assets already line up almost exactly (their drawn box content sits within
 * ~0.3% of the same position on each 2999x4000 canvas), so these start at
 * zero — nudge them here if a regenerated lid/base pair needs realignment.
 */
const LID_CALIBRATION = {
  x: 0, // px, resting horizontal offset (+right / -left)
  y: 0, // px, resting vertical offset (+down / -up)
  scale: 1, // relative scale multiplier vs the base
  rotate: 0, // degrees, resting tilt when closed
};

/** Tap-response micro-interaction (whole box compresses, then rebounds). */
const PRESS = {
  downScale: 0.985,
  downY: 2,
  downMs: 105,
  reboundScale: 1.005,
  reboundMs: 120,
};

/** The lid's separation + drift, once "opening" begins. */
const LID_LIFT = { y: -8, scale: 1.03, tiltX: 3, ms: 210 };
const LID_DRIFT = { x: -32, y: -112, scale: 1.06, rotateZ: -5.5, tiltX: 2, ms: 520 };
const SEAM_GLOW_MS = 220;

/** Smooth, non-bouncy premium ease for the lid's movement. */
const PREMIUM_EASE = [0.16, 0.84, 0.24, 1] as const;

/** Reduced-motion fallback: a short crossfade/translate instead of the full sequence. */
const REDUCED_MOTION_MS = 260;

/*
 * Variants are hoisted to module scope wherever possible (rather than defined
 * fresh inside the component body) so their object identity stays stable
 * across renders — Framer Motion re-evaluates a running animation if the
 * `variants` prop it's reading from changes identity mid-flight, which
 * otherwise cuts the opening sequence short on the re-renders that state
 * changes like "pressing" -> "opening" naturally trigger.
 */

const wrapperVariants: Variants = {
  idle: {
    // Shared with the PackFront carousel tile so both stay consistent.
    ...BOX_IDLE_ANIMATE,
    transition: BOX_IDLE_TRANSITION,
  },
  pressing: {
    scale: [1, PRESS.downScale, PRESS.reboundScale],
    y: [0, PRESS.downY, 0],
    rotate: 0,
    transition: {
      duration: (PRESS.downMs + PRESS.reboundMs) / 1000,
      times: [0, PRESS.downMs / (PRESS.downMs + PRESS.reboundMs), 1],
      ease: "easeOut",
    },
  },
  opening: { scale: 1, y: 0, rotate: 0 },
  open: { scale: 1, y: 0, rotate: 0 },
};

const lidShadowVariants: Variants = {
  idle: { opacity: 0.16, scaleX: 1 },
  pressing: { opacity: 0.16, scaleX: 1 },
  opening: {
    opacity: [0.16, 0.32, 0.48],
    scaleX: [1, 1.05, 1.15],
    transition: { duration: (LID_LIFT.ms + LID_DRIFT.ms) / 1000, ease: "easeOut" },
  },
  open: { opacity: 0.48, scaleX: 1.15 },
};

const seamGlowVariants: Variants = {
  idle: { opacity: 0 },
  pressing: { opacity: 0 },
  opening: {
    opacity: [0, 1, 0.35],
    transition: { duration: SEAM_GLOW_MS / 1000 + 0.15, times: [0, 0.55, 1], ease: "easeOut" },
  },
  open: { opacity: 0.3 },
};

const interiorGlowVariants: Variants = {
  idle: { opacity: 0, scale: 0.85 },
  pressing: { opacity: 0, scale: 0.85 },
  opening: {
    opacity: [0, 0.25, 0.85],
    scale: [0.85, 0.95, 1],
    transition: {
      duration: (LID_LIFT.ms + LID_DRIFT.ms) / 1000,
      delay: (SEAM_GLOW_MS / 1000) * 0.4,
      ease: "easeOut",
    },
  },
  open: {
    opacity: [0.85, 0.6, 0.85],
    scale: 1,
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function ClassicOriginBoxOpening({
  lidSrc,
  baseSrc,
  onOpened,
  disabled = false,
  className,
}: ClassicOriginBoxOpeningProps) {
  const [state, setState] = useState<BoxState>("idle");
  const [imagesReady, setImagesReady] = useState(false);
  const openedFired = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  // Preload both layers before allowing interaction, so the first tap never
  // shows a flicker or shifts layout while an image is still loading.
  useEffect(() => {
    let cancelled = false;
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 2 && !cancelled) setImagesReady(true);
    };
    const lid = new window.Image();
    lid.onload = markLoaded;
    lid.onerror = markLoaded;
    lid.src = lidSrc;
    const base = new window.Image();
    base.onload = markLoaded;
    base.onerror = markLoaded;
    base.src = baseSrc;
    return () => {
      cancelled = true;
    };
  }, [lidSrc, baseSrc]);

  const finishOpening = useCallback(() => {
    setState("open");
    if (!openedFired.current) {
      openedFired.current = true;
      onOpened?.();
    }
  }, [onOpened]);

  const triggerOpen = useCallback(() => {
    if (disabled || !imagesReady || state !== "idle") return;

    if (prefersReducedMotion) {
      setState("opening");
      window.setTimeout(finishOpening, REDUCED_MOTION_MS);
      return;
    }

    setState("pressing");
    window.setTimeout(() => {
      setState("opening");
      // Framer Motion's onAnimationComplete fires as soon as the "opening"
      // variant *label* is applied, not when the lid's tween actually
      // finishes (the tween itself still runs its full declared duration in
      // the background) — so completion is driven by that same declared
      // duration directly instead of trusting the callback.
      window.setTimeout(finishOpening, LID_LIFT.ms + LID_DRIFT.ms);
    }, PRESS.downMs + PRESS.reboundMs);
  }, [disabled, imagesReady, state, prefersReducedMotion, finishOpening]);

  const lidVariants: Variants = useMemo(() => ({
    idle: {
      x: LID_CALIBRATION.x,
      y: LID_CALIBRATION.y,
      scale: LID_CALIBRATION.scale,
      rotate: LID_CALIBRATION.rotate,
      rotateX: 0,
      rotateZ: 0,
    },
    pressing: {
      x: LID_CALIBRATION.x,
      y: LID_CALIBRATION.y,
      scale: LID_CALIBRATION.scale,
      rotate: LID_CALIBRATION.rotate,
    },
    opening: prefersReducedMotion
      ? {
          opacity: [1, 0.4],
          y: [LID_CALIBRATION.y, LID_CALIBRATION.y + LID_DRIFT.y * 0.35],
          transition: { duration: REDUCED_MOTION_MS / 1000, ease: "easeOut" },
        }
      : {
          x: [LID_CALIBRATION.x, LID_CALIBRATION.x, LID_CALIBRATION.x + LID_DRIFT.x],
          y: [LID_CALIBRATION.y, LID_CALIBRATION.y + LID_LIFT.y, LID_CALIBRATION.y + LID_DRIFT.y],
          scale: [
            LID_CALIBRATION.scale,
            LID_CALIBRATION.scale * LID_LIFT.scale,
            LID_CALIBRATION.scale * LID_DRIFT.scale,
          ],
          rotateZ: [0, 0, LID_DRIFT.rotateZ],
          rotateX: [0, LID_LIFT.tiltX, LID_DRIFT.tiltX],
          transition: {
            duration: (LID_LIFT.ms + LID_DRIFT.ms) / 1000,
            times: [0, LID_LIFT.ms / (LID_LIFT.ms + LID_DRIFT.ms), 1],
            ease: PREMIUM_EASE,
          },
        },
    open: prefersReducedMotion
      ? { opacity: 0.4, y: LID_CALIBRATION.y + LID_DRIFT.y * 0.35 }
      : {
          x: LID_CALIBRATION.x + LID_DRIFT.x,
          y: LID_CALIBRATION.y + LID_DRIFT.y,
          scale: LID_CALIBRATION.scale * LID_DRIFT.scale,
          rotateZ: LID_DRIFT.rotateZ,
          rotateX: LID_DRIFT.tiltX,
        },
  }), [prefersReducedMotion]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <motion.button
        type="button"
        onClick={triggerOpen}
        disabled={disabled || !imagesReady || state !== "idle"}
        aria-label="Open Classic Origin Box"
        variants={wrapperVariants}
        animate={state}
        className="relative mx-auto block appearance-none border-0 bg-transparent p-0 disabled:cursor-default"
        style={{ width: "clamp(270px, 86vw, 420px)" }}
      >
        {/*
         * The lid's upward drift is a transform (doesn't affect layout), so
         * no reserved space is allocated for it here — it just extends into
         * the natural centering gap the parent's `justify-center` already
         * leaves above the box. Reserving space with real padding used to
         * push the box down and shrink it relative to true center.
         */}
        <div className="relative w-full overflow-visible" style={{ aspectRatio: ART_ASPECT_RATIO }}>
          {/* Growing shadow gap beneath the lid as it separates */}
          <motion.div
            variants={lidShadowVariants}
            animate={state}
            className="absolute inset-x-[14%] bottom-[9%] h-[6%] rounded-[50%] bg-black blur-md"
          />

          {/* Base / tray — stays essentially still */}
          <img
            src={baseSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full select-none"
            style={{ objectFit: "contain" }}
          />

          {/* Interior glow — brightens the tray floor as the lid clears it.
              This region is also the reserved slot for a future pack asset
              to rise from; keep it free of visual content for now. */}
          <motion.div
            data-slot="pack-rise-glow"
            variants={interiorGlowVariants}
            animate={state}
            className="pointer-events-none absolute inset-x-[22%] bottom-[14%] top-[38%] rounded-[40%]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255,214,150,0.85) 0%, rgba(214,160,90,0.35) 45%, transparent 75%)",
            }}
          />

          {/* Seam glow — a warm antique light awakening at the lid/base boundary */}
          <motion.div
            variants={seamGlowVariants}
            animate={state}
            className="pointer-events-none absolute inset-x-[16%] bottom-[10%] h-[5%]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(240,205,140,0.9) 20%, rgba(255,224,170,1) 50%, rgba(240,205,140,0.9) 80%, transparent 100%)",
              filter: "blur(6px)",
            }}
          />

          {/* Dust motes — only once the tray is open */}
          <DustMotes visible={state === "open"} />

          {/* Lid — the piece that separates and drifts away */}
          <motion.img
            src={lidSrc}
            alt=""
            draggable={false}
            variants={lidVariants}
            animate={state}
            className="absolute inset-0 h-full w-full select-none"
            style={{ objectFit: "contain", transformOrigin: "50% 60%" }}
          />
        </div>
      </motion.button>

      {state === "idle" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ opacity: { duration: 1.4, repeat: Infinity } }}
          className="mt-2 text-center text-sm font-semibold uppercase tracking-widest text-ink-muted"
        >
          Tap to Open
        </motion.p>
      )}
    </div>
  );
}

interface DustMote {
  id: number;
  leftPct: number;
  topPct: number;
  delay: number;
  duration: number;
  size: number;
}

function DustMotes({ visible }: { visible: boolean }) {
  // Lazy initializer keeps the random layout stable across re-renders.
  const [motes] = useState<DustMote[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      leftPct: 28 + Math.random() * 44,
      topPct: 35 + Math.random() * 40,
      delay: Math.random() * 1.4,
      duration: 3.2 + Math.random() * 2.2,
      size: 2 + Math.random() * 2,
    })),
  );

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none absolute inset-0 overflow-visible">
          {motes.map((m) => (
            <motion.span
              key={m.id}
              className="absolute rounded-full bg-amber-100"
              style={{ left: `${m.leftPct}%`, top: `${m.topPct}%`, width: m.size, height: m.size }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.55, 0], y: -20 }}
              transition={{
                duration: m.duration,
                delay: m.delay,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
