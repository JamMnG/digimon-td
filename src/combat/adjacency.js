// ─────────────────────────────────────────────────────────────
// adjacency.js — 8방향 인접 효과 (참고작 Luck be a Landlord의 핵심 이식)
//
// 기존 타입 시너지(synergy.js)는 "필드 전체에 몇 기 있는가"만 본다.
// 여기서는 "무엇 옆에 놓았는가"를 본다. 둘은 겹치지 않고 함께 쌓인다.
//
// 배치 특성마다 규칙이 다르므로 배치가 곧 퍼즐이 된다:
//   무리 뭉칠수록 강해진다        → 한 덩어리로 몰아 놓기
//   고독 혼자일수록 강해진다      → 일부러 떼어 놓기
//   연결 같은 특성끼리 이어진다   → 줄로 잇기
//   단련/집중 이웃을 강화한다     → 지원 배치
// 도구는 오직 이 계층을 통해서만 값을 낸다.
//
// 예전에는 이 축의 이름이 타입명(드래곤·격투·고스트…)이었는데,
// 원작 타입과 어긋나 보여서 규칙 자체를 가리키는 이름으로 바꿨다.
//
// 반환: { [uid]: { atk, rate, range, splash, crit, notes: [문자열] } }
// ─────────────────────────────────────────────────────────────
import { tileKey } from '../grid/pathGrid.js';
import { isProp } from '../data/props.js';

const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/** 종족별 인접 규칙 — UI가 그대로 읽어서 보여준다 */
export const ADJ_RULES = {
  SWARM: {
    label: '무리', kind: 'self',
    text: '인접한 아군 1기당 공격력 +9%',
    short: '뭉칠수록 강함',
  },
  COACH: {
    label: '단련', kind: 'give',
    text: '인접한 아군에게 공격 속도 +7% 부여',
    short: '이웃 강화',
  },
  FOCUS: {
    label: '집중', kind: 'give',
    text: '인접한 아군에게 사거리 +6% 부여',
    short: '이웃 강화',
  },
  LONE: {
    label: '고독', kind: 'self',
    text: '인접한 빈 풀숲 1칸당 공격력 +11%',
    short: '떨어질수록 강함',
  },
  LINK: {
    label: '연결', kind: 'self',
    text: '인접한 연결 1기당 광역·관통 +12%',
    short: '연결끼리 이어짐',
  },
};

const PER = { SWARM: 0.09, COACH: 0.07, FOCUS: 0.06, LONE: 0.11, LINK: 0.12 };

const blank = () => ({ atk: 0, rate: 0, range: 0, splash: 0, crit: 0, notes: [] });

/**
 * 필드 전체의 인접 보정을 한 번에 계산한다.
 * 프레임마다 돌지만 유닛 수가 수십 단위라 8칸 조회로 충분히 싸다.
 */
export function computeAdjacency(state) {
  const out = {};
  const at = new Map();                      // tileKey → 유닛
  for (const t of state.towers) at.set(tileKey(t.c, t.r), t);
  for (const t of state.towers) out[t.uid] = blank();

  const neighbors = (u) => {
    const list = [];
    for (const [dc, dr] of N8) {
      const n = at.get(tileKey(u.c + dc, u.r + dr));
      if (n) list.push(n);
    }
    return list;
  };

  for (const u of state.towers) {
    const near = neighbors(u);
    const self = out[u.uid];

    // ── 도구: 이웃 포켓몬에게만 값을 준다 ──
    if (isProp(u.def)) {
      if (!u.def.aura) continue;
      for (const n of near) {
        if (isProp(n.def)) continue;         // 도구끼리는 강화하지 않는다
        const to = out[n.uid];
        for (const [k, v] of Object.entries(u.def.aura)) to[k] += v;
        to.notes.push(`${u.def.short} 인접`);
      }
      continue;
    }

    // ── 포켓몬: 타입 규칙 ──
    const per = PER[u.def.field] || 0;
    switch (u.def.field) {
      case 'SWARM': {
        const n = near.length;
        if (n) { self.atk += per * n; self.notes.push(`${ADJ_RULES.SWARM.label} ×${n}`); }
        break;
      }
      case 'LONE': {
        // 인접 8칸 중 "놓을 수 있는데 비어 있는" 칸만 센다.
        // 길이나 맵 밖은 세지 않아야 구석에 박는 꼼수가 최적해가 되지 않는다.
        let empty = 0;
        for (const [dc, dr] of N8) {
          const k = tileKey(u.c + dc, u.r + dr);
          if (state.path.buildTiles.has(k) && !at.has(k)) empty++;
        }
        if (empty) { self.atk += per * empty; self.notes.push(`${ADJ_RULES.LONE.label} ×${empty}`); }
        break;
      }
      case 'LINK': {
        const n = near.filter((x) => !isProp(x.def) && x.def.field === 'LINK').length;
        if (n) { self.splash += per * n; self.notes.push(`${ADJ_RULES.LINK.label} ×${n}`); }
        break;
      }
      case 'COACH':
      case 'FOCUS': {
        const stat = u.def.field === 'COACH' ? 'rate' : 'range';
        for (const n of near) {
          if (isProp(n.def)) continue;
          out[n.uid][stat] += per;
          out[n.uid].notes.push(ADJ_RULES[u.def.field].label);
        }
        break;
      }
      default: break;
    }
  }

  return out;
}

export const NO_ADJ = blank();

/** 특정 유닛의 인접 보정 (없으면 0) */
export const adjFor = (state, uid) => (state.adjacency && state.adjacency[uid]) || NO_ADJ;

/** 캔버스 연결선용 — 이 유닛과 실제로 값을 주고받는 이웃 목록 */
export function adjacentLinks(state, unit) {
  if (!unit || !unit.def) return [];
  const at = new Map();
  for (const t of state.towers) at.set(tileKey(t.c, t.r), t);
  const out = [];
  for (const [dc, dr] of N8) {
    const n = at.get(tileKey(unit.c + dc, unit.r + dr));
    if (!n || !n.def) continue;
    const bothProps = isProp(unit.def) && isProp(n.def);
    const propHard = unit.def.incomePerProp || n.def.incomePerProp;
    if (bothProps && !propHard) continue;     // 서로 아무 값도 주지 않는 조합
    out.push(n);
  }
  return out;
}

/** 웨이브 클리어 시 도구가 만들어내는 코인 */
export function propIncome(state) {
  let total = 0;
  const at = new Map();
  for (const t of state.towers) at.set(tileKey(t.c, t.r), t);

  for (const u of state.towers) {
    if (!isProp(u.def)) continue;
    if (u.def.income) total += u.def.income;
    if (u.def.incomePerProp) {
      let n = 0;
      for (const [dc, dr] of N8) {
        const x = at.get(tileKey(u.c + dc, u.r + dr));
        if (x && isProp(x.def)) n++;
      }
      total += u.def.incomePerProp * n;
    }
  }
  return total;
}
