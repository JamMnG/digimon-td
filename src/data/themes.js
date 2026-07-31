// ─────────────────────────────────────────────────────────────
// themes.js — 스테이지별 지형 테마
//
// 팔레트만 바꾸면 "같은 맵을 색만 칠한 것"으로 보인다.
// 그래서 지물(decor)까지 같이 바꾼다 — 사막엔 선인장과 뼈, 다크 에리어엔
// 수정과 고목, 로열 베이스엔 배관과 통풍구.
//
// palette 키는 renderer.js 가 그대로 읽는다. 하나라도 빠지면 안 된다.
// decor  : [{ kind, color, size }] — kind 는 renderer 의 그리기 함수 이름
// dirtDensity / grassDensity : 0~100. 타일 100칸 중 몇 칸에 지물을 놓을지.
// ─────────────────────────────────────────────────────────────

const INK = '#2b2214';

export const THEMES = {
  // 연습장 — 정돈되고 인공적인 톤. 지물은 훈련용 콘과 깃발뿐.
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

  // 초원 — 기본 톤.
  forest: {
    name: '초원',
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

  // 사막 — 전부 표백된 모래. 마른 덤불과 뼈.
  desert: {
    name: '사막',
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

  // 기어 서배너 — 마른 풀 위에 녹슨 기계가 박혀 있다.
  savanna: {
    name: '기어 서배너',
    palette: {
      ground: '#b08a44', ground2: '#a9843f',
      road: '#e0bb70', roadDark: '#cba75f', roadEdge: '#8a6a2c',
      roadDash: 'rgba(120, 92, 32, 0.32)', speck: 'rgba(140, 106, 40, 0.22)',
      grass: '#a9b34a', grass2: '#a1ac44', grassRim: '#79833a',
      lip: '#574a24', ink: INK, shadow: 'rgba(58, 40, 14, 0.30)',
    },
    decor: [
      { kind: 'pipe', color: '#a05a32', size: 0.36 },
      { kind: 'gear', color: '#8a7f6a', size: 0.34 },
      { kind: 'bush', color: '#8a9440', size: 0.30 },
    ],
    dirtDensity: 30, grassDensity: 14,
  },

  // 다크 에리어 — 죽은 땅. 보라 수정과 고목.
  dark: {
    name: '다크 에리어',
    palette: {
      ground: '#3d3050', ground2: '#392c4a',
      road: '#6e5786', roadDark: '#5c4772', roadEdge: '#241b30',
      roadDash: 'rgba(180, 140, 220, 0.22)', speck: 'rgba(150, 118, 190, 0.16)',
      grass: '#4b6d59', grass2: '#456650', grassRim: '#2e4a38',
      lip: '#201a28', ink: '#171123', shadow: 'rgba(10, 6, 18, 0.42)',
    },
    decor: [
      { kind: 'crystal', color: '#b06ce8', size: 0.40 },
      { kind: 'deadtree', color: '#4a3b58', size: 0.46 },
      { kind: 'bone', color: '#cfc6d8', size: 0.28 },
    ],
    dirtDensity: 32, grassDensity: 14,
  },

  // 로열 베이스 — 차가운 강철과 청록 회로.
  royal: {
    name: '로열 베이스',
    palette: {
      ground: '#4e5a68', ground2: '#495563',
      road: '#94a8ba', roadDark: '#7e91a4', roadEdge: '#2c3540',
      roadDash: 'rgba(120, 230, 255, 0.26)', speck: 'rgba(150, 175, 200, 0.16)',
      grass: '#4f8f7e', grass2: '#498877', grassRim: '#2f6357',
      lip: '#23303a', ink: '#141c24', shadow: 'rgba(6, 14, 22, 0.40)',
    },
    decor: [
      { kind: 'vent', color: '#7d8b99', size: 0.36 },
      { kind: 'crystal', color: '#5ad1ff', size: 0.36 },
      { kind: 'pipe', color: '#5e6b78', size: 0.34 },
    ],
    dirtDensity: 26, grassDensity: 11,
  },
};

export const themeOf = (stage) => THEMES[stage?.theme] || THEMES.forest;
