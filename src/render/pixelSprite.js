// ─────────────────────────────────────────────────────────────
// pixelSprite.js — 유닛 그리기용 작은 캔버스
//
// 형태는 여전히 작은 격자(22×24)에 찍는다. 손으로 눈·무늬·색을 정확히
// 앉히려면 이만한 게 없기 때문이다.
//
// 다만 굽는 방식이 바뀌었다. 예전에는 도트를 그대로 확대해 붙여서
// 납작한 픽셀 아트로 보였는데, "도트 말고 입체로 보고 싶다"는 피드백을 받았다.
// 50종을 3D 모델로 다시 만들 수는 없으니, 찍어 둔 도트를 높이로 해석해서
// 빛을 계산한다 (bake 참고). 도트는 한 장도 다시 안 그리고 전부 입체가 된다.
//
// 평평한 옛 방식이 필요하면 bakeFlat() 이 남아 있다.
// ─────────────────────────────────────────────────────────────
import { shade } from './shading.js';

export function createSprite(w, h) {
  const buf = new Array(w * h).fill(null);
  const idx = (x, y) => y * w + x;

  const S = {
    w, h, buf,
    isInk: new Uint8Array(w * h),
    cx: (w - 1) / 2,

    set(x, y, col) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h || col === undefined) return;
      buf[idx(x, y)] = col;              // null 을 넣으면 지워진다
    },

    get(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return null;
      return buf[idx(x, y)];
    },

    rect(x, y, rw, rh, col) {
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) S.set(x + i, y + j, col);
    },

    /** 좌우 대칭 — x는 왼쪽 조각의 시작 열 */
    sym(x, y, rw, rh, col) {
      S.rect(x, y, rw, rh, col);
      S.rect(w - x - rw, y, rw, rh, col);
    },

    /** 윗면 밝게 / 아랫면 어둡게 — 픽셀 아트의 기본 음영 */
    shaded(x, y, rw, rh, col) {
      S.rect(x, y, rw, rh, col);
      if (rh >= 2) S.rect(x, y, rw, 1, shade(col, 0.30));
      if (rh >= 3) S.rect(x, y + rh - 1, rw, 1, shade(col, -0.28));
      if (rw >= 3) for (let j = 1; j < rh - 1; j++) S.set(x + rw - 1, y + j, shade(col, -0.20));
    },

    symShaded(x, y, rw, rh, col) {
      S.shaded(x, y, rw, rh, col);
      S.shaded(w - x - rw, y, rw, rh, col);
    },

    /** 사다리꼴/삼각형 — 뿔·날개 끝처럼 각지게 좁아지는 형태 */
    taper(x, y, rw, rh, col, grow = -1) {
      for (let j = 0; j < rh; j++) {
        const shrink = Math.round((j / Math.max(1, rh - 1)) * (rw - 1) * (grow < 0 ? 1 : -1));
        const ww = Math.max(1, rw - Math.abs(shrink));
        const ox = grow < 0 ? Math.floor(Math.abs(shrink) / 2) : -Math.floor(Math.abs(shrink) / 2);
        S.rect(x + ox, y + j, ww, 1, j === 0 ? shade(col, 0.28) : col);
      }
    },

    /** 실루엣 바깥을 1px 진한 색으로 두른다 — 이게 있어야 형태가 배경에서 떨어진다 */
    outline(ink) {
      const add = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (buf[idx(x, y)]) continue;
          if (S.get(x - 1, y) || S.get(x + 1, y) || S.get(x, y - 1) || S.get(x, y + 1)) add.push([x, y]);
        }
      }
      // 어디가 윤곽선인지 기억해 둔다 — 입체로 구울 때 여기에는
      // 하이라이트·림라이트를 태우지 않는다 (테두리 전체가 번들거린다)
      for (const [x, y] of add) { buf[idx(x, y)] = ink; S.isInk[idx(x, y)] = 1; }
    },

    /** 확대해서 캔버스로 굽는다 — 평평한 도트 그대로 (참고·디버그용) */
    bakeFlat(scale) {
      const cv = document.createElement('canvas');
      cv.width = w * scale; cv.height = h * scale;
      const g = cv.getContext('2d');
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = buf[idx(x, y)];
          if (!c) continue;
          g.fillStyle = c;
          g.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      return cv;
    },

    /**
     * 입체로 굽는다.
     *
     * 50종을 3D 모델로 새로 만들 수는 없다. 대신 이미 찍어 둔 도트를
     * "높이"로 해석해서 빛을 계산한다 — 실루엣 안쪽일수록 높고 가장자리는
     * 낮은 언덕으로 보면, 그 기울기가 곧 법선이 된다.
     * 손으로 찍은 무늬·눈·색은 그대로 살아 있고 형태만 부풀어 오른다.
     *
     * 그래서 도트를 한 장도 다시 안 그리고 50종이 한 번에 입체가 된다.
     */
    bake(scale, opt = {}) {
      const W = w * scale, H = h * scale;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      const img = g.createImageData(W, H);
      const px = img.data;

      // ── 1) 도트를 출력 해상도로 펼친다 (색 + 채움 마스크) ──
      const rgb = new Float32Array(W * H * 3);
      const mask = new Float32Array(W * H);
      const ink = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        const sy = (y / scale) | 0;
        for (let x = 0; x < W; x++) {
          const si = idx((x / scale) | 0, sy);
          const c = buf[si];
          const o = y * W + x;
          if (!c) continue;
          mask[o] = 1;
          ink[o] = S.isInk[si];
          const col = parseColor(c);
          rgb[o * 3] = col[0];
          rgb[o * 3 + 1] = col[1];
          rgb[o * 3 + 2] = col[2];
        }
      }

      // ── 2) 실루엣을 둥글린다 ──
      // 마스크를 흐린 뒤 0.5 근처에서 자르면 볼록한 모서리는 깎이고 오목한 데는
      // 메워진다. 도트 특유의 계단이 사라지고 가장자리에 부드러운 알파가 생긴다.
      const cov = blur(mask, W, H, Math.max(1, Math.round(scale * 0.5)));
      const alpha = new Float32Array(W * H);
      for (let i = 0; i < alpha.length; i++) alpha[i] = smoothstep(0.38, 0.62, cov[i]);

      // ── 3) 높이장 = 가장자리로부터의 거리 ──
      // 흐림만으로는 가장자리 근처만 기울어지고 몸통 한가운데는 평평해서,
      // 아무리 빛을 세게 줘도 "테두리만 부드러운 납작한 그림"으로 보였다.
      // 거리변환을 쓰면 실루엣 안쪽 전체에 완만한 언덕이 생겨 몸이 부푼다.
      const dist = distanceTransform(alpha, W, H);
      let dmax = 0;
      for (let i = 0; i < dist.length; i++) if (dist[i] > dmax) dmax = dist[i];
      // 제일 두꺼운 부위 하나가 기준을 다 먹으면 팔·꼬리가 납작해진다 — 상한을 둔다
      const D = Math.max(scale * 1.2, Math.min(dmax, scale * 4.5));
      const raw = new Float32Array(W * H);
      for (let i = 0; i < raw.length; i++) {
        raw[i] = Math.sin(Math.min(1, dist[i] / D) * Math.PI * 0.5);      // 위로 볼록한 돔
      }
      // 거리변환은 형태의 한가운데(중심선)에서 기울기가 뒤집혀 접힌 자국이 생긴다.
      // 한 번 흐려 주면 그 자국이 능선처럼 자연스럽게 눕는다.
      const height = blur(raw, W, H, Math.max(1, Math.round(scale * 0.9)));
      const far = blur(alpha, W, H, Math.max(2, Math.round(scale * 3.2)));

      // ── 4) 색을 살짝 풀어 준다 ──
      // 도트 한 칸이 출력에서는 7px 사각형이라, 그대로 두면 아무리 빛을 줘도
      // 모자이크로 보인다. 다만 세게 흐리면 눈이 뭉개져 표정이 사라지므로,
      // 덩어리감은 조명이 맡고 여기서는 칸 경계만 지운다.
      const soft = Math.max(1, Math.round(scale * 0.26));
      const cr = blurMasked(rgb, mask, W, H, soft, 0);
      const cg = blurMasked(rgb, mask, W, H, soft, 1);
      const cb = blurMasked(rgb, mask, W, H, soft, 2);

      // ── 5) 높이 기울기 → 법선 → 조명 ──
      const L = norm3(-0.45, -0.62, 0.64);              // 왼쪽 위 앞에서 오는 빛
      const Hv = norm3(L[0], L[1], L[2] + 1);           // 시선(0,0,1)과의 하프벡터
      // 높이 기울기가 대략 1/D 이라 relief 도 D 에 비례해야 형태와 무관하게 일정해진다
      const relief = (opt.relief ?? 1) * D * 0.8;
      // 반사·림을 세게 주면 금세 젤리 사탕이 된다. 캐릭터의 원래 색이
      // 주인공으로 남을 만큼만 얹는다.
      const AMB = 0.62, DIF = 0.46, RIM = 0.22, SPEC = 0.16;
      const rimCol = opt.rim || [150, 190, 255];

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const o = y * W + x;
          const a = alpha[o];
          if (a <= 0.004) continue;
          const dx = (height[o + (x < W - 1 ? 1 : 0)] - height[o - (x > 0 ? 1 : 0)]) * relief;
          const dy = (height[o + (y < H - 1 ? W : 0)] - height[o - (y > 0 ? W : 0)]) * relief;
          const N = norm3(-dx, -dy, 1);

          const dif = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
          // 윤곽선까지 번들거리면 캐릭터가 아니라 젤리처럼 보인다
          const gloss = ink[o] ? 0.12 : 1;
          const spec = Math.pow(Math.max(0, N[0] * Hv[0] + N[1] * Hv[1] + N[2] * Hv[2]), 34) * SPEC * gloss;
          // 가장자리로 갈수록(법선이 눕을수록) 뒤에서 빛이 감돈다 — 배경과 분리된다
          const rim = Math.pow(1 - Math.min(1, N[2]), 3) * RIM * gloss;
          // 깊이 파인 곳은 빛이 덜 든다 — 팔다리 사이 틈이 실제로 틈처럼 보인다
          const ao = 0.72 + 0.28 * Math.min(1, far[o] * 1.6);
          const lit = (ink[o] ? 0.85 + 0.2 * dif : AMB + DIF * dif) * ao;

          const p = o * 4;
          px[p] = clamp255(cr[o] * lit + spec * 255 + rim * rimCol[0]);
          px[p + 1] = clamp255(cg[o] * lit + spec * 255 + rim * rimCol[1]);
          px[p + 2] = clamp255(cb[o] * lit + spec * 255 + rim * rimCol[2]);
          px[p + 3] = clamp255(a * 255);
        }
      }

      g.putImageData(img, 0, 0);
      return cv;
    },
  };
  return S;
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v) | 0;

/**
 * 도트 버퍼에 들어오는 색은 두 가지다 — 손으로 적은 '#rrggbb' 와
 * shade() 가 계산해서 돌려주는 'rgb(r,g,b)'. 둘 다 받아야 한다.
 * (#만 가정했다가 절반이 새까맣게 구워졌다)
 */
const colorCache = new Map();
function parseColor(c) {
  let v = colorCache.get(c);
  if (v) return v;
  if (c[0] === '#') {
    const s = c.slice(1);
    const n = parseInt(s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s.slice(0, 6), 16);
    v = Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [255, 0, 255];
  } else {
    const m = c.match(/-?\d+(\.\d+)?/g);
    v = m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [255, 0, 255];   // 못 읽으면 눈에 띄는 자홍색
  }
  colorCache.set(c, v);
  return v;
}

function norm3(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** 분리 가능한 박스 블러 2회 — 가우시안에 충분히 가깝고 훨씬 싸다 */
function blur(src, W, H, r) {
  let a = src, b = new Float32Array(W * H);
  for (let pass = 0; pass < 2; pass++) {
    // 가로
    for (let y = 0; y < H; y++) {
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[y * W + clampi(x, W)];
      for (let x = 0; x < W; x++) {
        b[y * W + x] = sum / (r * 2 + 1);
        sum += a[y * W + clampi(x + r + 1, W)] - a[y * W + clampi(x - r, W)];
      }
    }
    // 세로
    const c = a === src ? new Float32Array(W * H) : a;
    for (let x = 0; x < W; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[clampi(y, H) * W + x];
      for (let y = 0; y < H; y++) {
        c[y * W + x] = sum / (r * 2 + 1);
        sum += b[clampi(y + r + 1, H) * W + x] - b[clampi(y - r, H) * W + x];
      }
    }
    a = c;
  }
  return a;
}

const clampi = (v, n) => (v < 0 ? 0 : v >= n ? n - 1 : v);

function smoothstep(a, b, v) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * 실루엣 안쪽 각 픽셀이 가장자리에서 얼마나 떨어져 있는지.
 * 정확한 유클리드 거리 대신 체임퍼 근사(직교 1, 대각 √2)를 두 번 훑는다 —
 * 오차가 몇 %라 눈으로는 구분되지 않고 훨씬 싸다.
 */
function distanceTransform(alpha, W, H) {
  const INF = 1e9;
  const d = new Float32Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = alpha[i] > 0.5 ? INF : 0;
  const A = 1, B = Math.SQRT2;
  // 좌상 → 우하
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = y * W + x;
      if (d[o] === 0) continue;
      let v = d[o];
      if (y > 0) {
        if (x > 0) v = Math.min(v, d[o - W - 1] + B);
        v = Math.min(v, d[o - W] + A);
        if (x < W - 1) v = Math.min(v, d[o - W + 1] + B);
      }
      if (x > 0) v = Math.min(v, d[o - 1] + A);
      d[o] = v;
    }
  }
  // 우하 → 좌상
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const o = y * W + x;
      if (d[o] === 0) continue;
      let v = d[o];
      if (y < H - 1) {
        if (x < W - 1) v = Math.min(v, d[o + W + 1] + B);
        v = Math.min(v, d[o + W] + A);
        if (x > 0) v = Math.min(v, d[o + W - 1] + B);
      }
      if (x < W - 1) v = Math.min(v, d[o + 1] + A);
      d[o] = v;
    }
  }
  for (let i = 0; i < d.length; i++) if (d[i] === INF) d[i] = 0;
  return d;
}

/**
 * 채워진 칸의 색만 흐린다.
 * 그냥 흐리면 실루엣 바깥의 빈 공간(=검정)이 섞여 들어와 가장자리가 시커메진다.
 * 그래서 색×마스크와 마스크를 각각 흐린 뒤 나눈다.
 */
function blurMasked(rgb, mask, W, H, r, ch) {
  const num = new Float32Array(W * H);
  for (let i = 0; i < num.length; i++) num[i] = rgb[i * 3 + ch] * mask[i];
  const bn = blur(num, W, H, r);
  const bm = blur(mask, W, H, r);
  const out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = bm[i] > 0.002 ? bn[i] / bm[i] : 0;
  return out;
}
