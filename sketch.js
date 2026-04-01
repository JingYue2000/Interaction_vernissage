const W = 720, H = 1020;
const PAL_BASE = "#c4b5e0-#a8d8ea-#d4c5f9-#e8dff5-#9b59b6-#ffffff".split("-");
const PAL_ACCENT = "#00d2ff-#d81159-#f52f57-#9b59b6-#ffffff".split("-");
const PAL_ACCENT_ACTIVE = "#00d2ff-#d81159-#f52f57-#9b59b6".split("-");
const PAL_TRACE = "#c4b5e0-#a8d8ea-#d4c5f9-#9b59b6-#00d2ff-#d81159-#f52f57".split("-");
const PAL_GLOW = "#d4c5f9-#00d2ff-#d81159-#f52f57".split("-");
const PAL_GLASS_FILL = PAL_TRACE.slice();
const PAL_GLASS_TINT = PAL_ACCENT_ACTIVE.concat(["#a8d8ea", "#d4c5f9"]);
const PAL_GLASS_RIM = PAL_GLOW.concat(["#00d2ff", "#c79bff"]);


const URL_SEED = new URLSearchParams(window.location.search).get("seed");
const SEED = URL_SEED !== null && Number.isFinite(Number(URL_SEED))
  ? Number(URL_SEED) : Math.floor(Math.random() * 1000000000);
const ZONE_ATTACK = 0.18;
const ZONE_RELEASE = 0.08;
const SHARD_ATTACK = 0.20;
const SHARD_RELEASE = 0.10;
const REGROUP_BREAK_THRESHOLD = 0.24;
const REGROUP_COMPLETE_THRESHOLD = 0.08;
const REGROUP_COOLDOWN_FRAMES = 12;
const COLOR_MORPH_DECAY = 0.085;
const FLIP_SPEED = 0.085;
const TRACE_BLEND_ALPHA = 1.0;
const TRACE_SCREEN_ALPHA = 0.14;
const TRACE_COUNT_MIN = 9;
const TRACE_COUNT_MAX = 13;
const TRACE_LIFE_MIN = 58;
const TRACE_LIFE_MAX = 88;
const HAND_VIDEO_W = 640;
const HAND_VIDEO_H = 480;
const HAND_TARGET_LERP = 0.18;
const DRAGON_FOLLOW_LERP = 0.22;
const HAND_GRACE_FRAMES = 12;
const FALLBACK_BLEND_FRAMES = 18;
const TRACE_SPEED_THRESHOLD = 1.2;
const TRACE_SPEED_FULL = 12;
const CAMERA_READY_TIMEOUT_MS = 4000;

const FRAG_FUNCTIONS = `
  float rand(vec2 c){ return fract(sin(dot(c.xy, vec2(12.9898, 78.233))) * 43758.5453); }
  vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }
  float cnoise(vec3 P){
    vec3 Pi0 = floor(P), Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0); Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P), Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz, iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 / 7.0, gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 / 7.0, gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x), g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z), g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x), g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z), g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
    float n000 = dot(g000, Pf0), n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z)), n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z)), n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz)), n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000,n100,n010,n110), vec4(n001,n101,n011,n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
  }
`;

const VERT_SRC = `
  precision highp float;
  attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aTexCoord;
  varying vec2 vTexCoord;
  uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix;
  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
    vTexCoord = aTexCoord;
  }
`;

const FRAG_SRC = `
  precision highp float;
  uniform sampler2D uTex; uniform vec2 uResolution; uniform float uTime;
  uniform float uBrightness; uniform float uContrast; uniform vec3 uCurve;
  uniform float uSplit; uniform float uJitter; uniform float uEnergy; uniform vec2 uHeading;
  varying vec2 vTexCoord;
  ${FRAG_FUNCTIONS}
  void main() {
    vec2 uv = vTexCoord; uv.y = 1.0 - uv.y;
    vec2 heading = uHeading;
    if (length(heading) < 0.0001) heading = vec2(0.0, 1.0);
    heading = normalize(heading);
    float energy = clamp(uEnergy, 0.0, 1.0);
    float wake = cnoise(vec3(uv * vec2(5.0, 11.0) + heading * uTime * 0.45, uTime * 0.2));
    vec2 flowWarp = heading * wake * (0.002 + energy * 0.005);
    vec2 uvBase = clamp(uv + flowWarp, 0.0, 1.0);
    float drift = cnoise(vec3(uvBase * vec2(8.0, 16.0), uTime * 0.22));
    float splitStr = uSplit * (1.0 + energy * 0.6);
    float jitStr = uJitter * (1.0 + energy * 0.4);
    vec2 sOff = vec2(drift * 0.65 * splitStr, 0.0);
    vec2 jOff = vec2(0.0, (rand(uvBase + fract(uTime * 0.11)) - 0.5) * jitStr);
    vec3 col;
    col.r = texture2D(uTex, clamp(uvBase + sOff + jOff, 0.0, 1.0)).r;
    col.g = texture2D(uTex, clamp(uvBase + jOff * 0.35, 0.0, 1.0)).g;
    col.b = texture2D(uTex, clamp(uvBase - sOff + jOff, 0.0, 1.0)).b;
    col += uBrightness;
    col = ((col - 0.5) * uContrast) + 0.5;
    col = pow(max(col, 0.0), uCurve);
    col += drift * (0.008 + energy * 0.008) * vec3(0.8, 1.0, 1.1);
    col += energy * 0.008 * vec3(0.06, 0.02, 0.09);
    float vig = smoothstep(0.18, 0.95, length((uv - 0.5) * vec2(0.9, 1.08)));
    col *= mix(1.02, 0.96, vig);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

let canvasRef, bgLayer, zoneLayer, pulseLayer, paintLayer, compLayer, grainLayer, shaderLayer;
let posterShader, sceneConfig, zones = [];
let dragonX = W * 0.5, dragonY = H * 0.5, lastDX = dragonX, lastDY = dragonY;
let heading = 0, speed = 0, turn = 0, energy = 0;
let trailParticles = [];
let inputState = {
  video: null,
  handPose: null,
  hands: [],
  cameraReady: false,
  modelReady: false,
  controlSource: "auto",
  rawHandTarget: null,
  filteredHandTarget: null,
  lastSeenFrame: -1000,
  fallbackBlend: 1,
  detecting: false,
  cameraTimeoutId: null,
};

function setup() {
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  canvasRef = createCanvas(W, H);
  frameRate(60); smooth();
  bgLayer = createGraphics(W, H);
  zoneLayer = createGraphics(W, H);
  pulseLayer = createGraphics(W, H);
  paintLayer = createGraphics(W, H);
  compLayer = createGraphics(W, H);
  grainLayer = createGraphics(W, H);
  shaderLayer = createGraphics(W, H, WEBGL);
  bgLayer.smooth();
  zoneLayer.smooth();
  pulseLayer.smooth();
  paintLayer.smooth();
  compLayer.smooth();
  grainLayer.smooth();
  shaderLayer.noStroke();
  canvasRef.elt.style.imageRendering = "auto";
  posterShader = shaderLayer.createShader
    ? shaderLayer.createShader(VERT_SRC, FRAG_SRC)
    : new p5.Shader(shaderLayer._renderer, VERT_SRC, FRAG_SRC);
  randomSeed(SEED); noiseSeed(SEED);
  sceneConfig = generateScene();
  zones = sceneConfig.reactiveZones;
  trailParticles = [];
  buildBackground(); buildGrain();
  zoneLayer.clear(); pulseLayer.clear(); paintLayer.clear(); compLayer.clear();
  fitCanvas();
  setupHandTracking();
  console.info("Dragon Brush seed:", SEED);
}

function draw() {
  updateDragon();
  updateZones();
  updateBgFrags();
  renderZones();
  fadeAlpha(pulseLayer, 14);
  paintPulses();
  paintTrail();
  compose();
  renderShader();
  blendMode(BLEND); clear();
  image(shaderLayer, 0, 0, width, height);
  push(); blendMode(MULTIPLY); tint(255, 86);
  image(grainLayer, 0, 0, width, height); pop();
}

function updateDragon() {
  let target = updateInputTarget();
  updateDragonKinematics(target.x, target.y);
}

function setupHandTracking() {
  if (typeof ml5 === "undefined") {
    console.warn("ml5 is unavailable; continuing with auto trace.");
    return;
  }

  let markCameraReady = () => {
    if (inputState.cameraReady) return;
    inputState.cameraReady = true;
    if (inputState.cameraTimeoutId !== null) {
      window.clearTimeout(inputState.cameraTimeoutId);
      inputState.cameraTimeoutId = null;
    }
    startHandDetectionIfReady();
  };

  try {
    inputState.video = createCapture({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: HAND_VIDEO_W },
        height: { ideal: HAND_VIDEO_H },
      },
    }, markCameraReady);
    inputState.video.size(HAND_VIDEO_W, HAND_VIDEO_H);
    inputState.video.hide();
    inputState.video.elt.setAttribute("playsinline", "");
    inputState.video.elt.muted = true;
    inputState.video.elt.onloadedmetadata = markCameraReady;
    inputState.cameraTimeoutId = window.setTimeout(() => {
      if (!inputState.cameraReady) {
        console.warn("Camera was not granted or did not become ready; continuing with auto trace.");
      }
    }, CAMERA_READY_TIMEOUT_MS);
  } catch (error) {
    console.warn("Camera setup failed; continuing with auto trace.", error);
    inputState.video = null;
  }

  try {
    inputState.handPose = ml5.handPose({ maxHands: 1, flipped: true }, () => {
      inputState.modelReady = true;
      startHandDetectionIfReady();
    });
    if (inputState.handPose?.ready?.catch) {
      inputState.handPose.ready.catch((error) => {
        console.warn("HandPose model failed to load; continuing with auto trace.", error);
      });
    }
  } catch (error) {
    console.warn("HandPose setup failed; continuing with auto trace.", error);
    inputState.handPose = null;
  }
}

function startHandDetectionIfReady() {
  if (!inputState.handPose || !inputState.video || inputState.detecting) return;
  if (!inputState.cameraReady || !inputState.modelReady) return;
  try {
    inputState.handPose.detectStart(inputState.video, gotHands);
    inputState.detecting = true;
  } catch (error) {
    console.warn("HandPose detection could not start; continuing with auto trace.", error);
  }
}

function gotHands(results) {
  inputState.hands = Array.isArray(results) ? results : [];
}

function getAutoTarget() {
  let ph = noise(frameCount / 50);
  return {
    x: cos(frameCount / 30 + ph) * W * 0.34 + W * 0.5,
    y: sin(frameCount / 50 + ph) * H * 0.32 + H * 0.5,
  };
}

function updateInputTarget() {
  let autoTarget = getAutoTarget();
  let handAvailable = updateHandTarget();
  let targetBlend = handAvailable ? 0 : 1;
  inputState.fallbackBlend = moveTowards(
    inputState.fallbackBlend,
    targetBlend,
    1 / FALLBACK_BLEND_FRAMES
  );
  inputState.controlSource = inputState.fallbackBlend < 0.5 ? "hand" : "auto";

  if (!inputState.filteredHandTarget) return autoTarget;

  return {
    x: lerp(inputState.filteredHandTarget.x, autoTarget.x, inputState.fallbackBlend),
    y: lerp(inputState.filteredHandTarget.y, autoTarget.y, inputState.fallbackBlend),
  };
}

function updateHandTarget() {
  let finger = inputState.hands[0]?.index_finger_tip;
  if (finger) {
    let rawTarget = mapHandPointToCanvas(finger);
    let isStale = frameCount - inputState.lastSeenFrame > HAND_GRACE_FRAMES;
    inputState.rawHandTarget = rawTarget;
    if (!inputState.filteredHandTarget || isStale) {
      inputState.filteredHandTarget = { ...rawTarget };
    } else {
      inputState.filteredHandTarget.x = lerp(inputState.filteredHandTarget.x, rawTarget.x, HAND_TARGET_LERP);
      inputState.filteredHandTarget.y = lerp(inputState.filteredHandTarget.y, rawTarget.y, HAND_TARGET_LERP);
    }
    inputState.lastSeenFrame = frameCount;
  } else {
    inputState.rawHandTarget = null;
  }

  return inputState.filteredHandTarget !== null
    && frameCount - inputState.lastSeenFrame <= HAND_GRACE_FRAMES;
}

function mapHandPointToCanvas(point) {
  let videoW = inputState.video?.elt?.videoWidth || inputState.video?.width || HAND_VIDEO_W;
  let videoH = inputState.video?.elt?.videoHeight || inputState.video?.height || HAND_VIDEO_H;
  return {
    x: constrain(map(point.x, 0, videoW, 0, W), 0, W),
    y: constrain(map(point.y, 0, videoH, 0, H), 0, H),
  };
}

function moveTowards(current, target, delta) {
  if (abs(target - current) <= delta) return target;
  return current + Math.sign(target - current) * delta;
}

function updateDragonKinematics(targetX, targetY) {
  lastDX = dragonX; lastDY = dragonY;
  dragonX = lerp(dragonX, targetX, DRAGON_FOLLOW_LERP);
  dragonY = lerp(dragonY, targetY, DRAGON_FOLLOW_LERP);
  let dx = dragonX - lastDX, dy = dragonY - lastDY;
  let nextH = heading;
  if (abs(dx) > 0.0001 || abs(dy) > 0.0001) nextH = atan2(dy, dx);
  speed = dist(dragonX, dragonY, lastDX, lastDY);
  turn = abs(atan2(sin(nextH - heading), cos(nextH - heading)));
  heading = nextH;
  let se = constrain(map(speed, 0.2, 12, 0.0, 0.6), 0, 0.6);
  let te = constrain(map(turn, 0.01, 0.3, 0, 0.4), 0, 0.4);
  let target = max(se * 0.7, se * 0.4 + te * 0.5);
  energy = lerp(energy, target, target > energy ? 0.12 : 0.04);
}

function fadeAlpha(layer, amt) {
  layer.push(); layer.rectMode(CORNER); layer.noStroke();
  layer.drawingContext.save();
  layer.drawingContext.globalCompositeOperation = "destination-out";
  layer.fill(0, 0, 0, amt); layer.rect(0, 0, W, H);
  layer.drawingContext.restore(); layer.pop();
}

function ss(e0, e1, x) { let t = constrain((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

function approachReactive(current, target, rise, fall) {
  let value = current ?? 0;
  let rate = target > value ? rise : fall;
  return lerp(value, target, rate);
}

function zoneInf(x, y, cx, cy, rx, ry) {
  let dx = (x - cx) / rx, dy = (y - cy) / ry;
  return constrain(1 - sqrt(dx * dx + dy * dy), 0, 1);
}

function paintPulses() {
  pulseLayer.push(); pulseLayer.blendMode(SCREEN);
  pulseLayer.rectMode(CENTER); pulseLayer.strokeCap(SQUARE); pulseLayer.strokeJoin(ROUND);
  for (let z of zones) {
    let inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    let str = constrain(inf * (0.28 + energy * 1.05) + turn * 0.45, 0, 1);
    if (str > 0.015) drawPulse(z, str);
  }
  pulseLayer.blendMode(BLEND); pulseLayer.pop();
}

function drawPulse(z, str) {
  let palette = getZoneDisplayPalette(z);
  let ft = color(palette.tint); ft.setAlpha(12 + str * 30);
  let st = color(palette.tint); st.setAlpha(8 + str * 18);
  pulseLayer.push(); pulseLayer.noStroke(); pulseLayer.fill(ft);
  if (z.kind === "poly") {
    drawPoly(pulseLayer, z.points);
    pulseLayer.noFill(); pulseLayer.stroke(st); pulseLayer.strokeWeight(0.8 + str * 1.1);
    drawPoly(pulseLayer, z.points);
  } else if (z.kind === "rect") {
    pulseLayer.rectMode(CORNER); pulseLayer.rect(z.x, z.y, z.w, z.h, z.r);
    pulseLayer.noFill(); pulseLayer.stroke(st); pulseLayer.strokeWeight(0.9 + str * 1.2);
    pulseLayer.rect(z.x, z.y, z.w, z.h, z.r);
  }
  pulseLayer.pop();
}

function updateZones() {
  for (let z of zones) {
    let inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    let str = constrain(inf * (0.28 + energy * 1.05) + turn * 0.45, 0, 1);
    let fh = ss(0.14, 0.86, str);
    z.currentStrength = str;
    z.glowLevel = approachReactive(z.glowLevel, str, ZONE_ATTACK, ZONE_RELEASE);
    z.fractureLevel = approachReactive(z.fractureLevel, fh, ZONE_ATTACK, ZONE_RELEASE);
    if (!z.shards) continue;
    for (let s of z.shards) {
      let hd = dist(dragonX, dragonY, s.centroid.x, s.centroid.y);
      let lr = max(z.radius[0], z.radius[1]) * 0.98;
      let hf = constrain(1 - hd / lr, 0, 1);
      let target = max(0, fh * 0.72 + hf * 0.82 - s.threshold);
      s.activation = approachReactive(s.activation, target, SHARD_ATTACK, SHARD_RELEASE);
    }
    updateZoneRegroup(z);
  }
}

function updateBgFrags() {
  for (let z of sceneConfig.bgFrags) {
    let inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    let str = constrain(inf * (0.3 + energy * 0.8), 0, 1);
    let fh = ss(0.1, 0.9, str);
    z.currentStrength = str;
    z.glowLevel = approachReactive(z.glowLevel, str, ZONE_ATTACK, ZONE_RELEASE);
    z.fractureLevel = approachReactive(z.fractureLevel, fh, ZONE_ATTACK, ZONE_RELEASE);
    if (!z.shards) continue;
    for (let s of z.shards) {
      let hd = dist(dragonX, dragonY, s.centroid.x, s.centroid.y);
      let lr = max(z.radius[0], z.radius[1]);
      let hf = constrain(1 - hd / lr, 0, 1);
      let target = max(0, fh * 0.72 + hf * 0.82 - s.threshold);
      s.activation = approachReactive(s.activation, target, SHARD_ATTACK, SHARD_RELEASE);
    }
    updateZoneRegroup(z);
  }
}

function renderZones() {
  zoneLayer.clear(); zoneLayer.push();
  zoneLayer.strokeJoin(ROUND); zoneLayer.strokeCap(SQUARE);
  for (let f of sceneConfig.bgFrags) drawZoneBase(zoneLayer, f);
  for (let p of sceneConfig.panels) drawZoneBase(zoneLayer, p);
  zoneLayer.pop();
}

function drawZoneShape(g, z) {
  if (z.kind === "poly") drawPoly(g, z.points);
  else if (z.kind === "rect") { g.rectMode(CORNER); g.rect(z.x, z.y, z.w, z.h, z.r); }
}

function getZoneDisplayPalette(z) {
  let fill = z.fill || z.baseColor || z.color || z.tint;
  let tint = z.tint || fill;
  let rim = z.rim || tint;
  if ((z.regroupFlash || 0) > 0) {
    if (z.flashFill) fill = mixHex(fill, z.flashFill, z.regroupFlash);
    if (z.flashTint) tint = mixHex(tint, z.flashTint, z.regroupFlash);
    if (z.flashRim) rim = mixHex(rim, z.flashRim, z.regroupFlash);
  }
  return { fill, tint, rim };
}

function getZoneMirrorScaleX(z) {
  if (!z.flipAnimating) return z.mirrorX || 1;
  return (z.flipStart || 1) * cos((z.flipT || 0) * PI);
}

function buildZoneRegroupMaterial(z) {
  if (z.role === "panel") return buildPanelMaterial(sceneConfig.gradient, z.glassMode !== "ambient");
  let base = z.fill || z.baseColor || random(PAL_TRACE);
  let tint = mixHex(base, random(PAL_TRACE), random(0.28, 0.46));
  let rim = mixHex(random(PAL_TRACE), random(PAL_GLOW), random(0.34, 0.62));
  return {
    fill: tint,
    tint: rim,
    rim: random(PAL_GLASS_RIM),
    flashFill: mixHex(tint, random(PAL_ACCENT_ACTIVE), random(0.46, 0.72)),
    flashTint: mixHex(rim, random(PAL_ACCENT_ACTIVE), random(0.4, 0.7)),
    flashRim: random(PAL_GLOW),
  };
}

function triggerZoneRegroup(z) {
  let material = buildZoneRegroupMaterial(z);
  z.fill = material.fill;
  z.tint = material.tint;
  z.rim = material.rim;
  z.baseColor = material.fill;
  if (material.glassMode) z.glassMode = material.glassMode;
  z.flashFill = material.flashFill || material.fill;
  z.flashTint = material.flashTint || material.tint;
  z.flashRim = material.flashRim || material.rim;
  z.regroupFlash = 1;
  z.flipAnimating = true;
  z.flipT = 0;
  z.flipStart = z.mirrorX || 1;
  z.flipTarget = -(z.mirrorX || 1);
}

function updateZoneRegroup(z) {
  if (!z.shards || z.shards.length === 0) return;
  z.regroupCooldown = max(0, (z.regroupCooldown || 0) - 1);
  let fractureSignal = max(z.fractureLevel || 0, (z.currentStrength || 0) * 0.82);
  if (fractureSignal > REGROUP_BREAK_THRESHOLD) z.wasFractured = true;
  let prevFrac = z.prevFractureLevel || 0;
  if (z.wasFractured
    && prevFrac > REGROUP_COMPLETE_THRESHOLD
    && z.fractureLevel <= REGROUP_COMPLETE_THRESHOLD
    && (z.regroupCooldown || 0) <= 0) {
    triggerZoneRegroup(z);
    z.wasFractured = false;
    z.regroupCooldown = REGROUP_COOLDOWN_FRAMES;
  }
  if (z.flipAnimating) {
    z.flipT = min(1, (z.flipT || 0) + FLIP_SPEED);
    if (z.flipT >= 1) {
      z.flipAnimating = false;
      z.mirrorX = z.flipTarget || -(z.flipStart || 1);
    }
  }
  if ((z.regroupFlash || 0) > 0) {
    z.regroupFlash = max(0, z.regroupFlash - COLOR_MORPH_DECAY);
    if (z.regroupFlash <= 0) {
      z.regroupFlash = 0;
      z.flashFill = null;
      z.flashTint = null;
      z.flashRim = null;
    }
  }
  z.prevFractureLevel = z.fractureLevel;
}

function drawZoneBase(g, z) {
  let isPanel = z.role === "panel";
  let isAmbientGlass = z.glassMode === "ambient";
  let frac = z.fractureLevel || 0;
  let palette = getZoneDisplayPalette(z);
  let fHex = palette.fill;
  let eHex = palette.tint;
  let rHex = palette.rim;
  let baseAlpha = (z.alpha || 88) * (isPanel ? (isAmbientGlass ? 1.02 : 1.16) : 1.0);
  let iAlpha = baseAlpha * max(0, 1 - frac * (isPanel ? (isAmbientGlass ? 1.22 : 1.34) : 1.25));
  g.push();
  let scaleX = getZoneMirrorScaleX(z);
  g.translate(z.center[0], z.center[1]);
  g.scale(scaleX, 1);
  g.translate(-z.center[0], -z.center[1]);
  if (iAlpha > 6) {
    let ft = isPanel
      ? lerpColor(color(fHex), color(eHex), isAmbientGlass ? 0.12 : 0.22)
      : color(fHex);
    ft.setAlpha(iAlpha);
    g.push(); g.noStroke(); g.fill(ft);
    drawZoneShape(g, z);
    if (isPanel) {
      let glaze = lerpColor(color(fHex), color(eHex), isAmbientGlass ? 0.48 : 0.74);
      glaze.setAlpha((isAmbientGlass ? 6 : 10) + iAlpha * (isAmbientGlass ? 0.1 : 0.14));
      g.fill(glaze);
      drawZoneShape(g, z);
    }
    g.pop();
  }
  let et = isPanel
    ? lerpColor(color(fHex), color(eHex), isAmbientGlass ? 0.56 : 0.82)
    : color(eHex);
  et.setAlpha(max(isPanel ? (isAmbientGlass ? 18 : 32) : 14, iAlpha * (isPanel ? (isAmbientGlass ? 0.38 : 0.56) : 0.42)));
  g.push(); g.noFill(); g.stroke(et); g.strokeWeight(isPanel ? (isAmbientGlass ? 0.85 : 1.15) : 0.7);
  drawZoneShape(g, z);
  if (isPanel) {
    let depth = lerpColor(color(eHex), color("#4d3f76"), 0.68);
    depth.setAlpha((isAmbientGlass ? 4 : 8) + iAlpha * (isAmbientGlass ? 0.08 : 0.14));
    g.push(); g.translate(isAmbientGlass ? 2.4 : 3.2, isAmbientGlass ? 3.2 : 4.2); g.stroke(depth); g.strokeWeight(isAmbientGlass ? 0.65 : 0.85);
    drawZoneShape(g, z);
    g.pop();
    let rim = lerpColor(color(eHex), color(rHex), 0.44);
    rim.setAlpha((isAmbientGlass ? 5 : 9) + iAlpha * (isAmbientGlass ? 0.08 : 0.12));
    g.push(); g.translate(isAmbientGlass ? -1.8 : -2.8, isAmbientGlass ? -2.6 : -3.8); g.stroke(rim); g.strokeWeight(isAmbientGlass ? 0.5 : 0.65);
    drawZoneShape(g, z);
    g.pop();
  }
  g.pop();
  if (z.shards && z.shards.length > 0) {
    let bt = color(fHex);
    let shardTint = color(isPanel ? rHex : (z.tint || z.baseColor));
    for (let s of z.shards) {
      let act = constrain((s.activation || 0) * 0.78 + frac * 0.22, 0, 1);
      if (act <= 0.01) continue;
      let off = act * (isPanel ? (isAmbientGlass ? 28 : 34) : 24) * (0.55 + s.depth * 0.95);
      let st = lerpColor(bt, shardTint, isPanel ? (isAmbientGlass ? 0.28 + act * 0.18 : 0.42 + act * 0.24) : 0.24 + act * 0.16);
      st.setAlpha((isPanel ? (isAmbientGlass ? 56 : 78) : 60) + act * (isPanel ? (isAmbientGlass ? 102 : 138) : 110));
      let ss2 = lerpColor(shardTint, color(z.tint || z.baseColor), 0.36);
      ss2.setAlpha((isPanel ? (isAmbientGlass ? 20 : 32) : 22) + act * (isPanel ? (isAmbientGlass ? 42 : 64) : 42));
      let shadow = lerpColor(color("#4d3f76"), shardTint, 0.18);
      shadow.setAlpha((isAmbientGlass ? 5 : 8) + act * (isAmbientGlass ? 18 : 28));
      g.push(); g.translate(s.dir.x * off, s.dir.y * off);
      if (isPanel) {
        g.push(); g.translate(s.dir.x * (2 + act * 3.5), s.dir.y * (2 + act * 3.5));
        g.noStroke(); g.fill(shadow); drawPoly(g, s.points);
        g.pop();
      }
      g.noStroke(); g.fill(st); drawPoly(g, s.points);
      g.noFill(); g.stroke(ss2); g.strokeWeight(0.35 + act * 0.9); drawPoly(g, s.points);
      g.pop();
    }
  }
  g.pop();
}

function paintTrail() {
  let ang = atan2(dragonY - lastDY, dragonX - lastDX), na = ang + HALF_PI;
  let bs = map(sin(frameCount / 11), -1, 1, 34, 92), mc = floor(random(TRACE_COUNT_MIN, TRACE_COUNT_MAX));
  for (let i = 0; i < mc; i++) {
    let lat = randomGaussian() * bs * 0.36, fwd = random(-bs * 0.35, bs * 0.35);
    let px = dragonX + cos(na) * lat + cos(ang) * fwd;
    let py = dragonY + sin(na) * lat + sin(ang) * fwd;
    let rot = ang + random(-0.85, 0.85), sz = random(5, 20);
    let nv = floor(random(3, 6)), pts = [];
    for (let j = 0; j < nv; j++) {
      let a = TWO_PI * j / nv + random(-0.4, 0.4);
      pts.push({ x: cos(a) * sz * random(0.4, 1), y: sin(a) * sz * random(0.4, 1) });
    }
    let base = color(random(random() < 0.38 ? PAL_ACCENT_ACTIVE : PAL_TRACE));
    let tintC = color(random(PAL_GLOW));
    let act = random(0.2, 0.8);
    let ft = lerpColor(base, tintC, 0.18 + act * 0.12);
    let st = lerpColor(base, tintC, 0.48);
    trailParticles.push({
      x: px,
      y: py,
      rot,
      pts,
      strokeWeight: 0.35 + act * 0.9,
      maxAge: floor(random(TRACE_LIFE_MIN, TRACE_LIFE_MAX)),
      age: 0,
      fillRgb: [red(ft), green(ft), blue(ft)],
      strokeRgb: [red(st), green(st), blue(st)],
      fillAlpha: random(78, 156),
      strokeAlpha: random(24, 62),
    });
  }
  let alive = [];
  paintLayer.clear();
  paintLayer.push(); paintLayer.strokeJoin(ROUND); paintLayer.strokeCap(SQUARE);
  for (let p of trailParticles) {
    let life = 1 - (p.age / p.maxAge);
    if (life <= 0) continue;
    let fade = life * life * (3 - 2 * life);
    let ft = color(p.fillRgb[0], p.fillRgb[1], p.fillRgb[2]);
    let st = color(p.strokeRgb[0], p.strokeRgb[1], p.strokeRgb[2]);
    ft.setAlpha(p.fillAlpha * fade);
    st.setAlpha(p.strokeAlpha * fade);
    paintLayer.push(); paintLayer.translate(p.x, p.y); paintLayer.rotate(p.rot);
    paintLayer.noStroke(); paintLayer.fill(ft); drawPoly(paintLayer, p.pts);
    paintLayer.noFill(); paintLayer.stroke(st); paintLayer.strokeWeight(p.strokeWeight);
    drawPoly(paintLayer, p.pts);
    paintLayer.pop();
    p.age += 1;
    if (p.age < p.maxAge) alive.push(p);
  }
  paintLayer.pop();
  trailParticles = alive;
}

function compose() {
  let C = compLayer, P = paintLayer, Z = zoneLayer, PL = pulseLayer;
  C.push(); C.clear(); C.image(bgLayer, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = 1; C.image(Z, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = 0.7; C.image(PL, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = TRACE_BLEND_ALPHA; C.image(P, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = TRACE_SCREEN_ALPHA; C.image(P, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = 1;
  C.pop();
}

function renderShader() {
  shaderLayer.shader(posterShader);
  posterShader.setUniform("uTex", compLayer);
  posterShader.setUniform("uResolution", [W, H]);
  posterShader.setUniform("uTime", millis() * 0.001);
  posterShader.setUniform("uBrightness", 0.02);
  posterShader.setUniform("uContrast", 1.08);
  posterShader.setUniform("uCurve", [0.98, 0.96, 1.02]);
  posterShader.setUniform("uSplit", 0.0012);
  posterShader.setUniform("uJitter", 0.0006);
  posterShader.setUniform("uEnergy", energy);
  posterShader.setUniform("uHeading", [cos(heading), sin(heading)]);
  shaderLayer.clear(); shaderLayer.push();
  shaderLayer.rect(-W * 0.5, -H * 0.5, W, H); shaderLayer.pop();
}

// --- Scene Generation ---

function generateScene() {
  randomSeed(SEED + 17); noiseSeed(SEED + 17);
  let cfg = {
    gradient: {
      top: random(["#e1d5f7", "#e8ddff", "#ddd1f6", "#ece0ff"]),
      mid: random(["#cbb8ee", "#c7b2f1", "#d3c0f3", "#c6b6ea"]),
      bottom: random(["#c7e4f5", "#c9ebfb", "#bee3f2", "#d2effc"]),
    },
    bgFrags: [], panels: [], targets: [], reactiveZones: [],
  };
  for (let i = 0, n = floor(random(24, 38)); i < n; i++) {
    let sz = random(40, 180), nv = floor(random(3, 6));
    let cx = random(0.02, 0.98) * W, cy = random(0.02, 0.98) * H;
    let rot = random(-PI, PI), pts = [];
    for (let j = 0; j < nv; j++) {
      let a = TWO_PI * j / nv + random(-0.4, 0.4) + rot;
      pts.push({ x: cx + cos(a) * sz * random(0.4, 1), y: cy + sin(a) * sz * random(0.4, 1) });
    }
    let col = random(["#efe4ff", "#d6d0ff", "#caebff", "#dbcaff", "#d8c9ff", "#cfe7ff", "#f0d2ff"]);
    let z = { kind: "poly", role: "bgFrag", points: pts, center: [cx, cy], radius: [sz * 1.2, sz * 1.2],
      baseColor: col, tint: col, alpha: random(18, 72) };
    cfg.bgFrags.push(initZoneState(z));
  }
  let panelCount = floor(random(12, 18));
  let largeCount = floor(random(4, 6));
  let ambientCount = floor(random(max(4, panelCount * 0.4), panelCount * 0.65 + 1));
  let panelAnchors = [];
  for (let i = 0; i < panelCount; i++) {
    let large = i < largeCount;
    let ambient = i < ambientCount;
    let panel = buildRandomPanel(panelAnchors, large, cfg.gradient, ambient);
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

function buildRandomPanel(existingAnchors, large = false, gradient, ambient = false) {
  let attempts = 28;
  let best = null;
  for (let i = 0; i < attempts; i++) {
    let rx = large ? random(110, 228) : random(42, 136);
    let ry = large ? random(138, 296) : random(54, 178);
    let cx = random(0.04, 0.96) * W;
    let cy = random(0.04, 0.96) * H;
    let nv = floor(random(4, 8));
    let rot = random(TWO_PI);
    let pts = [];
    for (let j = 0; j < nv; j++) {
      let a = TWO_PI * j / nv + rot + random(-0.32, 0.32);
      let px = cx + cos(a) * rx * random(0.52, 1.08);
      let py = cy + sin(a) * ry * random(0.52, 1.08);
      pts.push({
        x: constrain(px, -W * 0.08, W * 1.08),
        y: constrain(py, -H * 0.08, H * 1.08),
      });
    }
    let separation = 999999;
    for (let a of existingAnchors) {
      let dx = (cx - a.x) / max(1, (rx + a.rx) * 0.72);
      let dy = (cy - a.y) / max(1, (ry + a.ry) * 0.72);
      separation = min(separation, sqrt(dx * dx + dy * dy));
    }
    let edgeBias = min(cx, W - cx, cy, H - cy) / min(W, H);
    let score = separation + edgeBias * 0.22 + random(0.0, 0.16);
    if (!best || score > best.score) best = { pts, score, large };
  }
  let bounds = getBounds(best.pts);
  let areaNorm = ((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)) / (W * H);
  let material = buildPanelMaterial(gradient, ambient);
  let alphaBase = best.large
    ? (ambient ? random(78, 116) : random(96, 132))
    : (ambient ? random(46, 88) : random(60, 108));
  let alphaBoost = constrain(map(areaNorm, 0.02, 0.22, 0, 18), 0, 18);
  return mkZone("poly", {
    role: "panel",
    glassMode: material.glassMode,
    points: best.pts.map(pt => [pt.x / W, pt.y / H]),
    fill: material.fill,
    alpha: alphaBase + alphaBoost,
    tint: material.tint,
    rim: material.rim,
  });
}

function buildPanelMaterial(gradient, ambient = false) {
  if (!ambient) {
    return {
      glassMode: "vivid",
      fill: random(PAL_GLASS_FILL),
      tint: random(PAL_GLASS_TINT),
      rim: random(PAL_GLASS_RIM),
    };
  }
  let g1 = random([gradient.top, gradient.mid, gradient.bottom]);
  let g2 = random([gradient.top, gradient.mid, gradient.bottom]);
  return {
    glassMode: "ambient",
    fill: mixHex(g1, g2, random(0.25, 0.7)),
    tint: mixHex(g2, random(PAL_TRACE), random(0.14, 0.28)),
    rim: mixHex(g1, random(PAL_GLOW), random(0.22, 0.4)),
  };
}

function mixHex(a, b, t) {
  return colorToHex(lerpColor(color(a), color(b), t));
}

function colorToHex(c) {
  let col = color(c);
  let toHex = v => hex(round(v), 2);
  return `#${toHex(red(col))}${toHex(green(col))}${toHex(blue(col))}`;
}

function getBounds(pts) {
  let xs = pts.map(pt => pt.x), ys = pts.map(pt => pt.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function mkZone(kind, p) {
  let z = { kind, ...p, baseColor: p.fill || p.color };
  if (kind === "poly") {
    z.points = p.points.map(pt => ({ x: pt[0] * W, y: pt[1] * H }));
    let xs = z.points.map(pt => pt.x), ys = z.points.map(pt => pt.y);
    z.center = [(Math.min(...xs) + Math.max(...xs)) * 0.5, (Math.min(...ys) + Math.max(...ys)) * 0.5];
    z.radius = [Math.max((Math.max(...xs) - Math.min(...xs)) * 0.62, 96),
      Math.max((Math.max(...ys) - Math.min(...ys)) * 0.62, 86)];
  } else if (kind === "rect") {
    z.center = [p.x + p.w * 0.5, p.y + p.h * 0.5];
    z.radius = [Math.max(p.w * 0.6, 82), Math.max(p.h * 0.52, 72)];
  } else if (kind === "target") {
    z.center = [p.x, p.y];
    z.radius = [p.size * 1.45, p.size * 1.45];
  }
  return initZoneState(z);
}


function initZoneState(z) {
  z.currentStrength = 0;
  z.glowLevel = 0;
  z.fractureLevel = 0;
  z.prevFractureLevel = 0;
  z.wasFractured = false;
  z.regroupCooldown = 0;
  z.regroupFlash = 0;
  z.flashFill = null;
  z.flashTint = null;
  z.flashRim = null;
  z.mirrorX = 1;
  z.flipAnimating = false;
  z.flipT = 0;
  z.flipStart = 1;
  z.flipTarget = -1;
  z.shards = buildShards(z);
  return z;
}


function buildShards(z) {
  let perim = [];
  if (z.kind === "poly") perim = sampleShape(z.points, 3);
  else if (z.kind === "rect") perim = sampleShape([
    { x: z.x, y: z.y }, { x: z.x + z.w, y: z.y },
    { x: z.x + z.w, y: z.y + z.h }, { x: z.x, y: z.y + z.h }], 3);
  else if (z.kind === "target") {
    for (let i = 0; i < 12; i++) {
      let a = TWO_PI * (i / 12), r = z.size * 0.58;
      perim.push({ x: z.x + cos(a) * r, y: z.y + sin(a) * r });
    }
  }
  if (perim.length < 3) return [];
  let cx = z.center[0], cy = z.center[1], shards = [];
  for (let i = 0; i < perim.length; i++) {
    let p1 = perim[i], p2 = perim[(i + 1) % perim.length];
    let lp = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    let pts = [lp({ x: cx, y: cy }, p1, random(0.16, 0.36)), p1, p2, lp({ x: cx, y: cy }, p2, random(0.16, 0.36))];
    let tx = 0, ty = 0;
    for (let p of pts) { tx += p.x; ty += p.y; }
    let centX = tx / 4, centY = ty / 4;
    let dx = centX - cx, dy = centY - cy, mag = max(1, sqrt(dx * dx + dy * dy));
    shards.push({
      points: pts, centroid: { x: centX, y: centY },
      dir: { x: dx / mag, y: dy / mag }, depth: random(0.4, 1),
      threshold: i / perim.length + random(-0.08, 0.1), tint: random(PAL_GLOW),
      activation: 0,
    });
  }
  return shards.sort((a, b) => a.threshold - b.threshold);
}

function sampleShape(pts, sub) {
  let out = [];
  for (let i = 0; i < pts.length; i++) {
    let a = pts[i], b = pts[(i + 1) % pts.length];
    for (let s = 0; s < sub; s++) {
      let t = s / sub;
      out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    }
  }
  return out;
}

// --- Static Layer Builders ---

function buildBackground() {
  bgLayer.push(); bgLayer.clear(); bgLayer.noStroke();
  let grad = bgLayer.drawingContext.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.0, sceneConfig.gradient.top);
  grad.addColorStop(0.42, sceneConfig.gradient.mid);
  grad.addColorStop(1.0, sceneConfig.gradient.bottom);
  bgLayer.drawingContext.fillStyle = grad;
  bgLayer.drawingContext.fillRect(0, 0, W, H);
  bgLayer.pop();
}


function buildGrain() {
  randomSeed(SEED + 777); noiseSeed(SEED + 777);
  grainLayer.clear(); grainLayer.push(); grainLayer.strokeCap(SQUARE);
  for (let i = 0; i < 9000; i++) {
    let s = random(180, 245);
    grainLayer.stroke(s, s, s, random(10, 26));
    grainLayer.point(random(W), random(H));
  }
  for (let i = 0; i < 420; i++) {
    let px = random(W), py = random(H), len = random(3, 13), a = random(TWO_PI);
    grainLayer.stroke(170, 170, 170, random(12, 30)); grainLayer.strokeWeight(random(0.4, 1));
    grainLayer.line(px, py, px + cos(a) * len, py + sin(a) * len);
  }
  grainLayer.pop();
}

// --- Drawing Helpers ---

function drawPoly(g, pts) {
  g.beginShape();
  for (let p of pts) g.vertex(p.x, p.y);
  g.endShape(CLOSE);
}

function fitCanvas() {
  let wr = window.innerWidth / window.innerHeight, ar = W / H;
  if (wr > ar) {
    let h = window.innerHeight; canvasRef.elt.style.width = h * ar + "px"; canvasRef.elt.style.height = h + "px";
  } else {
    let w = window.innerWidth; canvasRef.elt.style.width = w + "px"; canvasRef.elt.style.height = w / ar + "px";
  }
}

function windowResized() { fitCanvas(); }

function keyPressed() {
  if (key === " ") { saveCanvas(canvasRef.elt, "dragon-brush-pastel-hud", "jpg"); return false; }
  return true;
}
