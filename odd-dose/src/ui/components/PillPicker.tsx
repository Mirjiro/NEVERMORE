import { useMemo, useState } from "react";
import { PILLS } from "../../data/pills";
import { countAvailable } from "../../engine/game";
import { RARITIES } from "../../engine/types";
import type { Rarity } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { PillArt } from "./PillArt";
import { RarityTag, Sheet, TypeChips } from "./common";

/** Choose a Known pill. `need` = how many available copies the slot requires (2 when both slots hold the same pill). */
export function PillPicker({ open, onClose, onPick, title, other }: { open: boolean; onClose: () => void; onPick: (id: string) => void; title: string; other?: string | null }) {
  const { state } = useGame();
  const [filter, setFilter] = useState<Rarity | "all">("all");
  const list = useMemo(
    () => PILLS.filter((p) => state.known.includes(p.id) && (filter === "all" || p.rarity === filter)),
    [state.known, filter],
  );
  return (
    <Sheet open={open} onClose={onClose} title={title} className="picker">
      <div className="chips-row">
        {(["all", ...RARITIES] as const).map((r) => (
          <button key={r} className={`chip ${filter === r ? "on" : ""}`} onClick={() => setFilter(r)}>{r === "all" ? "All" : r[0].toUpperCase() + r.slice(1)}</button>
        ))}
      </div>
      <div className="picker-grid">
        {list.map((p) => {
          const avail = countAvailable(state, p.id) - (other === p.id ? 1 : 0);
          return (
            <button key={p.id} className="picker-item" disabled={avail < 1} onClick={() => { onPick(p.id); onClose(); }}>
              <PillArt pillId={p.id} size={64} />
              <strong>{p.name}</strong>
              <RarityTag rarity={p.rarity} />
              <TypeChips types={p.types} />
              <span className={`avail ${avail < 1 ? "none" : ""}`}>{avail < 1 ? "None available" : `${avail} available`}</span>
            </button>
          );
        })}
        {list.length === 0 && <p className="muted">No Known pills in this rarity yet.</p>}
      </div>
    </Sheet>
  );
}
