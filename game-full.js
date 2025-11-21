/* game-full.js
   Mobile-first claw machine (360x520 canvas)
   - 7 balls with fixed values (dominant zonk)
   - physics: simple gravity + collision
   - claw: drag or buttons, drop & grab
   - Supabase: deviceId + plays (5/day) + codes insert
*/

///// CONFIG /////
const SUPABASE_URL = 'https://abhrkcpchrwyjcewfnds.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Mz_eGCSHxj3DOOOXyyQwZg_aJmmiFuP';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const CANVAS_W = 360;
const CANVAS_H = 520;
const MAX_CHANCES = 5;

///// DOM refs /////
const canvas = document.getElementById('gameCanvas');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const dropBtn = document.getElementById('dropBtn');
const statusEl = document.getElementById('status');
const chancesEl = document.getElementById('chances');
const resultText = document.getElementById('resultText');
const codeBox = document.getElementById('codeBox');
const copyBtn = document.getElementById('copyBtn');

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

///// DEVICE ID (fingerprint + local fallback) /////
let deviceId = localStorage.getItem('azbry_device') || null;
async function ensureDeviceId(){
  if(deviceId) return deviceId;
  try{
    const fp = await FingerprintJS.load();
    const r = await fp.get();
    deviceId = r.visitorId;
  }catch(e){
    deviceId = 'RND-' + Math.random().toString(36).slice(2,10);
  }
  localStorage.setItem('azbry_device', deviceId);
  return deviceId;
}

///// PLAY COUNT from Supabase /////
let playsToday = 0;
async function loadPlays(){
  await ensureDeviceId();
  const today = new Date().toISOString().slice(0,10);
  const { data } = await supabase.from('plays').select('*').eq('user_id', deviceId).eq('date', today).maybeSingle();
  if(!data){
    await supabase.from('plays').insert({ user_id: deviceId, date: today, plays: 0 });
    playsToday = 0;
  } else playsToday = data.plays || 0;
  updateChancesUI();
}
function updateChancesUI(){
  const left = Math.max(0, MAX_CHANCES - playsToday);
  chancesEl.textContent = `Chances: ${left}/${MAX_CHANCES}`;
  if(left <= 0){
    dropBtn.disabled = true; leftBtn.disabled = true; rightBtn.disabled = true;
    statusEl.textContent = 'Kesempatan habis';
  } else {
    dropBtn.disabled = false; leftBtn.disabled = false; rightBtn.disabled = false;
    statusEl.textContent = 'Siap bermain';
  }
}
async function incrementPlay(){
  playsToday++;
  const today = new Date().toISOString().slice(0,10);
  await supabase.from('plays').update({ plays: playsToday, last_play: new Date().toISOString() }).eq('user_id', deviceId).eq('date', today);
  updateChancesUI();
}

///// BALL CONFIG (7 balls)
const BALL_DEFS = [
  {r:30, value:0, color:'#2fffb0'},   // big - zonk
  {r:24, value:0, color:'#99e6ff'},   // med - zonk
  {r:24, value:1, color:'#fff7a8'},   // med - +1
  {r:20, value:0, color:'#c7ffd8'},   // small - zonk
  {r:20, value:1, color:'#ffd6a5'},   // small - +1
  {r:14, value:0, color:'#dbeaff'},   // mini - zonk
  {r:12, value:2, color:'#8bff9a'}    // mini rare - +2
];
let balls = []; // dynamic

///// CLAW
const claw = { x: CANVAS_W/2 - 20, y: 36, w:42, h:18, dropping:false };

///// PHYSICS
let gravity = 0.8;
function spawnBalls(){
  balls = [];
  const baseY = CANVAS_H - 80;
  // spread them horizontally and add tiny offsets so they cluster
  for(let i=0;i<BALL_DEFS.length;i++){
    const def = BALL_DEFS[i];
    const x = 36 + (i * ((CANVAS_W-72) / (BALL_DEFS.length-1))) + (Math.random()*18-9);
    const y = baseY - Math.random()*20 - (Math.random()*10);
    balls.push({ id:'b'+i, x,y, vx:(Math.random()-0.5)*1.2, vy:0, r:def.r, value:def.value, color:def.color, caught:false });
  }
}

///// DRAW
function draw(){
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
  // glass background
  const grad = ctx.createLinearGradient(0,0,0,CANVAS_H);
  grad.addColorStop(0,'#e6fbff'); grad.addColorStop(0.6,'#d6f6ff'); grad.addColorStop(1,'#bfeff5');
  ctx.fillStyle = grad;
  ctx.fillRect(6,6,CANVAS_W-12, CANVAS_H-180);

  // tray
  ctx.fillStyle = '#0e2e2c';
  ctx.fillRect(6, CANVAS_H-180, CANVAS_W-12, 180);

  // balls (sort by y)
  balls.sort((a,b)=>a.y-b.y);
  for(const b of balls){
    // shadow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.ellipse(b.x, b.y + b.r*0.7, b.r*0.9, b.r*0.35, 0, 0, Math.PI*2);
    ctx.fill();

    // ball
    ctx.beginPath();
    ctx.fillStyle = b.color;
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();

    // label
    ctx.fillStyle = '#04201b';
    ctx.font = `${Math.max(10, b.r/2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.value>0? `+${b.value}` : '—', b.x, b.y);
  }

  // claw rope
  ctx.strokeStyle = '#6b6b6b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(claw.x + claw.w/2, 0);
  ctx.lineTo(claw.x + claw.w/2, claw.y);
  ctx.stroke();

  // claw body
  ctx.fillStyle = '#bfbfbf';
  ctx.fillRect(claw.x, claw.y, claw.w, claw.h);
  ctx.strokeStyle = '#8a8a8a';
  ctx.strokeRect(claw.x, claw.y, claw.w, claw.h);

  requestAnimationFrame(draw);
}

///// PHYSICS STEP
function stepPhysics(){
  for(let i=0;i<balls.length;i++){
    const b = balls[i];
    if(b.caught) continue;
    b.vy += gravity * 0.7;
    b.x += b.vx;
    b.y += b.vy;

    // floor
    const floorY = CANVAS_H - 60 - b.r;
    if(b.y > floorY){ b.y = floorY; b.vy *= -0.3; b.vx *= 0.9; }

    // walls
    if(b.x - b.r < 14){ b.x = 14 + b.r; b.vx *= -0.6; }
    if(b.x + b.r > CANVAS_W-14){ b.x = CANVAS_W-14 - b.r; b.vx *= -0.6; }

    // collisions pairwise
    for(let j=i+1;j<balls.length;j++){
      const b2 = balls[j];
      if(b2.caught) continue;
      const dx = b2.x - b.x, dy = b2.y - b.y;
      const dist = Math.hypot(dx,dy);
      const minD = b.r + b2.r;
      if(dist < minD && dist > 0){
        const overlap = (minD - dist) / 2;
        const nx = dx / dist, ny = dy / dist;
        b.x -= nx * overlap; b.y -= ny * overlap;
        b2.x += nx * overlap; b2.y += ny * overlap;
        // swap velocities small
        const tvx = b.vx, tvy=b.vy;
        b.vx = b2.vx*0.9; b.vy = b2.vy*0.9;
        b2.vx = tvx*0.9; b2.vy = tvy*0.9;
      }
    }
  }
}

///// MAIN LOOPS
function mainLoop(){
  stepPhysics();
  requestAnimationFrame(mainLoop);
}
draw(); mainLoop();

///// CONTROLS: drag & buttons
let dragging=false;
canvas.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if(Math.abs(x - (claw.x + claw.w/2)) < 60) dragging=true;
  else claw.x = Math.max(14, Math.min(x - claw.w/2, CANVAS_W - claw.w - 14));
});
canvas.addEventListener('pointermove', (e)=>{
  if(!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  claw.x = Math.max(14, Math.min(x - claw.w/2, CANVAS_W - claw.w - 14));
});
canvas.addEventListener('pointerup', ()=>{ dragging=false; });
canvas.addEventListener('pointercancel', ()=>{ dragging=false; });

leftBtn.addEventListener('click', ()=>{ claw.x = Math.max(14, claw.x - 36); });
rightBtn.addEventListener('click', ()=>{ claw.x = Math.min(CANVAS_W - claw.w - 14, claw.x + 36); });

window.addEventListener('keydown',(e)=>{
  if(e.key === 'ArrowLeft') leftBtn.click();
  if(e.key === 'ArrowRight') rightBtn.click();
  if(e.key === ' ') dropBtn.click();
});

///// DROP & CATCH logic
async function dropAndGrab(){
  if(claw.dropping) return;
  if(playsToday >= MAX_CHANCES) { statusEl.textContent = 'Kesempatan habis'; return; }
  claw.dropping = true; statusEl.textContent = 'Capit turun...';

  // descend
  while(claw.y < CANVAS_H - 180){
    claw.y += 6;
    checkCatchDuringDescend();
    await sleep(12);
  }

  await sleep(120); // close time

  // ascend back
  while(claw.y > 36){
    claw.y -= 6;
    // move caught ball up with claw
    for(const b of balls) if(b.caught){
      b.x = claw.x + claw.w/2; b.y = claw.y + claw.h + b.r + 2;
    }
    await sleep(12);
  }

  // finalize
  await sleep(120);

  const caught = balls.find(b=>b.caught);
  if(!caught){
    statusEl.textContent = 'Zonk! Tidak ada yang tertangkap';
    claw.dropping = false;
    return;
  }

  // remove ball from world
  balls = balls.filter(b=>b.id !== caught.id);

  // award
  await handleWin(caught.value);
  // respawn slight delay
  await sleep(400);
  claw.dropping = false;
  if(balls.length === 0) spawnBalls(); // refill
}

function checkCatchDuringDescend(){
  for(const b of balls){
    if(b.caught) continue;
    const bx=b.x, by=b.y;
    const cx = claw.x + claw.w/2;
    const cy = claw.y + claw.h;
    const dx = Math.abs(bx - cx);
    const dy = by - cy;
    if(dy > -10 && dy < 28 && dx < b.r + 18){
      // success prob depends on ball.value (rare balls easier)
      const successProb = b.value>0 ? 0.9 : 0.22; // reward balls easier to grab
      if(Math.random() < successProb){
        b.caught = true; return true;
      } else {
        // a miss; don't set caught
        return false;
      }
    }
  }
  return false;
}

dropBtn.addEventListener('click', async ()=>{
  if(playsToday >= MAX_CHANCES) { statusEl.textContent='Kesempatan habis'; return; }
  await incrementPlay(); // increments playsToday in server
  await dropAndGrab();
});

///// WIN HANDLING & SAVE CODE
function genCode(){
  const chars='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s='AZ-';
  for(let i=0;i<6;i++) s+=chars.charAt(Math.floor(Math.random()*chars.length));
  return s;
}

async function handleWin(value){
  if(value <= 0){
    statusEl.textContent = 'Zonk! Tidak mendapat limit.';
    resultText.textContent = '— ZONK —';
    return;
  }
  const code = genCode();
  try{
    await supabase.from('codes').insert({ code: code, limit: value, created_at: new Date().toISOString() });
    statusEl.textContent = `Berhasil! Dapat ${value} LIMIT`;
    resultText.textContent = `🎉 Dapat ${value} LIMIT`;
    codeBox.textContent = code;
  }catch(e){
    console.error(e);
    statusEl.textContent = 'Gagal menyimpan kode (cek jaringan)';
    resultText.textContent = `🎉 Dapat ${value} LIMIT (kode lokal)`;
    codeBox.textContent = code;
  }
}

copyBtn.addEventListener('click', ()=>{
  const txt = codeBox.textContent.trim();
  if(!txt || txt==='-') return;
  navigator.clipboard?.writeText(txt).then(()=>{ copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy',1200); });
});

///// helpers
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

///// init
(async ()=>{
  await ensureDeviceId();
  spawnBalls();
  draw();
  mainLoop();
  await loadPlays();
})();
