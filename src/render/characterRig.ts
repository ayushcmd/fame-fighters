import * as THREE from 'three';
import { lerpPose, zeroPose } from './pose.ts';
import { modelLoader } from './modelLoader.ts';
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

interface BoneJoint {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
  P: THREE.Quaternion;
  Pinv: THREE.Quaternion;
}

const DEG82 = THREE.MathUtils.degToRad(82);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const A0L = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, -DEG82);
const A0R = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, DEG82);
const A0Linv = A0L.clone().invert();
const A0Rinv = A0R.clone().invert();

const eulerHelper = new THREE.Euler(0, 0, 0, 'XYZ');
const quatHelper = new THREE.Quaternion();
const quatEl = new THREE.Quaternion();

function fromEuler(x: number, y: number, z: number, mult = 1): THREE.Quaternion {
  eulerHelper.set(x * mult, y * mult, z * mult, 'XYZ');
  return quatHelper.setFromEuler(eulerHelper);
}

function setJoint(j: BoneJoint | null | undefined, rot: THREE.Quaternion): void {
  if (!j) return;
  j.bone.quaternion.copy(j.Pinv).multiply(rot).multiply(j.P).multiply(j.rest);
}

export class CharacterRig implements RigHandle {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  private readonly proceduralBody = new THREE.Group();
  current: Pose = zeroPose();
  yaw = Math.PI / 2;

  // GLTF Skinned Model & Mixer
  private gltfModel: THREE.Group | null = null;
  private gltfScale = 1.0;
  private joints: Record<string, BoneJoint | null> = {};
  private gltfHipsRest = new THREE.Vector3();
  private mixer: THREE.AnimationMixer | null = null;
  private danceAction: THREE.AnimationAction | null = null;
  private clipActions = new Map<string, THREE.AnimationAction>();
  private activeClip: THREE.AnimationAction | null = null;
  private gltfHandL: THREE.Object3D | null = null;
  private gltfHandR: THREE.Object3D | null = null;
  private gltfHead: THREE.Object3D | null = null;
  private gltfChest: THREE.Object3D | null = null;
  private gltfEyeL: THREE.Object3D | null = null;
  private gltfEyeR: THREE.Object3D | null = null;
  private isAlt = false;

  // Procedural Limb Hierarchy (Fallback & Synchronous Scaffold)
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
  private breathTime = Math.random() * 10;

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

    // Procedural hierarchy
    this.body.add(this.proceduralBody);
    this.hips.position.set(0, 0.97, 0);
    this.proceduralBody.add(this.hips);

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.32 * look.shoulders, 0.16, 0.22 * look.belly),
      look.style === 'kurta' || look.style === 'dhoti' || look.style === 'sari'
        ? this.shirtMat
        : pantsMat
    );
    pelvis.castShadow = true;
    this.hips.add(pelvis);

    this.spine.position.set(0, 0.08, 0);
    this.hips.add(this.spine);

    const lowerTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.34 * look.shoulders, 0.2, 0.23 * look.belly),
      this.shirtMat
    );
    lowerTorso.position.y = 0.1;
    lowerTorso.castShadow = true;
    this.spine.add(lowerTorso);

    this.chest.position.set(0, 0.2, 0);
    this.spine.add(this.chest);

    const upperTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.4 * look.shoulders, 0.26, 0.24 * look.belly),
      look.jacket !== look.shirt ? this.jacketMat : this.shirtMat
    );
    upperTorso.position.y = 0.13;
    upperTorso.castShadow = true;
    this.chest.add(upperTorso);

    this.chestAnchor.position.set(0, 0.15, 0);
    this.chest.add(this.chestAnchor);

    this.head.position.set(0, 0.3, 0);
    this.chest.add(this.head);

    const headGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.13;
    headMesh.castShadow = true;
    this.head.add(headMesh);

    this.headAnchor.position.set(0, 0.15, 0);
    this.head.add(this.headAnchor);

    const eyeL = new THREE.Object3D();
    const eyeR = new THREE.Object3D();
    eyeL.position.set(0.06, 0.15, 0.13);
    eyeR.position.set(-0.06, 0.15, 0.13);
    this.head.add(eyeL);
    this.head.add(eyeR);
    this.eyeAnchors = { l: eyeL, r: eyeR };

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.BoxGeometry(0.028, 0.028, 0.01);
    const mEyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const mEyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.add(mEyeL);
    eyeR.add(mEyeR);

    const lidMat = new THREE.MeshBasicMaterial({ color: look.skin });
    const lidGeo = new THREE.BoxGeometry(0.03, 0.03, 0.012);
    const lidL = new THREE.Mesh(lidGeo, lidMat);
    const lidR = new THREE.Mesh(lidGeo, lidMat);
    lidL.scale.y = 0.05;
    lidR.scale.y = 0.05;
    eyeL.add(lidL);
    eyeR.add(lidR);
    this.eyelids.push(lidL, lidR);

    if (look.hair !== look.skin) {
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), hairMat);
      hair.position.set(0, 0.25, 0);
      this.head.add(hair);
    }

    if (look.beard !== look.skin) {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.14), beardMat);
      beard.position.set(0, 0.05, 0.1);
      this.head.add(beard);
    }

    if (look.glasses) {
      const frameMat = mat(0x1a1a1a, 0.3, 0.8);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.02), frameMat);
      glass.position.set(0, 0.15, 0.135);
      this.head.add(glass);
    }

    // Left arm
    this.lSh.position.set(0.24 * look.shoulders, 0.22, 0);
    this.chest.add(this.lSh);
    const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.1), this.shirtMat);
    lUpper.position.y = -0.13;
    lUpper.castShadow = true;
    this.lSh.add(lUpper);

    this.lEl.position.set(0, -0.26, 0);
    this.lSh.add(this.lEl);
    const lFore = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.09), skinMat);
    lFore.position.y = -0.12;
    lFore.castShadow = true;
    this.lEl.add(lFore);

    this.lHandAnchor.position.set(0, -0.24, 0);
    this.lEl.add(this.lHandAnchor);
    const lHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), skinMat);
    lHandMesh.position.y = -0.04;
    this.lHandAnchor.add(lHandMesh);

    // Right arm
    this.rSh.position.set(-0.24 * look.shoulders, 0.22, 0);
    this.chest.add(this.rSh);
    const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.1), this.shirtMat);
    rUpper.position.y = -0.13;
    rUpper.castShadow = true;
    this.rSh.add(rUpper);

    this.rEl.position.set(0, -0.26, 0);
    this.rSh.add(this.rEl);
    const rFore = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.09), skinMat);
    rFore.position.y = -0.12;
    rFore.castShadow = true;
    this.rEl.add(rFore);

    this.rHandAnchor.position.set(0, -0.24, 0);
    this.rEl.add(this.rHandAnchor);
    const rHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), skinMat);
    rHandMesh.position.y = -0.04;
    this.rHandAnchor.add(rHandMesh);

    // Legs
    this.lTh.position.set(0.12, 0, 0);
    this.hips.add(this.lTh);
    const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), pantsMat);
    lThigh.position.y = -0.22;
    lThigh.castShadow = true;
    this.lTh.add(lThigh);

    this.lKn.position.set(0, -0.44, 0);
    this.lTh.add(this.lKn);
    const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), pantsMat);
    lShin.position.y = -0.21;
    lShin.castShadow = true;
    this.lKn.add(lShin);

    this.lAnk.position.set(0, -0.42, 0);
    this.lKn.add(this.lAnk);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.2), shoeMat);
    lShoe.position.set(0, -0.045, 0.04);
    lShoe.castShadow = true;
    this.lAnk.add(lShoe);

    this.rTh.position.set(-0.12, 0, 0);
    this.hips.add(this.rTh);
    const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), pantsMat);
    rThigh.position.y = -0.22;
    rThigh.castShadow = true;
    this.rTh.add(rThigh);

    this.rKn.position.set(0, -0.44, 0);
    this.rTh.add(this.rKn);
    const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), pantsMat);
    rShin.position.y = -0.21;
    rShin.castShadow = true;
    this.rKn.add(rShin);

    this.rAnk.position.set(0, -0.42, 0);
    this.rKn.add(this.rAnk);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.2), shoeMat);
    rShoe.position.set(0, -0.045, 0.04);
    rShoe.castShadow = true;
    this.rAnk.add(rShoe);

    // Initiate GLTF Skinned Model loading
    this.initGLTF();
  }

  private async initGLTF(): Promise<void> {
    try {
      await modelLoader.load(this.cfg.id);
      const cloned = modelLoader.clone(this.cfg.id, this.isAlt);
      if (!cloned) return;

      this.gltfModel = cloned.model;
      this.gltfScale = cloned.scale;

      // Bind skeleton bones
      const bind = (name: string): BoneJoint | null => {
        let bone: THREE.Bone | null = null;
        const reg = new RegExp(`^${name}(_\\d+)?$`);
        this.gltfModel!.traverse((o) => {
          if (!bone && (o as THREE.Bone).isBone && reg.test(o.name)) {
            bone = o as THREE.Bone;
          }
        });
        if (!bone || !(bone as THREE.Bone).parent) return null;
        const b = bone as THREE.Bone;
        const p = b.parent!;
        const P = new THREE.Quaternion();
        p.getWorldQuaternion(P);
        return {
          bone: b,
          rest: b.quaternion.clone(),
          P,
          Pinv: P.clone().invert(),
        };
      };

      const boneNames = [
        'Hips',
        'Spine',
        'Spine1',
        'Spine2',
        'Neck',
        'Head',
        'LeftArm',
        'LeftForeArm',
        'RightArm',
        'RightForeArm',
        'LeftUpLeg',
        'LeftLeg',
        'LeftFoot',
        'RightUpLeg',
        'RightLeg',
        'RightFoot',
      ];
      for (const name of boneNames) {
        this.joints[name] = bind(name);
      }

      if (this.joints.Hips) {
        this.gltfHipsRest.copy(this.joints.Hips.bone.position);
      }

      // Head scaling
      if (this.joints.Head) {
        const headScale = (this.cfg as { headScale?: number }).headScale ?? 1.32;
        this.joints.Head.bone.scale.multiplyScalar(headScale);
      }

      // Hand and Eye anchors
      const findObj = (name: string): THREE.Object3D | null => {
        let found: THREE.Object3D | null = null;
        const reg = new RegExp(`^${name}(_\\d+)?$`);
        this.gltfModel!.traverse((o) => {
          if (!found && reg.test(o.name)) found = o;
        });
        return found;
      };

      this.gltfHandL = findObj('LeftHandMiddle1') ?? findObj('LeftHand');
      this.gltfHandR = findObj('RightHandMiddle1') ?? findObj('RightHand');
      this.gltfHead = this.joints.Head?.bone ?? null;
      this.gltfChest = this.joints.Spine2?.bone ?? null;
      this.gltfEyeL = findObj('LeftEye');
      this.gltfEyeR = findObj('RightEye');

      // Scale model
      const totalScale = this.gltfScale * (this.cfg.modelHeight ?? 1.0);
      this.gltfModel.scale.setScalar(totalScale);

      // AnimationMixer & Clips
      this.mixer = new THREE.AnimationMixer(this.gltfModel);
      if (cloned.dance) {
        this.danceAction = this.mixer.clipAction(cloned.dance);
      }
      for (const clip of cloned.clips) {
        this.clipActions.set(clip.name, this.mixer.clipAction(clip));
      }

      // Hide procedural body and show GLTF
      this.proceduralBody.visible = false;
      this.body.add(this.gltfModel);
      this.applyPose(this.current);
    } catch (err) {
      console.warn(`[CharacterRig] GLTF initialization error for ${this.cfg.id}:`, err);
    }
  }

  setAltTint(alt: boolean): void {
    this.isAlt = alt;
    if (alt) {
      this.jacketMat.color.setHex(shiftHex(this.baseJacketHex, 0.35));
      this.shirtMat.color.setHex(shiftHex(this.baseShirtHex, 0.35));
    } else {
      this.jacketMat.color.setHex(this.baseJacketHex);
      this.shirtMat.color.setHex(this.baseShirtHex);
    }
  }

  setFacePhoto(): void {
    // Authentic GLTF models have genuine faces baked into materials/textures.
  }

  applyPose(p: Pose): void {
    this.current = p;

    // 1. Update GLTF Skeleton if ready
    if (this.gltfModel && this.joints.Hips) {
      const j = this.joints;
      const s = this.gltfScale;
      const breath = Math.sin(this.breathTime * 2.1) * 0.018;

      if (j.Hips) {
        j.Hips.bone.position.set(
          this.gltfHipsRest.x,
          this.gltfHipsRest.y + p.rootY / s,
          this.gltfHipsRest.z + p.rootZ / s
        );
        setJoint(j.Hips, fromEuler(p.hipsF, p.hipsT, p.hipsS));
      }
      setJoint(j.Spine, fromEuler(p.spineF, p.spineT, p.spineS, 0.5));
      setJoint(j.Spine1, fromEuler(p.spineF, p.spineT, p.spineS, 0.5));
      setJoint(j.Spine2, fromEuler(p.chestF - breath, 0, 0));
      setJoint(j.Neck, fromEuler(p.headF, p.headT, p.headS, 0.4));
      setJoint(j.Head, fromEuler(p.headF + breath * 0.5, p.headT, p.headS, 0.6));

      // Left Arm
      const qLeft = fromEuler(-p.lShF, p.lShT, p.lShO).multiply(A0L);
      setJoint(j.LeftArm, qLeft);
      quatEl.setFromAxisAngle(X_AXIS, -p.lEl);
      const qLeftFore = A0Linv.clone().multiply(quatEl).multiply(A0L);
      setJoint(j.LeftForeArm, qLeftFore);

      // Right Arm
      const qRight = fromEuler(-p.rShF, -p.rShT, -p.rShO).multiply(A0R);
      setJoint(j.RightArm, qRight);
      quatEl.setFromAxisAngle(X_AXIS, -p.rEl);
      const qRightFore = A0Rinv.clone().multiply(quatEl).multiply(A0R);
      setJoint(j.RightForeArm, qRightFore);

      // Left Leg
      setJoint(j.LeftUpLeg, fromEuler(-p.lThF, 0, p.lThO));
      setJoint(j.LeftLeg, quatHelper.setFromAxisAngle(X_AXIS, p.lKn));
      setJoint(j.LeftFoot, quatHelper.setFromAxisAngle(X_AXIS, p.lAnk));

      // Right Leg
      setJoint(j.RightUpLeg, fromEuler(-p.rThF, 0, -p.rThO));
      setJoint(j.RightLeg, quatHelper.setFromAxisAngle(X_AXIS, p.rKn));
      setJoint(j.RightFoot, quatHelper.setFromAxisAngle(X_AXIS, p.rAnk));
    }

    // 2. Procedural Hierarchy Updates
    this.hips.position.y = 0.97 + p.rootY;
    this.hips.position.z = p.rootZ;
    this.hips.rotation.set(p.hipsF, p.hipsT, p.hipsS);

    this.spine.rotation.set(p.spineF, p.spineT, p.spineS);
    this.chest.rotation.set(p.chestF, 0, 0);
    this.head.rotation.set(p.headF, p.headT, p.headS);

    this.lSh.rotation.set(-p.lShF, p.lShT, p.lShO);
    this.lEl.rotation.set(-p.lEl, 0, 0);

    this.rSh.rotation.set(-p.rShF, -p.rShT, -p.rShO);
    this.rEl.rotation.set(-p.rEl, 0, 0);

    this.lTh.rotation.set(-p.lThF, 0, p.lThO);
    this.lKn.rotation.set(p.lKn, 0, 0);
    this.lAnk.rotation.set(p.lAnk, 0, 0);

    this.rTh.rotation.set(-p.rThF, 0, -p.rThO);
    this.rKn.rotation.set(p.rKn, 0, 0);
    this.rAnk.rotation.set(p.rAnk, 0, 0);
  }

  blendTo(pose: Pose, alpha: number): void {
    const a = Math.max(0, Math.min(1, alpha));
    this.applyPose(lerpPose(this.current, pose, a));
  }

  snapTo(pose: Pose): void {
    this.applyPose(pose);
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
    this.breathTime += dt;
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
    if (this.gltfModel) {
      const anchor = side === 'l' ? this.gltfHandL : this.gltfHandR;
      if (anchor) return anchor.getWorldPosition(out);
    }
    return (side === 'l' ? this.lHandAnchor : this.rHandAnchor).getWorldPosition(out);
  }

  headWorld(out: THREE.Vector3): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    if (this.gltfModel && this.gltfHead) {
      return this.gltfHead.getWorldPosition(out);
    }
    return this.headAnchor.getWorldPosition(out);
  }

  eyeWorld(side: 'l' | 'r', out: THREE.Vector3): THREE.Vector3 | null {
    this.root.updateMatrixWorld(true);
    if (this.gltfModel) {
      const eye = side === 'l' ? this.gltfEyeL : this.gltfEyeR;
      if (eye) return eye.getWorldPosition(out);
    }
    return (side === 'l' ? this.eyeAnchors.l : this.eyeAnchors.r).getWorldPosition(out);
  }

  chestWorld(out: THREE.Vector3): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    if (this.gltfModel && this.gltfChest) {
      return this.gltfChest.getWorldPosition(out);
    }
    return this.chestAnchor.getWorldPosition(out);
  }

  playClip(clip: ClipRequest, dt: number): boolean {
    const action = this.clipActions.get(clip.name);
    if (action && this.mixer) {
      if (this.activeClip !== action) {
        this.activeClip?.fadeOut(0.12);
        action.reset().fadeIn(0.12).play();
        this.activeClip = action;
      }
      this.mixer.update(dt);
      return true;
    }

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

  stopClip(): void {
    if (this.activeClip) {
      this.activeClip.fadeOut(0.14);
      this.activeClip = null;
    }
  }

  playDance(dt: number): boolean {
    if (this.danceAction && this.mixer) {
      if (!this.danceAction.isRunning()) {
        this.danceAction.reset().play();
      }
      this.mixer.update(dt);
      return true;
    }
    return false;
  }

  stopDance(): void {
    this.danceAction?.stop();
  }

  setMirror(mirror: boolean): void {
    this.body.scale.x = Math.abs(this.body.scale.x) * (mirror ? -1 : 1);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mixer?.stopAllAction();
    this.root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      m.geometry?.dispose?.();
    });
  }
}
