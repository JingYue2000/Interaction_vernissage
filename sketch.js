const ARTBOARD = {
  width: 720,
  height: 1020,
};

const BASE_PALETTE = [
  "#c4b5e0",
  "#a8d8ea",
  "#d4c5f9",
  "#e8dff5",
  "#bfe9da",
  "#9b59b6",
  "#61c9a8",
  "#ffffff",
];

const ACCENT_PALETTE = [
  "#00d2ff",
  "#d81159",
  "#f52f57",
  "#61c9a8",
  "#9b59b6",
  "#ffffff",
];

const ACTIVE_ACCENT_PALETTE = [
  "#00d2ff",
  "#d81159",
  "#f52f57",
  "#61c9a8",
  "#9b59b6",
];

const TRACE_PALETTE = [
  "#c4b5e0",
  "#a8d8ea",
  "#d4c5f9",
  "#bfe9da",
  "#9b59b6",
  "#61c9a8",
  "#00d2ff",
  "#d81159",
  "#f52f57",
];

const TRACE_GLOW_PALETTE = [
  "#d4c5f9",
  "#bfe9da",
  "#00d2ff",
  "#d81159",
  "#f52f57",
];

const TRAIL_FADE = 5;
const ATMOSPHERE_FADE = 2;
const PANEL_FADE = 14;
const ATMOSPHERE_PALETTE = [
  "#d2b7f2",
  "#b8c4fb",
  "#9ddcf3",
  "#98d8c0",
  "#d79ce9",
  "#a8d6f4",
];

const SHADER_TUNING = {
  brightness: 0.02,
  contrast: 1.08,
  curve: [0.98, 0.96, 1.02],
  split: 0.0035,
  jitter: 0.0018,
};

const URL_SEED = new URLSearchParams(window.location.search).get("seed");
const SEED = URL_SEED !== null && Number.isFinite(Number(URL_SEED))
  ? Number(URL_SEED)
  : Math.floor(Math.random() * 1000000000);

const FRAG_FUNCTIONS = `
  float rand(vec2 c){
    return fract(sin(dot(c.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec4 permute(vec4 x){
    return mod(((x * 34.0) + 1.0) * x, 289.0);
  }

  vec4 taylorInvSqrt(vec4 r){
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  vec3 fade(vec3 t){
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float cnoise(vec3 P){
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(
      dot(g000, g000),
      dot(g010, g010),
      dot(g100, g100),
      dot(g110, g110)
    ));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;

    vec4 norm1 = taylorInvSqrt(vec4(
      dot(g001, g001),
      dot(g011, g011),
      dot(g101, g101),
      dot(g111, g111)
    ));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(
      vec4(n000, n100, n010, n110),
      vec4(n001, n101, n011, n111),
      fade_xyz.z
    );
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }
`;

const VERT_SRC = `
  precision highp float;

  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aTexCoord;

  varying vec2 vTexCoord;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    vec4 positionVec4 = vec4(aPosition, 1.0);
    gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
    vTexCoord = aTexCoord;
  }
`;

const FRAG_SRC = `
  precision highp float;

  uniform sampler2D uTex;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uBrightness;
  uniform float uContrast;
  uniform vec3 uCurve;
  uniform float uSplit;
  uniform float uJitter;
  uniform float uEnergy;
  uniform vec2 uHeading;

  varying vec2 vTexCoord;

  ${FRAG_FUNCTIONS}

  void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y;

    vec2 heading = uHeading;
    if (length(heading) < 0.0001) {
      heading = vec2(0.0, 1.0);
    }
    heading = normalize(heading);

    float energy = clamp(uEnergy, 0.0, 1.0);
    float wake = cnoise(vec3(uv * vec2(5.0, 11.0) + heading * uTime * 0.45, uTime * 0.2));
    vec2 flowWarp = heading * wake * (0.004 + energy * 0.012);
    vec2 uvBase = clamp(uv + flowWarp, 0.0, 1.0);

    float drift = cnoise(vec3(uvBase * vec2(8.0, 16.0), uTime * 0.22));
    float scan = sin((uv.y * uResolution.y * 0.18) + uTime * 2.0) * 0.5 + 0.5;

    float splitStrength = uSplit * (1.0 + energy * 1.9);
    float jitterStrength = uJitter * (1.0 + energy * 1.4);
    vec2 splitOffset = vec2((drift * 0.65 + (scan - 0.5) * 0.3) * splitStrength, 0.0);
    vec2 jitterOffset = vec2(0.0, (rand(uvBase + fract(uTime * 0.11)) - 0.5) * jitterStrength);

    vec2 uvR = clamp(uvBase + splitOffset + jitterOffset, 0.0, 1.0);
    vec2 uvG = clamp(uvBase + jitterOffset * 0.35, 0.0, 1.0);
    vec2 uvB = clamp(uvBase - splitOffset + jitterOffset, 0.0, 1.0);

    vec3 color;
    color.r = texture2D(uTex, uvR).r;
    color.g = texture2D(uTex, uvG).g;
    color.b = texture2D(uTex, uvB).b;

    color += uBrightness;
    color = ((color - 0.5) * uContrast) + 0.5;
    color = pow(max(color, 0.0), uCurve);
    color += drift * (0.015 + energy * 0.02) * vec3(0.8, 1.0, 1.1);
    color += energy * 0.018 * vec3(0.06, 0.02, 0.09);

    float vignette = smoothstep(0.18, 0.95, length((uv - 0.5) * vec2(0.9, 1.08)));
    color *= mix(1.02, 0.96, vignette);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

let canvasRef;
let backgroundLayer;
let atmosphereLayer;
let zoneLayer;
let structureLayer;
let pulseLayer;
let paintLayer;
let compositeLayer;
let grainLayer;
let shaderLayer;
let posterShader;
let sceneConfig;
let reactiveZones = [];

let moveFreq1 = 30;
let moveFreq2 = 50;
let dragonX = ARTBOARD.width * 0.5;
let dragonY = ARTBOARD.height * 0.5;
let lastDragonX = dragonX;
let lastDragonY = dragonY;
let traceHeading = 0;
let traceSpeed = 0;
let traceTurn = 0;
let traceEnergy = 0;

function setup() {
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  canvasRef = createCanvas(ARTBOARD.width, ARTBOARD.height);
  frameRate(60);
  noSmooth();

  backgroundLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  atmosphereLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  zoneLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  structureLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  pulseLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  paintLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  compositeLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  grainLayer = createGraphics(ARTBOARD.width, ARTBOARD.height);
  shaderLayer = createGraphics(ARTBOARD.width, ARTBOARD.height, WEBGL);
  shaderLayer.noStroke();

  posterShader = shaderLayer.createShader
    ? shaderLayer.createShader(VERT_SRC, FRAG_SRC)
    : new p5.Shader(shaderLayer._renderer, VERT_SRC, FRAG_SRC);

  randomSeed(SEED);
  noiseSeed(SEED);

  sceneConfig = generateSceneConfig();
  reactiveZones = sceneConfig.reactiveZones;
  buildBackgroundLayer();
  buildStructureLayer();
  buildGrainLayer();

  atmosphereLayer.clear();
  zoneLayer.clear();
  pulseLayer.clear();
  paintLayer.clear();
  compositeLayer.clear();

  fitCanvasSize();
  console.info("Dragon Brush seed:", SEED);
}

function draw() {
  updateDragon();
  updateReactiveZones();
  renderZoneLayer();
  fadeLayerAlpha(atmosphereLayer, ATMOSPHERE_FADE);
  fadeLayerAlpha(pulseLayer, PANEL_FADE);
  fadePaintLayer();
  paintAtmosphere();
  paintPanelPulses();
  paintTrail();
  composeFrame();
  renderShader();

  blendMode(BLEND);
  clear();
  image(shaderLayer, 0, 0, width, height);

  push();
  blendMode(MULTIPLY);
  tint(255, 86);
  image(grainLayer, 0, 0, width, height);
  pop();
}

function updateDragon() {
  lastDragonX = dragonX;
  lastDragonY = dragonY;

  const phase = noise(frameCount / 50);
  const targetX = cos(frameCount / moveFreq1 + phase) * ARTBOARD.width * 0.34 + ARTBOARD.width * 0.5;
  const targetY = sin(frameCount / moveFreq2 + phase) * ARTBOARD.height * 0.32 + ARTBOARD.height * 0.5;

  dragonX = lerp(dragonX, targetX, 0.26);
  dragonY = lerp(dragonY, targetY, 0.26);

  const dx = dragonX - lastDragonX;
  const dy = dragonY - lastDragonY;
  const nextHeading = atan2(dy, dx);
  traceSpeed = dist(dragonX, dragonY, lastDragonX, lastDragonY);
  traceTurn = abs(angleDelta(nextHeading, traceHeading));
  traceHeading = nextHeading;

  const speedEnergy = constrain(map(traceSpeed, 0.2, 12, 0.04, 1), 0, 1);
  const turnEnergy = constrain(map(traceTurn, 0.01, 0.3, 0, 1), 0, 1);
  traceEnergy = lerp(traceEnergy, max(speedEnergy * 0.8, speedEnergy * 0.5 + turnEnergy * 0.75), 0.16);
}

function fadePaintLayer() {
  fadeLayerAlpha(paintLayer, TRAIL_FADE);
}

function fadeLayerAlpha(layer, amount) {
  layer.push();
  layer.rectMode(CORNER);
  layer.noStroke();
  layer.drawingContext.save();
  layer.drawingContext.globalCompositeOperation = "destination-out";
  layer.fill(0, 0, 0, amount);
  layer.rect(0, 0, ARTBOARD.width, ARTBOARD.height);
  layer.drawingContext.restore();
  layer.pop();
}

function paintAtmosphere() {
  const normalAngle = traceHeading + HALF_PI;
  const energy = constrain(traceEnergy, 0, 1);
  const wakeLength = map(energy, 0, 1, 120, 280);
  const wakeWidth = map(energy, 0, 1, 72, 180);

  atmosphereLayer.push();
  atmosphereLayer.rectMode(CENTER);
  atmosphereLayer.noStroke();
  atmosphereLayer.blendMode(BLEND);
  atmosphereLayer.drawingContext.filter = "blur(12px)";

  for (let i = 0; i < 5; i++) {
    const trailOffset = i * random(20, 42);
    const lateral = randomGaussian() * wakeWidth * 0.16;
    const px = dragonX - cos(traceHeading) * trailOffset + cos(normalAngle) * lateral;
    const py = dragonY - sin(traceHeading) * trailOffset + sin(normalAngle) * lateral;
    const glow = color(pickPaletteColor(ATMOSPHERE_PALETTE, frameCount * 0.018 + i * 0.37 + traceEnergy * 3));
    glow.setAlpha(random(6, 12) + energy * 10);
    atmosphereLayer.fill(glow);
    atmosphereLayer.ellipse(
      px,
      py,
      wakeLength * random(0.5, 1.05),
      wakeWidth * random(0.35, 0.85)
    );
  }

  const ribbon = color(pickPaletteColor(ATMOSPHERE_PALETTE, frameCount * 0.013 + 12 + traceHeading * 0.3));
  ribbon.setAlpha(8 + energy * 12);
  atmosphereLayer.fill(ribbon);
  atmosphereLayer.translate(dragonX - cos(traceHeading) * wakeLength * 0.18, dragonY - sin(traceHeading) * wakeLength * 0.18);
  atmosphereLayer.rotate(traceHeading + random(-0.16, 0.16));
  atmosphereLayer.rect(0, 0, wakeLength * 1.25, wakeWidth * 0.22, wakeWidth * 0.16);

  atmosphereLayer.drawingContext.filter = "blur(0px)";
  atmosphereLayer.blendMode(BLEND);
  atmosphereLayer.pop();

  if (traceEnergy > 0.24) {
    atmosphereLayer.push();
    atmosphereLayer.blendMode(BLEND);
    atmosphereLayer.strokeWeight(map(traceEnergy, 0, 1, 0.45, 0.9));
    const streak = color(pickPaletteColor(ACTIVE_ACCENT_PALETTE, frameCount * 0.022 + 28 + traceHeading * 0.6));
    streak.setAlpha(12 + traceEnergy * 18);
    atmosphereLayer.stroke(streak);
    const reach = map(traceEnergy, 0, 1, 60, 180);
    atmosphereLayer.line(
      dragonX - cos(traceHeading) * reach,
      dragonY - sin(traceHeading) * reach,
      dragonX + cos(traceHeading) * reach * 0.8,
      dragonY + sin(traceHeading) * reach * 0.8
    );
    atmosphereLayer.pop();
  }
}

function paintPanelPulses() {
  pulseLayer.push();
  pulseLayer.blendMode(SCREEN);
  pulseLayer.rectMode(CENTER);
  pulseLayer.strokeCap(SQUARE);
  pulseLayer.strokeJoin(ROUND);

  for (const zone of reactiveZones) {
    const influence = zoneInfluence(dragonX, dragonY, zone.center[0], zone.center[1], zone.radius[0], zone.radius[1]);
    const strength = constrain(influence * (0.28 + traceEnergy * 1.05) + traceTurn * 0.45, 0, 1);

    if (strength > 0.015) {
      drawReactiveZone(zone, strength);
    }
  }

  pulseLayer.blendMode(BLEND);
  pulseLayer.pop();
}

function updateReactiveZones() {
  for (const zone of reactiveZones) {
    const influence = zoneInfluence(dragonX, dragonY, zone.center[0], zone.center[1], zone.radius[0], zone.radius[1]);
    const strength = constrain(influence * (0.28 + traceEnergy * 1.05) + traceTurn * 0.45, 0, 1);
    const fractureHit = smoothstep(0.14, 0.86, strength);

    zone.currentStrength = strength;
    zone.glowLevel = max(zone.glowLevel || 0, strength);
    zone.fractureLevel = max(zone.fractureLevel || 0, fractureHit);

    if (!zone.shards) {
      continue;
    }

    for (const shard of zone.shards) {
      const hitDistance = dist(dragonX, dragonY, shard.centroid.x, shard.centroid.y);
      const localRadius = max(zone.radius[0], zone.radius[1]) * 0.98;
      const hitFactor = constrain(1 - hitDistance / localRadius, 0, 1);
      const localActivation = fractureHit * 0.72 + hitFactor * 0.82 - shard.threshold;
      shard.activation = max(shard.activation || 0, localActivation);
    }
  }
}

function renderZoneLayer() {
  zoneLayer.clear();
  zoneLayer.push();
  zoneLayer.strokeJoin(ROUND);
  zoneLayer.strokeCap(SQUARE);

  for (const panel of sceneConfig.panels) {
    drawZoneBase(zoneLayer, panel);
  }

  for (const target of sceneConfig.targets) {
    drawZoneBase(zoneLayer, target);
  }

  zoneLayer.pop();
}

function drawReactiveZone(zone, strength) {
  const fillTone = safeColor(zone.tint, "#d8ccff");
  fillTone.setAlpha(12 + strength * 30);
  const strokeTone = safeColor(zone.tint, "#d8ccff");
  strokeTone.setAlpha(8 + strength * 18);

  pulseLayer.push();
  pulseLayer.noStroke();
  pulseLayer.fill(fillTone);

  if (zone.kind === "poly") {
    drawPolygonShape(pulseLayer, zone.points);
    pulseLayer.noFill();
    pulseLayer.stroke(strokeTone);
    pulseLayer.strokeWeight(0.8 + strength * 1.1);
    drawPolygonShape(pulseLayer, zone.points);
  } else if (zone.kind === "rect") {
    pulseLayer.rectMode(CORNER);
    pulseLayer.rect(zone.x, zone.y, zone.w, zone.h, zone.r);
    pulseLayer.noFill();
    pulseLayer.stroke(strokeTone);
    pulseLayer.strokeWeight(0.9 + strength * 1.2);
    pulseLayer.rect(zone.x, zone.y, zone.w, zone.h, zone.r);
  } else if (zone.kind === "target") {
    pulseLayer.noFill();
    pulseLayer.stroke(strokeTone);
    pulseLayer.strokeWeight(0.6 + strength * 0.8);
    drawTarget(pulseLayer, zone.x, zone.y, zone.size + strength * 8, zone.tint, 14 + strength * 38);
  }

  pulseLayer.pop();
}

function drawZoneShards(g, zone, fracture) {
  const baseTone = safeColor(zone.baseColor || zone.fill || zone.color || zone.tint, "#d8ccff");
  for (const shard of zone.shards) {
    const activation = min(1, (shard.activation || 0) * 0.9 + fracture * 0.25);

    if (activation <= 0) {
      continue;
    }

    const offset = activation * 22 * shard.depth;
    const shardTone = lerpColor(baseTone, safeColor(zone.tint, zone.baseColor), 0.18 + activation * 0.12);
    shardTone.setAlpha(60 + activation * 110);
    const shardStroke = lerpColor(baseTone, safeColor(zone.tint, zone.baseColor), 0.48);
    shardStroke.setAlpha(22 + activation * 42);

    g.push();
    g.translate(shard.dir.x * offset, shard.dir.y * offset);
    g.noStroke();
    g.fill(shardTone);
    drawPolygonShape(g, shard.points);
    g.noFill();
    g.stroke(shardStroke);
    g.strokeWeight(0.35 + activation * 0.9);
    drawPolygonShape(g, shard.points);
    g.pop();
  }
}

function zoneInfluence(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const distance = sqrt(dx * dx + dy * dy);
  return constrain(1 - distance, 0, 1);
}

function paintTrail() {
  const angle = atan2(dragonY - lastDragonY, dragonX - lastDragonX);
  const normalAngle = angle + HALF_PI;
  const brushSize = map(sin(frameCount / 11), -1, 1, 34, 92);
  const markCount = floor(random(14, 24));

  paintLayer.push();
  paintLayer.rectMode(CENTER);
  paintLayer.strokeCap(SQUARE);
  paintLayer.strokeJoin(ROUND);
  paintLayer.drawingContext.shadowColor = "rgba(196,181,224,0.04)";
  paintLayer.drawingContext.shadowBlur = 3;

  for (let i = 0; i < markCount; i++) {
    const lateral = randomGaussian() * brushSize * 0.36;
    const forward = random(-brushSize * 0.35, brushSize * 0.35);
    const px = dragonX + cos(normalAngle) * lateral + cos(angle) * forward;
    const py = dragonY + sin(normalAngle) * lateral + sin(angle) * forward;
    const localRotation = angle + random(-0.85, 0.85);
    const pick = random();
    const useAccent = random() < 0.38;
    const tone = color(random(useAccent ? ACTIVE_ACCENT_PALETTE : TRACE_PALETTE));
    tone.setAlpha(random(118, 228));
    const glowTone = color(random(TRACE_GLOW_PALETTE));
    glowTone.setAlpha(18);

    paintLayer.push();
    paintLayer.translate(px, py);
    paintLayer.rotate(localRotation);
    paintLayer.drawingContext.shadowColor = glowTone.toString();

    if (pick < 0.35) {
      const w = random(8, 30);
      const h = random(4, 14);
      paintLayer.noStroke();
      paintLayer.fill(tone);
      paintLayer.rect(0, 0, w, h, h * 0.9);
    } else if (pick < 0.58) {
      paintLayer.noFill();
      paintLayer.stroke(tone);
      paintLayer.strokeWeight(random(1.1, 2.6));
      const len = random(16, 44);
      paintLayer.line(-len * 0.5, 0, len * 0.5, 0);
      if (random() < 0.35) {
        paintLayer.strokeWeight(1);
        paintLayer.line(len * 0.18, -5, len * 0.18, 5);
      }
    } else if (pick < 0.8) {
      paintLayer.noStroke();
      paintLayer.fill(tone);
      paintLayer.circle(0, 0, random(4, 12));
      if (random() < 0.12) {
        const dotTone = color(random(TRACE_GLOW_PALETTE));
        dotTone.setAlpha(22);
        paintLayer.fill(dotTone);
        paintLayer.circle(random(-10, 10), random(-10, 10), random(1.4, 2.8));
      }
    } else {
      paintLayer.noFill();
      paintLayer.stroke(tone);
      paintLayer.strokeWeight(random(1, 2));
      const bw = random(14, 28);
      const bh = random(12, 24);
      drawBracketGlyph(paintLayer, 0, 0, bw, bh);
    }

    paintLayer.pop();
  }

  paintLayer.pop();
}

function composeFrame() {
  compositeLayer.push();
  compositeLayer.clear();
  compositeLayer.image(backgroundLayer, 0, 0);

  compositeLayer.blendMode(BLEND);
  compositeLayer.drawingContext.globalAlpha = 0.9;
  compositeLayer.image(atmosphereLayer, 0, 0);

  compositeLayer.blendMode(SCREEN);
  compositeLayer.drawingContext.globalAlpha = 0.1;
  compositeLayer.drawingContext.filter = "blur(18px)";
  compositeLayer.image(atmosphereLayer, 0, 0);

  compositeLayer.drawingContext.filter = "blur(0px)";
  compositeLayer.blendMode(BLEND);
  compositeLayer.drawingContext.globalAlpha = 1;
  compositeLayer.image(zoneLayer, 0, 0);
  compositeLayer.drawingContext.globalAlpha = 1;
  compositeLayer.image(structureLayer, 0, 0);

  compositeLayer.blendMode(SCREEN);
  compositeLayer.drawingContext.globalAlpha = 0.7;
  compositeLayer.image(pulseLayer, 0, 0);

  compositeLayer.blendMode(BLEND);
  compositeLayer.drawingContext.globalAlpha = 1;
  compositeLayer.image(paintLayer, 0, 0);

  compositeLayer.blendMode(SCREEN);
  compositeLayer.drawingContext.globalAlpha = 0.12;
  compositeLayer.drawingContext.filter = "blur(6px)";
  compositeLayer.image(paintLayer, 0, 0);

  compositeLayer.drawingContext.filter = "blur(0px)";
  compositeLayer.blendMode(MULTIPLY);
  compositeLayer.drawingContext.globalAlpha = 0.34;
  compositeLayer.image(structureLayer, 0, 0);
  compositeLayer.drawingContext.globalAlpha = 0.36;
  compositeLayer.image(paintLayer, 0, 0);

  compositeLayer.blendMode(SCREEN);
  compositeLayer.drawingContext.globalAlpha = 0.56;
  compositeLayer.image(paintLayer, 0, 0);

  compositeLayer.blendMode(BLEND);
  compositeLayer.drawingContext.filter = "blur(0px)";
  compositeLayer.drawingContext.globalAlpha = 1;
  compositeLayer.pop();
}

function renderShader() {
  shaderLayer.shader(posterShader);
  posterShader.setUniform("uTex", compositeLayer);
  posterShader.setUniform("uResolution", [ARTBOARD.width, ARTBOARD.height]);
  posterShader.setUniform("uTime", millis() * 0.001);
  posterShader.setUniform("uBrightness", SHADER_TUNING.brightness);
  posterShader.setUniform("uContrast", SHADER_TUNING.contrast);
  posterShader.setUniform("uCurve", SHADER_TUNING.curve);
  posterShader.setUniform("uSplit", SHADER_TUNING.split);
  posterShader.setUniform("uJitter", SHADER_TUNING.jitter);
  posterShader.setUniform("uEnergy", traceEnergy);
  posterShader.setUniform("uHeading", [cos(traceHeading), sin(traceHeading)]);

  shaderLayer.clear();
  shaderLayer.push();
  shaderLayer.rect(-ARTBOARD.width * 0.5, -ARTBOARD.height * 0.5, ARTBOARD.width, ARTBOARD.height);
  shaderLayer.pop();
}

function generateSceneConfig() {
  randomSeed(SEED + 17);
  noiseSeed(SEED + 17);

  const config = {
    gradient: {
      top: random(["#e1d5f7", "#e8ddff", "#ddd1f6", "#ece0ff"]),
      mid: random(["#cbb8ee", "#c7b2f1", "#d3c0f3", "#c6b6ea"]),
      bottom: random(["#c7e4f5", "#c9ebfb", "#bee3f2", "#d2effc"]),
    },
    hazes: [],
    bands: [],
    panels: [],
    outlines: [],
    guides: [],
    targets: [],
    brackets: [],
    hatches: [],
    reactiveZones: [],
    microGlyphCount: floor(random(96, 162)),
  };

  for (let i = 0; i < 4; i++) {
    config.hazes.push({
      x: random(0.08, 0.92) * ARTBOARD.width,
      y: random(0.1, 0.9) * ARTBOARD.height,
      w: random(280, 760),
      h: random(180, 860),
      color: random(["#efe4ff", "#d6d0ff", "#caebff", "#c8f1e3", "#dbcaff"]),
      alpha: random(28, 94),
    });
  }

  const bandCount = floor(random(2, 4));
  for (let i = 0; i < bandCount; i++) {
    config.bands.push({
      x: random(-40, 120),
      y: random(0.18, 0.94) * ARTBOARD.height,
      w: random(0.42, 1.04) * ARTBOARD.width,
      h: random(8, 22),
      color: random(["#d8c9ff", "#cfe7ff", "#ffffff", "#f0d2ff"]),
      alpha: random(18, 36),
    });
  }

  const lowerPanel = createPolyPanel(
    "lowerFan",
    [
      [0, random(0.47, 0.58)],
      [random(0.54, 0.66), random(0.31, 0.39)],
      [random(0.57, 0.69), 1],
      [0, 1],
    ],
    random(["#cbbff0", "#c5b2ff", "#bda6ef"]),
    random(108, 142),
    random(["#bc94ff", "#d58fff", "#9eeaff"]),
    {
      x1: random(0.04, 0.14) * ARTBOARD.width,
      y1: random(0.58, 0.7) * ARTBOARD.height,
      x2: random(0.82, 0.94) * ARTBOARD.width,
      y2: random(0.16, 0.26) * ARTBOARD.height,
    }
  );
  config.panels.push(lowerPanel);
  config.guides.push(lowerPanel.guide);
  config.reactiveZones.push(lowerPanel);

  const topSlice = createPolyPanel(
    "topSlice",
    [
      [random(0.4, 0.54), random(0.12, 0.2)],
      [1, random(0.08, 0.16)],
      [1, random(0.38, 0.48)],
      [random(0.55, 0.67), random(0.37, 0.47)],
    ],
    random(["#e3daf9", "#e7ddff", "#dcd4fb"]),
    random(92, 122),
    random(["#d6c8ff", "#dbe7ff", "#a6e8ff"]),
    {
      x1: random(0.78, 0.96) * ARTBOARD.width,
      y1: 0,
      x2: random(0.18, 0.34) * ARTBOARD.width,
      y2: random(0.34, 0.46) * ARTBOARD.height,
    }
  );
  config.panels.push(topSlice);
  config.guides.push(topSlice.guide);
  config.reactiveZones.push(topSlice);

  const coreX = random(0.22, 0.34) * ARTBOARD.width;
  const coreY = random(0.22, 0.3) * ARTBOARD.height;
  const coreW = random(210, 272);
  const coreH = random(370, 520);
  const coreR = random(14, 22);
  const corePanel = createRectPanel(
    "corePanel",
    coreX,
    coreY,
    coreW,
    coreH,
    coreR,
    random(["#ab96ef", "#b392f2", "#a88de8"]),
    random(92, 118),
    random(["#d86cff", "#ff8df0", "#a9d7ff"]),
    {
      x: coreX + random(-10, 18),
      y: coreY + random(36, 112),
      w: min(coreW - random(6, 24), random(180, 260)),
      h: random(10, 24),
      color: random(["#ff8df0", "#d562e4", "#9eeaff"]),
      spacing: random(22, 34),
    }
  );
  config.panels.push(corePanel);
  config.hatches.push(corePanel.hatch);
  config.reactiveZones.push(corePanel);

  const leftWing = createPolyPanel(
    "leftWing",
    [
      [random(0.01, 0.08), random(0.08, 0.15)],
      [random(0.32, 0.43), random(0.06, 0.12)],
      [random(0.17, 0.29), random(0.35, 0.46)],
      [random(-0.01, 0.04), random(0.33, 0.43)],
    ],
    random(["#ede4fb", "#f0e9ff", "#e0dcff"]),
    random(44, 72),
    random(["#dbe7ff", "#cfe0ff", "#c0f7ff"]),
    {
      x1: random(0.12, 0.22) * ARTBOARD.width,
      y1: random(0.01, 0.05) * ARTBOARD.height,
      x2: random(0.38, 0.49) * ARTBOARD.width,
      y2: random(0.18, 0.28) * ARTBOARD.height,
    }
  );
  config.panels.push(leftWing);
  config.guides.push(leftWing.guide);
  config.reactiveZones.push(leftWing);

  if (random() < 0.78) {
    const floatPanel = createRectPanel(
      "floatPanel",
      random(0.5, 0.72) * ARTBOARD.width,
      random(0.58, 0.82) * ARTBOARD.height,
      random(88, 168),
      random(42, 96),
      random(12, 20),
      random(["#eef3ff", "#ece2ff", "#dff7ff"]),
      random(34, 58),
      random(["#d9e7ff", "#b7ebff", "#eec7ff"])
    );
    config.panels.push(floatPanel);
  }

  const outlineCount = floor(random(5, 8));
  for (let i = 0; i < outlineCount; i++) {
    const anchor = random(config.panels);
    const w = random(88, 158);
    const h = random(38, 118);
    config.outlines.push({
      x: constrain(anchor.center[0] + random(-anchor.radius[0], anchor.radius[0]) - w * 0.5, 16, ARTBOARD.width - w - 16),
      y: constrain(anchor.center[1] + random(-anchor.radius[1], anchor.radius[1]) - h * 0.5, 16, ARTBOARD.height - h - 16),
      w,
      h,
      r: random(10, 18),
      color: random(["#7e6dc2", "#ffffff", "#d974ff", "#b7ebff"]),
      weight: random(1, 1.9),
      alpha: random(78, 154),
    });
  }

  const guideCount = floor(random(6, 9));
  for (let i = 0; i < guideCount; i++) {
    const start = randomEdgePoint();
    const end = randomEdgePoint();
    config.guides.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      color: random(["#8978e1", "#ffffff", "#61c9a8", "#d98dff"]),
      alpha: random(52, 108),
      weight: random(0.7, 1.35),
    });
  }

  const targetCount = floor(random(3, 5));
  for (let i = 0; i < targetCount; i++) {
    const anchor = random(config.panels);
    const size = random(14, 58);
    const x = constrain(anchor.center[0] + random(-anchor.radius[0] * 0.65, anchor.radius[0] * 0.65), 36, ARTBOARD.width - 36);
    const y = constrain(anchor.center[1] + random(-anchor.radius[1] * 0.65, anchor.radius[1] * 0.65), 36, ARTBOARD.height - 36);
    const target = {
      kind: "target",
      x,
      y,
      size,
      color: random(["#dbb0ff", "#c3b4ff", "#61c9a8", "#9eeaff"]),
      alpha: random(88, 132),
      tint: random(["#9eeaff", "#dba4ff", "#c8f0ff", "#61c9a8"]),
      center: [x, y],
      radius: [size * 1.45, size * 1.45],
    };
    config.targets.push(createTargetZone(target));
    if (i < 3) {
      config.reactiveZones.push(config.targets[config.targets.length - 1]);
    }
  }

  const bracketCount = floor(random(3, 6));
  for (let i = 0; i < bracketCount; i++) {
    config.brackets.push({
      x: random(0.07, 0.92) * ARTBOARD.width,
      y: random(0.08, 0.92) * ARTBOARD.height,
      w: random(14, 26),
      h: random(11, 20),
      color: random(["#ffffff", "#d8ccff", "#baf4ff"]),
      alpha: random(70, 130),
    });
  }

  const hatchCount = floor(random(1, 3));
  for (let i = 0; i < hatchCount; i++) {
    config.hatches.push({
      x: random(0.08, 0.58) * ARTBOARD.width,
      y: random(0.16, 0.92) * ARTBOARD.height,
      w: random(120, 260),
      h: random(8, 20),
      color: random(["#ec6fd9", "#d562e4", "#9eeaff", "#ffffff"]),
      weight: random(0.95, 1.25),
      spacing: random(18, 30),
    });
  }

  return config;
}

function createPolyPanel(id, points, fill, alphaValue, tint, guide) {
  const absPoints = points.map((point) => ({
    x: point[0] * ARTBOARD.width,
    y: point[1] * ARTBOARD.height,
  }));
  const xs = absPoints.map((point) => point.x);
  const ys = absPoints.map((point) => point.y);
  const zone = {
    id,
    kind: "poly",
    points: absPoints,
    fill,
    baseColor: fill,
    alpha: alphaValue,
    tint,
    guide: guide
      ? {
          x1: guide.x1,
          y1: guide.y1,
          x2: guide.x2,
          y2: guide.y2,
          color: guide.color || random(["#8978e1", "#ffffff", "#61c9a8", "#d98dff"]),
          alpha: guide.alpha || random(40, 92),
          weight: guide.weight || random(0.7, 1.35),
        }
      : null,
    center: [(Math.min(...xs) + Math.max(...xs)) * 0.5, (Math.min(...ys) + Math.max(...ys)) * 0.5],
    radius: [
      Math.max((Math.max(...xs) - Math.min(...xs)) * 0.62, 96),
      Math.max((Math.max(...ys) - Math.min(...ys)) * 0.62, 86),
    ],
  };
  zone.shards = buildZoneShards(zone);
  return zone;
}

function createRectPanel(id, x, y, w, h, r, fill, alphaValue, tint, hatch = null) {
  const zone = {
    id,
    kind: "rect",
    x,
    y,
    w,
    h,
    r,
    fill,
    baseColor: fill,
    alpha: alphaValue,
    tint,
    hatch,
    center: [x + w * 0.5, y + h * 0.5],
    radius: [Math.max(w * 0.6, 82), Math.max(h * 0.52, 72)],
  };
  zone.shards = buildZoneShards(zone);
  return zone;
}

function createTargetZone(target) {
  const zone = {
    ...target,
    baseColor: target.color,
  };
  zone.shards = buildZoneShards(zone);
  return zone;
}

function randomEdgePoint() {
  const edge = floor(random(4));
  if (edge === 0) {
    return { x: random(ARTBOARD.width), y: 0 };
  }
  if (edge === 1) {
    return { x: ARTBOARD.width, y: random(ARTBOARD.height) };
  }
  if (edge === 2) {
    return { x: random(ARTBOARD.width), y: ARTBOARD.height };
  }
  return { x: 0, y: random(ARTBOARD.height) };
}

function buildZoneShards(zone) {
  const perimeter = getZonePerimeterSamples(zone);
  if (perimeter.length < 3) {
    return [];
  }

  const center = { x: zone.center[0], y: zone.center[1] };
  const shards = [];

  for (let i = 0; i < perimeter.length; i++) {
    const p1 = perimeter[i];
    const p2 = perimeter[(i + 1) % perimeter.length];
    const inner1 = lerpPoint(center, p1, random(0.16, 0.36));
    const inner2 = lerpPoint(center, p2, random(0.16, 0.36));
    const points = [inner1, p1, p2, inner2];
    const centroid = averagePoints(points);
    const dx = centroid.x - center.x;
    const dy = centroid.y - center.y;
    const magnitude = max(1, sqrt(dx * dx + dy * dy));

    shards.push({
      points,
      centroid,
      dir: { x: dx / magnitude, y: dy / magnitude },
      depth: random(0.4, 1),
      threshold: i / perimeter.length + random(-0.08, 0.1),
      tint: random(TRACE_GLOW_PALETTE),
    });
  }

  return shards.sort((a, b) => a.threshold - b.threshold);
}

function getZonePerimeterSamples(zone) {
  if (zone.kind === "poly") {
    return sampleClosedShape(zone.points, 3);
  }
  if (zone.kind === "rect") {
    return sampleClosedShape(
      [
        { x: zone.x, y: zone.y },
        { x: zone.x + zone.w, y: zone.y },
        { x: zone.x + zone.w, y: zone.y + zone.h },
        { x: zone.x, y: zone.y + zone.h },
      ],
      3
    );
  }
  if (zone.kind === "target") {
    const points = [];
    const count = 12;
    const radius = zone.size * 0.58;
    for (let i = 0; i < count; i++) {
      const ang = TWO_PI * (i / count);
      points.push({
        x: zone.x + cos(ang) * radius,
        y: zone.y + sin(ang) * radius,
      });
    }
    return points;
  }
  return [];
}

function sampleClosedShape(points, subdivisions) {
  const samples = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions;
      samples.push(lerpPoint(current, next, t));
    }
  }
  return samples;
}

function lerpPoint(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

function averagePoints(points) {
  let totalX = 0;
  let totalY = 0;
  for (const point of points) {
    totalX += point.x;
    totalY += point.y;
  }
  return {
    x: totalX / points.length,
    y: totalY / points.length,
  };
}

function buildBackgroundLayer() {
  const topColor = safeColor(sceneConfig.gradient.top, "#e1d5f7");
  const midColor = safeColor(sceneConfig.gradient.mid, "#cbb8ee");
  const bottomColor = safeColor(sceneConfig.gradient.bottom, "#c7e4f5");

  backgroundLayer.push();
  backgroundLayer.clear();
  backgroundLayer.noFill();

  for (let y = 0; y < ARTBOARD.height; y++) {
    const t = y / (ARTBOARD.height - 1);
    const gradientColor = lerpColor(
      lerpColor(topColor, midColor, min(t * 1.25, 1)),
      bottomColor,
      smoothstep(0.25, 1, t)
    );
    backgroundLayer.stroke(gradientColor);
    backgroundLayer.line(0, y, ARTBOARD.width, y);
  }

  backgroundLayer.noStroke();
  for (const haze of sceneConfig.hazes) {
    const hazeColor = safeColor(haze.color, "#efe4ff");
    hazeColor.setAlpha(haze.alpha);
    backgroundLayer.fill(hazeColor);
    backgroundLayer.ellipse(haze.x, haze.y, haze.w, haze.h);
  }

  for (const band of sceneConfig.bands) {
    const bandColor = safeColor(band.color, "#ffffff");
    bandColor.setAlpha(band.alpha);
    backgroundLayer.fill(bandColor);
    backgroundLayer.rect(band.x, band.y, band.w, band.h, band.h * 0.5);
  }

  backgroundLayer.pop();
}

function buildStructureLayer() {
  structureLayer.clear();
  structureLayer.push();
  structureLayer.noFill();
  structureLayer.strokeJoin(ROUND);
  structureLayer.strokeCap(SQUARE);

  for (const outline of sceneConfig.outlines) {
    drawOutlineRect(
      structureLayer,
      outline.x,
      outline.y,
      outline.w,
      outline.h,
      outline.color,
      outline.weight,
      outline.alpha,
      outline.r
    );
  }

  for (const guide of sceneConfig.guides) {
    drawGuideLine(structureLayer, guide);
  }

  for (const bracket of sceneConfig.brackets) {
    const bracketColor = safeColor(bracket.color, "#ffffff");
    bracketColor.setAlpha(bracket.alpha);
    structureLayer.stroke(bracketColor);
    structureLayer.strokeWeight(1.05);
    drawBracketGlyph(structureLayer, bracket.x, bracket.y, bracket.w, bracket.h);
  }

  for (const hatch of sceneConfig.hatches) {
    drawHatchStrip(structureLayer, hatch.x, hatch.y, hatch.w, hatch.h, hatch.color, hatch.weight, hatch.spacing);
  }

  randomSeed(SEED + 202);
  noiseSeed(SEED + 202);
  scatterMicroGlyphs(sceneConfig.microGlyphCount);
  structureLayer.pop();
}

function buildGrainLayer() {
  randomSeed(SEED + 777);
  noiseSeed(SEED + 777);

  grainLayer.clear();
  grainLayer.push();
  grainLayer.strokeCap(SQUARE);

  for (let i = 0; i < 9000; i++) {
    const px = random(ARTBOARD.width);
    const py = random(ARTBOARD.height);
    const shade = random(180, 245);
    grainLayer.stroke(shade, shade, shade, random(10, 26));
    grainLayer.point(px, py);
  }

  for (let i = 0; i < 420; i++) {
    const px = random(ARTBOARD.width);
    const py = random(ARTBOARD.height);
    const len = random(3, 13);
    const angle = random(TWO_PI);
    grainLayer.stroke(170, 170, 170, random(12, 30));
    grainLayer.strokeWeight(random(0.4, 1));
    grainLayer.line(px, py, px + cos(angle) * len, py + sin(angle) * len);
  }

  grainLayer.pop();
}

function drawZoneBase(g, zone) {
  const fracture = zone.fractureLevel || 0;
  const fillHex = zone.baseColor || zone.fill || zone.color || zone.tint;
  const edgeHex = zone.tint || fillHex;
  const intactAlpha = (zone.alpha || 88) * max(0, 1 - fracture * 1.25);

  if (intactAlpha > 6) {
    const fillTone = safeColor(fillHex, "#d8ccff");
    fillTone.setAlpha(intactAlpha);
    g.push();
    g.noStroke();
    g.fill(fillTone);
    if (zone.kind === "poly") {
      drawPolygonShape(g, zone.points);
    } else if (zone.kind === "rect") {
      g.rectMode(CORNER);
      g.rect(zone.x, zone.y, zone.w, zone.h, zone.r);
    } else if (zone.kind === "target") {
      const targetFill = safeColor(fillHex, "#d8ccff");
      targetFill.setAlpha(max(0, intactAlpha * 0.18));
      g.fill(targetFill);
      g.circle(zone.x, zone.y, zone.size * 0.92);
      g.noFill();
      drawTarget(g, zone.x, zone.y, zone.size, edgeHex, intactAlpha);
    }
    g.pop();
  }

  if (zone.kind !== "target") {
    const edgeTone = safeColor(edgeHex, fillHex);
    edgeTone.setAlpha(max(14, intactAlpha * 0.42));
    g.push();
    g.noFill();
    g.stroke(edgeTone);
    g.strokeWeight(0.7);
    if (zone.kind === "poly") {
      drawPolygonShape(g, zone.points);
    } else if (zone.kind === "rect") {
      g.rectMode(CORNER);
      g.rect(zone.x, zone.y, zone.w, zone.h, zone.r);
    }
    g.pop();
  }

  if (fracture > 0.02 && zone.shards && zone.shards.length > 0) {
    drawZoneShards(g, zone, fracture);
  }
}

function scatterMicroGlyphs(count) {
  for (let i = 0; i < count; i++) {
    const px = random(18, ARTBOARD.width - 18);
    const py = random(20, ARTBOARD.height - 20);
    const accent = random() < 0.18;
    const glyphColor = safeColor(random(accent ? ACCENT_PALETTE : BASE_PALETTE), "#ffffff");
    glyphColor.setAlpha(random(42, 118));

    structureLayer.push();
    structureLayer.translate(px, py);
    structureLayer.rotate(random(-0.4, 0.4));
    structureLayer.stroke(glyphColor);
    structureLayer.fill(glyphColor);

    const mode = floor(random(4));
    if (mode === 0) {
      structureLayer.strokeWeight(0.9);
      structureLayer.line(-4, 0, 4, 0);
      structureLayer.line(0, -4, 0, 4);
    } else if (mode === 1) {
      structureLayer.noStroke();
      structureLayer.circle(0, 0, random(1.4, 3.4));
    } else if (mode === 2) {
      structureLayer.noFill();
      structureLayer.strokeWeight(1);
      structureLayer.rect(0, 0, random(4, 10), random(2, 6), 2);
    } else {
      structureLayer.strokeWeight(0.8);
      structureLayer.line(-4, -2, 4, -2);
      structureLayer.line(-4, 2, 4, 2);
    }

    structureLayer.pop();
  }
}

function drawScenePanel(g, panel) {
  const fillTone = safeColor(panel.fill, "#d8ccff");
  fillTone.setAlpha(min(255, panel.alpha * 1.08));
  g.push();
  g.noStroke();
  g.fill(fillTone);
  if (panel.kind === "poly") {
    drawPolygonShape(g, panel.points);
  } else if (panel.kind === "rect") {
    g.rectMode(CORNER);
    g.rect(panel.x, panel.y, panel.w, panel.h, panel.r);
  }
  g.pop();
}

function drawGuideLine(g, guide) {
  const tone = safeColor(guide.color, "#ffffff");
  tone.setAlpha(min(255, guide.alpha * 1.08));
  g.push();
  g.noFill();
  g.stroke(tone);
  g.strokeWeight(guide.weight);
  g.line(guide.x1, guide.y1, guide.x2, guide.y2);
  g.pop();
}

function drawPolygonShape(g, points) {
  g.beginShape();
  for (const point of points) {
    g.vertex(point.x, point.y);
  }
  g.endShape(CLOSE);
}

function drawOutlineRect(g, x, y, w, h, hex, weight, alphaValue, radius) {
  const strokeTone = safeColor(hex, "#ffffff");
  strokeTone.setAlpha(alphaValue);
  g.push();
  g.noFill();
  g.stroke(strokeTone);
  g.strokeWeight(weight);
  g.rect(x, y, w, h, radius);
  g.pop();
}

function drawTarget(g, x, y, size, hex, alphaValue = 92) {
  const tone = safeColor(hex, "#ffffff");
  tone.setAlpha(alphaValue);
  g.push();
  g.noFill();
  g.stroke(tone);
  g.strokeWeight(1);
  g.circle(x, y, size);
  g.circle(x, y, size * 0.66);
  g.circle(x, y, size * 0.36);
  g.line(x - size * 0.65, y, x + size * 0.65, y);
  g.line(x, y - size * 0.65, x, y + size * 0.65);
  g.pop();
}

function drawHatchStrip(g, x, y, w, h, hex, alphaValue, spacing) {
  const tone = safeColor(hex, "#ffffff");
  tone.setAlpha(90);
  g.push();
  g.noFill();
  g.stroke(tone);
  g.strokeWeight(alphaValue);
  for (let offset = -h; offset < w + h; offset += spacing * 0.22) {
    g.line(x + offset, y + h, x + offset + h, y);
  }
  g.pop();
}

function drawBracketGlyph(g, x, y, w, h) {
  g.push();
  g.translate(x, y);
  g.line(-w * 0.5, -h * 0.5, -w * 0.15, -h * 0.5);
  g.line(-w * 0.5, -h * 0.5, -w * 0.5, h * 0.5);
  g.line(w * 0.5, -h * 0.5, w * 0.15, -h * 0.5);
  g.line(w * 0.5, -h * 0.5, w * 0.5, h * 0.5);
  g.line(-w * 0.5, h * 0.5, -w * 0.15, h * 0.5);
  g.line(w * 0.5, h * 0.5, w * 0.15, h * 0.5);
  g.pop();
}

function fitCanvasSize() {
  const windowRatio = window.innerWidth / window.innerHeight;
  const artRatio = ARTBOARD.width / ARTBOARD.height;

  if (windowRatio > artRatio) {
    const fittedHeight = window.innerHeight;
    const fittedWidth = fittedHeight * artRatio;
    canvasRef.elt.style.width = fittedWidth + "px";
    canvasRef.elt.style.height = fittedHeight + "px";
  } else {
    const fittedWidth = window.innerWidth;
    const fittedHeight = fittedWidth / artRatio;
    canvasRef.elt.style.width = fittedWidth + "px";
    canvasRef.elt.style.height = fittedHeight + "px";
  }
}

function windowResized() {
  fitCanvasSize();
}

function keyPressed() {
  if (key === " ") {
    saveCanvas(canvasRef.elt, "dragon-brush-pastel-hud", "jpg");
    return false;
  }
  return true;
}

function safeColor(value, fallback = "#ffffff") {
  if (typeof value === "string" || typeof value === "number" || Array.isArray(value)) {
    return color(value);
  }
  if (value && typeof value === "object" && Array.isArray(value.levels)) {
    return color(value.levels[0], value.levels[1], value.levels[2], value.levels[3]);
  }
  return color(fallback);
}

function pickPaletteColor(palette, seed) {
  const index = min(palette.length - 1, floor(noise(seed) * palette.length));
  return palette[index];
}

function angleDelta(a, b) {
  return atan2(sin(a - b), cos(a - b));
}

function smoothstep(edge0, edge1, x) {
  const t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
