import { useEffect } from "react";
import type { ReactNode } from "react";
import { PILL_BY_ID, RARITY_LABEL, TYPE_COLOR, TYPE_LABEL } from "../../data/pills";
import type { EmotionType, Rarity, Star } from "../../engine/types";

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return <span className={`rarity-tag r-${rarity}`}>{RARITY_LABEL[rarity]}</span>;
}

export function Stars({ star }: { star: Star | number }) {
  if (!star) return null;
  return <span className={`stars s${star}`}>{"★".repeat(star)}</span>;
}

export function TypeChips({ types }: { types: EmotionType[] }) {
  return (
    <span className="type-chips">
      {types.map((t) => (
        <span key={t} className="type-chip" style={{ ["--tc" as string]: TYPE_COLOR[t] }}>{TYPE_LABEL[t]}</span>
      ))}
    </span>
  );
}

export const pillName = (id: string) => PILL_BY_ID[id]?.name ?? "???";

export function Sheet({ open, onClose, children, className, title }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${className ?? ""}`} role="dialog" aria-modal="true">
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function ProgressRing({ value, size = 64, stroke = 5, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Sparkline({ data, width = 120, height = 32, className }: { data: number[]; width?: number; height?: number; className?: string }) {
  if (data.length < 2) return <svg width={width} height={height} className={className} />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} className={`spark ${up ? "up" : "down"} ${className ?? ""}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={`${d} L${width},${height} L0,${height} Z`} className="spark-fill" />
      <path d={d} className="spark-line" fill="none" />
    </svg>
  );
}
