/**
 * Startup flow: Splash → (remembered player? → Welcome back) or Sign in → Game.
 * Remembered player + saves: claude.ai account storage when available (src/store/cloud.ts),
 * otherwise this browser's storage (src/store/profiles.ts).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { advance } from "../engine/game";
import type { GameState } from "../engine/types";
import { connectCloud, createCloudSaver, readCloudProfile, readCloudSave, writeCloudProfile } from "../store/cloud";
import type { Cloud } from "../store/cloud";
import { GameProvider } from "../store/GameContext";
import { loadGame, parseSave } from "../store/persistence";
import { cleanName, currentPlayer, readProfiles, saveKeyFor, signIn, signOut, validateName } from "../store/profiles";
import { App } from "./App";
import { PillArt } from "./components/PillArt";
import { sfx } from "./sfx";

type Stage = "splash" | "welcome" | "login" | "loading" | "game";
const SPLASH_MS = 2400;

export function Gate() {
  const [player, setPlayer] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("splash");
  const [cloud, setCloud] = useState<Cloud | null>(null);
  const [cloudNames, setCloudNames] = useState<string[]>([]);
  const [initial, setInitial] = useState<GameState | null>(null);
  const ready = useRef({ splash: false, cloud: false, skipped: false });
  const playerRef = useRef<string | null>(null);

  // Leave the splash once it has played (or was tapped) AND the account lookup is done.
  const tryLeave = () => {
    const r = ready.current;
    if (r.cloud && (r.splash || r.skipped)) setStage((s) => (s === "splash" ? (playerRef.current ? "welcome" : "login") : s));
  };
  useEffect(() => {
    let alive = true;
    connectCloud().then(async (c) => {
      if (!alive) return;
      setCloud(c);
      let remembered = currentPlayer();
      if (c) {
        const prof = await readCloudProfile(c);
        if (prof) {
          setCloudNames(prof.names);
          if (prof.remembered) remembered = prof.remembered;
        }
      }
      if (!alive) return;
      playerRef.current = remembered;
      setPlayer(remembered);
      ready.current.cloud = true;
      tryLeave();
    });
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => { ready.current.splash = true; tryLeave(); }, reduced ? 600 : SPLASH_MS);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => { ready.current.skipped = true; tryLeave(); };

  /** Load the newer of the device save and the account save, then start. */
  const enter = async (name: string) => {
    setStage("loading");
    const key = saveKeyFor(name);
    let state: GameState = loadGame(Date.now(), key);
    let localAt: number = state.lastTickAt;
    try { if (!localStorage.getItem(key)) localAt = 0; } catch { localAt = 0; }
    if (cloud) {
      const remote = await readCloudSave(cloud, name);
      if (remote && remote.at > localAt) {
        try { state = parseSave(remote.json); } catch { /* keep device copy */ }
      }
    }
    advance(state, Date.now());
    setInitial(state);
    setPlayer(name);
    setStage("game");
  };

  const rememberInAccount = async (name: string | null, addName?: string) => {
    if (!cloud) return;
    const prof = (await readCloudProfile(cloud)) ?? { remembered: null, names: [] };
    const names = addName && !prof.names.some((n) => n.toLowerCase() === addName.toLowerCase()) ? [...prof.names, addName] : prof.names;
    setCloudNames(names);
    await writeCloudProfile(cloud, { remembered: name, names });
  };

  const doSignOut = () => {
    signOut();
    void rememberInAccount(null);
    setPlayer(null);
    setInitial(null);
    setStage("login");
  };

  const saver = useMemo(() => (cloud && player && stage === "game" ? createCloudSaver(cloud, player) : null), [cloud, player, stage]);

  if (stage === "splash") return <Splash onSkip={skip} />;
  if (stage === "loading") return <div className="gate"><p className="gate-loading">Opening the shop…</p></div>;
  if (stage === "welcome" && player) {
    return <Welcome name={player} synced={!!cloud} onPlay={() => { sfx.tap(); try { signIn(player, true); } catch { /* keep going */ } void enter(player); }} onSwitch={doSignOut} />;
  }
  if (stage === "login" || !player || !initial) {
    const known = Array.from(new Map([...readProfiles().names, ...cloudNames].map((n) => [n.toLowerCase(), n])).values());
    return (
      <Login known={known} synced={!!cloud} onSignIn={(raw, remember) => {
        const name = signIn(raw, remember);
        void rememberInAccount(remember ? name : null, name);
        void enter(name);
      }} />
    );
  }
  return (
    <GameProvider key={player} saveKey={saveKeyFor(player)} player={player} initialState={initial} cloudSaver={saver} onSignOut={doSignOut}>
      <App />
    </GameProvider>
  );
}

function Splash({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="splash" onClick={onSkip} role="button" aria-label="Skip intro" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSkip()}>
      <div className="splash-glow" />
      <div className="splash-pills" aria-hidden>
        <span className="sp sp1"><PillArt pillId="happy" size={74} /></span>
        <span className="sp sp2"><PillArt pillId="sad" size={64} /></span>
        <span className="sp sp3"><PillArt pillId="excited" size={58} /></span>
      </div>
      <h1 className="splash-logo">ODD<span>DOSE</span></h1>
      <p className="splash-tag">Feel something new.</p>
      <div className="splash-bar"><span /></div>
      <p className="splash-skip">Tap to skip</p>
    </div>
  );
}

function Welcome({ name, synced, onPlay, onSwitch }: { name: string; synced: boolean; onPlay: () => void; onSwitch: () => void }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <h1 className="gate-logo">ODD<span>DOSE</span></h1>
        <p className="gate-hello">Welcome back,</p>
        <p className="gate-name">{name}</p>
        <button className="btn gold big wide" onClick={onPlay} autoFocus>Open the shop</button>
        <button className="btn ghost wide" onClick={onSwitch}>Not {name}? Switch player</button>
        <p className="gate-note">{synced ? "Saved to your Claude account" : "Saved on this device"}</p>
      </div>
    </div>
  );
}

function Login({ known, synced, onSignIn }: { known: string[]; synced: boolean; onSignIn: (name: string, remember: boolean) => void }) {
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const submit = (n = name) => {
    const err = validateName(n);
    if (err) { setError(err); sfx.error(); return; }
    try { sfx.upgrade(); onSignIn(n, remember); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="gate">
      <form className="gate-card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h1 className="gate-logo">ODD<span>DOSE</span></h1>
        <p className="gate-sub">Who's running the shop today?</p>
        <label className="gate-field">
          <span>Player name</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} maxLength={16} autoComplete="username" autoCapitalize="words" placeholder="e.g. Mira" autoFocus />
        </label>
        {error && <p className="gate-error" role="alert">{error}</p>}
        <label className="gate-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span className="box" aria-hidden />
          Remember me
        </label>
        <button className="btn gold big wide" type="submit" disabled={!cleanName(name)}>Start</button>
        {known.length > 0 && (
          <div className="gate-known">
            <span className="muted small">Your players</span>
            <div className="gate-chips">
              {known.map((n) => <button type="button" key={n} className="chip" onClick={() => submit(n)}>{n}</button>)}
            </div>
          </div>
        )}
        <p className="gate-note">{synced ? "Progress is saved to your Claude account, on any device." : "Progress is saved on this device for each player name."}</p>
      </form>
    </div>
  );
}
