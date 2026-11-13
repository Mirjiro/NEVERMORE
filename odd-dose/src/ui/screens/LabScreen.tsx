import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { BALANCE } from "../../config/balance";
import { PILL_BY_ID } from "../../data/pills";
import {
  collectMachine, incubationMs, incubationView, isKnown, machineCount, scanSpecimen, scannerUnlocked, speedUpCost, speedUpMachine, startMachine,
} from "../../engine/game";
import { previewBreed } from "../../engine/recipes";
import type { Machine } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import type { Tab } from "../App";
import { PillArt } from "../components/PillArt";
import { PillCard } from "../components/PillCard";
import { PillPicker } from "../components/PillPicker";
import { RarityTag, gold, pillName } from "../components/common";
import { sfx } from "../sfx";

/** "2:41" / "1:02:09" — big readable timer. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function LabScreen({ goto, prefill, clearPrefill }: { goto: (t: Tab) => void; prefill: string | null; clearPrefill: () => void }) {
  const { state, toast } = useGame();
  const installed = machineCount(state);
  const freeIdx = state.machines.slice(0, installed).findIndex((m) => !m.job);
  useEffect(() => {
    if (prefill && freeIdx < 0) { toast("All Machines are busy right now.", "bad"); clearPrefill(); }
  }, [prefill, freeIdx, toast, clearPrefill]);

  return (
    <div className="lab">
      <div className="lab-room" aria-hidden>
        <div className="lab-lamp" />
        <div className="lab-shelf">
          <i className="jar j1" /><i className="jar j2" /><i className="jar j3" /><i className="flask" /><i className="jar j4" />
        </div>
      </div>
      <div className="screen-head">
        <h1>Lab</h1>
        <p className="muted">Mix two pills. See what forms.</p>
      </div>
      <div className="machines">
        {state.machines.slice(0, BALANCE.machine.maxMachines).map((m, i) =>
          i < installed ? (
            <MachineCard key={m.id} machine={m} index={i} prefill={i === freeIdx ? prefill : null} clearPrefill={clearPrefill} />
          ) : (
            <button key={m.id} className="machine locked" onClick={() => goto("hq")}>
              <span className="mc-plate">Nº 0{i + 1}</span>
              <span className="lock-ico" aria-hidden>🔒</span>
              <span className="muted small">Unlock at HQ</span>
            </button>
          ),
        )}
      </div>
      <Scanner goto={goto} />
    </div>
  );
}

function MachineCard({ machine, index, prefill, clearPrefill }: { machine: Machine; index: number; prefill: string | null; clearPrefill: () => void }) {
  const { state, now, act, toast, setReveal } = useGame();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [picking, setPicking] = useState<"a" | "b" | null>(null);
  const [phase, setPhase] = useState<"idle" | "inserting" | "opening">("idle");
  const [inserted, setInserted] = useState<[string, string] | null>(null);
  const job = machine.job;
  const ready = !!job && job.endsAt <= now;

  useEffect(() => { if (job && phase !== "inserting") { setA(null); setB(null); } }, [job, phase]);
  useEffect(() => {
    if (!prefill) return;
    if (!a) setA(prefill); else if (!b) setB(prefill);
    clearPrefill();
  }, [prefill, a, b, clearPrefill]);
  const wasReady = useRef(ready);
  useEffect(() => { if (ready && !wasReady.current) sfx.ready(); wasReady.current = ready; }, [ready]);

  const preview = a && b ? previewBreed(a, b) : null;
  let verdict = "", tone = "";
  let etaPill: string | null = null;
  if (preview) {
    if (preview.kind === "none") { verdict = "No reaction"; tone = "warn"; }
    else if (preview.kind === "identical") { verdict = `Makes another ${pillName(preview.resultId)}`; etaPill = preview.resultId; }
    else if (preview.kind === "shared") verdict = `Makes ${pillName(preview.options[0])} or ${pillName(preview.options[1])}`;
    else if (isKnown(state, preview.resultId)) { verdict = `Makes ${pillName(preview.resultId)}`; etaPill = preview.resultId; }
    else { verdict = "Something new?"; tone = "mystery"; }
  }

  const start = () => {
    if (!a || !b) return;
    const r = act((s, t, rng) => startMachine(s, machine.id, a, b, t, rng));
    if (!r) return;
    if (r.kind === "none") { sfx.error(); toast("No reaction. Your pills are safe.", "bad"); return; }
    setInserted([a, b]);
    setPhase("inserting");
    sfx.insert();
    setTimeout(() => sfx.close(), 650);
    setTimeout(() => sfx.hum(), 900);
    setTimeout(() => { setPhase("idle"); setInserted(null); }, 1700);
  };
  const collect = () => {
    if (phase === "opening") return;
    setPhase("opening");
    sfx.close();
    setTimeout(() => {
      const rev = act((s, t) => collectMachine(s, machine.id, t));
      setPhase("idle");
      if (rev) setReveal({ kind: "machine", reveal: rev });
    }, 700);
  };

  const progress = job ? Math.min(1, (now - job.startedAt) / (job.endsAt - job.startedAt)) : 0;
  const view = job ? incubationView(state, job) : null;
  const status = !job ? "available" : ready ? "ready" : "working";
  const cost = job ? speedUpCost(job.endsAt, now) : 0;
  const lamps = status === "available" ? 1 : status === "ready" ? 3 : 1 + Math.floor(progress * 2);

  return (
    <div className={`machine mc ${status} ${phase}`} style={{ "--p": progress } as CSSProperties}>
      <div className="mc-top">
        <span className="mc-plate">Nº 0{index + 1}</span>
        <span className="mc-lamps" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className={i < lamps ? "on" : ""} />)}</span>
        <span className="mc-status">{status === "available" ? "Ready to mix" : status === "ready" ? "Done!" : "Incubating"}</span>
      </div>

      <div className="mc-window">
        <div className="mc-light" />
        <div className="mc-particles" aria-hidden>{Array.from({ length: 9 }).map((_, i) => <i key={i} />)}</div>
        <div className="mc-contents">
          {phase === "inserting" && inserted ? (
            <div className="mc-arrive"><PillArt pillId={inserted[0]} size={60} /><PillArt pillId={inserted[1]} size={60} /></div>
          ) : job && !ready ? (
            view!.known
              ? <div className="mc-forming known"><PillArt pillId={view!.pillId!} size={96} /></div>
              : <div className="mc-forming mystery"><span className="mist" /><span className="mist m2" /><span className="orb" /></div>
          ) : job && ready ? (
            view!.known
              ? <div className="mc-done"><PillArt pillId={view!.pillId!} size={110} /></div>
              : <div className="mc-done mystery"><span className="orb big" /><span className="q">?</span></div>
          ) : (
            <div className="mc-idle-glow" />
          )}
        </div>
        <div className="mc-glass" />
        <div className="mc-doors" aria-hidden><i /><i /></div>
      </div>

      {!job && (
        <div className="mc-tray">
          <button className={`cradle ${a ? "filled" : ""}`} onClick={() => setPicking("a")} aria-label="Choose pill A">
            {a ? <PillArt pillId={a} size={72} /> : <span>+</span>}
          </button>
          <span className="tray-plus" aria-hidden>+</span>
          <button className={`cradle ${b ? "filled" : ""}`} onClick={() => setPicking("b")} aria-label="Choose pill B">
            {b ? <PillArt pillId={b} size={72} /> : <span>+</span>}
          </button>
        </div>
      )}

      <div className="mc-console">
        {!job && (
          <>
            <div className="lcd">
              {a && b ? (
                <><span className={`verdict ${tone}`}>{verdict}</span>{etaPill && <span className="lcd-sub">{clock(incubationMs(state, PILL_BY_ID[etaPill].rarity))}</span>}</>
              ) : <span className="lcd-sub">Add two pills to the tray</span>}
            </div>
            <button className="btn start" disabled={!a || !b || preview?.kind === "none"} onClick={start}>Start</button>
          </>
        )}
        {job && !ready && (
          <>
            <div className="lcd">
              <span className="timer-big">{clock(job.endsAt - now)}</span>
              <span className="lcd-sub">{view!.label}</span>
              <span className="brass-bar"><span style={{ width: `${progress * 100}%` }} /></span>
            </div>
            <button className="btn ghost-dark small" disabled={state.cash < cost} onClick={() => act((s, t) => speedUpMachine(s, machine.id, t))}>Finish · {gold(cost)}</button>
          </>
        )}
        {job && ready && (
          <>
            <div className="lcd"><span className="timer-big amber">Ready!</span><span className="lcd-sub">{view!.known ? pillName(view!.pillId!) : "Something new is waiting"}</span></div>
            <button className="btn start pulse" onClick={collect}>Open</button>
          </>
        )}
      </div>

      <PillPicker open={picking !== null} onClose={() => setPicking(null)} title="Pick a pill"
        other={picking === "a" ? b : a} onPick={(id) => { sfx.tap(); if (picking === "a") setA(id); else setB(id); }} />
    </div>
  );
}

function Scanner({ goto }: { goto: (t: Tab) => void }) {
  const { state, act, toast } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const unlocked = scannerUnlocked(state);
  const unknowns = state.specimens.filter((x) => !x.identified);
  const { cashCost, outcomes } = BALANCE.scanner;
  const total = Object.values(outcomes).reduce((x, y) => x + y, 0);
  const selSpec = unknowns.find((x) => x.id === sel);
  const pct = (k: keyof typeof outcomes) => Math.round((outcomes[k] / total) * 100);

  const scan = () => {
    if (!selSpec || scanning) return;
    setScanning(true);
    sfx.hum();
    setTimeout(() => {
      const r = act((s, t, rng) => scanSpecimen(s, selSpec.id, t, rng));
      setScanning(false);
      if (!r) return;
      if (r.kind === "identify") { sfx.reveal(); toast(`It's ${pillName(r.pillId)}!${r.isNew ? " New Pill!" : ""}`, "good"); }
      else if (r.kind === "clue") { sfx.tap(); toast("Found a clue — saved to your Notebook.", "info"); }
      else if (r.kind === "transform") { sfx.tap(); toast(r.identified ? `It changed into ${pillName(r.pillId)}!` : "It changed into something else…", "info"); }
      else { sfx.error(); toast("It crumbled to dust.", "bad"); }
      setSel(null);
    }, 1400);
  };

  return (
    <section className={`scanner ${unlocked ? "" : "locked"} ${scanning ? "scanning" : ""}`}>
      <div className="scanner-head">
        <div><h2>Scanner</h2><p className="muted small">What's inside a <b className="q-chip">?</b> pill</p></div>
        {unlocked && <div className="scanner-cost">{gold(cashCost)} per scan</div>}
      </div>
      {!unlocked ? (
        <button className="locked-note" onClick={() => goto("hq")}><span>🔒 Unlock the Scanner at HQ</span><span aria-hidden>→</span></button>
      ) : (
        <>
          <div className="scan-bed">
            <div className="scan-beam" />
            {selSpec ? <PillArt pillId={selSpec.pillId} unknown size={120} /> : <span className="muted">{unknowns.length ? "Pick a ? pill below" : "No ? pills yet"}</span>}
          </div>
          <div className="odds-icons">
            <span className="good">✓ Identify <b>{pct("identify")}%</b></span>
            <span>✎ Clue <b>{pct("clue")}%</b></span>
            <span>↻ Change <b>{pct("transform")}%</b></span>
            <span className="warn">✕ Crumble <b>{pct("destroy")}%</b></span>
          </div>
          {unknowns.length > 0 ? (
            <div className="specimen-strip">
              {unknowns.map((x) => (
                <PillCard key={x.id} pillId={x.pillId} unknown variant="compact" selected={sel === x.id} disabled={!!x.reservedBy}
                  note={PILL_BY_ID[x.pillId].rarity === "common" ? undefined : `${PILL_BY_ID[x.pillId].rarity} signal`} onClick={() => { sfx.tap(); setSel(x.id); }} />
              ))}
            </div>
          ) : <p className="muted small">Unlabeled mail parcels can contain ? pills. Known ✓ pills can't be scanned.</p>}
          <button className="btn primary wide" disabled={!selSpec || scanning || state.cash < cashCost} onClick={scan}>
            {scanning ? "Scanning…" : "Scan"}
          </button>
          {selSpec && <p className="muted small center">Signal: <RarityTag rarity={PILL_BY_ID[selSpec.pillId].rarity} /></p>}
        </>
      )}
    </section>
  );
}
