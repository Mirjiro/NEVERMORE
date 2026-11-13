import { useEffect, useState } from "react";
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import type { Star } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { sfx } from "../sfx";
import { PillArt } from "./PillArt";
import { RarityTag, TypeChips } from "./common";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Machine reveal stages:
 *   0 sealed → 1 pill appears → 2 suspense → 3 name → 4 rarity → 5 stars (only if starred) → 6 collect.
 * Familiar pills jump straight to the end. Tap to skip ahead; tap again to close.
 */
const FINAL = 6;

export function RevealOverlay() {
  const { reveal, setReveal } = useGame();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    if (!reveal) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    if (reveal.kind === "machine") {
      const r = reveal.reveal;
      const big = r.isNew && (r.rarity === "legendary" || r.rarity === "secret");
      if (!r.isNew || reducedMotion()) {
        sfx.tap();
        at(80, () => setStage(1));
        at(320, () => { setStage(FINAL); if (r.star) sfx.stars(); });
      } else {
        const k = big ? 1.5 : 1;
        at(300 * k, () => { setStage(1); sfx.close(); });
        at(700 * k, () => { setStage(2); sfx.suspense(); });
        at(1500 * k, () => { setStage(3); (big ? sfx.epic : sfx.reveal)(); });
        at(1950 * k, () => setStage(4));
        if (r.star) at(2450 * k, () => { setStage(5); sfx.stars(); });
        at((r.star ? 2900 : 2350) * k, () => setStage(FINAL));
      }
    } else if (reveal.kind === "copier") {
      sfx.ready();
      at(100, () => setStage(1));
      const lucky = reveal.stars.some((s) => s > 0);
      at(250 + reveal.stars.length * 45, () => { setStage(lucky ? 2 : FINAL); if (lucky) sfx.stars(); });
      if (lucky) at(1500 + reveal.stars.length * 45, () => setStage(FINAL));
    } else if (reveal.kind === "mail") {
      at(500, () => { setStage(1); sfx.paper(); });
      at(1100, () => setStage(2));
      at(1100 + reveal.results.length * 260 + 500, () => setStage(FINAL));
    } else {
      sfx.upgrade();
      setStage(FINAL);
    }
    return () => timers.forEach(clearTimeout);
  }, [reveal]);
  if (!reveal) return null;
  const close = () => setReveal(null);
  const tap = () => (stage < FINAL ? setStage(FINAL) : close());

  if (reveal.kind === "level") {
    return (
      <div className="reveal-backdrop" onClick={close}>
        <div className="reveal level-up">
          <div className="reveal-kicker">Your company grew</div>
          <div className="level-num">Level {reveal.level}</div>
          <p className="muted">New equipment may be waiting at HQ.</p>
          <button className="btn cream" onClick={close}>Nice!</button>
        </div>
      </div>
    );
  }

  if (reveal.kind === "machine") {
    const r = reveal.reveal;
    const def = PILL_BY_ID[r.pillId];
    const big = r.isNew && (r.rarity === "legendary" || r.rarity === "secret");
    return (
      <div className={`reveal-backdrop r-${r.rarity} ${big ? "dramatic" : ""} ${r.isNew ? "is-new" : "familiar"} st-${stage}`} onClick={tap}>
        <div className="reveal machine-reveal">
          {r.isNew && <div className="rays" />}
          {big && <div className="sparks" aria-hidden>{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ ["--a" as string]: `${i * 26}deg` }} />)}</div>}
          <div className="capsule-shell"><div className="shell-top" /><div className="shell-bottom" /></div>
          <div className="reveal-pill"><PillArt pillId={r.pillId} size={r.isNew ? 220 : 170} /></div>
          <div className="reveal-info">
            {r.isNew && <div className={`reveal-kicker gold ${stage >= 3 ? "show" : ""}`}>New Pill!</div>}
            <h2 className={stage >= 3 ? "show" : ""}>{def.name}</h2>
            <div className={`reveal-meta ${stage >= 4 ? "show" : ""}`}><RarityTag rarity={def.rarity} />{r.isNew && <TypeChips types={def.types} />}</div>
            {r.star > 0 && <div className={`reveal-stars s${r.star} ${stage >= 5 ? "show" : ""}`}>{"★".repeat(r.star)}</div>}
            {r.isNew && <p className={`flavor ${stage >= FINAL ? "show" : ""}`}>“{def.flavor}”</p>}
            <button className={`btn cream ${stage >= FINAL ? "show" : ""}`} onClick={(e) => { e.stopPropagation(); close(); }}>Collect</button>
          </div>
        </div>
      </div>
    );
  }

  if (reveal.kind === "copier") {
    const def = PILL_BY_ID[reveal.pillId];
    const starred = reveal.stars.map((s, i) => ({ s, i })).filter((x) => x.s > 0);
    return (
      <div className={`reveal-backdrop st-${stage}`} onClick={tap}>
        <div className="reveal batch-reveal">
          <div className="reveal-kicker">Batch ready</div>
          <div className={`batch-tray n${Math.min(reveal.stars.length, 44)}`}>
            {reveal.stars.map((s, i) => (
              <span key={i} className={`batch-pill ${s ? "lucky-one" : ""}`} style={{ animationDelay: `${i * 45}ms` }}>
                <PillArt pillId={def.id} size={reveal.stars.length > 22 ? 32 : 44} />
                {s > 0 && stage >= 2 && <b className="batch-star">{"★".repeat(s)}</b>}
              </span>
            ))}
          </div>
          <h2>{reveal.quantity} × {def.name}</h2>
          {starred.length > 0 && stage >= 2 && (
            <div className="lucky-spot">
              <PillArt pillId={def.id} star={Math.max(...starred.map((x) => x.s)) as Star} size={90} />
              <span>Lucky copy! {starred.map((x) => "★".repeat(x.s)).join(" ")}</span>
            </div>
          )}
          <button className={`btn cream ${stage >= FINAL ? "show" : ""}`} onClick={(e) => { e.stopPropagation(); close(); }}>Into the Vault</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`reveal-backdrop st-${stage}`} onClick={tap}>
      <div className="reveal mail-reveal">
        <div className="reveal-kicker">{reveal.name}</div>
        <div className="crate"><div className="crate-lid" /><div className="crate-box" /></div>
        <div className="mail-results">
          {reveal.results.map((r, i) => {
            const def = PILL_BY_ID[r.pillId];
            return (
              <div key={i} className={`mail-card r-${r.identified ? def.rarity : "unknown"} ${stage >= 2 ? "flipped" : ""}`} style={{ transitionDelay: `${i * 260}ms` }}>
                <div className="mail-card-back"><span className="wax-mini" /></div>
                <div className="mail-card-front">
                  <PillArt pillId={r.pillId} unknown={!r.identified} size={88} />
                  <strong>{r.identified ? def.name : "? Pill"}{r.star > 0 && r.identified && <span className={`pcard-stars s${r.star}`}>{"★".repeat(r.star)}</span>}</strong>
                  <span className="muted small">{r.identified ? RARITY_LABEL[def.rarity] : "Unlabeled"}</span>
                  {r.isNew && <span className="new-chip">NEW</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button className={`btn cream ${stage >= FINAL ? "show" : ""}`} onClick={(e) => { e.stopPropagation(); close(); }}>Done</button>
      </div>
    </div>
  );
}
