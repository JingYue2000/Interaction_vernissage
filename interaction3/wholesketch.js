const WHOLE_CONFIG = {
  first: "index.html",
  second: "index2.html",
  channel: "vern-interaction3-bridge",
  handoffSteps: 8,
};
const SKETCH1_ASPECT = 720 / 1020;
const SKETCH2_ASPECT = 2000 / 1200;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let host = null;
let frame = null;
let switched = false;
let lastStep = 0;
let lastTotal = 0;
let handoffStep = 0;

function bootWhole() {
  host = document.getElementById("whole-host");
  if (!host) return;
  host.style.position = "relative";
  host.style.overflow = "hidden";

  frame = document.createElement("iframe");
  frame.className = "whole-frame";
  frame.src = WHOLE_CONFIG.first;
  frame.title = "Interaction 3 Whole Sequence";
  frame.setAttribute("allow", "fullscreen");
  frame.addEventListener("load", onFrameLoad);
  host.replaceChildren(frame);
  applyFrameMorph();

  window.addEventListener("message", onMessage, false);
  window.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keydown", onKeyDown, true);
}

function onFrameLoad() {
  if (!switched) {
    handoffStep = 0;
    postToChild({ type: "setHandoffStep", step: 0, total: WHOLE_CONFIG.handoffSteps });
    postToChild({ type: "requestStage" });
    applyFrameMorph();
    return;
  }

  // Initialize sketch2 in reverse mode: begin from final code state.
  postToChild({ type: "setReverseMode", enabled: true });
  postToChild({ type: "requestStage" });
  applyFrameMorph();
}

function postToChild(payload) {
  if (!frame || !frame.contentWindow) return;
  frame.contentWindow.postMessage(
    { channel: WHOLE_CONFIG.channel, ...payload },
    "*",
  );
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
    if (switched) return;
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

  evt.preventDefault();
  if (!switched) {
    advanceSketch1Flow();
    return;
  }

  // sketch2 reverse flow: code -> art
  if (lastStep > 0) {
    postToChild({ type: "step", delta: -1 });
    return;
  }
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
  if (switched || !frame) return;
  switched = true;
  lastStep = 0;
  lastTotal = 0;
  handoffStep = WHOLE_CONFIG.handoffSteps;
  applyFrameMorph();
  frame.src = WHOLE_CONFIG.second;
}

function applyFrameMorph() {
  if (!host || !frame) return;

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

  frame.style.position = "absolute";
  frame.style.left = "50%";
  frame.style.top = "50%";
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  frame.style.transform = "translate(-50%, -50%)";
  frame.style.border = "0";
}

function tearDownWhole() {
  window.removeEventListener("message", onMessage, false);
  window.removeEventListener("keydown", onKeyDown, true);
  document.removeEventListener("keydown", onKeyDown, true);
}

window.addEventListener("DOMContentLoaded", bootWhole);
window.addEventListener("beforeunload", tearDownWhole);
window.addEventListener("resize", applyFrameMorph);
