// ─────────────────────────────────────────────────────────────
// props.js — 디지멘탈 / 설치물 (보조 심볼)
//
// 참고작(Luck be a Landlord)의 핵심은 "혼자서는 아무 값어치가 없고,
// 무엇 옆에 놓느냐로만 값이 생기는 심볼"이다. 그걸 그대로 가져왔다.
// 디지멘탈은 공격하지 않는다. 오직 인접한 디지몬을 강화하거나 비트를 만든다.
//
// 타워와 같은 그리드 슬롯을 먹기 때문에 "화력 한 칸 vs 강화 한 칸"이
// 매 배치마다 실제 선택이 된다.
//
// tier 0 / atk 0 이면 전투 시스템이 건너뛴다.
// ─────────────────────────────────────────────────────────────

export const PROPS = {
  courage: {
    name: '용기의 디지멘탈', short: '용기', tier: 0, atk: 0, prop: true,
    icon: '🔥', color: '#ff8c42', cost: 130,
    aura: { atk: 0.20 },
    desc: '인접한 디지몬 8칸의 공격력 +20%.',
  },
  friendship: {
    name: '우정의 디지멘탈', short: '우정', tier: 0, atk: 0, prop: true,
    icon: '💠', color: '#4fc3f7', cost: 130,
    aura: { rate: 0.18 },
    desc: '인접한 디지몬 8칸의 공격 속도 +18%.',
  },
  knowledge: {
    name: '지식의 디지멘탈', short: '지식', tier: 0, atk: 0, prop: true,
    icon: '📗', color: '#6ddf9c', cost: 140,
    aura: { range: 0.22 },
    desc: '인접한 디지몬 8칸의 사거리 +22%.',
  },
  love: {
    name: '사랑의 디지멘탈', short: '사랑', tier: 0, atk: 0, prop: true,
    icon: '💗', color: '#ff8fb1', cost: 165,
    aura: { crit: 0.10 },
    desc: '인접한 디지몬 8칸의 치명타 +10%p.',
  },
  reliability: {
    name: '성실의 디지멘탈', short: '성실', tier: 0, atk: 0, prop: true,
    icon: '⬢', color: '#b9c4dd', cost: 175,
    aura: { splash: 0.25 },
    desc: '인접한 디지몬 8칸의 광역 반경·관통 +25%.',
  },

  // ── 경제 심볼 — 화력을 포기하고 칸을 돈으로 바꾼다 ──
  recovery: {
    name: '리커버리 디스크', short: '디스크', tier: 0, atk: 0, prop: true,
    icon: '💾', color: '#ffd166', cost: 200,
    income: 30,
    desc: '웨이브를 클리어할 때마다 비트 +30. 인접과 무관.',
  },
  harddisk: {
    name: '대용량 하드', short: '하드', tier: 0, atk: 0, prop: true,
    icon: '🗄', color: '#e0a030', cost: 260,
    incomePerProp: 22,
    desc: '웨이브 클리어 시 인접한 설치물 1개당 비트 +22. 설치물끼리 붙여야 값이 나온다.',
  },
};

export const PROP_IDS = Object.keys(PROPS);
export const isProp = (def) => !!(def && def.prop);
