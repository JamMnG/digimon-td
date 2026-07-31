// ─────────────────────────────────────────────────────────────
// summon.js — 몬스터볼 (랜덤 포획)
//
// 상점에서 원하는 포켓몬을 고르는 대신, 볼을 던져 무엇이 나올지 모른다.
// 대신 "어디에 놓을지"는 그대로 플레이어가 정한다 — 인접 효과가 이 게임의
// 핵심이라 배치까지 자동이면 퍼즐이 사라진다.
//
// 볼 값은 던질수록 오른다. 그래서 "한 번 더 던질까, 진화에 쓸까"가
// 매 웨이브 선택이 된다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { MONSTERS } from '../data/monsters.js';

/**
 * 포획 풀. weight 비율로 뽑는다.
 * 14개 라인의 기본형 전부가 후보이고, 낮은 확률로 1차진화체(T2)가 바로 나온다.
 *
 * 종족이 골고루 섞이도록 가중치를 맞췄다 — 한 종족만 계속 나오면
 * 인접 퍼즐이 성립하지 않는다.
 */
export const SUMMON_POOL = [
  // ── 기본형 (T1) ──
  { id: 'charmander', grade: 'common', weight: 9 },
  { id: 'bulbasaur',  grade: 'common', weight: 9 },
  { id: 'poliwag',    grade: 'common', weight: 9 },
  { id: 'machop',     grade: 'common', weight: 9 },
  { id: 'magnemite',  grade: 'common', weight: 9 },
  { id: 'gastly',     grade: 'rare',   weight: 7 },
  { id: 'dratini',    grade: 'rare',   weight: 7 },
  { id: 'abra',       grade: 'rare',   weight: 7 },
  { id: 'togepi',     grade: 'rare',   weight: 7 },
  { id: 'tepig',      grade: 'rare',   weight: 6 },
  { id: 'ralts',      grade: 'epic',   weight: 5 },
  { id: 'litwick',    grade: 'epic',   weight: 5 },
  { id: 'beldum',     grade: 'epic',   weight: 4 },
  { id: 'gible',      grade: 'epic',   weight: 4 },

  // ── 잭팟 — 1차진화 직행 ──
  { id: 'charmeleon', grade: 'jackpot', weight: 0.9 },
  { id: 'haunter',    grade: 'jackpot', weight: 0.9 },
  { id: 'kadabra',    grade: 'jackpot', weight: 0.9 },
  { id: 'metang',     grade: 'jackpot', weight: 0.8 },
  { id: 'gabite',     grade: 'jackpot', weight: 0.8 },
];

export const GRADE = {
  common:  { name: '노말볼',   color: '#c7d0dd' },
  rare:    { name: '슈퍼볼',   color: '#6fd0ff' },
  epic:    { name: '하이퍼볼', color: '#d9a2ff' },
  jackpot: { name: '마스터볼', color: '#ffd166' },
};

const TOTAL = SUMMON_POOL.reduce((s, e) => s + e.weight, 0);

/** 등장 확률 표 (UI 표시용) */
export function summonOdds() {
  return SUMMON_POOL.map((e) => ({
    ...e, def: MONSTERS[e.id], pct: (e.weight / TOTAL) * 100,
  }));
}

/** 이번 볼 값 — 던질수록 오른다 */
export function summonCost(state) {
  const S = BALANCE.summon;
  // 값 상승폭은 도전 규칙('고가정책' ×2)과 배지 특전('비콜 배지' −25%)이 함께 건드린다
  const stepMult = (state.costlyBall ? 2 : 1) * (1 + (state.mods?.ballStepMult || 0));
  const raw = S.base + S.step * stepMult * (state.summons || 0);
  return Math.max(10, Math.round(raw * (1 + (state.mods?.towerCostMult || 0))));
}

/**
 * 가중 추첨 — 시드 스트림을 쓴다 (대결 모드에서 n번째 소환이 서로 같아야 한다).
 * banned 에 든 라인은 풀에서 빠진다 (대결 밴픽).
 * 두 사람의 밴 목록이 같으므로 뽑히는 순서도 그대로 같다.
 */
export function rollSummon(rng, banned) {
  const pool = banned?.length
    ? SUMMON_POOL.filter((e) => !banned.includes(lineOf(e.id)))
    : SUMMON_POOL;
  return rng.weighted(pool.length ? pool : SUMMON_POOL, (e) => e.weight);
}

/** 어떤 id 든 그 라인의 기본형 id 로 — 밴은 라인 단위다 */
export function lineOf(id) {
  for (const start of Object.keys(MONSTERS)) {
    if (MONSTERS[start].tier !== 1) continue;
    let cur = start;
    while (cur) {
      if (cur === id) return start;
      cur = (MONSTERS[cur].evolvesTo || [])[0];
    }
  }
  return id;
}

/** 밴 후보 — 기본형 14종 */
export const LINE_HEADS = Object.keys(MONSTERS).filter((id) => MONSTERS[id].tier === 1);

/**
 * 이로치(색이 다른 포켓몬) 기본 확률.
 * 원작의 1/4096 은 이 게임 한 판(볼 20~40회)에서 평생 못 보는 값이라,
 * "한 판에 한 번쯤 나오면 기억에 남는" 선까지 끌어올렸다.
 */
export const SHINY_CHANCE = 1 / 220;

/**
 * 볼을 던진다. 성공하면 { id, grade, shiny } 를 state.pending 에 올려두고,
 * 플레이어가 타일을 클릭해 배치한다. 배치 전에는 다시 소환할 수 없다.
 */
export function summon(state) {
  if (state.pending) return { ok: false, reason: '먼저 잡은 포켓몬을 배치하세요' };
  const cost = summonCost(state);
  if (state.bits < cost) return { ok: false, reason: `코인이 부족합니다 (${cost} 필요)` };

  state.bits -= cost;
  state.summons = (state.summons || 0) + 1;
  const e = rollSummon(state.rng.summon, state.bannedLines);
  // 이로치 판정도 시드 스트림을 쓴다 — 대결에서 둘의 운이 같아야 한다
  const luck = 1 + (state.mods?.shinyLuck || 0);
  const shiny = state.rng.summon.next() < SHINY_CHANCE * luck;

  state.pending = { id: e.id, grade: e.grade, paid: cost, shiny };
  state.pushLog(shiny
    ? `✨ 이로치 ${MONSTERS[e.id].name} 포획!`
    : `포획! — ${MONSTERS[e.id].name} (${GRADE[e.grade].name})`);
  return { ok: true, entry: e, cost, shiny };
}

/** 배치를 포기하고 절반만 돌려받는다 — 놓을 자리가 없을 때의 탈출구 */
export function releasePending(state) {
  if (!state.pending) return 0;
  const back = Math.floor(state.pending.paid * 0.5);
  state.bits += back;
  state.pending = null;
  return back;
}
