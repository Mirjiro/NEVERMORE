import { PILLS } from "../../data/pills";
import { countAvailable } from "../../engine/game";
import { useGame } from "../../store/GameContext";
import { PillCard } from "./PillCard";
import { Sheet } from "./common";

/** Choose a Known pill for a Machine slot. Owned pills first; out-of-stock ones tucked away. */
export function PillPicker({ open, onClose, onPick, title, other }: { open: boolean; onClose: () => void; onPick: (id: string) => void; title: string; other?: string | null }) {
  const { state } = useGame();
  if (!open) return null;
  const known = PILLS.filter((p) => state.known.includes(p.id));
  const avail = (id: string) => countAvailable(state, id) - (other === id ? 1 : 0);
  const ready = known.filter((p) => avail(p.id) > 0);
  const out = known.filter((p) => avail(p.id) <= 0);
  return (
    <Sheet open onClose={onClose} title={title} className="picker">
      <div className="pick-grid">
        {ready.map((p) => (
          <PillCard key={p.id} pillId={p.id} variant="compact" qty={avail(p.id)} onClick={() => { onPick(p.id); onClose(); }} />
        ))}
      </div>
      {ready.length === 0 && <p className="muted center">No pills available. Make some in the Vault Copier.</p>}
      {out.length > 0 && (
        <details className="more">
          <summary>Out of stock ({out.length})</summary>
          <div className="pick-grid">{out.map((p) => <PillCard key={p.id} pillId={p.id} variant="compact" disabled note="None left" onClick={() => {}} />)}</div>
        </details>
      )}
    </Sheet>
  );
}
