// ─────────────────────────────────────────────────────────────
// synergy.js — 종족 시너지 (보고서 3.4)
// 필드에 배치된 타워의 종족 수를 세어 2체/4체 보너스를 부여한다.
// 진화 분기로 종족이 바뀌는 몬스터가 있어(예: 메탈그레이몬 → 기계형)
// "어느 갈래로 진화할까"가 시너지 판단과 얽히게 만드는 게 목적.
// ─────────────────────────────────────────────────────────────
import { FIELD } from '../data/monsters.js';

// 각 종족: 임계치별 효과. 값은 배율 가산(0.12 = +12%) 또는 절대 가산.
export const SYNERGY_DEFS = {
  DRAGON:  { stat: 'atk',    label: '공격력',     steps: [[2, 0.12], [4, 0.30]], kind: 'mult' },
  BEAST:   { stat: 'rate',   label: '공격 속도',  steps: [[2, 0.12], [4, 0.28]], kind: 'mult' },
  ANGEL:   { stat: 'range',  label: '사거리',     steps: [[2, 0.10], [4, 0.22]], kind: 'mult' },
  DEMON:   { stat: 'crit',   label: '치명타 확률', steps: [[2, 0.08], [4, 0.18]], kind: 'add' },
  MACHINE: { stat: 'splash', label: '광역·관통',  steps: [[2, 0.15], [4, 0.34]], kind: 'mult' },
};

/** 배치된 타워 배열 → { FIELD_ID: { count, threshold, value, label } } */
export function computeSynergy(towers, mods) {
  const need = (n) => Math.max(1, n + (mods?.synergyThresholdDelta || 0));
  const boost = 1 + (mods?.synergyValueMult || 0);
  const counts = {};
  for (const t of towers) {
    const f = t.def.field;
    counts[f] = (counts[f] || 0) + 1;
  }

  const out = {};
  for (const [fieldId, count] of Object.entries(counts)) {
    const def = SYNERGY_DEFS[fieldId];
    if (!def) continue;
    let threshold = 0, value = 0;
    for (const [step, v] of def.steps) {
      if (count >= need(step)) { threshold = need(step); value = v * boost; }
    }
    out[fieldId] = {
      count, threshold, value,
      name: FIELD[fieldId].name,
      mark: FIELD[fieldId].mark,
      label: def.label,
      stat: def.stat,
      kind: def.kind,
      nextAt: def.steps.map(([s]) => need(s)).find((n) => count < n) ?? null,
    };
  }
  return out;
}

/** 특정 타워에 적용될 시너지 값 (해당 종족의 활성 보너스만) */
export function bonusFor(synergy, tower, stat) {
  const s = synergy[tower.def.field];
  if (!s || s.threshold === 0) return 0;
  return SYNERGY_DEFS[tower.def.field].stat === stat ? s.value : 0;
}
