// ─────────────────────────────────────────────────────────────
// unitArt.js — 포켓몬 유닛 도트 스프라이트 조립기
//
// 전용 도트(monsterSprites.js)가 없는 id 만 부위 조합으로 만든다.
//   build  체형   rookie | biped | quad | humanoid | armored | mech | wraith
//   head   머리   snout | round | helm | skull | hood | visor
//   horn   뿔     0~3 (+ hornStyle: back | straight | curve)
//   ear    귀     none | point | long
//   wing   날개   none | feather | bat | metal | energy
//   tail   꼬리   none | thick | thin | tuft | blade
//   hand   손     none | claw | gauntlet | cannon | blade | staff
//   mark   무늬   none | belly | stripe | plate | rib
//   glow   기운   none | holy | dark | core
//
// 격자 22×24 에 도트를 찍고 통째로 확대한다. 곡선도 그라디언트도 쓰지 않고
// 색은 밝은 면 / 기본 / 어두운 면 3단으로만 나눈다.
// 스프라이트는 몬스터당 한 번만 구워서 캐시하므로 매 프레임 비용이 거의 없다.
// ─────────────────────────────────────────────────────────────
import { shade, inkOf, hexOf } from './shading.js';
import { createSprite } from './pixelSprite.js';
import { SPRITES } from './monsterSprites.js';
import { ATTACK } from './attackArt.js';

const W = 22, H = 24;
const SCALE = 4;                       // 도트 하나당 4px 로 구워두고 렌더에서 축소

const DEFAULT_LOOK = {
  build: 'rookie', head: 'round', horn: 0, hornStyle: 'straight',
  ear: 'none', wing: 'none', tail: 'none', hand: 'none',
  mark: 'none', glow: 'none',
};

const ATTR_COLOR = { FIRE: '#4fc3f7', GRASS: '#6ddf9c', WATER: '#c77dff' };

const cache = new Map();

/** #rrggbb 의 색상(hue)만 deg 만큼 돌린다 — 이로치 팔레트용 */
function shiftHue(hex, deg) {
  if (typeof hex !== 'string' || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + deg + 360) % 360;
  const l = (mx + mn) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const c = (1 - Math.abs(2 * l - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60);
  const rgb = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][seg] || [0,0,0];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(rgb[0]) + to(rgb[1]) + to(rgb[2]);
}

/**
 * 몬스터 하나의 스프라이트(캔버스). 한 번만 굽고 캐시한다.
 * attack=true 면 공격 포즈 프레임을 굽는다 — 프레임 두 장짜리 애니메이션.
 */
export function spriteFor(def, attack = false, shiny = false) {
  const key = def.name + (attack ? '!' : '') + (shiny ? '*' : '');
  if (cache.has(key)) return cache.get(key);

  const L = { ...DEFAULT_LOOK, ...(def.look || {}) };
  // 이로치는 색만 돌린다 — 도트를 새로 찍지 않아도 "다른 개체"로 읽힌다.
  // 원작도 팔레트 교체 방식이라 개념이 같다.
  const base = shiny ? shiftHue(def.color, 148) : def.color;
  const C = {
    base,
    light: shade(base, 0.34),
    dark: shade(base, -0.34),
    deep: shade(base, -0.55),
    alt: L.alt || shade(base, -0.42),
    ink: hexOf(def.mega ? '#6b430a' : inkOf(base)),
    // 흰색 계열끼리 뭉개지지 않게, 가슴 문장은 속성 색으로 찍는다
    attr: ATTR_COLOR[def.attr] || '#dbe4f0',
  };

  const S = createSprite(W, H);
  const custom = SPRITES[def.id];
  if (custom) {
    custom(S, C);                    // 몬스터 전용 도트
  } else {
    wing(S, L, C);                   // 없으면 부위 조합으로 자동 생성
    tail(S, L, C);
    legs(S, L, C);
    body(S, L, C);
    mark(S, L, C);
    arms(S, L, C);
    head(S, L, C);
  }
  if (attack) {
    const pose = ATTACK[def.id];
    if (pose) pose(S, C);
    else S.rect(0, 0, 0, 0, null);     // 전용 포즈가 없으면 기본 프레임 그대로
  }
  S.outline(C.ink);
  glow(S, L);

  const cv = S.bake(SCALE);
  cache.set(key, cv);
  return cv;
}

/**
 * UI(DOM)에서 쓸 수 있는 data URL.
 * 캔버스를 그대로 넘기면 innerHTML 로 갈아끼울 때마다 사라지므로 <img> 로 쓴다.
 */
const urlCache = new Map();
export function spriteURL(def, shiny = false) {
  const key = def.id + (shiny ? '*' : '');
  if (urlCache.has(key)) return urlCache.get(key);
  const url = spriteFor(def, false, shiny).toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}

/** 유닛 그리기 — 구워둔 스프라이트를 크기에 맞춰 붙인다 */
// 진화 단계가 곧 덩치다. 파이리와 리자몽이 같은 크기로 보이면
// "키웠다"는 감각이 안 오고, 필드에서 무엇이 주력인지도 한눈에 안 읽힌다.
const TIER_SCALE = { 1: 0.82, 2: 0.92, 3: 1.0, 4: 1.08 };

export function drawUnit(ctx, def, cx, cy, s, aim = 0, attacking = false, shiny = false) {
  const cv = spriteFor(def, attacking, shiny);
  // 타일(44px)을 넘지 않게 — 더 키우면 세로로 붙은 유닛끼리 겹친다
  const dw = s * 1.24 * (TIER_SCALE[def.tier] ?? 1);
  const dh = dw * (H / W);
  const flip = Math.cos(aim) < -0.35 ? -1 : 1;   // 왼쪽을 겨누면 몸을 돌린다

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  ctx.drawImage(cv, -dw / 2, -dh * 0.56, dw, dh);
  ctx.restore();
}

// ── 체형 ────────────────────────────────────────────────────
function body(S, L, C) {
  switch (L.build) {
    case 'mech':
      S.shaded(7, 11, 8, 7, C.base);
      S.rect(8, 13, 6, 3, C.alt);              // 흉부 패널
      S.rect(8, 13, 6, 1, shade(C.alt, 0.3));
      S.rect(8, 11, 6, 1, C.light);
      break;
    case 'armored':
      S.shaded(8, 11, 6, 7, C.base);                    // 좁은 허리
      S.symShaded(5, 10, 3, 3, L.pauldron || C.light);  // 밖으로 튀어나온 어깨 갑주
      S.rect(8, 17, 6, 1, C.deep);
      break;
    case 'quad':
      S.shaded(4, 11, 14, 6, C.base);          // 가로로 긴 몸통
      break;
    case 'wraith':
      S.shaded(7, 11, 8, 7, C.base);
      // 아래가 너덜너덜한 자락
      S.rect(7, 18, 2, 4, C.alt); S.rect(10, 18, 2, 2, C.alt);
      S.rect(13, 18, 2, 4, C.alt);
      break;
    case 'humanoid':
      S.shaded(8, 11, 6, 7, C.base);
      S.symShaded(6, 11, 2, 3, C.light);       // 어깨
      break;
    case 'biped':
      S.shaded(7, 11, 8, 7, C.base);
      break;
    default:                                   // rookie
      S.shaded(7, 12, 8, 6, C.base);
  }
}

function legs(S, L, C) {
  const foot = (x, y, w, h) => { S.shaded(x, y, w, h, C.dark); };
  switch (L.build) {
    case 'quad':
      foot(5, 17, 3, 5); foot(9, 17, 3, 5); foot(14, 17, 3, 5);
      break;
    case 'wraith':
      break;                                   // 하체 없음
    case 'mech':
      foot(6, 18, 4, 5); foot(12, 18, 4, 5);
      S.rect(6, 22, 4, 1, C.deep); S.rect(12, 22, 4, 1, C.deep);
      break;
    case 'armored':
    case 'humanoid':
    case 'biped':
      foot(8, 18, 2, 5); foot(12, 18, 2, 5);
      S.rect(7, 22, 3, 1, C.deep); S.rect(12, 22, 3, 1, C.deep);   // 발
      break;
    default:
      foot(8, 18, 2, 4); foot(12, 18, 2, 4);
      S.rect(7, 21, 3, 1, C.deep); S.rect(12, 21, 3, 1, C.deep);
  }
}

// ── 무늬 ────────────────────────────────────────────────────
function mark(S, L, C) {
  const col = L.markColor || null;
  switch (L.mark) {
    case 'belly':
      S.shaded(8, 13, 6, 5, col || shade(C.light, 0.35));
      break;
    case 'stripe':
      S.rect(7, 12, 8, 1, col || C.alt);
      S.rect(7, 15, 8, 1, col || C.alt);
      break;
    case 'plate': {
      const c = (col && col !== '#dbe4f0') ? col : C.attr;   // 속성 색 문장
      S.set(10, 13, c); S.set(11, 13, c);
      S.rect(9, 14, 4, 1, shade(c, 0.35));
      S.rect(9, 15, 4, 1, c);
      S.set(10, 16, shade(c, -0.3)); S.set(11, 16, shade(c, -0.3));
      break;
    }
    case 'rib':
      for (const y of [12, 14, 16]) {
        S.rect(8, y, 6, 1, shade(C.base, 0.5));
        S.set(7, y + 1, shade(C.base, 0.5)); S.set(14, y + 1, shade(C.base, 0.5));
      }
      break;
    default: break;
  }
}

// ── 팔 / 무기 ───────────────────────────────────────────────
function arms(S, L, C) {
  if (L.hand === 'none') return;
  const hc = L.handColor;
  switch (L.hand) {
    case 'claw':
      S.symShaded(5, 13, 2, 4, C.dark);
      S.sym(4, 17, 1, 2, '#f4efe0'); S.sym(6, 17, 1, 2, '#f4efe0');
      break;
    case 'gauntlet':
      S.symShaded(4, 12, 4, 5, hc || '#d8dee6');
      S.sym(4, 16, 4, 1, shade(hc || '#d8dee6', -0.35));
      break;
    case 'cannon':
      S.symShaded(4, 12, 3, 4, C.dark);
      S.shaded(15, 12, 7, 4, hc || '#aab4c0');   // 굵고 긴 포신
      S.rect(21, 13, 1, 2, '#33240f');
      S.rect(15, 12, 7, 1, '#e6edf6');
      break;
    case 'blade':
      S.symShaded(5, 13, 2, 4, C.dark);
      S.rect(17, 5, 2, 12, hc || '#e6edf6');     // 길게 세운 검
      S.rect(17, 5, 2, 1, '#ffffff');
      S.rect(16, 15, 4, 1, C.deep);              // 코등이
      S.rect(17, 16, 2, 2, C.dark);
      break;
    case 'staff':
      S.symShaded(5, 13, 2, 4, C.dark);
      S.rect(18, 6, 1, 13, '#7a5a32');           // 긴 지팡이
      S.rect(17, 3, 3, 3, hc || C.light);        // 큰 보주
      S.set(18, 2, shade(hc || C.light, 0.5));
      break;
    default: break;
  }
}

// ── 머리 ────────────────────────────────────────────────────
function head(S, L, C) {
  const hy = 3;                                 // 머리 윗줄

  // 귀 (머리 뒤)
  if (L.ear === 'point') {
    S.taper(4, hy - 1, 3, 4, C.light);
    S.taper(15, hy - 1, 3, 4, C.light);
  } else if (L.ear === 'long') {
    S.symShaded(3, hy - 2, 2, 6, C.light);
  }

  // 뿔
  const horns = L.horn | 0;
  const hornCol = L.hornColor || '#efe6cf';
  if (horns >= 1) {
    if (horns === 1) S.taper(10, hy - 3, 2, 3, hornCol);
    else {
      S.taper(6, hy - 3, 2, 3, hornCol);
      S.taper(14, hy - 3, 2, 3, hornCol);
      if (horns >= 3) S.taper(10, hy - 4, 2, 3, hornCol);
    }
  }

  switch (L.head) {
    case 'snout':
      S.shaded(7, hy, 8, 6, C.base);
      S.shaded(8, hy + 5, 6, 3, C.light);       // 주둥이
      S.rect(9, hy + 7, 1, 1, '#f4efe0');       // 이빨
      S.rect(11, hy + 7, 1, 1, '#f4efe0');
      eyes(S, hy + 2, 2);
      break;
    case 'helm':
      S.shaded(7, hy, 8, 6, L.helmColor || C.alt);
      S.rect(8, hy + 2, 6, 2, '#242a33');       // 아이 슬릿
      S.rect(8, hy + 3, 6, 1, L.eyeColor || '#ff5a3c');
      S.taper(10, hy - 2, 2, 3, shade(L.helmColor || C.alt, 0.4));   // 볏
      S.rect(9, hy + 6, 4, 1, shade(L.helmColor || C.alt, -0.25));   // 턱 가리개
      break;
    case 'visor':
      S.shaded(6, hy, 10, 6, L.helmColor || C.alt);
      S.rect(7, hy + 2, 8, 2, '#12303a');
      S.rect(8, hy + 3, 6, 1, L.eyeColor || '#59f0ff');
      break;
    case 'skull':
      S.shaded(7, hy, 8, 6, '#e6e2d4');
      S.rect(8, hy + 2, 2, 2, '#1b1610');
      S.rect(12, hy + 2, 2, 2, '#1b1610');
      S.set(8, hy + 3, L.eyeColor || '#ff3b3b');
      S.set(13, hy + 3, L.eyeColor || '#ff3b3b');
      S.rect(9, hy + 5, 4, 1, '#d8d3c2');
      S.set(10, hy + 6, '#d8d3c2'); S.set(12, hy + 6, '#d8d3c2');
      break;
    case 'hood': {
      const hc = L.helmColor || C.dark;
      S.taper(7, hy - 2, 8, 4, hc, 1);          // 뾰족한 후드
      S.shaded(7, hy + 1, 8, 5, hc);
      S.rect(8, hy + 2, 6, 3, '#120d08');       // 그늘진 얼굴
      S.set(9, hy + 3, L.eyeColor || '#ffd166');
      S.set(12, hy + 3, L.eyeColor || '#ffd166');
      break;
    }
    default:                                    // round
      S.shaded(7, hy, 8, 6, C.base);
      eyes(S, hy + 2, 2);
  }

  // 볏 / 후광 / 안테나
  if (L.crest === 'halo') {
    S.rect(8, hy - 3, 6, 1, '#ffe9a8');
    S.set(7, hy - 3, '#ffd166'); S.set(14, hy - 3, '#ffd166');
  } else if (L.crest === 'fin') {
    S.taper(10, hy - 3, 2, 3, C.light);
  } else if (L.crest === 'antenna') {
    S.rect(12, hy - 3, 1, 3, shade(C.base, -0.5));
    S.set(13, hy - 4, '#ff6b4a');
  }
}

function eyes(S, y, sz) {
  S.rect(8, y, sz, sz, '#f3f0e4');
  S.rect(12, y, sz, sz, '#f3f0e4');
  S.set(9, y + 1, '#1b1610');
  S.set(13, y + 1, '#1b1610');
}

// ── 날개 ────────────────────────────────────────────────────
function wing(S, L, C) {
  const wc = L.wingColor;
  switch (L.wing) {
    case 'feather':
      S.symShaded(1, 6, 5, 6, wc || '#f4efe0');
      S.sym(2, 12, 4, 2, shade(wc || '#f4efe0', -0.2));
      S.sym(2, 5, 3, 1, shade(wc || '#f4efe0', 0.35));
      break;
    case 'bat':
      S.symShaded(0, 5, 6, 5, wc || C.alt);
      S.sym(0, 10, 4, 3, shade(wc || C.alt, -0.2));
      S.sym(0, 4, 3, 1, shade(wc || C.alt, 0.25));
      S.sym(1, 13, 3, 2, shade(wc || C.alt, -0.35));
      break;
    case 'metal':
      S.symShaded(0, 7, 6, 3, wc || '#c9d2dc');
      S.sym(1, 10, 5, 2, shade(wc || '#c9d2dc', -0.25));
      S.sym(0, 6, 4, 1, '#ffffff');
      break;
    case 'energy':
      S.symShaded(0, 6, 5, 4, wc || '#8ee6ff');
      S.sym(1, 10, 4, 3, shade(wc || '#8ee6ff', -0.2));
      break;
    default: break;
  }
}

// ── 꼬리 ────────────────────────────────────────────────────
function tail(S, L, C) {
  switch (L.tail) {
    case 'thick':
      S.shaded(16, 14, 5, 3, C.dark);
      S.shaded(19, 11, 3, 4, C.dark);
      break;
    case 'thin':
      S.rect(16, 15, 4, 1, C.dark);
      S.rect(19, 12, 1, 4, C.dark);
      break;
    case 'tuft':
      S.rect(16, 15, 4, 1, C.dark);
      S.shaded(19, 13, 3, 3, C.light);
      break;
    case 'blade':
      S.shaded(16, 14, 4, 2, C.alt);
      S.taper(19, 11, 3, 4, C.alt);
      break;
    default: break;
  }
}

// ── 기운 ────────────────────────────────────────────────────
// 부드러운 발광은 도트 느낌을 깨므로, 실루엣 바깥에 한 겹 더 두른다.
function glow(S, L) {
  if (L.glow === 'none') return;
  const col = L.glow === 'holy' ? '#ffe9a8' : L.glow === 'dark' ? '#a860ff' : '#ff5a7a';
  const add = [];
  for (let y = 0; y < S.h; y++) {
    for (let x = 0; x < S.w; x++) {
      if (S.get(x, y)) continue;
      if (S.get(x - 1, y) || S.get(x + 1, y) || S.get(x, y - 1) || S.get(x, y + 1)) add.push([x, y]);
    }
  }
  for (const [x, y] of add) S.set(x, y, col);
}
