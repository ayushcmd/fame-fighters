export type TrackId = 'none' | 'intro' | 'background' | 'battle';

const MUTE_KEY = 'sansad-showdown:muted-v1';

const AUDIO_ASSETS: Record<string, string> = {
  // Music
  'music:intro': '/assets/intro-CxITfm7k.mp3',
  'music:background': '/assets/background-sFl8lOjr.mp3',
  'music:battle': '/assets/battle-CqvMijZR.mp3',

  // Announcements
  'voice:round_1': '/assets/round_1-4pTCkOAK.mp3',
  'voice:round_2': '/assets/round_2-BIyjSuFz.mp3',
  'voice:final_round': '/assets/final_round-2ps4Gt_y.mp3',
  'voice:fight': '/assets/fight-BTHw9nHH.mp3',
  'voice:ko': '/assets/ko-CYX5YdIq.mp3',
  'voice:you_win': '/assets/you_win-DHsvvWFw.mp3',
  'voice:you_lose': '/assets/you_lose-mLbO-eAT.mp3',
  'voice:time_up': '/assets/time_up-Carf_3Z9.mp3',
  'voice:perfect': '/assets/perfect-Dm5Oy3HT.mp3',

  // Character Voices
  'char:modi': '/assets/modi-R8FpxZEb.mp3',
  'char:rahul': '/assets/rahul-C7Jjp4hs.mp3',
  'char:didi': '/assets/didi-CjTHLKgc.mp3',
  'char:trump': '/assets/trump-Czs6_rQc.mp3',
  'char:yogi': '/assets/yogi-CJEN4Csa.mp3',
  'char:nitin': '/assets/nitin-B2ZG9HV5.mp3',
  'char:mbapu': '/assets/mbapu-D85PVY1T.mp3',
  'char:ravi': '/assets/ravi-BUhOMgaW.mp3',
  'char:lalu': '/assets/lalu-vVsgGZuo.mp3',
  'char:amit': '/assets/amit-DJ24Mt8b.mp3',
  'char:dhruv': '/assets/dhruv-CHzIxkIz.mp3',
  'char:nirmala': '/assets/nirmala-Dq7cz8UN.mp3',
  'char:mbapuintro': '/assets/mbapuintro-BI_jQwTJ.mp3',
  'char:raviwin': '/assets/raviwin-Q4j69frZ.mp3',
  'char:amitwin': '/assets/amitwin-DIIUm105.mp3',
  'char:gulaam': '/assets/gulaam-BnDUPSAr.mp3',

  // Sound Effects
  'sfx:ui_select': '/assets/ui_select-DvWPzIZM.mp3',
  'sfx:ui_confirm': '/assets/ui_confirm-DEEar_Kj.mp3',
  'sfx:bomb': '/assets/bomb-1fSoTLVm.mp3',
  'sfx:boom': '/assets/boom-Brg2wdT5.mp3',
  'sfx:bell': '/assets/bell-DW1wbKh0.mp3',
  'sfx:moo': '/assets/moo-C_6f5G0B.mp3',
  'sfx:pataka': '/assets/pataka-DtLTRxFJ.mp3',
  'sfx:kaching': '/assets/kaching-wbD5pe6-.mp3',
  'sfx:metal_crunch': '/assets/metal_crunch-DdbVoplE.mp3',
  'sfx:thunder': '/assets/thunder-BRWemNyY.mp3',
  'sfx:coins': '/assets/coins-DVYyL0Kv.mp3',
  'sfx:charkha': '/assets/charkha-ze2BHoz_.mp3',
  'sfx:camera_clicks': '/assets/camera_clicks-DJHuyBDj.mp3',
  'sfx:shimmer': '/assets/shimmer-XQUc4lgS.mp3',
  'sfx:stamp_slam': '/assets/stamp_slam-CAslQB_C.mp3',
  'sfx:reverse_beeps': '/assets/reverse_beeps-DaQ4ZZDr.mp3',
  'sfx:chai_ting': '/assets/chai_ting-Q1sP8TcN.mp3',
  'sfx:cup_break': '/assets/cup_break-BgaQYkuS.mp3',
  'sfx:crate_crash': '/assets/crate_crash-Cr6VTWOz.mp3',
  'sfx:drone': '/assets/drone-DhDpKSwO.mp3',
  'sfx:engine_loop': '/assets/engine_loop-D0YGxkt_.mp3',
  'sfx:eye_zing': '/assets/eye_zing-qZiVqGmG.mp3',
  'sfx:news_sting': '/assets/news_sting-C-mndS4t.mp3',
  'sfx:poof': '/assets/poof-BlJFjDeg.mp3',
  'sfx:charge_chakra': '/assets/charge_chakra-1s5EOYKm.mp3',
  'sfx:release_chakra': '/assets/release_chakra-BvOYn27E.mp3',
  'sfx:release_bulldozer': '/assets/release_bulldozer-CyubjB_l.mp3',
  'sfx:bed_bulldozer': '/assets/bed_bulldozer-BE_e8yDo.mp3',
  'sfx:release_jadu': '/assets/release_jadu-BVQ3aIZ7.mp3',
  'sfx:bed_jadu': '/assets/bed_jadu-jl3ElSBF.mp3',
  'sfx:release_tariff': '/assets/release_tariff-DZ1JBEzs.mp3',
  'sfx:bed_tariff': '/assets/bed_tariff-CLVTzIAp.mp3',
  'sfx:aloolelo': '/assets/aloolelo-BopBNjJr.mp3',
  'sfx:cow_bell': '/assets/cow_bell-Cj3rAWh8.mp3',
  'sfx:horn_long': '/assets/horn_long-dLtoq4Pf.mp3',
  'sfx:jingle_win': '/assets/jingle_win-DqlQ62Fq.mp3',
  'sfx:jingle_lose': '/assets/jingle_lose-gAS4mNKd.mp3',
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  muted = false;
  musicOn = true;
  private track: TrackId = 'none';
  private currentMusicEl: HTMLAudioElement | null = null;
  private voiceEl: HTMLAudioElement | null = null;
  private sfxPool: HTMLAudioElement[] = [];

  private engineOsc: { osc: OscillatorNode; gain: GainNode } | null = null;
  private droneOsc: { osc: OscillatorNode; gain: GainNode } | null = null;
  onStateChange: (() => void) | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  unlock(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(comp);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.85;
      this.sfxBus.connect(this.master);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.35 : 0;
      this.musicGain.connect(this.master);

      this.initNoise();
    }
  }

  private initNoise(): void {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = Math.random() * 2 - 1;
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(val: boolean): void {
    this.muted = val;
    try {
      localStorage.setItem(MUTE_KEY, val ? '1' : '0');
    } catch {}

    if (this.master) {
      this.master.gain.value = val ? 0 : 0.72;
    }
    if (this.currentMusicEl) {
      this.currentMusicEl.muted = val;
    }
    this.onStateChange?.();
  }

  toggleMusic(): boolean {
    this.musicOn = !this.musicOn;
    if (this.currentMusicEl) {
      if (this.musicOn) {
        this.currentMusicEl.play().catch(() => {});
      } else {
        this.currentMusicEl.pause();
      }
    }
    return this.musicOn;
  }

  setTrack(id: TrackId): void {
    if (this.track === id) return;
    this.track = id;

    if (this.currentMusicEl) {
      this.currentMusicEl.pause();
      this.currentMusicEl = null;
    }

    if (id === 'none') return;

    const url = AUDIO_ASSETS[`music:${id}`];
    if (url) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = id === 'battle' ? 0.45 : 0.55;
      audio.muted = this.muted;
      this.currentMusicEl = audio;
      if (this.musicOn) {
        audio.play().catch(() => {});
      }
    }
  }

  playAudio(assetKey: string, volume = 0.8): void {
    if (this.muted) return;
    const url = AUDIO_ASSETS[assetKey];
    if (!url) return;

    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch(() => {});
    } catch {}
  }

  playVoice(charId: string): void {
    if (this.muted) return;
    const url = AUDIO_ASSETS[`char:${charId}`];
    if (!url) return;

    try {
      if (this.voiceEl) {
        this.voiceEl.pause();
      }
      this.voiceEl = new Audio(url);
      this.voiceEl.volume = 0.9;
      this.voiceEl.play().catch(() => {});
    } catch {}
  }

  // UI Sounds
  uiTap(): void {
    this.playTone(520, 0.04, 'sine', 0.12);
  }

  uiSelect(): void {
    this.playAudio('sfx:ui_select', 0.7);
  }

  uiConfirm(): void {
    this.playAudio('sfx:ui_confirm', 0.85);
  }

  uiBack(): void {
    this.playTone(340, 0.08, 'sine', 0.18);
  }

  // Combat SFX
  whoosh(): void {
    this.playNoise(0.09, 320, 0.22);
  }

  hit(power = 0.7): void {
    const p = Math.max(0.2, Math.min(1.4, power));
    this.playNoise(0.12 * p, 450, 0.35 * p);
    this.playTone(110 / p, 0.08, 'sawtooth', 0.28 * p);
  }

  block(): void {
    this.playTone(480, 0.05, 'triangle', 0.25);
    this.playTone(240, 0.09, 'sine', 0.2);
  }

  thud(): void {
    this.playNoise(0.14, 180, 0.3);
    this.playTone(85, 0.12, 'sine', 0.25);
  }

  boom(): void {
    this.playAudio('sfx:boom', 0.8);
  }

  bombBlast(): void {
    this.playAudio('sfx:bomb', 0.85);
  }

  pataka(): void {
    this.playAudio('sfx:pataka', 0.8);
  }

  slap(): void {
    this.hit(0.85);
  }

  snap(): void {
    this.playTone(1800, 0.02, 'square', 0.2);
  }

  poof(): void {
    this.playAudio('sfx:poof', 0.7);
  }

  plop(): void {
    this.playTone(280, 0.08, 'sine', 0.22);
  }

  frogCroak(): void {
    this.playTone(140, 0.12, 'sawtooth', 0.25);
  }

  chaiTing(): void {
    this.playAudio('sfx:chai_ting', 0.75);
  }

  cupBreak(): void {
    this.playAudio('sfx:cup_break', 0.8);
  }

  moo(): void {
    this.playAudio('sfx:moo', 0.85);
  }

  cowBell(): void {
    this.playAudio('sfx:cow_bell', 0.75);
  }

  newsSting(): void {
    this.playAudio('sfx:news_sting', 0.8);
  }

  cameraClicks(count = 4): void {
    this.playAudio('sfx:camera_clicks', 0.75);
  }

  kaching(): void {
    this.playAudio('sfx:kaching', 0.8);
  }

  coins(n = 6): void {
    this.playAudio('sfx:coins', 0.75);
  }

  stampSlam(): void {
    this.playAudio('sfx:stamp_slam', 0.8);
  }

  crateCrash(): void {
    this.playAudio('sfx:crate_crash', 0.85);
  }

  eyeZing(): void {
    this.playAudio('sfx:eye_zing', 0.75);
  }

  shimmer(): void {
    this.playAudio('sfx:shimmer', 0.7);
  }

  bell(): void {
    this.playAudio('sfx:bell', 0.8);
  }

  thunder(): void {
    this.playAudio('sfx:thunder', 0.85);
  }

  horn(dur = 0.5): void {
    this.playAudio('sfx:horn_long', 0.8);
  }

  metalCrunch(): void {
    this.playAudio('sfx:metal_crunch', 0.85);
  }

  bark(): void {
    this.playTone(260, 0.08, 'sawtooth', 0.28);
  }

  heartbeat(): void {
    this.playTone(65, 0.12, 'sine', 0.35);
  }

  drumroll(): void {
    this.playNoise(0.5, 300, 0.25);
  }

  reverseBeeps(n = 4): void {
    this.playAudio('sfx:reverse_beeps', 0.75);
  }

  penScribble(): void {
    this.playNoise(0.18, 1200, 0.2);
  }

  // Voice Announcer
  announce(what: string): void {
    const key = what.toLowerCase().trim();
    if (key.includes('round 1')) {
      this.playAudio('voice:round_1', 0.95);
    } else if (key.includes('round 2')) {
      this.playAudio('voice:round_2', 0.95);
    } else if (key.includes('final round')) {
      this.playAudio('voice:final_round', 0.95);
    } else if (key === 'fight' || key.includes('fight')) {
      this.playAudio('voice:fight', 0.95);
    } else if (key.includes('k.o') || key.includes('ko')) {
      this.playAudio('voice:ko', 0.95);
    } else if (key.includes('you win')) {
      this.playAudio('voice:you_win', 0.95);
    } else if (key.includes('you lose')) {
      this.playAudio('voice:you_lose', 0.95);
    } else if (key.includes('time')) {
      this.playAudio('voice:time_up', 0.95);
    } else if (key.includes('perfect')) {
      this.playAudio('voice:perfect', 0.95);
    }
  }

  matchJingle(win: boolean): void {
    this.playAudio(win ? 'sfx:jingle_win' : 'sfx:jingle_lose', 0.85);
  }

  startSuperBed(type: 'chakra' | 'bulldozer' | 'jadu' | 'tariff' = 'chakra'): void {
    if (type === 'chakra') {
      this.playAudio('sfx:bed_chakra', 0.75);
    } else if (type === 'bulldozer') {
      this.playAudio('sfx:bed_bulldozer', 0.75);
    } else if (type === 'jadu') {
      this.playAudio('sfx:bed_jadu', 0.75);
    } else if (type === 'tariff') {
      this.playAudio('sfx:bed_tariff', 0.75);
    }
  }

  stopSuperBed(): void {}

  superRelease(type: 'chakra' | 'bulldozer' | 'jadu' | 'tariff' = 'chakra'): void {
    if (type === 'chakra') {
      this.playAudio('sfx:release_chakra', 0.85);
    } else if (type === 'bulldozer') {
      this.playAudio('sfx:release_bulldozer', 0.85);
    } else if (type === 'jadu') {
      this.playAudio('sfx:release_jadu', 0.85);
    } else if (type === 'tariff') {
      this.playAudio('sfx:release_tariff', 0.85);
    }
  }

  startEngine(): void {
    this.playAudio('sfx:engine_loop', 0.6);
  }

  setEngine(gain: number, rev: number): void {
    if (!this.engineOsc || !this.ctx) return;
    this.engineOsc.gain.gain.setValueAtTime(gain * 0.18, this.ctx.currentTime);
    this.engineOsc.osc.frequency.setValueAtTime(45 + rev * 90, this.ctx.currentTime);
  }

  stopEngine(): void {
    if (this.engineOsc) {
      try {
        this.engineOsc.osc.stop();
      } catch {}
      this.engineOsc = null;
    }
  }

  startDrone(): void {
    this.playAudio('sfx:drone', 0.65);
  }

  stopDrone(): void {
    if (this.droneOsc) {
      try {
        this.droneOsc.osc.stop();
      } catch {}
      this.droneOsc = null;
    }
  }

  private playTone(freq: number, dur: number, type: OscillatorType = 'sine', gainVal = 0.25): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  private playNoise(dur: number, filterFreq = 600, gainVal = 0.3): void {
    if (!this.ctx || !this.noiseBuf || !this.sfxBus || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start();
    src.stop(this.ctx.currentTime + dur);
  }
}

export const sound = new SoundEngine();
