import { useState } from "react";
import { PILLS, PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import { RARITIES } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { PillArt } from "./PillArt";
import { Sheet, TypeChips, formatDuration, pillName } from "./common";

const SOURCE_LABEL: Record<string, string> = {
  file: "Order file", document: "Document", newspaper: "Newspaper", scanner: "Scanner",
  confidential: "Confidential", market: "BACKDOOR", event: "Event",
};

export function Notebook({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, now, act } = useGame();
  const [tab, setTab] = useState<"chart" | "drafts">("chart");
  const known = new Set(state.known);
  const unread = state.drafts.filter((d) => !d.read).length;

  return (
    <Sheet open={open} onClose={onClose} className="notebook" title={<span className="nb-title">Notebook</span>}>
      <div className="seg">
        <button className={tab === "chart" ? "on" : ""} onClick={() => setTab("chart")}>Chart</button>
        <button className={tab === "drafts" ? "on" : ""} onClick={() => setTab("drafts")}>Drafts {unread > 0 && <b className="dot inline">{unread}</b>}</button>
      </div>

      {tab === "chart" && (
        <div className="chart">
          <div className="chart-progress">
            <strong>{known.size}</strong> / {PILLS.length} Known ✓
            <div className="bar"><span style={{ width: `${(known.size / PILLS.length) * 100}%` }} /></div>
          </div>
          {RARITIES.map((r) => {
            const list = PILLS.filter((p) => p.rarity === r);
            const k = list.filter((p) => known.has(p.id)).length;
            return (
              <section key={r} className="chart-group">
                <h4><span className={`rarity-dot r-${r}`} />{RARITY_LABEL[r]} <span className="muted">{k}/{list.length}</span></h4>
                <div className="chart-rows">
                  {list.map((p) => {
                    const isK = known.has(p.id);
                    return (
                      <div key={p.id} className={`chart-row ${isK ? "" : "unknown"}`}>
                        <PillArt pillId={p.id} silhouette={!isK} size={38} />
                        <div className="chart-text">
                          <div className="chart-name">{isK ? <>{p.name} <span className="check">✓</span></> : "???"}</div>
                          {isK ? (
                            <div className="chart-sub">
                              <TypeChips types={p.types} />
                              {p.parents && <span className="recipe">{pillName(p.parents[0])} + {pillName(p.parents[1])}</span>}
                            </div>
                          ) : <div className="chart-sub muted">Undiscovered</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === "drafts" && (
        <div className="drafts">
          {state.drafts.length === 0 && <p className="muted">Nothing yet. Clues will collect here automatically.</p>}
          {state.drafts.length > 0 && unread > 0 && (
            <button className="btn ghost small" onClick={() => act((s) => s.drafts.forEach((d) => (d.read = true)))}>Mark all read</button>
          )}
          {state.drafts.map((d) => (
            <article key={d.id} className={`draft ${d.read ? "" : "unread"}`} onClick={() => !d.read && act((s) => { const x = s.drafts.find((y) => y.id === d.id); if (x) x.read = true; })}>
              <div className="draft-meta">
                <span className={`src src-${d.source}`}>{SOURCE_LABEL[d.source]}</span>
                <span className="muted small">{formatDuration(now - d.at)} ago</span>
              </div>
              <h5>{d.title}</h5>
              <p>{d.body}</p>
              {d.pillId && known.has(d.pillId) && <span className="solved">Solved ✓ — {PILL_BY_ID[d.pillId].name} is Known</span>}
            </article>
          ))}
        </div>
      )}
    </Sheet>
  );
}
