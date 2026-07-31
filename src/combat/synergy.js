// ─────────────────────────────────────────────────────────────
// synergy.js — 타입 시너지
// 필드에 배치된 포켓몬의 타입 수를 세어 2체/4체 보너스를 부여한다.
// 같은 타입을 모을수록 강해지므로, 볼에서 무엇이 나왔는지가
// "어느 라인을 키울까"와 바로 얽힌다.
// ─────────────────────────────────────────────────────────────
import { FIELD } from '../data/monsters.js';

// 각 타입: 임계치별 효과. 값은 배율 가산(0.12 = +12%) 또는 절대 가산.
export const SYNERGY_DEFS = {
  SWARM: { stat: 'atk',    label: '공격력',      steps: [[2, 0.12], [4, 0.30]], kind: 'mult' },
  COACH: { stat: 'rate',   label: '공격 속도',   steps: [[2, 0.12], [4, 0.28]], kind: 'mult' },
  FOCUS: { stat: 'range',  label: '사거리',      steps: [[2, 0.10], [4, 0.22]], kind: 'mult' },
  LONE:  { stat: 'crit',   label: '치명타 확률', steps: [[2, 0.08], [4, 0.18]], kind: 'add' },
  LINK:  { stat: 'splash', label: '광역·관통',   steps: [[2, 0.15], [4, 0.34]], kind: 'mult' },
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

/** 특정 포켓몬에 적용될 시너지 값 (해당 타입의 활성 보너스만) */
export function bonusFor(synergy, tower, stat) {
  const s = synergy[tower.def.field];
  if (!s || s.threshold === 0) return 0;
  return SYNERGY_DEFS[tower.def.field].stat === stat ? s.value : 0;
}
