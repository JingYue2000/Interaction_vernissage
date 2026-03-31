const W = 720, H = 1020;
const PAL_BASE = "#c4b5e0-#a8d8ea-#d4c5f9-#e8dff5-#bfe9da-#9b59b6-#61c9a8-#ffffff".split("-");
const PAL_ACCENT = "#00d2ff-#d81159-#f52f57-#61c9a8-#9b59b6-#ffffff".split("-");
const PAL_ACCENT_ACTIVE = "#00d2ff-#d81159-#f52f57-#61c9a8-#9b59b6".split("-");
const PAL_TRACE = "#c4b5e0-#a8d8ea-#d4c5f9-#bfe9da-#9b59b6-#61c9a8-#00d2ff-#d81159-#f52f57".split("-");
const PAL_GLOW = "#d4c5f9-#bfe9da-#00d2ff-#d81159-#f52f57".split("-");
const PAL_ATMO = "#d2b7f2-#b8c4fb-#9ddcf3-#98d8c0-#d79ce9-#a8d6f4".split("-");

const URL_SEED = new URLSearchParams(window.location.search).get("seed");
const SEED = URL_SEED !== null && Number.isFinite(Number(URL_SEED))
  ? Number(URL_SEED) : Math.floor(Math.random() * 1000000000);

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
    float scan = sin((uv.y * uResolution.y * 0.18) + uTime * 0.5) * 0.5 + 0.5;
    float splitStr = uSplit * (1.0 + energy * 0.6);
    float jitStr = uJitter * (1.0 + energy * 0.4);
    vec2 sOff = vec2((drift * 0.65 + (scan - 0.5) * 0.3) * splitStr, 0.0);
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

let canvasRef, bgLayer, atmoLayer, zoneLayer, structLayer, pulseLayer, paintLayer, compLayer, grainLayer, shaderLayer;
let posterShader, sceneConfig, zones = [];
let dragonX = W * 0.5, dragonY = H * 0.5, lastDX = dragonX, lastDY = dragonY;
let heading = 0, speed = 0, turn = 0, energy = 0;

function setup() {
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  canvasRef = createCanvas(W, H);
  frameRate(60); noSmooth();
  bgLayer = createGraphics(W, H);
  atmoLayer = createGraphics(W, H);
  zoneLayer = createGraphics(W, H);
  structLayer = createGraphics(W, H);
  pulseLayer = createGraphics(W, H);
  paintLayer = createGraphics(W, H);
  compLayer = createGraphics(W, H);
  grainLayer = createGraphics(W, H);
  shaderLayer = createGraphics(W, H, WEBGL);
  shaderLayer.noStroke();
  posterShader = shaderLayer.createShader
    ? shaderLayer.createShader(VERT_SRC, FRAG_SRC)
    : new p5.Shader(shaderLayer._renderer, VERT_SRC, FRAG_SRC);
  randomSeed(SEED); noiseSeed(SEED);
  sceneConfig = generateScene();
  zones = sceneConfig.reactiveZones;
  buildBackground(); buildStructure(); buildGrain();
  atmoLayer.clear(); zoneLayer.clear(); pulseLayer.clear(); paintLayer.clear(); compLayer.clear();
  fitCanvas();
  console.info("Dragon Brush seed:", SEED);
}

function draw() {
  updateDragon();
  updateZones();
  renderZones();
  fadeAlpha(atmoLayer, 2);
  fadeAlpha(pulseLayer, 14);
  fadeAlpha(paintLayer, 5);
  paintAtmosphere();
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
  lastDX = dragonX; lastDY = dragonY;
  let ph = noise(frameCount / 50);
  let tx = cos(frameCount / 30 + ph) * W * 0.34 + W * 0.5;
  let ty = sin(frameCount / 50 + ph) * H * 0.32 + H * 0.5;
  dragonX = lerp(dragonX, tx, 0.26);
  dragonY = lerp(dragonY, ty, 0.26);
  let dx = dragonX - lastDX, dy = dragonY - lastDY;
  let nextH = atan2(dy, dx);
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

function pickPal(pal, s) { return pal[min(pal.length - 1, floor(noise(s) * pal.length))]; }

function ss(e0, e1, x) { let t = constrain((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

function zoneInf(x, y, cx, cy, rx, ry) {
  let dx = (x - cx) / rx, dy = (y - cy) / ry;
  return constrain(1 - sqrt(dx * dx + dy * dy), 0, 1);
}

function paintAtmosphere() {
  let na = heading + HALF_PI, e = constrain(energy, 0, 1);
  let wl = map(e, 0, 1, 120, 280), ww = map(e, 0, 1, 72, 180);
  atmoLayer.push(); atmoLayer.rectMode(CENTER); atmoLayer.noStroke();
  atmoLayer.blendMode(BLEND); atmoLayer.drawingContext.filter = "blur(12px)";
  for (let i = 0; i < 5; i++) {
    let to = i * random(20, 42), lat = randomGaussian() * ww * 0.16;
    let px = dragonX - cos(heading) * to + cos(na) * lat;
    let py = dragonY - sin(heading) * to + sin(na) * lat;
    let g = color(pickPal(PAL_ATMO, frameCount * 0.018 + i * 0.37 + energy * 3));
    g.setAlpha(random(6, 12) + e * 10); atmoLayer.fill(g);
    atmoLayer.ellipse(px, py, wl * random(0.5, 1.05), ww * random(0.35, 0.85));
  }
  let rib = color(pickPal(PAL_ATMO, frameCount * 0.013 + 12 + heading * 0.3));
  rib.setAlpha(8 + e * 12); atmoLayer.fill(rib);
  atmoLayer.translate(dragonX - cos(heading) * wl * 0.18, dragonY - sin(heading) * wl * 0.18);
  atmoLayer.rotate(heading + random(-0.16, 0.16));
  atmoLayer.rect(0, 0, wl * 1.25, ww * 0.22, ww * 0.16);
  atmoLayer.drawingContext.filter = "blur(0px)"; atmoLayer.blendMode(BLEND); atmoLayer.pop();
  if (energy > 0.24) {
    atmoLayer.push(); atmoLayer.blendMode(BLEND);
    atmoLayer.strokeWeight(map(energy, 0, 1, 0.45, 0.9));
    let st = color(pickPal(PAL_ACCENT_ACTIVE, frameCount * 0.022 + 28 + heading * 0.6));
    st.setAlpha(12 + energy * 18); atmoLayer.stroke(st);
    let r = map(energy, 0, 1, 60, 180);
    atmoLayer.line(dragonX - cos(heading) * r, dragonY - sin(heading) * r,
      dragonX + cos(heading) * r * 0.8, dragonY + sin(heading) * r * 0.8);
    atmoLayer.pop();
  }
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
  let ft = color(z.tint); ft.setAlpha(12 + str * 30);
  let st = color(z.tint); st.setAlpha(8 + str * 18);
  pulseLayer.push(); pulseLayer.noStroke(); pulseLayer.fill(ft);
  if (z.kind === "poly") {
    drawPoly(pulseLayer, z.points);
    pulseLayer.noFill(); pulseLayer.stroke(st); pulseLayer.strokeWeight(0.8 + str * 1.1);
    drawPoly(pulseLayer, z.points);
  } else if (z.kind === "rect") {
    pulseLayer.rectMode(CORNER); pulseLayer.rect(z.x, z.y, z.w, z.h, z.r);
    pulseLayer.noFill(); pulseLayer.stroke(st); pulseLayer.strokeWeight(0.9 + str * 1.2);
    pulseLayer.rect(z.x, z.y, z.w, z.h, z.r);
  } else if (z.kind === "target") {
    pulseLayer.noFill(); pulseLayer.stroke(st); pulseLayer.strokeWeight(0.6 + str * 0.8);
    drawTargetGlyph(pulseLayer, z.x, z.y, z.size + str * 8, z.tint, 14 + str * 38);
  }
  pulseLayer.pop();
}

function updateZones() {
  for (let z of zones) {
    let inf = zoneInf(dragonX, dragonY, z.center[0], z.center[1], z.radius[0], z.radius[1]);
    let str = constrain(inf * (0.28 + energy * 1.05) + turn * 0.45, 0, 1);
    let fh = ss(0.14, 0.86, str);
    z.currentStrength = str;
    z.glowLevel = max(z.glowLevel || 0, str);
    z.fractureLevel = max(z.fractureLevel || 0, fh);
    if (!z.shards) continue;
    for (let s of z.shards) {
      let hd = dist(dragonX, dragonY, s.centroid.x, s.centroid.y);
      let lr = max(z.radius[0], z.radius[1]) * 0.98;
      let hf = constrain(1 - hd / lr, 0, 1);
      s.activation = max(s.activation || 0, fh * 0.72 + hf * 0.82 - s.threshold);
    }
  }
}

function renderZones() {
  zoneLayer.clear(); zoneLayer.push();
  zoneLayer.strokeJoin(ROUND); zoneLayer.strokeCap(SQUARE);
  for (let p of sceneConfig.panels) drawZoneBase(zoneLayer, p);
  for (let t of sceneConfig.targets) drawZoneBase(zoneLayer, t);
  zoneLayer.pop();
}

function drawZoneBase(g, z) {
  let frac = z.fractureLevel || 0;
  let fHex = z.baseColor || z.fill || z.color || z.tint;
  let eHex = z.tint || fHex;
  let iAlpha = (z.alpha || 88) * max(0, 1 - frac * 1.25);
  if (iAlpha > 6) {
    let ft = color(fHex); ft.setAlpha(iAlpha);
    g.push(); g.noStroke(); g.fill(ft);
    if (z.kind === "poly") drawPoly(g, z.points);
    else if (z.kind === "rect") { g.rectMode(CORNER); g.rect(z.x, z.y, z.w, z.h, z.r); }
    else if (z.kind === "target") {
      let tf = color(fHex); tf.setAlpha(max(0, iAlpha * 0.18));
      g.fill(tf); g.circle(z.x, z.y, z.size * 0.92); g.noFill();
      drawTargetGlyph(g, z.x, z.y, z.size, eHex, iAlpha);
    }
    g.pop();
  }
  if (z.kind !== "target") {
    let et = color(eHex); et.setAlpha(max(14, iAlpha * 0.42));
    g.push(); g.noFill(); g.stroke(et); g.strokeWeight(0.7);
    if (z.kind === "poly") drawPoly(g, z.points);
    else if (z.kind === "rect") { g.rectMode(CORNER); g.rect(z.x, z.y, z.w, z.h, z.r); }
    g.pop();
  }
  if (frac > 0.02 && z.shards && z.shards.length > 0) {
    let bt = color(z.baseColor || z.fill || z.color || z.tint);
    for (let s of z.shards) {
      let act = min(1, (s.activation || 0) * 0.9 + frac * 0.25);
      if (act <= 0) continue;
      let off = act * 22 * s.depth;
      let st = lerpColor(bt, color(z.tint || z.baseColor), 0.18 + act * 0.12);
      st.setAlpha(60 + act * 110);
      let ss2 = lerpColor(bt, color(z.tint || z.baseColor), 0.48);
      ss2.setAlpha(22 + act * 42);
      g.push(); g.translate(s.dir.x * off, s.dir.y * off);
      g.noStroke(); g.fill(st); drawPoly(g, s.points);
      g.noFill(); g.stroke(ss2); g.strokeWeight(0.35 + act * 0.9); drawPoly(g, s.points);
      g.pop();
    }
  }
}

function paintTrail() {
  let ang = atan2(dragonY - lastDY, dragonX - lastDX), na = ang + HALF_PI;
  let bs = map(sin(frameCount / 11), -1, 1, 34, 92), mc = floor(random(14, 24));
  paintLayer.push(); paintLayer.rectMode(CENTER);
  paintLayer.strokeCap(SQUARE); paintLayer.strokeJoin(ROUND);
  paintLayer.drawingContext.shadowColor = "rgba(196,181,224,0.04)";
  paintLayer.drawingContext.shadowBlur = 3;
  for (let i = 0; i < mc; i++) {
    let lat = randomGaussian() * bs * 0.36, fwd = random(-bs * 0.35, bs * 0.35);
    let px = dragonX + cos(na) * lat + cos(ang) * fwd;
    let py = dragonY + sin(na) * lat + sin(ang) * fwd;
    let rot = ang + random(-0.85, 0.85), pick = random();
    let accent = random() < 0.38;
    let tone = color(random(accent ? PAL_ACCENT_ACTIVE : PAL_TRACE));
    tone.setAlpha(random(118, 228));
    let gl = color(random(PAL_GLOW)); gl.setAlpha(18);
    paintLayer.push(); paintLayer.translate(px, py); paintLayer.rotate(rot);
    paintLayer.drawingContext.shadowColor = gl.toString();
    if (pick < 0.35) {
      paintLayer.noStroke(); paintLayer.fill(tone);
      paintLayer.rect(0, 0, random(8, 30), random(4, 14), random(4, 14) * 0.9);
    } else if (pick < 0.58) {
      paintLayer.noFill(); paintLayer.stroke(tone); paintLayer.strokeWeight(random(1.1, 2.6));
      let len = random(16, 44); paintLayer.line(-len * 0.5, 0, len * 0.5, 0);
      if (random() < 0.35) { paintLayer.strokeWeight(1); paintLayer.line(len * 0.18, -5, len * 0.18, 5); }
    } else if (pick < 0.8) {
      paintLayer.noStroke(); paintLayer.fill(tone); paintLayer.circle(0, 0, random(4, 12));
      if (random() < 0.12) {
        let dt = color(random(PAL_GLOW)); dt.setAlpha(22); paintLayer.fill(dt);
        paintLayer.circle(random(-10, 10), random(-10, 10), random(1.4, 2.8));
      }
    } else {
      paintLayer.noFill(); paintLayer.stroke(tone); paintLayer.strokeWeight(random(1, 2));
      drawBracket(paintLayer, 0, 0, random(14, 28), random(12, 24));
    }
    paintLayer.pop();
  }
  paintLayer.pop();
}

function compose() {
  let C = compLayer, A = atmoLayer, S = structLayer, P = paintLayer, Z = zoneLayer, PL = pulseLayer;
  C.push(); C.clear(); C.image(bgLayer, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = 0.9; C.image(A, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = 0.1;
  C.drawingContext.filter = "blur(18px)"; C.image(A, 0, 0);
  C.drawingContext.filter = "blur(0px)";
  C.blendMode(BLEND); C.drawingContext.globalAlpha = 1;
  C.image(Z, 0, 0); C.image(S, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = 0.7; C.image(PL, 0, 0);
  C.blendMode(BLEND); C.drawingContext.globalAlpha = 1; C.image(P, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = 0.12;
  C.drawingContext.filter = "blur(6px)"; C.image(P, 0, 0);
  C.drawingContext.filter = "blur(0px)";
  C.blendMode(MULTIPLY); C.drawingContext.globalAlpha = 0.34; C.image(S, 0, 0);
  C.drawingContext.globalAlpha = 0.36; C.image(P, 0, 0);
  C.blendMode(SCREEN); C.drawingContext.globalAlpha = 0.56; C.image(P, 0, 0);
  C.blendMode(BLEND); C.drawingContext.filter = "blur(0px)"; C.drawingContext.globalAlpha = 1;
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
    hazes: [], bands: [], panels: [], outlines: [], guides: [],
    targets: [], brackets: [], hatches: [], reactiveZones: [],
    microGlyphCount: floor(random(96, 162)),
  };
  for (let i = 0; i < 4; i++) cfg.hazes.push({
    x: random(0.08, 0.92) * W, y: random(0.1, 0.9) * H,
    w: random(280, 760), h: random(180, 860),
    color: random(["#efe4ff", "#d6d0ff", "#caebff", "#c8f1e3", "#dbcaff"]), alpha: random(28, 94),
  });
  for (let i = 0, n = floor(random(2, 4)); i < n; i++) cfg.bands.push({
    x: random(-40, 120), y: random(0.18, 0.94) * H,
    w: random(0.42, 1.04) * W, h: random(8, 22),
    color: random(["#d8c9ff", "#cfe7ff", "#ffffff", "#f0d2ff"]), alpha: random(18, 36),
  });

  let lp = mkZone("poly", {
    points: [[0, random(0.47, 0.58)], [random(0.54, 0.66), random(0.31, 0.39)], [random(0.57, 0.69), 1], [0, 1]],
    fill: random(["#cbbff0", "#c5b2ff", "#bda6ef"]), alpha: random(108, 142),
    tint: random(["#bc94ff", "#d58fff", "#9eeaff"]),
    guide: { x1: random(0.04, 0.14) * W, y1: random(0.58, 0.7) * H, x2: random(0.82, 0.94) * W, y2: random(0.16, 0.26) * H },
  });
  cfg.panels.push(lp); cfg.guides.push(lp.guide); cfg.reactiveZones.push(lp);

  let ts = mkZone("poly", {
    points: [[random(0.4, 0.54), random(0.12, 0.2)], [1, random(0.08, 0.16)], [1, random(0.38, 0.48)], [random(0.55, 0.67), random(0.37, 0.47)]],
    fill: random(["#e3daf9", "#e7ddff", "#dcd4fb"]), alpha: random(92, 122),
    tint: random(["#d6c8ff", "#dbe7ff", "#a6e8ff"]),
    guide: { x1: random(0.78, 0.96) * W, y1: 0, x2: random(0.18, 0.34) * W, y2: random(0.34, 0.46) * H },
  });
  cfg.panels.push(ts); cfg.guides.push(ts.guide); cfg.reactiveZones.push(ts);

  let cx = random(0.22, 0.34) * W, cy = random(0.22, 0.3) * H;
  let cw = random(210, 272), ch = random(370, 520), cr = random(14, 22);
  let cp = mkZone("rect", {
    x: cx, y: cy, w: cw, h: ch, r: cr,
    fill: random(["#ab96ef", "#b392f2", "#a88de8"]), alpha: random(92, 118),
    tint: random(["#d86cff", "#ff8df0", "#a9d7ff"]),
    hatch: { x: cx + random(-10, 18), y: cy + random(36, 112), w: min(cw - random(6, 24), random(180, 260)),
      h: random(10, 24), color: random(["#ff8df0", "#d562e4", "#9eeaff"]), spacing: random(22, 34) },
  });
  cfg.panels.push(cp); cfg.hatches.push(cp.hatch); cfg.reactiveZones.push(cp);

  let lw = mkZone("poly", {
    points: [[random(0.01, 0.08), random(0.08, 0.15)], [random(0.32, 0.43), random(0.06, 0.12)],
      [random(0.17, 0.29), random(0.35, 0.46)], [random(-0.01, 0.04), random(0.33, 0.43)]],
    fill: random(["#ede4fb", "#f0e9ff", "#e0dcff"]), alpha: random(44, 72),
    tint: random(["#dbe7ff", "#cfe0ff", "#c0f7ff"]),
    guide: { x1: random(0.12, 0.22) * W, y1: random(0.01, 0.05) * H, x2: random(0.38, 0.49) * W, y2: random(0.18, 0.28) * H },
  });
  cfg.panels.push(lw); cfg.guides.push(lw.guide); cfg.reactiveZones.push(lw);

  if (random() < 0.78) cfg.panels.push(mkZone("rect", {
    x: random(0.5, 0.72) * W, y: random(0.58, 0.82) * H,
    w: random(88, 168), h: random(42, 96), r: random(12, 20),
    fill: random(["#eef3ff", "#ece2ff", "#dff7ff"]), alpha: random(34, 58),
    tint: random(["#d9e7ff", "#b7ebff", "#eec7ff"]),
  }));

  for (let i = 0, n = floor(random(5, 8)); i < n; i++) {
    let a = random(cfg.panels), ow = random(88, 158), oh = random(38, 118);
    cfg.outlines.push({
      x: constrain(a.center[0] + random(-a.radius[0], a.radius[0]) - ow * 0.5, 16, W - ow - 16),
      y: constrain(a.center[1] + random(-a.radius[1], a.radius[1]) - oh * 0.5, 16, H - oh - 16),
      w: ow, h: oh, r: random(10, 18),
      color: random(["#7e6dc2", "#ffffff", "#d974ff", "#b7ebff"]),
      weight: random(1, 1.9), alpha: random(78, 154),
    });
  }
  for (let i = 0, n = floor(random(6, 9)); i < n; i++) {
    let s = randEdge(), e = randEdge();
    cfg.guides.push({ x1: s.x, y1: s.y, x2: e.x, y2: e.y,
      color: random(["#8978e1", "#ffffff", "#61c9a8", "#d98dff"]),
      alpha: random(52, 108), weight: random(0.7, 1.35) });
  }
  for (let i = 0, n = floor(random(3, 5)); i < n; i++) {
    let a = random(cfg.panels), sz = random(14, 58);
    let tx = constrain(a.center[0] + random(-a.radius[0] * 0.65, a.radius[0] * 0.65), 36, W - 36);
    let ty = constrain(a.center[1] + random(-a.radius[1] * 0.65, a.radius[1] * 0.65), 36, H - 36);
    let tgt = mkZone("target", {
      x: tx, y: ty, size: sz,
      color: random(["#dbb0ff", "#c3b4ff", "#61c9a8", "#9eeaff"]), alpha: random(88, 132),
      tint: random(["#9eeaff", "#dba4ff", "#c8f0ff", "#61c9a8"]),
    });
    cfg.targets.push(tgt);
    if (i < 3) cfg.reactiveZones.push(tgt);
  }
  for (let i = 0, n = floor(random(3, 6)); i < n; i++) cfg.brackets.push({
    x: random(0.07, 0.92) * W, y: random(0.08, 0.92) * H,
    w: random(14, 26), h: random(11, 20),
    color: random(["#ffffff", "#d8ccff", "#baf4ff"]), alpha: random(70, 130),
  });
  for (let i = 0, n = floor(random(1, 3)); i < n; i++) cfg.hatches.push({
    x: random(0.08, 0.58) * W, y: random(0.16, 0.92) * H,
    w: random(120, 260), h: random(8, 20),
    color: random(["#ec6fd9", "#d562e4", "#9eeaff", "#ffffff"]),
    weight: random(0.95, 1.25), spacing: random(18, 30),
  });
  return cfg;
}

function mkZone(kind, p) {
  let z = { kind, ...p, baseColor: p.fill || p.color };
  if (kind === "poly") {
    z.points = p.points.map(pt => ({ x: pt[0] * W, y: pt[1] * H }));
    let xs = z.points.map(pt => pt.x), ys = z.points.map(pt => pt.y);
    z.center = [(Math.min(...xs) + Math.max(...xs)) * 0.5, (Math.min(...ys) + Math.max(...ys)) * 0.5];
    z.radius = [Math.max((Math.max(...xs) - Math.min(...xs)) * 0.62, 96),
      Math.max((Math.max(...ys) - Math.min(...ys)) * 0.62, 86)];
    if (z.guide) {
      z.guide.color = z.guide.color || random(["#8978e1", "#ffffff", "#61c9a8", "#d98dff"]);
      z.guide.alpha = z.guide.alpha || random(40, 92);
      z.guide.weight = z.guide.weight || random(0.7, 1.35);
    }
  } else if (kind === "rect") {
    z.center = [p.x + p.w * 0.5, p.y + p.h * 0.5];
    z.radius = [Math.max(p.w * 0.6, 82), Math.max(p.h * 0.52, 72)];
  } else if (kind === "target") {
    z.center = [p.x, p.y];
    z.radius = [p.size * 1.45, p.size * 1.45];
  }
  z.shards = buildShards(z);
  return z;
}

function randEdge() {
  let e = floor(random(4));
  if (e === 0) return { x: random(W), y: 0 };
  if (e === 1) return { x: W, y: random(H) };
  if (e === 2) return { x: random(W), y: H };
  return { x: 0, y: random(H) };
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
  let top = color(sceneConfig.gradient.top), mid = color(sceneConfig.gradient.mid), bot = color(sceneConfig.gradient.bottom);
  bgLayer.push(); bgLayer.clear(); bgLayer.noFill();
  for (let y = 0; y < H; y++) {
    let t = y / (H - 1);
    let c = lerpColor(lerpColor(top, mid, min(t * 1.25, 1)), bot, ss(0.25, 1, t));
    bgLayer.stroke(c); bgLayer.line(0, y, W, y);
  }
  bgLayer.noStroke();
  for (let h of sceneConfig.hazes) {
    let c = color(h.color); c.setAlpha(h.alpha); bgLayer.fill(c);
    bgLayer.ellipse(h.x, h.y, h.w, h.h);
  }
  for (let b of sceneConfig.bands) {
    let c = color(b.color); c.setAlpha(b.alpha); bgLayer.fill(c);
    bgLayer.rect(b.x, b.y, b.w, b.h, b.h * 0.5);
  }
  bgLayer.pop();
}

function buildStructure() {
  structLayer.clear(); structLayer.push();
  structLayer.noFill(); structLayer.strokeJoin(ROUND); structLayer.strokeCap(SQUARE);
  for (let o of sceneConfig.outlines) {
    let c = color(o.color); c.setAlpha(o.alpha);
    structLayer.push(); structLayer.noFill(); structLayer.stroke(c);
    structLayer.strokeWeight(o.weight); structLayer.rect(o.x, o.y, o.w, o.h, o.r); structLayer.pop();
  }
  for (let g of sceneConfig.guides) {
    let c = color(g.color); c.setAlpha(min(255, g.alpha * 1.08));
    structLayer.push(); structLayer.noFill(); structLayer.stroke(c);
    structLayer.strokeWeight(g.weight); structLayer.line(g.x1, g.y1, g.x2, g.y2); structLayer.pop();
  }
  for (let b of sceneConfig.brackets) {
    let c = color(b.color); c.setAlpha(b.alpha);
    structLayer.stroke(c); structLayer.strokeWeight(1.05);
    drawBracket(structLayer, b.x, b.y, b.w, b.h);
  }
  for (let h of sceneConfig.hatches) {
    let c = color(h.color); c.setAlpha(90);
    structLayer.push(); structLayer.noFill(); structLayer.stroke(c); structLayer.strokeWeight(h.weight);
    for (let off = -h.h; off < h.w + h.h; off += h.spacing * 0.22)
      structLayer.line(h.x + off, h.y + h.h, h.x + off + h.h, h.y);
    structLayer.pop();
  }
  randomSeed(SEED + 202); noiseSeed(SEED + 202);
  for (let i = 0; i < sceneConfig.microGlyphCount; i++) {
    let px = random(18, W - 18), py = random(20, H - 20);
    let c = color(random(random() < 0.18 ? PAL_ACCENT : PAL_BASE)); c.setAlpha(random(42, 118));
    structLayer.push(); structLayer.translate(px, py); structLayer.rotate(random(-0.4, 0.4));
    structLayer.stroke(c); structLayer.fill(c);
    let m = floor(random(4));
    if (m === 0) { structLayer.strokeWeight(0.9); structLayer.line(-4, 0, 4, 0); structLayer.line(0, -4, 0, 4); }
    else if (m === 1) { structLayer.noStroke(); structLayer.circle(0, 0, random(1.4, 3.4)); }
    else if (m === 2) { structLayer.noFill(); structLayer.strokeWeight(1); structLayer.rect(0, 0, random(4, 10), random(2, 6), 2); }
    else { structLayer.strokeWeight(0.8); structLayer.line(-4, -2, 4, -2); structLayer.line(-4, 2, 4, 2); }
    structLayer.pop();
  }
  structLayer.pop();
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

function drawTargetGlyph(g, x, y, size, hex, alpha = 92) {
  let c = color(hex); c.setAlpha(alpha);
  g.push(); g.noFill(); g.stroke(c); g.strokeWeight(1);
  g.circle(x, y, size); g.circle(x, y, size * 0.66); g.circle(x, y, size * 0.36);
  g.line(x - size * 0.65, y, x + size * 0.65, y);
  g.line(x, y - size * 0.65, x, y + size * 0.65); g.pop();
}

function drawBracket(g, x, y, w, h) {
  g.push(); g.translate(x, y);
  g.line(-w * 0.5, -h * 0.5, -w * 0.15, -h * 0.5);
  g.line(-w * 0.5, -h * 0.5, -w * 0.5, h * 0.5);
  g.line(w * 0.5, -h * 0.5, w * 0.15, -h * 0.5);
  g.line(w * 0.5, -h * 0.5, w * 0.5, h * 0.5);
  g.line(-w * 0.5, h * 0.5, -w * 0.15, h * 0.5);
  g.line(w * 0.5, h * 0.5, w * 0.15, h * 0.5); g.pop();
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
