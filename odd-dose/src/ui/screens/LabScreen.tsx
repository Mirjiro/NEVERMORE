import { useEffect, useState } from "react";
import { BALANCE } from "../../config/balance";
import { PILL_BY_ID, RARITY_LABEL } from "../../data/pills";
import {
  collectMachine, incubationMs, isKnown, machineCount, scanSpecimen, scannerUnlocked, speedUpCost, speedUpMachine, startMachine,
} from "../../engine/game";
import { previewBreed } from "../../engine/recipes";
import type { Machine } from "../../engine/types";
import { useGame } from "../../store/GameContext";
import type { Tab } from "../App";
import { PillArt } from "../components/PillArt";
import { PillPicker } from "../components/PillPicker";
import { ProgressRing, RarityTag, formatDuration, money, pillName } from "../components/common";

export function LabScreen({ goto }: { goto: (t: Tab) => void }) {
  const { state } = useGame();
  const installed = machineCount(state);
  return (
    <div className="lab">
      <div className="screen-head">
        <h1>Lab</h1>
        <p className="muted">Two pills in. One new pill out. Parents always come back.</p>
      </div>
      <div className="machines">
        {state.machines.slice(0, BALANCE.machine.maxMachines).map((m, i) =>
          i < installed ? <MachineCard key={m.id} machine={m} index={i} /> : (
            <div key={m.id} className="machine locked" onClick={() => goto("hq")}>
              <div className="machine-plate">Machine {String.fromCharCode(65 + i)}</div>
              <p>Not installed</p>
              <span className="muted small">Purchase at HQ → Lab upgrades</span>
            </div>
          ),
        )}
      </div>
      <Scanner goto={goto} />
    </div>
  );
}

function MachineCard({ machine, index }: { machine: Machine; index: number }) {
  const { state, now, act, toast, setReveal } = useGame();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [picking, setPicking] = useState<"a" | "b" | null>(null);
  const [phase, setPhase] = useState<"idle" | "inserting" | "opening">("idle");
  const job = machine.job;
  const ready = !!job && job.endsAt <= now;
  const label = `Machine ${String.fromCharCode(65 + index)}`;

  useEffect(() => { if (job) { setA(null); setB(null); } }, [job]);

  const preview = a && b ? previewBreed(a, b) : null;
  let previewText = "";
  if (preview) {
    if (preview.kind === "none") previewText = "No Reaction — these pills share no Type.";
    else if (preview.kind === "identical") previewText = `Identical pair → another ${pillName(preview.resultId)}`;
    else if (preview.kind === "shared") previewText = `Shared Type → ${pillName(preview.options[0])} or ${pillName(preview.options[1])}`;
    else if (isKnown(state, preview.resultId)) previewText = `Known recipe → ${pillName(preview.resultId)}`;
    else previewText = "Unknown reaction… something new might form.";
  }
  const etaRarity = preview && preview.kind === "recipe" ? PILL_BY_ID[preview.resultId].rarity : preview && preview.kind === "identical" ? PILL_BY_ID[preview.resultId].rarity : null;

  const start = () => {
    if (!a || !b) return;
    const r = act((s, t, rng) => startMachine(s, machine.id, a, b, t, rng));
    if (!r) return;
    if (r.kind === "none") { toast("No Reaction. Both pills stay in your Vault.", "bad"); return; }
    setPhase("inserting");
    setTimeout(() => setPhase("idle"), 1100);
  };

  const collect = () => {
    if (phase === "opening") return;
    setPhase("opening");
    setTimeout(() => {
      const rev = act((s, t) => collectMachine(s, machine.id, t));
      setPhase("idle");
      if (rev) setReveal({ kind: "machine", reveal: rev });
    }, 700);
  };

  const progress = job ? Math.min(1, (now - job.startedAt) / (job.endsAt - job.startedAt)) : 0;
  const resultKnown = job && isKnown(state, job.resultPillId);
  const status = !job ? "available" : ready ? "ready" : "working";
  const cost = job ? speedUpCost(job.endsAt, now) : 0;

  return (
    <div className={`machine ${status} ${phase}`}>
      <div className="machine-top">
        <div className="machine-plate">{label}</div>
        <div className={`status-led ${status}`}><i />{status === "available" ? "Available" : status === "ready" ? "Ready" : "Working"}</div>
      </div>

      <div className="machine-body">
        <div className="chamber">
          <div className="glass" />
          <div className="chamber-floor" />
          <div className="vapor" />
          {job ? (
            <div className="chamber-contents">
              {!ready && <div className="parents-in"><PillArt pillId={job.parentPillIds[0]} size={46} /><PillArt pillId={job.parentPillIds[1]} size={46} /></div>}
              {ready && <div className="result-glow"><PillArt pillId={job.resultPillId} silhouette={!resultKnown} unknown={false} size={86} /></div>}
            </div>
          ) : (
            <div className="slots">
              <button className={`slot ${a ? "filled" : ""}`} onClick={() => setPicking("a")} aria-label="Choose pill A">
                {a ? <PillArt pillId={a} size={72} /> : <span>Pill A</span>}
              </button>
              <span className="plus">+</span>
              <button className={`slot ${b ? "filled" : ""}`} onClick={() => setPicking("b")} aria-label="Choose pill B">
                {b ? <PillArt pillId={b} size={72} /> : <span>Pill B</span>}
              </button>
            </div>
          )}
          <div className="shutter" />
        </div>

        <div className="console">
          {!job && (
            <>
              <div className="readout">
                {a && b ? <>{pillName(a)} + {pillName(b)}<br /><span className={preview?.kind === "none" ? "warn" : "muted"}>{previewText}</span></> : <span className="muted">Select two Known pills.</span>}
                {etaRarity && <div className="muted small">Incubation ≈ {formatDuration(incubationMs(state, etaRarity))}</div>}
              </div>
              <button className="btn primary big" disabled={!a || !b} onClick={start}>START</button>
              <span className="muted small">Costs no Charge</span>
            </>
          )}
          {job && !ready && (
            <>
              <ProgressRing value={progress} size={78}><span className="mono">{Math.floor(progress * 100)}%</span></ProgressRing>
              <div className="readout">
                <div>Incubating <strong>{resultKnown ? PILL_BY_ID[job.resultPillId].name : "???"}</strong></div>
                <div className="muted small">{RARITY_LABEL[job.resultRarity]} result · {formatDuration(job.endsAt - now)} left</div>
              </div>
              <button className="btn ghost" disabled={state.cash < cost} onClick={() => act((s, t) => speedUpMachine(s, machine.id, t))}>
                Finish now · {money(cost)}
              </button>
            </>
          )}
          {job && ready && (
            <>
              <div className="readout"><strong>Incubation complete.</strong><div className="muted small">{resultKnown ? PILL_BY_ID[job.resultPillId].name : "Unknown result"}</div></div>
              <button className="btn primary big pulse" onClick={collect}>OPEN</button>
            </>
          )}
        </div>
      </div>

      <PillPicker open={picking !== null} onClose={() => setPicking(null)} title={picking === "a" ? "Choose Pill A" : "Choose Pill B"}
        other={picking === "a" ? b : a} onPick={(id) => (picking === "a" ? setA(id) : setB(id))} />
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
  const total = Object.values(outcomes).reduce((a, b) => a + b, 0);
  const selSpec = unknowns.find((x) => x.id === sel);

  const scan = () => {
    if (!selSpec || scanning) return;
    setScanning(true);
    setTimeout(() => {
      const r = act((s, t, rng) => scanSpecimen(s, selSpec.id, t, rng));
      setScanning(false);
      if (!r) return;
      if (r.kind === "identify") toast(`Identified: ${pillName(r.pillId)}${r.isNew ? " — new discovery!" : ""}`, "good");
      else if (r.kind === "clue") toast("Clue recorded in Notebook → Drafts.", "info");
      else if (r.kind === "transform") toast(r.identified ? `The specimen transformed into ${pillName(r.pillId)}.` : "The specimen transformed into something else (?).", "info");
      else toast("The specimen crumbled during the scan.", "bad");
      setSel(null);
    }, 1400);
  };

  return (
    <section className={`scanner ${unlocked ? "" : "locked"} ${scanning ? "scanning" : ""}`}>
      <div className="scanner-head">
        <div>
          <h2>Scanner</h2>
          <p className="muted small">Identify unlabeled ? specimens. Known ✓ pills can't be scanned.</p>
        </div>
        <div className="scanner-cost"><span>{money(cashCost)}</span><span>ϟ {chargeCost}</span></div>
      </div>
      {!unlocked ? (
        <div className="locked-note">
          <p>The Scanner is not installed yet.</p>
          <button className="btn ghost" onClick={() => goto("hq")}>Install at HQ</button>
        </div>
      ) : (
        <>
          <div className="scan-bed">
            <div className="scan-beam" />
            {selSpec ? <PillArt pillId={selSpec.pillId} unknown star={selSpec.star} size={110} /> : <span className="muted">Place a ? specimen</span>}
          </div>
          <div className="odds">
            {(Object.keys(outcomes) as (keyof typeof outcomes)[]).map((k) => (
              <div key={k} className={`odd odd-${k}`}><span>{{ identify: "Identify", clue: "Useful clue", transform: "Transform", destroy: "Destroy" }[k]}</span><b>{Math.round((outcomes[k] / total) * 100)}%</b></div>
            ))}
          </div>
          {unknowns.length === 0 ? (
            <p className="muted small">No ? specimens. Unlabeled parcels in Desk mail can contain them.</p>
          ) : (
            <div className="specimen-strip">
              {unknowns.map((x, i) => (
                <button key={x.id} className={`specimen ${sel === x.id ? "on" : ""}`} onClick={() => setSel(x.id)} disabled={!!x.reservedBy}>
                  <PillArt pillId={x.pillId} unknown star={x.star} size={52} />
                  <span className="mono small">? #{i + 1}</span>
                </button>
              ))}
            </div>
          )}
          <button className="btn primary" disabled={!selSpec || scanning || state.cash < cashCost || state.charge < chargeCost} onClick={scan}>
            {scanning ? "Scanning…" : `SCAN · ${money(cashCost)} + ϟ${chargeCost}`}
          </button>
          {selSpec && <p className="muted small">Rarity reading: <RarityTag rarity={PILL_BY_ID[selSpec.pillId].rarity} /></p>}
        </>
      )}
    </section>
  );
}
