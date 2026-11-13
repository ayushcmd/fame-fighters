import * as THREE from 'three';
import { FIGHTERS } from '../data/fighters.ts';
import type { FighterId } from '../types.ts';

const portraitCache = new Map<string, string>();

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** Generate a stylized satirical vector-look portrait data URL for a fighter. */
export function getFighterPortraitUrl(id: FighterId): string {
  if (portraitCache.has(id)) return portraitCache.get(id)!;

  const cfg = FIGHTERS[id];
  const { look } = cfg;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Dramatic party-color radial backdrop
  const bg = ctx.createRadialGradient(128, 108, 16, 128, 128, 145);
  bg.addColorStop(0, cfg.color);
  bg.addColorStop(0.75, '#191426');
  bg.addColorStop(1, '#09070f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle sunburst rays
  ctx.save();
  ctx.translate(128, 130);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, -180);
    ctx.lineTo(14, -180);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Shoulders & signature outfit
  ctx.fillStyle = hexCss(look.shirt);
  ctx.beginPath();
  ctx.ellipse(128, 248, 88 * look.shoulders, 62, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  if (look.style === 'kurta-jacket' || look.style === 'suit') {
    ctx.fillStyle = hexCss(look.jacket);
    ctx.beginPath();
    ctx.moveTo(46, 256);
    ctx.lineTo(80, 188);
    ctx.lineTo(128, 224);
    ctx.lineTo(176, 188);
    ctx.lineTo(210, 256);
    ctx.closePath();
    ctx.fill();

    if (look.style === 'suit') {
      // Red power tie
      ctx.fillStyle = '#e0262f';
      ctx.beginPath();
      ctx.moveTo(121, 196);
      ctx.lineTo(135, 196);
      ctx.lineTo(139, 256);
      ctx.lineTo(117, 256);
      ctx.closePath();
      ctx.fill();
    }
  } else if (look.style === 'sari') {
    ctx.fillStyle = hexCss(look.jacket);
    ctx.beginPath();
    ctx.moveTo(48, 256);
    ctx.lineTo(95, 182);
    ctx.lineTo(170, 256);
    ctx.closePath();
    ctx.fill();
  }

  // Neck
  ctx.fillStyle = hexCss(look.skin);
  ctx.fillRect(108, 162, 40, 38);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(108, 162, 40, 12);

  // Ears
  ctx.fillStyle = hexCss(look.skin);
  ctx.beginPath();
  ctx.ellipse(66, 122, 11, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(190, 122, 11, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  const headW = id === 'trump' || id === 'amit' || id === 'nitin' ? 62 : 56;
  ctx.fillStyle = hexCss(look.skin);
  ctx.beginPath();
  ctx.ellipse(128, 118, headW, 68, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cheek warmth
  ctx.fillStyle = 'rgba(220,90,60,0.16)';
  ctx.beginPath();
  ctx.ellipse(96, 134, 14, 9, 0, 0, Math.PI * 2);
  ctx.ellipse(160, 134, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Beard
  if (look.beardStyle === 'full') {
    ctx.fillStyle = hexCss(look.beard);
    ctx.beginPath();
    ctx.arc(128, 134, 58, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.quadraticCurveTo(128, 198, 70, 144);
    ctx.fill();
    // Mouth cutout
    ctx.fillStyle = hexCss(look.skin);
    ctx.beginPath();
    ctx.ellipse(128, 152, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.beardStyle === 'trim') {
    ctx.fillStyle = hexCss(look.beard);
    ctx.beginPath();
    ctx.arc(128, 134, 54, 0.14 * Math.PI, 0.86 * Math.PI);
    ctx.fill();
    ctx.fillStyle = hexCss(look.skin);
    ctx.beginPath();
    ctx.ellipse(128, 146, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.beardStyle === 'stubble') {
    ctx.fillStyle = 'rgba(40,32,28,0.28)';
    ctx.beginPath();
    ctx.arc(128, 136, 52, 0.16 * Math.PI, 0.84 * Math.PI);
    ctx.fill();
  }

  // Mustache for Modi / Mbapu / Nitn / Lalu
  if (id === 'modi' || id === 'mbapu') {
    ctx.fillStyle = hexCss(look.beard);
    ctx.beginPath();
    ctx.ellipse(117, 143, 14, 6, -0.15, 0, Math.PI * 2);
    ctx.ellipse(139, 143, 14, 6, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hair styles
  ctx.fillStyle = hexCss(look.hair);
  if (look.hairStyle === 'pompadour') {
    ctx.beginPath();
    ctx.moveTo(68, 92);
    ctx.quadraticCurveTo(100, 26, 188, 52);
    ctx.quadraticCurveTo(194, 88, 178, 94);
    ctx.quadraticCurveTo(124, 68, 74, 96);
    ctx.closePath();
    ctx.fill();
  } else if (look.hairStyle === 'short' || look.hairStyle === 'side-part') {
    ctx.beginPath();
    ctx.arc(128, 86, 58, Math.PI * 0.95, Math.PI * 2.05);
    ctx.quadraticCurveTo(128, 66, 72, 92);
    ctx.fill();
  } else if (look.hairStyle === 'bun') {
    ctx.beginPath();
    ctx.arc(128, 42, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(128, 86, 57, Math.PI * 1.0, Math.PI * 2.0);
    ctx.fill();
  } else if (look.hairStyle === 'receding') {
    ctx.beginPath();
    ctx.ellipse(76, 94, 14, 24, 0.15, 0, Math.PI * 2);
    ctx.ellipse(180, 94, 14, 24, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(128, 66, 38, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();
  }

  // Tilak for Yogi
  if (id === 'yogi') {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(125, 72, 6, 22);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(126.5, 76, 3, 14);
  }

  // Expressive Eyes & Brows
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(105, 114, 12, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(151, 114, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b1412';
  ctx.beginPath();
  ctx.arc(106, 114, 5.2, 0, Math.PI * 2);
  ctx.arc(150, 114, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(108, 112, 1.8, 0, Math.PI * 2);
  ctx.arc(152, 112, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Confident eyebrows
  ctx.strokeStyle = look.hairStyle === 'bald' ? '#6a4834' : hexCss(look.hair);
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(91, 99);
  ctx.lineTo(116, 103);
  ctx.moveTo(165, 99);
  ctx.lineTo(140, 103);
  ctx.stroke();

  // Nose
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(128, 112);
  ctx.lineTo(123, 134);
  ctx.lineTo(133, 136);
  ctx.stroke();

  // Mouth (smirk / intensity)
  ctx.strokeStyle = '#5c2620';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  if (id === 'trump') {
    ctx.ellipse(128, 152, 9, 5, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(114, 150);
    ctx.quadraticCurveTo(128, 157, 144, 148);
  }
  ctx.stroke();

  // Glasses
  if (look.glasses !== 'none') {
    ctx.strokeStyle = look.glasses === 'round' ? '#2c221e' : '#cbd5e1';
    ctx.lineWidth = look.glasses === 'round' ? 3.8 : 2.6;
    if (look.glasses === 'round') {
      ctx.beginPath();
      ctx.arc(105, 114, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(151, 114, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(121, 114);
      ctx.lineTo(135, 114);
      ctx.stroke();
    } else {
      ctx.strokeRect(89, 104, 32, 20);
      ctx.strokeRect(135, 104, 32, 20);
      ctx.beginPath();
      ctx.moveTo(121, 112);
      ctx.lineTo(135, 112);
      ctx.stroke();
    }
  }

  // Rim highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 250);

  const url = c.toDataURL('image/png');
  portraitCache.set(id, url);
  return url;
}

/** Generate stylized TV news anchor portrait data URL. */
export function getAnchorPortraitUrl(who: 'godi' | 'troll'): string {
  const key = `anchor:${who}`;
  if (portraitCache.has(key)) return portraitCache.get(key)!;

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = who === 'godi' ? '#4f0d14' : '#0f294a';
  ctx.fillRect(0, 0, 128, 128);

  // Suit
  ctx.fillStyle = who === 'godi' ? '#1e293b' : '#312e81';
  ctx.beginPath();
  ctx.ellipse(64, 126, 48, 34, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = who === 'godi' ? '#dba67e' : '#e4b792';
  ctx.beginPath();
  ctx.ellipse(64, 62, 28, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair & Glasses / Headphones
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(64, 46, 28, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.fillRect(48, 55, 10, 6);
  ctx.fillRect(70, 55, 10, 6);
  ctx.fillStyle = '#111';
  ctx.fillRect(51, 56, 4, 4);
  ctx.fillRect(73, 56, 4, 4);

  if (who === 'godi') {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(45, 51, 16, 13);
    ctx.strokeRect(67, 51, 16, 13);
    // Screaming mouth
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(64, 80, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Troll headphones + smug grin
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 60, 31, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(52, 78);
    ctx.quadraticCurveTo(64, 86, 77, 75);
    ctx.stroke();
  }

  const url = c.toDataURL('image/png');
  portraitCache.set(key, url);
  return url;
}

/** Generate stylized Nirmala Tai standing cutout texture for Budget super. */
export function createNirmalaTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 512);

  // Maroon & Gold Sari silhouette
  ctx.fillStyle = '#7c1228';
  ctx.beginPath();
  ctx.moveTo(64, 498);
  ctx.lineTo(82, 164);
  ctx.lineTo(174, 164);
  ctx.lineTo(192, 498);
  ctx.closePath();
  ctx.fill();

  // Gold sari border
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(86, 174);
  ctx.lineTo(176, 360);
  ctx.lineTo(186, 494);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#dba67f';
  ctx.beginPath();
  ctx.ellipse(128, 108, 38, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair & Bindi
  ctx.fillStyle = '#2b2422';
  ctx.beginPath();
  ctx.arc(128, 86, 40, Math.PI * 0.9, Math.PI * 2.1);
  ctx.fill();
  ctx.fillStyle = '#d62828';
  ctx.beginPath();
  ctx.arc(128, 94, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Spectacles & stern expression
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 3;
  ctx.strokeRect(98, 102, 24, 14);
  ctx.strokeRect(134, 102, 24, 14);
  ctx.beginPath();
  ctx.moveTo(122, 108);
  ctx.lineTo(134, 108);
  ctx.stroke();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(110, 109, 3, 0, Math.PI * 2);
  ctx.arc(146, 109, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#5c2620';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(116, 134);
  ctx.lineTo(140, 134);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Populate all `<img data-portrait="...">` tags in DOM with procedural portraits. */
export function populateAllPortraits(): void {
  document.querySelectorAll<HTMLImageElement>('img[data-portrait]').forEach((img) => {
    const id = img.dataset.portrait as FighterId | undefined;
    if (id && id in FIGHTERS) {
      img.src = getFighterPortraitUrl(id);
    }
  });
}
