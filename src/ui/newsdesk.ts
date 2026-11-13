import { ANCHORS, NEWS_TICKERS, generateNewsEvent } from '../data/dialogue.ts';
import { getAnchorPortraitUrl } from '../render/portraits.ts';
import type { FighterId, MoveId } from '../types.ts';

export class NewsdeskController {
  private readonly godiImg = document.querySelector<HTMLImageElement>('#newsdesk .anchor.godi img')!;
  private readonly trollImg = document.querySelector<HTMLImageElement>('#newsdesk .anchor.troll img')!;
  private readonly godiCh = document.querySelector<HTMLElement>('#newsdesk .anchor.godi .channel')!;
  private readonly godiWho = document.querySelector<HTMLElement>('#newsdesk .anchor.godi .who')!;
  private readonly godiLine = document.querySelector<HTMLElement>('#newsdesk .anchor.godi .line')!;
  private readonly trollCh = document.querySelector<HTMLElement>('#newsdesk .anchor.troll .channel')!;
  private readonly trollWho = document.querySelector<HTMLElement>('#newsdesk .anchor.troll .who')!;
  private readonly trollLine = document.querySelector<HTMLElement>('#newsdesk .anchor.troll .line')!;
  private readonly tickerTrack = document.querySelector<HTMLElement>('#newsdesk .ticker-track')!;
  private idleCooldown = 0;

  constructor() {
    this.godiImg.src = getAnchorPortraitUrl('godi');
    this.trollImg.src = getAnchorPortraitUrl('troll');
    this.godiCh.textContent = ANCHORS.godi.channel;
    this.godiWho.textContent = ANCHORS.godi.name;
    this.trollCh.textContent = ANCHORS.troll.channel;
    this.trollWho.textContent = ANCHORS.troll.name;
    this.resetTicker();
  }

  resetTicker(): void {
    const items = NEWS_TICKERS.map((t) => `<span class="tick">${t}</span>`).join(' &nbsp; • &nbsp; ');
    this.tickerTrack.innerHTML = `${items} &nbsp; • &nbsp; ${items}`;
    this.godiLine.textContent = ANCHORS.godi.lines[0];
    this.trollLine.textContent = ANCHORS.troll.lines[0];
  }

  reportEvent(
    eventType: 'hit' | 'super' | 'combo' | 'ko' | 'cow' | 'chai' | 'bomb' | 'budget',
    attacker: FighterId,
    defender: FighterId,
    extra?: { combo?: number; moveId?: MoveId }
  ): void {
    const lines = generateNewsEvent(eventType, attacker, defender, extra);
    this.godiLine.textContent = lines.godi;
    this.trollLine.textContent = lines.troll;
    this.idleCooldown = 4.5;
  }

  update(dt: number): void {
    this.idleCooldown -= dt;
    if (this.idleCooldown <= 0) {
      this.idleCooldown = 6.5;
      const g = ANCHORS.godi.lines[Math.floor(Math.random() * ANCHORS.godi.lines.length)];
      const t = ANCHORS.troll.lines[Math.floor(Math.random() * ANCHORS.troll.lines.length)];
      this.godiLine.textContent = g;
      this.trollLine.textContent = t;
    }
  }
}
