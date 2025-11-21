// Supabase
const supabaseUrl = "https://abhrkcpchrwyjcewfnds.supabase.co";
const supabaseKey = "sb_publishable_Mz_eGCSHxj3DOOOXyyQwZg_aJmmiFuP";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let deviceId = null;
let playCount = 0;

// Load FingerprintJS
const fpPromise = FingerprintJS.load();

fpPromise
  .then(fp => fp.get())
  .then(result => {
    deviceId = result.visitorId;
    loadTodayPlays();
  });

// Load play count
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

// Main Game
async function playGame() {
  if (playCount >= 5) {
    document.getElementById("result").innerHTML =
      "❌ Kesempatan habis, coba lagi besok!";
    return;
  }

  animateClaw();
  playCount++;
  updateUI();

  const today = new Date().toISOString().slice(0, 10);

  await supabaseClient
    .from("plays")
    .update({ plays: playCount })
    .eq("device_id", deviceId)
    .eq("date", today);

  setTimeout(() => {
    giveReward();
  }, 1200);
}

// Button listener
document.getElementById("playBtn").onclick = playGame;

// Animasi capit
function animateClaw() {
  const arm = document.getElementById("claw-arm");
  const claw = document.getElementById("claw");

  arm.style.height = "220px";
  claw.style.transform = "translateY(120px)";

  setTimeout(() => {
    arm.style.height = "120px";
    claw.style.transform = "translateY(0)";
  }, 600);
}

// Reward system
function giveReward() {
  const chance = Math.random();

  if (chance < 0.65) {
    document.getElementById("result").innerHTML =
      "🎁 ZONK! Coba lagi!";
    return;
  }

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
