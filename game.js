// ================== Supabase ==================
const supabaseUrl = "https://abhrkcpchrwyjcewfnds.supabase.co";
const supabaseKey = "sb_publishable_Mz_eGCSHxj3DOOOXyyQwZg_aJmmiFuP";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let deviceId = "UNKNOWN";
let playCount = 0;

// FingerprintJS
async function initFingerprint() {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    deviceId = result.visitorId;
  } catch {
    deviceId = "RND-" + Math.random().toString(36).slice(2, 10);
  }
  loadTodayPlays();
}

initFingerprint();

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

  updateUI();
}

function updateUI() {
  document.getElementById("result").innerHTML =
    `Kesempatan hari ini: ${5 - playCount}`;
}

// ================== GAME CANVAS ==================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let clawX = 160;
let clawY = 20;
let clawWidth = 40;
let clawHeight = 20;
let isDropping = false;

let ballX = Math.random() * 250 + 50;
let ballY = 380;
let ballCaught = false;

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ball
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(ballX, ballY, 20, 0, Math.PI * 2);
  ctx.fill();

  // claw arm
  ctx.strokeStyle = "silver";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(clawX + clawWidth / 2, 0);
  ctx.lineTo(clawX + clawWidth / 2, clawY);
  ctx.stroke();

  // claw
  ctx.fillStyle = "silver";
  ctx.fillRect(clawX, clawY, clawWidth, clawHeight);

  requestAnimationFrame(draw);
}
draw();

// Move claw
canvas.addEventListener("touchmove", (e) => {
  let x = e.touches[0].clientX - canvas.getBoundingClientRect().left;
  clawX = Math.max(20, Math.min(x, 300));
});

canvas.addEventListener("mousemove", (e) => {
  let x = e.clientX - canvas.getBoundingClientRect().left;
  clawX = Math.max(20, Math.min(x, 300));
});

// ================== PLAY ==================
document.getElementById("playBtn").onclick = playGame;

async function playGame() {
  if (playCount >= 5) {
    document.getElementById("result").innerHTML =
      "❌ Kesempatan habis, coba lagi besok!";
    return;
  }

  playCount++;
  updateUI();

  dropClaw();

  const today = new Date().toISOString().slice(0, 10);

  await supabaseClient
    .from("plays")
    .update({ plays: playCount })
    .eq("device_id", deviceId)
    .eq("date", today);
}

function dropClaw() {
  if (isDropping) return;
  isDropping = true;

  let dropInterval = setInterval(() => {
    clawY += 5;

    // check collision
    if (!ballCaught && clawY >= ballY - 30 && Math.abs(clawX - ballX) < 40) {
      ballCaught = true;
    }

    if (clawY >= 350) {
      clearInterval(dropInterval);
      raiseClaw();
    }
  }, 15);
}

function raiseClaw() {
  let upInterval = setInterval(() => {
    clawY -= 5;

    if (ballCaught) ballY -= 5;

    if (clawY <= 20) {
      clearInterval(upInterval);
      finishPlay();
    }
  }, 15);
}

function finishPlay() {
  if (!ballCaught) {
    document.getElementById("result").innerHTML = "🎁 ZONK! Coba lagi!";
    resetBall();
    isDropping = false;
    return;
  }

  ballCaught = false;
  resetBall();

  giveReward();

  isDropping = false;
}

function resetBall() {
  ballX = Math.random() * 250 + 50;
  ballY = 380;
}

// =============== REWARD ==================
function giveReward() {
  const limit = Math.floor(Math.random() * 5) + 1;
  const code = generateCode();

  saveReward(limit, code);

  document.getElementById("result").innerHTML =
    `🎉 Dapat ${limit} LIMIT!<br>Kode: <b>${code}</b>`;
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
