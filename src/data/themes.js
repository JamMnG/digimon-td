// ─────────────────────────────────────────────────────────────
// themes.js — 스테이지별 지형 테마
//
// 팔레트만 바꾸면 "같은 맵을 색만 칠한 것"으로 보인다.
// 그래서 지물(decor)까지 같이 바꾼다 — 사막엔 선인장과 뼈, 동굴엔 수정과 바위,
// 기지엔 배관과 통풍구.
//
// palette 키는 renderer.js 가 그대로 읽는다. 하나라도 빠지면 안 된다.
// decor  : [{ kind, color, size }] — kind 는 renderer 의 drawProp3D 가 아는 이름
//          tree | deadtree | bush | rock | cactus | bone | crystal | pipe | gear | vent | cone | flag
// dirtDensity / grassDensity : 0~100. 타일 100칸 중 몇 칸에 지물을 놓을지.
// ─────────────────────────────────────────────────────────────

const INK = '#2b2214';

export const THEMES = {
  // ══ 연습장 ══
  training: {
    name: '트레이닝 필드',
    palette: {
      ground: '#9ba167', ground2: '#959b63',
      road: '#e3e4b6', roadDark: '#cfd1a1', roadEdge: '#7b7f4e',
      roadDash: 'rgba(90, 95, 45, 0.32)', speck: 'rgba(110, 115, 60, 0.18)',
      grass: '#8fc95e', grass2: '#86c157', grassRim: '#5e8f2d',
      lip: '#46512a', ink: INK, shadow: 'rgba(30, 34, 12, 0.30)',
    },
    decor: [
      { kind: 'cone', color: '#e8703a', size: 0.30 },
      { kind: 'flag', color: '#f0e6cf', size: 0.34 },
    ],
    dirtDensity: 16, grassDensity: 7,
  },

  // ══════════ 관동지방 ══════════
  // 첫 지방. 밝은 초원과 흙길.
  kanto_meadow: {
    name: '관동 초원',
    palette: {
      ground: '#a99039', ground2: '#a48b36',
      road: '#e2c87c', roadDark: '#d0b262', roadEdge: '#8a7229',
      roadDash: 'rgba(110, 86, 28, 0.32)', speck: 'rgba(120, 96, 36, 0.20)',
      grass: '#83bb44', grass2: '#7cb43f', grassRim: '#5e8f2d',
      lip: '#4a3a20', ink: INK, shadow: 'rgba(38, 28, 12, 0.30)',
    },
    decor: [
      { kind: 'tree', color: '#3f7a34', size: 0.46 },
      { kind: 'bush', color: '#4f8f3a', size: 0.32 },
      { kind: 'rock', color: '#8d8474', size: 0.28 },
    ],
    dirtDensity: 30, grassDensity: 13,
  },

  // 상록숲 — 빽빽하고 어둡다.
  kanto_forest: {
    name: '상록숲',
    palette: {
      ground: '#5f7340', ground2: '#5a6d3c',
      road: '#9a9a5e', roadDark: '#86874f', roadEdge: '#414d26',
      roadDash: 'rgba(50, 62, 26, 0.34)', speck: 'rgba(70, 86, 38, 0.22)',
      grass: '#4f8f3a', grass2: '#498733', grassRim: '#356624',
      lip: '#2b3418', ink: '#1d2410', shadow: 'rgba(14, 22, 8, 0.40)',
    },
    decor: [
      { kind: 'tree', color: '#2f6428', size: 0.54 },
      { kind: 'tree', color: '#3a7530', size: 0.44 },
      { kind: 'bush', color: '#457f34', size: 0.34 },
    ],
    dirtDensity: 40, grassDensity: 22,
  },

  // 월귤나무길 동굴 — 축축한 바위.
  kanto_cave: {
    name: '월귤 동굴',
    palette: {
      ground: '#4f4a46', ground2: '#4a4542',
      road: '#8a8078', roadDark: '#756c65', roadEdge: '#2f2b28',
      roadDash: 'rgba(180, 200, 220, 0.14)', speck: 'rgba(150, 145, 140, 0.16)',
      grass: '#5a6b58', grass2: '#546450', grassRim: '#3a4838',
      lip: '#26231f', ink: '#16130f', shadow: 'rgba(6, 6, 8, 0.44)',
    },
    decor: [
      { kind: 'rock', color: '#6f6862', size: 0.42 },
      { kind: 'crystal', color: '#7fc8dd', size: 0.32 },
      { kind: 'bone', color: '#d8d0c0', size: 0.26 },
    ],
    dirtDensity: 34, grassDensity: 12,
  },

  // 로켓단 아지트 — 차가운 타일과 배관.
  kanto_hideout: {
    name: '로켓단 아지트',
    palette: {
      ground: '#4a4652', ground2: '#45414d',
      road: '#7e7a8c', roadDark: '#6b6778', roadEdge: '#2a2732',
      roadDash: 'rgba(255, 90, 90, 0.24)', speck: 'rgba(140, 135, 155, 0.16)',
      grass: '#5c5570', grass2: '#565068', grassRim: '#3d3850',
      lip: '#242030', ink: '#14111c', shadow: 'rgba(8, 6, 14, 0.44)',
    },
    decor: [
      { kind: 'pipe', color: '#6a6478', size: 0.36 },
      { kind: 'vent', color: '#7d7889', size: 0.34 },
      { kind: 'crystal', color: '#ff6b6b', size: 0.28 },
    ],
    dirtDensity: 28, grassDensity: 10,
  },

  // ══════════ 성도지방 ══════════
  // 금빛시티 — 금빛 도시 포장길.
  johto_city: {
    name: '금빛시티',
    palette: {
      ground: '#9a8a5e', ground2: '#948459',
      road: '#e8d49a', roadDark: '#d4bf85', roadEdge: '#87764a',
      roadDash: 'rgba(120, 100, 50, 0.30)', speck: 'rgba(140, 125, 80, 0.18)',
      grass: '#7fae52', grass2: '#78a64c', grassRim: '#5a8038',
      lip: '#463d26', ink: INK, shadow: 'rgba(40, 32, 16, 0.32)',
    },
    decor: [
      { kind: 'flag', color: '#f0c040', size: 0.34 },
      { kind: 'bush', color: '#5f9440', size: 0.30 },
      { kind: 'vent', color: '#8f8468', size: 0.30 },
    ],
    dirtDensity: 24, grassDensity: 12,
  },

  // 어둠의 동굴 — 빛이 거의 없다.
  johto_dark: {
    name: '어둠의 동굴',
    palette: {
      ground: '#33303c', ground2: '#2f2c38',
      road: '#5c5668', roadDark: '#4d4859', roadEdge: '#1e1b26',
      roadDash: 'rgba(160, 150, 220, 0.16)', speck: 'rgba(110, 104, 130, 0.14)',
      grass: '#3f5a4a', grass2: '#3a5444', grassRim: '#2a4032',
      lip: '#1b1822', ink: '#100d16', shadow: 'rgba(4, 3, 10, 0.50)',
    },
    decor: [
      { kind: 'crystal', color: '#9a6ce8', size: 0.38 },
      { kind: 'rock', color: '#514c5c', size: 0.38 },
      { kind: 'deadtree', color: '#3c3548', size: 0.42 },
    ],
    dirtDensity: 32, grassDensity: 12,
  },

  // 강철섬 — 녹슨 철판.
  johto_steel: {
    name: '강철섬',
    palette: {
      ground: '#6a5f52', ground2: '#65594d',
      road: '#a2938a', roadDark: '#8d7f76', roadEdge: '#41382f',
      roadDash: 'rgba(200, 140, 80, 0.24)', speck: 'rgba(150, 130, 110, 0.18)',
      grass: '#6f8272', grass2: '#687a6b', grassRim: '#4b5c4e',
      lip: '#332c24', ink: '#1e1913', shadow: 'rgba(16, 12, 8, 0.40)',
    },
    decor: [
      { kind: 'gear', color: '#8a7f6a', size: 0.38 },
      { kind: 'pipe', color: '#a05a32', size: 0.36 },
      { kind: 'vent', color: '#7d8b99', size: 0.32 },
    ],
    dirtDensity: 30, grassDensity: 12,
  },

  // 봉인의 탑 — 낡은 목조와 금박.
  johto_tower: {
    name: '방울탑',
    palette: {
      ground: '#7a5a3e', ground2: '#74553a',
      road: '#c9a06a', roadDark: '#b58d5a', roadEdge: '#5f4227',
      roadDash: 'rgba(240, 192, 64, 0.26)', speck: 'rgba(130, 100, 66, 0.20)',
      grass: '#8a7a4a', grass2: '#837444', grassRim: '#62572f',
      lip: '#3d2c1a', ink: '#22180e', shadow: 'rgba(28, 18, 8, 0.38)',
    },
    decor: [
      { kind: 'flag', color: '#e05a3a', size: 0.36 },
      { kind: 'pipe', color: '#8a6a42', size: 0.34 },
      { kind: 'crystal', color: '#f0c040', size: 0.30 },
    ],
    dirtDensity: 26, grassDensity: 10,
  },

  // ══════════ 호연지방 ══════════
  // 해안 — 모래와 바다.
  hoenn_beach: {
    name: '해안 도로',
    palette: {
      ground: '#d0b878', ground2: '#cab171',
      road: '#f2e0b0', roadDark: '#e0cd9a', roadEdge: '#a08a4e',
      roadDash: 'rgba(120, 170, 200, 0.28)', speck: 'rgba(170, 150, 100, 0.20)',
      grass: '#6fc4a8', grass2: '#68bc9f', grassRim: '#489a80',
      lip: '#6e5c34', ink: '#2a2214', shadow: 'rgba(70, 56, 22, 0.28)',
    },
    decor: [
      { kind: 'rock', color: '#b9a67e', size: 0.30 },
      { kind: 'bush', color: '#4f9e7e', size: 0.32 },
      { kind: 'bone', color: '#f0ead6', size: 0.24 },
    ],
    dirtDensity: 26, grassDensity: 12,
  },

  // 늪지 — 축축한 진창.
  hoenn_marsh: {
    name: '늪지대',
    palette: {
      ground: '#5c6440', ground2: '#575f3c',
      road: '#8a8a55', roadDark: '#76764a', roadEdge: '#3d4327',
      roadDash: 'rgba(60, 80, 40, 0.32)', speck: 'rgba(80, 92, 52, 0.22)',
      grass: '#5f8f52', grass2: '#58874c', grassRim: '#3e6a36',
      lip: '#2c3119', ink: '#1a1f0e', shadow: 'rgba(12, 18, 6, 0.40)',
    },
    decor: [
      { kind: 'deadtree', color: '#4a4a2e', size: 0.48 },
      { kind: 'bush', color: '#4f7f3e', size: 0.34 },
      { kind: 'rock', color: '#6f7258', size: 0.28 },
    ],
    dirtDensity: 36, grassDensity: 18,
  },

  // 화산 — 마그마.
  hoenn_volcano: {
    name: '용암 지대',
    palette: {
      ground: '#4a3230', ground2: '#452e2c',
      road: '#8a4a34', roadDark: '#753e2b', roadEdge: '#2a1a18',
      roadDash: 'rgba(255, 140, 40, 0.30)', speck: 'rgba(150, 80, 60, 0.20)',
      grass: '#6a4438', grass2: '#643f34', grassRim: '#472a22',
      lip: '#241412', ink: '#150b0a', shadow: 'rgba(10, 4, 2, 0.46)',
    },
    decor: [
      { kind: 'rock', color: '#5f423c', size: 0.40 },
      { kind: 'crystal', color: '#ff7a2b', size: 0.32 },
      { kind: 'deadtree', color: '#3a2622', size: 0.40 },
    ],
    dirtDensity: 34, grassDensity: 12,
  },

  // 하늘기둥 — 높은 곳의 옅은 대기.
  hoenn_sky: {
    name: '하늘기둥',
    palette: {
      ground: '#7f8fa8', ground2: '#7a89a2',
      road: '#c6d2e2', roadDark: '#b0bcce', roadEdge: '#59647a',
      roadDash: 'rgba(255, 255, 255, 0.26)', speck: 'rgba(190, 200, 220, 0.16)',
      grass: '#8fb4c8', grass2: '#87acc0', grassRim: '#62889c',
      lip: '#4a5468', ink: '#232a38', shadow: 'rgba(30, 40, 60, 0.30)',
    },
    decor: [
      { kind: 'crystal', color: '#c8e4ff', size: 0.34 },
      { kind: 'rock', color: '#94a2b8', size: 0.30 },
      { kind: 'flag', color: '#7fd0e8', size: 0.32 },
    ],
    dirtDensity: 22, grassDensity: 10,
  },

  // ══════════ 신오지방 ══════════
  // 눈길.
  sinnoh_snow: {
    name: '눈덮인 길',
    palette: {
      ground: '#c8d4dd', ground2: '#c2ceD8',
      road: '#eef4f8', roadDark: '#dbe4ea', roadEdge: '#8f9daa',
      roadDash: 'rgba(120, 150, 180, 0.26)', speck: 'rgba(160, 180, 200, 0.20)',
      grass: '#9fc4b8', grass2: '#98bdb1', grassRim: '#729c90',
      lip: '#6f7d88', ink: '#2c3640', shadow: 'rgba(70, 90, 110, 0.26)',
    },
    decor: [
      { kind: 'deadtree', color: '#8fa0aa', size: 0.46 },
      { kind: 'crystal', color: '#dff0ff', size: 0.32 },
      { kind: 'rock', color: '#a8b4bd', size: 0.28 },
    ],
    dirtDensity: 26, grassDensity: 10,
  },

  // 탄광 — 석탄과 철.
  sinnoh_mine: {
    name: '지하 탄광',
    palette: {
      ground: '#3f3a36', ground2: '#3a3532',
      road: '#6f6660', roadDark: '#5d5550', roadEdge: '#241f1c',
      roadDash: 'rgba(240, 180, 90, 0.22)', speck: 'rgba(120, 110, 100, 0.18)',
      grass: '#4f5a52', grass2: '#4a544c', grassRim: '#333d36',
      lip: '#1e1a17', ink: '#110e0c', shadow: 'rgba(4, 3, 2, 0.48)',
    },
    decor: [
      { kind: 'gear', color: '#7a6f5e', size: 0.36 },
      { kind: 'rock', color: '#5a534d', size: 0.38 },
      { kind: 'crystal', color: '#f0c040', size: 0.28 },
    ],
    dirtDensity: 32, grassDensity: 10,
  },

  // 습지 — 안개 낀 초지.
  sinnoh_marsh: {
    name: '안개 습지',
    palette: {
      ground: '#7f8a6a', ground2: '#7a8565',
      road: '#b4b98e', roadDark: '#a2a67d', roadEdge: '#5e6647',
      roadDash: 'rgba(120, 140, 100, 0.26)', speck: 'rgba(140, 150, 120, 0.18)',
      grass: '#88ae70', grass2: '#81a76a', grassRim: '#628a50',
      lip: '#4a5238', ink: '#28301c', shadow: 'rgba(40, 50, 30, 0.28)',
    },
    decor: [
      { kind: 'bush', color: '#6f9455', size: 0.34 },
      { kind: 'deadtree', color: '#6a6f52', size: 0.44 },
      { kind: 'rock', color: '#8f9478', size: 0.28 },
    ],
    dirtDensity: 30, grassDensity: 16,
  },

  // 창을 기둥 — 시공이 뒤틀린 성역.
  sinnoh_pillar: {
    name: '창을기둥',
    palette: {
      ground: '#4a4260', ground2: '#453d5a',
      road: '#7f70a2', roadDark: '#6d5f8e', roadEdge: '#2b2440',
      roadDash: 'rgba(200, 170, 255, 0.24)', speck: 'rgba(150, 130, 200, 0.16)',
      grass: '#5f6a92', grass2: '#59648a', grassRim: '#3f4a70',
      lip: '#241e36', ink: '#150f22', shadow: 'rgba(8, 4, 20, 0.44)',
    },
    decor: [
      { kind: 'crystal', color: '#b06ce8', size: 0.40 },
      { kind: 'pipe', color: '#6a5f8a', size: 0.34 },
      { kind: 'rock', color: '#5c5478', size: 0.30 },
    ],
    dirtDensity: 26, grassDensity: 12,
  },

  // ══════════ 하나지방 ══════════
  // 대도시 — 회색 콘크리트.
  unova_metro: {
    name: '하나 대도시',
    palette: {
      ground: '#6e6e74', ground2: '#69696f',
      road: '#a8a8b0', roadDark: '#93939c', roadEdge: '#42424a',
      roadDash: 'rgba(255, 230, 120, 0.28)', speck: 'rgba(150, 150, 160, 0.16)',
      grass: '#6f9470', grass2: '#688c69', grassRim: '#4a6c4c',
      lip: '#38383e', ink: '#1d1d22', shadow: 'rgba(10, 10, 14, 0.38)',
    },
    decor: [
      { kind: 'vent', color: '#8a8a92', size: 0.34 },
      { kind: 'cone', color: '#e8703a', size: 0.28 },
      { kind: 'bush', color: '#5f8f5a', size: 0.30 },
    ],
    dirtDensity: 24, grassDensity: 10,
  },

  // 사막 유적.
  unova_desert: {
    name: '사막 유적',
    palette: {
      ground: '#c9a961', ground2: '#c3a25a',
      road: '#eeddaa', roadDark: '#dcc78e', roadEdge: '#a2833e',
      roadDash: 'rgba(140, 112, 50, 0.30)', speck: 'rgba(160, 130, 62, 0.22)',
      grass: '#bcbf5f', grass2: '#b4b858', grassRim: '#8a8c3a',
      lip: '#6a5a2c', ink: INK, shadow: 'rgba(70, 52, 18, 0.28)',
    },
    decor: [
      { kind: 'cactus', color: '#5d9450', size: 0.42 },
      { kind: 'bone', color: '#e8e0c6', size: 0.30 },
      { kind: 'rock', color: '#b09a6e', size: 0.30 },
    ],
    dirtDensity: 28, grassDensity: 12,
  },

  // 냉동 컨테이너 — 얼어붙은 화물.
  unova_frozen: {
    name: '냉동 컨테이너',
    palette: {
      ground: '#5f7480', ground2: '#5a6e7a',
      road: '#a8c4d0', roadDark: '#94b0bd', roadEdge: '#374750',
      roadDash: 'rgba(200, 240, 255, 0.26)', speck: 'rgba(140, 170, 185, 0.18)',
      grass: '#6f9ca0', grass2: '#689498', grassRim: '#4a7478',
      lip: '#2e3a42', ink: '#18222a', shadow: 'rgba(8, 18, 26, 0.42)',
    },
    decor: [
      { kind: 'crystal', color: '#a8e4ff', size: 0.38 },
      { kind: 'pipe', color: '#5f7480', size: 0.34 },
      { kind: 'vent', color: '#7d95a2', size: 0.32 },
    ],
    dirtDensity: 28, grassDensity: 12,
  },

  // 플라스마단 성 — 최종.
  unova_castle: {
    name: '플라스마단 성',
    palette: {
      ground: '#3c4450', ground2: '#38404b',
      road: '#78849a', roadDark: '#65708a', roadEdge: '#232932',
      roadDash: 'rgba(120, 230, 255, 0.28)', speck: 'rgba(130, 145, 170, 0.16)',
      grass: '#4f8f7e', grass2: '#498877', grassRim: '#2f6357',
      lip: '#1e242c', ink: '#0f141a', shadow: 'rgba(4, 8, 14, 0.48)',
    },
    decor: [
      { kind: 'crystal', color: '#5ad1ff', size: 0.38 },
      { kind: 'pipe', color: '#5e6b78', size: 0.34 },
      { kind: 'vent', color: '#7d8b99', size: 0.34 },
    ],
    dirtDensity: 26, grassDensity: 11,
  },
};

export const themeOf = (stage) => THEMES[stage?.theme] || THEMES.kanto_meadow;
