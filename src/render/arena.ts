import * as THREE from 'three';
import { FireworksSystem, makeGlowSprite } from './vfx.ts';
import type { StageId } from '../types.ts';

function std(color: number, roughness = 0.85, metalness = 0.04): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeCanvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSansadFloorTex(diwali: boolean): THREE.CanvasTexture {
  return makeCanvasTex(1024, 1024, (ctx) => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#eadfce' : '#d8cbb7';
        ctx.fillRect(x * 128, y * 128, 128, 128);
      }
    }
    // Red parliament carpet runner
    ctx.fillStyle = '#8b141b';
    ctx.fillRect(0, 420, 1024, 184);
    ctx.fillStyle = '#d4a840';
    ctx.fillRect(0, 424, 1024, 8);
    ctx.fillRect(0, 592, 1024, 8);

    if (diwali) {
      // Ornate Rangoli center
      const cx = 512;
      const cy = 512;
      const rings = [140, 108, 76, 44, 20];
      const cols = ['#ff7b1a', '#ffd23f', '#e0262f', '#22d3ee', '#ffffff'];
      rings.forEach((r, idx) => {
        ctx.fillStyle = cols[idx];
        ctx.beginPath();
        for (let p = 0; p < 16; p++) {
          const a = (p / 16) * Math.PI * 2;
          const aMid = ((p + 0.5) / 16) * Math.PI * 2;
          const x1 = cx + Math.cos(a) * r;
          const y1 = cy + Math.sin(a) * r;
          const xm = cx + Math.cos(aMid) * (r * 0.72);
          const ym = cy + Math.sin(aMid) * (r * 0.72);
          if (p === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
          ctx.lineTo(xm, ym);
        }
        ctx.closePath();
        ctx.fill();
      });
    }
  });
}

function makeJantarFloorTex(): THREE.CanvasTexture {
  return makeCanvasTex(1024, 1024, (ctx) => {
    ctx.fillStyle = '#c88055';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#efe2cf';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(512, 512, 340, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(512, 512, 260, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#efe2cf';
    ctx.font = 'bold 42px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    numerals.forEach((num, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(num, 512 + Math.cos(a) * 300, 512 + Math.sin(a) * 300);
    });
  });
}

function makeRoadFloorTex(): THREE.CanvasTexture {
  return makeCanvasTex(1024, 1024, (ctx) => {
    ctx.fillStyle = '#4b4945';
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 6500; i++) {
      const g = 55 + Math.random() * 48;
      ctx.fillStyle = `rgba(${g},${g - 3},${g - 8},0.45)`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 3);
    }
    ctx.fillStyle = 'rgba(235,224,195,0.65)';
    for (let x = 20; x < 1024; x += 170) {
      ctx.fillRect(x, 500, 92, 16);
    }
    ctx.strokeStyle = 'rgba(22,20,18,0.75)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 20; i++) {
      let x = Math.random() * 1024;
      let y = Math.random() * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (Math.random() - 0.5) * 70;
        y += (Math.random() - 0.5) * 70;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

function makeFlagTexture(): THREE.CanvasTexture {
  return makeCanvasTex(256, 160, (ctx) => {
    ctx.fillStyle = '#ff9933';
    ctx.fillRect(0, 0, 256, 53);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 53, 256, 54);
    ctx.fillStyle = '#138808';
    ctx.fillRect(0, 107, 256, 53);
    ctx.strokeStyle = '#000080';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 80, 21, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(128, 80);
      ctx.lineTo(128 + Math.cos(a) * 21, 80 + Math.sin(a) * 21);
      ctx.stroke();
    }
  });
}

const PLACARD_TEXTS = [
  'VOTE!',
  'ACHHE DIN',
  'JUMLA 2.0',
  'FREE CHAI',
  'MITHAI DO!',
  'KHELA HOBE',
  'BULLDOZER',
  'SOURCE??',
  '50% TARIFF',
  'SONA OUT',
  'E20 POWER',
  'NO WAITING',
  'BREAK NEWS',
  'SHAH MAAT',
];

function makePlacardTex(label: string, bg: string): THREE.CanvasTexture {
  return makeCanvasTex(192, 112, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 192, 112);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 184, 104);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 28px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 96, 58);
  });
}

export class Arena {
  readonly group = new THREE.Group();
  readonly fireworks: FireworksSystem;

  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly baseSunIntensity: number;
  private readonly baseHemiIntensity: number;
  private readonly skyMat: THREE.ShaderMaterial;

  private crowdBodies!: THREE.InstancedMesh;
  private crowdHeads!: THREE.InstancedMesh;
  private readonly crowdBasePos: THREE.Vector3[] = [];
  private readonly crowdPhases: number[] = [];
  private readonly dummy = new THREE.Object3D();

  private readonly flags: THREE.Mesh[] = [];
  private readonly lanterns: THREE.Group[] = [];
  private readonly placards: THREE.Group[] = [];
  private readonly flashes: THREE.Sprite[] = [];

  private cheerTimer = 0;
  private moodDim = 0;
  private fireworkTimer = 0.8;
  readonly diwali: boolean;

  constructor(private readonly scene: THREE.Scene, readonly stageId: StageId) {
    this.diwali = stageId === 'sansad' && new URLSearchParams(location.search).get('diwali') !== '0';

    const palette = this.diwali
      ? {
          top: 0x05051a,
          mid: 0x1c1728,
          bot: 0x4f2c3a,
          fog: 0x1a1530,
          sun: 0xffd290,
          sunI: 1.45,
          hemiSky: 0x7a7498,
          hemiGround: 0x3a2418,
          hemiI: 1.05,
        }
      : stageId === 'jantar'
        ? {
            top: 0x1d3557,
            mid: 0x8b4c42,
            bot: 0xe9966a,
            fog: 0x6b3f3c,
            sun: 0xffc77e,
            sunI: 1.75,
            hemiSky: 0xffb38a,
            hemiGround: 0x5c3a2a,
            hemiI: 1.1,
          }
        : stageId === 'road'
          ? {
              top: 0x263547,
              mid: 0x5a636e,
              bot: 0xb88b68,
              fog: 0x4a4548,
              sun: 0xffe4b8,
              sunI: 1.65,
              hemiSky: 0xaab4c2,
              hemiGround: 0x443b32,
              hemiI: 1.1,
            }
          : {
              top: 0x182542,
              mid: 0x4e4664,
              bot: 0xd17e52,
              fog: 0x2b2840,
              sun: 0xffdfb3,
              sunI: 1.65,
              hemiSky: 0x9fa8cc,
              hemiGround: 0x4b3828,
              hemiI: 1.1,
            };

    this.baseSunIntensity = palette.sunI;
    this.baseHemiIntensity = palette.hemiI;

    scene.fog = new THREE.Fog(palette.fog, 28, 92);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(palette.top) },
        midColor: { value: new THREE.Color(palette.mid) },
        botColor: { value: new THREE.Color(palette.bot) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 midColor; uniform vec3 botColor;
        varying vec3 vWorldPos;
        void main() {
          float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
          vec3 col = mix(botColor, midColor, smoothstep(0.0, 0.25, h));
          col = mix(col, topColor, smoothstep(0.25, 0.85, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(85, 24, 16), this.skyMat);
    this.group.add(skyDome);

    this.hemiLight = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, palette.hemiI);
    this.group.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(palette.sun, palette.sunI);
    this.sunLight.position.set(10, 18, 14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 50;
    const d = 12;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.group.add(this.sunLight);

    this.buildFloor();
    if (stageId === 'sansad') this.buildSansad();
    else if (stageId === 'jantar') this.buildJantarMantar();
    else this.buildDesiSadak();

    this.buildCrowd();
    this.buildPlacards();

    // Paparazzi flash sprites
    for (let i = 0; i < 6; i++) {
      const f = makeGlowSprite(0xffffff, 1.4, 0);
      f.position.set((Math.random() - 0.5) * 14, 1.5 + Math.random() * 2.2, -3.5 - Math.random() * 4);
      this.group.add(f);
      this.flashes.push(f);
    }

    this.fireworks = new FireworksSystem(scene, this.diwali ? 8 : 5);
    scene.add(this.group);
  }

  private buildFloor(): void {
    const tex =
      this.stageId === 'sansad'
        ? makeSansadFloorTex(this.diwali)
        : this.stageId === 'jantar'
          ? makeJantarFloorTex()
          : makeRoadFloorTex();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (this.stageId === 'road') tex.repeat.set(4, 2);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(56, 36),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private buildSansad(): void {
    const sandstone = std(0xd8a882, 0.88);
    const cream = std(0xece0cd, 0.85);
    const roofDome = std(0xb34b3c, 0.8);

    // Parliament colonnade drum & grand dome
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(18, 18.4, 5.2, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56), sandstone);
    wall.position.set(0, 2.6, -3.5);
    this.group.add(wall);

    const entablature = new THREE.Mesh(new THREE.BoxGeometry(26, 0.9, 2.4), cream);
    entablature.position.set(0, 5.4, -14.5);
    this.group.add(entablature);

    for (let x = -11; x <= 11; x += 2.2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 5.2, 12), cream);
      col.position.set(x, 2.6, -13.8);
      col.castShadow = true;
      this.group.add(col);
    }

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(5.6, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      roofDome
    );
    dome.position.set(0, 5.8, -16.5);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 10), std(0xffd23f, 0.3, 0.8));
    finial.position.set(0, 11.9, -16.5);
    this.group.add(dome, finial);

    // Waving Tricolors
    const flagTex = makeFlagTexture();
    const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.7 });
    for (const fx of [-7.8, 7.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 7.6, 8), std(0xd4d4d8, 0.3, 0.8));
      pole.position.set(fx, 3.8, -9.5);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.15, 10, 4), flagMat);
      cloth.position.set(fx + 0.95, 6.9, -9.5);
      this.group.add(pole, cloth);
      this.flags.push(cloth);
    }

    if (this.diwali) {
      // Glowing Diyas along stage edge
      const diyaMat = std(0xa84c20, 0.9);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
      for (let x = -7.5; x <= 7.5; x += 1.5) {
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.08, 10), diyaMat);
        bowl.position.set(x, 0.04, 2.4);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 8), flameMat);
        flame.position.set(x, 0.14, 2.4);
        const glow = makeGlowSprite(0xff9e2c, 0.65, 0.7);
        glow.position.set(x, 0.16, 2.4);
        this.group.add(bowl, flame, glow);
      }

      // Festive swinging Diwali lanterns overhead
      const lanternCols = [0xff4b2b, 0xffd23f, 0x22d3ee, 0xe84393, 0x55efc4];
      for (let i = -3; i <= 3; i++) {
        const piv = new THREE.Group();
        piv.position.set(i * 2.4, 5.2, -5.5);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), std(0x222222));
        cord.position.y = -0.45;
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.28, 1),
          new THREE.MeshBasicMaterial({ color: lanternCols[(i + 3) % lanternCols.length] })
        );
        orb.position.y = -1.0;
        const glow = makeGlowSprite(lanternCols[(i + 3) % lanternCols.length], 1.4, 0.45);
        glow.position.y = -1.0;
        piv.add(cord, orb, glow);
        this.group.add(piv);
        this.lanterns.push(piv);
      }
    }
  }

  private buildJantarMantar(): void {
    const stone = std(0xd87c52, 0.88);
    const trim = std(0xf2e3cf, 0.8);

    // Samrat Yantra giant sundial gnomon
    const gnomon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.2, 8), stone);
    gnomon.position.set(0, 2.4, -12);
    gnomon.rotation.x = 0.48;
    const quadrant = new THREE.Mesh(
      new THREE.TorusGeometry(4.4, 0.35, 10, 32, Math.PI),
      trim
    );
    quadrant.rotation.x = Math.PI;
    quadrant.position.set(0, 2.4, -12);
    this.group.add(gnomon, quadrant);

    // Ram Yantra circular colonnades
    for (const sx of [-9, 9]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.6, 2.2, 16, 1, true), stone);
      ring.position.set(sx, 1.1, -11);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.5, 10), trim);
      pillar.position.set(sx, 1.25, -11);
      this.group.add(ring, pillar);
    }

    // JANTAR MANTAR banner board
    const signTex = makeCanvasTex(512, 96, (ctx) => {
      ctx.fillStyle = '#3e1e18';
      ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = '#ffd27d';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 504, 88);
      ctx.fillStyle = '#ffd27d';
      ctx.font = 'bold 46px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JANTAR MANTAR', 256, 50);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.0), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(0, 5.2, -9.8);
    this.group.add(sign);
  }

  private buildDesiSadak(): void {
    const colors = [0xf2b5d4, 0xf6d365, 0x63c7b2, 0xb788ea, 0xf28b50];
    let x = -22;
    let idx = 0;
    while (x < 22) {
      const w = 4 + (idx % 3) * 1.4;
      const h = 6 + (idx % 2) * 3;
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, 5), std(colors[idx % colors.length], 0.92));
      bldg.position.set(x + w / 2, h / 2, -16);
      this.group.add(bldg);
      x += w + 0.4;
      idx++;
    }

    // Utility poles & overhead tangled wires
    const wireMat = new THREE.LineBasicMaterial({ color: 0x111111 });
    const poles = [-16, -8, 0, 8, 16];
    for (const px of poles) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 7.6, 8), std(0x78716c));
      pole.position.set(px, 3.8, -10.5);
      this.group.add(pole);
    }
    for (let i = 0; i < poles.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const p1 = new THREE.Vector3(poles[i], 7.0 - k * 0.25, -10.5);
        const p2 = new THREE.Vector3(poles[i + 1], 7.0 - k * 0.2, -10.5);
        const mid = p1.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, -0.9 - k * 0.25, 0));
        const pts = new THREE.QuadraticBezierCurve3(p1, mid, p2).getPoints(12);
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
      }
    }

    // Parked Auto-Rickshaw in background
    const auto = new THREE.Group();
    const autoGreen = std(0x2f855a, 0.5);
    const autoYellow = std(0xf59e0b, 0.6);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.1), autoGreen);
    body.position.y = 0.6;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 1.2), autoYellow);
    canopy.position.set(0.1, 1.55, 0);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.85), autoGreen);
    front.position.set(0.95, 0.75, 0);
    auto.add(body, canopy, front);
    auto.position.set(11, 0, -9.2);
    auto.rotation.y = -0.45;
    this.group.add(auto);
  }

  private buildCrowd(): void {
    const count = 240;
    const bodyGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.52, 8);
    const headGeo = new THREE.SphereGeometry(0.12, 8, 8);
    this.crowdBodies = new THREE.InstancedMesh(bodyGeo, std(0xffffff, 0.9), count);
    this.crowdHeads = new THREE.InstancedMesh(headGeo, std(0xd8a378, 0.7), count);

    const shirtCols = [0xff7b1a, 0x2563eb, 0xf8fafc, 0x16a34a, 0xe0262f, 0xfacc15, 0x8b5cf6, 0xec4899];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 48);
      const col = i % 48;
      const x = -12.5 + col * 0.53 + (Math.random() - 0.5) * 0.16;
      const y = 0.35 + row * 0.42;
      const z = -5.2 - row * 0.95;
      const pos = new THREE.Vector3(x, y, z);
      this.crowdBasePos.push(pos);
      this.crowdPhases.push(Math.random() * Math.PI * 2);

      this.dummy.position.copy(pos);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.crowdBodies.setMatrixAt(i, this.dummy.matrix);
      this.crowdBodies.setColorAt(i, new THREE.Color(shirtCols[i % shirtCols.length]));

      this.dummy.position.set(x, y + 0.38, z);
      this.dummy.updateMatrix();
      this.crowdHeads.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.crowdBodies, this.crowdHeads);
  }

  private buildPlacards(): void {
    const bgCols = ['#ffd23f', '#ffffff', '#ffb703', '#8ecae6', '#ff8fab'];
    for (let i = 0; i < 16; i++) {
      const piv = new THREE.Group();
      const x = -10.5 + i * 1.4 + (Math.random() - 0.5) * 0.4;
      const z = -5.6 - (i % 3) * 1.1;
      const y = 1.2 + (i % 3) * 0.4;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), std(0x5c4033));
      stick.position.y = 0.3;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.5),
        new THREE.MeshBasicMaterial({ map: makePlacardTex(PLACARD_TEXTS[i % PLACARD_TEXTS.length], bgCols[i % bgCols.length]), side: THREE.DoubleSide })
      );
      sign.position.y = 0.72;
      piv.add(stick, sign);
      piv.position.set(x, y, z);
      this.group.add(piv);
      this.placards.push(piv);
    }
  }

  cheer(dur = 1.2): void {
    this.cheerTimer = Math.max(this.cheerTimer, dur);
  }

  paparazzi(count = 3): void {
    for (let i = 0; i < Math.min(count, this.flashes.length); i++) {
      const f = this.flashes[Math.floor(Math.random() * this.flashes.length)];
      (f.material as THREE.SpriteMaterial).opacity = 0.95;
    }
  }

  setMood(dim: number): void {
    this.moodDim = Math.max(0, Math.min(0.85, dim));
    const scale = 1 - this.moodDim;
    this.sunLight.intensity = this.baseSunIntensity * scale;
    this.hemiLight.intensity = this.baseHemiIntensity * scale;
  }

  update(dt: number, elapsed: number): void {
    if (this.cheerTimer > 0) this.cheerTimer = Math.max(0, this.cheerTimer - dt);
    const exc = this.cheerTimer > 0 ? 1 : 0.25;

    for (let i = 0; i < this.crowdBasePos.length; i++) {
      const b = this.crowdBasePos[i];
      const hop = Math.abs(Math.sin(elapsed * (this.cheerTimer > 0 ? 9 : 3.2) + this.crowdPhases[i])) * 0.16 * exc;
      this.dummy.position.set(b.x, b.y + hop, b.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.crowdBodies.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(b.x, b.y + hop + 0.38, b.z);
      this.dummy.updateMatrix();
      this.crowdHeads.setMatrixAt(i, this.dummy.matrix);
    }
    this.crowdBodies.instanceMatrix.needsUpdate = true;
    this.crowdHeads.instanceMatrix.needsUpdate = true;

    this.placards.forEach((p, idx) => {
      p.rotation.z = Math.sin(elapsed * 4.5 + idx) * (this.cheerTimer > 0 ? 0.24 : 0.08);
    });

    this.lanterns.forEach((l, idx) => {
      l.rotation.z = Math.sin(elapsed * 1.4 + idx) * 0.07;
    });

    this.flags.forEach((flag) => {
      flag.rotation.y = Math.sin(elapsed * 4.2) * 0.15;
    });

    this.flashes.forEach((f) => {
      const mat = f.material as THREE.SpriteMaterial;
      if (mat.opacity > 0) mat.opacity = Math.max(0, mat.opacity - dt * 4.5);
    });

    if (this.diwali) {
      this.fireworkTimer -= dt;
      if (this.fireworkTimer <= 0) {
        this.fireworkTimer = 1.6 + Math.random() * 2.2;
        this.fireworks.burst(
          new THREE.Vector3((Math.random() - 0.5) * 18, 9 + Math.random() * 4, -14 - Math.random() * 6),
          { speed: 6.5, size: 0.45, life: 1.5 }
        );
      }
    }
    this.fireworks.update(dt);
  }

  dispose(): void {
    this.fireworks.dispose();
    this.scene.remove(this.group);
  }
}
