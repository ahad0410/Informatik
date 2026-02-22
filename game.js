const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const waveEl = document.getElementById('wave');
const healthEl = document.getElementById('health');
const moneyEl = document.getElementById('money');
const weaponEl = document.getElementById('weaponName');
const shopEl = document.getElementById('shop');

const state = {
  wave: 1,
  money: 0,
  gameOver: false,
  keys: {},
  mouse: { x: canvas.width / 2, y: canvas.height / 2 },
  player: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 14,
    speed: 3.2,
    health: 100,
    maxHealth: 100,
    weapon: 'pistol',
    cooldown: 0,
  },
  bullets: [],
  enemies: [],
  message: 'Welle 1 startet!',
  messageTimer: 120,
};

const weapons = {
  pistol: { name: 'Pistole', damage: 20, fireRate: 18, speed: 8, pellets: 1, spread: 0, color: '#ffd166', cost: 0 },
  rifle: { name: 'Gewehr', damage: 30, fireRate: 10, speed: 11, pellets: 1, spread: 0.02, color: '#8ecae6', cost: 900 },
  shotgun: { name: 'Schrotflinte', damage: 18, fireRate: 24, speed: 9, pellets: 5, spread: 0.25, color: '#ff9f1c', cost: 1800 },
  laser: { name: 'Laser', damage: 55, fireRate: 7, speed: 13, pellets: 1, spread: 0, color: '#80ed99', cost: 3200 },
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnWave() {
  const baseCount = 4 + state.wave * 2;
  const isBossWave = state.wave % 5 === 0;
  const count = isBossWave ? baseCount - 3 : baseCount;

  for (let i = 0; i < count; i++) {
    spawnEnemy(false);
  }

  if (isBossWave) {
    spawnEnemy(true);
    showMessage(`Boss-Welle ${state.wave}!`);
  } else {
    showMessage(`Welle ${state.wave}`);
  }
}

function spawnEnemy(isBoss) {
  const side = Math.floor(rand(0, 4));
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = rand(0, canvas.width);
    y = -30;
  } else if (side === 1) {
    x = canvas.width + 30;
    y = rand(0, canvas.height);
  } else if (side === 2) {
    x = rand(0, canvas.width);
    y = canvas.height + 30;
  } else {
    x = -30;
    y = rand(0, canvas.height);
  }

  const hpScale = 1 + (state.wave - 1) * 0.22;

  if (isBoss) {
    state.enemies.push({
      x,
      y,
      radius: 30,
      speed: 1.15 + state.wave * 0.03,
      hp: Math.floor(350 * hpScale),
      maxHp: Math.floor(350 * hpScale),
      damage: 18,
      boss: true,
      reward: 700,
    });
  } else {
    state.enemies.push({
      x,
      y,
      radius: 16,
      speed: 1.25 + state.wave * 0.04,
      hp: Math.floor(50 * hpScale),
      maxHp: Math.floor(50 * hpScale),
      damage: 8,
      boss: false,
      reward: 100,
    });
  }
}

function showMessage(text) {
  state.message = text;
  state.messageTimer = 160;
}

function nextWave() {
  state.wave += 1;
  spawnWave();
  updateHud();
}

function updateHud() {
  waveEl.textContent = String(state.wave);
  healthEl.textContent = String(Math.max(0, Math.floor(state.player.health)));
  moneyEl.textContent = String(state.money);
  weaponEl.textContent = weapons[state.player.weapon].name;
}

function updatePlayer() {
  const p = state.player;
  let mx = 0;
  let my = 0;

  if (state.keys['w']) my -= 1;
  if (state.keys['s']) my += 1;
  if (state.keys['a']) mx -= 1;
  if (state.keys['d']) mx += 1;

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    p.x += (mx / len) * p.speed;
    p.y += (my / len) * p.speed;
  }

  p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(canvas.height - p.radius, p.y));

  if (p.cooldown > 0) p.cooldown -= 1;
}

function shoot() {
  const p = state.player;
  const weapon = weapons[p.weapon];

  if (p.cooldown > 0 || state.gameOver) return;

  const dx = state.mouse.x - p.x;
  const dy = state.mouse.y - p.y;
  const baseAngle = Math.atan2(dy, dx);

  for (let i = 0; i < weapon.pellets; i++) {
    const spread = rand(-weapon.spread, weapon.spread);
    const angle = baseAngle + spread;
    state.bullets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      radius: 4,
      damage: weapon.damage,
      color: weapon.color,
    });
  }

  p.cooldown = weapon.fireRate;
}

function updateBullets() {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if (b.x < -20 || b.x > canvas.width + 20 || b.y < -20 || b.y > canvas.height + 20) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius) {
        e.hp -= b.damage;
        state.bullets.splice(i, 1);

        if (e.hp <= 0) {
          state.money += e.reward;
          state.enemies.splice(j, 1);
          updateHud();
        }
        break;
      }
    }
  }
}

function updateEnemies() {
  const p = state.player;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
    }

    if (dist < p.radius + e.radius) {
      p.health -= e.damage * 0.02;
      if (p.health <= 0) {
        p.health = 0;
        state.gameOver = true;
        showMessage('Game Over - Seite neu laden zum Neustart');
      }
      updateHud();
    }
  }

  if (!state.gameOver && state.enemies.length === 0) {
    nextWave();
  }
}

function drawPlayer() {
  const p = state.player;
  ctx.fillStyle = '#4cc9f0';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  const angle = Math.atan2(state.mouse.y - p.y, state.mouse.x - p.x);
  ctx.strokeStyle = '#caf0f8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(angle) * 24, p.y + Math.sin(angle) * 24);
  ctx.stroke();
}

function drawEnemies() {
  for (const e of state.enemies) {
    ctx.fillStyle = e.boss ? '#ef476f' : '#e63946';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();

    // Healthbar
    const barW = e.radius * 2;
    const hpRatio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#00000099';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 12, barW, 6);
    ctx.fillStyle = e.boss ? '#ffd166' : '#90be6d';
    ctx.fillRect(e.x - e.radius, e.y - e.radius - 12, barW * hpRatio, 6);
  }
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUiInCanvas() {
  if (state.messageTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, canvas.width / 2, 44);
    state.messageTimer -= 1;
  }

  if (state.gameOver) {
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff595e';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePlayer();
  updateBullets();
  updateEnemies();

  drawBullets();
  drawEnemies();
  drawPlayer();
  drawUiInCanvas();

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  state.keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
  state.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = e.clientX - rect.left;
  state.mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => shoot());
window.addEventListener('mouseup', () => {});

setInterval(() => {
  if (state.keys[' '] || state.keys['enter']) {
    shoot();
  }
  if (state.keys['mouse']) {
    shoot();
  }
}, 30);

canvas.addEventListener('mousedown', () => {
  state.keys.mouse = true;
});

window.addEventListener('mouseup', () => {
  state.keys.mouse = false;
});

shopEl.addEventListener('click', (e) => {
  if (!(e.target instanceof HTMLButtonElement)) return;

  const weaponKey = e.target.dataset.weapon;
  if (!weaponKey || !weapons[weaponKey]) return;

  const choice = weapons[weaponKey];
  if (state.player.weapon === weaponKey) {
    showMessage(`${choice.name} bereits ausgerüstet`);
    return;
  }

  if (state.money < choice.cost) {
    showMessage(`Nicht genug Geld für ${choice.name}`);
    return;
  }

  state.money -= choice.cost;
  state.player.weapon = weaponKey;
  showMessage(`${choice.name} gekauft!`);
  updateHud();
});

updateHud();
spawnWave();
loop();
