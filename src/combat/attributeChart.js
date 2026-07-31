// ─────────────────────────────────────────────────────────────
// attributeChart.js — 원작 타입 상성
//
// 예전에는 불꽃▶풀▶물 3각 순환만 썼다. 배우기는 쉬웠지만
// "알통몬이 왜 불꽃이냐"처럼 원작을 아는 사람에게는 계속 걸렸다.
// 그래서 배율표를 원작 그대로 가져왔다 — 2배 / 0.5배도 원작 값이다.
//
// 다만 원작의 "무효(0배)"를 그대로 두면 타워가 아무것도 못 하고 서 있게 된다.
// 타워 디펜스에서는 그게 고장처럼 보이므로 IMMUNE 로 눌러 두고,
// UI에서 "거의 통하지 않는다"라고 따로 표시해 이유를 알려준다.
//
// 적은 원작대로 복합 타입을 가진다. 두 타입의 배율을 곱하므로
// 물▶꼬마돌(바위/땅) 4배 같은 원작의 상징적인 장면이 그대로 나온다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';

/**
 * 공격 타입 → 방어 타입 배율. 원작 표 그대로이며,
 * 적히지 않은 조합은 1배다. 0 은 원작의 무효(뒤에서 IMMUNE 으로 눌린다).
 *
 * 아군이 가질 수 있는 10개 타입만 행으로 둔다 — 적은 공격하지 않는다.
 */
const CHART = {
  FIRE:     { GRASS: 2, BUG: 2, ICE: 2, STEEL: 2, FIRE: .5, WATER: .5, ROCK: .5, DRAGON: .5 },
  WATER:    { FIRE: 2, GROUND: 2, ROCK: 2, WATER: .5, GRASS: .5, DRAGON: .5 },
  GRASS:    { WATER: 2, GROUND: 2, ROCK: 2, FIRE: .5, GRASS: .5, POISON: .5, FLYING: .5, BUG: .5, DRAGON: .5, STEEL: .5 },
  ELECTRIC: { WATER: 2, FLYING: 2, ELECTRIC: .5, GRASS: .5, DRAGON: .5, GROUND: 0 },
  FIGHT:    { NORMAL: 2, ICE: 2, ROCK: 2, DARK: 2, STEEL: 2, POISON: .5, FLYING: .5, PSYCHIC: .5, BUG: .5, FAIRY: .5, GHOST: 0 },
  PSYCHIC:  { FIGHT: 2, POISON: 2, PSYCHIC: .5, STEEL: .5, DARK: 0 },
  GHOST:    { PSYCHIC: 2, GHOST: 2, DARK: .5, NORMAL: 0 },
  DRAGON:   { DRAGON: 2, STEEL: .5, FAIRY: 0 },
  STEEL:    { ICE: 2, ROCK: 2, FAIRY: 2, FIRE: .5, WATER: .5, ELECTRIC: .5, STEEL: .5 },
  FAIRY:    { FIGHT: 2, DRAGON: 2, DARK: 2, FIRE: .5, POISON: .5, STEEL: .5 },
};

/** 방어 측 타입 목록으로 정규화 — 문자열 하나든 배열이든 받는다 */
const defTypes = (d) => (Array.isArray(d) ? d : d ? [d] : []);

/** 원작 값 그대로의 배율 (무효는 0) */
export function rawMultiplier(atkType, defType) {
  const row = CHART[atkType];
  if (!row) return 1;
  let m = 1;
  for (const t of defTypes(defType)) m *= row[t] ?? 1;
  return m;
}

/**
 * 실제 전투에 쓰는 배율.
 * 무효는 IMMUNE 으로 눌러 완전히 못 때리는 상황을 없애고,
 * 특성 '상성 지배'가 유리·불리 폭을 넓힌다.
 */
export function attrMultiplier(atkType, defType, mods) {
  const A = BALANCE.attrMult;
  if (!atkType || !defType) return 1;
  const raw = rawMultiplier(atkType, defType);
  if (raw === 0) return A.immune;
  if (raw > 1) return raw + (mods?.strongAdd || 0) * (raw - 1);
  if (raw < 1) return Math.max(0.1, raw - (mods?.weakAdd || 0) * (1 - raw));
  return 1;
}

/** 'strong' | 'weak' | 'immune' | 'neutral' — UI 색·문구용 */
export function relation(atkType, defType) {
  const raw = rawMultiplier(atkType, defType);
  if (raw === 0) return 'immune';
  if (raw > 1) return 'strong';
  if (raw < 1) return 'weak';
  return 'neutral';
}

export const RELATION_TEXT = {
  strong: '효과가 굉장하다',
  weak: '효과가 별로다',
  immune: '거의 통하지 않는다',
  neutral: '보통',
};

/** 이 타입이 2배로 때리는 타입들 — 정보 패널용 */
export const strongAgainst = (atkType) =>
  Object.entries(CHART[atkType] || {}).filter(([, v]) => v > 1).map(([k]) => k);

/** 이 타입이 반감·무효당하는 타입들 */
export const weakAgainst = (atkType) =>
  Object.entries(CHART[atkType] || {}).filter(([, v]) => v < 1).map(([k]) => k);

/** 이 방어 타입을 2배로 때리는 아군 타입들 — 적 정보 표시용 */
export const counteredBy = (defType) =>
  Object.keys(CHART).filter((a) => rawMultiplier(a, defType) > 1);

export const ATTACK_TYPES = Object.keys(CHART);

/**
 * 이번 웨이브 구성에 대해 각 아군 타입의 평균 배율.
 * counts: { 적id: 마리수 }, defOf: 적id → 타입 배열
 * 웨이브 미리보기가 "무엇을 놓아야 하는가"를 바로 답해 주기 위한 것.
 */
export function typeScores(counts, defOf) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
  return ATTACK_TYPES.map((atk) => {
    let sum = 0;
    for (const [id, n] of Object.entries(counts)) {
      const raw = rawMultiplier(atk, defOf(id));
      sum += (raw === 0 ? BALANCE.attrMult.immune : raw) * n;
    }
    return { type: atk, mult: sum / total };
  }).sort((a, b) => b.mult - a.mult);
}
