"use client";

import { useCallback, useState } from "react";
import type { TabName } from "@/lib/tabs";
import type { Origin, PullResult } from "@/lib/types";
import TabBar from "./TabBar";
import UnderConstruction from "./UnderConstruction";
import OriginTab from "./OriginTab";

const ORIGINS: Origin[] = ["Vampire", "Fae", "Demon", "Angel", "Mage", "Werewolf", "Royal"];

function zeroPerOrigin(): Record<Origin, number> {
  const record = {} as Record<Origin, number>;
  for (const origin of ORIGINS) record[origin] = 0;
  return record;
}

const STARTING_GOLD = 100_000;

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabName>("Origin");
  const [navHeight, setNavHeight] = useState(0);
  const [revealActive, setRevealActive] = useState(false);

  const [gold, setGold] = useState(STARTING_GOLD);
  const [diamonds, setDiamonds] = useState(0);
  const [seedsByOrigin, setSeedsByOrigin] = useState<Record<Origin, number>>(zeroPerOrigin);
  const [creatures, setCreatures] = useState(0);

  const applySlot2 = useCallback((pull: PullResult) => {
    const slot2 = pull.slot2;
    switch (slot2.type) {
      case "Gold":
        setGold((g) => g + slot2.amount);
        break;
      case "Diamonds":
        setDiamonds((d) => d + slot2.amount);
        break;
      case "Seed":
        setSeedsByOrigin((prev) => ({ ...prev, [slot2.origin]: prev[slot2.origin] + 1 }));
        break;
      case "Creature":
        setCreatures((c) => c + 1);
        break;
      case "Card":
        break;
    }
  }, []);

  const totalSeeds = Object.values(seedsByOrigin).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-zinc-950 pt-[env(safe-area-inset-top)]">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden transition-[padding-bottom] duration-[450ms] ease-out"
        style={{ paddingBottom: revealActive ? 0 : navHeight }}
      >
        {activeTab === "Origin" ? (
          <OriginTab
            gold={gold}
            diamonds={diamonds}
            totalSeeds={totalSeeds}
            creatures={creatures}
            onSpendGold={(amount) => setGold((g) => g - amount)}
            onSpendDiamonds={(amount) => setDiamonds((d) => d - amount)}
            onAddGold={(amount) => setGold((g) => g + amount)}
            onAddDiamonds={(amount) => setDiamonds((d) => d + amount)}
            onApplyPull={applySlot2}
            onRevealChange={setRevealActive}
          />
        ) : (
          <UnderConstruction tab={activeTab} />
        )}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} onHeightChange={setNavHeight} hidden={revealActive} />
    </div>
  );
}
