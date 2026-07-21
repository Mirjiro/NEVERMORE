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
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasScrolledOnce = useRef(false);

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

  // Detect user-initiated scrolling so the programmatic snap (below) never
  // fights a swipe that's already in progress — native scroll-snap physics
  // owns the gesture entirely.
  //
  // iOS Safari's momentum scrolling can decay and stop just short of an
  // actual snap point on a short/moderate swipe, instead of always gliding
  // all the way there — `scroll-snap-type: mandatory` constrains where the
  // scroll is allowed to *rest*, but doesn't guarantee the deceleration
  // itself travels the full remaining distance. That leaves the carousel
  // visibly parked between slides (the box still small/faded, since the
  // IntersectionObserver below hasn't crossed its threshold yet) until the
  // user gives it a second nudge. Once our own "user stopped scrolling"
  // debounce fires, explicitly finish the snap to whichever of the two
  // valid rest positions (0 or a full slide height) is nearest, so a single
  // swipe always ends fully settled without needing that extra pull.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      isUserScrolling.current = true;
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = setTimeout(() => {
        isUserScrolling.current = false;
        const slideHeight = container.clientHeight;
        if (!slideHeight) return;
        const nearest = Math.round(container.scrollTop / slideHeight) * slideHeight;
        if (Math.abs(container.scrollTop - nearest) > 1) {
          container.scrollTo({ top: nearest, behavior: "smooth" });
        }
      }, 150);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Selection state is derived from which slide is actually centered,
  // via IntersectionObserver against the carousel container as root.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
          const pack = ORDER.find((p) => slideRefs.current[p] === entry.target);
          if (pack) onSwitch(pack);
        }
      },
      { root: container, threshold: [0.6] },
    );
    for (const pack of ORDER) {
      const el = slideRefs.current[pack];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [onSwitch]);

  // External switches (dot tap) programmatically snap to the target slide.
  // Skipped while the user is mid-gesture so it never fights their swipe.
  //
  // The very first run (on mount) jumps instantly rather than smoothly: a
  // smooth scroll takes a couple hundred ms to reach its target, and the
  // IntersectionObserver above fires its own initial report almost
  // immediately after observing — well before an animated scroll would have
  // moved anywhere. On a fresh mount with e.g. active="Elite", that race
  // let the observer see Classic (the untouched, scrolled-to-0 default) as
  // "centered" first and silently call onSwitch("Classic"), overriding the
  // caller's actual selection right after a reveal-flow round trip. A
  // useLayoutEffect + instant jump settles the correct scroll position
  // before paint, before the observer ever gets a chance to look.
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
                className={cn(
                  "flex origin-top items-start justify-center pt-0 pb-2 transition-all duration-300 ease-out",
                  isActive
                    ? "scale-100 opacity-100 blur-none"
                    : "pointer-events-none scale-[0.82] opacity-30 blur-[3px] saturate-50",
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
