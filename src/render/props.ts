import * as THREE from 'three';
import { makeGlowSprite, getGlowTexture } from './vfx.ts';

function std(color: number, roughness = 0.75, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeSoanPapdiTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffcf2e';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(0, 0, 256, 22);
  ctx.fillRect(0, 106, 256, 22);
  ctx.fillStyle = '#7a0c1c';
  ctx.font = 'bold 40px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOAN PAPDI', 128, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildSoanPapdiBox(size = 0.42): THREE.Group {
  const g = new THREE.Group();
  const faceMat = new THREE.MeshStandardMaterial({ map: makeSoanPapdiTex(), roughness: 0.55 });
  const sideMat = std(0xffcf2e, 0.55);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(size, size * 0.4, size * 0.7),
    [faceMat, faceMat, sideMat, sideMat, faceMat, faceMat]
  );
  box.position.y = size * 0.2;
  const ribbonMat = std(0xc8102e, 0.5);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(size * 0.12, size * 0.42, size * 0.72), ribbonMat);
  ribbon.position.y = size * 0.2;
  const bow = new THREE.Mesh(new THREE.TorusGeometry(size * 0.09, size * 0.025, 6, 14), ribbonMat);
  bow.position.y = size * 0.43;
  g.add(box, ribbon, bow);
  return g;
}

export class SoanPapdiPickup {
  readonly root = new THREE.Group();
  done = false;
  flying = true;
  landed = false;
  age = 0;
  y = 0;
  vy = 0;
  private readonly glow: THREE.Sprite;
  private readonly from: THREE.Vector3;

  constructor(private readonly scene: THREE.Scene, from: THREE.Vector3, readonly x: number) {
    this.from = from.clone();
    this.root.add(buildSoanPapdiBox(0.42));
    this.glow = makeGlowSprite(0xffd76e, 1.1, 0.6);
    this.glow.position.y = 0.12;
    this.root.add(this.glow);
    this.root.position.copy(from);
    scene.add(this.root);
  }

  get ready(): boolean {
    return this.landed && !this.done;
  }

  update(dt: number, elapsed: number): void {
    this.age += dt;
    if (this.flying) {
      const p = Math.min(1, this.age / 0.9);
      this.root.position.set(
        this.from.x + (this.x - this.from.x) * p,
        this.from.y * (1 - p) + Math.sin(p * Math.PI) * 1.6,
        this.from.z + (0.25 - this.from.z) * p
      );
      this.root.rotation.x += dt * 9;
      if (p >= 1) {
        this.flying = false;
        this.vy = 2.4;
        this.root.rotation.x = 0;
      }
    } else if (this.landed) {
      this.root.position.y = Math.abs(Math.sin(elapsed * 3)) * 0.03;
      this.root.rotation.y += dt * 0.8;
    } else {
      this.vy -= 14 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = Math.abs(this.vy) > 1.2 ? -this.vy * 0.3 : 0;
        if (this.vy === 0) this.landed = true;
      }
      this.root.position.set(this.x, this.y, 0.25);
    }

    (this.glow.material as THREE.SpriteMaterial).opacity = 0.45 + 0.2 * Math.sin(elapsed * 6);
    if (this.age > 7.5) this.root.visible = Math.sin(this.age * 20) > 0;
    if (this.age > 9) this.done = true;
  }

  dispose(): void {
    this.scene.remove(this.root);
  }
}

export class SutliBomb {
  static readonly ROLL = 1.6;
  static readonly FUSE = 1.3;
  static readonly BOOM = SutliBomb.ROLL + SutliBomb.FUSE;
  static readonly END = SutliBomb.BOOM + 1.6;

  readonly root = new THREE.Group();
  private readonly bomb = new THREE.Group();
  private readonly spark: THREE.Sprite;
  private readonly flash: THREE.Sprite;
  private readonly ring: THREE.Mesh;
  private readonly smoke: THREE.Sprite[] = [];
  private readonly paper: THREE.Mesh[] = [];
  private readonly paperVel: THREE.Vector3[] = [];

  done = false;
  boomed = false;
  hissed = false;
  t = 0;
  x: number;

  constructor(private readonly scene: THREE.Scene, private readonly from: number, private readonly to: number) {
    this.x = from;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), std(0x8a6d4b, 0.95));
    this.bomb.add(sphere);

    const wrapMat = std(0x5a4022, 0.9);
    for (let i = 0; i < 6; i++) {
      const tw = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), wrapMat);
      tw.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.bomb.add(tw);
    }
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.205, 0.205, 0.09, 18),
      new THREE.MeshStandardMaterial({ color: 0xd62828, emissive: 0x3a0000, roughness: 0.7 })
    );
    this.bomb.add(label);

    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), std(0x3a2c22));
    fuse.position.y = 0.26;
    this.bomb.add(fuse);

    this.spark = makeGlowSprite(0xffcc44, 0.35, 1);
    this.spark.position.y = 0.36;
    this.bomb.add(this.spark);
    this.bomb.position.set(from, 0.2, 0.4);
    this.root.add(this.bomb);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.34, 1.5, 64),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(from, 0.03, 0.4);
    this.root.add(this.ring);

    this.flash = makeGlowSprite(0xffea80, 6, 0);
    this.flash.position.set(0, 1, 0.4);
    this.root.add(this.flash);

    const smokeTex = getGlowTexture();
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: smokeTex, color: 0x9a9a9a, transparent: true, opacity: 0, depthWrite: false })
      );
      this.root.add(sp);
      this.smoke.push(sp);
    }

    const paperCols = [0xd62828, 0xffcc44, 0xffffff, 0x2aa84a];
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.05),
        new THREE.MeshBasicMaterial({ color: paperCols[i % paperCols.length], side: THREE.DoubleSide })
      );
      m.visible = false;
      this.root.add(m);
      this.paper.push(m);
      this.paperVel.push(new THREE.Vector3());
    }

    scene.add(this.root);
  }

  get posX(): number {
    return this.x;
  }

  update(dt: number): { hiss?: boolean; boom?: boolean } {
    const out: { hiss?: boolean; boom?: boolean } = {};
    if (this.done) return out;
    this.t += dt;
    const mid = (this.from + this.to) / 2;

    if (this.t < SutliBomb.ROLL) {
      const p = 1 - Math.pow(1 - this.t / SutliBomb.ROLL, 2);
      const nx = this.from + (mid - this.from) * p;
      this.bomb.rotation.z -= (nx - this.x) / 0.2;
      this.x = nx;
      this.bomb.position.x = this.x;
    }

    if (!this.hissed && this.t > SutliBomb.ROLL * 0.6) {
      this.hissed = true;
      out.hiss = true;
    }

    const pRoll = Math.min(1, this.t / SutliBomb.ROLL);
    this.ring.position.x = this.x;
    (this.ring.material as THREE.MeshBasicMaterial).opacity =
      this.t < SutliBomb.BOOM
        ? pRoll * (0.55 + 0.4 * Math.abs(Math.sin(this.t * (4 + (this.t / SutliBomb.BOOM) * 10))))
        : 0;

    if (this.t < SutliBomb.BOOM) {
      this.spark.scale.setScalar(0.25 + 0.15 * Math.random());
      this.spark.position.y =
        0.36 - 0.14 * Math.min(1, Math.max(0, (this.t - SutliBomb.ROLL) / SutliBomb.FUSE));
    } else if (!this.boomed) {
      this.boomed = true;
      out.boom = true;
      this.bomb.visible = false;
      this.flash.position.x = this.x;
      this.smoke.forEach((sp) => {
        sp.position.set(this.x + (Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.6, 0.4 + (Math.random() - 0.5) * 0.6);
        sp.scale.setScalar(0.6 + Math.random() * 0.6);
      });
      this.paper.forEach((p, i) => {
        p.visible = true;
        p.position.set(this.x, 0.4, 0.4);
        this.paperVel[i].set((Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 3);
      });
    }

    if (this.boomed) {
      const k = (this.t - SutliBomb.BOOM) / (SutliBomb.END - SutliBomb.BOOM);
      (this.flash.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - k * 5);
      this.smoke.forEach((sp) => {
        sp.position.y += dt * 0.6;
        sp.scale.multiplyScalar(1 + dt * 0.9);
        (sp.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - k);
      });
      this.paper.forEach((p, i) => {
        const v = this.paperVel[i];
        v.y -= 6 * dt;
        v.multiplyScalar(Math.exp(-dt * 1.8));
        p.position.addScaledVector(v, dt);
        p.position.y = Math.max(0.02, p.position.y);
        p.rotation.x += dt * 9;
        p.rotation.y += dt * 7;
      });
    }

    if (this.t >= SutliBomb.END) this.done = true;
    return out;
  }

  dispose(): void {
    this.scene.remove(this.root);
  }
}

export class CowCrossing {
  static readonly SPEED = 3;
  static readonly MOO_PAUSE = 1;

  readonly root = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly legs: THREE.Group[] = [];
  private readonly tail = new THREE.Group();
  private readonly jaw: THREE.Mesh;

  x: number;
  dir: number;
  total: number;
  t = 0;
  walked = 0;
  paused = false;
  pauseLeft = 0;
  mooedMid = false;
  done = false;
  private stepAcc = 0;

  constructor(private readonly scene: THREE.Scene, fromX: number, toX: number, private readonly z = 1.25) {
    this.x = fromX;
    this.dir = toX >= fromX ? 1 : -1;
    this.total = Math.abs(toX - fromX);

    const white = std(0xf1efe2, 0.85);
    const patch = std(0xb9b0a6, 0.85);
    const pink = std(0xc99c82, 0.6);
    const dark = std(0x2a2422, 0.6);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.72, 1.56), white);
    body.position.set(0, 1.0, 0);
    body.castShadow = true;
    const hump = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.44), white);
    hump.position.set(0, 1.33, 0.42);
    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.44), patch);
    spot.position.set(0.18, 1.08, -0.25);
    this.root.add(body, hump, spot);

    for (const [lx, lz] of [
      [0.17, 0.5],
      [-0.17, 0.5],
      [0.17, -0.52],
      [-0.17, -0.52],
    ]) {
      const piv = new THREE.Group();
      piv.position.set(lx, 0.82, lz);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.62, 10), white);
      leg.position.y = -0.38;
      leg.castShadow = true;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.08, 10), dark);
      hoof.position.y = -0.76;
      piv.add(leg, hoof);
      this.root.add(piv);
      this.legs.push(piv);
    }

    this.head.position.set(0, 1.22, 0.78);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.48), white);
    skull.position.set(0, 0, 0.12);
    skull.rotation.x = 0.5;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.2), pink);
    snout.position.set(0, -0.14, 0.3);
    this.jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.16), pink);
    this.jaw.position.set(0, -0.2, 0.25);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 10), std(0xff8c42, 0.5));
      horn.position.set(s * 0.1, 0.17, 0.02);
      horn.rotation.z = s * -0.55;
      this.head.add(horn);
    }
    this.head.add(skull, snout, this.jaw);
    this.root.add(this.head);

    // Garland & bell
    const garland = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 24), std(0xff6b2a, 0.9));
    garland.position.set(0, 1.05, 0.66);
    garland.rotation.x = 1.2;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), std(0xd4a840, 0.3, 0.8));
    bell.position.set(0, 0.8, 0.8);
    this.root.add(garland, bell);

    this.tail.position.set(0, 1.15, -0.75);
    const tailRod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.6, 6), white);
    tailRod.position.y = -0.3;
    this.tail.add(tailRod);
    this.tail.rotation.x = 0.25;
    this.root.add(this.tail);

    this.root.position.set(fromX, 0, z);
    this.root.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(this.root);
  }

  get posX(): number {
    return this.x;
  }

  update(dt: number): { step?: boolean; moo?: boolean } {
    const out: { step?: boolean; moo?: boolean } = {};
    if (this.done) return out;
    this.t += dt;

    if (this.paused) {
      this.pauseLeft -= dt;
      this.head.rotation.y += ((this.dir > 0 ? -1.1 : 1.1) - this.head.rotation.y) * Math.min(1, dt * 4);
      this.jaw.position.y = -0.2 - Math.abs(Math.sin(this.t * 5)) * 0.03;
      this.legs.forEach((l) => (l.rotation.x *= 0.85));
      if (this.pauseLeft <= 0) this.paused = false;
    } else {
      const step = CowCrossing.SPEED * dt;
      this.walked += step;
      this.x += this.dir * step;
      const cyc = this.walked * 4.2;
      const s = Math.sin(cyc);
      this.legs[0].rotation.x = s * 0.35;
      this.legs[3].rotation.x = s * 0.35;
      this.legs[1].rotation.x = -s * 0.35;
      this.legs[2].rotation.x = -s * 0.35;
      this.head.rotation.y *= 0.92;
      this.root.position.y = Math.abs(Math.cos(cyc)) * 0.02;
      this.stepAcc += step;
      if (this.stepAcc > 0.75) {
        this.stepAcc = 0;
        out.step = true;
      }
      if (!this.mooedMid && this.walked >= this.total / 2) {
        this.mooedMid = true;
        this.paused = true;
        this.pauseLeft = CowCrossing.MOO_PAUSE;
        out.moo = true;
      }
      if (this.walked >= this.total) this.done = true;
    }

    this.tail.rotation.z = Math.sin(this.t * 3.2) * 0.45;
    this.root.position.x = this.x;
    this.root.position.z = this.z;
    return out;
  }

  dispose(): void {
    this.scene.remove(this.root);
  }
}

export class ChaiwalaWalker {
  readonly root = new THREE.Group();
  readonly cup = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly legs: THREE.Mesh[] = [];
  private readonly kettleGroup = new THREE.Group();

  x = -8;
  dir: 1 | -1 = 1;
  active = false;
  cupFlying = false;
  cupPos = new THREE.Vector3();
  cupVel = new THREE.Vector3();
  private t = 0;

  constructor(private readonly scene: THREE.Scene, private readonly diwali = true) {
    // Simple stylized Chai Bhaiya with kettle/mithai tray
    const shirt = std(diwali ? 0xd41a5a : 0xd4a45a);
    const pants = std(0x2a2d3a);
    const skin = std(0xd1946a);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.56, 12), shirt);
    body.position.y = 0.96;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skin);
    head.position.y = 1.38;
    this.torso.add(body, head);

    if (diwali) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), std(0xff6b9f));
      cap.position.y = 1.42;
      this.torso.add(cap);
    }

    for (const s of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.62, 10), pants);
      leg.position.set(s, 0.35, 0);
      this.torso.add(leg);
      this.legs.push(leg);
    }

    this.kettleGroup.position.set(0.25, 0.9, 0.14);
    if (diwali) {
      this.kettleGroup.add(buildSoanPapdiBox(0.24));
    } else {
      const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 12), std(0xb8c0cc, 0.3, 0.8));
      this.kettleGroup.add(kettle);
    }
    this.torso.add(this.kettleGroup);

    this.root.add(this.torso);
    this.root.visible = false;
    scene.add(this.root);

    // Teacup projectile mesh
    const cupMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.09, 10), std(0xc47f4a));
    this.cup.add(cupMesh);
    this.cup.visible = false;
    scene.add(this.cup);
  }

  spawn(fromLeft: boolean): void {
    this.dir = fromLeft ? 1 : -1;
    this.x = fromLeft ? -7.8 : 7.8;
    this.active = true;
    this.cupFlying = false;
    this.root.visible = true;
    this.root.position.set(this.x, 0, 1.4);
    this.root.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  knockCup(vx: number): void {
    if (!this.active || this.cupFlying) return;
    this.cupFlying = true;
    this.cup.visible = true;
    this.cupPos.set(this.x, 1.0, 1.3);
    this.cupVel.set(vx, 6.2, -1.5);
  }

  update(dt: number): { cupBroken?: boolean; x?: number } {
    const out: { cupBroken?: boolean; x?: number } = {};
    this.t += dt;
    if (this.active) {
      this.x += this.dir * 2.1 * dt;
      this.root.position.x = this.x;
      this.legs[0].rotation.x = Math.sin(this.t * 8) * 0.45;
      this.legs[1].rotation.x = -Math.sin(this.t * 8) * 0.45;
      this.torso.position.y = Math.abs(Math.cos(this.t * 8)) * 0.03;
      if ((this.dir > 0 && this.x > 8.2) || (this.dir < 0 && this.x < -8.2)) {
        this.active = false;
        this.root.visible = false;
      }
    }

    if (this.cupFlying) {
      this.cupVel.y -= 16 * dt;
      this.cupPos.addScaledVector(this.cupVel, dt);
      this.cup.position.copy(this.cupPos);
      this.cup.rotation.x += dt * 11;
      this.cup.rotation.z += dt * 9;
      if (this.cupPos.y <= 0.05) {
        this.cupFlying = false;
        this.cup.visible = false;
        out.cupBroken = true;
        out.x = this.cupPos.x;
      }
    }
    return out;
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.scene.remove(this.cup);
  }
}

export class SabziWalaWalker {
  readonly root = new THREE.Group();
  x = -8;
  dir: 1 | -1 = 1;
  active = false;

  constructor(private readonly scene: THREE.Scene) {
    const wood = std(0x8a5a32);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 1.0), wood);
    bed.position.y = 0.78;
    const wheelMat = std(0x2b2b2b);
    for (const wz of [-0.45, 0.45]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.09, 14), wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(-0.2, 0.36, wz);
      this.root.add(w);
    }
    const vegCols = [0xd62828, 0x5cb85c, 0xf59e0b, 0x7c3aed];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), std(vegCols[i % vegCols.length]));
      m.position.set(-0.5 + (i % 4) * 0.34, 0.94 + (i % 2) * 0.08, (Math.floor(i / 4) - 1.5) * 0.2);
      this.root.add(m);
    }
    // Vendor silhouette behind cart
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.65, 10), std(0x3a6e4c));
    body.position.set(-1.15, 0.9, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), std(0xc9936a));
    head.position.set(-1.15, 1.35, 0);
    this.root.add(bed, body, head);
    this.root.visible = false;
    scene.add(this.root);
  }

  spawn(fromLeft: boolean): void {
    this.dir = fromLeft ? 1 : -1;
    this.x = fromLeft ? -8.5 : 8.5;
    this.active = true;
    this.root.visible = true;
    this.root.position.set(this.x, 0, 1.3);
    this.root.rotation.y = this.dir > 0 ? 0 : Math.PI;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.x += this.dir * 2.2 * dt;
    this.root.position.x = this.x;
    this.root.position.y = Math.abs(Math.sin(this.x * 3)) * 0.02;
    if ((this.dir > 0 && this.x > 8.8) || (this.dir < 0 && this.x < -8.8)) {
      this.active = false;
      this.root.visible = false;
    }
  }

  dispose(): void {
    this.scene.remove(this.root);
  }
}
