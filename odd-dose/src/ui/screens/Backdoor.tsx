import { useState } from "react";
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import { buyListing, fireList, isKnown, listingPrice, marketPrice, sellPill, sellPrice } from "../../engine/game";
import type { Star } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { PillArt } from "../components/PillArt";
import { RarityTag, Sparkline, Stars, formatDuration, gold } from "../components/common";

export function Backdoor({ onExit }: { onExit: () => void }) {
  const { state, now, act, toast } = useGame();
  const [tab, setTab] = useState<"buy" | "sell" | "fire" | "history">("buy");
  const fire = fireList(state);

  // Group sellable inventory by pill + star.
  const groups = new Map<string, { pillId: string; star: Star; count: number }>();
  for (const sp of state.specimens) {
    if (!sp.identified || sp.reservedBy) continue;
    const k = `${sp.pillId}|${sp.star}`;
    const g = groups.get(k) ?? { pillId: sp.pillId, star: sp.star, count: 0 };
    g.count++;
    groups.set(k, g);
  }
  const sellable = [...groups.values()].sort((a, b) => sellPrice(state, b.pillId, b.star) - sellPrice(state, a.pillId, a.star));

  return (
    <div className="backdoor">
      <div className="bd-head">
        <button className="btn ghost-dark small" onClick={onExit}>← HQ</button>
        <div>
          <h1>BACKDOOR</h1>
          <p className="small">Simulated market · listings rotate in {formatDuration(state.market.nextRotateAt - now)}</p>
        </div>
      </div>

      <div className="bd-fire">
        <span className="fire-label">🔥 FIRE</span>
        <div className="fire-items">
          {fire.length === 0 && <span className="small dim">Quiet market. Nothing is heating up.</span>}
          {fire.map((f) => (
            <span key={f.pillId} className="fire-chip">{PILL_BY_ID[f.pillId].name} <b>+{(f.change * 100).toFixed(1)}%</b></span>
          ))}
        </div>
      </div>

      <div className="seg dark">
        {(["buy", "sell", "fire", "history"] as const).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{{ buy: "Listings", sell: "Sell", fire: "Trends", history: "History" }[t]}</button>
        ))}
      </div>

      {tab === "buy" && (
        <div className="bd-list">
          {state.market.listings.map((l) => {
            const p = PILL_BY_ID[l.pillId];
            const price = listingPrice(state, l);
            return (
              <div key={l.id} className={`bd-card r-${p.rarity} ${l.stock ? "" : "soldout"}`}>
                <PillArt pillId={l.pillId} star={l.star} size={78} />
                <div className="bd-info">
                  <strong>{p.name} <Stars star={l.star} /></strong>
                  <span><RarityTag rarity={p.rarity} /> {isKnown(state, p.id) ? <span className="dim small">Known ✓</span> : <span className="new-chip">New to you</span>}</span>
                  <Sparkline data={state.market.history[l.pillId] ?? []} width={110} height={26} />
                  <span className="dim small">Stock {l.stock}</span>
                </div>
                <div className="bd-buy">
                  <span className="price">{gold(price)}</span>
                  <button className="btn amber" disabled={!l.stock || state.cash < price} onClick={() => { const r = act((s, t) => buyListing(s, l.id, t)); if (r) toast(`Bought ${p.name}${r.isNew ? " — now Known ✓" : ""}`, "good"); }}>
                    {l.stock ? "Buy" : "Sold out"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "sell" && (
        <div className="bd-list">
          <p className="small dim">Buyers pay below the listing price. Pills inside a Machine can't be sold.</p>
          {sellable.length === 0 && <p className="dim">Nothing to sell.</p>}
          {sellable.map((g) => {
            const p = PILL_BY_ID[g.pillId];
            const price = sellPrice(state, g.pillId, g.star);
            return (
              <div key={`${g.pillId}${g.star}`} className={`bd-card r-${p.rarity}`}>
                <PillArt pillId={g.pillId} star={g.star} size={60} />
                <div className="bd-info">
                  <strong>{p.name} <Stars star={g.star} /></strong>
                  <span className="dim small">{RARITY_LABEL[p.rarity]} · you have {g.count}</span>
                </div>
                <div className="bd-buy">
                  <span className="price">{gold(price)}</span>
                  <button className="btn ghost-dark" onClick={() => { const r = act((s, t) => sellPill(s, g.pillId, g.star, t)); if (r) toast(`Sold ${p.name} for ${gold(r.price)}`, "good"); }}>Sell 1</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "fire" && (
        <div className="bd-trends">
          {Object.keys(state.market.index)
            .filter((id) => isKnown(state, id) || fire.some((f) => f.pillId === id))
            .map((id) => ({ id, h: state.market.history[id] ?? [] }))
            .sort((a, b) => marketPrice(state, b.id, 0) - marketPrice(state, a.id, 0))
            .map(({ id, h }) => {
              const change = h.length > 1 ? h[h.length - 1] / h[0] - 1 : 0;
              return (
                <div key={id} className="trend-row">
                  <span className="trend-name">{PILL_BY_ID[id].name}</span>
                  <Sparkline data={h} width={120} height={24} />
                  <span className="mono">{gold(marketPrice(state, id, 0))}</span>
                  <span className={`mono ${change >= 0 ? "up" : "down"}`}>{change >= 0 ? "+" : ""}{(change * 100).toFixed(1)}%</span>
                </div>
              );
            })}
        </div>
      )}

      {tab === "history" && (
        <div className="bd-history">
          {state.market.transactions.length === 0 && <p className="dim">No transactions yet.</p>}
          {state.market.transactions.map((t) => (
            <div key={t.id} className="tx-row">
              <span className={`tx-kind ${t.kind}`}>{t.kind === "buy" ? "BUY" : "SELL"}</span>
              <span>{PILL_BY_ID[t.pillId].name} <Stars star={t.star} /></span>
              <span className="mono">{t.kind === "buy" ? "−" : "+"}{gold(t.price)}</span>
              <span className="dim small">{formatDuration(now - t.at)} ago</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
