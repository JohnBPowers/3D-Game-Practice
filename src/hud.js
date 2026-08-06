import * as THREE from 'three';

export class HUD {
  constructor() {
    // UI Elements
    this.playerHpBar = document.getElementById('player-hp-bar');
    this.playerHpText = document.getElementById('player-hp-text');
    this.playerShieldBar = document.getElementById('player-shield-bar');
    this.playerShieldText = document.getElementById('player-shield-text');

    this.aiHpBar = document.getElementById('ai-hp-bar');
    this.aiHpText = document.getElementById('ai-hp-text');
    this.aiStatusLabel = document.getElementById('ai-status-label');

    this.weaponHeatBar = document.getElementById('weapon-heat-bar');
    this.weaponHeatText = document.getElementById('weapon-heat-text');

    this.playerScore = document.getElementById('player-score');
    this.aiScore = document.getElementById('ai-score');
    this.roundNumber = document.getElementById('round-number');
    this.gameTimer = document.getElementById('game-timer');

    this.hitMarker = document.getElementById('hit-marker');
    this.damageVignette = document.getElementById('damage-vignette');
    this.mouseLockPrompt = document.getElementById('mouse-lock-prompt');
    this.targetLockBox = document.getElementById('target-lock-box');
    this.targetLockDist = document.getElementById('target-lock-dist');

    // Controls Visualizer Buttons
    this.keyUp = document.getElementById('key-up');
    this.keyDown = document.getElementById('key-down');
    this.keyLeft = document.getElementById('key-left');
    this.keyRight = document.getElementById('key-right');
    this.keySpace = document.getElementById('key-space');

    // 2D Radar Minimap Canvas
    this.minimapCanvas = document.getElementById('minimap');
    this.ctx = this.minimapCanvas.getContext('2d');
  }

  triggerHitmarker() {
    this.hitMarker.classList.add('active');
    setTimeout(() => {
      this.hitMarker.classList.remove('active');
    }, 120);
  }

  triggerDamageVignette() {
    this.damageVignette.classList.add('active');
    setTimeout(() => {
      this.damageVignette.classList.remove('active');
    }, 200);
  }

  updateKeyVisualizer(keys) {
    if (keys.up) this.keyUp.classList.add('active');
    else this.keyUp.classList.remove('active');

    if (keys.down) this.keyDown.classList.add('active');
    else this.keyDown.classList.remove('active');

    if (keys.left) this.keyLeft.classList.add('active');
    else this.keyLeft.classList.remove('active');

    if (keys.right) this.keyRight.classList.add('active');
    else this.keyRight.classList.remove('active');

    if (keys.space) this.keySpace.classList.add('active');
    else this.keySpace.classList.remove('active');
  }

  updateStatus(player, bot, matchState, camera) {
    // Player Health & Shield
    const hpPercent = Math.max(0, (player.health / player.maxHealth) * 100);
    const shieldPercent = Math.max(0, (player.shield / player.maxShield) * 100);
    this.playerHpBar.style.width = `${hpPercent}%`;
    this.playerHpText.textContent = `${Math.ceil(player.health)} / 100`;
    this.playerShieldBar.style.width = `${shieldPercent}%`;
    this.playerShieldText.textContent = `${Math.ceil(player.shield)} / 100`;

    // AI Health Bar
    const aiHpPercent = Math.max(0, (bot.health / bot.maxHealth) * 100);
    this.aiHpBar.style.width = `${aiHpPercent}%`;
    this.aiHpText.textContent = `${Math.ceil(aiHpPercent)}% HEALTH`;
    this.aiStatusLabel.textContent = `MECH-BOT [${bot.state}]`;

    // Weapon Cooldown Bar
    const heatPercent = (player.fireTimer / player.fireRate) * 100;
    this.weaponHeatBar.style.width = `${heatPercent}%`;
    this.weaponHeatText.textContent = heatPercent > 10 ? 'RECHARGING...' : 'READY';

    // Scores & Round
    this.playerScore.textContent = matchState.playerKills;
    this.aiScore.textContent = matchState.botKills;
    this.roundNumber.textContent = matchState.round;

    // Timer formatted MM:SS
    const mins = Math.floor(matchState.timeRemaining / 60).toString().padStart(2, '0');
    const secs = Math.floor(matchState.timeRemaining % 60).toString().padStart(2, '0');
    this.gameTimer.textContent = `${mins}:${secs}`;

    // Mouse Lock Prompt visibility
    if (document.pointerLockElement) {
      this.mouseLockPrompt.classList.add('hidden');
    } else {
      this.mouseLockPrompt.classList.remove('hidden');
    }

    // Update Control Keys Visualizer
    this.updateKeyVisualizer(player.keys);

    // 3D Target Locking Bracket
    if (camera) {
      this.updateTargetLock(camera, player, bot);
    }
  }

  updateTargetLock(camera, player, bot) {
    if (bot.isDead || player.isDead) {
      this.targetLockBox.classList.add('hidden');
      return;
    }

    // Project 3D Bot Position to 2D Screen Space
    const botPos = bot.position.clone();
    botPos.y += 1.0; // Center on torso

    const vector = botPos.clone();
    vector.project(camera);

    const dist = player.position.distanceTo(bot.position);

    // Check if Bot is in front of camera
    if (vector.z < 1.0 && dist < 45) {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      const screenX = vector.x * halfW + halfW;
      const screenY = -vector.y * halfH + halfH;

      this.targetLockBox.style.left = `${screenX}px`;
      this.targetLockBox.style.top = `${screenY}px`;
      this.targetLockDist.textContent = `${dist.toFixed(1)}m`;

      // Scale lock box based on distance
      const boxSize = Math.max(36, Math.min(80, 700 / dist));
      this.targetLockBox.style.width = `${boxSize}px`;
      this.targetLockBox.style.height = `${boxSize}px`;

      this.targetLockBox.classList.remove('hidden');
    } else {
      this.targetLockBox.classList.add('hidden');
    }
  }

  drawMinimap(arena, player, bot) {
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const size = arena.size;

    // Map 3D arena coordinates to 2D canvas coordinates
    const toCanvasX = (x) => ((x + size / 2) / size) * w;
    const toCanvasY = (z) => ((z + size / 2) / size) * h;

    // Clear Canvas
    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, w, h);

    // Draw Outer Arena Border
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(2, 2, w - 4, h - 4);

    // Draw Cover Obstacles
    this.ctx.fillStyle = '#1e293b';
    arena.obstacles.forEach((box) => {
      const minX = toCanvasX(box.min.x);
      const minY = toCanvasY(box.min.z);
      const maxX = toCanvasX(box.max.x);
      const maxY = toCanvasY(box.max.z);
      this.ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    });

    // Draw Health Powerup if active
    if (arena.healthPowerup && arena.healthPowerup.active) {
      const px = toCanvasX(arena.healthPowerup.position.x);
      const py = toCanvasY(arena.healthPowerup.position.z);
      this.ctx.fillStyle = '#00ff66';
      this.ctx.beginPath();
      this.ctx.arc(px, py, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw Bot Opponent Dot
    if (!bot.isDead) {
      const bx = toCanvasX(bot.position.x);
      const by = toCanvasY(bot.position.z);
      this.ctx.fillStyle = '#ff0055';
      this.ctx.beginPath();
      this.ctx.arc(bx, by, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Draw Player Position & Orientation Arrow
    if (!player.isDead) {
      const px = toCanvasX(player.position.x);
      const py = toCanvasY(player.position.z);

      this.ctx.save();
      this.ctx.translate(px, py);
      // Rotation angle
      this.ctx.rotate(-player.rotation.y);

      // Cyan Player Arrow
      this.ctx.fillStyle = '#00f0ff';
      this.ctx.beginPath();
      this.ctx.moveTo(0, -7);
      this.ctx.lineTo(5, 6);
      this.ctx.lineTo(-5, 6);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }
}
