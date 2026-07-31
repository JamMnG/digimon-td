// ─────────────────────────────────────────────────────────────
// pathGrid.js — 직교 그리드 + 웨이포인트 고정 경로
//
// 기존 Poly TD의 원형 아레나와 달리, 여기선 20×12 타일 격자에
// 스테이지 데이터로 정의된 꺾인 경로가 놓인다.
// 경로 타일 및 그 위/아래 여백은 건설 불가, 나머지는 자유 배치.
// ─────────────────────────────────────────────────────────────
import { BALANCE, TILE, CANVAS } from '../config/balance.js';

const { cols, rows } = BALANCE.grid;

// 타일 좌표 → 타일 중심 픽셀
export const tileToPx = (c, r) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
export const pxToTile = (x, y) => ({ c: Math.floor(x / TILE), r: Math.floor(y / TILE) });
export const inBounds = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows;
export const tileKey = (c, r) => r * cols + c;

export { CANVAS };

/**
 * 스테이지의 타일 웨이포인트를 픽셀 웨이포인트 + 경로 타일 집합으로 변환.
 * 웨이포인트는 축 정렬(가로/세로)만 허용한다.
 *
 * platforms 를 주면 그 사각형 안의 타일만 배치 가능해진다(경로 타일은 자동 제외).
 * 생략하면 경로 밖 전체가 배치 가능해진다.
 */
export function buildPath(tileWaypoints, platforms) {
  const points = tileWaypoints.map(([c, r]) => tileToPx(c, r));

  const pathTiles = new Set();
  for (let i = 0; i < tileWaypoints.length - 1; i++) {
    const [c0, r0] = tileWaypoints[i];
    const [c1, r1] = tileWaypoints[i + 1];
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    if (dc !== 0 && dr !== 0) throw new Error('경로는 축 정렬이어야 합니다');
    let c = c0, r = r0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (inBounds(c, r)) pathTiles.add(tileKey(c, r));
      if (c === c1 && r === r1) break;
      c += dc; r += dr;
    }
  }

  // 누적 거리 — 적의 경로 진행도 계산용
  const segLen = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLen.push(d);
    total += d;
  }

  return { points, pathTiles, segLen, totalLen: total, buildTiles: buildTileSet(pathTiles, platforms) };
}

/** 배치 가능한 타일 집합 — 플랫폼 사각형 ∩ 맵 안 − 경로 */
function buildTileSet(pathTiles, platforms) {
  const out = new Set();
  const add = (c, r) => {
    if (!inBounds(c, r)) return;
    const k = tileKey(c, r);
    if (!pathTiles.has(k)) out.add(k);
  };

  if (!platforms || platforms.length === 0) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add(c, r);
    return out;
  }

  for (const [c0, r0, c1, r1] of platforms) {
    for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) {
      for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) add(c, r);
    }
  }
  return out;
}

/** 경로 진행 거리(dist) → 좌표. 경로 끝을 넘으면 done=true. */
export function posAtDistance(path, dist) {
  let d = dist;
  for (let i = 0; i < path.segLen.length; i++) {
    if (d <= path.segLen[i]) {
      const t = path.segLen[i] === 0 ? 0 : d / path.segLen[i];
      const a = path.points[i], b = path.points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, done: false };
    }
    d -= path.segLen[i];
  }
  const last = path.points[path.points.length - 1];
  return { x: last.x, y: last.y, done: true };
}

/** 건설 가능 여부 — 지정된 잔디 구역이면서 아직 비어 있는 타일 */
export function isBuildable(path, occupied, c, r) {
  if (!inBounds(c, r)) return false;
  const k = tileKey(c, r);
  return path.buildTiles.has(k) && !occupied.has(k);
}
