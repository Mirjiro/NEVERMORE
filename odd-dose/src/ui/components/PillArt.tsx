/**
 * Temporary procedural pill art: a thick, matte, pressed tablet at a 3/4 elevated angle with an engraved face.
 * Final art: drop PNGs into public/pills/<id>.png and register them in src/data/pillArt.ts — they replace this automatically.
 */
import { useId } from "react";
import type { ReactElement } from "react";
import { PILL_ART } from "../../data/pillArt";
import { PILL_BY_ID } from "../../data/pills";
import type { PillDef, PillFace, Star } from "../../engine/types";

interface Props {
  pillId?: string;
  /** Show as an anonymous undiscovered slot. */
  silhouette?: boolean;
  /** Show as an unidentified "?" specimen. */
  unknown?: boolean;
  star?: Star;
  size?: number;
  className?: string;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

/** Face primitives drawn in a local 2D space (center 0,0), later squashed into the 3/4 top face. */
function faceShapes(face: PillFace | "question"): { d: string; fill?: boolean }[] {
  if (face === "question") return [{ d: "M-8,-6 Q-8,-16 0,-16 Q9,-16 9,-8 Q9,-2 1,1 L1,7" }, { d: "M1,14 m-2.2,0 a2.2,2.2 0 1,0 4.4,0 a2.2,2.2 0 1,0 -4.4,0", fill: true }];
  const out: { d: string; fill?: boolean }[] = [];
  const both = (fn: (x: number, m: 1 | -1) => string, fill?: boolean) => {
    out.push({ d: fn(-12, -1), fill });
    out.push({ d: fn(12, 1), fill });
  };
  const dot = (x: number, y: number, r: number) => `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
  switch (face.eyes) {
    case "dot": case "sad": case "angry": both((x) => dot(x, -5, 3), true); break;
    case "happy": both((x) => `M${x - 5},-3 Q${x},-11 ${x + 5},-3`); break;
    case "closed": both((x) => `M${x - 5},-6 Q${x},0 ${x + 5},-6`); break;
    case "wide": both((x) => dot(x, -5, 5)); out.push({ d: dot(-12, -5, 1.6), fill: true }, { d: dot(12, -5, 1.6), fill: true }); break;
    case "star": both((x) => `M${x},-11 L${x + 1.8},-6.5 L${x + 6},-6 L${x + 2.8},-3 L${x + 3.8},1.5 L${x},-1 L${x - 3.8},1.5 L${x - 2.8},-3 L${x - 6},-6 L${x - 1.8},-6.5 Z`, true); break;
    case "spiral": both((x) => `M${x},-5 m0,0 q2,0 2,2 q0,3 -3,3 q-4,0 -4,-4 q0,-5 5,-5 q6,0 6,6`); break;
    case "x": both((x) => `M${x - 4},-9 L${x + 4},-1 M${x + 4},-9 L${x - 4},-1`); break;
    case "heart": both((x) => `M${x},0 C${x - 8},-5 ${x - 6},-12 ${x},-8 C${x + 6},-12 ${x + 8},-5 ${x},0 Z`, true); break;
    case "void": both((x) => `M${x - 5},-5 a5,6.5 0 1,0 10,0 a5,6.5 0 1,0 -10,0`, true); break;
    case "line": both((x) => `M${x - 5},-5 L${x + 5},-5`); break;
    case "wink": out.push({ d: dot(-12, -5, 3), fill: true }, { d: "M7,-6 Q12,0 17,-6" }); break;
  }
  switch (face.brows) {
    case "angry": both((x, m) => `M${x - 6 * m},-11 L${x + 5 * m},-16`); break;
    case "worried": both((x, m) => `M${x - 6 * m},-16 L${x + 5 * m},-11`); break;
    case "raised": both((x) => `M${x - 6},-14 Q${x},-19 ${x + 6},-14`); break;
  }
  switch (face.mouth) {
    case "smile": out.push({ d: "M-12,7 Q0,19 12,7" }); break;
    case "frown": out.push({ d: "M-11,15 Q0,5 11,15" }); break;
    case "flat": out.push({ d: "M-9,11 L9,11" }); break;
    case "open": out.push({ d: "M-7,11 a7,5 0 1,0 14,0 a7,5 0 1,0 -14,0", fill: true }); break;
    case "grin": out.push({ d: "M-13,6 Q0,23 13,6 Z", fill: true }); break;
    case "o": out.push({ d: "M-4,12 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0" }); break;
    case "zigzag": out.push({ d: "M-12,13 l4,-4 l4,4 l4,-4 l4,4 l4,-4" }); break;
    case "wave": out.push({ d: "M-12,12 q3,-4 6,0 t6,0 t6,0 t6,0" }); break;
    case "smirk": out.push({ d: "M-10,12 Q2,16 11,6" }); break;
    case "teeth": out.push({ d: "M-11,7 h22 v8 q0,2 -2,2 h-18 q-2,0 -2,-2 Z M-5,7 v10 M0,7 v10 M5,7 v10" }); break;
    case "none": break;
  }
  return out;
}

export function PillArt({ pillId, silhouette, unknown, star = 0, size = 96, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const def: PillDef | undefined = pillId ? PILL_BY_ID[pillId] : undefined;
  const art = def && !silhouette && !unknown ? PILL_ART[def.id] : undefined;
  if (art) {
    return <img src={art} width={size} height={size * 0.83} alt={def!.name} className={`pill-art ${className ?? ""}`} draggable={false} />;
  }

  const rarity = silhouette || unknown || !def ? "common" : def.rarity;
  const base = silhouette ? "#CFC9BE" : unknown ? "#B8B3AA" : def!.color;
  const accent = silhouette ? "#BDB6A9" : unknown ? "#9D978C" : def!.color2;
  const top = base;
  const side = rarity === "common" ? shade(base, -0.22) : shade(accent, -0.12);
  const engraveDark = shade(base, -0.42);
  const engraveLight = shade(base, 0.45);
  const shapes = silhouette ? [] : faceShapes(unknown || !def ? "question" : def.face);
  const dark = rarity === "secret" || (def && ["void", "oblivion", "ruthless", "evil", "possessed"].includes(def.id));

  const engraved = (dy: number, color: string, op: number): ReactElement => (
    <g transform={`translate(60 ${43 + dy}) scale(1 0.6)`} opacity={op}>
      {shapes.map((sh, i) => (
        <path key={i} d={sh.d} fill={sh.fill ? color : "none"} stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );

  return (
    <svg
      viewBox="0 0 120 100"
      width={size}
      height={size * 0.83}
      className={`pill-art ${silhouette ? "is-silhouette" : ""} ${className ?? ""}`}
      role="img"
      aria-label={silhouette ? "Undiscovered pill" : unknown ? "Unidentified specimen" : def?.name}
    >
      <defs>
        <radialGradient id={`top${uid}`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor={shade(top, 0.28)} />
          <stop offset="60%" stopColor={top} />
          <stop offset="100%" stopColor={shade(top, -0.12)} />
        </radialGradient>
        <linearGradient id={`side${uid}`} x1="0" x2="1">
          <stop offset="0%" stopColor={shade(side, -0.25)} />
          <stop offset="35%" stopColor={side} />
          <stop offset="70%" stopColor={shade(side, 0.12)} />
          <stop offset="100%" stopColor={shade(side, -0.3)} />
        </linearGradient>
        <linearGradient id={`coat${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(accent, 0.35)} stopOpacity="0.0" />
          <stop offset="55%" stopColor={shade(accent, 0.2)} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`iri${uid}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#8C7CF0" />
          <stop offset="50%" stopColor="#5FD4C4" />
          <stop offset="100%" stopColor="#F08CC8" />
        </linearGradient>
        <filter id={`grain${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.15" result="speck" />
          <feComposite in="speck" in2="SourceAlpha" operator="in" />
        </filter>
        <clipPath id={`clip${uid}`}>
          <ellipse cx="60" cy="43" rx="47" ry="29" />
          <rect x="13" y="43" width="94" height="14" />
          <ellipse cx="60" cy="57" rx="47" ry="29" />
        </clipPath>
      </defs>

      {/* contact shadow */}
      {!silhouette && <ellipse cx="62" cy="66" rx="46" ry="20" fill="#000" opacity="0.16" style={{ filter: "blur(3px)" }} />}

      {/* body: side band then top face */}
      <ellipse cx="60" cy="57" rx="47" ry="29" fill={`url(#side${uid})`} />
      <rect x="13" y="43" width="94" height="14" fill={`url(#side${uid})`} />
      <ellipse cx="60" cy="43" rx="47" ry="29" fill={`url(#top${uid})`} />

      {/* rarity details */}
      {!silhouette && !unknown && rarity === "rare" && (
        <path d="M18,43 L102,43" stroke={engraveDark} strokeWidth="1.6" opacity="0.35" transform="rotate(-12 60 43)" />
      )}
      {!silhouette && !unknown && rarity !== "common" && rarity !== "rare" && (
        <ellipse cx="60" cy="43" rx="47" ry="29" fill={`url(#coat${uid})`} />
      )}
      {!silhouette && !unknown && (rarity === "epic" || rarity === "legendary" || rarity === "secret") && (
        <ellipse cx="60" cy="43" rx="40" ry="24" fill="none" stroke={rarity === "epic" ? engraveDark : accent} strokeWidth={rarity === "epic" ? 1.2 : 2.2} opacity={rarity === "epic" ? 0.3 : 0.85} />
      )}
      {!silhouette && !unknown && rarity === "legendary" && (
        <ellipse cx="60" cy="43" rx="46" ry="28.2" fill="none" stroke={shade(accent, 0.35)} strokeWidth="2" opacity="0.9" />
      )}
      {!silhouette && !unknown && rarity === "secret" && (
        <>
          <ellipse cx="60" cy="43" rx="46.5" ry="28.5" fill="none" stroke={`url(#iri${uid})`} strokeWidth="2.4" />
          <rect x="13" y="50" width="94" height="2" fill={`url(#iri${uid})`} opacity="0.7" />
        </>
      )}

      {/* engraving: light lip below, dark recess on top */}
      {shapes.length > 0 && engraved(1.1, engraveLight, dark ? 0.35 : 0.8)}
      {shapes.length > 0 && engraved(0, dark ? shade(accent, 0.1) : engraveDark, dark ? 0.85 : 0.75)}

      {/* compressed-powder grain */}
      <g clipPath={`url(#clip${uid})`} opacity={silhouette ? 0.25 : 0.55} style={{ mixBlendMode: "multiply" }}>
        <rect x="0" y="0" width="120" height="100" fill="#000" filter={`url(#grain${uid})`} opacity="0.35" />
      </g>

      {/* soft top highlight (matte, not glossy) */}
      {!silhouette && <ellipse cx="44" cy="30" rx="20" ry="8" fill="#fff" opacity={dark ? 0.1 : 0.16} />}

      {star > 0 && !silhouette && (
        <g transform="translate(96 14)">
          <circle r="11" fill={star === 2 ? "#1E1C19" : "#FBF8F1"} stroke="#B8893A" strokeWidth="1.5" />
          <text textAnchor="middle" y="4" fontSize={star === 2 ? 9 : 11} fill="#B8893A" fontWeight="700">{"★".repeat(star)}</text>
        </g>
      )}
    </svg>
  );
}
