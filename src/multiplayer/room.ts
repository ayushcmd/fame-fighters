import type { InputState } from '../types.ts';

export interface NetworkPacket {
  type: 'input' | 'select' | 'ready' | 'ping' | 'pong';
  input?: InputState;
  fighterPick?: string;
  stagePick?: string;
  ready?: boolean;
  time?: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'hosting' | 'connected' | 'error';

export class MultiplayerClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private pollTimer: number | null = null;
  private pingTimer: number | null = null;

  state: ConnectionState = 'disconnected';
  roomCode: string | null = null;
  isHost = false;
  hostSecret: string | null = null;
  latency = 0;

  onStateChange: ((state: ConnectionState, detail?: string) => void) | null = null;
  onRemoteInput: ((input: InputState) => void) | null = null;
  onRemoteSelect: ((pick: string, ready: boolean, stage?: string) => void) | null = null;

  private readonly iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  async host(): Promise<string> {
    this.cleanup();
    this.setState('connecting', 'Creating online room...');

    try {
      this.pc = new RTCPeerConnection({ iceServers: this.iceServers });
      this.isHost = true;

      // Create low-latency unordered DataChannel for fighting game input
      this.dc = this.pc.createDataChannel('fighter-inputs', {
        ordered: false,
        maxRetransmits: 0,
      });
      this.setupDataChannel(this.dc);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete so offer contains candidates
      await this.waitForIceGathering(this.pc);

      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer: this.pc.localDescription }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok || !data.code) throw new Error(data.error || 'Failed to create room');

      this.roomCode = data.code;
      this.hostSecret = data.secret;
      this.setState('hosting', `Room created: ${this.roomCode}`);

      this.startHostPolling();
      return data.code;
    } catch (err) {
      this.cleanup();
      this.setState('error', 'Online server unavailable (running in Local 2P mode)');
      throw err;
    }
  }

  async join(code: string): Promise<void> {
    this.cleanup();
    const cleanCode = code.trim().toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;
    this.setState('connecting', `Joining room ${cleanCode}...`);

    try {
      const res = await fetch(`/api/room?code=${encodeURIComponent(cleanCode)}`);
      if (!res.ok) throw new Error(`Room ${cleanCode} not found`);
      const data = await res.json();
      if (!data.ok || !data.offer) throw new Error(data.error || 'Host offer not ready');

      this.pc = new RTCPeerConnection({ iceServers: this.iceServers });
      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this.setupDataChannel(this.dc);
      };

      await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      await this.waitForIceGathering(this.pc);

      const ansRes = await fetch(`/api/room?code=${encodeURIComponent(cleanCode)}&action=answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: this.pc.localDescription }),
      });

      if (!ansRes.ok) throw new Error('Failed to post answer to room');
    } catch (err) {
      this.cleanup();
      this.setState('error', `Failed to join room: ${(err as Error).message}`);
      throw err;
    }
  }

  sendInput(input: InputState): void {
    if (this.dc?.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify({ type: 'input', input }));
      } catch {}
    }
  }

  sendSelect(fighterPick: string, ready: boolean, stagePick?: string): void {
    if (this.dc?.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify({ type: 'select', fighterPick, ready, stagePick }));
      } catch {}
    }
  }

  private setupDataChannel(dc: RTCDataChannel): void {
    dc.onopen = () => {
      this.setState('connected', `Connected via WebRTC!`);
      this.startPing();
    };

    dc.onclose = () => {
      this.setState('disconnected', 'Peer disconnected.');
      this.cleanup();
    };

    dc.onmessage = (e) => {
      try {
        const pkt = JSON.parse(e.data) as NetworkPacket;
        if (pkt.type === 'input' && pkt.input) {
          this.onRemoteInput?.(pkt.input);
        } else if (pkt.type === 'select' && pkt.fighterPick) {
          this.onRemoteSelect?.(pkt.fighterPick, Boolean(pkt.ready), pkt.stagePick);
        } else if (pkt.type === 'ping' && pkt.time) {
          dc.send(JSON.stringify({ type: 'pong', time: pkt.time }));
        } else if (pkt.type === 'pong' && pkt.time) {
          this.latency = Math.max(1, Math.round(performance.now() - pkt.time));
        }
      } catch {}
    };
  }

  private startHostPolling(): void {
    if (this.pollTimer) window.clearInterval(this.pollTimer);
    let attempts = 0;

    this.pollTimer = window.setInterval(async () => {
      if (this.state !== 'hosting' || !this.roomCode || !this.hostSecret) {
        if (this.pollTimer) window.clearInterval(this.pollTimer);
        return;
      }
      attempts++;
      if (attempts > 120) {
        this.cleanup();
        this.setState('error', 'Room timed out waiting for peer.');
        return;
      }

      try {
        const res = await fetch(
          `/api/room?code=${encodeURIComponent(this.roomCode)}&secret=${encodeURIComponent(this.hostSecret)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.answer && this.pc && this.pc.signalingState === 'have-local-offer') {
          await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          if (this.pollTimer) {
            window.clearInterval(this.pollTimer);
            this.pollTimer = null;
          }
        }
      } catch {}
    }, 1000);
  }

  private startPing(): void {
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => {
      if (this.dc?.readyState === 'open') {
        try {
          this.dc.send(JSON.stringify({ type: 'ping', time: performance.now() }));
        } catch {}
      }
    }, 2000);
  }

  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      // Timeout after 2.5s if STUN delays
      window.setTimeout(resolve, 2500);
    });
  }

  private setState(next: ConnectionState, detail?: string): void {
    this.state = next;
    this.onStateChange?.(next, detail);
  }

  cleanup(): void {
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    try {
      this.dc?.close();
      this.pc?.close();
    } catch {}
    this.dc = null;
    this.pc = null;
    this.roomCode = null;
    this.hostSecret = null;
    this.isHost = false;
  }
}

export const multiplayer = new MultiplayerClient();
