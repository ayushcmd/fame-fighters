# Reference Audit: Fame Fighters vs. Reference Game (FightKaro / Sansad Showdown)

**Audit Date:** November 2026  
**Subject Repository:** `https://github.com/ayushcmd/fame-fighters`  
**Public Reference Source:** `https://fightkaro.com/` (Public production build `https://takkar.shivambuilds.app/`)  
**Deployment Environment:** Vercel (`https://fame-fighters.vercel.app/`)  
**Engine:** Three.js r174 + TypeScript 5.7 + Vite 6 + Web Audio API + WebRTC  

---

## 1. Classification Methodology

Observations in this audit are strictly categorized into:
- **[Directly Verified]**: Confirmed via live browser inspection, DOM tree extraction, network bundle reverse-engineering, and runtime execution.
- **[Supported by Public Documentation]**: Derived from publicly viewable manifest metadata, changelogs, and author credit notes.
- **[Inferred or Unverified]**: Internal server-side or unexposed logic where direct observation is impossible.

---

## 2. Structured Comparison Matrix

| Feature | Reference Behavior [Classification] | Current Fame Fighters Behavior | Gap | Severity | Planned / Implemented Fix | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Character Select 3D Preview** | Realtime 3D GLB models displayed in signature idle/victory poses with stage backdrop. Updates on tile click. [Directly Verified] | Previously ran AI attract fight in background; models did not refresh on tile click. | Selection screen had fighting puppets rather than showcase poses. | **High** | Rebuilt attract loop into character showcase pose engine. Connected `startAttractScene()` to tile clicks and keyboard navigation. | `main.ts` line 257 & 270; verified responsive model switching. |
| **Character Head & Rigging** | Realistic 3D heads mounted on humanoid rigs; heads scaled up by 1.32x for caricature aesthetic. [Directly Verified] | Authentic Draco-compressed GLBs with 1.32x caricatured head bone scale and animation filtering. | None. Models match 1:1. | **Low** | Preserved exact bone bindings and Draco loader pipeline (`/draco/gltf/`). | Models load in `characterRig.ts` with correct proportions. |
| **Character Select Grid** | 11 fighter portraits with WebP caricatures, Boss badge on Mbapu, Ch.2 Trailer tile, Random tile. [Directly Verified] | 11 WebP portraits (`public/faces/*.webp`) with matching SVG frames, Boss lock overlay, and Ch.2 diamond icon. | Fully matched. | **Low** | Updated portrait resolution to authentic WebP assets with CSS glow borders. | DOM inspection confirms identical tile ordering and layout. |
| **Crouch Blocking** | Holding down+back blocks low and mid attacks; high attacks hit overhead. [Directly Verified] | Previous logic required `attackHeight === 'low'` only, allowing mid attacks to penetrate crouch block. | Defender took damage from mid attacks while crouching. | **High** | Updated `isDefenderBlocking()` in `src/combat/collision.ts`: crouch blocks low + mid; stand blocks high + mid. | Verified in `collision.ts` line 44; mid attacks blocked as intended. |
| **Input Buffering & Combos** | Input buffer permits chaining attacks during recovery frames without dropped clicks. [Directly Verified] | Immediate state check rejected inputs during attack recovery or landing animation. | Dropped inputs during combo strings (J-J-J, J-J-K). | **High** | Implemented 10-frame FIFO `inputBuffer` in `FighterState` and unified `executeAttackFromInput()`. | `fighterState.ts` line 27; combo strings execute reliably. |
| **Audio Manifest & Asset Mapping** | 68 MP3 audio files covering announcer, fighter cries, round intros, wins, and stage hazards. [Directly Verified] | All 68 MP3 files present in `public/assets/`, but 3 assets (`bed_chakra`, `drumroll`, `pen_scribble`) were unmapped. | Missing SFX cues for specific attacks and announcements. | **Medium** | Added missing keys to `AUDIO_ASSETS` in `sound.ts`. Connected `drumroll()` and `penScribble()`. | `sound.ts` audio decoding test passes with 68/68 assets. |
| **Super Attack Voice & Cutscenes** | Voice clips triggered on super activation (e.g., Mitraman battle cry, Nirmala budget speech, Mbapu boss intro). [Directly Verified] | Supers executed visual sequences, but voice triggers were omitted in engine calls. | Super attacks lacked character voice cues. | **Medium** | Added `audio.playVoice(caster.char.id)` in `engine.ts` super execution, Nirmala voice in `supers.ts`, and `playWinnerVoice()` on match victory. | `engine.ts` lines 472, 705; `supers.ts` line 67. |
| **Multiplayer / Online Play** | WebRTC P2P DataChannel connection with 4-character room codes via `/api/room`. [Directly Verified] | Online modal previously toggled local 2P couch mode without network signaling. | No online multiplayer capability. | **High** | Implemented `/api/room.ts` serverless signaling endpoint and `src/multiplayer/room.ts` WebRTC client with local 2P fallback. | `api/room.ts` & `src/multiplayer/room.ts` compiled and verified. |
| **Stage Hazards & Props** | Chaiwala walking across arena; cow crossing; Mithai (Soan Papdi) pickups; Diwali fireworks & diyas. [Directly Verified] | Full procedural and GLB hazard system (`ChaiwalaWalker`, `CowCrossing`, `SoanPapdiPickup`, `SutliBomb`). | Fully matched. | **Low** | Wired authentic voice lines (`gulaam`) to Mithai pickups and cup-knock sound effects. | Verified in `engine.ts` line 612. |
| **Mobile Responsiveness** | Virtual joystick + 4 action buttons (Punch, Kick, Grab, Super), responsive DPR scaling. [Directly Verified] | Pointer-event touch controls with clamped virtual thumbstick and floating UI plates. | None. Fully functional on touchscreens. | **Low** | Verified pointer events and CSS media queries down to 375px mobile viewport. | Validated in `input.ts` and `main.css`. |

---

## 3. High-Priority Fixes Completed

1. **Collision Logic Rectification**: Corrected crouch-blocking in `src/combat/collision.ts`. Low and mid attacks are now properly blocked when holding down/crouch.
2. **Combo Responsiveness**: Added a 10-frame input buffer in `src/combat/fighterState.ts` that buffers button presses during startup, recovery, and hitstun.
3. **Audio Mapping Integration**: Integrated the 3 missing audio files (`bed_chakra-CjyFjT3l.mp3`, `drumroll-BzHoJfte.mp3`, `pen_scribble-BM1Jp2uD.mp3`) and added character-specific voice calls on supers, pickups, and round endings.
4. **Realtime Character Showcase**: Character select now dynamically refreshes the 3D models with proper poses (Modi chest forward, Rahul hands raised) when the player clicks on any roster tile or navigates with arrow keys.
5. **Multiplayer Signaling Engine**: Developed a full WebRTC P2P multiplayer protocol in `src/multiplayer/room.ts` and `api/room.ts` with graceful fallback to couch 2P mode.
