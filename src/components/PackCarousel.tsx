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
  const activeRef = useRef(active);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Which slide LOOKS active (full scale/opacity) is tracked separately from
  // `active` itself. `active` only updates ~160ms after scrolling settles —
  // exactly the debounce that keeps it from changing mid-swipe and (in an
  // earlier version of this component) triggering a second programmatic
  // scroll. That's the right call for `active`, since it's the value the
  // parent uses for pricing/dot state and nothing should update those
  // mid-gesture. But gating the box's own grow/shrink animation on that same
  // debounce meant the box sat small for ~160ms after the swipe had already
  // physically arrived, then took its own 300ms transition on top of that —
  // close to half a second of visible dead time after the finger stops,
  // for a purely local rendering concern that was never part of what
  // caused the earlier double-scroll bug. Tracking it separately, live,
  // off the same scroll position, removes that lag without reintroducing
  // any programmatic scrolling.
  const [visualActive, setVisualActive] = useState(active);

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

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // On mount only (e.g. right after a reveal-flow round trip remounts this
  // component with active="Elite" already), snap the container to match the
  // caller's active pack before paint — a direct scrollTop assignment, not
  // scrollIntoView, so it can't touch any ancestor scroll container, and an
  // empty dependency array so it never re-fires and never fights a swipe.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const slide = slideRefs.current[active];
    if (!container || !slide) return;
    container.scrollTop = slide.offsetTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Previously, two systems both tried to own the carousel's scroll
  // position: native CSS scroll-snap (owning the actual swipe gesture) and
  // a React effect that called `slideRefs.current[active]?.scrollIntoView()`
  // whenever `active` changed. That was fine when only a dot tap ever
  // changed `active`. But once the active pack started being derived from
  // scroll position directly (so the UI updates without waiting on a
  // separate observer), `active` also changes *during* a manual swipe —
  // which made that same effect fire mid-gesture and re-scroll on top of
  // native snap's own settle, producing exactly the "locks, then moves
  // again" double-scroll this was rewritten to fix. `scrollIntoView` can
  // also walk up and scroll ancestor containers, not just this one.
  //
  // The fix: manual swipes are owned by native scroll-snap alone, with zero
  // programmatic scrolling. `active` is only ever updated here — after
  // scrolling has gone quiet for a beat — from whichever slide is nearest
  // the container's resting scroll position. Nothing scrolls in response to
  // that update; it only describes what already happened.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nearestPack = (): PackType => {
      let result: PackType = ORDER[0];
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const pack of ORDER) {
        const slide = slideRefs.current[pack];
        if (!slide) continue;

        const distance = Math.abs(slide.offsetTop - container.scrollTop);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          result = pack;
        }
      }

      return result;
    };

    const handleScroll = () => {
      // Live, undebounced — purely local, drives only the box's own
      // scale/opacity below. Never reaches the parent, so it can't feed
      // back into any programmatic scroll.
      setVisualActive(nearestPack());

      if (scrollEndTimer.current) {
        clearTimeout(scrollEndTimer.current);
      }

      scrollEndTimer.current = setTimeout(() => {
        const pack = nearestPack();
        if (pack !== activeRef.current) {
          activeRef.current = pack;
          onSwitch(pack);
        }
      }, 160);
    };

    container.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);

      if (scrollEndTimer.current) {
        clearTimeout(scrollEndTimer.current);
      }
    };
  }, [onSwitch]);

  // The only programmatic scrolling in this component: a dot tap. Scrolls
  // exclusively the carousel's own container (never scrollIntoView, so
  // never any ancestor), and updates `active` itself right away rather than
  // waiting on the scroll-settle effect above to notice.
  const scrollToPack = (pack: PackType) => {
    const container = containerRef.current;
    const slide = slideRefs.current[pack];

    if (!container || !slide) return;

    activeRef.current = pack;
    setVisualActive(pack);
    onSwitch(pack);

    container.scrollTo({
      top: slide.offsetTop,
      behavior: "smooth",
    });
  };

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
          const isActive = pack === visualActive;
          return (
            <div
              key={pack}
              ref={(el) => {
                slideRefs.current[pack] = el;
              }}
              className="flex w-full shrink-0 items-start justify-center"
              style={{ height, scrollSnapAlign: "start", scrollSnapStop: "always" }}
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
                //
                // duration-150, not duration-300: visualActive now flips the
                // instant scroll crosses the midpoint (live, no debounce),
                // but the box still has to visually finish animating from
                // 82%/30%-opacity up to 100%/100% after that — at 300ms, a
                // swipe that only crosses the midpoint right at the end of
                // its glide could still be visibly growing well after the
                // scroll itself has already arrived, reading as "still
                // settling" even though the position is already correct.
                // Half the duration finishes that visual catch-up sooner.
                className={cn(
                  "flex origin-top items-start justify-center pt-0 pb-2 transition-[transform,opacity] duration-150 ease-out",
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
            onClick={() => scrollToPack(pack)}
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
