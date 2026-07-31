// ─────────────────────────────────────────────────────────────
// augments.js — 증강 (판 단위 강화)
//
// 지정된 웨이브에 도달하면 3개 중 1개를 고른다. 리롤은 판당 2회.
// 각 증강은 "무엇을 얼마나 바꾸는가"를 mods 한 덩어리로만 표현하고,
// 실제 적용은 각 시스템(combat/economy/evolution)이 mods를 읽어서 한다.
// → 증강을 추가할 때 시스템 코드를 건드릴 일이 없다.
//
// instant: 고르는 즉시 상태를 바꾸는 것(라이프·아이템 등)
// ─────────────────────────────────────────────────────────────
import { FIELD } from '../data/monsters.js';

export const TIER = {
  silver: { id: 'silver', name: '실버', color: '#c7d0dd', weight: 5 },
  gold:   { id: 'gold',   name: '골드', color: '#ffd166', weight: 3 },
  prism:  { id: 'prism',  name: '프리즘', color: '#b9a2ff', weight: 1.4 },
};

/** 증강을 제안하는 웨이브 */
export const OFFER_WAVES = [3, 8, 15, 22, 30];
export const REROLLS = 2;

const fieldName = (f) => FIELD[f].name;

export const AUGMENTS = [
  // ── 전투 (실버) ──
  { id: 'sharp_claw', tier: 'silver', name: '예리한 발톱', icon: '⚔',
    desc: '모든 디지몬의 공격력 +18%', mods: { atkMult: 0.18 } },
  { id: 'quick_step', tier: 'silver', name: '민첩한 발놀림', icon: '⚡',
    desc: '모든 디지몬의 공격 속도 +18%', mods: { rateMult: 0.18 } },
  { id: 'far_sight', tier: 'silver', name: '원시', icon: '👁',
    desc: '모든 디지몬의 사거리 +15%', mods: { rangeMult: 0.15 } },
  { id: 'weak_point', tier: 'silver', name: '급소', icon: '✦',
    desc: '치명타 확률 +12%p', mods: { critAdd: 0.12 } },
  { id: 'wide_blast', tier: 'silver', name: '광역 증폭', icon: '◎',
    desc: '광역 반경 +30%, 관통 +1', mods: { splashMult: 0.30, pierceAdd: 1 } },

  // ── 경제 (실버) ──
  { id: 'bit_flow', tier: 'silver', name: '비트 순환', icon: '◈',
    desc: '웨이브 클리어 보상 +50%', mods: { waveClearMult: 0.50 } },
  { id: 'scavenge', tier: 'silver', name: '회수', icon: '♻',
    desc: '매각 시 투자한 비트를 100% 돌려받는다', mods: { sellRefundAdd: 0.4 } },
  { id: 'bargain', tier: 'silver', name: '흥정', icon: '🏷',
    desc: '교환소 가격 -30%', mods: { exchangeMult: -0.30 } },
  { id: 'starter_kit', tier: 'silver', name: '스타터 키트', icon: '🎒',
    desc: '즉시 비트 +250, 진화칩 +2', instant: { bits: 250, chips: 2 } },

  // ── 종족 특화 (골드) ──
  { id: 'dragon_soul', tier: 'gold', name: '용의 혼', icon: '🜂',
    desc: `${fieldName('DRAGON')} 공격력 +45%`, mods: { fieldAtk: { DRAGON: 0.45 } } },
  { id: 'beast_fang', tier: 'gold', name: '야수의 송곳니', icon: '🜃',
    desc: `${fieldName('BEAST')} 공격 속도 +40%, 둔화 +15%p`,
    mods: { fieldRate: { BEAST: 0.40 }, slowAdd: 0.15 } },
  { id: 'holy_ward', tier: 'gold', name: '성역', icon: '🜁',
    desc: `${fieldName('ANGEL')} 사거리 +35%`, mods: { fieldRange: { ANGEL: 0.35 } } },
  { id: 'dark_pact', tier: 'gold', name: '어둠의 계약', icon: '🜄',
    desc: `${fieldName('DEMON')} 치명타 +25%p`, mods: { fieldCrit: { DEMON: 0.25 } } },
  { id: 'overdrive', tier: 'gold', name: '오버드라이브', icon: '⚙',
    desc: `${fieldName('MACHINE')} 광역·관통 +60%`, mods: { fieldSplash: { MACHINE: 0.60 } } },

  // ── 진화 / 시너지 (골드) ──
  { id: 'fast_evolve', tier: 'gold', name: '진화 촉진', icon: '🧬',
    desc: '진화 비용 -30%', mods: { evolveCostMult: -0.30 } },
  { id: 'cheap_rookie', tier: 'gold', name: '대량 부화', icon: '🥚',
    desc: '성장기 배치 비용 -45%', mods: { towerCostMult: -0.45 } },
  { id: 'pack_bond', tier: 'gold', name: '무리 본능', icon: '🤝',
    desc: '시너지 발동 조건 1체 감소 (2체 → 1체)', mods: { synergyThresholdDelta: -1 } },
  { id: 'deep_bond', tier: 'gold', name: '깊은 유대', icon: '💠',
    desc: '시너지 효과 +70%', mods: { synergyValueMult: 0.70 } },
  { id: 'chip_supply', tier: 'gold', name: '보급선', icon: '🔹',
    desc: '웨이브마다 진화칩 +1, 정예 드랍 확률 2배',
    mods: { chipPerWave: 1, eliteDropMult: 1 } },

  // ── 프리즘 ──
  { id: 'type_master', tier: 'prism', name: '상성 지배', icon: '🔺',
    desc: '유리 상성 ×1.5 → ×2.1, 불리 ×0.6 → ×0.9',
    mods: { strongAdd: 0.6, weakAdd: 0.3 } },
  { id: 'jogress_core', tier: 'prism', name: '죠그레스 촉매', icon: '◈',
    desc: '죠그레스 디지코어 요구 −1, 비용 −30%',
    mods: { jogressCoreDelta: -1, jogressCostMult: -0.30 } },
  { id: 'glass_cannon', tier: 'prism', name: '유리 대포', icon: '💥',
    desc: '공격력 +55%. 대신 라이프 −5',
    mods: { atkMult: 0.55 }, instant: { life: -5 } },
  { id: 'digicore_vein', tier: 'prism', name: '디지코어 광맥', icon: '🔶',
    desc: '즉시 디지코어 +2, 진화디스크 +2', instant: { cores: 2, disks: 2 } },
  { id: 'fortress', tier: 'prism', name: '요새화', icon: '🛡',
    desc: '라이프 +10, 누출 피해 −1', instant: { life: 10 }, mods: { leakReduce: 1 } },
];

const byId = new Map(AUGMENTS.map((a) => [a.id, a]));
export const augmentById = (id) => byId.get(id);

/** 소지한 증강 id[] → 합산된 mods */
export function computeMods(ownedIds) {
  const m = {
    atkMult: 0, rateMult: 0, rangeMult: 0, splashMult: 0, critAdd: 0,
    pierceAdd: 0, slowAdd: 0,
    fieldAtk: {}, fieldRate: {}, fieldRange: {}, fieldSplash: {}, fieldCrit: {},
    strongAdd: 0, weakAdd: 0,
    waveClearMult: 0, exchangeMult: 0, sellRefundAdd: 0,
    evolveCostMult: 0, towerCostMult: 0, jogressCostMult: 0, jogressCoreDelta: 0,
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

/** 즉시 효과 적용 */
export function applyInstant(state, augment) {
  const i = augment.instant;
  if (!i) return;
  if (i.bits) state.bits += i.bits;
  if (i.life) {
    state.life = Math.max(1, state.life + i.life);
    if (i.life > 0) state.maxLife += i.life;
  }
  for (const k of ['chips', 'disks', 'cores']) {
    if (i[k]) state.items[k] = (state.items[k] || 0) + i[k];
  }
}

/**
 * 3개 제안. 이미 가진 증강은 빼고, 등급 가중치로 뽑는다.
 * 같은 제안 안에서 중복되지 않게 하나씩 소거하며 뽑는다.
 */
export function rollOffer(ownedIds, count = 3) {
  const pool = AUGMENTS.filter((a) => !ownedIds.includes(a.id));
  const picked = [];
  const rest = [...pool];
  while (picked.length < count && rest.length) {
    const total = rest.reduce((s, a) => s + TIER[a.tier].weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < rest.length; i++) {
      r -= TIER[rest[i].tier].weight;
      if (r <= 0) { idx = i; break; }
    }
    picked.push(rest.splice(idx, 1)[0]);
  }
  return picked;
}
