/* ======================================================
   CONFIG SUPABASE
====================================================== */
const supabaseUrl = "https://abhrkcpchrwyjcewfnds.supabase.co";
const supabaseKey = "sb_publishable_Mz_eGCSHxj3DOOOXyyQwZg_aJmmiFuP";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ======================================================
   DEVICE ID (Fingerprint)
====================================================== */
let deviceId = "unknown";

async function initFingerprint() {
    try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        deviceId = result.visitorId;
    } catch (err) {
        deviceId = "RND-" + Math.random().toString(36).slice(2);
    }
    loadPlaysToday();
}

initFingerprint();

/* ======================================================
   LOAD PLAY COUNT
====================================================== */
let playCount = 0;

async function loadPlaysToday() {
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
        .from("plays")
        .select("*")
        .eq("device_id", deviceId)
        .eq("date", today)
        .maybeSingle();

    if (!data) {
        await supabase.from("plays").insert({
            device_id: deviceId,
            date: today,
            plays: 0
        });
        playCount = 0;
    } else {
        playCount = data.plays;
    }

    updateRemaining();
}

function updateRemaining() {
    document.getElementById("remaining").innerText = 5 - playCount;
}

/* ======================================================
   AUTO MOVE CLAW
====================================================== */
const claw = document.getElementById("claw");
let moveDir = 1; // 1 = right, -1 = left
let clawX = 50; // %
let clawSpeed = 0.6; // smooth ngebut dikit

function autoMove() {
    clawX += moveDir * clawSpeed;
    if (clawX > 88) moveDir = -1;
    if (clawX < 12) moveDir = 1;
    claw.style.left = clawX + "%";
    requestAnimationFrame(autoMove);
}

autoMove();

/* ======================================================
   GAME LOGIC
====================================================== */
const playBtn = document.getElementById("play-btn");
const ballArea = document.getElementById("ball-area");
const resultBox = document.getElementById("result");
const resultText = document.getElementById("result-text");
const resultDetail = document.getElementById("result-detail");

let isPlaying = false;

playBtn.onclick = playGame;

async function playGame() {
    if (isPlaying) return;
    if (playCount >= 5) {
        showResult("❌ Kesempatan habis!", "Coba lagi besok.");
        return;
    }

    isPlaying = true;
    playBtn.disabled = true;

    stopAutoMove();
    await animateClawDown();
    const selectedBall = getClosestBall();
    await animateClawUp(selectedBall);

    const prize = selectedBall.dataset.prize;
    giveReward(prize);

    // SAVE play count
    playCount++;
    updateRemaining();

    const today = new Date().toISOString().slice(0, 10);

    await supabase
        .from("plays")
        .update({ plays: playCount })
        .eq("device_id", deviceId)
        .eq("date", today);

    // reset state after animation
    setTimeout(() => {
        playBtn.disabled = false;
        isPlaying = false;
        autoMove();
    }, 1200);
}

/* ======================================================
   STOP AUTO MOVE
====================================================== */
function stopAutoMove() {
    moveDir = 0;
}

/* ======================================================
   ANIMASI CAPIT TURUN
====================================================== */
function animateClawDown() {
    return new Promise(resolve => {
        claw.style.transition = "top 0.6s";
        claw.style.top = "35%";

        setTimeout(resolve, 600);
    });
}

/* ======================================================
   AMBIL BOLA TERDEKAT
====================================================== */
function getClosestBall() {
    const balls = [...document.querySelectorAll(".ball")];
    let closest = null;
    let minDist = 9999;

    const clawRect = claw.getBoundingClientRect();

    balls.forEach(ball => {
        const r = ball.getBoundingClientRect();
        const dist = Math.abs((r.left + r.width / 2) - (clawRect.left + clawRect.width / 2));
        if (dist < minDist) {
            minDist = dist;
            closest = ball;
        }
    });

    return closest;
}

/* ======================================================
   ANIMASI NAIK + NARIK BOLA
====================================================== */
function animateClawUp(ball) {
    return new Promise(resolve => {
        const clawRect = claw.getBoundingClientRect();
        const ballRect = ball.getBoundingClientRect();

        // tempel bola
        ball.style.transition = "all 0.6s";
        ball.style.left = (clawRect.left - ballRect.width / 2 + clawRect.width / 2) + "px";
        ball.style.top = (clawRect.top + 20) + "px";
        ball.style.position = "fixed";

        // naik
        setTimeout(() => {
            claw.style.top = "5%";
            ball.style.top = "10%";
        }, 80);

        setTimeout(resolve, 650);
    });
}

/* ======================================================
   REWARD SYSTEM
====================================================== */
async function giveReward(prize) {
    if (prize === "zonk") {
        showResult("😵‍💫 ZONK!", "Tidak dapat apa-apa.");
        return;
    }

    const limitValue = parseInt(prize);
    const code = generateCode();

    // save code
    await supabase.from("codes").insert({
        code: code,
        limit: limitValue,
        device_id: deviceId,
        created_at: new Date().toISOString()
    });

    showResult(
        `🎉 Dapat ${limitValue} LIMIT!`,
        `Kode Redeem: <b>${code}</b>`
    );
}

function generateCode() {
    return "AZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/* ======================================================
   SHOW RESULT
====================================================== */
function showResult(title, detail) {
    resultText.innerHTML = title;
    resultDetail.innerHTML = detail;
    resultBox.classList.remove("hidden");
}
