import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");
mkdirSync(OUT, { recursive: true });

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

let seed = 7;
function noise() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x3fffffff - 1;
}

function wave(type, phase, duty) {
  const p = phase % 1;
  if (type === "square") return p < duty ? 1 : -1;
  if (type === "tri") return 4 * Math.abs(p - 0.5) - 1;
  return Math.sin(2 * Math.PI * p);
}

function tone(buf, {
  at, dur, from, to = from, type = "square", duty = 0.5, vol = 0.3,
  attack = 0.004, release = 0.04, decay = 0, vibrato = 0,
}) {
  const s0 = Math.round(at * SR);
  const n = Math.round((dur + release) * SR);
  let phase = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / SR;
    let f = from * (to / from) ** Math.min(1, t / dur);
    if (vibrato) f *= 1 + vibrato * Math.sin(2 * Math.PI * 6 * t);
    phase += f / SR;
    let env = t < attack ? t / attack : t < dur ? 1 : Math.max(0, 1 - (t - dur) / release);
    if (decay) env *= Math.exp(-t * decay);
    buf[s0 + i] += wave(type, phase, duty) * env * vol;
  }
}

function hiss(buf, { at, dur, vol = 0.3, decay = 0, lp = 0, lpTo = lp, hp = false, shape }) {
  const s0 = Math.round(at * SR);
  const n = Math.round(dur * SR);
  let y = 0;
  let prev = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const k = i / n;
    let x = noise();
    if (hp) {
      const d = x - prev;
      prev = x;
      x = d * 0.5;
    }
    if (lp) {
      const fc = lp * (lpTo / lp) ** k;
      y += (1 - Math.exp((-2 * Math.PI * fc) / SR)) * (x - y);
      x = y * 2;
    }
    let env = shape ? shape(k) : 1 - k;
    if (decay) env *= Math.exp((-i / SR) * decay);
    buf[s0 + i] += x * env * vol;
  }
}

function writeWav(name, buf, peak = 0.9) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const gain = max > 0 ? peak / max : 1;
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const v = Math.max(-1, Math.min(1, buf[i] * gain));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([h, data]));
  console.log(`${name}.wav  ${(buf.length / SR).toFixed(2)}s`);
}

function make(name, sec, fn, peak) {
  const buf = new Float32Array(Math.ceil(sec * SR));
  fn(buf);
  writeWav(name, buf, peak);
}

// ---------- music: 120 BPM, 40 beats = 20s; cuts land on beats 6, 14, 22, 30 ----------

const BEAT = 0.5;
const CHORDS = [
  { root: 48, tones: [60, 64, 67] },
  { root: 45, tones: [57, 60, 64] },
  { root: 41, tones: [57, 60, 65] },
  { root: 43, tones: [55, 59, 62] },
];
const MELODY = [
  [[0, 1, 76], [1, 0.5, 79], [1.5, 0.5, 76], [2, 1, 74], [3, 1, 72]],
  [[0, 1.5, 72], [1.5, 0.5, 74], [2, 1, 76], [3, 1, 69]],
  [[0, 1, 69], [1, 0.5, 72], [1.5, 0.5, 74], [2, 1.5, 77], [3.5, 0.5, 76]],
  [[0, 1, 74], [1, 1, 71], [2, 1, 74], [3, 1, 79]],
];

make("music", 20, (m) => {
  const at = (beat) => beat * BEAT;
  const kick = (beat, vol = 0.9) =>
    tone(m, { at: at(beat), dur: 0.12, from: 160, to: 42, type: "sine", vol, release: 0.04 });
  const snare = (beat, vol = 0.32) => {
    hiss(m, { at: at(beat), dur: 0.18, vol, decay: 16 });
    tone(m, { at: at(beat), dur: 0.05, from: 230, to: 160, type: "tri", vol: vol * 0.6 });
  };
  const hat = (beat, vol = 0.08) => hiss(m, { at: at(beat), dur: 0.035, vol, hp: true });
  const crash = (beat, vol = 0.22) => hiss(m, { at: at(beat), dur: 1.4, vol, hp: true, decay: 2.8 });
  const lead = (beat, len, midi, vol = 0.085) => {
    const d = len * BEAT * 0.9;
    tone(m, { at: at(beat), dur: d, from: hz(midi), vol, vibrato: len >= 1 ? 0.006 : 0, release: 0.06 });
    tone(m, { at: at(beat) + 0.375, dur: d, from: hz(midi), vol: vol * 0.3, release: 0.06 });
  };

  for (let beat = 0; beat < 30; beat += 0.25) {
    const bar = Math.floor(beat / 4);
    const ch = CHORDS[bar % 4];
    const step = Math.round(beat * 4) % 16;
    const intro = beat < 6;

    const arpVol = intro ? 0.045 + 0.03 * (beat / 6) : 0.045;
    const arpNote = ch.tones[step % 3] + 12 + (step % 8 === 7 ? 12 : 0);
    tone(m, { at: at(beat), dur: 0.07, from: hz(arpNote), duty: 0.25, vol: arpVol, decay: 14 });

    if (step % 16 === 0) {
      for (const n of ch.tones) {
        tone(m, { at: at(beat), dur: 4 * BEAT, from: hz(n), type: "tri", vol: 0.035, attack: 0.08, release: 0.3 });
      }
    }

    if (intro) {
      if (beat >= 2.5 && step % 2 === 0) {
        tone(m, { at: at(beat), dur: 0.18, from: hz(ch.root + (step % 4 === 2 ? 12 : 0)), type: "tri", vol: 0.22, release: 0.03 });
      }
      if (beat >= 2.5 && step % 4 === 2) hat(beat, 0.05);
      continue;
    }

    if (step % 2 === 0) {
      const n = ch.root + (step % 4 === 2 ? 12 : 0);
      tone(m, { at: at(beat), dur: 0.18, from: hz(n), type: "tri", vol: 0.34, release: 0.03 });
    }
    if (step % 8 === 0 || step === 10) kick(beat);
    if (step % 8 === 4) snare(beat);
    if (step % 4 === 2) hat(beat);
    else if (beat >= 14) hat(beat, 0.035);
  }

  crash(2.4, 0.18);
  for (const b of [5.5, 5.75]) snare(b, 0.22);
  for (const b of [6, 14, 22]) {
    crash(b);
    kick(b);
  }
  for (const b of [13.5, 13.75, 21.5, 21.75]) snare(b, 0.25);

  for (let bar = 3; bar < 8; bar++) {
    for (const [off, len, midi] of MELODY[bar % 4]) {
      const beat = bar * 4 + off;
      if (beat >= 12 && beat < 29.5) lead(beat, len, midi);
    }
  }

  // ending: G turnaround, then land on C
  crash(30, 0.25);
  kick(30);
  [72, 76, 79, 84, 88].forEach((n, i) =>
    tone(m, { at: at(30) + i * 0.05, dur: 0.05, from: hz(n), duty: 0.25, vol: 0.06, decay: 6 }),
  );
  for (let beat = 30; beat < 32; beat += 0.5) {
    tone(m, { at: at(beat), dur: 0.18, from: hz(43 + (beat % 1 ? 12 : 0)), type: "tri", vol: 0.34 });
  }
  kick(31);
  snare(31.5, 0.25);
  lead(30, 0.5, 74, 0.09);
  lead(30.5, 0.5, 76, 0.09);
  lead(31, 1, 79, 0.09);

  crash(32, 0.28);
  kick(32);
  tone(m, { at: at(32), dur: 3.2, from: hz(84), vol: 0.08, vibrato: 0.008, decay: 0.6, release: 0.4 });
  tone(m, { at: at(32), dur: 4, from: hz(36), type: "tri", vol: 0.38, decay: 0.5, release: 0.5 });
  for (const n of [60, 64, 67, 72]) {
    tone(m, { at: at(32), dur: 4, from: hz(n), duty: 0.5, vol: 0.022, decay: 0.55, release: 0.5 });
    tone(m, { at: at(32), dur: 4, from: hz(n), type: "tri", vol: 0.04, decay: 0.4, release: 0.5 });
  }
  for (let beat = 32; beat < 38; beat += 0.25) {
    const n = [72, 76, 79, 84][Math.round(beat * 4) % 4];
    const fade = 1 - (beat - 32) / 6;
    tone(m, { at: at(beat), dur: 0.06, from: hz(n), duty: 0.25, vol: 0.035 * fade, decay: 14 });
  }
  kick(34, 0.5);
  kick(36, 0.35);

  for (let i = 0; i < m.length; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.03, (20 - t) / 1.6);
    m[i] = Math.tanh(m[i] * 1.3) * Math.max(0, fade);
  }
}, 0.85);

// ---------- sound effects ----------

make("pop", 0.14, (b) => {
  tone(b, { at: 0, dur: 0.07, from: 380, to: 980, duty: 0.5, vol: 0.5, decay: 18 });
});

make("thud", 0.22, (b) => {
  tone(b, { at: 0, dur: 0.13, from: 190, to: 52, type: "tri", vol: 0.9, release: 0.05 });
  hiss(b, { at: 0, dur: 0.04, vol: 0.4, lp: 1800 });
});

make("slam", 0.4, (b) => {
  tone(b, { at: 0, dur: 0.18, from: 140, to: 38, type: "sine", vol: 1, release: 0.08 });
  tone(b, { at: 0, dur: 0.1, from: 110, to: 60, duty: 0.5, vol: 0.25, decay: 20 });
  hiss(b, { at: 0, dur: 0.3, vol: 0.45, lp: 2600, lpTo: 400 });
});

make("boom", 0.9, (b) => {
  tone(b, { at: 0, dur: 0.5, from: 90, to: 30, type: "sine", vol: 1, release: 0.3 });
  hiss(b, { at: 0, dur: 0.8, vol: 0.5, lp: 3000, lpTo: 200 });
});

make("whoosh", 0.36, (b) => {
  hiss(b, { at: 0, dur: 0.34, vol: 0.9, lp: 400, lpTo: 4200, shape: (k) => Math.sin(Math.PI * k) ** 2 });
});

make("riser", 0.6, (b) => {
  hiss(b, { at: 0, dur: 0.55, vol: 0.6, lp: 300, lpTo: 5000, shape: (k) => k * k });
  tone(b, { at: 0, dur: 0.5, from: 180, to: 900, duty: 0.125, vol: 0.18, release: 0.05 });
});

make("zip", 0.18, (b) => {
  tone(b, { at: 0, dur: 0.12, from: 320, to: 1600, duty: 0.25, vol: 0.4, release: 0.03 });
});

make("sparkle", 0.6, (b) => {
  [84, 88, 91, 96, 100, 103].forEach((n, i) =>
    tone(b, { at: i * 0.045, dur: 0.05, from: hz(n), duty: 0.25, vol: 0.35, decay: 6, release: 0.12 }),
  );
  hiss(b, { at: 0, dur: 0.4, vol: 0.12, hp: true, decay: 6 });
});

make("tick", 0.03, (b) => {
  hiss(b, { at: 0, dur: 0.018, vol: 0.8, hp: true });
  tone(b, { at: 0, dur: 0.01, from: 1800, duty: 0.5, vol: 0.2 });
});

make("typing", 0.4, (b) => {
  for (let i = 0; i < 4; i++) hiss(b, { at: i * 0.09, dur: 0.015, vol: 0.6, hp: true });
});

make("blip-lo", 0.2, (b) => {
  tone(b, { at: 0, dur: 0.05, from: hz(67), duty: 0.5, vol: 0.4 });
  tone(b, { at: 0.055, dur: 0.07, from: hz(72), duty: 0.5, vol: 0.4, release: 0.05 });
});

make("blip-hi", 0.2, (b) => {
  tone(b, { at: 0, dur: 0.05, from: hz(74), duty: 0.5, vol: 0.4 });
  tone(b, { at: 0.055, dur: 0.07, from: hz(79), duty: 0.5, vol: 0.4, release: 0.05 });
});

for (let i = 0; i < 5; i++) {
  make(`bounce-${i}`, 0.24, (b) => {
    tone(b, { at: 0, dur: 0.1, from: 200, to: 60, type: "tri", vol: 0.8, release: 0.04 });
    tone(b, { at: 0.02, dur: 0.08, from: hz(64 + [0, 3, 5, 7, 12][i]), to: hz(76 + [0, 3, 5, 7, 12][i]), duty: 0.25, vol: 0.25, release: 0.04 });
  });
}

make("step", 0.06, (b) => {
  hiss(b, { at: 0, dur: 0.045, vol: 0.9, lp: 900 });
});

make("mew", 0.3, (b) => {
  tone(b, { at: 0, dur: 0.1, from: 700, to: 1100, duty: 0.25, vol: 0.35 });
  tone(b, { at: 0.1, dur: 0.14, from: 1100, to: 620, duty: 0.25, vol: 0.35, release: 0.04, vibrato: 0.02 });
});

make("coin", 0.5, (b) => {
  tone(b, { at: 0, dur: 0.07, from: hz(83), duty: 0.5, vol: 0.4 });
  tone(b, { at: 0.07, dur: 0.35, from: hz(88), duty: 0.5, vol: 0.4, decay: 6, release: 0.05 });
});

make("spin", 0.5, (b) => {
  tone(b, { at: 0, dur: 0.42, from: 200, to: 1300, duty: 0.125, vol: 0.3, vibrato: 0.08, release: 0.05 });
});

make("powerup", 0.6, (b) => {
  [60, 64, 67, 72, 76, 79, 84].forEach((n, i) =>
    tone(b, { at: i * 0.05, dur: 0.05, from: hz(n), duty: 0.5, vol: 0.35, release: 0.02 }),
  );
  tone(b, { at: 0.35, dur: 0.2, from: hz(88), duty: 0.25, vol: 0.3, decay: 8, release: 0.05 });
});
