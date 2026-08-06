import * as THREE from 'three';

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.size = 60; // 60x60 units square arena
    this.wallHeight = 8;
    this.obstacles = []; // Bounding boxes for physics collision
    this.powerups = [];

    this.createEnvironment();
    this.createWalls();
    this.createCoverObstacles();
    this.createHealthPowerup();
  }

  createEnvironment() {
    // Cyber Grid Floor Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#060a17';
    ctx.fillRect(0, 0, 512, 512);

    // Major Grid
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 512, 512);

    // Sub-grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let x = step; x < 512; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = step; y < 512; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(12, 12);

    // Floor Mesh
    const floorGeo = new THREE.PlaneGeometry(this.size, this.size);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.4,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2b4c, 1.2);
    this.scene.add(ambientLight);

    // Main Directional Sunlight (Shadow caster)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(20, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    const d = 35;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // Cyberpunk Colored Point Lights
    const cyanLight = new THREE.PointLight(0x00f0ff, 3, 30);
    cyanLight.position.set(-20, 6, -20);
    this.scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff0055, 3, 30);
    magentaLight.position.set(20, 6, 20);
    this.scene.add(magentaLight);
  }

  createWalls() {
    const wallThickness = 2;
    const half = this.size / 2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });

    const neonMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonMatMagenta = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    const wallConfigs = [
      { pos: [0, this.wallHeight / 2, -half - wallThickness / 2], size: [this.size + wallThickness * 2, this.wallHeight, wallThickness] },
      { pos: [0, this.wallHeight / 2, half + wallThickness / 2], size: [this.size + wallThickness * 2, this.wallHeight, wallThickness] },
      { pos: [-half - wallThickness / 2, this.wallHeight / 2, 0], size: [wallThickness, this.wallHeight, this.size] },
      { pos: [half + wallThickness / 2, this.wallHeight / 2, 0], size: [wallThickness, this.wallHeight, this.size] },
    ];

    wallConfigs.forEach((cfg, index) => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...cfg.pos);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);

      // Create neon trim strip on wall top
      const stripGeo = new THREE.BoxGeometry(cfg.size[0], 0.3, cfg.size[2]);
      const stripMesh = new THREE.Mesh(stripGeo, index % 2 === 0 ? neonMatCyan : neonMatMagenta);
      stripMesh.position.set(cfg.pos[0], this.wallHeight + 0.15, cfg.pos[2]);
      this.scene.add(stripMesh);

      // Add to collision bounding boxes
      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push(box);
    });
  }

  createCoverObstacles() {
    const obstacleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.5,
    });

    const trimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // Symmetrical layout of tactical pillars, crates, and barriers
    const layouts = [
      // Central pillars
      { x: -8, z: -8, w: 4, h: 6, d: 4 },
      { x: 8, z: -8, w: 4, h: 6, d: 4 },
      { x: -8, z: 8, w: 4, h: 6, d: 4 },
      { x: 8, z: 8, w: 4, h: 6, d: 4 },

      // Low cover barriers
      { x: 0, z: -16, w: 10, h: 3, d: 2 },
      { x: 0, z: 16, w: 10, h: 3, d: 2 },
      { x: -16, z: 0, w: 2, h: 3, d: 10 },
      { x: 16, z: 0, w: 2, h: 3, d: 10 },

      // Corner crates
      { x: -18, z: -18, w: 5, h: 4, d: 5 },
      { x: 18, z: -18, w: 5, h: 4, d: 5 },
      { x: -18, z: 18, w: 5, h: 4, d: 5 },
      { x: 18, z: 18, w: 5, h: 4, d: 5 },
    ];

    layouts.forEach((item) => {
      const geo = new THREE.BoxGeometry(item.w, item.h, item.d);
      const mesh = new THREE.Mesh(geo, obstacleMat);
      mesh.position.set(item.x, item.h / 2, item.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Glowing top border accent
      const borderGeo = new THREE.BoxGeometry(item.w + 0.1, 0.2, item.d + 0.1);
      const borderMesh = new THREE.Mesh(borderGeo, trimMat);
      borderMesh.position.set(item.x, item.h + 0.1, item.z);
      this.scene.add(borderMesh);

      // Save collision box
      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push(box);
    });
  }

  createHealthPowerup() {
    // Floating glowing energy orb in center of map
    const orbGroup = new THREE.Group();
    orbGroup.position.set(0, 1.8, 0);

    const orbGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbGroup.add(orbMesh);

    const innerGeo = new THREE.OctahedronGeometry(0.5);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    orbGroup.add(innerMesh);

    const orbLight = new THREE.PointLight(0x00ff66, 2, 8);
    orbGroup.add(orbLight);

    this.scene.add(orbGroup);

    this.healthPowerup = {
      group: orbGroup,
      mesh: orbMesh,
      active: true,
      respawnTimer: 0,
      radius: 1.5,
      position: new THREE.Vector3(0, 1.8, 0),
    };
  }

  update(delta) {
    // Animate health powerup rotation and floating height
    if (this.healthPowerup) {
      if (this.healthPowerup.active) {
        this.healthPowerup.group.rotation.y += delta * 1.5;
        this.healthPowerup.group.position.y = 1.8 + Math.sin(Date.now() * 0.003) * 0.3;
        this.healthPowerup.group.visible = true;
      } else {
        this.healthPowerup.group.visible = false;
        this.healthPowerup.respawnTimer -= delta;
        if (this.healthPowerup.respawnTimer <= 0) {
          this.healthPowerup.active = true;
        }
      }
    }
  }

  // Check if a point/radius collides with any arena obstacle
  checkCollision(position, radius = 0.8) {
    const halfArena = this.size / 2 - radius;
    // Boundary check
    if (Math.abs(position.x) > halfArena || Math.abs(position.z) > halfArena) {
      return true;
    }

    // Box obstacle collision check
    const playerSphere = new THREE.Sphere(position, radius);
    for (const box of this.obstacles) {
      if (box.intersectsSphere(playerSphere)) {
        return true;
      }
    }
    return false;
  }
}
