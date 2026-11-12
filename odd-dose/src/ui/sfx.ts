/** Tiny generated sound effects (Web Audio). No asset files; respects the player's mute preference. */
const MUTE_KEY = "oddDose.muted";
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; } })();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* ignore */ }
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, to?: number) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur: number, vol: number, from: number, to: number, type: BiquadFilterType = "lowpass") {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  tap: () => tone(880, 0, 0.05, "sine", 0.05, 1100),
  paper: () => noise(0.22, 0.18, 3000, 600, "bandpass"),
  thunk: () => { tone(120, 0, 0.16, "sine", 0.5, 55); noise(0.09, 0.35, 900, 200); },
  ship: () => { noise(0.45, 0.16, 2500, 300, "bandpass"); tone(660, 0.25, 0.12, "triangle", 0.06); },
  coin: () => { tone(988, 0, 0.08, "square", 0.04); tone(1319, 0.07, 0.25, "square", 0.04); },
  insert: () => { tone(300, 0, 0.12, "sine", 0.12, 180); tone(240, 0.12, 0.12, "sine", 0.1, 140); },
  close: () => { noise(0.18, 0.2, 600, 120); tone(90, 0.05, 0.2, "sine", 0.25, 60); },
  ready: () => { [784, 988].forEach((f, i) => tone(f, i * 0.12, 0.35, "sine", 0.08)); },
  reveal: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, "sine", 0.08)); },
  epic: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.9, "triangle", 0.07)); },
  upgrade: () => { [523, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.4, "triangle", 0.07)); },
  error: () => tone(220, 0, 0.14, "triangle", 0.08, 170),
};
