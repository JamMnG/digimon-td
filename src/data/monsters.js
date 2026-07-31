// ─────────────────────────────────────────────────────────────
// monsters.js — 타워(디지몬) 데이터 + 진화 트리 정의
//
// ★ IP 격리 계층 ★
// 이름·색상·설명 등 저작권 관련 요소는 전부 이 파일에만 존재한다.
// 다른 모듈은 id / tier / attr / field / 스탯만 참조하므로,
// 이 파일의 name·color·desc만 교체하면 오리지널 몬스터로 전환된다.
//
// 티어: 1 성장기 → 2 성숙기 → 3 완전체 → 4 궁극체
// T2→T3 에서 2갈래로 분기하고, 각 분기가 고유한 T4를 갖는다. (라인당 6종)
// ─────────────────────────────────────────────────────────────

// ── 속성 (3속성 순환 상성) ──
export const ATTR = {
  VACCINE: { id: 'VACCINE', name: '백신',     color: '#4fc3f7', mark: '✚' },
  DATA:    { id: 'DATA',    name: '데이터',   color: '#6ddf9c', mark: '◆' },
  VIRUS:   { id: 'VIRUS',   name: '바이러스', color: '#c77dff', mark: '☣' },
};

// ── 종족 (시너지 그룹) ──
export const FIELD = {
  DRAGON:  { id: 'DRAGON',  name: '용형',   mark: '🜂' },
  BEAST:   { id: 'BEAST',   name: '수인형', mark: '🜃' },
  ANGEL:   { id: 'ANGEL',   name: '천사형', mark: '🜁' },
  DEMON:   { id: 'DEMON',   name: '마인형', mark: '🜄' },
  MACHINE: { id: 'MACHINE', name: '기계형', mark: '⚙' },
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
  // ══ A라인 : 아구몬 (용형 / 근중거리 주력) ══
  agumon: {
    name: '아구몬', tier: 1, attr: 'VACCINE', field: 'DRAGON', color: '#ff8c42',
    cost: 60, atk: 14, range: 112, rate: 1.1, kind: 'single',
    desc: '기본 화력. 값이 싸고 어디에 놔도 제 몫을 한다.',
    look: { build: 'rookie', head: 'snout', horn: 0, tail: 'thick', hand: 'claw', mark: 'belly', markColor: '#ffe0b5' },
    evolvesTo: ['greymon'],
  },
  greymon: {
    name: '그레이몬', tier: 2, attr: 'VACCINE', field: 'DRAGON', color: '#ff6b2b',
    atk: 34, range: 130, rate: 1.0, kind: 'splash', splash: 30,
    desc: '메가 플레임. 몰려오는 무리에 광역 피해.',
    look: { build: 'biped', head: 'helm', helmColor: '#c8823f', horn: 2, hornStyle: 'back', tail: 'thick', hand: 'claw', mark: 'stripe', eyeColor: '#ffe066' },
    evolvesTo: ['metalgreymon', 'skullgreymon'],
  },
  metalgreymon: {
    name: '메탈그레이몬', tier: 3, attr: 'VACCINE', field: 'MACHINE', color: '#e0603a',
    atk: 62, range: 158, rate: 0.85, kind: 'pierce', pierce: 3,
    desc: '기가 블래스터. 일렬로 늘어선 적을 관통한다. 종족이 기계형으로 바뀐다.',
    look: { build: 'mech', head: 'helm', helmColor: '#8f9aa6', horn: 2, wing: 'metal', tail: 'thick', hand: 'cannon', mark: 'plate', alt: '#7d8794' },
    evolvesTo: ['wargreymon'],
  },
  skullgreymon: {
    name: '스컬그레이몬', tier: 3, attr: 'VIRUS', field: 'DEMON', color: '#9aa0a6',
    atk: 155, range: 178, rate: 0.35, kind: 'splash', splash: 56,
    desc: '그라운드 제로. 매우 느리지만 한 방이 무겁다. 속성이 바이러스로 반전된다.',
    look: { build: 'wraith', head: 'skull', horn: 2, hornStyle: 'back', tail: 'blade', hand: 'claw', mark: 'rib', glow: 'dark', alt: '#7f858d' },
    evolvesTo: ['blackwargreymon'],
  },
  wargreymon: {
    name: '워그레이몬', tier: 4, attr: 'VACCINE', field: 'DRAGON', color: '#ff5722',
    atk: 124, range: 178, rate: 1.15, kind: 'pierce', pierce: 5, crit: 0.2,
    desc: '가이아 포스. 안정적인 최상위 관통 화력.',
    look: { build: 'armored', head: 'helm', helmColor: '#e8b34a', horn: 1, wing: 'metal', wingColor: '#f0d9a0', hand: 'gauntlet', mark: 'plate', crest: 'fin' },
    evolvesTo: [],
  },
  blackwargreymon: {
    name: '블랙워그레이몬', tier: 4, attr: 'VIRUS', field: 'DRAGON', color: '#5a5f6a',
    atk: 300, range: 195, rate: 0.5, kind: 'splash', splash: 62, execute: true,
    desc: '테라 디스트로이어. 체력이 깎인 적을 처형한다. 보스 킬러.',
    look: { build: 'armored', head: 'helm', helmColor: '#43474f', horn: 1, wing: 'metal', wingColor: '#4e535c', hand: 'gauntlet', mark: 'plate', crest: 'fin', glow: 'dark', alt: '#33363d' },
    evolvesTo: [],
  },

  // ══ B라인 : 가브몬 (수인형 / 둔화·제어) ══
  gabumon: {
    name: '가브몬', tier: 1, attr: 'DATA', field: 'BEAST', color: '#7ec8f0',
    cost: 60, atk: 10, range: 122, rate: 1.0, kind: 'single',
    slowPct: 0.25, slowDur: 1.0,
    desc: '적을 둔화시킨다. 화력은 낮지만 다른 타워의 딜 시간을 벌어준다.',
    look: { build: 'rookie', head: 'snout', ear: 'point', tail: 'thin', mark: 'stripe', markColor: '#3f74a8' },
    evolvesTo: ['garurumon'],
  },
  garurumon: {
    name: '가루루몬', tier: 2, attr: 'DATA', field: 'BEAST', color: '#5aa8e0',
    atk: 26, range: 142, rate: 1.3, kind: 'single', slowPct: 0.3, slowDur: 1.2,
    desc: '폭스 파이어. 둔화 지속이 길어져 경로 초입에 두면 효율이 좋다.',
    look: { build: 'quad', head: 'snout', ear: 'point', tail: 'tuft', mark: 'stripe', markColor: '#2f5d8c' },
    evolvesTo: ['weregarurumon', 'blackweregarurumon'],
  },
  weregarurumon: {
    name: '와레가루몬', tier: 3, attr: 'DATA', field: 'BEAST', color: '#4a90d9',
    atk: 40, range: 132, rate: 1.5, kind: 'single', salvo: 3,
    slowPct: 0.38, slowDur: 1.3,
    desc: '가루루 킥. 3연사로 둔화를 끊김 없이 유지한다.',
    look: { build: 'humanoid', head: 'snout', ear: 'point', tail: 'thin', hand: 'gauntlet', handColor: '#e2e8f0', mark: 'stripe', markColor: '#2f5d8c' },
    evolvesTo: ['metalgarurumon'],
  },
  blackweregarurumon: {
    name: '블랙와레가루몬', tier: 3, attr: 'VIRUS', field: 'BEAST', color: '#3c4257',
    atk: 118, range: 232, rate: 0.6, kind: 'single', crit: 0.3,
    desc: '초장거리 저격. 둔화를 버리고 단일 화력과 사거리를 챙긴다.',
    look: { build: 'humanoid', head: 'snout', ear: 'point', tail: 'thin', hand: 'claw', mark: 'stripe', markColor: '#1e2230', glow: 'dark' },
    evolvesTo: ['blackmetalgarurumon'],
  },
  metalgarurumon: {
    name: '메탈가루몬', tier: 4, attr: 'DATA', field: 'MACHINE', color: '#9fd8ff',
    atk: 72, range: 168, rate: 1.6, kind: 'splash', splash: 34, salvo: 2,
    slowPct: 0.55, slowDur: 1.6,
    desc: '코키토스 브레스. 광역 빙결에 가까운 강력한 제어.',
    look: { build: 'quad', head: 'visor', helmColor: '#8fb8d8', eyeColor: '#d6f4ff', wing: 'metal', wingColor: '#cfe4f2', tail: 'thick', hand: 'cannon', mark: 'plate', alt: '#7fa6c4' },
    evolvesTo: [],
  },
  blackmetalgarurumon: {
    name: '블랙메탈가루몬', tier: 4, attr: 'VIRUS', field: 'MACHINE', color: '#2f3444',
    atk: 268, range: 300, rate: 0.7, kind: 'pierce', pierce: 4, crit: 0.25,
    desc: '맵 절반을 사거리에 넣는 관통 저격. 배치 위치의 값을 극대화한다.',
    look: { build: 'quad', head: 'visor', helmColor: '#3a4054', eyeColor: '#ff6b6b', wing: 'metal', wingColor: '#4a5064', tail: 'thick', hand: 'cannon', mark: 'plate', glow: 'dark', alt: '#2b3040' },
    evolvesTo: [],
  },

  // ══ C라인 : 파피몬 (천사형 / 사거리·다중 타격) ══
  patamon: {
    name: '파피몬', tier: 1, attr: 'VACCINE', field: 'ANGEL', color: '#ffd166',
    cost: 55, atk: 8, range: 152, rate: 1.4, kind: 'single',
    desc: '사거리가 길고 발사가 빠르다. 초반 방어의 기준점.',
    look: { build: 'rookie', head: 'round', ear: 'long', wing: 'feather', wingColor: '#fff0cc', mark: 'belly', markColor: '#ffeec7' },
    evolvesTo: ['angemon'],
  },
  angemon: {
    name: '엔젤몬', tier: 2, attr: 'VACCINE', field: 'ANGEL', color: '#ffe3a3',
    atk: 30, range: 178, rate: 1.2, kind: 'pierce', pierce: 2,
    desc: '핸드 오브 페이트. 관통 2회.',
    look: { build: 'humanoid', head: 'helm', helmColor: '#e8dfc4', eyeColor: '#8ecfff', wing: 'feather', hand: 'staff', handColor: '#ffe9a8', crest: 'halo', glow: 'holy' },
    evolvesTo: ['holyangemon', 'slashangemon'],
  },
  holyangemon: {
    name: '홀리엔젤몬', tier: 3, attr: 'VACCINE', field: 'ANGEL', color: '#f6e2a8',
    atk: 50, range: 192, rate: 1.0, kind: 'splash', splash: 46,
    desc: '헤븐즈 게이트. 넓은 사거리 + 광역. 교차로에 두면 강하다.',
    look: { build: 'armored', head: 'helm', helmColor: '#e9dcb4', eyeColor: '#ffd166', wing: 'feather', hand: 'blade', crest: 'halo', glow: 'holy', mark: 'plate', markColor: '#f6e9c6' },
    evolvesTo: ['seraphimon'],
  },
  slashangemon: {
    name: '슬래시엔젤몬', tier: 3, attr: 'VACCINE', field: 'ANGEL', color: '#cfd9ea',
    atk: 132, range: 138, rate: 0.9, kind: 'pierce', pierce: 3, crit: 0.2,
    desc: '사거리를 희생해 근거리 고화력 관통을 얻는다. 커브 안쪽 배치용.',
    look: { build: 'armored', head: 'visor', helmColor: '#b9c6da', eyeColor: '#ff8a5a', wing: 'metal', wingColor: '#dbe4f0', hand: 'blade', mark: 'plate' },
    evolvesTo: ['dominimon'],
  },
  seraphimon: {
    name: '세라피몬', tier: 4, attr: 'VACCINE', field: 'ANGEL', color: '#ffeeb8',
    atk: 96, range: 224, rate: 0.85, kind: 'splash', splash: 72,
    desc: '세븐 헤븐즈. 최대 광역 반경. 물량 웨이브 해답.',
    look: { build: 'armored', head: 'helm', helmColor: '#f6e9c6', eyeColor: '#ffd166', wing: 'feather', hand: 'gauntlet', crest: 'halo', glow: 'holy', mark: 'plate', markColor: '#fff6dd' },
    evolvesTo: [],
  },
  dominimon: {
    name: '도미몬', tier: 4, attr: 'VACCINE', field: 'ANGEL', color: '#e6edf9',
    atk: 336, range: 162, rate: 0.85, kind: 'pierce', pierce: 6, crit: 0.35,
    desc: '파이널 엑스칼리버. 최대 관통 수. 직선 구간에 몰아넣고 쓸어버린다.',
    look: { build: 'armored', head: 'helm', helmColor: '#eef3fb', eyeColor: '#7fd8ff', wing: 'feather', wingColor: '#eef3fb', hand: 'blade', crest: 'fin', glow: 'holy', mark: 'plate' },
    evolvesTo: [],
  },

  // ══ D라인 : 임프몬 (마인형 / 광역·연사) ══
  impmon: {
    name: '임프몬', tier: 1, attr: 'VIRUS', field: 'DEMON', color: '#b06be0',
    cost: 65, atk: 11, range: 106, rate: 1.2, kind: 'splash', splash: 22,
    desc: '처음부터 광역. 사거리가 짧아 경로에 밀착시켜야 한다.',
    look: { build: 'rookie', head: 'round', ear: 'point', tail: 'thin', glow: 'dark', mark: 'belly', markColor: '#e6c9ff' },
    evolvesTo: ['devimon'],
  },
  devimon: {
    name: '데빗몬', tier: 2, attr: 'VIRUS', field: 'DEMON', color: '#8e44ad',
    atk: 30, range: 152, rate: 1.0, kind: 'splash', splash: 36,
    desc: '데스 클로. 사거리가 늘어 운용이 편해진다.',
    look: { build: 'wraith', head: 'hood', helmColor: '#5b2f7a', eyeColor: '#ff5a5a', wing: 'bat', hand: 'claw', glow: 'dark' },
    evolvesTo: ['skullsatamon', 'wizardmon'],
  },
  skullsatamon: {
    name: '스컬사탄몬', tier: 3, attr: 'VIRUS', field: 'DEMON', color: '#c0392b',
    atk: 72, range: 168, rate: 0.9, kind: 'splash', splash: 56,
    desc: '네일 본. 광역 반경을 계속 키우는 정통 진화.',
    look: { build: 'wraith', head: 'skull', horn: 2, hornStyle: 'curve', wing: 'bat', hand: 'staff', handColor: '#ff8a4a', glow: 'dark', mark: 'rib' },
    evolvesTo: ['demon'],
  },
  wizardmon: {
    name: '위자몬', tier: 3, attr: 'DATA', field: 'DEMON', color: '#6c5ce7',
    atk: 46, range: 204, rate: 1.2, kind: 'pierce', pierce: 3, armorPierce: true,
    desc: '테러 매직. 방어력을 완전히 무시한다. 장갑형 적의 대답.',
    look: { build: 'humanoid', head: 'hood', helmColor: '#4a3f9e', eyeColor: '#a5f3d0', hand: 'staff', handColor: '#8ee6ff', mark: 'stripe', markColor: '#3a3080' },
    evolvesTo: ['beelzemon'],
  },
  demon: {
    name: '데몬', tier: 4, attr: 'VIRUS', field: 'DEMON', color: '#8b0000',
    atk: 152, range: 202, rate: 0.7, kind: 'splash', splash: 86,
    desc: '플레임 인페르노. 광역 폭발의 최종형.',
    look: { build: 'wraith', head: 'hood', helmColor: '#5c1010', eyeColor: '#ffb03a', horn: 2, hornStyle: 'curve', wing: 'bat', hand: 'claw', glow: 'dark' },
    evolvesTo: [],
  },
  beelzemon: {
    name: '베르제브몬', tier: 4, attr: 'VIRUS', field: 'DEMON', color: '#5b21b6',
    atk: 68, range: 178, rate: 2.4, kind: 'single', salvo: 3,
    crit: 0.4, armorPierce: true,
    desc: '더블 임팩트. 초고속 연사 + 방어 무시. 단일 대상 DPS 1위.',
    look: { build: 'humanoid', head: 'hood', helmColor: '#2f1b52', eyeColor: '#ff4d6a', wing: 'bat', wingColor: '#3a2166', hand: 'cannon', handColor: '#6b6f7a', glow: 'dark' },
    evolvesTo: [],
  },

  // ══ 죠그레스체 (합체 진화 전용 T4) ══
  // 진화 트리로는 도달할 수 없고, jogressTable.js 의 조합으로만 만들어진다.
  // jogress:true → 슬롯 2칸을 1칸으로 합친 대가로 개별 궁극체보다 강하다.
  omnimon: {
    name: '오메가몬', tier: 4, attr: 'VACCINE', field: 'DRAGON', color: '#eaf2ff',
    jogress: true,
    atk: 180, range: 205, rate: 1.6, kind: 'pierce', pierce: 6, crit: 0.3,
    desc: '가루루 캐논 + 그레이 소드. 사거리·화력·관통 어느 쪽도 밀리지 않는 만능형.',
    look: { build: 'armored', head: 'helm', helmColor: '#f2f6ff', eyeColor: '#ffd166', horn: 1, wing: 'metal', wingColor: '#e8eef8', hand: 'blade', mark: 'plate', crest: 'fin', glow: 'holy' },
    evolvesTo: [],
  },
  omnimon_zwart: {
    name: '오메가몬 즈워트', tier: 4, attr: 'VIRUS', field: 'MACHINE', color: '#4b5261',
    jogress: true,
    atk: 520, range: 200, rate: 0.55, kind: 'splash', splash: 72,
    execute: true, armorPierce: true,
    desc: '어둠에 물든 합체. 한 방이 극단적으로 무겁고 방어를 무시한다. 보스 처형 전용.',
    look: { build: 'armored', head: 'helm', helmColor: '#3d434e', eyeColor: '#ff5a3c', horn: 1, wing: 'metal', wingColor: '#454b58', hand: 'cannon', mark: 'plate', crest: 'fin', glow: 'dark' },
    evolvesTo: [],
  },
  shakkoumon: {
    name: '샤크라몬', tier: 4, attr: 'DATA', field: 'MACHINE', color: '#7fe0d4',
    jogress: true,
    atk: 200, range: 245, rate: 1.3, kind: 'splash', splash: 92,
    desc: '카곤 사격. 최장 사거리 + 최대급 광역. 맵 중앙에 두면 절반을 커버한다.',
    look: { build: 'mech', head: 'visor', helmColor: '#6fd0c4', eyeColor: '#e6fffb', wing: 'metal', wingColor: '#a8ded6', hand: 'cannon', mark: 'plate', alt: '#5cbfb2' },
    evolvesTo: [],
  },
  lordknightmon: {
    name: '로드나이트몬', tier: 4, attr: 'DATA', field: 'ANGEL', color: '#ff8fb1',
    jogress: true,
    atk: 118, range: 148, rate: 1.6, kind: 'pierce', pierce: 3, salvo: 2, crit: 0.35,
    desc: '스파이럴 마스커레이드. 사거리가 짧은 대신 순간 폭딜이 가장 높다. 커브 안쪽 전용.',
    look: { build: 'armored', head: 'helm', helmColor: '#ffd0dd', eyeColor: '#ff5a8a', horn: 3, wing: 'metal', wingColor: '#ffe1ea', hand: 'blade', mark: 'plate', crest: 'fin' },
    evolvesTo: [],
  },
  lucemon_fm: {
    name: '루체몬 폴다운모드', tier: 4, attr: 'VIRUS', field: 'DEMON', color: '#b34cff',
    jogress: true,
    atk: 300, range: 210, rate: 1.0, kind: 'splash', splash: 100, armorPierce: true,
    desc: '데드리 시나: 반경 100의 최대 폭발 + 방어 무시. 물량 웨이브의 완전한 해답.',
    look: { build: 'wraith', head: 'hood', helmColor: '#5a1f8e', eyeColor: '#ffd166', horn: 2, hornStyle: 'curve', wing: 'bat', wingColor: '#3d1466', hand: 'claw', glow: 'dark', mark: 'rib' },
    evolvesTo: [],
  },
  chaosmon: {
    name: '카오스몬', tier: 4, attr: 'VIRUS', field: 'DEMON', color: '#a3b18a',
    jogress: true,
    atk: 430, range: 190, rate: 0.7, kind: 'pierce', pierce: 5,
    armorPierce: true, execute: true,
    desc: '빛과 어둠의 뒤틀린 융합. 관통·방어 무시·처형을 전부 갖춘 불안정한 폭력.',
    look: { build: 'armored', head: 'skull', eyeColor: '#ff3b6b', horn: 2, hornStyle: 'back', wing: 'metal', wingColor: '#7f8a72', hand: 'cannon', mark: 'plate', glow: 'dark' },
    evolvesTo: [],
  },
  sakuyamon: {
    name: '사쿠야몬', tier: 4, attr: 'DATA', field: 'ANGEL', color: '#ffd54f',
    jogress: true,
    atk: 78, range: 190, rate: 1.6, kind: 'splash', splash: 44, salvo: 3,
    slowPct: 0.62, slowDur: 2.0,
    desc: '아마츠카제. 광역 3연사로 62% 둔화를 상시 유지한다. 제어의 최종형.',
    look: { build: 'humanoid', head: 'hood', helmColor: '#ffd54f', eyeColor: '#ffffff', wing: 'energy', wingColor: '#ffe9a8', hand: 'staff', handColor: '#fff3c4', crest: 'halo', glow: 'holy', mark: 'plate', markColor: '#fff0c2' },
    evolvesTo: [],
  },
  justimon: {
    name: '저스티몬', tier: 4, attr: 'VACCINE', field: 'MACHINE', color: '#5ad1ff',
    jogress: true,
    atk: 440, range: 330, rate: 0.62, kind: 'pierce', pierce: 5, crit: 0.32,
    desc: '저스티스 킥. 맵 대부분을 사거리에 넣는 관통 저격. 배치 위치를 거의 안 탄다.',
    look: { build: 'mech', head: 'visor', helmColor: '#4aa8d8', eyeColor: '#c8f4ff', wing: 'energy', wingColor: '#7fe3ff', hand: 'blade', handColor: '#b8ecff', mark: 'plate', crest: 'antenna', alt: '#3d8fbb' },
    evolvesTo: [],
  },
};

// 각 정의가 자기 id 를 알고 있어야 전용 스프라이트를 찾을 수 있다
for (const [id, m] of Object.entries(MONSTERS)) m.id = id;

// 상점에 노출되는 T1 (각 라인의 시작점)
export const STARTERS = ['agumon', 'gabumon', 'patamon', 'impmon'];

// 조회 편의
export const get = (id) => MONSTERS[id];
export const attrOf = (id) => ATTR[MONSTERS[id].attr];
export const fieldOf = (id) => FIELD[MONSTERS[id].field];

// 데이터 무결성 체크 (개발용) — 진화 대상이 실제로 존재하고 티어가 +1인지
export function validateMonsterData() {
  const errors = [];
  for (const [id, m] of Object.entries(MONSTERS)) {
    for (const next of m.evolvesTo) {
      const n = MONSTERS[next];
      if (!n) { errors.push(`${id} → 없는 대상 '${next}'`); continue; }
      if (n.tier !== m.tier + 1) errors.push(`${id}(T${m.tier}) → ${next}(T${n.tier}) 티어 불연속`);
    }
    if (m.tier === 1 && !m.cost) errors.push(`${id}: T1인데 cost 없음`);
  }
  return errors;
}
