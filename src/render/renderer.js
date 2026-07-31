// ─────────────────────────────────────────────────────────────
// renderer.js — 캔버스 2D 렌더링
// 순수 그리기 계층: state를 읽기만 하고 변경하지 않는다.
//
// 아트 디렉션: "평면인데 입체적인" 탑다운.
//  - 잔디 구역은 아래쪽에 갈색 단면(lip)을 그려 두께를 만든다
//  - 유닛은 타일에서 살짝 떠 있고 바닥에 타원 그림자를 깐다
//  - 전부 납작한 단색 + 굵은 진한 외곽선 (플랫 셰이딩)
// 스프라이트는 M5 과제이므로 지금은 도형 + 이름 첫 글자 플레이스홀더.
// ─────────────────────────────────────────────────────────────
import { BALANCE, TILE, CANVAS } from '../config/balance.js';
import { ATTR } from '../data/monsters.js';
import { ENEMIES } from '../data/enemies.js';
import { tileKey, tileToPx } from '../grid/pathGrid.js';
import { effectiveStats } from '../combat/combatSystem.js';
import { readyPartners } from '../evolution/megaTable.js';
import { adjacentLinks } from '../combat/adjacency.js';
import { THEMES, themeOf } from '../data/themes.js';
import { shade, mix, hexOf, inkOf, volume, roundRect, outlinedText, setInk } from './shading.js';
import { drawUnit } from './unitArt.js';
import { drawPropModel } from './itemArt.js';
import { drawInstructor } from './instructor.js';
import { drawShot, drawCast } from './attackArt.js';
import { isProp } from '../data/props.js';

const { cols, rows } = BALANCE.grid;

// ── 팔레트 ──
// 스테이지 테마에 따라 매 프레임 갈아끼운다. 렌더 계층 전체가 이 하나만 본다.
let P = THEMES.kanto_meadow.palette;
let THEME = THEMES.kanto_meadow;

const LIP = 7;          // 플랫폼 두께(px)
const LIFT = 7;         // 유닛이 타일에서 떠 있는 높이(px)

const buildableAt = (state, c, r) =>
  c >= 0 && c < cols && r >= 0 && r < rows && state.path.buildTiles.has(tileKey(c, r));

export function drawFrame(ctx, state, hover) {
  const now = performance.now();
  THEME = themeOf(state.stage);
  P = THEME.palette;
  setInk(P.ink);
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);

  // 흔들림으로 가장자리가 비지 않도록 바닥색을 먼저 깔아둔다
  ctx.fillStyle = P.ground;
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);

  ctx.save();
  if (state.shake) {
    const k = Math.max(0, state.shake.t / state.shake.ttl);
    const m = state.shake.mag * k * k;
    ctx.translate(Math.sin(now / 17) * m, Math.cos(now / 11) * m);
  }
  drawWorld(ctx, state, hover, now);
  ctx.restore();

  drawVignette(ctx, state);
  drawCombo(ctx, state, now);
  drawBanner(ctx, state);
}

/** 손해를 봤을 때만 켜지는 가장자리 섬광 */
function drawVignette(ctx, state) {
  const v = state.vignette;
  if (!v) return;
  const k = v.t / v.ttl;
  const g = ctx.createRadialGradient(
    CANVAS.w / 2, CANVAS.h / 2, CANVAS.h * 0.32,
    CANVAS.w / 2, CANVAS.h / 2, CANVAS.h * 0.82);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, v.color);
  ctx.save();
  ctx.globalAlpha = k * 0.55;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.restore();
}

/** 연속 처치 콤보 */
function drawCombo(ctx, state, now) {
  const c = state.combo;
  if (!c || c.count < 3) return;
  const k = Math.min(1, c.t / 0.35);
  const pop = 1 + Math.max(0, (c.t - 1.35)) * 1.6;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'left';
  const x = 20, y = 52;
  outlinedText(ctx, `${c.count}`, x, y,
    `bold ${Math.round(40 * pop)}px "Malgun Gothic", sans-serif`, '#ffd166', 6);
  outlinedText(ctx, '콤보', x + ctx.measureText(`${c.count}`).width + 8, y - 4,
    'bold 17px "Malgun Gothic", sans-serif', '#f6ecd6', 5);
  ctx.restore();
}

function drawWorld(ctx, state, hover, now) {
  drawRoad(ctx, state);
  drawPlatforms(ctx, state);
  drawEndpoints(ctx, state, now);
  drawHover(ctx, state, hover);
  drawRangeRings(ctx, state, hover);
  drawDecor(ctx, state);
  drawInstructorNPC(ctx, state, now);
  drawTutorialTiles(ctx, state, now);
  drawAdjacencyLinks(ctx, state, hover, now);
  drawMegaLinks(ctx, state, now);
  drawTowers(ctx, state, now);
  drawEnemies(ctx, state, now);
  drawProjectiles(ctx, state);
  drawEffects(ctx, state);
}

/** 웨이브 시작 배너 — 화면 중앙에서 훑고 지나간다 */
function drawBanner(ctx, state) {
  const b = state.banner;
  if (!b) return;
  const k = b.t / b.ttl;                       // 1 → 0
  const inK = Math.min(1, (1 - k) * 6);        // 등장
  const outK = Math.min(1, k * 5);             // 퇴장
  const a = Math.min(inK, outK);
  const y = CANVAS.h * 0.34 + (1 - inK) * 18;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';

  const h = 62;
  const grad = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  grad.addColorStop(0, 'rgba(20, 15, 8, 0)');
  grad.addColorStop(0.5, 'rgba(20, 15, 8, 0.78)');
  grad.addColorStop(1, 'rgba(20, 15, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y - h / 2, CANVAS.w, h);

  outlinedText(ctx, b.text, CANVAS.w / 2, y + 2,
    'bold 34px "Malgun Gothic", sans-serif', '#ffd166', 6);
  if (b.sub) {
    outlinedText(ctx, b.sub, CANVAS.w / 2, y + 24,
      'bold 14px "Malgun Gothic", sans-serif', '#f0e6cf', 4);
  }
  ctx.restore();
  ctx.textAlign = 'left';
}

// ── 바닥: 캔버스 전체를 흙길로 깔고, 그 위에 잔디 플랫폼을 얹는다 ──
function drawRoad(ctx, state) {
  // 맨 흙바닥
  ctx.fillStyle = P.ground;
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.fillStyle = P.ground2;
  for (let r = 0; r < rows; r++) {
    for (let c = (r % 2); c < cols; c += 2) ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
  }

  // 적이 지나는 길 — 밟혀서 밝다
  const isPath = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows
    && state.path.pathTiles.has(tileKey(c, r));
  ctx.fillStyle = P.road;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isPath(c, r)) ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }

  // 길 가장자리 — 맨 흙과 길이 붙는 면에만 선을 그어 차선처럼 읽히게 한다
  ctx.strokeStyle = P.roadEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isPath(c, r)) continue;
      const x = c * TILE, y = r * TILE;
      if (!isPath(c, r - 1)) { ctx.moveTo(x, y + 1); ctx.lineTo(x + TILE, y + 1); }
      if (!isPath(c, r + 1)) { ctx.moveTo(x, y + TILE - 1); ctx.lineTo(x + TILE, y + TILE - 1); }
      if (!isPath(c - 1, r)) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + TILE); }
      if (!isPath(c + 1, r)) { ctx.moveTo(x + TILE - 1, y); ctx.lineTo(x + TILE - 1, y + TILE); }
    }
  }
  ctx.stroke();

  // 흙 자국 — 결정적 패턴이라 프레임마다 흔들리지 않는다
  ctx.fillStyle = P.speck;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = (c * 73856093) ^ (r * 19349663);
      for (let i = 0; i < 3; i++) {
        const a = ((seed >> (i * 5)) & 31) / 31;
        const b = ((seed >> (i * 7 + 3)) & 31) / 31;
        ctx.fillRect(c * TILE + a * (TILE - 7), r * TILE + b * (TILE - 7), 5, 3);
      }
    }
  }

  const pts = state.path.points;
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  };

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 밟혀서 닳은 중앙 트랙 — 길이 "지나다니는 곳"으로 읽히게 한다
  ctx.strokeStyle = P.roadDark;
  ctx.lineWidth = TILE - 15;
  trace(); ctx.stroke();

  // 진행 방향 점선
  ctx.strokeStyle = P.roadDash;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 16]);
  trace(); ctx.stroke();
  ctx.restore();
}

// ── 잔디 플랫폼: 단면(lip) → 윗면 → 외곽선 순서로 두께를 만든다 ──
function drawPlatforms(ctx, state) {
  const B = (c, r) => buildableAt(state, c, r);

  // 1) 아래쪽 단면 — 아래 이웃이 길일 때만 그려서 "블록이 솟아 있는" 인상을 만든다
  ctx.fillStyle = P.lip;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!B(c, r) || B(c, r + 1)) continue;
      ctx.fillRect(c * TILE, (r + 1) * TILE, TILE, LIP);
    }
  }

  // 2) 윗면 — 체커로 타일 경계를 은은하게 읽히게 한다
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!B(c, r)) continue;
      ctx.fillStyle = (c + r) % 2 ? P.grass : P.grass2;
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }

  // 3) 안쪽 밝은 테두리 (윗면 하이라이트)
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!B(c, r) || B(c, r - 1)) continue;
      ctx.beginPath();
      ctx.moveTo(c * TILE, r * TILE + 1);
      ctx.lineTo((c + 1) * TILE, r * TILE + 1);
      ctx.stroke();
    }
  }

  // 4) 구역 외곽선
  ctx.strokeStyle = P.lip;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!B(c, r)) continue;
      const x = c * TILE, y = r * TILE;
      if (!B(c, r - 1)) { ctx.moveTo(x, y + 1.5); ctx.lineTo(x + TILE, y + 1.5); }
      if (!B(c - 1, r)) { ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 1.5, y + TILE); }
      if (!B(c + 1, r)) { ctx.moveTo(x + TILE - 1.5, y); ctx.lineTo(x + TILE - 1.5, y + TILE); }
      if (!B(c, r + 1)) { ctx.moveTo(x, y + TILE + LIP - 1.5); ctx.lineTo(x + TILE, y + TILE + LIP - 1.5); }
    }
  }
  ctx.stroke();

  // 5) 빈 슬롯 표시 — 배치 가능한 자리를 아주 옅게 찍어준다.
  //    배치 모드일 때만 또렷해지고, 평소엔 거의 보이지 않아 화면이 조용하다.
  const strong = !!state.buildMonsterId;
  ctx.fillStyle = strong ? 'rgba(255,255,255,0.20)' : 'rgba(40, 60, 20, 0.07)';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!B(c, r) || state.occupied.has(tileKey(c, r))) continue;
      const p = tileToPx(c, r);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 5, TILE * 0.22, TILE * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEndpoints(ctx, state, now) {
  const pts = state.path.points;
  const start = pts[0];
  const end = pts[pts.length - 1];
  const pulse = 0.5 + 0.5 * Math.sin(now / 380);

  // 스폰 포탈 — 따뜻한 발광
  const g = ctx.createRadialGradient(start.x + 16, start.y, 2, start.x + 16, start.y, 30);
  g.addColorStop(0, 'rgba(255, 190, 90, 0.95)');
  g.addColorStop(0.5, 'rgba(255, 140, 40, 0.42)');
  g.addColorStop(1, 'rgba(255, 120, 20, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(start.x + 16, start.y, 28 + pulse * 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(start.x + 16, start.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 기지
  ctx.fillStyle = P.shadow;
  ctx.beginPath(); ctx.ellipse(end.x - 18, end.y + 12, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4aa3ff';
  ctx.strokeStyle = P.ink; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(end.x - 18, end.y - 20);
  ctx.lineTo(end.x - 3, end.y - 2);
  ctx.lineTo(end.x - 18, end.y + 10);
  ctx.lineTo(end.x - 33, end.y - 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(end.x - 18, end.y - 20);
  ctx.lineTo(end.x - 10, end.y - 3);
  ctx.lineTo(end.x - 18, end.y + 2);
  ctx.closePath();
  ctx.fill();
  outlinedText(ctx, '기지', end.x - 18, end.y - 27, 'bold 11px "Malgun Gothic", sans-serif', '#fff');
}

function drawHover(ctx, state, hover) {
  if (!hover || !state.buildMonsterId) return;
  const { c, r, buildable } = hover;
  const p = tileToPx(c, r);
  ctx.save();
  ctx.fillStyle = buildable ? 'rgba(255,255,255,0.30)' : 'rgba(220,60,50,0.32)';
  ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = buildable ? '#ffffff' : '#e04236';
  ctx.lineWidth = 3;
  ctx.strokeRect(c * TILE + 2.5, r * TILE + 2.5, TILE - 5, TILE - 5);
  if (buildable && state.buildDef && state.buildDef.range) {
    const def = state.buildDef;
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(p.x, p.y, def.range, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.beginPath(); ctx.arc(p.x, p.y, def.range, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawRangeRings(ctx, state, hover) {
  const sel = state.selectedTower();
  const hoveredTower = hover ? state.towerAt(hover.c, hover.r) : null;
  for (const t of new Set([sel, hoveredTower].filter(Boolean))) {
    if (isProp(t.def)) continue;
    const st = effectiveStats(t, state.synergy, state.mods, state.adjacency[t.uid]);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.setLineDash([]);
}

// ── 지형 지물 ────────────────────────────────────────────────
// 타일 좌표만으로 결정되는 해시라 프레임마다 흔들리지 않고, 저장할 필요도 없다.
// 유닛이 올라갈 수 있는 칸에는 옅게, 맨 흙바닥에는 진하게 놓는다.
function hash2(c, r) {
  let h = (c * 73856093) ^ (r * 19349663);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function drawDecor(ctx, state) {
  const decor = THEME.decor;
  if (!decor || decor.length === 0) return;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = tileKey(c, r);
      if (state.path.pathTiles.has(k)) continue;            // 길 위엔 놓지 않는다
      const onGrass = state.path.buildTiles.has(k);
      if (onGrass && state.occupied.has(k)) continue;        // 유닛이 선 칸도 비운다

      const h = hash2(c, r);
      const density = onGrass ? THEME.grassDensity : THEME.dirtDensity;
      if ((h >>> 8) % 100 >= density) continue;

      const d = decor[(h >>> 7) % decor.length];
      const jx = ((h >>> 11) & 15) / 15 - 0.5;
      const jy = ((h >>> 17) & 15) / 15 - 0.5;
      const x = c * TILE + TILE / 2 + jx * TILE * 0.42;
      const y = r * TILE + TILE / 2 + jy * TILE * 0.34;
      const sz = TILE * d.size * (0.85 + ((h >>> 21) & 7) / 24);
      drawProp3D(ctx, d.kind, x, y, sz, d.color, onGrass);
    }
  }
}

/** 지물 하나 — 유닛과 같은 조명 규칙(그림자 → 볼륨 → 어두운 외곽선)을 따른다 */
function drawProp3D(ctx, kind, x, y, s, col, faded) {
  ctx.save();
  if (faded) ctx.globalAlpha = 0.75;                        // 잔디 위는 배치를 방해하지 않게
  const ink = inkOf(col);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = ink;

  // 접지 그림자
  ctx.fillStyle = P.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.42, s * 0.44, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = (t, b, c2) => { ctx.fillStyle = volume(ctx, t, b, c2 || col, 0.34, 0.36); };

  if (kind === 'tree') {
    ctx.fillStyle = '#5a4327';
    ctx.fillRect(x - s * 0.09, y - s * 0.1, s * 0.18, s * 0.55);
    ctx.strokeRect(x - s * 0.09, y - s * 0.1, s * 0.18, s * 0.55);
    for (const [oy, rr] of [[0.10, 0.52], [-0.22, 0.40], [-0.52, 0.27]]) {
      ctx.beginPath();
      ctx.ellipse(x, y + s * oy, s * rr, s * rr * 0.72, 0, 0, Math.PI * 2);
      body(y + s * (oy - rr * 0.72), y + s * (oy + rr * 0.72));
      ctx.fill(); ctx.stroke();
    }

  } else if (kind === 'deadtree') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.42); ctx.lineTo(x, y - s * 0.42);
    ctx.moveTo(x, y - s * 0.10); ctx.lineTo(x - s * 0.36, y - s * 0.42);
    ctx.moveTo(x, y - s * 0.24); ctx.lineTo(x + s * 0.32, y - s * 0.5);
    ctx.stroke();
    ctx.strokeStyle = shade(col, 0.3);
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3); ctx.lineTo(x, y - s * 0.38);
    ctx.stroke();
    ctx.lineCap = 'butt';

  } else if (kind === 'bush') {
    for (const [ox, oy, rr] of [[-0.26, 0.10, 0.34], [0.24, 0.12, 0.30], [0, -0.10, 0.42]]) {
      ctx.beginPath();
      ctx.ellipse(x + s * ox, y + s * oy, s * rr, s * rr * 0.80, 0, 0, Math.PI * 2);
      body(y + s * (oy - rr * 0.8), y + s * (oy + rr * 0.8));
      ctx.fill(); ctx.stroke();
    }

  } else if (kind === 'rock') {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.46, y + s * 0.34);
    ctx.lineTo(x - s * 0.30, y - s * 0.26);
    ctx.lineTo(x + s * 0.08, y - s * 0.44);
    ctx.lineTo(x + s * 0.44, y - s * 0.06);
    ctx.lineTo(x + s * 0.34, y + s * 0.34);
    ctx.closePath();
    body(y - s * 0.44, y + s * 0.34);
    ctx.fill(); ctx.stroke();

  } else if (kind === 'cactus') {
    const arm = (ox, oy, h) => {
      roundRect(ctx, x + ox - s * 0.11, y + oy, s * 0.22, h, s * 0.11);
      body(y + oy, y + oy + h);
      ctx.fill(); ctx.stroke();
    };
    arm(-s * 0.30, -s * 0.10, s * 0.42);
    arm(s * 0.30, -s * 0.22, s * 0.54);
    arm(0, -s * 0.52, s * 0.94);

  } else if (kind === 'bone') {
    ctx.save();
    ctx.translate(x, y + s * 0.12);
    ctx.rotate(-0.4);
    roundRect(ctx, -s * 0.42, -s * 0.07, s * 0.84, s * 0.14, s * 0.07);
    body(-s * 0.07, s * 0.07);
    ctx.fill(); ctx.stroke();
    for (const ox of [-s * 0.42, s * 0.42]) {
      for (const oy of [-s * 0.14, s * 0.14]) {
        ctx.beginPath(); ctx.arc(ox, oy, s * 0.13, 0, Math.PI * 2);
        ctx.fillStyle = shade(col, oy < 0 ? 0.3 : -0.2);
        ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();

  } else if (kind === 'crystal') {
    // 발광 + 깎인 면
    const g = ctx.createRadialGradient(x, y, 1, x, y, s * 1.1);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const spike = (ox, hh, ww) => {
      ctx.beginPath();
      ctx.moveTo(x + ox, y - hh);
      ctx.lineTo(x + ox + ww, y + s * 0.34);
      ctx.lineTo(x + ox - ww, y + s * 0.34);
      ctx.closePath();
      body(y - hh, y + s * 0.34);
      ctx.fill(); ctx.stroke();
    };
    spike(-s * 0.26, s * 0.42, s * 0.16);
    spike(s * 0.24, s * 0.34, s * 0.14);
    spike(0, s * 0.70, s * 0.20);

  } else if (kind === 'pipe') {
    roundRect(ctx, x - s * 0.46, y - s * 0.02, s * 0.92, s * 0.30, s * 0.15);
    body(y - s * 0.02, y + s * 0.28);
    ctx.fill(); ctx.stroke();
    for (const ox of [-s * 0.30, s * 0.30]) {
      roundRect(ctx, x + ox - s * 0.08, y - s * 0.10, s * 0.16, s * 0.46, 2);
      ctx.fillStyle = shade(col, -0.3);
      ctx.fill(); ctx.stroke();
    }

  } else if (kind === 'gear') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 ? s * 0.30 : s * 0.46;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    body(y - s * 0.46, y + s * 0.46);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, s * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = shade(col, -0.5); ctx.fill(); ctx.stroke();

  } else if (kind === 'vent') {
    roundRect(ctx, x - s * 0.44, y - s * 0.30, s * 0.88, s * 0.62, 4);
    body(y - s * 0.30, y + s * 0.32);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const yy = y - s * 0.15 + i * s * 0.16;
      ctx.beginPath(); ctx.moveTo(x - s * 0.30, yy); ctx.lineTo(x + s * 0.30, yy); ctx.stroke();
    }

  } else if (kind === 'cone') {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.52);
    ctx.lineTo(x + s * 0.36, y + s * 0.34);
    ctx.lineTo(x - s * 0.36, y + s * 0.34);
    ctx.closePath();
    body(y - s * 0.52, y + s * 0.34);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x - s * 0.22, y - s * 0.06, s * 0.44, s * 0.13);

  } else if (kind === 'flag') {
    ctx.strokeStyle = '#6b5836';
    ctx.lineWidth = s * 0.10;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.40); ctx.lineTo(x, y - s * 0.56);
    ctx.stroke();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.56);
    ctx.lineTo(x + s * 0.46, y - s * 0.38);
    ctx.lineTo(x, y - s * 0.20);
    ctx.closePath();
    body(y - s * 0.56, y - s * 0.20);
    ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}

/** 트레이닝 필드 교관 — 안내 중인 칸이 있으면 그쪽을 짚는다 */
function drawInstructorNPC(ctx, state, now) {
  const at = state.stage.instructor;
  if (!at) return;
  const p = tileToPx(at[0], at[1]);
  const tiles = state.tutorialTiles;
  const target = tiles && tiles.length ? tileToPx(tiles[0][0], tiles[0][1]) : null;
  drawInstructor(ctx, p.x, p.y, 34, now, target);
}

/** 튜토리얼이 가리키는 타일 — 금색으로 크게 반짝인다 */
function drawTutorialTiles(ctx, state, now) {
  const tiles = state.tutorialTiles;
  if (!tiles || tiles.length === 0) return;
  const pulse = 0.5 + 0.5 * Math.sin(now / 260);
  ctx.save();
  for (const [c, r] of tiles) {
    const x = c * TILE, y = r * TILE;
    ctx.globalAlpha = 0.25 + pulse * 0.35;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3 + pulse * 2;
    ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
    ctx.globalAlpha = 1;
    // 아래로 튀는 화살표
    const ay = y - 8 - pulse * 5;
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + TILE / 2, ay + 10);
    ctx.lineTo(x + TILE / 2 - 8, ay - 4);
    ctx.lineTo(x + TILE / 2 + 8, ay - 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/**
 * 선택하거나 올려둔 유닛의 8방향 인접 관계를 보여준다.
 * 참고작(Luck be a Landlord)에서 배치가 곧 퍼즐이 되는 이유가 이 가시성이다.
 */
function drawAdjacencyLinks(ctx, state, hover, now) {
  // 배치 중에는 "지금 놓으려는 자리"의 영향권을 보여준다 — 놓기 전에 계획할 수 있어야 한다
  const placing = state.buildMonsterId && state.buildDef && hover && hover.buildable
    ? { c: hover.c, r: hover.r, x: hover.c * TILE + TILE / 2, y: hover.r * TILE + TILE / 2, def: state.buildDef }
    : null;
  const focus = placing || state.selectedTower() || (hover ? state.towerAt(hover.c, hover.r) : null);
  if (!focus) return;

  ctx.save();
  // 인접 8칸을 옅게 칠해 "영향권"을 먼저 보여준다
  ctx.fillStyle = placing ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.12)';
  ctx.strokeStyle = placing ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 2;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dc && !dr) continue;
      const c = focus.c + dc, r = focus.r + dr;
      if (!buildableAt(state, c, r)) continue;
      ctx.fillRect(c * TILE + 3, r * TILE + 3, TILE - 6, TILE - 6);
      ctx.strokeRect(c * TILE + 3.5, r * TILE + 3.5, TILE - 7, TILE - 7);
    }
  }

  const pulse = 0.6 + 0.4 * Math.sin(now / 320);
  ctx.lineCap = 'round';
  for (const n of adjacentLinks(state, focus)) {
    const cyan = isProp(focus.def) || isProp(n.def);
    // 진한 심 위에 밝은 선을 겹쳐 어느 배경에서도 보이게
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(focus.x, focus.y); ctx.lineTo(n.x, n.y); ctx.stroke();
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.strokeStyle = cyan ? '#8ef0ff' : '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(focus.x, focus.y); ctx.lineTo(n.x, n.y); ctx.stroke();
  }
  ctx.restore();
}

/** 선택한 최종진화와 합체 가능한 인접 타워를 잇는다 — 메가진화 가능 여부를 필드에서 바로 보이게 */
function drawMegaLinks(ctx, state, now) {
  const sel = state.selectedTower();
  if (!sel) return;
  const links = readyPartners(state, sel);
  if (links.length === 0) return;

  const pulse = 0.55 + 0.45 * Math.sin(now / 260);
  ctx.save();
  for (const { partner, ok } of links) {
    ctx.globalAlpha = ok ? 0.45 + pulse * 0.45 : 0.3;
    ctx.strokeStyle = ok ? '#ffb020' : '#6b5a34';
    ctx.lineWidth = ok ? 6 : 3;
    ctx.lineCap = 'round';
    ctx.setLineDash(ok ? [] : [6, 6]);
    ctx.beginPath();
    ctx.moveTo(sel.x, sel.y);
    ctx.lineTo(partner.x, partner.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = ok ? 0.95 : 0.45;
    ctx.strokeStyle = ok ? '#ffd166' : '#6b5a34';
    ctx.lineWidth = 3;
    ctx.strokeRect(partner.c * TILE + 3.5, partner.r * TILE + 3.5, TILE - 7, TILE - 7);
  }
  ctx.restore();
  ctx.setLineDash([]);
}

/** 도구 — 종류마다 다른 모델. 공격하지 않으므로 '물건'처럼 그린다 */
function drawProp(ctx, t, state, now) {
  const d = t.def;
  const selected = state.selectedTowerUid === t.uid;
  const float = Math.sin(now / 620 + t.uid) * 2.2;

  if (selected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(t.c * TILE + 2.5, t.r * TILE + 2.5, TILE - 5, TILE - 5);
  }
  drawPropModel(ctx, t.monsterId, t.x, t.y - 4, 27, d.color, { float });
}

function drawTowers(ctx, state, now) {
  for (const t of state.towers) {
    const d = t.def;
    if (isProp(d)) { drawProp(ctx, t, state, now); continue; }
    const attrCol = ATTR[d.attr].color;
    const s = 25 + d.tier * 2.8;
    const selected = state.selectedTowerUid === t.uid;
    const bob = Math.sin(now / 520 + t.uid * 1.7) * 1.2;
    const kick = t.recoil * t.recoil;                       // 반동은 끝에서 급히 잦아든다
    const cx = t.x - Math.cos(t.aim) * kick * 4;
    const cy = t.y - LIFT + bob - Math.sin(t.aim) * kick * 4;
    if (selected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(t.c * TILE + 2.5, t.r * TILE + 2.5, TILE - 5, TILE - 5);
    }

    // 바닥 그림자 — 유닛이 떠 있다는 신호
    ctx.fillStyle = P.shadow;
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + 11, s * 0.50, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 메가진화는 금색 후광으로 한눈에 구분된다
    if (d.mega) {
      const gg = ctx.createRadialGradient(cx, cy, s * 0.3, cx, cy, s * 1.15);
      gg.addColorStop(0, 'rgba(255, 214, 110, 0.55)');
      gg.addColorStop(1, 'rgba(255, 190, 60, 0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, cy, s * 1.15, 0, Math.PI * 2); ctx.fill();
    }

    // ── 몬스터별 실루엣 (반동 중에는 공격 포즈 프레임) ──
    drawUnit(ctx, d, cx, cy, s * (1 + kick * 0.06), t.aim, t.recoil > 0.3);

    // 발사 반동은 몸 전체를 뒤로 밀어 표현했으므로 여기선 속성 젬만 얹는다
    ctx.beginPath();
    ctx.arc(cx - s * 0.46, cy - s * 0.62, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = volume(ctx, cy - s * 0.7, cy - s * 0.52, attrCol, 0.4, 0.35);
    ctx.fill();
    ctx.strokeStyle = inkOf(attrCol);
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 티어 pip — 바닥(그림자 위)에 붙여 유닛과 분리
    const gap = 6;
    const startX = t.x - ((d.tier - 1) * gap) / 2;
    for (let i = 0; i < d.tier; i++) {
      ctx.fillStyle = d.mega ? '#ffd166' : '#fff6d8';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(startX + i * gap, t.y + 15, 2.6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.textAlign = 'left';
  }
}

function drawEnemies(ctx, state, now) {
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const r = e.radius;
    const bob = Math.abs(Math.sin(e.walk * 2)) * (r * 0.11);
    const kx = e.kx || 0, ky = e.ky || 0;      // 피격 넉백 (표현용)
    const ex = e.x + kx;
    const cy = e.y + ky - r * 0.32 - bob;

    // 그림자 — 몸이 뜬 만큼 작아진다
    ctx.fillStyle = P.shadow;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.62, r * (0.95 - bob * 0.03), r * 0.40, 0, 0, Math.PI * 2);
    ctx.fill();

    // 보스·정예 발밑 표식 (몸에 링을 두르면 실루엣을 가린다)
    if (e.cls === 'boss' || e.cls === 'elite') {
      ctx.strokeStyle = e.cls === 'boss' ? '#ffcc00' : '#e6b3ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + r * 0.62, r * 1.15, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(ex, cy);
    ctx.scale(e.face || 1, 1);
    const sq = e.hitT || 0;
    if (sq > 0) ctx.scale(1 + sq * 0.16, 1 - sq * 0.16);   // 맞으면 납작해진다
    drawCreature(ctx, e, r, now, null);
    if (sq > 0.02) {
      ctx.globalAlpha = sq * 0.8;
      drawCreature(ctx, e, r, now, '#ffffff');             // 피격 섬광
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (e.slowTime > 0) {
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(ex, e.y + r * 0.5, r * 1.05, r * 0.46, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 속성 마크
    ctx.textAlign = 'center';
    outlinedText(ctx, ATTR[e.attr].mark, ex, cy - r * 1.6 - 12,
      'bold 11px sans-serif', ATTR[e.attr].color, 2.5);

    // 체력바 — 굵은 외곽선으로 배경과 분리
    const w = Math.max(r * 2.6, 24);
    const ratio = Math.max(0, e.hp / e.maxHp);
    const by = cy - r * 1.6 - 9;
    ctx.fillStyle = P.ink;
    ctx.fillRect(ex - w / 2 - 1.5, by - 1.5, w + 3, 8);
    ctx.fillStyle = '#3a2f1c';
    ctx.fillRect(ex - w / 2, by, w, 5);
    ctx.fillStyle = ratio > 0.5 ? '#6fe06f' : ratio > 0.25 ? '#ffd23f' : '#ff5a4a';
    ctx.fillRect(ex - w / 2, by, w * ratio, 5);
    ctx.textAlign = 'left';
  }
}

// ── 적 실루엣 ─────────────────────────────────────────────────
// 원점(0,0)이 몸 중심, +x가 진행 방향. tint가 있으면 그 색 한 가지로만
// 칠하고 외곽선을 생략한다(피격 섬광용).
function drawCreature(ctx, e, r, now, tint) {
  const c = (col) => tint || col;
  const line = !tint;
  const base = e.color;
  const dark = shade(base, -0.32);
  const light = shade(base, 0.24);
  const p = e.parts || {};
  const wk = Math.sin(e.walk * 2);        // 다리 위상
  const flap = Math.sin(now / 55 + e.uid);

  const LW = 2.1;
  ctx.lineWidth = LW;

  // 단색 대신 세로 볼륨을 넣고, 외곽선은 그 색의 어두운 톤으로 — 평면감이 사라진다
  const fill = (col, top, bottom) => {
    ctx.fillStyle = tint ? tint : (top === undefined ? col : volume(ctx, top, bottom, col));
    ctx.fill();
    if (line) { ctx.strokeStyle = inkOf(col); ctx.stroke(); }
  };
  const blob = (x, y, rx, ry, col) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    fill(col, y - ry, y + ry);
    if (!tint) {                       // 왼쪽 위 림라이트
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = shade(col, 0.55);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 0.92, ry * 0.92, 0, Math.PI * 1.08, Math.PI * 1.75);
      ctx.stroke();
      ctx.restore();
    }
  };
  const box = (x, y, w, h, rad, col) => {
    roundRect(ctx, x, y, w, h, rad); fill(col, y, y + h);
    if (!tint) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = shade(col, 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + rad, y + 1); ctx.lineTo(x + w - rad, y + 1);
      ctx.stroke();
      ctx.restore();
    }
  };
  const tri = (x1, y1, x2, y2, x3, y3, col) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
    ctx.closePath();
    fill(col, Math.min(y1, y2, y3), Math.max(y1, y2, y3));
  };
  // 눈은 작고 낮게 — 크고 동그란 눈이 유아틱함의 8할이다
  const eyes = (x, y, sz, spread) => {
    for (const s of [-spread, spread]) {
      const ex = x + s * 0.35;
      ctx.beginPath(); ctx.ellipse(ex, y, sz * 0.82, sz * 0.72, 0, 0, Math.PI * 2);
      ctx.fillStyle = c('#f3f0e4'); ctx.fill();
      if (line) { ctx.strokeStyle = inkOf(base); ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = LW; }
      if (!tint) {
        ctx.fillStyle = '#1b1610';
        ctx.beginPath(); ctx.ellipse(ex + sz * 0.24, y, sz * 0.38, sz * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(ex + sz * 0.1, y - sz * 0.22, sz * 0.16, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  switch (e.shape) {
    case 'worm': {
      const n = p.segs || 4;
      for (let i = n - 1; i >= 0; i--) {
        const sx = -i * r * 0.62;
        const sy = Math.sin(e.walk * 2 + i * 0.9) * r * 0.16;
        const rr = r * (0.95 - i * 0.08);
        blob(sx, sy, rr, rr * 0.92, i % 2 ? shade(base, -0.12) : base);
        if (!tint && p.stripe && i > 0) {
          ctx.fillStyle = p.stripe;
          ctx.fillRect(sx - rr * 0.5, sy - rr * 0.22, rr, rr * 0.44);
        }
      }
      if (p.antenna) {
        ctx.lineWidth = 2.4;
        for (const s of [-0.5, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(r * 0.35, -r * 0.5);
          ctx.quadraticCurveTo(r * 0.7, -r * 1.5, r * 1.0 + s * r * 0.4, -r * 1.5 + s * r * 0.3);
          ctx.strokeStyle = c(dark); ctx.stroke();
        }
      }
      eyes(r * 0.32, -r * 0.12, r * 0.24, r * 0.9);
      break;
    }

    case 'beast': {
      for (const [lx, ph] of [[-r * 0.5, 0], [r * 0.5, Math.PI]]) {
        const off = Math.sin(e.walk * 2 + ph) * r * 0.3;
        box(lx - r * 0.2 + off, r * 0.35, r * 0.4, r * 0.75, 3, dark);
      }
      blob(0, 0, r * 1.15, r * 0.72, base);                    // 몸통
      if (p.tail === 'tuft') {
        tri(-r * 1.0, -r * 0.1, -r * 1.9, -r * 0.75, -r * 0.95, r * 0.35, dark);
      }
      blob(r * 0.85, -r * 0.35, r * 0.62, r * 0.58, light);    // 머리
      if (p.ears === 'long') {
        for (const s of [-1, 0.55]) {
          tri(r * 0.75 + s * r * 0.18, -r * 0.75,
            r * 0.55 + s * r * 0.5, -r * 2.0,
            r * 1.05 + s * r * 0.2, -r * 0.75, light);
        }
      }
      if (p.claws && !tint) {
        ctx.fillStyle = '#f4efe0';
        for (const lx of [-r * 0.55, r * 0.45]) {
          for (let i = 0; i < 3; i++) ctx.fillRect(lx + i * r * 0.14, r * 1.02, r * 0.09, r * 0.2);
        }
      }
      eyes(r * 0.95, -r * 0.4, r * 0.19, r * 0.55);
      break;
    }

    case 'flyer': {
      if (p.wing === 'feather') {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.2, -r * 0.2);
          ctx.quadraticCurveTo(-r * 1.5, s * r * 0.4 - r * 1.1 * Math.abs(flap) * 0.5 - r * 0.5,
            -r * 0.3 + s * r * 0.2, -r * 1.5 - Math.abs(flap) * r * 0.4);
          ctx.quadraticCurveTo(-r * 0.1, -r * 0.7, -r * 0.2, -r * 0.2);
          fill(light);
        }
      } else {
        for (const s of [-1, 1]) {
          ctx.save();
          ctx.translate(-r * 0.1, -r * 0.35);
          ctx.rotate(s * (0.5 + flap * 0.45));
          ctx.globalAlpha = tint ? 1 : 0.72;
          blob(-r * 0.9, 0, r * 1.15, r * 0.34, shade(base, 0.62));
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
      blob(0, 0, r * 1.0, r * 0.78, base);
      if (!tint) {
        ctx.fillStyle = dark;
        ctx.fillRect(-r * 0.5, -r * 0.12, r * 1.0, r * 0.16);
      }
      blob(r * 0.78, -r * 0.42, r * 0.58, r * 0.5, light);
      if (p.mane) {
        for (let i = 0; i < 3; i++) {
          tri(r * 0.35 - i * r * 0.24, -r * 0.75, r * 0.15 - i * r * 0.24, -r * 1.35,
            r * 0.55 - i * r * 0.24, -r * 0.72, dark);
        }
      }
      if (p.horn) tri(r * 0.9, -r * 0.85, r * 1.25, -r * 2.0, r * 1.15, -r * 0.75, '#fff2c8');
      if (p.pincer) {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(r * 1.05, s * r * 0.25);
          ctx.quadraticCurveTo(r * 2.2, s * r * 0.9, r * 2.3, s * r * 0.1);
          ctx.quadraticCurveTo(r * 1.9, s * r * 0.5, r * 1.05, s * r * 0.6);
          fill(dark);
        }
      }
      eyes(r * 0.9, -r * 0.45, r * 0.18, r * 0.5);
      break;
    }

    case 'shell': {
      for (const [lx, ph] of [[-r * 0.62, 0], [r * 0.55, Math.PI]]) {
        const off = Math.sin(e.walk * 2 + ph) * r * 0.18;
        box(lx + off, r * 0.3, r * 0.42, r * 0.62, 4, dark);
      }
      blob(r * 0.95, r * 0.05, r * 0.5, r * 0.42, light);      // 머리
      ctx.beginPath();                                          // 등딱지
      ctx.ellipse(0, -r * 0.1, r * 1.2, r * 0.95, 0, Math.PI, 0);
      ctx.lineTo(r * 1.2, r * 0.25);
      ctx.lineTo(-r * 1.2, r * 0.25);
      ctx.closePath();
      fill(p.shell || dark);
      if (!tint) {
        ctx.strokeStyle = shade(p.shell || dark, -0.3);
        ctx.lineWidth = 2;
        for (const dx of [-0.55, 0, 0.55]) {
          ctx.beginPath();
          ctx.moveTo(dx * r, -r * 0.95); ctx.lineTo(dx * r * 1.15, r * 0.2);
          ctx.stroke();
        }
        ctx.lineWidth = LW;
      }
      const n = p.spikes || 0;
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i + 0.5) * (Math.PI / n);
        tri(Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.9 - r * 0.1,
          Math.cos(a) * r * 1.7, Math.sin(a) * r * 1.5 - r * 0.1,
          Math.cos(a) * r * 1.1 + r * 0.28, Math.sin(a) * r * 0.9 + r * 0.1, base);
      }
      eyes(r * 1.05, r * 0.0, r * 0.16, r * 0.4);
      break;
    }

    case 'mech': {
      if (p.treads) {
        box(-r * 1.05, r * 0.28, r * 2.1, r * 0.7, 6, shade(base, -0.5));
        if (!tint) {
          ctx.fillStyle = '#2f3742';
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.arc(i * r * 0.42, r * 0.62, r * 0.13, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else {
        for (const [lx, ph] of [[-r * 0.5, 0], [r * 0.3, Math.PI]]) {
          const off = Math.sin(e.walk * 2 + ph) * r * 0.24;
          box(lx + off, r * 0.35, r * 0.36, r * 0.8, 3, shade(base, -0.5));
        }
      }
      const n = p.spikes || 0;
      for (let i = 0; i < n; i++) {
        const dx = (i / Math.max(1, n - 1) - 0.5) * r * 1.5;
        tri(dx - r * 0.14, -r * 0.9, dx, -r * 1.6, dx + r * 0.14, -r * 0.9, light);
      }
      if (p.cannons) {
        for (const s of [-1, 1]) {
          box(r * 0.5, s * r * 0.55 - r * 0.16, r * 1.5, r * 0.34, 4, shade(base, -0.42));
          if (!tint) {
            ctx.fillStyle = '#ff5a3c';
            ctx.beginPath(); ctx.arc(r * 1.95, s * r * 0.55, r * 0.13, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      if (p.arms) {
        for (const s of [-1, 1]) box(-r * 0.15, s * r * 0.6 - r * 0.18, r * 1.35, r * 0.36, 4, p.plate || dark);
      }
      box(-r * 0.9, -r * 0.95, r * 1.8, r * 1.75, 6, base);    // 동체
      if (!tint) {
        ctx.fillStyle = p.plate || dark;
        ctx.fillRect(-r * 0.62, -r * 0.2, r * 1.24, r * 0.75);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(-r * 0.9, -r * 0.95, r * 1.8, r * 0.42);
      }
      if (p.visor) {
        box(-r * 0.62, -r * 0.7, r * 1.24, r * 0.36, 3, '#12303a');
        if (!tint) {
          ctx.fillStyle = '#59f0ff';
          ctx.fillRect(-r * 0.5, -r * 0.62, r * 1.0, r * 0.18);
        }
      } else {
        const n2 = p.eye || 1;
        for (let i = 0; i < n2; i++) {
          const dx = (n2 === 1 ? 0 : (i - 0.5) * r * 0.66);
          ctx.beginPath(); ctx.arc(dx, -r * 0.5, r * 0.24, 0, Math.PI * 2);
          fill('#ff4d3d');
          if (!tint) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(dx + r * 0.07, -r * 0.57, r * 0.08, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      break;
    }

    case 'chaos': {
      const n = p.claws || 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + now / 1400;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.28);
        ctx.quadraticCurveTo(r * 1.9, -r * 0.5, r * 2.15, r * 0.35);
        ctx.quadraticCurveTo(r * 1.6, -r * 0.05, r * 0.5, r * 0.3);
        fill(shade(base, -0.18));
        ctx.restore();
      }
      ctx.beginPath();                                          // 중앙 다면체
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      fill(base);
      if (!tint) {
        const pulse = 0.6 + 0.4 * Math.sin(now / 180);
        const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.75);
        g.addColorStop(0, p.core || '#ff3b6b');
        g.addColorStop(1, 'rgba(255,59,107,0)');
        ctx.globalAlpha = pulse;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }

    default: { // brute
      for (const [lx, ph] of [[-r * 0.55, 0], [r * 0.15, Math.PI]]) {
        const off = Math.sin(e.walk * 2 + ph) * r * 0.26;
        box(lx + off, r * 0.5, r * 0.44, r * 0.68, 4, dark);
      }
      if (p.arms) {
        for (const [s, ph] of [[-1, Math.PI], [1, 0]]) {
          const off = Math.sin(e.walk * 2 + ph) * r * 0.2;
          box(s > 0 ? r * 0.55 : -r * 1.05, -r * 0.35 + off, r * 0.5, r * 0.95, 5, dark);
        }
      }
      blob(0, r * 0.1, r * 0.95, r * 0.85, base);              // 몸통
      if (p.belly && !tint) {
        ctx.fillStyle = p.belly;
        ctx.beginPath(); ctx.ellipse(0, r * 0.28, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      blob(r * 0.1, -r * 0.85, r * 0.78, r * 0.68, light);      // 머리
      if (p.ears === 'point') {
        for (const s of [-1, 1]) {
          tri(r * 0.1 + s * r * 0.6, -r * 1.05, r * 0.1 + s * r * 1.35, -r * 1.5,
            r * 0.1 + s * r * 0.55, -r * 0.62, light);
        }
      } else if (p.ears === 'round') {
        for (const s of [-1, 1]) blob(r * 0.1 + s * r * 0.78, -r * 1.0, r * 0.3, r * 0.32, light);
      }
      if (p.club) {
        box(r * 0.65, -r * 0.2, r * 0.3, r * 1.5, 4, '#7a5a32');
        blob(r * 0.8, -r * 0.35, r * 0.36, r * 0.32, '#8f6b3c');
      }
      if (p.shades) {
        box(-r * 0.55, -r * 1.05, r * 1.35, r * 0.36, 3, '#1a1a1a');
      } else {
        eyes(r * 0.2, -r * 0.9, r * 0.2, r * 0.66);
      }
      if (p.tusks) {
        for (const s of [-1, 1]) {
          tri(r * 0.1 + s * r * 0.3, -r * 0.55, r * 0.1 + s * r * 0.36, -r * 0.15,
            r * 0.1 + s * r * 0.14, -r * 0.5, '#f4efe0');
        }
      }
      break;
    }
  }
}

function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    if (p.mode === 'beam') {
      const ang = Math.atan2(p.vy, p.vx);
      // 뒤로 늘어지는 잔광은 도트 탄과 겹치지 않게 옅게
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(-40, 0, 0, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, p.color);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = g;
      ctx.fillRect(-40, -2.5, 42, 5);
      ctx.restore();
      drawShot(ctx, p.shotId, p.x, p.y, ang, p.crit ? 1.25 : 1);
    } else {
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const ang = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy) || 1;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = p.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (dx / d) * 13, p.y - (dy / d) * 13);
      ctx.stroke();
      ctx.restore();
      drawShot(ctx, p.shotId, p.x, p.y, ang, p.crit ? 1.3 : 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawEffects(ctx, state) {
  ctx.textAlign = 'center';
  for (const fx of state.effects) {
    const k = fx.t / fx.ttl; // 1 → 0
    ctx.save();
    ctx.globalAlpha = Math.max(0, k);

    if (fx.type === 'spark') {
      // 속도 방향으로 늘어난 불꽃 — 점보다 훨씬 "튄다"는 느낌이 난다
      const sp = Math.hypot(fx.vx, fx.vy);
      const len = Math.min(14, 3 + sp * 0.035);
      ctx.strokeStyle = fx.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = fx.size;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(fx.x - (fx.vx / (sp || 1)) * len, fx.y - (fx.vy / (sp || 1)) * len);
      ctx.stroke();

    } else if (fx.type === 'debris') {
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.rot || 0);
      ctx.fillStyle = fx.color;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1.6;
      ctx.fillRect(-fx.size / 2, -fx.size / 2, fx.size, fx.size);
      ctx.strokeRect(-fx.size / 2, -fx.size / 2, fx.size, fx.size);

    } else if (fx.type === 'shock') {
      const t = 1 - k;                                   // 0 → 1
      const rr = fx.r0 + (fx.r1 - fx.r0) * (1 - (1 - t) * (1 - t));
      ctx.globalAlpha = k * 0.9;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = fx.width * k;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2); ctx.stroke();

    } else if (fx.type === 'scorch') {
      ctx.globalAlpha = k * 0.30;
      const g = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fx.r);
      g.addColorStop(0, fx.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2); ctx.fill();

    } else if (fx.type === 'muzzle') {
      drawCast(ctx, fx.shotId, fx.x, fx.y, fx.angle, k);

    } else if (fx.type === 'critflash') {
      // 십자 섬광 — 치명타만의 신호
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.angle);
      ctx.globalAlpha = k;
      const L = 34 * (1.6 - k), W = 5 * k;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.moveTo(-L, 0); ctx.lineTo(0, -W); ctx.lineTo(L, 0); ctx.lineTo(0, W);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -L * 0.62); ctx.lineTo(W, 0); ctx.lineTo(0, L * 0.62); ctx.lineTo(-W, 0);
      ctx.closePath(); ctx.fill();

    } else if (fx.type === 'slash') {
      // 관통이 지나간 자리에 남는 베인 자국
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.angle + Math.PI / 2);
      ctx.globalAlpha = k * 0.95;
      ctx.strokeStyle = '#fff6d8';
      ctx.lineWidth = 3 * k + 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16 * (1.4 - k), -5);
      ctx.quadraticCurveTo(0, 0, 16 * (1.4 - k), 5);
      ctx.stroke();

    } else if (fx.type === 'frost') {
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.rot || 0);
      ctx.globalAlpha = k * 0.95;
      ctx.fillStyle = '#bff0ff';
      ctx.strokeStyle = '#3aa8d8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -fx.size); ctx.lineTo(fx.size * 0.62, 0);
      ctx.lineTo(0, fx.size); ctx.lineTo(-fx.size * 0.62, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();

    } else if (fx.type === 'coin') {
      ctx.translate(fx.x, fx.y);
      ctx.globalAlpha = Math.min(1, k * 2.5);
      // 회전에 따라 납작해지는 동전
      const sc = Math.abs(Math.cos(fx.rot || 0));
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#8a5c10';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, fx.size * Math.max(0.18, sc), fx.size, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

    } else if (fx.type === 'dmgnum') {
      const style = {
        norm:   { col: '#ffffff', size: 13, pre: '' },
        crit:   { col: '#ffd166', size: 20, pre: '' },
        strong: { col: '#ffe066', size: 16, pre: '▲' },
        weak:   { col: '#c3cbd8', size: 12, pre: '▼' },
        exec:   { col: '#ff6b5a', size: 21, pre: '☠' },
        bits:   { col: '#ffd166', size: 14, pre: '◈' },
      }[fx.kind] || { col: '#fff', size: 13, pre: '' };
      const pop = fx.kind === 'norm' ? 1 : 1 + Math.max(0, (k - 0.75)) * 1.6;
      ctx.globalAlpha = Math.min(1, k * 2.4);
      outlinedText(ctx, style.pre + fx.amount, fx.x, fx.y,
        `bold ${Math.round(style.size * pop)}px "Malgun Gothic", sans-serif`, style.col, 4.5);

    } else if (fx.type === 'death') {
      // 흰 섬광이 먼저 터지고 색이 남는다
      ctx.globalAlpha = k * k;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath(); ctx.arc(fx.x, fx.y, (fx.r || 10) * (2.2 - k * 1.4), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = k * 0.55;
      ctx.fillStyle = fx.color;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, (fx.r || 10) * (2.9 - k * 1.6), 0, Math.PI * 2); ctx.fill();

    } else if (fx.type === 'evolve') {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 46 * (1.25 - k), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      outlinedText(ctx, '진화!', fx.x, fx.y - 34 - (1 - k) * 10,
        'bold 16px "Malgun Gothic", sans-serif', '#fff6d8', 4);
    } else if (fx.type === 'mega') {
      // 두 타일에서 빛이 모여들었다가 결과 타일에서 터진다
      const conv = Math.min(1, (1 - k) * 2.2);
      const burst = Math.max(0, (1 - k) * 2.2 - 1);
      const mx = fx.x2 + (fx.x - fx.x2) * conv;
      const my = fx.y2 + (fx.y - fx.y2) * conv;

      ctx.strokeStyle = '#ffb020';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.globalAlpha = (1 - conv) * 0.95;
      ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#fff6d8';
      ctx.strokeStyle = '#8a5a10';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, 7 + conv * 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      if (burst > 0) {
        ctx.globalAlpha = Math.max(0, 1 - burst);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 20 + burst * 62, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 12 + burst * 40, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        outlinedText(ctx, '메가진화!', fx.x, fx.y - 38 - burst * 12,
          'bold 18px "Malgun Gothic", sans-serif', '#ffd166', 4.5);
      }
    } else if (fx.type === 'leak') {
      outlinedText(ctx, `-${fx.amount} ♥`, fx.x, fx.y - (1 - k) * 24,
        'bold 16px "Malgun Gothic", sans-serif', '#ff6b6b', 4);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}




export { CANVAS, ENEMIES };
