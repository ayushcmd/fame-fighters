import {
  GRAVITY,
  HARD_BOSS_TUNING,
  MOVES,
  SPAWN_X,
  STAGE_HALF,
} from '../data/moves.ts';
import type {
  Facing,
  FighterConfig,
  FighterStateKind,
  HitHeight,
  InputState,
  MoveDef,
  MoveId,
} from '../types.ts';

export interface ActiveAttack {
  def: MoveDef;
  frame: number;
  hasHit: boolean;
  chained: MoveId | null;
}

export class FighterState {
  readonly side: 0 | 1;
  readonly char: FighterConfig;

  x: number;
  y = 0;
  vx = 0;
  vy = 0;
  facing: Facing;

  maxHp = 100;
  hp = 100;
  meter = 0;
  power = 1;
  speedMul = 1;
  superShare: number | null = null;
  isBoss = false;
  bossRegen = 0;
  bossRegenDelay = 0;
  noDamageTimer = 0;
  mithaiBuffTimer = 0;

  state: FighterStateKind = 'intro';
  stateFrames = 0;
  stun = 0;
  downFrames = 0;
  invulFrames = 0;

  grounded = true;
  crouching = false;
  holdingBack = false;
  moveRel = 0;
  walkDistance = 0;

  attack: ActiveAttack | null = null;
  airAttackUsed = false;
  lastHitHeight: HitHeight = 'mid';

  comboHits = 0;
  comboTimer = 0;

  private inputBuffer: {
    kind: 'punch' | 'kick' | 'grab';
    frames: number;
    relX: number;
    crouch: boolean;
  } | null = null;

  private prevPunch = false;
  private prevKick = false;
  private prevGrab = false;
  private prevUp = false;

  onAttackStart?: (move: MoveDef) => void;
  onJump?: () => void;
  onLand?: () => void;

  constructor(side: 0 | 1, char: FighterConfig, startX?: number) {
    this.side = side;
    this.char = char;
    this.facing = side === 0 ? 1 : -1;
    this.x = startX ?? (side === 0 ? -SPAWN_X : SPAWN_X);
  }

  resetForRound(isBossHard = false): void {
    this.x = this.side === 0 ? -SPAWN_X : SPAWN_X;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;

    this.isBoss = isBossHard;
    this.maxHp = isBossHard ? 100 * HARD_BOSS_TUNING.hp : 100;
    this.hp = this.maxHp;
    this.power = isBossHard ? HARD_BOSS_TUNING.power : 1;
    this.superShare = isBossHard ? HARD_BOSS_TUNING.budgetShare : null;
    this.bossRegen = isBossHard ? HARD_BOSS_TUNING.regenRate : 0;
    this.bossRegenDelay = isBossHard ? HARD_BOSS_TUNING.regenDelay : 0;
    this.noDamageTimer = 0;
    this.mithaiBuffTimer = 0;
    this.speedMul = 1;

    this.state = 'idle';
    this.stateFrames = 0;
    this.stun = 0;
    this.downFrames = 0;
    this.invulFrames = 0;
    this.grounded = true;
    this.crouching = false;
    this.holdingBack = false;
    this.moveRel = 0;
    this.walkDistance = 0;
    this.attack = null;
    this.airAttackUsed = false;
    this.comboHits = 0;
    this.comboTimer = 0;
    this.inputBuffer = null;
    this.prevPunch = false;
    this.prevKick = false;
    this.prevGrab = false;
    this.prevUp = false;
  }

  get airborne(): boolean {
    return !this.grounded || this.y > 0.001;
  }

  get isLow(): boolean {
    return this.crouching || (this.attack?.def.crouching ?? false);
  }

  get invulnerable(): boolean {
    return (
      this.invulFrames > 0 ||
      this.state === 'knockdown' ||
      this.state === 'getup' ||
      this.state === 'ko' ||
      this.state === 'super' ||
      this.state === 'frozen'
    );
  }

  get canBlock(): boolean {
    return this.state === 'idle' || this.state === 'walk' || this.state === 'crouch' || this.state === 'blockstun';
  }

  get isAttackActive(): boolean {
    if (!this.attack) return false;
    const { frame, def } = this.attack;
    return frame > def.startup && frame <= def.startup + def.active;
  }

  get attackPhase(): 'startup' | 'active' | 'recovery' {
    if (!this.attack) return 'recovery';
    const { frame, def } = this.attack;
    if (frame <= def.startup) return 'startup';
    if (frame <= def.startup + def.active) return 'active';
    return 'recovery';
  }

  get busy(): boolean {
    return (
      this.state === 'attack' ||
      this.state === 'hitstun' ||
      this.state === 'blockstun' ||
      this.state === 'knockdown' ||
      this.state === 'getup' ||
      this.state === 'ko' ||
      this.state === 'victory' ||
      this.state === 'intro' ||
      this.state === 'super' ||
      this.state === 'frozen'
    );
  }

  forceState(next: FighterStateKind): void {
    this.state = next;
    this.stateFrames = 0;
  }

  addMeter(amount: number): void {
    const mult = this.isBoss ? HARD_BOSS_TUNING.superMult : 1;
    this.meter = Math.max(0, Math.min(100, this.meter + amount * mult));
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  applyMithaiBuff(): void {
    this.heal(16);
    this.addMeter(22);
    this.mithaiBuffTimer = 7;
    this.power = (this.isBoss ? HARD_BOSS_TUNING.power : 1) * 1.25;
    this.speedMul = 1.18;
  }

  knockOut(dir: number, vx = 3.2, vy = 6.2): void {
    this.hp = 0;
    this.attack = null;
    this.vx = dir * vx;
    this.vy = vy;
    this.grounded = false;
    this.downFrames = 0;
    this.forceState('ko');
  }

  private startAttack(id: MoveId): void {
    const def = MOVES[id];
    this.attack = { def, frame: 0, hasHit: false, chained: null };
    if (!def.air) {
      this.forceState('attack');
      this.vx = this.facing * def.lunge;
    } else {
      this.airAttackUsed = true;
    }
    this.onAttackStart?.(def);
  }

  private executeAttackFromInput(kind: 'punch' | 'kick' | 'grab', relX: number, isCrouching: boolean): void {
    if (kind === 'grab') {
      this.crouching = false;
      this.startAttack('grab');
    } else if (kind === 'punch') {
      if (isCrouching) this.startAttack('lowJab');
      else if (relX > 0) this.startAttack('special1');
      else this.startAttack('jab');
    } else if (kind === 'kick') {
      if (isCrouching) this.startAttack('sweep');
      else if (relX > 0) this.startAttack('special2');
      else this.startAttack('kick');
    }
  }

  update(input: InputState, opponentX: number, dt = 1 / 60): void {
    this.stateFrames++;
    if (this.invulFrames > 0) this.invulFrames--;

    if (this.mithaiBuffTimer > 0) {
      this.mithaiBuffTimer -= dt;
      if (this.mithaiBuffTimer <= 0) {
        this.power = this.isBoss ? HARD_BOSS_TUNING.power : 1;
        this.speedMul = 1;
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.comboHits = 0;
    }

    if (this.inputBuffer) {
      this.inputBuffer.frames--;
      if (this.inputBuffer.frames <= 0) this.inputBuffer = null;
    }

    if (this.bossRegen > 0 && this.hp > 0 && this.hp < this.maxHp) {
      this.noDamageTimer += dt;
      if (this.noDamageTimer >= this.bossRegenDelay) {
        this.hp = Math.min(this.maxHp, this.hp + this.bossRegen * dt);
      }
    }

    const punchEdge = input.punch && !this.prevPunch;
    const kickEdge = input.kick && !this.prevKick;
    const grabEdge = input.grab && !this.prevGrab;
    const upEdge = input.up && !this.prevUp;
    this.prevPunch = input.punch;
    this.prevKick = input.kick;
    this.prevGrab = input.grab;
    this.prevUp = input.up;

    // Update facing when grounded & neutral
    if (
      this.grounded &&
      (this.state === 'idle' || this.state === 'walk' || this.state === 'crouch')
    ) {
      if (Math.abs(opponentX - this.x) > 0.08) {
        this.facing = opponentX >= this.x ? 1 : -1;
      }
    }

    const relX = input.moveX * this.facing;
    this.holdingBack = relX < 0;

    if (this.state === 'frozen' || this.state === 'super' || this.state === 'intro' || this.state === 'victory') {
      return;
    }

    // Handle hitstun / blockstun
    if (this.state === 'hitstun' || this.state === 'blockstun') {
      this.stun--;
      this.vx *= Math.pow(0.84, dt * 60);
      this.integratePhysics(dt);
      if (this.stun <= 0) {
        this.forceState(this.crouching ? 'crouch' : 'idle');
      }
      return;
    }

    // Knockdown & KO
    if (this.state === 'knockdown' || this.state === 'ko') {
      this.integratePhysics(dt);
      if (this.grounded) {
        this.vx *= 0.8;
        this.downFrames++;
        if (this.state === 'knockdown' && this.downFrames >= 38) {
          this.invulFrames = 26;
          this.forceState('getup');
        }
      }
      return;
    }

    if (this.state === 'getup') {
      this.vx = 0;
      if (this.stateFrames >= 24) {
        this.invulFrames = 8;
        this.forceState('idle');
      }
      return;
    }

    // Active attack state (ground)
    if (this.state === 'attack' && this.attack) {
      this.attack.frame++;
      const { def, frame } = this.attack;
      if (frame <= def.startup + def.active) {
        this.vx *= 0.88;
      } else {
        this.vx *= 0.78;
      }
      this.integratePhysics(dt);

      // Buffer chain attacks on hit or late startup/active
      if (this.attack.hasHit && def.chains && !this.attack.chained) {
        if (punchEdge && def.chains.punch) this.attack.chained = def.chains.punch;
        else if (kickEdge && def.chains.kick) this.attack.chained = def.chains.kick;
      }

      // Buffer upcoming attack during recovery frames
      if (frame > def.startup + def.active) {
        if (grabEdge) this.inputBuffer = { kind: 'grab', frames: 10, relX, crouch: input.down };
        else if (punchEdge) this.inputBuffer = { kind: 'punch', frames: 10, relX, crouch: input.down };
        else if (kickEdge) this.inputBuffer = { kind: 'kick', frames: 10, relX, crouch: input.down };
      }

      if (this.attack.chained && frame >= def.startup + def.active) {
        const nextId = this.attack.chained;
        this.startAttack(nextId);
        return;
      }

      const total = def.startup + def.active + def.recovery;
      if (frame >= total) {
        this.attack = null;
        this.forceState(input.down ? 'crouch' : 'idle');
        if (this.inputBuffer && this.inputBuffer.frames > 0) {
          const buf = this.inputBuffer;
          this.inputBuffer = null;
          this.executeAttackFromInput(buf.kind, buf.relX, buf.crouch);
          return;
        }
      }
      return;
    }

    // Airborne state (jump + optional air attack)
    if (!this.grounded || this.state === 'jump') {
      if (this.attack) {
        this.attack.frame++;
        const total = this.attack.def.startup + this.attack.def.active + this.attack.def.recovery;
        if (this.attack.frame >= total) this.attack = null;
      } else if (!this.airAttackUsed) {
        if (punchEdge) this.startAttack('airPunch');
        else if (kickEdge) this.startAttack('airKick');
      }
      this.integratePhysics(dt);
      if (this.grounded) {
        this.attack = null;
        this.airAttackUsed = false;
        this.onLand?.();
        this.startAttack('landing');
      }
      return;
    }

    // Grounded neutral controls
    this.crouching = input.down;

    if (grabEdge || (input.punch && input.kick && punchEdge)) {
      this.executeAttackFromInput('grab', relX, false);
      return;
    }

    if (punchEdge) {
      this.executeAttackFromInput('punch', relX, this.crouching);
      return;
    }

    if (kickEdge) {
      this.executeAttackFromInput('kick', relX, this.crouching);
      return;
    }

    if (upEdge && !this.crouching) {
      this.grounded = false;
      this.vy = this.char.jumpV;
      this.vx = input.moveX * this.char.jumpVx * this.speedMul;
      this.airAttackUsed = false;
      this.forceState('jump');
      this.onJump?.();
      this.integratePhysics(dt);
      return;
    }

    if (this.crouching) {
      this.vx = 0;
      this.moveRel = 0;
      if (this.state !== 'crouch') this.forceState('crouch');
      return;
    }

    if (input.moveX !== 0) {
      const spd = (relX > 0 ? this.char.walkFwd : this.char.walkBack) * this.speedMul;
      this.vx = input.moveX * spd;
      this.moveRel = relX;
      this.walkDistance += Math.abs(this.vx) * dt;
      if (this.state !== 'walk') this.forceState('walk');
    } else {
      this.vx = 0;
      this.moveRel = 0;
      if (this.state !== 'idle') this.forceState('idle');
    }

    this.x = Math.max(-STAGE_HALF, Math.min(STAGE_HALF, this.x + this.vx * dt));
  }

  private integratePhysics(dt: number): void {
    this.x += this.vx * dt;
    this.x = Math.max(-STAGE_HALF, Math.min(STAGE_HALF, this.x));

    if (!this.grounded || this.vy > 0 || this.y > 0) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }
  }
}
