// ─────────────────────────────────────────────────────────────
// jogressTable.js — 죠그레스(합체 진화) 조합표 + 판정 (보고서 3.3)
//
// 설계 의도:
//  - 인접한 완전체(T3) 2기를 지정 조합으로 합쳐 죠그레스체(T4 특수) 1기를 만든다.
//  - 슬롯 2칸 → 1칸이므로 "화력 밀도 vs 진영 커버리지" 트레이드오프가 생긴다.
//  - 조합은 8종으로 상한을 고정. 완전체 8종이 각각 정확히 2개 조합에 참여하므로
//    어느 갈래로 진화하든 죠그레스 선택지가 2개씩 남는다.
//
// 조합표는 IP 격리 대상이 아니다(결과 id만 참조). 이름·색은 data/monsters.js에 있다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { MONSTERS } from '../data/monsters.js';
import * as eco from '../economy/economyManager.js';

export const JOGRESS = [
  {
    result: 'omnimon', parts: ['metalgreymon', 'weregarurumon'],
    note: '정통 라인끼리의 합체. 가장 무난하고 어디에 놔도 강하다.',
  },
  {
    result: 'omnimon_zwart', parts: ['skullgreymon', 'blackweregarurumon'],
    note: '분기 라인끼리의 합체. 극단적 한 방 + 처형으로 보스를 녹인다.',
  },
  {
    result: 'shakkoumon', parts: ['metalgreymon', 'holyangemon'],
    note: '기계 + 천사. 사거리와 광역 반경을 동시에 최대치로 끌어올린다.',
  },
  {
    result: 'lordknightmon', parts: ['slashangemon', 'blackweregarurumon'],
    note: '근접 화력끼리의 합체. 사거리를 버리고 순간 폭딜을 얻는다.',
  },
  {
    result: 'lucemon_fm', parts: ['skullsatamon', 'wizardmon'],
    note: '마인형 라인 내부 합체. 최대 폭발 반경 + 방어 무시.',
  },
  {
    result: 'chaosmon', parts: ['skullgreymon', 'holyangemon'],
    note: '빛과 어둠의 억지 융합. 관통·방어무시·처형을 전부 가진다.',
  },
  {
    result: 'sakuyamon', parts: ['slashangemon', 'wizardmon'],
    note: '제어 특화 합체. 광역 둔화로 다른 타워 전체의 딜 시간을 늘린다.',
  },
  {
    result: 'justimon', parts: ['weregarurumon', 'skullsatamon'],
    note: '사이보그 합체. 사거리 330으로 맵 대부분을 사정권에 넣는다.',
  },
];

const pairKey = (a, b) => (a < b ? `${a}+${b}` : `${b}+${a}`);
const TABLE = new Map(JOGRESS.map((r) => [pairKey(r.parts[0], r.parts[1]), r]));

/** 두 몬스터 id의 조합 레시피 (순서 무관). 없으면 null */
export function findRecipe(idA, idB) {
  return TABLE.get(pairKey(idA, idB)) || null;
}

/** 해당 몬스터가 참여하는 모든 조합 */
export function recipesFor(id) {
  return JOGRESS.filter((r) => r.parts.includes(id));
}

/** 레시피에서 상대편 파츠 id */
export function otherPart(recipe, id) {
  return recipe.parts[0] === id ? recipe.parts[1] : recipe.parts[0];
}

/** 직교 4방향 인접 판정 — 대각선은 인정하지 않는다(붙여 짓기를 실제 계획으로 만들기 위함) */
export function isAdjacent(a, b) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
}

/** 죠그레스 비용. state를 주면 증강(죠그레스 촉매)이 반영된다. */
export function jogressCost(state) {
  const b = BALANCE.jogress;
  const m = state?.mods;
  return {
    ...b,
    bits: Math.max(10, Math.round(b.bits * (1 + (m?.jogressCostMult || 0)))),
    amount: Math.max(1, b.amount + (m?.jogressCoreDelta || 0)),
  };
}

/**
 * 선택한 타워 기준 죠그레스 현황.
 * 참여 가능한 모든 조합을 상태와 함께 돌려준다 — 지금 못 하는 조합도
 * "무엇이 부족한지"를 보여줘야 다음 배치를 계획할 수 있다.
 *
 * status: 'ready'(즉시 가능) | 'cost'(자원 부족) | 'far'(파트너가 인접하지 않음)
 *       | 'missing'(파트너가 필드에 없음)
 */
export function jogressOptions(state, tower) {
  const cost = jogressCost(state);
  const lackBits = state.bits < cost.bits;
  const lackItem = !eco.hasItem(state, cost.item, cost.amount);

  return recipesFor(tower.monsterId).map((recipe) => {
    const partnerId = otherPart(recipe, tower.monsterId);
    const to = MONSTERS[recipe.result];

    // 인접한 파트너를 우선 고르고, 없으면 필드 어딘가에 있는 파트너를 알려준다
    const onField = state.towers.filter((t) => t !== tower && t.monsterId === partnerId);
    const partner = onField.find((t) => isAdjacent(tower, t)) || null;

    let status, reason;
    if (!partner) {
      if (onField.length === 0) {
        status = 'missing';
        reason = `${MONSTERS[partnerId].name} 필요`;
      } else {
        status = 'far';
        reason = `${MONSTERS[partnerId].name}을(를) 상하좌우 인접 타일로`;
      }
    } else if (lackBits || lackItem) {
      status = 'cost';
      reason = lackBits ? '비트 부족' : `${eco.ITEM_NAME[cost.item]} 부족`;
    } else {
      status = 'ready';
      reason = '';
    }

    return {
      recipe, to, cost, partner, partnerId,
      partnerDef: MONSTERS[partnerId],
      status, reason,
      ok: status === 'ready',
      gain: describeGain(tower.def, MONSTERS[partnerId], to),
    };
  });
}

/**
 * 합체 실행. keep 타워가 결과물이 되고 consume 타워는 사라진다.
 * (어느 타일을 남길지는 플레이어가 "어느 쪽을 선택했는가"로 결정한다)
 */
export function jogress(state, keep, consume) {
  if (!keep || !consume || keep === consume) return false;
  const recipe = findRecipe(keep.monsterId, consume.monsterId);
  if (!recipe) return false;
  if (!isAdjacent(keep, consume)) return false;

  const cost = jogressCost(state);
  if (state.bits < cost.bits) return false;
  if (!eco.hasItem(state, cost.item, cost.amount)) return false;

  eco.spend(state, cost.bits);
  eco.consumeItem(state, cost.item, cost.amount);

  const fromNames = [keep.def.name, consume.def.name];
  const invested = keep.invested + consume.invested + cost.bits;
  const fx = { x1: keep.x, y1: keep.y, x2: consume.x, y2: consume.y };

  state.removeTower(consume);

  keep.monsterId = recipe.result;
  keep.def = MONSTERS[recipe.result];
  keep.invested = invested;
  keep.cd = 0;
  keep.salvoLeft = 0;
  keep.salvoTarget = null;
  state.selectedTowerUid = keep.uid;

  state.fx({
    type: 'jogress', x: keep.x, y: keep.y, ...fx,
    color: keep.def.color, ttl: 1.1, t: 1.1,
  });
  state.pushLog(`${fromNames[0]} + ${fromNames[1]} → ${keep.def.name} 죠그레스!`);
  return true;
}

/** 캔버스 연결선용 — 선택 타워와 즉시 합체 가능한 인접 파트너 목록 */
export function readyPartners(state, tower) {
  if (!tower) return [];
  return jogressOptions(state, tower)
    .filter((o) => o.partner)
    .map((o) => ({ partner: o.partner, ok: o.ok, to: o.to }));
}

// 합체 전 2기 합계 대비 결과 1기의 변화 — "2칸을 1칸으로 줄일 값어치가 있는가"
function describeGain(a, b, to) {
  const dps = (m) => m.atk * m.rate * (m.salvo || 1);
  const before = dps(a) + dps(b);
  const after = dps(to);
  return {
    dpsBefore: Math.round(before),
    dpsAfter: Math.round(after),
    rangeBefore: Math.max(a.range, b.range),
    rangeAfter: to.range,
    ratio: after / before,
  };
}

/** 데이터 무결성 체크 (개발용) */
export function validateJogressData() {
  const errors = [];
  const seen = new Set();
  for (const r of JOGRESS) {
    const to = MONSTERS[r.result];
    if (!to) { errors.push(`죠그레스 결과 '${r.result}' 없음`); continue; }
    if (to.tier !== 4) errors.push(`${r.result}: 죠그레스체는 T4여야 함 (현재 T${to.tier})`);
    if (!to.jogress) errors.push(`${r.result}: jogress:true 플래그 없음`);

    const k = pairKey(r.parts[0], r.parts[1]);
    if (seen.has(k)) errors.push(`조합 중복: ${k}`);
    seen.add(k);

    for (const p of r.parts) {
      const m = MONSTERS[p];
      if (!m) { errors.push(`${r.result}: 없는 파츠 '${p}'`); continue; }
      if (m.tier !== 3) errors.push(`${r.result}: 파츠 ${p}는 완전체(T3)여야 함 (현재 T${m.tier})`);
    }
    if (r.parts[0] === r.parts[1]) errors.push(`${r.result}: 같은 몬스터 2기 조합은 허용하지 않음`);
  }

  // 진화 트리로는 죠그레스체에 도달할 수 없어야 한다
  for (const [id, m] of Object.entries(MONSTERS)) {
    for (const next of m.evolvesTo) {
      if (MONSTERS[next]?.jogress) errors.push(`${id} → ${next}: 죠그레스체는 진화로 도달할 수 없어야 함`);
    }
  }
  return errors;
}
