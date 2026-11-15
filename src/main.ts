import './styles/main.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { SoundEngine } from './audio/sound.ts';
import { BattleEngine, type BattleResult } from './battle/engine.ts';
import {
  FIGHTERS,
  PLAYABLE_WITHOUT_BOSS,
  ROSTER_ORDER,
  STAGES,
  STAGE_BG_HINTS,
} from './data/fighters.ts';
import { FightCamera } from './render/camera.ts';
import { getFighterPortraitUrl, populateAllPortraits } from './render/portraits.ts';
import { MultiplayerClient } from './multiplayer/room.ts';
import { HudController } from './ui/hud.ts';
import { InputManager } from './ui/input.ts';
import { NewsdeskController } from './ui/newsdesk.ts';
import { ResultScreen } from './ui/newspaper.ts';
import type { Difficulty, FighterId, StageId } from './types.ts';

type ScreenName = 'loading' | 'title' | 'select' | 'battle' | 'result';

class SansadShowdownApp {
  private readonly canvas = document.getElementById('game') as HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly cam: FightCamera;
  private readonly composer: EffectComposer | null = null;
  private readonly bloomPass: UnrealBloomPass | null = null;

  private readonly audio = new SoundEngine();
  private readonly input = new InputManager();
  private readonly hud = new HudController();
  private readonly news = new NewsdeskController();
  private readonly resultScreen = new ResultScreen();
  private readonly multiplayer = new MultiplayerClient();

  private currentScreen: ScreenName = 'loading';
  private battle: BattleEngine | null = null;
  private local2pMode = false;

  private p1Pick: FighterId = 'modi';
  private p2Pick: FighterId = 'rahul';
  private stagePick: StageId = 'sansad';
  private diffPick: Difficulty = 'normal';
  private pickTurn: 'p1' | 'p2' = 'p1';
  private winsCount = 0;
  private lossCount = 0;
  private screenEnteredTime = performance.now();

  private lastFrameTime = performance.now();

  constructor() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.cam = new FightCamera(w / h);

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      this.renderer = renderer;

      try {
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(this.scene, this.cam.camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.24, 0.35, 0.85);
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
        this.composer = composer;
        this.bloomPass = bloomPass;
      } catch (err) {
        console.warn('Post-processing disabled, falling back to direct WebGL rendering:', err);
      }
    } catch (err) {
      console.error('WebGL initialization failed:', err);
    }

    document.documentElement.classList.add('diwali');
    window.addEventListener('resize', () => this.onResize());

    populateAllPortraits();
    this.bindSoundButton();
    this.bindLegalModal();
    this.bindTitleScreen();
    this.bindSelectScreen();
    this.bindPauseAndResult();
    this.bindOnlineModal();
    this.bindGlobalShortcuts();

    this.runLoadingSequence();
    requestAnimationFrame((t) => this.loop(t));
  }

  private onResize(): void {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.renderer?.setSize(w, h);
    this.composer?.setSize(w, h);
    this.cam.setAspect(w / h);
  }

  private showScreen(name: ScreenName): void {
    this.currentScreen = name;
    this.screenEnteredTime = performance.now();
    document.getElementById('loading')?.classList.toggle('hidden', name !== 'loading');
    document.getElementById('title')?.classList.toggle('hidden', name !== 'title');
    document.getElementById('select')?.classList.toggle('hidden', name !== 'select');
    if (name !== 'result') this.resultScreen.hide();
    if (name !== 'battle') {
      document.getElementById('pause')?.classList.add('hidden');
      this.hud.show(false);
    }
  }

  private runLoadingSequence(): void {
    this.showScreen('loading');
    const fill = document.getElementById('load-fill');
    let pct = 0;

    // Spin up attract demo fight behind menu
    this.startAttractScene();

    const step = () => {
      pct = Math.min(100, pct + 18 + Math.random() * 14);
      if (fill) fill.style.width = `${Math.round(pct)}%`;
      if (pct < 100) {
        window.setTimeout(step, 55);
      } else {
        window.setTimeout(() => {
          this.showScreen('title');
        }, 180);
      }
    };
    window.setTimeout(step, 40);
  }

  private startAttractScene(): void {
    this.battle?.dispose();
    this.battle = new BattleEngine(
      this.scene,
      this.cam,
      this.audio,
      this.hud,
      this.news,
      this.input,
      {
        p1Id: this.p1Pick,
        p2Id: this.p2Pick,
        stageId: this.stagePick,
        diff: 'normal',
        attractMode: true,
      }
    );
  }

  private bindSoundButton(): void {
    const btn = document.getElementById('sound-btn');
    const pauseBtn = document.getElementById('pause-sound-btn');
    const sync = () => {
      if (btn) {
        btn.textContent = this.audio.muted ? '🔇' : '🔊';
        btn.classList.toggle('muted', this.audio.muted);
      }
      if (pauseBtn) {
        pauseBtn.textContent = `SOUND: ${this.audio.muted ? 'OFF' : 'ON'}`;
      }
    };
    this.audio.onStateChange = sync;
    sync();

    btn?.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.toggleMute();
    });
    pauseBtn?.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.toggleMute();
    });
  }

  private bindLegalModal(): void {
    const okBtn = document.getElementById('legal-ok');
    const seenKey = 'sansad-showdown:legal-seen-v1';
    try {
      if (localStorage.getItem(seenKey) === '1') {
        document.documentElement.classList.add('legal-accepted');
      }
    } catch {}

    okBtn?.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.uiConfirm();
      document.documentElement.classList.add('legal-accepted');
      try {
        localStorage.setItem(seenKey, '1');
      } catch {}
    });
  }

  private bindTitleScreen(): void {
    const titleEl = document.getElementById('title');
    const enterSelect = () => {
      if (this.currentScreen !== 'title') return;
      this.audio.unlock();
      this.audio.uiConfirm();
      this.audio.setTrack('background');
      this.showScreen('select');
      this.syncSelectUI();
      this.startAttractScene();
    };
    titleEl?.addEventListener('click', enterSelect);
    window.addEventListener('keydown', (e) => {
      const legalVisible = !document.documentElement.classList.contains('legal-accepted');
      if (legalVisible && e.key === 'Enter') {
        document.getElementById('legal-ok')?.click();
        return;
      }
      if (this.currentScreen === 'title' && !legalVisible && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        enterSelect();
      }
    });
  }

  private bindSelectScreen(): void {
    const tiles = document.querySelectorAll<HTMLButtonElement>('#select .tile');
    tiles.forEach((tile) => {
      tile.addEventListener('click', () => {
        this.audio.unlock();
        const key = tile.dataset.tile;
        if (!key) return;
        if (key === 'trailer') {
          this.audio.uiConfirm();
          this.openTrailerPreview();
          return;
        }
        if (key === 'random') {
          this.audio.uiConfirm();
          this.p1Pick = PLAYABLE_WITHOUT_BOSS[Math.floor(Math.random() * PLAYABLE_WITHOUT_BOSS.length)];
          let opp = PLAYABLE_WITHOUT_BOSS[Math.floor(Math.random() * PLAYABLE_WITHOUT_BOSS.length)];
          if (opp === this.p1Pick) opp = PLAYABLE_WITHOUT_BOSS[(PLAYABLE_WITHOUT_BOSS.indexOf(opp) + 1) % PLAYABLE_WITHOUT_BOSS.length];
          this.p2Pick = opp;
          this.syncSelectUI();
          this.startAttractScene();
          return;
        }
        if (key in FIGHTERS) {
          this.audio.uiSelect();
          const fid = key as FighterId;
          if (this.pickTurn === 'p1') {
            this.p1Pick = fid;
            this.pickTurn = 'p2';
          } else {
            this.p2Pick = fid;
            this.pickTurn = 'p1';
          }
          this.syncSelectUI();
          this.startAttractScene();
        }
      });
    });

    // Stage buttons
    document.querySelectorAll<HTMLButtonElement>('#select [data-stage]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.unlock();
        this.audio.uiTap();
        const st = btn.dataset.stage as StageId | undefined;
        if (st && st in STAGES) {
          this.stagePick = st;
          this.syncSelectUI();
          if (this.currentScreen === 'select') this.startAttractScene();
        }
      });
    });

    // Difficulty buttons
    document.querySelectorAll<HTMLButtonElement>('#select [data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.unlock();
        this.audio.uiTap();
        const d = btn.dataset.diff as Difficulty | undefined;
        if (d) {
          this.diffPick = d;
          this.syncSelectUI();
        }
      });
    });

    document.getElementById('plate-p1')?.addEventListener('click', () => {
      this.audio.uiTap();
      this.pickTurn = 'p1';
      this.syncSelectUI();
    });
    document.getElementById('plate-p2')?.addEventListener('click', () => {
      this.audio.uiTap();
      this.pickTurn = 'p2';
      this.syncSelectUI();
    });

    const supSpan = document.querySelector<HTMLElement>('#support-btn span:last-child');
    if (supSpan) supSpan.textContent = 'Diwali pe mithai khilao';
    document.getElementById('support-btn')?.addEventListener('click', () => {
      this.audio.uiTap();
      alert('Satire Tribute Build — Built from scratch with TypeScript & Three.js!');
    });

    document.getElementById('fight-btn')?.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.uiConfirm();
      this.launchMatch();
    });

    // Select screen keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen !== 'select' || performance.now() - this.screenEnteredTime < 350) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = ROSTER_ORDER.indexOf(this.p1Pick);
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        this.p1Pick = ROSTER_ORDER[(idx + dir + ROSTER_ORDER.length) % ROSTER_ORDER.length];
        this.audio.uiSelect();
        this.syncSelectUI();
        this.startAttractScene();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = ROSTER_ORDER.indexOf(this.p2Pick);
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        this.p2Pick = ROSTER_ORDER[(idx + dir + ROSTER_ORDER.length) % ROSTER_ORDER.length];
        this.audio.uiSelect();
        this.syncSelectUI();
        this.startAttractScene();
      } else if (e.key.toLowerCase() === 't') {
        const order: StageId[] = ['sansad', 'jantar', 'road'];
        this.stagePick = order[(order.indexOf(this.stagePick) + 1) % order.length];
        this.audio.uiTap();
        this.syncSelectUI();
        this.startAttractScene();
      } else if (e.key === '1') {
        this.diffPick = 'easy';
        this.syncSelectUI();
      } else if (e.key === '2') {
        this.diffPick = 'normal';
        this.syncSelectUI();
      } else if (e.key === '3') {
        this.diffPick = 'hard';
        this.syncSelectUI();
      } else if (e.key === 'Enter') {
        this.audio.unlock();
        this.audio.uiConfirm();
        this.launchMatch();
      }
    });
  }

  private syncSelectUI(): void {
    const f1 = FIGHTERS[this.p1Pick];
    const f2 = FIGHTERS[this.p2Pick];

    // Mark tiles
    document.querySelectorAll<HTMLButtonElement>('#select .tile').forEach((tile) => {
      const k = tile.dataset.tile;
      tile.classList.remove('locked');
      tile.classList.toggle('p1', k === this.p1Pick);
      tile.classList.toggle('p2', k === this.p2Pick);
    });

    // Update corner plates
    const updatePlate = (id: string, f: typeof f1, badge: string, isTurn: boolean) => {
      const plate = document.getElementById(id);
      if (!plate) return;
      plate.classList.toggle('active', isTurn);
      const tagEl = plate.querySelector<HTMLElement>('.plate-tag');
      if (tagEl) tagEl.textContent = badge;
      const nameEl = plate.querySelector<HTMLElement>('.plate-name');
      if (nameEl) nameEl.textContent = f.name;
      const partyEl = plate.querySelector<HTMLElement>('.plate-party');
      if (partyEl) partyEl.textContent = f.party;
      const supEl = plate.querySelector<HTMLElement>('.plate-super');
      if (supEl) supEl.textContent = `SUPER · ${f.superName}`;
      const descEl = plate.querySelector<HTMLElement>('.plate-desc');
      if (descEl) descEl.textContent = f.superDesc;
    };
    updatePlate('plate-p1', f1, '1P · YOU', this.pickTurn === 'p1');
    updatePlate('plate-p2', f2, this.local2pMode ? '2P · FRIEND' : 'CPU', this.pickTurn === 'p2');

    // Mark stage & difficulty buttons
    document.querySelectorAll<HTMLButtonElement>('#select [data-stage]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.stage === this.stagePick);
    });
    document.querySelectorAll<HTMLButtonElement>('#select [data-diff]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.diff === this.diffPick);
    });

    const stageSub = document.getElementById('stage-sub');
    if (stageSub) stageSub.textContent = STAGE_BG_HINTS[this.stagePick];

    const vsLine = document.getElementById('vs-line');
    if (vsLine) vsLine.textContent = `${f1.name} vs ${f2.name} at ${STAGES[this.stagePick].name}`;

    const prompt = document.getElementById('pick-prompt');
    if (prompt) {
      prompt.textContent = 'PICK YOUR NETA';
    }

    const onlineStatus = document.getElementById('online-status');
    const onlineBar = document.getElementById('online-bar');
    if (onlineBar && onlineStatus) {
      onlineBar.classList.toggle('show', this.local2pMode);
      onlineStatus.textContent = this.local2pMode
        ? 'LOCAL 2P MODE ACTIVE (P1: WASD+JKL · P2: ARROWS+NUMPAD 1/2/3/0)'
        : '';
    }
  }

  private launchMatch(): void {
    this.battle?.dispose();
    this.showScreen('battle');
    this.audio.setTrack('battle');

    this.battle = new BattleEngine(
      this.scene,
      this.cam,
      this.audio,
      this.hud,
      this.news,
      this.input,
      {
        p1Id: this.p1Pick,
        p2Id: this.p2Pick,
        stageId: this.stagePick,
        diff: this.diffPick,
        isBossMatch: this.p2Pick === 'mbapu',
        attractMode: false,
        local2p: this.local2pMode,
      }
    );

    this.battle.onMatchEnd = (res: BattleResult) => {
      if (res.p1Won) this.winsCount++;
      else this.lossCount++;
      this.showScreen('result');
      this.resultScreen.show({
        ...res,
        diwali: this.battle?.arena.diwali ?? true,
        winsCount: this.winsCount,
        lossCount: this.lossCount,
      });
    };
  }

  private bindPauseAndResult(): void {
    const togglePause = () => {
      if (this.currentScreen !== 'battle' || !this.battle) return;
      this.battle.paused = !this.battle.paused;
      document.getElementById('pause')?.classList.toggle('hidden', !this.battle.paused);
      this.audio.uiTap();
    };

    document.getElementById('pause-btn')?.addEventListener('click', togglePause);
    document.getElementById('resume-btn')?.addEventListener('click', togglePause);
    document.getElementById('quit-btn')?.addEventListener('click', () => {
      this.audio.uiBack();
      this.audio.setTrack('background');
      this.showScreen('select');
      this.startAttractScene();
    });

    document.getElementById('budget-meter')?.addEventListener('click', () => {
      this.input.triggerBudget();
    });
    document.getElementById('touch-budget')?.addEventListener('click', () => {
      this.input.triggerBudget();
    });

    document.getElementById('rematch-btn')?.addEventListener('click', () => {
      this.audio.uiConfirm();
      this.launchMatch();
    });
    document.getElementById('select-btn')?.addEventListener('click', () => {
      this.audio.uiBack();
      this.audio.setTrack('background');
      this.showScreen('select');
      this.startAttractScene();
    });
  }

  private bindOnlineModal(): void {
    const onlineEl = document.getElementById('online');
    const hostBtn = document.getElementById('on-host');
    const joinForm = document.getElementById('on-join-form');
    const hostingPanel = document.getElementById('on-hosting');
    const homePanel = document.getElementById('on-home');
    const roomCodeEl = document.getElementById('on-room-code');

    document.getElementById('online-btn')?.addEventListener('click', () => {
      this.audio.uiTap();
      onlineEl?.classList.remove('hidden');
      homePanel?.classList.remove('hidden');
      hostingPanel?.classList.add('hidden');
    });

    document.getElementById('on-back')?.addEventListener('click', () => {
      this.audio.uiBack();
      onlineEl?.classList.add('hidden');
    });

    document.getElementById('online-leave')?.addEventListener('click', () => {
      this.local2pMode = false;
      this.multiplayer.cleanup();
      this.syncSelectUI();
    });

    this.multiplayer.onStateChange = (state, detail) => {
      const waitEl = hostingPanel?.querySelector('.on-wait');
      if (state === 'connected') {
        if (waitEl) waitEl.innerHTML = `<span class="dot" style="background:#22c55e"></span> Opponent Connected via WebRTC! Press FIGHT!`;
        this.audio.uiConfirm();
      } else if (state === 'hosting' && waitEl && detail) {
        waitEl.innerHTML = `<span class="dot"></span> ${detail}`;
      }
    };

    hostBtn?.addEventListener('click', async () => {
      this.audio.uiConfirm();
      homePanel?.classList.add('hidden');
      hostingPanel?.classList.remove('hidden');
      const waitEl = hostingPanel?.querySelector('.on-wait');
      if (waitEl) {
        waitEl.innerHTML = `<span class="dot"></span> Connecting to signaling server...`;
      }
      try {
        const code = await this.multiplayer.host();
        if (roomCodeEl) roomCodeEl.textContent = code;
        if (waitEl) {
          waitEl.innerHTML = `<span class="dot"></span> Online Room <b>${code}</b> created! Waiting for peer...<br/><small style="opacity:0.75">(Or close modal to play Local 2P couch mode)</small>`;
        }
        this.local2pMode = true;
        this.syncSelectUI();
      } catch {
        // Fallback to local 2P
        const code = Math.random().toString(36).slice(2, 6).toUpperCase();
        if (roomCodeEl) roomCodeEl.textContent = code;
        if (waitEl) {
          waitEl.innerHTML = `<span class="dot"></span> Local 2P Couch Mode active! (P1: WASD+JKL, P2: Arrows+Numpad)`;
        }
        this.local2pMode = true;
        this.syncSelectUI();
      }
    });

    joinForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.audio.uiConfirm();
      const codeInput = document.getElementById('on-code') as HTMLInputElement | null;
      const code = codeInput?.value?.trim().toUpperCase();
      if (!code) return;
      try {
        await this.multiplayer.join(code);
        this.local2pMode = true;
        onlineEl?.classList.add('hidden');
        this.syncSelectUI();
      } catch {
        this.local2pMode = true;
        onlineEl?.classList.add('hidden');
        this.syncSelectUI();
      }
    });
  }

  private openTrailerPreview(): void {
    const cinema = document.getElementById('cinema');
    const trlTitle = document.getElementById('trl-title');
    const skip = document.getElementById('cine-skip');
    if (!cinema) return;
    cinema.classList.add('on', 'skippable', 'trailer-on');
    trlTitle?.classList.add('show');
    const close = () => {
      cinema.classList.remove('on', 'skippable', 'trailer-on');
      trlTitle?.classList.remove('show');
      skip?.removeEventListener('click', close);
    };
    skip?.addEventListener('click', close);
    window.setTimeout(close, 3600);
  }

  private bindGlobalShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.currentScreen === 'battle' && this.battle) {
        this.battle.paused = !this.battle.paused;
        document.getElementById('pause')?.classList.toggle('hidden', !this.battle.paused);
      } else if (e.code === 'KeyM') {
        this.audio.toggleMusic();
      } else if (e.code === 'KeyN') {
        this.audio.toggleMute();
      }
    });
  }

  private loop(now: number): void {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    if (this.battle) {
      this.battle.update(dt);
    }

    if (this.composer) {
      this.composer.render();
    } else if (this.renderer) {
      this.renderer.render(this.scene, this.cam.camera);
    }
  }
}

const boot = () => {
  try {
    new SansadShowdownApp();
  } catch (err) {
    console.error('Failed to initialize Sansad Showdown:', err);
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
