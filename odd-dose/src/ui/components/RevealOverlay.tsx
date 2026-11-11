import { useEffect, useState } from "react";
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import type { Star } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { PillArt } from "./PillArt";
import { RarityTag, Stars, TypeChips } from "./common";

const RULE_TEXT: Record<string, string> = {
  recipe: "Registered recipe",
  identical: "Identical parents — a perfect copy",
  shared: "Shared Type — one parent reproduced",
};

/** Full-screen reveal for Machine results, Copier batches, Mail pulls and level-ups. */
export function RevealOverlay() {
  const { reveal, setReveal } = useGame();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    if (!reveal) return;
    const t1 = setTimeout(() => setStage(1), 650);
    const t2 = setTimeout(() => setStage(2), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reveal]);
  if (!reveal) return null;
  const close = () => setReveal(null);

  if (reveal.kind === "level") {
    return (
      <div className="reveal-backdrop" onClick={close}>
        <div className="reveal level-up">
          <div className="reveal-kicker">Company milestone</div>
          <div className="level-num">Level {reveal.level}</div>
          <p>Your company has grown. New upgrades may be available at HQ.</p>
          <button className="btn primary" onClick={close}>Continue</button>
        </div>
      </div>
    );
  }

  if (reveal.kind === "machine") {
    const r = reveal.reveal;
    const def = PILL_BY_ID[r.pillId];
    const drama = r.isNew && (r.rarity === "legendary" || r.rarity === "secret");
    return (
      <div className={`reveal-backdrop r-${r.rarity} ${drama ? "dramatic" : ""}`} onClick={() => stage >= 2 && close()}>
        <div className={`reveal machine-reveal stage-${stage} ${r.isNew ? "is-new" : ""}`}>
          <div className="rays" />
          <div className="capsule-shell">
            <div className="shell-top" />
            <div className="shell-bottom" />
          </div>
          <div className="reveal-pill"><PillArt pillId={r.pillId} star={r.star as Star} size={200} /></div>
          {stage >= 2 && (
            <div className="reveal-info">
              {r.isNew && <div className="stamp new-stamp">New discovery</div>}
              <h2>{def.name} <Stars star={r.star} /></h2>
              <div className="reveal-meta"><RarityTag rarity={def.rarity} /><TypeChips types={def.types} /></div>
              <p className="flavor">“{def.flavor}”</p>
              <p className="rule">{RULE_TEXT[r.rule]}</p>
              <button className="btn primary" onClick={close}>Add to Vault</button>
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
          <div className="reveal-kicker">Copier batch complete</div>
          <div className="batch-row">
            {reveal.stars.slice(0, 22).map((s, i) => (
              <span key={i} className="batch-pill" style={{ animationDelay: `${i * 45}ms` }}><PillArt pillId={def.id} star={s as Star} size={46} /></span>
            ))}
          </div>
          <h2>{reveal.quantity} × {def.name}</h2>
          {starred.length > 0 ? <p className="lucky">Lucky batch: {starred.map((s) => "★".repeat(s)).join(" ")} star variant{starred.length > 1 ? "s" : ""}!</p> : <p className="muted">All Base quality.</p>}
          <button className="btn primary" onClick={close}>Store in Vault</button>
        </div>
      </div>
    );
  }

  // mail
  return (
    <div className="reveal-backdrop" onClick={() => stage >= 1 && close()}>
      <div className="reveal mail-reveal">
        <div className="reveal-kicker">{reveal.name}</div>
        <div className="mail-results">
          {reveal.results.map((r, i) => {
            const def = PILL_BY_ID[r.pillId];
            return (
              <div key={i} className={`mail-card r-${r.identified ? def.rarity : "unknown"} ${stage >= 1 ? "flipped" : ""}`} style={{ transitionDelay: `${i * 220}ms` }}>
                <div className="mail-card-back">ODD<br />DOSE</div>
                <div className="mail-card-front">
                  <PillArt pillId={r.pillId} unknown={!r.identified} star={r.star as Star} size={92} />
                  <strong>{r.identified ? def.name : "? Specimen"}</strong>
                  <span className="muted small">{r.identified ? RARITY_LABEL[def.rarity] : "Unidentified"}</span>
                  {r.isNew && <span className="new-chip">NEW ✓</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn primary" onClick={close}>Done</button>
      </div>
    </div>
  );
}
