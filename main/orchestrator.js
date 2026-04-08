// Main loop orchestrator
// Cycles: broken_dream → transition(forward) → 花果山群猴 → transition(backward) → ...

const ORCH = {
  CROSSFADE_MS: 700,
  AUTO_ADVANCE_MS: 5 * 60 * 1000,
  SPACE_THRESHOLD: 20,
  SPACE_WINDOW_MS: 30 * 1000,
  BG_FIRST: "#d5c7ef",
  BG_SECOND: "#08070d",
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ss = (t) => t * t * (3 - 2 * t);

let host = null;
let currentFrame = null;
let state = "showing-first";
let autoTimer = 0;
let fadeRaf = 0;
let spaceTimes = [];
let firstSpaceCount = 0;

function boot() {
  host = document.getElementById("host");
  if (!host) return;

  currentFrame = createFrame("broken_dream.html", "camera");
  host.appendChild(currentFrame);
  state = "showing-first";

  window.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("message", onMessage, false);

  startAutoTimer();
}

function createFrame(src, allow) {
  const f = document.createElement("iframe");
  f.className = "art-frame";
  f.src = src;
  f.style.border = "0";
  f.style.opacity = "1";
  f.tabIndex = -1;
  if (allow) f.setAttribute("allow", allow);
  return f;
}

function isSpaceKey(e) {
  return e.code === "Space" || e.key === " " || e.key === "Spacebar" ||
         e.keyCode === 32 || e.which === 32;
}

function onKeyDown(e) {
  if (!isSpaceKey(e)) return;
  if (state === "showing-first") {
    e.preventDefault();
    firstSpaceCount++;
    if (firstSpaceCount >= 10) {
      firstSpaceCount = 0;
      clearAutoTimer();
      startTransitionForward();
    }
  }
  // In transition-* states: transition iframe has focus, handles spacebar itself
  // In showing-second: bridge postMessage handles accumulation
}

function onMessage(evt) {
  var d = evt.data;
  if (!d) return;

  // Bridge from monkey.html: spacebar accumulation
  if (d.channel === "main-bridge" && d.type === "space" && state === "showing-second") {
    var now = Date.now();
    spaceTimes.push(now);
    spaceTimes = spaceTimes.filter(function (t) { return now - t < ORCH.SPACE_WINDOW_MS; });
    if (spaceTimes.length >= ORCH.SPACE_THRESHOLD) {
      spaceTimes = [];
      clearAutoTimer();
      startTransitionBackward();
    }
    return;
  }

  // Completion signal from transition.js
  if (d.channel === "main-transition" && d.type === "complete") {
    if (state === "transition-forward") {
      showSecondArtwork();
    } else if (state === "transition-backward") {
      showFirstArtwork();
    }
  }
}

// ── State transitions ──

function startTransitionForward() {
  state = "transition-forward";
  var newFrame = createFrame("transition.html#forward");
  crossfadeTo(newFrame, function () {
    // Give transition iframe focus so spacebar reaches it
    if (currentFrame.contentWindow) currentFrame.contentWindow.focus();
  });
}

function showSecondArtwork() {
  state = "showing-second";
  setBg(ORCH.BG_SECOND);
  spaceTimes = [];
  var newFrame = createFrame("monkey.html");
  crossfadeTo(newFrame, function () {
    // Give monkey iframe focus for keyboard interaction
    if (currentFrame.contentWindow) currentFrame.contentWindow.focus();
    startAutoTimer();
  });
}

function startTransitionBackward() {
  state = "transition-backward";
  var newFrame = createFrame("transition.html#backward");
  crossfadeTo(newFrame, function () {
    if (currentFrame.contentWindow) currentFrame.contentWindow.focus();
  });
}

function showFirstArtwork() {
  state = "showing-first";
  setBg(ORCH.BG_FIRST);
  firstSpaceCount = 0;
  var newFrame = createFrame("broken_dream.html", "camera");
  crossfadeTo(newFrame, function () {
    window.focus();
    startAutoTimer();
  });
}

// ── Crossfade ──

function crossfadeTo(newFrame, onComplete) {
  if (!host || !currentFrame) return;
  var oldFrame = currentFrame;
  newFrame.style.opacity = "0";
  newFrame.style.pointerEvents = "none";
  host.appendChild(newFrame);

  var startMs = performance.now();

  function tick() {
    var now = performance.now();
    var t = clamp((now - startMs) / ORCH.CROSSFADE_MS, 0, 1);
    var e = ss(t);
    oldFrame.style.opacity = "" + (1 - e);
    newFrame.style.opacity = "" + e;

    if (t < 1) {
      fadeRaf = requestAnimationFrame(tick);
      return;
    }

    oldFrame.remove();
    newFrame.style.opacity = "1";
    newFrame.style.pointerEvents = "auto";
    currentFrame = newFrame;
    fadeRaf = 0;
    if (onComplete) onComplete();
  }

  tick();
}

// ── Background ──

function setBg(color) {
  document.documentElement.style.background = color;
  document.body.style.background = color;
}

// ── Auto-advance timer ──

function startAutoTimer() {
  clearAutoTimer();
  autoTimer = setTimeout(function () {
    if (state === "showing-first") {
      startTransitionForward();
    } else if (state === "showing-second") {
      spaceTimes = [];
      startTransitionBackward();
    }
  }, ORCH.AUTO_ADVANCE_MS);
}

function clearAutoTimer() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = 0;
  }
}

// ── Init ──

window.addEventListener("DOMContentLoaded", boot);
