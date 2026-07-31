// ─────────────────────────────────────────────────────────────
// augments.js — 특성 (판 단위 강화)
//
// 지정된 웨이브에 도달하면 3개 중 1개를 고른다. 리롤은 판당 2회.
// 각 특성은 "무엇을 얼마나 바꾸는가"를 mods 한 덩어리로만 표현하고,
// 실제 적용은 각 시스템(combat/economy/evolution)이 mods를 읽어서 한다.
// → 특성을 추가할 때 시스템 코드를 건드릴 일이 없다.
//
// instant: 고르는 즉시 상태를 바꾸는 것(라이프·아이템 등)
//
// ── 티어 기준 (플레이 피드백 반영: "증강 티어가 안 맞는다") ─────
// 티어는 이름값이 아니라 **필드 전체 실효 DPS 증가율**로 매긴다.
//   실버  +12~20%   골드 +25~40%   프리즘 +50% 이상 또는 판의 규칙을 바꾸는 것
//
// 재배치한 것과 이유:
//  · 타입 특화(+45%)는 그 타입이 필드의 1/3 남짓이라 전체 환산 ~13%.
//    골드였지만 실버 '전체 +18%'보다 약했다 → 실버로 내리고 수치를 올림.
//  · 광역 증폭의 관통 +1 은 관통형 DPS를 25~50% 올린다 → 실버에서 골드로.
//  · 시너지 임계 -1 / 시너지 +70% 는 필드 전체에 곱으로 얹힌다 → 골드에서 프리즘으로.
//  · 즉시 지급은 후반에 받으면 값이 급락한다 → 프리즘에서 골드로 내리고,
//    코인 지급은 웨이브 비례로 바꿔 늦게 받아도 값이 유지되게 했다.
// ─────────────────────────────────────────────────────────────
import { FIELD } from '../data/monsters.js';

export const TIER = {
  silver: { id: 'silver', name: '실버', color: '#c7d0dd', weight: 5 },
  gold:   { id: 'gold',   name: '골드', color: '#ffd166', weight: 3 },
  prism:  { id: 'prism',  name: '프리즘', color: '#b9a2ff', weight: 1.4 },
};

/** 특성을 제안하는 웨이브 — 마지막 제안이 최종 웨이브와 겹치면 쓸 틈이 없다 */
export const OFFER_WAVES = [3, 8, 14, 20, 26];
export const REROLLS = 2;

const fieldName = (f) => FIELD[f].name;

export const AUGMENTS = [
  // ══ 실버 — 전체에 고르게 얹히는 기본 강화 (실효 +12~20%) ══
  { id: 'sharp_claw', tier: 'silver', name: '날카로운손톱', icon: '⚔',
    desc: '모든 포켓몬의 공격력 +18%', mods: { atkMult: 0.18 } },
  { id: 'quick_step', tier: 'silver', name: '스피드부스터', icon: '⚡',
    desc: '모든 포켓몬의 공격 속도 +18%', mods: { rateMult: 0.18 } },
  { id: 'far_sight', tier: 'silver', name: '망원렌즈', icon: '👁',
    desc: '모든 포켓몬의 사거리 +15%', mods: { rangeMult: 0.15 } },
  { id: 'weak_point', tier: 'silver', name: '급소찌르기', icon: '✦',
    desc: '치명타 확률 +16%p', mods: { critAdd: 0.16 } },

  // 배치 특성 특화 — 해당 특성이 필드의 1/3 남짓이라 전체 환산은 실버급이다
  { id: 'dragon_soul', tier: 'silver', name: '용의비늘', icon: '🔗',
    desc: `${fieldName('SWARM')} 특성 공격력 +50%`, mods: { fieldAtk: { SWARM: 0.50 } } },
  { id: 'beast_fang', tier: 'silver', name: '검은띠', icon: '💪',
    desc: `${fieldName('COACH')} 특성 공격 속도 +45%, 둔화 +15%p`,
    mods: { fieldRate: { COACH: 0.45 }, slowAdd: 0.15 } },
  { id: 'holy_ward', tier: 'silver', name: '이상한부적', icon: '🎯',
    desc: `${fieldName('FOCUS')} 특성 사거리 +40%`, mods: { fieldRange: { FOCUS: 0.40 } } },
  { id: 'dark_pact', tier: 'silver', name: '검은안경', icon: '🕯',
    desc: `${fieldName('LONE')} 특성 치명타 +28%p`, mods: { fieldCrit: { LONE: 0.28 } } },
  { id: 'overdrive', tier: 'silver', name: '금속코트', icon: '🧲',
    desc: `${fieldName('LINK')} 특성 광역·관통 +65%`, mods: { fieldSplash: { LINK: 0.65 } } },

  // 경제 (실버)
  { id: 'bit_flow', tier: 'silver', name: '부적금화', icon: '💰',
    desc: '웨이브 클리어 보상 +50%', mods: { waveClearMult: 0.50 } },
  { id: 'scavenge', tier: 'silver', name: '리사이클', icon: '♻',
    desc: '방생 시 투자한 코인을 100% 돌려받는다', mods: { sellRefundAdd: 0.4 } },
  { id: 'bargain', tier: 'silver', name: '단골할인', icon: '🏷',
    desc: '프렌들리샵 가격 -30%', mods: { exchangeMult: -0.30 } },

  // ══ 골드 — 전체 실효 +25~40%, 또는 자원 회전을 크게 바꾸는 것 ══
  { id: 'wide_blast', tier: 'gold', name: '광역화', icon: '◎',
    desc: '광역 반경 +35%, 관통 +1',
    mods: { splashMult: 0.35, pierceAdd: 1 } },
  { id: 'fast_evolve', tier: 'gold', name: '진화촉진제', icon: '🧬',
    desc: '진화 비용 -35%', mods: { evolveCostMult: -0.35 } },
  { id: 'cheap_rookie', tier: 'gold', name: '대량포획', icon: '🥎',
    desc: '몬스터볼·도구 값 -45%', mods: { towerCostMult: -0.45 } },
  { id: 'chip_supply', tier: 'gold', name: '보급루트', icon: '🍬',
    desc: '웨이브마다 이상한사탕 +1, 에이스 드랍 확률 2배',
    mods: { chipPerWave: 1, eliteDropMult: 1 } },
  { id: 'item_cache', tier: 'gold', name: '비밀기지', icon: '🎁',
    desc: '즉시 메가스톤 +2, 진화의돌 +2', instant: { cores: 2, disks: 2 } },
  { id: 'trainer_card', tier: 'gold', name: '트레이너카드', icon: '🎫',
    desc: '즉시 코인 +(현재 웨이브 ×90), 이상한사탕 +2',
    instant: { bitsPerWave: 90, chips: 2 } },

  // ══ 프리즘 — 판의 규칙 자체를 바꾸는 것 ══
  { id: 'pack_bond', tier: 'prism', name: '무리의결속', icon: '🤝',
    desc: '타입 시너지 발동 조건 1체 감소 (2체 → 1체)',
    mods: { synergyThresholdDelta: -1 } },
  { id: 'deep_bond', tier: 'prism', name: '깊은유대', icon: '💠',
    desc: '타입 시너지 효과 +70%', mods: { synergyValueMult: 0.70 } },
  { id: 'type_master', tier: 'prism', name: '타입마스터', icon: '🔺',
    desc: '유리 상성 ×1.5 → ×2.2, 불리 ×0.6 → ×0.95',
    mods: { strongAdd: 0.7, weakAdd: 0.35 } },
  { id: 'mega_stone', tier: 'prism', name: '키스톤', icon: '🔷',
    desc: '메가진화 메가스톤 요구 −1, 비용 −30%',
    mods: { megaStoneDelta: -1, megaCostMult: -0.30 } },
  { id: 'glass_cannon', tier: 'prism', name: '이판사판태클', icon: '💥',
    desc: '공격력 +55%. 대신 라이프 −5',
    mods: { atkMult: 0.55 }, instant: { life: -5 } },
  { id: 'mold_breaker', tier: 'prism', name: '틀깨기', icon: '🔨',
    desc: '모든 공격이 상대의 방어력을 무시한다', mods: { armorPierceAll: 1 } },
  { id: 'fortress', tier: 'prism', name: '리플렉터', icon: '🛡',
    desc: '라이프 +10, 누출 피해 −1', instant: { life: 10 }, mods: { leakReduce: 1 } },
];

const byId = new Map(AUGMENTS.map((a) => [a.id, a]));
export const augmentById = (id) => byId.get(id);

/** 소지한 특성 id[] → 합산된 mods */
export function computeMods(ownedIds) {
  const m = {
    atkMult: 0, rateMult: 0, rangeMult: 0, splashMult: 0, critAdd: 0,
    pierceAdd: 0, slowAdd: 0, armorPierceAll: 0,
    fieldAtk: {}, fieldRate: {}, fieldRange: {}, fieldSplash: {}, fieldCrit: {},
    strongAdd: 0, weakAdd: 0,
    waveClearMult: 0, exchangeMult: 0, sellRefundAdd: 0,
    evolveCostMult: 0, towerCostMult: 0, megaCostMult: 0, megaStoneDelta: 0,
    synergyThresholdDelta: 0, synergyValueMult: 0,
    chipPerWave: 0, eliteDropMult: 0, leakReduce: 0,
  };

  for (const id of ownedIds) {
    const a = byId.get(id);
    if (!a || !a.mods) continue;
    for (const [k, v] of Object.entries(a.mods)) {
      if (typeof v === 'number') m[k] = (m[k] || 0) + v;
      else for (const [f, fv] of Object.entries(v)) m[k][f] = (m[k][f] || 0) + fv;
    }
  }
  return m;
}

/**
 * 즉시 효과 적용.
 * bitsPerWave 는 "현재 웨이브 × n" 으로 지급한다 — 고정액이면 웨이브 26에
 * 받았을 때 사실상 꽝이 되어, 늦게 뜨는 즉시효과 특성이 리롤 대상이 되어버린다.
 */
export function applyInstant(state, augment) {
  const i = augment?.instant;
  if (!i) return;
  if (i.bits) state.bits += i.bits;
  if (i.bitsPerWave) state.bits += i.bitsPerWave * Math.max(1, state.wave);
  if (i.life) {
    state.life = Math.max(1, state.life + i.life);
    if (i.life > 0) state.maxLife += i.life;
  }
  for (const k of ['chips', 'disks', 'cores']) {
    if (i[k]) state.items[k] = (state.items[k] || 0) + i[k];
  }
}

/**
 * 3개 제안. 이미 가진 특성은 빼고, 등급 가중치로 뽑는다.
 * 같은 제안 안에서 중복되지 않게 하나씩 소거하며 뽑는다.
 */
export function rollOffer(ownedIds, rng, count = 3) {
  const pool = AUGMENTS.filter((a) => !ownedIds.includes(a.id));
  const picked = [];
  const rest = [...pool];
  while (picked.length < count && rest.length) {
    const a = rng.weighted(rest, (x) => TIER[x.tier].weight);
    rest.splice(rest.indexOf(a), 1);
    picked.push(a);
  }
  return picked;
}
