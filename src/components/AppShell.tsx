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

  const [gold, setGold] = useState(STARTING_GOLD);
  const [diamonds, setDiamonds] = useState(0);
  const [seedsByOrigin, setSeedsByOrigin] = useState<Record<Origin, number>>(zeroPerOrigin);
  const [creatures, setCreatures] = useState(0);
  const [freePacks, setFreePacks] = useState(0);

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
      case "OriginCardPack":
        setFreePacks((f) => f + 1);
        break;
      case "Card":
        break;
    }
  }, []);

  const totalSeeds = Object.values(seedsByOrigin).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-dvh w-full pb-20">
      {activeTab === "Origin" ? (
        <OriginTab
          gold={gold}
          diamonds={diamonds}
          totalSeeds={totalSeeds}
          creatures={creatures}
          freePacks={freePacks}
          onSpendGold={(amount) => setGold((g) => g - amount)}
          onSpendFreePack={() => setFreePacks((f) => f - 1)}
          onApplyPull={applySlot2}
        />
      ) : (
        <UnderConstruction tab={activeTab} />
      )}

      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
