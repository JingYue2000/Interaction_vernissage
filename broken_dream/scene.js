// --- Scene Generation & Zone Construction ---

const PAL_ACCENT_ACTIVE = "#00d2ff-#d81159-#f52f57-#9b59b6".split("-");
const PAL_TRACE = "#c4b5e0-#a8d8ea-#d4c5f9-#9b59b6-#00d2ff-#d81159-#f52f57".split("-");
const PAL_GLOW = "#d4c5f9-#00d2ff-#d81159-#f52f57".split("-");
const PAL_GLASS_FILL = PAL_TRACE.slice();
const PAL_GLASS_TINT = PAL_ACCENT_ACTIVE.concat(["#a8d8ea", "#d4c5f9"]);
const PAL_GLASS_RIM = PAL_GLOW.concat(["#00d2ff", "#c79bff"]);

function generateScene() {
  randomSeed(SEED + 17); noiseSeed(SEED + 17);
  let cfg = {
    gradient: {
      top: random(["#e1d5f7", "#e8ddff", "#ddd1f6", "#ece0ff"]),
      mid: random(["#cbb8ee", "#c7b2f1", "#d3c0f3", "#c6b6ea"]),
      bottom: random(["#c7e4f5", "#c9ebfb", "#bee3f2", "#d2effc"]),
    },
    bgFrags: [], panels: [], reactiveZones: [],
  };
  for (let i = 0, n = floor(random(24, 38)); i < n; i++) {
    let sz = random(40, 180), nv = floor(random(3, 6));
    let cx = random(0.02, 0.98) * W, cy = random(0.02, 0.98) * H, rot = random(-PI, PI), pts = [];
    for (let j = 0; j < nv; j++) {
      let a = TWO_PI * j / nv + random(-0.4, 0.4) + rot;
      pts.push({ x: cx + cos(a) * sz * random(0.4, 1), y: cy + sin(a) * sz * random(0.4, 1) });
    }
    let col = random(["#efe4ff", "#d6d0ff", "#caebff", "#dbcaff", "#d8c9ff", "#cfe7ff", "#f0d2ff"]);
    cfg.bgFrags.push(initZoneState({ kind: "poly", role: "bgFrag", points: pts,
      center: [cx, cy], radius: [sz * 1.2, sz * 1.2], baseColor: col, tint: col, alpha: random(18, 72) }));
  }
  let pc = floor(random(12, 18)), lc = floor(random(4, 6));
  let ac = floor(random(max(4, pc * 0.4), pc * 0.65 + 1)), anchors = [];
  for (let i = 0; i < pc; i++) {
    let panel = buildRandomPanel(anchors, i < lc, cfg.gradient, i < ac);
    cfg.panels.push(panel); cfg.reactiveZones.push(panel);
    anchors.push({ x: panel.center[0], y: panel.center[1], rx: panel.radius[0], ry: panel.radius[1] });
  }
  return cfg;
}

function buildRandomPanel(anchors, large, gradient, ambient) {
  let best = null;
  for (let i = 0; i < 28; i++) {
    let rx = large ? random(110, 228) : random(42, 136);
    let ry = large ? random(138, 296) : random(54, 178);
    let cx = random(0.04, 0.96) * W, cy = random(0.04, 0.96) * H;
    let nv = floor(random(4, 8)), rot = random(TWO_PI), pts = [];
    for (let j = 0; j < nv; j++) {
      let a = TWO_PI * j / nv + rot + random(-0.32, 0.32);
      pts.push({ x: constrain(cx + cos(a) * rx * random(0.52, 1.08), -W * 0.08, W * 1.08),
                 y: constrain(cy + sin(a) * ry * random(0.52, 1.08), -H * 0.08, H * 1.08) });
    }
    let sep = anchors.reduce((m, a) => {
      let dx = (cx - a.x) / max(1, (rx + a.rx) * 0.72), dy = (cy - a.y) / max(1, (ry + a.ry) * 0.72);
      return min(m, sqrt(dx * dx + dy * dy));
    }, 999999);
    let score = sep + min(cx, W - cx, cy, H - cy) / min(W, H) * 0.22 + random(0, 0.16);
    if (!best || score > best.score) best = { pts, score, large };
  }
  let mat = buildPanelMaterial(gradient, ambient);
  let xs = best.pts.map(p => p.x), ys = best.pts.map(p => p.y);
  let area = ((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / (W * H);
  let aBase = best.large ? (ambient ? random(78, 116) : random(96, 132)) : (ambient ? random(46, 88) : random(60, 108));
  return mkZone({ role: "panel", glassMode: mat.glassMode, points: best.pts.map(p => [p.x / W, p.y / H]),
    fill: mat.fill, tint: mat.tint, rim: mat.rim, alpha: aBase + constrain(map(area, 0.02, 0.22, 0, 18), 0, 18) });
}

function buildPanelMaterial(gradient, ambient) {
  if (!ambient) return { glassMode: "vivid", fill: random(PAL_GLASS_FILL), tint: random(PAL_GLASS_TINT), rim: random(PAL_GLASS_RIM) };
  let g1 = random([gradient.top, gradient.mid, gradient.bottom]);
  let g2 = random([gradient.top, gradient.mid, gradient.bottom]);
  return { glassMode: "ambient", fill: mixHex(g1, g2, random(0.25, 0.7)),
    tint: mixHex(g2, random(PAL_TRACE), random(0.14, 0.28)), rim: mixHex(g1, random(PAL_GLOW), random(0.22, 0.4)) };
}

function mkZone(p) {
  let z = { kind: "poly", ...p, baseColor: p.fill };
  z.points = p.points.map(pt => ({ x: pt[0] * W, y: pt[1] * H }));
  let xs = z.points.map(pt => pt.x), ys = z.points.map(pt => pt.y);
  z.center = [(Math.min(...xs) + Math.max(...xs)) * 0.5, (Math.min(...ys) + Math.max(...ys)) * 0.5];
  z.radius = [Math.max((Math.max(...xs) - Math.min(...xs)) * 0.62, 96),
              Math.max((Math.max(...ys) - Math.min(...ys)) * 0.62, 86)];
  return initZoneState(z);
}

function initZoneState(z) {
  Object.assign(z, { currentStrength: 0, glowLevel: 0, fractureLevel: 0, prevFractureLevel: 0,
    wasFractured: false, regroupCooldown: 0, regroupFlash: 0, flashFill: null, flashTint: null, flashRim: null,
    mirrorX: 1, flipAnimating: false, flipT: 0, flipStart: 1, flipTarget: -1 });
  z.shards = buildShards(z);
  return z;
}

function buildShards(z) {
  let perim = sampleShape(z.points || [], 3);
  if (perim.length < 3) return [];
  let cx = z.center[0], cy = z.center[1], shards = [];
  for (let i = 0; i < perim.length; i++) {
    let p1 = perim[i], p2 = perim[(i + 1) % perim.length];
    let lp = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    let pts = [lp({ x: cx, y: cy }, p1, random(0.16, 0.36)), p1, p2, lp({ x: cx, y: cy }, p2, random(0.16, 0.36))];
    let centX = pts.reduce((s, p) => s + p.x, 0) / 4, centY = pts.reduce((s, p) => s + p.y, 0) / 4;
    let dx = centX - cx, dy = centY - cy, mag = max(1, sqrt(dx * dx + dy * dy));
    shards.push({ points: pts, centroid: { x: centX, y: centY }, dir: { x: dx / mag, y: dy / mag },
      depth: random(0.4, 1), threshold: i / perim.length + random(-0.08, 0.1), tint: random(PAL_GLOW), activation: 0 });
  }
  return shards.sort((a, b) => a.threshold - b.threshold);
}

function sampleShape(pts, sub) {
  let out = [];
  for (let i = 0; i < pts.length; i++) {
    let a = pts[i], b = pts[(i + 1) % pts.length];
    for (let s = 0; s < sub; s++) { let t = s / sub; out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }); }
  }
  return out;
}

function buildZoneRegroupMaterial(z) {
  if (z.role === "panel") return buildPanelMaterial(sceneConfig.gradient, z.glassMode !== "ambient");
  let base = z.fill || z.baseColor || random(PAL_TRACE);
  let tint = mixHex(base, random(PAL_TRACE), random(0.28, 0.46));
  let rim = mixHex(random(PAL_TRACE), random(PAL_GLOW), random(0.34, 0.62));
  return { fill: tint, tint: rim, rim: random(PAL_GLASS_RIM),
    flashFill: mixHex(tint, random(PAL_ACCENT_ACTIVE), random(0.46, 0.72)),
    flashTint: mixHex(rim, random(PAL_ACCENT_ACTIVE), random(0.4, 0.7)), flashRim: random(PAL_GLOW) };
}

function triggerZoneRegroup(z) {
  let m = buildZoneRegroupMaterial(z);
  Object.assign(z, { fill: m.fill, tint: m.tint, rim: m.rim, baseColor: m.fill,
    flashFill: m.flashFill || m.fill, flashTint: m.flashTint || m.tint, flashRim: m.flashRim || m.rim,
    regroupFlash: 1, flipAnimating: true, flipT: 0, flipStart: z.mirrorX || 1, flipTarget: -(z.mirrorX || 1) });
  if (m.glassMode) z.glassMode = m.glassMode;
}

function mixHex(a, b, t) {
  let c = lerpColor(color(a), color(b), t), h = v => hex(round(v), 2);
  return `#${h(red(c))}${h(green(c))}${h(blue(c))}`;
}
