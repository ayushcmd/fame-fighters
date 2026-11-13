import { buildDailyJumla } from '../data/dialogue.ts';
import { FIGHTERS } from '../data/fighters.ts';
import { getFighterPortraitUrl } from '../render/portraits.ts';
import type { FighterId, StageId } from '../types.ts';

export class ResultScreen {
  private readonly el = document.getElementById('result')!;
  private readonly masthead = document.getElementById('paper-masthead')!;
  private readonly date = document.getElementById('paper-date')!;
  private readonly headline = document.getElementById('paper-headline')!;
  private readonly photo = document.getElementById('paper-photo') as HTMLImageElement;
  private readonly caption = document.getElementById('paper-caption')!;
  private readonly sub = document.getElementById('paper-sub')!;
  private readonly excuse = document.getElementById('paper-excuse')!;
  private readonly title = document.getElementById('result-title')!;
  private readonly resSub = document.getElementById('result-sub')!;
  private readonly bapuStats = document.getElementById('bapu-stats')!;

  show(opts: {
    winnerId: FighterId;
    loserId: FighterId;
    stageId: StageId;
    p1Won: boolean;
    perfect: boolean;
    diwali: boolean;
    winsCount: number;
    lossCount: number;
  }): void {
    const edition = buildDailyJumla(
      opts.winnerId,
      opts.loserId,
      opts.stageId,
      opts.perfect,
      opts.p1Won,
      opts.diwali
    );
    const winner = FIGHTERS[opts.winnerId];

    this.masthead.textContent = edition.masthead;
    this.date.textContent = edition.date;
    this.headline.textContent = edition.headline;
    this.photo.src = getFighterPortraitUrl(opts.winnerId);
    this.caption.textContent = edition.caption;
    this.sub.textContent = edition.sub;
    this.excuse.textContent = edition.excuse;

    this.title.textContent = opts.p1Won ? `${winner.name} WINS!` : 'DEFEAT!';
    this.resSub.textContent = `${winner.dance.label} · ${winner.party}`;
    this.bapuStats.textContent = `Session Record: ${opts.winsCount}W - ${opts.lossCount}L`;

    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }
}
