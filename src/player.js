import * as THREE from 'three';
import { sound } from './audio.js';

export function safeRequestPointerLock(element) {
  if (!element || document.pointerLockElement) return;
  try {
    const res = element.requestPointerLock?.();
    if (res && typeof res.catch === 'function') {
      res.catch(() => {
        // Silently catch browser security rate-limiting errors
      });
    }
  } catch (e) {
    // Ignore synchronous exceptions
  }
}

export class Player {
  constructor(camera, scene, arena, weaponSystem) {
    this.camera = camera;
    this.scene = scene;
    this.arena = arena;
    this.weaponSystem = weaponSystem;

    this.position = new THREE.Vector3(0, 1.7, 22); // Spawn on player side
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.moveSpeed = 12.0;
    this.turnSpeed = 2.2;
    this.eyeHeight = 1.7;

    // Player Stats
    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.isDead = false;

    // Weapon Cooldown & Recoil
    this.fireRate = 0.22; // Seconds between shots
    this.fireTimer = 0;
    this.recoilOffset = 0;

    // Input States
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      strafeLeft: false,
      strafeRight: false,
    };

    // Mouse Look tracking
    this.mouseSensitivity = 0.002;
    this.isPointerLocked = false;

    this.setupInputs();
    this.createGunMesh();
    this.reset();
  }

  reset() {
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.isDead = false;
    this.position.set(0, this.eyeHeight, 22);
    this.rotation.set(0, Math.PI, 0); // Face towards center arena
    this.camera.position.copy(this.position);
    this.camera.rotation.copy(this.rotation);
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.handleKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });

    // Request pointer lock when clicking game canvas/container ONLY if playing and no modal active
    const container = document.getElementById('game-container');
    if (container) {
      container.addEventListener('click', (e) => {
        if (e.target.closest('.modal-overlay') || e.target.closest('.modal-card')) return;
        const isModalActive = !!document.querySelector('.modal-overlay.active');
        if (!this.isDead && !isModalActive && !document.pointerLockElement) {
          safeRequestPointerLock(container);
        }
      });
    }

    // Left click to shoot when pointer locked or interacting with canvas while playing
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('.modal-overlay') || e.target.closest('.modal-card')) return;
      const isModalActive = !!document.querySelector('.modal-overlay.active');
      if (e.button === 0 && !this.isDead && !isModalActive && (document.pointerLockElement || e.target.closest('#game-container'))) {
        this.shoot();
      }
    });

    // Track mouse drag fallback when pointer lock is not active
    let lastMouseX = null;
    let lastMouseY = null;

    window.addEventListener('mousemove', (e) => {
      const isModalActive = !!document.querySelector('.modal-overlay.active');
      if (this.isDead || isModalActive) return;

      if (document.pointerLockElement) {
        // Pointer Lock mode
        this.rotation.y -= e.movementX * this.mouseSensitivity;
        this.rotation.x -= e.movementY * this.mouseSensitivity;
        this.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotation.x));
      } else if (e.buttons === 1 && e.target.closest('#game-container')) {
        // Drag mouse look fallback if pointer lock is not enabled
        if (lastMouseX !== null && lastMouseY !== null) {
          const dx = e.clientX - lastMouseX;
          const dy = e.clientY - lastMouseY;
          this.rotation.y -= dx * this.mouseSensitivity;
          this.rotation.x -= dy * this.mouseSensitivity;
          this.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotation.x));
        }
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      lastMouseX = null;
      lastMouseY = null;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = !!document.pointerLockElement;
    });
  }

  handleKey(code, isDown) {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = isDown;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = isDown;
        break;
      case 'ArrowLeft':
        this.keys.left = isDown;
        break;
      case 'ArrowRight':
        this.keys.right = isDown;
        break;
      case 'KeyA':
        this.keys.strafeLeft = isDown;
        break;
      case 'KeyD':
        this.keys.strafeRight = isDown;
        break;
      case 'Space':
        this.keys.space = isDown;
        break;
    }
  }

  createGunMesh() {
    // Futuristic 3D Rifle Attached to Camera View
    this.gunGroup = new THREE.Group();

    // Rifle Body
    const bodyGeo = new THREE.BoxGeometry(0.12, 0.16, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 0, -0.2);
    this.gunGroup.add(bodyMesh);

    // Cyan Glow Lines
    const glowGeo = new THREE.BoxGeometry(0.13, 0.04, 0.4);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(0, 0.05, -0.2);
    this.gunGroup.add(glowMesh);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.rotation.x = Math.PI / 2;
    barrelMesh.position.set(0, 0.02, -0.5);
    this.gunGroup.add(barrelMesh);

    // Muzzle Flash Light
    this.muzzleLight = new THREE.PointLight(0x00f0ff, 0, 5);
    this.muzzleLight.position.set(0, 0.02, -0.7);
    this.gunGroup.add(this.muzzleLight);

    // Position gun relative to bottom right camera viewport
    this.gunGroup.position.set(0.28, -0.25, -0.45);
    this.camera.add(this.gunGroup);
    this.scene.add(this.camera);
  }

  shoot() {
    if (this.fireTimer > 0 || this.isDead) return;

    this.fireTimer = this.fireRate;
    this.recoilOffset = 0.08;

    // Trigger sound
    sound.playLaser();

    // Muzzle flash light pulse
    this.muzzleLight.intensity = 4;

    // Calculate bullet trajectory origin & direction from camera ray
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    const shootDir = raycaster.ray.direction.clone();
    const spawnPos = new THREE.Vector3();
    this.gunGroup.getWorldPosition(spawnPos);
    spawnPos.addScaledVector(shootDir, 0.5);

    // Fire laser projectile from weapon system
    this.weaponSystem.spawnLaser(spawnPos, shootDir, 'player');
  }

  takeDamage(amount) {
    if (this.isDead) return;

    sound.playPlayerDamage();

    // Absorb with shield first
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
      } else {
        const overflow = amount - this.shield;
        this.shield = 0;
        this.health = Math.max(0, this.health - overflow);
      }
    } else {
      this.health = Math.max(0, this.health - amount);
    }

    if (this.health <= 0) {
      this.isDead = true;
      if (document.pointerLockElement) {
        try { document.exitPointerLock(); } catch (e) {}
      }
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.shield = Math.min(this.maxShield, this.shield + amount * 0.5);
  }

  update(delta) {
    if (this.isDead) return;

    // Fire Cooldown
    if (this.fireTimer > 0) {
      this.fireTimer -= delta;
    }

    // Muzzle Flash Decay
    if (this.muzzleLight.intensity > 0) {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - delta * 30);
    }

    // Recoil Recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - delta * 0.8);
      this.gunGroup.position.z = -0.45 + this.recoilOffset;
    }

    // Handle Shooting Input (Space bar)
    if (this.keys.space) {
      this.shoot();
    }

    // Handle Turning Input (Arrow Left & Right)
    if (this.keys.left) {
      this.rotation.y += this.turnSpeed * delta;
    }
    if (this.keys.right) {
      this.rotation.y -= this.turnSpeed * delta;
    }

    // Calculate movement vector based on rotation
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.rotation.y, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.rotation.y, 0));

    if (this.keys.up) {
      moveDir.add(forward);
    }
    if (this.keys.down) {
      moveDir.sub(forward);
    }
    if (this.keys.strafeLeft) {
      moveDir.sub(right);
    }
    if (this.keys.strafeRight) {
      moveDir.add(right);
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const nextPos = this.position.clone().addScaledVector(moveDir, this.moveSpeed * delta);

      // Check collision with arena boundaries & obstacles
      if (!this.arena.checkCollision(nextPos, 0.9)) {
        this.position.copy(nextPos);
      } else {
        // Try slide along X or Z axis individually for smooth movement
        const slideX = this.position.clone();
        slideX.x = nextPos.x;
        if (!this.arena.checkCollision(slideX, 0.9)) {
          this.position.x = slideX.x;
        }

        const slideZ = this.position.clone();
        slideZ.z = nextPos.z;
        if (!this.arena.checkCollision(slideZ, 0.9)) {
          this.position.z = slideZ.z;
        }
      }
    }

    // Update Camera position and orientation
    this.camera.position.copy(this.position);
    this.camera.rotation.copy(this.rotation);

    // Check Health Powerup Collection
    if (this.arena.healthPowerup && this.arena.healthPowerup.active) {
      const dist = this.position.distanceTo(this.arena.healthPowerup.position);
      if (dist < 2.0) {
        this.arena.healthPowerup.active = false;
        this.arena.healthPowerup.respawnTimer = 12; // 12 seconds respawn
        this.heal(40);
        sound.playPickup();
      }
    }
  }
}
