// ─────────────────────────────────────────────────────────────
// attributeChart.js — 3속성 순환 상성
//   불꽃 ──▶ 풀 ──▶ 물 ──▶ 불꽃
// 화살표 방향이 "강하다". 원작 스타터 3각을 그대로 쓴다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';

const BEATS = { FIRE: 'GRASS', GRASS: 'WATER', WATER: 'FIRE' };

/**
 * 공격자 속성 → 피격자 속성 피해 배율.
 * mods 를 주면 증강(상성 지배)이 유리/불리 폭을 넓힌다.
 */
export function attrMultiplier(atkAttr, defAttr, mods) {
  const A = BALANCE.attrMult;
  if (!atkAttr || !defAttr) return A.neutral;
  if (BEATS[atkAttr] === defAttr) return A.strong + (mods?.strongAdd || 0);
  if (BEATS[defAttr] === atkAttr) return A.weak + (mods?.weakAdd || 0);
  return A.neutral;
}

export const beats = (attr) => BEATS[attr];
export const beatenBy = (attr) =>
  Object.keys(BEATS).find((k) => BEATS[k] === attr);

/** 'strong' | 'weak' | 'neutral' */
export function relation(atkAttr, defAttr) {
  const m = attrMultiplier(atkAttr, defAttr);
  if (m > 1) return 'strong';
  if (m < 1) return 'weak';
  return 'neutral';
}
