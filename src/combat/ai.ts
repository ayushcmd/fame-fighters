import type { Difficulty, InputState } from '../types.ts';
import type { FighterState } from './fighterState.ts';

interface AiProfile {
  blockProb: number;
  comboProb: number;
  superProb: number;
  grabProb: number;
  jumpProb: number;
  reactionMin: number;
  reactionMax: number;
  aggression: number;
}

const PROFILES: Record<Difficulty, AiProfile> = {
  easy: {
    blockProb: 0.28,
    comboProb: 0.25,
    superProb: 0.35,
    grabProb: 0.12,
    jumpProb: 0.08,
    reactionMin: 16,
    reactionMax: 28,
    aggression: 0.45,
  },
  normal: {
    blockProb: 0.54,
    comboProb: 0.58,
    superProb: 0.68,
    grabProb: 0.25,
    jumpProb: 0.14,
    reactionMin: 10,
    reactionMax: 18,
    aggression: 0.68,
  },
  hard: {
    blockProb: 0.78,
    comboProb: 0.86,
    superProb: 0.9,
    grabProb: 0.36,
    jumpProb: 0.18,
    reactionMin: 5,
    reactionMax: 12,
    aggression: 0.88,
  },
};

export function emptyInput(): InputState {
  return {
    moveX: 0,
    up: false,
    down: false,
    punch: false,
    kick: false,
    grab: false,
    super: false,
  };
}

export class CpuAI {
  private cooldown = 12;
  private blockFrames = 0;
  private comboStep = 0;
  private strafeDir: -1 | 0 | 1 = 0;
  private strafeTimer = 0;

  reset(): void {
    this.cooldown = 10;
    this.blockFrames = 0;
    this.comboStep = 0;
    this.strafeDir = 0;
    this.strafeTimer = 0;
  }

  think(
    self: FighterState,
    opp: FighterState,
    diff: Difficulty,
    hazards: { cowX?: number; bombX?: number; mithaiX?: number } = {}
  ): InputState {
    const out = emptyInput();
    const p = PROFILES[diff];
    const boss = self.isBoss;
    const dist = Math.abs(opp.x - self.x);
    const toward = (opp.x >= self.x ? 1 : -1) as -1 | 1;
    const away = (-toward) as -1 | 1;

    if (this.cooldown > 0) this.cooldown--;
    if (this.strafeTimer > 0) this.strafeTimer--;

    // Dodge bomb or jump over cow hazard
    if (hazards.bombX !== undefined && Math.abs(self.x - hazards.bombX) < 1.8) {
      out.moveX = self.x >= hazards.bombX ? 1 : -1;
      if (self.grounded && Math.abs(self.x - hazards.bombX) < 1.0) out.up = true;
      return out;
    }

    if (hazards.cowX !== undefined && Math.abs(self.x - hazards.cowX) < 1.4 && self.grounded) {
      out.up = true;
      out.moveX = toward;
      return out;
    }

    // Grab Soan Papdi mithai if nearby
    if (hazards.mithaiX !== undefined && Math.abs(self.x - hazards.mithaiX) < 2.2) {
      out.moveX = hazards.mithaiX >= self.x ? 1 : -1;
      return out;
    }

    // Continue combo chain if already hitting
    if (self.state === 'attack' && self.attack?.hasHit && !self.attack.chained && Math.random() < (boss ? 0.92 : p.comboProb)) {
      if (this.comboStep % 2 === 0) out.punch = true;
      else out.kick = true;
      this.comboStep++;
      return out;
    }

    // Super when meter is full and in range
    if (
      self.meter >= 100 &&
      self.grounded &&
      !self.busy &&
      !opp.invulnerable &&
      dist < 4.5 &&
      Math.random() < (boss ? 0.25 : p.superProb * 0.08)
    ) {
      out.super = true;
      return out;
    }

    // Defensive reaction to opponent attack
    if (opp.state === 'attack' && dist < 2.1 && !self.busy) {
      if (this.blockFrames <= 0 && Math.random() < (boss ? 0.84 : p.blockProb)) {
        this.blockFrames = 14 + Math.floor(Math.random() * 10);
      }
    }

    if (this.blockFrames > 0) {
      this.blockFrames--;
      out.moveX = away;
      if (opp.attack?.def.height === 'low') out.down = true;
      return out;
    }

    if (self.busy) {
      if (self.airborne && dist < 1.5 && Math.random() < 0.2) {
        out.kick = true;
      }
      return out;
    }

    // Spacing & movement
    if (dist > 1.7) {
      out.moveX = toward;
      if (self.grounded && dist < 3.4 && Math.random() < p.jumpProb * 0.12) {
        out.up = true;
      }
      return out;
    }

    // Close combat decisions
    if (this.cooldown <= 0 && !opp.invulnerable) {
      const roll = Math.random();
      if (dist < 0.95 && roll < (boss ? 0.32 : p.grabProb) && opp.grounded) {
        out.grab = true;
      } else if (roll < p.aggression) {
        this.comboStep = 1;
        const atkRoll = Math.random();
        if (atkRoll < 0.34) {
          out.punch = true;
        } else if (atkRoll < 0.62) {
          out.kick = true;
        } else if (atkRoll < 0.8) {
          out.down = true;
          out.kick = true;
        } else {
          out.moveX = toward;
          if (Math.random() < 0.5) out.punch = true;
          else out.kick = true;
        }
      } else {
        this.strafeDir = Math.random() < 0.6 ? away : toward;
        this.strafeTimer = 14;
      }
      const span = p.reactionMax - p.reactionMin;
      this.cooldown = p.reactionMin + Math.floor(Math.random() * Math.max(1, span));
    } else if (this.strafeTimer > 0) {
      out.moveX = this.strafeDir;
    } else if (dist > 1.15) {
      out.moveX = toward;
    }

    return out;
  }
}
