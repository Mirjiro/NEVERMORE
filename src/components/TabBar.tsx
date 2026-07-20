"use client";

import { TABS, TabName } from "@/lib/tabs";
import { cn } from "@/lib/cn";

const DOCK_BAR_ASSET = "/assets/dock/dock-bar.png";
const DOCK_BAR_ASPECT = "1200 / 601";

/** Horizontal inset matching the artwork's ornate corner flourish, so icons sit inside the flat panel. */
const DOCK_INSET = "6.5%";

/**
 * Single wrapper for the dock bar + its labels — kept as one group (not two
 * independently positioned pieces) so the label row always sits a fixed,
 * small gap beneath the artwork regardless of screen height.
 */
export default function TabBar({
  active,
  onChange,
}: {
  active: TabName;
  onChange: (tab: TabName) => void;
}) {
  return (
    <nav
      className="mx-auto flex w-full max-w-md shrink-0 flex-col bg-zinc-950"
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
