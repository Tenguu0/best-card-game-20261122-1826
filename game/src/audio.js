// Synthesised sound effects, built with WebAudio at run time: no audio
// files, no network. The context is created on the first user gesture, so
// a quiet page load stays silent.

let context = null;
let muted = false;

function ensureContext() {
  if (context) return context;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  } catch {
    context = null;
  }
  return context;
}

/** Call from any click or key press so later sounds are allowed to play. */
export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

/** One short tone: a frequency slide over `seconds`, at `volume`. */
function tone(startFreq, endFreq, seconds, type, volume, delay = 0) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const when = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), when + seconds);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(when);
    oscillator.stop(when + seconds + 0.05);
  } catch {
    // Sound is decoration: a failure here must never stop the game.
  }
}

export function playCardSound() {
  tone(520, 340, 0.12, 'triangle', 0.18);
  tone(780, 520, 0.1, 'sine', 0.1, 0.05);
}

export function strikeSound() {
  tone(220, 60, 0.22, 'sawtooth', 0.22);
}

export function healSound() {
  tone(440, 660, 0.25, 'sine', 0.15);
  tone(660, 880, 0.25, 'sine', 0.1, 0.12);
}

export function guardSound() {
  tone(330, 330, 0.15, 'square', 0.08);
  tone(495, 495, 0.15, 'square', 0.06, 0.08);
}

export function drawSound() {
  tone(880, 1100, 0.08, 'sine', 0.08);
}

export function winSound() {
  [523, 659, 784, 1047].forEach((freq, i) => tone(freq, freq, 0.3, 'triangle', 0.16, i * 0.13));
}

export function loseSound() {
  [392, 330, 262, 196].forEach((freq, i) => tone(freq, freq * 0.9, 0.32, 'triangle', 0.14, i * 0.15));
}

export function toggleMute() {
  muted = !muted;
  return muted;
}
