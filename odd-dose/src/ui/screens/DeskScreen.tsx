import { useState } from "react";
import type { ReactNode } from "react";
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import { checkOrder, dismissMail, dismissNews, dismissOrder, isKnown, markNewsRead, openMail, shipOrder } from "../../engine/game";
import { RARITIES } from "../../engine/types";
import type { MailOffer, NewsItem, Order } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { PillArt } from "../components/PillArt";
import { formatDuration, money } from "../components/common";

type Focus = { kind: "order"; id: string } | { kind: "mail"; id: string } | { kind: "news"; id: string } | null;

/** Stable small rotation per document so the desk looks hand-arranged. */
function tilt(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 9) - 4) * 0.55;
}

export function DeskScreen() {
  const { state, now, act } = useGame();
  const [focus, setFocus] = useState<Focus>(null);
  const orders = state.orders.filter((o) => o.status === "open" || o.status === "expired");
  const mail = state.mail.filter((m) => m.status === "sealed");
  const news = state.news.slice(0, 8);
  const empty = !orders.length && !mail.length && !news.length;

  const openNews = (n: NewsItem) => {
    if (!n.read) act((s) => markNewsRead(s, n.id));
    setFocus({ kind: "news", id: n.id });
  };

  return (
    <div className="desk-wrap">
      <div className="screen-head on-dark">
        <h1>Desk</h1>
        <p>{orders.filter((o) => o.status === "open").length} open orders · {mail.length} sealed offers · {state.news.filter((n) => !n.read).length} unread</p>
      </div>
      <div className="desk">
        <div className="desk-deco lamp" aria-hidden />
        <div className="desk-deco mug" aria-hidden />
        <div className="desk-deco pen" aria-hidden />

        <div className="desk-zone">
          <div className="zone-label">Incoming orders</div>
          <div className="papers">
            {orders.map((o, i) => (
              <button key={o.id} className={`paper folder ${o.confidential ? "confidential" : ""} ${o.status}`} style={{ ["--tilt" as string]: `${tilt(o.id)}deg`, animationDelay: `${i * 70}ms` }} onClick={() => setFocus({ kind: "order", id: o.id })}>
                <span className="folder-tab">{o.confidential ? "CONFIDENTIAL" : o.senderKind}</span>
                <span className="paper-from">{o.sender}</span>
                <span className="paper-title">{o.title}</span>
                <span className="folder-lines">
                  {o.lines.map((l) => (
                    <span key={l.pillId} className="mini-line"><PillArt pillId={l.pillId} size={26} />{l.quantity}× {PILL_BY_ID[l.pillId].name}{l.minStar ? " " + "★".repeat(l.minStar) : ""}</span>
                  ))}
                </span>
                <span className="paper-foot">
                  <strong>{money(o.payout)}</strong>
                  <span className={o.status === "expired" ? "warn" : "muted"}>{o.status === "expired" ? "Expired" : `Due ${formatDuration(o.expiresAt - now)}`}</span>
                </span>
                {o.status === "expired" && <span className="stamp expired-stamp">Expired</span>}
                {o.status === "open" && checkOrder(state, o.id).ready && <span className="ready-flag">Ready to ship</span>}
              </button>
            ))}
            {orders.length === 0 && <div className="paper placeholder">No orders right now. New files arrive over time.</div>}
          </div>
        </div>

        <div className="desk-zone">
          <div className="zone-label">Mail</div>
          <div className="papers">
            {mail.map((m, i) => (
              <button key={m.id} className={`paper envelope ${m.identified ? "" : "mystery"}`} style={{ ["--tilt" as string]: `${tilt(m.id)}deg`, animationDelay: `${i * 70}ms` }} onClick={() => setFocus({ kind: "mail", id: m.id })}>
                <span className="env-flap" />
                <span className="stampbox">{m.identified ? "ODD" : "?"}</span>
                <span className="paper-from">{m.seller}</span>
                <span className="paper-title">{m.name}</span>
                <span className="paper-foot"><strong>{money(m.price)}</strong><span className="muted">{m.pulls} pull{m.pulls > 1 ? "s" : ""}</span></span>
                <span className="wax" />
              </button>
            ))}
            {mail.length === 0 && <div className="paper placeholder small">No sealed offers. Sellers write in from time to time.</div>}
          </div>
        </div>

        <div className="desk-zone">
          <div className="zone-label">News &amp; correspondence</div>
          <div className="papers">
            {news.map((n, i) => (
              <button key={n.id} className={`paper ${n.kind === "newspaper" ? "newspaper" : "letter"} ${n.read ? "read" : "unread"}`} style={{ ["--tilt" as string]: `${tilt(n.id)}deg`, animationDelay: `${i * 60}ms` }} onClick={() => openNews(n)}>
                {n.kind === "newspaper" ? (
                  <>
                    <span className="masthead">{n.from}</span>
                    <span className="headline">{n.title}</span>
                    <span className="columns"><i /><i /><i /></span>
                  </>
                ) : (
                  <>
                    <span className="paper-from">{n.from}</span>
                    <span className="paper-title">{n.title}</span>
                    <span className="letter-lines"><i /><i /><i /></span>
                  </>
                )}
                {!n.read && <span className="unread-dot" />}
              </button>
            ))}
          </div>
        </div>
        {empty && <p className="muted center">Your desk is clear.</p>}
      </div>

      {focus?.kind === "order" && <OrderDoc id={focus.id} onClose={() => setFocus(null)} />}
      {focus?.kind === "mail" && <MailDoc offer={state.mail.find((m) => m.id === focus.id)} onClose={() => setFocus(null)} />}
      {focus?.kind === "news" && <NewsDoc item={state.news.find((n) => n.id === focus.id)} onClose={() => setFocus(null)} />}
    </div>
  );
}

function FocusFrame({ children, onClose, className, leaving }: { children: ReactNode; onClose: () => void; className?: string; leaving?: boolean }) {
  return (
    <div className={`focus-backdrop ${leaving ? "leaving" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`focus-doc ${className ?? ""} ${leaving ? "dispatch" : ""}`}>
        <button className="icon-btn doc-close" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}

function OrderDoc({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, now, act, toast } = useGame();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [sticker, setSticker] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const order: Order | undefined = state.orders.find((o) => o.id === id);
  if (!order) return null;
  const check = checkOrder(state, id);
  const open = order.status === "open";
  const allChecked = check.lines.every((l) => checked[l.line.pillId]);

  const ship = () => {
    if (leaving) return;
    const res = act((s, t, rng) => shipOrder(s, id, t, rng));
    if (!res) return;
    setLeaving(true);
    toast(`Shipped! +${money(res.payout)}`, "good");
    setTimeout(onClose, 900);
  };

  return (
    <FocusFrame onClose={onClose} className={`order-doc ${order.confidential ? "confidential" : ""}`} leaving={leaving}>
      <div className="doc-head">
        <div>
          <div className="doc-kicker">{order.confidential ? "CONFIDENTIAL REQUEST" : `Purchase order · ${order.senderKind}`}</div>
          <h2>{order.title}</h2>
          <div className="doc-from">From: {order.sender}</div>
        </div>
        <div className="doc-ref mono">#{order.id.split("_")[1].toUpperCase()}</div>
      </div>
      <p className="doc-body">{order.description}</p>

      <div className="checklist">
        {check.lines.map(({ line, available, ok }) => {
          const p = PILL_BY_ID[line.pillId];
          const known = isKnown(state, line.pillId);
          return (
            <label key={line.pillId} className={`check-row ${ok ? "" : "short"} ${checked[line.pillId] ? "on" : ""}`}>
              <input type="checkbox" disabled={!open || !ok || sticker} checked={!!checked[line.pillId]} onChange={(e) => setChecked({ ...checked, [line.pillId]: e.target.checked })} />
              <span className="box" />
              <PillArt pillId={line.pillId} silhouette={!known} size={44} />
              <span className="check-text">
                <strong>{line.quantity}× {p.name}{line.minStar ? <span className="stars s1"> {"★".repeat(line.minStar)} or better</span> : null}</strong>
                <span className="muted small">{RARITY_LABEL[p.rarity]} · you have {available} available{!known ? " · not yet discovered" : ""}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="doc-foot">
        <div>
          <div className="muted small">Payment on delivery</div>
          <div className="payout">{money(order.payout)}</div>
          <div className={`small ${open ? "muted" : "warn"}`}>{open ? `Due in ${formatDuration(order.expiresAt - now)}` : "This request has expired."}</div>
        </div>
        <div className={`sticker-zone ${sticker ? "applied" : ""}`}>
          {sticker ? <div className="ship-sticker">ODD<br />DOSE<small>SHIPPING</small></div> : <span className="sticker-hint">Sticker here</span>}
        </div>
      </div>

      <div className="doc-actions">
        {open ? (
          !sticker ? (
            <button className="btn primary big" disabled={!allChecked} onClick={() => setSticker(true)}>{allChecked ? "Apply shipping sticker" : check.ready ? "Tick every item to continue" : "Missing items"}</button>
          ) : (
            <button className="btn primary big ship" onClick={ship}>SHIP</button>
          )
        ) : (
          <button className="btn ghost" onClick={() => { act((s) => dismissOrder(s, id)); onClose(); }}>File away</button>
        )}
      </div>
      {leaving && <div className="stamp shipped-stamp">Shipped</div>}
    </FocusFrame>
  );
}

function MailDoc({ offer, onClose }: { offer?: MailOffer; onClose: () => void }) {
  const { state, now, act, setReveal } = useGame();
  if (!offer) return null;
  const totalStars = offer.starOdds.reduce((a, b) => a + b, 0);
  const buy = () => {
    const res = act((s, t, rng) => openMail(s, offer.id, t, rng));
    if (res) { setReveal({ kind: "mail", results: res, name: offer.name }); onClose(); }
  };
  return (
    <FocusFrame onClose={onClose} className="mail-doc">
      <div className="doc-kicker">Sealed shipment offer</div>
      <h2>{offer.name}</h2>
      <div className="doc-from">Seller: {offer.seller}</div>
      <p className="doc-body">{offer.blurb}</p>
      <div className="offer-grid">
        <div><span className="muted small">Price</span><strong>{money(offer.price)}</strong></div>
        <div><span className="muted small">Pulls</span><strong>{offer.pulls}</strong></div>
        <div><span className="muted small">Contents</span><strong>{offer.identified ? "Identified ✓" : "Unidentified ?"}</strong></div>
        <div><span className="muted small">Expires</span><strong>{formatDuration(offer.expiresAt - now)}</strong></div>
      </div>
      <h4>Rarity odds (per pull)</h4>
      <div className="odds-table">
        {RARITIES.map((r) => (
          <div key={r} className={`odds-row r-${r}`}>
            <span>{RARITY_LABEL[r]}</span>
            <span className="odds-bar"><i style={{ width: `${offer.odds[r]}%` }} /></span>
            <b className="mono">{offer.odds[r]}%</b>
          </div>
        ))}
      </div>
      <h4>Star odds</h4>
      <div className="star-odds mono">
        <span>Base {((offer.starOdds[0] / totalStars) * 100).toFixed(1)}%</span>
        <span>★ {((offer.starOdds[1] / totalStars) * 100).toFixed(1)}%</span>
        <span>★★ {((offer.starOdds[2] / totalStars) * 100).toFixed(1)}%</span>
      </div>
      <p className="muted small">Possible pool: any of the 49 catalog pills of the rolled rarity, equally likely. {offer.identified ? "Identified pills become Known ✓ and can be copied." : "Unidentified specimens arrive as ? and need the Scanner."}</p>
      <div className="doc-actions split">
        <button className="btn ghost" onClick={() => { act((s) => dismissMail(s, offer.id)); onClose(); }}>Decline</button>
        <button className="btn primary big" disabled={state.cash < offer.price} onClick={buy}>Buy &amp; open · {money(offer.price)}</button>
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
          <div className="np-rule mono small">Est. 1931 · Late edition</div>
          <h2 className="np-headline">{item.title}</h2>
          <p className="np-body">{item.body}</p>
          {item.pillId && <div className="np-photo"><PillArt pillId={item.pillId} size={150} /></div>}
        </>
      ) : (
        <>
          <div className="doc-kicker">{item.kind === "welcome" ? "Memo" : "Correspondence"}</div>
          <h2>{item.title}</h2>
          <div className="letter-body">{item.body.split("\n").map((l, i) => <p key={i}>{l}</p>)}</div>
          <div className="signature">— {item.from}</div>
        </>
      )}
      <div className="doc-actions">
        <button className="btn ghost" onClick={() => { act((s) => dismissNews(s, item.id)); onClose(); }}>File away</button>
      </div>
    </FocusFrame>
  );
}
