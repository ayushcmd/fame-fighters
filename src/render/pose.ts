import type { FighterId, MoveId, Pose } from '../types.ts';
import type { FighterState } from '../combat/fighterState.ts';

const LEG_LEN = 0.97;

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function easeOut(t: number): number {
  const k = clamp01(t);
  return 1 - (1 - k) * (1 - k);
}

export function smoothstep(t: number): number {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
}

export function zeroPose(): Pose {
  return {
    rootY: 0,
    rootZ: 0,
    hipsT: 0,
    hipsF: 0,
    hipsS: 0,
    spineT: 0,
    spineF: 0,
    spineS: 0,
    chestF: 0,
    headF: 0,
    headT: 0,
    headS: 0,
    lShF: 0,
    lShO: 0,
    lShT: 0,
    lEl: 0,
    lHand: 0,
    rShF: 0,
    rShO: 0,
    rShT: 0,
    rEl: 0,
    rHand: 0,
    lThF: 0,
    lThO: 0,
    lKn: 0,
    lAnk: 0,
    rThF: 0,
    rThO: 0,
    rKn: 0,
    rAnk: 0,
  };
}

export function withPose(base: Pose, over: Partial<Pose>): Pose {
  return { ...base, ...over };
}

export function lerpPose(a: Pose, b: Pose, alpha: number): Pose {
  const t = clamp01(alpha);
  const out = { ...a };
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = a[k] + (b[k] - a[k]) * t;
  });
  return out;
}

/** Analytical 2-bone leg inverse kinematics for grounded foot placement. */
export function solveLegIK(
  hipH: number,
  footOffsetZ: number
): { thF: number; kn: number } {
  const l1 = 0.49;
  const l2 = 0.48;
  const dy = Math.max(0.28, Math.min(l1 + l2 - 0.01, hipH));
  const dist = Math.min(l1 + l2 - 0.005, Math.hypot(dy, footOffsetZ));
  const cosKnee = (l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosKnee)));
  const kn = Math.PI - interior;
  const cosHip = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const hipBend = Math.acos(Math.max(-1, Math.min(1, cosHip)));
  const aim = Math.atan2(footOffsetZ, dy);
  return { thF: aim + hipBend, kn };
}

export function solveLegs(
  rootY: number,
  lZ = 0.14,
  rZ = -0.14,
  lLift = 0,
  rLift = 0
): Partial<Pose> {
  const l = solveLegIK(LEG_LEN + rootY - lLift, lZ);
  const r = solveLegIK(LEG_LEN + rootY - rLift, rZ);
  return {
    lThF: l.thF,
    lKn: l.kn,
    lAnk: l.thF - l.kn,
    rThF: r.thF,
    rKn: r.kn,
    rAnk: r.thF - r.kn,
  };
}

export function idlePose(t: number, id: FighterId): Pose {
  const bob = Math.sin(t * 3.4) * 0.025;
  const breathe = Math.sin(t * 3.4 + 0.5) * 0.03;
  const heavy = id === 'trump' || id === 'nitin' || id === 'lalu';
  const y = -0.05 + bob;
  return withPose(zeroPose(), {
    rootY: y,
    hipsT: heavy ? -0.35 : -0.48,
    spineT: heavy ? 0.18 : 0.26,
    spineF: 0.08 + breathe,
    headT: 0.22,
    headF: -0.04 - breathe,
    lShF: 1.05 + breathe * 1.4,
    lShO: 0.12,
    lShT: -0.15,
    lEl: 2.05,
    rShF: 0.92 - breathe,
    rShO: 0.16,
    rShT: 0.25,
    rEl: 2.15,
    ...solveLegs(y, 0.16, -0.18),
  });
}

export function walkPose(t: number, dist: number, relDir: number, id: FighterId): Pose {
  const base = idlePose(t, id);
  const cyc = dist * 4.5;
  const s = Math.sin(cyc);
  const c = Math.cos(cyc);
  const lZ = 0.02 + s * 0.26;
  const rZ = -0.02 - s * 0.26;
  const lLift = Math.max(0, c) * 0.09;
  const rLift = Math.max(0, -c) * 0.09;
  const y = -0.06 + Math.abs(c) * 0.025;
  return withPose(base, {
    rootY: y,
    spineF: relDir > 0 ? 0.16 : 0.02,
    spineT: base.spineT + s * 0.1,
    lShF: base.lShF - s * 0.2,
    rShF: base.rShF + s * 0.2,
    ...solveLegs(y, lZ, rZ, lLift, rLift),
  });
}

export function crouchPose(t: number, id: FighterId, blocking: boolean): Pose {
  const y = -0.38;
  return withPose(idlePose(t, id), {
    rootY: y,
    spineF: 0.42,
    headF: -0.3,
    lShF: blocking ? 1.3 : 1.0,
    lEl: blocking ? 2.2 : 1.7,
    rShF: blocking ? 1.1 : 0.8,
    rEl: 2.2,
    ...solveLegs(y, 0.3, -0.18),
  });
}

export function guardPose(t: number, id: FighterId): Pose {
  return withPose(idlePose(t, id), {
    spineF: 0.18,
    headF: 0.2,
    lShF: 1.35,
    lShO: -0.05,
    lEl: 2.4,
    rShF: 1.25,
    rShO: -0.05,
    rEl: 2.45,
  });
}

export function jumpPose(vy: number, t: number, id: FighterId): Pose {
  const tuck = clamp01(1 - Math.abs(vy) / 8);
  return withPose(idlePose(0, id), {
    rootY: 0,
    spineF: 0.15,
    lThF: 0.5 + tuck * 0.7,
    lKn: 0.6 + tuck * 1.2,
    lAnk: 0.3,
    rThF: 0.2 + tuck * 0.6,
    rKn: 0.8 + tuck * 1.0,
    rAnk: 0.3,
    lShF: 1.3,
    lEl: 1.6,
    rShF: 1.0,
    rEl: 1.9,
  });
}

function attackPair(moveId: MoveId, id: FighterId): { windup: Partial<Pose>; strike: Partial<Pose> } {
  const yKick = -0.03;
  const rLegStand = solveLegIK(LEG_LEN + yKick, 0.06);
  const standLeft = { lThF: rLegStand.thF, lKn: rLegStand.kn, lAnk: rLegStand.thF - rLegStand.kn };

  switch (moveId) {
    case 'jab':
      return {
        windup: { lShF: 1.2, lEl: 2.1, spineT: -0.1 },
        strike: { lShF: 1.58, lShO: -0.12, lEl: 0.05, spineT: -0.38, hipsT: -0.35, rootZ: 0.06, headT: 0.4 },
      };
    case 'cross':
      return {
        windup: { rShF: 0.8, rEl: 2.3, spineT: -0.3 },
        strike: { rShF: 1.6, rShO: -0.3, rEl: 0.05, spineT: 0.45, hipsT: 0.15, rootZ: 0.1, lShF: 1.0, lEl: 2.2, headT: 0 },
      };
    case 'kick':
      return {
        windup: { rThF: 1.3, rKn: 1.9, spineF: -0.05, rootY: yKick },
        strike: { rootY: yKick, rThF: 1.45, rKn: 0.15, rAnk: 0.2, spineF: -0.22, hipsT: 0.1, ...standLeft },
      };
    case 'finisher':
    case 'special2': {
      const n = -0.02;
      const turn = id === 'rahul' && moveId === 'special2' ? 0.9 : 0.6;
      const st = solveLegIK(LEG_LEN + n, -0.02);
      return {
        windup: { rThF: 1.1, rThO: 0.4, rKn: 2, hipsT: turn * 0.5, spineT: -0.3, rootY: n },
        strike: {
          rootY: n,
          rThF: 1.5,
          rThO: 0.75,
          rKn: 0.05,
          rAnk: 0.2,
          hipsT: turn,
          spineF: -0.38,
          spineS: 0.15,
          spineT: -0.2,
          lShO: 0.6,
          lShF: 0.6,
          lEl: 1.0,
          rShO: 0.5,
          rEl: 1.2,
          lThF: st.thF,
          lKn: st.kn,
          lAnk: st.thF - st.kn,
        },
      };
    }
    case 'uppercut':
      return {
        windup: { rootY: -0.3, ...solveLegs(-0.3, 0.32, -0.3), spineF: 0.4, spineT: -0.25, lShF: 0.2, lEl: 1.7 },
        strike: {
          rootY: 0.03,
          ...solveLegs(0.03, 0.16, -0.3),
          spineF: -0.28,
          spineT: -0.3,
          hipsT: -0.4,
          lShF: 2.85,
          lShO: -0.1,
          lEl: 0.45,
          rShF: 0.9,
          rEl: 2.2,
          headF: -0.35,
          rootZ: 0.05,
        },
      };
    case 'roundhouse':
      return {
        windup: { rootY: 0, hipsT: -0.9, spineT: 0.3, rThF: 0.7, rThO: 0.3, rKn: 1.7, ...standLeft },
        strike: {
          rootY: 0,
          hipsT: 1.1,
          spineT: -0.45,
          spineF: -0.5,
          spineS: 0.25,
          rThF: 1.75,
          rThO: 1.0,
          rKn: 0.05,
          rAnk: 0.2,
          lShF: 0.5,
          lShO: 1.0,
          lEl: 0.5,
          rShF: 0.3,
          rShO: 0.9,
          rEl: 0.6,
          headT: 0.6,
          ...solveLegs(0, 0, 0),
        },
      };
    case 'lowJab':
      return {
        windup: { lShF: 0.9, lEl: 2, rootY: -0.42, spineF: 0.42 },
        strike: { rootY: -0.42, spineF: 0.5, lShF: 1.2, lShO: -0.1, lEl: 0.08, spineT: -0.35, ...solveLegs(-0.42, 0.3, -0.18) },
      };
    case 'sweep': {
      const y = -0.55;
      const st = solveLegIK(LEG_LEN + y, -0.32);
      return {
        windup: { rootY: -0.45, spineF: 0.5, hipsT: -0.3, ...solveLegs(-0.45, 0.3, -0.2) },
        strike: {
          rootY: y,
          spineF: 0.6,
          hipsT: 0.55,
          spineT: -0.4,
          lThF: 1.12,
          lThO: 0.35,
          lKn: 0.05,
          lAnk: 0.9,
          rThF: st.thF,
          rKn: st.kn,
          rAnk: st.thF - st.kn,
          lShF: 0.6,
          lShO: 0.6,
          lEl: 0.6,
          rShF: 0.4,
          rShO: 0.3,
          rEl: 0.5,
        },
      };
    }
    case 'special1':
      if (id === 'modi' || id === 'didi' || id === 'trump' || id === 'yogi') {
        return {
          windup: { rShF: 0.2, rEl: 2, rHand: 1, spineT: -0.4, rootY: -0.12 },
          strike: {
            rShF: 1.55,
            rShO: -0.2,
            rShT: -0.4,
            rEl: 0,
            rHand: 1,
            spineT: 0.5,
            spineF: 0.2,
            hipsT: 0.2,
            rootZ: 0.15,
            rootY: -0.12,
            ...solveLegs(-0.12, 0.42, -0.36),
            headT: 0.05,
          },
        };
      }
      return {
        windup: { rShF: 0.3, rEl: 1.6, rootY: -0.25, spineF: 0.35, spineT: -0.3, ...solveLegs(-0.25, 0.3, -0.3) },
        strike: {
          rShF: 2.75,
          rShO: -0.15,
          rEl: 0.6,
          spineF: -0.25,
          spineT: 0.35,
          rootY: 0.02,
          rootZ: 0.08,
          ...solveLegs(0.02, 0.2, -0.3),
          headF: -0.3,
        },
      };
    case 'grab':
      return {
        windup: { lShF: 0.9, lEl: 1.4, rShF: 0.9, rEl: 1.4, spineF: 0.05, lHand: 1, rHand: 1 },
        strike: {
          lShF: 1.5,
          lShO: -0.15,
          lEl: 0.25,
          rShF: 1.5,
          rShO: -0.15,
          rEl: 0.25,
          lHand: 1,
          rHand: 1,
          spineF: 0.28,
          hipsT: -0.1,
          rootZ: 0.1,
          headT: 0.2,
        },
      };
    case 'airPunch':
      return {
        windup: { lShF: 0.9, lEl: 2 },
        strike: { lShF: 1.25, lShO: -0.1, lEl: 0.05, spineT: -0.3, spineF: 0.2 },
      };
    case 'airKick':
      return {
        windup: { lThF: 1.4, lKn: 1.9 },
        strike: {
          lThF: 1.15,
          lKn: 0.05,
          lAnk: 0.3,
          rThF: 0.6,
          rKn: 1.7,
          spineF: -0.2,
          lShF: 0.4,
          lShO: 0.5,
          rShF: 1.2,
          rEl: 1.8,
        },
      };
    default:
      return { windup: {}, strike: {} };
  }
}

export function attackPose(f: FighterState, t: number): Pose {
  const atk = f.attack;
  if (!atk) return idlePose(t, f.char.id);
  const { def, frame } = atk;
  const base = def.air
    ? jumpPose(f.vy, t, f.char.id)
    : def.crouching || def.id === 'landing'
      ? crouchPose(t, f.char.id, false)
      : idlePose(t, f.char.id);

  const pair = attackPair(def.id, f.char.id);
  const wind = withPose(base, pair.windup);
  const strike = withPose(base, pair.strike);

  if (frame <= def.startup) {
    const p = frame / Math.max(1, def.startup);
    return p < 0.6 ? lerpPose(base, wind, easeOut(p / 0.6)) : lerpPose(wind, strike, easeOut((p - 0.6) / 0.4));
  }
  if (frame <= def.startup + def.active) return strike;
  return lerpPose(strike, base, smoothstep((frame - def.startup - def.active) / Math.max(1, def.recovery)));
}

export function hitstunPose(f: FighterState, t: number): Pose {
  const base = idlePose(t, f.char.id);
  const enter = clamp01(f.stateFrames / 4);
  const decay = clamp01((f.stateFrames - 4) / Math.max(1, f.stun + f.stateFrames - 4));
  const wobble = Math.sin(f.stateFrames * 0.9) * Math.exp(-f.stateFrames * 0.18) * 0.25;
  const weight = (1 - decay * 0.75) * easeOut(enter);
  const isLow = f.lastHitHeight === 'low';
  const isHigh = f.lastHitHeight === 'high';
  const y = isLow ? -0.18 : -0.1;
  const target = withPose(base, {
    spineF: isLow ? 0.55 : isHigh ? -0.5 : -0.3,
    spineT: base.spineT + (isHigh ? 0.25 : 0.1),
    chestF: isLow ? 0.2 : -0.2,
    headF: isLow ? 0.45 : isHigh ? -0.7 : -0.45,
    headT: base.headT + (isHigh ? 0.35 : 0.15),
    headS: 0.25 + wobble,
    lShF: 0.45,
    lShO: 0.55,
    lEl: 0.75,
    rShF: 0.25,
    rShO: 0.7,
    rEl: 0.55,
    rootY: y,
    ...solveLegs(y, 0.16, -0.34),
    lHand: 1,
    rHand: 1,
  });
  const res = lerpPose(base, target, weight);
  res.spineS += wobble * 0.4;
  return res;
}

export function flatDownPose(t: number, tremor = 0): Pose {
  return withPose(zeroPose(), {
    rootY: -(LEG_LEN - 0.13),
    hipsF: -Math.PI / 2,
    spineF: 0.04,
    headF: -0.15 + Math.sin(t * 30) * tremor,
    headT: 0.5,
    lShF: 0.3,
    lShO: 1.1,
    lEl: 0.4,
    lHand: 1,
    rShF: 0.5,
    rShO: 1.0,
    rEl: 0.7,
    rHand: 1,
    lThF: 0.15,
    lThO: 0.15,
    lKn: 0.2,
    lAnk: 0.4,
    rThF: 0.35,
    rThO: 0.1,
    rKn: 0.7,
    rAnk: 0.4,
  });
}

export function knockdownPose(f: FighterState, t: number): Pose {
  const falling = withPose(zeroPose(), {
    rootY: -0.1,
    hipsF: -0.4 - clamp01(f.stateFrames / 20),
    spineF: -0.3,
    headF: -0.5,
    lShF: 2.2,
    lShO: 0.7,
    lEl: 0.5,
    lHand: 1,
    rShF: 2.0,
    rShO: 0.8,
    rEl: 0.6,
    rHand: 1,
    lThF: 0.7,
    lKn: 0.9,
    rThF: 0.4,
    rKn: 0.6,
  });
  if (!f.grounded) return falling;
  return lerpPose(falling, flatDownPose(t), easeOut(clamp01(f.downFrames / 8)));
}

export function getupPose(f: FighterState, t: number): Pose {
  const n = f.stateFrames / 24;
  const mid = withPose(crouchPose(t, f.char.id, true), {
    rootY: -0.6,
    hipsF: -0.4,
    spineF: 0.8,
  });
  return n < 0.5
    ? lerpPose(flatDownPose(t), mid, smoothstep(n / 0.5))
    : lerpPose(mid, idlePose(t, f.char.id), smoothstep((n - 0.5) / 0.5));
}

export function panicPose(t: number, id: FighterId): Pose {
  return withPose(idlePose(t, id), {
    rootY: -0.1,
    spineF: -0.2,
    headF: -0.35,
    lShF: 0.8,
    lShO: 0.7,
    lEl: 1.3,
    lHand: 1,
    rShF: 0.9,
    rShO: 0.6,
    rEl: 1.4,
    rHand: 1,
  });
}

export function introPose(t: number, id: FighterId): Pose {
  const base = idlePose(t, id);
  if (id === 'modi') {
    const wave = Math.sin(t * 2) * 0.08;
    return withPose(base, {
      rootY: 0,
      ...solveLegs(0, 0.1, -0.1),
      hipsT: 0,
      spineT: 0,
      spineF: -0.05,
      headT: 0.6,
      headF: -0.1,
      lShF: 0.5 + wave,
      lShO: 1.0,
      lShT: 0.6,
      lEl: 0.5,
      lHand: 1,
      rShF: 0.5 - wave,
      rShO: 1.0,
      rShT: 0.6,
      rEl: 0.5,
      rHand: 1,
    });
  }
  if (id === 'didi') {
    const wave = Math.sin(t * 9) * 0.22;
    return withPose(base, {
      rootY: 0,
      ...solveLegs(0, 0.1, -0.12),
      hipsT: 0.1,
      headT: 0.45,
      headF: -0.18,
      headS: wave * 0.25,
      rShF: 1.45,
      rShO: 0.05,
      rShT: wave,
      rEl: 0.55,
      rHand: 0.35,
      lShF: -0.15,
      lShO: 0.55,
      lEl: 1.75,
    });
  }
  if (id === 'trump') {
    const sway = Math.sin(t * 3.2);
    return withPose(base, {
      rootY: 0,
      ...solveLegs(0, 0.12, -0.12),
      hipsT: 0,
      spineT: 0.05,
      spineF: -0.06,
      headT: 0.55,
      headF: -0.22 + Math.abs(sway) * 0.05,
      headS: sway * 0.06,
      lShF: 1.05,
      lShO: 0.25 + sway * 0.22,
      lEl: 1.1,
      rShF: 1.05,
      rShO: 0.25 + sway * 0.22,
      rEl: 1.1,
      lHand: 1,
      rHand: 1,
    });
  }
  return withPose(base, {
    rootY: 0,
    ...solveLegs(0, 0.12, -0.12),
    hipsT: 0,
    spineT: 0.1,
    headT: 0.6,
    rShF: 1.3,
    rShO: 0.3,
    rEl: 1.4,
    rHand: 1,
  });
}

export function victoryDancePose(elapsed: number, id: FighterId): Pose {
  const beat = (elapsed * 132) / 60;
  const side = Math.floor(beat) % 2 === 0 ? 1 : -1;
  const frac = beat % 1;
  const pulse = Math.sin(frac * Math.PI);
  const y = -0.08 + pulse * 0.06;
  const base = withPose(idlePose(elapsed, id), {
    hipsT: side * 0.16,
    spineT: -side * 0.1,
    headT: 0.58,
    headF: -0.1,
  });

  if (id === 'modi' || id === 'didi') {
    const mod = beat % 4;
    const spin = mod >= 2 ? smoothstep((mod - 2) / 2) * Math.PI * 2 : 0;
    const arm = Math.sin(beat * Math.PI) * 0.35;
    return withPose(base, {
      rootY: y,
      ...solveLegs(y, 0.12, -0.12),
      hipsT: spin,
      spineS: side * 0.08,
      lShF: 2.4 + arm,
      lShO: 0.35 + arm * 0.5,
      lEl: 0.5,
      lHand: 1,
      rShF: 2.4 - arm,
      rShO: 0.35 - arm * 0.5,
      rEl: 0.5,
      rHand: 1,
    });
  }

  // Bhangra / energetic pump dance
  const legLift = pulse * 0.75;
  return withPose(base, {
    rootY: y,
    ...solveLegs(y, 0.08, -0.08),
    ...(side > 0
      ? { lThF: 0.3 + legLift, lKn: 0.4 + legLift * 1.2 }
      : { rThF: 0.3 + legLift, rKn: 0.4 + legLift * 1.2 }),
    spineF: -0.1 + pulse * 0.06,
    lShF: 2.5 + (side > 0 ? pulse * 0.3 : 0),
    lShO: 0.55,
    lEl: 0.35,
    rShF: 2.5 + (side < 0 ? pulse * 0.3 : 0),
    rShO: 0.55,
    rEl: 0.35,
  });
}

export function poseForFighter(
  f: FighterState,
  time: number,
  threatened: boolean
): Pose {
  const t = time + f.side * 0.7;
  const id = f.char.id;
  switch (f.state) {
    case 'idle':
      return f.holdingBack && threatened ? guardPose(t, id) : idlePose(t, id);
    case 'walk':
      return f.holdingBack && threatened ? guardPose(t, id) : walkPose(t, f.walkDistance, f.moveRel, id);
    case 'crouch':
      return crouchPose(t, id, f.holdingBack);
    case 'jump':
      return f.attack && f.attackPhase !== 'recovery' ? attackPose(f, t) : jumpPose(f.vy, t, id);
    case 'attack':
      return f.attack ? attackPose(f, t) : idlePose(t, id);
    case 'hitstun':
      return hitstunPose(f, t);
    case 'blockstun':
      return f.crouching ? crouchPose(t, id, true) : guardPose(t, id);
    case 'knockdown':
    case 'ko':
      return knockdownPose(f, t);
    case 'getup':
      return getupPose(f, t);
    case 'victory':
      return victoryDancePose(f.stateFrames / 60, id);
    case 'intro':
      return introPose(t, id);
    case 'frozen':
      return panicPose(t, id);
    case 'super':
    default:
      return idlePose(t, id);
  }
}
