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

// ── 타입 (원작 그대로) ──
// 예전에는 불꽃▶풀▶물 3각으로 줄여 놓고 원작 타입이 셋 중 하나가 아니면
// 대표색으로 때웠다. "알통몬이 왜 불꽃이냐"는 지적이 정확했다.
// 지금은 각 포켓몬이 원작의 주 타입을 그대로 들고, 상성도 원작 표를 쓴다.
// 색은 원작 타입 컬러 그대로다.
export const ATTR = {
  NORMAL:   { id: 'NORMAL',   name: '노말',   color: '#a8a77a', mark: '⬜' },
  FIRE:     { id: 'FIRE',     name: '불꽃',   color: '#ee8130', mark: '🔥' },
  WATER:    { id: 'WATER',    name: '물',     color: '#6390f0', mark: '💧' },
  ELECTRIC: { id: 'ELECTRIC', name: '전기',   color: '#f7d02c', mark: '⚡' },
  GRASS:    { id: 'GRASS',    name: '풀',     color: '#7ac74c', mark: '🌿' },
  ICE:      { id: 'ICE',      name: '얼음',   color: '#96d9d6', mark: '❄' },
  FIGHT:    { id: 'FIGHT',    name: '격투',   color: '#c22e28', mark: '👊' },
  POISON:   { id: 'POISON',   name: '독',     color: '#a33ea1', mark: '☠' },
  GROUND:   { id: 'GROUND',   name: '땅',     color: '#e2bf65', mark: '🏜' },
  FLYING:   { id: 'FLYING',   name: '비행',   color: '#a98ff3', mark: '🪶' },
  PSYCHIC:  { id: 'PSYCHIC',  name: '에스퍼', color: '#f95587', mark: '🔮' },
  BUG:      { id: 'BUG',      name: '벌레',   color: '#a6b91a', mark: '🐛' },
  ROCK:     { id: 'ROCK',     name: '바위',   color: '#b6a136', mark: '🪨' },
  GHOST:    { id: 'GHOST',    name: '고스트', color: '#735797', mark: '👻' },
  DRAGON:   { id: 'DRAGON',   name: '드래곤', color: '#6f35fc', mark: '🐉' },
  DARK:     { id: 'DARK',     name: '악',     color: '#705746', mark: '🌑' },
  STEEL:    { id: 'STEEL',    name: '강철',   color: '#b7b7ce', mark: '⚙' },
  FAIRY:    { id: 'FAIRY',    name: '페어리', color: '#d685ad', mark: '✨' },
};

// ── 배치 특성 (8방향 인접 규칙 + 시너지 그룹) ──
// 예전에는 이 축에도 타입 이름(드래곤·격투·고스트…)을 붙여 놨는데,
// 이상해씨가 '고스트 종족'이 되는 식으로 또 원작과 어긋났다.
// 지금은 "필드에서 어떻게 놓아야 하는가"만 가리키는 이름을 쓴다.
export const FIELD = {
  SWARM: { id: 'SWARM', name: '무리', mark: '🔗', hint: '뭉칠수록 강함' },
  COACH: { id: 'COACH', name: '단련', mark: '💪', hint: '이웃 공속 강화' },
  FOCUS: { id: 'FOCUS', name: '집중', mark: '🎯', hint: '이웃 사거리 강화' },
  LONE:  { id: 'LONE',  name: '고독', mark: '🕯', hint: '떨어질수록 강함' },
  LINK:  { id: 'LINK',  name: '연결', mark: '🧲', hint: '같은 특성끼리 연결' },
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
  // ══════════ 불꽃 · 파이리 라인 (무리) (광역 주력) ══════════
  charmander: {
    name: '파이리', tier: 1, attr: 'FIRE', field: 'SWARM', color: '#ff8c42',
    cost: 60, atk: 14, range: 112, rate: 1.1, kind: 'single',
    dex: '태어날 때부터 꼬리에 불꽃이 붙어 있다. 불이 꺼지면 목숨도 끝난다고 전해진다.',
    desc: '꼬리의 불꽃이 곧 기력. 값이 싸고 어디에 놔도 제 몫을 한다.',
    look: { build: 'rookie', head: 'snout', tail: 'flame', hand: 'claw', mark: 'belly', markColor: '#ffe0b5' },
    evolvesTo: ['charmeleon'],
  },
  charmeleon: {
    name: '리자드', tier: 2, attr: 'FIRE', field: 'SWARM', color: '#e2542f',
    atk: 34, range: 130, rate: 1.0, kind: 'splash', splash: 30,
    dex: '꼬리를 휘둘러 상대를 위협한다. 흥분하면 꼬리 끝이 푸르게 타오른다.',
    desc: '화염방사. 몰려오는 무리에 광역 피해를 준다.',
    look: { build: 'biped', head: 'snout', horn: 1, hornStyle: 'back', tail: 'flame', hand: 'claw', eyeColor: '#ffe066' },
    evolvesTo: ['charizard'],
  },
  charizard: {
    name: '리자몽', tier: 3, attr: 'FIRE', field: 'SWARM', color: '#f2691f',
    atk: 66, range: 158, rate: 1.0, kind: 'splash', splash: 40,
    dex: '하늘을 날며 불길을 내뿜는다. 자기보다 약한 상대에게는 절대 불을 쓰지 않는다.',
    desc: '대문자로 불태운다. 광역 반경이 넓어 굽은 길목에 놓으면 좋다.',
    look: { build: 'biped', head: 'snout', horn: 2, hornStyle: 'back', wing: 'membrane', wingColor: '#2e7fb8', tail: 'flame', hand: 'claw' },
    evolvesTo: [],
  },

  // ══════════ 드래곤 · 미뇽 라인 (무리) (관통 균형) ══════════
  dratini: {
    name: '미뇽', tier: 1, attr: 'DRAGON', field: 'SWARM', color: '#8fd4e8',
    cost: 60, atk: 12, range: 126, rate: 1.15, kind: 'single',
    dex: '평생 탈피를 반복하며 자란다. 오랫동안 환상의 포켓몬으로 여겨졌다.',
    desc: '탈피할 때마다 커진다. 사거리가 조금 길다.',
    look: { build: 'serpent', head: 'round', mark: 'belly', markColor: '#f2f7d0' },
    evolvesTo: ['dragonair'],
  },
  dragonair: {
    name: '신뇽', tier: 2, attr: 'DRAGON', field: 'SWARM', color: '#6cc3e0',
    atk: 30, range: 150, rate: 1.1, kind: 'pierce', pierce: 2,
    dex: '목의 구슬로 날씨를 바꾼다고 한다. 승천할 때 온몸에서 빛이 난다.',
    desc: '용의숨결. 일렬로 늘어선 적을 꿰뚫는다.',
    look: { build: 'serpent', head: 'round', horn: 1, orb: true, wing: 'fin', mark: 'belly', markColor: '#f2f7d0' },
    evolvesTo: ['dragonite'],
  },
  dragonite: {
    name: '망나뇽', tier: 3, attr: 'DRAGON', field: 'SWARM', color: '#f0a83c',
    atk: 72, range: 172, rate: 1.05, kind: 'pierce', pierce: 4, crit: 0.12,
    dex: '바다를 건너 조난자를 구해 준다는 이야기가 전해진다. 마음씨가 아주 상냥하다.',
    desc: '신속으로 먼저 때린다. 관통 4회 + 치명타로 안정적인 주력.',
    look: { build: 'biped', head: 'snout', horn: 2, wing: 'membrane', wingColor: '#5fa8d0', tail: 'thick', hand: 'claw', mark: 'belly', markColor: '#ffe9b8' },
    evolvesTo: [],
  },

  // ══════════ 드래곤 · 딥상어동 라인 (무리) (고속 연사) ══════════
  gible: {
    name: '딥상어동', tier: 1, attr: 'DRAGON', field: 'SWARM', color: '#4a7fc1',
    cost: 60, atk: 11, range: 108, rate: 1.35, kind: 'single',
    dex: '굴 속에서 지나가는 먹이를 기다린다. 반가우면 일단 물고 본다.',
    desc: '뭐든 씹는다. 발사 속도가 빨라 둔화와 궁합이 좋다.',
    look: { build: 'rookie', head: 'wide', teeth: true, tail: 'thick', mark: 'belly', markColor: '#e05a5a' },
    evolvesTo: ['gabite'],
  },
  gabite: {
    name: '한바이트', tier: 2, attr: 'DRAGON', field: 'SWARM', color: '#3f6fae',
    atk: 24, range: 128, rate: 1.6, kind: 'single', salvo: 2,
    dex: '반짝이는 것을 좋아해 둥지에 보석을 모아 둔다. 비늘은 약재로 쓰인다.',
    desc: '드래곤클로 2연타. 초당 타격 수가 라인 중 가장 많다.',
    look: { build: 'biped', head: 'wide', teeth: true, wing: 'fin', tail: 'thick', hand: 'claw', mark: 'belly', markColor: '#e05a5a' },
    evolvesTo: ['garchomp'],
  },
  garchomp: {
    name: '한카리아스', tier: 3, attr: 'DRAGON', field: 'SWARM', color: '#2f5f9e',
    atk: 48, range: 150, rate: 1.75, kind: 'single', salvo: 3, crit: 0.15,
    dex: '접힌 날개를 펴면 제트기처럼 난다. 음속으로 날면 소리조차 남지 않는다.',
    desc: '제트기처럼 파고든다. 3연사 × 고속 = 단일 대상 최고 DPS.',
    look: { build: 'biped', head: 'wide', horn: 2, hornStyle: 'side', wing: 'fin', tail: 'blade', hand: 'claw', mark: 'belly', markColor: '#e05a5a' },
    evolvesTo: [],
  },

  // ══════════ 격투 · 알통몬 라인 (단련) (근접 폭딜) ══════════
  machop: {
    name: '알통몬', tier: 1, attr: 'FIGHT', field: 'COACH', color: '#9fb4c4',
    cost: 60, atk: 17, range: 96, rate: 0.95, kind: 'single',
    dex: '온몸이 근육 덩어리다. 하루에 씨름 수련을 500번 반복한다.',
    desc: '사거리가 짧은 대신 한 방이 세다. 길에 바짝 붙여 놓아야 한다.',
    look: { build: 'humanoid', head: 'crest', hand: 'fist', mark: 'stripe', markColor: '#6a8290' },
    evolvesTo: ['machoke'],
  },
  machoke: {
    name: '근육몬', tier: 2, attr: 'FIGHT', field: 'COACH', color: '#8aa5b8',
    atk: 42, range: 104, rate: 0.95, kind: 'single', crit: 0.14,
    dex: '허리띠로 힘을 억제하고 있다. 벗으면 스스로도 감당하지 못한다.',
    desc: '가라테촙. 치명타가 붙어 순간 화력이 튄다.',
    look: { build: 'humanoid', head: 'crest', hand: 'fist', belt: true, mark: 'stripe', markColor: '#5f7b8a' },
    evolvesTo: ['machamp'],
  },
  machamp: {
    name: '괴력몬', tier: 3, attr: 'FIGHT', field: 'COACH', color: '#7d9fb4',
    atk: 58, range: 112, rate: 1.5, kind: 'single', salvo: 4, crit: 0.2,
    dex: '팔 네 개로 1초에 천 번의 펀치를 날린다. 섬세한 작업에는 오히려 서툴다.',
    desc: '팔 넷으로 연속 펀치. 사거리를 버린 대신 근거리 화력이 압도적.',
    look: { build: 'humanoid', head: 'crest', arms: 4, hand: 'fist', belt: true, mark: 'stripe', markColor: '#5f7b8a' },
    evolvesTo: [],
  },

  // ══════════ 물 · 발챙이 라인 (단련) (둔화 제어) ══════════
  poliwag: {
    name: '발챙이', tier: 1, attr: 'WATER', field: 'COACH', color: '#5aa8e0',
    cost: 60, atk: 9, range: 122, rate: 1.0, kind: 'single',
    slowPct: 0.25, slowDur: 1.0,
    dex: '배의 소용돌이는 내장이 비쳐 보이는 것이다. 다리가 짧아 헤엄이 더 편하다.',
    desc: '배의 소용돌이로 홀린다. 화력은 낮지만 다른 유닛의 딜 시간을 벌어준다.',
    look: { build: 'blob', head: 'round', spiral: true, tail: 'thin' },
    evolvesTo: ['poliwhirl'],
  },
  poliwhirl: {
    name: '슈륙챙이', tier: 2, attr: 'WATER', field: 'COACH', color: '#4a90d9',
    atk: 24, range: 138, rate: 1.25, kind: 'single', slowPct: 0.32, slowDur: 1.2,
    dex: '몸이 늘 젖어 있어 적의 손아귀에서 잘 빠져나간다. 소용돌이가 도는 방향이 바뀐다.',
    desc: '물의파동. 둔화 지속이 길어져 경로 초입이 제자리다.',
    look: { build: 'humanoid', head: 'round', spiral: true, hand: 'glove' },
    evolvesTo: ['poliwrath'],
  },
  poliwrath: {
    name: '강챙이', tier: 3, attr: 'WATER', field: 'COACH', color: '#3a72b8',
    atk: 40, range: 132, rate: 1.5, kind: 'single', salvo: 3,
    slowPct: 0.42, slowDur: 1.4,
    dex: '단련된 근육으로 지치지 않고 헤엄친다. 넓은 바다도 쉬지 않고 건넌다.',
    desc: '더블펀치 3연타로 둔화를 끊김 없이 유지한다. 맵 전체의 딜 시간을 늘리는 축.',
    look: { build: 'humanoid', head: 'round', spiral: true, hand: 'glove', muscle: true },
    evolvesTo: [],
  },

  // ══════════ 불꽃 · 뚜꾸리 라인 (단련) (광역) ══════════
  tepig: {
    name: '뚜꾸리', tier: 1, attr: 'FIRE', field: 'COACH', color: '#e08a6a',
    cost: 60, atk: 13, range: 106, rate: 1.05, kind: 'splash', splash: 20,
    dex: '코로 불을 뿜어 나무열매를 구워 먹는다. 가끔 새까맣게 태워 버린다.',
    desc: '코에서 불씨를 뿜는다. 처음부터 광역이라 초반 벌레 떼에 강하다.',
    look: { build: 'quad', head: 'snout', snoutColor: '#f2c4a0', tail: 'curl', mark: 'stripe', markColor: '#3a2a24' },
    evolvesTo: ['pignite'],
  },
  pignite: {
    name: '차오꿀', tier: 2, attr: 'FIRE', field: 'COACH', color: '#d8703f',
    atk: 32, range: 118, rate: 1.0, kind: 'splash', splash: 32,
    dex: '먹을수록 뱃속의 불꽃이 커지고 몸놀림이 빨라진다.',
    desc: '화염보스. 반경이 넓어져 겹치는 경로에서 값이 뛴다.',
    look: { build: 'humanoid', head: 'snout', snoutColor: '#f2c4a0', belt: true, mark: 'stripe', markColor: '#2f2018' },
    evolvesTo: ['emboar'],
  },
  emboar: {
    name: '엠보아', tier: 3, attr: 'FIRE', field: 'COACH', color: '#c2502a',
    atk: 74, range: 138, rate: 0.9, kind: 'splash', splash: 50,
    dex: '턱수염에 불을 붙이고 싸운다. 동료를 위해서라면 몸을 아끼지 않는다.',
    desc: '히트스탬프. 광역 반경 50 — 맵에서 가장 넓게 터진다.',
    look: { build: 'humanoid', head: 'snout', beard: 'flame', muscle: true, belt: true, mark: 'stripe', markColor: '#2f2018' },
    evolvesTo: [],
  },

  // ══════════ 에스퍼 · 캐이시 라인 (집중) (초장거리 단일) ══════════
  abra: {
    name: '캐이시', tier: 1, attr: 'PSYCHIC', field: 'FOCUS', color: '#e8c05a',
    cost: 60, atk: 12, range: 148, rate: 0.85, kind: 'single',
    dex: '하루 18시간을 잔다. 자면서도 위험을 감지해 텔레포트로 달아난다.',
    desc: '하루 18시간 잔다. 사거리가 라인 중 가장 길다.',
    look: { build: 'rookie', head: 'fox', tail: 'thick', armor: 'plate', armorColor: '#8a6a3a' },
    evolvesTo: ['kadabra'],
  },
  kadabra: {
    name: '윤겔라', tier: 2, attr: 'PSYCHIC', field: 'FOCUS', color: '#dcb44e',
    atk: 33, range: 178, rate: 0.9, kind: 'single',
    dex: '이마의 별 모양이 강할수록 초능력이 세다. 주변에 알파파를 뿜는다.',
    desc: '스푼을 쥐면 초능력이 배가 된다. 뒤에서 길목을 통째로 덮는다.',
    look: { build: 'humanoid', head: 'fox', star: true, spoon: true, tail: 'thick', armor: 'plate', armorColor: '#8a6a3a' },
    evolvesTo: ['alakazam'],
  },
  alakazam: {
    name: '후딘', tier: 3, attr: 'PSYCHIC', field: 'FOCUS', color: '#d0a842',
    atk: 78, range: 212, rate: 0.95, kind: 'single', crit: 0.18,
    dex: '지능지수 5000. 태어나서 지금까지의 모든 일을 기억하고 있다.',
    desc: 'IQ 5000. 사거리 212로 맵 절반을 사정권에 넣는다.',
    look: { build: 'humanoid', head: 'fox', beard: 'long', spoon: 2, armor: 'plate', armorColor: '#8a6a3a' },
    evolvesTo: [],
  },

  // ══════════ 에스퍼 · 랄토스 라인 (집중) (이웃 지원) ══════════
  ralts: {
    name: '랄토스', tier: 1, attr: 'PSYCHIC', field: 'FOCUS', color: '#e8eef2',
    cost: 60, atk: 10, range: 132, rate: 1.0, kind: 'single',
    dex: '뿔로 사람의 감정을 읽는다. 상대가 기뻐하면 함께 기뻐한다.',
    desc: '뿔로 감정을 읽는다. 인접한 동료의 사거리를 늘려주는 지원형.',
    look: { build: 'rookie', head: 'bowl', hair: '#5ac48a', dress: true },
    evolvesTo: ['kirlia'],
  },
  kirlia: {
    name: '키르리아', tier: 2, attr: 'PSYCHIC', field: 'FOCUS', color: '#f0f4f7',
    atk: 27, range: 154, rate: 1.15, kind: 'single', slowPct: 0.2, slowDur: 0.8,
    dex: '트레이너가 즐거우면 춤을 추듯 돌며 기뻐한다. 아침 햇살을 받으면 초능력이 커진다.',
    desc: '춤추면 공간이 뒤틀린다. 가벼운 둔화가 붙는다.',
    look: { build: 'dancer', head: 'bowl', hair: '#5ac48a', dress: true },
    evolvesTo: ['gardevoir'],
  },
  gardevoir: {
    name: '가디안', tier: 3, attr: 'PSYCHIC', field: 'FOCUS', color: '#f4f7fa',
    atk: 62, range: 190, rate: 1.2, kind: 'single', slowPct: 0.28, slowDur: 1.0,
    dex: '트레이너를 지키기 위해서라면 목숨도 아끼지 않는다. 작은 블랙홀을 만들 수 있다.',
    desc: '문피포스. 사거리·둔화·화력을 고루 갖춘 지원 코어.',
    look: { build: 'dancer', head: 'bowl', hair: '#4fbf82', dress: 'gown', horn: 1, mark: 'heart', markColor: '#e05a7a' },
    evolvesTo: [],
  },

  // ══════════ 페어리 · 토게피 라인 (집중) (다중 타격) ══════════
  togepi: {
    name: '토게피', tier: 1, attr: 'FAIRY', field: 'FOCUS', color: '#f7f2e0',
    cost: 60, atk: 11, range: 118, rate: 1.2, kind: 'single',
    dex: '껍질 안에 행복이 가득 차 있다고 한다. 소중히 다루면 행복을 나눠 준다.',
    desc: '껍질에 행복이 가득하다. 잔타격이 잦아 둔화 유지에 쓰인다.',
    look: { build: 'egg', head: 'round', mark: 'spot', markColor: '#e05a7a' },
    evolvesTo: ['togetic'],
  },
  togetic: {
    name: '토게틱', tier: 2, attr: 'FAIRY', field: 'FOCUS', color: '#f4efe0',
    atk: 22, range: 148, rate: 1.4, kind: 'single', salvo: 2,
    dex: '착한 마음을 가진 사람 앞에만 나타나 행복의 가루를 뿌린다.',
    desc: '행복의알을 나눠준다. 2연사로 꾸준히 긁는다.',
    look: { build: 'flyer', head: 'round', wing: 'small', mark: 'spot', markColor: '#e05a7a' },
    evolvesTo: ['togekiss'],
  },
  togekiss: {
    name: '토게키스', tier: 3, attr: 'FAIRY', field: 'FOCUS', color: '#fbf6e8',
    atk: 44, range: 182, rate: 1.35, kind: 'pierce', pierce: 3, salvo: 2,
    dex: '다툼이 없는 곳에만 나타난다. 나누고 아끼는 사람에게 선물을 가져다준다.',
    desc: '에어슬래시 2연사 × 관통 3. 넓게 퍼진 적을 한 번에 훑는다.',
    look: { build: 'flyer', head: 'round', wing: 'broad', mark: 'spot', markColor: '#e05a7a' },
    evolvesTo: [],
  },

  // ══════════ 고스트 · 고오스 라인 (고독) (방어 무시) ══════════
  gastly: {
    name: '고오스', tier: 1, attr: 'GHOST', field: 'LONE', color: '#8a6fd0',
    cost: 60, atk: 13, range: 116, rate: 1.05, kind: 'single', armorPierce: true,
    dex: '가스로 이루어진 몸이다. 강한 바람이 불면 흩어져 버린다.',
    desc: '가스 덩어리라 방어력을 무시한다. 단단한 적에게 강하다.',
    look: { build: 'gas', head: 'round', eyes: 'sharp', glow: 'dark' },
    evolvesTo: ['haunter'],
  },
  haunter: {
    name: '고우스트', tier: 2, attr: 'GHOST', field: 'LONE', color: '#7b5fc4',
    atk: 31, range: 136, rate: 1.15, kind: 'single', armorPierce: true,
    dex: '어둠 속에서 혀로 핥아 상대의 생명력을 빼앗는다. 벽을 통과해 다가온다.',
    desc: '섀도볼. 방어 무시가 유지되어 중반 탱커를 녹인다.',
    look: { build: 'gas', head: 'round', hands: 'float', eyes: 'sharp', glow: 'dark' },
    evolvesTo: ['gengar'],
  },
  gengar: {
    name: '팬텀', tier: 3, attr: 'GHOST', field: 'LONE', color: '#6b4fb8',
    atk: 70, range: 162, rate: 1.25, kind: 'single', armorPierce: true, crit: 0.22,
    dex: '그림자에 숨어 체온을 빼앗는다. 오싹한 한기가 느껴지면 근처에 있는 것이다.',
    desc: '그림자를 밟으면 끝. 방어 무시 + 치명타로 정예·보스를 담당한다.',
    look: { build: 'imp', head: 'round', ears: 'point', grin: true, spine: true, glow: 'dark' },
    evolvesTo: [],
  },

  // ══════════ 고스트 · 불켜미 라인 (고독) (광역 폭발) ══════════
  litwick: {
    name: '불켜미', tier: 1, attr: 'GHOST', field: 'LONE', color: '#e8e2d0',
    cost: 60, atk: 12, range: 110, rate: 1.0, kind: 'splash', splash: 18,
    dex: '머리의 불꽃으로 사람을 홀린다. 흡수한 생명력이 곧 그 불꽃의 연료다.',
    desc: '생명을 빨아 불꽃을 키운다. 처음부터 작게 터진다.',
    look: { build: 'candle', head: 'flame', flameColor: '#8fd4f0', glow: 'ghost' },
    evolvesTo: ['lampent'],
  },
  lampent: {
    name: '램프라', tier: 2, attr: 'GHOST', field: 'LONE', color: '#5a5568',
    atk: 34, range: 132, rate: 0.95, kind: 'splash', splash: 34,
    dex: '꺼져 가는 생명의 곁을 맴돈다. 병원 근처에 자주 나타난다.',
    desc: '도깨비불. 반경이 두 배로 커진다.',
    look: { build: 'lamp', head: 'flame', flameColor: '#8fd4f0', glow: 'ghost' },
    evolvesTo: ['chandelure'],
  },
  chandelure: {
    name: '샹델라', tier: 3, attr: 'GHOST', field: 'LONE', color: '#4a4558',
    atk: 128, range: 168, rate: 0.55, kind: 'splash', splash: 52, armorPierce: true,
    dex: '혼을 태워 저승으로 보낸다. 그 불꽃에 그을리면 몸만 남는다.',
    desc: '영혼을 태운다. 느리지만 한 방이 무겁고 방어를 무시한다.',
    look: { build: 'chandelier', head: 'flame', flameColor: '#8fd4f0', arms: 3, glow: 'ghost' },
    evolvesTo: [],
  },

  // ══════════ 풀 · 이상해씨 라인 (고독) (지속 둔화) ══════════
  bulbasaur: {
    name: '이상해씨', tier: 1, attr: 'GRASS', field: 'LONE', color: '#7fc98f',
    cost: 60, atk: 11, range: 120, rate: 1.05, kind: 'single',
    slowPct: 0.22, slowDur: 1.2,
    dex: '등의 씨앗이 영양을 받아 자란다. 며칠은 아무것도 먹지 않아도 버틴다.',
    desc: '덩굴채찍으로 발을 묶는다. 둔화 지속이 길다.',
    look: { build: 'quad', head: 'round', bulb: 'seed', mark: 'spot', markColor: '#3f7a5a' },
    evolvesTo: ['ivysaur'],
  },
  ivysaur: {
    name: '이상해풀', tier: 2, attr: 'GRASS', field: 'LONE', color: '#6fbc86',
    atk: 26, range: 138, rate: 1.1, kind: 'splash', splash: 26,
    slowPct: 0.28, slowDur: 1.3,
    dex: '봉오리가 커질수록 두 다리로 서 있는 시간이 길어진다. 꽃이 필 때가 가까웠다.',
    desc: '꽃봉오리가 부풀었다. 둔화가 광역으로 퍼진다.',
    look: { build: 'quad', head: 'round', bulb: 'bud', mark: 'spot', markColor: '#3f7a5a' },
    evolvesTo: ['venusaur'],
  },
  venusaur: {
    name: '이상해꽃', tier: 3, attr: 'GRASS', field: 'LONE', color: '#5fae78',
    atk: 52, range: 158, rate: 1.15, kind: 'splash', splash: 42,
    slowPct: 0.36, slowDur: 1.6,
    dex: '등의 꽃에서 나는 향기가 사람의 마음을 가라앉힌다. 햇빛을 받으면 더 커진다.',
    desc: '꽃가루로 일대를 묶는다. 광역 둔화라 다른 유닛 전체의 값을 올린다.',
    look: { build: 'quad', head: 'round', bulb: 'flower', flowerColor: '#e8709a', mark: 'spot', markColor: '#3f7a5a' },
    evolvesTo: [],
  },

  // ══════════ 강철 · 메탕 라인 (연결) (관통) ══════════
  beldum: {
    name: '메탕', tier: 1, attr: 'STEEL', field: 'LINK', color: '#6f88b8',
    cost: 60, atk: 15, range: 118, rate: 0.9, kind: 'pierce', pierce: 2,
    dex: '자력으로 떠서 이동한다. 자기장에 반응해 무리 지어 움직인다.',
    desc: '자력으로 떠다닌다. 기본형 중 유일하게 처음부터 관통이다.',
    look: { build: 'orb', head: 'claw', eye: 1, metal: true },
    evolvesTo: ['metang'],
  },
  metang: {
    name: '메탕구', tier: 2, attr: 'STEEL', field: 'LINK', color: '#5f7aae',
    atk: 36, range: 142, rate: 0.95, kind: 'pierce', pierce: 3,
    dex: '메탕 두 마리가 하나로 합쳐진 모습. 두 뇌가 이어져 초능력이 강해졌다.',
    desc: '메탕 둘이 붙었다. 관통 수가 늘어 직선 구간에서 값이 뛴다.',
    look: { build: 'mech', head: 'visor', arms: 2, metal: true },
    evolvesTo: ['metagross'],
  },
  metagross: {
    name: '메타그로스', tier: 3, attr: 'STEEL', field: 'LINK', color: '#4f6aa0',
    atk: 84, range: 172, rate: 0.9, kind: 'pierce', pierce: 5,
    dex: '네 개의 뇌가 슈퍼컴퓨터를 능가한다. 먹이를 배로 눌러 붙잡는다.',
    desc: '슈퍼컴퓨터 넷의 연산. 관통 5로 줄 전체를 한 발에 훑는다.',
    look: { build: 'mech', head: 'visor', legs: 4, cross: true, metal: true },
    evolvesTo: [],
  },

  // ══════════ 전기 · 코일 라인 (연결) (연사 관통) ══════════
  magnemite: {
    name: '코일', tier: 1, attr: 'ELECTRIC', field: 'LINK', color: '#b9c4d2',
    cost: 60, atk: 8, range: 124, rate: 1.5, kind: 'single',
    dex: '양옆의 자석으로 전자파를 낸다. 발전소 근처에 자주 나타난다.',
    desc: '전기를 흘려 잔타격을 넣는다. 강철형 회로를 잇는 기점.',
    look: { build: 'orb', head: 'round', eye: 1, magnet: 2, metal: true },
    evolvesTo: ['magneton'],
  },
  magneton: {
    name: '레어코일', tier: 2, attr: 'ELECTRIC', field: 'LINK', color: '#a8b4c4',
    atk: 18, range: 144, rate: 1.7, kind: 'pierce', pierce: 2, salvo: 2,
    dex: '코일 세 마리가 이어져 붙었다. 주변 전자기기가 오작동한다.',
    desc: '코일 셋이 뭉쳤다. 2연사 × 관통 2로 초당 타격 수가 많다.',
    look: { build: 'cluster', head: 'round', eye: 3, magnet: 6, metal: true },
    evolvesTo: ['magnezone'],
  },
  magnezone: {
    name: '자포코일', tier: 3, attr: 'ELECTRIC', field: 'LINK', color: '#8fa0b4',
    atk: 34, range: 178, rate: 1.8, kind: 'pierce', pierce: 4, salvo: 2,
    dex: '특수한 자기장을 받아 진화했다. 우주에서 온 전파를 계속 수신하고 있다.',
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
    name: '메가리자몽X', tier: 4, attr: 'FIRE', field: 'SWARM', color: '#2f4a8a', mega: true,
    atk: 132, range: 186, rate: 1.1, kind: 'pierce', pierce: 5, crit: 0.22,
    dex: '푸른 불꽃이 입에서 새어 나온다. 힘이 넘쳐 검게 물든 몸.',
    desc: '푸른 불꽃을 뿜는 드래곤. 관통 5 + 치명타로 어디에 놔도 강하다.',
    look: { build: 'biped', head: 'snout', horn: 2, hornStyle: 'back', wing: 'membrane', wingColor: '#1f3568', tail: 'flame', flameColor: '#5aa8ff', hand: 'claw', glow: 'blue' },
    evolvesTo: [],
  },
  mega_charizard_y: {
    name: '메가리자몽Y', tier: 4, attr: 'FIRE', field: 'SWARM', color: '#f2731f', mega: true,
    atk: 286, range: 200, rate: 0.52, kind: 'splash', splash: 66,
    dex: '하늘의 지배자. 날개의 힘이 극한까지 올라 성층권까지 날아오른다.',
    desc: '가뭄으로 하늘을 태운다. 느리지만 폭발 반경이 압도적이다.',
    look: { build: 'biped', head: 'snout', horn: 3, hornStyle: 'back', wing: 'membrane', wingColor: '#c85a1f', tail: 'flame', hand: 'claw', crest: 'fin' },
    evolvesTo: [],
  },
  mega_garchomp: {
    name: '메가한카리아스', tier: 4, attr: 'DRAGON', field: 'SWARM', color: '#26507f', mega: true,
    atk: 62, range: 168, rate: 2.1, kind: 'single', salvo: 4, crit: 0.26,
    dex: '팔이 거대한 낫으로 바뀌었다. 넘치는 힘을 스스로도 다 감당하지 못한다.',
    desc: '낫으로 바뀐 팔. 4연사 × 초고속 = 단일 대상 최강 DPS.',
    look: { build: 'biped', head: 'wide', horn: 2, hornStyle: 'side', wing: 'blade', tail: 'blade', hand: 'scythe', mark: 'belly', markColor: '#e05a5a', glow: 'red' },
    evolvesTo: [],
  },
  // 괴력몬은 원작에 메가진화가 없다 — 대신 초대 메가 3종에 드는 이상해꽃을 넣었다.
  mega_venusaur: {
    name: '메가이상해꽃', tier: 4, attr: 'GRASS', field: 'LONE', color: '#4e9e6c', mega: true,
    atk: 92, range: 186, rate: 1.2, kind: 'splash', splash: 62, slowPct: 0.42, slowDur: 2.4,
    dex: '등의 꽃이 통째로 벌어져 두 겹이 되었다. 뿌리를 내려 몸을 단단히 지탱한다.',
    desc: '등의 꽃이 통째로 피어난다. 광역 반경 62 + 둔화 42% — 필드 전체의 화력을 끌어올린다.',
    look: { build: 'quad', head: 'round', bloom: 'mega', mark: 'spot', markColor: '#2f6b45', glow: 'green' },
    evolvesTo: [],
  },
  mega_alakazam: {
    name: '메가후딘', tier: 4, attr: 'PSYCHIC', field: 'FOCUS', color: '#c99c34', mega: true,
    atk: 168, range: 268, rate: 0.85, kind: 'single', crit: 0.35, armorPierce: true,
    dex: '스푼이 다섯 개로 늘었다. 뇌세포가 계속 늘어나 지능이 한계를 넘었다.',
    desc: '사거리 268 — 맵 대부분이 사정권. 방어 무시 + 치명타 35%.',
    look: { build: 'humanoid', head: 'fox', beard: 'long', spoon: 5, armor: 'plate', armorColor: '#8a6a3a', glow: 'psy' },
    evolvesTo: [],
  },
  mega_gardevoir: {
    name: '메가가디안', tier: 4, attr: 'PSYCHIC', field: 'FOCUS', color: '#f8fbff', mega: true,
    atk: 104, range: 224, rate: 1.25, kind: 'splash', splash: 46,
    slowPct: 0.5, slowDur: 1.8,
    dex: '트레이너를 지키려는 마음이 형태로 나타났다. 초능력이 하얀 드레스처럼 퍼진다.',
    desc: '광역 둔화 50%를 사거리 224로 뿌린다. 맵 전체의 딜 시간을 늘리는 최상위 지원.',
    look: { build: 'dancer', head: 'bowl', hair: '#4fbf82', dress: 'gown', horn: 2, mark: 'heart', markColor: '#e05a7a', glow: 'psy' },
    evolvesTo: [],
  },
  mega_gengar: {
    name: '메가팬텀', tier: 4, attr: 'GHOST', field: 'LONE', color: '#5a3fa8', mega: true,
    atk: 320, range: 178, rate: 0.5, kind: 'splash', splash: 58,
    armorPierce: true, execute: true,
    dex: '세 번째 눈이 열려 다른 차원을 본다. 그림자에서 빠져나오지 못한다.',
    desc: '그림자에서 끌어당긴다. 방어 무시 + 처형 — 보스 킬러.',
    look: { build: 'imp', head: 'round', ears: 'point', grin: true, spine: true, thirdEye: true, glow: 'dark' },
    evolvesTo: [],
  },
  mega_metagross: {
    name: '메가메타그로스', tier: 4, attr: 'STEEL', field: 'LINK', color: '#425f9c', mega: true,
    atk: 118, range: 196, rate: 1.15, kind: 'pierce', pierce: 8,
    dex: '팔이 여덟. 네 개의 뇌가 하나로 이어져 연산 속도가 폭발적으로 늘었다.',
    desc: '팔 넷이 더 붙었다. 관통 8 — 긴 직선 구간을 한 발로 정리한다.',
    look: { build: 'mech', head: 'visor', legs: 8, cross: true, metal: true, glow: 'blue' },
    evolvesTo: [],
  },
};

// 각 정의에 자기 id 를 심어 둔다.
// 렌더러가 SPRITES[def.id] / ATTACK[def.id] 로 전용 도트를 찾기 때문에,
// 이게 없으면 50종 전부가 부위 조합 폴백으로 그려진다.
for (const [id, m] of Object.entries(MONSTERS)) m.id = id;

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
    if (!ATTR[m.attr]) errs.push(`${id}: 알 수 없는 타입 ${m.attr}`);
    if (!FIELD[m.field]) errs.push(`${id}: 알 수 없는 배치 특성 ${m.field}`);
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
