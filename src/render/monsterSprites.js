// ─────────────────────────────────────────────────────────────
// monsterSprites.js — 포켓몬별 전용 도트 (50종)
//
// 부위 조합만으로는 "그 포켓몬다움"이 안 나온다. 원작에서 한눈에 알아보게
// 하는 요소가 종마다 다르기 때문이다:
//   파이리     꼬리 끝의 불꽃 + 크림색 배 + 몸통만 한 머리
//   리자몽     등의 청록 날개 + 뒤로 뻗은 뿔 두 개
//   한카리아스 양옆으로 길게 뻗은 뿔(비행기 실루엣) + 빨간 배
//   발챙이     배의 검은 소용돌이. 그것 말고는 아무 무늬도 없다
//   캐이시     감은 눈 + 갈색 어깨 갑판 + 여우 귀
//   윤겔라     콧수염 + 이마의 별 + 쥔 스푼
//   토게피     알 껍질 몸통 + 빨강·파랑 삼각 무늬
//   고오스     검은 얼굴 구체를 감싼 보라 가스
//   팬텀       찢어진 웃음 + 등의 가시
//   코일       자석 두 개 + 십자 나사
//   메타그로스 얼굴을 가르는 십자 + 네 다리
//
// 그래서 50종을 하나씩 찍는다. 라인 안에서는 실루엣이 이어지도록
// 같은 골격 함수를 쓰고 특징만 얹는다 (파이리 → 리자드 → 리자몽).
//
// ★ 원본 이미지를 옮긴 것이 아니라, 알아볼 수 있는 특징만 살려 새로 찍은 도트다.
//   이름·색과 마찬가지로 IP 격리 계층에 속한다.
//
// 격자 22×24, 중심 x = 10.5. 위쪽이 머리, 아래쪽이 발.
// ─────────────────────────────────────────────────────────────
import { shade } from './shading.js';

// ── 공용 색 ──
const CREAM    = '#f7e4be';   // 배 / 밝은 안쪽
const WHITE    = '#f4efe6';
const OFFW     = '#e6ded0';
const INKY     = '#2b2118';
const RED      = '#e0483a';
const REDD     = '#b03328';
const FLAME_O  = '#ff8c1a';
const FLAME_Y  = '#ffd457';
const FLAME_B  = '#6fd0ff';
const FLAME_B2 = '#c4f0ff';
const STEEL    = '#b9c4d2';
const STEEL_D  = '#7f8b9c';
const GOLD     = '#f0c040';
const CLAW     = '#f6f2e4';
const BROWN    = '#8a6a3a';
const BROWN_D  = '#5f4726';
const LEAF     = '#4f9e52';
const LEAF_D   = '#37773c';
const PINK     = '#e8709a';
const PINK_D   = '#c2506f';
const GREEN_H  = '#4fbf82';   // 랄토스 라인 머리
const BLUE_M   = '#4a90d9';

// ── 공용 부품 ───────────────────────────────────────────────
/**
 * 모서리를 깎은 덩어리 — 이게 없으면 전부 사각형 블록으로 보인다.
 * cut=1 이면 네 귀퉁이 1픽셀, cut=2 면 계단식으로 2픽셀을 지운다.
 */
function blob(S, x, y, w, h, col, cut = 1) {
  S.shaded(x, y, w, h, col);
  volume(S, x, y, w, h, col);
  for (let i = 0; i < cut; i++) {
    for (let j = 0; j < cut - i; j++) {
      S.set(x + i, y + j, null);
      S.set(x + w - 1 - i, y + j, null);
      S.set(x + i, y + h - 1 - j, null);
      S.set(x + w - 1 - i, y + h - 1 - j, null);
    }
  }
}

/** 위만 둥근 덩어리 — 머리에 쓴다 */
function dome(S, x, y, w, h, col, cut = 2) {
  S.shaded(x, y, w, h, col);
  volume(S, x, y, w, h, col);
  for (let i = 0; i < cut; i++) {
    for (let j = 0; j < cut - i; j++) {
      S.set(x + i, y + j, null);
      S.set(x + w - 1 - i, y + j, null);
    }
  }
}

/**
 * 왼쪽 위 하이라이트 + 오른쪽 아래 그늘.
 * shaded() 는 위/아래만 나눠서 납작한 판으로 보인다. 이 두 줄이 붙어야
 * 같은 도트가 "둥근 덩어리"로 읽힌다. 광원은 shading.js 와 같은 왼쪽 위.
 */
function volume(S, x, y, w, h, col) {
  if (w < 4 || h < 4) return;
  S.rect(x + 1, y + 1, w - 3, 1, shade(col, 0.5));      // 이마 하이라이트
  S.set(x + 1, y + 2, shade(col, 0.34));
  for (let j = 2; j < h - 1; j++) S.set(x + w - 1, y + j, shade(col, -0.44));
  S.rect(x + 2, y + h - 1, w - 3, 1, shade(col, -0.5)); // 바닥 그늘
}

/** 머리와 몸 사이 그늘 — 이 한 줄이 실루엣을 갈라 준다 */
function neck(S, x, y, w, col) {
  S.rect(x, y, w, 1, col);
}


/** 눈 — 흰자 + 검은 동공. 도트는 눈만 제대로 찍혀도 캐릭터로 읽힌다 */
function eyes(S, y, o = {}) {
  const lx = o.lx ?? 7, rx = o.rx ?? 13, w = o.w ?? 2, h = o.h ?? 2;
  const sclera = o.sclera || WHITE, pupil = o.pupil || INKY;
  S.rect(lx, y, w, h, sclera);
  S.rect(rx, y, w, h, sclera);
  S.set(lx + w - 1, y + h - 1, pupil);
  S.set(rx, y + h - 1, pupil);
}

/** 감은 눈 — 캐이시처럼 눈을 뜨지 않는 종 */
function closedEyes(S, y, col = INKY) {
  S.rect(7, y, 3, 1, col);
  S.rect(12, y, 3, 1, col);
}

/** 2족 공룡 다리 — 파이리·딥상어동 계열 공용 */
function dinoLegs(S, C, o = {}) {
  const leg = o.leg || C.base;
  S.shaded(6, 17, 4, 5, leg);
  S.shaded(12, 17, 4, 5, leg);
  S.rect(5, 21, 5, 1, shade(leg, -0.3));
  S.rect(12, 21, 5, 1, shade(leg, -0.3));
  for (const x of [5, 7, 9]) S.set(x, 22, CLAW);
  for (const x of [12, 14, 16]) S.set(x, 22, CLAW);
}

/** 인간형 몸통 + 다리 */
function humanBody(S, C, o = {}) {
  const leg = o.leg || C.dark;
  S.shaded(7, 17, 3, 5, leg);
  S.shaded(12, 17, 3, 5, leg);
  S.rect(6, 22, 4, 1, shade(leg, -0.35));
  S.rect(12, 22, 4, 1, shade(leg, -0.35));
  S.shaded(7, 10, 8, 8, o.torso || C.base);
  if (o.arms !== false) {
    S.symShaded(4, 11, 3, 3, o.shoulder || C.light);
    S.symShaded(4, 14, 2, 4, o.arm || C.base);
  }
}

/** 네발 몸통 — 이상해씨·뚜꾸리 계열 */
function quadBody(S, C, o = {}) {
  S.shaded(3, 12, 16, 6, C.base);
  const leg = o.leg || C.dark;
  for (const x of [4, 8, 13, 17]) S.shaded(x, 17, 2, 5, leg);
  for (const x of [4, 8, 13, 17]) S.rect(x, 22, 2, 1, shade(leg, -0.3));
}

/** 뱀 몸통 — 미뇽·신뇽 */
function serpent(S, C, o = {}) {
  S.shaded(8, 9, 7, 7, C.base);          // 상체
  S.shaded(6, 15, 10, 4, C.base);        // 굽이
  S.shaded(3, 18, 12, 3, C.base);        // 바닥에 닿은 몸
  S.rect(3, 20, 12, 1, C.dark);
  const belly = o.bellyCol || CREAM;
  S.rect(9, 12, 5, 4, belly);
  S.rect(7, 18, 7, 2, belly);
}

/** 꼬리 끝 불꽃 — 파이리 라인의 정체성 */
function tailFlame(S, x, y, o = {}) {
  const a = o.outer || FLAME_O, b = o.inner || FLAME_Y;
  S.taper(x, y, 5, 5, a);
  S.taper(x + 1, y + 1, 3, 3, b);
  S.set(x + 2, y - 1, b);
}

/** 금속 표면 — 강철 라인 공용 */
function metalFace(S, C, x, y, w, h) {
  S.shaded(x, y, w, h, C.base);
  S.rect(x, y, w, 1, shade(C.base, 0.42));
  S.rect(x + 1, y + h - 1, w - 2, 1, shade(C.base, -0.42));
}

// ── 50종 ────────────────────────────────────────────────────
export const SPRITES = {
  // ══════════ 파이리 라인 ══════════
  charmander(S, C) {
    S.shaded(16, 14, 4, 3, C.base);              // 꼬리를 몸에서 떼어 불꽃이 보이게
    S.shaded(18, 11, 3, 4, C.base);
    tailFlame(S, 17, 6);
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    S.rect(5, 22, 5, 1, C.dark); S.rect(12, 22, 5, 1, C.dark);
    blob(S, 7, 11, 8, 7, C.base);
    blob(S, 8, 13, 6, 5, CREAM);                 // 크림색 배
    S.shaded(4, 12, 3, 3, C.base); S.shaded(15, 12, 3, 3, C.base);
    neck(S, 7, 10, 8, shade(C.base, -0.45));
    dome(S, 5, 2, 12, 8, C.base, 2);             // 몸통만 한 머리
    S.shaded(7, 8, 8, 2, shade(C.base, 0.24));   // 주둥이
    eyes(S, 4);
    S.rect(9, 8, 4, 1, INKY);
  },

  charmeleon(S, C) {
    S.shaded(16, 13, 4, 3, C.base);
    S.shaded(18, 9, 3, 5, C.base);
    tailFlame(S, 17, 4);
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 11, 8, 7, C.base);
    blob(S, 8, 13, 6, 5, CREAM);
    S.shaded(3, 12, 3, 4, C.base); S.shaded(16, 12, 3, 4, C.base);
    S.set(3, 15, CLAW); S.set(18, 15, CLAW);
    neck(S, 7, 10, 8, shade(C.base, -0.45));
    dome(S, 6, 3, 10, 7, C.base, 2);
    S.taper(15, 0, 5, 4, C.light, 1);            // 뒤통수 뿔 하나
    S.shaded(7, 8, 8, 2, shade(C.base, 0.24));
    eyes(S, 5, { sclera: '#ffe9a8' });
    for (const x of [8, 11, 14]) S.set(x, 9, CLAW);
  },

  charizard(S, C) {
    // 청록 날개 — 리자몽의 1순위 식별 요소. 몸 밖으로 확실히 뻗는다
    S.taper(0, 3, 6, 5, '#2e7fb8', 1);
    S.taper(16, 3, 6, 5, '#2e7fb8', 1);
    S.rect(1, 8, 4, 2, '#1f5d8c'); S.rect(17, 8, 4, 2, '#1f5d8c');
    S.shaded(16, 13, 4, 3, C.base);
    S.shaded(18, 9, 3, 5, C.base);
    tailFlame(S, 17, 4);
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 11, 8, 7, C.base);
    blob(S, 8, 13, 6, 5, CREAM);
    neck(S, 7, 10, 8, shade(C.base, -0.45));
    dome(S, 6, 2, 10, 8, C.base, 2);
    S.taper(3, 0, 4, 4, CREAM, 1);               // 뒤로 뻗은 뿔 2개
    S.taper(15, 0, 4, 4, CREAM, 1);
    S.shaded(7, 8, 8, 2, shade(C.base, 0.24));
    eyes(S, 4, { sclera: '#ffe066' });
    for (const x of [8, 11, 14]) S.set(x, 9, CLAW);
  },

  mega_charizard_x(S, C) {
    S.taper(0, 2, 6, 6, '#1f3568', 1);
    S.taper(16, 2, 6, 6, '#1f3568', 1);
    S.rect(1, 8, 4, 2, '#0e1a33'); S.rect(17, 8, 4, 2, '#0e1a33');
    S.shaded(16, 13, 4, 3, C.base);
    S.shaded(18, 9, 3, 5, C.base);
    tailFlame(S, 17, 3, { outer: FLAME_B, inner: FLAME_B2 });
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 11, 8, 7, C.base);
    blob(S, 8, 13, 6, 5, shade(C.base, 0.35));
    neck(S, 7, 10, 8, shade(C.base, -0.5));
    dome(S, 6, 2, 10, 8, C.base, 2);
    S.taper(3, 0, 4, 4, '#5f7fc0', 1);
    S.taper(15, 0, 4, 4, '#5f7fc0', 1);
    eyes(S, 4, { sclera: FLAME_B2, pupil: '#0d1a2c' });
    // 입가에서 새는 푸른 불꽃
    S.rect(7, 8, 8, 2, '#12305a');
    for (const x of [7, 9, 11, 13]) S.set(x, 9, FLAME_B);
    S.set(6, 7, FLAME_B); S.set(15, 7, FLAME_B2);
  },

  mega_charizard_y(S, C) {
    S.taper(0, 1, 7, 7, '#c85a1f', 1);           // 더 큰 날개
    S.taper(15, 1, 7, 7, '#c85a1f', 1);
    S.rect(1, 8, 5, 3, '#8a3712'); S.rect(16, 8, 5, 3, '#8a3712');
    S.shaded(16, 13, 4, 3, C.base);
    S.shaded(18, 9, 3, 5, C.base);
    tailFlame(S, 17, 3, { outer: '#ff6a10' });
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 11, 8, 7, C.base);
    blob(S, 8, 13, 6, 5, CREAM);
    neck(S, 7, 10, 8, shade(C.base, -0.45));
    dome(S, 6, 2, 10, 8, C.base, 2);
    S.taper(2, 0, 4, 4, CREAM, 1);               // 뿔 셋
    S.taper(16, 0, 4, 4, CREAM, 1);
    S.taper(9, 0, 4, 3, CREAM, 1);
    S.shaded(7, 8, 8, 2, shade(C.base, 0.24));
    eyes(S, 4, { sclera: '#fff0a0' });
  },

  // ══════════ 미뇽 라인 ══════════
  dratini(S, C) {
    // 뱀 — 아래는 굵고 위로 갈수록 가늘어진다
    blob(S, 3, 18, 13, 4, C.base);
    blob(S, 6, 14, 8, 5, C.base);
    blob(S, 8, 9, 6, 6, C.base);
    S.rect(9, 16, 5, 4, CREAM); S.rect(6, 20, 9, 1, CREAM);
    dome(S, 7, 3, 8, 7, C.base, 2);
    S.taper(2, 3, 5, 5, WHITE, 1);               // 머리 옆 흰 지느러미
    S.taper(15, 3, 5, 5, WHITE, 1);
    eyes(S, 5, { lx: 8, rx: 12 });
    S.rect(10, 8, 3, 1, shade(C.base, -0.4));
  },

  dragonair(S, C) {
    S.taper(1, 10, 5, 5, WHITE, 1);              // 흰 날개 지느러미
    S.taper(16, 10, 5, 5, WHITE, 1);
    blob(S, 3, 18, 13, 4, C.base);
    blob(S, 6, 14, 8, 5, C.base);
    blob(S, 8, 9, 6, 6, C.base);
    S.rect(9, 16, 5, 4, CREAM); S.rect(6, 20, 9, 1, CREAM);
    S.rect(9, 10, 4, 2, '#4a90d9');              // 목의 파란 구슬
    S.rect(10, 10, 2, 1, '#b8e8ff');
    S.rect(9, 19, 3, 2, '#4a90d9');              // 꼬리 구슬
    dome(S, 7, 3, 8, 7, C.base, 2);
    S.taper(9, 0, 4, 4, WHITE);                  // 이마 뿔
    eyes(S, 5, { lx: 8, rx: 12 });
  },

  dragonite(S, C) {
    S.taper(0, 9, 5, 5, LEAF, 1);                // 짧은 초록 날개
    S.taper(17, 9, 5, 5, LEAF, 1);
    S.shaded(16, 15, 5, 4, C.base);
    blob(S, 5, 18, 5, 4, C.base); blob(S, 12, 18, 5, 4, C.base);
    blob(S, 5, 11, 12, 7, C.base);               // 통통한 몸
    blob(S, 8, 13, 6, 5, CREAM);
    S.shaded(2, 12, 3, 4, C.base); S.shaded(17, 12, 3, 4, C.base);
    neck(S, 6, 10, 10, shade(C.base, -0.45));
    dome(S, 6, 3, 10, 7, C.base, 2);
    S.shaded(8, 8, 6, 2, shade(C.base, 0.24));   // 뭉툭한 주둥이
    S.taper(6, 0, 3, 4, C.light);                // 안테나 둘
    S.taper(13, 0, 3, 4, C.light);
    eyes(S, 5);
  },

  // ══════════ 딥상어동 라인 ══════════
  gible(S, C) {
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 13, 8, 6, C.base);
    blob(S, 8, 15, 6, 4, RED);                   // 빨간 배
    S.shaded(4, 14, 3, 3, C.base); S.shaded(15, 14, 3, 3, C.base);
    dome(S, 4, 2, 14, 10, C.base, 3);            // 몸만 한 상어 머리
    S.taper(0, 3, 5, 5, C.light, 1);             // 머리 옆 지느러미
    S.taper(17, 3, 5, 5, C.light, 1);
    S.rect(5, 9, 12, 3, '#3a1010');              // 크게 벌린 입
    for (let x = 5; x < 17; x += 2) { S.set(x, 9, WHITE); S.set(x + 1, 11, WHITE); }
    eyes(S, 4, { lx: 6, rx: 14, sclera: '#ffe9a8' });
  },

  gabite(S, C) {
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 12, 8, 7, C.base);
    blob(S, 8, 14, 6, 5, RED);
    S.shaded(3, 12, 3, 5, C.base); S.shaded(16, 12, 3, 5, C.base);
    S.taper(2, 16, 3, 3, CLAW); S.taper(17, 16, 3, 3, CLAW);
    neck(S, 7, 11, 8, shade(C.base, -0.45));
    dome(S, 5, 3, 12, 8, C.base, 2);
    S.taper(0, 3, 5, 4, C.light, 1);
    S.taper(17, 3, 5, 4, C.light, 1);
    S.rect(6, 8, 10, 3, '#3a1010');
    for (let x = 6; x < 16; x += 2) { S.set(x, 8, WHITE); S.set(x + 1, 10, WHITE); }
    eyes(S, 5, { sclera: '#ffe9a8' });
  },

  garchomp(S, C) {
    // 양옆으로 뻗은 뿔 — 한카리아스의 실루엣 그 자체
    S.taper(0, 2, 8, 3, C.light, 1);
    S.taper(14, 2, 8, 3, C.light, 1);
    S.shaded(17, 15, 4, 4, C.dark);
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 12, 8, 7, C.base);
    blob(S, 8, 14, 6, 5, RED);
    S.shaded(3, 12, 3, 5, RED); S.shaded(16, 12, 3, 5, RED);
    S.taper(1, 16, 3, 4, CLAW); S.taper(18, 16, 3, 4, CLAW);
    neck(S, 7, 11, 8, shade(C.base, -0.45));
    dome(S, 6, 4, 10, 7, C.base, 2);
    S.rect(7, 9, 8, 2, '#3a1010');
    for (let x = 7; x < 15; x += 2) S.set(x, 9, WHITE);
    eyes(S, 5, { sclera: GOLD });
  },

  mega_garchomp(S, C) {
    S.taper(0, 2, 8, 3, RED, 1);
    S.taper(14, 2, 8, 3, RED, 1);
    S.shaded(17, 15, 4, 4, C.deep);
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 7, 12, 8, 7, C.base);
    blob(S, 8, 14, 6, 5, RED);
    S.taper(0, 9, 5, 9, CLAW);                   // 팔 전체가 낫
    S.taper(17, 9, 5, 9, CLAW);
    neck(S, 7, 11, 8, shade(C.base, -0.5));
    dome(S, 6, 4, 10, 7, C.base, 2);
    S.rect(7, 9, 8, 2, '#3a1010');
    for (let x = 7; x < 15; x += 2) S.set(x, 9, WHITE);
    eyes(S, 5, { sclera: '#ff8a5a', pupil: '#3a0f0a' });
  },

  // ══════════ 알통몬 라인 ══════════
  machop(S, C) {
    blob(S, 5, 18, 5, 4, C.dark); blob(S, 12, 18, 5, 4, C.dark);
    blob(S, 5, 11, 12, 8, C.base, 2);            // 넓은 가슴
    S.shaded(2, 12, 4, 3, C.light); S.shaded(16, 12, 4, 3, C.light);
    S.shaded(2, 15, 4, 4, C.base); S.shaded(16, 15, 4, 4, C.base);
    S.rect(10, 12, 2, 6, shade(C.base, -0.4));   // 복근 가운데 선
    S.rect(7, 15, 8, 1, shade(C.base, -0.35));
    neck(S, 6, 10, 10, shade(C.base, -0.5));
    dome(S, 5, 3, 12, 8, C.base, 3);
    for (const x of [6, 10, 14] ) S.taper(x, 0, 3, 4, C.light);   // 머리 위 세 볏
    eyes(S, 5, { lx: 6, rx: 13, w: 3, h: 3 });
    S.rect(9, 9, 4, 1, INKY);
  },

  machoke(S, C) {
    blob(S, 5, 18, 5, 4, C.dark); blob(S, 12, 18, 5, 4, C.dark);
    blob(S, 4, 11, 14, 8, C.base, 2);
    S.rect(4, 16, 14, 2, RED);                   // 빨간 벨트
    S.rect(10, 16, 2, 2, GOLD);
    S.shaded(1, 11, 4, 4, C.light); S.shaded(17, 11, 4, 4, C.light);
    S.shaded(1, 15, 4, 4, C.base); S.shaded(17, 15, 4, 4, C.base);
    S.rect(10, 12, 2, 4, shade(C.base, -0.4));
    S.rect(6, 14, 10, 1, shade(C.base, -0.35));
    neck(S, 6, 10, 10, shade(C.base, -0.5));
    dome(S, 5, 3, 12, 8, C.base, 3);
    for (const x of [6, 10, 14]) S.taper(x, 0, 3, 4, C.light);
    eyes(S, 5, { lx: 6, rx: 13, w: 3, h: 3 });
    S.rect(9, 9, 4, 1, INKY);
  },

  machamp(S, C) {
    // 팔 넷 — 괴력몬의 유일무이한 실루엣
    S.shaded(2, 10, 4, 3, C.light); S.shaded(16, 10, 4, 3, C.light);
    S.shaded(1, 13, 4, 4, C.base); S.shaded(17, 13, 4, 4, C.base);
    S.shaded(0, 14, 3, 3, C.light); S.shaded(19, 14, 3, 3, C.light);
    S.shaded(0, 17, 3, 4, C.base); S.shaded(19, 17, 3, 4, C.base);
    blob(S, 5, 18, 5, 4, C.dark); blob(S, 12, 18, 5, 4, C.dark);
    blob(S, 4, 11, 14, 8, C.base, 2);
    S.rect(4, 16, 14, 2, RED);
    S.rect(10, 16, 2, 2, GOLD);
    S.rect(10, 12, 2, 4, shade(C.base, -0.4));
    neck(S, 6, 10, 10, shade(C.base, -0.5));
    dome(S, 5, 3, 12, 8, C.base, 3);
    for (const x of [6, 10, 14]) S.taper(x, 0, 3, 4, C.light);
    eyes(S, 5, { lx: 6, rx: 13, w: 3, h: 3 });
    S.rect(9, 9, 4, 1, INKY);
  },

  mega_machamp(S, C) {
    S.shaded(2, 9, 5, 3, C.light); S.shaded(15, 9, 5, 3, C.light);
    S.shaded(1, 12, 5, 5, C.base); S.shaded(16, 12, 5, 5, C.base);
    S.shaded(0, 13, 3, 3, GOLD); S.shaded(19, 13, 3, 3, GOLD);
    S.shaded(0, 16, 3, 5, C.base); S.shaded(19, 16, 3, 5, C.base);
    blob(S, 5, 18, 5, 4, C.dark); blob(S, 12, 18, 5, 4, C.dark);
    blob(S, 4, 11, 14, 8, C.base, 2);
    S.rect(4, 16, 14, 2, GOLD);
    S.rect(10, 16, 2, 2, RED);
    S.rect(10, 12, 2, 4, shade(C.base, -0.45));
    neck(S, 6, 10, 10, shade(C.base, -0.55));
    dome(S, 5, 3, 12, 8, C.base, 3);
    for (const x of [6, 10, 14]) S.taper(x, 0, 3, 4, GOLD);
    eyes(S, 5, { lx: 6, rx: 13, w: 3, h: 3, sclera: '#ffd0a0', pupil: '#5a1a0a' });
  },

  // ══════════ 발챙이 라인 ══════════
  poliwag(S, C) {
    S.shaded(15, 17, 5, 3, C.light);             // 얇은 꼬리
    S.taper(18, 14, 4, 4, C.light, 1);
    blob(S, 3, 4, 16, 16, C.base, 3);            // 거의 완전한 구
    // 배의 검은 소용돌이 — 발챙이 라인의 전부
    blob(S, 6, 9, 10, 10, WHITE, 2);
    S.rect(8, 11, 6, 1, INKY); S.rect(8, 11, 1, 5, INKY);
    S.rect(8, 15, 5, 1, INKY); S.rect(12, 12, 1, 4, INKY);
    S.rect(10, 12, 3, 1, INKY);
    eyes(S, 6, { lx: 5, rx: 14, w: 3, h: 3 });
  },

  poliwhirl(S, C) {
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    S.shaded(2, 12, 4, 3, C.base); S.shaded(16, 12, 4, 3, C.base);
    S.shaded(1, 15, 4, 3, WHITE); S.shaded(17, 15, 4, 3, WHITE);
    blob(S, 4, 3, 14, 16, C.base, 3);
    blob(S, 7, 7, 8, 9, WHITE, 2);
    S.rect(8, 9, 6, 1, INKY); S.rect(8, 9, 1, 4, INKY);
    S.rect(8, 12, 5, 1, INKY); S.rect(12, 10, 1, 3, INKY);
    eyes(S, 4, { lx: 5, rx: 14, w: 3, h: 3 });
  },

  poliwrath(S, C) {
    S.shaded(1, 10, 5, 5, C.base); S.shaded(16, 10, 5, 5, C.base);
    S.shaded(0, 14, 5, 4, WHITE); S.shaded(17, 14, 5, 4, WHITE);
    blob(S, 6, 18, 4, 4, C.base); blob(S, 12, 18, 4, 4, C.base);
    blob(S, 4, 2, 14, 17, C.base, 3);            // 근육질 통짜 몸
    blob(S, 7, 8, 8, 9, WHITE, 2);
    S.rect(8, 10, 6, 1, INKY); S.rect(8, 10, 1, 5, INKY);
    S.rect(8, 14, 5, 1, INKY); S.rect(12, 11, 1, 4, INKY);
    S.rect(10, 11, 3, 1, INKY);
    eyes(S, 4, { lx: 5, rx: 14, w: 3, h: 2 });
  },

  // ══════════ 뚜꾸리 라인 ══════════
  tepig(S, C) {
    S.rect(19, 11, 3, 2, C.dark);                // 말린 꼬리
    S.rect(20, 9, 2, 2, C.light);
    for (const x of [4, 8, 13, 17]) blob(S, x, 17, 3, 5, '#33241f');
    blob(S, 3, 10, 16, 8, C.base, 2);            // 통통한 몸
    S.rect(3, 13, 16, 2, '#33241f');             // 굵은 검은 띠
    dome(S, 1, 3, 12, 10, C.base, 3);            // 큰 머리
    S.rect(1, 11, 12, 2, '#33241f');
    blob(S, 0, 7, 6, 5, '#f4c9a4', 1);           // 돼지 코 — 정면으로 크게
    S.rect(1, 9, 2, 2, INKY); S.rect(4, 9, 2, 2, INKY);
    S.taper(2, 0, 5, 4, C.dark); S.taper(8, 0, 5, 4, C.dark);   // 삼각 귀
    eyes(S, 5, { lx: 4, rx: 9, w: 3, h: 3 });
  },

  pignite(S, C) {
    blob(S, 5, 18, 5, 4, C.base); blob(S, 12, 18, 5, 4, C.base);
    blob(S, 5, 11, 12, 8, '#33241f', 2);         // 검은 몸통
    S.rect(5, 15, 12, 2, GOLD);                  // 금색 허리띠
    S.shaded(2, 12, 4, 3, C.light); S.shaded(16, 12, 4, 3, C.light);
    S.shaded(2, 15, 3, 4, C.base); S.shaded(17, 15, 3, 4, C.base);
    neck(S, 6, 10, 10, '#1e1512');
    dome(S, 5, 2, 12, 9, C.base, 3);
    blob(S, 7, 7, 8, 4, '#f4c9a4', 1);           // 돼지 코
    S.rect(8, 8, 2, 2, INKY); S.rect(12, 8, 2, 2, INKY);
    S.taper(3, 0, 5, 4, C.dark); S.taper(14, 0, 5, 4, C.dark);
    eyes(S, 4, { lx: 6, rx: 13, w: 3, h: 3 });
  },

  emboar(S, C) {
    S.shaded(0, 11, 5, 5, C.base); S.shaded(17, 11, 5, 5, C.base);
    S.shaded(0, 16, 4, 4, C.dark); S.shaded(18, 16, 4, 4, C.dark);
    blob(S, 5, 18, 5, 4, C.dark); blob(S, 12, 18, 5, 4, C.dark);
    blob(S, 4, 11, 14, 8, C.base, 2);            // 우람한 몸
    S.rect(4, 16, 14, 2, GOLD);
    neck(S, 5, 10, 12, shade(C.base, -0.5));
    dome(S, 5, 2, 12, 9, C.base, 3);
    // 턱수염처럼 늘어진 불꽃 — 엠보아의 표식. 얼굴 양옆으로 크게
    S.taper(1, 4, 5, 8, FLAME_O); S.taper(16, 4, 5, 8, FLAME_O);
    S.taper(2, 5, 3, 6, FLAME_Y); S.taper(17, 5, 3, 6, FLAME_Y);
    blob(S, 7, 7, 8, 4, '#f4c9a4', 1);
    S.rect(8, 8, 2, 2, INKY); S.rect(12, 8, 2, 2, INKY);
    eyes(S, 4, { lx: 6, rx: 13, w: 3, h: 3, sclera: '#ffe066' });
  },

  // ══════════ 캐이시 라인 ══════════
  abra(S, C) {
    S.shaded(16, 18, 6, 3, C.base);              // 굵고 긴 꼬리
    blob(S, 5, 15, 12, 7, BROWN, 2);             // 갈색 하체 갑판
    blob(S, 7, 10, 8, 6, C.base);
    S.shaded(3, 11, 4, 5, BROWN); S.shaded(15, 11, 4, 5, BROWN);
    S.rect(6, 15, 10, 1, BROWN_D);               // 갑판 경계선
    neck(S, 8, 9, 6, shade(C.base, -0.5));
    dome(S, 5, 2, 12, 8, C.base, 3);             // 여우 머리
    S.taper(7, 8, 8, 3, shade(C.base, 0.28));    // 뾰족 주둥이
    S.taper(2, 0, 5, 6, C.base); S.taper(15, 0, 5, 6, C.base);   // 큰 삼각 귀
    S.taper(3, 1, 3, 4, C.dark); S.taper(16, 1, 3, 4, C.dark);
    closedEyes(S, 6, shade(C.base, -0.6));       // 늘 감고 있다
    S.rect(9, 9, 4, 1, BROWN_D);
  },

  kadabra(S, C) {
    S.shaded(17, 17, 5, 4, C.base);
    blob(S, 6, 18, 4, 4, BROWN); blob(S, 12, 18, 4, 4, BROWN);
    blob(S, 6, 11, 10, 7, C.base);
    blob(S, 7, 13, 8, 5, BROWN, 1);              // 가슴 갑판
    S.shaded(2, 12, 4, 5, C.base); S.shaded(16, 12, 4, 5, C.base);
    neck(S, 8, 10, 6, shade(C.base, -0.5));
    dome(S, 5, 2, 12, 8, C.base, 3);
    S.taper(7, 8, 8, 3, shade(C.base, 0.28));
    S.taper(2, 0, 5, 6, C.base); S.taper(15, 0, 5, 6, C.base);
    S.taper(3, 1, 3, 4, C.dark); S.taper(16, 1, 3, 4, C.dark);
    S.rect(9, 2, 4, 2, RED); S.set(8, 3, RED); S.set(13, 3, RED);  // 이마의 별
    eyes(S, 6, { lx: 6, rx: 13, w: 3, h: 2 });
    S.rect(4, 9, 4, 1, BROWN_D); S.rect(14, 9, 4, 1, BROWN_D);    // 콧수염
    S.rect(0, 10, 2, 7, STEEL); S.rect(0, 8, 4, 2, STEEL);        // 쥔 스푼
  },

  alakazam(S, C) {
    blob(S, 6, 18, 4, 4, BROWN); blob(S, 12, 18, 4, 4, BROWN);
    blob(S, 6, 11, 10, 7, C.base);
    blob(S, 7, 13, 8, 5, BROWN, 1);
    S.shaded(2, 12, 4, 5, C.base); S.shaded(16, 12, 4, 5, C.base);
    neck(S, 8, 10, 6, shade(C.base, -0.5));
    dome(S, 4, 1, 14, 9, C.base, 3);             // 더 큰 머리
    S.taper(1, 0, 5, 5, C.base); S.taper(16, 0, 5, 5, C.base);
    eyes(S, 5, { lx: 6, rx: 13, w: 3, h: 2 });
    // 길게 늘어진 흰 수염 — 후딘의 표식
    S.taper(2, 8, 6, 7, WHITE); S.taper(14, 8, 6, 7, WHITE);
    S.taper(4, 9, 3, 5, OFFW); S.taper(15, 9, 3, 5, OFFW);
    S.rect(0, 12, 2, 7, STEEL); S.rect(0, 10, 4, 2, STEEL);
    S.rect(20, 12, 2, 7, STEEL); S.rect(18, 10, 4, 2, STEEL);
  },

  mega_alakazam(S, C) {
    blob(S, 6, 18, 4, 4, BROWN); blob(S, 12, 18, 4, 4, BROWN);
    blob(S, 6, 11, 10, 7, C.base);
    blob(S, 7, 13, 8, 5, BROWN, 1);
    neck(S, 8, 10, 6, shade(C.base, -0.55));
    dome(S, 4, 1, 14, 9, C.base, 3);
    eyes(S, 5, { lx: 6, rx: 13, w: 3, h: 2, sclera: '#fff0c0' });
    S.taper(1, 8, 7, 8, WHITE); S.taper(14, 8, 7, 8, WHITE);
    S.taper(3, 9, 4, 6, OFFW); S.taper(15, 9, 4, 6, OFFW);
    // 스푼 다섯 자루가 떠 있다
    for (const [x, y] of [[0, 2], [20, 2], [0, 17], [20, 17], [10, 0]]) {
      S.rect(x, y, 2, 5, STEEL); S.rect(x, y, 2, 1, '#e8f0ff');
    }
  },

  // ══════════ 랄토스 라인 ══════════
  ralts(S, C) {
    S.taper(6, 13, 10, 9, C.base);               // 아래로 퍼진 몸
    S.shaded(4, 14, 3, 4, C.base); S.shaded(15, 14, 3, 4, C.base);
    // 얼굴을 덮은 초록 보울 머리 — 랄토스 라인의 표식
    dome(S, 4, 3, 14, 9, GREEN_H, 3);
    S.rect(5, 11, 12, 1, shade(GREEN_H, -0.4));
    S.taper(1, 4, 5, 5, RED, 1);                 // 머리 옆 빨간 뿔
    S.taper(16, 4, 5, 5, RED, 1);
    S.rect(9, 12, 4, 1, INKY);
  },

  kirlia(S, C) {
    S.taper(5, 15, 12, 7, C.base);               // 발레복 치마
    blob(S, 8, 10, 6, 6, C.base);
    S.shaded(5, 11, 3, 4, C.base); S.shaded(14, 11, 3, 4, C.base);
    dome(S, 5, 2, 12, 8, GREEN_H, 3);
    S.rect(6, 9, 10, 1, shade(GREEN_H, -0.4));
    S.taper(0, 2, 6, 6, RED, 1);
    S.taper(16, 2, 6, 6, RED, 1);
    eyes(S, 7, { lx: 8, rx: 12, h: 1, sclera: RED });
  },

  gardevoir(S, C) {
    S.taper(4, 14, 14, 8, C.base);               // 긴 흰 가운
    blob(S, 8, 9, 6, 6, C.base);
    S.shaded(4, 10, 3, 5, C.base); S.shaded(15, 10, 3, 5, C.base);
    S.rect(9, 11, 4, 4, RED);                    // 가슴을 관통한 빨간 뿔
    S.rect(10, 10, 2, 1, PINK);
    dome(S, 6, 1, 10, 7, GREEN_H, 2);
    S.taper(3, 5, 4, 7, GREEN_H); S.taper(15, 5, 4, 7, GREEN_H);  // 늘어진 머리
    S.rect(7, 7, 8, 1, shade(GREEN_H, -0.4));
    eyes(S, 5, { lx: 8, rx: 12, h: 1, sclera: RED });
  },

  mega_gardevoir(S, C) {
    S.taper(2, 13, 18, 9, C.base);               // 더 크게 퍼진 가운
    S.rect(4, 17, 14, 1, PINK);
    blob(S, 8, 8, 6, 6, C.base);
    S.shaded(3, 9, 3, 5, C.base); S.shaded(16, 9, 3, 5, C.base);
    S.rect(9, 10, 4, 4, RED);
    dome(S, 6, 0, 10, 7, GREEN_H, 2);
    S.taper(2, 4, 5, 8, GREEN_H); S.taper(15, 4, 5, 8, GREEN_H);
    S.rect(7, 6, 8, 1, shade(GREEN_H, -0.4));
    eyes(S, 4, { lx: 8, rx: 12, h: 1, sclera: RED });
  },

  // ══════════ 토게피 라인 ══════════
  togepi(S, C) {
    // 알 껍질을 뒤집어쓴 몸 — 아래가 지그재그로 깨져 있다
    dome(S, 4, 4, 14, 15, C.base, 3);
    for (let x = 5; x < 17; x += 2) S.set(x, 18, null);
    for (const x of [5, 8, 11, 14]) S.taper(x, 1, 4, 4, C.base);  // 머리 뾰족
    S.taper(6, 12, 4, 3, RED); S.taper(12, 14, 4, 3, BLUE_M);     // 빨강·파랑 삼각
    S.taper(9, 16, 3, 3, RED);
    eyes(S, 7, { lx: 6, rx: 13, w: 3, h: 3 });
    S.rect(9, 11, 4, 1, INKY);
    S.shaded(2, 18, 4, 3, CREAM); S.shaded(16, 18, 4, 3, CREAM);
  },

  togetic(S, C) {
    S.taper(0, 7, 6, 6, WHITE, 1);               // 작은 날개
    S.taper(16, 7, 6, 6, WHITE, 1);
    blob(S, 5, 7, 12, 12, C.base, 2);
    for (const x of [6, 9, 12]) S.taper(x, 3, 4, 4, C.base);
    S.taper(6, 12, 4, 3, RED); S.taper(12, 14, 4, 3, BLUE_M);
    eyes(S, 8, { lx: 7, rx: 12, w: 3, h: 3 });
    S.rect(9, 12, 4, 1, INKY);
    S.shaded(6, 18, 4, 3, CREAM); S.shaded(12, 18, 4, 3, CREAM);
  },

  togekiss(S, C) {
    // 몸통 대부분이 날개 — 비행체 실루엣
    S.taper(0, 6, 8, 7, WHITE, 1);
    S.taper(14, 6, 8, 7, WHITE, 1);
    blob(S, 6, 5, 10, 14, C.base, 2);
    for (const x of [7, 11]) S.taper(x, 1, 4, 4, C.base);
    S.taper(6, 11, 4, 3, RED); S.taper(12, 13, 4, 3, BLUE_M);
    eyes(S, 7, { lx: 7, rx: 12, w: 3, h: 3 });
    S.rect(9, 11, 4, 1, INKY);
  },

  // ══════════ 고오스 라인 ══════════
  gastly(S, C) {
    // 보라 가스가 검은 얼굴 구체를 감싼다
    const gas = shade(C.base, 0.2);
    S.taper(0, 3, 22, 4, gas, 1);
    S.rect(0, 7, 22, 3, gas);
    S.taper(0, 10, 22, 5, shade(gas, -0.25), -1);
    for (let x = 1; x < 21; x += 3) S.set(x, 16, shade(gas, -0.4));
    blob(S, 6, 6, 10, 9, '#241c30', 2);          // 검은 얼굴
    eyes(S, 8, { lx: 7, rx: 12, w: 3, h: 3 });
    S.rect(8, 13, 6, 1, '#d05a7a');              // 혀
  },

  haunter(S, C) {
    const gas = shade(C.base, 0.12);
    blob(S, 4, 3, 14, 13, gas, 3);
    for (let x = 5; x < 17; x += 3) S.taper(x, 15, 4, 4, shade(gas, -0.4));
    // 몸에서 떨어져 떠 있는 손 두 개
    blob(S, 0, 9, 5, 4, gas); blob(S, 17, 9, 5, 4, gas);
    S.set(0, 13, C.dark); S.set(2, 13, C.dark); S.set(4, 13, C.dark);
    S.set(17, 13, C.dark); S.set(19, 13, C.dark); S.set(21, 13, C.dark);
    eyes(S, 6, { lx: 6, rx: 13, w: 3, h: 3 });
    S.rect(7, 11, 8, 2, WHITE);                  // 이빨
    for (let x = 8; x < 15; x += 2) S.set(x, 11, C.deep);
  },

  gengar(S, C) {
    for (const x of [1, 5, 16, 20]) S.taper(x, 4, 3, 5, C.dark, 1);   // 등의 가시
    blob(S, 6, 18, 4, 4, C.dark); blob(S, 12, 18, 4, 4, C.dark);
    blob(S, 4, 9, 14, 10, C.base, 2);
    S.shaded(1, 11, 4, 4, C.base); S.shaded(17, 11, 4, 4, C.base);
    dome(S, 3, 2, 16, 9, C.base, 3);             // 넓은 머리
    S.taper(1, 0, 5, 5, C.dark, 1);              // 뾰족 귀
    S.taper(16, 0, 5, 5, C.dark, 1);
    eyes(S, 4, { lx: 5, rx: 14, w: 3, h: 3, sclera: RED, pupil: '#3a0a10' });
    // 찢어진 웃음 — 팬텀의 얼굴
    S.rect(5, 8, 12, 3, WHITE);
    for (let x = 6; x < 17; x += 2) { S.set(x, 8, C.deep); S.set(x + 1, 10, C.deep); }
  },

  mega_gengar(S, C) {
    for (const x of [0, 4, 17, 21]) S.taper(x, 3, 3, 6, C.deep, 1);
    blob(S, 6, 18, 4, 4, C.deep); blob(S, 12, 18, 4, 4, C.deep);
    blob(S, 3, 9, 16, 10, C.base, 2);
    S.shaded(0, 11, 4, 4, C.base); S.shaded(18, 11, 4, 4, C.base);
    dome(S, 2, 2, 18, 9, C.base, 3);
    S.taper(0, 0, 5, 5, C.deep, 1); S.taper(17, 0, 5, 5, C.deep, 1);
    eyes(S, 4, { lx: 4, rx: 15, w: 3, h: 3, sclera: RED, pupil: '#2a0508' });
    S.rect(9, 1, 4, 3, RED); S.set(10, 2, '#2a0508');    // 이마의 세 번째 눈
    S.rect(4, 8, 14, 3, WHITE);
    for (let x = 5; x < 18; x += 2) { S.set(x, 8, C.deep); S.set(x + 1, 10, C.deep); }
  },

  // ══════════ 불켜미 라인 ══════════
  litwick(S, C) {
    S.taper(8, 0, 6, 6, FLAME_B);                // 파란 불꽃 심지
    S.taper(9, 1, 4, 4, FLAME_B2);
    blob(S, 5, 6, 12, 13, C.base, 2);            // 흰 양초 몸
    // 녹아 흘러내린 촛농
    S.taper(4, 14, 3, 5, C.base); S.taper(15, 13, 3, 6, C.base);
    S.rect(5, 18, 12, 2, shade(C.base, -0.22));
    eyes(S, 10, { lx: 6, rx: 13, w: 3, h: 3, sclera: GOLD, pupil: '#3a2a10' });
    S.rect(9, 14, 4, 1, shade(C.base, -0.4));
  },

  lampent(S, C) {
    S.taper(8, 0, 6, 6, FLAME_B);
    S.taper(9, 1, 4, 4, FLAME_B2);
    blob(S, 5, 6, 12, 9, C.base, 2);             // 램프 몸통
    S.rect(4, 14, 14, 2, shade(C.base, -0.3));   // 램프 테두리
    S.taper(6, 16, 10, 6, C.base);               // 아래로 뾰족
    S.shaded(1, 8, 4, 3, C.dark); S.shaded(17, 8, 4, 3, C.dark);
    eyes(S, 9, { lx: 6, rx: 13, w: 3, h: 3, sclera: GOLD, pupil: '#3a2a10' });
  },

  chandelure(S, C) {
    S.taper(8, 0, 6, 5, FLAME_B);
    S.taper(9, 1, 4, 3, FLAME_B2);
    blob(S, 6, 4, 10, 8, C.base, 2);
    S.rect(5, 11, 12, 2, shade(C.base, -0.3));
    // 세 갈래 촛대 — 끝마다 파란 불꽃
    S.shaded(0, 10, 5, 3, C.dark); S.shaded(17, 10, 5, 3, C.dark);
    S.taper(0, 6, 5, 5, FLAME_B); S.taper(17, 6, 5, 5, FLAME_B);
    S.taper(1, 7, 3, 3, FLAME_B2); S.taper(18, 7, 3, 3, FLAME_B2);
    S.taper(7, 13, 8, 8, C.base);
    S.taper(8, 19, 6, 4, FLAME_B);
    eyes(S, 7, { lx: 7, rx: 12, w: 3, h: 3, sclera: GOLD, pupil: '#3a2a10' });
  },

  // ══════════ 이상해씨 라인 ══════════
  bulbasaur(S, C) {
    for (const x of [5, 9, 14, 17]) blob(S, x, 16, 4, 6, C.dark);
    blob(S, 4, 10, 16, 7, C.base, 2);            // 네발 몸통
    blob(S, 8, 3, 11, 9, LEAF, 3);               // 등의 초록 구근 — 크게
    S.rect(10, 3, 6, 1, shade(LEAF, 0.45));
    S.rect(9, 10, 9, 1, shade(LEAF, -0.4));
    dome(S, 0, 8, 9, 9, C.base, 3);              // 머리를 왼쪽으로 확실히 뺀다
    S.taper(0, 13, 5, 3, shade(C.base, 0.28));   // 주둥이
    S.taper(0, 5, 4, 4, C.dark); S.taper(5, 5, 4, 4, C.dark);   // 귀
    eyes(S, 10, { lx: 1, rx: 5, w: 3, h: 3, sclera: RED });
    S.rect(1, 15, 5, 1, INKY);
    for (const [x, y] of [[6, 14], [13, 14], [17, 11]]) S.rect(x, y, 2, 2, shade(C.base, -0.4));
  },

  ivysaur(S, C) {
    for (const x of [5, 9, 14, 17]) blob(S, x, 16, 4, 6, C.dark);
    blob(S, 4, 10, 16, 7, C.base, 2);
    S.taper(2, 4, 8, 5, LEAF, 1); S.taper(13, 4, 8, 5, LEAF, 1);  // 잎 넉 장
    S.taper(5, 1, 6, 5, LEAF_D, 1); S.taper(12, 1, 6, 5, LEAF_D, 1);
    blob(S, 8, 1, 7, 8, PINK, 2);                // 분홍 꽃봉오리
    S.rect(9, 1, 5, 1, shade(PINK, 0.4));
    S.rect(10, 3, 3, 3, PINK_D);
    dome(S, 0, 9, 9, 8, C.base, 3);
    S.taper(0, 13, 5, 3, shade(C.base, 0.28));
    eyes(S, 11, { lx: 1, rx: 5, w: 3, h: 3, sclera: RED });
    S.rect(1, 15, 5, 1, INKY);
    for (const [x, y] of [[6, 14], [13, 14], [17, 11]]) S.rect(x, y, 2, 2, shade(C.base, -0.4));
  },

  venusaur(S, C) {
    // 등을 덮은 커다란 분홍 꽃 — 이상해꽃의 전부
    S.taper(0, 5, 22, 5, LEAF, 1);
    S.taper(0, 2, 8, 5, LEAF_D, 1); S.taper(14, 2, 8, 5, LEAF_D, 1);
    blob(S, 4, 0, 14, 7, PINK, 2);
    S.rect(6, 0, 10, 1, shade(PINK, 0.45));
    S.rect(8, 2, 6, 4, GOLD);                    // 꽃 중심
    S.rect(9, 3, 4, 2, '#fff0a0');
    S.rect(1, 5, 6, 3, PINK_D); S.rect(15, 5, 6, 3, PINK_D);
    blob(S, 4, 9, 16, 8, C.base, 2);
    for (const x of [5, 9, 14, 17]) blob(S, x, 16, 4, 6, C.dark);
    dome(S, 0, 10, 8, 8, C.base, 3);
    S.taper(0, 14, 5, 3, shade(C.base, 0.28));
    eyes(S, 12, { lx: 0, rx: 4, w: 3, h: 3, sclera: RED });
    S.rect(1, 16, 5, 1, INKY);
  },

  // ══════════ 메탕 라인 ══════════
  beldum(S, C) {
    blob(S, 4, 5, 14, 12, C.base, 3);            // 금속 구체
    S.rect(6, 5, 10, 1, shade(C.base, 0.48));
    S.taper(8, 17, 6, 6, C.dark);                // 아래로 뻗은 갈고리
    S.shaded(1, 8, 4, 4, C.dark); S.shaded(17, 8, 4, 4, C.dark);
    blob(S, 7, 9, 8, 5, RED);                    // 빨간 외눈
    S.rect(8, 10, 6, 2, '#ff9a8a');
    S.rect(8, 9, 6, 1, REDD);
  },

  metang(S, C) {
    blob(S, 3, 4, 16, 11, C.base, 3);
    S.rect(5, 4, 12, 1, shade(C.base, 0.48));
    // X 자로 갈라진 얼굴판
    S.rect(4, 9, 14, 1, shade(C.base, -0.48));
    S.rect(10, 5, 2, 9, shade(C.base, -0.48));
    blob(S, 5, 6, 4, 3, RED); blob(S, 13, 6, 4, 3, RED);
    S.set(6, 7, '#ff9a8a'); S.set(14, 7, '#ff9a8a');
    S.taper(0, 11, 5, 4, C.dark, 1); S.taper(17, 11, 5, 4, C.dark, 1);
    S.taper(6, 15, 5, 7, C.dark); S.taper(11, 15, 5, 7, C.dark);
  },

  metagross(S, C) {
    blob(S, 2, 3, 18, 10, C.base, 3);
    S.rect(5, 3, 12, 1, shade(C.base, 0.48));
    // 얼굴을 가르는 십자 — 메타그로스의 표식
    S.rect(2, 8, 18, 2, shade(C.base, -0.52));
    S.rect(10, 3, 2, 10, shade(C.base, -0.52));
    blob(S, 4, 4, 5, 4, RED); blob(S, 13, 4, 5, 4, RED);
    S.rect(5, 5, 3, 2, '#ff9a8a'); S.rect(14, 5, 3, 2, '#ff9a8a');
    S.taper(0, 12, 7, 5, C.dark, 1);             // 네 다리
    S.taper(15, 12, 7, 5, C.dark, 1);
    S.taper(3, 13, 6, 9, C.base);
    S.taper(13, 13, 6, 9, C.base);
  },

  mega_metagross(S, C) {
    blob(S, 2, 2, 18, 10, C.base, 3);
    S.rect(2, 7, 18, 2, shade(C.base, -0.52));
    S.rect(10, 2, 2, 10, shade(C.base, -0.52));
    blob(S, 4, 3, 5, 4, RED); blob(S, 13, 3, 5, 4, RED);
    S.rect(5, 4, 3, 2, '#ff9a8a'); S.rect(14, 4, 3, 2, '#ff9a8a');
    for (const y of [12, 16]) {                  // 팔이 넷 더 붙어 여덟
      S.taper(0, y, 7, 4, C.dark, 1);
      S.taper(15, y, 7, 4, C.dark, 1);
    }
    S.taper(3, 12, 6, 10, C.base);
    S.taper(13, 12, 6, 10, C.base);
    S.rect(9, 13, 4, 3, '#7fd8ff');              // 코어 발광
  },

  // ══════════ 코일 라인 ══════════
  magnemite(S, C) {
    blob(S, 6, 6, 10, 11, C.base, 2);            // 회색 구체
    S.rect(8, 6, 6, 1, shade(C.base, 0.48));
    // 좌우 자석 — 빨강/파랑 극
    S.shaded(1, 8, 5, 4, STEEL_D); S.rect(1, 8, 5, 2, RED);
    S.shaded(16, 8, 5, 4, STEEL_D); S.rect(16, 10, 5, 2, '#5a8fd0');
    S.rect(9, 3, 4, 4, STEEL); S.rect(10, 2, 2, 6, STEEL_D);      // 십자 나사
    S.rect(9, 16, 4, 4, STEEL); S.rect(10, 15, 2, 6, STEEL_D);
    blob(S, 8, 9, 6, 5, WHITE);                  // 외눈
    S.rect(9, 10, 4, 3, INKY);
  },

  magneton(S, C) {
    // 코일 셋이 삼각으로 뭉친다
    const unit = (x, y) => {
      blob(S, x, y, 8, 8, C.base, 2);
      S.rect(x + 2, y, 4, 1, shade(C.base, 0.48));
      blob(S, x + 2, y + 3, 5, 4, WHITE);
      S.rect(x + 3, y + 4, 3, 2, INKY);
    };
    unit(0, 12); unit(14, 12); unit(7, 2);
    S.shaded(0, 9, 4, 3, STEEL_D); S.shaded(18, 9, 4, 3, STEEL_D);
    S.rect(0, 9, 4, 1, RED); S.rect(18, 11, 4, 1, '#5a8fd0');
    S.rect(9, 0, 4, 3, STEEL_D);
    S.rect(5, 8, 4, 2, STEEL_D); S.rect(13, 8, 4, 2, STEEL_D);
  },

  magnezone(S, C) {
    S.taper(0, 9, 22, 4, C.base, 1);             // UFO 접시
    S.rect(2, 9, 18, 1, shade(C.base, 0.45));
    S.rect(3, 13, 16, 2, shade(C.base, -0.42));
    dome(S, 5, 3, 12, 7, C.light, 2);            // 상부 돔
    S.rect(9, 0, 4, 4, STEEL_D);                 // 안테나
    S.set(10, 0, RED); S.set(11, 0, RED);
    blob(S, 3, 10, 5, 4, WHITE); S.rect(4, 11, 3, 2, INKY);       // 눈 셋
    blob(S, 14, 10, 5, 4, WHITE); S.rect(15, 11, 3, 2, INKY);
    blob(S, 8, 5, 6, 4, RED); S.rect(9, 6, 3, 2, '#ff9a8a');
    S.shaded(0, 11, 4, 4, STEEL_D); S.shaded(18, 11, 4, 4, STEEL_D);
    S.rect(0, 11, 4, 1, RED); S.rect(18, 14, 4, 1, '#5a8fd0');
  },
};

export const hasSprite = (id) => Object.prototype.hasOwnProperty.call(SPRITES, id);
