import * as THREE from 'three';
import { createNirmalaTexture } from './portraits.ts';
import { flatDownPose, idlePose, lerpPose, panicPose, smoothstep, withPose, zeroPose } from './pose.ts';
import { makeGlowSprite } from './vfx.ts';
import type { SoundEngine } from '../audio/sound.ts';
import type { FighterState } from '../combat/fighterState.ts';
import type { Pose, RigHandle } from '../types.ts';
import type { Arena } from './arena.ts';
import type { FightCamera } from './camera.ts';
import type { VfxManager } from './vfx.ts';

export interface SuperContext {
  scene: THREE.Scene;
  caster: FighterState;
  target: FighterState;
  casterRig: RigHandle;
  targetRig: RigHandle;
  fx: VfxManager;
  audio: SoundEngine;
  cam: FightCamera;
  arena: Arena;
  flash: (color: string, ms?: number) => void;
  popup: (text: string, worldPos: THREE.Vector3, color?: string) => void;
  speech: (who: FighterState, text: string) => void;
}

export interface TimelineSequence {
  done: boolean;
  casterPose: Pose | null;
  targetPose: Pose | null;
  targetTf?: { x: number; y: number; z: number; ry: number; rx?: number; rz?: number } | null;
  timeScale: number;
  step(dt: number): void;
  dispose(): void;
}

function makeSlabTex(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d32f2f';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`GST ${text}`, 128, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function landSuperDamage(
  target: FighterState,
  hpBefore: number,
  dir: number,
  vx: number,
  vy: number,
  share = 0.3
): void {
  target.hp = Math.max(0, hpBefore - 100 * share);
  if (target.hp <= 0) {
    target.knockOut(dir, vx, vy);
  } else {
    target.attack = null;
    target.forceState('knockdown');
    target.vx = dir * vx;
    target.vy = vy;
    target.grounded = false;
    target.downFrames = 0;
  }
}

/** Cinematic Super base class handling shared vectors, cues, and damage helpers. */
abstract class BaseSuper implements TimelineSequence {
  done = false;
  casterPose: Pose | null = null;
  targetPose: Pose | null = null;
  targetTf: { x: number; y: number; z: number; ry: number; rx?: number; rz?: number } | null = null;
  timeScale = 1;
  protected t = 0;
  protected prevT = 0;
  protected readonly fired = new Set<string>();
  protected readonly root = new THREE.Group();
  protected readonly v1 = new THREE.Vector3();
  protected readonly v2 = new THREE.Vector3();

  constructor(protected readonly ctx: SuperContext) {
    ctx.scene.add(this.root);
  }

  protected once(key: string, at: number): boolean {
    if (!this.fired.has(key) && this.t >= at) {
      this.fired.add(key);
      return true;
    }
    return false;
  }

  protected hitTarget(vx: number, vy: number, share?: number): void {
    const { caster, target } = this.ctx;
    landSuperDamage(target, target.hp, caster.facing, vx, vy, share ?? caster.superShare ?? 0.3);
  }

  abstract step(dt: number): void;

  dispose(): void {
    this.ctx.scene.remove(this.root);
    this.ctx.arena.setMood(0);
  }
}

/** Modi: Sudarshan Chakra */
class ModiSuper extends BaseSuper {
  private readonly chakra = new THREE.Group();
  private readonly glow = makeGlowSprite(0xffa726, 2.6, 0.65);
  private hpStart = 100;

  constructor(ctx: SuperContext) {
    super(ctx);
    this.hpStart = ctx.target.hp;
    const gold = new THREE.MeshStandardMaterial({
      color: 0xffc83b,
      emissive: 0xff7700,
      emissiveIntensity: 0.9,
      metalness: 0.7,
      roughness: 0.25,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 10, 48), gold);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 32), gold);
    this.chakra.add(ring, inner);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 4), gold);
      blade.position.set(Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0);
      blade.rotation.z = a - Math.PI / 2;
      this.chakra.add(blade);
    }
    this.chakra.add(this.glow);
    this.chakra.scale.setScalar(0.05);
    this.root.add(this.chakra);
    ctx.audio.startSuperBed();
  }

  step(dt: number): void {
    this.prevT = this.t;
    this.t += dt * 1.15;
    const { caster, target, casterRig, fx, cam, audio, arena, flash, popup, speech } = this.ctx;
    const dir = caster.facing;
    arena.setMood(Math.min(0.6, this.t));

    if (this.once('say', 0.2)) speech(caster, 'Mitron, Sudarshan Chakra!');

    const rise = Math.min(1, this.t / 1.4);
    caster.y = this.t < 4.5 ? 1.5 * smoothstep(rise) : Math.max(0, 1.5 * (1 - smoothstep((this.t - 4.5) / 0.8)));

    this.casterPose = withPose(idlePose(this.t, caster.char.id), {
      rShF: this.t < 2.8 ? 2.85 : 1.5,
      rEl: 0.1,
      spineT: this.t < 2.8 ? -0.35 : 0.45,
    });

    if (this.t < 3.6) {
      this.targetPose = panicPose(this.t, target.char.id);
    } else {
      this.targetPose = null;
      target.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, caster.x, dt);
    }

    this.chakra.rotation.z += dt * 14 * dir;
    this.chakra.rotation.x = -Math.PI / 2 + 0.3;

    if (this.t < 2.8) {
      casterRig.handWorld('r', this.v1);
      this.chakra.position.set(this.v1.x, this.v1.y + 0.65, this.v1.z);
      this.chakra.scale.setScalar(0.15 + smoothstep(this.t / 2.8) * 1.15);
      cam.set(new THREE.Vector3(caster.x + dir * 2.5, caster.y + 2.0, 5.2), new THREE.Vector3(caster.x, caster.y + 1.5, 0), 3.5, 42);
    } else if (this.t < 3.6) {
      if (this.once('throw', 2.8)) {
        audio.superRelease();
        audio.whoosh();
      }
      const p = smoothstep((this.t - 2.8) / 0.8);
      this.chakra.position.lerpVectors(
        new THREE.Vector3(caster.x + dir * 0.4, caster.y + 1.8, 0.2),
        new THREE.Vector3(target.x, 1.25, 0),
        p
      );
      cam.set(new THREE.Vector3((caster.x + target.x) / 2, 2.8, 9.2), new THREE.Vector3((caster.x + target.x) / 2, 1.4, 0), 4, 44);
    } else {
      if (this.once('hit', 3.6)) {
        landSuperDamage(target, this.hpStart, dir, 4.6, 8.2, caster.superShare ?? 0.32);
        const pt = new THREE.Vector3(target.x, 1.3, 0.2);
        fx.hitSpark(pt, 2.0, false, dir);
        fx.shockwave(pt, 0xffd166, 0.7, 1.4, true);
        popup('VIKAS CHAKRA!', new THREE.Vector3(target.x, 2.5, 0.3), '#ffd23f');
        flash('rgba(255,210,120,0.85)', 240);
        cam.shake(0.45, 0.55);
        audio.boom();
        arena.cheer(1.4);
      }
      this.chakra.scale.setScalar(Math.max(0.01, this.chakra.scale.x - dt * 1.8));
    }

    if (this.t >= 5.4) {
      caster.y = 0;
      this.done = true;
    }
  }
}

/** Rahul: Aloo-Se-Sona Machine */
class RahulSuper extends BaseSuper {
  private readonly machine = new THREE.Group();
  private readonly goldBar: THREE.Mesh;
  private readonly potato: THREE.Mesh;

  constructor(ctx: SuperContext) {
    super(ctx);
    const metal = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 1.1), metal);
    body.position.y = 0.7;
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.25, 0.7, 12), trim);
    hopper.position.set(-0.5, 1.65, 0);
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), metal);
    chute.position.set(1.05, 0.5, 0);
    this.machine.add(body, hopper, chute);
    this.machine.position.set(ctx.caster.x + ctx.caster.facing * 2.1, -2, -0.3);
    this.root.add(this.machine);

    this.potato = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshStandardMaterial({ color: 0xb98b56, roughness: 0.9 }));
    this.potato.scale.set(1.3, 0.9, 1.0);
    this.potato.visible = false;
    this.root.add(this.potato);

    this.goldBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.26, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xb45309, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.15 })
    );
    this.goldBar.visible = false;
    this.root.add(this.goldBar);
  }

  step(dt: number): void {
    this.t += dt;
    const { caster, target, fx, audio, cam, popup, speech, flash } = this.ctx;
    const dir = caster.facing;

    if (this.once('s1', 0.2)) {
      speech(caster, 'Ek aisi machine lagaunga...');
      audio.boom();
    }

    const mx = Math.max(-4.5, Math.min(4.5, (caster.x + target.x) * 0.5));
    const rise = smoothstep(Math.min(1, this.t / 0.8));
    this.machine.position.set(mx, -2 + 2 * rise, -0.2);

    if (this.t < 2.2) {
      this.casterPose = withPose(idlePose(this.t, 'rahul'), { rShF: 1.8, rEl: 0.2 });
      this.targetPose = panicPose(this.t, target.char.id);
      if (this.once('aloo', 1.0)) {
        speech(caster, 'Is side se ALOO ghusega...');
        popup('ALOO!', new THREE.Vector3(mx - 0.5, 2.3, 0.2), '#fde047');
        this.potato.visible = true;
      }
      const tp = smoothstep(Math.max(0, (this.t - 1.0) / 1.1));
      this.potato.position.set(caster.x + (mx - 0.5 - caster.x) * tp, 1.3 + Math.sin(tp * Math.PI) * 1.4, 0.1);
    } else if (this.t < 3.6) {
      this.potato.visible = false;
      this.machine.position.y = Math.abs(Math.sin(this.t * 36)) * 0.08;
      if (this.once('proc', 2.3)) {
        popup('PROCESSING...', new THREE.Vector3(mx, 2.1, 0.3), '#60a5fa');
        audio.metalCrunch();
        audio.kaching();
      }
    } else {
      if (this.once('sona', 3.6)) {
        this.goldBar.visible = true;
        speech(caster, '...us side se SONA niklega!');
        popup('24K SONA!', new THREE.Vector3(target.x, 2.4, 0.3), '#ffd700');
        audio.superRelease();
      }
      const gp = smoothstep(Math.min(1, (this.t - 3.6) / 0.55));
      this.goldBar.position.lerpVectors(new THREE.Vector3(mx + 0.8, 0.6, 0), new THREE.Vector3(target.x, 1.2, 0), gp);
      this.goldBar.rotation.y += dt * 10;

      if (this.once('impact', 4.15)) {
        this.hitTarget(3.4, 6.2);
        fx.hitSpark(new THREE.Vector3(target.x, 1.2, 0), 1.8, false, dir);
        fx.shockwave(new THREE.Vector3(target.x, 1.2, 0), 0xffd700, 0.6, 1.2, true);
        flash('rgba(255,215,0,0.75)', 200);
        cam.shake(0.38, 0.45);
        audio.coins(8);
      }
      if (this.t > 4.2) {
        this.targetPose = null;
        target.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, caster.x, dt);
      }
    }

    cam.set(new THREE.Vector3(mx, 2.4, 7.6), new THREE.Vector3(mx, 1.2, 0), 4, 42);
    if (this.t >= 5.3) this.done = true;
  }
}

/** Didi: Humba-Rumba Kala Jadu */
class DidiSuper extends BaseSuper {
  private readonly pot = new THREE.Group();
  private readonly frog = new THREE.Group();
  private poofed = false;

  constructor(ctx: SuperContext) {
    super(ctx);
    const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, metalness: 0.5, roughness: 0.4 });
    const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), black);
    cauldron.position.y = 0.45;
    const brew = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.08, 16),
      new THREE.MeshBasicMaterial({ color: 0x39ff14 })
    );
    brew.position.y = 0.72;
    this.pot.add(cauldron, brew);
    this.pot.position.set(ctx.caster.x + ctx.caster.facing * 1.1, 0, 0.2);
    this.root.add(this.pot);

    // Frog transformation mesh
    const green = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.6 });
    const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), green);
    fBody.scale.set(1.2, 0.85, 1.1);
    fBody.position.y = 0.2;
    for (const sx of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      eye.position.set(sx, 0.42, 0.12);
      this.frog.add(eye);
    }
    this.frog.add(fBody);
    this.frog.visible = false;
    this.root.add(this.frog);
  }

  step(dt: number): void {
    this.t += dt;
    const { caster, target, targetRig, fx, audio, cam, arena, popup, speech, flash } = this.ctx;
    arena.setMood(0.45);

    if (this.once('chant', 0.3)) {
      speech(caster, 'Humba-Rumba! Jadu hobe!');
      popup('HUMBAAA!', new THREE.Vector3(caster.x, 2.3, 0.2), '#4ade80');
      audio.thunder();
    }
    this.casterPose = withPose(idlePose(this.t, 'didi'), {
      rShF: 2.2 + Math.sin(this.t * 14) * 0.4,
      lShF: 1.9 + Math.cos(this.t * 14) * 0.3,
    });

    if (this.t < 2.3) {
      this.targetPose = panicPose(this.t, target.char.id);
    } else if (this.t < 4.0) {
      if (!this.poofed) {
        this.poofed = true;
        targetRig.root.visible = false;
        this.frog.visible = true;
        this.frog.position.set(target.x, 0, 0);
        fx.shockwave(new THREE.Vector3(target.x, 0.8, 0), 0x4ade80, 0.5, 1.2, true);
        popup('POOF! RIBBIT!', new THREE.Vector3(target.x, 1.8, 0.2), '#4ade80');
        flash('rgba(74,222,128,0.65)', 180);
        audio.poof();
        audio.frogCroak();
      }
      this.frog.position.y = Math.abs(Math.sin(this.t * 9)) * 0.45;
      this.frog.rotation.y += dt * 4;
    } else {
      if (this.once('unpoof', 4.0)) {
        targetRig.root.visible = true;
        this.frog.visible = false;
        this.hitTarget(3.2, 6.5);
        speech(caster, 'Jadu hoye gelo!');
        audio.boom();
        cam.shake(0.35, 0.4);
      }
      this.targetPose = null;
      target.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, caster.x, dt);
    }

    cam.set(new THREE.Vector3((caster.x + target.x) * 0.5, 2.1, 7.2), new THREE.Vector3(target.x, 1.0, 0), 4, 42);
    if (this.t >= 5.1) {
      targetRig.root.visible = true;
      this.done = true;
    }
  }
}

/** Trump: 50% Executive Tariff */
class TrumpSuper extends BaseSuper {
  private readonly stamp = new THREE.Group();
  private readonly desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.75, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x5c3419, roughness: 0.6 })
  );
  private readonly crates: THREE.Mesh[] = [];

  constructor(ctx: SuperContext) {
    super(ctx);
    this.desk.position.set(ctx.caster.x + ctx.caster.facing * 0.9, 0.37, 0.3);
    this.root.add(this.desk);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 12), new THREE.MeshStandardMaterial({ color: 0x7a1c1c }));
    handle.position.y = 0.4;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 0.75), new THREE.MeshStandardMaterial({ color: 0xd61f2c, emissive: 0x4a0000 }));
    this.stamp.add(handle, base);
    this.stamp.position.set(ctx.target.x, 5.5, 0);
    this.stamp.visible = false;
    this.root.add(this.stamp);

    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb07a3e, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), crateMat);
      c.visible = false;
      this.root.add(c);
      this.crates.push(c);
    }
  }

  step(dt: number): void {
    this.t += dt;
    const { caster, target, fx, audio, cam, popup, speech, flash } = this.ctx;
    if (this.once('s', 0.15)) {
      speech(caster, 'Tariff time! Fifty percent. Tremendous!');
      audio.penScribble();
    }

    this.casterPose = withPose(idlePose(this.t, 'trump'), { rShF: 1.5, spineF: 0.2 });

    if (this.t >= 1.2 && this.t < 2.8) {
      if (this.once('sign', 1.2)) {
        popup('EXECUTIVE ORDER!', new THREE.Vector3(caster.x, 2.3, 0.3), '#ffd23f');
        audio.stampSlam();
      }
      this.crates.forEach((c, idx) => {
        c.visible = this.t > 1.3 + idx * 0.25;
        const p = Math.min(1, Math.max(0, (this.t - (1.3 + idx * 0.25)) / 0.3));
        c.position.set(target.x + ((idx % 2) - 0.5) * 0.8, 0.35 + (1 - p * p) * 4.5, 0.2);
      });
    }

    if (this.t >= 2.6) {
      this.stamp.visible = true;
      const sp = smoothstep(Math.min(1, (this.t - 2.6) / 0.45));
      this.stamp.position.set(target.x, 5.2 - sp * 4.3, 0);
      if (this.once('smash', 3.05)) {
        this.hitTarget(3.4, 6.5);
        popup('50% TARIFFED!', new THREE.Vector3(target.x, 2.5, 0.3), '#ef4444');
        fx.hitSpark(new THREE.Vector3(target.x, 1.1, 0), 2, false, caster.facing);
        fx.shockwave(new THREE.Vector3(target.x, 0.1, 0), 0xef4444, 0.6, 1.5);
        flash('rgba(239,68,68,0.75)', 220);
        cam.shake(0.45, 0.5);
        audio.crateCrash();
        audio.kaching();
      }
    }

    if (this.t < 3.05) this.targetPose = panicPose(this.t, target.char.id);
    else {
      this.targetPose = null;
      target.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, caster.x, dt);
    }

    cam.set(new THREE.Vector3((caster.x + target.x) * 0.5, 2.2, 8.0), new THREE.Vector3(target.x, 1.1, 0), 4, 42);
    if (this.t >= 4.4) this.done = true;
  }
}

/** Yogi: Baba Ka Bulldozer */
class YogiSuper extends BaseSuper {
  private readonly dozer = new THREE.Group();
  private readonly bucket = new THREE.Group();
  private crushed = false;

  constructor(ctx: SuperContext) {
    super(ctx);
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.8 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.2), yellow);
    cab.position.set(-0.3, 1.1, 0);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.0), yellow);
    hood.position.set(0.8, 0.75, 0);
    const tracks = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.35), dark);
    tracks.position.set(0.2, 0.25, 0);

    this.bucket.position.set(1.5, 0.5, 0);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 1.5), yellow);
    blade.position.set(0.35, 0.25, 0);
    this.bucket.add(blade);
    this.dozer.add(cab, hood, tracks, this.bucket);

    const dir = ctx.caster.facing;
    this.dozer.position.set(ctx.caster.x - dir * 8.5, 0, 0);
    this.dozer.rotation.y = dir > 0 ? 0 : Math.PI;
    this.root.add(this.dozer);
    ctx.audio.startEngine();
  }

  step(dt: number): void {
    this.t += dt;
    const { caster, target, fx, audio, cam, popup, speech, flash } = this.ctx;
    const dir = caster.facing;

    if (this.once('s', 0.2)) {
      speech(caster, 'Site clear karo! Bulldozer aa gaya!');
      popup('BULLDOZER AA GAYA!', new THREE.Vector3(caster.x, 2.5, 0.3), '#f97316');
      audio.horn(0.6);
    }

    const startX = caster.x - dir * 8.5;
    const endX = target.x - dir * 1.4;
    if (this.t < 2.2) {
      const p = smoothstep(this.t / 1.5);
      this.dozer.position.x = startX + (endX - startX) * p;
      this.bucket.position.y = 0.5 + Math.abs(Math.sin(this.t * 10)) * 0.4;
      audio.setEngine(0.9, p);
      this.targetPose = panicPose(this.t, target.char.id);
    } else if (this.t < 3.6) {
      if (!this.crushed) {
        this.crushed = true;
        this.hitTarget(3.6, 6.2);
        fx.hitSpark(new THREE.Vector3(target.x, 0.8, 0), 2.0, false, dir);
        fx.shockwave(new THREE.Vector3(target.x, 0.1, 0), 0xf97316, 0.7, 1.6);
        popup('SITE CLEARED!', new THREE.Vector3(target.x, 2.4, 0.3), '#f97316');
        flash('rgba(249,115,22,0.75)', 220);
        cam.shake(0.5, 0.5);
        audio.metalCrunch();
        audio.boom();
      }
      this.targetPose = null;
      target.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, caster.x, dt);
    } else {
      if (this.once('rev', 3.6)) audio.reverseBeeps(3);
      this.dozer.position.x -= dir * 4.5 * dt;
    }

    cam.set(new THREE.Vector3((this.dozer.position.x + target.x) * 0.5, 2.4, 8.8), new THREE.Vector3(target.x, 1.0, 0), 4, 44);
    if (this.t >= 4.8) this.done = true;
  }

  override dispose(): void {
    this.ctx.audio.stopEngine();
    super.dispose();
  }
}

/** Generic high-impact signature Super builder for Nitin / Ravi / Lalu / Amit / Dhruv / Mbapu */
class SignatureSuper extends BaseSuper {
  private readonly prop = new THREE.Group();
  private slammed = false;

  constructor(ctx: SuperContext) {
    super(ctx);
    const id = ctx.caster.char.id;
    const mat = (c: number, em = 0) =>
      new THREE.MeshStandardMaterial({ color: c, emissive: em, emissiveIntensity: 0.7, roughness: 0.45 });

    if (id === 'nitin') {
      // E20 Pothole crater + ethanol tank
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.25, 24), mat(0x1e1b18));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ctx.target.x, 0.03, 0);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 14), mat(0xff9a1f, 0xff5500));
      tank.position.set(ctx.caster.x + ctx.caster.facing * 1.1, 0.45, 0);
      this.prop.add(ring, tank);
    } else if (id === 'ravi') {
      // Giant Golden Pocket Watch / Clock
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.14, 24), mat(0xfacc15, 0xca8a04));
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0, 2.8, -1.8);
      this.prop.add(dial);
    } else if (id === 'lalu') {
      // Steam Engine Locomotive
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 1.3), mat(0x16a34a, 0x14532d));
      body.position.y = 0.85;
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7, 10), mat(0x111827));
      stack.position.set(0.95, 1.75, 0);
      this.prop.add(body, stack);
      this.prop.position.set(ctx.caster.x - ctx.caster.facing * 9, 0, 0);
    } else if (id === 'amit') {
      // Giant Golden Chess Knight + Chanakya Circle
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 32), mat(0xf59e0b, 0xb45309));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ctx.target.x, 0.04, 0);
      const knight = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.7), mat(0xfbbf24, 0x92400e));
      knight.position.set(ctx.caster.x + ctx.caster.facing * 1.2, 0.95, 0);
      this.prop.add(ring, knight);
    } else if (id === 'dhruv') {
      // Smartphone Reels Frame + 2 German Shepherds
      const phone = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.12), mat(0x0ea5e9, 0x22d3ee));
      phone.position.set(ctx.caster.x + ctx.caster.facing * 1.2, 1.3, -0.5);
      for (const z of [-0.35, 0.35]) {
        const dog = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.3), mat(0x78350f));
        dog.position.set(ctx.caster.x - ctx.caster.facing * 4, 0.35, z);
        this.prop.add(dog);
      }
      this.prop.add(phone);
    } else {
      // Mbapu Shanti Toofan: Golden Charkha Wheel + Salt crystals
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 10, 32), mat(0xffd700, 0xd97706));
      wheel.position.set(ctx.caster.x, 1.6, 0.3);
      const glow = makeGlowSprite(0xffea70, 3.2, 0.75);
      glow.position.copy(wheel.position);
      this.prop.add(wheel, glow);
    }

    this.root.add(this.prop);
  }

  step(dt: number): void {
    this.t += dt;
    const { caster, target, fx, audio, cam, arena, popup, speech, flash } = this.ctx;
    const id = caster.char.id;
    const dir = caster.facing;
    arena.setMood(0.45);

    if (this.once('call', 0.2)) {
      speech(caster, id === 'mbapu' ? 'SHANTI TOOFAN!' : `${caster.char.superName}!`);
      popup(caster.char.superName, new THREE.Vector3(caster.x, 2.5, 0.3), caster.char.color);
      audio.shimmer();
    }

    this.casterPose = withPose(idlePose(this.t, id), {
      rShF: 2.3 + Math.sin(this.t * 10) * 0.2,
      spineT: 0.35,
    });

    if (id === 'lalu') {
      const p = smoothstep(Math.min(1, this.t / 2.2));
      this.prop.position.x = (caster.x - dir * 9) + (target.x - (caster.x - dir * 9)) * p;
      if (this.once('horn', 0.8)) audio.horn(0.7);
    } else if (id === 'mbapu') {
      this.prop.children[0].rotation.z += dt * 12 * dir;
    } else if (id === 'dhruv' && this.t > 1.2) {
      // Move German Shepherds toward opponent
      this.prop.children.slice(0, 2).forEach((dog) => {
        dog.position.x += dir * 6.2 * dt;
        dog.position.y = 0.35 + Math.abs(Math.sin(this.t * 18)) * 0.16;
      });
      if (this.once('bark', 1.2)) audio.bark();
    } else if (id === 'ravi' && this.t > 1.0 && this.t < 2.2) {
      if (this.once('naam', 1.1)) popup('NAAM! YA! DAAM!', new THREE.Vector3(target.x, 2.3, 0.3), '#ffd23f');
      caster.x += ((target.x - dir * 0.8) - caster.x) * dt * 5;
    }

    if (this.t < 2.3) {
      this.targetPose = panicPose(this.t, target.char.id);
    } else {
      if (!this.slammed) {
        this.slammed = true;
        this.hitTarget(4.2, 6.8);
        const pt = new THREE.Vector3(target.x, 1.2, 0.2);
        fx.hitSpark(pt, 2.1, false, dir);
        fx.shockwave(pt, caster.char.colorHex, 0.7, 1.6, true);
        flash(`${caster.char.color}bb`, 220);
        cam.shake(0.45, 0.5);
        audio.boom();
        arena.cheer(1.4);
      }
      this.targetPose = null;
      target.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, caster.x, dt);
    }

    cam.set(new THREE.Vector3((caster.x + target.x) * 0.5, 2.2, 8.2), new THREE.Vector3(target.x, 1.2, 0), 4, 42);
    if (this.t >= 3.8) this.done = true;
  }
}

export function createSuperSequence(ctx: SuperContext): TimelineSequence {
  switch (ctx.caster.char.id) {
    case 'modi':
      return new ModiSuper(ctx);
    case 'rahul':
      return new RahulSuper(ctx);
    case 'didi':
      return new DidiSuper(ctx);
    case 'trump':
      return new TrumpSuper(ctx);
    case 'yogi':
      return new YogiSuper(ctx);
    default:
      return new SignatureSuper(ctx);
  }
}

/** Nirmala's Budget Attack (`B` key / Budget Meter) */
export class NirmalaBudgetSequence extends BaseSuper {
  private readonly nirmalaCard: THREE.Mesh;
  private readonly slabs: { mesh: THREE.Mesh; at: number; landed: boolean; rate: string }[] = [];
  private readonly coins: THREE.Mesh[] = [];
  private readonly giantBook: THREE.Mesh;
  private slammed = false;

  constructor(ctx: SuperContext) {
    super(ctx);
    const nx = ctx.caster.x - ctx.caster.facing * 1.05;
    this.nirmalaCard = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 1.76),
      new THREE.MeshBasicMaterial({ map: createNirmalaTexture(), transparent: true, alphaTest: 0.08, side: THREE.DoubleSide })
    );
    this.nirmalaCard.position.set(nx, -1.5, 0.55);
    this.root.add(this.nirmalaCard);

    ['5%', '12%', '18%', '28%'].forEach((rate, idx) => {
      const face = new THREE.MeshStandardMaterial({ map: makeSlabTex(rate), roughness: 0.8 });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.36, 0.3), face);
      slab.visible = false;
      this.root.add(slab);
      this.slabs.push({ mesh: slab, at: 1.0 + idx * 0.32, landed: false, rate });
    });

    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.25 });
    for (let i = 0; i < 16; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 12), coinMat);
      c.visible = false;
      this.root.add(c);
      this.coins.push(c);
    }

    this.giantBook = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.4, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xb31b2c, emissive: 0x4a050b, roughness: 0.55 })
    );
    this.giantBook.visible = false;
    this.root.add(this.giantBook);
  }

  step(dt: number): void {
    this.t += dt;
    const { caster, target, fx, audio, cam, arena, popup, speech, flash } = this.ctx;
    const dir = caster.facing;
    arena.setMood(0.48);

    const rise = smoothstep(Math.min(1, this.t / 0.55));
    this.nirmalaCard.position.y = -1.5 + 2.38 * rise;
    if (this.once('arrive', 0.1)) {
      audio.whoosh();
      flash('rgba(255,210,120,0.45)', 160);
      speech(caster, 'NIRMALA BUDGET SPECIAL!');
    }

    this.slabs.forEach((s, idx) => {
      const p = Math.min(1, Math.max(0, (this.t - s.at) / 0.28));
      s.mesh.visible = this.t >= s.at - 0.1 && this.t < 3.0;
      if (s.mesh.visible) {
        s.mesh.position.set(target.x + (idx % 2 === 0 ? 0.04 : -0.04), 2.1 + idx * 0.38 + (1 - p * p) * 4, 0.3);
        if (p >= 1 && !s.landed) {
          s.landed = true;
          fx.hitSpark(new THREE.Vector3(target.x, 1.8, 0.3), 1, false, dir);
          cam.shake(0.22, 0.22);
          audio.stampSlam();
          popup(`GST ${s.rate}!`, new THREE.Vector3(target.x + (idx % 2 ? 1 : -1) * dir * 1.1, 2.0 + idx * 0.35, 0.4), '#ff5a5a');
        }
      }
    });

    if (this.t >= 2.35 && this.t < 3.1) {
      if (this.once('tax', 2.4)) {
        popup('TAX COLLECTED!', new THREE.Vector3(this.nirmalaCard.position.x, 2.6, 0.5), '#ffd76e');
        audio.coins(8);
      }
      const p = (this.t - 2.35) / 0.7;
      this.coins.forEach((c, idx) => {
        c.visible = true;
        const cp = Math.min(1, Math.max(0, p * 1.3 - idx * 0.02));
        c.position.lerpVectors(
          new THREE.Vector3(target.x, 1.2 + Math.sin(idx) * 0.3, 0.3),
          new THREE.Vector3(this.nirmalaCard.position.x, 1.4, 0.55),
          cp
        );
        c.rotation.x += dt * 10;
      });
    } else {
      this.coins.forEach((c) => (c.visible = false));
    }

    if (this.t >= 3.0) {
      this.giantBook.visible = true;
      const p = smoothstep(Math.min(1, (this.t - 3.0) / 0.38));
      this.giantBook.position.set(target.x, 5.2 - p * 4.8, 0.2);
      if (!this.slammed && p >= 1) {
        this.slammed = true;
        this.hitTarget(4.5, 8.2, 0.4);
        fx.hitSpark(new THREE.Vector3(target.x, 0.8, 0.2), 2.1, false, dir);
        fx.shockwave(new THREE.Vector3(target.x, 0.05, 0), 0xff5a5a, 0.7, 1.8);
        popup('BUDGET PASSED! -40%', new THREE.Vector3(target.x, 2.5, 0.4), '#ffd76e');
        flash('rgba(255,90,90,0.85)', 260);
        cam.shake(0.5, 0.6);
        audio.boom();
        arena.cheer(1.6);
      }
    }

    if (this.t < 3.4) this.targetPose = panicPose(this.t, target.char.id);
    else {
      this.targetPose = null;
      target.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, caster.x, dt);
    }

    cam.set(new THREE.Vector3((caster.x + target.x) * 0.5, 2.3, 8.4), new THREE.Vector3(target.x, 1.2, 0), 4, 42);
    if (this.t >= 4.4) this.done = true;
  }
}

/** Grapple / Patki throw sequence when close-range Grab connects */
export class GrappleSequence implements TimelineSequence {
  done = false;
  casterPose: Pose | null = null;
  targetPose: Pose | null = null;
  targetTf: { x: number; y: number; z: number; ry: number; rx?: number; rz?: number } | null = null;
  timeScale = 1;
  private t = 0;
  private impacted = false;

  constructor(
    private readonly opts: {
      attacker: FighterState;
      defender: FighterState;
      audio: SoundEngine;
      fx: VfxManager;
      cam: FightCamera;
      popup: (text: string, worldPos: THREE.Vector3, color?: string) => void;
      speech: (who: FighterState, text: string) => void;
    }
  ) {
    const startLines: Record<string, string> = {
      rahul: 'Aikido, bhai!',
      yogi: 'Bulldozer chalega!',
      nitin: 'Road roller aa raha hai!',
      amit: 'Ghera daal do!',
      ravi: 'Dekh, hero ki entry!',
      dhruv: 'Ruko, pehle source batao!',
      didi: 'Hamba-ramba flip!',
      trump: "You're fired!",
      modi: 'Pradhan-Mantry Bearhug!',
      lalu: 'Waitlist cancel!',
      mbapu: 'Shanti slam!',
    };
    opts.speech(opts.attacker, startLines[opts.attacker.char.id] ?? 'Patki!');
  }

  step(dt: number): void {
    this.t += dt;
    const { attacker, defender, fx, audio, cam, popup } = this.opts;
    const dir = attacker.facing;

    if (this.t < 0.75) {
      const p = smoothstep(this.t / 0.75);
      this.casterPose = withPose(idlePose(this.t, attacker.char.id), {
        lShF: 1.6 + p * 0.8,
        rShF: 1.6 + p * 0.8,
        lEl: 0.4,
        rEl: 0.4,
      });
      this.targetPose = panicPose(this.t, defender.char.id);
      this.targetTf = {
        x: attacker.x + dir * (0.75 - p * 0.3),
        y: p * 1.15,
        z: 0,
        ry: -dir * (Math.PI / 2),
        rz: p * 1.2 * dir,
      };
    } else if (!this.impacted) {
      this.impacted = true;
      this.targetTf = null;
      landSuperDamage(defender, defender.hp, dir, 3.6, 5.8, 0.12);
      fx.hitSpark(new THREE.Vector3(defender.x, 0.5, 0), 1.4, false, dir);
      fx.shockwave(new THREE.Vector3(defender.x, 0.05, 0), 0xffa726, 0.4, 1.0);
      popup('PATKI SLAM!', new THREE.Vector3(defender.x, 2.0, 0.2), '#ffd23f');
      audio.thud();
      audio.hit(1.2);
      cam.shake(0.32, 0.3);
    } else {
      this.targetPose = null;
      this.casterPose = idlePose(this.t, attacker.char.id);
      defender.update({ moveX: 0, up: false, down: false, punch: false, kick: false, grab: false, super: false }, attacker.x, dt);
    }

    if (this.t >= 1.15) {
      this.targetTf = null;
      this.done = true;
    }
  }

  dispose(): void {
    this.targetTf = null;
  }
}
