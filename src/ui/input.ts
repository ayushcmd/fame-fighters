import type { InputState } from '../types.ts';

export class InputManager {
  private readonly keys = new Set<string>();
  private touchMoveX: -1 | 0 | 1 = 0;
  private touchUp = false;
  private touchDown = false;
  private readonly touchButtons = new Set<string>();
  private budgetRequested = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
        }
      }
      this.keys.add(e.code);
      if (e.code === 'KeyB') this.budgetRequested = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touchButtons.clear();
      this.touchMoveX = 0;
      this.touchUp = false;
      this.touchDown = false;
    });

    this.bindTouch();
  }

  private bindTouch(): void {
    const touchEl = document.getElementById('touch');
    if (!touchEl) return;

    touchEl.querySelectorAll<HTMLElement>('[data-btn]').forEach((btn) => {
      const name = btn.dataset.btn!;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.touchButtons.add(name);
      });
      const up = () => this.touchButtons.delete(name);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    });

    const stick = touchEl.querySelector<HTMLElement>('.stick');
    const knob = touchEl.querySelector<HTMLElement>('.stick-knob');
    if (stick && knob) {
      let ptrId: number | null = null;
      const updateStick = (clientX: number, clientY: number) => {
        const r = stick.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const maxR = r.width * 0.38;
        const dist = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(dist, maxR);
        const nx = (dx / dist) * clamped;
        const ny = (dy / dist) * clamped;
        knob.style.transform = `translate(${nx}px, ${ny}px)`;
        this.touchMoveX = dx < -14 ? -1 : dx > 14 ? 1 : 0;
        this.touchUp = dy < -20;
        this.touchDown = dy > 20;
      };
      stick.addEventListener('pointerdown', (e) => {
        ptrId = e.pointerId;
        stick.setPointerCapture(ptrId);
        updateStick(e.clientX, e.clientY);
      });
      stick.addEventListener('pointermove', (e) => {
        if (e.pointerId === ptrId) updateStick(e.clientX, e.clientY);
      });
      const resetStick = () => {
        ptrId = null;
        knob.style.transform = '';
        this.touchMoveX = 0;
        this.touchUp = false;
        this.touchDown = false;
      };
      stick.addEventListener('pointerup', resetStick);
      stick.addEventListener('pointercancel', resetStick);
    }
  }

  consumeBudgetRequest(): boolean {
    const req = this.budgetRequested;
    this.budgetRequested = false;
    return req;
  }

  triggerBudget(): void {
    this.budgetRequested = true;
  }

  readP1(allowArrowsForP1 = true): InputState {
    const left =
      this.keys.has('KeyA') ||
      (allowArrowsForP1 && this.keys.has('ArrowLeft')) ||
      this.touchMoveX === -1;
    const right =
      this.keys.has('KeyD') ||
      (allowArrowsForP1 && this.keys.has('ArrowRight')) ||
      this.touchMoveX === 1;
    const up =
      this.keys.has('KeyW') ||
      (allowArrowsForP1 && this.keys.has('ArrowUp')) ||
      this.touchUp;
    const down =
      this.keys.has('KeyS') ||
      (allowArrowsForP1 && this.keys.has('ArrowDown')) ||
      this.touchDown;

    return {
      moveX: left && !right ? -1 : right && !left ? 1 : 0,
      up,
      down,
      punch: this.keys.has('KeyJ') || this.keys.has('KeyZ') || this.touchButtons.has('punch'),
      kick: this.keys.has('KeyK') || this.keys.has('KeyX') || this.touchButtons.has('kick'),
      grab:
        this.keys.has('KeyI') ||
        this.keys.has('KeyV') ||
        this.touchButtons.has('grab'),
      super:
        this.keys.has('KeyL') ||
        this.keys.has('Space') ||
        this.keys.has('KeyC') ||
        this.touchButtons.has('super'),
    };
  }

  readP2Local(): InputState {
    const left = this.keys.has('ArrowLeft');
    const right = this.keys.has('ArrowRight');
    return {
      moveX: left && !right ? -1 : right && !left ? 1 : 0,
      up: this.keys.has('ArrowUp'),
      down: this.keys.has('ArrowDown'),
      punch: this.keys.has('Numpad1') || this.keys.has('BracketLeft'),
      kick: this.keys.has('Numpad2') || this.keys.has('BracketRight'),
      grab: this.keys.has('Numpad3') || this.keys.has('Backslash'),
      super: this.keys.has('Numpad0') || this.keys.has('Enter'),
    };
  }
}
