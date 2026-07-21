"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";
import PackFront, { TILE_WIDTH } from "./PackFront";

const ORDER: PackType[] = ["Classic", "Elite"];

// Fallback used only for the handful of frames before the ResizeObserver
// below reports a real measurement (a single, non-nested clamp() — safe
// across browsers since it isn't wrapped inside calc()).
const FALLBACK_HEIGHT = "clamp(268px, 84vw, 468px)";

export default function PackCarousel({
  active,
  onSwitch,
}: {
  active: PackType;
  onSwitch: (pack: PackType) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Partial<Record<PackType, HTMLDivElement | null>>>({});
  const measureRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const settleFrame = useRef<number | null>(null);
  const hasScrolledOnce = useRef(false);
  const lastSyncedPack = useRef<PackType | null>(null);

  // Measure the box's rendered height directly in JS, rather than
  // recomputing its width-driven aspect-ratio math a second time in a nested
  // calc(clamp(...)) CSS expression — nested math functions inside calc()
  // have a history of inconsistent support/resolution across browsers, so
  // reading the real box height straight from layout sidesteps that class of
  // bug entirely and guarantees the carousel region always matches exactly
  // what got rendered, everywhere.
  //
  // This reads a dedicated, always-full-scale, never-transitioning sizer
  // element — not any of the actual carousel slides. Both Classic and Elite
  // share the same aspect ratio, so any slide would numerically give the same
  // answer, but the slides themselves toggle between scale-100 (active) and
  // scale-[0.82] (inactive) with a 300ms CSS transition; measuring one of
  // them directly is liable to catch it mid-transition — e.g. right after a
  // reveal-flow round trip remounts this component — and lock in a too-small
  // height for good, since nothing ever fires a follow-up resize once a pure
  // transform transition (rather than a real layout change) finishes.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setMeasuredHeight(el.getBoundingClientRect().height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = measuredHeight != null ? `${measuredHeight}px` : FALLBACK_HEIGHT;

  // Which slide is "active" (full scale, full opacity) used to be driven by
  // an IntersectionObserver watching each slide against the container. That
  // added an extra async hop between the scroll actually arriving at a slide
  // and the visual state catching up to it: IntersectionObserver callbacks
  // are only guaranteed to run "at some point after" a layout/paint, not
  // synchronously with the scroll that caused them, and can lag noticeably
  // behind fast or compositor-driven scrolling. That gap is exactly what a
  // swipe stalling mid-transition looks like from the outside — the scroll
  // itself already arrived, but nothing told the box to grow into view yet,
  // so it's still small/faded until something (another nudge, another
  // scroll event) finally makes the observer report in.
  //
  // Deriving the active slide directly from scrollTop instead removes that
  // extra hop entirely: it's the same value the browser is already using to
  // decide where the scroll rests, read synchronously, every scroll event —
  // no separate observer, no separate timing, nothing to lag behind.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncActiveToScroll = () => {
      const slideHeight = container.clientHeight;
      if (!slideHeight) return;
      const idx = Math.min(Math.max(Math.round(container.scrollTop / slideHeight), 0), ORDER.length - 1);
      const pack = ORDER[idx];
      // Every 'scroll' event during a gesture can fire many times a second;
      // skip the call entirely (not just rely on React bailing out of a
      // same-value setState) when the slide hasn't actually changed, so a
      // swipe doesn't spend any extra work re-announcing the same pack over
      // and over while the main thread already has plenty to do.
      if (pack && pack !== lastSyncedPack.current) {
        lastSyncedPack.current = pack;
        onSwitch(pack);
      }
    };

    // Detect user-initiated scrolling so the programmatic snap (below) never
    // fights a swipe that's already in progress — native scroll-snap
    // physics owns the gesture entirely.
    //
    // iOS Safari's momentum scrolling can decay and stop just short of an
    // actual snap point on a short/moderate swipe, instead of always gliding
    // all the way there — `scroll-snap-type: mandatory` constrains where
    // the scroll is allowed to *rest*, but doesn't guarantee the
    // deceleration itself travels the full remaining distance. Finishing
    // that needs to know when the scroll has actually stopped moving — not
    // just when 'scroll' events stop firing, since iOS's momentum decay can
    // trail off with a long tail of sparse, barely-there scroll events that
    // would keep resetting a plain debounce without ever leaving a clean
    // gap. A rAF loop that watches scrollTop directly sidesteps that: once
    // the position hasn't moved for a handful of consecutive frames, it's
    // settled, full stop — however many (or few) 'scroll' events fired.
    const STABLE_FRAMES_NEEDED = 6; // ~100ms at 60fps
    const MAX_POLL_MS = 3000; // safety net against a runaway loop

    const pollForSettle = () => {
      let lastTop = container.scrollTop;
      let stableFrames = 0;
      const startedAt = performance.now();

      const step = () => {
        const top = container.scrollTop;
        if (Math.abs(top - lastTop) < 0.5) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
          lastTop = top;
        }

        if (stableFrames >= STABLE_FRAMES_NEEDED) {
          isUserScrolling.current = false;
          const slideHeight = container.clientHeight;
          if (slideHeight) {
            const nearest = Math.round(top / slideHeight) * slideHeight;
            if (Math.abs(top - nearest) > 1) {
              // Finishing the snap itself moves scrollTop, which the next
              // 'scroll' event restarts this same poll for — so it keeps
              // watching until *that* settles too, instead of assuming one
              // correction is the end of it. Clearing the ref (rather than
              // leaving it pointing at this now-finished frame) is what lets
              // that next 'scroll' event actually start a fresh poll instead
              // of assuming one is still running.
              container.scrollTo({ top: nearest, behavior: "smooth" });
              settleFrame.current = null;
              return;
            }
          }
          settleFrame.current = null;
          return;
        }

        if (performance.now() - startedAt > MAX_POLL_MS) {
          isUserScrolling.current = false;
          settleFrame.current = null;
          return;
        }

        settleFrame.current = requestAnimationFrame(step);
      };

      settleFrame.current = requestAnimationFrame(step);
    };

    const handleScroll = () => {
      isUserScrolling.current = true;
      syncActiveToScroll();
      if (settleFrame.current == null) pollForSettle();
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (settleFrame.current != null) cancelAnimationFrame(settleFrame.current);
    };
  }, [onSwitch]);

  // External switches (dot tap) programmatically snap to the target slide.
  // Skipped while the user is mid-gesture so it never fights their swipe.
  //
  // The very first run (on mount) jumps instantly rather than smoothly: on
  // a fresh mount with e.g. active="Elite" (right after a reveal-flow round
  // trip), the container itself always starts scrolled-to-0 (Classic) in
  // the DOM. A `useLayoutEffect` + instant jump settles the scroll onto the
  // actual active slide before the browser ever paints, so there's no
  // visible flash of Classic before it animates away to Elite. Subsequent
  // dot-tap switches animate smoothly instead.
  useLayoutEffect(() => {
    if (isUserScrolling.current) return;
    const behavior = hasScrolledOnce.current ? "smooth" : "auto";
    hasScrolledOnce.current = true;
    slideRefs.current[active]?.scrollIntoView({ behavior, block: "nearest" });
  }, [active]);

  return (
    <div className="relative w-full shrink-0 overflow-hidden" style={{ height }}>
      {/* Dedicated, invisible sizing reference — see the comment above
          measuredHeight for why this can't just read one of the slides below. */}
      <div
        aria-hidden
        className="invisible absolute left-0 top-0"
        style={{ width: TILE_WIDTH, aspectRatio: "2999 / 4000" }}
      >
        <div ref={measureRef} className="pt-0 pb-2" style={{ height: "100%" }} />
      </div>

      <div
        ref={containerRef}
        className="no-scrollbar w-full overflow-y-auto overscroll-y-contain"
        style={{
          height,
          scrollSnapType: "y mandatory",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {ORDER.map((pack) => {
          const isActive = pack === active;
          return (
            <div
              key={pack}
              ref={(el) => {
                slideRefs.current[pack] = el;
              }}
              className="flex w-full shrink-0 items-start justify-center"
              style={{ height, scrollSnapAlign: "center", scrollSnapStop: "always" }}
            >
              <div
                // transition-[transform,opacity] rather than transition-all:
                // transform and opacity are the two properties the GPU
                // compositor can animate independently of the main thread.
                // blur()/saturate() filters (dropped below) don't have that
                // path — animating them forces a full repaint on every
                // frame, which is exactly the kind of main-thread work that
                // can stall mid-swipe on a real phone, even though it never
                // shows up testing on an unloaded desktop browser.
                className={cn(
                  "flex origin-top items-start justify-center pt-0 pb-2 transition-[transform,opacity] duration-300 ease-out",
                  isActive ? "scale-100 opacity-100" : "pointer-events-none scale-[0.82] opacity-30",
                )}
              >
                <PackFront packType={pack} active={isActive} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fade the scrollable edges to the page background so the transition
          between slides reads as a smooth dissolve rather than a hard cut. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#09090b] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-[#09090b] to-transparent" />

      {/* Vertical two-position indicator, beside the carousel */}
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
        {ORDER.map((pack) => (
          <button
            key={pack}
            type="button"
            onClick={() => onSwitch(pack)}
            aria-label={`Show ${pack} Origin Box`}
            className={cn(
              "w-1.5 rounded-full transition-all",
              pack === active ? "h-5 bg-zinc-200" : "h-1.5 bg-zinc-700",
            )}
          />
        ))}
      </div>
    </div>
  );
}
