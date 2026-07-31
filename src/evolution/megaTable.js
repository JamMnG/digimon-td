// ─────────────────────────────────────────────────────────────
// megaTable.js — 메가진화 조합표 + 판정
//
// 설계 의도:
//  원작에서 메가진화는 트레이너와의 유대(키즈나)로 발동한다.
//  이 게임에는 트레이너가 필드에 없으므로, 그 자리를 "인접한 동료와의 유대"가 대신한다.
//  → 인접한 최종진화(T3) 2기 + 메가스톤으로 메가 1기를 만든다.
//
//  슬롯 2칸 → 1칸이므로 "화력 밀도 vs 진영 커버리지"가 매 배치의 선택이 된다.
//
//  리자몽만 파트너에 따라 X / Y 로 갈린다 — 원작에서 메가진화가 두 종류인
//  포켓몬이 리자몽뿐이기 때문이다. 나머지는 1:1 대응.
//  메가진화가 원작에 없는 종(망나뇽·엠보아·괴력몬 등)은 파트너로만 참여한다.
//
// 조합표는 IP 격리 대상이 아니다(결과 id만 참조). 이름·색은 data/monsters.js에 있다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { MONSTERS } from '../data/monsters.js';
import * as eco from '../economy/economyManager.js';
import { dexMark, DEX_CAUGHT, DEX_GROWN, DEX_SHINY } from '../core/save.js';

export const MEGA = [
  {
    result: 'mega_charizard_x', base: 'charizard', partner: 'gengar',
    note: '그림자의 힘이 불꽃을 푸르게 물들인다. 관통 5 + 치명타로 어디서나 강하다.',
  },
  {
    result: 'mega_charizard_y', base: 'charizard', partner: 'dragonite',
    note: '두 마리가 함께 날아오르며 하늘을 태운다. 폭발 반경 66 — 최대 광역.',
  },
  {
    result: 'mega_garchomp', base: 'garchomp', partner: 'emboar',
    note: '대지의 열기가 팔을 낫으로 바꾼다. 단일 대상 DPS 최상위.',
  },
  {
    result: 'mega_venusaur', base: 'venusaur', partner: 'machamp',
    note: '괴력몬이 등의 꽃봉오리를 억지로 벌린다. 광역 62 + 둔화 42%로 판 전체를 느리게 만든다.',
  },
  {
    result: 'mega_alakazam', base: 'alakazam', partner: 'togekiss',
    note: '스푼이 다섯으로 늘어난다. 사거리 268 — 맵 대부분이 사정권.',
  },
  {
    result: 'mega_gardevoir', base: 'gardevoir', partner: 'venusaur',
    note: '자연의 기운을 받아 둔화가 50%까지 오른다. 최상위 지원.',
  },
  {
    result: 'mega_gengar', base: 'gengar', partner: 'chandelure',
    note: '고스트끼리의 공명. 방어 무시 + 처형 — 보스 킬러.',
  },
  {
    result: 'mega_metagross', base: 'metagross', partner: 'magnezone',
    note: '강철끼리 결합해 팔이 여덟. 관통 8로 직선 구간을 한 발에 정리한다.',
  },
];

const pairKey = (a, b) => (a < b ? `${a}+${b}` : `${b}+${a}`);
const TABLE = new Map(MEGA.map((r) => [pairKey(r.base, r.partner), r]));

/** 두 몬스터 id의 조합 레시피 (순서 무관). 없으면 null */
export function findRecipe(idA, idB) {
  return TABLE.get(pairKey(idA, idB)) || null;
}

/** 해당 몬스터가 참여하는 모든 조합 (베이스로든 파트너로든) */
export function recipesFor(id) {
  return MEGA.filter((r) => r.base === id || r.partner === id);
}

/** 레시피에서 상대편 id */
export function otherPart(recipe, id) {
  return recipe.base === id ? recipe.partner : recipe.base;
}

/**
 * 이 조합에서 메가진화하는 쪽이 나인가.
 * 파트너 쪽을 선택한 상태로도 실행할 수 있어야 하지만, 결과물은 항상 베이스의 메가폼이다.
 */
export const isBase = (recipe, id) => recipe.base === id;

/** 직교 4방향 인접 판정 — 대각선은 인정하지 않는다(붙여 짓기를 실제 계획으로 만들기 위함) */
export function isAdjacent(a, b) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
}

/** 메가진화 비용. state를 주면 증강(메가스톤 공명)이 반영된다. */
export function megaCost(state) {
  const b = BALANCE.mega;
  const m = state?.mods;
  return {
    ...b,
    bits: Math.max(10, Math.round(b.bits * (1 + (m?.megaCostMult || 0)))),
    amount: Math.max(1, b.amount + (m?.megaStoneDelta || 0)),
  };
}

/**
 * 선택한 타워 기준 메가진화 현황.
 * 참여 가능한 모든 조합을 상태와 함께 돌려준다 — 지금 못 하는 조합도
 * "무엇이 부족한지"를 보여줘야 다음 배치를 계획할 수 있다.
 *
 * status: 'ready'(즉시 가능) | 'cost'(자원 부족) | 'far'(파트너가 인접하지 않음)
 *       | 'missing'(파트너가 필드에 없음)
 */
export function megaOptions(state, tower) {
  const cost = megaCost(state);
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
      reason = lackBits ? '코인 부족' : `${eco.ITEM_NAME[cost.item]} 부족`;
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
 * 메가진화 실행. 결과물은 항상 베이스의 메가폼이고, 남는 타일은 keep 쪽이다.
 * (파트너를 선택한 상태에서 실행해도 결과 종은 같고, 자리만 파트너 타일이 된다)
 */
export function megaEvolve(state, keep, consume) {
  if (!keep || !consume || keep === consume) return false;
  const recipe = findRecipe(keep.monsterId, consume.monsterId);
  if (!recipe) return false;
  if (!isAdjacent(keep, consume)) return false;

  const cost = megaCost(state);
  if (state.bits < cost.bits) return false;
  if (!eco.hasItem(state, cost.item, cost.amount)) return false;

  eco.spend(state, cost.bits);
  eco.consumeItem(state, cost.item, cost.amount);

  const fromNames = [keep.def.name, consume.def.name];
  const invested = keep.invested + consume.invested + cost.bits;
  const fx = { x1: keep.x, y1: keep.y, x2: consume.x, y2: consume.y };

  state.removeTower(consume);

  if (!state.noSave) dexMark(recipe.result, DEX_CAUGHT | DEX_GROWN | (keep.shiny ? DEX_SHINY : 0));
  keep.monsterId = recipe.result;
  keep.def = MONSTERS[recipe.result];
  keep.invested = invested;
  keep.cd = 0;
  keep.salvoLeft = 0;
  keep.salvoTarget = null;
  state.selectedTowerUid = keep.uid;

  state.fx({
    type: 'mega', x: keep.x, y: keep.y, ...fx,
    color: keep.def.color, ttl: 1.1, t: 1.1,
  });
  state.pushLog(`${fromNames[0]} + ${fromNames[1]} → ${keep.def.name} 메가진화!`);
  return true;
}

/** 캔버스 연결선용 — 선택 타워와 즉시 메가진화 가능한 인접 파트너 목록 */
export function readyPartners(state, tower) {
  if (!tower) return [];
  return megaOptions(state, tower)
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
export function validateMegaData() {
  const errors = [];
  const seen = new Set();
  const covered = new Set();

  for (const r of MEGA) {
    const to = MONSTERS[r.result];
    if (!to) { errors.push(`메가 결과 '${r.result}' 없음`); continue; }
    if (to.tier !== 4) errors.push(`${r.result}: 메가는 T4여야 함 (현재 T${to.tier})`);
    if (!to.mega) errors.push(`${r.result}: mega:true 플래그 없음`);

    const k = pairKey(r.base, r.partner);
    if (seen.has(k)) errors.push(`조합 중복: ${k}`);
    seen.add(k);

    for (const p of [r.base, r.partner]) {
      const m = MONSTERS[p];
      if (!m) { errors.push(`${r.result}: 없는 파츠 '${p}'`); continue; }
      if (m.tier !== 3) errors.push(`${r.result}: 파츠 ${p}는 최종진화(T3)여야 함 (현재 T${m.tier})`);
      covered.add(p);
    }
    if (r.base === r.partner) errors.push(`${r.result}: 같은 종 2기 조합은 허용하지 않음`);
  }

  // 모든 최종진화형이 최소 한 조합에는 참여해야 한다.
  // 안 그러면 그 라인을 키운 플레이어에게 메가 경로가 없다.
  for (const [id, m] of Object.entries(MONSTERS)) {
    if (m.tier === 3 && !covered.has(id)) errors.push(`${id}: 어떤 메가 조합에도 참여하지 않음`);
  }

  // 진화 트리로는 메가에 도달할 수 없어야 한다
  for (const [id, m] of Object.entries(MONSTERS)) {
    for (const next of m.evolvesTo || []) {
      if (MONSTERS[next]?.mega) errors.push(`${id} → ${next}: 메가는 일반 진화로 도달할 수 없어야 함`);
    }
  }
  return errors;
}
