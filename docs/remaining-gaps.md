# Remaining Gaps & Enhancement Roadmap: Fame Fighters

**Audit Date:** November 2026  
**Subject Project:** Fame Fighters (`https://github.com/ayushcmd/fame-fighters`)  
**Status:** Core Audit, Bug Fixes & Parity Enhancements Completed  

---

## 1. Transparent Gap Analysis

While Fame Fighters now matches the reference game's core visual presentation, audio triggers, character roster, and combat mechanics, the following environmental and infrastructural items should be noted:

### 1.1 WebRTC Signaling Infrastructure
- **Current Setup**:
  - Signaling is handled via the Vercel serverless HTTP endpoint `/api/room.ts` (polling offer/answer SDPs and ICE candidates) combined with low-latency unordered WebRTC DataChannels (`RTCDataChannel`).
  - If deployed in a purely static hosting environment without backend serverless API functions enabled (e.g., raw GitHub Pages without serverless functions), the game automatically falls back to **Local 2P Couch Mode** on the same keyboard.
- **Production Recommendation**:
  - Ensure Vercel project deployment has serverless functions enabled (`api/room.ts`).
  - For ultra-high concurrent online traffic, consider deploying a lightweight Node.js WebSocket signaling relay (such as `ws` on Railway or Fly.io) as an optional alternative to HTTP polling.

### 1.2 Netcode Architecture (Delay-Based vs. Rollback)
- **Current Implementation**:
  - The multiplayer engine uses low-latency unbuffered WebRTC DataChannels (`maxRetransmits: 0`), transmitting raw input packets per frame. This provides responsive play across low-to-medium latency connections (< 70ms).
- **Future Enhancement**:
  - Implementing deterministic rollback netcode (similar to GGPO / rollback state saving) would allow seamless competitive play across intercontinental latencies (> 150ms).

### 1.3 Legal & Parody Attribution
- The project is a satirical political parody and tribute build.
- All character models, caricatured portraits, and voice samples are included strictly under fair-use parody doctrine and non-commercial educational demonstration.
- MIT License and contributing documentation have been added to the repository root.

---

## 2. Summary of Key Achievements in this Pass

1. **Character Select Dynamic 3D Showcase**: Fixed the character select screen so authentic 3D models with proper showcase stances (Modi chest forward, Rahul hands raised) display in front of the Parliament stage and immediately refresh when selecting any fighter or pressing navigation keys.
2. **Combat Defense Logic**: Rectified the crouch-blocking calculation so crouching defenders properly defend against both Low and Mid attacks.
3. **10-Frame Input Buffer**: Introduced input buffering in `FighterState`, eliminating dropped inputs during combo sequences.
4. **Complete Audio Mapping**: Connected all 68 MP3 audio files, replacing procedural noise fallbacks with authentic recorded audio (`bed_chakra`, `drumroll`, `pen_scribble`), and triggered character voice lines on Super moves, pickups, and victories.
5. **Multiplayer Signaling Engine**: Developed a full WebRTC P2P multiplayer protocol in `src/multiplayer/room.ts` and `api/room.ts` with instant fallback to couch 2P play.
6. **Documentation**: Authored the full 7-document audit suite in `docs/`.
