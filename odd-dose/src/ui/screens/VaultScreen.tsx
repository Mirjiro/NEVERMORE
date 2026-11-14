import { useMemo, useState } from "react";
import { PILLS, PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import {
  backdoorUnlocked, collectCopy, copierSpeedUpCost, marketPrice, quickSell, quickSellPrice, copierMaxBatch, copierQuote, countExact, isKnown, sellPrice, speedUpCopy,
  startCopy, vaultStacks,
} from "../../engine/game";
import { RARITIES } from "../../engine/types";
import type { Rarity, Star } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { shipValue } from "../../engine/values";
import type { Tab } from "../App";
import { PillArt } from "../components/PillArt";
import { PillCard } from "../components/PillCard";
import { RarityTag, Sheet, TypeChips, formatDuration, gold, pillName } from "../components/common";
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
      <CopierSheet key={String(copier)} target={copier} onClose={() => setCopier(null)} />
    </div>
  );
}

function CopierBench({ onMake }: { onMake: () => void }) {
  const { state, now, act, setReveal } = useGame();
  const job = state.copier;
  const ready = !!job && job.endsAt <= now;
  const progress = job ? Math.min(1, (now - job.startedAt) / (job.endsAt - job.startedAt)) : 0;
  const made = job ? (ready ? job.quantity : Math.floor(progress * job.quantity)) : 0;
  const slots = job ? Math.min(job.quantity, 22) : 11;
  const filled = job ? Math.round((made / job.quantity) * slots) : 0;
  const collect = () => {
    const r = act((s, t) => collectCopy(s, t));
    if (r) setReveal({ kind: "copier", pillId: r.pillId, quantity: r.quantity, stars: r.stars });
  };
  return (
    <section className={`bench ${job ? (ready ? "ready" : "working") : "idle"}`}>
      <div className="cp-device" aria-hidden>
        <div className="cp-head">
          <span className="cp-lamp" />
          <span className="cp-plate">COPIER</span>
          <span className="cp-dial"><i style={{ transform: `rotate(${-120 + progress * 240}deg)` }} /></span>
        </div>
        <div className="cp-window">{job ? <PillArt pillId={job.pillId} size={58} /> : <span className="cp-empty" />}</div>
        <div className="cp-rollers"><i /><i /><i /></div>
      </div>
      <div className="bench-info">
        <div className="bench-row">
          <h2>Copier</h2>
          {job && <span className="cp-count mono">{made} / {job.quantity}</span>}
        </div>
        <div className={`cp-tray ${job ? "" : "idle"}`}>
          {Array.from({ length: slots }).map((_, i) => (
            <span key={i} className={`cp-slot ${i < filled ? "full" : ""}`}>{job && i < filled && <PillArt pillId={job.pillId} size={24} />}</span>
          ))}
        </div>
        {!job && <button className="btn gold" onClick={onMake}>Make pills</button>}
        {job && !ready && (
          <div className="bench-row">
            <span className="timer mono">{formatDuration(job.endsAt - now)}</span>
            <button className="btn ghost-dark small" disabled={state.cash < copierSpeedUpCost(state, now)} onClick={() => act((s, t) => speedUpCopy(s, t))}>
              Finish · {gold(copierSpeedUpCost(state, now))}
            </button>
          </div>
        )}
        {job && ready && <button className="btn gold pulse" onClick={collect}>Collect {job.quantity} × {pillName(job.pillId)}</button>}
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
  const [sellQty, setSellQty] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const qty = Math.max(1, Math.min(sellQty, available));
  const unit = quickSellPrice(pillId, star);
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
      </div>

      <section className="quick-sell">
        <div className="qs-head">
          <h3>Quick sell</h3>
          <span className="muted small">{gold(unit)} each{star > 0 ? ` (${"★".repeat(star)})` : ""} · orders pay {gold(shipValue(pillId, star))}</span>
        </div>
        {available < 1 ? (
          <p className="muted small">{stack?.reserved ? "These pills are in a Machine right now." : "None left to sell."}</p>
        ) : !confirming ? (
          <div className="qs-row">
            <div className="qs-stepper">
              <button className="qty-btn sm" onClick={() => setSellQty(Math.max(1, qty - 1))} aria-label="Sell fewer">−</button>
              <span className="mono">{qty}</span>
              <button className="qty-btn sm" onClick={() => setSellQty(Math.min(available, qty + 1))} aria-label="Sell more">+</button>
              {available > 1 && <button className="chip" onClick={() => setSellQty(available)}>All {available}</button>}
            </div>
            <button className="btn ghost" onClick={() => setConfirming(true)}>Sell · {gold(unit * qty)}</button>
          </div>
        ) : (
          <div className="qs-confirm">
            <p>Sell <b>{qty} × {p.name}{star > 0 ? " " + "★".repeat(star) : ""}</b> for <b className="mono">{gold(unit * qty)}</b>?</p>
            <div className="qs-row">
              <button className="btn ghost" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn gold" onClick={() => {
                const r = act((s) => quickSell(s, pillId, star, qty));
                setConfirming(false);
                if (r) { sfx.coin(); toast(`Sold ${r.sold} for ${gold(r.payout)}`, "good"); setSellQty(1); if (count - r.sold <= 0) onClose(); }
              }}>Confirm</button>
            </div>
          </div>
        )}
        {backdoorUnlocked(state) && <p className="muted small">BACKDOOR pays more (~{gold(sellPrice(state, pillId, star))} each right now).</p>}
      </section>

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
          <dt>Market value</dt><dd>{gold(marketPrice(state, pillId, star))}</dd>
        </dl>
      </details>
    </Sheet>
  );
}

function CopierSheet({ target, onClose }: { target: string | null | "pick"; onClose: () => void }) {
  const { state, now, act, toast } = useGame();
  const known = PILLS.filter((p) => isKnown(state, p.id));
  const [qty, setQty] = useState(11);
  const [sel, setSel] = useState<string | null>(null);
  if (target === null) return null;
  const pillId = sel ?? (target !== "pick" ? target : known[0]?.id);
  if (!pillId) return null;
  const busy = state.copier;
  const p = PILL_BY_ID[pillId];
  const max = copierMaxBatch(state, pillId);
  const q = Math.max(1, Math.min(qty, max));
  const quote = copierQuote(state, pillId, q);
  const close = () => { setSel(null); onClose(); };
  const make = () => {
    const r = act((s, t, rng) => startCopy(s, pillId, q, t, rng));
    if (r) { sfx.insert(); toast(`Copying ${q} × ${p.name}`, "good"); close(); }
  };
  const presets = [1, 5, 11, max].filter((v, i, a) => v <= max && a.indexOf(v) === i);
  return (
    <Sheet open onClose={close} title="Copier" className={`copier-sheet r-${p.rarity}`}>
      <div className="copy-stage">
        <div className="copy-glow" />
        <PillArt pillId={pillId} size={150} />
        <h2>{p.name}</h2>
        <RarityTag rarity={p.rarity} />
      </div>
      <div className="copy-strip">
        {known.map((k) => <PillCard key={k.id} pillId={k.id} variant="mini" selected={k.id === pillId} onClick={() => { sfx.tap(); setSel(k.id); }} />)}
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
          <div className="copy-quote"><span><b>Free</b></span><span>Ready in <b>{formatDuration(quote.ms)}</b></span><span className="muted">max {max}</span></div>
          <button className="btn gold big wide" onClick={make}>Start copying</button>
          <p className="muted small center">Every copy has a tiny chance to come out ★</p>
        </>
      )}
    </Sheet>
  );
}
