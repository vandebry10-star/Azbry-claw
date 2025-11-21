// ===========================
// Supabase Config
// ===========================
const supabaseUrl = "https://abhrkcpchrwyjcewfnds.supabase.co";
const supabaseKey = "sb_publishable_Mz_eGCSHxj3DOOOXyyQwZg_aJmmiFuP";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let deviceId = "UNKNOWN";
let playCount = 0;
let maxPlays = 5;

// ===========================
// Fingerprint
// ===========================
async function initFingerprint() {
  try {
    const fp = await FingerprintJS.load();
    const res = await fp.get();
    deviceId = res.visitorId;
  } catch {
    deviceId = "RND-" + Math.random().toString(36).slice(2, 10);
  }

  loadTodayPlays();
}
initFingerprint();

// ===========================
// Load / Save Chance
// ===========================
async function loadTodayPlays() {
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabaseClient
    .from("plays")
    .select("*")
    .eq("device_id", deviceId)
    .eq("date", today)
    .maybeSingle();

  if (!data) {
    await supabaseClient.from("plays").insert({
      device_id: deviceId,
      date: today,
      plays: 0
    });
    playCount = 0;
  } else {
    playCount = data.plays;
  }

  updateChanceUI();
}

async function savePlay() {
  const today = new Date().toISOString().slice(0, 10);

  await supabaseClient
    .from("plays")
    .update({ plays: playCount })
    .eq("device_id", deviceId)
    .eq("date", today);
}

function updateChanceUI() {
  document.getElementById("chanceText").innerHTML =
    `Chances: <b>${maxPlays - playCount}</b>`;
}

// ===========================
// MACHINE LOGIC
// ===========================
const machine = document.getElementById("machine");
const ballsArea = document.getElementById("balls");
const claw = document.getElementById("claw");

let clawX = 50; // percent
let isDropping = false;

// ===========================
// Spawn Balls
// ===========================
const COLORS = ["#39ff14", "#0044ff"]; // neon green + dark blue

function spawnBalls() {
  ballsArea.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const ball = document.createElement("div");
    ball.className = "ball";

    const size = Math.floor(Math.random() * 30) + 45; // 45–75px
    const limit = Math.floor(Math.random() * 5) + 1; // 1–5 reward

    ball.dataset.limit = limit;

    ball.style.width = size + "px";
    ball.style.height = size + "px";
    ball.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];

    // random position bottom
    ball.style.left = (Math.random() * 70 + 5) + "%";
    ball.style.top = (Math.random() * 40 + 55) + "%";

    ball.innerHTML = limit;

    ballsArea.appendChild(ball);
  }
}
spawnBalls();

// ===========================
// Move claw left/right
// ===========================
document.getElementById("leftBtn").onclick = () => moveClaw(-7);
document.getElementById("rightBtn").onclick = () => moveClaw(+7);

function moveClaw(dir) {
  if (isDropping) return;
  clawX += dir;
  if (clawX < 5) clawX = 5;
  if (clawX > 95) clawX = 95;

  claw.style.left = clawX + "%";
}

// ===========================
// CAPIT ACTION
// ===========================
document.getElementById("capitBtn").onclick = async () => {
  if (isDropping) return;

  if (playCount >= maxPlays) {
    document.getElementById("rewardText").innerHTML =
      "❌ Kesempatan habis, coba besok.";
    return;
  }

  isDropping = true;
  playCount++;
  updateChanceUI();
  savePlay();

  await dropClaw();
};

// ===========================
// Claw Drop + Hit Detection
// ===========================
async function dropClaw() {
  // turun
  claw.style.transition = "0.8s";
  claw.style.top = "220px";

  await wait(800);

  const ball = detectHit();
  let rewardText = "";

  if (!ball) {
    rewardText = "🎁 ZONK!";
  } else {
    const limit = ball.dataset.limit;
    const code = generateCode();

    saveReward(limit, code);

    rewardText = `🎉 DAPET ${limit} LIMIT <br>KODE: <b>${code}</b>`;

    ball.remove();
  }

  // naik lagi
  claw.style.top = "10px";

  await wait(800);

  document.getElementById("rewardText").innerHTML = rewardText;

  isDropping = false;
}

function detectHit() {
  const clawRect = claw.getBoundingClientRect();
  const balls = document.querySelectorAll(".ball");

  for (const ball of balls) {
    const rect = ball.getBoundingClientRect();

    if (
      clawRect.left < rect.right &&
      clawRect.right > rect.left &&
      clawRect.bottom > rect.top
    ) {
      return ball;
    }
  }
  return null;
}

// ===========================
// Utils
// ===========================
function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function generateCode() {
  return "AZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function saveReward(limit, code) {
  await supabaseClient.from("codes").insert({
    code: code,
    limit: limit
  });
}
