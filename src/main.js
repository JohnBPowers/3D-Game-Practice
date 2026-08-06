import * as THREE from 'three';
import { Arena } from './arena.js';
import { Player, safeRequestPointerLock } from './player.js';
import { BotAI } from './ai.js';
import { WeaponSystem } from './weapons.js';
import { HUD } from './hud.js';
import { sound } from './audio.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('game-container');
    
    // Game States: 'MENU', 'PLAYING', 'ROUND_OVER', 'GAME_OVER'
    this.gameState = 'MENU';
    
    this.matchState = {
      playerKills: 0,
      botKills: 0,
      round: 1,
      timeRemaining: 120, // 2 Minutes match timer
      playerShotsFired: 0,
      playerShotsHit: 0,
      totalDamageDealt: 0,
      matchStartTime: 0,
    };

    this.initThree();
    this.initGameModules();
    this.setupUIEvents();

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());

    // Start main render loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  initThree() {
    // 3D Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050711);
    this.scene.fog = new THREE.FogExp2(0x050711, 0.015);

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      150
    );

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.container.appendChild(this.renderer.domElement);
  }

  initGameModules() {
    this.arena = new Arena(this.scene);
    this.weaponSystem = new WeaponSystem(this.scene, this.arena);
    this.player = new Player(this.camera, this.scene, this.arena, this.weaponSystem);
    this.bot = new BotAI(this.scene, this.arena, this.weaponSystem);
    this.hud = new HUD();
  }

  setupUIEvents() {
    // Start Button
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => {
      sound.init();
      this.startNewMatch();
    });

    // Sound Toggle Button
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('click', () => {
      sound.init();
      sound.enabled = !sound.enabled;
      soundToggle.textContent = sound.enabled ? 'ENABLED 🔊' : 'MUTED 🔇';
      soundToggle.classList.toggle('muted', !sound.enabled);
    });

    // Difficulty Selector
    const difficultySelect = document.getElementById('difficulty-select');
    difficultySelect.addEventListener('change', (e) => {
      this.bot.setDifficulty(e.target.value);
    });

    // Restart / Main Menu Buttons
    document.getElementById('next-round-btn').addEventListener('click', () => {
      this.startNextRound();
    });

    document.getElementById('restart-game-btn').addEventListener('click', () => {
      this.returnToMenu();
    });
  }

  startNewMatch() {
    this.matchState.playerKills = 0;
    this.matchState.botKills = 0;
    this.matchState.round = 1;
    this.matchState.playerShotsFired = 0;
    this.matchState.playerShotsHit = 0;
    this.matchState.totalDamageDealt = 0;

    this.startRound();
  }

  startNextRound() {
    this.matchState.round += 1;
    this.startRound();
  }

  startRound() {
    this.matchState.timeRemaining = 120;
    this.matchState.matchStartTime = Date.now();

    this.weaponSystem.clear();
    this.player.reset();
    this.bot.reset();

    // Hide Modals
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('active');

    this.gameState = 'PLAYING';
  }

  returnToMenu() {
    this.gameState = 'MENU';
    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('active');
  }

  handleHitCallback(event) {
    if (event === 'player_hit_bot') {
      this.hud.triggerHitmarker();
      this.matchState.playerShotsHit += 1;
      this.matchState.totalDamageDealt += 25;
    } else if (event === 'bot_hit_player') {
      this.hud.triggerDamageVignette();
    }
  }

  onRoundEnd(winner) {
    this.gameState = 'ROUND_OVER';

    // Release mouse pointer lock immediately so cursor is freed for UI
    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (e) {}
    }

    if (winner === 'player') {
      this.matchState.playerKills += 1;
      sound.playVictory();
    } else {
      this.matchState.botKills += 1;
      sound.playDefeat();
    }

    const titleEl = document.getElementById('result-title');
    const subtitleEl = document.getElementById('result-subtitle');

    if (winner === 'player') {
      titleEl.textContent = 'VICTORY!';
      titleEl.className = 'result-win';
      subtitleEl.textContent = 'BOT MECH DESTROYED';
    } else {
      titleEl.textContent = 'DEFEAT!';
      titleEl.className = 'result-loss';
      subtitleEl.textContent = 'PLAYER TERMINATED BY CYBER BOT';
    }

    // Populate Stats Summary
    document.getElementById('final-score').textContent = `${this.matchState.playerKills} - ${this.matchState.botKills}`;
    document.getElementById('final-damage-dealt').textContent = this.matchState.totalDamageDealt;

    const accuracy = this.matchState.playerShotsFired > 0
      ? Math.round((this.matchState.playerShotsHit / this.matchState.playerShotsFired) * 100)
      : 0;
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;

    const matchDurationSecs = Math.floor((Date.now() - this.matchState.matchStartTime) / 1000);
    const m = Math.floor(matchDurationSecs / 60).toString().padStart(2, '0');
    const s = (matchDurationSecs % 60).toString().padStart(2, '0');
    document.getElementById('final-time').textContent = `${m}:${s}`;

    // Show Game Over Modal
    setTimeout(() => {
      const modal = document.getElementById('game-over-screen');
      modal.classList.remove('hidden');
      modal.classList.add('active');
    }, 1000);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.gameState === 'PLAYING') {
      // Countdown Match Timer
      this.matchState.timeRemaining = Math.max(0, this.matchState.timeRemaining - delta);
      if (this.matchState.timeRemaining <= 0) {
        if (this.player.health >= this.bot.health) {
          this.onRoundEnd('player');
        } else {
          this.onRoundEnd('bot');
        }
      }

      // Track Shots Fired when space bar pressed
      if (this.player.keys.space && this.player.fireTimer <= 0) {
        this.matchState.playerShotsFired += 1;
      }

      // Update Arena & Health Powerup
      this.arena.update(delta);

      // Update Player & Bot Entities
      this.player.update(delta);
      this.bot.update(delta, this.player);

      // Update Projectiles & Particles
      this.weaponSystem.update(delta, this.player, this.bot, (evt) => this.handleHitCallback(evt));

      // Update HUD Overlay & Minimap
      this.hud.updateStatus(this.player, this.bot, this.matchState, this.camera);
      this.hud.drawMinimap(this.arena, this.player, this.bot);

      // Round End Checks
      if (this.bot.isDead) {
        this.onRoundEnd('player');
      } else if (this.player.isDead) {
        this.onRoundEnd('bot');
      }
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate App when DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
