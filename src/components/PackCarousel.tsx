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

  // Which slide LOOKS active (opacity) is tracked locally so the box's own
  // visual state can update live, every scroll event, with no debounce.
  const [visualActive, setVisualActive] = useState(active);

  // Measure the box's rendered height directly in JS, rather than
  // recomputing its width-driven aspect-ratio math a second time in a nested
  // calc(clamp(...)) CSS expression — nested math functions inside calc()
  // have a history of inconsistent support/resolution across browsers, so
  // reading the real box height straight from layout sidesteps that class of
  // bug entirely and guarantees the carousel region always matches exactly
  // what got rendered, everywhere.
  //
  // This reads a dedicated sizer element — not any of the actual carousel
  // slides. Both Classic and Elite share the same aspect ratio, so any slide
  // would numerically give the same answer, but keeping the measurement on
  // its own always-mounted element avoids coupling it to whichever slide
  // happens to be active at the moment ResizeObserver first fires.
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
  // programmatic scrolling. `active` used to only update here after a
  // ~160ms debounce, on the theory that changing it mid-swipe was what
  // caused the double-scroll — but the actual cause was the scrollIntoView
  // effect above, which is gone entirely now. Nothing left reacts to
  // `active` changing by scrolling, so debouncing it no longer protects
  // against anything; it only meant the purchase buttons' pricing text
  // visibly lagged behind the box's own (already-live) opacity. `active`
  // and `visualActive` now update from the same calculation, at the same
  // time, so the box and the buttons are never out of sync.
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
      const pack = nearestPack();
      setVisualActive(pack);
      if (pack !== activeRef.current) {
        activeRef.current = pack;
        onSwitch(pack);
      }
    };

    container.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
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
                // No scale animation between slides — the box stays at its
                // full/main size the whole time you're swiping, so there's
                // no small-to-large pop to glitch. Opacity alone (a cheap,
                // compositor-only property) still fades the inactive slide
                // for a sense of focus, without ever changing its size.
                className={cn(
                  "flex origin-top items-start justify-center pt-0 pb-2 transition-opacity duration-150 ease-out",
                  isActive ? "opacity-100" : "pointer-events-none opacity-30",
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
