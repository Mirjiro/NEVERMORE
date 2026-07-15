"use client";

import { TABS, TabName } from "@/lib/tabs";
import { cn } from "@/lib/cn";

export default function TabBar({
  active,
  onChange,
}: {
  active: TabName;
  onChange: (tab: TabName) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const isActive = tab.name === active;
          return (
            <button
              key={tab.name}
              onClick={() => onChange(tab.name)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              <span className={cn("text-lg leading-none", !isActive && "opacity-50")}>{tab.icon}</span>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wide",
                  isActive ? "font-semibold text-zinc-100" : "text-zinc-500",
                )}
              >
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
