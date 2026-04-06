const W = 720;
const H = 1020;
const URL_PARAMS = new URLSearchParams(window.location.search);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const URL_SEED = URL_PARAMS.get("seed");
const SEED = URL_SEED !== null && Number.isFinite(Number(URL_SEED))
  ? Number(URL_SEED)
  : Math.floor(Math.random() * 1000000000);
const URL_COMPLEXITY = Number(URL_PARAMS.get("complexity"));
const COMPLEXITY = Number.isFinite(URL_COMPLEXITY)
  ? clamp(URL_COMPLEXITY, 0.2, 1.0)
  : 0.58;

const PAL_TRACE = "#c4b5e0-#a8d8ea-#d4c5f9-#9b59b6-#00d2ff-#d81159-#f52f57".split("-");
const PAL_GLOW = "#d4c5f9-#00d2ff-#d81159-#f52f57".split("-");

const ZONE_ATTACK = 0.18;
const ZONE_RELEASE = 0.08;
const SHARD_ATTACK = 0.2;
const SHARD_RELEASE = 0.1;

const REGROUP_BREAK_THRESHOLD = 0.24;
const REGROUP_COMPLETE_THRESHOLD = 0.08;
const REGROUP_COOLDOWN_FRAMES = 12;
const COLOR_MORPH_DECAY = 0.085;
const FLIP_SPEED = 0.085;

const TRACE_COUNT_MIN = Math.floor(2 + COMPLEXITY * 5);
const TRACE_COUNT_MAX = Math.floor(4 + COMPLEXITY * 7);
const TRACE_LIFE_MIN = 58;
const TRACE_LIFE_MAX = 88;
const MAX_TRAIL_PARTICLES = Math.floor(70 + COMPLEXITY * 140);
const ZONE_REDRAW_INTERVAL = COMPLEXITY >= 0.78 ? 1 : COMPLEXITY >= 0.52 ? 2 : 3;
const PULSE_REDRAW_INTERVAL = COMPLEXITY >= 0.78 ? 1 : COMPLEXITY >= 0.52 ? 2 : 3;
const SHARD_SUBDIV = COMPLEXITY >= 0.62 ? 3 : 2;
const BG_FRAG_COUNT = Math.floor(10 + COMPLEXITY * 24);
const PANEL_COUNT = Math.floor(6 + COMPLEXITY * 12);
const GRAIN_COUNT = Math.floor(900 + COMPLEXITY * 1700);

const DRAGON_FOLLOW_LERP = 0.22;

const CODE_SNIPPETS = [
  "const W = 720, H = 1020;",
  "function setup() { createCanvas(W, H); }",
  "function draw() { updateDragon(); renderZones(); }",
  "let heading = atan2(dy, dx);",
  "let speed = dist(dragonX, dragonY, lastDX, lastDY);",
  "z.fractureLevel = lerp(z.fractureLevel, target, 0.18);",
  "drawPoly(g, z.points);",
  "trailParticles.push({ x, y, rot, maxAge });",
  "let inf = zoneInf(dragonX, dragonY, cx, cy, rx, ry);",
  "function mixHex(a, b, t) { return colorToHex(lerpColor(color(a), color(b), t)); }",
  "if (key === ' ') saveCanvas('text-dragon', 'jpg');",
  "randomSeed(SEED); noiseSeed(SEED);",
  "for (let i = 0; i < panelCount; i++) cfg.panels.push(panel);",
  "shaderLayer.rect(-W * 0.5, -H * 0.5, W, H);",
  "const TRACE_SCREEN_ALPHA = 0.14;",
  "Object.assign(z, { glowLevel: 0, fractureLevel: 0 });",
  "let splitStr = uSplit * (1.0 + energy * 0.6);",
  "drawTextGlyph(g, snippet, x, y, size, angle);",
];
const TRAIL_TOKEN_POOL = [
  "if",
  "for",
  "let",
  "const",
  "draw",
  "noise",
  "lerp",
  "{",
  "}",
  "(",
  ")",
  ";",
  "[]",
  "=>",
];

let canvasRef;
let bgLayer;
let bgFragLayer;
let zoneLayer;
let pulseLayer;
let trailLayer;
let grainLayer;

let sceneConfig;
let zones = [];
let trailParticles = [];

let dragonX = W * 0.5;
let dragonY = H * 0.5;
let lastDX = dragonX;
let lastDY = dragonY;
let heading = 0;
let speed = 0;
let turn = 0;
let energy = 0;

function setup() {
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  canvasRef = createCanvas(W, H);
  frameRate(60);
  smooth();

  bgLayer = createGraphics(W, H);
  bgFragLayer = createGraphics(W, H);
  zoneLayer = createGraphics(W, H);
  pulseLayer = createGraphics(W, H);
  trailLayer = createGraphics(W, H);
  grainLayer = createGraphics(W, H);

  [bgLayer, bgFragLayer, zoneLayer, pulseLayer, trailLayer].forEach((l) => {
    l.smooth();
    l.textFont("Courier New");
    l.textAlign(CENTER, CENTER);
  });

  randomSeed(SEED);
  noiseSeed(SEED);

  sceneConfig = generateScene();
  zones = sceneConfig.reactiveZones;

  buildBackgroundText();
  buildBgFragTextLayer();
  buildGrainText();
  fitCanvas();
  console.info("Interaction3 seed:", SEED, "complexity:", COMPLEXITY.toFixed(2));
}

function draw() {
  updateDragon();
  updateZones();

  if (frameCount % ZONE_REDRAW_INTERVAL === 0) renderZonesText();
  fadeAlpha(pulseLayer, 20);
  if (frameCount % PULSE_REDRAW_INTERVAL === 0) paintPulsesText();
  paintTrailText();

  clear();
  image(bgLayer, 0, 0);
  image(bgFragLayer, 0, 0);
  image(zoneLayer, 0, 0);

  push();
  blendMode(SCREEN);
  tint(255, 190);
  image(pulseLayer, 0, 0);
  pop();

  image(trailLayer, 0, 0);

  push();
  blendMode(MULTIPLY);
  tint(255, 90);
  image(grainLayer, 0, 0);
  pop();
}

function getAutoTarget() {
  const ph = noise(frameCount / 50);
  return {
    x: cos(frameCount / 30 + ph) * W * 0.34 + W * 0.5,
    y: sin(frameCount / 50 + ph) * H * 0.32 + H * 0.5,
  };
}

function updateDragon() {
  const t = getAutoTarget();
  updateDragonKinematics(t.x, t.y);
}

function updateDragonKinematics(targetX, targetY) {
  lastDX = dragonX;
  lastDY = dragonY;

  dragonX = lerp(dragonX, targetX, DRAGON_FOLLOW_LERP);
  dragonY = lerp(dragonY, targetY, DRAGON_FOLLOW_LERP);

  const dx = dragonX - lastDX;
  const dy = dragonY - lastDY;
  let nextH = heading;

  if (abs(dx) > 0.0001 || abs(dy) > 0.0001) nextH = atan2(dy, dx);

  speed = dist(dragonX, dragonY, lastDX, lastDY);
  turn = abs(atan2(sin(nextH - heading), cos(nextH - heading)));
  heading = nextH;

  const se = constrain(map(speed, 0.2, 12, 0.0, 0.6), 0, 0.6);
  const te = constrain(map(turn, 0.01, 0.3, 0, 0.4), 0, 0.4);
  const target = max(se * 0.7, se * 0.4 + te * 0.5);
  energy = lerp(energy, target, target > energy ? 0.12 : 0.04);
}

function updateZones() {
  if (frameCount % 3 === 0) updateZoneList(sceneConfig.bgFrags, 0.3, 0.8, 0, 0.1, 0.9, 1.0);
  updateZoneList(zones, 0.28, 1.05, 0.45, 0.14, 0.86, 0.98);
}

function updateZoneList(list, baseE, eMul, tMul, ss0, ss1, lrMul) {
  for (const z of list) {
    const inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    const str = constrain(inf * (baseE + energy * eMul) + turn * tMul, 0, 1);
    const fh = ss(ss0, ss1, str);

    z.currentStrength = str;
    z.glowLevel = approachReactive(z.glowLevel, str, ZONE_ATTACK, ZONE_RELEASE);
    z.fractureLevel = approachReactive(z.fractureLevel, fh, ZONE_ATTACK, ZONE_RELEASE);

    if (z.shards) {
      for (const s of z.shards) {
        const hd = dist(dragonX, dragonY, s.centroid.x, s.centroid.y);
        const lr = max(z.radius[0], z.radius[1]) * lrMul;
        const hf = constrain(1 - hd / lr, 0, 1);
        const target = max(0, fh * 0.72 + hf * 0.82 - s.threshold);
        s.activation = approachReactive(s.activation, target, SHARD_ATTACK, SHARD_RELEASE);
      }
    }

    updateZoneRegroup(z);
  }
}

function updateZoneRegroup(z) {
  if (!z.shards || z.shards.length === 0) return;

  z.regroupCooldown = max(0, (z.regroupCooldown || 0) - 1);
  const fractureSignal = max(z.fractureLevel || 0, (z.currentStrength || 0) * 0.82);
  if (fractureSignal > REGROUP_BREAK_THRESHOLD) z.wasFractured = true;

  const prevFrac = z.prevFractureLevel || 0;
  if (
    z.wasFractured &&
    prevFrac > REGROUP_COMPLETE_THRESHOLD &&
    z.fractureLevel <= REGROUP_COMPLETE_THRESHOLD &&
    (z.regroupCooldown || 0) <= 0
  ) {
    z.mirrorX = -(z.mirrorX || 1);
    z.regroupFlash = 1;
    z.wasFractured = false;
    z.regroupCooldown = REGROUP_COOLDOWN_FRAMES;
  }

  if ((z.regroupFlash || 0) > 0) {
    z.regroupFlash = max(0, z.regroupFlash - COLOR_MORPH_DECAY);
  }

  if (z.flipAnimating) {
    z.flipT = min(1, (z.flipT || 0) + FLIP_SPEED);
    if (z.flipT >= 1) z.flipAnimating = false;
  }

  z.prevFractureLevel = z.fractureLevel;
}

function renderZonesText() {
  zoneLayer.clear();
  zoneLayer.push();
  zoneLayer.textFont("Courier New");
  for (const p of sceneConfig.panels) drawZoneText(zoneLayer, p, false);
  zoneLayer.pop();
}

function buildBgFragTextLayer() {
  bgFragLayer.clear();
  bgFragLayer.push();
  bgFragLayer.textFont("Courier New");
  for (const f of sceneConfig.bgFrags) drawZoneText(bgFragLayer, f, true, true);
  bgFragLayer.pop();
}

function drawZoneText(g, z, subtle, staticMode = false) {
  const b = getZoneBounds(z);
  const area = max(100, b.w * b.h);
  const fs = constrain(map(area, 2200, 90000, 8, staticMode ? 22 : 28), 8, staticMode ? 24 : 34);
  const stepY = fs * (staticMode ? 1.16 : 1.05);
  const alphaBase = subtle ? 60 : 92;
  const alpha = alphaBase + z.glowLevel * 72;

  const snippetA = z.snippet || pickSnippet();
  const snippetB = z.snippet2 || pickSnippet();
  const mixAmt = z.fractureLevel;

  g.push();
  zoneClip(g, z);
  g.noStroke();
  g.textStyle(BOLD);

  let line = 0;
  for (let y = b.minY + fs * 0.7; y <= b.maxY - fs * 0.4; y += stepY) {
    const snippet = line % 2 === 0 ? snippetA : snippetB;
    const c = lerpColor(color(z.fill), color(z.tint), mixAmt);
    const shadow = color(35, 22, 62, 110 + z.glowLevel * 70);
    c.setAlpha(alpha);
    g.textSize(fs + sin(frameCount * 0.02 + line) * (staticMode ? 0.35 : 0.8));
    if (!staticMode) {
      g.fill(shadow);
      g.text(snippet, z.center[0] + 1.1, y + 1.1);
    }
    g.fill(c);
    g.text(snippet, z.center[0], y);
    line += 1;
  }

  g.drawingContext.restore();
  g.pop();

  if (!staticMode && z.shards && z.shards.length > 0) {
    for (const s of z.shards) {
      const act = constrain((s.activation || 0) * 0.78 + z.fractureLevel * 0.22, 0, 1);
      if (act <= 0.01) continue;
      const off = act * 34 * (0.55 + s.depth * 0.95);
      const sx = s.centroid.x + s.dir.x * off;
      const sy = s.centroid.y + s.dir.y * off;
      const sz = 8 + act * 11;

      g.push();
      g.translate(sx, sy);
      g.rotate(atan2(s.dir.y, s.dir.x));
      const t = color(z.rim || z.tint || z.fill);
      t.setAlpha(80 + act * 130);
      g.fill(t);
      g.noStroke();
      g.textSize(sz);
      g.text(s.snippet || "drawPoly(g, s.points);", 0, 0);
      g.pop();
    }
  }
}

function paintPulsesText() {
  pulseLayer.push();
  pulseLayer.textFont("Courier New");
  pulseLayer.textAlign(CENTER, CENTER);
  pulseLayer.noStroke();

  for (const z of zones) {
    const inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    const str = constrain(inf * (0.28 + energy * 1.05) + turn * 0.45, 0, 1);
    if (str < 0.02) continue;

    const text = pickPulseToken(z.pulseSnippet || "zoneInf(dragonX, dragonY, cx, cy, rx, ry)");
    const c = color(z.tint || z.fill || random(PAL_GLOW));
    c.setAlpha(40 + str * 130);
    pulseLayer.fill(c);
    pulseLayer.textSize(11 + str * 16);

    const rings = floor(map(str, 0, 1, 2, 5));
    for (let i = 0; i < rings; i++) {
      const a = (TWO_PI * i) / rings + frameCount * 0.015;
      const r = min(z.radius[0], z.radius[1]) * (0.35 + str * 0.45);
      pulseLayer.text(text, z.center[0] + cos(a) * r, z.center[1] + sin(a) * r);
    }
  }

  pulseLayer.pop();
}

function paintTrailText() {
  const ang = atan2(dragonY - lastDY, dragonX - lastDX);
  const na = ang + HALF_PI;
  const bs = map(sin(frameCount / 11), -1, 1, 34, 92);
  const mc = floor(random(TRACE_COUNT_MIN, TRACE_COUNT_MAX));

  for (let i = 0; i < mc; i++) {
    const lat = randomGaussian() * bs * 0.36;
    const fwd = random(-bs * 0.35, bs * 0.35);
    const px = dragonX + cos(na) * lat + cos(ang) * fwd;
    const py = dragonY + sin(na) * lat + sin(ang) * fwd;

    trailParticles.push({
      x: px,
      y: py,
      rot: ang + random(-0.85, 0.85),
      tokens: buildTrailTokens(),
      points: buildTrailGlyphPoints(random(4 + COMPLEXITY * 4, 7 + COMPLEXITY * 9)),
      size: random(7, 18),
      maxAge: floor(random(TRACE_LIFE_MIN, TRACE_LIFE_MAX)),
      age: 0,
      color: color(random(PAL_TRACE)),
    });
  }

  trailLayer.clear();
  trailLayer.push();
  trailLayer.textFont("Courier New");
  trailLayer.textAlign(CENTER, CENTER);

  const alive = [];
  for (const p of trailParticles) {
    const life = 1 - p.age / p.maxAge;
    if (life <= 0) continue;

    const fade = life * life * (3 - 2 * life);
    const c = color(p.color);
    c.setAlpha(40 + 150 * fade);

    trailLayer.push();
    trailLayer.translate(p.x, p.y);
    trailLayer.rotate(p.rot);
    trailLayer.fill(c);
    trailLayer.noStroke();
    const glyphScale = p.size * (0.55 + fade * 0.75);
    const step = p.age > p.maxAge * 0.45 ? (COMPLEXITY < 0.55 ? 3 : 2) : (COMPLEXITY < 0.42 ? 2 : 1);
    for (let i = 0; i < p.points.length; i += step) {
      const pt = p.points[i];
      const token = p.tokens[i % p.tokens.length];
      trailLayer.push();
      trailLayer.translate(pt.x * glyphScale, pt.y * glyphScale);
      trailLayer.rotate(pt.a + sin(frameCount * 0.04 + i) * 0.15);
      trailLayer.textSize(glyphScale * (0.55 + pt.w * 0.75));
      trailLayer.text(token, 0, 0);
      trailLayer.pop();
    }
    trailLayer.pop();

    p.age += 1;
    if (p.age < p.maxAge) alive.push(p);
  }

  if (alive.length > MAX_TRAIL_PARTICLES) {
    alive.splice(0, alive.length - MAX_TRAIL_PARTICLES);
  }
  trailParticles = alive;
  trailLayer.pop();
}

function buildBackgroundText() {
  bgLayer.clear();
  bgLayer.push();
  bgLayer.textFont("Courier New");
  bgLayer.textAlign(CENTER, CENTER);

  for (let y = 0; y < H; y += 22) {
    const t = y / H;
    const top = color(sceneConfig.gradient.top);
    const mid = color(sceneConfig.gradient.mid);
    const bot = color(sceneConfig.gradient.bottom);
    const col = t < 0.5
      ? lerpColor(top, mid, t / 0.5)
      : lerpColor(mid, bot, (t - 0.5) / 0.5);

    const shadow = color(30, 16, 54, 96);
    col.setAlpha(112);
    bgLayer.noStroke();
    bgLayer.textSize(12 + noise(y * 0.02) * 7);
    const x = W * 0.5 + sin(y * 0.03) * 26;
    const snippet = pickSnippet();
    bgLayer.fill(shadow);
    bgLayer.text(snippet, x + 1.1, y + 11.1);
    bgLayer.fill(col);
    bgLayer.text(snippet, x, y + 10);
  }

  bgLayer.pop();
}

function buildGrainText() {
  randomSeed(SEED + 777);
  grainLayer.clear();
  grainLayer.push();
  grainLayer.textFont("Courier New");
  grainLayer.textAlign(CENTER, CENTER);

  for (let i = 0; i < GRAIN_COUNT; i++) {
    const x = random(W);
    const y = random(H);
    grainLayer.noStroke();
    grainLayer.fill(255, random(12, 30));
    grainLayer.textSize(random(6, 10));
    grainLayer.text(random([".", "{", "}", ";", "()", "[]"]), x, y);
  }

  grainLayer.pop();
}

function generateScene() {
  randomSeed(SEED + 17);
  noiseSeed(SEED + 17);

  const cfg = {
    gradient: {
      top: random(["#e1d5f7", "#e8ddff", "#ddd1f6", "#ece0ff"]),
      mid: random(["#cbb8ee", "#c7b2f1", "#d3c0f3", "#c6b6ea"]),
      bottom: random(["#c7e4f5", "#c9ebfb", "#bee3f2", "#d2effc"]),
    },
    bgFrags: [],
    panels: [],
    reactiveZones: [],
  };

  for (let i = 0, n = BG_FRAG_COUNT; i < n; i++) {
    const sz = random(40, 180);
    const nv = floor(random(3, 6));
    const cx = random(0.02, 0.98) * W;
    const cy = random(0.02, 0.98) * H;
    const rot = random(-PI, PI);
    const pts = [];

    for (let j = 0; j < nv; j++) {
      const a = (TWO_PI * j) / nv + random(-0.4, 0.4) + rot;
      pts.push({
        x: cx + cos(a) * sz * random(0.4, 1),
        y: cy + sin(a) * sz * random(0.4, 1),
      });
    }

    const col = random(["#efe4ff", "#d6d0ff", "#caebff", "#dbcaff", "#d8c9ff", "#cfe7ff", "#f0d2ff"]);
    cfg.bgFrags.push(
      initZoneState({
        kind: "poly",
        role: "bgFrag",
        points: pts,
        center: [cx, cy],
        radius: [sz * 1.2, sz * 1.2],
        fill: col,
        tint: col,
        rim: random(PAL_GLOW),
        alpha: random(18, 72),
        snippet: pickSnippet(),
        snippet2: pickSnippet(),
      })
    );
  }

  const panelCount = PANEL_COUNT;
  const largeCount = min(panelCount - 1, floor(2 + COMPLEXITY * 3));
  const ambientCount = floor(random(max(2, panelCount * 0.34), panelCount * 0.58 + 1));

  const panelAnchors = [];
  for (let i = 0; i < panelCount; i++) {
    const panel = buildRandomPanel(panelAnchors, i < largeCount, cfg.gradient, i < ambientCount);
    cfg.panels.push(panel);
    cfg.reactiveZones.push(panel);
    panelAnchors.push({
      x: panel.center[0],
      y: panel.center[1],
      rx: panel.radius[0],
      ry: panel.radius[1],
    });
  }

  return cfg;
}

function buildRandomPanel(existingAnchors, large, gradient, ambient) {
  let best = null;
  for (let i = 0; i < floor(16 + COMPLEXITY * 12); i++) {
    const rx = large ? random(110, 228) : random(42, 136);
    const ry = large ? random(138, 296) : random(54, 178);
    const cx = random(0.04, 0.96) * W;
    const cy = random(0.04, 0.96) * H;
    const nv = floor(random(4, 8));
    const rot = random(TWO_PI);
    const pts = [];

    for (let j = 0; j < nv; j++) {
      const a = (TWO_PI * j) / nv + rot + random(-0.32, 0.32);
      const px = cx + cos(a) * rx * random(0.52, 1.08);
      const py = cy + sin(a) * ry * random(0.52, 1.08);
      pts.push({
        x: constrain(px, -W * 0.08, W * 1.08),
        y: constrain(py, -H * 0.08, H * 1.08),
      });
    }

    let separation = 999999;
    for (const a of existingAnchors) {
      const dx = (cx - a.x) / max(1, (rx + a.rx) * 0.72);
      const dy = (cy - a.y) / max(1, (ry + a.ry) * 0.72);
      separation = min(separation, sqrt(dx * dx + dy * dy));
    }

    const edgeBias = min(cx, W - cx, cy, H - cy) / min(W, H);
    const score = separation + edgeBias * 0.22 + random(0.0, 0.16);
    if (!best || score > best.score) best = { pts, score };
  }

  const material = buildPanelMaterial(gradient, ambient);
  return mkZone("poly", {
    role: "panel",
    points: best.pts.map((pt) => [pt.x / W, pt.y / H]),
    fill: material.fill,
    tint: material.tint,
    rim: material.rim,
    alpha: ambient ? random(46, 88) : random(96, 132),
    snippet: pickSnippet(),
    snippet2: pickSnippet(),
    pulseSnippet: pickSnippet(),
  });
}

function buildPanelMaterial(gradient, ambient = false) {
  if (!ambient) {
    return {
      fill: random(PAL_TRACE),
      tint: random(PAL_TRACE),
      rim: random(PAL_GLOW),
    };
  }

  const g1 = random([gradient.top, gradient.mid, gradient.bottom]);
  const g2 = random([gradient.top, gradient.mid, gradient.bottom]);
  return {
    fill: mixHex(g1, g2, random(0.25, 0.7)),
    tint: mixHex(g2, random(PAL_TRACE), random(0.14, 0.28)),
    rim: mixHex(g1, random(PAL_GLOW), random(0.22, 0.4)),
  };
}

function mkZone(kind, p) {
  const z = { kind, ...p };
  if (kind === "poly") {
    z.points = p.points.map((pt) => ({ x: pt[0] * W, y: pt[1] * H }));
    const xs = z.points.map((pt) => pt.x);
    const ys = z.points.map((pt) => pt.y);
    z.center = [(min(xs) + max(xs)) * 0.5, (min(ys) + max(ys)) * 0.5];
    z.radius = [max((max(xs) - min(xs)) * 0.62, 96), max((max(ys) - min(ys)) * 0.62, 86)];
  }
  return initZoneState(z);
}

function initZoneState(z) {
  Object.assign(z, {
    currentStrength: 0,
    glowLevel: 0,
    fractureLevel: 0,
    prevFractureLevel: 0,
    wasFractured: false,
    regroupCooldown: 0,
    regroupFlash: 0,
    mirrorX: 1,
    flipAnimating: false,
    flipT: 0,
  });
  z.shards = buildShards(z);
  return z;
}

function buildShards(z) {
  const perim = z.kind === "poly" ? sampleShape(z.points, SHARD_SUBDIV) : [];
  if (perim.length < 3) return [];

  const cx = z.center[0];
  const cy = z.center[1];
  const shards = [];

  for (let i = 0; i < perim.length; i++) {
    const p1 = perim[i];
    const p2 = perim[(i + 1) % perim.length];
    const lp = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

    const pts = [
      lp({ x: cx, y: cy }, p1, random(0.16, 0.36)),
      p1,
      p2,
      lp({ x: cx, y: cy }, p2, random(0.16, 0.36)),
    ];

    let tx = 0;
    let ty = 0;
    for (const p of pts) {
      tx += p.x;
      ty += p.y;
    }

    const centX = tx / 4;
    const centY = ty / 4;
    const dx = centX - cx;
    const dy = centY - cy;
    const mag = max(1, sqrt(dx * dx + dy * dy));

    shards.push({
      points: pts,
      centroid: { x: centX, y: centY },
      dir: { x: dx / mag, y: dy / mag },
      depth: random(0.4, 1),
      threshold: i / perim.length + random(-0.08, 0.1),
      activation: 0,
      snippet: pickSnippet(),
    });
  }

  return shards.sort((a, b) => a.threshold - b.threshold);
}

function sampleShape(pts, sub) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let s = 0; s < sub; s++) {
      const t = s / sub;
      out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    }
  }
  return out;
}

function zoneClip(g, z) {
  const ctx = g.drawingContext;
  ctx.save();
  ctx.beginPath();

  if (z.kind === "poly") {
    ctx.moveTo(z.points[0].x, z.points[0].y);
    for (let i = 1; i < z.points.length; i++) ctx.lineTo(z.points[i].x, z.points[i].y);
    ctx.closePath();
  } else {
    const b = getZoneBounds(z);
    ctx.rect(b.minX, b.minY, b.w, b.h);
  }

  ctx.clip();
}

function getZoneBounds(z) {
  if (z.kind === "poly") {
    const xs = z.points.map((p) => p.x);
    const ys = z.points.map((p) => p.y);
    return {
      minX: min(xs),
      maxX: max(xs),
      minY: min(ys),
      maxY: max(ys),
      w: max(xs) - min(xs),
      h: max(ys) - min(ys),
    };
  }

  return { minX: 0, maxX: W, minY: 0, maxY: H, w: W, h: H };
}

function fadeAlpha(layer, amt) {
  layer.push();
  layer.rectMode(CORNER);
  layer.noStroke();
  layer.drawingContext.save();
  layer.drawingContext.globalCompositeOperation = "destination-out";
  layer.fill(0, 0, 0, amt);
  layer.rect(0, 0, W, H);
  layer.drawingContext.restore();
  layer.pop();
}

function ss(e0, e1, x) {
  const t = constrain((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function zoneInf(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return constrain(1 - sqrt(dx * dx + dy * dy), 0, 1);
}

function approachReactive(current, target, rise, fall) {
  const value = current ?? 0;
  const rate = target > value ? rise : fall;
  return lerp(value, target, rate);
}

function mixHex(a, b, t) {
  return colorToHex(lerpColor(color(a), color(b), t));
}

function colorToHex(c) {
  const col = color(c);
  const toHex = (v) => hex(round(v), 2);
  return `#${toHex(red(col))}${toHex(green(col))}${toHex(blue(col))}`;
}

function pickSnippet() {
  return random(CODE_SNIPPETS);
}

function buildTrailTokens() {
  const snippet = pickSnippet().replace(/[,\.;:{}()]/g, " ");
  const words = snippet.split(/\s+/).filter(Boolean);
  const picked = [];
  const target = floor(random(4 + COMPLEXITY * 2, 7 + COMPLEXITY * 4));
  for (let i = 0; i < target; i++) {
    if (words.length > 0 && random() < 0.62) picked.push(random(words));
    else picked.push(random(TRAIL_TOKEN_POOL));
  }
  return picked;
}

function pickPulseToken(text) {
  const token = text.replace(/[,\.;:{}]/g, " ").split(/\s+/).find(Boolean);
  return token || "zoneInf";
}

function buildTrailGlyphPoints(n) {
  const pts = [];
  const branches = floor(random(2, COMPLEXITY >= 0.68 ? 5 : 4));
  for (let b = 0; b < branches; b++) {
    const baseA = random(TWO_PI);
    const len = random(0.45, 1.2);
    const nodes = floor(n / branches) + floor(random(1, 4));
    for (let i = 0; i < nodes; i++) {
      const t = i / max(1, nodes - 1);
      const radius = t * len + random(-0.08, 0.12);
      const a = baseA + random(-0.45, 0.45);
      pts.push({
        x: cos(a) * radius,
        y: sin(a) * radius,
        a,
        w: random(0.25, 1),
      });
    }
  }
  pts.push({ x: 0, y: 0, a: random(TWO_PI), w: 1.1 });
  return pts.sort(() => random(-1, 1));
}

function fitCanvas() {
  if (!canvasRef || !canvasRef.elt) return;
  const wr = window.innerWidth / window.innerHeight;
  const ar = W / H;
  if (wr > ar) {
    const h = window.innerHeight;
    canvasRef.elt.style.width = `${h * ar}px`;
    canvasRef.elt.style.height = `${h}px`;
  } else {
    const w = window.innerWidth;
    canvasRef.elt.style.width = `${w}px`;
    canvasRef.elt.style.height = `${w / ar}px`;
  }
}

function windowResized() {
  fitCanvas();
}

function keyPressed() {
  if (!canvasRef || !canvasRef.elt) return true;
  if (key === " ") {
    saveCanvas(canvasRef.elt, "interaction3-text-art", "jpg");
    return false;
  }
  return true;
}
