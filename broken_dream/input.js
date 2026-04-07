// --- Hand Tracking & Dragon Input ---

const HAND_VIDEO_W = 640, HAND_VIDEO_H = 480;
const HAND_TARGET_LERP = 0.18, DRAGON_FOLLOW_LERP = 0.22;
const HAND_GRACE_FRAMES = 12, FALLBACK_BLEND_FRAMES = 18;
const CAMERA_READY_TIMEOUT_MS = 4000;

const inputState = {
  video: null, handPose: null, hands: [], cameraReady: false, modelReady: false,
  controlSource: "auto", rawHandTarget: null, filteredHandTarget: null,
  lastSeenFrame: -1000, fallbackBlend: 1, detecting: false, cameraTimeoutId: null,
};

function setupHandTracking() {
  if (typeof ml5 === "undefined") return;
  let startDetect = () => {
    if (!inputState.handPose || !inputState.video || inputState.detecting) return;
    if (!inputState.cameraReady || !inputState.modelReady) return;
    try {
      inputState.handPose.detectStart(inputState.video, r => { inputState.hands = Array.isArray(r) ? r : []; });
      inputState.detecting = true;
    } catch (e) { console.warn("Detection start failed.", e); }
  };
  let markReady = () => {
    if (inputState.cameraReady) return;
    inputState.cameraReady = true;
    if (inputState.cameraTimeoutId !== null) { clearTimeout(inputState.cameraTimeoutId); inputState.cameraTimeoutId = null; }
    startDetect();
  };
  try {
    inputState.video = createCapture({
      audio: false, video: { facingMode: "user", width: { ideal: HAND_VIDEO_W }, height: { ideal: HAND_VIDEO_H } },
    }, markReady);
    inputState.video.size(HAND_VIDEO_W, HAND_VIDEO_H); inputState.video.hide();
    inputState.video.elt.setAttribute("playsinline", ""); inputState.video.elt.muted = true;
    inputState.video.elt.onloadedmetadata = markReady;
    inputState.cameraTimeoutId = setTimeout(() => {
      if (!inputState.cameraReady) console.warn("Camera not ready; using auto trace.");
    }, CAMERA_READY_TIMEOUT_MS);
  } catch (e) { console.warn("Camera failed.", e); inputState.video = null; }
  try {
    inputState.handPose = ml5.handPose({ maxHands: 1, flipped: true }, () => { inputState.modelReady = true; startDetect(); });
    inputState.handPose?.ready?.catch?.(e => console.warn("HandPose failed.", e));
  } catch (e) { console.warn("HandPose failed.", e); inputState.handPose = null; }
}

function updateInputTarget() {
  let ph = noise(frameCount / 50);
  let auto = { x: cos(frameCount / 30 + ph) * W * 0.34 + W * 0.5,
               y: sin(frameCount / 50 + ph) * H * 0.32 + H * 0.5 };
  let handOk = updateHandTarget();
  inputState.fallbackBlend = moveTowards(inputState.fallbackBlend, handOk ? 0 : 1, 1 / FALLBACK_BLEND_FRAMES);
  inputState.controlSource = inputState.fallbackBlend < 0.5 ? "hand" : "auto";
  if (!inputState.filteredHandTarget) return auto;
  return { x: lerp(inputState.filteredHandTarget.x, auto.x, inputState.fallbackBlend),
           y: lerp(inputState.filteredHandTarget.y, auto.y, inputState.fallbackBlend) };
}

function updateHandTarget() {
  let finger = inputState.hands[0]?.index_finger_tip;
  if (finger) {
    let vw = inputState.video?.elt?.videoWidth || HAND_VIDEO_W;
    let vh = inputState.video?.elt?.videoHeight || HAND_VIDEO_H;
    let raw = { x: constrain(map(finger.x, 0, vw, 0, W), 0, W),
                y: constrain(map(finger.y, 0, vh, H, 0), 0, H) };
    let stale = frameCount - inputState.lastSeenFrame > HAND_GRACE_FRAMES;
    inputState.rawHandTarget = raw;
    if (!inputState.filteredHandTarget || stale) inputState.filteredHandTarget = { ...raw };
    else {
      inputState.filteredHandTarget.x = lerp(inputState.filteredHandTarget.x, raw.x, HAND_TARGET_LERP);
      inputState.filteredHandTarget.y = lerp(inputState.filteredHandTarget.y, raw.y, HAND_TARGET_LERP);
    }
    inputState.lastSeenFrame = frameCount;
  } else inputState.rawHandTarget = null;
  return inputState.filteredHandTarget !== null && frameCount - inputState.lastSeenFrame <= HAND_GRACE_FRAMES;
}

function updateDragonKinematics(tx, ty) {
  lastDX = dragonX; lastDY = dragonY;
  dragonX = lerp(dragonX, tx, DRAGON_FOLLOW_LERP);
  dragonY = lerp(dragonY, ty, DRAGON_FOLLOW_LERP);
  let dx = dragonX - lastDX, dy = dragonY - lastDY;
  let nextH = heading;
  if (abs(dx) > 0.0001 || abs(dy) > 0.0001) nextH = atan2(dy, dx);
  speed = dist(dragonX, dragonY, lastDX, lastDY);
  turn = abs(atan2(sin(nextH - heading), cos(nextH - heading)));
  heading = nextH;
  let se = constrain(map(speed, 0.2, 12, 0, 0.6), 0, 0.6);
  let te = constrain(map(turn, 0.01, 0.3, 0, 0.4), 0, 0.4);
  let tgt = max(se * 0.7, se * 0.4 + te * 0.5);
  energy = lerp(energy, tgt, tgt > energy ? 0.12 : 0.04);
}

function moveTowards(cur, tgt, delta) {
  return abs(tgt - cur) <= delta ? tgt : cur + Math.sign(tgt - cur) * delta;
}
