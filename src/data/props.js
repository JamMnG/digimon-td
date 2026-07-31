// ─────────────────────────────────────────────────────────────
// props.js — 도구 (보조 심볼)
//
// 참고작(Luck be a Landlord)의 핵심은 "혼자서는 아무 값어치가 없고,
// 무엇 옆에 놓느냐로만 값이 생기는 심볼"이다. 그걸 그대로 가져왔다.
// 도구는 공격하지 않는다. 오직 인접한 포켓몬을 강화하거나 코인을 만든다.
//
// 포켓몬과 같은 그리드 슬롯을 먹기 때문에 "화력 한 칸 vs 강화 한 칸"이
// 매 배치마다 실제 선택이 된다.
//
// tier 0 / atk 0 이면 전투 시스템이 건너뛴다.
// ─────────────────────────────────────────────────────────────

export const PROPS = {
  // ── 능력 강화 도구 ──
  choiceband: {
    name: '구애머리띠', short: '머리띠', tier: 0, atk: 0, prop: true,
    icon: '🎀', color: '#e05a6a', cost: 130,
    aura: { atk: 0.20 },
    desc: '인접한 포켓몬 8칸의 공격력 +20%.',
  },
  choicescarf: {
    name: '구애스카프', short: '스카프', tier: 0, atk: 0, prop: true,
    icon: '🧣', color: '#4fc3f7', cost: 130,
    aura: { rate: 0.18 },
    desc: '인접한 포켓몬 8칸의 공격 속도 +18%.',
  },
  widelens: {
    name: '광각렌즈', short: '렌즈', tier: 0, atk: 0, prop: true,
    icon: '🔎', color: '#6ddf9c', cost: 140,
    aura: { range: 0.22 },
    desc: '인접한 포켓몬 8칸의 사거리 +22%.',
  },
  scopelens: {
    name: '초점렌즈', short: '초점', tier: 0, atk: 0, prop: true,
    icon: '🎯', color: '#ff8fb1', cost: 165,
    aura: { crit: 0.10 },
    desc: '인접한 포켓몬 8칸의 치명타 +10%p.',
  },
  expertbelt: {
    name: '달인의띠', short: '달인띠', tier: 0, atk: 0, prop: true,
    icon: '🥋', color: '#b9c4dd', cost: 175,
    aura: { splash: 0.25 },
    desc: '인접한 포켓몬 8칸의 광역 반경·관통 +25%.',
  },

  // ── 경제 도구 — 화력을 포기하고 칸을 돈으로 바꾼다 ──
  amuletcoin: {
    name: '부적금화', short: '금화', tier: 0, atk: 0, prop: true,
    icon: '💰', color: '#ffd166', cost: 200,
    income: 30,
    desc: '웨이브 클리어마다 코인 +30. 어디에 놓든 같다 — 자리가 애매할 때의 기본값.',
  },
  luckyegg: {
    name: '행복의알', short: '행복알', tier: 0, atk: 0, prop: true,
    icon: '🥚', color: '#e0a030', cost: 260,
    incomePerProp: 22,
    // "금화 4개=120인데 행복알 4개는 22×4=88 아니냐"는 오해가 있었다.
    // 알끼리 2×2로 붙이면 각자 이웃 3개를 보므로 66×4=264 — 두 배 넘게 낫다.
    // 규칙이 아니라 설명이 문제였으므로 숫자를 직접 적어 둔다.
    desc: '웨이브 클리어마다 인접한 도구 1개당 코인 +22. '
      + '2×2로 네 개를 붙이면 서로 이웃 3개씩이라 판당 264 — 금화 4개(120)의 두 배가 넘는다.',
  },
};

export const PROP_IDS = Object.keys(PROPS);
export const isProp = (def) => !!(def && def.prop);
