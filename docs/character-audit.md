# Character Audit: Fame Fighters Roster Inspection

**Audit Date:** November 2026  
**Subject Project:** Fame Fighters (`https://github.com/ayushcmd/fame-fighters`)  
**Fighter Roster Count:** 11 Fighters (10 Playable + 1 Unlockable Boss)  
**Prop Models:** 2 Active Prop GLBs (`bull1.glb`, `shepherd.glb`)  

---

## 1. Roster Overview & Technical Specifications

Each character uses a Draco-compressed GLTF 2.0 binary (`.glb`) with humanoid skeletal hierarchy (Hips, Spine, Neck, Head, LeftArm, RightArm, LeftUpLeg, RightUpLeg, Hands, Eyes). The engine scales caricatured head bones by `1.32x` while preserving limb kinematics.

| Fighter ID | Display Name | Satirical Alias | 3D Model Asset | Portrait File | Voice Trigger | Super Move Name |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `modi` | MITRAMAN | MitraMan | `public/models/modi.glb` (1.22 MB) | `public/faces/modi.webp` | `modi.mp3` | MITRA CHAKRA |
| `rahul` | YATRA BOY | Yatra Boy | `public/models/rahul.glb` (1.27 MB) | `public/faces/rahul.webp` | `rahul.mp3` | ALOO SE SONA |
| `didi` | DEEDEE | Deedee | `public/models/didi.glb` (1.08 MB) | `public/faces/didi.webp` | `didi.mp3` | KHELA HOBE |
| `trump` | TARIFF TAAU | Tariff Taau | `public/models/trump.glb` (1.21 MB) | `public/faces/trump.webp` | `trump.mp3` | TARIFF WALL |
| `yogi` | DOZER DADA | Dozer Dada | `public/models/yogi.glb` (1.08 MB) | `public/faces/yogi.webp` | `yogi.mp3` | BULLDOZER RUN |
| `nitin` | TOLL MAN | Toll Man | `public/models/nitin.glb` (1.32 MB) | `public/faces/nitin.webp` | `nitin.mp3` | EXPRESSWAY FASTAG |
| `ravi` | SUTTI BABU | Sutti Babu | `public/models/ravi.glb` (1.77 MB) | `public/faces/ravi.webp` | `ravi.mp3`, `raviwin.mp3` | BIHARI CYCLONE |
| `lalu` | RAIL RAJA | Rail Raja | `public/models/lalu.glb` (1.04 MB) | `public/faces/lalu.webp` | `lalu.mp3` | KULLHAD BULLET TRAIN |
| `amit` | GHAR MANTRI | Ghar Mantri | `public/models/amit.glb` (1.20 MB) | `public/faces/amit.webp` | `amit.mp3`, `amitwin.mp3` | OPERATION CHANKYA |
| `dhruv` | FACT BHAI | Fact Bhai | `public/models/dhruv.glb` (1.71 MB) | `public/faces/dhruv.webp` | `dhruv.mp3` | SOURCE CHECK TSUNAMI |
| `mbapu` | MBAPU | Supreme Boss | `public/models/mbapu.glb` (2.00 MB) | `public/faces/mbapu.webp` | `mbapuintro.mp3` | NON-VIOLENT WRATH |

---

## 2. In-Depth Fighter Profiles & Rig Inspections

### 2.1 Mitraman (`modi`)
- **Visual Identity:** Orange kurta with beige jacket, silver beard and hair, signature rimless glasses.
- **3D Mesh & Rig:** Authentic `modi.glb`. Left and Right eye anchors bound to caricatured face mesh. Casts and receives soft shadows (`PCFSoftShadowMap`).
- **Select Pose:** Chest forward, hands spread slightly outward at 82° rest angle with gentle breathing sway.
- **Combat Stats:** Walk forward: 2.2, Walk back: 1.7, Jump velocity: 7.6.
- **Super Move:** *Mitra Chakra* — Character rises into the sky as a blazing Sudarshan Chakra expands from a spark and is hurled toward the opponent for 30% unblockable damage.
- **Audio Cues:** Intro voice clip `"Mitron!"`, battle cry on super startup, Garba victory dance sound effects.

### 2.2 Yatra Boy (`rahul`)
- **Visual Identity:** White khadi kurta and pyjama, salt-and-pepper beard, rolled sleeves.
- **3D Mesh & Rig:** Authentic `rahul.glb`. Skeletal root at pelvis with responsive arm IK.
- **Select Pose:** Signature dual-arm victory rally salute with rhythmic torso sway.
- **Combat Stats:** Walk forward: 2.3, Walk back: 1.8, Jump velocity: 7.8.
- **Super Move:** *Aloo Se Sona* — Transforms the opponent into a golden potato and processes them through an industrial hopper, producing 24K gold bullion blocks.
- **Audio Cues:** Voice clips mapped to match start and victory sequences.

### 2.3 Deedee (`didi`)
- **Visual Identity:** Traditional white cotton sari with green border, reading glasses, hawai chappals.
- **3D Mesh & Rig:** Authentic `didi.glb`. Custom cloth drape mesh with dynamic shadow rendering.
- **Select Pose:** Right index finger raised in debate gesture with defiant stance.
- **Combat Stats:** Walk forward: 2.4 (high agility), Walk back: 1.9, Jump velocity: 8.0.
- **Super Move:** *Khela Hobe* — Summons a whirlwind of footballs and strikes the opponent into the stratosphere.

### 2.4 Tariff Taau (`trump`)
- **Visual Identity:** Navy blue suit, signature long red power tie, blond sweep hairstyle.
- **3D Mesh & Rig:** Authentic `trump.glb`. Exaggerated broad shoulders (`look.shoulders: 1.2`).
- **Select Pose:** Classic thumbs-up stance with rhythmic head nod.
- **Combat Stats:** Walk forward: 2.0, Walk back: 1.5, Jump velocity: 7.2 (heavy archetype, higher damage multiplier: 1.1x).
- **Super Move:** *Tariff Wall* — Erects a massive golden border wall that crushes the opponent.

### 2.5 Dozer Dada (`yogi`)
- **Visual Identity:** Saffron robes, tilak on forehead, shaved head with saffron wrap.
- **3D Mesh & Rig:** Authentic `yogi.glb`. Custom saffron material with roughness 0.72.
- **Select Pose:** Meditative upright posture with folded hands transitioning into combat stance.
- **Combat Stats:** Walk forward: 2.1, Walk back: 1.6, Jump velocity: 7.5.
- **Super Move:** *Bulldozer Run* — Summons an indomitable yellow construction bulldozer that charges across the arena floor.

### 2.6 Toll Man (`nitin`)
- **Visual Identity:** Beige safari suit, spectacles, warm smile.
- **3D Mesh & Rig:** Authentic `nitin.glb`. Optimized polycount with smooth normals.
- **Select Pose:** Confident highway inspector stance pointing toward the horizon.
- **Combat Stats:** Walk forward: 2.2, Jump velocity: 7.4.
- **Super Move:** *Expressway FASTag* — Rapid expressway flyover construction that envelops the arena with speeding asphalt.

### 2.7 Sutti Babu (`ravi`)
- **Visual Identity:** Kurta pyjama with checked scarf, traditional spectacles.
- **3D Mesh & Rig:** Authentic `ravi.glb`. Detailed facial rig.
- **Combat Stats:** High mobility fighter with rapid kicks and evasive dashes.
- **Voice Lines:** Mapped to `ravi.mp3` and unique victory line `raviwin.mp3`.

### 2.8 Rail Raja (`lalu`)
- **Visual Identity:** White kurta, prominent silver sideburns, traditional gamcha.
- **3D Mesh & Rig:** Authentic `lalu.glb`. Sturdy stance.
- **Super Move:** *Kullhad Bullet Train* — Summons an express locomotive through the stage background.

### 2.9 Ghar Mantri (`amit`)
- **Visual Identity:** Off-white kurta and dark sleeveless Modi jacket, silver beard and glasses.
- **3D Mesh & Rig:** Authentic `amit.glb`.
- **Combat Stats:** High defense value, heavy hitstun resistance.
- **Voice Lines:** Mapped to `amit.mp3` and victory line `amitwin.mp3`.

### 2.10 Fact Bhai (`dhruv`)
- **Visual Identity:** Casual t-shirt and blazer, youthful hairstyle, wireless mic.
- **3D Mesh & Rig:** Authentic `dhruv.glb`.
- **Super Move:** *Source Check Tsunami* — Floods the screen with flying citation papers and documentary footage.

### 2.11 Mbapu (`mbapu` - Boss)
- **Visual Identity:** Khadi dhoti, round spectacles, walking staff.
- **3D Mesh & Rig:** Authentic `mbapu.glb`. Boss aura with pulsing golden halo in hard mode.
- **Combat Stats:** Boss health pool (250 HP), uninterruptible armor on specific attacks, rapid counter-attacks.
- **Audio:** Dedicated boss intro announcement `mbapuintro.mp3`.

---

## 3. Prop Models Audit

- **`bull1.glb` (1.04 MB)**: Fully loaded and rigged for stage crossings and Dozer Dada cinematic super move.
- **`shepherd.glb` (856 KB)**: Companion asset for background rural stage animations.
