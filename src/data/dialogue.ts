import { FIGHTERS } from './fighters.ts';
import type { FighterId, MoveId, StageId } from '../types.ts';

export interface AnchorInfo {
  id: 'godi' | 'troll';
  name: string;
  channel: string;
  lines: string[];
}

export const ANCHORS: Record<'godi' | 'troll', AnchorInfo> = {
  godi: {
    id: 'godi',
    name: 'SHOR SHARMA',
    channel: 'BREAKING BAKWAS',
    lines: [
      'NATION WANTS TO KNOW: Kisne maara pehla punch?!',
      'EXCLUSIVE: Opposition frame data completely exposed!',
      'Sources confirm: Sansad mein heavy pressure chal raha hai!',
      '9 PM Debate: Can anyone block this 56-inch overhead?!',
      'BREAKING: Crowd placards reaching record TRP levels!',
    ],
  },
  troll: {
    id: 'troll',
    name: 'TWEETY TROLLWALA',
    channel: 'TROLL ARMY',
    lines: [
      'Ratio + L + Whiff Punished in 4K!! 😂',
      'CLIP THIS RIGHT NOW!! Frame trap incoming!!',
      'Chai wale bhaiya has better neutral than this 😭',
      'Tag 3 friends jinke mains ko aaj pad rahi hai 💀',
      'Fact check: Hitbox was totally minus on block!',
    ],
  },
};

export const IDLE_TAUNTS: string[] = [
  'NATION WANTS A PUNCH!',
  'Kya dekh rahe ho? Fight karo!',
  'Lok Sabha TV TRP falling!',
  'Session adjourn ho jayega bhai!',
  'Zero hour khatam ho raha hai!',
];

export const NEWS_TICKERS: string[] = [
  'DIWALI SPECIAL: Sansad Bhavan mein 100% green patakhe & 200% drama',
  'Sensex jumps 420 points every time a Super lands cleanly',
  'Cow Crossing delays Lok Sabha question hour by 4.5 seconds',
  'Chaiwala announces 50% festive discount on Cutting Chai & Soan Papdi',
  'Nirmala Tai spotted opening Budget Briefcase near Fighter Meter',
  'Traffic jam on Desi Sadak after Sabzi Wala parks mid-combo',
  'Opposition demands recount of remaining hit points & blockstun frames',
  'Breaking: Sutli Bomb declared unparliamentary — still explodes anyway',
];

export const LOSER_EXCUSES: Record<FighterId, string[]> = {
  modi: [
    'EVM? Nahi, opponent ke controller mein setting thi!',
    'Lag tha mitron, Varna 56-inch guard kabhi nahi toot-ta!',
  ],
  rahul: [
    'Match rigged tha, scoreboard ka mic mute kar diya!',
    'Main toh pyaar baatne aaya tha, inhone sweep maar diya!',
  ],
  didi: [
    'Central forces ne mera hitbox nerf kiya! Khela unfair!',
    'Chappal slip ho gayi marble floor pe, warna abhi dekhati!',
  ],
  trump: [
    'STOP THE COUNT! I won this round by a LOT, everybody knows it!',
    'Totally rigged match, fake frames, very unfair hitbox!',
  ],
  yogi: [
    'Opponent ka hitbox illegal tha, kal bulldozer bhejunga.',
    'Sirf bulldozer warmup kar raha tha, asli demolition baaki hai!',
  ],
  nitin: [
    'Stage floor pe contractor ne proper bitumen nahi daala!',
    'Toll plaza pe break lag gayi, warna expressway bana deta!',
  ],
  ravi: [
    'Script mein hero ka comeback round 4 mein likha tha!',
    'Camera angle galat tha bhai, swag focus nahi hua!',
  ],
  lalu: [
    'Signal red tha ji, gaadi platform se nikal hi nahi paayi!',
    'Kulhad mein chai thandi thi, mood kharab ho gaya!',
  ],
  amit: [
    'Yeh toh bas pehli chaal thi, asli resort booking abhi baaki hai!',
    'Scoreboard pe numbers galat ginte hain yeh log!',
  ],
  dhruv: [
    'Check my pinned comment! Is match mein zero citations the!',
    'Algorithm ne mera neutral shadowban kar diya, doston!',
  ],
  mbapu: [
    'Ahimsa ki pareeksha thi, beta. Agli baar Dandi se aayenge.',
    'Charkha abhi garam ho raha tha, shanti rakhna seekho.',
  ],
};

export const SUPER_HEADLINES: Record<FighterId, string> = {
  modi: 'CHAKRA DEPLOYED — OPPOSITION CRITICALLY REDUCED!',
  rahul: 'BREAKING: ALOO IN, 24K SONA OUT LIVE ON CAMERA!',
  didi: 'KALA JADU ALERT: RIVAL LEADER TURNED INTO FROG!',
  trump: '50% EXECUTIVE TARIFF IMPOSED ON OPPONENT HP BAR!',
  yogi: 'ENCROACHMENT CLEARED: JCB ENTERS PARLIAMENT ARENA!',
  nitin: 'EXPRESSWAY ETHANOL BLAST SCORCHES SANSAD FLOOR!',
  ravi: 'TIME FROZEN! SUTTI BABU LANDS FILMY TRIPLE DASH!',
  lalu: 'RAIL RAJA EXPRESS ARRIVES RIGHT ON PLATFORM HP!',
  amit: 'DAL-BADAL SHOCK: OPPOSITION FANS SWITCH SIDES!',
  dhruv: 'MOOD METER AT ZERO! GERMAN SHEPHERDS DISPATCHED!',
  mbapu: 'SHANTI TOOFAN! SALT CRYSTALS & CHARKHA SHOCKWAVE!',
};

export interface NewspaperEdition {
  masthead: string;
  date: string;
  headline: string;
  caption: string;
  sub: string;
  excuse: string;
}

export function generateNewsEvent(
  eventType: 'hit' | 'super' | 'combo' | 'ko' | 'cow' | 'chai' | 'bomb' | 'budget',
  attacker: FighterId,
  defender: FighterId,
  extra?: { combo?: number; moveId?: MoveId }
): { godi: string; troll: string } {
  const a = FIGHTERS[attacker].name;
  const d = FIGHTERS[defender].name;
  switch (eventType) {
    case 'super':
      return {
        godi: SUPER_HEADLINES[attacker],
        troll: `${a} ne ${d} ko delete kar diya live stream pe!! 🔥`,
      };
    case 'combo':
      return {
        godi: `HISTORIC ${extra?.combo ?? 3}-HIT COMBO BY ${a}!`,
        troll: `${d} forgot where the block button is 😂 (${extra?.combo ?? 3} hits!)`,
      };
    case 'ko':
      return {
        godi: `MEGA MANDATE! ${a} KNOCKS OUT ${d}!`,
        troll: `${d} folded faster than Budget paper! GG EZ 💀`,
      };
    case 'cow':
      return {
        godi: 'SACRED GAU-MATA INSPECTS SANSAD NEUTRAL GAME!',
        troll: 'Cow has better spacing than both Netas combined 🐄',
      };
    case 'chai':
      return {
        godi: 'CHAI BHAIYA INTERRUPTS SESSION WITH GARAM CUTTING!',
        troll: 'Cup toot gaya par chaiwali vibes immaculate ☕',
      };
    case 'bomb':
      return {
        godi: 'DIWALI SUTLI BOMB EXPLODES ON PARLIAMENT FLOOR!',
        troll: 'Green patakha bola tha, pura stage hila diya 🧨',
      };
    case 'budget':
      return {
        godi: 'NIRMALA TAI DROPS 28% GST SLAB ON OPPONENT GUARD!',
        troll: '18% GST on jumping + 28% on breathing 💀📕',
      };
    default:
      return {
        godi: `${a} lands clean strike against ${d}!`,
        troll: `OOF! ${d} felt that one in next election!`,
      };
  }
}

export function buildDailyJumla(
  winnerId: FighterId,
  loserId: FighterId,
  stageId: StageId,
  perfect: boolean,
  p1Won: boolean,
  diwali: boolean
): NewspaperEdition {
  const winner = FIGHTERS[winnerId];
  const loser = FIGHTERS[loserId];
  const excuses = LOSER_EXCUSES[loserId];
  const excuse =
    diwali && Math.random() < 0.4
      ? 'Breaking: Sansad mein sirf green patakhe allowed — rematch maango!'
      : excuses[Math.floor(Math.random() * excuses.length)];

  const stageLabel =
    stageId === 'sansad' ? 'Sansad Bhavan' : stageId === 'jantar' ? 'Jantar Mantar' : 'Desi Sadak';

  const headline = perfect
    ? `${winner.name} SWEEPS ${loser.name} — ZERO OPPOSITION LEFT!`
    : `${winner.name} WINS GREAT KURSI TAKKAR OVER ${loser.name}!`;

  return {
    masthead: 'THE DAILY JUMLA',
    date: diwali
      ? 'New Delhi · Diwali Special Edition 🪔 · Price: ₹2000 (Demonetized)'
      : 'New Delhi · Satire Edition · Price: 1 Cutting Chai',
    headline,
    caption: `Exclusive photo: ${winner.name} (${winner.party}) celebrates landslide victory at ${stageLabel}.`,
    sub: p1Won
      ? `${winner.name} says: "${winner.winLine}"`
      : `Upset at ${stageLabel}! ${loser.name} promises immediate press conference.`,
    excuse: `${loser.name} reacts: "${excuse}"`,
  };
}
