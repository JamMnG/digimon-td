// ─────────────────────────────────────────────────────────────
// enemies.js — 적 데이터 (IP 격리 계층: 이름/색/외형만 이 파일에 존재)
//
// 침입자는 악당 조직이 부리는 포켓몬이다. 아군 풀과 겹치지 않는 종으로만 짰다
// — 같은 도트가 양쪽에 나오면 누가 내 편인지 한눈에 안 보인다.
//
// hp/speed/armor 는 기준값이고, 실제 스폰 시 웨이브 스케일링이 곱해진다.
// class: normal | fast | tank | elite | boss
//
// shape/parts : 렌더러가 실루엣을 조립하는 힌트. 스프라이트를 쓰게 되면
//               이 두 필드만 이미지 경로로 갈아끼우면 된다.
//   shape — worm | brute | beast | flyer | shell | mech | chaos
// ─────────────────────────────────────────────────────────────

export const ENEMIES = {
  rattata: {
    name: '꼬렛', cls: 'normal', attr: 'GRASS', color: '#9f6fb0',
    hp: 62, speed: 46, armor: 0, bounty: 6, radius: 9,
    shape: 'beast', parts: { ears: 'point', tail: 'thin', claws: true },
  },
  pidgey: {
    name: '구구', cls: 'normal', attr: 'FIRE', color: '#c9a86a',
    hp: 88, speed: 42, armor: 1, bounty: 8, radius: 10,
    shape: 'flyer', parts: { wing: 'feather', crest: true },
  },
  ekans: {
    name: '아보', cls: 'fast', attr: 'GRASS', color: '#8f6fc4',
    hp: 76, speed: 82, armor: 0, bounty: 8, radius: 9,
    shape: 'worm', parts: { segs: 4, antenna: false, stripe: '#4a2f6a' },
  },
  zubat: {
    name: '주뱃', cls: 'fast', attr: 'GRASS', color: '#6f8fd0',
    hp: 104, speed: 74, armor: 1, bounty: 10, radius: 9,
    shape: 'flyer', parts: { wing: 'insect', pincer: false },
  },
  geodude: {
    name: '꼬마돌', cls: 'tank', attr: 'FIRE', color: '#9a8e7e',
    hp: 240, speed: 28, armor: 4, bounty: 14, radius: 12,
    shape: 'shell', parts: { spikes: 3, shell: '#6f6558' },
  },
  golbat: {
    name: '골뱃', cls: 'fast', attr: 'GRASS', color: '#4f6fb8',
    hp: 218, speed: 90, armor: 2, bounty: 16, radius: 11,
    shape: 'flyer', parts: { wing: 'membrane', pincer: false },
  },
  weezing: {
    name: '또도가스', cls: 'tank', attr: 'GRASS', color: '#8a7fa8',
    hp: 400, speed: 26, armor: 7, bounty: 21, radius: 14,
    shape: 'chaos', parts: { claws: 2, core: '#5f5578' },
  },
  onix: {
    name: '롱스톤', cls: 'tank', attr: 'FIRE', color: '#8b98a8',
    hp: 560, speed: 24, armor: 10, bounty: 26, radius: 15,
    shape: 'worm', parts: { segs: 6, stripe: '#5d6875' },
  },

  // ── 에이스 (정예) ──
  houndoom: {
    name: '헬가', cls: 'elite', attr: 'FIRE', color: '#4a4048',
    hp: 900, speed: 38, armor: 7, bounty: 46, radius: 15,
    shape: 'beast', parts: { ears: 'long', tail: 'tuft', claws: true },
  },

  // ── 보스 ──
  // 보스 HP는 웨이브 스케일링을 받지 않는 절대값 (balance.scaleBosses:false).
  // 등장 웨이브(10/20/30/40)에서 기대되는 보드 화력을 기준으로 직접 튜닝한다.
  //
  // ★ 방어력을 크게 낮춘 이유 (피드백: "10웨이브 보스를 못 잡음")
  //   방어력은 타격 1회마다 정액으로 깎인다. 10웨이브 시점 보드는 1회 타격이
  //   20~60이라 방어 10이면 실피해가 30~50%씩 증발한다. 체력만 줄이면
  //   "연사형은 되고 한방형은 안 되는" 왜곡이 남으므로 방어부터 손봤다.
  gyarados: {
    name: '검은 갸라도스', cls: 'boss', attr: 'WATER', color: '#3f4f7a',
    hp: 6600, speed: 30, armor: 3, bounty: 320, radius: 21,
    shape: 'worm', parts: { segs: 5, stripe: '#26334f' },
  },
  tyranitar: {
    name: '마기라스', cls: 'boss', attr: 'GRASS', color: '#7fa05f',
    hp: 15000, speed: 24, armor: 8, bounty: 700, radius: 24,
    shape: 'brute', parts: { tusks: true, arms: true, belly: '#d8e0a8' },
  },
  mewtwo: {
    name: '뮤츠', cls: 'boss', attr: 'FIRE', color: '#c2b8d8',
    hp: 30000, speed: 22, armor: 12, bounty: 1500, radius: 26,
    shape: 'chaos', parts: { claws: 2, core: '#a86fd0' },
  },
  kyurem: {
    name: '큐레무', cls: 'boss', attr: 'WATER', color: '#9fc8dd',
    hp: 52000, speed: 20, armor: 16, bounty: 2600, radius: 28,
    shape: 'chaos', parts: { claws: 4, core: '#5ad1ff' },
  },
};

// 웨이브별 등장 풀 — [해금 웨이브, id]
const POOL = [
  [1,  'rattata'],
  [2,  'pidgey'],
  [4,  'ekans'],
  [6,  'zubat'],
  [9,  'geodude'],
  [13, 'golbat'],
  [17, 'weezing'],
  [22, 'onix'],
];

export function normalPool(wave) {
  return POOL.filter(([w]) => w <= wave).map(([, id]) => id);
}

export const ELITE_ID = 'houndoom';

// 보스는 등장 순서대로 소모
export function bossFor(wave) {
  const order = ['gyarados', 'tyranitar', 'mewtwo', 'kyurem'];
  const idx = Math.floor(wave / 10) - 1;
  return order[Math.min(Math.max(idx, 0), order.length - 1)];
}
