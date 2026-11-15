import {
  CHIP_DAMAGE_RATIO,
  COUNTER_HIT_MULT,
  CROUCH_HEIGHT_SCALE,
  HURT_HEIGHT,
  HURT_RADII,
  MIN_PUSH_DIST,
  STAGE_HALF,
  getMoveReach,
} from '../data/moves.ts';
import type { HitHeight, HitResult } from '../types.ts';
import type { FighterState } from './fighterState.ts';

const COMBO_SCALING = [1, 0.9, 0.78, 0.66, 0.54, 0.44];
const MIN_COMBO_SCALE = 0.35;

export function getAttackHeight(attacker: FighterState): HitHeight | null {
  if (!attacker.attack) return null;
  return attacker.attack.def.air ? 'mid' : attacker.attack.def.height;
}

export function getHurtHeight(fighter: FighterState): number {
  return HURT_HEIGHT * (fighter.char.modelHeight || 1) * (fighter.crouching ? CROUCH_HEIGHT_SCALE : 1);
}

function hurtRadiusAtY(fighter: FighterState, localY: number): number | null {
  const h = getHurtHeight(fighter);
  if (localY < -0.1 || localY > h + 0.1) return null;
  const r = localY / h;
  if (r < 0.48) return HURT_RADII.legs;
  if (r < 0.8) return HURT_RADII.torso;
  return HURT_RADII.head;
}

export function findHitPoint(
  attacker: FighterState,
  defender: FighterState
): { x: number; y: number } | null {
  const atk = attacker.attack;
  if (!atk) return null;

  const dxFacing = (defender.x - attacker.x) * attacker.facing;
  if (dxFacing < -0.15) return null;

  if (atk.def.grab) {
    return dxFacing <= 1.05
      ? { x: defender.x - attacker.facing * HURT_RADII.torso, y: 1.2 }
      : null;
  }

  const spec = getMoveReach(attacker.char.id, atk.def.id);
  if (spec.reach <= 0) return null;

  const isAirCheck = Boolean(atk.def.air) || defender.y > 0.25;
  const localY = atk.def.air
    ? attacker.y + spec.height - defender.y
    : isAirCheck
      ? spec.height - defender.y
      : Math.min(spec.height, getHurtHeight(defender) * 0.6);

  const radius = hurtRadiusAtY(defender, localY);
  if (radius === null || dxFacing - radius > spec.reach + 0.1) return null;

  return {
    x: defender.x - attacker.facing * Math.max(0, radius - 0.05),
    y: defender.y + Math.min(Math.max(localY, 0.2), getHurtHeight(defender) - 0.1),
  };
}

export function canStrikeHit(attacker: FighterState, defender: FighterState): { x: number; y: number } | null {
  const atk = attacker.attack;
  if (!atk || atk.hasHit || !attacker.isAttackActive || defender.invulnerable) return null;
  if (atk.def.grab && (defender.state === 'hitstun' || defender.airborne || defender.y > 0.01)) {
    return null;
  }

  const hitHeight = getAttackHeight(attacker);
  if (!hitHeight) return null;
  if (defender.y > 0.25 && hitHeight === 'low') return null;
  if (defender.isLow && hitHeight === 'high') return null;

  return findHitPoint(attacker, defender);
}

export function isDefenderBlocking(defender: FighterState, attackHeight: HitHeight): boolean {
  if (!defender.canBlock || !defender.holdingBack || defender.airborne) return false;
  if (defender.crouching) return attackHeight === 'low' || attackHeight === 'mid';
  return attackHeight === 'high' || attackHeight === 'mid';
}

export function computeDamage(
  attacker: FighterState,
  defender: FighterState,
  baseDamage: number
): number {
  const bossScale = defender.isBoss ? 0.8 : 1;
  const comboScale = COMBO_SCALING[defender.comboHits] ?? MIN_COMBO_SCALE;
  return Math.max(1, Math.round(baseDamage * attacker.char.damageMul * attacker.power * comboScale * bossScale));
}

export function resolveHit(attacker: FighterState, defender: FighterState): HitResult | null {
  const pos = canStrikeHit(attacker, defender);
  if (!pos || !attacker.attack) return null;

  const atk = attacker.attack;
  atk.hasHit = true;
  const dir = attacker.facing;
  const height = getAttackHeight(attacker) ?? 'mid';
  const blocked = !atk.def.grab && isDefenderBlocking(defender, height);

  if (atk.def.grab) {
    return {
      attackerSide: attacker.side,
      defenderSide: defender.side,
      moveId: atk.def.id,
      blocked: false,
      counter: false,
      damage: atk.def.damage,
      pos,
      knockdown: true,
      isGrab: true,
    };
  }

  if (blocked) {
    const chip = Math.max(1, Math.round(atk.def.damage * CHIP_DAMAGE_RATIO));
    defender.hp = Math.max(1, defender.hp - chip);
    defender.stun = atk.def.blockstun;
    defender.vx = dir * atk.def.push * 0.85;
    defender.forceState('blockstun');
    attacker.addMeter(3);
    defender.addMeter(2);
    return {
      attackerSide: attacker.side,
      defenderSide: defender.side,
      moveId: atk.def.id,
      blocked: true,
      counter: false,
      damage: chip,
      pos,
      knockdown: false,
      isGrab: false,
    };
  }

  const counter = defender.state === 'attack' && defender.attackPhase === 'startup';
  const raw = computeDamage(attacker, defender, atk.def.damage);
  const damage = counter ? Math.round(raw * COUNTER_HIT_MULT) : raw;

  defender.hp = Math.max(0, defender.hp - damage);
  defender.noDamageTimer = 0;
  defender.lastHitHeight = height;
  defender.attack = null;

  defender.comboHits++;
  defender.comboTimer = 46;

  attacker.addMeter(damage * 0.9 + 2);
  defender.addMeter(damage * 0.6);

  if (defender.hp <= 0) {
    defender.knockOut(dir, Math.max(2.6, atk.def.push * 0.9), Math.max(5.5, atk.def.launch || 6.0));
  } else if (atk.def.knockdown || defender.airborne) {
    defender.vx = dir * Math.max(1.8, atk.def.push * 0.75);
    defender.vy = Math.max(3.6, atk.def.launch || 4.8);
    defender.grounded = false;
    defender.downFrames = 0;
    defender.forceState('knockdown');
  } else {
    defender.stun = atk.def.hitstun + (counter ? 3 : 0);
    defender.vx = dir * atk.def.push;
    defender.forceState('hitstun');
  }

  return {
    attackerSide: attacker.side,
    defenderSide: defender.side,
    moveId: atk.def.id,
    blocked: false,
    counter,
    damage,
    pos,
    knockdown: atk.def.knockdown || defender.hp <= 0,
    isGrab: false,
  };
}

export function resolvePushbox(a: FighterState, b: FighterState): void {
  if (a.state === 'frozen' || b.state === 'frozen' || a.y > 1 || b.y > 1) return;
  const dist = b.x - a.x;
  const abs = Math.abs(dist);
  if (abs >= MIN_PUSH_DIST) return;
  const push = (MIN_PUSH_DIST - abs) * 0.5;
  const sign = dist === 0 ? (a.side === 0 ? 1 : -1) : Math.sign(dist);
  a.x = Math.max(-STAGE_HALF, Math.min(STAGE_HALF, a.x - sign * push));
  b.x = Math.max(-STAGE_HALF, Math.min(STAGE_HALF, b.x + sign * push));
}
