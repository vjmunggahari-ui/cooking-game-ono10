// Simmer & Serve — sound: a tiny WebAudio synth, no audio files.
// Every effect is an oscillator or a noise burst made at play time.

let ctx = null;
let muted = false;

function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  audioContext();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, gainValue, when = 0) {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, gainValue, filterFreq) {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  const t0 = ac.currentTime;
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.value = gainValue;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  chop() {
    noiseBurst(0.08, 0.25, 900);
  },
  pickup() {
    tone(520, 0.07, 'sine', 0.12);
  },
  place() {
    tone(180, 0.09, 'triangle', 0.18);
  },
  ready() {
    tone(660, 0.1, 'sine', 0.14);
    tone(880, 0.14, 'sine', 0.14, 0.09);
  },
  serve() {
    tone(523, 0.1, 'sine', 0.16);
    tone(659, 0.1, 'sine', 0.16, 0.08);
    tone(784, 0.18, 'sine', 0.16, 0.16);
  },
  error() {
    tone(140, 0.16, 'square', 0.08);
  },
  heart() {
    tone(220, 0.25, 'sawtooth', 0.1);
    tone(165, 0.3, 'sawtooth', 0.1, 0.12);
  },
  start() {
    tone(392, 0.1, 'sine', 0.14);
    tone(523, 0.12, 'sine', 0.14, 0.09);
    tone(659, 0.16, 'sine', 0.14, 0.18);
  },
};
