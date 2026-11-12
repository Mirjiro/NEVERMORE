import { useEffect, useState } from "react";
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import type { Star } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { sfx } from "../sfx";
import { PillArt } from "./PillArt";
import { RarityTag, TypeChips } from "./common";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveals for Machine results, Copier batches, Mail pulls and level-ups.
 * Familiar pills reveal quickly; new discoveries get the full show; new Legendary/Secret get the most.
 * Tap once to skip to the end, tap again to close.
 */
export function RevealOverlay() {
  const { reveal, setReveal } = useGame();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    if (!reveal) return;
    const isNew = reveal.kind === "machine" && reveal.reveal.isNew;
    const big = reveal.kind === "machine" && isNew && ["legendary", "secret"].includes(reveal.reveal.rarity);
    const fast = reducedMotion() || (reveal.kind === "machine" && !isNew);
    const [t1, t2] = fast ? [120, 380] : big ? [1100, 2000] : [600, 1200];
    if (reveal.kind === "machine") (big ? sfx.epic : isNew ? sfx.reveal : sfx.tap)();
    if (reveal.kind === "level") sfx.upgrade();
    const a = setTimeout(() => setStage(1), t1);
    const b = setTimeout(() => setStage(2), t2);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [reveal]);
  if (!reveal) return null;
  const close = () => setReveal(null);
  const tap = () => (stage < 2 ? setStage(2) : close());

  if (reveal.kind === "level") {
    return (
      <div className="reveal-backdrop" onClick={close}>
        <div className="reveal level-up">
          <div className="reveal-kicker">Your company grew</div>
          <div className="level-num">Level {reveal.level}</div>
          <p className="muted">New upgrades may be waiting at HQ.</p>
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
      <div className={`reveal-backdrop r-${r.rarity} ${big ? "dramatic" : ""} ${r.isNew ? "" : "familiar"}`} onClick={tap}>
        <div className={`reveal machine-reveal stage-${stage} ${r.isNew ? "is-new" : ""}`}>
          {r.isNew && <div className="rays" />}
          <div className="capsule-shell"><div className="shell-top" /><div className="shell-bottom" /></div>
          <div className="reveal-pill"><PillArt pillId={r.pillId} size={r.isNew ? 210 : 170} /></div>
          {stage >= 2 && (
            <div className="reveal-info">
              {r.isNew && <div className="reveal-kicker gold">New Pill!</div>}
              <h2>{def.name}{r.star > 0 && <span className={`pcard-stars s${r.star}`}>{"★".repeat(r.star)}</span>}</h2>
              <div className="reveal-meta"><RarityTag rarity={def.rarity} />{r.isNew && <TypeChips types={def.types} />}</div>
              {r.isNew && <p className="flavor">“{def.flavor}”</p>}
              <button className="btn cream" onClick={(e) => { e.stopPropagation(); close(); }}>{r.isNew ? "Add to collection" : "Got it"}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (reveal.kind === "copier") {
    const def = PILL_BY_ID[reveal.pillId];
    const starred = reveal.stars.filter((s) => s > 0);
    return (
      <div className="reveal-backdrop" onClick={close}>
        <div className="reveal batch-reveal">
          <div className="reveal-kicker">Batch ready</div>
          <div className="batch-row">
            {reveal.stars.slice(0, 22).map((s, i) => (
              <span key={i} className={`batch-pill ${s ? "lucky-one" : ""}`} style={{ animationDelay: `${i * 40}ms` }}><PillArt pillId={def.id} star={s as Star} size={46} /></span>
            ))}
          </div>
          <h2>{reveal.quantity} × {def.name}</h2>
          {starred.length > 0 && <p className="lucky">Lucky! {starred.map((s) => "★".repeat(s)).join(" ")}</p>}
          <button className="btn cream" onClick={close}>Into the Vault</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reveal-backdrop" onClick={() => (stage >= 1 ? close() : setStage(1))}>
      <div className="reveal mail-reveal">
        <div className="reveal-kicker">{reveal.name}</div>
        <div className="mail-results">
          {reveal.results.map((r, i) => {
            const def = PILL_BY_ID[r.pillId];
            return (
              <div key={i} className={`mail-card r-${r.identified ? def.rarity : "unknown"} ${stage >= 1 ? "flipped" : ""}`} style={{ transitionDelay: `${i * 220}ms` }}>
                <div className="mail-card-back">ODD<br />DOSE</div>
                <div className="mail-card-front">
                  <PillArt pillId={r.pillId} unknown={!r.identified} size={92} />
                  <strong>{r.identified ? def.name : "? Pill"}{r.star > 0 && r.identified && <span className={`pcard-stars s${r.star}`}>{"★".repeat(r.star)}</span>}</strong>
                  <span className="muted small">{r.identified ? RARITY_LABEL[def.rarity] : "Unlabeled"}</span>
                  {r.isNew && <span className="new-chip">NEW</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn cream" onClick={close}>Done</button>
      </div>
    </div>
  );
}
