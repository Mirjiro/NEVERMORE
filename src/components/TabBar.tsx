"use client";

import { useLayoutEffect, useRef } from "react";
import { TABS, TabName } from "@/lib/tabs";
import { cn } from "@/lib/cn";

const DOCK_BAR_ASSET = "/assets/dock/dock-bar-cropped.png";
const DOCK_BAR_ASPECT = "1161 / 163";

/** Horizontal inset matching the artwork's ornate corner flourish, so icons sit inside the flat panel. */
const DOCK_INSET = "6.5%";

/**
 * Pinned directly to the viewport via `position: fixed` — this does not
 * depend on any ancestor's flex/height resolution, so it can't be thrown off
 * by whatever percentage-height quirk affects the rest of the page on a given
 * browser. Its real rendered height is measured in JS and reported up via
 * `onHeightChange` so the scrollable content above it can reserve exact
 * clearance instead of guessing a fixed padding value.
 */
export default function TabBar({
  active,
  onChange,
  onHeightChange,
}: {
  active: TabName;
  onChange: (tab: TabName) => void;
  onHeightChange?: (height: number) => void;
}) {
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el || !onHeightChange) return;
    const report = () => onHeightChange(el.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col bg-zinc-950"
      style={{
        gap: "3px",
        padding: `0 20px calc(env(safe-area-inset-bottom) + 12px)`,
      }}
    >
      {/* Icon row — icons sit inside the custom dock bar artwork */}
      <div className="relative w-full" style={{ aspectRatio: DOCK_BAR_ASPECT }}>
        <img
          src={DOCK_BAR_ASSET}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
        />
        <div
          className="absolute inset-0 flex items-center"
          style={{ paddingLeft: DOCK_INSET, paddingRight: DOCK_INSET }}
        >
          {TABS.map((tab) => {
            const isActive = tab.name === active;
            return (
              <button
                key={tab.name}
                onClick={() => onChange(tab.name)}
                className="relative flex h-full flex-1 items-center justify-center"
                aria-label={tab.name}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute h-11 w-11 rounded-full bg-orange-500/55 blur-lg"
                  />
                )}
                <img
                  src={tab.icon}
                  alt=""
                  draggable={false}
                  className={cn("relative h-9 w-9 select-none object-contain", !isActive && "opacity-50")}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Label row — directly beneath the dock bar, aligned under each icon */}
      <div className="flex w-full" style={{ paddingLeft: DOCK_INSET, paddingRight: DOCK_INSET }}>
        {TABS.map((tab) => {
          const isActive = tab.name === active;
          return (
            <button
              key={tab.name}
              onClick={() => onChange(tab.name)}
              className={cn(
                "flex-1 text-center text-[8px] uppercase tracking-wide",
                isActive ? "font-semibold text-ink" : "text-ink-faint",
              )}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
