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
const PAGE_BG_START = "#8ea5cd";
const MOUNTAIN_RENDER_SCALE = 0.5;
const BG_RENDER_INTERVAL = 2;
const MOUNTAIN_RENDER_INTERVAL = 2;
const FINAL_FONT_SIZE = 22;
const FINAL_LINE_HEIGHT = 26;
const FINAL_CODE_X = 24;
const FINAL_CODE_TOP = 32;
const FINAL_CODE_WIDTH = 1320;
const TARGETS_PER_LINE = 18;

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
const FINAL_CODE_LINES = [
  "document.body.style='margin:0;display:grid;place-items:center;height:100vh;background:#000',",
  "c.width=2e3,c.height=1200,c.style='width:min(96vw,160vh)',x=c.getContext`2d`,C=Math.cos,r=Math.random,",
  "R=(r,g,b,a)=>`rgba(${r},${g},${b},${a})`,A=new AudioContext,t=p=b=0,",
  "(h=_=>{c.width|=0;t+=.06;with(x){",
  "for(i=800;i--;fillRect(~setTransform(i,0,0,i,880+i+3*i*C(i),700+2*i*C(i/400)),~rotate(i/6+t/2),2,2))",
  "fillStyle=R(i/5,i/4,i/3,.07);",
  "if(p){resetTransform(),globalAlpha=p,fillStyle=strokeStyle='#fff',fillRect(0,0,2e3,1200),lineWidth=4,",
  "beginPath(),moveTo(X=b,Y=v=0);for(i=60;i--;)lineTo(X+=i%4?v:v=v*.7+r()*24-12,Y+=18),i||stroke();p*=.6}}})(),",
  "setInterval(h,40),g=_=>(o=A.createOscillator(),o.connect(A.destination),o.frequency.value=18,o.start(),",
  "o.stop(A.currentTime+1),b=r()*2e3,p=1),onkeydown=e=>e.which-32||(A.resume(),g())",
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
    drawBackgroundMatter(t, morph, s3, stage2BgFade, activeRatio);
  }
  if (redrawMountain) {
    drawMountainMatter(t, morph, s3, activeRatio);
  }

  background(255);
  const sceneFade = 1 - ss(0.45, 1, s3);
  push();
  tint(255, 255 * sceneFade);
  image(bgLayer, 0, 0);
  image(mountainLayer, 0, 0, W, H);
  pop();
  drawFinalCodePage(s3);
}

function drawBackgroundMatter(t, morph, s3, stage2BgFade, activeRatio) {
  const bgFade = 1 - stage2BgFade;
  const stage3Mix = ss(0.08, 1, s3);
  const stage3Lock = ss(0.2, 0.92, s3);
  bgLayer.rectMode(CORNER);
  bgLayer.noStroke();
  const baseBg = lerpColor(color(142, 165, 205), color(255), stage2BgFade);
  bgLayer.fill(baseBg);
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

    const xMove = lerp(b.x, target.x + b.tx, moveLoss);
    const yMove = lerp(b.y, target.y, moveLoss);
    const x = lerp(xMove, target.x, stage3Lock);
    const y = lerp(yMove, target.y, stage3Lock);

    if (morph < 1) {
      const a = b.alpha * (1 - morph) * (0.35 + 0.65 * bgFade);
      bgLayer.fill(14 + b.tint, 20 + b.tint, 26 + b.tint * 1.1, a);
      if (shapeLoss < 0.62) {
        bgLayer.rectMode(CENTER);
        bgLayer.rect(x, y, b.w * (1 - shapeLoss * 0.5), b.h, 1.5);
      }
    }

    if (codeAppear <= 0.001) continue;

    bgLayer.textFont(stage3Mix < 0.52 ? "Helvetica Neue" : "Courier New");

    const plain = morphColorToPlain(
      color(130, 150, 185),
      colorLoss + moveLoss * 0.2,
    );
    const tc = lerpColor(plain, color(0, 0, 0), ss(0.15, 1, s3));
    const finalAlpha = 232;
    tc.setAlpha(lerp((12 + b.alpha * 0.85) * codeAppear, finalAlpha, stage3Mix));
    bgLayer.fill(tc);
    bgLayer.textSize(
      lerp(b.size, 12, shapeLoss * 0.76 + moveLoss * 0.24) *
        (1 - stage3Mix) +
        FINAL_FONT_SIZE * stage3Mix,
    );

    let text =
      shapeLoss < 0.5
        ? b.token
        : lineFromSource(b.snippet, b.composeIndex + 3, 34);
    if (stage3Mix > 0.35) {
      const reveal = Math.max(
        6,
        Math.floor(lerp(8, target.line.length, ss(0.35, 1, s3))),
      );
      text = target.line.slice(0, reveal);
    }

    if (moveLoss > 0.84) bgLayer.textAlign(LEFT, TOP);
    bgLayer.text(text, x, y);
    if (moveLoss > 0.84) bgLayer.textAlign(CENTER, CENTER);
  }
}

function drawFinalCodePage(s3) {
  const appear = ss(0.1, 1, s3);
  if (appear <= 0.001) return;

  push();
  textFont("Courier New");
  textAlign(LEFT, TOP);
  const c = lerpColor(color(128, 145, 176), color(0, 0, 0), ss(0.25, 1, s3));
  c.setAlpha(40 + 215 * appear);
  noStroke();
  fill(c);
  textSize(FINAL_FONT_SIZE);

  const x = FINAL_CODE_X;
  const top = FINAL_CODE_TOP;
  const lineH = FINAL_LINE_HEIGHT;
  let y = top;
  for (const line of FINAL_CODE_LINES) {
    if (y > H - 24) break;
    text(line, x, y);
    y += lineH;
  }
  pop();
}

function drawMountainMatter(t, morph, s3, activeRatio) {
  mountainLayer.push();
  mountainLayer.textAlign(CENTER, CENTER);
  mountainLayer.noStroke();

  const mt = millis() * 0.001;
  const codeAppear = ss(0.06, 0.9, morph);
  const rs = MOUNTAIN_RENDER_SCALE;
  const stage3Mix = ss(0.08, 1, s3);
  const stage3Lock = ss(0.2, 0.92, s3);

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
    const xMove = lerp(tx, target.x + el.tx, moveLoss);
    const yMove = lerp(ty, target.y + el.ty, moveLoss);
    const px = lerp(xMove, target.x, stage3Lock) * rs;
    const py = lerp(yMove, target.y, stage3Lock) * rs;
    const rot = lerp(lerp(ang, 0, shapeLoss), 0, stage3Mix);

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

    mountainLayer.textFont(stage3Mix < 0.52 ? "Helvetica Neue" : "Courier New");
    const plain = morphColorToPlain(
      color(el.r, el.g, el.b),
      colorLoss + moveLoss * 0.2,
    );
    const tc = lerpColor(plain, color(0, 0, 0), ss(0.15, 1, s3));
    const finalAlpha = 232;
    tc.setAlpha(lerp((26 + el.a * 210) * codeAppear, finalAlpha, stage3Mix));

    mountainLayer.push();
    mountainLayer.translate(px, py);
    mountainLayer.rotate(rot * (1 - shapeLoss));
    mountainLayer.fill(tc);
    mountainLayer.textSize(
      (lerp(max(8, baseSize * 0.15), 12, shapeLoss * 0.84 + moveLoss * 0.16) *
        (1 - stage3Mix) +
        FINAL_FONT_SIZE * stage3Mix) *
        rs,
    );

    let text =
      shapeLoss < 0.52
        ? el.token
        : lineFromSource(el.snippet, el.composeIndex, 42);
    if (stage3Mix > 0.35) {
      const reveal = Math.max(
        8,
        Math.floor(lerp(10, target.line.length, ss(0.35, 1, s3))),
      );
      text = target.line.slice(0, reveal);
    }

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
  let idx = 0;
  for (let lineIdx = 0; lineIdx < FINAL_CODE_LINES.length; lineIdx++) {
    const line = FINAL_CODE_LINES[lineIdx];
    const y = FINAL_CODE_TOP + lineIdx * FINAL_LINE_HEIGHT;

    // Left anchor per line for final readability alignment.
    composeTargets.push({
      x: FINAL_CODE_X,
      y,
      line,
      index: idx++,
    });

    // Distributed anchors across code width so migrated elements form
    // the block footprint instead of a single vertical strip.
    for (let s = 0; s < TARGETS_PER_LINE; s++) {
      const nx = TARGETS_PER_LINE <= 1 ? 0 : s / (TARGETS_PER_LINE - 1);
      const x = FINAL_CODE_X + nx * FINAL_CODE_WIDTH;
      composeTargets.push({
        x: x + random(-8, 8),
        y: y + random(-2.2, 2.2),
        line,
        index: idx++,
      });
    }
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
