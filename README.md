# 🎮 CYBER-ARENA 3D FPS GAME

An action-packed 3D First Person Shooter web application built with **Three.js**, **Web Audio API**, and **Vanilla JavaScript**. Fight an aggressive, tactical Cyber Terminator Bot Mech in a futuristic arena!

![Cyber Arena 3D](https://img.shields.io/badge/Three.js-r160-00f0ff?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-ff0055?style=for-the-badge)

---

## ✨ Features

- **🎮 Dual Control Scheme**:
  - **Arrow Keys**: `▲` (Forward), `▼` (Backward), `◄` (Turn Left), `►` (Turn Right) + `SPACEBAR` (Shoot).
  - **WASD + Mouse Look**: Pointer Lock 3D aiming with smooth pitch/yaw camera control and left-click shooting.
- **🤖 Cyber Terminator Mech AI (`src/ai.js`)**:
  - Procedural 3D robot model with pulsing chest core reactor, rotating 4-barrel Gatling arm, plasma railgun, shoulder rocket pods, and thruster flames.
  - State Machine: `PATROL`, `HUNT`, `ATTACK`, `EVADE`.
  - Difficulty Levels: *Easy*, *Normal*, *Apex Terminator (Hard)*.
- **🥽 Tactical Visor HUD (`src/hud.js`)**:
  - **3D Target Locking Bracket**: Projects a 2D lock-on reticle directly onto the 3D position of the enemy mech with live distance tracking.
  - **2D Radar Minimap**: Live tactical radar showing player position, orientation, enemy bot position, and cover obstacles.
- **🔊 Web Audio API Synthesizer (`src/audio.js`)**: Zero-latency procedural sound FX for laser fire, plasma bolts, hitmarkers, explosions, and victory fanfares.
- **📦 Single-File Standalone HTML (`standalone_game.html`)**: Bundled 516 KB single HTML file that runs anywhere natively without needing any server!

---

## 🚀 Quick Start

### Play Standalone (Zero Setup)
Simply double-click `standalone_game.html` in File Explorer or open it in any web browser!

### Run Local Development Server
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build production bundle
npm run build
```

---

## 🛠️ Project Structure

```
├── index.html            # Main web page layout & HUD overlay
├── style.css             # Glassmorphism cyber UI design system
├── standalone_game.html  # 100% self-contained single-file edition
├── vite.config.js        # Vite bundler & singlefile config
├── src/
│   ├── main.js           # Application entry, 3D render loop & game state
│   ├── player.js         # First-person camera, controls & player mechanics
│   ├── ai.js             # Cyber Mech 3D model & AI state machine
│   ├── arena.js          # 3D Arena geometry, lighting & cover obstacles
│   ├── weapons.js        # Lasers, plasma bolts & particle FX engine
│   ├── hud.js            # HUD updates, minimap radar & 3D target lock
│   └── audio.js          # Web Audio API procedural sound synthesizer
└── package.json
```

---

## 📄 License
MIT License - free to use, modify, and distribute.
