import * as THREE from 'three';

export class WeaponSystem {
  constructor(scene, arena) {
    this.scene = scene;
    this.arena = arena;

    this.projectiles = [];
    this.particles = [];

    // Shared Geometries & Materials
    this.playerLaserGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    this.playerLaserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    this.botPlasmaGeo = new THREE.SphereGeometry(0.25, 12, 12);
    this.botPlasmaMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    // Particle geometries
    this.sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.sparkMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.sparkMatMagenta = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    this.sparkMatAmber = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  }

  spawnLaser(position, direction, owner) {
    const isPlayer = owner === 'player';
    const speed = isPlayer ? 60 : 45; // Units per sec

    let mesh;
    if (isPlayer) {
      mesh = new THREE.Mesh(this.playerLaserGeo, this.playerLaserMat);
      // Align cylinder rotation with travel direction
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    } else {
      mesh = new THREE.Mesh(this.botPlasmaGeo, this.botPlasmaMat);
    }

    mesh.position.copy(position);
    this.scene.add(mesh);

    // Light source on projectile
    const light = new THREE.PointLight(isPlayer ? 0x00f0ff : 0xff0055, 2, 6);
    mesh.add(light);

    this.projectiles.push({
      mesh,
      position: position.clone(),
      direction: direction.clone(),
      speed,
      owner,
      life: 2.0, // Max lifetime seconds
      damage: isPlayer ? 25 : 15,
    });
  }

  spawnSparks(pos, colorType = 'cyan') {
    const mat = colorType === 'cyan' ? this.sparkMatCyan : (colorType === 'magenta' ? this.sparkMatMagenta : this.sparkMatAmber);
    for (let i = 0; i < 12; i++) {
      const pMesh = new THREE.Mesh(this.sparkGeo, mat);
      pMesh.position.copy(pos);
      this.scene.add(pMesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 12
      );

      this.particles.push({
        mesh: pMesh,
        velocity: vel,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
      });
    }
  }

  spawnExplosion(pos) {
    // Multi-stage explosion particles for bot destruction
    for (let i = 0; i < 40; i++) {
      const mat = Math.random() > 0.5 ? this.sparkMatMagenta : this.sparkMatAmber;
      const size = 0.15 + Math.random() * 0.2;
      const pMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
      pMesh.position.copy(pos);
      this.scene.add(pMesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 15 + 4,
        (Math.random() - 0.5) * 20
      );

      this.particles.push({
        mesh: pMesh,
        velocity: vel,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
      });
    }
  }

  update(delta, player, bot, onHitCallback) {
    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      const moveStep = p.direction.clone().multiplyScalar(p.speed * delta);
      const nextPos = p.position.clone().add(moveStep);

      // Raycast test along projectile travel path
      const ray = new THREE.Raycaster(p.position, p.direction, 0, moveStep.length());
      
      // Target checks
      let hitDetected = false;

      if (p.owner === 'player' && !bot.isDead) {
        const botDist = p.position.distanceTo(bot.position);
        if (botDist < 1.6) {
          bot.takeDamage(p.damage);
          this.spawnSparks(p.position, 'magenta');
          hitDetected = true;
          if (onHitCallback) onHitCallback('player_hit_bot');
        }
      } else if (p.owner === 'bot' && !player.isDead) {
        const playerDist = p.position.distanceTo(player.position);
        if (playerDist < 1.4) {
          player.takeDamage(p.damage);
          this.spawnSparks(p.position, 'cyan');
          hitDetected = true;
          if (onHitCallback) onHitCallback('bot_hit_player');
        }
      }

      // Arena wall / obstacle collision
      if (!hitDetected && this.arena.checkCollision(nextPos, 0.2)) {
        this.spawnSparks(p.position, 'amber');
        hitDetected = true;
      }

      if (hitDetected || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      } else {
        p.position.copy(nextPos);
        p.mesh.position.copy(p.position);
      }
    }

    // Update Particle FX
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= delta;

      pt.velocity.y -= 25 * delta; // Gravity
      pt.mesh.position.addScaledVector(pt.velocity, delta);
      pt.mesh.scale.multiplyScalar(0.94);

      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  clear() {
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.particles.forEach((pt) => this.scene.remove(pt.mesh));
    this.projectiles = [];
    this.particles = [];
  }
}
