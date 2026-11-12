import { useEffect, useRef, useState } from "react";
import { BALANCE } from "../../config/balance";
import { PILL_BY_ID } from "../../data/pills";
import {
  collectMachine, incubationMs, isKnown, machineCount, scanSpecimen, scannerUnlocked, speedUpCost, speedUpMachine, startMachine,
} from "../../engine/game";
import { previewBreed } from "../../engine/recipes";
import type { Machine } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import type { Tab } from "../App";
import { PillArt } from "../components/PillArt";
import { PillCard } from "../components/PillCard";
import { PillPicker } from "../components/PillPicker";
import { RarityTag, money, pillName } from "../components/common";
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
      <div className="screen-head">
        <h1>Lab</h1>
        <p className="muted">Mix two pills. Get a new one.</p>
      </div>
      <div className="machines">
        {state.machines.slice(0, BALANCE.machine.maxMachines).map((m, i) =>
          i < installed ? (
            <MachineCard key={m.id} machine={m} index={i} prefill={i === freeIdx ? prefill : null} clearPrefill={clearPrefill} />
          ) : (
            <button key={m.id} className="machine locked" onClick={() => goto("hq")}>
              <span className="machine-plate">Machine 0{i + 1}</span>
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
  const job = machine.job;
  const ready = !!job && job.endsAt <= now;

  useEffect(() => { if (job) { setA(null); setB(null); } }, [job]);
  useEffect(() => {
    if (!prefill) return;
    if (!a) setA(prefill); else if (!b) setB(prefill);
    clearPrefill();
  }, [prefill, a, b, clearPrefill]);
  const wasReady = useRef(ready);
  useEffect(() => { if (ready && !wasReady.current) sfx.ready(); wasReady.current = ready; }, [ready]);

  const preview = a && b ? previewBreed(a, b) : null;
  let previewText = "", previewTone = "";
  if (preview) {
    if (preview.kind === "none") { previewText = "No reaction"; previewTone = "warn"; }
    else if (preview.kind === "identical") previewText = `Makes another ${pillName(preview.resultId)}`;
    else if (preview.kind === "shared") previewText = `Makes ${pillName(preview.options[0])} or ${pillName(preview.options[1])}`;
    else if (isKnown(state, preview.resultId)) previewText = `Makes ${pillName(preview.resultId)}`;
    else { previewText = "Something new?"; previewTone = "mystery"; }
  }
  const etaRarity = preview && (preview.kind === "recipe" || preview.kind === "identical") ? PILL_BY_ID[preview.resultId].rarity : null;

  const start = () => {
    if (!a || !b) return;
    const r = act((s, t, rng) => startMachine(s, machine.id, a, b, t, rng));
    if (!r) return;
    if (r.kind === "none") { sfx.error(); toast("No reaction. Your pills are safe.", "bad"); return; }
    sfx.insert();
    setTimeout(() => sfx.close(), 450);
    setPhase("inserting");
    setTimeout(() => setPhase("idle"), 1200);
  };
  const collect = () => {
    if (phase === "opening") return;
    setPhase("opening");
    sfx.close();
    setTimeout(() => {
      const rev = act((s, t) => collectMachine(s, machine.id, t));
      setPhase("idle");
      if (rev) setReveal({ kind: "machine", reveal: rev });
    }, 600);
  };

  const progress = job ? Math.min(1, (now - job.startedAt) / (job.endsAt - job.startedAt)) : 0;
  const resultKnown = job && isKnown(state, job.resultPillId);
  const status = !job ? "available" : ready ? "ready" : "working";
  const cost = job ? speedUpCost(job.endsAt, now) : 0;

  return (
    <div className={`machine ${status} ${phase}`}>
      <div className="machine-cap">
        <span className="machine-plate">Machine 0{index + 1}</span>
        <span className="vents" aria-hidden><i /><i /><i /><i /></span>
        <span className={`status-led ${status}`}><i />{status === "available" ? "Ready to mix" : status === "ready" ? "Done!" : "Working"}</span>
      </div>

      <div className="machine-core">
        <div className="pipe left" aria-hidden />
        <div className="pipe right" aria-hidden />
        <div className="chamber">
          <div className="glass" />
          <div className="chamber-floor" />
          <div className="bubbles" aria-hidden><i /><i /><i /><i /><i /></div>
          {job ? (
            <div className="chamber-contents">
              {phase === "inserting" ? (
                <div className="drop-in"><PillArt pillId={job.parentPillIds[0]} size={64} /><PillArt pillId={job.parentPillIds[1]} size={64} /></div>
              ) : !ready ? (
                <div className="parents-in"><PillArt pillId={job.parentPillIds[0]} size={44} /><PillArt pillId={job.parentPillIds[1]} size={44} /></div>
              ) : (
                <div className="result-glow"><PillArt pillId={job.resultPillId} silhouette={!resultKnown} size={92} /></div>
              )}
            </div>
          ) : (
            <div className="slots">
              <button className={`slot ${a ? "filled" : ""}`} onClick={() => setPicking("a")} aria-label="Choose pill A">
                {a ? <PillArt pillId={a} size={76} /> : <span>+</span>}
              </button>
              <button className={`slot ${b ? "filled" : ""}`} onClick={() => setPicking("b")} aria-label="Choose pill B">
                {b ? <PillArt pillId={b} size={76} /> : <span>+</span>}
              </button>
            </div>
          )}
          <div className="iris" aria-hidden><i /><i /></div>
        </div>
        <div className="gauge" aria-hidden><i style={{ transform: `rotate(${-120 + progress * 240}deg)` }} /></div>
      </div>

      <div className="console">
        {!job && (
          <>
            <div className="readout">
              {a && b ? (
                <><span className="pair">{pillName(a)} + {pillName(b)}</span><span className={`verdict ${previewTone}`}>{previewText}</span>
                  {etaRarity && <span className="muted small">{clock(incubationMs(state, etaRarity))}</span>}</>
              ) : <span className="muted">Tap the two slots to add pills</span>}
            </div>
            <button className="btn start" disabled={!a || !b || preview?.kind === "none"} onClick={start}>Start</button>
          </>
        )}
        {job && !ready && (
          <>
            <div className="readout">
              <span className="timer-big mono">{clock(job.endsAt - now)}</span>
              <span className="muted small">{resultKnown ? `Making ${PILL_BY_ID[job.resultPillId].name}` : "Making something…"}</span>
              <span className="bar thin"><span style={{ width: `${progress * 100}%` }} /></span>
            </div>
            <button className="btn ghost-dark small" disabled={state.cash < cost} onClick={() => act((s, t) => speedUpMachine(s, machine.id, t))}>Finish now · {money(cost)}</button>
          </>
        )}
        {job && ready && (
          <>
            <div className="readout"><span className="timer-big">Ready!</span></div>
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
  const { cashCost, chargeCost, outcomes } = BALANCE.scanner;
  const total = Object.values(outcomes).reduce((x, y) => x + y, 0);
  const selSpec = unknowns.find((x) => x.id === sel);
  const pct = (k: keyof typeof outcomes) => Math.round((outcomes[k] / total) * 100);

  const scan = () => {
    if (!selSpec || scanning) return;
    setScanning(true);
    sfx.insert();
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
        {unlocked && <div className="scanner-cost">{money(cashCost)} <span>ϟ{chargeCost}</span></div>}
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
                  note={PILL_BY_ID[x.pillId].rarity === "common" ? undefined : `${PILL_BY_ID[x.pillId].rarity} reading`} onClick={() => { sfx.tap(); setSel(x.id); }} />
              ))}
            </div>
          ) : <p className="muted small">Unlabeled mail parcels can contain ? pills. Known ✓ pills can't be scanned.</p>}
          <button className="btn primary wide" disabled={!selSpec || scanning || state.cash < cashCost || state.charge < chargeCost} onClick={scan}>
            {scanning ? "Scanning…" : "Scan"}
          </button>
          {selSpec && <p className="muted small center">Signal: <RarityTag rarity={PILL_BY_ID[selSpec.pillId].rarity} /></p>}
        </>
      )}
    </section>
  );
}
