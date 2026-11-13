/**
 * Startup flow: Splash → (remembered player? → Welcome back) or Sign in → Game.
 * Profiles are device-local (see src/store/profiles.ts).
 */
import { useEffect, useState } from "react";
import { GameProvider } from "../store/GameContext";
import { cleanName, currentPlayer, readProfiles, saveKeyFor, signIn, signOut, validateName } from "../store/profiles";
import { App } from "./App";
import { PillArt } from "./components/PillArt";
import { sfx } from "./sfx";

type Stage = "splash" | "welcome" | "login" | "game";

export function Gate() {
  const [player, setPlayer] = useState<string | null>(() => currentPlayer());
  const [stage, setStage] = useState<Stage>("splash");

  const leaveSplash = () => setStage((s) => (s === "splash" ? (player ? "welcome" : "login") : s));
  useEffect(() => {
    if (stage !== "splash") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(leaveSplash, reduced ? 600 : 2400);
    return () => clearTimeout(t);
  });

  if (stage === "splash") return <Splash onSkip={leaveSplash} />;
  if (stage === "welcome" && player) {
    return <Welcome name={player} onPlay={() => { sfx.tap(); setStage("game"); }} onSwitch={() => { signOut(); setPlayer(null); setStage("login"); }} />;
  }
  if (stage === "login" || !player) {
    return <Login onSignedIn={(name) => { setPlayer(name); setStage("game"); }} />;
  }
  return (
    <GameProvider key={player} saveKey={saveKeyFor(player)} player={player} onSignOut={() => { signOut(); setPlayer(null); setStage("login"); }}>
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

function Welcome({ name, onPlay, onSwitch }: { name: string; onPlay: () => void; onSwitch: () => void }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <h1 className="gate-logo">ODD<span>DOSE</span></h1>
        <p className="gate-hello">Welcome back,</p>
        <p className="gate-name">{name}</p>
        <button className="btn gold big wide" onClick={onPlay} autoFocus>Open the shop</button>
        <button className="btn ghost wide" onClick={onSwitch}>Not {name}? Switch player</button>
      </div>
    </div>
  );
}

function Login({ onSignedIn }: { onSignedIn: (name: string) => void }) {
  const known = readProfiles().names;
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const submit = (n = name) => {
    const err = validateName(n);
    if (err) { setError(err); sfx.error(); return; }
    try { onSignedIn(signIn(n, remember)); sfx.upgrade(); } catch (e) { setError((e as Error).message); }
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
          Remember me on this device
        </label>
        <button className="btn gold big wide" type="submit" disabled={!cleanName(name)}>Start</button>
        {known.length > 0 && (
          <div className="gate-known">
            <span className="muted small">Players on this device</span>
            <div className="gate-chips">
              {known.map((n) => <button type="button" key={n} className="chip" onClick={() => submit(n)}>{n}</button>)}
            </div>
          </div>
        )}
        <p className="gate-note">Progress is saved on this device for each player name.</p>
      </form>
    </div>
  );
}
