import { useEffect, useState } from "react";
import { BALANCE } from "../config/balance";
import { companyLevel, levelProgress, msUntilNextCharge } from "../engine/game";
import { useGame } from "../store/GameContext";
import { formatDuration, money } from "./components/common";
import { Notebook } from "./components/Notebook";
import { RevealOverlay } from "./components/RevealOverlay";
import { DeskScreen } from "./screens/DeskScreen";
import { HQScreen } from "./screens/HQScreen";
import { LabScreen } from "./screens/LabScreen";
import { VaultScreen } from "./screens/VaultScreen";

export type Tab = "desk" | "lab" | "vault" | "hq";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "desk", label: "Desk", icon: "M4 6h16M4 6v12h16V6M8 10h8M8 14h5" },
  { id: "lab", label: "Lab", icon: "M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7.5 15h9" },
  { id: "vault", label: "Vault", icon: "M4 5h16v14H4zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 12h3M7 5v14" },
  { id: "hq", label: "HQ", icon: "M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h.01M15 10h.01" },
];

export function App() {
  const { state, now, toasts } = useGame();
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("oddDose.tab") as Tab) || "desk");
  const [notebook, setNotebook] = useState(false);
  const [machinePill, setMachinePill] = useState<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem("oddDose.tab", tab); } catch { /* ignore */ }
    window.scrollTo({ top: 0 });
  }, [tab]);

  const lp = levelProgress(state);
  const nextCharge = msUntilNextCharge(state, now);
  const readyCount = state.machines.filter((m) => m.job && m.job.endsAt <= now).length + (state.copier && state.copier.endsAt <= now ? 1 : 0);
  const openOrders = state.orders.filter((o) => o.status === "open").length;
  const unreadDrafts = state.drafts.filter((d) => !d.read).length;
  const badges: Partial<Record<Tab, number>> = {
    desk: state.news.filter((n) => !n.read).length + openOrders + state.mail.filter((m) => m.status === "sealed").length,
    lab: readyCount,
    vault: state.copier && state.copier.endsAt <= now ? 1 : 0,
  };

  return (
    <div className={`app tab-${tab}`}>
      <header className="topbar">
        <div className="brand">
          <span className="logo">ODD<span>DOSE</span></span>
          <span className="lvl" title={`${state.xp} XP`}>
            Lv {companyLevel(state)}
            <span className="lvl-bar"><span style={{ width: `${lp.need ? (lp.into / lp.need) * 100 : 100}%` }} /></span>
          </span>
        </div>
        <div className="resources">
          <div className="res cash" title="Cash"><span className="res-label">Cash</span><span className="res-val">{money(state.cash)}</span></div>
          <div className="res charge" title={nextCharge === null ? "Charge full" : `+1 in ${formatDuration(nextCharge)}`}>
            <span className="res-label">Charge</span>
            <span className="res-val"><span className="bolt">ϟ</span>{state.charge}<small>/{BALANCE.charge.max}</small></span>
          </div>
        </div>
      </header>

      <main className="screen" key={tab}>
        {tab === "desk" && <DeskScreen />}
        {tab === "lab" && <LabScreen goto={setTab} prefill={machinePill} clearPrefill={() => setMachinePill(null)} />}
        {tab === "vault" && <VaultScreen goto={setTab} useInMachine={(id) => { setMachinePill(id); setTab("lab"); }} />}
        {tab === "hq" && <HQScreen />}
      </main>

      <button className="notebook-fab" onClick={() => setNotebook(true)} aria-label="Open Notebook">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3v18M9 8h7M9 12h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        <span>Notebook</span>
        {unreadDrafts > 0 && <b className="dot">{unreadDrafts}</b>}
      </button>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" width="22" height="22"><path d={t.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{t.label}</span>
            {!!badges[t.id] && <b className="dot">{badges[t.id]}</b>}
          </button>
        ))}
      </nav>

      <Notebook open={notebook} onClose={() => setNotebook(false)} />
      <RevealOverlay />

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>)}
      </div>
    </div>
  );
}
