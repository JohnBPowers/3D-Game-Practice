import * as THREE from 'three';
import { sound } from './audio.js';

export class BotAI {
  constructor(scene, arena, weaponSystem) {
    this.scene = scene;
    this.arena = arena;
    this.weaponSystem = weaponSystem;

    this.position = new THREE.Vector3(0, 1.8, -22); // Spawn opposite side
    this.rotation = new THREE.Euler(0, 0, 0);
    this.meshGroup = new THREE.Group();

    // AI Stats & State
    this.maxHealth = 100;
    this.health = 100;
    this.isDead = false;
    this.state = 'PATROL'; // PATROL, HUNT, ATTACK, EVADE

    // Difficulty Settings Default (Normal)
    this.setDifficulty('normal');

    this.fireTimer = 0;
    this.targetPoint = new THREE.Vector3(0, 1.8, 0);
    this.changeTargetTimer = 0;

    this.createMechMesh();
    this.reset();
  }

  setDifficulty(level) {
    this.difficulty = level;
    if (level === 'easy') {
      this.moveSpeed = 9.0;
      this.turnSpeed = 3.0;
      this.fireRate = 0.85;
      this.accuracySpread = 0.15;
      this.detectionRange = 35;
    } else if (level === 'hard') { // Apex Terminator
      this.moveSpeed = 16.5;
      this.turnSpeed = 8.0;
      this.fireRate = 0.28;
      this.accuracySpread = 0.015;
      this.detectionRange = 70;
    } else { // normal - Cyber Mech
      this.moveSpeed = 13.0;
      this.turnSpeed = 5.0;
      this.fireRate = 0.45;
      this.accuracySpread = 0.05;
      this.detectionRange = 50;
    }
  }

  reset() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.state = 'PATROL';
    this.position.set(0, 1.8, -22);
    this.meshGroup.position.copy(this.position);
    this.meshGroup.visible = true;
    this.getNewPatrolTarget();
  }

  createMechMesh() {
    // Menacing Cyber Terminator Mech Model
    const mech = new THREE.Group();

    // Standard Materials
    const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x0a0e17, roughness: 0.25, metalness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.9 });
    const redAccentMat = new THREE.MeshStandardMaterial({ color: 0x990033, roughness: 0.4, metalness: 0.6 });
    const glowRedMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const glowCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const thrusterFlameMat = new THREE.MeshBasicMaterial({ color: 0xff3300, wireframe: true });

    // 1. TORSO & CHASSIS
    const torsoGroup = new THREE.Group();

    // Main Heavy Chest Block
    const chestGeo = new THREE.BoxGeometry(1.6, 1.8, 1.4);
    const chestMesh = new THREE.Mesh(chestGeo, darkArmorMat);
    chestMesh.position.y = 1.0;
    chestMesh.castShadow = true;
    torsoGroup.add(chestMesh);

    // Angular Chest Armor Plates
    const armorPlateGeo = new THREE.BoxGeometry(1.7, 0.9, 0.4);
    const armorPlateMesh = new THREE.Mesh(armorPlateGeo, redAccentMat);
    armorPlateMesh.position.set(0, 1.2, 0.6);
    armorPlateMesh.rotation.x = -0.2;
    torsoGroup.add(armorPlateMesh);

    // Glowing Core Reactor (Center Chest)
    const coreGeo = new THREE.OctahedronGeometry(0.35);
    const coreMesh = new THREE.Mesh(coreGeo, glowRedMat);
    coreMesh.position.set(0, 1.0, 0.72);
    torsoGroup.add(coreMesh);
    this.coreMesh = coreMesh;

    // Core Light
    this.coreLight = new THREE.PointLight(0xff0033, 4, 8);
    this.coreLight.position.set(0, 1.0, 0.8);
    torsoGroup.add(this.coreLight);

    // Mechanical Ribs / Hydraulics
    for (let side of [-0.65, 0.65]) {
      const ribGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2);
      const ribMesh = new THREE.Mesh(ribGeo, steelMat);
      ribMesh.position.set(side, 0.9, 0.4);
      ribMesh.rotation.z = side > 0 ? -0.3 : 0.3;
      torsoGroup.add(ribMesh);
    }

    mech.add(torsoGroup);

    // 2. MENACING HEAD & VISOR
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.2, 0.1);

    // Skull Helmet Base
    const skullGeo = new THREE.BoxGeometry(0.85, 0.65, 0.85);
    const skullMesh = new THREE.Mesh(skullGeo, darkArmorMat);
    skullMesh.castShadow = true;
    headGroup.add(skullMesh);

    // Jaw / Mandibles
    const jawGeo = new THREE.ConeGeometry(0.4, 0.4, 4);
    const jawMesh = new THREE.Mesh(jawGeo, steelMat);
    jawMesh.rotation.x = Math.PI;
    jawMesh.position.set(0, -0.35, 0.25);
    headGroup.add(jawMesh);

    // Angular Crimson Visor Mask
    const visorGeo = new THREE.BoxGeometry(0.92, 0.18, 0.3);
    const visorMesh = new THREE.Mesh(visorGeo, glowRedMat);
    visorMesh.position.set(0, 0.05, 0.38);
    headGroup.add(visorMesh);

    // Dual Eye Spotlights
    const eyeLightL = new THREE.PointLight(0xff0033, 2, 6);
    eyeLightL.position.set(-0.2, 0.05, 0.5);
    headGroup.add(eyeLightL);

    const eyeLightR = new THREE.PointLight(0xff0033, 2, 6);
    eyeLightR.position.set(0.2, 0.05, 0.5);
    headGroup.add(eyeLightR);

    // Threat Spotlight Beam forward
    const spotLight = new THREE.SpotLight(0xff0033, 5, 20, Math.PI / 6, 0.5);
    spotLight.position.set(0, 0.05, 0.4);
    spotLight.target.position.set(0, -2, 10);
    headGroup.add(spotLight);
    headGroup.add(spotLight.target);

    // Sharp Antenna Horns
    for (let side of [-0.4, 0.4]) {
      const hornGeo = new THREE.ConeGeometry(0.08, 0.7, 6);
      const hornMesh = new THREE.Mesh(hornGeo, steelMat);
      hornMesh.position.set(side, 0.45, -0.1);
      hornMesh.rotation.x = -0.4;
      hornMesh.rotation.z = side > 0 ? -0.2 : 0.2;
      headGroup.add(hornMesh);
    }

    mech.add(headGroup);

    // 3. MASSIVE SHOULDER PAULDRONS & WEAPONS
    // Shoulder Pauldrons
    for (let side of [-1.1, 1.1]) {
      const pauldronGeo = new THREE.BoxGeometry(0.7, 0.8, 1.1);
      const pauldronMesh = new THREE.Mesh(pauldronGeo, redAccentMat);
      pauldronMesh.position.set(side, 1.8, 0.1);
      pauldronMesh.rotation.z = side > 0 ? -0.25 : 0.25;
      pauldronMesh.castShadow = true;
      mech.add(pauldronMesh);

      // Rocket Pod Tubes on top of shoulders
      const podBoxGeo = new THREE.BoxGeometry(0.5, 0.4, 0.8);
      const podBoxMesh = new THREE.Mesh(podBoxGeo, steelMat);
      podBoxMesh.position.set(side * 1.05, 2.3, 0.1);
      mech.add(podBoxMesh);

      // 3 Launcher Holes per pod
      for (let zOffset of [-0.2, 0, 0.2]) {
        const holeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8);
        const holeMesh = new THREE.Mesh(holeGeo, glowRedMat);
        holeMesh.rotation.x = Math.PI / 2;
        holeMesh.position.set(side * 1.05, 2.3, 0.5 + zOffset);
        mech.add(holeMesh);
      }
    }

    // RIGHT ARM: Heavy Plasma Cannon
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(1.2, 1.0, 0.2);

    const cannonBodyGeo = new THREE.BoxGeometry(0.4, 0.45, 1.2);
    const cannonBodyMesh = new THREE.Mesh(cannonBodyGeo, steelMat);
    cannonBodyMesh.position.set(0, 0, 0.3);
    rightArmGroup.add(cannonBodyMesh);

    // Plasma Accelerator Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.2, 12);
    const barrelMesh = new THREE.Mesh(barrelGeo, darkArmorMat);
    barrelMesh.rotation.x = Math.PI / 2;
    barrelMesh.position.set(0, 0, 1.0);
    rightArmGroup.add(barrelMesh);

    // Cyan Energy Coils
    for (let zPos of [0.7, 0.9, 1.1]) {
      const ringGeo = new THREE.TorusGeometry(0.16, 0.03, 8, 16);
      const ringMesh = new THREE.Mesh(ringGeo, glowCyanMat);
      ringMesh.position.set(0, 0, zPos);
      rightArmGroup.add(ringMesh);
    }

    mech.add(rightArmGroup);

    // LEFT ARM: 4-Barrel Gatling Gun
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-1.2, 1.0, 0.2);

    const gatlingBodyGeo = new THREE.BoxGeometry(0.45, 0.45, 0.9);
    const gatlingBodyMesh = new THREE.Mesh(gatlingBodyGeo, steelMat);
    gatlingBodyMesh.position.set(0, 0, 0.2);
    leftArmGroup.add(gatlingBodyMesh);

    // Rotating Barrel Assembly
    this.gatlingBarrels = new THREE.Group();
    this.gatlingBarrels.position.set(0, 0, 0.7);

    const centerHubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12);
    const centerHubMesh = new THREE.Mesh(centerHubGeo, darkArmorMat);
    centerHubMesh.rotation.x = Math.PI / 2;
    this.gatlingBarrels.add(centerHubMesh);

    // 4 Barrel Tubes around center
    const tubeAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    tubeAngles.forEach((angle) => {
      const tubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
      const tubeMesh = new THREE.Mesh(tubeGeo, steelMat);
      tubeMesh.rotation.x = Math.PI / 2;
      tubeMesh.position.set(Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0.1);
      this.gatlingBarrels.add(tubeMesh);
    });

    leftArmGroup.add(this.gatlingBarrels);
    mech.add(leftArmGroup);

    // 4. ROBOTIC LEGS & HYDRAULIC STANCE
    for (let side of [-0.6, 0.6]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side, 0.1, 0);

      // Thigh
      const thighGeo = new THREE.BoxGeometry(0.35, 0.9, 0.45);
      const thighMesh = new THREE.Mesh(thighGeo, darkArmorMat);
      thighMesh.position.y = -0.4;
      legGroup.add(thighMesh);

      // Knee Joint
      const kneeGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const kneeMesh = new THREE.Mesh(kneeGeo, redAccentMat);
      kneeMesh.position.set(0, -0.85, 0.1);
      legGroup.add(kneeMesh);

      // Shin
      const shinGeo = new THREE.BoxGeometry(0.3, 0.8, 0.4);
      const shinMesh = new THREE.Mesh(shinGeo, steelMat);
      shinMesh.position.set(0, -1.2, -0.05);
      legGroup.add(shinMesh);

      // Metallic Claw Foot
      const footGeo = new THREE.BoxGeometry(0.5, 0.25, 0.8);
      const footMesh = new THREE.Mesh(footGeo, darkArmorMat);
      footMesh.position.set(0, -1.6, 0.15);
      legGroup.add(footMesh);

      mech.add(legGroup);
    }

    // 5. HOVER JET THRUSTERS (BASE)
    const thrusterGroup = new THREE.Group();
    thrusterGroup.position.set(0, -0.3, -0.2);

    for (let xPos of [-0.4, 0.4]) {
      const nozzleGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.5, 12);
      const nozzleMesh = new THREE.Mesh(nozzleGeo, steelMat);
      nozzleMesh.position.set(xPos, 0, 0);
      thrusterGroup.add(nozzleMesh);

      // Pulsing Flame Cone
      const flameGeo = new THREE.ConeGeometry(0.3, 0.9, 12);
      const flameMesh = new THREE.Mesh(flameGeo, thrusterFlameMat);
      flameMesh.rotation.x = Math.PI;
      flameMesh.position.set(xPos, -0.6, 0);
      thrusterGroup.add(flameMesh);
    }

    // Flame Light
    const thrusterLight = new THREE.PointLight(0xff4400, 3, 8);
    thrusterLight.position.set(0, -0.8, -0.2);
    thrusterGroup.add(thrusterLight);

    mech.add(thrusterGroup);

    this.meshGroup.add(mech);
    this.scene.add(this.meshGroup);
  }

  getNewPatrolTarget() {
    const half = this.arena.size / 2 - 4;
    const rx = (Math.random() - 0.5) * 2 * half;
    const rz = (Math.random() - 0.5) * 2 * half;
    this.targetPoint.set(rx, 1.8, rz);
    this.changeTargetTimer = 4 + Math.random() * 3;
  }

  hasLineOfSightTo(playerPos) {
    const dir = playerPos.clone().sub(this.position);
    const dist = dir.length();
    dir.normalize();

    const raycaster = new THREE.Raycaster(this.position, dir, 0.5, dist);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    for (const hit of intersects) {
      // If we hit an obstacle wall before reaching player, line of sight is blocked
      if (hit.object.geometry && hit.object.geometry.type === 'BoxGeometry' && hit.distance < dist - 1.5) {
        return false;
      }
    }
    return true;
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);
    sound.playHit();

    // Hit flash reaction
    const originalY = this.meshGroup.position.y;
    this.meshGroup.position.y += 0.2;
    setTimeout(() => {
      if (this.meshGroup) this.meshGroup.position.y = originalY;
    }, 50);

    if (this.health <= 0) {
      this.isDead = true;
      this.meshGroup.visible = false;
      sound.playExplosion();
      this.weaponSystem.spawnExplosion(this.position);
    } else {
      // Aggro onto player immediately when damaged
      this.state = 'HUNT';
    }
  }

  shoot(playerPos) {
    if (this.fireTimer > 0 || this.isDead) return;

    this.fireTimer = this.fireRate;
    sound.playEnemyPlasma();

    // Direction to player with accuracy spread based on difficulty
    const dir = playerPos.clone().sub(this.position).normalize();
    dir.x += (Math.random() - 0.5) * this.accuracySpread;
    dir.y += (Math.random() - 0.5) * this.accuracySpread * 0.5;
    dir.z += (Math.random() - 0.5) * this.accuracySpread;
    dir.normalize();

    const spawnPos = this.position.clone().addScaledVector(dir, 1.2);
    spawnPos.y += 0.4;

    this.weaponSystem.spawnLaser(spawnPos, dir, 'bot');
  }

  update(delta, player) {
    if (this.isDead) return;

    // Cooldown Timer
    if (this.fireTimer > 0) {
      this.fireTimer -= delta;
    }

    const playerPos = player.position.clone();
    const distanceToPlayer = this.position.distanceTo(playerPos);
    const canSeePlayer = this.hasLineOfSightTo(playerPos) && distanceToPlayer < this.detectionRange;

    // AI State Machine Logic
    if (this.health < 30 && this.arena.healthPowerup && this.arena.healthPowerup.active) {
      this.state = 'EVADE';
      this.targetPoint.copy(this.arena.healthPowerup.position);
    } else if (canSeePlayer) {
      if (distanceToPlayer < 18) {
        this.state = 'ATTACK';
      } else {
        this.state = 'HUNT';
      }
    } else {
      this.state = 'PATROL';
    }

    // State Execution
    let moveDestination = this.targetPoint.clone();

    if (this.state === 'ATTACK') {
      // Rotate face toward player
      const angle = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
      this.rotation.y = angle;

      // Shoot plasma
      this.shoot(playerPos);

      // Strafe sideways slowly
      const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
      moveDestination = this.position.clone().addScaledVector(right, (Math.sin(Date.now() * 0.003) > 0 ? 1 : -1) * 4);
    } else if (this.state === 'HUNT') {
      moveDestination = playerPos;
      const angle = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
      this.rotation.y = angle;
    } else if (this.state === 'EVADE') {
      const angle = Math.atan2(moveDestination.x - this.position.x, moveDestination.z - this.position.z);
      this.rotation.y = angle;
    } else { // PATROL
      this.changeTargetTimer -= delta;
      if (this.changeTargetTimer <= 0 || this.position.distanceTo(this.targetPoint) < 2) {
        this.getNewPatrolTarget();
      }
      const angle = Math.atan2(moveDestination.x - this.position.x, moveDestination.z - this.position.z);
      this.rotation.y = angle;
    }

    // Move toward target location
    const moveDir = moveDestination.clone().sub(this.position);
    moveDir.y = 0;
    if (moveDir.lengthSq() > 0.1) {
      moveDir.normalize();
      const nextPos = this.position.clone().addScaledVector(moveDir, this.moveSpeed * delta);

      if (!this.arena.checkCollision(nextPos, 1.2)) {
        this.position.copy(nextPos);
      } else {
        // Pick new patrol point if stuck against obstacle
        if (this.state === 'PATROL') this.getNewPatrolTarget();
      }
    }

    // Animate Gatling barrels when attacking or hunting
    if ((this.state === 'ATTACK' || this.state === 'HUNT') && this.gatlingBarrels) {
      this.gatlingBarrels.rotation.z += delta * 18;
    }

    // Pulse glowing core reactor light
    if (this.coreLight) {
      this.coreLight.intensity = 3 + Math.sin(Date.now() * 0.008) * 1.5;
    }

    // Floating bobbing motion for hover mech
    this.meshGroup.position.copy(this.position);
    this.meshGroup.position.y = 1.8 + Math.sin(Date.now() * 0.005) * 0.15;
    this.meshGroup.rotation.y = this.rotation.y;
  }
}
