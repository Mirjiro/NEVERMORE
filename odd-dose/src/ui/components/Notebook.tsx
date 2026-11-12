import { useState } from "react";
import { PILLS, PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import { RARITIES } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { PillArt } from "./PillArt";
import { PillCard } from "./PillCard";
import { RarityTag, Sheet, TypeChips, formatDuration, pillName } from "./common";

const SOURCE_LABEL: Record<string, string> = {
  file: "Order", document: "Memo", newspaper: "Clipping", scanner: "Scanner",
  confidential: "Secret", market: "BACKDOOR", event: "Note",
};

const tilt = (id: string) => ((id.charCodeAt(id.length - 1) % 5) - 2) * 0.6;

export function Notebook({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, now, act } = useGame();
  const [tab, setTab] = useState<"chart" | "drafts">("chart");
  const [focus, setFocus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const known = new Set(state.known);
  const unread = state.drafts.filter((d) => !d.read).length;
  const f = focus ? PILL_BY_ID[focus] : null;

  return (
    <Sheet open={open} onClose={onClose} className="notebook" title={<span className="nb-title">Notebook</span>}>
      <div className="seg">
        <button className={tab === "chart" ? "on" : ""} onClick={() => setTab("chart")}>Chart</button>
        <button className={tab === "drafts" ? "on" : ""} onClick={() => setTab("drafts")}>Drafts {unread > 0 && <b className="dot inline">{unread}</b>}</button>
      </div>

      {tab === "chart" && (
        <div className="chart">
          <div className="chart-progress">
            <span><strong>{known.size}</strong> of {PILLS.length} discovered</span>
            <div className="bar"><span style={{ width: `${(known.size / PILLS.length) * 100}%` }} /></div>
          </div>
          {f && (
            <div className={`chart-focus r-${f.rarity}`}>
              <PillArt pillId={f.id} size={96} />
              <div>
                <h4>{f.name} <span className="check">✓</span></h4>
                <RarityTag rarity={f.rarity} />
                <div className="mt"><TypeChips types={f.types} /></div>
                <div className="muted small mt">{f.parents ? `${pillName(f.parents[0])} + ${pillName(f.parents[1])}` : "A base emotion"}</div>
              </div>
              <button className="icon-btn" onClick={() => setFocus(null)} aria-label="Close">✕</button>
            </div>
          )}
          {RARITIES.map((r) => {
            const list = PILLS.filter((p) => p.rarity === r);
            const k = list.filter((p) => known.has(p.id)).length;
            return (
              <section key={r} className="chart-group">
                <h4><span className={`rarity-dot r-${r}`} />{RARITY_LABEL[r]} <span className="muted small">{k}/{list.length}</span></h4>
                <div className="chart-tiles">
                  {list.map((p) => known.has(p.id)
                    ? <PillCard key={p.id} pillId={p.id} variant="mini" selected={focus === p.id} onClick={() => setFocus(p.id)} />
                    : <PillCard key={p.id} pillId={p.id} variant="mini" hidden />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === "drafts" && (
        <div className="drafts">
          {state.drafts.length === 0 && <p className="muted">Clues will collect here by themselves.</p>}
          {unread > 0 && <button className="btn ghost small" onClick={() => act((s) => s.drafts.forEach((d) => (d.read = true)))}>Mark all read</button>}
          {state.drafts.map((d) => {
            const isOpen = expanded === d.id;
            const solved = d.pillId && known.has(d.pillId);
            return (
              <article key={d.id} className={`draft ${d.read ? "" : "unread"} ${isOpen ? "open" : ""} src-${d.source}`} style={{ ["--tilt" as string]: `${tilt(d.id)}deg` }}
                onClick={() => {
                  setExpanded(isOpen ? null : d.id);
                  if (!d.read) act((s) => { const x = s.drafts.find((y) => y.id === d.id); if (x) x.read = true; });
                }}>
                <span className="tape" aria-hidden />
                <div className="draft-meta"><span className="src">{SOURCE_LABEL[d.source]}</span><span className="muted small">{formatDuration(now - d.at)} ago</span></div>
                <h5>{d.title}{solved && <span className="solved"> ✓</span>}</h5>
                {isOpen ? <p>{d.body}</p> : <p className="clamp">{d.body}</p>}
              </article>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
