"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TabName } from "@/lib/tabs";
import type { Origin, PullResult } from "@/lib/types";
import { clearSave, collectionKey, loadSave, writeSave, type HistoryEntry } from "@/lib/storage";
import { sellAllDuplicates, summarizeDuplicates } from "@/lib/duplicateValue";
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

  // Always initialized to the same fresh-game defaults on both server and
  // client so the very first client render matches SSR exactly (no hydration
  // mismatch) — any saved progress is applied a moment later, client-only,
  // via the load effect below.
  const [gold, setGold] = useState(STARTING_GOLD);
  const [diamonds, setDiamonds] = useState(0);
  const [seedsByOrigin, setSeedsByOrigin] = useState<Record<Origin, number>>(zeroPerOrigin);
  const [creatures, setCreatures] = useState(0);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Gates the save-effect below until the load-effect has had its one
  // chance to run — otherwise the very first render's fresh-game defaults
  // would immediately overwrite a real saved game before it's ever read.
  const hasLoaded = useRef(false);

  // This is the "synchronize with an external system" effect use-case the
  // set-state-in-effect rule's own linked guidance carves out as legitimate
  // (localStorage isn't available during SSR, so the real value can only be
  // read after mount) — the fully rule-satisfying alternative,
  // useSyncExternalStore, would mean moving gold/diamonds/collection/history
  // out of React state entirely into a manually-subscribed external store,
  // which is disproportionate machinery for a single mount-time load.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = loadSave();
    if (saved) {
      setGold(saved.gold);
      setDiamonds(saved.diamonds);
      setSeedsByOrigin(saved.seedsByOrigin);
      setCreatures(saved.creatures);
      setCollection(saved.collection);
      setHistory(saved.history);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    writeSave({ gold, diamonds, seedsByOrigin, creatures, collection, history });
  }, [gold, diamonds, seedsByOrigin, creatures, collection, history]);

  const recordCard = useCallback((origin: Origin, name: string) => {
    setCollection((prev) => {
      const key = collectionKey(origin, name);
      return { ...prev, [key]: (prev[key] ?? 0) + 1 };
    });
  }, []);

  const applyPull = useCallback(
    (pull: PullResult) => {
      recordCard(pull.slot1.origin, pull.slot1.name);
      setHistory((prev) => [...prev, { timestamp: Date.now(), pull }]);

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
          recordCard(slot2.origin, slot2.name);
          break;
      }
    },
    [recordCard],
  );

  const onSellDuplicates = useCallback(
    () => {
      const { totalGold } = summarizeDuplicates(collection);
      if (totalGold <= 0) return;
      setGold((g) => g + totalGold);
      setCollection((prev) => sellAllDuplicates(prev));
    },
    [collection],
  );

  // Persistence means a refresh no longer doubles as "start over" — this is
  // the deliberate replacement, gated behind a two-tap confirm in the UI
  // itself so a single accidental tap can never wipe a real save.
  const onResetProgress = useCallback(() => {
    clearSave();
    setGold(STARTING_GOLD);
    setDiamonds(0);
    setSeedsByOrigin(zeroPerOrigin());
    setCreatures(0);
    setCollection({});
    setHistory([]);
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
            collection={collection}
            history={history}
            onSpendGold={(amount) => setGold((g) => g - amount)}
            onSpendDiamonds={(amount) => setDiamonds((d) => d - amount)}
            onAddGold={(amount) => setGold((g) => g + amount)}
            onAddDiamonds={(amount) => setDiamonds((d) => d + amount)}
            onApplyPull={applyPull}
            onSellDuplicates={onSellDuplicates}
            onResetProgress={onResetProgress}
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
