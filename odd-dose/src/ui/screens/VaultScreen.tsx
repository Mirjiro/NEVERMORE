import { useState } from "react";
import { PILLS, PILL_BY_ID } from "../../data/pills";
import {
  collectCopy, copierMaxBatch, copierQuote, countAvailable, isKnown, ownedCounts, speedUpCopy, speedUpCost, startCopy,
} from "../../engine/game";
import { RARITIES } from "../../engine/types";
import type { Rarity, Star } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import type { Tab } from "../App";
import { PillArt } from "../components/PillArt";
import { ProgressRing, RarityTag, Sheet, Stars, TypeChips, formatDuration, money, pillName } from "../components/common";

type Filter = "all" | "owned" | Rarity;

export function VaultScreen({ goto }: { goto: (t: Tab) => void }) {
  const { state } = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const known = new Set(state.known);
  const unknownSpecimens = state.specimens.filter((x) => !x.identified);
  const list = PILLS.filter((p) => {
    if (filter === "all") return true;
    if (filter === "owned") return known.has(p.id) && ownedCounts(state, p.id).total > 0;
    return known.has(p.id) && p.rarity === filter;
  });

  return (
    <div className="vault">
      <div className="screen-head">
        <h1>Vault</h1>
        <p className="muted">{known.size} / {PILLS.length} Known ✓ · {state.specimens.filter((x) => x.identified).length} pills stored</p>
      </div>

      <CopierPanel onPick={() => setFilter("owned")} />

      {unknownSpecimens.length > 0 && (
        <button className="unknown-banner" onClick={() => goto("lab")}>
          <div className="unk-pills">{unknownSpecimens.slice(0, 4).map((x) => <PillArt key={x.id} pillId={x.pillId} unknown size={40} />)}</div>
          <div><strong>{unknownSpecimens.length} unidentified ? specimen{unknownSpecimens.length > 1 ? "s" : ""}</strong><br /><span className="muted small">Take them to the Lab Scanner →</span></div>
        </button>
      )}

      <div className="chips-row">
        {(["all", "owned", ...RARITIES] as Filter[]).map((f) => (
          <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      <div className="vault-grid">
        {list.map((p) => {
          const isK = known.has(p.id);
          const idx = PILLS.indexOf(p) + 1;
          if (!isK) {
            return (
              <div key={p.id} className="vault-card unknown" aria-label="Undiscovered pill">
                <span className="no mono">#{String(idx).padStart(2, "0")}</span>
                <PillArt pillId={p.id} silhouette size={84} />
                <strong>???</strong>
                <span className="muted small">Undiscovered</span>
              </div>
            );
          }
          const c = ownedCounts(state, p.id);
          const best = state.discovery[p.id]?.bestStar ?? 0;
          return (
            <button key={p.id} className={`vault-card r-${p.rarity} ${c.total === 0 ? "empty" : ""}`} onClick={() => setOpen(p.id)}>
              <span className="no mono">#{String(idx).padStart(2, "0")}</span>
              {best > 0 && <span className="best-star"><Stars star={best} /></span>}
              <PillArt pillId={p.id} size={84} />
              <strong>{p.name}</strong>
              <RarityTag rarity={p.rarity} />
              <span className="qty mono">×{c.total}{c.reserved ? <em> ({c.reserved} in use)</em> : null}</span>
            </button>
          );
        })}
      </div>
      {list.length === 0 && <p className="muted center">Nothing here yet.</p>}

      <PillDetail pillId={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function CopierPanel({ onPick }: { onPick: () => void }) {
  const { state, now, act, setReveal } = useGame();
  const job = state.copier;
  const ready = job && job.endsAt <= now;
  const collect = () => {
    const r = act((s, t) => collectCopy(s, t));
    if (r) setReveal({ kind: "copier", pillId: r.pillId, quantity: r.quantity, stars: r.stars });
  };
  return (
    <section className={`copier ${job ? (ready ? "ready" : "working") : "idle"}`}>
      <div className="copier-machine">
        <div className="copier-slot">{job ? <PillArt pillId={job.pillId} size={58} /> : <span className="muted small">empty</span>}</div>
        <div className="copier-belt"><i /><i /><i /><i /><i /></div>
      </div>
      <div className="copier-info">
        <div className="copier-title"><h2>Copier</h2><span className="muted small">Batch max {copierMaxBatch(state)}</span></div>
        {!job && <p className="muted small">Open any Known pill below to copy it in batches. Runs alongside the Lab.</p>}
        {!job && <button className="btn ghost small" onClick={onPick}>Show owned pills</button>}
        {job && !ready && (
          <div className="copier-run">
            <ProgressRing value={(now - job.startedAt) / (job.endsAt - job.startedAt)} size={52}><span className="mono small">{job.quantity}</span></ProgressRing>
            <div>
              <div>Copying {job.quantity} × <strong>{pillName(job.pillId)}</strong></div>
              <div className="muted small">{formatDuration(job.endsAt - now)} left</div>
            </div>
            <button className="btn ghost small" disabled={state.cash < speedUpCost(job.endsAt, now)} onClick={() => act((s, t) => speedUpCopy(s, t))}>
              Finish · {money(speedUpCost(job.endsAt, now))}
            </button>
          </div>
        )}
        {job && ready && (
          <div className="copier-run">
            <div><strong>{job.quantity} × {pillName(job.pillId)}</strong> ready.</div>
            <button className="btn primary pulse" onClick={collect}>COLLECT</button>
          </div>
        )}
      </div>
    </section>
  );
}

function PillDetail({ pillId, onClose }: { pillId: string | null; onClose: () => void }) {
  const { state, now, act, toast } = useGame();
  const max = copierMaxBatch(state);
  const [qty, setQty] = useState(11);
  if (!pillId) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const p = PILL_BY_ID[pillId];
  const c = ownedCounts(state, pillId);
  const d = state.discovery[pillId];
  const q = Math.max(1, Math.min(qty, max));
  const quote = copierQuote(state, pillId, q);
  const busy = !!state.copier;
  const copy = () => {
    const r = act((s, t, rng) => startCopy(s, pillId, q, t, rng));
    if (r) { toast(`Copier started: ${q} × ${p.name}`, "good"); onClose(); }
  };

  return (
    <Sheet open onClose={onClose} title={p.name} className={`detail r-${p.rarity}`}>
      <div className="detail-hero">
        <PillArt pillId={pillId} size={190} star={d?.bestStar as Star} />
        <div className="detail-meta">
          <RarityTag rarity={p.rarity} />
          <TypeChips types={p.types} />
          <p className="flavor">“{p.flavor}”</p>
        </div>
      </div>
      <dl className="facts">
        <div><dt>Owned</dt><dd>{c.total}</dd></div>
        <div><dt>Available</dt><dd>{countAvailable(state, pillId)}</dd></div>
        <div><dt>Base · ★ · ★★</dt><dd className="mono">{c.byStar[0]} · {c.byStar[1]} · {c.byStar[2]}</dd></div>
        <div><dt>Best ever</dt><dd>{d?.bestStar ? <Stars star={d.bestStar} /> : "Base"}</dd></div>
        <div className="wide"><dt>Recipe</dt><dd>{p.parents ? `${isKnown(state, p.parents[0]) ? pillName(p.parents[0]) : "???"} + ${isKnown(state, p.parents[1]) ? pillName(p.parents[1]) : "???"}` : "Base Type — a fundamental emotion"}</dd></div>
        <div className="wide"><dt>Discovered</dt><dd>{d ? `${d.how} · ${new Date(d.at).toLocaleDateString()}` : "—"}</dd></div>
      </dl>

      <section className="copy-box">
        <h3>Manufacture with the Copier</h3>
        {busy ? (
          <p className="muted">The Copier is busy ({formatDuration(state.copier!.endsAt - now)} left).</p>
        ) : (
          <>
            <div className="qty-row">
              <button className="btn ghost" onClick={() => setQty(Math.max(1, q - 1))}>−</button>
              <input type="range" min={1} max={max} value={q} onChange={(e) => setQty(Number(e.target.value))} aria-label="Batch quantity" />
              <button className="btn ghost" onClick={() => setQty(Math.min(max, q + 1))}>+</button>
              <span className="qty-val mono">×{q}</span>
            </div>
            <div className="quote">
              <span>Cost <strong>{money(quote.cost)}</strong></span>
              <span>Time <strong>{formatDuration(quote.ms)}</strong></span>
              <span>Charge <strong>0</strong></span>
            </div>
            <button className="btn primary big" disabled={state.cash < quote.cost} onClick={copy}>COPY {q}</button>
            <p className="muted small">Every copy rolls its own star chance.</p>
          </>
        )}
      </section>
    </Sheet>
  );
}
