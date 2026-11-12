/**
 * Reusable collectible pill card (Vault, Copier, Machine picker, Notebook).
 * Stars appear ONLY when the specimen actually has them — Base pills show no star UI at all.
 */
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import type { Star } from "../../engine/types";
import { PillArt } from "./PillArt";

interface Props {
  pillId: string;
  star?: Star;
  qty?: number;
  /** "card" = Vault collectible, "compact" = pickers, "mini" = Notebook tiles. */
  variant?: "card" | "compact" | "mini";
  selected?: boolean;
  disabled?: boolean;
  /** Undiscovered (anonymous) slot. */
  hidden?: boolean;
  /** Unidentified "?" specimen. */
  unknown?: boolean;
  note?: string;
  onClick?: () => void;
}

export function PillCard({ pillId, star = 0, qty, variant = "card", selected, disabled, hidden, unknown, note, onClick }: Props) {
  const def = PILL_BY_ID[pillId];
  const name = hidden ? "???" : unknown ? "? Specimen" : def.name;
  const rarity = hidden || unknown ? null : def.rarity;
  const size = variant === "card" ? 108 : variant === "compact" ? 72 : 52;
  const cls = [
    "pcard", `pcard-${variant}`,
    rarity ? `r-${rarity}` : "r-none",
    star > 0 && !hidden ? `star-${star}` : "",
    selected ? "selected" : "",
    disabled ? "disabled" : "",
    hidden ? "hidden" : "",
    unknown ? "unknown" : "",
  ].join(" ");
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={cls} onClick={onClick} disabled={onClick ? disabled : undefined} aria-label={hidden ? "Undiscovered pill" : `${name}${star ? " " + "★".repeat(star) : ""}${qty ? `, ${qty} owned` : ""}`}>
      {qty !== undefined && qty > 1 && <span className="pcard-qty">×{qty}</span>}
      <span className="pcard-art"><PillArt pillId={pillId} silhouette={hidden} unknown={unknown} size={size} /></span>
      <span className="pcard-name">
        {name}
        {star > 0 && !hidden && <span className={`pcard-stars s${star}`}>{"★".repeat(star)}</span>}
      </span>
      {rarity && variant !== "mini" && <span className={`pcard-rarity r-${rarity}`}>{RARITY_LABEL[rarity]}</span>}
      {note && <span className="pcard-note">{note}</span>}
    </Tag>
  );
}
