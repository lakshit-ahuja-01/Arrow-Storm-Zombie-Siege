/* =============================================
   RAGDOLL ARCHERS: ZOMBIE SIEGE 🧟🏹
   Tower Defense Ragdoll Archery Game
   ============================================= */

'use strict';

// ─────────────────────────────────────────────
//  CANVAS & VIEWPORT
// ─────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let game = null;
let W = 0, H = 0;

function resizeCanvas() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  if (game && game.onResize) game.onResize();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─────────────────────────────────────────────
//  MATH & UTILITIES
// ─────────────────────────────────────────────
const PI2 = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// Physics Constants
const GRAVITY = 1600;   // px/s²
const FRICTION = 0.82;
const BOUNCE = 0.28;
const GROUND_Y = () => H * 0.72;

// ─────────────────────────────────────────────
//  SOUND FX SYNTHESIZER (WEB AUDIO API)
// ─────────────────────────────────────────────
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) this.ctx = new AudioCtx();
  }
  ensure() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  toggleMute() {
    this.muted = !this.muted;
    return !this.muted;
  }
  playBowDraw() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.3);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.2);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
  playBowRelease(power = 1) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 * power + 120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain.gain.setValueAtTime(0.32 * power, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }
  playFleshHit(isCrit = false) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isCrit ? 220 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
    gain.gain.setValueAtTime(isCrit ? 0.45 : 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
    this.playNoise(0.08, 900, 0.2);
  }
  playDecapitation() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
    this.playNoise(0.24, 1500, 0.4);
  }
  playHeadshot() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(200, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.5);
    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.55);
    this.playNoise(0.2, 2800, 0.45);
  }
  playArmorHit() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [1800, 2900, 3800].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + rnd(-60, 60), now);
      gain.gain.setValueAtTime(0.25 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }
  playZombieMoan() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const base = rnd(80, 115);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base - 22, now + 0.4);
    osc.frequency.linearRampToValueAtTime(base - 12, now + 0.8);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);
  }
  playNecromancerSpell() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.7);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  }
  playIceFreeze() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.linearRampToValueAtTime(2400, now + 0.2);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
  playTeslaZap() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }
  playExplosion() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
    this.playNoise(0.5, 480, 0.45);
  }
  playGemCollect() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const pitch = rnd(900, 1300);
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.setValueAtTime(pitch * 1.5, now + 0.07);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }
  playJump() {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.14);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }
  playNoise(duration, filterFreq, volume) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }
}
const soundFX = new SoundFX();

// ─────────────────────────────────────────────
//  FLOATING DAMAGE NUMBERS & TEXT
// ─────────────────────────────────────────────
const floatingTexts = [];
function spawnFloatingText(text, x, y, opts = {}) {
  if (floatingTexts.length > 25) floatingTexts.shift();
  floatingTexts.push({
    text, x, y,
    vy: opts.vy ?? -75,
    color: opts.color ?? '#fff',
    size: opts.size ?? 22,
    weight: opts.weight ?? '900',
    alpha: 1,
    life: opts.life ?? 0.85,
    decay: 0,
    scale: opts.scale ?? 1.5,
  });
}
function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.decay += dt;
    t.y += t.vy * dt;
    t.scale = lerp(t.scale, 1.0, dt * 10);
    t.alpha = clamp(1 - (t.decay / t.life), 0, 1);
    if (t.alpha <= 0) floatingTexts.splice(i, 1);
  }
}
function drawFloatingTexts() {
  for (const t of floatingTexts) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.scale, t.scale);
    ctx.globalAlpha = t.alpha;
    ctx.font = `${t.weight} ${t.size}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeText(t.text, 0, 0);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  FLYING SKULL COINS (MAGNETIC HUD COLLECTION)
// ─────────────────────────────────────────────
const flyingCoins = [];
function spawnFlyingSkulls(startX, startY, count = 3, valuePerCoin = 2) {
  for (let i = 0; i < count; i++) {
    flyingCoins.push(new FlyingCoin(startX, startY, valuePerCoin));
  }
}

class FlyingCoin {
  constructor(x, y, value = 2) {
    this.x = x;
    this.y = y;
    this.value = value;
    const ang = rnd(-Math.PI * 0.88, -Math.PI * 0.12);
    const spd = rnd(180, 420);
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.life = 0;
    this.delay = rnd(0.12, 0.28);
    this.dead = false;
    this.rot = rnd(0, PI2);
    this.rotSpd = rnd(-10, 10);
  }

  update(dt, player) {
    this.life += dt;
    this.rot += this.rotSpd * dt;

    if (this.life < this.delay) {
      this.vy += GRAVITY * dt * 0.45;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return false;
    }

    // Magnetic pull to HUD skull counter at top right
    const targetX = W - 140;
    const targetY = 32;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const d = Math.hypot(dx, dy);

    if (d < 38) {
      this.dead = true;
      if (player) {
        player.skulls += this.value;
        if (window.game) window.game.totalSkulls += this.value;
      }
      soundFX.playGemCollect();
      triggerHudGemPulse();
      spawnFloatingText(`+${this.value} 💀`, targetX - 20, targetY + 30, { color: '#ffd700', size: 18, life: 0.6 });
      return true;
    }

    const homingSpeed = lerp(550, 1800, clamp((this.life - this.delay) * 2.2, 0, 1));
    this.vx = (dx / d) * homingSpeed;
    this.vy = (dy / d) * homingSpeed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return false;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    // Golden halo glow
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;

    // Gold coin body
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, PI2);
    ctx.fill();

    ctx.fillStyle = '#d4ac0d';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, PI2);
    ctx.fill();

    // Skull icon inside coin
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', 0, 0);

    ctx.restore();
  }
}

function updateFlyingCoins(dt, player) {
  for (let i = flyingCoins.length - 1; i >= 0; i--) {
    const c = flyingCoins[i];
    c.update(dt, player);
    if (c.dead) flyingCoins.splice(i, 1);
  }
}

function drawFlyingCoins() {
  for (const c of flyingCoins) c.draw();
}

function triggerHudGemPulse() {
  const el = document.getElementById('hud-gems');
  if (el) {
    el.classList.remove('coin-pulse');
    void el.offsetWidth; // trigger reflow
    el.classList.add('coin-pulse');
  }
}

// ─────────────────────────────────────────────
//  GROUND DECALS (ZOMBIE BLOOD & SLIME)
// ─────────────────────────────────────────────
const decals = [];
function addDecal(x, y, radius, color = 'rgba(70, 100, 40, 0.75)') {
  if (decals.length > 150) decals.shift();
  decals.push({ x, y, rx: radius * rnd(0.8, 1.4), ry: radius * rnd(0.35, 0.65), color });
}
function drawDecals() {
  for (const d of decals) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, PI2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────
//  FLYING PROPS (FLYING ZOMBIE HEADS & BUCKETS)
// ─────────────────────────────────────────────
const flyingProps = [];
function spawnDecapitatedHead(x, y, vx, vy, zombieType) {
  flyingProps.push({
    x, y, vx, vy,
    ang: 0,
    vAng: rnd(-14, 14),
    isHead: true,
    zombieType,
    life: 7,
  });
}
function spawnFlyingBucket(x, y, vx, vy) {
  flyingProps.push({
    x, y, vx, vy,
    ang: 0,
    vAng: rnd(-18, 18),
    isBucket: true,
    life: 7,
  });
}
function updateFlyingProps(dt) {
  const gy = GROUND_Y();
  for (let i = flyingProps.length - 1; i >= 0; i--) {
    const p = flyingProps[i];
    p.life -= dt;
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ang += p.vAng * dt;
    if (p.y > gy - 8) {
      p.y = gy - 8;
      p.vy = -p.vy * 0.35;
      p.vx *= 0.65;
      p.vAng *= 0.5;
    }
    if (p.life <= 0) flyingProps.splice(i, 1);
  }
}
function drawFlyingProps() {
  for (const p of flyingProps) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    if (p.isBucket) {
      // Spinning galvanized bucket
      ctx.fillStyle = '#7f8c8d';
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-13, -15);
      ctx.lineTo(13, -15);
      ctx.lineTo(10, 11);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (p.isHead) {
      const col = p.zombieType === 'crawler' ? '#8e44ad' : p.zombieType === 'bloater' ? '#5a8234' : '#4e6d3c';
      ctx.fillStyle = '#1e272e';
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, PI2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, PI2); ctx.fill();
      // Dead glowing X eyes
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
      ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  SCREEN DAMAGE VIGNETTE FLASH
// ─────────────────────────────────────────────
let lastVignetteTime = 0;
function triggerDamageVignette() {
  const now = performance.now();
  if (now - lastVignetteTime < 350) return;
  lastVignetteTime = now;
  const v = document.getElementById('damage-vignette');
  if (!v) return;
  v.classList.add('active');
  setTimeout(() => {
    if (v) v.classList.remove('active');
  }, 200);
}

// ─────────────────────────────────────────────
//  FORTRESS TOWER & BARRICADE
// ─────────────────────────────────────────────
const tower = {
  get x() { return W * 0.16; },
  width: 140,
  height: 115,
  get topY() { return GROUND_Y() - this.height; },
  maxHP: 300,
  hp: 300,
  hasSpikes: false,
  hasCaltrops: false,
  hasTarMoat: false,
  sentryLevel: 0,
  sentryTimer: 0,
  hasBanner: false,
  bannerLevel: 0,
  bannerRegenTimer: 0,

  takeDamage(amount) {
    if (amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    soundFX.playArmorHit();
    triggerDamageVignette();
    spawnWoodSplinters(this.x + this.width / 2 + 10, GROUND_Y() - 30, 6);
    spawnFloatingText('-' + Math.round(amount) + ' 🏰', this.x + this.width / 2 + 20, GROUND_Y() - 50, { color: '#e67e22', size: 22, scale: 1.8 });
    if (window.game) window.game.shakeScreen(6, 0.2);
    if (this.hp <= 0) {
      this.hp = 0;
      if (window.game) window.game.showGameOver('Tower Barricade Destroyed!');
    }
  },

  repair(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
    spawnFloatingText('+' + amount + ' TOWER HP 🛡️', this.x, this.topY - 30, { color: '#2ecc71', size: 24, scale: 1.8 });
  },

  update(dt, g) {
    // Sentry roof turret auto-firing at nearest zombie ahead of tower
    if (this.sentryLevel > 0 && g && g.state === 'playing') {
      this.sentryTimer -= dt;
      if (this.sentryTimer <= 0) {
        this.sentryTimer = Math.max(0.65, 1.3 - this.sentryLevel * 0.22);
        let target = null;
        let minDist = 999999;
        const sx = this.x + this.width / 2 + 5;
        const sy = this.topY - 40;
        for (const z of g.enemies) {
          if (!z.dead && z.x > sx) {
            const d = dist(sx, sy, z.x, z.y - 40 * z.scale);
            if (d < minDist) {
              minDist = d;
              target = z;
            }
          }
        }
        if (target) {
          const dx = target.x - sx;
          const dy = (target.y - 45 * target.scale) - sy;
          const ang = Math.atan2(dy, dx);
          const spd = 1100;
          const arrowDmg = 26 + this.sentryLevel * 12;
          g.arrows.push(new Arrow(sx, sy, Math.cos(ang) * spd, Math.sin(ang) * spd, 'player1', { damage: arrowDmg, type: 'normal' }));
          soundFX.playBowRelease(0.75);
          spawnFloatingText('🎯 SENTRY!', sx, sy - 16, { color: '#ffd700', size: 14 });
        }
      }
    }

    // War Banner HP regeneration
    if (this.hasBanner && g && g.state === 'playing') {
      this.bannerRegenTimer = (this.bannerRegenTimer || 0) - dt;
      if (this.bannerRegenTimer <= 0) {
        this.bannerRegenTimer = 4.0;
        if (this.hp < this.maxHP) {
          const heal = 12 * (this.bannerLevel || 1);
          this.hp = Math.min(this.maxHP, this.hp + heal);
          spawnFloatingText(`+${heal} 🏰`, this.x + 30, this.topY - 20, { color: '#2ecc71', size: 18 });
        }
      }
    }
  },

  draw() {
    const tx = this.x;
    const ty = this.topY;
    const gy = GROUND_Y();
    const w = this.width;

    ctx.save();

    // 1. Caltrop Moat (sharp steel spike field in dirt)
    if (this.hasCaltrops) {
      const frontX = tx + w / 2 + 20;
      ctx.strokeStyle = '#bdc3c7';
      ctx.lineWidth = 2.2;
      for (let c = 0; c < 12; c++) {
        const cx = frontX + c * 12 + ((c % 2) * 5);
        const cy = gy - 2;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy); ctx.lineTo(cx, cy - 9); ctx.lineTo(cx + 5, cy);
        ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy);
        ctx.stroke();
      }
    }

    // 2. Flaming Tar Trench
    if (this.hasTarMoat) {
      const pitX = tx + w / 2 + 8;
      const pitW = 95;
      // Dark boiling ditch
      ctx.fillStyle = '#140c06';
      ctx.fillRect(pitX, gy - 3, pitW, 9);
      // Molten tar core
      ctx.fillStyle = '#d35400';
      ctx.fillRect(pitX + 4, gy - 2, pitW - 8, 5);
      // Flickering fiery tongues
      ctx.fillStyle = '#e74c3c';
      for (let f = 0; f < 6; f++) {
        const fx = pitX + 8 + f * 15;
        const fh = 9 + Math.sin(Date.now() * 0.014 + f * 1.5) * 6;
        ctx.beginPath();
        ctx.moveTo(fx - 4, gy);
        ctx.lineTo(fx, gy - fh);
        ctx.lineTo(fx + 4, gy);
        ctx.fill();
      }
    }

    // Heavy timber pillars
    ctx.fillStyle = '#2d1806';
    ctx.fillRect(tx - w / 2 + 8, ty + 12, 18, gy - ty - 12);
    ctx.fillRect(tx + w / 2 - 26, ty + 12, 18, gy - ty - 12);
    ctx.fillRect(tx - 9, ty + 12, 18, gy - ty - 12);

    // Cross brace beams
    ctx.strokeStyle = '#1e0e03';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(tx - w / 2 + 16, ty + 24);
    ctx.lineTo(tx + w / 2 - 16, gy);
    ctx.moveTo(tx + w / 2 - 16, ty + 24);
    ctx.lineTo(tx - w / 2 + 16, gy);
    ctx.stroke();

    // Defensive barricade spikes facing incoming zombies
    ctx.fillStyle = this.hasSpikes ? '#7f8c8d' : '#4a2810';
    for (let i = 0; i < 4; i++) {
      const sy = gy - 15 - i * 16;
      ctx.beginPath();
      ctx.moveTo(tx + w / 2 - 10, sy);
      ctx.lineTo(tx + w / 2 + (this.hasSpikes ? 32 : 24), sy + 6);
      ctx.lineTo(tx + w / 2 - 10, sy + 12);
      ctx.fill();
      if (this.hasSpikes) {
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Wooden deck platform
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(tx - w / 2 - 12, ty, w + 24, 16);
    ctx.fillStyle = '#6b3c1b';
    ctx.fillRect(tx - w / 2 - 12, ty, w + 24, 4);

    // Deck planks
    ctx.strokeStyle = '#1e0e03';
    ctx.lineWidth = 2;
    for (let x = tx - w / 2; x < tx + w / 2; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x, ty + 16);
      ctx.stroke();
    }

    // Defensive Railing
    ctx.fillStyle = '#3a1f0a';
    ctx.fillRect(tx - w / 2 - 8, ty - 32, 10, 32);
    ctx.fillRect(tx + w / 2 - 2, ty - 32, 10, 32);
    ctx.fillRect(tx - w / 2 - 10, ty - 36, w + 20, 8);

    // 3. Auto-Crossbow Turret mounted on front railing
    if (this.sentryLevel > 0) {
      const sentryX = tx + w / 2 - 4;
      const sentryY = ty - 42;
      // Metal tripod
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sentryX - 8, ty - 32); ctx.lineTo(sentryX, sentryY); ctx.lineTo(sentryX + 8, ty - 32);
      ctx.stroke();
      // Crossbow body
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(sentryX - 6, sentryY - 3, 22, 6);
      // Steel crossbow bow limbs
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sentryX + 10, sentryY - 14);
      ctx.quadraticCurveTo(sentryX + 2, sentryY, sentryX + 10, sentryY + 14);
      ctx.stroke();
      // Red laser / lens sight
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(sentryX + 16, sentryY, 2.5, 0, PI2);
      ctx.fill();
    }

    // 4. War Banner of Valor mounted on rear post
    if (this.hasBanner) {
      const poleX = tx - w / 2 + 6;
      const poleY = ty - 68;
      // Gold-tipped standard
      ctx.strokeStyle = '#d4ac0d';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(poleX, ty); ctx.lineTo(poleX, poleY);
      ctx.stroke();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(poleX, poleY, 4, 0, PI2); ctx.fill();
      // Fluttering royal crimson banner
      const flap = Math.sin(Date.now() * 0.007) * 7;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(poleX, poleY + 4);
      ctx.lineTo(poleX + 32 + flap, poleY + 12);
      ctx.lineTo(poleX + 26 + flap, poleY + 22);
      ctx.lineTo(poleX + 32 + flap, poleY + 32);
      ctx.lineTo(poleX, poleY + 24);
      ctx.closePath();
      ctx.fill();
      // Lion crest insignia
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(poleX + 14, poleY + 18, 4, 0, PI2); ctx.fill();
    }

    // Fortress Torch
    const torchX = tx - w / 2 - 16;
    const torchY = ty - 14;
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(torchX - 3, torchY, 6, 22);
    ctx.fillStyle = '#222';
    ctx.fillRect(torchX - 6, torchY - 4, 12, 6);

    // Torch flame glow
    const torchGrd = ctx.createRadialGradient(torchX, torchY - 8, 2, torchX, torchY - 8, 35);
    torchGrd.addColorStop(0, 'rgba(255, 160, 0, 0.85)');
    torchGrd.addColorStop(0.5, 'rgba(255, 60, 0, 0.35)');
    torchGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = torchGrd;
    ctx.beginPath();
    ctx.arc(torchX, torchY - 8, 35, 0, PI2);
    ctx.fill();

    // Flame Core
    ctx.fillStyle = '#fff382';
    ctx.beginPath();
    ctx.arc(torchX, torchY - 8 + Math.sin(Date.now() * 0.012) * 2, 7, 0, PI2);
    ctx.fill();

    ctx.restore();
  }
};
window.tower = tower;

// ─────────────────────────────────────────────
//  PARTICLES & COMBAT JUICE
// ─────────────────────────────────────────────
const particles = [];

function spawnParticle(x, y, opts = {}) {
  particles.push({
    x, y,
    vx: opts.vx ?? rnd(-150, 150),
    vy: opts.vy ?? rnd(-300, -60),
    r: opts.r ?? rnd(3, 7),
    color: opts.color ?? '#fff',
    alpha: 1,
    life: opts.life ?? rnd(0.4, 1.0),
    decay: 0,
    grav: opts.grav ?? true,
    isBlood: opts.isBlood ?? false,
    bloodColor: opts.bloodColor ?? 'rgba(40, 80, 20, 0.7)',
  });
}

function spawnZombieBlood(x, y, count = 12, isGreen = true) {
  for (let i = 0; i < count; i++) {
    const col = isGreen
      ? `hsl(${rnd(85, 125)}, 85%, ${rnd(25, 45)}%)`
      : `hsl(${rnd(0, 15)}, 90%, ${rnd(30, 50)}%)`;
    spawnParticle(x, y, {
      vx: rnd(-240, 240), vy: rnd(-360, -40),
      r: rnd(2.5, 6), color: col,
      life: rnd(0.4, 0.9), isBlood: true,
      bloodColor: isGreen ? 'rgba(50, 95, 25, 0.75)' : 'rgba(120, 10, 10, 0.75)',
    });
  }
}

function spawnBoneShards(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x, y, {
      vx: rnd(-260, 260), vy: rnd(-340, -120),
      r: rnd(2.5, 5), color: '#ecf0f1',
      life: rnd(0.5, 0.9), grav: true,
    });
  }
}

function spawnAcidSplash(x, y, count = 35) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x, y, {
      vx: rnd(-380, 380), vy: rnd(-420, -50),
      r: rnd(4, 9), color: ['#2ecc71', '#a8ff78', '#1abc9c', '#f1c40f'][~~rnd(0, 4)],
      life: rnd(0.6, 1.2), isBlood: true,
      bloodColor: 'rgba(46, 204, 113, 0.8)',
    });
  }
}

function spawnSparks(x, y, count = 14) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x, y, {
      vx: rnd(-220, 220), vy: rnd(-260, 60),
      r: rnd(2, 4), color: ['#fff', '#ffd700', '#ff9900'][~~rnd(0, 3)],
      life: rnd(0.15, 0.35), grav: true,
    });
  }
}

function spawnWoodSplinters(x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x, y, {
      vx: rnd(-120, 160), vy: rnd(-220, -40),
      r: rnd(2, 5), color: ['#5c3a21', '#7a4e2d', '#3a2210'][~~rnd(0, 3)],
      life: rnd(0.3, 0.7), grav: true,
    });
  }
}

function spawnIceShards(x, y, count = 18) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x, y, {
      vx: rnd(-250, 250), vy: rnd(-300, -50),
      r: rnd(3, 7), color: ['#74b9ff', '#0984e3', '#dfe6e9', '#ffffff'][~~rnd(0, 4)],
      life: rnd(0.4, 0.8), grav: true,
    });
  }
}

function spawnExplosion(x, y, radius = 140) {
  for (let i = 0; i < 40; i++) {
    spawnParticle(x, y, {
      vx: rnd(-radius * 4, radius * 4),
      vy: rnd(-radius * 5, -radius),
      r: rnd(4, 13),
      color: ['#f5a623', '#e05e2e', '#ff3838', '#ffea00'][~~rnd(0, 4)],
      life: rnd(0.5, 1.4),
    });
  }
  activeShockwaves.push({ x, y, r: 0, maxR: radius, alpha: 0.95 });
  addDecal(x, GROUND_Y(), radius * 0.65, 'rgba(20, 20, 20, 0.75)');
}

const activeShockwaves = [];
const activeVortices = [];

function spawnBlackHole(x, y) {
  soundFX.playExplosion();
  activeVortices.push({
    x, y,
    r: 175,
    life: 2.2,
    maxLife: 2.2,
    angle: 0
  });
  spawnFloatingText('🌀 GRAVITY VORTEX!', x, y - 45, { color: '#a29bfe', size: 24, scale: 2.0 });
  if (window.game) window.game.shakeScreen(8, 0.3);
}

function updateVortices(dt, enemies) {
  for (let i = activeVortices.length - 1; i >= 0; i--) {
    const v = activeVortices[i];
    v.life -= dt;
    v.angle += dt * 8;
    if (Math.random() < 0.4) {
      const a = rnd(0, PI2);
      const rad = rnd(35, v.r);
      spawnParticle(v.x + Math.cos(a) * rad, v.y + Math.sin(a) * rad, {
        vx: -Math.cos(a) * 190,
        vy: -Math.sin(a) * 190,
        r: rnd(2, 4),
        color: '#9b59b6',
        grav: false,
        life: 0.25
      });
    }

    // Pull nearby zombies into center & deal crush DPS
    for (const z of enemies) {
      if (z.dead) continue;
      const d = dist(v.x, v.y, z.x, z.y - 40 * z.scale);
      if (d < v.r) {
        const pullStr = (1 - d / v.r) * 320 * dt;
        const dx = v.x - z.x;
        const dy = (v.y) - (z.y - 40 * z.scale);
        const ang = Math.atan2(dy, dx);
        z.x += Math.cos(ang) * pullStr;
        z.takeDamage(40 * dt, 0, 0, false);
      }
    }

    if (v.life <= 0) activeVortices.splice(i, 1);
  }
}

function drawVortices() {
  for (const v of activeVortices) {
    ctx.save();
    ctx.translate(v.x, v.y);
    const alpha = clamp(v.life / v.maxLife, 0, 1);
    ctx.globalAlpha = alpha;

    // Glowing purple event horizon
    const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 50);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.3, '#341f97');
    grad.addColorStop(0.8, '#5f27cd');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, PI2);
    ctx.fill();

    // Swirling spiral arms
    ctx.rotate(v.angle);
    ctx.strokeStyle = '#a29bfe';
    ctx.lineWidth = 2.5;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let r = 8; r < 45; r += 3) {
        const th = (arm * PI2 / 3) + (r * 0.12);
        const px = Math.cos(th) * r;
        const py = Math.sin(th) * r;
        if (r === 8) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

function updateParticles(dt) {
  const gy = GROUND_Y();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.decay += dt;
    const t = p.decay / p.life;
    p.alpha = 1 - t;
    if (p.grav) p.vy += GRAVITY * dt * 0.45;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > gy) {
      p.y = gy;
      if (p.isBlood && Math.random() < 0.28) {
        addDecal(p.x, gy, p.r * 1.5, p.bloodColor);
      }
      p.vy *= -BOUNCE;
      p.vx *= 0.65;
    }
    if (p.alpha <= 0) particles.splice(i, 1);
  }
  for (let i = activeShockwaves.length - 1; i >= 0; i--) {
    const s = activeShockwaves[i];
    s.r += 440 * dt;
    s.alpha -= 0.05;
    if (s.alpha <= 0) activeShockwaves.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.alpha, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, PI2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const s of activeShockwaves) {
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = '#f5a623';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, PI2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────
//  PROJECTILE ARROWS
// ─────────────────────────────────────────────
class Arrow {
  constructor(x, y, vx, vy, owner, opts = {}) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner = owner;   // 'player1' | 'enemy'
    this.damage = opts.damage ?? 25;
    this.type = opts.type ?? 'normal'; // normal|fire|ice|buzzsaw|tesla|cluster|holy|viper|ballista|vampire|blackhole
    this.dead = false;
    this.stuck = false;
    this.stuckAngle = 0;
    this.wobble = 0;
    const basePierce = opts.type === 'ballista' ? 5 : opts.type === 'holy' ? 4 : opts.type === 'buzzsaw' ? 3 : 1;
    this.pierceCount = basePierce + (opts.bonusPierce || 0);
    this.hitEntities = new Set();
    this.trail = [];
    this.trailMax = 12;
    this.sawAngle = 0;
  }

  get angle() {
    return Math.atan2(this.vy, this.vx);
  }

  update(dt) {
    if (this.stuck) {
      if (this.wobble > 0) this.wobble -= dt;
      return;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailMax) this.trail.shift();

    this.vy += GRAVITY * dt * 0.52;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.type === 'buzzsaw') {
      this.sawAngle += dt * 35;
    }

    // Special particles during flight
    if (this.type === 'fire' && Math.random() < 0.45) {
      spawnParticle(this.x, this.y, {
        vx: rnd(-30, 30), vy: rnd(-70, -20),
        r: rnd(2, 5), color: `hsl(${rnd(15, 45)}, 100%, 60%)`,
        life: 0.25, grav: false,
      });
    } else if (this.type === 'ice' && Math.random() < 0.35) {
      spawnParticle(this.x, this.y, {
        vx: rnd(-20, 20), vy: rnd(-40, 10),
        r: rnd(2, 4), color: '#74b9ff', life: 0.25, grav: false,
      });
    } else if (this.type === 'viper' && Math.random() < 0.4) {
      spawnParticle(this.x, this.y, {
        vx: rnd(-15, 15), vy: rnd(-40, 0),
        r: rnd(2, 4), color: '#2ed573', life: 0.22, grav: false,
      });
    } else if (this.type === 'vampire' && Math.random() < 0.4) {
      spawnParticle(this.x, this.y, {
        vx: rnd(-20, 20), vy: rnd(-50, 10),
        r: rnd(2, 4.5), color: '#ff4757', life: 0.25, grav: false,
      });
    } else if (this.type === 'blackhole' && Math.random() < 0.4) {
      spawnParticle(this.x, this.y, {
        vx: rnd(-20, 20), vy: rnd(-20, 20),
        r: rnd(2, 4), color: '#a29bfe', life: 0.22, grav: false,
      });
    }

    // Off-screen
    if (this.x < -120 || this.x > W + 120 || this.y > H + 120) this.dead = true;

    // Ground or Tower collision
    const gy = GROUND_Y();
    const onTower = (this.x >= tower.x - tower.width / 2 && this.x <= tower.x + tower.width / 2 && this.y >= tower.topY && this.y <= tower.topY + 16);
    if (this.y > gy || onTower) {
      this.y = onTower ? tower.topY + 2 : gy;
      this.stuck = true;
      this.stuckAngle = this.angle;
      this.wobble = 0.45;
      soundFX.playArmorHit();

      if (this.type === 'cluster') {
        spawnExplosion(this.x, this.y, 140);
        soundFX.playExplosion();
        this.dead = true;
      } else if (this.type === 'blackhole') {
        spawnBlackHole(this.x, this.y);
        this.dead = true;
      }
    }
  }

  draw() {
    // Flying trail
    const trailColors = {
      fire: '#ff7675',
      ice: '#74b9ff',
      tesla: '#a29bfe',
      viper: '#2ed573',
      ballista: '#a4b0be',
      vampire: '#ff4757',
      blackhole: '#9b59b6',
      holy: '#f9ca24',
      cluster: '#f39c12'
    };
    const trailCol = trailColors[this.type] || '#f5a623';

    for (let i = 0; i < this.trail.length - 1; i++) {
      const a = i / this.trail.length;
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = trailCol;
      ctx.lineWidth = (this.type === 'ballista' ? 4 : 2.5) * a;
      ctx.beginPath();
      ctx.moveTo(this.trail[i].x, this.trail[i].y);
      ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    let drawAng = this.stuck ? this.stuckAngle : this.angle;
    if (this.stuck && this.wobble > 0) {
      drawAng += Math.sin(this.wobble * 45) * this.wobble * 0.4;
    }
    ctx.rotate(drawAng);

    if (this.type === 'buzzsaw') {
      ctx.save();
      ctx.rotate(this.sawAngle);
      ctx.fillStyle = '#bdc3c7';
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * PI2;
        const r1 = 12, r2 = 6;
        ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.lineTo(Math.cos(ang + 0.3) * r2, Math.sin(ang + 0.3) * r2);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (this.type === 'ballista') {
      // Massive heavy siege harpoon bolt
      const len = 46;
      const tipX = len / 2;
      const tailX = -len / 2;

      ctx.strokeStyle = '#2f3542';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(tailX, 0);
      ctx.lineTo(tipX - 10, 0);
      ctx.stroke();

      // Heavy barbed steel harpoon tip
      ctx.fillStyle = '#dfe4ea';
      ctx.strokeStyle = '#2f3542';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(tipX + 6, 0);
      ctx.lineTo(tipX - 8, -7);
      ctx.lineTo(tipX - 4, 0);
      ctx.lineTo(tipX - 8, 7);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Steel fins at tail
      ctx.fillStyle = '#747d8c';
      ctx.beginPath();
      ctx.moveTo(tailX, 0);
      ctx.lineTo(tailX + 11, -7);
      ctx.lineTo(tailX + 8, 0);
      ctx.lineTo(tailX + 11, 7);
      ctx.closePath();
      ctx.fill();
    } else {
      const len = 32;
      const tipX = len / 2;
      const tailX = -len / 2;

      // Wooden shaft
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(tailX, 0);
      ctx.lineTo(tipX - 6, 0);
      ctx.stroke();

      // Metallic arrowhead
      const headCols = {
        fire: '#ff3838',
        ice: '#00d2d3',
        tesla: '#a29bfe',
        viper: '#2ed573',
        vampire: '#ff4757',
        blackhole: '#9b59b6',
        holy: '#ffd700'
      };
      ctx.fillStyle = headCols[this.type] || '#ecf0f1';
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(tipX - 8, -5);
      ctx.lineTo(tipX - 6, 0);
      ctx.lineTo(tipX - 8, 5);
      ctx.closePath();
      ctx.fill();

      // Fletching feathers
      ctx.fillStyle = this.owner === 'enemy' ? '#e74c3c' : '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(tailX, 0);
      ctx.lineTo(tailX + 9, -5);
      ctx.lineTo(tailX + 7, 0);
      ctx.lineTo(tailX + 9, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  PICKUPS (GEMS, HEALTH APPLES & SKULL SACKS)
// ─────────────────────────────────────────────
class Pickup {
  constructor(x, y, type = 'apple') {
    this.x = x; this.y = y;
    this.type = type; // 'apple' | 'gem'
    this.vy = -180;
    this.vx = rnd(-60, 60);
    this.dead = false;
    this.groundY = GROUND_Y();
    this.bobT = rnd(0, PI2);
    this.life = 0;
    this.isHoming = false;
  }

  update(dt, player) {
    this.life += dt;
    this.bobT += dt * 3;

    if (!player || player.dead) return;

    // After 0.8s, engage homing flight toward archer on tower
    if (this.life > 0.8) {
      this.isHoming = true;
    }

    if (this.isHoming) {
      // Homing flight straight to archer's torso on the tower deck
      const targetX = player.x;
      const targetY = player.y - 35;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const d = Math.hypot(dx, dy);

      const speed = Math.min(650, 260 + this.life * 140);
      this.x += (dx / (d || 1)) * speed * dt;
      this.y += (dy / (d || 1)) * speed * dt;

      // Collect when reaching player or reaching deck X/Y
      if (d < 50 || (Math.abs(dx) < 30 && this.y <= targetY + 25)) {
        this.collect(player);
      }
    } else {
      // Natural ballistic drop to ground before homing
      if (this.y < this.groundY - 14) {
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else {
        this.y = this.groundY - 14;
        this.vx *= 0.85;
      }
    }
  }

  collect(player) {
    if (this.dead) return;
    this.dead = true;
    soundFX.playGemCollect();
    if (this.type === 'apple') {
      player.hp = Math.min(player.maxHP, player.hp + 25);
      spawnFloatingText('+25 HP ❤️', player.x, player.y - 60, { color: '#2ecc71', size: 24 });
      spawnSparks(player.x, player.y - 40, 8);
    } else {
      player.skulls += 10;
      spawnFloatingText('+10 💀', player.x, player.y - 60, { color: '#ffd700', size: 24 });
      triggerHudGemPulse();
    }
  }

  draw() {
    ctx.save();
    const bobOffset = this.isHoming ? 0 : Math.sin(this.bobT) * 4;
    ctx.translate(this.x, this.y + bobOffset);

    // Soft aura glow
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, PI2);
    ctx.fillStyle = this.type === 'apple' ? 'rgba(231, 76, 60, 0.28)' : 'rgba(245, 166, 35, 0.28)';
    ctx.fill();

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type === 'apple' ? '🍎' : '💰', 0, 0);
    ctx.restore();
  }
}
window.Pickup = Pickup;

// ─────────────────────────────────────────────
//  RAGDOLL SKELETON WITH KINEMATIC INTEGRITY
// ─────────────────────────────────────────────
class RagdollBody {
  constructor(x, y, scale = 1, isZombie = false, zombieType = 'walker') {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.isZombie = isZombie;
    this.zombieType = zombieType;

    this.isRagdoll = false;
    this.dead = false;
    this.decapitated = false;

    this.faceDir = 1;
    this.aimAngle = 0;
    this.bowDrawFrac = 0;
    this.walkTime = 0;
    this.isWalking = false;

    this.arrowsEmbedded = [];

    // Joint positions
    this.joints = [];
    for (let i = 0; i < 16; i++) {
      this.joints.push({ x, y, px: x, py: y, vx: 0, vy: 0 });
    }
    this.updateKinematicPose();
  }

  updateKinematicPose() {
    const s = this.scale;
    const gx = this.x;
    const gy = this.y;
    const j = this.joints;

    // Special quadruped pose for Feral Crawlers!
    if (this.isZombie && this.zombieType === 'crawler') {
      const crawlAmp = this.isWalking ? 12 * s : 0;
      const sin1 = Math.sin(this.walkTime * 1.5);
      const sin2 = Math.sin(this.walkTime * 1.5 + Math.PI);

      // Low arched spine
      j[3].x = gx + this.faceDir * 18 * s;
      j[3].y = gy - 20 * s;

      j[2].x = gx;
      j[2].y = gy - 24 * s;

      j[1].x = gx - this.faceDir * 16 * s;
      j[1].y = gy - 20 * s;

      // Low snarling head
      j[0].x = gx - this.faceDir * 28 * s;
      j[0].y = gy - 16 * s;

      // Hind legs
      j[10].x = j[3].x; j[10].y = j[3].y;
      j[11].x = j[3].x + sin1 * crawlAmp * 0.7; j[11].y = gy - 10 * s;
      j[12].x = j[3].x + sin1 * crawlAmp; j[12].y = gy;

      j[13].x = j[3].x; j[13].y = j[3].y;
      j[14].x = j[3].x + sin2 * crawlAmp * 0.7; j[14].y = gy - 10 * s;
      j[15].x = j[3].x + sin2 * crawlAmp; j[15].y = gy;

      // Front forelimbs (paws)
      j[4].x = j[1].x; j[4].y = j[1].y;
      j[5].x = j[1].x + sin2 * crawlAmp * 0.7; j[5].y = gy - 10 * s;
      j[6].x = j[1].x + sin2 * crawlAmp; j[6].y = gy;

      j[7].x = j[1].x; j[7].y = j[1].y;
      j[8].x = j[1].x + sin1 * crawlAmp * 0.7; j[8].y = gy - 10 * s;
      j[9].x = j[1].x + sin1 * crawlAmp; j[9].y = gy;
      return;
    }

    // Standard Bipedal Pose
    j[3].x = gx;
    j[3].y = gy - 46 * s;

    j[2].x = gx - this.faceDir * 2 * s;
    j[2].y = gy - 70 * s;

    j[1].x = gx - this.faceDir * 1 * s;
    j[1].y = gy - 86 * s;

    j[0].x = gx + this.faceDir * 3 * s;
    j[0].y = gy - 104 * s;

    // Legs
    const walkAmp = this.isWalking ? 16 * s : 0;
    const sin1 = Math.sin(this.walkTime);
    const sin2 = Math.sin(this.walkTime + Math.PI);

    j[10].x = gx - 6 * s;
    j[10].y = gy - 46 * s;
    j[11].x = gx - 6 * s + sin1 * walkAmp * 0.6;
    j[11].y = gy - 23 * s;
    j[12].x = gx - 6 * s + sin1 * walkAmp;
    j[12].y = gy;

    j[13].x = gx + 6 * s;
    j[13].y = gy - 46 * s;
    j[14].x = gx + 6 * s + sin2 * walkAmp * 0.6;
    j[14].y = gy - 23 * s;
    j[15].x = gx + 6 * s + sin2 * walkAmp;
    j[15].y = gy;

    // Arms - Strict single-angle alignment with aim direction
    const aimDirX = Math.cos(this.aimAngle);
    const aimDirY = Math.sin(this.aimAngle);

    // Shoulder anchor
    j[7].x = j[1].x + 6 * s;
    j[7].y = j[1].y + 4 * s;
    // Bow arm extending directly along aimAngle
    j[8].x = j[7].x + aimDirX * 18 * s;
    j[8].y = j[7].y + aimDirY * 18 * s;
    j[9].x = j[7].x + aimDirX * 36 * s;
    j[9].y = j[7].y + aimDirY * 36 * s;

    // Pulling arm drawing back string along opposite of aimAngle
    j[4].x = j[1].x - 6 * s;
    j[4].y = j[1].y + 4 * s;
    const pullDist = (12 + this.bowDrawFrac * 22) * s;
    j[6].x = j[9].x - aimDirX * pullDist;
    j[6].y = j[9].y - aimDirY * pullDist;
    j[5].x = (j[4].x + j[6].x) / 2 - aimDirY * 10 * s;
    j[5].y = (j[4].y + j[6].y) / 2 + aimDirX * 10 * s;
  }

  triggerRagdoll(impX = 0, impY = -200) {
    this.isRagdoll = true;
    for (const jt of this.joints) {
      jt.px = jt.x - (impX * 0.05 + rnd(-4, 4));
      jt.py = jt.y - (impY * 0.05 + rnd(-4, 0));
    }
  }

  update(dt) {
    if (!this.isRagdoll) {
      this.updateKinematicPose();
      return;
    }

    const gy = GROUND_Y();
    const tx = tower.x;
    const tw = tower.width;
    const deckY = tower.topY;

    for (const jt of this.joints) {
      const vx = (jt.x - jt.px) * FRICTION;
      const vy = (jt.y - jt.py) * FRICTION;
      jt.px = jt.x;
      jt.py = jt.y;
      jt.x += vx;
      jt.y += vy + GRAVITY * dt * dt;

      // Platform collision: Player ragdoll joints bounce on tower deck floor
      const onDeck = (jt.x >= tx - tw / 2 - 18 && jt.x <= tx + tw / 2 + 18);
      const floorY = (!this.isZombie && onDeck) ? deckY : gy;

      if (jt.y > floorY) {
        jt.y = floorY;
        jt.py = jt.y + (jt.y - jt.py) * BOUNCE;
      }
    }
  }

  embedArrow(jointIdx, offX, offY, angle, type = 'normal') {
    this.arrowsEmbedded.push({ jointIdx, offX, offY, angle, type });
  }

  draw(opts = {}) {
    const s = this.scale;
    const j = this.joints;
    const isHitFlash = opts.hitFlash || false;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(this.x, GROUND_Y() - 2, 28 * s, 7 * s, 0, 0, PI2);
    ctx.fill();

    const skinCol = isHitFlash ? '#ffffff' : (opts.skinColor || '#4e6d3c');
    const clothCol = isHitFlash ? '#ffffff' : (opts.clothesColor || '#2d3436');
    const outlineCol = isHitFlash ? '#ffffff' : '#111';

    const drawBone = (p1, p2, w, col) => {
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = w + 3 * s;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    };

    // Legs
    drawBone(j[10], j[11], 7 * s, clothCol);
    drawBone(j[11], j[12], 6 * s, skinCol);
    drawBone(j[13], j[14], 7 * s, clothCol);
    drawBone(j[14], j[15], 6 * s, skinCol);

    // Torso
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 14 * s;
    ctx.beginPath(); ctx.moveTo(j[1].x, j[1].y); ctx.lineTo(j[3].x, j[3].y); ctx.stroke();
    ctx.strokeStyle = clothCol;
    ctx.lineWidth = 11 * s;
    ctx.beginPath(); ctx.moveTo(j[1].x, j[1].y); ctx.lineTo(j[3].x, j[3].y); ctx.stroke();

    // Exposed rib bones on Walkers & Crawlers
    if (this.isZombie && !isHitFlash && (this.zombieType === 'walker' || this.zombieType === 'crawler')) {
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 2 * s;
      for (let r = 0; r < 3; r++) {
        const ry = lerp(j[1].y, j[3].y, 0.35 + r * 0.22);
        ctx.beginPath();
        ctx.moveTo(j[2].x - 6 * s, ry);
        ctx.lineTo(j[2].x + 6 * s, ry + 2 * s);
        ctx.stroke();
      }
    }

    // Bloater giant toxic belly
    if (this.isZombie && this.zombieType === 'bloater') {
      const bellyX = (j[2].x + j[3].x) / 2;
      const bellyY = (j[2].y + j[3].y) / 2 + 6 * s;
      const bellyR = 26 * s + Math.sin(Date.now() * 0.008) * 2;

      ctx.save();
      const bGrd = ctx.createRadialGradient(bellyX, bellyY, 4, bellyX, bellyY, bellyR);
      bGrd.addColorStop(0, isHitFlash ? '#ffffff' : '#a8ff78');
      bGrd.addColorStop(0.7, isHitFlash ? '#ffffff' : '#2ecc71');
      bGrd.addColorStop(1, isHitFlash ? '#ffffff' : '#1b5e20');
      ctx.fillStyle = bGrd;
      ctx.beginPath();
      ctx.arc(bellyX, bellyY, bellyR, 0, PI2);
      ctx.fill();
      ctx.strokeStyle = isHitFlash ? '#ffffff' : '#143c16';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Dripping toxic bubbles
      if (!isHitFlash && Math.random() < 0.15) {
        spawnParticle(bellyX + rnd(-bellyR * 0.7, bellyR * 0.7), bellyY + rnd(-bellyR * 0.5, bellyR * 0.5), {
          vx: rnd(-10, 10), vy: rnd(-30, -10), r: rnd(2, 4), color: '#a8ff78', grav: false, life: 0.3
        });
      }
      ctx.restore();
    }

    // Arms
    drawBone(j[4], j[5], 6 * s, skinCol);
    drawBone(j[5], j[6], 5 * s, skinCol);
    drawBone(j[7], j[8], 6 * s, skinCol);
    drawBone(j[8], j[9], 5 * s, skinCol);

    // Head
    if (!this.decapitated) {
      const hr = 14 * s;
      ctx.fillStyle = outlineCol;
      ctx.beginPath(); ctx.arc(j[0].x, j[0].y, hr + 1.5, 0, PI2); ctx.fill();
      ctx.fillStyle = skinCol;
      ctx.beginPath(); ctx.arc(j[0].x, j[0].y, hr, 0, PI2); ctx.fill();

      // Eyes
      if (!this.dead) {
        const eyeX = j[0].x + this.faceDir * 5 * s;
        const eyeY = j[0].y - 2 * s;
        ctx.fillStyle = isHitFlash ? '#fff' : (this.isZombie ? (this.zombieType === 'crawler' ? '#ff3838' : '#f1c40f') : '#ffffff');
        ctx.beginPath(); ctx.arc(eyeX, eyeY, 3.5 * s, 0, PI2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(eyeX + this.faceDir * 1.5, eyeY, 1.8 * s, 0, PI2); ctx.fill();
      } else {
        // Dead X eyes
        ctx.strokeStyle = isHitFlash ? '#fff' : '#e74c3c';
        ctx.lineWidth = 2 * s;
        const ex = j[0].x + this.faceDir * 5 * s;
        const ey = j[0].y - 2 * s;
        ctx.beginPath();
        ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4);
        ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4);
        ctx.stroke();
      }

      // Helmet (Buckethead)
      if (opts.helmet === 'bucket') {
        ctx.save();
        ctx.translate(j[0].x, j[0].y - 4 * s);
        ctx.fillStyle = isHitFlash ? '#fff' : '#7f8c8d';
        ctx.strokeStyle = isHitFlash ? '#fff' : '#2c3e50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-13 * s, -15 * s);
        ctx.lineTo(13 * s, -15 * s);
        ctx.lineTo(10 * s, 11 * s);
        ctx.lineTo(-10 * s, 11 * s);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Eye slit in bucket
        if (!isHitFlash) {
          ctx.strokeStyle = '#1e272e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-7 * s, -2 * s);
          ctx.lineTo(7 * s, -2 * s);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Necromancer Horned Skull Mask & Staff
      if (this.isZombie && this.zombieType === 'necromancer') {
        ctx.save();
        ctx.translate(j[0].x, j[0].y - 4 * s);
        // Dark purple cowl
        ctx.fillStyle = isHitFlash ? '#fff' : '#4a235a';
        ctx.beginPath();
        ctx.arc(0, -2 * s, 16 * s, -Math.PI * 0.9, Math.PI * 0.1);
        ctx.fill();

        // Horns
        if (!isHitFlash) {
          ctx.strokeStyle = '#ecf0f1';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(-8 * s, -8 * s);
          ctx.quadraticCurveTo(-18 * s, -20 * s, -12 * s, -26 * s);
          ctx.moveTo(8 * s, -8 * s);
          ctx.quadraticCurveTo(18 * s, -20 * s, 12 * s, -26 * s);
          ctx.stroke();
        }
        ctx.restore();

        // Bone Staff in hand
        ctx.save();
        ctx.translate(j[9].x, j[9].y);
        ctx.strokeStyle = isHitFlash ? '#fff' : '#ecf0f1';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 18 * s);
        ctx.lineTo(0, -32 * s);
        ctx.stroke();

        // Glowing purple void orb on staff
        if (!isHitFlash) {
          const orbY = -34 * s;
          const orbGrd = ctx.createRadialGradient(0, orbY, 2, 0, orbY, 14);
          orbGrd.addColorStop(0, '#e056fd');
          orbGrd.addColorStop(0.7, '#686de0');
          orbGrd.addColorStop(1, 'transparent');
          ctx.fillStyle = orbGrd;
          ctx.beginPath();
          ctx.arc(0, orbY, 14, 0, PI2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Gargantuar Boss Spiked Club
      if (this.isZombie && this.zombieType === 'boss') {
        ctx.save();
        ctx.translate(j[9].x, j[9].y);
        ctx.fillStyle = isHitFlash ? '#fff' : '#4a2810';
        ctx.strokeStyle = isHitFlash ? '#fff' : '#1e0e03';
        ctx.lineWidth = 3;
        ctx.fillRect(-8 * s, -55 * s, 16 * s, 65 * s);
        ctx.strokeRect(-8 * s, -55 * s, 16 * s, 65 * s);

        // Spikes on club
        if (!isHitFlash) {
          ctx.fillStyle = '#95a5a6';
          for (let sp = 0; sp < 4; sp++) {
            const spy = -50 * s + sp * 14 * s;
            ctx.beginPath();
            ctx.moveTo(-8 * s, spy);
            ctx.lineTo(-18 * s, spy + 4 * s);
            ctx.lineTo(-8 * s, spy + 8 * s);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(8 * s, spy);
            ctx.lineTo(18 * s, spy + 4 * s);
            ctx.lineTo(8 * s, spy + 8 * s);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    } else {
      // Blood fountain from severed neck!
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(j[1].x, j[1].y, 6 * s, 0, PI2);
      ctx.fill();
    }

    // Embedded arrows
    for (const ea of this.arrowsEmbedded) {
      const jt = j[ea.jointIdx] || j[0];
      ctx.save();
      ctx.translate(jt.x + ea.offX, jt.y + ea.offY);
      ctx.rotate(ea.angle);
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.fillStyle = '#bdc3c7';
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(1, -3); ctx.lineTo(1, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw Hero Archer with Hood, Cape, Quiver and Runic Bow
  drawHero(bowType = 'normal') {
    const s = this.scale;
    const j = this.joints;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Dynamic Flowing Cape pinned at shoulders
    ctx.save();
    const capeW = 20 * s;
    const capeTopX = j[1].x - 8 * s;
    const capeTopY = j[1].y;
    const wave = Math.sin(Date.now() * 0.006) * 12;
    ctx.fillStyle = '#143d20';
    ctx.beginPath();
    ctx.moveTo(capeTopX, capeTopY);
    ctx.quadraticCurveTo(capeTopX - 35 * s, capeTopY + 30 * s, capeTopX - 30 * s + wave, capeTopY + 68 * s);
    ctx.lineTo(capeTopX - 12 * s + wave, capeTopY + 65 * s);
    ctx.quadraticCurveTo(capeTopX - 18 * s, capeTopY + 30 * s, capeTopX + 8 * s, capeTopY + 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Quiver on back with arrows
    ctx.save();
    ctx.translate(j[2].x - 10 * s, j[2].y - 8 * s);
    ctx.rotate(-0.4);
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(-6 * s, -18 * s, 12 * s, 36 * s);
    // Arrows peeking out with gold feathers
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#f1c40f';
    for (let a = -1; a <= 1; a++) {
      ctx.beginPath();
      ctx.moveTo(a * 3 * s, -18 * s);
      ctx.lineTo(a * 5 * s, -28 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a * 5 * s, -28 * s);
      ctx.lineTo(a * 5 * s - 3, -25 * s);
      ctx.lineTo(a * 5 * s + 3, -25 * s);
      ctx.fill();
    }
    ctx.restore();

    // 3. Body Limbs with Leather Tunic & Bracers
    this.draw({
      skinColor: '#e0a96d',
      clothesColor: '#1e4d2b'
    });

    // 4. Hero Archer Hood / Cowl & Feather
    if (!this.dead) {
      ctx.save();
      ctx.translate(j[0].x, j[0].y);
      // Hood drape over head
      ctx.fillStyle = '#1e4d2b';
      ctx.beginPath();
      ctx.arc(0, -2 * s, 16 * s, -Math.PI * 0.9, Math.PI * 0.35);
      ctx.lineTo(-6 * s, 14 * s);
      ctx.closePath();
      ctx.fill();

      // Golden cowl trim
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -2 * s, 16 * s, -Math.PI * 0.9, Math.PI * 0.2);
      ctx.stroke();

      // Archer's Emerald Feather pinned to hood
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.moveTo(-6 * s, -14 * s);
      ctx.quadraticCurveTo(-18 * s, -24 * s, -26 * s, -22 * s);
      ctx.quadraticCurveTo(-16 * s, -16 * s, -6 * s, -14 * s);
      ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(-6 * s, -14 * s, 2.5 * s, 0, PI2); ctx.fill();

      ctx.restore();
    }

    // 5. Runic Composite Bow
    this.drawRunicBow(bowType);

    ctx.restore();
  }

  drawRunicBow(bowType = 'normal') {
    if (this.dead) return;
    const j = this.joints;
    const hx = j[9].x, hy = j[9].y;
    const ang = this.aimAngle;
    const s = this.scale;
    const bowHeight = 52 * s;
    const pullback = this.bowDrawFrac * 22 * s;

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang); // Direct aim angle alignment — NO MORE 2 ANGLES!

    const runeCol = bowType === 'fire' ? '#ff4757' : bowType === 'ice' ? '#00d2d3' : bowType === 'tesla' ? '#a29bfe' : bowType === 'cluster' ? '#ffa502' : bowType === 'viper' ? '#2ed573' : bowType === 'ballista' ? '#ced6e0' : bowType === 'vampire' ? '#ff3838' : bowType === 'blackhole' ? '#9b59b6' : bowType === 'holy' ? '#f9ca24' : '#ffd700';

    // 1. Recurve Bow Limbs (graceful wooden arc perpendicular to aim)
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 5.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2 * s, -bowHeight / 2);
    ctx.quadraticCurveTo(-8 * s, -bowHeight * 0.28, 4 * s, 0);
    ctx.quadraticCurveTo(-8 * s, bowHeight * 0.28, 2 * s, bowHeight / 2);
    ctx.stroke();

    // Gilded golden trim
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(3 * s, -bowHeight / 2);
    ctx.quadraticCurveTo(-6 * s, -bowHeight * 0.28, 5 * s, 0);
    ctx.quadraticCurveTo(-6 * s, bowHeight * 0.28, 3 * s, bowHeight / 2);
    ctx.stroke();

    // Center Runic Gem
    ctx.shadowColor = runeCol;
    ctx.shadowBlur = 12;
    ctx.fillStyle = runeCol;
    ctx.beginPath();
    ctx.arc(4 * s, 0, 4.5 * s, 0, PI2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Bowstring connecting tips to pulled back nock point
    const topTipX = 2 * s;
    const topTipY = -bowHeight / 2;
    const botTipX = 2 * s;
    const botTipY = bowHeight / 2;
    const nockX = -pullback;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(nockX, 0);
    ctx.lineTo(botTipX, botTipY);
    ctx.stroke();

    // 3. Nocked Arrow (drawn along the EXACT trajectory axis when charging)
    if (this.bowDrawFrac > 0) {
      const arrowLen = 36 * s;
      const arrowTipX = nockX + arrowLen;

      // Wooden Arrow Shaft
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2.8 * s;
      ctx.beginPath();
      ctx.moveTo(nockX, 0);
      ctx.lineTo(arrowTipX - 6 * s, 0);
      ctx.stroke();

      // Glowing Arrowhead pointing forward (+X)
      ctx.fillStyle = runeCol;
      ctx.beginPath();
      ctx.moveTo(arrowTipX, 0);
      ctx.lineTo(arrowTipX - 8 * s, -4.5 * s);
      ctx.lineTo(arrowTipX - 6 * s, 0);
      ctx.lineTo(arrowTipX - 8 * s, 4.5 * s);
      ctx.closePath();
      ctx.fill();

      // Fletching Feathers at nock point
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(nockX, 0);
      ctx.lineTo(nockX + 8 * s, -4 * s);
      ctx.lineTo(nockX + 6 * s, 0);
      ctx.lineTo(nockX + 8 * s, 4 * s);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  PLAYER HERO ARCHER
// ─────────────────────────────────────────────
class Player {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.body = new RagdollBody(x, y, 1.0, false);
    this.maxHP = 100;
    this.hp = 100;
    this.dead = false;

    this.arrowDamage = 30;
    this.arrowSpeed = 960;
    this.bowType = 'normal'; // normal|fire|ice|buzzsaw|tesla|cluster|holy|viper|ballista|vampire|blackhole
    this.damageMul = 1;
    this.chargeSpeedMul = 1;

    // Hero Perks
    this.eagleEyeLevel = 0;
    this.windWalkerLevel = 0;
    this.adrenalineLevel = 0;
    this.adrenalineTimer = 0;
    this.ghostArrowLevel = 0;

    this.isCharging = false;
    this.chargeFrac = 0;
    this.chargeTime = 0;
    this.maxCharge = 1.25;
    this.cooldown = 0;

    this.skulls = 0;

    this.onGround = true;
    this.vy = 0;
  }

  setAim(ax, ay) {
    const pivotX = this.x;
    const pivotY = this.y - 75 * this.body.scale;
    this.body.aimAngle = Math.atan2(ay - pivotY, ax - pivotX);
    this.body.faceDir = ax > this.x ? 1 : -1;
  }

  startCharge() {
    if (this.dead || this.cooldown > 0) return;
    this.isCharging = true;
    soundFX.playBowDraw();
  }

  releaseArrow() {
    if (!this.isCharging || this.dead) return null;
    this.isCharging = false;
    const power = clamp(this.chargeFrac, 0.15, 1);
    this.chargeFrac = 0;
    this.chargeTime = 0;
    this.cooldown = 0.30;
    soundFX.playBowRelease(power);

    const speed = this.arrowSpeed * power * (this.adrenalineTimer > 0 ? 1.25 : 1.0);
    const hx = this.body.joints[9].x;
    const hy = this.body.joints[9].y;
    const ang = this.body.aimAngle;
    const bannerMul = (tower.hasBanner ? 1 + (tower.bannerLevel || 1) * 0.20 : 1.0);
    const dmg = this.arrowDamage * this.damageMul * bannerMul;
    const bonusPierce = this.ghostArrowLevel || 0;

    const arr = [];
    if (this.bowType === 'triple') {
      [-0.10, 0, 0.10].forEach(aOff => {
        arr.push(new Arrow(hx, hy, Math.cos(ang + aOff) * speed, Math.sin(ang + aOff) * speed, this.id, { damage: dmg, type: 'normal', bonusPierce }));
      });
    } else {
      arr.push(new Arrow(hx, hy, Math.cos(ang) * speed, Math.sin(ang) * speed, this.id, { damage: dmg, type: this.bowType, bonusPierce }));
    }
    return arr;
  }

  update(dt, keys) {
    if (this.dead) {
      this.body.update(dt);
      return;
    }

    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.adrenalineTimer > 0) this.adrenalineTimer -= dt;

    if (this.isCharging) {
      const effChargeMul = this.chargeSpeedMul * (this.adrenalineTimer > 0 ? 1.6 : 1.0);
      this.chargeTime += dt * effChargeMul;
      this.chargeFrac = clamp(this.chargeTime / this.maxCharge, 0, 1);
      this.body.bowDrawFrac = this.chargeFrac;

      // Wind Walker airborne slow-mo aiming
      if (!this.onGround && this.windWalkerLevel > 0 && window.game) {
        window.game.triggerSlowMo(0.35, 0.15);
      }
    } else {
      this.body.bowDrawFrac = 0;
    }

    // Jump
    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && this.onGround) {
      this.vy = this.windWalkerLevel > 0 ? -780 : -680;
      this.onGround = false;
      soundFX.playJump();
    }

    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= tower.topY) {
        this.y = tower.topY;
        this.vy = 0;
        this.onGround = true;
      }
    }

    this.x = tower.x;
    this.body.x = this.x;
    this.body.y = this.y;
    this.body.update(dt);
  }

  takeDamage(amount) {
    if (this.dead || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    soundFX.playFleshHit(true);
    triggerDamageVignette();
    spawnZombieBlood(this.x, this.y - 40, 7, false);
    spawnFloatingText('-' + Math.round(amount) + ' HP ❤️', this.x, this.y - 70, { color: '#ff4d4d', size: 24, scale: 2.0 });
    if (window.game) window.game.shakeScreen(7, 0.22);

    // Visible recoil flinch on joints
    this.body.joints[1].x -= this.body.faceDir * 12;
    this.body.joints[0].x -= this.body.faceDir * 16;

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.body.dead = true;
      this.body.triggerRagdoll(-60, -180);
      setTimeout(() => {
        if (window.game) window.game.showGameOver('Archer Slain by Undead!');
      }, 1000);
    }
  }

  draw() {
    this.body.drawHero(this.bowType);

    if (this.isCharging && !this.dead) {
      this.drawTrajectory();
    }
  }

  drawTrajectory() {
    const speed = this.arrowSpeed * clamp(this.chargeFrac, 0.15, 1);
    const hx = this.body.joints[9].x;
    const hy = this.body.joints[9].y;
    let px = hx, py = hy;
    let pvx = Math.cos(this.body.aimAngle) * speed;
    let pvy = Math.sin(this.body.aimAngle) * speed;
    const stepDt = 0.034;

    ctx.save();
    for (let i = 0; i < 28; i++) {
      px += pvx * stepDt;
      py += pvy * stepDt;
      pvy += (GRAVITY * 0.52) * stepDt;
      if (py > GROUND_Y()) break;
      const alpha = (1 - i / 28) * 0.85;
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 3.5 - (i / 28) * 1.5, 0, PI2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  ZOMBIE HORDE (6 DIVERSE UNDEAD TYPES)
// ─────────────────────────────────────────────
class Zombie {
  constructor(x, waveNum) {
    this.x = x;
    this.y = GROUND_Y();
    this.type = this.pickZombieType(waveNum);
    this.def = this.getStats();

    this.scale = this.def.scale;
    this.body = new RagdollBody(x, this.y, this.scale, true, this.type);
    this.body.faceDir = -1; // face left toward tower

    this.maxHP = this.def.hp;
    this.hp = this.maxHP;
    this.speed = this.def.speed;
    this.damage = this.def.damage;
    this.skullBounty = this.def.bounty;

    this.dead = false;
    this.isFrozen = false;
    this.frozenTimer = 0;
    this.isBurning = false;
    this.burnTimer = 0;
    this.isPoisoned = false;
    this.poisonTimer = 0;
    this.poisonDPS = 35;
    this.hitFlashTimer = 0;

    this.helmet = this.def.hasHelmet ? { hp: 50 } : null;
    this.summonTimer = rnd(4, 7);
  }

  pickZombieType(waveNum) {
    if (waveNum % 6 === 0 && Math.random() < 0.4) return 'boss';
    const r = Math.random();
    if (waveNum >= 5 && r < 0.22) return 'necromancer';
    if (waveNum >= 4 && r < 0.40) return 'buckethead';
    if (waveNum >= 3 && r < 0.60) return 'bloater';
    if (waveNum >= 2 && r < 0.80) return 'crawler';
    return 'walker';
  }

  getStats() {
    switch (this.type) {
      case 'crawler':
        return { hp: 40, speed: 170, damage: 14, scale: 0.88, hasHelmet: false, skin: '#6c5ce7', clothes: '#2d3436', name: 'Feral Crawler', bounty: 8 };
      case 'bloater':
        return { hp: 130, speed: 65, damage: 28, scale: 1.35, hasHelmet: false, skin: '#5a8234', clothes: '#3e2723', name: 'Acid Bloater', bounty: 15 };
      case 'buckethead':
        return { hp: 75, speed: 85, damage: 18, scale: 1.05, hasHelmet: true, skin: '#4e6d3c', clothes: '#2c3e50', name: 'Buckethead', bounty: 20 };
      case 'necromancer':
        return { hp: 90, speed: 55, damage: 20, scale: 1.05, hasHelmet: false, skin: '#2c3e50', clothes: '#4a235a', name: 'Dark Necromancer', bounty: 35 };
      case 'boss':
        return { hp: 450, speed: 52, damage: 55, scale: 2.1, hasHelmet: true, skin: '#2d3436', clothes: '#000000', name: 'Gargantuar Titan', bounty: 100 };
      default:
        return { hp: 55, speed: 90, damage: 15, scale: 1.0, hasHelmet: false, skin: '#4e6d3c', clothes: '#353b48', name: 'Rotten Walker', bounty: 5 };
    }
  }

  update(dt, towerObj) {
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    if (this.dead) {
      this.body.update(dt);
      return;
    }

    if (this.isFrozen) {
      this.frozenTimer -= dt;
      if (this.frozenTimer <= 0) this.isFrozen = false;
      return;
    }

    // Caltrop Moat hazard (slows by 45% and inflicts 15 bleed DPS)
    const towerFrontX = towerObj.x + towerObj.width / 2;
    if (towerObj.hasCaltrops && this.x >= towerFrontX + 15 && this.x <= towerFrontX + 165) {
      this.speed *= 0.55;
      this.hp -= 15 * dt;
      if (Math.random() < 0.15) {
        spawnZombieBlood(this.x, GROUND_Y() - 6, 2, this.def.skin !== '#6c5ce7');
      }
      if (this.hp <= 0) {
        this.die(0, -90);
        return;
      }
    }

    // Flaming Tar Trench hazard (sets ablaze and deals 30 fire DPS)
    if (towerObj.hasTarMoat && this.x >= towerFrontX + 8 && this.x <= towerFrontX + 115) {
      this.isBurning = true;
      this.burnTimer = Math.max(this.burnTimer, 2.5);
      this.hp -= 30 * dt;
      if (Math.random() < 0.25) {
        spawnParticle(this.x + rnd(-8, 8), GROUND_Y() - 8, { vx: rnd(-10, 10), vy: rnd(-80, -30), r: 4, color: '#f39c12', grav: false });
      }
      if (this.hp <= 0) {
        this.die(0, -110);
        return;
      }
    }

    // Poison / Neurotoxin tick
    if (this.isPoisoned) {
      this.poisonTimer -= dt;
      this.hp -= this.poisonDPS * dt;
      if (Math.random() < 0.35) {
        spawnParticle(this.x + rnd(-8, 8), this.y - 35, { vx: rnd(-12, 12), vy: -45, r: 3.5, color: '#2ed573', grav: false });
      }
      if (this.hp <= 0) {
        this.die(0, -100);
        return;
      }
      if (this.poisonTimer <= 0) this.isPoisoned = false;
    }

    if (this.isBurning) {
      this.burnTimer -= dt;
      this.hp -= 20 * dt;
      if (Math.random() < 0.35) {
        spawnParticle(this.x + rnd(-10, 10), this.y - 40, { vx: rnd(-20, 20), vy: -80, r: 4, color: '#e74c3c', grav: false });
      }
      if (this.hp <= 0) {
        this.die(0, -100);
        return;
      }
    }

    // Necromancer minion summon ability
    if (this.type === 'necromancer') {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = rnd(6, 9);
        this.summonMinions();
      }
    }

    // Move toward barricade
    const targetX = towerObj.x + towerObj.width / 2 + 15;
    if (this.x > targetX) {
      this.x -= this.speed * dt;
      this.body.isWalking = true;
      this.body.walkTime += dt * (this.speed * 0.06);

      // Gargantuar ground stomp screen shake
      if (this.type === 'boss' && Math.sin(this.body.walkTime) > 0.95 && window.game) {
        window.game.shakeScreen(3, 0.1);
      }
    } else {
      // At barricade! Attack player and fortress on timed cadence
      this.body.isWalking = false;

      this.attackTimer = (this.attackTimer || 0) + dt;
      const attackInterval = this.type === 'boss' ? 2.0 : 1.1;

      if (this.attackTimer >= attackInterval) {
        this.attackTimer = 0;

        if (this.type === 'boss') {
          // Boss slams ground with giant pillar
          towerObj.takeDamage(50);
          soundFX.playExplosion();
          if (window.game) {
            window.game.shakeScreen(12, 0.3);
            const p1 = window.game.players[0];
            // Shockwave hits archer if standing on deck (jumping avoids it!)
            if (p1 && !p1.dead && p1.onGround) {
              p1.takeDamage(20);
              spawnFloatingText('GROUND SHOCKWAVE! 💥', p1.x, p1.y - 85, { color: '#e74c3c', size: 24, scale: 2.0 });
            }
          }
        } else {
          // Zombies attack the barricade base
          towerObj.takeDamage(this.damage);
        }

        // Spiked barricade thorns retaliation on strike
        if (towerObj.hasSpikes) {
          this.hp -= 32;
          spawnSparks(this.x, GROUND_Y() - 25, 6);
          soundFX.playArmorHit();
          if (this.hp <= 0) {
            this.die(0, -120);
            return;
          }
        }
      }
    }

    if (Math.random() < 0.002) soundFX.playZombieMoan();

    this.body.x = this.x;
    this.body.y = this.y;
    this.body.update(dt);
  }

  summonMinions() {
    soundFX.playNecromancerSpell();
    spawnFloatingText('SUMMONING MINIONS! 🔮', this.x, this.y - 120, { color: '#e056fd', size: 24, scale: 1.8 });
    if (window.game) {
      for (let i = 0; i < 2; i++) {
        const sx = this.x + (i + 1) * 45;
        const minion = new Zombie(sx, 1);
        minion.type = 'crawler';
        minion.def = minion.getStats();
        minion.scale = 0.78;
        minion.hp = 30;
        window.game.enemies.push(minion);
        addDecal(sx, GROUND_Y(), 25, 'rgba(155, 89, 182, 0.75)');
      }
    }
  }

  takeDamage(amount, impX, impY, isHeadshot = false) {
    if (this.dead) return;

    this.hitFlashTimer = 0.08; // 80ms stark white hit-flash!

    // Visceral Knockback Impulse on all hits!
    if (impX) {
      const stagger = isHeadshot ? 0.08 : 0.04;
      this.x += impX * stagger;
      this.body.joints[1].x += impX * stagger * 0.8;
      this.body.joints[0].x += impX * stagger;
    }

    if (this.isFrozen) {
      amount *= 2.5;
      spawnIceShards(this.x, this.y - 40, 18);
      soundFX.playIceFreeze();
      spawnFloatingText(`SHATTER! -${Math.round(amount)} ❄️`, this.x, this.y - 60, { color: '#74b9ff', size: 24, scale: 1.8 });
    }

    this.hp -= amount;
    spawnZombieBlood(this.x, this.y - 45, 8, true);

    if (this.hp <= 0) {
      this.hp = 0;
      this.die(impX, impY, isHeadshot);
    }
  }

  die(impX = 0, impY = -220, isHeadshot = false) {
    this.dead = true;
    this.body.dead = true;

    // Award skulls + spawn flying golden skulls!
    const bountyMul = (window.game && window.game.players[0] && window.game.players[0].bountyMul) || 1;
    let baseBounty = isHeadshot ? Math.round(this.skullBounty * 1.5) : this.skullBounty;
    const finalBounty = Math.round(baseBounty * bountyMul);
    spawnFlyingSkulls(this.x, this.y - 50 * this.scale, clamp(Math.round(finalBounty / 3), 3, 8), Math.max(1, Math.round(finalBounty / 4)));

    // Bloater explosion!
    if (this.type === 'bloater') {
      spawnAcidSplash(this.x, this.y - 40, 38);
      soundFX.playExplosion();
      spawnFloatingText('💥 ACID DETONATION!', this.x, this.y - 80, { color: '#2ecc71', size: 28, scale: 2.2 });
      if (window.game) {
        window.game.shakeScreen(14, 0.35);

        // Acid splash damage to Tower and Archer if detonated near fortress
        const distToTower = dist(this.x, this.y, tower.x + tower.width / 2, GROUND_Y());
        if (distToTower < 220) {
          tower.takeDamage(45);
          const p1 = window.game.players[0];
          if (p1 && !p1.dead) p1.takeDamage(26);
          spawnFloatingText('ACID SPLASH! ☣️', tower.x + 25, tower.topY - 30, { color: '#2ecc71', size: 22, scale: 1.8 });
        }

        // Damage nearby zombies!
        for (const z of window.game.enemies) {
          if (!z.dead && dist(this.x, this.y, z.x, z.y) < 170) {
            z.takeDamage(85, rnd(-150, 150), -280, false);
          }
        }
      }
    }

    if (isHeadshot) {
      this.body.decapitated = true;
      spawnDecapitatedHead(this.body.joints[0].x, this.body.joints[0].y, impX * 0.4 + rnd(-80, 80), -320, this.type);
      spawnBoneShards(this.x, this.y - 70 * this.scale, 8);
      soundFX.playDecapitation();
    } else {
      soundFX.playFleshHit(true);
    }

    this.body.triggerRagdoll(impX, impY);
  }

  draw() {
    this.body.draw({
      skinColor: this.def.skin,
      clothesColor: this.def.clothes,
      helmet: this.helmet ? 'bucket' : null,
      hitFlash: this.hitFlashTimer > 0
    });

    // Health bar above zombie
    if (!this.dead && this.hp < this.maxHP) {
      const barW = 38 * this.scale;
      const barH = 5;
      const barX = this.x - barW / 2;
      const barY = this.y - 120 * this.scale;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHP), barH);
    }
  }
}
window.Zombie = Zombie;

// ─────────────────────────────────────────────
//  WAVE ANNOUNCEMENT BANNER
// ─────────────────────────────────────────────
const WAVE_CONFIGS = [
  { night: 1, title: 'ROTTEN WALKERS', desc: 'Slow shamblers approaching the tower! Aim for the head!' },
  { night: 2, title: '⚠️ FERAL CRAWLERS', desc: 'Low-crawling beasts on all fours! Fast lunges, aim low!' },
  { night: 3, title: '⚠️ TOXIC BLOATERS', desc: 'Volatile radioactive bellies! Shoot from afar to trigger chain reactions!' },
  { night: 4, title: '⚠️ ARMORED BUCKETHEADS', desc: 'Reinforced iron helmets! Knock off armor before hitting skulls!' },
  { night: 5, title: '⚠️ DARK NECROMANCER', desc: 'Cursed warlock raising skeleton minions from the dirt!' },
  { night: 6, title: '☠️ GARGANTUAR TITAN (BOSS)', desc: 'Massive behemoth crusher! Aim for the head with elemental arrows!' },
  { night: 7, title: '🔥 NIGHTMARE SIEGE', desc: 'The horde is relentless! All undead archetypes attack at once!' },
];

function triggerWaveAnnouncement(waveNum) {
  const cfg = WAVE_CONFIGS[(waveNum - 1) % WAVE_CONFIGS.length];
  const el = document.getElementById('wave-banner');
  if (!el) return;
  document.getElementById('wb-night').textContent = `NIGHT ${waveNum}`;
  document.getElementById('wb-title').textContent = cfg.title;
  document.getElementById('wb-desc').textContent = cfg.desc;
  el.classList.remove('hidden');

  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'bannerSwoop 3.0s cubic-bezier(0.16, 1, 0.3, 1) forwards';

  setTimeout(() => {
    el.classList.add('hidden');
  }, 3000);
}

// ─────────────────────────────────────────────
//  SHOP UPGRADE CATALOG
// ─────────────────────────────────────────────
const UPGRADES = [
  // ═════════════════════════════════════════════
  // 🏹 WEAPON ARSENAL (BOWS & PROJECTILE ARCHETYPES)
  // ═════════════════════════════════════════════
  {
    id: 'fire', category: 'bows', name: 'Molotov Fire Bow', icon: '🔥',
    desc: 'Ignites zombies in spreading fire, burning 25 DPS', cost: 25,
    statLabel: 'DOT: 25 Fire DPS',
    apply: (p) => { p.bowType = 'fire'; },
    oneTime: true,
  },
  {
    id: 'cryo', category: 'bows', name: 'Cryo Frost Bow', icon: '❄️',
    desc: 'Freezes zombies solid for 3.5s; frozen foes take 2.5x shatter damage!', cost: 30,
    statLabel: 'Freeze: 3.5s (2.5x Shatter Crit)',
    apply: (p) => { p.bowType = 'ice'; },
    oneTime: true,
  },
  {
    id: 'triple', category: 'bows', name: 'Triple Multishot Bow', icon: '🏹',
    desc: 'Fires 3 deadly arrows simultaneously in a cone spread', cost: 35,
    statLabel: 'Projectiles: 3x Cone Arrows',
    apply: (p) => { p.bowType = 'triple'; },
    oneTime: true,
  },
  {
    id: 'viper', category: 'bows', name: 'Toxic Viper Bow', icon: '🐍',
    desc: 'Venomous darts inflict ramping neurotoxin poison dealing 35 DPS', cost: 40,
    statLabel: 'Neurotoxin: 35 Poison DPS',
    apply: (p) => { p.bowType = 'viper'; },
    oneTime: true,
  },
  {
    id: 'buzzsaw', category: 'bows', name: 'Buzzsaw Shredder', icon: '🪚',
    desc: 'Slices through up to 3 zombies in a line, amputating limbs', cost: 45,
    statLabel: 'Pierce: 3 Targets (Limb Sever)',
    apply: (p) => { p.bowType = 'buzzsaw'; },
    oneTime: true,
  },
  {
    id: 'tesla', category: 'bows', name: 'Tesla Lightning Bow', icon: '⚡',
    desc: 'Chains high-voltage electric arcs across 4 nearby undead', cost: 45,
    statLabel: 'Chain Shock: 4 Undead',
    apply: (p) => { p.bowType = 'tesla'; },
    oneTime: true,
  },
  {
    id: 'holy', category: 'bows', name: 'Holy Radiant Spear', icon: '✝️',
    desc: 'Divine light that pierces through up to 4 zombies with crits', cost: 50,
    statLabel: 'Pierce: 4x Divine Piercing',
    apply: (p) => { p.bowType = 'holy'; },
    oneTime: true,
  },
  {
    id: 'cluster', category: 'bows', name: 'Cluster Bomb Bow', icon: '💣',
    desc: 'Heavy explosive arrow launching zombies into ragdoll orbits', cost: 55,
    statLabel: 'Blast: 140px Shockwave AOE',
    apply: (p) => { p.bowType = 'cluster'; },
    oneTime: true,
  },
  {
    id: 'ballista', category: 'bows', name: 'Siege Harpoon Ballista', icon: '🔱',
    desc: 'Fires massive steel harpoons piercing 5 zombies with 3.5x knockback', cost: 60,
    statLabel: 'Heavy Harpoon: 5 Pierces & Slam',
    apply: (p) => { p.bowType = 'ballista'; },
    oneTime: true,
  },
  {
    id: 'vampire', category: 'bows', name: 'Vampiric Blood Bow', icon: '🩸',
    desc: 'Crimson runic arrows leech 25% of damage dealt to heal Archer & Tower', cost: 65,
    statLabel: 'Life Leech: 25% Damage to HP',
    apply: (p) => { p.bowType = 'vampire'; },
    oneTime: true,
  },
  {
    id: 'blackhole', category: 'bows', name: 'Vortex Graviton Bow', icon: '🌀',
    desc: 'Impact generates a gravity vortex pulling all nearby undead into a singularity', cost: 75,
    statLabel: 'Singularity: 175px Black Hole Pull',
    apply: (p) => { p.bowType = 'blackhole'; },
    oneTime: true,
  },

  // ═════════════════════════════════════════════
  // ⚔️ HERO ARCHER PERKS (STATS & PASSIVES)
  // ═════════════════════════════════════════════
  {
    id: 'dmg1', category: 'archer', name: 'Razor Broadheads', icon: '🗡️',
    desc: 'Sharpened broadhead tips deal +30% arrow damage per level', cost: 15,
    statLabel: '+30% Base Arrow Damage',
    apply: (p) => { p.damageMul = (p.damageMul || 1) * 1.30; },
    maxLevel: 5, level: 0,
  },
  {
    id: 'drawSpeed', category: 'archer', name: 'Quick-Draw Reflexes', icon: '⚡',
    desc: 'Draw and charge bow +25% faster for rapid barrages', cost: 20,
    statLabel: '+25% Charge Draw Speed',
    apply: (p) => { p.chargeSpeedMul = (p.chargeSpeedMul || 1) * 1.25; },
    maxLevel: 4, level: 0,
  },
  {
    id: 'vitality', category: 'archer', name: 'Vitality Elixir', icon: '❤️',
    desc: '+35 Archer Max HP & instantly heals to full health', cost: 20,
    statLabel: '+35 Max HP & Full Heal',
    apply: (p) => { p.maxHP += 35; p.hp = p.maxHP; },
    maxLevel: 4, level: 0,
  },
  {
    id: 'windWalker', category: 'archer', name: 'Wind Walker Agility', icon: '👟',
    desc: 'Boosts jump height and activates slow-mo matrix aim while airborne!', cost: 25,
    statLabel: 'Airborne Slow-Mo Matrix Aim',
    apply: (p) => { p.windWalkerLevel = (p.windWalkerLevel || 0) + 1; },
    maxLevel: 2, level: 0,
  },
  {
    id: 'magnet', category: 'archer', name: 'Bounty Hunter', icon: '🧲',
    desc: '+25% more skull bounties from all zombie kills', cost: 25,
    statLabel: '+25% Skull Drop Bounty',
    apply: (p) => { p.bountyMul = (p.bountyMul || 1) * 1.25; },
    maxLevel: 3, level: 0,
  },
  {
    id: 'eagleEye', category: 'archer', name: 'Eagle Eye Precision', icon: '🎯',
    desc: 'Increases Headshot critical damage multiplier from 2.8x up to 4.6x!', cost: 30,
    statLabel: '+0.6x Headshot Crit Multiplier',
    apply: (p) => { p.eagleEyeLevel = (p.eagleEyeLevel || 0) + 1; },
    maxLevel: 3, level: 0,
  },
  {
    id: 'adrenaline', category: 'archer', name: 'Adrenaline Surge', icon: '🔥',
    desc: 'Scoring a kill triggers a 3.5s frenzy burst: +60% draw speed & faster arrows!', cost: 35,
    statLabel: 'Frenzy Rush: +60% Draw on Kill',
    apply: (p) => { p.adrenalineLevel = (p.adrenalineLevel || 0) + 1; },
    maxLevel: 3, level: 0,
  },
  {
    id: 'ghostArrow', category: 'archer', name: 'Phantom Quiver', icon: '👻',
    desc: 'Arrows phase through enemy armor, granting +1 base pierce to all attacks', cost: 40,
    statLabel: '+1 Global Pierce Penetration',
    apply: (p) => { p.ghostArrowLevel = (p.ghostArrowLevel || 0) + 1; },
    maxLevel: 2, level: 0,
  },

  // ═════════════════════════════════════════════
  // 🏰 FORTRESS DEFENSES & TRAPS
  // ═════════════════════════════════════════════
  {
    id: 'fieldRepair', category: 'tower', name: 'Emergency Planks', icon: '🔨',
    desc: 'Instantly restores +150 Health to the barricade', cost: 15,
    statLabel: '+150 Instant Barricade HP',
    apply: () => { tower.repair(150); },
    repeatable: true,
  },
  {
    id: 'towerHP', category: 'tower', name: 'Fortify Barricade', icon: '🏰',
    desc: '+120 Tower Max HP and fully repairs the barricade', cost: 20,
    statLabel: '+120 Barricade HP & Repair',
    apply: () => { tower.maxHP += 120; tower.repair(120); },
    maxLevel: 5, level: 0,
  },
  {
    id: 'spikes', category: 'tower', name: 'Spiked Iron Railing', icon: '🛡️',
    desc: 'Zombies clawing the barricade take 32 return damage per second', cost: 30,
    statLabel: 'Thorns: 32 DPS Retaliation',
    apply: () => { tower.hasSpikes = true; },
    oneTime: true,
  },
  {
    id: 'caltrops', category: 'tower', name: 'Caltrop Spike Moat', icon: '⚙️',
    desc: 'Covers ground ahead with sharp steel spikes; slows foes 45% & inflicts 15 bleed DPS', cost: 30,
    statLabel: 'Slow Moat: 45% Slow + 15 Bleed DPS',
    apply: () => { tower.hasCaltrops = true; },
    oneTime: true,
  },
  {
    id: 'banner', category: 'tower', name: 'War Banner of Valor', icon: '🚩',
    desc: 'Elevates a royal crest granting +20% hero damage aura & +12 barricade HP regen every 4s', cost: 35,
    statLabel: '+20% Damage Aura & +12 HP/4s Regen',
    apply: () => { tower.hasBanner = true; tower.bannerLevel = (tower.bannerLevel || 0) + 1; },
    maxLevel: 2, level: 0,
  },
  {
    id: 'tarMoat', category: 'tower', name: 'Flaming Tar Trench', icon: '🌋',
    desc: 'Ignites a boiling ditch of flaming pitch dealing 30 continuous fire DPS to oncoming walkers', cost: 40,
    statLabel: 'Trap: 30 Continuous Fire DPS',
    apply: () => { tower.hasTarMoat = true; },
    oneTime: true,
  },
  {
    id: 'sentry', category: 'tower', name: 'Auto-Crossbow Turret', icon: '🏹',
    desc: 'Mounts a rooftop clockwork ballista that automatically targets & snipes oncoming zombies!', cost: 450,
    statLabel: 'Auto-Turret: 1.1s Rapid Sniper',
    apply: () => { tower.sentryLevel = (tower.sentryLevel || 0) + 1; },
    maxLevel: 3, level: 0,
  },
];

function makePlayerUpgrades() {
  return UPGRADES.map(u => ({ ...u, level: 0, bought: false }));
}

// ─────────────────────────────────────────────
//  BACKGROUND & ATMOSPHERE RENDERER
// ─────────────────────────────────────────────
function drawBackground(waveNum) {
  // Blood-Moon Apocalyptic Sky
  const skyGrd = ctx.createLinearGradient(0, 0, 0, H);
  skyGrd.addColorStop(0, '#0a0d14');
  skyGrd.addColorStop(0.65, '#160d1b');
  skyGrd.addColorStop(1, '#1b120c');
  ctx.fillStyle = skyGrd;
  ctx.fillRect(0, 0, W, H);

  // Blood Moon
  const moonX = W * 0.82;
  const moonY = H * 0.16;
  const moonGrd = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 45);
  moonGrd.addColorStop(0, '#ff7675');
  moonGrd.addColorStop(0.6, '#d63031');
  moonGrd.addColorStop(1, 'transparent');
  ctx.fillStyle = moonGrd;
  ctx.beginPath(); ctx.arc(moonX, moonY, 45, 0, PI2); ctx.fill();

  // Mountain silhouettes
  const gy = GROUND_Y();
  ctx.fillStyle = '#0f141d';
  ctx.beginPath();
  ctx.moveTo(0, gy);
  const pts = [0.05, 0.18, 0.32, 0.48, 0.65, 0.82, 1.0];
  const hs = [0.65, 0.45, 0.58, 0.40, 0.52, 0.42, 0.68];
  pts.forEach((p, i) => ctx.lineTo(W * p, H * hs[i]));
  ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();

  // Ground layer
  const groundGrd = ctx.createLinearGradient(0, gy, 0, H);
  groundGrd.addColorStop(0, '#1c2818');
  groundGrd.addColorStop(1, '#0b1109');
  ctx.fillStyle = groundGrd;
  ctx.fillRect(0, gy, W, H - gy);

  // Ground line
  ctx.strokeStyle = '#27ae60';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();

  // Blood & acid splatters
  drawDecals();

  // Tower Barricade
  tower.draw();

  // Detached zombie heads & buckets
  drawFlyingProps();
}

// ─────────────────────────────────────────────
//  GAME ENGINE & LOOP
// ─────────────────────────────────────────────
game = {
  state: 'menu',
  players: [new Player('player1', tower.x, tower.topY)],
  enemies: [],
  arrows: [],
  pickups: [],

  wave: 0,
  kills: 0,
  totalSkulls: 0,

  p1Upgrades: makePlayerUpgrades(),

  spawnTimer: 0,
  spawnInterval: 1.1,
  enemiesToSpawn: 0,

  lastTime: 0,
  animId: null,
  keys: {},

  mouseX: W / 2,
  mouseY: H / 2,
  mouseDown: false,

  timeScale: 1.0,
  slowMoTimer: 0,
  hitStopTimer: 0,
  shake: 0,
  shakeTimer: 0,
  combo: 0,
  comboTimer: 0,
  waveFeaturedSpawned: false,

  triggerSlowMo(scale = 0.22, duration = 0.4) {
    this.timeScale = scale;
    this.slowMoTimer = duration;
  },

  triggerHitStop(duration = 0.045) {
    this.hitStopTimer = duration;
  },

  shakeScreen(intensity = 8, duration = 0.25) {
    this.shake = intensity;
    this.shakeTimer = duration;
  },

  onResize() {
    if (this.players[0] && !this.players[0].dead) {
      this.players[0].x = tower.x;
      this.players[0].y = tower.topY;
    }
  },

  startGame() {
    this.wave = 0;
    this.kills = 0;
    this.totalSkulls = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.enemies = [];
    this.arrows = [];
    this.pickups = [];
    flyingCoins.length = 0;
    particles.length = 0;
    activeShockwaves.length = 0;
    decals.length = 0;
    flyingProps.length = 0;
    floatingTexts.length = 0;

    tower.hp = tower.maxHP = 300;
    tower.hasSpikes = false;
    tower.hasCaltrops = false;
    tower.hasTarMoat = false;
    tower.sentryLevel = 0;
    tower.sentryTimer = 0;
    tower.hasBanner = false;
    tower.bannerLevel = 0;
    tower.bannerRegenTimer = 0;
    activeVortices.length = 0;
    this.p1Upgrades = makePlayerUpgrades();

    const p1 = new Player('player1', tower.x, tower.topY);
    this.players = [p1];

    this.startNextWave();
    this.setState('playing');
  },

  startNextWave() {
    // Remove all dead zombie bodies from previous wave!
    this.enemies = this.enemies.filter(z => !z.dead);
    this.arrows = this.arrows.filter(a => !a.stuck);

    this.wave++;
    const count = 4 + Math.floor(this.wave * 2.5);
    this.enemiesToSpawn = count;
    this.spawnTimer = 0;
    this.spawnInterval = Math.max(0.55, 1.2 - this.wave * 0.06);
    this.waveFeaturedSpawned = false;

    triggerWaveAnnouncement(this.wave);
    updateHUD(this);
  },

  spawnEnemy() {
    const x = W + rnd(40, 100);
    const z = new Zombie(x, this.wave);

    // Guarantee the featured enemy for this wave on the first spawn
    if (!this.waveFeaturedSpawned) {
      this.waveFeaturedSpawned = true;
      if (this.wave === 1) z.type = 'walker';
      else if (this.wave === 2) z.type = 'crawler';
      else if (this.wave === 3) z.type = 'buckethead';
      else if (this.wave === 4) z.type = 'bloater';
      else if (this.wave === 5) z.type = 'skeleton';
      else if (this.wave === 6) z.type = 'necromancer';
      else if (this.wave === 7) z.type = 'centurion';
      else if (this.wave === 8) z.type = 'berserker';
      else if (this.wave === 9) z.type = 'frostwight';
      else if (this.wave === 10) z.type = 'boss';
      z.def = z.getStats();
      z.scale = z.def.scale;
      z.hp = z.maxHP = z.def.hp;
      z.speed = z.def.speed;
      z.damage = z.def.damage;
      z.skullBounty = z.def.bounty;
      z.body = new RagdollBody(x, z.y, z.scale, true, z.type);
      z.body.faceDir = -1;
      z.helmet = z.def.hasHelmet ? { hp: 50 } : null;
    }

    this.enemies.push(z);
  },

  checkWaveComplete() {
    const aliveZombies = this.enemies.filter(e => !e.dead).length;
    if (aliveZombies === 0 && this.enemiesToSpawn <= 0) {
      setTimeout(() => {
        if (this.state === 'playing') this.openShop();
      }, 700);
    }
  },

  openShop() {
    this.enemies = this.enemies.filter(e => !e.dead);
    this.arrows = this.arrows.filter(a => !a.stuck);
    this.setState('shop');
    buildShopUI(this);
  },

  togglePause() {
    if (this.state === 'playing') {
      this.setState('pause');
      const btn = document.getElementById('btn-hud-pause');
      if (btn) btn.textContent = '▶️';
    } else if (this.state === 'pause') {
      this.setState('playing');
      const btn = document.getElementById('btn-hud-pause');
      if (btn) btn.textContent = '⏸️';
    }
  },

  restartCurrentWave() {
    this.enemies = [];
    this.arrows = [];
    this.pickups = [];
    floatingTexts.length = 0;
    this.enemiesToSpawn = 6 + (this.wave - 1) * 3;
    this.spawnTimer = 0;
    if (this.players[0]) {
      this.players[0].hp = this.players[0].maxHP;
      this.players[0].dead = false;
      this.players[0].x = W * 0.16;
      this.players[0].y = tower.topY;
    }
    tower.hp = tower.maxHP;
    this.setState('playing');
    const btn = document.getElementById('btn-hud-pause');
    if (btn) btn.textContent = '⏸️';
    triggerWaveAnnouncement(this.wave);
  },

  setState(s) {
    this.state = s;
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const hud = document.getElementById('hud');
    const charge = document.getElementById('charge-indicator');

    if (s === 'menu') {
      document.getElementById('screen-menu').classList.add('active');
      hud.classList.add('hidden'); charge.classList.add('hidden');
    } else if (s === 'playing') {
      hud.classList.remove('hidden'); charge.classList.remove('hidden');
      const btn = document.getElementById('btn-hud-pause');
      if (btn) btn.textContent = '⏸️';
    } else if (s === 'shop') {
      document.getElementById('screen-shop').classList.add('active');
    } else if (s === 'pause') {
      document.getElementById('screen-pause').classList.add('active');
      document.getElementById('pause-wave').textContent = this.wave;
      const aliveZombies = this.enemies.filter(e => !e.dead).length + this.enemiesToSpawn;
      document.getElementById('pause-enemies').textContent = aliveZombies;
      document.getElementById('pause-skulls').textContent = this.players[0] ? this.players[0].skulls : 0;
    } else if (s === 'gameover') {
      document.getElementById('screen-gameover').classList.add('active');
      hud.classList.add('hidden');
    } else if (s === 'howtoplay') {
      document.getElementById('screen-howtoplay').classList.add('active');
    }
  },

  tick(ts) {
    const rawDt = Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;

    // Hit-stop micro freeze
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= rawDt;
      this.animId = requestAnimationFrame(ts2 => this.tick(ts2));
      return;
    }

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= rawDt;
      if (this.slowMoTimer <= 0) this.timeScale = 1.0;
    }
    const dt = rawDt * this.timeScale;

    ctx.save();
    if (this.shakeTimer > 0) {
      this.shakeTimer -= rawDt;
      const sx = rnd(-this.shake, this.shake);
      const sy = rnd(-this.shake, this.shake);
      ctx.translate(sx, sy);
      this.shake *= 0.92;
    }

    ctx.clearRect(0, 0, W, H);
    drawBackground(this.wave);

    if (this.state === 'playing') {
      this.updateGame(dt);
    } else if (this.state === 'pause') {
      // Draw frozen scene during pause
      for (const e of this.enemies) e.draw();
      for (const p of this.players) p.draw();
      for (const a of this.arrows) a.draw();
      for (const pk of this.pickups) pk.draw();
      drawFloatingTexts();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, W, H);
    } else {
      // In menu, gameover, or howtoplay: hero is always drawn standing on the tower deck!
      const p1 = this.players[0];
      if (p1) {
        if (!p1.dead) {
          p1.setAim(this.mouseX, this.mouseY);
          p1.update(dt, {});
        }
        p1.draw();
      }
      for (const e of this.enemies) e.draw();
      updateParticles(dt);
      drawParticles();
      drawFloatingTexts();
    }
    ctx.restore();

    this.animId = requestAnimationFrame(ts2 => this.tick(ts2));
  },

  updateGame(dt) {
    // Spawning
    if (this.enemiesToSpawn > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer -= this.spawnInterval;
        this.spawnEnemy();
        this.enemiesToSpawn--;
      }
    }

    const p1 = this.players[0];
    if (p1 && !p1.dead) {
      p1.setAim(this.mouseX, this.mouseY);
      if (this.mouseDown && !p1.isCharging) p1.startCharge();
      if (!this.mouseDown && p1.isCharging) {
        const arrs = p1.releaseArrow();
        if (arrs) this.arrows.push(...arrs);
      }
      p1.update(dt, this.keys);
    }

    // Zombies update
    for (const z of this.enemies) {
      z.update(dt, tower);
    }

    // Props, Texts & Flying Coins
    updateFlyingProps(dt);
    updateFloatingTexts(dt);
    updateFlyingCoins(dt, p1);

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Arrow collisions
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.update(dt);

      if (!a.stuck) {
        for (const z of this.enemies) {
          if (z.dead || a.hitEntities.has(z)) continue;

          const headDist = dist(a.x, a.y, z.body.joints[0].x, z.body.joints[0].y);
          const bodyDist = dist(a.x, a.y, z.x, z.y - 45 * z.scale);
          const legDist = dist(a.x, a.y, z.x, z.y - 16 * z.scale);

          // 1) HEADSHOT CHECK
          if (headDist < 22 * z.scale) {
            a.hitEntities.add(z);

            // Buckethead helmet check with metallic ricochet
            if (z.helmet) {
              z.helmet.hp -= a.damage;
              soundFX.playArmorHit();
              spawnSparks(a.x, a.y, 18);
              spawnFloatingText('🛡️ DEFLECTED! -' + Math.round(a.damage), a.x, a.y - 20, { color: '#bdc3c7' });

              // Arrow ricochets off into air
              a.stuck = false;
              a.vx = -a.vx * 0.42 + rnd(-80, 80);
              a.vy = -rnd(200, 380);
              a.wobble = 0.5;

              if (z.helmet.hp <= 0) {
                spawnFlyingBucket(z.x, z.y - 80 * z.scale, a.vx * 0.35 + rnd(-60, 60), -280);
                z.helmet = null;
                spawnFloatingText('BUCKET SHATTERED! 🪖', a.x, a.y - 35, { color: '#f39c12', size: 24, scale: 2.0 });
              }
              break;
            }

            // CRITICAL DECAPITATING HEADSHOT!
            const dmg = a.damage * 2.8;
            this.triggerHitStop(0.045); // Micro-pause for visceral punch!
            this.triggerSlowMo(0.2, 0.45);
            this.shakeScreen(12, 0.3);
            soundFX.playHeadshot();
            spawnFloatingText('💀 HEADSHOT! ' + Math.round(dmg), a.x, a.y - 35, { color: '#ff3838', size: 30, scale: 2.3 });

            // Combo Tracker
            this.combo++;
            this.comboTimer = 3.5;
            if (this.combo >= 2) {
              const bonus = (this.combo - 1) * 3;
              spawnFloatingText(`🔥 COMBO x${this.combo}! +${bonus} 💀`, a.x, a.y - 65, { color: '#f39c12', size: 24, scale: 2.0 });
              if (p1) p1.skulls += bonus;
              soundFX.playGemCollect();
            }

            z.takeDamage(dmg, a.vx * 0.35, a.vy * 0.35, true);

            // Special arrow effects
            if (a.type === 'fire') z.isBurning = true;
            if (a.type === 'ice') { z.isFrozen = true; z.frozenTimer = 3.5; soundFX.playIceFreeze(); }
            if (a.type === 'tesla') this.triggerTeslaChain(z);

            a.pierceCount--;
            if (a.pierceCount <= 0) { a.dead = true; break; }
          }
          // 2) BODY HIT
          else if (bodyDist < 30 * z.scale) {
            a.hitEntities.add(z);
            const dmg = a.damage;
            soundFX.playFleshHit(false);
            spawnFloatingText('-' + Math.round(dmg), a.x, a.y - 18, { color: '#ffffff' });
            z.body.embedArrow(2, a.x - z.body.joints[2].x, a.y - z.body.joints[2].y, a.angle, a.type);
            z.takeDamage(dmg, a.vx * 0.18, a.vy * 0.18, false);

            if (a.type === 'fire') z.isBurning = true;
            if (a.type === 'ice') { z.isFrozen = true; z.frozenTimer = 3.5; soundFX.playIceFreeze(); }
            if (a.type === 'tesla') this.triggerTeslaChain(z);

            a.pierceCount--;
            if (a.pierceCount <= 0) { a.dead = true; break; }
          }
          // 3) LEG SHOT CHECK (Cripple / Stumble)
          else if (legDist < 26 * z.scale) {
            a.hitEntities.add(z);
            const dmg = a.damage * 0.8;
            soundFX.playFleshHit(false);
            z.speed *= 0.6; // Cripple speed!
            spawnFloatingText(`CRIPPLED! 🦵 -${Math.round(dmg)}`, a.x, a.y - 18, { color: '#e67e22', size: 20 });
            z.body.embedArrow(11, a.x - z.body.joints[11].x, a.y - z.body.joints[11].y, a.angle, a.type);
            z.takeDamage(dmg, a.vx * 0.12, a.vy * 0.12, false);

            if (a.type === 'fire') z.isBurning = true;
            if (a.type === 'ice') { z.isFrozen = true; z.frozenTimer = 3.5; soundFX.playIceFreeze(); }
            if (a.type === 'tesla') this.triggerTeslaChain(z);

            a.pierceCount--;
            if (a.pierceCount <= 0) { a.dead = true; break; }
          }
        }
      }

      if (a.dead) this.arrows.splice(i, 1);
    }

    // Check dead zombies reward & ground pickups
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const z = this.enemies[i];
      if (z.dead && !z.rewardGiven) {
        z.rewardGiven = true;
        this.kills++;
        if (Math.random() < 0.28) {
          this.pickups.push(new Pickup(z.x, z.y - 30, 'apple'));
        }
      }
    }

    // Pickups update & magnetic collection
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.update(dt, p1);
      if (p1 && !p1.dead && dist(pk.x, pk.y, p1.x, p1.y) < 55) {
        pk.collect(p1);
      }
      if (pk.dead) this.pickups.splice(i, 1);
    }

    // Clean up dead ragdolls after ground rest
    this.enemies = this.enemies.filter(z => !z.dead || z.body.joints[0].y < GROUND_Y() + 60);

    updateParticles(dt);

    if (this.enemiesToSpawn <= 0) this.checkWaveComplete();

    // ── Render ──────────────────────────────
    for (const pk of this.pickups) pk.draw();
    for (const z of this.enemies) z.draw();
    if (p1) p1.draw();
    for (const a of this.arrows) a.draw();

    this.drawReticle();
    drawFlyingCoins();
    drawParticles();
    drawFloatingTexts();

    updateHUD(this);

    // Charge bar
    if (p1 && !p1.dead && p1.isCharging) {
      const fill = document.getElementById('charge-fill');
      if (fill) fill.style.width = (p1.chargeFrac * 100) + '%';
      document.getElementById('charge-indicator').classList.remove('hidden');
    } else {
      document.getElementById('charge-indicator').classList.add('hidden');
    }
  },

  drawReticle() {
    if (this.state !== 'playing') return;
    const mx = this.mouseX;
    const my = this.mouseY;
    const p1 = this.players[0];

    ctx.save();
    ctx.translate(mx, my);

    const isCharging = p1 && !p1.dead && p1.isCharging;
    const charge = isCharging ? p1.chargeFrac : 0;
    const isFull = charge >= 0.98;

    // Glowing reticle ring
    ctx.shadowColor = isFull ? '#ffd700' : isCharging ? '#f39c12' : 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = isFull ? 16 : isCharging ? 8 : 0;

    // Base crosshair brackets
    const rad = lerp(16, 10, charge);
    ctx.strokeStyle = isFull ? '#ffd700' : isCharging ? '#ffffff' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;

    // 4 Corner Brackets
    [-1, 1].forEach(sx => {
      [-1, 1].forEach(sy => {
        ctx.beginPath();
        ctx.moveTo(sx * rad, sy * (rad - 5));
        ctx.lineTo(sx * rad, sy * rad);
        ctx.lineTo(sx * (rad - 5), sy * rad);
        ctx.stroke();
      });
    });

    // Center dot
    ctx.fillStyle = isFull ? '#ffd700' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, isFull ? 3.5 : 2, 0, PI2);
    ctx.fill();

    // Radial charge arc around reticle
    if (isCharging) {
      ctx.strokeStyle = isFull ? '#ffd700' : '#e74c3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rad + 7, -Math.PI / 2, -Math.PI / 2 + charge * PI2);
      ctx.stroke();

      if (isFull) {
        ctx.font = '900 11px sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText('MAX!', 0, -rad - 11);
      }
    }

    ctx.restore();
  },

  triggerTeslaChain(startZombie) {
    soundFX.playTeslaZap();
    let chains = 3;
    let curr = startZombie;
    for (const other of this.enemies) {
      if (chains <= 0) break;
      if (!other.dead && other !== curr && dist(curr.x, curr.y, other.x, other.y) < 180) {
        other.takeDamage(25, 0, -100, false);
        ctx.strokeStyle = '#a29bfe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(curr.x, curr.y - 40);
        ctx.lineTo(other.x, other.y - 40);
        ctx.stroke();
        curr = other;
        chains--;
      }
    }
  },

  showGameOver(reason = 'Fortress Overrun!') {
    this.setState('gameover');
    document.getElementById('gameover-title').textContent = reason;
    document.getElementById('go-wave').textContent = this.wave;
    document.getElementById('go-kills').textContent = this.kills;
    document.getElementById('go-gems').textContent = this.players[0] ? this.players[0].skulls : 0;
  }
};

// ─────────────────────────────────────────────
//  HUD & DELUXE SHOP UI BUILDER
// ─────────────────────────────────────────────
function updateHUD(g) {
  const p1 = g.players[0];
  if (p1) {
    const hpFrac = clamp(p1.hp / p1.maxHP, 0, 1);
    const fillEl = document.getElementById('health-fill-p1');
    const drainEl = document.getElementById('drain-fill-p1');
    const valEl = document.getElementById('hp-val-p1');
    if (fillEl) fillEl.style.width = (hpFrac * 100) + '%';
    if (drainEl) drainEl.style.width = (hpFrac * 100) + '%';
    if (valEl) valEl.textContent = `${Math.max(0, Math.round(p1.hp))} / ${p1.maxHP}`;
    document.getElementById('gem-count').textContent = p1.skulls;
  }
  const towerFrac = clamp(tower.hp / tower.maxHP, 0, 1);
  const towerBar = document.getElementById('health-fill-tower');
  const towerDrain = document.getElementById('drain-fill-tower');
  const towerVal = document.getElementById('hp-val-tower');
  if (towerBar) towerBar.style.width = (towerFrac * 100) + '%';
  if (towerDrain) towerDrain.style.width = (towerFrac * 100) + '%';
  if (towerVal) towerVal.textContent = `${Math.max(0, Math.round(tower.hp))} / ${tower.maxHP}`;

  document.getElementById('wave-num').textContent = g.wave;
  const alive = g.enemies.filter(e => !e.dead).length + g.enemiesToSpawn;
  document.getElementById('enemy-count').textContent = alive;
  document.getElementById('kill-count').textContent = g.kills;
}

let shopCurrentCategory = 'all';
let shopCurrentSort = 'default';

function buildShopUI(g) {
  const grid = document.getElementById('shop-items');
  if (!grid) return;
  grid.innerHTML = '';
  const p = g.players[0];
  if (!p) return;

  const prevWaveEl = document.getElementById('shop-wave-prev');
  if (prevWaveEl) prevWaveEl.textContent = Math.max(1, g.wave);
  const gemsEl = document.getElementById('shop-gems');
  if (gemsEl) gemsEl.textContent = p.skulls;

  // Sync category filter buttons active state and event handlers
  const filterBtns = document.querySelectorAll('.shop-filter-btn');
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === shopCurrentCategory);
    btn.onclick = () => {
      shopCurrentCategory = btn.dataset.cat;
      buildShopUI(g);
    };
  });

  // Sync sort select
  const sortSelect = document.getElementById('shop-sort-select');
  if (sortSelect) {
    sortSelect.value = shopCurrentSort;
    sortSelect.onchange = () => {
      shopCurrentSort = sortSelect.value;
      buildShopUI(g);
    };
  }

  // Filter items by category criteria
  let itemsToShow = g.p1Upgrades.slice();
  if (shopCurrentCategory !== 'all') {
    itemsToShow = itemsToShow.filter(u => u.category === shopCurrentCategory);
  }

  // Card renderer
  function renderItemCard(up) {
    const item = document.createElement('div');
    item.className = 'shop-item';

    const isEquippedBow = up.category === 'bows' && p.bowType === up.id;
    const isEquippedSpikes = up.id === 'spikes' && tower.hasSpikes;
    const isEquippedCaltrops = up.id === 'caltrops' && tower.hasCaltrops;
    const isEquippedTar = up.id === 'tarMoat' && tower.hasTarMoat;
    const isEquipped = isEquippedBow || isEquippedSpikes || isEquippedCaltrops || isEquippedTar;
    const isMaxed = up.maxLevel && up.level >= up.maxLevel;
    const isOwnedBow = up.category === 'bows' && up.bought && !isEquippedBow;

    let canAfford = false;
    let actionText = '';
    let isEquipAction = false;

    if (isEquipped) {
      actionText = up.category === 'bows' ? '✓ EQUIPPED' : '✓ DEPLOYED';
    } else if (isOwnedBow) {
      actionText = 'EQUIP (FREE)';
      canAfford = true;
      isEquipAction = true;
    } else if (isMaxed) {
      actionText = 'MAX LEVEL';
    } else {
      actionText = `💀 ${up.cost}`;
      canAfford = p.skulls >= up.cost;
    }

    if (isEquipped) item.classList.add('equipped');
    if (!canAfford && !isEquipped && !isOwnedBow) item.classList.add('disabled');

    let levelTag = '';
    if (up.maxLevel) {
      levelTag = `<span class="shop-lvl-badge">Lvl ${up.level}/${up.maxLevel}</span>`;
    }

    item.innerHTML = `
      <div class="shop-item-icon">${up.icon}</div>
      <div class="shop-item-content">
        <div class="shop-item-header">
          <div class="shop-item-name">${up.name}</div>
          ${levelTag}
        </div>
        <div class="shop-item-desc">${up.desc}</div>
        ${up.statLabel ? `<div class="shop-item-stat" style="font-size:11px;color:#f5a623;font-weight:700;margin-top:3px;">⚡ ${up.statLabel}</div>` : ''}
      </div>
      <button class="shop-buy-btn ${isEquipped ? 'btn-equipped' : ''}" ${(!canAfford && !isEquipped && !isOwnedBow) ? 'disabled' : ''}>
        ${actionText}
      </button>
    `;

    const buyBtn = item.querySelector('.shop-buy-btn');
    if (buyBtn && canAfford && !isEquipped) {
      buyBtn.addEventListener('click', () => {
        if (isEquipAction) {
          up.apply(p);
          soundFX.playBowDraw();
        } else {
          p.skulls -= up.cost;
          up.apply(p);
          up.bought = true;
          if (up.maxLevel) up.level++;
          soundFX.playGemCollect();
        }
        buildShopUI(g);
      });
    }

    grid.appendChild(item);
  }

  // Sorting and Categorization
  if (shopCurrentSort === 'cost-asc') {
    itemsToShow.sort((a, b) => a.cost - b.cost);
    itemsToShow.forEach(renderItemCard);
  } else if (shopCurrentSort === 'cost-desc') {
    itemsToShow.sort((a, b) => b.cost - a.cost);
    itemsToShow.forEach(renderItemCard);
  } else if (shopCurrentSort === 'name-asc') {
    itemsToShow.sort((a, b) => a.name.localeCompare(b.name));
    itemsToShow.forEach(renderItemCard);
  } else {
    // Default: Sort by Criteria Groups
    if (shopCurrentCategory === 'all') {
      const criteriaList = [
        { id: 'bows', title: '🏹 Weapon Arsenal' },
        { id: 'archer', title: '⚔️ Hero Archer Perks' },
        { id: 'tower', title: '🏰 Fortress Defenses & Traps' },
      ];
      criteriaList.forEach(crit => {
        const matching = itemsToShow.filter(u => u.category === crit.id).sort((a, b) => a.cost - b.cost);
        if (matching.length > 0) {
          const header = document.createElement('div');
          header.className = 'shop-section-title';
          header.textContent = crit.title;
          grid.appendChild(header);
          matching.forEach(renderItemCard);
        }
      });
    } else {
      itemsToShow.sort((a, b) => a.cost - b.cost);
      itemsToShow.forEach(renderItemCard);
    }
  }
}
window.buildShopUI = buildShopUI;

// ─────────────────────────────────────────────
//  INPUT EVENT LISTENERS
// ─────────────────────────────────────────────
window.addEventListener('keydown', e => {
  game.keys[e.code] = true;
  soundFX.ensure();

  // Toggle pause with [P] or [ESC]
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game.state === 'playing' || game.state === 'pause') {
      e.preventDefault();
      game.togglePause();
      return;
    }
  }

  // Quick next-wave from shop with Space / Enter
  if (game.state === 'shop') {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-next-wave').click();
    } else if (e.key >= '1' && e.key <= '8') {
      const idx = parseInt(e.key) - 1;
      const buttons = document.querySelectorAll('.shop-buy-btn');
      if (buttons[idx] && !buttons[idx].disabled) {
        buttons[idx].click();
      }
    }
  }
});
window.addEventListener('keyup', e => {
  game.keys[e.code] = false;
});

canvas.addEventListener('mousemove', e => {
  game.mouseX = e.clientX;
  game.mouseY = e.clientY;
});
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) {
    game.mouseDown = true;
    soundFX.ensure();
  }
});
canvas.addEventListener('mouseup', e => {
  if (e.button === 0) {
    game.mouseDown = false;
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// UI Buttons
document.getElementById('btn-play').addEventListener('click', () => {
  soundFX.ensure();
  game.startGame();
});
document.getElementById('btn-2player').addEventListener('click', () => {
  soundFX.ensure();
  game.startGame();
});
document.getElementById('btn-how').addEventListener('click', () => {
  game.setState('howtoplay');
});
document.getElementById('btn-howto-back').addEventListener('click', () => {
  game.setState('menu');
});
document.getElementById('btn-retry').addEventListener('click', () => {
  game.startGame();
});
document.getElementById('btn-menu').addEventListener('click', () => {
  game.setState('menu');
});
document.getElementById('btn-next-wave').addEventListener('click', () => {
  if (game.players[0]) game.players[0].hp = Math.min(game.players[0].maxHP, game.players[0].hp + 30);
  game.setState('playing');
  game.startNextWave();
});

// Pause Screen Buttons
const btnHudPause = document.getElementById('btn-hud-pause');
if (btnHudPause) {
  btnHudPause.addEventListener('click', () => {
    game.togglePause();
  });
}
const btnPauseResume = document.getElementById('btn-pause-resume');
if (btnPauseResume) {
  btnPauseResume.addEventListener('click', () => {
    game.togglePause();
  });
}
const btnPauseRestart = document.getElementById('btn-pause-restart');
if (btnPauseRestart) {
  btnPauseRestart.addEventListener('click', () => {
    game.restartCurrentWave();
  });
}
const btnPauseMenu = document.getElementById('btn-pause-menu');
if (btnPauseMenu) {
  btnPauseMenu.addEventListener('click', () => {
    game.setState('menu');
  });
}

// Sound toggles
const btnSound = document.getElementById('btn-sound');
const btnHudSound = document.getElementById('btn-hud-sound');
function updateSoundButtons() {
  const on = !soundFX.muted;
  if (btnSound) btnSound.textContent = on ? '🔊 Sound: ON' : '🔇 Sound: OFF';
  if (btnHudSound) btnHudSound.textContent = on ? '🔊' : '🔇';
}
if (btnSound) {
  btnSound.addEventListener('click', () => {
    soundFX.toggleMute();
    updateSoundButtons();
  });
}
if (btnHudSound) {
  btnHudSound.addEventListener('click', () => {
    soundFX.toggleMute();
    updateSoundButtons();
  });
}

// ─────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────
window.game = game;
game.setState('menu');
game.lastTime = performance.now();
game.animId = requestAnimationFrame(ts => game.tick(ts));
