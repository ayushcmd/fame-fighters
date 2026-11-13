import * as THREE from 'three';

export class FightCamera {
  readonly camera: THREE.PerspectiveCamera;
  private readonly targetPos = new THREE.Vector3(0, 2.2, 9.2);
  private readonly targetLook = new THREE.Vector3(0, 1.25, 0);
  private readonly currentPos = new THREE.Vector3(0, 2.2, 9.2);
  private readonly currentLook = new THREE.Vector3(0, 1.25, 0);
  private targetFov = 42;
  private lerpSpeed = 6;
  private shakeAmp = 0;
  private shakeDur = 0;
  private shakeTimer = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 160);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  frameFight(x1: number, x2: number, y1: number, y2: number, portraitBoost = false): void {
    const midX = (x1 + x2) * 0.5;
    const span = Math.abs(x1 - x2);
    const maxY = Math.max(y1, y2);
    const baseDist = Math.max(6.8, Math.min(12.2, 5.4 + span * 0.72));
    const dist = portraitBoost ? baseDist * 1.18 : baseDist;
    this.targetPos.set(midX * 0.85, 2.0 + maxY * 0.35, dist);
    this.targetLook.set(midX, 1.2 + maxY * 0.3, 0);
    this.targetFov = 42;
    this.lerpSpeed = 7.5;
  }

  set(pos: THREE.Vector3, look: THREE.Vector3, speed = 4, fov = 42): void {
    this.targetPos.copy(pos);
    this.targetLook.copy(look);
    this.lerpSpeed = speed;
    this.targetFov = fov;
  }

  snap(pos: THREE.Vector3, look: THREE.Vector3, fov = 42): void {
    this.targetPos.copy(pos);
    this.currentPos.copy(pos);
    this.targetLook.copy(look);
    this.currentLook.copy(look);
    this.camera.fov = fov;
    this.targetFov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }

  shake(amp: number, dur: number): void {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeDur = Math.max(dur, 0.05);
    this.shakeTimer = dur;
  }

  update(dt: number): void {
    const a = 1 - Math.exp(-this.lerpSpeed * dt);
    this.currentPos.lerp(this.targetPos, a);
    this.currentLook.lerp(this.targetLook, a);

    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      this.camera.fov += (this.targetFov - this.camera.fov) * a;
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.copy(this.currentPos);
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const k = Math.max(0, this.shakeTimer / this.shakeDur);
      const s = this.shakeAmp * k;
      this.camera.position.x += (Math.random() - 0.5) * 2 * s;
      this.camera.position.y += (Math.random() - 0.5) * 2 * s;
      if (this.shakeTimer <= 0) this.shakeAmp = 0;
    }
    this.camera.lookAt(this.currentLook);
  }
}
