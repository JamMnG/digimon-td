// ─────────────────────────────────────────────────────────────
// evolutionTree.js — 진화 판정 (보고서 3.1, 최우선 시스템)
//
// 설계 의도: 진화 조건을 "비트 + 진화 아이템" 둘 다로 묶는다.
//  - 비트만이면 돈 쌓기 게임이 되고
//  - 아이템만이면 운 게임이 된다
// 아이템 공급량은 economyManager가 통제하므로, 진화 총량은 설계자가 쥐고
// "어디에 쓸지"만 플레이어가 결정하게 된다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { MONSTERS } from '../data/monsters.js';
import * as eco from '../economy/economyManager.js';

/** 다음 티어 진화 비용 — null이면 최종 진화체. state를 주면 증강 할인이 반영된다. */
export function evolveCost(fromId, state) {
  const from = MONSTERS[fromId];
  if (!from || from.evolvesTo.length === 0) return null;
  const base = BALANCE.evolve[from.tier + 1];
  if (!base) return null;
  const mult = 1 + (state?.mods?.evolveCostMult || 0);
  return { ...base, bits: Math.max(10, Math.round(base.bits * mult)) };
}

/** 진화 선택지 목록 + 각각의 가능 여부/사유 */
export function evolveOptions(state, tower) {
  const from = MONSTERS[tower.monsterId];
  const cost = evolveCost(tower.monsterId, state);
  if (!cost) return [];

  return from.evolvesTo.map((toId) => {
    const to = MONSTERS[toId];
    const lackBits = state.bits < cost.bits;
    const lackItem = !eco.hasItem(state, cost.item, cost.amount);
    return {
      toId,
      to,
      cost,
      ok: !lackBits && !lackItem,
      reason: lackBits ? '비트 부족' : lackItem ? `${eco.ITEM_NAME[cost.item]} 부족` : '',
      changes: describeChanges(from, to),
    };
  });
}

/** 진화 실행. 성공 시 true. */
export function evolve(state, tower, toId) {
  const from = MONSTERS[tower.monsterId];
  if (!from.evolvesTo.includes(toId)) return false;

  const cost = evolveCost(tower.monsterId, state);
  if (!cost) return false;
  if (state.bits < cost.bits) return false;
  if (!eco.hasItem(state, cost.item, cost.amount)) return false;

  eco.spend(state, cost.bits);
  eco.consumeItem(state, cost.item, cost.amount);

  tower.monsterId = toId;
  tower.def = MONSTERS[toId];
  tower.invested += cost.bits;
  tower.cd = 0;
  tower.salvoLeft = 0;

  state.fx({ type: 'evolve', x: tower.x, y: tower.y, color: tower.def.color, ttl: 0.85, t: 0.85 });
  state.pushLog(`${from.name} → ${tower.def.name} 진화!`);
  return true;
}

/** 매각 환급액 */
export function sellValue(tower, state) {
  const rate = Math.min(1, BALANCE.sellRefund + (state?.mods?.sellRefundAdd || 0));
  return Math.floor(tower.invested * rate);
}

// 진화 전후 변화 요약 — UI에서 "무엇이 좋아지는가"를 보여주기 위함
function describeChanges(from, to) {
  const out = [];
  const dps = (m) => m.atk * m.rate * (m.salvo || 1);
  const dFrom = dps(from), dTo = dps(to);
  out.push({ label: 'DPS', from: Math.round(dFrom), to: Math.round(dTo), better: dTo > dFrom });
  out.push({ label: '사거리', from: from.range, to: to.range, better: to.range > from.range });
  if (from.attr !== to.attr) out.push({ label: '속성', from: from.attr, to: to.attr, special: true });
  if (from.field !== to.field) out.push({ label: '종족', from: from.field, to: to.field, special: true });
  return out;
}

/** 전체 진화 트리를 라인별로 반환 (도감 UI용) */
export function buildTreeView(starters) {
  return starters.map((rootId) => {
    const walk = (id) => ({
      id,
      def: MONSTERS[id],
      children: MONSTERS[id].evolvesTo.map(walk),
    });
    return walk(rootId);
  });
}
