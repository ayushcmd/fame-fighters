import * as THREE from 'three';
import { CpuAI, emptyInput } from '../combat/ai.ts';
import { resolveHit, resolvePushbox } from '../combat/collision.ts';
import { FighterState } from '../combat/fighterState.ts';
import { MatchState } from '../combat/match.ts';
import { FIGHTERS } from '../data/fighters.ts';
import { DT, HARD_BOSS_TUNING, MOVE_CALLOUTS, STAGE_HALF } from '../data/moves.ts';
import { Arena } from '../render/arena.ts';
import { FightCamera } from '../render/camera.ts';
import { CharacterRig } from '../render/characterRig.ts';
import { getSelectPose, introPose, poseForFighter } from '../render/pose.ts';
import {
  ChaiwalaWalker,
  CowCrossing,
  SabziWalaWalker,
  SoanPapdiPickup,
  SutliBomb,
} from '../render/props.ts';
import {
  GrappleSequence,
  NirmalaBudgetSequence,
  createSuperSequence,
  type TimelineSequence,
} from '../render/supers.ts';
import { VfxManager } from '../render/vfx.ts';
import type { SoundEngine } from '../audio/sound.ts';
import type {
  Difficulty,
  FighterId,
  InputState,
  StageId,
} from '../types.ts';
import type { HudController } from '../ui/hud.ts';
import type { InputManager } from '../ui/input.ts';
import type { NewsdeskController } from '../ui/newsdesk.ts';

export type BattlePhase =
  | 'intro'
  | 'roundCall'
  | 'fight'
  | 'super'
  | 'ko'
  | 'victory'
  | 'ended';

export interface BattleResult {
  winnerId: FighterId;
  loserId: FighterId;
  p1Won: boolean;
  perfect: boolean;
  stageId: StageId;
}

export class BattleEngine {
  readonly p1: FighterState;
  readonly p2: FighterState;
  readonly rig1: CharacterRig;
  readonly rig2: CharacterRig;
  readonly arena: Arena;
  readonly fx: VfxManager;
  readonly match = new MatchState();

  phase: BattlePhase = 'intro';
  paused = false;

  private phaseTimer = 0;
  private accum = 0;
  private hitStop = 0;
  private elapsed = 0;
  private koSlowMo = 0;
  private idleChatterTimer = 7;
  private attractTime = 0;

  private readonly ai = new CpuAI();
  private readonly aiAttract = new CpuAI();
  private seq: TimelineSequence | null = null;
  private chai: ChaiwalaWalker;
  private cow: CowCrossing | null = null;
  private sabzi: SabziWalaWalker | null = null;
  private bomb: SutliBomb | null = null;
  private mithai: SoanPapdiPickup | null = null;

  private cowTimer = 11 + Math.random() * 6;
  private chaiTimer = 6 + Math.random() * 4;
  private bombTimer = 14 + Math.random() * 8;
  private mithaiTimer = 9 + Math.random() * 5;

  private budgetElapsed = 0;
  private budgetUsed = false;
  private readonly budgetNeeded = HARD_BOSS_TUNING.budgetSeconds;

  onMatchEnd?: (res: BattleResult) => void;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly cam: FightCamera,
    private readonly audio: SoundEngine,
    private readonly hud: HudController,
    private readonly news: NewsdeskController,
    private readonly input: InputManager,
    opts: {
      p1Id: FighterId;
      p2Id: FighterId;
      stageId: StageId;
      diff: Difficulty;
      isBossMatch?: boolean;
      attractMode?: boolean;
      local2p?: boolean;
    }
  ) {
    this.opts = opts;
    this.arena = new Arena(scene, opts.stageId);
    this.fx = new VfxManager(scene);
    this.chai = new ChaiwalaWalker(scene, this.arena.diwali);
    if (opts.stageId === 'road') {
      this.sabzi = new SabziWalaWalker(scene);
    }

    const c1 = FIGHTERS[opts.p1Id];
    const c2 = FIGHTERS[opts.p2Id];
    this.p1 = new FighterState(0, c1);
    this.p2 = new FighterState(1, c2);

    this.rig1 = new CharacterRig(c1);
    this.rig2 = new CharacterRig(c2);
    if (opts.p1Id === opts.p2Id) this.rig2.setAltTint(true);

    scene.add(this.rig1.root, this.rig2.root);

    this.bindFighterHooks(this.p1, this.rig1);
    this.bindFighterHooks(this.p2, this.rig2);

    const bossHard = Boolean(opts.isBossMatch || (opts.p2Id === 'mbapu' && opts.diff === 'hard'));
    this.p1.resetForRound(false);
    this.p2.resetForRound(bossHard);
    this.match.resetMatch();

    if (!opts.attractMode) {
      this.hud.setupMatch(this.p1, this.p2);
      this.hud.show(true);
      this.news.resetTicker();
      this.startRoundIntro();
    } else {
      this.phase = 'fight';
      this.hud.show(false);
    }
  }

  private readonly opts: {
    p1Id: FighterId;
    p2Id: FighterId;
    stageId: StageId;
    diff: Difficulty;
    isBossMatch?: boolean;
    attractMode?: boolean;
    local2p?: boolean;
  };

  private bindFighterHooks(f: FighterState, rig: CharacterRig): void {
    f.onAttackStart = (mv) => {
      if (!this.opts.attractMode && mv.id !== 'landing') {
        this.audio.whoosh();
      }
    };
    f.onJump = () => {
      if (!this.opts.attractMode) this.audio.whoosh();
      this.fx.dust(new THREE.Vector3(f.x, 0.05, 0), 0.7);
    };
    f.onLand = () => {
      if (!this.opts.attractMode) this.audio.thud();
      this.fx.dust(new THREE.Vector3(f.x, 0.05, 0), 0.8);
      rig.wink(0.15);
    };
  }

  private startRoundIntro(): void {
    const bossHard = Boolean(this.opts.isBossMatch || (this.opts.p2Id === 'mbapu' && this.opts.diff === 'hard'));
    this.p1.resetForRound(false);
    this.p2.resetForRound(bossHard);
    this.match.resetRoundTimer();

    if (this.match.round === 1) {
      this.phase = 'intro';
      this.phaseTimer = 2.0;
      this.p1.forceState('intro');
      this.p2.forceState('intro');
      this.hud.speech(this.p1, this.p1.char.introLine);
      this.hud.speech(this.p2, this.p2.char.introLine);
      this.hud.announce(this.match.roundTitle, 'READY YOUR NETAS!');
      this.audio.announce('round_1');
    } else {
      this.startRoundCall();
    }
  }

  private startRoundCall(): void {
    this.phase = 'roundCall';
    this.phaseTimer = 1.0;
    this.p1.forceState('idle');
    this.p2.forceState('idle');
    this.hud.announce(this.match.roundTitle, 'GET READY');
    this.audio.announce(this.match.round === 2 ? 'round_2' : 'final_round');
  }

  private enterFight(): void {
    this.phase = 'fight';
    this.hud.announce('FIGHT!');
    this.audio.announce('fight');
    window.setTimeout(() => {
      if (this.phase === 'fight') this.hud.hideAnnounce();
    }, 850);
  }

  private triggerSuper(caster: FighterState, target: FighterState): void {
    const casterRig = caster.side === 0 ? this.rig1 : this.rig2;
    const targetRig = target.side === 0 ? this.rig1 : this.rig2;
    caster.meter = 0;
    caster.forceState('super');
    target.forceState('frozen');
    this.phase = 'super';
    this.hud.showSuperBanner(caster.char.superName);
    this.news.reportEvent('super', caster.char.id, target.char.id);
    this.seq = createSuperSequence({
      scene: this.scene,
      caster,
      target,
      casterRig,
      targetRig,
      fx: this.fx,
      audio: this.audio,
      cam: this.cam,
      arena: this.arena,
      flash: (c, ms) => this.hud.flash(c, ms),
      popup: (t, p, col) => this.hud.popup(t, p, col),
      speech: (w, t) => this.hud.speech(w, t),
    });
  }

  private triggerNirmalaBudget(): void {
    if (this.phase !== 'fight' || this.budgetUsed || this.budgetElapsed < this.budgetNeeded) return;
    this.budgetUsed = true;
    this.p1.forceState('super');
    this.p2.forceState('frozen');
    this.phase = 'super';
    this.hud.showSuperBanner("NIRMALA'S UNION BUDGET!");
    this.news.reportEvent('budget', this.p1.char.id, this.p2.char.id);
    this.seq = new NirmalaBudgetSequence({
      scene: this.scene,
      caster: this.p1,
      target: this.p2,
      casterRig: this.rig1,
      targetRig: this.rig2,
      fx: this.fx,
      audio: this.audio,
      cam: this.cam,
      arena: this.arena,
      flash: (c, ms) => this.hud.flash(c, ms),
      popup: (t, p, col) => this.hud.popup(t, p, col),
      speech: (w, t) => this.hud.speech(w, t),
    });
  }

  update(rawDt: number): void {
    if (this.paused) return;
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;

    if (this.koSlowMo > 0) {
      this.koSlowMo -= dt;
    }
    const timeScale = this.seq ? this.seq.timeScale : this.koSlowMo > 0 ? 0.3 : 1;
    const simDt = dt * timeScale;

    this.arena.update(dt, this.elapsed);
    this.fx.update(dt, this.cam.camera);
    this.rig1.updateBlink(dt);
    this.rig2.updateBlink(dt);

    if (!this.opts.attractMode) {
      this.news.update(dt);
      const showBudget = this.p2.isBoss && !this.budgetUsed && this.phase === 'fight';
      if (this.phase === 'fight' && !this.budgetUsed && this.p2.isBoss) {
        this.budgetElapsed = Math.min(this.budgetNeeded, this.budgetElapsed + dt);
      }
      if (showBudget && this.input.consumeBudgetRequest()) {
        this.triggerNirmalaBudget();
      } else {
        this.input.consumeBudgetRequest();
      }

      this.hud.update(
        this.p1,
        this.p2,
        this.match.wins,
        this.match.timeRemaining,
        this.budgetElapsed / this.budgetNeeded,
        showBudget,
        dt,
        this.cam.camera
      );
    }

    if (this.phase === 'intro') {
      this.phaseTimer -= dt;
      this.rig1.applyPose(introPose(this.elapsed, this.p1.char.id));
      this.rig2.applyPose(introPose(this.elapsed + 0.5, this.p2.char.id));
      this.rig1.setTransform(this.p1.x, 0, 0, this.p1.facing);
      this.rig2.setTransform(this.p2.x, 0, 0, this.p2.facing);
      this.cam.frameFight(this.p1.x, this.p2.x, 0, 0);
      this.cam.update(dt);
      if (this.phaseTimer <= 0) this.startRoundCall();
      return;
    }

    if (this.phase === 'roundCall') {
      this.phaseTimer -= dt;
      this.syncRigs(dt);
      this.cam.frameFight(this.p1.x, this.p2.x, 0, 0);
      this.cam.update(dt);
      if (this.phaseTimer <= 0) this.enterFight();
      return;
    }

    if (this.phase === 'super' && this.seq) {
      this.seq.step(simDt);
      if (this.seq.casterPose) {
        const rig = this.p1.state === 'super' ? this.rig1 : this.rig2;
        rig.blendTo(this.seq.casterPose, Math.min(1, dt * 16));
      }
      if (this.seq.targetPose) {
        const rig = this.p1.state === 'super' ? this.rig2 : this.rig1;
        rig.blendTo(this.seq.targetPose, Math.min(1, dt * 16));
      }
      if (this.seq.targetTf) {
        const rig = this.p1.state === 'super' ? this.rig2 : this.rig1;
        const tf = this.seq.targetTf;
        rig.setFree(tf.x, tf.y, tf.z, tf.ry, tf.rx ?? 0, tf.rz ?? 0);
      } else {
        this.rig1.setTransform(this.p1.x, this.p1.y, 0, this.p1.facing);
        this.rig2.setTransform(this.p2.x, this.p2.y, 0, this.p2.facing);
      }

      if (this.seq.done) {
        this.seq.dispose();
        this.seq = null;
        this.hud.hideSuperBanner();
        if (this.p1.hp <= 0 || this.p2.hp <= 0) {
          this.handleKO();
        } else {
          this.p1.forceState('idle');
          if (this.p2.state === 'frozen' || this.p2.state === 'super') this.p2.forceState('idle');
          this.phase = 'fight';
        }
      }
      this.cam.update(dt);
      return;
    }

    if (this.phase === 'ko') {
      this.phaseTimer -= dt;
      this.accum += simDt;
      while (this.accum >= DT) {
        this.accum -= DT;
        this.p1.update(emptyInput(), this.p2.x, DT);
        this.p2.update(emptyInput(), this.p1.x, DT);
      }
      this.syncRigs(dt);
      this.cam.frameFight(this.p1.x, this.p2.x, this.p1.y, this.p2.y);
      this.cam.update(dt);
      if (this.phaseTimer <= 0) {
        this.finishRound();
      }
      return;
    }

    if (this.phase === 'victory') {
      this.phaseTimer -= dt;
      this.p1.stateFrames++;
      this.p2.stateFrames++;
      this.syncRigs(dt);
      const winF = this.p1.state === 'victory' ? this.p1 : this.p2;
      this.cam.set(
        new THREE.Vector3(winF.x + winF.facing * 0.4, 1.85, 4.4),
        new THREE.Vector3(winF.x, 1.25, 0),
        4,
        38
      );
      this.cam.update(dt);
      if (this.phaseTimer <= 0) {
        this.phase = 'ended';
        const p1Won = this.p1.state === 'victory';
        const winnerId = p1Won ? this.p1.char.id : this.p2.char.id;
        const loserId = p1Won ? this.p2.char.id : this.p1.char.id;
        this.onMatchEnd?.({
          winnerId,
          loserId,
          p1Won,
          perfect: p1Won ? this.p1.hp >= this.p1.maxHp : this.p2.hp >= this.p2.maxHp,
          stageId: this.opts.stageId,
        });
      }
      return;
    }

    // Main fight simulation loop
    if (this.opts.attractMode) {
      this.attractTime += dt;
      this.p1.x = -1.2;
      this.p1.y = 0;
      this.p1.facing = 1;
      this.p2.x = 1.2;
      this.p2.y = 0;
      this.p2.facing = -1;

      const p1Pose = getSelectPose(this.attractTime, this.p1.char.id, true);
      const p2Pose = getSelectPose(this.attractTime, this.p2.char.id, false);

      this.rig1.blendTo(p1Pose, Math.min(1, dt * 12));
      this.rig2.blendTo(p2Pose, Math.min(1, dt * 12));
      this.rig1.setTransform(-1.2, 0, 0, 1);
      this.rig2.setTransform(1.2, 0, 0, -1);
      this.rig1.updateBlink(dt);
      this.rig2.updateBlink(dt);

      this.arena.update(dt, this.elapsed);

      const camT = Math.sin(this.attractTime * 0.25) * 0.12;
      const dist = 4.1;
      this.cam.set(
        new THREE.Vector3(Math.sin(camT) * dist, 1.45, Math.cos(camT) * dist),
        new THREE.Vector3(0, 1.15, 0),
        2.5,
        40
      );
      this.cam.update(dt);
      return;
    }

    if (this.hitStop > 0) {
      this.hitStop--;
      this.cam.update(dt);
      return;
    }

    if (!this.opts.attractMode) {
      const timedOut = this.match.stepTimer(dt);
      if (timedOut) {
        this.handleTimeUp();
        return;
      }
      this.updatePropsAndHazards(dt);
    }

    this.accum += simDt;
    while (this.accum >= DT) {
      this.accum -= DT;
      this.stepSimulationFrame();
      if (this.phase !== 'fight') break;
    }

    this.syncRigs(dt);
    this.cam.frameFight(
      this.p1.x,
      this.p2.x,
      this.p1.y,
      this.p2.y,
      window.innerHeight > window.innerWidth
    );
    this.cam.update(dt);
  }

  private stepSimulationFrame(): void {
    const hazards = {
      cowX: this.cow && !this.cow.done ? this.cow.posX : undefined,
      bombX: this.bomb && !this.bomb.done ? this.bomb.posX : undefined,
      mithaiX: this.mithai && this.mithai.ready ? this.mithai.x : undefined,
    };

    const i1: InputState = this.opts.attractMode
      ? this.aiAttract.think(this.p1, this.p2, 'normal')
      : this.input.readP1(!this.opts.local2p);

    const i2: InputState = this.opts.attractMode
      ? this.ai.think(this.p2, this.p1, 'normal')
      : this.opts.local2p
        ? this.input.readP2Local()
        : this.ai.think(this.p2, this.p1, this.opts.diff, hazards);

    // Check Super activation in live battle
    if (!this.opts.attractMode) {
      if (i1.super && this.p1.meter >= 100 && !this.p1.busy && this.p1.grounded && !this.p2.invulnerable) {
        this.triggerSuper(this.p1, this.p2);
        return;
      }
      if (i2.super && this.p2.meter >= 100 && !this.p2.busy && this.p2.grounded && !this.p1.invulnerable) {
        this.triggerSuper(this.p2, this.p1);
        return;
      }
    } else {
      // Attract mode keeps both fighters healthy so preview loops endlessly
      if (this.p1.hp < 35) this.p1.hp = 100;
      if (this.p2.hp < 35) this.p2.hp = 100;
    }

    this.p1.update(i1, this.p2.x, DT);
    this.p2.update(i2, this.p1.x, DT);
    resolvePushbox(this.p1, this.p2);

    const hit1 = resolveHit(this.p1, this.p2);
    if (hit1) {
      this.onHitLanded(hit1.attackerSide, hit1.defenderSide, hit1);
      if (this.phase !== 'fight') return;
    }
    const hit2 = resolveHit(this.p2, this.p1);
    if (hit2) {
      this.onHitLanded(hit2.attackerSide, hit2.defenderSide, hit2);
      if (this.phase !== 'fight') return;
    }

    // Check if player hit Chai Bhaiya's cup
    if (!this.opts.attractMode && this.chai.active) {
      if (
        (this.p1.state === 'attack' && Math.abs(this.p1.x - this.chai.x) < 1.2) ||
        (this.p2.state === 'attack' && Math.abs(this.p2.x - this.chai.x) < 1.2)
      ) {
        this.chai.knockCup((Math.random() - 0.5) * 4);
      }
    }
  }

  private onHitLanded(
    atkSide: 0 | 1,
    defSide: 0 | 1,
    hit: NonNullable<ReturnType<typeof resolveHit>>
  ): void {
    const atk = atkSide === 0 ? this.p1 : this.p2;
    const def = defSide === 0 ? this.p1 : this.p2;

    if (hit.isGrab && !this.opts.attractMode) {
      this.phase = 'super';
      this.seq = new GrappleSequence({
        attacker: atk,
        defender: def,
        audio: this.audio,
        fx: this.fx,
        cam: this.cam,
        popup: (t, p, c) => this.hud.popup(t, p, c),
        speech: (w, t) => this.hud.speech(w, t),
      });
      return;
    }

    const impact = new THREE.Vector3(hit.pos.x, hit.pos.y, 0.25);
    const pwr = Math.min(1.6, hit.damage / 10);
    this.fx.hitSpark(impact, pwr, hit.blocked, atk.facing);

    if (!this.opts.attractMode) {
      if (hit.blocked) {
        this.audio.block();
        this.hitStop = 3;
      } else {
        this.audio.hit(pwr);
        this.cam.shake(0.14 + pwr * 0.16, 0.14);
        this.hitStop = hit.knockdown ? 7 : 4;
        if (hit.counter) {
          this.hud.popup('COUNTER!', impact.clone().add(new THREE.Vector3(0, 0.45, 0)), '#ff9e2c');
        } else if (MOVE_CALLOUTS[hit.moveId]) {
          this.hud.popup(MOVE_CALLOUTS[hit.moveId]!, impact.clone().add(new THREE.Vector3(0, 0.35, 0)), '#ffd23f');
        }
        if (def.comboHits >= 3) {
          this.news.reportEvent('combo', atk.char.id, def.char.id, { combo: def.comboHits });
        }
        this.arena.paparazzi(3);
      }
    }

    if (!this.opts.attractMode && def.hp <= 0) {
      this.handleKO();
    }
  }

  private updatePropsAndHazards(dt: number): void {
    // Chai Bhaiya
    this.chaiTimer -= dt;
    if (this.chaiTimer <= 0 && !this.chai.active) {
      this.chaiTimer = 14 + Math.random() * 7;
      this.chai.spawn(Math.random() < 0.5);
      this.audio.chaiTing();
      this.news.reportEvent('chai', this.p1.char.id, this.p2.char.id);
    }
    const chaiEv = this.chai.update(dt);
    if (chaiEv.cupBroken && chaiEv.x !== undefined) {
      this.audio.cupBreak();
      this.hud.popup('CHAI GIR GAYI!', new THREE.Vector3(chaiEv.x, 1.0, 0.2), '#fde047');
    }

    // Cow Crossing (sansad / jantar) or Sabzi Wala (road)
    if (this.opts.stageId === 'road' && this.sabzi) {
      this.cowTimer -= dt;
      if (this.cowTimer <= 0 && !this.sabzi.active) {
        this.cowTimer = 15 + Math.random() * 8;
        this.sabzi.spawn(Math.random() < 0.5);
        this.hud.popup('TAZA SABZI!', new THREE.Vector3(0, 2.2, 0.3), '#5cb85c');
      }
      this.sabzi.update(dt);
    } else {
      this.cowTimer -= dt;
      if (this.cowTimer <= 0 && !this.cow) {
        this.cowTimer = 18 + Math.random() * 9;
        const fromL = Math.random() < 0.5;
        this.cow = new CowCrossing(this.scene, fromL ? -8.5 : 8.5, fromL ? 8.5 : -8.5, 0.45);
        this.audio.cowBell();
        this.news.reportEvent('cow', this.p1.char.id, this.p2.char.id);
      }
      if (this.cow) {
        const ce = this.cow.update(dt);
        if (ce.moo) {
          this.audio.moo();
          this.hud.popup('MOOOO! TRAFFIC JAM!', new THREE.Vector3(this.cow.posX, 2.1, 0.4), '#ffffff');
        }
        // Gentle cow bump if fighter touches mid-lane
        [this.p1, this.p2].forEach((f) => {
          if (this.cow && !f.invulnerable && f.y < 0.7 && Math.abs(f.x - this.cow.posX) < 0.75) {
            f.vx = this.cow.dir * 3.5;
            f.vy = 4.2;
            f.grounded = false;
            f.forceState('knockdown');
          }
        });
        if (this.cow.done) {
          this.cow.dispose();
          this.cow = null;
        }
      }
    }

    // Sutli Bomb on Sansad Diwali
    if (this.arena.diwali) {
      this.bombTimer -= dt;
      if (this.bombTimer <= 0 && !this.bomb) {
        this.bombTimer = 16 + Math.random() * 8;
        const from = (Math.random() < 0.5 ? -1 : 1) * 5.8;
        const to = (this.p1.x + this.p2.x) * 0.5;
        this.bomb = new SutliBomb(this.scene, from, to);
        this.news.reportEvent('bomb', this.p1.char.id, this.p2.char.id);
      }
      if (this.bomb) {
        const be = this.bomb.update(dt);
        if (be.hiss) {
          this.hud.popup('SUTLI BOMB!', new THREE.Vector3(this.bomb.posX, 1.3, 0.4), '#ff5a5a');
        }
        if (be.boom) {
          this.audio.bombBlast();
          this.cam.shake(0.42, 0.45);
          this.fx.hitSpark(new THREE.Vector3(this.bomb.posX, 0.7, 0.3), 1.8, false, 0);
          [this.p1, this.p2].forEach((f) => {
            if (!f.invulnerable && Math.abs(f.x - this.bomb!.posX) < 1.55 && f.y < 1.4) {
              f.hp = Math.max(1, f.hp - 12);
              f.vx = Math.sign(f.x - this.bomb!.posX || f.side * 2 - 1) * 4.2;
              f.vy = 6.2;
              f.grounded = false;
              f.forceState('knockdown');
            }
          });
        }
        if (this.bomb.done) {
          this.bomb.dispose();
          this.bomb = null;
        }
      }

      // Soan Papdi mithai pickup
      this.mithaiTimer -= dt;
      if (this.mithaiTimer <= 0 && !this.mithai) {
        this.mithaiTimer = 15 + Math.random() * 7;
        const dropX = Math.max(-STAGE_HALF + 1, Math.min(STAGE_HALF - 1, (Math.random() - 0.5) * 8));
        this.mithai = new SoanPapdiPickup(this.scene, new THREE.Vector3(0, 4.5, -2.5), dropX);
      }
      if (this.mithai) {
        this.mithai.update(dt, this.elapsed);
        if (this.mithai.ready) {
          for (const f of [this.p1, this.p2]) {
            if (Math.abs(f.x - this.mithai.x) < 0.72 && f.y < 0.8) {
              f.applyMithaiBuff();
              this.audio.kaching();
              this.hud.popup('SOAN PAPDI BOOST! +HP', new THREE.Vector3(f.x, 2.2, 0.2), '#ffd23f');
              this.mithai.done = true;
              break;
            }
          }
        }
        if (this.mithai.done) {
          this.mithai.dispose();
          this.mithai = null;
        }
      }
    }

    this.idleChatterTimer -= dt;
    if (this.idleChatterTimer <= 0) {
      this.idleChatterTimer = 9;
      if (this.p1.state === 'idle' && this.p2.state === 'idle') {
        this.hud.popup('NATION WANTS A PUNCH!', new THREE.Vector3((this.p1.x + this.p2.x) * 0.5, 2.5, 0), '#ffd23f');
      }
    }
  }

  private handleKO(): void {
    this.phase = 'ko';
    this.phaseTimer = 2.0;
    this.koSlowMo = 1.1;
    this.hitStop = 0;
    this.audio.announce('ko');
    this.audio.boom();
    this.arena.cheer(2.0);
    this.arena.fireworks.burst(new THREE.Vector3(0, 5.5, -6), { speed: 7, size: 0.5, life: 1.6 });

    const p1KO = this.p1.hp <= 0;
    const winner = p1KO ? this.p2 : this.p1;
    const loser = p1KO ? this.p1 : this.p2;
    this.hud.announce(p1KO && this.p2.hp <= 0 ? 'DOUBLE K.O.!' : 'K.O.!', `${winner.char.name} TAKES THE ROUND`);
    this.news.reportEvent('ko', winner.char.id, loser.char.id);
  }

  private handleTimeUp(): void {
    this.hud.announce('TIME UP!');
    this.audio.announce('time_up');
    this.phase = 'ko';
    this.phaseTimer = 1.6;
  }

  private finishRound(): void {
    const p1Pct = this.p1.hp / this.p1.maxHp;
    const p2Pct = this.p2.hp / this.p2.maxHp;
    const winner: 0 | 1 | 'draw' = Math.abs(p1Pct - p2Pct) < 0.001 ? 'draw' : p1Pct > p2Pct ? 0 : 1;
    const rec = this.match.recordRoundWinner(winner);

    if (rec.matchOver && rec.matchWinner !== null) {
      this.phase = 'victory';
      this.phaseTimer = 3.2;
      const winF = rec.matchWinner === 0 ? this.p1 : this.p2;
      const perfect = winF.hp >= winF.maxHp;
      winF.forceState('victory');
      this.hud.announce(perfect ? 'PERFECT!' : `${winF.char.name} WINS!`, winF.char.winLine);
      this.hud.speech(winF, winF.char.winLine);
      this.audio.matchJingle(rec.matchWinner === 0);
      if (perfect) this.audio.announce('perfect');
    } else {
      this.startRoundCall();
    }
  }

  private syncRigs(dt: number): void {
    const threatened1 = this.p2.state === 'attack' && Math.abs(this.p1.x - this.p2.x) < 2.2;
    const threatened2 = this.p1.state === 'attack' && Math.abs(this.p1.x - this.p2.x) < 2.2;
    const pose1 = poseForFighter(this.p1, this.elapsed, threatened1);
    const pose2 = poseForFighter(this.p2, this.elapsed, threatened2);
    this.rig1.blendTo(pose1, Math.min(1, dt * 18));
    this.rig2.blendTo(pose2, Math.min(1, dt * 18));
    this.rig1.setTransform(this.p1.x, this.p1.y, 0, this.p1.facing);
    this.rig2.setTransform(this.p2.x, this.p2.y, 0, this.p2.facing);
  }

  dispose(): void {
    this.seq?.dispose();
    this.chai.dispose();
    this.cow?.dispose();
    this.sabzi?.dispose();
    this.bomb?.dispose();
    this.mithai?.dispose();
    this.rig1.dispose();
    this.rig2.dispose();
    this.arena.dispose();
    this.hud.hideSuperBanner();
    this.hud.hideAnnounce();
    this.hud.clearPopups();
    this.hud.show(false);
  }
}
