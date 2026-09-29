window.PO = window.PO || {};

// Semua suara dibuat langsung pakai Web Audio, jadi nggak ada file musik yang perlu di-download.
PO.audio = (() => {
  let ctx = null, master, radioBus, sfxBus, noiseBuf;
  let muted = false;
  let station = -1, step = 0, nextTime = 0, timer = null, rain = null;

  const RADIO_VOL = 0.55;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3800;
    radioBus = ctx.createGain();
    radioBus.gain.value = 0.0001;
    radioBus.connect(lp);
    lp.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.5;
    sfxBus.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function resume() {
    if (!init()) return;
    if (ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, t, dur, { type = "square", vol = 0.05, dest, attack = 0.005, slideTo = null } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
    o.connect(g);
    g.connect(dest || radioBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(t, dur, { vol = 0.05, dest, type = "highpass", freq = 6000, q = 0.7 } = {}) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest || radioBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  const kick = (t, vol = 0.35) => tone(140, t, 0.22, { type: "sine", vol, slideTo: 40 });
  const snare = (t, vol = 0.08) => {
    noise(t, 0.14, { vol, type: "bandpass", freq: 1800, q: 0.8 });
    tone(190, t, 0.08, { type: "triangle", vol: vol * 0.6 });
  };
  const hat = (t, vol = 0.025) => noise(t, 0.035, { vol, freq: 7000 });

  const STATIONS = [
    {
      name: "Lo-fi Pixel FM",
      bpm: 76,
      play(s, t, sd) {
        const bar = Math.floor(s / 16), i = s % 16;
        const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
        const ch = chords[bar % 4];
        if (i === 0) ch.forEach((n) => tone(mtof(n), t, sd * 15, { type: "triangle", vol: 0.035, attack: 0.08 }));
        if (i === 0 || i === 7 || i === 10) tone(mtof(ch[0] - 12), t, sd * 2.5, { type: "triangle", vol: 0.16 });
        if (i === 0 || i === 10) kick(t, 0.3);
        if (i === 4 || i === 12) snare(t, 0.06);
        if (i % 2 === 0) hat(t + (i % 4 === 2 ? sd * 0.18 : 0), 0.018);
        const scale = [69, 72, 74, 76, 79, 81, 84];
        if ((bar % 2 === 1 || i >= 8) && rnd(s * 1.7) < 0.3) {
          tone(mtof(scale[Math.floor(rnd(s * 3.1) * scale.length)]), t, sd * 2, { type: "square", vol: 0.022 });
        }
      }
    },
    {
      name: "Chip Disco 8-bit",
      bpm: 118,
      play(s, t, sd) {
        const bar = Math.floor(s / 16), i = s % 16;
        const chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
        const ch = chords[bar % 4];
        if (i % 4 === 0) kick(t, 0.32);
        if (i === 4 || i === 12) snare(t, 0.07);
        if (i % 4 === 2) hat(t, 0.03);
        tone(mtof(ch[0] - 24 + (i % 2 ? 12 : 0)), t, sd * 0.9, { type: "square", vol: 0.05 });
        tone(mtof(ch[i % 3] + 12), t, sd * 0.7, { type: "square", vol: 0.018 });
        const lead = [72, 74, 76, 79, 76, 74, 72, 67];
        if (bar % 4 >= 2 && i % 2 === 0 && rnd(s) < 0.6) {
          tone(mtof(lead[(i / 2) % 8]), t, sd * 1.8, { type: "triangle", vol: 0.05 });
        }
      }
    },
    {
      name: "Night Rain",
      bpm: 60,
      rain: true,
      play(s, t, sd) {
        const bar = Math.floor(s / 16), i = s % 16;
        const chords = [[50, 57, 60, 64], [46, 53, 57, 62], [48, 55, 58, 62], [45, 52, 57, 60]];
        const ch = chords[bar % 4];
        if (i === 0) {
          ch.forEach((n) => tone(mtof(n), t, sd * 16, { type: "sine", vol: 0.045, attack: 0.6 }));
          tone(mtof(ch[0] - 12), t, sd * 12, { type: "sine", vol: 0.12, attack: 0.2 });
        }
        const sc = [62, 65, 67, 69, 72, 74];
        if (rnd(s * 2.3) < 0.12) tone(mtof(sc[Math.floor(rnd(s * 5.7) * sc.length)]), t, sd * 6, { type: "triangle", vol: 0.04 });
        if (rnd(s * 9.1) < 0.05) tone(2200 + rnd(s) * 800, t, 0.05, { type: "sine", vol: 0.01 });
      }
    }
  ];

  function startRain() {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 1.5);
    s.connect(f);
    f.connect(g);
    g.connect(radioBus);
    s.start();
    rain = { s, g };
  }

  function stopRain() {
    if (!rain) return;
    const { s, g } = rain, now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    s.stop(now + 0.35);
    rain = null;
  }

  function tick() {
    const st = STATIONS[station];
    if (!st) return;
    const sd = 60 / st.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      st.play(step, nextTime, sd);
      nextTime += sd;
      step++;
    }
  }

  function setStation(i) {
    if (!init()) return;
    clearInterval(timer);
    timer = null;
    stopRain();
    const now = ctx.currentTime;
    radioBus.gain.cancelScheduledValues(now);
    radioBus.gain.setValueAtTime(0.0001, now);
    station = i;
    if (i < 0) return;
    noise(now, 0.18, { vol: 0.05, dest: sfxBus, type: "bandpass", freq: 2500, q: 1 });
    radioBus.gain.setValueAtTime(0.0001, now + 0.16);
    radioBus.gain.exponentialRampToValueAtTime(RADIO_VOL, now + 0.4);
    step = 0;
    nextTime = now + 0.18;
    if (STATIONS[i].rain) startRain();
    timer = setInterval(tick, 25);
    tick();
  }

  function setMuted(m) {
    muted = m;
    if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }

  const now = () => ctx.currentTime;
  const sfx = {
    blip() {
      const t = now();
      tone(660, t, 0.06, { vol: 0.05, dest: sfxBus });
      tone(990, t + 0.05, 0.07, { vol: 0.04, dest: sfxBus });
    },
    pop() {
      const t = now();
      noise(t, 0.12, { vol: 0.3, dest: sfxBus, type: "lowpass", freq: 900 });
      tone(90, t, 0.15, { type: "sine", vol: 0.3, dest: sfxBus, slideTo: 40 });
    },
    hum() {
      const t = now();
      tone(55, t, 0.5, { type: "sawtooth", vol: 0.04, dest: sfxBus, slideTo: 110 });
      tone(880, t + 0.35, 0.1, { type: "sine", vol: 0.04, dest: sfxBus });
    },
    meow() {
      const t = now();
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(520, t);
      o.frequency.linearRampToValueAtTime(840, t + 0.12);
      o.frequency.linearRampToValueAtTime(460, t + 0.45);
      f.type = "lowpass";
      f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(f);
      f.connect(g);
      g.connect(sfxBus);
      o.start(t);
      o.stop(t + 0.55);
    },
    brew() {
      const t = now();
      noise(t, 1.2, { vol: 0.06, dest: sfxBus, type: "bandpass", freq: 900, q: 2 });
      tone(1320, t + 1.2, 0.12, { type: "sine", vol: 0.06, dest: sfxBus });
      tone(1760, t + 1.32, 0.16, { type: "sine", vol: 0.06, dest: sfxBus });
    },
    sit() { noise(now(), 0.2, { vol: 0.14, dest: sfxBus, type: "lowpass", freq: 400 }); },
    splash() { noise(now(), 0.45, { vol: 0.07, dest: sfxBus, type: "bandpass", freq: 3000, q: 1.5 }); },
    gulp() {
      const t = now();
      tone(300, t, 0.12, { type: "sine", vol: 0.08, dest: sfxBus, slideTo: 600 });
      tone(320, t + 0.2, 0.12, { type: "sine", vol: 0.08, dest: sfxBus, slideTo: 650 });
    },
    door() {
      const t = now();
      [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.1, 0.16, { type: "triangle", vol: 0.06, dest: sfxBus }));
    },
    step() { noise(now(), 0.03, { vol: 0.03, dest: sfxBus, type: "lowpass", freq: 500 }); }
  };

  return {
    init,
    resume,
    setStation,
    setMuted,
    get muted() { return muted; },
    stations: STATIONS.map((s) => s.name),
    sfx(name) {
      if (!ctx || muted || !sfx[name]) return;
      sfx[name]();
    }
  };
})();
