import { Rarity } from "./types";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  amp.gain.setValueAtTime(0, startAt);
  amp.gain.linearRampToValueAtTime(gain, startAt + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/** Small synthesized sting per rarity tier — no audio assets needed. */
export function playRaritySound(rarity: Rarity) {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  switch (rarity) {
    case "Common":
      tone(audio, 320, now, 0.12, 0.05);
      break;
    case "Rare":
      tone(audio, 440, now, 0.18, 0.06);
      tone(audio, 660, now + 0.06, 0.18, 0.05);
      break;
    case "Epic":
      tone(audio, 392, now, 0.15, 0.07);
      tone(audio, 523, now + 0.08, 0.2, 0.07);
      tone(audio, 784, now + 0.16, 0.25, 0.06);
      break;
    case "Legendary":
      tone(audio, 392, now, 0.15, 0.08, "triangle");
      tone(audio, 523, now + 0.1, 0.18, 0.08, "triangle");
      tone(audio, 659, now + 0.2, 0.22, 0.08, "triangle");
      tone(audio, 988, now + 0.32, 0.4, 0.09, "triangle");
      break;
    case "Mythic":
      tone(audio, 220, now, 0.4, 0.07, "sawtooth");
      tone(audio, 880, now + 0.2, 0.4, 0.06, "sine");
      break;
    case "Forbidden":
      tone(audio, 110, now, 0.6, 0.09, "sawtooth");
      tone(audio, 100, now + 0.1, 0.7, 0.07, "square");
      break;
  }
}
