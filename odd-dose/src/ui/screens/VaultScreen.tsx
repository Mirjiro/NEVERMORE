import { useMemo, useState } from "react";
import { PILLS, PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import {
  backdoorUnlocked, collectCopy, marketPrice, copierMaxBatch, copierQuote, countExact, isKnown, sellPill, sellPrice, speedUpCopy, speedUpCost,
  startCopy, vaultStacks,
} from "../../engine/game";
import { RARITIES } from "../../engine/types";
import type { Rarity, Star } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import type { Tab } from "../App";
import { PillArt } from "../components/PillArt";
import { PillCard } from "../components/PillCard";
import { RarityTag, Sheet, TypeChips, formatDuration, money, pillName } from "../components/common";
import { sfx } from "../sfx";

type Filter = "all" | "starred" | Rarity;

export function VaultScreen({ goto, useInMachine }: { goto: (t: Tab) => void; useInMachine: (pillId: string) => void }) {
  const { state } = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<{ pillId: string; star: Star } | null>(null);
  const [copier, setCopier] = useState<string | null | "pick">(null);
  const stacks = useMemo(() => vaultStacks(state), [state]);
  const unknowns = state.specimens.filter((x) => !x.identified);
  const total = stacks.reduce((a, s) => a + s.count, 0);
  const rarities = RARITIES.filter((r) => stacks.some((s) => PILL_BY_ID[s.pillId].rarity === r));
  const shown = stacks.filter((s) => filter === "all" || (filter === "starred" ? s.star > 0 : PILL_BY_ID[s.pillId].rarity === filter));

  return (
    <div className="vault">
      <div className="screen-head">
        <h1>Vault</h1>
        <p className="muted">{total} pill{total === 1 ? "" : "s"} in storage</p>
      </div>

      <CopierBench onMake={() => setCopier("pick")} />

      {(rarities.length > 1 || stacks.some((s) => s.star > 0)) && (
        <div className="chips-row">
          <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All</button>
          {stacks.some((s) => s.star > 0) && <button className={`chip star-chip ${filter === "starred" ? "on" : ""}`} onClick={() => setFilter("starred")}>★ Starred</button>}
          {rarities.map((r) => <button key={r} className={`chip ${filter === r ? "on" : ""}`} onClick={() => setFilter(r)}>{RARITY_LABEL[r]}</button>)}
        </div>
      )}

      <div className="shelf-grid">
        {shown.map((s, i) => (
          <div key={`${s.pillId}|${s.star}`} className="shelf-slot" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
            <PillCard pillId={s.pillId} star={s.star} qty={s.count} onClick={() => { sfx.tap(); setOpen({ pillId: s.pillId, star: s.star }); }}
              note={s.reserved ? (s.reserved === s.count ? "In Machine" : `${s.reserved} in Machine`) : undefined} />
          </div>
        ))}
        {filter === "all" && unknowns.length > 0 && (
          <div className="shelf-slot">
            <PillCard pillId={unknowns[0].pillId} unknown qty={unknowns.length} note="Scan in Lab" onClick={() => goto("lab")} />
          </div>
        )}
      </div>
      {stacks.length === 0 && unknowns.length === 0 && (
        <div className="empty-vault">
          <PillArt pillId="calm" silhouette size={90} />
          <p>Your Vault is empty.</p>
          <span className="muted small">Make pills with the Copier or the Lab Machine.</span>
        </div>
      )}

      {open && (
        <PillDetail pillId={open.pillId} star={open.star} onClose={() => setOpen(null)}
          onMachine={() => { setOpen(null); useInMachine(open.pillId); }}
          onCopy={() => { setOpen(null); setCopier(open.pillId); }} />
      )}
      <CopierSheet target={copier} onClose={() => setCopier(null)} onPick={(id) => setCopier(id)} />
    </div>
  );
}

function CopierBench({ onMake }: { onMake: () => void }) {
  const { state, now, act, setReveal } = useGame();
  const job = state.copier;
  const ready = !!job && job.endsAt <= now;
  const progress = job ? Math.min(1, (now - job.startedAt) / (job.endsAt - job.startedAt)) : 0;
  const collect = () => {
    const r = act((s, t) => collectCopy(s, t));
    if (r) { sfx.ready(); setReveal({ kind: "copier", pillId: r.pillId, quantity: r.quantity, stars: r.stars }); }
  };
  return (
    <section className={`bench ${job ? (ready ? "ready" : "working") : "idle"}`}>
      <div className="bench-machine" aria-hidden>
        <div className="bench-hopper">{job && <PillArt pillId={job.pillId} size={50} />}</div>
        <div className="bench-belt"><span style={{ width: `${progress * 100}%` }} /></div>
        <div className="bench-tray">{job && Array.from({ length: Math.min(6, Math.ceil(progress * 6)) }).map((_, i) => <PillArt key={i} pillId={job.pillId} size={22} />)}</div>
      </div>
      <div className="bench-info">
        <h2>Copier</h2>
        {!job && <><p className="muted small">Copy any pill you've discovered.</p><button className="btn gold" onClick={onMake}>Make pills</button></>}
        {job && !ready && (
          <>
            <p><strong>{job.quantity} × {pillName(job.pillId)}</strong></p>
            <p className="timer mono">{formatDuration(job.endsAt - now)}</p>
            <button className="btn ghost-dark small" disabled={state.cash < speedUpCost(job.endsAt, now)} onClick={() => act((s, t) => speedUpCopy(s, t))}>
              Finish now · {money(speedUpCost(job.endsAt, now))}
            </button>
          </>
        )}
        {job && ready && (
          <>
            <p><strong>Ready!</strong> {job.quantity} × {pillName(job.pillId)}</p>
            <button className="btn gold pulse" onClick={collect}>Collect</button>
          </>
        )}
      </div>
    </section>
  );
}

function PillDetail({ pillId, star, onClose, onMachine, onCopy }: { pillId: string; star: Star; onClose: () => void; onMachine: () => void; onCopy: () => void }) {
  const { state, act, toast } = useGame();
  const p = PILL_BY_ID[pillId];
  const stack = vaultStacks(state).find((s) => s.pillId === pillId && s.star === star);
  const count = stack?.count ?? 0;
  const available = countExact(state, pillId, star);
  const d = state.discovery[pillId];
  const canSell = backdoorUnlocked(state) && available > 0;
  const price = sellPrice(state, pillId, star);
  const allVariants = state.specimens.filter((x) => x.pillId === pillId && x.identified).length;

  return (
    <Sheet open onClose={onClose} title="" className={`detail r-${p.rarity} ${star ? `star-${star}` : ""}`}>
      <div className="detail-stage">
        <div className="detail-glow" />
        <PillArt pillId={pillId} size={220} />
      </div>
      <div className="detail-title">
        <h2>{p.name}{star > 0 && <span className={`pcard-stars s${star}`}>{"★".repeat(star)}</span>}</h2>
        <div className="detail-tags"><RarityTag rarity={p.rarity} /><TypeChips types={p.types} /></div>
        <p className="own">You own <strong>×{count}</strong>{stack?.reserved ? <span className="muted"> · {stack.reserved} in Machine</span> : null}</p>
        <p className="flavor">“{p.flavor}”</p>
      </div>

      <div className="detail-actions">
        <button className="btn primary" disabled={available < 1} onClick={onMachine}>Use in Machine</button>
        <button className="btn ghost" onClick={onCopy}>Make more</button>
        {backdoorUnlocked(state) && (
          <button className="btn ghost" disabled={!canSell} onClick={() => { const r = act((s, t) => sellPill(s, pillId, star, t)); if (r) { sfx.coin(); toast(`Sold for ${money(r.price)}`, "good"); if (count <= 1) onClose(); } }}>
            Sell 1 · {money(price)}
          </button>
        )}
      </div>

      {p.parents && (
        <div className="recipe-strip">
          <span className="muted small">Recipe</span>
          <span className="recipe-pair">
            {isKnown(state, p.parents[0]) ? <PillArt pillId={p.parents[0]} size={34} /> : <PillArt pillId={p.parents[0]} silhouette size={34} />}
            <b>{isKnown(state, p.parents[0]) ? pillName(p.parents[0]) : "???"}</b>
            <span className="muted">+</span>
            {isKnown(state, p.parents[1]) ? <PillArt pillId={p.parents[1]} size={34} /> : <PillArt pillId={p.parents[1]} silhouette size={34} />}
            <b>{isKnown(state, p.parents[1]) ? pillName(p.parents[1]) : "???"}</b>
          </span>
        </div>
      )}

      <details className="more">
        <summary>Details</summary>
        <dl>
          {d && <><dt>Discovered</dt><dd>{new Date(d.at).toLocaleDateString()} · {d.how}</dd></>}
          {d && d.bestStar > 0 && <><dt>Best ever</dt><dd className="stars">{"★".repeat(d.bestStar)}</dd></>}
          <dt>All copies</dt><dd>{allVariants}</dd>
          <dt>Market value</dt><dd>{money(marketPrice(state, pillId, star))}</dd>
        </dl>
      </details>
    </Sheet>
  );
}

function CopierSheet({ target, onClose, onPick }: { target: string | null | "pick"; onClose: () => void; onPick: (id: string) => void }) {
  const { state, now, act, toast } = useGame();
  const max = copierMaxBatch(state);
  const [qty, setQty] = useState(11);
  if (target === null) return null;
  const busy = state.copier;

  if (target === "pick") {
    const known = PILLS.filter((p) => isKnown(state, p.id));
    return (
      <Sheet open onClose={onClose} title="What should we make?" className="copier-sheet">
        <div className="pick-grid">
          {known.map((p) => <PillCard key={p.id} pillId={p.id} variant="compact" note={money(copierQuote(state, p.id, 1).cost) + " each"} onClick={() => { sfx.tap(); onPick(p.id); }} />)}
        </div>
      </Sheet>
    );
  }

  const p = PILL_BY_ID[target];
  const q = Math.max(1, Math.min(qty, max));
  const quote = copierQuote(state, target, q);
  const make = () => {
    const r = act((s, t, rng) => startCopy(s, target, q, t, rng));
    if (r) { sfx.insert(); toast(`Copier started: ${q} × ${p.name}`, "good"); onClose(); }
  };
  const presets = [1, 5, 11, max].filter((v, i, a) => v <= max && a.indexOf(v) === i);
  return (
    <Sheet open onClose={onClose} title="Copier" className="copier-sheet">
      <div className="copy-hero">
        <PillArt pillId={target} size={130} />
        <div><h2>{p.name}</h2><RarityTag rarity={p.rarity} /></div>
      </div>
      {busy ? (
        <p className="muted center">The Copier is busy for {formatDuration(busy.endsAt - now)}.</p>
      ) : (
        <>
          <div className="qty-big">
            <button className="qty-btn" onClick={() => setQty(Math.max(1, q - 1))} aria-label="Fewer">−</button>
            <span className="qty-num mono">{q}</span>
            <button className="qty-btn" onClick={() => setQty(Math.min(max, q + 1))} aria-label="More">+</button>
          </div>
          <div className="presets">{presets.map((v) => <button key={v} className={`chip ${q === v ? "on" : ""}`} onClick={() => setQty(v)}>{v === max && v !== 11 ? `Max ${v}` : v}</button>)}</div>
          <button className="btn gold big wide" disabled={state.cash < quote.cost} onClick={make}>
            Make {q} · {money(quote.cost)}
          </button>
          <p className="muted small center">Ready in {formatDuration(quote.ms)} · each copy might come out ★</p>
        </>
      )}
    </Sheet>
  );
}
