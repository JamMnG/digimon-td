// ─────────────────────────────────────────────────────────────
// monsters.js — 타워(포켓몬) 데이터 + 진화 트리 정의
//
// ★ IP 격리 계층 ★
// 이름·색상·설명 등 저작권 관련 요소는 전부 이 파일에만 존재한다.
// 다른 모듈은 id / tier / attr / field / 스탯만 참조하므로,
// 이 파일의 name·color·desc만 교체하면 오리지널 몬스터로 전환된다.
//
// 진화 구조 — 원작 진화 라인을 그대로 따른다.
//   T1 기본 → T2 1차진화 → T3 최종진화
//   T4 는 메가진화. 혼자서는 못 하고 인접한 동료와의 유대가 필요하다
//   (megaTable.js). 원작에서 메가진화가 실제로 존재하는 종만 넣었다.
//
// 라인은 14개(=42종) + 메가 8종 = 50종.
// ─────────────────────────────────────────────────────────────

// ── 배틀 상성 (3속성 순환) ──
// 포켓몬 스타터 3각을 그대로 쓴다: 불꽃 ▶ 풀 ▶ 물 ▶ 불꽃
// 원작의 18타입을 다 넣으면 배치 퍼즐이 상성 암기 게임이 되므로 3축으로 줄였다.
// 각 포켓몬의 배정은 원작 타입이 셋 중 하나면 그대로, 아니면 대표색·이미지를 따른다.
export const ATTR = {
  FIRE:  { id: 'FIRE',  name: '불꽃', color: '#ff7043', mark: '🔥' },
  GRASS: { id: 'GRASS', name: '풀',   color: '#66bb6a', mark: '🌿' },
  WATER: { id: 'WATER', name: '물',   color: '#42a5f5', mark: '💧' },
};

// ── 종족 (시너지 그룹 + 8방향 인접 규칙) ──
export const FIELD = {
  DRAGON:  { id: 'DRAGON',  name: '드래곤', mark: '🐉' },
  FIGHT:   { id: 'FIGHT',   name: '격투',   mark: '👊' },
  PSYCHIC: { id: 'PSYCHIC', name: '에스퍼', mark: '🔮' },
  GHOST:   { id: 'GHOST',   name: '고스트', mark: '👻' },
  STEEL:   { id: 'STEEL',   name: '강철',   mark: '⚙' },
};

// 공격 방식
export const KIND = {
  single: '단일',
  splash: '광역',
  pierce: '관통',
};

// ─────────────────────────────────────────────────────────────
// 스탯 규약
//   atk    : 발사 1회당 기본 피해
//   range  : 사거리(px)
//   rate   : 초당 발사 횟수
//   kind   : single | splash | pierce
//   splash : 광역 반경(px)         — kind:'splash'
//   pierce : 최대 관통 수          — kind:'pierce'
//   salvo  : 1회 발사 시 연사 발수 (기본 1)
//   crit   : 치명타 확률 0~1
//   slowPct/slowDur : 둔화율 / 지속(초)
//   armorPierce : 방어력 무시
//   execute     : 저체력 대상 추가 피해
// ─────────────────────────────────────────────────────────────

export const MONSTERS = {
  // ══════════ 드래곤 · 파이리 라인 (광역 주력) ══════════
  charmander: {
    name: '파이리', tier: 1, attr: 'FIRE', field: 'DRAGON', color: '#ff8c42',
    cost: 60, atk: 14, range: 112, rate: 1.1, kind: 'single',
    desc: '꼬리의 불꽃이 곧 기력. 값이 싸고 어디에 놔도 제 몫을 한다.',
    look: { build: 'rookie', head: 'snout', tail: 'flame', hand: 'claw', mark: 'belly', markColor: '#ffe0b5' },
    evolvesTo: ['charmeleon'],
  },
  charmeleon: {
    name: '리자드', tier: 2, attr: 'FIRE', field: 'DRAGON', color: '#e2542f',
    atk: 34, range: 130, rate: 1.0, kind: 'splash', splash: 30,
    desc: '화염방사. 몰려오는 무리에 광역 피해를 준다.',
    look: { build: 'biped', head: 'snout', horn: 1, hornStyle: 'back', tail: 'flame', hand: 'claw', eyeColor: '#ffe066' },
    evolvesTo: ['charizard'],
  },
  charizard: {
    name: '리자몽', tier: 3, attr: 'FIRE', field: 'DRAGON', color: '#f2691f',
    atk: 66, range: 158, rate: 1.0, kind: 'splash', splash: 40,
    desc: '대문자로 불태운다. 광역 반경이 넓어 굽은 길목에 놓으면 좋다.',
    look: { build: 'biped', head: 'snout', horn: 2, hornStyle: 'back', wing: 'membrane', wingColor: '#2e7fb8', tail: 'flame', hand: 'claw' },
    evolvesTo: [],
  },

  // ══════════ 드래곤 · 미뇽 라인 (관통 균형) ══════════
  dratini: {
    name: '미뇽', tier: 1, attr: 'FIRE', field: 'DRAGON', color: '#8fd4e8',
    cost: 60, atk: 12, range: 126, rate: 1.15, kind: 'single',
    desc: '탈피할 때마다 커진다. 사거리가 조금 길다.',
    look: { build: 'serpent', head: 'round', mark: 'belly', markColor: '#f2f7d0' },
    evolvesTo: ['dragonair'],
  },
  dragonair: {
    name: '신뇽', tier: 2, attr: 'FIRE', field: 'DRAGON', color: '#6cc3e0',
    atk: 30, range: 150, rate: 1.1, kind: 'pierce', pierce: 2,
    desc: '용의숨결. 일렬로 늘어선 적을 꿰뚫는다.',
    look: { build: 'serpent', head: 'round', horn: 1, orb: true, wing: 'fin', mark: 'belly', markColor: '#f2f7d0' },
    evolvesTo: ['dragonite'],
  },
  dragonite: {
    name: '망나뇽', tier: 3, attr: 'FIRE', field: 'DRAGON', color: '#f0a83c',
    atk: 72, range: 172, rate: 1.05, kind: 'pierce', pierce: 4, crit: 0.12,
    desc: '신속으로 먼저 때린다. 관통 4회 + 치명타로 안정적인 주력.',
    look: { build: 'biped', head: 'snout', horn: 2, wing: 'membrane', wingColor: '#5fa8d0', tail: 'thick', hand: 'claw', mark: 'belly', markColor: '#ffe9b8' },
    evolvesTo: [],
  },

  // ══════════ 드래곤 · 딥상어동 라인 (고속 연사) ══════════
  gible: {
    name: '딥상어동', tier: 1, attr: 'WATER', field: 'DRAGON', color: '#4a7fc1',
    cost: 60, atk: 11, range: 108, rate: 1.35, kind: 'single',
    desc: '뭐든 씹는다. 발사 속도가 빨라 둔화와 궁합이 좋다.',
    look: { build: 'rookie', head: 'wide', teeth: true, tail: 'thick', mark: 'belly', markColor: '#e05a5a' },
    evolvesTo: ['gabite'],
  },
  gabite: {
    name: '한바이트', tier: 2, attr: 'WATER', field: 'DRAGON', color: '#3f6fae',
    atk: 24, range: 128, rate: 1.6, kind: 'single', salvo: 2,
    desc: '드래곤클로 2연타. 초당 타격 수가 라인 중 가장 많다.',
    look: { build: 'biped', head: 'wide', teeth: true, wing: 'fin', tail: 'thick', hand: 'claw', mark: 'belly', markColor: '#e05a5a' },
    evolvesTo: ['garchomp'],
  },
  garchomp: {
    name: '한카리아스', tier: 3, attr: 'WATER', field: 'DRAGON', color: '#2f5f9e',
    atk: 48, range: 150, rate: 1.75, kind: 'single', salvo: 3, crit: 0.15,
    desc: '제트기처럼 파고든다. 3연사 × 고속 = 단일 대상 최고 DPS.',
    look: { build: 'biped', head: 'wide', horn: 2, hornStyle: 'side', wing: 'fin', tail: 'blade', hand: 'claw', mark: 'belly', markColor: '#e05a5a' },
    evolvesTo: [],
  },

  // ══════════ 격투 · 알통몬 라인 (근접 폭딜) ══════════
  machop: {
    name: '알통몬', tier: 1, attr: 'FIRE', field: 'FIGHT', color: '#9fb4c4',
    cost: 60, atk: 17, range: 96, rate: 0.95, kind: 'single',
    desc: '사거리가 짧은 대신 한 방이 세다. 길에 바짝 붙여 놓아야 한다.',
    look: { build: 'humanoid', head: 'crest', hand: 'fist', mark: 'stripe', markColor: '#6a8290' },
    evolvesTo: ['machoke'],
  },
  machoke: {
    name: '근육몬', tier: 2, attr: 'FIRE', field: 'FIGHT', color: '#8aa5b8',
    atk: 42, range: 104, rate: 0.95, kind: 'single', crit: 0.14,
    desc: '가라테촙. 치명타가 붙어 순간 화력이 튄다.',
    look: { build: 'humanoid', head: 'crest', hand: 'fist', belt: true, mark: 'stripe', markColor: '#5f7b8a' },
    evolvesTo: ['machamp'],
  },
  machamp: {
    name: '괴력몬', tier: 3, attr: 'FIRE', field: 'FIGHT', color: '#7d9fb4',
    atk: 58, range: 112, rate: 1.5, kind: 'single', salvo: 4, crit: 0.2,
    desc: '팔 넷으로 연속 펀치. 사거리를 버린 대신 근거리 화력이 압도적.',
    look: { build: 'humanoid', head: 'crest', arms: 4, hand: 'fist', belt: true, mark: 'stripe', markColor: '#5f7b8a' },
    evolvesTo: [],
  },

  // ══════════ 격투 · 발챙이 라인 (둔화 제어) ══════════
  poliwag: {
    name: '발챙이', tier: 1, attr: 'WATER', field: 'FIGHT', color: '#5aa8e0',
    cost: 60, atk: 9, range: 122, rate: 1.0, kind: 'single',
    slowPct: 0.25, slowDur: 1.0,
    desc: '배의 소용돌이로 홀린다. 화력은 낮지만 다른 유닛의 딜 시간을 벌어준다.',
    look: { build: 'blob', head: 'round', spiral: true, tail: 'thin' },
    evolvesTo: ['poliwhirl'],
  },
  poliwhirl: {
    name: '슈륙챙이', tier: 2, attr: 'WATER', field: 'FIGHT', color: '#4a90d9',
    atk: 24, range: 138, rate: 1.25, kind: 'single', slowPct: 0.32, slowDur: 1.2,
    desc: '물의파동. 둔화 지속이 길어져 경로 초입이 제자리다.',
    look: { build: 'humanoid', head: 'round', spiral: true, hand: 'glove' },
    evolvesTo: ['poliwrath'],
  },
  poliwrath: {
    name: '강챙이', tier: 3, attr: 'WATER', field: 'FIGHT', color: '#3a72b8',
    atk: 40, range: 132, rate: 1.5, kind: 'single', salvo: 3,
    slowPct: 0.42, slowDur: 1.4,
    desc: '더블펀치 3연타로 둔화를 끊김 없이 유지한다. 맵 전체의 딜 시간을 늘리는 축.',
    look: { build: 'humanoid', head: 'round', spiral: true, hand: 'glove', muscle: true },
    evolvesTo: [],
  },

  // ══════════ 격투 · 뚜꾸리 라인 (광역) ══════════
  tepig: {
    name: '뚜꾸리', tier: 1, attr: 'FIRE', field: 'FIGHT', color: '#e08a6a',
    cost: 60, atk: 13, range: 106, rate: 1.05, kind: 'splash', splash: 20,
    desc: '코에서 불씨를 뿜는다. 처음부터 광역이라 초반 벌레 떼에 강하다.',
    look: { build: 'quad', head: 'snout', snoutColor: '#f2c4a0', tail: 'curl', mark: 'stripe', markColor: '#3a2a24' },
    evolvesTo: ['pignite'],
  },
  pignite: {
    name: '차오꿀', tier: 2, attr: 'FIRE', field: 'FIGHT', color: '#d8703f',
    atk: 32, range: 118, rate: 1.0, kind: 'splash', splash: 32,
    desc: '화염보스. 반경이 넓어져 겹치는 경로에서 값이 뛴다.',
    look: { build: 'humanoid', head: 'snout', snoutColor: '#f2c4a0', belt: true, mark: 'stripe', markColor: '#2f2018' },
    evolvesTo: ['emboar'],
  },
  emboar: {
    name: '엠보아', tier: 3, attr: 'FIRE', field: 'FIGHT', color: '#c2502a',
    atk: 74, range: 138, rate: 0.9, kind: 'splash', splash: 50,
    desc: '히트스탬프. 광역 반경 50 — 맵에서 가장 넓게 터진다.',
    look: { build: 'humanoid', head: 'snout', beard: 'flame', muscle: true, belt: true, mark: 'stripe', markColor: '#2f2018' },
    evolvesTo: [],
  },

  // ══════════ 에스퍼 · 캐이시 라인 (초장거리 단일) ══════════
  abra: {
    name: '캐이시', tier: 1, attr: 'WATER', field: 'PSYCHIC', color: '#e8c05a',
    cost: 60, atk: 12, range: 148, rate: 0.85, kind: 'single',
    desc: '하루 18시간 잔다. 사거리가 라인 중 가장 길다.',
    look: { build: 'rookie', head: 'fox', tail: 'thick', armor: 'plate', armorColor: '#8a6a3a' },
    evolvesTo: ['kadabra'],
  },
  kadabra: {
    name: '윤겔라', tier: 2, attr: 'WATER', field: 'PSYCHIC', color: '#dcb44e',
    atk: 33, range: 178, rate: 0.9, kind: 'single',
    desc: '스푼을 쥐면 초능력이 배가 된다. 뒤에서 길목을 통째로 덮는다.',
    look: { build: 'humanoid', head: 'fox', star: true, spoon: true, tail: 'thick', armor: 'plate', armorColor: '#8a6a3a' },
    evolvesTo: ['alakazam'],
  },
  alakazam: {
    name: '후딘', tier: 3, attr: 'WATER', field: 'PSYCHIC', color: '#d0a842',
    atk: 78, range: 212, rate: 0.95, kind: 'single', crit: 0.18,
    desc: 'IQ 5000. 사거리 212로 맵 절반을 사정권에 넣는다.',
    look: { build: 'humanoid', head: 'fox', beard: 'long', spoon: 2, armor: 'plate', armorColor: '#8a6a3a' },
    evolvesTo: [],
  },

  // ══════════ 에스퍼 · 랄토스 라인 (이웃 지원) ══════════
  ralts: {
    name: '랄토스', tier: 1, attr: 'GRASS', field: 'PSYCHIC', color: '#e8eef2',
    cost: 60, atk: 10, range: 132, rate: 1.0, kind: 'single',
    desc: '뿔로 감정을 읽는다. 인접한 동료의 사거리를 늘려주는 지원형.',
    look: { build: 'rookie', head: 'bowl', hair: '#5ac48a', dress: true },
    evolvesTo: ['kirlia'],
  },
  kirlia: {
    name: '키르리아', tier: 2, attr: 'GRASS', field: 'PSYCHIC', color: '#f0f4f7',
    atk: 27, range: 154, rate: 1.15, kind: 'single', slowPct: 0.2, slowDur: 0.8,
    desc: '춤추면 공간이 뒤틀린다. 가벼운 둔화가 붙는다.',
    look: { build: 'dancer', head: 'bowl', hair: '#5ac48a', dress: true },
    evolvesTo: ['gardevoir'],
  },
  gardevoir: {
    name: '가디안', tier: 3, attr: 'GRASS', field: 'PSYCHIC', color: '#f4f7fa',
    atk: 62, range: 190, rate: 1.2, kind: 'single', slowPct: 0.28, slowDur: 1.0,
    desc: '문피포스. 사거리·둔화·화력을 고루 갖춘 지원 코어.',
    look: { build: 'dancer', head: 'bowl', hair: '#4fbf82', dress: 'gown', horn: 1, mark: 'heart', markColor: '#e05a7a' },
    evolvesTo: [],
  },

  // ══════════ 에스퍼 · 토게피 라인 (다중 타격) ══════════
  togepi: {
    name: '토게피', tier: 1, attr: 'GRASS', field: 'PSYCHIC', color: '#f7f2e0',
    cost: 60, atk: 11, range: 118, rate: 1.2, kind: 'single',
    desc: '껍질에 행복이 가득하다. 잔타격이 잦아 둔화 유지에 쓰인다.',
    look: { build: 'egg', head: 'round', mark: 'spot', markColor: '#e05a7a' },
    evolvesTo: ['togetic'],
  },
  togetic: {
    name: '토게틱', tier: 2, attr: 'GRASS', field: 'PSYCHIC', color: '#f4efe0',
    atk: 22, range: 148, rate: 1.4, kind: 'single', salvo: 2,
    desc: '행복의알을 나눠준다. 2연사로 꾸준히 긁는다.',
    look: { build: 'flyer', head: 'round', wing: 'small', mark: 'spot', markColor: '#e05a7a' },
    evolvesTo: ['togekiss'],
  },
  togekiss: {
    name: '토게키스', tier: 3, attr: 'GRASS', field: 'PSYCHIC', color: '#fbf6e8',
    atk: 44, range: 182, rate: 1.35, kind: 'pierce', pierce: 3, salvo: 2,
    desc: '에어슬래시 2연사 × 관통 3. 넓게 퍼진 적을 한 번에 훑는다.',
    look: { build: 'flyer', head: 'round', wing: 'broad', mark: 'spot', markColor: '#e05a7a' },
    evolvesTo: [],
  },

  // ══════════ 고스트 · 고오스 라인 (방어 무시) ══════════
  gastly: {
    name: '고오스', tier: 1, attr: 'GRASS', field: 'GHOST', color: '#8a6fd0',
    cost: 60, atk: 13, range: 116, rate: 1.05, kind: 'single', armorPierce: true,
    desc: '가스 덩어리라 방어력을 무시한다. 단단한 적에게 강하다.',
    look: { build: 'gas', head: 'round', eyes: 'sharp', glow: 'dark' },
    evolvesTo: ['haunter'],
  },
  haunter: {
    name: '고우스트', tier: 2, attr: 'GRASS', field: 'GHOST', color: '#7b5fc4',
    atk: 31, range: 136, rate: 1.15, kind: 'single', armorPierce: true,
    desc: '섀도볼. 방어 무시가 유지되어 중반 탱커를 녹인다.',
    look: { build: 'gas', head: 'round', hands: 'float', eyes: 'sharp', glow: 'dark' },
    evolvesTo: ['gengar'],
  },
  gengar: {
    name: '팬텀', tier: 3, attr: 'GRASS', field: 'GHOST', color: '#6b4fb8',
    atk: 70, range: 162, rate: 1.25, kind: 'single', armorPierce: true, crit: 0.22,
    desc: '그림자를 밟으면 끝. 방어 무시 + 치명타로 정예·보스를 담당한다.',
    look: { build: 'imp', head: 'round', ears: 'point', grin: true, spine: true, glow: 'dark' },
    evolvesTo: [],
  },

  // ══════════ 고스트 · 불켜미 라인 (광역 폭발) ══════════
  litwick: {
    name: '불켜미', tier: 1, attr: 'FIRE', field: 'GHOST', color: '#e8e2d0',
    cost: 60, atk: 12, range: 110, rate: 1.0, kind: 'splash', splash: 18,
    desc: '생명을 빨아 불꽃을 키운다. 처음부터 작게 터진다.',
    look: { build: 'candle', head: 'flame', flameColor: '#8fd4f0', glow: 'ghost' },
    evolvesTo: ['lampent'],
  },
  lampent: {
    name: '램프라', tier: 2, attr: 'FIRE', field: 'GHOST', color: '#5a5568',
    atk: 34, range: 132, rate: 0.95, kind: 'splash', splash: 34,
    desc: '도깨비불. 반경이 두 배로 커진다.',
    look: { build: 'lamp', head: 'flame', flameColor: '#8fd4f0', glow: 'ghost' },
    evolvesTo: ['chandelure'],
  },
  chandelure: {
    name: '샹델라', tier: 3, attr: 'FIRE', field: 'GHOST', color: '#4a4558',
    atk: 128, range: 168, rate: 0.55, kind: 'splash', splash: 52, armorPierce: true,
    desc: '영혼을 태운다. 느리지만 한 방이 무겁고 방어를 무시한다.',
    look: { build: 'chandelier', head: 'flame', flameColor: '#8fd4f0', arms: 3, glow: 'ghost' },
    evolvesTo: [],
  },

  // ══════════ 고스트 · 이상해씨 라인 (지속 둔화) ══════════
  bulbasaur: {
    name: '이상해씨', tier: 1, attr: 'GRASS', field: 'GHOST', color: '#7fc98f',
    cost: 60, atk: 11, range: 120, rate: 1.05, kind: 'single',
    slowPct: 0.22, slowDur: 1.2,
    desc: '덩굴채찍으로 발을 묶는다. 둔화 지속이 길다.',
    look: { build: 'quad', head: 'round', bulb: 'seed', mark: 'spot', markColor: '#3f7a5a' },
    evolvesTo: ['ivysaur'],
  },
  ivysaur: {
    name: '이상해풀', tier: 2, attr: 'GRASS', field: 'GHOST', color: '#6fbc86',
    atk: 26, range: 138, rate: 1.1, kind: 'splash', splash: 26,
    slowPct: 0.28, slowDur: 1.3,
    desc: '꽃봉오리가 부풀었다. 둔화가 광역으로 퍼진다.',
    look: { build: 'quad', head: 'round', bulb: 'bud', mark: 'spot', markColor: '#3f7a5a' },
    evolvesTo: ['venusaur'],
  },
  venusaur: {
    name: '이상해꽃', tier: 3, attr: 'GRASS', field: 'GHOST', color: '#5fae78',
    atk: 52, range: 158, rate: 1.15, kind: 'splash', splash: 42,
    slowPct: 0.36, slowDur: 1.6,
    desc: '꽃가루로 일대를 묶는다. 광역 둔화라 다른 유닛 전체의 값을 올린다.',
    look: { build: 'quad', head: 'round', bulb: 'flower', flowerColor: '#e8709a', mark: 'spot', markColor: '#3f7a5a' },
    evolvesTo: [],
  },

  // ══════════ 강철 · 메탕 라인 (관통) ══════════
  beldum: {
    name: '메탕', tier: 1, attr: 'WATER', field: 'STEEL', color: '#6f88b8',
    cost: 60, atk: 15, range: 118, rate: 0.9, kind: 'pierce', pierce: 2,
    desc: '자력으로 떠다닌다. 기본형 중 유일하게 처음부터 관통이다.',
    look: { build: 'orb', head: 'claw', eye: 1, metal: true },
    evolvesTo: ['metang'],
  },
  metang: {
    name: '메탕구', tier: 2, attr: 'WATER', field: 'STEEL', color: '#5f7aae',
    atk: 36, range: 142, rate: 0.95, kind: 'pierce', pierce: 3,
    desc: '메탕 둘이 붙었다. 관통 수가 늘어 직선 구간에서 값이 뛴다.',
    look: { build: 'mech', head: 'visor', arms: 2, metal: true },
    evolvesTo: ['metagross'],
  },
  metagross: {
    name: '메타그로스', tier: 3, attr: 'WATER', field: 'STEEL', color: '#4f6aa0',
    atk: 84, range: 172, rate: 0.9, kind: 'pierce', pierce: 5,
    desc: '슈퍼컴퓨터 넷의 연산. 관통 5로 줄 전체를 한 발에 훑는다.',
    look: { build: 'mech', head: 'visor', legs: 4, cross: true, metal: true },
    evolvesTo: [],
  },

  // ══════════ 강철 · 코일 라인 (연사 관통) ══════════
  magnemite: {
    name: '코일', tier: 1, attr: 'WATER', field: 'STEEL', color: '#b9c4d2',
    cost: 60, atk: 8, range: 124, rate: 1.5, kind: 'single',
    desc: '전기를 흘려 잔타격을 넣는다. 강철형 회로를 잇는 기점.',
    look: { build: 'orb', head: 'round', eye: 1, magnet: 2, metal: true },
    evolvesTo: ['magneton'],
  },
  magneton: {
    name: '레어코일', tier: 2, attr: 'WATER', field: 'STEEL', color: '#a8b4c4',
    atk: 18, range: 144, rate: 1.7, kind: 'pierce', pierce: 2, salvo: 2,
    desc: '코일 셋이 뭉쳤다. 2연사 × 관통 2로 초당 타격 수가 많다.',
    look: { build: 'cluster', head: 'round', eye: 3, magnet: 6, metal: true },
    evolvesTo: ['magnezone'],
  },
  magnezone: {
    name: '자포코일', tier: 3, attr: 'WATER', field: 'STEEL', color: '#8fa0b4',
    atk: 34, range: 178, rate: 1.8, kind: 'pierce', pierce: 4, salvo: 2,
    desc: '전자포. 초당 발사 수가 가장 높아 회로 연결 보너스를 가장 크게 받는다.',
    look: { build: 'saucer', head: 'visor', eye: 3, magnet: 2, antenna: true, metal: true },
    evolvesTo: [],
  },

  // ══════════════════════════════════════════════════════════
  // 메가진화 (T4) — 혼자서는 못 한다.
  // 인접한 동료와의 유대가 메가스톤을 공명시킨다 (megaTable.js).
  // 원작에 메가진화가 실제로 존재하는 8종만 넣었다.
  // ══════════════════════════════════════════════════════════
  mega_charizard_x: {
    name: '메가리자몽X', tier: 4, attr: 'FIRE', field: 'DRAGON', color: '#2f4a8a', mega: true,
    atk: 132, range: 186, rate: 1.1, kind: 'pierce', pierce: 5, crit: 0.22,
    desc: '푸른 불꽃을 뿜는 드래곤. 관통 5 + 치명타로 어디에 놔도 강하다.',
    look: { build: 'biped', head: 'snout', horn: 2, hornStyle: 'back', wing: 'membrane', wingColor: '#1f3568', tail: 'flame', flameColor: '#5aa8ff', hand: 'claw', glow: 'blue' },
    evolvesTo: [],
  },
  mega_charizard_y: {
    name: '메가리자몽Y', tier: 4, attr: 'FIRE', field: 'DRAGON', color: '#f2731f', mega: true,
    atk: 286, range: 200, rate: 0.52, kind: 'splash', splash: 66,
    desc: '가뭄으로 하늘을 태운다. 느리지만 폭발 반경이 압도적이다.',
    look: { build: 'biped', head: 'snout', horn: 3, hornStyle: 'back', wing: 'membrane', wingColor: '#c85a1f', tail: 'flame', hand: 'claw', crest: 'fin' },
    evolvesTo: [],
  },
  mega_garchomp: {
    name: '메가한카리아스', tier: 4, attr: 'WATER', field: 'DRAGON', color: '#26507f', mega: true,
    atk: 62, range: 168, rate: 2.1, kind: 'single', salvo: 4, crit: 0.26,
    desc: '낫으로 바뀐 팔. 4연사 × 초고속 = 단일 대상 최강 DPS.',
    look: { build: 'biped', head: 'wide', horn: 2, hornStyle: 'side', wing: 'blade', tail: 'blade', hand: 'scythe', mark: 'belly', markColor: '#e05a5a', glow: 'red' },
    evolvesTo: [],
  },
  mega_machamp: {
    name: '메가괴력몬', tier: 4, attr: 'FIRE', field: 'FIGHT', color: '#6d93ad', mega: true,
    atk: 96, range: 124, rate: 1.7, kind: 'single', salvo: 5, crit: 0.3, execute: true,
    desc: '팔 넷의 연격이 체력이 깎인 적을 처형한다. 사거리는 여전히 짧다.',
    look: { build: 'humanoid', head: 'crest', arms: 4, hand: 'fist', belt: true, muscle: true, glow: 'red' },
    evolvesTo: [],
  },
  mega_alakazam: {
    name: '메가후딘', tier: 4, attr: 'WATER', field: 'PSYCHIC', color: '#c99c34', mega: true,
    atk: 168, range: 268, rate: 0.85, kind: 'single', crit: 0.35, armorPierce: true,
    desc: '사거리 268 — 맵 대부분이 사정권. 방어 무시 + 치명타 35%.',
    look: { build: 'humanoid', head: 'fox', beard: 'long', spoon: 5, armor: 'plate', armorColor: '#8a6a3a', glow: 'psy' },
    evolvesTo: [],
  },
  mega_gardevoir: {
    name: '메가가디안', tier: 4, attr: 'GRASS', field: 'PSYCHIC', color: '#f8fbff', mega: true,
    atk: 104, range: 224, rate: 1.25, kind: 'splash', splash: 46,
    slowPct: 0.5, slowDur: 1.8,
    desc: '광역 둔화 50%를 사거리 224로 뿌린다. 맵 전체의 딜 시간을 늘리는 최상위 지원.',
    look: { build: 'dancer', head: 'bowl', hair: '#4fbf82', dress: 'gown', horn: 2, mark: 'heart', markColor: '#e05a7a', glow: 'psy' },
    evolvesTo: [],
  },
  mega_gengar: {
    name: '메가팬텀', tier: 4, attr: 'GRASS', field: 'GHOST', color: '#5a3fa8', mega: true,
    atk: 320, range: 178, rate: 0.5, kind: 'splash', splash: 58,
    armorPierce: true, execute: true,
    desc: '그림자에서 끌어당긴다. 방어 무시 + 처형 — 보스 킬러.',
    look: { build: 'imp', head: 'round', ears: 'point', grin: true, spine: true, thirdEye: true, glow: 'dark' },
    evolvesTo: [],
  },
  mega_metagross: {
    name: '메가메타그로스', tier: 4, attr: 'WATER', field: 'STEEL', color: '#425f9c', mega: true,
    atk: 118, range: 196, rate: 1.15, kind: 'pierce', pierce: 8,
    desc: '팔 넷이 더 붙었다. 관통 8 — 긴 직선 구간을 한 발로 정리한다.',
    look: { build: 'mech', head: 'visor', legs: 8, cross: true, metal: true, glow: 'blue' },
    evolvesTo: [],
  },
};

// ── 파생 목록 ──
export const MONSTER_IDS = Object.keys(MONSTERS);

/** 소환으로 얻을 수 있는 기본형 (T1) */
export const STARTERS = MONSTER_IDS.filter((id) => MONSTERS[id].tier === 1);

/** 메가진화체 — 일반 진화로는 도달할 수 없다 */
export const MEGAS = MONSTER_IDS.filter((id) => MONSTERS[id].mega);

/** 최종 진화형(T3) — 메가진화의 재료가 된다 */
export const FINALS = MONSTER_IDS.filter((id) => MONSTERS[id].tier === 3);

/**
 * 개발용 데이터 검증 — 진화 링크가 끊기거나 티어가 어긋나면 잡아낸다.
 * main.js 가 부팅 때 한 번 돌린다.
 */
export function validateMonsterData() {
  const errs = [];
  for (const [id, m] of Object.entries(MONSTERS)) {
    if (!ATTR[m.attr]) errs.push(`${id}: 알 수 없는 속성 ${m.attr}`);
    if (!FIELD[m.field]) errs.push(`${id}: 알 수 없는 종족 ${m.field}`);
    if (m.tier === 1 && !m.cost) errs.push(`${id}: T1 인데 배치 비용이 없다`);
    for (const to of m.evolvesTo || []) {
      const t = MONSTERS[to];
      if (!t) { errs.push(`${id} → ${to}: 대상이 없다`); continue; }
      if (t.tier !== m.tier + 1) errs.push(`${id}(T${m.tier}) → ${to}(T${t.tier}): 티어가 한 칸이 아니다`);
    }
    if (m.tier === 4 && !m.mega) errs.push(`${id}: T4 인데 mega 표시가 없다`);
    if (m.mega && (m.evolvesTo || []).length) errs.push(`${id}: 메가는 더 진화할 수 없다`);
  }
  // 모든 T1 은 T3 까지 이어져야 한다
  for (const id of STARTERS) {
    let cur = id, steps = 1;
    while ((MONSTERS[cur].evolvesTo || []).length) { cur = MONSTERS[cur].evolvesTo[0]; steps++; }
    if (steps !== 3) errs.push(`${id}: 진화 단계가 ${steps}단이다 (3단이어야 함)`);
  }
  return errs;
}
