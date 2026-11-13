import type * as THREE from 'three';

export type FighterId =
  | 'modi'
  | 'rahul'
  | 'didi'
  | 'trump'
  | 'yogi'
  | 'nitin'
  | 'ravi'
  | 'lalu'
  | 'mbapu'
  | 'amit'
  | 'dhruv';

export type SelectableId = FighterId;

export type StageId = 'sansad' | 'jantar' | 'road';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Facing = 1 | -1;

export type FighterStateKind =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'jump'
  | 'attack'
  | 'hitstun'
  | 'blockstun'
  | 'knockdown'
  | 'getup'
  | 'ko'
  | 'victory'
  | 'intro'
  | 'super'
  | 'frozen';

export type MoveId =
  | 'jab'
  | 'cross'
  | 'kick'
  | 'uppercut'
  | 'roundhouse'
  | 'finisher'
  | 'lowJab'
  | 'sweep'
  | 'special1'
  | 'special2'
  | 'grab'
  | 'airPunch'
  | 'airKick'
  | 'landing';

export type HitHeight = 'high' | 'mid' | 'low';

export interface MoveDef {
  id: MoveId;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  height: HitHeight;
  hitstun: number;
  blockstun: number;
  knockdown: boolean;
  launch: number;
  push: number;
  lunge: number;
  crouching?: boolean;
  air?: boolean;
  grab?: boolean;
  chains?: {
    punch?: MoveId;
    kick?: MoveId;
  };
}

export interface FighterLook {
  skin: number;
  hair: number;
  beard: number;
  shirt: number;
  jacket: number;
  pants: number;
  shoes: number;
  style: 'kurta-jacket' | 'tshirt' | 'kurta' | 'sari' | 'suit' | 'dhoti';
  hairStyle: 'receding' | 'short' | 'bun' | 'pompadour' | 'bald' | 'side-part';
  beardStyle: 'full' | 'stubble' | 'trim' | 'none';
  glasses: 'round' | 'thin' | 'none';
  shoulders: number;
  belly: number;
  scale: number;
}

export interface DanceInfo {
  label: string;
  colors: string[];
}

export interface FighterConfig {
  id: FighterId;
  name: string;
  party: string;
  tagline: string;
  color: string;
  colorHex: number;
  walkFwd: number;
  walkBack: number;
  jumpV: number;
  jumpVx: number;
  damageMul: number;
  modelHeight: number;
  poseScale: number;
  look: FighterLook;
  moveNames: {
    punch: string;
    kick: string;
    special1: string;
    special2: string;
    grab: string;
  };
  superName: string;
  superDesc: string;
  introLine: string;
  winLine: string;
  dance: DanceInfo;
  bossOnly?: boolean;
}

export interface InputState {
  moveX: -1 | 0 | 1;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  grab: boolean;
  super: boolean;
}

export interface Pose {
  rootY: number;
  rootZ: number;
  hipsT: number;
  hipsF: number;
  hipsS: number;
  spineT: number;
  spineF: number;
  spineS: number;
  chestF: number;
  headF: number;
  headT: number;
  headS: number;
  lShF: number;
  lShO: number;
  lShT: number;
  lEl: number;
  lHand: number;
  rShF: number;
  rShO: number;
  rShT: number;
  rEl: number;
  rHand: number;
  lThF: number;
  lThO: number;
  lKn: number;
  lAnk: number;
  rThF: number;
  rThO: number;
  rKn: number;
  rAnk: number;
}

export interface ClipRequest {
  name: string;
  time: number;
  loop?: boolean;
  fade?: number;
  open?: number;
}

export interface RigHandle {
  root: THREE.Group;
  current: Pose;
  yaw: number;
  applyPose(pose: Pose): void;
  blendTo(pose: Pose, alpha: number): void;
  snapTo(pose: Pose): void;
  setTransform(x: number, y: number, z: number, facing: number): void;
  setFree(x: number, y: number, z: number, ry: number, rx?: number, rz?: number): void;
  updateBlink(dt: number): void;
  wink(dur?: number): void;
  handWorld(side: 'l' | 'r', out: THREE.Vector3): THREE.Vector3;
  headWorld(out: THREE.Vector3): THREE.Vector3;
  eyeWorld(side: 'l' | 'r', out: THREE.Vector3): THREE.Vector3 | null;
  chestWorld(out: THREE.Vector3): THREE.Vector3;
  playClip(clip: ClipRequest, dt: number): boolean;
  stopClip(): void;
  playDance(dt: number): boolean;
  stopDance(): void;
  setMirror(mirror: boolean): void;
  setAltTint(alt: boolean): void;
  dispose(): void;
}

export interface StageMeta {
  id: StageId;
  name: string;
  subtitle: string;
}

export interface HitResult {
  attackerSide: 0 | 1;
  defenderSide: 0 | 1;
  moveId: MoveId;
  blocked: boolean;
  counter: boolean;
  damage: number;
  pos: { x: number; y: number };
  knockdown: boolean;
  isGrab: boolean;
}
