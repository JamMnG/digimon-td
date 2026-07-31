// ─────────────────────────────────────────────────────────────
// itemArt.js — 진화 아이템 / 도구 모델
//
// 이모지(🔹💿🔶)는 폰트마다 다르게 나오고 게임 톤과도 안 맞는다.
// 그래서 전부 캔버스로 직접 그린다. 같은 함수를 두 곳에서 쓴다:
//   · 보드 위 설치물     → drawPropModel()
//   · DOM(HUD·상점·교환소) → iconURL() 이 캔버스를 data URL 로 구워서 <img> 로
//
// 조명 규칙은 유닛과 동일(왼쪽 위 광원, 세로 볼륨, 색상 기반 외곽선).
// ─────────────────────────────────────────────────────────────
import { shade, inkOf, volume, roundRect, setInk, getInk } from './shading.js';

// ── 공통 헬퍼 ───────────────────────────────────────────────
const fill = (ctx, col, t, b) => {
  ctx.fillStyle = volume(ctx, t, b, col, 0.36, 0.36);
  ctx.fill();
  ctx.stroke();
};
const poly = (ctx, pts, col) => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  fill(ctx, col, Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1])));
};
const ell = (ctx, x, y, rx, ry, col) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  fill(ctx, col, y - ry, y + ry);
};
const box = (ctx, x, y, w, h, r, col) => {
  roundRect(ctx, x, y, w, h, r);
  fill(ctx, col, y, y + h);
};
const glow = (ctx, x, y, r, col, a = 0.4) => {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

// ── 진화 아이템 ─────────────────────────────────────────────
export const ITEM_COLOR = { chips: '#4fc3f7', disks: '#b28bff', cores: '#ffb03a' };

/** chips | disks | cores. s는 대략의 전체 지름 */
export function drawItem(ctx, id, cx, cy, s) {
  const col = ITEM_COLOR[id] || '#8ee6ff';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.2, s * 0.055);
  ctx.strokeStyle = inkOf(col);

  if (id === 'chips') {
    // 마이크로칩 — 사각 다이 + 양옆 핀
    const w = s * 0.62, h = s * 0.58;
    ctx.fillStyle = shade(col, -0.55);
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(cx - w / 2 - s * 0.16, cy + i * s * 0.19 - s * 0.05, s * 0.18, s * 0.10);
      ctx.fillRect(cx + w / 2 - s * 0.02, cy + i * s * 0.19 - s * 0.05, s * 0.18, s * 0.10);
    }
    box(ctx, cx - w / 2, cy - h / 2, w, h, s * 0.08, col);
    ctx.save();                                     // 회로 무늬
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = shade(col, 0.6);
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.26, cy - h * 0.22);
    ctx.lineTo(cx + w * 0.10, cy - h * 0.22);
    ctx.lineTo(cx + w * 0.10, cy + h * 0.20);
    ctx.lineTo(cx + w * 0.30, cy + h * 0.20);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = shade(col, 0.75);
    ctx.beginPath(); ctx.arc(cx - w * 0.26, cy + h * 0.20, s * 0.05, 0, Math.PI * 2); ctx.fill();

  } else if (id === 'disks') {
    // 광디스크 — 무지개 반사 + 중앙 홀
    glow(ctx, cx, cy, s * 0.66, col, 0.28);
    ell(ctx, cx, cy, s * 0.44, s * 0.44, col);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(cx - s * 0.42, cy - s * 0.42, cx + s * 0.42, cy + s * 0.42);
    g.addColorStop(0, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.35, 'rgba(120,240,255,0.35)');
    g.addColorStop(0.6, 'rgba(255,140,240,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - s * 0.5, cy - s * 0.5, s, s);
    ctx.restore();
    ell(ctx, cx, cy, s * 0.15, s * 0.15, shade(col, -0.35));
    ctx.fillStyle = '#1b1610';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.07, 0, Math.PI * 2); ctx.fill();

  } else {
    // 메가스톤 — 발광하는 팔면체
    glow(ctx, cx, cy, s * 0.72, col, 0.45);
    const T = [cx, cy - s * 0.50], R = [cx + s * 0.38, cy];
    const B = [cx, cy + s * 0.50], L = [cx - s * 0.38, cy];
    const C = [cx, cy];
    poly(ctx, [T, R, C], shade(col, 0.05));
    poly(ctx, [T, C, L], shade(col, 0.5));
    poly(ctx, [L, C, B], shade(col, -0.22));
    poly(ctx, [C, R, B], shade(col, -0.45));
    ctx.beginPath();
    ctx.moveTo(...T); ctx.lineTo(...R); ctx.lineTo(...B); ctx.lineTo(...L);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(cx - s * 0.12, cy - s * 0.16, s * 0.06, 0, Math.PI * 2); ctx.fill();
  }
}

// ── 포켓몬 도구 ───────────────────────────────────────
/**
 * 설치물 하나. 받침대 위에 문장석이 떠 있는 형태를 공통 골격으로 두고,
 * 문장(emblem)만 종류별로 다르게 그린다.
 */
export function drawPropModel(ctx, id, cx, cy, s, color, opts = {}) {
  const col = color;
  const ink = inkOf(col);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.4, s * 0.075);
  ctx.strokeStyle = ink;

  const withBase = opts.base !== false;
  const float = opts.float || 0;
  const ey = cy + float;                       // 문장 중심

  if (withBase) {                              // 돌 받침
    ctx.fillStyle = 'rgba(38,28,12,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.62, s * 0.44, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = inkOf('#6b5836');
    poly(ctx, [
      [cx - s * 0.40, cy + s * 0.60],
      [cx - s * 0.30, cy + s * 0.30],
      [cx + s * 0.30, cy + s * 0.30],
      [cx + s * 0.40, cy + s * 0.60],
    ], '#6b5836');
    ctx.strokeStyle = ink;
  }

  glow(ctx, cx, ey, s * 0.85, col, 0.32);

  if (id === 'courage') {
    // 불꽃 문장
    poly(ctx, [
      [cx, ey - s * 0.56], [cx + s * 0.30, ey - s * 0.06],
      [cx + s * 0.18, ey + s * 0.06], [cx + s * 0.26, ey + s * 0.26],
      [cx, ey + s * 0.34], [cx - s * 0.26, ey + s * 0.26],
      [cx - s * 0.18, ey + s * 0.06], [cx - s * 0.30, ey - s * 0.06],
    ], col);
    poly(ctx, [[cx, ey - s * 0.24], [cx + s * 0.13, ey + s * 0.06], [cx, ey + s * 0.20],
      [cx - s * 0.13, ey + s * 0.06]], shade(col, 0.6));

  } else if (id === 'friendship') {
    // 물방울/얼음 문장
    poly(ctx, [
      [cx, ey - s * 0.54], [cx + s * 0.32, ey + s * 0.06],
      [cx, ey + s * 0.34], [cx - s * 0.32, ey + s * 0.06],
    ], col);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = shade(col, 0.7);
    ctx.lineWidth = Math.max(1, s * 0.06);
    for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * s * 0.20, ey - Math.sin(a) * s * 0.20);
      ctx.lineTo(cx + Math.cos(a) * s * 0.20, ey + Math.sin(a) * s * 0.20);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = ink;

  } else if (id === 'knowledge') {
    // 펼쳐진 책
    poly(ctx, [
      [cx - s * 0.44, ey - s * 0.22], [cx, ey - s * 0.34],
      [cx, ey + s * 0.30], [cx - s * 0.44, ey + s * 0.36],
    ], col);
    poly(ctx, [
      [cx + s * 0.44, ey - s * 0.22], [cx, ey - s * 0.34],
      [cx, ey + s * 0.30], [cx + s * 0.44, ey + s * 0.36],
    ], shade(col, -0.2));
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = shade(col, 0.7);
    ctx.lineWidth = Math.max(1, s * 0.045);
    for (let i = 0; i < 2; i++) {
      const yy = ey - s * 0.08 + i * s * 0.16;
      ctx.beginPath(); ctx.moveTo(cx - s * 0.34, yy); ctx.lineTo(cx - s * 0.08, yy - s * 0.03); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.08, yy - s * 0.03); ctx.lineTo(cx + s * 0.34, yy); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = ink;

  } else if (id === 'love') {
    // 하트 결정
    ctx.beginPath();
    ctx.moveTo(cx, ey + s * 0.40);
    ctx.bezierCurveTo(cx - s * 0.56, ey - s * 0.02, cx - s * 0.28, ey - s * 0.52, cx, ey - s * 0.18);
    ctx.bezierCurveTo(cx + s * 0.28, ey - s * 0.52, cx + s * 0.56, ey - s * 0.02, cx, ey + s * 0.40);
    ctx.closePath();
    fill(ctx, col, ey - s * 0.5, ey + s * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.16, ey - s * 0.14, s * 0.09, s * 0.06, -0.5, 0, Math.PI * 2); ctx.fill();

  } else if (id === 'reliability') {
    // 육각 앤빌
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = cx + Math.cos(a) * s * 0.42, py = ey + Math.sin(a) * s * 0.42;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    fill(ctx, col, ey - s * 0.42, ey + s * 0.42);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = cx + Math.cos(a) * s * 0.20, py = ey + Math.sin(a) * s * 0.20;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = shade(col, -0.45);
    ctx.fill(); ctx.stroke();

  } else if (id === 'recovery') {
    // 플로피 디스크
    box(ctx, cx - s * 0.42, ey - s * 0.42, s * 0.84, s * 0.84, s * 0.08, col);
    ctx.fillStyle = shade(col, 0.75);
    ctx.fillRect(cx - s * 0.24, ey - s * 0.42, s * 0.48, s * 0.34);
    ctx.strokeRect(cx - s * 0.24, ey - s * 0.42, s * 0.48, s * 0.34);
    ctx.fillStyle = shade(col, -0.5);
    ctx.fillRect(cx - s * 0.06, ey - s * 0.40, s * 0.14, s * 0.26);
    ctx.fillStyle = shade(col, -0.28);
    roundRect(ctx, cx - s * 0.30, ey + s * 0.04, s * 0.60, s * 0.30, s * 0.04);
    ctx.fill(); ctx.stroke();

  } else if (id === 'harddisk') {
    // 서버 랙 — 3단
    for (let i = 0; i < 3; i++) {
      const yy = ey - s * 0.44 + i * s * 0.31;
      box(ctx, cx - s * 0.46, yy, s * 0.92, s * 0.26, s * 0.05, i === 1 ? shade(col, -0.16) : col);
      ctx.fillStyle = i % 2 ? '#5ad1ff' : '#9ae86b';
      ctx.beginPath(); ctx.arc(cx + s * 0.32, yy + s * 0.13, s * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = shade(col, -0.5);
      ctx.fillRect(cx - s * 0.36, yy + s * 0.08, s * 0.44, s * 0.10);
      ctx.restore();
    }

  } else {
    ell(ctx, cx, ey, s * 0.40, s * 0.44, col);
  }
}

// ── DOM용 아이콘 (data URL 캐시) ────────────────────────────
const cache = new Map();

/** kind: 'item' | 'prop' */
export function iconURL(kind, id, px = 34, color) {
  const key = `${kind}:${id}:${px}:${color || ''}`;
  if (cache.has(key)) return cache.get(key);

  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = px * dpr; cv.height = px * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  const prevInk = getInk();
  setInk('#2b2214');
  if (kind === 'item') drawItem(ctx, id, px / 2, px / 2, px * 0.92);
  else drawPropModel(ctx, id, px / 2, px / 2, px * 0.52, color || '#ffd166', { base: false });
  setInk(prevInk);

  const url = cv.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** UI에서 <img> 태그 문자열이 필요할 때 */
export const iconTag = (kind, id, px, color, cls = '') =>
  `<img class="ico ${cls}" width="${px}" height="${px}" alt="" src="${iconURL(kind, id, px, color)}">`;
