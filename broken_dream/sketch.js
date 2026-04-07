const W = 720, H = 1020;
const URL_SEED = new URLSearchParams(location.search).get("seed");
const SEED = URL_SEED !== null && Number.isFinite(+URL_SEED) ? +URL_SEED : Math.floor(Math.random() * 1e9);
const ZONE_ATTACK = 0.18, ZONE_RELEASE = 0.08;
const SHARD_ATTACK = 0.20, SHARD_RELEASE = 0.10;
const REGROUP_BREAK = 0.24, REGROUP_COMPLETE = 0.08, REGROUP_COOLDOWN = 12;
const COLOR_MORPH_DECAY = 0.085, FLIP_SPEED = 0.085;
const TRACE_BLEND_ALPHA = 1.0, TRACE_SCREEN_ALPHA = 0.14;
const TRACE_COUNT_MIN = 9, TRACE_COUNT_MAX = 13;
const TRACE_LIFE_MIN = 58, TRACE_LIFE_MAX = 88;

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
  attribute vec3 aPosition, aNormal; attribute vec2 aTexCoord;
  varying vec2 vTexCoord;
  uniform mat4 uModelViewMatrix, uProjectionMatrix;
  void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0); vTexCoord = aTexCoord; }
`;

const FRAG_SRC = `
  precision highp float;
  uniform sampler2D uTex; uniform vec2 uResolution; uniform float uTime;
  uniform float uBrightness, uContrast, uSplit, uJitter, uEnergy;
  uniform vec3 uCurve; uniform vec2 uHeading;
  varying vec2 vTexCoord;
  ${FRAG_FUNCTIONS}
  void main() {
    vec2 uv = vTexCoord; uv.y = 1.0 - uv.y;
    vec2 heading = length(uHeading) < 0.0001 ? vec2(0.0, 1.0) : normalize(uHeading);
    float energy = clamp(uEnergy, 0.0, 1.0);
    float wake = cnoise(vec3(uv * vec2(5.0, 11.0) + heading * uTime * 0.45, uTime * 0.2));
    vec2 uvBase = clamp(uv + heading * wake * (0.002 + energy * 0.005), 0.0, 1.0);
    float drift = cnoise(vec3(uvBase * vec2(8.0, 16.0), uTime * 0.22));
    float splitStr = uSplit * (1.0 + energy * 0.6), jitStr = uJitter * (1.0 + energy * 0.4);
    vec2 sOff = vec2(drift * 0.65 * splitStr, 0.0);
    vec2 jOff = vec2(0.0, (rand(uvBase + fract(uTime * 0.11)) - 0.5) * jitStr);
    vec3 col;
    col.r = texture2D(uTex, clamp(uvBase + sOff + jOff, 0.0, 1.0)).r;
    col.g = texture2D(uTex, clamp(uvBase + jOff * 0.35, 0.0, 1.0)).g;
    col.b = texture2D(uTex, clamp(uvBase - sOff + jOff, 0.0, 1.0)).b;
    col = pow(max((col + uBrightness - 0.5) * uContrast + 0.5, 0.0), uCurve);
    col += drift * (0.008 + energy * 0.008) * vec3(0.8, 1.0, 1.1) + energy * 0.008 * vec3(0.06, 0.02, 0.09);
    col *= mix(1.02, 0.96, smoothstep(0.18, 0.95, length((uv - 0.5) * vec2(0.9, 1.08))));
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

let canvasRef, bgLayer, zoneLayer, pulseLayer, paintLayer, compLayer, grainLayer, shaderLayer;
let posterShader, sceneConfig, zones = [];
let dragonX = W * 0.5, dragonY = H * 0.5, lastDX = dragonX, lastDY = dragonY;
let heading = 0, speed = 0, turn = 0, energy = 0;
let trailParticles = [];

function setup() {
  pixelDensity(min(devicePixelRatio || 1, 2));
  canvasRef = createCanvas(W, H); frameRate(60); smooth();
  bgLayer = createGraphics(W, H); zoneLayer = createGraphics(W, H);
  pulseLayer = createGraphics(W, H); paintLayer = createGraphics(W, H);
  compLayer = createGraphics(W, H); grainLayer = createGraphics(W, H);
  shaderLayer = createGraphics(W, H, WEBGL);
  [bgLayer, zoneLayer, pulseLayer, paintLayer, compLayer].forEach(l => l.smooth());
  shaderLayer.noStroke(); canvasRef.elt.style.imageRendering = "auto";
  posterShader = shaderLayer.createShader ? shaderLayer.createShader(VERT_SRC, FRAG_SRC)
    : new p5.Shader(shaderLayer._renderer, VERT_SRC, FRAG_SRC);
  randomSeed(SEED); noiseSeed(SEED);
  sceneConfig = generateScene(); zones = sceneConfig.reactiveZones;
  buildBackground(); buildGrain();
  [zoneLayer, pulseLayer, paintLayer, compLayer].forEach(l => l.clear());
  fitCanvas(); setupHandTracking();
  console.info("Dragon Brush seed:", SEED);
}

function draw() {
  let t = updateInputTarget();
  updateDragonKinematics(t.x, t.y);
  updateZoneList(zones, 0.28, 1.05, 0.45, 0.14, 0.86, 0.98);
  updateZoneList(sceneConfig.bgFrags, 0.3, 0.8, 0, 0.1, 0.9, 1);
  renderZones(); fadeAlpha(pulseLayer, 14); paintPulses(); paintTrail(); compose(); renderShader();
  blendMode(BLEND); clear(); image(shaderLayer, 0, 0, width, height);
  push(); blendMode(MULTIPLY); tint(255, 86); image(grainLayer, 0, 0, width, height); pop();
}

// --- Zone Updates ---

function updateZoneList(list, baseE, eMul, tMul, ss0, ss1, lrMul) {
  for (let z of list) {
    let inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    let str = constrain(inf * (baseE + energy * eMul) + turn * tMul, 0, 1);
    let fh = smoothStep(ss0, ss1, str);
    z.currentStrength = str;
    z.glowLevel = approach(z.glowLevel, str, ZONE_ATTACK, ZONE_RELEASE);
    z.fractureLevel = approach(z.fractureLevel, fh, ZONE_ATTACK, ZONE_RELEASE);
    if (!z.shards) continue;
    for (let s of z.shards) {
      let hd = dist(dragonX, dragonY, s.centroid.x, s.centroid.y);
      let target = max(0, fh * 0.72 + constrain(1 - hd / (max(z.radius[0], z.radius[1]) * lrMul), 0, 1) * 0.82 - s.threshold);
      s.activation = approach(s.activation, target, SHARD_ATTACK, SHARD_RELEASE);
    }
    updateRegroup(z);
  }
}

function updateRegroup(z) {
  if (!z.shards?.length) return;
  z.regroupCooldown = max(0, (z.regroupCooldown || 0) - 1);
  let fSig = max(z.fractureLevel || 0, (z.currentStrength || 0) * 0.82);
  if (fSig > REGROUP_BREAK) z.wasFractured = true;
  if (z.wasFractured && (z.prevFractureLevel || 0) > REGROUP_COMPLETE
      && z.fractureLevel <= REGROUP_COMPLETE && (z.regroupCooldown || 0) <= 0) {
    triggerZoneRegroup(z); z.wasFractured = false; z.regroupCooldown = REGROUP_COOLDOWN;
  }
  if (z.flipAnimating) {
    z.flipT = min(1, (z.flipT || 0) + FLIP_SPEED);
    if (z.flipT >= 1) { z.flipAnimating = false; z.mirrorX = z.flipTarget || -(z.flipStart || 1); }
  }
  if ((z.regroupFlash || 0) > 0) {
    z.regroupFlash = max(0, z.regroupFlash - COLOR_MORPH_DECAY);
    if (z.regroupFlash <= 0) { z.regroupFlash = 0; z.flashFill = z.flashTint = z.flashRim = null; }
  }
  z.prevFractureLevel = z.fractureLevel;
}

// --- Zone Rendering ---

function renderZones() {
  zoneLayer.clear(); zoneLayer.push(); zoneLayer.strokeJoin(ROUND); zoneLayer.strokeCap(SQUARE);
  for (let f of sceneConfig.bgFrags) drawZoneBase(zoneLayer, f);
  for (let p of sceneConfig.panels) drawZoneBase(zoneLayer, p);
  zoneLayer.pop();
}

function getDisplayPalette(z) {
  let fill = z.fill || z.baseColor || z.tint, tint = z.tint || fill, rim = z.rim || tint;
  if ((z.regroupFlash || 0) > 0) {
    if (z.flashFill) fill = mixHex(fill, z.flashFill, z.regroupFlash);
    if (z.flashTint) tint = mixHex(tint, z.flashTint, z.regroupFlash);
    if (z.flashRim) rim = mixHex(rim, z.flashRim, z.regroupFlash);
  }
  return { fill, tint, rim };
}

function drawZoneBase(g, z) {
  let isP = z.role === "panel", amb = z.glassMode === "ambient";
  let pk = (base, a, v) => !isP ? base : amb ? a : v;
  let frac = z.fractureLevel || 0;
  let { fill: fH, tint: eH, rim: rH } = getDisplayPalette(z);
  let bA = (z.alpha || 88) * pk(1.0, 1.02, 1.16);
  let iA = bA * max(0, 1 - frac * pk(1.25, 1.22, 1.34));
  let scaleX = z.flipAnimating ? (z.flipStart || 1) * cos((z.flipT || 0) * PI) : (z.mirrorX || 1);
  g.push(); g.translate(z.center[0], z.center[1]); g.scale(scaleX, 1); g.translate(-z.center[0], -z.center[1]);
  if (iA > 6) {
    let ft = isP ? lerpColor(color(fH), color(eH), amb ? 0.12 : 0.22) : color(fH);
    ft.setAlpha(iA); g.push(); g.noStroke(); g.fill(ft); drawPoly(g, z.points);
    if (isP) { let gl = lerpColor(color(fH), color(eH), amb ? 0.48 : 0.74);
      gl.setAlpha((amb ? 6 : 10) + iA * (amb ? 0.1 : 0.14)); g.fill(gl); drawPoly(g, z.points); }
    g.pop();
  }
  let et = isP ? lerpColor(color(fH), color(eH), amb ? 0.56 : 0.82) : color(eH);
  et.setAlpha(max(pk(14, 18, 32), iA * pk(0.42, 0.38, 0.56)));
  g.push(); g.noFill(); g.stroke(et); g.strokeWeight(pk(0.7, 0.85, 1.15)); drawPoly(g, z.points);
  if (isP) {
    let depth = lerpColor(color(eH), color("#4d3f76"), 0.68);
    depth.setAlpha((amb ? 4 : 8) + iA * (amb ? 0.08 : 0.14));
    g.push(); g.translate(amb ? 2.4 : 3.2, amb ? 3.2 : 4.2); g.stroke(depth); g.strokeWeight(amb ? 0.65 : 0.85);
    drawPoly(g, z.points); g.pop();
    let rim = lerpColor(color(eH), color(rH), 0.44);
    rim.setAlpha((amb ? 5 : 9) + iA * (amb ? 0.08 : 0.12));
    g.push(); g.translate(amb ? -1.8 : -2.8, amb ? -2.6 : -3.8); g.stroke(rim); g.strokeWeight(amb ? 0.5 : 0.65);
    drawPoly(g, z.points); g.pop();
  }
  g.pop();
  if (z.shards?.length) {
    let bt = color(fH), shardTint = color(isP ? rH : (z.tint || z.baseColor));
    for (let s of z.shards) {
      let act = constrain((s.activation || 0) * 0.78 + frac * 0.22, 0, 1);
      if (act <= 0.01) continue;
      let off = act * pk(24, 28, 34) * (0.55 + s.depth * 0.95);
      let st = lerpColor(bt, shardTint, pk(0.24, 0.28, 0.42) + act * pk(0.16, 0.18, 0.24));
      st.setAlpha(pk(60, 56, 78) + act * pk(110, 102, 138));
      let ss2 = lerpColor(shardTint, color(z.tint || z.baseColor), 0.36);
      ss2.setAlpha(pk(22, 20, 32) + act * pk(42, 42, 64));
      g.push(); g.translate(s.dir.x * off, s.dir.y * off);
      if (isP) {
        let shadow = lerpColor(color("#4d3f76"), shardTint, 0.18);
        shadow.setAlpha((amb ? 5 : 8) + act * (amb ? 18 : 28));
        g.push(); g.translate(s.dir.x * (2 + act * 3.5), s.dir.y * (2 + act * 3.5));
        g.noStroke(); g.fill(shadow); drawPoly(g, s.points); g.pop();
      }
      g.noStroke(); g.fill(st); drawPoly(g, s.points);
      g.noFill(); g.stroke(ss2); g.strokeWeight(0.35 + act * 0.9); drawPoly(g, s.points);
      g.pop();
    }
  }
  g.pop();
}

function paintPulses() {
  pulseLayer.push(); pulseLayer.blendMode(SCREEN); pulseLayer.strokeCap(SQUARE); pulseLayer.strokeJoin(ROUND);
  for (let z of zones) {
    let inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    let str = constrain(inf * (0.28 + energy * 1.05) + turn * 0.45, 0, 1);
    if (str > 0.015) {
      let pal = getDisplayPalette(z);
      let ft = color(pal.tint); ft.setAlpha(12 + str * 30);
      let st = color(pal.tint); st.setAlpha(8 + str * 18);
      pulseLayer.push(); pulseLayer.noStroke(); pulseLayer.fill(ft); drawPoly(pulseLayer, z.points);
      pulseLayer.noFill(); pulseLayer.stroke(st); pulseLayer.strokeWeight(0.8 + str * 1.1); drawPoly(pulseLayer, z.points);
      pulseLayer.pop();
    }
  }
  pulseLayer.blendMode(BLEND); pulseLayer.pop();
}

// --- Trail ---

function paintTrail() {
  let ang = atan2(dragonY - lastDY, dragonX - lastDX), na = ang + HALF_PI;
  let bs = map(sin(frameCount / 11), -1, 1, 34, 92);
  for (let i = 0, mc = floor(random(TRACE_COUNT_MIN, TRACE_COUNT_MAX)); i < mc; i++) {
    let lat = randomGaussian() * bs * 0.36, fwd = random(-bs * 0.35, bs * 0.35);
    let px = dragonX + cos(na) * lat + cos(ang) * fwd, py = dragonY + sin(na) * lat + sin(ang) * fwd;
    let rot = ang + random(-0.85, 0.85), sz = random(5, 20), nv = floor(random(3, 6)), pts = [];
    for (let j = 0; j < nv; j++) {
      let a = TWO_PI * j / nv + random(-0.4, 0.4);
      pts.push({ x: cos(a) * sz * random(0.4, 1), y: sin(a) * sz * random(0.4, 1) });
    }
    let base = color(random(random() < 0.38 ? PAL_ACCENT_ACTIVE : PAL_TRACE));
    let tintC = color(random(PAL_GLOW)), act = random(0.2, 0.8);
    let ft = lerpColor(base, tintC, 0.18 + act * 0.12), st = lerpColor(base, tintC, 0.48);
    trailParticles.push({ x: px, y: py, rot, pts, sw: 0.35 + act * 0.9,
      maxAge: floor(random(TRACE_LIFE_MIN, TRACE_LIFE_MAX)), age: 0,
      fRgb: [red(ft), green(ft), blue(ft)], sRgb: [red(st), green(st), blue(st)],
      fA: random(78, 156), sA: random(24, 62) });
  }
  let alive = [];
  paintLayer.clear(); paintLayer.push(); paintLayer.strokeJoin(ROUND); paintLayer.strokeCap(SQUARE);
  for (let p of trailParticles) {
    let life = 1 - p.age / p.maxAge;
    if (life <= 0) continue;
    let fade = life * life * (3 - 2 * life);
    let ft = color(...p.fRgb); ft.setAlpha(p.fA * fade);
    let st = color(...p.sRgb); st.setAlpha(p.sA * fade);
    paintLayer.push(); paintLayer.translate(p.x, p.y); paintLayer.rotate(p.rot);
    paintLayer.noStroke(); paintLayer.fill(ft); drawPoly(paintLayer, p.pts);
    paintLayer.noFill(); paintLayer.stroke(st); paintLayer.strokeWeight(p.sw); drawPoly(paintLayer, p.pts);
    paintLayer.pop();
    if (++p.age < p.maxAge) alive.push(p);
  }
  paintLayer.pop();
  trailParticles = alive;
}

// --- Compose & Shader ---

function compose() {
  let C = compLayer;
  C.push(); C.clear(); C.image(bgLayer, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = 1; C.image(zoneLayer, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = 0.7; C.image(pulseLayer, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = TRACE_BLEND_ALPHA; C.image(paintLayer, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = TRACE_SCREEN_ALPHA; C.image(paintLayer, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = 1; C.pop();
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

// --- Static Builders ---

function buildBackground() {
  bgLayer.push(); bgLayer.clear(); bgLayer.noStroke();
  let grad = bgLayer.drawingContext.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.0, sceneConfig.gradient.top);
  grad.addColorStop(0.42, sceneConfig.gradient.mid);
  grad.addColorStop(1.0, sceneConfig.gradient.bottom);
  bgLayer.drawingContext.fillStyle = grad;
  bgLayer.drawingContext.fillRect(0, 0, W, H); bgLayer.pop();
}

function buildGrain() {
  randomSeed(SEED + 777); noiseSeed(SEED + 777);
  grainLayer.clear(); grainLayer.push(); grainLayer.strokeCap(SQUARE);
  for (let i = 0; i < 9000; i++) { let s = random(180, 245); grainLayer.stroke(s, s, s, random(10, 26)); grainLayer.point(random(W), random(H)); }
  for (let i = 0; i < 420; i++) {
    let px = random(W), py = random(H), len = random(3, 13), a = random(TWO_PI);
    grainLayer.stroke(170, 170, 170, random(12, 30)); grainLayer.strokeWeight(random(0.4, 1));
    grainLayer.line(px, py, px + cos(a) * len, py + sin(a) * len);
  }
  grainLayer.pop();
}

// --- Helpers ---

function drawPoly(g, pts) { g.beginShape(); for (let p of pts) g.vertex(p.x, p.y); g.endShape(CLOSE); }
function fadeAlpha(layer, amt) {
  layer.push(); layer.rectMode(CORNER); layer.noStroke(); layer.drawingContext.save();
  layer.drawingContext.globalCompositeOperation = "destination-out";
  layer.fill(0, 0, 0, amt); layer.rect(0, 0, W, H); layer.drawingContext.restore(); layer.pop();
}
function smoothStep(e0, e1, x) { let t = constrain((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
function approach(cur, tgt, rise, fall) { let v = cur ?? 0; return lerp(v, tgt, tgt > v ? rise : fall); }
function zoneInf(x, y, cx, cy, rx, ry) { let dx = (x - cx) / rx, dy = (y - cy) / ry; return constrain(1 - sqrt(dx * dx + dy * dy), 0, 1); }
function fitCanvas() {
  let wr = innerWidth / innerHeight, ar = W / H;
  if (wr > ar) { canvasRef.elt.style.width = innerHeight * ar + "px"; canvasRef.elt.style.height = innerHeight + "px"; }
  else { canvasRef.elt.style.width = innerWidth + "px"; canvasRef.elt.style.height = innerWidth / ar + "px"; }
}
function windowResized() { fitCanvas(); }
