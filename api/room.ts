import type { IncomingMessage, ServerResponse } from 'http';

interface RoomData {
  code: string;
  hostSecret: string;
  createdAt: number;
  lastActive: number;
  offer: unknown | null;
  answer: unknown | null;
  candidates: { from: 'host' | 'guest'; candidate: unknown }[];
  status: 'waiting' | 'connected' | 'closed';
}

const rooms = new Map<string, RoomData>();

// Purge expired rooms (older than 10 minutes)
function cleanExpiredRooms(): void {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.lastActive > 10 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function parseJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  cleanExpiredRooms();

  const url = new URL(req.url ?? '/', 'http://localhost');
  const code = (url.searchParams.get('code') ?? '').toUpperCase().trim();
  const action = url.searchParams.get('action') ?? '';
  const secret = url.searchParams.get('secret') ?? '';

  // 1. Create Room (Host)
  if (req.method === 'POST' && !code && !action) {
    const payload = await parseJson(req);
    const roomCode = generateCode();
    const hostSecret = Math.random().toString(36).substring(2, 12);
    const room: RoomData = {
      code: roomCode,
      hostSecret,
      createdAt: Date.now(),
      lastActive: Date.now(),
      offer: payload.offer ?? null,
      answer: null,
      candidates: [],
      status: 'waiting',
    };
    rooms.set(roomCode, room);
    sendJson(res, 200, { ok: true, code: roomCode, secret: hostSecret });
    return;
  }

  // 2. Post Offer (Host update)
  if (req.method === 'POST' && action === 'offer' && code) {
    const room = rooms.get(code);
    if (!room || room.hostSecret !== secret) {
      sendJson(res, 404, { ok: false, error: 'Room not found or unauthorized' });
      return;
    }
    const payload = await parseJson(req);
    room.offer = payload.offer ?? null;
    room.lastActive = Date.now();
    sendJson(res, 200, { ok: true });
    return;
  }

  // 3. Post Answer (Guest answer)
  if (req.method === 'POST' && action === 'answer' && code) {
    const room = rooms.get(code);
    if (!room) {
      sendJson(res, 404, { ok: false, error: 'Room not found' });
      return;
    }
    const payload = await parseJson(req);
    room.answer = payload.answer ?? null;
    room.status = 'connected';
    room.lastActive = Date.now();
    sendJson(res, 200, { ok: true });
    return;
  }

  // 4. Poll Room Status (Host polling for answer, or Guest checking offer)
  if (req.method === 'GET' && code) {
    const room = rooms.get(code);
    if (!room) {
      sendJson(res, 404, { ok: false, error: 'Room not found' });
      return;
    }
    room.lastActive = Date.now();
    sendJson(res, 200, {
      ok: true,
      code: room.code,
      status: room.status,
      offer: room.offer,
      answer: room.answer,
      isHost: secret && room.hostSecret === secret,
    });
    return;
  }

  // 5. Post ICE candidate
  if (req.method === 'POST' && action === 'candidate' && code) {
    const room = rooms.get(code);
    if (!room) {
      sendJson(res, 404, { ok: false, error: 'Room not found' });
      return;
    }
    const payload = await parseJson(req);
    const from = (payload.from as 'host' | 'guest') ?? 'guest';
    if (payload.candidate) {
      room.candidates.push({ from, candidate: payload.candidate });
    }
    room.lastActive = Date.now();
    sendJson(res, 200, { ok: true });
    return;
  }

  // 6. Get ICE candidates
  if (req.method === 'GET' && action === 'candidates' && code) {
    const room = rooms.get(code);
    if (!room) {
      sendJson(res, 404, { ok: false, error: 'Room not found' });
      return;
    }
    const forRole = url.searchParams.get('for') ?? 'guest';
    const list = room.candidates.filter((c) => c.from !== forRole).map((c) => c.candidate);
    sendJson(res, 200, { ok: true, candidates: list });
    return;
  }

  sendJson(res, 400, { ok: false, error: 'Invalid request' });
}
