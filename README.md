# Fame Fighters (Sansad Showdown) 🥊🏛️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r174-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)

> A high-octane, satirical 3D arcade fighter built from scratch in **TypeScript**, **Three.js**, and **Vite**, featuring procedural articulated character rigs, dynamic camera work, post-processing bloom, live news commentary, stage hazards, and real-time Web Audio sound synthesis.

---

## 🎮 Highlights & Features

- **11 Iconic Satirical Fighters**:
  - `Mitraman` (Kamal Dal) — *Super: Sudarshan Chakra*
  - `Yatra Boy` (Haath Sena) — *Super: Aloo Se Sona Machine*
  - `Deedee` (Khela Morcha) — *Super: Khela Hobe Mega Mic*
  - `Tariff Taau` (Freedom Party) — *Super: The Great Tariff Wall*
  - `Dozer Dada` (Bulldozer Front) — *Super: Bulldozer Nyay*
  - `Toll Man` (NHAI Express) — *Super: Expressway Express*
  - `Sutti Babu` (Kalam Party) — *Super: Palatbaazi Storm*
  - `Rail Raja` (Lantern Dal) — *Super: Sona Ki Rail*
  - `Ghar Mantri` (Chanakya Mandal) — *Super: Operation Lotus*
  - `Fact Bhai` (Source Sena) — *Super: Checkmate Truth Bomb*
  - `Mbapu` (Father of the Nation - Hidden Final Boss) — *Super: Dandi March Cyclone*
- **3 Dynamic 3D Arenas**:
  - **Sansad Bhavan (Diwali Edition)**: Featuring glowing diyas, lanterns, rangoli, celebratory green fireworks, and 240 animated spectators holding 16 satirical placards.
  - **Jantar Mantar**: Urban protest ground with street lamps, banners, and media cameras.
  - **Desi Sadak**: Bustling street battleground complete with parked autos and street carts.
- **Stage Hazards & Interactive Pickups**:
  - ☕ **Chaiwala Walker**: Free chai delivery that can be knocked over or picked up.
  - 🐄 **Stray Cow Crossing**: Halts battle lanes with priority right-of-way.
  - 🥦 **Sabzi Wala Cart**: Pushes across street lanes.
  - 🧨 **Sutli Bomb**: Timed explosive hazard with fiery knockback.
  - 🍬 **Soan Papdi Box**: Sweet Diwali mithai buff granting speed & defense.
  - 📕 **Nirmala's Budget Meter**: Tap <kbd>B</kbd> to slash opponent health with surcharges!
- **Satirical Broadcast & Media**:
  - Live animated **Newsdesk** featuring `Shor Sharma` (Breaking Bakwas) vs `Tweety Trollwala` (Troll Army) reacting dynamically to hits, supers, combos, and knockouts.
  - Scrolling breaking news ticker.
  - Post-match **The Daily Jumla** satirical newspaper result screen with procedurally generated headlines, photo snaps, and post-defeat excuses.
- **Visuals & Rendering Engine**:
  - Procedural 3D articulated meshes with per-fighter styling (kurtas, caps, scarves, hair, glasses, beards).
  - 35-DOF skeletal posing system with 2-bone analytical leg IK.
  - 3,000-particle additive GPU shader pool with glowing sparks, flame bursts, and shockwaves.
  - Three.js `EffectComposer` pipeline with `UnrealBloomPass` and ACES filmic tone mapping.
- **100% Procedural Web Audio Engine**:
  - Zero external `.mp3` downloads required.
  - Custom synthesized background soundtracks (`intro`, `background`, `battle`).
  - Punch, kick, woosh, block, hitstop, crowd cheering, and super sound effects built on Web Audio API oscillators and noise buffers.
- **Game Modes**:
  - **Single Player vs CPU**: Easy, Normal, and Hard (with Boss AI aggression tuning).
  - **Local 2P Couch Versus**: Play head-to-head with a friend on a single keyboard!

---

## 🕹️ Controls

### Player 1 (Default)
| Action | Key |
|---|---|
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> |
| **Jump** | <kbd>W</kbd> or <kbd>↑</kbd> |
| **Crouch** | <kbd>S</kbd> or <kbd>↓</kbd> |
| **Block** | Hold back away from opponent |
| **Punch (Jab / Cross / Low)** | <kbd>J</kbd> |
| **Kick (High / Roundhouse / Sweep)** | <kbd>K</kbd> |
| **Grab / Throw** | <kbd>I</kbd> or <kbd>J</kbd> + <kbd>K</kbd> |
| **Super Move (100% Shakti)** | <kbd>L</kbd> or <kbd>Space</kbd> |
| **Nirmala's Budget** | <kbd>B</kbd> |
| **Pause / Resume** | <kbd>Esc</kbd> |
| **Toggle Music / Mute** | <kbd>M</kbd> (Music) / <kbd>N</kbd> (All Sound) |

### Player 2 (Local Versus Mode)
- **Movement**: Arrow Keys (<kbd>←</kbd>, <kbd>→</kbd>, <kbd>↑</kbd>, <kbd>↓</kbd>)
- **Punch**: Numpad <kbd>1</kbd>
- **Kick**: Numpad <kbd>2</kbd>
- **Grab**: Numpad <kbd>3</kbd>
- **Super**: Numpad <kbd>0</kbd>

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed

### Installation
```bash
# Clone the repository
git clone https://github.com/ayushcmd/fame-fighters.git
cd fame-fighters

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Scripts
- `npm run dev`: Launch Vite development server with Hot Module Replacement.
- `npm run typecheck`: Strict TypeScript compile check (`tsc --noEmit`).
- `npm run build`: Production bundle compilation with tree-shaking and minification.
- `npm run preview`: Preview the generated `dist/` production build locally.

---

## 📁 Project Architecture

```
fame-fighters/
├── index.html               # Main app shell & modal screens
├── package.json             # NPM scripts & dependencies (three, vite, typescript)
├── tsconfig.json            # Strict TypeScript configuration
├── vite.config.ts           # Vite server & build options
├── src/
│   ├── main.ts              # Game bootstrap, screen router, render loop
│   ├── types.ts             # Core interfaces, MoveDef, Pose, FighterId
│   ├── audio/
│   │   └── sound.ts         # Procedural Web Audio API sound generator & synth loops
│   ├── battle/
│   │   └── engine.ts        # Main battle state coordinator & fixed 60Hz physics loop
│   ├── combat/
│   │   ├── ai.ts            # CPU decision engine & difficulty logic
│   │   ├── collision.ts     # Hitbox/hurtbox calculations, chip damage, pushboxes
│   │   ├── fighterState.ts  # Fighter state machine, Shakti meter, health
│   │   └── match.ts         # Best-of-3 round rules & timers
│   ├── data/
│   │   ├── dialogue.ts      # Satirical news dialogue, excuses, tickers, headlines
│   │   ├── fighters.ts      # 11 fighter definitions, colors, bios, supers
│   │   └── moves.ts         # Move frames, reaches, damages, callouts
│   ├── render/
│   │   ├── arena.ts         # 3D stages (Sansad Diwali, Jantar, Road) & crowds
│   │   ├── camera.ts        # Dynamic fighting camera with zoom & shake
│   │   ├── characterRig.ts  # Procedural 3D humanoid rigs & costume meshes
│   │   ├── portraits.ts     # Procedural 2D canvas portraits for all fighters
│   │   ├── pose.ts          # 35-DOF posing engine & 2-bone inverse kinematics
│   │   ├── props.ts         # Stage hazards (Cow, Chai, Bomb, Sabzi, Mithai)
│   │   ├── supers.ts        # 11 cinematic fighter Super sequences
│   │   └── vfx.ts           # Additive GPU particle engine & fireworks
│   ├── styles/
│   │   └── main.css         # Complete UI styling, responsive HUD, newspaper styles
│   └── ui/
│       ├── hud.ts           # Health bars, Shakti meters, combo counters, popups
│       ├── input.ts         # Multi-device keyboard & touch input bindings
│       ├── newsdesk.ts      # Animated newsdesk controller & breaking ticker
│       └── newspaper.ts     # "The Daily Jumla" post-fight newspaper generator
```

---

## ⚖️ Satire Notice & Parody Disclaimer

**Fame Fighters (Sansad Showdown)** is a work of political satire and parody created solely for entertainment, humour, and social commentary. It is intended as an artistic expression of creative freedom under Article 19(1)(a) of the Constitution of India, subject to applicable laws.

- All fictional dialogues, scenarios, and headlines are satirical interpretations and do not represent factual statements.
- This game is not affiliated with, endorsed by, or connected to any political party, candidate, or government institution.
- The game contains cartoon-style exaggerated martial arts action. Please do not imitate it in real life.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 [ayushcmd](https://github.com/ayushcmd).

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) for community policies.
