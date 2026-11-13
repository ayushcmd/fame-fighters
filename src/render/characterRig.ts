import * as THREE from 'three';
import { lerpPose, zeroPose } from './pose.ts';
import type { ClipRequest, FighterConfig, Pose, RigHandle } from '../types.ts';

function shiftHex(hex: number, hueOffset = 0.22): number {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL((hsl.h + hueOffset) % 1, Math.min(1, hsl.s * 1.05), hsl.l);
  return c.getHex();
}

function mat(color: number, roughness = 0.72, metalness = 0.04): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export class CharacterRig implements RigHandle {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  current: Pose = zeroPose();
  yaw = Math.PI / 2;

  private readonly hips = new THREE.Group();
  private readonly spine = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();

  private readonly lSh = new THREE.Group();
  private readonly lEl = new THREE.Group();
  private readonly lHandAnchor = new THREE.Object3D();

  private readonly rSh = new THREE.Group();
  private readonly rEl = new THREE.Group();
  private readonly rHandAnchor = new THREE.Object3D();

  private readonly lTh = new THREE.Group();
  private readonly lKn = new THREE.Group();
  private readonly lAnk = new THREE.Group();

  private readonly rTh = new THREE.Group();
  private readonly rKn = new THREE.Group();
  private readonly rAnk = new THREE.Group();

  private readonly eyeAnchors: { l: THREE.Object3D; r: THREE.Object3D };
  private readonly eyelids: THREE.Mesh[] = [];
  private readonly headAnchor = new THREE.Object3D();
  private readonly chestAnchor = new THREE.Object3D();
  private readonly contact: THREE.Mesh;

  private jacketMat: THREE.MeshStandardMaterial;
  private shirtMat: THREE.MeshStandardMaterial;
  private baseJacketHex: number;
  private baseShirtHex: number;

  private blinkTimer = 1.5 + Math.random() * 2.5;
  private blinkDur = 0;

  constructor(private readonly cfg: FighterConfig) {
    const { look } = cfg;
    this.baseJacketHex = look.jacket;
    this.baseShirtHex = look.shirt;
    this.jacketMat = mat(look.jacket, 0.78);
    this.shirtMat = mat(look.shirt, 0.8);

    const skinMat = mat(look.skin, 0.65);
    const pantsMat = mat(look.pants, 0.82);
    const shoeMat = mat(look.shoes, 0.55, 0.15);
    const hairMat = mat(look.hair, 0.85);
    const beardMat = mat(look.beard, 0.9);

    this.body.scale.setScalar(look.scale);
    this.root.add(this.body);

    // Contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.46, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    this.contact = new THREE.Mesh(shadowGeo, shadowMat);
    this.contact.rotation.x = -Math.PI / 2;
    this.contact.position.y = 0.015;
    this.root.add(this.contact);

    // Hips at standard ground leg height 0.97
    this.hips.position.set(0, 0.97, 0);
    this.body.add(this.hips);

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.32 * look.shoulders, 0.16, 0.22 * look.belly),
      look.style === 'kurta' || look.style === 'dhoti' || look.style === 'sari'
        ? this.shirtMat
        : pantsMat
    );
    pelvis.castShadow = true;
    this.hips.add(pelvis);

    // Spine + Chest
    this.spine.position.set(0, 0.08, 0);
    this.hips.add(this.spine);

    const lowerTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * look.belly, 0.15 * look.belly, 0.24, 12),
      this.shirtMat
    );
    lowerTorso.position.y = 0.12;
    lowerTorso.castShadow = true;
    this.spine.add(lowerTorso);

    this.chest.position.set(0, 0.22, 0);
    this.spine.add(this.chest);
    this.chestAnchor.position.set(0, 0.14, 0);
    this.chest.add(this.chestAnchor);

    const chestMat =
      look.style === 'kurta-jacket' || look.style === 'suit' || look.style === 'sari'
        ? this.jacketMat
        : this.shirtMat;
    const upperTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.36 * look.shoulders, 0.28, 0.22 * look.belly),
      chestMat
    );
    upperTorso.position.y = 0.14;
    upperTorso.castShadow = true;
    this.chest.add(upperTorso);

    if (look.style === 'suit') {
      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.26, 0.03),
        mat(0xe0262f, 0.45)
      );
      tie.position.set(0, 0.11, 0.115 * look.belly);
      this.chest.add(tie);
    } else if (look.style === 'kurta-jacket') {
      const kurtaFront = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.27, 0.225 * look.belly),
        this.shirtMat
      );
      kurtaFront.position.set(0, 0.14, 0.005);
      this.chest.add(kurtaFront);
    } else if (look.style === 'sari') {
      const pallu = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.34, 0.23 * look.belly),
        this.jacketMat
      );
      pallu.position.set(-0.07, 0.13, 0.01);
      pallu.rotation.z = 0.35;
      this.chest.add(pallu);
    } else if (look.style === 'dhoti') {
      // Sacred shawl over shoulder for Mbapu
      const shawl = new THREE.Mesh(
        new THREE.TorusGeometry(0.19 * look.shoulders, 0.04, 8, 18),
        this.shirtMat
      );
      shawl.rotation.set(Math.PI / 2 - 0.3, 0.2, 0);
      shawl.position.set(0, 0.22, 0);
      this.chest.add(shawl);
    }

    // Head
    this.head.position.set(0, 0.31, 0);
    this.chest.add(this.head);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.1, 10), skinMat);
    neck.position.y = 0.03;
    this.head.add(neck);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 16), skinMat);
    skull.scale.set(0.95, 1.08, 1.02);
    skull.position.y = 0.16;
    skull.castShadow = true;
    this.head.add(skull);
    this.headAnchor.position.set(0, 0.18, 0);
    this.head.add(this.headAnchor);

    // Ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), skinMat);
      ear.scale.set(0.55, 1.1, 0.7);
      ear.position.set(s * 0.14, 0.15, 0);
      this.head.add(ear);
    }

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 8), skinMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.15, 0.15);
    this.head.add(nose);

    // Eyes + Eyelids
    const eyeWhite = mat(0xffffff, 0.2);
    const pupilMat = mat(0x161210, 0.2);
    const lEye = new THREE.Object3D();
    const rEye = new THREE.Object3D();
    lEye.position.set(-0.048, 0.18, 0.13);
    rEye.position.set(0.048, 0.18, 0.13);
    this.head.add(lEye, rEye);
    this.eyeAnchors = { l: lEye, r: rEye };

    for (const s of [-1, 1]) {
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), eyeWhite);
      ew.scale.set(1, 0.85, 0.65);
      ew.position.set(s * 0.048, 0.18, 0.125);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
      pup.position.set(s * 0.048, 0.18, 0.139);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.044, 0.02), skinMat);
      lid.position.set(s * 0.048, 0.18, 0.135);
      lid.scale.y = 0.05;
      this.eyelids.push(lid);
      this.head.add(ew, pup, lid);
    }

    // Hair
    if (look.hairStyle === 'pompadour') {
      const pomp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.26), hairMat);
      pomp.position.set(0, 0.28, 0.03);
      pomp.rotation.x = -0.18;
      this.head.add(pomp);
    } else if (look.hairStyle === 'short' || look.hairStyle === 'side-part') {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        hairMat
      );
      cap.position.y = 0.165;
      cap.rotation.x = -0.15;
      this.head.add(cap);
    } else if (look.hairStyle === 'bun') {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.148, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        hairMat
      );
      cap.position.y = 0.165;
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), hairMat);
      bun.position.set(0, 0.22, -0.14);
      this.head.add(cap, bun);
    } else if (look.hairStyle === 'receding') {
      const back = new THREE.Mesh(
        new THREE.SphereGeometry(0.148, 14, 10, 0, Math.PI * 2, 0.35, Math.PI * 0.42),
        hairMat
      );
      back.position.set(0, 0.165, -0.02);
      back.rotation.x = -0.45;
      this.head.add(back);
    }

    // Beard
    if (look.beardStyle === 'full') {
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), beardMat);
      beard.scale.set(0.95, 0.9, 0.85);
      beard.position.set(0, 0.08, 0.03);
      this.head.add(beard);
    } else if (look.beardStyle === 'trim') {
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.07, 0.16), beardMat);
      jaw.position.set(0, 0.075, 0.04);
      this.head.add(jaw);
    }

    if (cfg.id === 'modi' || cfg.id === 'mbapu') {
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), beardMat);
      stache.position.set(0, 0.115, 0.142);
      this.head.add(stache);
    }

    // Glasses
    if (look.glasses !== 'none') {
      const gMat = mat(look.glasses === 'round' ? 0x221b18 : 0xd4d4d8, 0.3, 0.7);
      for (const s of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 6, 18), gMat);
        rim.position.set(s * 0.048, 0.18, 0.145);
        this.head.add(rim);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.006), gMat);
      bridge.position.set(0, 0.18, 0.146);
      this.head.add(bridge);
    }

    // Tilak for Yogi
    if (cfg.id === 'yogi') {
      const tilak = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.055, 0.01), mat(0xdc2626));
      tilak.position.set(0, 0.24, 0.135);
      this.head.add(tilak);
    }

    // Arms helper
    const armMat = look.style === 'suit' ? this.jacketMat : look.style === 'tshirt' ? skinMat : this.shirtMat;
    const upperArmMat = look.style === 'tshirt' ? this.shirtMat : armMat;
    const buildArm = (side: -1 | 1, shG: THREE.Group, elG: THREE.Group, handAnchor: THREE.Object3D) => {
      shG.position.set(side * (0.21 * look.shoulders), 0.25, 0);
      this.chest.add(shG);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.27, 10), upperArmMat);
      upper.position.y = -0.135;
      upper.castShadow = true;
      shG.add(upper);

      elG.position.set(0, -0.27, 0);
      shG.add(elG);

      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.25, 10), armMat);
      fore.position.y = -0.125;
      fore.castShadow = true;
      elG.add(fore);

      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.08), skinMat);
      fist.position.y = -0.27;
      fist.castShadow = true;
      elG.add(fist);

      handAnchor.position.set(0, -0.29, 0);
      elG.add(handAnchor);
    };

    buildArm(-1, this.lSh, this.lEl, this.lHandAnchor);
    buildArm(1, this.rSh, this.rEl, this.rHandAnchor);

    // Legs helper
    const buildLeg = (side: -1 | 1, thG: THREE.Group, knG: THREE.Group, ankG: THREE.Group) => {
      thG.position.set(side * 0.1, -0.05, 0);
      this.hips.add(thG);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.058, 0.48, 10), pantsMat);
      thigh.position.y = -0.24;
      thigh.castShadow = true;
      thG.add(thigh);

      knG.position.set(0, -0.49, 0);
      thG.add(knG);

      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.042, 0.44, 10), pantsMat);
      shin.position.y = -0.22;
      shin.castShadow = true;
      knG.add(shin);

      ankG.position.set(0, -0.44, 0);
      knG.add(ankG);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.21), shoeMat);
      shoe.position.set(0, -0.01, 0.045);
      shoe.castShadow = true;
      ankG.add(shoe);
    };

    buildLeg(-1, this.lTh, this.lKn, this.lAnk);
    buildLeg(1, this.rTh, this.rKn, this.rAnk);
  }

  setAltTint(alt: boolean): void {
    this.jacketMat.color.setHex(alt ? shiftHex(this.baseJacketHex, 0.35) : this.baseJacketHex);
    this.shirtMat.color.setHex(alt ? shiftHex(this.baseShirtHex, 0.15) : this.baseShirtHex);
  }

  applyPose(p: Pose): void {
    this.current = { ...p };
    this.hips.position.set(0, 0.97 + p.rootY, p.rootZ);
    this.hips.rotation.set(-p.hipsF, p.hipsT, p.hipsS);
    this.spine.rotation.set(p.spineF, p.spineT, p.spineS);
    this.chest.rotation.set(p.chestF, 0, 0);
    this.head.rotation.set(p.headF, p.headT, p.headS);

    this.lSh.rotation.set(-p.lShF, p.lShT, -p.lShO);
    this.lEl.rotation.set(-p.lEl, 0, 0);
    this.rSh.rotation.set(-p.rShF, -p.rShT, p.rShO);
    this.rEl.rotation.set(-p.rEl, 0, 0);

    this.lTh.rotation.set(-p.lThF, 0, -p.lThO);
    this.lKn.rotation.set(p.lKn, 0, 0);
    this.lAnk.rotation.set(p.lAnk, 0, 0);

    this.rTh.rotation.set(-p.rThF, 0, p.rThO);
    this.rKn.rotation.set(p.rKn, 0, 0);
    this.rAnk.rotation.set(p.rAnk, 0, 0);
  }

  blendTo(p: Pose, alpha: number): void {
    this.applyPose(lerpPose(this.current, p, alpha));
  }

  snapTo(p: Pose): void {
    this.applyPose(p);
  }

  setTransform(x: number, y: number, z: number, facing: number): void {
    this.root.position.set(x, y, z);
    this.yaw = facing >= 0 ? Math.PI / 2 : -Math.PI / 2;
    this.body.rotation.set(0, this.yaw, 0);
    const s = Math.max(0.2, 1 - y * 0.25);
    this.contact.position.y = -y + 0.015;
    this.contact.scale.setScalar(s);
    (this.contact.material as THREE.MeshBasicMaterial).opacity = 0.36 * s;
  }

  setFree(x: number, y: number, z: number, ry: number, rx = 0, rz = 0): void {
    this.root.position.set(x, y, z);
    this.body.rotation.set(rx, ry, rz);
  }

  updateBlink(dt: number): void {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkDur = 0.12;
      this.blinkTimer = 2.0 + Math.random() * 3.0;
    }
    const closed = this.blinkDur > 0;
    if (closed) this.blinkDur -= dt;
    for (const lid of this.eyelids) {
      lid.scale.y = closed ? 1 : 0.05;
    }
  }

  wink(dur = 0.4): void {
    this.blinkDur = dur;
  }

  handWorld(side: 'l' | 'r', out: THREE.Vector3): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    return (side === 'l' ? this.lHandAnchor : this.rHandAnchor).getWorldPosition(out);
  }

  headWorld(out: THREE.Vector3): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    return this.headAnchor.getWorldPosition(out);
  }

  eyeWorld(side: 'l' | 'r', out: THREE.Vector3): THREE.Vector3 | null {
    this.root.updateMatrixWorld(true);
    return (side === 'l' ? this.eyeAnchors.l : this.eyeAnchors.r).getWorldPosition(out);
  }

  chestWorld(out: THREE.Vector3): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    return this.chestAnchor.getWorldPosition(out);
  }

  playClip(clip: ClipRequest, dt: number): boolean {
    const t = clip.time;
    const p = zeroPose();
    if (clip.name === 'cross' || clip.name === 'upper') {
      p.rShF = 1.6;
      p.rEl = 0.1;
      p.spineT = 0.45;
    } else if (clip.name === 'highkick') {
      p.rThF = 1.5;
      p.rKn = 0.1;
      p.spineF = -0.3;
    } else if (clip.name === 'hurricane') {
      p.hipsT = t * 14;
      p.rThF = 1.45;
      p.rThO = 0.6;
    }
    this.blendTo(p, Math.min(1, dt * 16));
    return true;
  }

  stopClip(): void {}

  playDance(): boolean {
    return false;
  }

  stopDance(): void {}

  setMirror(mirror: boolean): void {
    this.body.scale.x = Math.abs(this.body.scale.x) * (mirror ? -1 : 1);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      m.geometry?.dispose?.();
    });
  }
}
