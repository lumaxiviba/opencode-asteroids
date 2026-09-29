'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz (asteroide especial: rápida y con vida limitada) ──────────
class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);  // tamaño 1: no se fragmenta
    this.radius = 16;
    // Reescala el polígono heredado al nuevo radio
    const s = this.radius / RADII[1];
    this.verts = this.verts.map(([vx, vy]) => [vx * s, vy * s]);
    const angle = rand(0, Math.PI * 2);
    const speed = rand(280, 380);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl = rand(4, 6);
    this.points = 200;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea cuando está por expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.16, this.y - this.vy * 0.16);
    ctx.stroke();
    // Cuerpo poligonal, mismo estilo que los asteroides (borde blanco, sin relleno)
    super.draw();
  }
}

// ── Skins de nave ─────────────────────────────────────────────────────────────
// Cada skin define paths (polilíneas cerradas, nariz hacia +X), nose (spawn de
// balas) y flameX/flameW (base de la llama). Radio de colisión común: 12.
const SKINS = [
  {
    name: 'CLÁSICA',
    nose: 21, flameX: -8, flameW: 4,
    paths: [
      [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    ],
  },
  {
    name: 'DELTA',
    nose: 24, flameX: -9, flameW: 4,
    paths: [
      [[23, 0], [-14, -13], [-8, 0], [-14, 13]],
      [[9, 0], [3, -3.5], [0, 0], [3, 3.5]],   // cabina
    ],
  },
  {
    name: 'COHETE',
    nose: 18, flameX: -12, flameW: 4.5,
    paths: [
      [[17, 0], [8, -5], [-10, -5], [-10, 5], [8, 5]],
      [[-4, -5], [-15, -14], [-15, -5]],      // aleta superior
      [[-4, 5], [-15, 14], [-15, 5]],         // aleta inferior
      [[6, 0], [2, -3], [-1, 0], [2, 3]],     // ventana
    ],
  },
  {
    name: 'CAZA',
    nose: 17, flameX: -6, flameW: 3.5,
    paths: [
      [[16, 0], [2, -13], [-10, -13], [-5, -3], [-5, 3], [-10, 13], [2, 13]],
      [[8, 0], [4, -3], [1, 0], [4, 3]],      // cabina
    ],
  },
];

function loadSkin() {
  try {
    const i = Number(localStorage.getItem('asteroids-skin'));
    return Number.isInteger(i) && i >= 0 && i < SKINS.length ? i : 0;
  } catch { return 0; }
}

function saveSkin() {
  try { localStorage.setItem('asteroids-skin', String(skinIndex)); } catch {}
}

let skinIndex = loadSkin();
let skinMsgTimer = 0;
const currentSkin = () => SKINS[skinIndex];

// Traza los paths de una skin (transformación ya aplicada por el llamador)
function strokeSkinPaths(skin) {
  ctx.beginPath();
  for (const path of skin.paths) {
    ctx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
    ctx.closePath();
  }
  ctx.stroke();
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (speedTimer  > 0) speedTimer  -= dt;
    if (shieldTimer > 0) shieldTimer -= dt;
    if (tripleTimer > 0) tripleTimer -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (speedTimer > 0 ? 2 : 1);  // px/s² (x2 con powerup)
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = currentSkin().nose;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Triple disparo: 3 balas en abanico alrededor de la línea de tiro
    const SPREAD = 0.2;  // rad entre balas
    const count = tripleTimer > 0 ? 3 : 1;
    const shots = [];
    for (let i = 0; i < count; i++) {
      const a = this.angle + (i - (count - 1) / 2) * SPREAD;
      shots.push(new Bullet(ox, oy, a));
    }
    return shots;
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta según la skin activa
    const skin = currentSkin();
    strokeSkinPaths(skin);

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(skin.flameX, -skin.flameW);
      ctx.lineTo(skin.flameX - rand(6, 14), 0);
      ctx.lineTo(skin.flameX,  skin.flameW);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    // Escudo activo: círculo alrededor de la nave, parpadea al expirar
    if (shieldTimer > 0 && !(shieldTimer < 3 && Math.floor(shieldTimer * 8) % 2 === 0)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Powerups ('V' velocidad, 'E' escudo, 'T' triple disparo) ───────────────────
class Powerup {
  constructor(x, y, kind = 'V') {
    this.x = x;
    this.y = y;
    this.kind = kind;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl  = 12;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea cuando está por expirar
    if (this.ttl < 3 && Math.floor(this.ttl * 8) % 2 === 0) return;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 12px monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.kind, this.x, this.y);
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let speedTimer;  // segundos restantes del powerup de velocidad
let shieldTimer; // segundos restantes del powerup de escudo
let tripleTimer; // segundos restantes del powerup de triple disparo
let starTimer;   // cuenta atrás para la próxima estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  speedTimer   = 0;
  shieldTimer  = 0;
  tripleTimer  = 0;
  skinMsgTimer = 2;
  starTimer    = rand(6, 10);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  shieldTimer = 0;
  starTimer = rand(6, 10);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin con C (disponible en cualquier estado)
  if (pressed('KeyC')) {
    skinIndex = (skinIndex + 1) % SKINS.length;
    saveSkin();
    skinMsgTimer = 1.5;
  }
  if (skinMsgTimer > 0) skinMsgTimer -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead); // estrellas fugaces expiran aquí
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Estrella fugaz: aparece periódicamente, lejos de la nave
  starTimer -= dt;
  if (starTimer <= 0) {
    starTimer = rand(8, 14);
    const SAFE = 130;
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - ship.x, y - ship.y) < SAFE);
    asteroids.push(new ShootingStar(x, y));
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // 15% de drop repartido al azar entre V, E y T
        if (Math.random() < 0.15)
          powerups.push(new Powerup(a.x, a.y, ['V', 'E', 'T'][randInt(0, 2)]));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs powerup
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.kind === 'E')      shieldTimer = 8;
      else if (p.kind === 'T') tripleTimer = 5;
      else                     speedTimer  = 5;
      explode(p.x, p.y, 4);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    const shieldSplits = [];
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (shieldTimer > 0) {
          // El escudo destruye el asteroide (sin puntos)
          a.dead = true;
          explode(a.x, a.y, a.size * 5);
          shieldSplits.push(...a.split());
        } else {
          killShip();
          break;
        }
      }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(shieldSplits);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.5, 0.5);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 2.4;   // 1.2 efectivo tras el scale
  ctx.lineJoin    = 'round';
  strokeSkinPaths(currentSkin());
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);
  let hudRow = 48;
  if (speedTimer > 0) {
    ctx.fillText(`VELOCIDAD x2  ${speedTimer.toFixed(1)}s`, 14, hudRow);
    hudRow += 22;
  }
  if (shieldTimer > 0) {
    ctx.fillText(`ESCUDO  ${shieldTimer.toFixed(1)}s`, 14, hudRow);
    hudRow += 22;
  }
  if (tripleTimer > 0) {
    ctx.fillText(`TRIPLE DISPARO  ${tripleTimer.toFixed(1)}s`, 14, hudRow);
    hudRow += 22;
  }

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Aviso temporal de skin al cambiar con C
  if (skinMsgTimer > 0) {
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, skinMsgTimer * 2).toFixed(2)})`;
    ctx.fillText(`SKIN: ${currentSkin().name} — C PARA CAMBIAR`, W / 2, H - 22);
  }

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
