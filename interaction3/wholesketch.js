const WHOLE_CONFIG = {
  first: "index.html",
  second: "index2.html",
  channel: "vern-interaction3-bridge",
};

let host = null;
let frame = null;
let switched = false;
let lastStep = 0;
let lastTotal = 0;

function bootWhole() {
  host = document.getElementById("whole-host");
  if (!host) return;

  frame = document.createElement("iframe");
  frame.className = "whole-frame";
  frame.src = WHOLE_CONFIG.first;
  frame.title = "Interaction 3 Whole Sequence";
  frame.setAttribute("allow", "fullscreen");
  frame.addEventListener("load", onFrameLoad);
  host.replaceChildren(frame);

  window.addEventListener("message", onMessage, false);
  window.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keydown", onKeyDown, true);
}

function onFrameLoad() {
  if (switched) return;
  postToChild({ type: "requestStage" });
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

  if (data.type === "requestSwitch") {
    switchToSecond();
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
  if (switched) return;
  if (!isSpaceKey(evt)) return;

  evt.preventDefault();
  if (lastTotal > 0 && lastStep >= lastTotal) {
    switchToSecond();
    return;
  }
  postToChild({ type: "step", delta: 1 });
}

function switchToSecond() {
  if (switched || !frame) return;
  switched = true;
  frame.src = WHOLE_CONFIG.second;
}

function tearDownWhole() {
  window.removeEventListener("message", onMessage, false);
  window.removeEventListener("keydown", onKeyDown, true);
  document.removeEventListener("keydown", onKeyDown, true);
}

window.addEventListener("DOMContentLoaded", bootWhole);
window.addEventListener("beforeunload", tearDownWhole);
