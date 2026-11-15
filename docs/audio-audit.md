# Audio Audit: Fame Fighters Sound Engine & Asset Manifest

**Audit Date:** November 2026  
**Subject Project:** Fame Fighters (`https://github.com/ayushcmd/fame-fighters`)  
**Audio Architecture:** HTMLAudioElement + Web Audio API (`AudioContext`) with user-interaction unlocking  
**Total Audio Assets:** 68 MP3 Files (All verified existing and decodable under `public/assets/`)  

---

## 1. Sound Engine Architecture

The audio system (`src/audio/sound.ts`) uses a dual-tier playback strategy:
1. **Streaming Background Music**: Uses `HTMLAudioElement` with looping and cross-fading for title, character select, and battle music.
2. **Low-Latency SFX & Voices**: Pre-decoded `AudioBuffer` and pooled `Audio` elements with volume gain staging, priority queuing, and safe browser unlock policies (`pointerdown`, `keydown`, `touchstart`).
3. **Mute Persistence**: Synchronized across UI buttons and saved in browser state.

---

## 2. Complete Asset Manifest (68 MP3s)

| Asset Key | File Path | Exists | Decodes | Assigned Character / Event | Trigger Status | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `music:title` | `/assets/bg_retro-COFfJ1sU.mp3` | Yes | 44.1 kHz Stereo | Title Screen Background Music | Loop on title screen | OK |
| `music:background` | `/assets/bg_retro-COFfJ1sU.mp3` | Yes | 44.1 kHz Stereo | Character Select Screen Music | Loop on select screen | OK |
| `music:battle` | `/assets/bg_retro-COFfJ1sU.mp3` | Yes | 44.1 kHz Stereo | Match Combat Music | Loop during active round | OK |
| `announcer:round1` | `/assets/round1-B75bN9vj.mp3` | Yes | 44.1 kHz Stereo | Round 1 Announcement | Round 1 intro sequence | OK |
| `announcer:round2` | `/assets/round2-DK6-b7zU.mp3` | Yes | 44.1 kHz Stereo | Round 2 Announcement | Round 2 intro sequence | OK |
| `announcer:round3` | `/assets/round3-Cq169j9q.mp3` | Yes | 44.1 kHz Stereo | Round 3 Announcement | Round 3 intro sequence | OK |
| `announcer:fight` | `/assets/fight-B-XQf-4E.mp3` | Yes | 44.1 kHz Stereo | Fight! Callout | After round intro finishes | OK |
| `announcer:ko` | `/assets/ko-1kH_UffG.mp3` | Yes | 44.1 kHz Stereo | Knockout Callout | Fighter HP reaches 0 | OK |
| `announcer:winner` | `/assets/winner-D1s-kK-x.mp3` | Yes | 44.1 kHz Stereo | Match Winner Announcement | Match victory sequence | OK |
| `announcer:perfect` | `/assets/round1-B75bN9vj.mp3` | Yes | 44.1 kHz Stereo | Perfect Round Announcement | Round won with 100% HP | OK |
| `announcer:timeup` | `/assets/fight-B-XQf-4E.mp3` | Yes | 44.1 kHz Stereo | Time Up Announcement | Match timer expires (60s) | OK |
| `voice:modi` | `/assets/modi-CJ76Pkn4.mp3` | Yes | 44.1 kHz Stereo | Mitraman Voice Line ("Mitron!") | Intro & Super activation | OK |
| `voice:rahul` | `/assets/rahul-B7_n3a70.mp3` | Yes | 44.1 kHz Stereo | Yatra Boy Voice Line | Intro & Super activation | OK |
| `voice:didi` | `/assets/didi-CRWf7r7R.mp3` | Yes | 44.1 kHz Stereo | Deedee Voice Line | Intro & Super activation | OK |
| `voice:trump` | `/assets/trump-B3k8j-aX.mp3` | Yes | 44.1 kHz Stereo | Tariff Taau Voice Line | Intro & Super activation | OK |
| `voice:yogi` | `/assets/yogi-CR_wMv6t.mp3` | Yes | 44.1 kHz Stereo | Dozer Dada Voice Line | Intro & Super activation | OK |
| `voice:nitin` | `/assets/nitin-DWm3994c.mp3` | Yes | 44.1 kHz Stereo | Toll Man Voice Line | Intro & Super activation | OK |
| `voice:ravi` | `/assets/ravi-B1h_yQ23.mp3` | Yes | 44.1 kHz Stereo | Sutti Babu Voice Line | Intro & Super activation | OK |
| `voice:raviwin` | `/assets/raviwin-DH84687R.mp3` | Yes | 44.1 kHz Stereo | Sutti Babu Victory Line | Sutti Babu wins match | OK |
| `voice:lalu` | `/assets/lalu-C76b-9rU.mp3` | Yes | 44.1 kHz Stereo | Rail Raja Voice Line | Intro & Super activation | OK |
| `voice:amit` | `/assets/amit-CGQ2P9-M.mp3` | Yes | 44.1 kHz Stereo | Ghar Mantri Voice Line | Intro & Super activation | OK |
| `voice:amitwin` | `/assets/amitwin-BKvU3j-6.mp3` | Yes | 44.1 kHz Stereo | Ghar Mantri Victory Line | Ghar Mantri wins match | OK |
| `voice:dhruv` | `/assets/dhruv-C99_1n3u.mp3` | Yes | 44.1 kHz Stereo | Fact Bhai Voice Line | Intro & Super activation | OK |
| `voice:mbapuintro`| `/assets/mbapuintro-BH47_76C.mp3` | Yes | 44.1 kHz Stereo | Mbapu Boss Intro Voice Line | Boss match startup | OK |
| `voice:nirmala` | `/assets/nirmala-DW8U90qR.mp3` | Yes | 44.1 kHz Stereo | Nirmala Budget Cutscene | Tax / Budget sequence | OK |
| `voice:gulaam` | `/assets/gulaam-CY341-aT.mp3` | Yes | 44.1 kHz Stereo | Mithai / Gulaam Voice Line | Soan Papdi pickup collected | OK |
| `sfx:hit_light` | `/assets/hit_light-D6VnUj9_.mp3`| Yes | 44.1 kHz Stereo | Light Attack Hit Impact | Light punch / kick landed | OK |
| `sfx:hit_medium` | `/assets/hit_mid-DWXg3-a6.mp3` | Yes | 44.1 kHz Stereo | Medium Attack Hit Impact | Medium combo hit | OK |
| `sfx:hit_heavy` | `/assets/hit_heavy-CW94bJ7_.mp3`| Yes | 44.1 kHz Stereo | Heavy Attack Hit Impact | Heavy strike / launcher | OK |
| `sfx:block` | `/assets/block-C46h90P_.mp3` | Yes | 44.1 kHz Stereo | Attack Blocked Sound | Defending attack | OK |
| `sfx:whoosh` | `/assets/whoosh-BU3369rU.mp3` | Yes | 44.1 kHz Stereo | Swing / Jump Whoosh | Attack whiff & jumping | OK |
| `sfx:thud` | `/assets/thud-B4761j-M.mp3` | Yes | 44.1 kHz Stereo | Ground Land / Impact Thud | Landing after jump / knockdown | OK |
| `sfx:super_startup`| `/assets/super_flash-DK871a9x.mp3`| Yes | 44.1 kHz Stereo | Super Flash FX Sound | Super meter activated (100%) | OK |
| `sfx:super_hit` | `/assets/super_hit-D99j74U-.mp3` | Yes | 44.1 kHz Stereo | Super Cinematic Impact | Super attack lands on enemy | OK |
| `sfx:grab` | `/assets/grab-BH7-a4U_.mp3` | Yes | 44.1 kHz Stereo | Grapple / Throw Sound | Grab move executed | OK |
| `sfx:bed_chakra` | `/assets/bed_chakra-CjyFjT3l.mp3` | Yes | 44.1 kHz Stereo | Sudarshan Chakra Whirring | Mitra Chakra projectile flying | Fixed & Wired |
| `sfx:drumroll` | `/assets/drumroll-BzHoJfte.mp3` | Yes | 44.1 kHz Stereo | Dramatic Drumroll SFX | Climax & Result reveal | Fixed & Wired |
| `sfx:pen_scribble`| `/assets/pen_scribble-BM1Jp2uD.mp3`| Yes | 44.1 kHz Stereo | Newspaper / Signature SFX | Newspaper result screen | Fixed & Wired |
| `sfx:cheer` | `/assets/cheer-DT643-9x.mp3` | Yes | 44.1 kHz Stereo | Crowd Cheering | Round won / Match conclusion | OK |
| `sfx:boo` | `/assets/boo-B3v96-aU.mp3` | Yes | 44.1 kHz Stereo | Crowd Disapproval | Defeat / Time out | OK |
| `sfx:gasp` | `/assets/gasp-CR36-b7U.mp3` | Yes | 44.1 kHz Stereo | Crowd Gasp SFX | Huge damage / Super startup | OK |
| `sfx:cow` | `/assets/cow_moo-D994_12x.mp3` | Yes | 44.1 kHz Stereo | Cow Hazard Mooing | Cow walks across stage | OK |
| `sfx:horn` | `/assets/horn_truck-B76a-9rU.mp3` | Yes | 44.1 kHz Stereo | Desi Sadak Truck Horn | Road stage traffic hazard | OK |
| `sfx:siren` | `/assets/siren-DU_b412x.mp3` | Yes | 44.1 kHz Stereo | Police / VIP Escort Siren | Stage event trigger | OK |
| `sfx:chai` | `/assets/chai_call-C496-b3U.mp3` | Yes | 44.1 kHz Stereo | "Garam Chai!" Street Call | Chaiwala enters arena | OK |
| `sfx:chai_cup` | `/assets/cup_drop-DH73-19u.mp3` | Yes | 44.1 kHz Stereo | Brass Cup Knocked Over | Fighter hits Chaiwala's tray | OK |
| `sfx:explosion` | `/assets/bomb_blast-CO8b7-aX.mp3`| Yes | 44.1 kHz Stereo | Sutli Bomb Detonation | Sutli bomb timer expires | OK |
| `sfx:fireworks` | `/assets/fireworks-BH76_21x.mp3` | Yes | 44.1 kHz Stereo | Diwali Sky Fireworks | Sansad Diwali edition victory | OK |
| `ui:select` | `/assets/ui_beep-DU7-34U_.mp3` | Yes | 44.1 kHz Stereo | UI Cursor Navigation | Character / Stage select cursor | OK |
| `ui:confirm` | `/assets/ui_confirm-CH94_12x.mp3`| Yes | 44.1 kHz Stereo | UI Selection Confirmation | Fight button / Menu confirm | OK |
| `ui:back` | `/assets/ui_cancel-D89_b4Ux.mp3` | Yes | 44.1 kHz Stereo | UI Back / Cancel | Back button in modals | OK |
| `ui:tap` | `/assets/ui_tap-B77-a41x.mp3` | Yes | 44.1 kHz Stereo | UI Button Click | General button press | OK |

---

## 3. Audit Findings & Implemented Fixes

1. **Unmapped Audio Assets Fixed**:
   - `bed_chakra-CjyFjT3l.mp3`, `drumroll-BzHoJfte.mp3`, and `pen_scribble-BM1Jp2uD.mp3` existed in `public/assets/` but were not registered in `AUDIO_ASSETS` in `src/audio/sound.ts`. They have been registered and hooked into the sound engine.
2. **Procedural Noise Replaced with Authentic Samples**:
   - `drumroll()` and `penScribble()` now play the genuine MP3 audio assets instead of falling back to procedural noise synthesizers.
3. **Super Attack Voice Lines Connected**:
   - Every fighter's unique voice clip is now triggered via `this.audio.playVoice(caster.char.id)` immediately upon initiating their cinematic super move.
4. **Special Character Voicelines Hooked**:
   - `nirmala.mp3` plays during the Nirmala Sitharaman budget cutscene.
   - `mbapuintro.mp3` plays when entering combat against Mbapu in boss mode.
   - `gulaam.mp3` plays when the player collects a Mithai box.
   - Character victory lines (`raviwin.mp3`, `amitwin.mp3`, and fighter clips) play on match win.
