import * as THREE from 'three';

let sharedGlowTex: THREE.CanvasTexture | null = null;

export function getGlowTexture(): THREE.CanvasTexture {
  if (sharedGlowTex) return sharedGlowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  sharedGlowTex = new THREE.CanvasTexture(c);
  sharedGlowTex.userData.shared = true;
  return sharedGlowTex;
}

export function makeGlowSprite(color: number, size: number, opacity = 1): THREE.Sprite {
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sp.scale.setScalar(size);
  return sp;
}

const MAX_PARTICLES = 3000;

export interface EmitOpts {
  count: number;
  speed: number;
  color: number;
  life: number;
  size: number;
  gravity?: number;
  drag?: number;
  jitter?: number;
  dir?: THREE.Vector3;
  spread?: number;
}

export class ParticlePool {
  readonly points: THREE.Points;
  private readonly pos = new Float32Array(MAX_PARTICLES * 3);
  private readonly col = new Float32Array(MAX_PARTICLES * 3);
  private readonly size = new Float32Array(MAX_PARTICLES);
  private readonly alpha = new Float32Array(MAX_PARTICLES);
  private readonly vel = new Float32Array(MAX_PARTICLES * 3);
  private readonly life = new Float32Array(MAX_PARTICLES);
  private readonly maxLife = new Float32Array(MAX_PARTICLES);
  private readonly grav = new Float32Array(MAX_PARTICLES);
  private readonly drag = new Float32Array(MAX_PARTICLES);
  private readonly baseSize = new Float32Array(MAX_PARTICLES);
  private cursor = 0;
  private readonly tmpCol = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: getGlowTexture() } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute vec3 color;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = color; vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (420.0 / max(0.5, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vColor * t.rgb * vAlpha * 1.6, t.a * vAlpha);
        }`,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(origin: THREE.Vector3, opts: EmitOpts): void {
    this.tmpCol.setHex(opts.color);
    for (let i = 0; i < opts.count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;

      const jit = opts.jitter ?? 0;
      this.pos[idx * 3] = origin.x + (Math.random() - 0.5) * jit * 2;
      this.pos[idx * 3 + 1] = origin.y + (Math.random() - 0.5) * jit * 2;
      this.pos[idx * 3 + 2] = origin.z + (Math.random() - 0.5) * jit * 2;

      let dx = Math.random() * 2 - 1;
      let dy = Math.random() * 2 - 1;
      let dz = Math.random() * 2 - 1;
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len;
      dy /= len;
      dz /= len;

      if (opts.dir) {
        const sp = opts.spread ?? 0.5;
        dx = opts.dir.x + dx * sp;
        dy = opts.dir.y + dy * sp;
        dz = opts.dir.z + dz * sp;
      }

      const spd = opts.speed * (0.4 + Math.random() * 0.8);
      this.vel[idx * 3] = dx * spd;
      this.vel[idx * 3 + 1] = dy * spd;
      this.vel[idx * 3 + 2] = dz * spd;

      const l = opts.life * (0.6 + Math.random() * 0.6);
      this.life[idx] = l;
      this.maxLife[idx] = l;
      this.grav[idx] = opts.gravity ?? 0;
      this.drag[idx] = opts.drag ?? 1.5;
      this.baseSize[idx] = opts.size * (0.6 + Math.random() * 0.8);

      const bright = 0.85 + Math.random() * 0.3;
      this.col[idx * 3] = this.tmpCol.r * bright;
      this.col[idx * 3 + 1] = this.tmpCol.g * bright;
      this.col[idx * 3 + 2] = this.tmpCol.b * bright;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const ratio = Math.max(0, this.life[i] / this.maxLife[i]);
      const drag = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * drag - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = ratio;
      this.size[i] = this.baseSize[i] * (0.4 + ratio * 0.6);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
    g.attributes.alpha.needsUpdate = true;
  }
}

const RING_GEO = new THREE.RingGeometry(0.6, 0.8, 48);
const UP_DIR = new THREE.Vector3(0, 0.3, 0);

interface ActiveWave {
  mesh: THREE.Mesh;
  life: number;
  max: number;
  grow: number;
}

export class VfxManager {
  readonly particles: ParticlePool;
  private readonly waves: ActiveWave[] = [];
  private readonly dirTmp = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene) {
    this.particles = new ParticlePool(scene);
  }

  hitSpark(pos: THREE.Vector3, power: number, blocked: boolean, dirX: number): void {
    const color = blocked ? 0x7fd8ff : 0xffaa44;
    this.particles.emit(pos, {
      count: Math.round(14 + power * 18),
      speed: 4 + power * 4,
      color,
      life: 0.35,
      size: 0.12 + power * 0.06,
      gravity: 6,
      drag: 3,
      dir: this.dirTmp.set(dirX, 0.3, 0.2),
      spread: 1.1,
    });
    this.particles.emit(pos, {
      count: 4,
      speed: 0.3,
      color: 0xffffff,
      life: 0.12,
      size: 0.6 + power * 0.4,
      drag: 6,
    });
    if (!blocked && power > 0.6) {
      this.shockwave(pos, 0xffd166, 0.22, 0.28 * power, true);
    }
  }

  dust(pos: THREE.Vector3, scale = 1): void {
    this.particles.emit(pos, {
      count: Math.round(18 * scale),
      speed: 2.2,
      color: 0x8a6d48,
      life: 0.8,
      size: 0.35,
      gravity: -0.5,
      drag: 3,
      dir: UP_DIR,
      spread: 1.4,
    });
  }

  shockwave(pos: THREE.Vector3, color: number, dur: number, grow: number, billboard = false): void {
    const mesh = new THREE.Mesh(
      RING_GEO,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    mesh.position.copy(pos);
    if (billboard) mesh.userData.billboard = true;
    else mesh.rotation.x = -Math.PI / 2;
    mesh.scale.setScalar(0.3);
    this.scene.add(mesh);
    this.waves.push({ mesh, life: dur, max: dur, grow });
  }

  update(dt: number, camera: THREE.Camera): void {
    this.particles.update(dt);
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.life -= dt;
      const p = 1 - w.life / w.max;
      w.mesh.scale.setScalar(0.3 + p * w.grow * 3);
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - p);
      if (w.mesh.userData.billboard) {
        w.mesh.quaternion.copy(camera.quaternion);
      }
      if (w.life <= 0) {
        this.scene.remove(w.mesh);
        (w.mesh.material as THREE.Material).dispose();
        this.waves.splice(i, 1);
      }
    }
  }
}

const FIREWORK_COLORS = [0xffcc4b, 0xff5a2a, 0x5affe8, 0x6fffff, 0xff70e0, 0xffffff, 0xff9f1c];

interface BurstSlot {
  points: THREE.Points;
  pos: Float32Array;
  vel: Float32Array;
  age: number;
  life: number;
  gravity: number;
  drag: number;
  live: boolean;
}

export class FireworksSystem {
  private readonly bursts: BurstSlot[] = [];
  private readonly perBurst = 84;

  constructor(private readonly scene: THREE.Scene, slots = 10) {
    for (let s = 0; s < slots; s++) {
      const pos = new Float32Array(this.perBurst * 3);
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          map: getGlowTexture(),
          color: 0xffffff,
          size: 0.5,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
          toneMapped: false,
        })
      );
      pts.frustumCulled = false;
      pts.visible = false;
      scene.add(pts);
      this.bursts.push({
        points: pts,
        pos,
        vel: new Float32Array(this.perBurst * 3),
        age: 0,
        life: 1,
        gravity: 2.2,
        drag: 1.4,
        live: false,
      });
    }
  }

  burst(origin: THREE.Vector3, opts: { color?: number; speed?: number; size?: number; life?: number; up?: number } = {}): void {
    const slot =
      this.bursts.find((b) => !b.live) ??
      this.bursts.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));

    const speed = opts.speed ?? 6;
    const up = opts.up ?? 0;

    for (let i = 0; i < this.perBurst; i++) {
      slot.pos[i * 3] = origin.x;
      slot.pos[i * 3 + 1] = origin.y;
      slot.pos[i * 3 + 2] = origin.z;

      let vx: number;
      let vy: number;
      let vz: number;
      if (up > 0) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * 0.35;
        vx = Math.cos(ang) * rad;
        vz = Math.sin(ang) * rad;
        vy = 1;
      } else {
        const z = Math.random() * 2 - 1;
        const ang = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - z * z);
        vx = Math.cos(ang) * r;
        vy = z;
        vz = Math.sin(ang) * r;
      }
      const sp = speed * (up > 0 ? up * (0.6 + Math.random() * 0.5) : 0.75 + Math.random() * 0.25);
      slot.vel[i * 3] = vx * sp;
      slot.vel[i * 3 + 1] = vy * sp;
      slot.vel[i * 3 + 2] = vz * sp;
    }

    const mat = slot.points.material as THREE.PointsMaterial;
    mat.color.setHex(opts.color ?? FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    mat.size = opts.size ?? 0.5;
    slot.age = 0;
    slot.life = opts.life ?? 1.6;
    slot.gravity = up > 0 ? 7 : 2.2;
    slot.drag = up > 0 ? 0.6 : 1.4;
    slot.live = true;
    slot.points.visible = true;
    slot.points.geometry.attributes.position.needsUpdate = true;
  }

  update(dt: number): void {
    for (const b of this.bursts) {
      if (!b.live) continue;
      b.age += dt;
      const p = b.age / b.life;
      if (p >= 1) {
        b.live = false;
        b.points.visible = false;
        continue;
      }
      const d = Math.exp(-b.drag * dt);
      for (let i = 0; i < this.perBurst; i++) {
        b.vel[i * 3] *= d;
        b.vel[i * 3 + 1] = b.vel[i * 3 + 1] * d - b.gravity * dt;
        b.vel[i * 3 + 2] *= d;
        b.pos[i * 3] += b.vel[i * 3] * dt;
        b.pos[i * 3 + 1] += b.vel[i * 3 + 1] * dt;
        b.pos[i * 3 + 2] += b.vel[i * 3 + 2] * dt;
      }
      b.points.geometry.attributes.position.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity =
        Math.pow(1 - p, 1.4) * (0.75 + 0.25 * Math.sin(b.age * 40));
    }
  }

  dispose(): void {
    for (const b of this.bursts) {
      this.scene.remove(b.points);
      b.points.geometry.dispose();
      (b.points.material as THREE.Material).dispose();
    }
  }
}
