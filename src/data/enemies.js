// ─────────────────────────────────────────────────────────────
// enemies.js — 적 데이터 (IP 격리 계층: 이름/색/외형만 이 파일에 존재)
//
// hp/speed/armor 는 기준값이고, 실제 스폰 시 웨이브 스케일링이 곱해진다.
// class: normal | fast | tank | elite | boss
//
// shape/parts : 렌더러가 실루엣을 조립하는 힌트. 스프라이트를 쓰게 되면
//               이 두 필드만 이미지 경로로 갈아끼우면 된다.
//   shape — worm | brute | beast | flyer | shell | mech | chaos
//   parts — 해당 shape의 세부 변형 플래그
// ─────────────────────────────────────────────────────────────

export const ENEMIES = {
  kunemon: {
    name: '쿠네몬', cls: 'normal', attr: 'DATA', color: '#d6e04a',
    hp: 62, speed: 44, armor: 0, bounty: 6, radius: 9,
    shape: 'worm', parts: { segs: 4, antenna: true, stripe: '#5a4a1e' },
  },
  goblimon: {
    name: '고블리몬', cls: 'normal', attr: 'VIRUS', color: '#7fb069',
    hp: 96, speed: 40, armor: 2, bounty: 8, radius: 10,
    shape: 'brute', parts: { ears: 'point', tusks: true, club: true },
  },
  gazimon: {
    name: '가지몬', cls: 'fast', attr: 'VIRUS', color: '#b8a1c9',
    hp: 74, speed: 80, armor: 0, bounty: 8, radius: 8,
    shape: 'beast', parts: { ears: 'long', tail: 'tuft', claws: true },
  },
  unimon: {
    name: '유니몬', cls: 'normal', attr: 'VACCINE', color: '#8ec5ff',
    hp: 158, speed: 52, armor: 3, bounty: 11, radius: 11,
    shape: 'flyer', parts: { wing: 'feather', horn: true, mane: true },
  },
  tortomon: {
    name: '토트몬', cls: 'tank', attr: 'DATA', color: '#c98a4b',
    hp: 268, speed: 27, armor: 7, bounty: 15, radius: 13,
    shape: 'shell', parts: { spikes: 5, shell: '#8a5a2a' },
  },
  kuwagamon: {
    name: '쿠와가몬', cls: 'fast', attr: 'VIRUS', color: '#e05a3a',
    hp: 205, speed: 88, armor: 2, bounty: 16, radius: 11,
    shape: 'flyer', parts: { wing: 'insect', pincer: true },
  },
  mekanorimon: {
    name: '메카노리몬', cls: 'tank', attr: 'DATA', color: '#8b98a8',
    hp: 430, speed: 25, armor: 13, bounty: 21, radius: 14,
    shape: 'mech', parts: { treads: true, eye: 1, plate: '#5d6875' },
  },
  andromon: {
    name: '안드로몬', cls: 'elite', attr: 'VACCINE', color: '#7fe0d4',
    hp: 940, speed: 35, armor: 15, bounty: 46, radius: 16,
    shape: 'mech', parts: { visor: true, arms: true, plate: '#3f7c78' },
  },
  // 보스 HP는 웨이브 스케일링을 받지 않는 절대값 (balance.scaleBosses:false 참고).
  // 등장 웨이브(10/20/30)에서 기대되는 보드 화력을 기준으로 직접 튜닝한다.
  etemon: {
    name: '에테몬', cls: 'boss', attr: 'VIRUS', color: '#e0a030',
    hp: 7200, speed: 27, armor: 10, bounty: 320, radius: 21,
    shape: 'brute', parts: { ears: 'round', shades: true, arms: true, belly: '#f0d9a0' },
  },
  machinedramon: {
    name: '머시드라몬', cls: 'boss', attr: 'DATA', color: '#9aa8c0',
    hp: 21000, speed: 23, armor: 26, bounty: 700, radius: 24,
    shape: 'mech', parts: { cannons: true, spikes: 4, eye: 2, plate: '#5a6478' },
  },
  apocalymon: {
    name: '아포카리몬', cls: 'boss', attr: 'VIRUS', color: '#7a2f8a',
    hp: 37000, speed: 20, armor: 32, bounty: 1500, radius: 27,
    shape: 'chaos', parts: { claws: 4, core: '#ff3b6b' },
  },
};

// 웨이브별 등장 풀 — [해금 웨이브, id]
const POOL = [
  [1,  'kunemon'],
  [2,  'goblimon'],
  [4,  'gazimon'],
  [6,  'unimon'],
  [9,  'tortomon'],
  [13, 'kuwagamon'],
  [17, 'mekanorimon'],
];

export function normalPool(wave) {
  return POOL.filter(([w]) => w <= wave).map(([, id]) => id);
}

export const ELITE_ID = 'andromon';

// 보스는 등장 순서대로 소모
export function bossFor(wave) {
  const order = ['etemon', 'machinedramon', 'apocalymon'];
  const idx = Math.floor(wave / 10) - 1;
  return order[Math.min(Math.max(idx, 0), order.length - 1)];
}
