// ─────────────────────────────────────────────────────────────
// summon.js — 랜덤 소환 (참고 이미지의 소환 버튼 방식)
//
// 상점에서 원하는 성장기를 고르는 대신, 버튼 한 번에 무엇이 나올지 모른다.
// 대신 "어디에 놓을지"는 그대로 플레이어가 정한다 — 인접 효과가 이 게임의
// 핵심이라 배치까지 자동이면 퍼즐이 사라진다.
//
// 소환 비용은 부를 때마다 오른다. 그래서 "한 번 더 뽑을까, 진화에 쓸까"가
// 매 웨이브 선택이 된다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { MONSTERS } from '../data/monsters.js';

/**
 * 소환 풀. weight 비율로 뽑는다.
 * jackpot 은 성숙기(T2)가 바로 나오는 낮은 확률 — 뽑는 맛을 위한 장치.
 */
export const SUMMON_POOL = [
  { id: 'agumon',  grade: 'common', weight: 30 },
  { id: 'gabumon', grade: 'common', weight: 30 },
  { id: 'patamon', grade: 'rare',   weight: 20 },
  { id: 'impmon',  grade: 'epic',   weight: 14 },
  // 잭팟 — 성숙기 직행
  { id: 'greymon',   grade: 'jackpot', weight: 1.5 },
  { id: 'garurumon', grade: 'jackpot', weight: 1.5 },
  { id: 'angemon',   grade: 'jackpot', weight: 1.5 },
  { id: 'devimon',   grade: 'jackpot', weight: 1.5 },
];

export const GRADE = {
  common:  { name: '일반',   color: '#c7d0dd' },
  rare:    { name: '희귀',   color: '#6fd0ff' },
  epic:    { name: '영웅',   color: '#d9a2ff' },
  jackpot: { name: '성숙기', color: '#ffd166' },
};

const TOTAL = SUMMON_POOL.reduce((s, e) => s + e.weight, 0);

/** 등장 확률 표 (UI 표시용) */
export function summonOdds() {
  return SUMMON_POOL.map((e) => ({
    ...e, def: MONSTERS[e.id], pct: (e.weight / TOTAL) * 100,
  }));
}

/** 이번 소환 비용 — 부를수록 오른다 */
export function summonCost(state) {
  const S = BALANCE.summon;
  const raw = S.base + S.step * (state.summons || 0);
  return Math.max(10, Math.round(raw * (1 + (state.mods?.towerCostMult || 0))));
}

/** 가중 추첨 */
export function rollSummon() {
  let r = Math.random() * TOTAL;
  for (const e of SUMMON_POOL) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return SUMMON_POOL[0];
}

/**
 * 소환 시도. 성공하면 { id, grade } 를 state.pending 에 올려두고,
 * 플레이어가 타일을 클릭해 배치한다. 배치 전에는 다시 소환할 수 없다.
 */
export function summon(state) {
  if (state.pending) return { ok: false, reason: '먼저 소환한 디지몬을 배치하세요' };
  const cost = summonCost(state);
  if (state.bits < cost) return { ok: false, reason: `비트가 부족합니다 (${cost} 필요)` };

  state.bits -= cost;
  state.summons = (state.summons || 0) + 1;
  const e = rollSummon();
  state.pending = { id: e.id, grade: e.grade, paid: cost };
  state.pushLog(`소환 — ${MONSTERS[e.id].name} (${GRADE[e.grade].name})`);
  return { ok: true, entry: e, cost };
}

/** 배치를 포기하고 절반만 돌려받는다 — 놓을 자리가 없을 때의 탈출구 */
export function releasePending(state) {
  if (!state.pending) return 0;
  const back = Math.floor(state.pending.paid * 0.5);
  state.bits += back;
  state.pending = null;
  return back;
}
