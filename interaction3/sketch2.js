const W = 2000;
const H = 1200;

const SETTINGS = {
  seed: null,
  complexity: 0.2,
  preChangeT: 0.2,
  stageEase: 0.22,
  stage1Steps: 5,
  stage2Steps: 5,
  stage3Steps: 10,
  elementReductionRate: 1.35,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ss = (e0, e1, x) => {
  const t = constrain((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

const HAS_CUSTOM_SEED =
  SETTINGS.seed !== null && SETTINGS.seed !== undefined && SETTINGS.seed !== "";
const SEED =
  HAS_CUSTOM_SEED && Number.isFinite(Number(SETTINGS.seed))
    ? Number(SETTINGS.seed)
    : Math.floor(Math.random() * 1000000000);
const COMPLEXITY = clamp(Number(SETTINGS.complexity), 0.2, 1.0);

const PRECHANGE_T = clamp(Number(SETTINGS.preChangeT), 0.02, 0.6);
const STAGE_EASE = clamp(Number(SETTINGS.stageEase), 0.05, 0.45);
const ELEMENT_REDUCTION_RATE = Math.max(
  0.05,
  Number(SETTINGS.elementReductionRate) || 1.35,
);
const STAGE3_KEEP_RATIO = 0.24;
const STAGE1_STEPS = Math.max(
  1,
  Math.floor(Number(SETTINGS.stage1Steps) || 14),
);
const STAGE2_STEPS = Math.max(
  1,
  Math.floor(Number(SETTINGS.stage2Steps) || 16),
);
const STAGE3_STEPS = Math.max(
  1,
  Math.floor(Number(SETTINGS.stage3Steps) || 44),
);
const STAGE_TOTAL_STEPS = STAGE1_STEPS + STAGE2_STEPS + STAGE3_STEPS;

const MOUNTAIN_COUNT = 800;
const BG_TOKEN_COUNT = Math.floor(220 + COMPLEXITY * 240);
const PAGE_BG_START = "#000000";
const MOUNTAIN_RENDER_SCALE = 0.5;
const BG_RENDER_INTERVAL = 2;
const MOUNTAIN_RENDER_INTERVAL = 2;

const CODE_SNIPPETS = [
  "const C = Math.cos;",
  "for (let i = 800; i--; ) {",
  "ctx.setTransform(i, 0, 0, i, 880 + i + 3 * i * C(i), 700 + 2 * i * C(i / 400));",
  "ctx.rotate(i / 6 + t / 2);",
  "ctx.fillStyle = `rgba(${i/5}, ${i/4}, ${i/3}, 0.07)`;",
  "ctx.fillRect(-1, -1, 2, 2);",
  "const morph = s1;",
  "const t = s1 < 1 ? 0 : s2 < 1 ? PRECHANGE_T * s2 : lerp(PRECHANGE_T, 1, s3);",
  "const ep = elementProgress(t, idx, 0.06);",
  "if (key === ' ') stageStep += 1;",
  "drawMountainToCode(layer, element, t, morph);",
];

let canvasRef;
let bgLayer;
let mountainLayer;
let composeTargets = [];
let mountainElements = [];
let bgTokens = [];

let stageStep = 0;
let stageVisual = 0;
let lastBgStyle = "";

function setup() {
  pixelDensity(1);
  canvasRef = createCanvas(W, H);
  frameRate(30);
  smooth();

  bgLayer = createGraphics(W, H);
  mountainLayer = createGraphics(
    Math.floor(W * MOUNTAIN_RENDER_SCALE),
    Math.floor(H * MOUNTAIN_RENDER_SCALE),
  );

  [bgLayer, mountainLayer].forEach((l) => {
    l.smooth();
    l.textFont("Courier New");
    l.textAlign(CENTER, CENTER);
  });

  randomSeed(SEED);
  noiseSeed(SEED);

  buildComposeTargets();
  buildBackgroundTokens();
  buildMountainElements();

  fitCanvas();
  console.info("Interaction3 huaguoshan mountain->code seed:", SEED);
}

function draw() {
  const stageTarget = stageStep / STAGE_TOTAL_STEPS;
  stageVisual = lerp(stageVisual, stageTarget, STAGE_EASE);
  if (abs(stageVisual - stageTarget) < 0.001) stageVisual = stageTarget;
  const stageAnimating = abs(stageVisual - stageTarget) > 0.0005;

  const { s1, s2, s3 } = getStageProgress(stageVisual);
  const morph = s1;
  const t = s1 < 1 ? 0 : s2 < 1 ? PRECHANGE_T * s2 : lerp(PRECHANGE_T, 1, s3);
  const stage2BgFade = s1 < 1 ? 0 : s2;
  const activeRatio = getActiveElementRatio();

  updatePageBackground(stage2BgFade);

  const redrawBg = frameCount % BG_RENDER_INTERVAL === 0;
  const redrawMountain =
    frameCount % MOUNTAIN_RENDER_INTERVAL === 0 || stageAnimating;

  if (redrawBg) bgLayer.clear();
  if (redrawMountain) mountainLayer.clear();

  if (redrawBg) {
    drawBackgroundMatter(t, morph, stage2BgFade, activeRatio);
  }
  if (redrawMountain) {
    drawMountainMatter(t, morph, activeRatio);
  }

  background(255);
  image(bgLayer, 0, 0);
  image(mountainLayer, 0, 0, W, H);
}

function drawBackgroundMatter(t, morph, stage2BgFade, activeRatio) {
  const darkness = 1 - stage2BgFade;
  bgLayer.noStroke();
  bgLayer.fill(0, 0, 0, 255 * darkness);
  bgLayer.rect(0, 0, W, H);

  const codeAppear = ss(0.04, 0.86, morph);
  bgLayer.textAlign(CENTER, CENTER);

  for (const b of bgTokens) {
    if (b.keepRank > activeRatio) continue;
    const ep = elementProgress(t, b.composeIndex, 0.12);
    const colorLoss = stageColorLoss(ep);
    const shapeLoss = stageShapeLoss(ep);
    const moveLoss = stageMoveLoss(ep);
    const target = getComposeTarget(b.composeIndex);

    const x = lerp(b.x, target.x + b.tx, moveLoss);
    const y = lerp(b.y, target.y, moveLoss);

    if (morph < 1) {
      const a = b.alpha * (1 - morph) * darkness;
      bgLayer.fill(14 + b.tint, 20 + b.tint, 26 + b.tint * 1.1, a);
      if (shapeLoss < 0.62) {
        bgLayer.rectMode(CENTER);
        bgLayer.rect(x, y, b.w * (1 - shapeLoss * 0.5), b.h, 1.5);
      }
    }

    if (codeAppear <= 0.001) continue;

    const tc = morphColorToPlain(
      color(130, 150, 185),
      colorLoss + moveLoss * 0.2,
    );
    tc.setAlpha((18 + b.alpha * 0.9) * codeAppear);
    bgLayer.fill(tc);
    bgLayer.textSize(lerp(b.size, 12, shapeLoss * 0.76 + moveLoss * 0.24));

    const text =
      shapeLoss < 0.5
        ? b.token
        : lineFromSource(b.snippet, b.composeIndex + 3, 34);

    if (moveLoss > 0.84) bgLayer.textAlign(LEFT, TOP);
    bgLayer.text(text, x, y);
    if (moveLoss > 0.84) bgLayer.textAlign(CENTER, CENTER);
  }
}

function drawMountainMatter(t, morph, activeRatio) {
  mountainLayer.push();
  mountainLayer.textAlign(CENTER, CENTER);
  mountainLayer.noStroke();

  const mt = millis() * 0.001;
  const codeAppear = ss(0.06, 0.9, morph);
  const rs = MOUNTAIN_RENDER_SCALE;

  for (const el of mountainElements) {
    if (el.keepRank > activeRatio) continue;
    const ep = elementProgress(t, el.composeIndex, 0.02);
    const colorLoss = stageColorLoss(ep);
    const shapeLoss = stageShapeLoss(ep);
    const moveLoss = stageMoveLoss(ep);

    // Original piece math from work/l.js.
    const i = el.i;
    const tx = 880 + i + 3 * i * cos(i);
    const ty = 700 + 2 * i * cos(i / 400);
    const ang = i / 6 + mt / 2;
    const baseSize = max(2, i * 2);

    const target = getComposeTarget(el.composeIndex);
    const px = lerp(tx, target.x + el.tx, moveLoss) * rs;
    const py = lerp(ty, target.y + el.ty, moveLoss) * rs;
    const rot = lerp(ang, 0, shapeLoss);

    if (morph < 1) {
      const drawSize = lerp(baseSize, 13, shapeLoss * 0.8 + moveLoss * 0.2);
      mountainLayer.push();
      mountainLayer.translate(px, py);
      mountainLayer.rotate(rot);
      mountainLayer.rectMode(CENTER);
      mountainLayer.noStroke();
      mountainLayer.fill(el.r, el.g, el.b, 255 * el.a * (1 - morph));
      mountainLayer.rect(0, 0, drawSize * rs, drawSize * rs);
      mountainLayer.pop();
    }

    if (codeAppear <= 0.001) continue;

    const tc = morphColorToPlain(
      color(el.r, el.g, el.b),
      colorLoss + moveLoss * 0.2,
    );
    tc.setAlpha((26 + el.a * 210) * codeAppear);

    mountainLayer.push();
    mountainLayer.translate(px, py);
    mountainLayer.rotate(rot * (1 - shapeLoss));
    mountainLayer.fill(tc);
    mountainLayer.textSize(
      lerp(max(8, baseSize * 0.15), 12, shapeLoss * 0.84 + moveLoss * 0.16) * rs,
    );

    const text =
      shapeLoss < 0.52
        ? el.token
        : lineFromSource(el.snippet, el.composeIndex, 42);

    if (moveLoss > 0.84) mountainLayer.textAlign(LEFT, TOP);
    mountainLayer.text(text, 0, 0);
    mountainLayer.pop();

    if (moveLoss > 0.84) mountainLayer.textAlign(CENTER, CENTER);
  }

  mountainLayer.pop();
}

function buildBackgroundTokens() {
  bgTokens = [];
  for (let i = 0; i < BG_TOKEN_COUNT; i++) {
    const y = random(H * 0.04, H * 0.95);
    bgTokens.push({
      x: random(18, W - 18),
      y,
      w: random(4, 26),
      h: random(1.5, 5),
      size: random(8, 12),
      alpha: random(8, 30),
      tint: random(0, 34),
      snippet: CODE_SNIPPETS[i % CODE_SNIPPETS.length],
      token: ["const", "ctx", "fillRect", "setTransform", "rotate"][i % 5],
      composeIndex: 1200 + i,
      tx: random(-8, 14),
      keepRank: random(),
    });
  }
}

function buildMountainElements() {
  mountainElements = [];
  for (let idx = 0; idx < MOUNTAIN_COUNT; idx++) {
    const i = MOUNTAIN_COUNT - 1 - idx;
    const snippet = CODE_SNIPPETS[idx % CODE_SNIPPETS.length];
    mountainElements.push({
      i,
      r: i / 5,
      g: i / 4,
      b: i / 3,
      a: 0.07,
      snippet,
      token: ["i", "C(i)", "fillRect", "setTransform", "rgba"][idx % 5],
      composeIndex: idx,
      tx: random(-10, 16),
      ty: random(-6, 7),
      keepRank: random(),
    });
  }
}

function getActiveElementRatio() {
  const transitionSteps = STAGE1_STEPS + STAGE2_STEPS;
  const progress = constrain(stageStep / transitionSteps, 0, 1);
  const eased = Math.pow(progress, ELEMENT_REDUCTION_RATE);
  return lerp(1, STAGE3_KEEP_RATIO, eased);
}

function buildComposeTargets() {
  composeTargets = [];
  const x = 24;
  const top = 28;
  const lineH = 16;
  let y = top;
  let i = 0;
  while (y < H - 24) {
    composeTargets.push({
      x,
      y,
      line: lineFromSource(CODE_SNIPPETS[i % CODE_SNIPPETS.length], i, 84),
      index: i,
    });
    y += lineH;
    i += 1;
  }
}

function getComposeTarget(index) {
  if (composeTargets.length === 0) {
    return { x: 24, y: 28, line: "for (let i = 800; i--; ) { }", index: 0 };
  }
  return composeTargets[index % composeTargets.length];
}

function getStageProgress(v) {
  const p1 = STAGE1_STEPS / STAGE_TOTAL_STEPS;
  const p2 = (STAGE1_STEPS + STAGE2_STEPS) / STAGE_TOTAL_STEPS;
  return {
    s1: constrain(v / p1, 0, 1),
    s2: constrain((v - p1) / (p2 - p1), 0, 1),
    s3: constrain((v - p2) / (1 - p2), 0, 1),
  };
}

function elementProgress(t, idx, delay = 0) {
  const phase = (stableHash(idx + 11) % 17) / 100;
  return constrain((t - delay - phase) / (1 - delay), 0, 1);
}

function stageColorLoss(ep) {
  return ss(0.0, 0.33, ep);
}

function stageShapeLoss(ep) {
  return ss(0.33, 0.66, ep);
}

function stageMoveLoss(ep) {
  return ss(0.66, 1.0, ep);
}

function stableHash(n) {
  const x = Math.sin((n + 1) * 12.9898) * 43758.5453;
  return Math.abs(Math.floor((x - Math.floor(x)) * 100000));
}

function lineFromSource(source, idx, targetChars = 48) {
  const words = source
    .replace(/[^\w\[\]\(\)\{\};=<>+\-*\/]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const pool = words.length > 0 ? words : ["const", "ctx", "draw", "mountain"];
  let out = "";
  let k = 0;
  while (out.length < targetChars) {
    const w = pool[(idx + k) % pool.length];
    out += (k === 0 ? "" : " ") + w;
    k += 1;
  }
  return out.slice(0, targetChars);
}

function morphColorToPlain(c, t) {
  const col = color(c);
  const gray = red(col) * 0.299 + green(col) * 0.587 + blue(col) * 0.114;
  const gCol = color(gray, gray, gray);
  const kCol = color(0, 0, 0);
  return lerpColor(
    lerpColor(col, gCol, ss(0.08, 0.86, t)),
    kCol,
    ss(0.72, 1, t),
  );
}

function updatePageBackground(stage2Fade) {
  const c = lerpColor(color(PAGE_BG_START), color("#ffffff"), stage2Fade);
  const css = `rgb(${round(red(c))}, ${round(green(c))}, ${round(blue(c))})`;
  if (css === lastBgStyle) return;
  lastBgStyle = css;
  document.documentElement.style.background = css;
  document.body.style.background = css;
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
    if (stageStep < STAGE_TOTAL_STEPS) stageStep += 1;
    return false;
  }
  if (key === "s" || key === "S") {
    saveCanvas(canvasRef.elt, "huaguoshan-mountain-to-code", "jpg");
    return false;
  }
  return true;
}
