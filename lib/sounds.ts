"use client";

// Web Audio API sound effects. No external library — synthesizes simple
// sine-wave envelopes on demand. All sounds peak at 0.3 gain and fade out
// naturally so they sit in the background rather than punching through.

let ctx: AudioContext | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state !== "closed") return ctx;
  const Cls =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Cls) return null;
  try {
    ctx = new Cls();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(m: boolean) {
  muted = m;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("nexus:muted", m ? "1" : "0");
    } catch {
      // ignore
    }
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return muted;
  try {
    const v = window.localStorage.getItem("nexus:muted");
    if (v !== null) muted = v === "1";
  } catch {
    // ignore
  }
  return muted;
}

// Sustained tone with linear attack + exponential decay envelope.
function blip(
  c: AudioContext,
  freq: number,
  start: number,
  durationS: number,
  peak = 0.3,
  type: OscillatorType = "sine",
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationS);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + durationS + 0.02);
}

// Short 440Hz beep used when the first cascade alert fires.
export function alertBeep() {
  if (isMuted()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  blip(c, 440, c.currentTime, 0.1, 0.3, "sine");
}

// Cascade chime — pitch rises with stage. Stage 0 = 330Hz, +60Hz per stage.
export function cascadeChime(stageIndex: number) {
  if (isMuted()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const base = 330 + stageIndex * 60;
  // Two-note descending "alarm" feel: high then low
  blip(c, base * 1.25, c.currentTime, 0.18, 0.28, "sine");
  blip(c, base, c.currentTime + 0.12, 0.22, 0.25, "sine");
}

// Pleasant ascending 3-note resolve, plays once when recovery completes.
export function recoveryChime() {
  if (isMuted()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime;
  blip(c, 523.25, t0 + 0.0, 0.22, 0.25, "sine"); // C5
  blip(c, 659.25, t0 + 0.16, 0.22, 0.25, "sine"); // E5
  blip(c, 783.99, t0 + 0.32, 0.45, 0.25, "sine"); // G5
}

// Lightweight "node went critical" tick — used by notifications path.
export function tick() {
  if (isMuted()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  blip(c, 880, c.currentTime, 0.05, 0.18, "triangle");
}
