import * as THREE from 'three';
import { getFighterPortraitUrl } from '../render/portraits.ts';
import type { FighterState } from '../combat/fighterState.ts';

interface PopupItem {
  el: HTMLDivElement;
  world: THREE.Vector3;
  age: number;
  life: number;
  rise: number;
}

export class HudController {
  private readonly hudEl = document.getElementById('hud')!;
  private readonly p1Img = document.querySelector<HTMLImageElement>('#hud .side.left .portrait')!;
  private readonly p2Img = document.querySelector<HTMLImageElement>('#hud .side.right .portrait')!;
  private readonly p1Name = document.querySelector<HTMLElement>('#hud .side.left .name')!;
  private readonly p2Name = document.querySelector<HTMLElement>('#hud .side.right .name')!;
  private readonly p1HpFill = document.querySelector<HTMLElement>('#hud .side.left .hp-fill')!;
  private readonly p2HpFill = document.querySelector<HTMLElement>('#hud .side.right .hp-fill')!;
  private readonly p1HpTrail = document.querySelector<HTMLElement>('#hud .side.left .hp-trail')!;
  private readonly p2HpTrail = document.querySelector<HTMLElement>('#hud .side.right .hp-trail')!;
  private readonly p1Wins = document.querySelectorAll<HTMLElement>('#hud .side.left .win');
  private readonly p2Wins = document.querySelectorAll<HTMLElement>('#hud .side.right .win');
  private readonly p1Meter = document.querySelector<HTMLElement>('#hud .meter.left .meter-fill')!;
  private readonly p2Meter = document.querySelector<HTMLElement>('#hud .meter.right .meter-fill')!;
  private readonly p1Combo = document.querySelector<HTMLElement>('#hud .combo.left')!;
  private readonly p2Combo = document.querySelector<HTMLElement>('#hud .combo.right')!;
  private readonly timerEl = document.getElementById('timer')!;
  private readonly announceEl = document.getElementById('announce')!;
  private readonly superBannerEl = document.getElementById('super-banner')!;
  private readonly popupsEl = document.getElementById('popups')!;
  private readonly flashEl = document.getElementById('flash')!;
  private readonly vignetteEl = document.getElementById('vignette')!;
  private readonly cinemaEl = document.getElementById('cinema')!;
  private readonly budgetBtn = document.getElementById('budget-meter')!;
  private readonly budgetFill = document.querySelector<HTMLElement>('#budget-meter .track i')!;

  private p1Trail = 100;
  private p2Trail = 100;
  private readonly items: PopupItem[] = [];
  private flashTimer = 0;
  private readonly projTmp = new THREE.Vector3();

  show(visible: boolean): void {
    this.hudEl.classList.toggle('hidden', !visible);
  }

  setupMatch(p1: FighterState, p2: FighterState): void {
    this.p1Img.src = getFighterPortraitUrl(p1.char.id);
    this.p2Img.src = getFighterPortraitUrl(p2.char.id);
    this.p1Name.textContent = p1.char.name;
    this.p2Name.textContent = p2.isBoss ? `${p2.char.name} · BOSS` : p2.char.name;
    this.p1Trail = 100;
    this.p2Trail = 100;
    this.clearPopups();
  }

  update(
    p1: FighterState,
    p2: FighterState,
    wins: [number, number],
    timeRemaining: number,
    budgetRatio: number,
    showBudget: boolean,
    dt: number,
    camera: THREE.Camera
  ): void {
    const p1Pct = Math.max(0, Math.min(100, (p1.hp / p1.maxHp) * 100));
    const p2Pct = Math.max(0, Math.min(100, (p2.hp / p2.maxHp) * 100));

    this.p1Trail += (p1Pct - this.p1Trail) * Math.min(1, dt * 3.5);
    this.p2Trail += (p2Pct - this.p2Trail) * Math.min(1, dt * 3.5);

    this.p1HpFill.style.width = `${p1Pct}%`;
    this.p2HpFill.style.width = `${p2Pct}%`;
    this.p1HpTrail.style.width = `${Math.max(p1Pct, this.p1Trail)}%`;
    this.p2HpTrail.style.width = `${Math.max(p2Pct, this.p2Trail)}%`;

    this.p1HpFill.classList.toggle('low', p1Pct <= 25);
    this.p2HpFill.classList.toggle('low', p2Pct <= 25);

    this.p1Meter.style.width = `${p1.meter}%`;
    this.p2Meter.style.width = `${p2.meter}%`;
    this.p1Meter.parentElement?.parentElement?.classList.toggle('ready', p1.meter >= 100);
    this.p2Meter.parentElement?.parentElement?.classList.toggle('ready', p2.meter >= 100);

    this.p1Wins.forEach((w, i) => w.classList.toggle('on', i < wins[0]));
    this.p2Wins.forEach((w, i) => w.classList.toggle('on', i < wins[1]));

    const sec = Math.ceil(timeRemaining);
    this.timerEl.textContent = String(sec);
    this.timerEl.classList.toggle('low', sec <= 10);

    // Note: p2.comboHits counts hits suffered by p2 -> p1's combo!
    this.p1Combo.innerHTML = p2.comboHits >= 2 ? `<b>${p2.comboHits}</b> HIT!` : '';
    this.p1Combo.classList.toggle('show', p2.comboHits >= 2);
    this.p2Combo.innerHTML = p1.comboHits >= 2 ? `<b>${p1.comboHits}</b> HIT!` : '';
    this.p2Combo.classList.toggle('show', p1.comboHits >= 2);

    // Budget Meter
    this.budgetBtn.classList.toggle('show', showBudget);
    this.budgetBtn.classList.toggle('ready', showBudget && budgetRatio >= 1);
    this.budgetFill.style.width = `${Math.round(Math.min(1, budgetRatio) * 100)}%`;

    const touchBudget = document.getElementById('touch-budget');
    if (touchBudget) {
      touchBudget.classList.toggle('ready', showBudget && budgetRatio >= 1);
    }

    // Danger vignette on low HP
    const danger = p1Pct > 0 && p1Pct <= 25 ? (25 - p1Pct) / 25 : 0;
    this.vignetteEl.style.opacity = danger > 0 ? String((0.35 + Math.sin(performance.now() * 0.01) * 0.15) * danger) : '0';

    if (this.flashTimer > 0) {
      this.flashTimer -= dt * 1000;
      if (this.flashTimer <= 0) this.flashEl.style.opacity = '0';
    }

    this.updatePopups(dt, camera);
  }

  announce(text: string, sub?: string): void {
    this.announceEl.innerHTML = sub
      ? `<div class="ann-main">${text}</div><div class="ann-sub">${sub}</div>`
      : text;
    this.announceEl.classList.remove('show');
    void this.announceEl.offsetWidth;
    this.announceEl.classList.add('show');
  }

  hideAnnounce(): void {
    this.announceEl.classList.remove('show');
  }

  showSuperBanner(text: string): void {
    this.superBannerEl.textContent = text;
    this.superBannerEl.classList.add('show');
    this.cinemaEl.classList.add('on');
  }

  hideSuperBanner(): void {
    this.superBannerEl.classList.remove('show');
    this.cinemaEl.classList.remove('on');
  }

  flash(color: string, ms = 180): void {
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = '1';
    this.flashTimer = ms;
  }

  popup(text: string, worldPos: THREE.Vector3, color = '#ffd23f'): void {
    const el = document.createElement('div');
    el.className = 'popup';
    el.textContent = text;
    el.style.color = color;
    this.popupsEl.appendChild(el);
    this.items.push({ el, world: worldPos.clone(), age: 0, life: 1.05, rise: 0.7 });
  }

  speech(who: FighterState, text: string): void {
    const el = document.createElement('div');
    el.className = 'speech';
    el.textContent = text;
    el.style.borderColor = who.char.color;
    this.popupsEl.appendChild(el);
    this.items.push({
      el,
      world: new THREE.Vector3(who.x, who.y + 2.05, 0.2),
      age: 0,
      life: 1.65,
      rise: 0.25,
    });
  }

  clearPopups(): void {
    this.items.forEach((it) => it.el.remove());
    this.items.length = 0;
  }

  private updatePopups(dt: number, camera: THREE.Camera): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      if (it.age >= it.life) {
        it.el.remove();
        this.items.splice(i, 1);
        continue;
      }
      it.world.y += it.rise * dt;
      this.projTmp.copy(it.world).project(camera);
      const sx = (this.projTmp.x * 0.5 + 0.5) * w;
      const sy = (-this.projTmp.y * 0.5 + 0.5) * h;
      const fade = Math.min(1, (it.life - it.age) * 3);
      it.el.style.left = `${sx}px`;
      it.el.style.top = `${sy}px`;
      it.el.style.opacity = String(fade);
    }
  }
}
