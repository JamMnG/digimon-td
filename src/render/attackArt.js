// ─────────────────────────────────────────────────────────────
// attackArt.js — 공격 모션 (포켓몬별)
//
// 두 축으로 나눈다.
//   1) 공격 포즈  — 기본 스프라이트 위에 몇 줄만 덮어써서 "쏘는 자세"를 만든다.
//                   입을 벌리거나, 주먹을 내지르거나, 코어가 달아오른다.
//   2) 전용 탄    — 기술마다 탄 모양이 다르다. 도트로 굽고 각도만 돌려 붙인다.
//
// 포즈는 발사 직후 반동(recoil) 동안만 나타난다. 프레임 두 장짜리 애니메이션이다.
// ─────────────────────────────────────────────────────────────
import { shade } from './shading.js';
import { createSprite } from './pixelSprite.js';

const CLAW = '#f6f2e4';
const WHITE = '#f4efe6';
const GOLD = '#f0c040';

// ── 포즈 공용 부품 ──────────────────────────────────────────

/** 입을 크게 벌린다 — 불꽃을 뿜는 종 */
function maw(S, x, y, w, h, dark = '#5c1a08', hot = '#ff8c1a') {
  S.rect(x, y, w, h, dark);
  S.rect(x + 1, y + 1, w - 2, Math.max(1, h - 2), hot);
  for (let i = x; i < x + w; i += 2) { S.set(i, y, CLAW); S.set(i + 1, y + h - 1, CLAW); }
}

/** 이빨을 드러내고 문다 — 딥상어동 라인 */
function bite(S, x, y, w) {
  S.rect(x, y, w, 5, '#3a1010');
  S.rect(x + 1, y + 1, w - 2, 3, '#c0392b');
  for (let i = x; i < x + w; i += 2) { S.set(i, y, WHITE); S.set(i, y + 4, WHITE); }
}

/** 주먹을 앞으로 내지른다 */
function punch(S, C, x, y) {
  S.rect(x, y, 6, 4, C.base);
  S.rect(x, y, 6, 1, shade(C.base, 0.35));
  S.rect(x, y + 4, 5, 1, shade(C.base, -0.35));
}

/** 초능력 파동 — 세로 광선 한 줄 */
function psiRing(S, x, col = '#c8b0ff') {
  S.rect(x, 6, 2, 8, col);
  S.set(x, 5, WHITE); S.set(x + 1, 14, WHITE);
}

/** 유령이 부풀어 번진다 */
function ghostFlare(S, C) {
  S.rect(0, 2, 22, 2, shade(C.base, 0.35));
  S.rect(0, 18, 22, 2, shade(C.base, -0.4));
}

/** 촛불이 치솟는다 */
function candleFlare(S, x, y, h) {
  S.taper(x, y, 5, h, '#6fd0ff');
  S.taper(x + 1, y + 1, 3, Math.max(1, h - 2), '#c4f0ff');
}

/** 전기가 튄다 */
function boltRing(S, x, y) {
  for (let i = 0; i < 4; i++) S.set(x + (i % 2 ? 2 : 0), y + i, '#c8f4ff');
  S.set(x + 1, y + 4, '#ffffff');
}

/** 발톱이 스친 자국 */
function slashArc(S, x, y, col) {
  for (let i = 0; i < 5; i++) S.set(x + i, y + i, col);
}

// ── 1) 공격 포즈 ────────────────────────────────────────────
// 기본 스프라이트를 그린 뒤 실행된다. 필요한 부분만 덮어쓴다.
export const ATTACK = {
  // 입을 벌려 뿜는 형
  charmander(S) { maw(S, 7, 8, 8, 3); },
  charmeleon(S) { maw(S, 6, 8, 10, 3); },
  charizard(S) { maw(S, 6, 7, 10, 4); },
  mega_charizard_x(S) { maw(S, 6, 7, 10, 4, '#0e2a4a', '#6fd0ff'); },
  mega_charizard_y(S) { maw(S, 5, 7, 12, 5); },
  tepig(S) { S.rect(1, 6, 4, 4, '#ff8c1a'); S.rect(2, 7, 2, 2, '#ffd457'); },
  pignite(S) { maw(S, 7, 8, 8, 3); },
  emboar(S) { maw(S, 7, 7, 8, 4); },

  // 큰 턱으로 무는 형
  gible(S) { bite(S, 4, 7, 14); },
  gabite(S) { bite(S, 5, 7, 12); },
  garchomp(S) { bite(S, 6, 7, 10); slashArc(S, 0, 12, CLAW); },
  mega_garchomp(S) { bite(S, 6, 7, 10); slashArc(S, 0, 10, '#ff8a5a'); slashArc(S, 16, 12, '#ff8a5a'); },

  // 주먹을 내지르는 형
  machop(S, C) { punch(S, C, 1, 12); },
  machoke(S, C) { punch(S, C, 0, 12); },
  machamp(S, C) { punch(S, C, 0, 11); punch(S, C, 0, 15); },
  mega_machamp(S, C) { punch(S, C, 0, 10); punch(S, C, 0, 15); S.rect(0, 9, 22, 1, '#ffb03a'); },
  poliwag(S) { S.rect(5, 9, 12, 1, '#a8e0ff'); },
  poliwhirl(S) { S.rect(0, 14, 5, 4, WHITE); },
  poliwrath(S) { S.rect(0, 13, 6, 5, WHITE); S.rect(0, 12, 6, 1, '#ffffff'); },

  // 초능력을 모으는 형
  abra(S) { psiRing(S, 3); },
  kadabra(S) { psiRing(S, 2); S.rect(1, 5, 3, 2, '#e8f0ff'); },
  alakazam(S) { psiRing(S, 1); S.rect(1, 4, 3, 2, '#e8f0ff'); S.rect(18, 4, 3, 2, '#e8f0ff'); },
  mega_alakazam(S) { psiRing(S, 0); psiRing(S, 20); },
  ralts(S) { psiRing(S, 2, '#7fe0a0'); },
  kirlia(S) { psiRing(S, 1, '#7fe0a0'); },
  gardevoir(S) { psiRing(S, 0, '#ffd0e0'); },
  mega_gardevoir(S) { psiRing(S, 0, '#ffd0e0'); psiRing(S, 20, '#ffd0e0'); },

  // 날개를 펼치는 형
  togepi(S) { S.rect(2, 8, 3, 3, GOLD); S.rect(17, 8, 3, 3, GOLD); },
  togetic(S) { S.sym(0, 7, 5, 5, WHITE); },
  togekiss(S) { S.sym(0, 5, 8, 6, WHITE); S.rect(0, 11, 22, 1, '#e8f4ff'); },
  dratini(S) { S.rect(4, 6, 14, 1, '#a8e0ff'); },
  dragonair(S) { S.rect(3, 6, 16, 2, '#a8e0ff'); },
  dragonite(S) { S.sym(0, 8, 5, 4, '#7fe0a0'); },

  // 유령형 — 몸이 번지고 입이 커진다
  gastly(S, C) { ghostFlare(S, C); },
  haunter(S, C) {
    ghostFlare(S, C);
    S.rect(0, 8, 6, 5, shade(C.base, 0.2));
    S.rect(16, 8, 6, 5, shade(C.base, 0.2));
  },
  gengar(S, C) {
    ghostFlare(S, C);
    S.rect(5, 7, 12, 4, WHITE);
    for (let x = 6; x < 17; x += 2) S.set(x, 7, C.deep);
  },
  mega_gengar(S, C) {
    ghostFlare(S, C);
    S.rect(4, 7, 14, 4, WHITE);
    S.rect(8, 0, 6, 4, '#e0483a');
  },

  // 촛불형 — 불꽃이 치솟는다
  litwick(S) { candleFlare(S, 9, 0, 5); },
  lampent(S) { candleFlare(S, 8, 0, 7); },
  chandelure(S) { candleFlare(S, 8, 0, 7); candleFlare(S, 0, 5, 5); candleFlare(S, 16, 5, 5); },

  // 풀형 — 덩굴과 꽃가루
  bulbasaur(S) { S.rect(0, 10, 6, 1, '#4f9e52'); S.rect(0, 9, 2, 3, '#37773c'); },
  ivysaur(S) { S.rect(0, 10, 8, 2, '#4f9e52'); },
  venusaur(S) {
    for (const x of [2, 7, 12, 17]) S.rect(x, 0, 3, 2, '#e8709a');
    S.rect(0, 3, 22, 1, '#f0a0c0');
  },

  // 강철형 — 코어가 달아오른다
  beldum(S) { S.rect(7, 9, 8, 6, '#ff9a8a'); },
  metang(S) { S.rect(5, 5, 5, 5, '#ff9a8a'); S.rect(12, 5, 5, 5, '#ff9a8a'); },
  metagross(S) {
    S.rect(4, 4, 6, 5, '#ff9a8a'); S.rect(12, 4, 6, 5, '#ff9a8a');
    S.rect(3, 8, 16, 2, '#ffd0a0');
  },
  mega_metagross(S) { S.rect(3, 3, 16, 6, '#ff9a8a'); S.rect(8, 12, 6, 4, '#c8f4ff'); },
  magnemite(S) { boltRing(S, 7, 6); },
  magneton(S) { boltRing(S, 6, 5); boltRing(S, 13, 5); },
  magnezone(S) { boltRing(S, 4, 8); boltRing(S, 14, 8); S.rect(0, 9, 22, 1, '#c8f4ff'); },
};

// ── 2) 전용 탄 ──────────────────────────────────────────────
export const SHOT_OF = {
  // 불꽃 계열
  charmander: ['fire', '#ff8c42'], charmeleon: ['fire', '#e2542f'],
  charizard: ['bigfire', '#f2691f'],
  mega_charizard_x: ['beam', '#6fd0ff'], mega_charizard_y: ['bigfire', '#ff6a10'],
  tepig: ['fire', '#e08a6a'], pignite: ['bigfire', '#d8703f'],
  emboar: ['bigfire', '#c2502a'],
  litwick: ['fire', '#6fd0ff'], lampent: ['bigfire', '#6fd0ff'],
  chandelure: ['bigfire', '#c4f0ff'],

  // 드래곤 계열
  dratini: ['orb', '#a8e0ff'], dragonair: ['beam', '#8fd4e8'],
  dragonite: ['beam', '#f0a83c'],
  gible: ['bullet', '#4a7fc1'], gabite: ['slash', '#8fb8e8'],
  garchomp: ['slash', '#a8d0ff'], mega_garchomp: ['slash', '#ff8a5a'],

  // 격투 계열
  machop: ['bullet', '#c8d8e4'], machoke: ['bullet', '#a8c0d4'],
  machamp: ['bullet', '#e8f0f8'], mega_machamp: ['bullet', '#ffd0a0'],
  poliwag: ['orb', '#a8e0ff'], poliwhirl: ['orb', '#7fc8f0'],
  poliwrath: ['bullet', '#e8f4ff'],

  // 에스퍼 계열
  abra: ['star', '#ffe9a8'], kadabra: ['star', '#ffd166'],
  alakazam: ['beam', '#fff0c0'], mega_alakazam: ['beam', '#e8f0ff'],
  ralts: ['orb', '#c8f0d8'], kirlia: ['star', '#d8f0e0'],
  gardevoir: ['star', '#ffd0e0'], mega_gardevoir: ['beam', '#ffd0e0'],
  togepi: ['orb', '#fff0cc'], togetic: ['star', '#fff6dd'],
  togekiss: ['arrow', '#e8f4ff'],

  // 고스트 계열
  gastly: ['dark', '#8a6fd0'], haunter: ['dark', '#7b5fc4'],
  gengar: ['dark', '#6b4fb8'], mega_gengar: ['dark', '#3a1f6a'],

  // 풀 계열
  bulbasaur: ['bullet', '#7fc98f'], ivysaur: ['orb', '#6fbc86'],
  venusaur: ['orb', '#e8709a'],

  // 강철 계열
  beldum: ['missile', '#8fa8d0'], metang: ['missile', '#6f88b8'],
  metagross: ['missile', '#4f6aa0'], mega_metagross: ['beam', '#7fd8ff'],
  magnemite: ['bolt', '#c8f4ff'], magneton: ['bolt', '#a8e4ff'],
  magnezone: ['bolt', '#7fd8ff'],
};

const shotCache = new Map();

/** 탄 스프라이트 (오른쪽을 향한 상태로 굽는다) */
function shotSprite(kind, col) {
  const key = kind + col;
  if (shotCache.has(key)) return shotCache.get(key);
  const lo = shade(col, -0.35), hi = shade(col, 0.55);
  let S;

  switch (kind) {
    case 'fire':
      S = createSprite(7, 5);
      S.rect(0, 2, 3, 1, lo); S.rect(2, 1, 3, 3, col);
      S.rect(4, 2, 2, 1, hi); S.set(3, 2, hi);
      break;
    case 'bigfire':
      S = createSprite(10, 7);
      S.rect(0, 3, 4, 1, lo); S.rect(1, 2, 3, 3, lo);
      S.rect(3, 1, 5, 5, col); S.rect(5, 2, 3, 3, hi);
      S.rect(7, 3, 2, 1, '#ffffff');
      break;
    case 'missile':
      S = createSprite(11, 5);
      S.rect(0, 2, 3, 1, '#ff8a3c'); S.rect(1, 1, 2, 3, '#ffd166');
      S.rect(3, 1, 5, 3, col); S.rect(3, 1, 5, 1, hi);
      S.rect(8, 2, 2, 1, lo); S.set(10, 2, lo);
      S.set(3, 0, lo); S.set(3, 4, lo);
      break;
    case 'ice':
      S = createSprite(9, 7);
      S.rect(2, 2, 5, 3, col); S.rect(3, 1, 3, 1, hi);
      S.rect(3, 5, 3, 1, lo); S.set(0, 3, hi); S.set(8, 3, hi);
      S.set(1, 1, col); S.set(7, 5, col);
      break;
    case 'beam':
      S = createSprite(16, 5);
      S.rect(0, 2, 16, 1, lo);
      S.rect(2, 1, 12, 3, col);
      S.rect(4, 2, 10, 1, '#ffffff');
      break;
    case 'bolt':
      S = createSprite(12, 8);
      S.rect(0, 4, 3, 1, col); S.rect(3, 2, 3, 1, col);
      S.rect(6, 5, 3, 1, col); S.rect(9, 3, 3, 1, col);
      S.rect(3, 3, 1, 1, hi); S.rect(6, 4, 1, 1, hi); S.rect(9, 4, 1, 1, hi);
      break;
    case 'arrow':
      S = createSprite(12, 5);
      S.rect(0, 2, 8, 1, col); S.rect(7, 1, 3, 3, hi);
      S.set(10, 2, '#ffffff'); S.set(0, 1, lo); S.set(0, 3, lo);
      break;
    case 'star':
      S = createSprite(9, 9);
      S.rect(4, 0, 1, 9, col); S.rect(0, 4, 9, 1, col);
      S.rect(3, 3, 3, 3, hi); S.set(4, 4, '#ffffff');
      S.set(2, 2, col); S.set(6, 6, col); S.set(6, 2, col); S.set(2, 6, col);
      break;
    case 'slash':
      S = createSprite(9, 11);
      for (let i = 0; i < 9; i++) {
        const y = Math.round(5 - Math.cos((i / 8) * Math.PI) * 4.5);
        S.set(i, y, col); S.set(i, y + 1, hi);
      }
      break;
    case 'bone':
      S = createSprite(11, 5);
      S.rect(2, 2, 7, 1, col);
      S.set(1, 1, col); S.set(1, 3, col); S.set(9, 1, col); S.set(9, 3, col);
      S.rect(3, 2, 4, 1, hi);
      break;
    case 'dark':
      S = createSprite(9, 9);
      S.rect(2, 2, 5, 5, col); S.rect(3, 3, 3, 3, lo);
      S.set(0, 4, col); S.set(8, 4, col); S.set(4, 0, col); S.set(4, 8, col);
      S.set(4, 4, '#1a0a24');
      break;
    case 'bullet':
      S = createSprite(6, 3);
      S.rect(0, 1, 4, 1, lo); S.rect(3, 0, 3, 3, col); S.set(5, 1, '#ffffff');
      break;
    default:                                       // orb
      S = createSprite(7, 7);
      S.rect(1, 1, 5, 5, col); S.rect(2, 2, 3, 3, hi);
      S.set(3, 3, '#ffffff');
      S.rect(0, 3, 1, 1, lo); S.rect(6, 3, 1, 1, lo);
  }
  const cv = S.bake(3);
  shotCache.set(key, cv);
  return cv;
}

/** 탄 하나 그리기 — 도트가 뭉개지지 않게 확대 보간을 끈다 */
export function drawShot(ctx, shotId, x, y, angle, scale = 1) {
  const [kind, col] = SHOT_OF[shotId] || ['orb', '#ffd166'];
  const cv = shotSprite(kind, col);
  const w = cv.width / 3 * 2.0 * scale;
  const h = cv.height / 3 * 2.0 * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(cv, -w * 0.5, -h * 0.5, w, h);
  ctx.restore();
}

/** 발사구 섬광 — 탄 종류에 맞춘 도트 폭발 */
export function drawCast(ctx, shotId, x, y, angle, k) {
  const [kind, col] = SHOT_OF[shotId] || ['orb', '#ffd166'];
  const n = kind === 'beam' ? 5 : 4;
  const len = (kind === 'beam' ? 16 : 11) * (0.5 + k * 0.7);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = k;
  const px = 3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1);
    const w = Math.max(px, (1 - t) * len * 0.55);
    ctx.fillStyle = i === 0 ? '#ffffff' : (i < n - 1 ? shade(col, 0.4) : col);
    ctx.fillRect(t * len, -w / 2, px, w);
  }
  ctx.restore();
}
