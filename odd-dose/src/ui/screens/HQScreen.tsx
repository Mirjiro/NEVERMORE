import { useState } from "react";
import { BALANCE } from "../../config/balance";
import { UPGRADES } from "../../config/upgrades";
import { PILLS } from "../../data/pills";
import {
  backdoorUnlocked, buyUpgrade, companyLevel, companyValue, levelProgress, machineCount, upgradeNextTier, upgradeTier,
} from "../../engine/game";
import { useGame } from "../../store/GameContext";
import { exportSave, importSave } from "../../store/persistence";
import { money } from "../components/common";
import { Backdoor } from "./Backdoor";

export function HQScreen() {
  const { state, act, toast, replaceState, resetGame } = useGame();
  const [view, setView] = useState<"hq" | "backdoor">("hq");
  const [saveCode, setSaveCode] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const lv = companyLevel(state);
  const lp = levelProgress(state);
  const value = companyValue(state);
  const hist = state.valueHistory.map((h) => h.value);

  if (view === "backdoor") return <Backdoor onExit={() => setView("hq")} />;

  return (
    <div className="hq">
      <div className="screen-head">
        <h1>Headquarters</h1>
        <p className="muted">ODD DOSE Holdings · {machineCount(state)} Machine{machineCount(state) > 1 ? "s" : ""} · 1 Copier</p>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Cash</span>
          <span className="kpi-val">{money(state.cash)}</span>
          <span className="kpi-sub">Spendable</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Company value</span>
          <span className="kpi-val">{money(value.total)}</span>
          <span className="kpi-sub">Not spendable</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Popularity</span>
          <span className="kpi-val">{Math.round(state.popularity)}<small>/100</small></span>
          <span className="meter"><i style={{ width: `${state.popularity}%` }} /></span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Level</span>
          <span className="kpi-val">{lv}</span>
          <span className="meter"><i style={{ width: `${lp.need ? (lp.into / lp.need) * 100 : 100}%` }} /></span>
          <span className="kpi-sub">{lp.need ? `${lp.into} / ${lp.need} XP` : "Max level"}</span>
        </div>
      </div>

      <section className="panel chart-panel">
        <div className="panel-head"><h2>Company value</h2><span className="muted small">last {hist.length} readings</span></div>
        <ValueChart data={hist} />
        <div className="breakdown">
          <span>Cash <b>{money(value.cash)}</b></span>
          <span>Inventory <b>{money(value.inventory)}</b></span>
          <span>Equipment <b>{money(value.equipment)}</b></span>
          <span>Discoveries <b>{money(value.discoveries)}</b></span>
          <span>Performance <b>{money(value.performance)}</b></span>
        </div>
      </section>

      <section className={`panel backdoor-door ${backdoorUnlocked(state) ? "open" : ""}`}>
        <div>
          <h2>BACKDOOR</h2>
          <p className="small">{backdoorUnlocked(state) ? "The underground market is open for business." : `A simulated underground market. Requires Level ${BALANCE.market.unlockLevel} and the BACKDOOR Access upgrade.`}</p>
        </div>
        <button className="btn dark" disabled={!backdoorUnlocked(state)} onClick={() => setView("backdoor")}>{backdoorUnlocked(state) ? "Enter →" : "Locked"}</button>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Upgrades</h2></div>
        <div className="upgrades">
          {UPGRADES.map((u) => {
            const owned = upgradeTier(state, u.id);
            const next = upgradeNextTier(state, u.id);
            const needLevel = next ? Math.max(next.level, u.id === "backdoor" ? BALANCE.market.unlockLevel : 0) : 0;
            const lockedByLevel = next && lv < needLevel;
            return (
              <div key={u.id} className={`upgrade ${next ? "" : "maxed"}`}>
                <div className="up-top">
                  <span className="up-group">{u.group}</span>
                  <span className="pips">{u.tiers.map((_, i) => <i key={i} className={i < owned ? "on" : ""} />)}</span>
                </div>
                <h3>{u.name}</h3>
                <p className="muted small">{u.desc}</p>
                {next ? (
                  <button className="btn primary" disabled={!!lockedByLevel || state.cash < next.cost}
                    onClick={() => { const t = act((s) => buyUpgrade(s, u.id)); if (t) toast(`${u.name}: ${t.label}`, "good"); }}>
                    {lockedByLevel ? `Requires Lv ${needLevel}` : `${next.label} · ${money(next.cost)}`}
                  </button>
                ) : <span className="owned">Fully upgraded ✓</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Company records</h2></div>
        <div className="records">
          <span>Shipments <b>{state.stats.shipments}</b></span>
          <span>Revenue <b>{money(state.stats.revenue)}</b></span>
          <span>Pills made <b>{state.stats.pillsMade}</b></span>
          <span>Machine runs <b>{state.stats.machineRuns}</b></span>
          <span>Copier runs <b>{state.stats.copierRuns}</b></span>
          <span>Scans <b>{state.stats.scans}</b></span>
          <span>Mail opened <b>{state.stats.mailOpened}</b></span>
          <span>Collection <b>{state.known.length}/{PILLS.length}</b></span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Save data</h2><span className="muted small">Auto-saves on this device</span></div>
        <div className="save-tools">
          <button className="btn ghost" onClick={() => { const c = exportSave(state); setSaveCode(c); navigator.clipboard?.writeText(c).then(() => toast("Save code copied.", "good"), () => {}); }}>Export save</button>
          <button className="btn ghost" disabled={!saveCode.trim()} onClick={() => { try { replaceState(importSave(saveCode)); toast("Save imported.", "good"); setSaveCode(""); } catch { toast("That save code isn't valid.", "bad"); } }}>Import save</button>
          <button className={`btn ${confirmReset ? "danger" : "ghost"}`} onClick={() => { if (confirmReset) { resetGame(); setConfirmReset(false); toast("New company founded.", "info"); } else setConfirmReset(true); }}>{confirmReset ? "Tap again to reset" : "Reset game"}</button>
        </div>
        <textarea className="save-code mono" placeholder="Export to get a code, or paste a code here to import." value={saveCode} onChange={(e) => setSaveCode(e.target.value)} rows={3} />
      </section>
    </div>
  );
}

function ValueChart({ data }: { data: number[] }) {
  const W = 640, H = 170, P = 8;
  if (data.length < 2) return <div className="chart-empty muted small">The chart fills in as your company grows (a reading every 10 minutes).</div>;
  const min = Math.min(...data) * 0.95, max = Math.max(...data) * 1.03;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const d = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="value-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Company value over time">
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} className="grid" />)}
      <path d={`${d} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`} className="area" />
      <path d={d} className="line" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="4" className="end" />
    </svg>
  );
}
