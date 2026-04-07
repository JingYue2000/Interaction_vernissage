const WHOLE_CONFIG = {
  first: "index.html",
  second: "index2.html",
  channel: "vern-interaction3-bridge",
  handoffSteps: 8,
  crossfadeMs: 700,
};
const SKETCH1_ASPECT = 720 / 1020;
const SKETCH2_ASPECT = 2000 / 1200;
const PAGE_BG_START = { r: 213, g: 199, b: 239 };
const PAGE_BG_END = { r: 0, g: 0, b: 0 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let host = null;
let frame = null;
let pendingFrame = null;
let switched = false;
let switching = false;
let lastStep = 0;
let lastTotal = 0;
let handoffStep = 0;
let fadeStartMs = 0;
let fadeRaf = 0;

function bootWhole() {
  host = document.getElementById("whole-host");
  if (!host) return;
  host.style.position = "relative";
  host.style.overflow = "hidden";

  frame = createFrame(WHOLE_CONFIG.first);
  frame.addEventListener("load", onFirstFrameLoad);
  host.replaceChildren(frame);
  applyFrameMorph();

  window.addEventListener("message", onMessage, false);
  window.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keydown", onKeyDown, true);
}

function createFrame(src) {
  const f = document.createElement("iframe");
  f.className = "whole-frame";
  f.src = src;
  f.title = "Interaction 3 Whole Sequence";
  f.setAttribute("allow", "fullscreen");
  f.style.position = "absolute";
  f.style.left = "50%";
  f.style.top = "50%";
  f.style.transform = "translate(-50%, -50%)";
  f.style.border = "0";
  f.style.opacity = "1";
  return f;
}

function onFirstFrameLoad() {
  if (!frame || switched) return;
  handoffStep = 0;
  postToFrame(frame, { type: "setHandoffStep", step: 0, total: WHOLE_CONFIG.handoffSteps });
  postToFrame(frame, { type: "requestStage" });
  applyFrameMorph();
}

function postToFrame(targetFrame, payload) {
  if (!targetFrame || !targetFrame.contentWindow) return;
  targetFrame.contentWindow.postMessage(
    { channel: WHOLE_CONFIG.channel, ...payload },
    "*",
  );
}

function postToChild(payload) {
  postToFrame(frame, payload);
}

function onMessage(evt) {
  const data = evt.data;
  if (!data || data.channel !== WHOLE_CONFIG.channel) return;

  if (data.type === "stage") {
    const step = Number(data.step);
    const total = Number(data.total);
    if (Number.isFinite(step)) lastStep = step;
    if (Number.isFinite(total)) lastTotal = total;
    return;
  }

  if (data.type === "requestAdvance") {
    if (switched || switching) return;
    advanceSketch1Flow();
  }
}

function isSpaceKey(evt) {
  return (
    evt.code === "Space" ||
    evt.key === " " ||
    evt.key === "Spacebar" ||
    evt.keyCode === 32 ||
    evt.which === 32
  );
}

function onKeyDown(evt) {
  if (!isSpaceKey(evt)) return;
  if (switching) return;

  evt.preventDefault();
  if (!switched) {
    advanceSketch1Flow();
    return;
  }

  if (lastStep > 0) postToChild({ type: "step", delta: -1 });
}

function advanceSketch1Flow() {
  if (lastTotal <= 0 || lastStep < lastTotal) {
    handoffStep = 0;
    postToChild({ type: "setHandoffStep", step: 0, total: WHOLE_CONFIG.handoffSteps });
    applyFrameMorph();
    postToChild({ type: "step", delta: 1 });
    return;
  }

  if (handoffStep < WHOLE_CONFIG.handoffSteps) {
    handoffStep += 1;
    postToChild({
      type: "setHandoffStep",
      step: handoffStep,
      total: WHOLE_CONFIG.handoffSteps,
    });
    applyFrameMorph();
    return;
  }

  switchToSecond();
}

function switchToSecond() {
  if (switched || switching || !frame || !host) return;
  switching = true;
  switched = true;
  lastStep = 0;
  lastTotal = 0;
  handoffStep = WHOLE_CONFIG.handoffSteps;
  applyFrameMorph();

  pendingFrame = createFrame(WHOLE_CONFIG.second);
  pendingFrame.style.opacity = "0";
  pendingFrame.style.pointerEvents = "none";
  applyFrameStyles(pendingFrame);
  pendingFrame.addEventListener("load", onSecondFrameReady, { once: true });
  host.appendChild(pendingFrame);
}

function onSecondFrameReady() {
  if (!pendingFrame) {
    switching = false;
    return;
  }
  postToFrame(pendingFrame, { type: "setReverseMode", enabled: true });
  postToFrame(pendingFrame, { type: "requestStage" });
  startCrossfade();
}

function startCrossfade() {
  fadeStartMs = performance.now();
  tickCrossfade();
}

function tickCrossfade() {
  if (!frame || !pendingFrame) {
    switching = false;
    fadeRaf = 0;
    return;
  }

  const now = performance.now();
  const t = clamp((now - fadeStartMs) / WHOLE_CONFIG.crossfadeMs, 0, 1);
  const e = t * t * (3 - 2 * t);
  frame.style.opacity = `${1 - e}`;
  pendingFrame.style.opacity = `${e}`;

  if (t >= 1) {
    frame.remove();
    frame = pendingFrame;
    pendingFrame = null;
    frame.style.opacity = "1";
    frame.style.pointerEvents = "auto";
    switching = false;
    fadeRaf = 0;
    return;
  }

  fadeRaf = window.requestAnimationFrame(tickCrossfade);
}

function applyFrameStyles(targetFrame) {
  if (!host || !targetFrame) return;

  const p = clamp(handoffStep / WHOLE_CONFIG.handoffSteps, 0, 1);
  const e = p * p * (3 - 2 * p);

  const hostW = host.clientWidth || window.innerWidth || 1;
  const hostH = host.clientHeight || window.innerHeight || 1;
  const fitToHost = (aspect) => {
    let w = hostW;
    let h = w / aspect;
    if (h > hostH) {
      h = hostH;
      w = h * aspect;
    }
    return { w, h };
  };

  const s1 = fitToHost(SKETCH1_ASPECT);
  const s2 = fitToHost(SKETCH2_ASPECT);
  const w = s1.w + (s2.w - s1.w) * e;
  const h = s1.h + (s2.h - s1.h) * e;

  targetFrame.style.width = `${w}px`;
  targetFrame.style.height = `${h}px`;
}

function applyFrameMorph() {
  if (!host) return;

  const p = clamp(handoffStep / WHOLE_CONFIG.handoffSteps, 0, 1);
  const e = p * p * (3 - 2 * p);
  const bg = {
    r: PAGE_BG_START.r + (PAGE_BG_END.r - PAGE_BG_START.r) * e,
    g: PAGE_BG_START.g + (PAGE_BG_END.g - PAGE_BG_START.g) * e,
    b: PAGE_BG_START.b + (PAGE_BG_END.b - PAGE_BG_START.b) * e,
  };
  const css = `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`;
  document.documentElement.style.background = css;
  document.body.style.background = css;

  applyFrameStyles(frame);
  applyFrameStyles(pendingFrame);
}

function onWholeResize() {
  applyFrameMorph();
}

function tearDownWhole() {
  window.removeEventListener("message", onMessage, false);
  window.removeEventListener("keydown", onKeyDown, true);
  document.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("resize", onWholeResize);
  if (fadeRaf) {
    window.cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  }
}

window.addEventListener("DOMContentLoaded", bootWhole);
window.addEventListener("beforeunload", tearDownWhole);
window.addEventListener("resize", onWholeResize);
