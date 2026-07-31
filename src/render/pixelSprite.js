// ─────────────────────────────────────────────────────────────
// pixelSprite.js — 도트 그리기용 작은 캔버스
//
// 참고 이미지의 유닛들은 벡터가 아니라 픽셀 아트다. 특징은 세 가지:
//   · 각진 블록 (곡선·그라디언트 없음)
//   · 실루엣을 1px 진한 색으로 두른 외곽선
//   · 색 단계가 3~4개로 제한 (밝은 면 / 기본 / 어두운 면)
//
// 그래서 연속 좌표로 그리지 않고, 작은 격자에 도트를 찍은 뒤
// 통째로 확대해서 붙인다. 스프라이트는 몬스터마다 한 번만 구워 캐시한다.
// ─────────────────────────────────────────────────────────────
import { shade } from './shading.js';

export function createSprite(w, h) {
  const buf = new Array(w * h).fill(null);
  const idx = (x, y) => y * w + x;

  const S = {
    w, h, buf,
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

    /** 실루엣 바깥을 1px 진한 색으로 두른다 — 이게 있어야 도트로 읽힌다 */
    outline(ink) {
      const add = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (buf[idx(x, y)]) continue;
          if (S.get(x - 1, y) || S.get(x + 1, y) || S.get(x, y - 1) || S.get(x, y + 1)) add.push([x, y]);
        }
      }
      for (const [x, y] of add) buf[idx(x, y)] = ink;
    },

    /** 확대해서 캔버스로 굽는다 */
    bake(scale) {
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
  };
  return S;
}
