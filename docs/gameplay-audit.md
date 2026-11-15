# Gameplay Audit: Fame Fighters Combat Mechanics & Physics

**Audit Date:** November 2026  
**Subject Project:** Fame Fighters (`https://github.com/ayushcmd/fame-fighters`)  
**Combat Loop:** 60 FPS Fixed-Step Physics Tick with Sub-Frame Interpolation  

---

## 1. Core Combat Systems

### 1.1 Collision Detection & Hitbox Geometry
- Fighters utilize discrete cylindrical and box hitboxes for:
  - **Hurtbox**: Body bounding cylinder spanning from ground (`y = 0`) to top of head (`y = 1.95`), radius `0.38`.
  - **Hitbox**: Forward-projected spheres centered on the attacking limb (hand for punches, foot for kicks, torso for tackles).
- **Proximity & Range Calculation**:
  - Light attacks: Effective reach `0.95m` from center.
  - Heavy attacks & sweeps: Effective reach `1.25m` from center.
  - Grabs: Effective reach `0.85m` with contact verification.

---

## 2. Collision & Defensive Mechanics (Bug Identification & Fix)

### 2.1 The Crouch-Blocking Bug
- **Previous Implementation**:
  ```ts
  // Old logic in collision.ts
  if (defender.crouching) {
    return attackHeight === 'low'; // FLAW: Mid attacks bypassed crouch block!
  }
  ```
  In standard fighting games (Street Fighter, Tekken, Guilty Gear), **crouch blocking defends against both Low and Mid attacks**, while High/Overhead attacks hit through crouch block.
  In the previous version, because `attackHeight === 'low'` was exclusively checked, any `mid` attack struck the crouching defender unblocked, breaking basic neutral and defense.

### 2.2 Corrected Defense Implementation
- **Current Fixed Implementation (`src/combat/collision.ts`)**:
  ```ts
  export function isDefenderBlocking(
    defender: FighterState,
    attacker: FighterState,
    attackHeight: AttackHeight = 'mid'
  ): boolean {
    if (defender.state !== 'block' && !defender.crouching) return false;
    if (defender.busy && defender.state !== 'block') return false;

    // Must be holding backward relative to opponent
    const movingAway =
      (attacker.x > defender.x && defender.moveX < 0) ||
      (attacker.x < defender.x && defender.moveX > 0);

    if (!movingAway && defender.state !== 'block') return false;

    // Crouch block defends against Low and Mid attacks; High/Overheads hit crouching opponents.
    if (defender.crouching) {
      return attackHeight === 'low' || attackHeight === 'mid';
    }

    // Standing block defends against High and Mid attacks; Low attacks hit standing opponents.
    return attackHeight === 'high' || attackHeight === 'mid';
  }
  ```

---

## 3. Input Responsiveness & 10-Frame Input Buffer

### 3.1 Previous Issue: Dropped Inputs in Combos
- In the initial codebase, inputs were checked instantaneously against `fighter.busy`.
- When a player entered a combo sequence (such as `J-J-J` or `J-J-K`), pressing the next attack during the active recovery frames of the previous move would immediately drop the keystroke.
- This caused combat to feel unresponsive, stiff, and required frame-perfect input execution.

### 3.2 Implemented Fix: 10-Frame FIFO Input Buffer
- In `src/combat/fighterState.ts`, we introduced a **10-frame input buffer**:
  ```ts
  private inputBuffer: BufferedInput[] = [];
  private static readonly BUFFER_WINDOW_FRAMES = 10;
  ```
- **How It Works**:
  1. Whenever an attack button (`punch`, `kick`, `grab`, `super`) is detected in `updateInput()`, it is pushed to `this.inputBuffer` with a 10-frame countdown.
  2. If the fighter is currently busy (recovering from an attack, landing from a jump, or in minor hitstun), the input is stored safely in the buffer.
  3. On the exact frame the fighter returns to `grounded` or `idle`, `checkInputBuffer()` dequeues the buffered attack and executes it immediately via `executeAttackFromInput()`.
  4. Combo strings (e.g. `J, J, J`, `J, J, K`, `K, K, J`) now execute with fluid arcade responsiveness.

---

## 4. Frame Data & Combo Routing

| Move Name | Startup Frames | Active Frames | Recovery Frames | On-Block Advantage | Hit Height | Damage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Light Punch** (`J`) | 4 frames | 3 frames | 6 frames | +1 frame (Safe) | Mid | 6 HP |
| **Heavy Punch** (`J, J`) | 7 frames | 4 frames | 9 frames | -2 frames | Mid | 10 HP |
| **Launcher Punch** (`J, J, J`) | 9 frames | 5 frames | 14 frames | -6 frames (Unsafe) | High | 14 HP |
| **Low Kick** (`K`) | 5 frames | 4 frames | 8 frames | 0 frames | Low | 7 HP |
| **Sweep Kick** (`Down + K`) | 8 frames | 5 frames | 16 frames | -8 frames (Punishable)| Low (Knockdown) | 12 HP |
| **Grab / Throw** (`I` or `J+K`) | 5 frames | 2 frames | 20 frames | Unblockable | Throw | 18 HP |
| **Super Move** (`L` / `Space`) | 3 frames (Flash) | 15 frames | 30 frames | Unblockable (Cinematic)| Full Arena | 30 HP |

---

## 5. CPU AI Tuning & Difficulty Scaling

The AI system (`src/combat/ai.ts`) operates across 3 difficulty tiers:
1. **Easy**:
   - Reaction latency: 320ms - 450ms.
   - Attack frequency: 35%.
   - Block chance on incoming attack: 15%.
   - Does not jump over ground hazards or punish whiffs.
2. **Normal**:
   - Reaction latency: 140ms - 220ms.
   - Attack frequency: 65%.
   - Block chance on incoming attack: 55%.
   - Evades Chaiwala and jumps over low sweeps.
3. **Hard**:
   - Reaction latency: 40ms - 80ms (tournament tier).
   - Attack frequency: 85%.
   - Block chance on incoming attack: 85% (crouch blocks lows/mids, stand blocks overheads).
   - Executes hit-confirm combos (`J-J-K`), activates Super move upon reaching 100% meter when the opponent whiffs a heavy attack.
