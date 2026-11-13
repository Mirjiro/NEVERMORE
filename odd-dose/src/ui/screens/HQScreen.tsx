import { useState } from "react";
import type { ReactNode } from "react";
import { BALANCE } from "../../config/balance";
import { UPGRADES } from "../../config/upgrades";
import type { UpgradeDef } from "../../config/upgrades";
import { PILLS, PILL_BY_ID } from "../../data/pills";
import {
  backdoorUnlocked, buyUpgrade, companyLevel, companyValue, levelProgress, machineCount, scannerUnlocked, upgradeNextTier, upgradeTier,
} from "../../engine/game";
import type { GameState } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import { exportSave, importSave } from "../../store/persistence";
import { PillArt } from "../components/PillArt";
import { gold } from "../components/common";
import { isMuted, setMuted, sfx } from "../sfx";
import { Backdoor } from "./Backdoor";

const RANKS = ["Garage Startup", "Garage Startup", "Corner Lab", "Corner Lab", "Boutique Pharmacy", "Boutique Pharmacy", "Feelings Company", "Feelings Company", "Emotion Empire", "Emotion Empire"];

const MILESTONES: { id: string; label: string; done: (s: GameState) => boolean }[] = [
  { id: "ship1", label: "First shipment", done: (s) => s.stats.shipments >= 1 },
  { id: "disc10", label: "10 pills discovered", done: (s) => s.known.length >= 10 },
  { id: "star", label: "First ★ pill", done: (s) => Object.values(s.discovery).some((d) => d.bestStar > 0) },
  { id: "ship10", label: "10 shipments", done: (s) => s.stats.shipments >= 10 },
  { id: "epic", label: "First Epic", done: (s) => s.known.some((id) => PILL_BY_ID[id].rarity === "epic") },
  { id: "disc25", label: "25 pills discovered", done: (s) => s.known.length >= 25 },
  { id: "lv5", label: "Level 5", done: (s) => companyLevel(s) >= 5 },
  { id: "legend", label: "First Legendary", done: (s) => s.known.some((id) => PILL_BY_ID[id].rarity === "legendary") },
  { id: "secret", label: "A Secret pill", done: (s) => s.known.some((id) => PILL_BY_ID[id].rarity === "secret") },
  { id: "all", label: "All 49 pills", done: (s) => s.known.length >= PILLS.length },
];

/** Small illustrated icons for equipment cards (placeholders until final art). */
function EquipArt({ id }: { id: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    machines: <><path {...common} d="M10 36V20a14 14 0 0 1 28 0v16" /><rect {...common} x="6" y="36" width="36" height="8" rx="2" /><circle cx="24" cy="24" r="5" fill="currentColor" opacity=".25" /></>,
    incubation: <><circle {...common} cx="24" cy="26" r="14" /><path {...common} d="M24 26l7-6M24 8v4" /><path {...common} d="M14 34h20" opacity=".5" /></>,
    scanner: <><rect {...common} x="8" y="10" width="32" height="28" rx="6" /><path stroke="currentColor" strokeWidth="2.5" d="M12 24h24" opacity=".8" /><text x="24" y="33" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">?</text></>,
    copierSpeed: <><circle {...common} cx="24" cy="24" r="9" /><path {...common} d="M24 8v5M24 35v5M8 24h5M35 24h5M13 13l3.5 3.5M31.5 31.5L35 35M13 35l3.5-3.5M31.5 16.5L35 13" /></>,
    copierBatch: <><rect {...common} x="6" y="28" width="36" height="12" rx="3" /><ellipse cx="16" cy="25" rx="5" ry="3" fill="currentColor" opacity=".4" /><ellipse cx="26" cy="22" rx="5" ry="3" fill="currentColor" opacity=".55" /><ellipse cx="33" cy="26" rx="5" ry="3" fill="currentColor" opacity=".35" /></>,
    sales: <><rect {...common} x="8" y="16" width="32" height="22" rx="3" /><path {...common} d="M18 16v-4h12v4M8 26h32" /></>,
    pr: <><path {...common} d="M10 20v8l20 8V12L10 20zM30 18a6 6 0 0 1 0 12M14 28l2 9h5l-2-8" /></>,
    backdoor: <><circle {...common} cx="16" cy="24" r="7" /><path {...common} d="M23 24h18M35 24v6M40 24v4" /></>,
  };
  return <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>{paths[id]}</svg>;
}

export function HQScreen() {
  const { state, act, toast, replaceState, resetGame } = useGame();
  const [view, setView] = useState<"hq" | "backdoor">("hq");
  const [saveCode, setSaveCode] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [justBought, setJustBought] = useState<string | null>(null);
  if (view === "backdoor") return <Backdoor onExit={() => setView("hq")} />;

  const lv = companyLevel(state);
  const lp = levelProgress(state);
  const value = companyValue(state);
  const done = MILESTONES.filter((m) => m.done(state));
  const hour = new Date().getHours();
  const sky = hour < 6 || hour >= 20 ? "night" : hour < 9 ? "dawn" : hour >= 17 ? "dusk" : "day";
  const showcase = [...state.known].map((id) => PILL_BY_ID[id]).sort((a, b) => ["common", "rare", "epic", "legendary", "secret"].indexOf(b.rarity) - ["common", "rare", "epic", "legendary", "secret"].indexOf(a.rarity)).slice(0, Math.min(5, 1 + Math.floor(lv / 2)));

  const buy = (u: UpgradeDef) => {
    const t = act((s) => buyUpgrade(s, u.id));
    if (!t) { sfx.error(); return; }
    sfx.upgrade();
    setJustBought(u.id);
    setTimeout(() => setJustBought(null), 1200);
    toast(`${u.id === "machines" ? `Machine 0${upgradeTier(state, "machines") + 2}` : u.name} installed!`, "good");
  };

  return (
    <div className="hq">
      {/* Office scene — fills in as the company grows */}
      <section className={`office sky-${sky} lv-${Math.min(lv, 10)}`}>
        <div className="office-light" aria-hidden />
        <div className="window"><span className="sun" /><span className="city" /></div>
        <div className="wall-sign"><span>ODD</span><b>DOSE</b><small>est. {new Date(state.createdAt).getFullYear()}</small></div>
        {upgradeTier(state, "pr") > 0 && <div className="poster" aria-hidden><b>FEEL</b>SOMETHING</div>}
        {upgradeTier(state, "incubation") > 0 && <div className="wall-gauge" aria-hidden><i style={{ transform: `rotate(${-60 + upgradeTier(state, "incubation") * 40}deg)` }} /></div>}
        <div className="frames">{done.slice(0, 5).map((m) => <span key={m.id} className="frame" title={m.label} />)}</div>
        <div className="office-shelf">
          {showcase.map((p) => <span key={p.id} className="shelf-pill"><PillArt pillId={p.id} size={34} /></span>)}
        </div>
        <div className="office-floor">
          {Array.from({ length: machineCount(state) }).map((_, i) => <span key={i} className="mini-machine" />)}
          <span className={`mini-copier t${upgradeTier(state, "copierBatch")}`}>{upgradeTier(state, "copierSpeed") > 0 && <i className="gear" />}</span>
          {scannerUnlocked(state) && <span className="mini-scanner" />}
          {upgradeTier(state, "sales") > 0 && <span className="briefcase" />}
          {lv >= 2 && <span className="office-plant" />}
          {backdoorUnlocked(state) && <span className="secret-door" />}
        </div>
        <div className="office-title">
          <div className="company">ODD DOSE <span>· {RANKS[Math.min(lv, 10) - 1]}</span></div>
          <div className="worth">{gold(value.total)} <small>company worth</small></div>
          <div className="lvl-line"><span className="lvl-pill">Level {lv}</span>
            <span className="lvl-track"><span style={{ width: `${lp.need ? (lp.into / lp.need) * 100 : 100}%` }} /></span>
          </div>
        </div>
      </section>

      <div className="hq-stats">
        <div className="hq-stat"><span className="lbl">Gold</span><b>{gold(state.cash)}</b></div>
        <div className="hq-stat"><span className="lbl">Milestones</span><b>{done.length}<small>/{MILESTONES.length}</small></b></div>
        <div className="hq-stat"><span className="lbl">Popularity</span><b className="hearts">{"♥".repeat(Math.max(1, Math.ceil(state.popularity / 20)))}<i>{"♥".repeat(5 - Math.max(1, Math.ceil(state.popularity / 20)))}</i></b></div>
      </div>

      <h2 className="hq-h">Equipment</h2>
      <div className="equip-grid">
        {UPGRADES.map((u) => {
          const owned = upgradeTier(state, u.id);
          const next = upgradeNextTier(state, u.id);
          const needLevel = next ? Math.max(next.level, u.id === "backdoor" ? BALANCE.market.unlockLevel : 0) : 0;
          const locked = !!next && lv < needLevel;
          const title = u.id === "machines" ? `Machine 0${Math.min(owned + 2, BALANCE.machine.maxMachines)}` : u.name;
          return (
            <div key={u.id} className={`equip ${next ? "" : "owned"} ${locked ? "locked" : ""} ${justBought === u.id ? "bought" : ""} g-${u.group.toLowerCase()}`}>
              <div className="equip-art"><EquipArt id={u.id} /></div>
              <div className="equip-body">
                <h3>{title}</h3>
                <p>{u.desc}</p>
                {u.tiers.length > 1 && <span className="pips">{u.tiers.map((_, i) => <i key={i} className={i < owned ? "on" : ""} />)}</span>}
              </div>
              {next ? (
                <button className="btn equip-buy" disabled={locked || state.cash < next.cost} onClick={() => buy(u)}>
                  {locked ? `🔒 Lv ${needLevel}` : gold(next.cost)}
                </button>
              ) : <span className="owned-tag">✓ Owned</span>}
            </div>
          );
        })}
      </div>

      <section className={`backdoor-door ${backdoorUnlocked(state) ? "open" : ""}`} onClick={() => backdoorUnlocked(state) && setView("backdoor")}>
        <div className="door-art" aria-hidden />
        <div><h2>BACKDOOR</h2><p className="small">{backdoorUnlocked(state) ? "Someone left the door ajar…" : `Locked. Needs Level ${BALANCE.market.unlockLevel} and the key.`}</p></div>
        <span className="door-go">{backdoorUnlocked(state) ? "Enter →" : "🔒"}</span>
      </section>

      <h2 className="hq-h">Milestones <span className="muted small">{done.length}/{MILESTONES.length}</span></h2>
      <div className="milestones">
        {MILESTONES.map((m) => <span key={m.id} className={`milestone ${m.done(state) ? "done" : ""}`}>{m.done(state) ? "✓" : "○"} {m.label}</span>)}
      </div>

      <details className="panel-details">
        <summary>Reports</summary>
        <ValueChart data={state.valueHistory.map((h) => h.value)} />
        <div className="breakdown">
          <span>Gold <b>{gold(value.cash)}</b></span>
          <span>Inventory <b>{gold(value.inventory)}</b></span>
          <span>Equipment <b>{gold(value.equipment)}</b></span>
          <span>Discoveries <b>{gold(value.discoveries)}</b></span>
          <span>Performance <b>{gold(value.performance)}</b></span>
          <span>Popularity <b>{Math.round(state.popularity)}/100</b></span>
          <span>XP <b>{state.xp}</b></span>
        </div>
        <div className="breakdown">
          <span>Shipments <b>{state.stats.shipments}</b></span>
          <span>Revenue <b>{gold(state.stats.revenue)}</b></span>
          <span>Pills made <b>{state.stats.pillsMade}</b></span>
          <span>Machine runs <b>{state.stats.machineRuns}</b></span>
          <span>Copier runs <b>{state.stats.copierRuns}</b></span>
          <span>Scans <b>{state.stats.scans}</b></span>
          <span>Mail opened <b>{state.stats.mailOpened}</b></span>
        </div>
      </details>

      <details className="panel-details">
        <summary>Settings</summary>
        <div className="settings-row">
          <span>Sound</span>
          <button className="btn ghost small" onClick={() => { setMuted(!muted); setMutedState(!muted); if (muted) sfx.tap(); }}>{muted ? "🔇 Off" : "🔊 On"}</button>
        </div>
        <div className="save-tools">
          <button className="btn ghost small" onClick={() => { const c = exportSave(state); setSaveCode(c); navigator.clipboard?.writeText(c).then(() => toast("Save code copied.", "good"), () => {}); }}>Export save</button>
          <button className="btn ghost small" disabled={!saveCode.trim()} onClick={() => { try { replaceState(importSave(saveCode)); toast("Save loaded.", "good"); setSaveCode(""); } catch { toast("That code doesn't work.", "bad"); } }}>Import save</button>
          <button className={`btn small ${confirmReset ? "danger" : "ghost"}`} onClick={() => { if (confirmReset) { resetGame(); setConfirmReset(false); toast("A fresh start.", "info"); } else setConfirmReset(true); }}>{confirmReset ? "Tap again to reset" : "Reset game"}</button>
        </div>
        <textarea className="save-code mono" placeholder="Paste a save code here to import." value={saveCode} onChange={(e) => setSaveCode(e.target.value)} rows={2} />
      </details>
    </div>
  );
}

function ValueChart({ data }: { data: number[] }) {
  const W = 640, H = 140, P = 8;
  if (data.length < 2) return <p className="muted small center">The chart fills in over time.</p>;
  const min = Math.min(...data) * 0.95, max = Math.max(...data) * 1.03;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const d = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="value-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Company worth over time">
      <path d={`${d} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`} className="area" />
      <path d={d} className="line" />
    </svg>
  );
}
