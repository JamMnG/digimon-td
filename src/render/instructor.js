// ─────────────────────────────────────────────────────────────
// instructor.js — 트레이닝 필드 교관 (인간형 NPC)
//
// 디지몬이 아니라 사람이다. 그래서 digimonArt 의 부위 조합을 쓰지 않고
// 따로 그린다 — 실루엣이 확실히 달라야 "이건 유닛이 아니다"가 읽힌다.
//
// 하는 일:
//  · 평소엔 제자리에서 숨쉬듯 흔들린다
//  · 튜토리얼이 가리키는 칸이 있으면 그쪽으로 몸을 돌리고 팔을 뻗어 짚는다
//  · 짚는 동안 머리 위에 느낌표가 튄다
//
// 전투에는 전혀 관여하지 않는다. state를 읽기만 한다.
// ─────────────────────────────────────────────────────────────
import { shade, inkOf, volume, roundRect } from './shading.js';

const SKIN = '#f0c49a';
const CAP = '#e0503a';
const COAT = '#5f6b4a';
const PANTS = '#3c4436';
const BOOT = '#2e2a20';

export function drawInstructor(ctx, x, y, s, now, target) {
  const breathe = Math.sin(now / 780) * 1.4;
  const cy = y + breathe;
  // 가리킬 곳이 있으면 그쪽을 본다
  const face = target ? (target.x >= x ? 1 : -1) : 1;
  const point = target ? 1 : 0;
  const swing = point ? 0 : Math.sin(now / 620) * 0.14;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.1;

  // 접지 그림자
  ctx.fillStyle = 'rgba(30, 26, 12, 0.30)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.52, s * 0.34, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, cy);
  ctx.scale(face, 1);

  const fill = (col, t, b) => {
    ctx.fillStyle = volume(ctx, t, b, col, 0.32, 0.34);
    ctx.strokeStyle = inkOf(col);
    ctx.fill(); ctx.stroke();
  };
  const box = (bx, by, w, h, r, col) => { roundRect(ctx, bx, by, w, h, r); fill(col, by, by + h); };
  const ell = (ex, ey, rx, ry, col) => {
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); fill(col, ey - ry, ey + ry);
  };

  // 다리 + 부츠
  for (const ox of [-0.16, 0.16]) {
    box(s * ox - s * 0.10, s * 0.14, s * 0.20, s * 0.30, s * 0.05, PANTS);
    box(s * ox - s * 0.12, s * 0.38, s * 0.24, s * 0.14, s * 0.05, BOOT);
  }

  // 뒷팔 (가리킬 때는 허리에)
  ctx.save();
  ctx.translate(-s * 0.22, -s * 0.16);
  ctx.rotate(point ? 0.5 : swing);
  box(-s * 0.07, 0, s * 0.14, s * 0.30, s * 0.06, shade(COAT, -0.18));
  ell(0, s * 0.34, s * 0.08, s * 0.08, SKIN);
  ctx.restore();

  // 몸통 (재킷)
  box(-s * 0.24, -s * 0.24, s * 0.48, s * 0.42, s * 0.08, COAT);
  ctx.save();                                       // 지퍼 라인
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = shade(COAT, -0.45);
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -s * 0.22); ctx.lineTo(0, s * 0.16); ctx.stroke();
  ctx.restore();
  ctx.lineWidth = 2.1;

  // 호루라기
  ctx.strokeStyle = inkOf(COAT);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.10, -s * 0.22);
  ctx.quadraticCurveTo(0, -s * 0.04, s * 0.09, -s * 0.10);
  ctx.stroke();
  ctx.lineWidth = 2.1;
  ell(s * 0.10, -s * 0.08, s * 0.055, s * 0.045, '#ffd166');

  // 앞팔 — 가리킬 때 뻗는다
  ctx.save();
  ctx.translate(s * 0.22, -s * 0.16);
  ctx.rotate(point ? -1.15 : -swing);
  box(-s * 0.07, 0, s * 0.14, s * 0.32, s * 0.06, COAT);
  ell(0, s * 0.36, s * 0.085, s * 0.085, SKIN);
  ctx.restore();

  // 머리 + 모자
  ell(0, -s * 0.40, s * 0.155, s * 0.165, SKIN);
  ctx.fillStyle = inkOf(SKIN);
  ctx.beginPath();                                  // 눈
  ctx.ellipse(-s * 0.05, -s * 0.41, s * 0.022, s * 0.030, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.055, -s * 0.41, s * 0.022, s * 0.030, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();                                  // 모자 챙
  ctx.ellipse(s * 0.10, -s * 0.50, s * 0.16, s * 0.045, -0.12, 0, Math.PI * 2);
  fill(shade(CAP, -0.25), -s * 0.55, -s * 0.45);
  ctx.beginPath();                                  // 모자 크라운
  ctx.ellipse(0, -s * 0.53, s * 0.17, s * 0.13, 0, Math.PI, 0);
  ctx.closePath();
  fill(CAP, -s * 0.66, -s * 0.50);

  ctx.restore();

  // 느낌표 — 무언가를 짚고 있을 때만
  if (point) {
    const pop = Math.abs(Math.sin(now / 300));
    ctx.save();
    ctx.translate(x, cy - s * 0.86 - pop * 3);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(s * 0.44)}px "Malgun Gothic", sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#2b2214';
    ctx.strokeText('!', 0, 0);
    ctx.fillStyle = '#ffd166';
    ctx.fillText('!', 0, 0);
    ctx.restore();
  }

  ctx.restore();
}
