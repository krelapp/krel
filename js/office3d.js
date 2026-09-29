import * as THREE from "../vendor/three.module.min.js";

const { config } = window.PO;
const A = window.PO.audio, UI = window.PO.ui;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

// Tinggi render dalam pixel. Makin kecil makin "kotak-kotak".
const PIXEL_H = Math.max(120, Math.min(720, Number(params.get("px")) || 240));

const C = {
  ink: 0x1e1a17, cream: 0xf3e6d0, tomato: 0xc8452c, tomatoLight: 0xe0694f, tomatoDark: 0x8e2f1e,
  mustard: 0xe8b44a, teal: 0x2f5d62, tealLight: 0x3f7a80, tealDark: 0x244a4e,
  wood: 0xb07b4f, woodLight: 0xd7a46f, woodDark: 0x8e5d38, woodDeep: 0x5a3d28,
  leaf: 0x6fae5b, leafDark: 0x4f8a4b, sky: 0x9fc5e8, metal: 0x2b2b33, white: 0xe9e4da, pink: 0xf6a6a0, gold: 0xf2c14e
};

const RW = 13, RD = 7.5, RH = 3;
const WINDOWS = [[0.7, 2.3], [4.2, 5.8], [11.3, 12.6]];
const WIN_Y0 = 1.0, WIN_Y1 = 2.3;
const EYE = 1.6;

const isNight = () => {
  if (params.has("night")) return true;
  if (params.has("day")) return false;
  const h = new Date().getHours();
  return h < 6 || h >= 18;
};

const state = {
  t: 0, power: true, night: isNight(), radio: -1, lamp: true,
  catAwakeUntil: 0, brewUntil: 0, brewPending: false, coffeeUntil: 0, sitting: null
};

// ---------- renderer + efek pixel ----------

const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.ink);
const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 60);
camera.rotation.order = "YXZ";
camera.layers.enable(1);
scene.add(camera);

const rt = new THREE.WebGLRenderTarget(4, 4, {
  type: THREE.HalfFloatType,
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter
});

const post = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: rt.texture }, uLevels: { value: 24 } },
  depthTest: false,
  depthWrite: false,
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uLevels;
    varying vec2 vUv;
    float b2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
    float bayer4(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
    vec3 toSRGB(vec3 c) {
      c = max(c, 0.0);
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }
    void main() {
      vec3 c = toSRGB(texture2D(tDiffuse, vUv).rgb);
      vec2 d = vUv - 0.5;
      c *= 1.0 - dot(d, d) * 0.5;
      c += (bayer4(gl_FragCoord.xy) - 0.5) / uLevels;
      c = floor(c * uLevels + 0.5) / uLevels;
      gl_FragColor = vec4(c, 1.0);
    }`
});
const postScene = new THREE.Scene();
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
postQuad.frustumCulled = false;
postScene.add(postQuad);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function resize() {
  const h = PIXEL_H;
  const w = Math.max(1, Math.round((h * innerWidth) / innerHeight));
  renderer.setSize(w, h, false);
  rt.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);

// ---------- tekstur pixel ----------

const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const px = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

function canvasTex(w, h, draw, { repeat = [1, 1], mip = true, wrap = true } = {}) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = mip ? THREE.NearestMipmapNearestFilter : THREE.NearestFilter;
  t.generateMipmaps = mip;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.userData.g = g;
  return t;
}

function tiled(base, rx, ry) {
  const t = base.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

const floorTex = canvasTex(32, 32, (g) => {
  px(g, 0, 0, 32, 32, "#b07b4f");
  for (let k = 0; k < 4; k++) {
    const y = k * 8;
    px(g, 0, y + 7, 32, 1, "#8f5f39");
    const seam = Math.floor(hash(k * 7 + 1) * 32);
    px(g, seam, y, 1, 7, "#8f5f39");
    for (let i = 0; i < 5; i++) px(g, Math.floor(hash(k * 31 + i) * 30), y + 1 + Math.floor(hash(k * 17 + i) * 6), 3, 1, "#bf8c5f");
    for (let i = 0; i < 3; i++) px(g, Math.floor(hash(k * 13 + i * 5) * 31), y + 1 + Math.floor(hash(k * 3 + i) * 6), 2, 1, "#a06d44");
  }
}, { repeat: [RW, RD] });

const wallTex = canvasTex(16, 16, (g) => {
  px(g, 0, 0, 16, 16, "#eadbc2");
  for (let i = 0; i < 14; i++) px(g, Math.floor(hash(i) * 16), Math.floor(hash(i + 40) * 16), 1, 1, i % 3 ? "#e1d0b3" : "#f1e6d2");
});

const rugTex = canvasTex(64, 60, (g, w, h) => {
  px(g, 0, 0, w, h, "#8e2f1e");
  px(g, 2, 2, w - 4, h - 4, "#e8b44a");
  px(g, 4, 4, w - 8, h - 8, "#2f5d62");
  for (let y = 0; y < 13; y++) for (let x = 0; x < 14; x++) if ((x + y) % 2 === 0) px(g, 7 + x * 4, 7 + y * 4, 2, 2, "#3f7a80");
  px(g, 24, 22, 16, 16, "#e8b44a");
  px(g, 26, 24, 12, 12, "#2f5d62");
  px(g, 30, 28, 4, 4, "#c8452c");
}, { wrap: false });

const corkTex = canvasTex(64, 36, (g, w, h) => {
  px(g, 0, 0, w, h, "#c9a26b");
  for (let i = 0; i < 90; i++) px(g, Math.floor(hash(i) * w), Math.floor(hash(i + 90) * h), 1, 1, "#b38b55");
  const notes = [[4, 4, "#e8b44a"], [18, 3, "#9fc5e8"], [33, 5, "#f6a6a0"], [48, 3, "#f3e6d0"], [8, 19, "#b6e3a8"], [24, 20, "#e8b44a"], [40, 19, "#f6a6a0"]];
  notes.forEach(([x, y, col]) => {
    px(g, x, y, 11, 10, col);
    px(g, x + 2, y + 3, 7, 1, "rgba(0,0,0,.28)");
    px(g, x + 2, y + 5, 5, 1, "rgba(0,0,0,.22)");
    px(g, x + 2, y + 7, 6, 1, "rgba(0,0,0,.22)");
    px(g, x + 4, y, 2, 2, "#c8452c");
  });
}, { wrap: false });

const KREL_GLYPHS = {
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"]
};

function paintKrel(g, scale, x0, y0, ink) {
  let x = x0;
  for (const ch of "KREL") {
    KREL_GLYPHS[ch].forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === "#") px(g, x + rx * scale, y0 + ry * scale, scale, scale, ink);
      });
    });
    x += 6 * scale;
  }
}

const krelTex = canvasTex(120, 32, (g, w, h) => {
  px(g, 0, 0, w, h, "#1e1a17");
  px(g, 3, 3, w - 6, h - 6, "#c8452c");
  px(g, 6, 6, w - 12, h - 12, "#f3e6d0");
  paintKrel(g, 2, 37, 9, "#1e1a17");
}, { wrap: false, mip: false });

function pixelTexFromImage(img, maxH = 112) {
  const h = maxH;
  const w = Math.max(1, Math.round(img.naturalWidth * (h / img.naturalHeight)));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function hangAlon() {
  const img = new Image();
  img.onload = () => {
    const mh = 1.55;
    const mw = mh * (img.naturalWidth / img.naturalHeight);
    const mx = 11.05, my = 1.78;
    box(scene, mw + 0.08, mh + 0.08, 0.05, M(C.ink), mx, my - (mh + 0.08) / 2, RD - 0.06);
    const poster = plane(scene, mw, mh, Basic(0xffffff, { map: pixelTexFromImage(img) }), mx, my, RD - 0.1, Math.PI);
    poster.castShadow = false;
  };
  img.src = "alon.jpeg";
}

const artTex = canvasTex(24, 16, (g) => {
  px(g, 0, 0, 24, 16, "#2a1f1a");
  const bands = ["#f6a6a0", "#e8b44a", "#e0694f", "#c8452c", "#8e2f1e"];
  bands.forEach((c, i) => px(g, 1, 1 + i * 2, 22, 2, c));
  px(g, 9, 5, 6, 4, "#f7efd2");
  px(g, 1, 11, 22, 4, "#2f5d62");
  px(g, 1, 11, 8, 1, "#3f7a80");
  px(g, 14, 12, 6, 1, "#3f7a80");
}, { wrap: false, mip: false });

function drawScenery(g, w, h, night) {
  const sky = night ? ["#0f1630", "#152044", "#1d2a55", "#243364"] : ["#7fc3e4", "#94cfe9", "#a8dcec", "#c3e8f1"];
  sky.forEach((c, i) => px(g, 0, Math.floor((i * h * 0.6) / 4), w, Math.ceil((h * 0.6) / 4) + 1, c));
  if (night) {
    for (let i = 0; i < 60; i++) px(g, Math.floor(hash(i) * w), Math.floor(hash(i + 60) * h * 0.55), 1, 1, i % 5 ? "#f3e6d0" : "#9fc5e8");
    px(g, 84, 6, 6, 6, "#f7efd2");
    px(g, 83, 7, 1, 4, "#f7efd2");
    px(g, 90, 7, 1, 4, "#f7efd2");
  } else {
    [[12, 8], [50, 5], [92, 10]].forEach(([x, y]) => {
      px(g, x, y + 2, 16, 3, "#ffffff");
      px(g, x + 3, y, 9, 2, "#ffffff");
      px(g, x + 2, y + 5, 12, 1, "#dff1f7");
    });
  }
  for (let i = 0; i < 14; i++) {
    const bw = 6 + Math.floor(hash(i * 3) * 8), bh = 8 + Math.floor(hash(i * 7) * 16);
    const bx = Math.floor((i / 14) * w + hash(i) * 4) - 2;
    const by = Math.floor(h * 0.72) - bh;
    px(g, bx, by, bw, bh + 4, night ? "#1a1f33" : "#8fa6b8");
    for (let wy = by + 2; wy < by + bh; wy += 3) {
      for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) {
        if (hash(wx * 13 + wy * 7) < (night ? 0.35 : 0.5)) px(g, wx, wy, 1, 1, night ? "#f2c14e" : "#c3d6e2");
      }
    }
  }
  px(g, 0, Math.floor(h * 0.72), w, h, night ? "#14261c" : "#6a9f70");
  for (let x = 0; x < w; x += 4) {
    const th = 4 + Math.floor(hash(x) * 5);
    px(g, x, Math.floor(h * 0.72) - th + 2, 4, th, night ? "#1b3324" : "#4f8a4b");
  }
}
const dayTex = canvasTex(128, 48, (g, w, h) => drawScenery(g, w, h, false), { wrap: false, mip: false });
const nightTex = canvasTex(128, 48, (g, w, h) => drawScenery(g, w, h, true), { wrap: false, mip: false });

// ---------- helper geometri ----------

const M = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const Basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

function box(parent, w, h, d, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

function cyl(parent, rTop, rBot, h, mat, x, y, z, seg = 8, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, !!extra.open), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = extra.cast !== false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function plane(parent, w, h, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function hitbox(parent, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Basic(0xffffff));
  m.position.set(x, y + h / 2, z);
  m.visible = false;
  m.userData.noHL = true;
  parent.add(m);
  return m;
}

function group(x, z, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  scene.add(g);
  return g;
}

const solids = [];
const solid = (cx, cz, w, d) => solids.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
const solidRange = (x0, x1, z0, z1) => solids.push({ x0, x1, z0, z1 });

const objects = [];
const byId = {};
function interactive(id, g, def) {
  const o = { id, group: g, ...def };
  g.traverse((m) => {
    if (!m.isMesh) return;
    m.userData.obj = o;
    if (!m.userData.noHL && m.material.emissive) {
      m.material = m.material.clone();
      m.userData.hl = true;
      m.userData.baseEmissive = m.material.emissive.clone();
    }
  });
  objects.push(o);
  byId[id] = o;
  return o;
}

// ---------- ruangan ----------

let outside, glassMat, ceilPanelMat;
const lights = {};

function buildRoom() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), M(0xffffff, { map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(RW / 2, 0, RD / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  box(scene, RW + 0.4, 0.1, RD + 0.4, M(0xe6dac4, { emissive: 0x2a241c }), RW / 2, RH, RD / 2);

  const wallMat = (rx, ry) => M(0xffffff, { map: tiled(wallTex, rx, ry) });
  const T = 0.2;
  const piece = (x0, x1, y0, y1) => box(scene, x1 - x0, y1 - y0, T, wallMat(x1 - x0, y1 - y0), (x0 + x1) / 2, y0, -T / 2);
  piece(-T, RW + T, 0, WIN_Y0);
  piece(-T, RW + T, WIN_Y1, RH);
  let cur = -T;
  WINDOWS.forEach(([a, b]) => { piece(cur, a, WIN_Y0, WIN_Y1); cur = b; });
  piece(cur, RW + T, WIN_Y0, WIN_Y1);
  box(scene, RW + 2 * T, RH, T, wallMat(RW, RH), RW / 2, 0, RD + T / 2);
  box(scene, T, RH, RD, wallMat(RD, RH), -T / 2, 0, RD / 2);
  box(scene, T, RH, RD, wallMat(RD, RH), RW + T / 2, 0, RD / 2);

  const wain = M(C.tomato), trim = M(C.tomatoLight);
  const flat = { cast: false };
  box(scene, RW, 0.9, 0.03, wain, RW / 2, 0, 0.015, flat);
  box(scene, RW, 0.05, 0.05, trim, RW / 2, 0.9, 0.025, flat);
  box(scene, RW, 0.9, 0.03, wain, RW / 2, 0, RD - 0.015, flat);
  box(scene, RW, 0.05, 0.05, trim, RW / 2, 0.9, RD - 0.025, flat);
  box(scene, 0.03, 0.9, RD, wain, 0.015, 0, RD / 2, flat);
  box(scene, 0.05, 0.05, RD, trim, 0.025, 0.9, RD / 2, flat);
  box(scene, 0.03, 0.9, RD, wain, RW - 0.015, 0, RD / 2, flat);
  box(scene, 0.05, 0.05, RD, trim, RW - 0.025, 0.9, RD / 2, flat);

  const frame = M(0x5b4636);
  glassMat = Basic(0xcfe9f5, { transparent: true, opacity: 0.12, depthWrite: false });
  WINDOWS.forEach(([a, b]) => {
    const w = b - a, cx = (a + b) / 2, h = WIN_Y1 - WIN_Y0;
    box(scene, w + 0.14, 0.06, 0.32, frame, cx, WIN_Y0 - 0.06, -0.06);
    box(scene, w + 0.14, 0.06, 0.22, frame, cx, WIN_Y1, -0.1);
    box(scene, 0.07, h, 0.22, frame, a - 0.035, WIN_Y0, -0.1);
    box(scene, 0.07, h, 0.22, frame, b + 0.035, WIN_Y0, -0.1);
    box(scene, 0.04, h, 0.08, frame, cx, WIN_Y0, -0.1);
    box(scene, w, 0.04, 0.08, frame, cx, WIN_Y0 + h * 0.66, -0.1);
    const glass = plane(scene, w, h, glassMat, cx, WIN_Y0 + h / 2, -0.1);
    glass.layers.set(1);
  });

  outside = plane(scene, 34, 12.75, Basic(0xffffff, { map: dayTex }), RW / 2, 2.2, -6);
  outside.layers.set(1);

  // sekat lounge
  const PX = 8.7, PT = 0.16, PD = 3.4;
  box(scene, PT, RH, PD, wallMat(PD, RH), PX, 0, PD / 2);
  box(scene, PT + 0.06, 0.9, PD + 0.03, wain, PX, 0, PD / 2, flat);
  box(scene, PT + 0.1, 0.05, PD + 0.05, trim, PX, 0.9, PD / 2 + 0.01, flat);
  solidRange(PX - PT / 2, PX + PT / 2, 0, PD);

  // lampu plafon
  ceilPanelMat = Basic(0xfff8e8);
  [[3.2, 3.4], [10.8, 4.4]].forEach(([x, z]) => {
    box(scene, 1.3, 0.05, 0.45, M(0xcfc3ad), x, RH - 0.06, z, flat);
    box(scene, 1.2, 0.02, 0.38, ceilPanelMat, x, RH - 0.075, z, flat);
  });

  lights.hemi = new THREE.HemisphereLight(0xfff2dc, 0x7a5a3e, 1.6);
  scene.add(lights.hemi);

  const sun = new THREE.DirectionalLight(0xffe0b0, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 45 });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  const dir = new THREE.Vector3(0.35, -0.62, 1).normalize();
  sun.target.position.set(RW / 2, 0, RD / 2);
  sun.position.copy(sun.target.position).addScaledVector(dir, -20);
  scene.add(sun, sun.target);
  lights.sun = sun;

  lights.ceil = [[3.2, 3.4], [10.8, 4.4]].map(([x, z]) => {
    const l = new THREE.PointLight(0xfff0d8, 0, 10, 1.2);
    l.position.set(x, RH - 0.35, z);
    scene.add(l);
    return l;
  });

  lights.flash = new THREE.PointLight(0xfff4e0, 0, 5, 1.4);
  lights.flash.position.set(0, -0.15, 0);
  camera.add(lights.flash);
}

// ---------- layar monitor ----------

const screens = [];
function makeScreen(variant) {
  const tex = canvasTex(64, 40, () => {}, { wrap: false, mip: false });
  const mat = Basic(0xffffff, { map: tex });
  const g = tex.userData.g;
  const s = {
    mat,
    draw(t) {
      if (variant === 0) {
        px(g, 0, 0, 64, 40, "#16213a");
        const scroll = Math.floor(t * 3);
        const cols = ["#e8b44a", "#6fae5b", "#e0694f", "#9fc5e8", "#f3e6d0"];
        for (let i = 0; i < 9; i++) {
          const n = scroll + i;
          const ind = (n % 3) * 4;
          const len = 8 + Math.floor(hash(n) * 34);
          px(g, 3, 2 + i * 4, 3, 2, "#3b4a6b");
          px(g, 9 + ind, 2 + i * 4, Math.min(len, 52 - ind), 2, cols[n % cols.length]);
        }
        if (Math.floor(t * 2) % 2) px(g, 9, 38, 4, 2, "#f3e6d0");
      } else {
        px(g, 0, 0, 64, 40, "#f3e6d0");
        px(g, 0, 0, 64, 7, "#c8452c");
        px(g, 3, 2, 12, 3, "#f3e6d0");
        [40, 48, 56].forEach((x) => px(g, x, 3, 5, 1, "#f3e6d0"));
        px(g, 4, 11, 30, 4, "#1e1a17");
        px(g, 4, 17, 24, 2, "#8a7f70");
        px(g, 4, 21, 12, 5, "#c8452c");
        px(g, 38, 10, 22, 16, "#e8b44a");
        px(g, 42 + Math.floor(Math.sin(t * 2) * 3 + 3), 14, 8, 8, "#2f5d62");
        [4, 24, 44].forEach((x, i) => px(g, x, 30, 16, 8, ["#9fc5e8", "#b6e3a8", "#f6a6a0"][i]));
      }
      tex.needsUpdate = true;
    },
    setPower(p) {
      mat.map = p ? tex : null;
      mat.color.set(p ? 0xffffff : 0x0a0a0c);
      mat.needsUpdate = true;
    }
  };
  s.draw(0);
  screens.push(s);
  return s;
}

// ---------- perabot ----------

function buildDesk(id, x, z, variant, def) {
  const g = group(x, z);
  const top = M(C.woodLight), dark = M(C.woodDark), leg = M(C.woodDeep), metal = M(0x3b3b44);
  box(g, 1.4, 0.05, 0.7, top, 0, 0.72, 0);
  [[-0.66, -0.31], [0.66, -0.31], [-0.66, 0.31], [0.66, 0.31]].forEach(([lx, lz]) => box(g, 0.05, 0.72, 0.05, leg, lx, 0, lz));
  box(g, 0.42, 0.6, 0.62, dark, 0.44, 0.1, 0);
  box(g, 0.14, 0.02, 0.01, M(C.mustard), 0.44, 0.52, 0.315, { cast: false });
  box(g, 0.14, 0.02, 0.01, M(C.mustard), 0.44, 0.28, 0.315, { cast: false });

  box(g, 0.24, 0.02, 0.16, metal, 0, 0.77, -0.15);
  box(g, 0.05, 0.2, 0.04, metal, 0, 0.79, -0.17);
  box(g, 0.68, 0.42, 0.04, M(0x26262e), 0, 0.92, -0.19);
  const screen = makeScreen(variant);
  const sm = plane(g, 0.62, 0.36, screen.mat, 0, 1.13, -0.168);
  sm.userData.noHL = true;

  box(g, 0.44, 0.02, 0.14, M(C.white), 0, 0.77, 0.12);
  box(g, 0.06, 0.02, 0.1, M(C.white), 0.32, 0.77, 0.12);
  if (variant === 0) {
    cyl(g, 0.04, 0.04, 0.1, M(C.cream), -0.52, 0.77, 0.0);
  } else {
    box(g, 0.22, 0.05, 0.16, M(C.teal), -0.5, 0.77, -0.05);
    box(g, 0.2, 0.05, 0.15, M(C.mustard), -0.5, 0.82, -0.05);
    cyl(g, 0.05, 0.04, 0.09, M(0xc0643f), 0.56, 0.77, -0.2);
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), M(C.leaf, { flatShading: true }));
    l.position.set(0.56, 0.92, -0.2);
    g.add(l);
  }
  solidRange(x - 0.7, x + 0.7, 0, z + 0.35);

  const ch = group(x - 0.1, z + 0.62);
  const seat = M(0x3d4a63), back = M(0x4d5c7a), base = M(C.metal);
  box(ch, 0.5, 0.04, 0.06, base, 0, 0, 0);
  box(ch, 0.06, 0.04, 0.5, base, 0, 0, 0);
  cyl(ch, 0.03, 0.03, 0.38, base, 0, 0.04, 0, 6);
  box(ch, 0.46, 0.07, 0.46, seat, 0, 0.42, 0);
  box(ch, 0.44, 0.5, 0.06, back, 0, 0.52, 0.22);
  solid(x - 0.1, z + 0.62, 0.42, 0.42);

  return interactive(id, g, def);
}

function buildRadio() {
  const g = group(3.2, 0.24);
  const cab = M(C.woodDark), red = M(C.tomato), redDark = M(C.tomatoDark);
  box(g, 0.62, 0.6, 0.44, cab, 0, 0, 0);
  box(g, 0.64, 0.03, 0.46, M(C.wood), 0, 0.6, 0);
  box(g, 0.56, 0.01, 0.01, M(0x6e4629), 0, 0.3, 0.221, { cast: false });
  box(g, 0.08, 0.02, 0.01, M(C.mustard), 0, 0.42, 0.222, { cast: false });
  box(g, 0.08, 0.02, 0.01, M(C.mustard), 0, 0.16, 0.222, { cast: false });
  box(g, 0.46, 0.26, 0.18, red, 0, 0.63, 0);
  box(g, 0.46, 0.02, 0.18, M(C.tomatoLight), 0, 0.87, 0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(g, 0.025, 0.025, 0.01, redDark, -0.16 + i * 0.045, 0.68 + j * 0.05, 0.091, { cast: false });
  box(g, 0.16, 0.08, 0.01, M(C.cream), 0.1, 0.74, 0.092, { cast: false });
  const needle = box(g, 0.008, 0.07, 0.012, M(C.ink), 0.04, 0.745, 0.097, { cast: false });
  const led = box(g, 0.03, 0.03, 0.012, Basic(0x5a1d12), 0.17, 0.66, 0.093, { cast: false });
  led.userData.noHL = true;
  const ant = box(g, 0.012, 0.4, 0.012, M(0x9a9a9a), 0, 0, 0);
  ant.position.set(0.28, 1.05, -0.04);
  ant.rotation.z = -0.5;
  hitbox(g, 0.7, 1.0, 0.55, 0, 0, 0);
  solidRange(3.2 - 0.32, 3.2 + 0.32, 0, 0.47);
  return interactive("radio", g, {
    needle,
    led,
    prompt: (s) => (s.radio < 0 ? "Turn the radio on" : s.radio === A.stations.length - 1 ? "Turn the radio off" : "Next station"),
    action(api) {
      const s = api.state;
      if (needsPower(api, "The radio won't turn on. The power is out.")) return;
      s.radio = s.radio + 1 >= A.stations.length ? -1 : s.radio + 1;
      A.setStation(s.radio);
      api.toast(s.radio >= 0 ? `Radio: ${A.stations[s.radio]}` : "Radio off. Quiet now.");
    }
  });
}

let clockTex;
function drawClockFace() {
  const g = clockTex.userData.g, d = new Date();
  g.clearRect(0, 0, 32, 32);
  g.fillStyle = "#3a2f28";
  g.beginPath(); g.arc(16, 16, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f3e6d0";
  g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    px(g, Math.round(16 + Math.sin(a) * 11) - 1, Math.round(16 - Math.cos(a) * 11) - 1, 2, 2, i % 3 ? "#b9a88c" : "#3a2f28");
  }
  const hand = (a, len, col, wdt) => {
    for (let i = 0; i <= len; i++) px(g, Math.round(16 + Math.sin(a) * i) - wdt / 2, Math.round(16 - Math.cos(a) * i) - wdt / 2, wdt, wdt, col);
  };
  hand((((d.getHours() % 12) + d.getMinutes() / 60) / 12) * Math.PI * 2, 6, "#1e1a17", 2);
  hand((d.getMinutes() / 60) * Math.PI * 2, 10, "#c8452c", 1);
  px(g, 15, 15, 2, 2, "#1e1a17");
  clockTex.needsUpdate = true;
}

function buildClock() {
  const g = group(3.2, 0.0, 2.2);
  clockTex = canvasTex(32, 32, () => {}, { wrap: false, mip: false });
  drawClockFace();
  const face = plane(g, 0.5, 0.5, M(0xffffff, { map: clockTex, transparent: true, alphaTest: 0.5 }), 0, 0.25, 0.03);
  face.castShadow = true;
  hitbox(g, 0.6, 0.6, 0.2, 0, 0, 0.05);
  return interactive("clock", g, {
    prompt: () => "Check the clock",
    action(api) {
      const d = new Date(), h = d.getHours();
      const hh = String(h).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
      const note = h < 9 ? "Still morning. Coffee first." : h < 17 ? "Still office hours." : h < 21 ? "It's evening. Time to head out." : "It's late. Still here?";
      api.toast(`It's ${hh}:${mm}. ${note}`);
    }
  });
}

function buildBoard() {
  const g = group(6.95, 0, 1.2);
  box(g, 1.46, 0.86, 0.04, M(0x6e4629), 0, 0, 0.02);
  plane(g, 1.36, 0.76, M(0xffffff, { map: corkTex }), 0, 0.43, 0.042);
  return interactive("board", g, {
    prompt: () => "Read the wall",
    action(api) { api.sfx("blip"); api.openModal("board"); }
  });
}

function buildSocket() {
  const g = group(8.3, 0.03);
  const dark = M(C.metal);
  box(g, 0.1, 0.12, 0.02, M(0xf7f1e6), 0, 0.26, 0.01);
  box(g, 0.012, 0.03, 0.005, M(0x3a2f28), -0.02, 0.31, 0.022, { cast: false });
  box(g, 0.012, 0.03, 0.005, M(0x3a2f28), 0.02, 0.31, 0.022, { cast: false });
  const on = new THREE.Group(), off = new THREE.Group();
  g.add(on, off);
  box(on, 0.06, 0.07, 0.05, dark, 0, 0.285, 0.045);
  box(on, 0.016, 0.285, 0.016, dark, 0, 0, 0.06);
  const run = 8.3 - 5.7;
  box(on, run, 0.016, 0.016, dark, -run / 2, 0, 0.08);
  box(off, 0.07, 0.05, 0.1, dark, -0.55, 0, 0.45);
  box(off, 0.014, 0.012, 0.03, M(0xc9c9c9), -0.53, 0.02, 0.51, { cast: false });
  box(off, 0.014, 0.012, 0.03, M(0xc9c9c9), -0.57, 0.02, 0.51, { cast: false });
  box(off, 0.016, 0.016, 0.4, dark, -0.55, 0, 0.22);
  box(off, run - 0.55, 0.016, 0.016, dark, -0.55 - (run - 0.55) / 2, 0, 0.08);
  off.visible = false;
  hitbox(g, 0.6, 0.9, 0.35, 0, 0, 0.12);
  return interactive("socket", g, {
    on, off,
    prompt: (s) => (s.power ? "Pull the plug?" : "Plug it back in"),
    action(api) {
      const s = api.state;
      if (s.power) {
        s.power = false;
        A.setStation(-1);
        api.sfx("pop");
        api.toast("Click. Everything's off. Happy now? Press E to plug it back in.", 3500);
      } else {
        s.power = true;
        api.sfx("hum");
        if (s.radio >= 0) A.setStation(s.radio);
        api.toast("Back on. Thanks for plugging it in!");
      }
      applyLighting();
    }
  });
}

function trophy(parent, x, y, z, silver) {
  const m = M(silver ? 0xd9dde3 : C.gold, { emissive: silver ? 0x222428 : 0x3a2600 });
  box(parent, 0.12, 0.05, 0.12, M(0x3a2f28), x, y, z);
  cyl(parent, 0.018, 0.018, 0.07, m, x, y + 0.05, z, 6);
  cyl(parent, 0.075, 0.035, 0.12, m, x, y + 0.12, z, 8);
  box(parent, 0.03, 0.06, 0.012, m, x - 0.085, y + 0.16, z);
  box(parent, 0.03, 0.06, 0.012, m, x + 0.085, y + 0.16, z);
}

function buildShelf() {
  const g = group(10.2, 0.22);
  const wood = M(0x6e4629), inner = M(0x4a3020);
  box(g, 0.05, 2.0, 0.4, wood, -0.775, 0, 0);
  box(g, 0.05, 2.0, 0.4, wood, 0.775, 0, 0);
  box(g, 1.6, 2.0, 0.03, inner, 0, 0, -0.185);
  [0.02, 0.66, 1.3, 1.96].forEach((y) => box(g, 1.52, 0.04, 0.38, M(C.woodDark), 0, y, 0));
  trophy(g, -0.5, 1.34, 0, false);
  trophy(g, 0, 1.34, 0, true);
  trophy(g, 0.5, 1.34, 0, false);
  const bookCols = [C.tomato, C.teal, C.mustard, C.cream, C.leaf, C.sky, C.tomatoDark];
  let bx = -0.7;
  for (let i = 0; bx < 0.68; i++) {
    const w = 0.04 + hash(i) * 0.05, h = 0.2 + hash(i + 9) * 0.12;
    box(g, w, h, 0.26, M(bookCols[i % bookCols.length]), bx + w / 2, 0.7, 0.02);
    bx += w + 0.008;
  }
  const cert = box(g, 0.32, 0.26, 0.02, M(C.cream), -0.4, 0.06, -0.08);
  cert.rotation.x = -0.18;
  box(g, 0.26, 0.2, 0.005, M(C.sky), -0.4, 0.09, -0.065, { cast: false }).rotation.x = -0.18;
  [0.05, 0.2].forEach((mx, i) => {
    box(g, 0.05, 0.08, 0.01, M(i ? C.sky : C.tomato), mx, 0.2, 0.0);
    cyl(g, 0.04, 0.04, 0.012, M(C.gold, { emissive: 0x3a2600 }), mx, 0.12, 0.0, 8).rotation.x = Math.PI / 2;
  });
  cyl(g, 0.06, 0.05, 0.1, M(0xc0643f), 0.5, 0.06, 0);
  const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), M(C.leaf, { flatShading: true }));
  l.position.set(0.5, 0.22, 0);
  g.add(l);
  solidRange(10.2 - 0.8, 10.2 + 0.8, 0, 0.42);
  return interactive("shelf", g, {
    prompt: () => "Look at the shelf",
    action(api) { api.sfx("blip"); api.openModal("awards"); }
  });
}

const swayers = [];
function buildPlant(id, x, z) {
  const g = group(x, z);
  cyl(g, 0.17, 0.13, 0.32, M(0xc0643f), 0, 0, 0, 10);
  cyl(g, 0.19, 0.19, 0.05, M(0xd9774f), 0, 0.3, 0, 10);
  cyl(g, 0.16, 0.16, 0.01, M(0x3a2a20), 0, 0.33, 0, 10, { cast: false });
  const leaves = new THREE.Group();
  leaves.position.set(0, 0.34, 0);
  g.add(leaves);
  box(leaves, 0.03, 0.35, 0.03, M(0x3a6b3a), 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, r = 0.08 + hash(i + x) * 0.07;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 + hash(i * 3 + x) * 0.07, 0), M(i % 2 ? C.leaf : C.leafDark, { flatShading: true }));
    leaf.position.set(Math.cos(a) * r, 0.18 + i * 0.07, Math.sin(a) * r);
    leaf.rotation.set(hash(i) * 3, hash(i + 1) * 3, 0);
    leaf.castShadow = true;
    leaves.add(leaf);
  }
  swayers.push({ obj: leaves, phase: x * 1.7 });
  solid(x, z, 0.4, 0.4);
  return interactive(id, g, {
    prompt: () => "Water the plant",
    action(api) { api.water(new THREE.Vector3(x, 1.1, z)); }
  });
}

let lampShade;
function buildLamp() {
  const x = 12.55, z = 1.35;
  const g = group(x, z);
  const metal = M(0x3a3a44);
  cyl(g, 0.16, 0.18, 0.03, metal, 0, 0, 0, 10);
  cyl(g, 0.018, 0.018, 1.45, metal, 0, 0.03, 0, 6);
  lampShade = cyl(g, 0.14, 0.24, 0.3, M(0xf1e4c8, { side: THREE.DoubleSide }), 0, 1.35, 0, 10, { open: true, cast: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), Basic(0xfff6d8));
  bulb.position.set(0, 1.42, 0);
  bulb.userData.noHL = true;
  g.add(bulb);
  lights.lamp = new THREE.PointLight(0xffc27a, 0, 7, 1.3);
  lights.lamp.position.set(x, 1.4, z);
  scene.add(lights.lamp);
  solid(x, z, 0.42, 0.42);
  return interactive("lamp", g, {
    bulb,
    prompt: (s) => (s.lamp ? "Turn the lamp off" : "Turn the lamp on"),
    action(api) {
      const s = api.state;
      if (needsPower(api, "The lamp won't turn on. The power is out.")) return;
      s.lamp = !s.lamp;
      api.sfx("blip");
      applyLighting();
      if (!s.night) api.toast(`Lamp ${s.lamp ? "on" : "off"}. Hard to tell in daylight.`);
    }
  });
}

function buildWallArt() {
  const sw = 1.06, sh = sw * 32 / 120, sx = 6.5, sy = 2.21 + (sh + 0.1) / 2;
  box(scene, sw + 0.1, sh + 0.1, 0.05, M(C.ink), sx, sy - (sh + 0.1) / 2, RD - 0.05);
  const sign = plane(scene, sw, sh, Basic(0xffffff, { map: krelTex }), sx, sy, RD - 0.09, Math.PI);
  sign.castShadow = false;
  hangAlon();
  box(scene, 0.04, 0.72, 1.02, M(0x3a2f28), 0.02, 1.3, 3.8);
  plane(scene, 0.96, 0.64, M(0xffffff, { map: artTex }), 0.045, 1.66, 3.8, Math.PI / 2);
}

function buildRug() {
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.0), M(0xffffff, { map: rugTex }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(11.0, 0.006, 4.95);
  rug.receiveShadow = true;
  scene.add(rug);
}

function buildSofa() {
  const x = 11.0, z = 3.95;
  const g = group(x, z);
  const base = M(C.teal), cush = M(C.tealLight), dark = M(C.tealDark), leg = M(C.ink);
  [[-0.94, -0.36], [0.94, -0.36], [-0.94, 0.36], [0.94, 0.36]].forEach(([lx, lz]) => box(g, 0.06, 0.08, 0.06, leg, lx, 0, lz));
  box(g, 2.0, 0.3, 0.85, dark, 0, 0.08, 0);
  box(g, 0.9, 0.14, 0.62, cush, -0.46, 0.38, 0.1);
  box(g, 0.9, 0.14, 0.62, cush, 0.46, 0.38, 0.1);
  box(g, 2.0, 0.62, 0.22, base, 0, 0.38, -0.32);
  box(g, 0.18, 0.36, 0.85, base, -0.91, 0.38, 0);
  box(g, 0.18, 0.36, 0.85, base, 0.91, 0.38, 0);
  const pillow = box(g, 0.34, 0.3, 0.1, M(C.mustard), -0.58, 0.5, -0.16);
  pillow.rotation.z = 0.18;
  solid(x, z, 2.0, 0.85);
  return interactive("sofa", g, {
    seat: new THREE.Vector3(x + 0.4, 1.12, z + 0.12),
    prompt: (s) => (s.sitting ? "Stand up" : "Sit down"),
    action(api) {
      if (api.state.sitting) api.standUp();
      else api.sit(this);
    }
  });
}

function buildTable() {
  const x = 11.0, z = 5.1;
  const g = group(x, z);
  box(g, 1.0, 0.05, 0.5, M(C.woodLight), 0, 0.38, 0);
  [[-0.44, -0.2], [0.44, -0.2], [-0.44, 0.2], [0.44, 0.2]].forEach(([lx, lz]) => box(g, 0.04, 0.38, 0.04, M(C.woodDeep), lx, 0, lz));
  const mag = box(g, 0.3, 0.012, 0.22, M(C.cream), -0.2, 0.43, 0, { cast: false });
  mag.rotation.y = 0.25;
  const stripe = box(g, 0.2, 0.004, 0.04, M(C.tomato), -0.2, 0.442, -0.05, { cast: false });
  stripe.rotation.y = 0.25;
  cyl(g, 0.04, 0.04, 0.09, M(C.cream), 0.28, 0.43, 0.05);
  solid(x, z, 1.0, 0.5);
}

let cat;
function buildCat() {
  const x = 12.1, z = 5.95;
  const g = group(x, z);
  const fur = M(0xe39a4a), dark = M(0xb8702f), pink = M(C.pink);
  const body = box(g, 0.42, 0.2, 0.24, fur, 0.04, 0, 0);
  box(g, 0.05, 0.01, 0.2, dark, 0.0, 0.2, 0, { cast: false });
  box(g, 0.05, 0.01, 0.2, dark, 0.14, 0.2, 0, { cast: false });
  const tail = box(g, 0.34, 0.05, 0.05, dark, 0.02, 0.01, 0.15);
  tail.rotation.y = 0.15;
  const head = new THREE.Group();
  head.position.set(-0.24, 0.02, 0);
  g.add(head);
  box(head, 0.18, 0.16, 0.18, fur, 0, 0, 0);
  box(head, 0.05, 0.06, 0.04, fur, 0, 0.16, -0.06);
  box(head, 0.05, 0.06, 0.04, fur, 0, 0.16, 0.06);
  box(head, 0.01, 0.03, 0.02, pink, -0.02, 0.17, -0.06, { cast: false });
  box(head, 0.01, 0.03, 0.02, pink, -0.02, 0.17, 0.06, { cast: false });
  box(head, 0.01, 0.02, 0.03, pink, -0.091, 0.05, 0, { cast: false });
  const sleepEyes = new THREE.Group(), awakeEyes = new THREE.Group();
  head.add(sleepEyes, awakeEyes);
  const eye = M(0x2a1f1a);
  box(sleepEyes, 0.01, 0.008, 0.04, eye, -0.091, 0.1, -0.045, { cast: false });
  box(sleepEyes, 0.01, 0.008, 0.04, eye, -0.091, 0.1, 0.045, { cast: false });
  box(awakeEyes, 0.01, 0.03, 0.03, eye, -0.091, 0.09, -0.045, { cast: false });
  box(awakeEyes, 0.01, 0.03, 0.03, eye, -0.091, 0.09, 0.045, { cast: false });
  awakeEyes.visible = false;
  hitbox(g, 0.7, 0.45, 0.45, -0.02, 0, 0);
  solid(x, z, 0.6, 0.4);
  cat = { g, body, head, sleepEyes, awakeEyes };
  return interactive("cat", g, {
    prompt: () => "Pet the cat",
    action(api) {
      const s = api.state;
      s.catAwakeUntil = s.t + 2.5;
      api.sfx("meow");
      api.spawn("heart", new THREE.Vector3(x - 0.2, 0.45, z), 3);
      const lines = ["Meow.", "The cat stretches, then goes back to sleep.", "Prrrr...", "Pretending not to care. Definitely cares."];
      api.toast(lines[Math.floor(Math.random() * lines.length)]);
    }
  });
}

let coffeeLed;
function buildKitchen() {
  const x = 1.4, z = 7.18;
  const g = group(x, z);
  const wood = M(C.woodDark), door = M(0xa26d45), knob = M(C.mustard);
  box(g, 1.8, 0.85, 0.6, wood, 0, 0, 0);
  box(g, 1.86, 0.05, 0.64, M(C.white), 0, 0.85, -0.01);
  [-0.6, 0, 0.6].forEach((dx, i) => {
    box(g, 0.56, 0.7, 0.01, door, dx, 0.08, -0.305, { cast: false });
    box(g, 0.03, 0.06, 0.02, knob, dx + (i % 2 ? -0.2 : 0.2), 0.62, -0.315, { cast: false });
  });
  box(g, 1.8, 0.6, 0.36, wood, 0, 1.75, 0.12);
  [-0.45, 0.45].forEach((dx) => box(g, 0.86, 0.54, 0.01, door, dx, 1.78, -0.065, { cast: false }));

  const metal = M(C.metal);
  box(g, 0.32, 0.44, 0.3, metal, -0.5, 0.9, 0.08);
  box(g, 0.32, 0.03, 0.3, M(0x4a4a55), -0.5, 1.34, 0.08);
  box(g, 0.22, 0.09, 0.01, M(0x15151a), -0.5, 1.18, -0.075, { cast: false });
  coffeeLed = box(g, 0.03, 0.03, 0.012, Basic(C.tomatoLight), -0.58, 1.21, -0.082, { cast: false });
  coffeeLed.userData.noHL = true;
  box(g, 0.1, 0.03, 0.06, M(0x15151a), -0.5, 1.08, -0.06);
  cyl(g, 0.04, 0.035, 0.08, M(C.cream), -0.5, 0.9, -0.06);
  cyl(g, 0.16, 0.1, 0.08, M(0xc0643f), 0.35, 0.9, 0.02, 10);
  [[0.3, C.tomato], [0.4, C.mustard], [0.35, C.leaf]].forEach(([fx, col], i) => {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), M(col, { flatShading: true }));
    f.position.set(fx, 1.0 + (i === 2 ? 0.04 : 0), 0.02 + (i - 1) * 0.04);
    f.castShadow = true;
    g.add(f);
  });
  solidRange(x - 0.92, x + 0.92, z - 0.32, RD);
  return interactive("counter", g, {
    prompt: () => "Make coffee",
    action(api) {
      const s = api.state;
      if (needsPower(api, "The coffee machine needs power. Plug it in first.")) return;
      if (s.brewPending) return api.toast("Hang on, it's still brewing...");
      s.brewUntil = s.t + 1.4;
      s.brewPending = true;
      api.sfx("brew");
      api.toast("Brewing coffee...");
    }
  });
}

function buildDispenser() {
  const x = 3.85, z = RD - 0.42;
  const g = group(x, z);
  g.rotation.y = -Math.PI / 2;
  box(g, 0.32, 0.95, 0.32, M(C.white), 0, 0, 0);
  box(g, 0.3, 0.04, 0.3, M(0xb9b2a6), 0, 0.95, 0);
  const bottle = cyl(g, 0.13, 0.13, 0.4, M(C.sky, { transparent: true, opacity: 0.75 }), 0, 0.99, 0, 10);
  bottle.castShadow = false;
  cyl(g, 0.05, 0.05, 0.05, M(0x7aa6cf), 0, 1.39, 0, 8);
  box(g, 0.02, 0.05, 0.04, M(C.tomato), -0.17, 0.72, -0.06);
  box(g, 0.02, 0.05, 0.04, M(0x3f7ab8), -0.17, 0.72, 0.06);
  box(g, 0.02, 0.06, 0.2, M(0xb9b2a6), -0.17, 0.5, 0);
  solid(x, z, 0.4, 0.4);
  return interactive("dispenser", g, {
    prompt: () => "Get some water",
    action(api) { api.sfx("gulp"); api.toast("Refreshing. Don't forget to drink water."); }
  });
}

function buildDoor() {
  const x = 6.5, z = RD;
  const g = group(x, z);
  const trim = M(C.tomatoDark);
  box(g, 1.0, 2.1, 0.06, M(0x6e4629), 0, 0, -0.03);
  box(g, 0.78, 0.8, 0.01, M(0x8e5d38), 0, 1.15, -0.065, { cast: false });
  box(g, 0.78, 0.8, 0.01, M(0x8e5d38), 0, 0.2, -0.065, { cast: false });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), M(C.gold, { emissive: 0x3a2600 }));
  knob.position.set(0.38, 1.02, -0.09);
  g.add(knob);
  box(g, 0.08, 2.18, 0.08, trim, -0.54, 0, -0.04);
  box(g, 0.08, 2.18, 0.08, trim, 0.54, 0, -0.04);
  box(g, 1.16, 0.08, 0.08, trim, 0, 2.1, -0.04);
  const sign = box(g, 0.42, 0.14, 0.04, Basic(0x3fbf6f), 0, 2.32, -0.03, { cast: false });
  sign.userData.noHL = true;
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), M(C.tomatoDark));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(x, 0.007, RD - 0.45);
  mat.receiveShadow = true;
  scene.add(mat);
  return interactive("door", g, {
    prompt: () => "The door",
    action(api) { api.sfx("door"); api.openModal("contact"); }
  });
}

function needsPower(api, msg) {
  if (api.state.power) return false;
  api.toast(msg);
  return true;
}

function buildOffice() {
  buildRoom();
  const editorDef = {
    prompt: () => "Write code on the screen",
    action(api) {
      if (needsPower(api, "The screen is off. Someone pulled the plug...")) return;
      api.sfx("blip");
      api.openEditor();
    }
  };
  const aboutDef = {
    prompt: () => "What is KREL",
    action(api) {
      if (needsPower(api, "The computer is off. Check the plug.")) return;
      api.sfx("blip");
      api.openModal("about");
    }
  };
  buildDesk("deskA", 1.5, 0.4, 0, editorDef);
  buildDesk("deskB", 5.0, 0.4, 1, aboutDef);
  buildRadio();
  buildClock();
  buildBoard();
  buildSocket();
  buildShelf();
  buildPlant("plantA", 11.95, 0.35);
  buildPlant("plantB", 5.2, 7.15);
  buildLamp();
  buildWallArt();
  buildRug();
  buildSofa();
  buildTable();
  buildCat();
  buildKitchen();
  buildDispenser();
  buildDoor();
}

// ---------- cahaya siang / malam / mati lampu ----------

function applyLighting() {
  const n = state.night, p = state.power;
  lights.hemi.intensity = n ? (p ? 0.55 : 0.05) : (p ? 1.7 : 0.7);
  lights.hemi.color.set(n ? 0x8a96c8 : 0xfff2dc);
  lights.sun.intensity = n ? 0.5 : 3.2;
  lights.sun.color.set(n ? 0x8fa8ff : 0xffe0b0);
  lights.ceil.forEach((l) => { l.intensity = p ? (n ? 7 : 3) : 0; });
  ceilPanelMat.color.set(p ? 0xfff8e8 : 0x5b5650);
  const lampOn = p && state.lamp;
  lights.lamp.intensity = lampOn ? (n ? 8 : 2.5) : 0;
  const shadeGlow = new THREE.Color(lampOn ? 0x8a5a20 : 0x000000);
  lampShade.userData.baseEmissive.copy(shadeGlow);
  lampShade.material.emissive.copy(shadeGlow);
  byId.lamp.bulb.material.color.set(lampOn ? 0xfff6d8 : 0x6b6560);
  lights.flash.intensity = p ? 0 : n ? 2.4 : 1.4;
  outside.material.map = n ? nightTex : dayTex;
  outside.material.needsUpdate = true;
  screens.forEach((s) => s.setPower(p));
  byId.socket.on.visible = p;
  byId.socket.off.visible = !p;
  byId.radio.led.material.color.set(p && state.radio >= 0 ? 0x7cfc7c : 0x5a1d12);
}

// ---------- partikel ----------

const GLYPHS = {
  note: [".##", ".#.", ".#.", "##.", "##."],
  heart: [".#.#.", "#####", ".###.", "..#.."],
  z: ["###", "..#", ".#.", "#..", "###"],
  sparkle: [".#.", "###", ".#."],
  steam: ["##", "##"]
};
const glyphTex = {};
function glyph(name, color) {
  const key = name + color;
  if (!glyphTex[key]) {
    const rows = GLYPHS[name];
    glyphTex[key] = canvasTex(rows[0].length, rows.length, (g) => {
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "#") px(g, x, y, 1, 1, color); }));
    }, { wrap: false, mip: false });
  }
  return glyphTex[key];
}

let particles = [];
function spawn(kind, pos, n = 1) {
  for (let i = 0; i < n; i++) {
    const color = kind === "heart" ? (i % 2 ? "#f6a6a0" : "#c8452c")
      : kind === "note" ? (Math.random() < 0.5 ? "#e8b44a" : "#f3e6d0")
      : kind === "sparkle" ? "#9fc5e8" : "#f3e6d0";
    const tex = glyph(kind, color);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: kind === "steam" ? 0.6 : 1 }));
    const img = tex.image, s = kind === "steam" ? 0.025 : 0.03;
    sp.scale.set(img.width * s, img.height * s, 1);
    sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15));
    sp.layers.set(1);
    scene.add(sp);
    const max = kind === "steam" ? 1.1 : 1.8;
    particles.push({
      sp, kind, life: max, max,
      v: new THREE.Vector3((Math.random() - 0.5) * 0.15, kind === "sparkle" ? 0.6 + Math.random() * 0.5 : 0.25 + Math.random() * 0.15, (Math.random() - 0.5) * 0.15)
    });
  }
}

function updateParticles(dt) {
  particles = particles.filter((p) => {
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.sp);
      p.sp.material.dispose();
      return false;
    }
    if (p.kind === "sparkle") p.v.y -= 1.6 * dt;
    p.sp.position.addScaledVector(p.v, dt);
    p.sp.position.x += Math.sin(state.t * 3 + p.max * 10) * 0.002;
    p.sp.material.opacity = Math.min(1, (p.life / p.max) * 1.6) * (p.kind === "steam" ? 0.6 : 1);
    return true;
  });
}

// ---------- pemain ----------

const player = { x: 6.5, z: 6.3, yaw: 0, pitch: -0.05, bob: 0, backX: 0, backZ: 0 };
const PR = 0.25;
const keys = new Set();

function collides(x, z) {
  if (x < PR || x > RW - PR || z < PR || z > RD - PR) return true;
  for (const s of solids) if (x + PR > s.x0 && x - PR < s.x1 && z + PR > s.z0 && z - PR < s.z1) return true;
  return false;
}

function sit(o) {
  state.sitting = o;
  player.backX = player.x;
  player.backZ = player.z;
  player.yaw = Math.PI;
  player.pitch = -0.08;
  A.sfx("sit");
  UI.toast("Ahh, comfy. Press E or walk to stand up.");
}

function standUp() {
  if (!state.sitting) return;
  state.sitting = null;
  player.x = player.backX;
  player.z = player.backZ;
}

function water(pos) {
  A.sfx("splash");
  spawn("sparkle", pos, 7);
  UI.toast("The plant got a drink. It looks happier.");
}

// ---------- input + pointer lock ----------

let mode = "loading";
let locked = false;
const isTouch = matchMedia("(pointer: coarse)").matches;
const pauseEl = $("pause");

function requestLock() {
  if (isTouch || !canvas.requestPointerLock) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* fallback: drag untuk melihat */ }
}

document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  if (locked) {
    pauseEl.classList.add("hidden");
    if (mode === "paused") mode = "play";
  } else if (mode === "play" && !UI.open) {
    mode = "paused";
    keys.clear();
    pauseEl.classList.remove("hidden");
  }
});
document.addEventListener("pointerlockerror", () => {
  if (mode === "paused") {
    mode = "play";
    pauseEl.classList.add("hidden");
  }
});
$("btn-resume").addEventListener("click", () => {
  mode = "play";
  pauseEl.classList.add("hidden");
  requestLock();
});

const LOOK = 0.0022;
function look(dx, dy) {
  player.yaw -= dx * LOOK;
  player.pitch = Math.max(-1.4, Math.min(1.4, player.pitch - dy * LOOK));
}

addEventListener("mousemove", (e) => { if (locked) look(e.movementX, e.movementY); });

let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  if (mode !== "play" || UI.open) return;
  if (!isTouch && !locked) requestLock();
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
addEventListener("pointermove", (e) => {
  if (!drag || locked || e.pointerId !== drag.id) return;
  const k = isTouch ? 1.6 : 1;
  look((e.clientX - drag.x) * k, (e.clientY - drag.y) * k);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
addEventListener("pointerup", (e) => { if (drag && e.pointerId === drag.id) drag = null; });

const KEYMAP = {
  KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  ShiftLeft: "run", ShiftRight: "run"
};

function openPanel(fn) {
  fn();
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
}

UI.onclose = () => { if (mode === "play") requestLock(); };

const api = {
  state,
  toast: UI.toast,
  openModal: (name) => openPanel(() => UI.openModal(name)),
  openEditor: () => openPanel(() => UI.openEditor()),
  spawn, sit, standUp, water,
  sfx: (n) => A.sfx(n)
};

let focus = null;
function interact() {
  if (!focus) return;
  A.resume();
  focus.action(api);
}

addEventListener("keydown", (e) => {
  if (e.target === UI.code) {
    if (e.key === "Escape") UI.close();
    return;
  }
  if (mode === "loading") return;
  if (mode === "intro") {
    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); enter(); }
    return;
  }
  if (UI.open) {
    if (e.code === "Escape" || e.code === "KeyE") UI.close();
    return;
  }
  if (mode !== "play") return;
  const k = KEYMAP[e.code];
  if (k) {
    e.preventDefault();
    keys.add(k);
    if (state.sitting && k !== "run") standUp();
  }
  if (e.code === "KeyE" && !e.repeat) interact();
  if (e.code === "KeyM") toggleSound();
  if (e.code === "KeyH") api.openModal("help");
});
addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
addEventListener("blur", () => keys.clear());

const soundBtn = $("btn-sound");
function toggleSound() {
  A.setMuted(!A.muted);
  soundBtn.textContent = `Sound: ${A.muted ? "OFF" : "ON"}`;
}
soundBtn.addEventListener("click", (e) => { toggleSound(); e.currentTarget.blur(); });
$("btn-help").addEventListener("click", (e) => { e.currentTarget.blur(); if (!UI.open) api.openModal("help"); });

const touchEl = $("touch");
touchEl.querySelectorAll("[data-key]").forEach((b) => {
  const k = b.dataset.key;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    A.resume();
    if (k === "e") {
      if (UI.open) UI.close();
      else if (mode === "play") interact();
      return;
    }
    keys.add(k);
    if (state.sitting) standUp();
  });
  const up = () => keys.delete(k);
  b.addEventListener("pointerup", up);
  b.addEventListener("pointerleave", up);
  b.addEventListener("pointercancel", up);
});

// ---------- loop ----------

const raycaster = new THREE.Raycaster();
raycaster.far = 2.4;
const center = new THREE.Vector2(0, 0);
const HL = new THREE.Color(C.mustard);
const crosshair = $("crosshair");

function paint(o, k) {
  o.group.traverse((m) => {
    if (m.userData.hl) m.material.emissive.copy(m.userData.baseEmissive).lerp(HL, k);
  });
}

function updateFocus() {
  let next = null;
  if (state.sitting) next = state.sitting;
  else if (mode === "play" && !UI.open) {
    raycaster.setFromCamera(center, camera);
    const hit = raycaster.intersectObjects(scene.children, true)[0];
    if (hit) next = hit.object.userData.obj || null;
  }
  if (next !== focus) {
    if (focus) paint(focus, 0);
    focus = next;
    crosshair.classList.toggle("on", !!focus && !state.sitting);
  }
  if (focus && !state.sitting) paint(focus, 0.38 + Math.sin(state.t * 6) * 0.14);
  UI.setPrompt(focus && !UI.open ? focus.prompt(state) : null);
}

const fwd = new THREE.Vector3(), right = new THREE.Vector3();
let screenTimer = 0, clockTimer = 0, nightTimer = 0, stepTimer = 0;
const emit = { cat: 1, radio: 0, steam: 0 };

function update(dt) {
  state.t += dt;

  if (mode === "play" && !UI.open && !state.sitting) {
    fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    let mx = 0, mz = 0;
    if (keys.has("up")) { mx += fwd.x; mz += fwd.z; }
    if (keys.has("down")) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has("right")) { mx += right.x; mz += right.z; }
    if (keys.has("left")) { mx -= right.x; mz -= right.z; }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      const sp = 2.3 * (keys.has("run") ? 1.75 : 1) * (state.t < state.coffeeUntil ? 1.4 : 1);
      const nx = player.x + (mx / len) * sp * dt, nz = player.z + (mz / len) * sp * dt;
      if (!collides(nx, player.z)) player.x = nx;
      if (!collides(player.x, nz)) player.z = nz;
      player.bob += dt * sp * 4.2;
      if ((stepTimer -= dt * sp) <= 0) { stepTimer = 1.25; A.sfx("step"); }
    } else {
      player.bob *= 0.9;
    }
  }

  if (mode === "intro") player.yaw = Math.sin(state.t * 0.25) * 0.35;

  if (state.sitting) {
    const s = state.sitting.seat;
    camera.position.set(s.x, s.y, s.z);
  } else {
    camera.position.set(player.x, EYE + Math.sin(player.bob) * 0.035, player.z);
  }
  camera.rotation.set(player.pitch, player.yaw, 0);

  updateFocus();

  if (state.brewPending && state.t >= state.brewUntil) {
    state.brewPending = false;
    state.coffeeUntil = state.t + 12;
    UI.toast("Coffee's ready! You walk faster for 12 seconds.");
  }

  const awake = state.t < state.catAwakeUntil;
  cat.body.scale.y = awake ? 1 : 1 + Math.sin(state.t * 2) * 0.05;
  cat.head.position.y = awake ? 0.1 : 0.02;
  cat.head.rotation.z = awake ? -0.25 : 0;
  cat.sleepEyes.visible = !awake;
  cat.awakeEyes.visible = awake;

  swayers.forEach((s) => { s.obj.rotation.z = Math.sin(state.t * 1.3 + s.phase) * 0.04; });

  const radio = byId.radio;
  radio.needle.position.x = 0.04 + Math.max(0, state.radio) * 0.04;
  radio.led.material.color.set(state.power && state.radio >= 0 ? 0x7cfc7c : 0x5a1d12);
  coffeeLed.material.color.set(!state.power ? 0x333333 : state.t < state.brewUntil ? C.mustard : C.tomatoLight);

  if (!awake && (emit.cat -= dt) <= 0) { emit.cat = 1.8; spawn("z", new THREE.Vector3(12.0, 0.45, 5.95)); }
  if (state.power && state.radio >= 0 && (emit.radio -= dt) <= 0) { emit.radio = 0.7; spawn("note", new THREE.Vector3(3.2, 1.0, 0.3)); }
  if (state.t < state.brewUntil && (emit.steam -= dt) <= 0) { emit.steam = 0.12; spawn("steam", new THREE.Vector3(0.9, 1.05, 7.12)); }
  updateParticles(dt);

  if (state.power && (screenTimer -= dt) <= 0) { screenTimer = 0.2; screens.forEach((s) => s.draw(state.t)); }
  if ((clockTimer -= dt) <= 0) { clockTimer = 15; drawClockFace(); }
  if ((nightTimer -= dt) <= 0) {
    nightTimer = 30;
    const n = isNight();
    if (n !== state.night) { state.night = n; applyLighting(); }
  }
}

function render() {
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// ---------- mulai ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function enter() {
  if (mode !== "intro") return;
  A.resume();
  A.sfx("door");
  $("intro").classList.add("hidden");
  $("hud").classList.remove("hidden");
  canvas.classList.remove("blur");
  if (isTouch) touchEl.classList.remove("hidden");
  player.yaw = 0;
  player.pitch = -0.05;
  mode = "play";
  requestLock();
  UI.toast(`Welcome to ${config.studioName}! Aim at something, then press E.`, 3800);
}
$("btn-enter").addEventListener("click", enter);

if (params.has("debug")) window.__office = { state, player, byId };

async function boot() {
  document.title = config.studioName;
  document.querySelectorAll("[data-brand]").forEach((el) => { el.textContent = config.studioName; });
  document.querySelectorAll("[data-tagline]").forEach((el) => { el.textContent = config.tagline; });

  const fill = $("loader-fill"), pct = $("loader-pct");
  const steps = [
    () => resize(),
    () => buildOffice(),
    () => applyLighting(),
    () => { renderer.compile(scene, camera); requestAnimationFrame(frame); },
    () => Promise.race([document.fonts ? document.fonts.ready : null, sleep(1500)])
  ];
  for (let i = 0; i < steps.length; i++) {
    await steps[i]();
    const p = Math.round(((i + 1) / steps.length) * 100);
    fill.style.width = p + "%";
    pct.textContent = p + "%";
    await sleep(140);
  }
  await sleep(200);
  $("loader").classList.add("fade");
  $("intro").classList.remove("hidden");
  mode = "intro";
  setTimeout(() => $("loader").classList.add("hidden"), 450);
}

boot().catch((err) => {
  console.error(err);
  $("loader-pct").textContent = "failed";
  document.querySelector("#loader .loader-row span").textContent = "This browser doesn't support WebGL";
});
