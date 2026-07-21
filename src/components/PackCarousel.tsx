"use client";

import { useEffect, useRef } from "react";
import type { PackType } from "@/lib/types";
import { cn } from "@/lib/cn";
import PackFront from "./PackFront";

const ORDER: PackType[] = ["Classic", "Elite"];

export default function PackCarousel({
  active,
  onSwitch,
}: {
  active: PackType;
  onSwitch: (pack: PackType) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Partial<Record<PackType, HTMLDivElement | null>>>({});
  const isUserScrolling = useRef(false);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect user-initiated scrolling so the programmatic snap (below) never
  // fights a swipe that's already in progress — native scroll-snap physics
  // owns the gesture entirely.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      isUserScrolling.current = true;
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = setTimeout(() => {
        isUserScrolling.current = false;
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
  useEffect(() => {
    if (isUserScrolling.current) return;
    slideRefs.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="no-scrollbar h-full w-full overflow-y-auto overscroll-y-contain"
        style={{
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
              className="flex h-full w-full shrink-0 items-start justify-center"
              style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}
            >
              <div
                className={cn(
                  "flex h-full items-start justify-center pt-0 pb-4 transition-all duration-300 ease-out",
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
