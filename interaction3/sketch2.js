const W = 2000;
const H = 1200;

const SETTINGS = {
  seed: null,
  complexity: 0.56,
  preChangeT: 0.2,
  stageEase: 0.22,
  stage1Steps: 14,
  stage2Steps: 16,
  stage3Steps: 44,
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
const STAGE1_STEPS = Math.max(1, Math.floor(Number(SETTINGS.stage1Steps) || 14));
const STAGE2_STEPS = Math.max(1, Math.floor(Number(SETTINGS.stage2Steps) || 16));
const STAGE3_STEPS = Math.max(1, Math.floor(Number(SETTINGS.stage3Steps) || 44));
const STAGE_TOTAL_STEPS = STAGE1_STEPS + STAGE2_STEPS + STAGE3_STEPS;

const MOUNTAIN_COUNT = Math.floor(420 + COMPLEXITY * 460);
const SKY_FRAG_COUNT = Math.floor(180 + COMPLEXITY * 240);

const PAGE_BG_START = "#08070d";

const PAL_SKY_TOP = [16, 13, 30];
const PAL_SKY_MID = [42, 37, 70];
const PAL_SKY_LOW = [96, 90, 140];
const PAL_MTN_A = [194, 76, 130];
const PAL_MTN_B = [90, 165, 255];

const CODE_SNIPPETS = [
  "const C = Math.cos;",
  "setTransform(i, 0, 0, i, 880 + i + 3 * i * C(i), 700 + 2 * i * C(i / 400));",
  "rotate(i / 6 + t / 2);",
  "fillRect(2, 2, 2, 2);",
  "for (let i = 0; i < 800; i++) mountain.push(point);",
  "const bg = lerpColor(night, paper, stage2Fade);",
  "const morph = s1;",
  "const t = s1 < 1 ? 0 : s2 < 1 ? PRECHANGE_T * s2 : lerp(PRECHANGE_T, 1, s3);",
  "const token = lineFromSource(snippet, idx, 42);",
  "if (key === ' ') stageStep += 1;",
  "drawMountainCode(layer, element, t, morph);",
];

let canvasRef;
let skyLayer;
let mountainLayer;
let composeTargets = [];
let mountainElements = [];
let skyFragments = [];

let stageStep = 0;
let stageVisual = 0;

function setup() {
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  canvasRef = createCanvas(W, H);
  frameRate(60);
  smooth();

  skyLayer = createGraphics(W, H);
  mountainLayer = createGraphics(W, H);

  [skyLayer, mountainLayer].forEach((l) => {
    l.smooth();
    l.textFont("Courier New");
    l.textAlign(CENTER, CENTER);
  });

  randomSeed(SEED);
  noiseSeed(SEED);

  buildComposeTargets();
  buildSkyFragments();
  buildMountainElements();

  fitCanvas();
  console.info("Interaction3 mountain-code seed:", SEED, "complexity:", COMPLEXITY.toFixed(2));
}

function draw() {
  const stageTarget = stageStep / STAGE_TOTAL_STEPS;
  stageVisual = lerp(stageVisual, stageTarget, STAGE_EASE);
  if (abs(stageVisual - stageTarget) < 0.001) stageVisual = stageTarget;

  const { s1, s2, s3 } = getStageProgress(stageVisual);
  const morph = s1;
  const t = s1 < 1 ? 0 : s2 < 1 ? PRECHANGE_T * s2 : lerp(PRECHANGE_T, 1, s3);
  const stage2BgFade = s1 < 1 ? 0 : s2;

  updatePageBackground(stage2BgFade);

  skyLayer.clear();
  mountainLayer.clear();

  drawBackground(stage2BgFade, t);
  drawSkyTextMatter(t, morph);
  drawMountainCodeMatter(t, morph);

  background(255);
  image(skyLayer, 0, 0);
  image(mountainLayer, 0, 0);
}

function drawBackground(stage2BgFade, t) {
  const avgLoss = stageColorLoss(t);
  const bgT = constrain(stage2BgFade * 0.86 + avgLoss * 0.14, 0, 1);
  const topC = lerpColor(color(PAL_SKY_TOP[0], PAL_SKY_TOP[1], PAL_SKY_TOP[2]), color(255), bgT);
  const midC = lerpColor(color(PAL_SKY_MID[0], PAL_SKY_MID[1], PAL_SKY_MID[2]), color(255), bgT);
  const lowC = lerpColor(color(PAL_SKY_LOW[0], PAL_SKY_LOW[1], PAL_SKY_LOW[2]), color(255), bgT);

  for (let y = 0; y < H; y += 2) {
    const p = y / H;
    const c = p < 0.58 ? lerpColor(topC, midC, p / 0.58) : lerpColor(midC, lowC, (p - 0.58) / 0.42);
    skyLayer.stroke(c);
    skyLayer.line(0, y, W, y);
  }

  const hazeAlpha = 80 * (1 - ss(0.4, 1, t));
  skyLayer.noStroke();
  skyLayer.fill(255, 220, 235, hazeAlpha);
  skyLayer.ellipse(W * 0.5, H * 0.72, W * 1.2, H * 0.45);
}

function drawSkyTextMatter(t, morph) {
  skyLayer.push();
  skyLayer.textAlign(CENTER, CENTER);
  skyLayer.noStroke();

  for (const f of skyFragments) {
    const ep = elementProgress(t, f.composeIndex, 0.06);
    const colorLoss = stageColorLoss(ep);
    const shapeLoss = stageShapeLoss(ep);
    const moveLoss = stageMoveLoss(ep);
    const target = getComposeTarget(f.composeIndex);

    const x = lerp(f.x, target.x + f.tx, moveLoss);
    const y = lerp(f.y, target.y, moveLoss);

    if (morph < 1) {
      const c = lerpColor(color(f.colA[0], f.colA[1], f.colA[2]), color(f.colB[0], f.colB[1], f.colB[2]), f.mix);
      c.setAlpha(f.alpha * (1 - morph));
      skyLayer.fill(c);
      if (shapeLoss < 0.55) {
        skyLayer.rect(x - f.w * 0.5, y - f.h * 0.5, f.w, f.h, 2);
      }
    }

    const codeAppear = ss(0.05, 0.88, morph);
    if (codeAppear <= 0.001) continue;

    const tc = morphColorToPlain(color(190, 180, 255), colorLoss + moveLoss * 0.2);
    tc.setAlpha((34 + f.alpha * 1.2) * codeAppear);
    skyLayer.fill(tc);

    skyLayer.textSize(lerp(f.size, 12, shapeLoss * 0.8 + moveLoss * 0.2));
    const line = shapeLoss < 0.48 ? f.token : lineFromSource(f.snippet, f.composeIndex, 30);
    if (moveLoss > 0.82) skyLayer.textAlign(LEFT, TOP);
    skyLayer.text(line, x, y);
    if (moveLoss > 0.82) skyLayer.textAlign(CENTER, CENTER);
  }

  skyLayer.pop();
}

function drawMountainCodeMatter(t, morph) {
  mountainLayer.push();
  mountainLayer.textAlign(CENTER, CENTER);
  mountainLayer.noStroke();

  const mt = millis() * 0.001;
  for (const el of mountainElements) {
    const ep = elementProgress(t, el.composeIndex, 0.02);
    const colorLoss = stageColorLoss(ep);
    const shapeLoss = stageShapeLoss(ep);
    const moveLoss = stageMoveLoss(ep);

    const i = el.i;
    const x0 = 880 + i + 3 * i * cos(i + mt * 0.8);
    const y0 = 700 + 2 * i * cos(i / 400);
    const a0 = i / 6 + mt / 2;

    const target = getComposeTarget(el.composeIndex);
    const px = lerp(x0, target.x + el.tx, moveLoss);
    const py = lerp(y0, target.y + el.ty, moveLoss);
    const rot = lerp(a0, 0, shapeLoss);
    const boxSize = lerp(el.size, 12, shapeLoss * 0.85 + moveLoss * 0.15);

    if (morph < 1) {
      const col = lerpColor(color(PAL_MTN_A[0], PAL_MTN_A[1], PAL_MTN_A[2]), color(PAL_MTN_B[0], PAL_MTN_B[1], PAL_MTN_B[2]), el.mix);
      col.setAlpha(el.alpha * (1 - morph));
      mountainLayer.push();
      mountainLayer.translate(px, py);
      mountainLayer.rotate(rot);
      mountainLayer.fill(col);
      mountainLayer.rectMode(CENTER);
      mountainLayer.rect(0, 0, boxSize, boxSize);
      mountainLayer.pop();
    }

    const codeAppear = ss(0.06, 0.9, morph);
    if (codeAppear <= 0.001) continue;

    const tc = morphColorToPlain(color(el.baseCol), colorLoss + moveLoss * 0.18);
    tc.setAlpha((42 + el.alpha * 1.4) * codeAppear);

    mountainLayer.push();
    mountainLayer.translate(px, py);
    mountainLayer.rotate(rot * (1 - shapeLoss));
    mountainLayer.fill(tc);
    mountainLayer.textSize(lerp(boxSize * 0.78, 12, shapeLoss * 0.8 + moveLoss * 0.2));
    const text = shapeLoss < 0.5 ? el.snippet : lineFromSource(el.snippet, el.composeIndex, 36);
    if (moveLoss > 0.82) mountainLayer.textAlign(LEFT, TOP);
    mountainLayer.text(text, 0, 0);
    mountainLayer.pop();

    if (moveLoss > 0.82) mountainLayer.textAlign(CENTER, CENTER);
  }

  mountainLayer.pop();
}

function buildSkyFragments() {
  skyFragments = [];
  for (let i = 0; i < SKY_FRAG_COUNT; i++) {
    const yy = random(H * 0.05, H * 0.68);
    skyFragments.push({
      x: random(30, W - 30),
      y: yy,
      w: random(10, 48),
      h: random(2, 10),
      size: random(8, 13),
      alpha: random(18, 72),
      mix: random(),
      colA: [130, 95, 190],
      colB: [120, 165, 245],
      snippet: CODE_SNIPPETS[i % CODE_SNIPPETS.length],
      token: ["const", "bg", "mountain", "lerp", "fillRect"][i % 5],
      composeIndex: i,
      tx: random(-10, 18),
    });
  }
}

function buildMountainElements() {
  mountainElements = [];
  for (let k = 0; k < MOUNTAIN_COUNT; k++) {
    const i = map(k, 0, Math.max(1, MOUNTAIN_COUNT - 1), 0, 800);
    const snippet = CODE_SNIPPETS[k % CODE_SNIPPETS.length];
    mountainElements.push({
      i,
      size: random(2, 18),
      alpha: random(24, 120),
      mix: random(),
      snippet,
      composeIndex: k,
      tx: random(-12, 22),
      ty: random(-6, 8),
      baseCol: random(["#d04d8a", "#7ab4ff", "#bc87e8", "#57a0ff"]),
    });
  }
}

function buildComposeTargets() {
  composeTargets = [];
  const x = 28;
  const top = 30;
  const lineH = 16;
  let y = top;
  let i = 0;
  while (y < H - 24) {
    composeTargets.push({
      x,
      y,
      line: lineFromSource(CODE_SNIPPETS[i % CODE_SNIPPETS.length], i, 82),
      index: i,
    });
    y += lineH;
    i += 1;
  }
}

function getComposeTarget(index) {
  if (composeTargets.length === 0) {
    return { x: 28, y: 30, line: "const mountain = [];", index: 0 };
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
  let x = Math.sin((n + 1) * 12.9898) * 43758.5453;
  return Math.abs(Math.floor((x - Math.floor(x)) * 100000));
}

function lineFromSource(source, idx, targetChars = 48) {
  const words = source
    .replace(/[^\w\[\]\(\)\{\};=<>+\-*\/]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const pool = words.length > 0 ? words : ["const", "mountain", "draw", "code"];
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
  return lerpColor(lerpColor(col, gCol, ss(0.08, 0.86, t)), kCol, ss(0.72, 1, t));
}

function updatePageBackground(stage2Fade) {
  const c = lerpColor(color(PAGE_BG_START), color("#ffffff"), stage2Fade);
  const css = `rgb(${round(red(c))}, ${round(green(c))}, ${round(blue(c))})`;
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
    saveCanvas(canvasRef.elt, "interaction3-mountain-code", "jpg");
    return false;
  }
  return true;
}
