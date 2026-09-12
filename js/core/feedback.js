// Sound + haptics — port of core/util/SoundHaptics.kt and core/ui/feedback/Feedback.kt.
// Android uses ToneGenerator; the web equivalent is a short WebAudio blip.

import { prefs } from '../state/store.js';

let ctx = null;

function audioContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

// Unlock audio on the first user gesture (mobile browsers require it).
if (typeof window !== 'undefined') {
  const unlock = () => {
    const context = audioContext();
    if (context && context.state === 'suspended') context.resume();
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function tone({ frequency, durationMs, type = 'sine', gain = 0.18 }) {
  const context = audioContext();
  if (!context) return;
  if (context.state === 'suspended') context.resume();

  const oscillator = context.createOscillator();
  const amp = context.createGain();
  const now = context.currentTime;
  const seconds = durationMs / 1000;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

  oscillator.connect(amp).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + seconds + 0.02);
}

function buzz(pattern) {
  if (!prefs().hapticsOn) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported — visuals never depend on it */
  }
}

export const feedback = {
  tap() {
    if (prefs().soundOn) tone({ frequency: 880, durationMs: 80 });
    buzz(15);
  },
  correct() {
    if (prefs().soundOn) tone({ frequency: 988, durationMs: 80 });
    buzz(25);
  },
  wrong() {
    if (prefs().soundOn) tone({ frequency: 220, durationMs: 140, type: 'square', gain: 0.14 });
    buzz([0, 30, 60, 30]);
  },
};
