export type TrackId = 'none' | 'intro' | 'background' | 'battle';

const MUTE_KEY = 'sansad-showdown:muted-v1';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  muted = false;
  musicOn = true;
  private track: TrackId = 'none';
  private musicTimer: number | null = null;
  private stepIdx = 0;
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
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      this.musicGain.gain.value = this.musicOn ? 0.16 : 0;
      this.musicGain.connect(this.master);

      this.noiseBuf = this.buildNoiseBuffer(0.6);
      this.startSequencer();
    }
    if (this.ctx && this.ctx.state !== 'running') {
      this.ctx.resume().then(() => this.onStateChange?.()).catch(() => {});
    }
  }

  private buildNoiseBuffer(sec: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    return buf;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(val: boolean): void {
    this.muted = val;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(val ? 0 : 0.72, this.ctx.currentTime, 0.02);
    }
    try {
      localStorage.setItem(MUTE_KEY, val ? '1' : '0');
    } catch {}
    this.onStateChange?.();
  }

  toggleMusic(): boolean {
    this.musicOn = !this.musicOn;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.16 : 0, this.ctx.currentTime, 0.08);
    }
    this.onStateChange?.();
    return this.musicOn;
  }

  setTrack(id: TrackId): void {
    this.track = id;
    this.stepIdx = 0;
  }

  private startSequencer(): void {
    if (this.musicTimer !== null) return;
    const scaleMenu = [220, 261.6, 293.7, 329.6, 392, 440, 392, 329.6];
    const scaleBattle = [146.8, 174.6, 196, 220, 261.6, 220, 196, 174.6];
    const bassBattle = [73.4, 73.4, 87.3, 87.3, 98, 98, 110, 98];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.muted || !this.musicOn || this.ctx.state !== 'running') return;
      if (this.track === 'none') return;

      const t = this.ctx.currentTime;
      const step = this.stepIdx++ % 16;

      if (this.track === 'intro' || this.track === 'background') {
        const freq = scaleMenu[step % scaleMenu.length];
        if (step % 2 === 0) this.musicNote(freq, 'triangle', 0.22, 0.25, t);
        if (step % 4 === 0) this.musicNote(freq * 0.5, 'sine', 0.35, 0.35, t);
      } else if (this.track === 'battle') {
        // Energetic tabla-style pulse + sitar/synth riff
        const bFreq = bassBattle[Math.floor(step / 2) % bassBattle.length];
        if (step % 2 === 0) this.musicNote(bFreq, 'sawtooth', 0.16, 0.28, t, 500);
        if (step % 4 === 0) this.musicNote(110, 'sine', 0.08, 0.5, t, undefined, 48);
        if (step % 4 === 2) this.musicNoise(0.06, 0.18, t, 1800);
        if (step % 2 === 1 || step % 4 === 0) {
          const mFreq = scaleBattle[step % scaleBattle.length] * 2;
          this.musicNote(mFreq, 'square', 0.11, 0.12, t, 1400);
        }
      }
    }, 155);
  }

  private musicNote(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    at: number,
    lpFreq?: number,
    slideTo?: number
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0.001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    if (lpFreq) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lpFreq;
      osc.connect(f).connect(g).connect(this.musicGain);
    } else {
      osc.connect(g).connect(this.musicGain);
    }
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private musicNoise(dur: number, vol: number, at: number, hpFreq: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hpFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  private tone(
    freq: number,
    endFreq: number,
    dur: number,
    type: OscillatorType = 'triangle',
    gain = 0.25,
    delay = 0
  ): void {
    if (!this.ctx || !this.sfxBus || this.muted || this.ctx.state !== 'running') return;
    const at = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), at);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), at + dur);
    g.gain.setValueAtTime(0.001, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(g).connect(this.sfxBus);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private noise(dur: number, gain = 0.25, filterFreq = 900, filterType: BiquadFilterType = 'bandpass', delay = 0): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuf || this.muted || this.ctx.state !== 'running') return;
    const at = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    src.connect(flt).connect(g).connect(this.sfxBus);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  uiTap(): void {
    this.tone(620, 740, 0.05, 'sine', 0.16);
  }
  uiSelect(): void {
    this.tone(520, 680, 0.07, 'triangle', 0.2);
  }
  uiConfirm(): void {
    this.tone(520, 520, 0.09, 'triangle', 0.25, 0);
    this.tone(780, 780, 0.14, 'triangle', 0.26, 0.07);
  }
  uiBack(): void {
    this.tone(480, 310, 0.1, 'triangle', 0.2);
  }
  whoosh(): void {
    this.noise(0.14, 0.22, 1200, 'bandpass');
  }
  hit(power = 0.7): void {
    this.tone(170 * (0.9 + Math.random() * 0.2), 45, 0.14 + power * 0.08, 'sawtooth', Math.min(0.45, 0.24 + power * 0.16));
    this.noise(0.11, Math.min(0.4, 0.2 + power * 0.15), 750, 'lowpass');
  }
  block(): void {
    this.tone(420, 210, 0.09, 'square', 0.22);
    this.noise(0.06, 0.18, 2400, 'highpass');
  }
  thud(): void {
    this.tone(110, 38, 0.18, 'sine', 0.42);
  }
  boom(): void {
    this.tone(140, 28, 0.55, 'sawtooth', 0.5);
    this.noise(0.55, 0.48, 320, 'lowpass');
  }
  bombBlast(): void {
    this.boom();
    this.noise(0.4, 0.35, 1600, 'bandpass', 0.05);
  }
  pataka(): void {
    this.noise(0.12, 0.32, 2200, 'highpass');
    this.tone(320, 90, 0.14, 'square', 0.22, 0.02);
  }
  slap(): void {
    this.noise(0.08, 0.38, 1900, 'bandpass');
  }
  snap(): void {
    this.tone(980, 520, 0.05, 'triangle', 0.25);
  }
  poof(): void {
    this.noise(0.22, 0.26, 650, 'lowpass');
  }
  plop(): void {
    this.tone(240, 520, 0.09, 'sine', 0.25);
  }
  frogCroak(): void {
    this.tone(190, 290, 0.12, 'sawtooth', 0.24);
    this.tone(210, 320, 0.12, 'sawtooth', 0.22, 0.16);
  }
  chaiTing(): void {
    this.tone(1480, 1460, 0.35, 'sine', 0.28);
    this.tone(2220, 2200, 0.28, 'sine', 0.14, 0.03);
  }
  cupBreak(): void {
    this.noise(0.15, 0.3, 3500, 'highpass');
    this.tone(1800, 900, 0.08, 'triangle', 0.2);
  }
  moo(): void {
    this.tone(145, 118, 0.65, 'sawtooth', 0.24);
  }
  cowBell(): void {
    this.tone(680, 670, 0.22, 'square', 0.16);
  }
  newsSting(): void {
    this.tone(660, 660, 0.09, 'square', 0.18, 0);
    this.tone(880, 880, 0.16, 'square', 0.2, 0.09);
  }
  cameraClicks(count = 4): void {
    for (let i = 0; i < Math.min(6, count); i++) {
      this.noise(0.03, 0.14, 4200, 'highpass', i * 0.07);
    }
  }
  kaching(): void {
    this.tone(1320, 1320, 0.08, 'triangle', 0.24, 0);
    this.tone(1760, 1760, 0.28, 'sine', 0.28, 0.07);
  }
  coins(n = 6): void {
    for (let i = 0; i < Math.min(5, n); i++) {
      this.tone(2200 + i * 180, 2400 + i * 180, 0.08, 'sine', 0.12, i * 0.04);
    }
  }
  stampSlam(): void {
    this.tone(150, 42, 0.22, 'triangle', 0.48);
    this.noise(0.15, 0.3, 500, 'lowpass');
  }
  crateCrash(): void {
    this.noise(0.24, 0.38, 850, 'bandpass');
    this.tone(130, 50, 0.2, 'sawtooth', 0.3);
  }
  eyeZing(): void {
    this.tone(620, 1650, 0.22, 'sine', 0.26);
  }
  shimmer(): void {
    this.tone(880, 1320, 0.35, 'sine', 0.2);
    this.tone(1100, 1660, 0.35, 'triangle', 0.16, 0.08);
  }
  bell(): void {
    this.tone(880, 875, 0.6, 'sine', 0.28);
  }
  thunder(): void {
    this.noise(0.8, 0.45, 260, 'lowpass');
  }
  horn(dur = 0.5): void {
    this.tone(290, 285, dur, 'sawtooth', 0.28);
    this.tone(365, 360, dur, 'sawtooth', 0.24);
  }
  metalCrunch(): void {
    this.noise(0.22, 0.36, 1500, 'bandpass');
  }
  bark(): void {
    this.tone(360, 160, 0.12, 'sawtooth', 0.24);
  }
  heartbeat(): void {
    this.tone(68, 40, 0.12, 'sine', 0.38, 0);
    this.tone(64, 38, 0.14, 'sine', 0.32, 0.16);
  }
  drumroll(): void {
    for (let i = 0; i < 12; i++) {
      this.noise(0.04, 0.14, 1400, 'bandpass', i * 0.06);
    }
  }
  reverseBeeps(n = 4): void {
    for (let i = 0; i < Math.min(4, n); i++) {
      this.tone(1100, 1100, 0.14, 'square', 0.18, i * 0.32);
    }
  }
  penScribble(): void {
    this.noise(0.18, 0.14, 2400, 'bandpass');
  }

  announce(what: string): void {
    if (what === 'fight' || what === 'ko') {
      this.tone(320, 640, 0.25, 'sawtooth', 0.3);
      this.noise(0.18, 0.25, 1100, 'bandpass');
    } else if (what === 'perfect') {
      this.matchJingle(true);
    } else {
      this.tone(440, 560, 0.18, 'triangle', 0.25);
    }
  }

  matchJingle(win: boolean): void {
    const notes = win ? [523.2, 659.3, 784, 1046.5] : [392, 349.2, 311.1, 261.6];
    notes.forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.28, i * 0.12));
  }

  startSuperBed(): void {
    this.tone(160, 480, 1.2, 'sawtooth', 0.22);
  }
  stopSuperBed(): void {}
  superRelease(): void {
    this.boom();
    this.shimmer();
  }

  startEngine(): void {
    if (!this.ctx || !this.sfxBus || this.engineOsc) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    g.gain.value = 0.08;
    osc.connect(g).connect(this.sfxBus);
    osc.start();
    this.engineOsc = { osc, gain: g };
  }

  setEngine(gain: number, rev: number): void {
    if (!this.engineOsc || !this.ctx) return;
    this.engineOsc.gain.gain.setTargetAtTime(this.muted ? 0 : gain * 0.15, this.ctx.currentTime, 0.05);
    this.engineOsc.osc.frequency.setTargetAtTime(48 + rev * 42, this.ctx.currentTime, 0.06);
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
    if (!this.ctx || !this.sfxBus || this.droneOsc) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 110;
    g.gain.value = 0.06;
    osc.connect(g).connect(this.sfxBus);
    osc.start();
    this.droneOsc = { osc, gain: g };
  }

  stopDrone(): void {
    if (this.droneOsc) {
      try {
        this.droneOsc.osc.stop();
      } catch {}
      this.droneOsc = null;
    }
  }
}
