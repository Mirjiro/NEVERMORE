import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import { checkOrder, orderCopyTime, dismissMail, dismissNews, dismissOrder, isKnown, markNewsRead, openMail, shipOrder } from "../../engine/game";
import { RARITIES } from "../../engine/types";
import type { MailOffer, NewsItem, Order } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { PillArt } from "../components/PillArt";
import { formatDuration, gold } from "../components/common";
import { shipValue } from "../../engine/values";
import { sfx } from "../sfx";
import { allChecked, applyStamp, canShip, canStamp, friendlyDue, initialFlow, toggleCheck } from "../shipFlow";
import type { ShipFlow, Stamp } from "../shipFlow";

type Focus = { kind: "order" | "mail" | "news"; id: string } | null;

/** Stable small rotation per document so the desk looks hand-arranged. */
function tilt(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 9) - 4) * 0.6;
}

export function DeskScreen() {
  const { state, now, act } = useGame();
  const [focus, setFocus] = useState<Focus>(null);
  const [payout, setPayout] = useState<{ amount: number; key: number } | null>(null);
  const orders = state.orders.filter((o) => o.status === "open" || o.status === "expired");
  const mail = state.mail.filter((m) => m.status === "sealed");
  const news = state.news.slice(0, 6);

  // Soft paper sound when something new lands on the desk.
  const count = orders.length + mail.length + news.length;
  const prev = useRef(count);
  useEffect(() => { if (count > prev.current) sfx.paper(); prev.current = count; }, [count]);

  const open = (f: Focus) => { sfx.paper(); setFocus(f); };

  return (
    <div className="desk-wrap">
      <div className="desk">
        <div className="lamp-light" aria-hidden />
        <div className="deco notepad" aria-hidden><i /><i /><i /><i /></div>
        <div className="deco pencil" aria-hidden />
        <div className="deco mug" aria-hidden><span className="handle" /><span className="steam"><i /><i /><i /></span></div>
        <div className="deco pen" aria-hidden />
        <div className="deco clips" aria-hidden><i /><i /></div>
        <div className="deco sticky" aria-hidden>{new Date(now).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</div>

        <section className="desk-zone">
          <h2 className="zone-label">Orders</h2>
          <div className="papers">
            {orders.map((o, i) => {
              const ready = o.status === "open" && checkOrder(state, o.id).ready;
              return (
                <button key={o.id} className={`paper folder ${o.confidential ? "confidential" : ""} ${o.status}`}
                  style={{ ["--tilt" as string]: `${tilt(o.id)}deg`, animationDelay: `${i * 60}ms` }} onClick={() => open({ kind: "order", id: o.id })}>
                  <span className="clip" aria-hidden />
                  <span className="paper-title">{o.title}</span>
                  <span className="paper-quote">“{o.description}”</span>
                  <span className="folder-pills">
                    {o.lines.map((l) => (
                      <span key={l.pillId} className="mini-line">
                        <PillArt pillId={l.pillId} silhouette={!isKnown(state, l.pillId)} size={30} />
                        <b>{PILL_BY_ID[l.pillId].name}{l.minStar > 0 && <span className="stars"> {"★".repeat(l.minStar)}</span>}</b>×{l.quantity}
                      </span>
                    ))}
                  </span>
                  <span className="paper-foot">
                    <strong>{gold(o.payout)}{o.confidential && <span className="premium-tag">Premium</span>}</strong>
                    <span className={o.status === "expired" ? "warn" : "muted"}>{o.status === "expired" ? "Expired" : `Due ${friendlyDue(o.expiresAt - now)}`}</span>
                  </span>
                  {o.status === "expired" && <span className="stamp-mark expired-mark">Expired</span>}
                  {ready && <span className="ready-tag">Ready</span>}
                </button>
              );
            })}
            {orders.length === 0 && <div className="paper placeholder">No orders yet. They'll arrive soon.</div>}
          </div>
        </section>

        {mail.length > 0 && (
          <section className="desk-zone">
            <h2 className="zone-label">Mail</h2>
            <div className="papers">
              {mail.map((m, i) => (
                <button key={m.id} className={`paper envelope ${m.identified ? "" : "mystery"}`} style={{ ["--tilt" as string]: `${tilt(m.id)}deg`, animationDelay: `${i * 60}ms` }} onClick={() => open({ kind: "mail", id: m.id })}>
                  <span className="env-flap" />
                  <span className="wax">{m.identified ? "OD" : "?"}</span>
                  <span className="stampbox" />
                  <span className="paper-title">{m.name}</span>
                  <span className="mail-sub">{m.pulls} {m.identified ? "mystery" : "unlabeled"} pill{m.pulls > 1 ? "s" : ""}</span>
                  <span className="paper-foot"><strong>{gold(m.price)}</strong><span className="muted">Sealed</span></span>
                </button>
              ))}
            </div>
          </section>
        )}

        {news.length > 0 && (
          <section className="desk-zone">
            <h2 className="zone-label">News</h2>
            <div className="papers news-row">
              {news.map((n, i) => (
                <button key={n.id} className={`paper ${n.kind === "newspaper" ? "newspaper" : "letter"} ${n.read ? "read" : "unread"}`}
                  style={{ ["--tilt" as string]: `${tilt(n.id)}deg`, animationDelay: `${i * 60}ms` }}
                  onClick={() => { if (!n.read) act((s) => markNewsRead(s, n.id)); open({ kind: "news", id: n.id }); }}>
                  {n.kind === "newspaper" ? (
                    <>
                      <span className="masthead">{n.from}</span>
                      <span className="headline">{n.title}</span>
                      <span className="columns"><i /><i /><i /></span>
                    </>
                  ) : (
                    <>
                      <span className="paper-title small-title">{n.title}</span>
                      <span className="letter-lines"><i /><i /><i /></span>
                    </>
                  )}
                  {!n.read && <span className="unread-dot" />}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {payout && <div key={payout.key} className="payout-pop"><span className="coin" />+{gold(payout.amount)}</div>}

      {focus?.kind === "order" && <OrderDoc id={focus.id} onClose={() => setFocus(null)} onShipped={(amount) => setPayout({ amount, key: Date.now() })} />}
      {focus?.kind === "mail" && <MailDoc offer={state.mail.find((m) => m.id === focus.id)} onClose={() => setFocus(null)} />}
      {focus?.kind === "news" && <NewsDoc item={state.news.find((n) => n.id === focus.id)} onClose={() => setFocus(null)} />}
    </div>
  );
}

/** Lifts a document off the desk; drops it back when closed. */
function FocusFrame({ children, onClose, className, leaving, paperProps }: {
  children: ReactNode; onClose: () => void; className?: string; leaving?: boolean;
  paperProps?: { onClick?: (e: MouseEvent<HTMLDivElement>) => void; onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void; tabIndex?: number; "aria-label"?: string; shake?: number };
}) {
  const [closing, setClosing] = useState(false);
  const close = () => { if (closing) return; setClosing(true); sfx.paper(); setTimeout(onClose, 170); };
  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const { shake, ...rest } = paperProps ?? {};
  return (
    <div className={`focus-backdrop ${leaving ? "leaving" : ""} ${closing ? "closing" : ""}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div key={shake} className={`focus-doc ${className ?? ""} ${leaving ? "dispatch" : ""} ${closing ? "drop" : ""} ${shake ? "thud" : ""}`} {...rest}>
        <button className="icon-btn doc-close" onClick={close} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}

/** Red rubber-stamp ink: rough edges + speckled coverage, slightly rotated. */
function ApprovedInk({ stamp }: { stamp: Stamp }) {
  const id = `ink${stamp.seed}`;
  return (
    <svg className="ink-stamp" viewBox="0 0 240 96" style={{ left: `${stamp.x}%`, top: `${stamp.y}px`, ["--rot" as string]: `${stamp.rot}deg` }} aria-label="Approved" role="img">
      <defs>
        <filter id={id} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={stamp.seed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed={stamp.seed + 7} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 1.9" result="holes" />
          <feComposite in="d" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} fill="none" stroke="#b42a22">
        <rect x="6" y="6" width="228" height="84" rx="10" strokeWidth="5" />
        <rect x="14" y="14" width="212" height="68" rx="6" strokeWidth="1.8" />
        <text x="120" y="60" textAnchor="middle" fill="#b42a22" stroke="none" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontWeight="700" fontSize="34" letterSpacing="5">APPROVED</text>
        <text x="120" y="77" textAnchor="middle" fill="#b42a22" stroke="none" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="8" letterSpacing="4">ODD DOSE · SHIPPING</text>
      </g>
    </svg>
  );
}

/** Taps on controls must never stamp the paper. */
const isPaperSurface = (el: EventTarget | null) =>
  el instanceof Element && !el.closest("button, a, input, label, select, textarea, summary, [data-no-stamp]");

function OrderDoc({ id, onClose, onShipped }: { id: string; onClose: () => void; onShipped: (amount: number) => void }) {
  const { state, now, act } = useGame();
  const [flow, setFlow] = useState<ShipFlow>(initialFlow);
  const [leaving, setLeaving] = useState(false);
  const [shake, setShake] = useState(0);
  const order: Order | undefined = state.orders.find((o) => o.id === id);
  if (!order) return null;
  const check = checkOrder(state, id);
  const open = order.status === "open" && !leaving;
  const ids = order.lines.map((l) => l.pillId);
  const stampable = canStamp(flow, ids, check.ready, open);
  const shippable = canShip(flow, ids, check.ready, open);

  const stampAt = (x: number, y: number) => {
    if (!stampable) return;
    setFlow((f) => applyStamp(f, ids, check.ready, open, { x, y }));
    setShake((n) => n + 1);
    sfx.thunk();
  };
  const onPaperClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isPaperSurface(e.target)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = e.clientY - r.top + e.currentTarget.scrollTop;
    stampAt(Math.min(76, Math.max(24, x)), Math.max(50, Math.min(e.currentTarget.scrollHeight - 50, y)));
  };
  const onPaperKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stampAt(50, e.currentTarget.scrollTop + e.currentTarget.clientHeight * 0.5); }
  };
  const ship = () => {
    if (!shippable) return;
    const res = act((s, t, rng) => shipOrder(s, id, t, rng));
    if (!res) return;
    setLeaving(true);
    sfx.ship();
    setTimeout(() => { sfx.coin(); onShipped(res.payout); }, 450);
    setTimeout(onClose, 900);
  };

  return (
    <FocusFrame onClose={onClose} className={`order-doc ${order.confidential ? "confidential" : ""} ${stampable ? "stampable" : ""}`} leaving={leaving}
      paperProps={{ onClick: onPaperClick, onKeyDown: onPaperKey, tabIndex: 0, "aria-label": stampable ? "Order paper. Press Enter to approve." : "Order paper", shake }}>
      <span className="clip big" aria-hidden />
      <div className="doc-kicker">{order.confidential ? "Confidential" : order.senderKind}</div>
      <h2 className="order-title">{order.title}</h2>
      <p className="order-quote">“{order.description}”</p>
      <p className="order-from">— {order.sender}</p>

      <div className="checklist">
        {check.lines.map(({ line, available, ok }) => {
          const p = PILL_BY_ID[line.pillId];
          const checked = !!flow.checked[line.pillId];
          return (
            <label key={line.pillId} className={`check-row ${ok ? "" : "short"} ${checked ? "on" : ""}`}>
              <input type="checkbox" disabled={!open || (!ok && !checked)} checked={checked}
                onChange={(e) => { sfx.tap(); setFlow((f) => toggleCheck(f, line.pillId, e.target.checked, ok)); }} />
              <span className="box" aria-hidden />
              <PillArt pillId={line.pillId} silhouette={!isKnown(state, line.pillId)} size={46} />
              <span className="check-text">
                <strong>{p.name}{line.minStar > 0 && <span className="stars"> {"★".repeat(line.minStar)}</span>} ×{line.quantity}
                  <span className="line-value">{gold(shipValue(line.pillId, line.minStar) * line.quantity)}</span></strong>
                <span className={`small ${ok ? "muted" : "warn"}`}>{ok ? `You have ${available}` : `Need ${line.quantity - available} more`}</span>
              </span>
            </label>
          );
        })}
      </div>

      <RewardBreakdown order={order} />

      <div className="order-foot">
        <div><span className="muted small">Reward{order.confidential && <span className="premium-tag">Premium</span>}</span><div className="payout">{gold(order.payout)}</div></div>
        <div className="make-cost"><span className="muted small">Copier time</span><div>~{formatDuration(orderCopyTime(state, order.lines))}</div></div>
        <div className="due"><span className="muted small">Due</span><div>{order.status === "expired" ? <span className="warn">Expired</span> : friendlyDue(order.expiresAt - now)}</div></div>
      </div>

      <div className="stamp-hint" aria-live="polite">
        {stampable ? <span className="hint-pulse">Tap the paper to approve</span>
          : flow.stamp ? <span className="muted small">Approved — ready to ship</span>
          : open && allChecked(flow, ids) ? <span className="warn small">Missing pills</span>
          : open ? <span className="muted small">Tick each item you're sending</span> : null}
      </div>

      {flow.stamp && <ApprovedInk stamp={flow.stamp} />}

      <div className="doc-actions" data-no-stamp>
        {order.status === "open" ? (
          <button className="btn ship big wide" disabled={!shippable} onClick={ship}>Ship</button>
        ) : order.status === "expired" ? (
          <button className="btn ghost" onClick={() => { act((s) => dismissOrder(s, id)); onClose(); }}>File away</button>
        ) : null}
      </div>
    </FocusFrame>
  );
}

/** Stacked bar of rarity odds — accurate widths, colors per rarity. */
function OddsBar({ odds }: { odds: MailOffer["odds"] }) {
  return (
    <div className="odds-stack" role="img" aria-label={RARITIES.filter((r) => odds[r] > 0).map((r) => `${RARITY_LABEL[r]} ${odds[r]}%`).join(", ")}>
      {RARITIES.filter((r) => odds[r] > 0).map((r) => <i key={r} className={`r-${r}`} style={{ flexGrow: odds[r] }} />)}
    </div>
  );
}

function MailDoc({ offer, onClose }: { offer?: MailOffer; onClose: () => void }) {
  const { state, now, act, setReveal } = useGame();
  if (!offer) return null;
  const totalStars = offer.starOdds.reduce((a, b) => a + b, 0);
  const buy = () => {
    const res = act((s, t, rng) => openMail(s, offer.id, t, rng));
    if (res) { sfx.paper(); setReveal({ kind: "mail", results: res, name: offer.name }); onClose(); }
  };
  const best = RARITIES.filter((r) => offer.odds[r] > 0).slice(-1)[0];
  return (
    <FocusFrame onClose={onClose} className={`mail-doc ${offer.identified ? "" : "mystery"}`}>
      <div className="doc-kicker">Delivery from {offer.seller}</div>
      <h2 className="order-title">{offer.name}</h2>
      <p className="mail-count">{offer.pulls} {offer.identified ? "mystery" : "unlabeled"} pill{offer.pulls > 1 ? "s" : ""}</p>
      <div className="compartments">
        {Array.from({ length: offer.pulls }).map((_, i) => <span key={i} className="compartment"><span className="sealed-pill" /><span className="seal" /></span>)}
      </div>
      <div className="price-line"><span className="muted small">Price</span><b>{gold(offer.price)}</b></div>
      <OddsBar odds={offer.odds} />
      <div className="odds-legend">
        {RARITIES.filter((r) => offer.odds[r] > 0).map((r) => <span key={r} className={`r-${r}`}><i />{RARITY_LABEL[r]} {offer.odds[r]}%</span>)}
      </div>
      <p className="plain">{offer.identified
        ? "Each pill goes to your Vault and becomes Known ✓ — then you can copy it any time."
        : "Pills arrive unlabeled (?). Scan them in the Lab to find out what they are."}</p>
      <details className="more">
        <summary>Odds &amp; contents</summary>
        <div className="odds-table">
          {RARITIES.map((r) => (
            <div key={r} className={`odds-row r-${r}`}>
              <span>{RARITY_LABEL[r]}</span>
              <span className="odds-bar"><i style={{ width: `${offer.odds[r]}%` }} /></span>
              <b className="mono">{offer.odds[r]}%</b>
            </div>
          ))}
        </div>
        <p className="small mt">Per pill: ★ {((offer.starOdds[1] / totalStars) * 100).toFixed(1)}% · ★★ {((offer.starOdds[2] / totalStars) * 100).toFixed(1)}%.</p>
        <p className="small muted mt">Each pill rolls its rarity first, then any pill of that rarity is equally likely. Best possible: {RARITY_LABEL[best]}. Offer expires in {friendlyDue(offer.expiresAt - now)}.</p>
      </details>
      <div className="doc-actions split">
        <button className="btn ghost" onClick={() => { act((s) => dismissMail(s, offer.id)); onClose(); }}>Not now</button>
        <button className="btn primary big" disabled={state.cash < offer.price} onClick={buy}>Open · {gold(offer.price)}</button>
      </div>
    </FocusFrame>
  );
}

function NewsDoc({ item, onClose }: { item?: NewsItem; onClose: () => void }) {
  const { act } = useGame();
  if (!item) return null;
  const paper = item.kind === "newspaper";
  return (
    <FocusFrame onClose={onClose} className={paper ? "news-doc" : "letter-doc"}>
      {paper ? (
        <>
          <div className="np-masthead">{item.from}</div>
          <div className="np-rule mono small"><span>Late edition</span><span>5¢</span></div>
          <h2 className="np-headline">{item.title}</h2>
          {item.pillId && <div className="np-photo"><PillArt pillId={item.pillId} size={140} /></div>}
          <p className="np-body">{item.body}</p>
        </>
      ) : (
        <>
          <h2 className="order-title">{item.title}</h2>
          <div className="letter-body">{item.body.split("\n").filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}</div>
          <div className="signature">— {item.from}</div>
        </>
      )}
      <div className="doc-actions">
        <button className="btn ghost" onClick={() => { act((s) => dismissNews(s, item.id)); onClose(); }}>File away</button>
      </div>
    </FocusFrame>
  );
}

/** How the reward adds up: ship value × quantity per line, then labelled bonuses. No hidden adjustments. */
function RewardBreakdown({ order }: { order: Order }) {
  const base = order.lines.reduce((a, l) => a + shipValue(l.pillId, l.minStar) * l.quantity, 0);
  const bonuses = order.breakdown?.bonuses ?? [];
  const listed = base + bonuses.reduce((a, b) => a + b.amount, 0);
  const extra = order.payout - listed; // older orders that were promised more keep their higher reward
  if (!bonuses.length && extra <= 0) return null;
  return (
    <div className="reward-breakdown">
      <span><span className="muted">Pills</span><b>{gold(base)}</b></span>
      {bonuses.map((b) => <span key={b.label}><span className="muted">{b.label}</span><b>+{gold(b.amount)}</b></span>)}
      {extra > 0 && <span><span className="muted">Agreed earlier</span><b>+{gold(extra)}</b></span>}
    </div>
  );
}
