// ─────────────────────────────────────────────────────────────
// tutorial.js — 단계별 안내 (트레이닝 필드 전용)
//
// 각 단계는 "무엇을 설명하고, 무엇을 하면 넘어가는가"만 들고 있다.
//   focus  : 강조할 DOM 요소 선택자
//   tiles  : 캔버스에서 반짝일 타일 [c, r]
//   tab    : 자동으로 열어줄 사이드 탭
//   enter  : 단계 진입 시 1회 (자원 지급 / 상황 세팅)
//   check  : true가 되면 자동으로 다음 단계. 없으면 '다음' 버튼으로 진행.
//
// 게임 로직은 전혀 건드리지 않는다 — 오직 상태를 읽고, 필요한 자원만 얹어준다.
// 그래서 튜토리얼을 지워도 게임은 그대로 돌아간다.
// ─────────────────────────────────────────────────────────────
import { isProp } from '../data/props.js';
import { ADJ_RULES } from '../combat/adjacency.js';

const towersOnly = (state) => state.towers.filter((t) => !isProp(t.def));
const grant = (state, { bits = 0, chips = 0, disks = 0, cores = 0 }) => {
  state.bits += bits;
  state.items.chips += chips;
  state.items.disks += disks;
  state.items.cores += cores;
};

export const STEPS = [
  {
    id: 'welcome',
    title: '트레이닝 필드에 온 걸 환영합니다',
    text: '왼쪽에 서 있는 <b>교관</b>이 안내를 맡습니다. 적은 왼쪽에서 들어와 길을 따라 걸어 오른쪽 기지로 향합니다. '
      + '길 옆 풀숲에 포켓몬을 배치해 막으면 됩니다. 교관이 손으로 짚는 칸을 따라가면 됩니다. '
      + '건너뛰기로 언제든 나갈 수 있습니다.',
  },
  {
    id: 'place',
    title: '1. 배치',
    text: '포켓몬은 <b>몬스터볼</b>로 잡습니다. 무엇이 나올지는 무작위입니다. '
      + '몬스터볼을 던진 다음, 반짝이는 풀숲 칸을 클릭해 놓아보세요.',
    tab: 'build', focus: '.summon-panel', tiles: [[4, 4]],
    enter: (s) => grant(s, { bits: 0 }),
    check: (s) => towersOnly(s).length >= 1,
  },
  {
    id: 'startwave',
    title: '2. 웨이브 시작',
    text: '준비가 되면 <b>웨이브 시작</b>을 누릅니다. 전투는 전부 자동이고, 플레이어는 웨이브 사이에 판을 짜는 역할입니다. '
      + '오른쪽 <b>1×</b> 버튼으로 2배·3배속을 켤 수 있습니다.',
    focus: '#btn-start',
    check: (s) => s.wave >= 2,
  },
  {
    id: 'attr',
    title: '3. 타입 상성',
    text: '<b>다음 웨이브</b> 칸에 이번에 올 적의 타입 구성이 미리 공개됩니다. '
      + '불꽃 ▶ 풀 ▶ 물 ▶ 불꽃 순으로 강하고, 유리하면 피해 ×1.5 · 불리하면 ×0.6입니다. '
      + '미리 읽고 맞춰 배치하는 것이 이 게임의 기본 퍼즐입니다.',
    tab: 'build', focus: '#wave-preview',
  },
  {
    id: 'counter',
    title: '4. 상성에 맞춰 배치',
    text: '포획은 무작위지만 <b>등장 확률</b>은 공개돼 있습니다. 몬스터볼 패널의 확률 표를 펼쳐 보세요. '
      + '낮은 확률로 <b>1차진화체</b>가 바로 나오기도 합니다. 한 기 더 잡아 배치해 보세요.',
    tab: 'build', focus: '.summon-panel', tiles: [[7, 6]],
    enter: (s) => grant(s, { bits: 300 }),
    check: (s) => towersOnly(s).length >= 2,
  },
  {
    id: 'adjacency',
    title: '5. 인접 효과 — 8방향',
    text: '포켓몬은 <b>바로 옆 8칸</b>에 무엇이 있느냐로 강해집니다. 드래곤 타입(파이리)은 <b>뭉칠수록</b> 강해집니다. '
      + '연습용 파이리를 대기시켜 뒀습니다. 반짝이는 칸에 붙여 놓아보세요. 배치 전에 커서를 올리면 영향권 8칸이 미리 밝아집니다.',
    tab: 'build', focus: '.summon-panel', tiles: [[5, 4]],
    enter: (s) => {
      grant(s, { bits: 200 });
      if (!s.pending) s.pending = { id: 'charmander', grade: 'common', paid: 0 };
    },
    check: (s) => towersOnly(s).some((t) => t.def.field === 'DRAGON'
      && (s.adjacency[t.uid]?.notes || []).some((x) => x.startsWith(ADJ_RULES.DRAGON.label))),
  },
  {
    id: 'adjread',
    title: '6. 인접 효과 확인하기',
    text: '방금 놓은 포켓몬을 클릭하면 <b>유닛</b> 탭에 지금 이 자리에서 받고 있는 인접 보너스가 그대로 나옵니다. '
      + '타입마다 규칙이 다릅니다 — 고스트는 반대로 <b>떨어질수록</b> 강해지고, 강철은 강철끼리 이어야 합니다. '
      + '전체 규칙은 <b>정보</b> 탭에 있습니다.',
    tab: 'info', focus: '#adj-rules',
  },
  {
    id: 'prop',
    title: '7. 도구 — 혼자선 값이 없는 심볼',
    text: '<b>구애머리띠</b>를 반짝이는 칸에 놓아보세요. 도구는 공격하지 않습니다. '
      + '오직 인접한 8칸의 포켓몬만 강화합니다. 화력 한 칸과 강화 한 칸 중 무엇을 놓을지가 매번 선택입니다.',
    tab: 'build', focus: '#props', tiles: [[4, 3]],
    enter: (s) => grant(s, { bits: 200 }),
    check: (s) => s.towers.some((t) => isProp(t.def)),
  },
  {
    id: 'exchange',
    title: '8. 프렌들리샵',
    text: '진화에는 <b>코인 + 진화 아이템</b>이 둘 다 필요합니다. 아이템은 웨이브 클리어로 들어오지만, '
      + '남는 코인을 아이템으로 바꾸는 창구가 프렌들리샵입니다. <b>이상한사탕</b>을 하나 사보세요. (살수록 비싸집니다)',
    tab: 'build', focus: '#exchange',
    enter: (s) => grant(s, { bits: 320 }),
    check: (s) => s.purchases.chips >= 1,
  },
  {
    id: 'evolve',
    title: '9. 진화 — 이 게임의 업그레이드',
    text: '타워를 파는 게 아니라 <b>키워서 진화</b>시킵니다. 필드의 파이리를 클릭하고 '
      + '<b>리자드</b>로 진화시켜 보세요. 스탯만 오르는 게 아니라 공격 방식 자체가 바뀝니다.',
    tab: 'unit', focus: '#selected-body',
    enter: (s) => grant(s, { bits: 300, chips: 2 }),
    check: (s) => towersOnly(s).some((t) => t.def.tier >= 2),
  },
  {
    id: 'branch',
    title: '10. 진화 라인',
    text: '진화는 원작 그대로 <b>3단계</b>입니다 — 파이리 → 리자드 → 리자몽. '
      + '1차진화에는 <b>이상한사탕</b>, 최종진화에는 <b>진화의돌</b>이 필요합니다. '
      + '라인은 14개이고, 라인마다 단일·광역·관통·둔화 중 잘하는 역할이 다릅니다.',
    tab: 'unit', focus: '#selected-body',
  },
  {
    id: 'synergy',
    title: '11. 타입 시너지',
    text: '인접과 별개로, <b>필드 전체</b>에 같은 타입이 2체·4체 모이면 그룹 보너스가 붙습니다. '
      + '드래곤은 공격력, 격투는 공속, 에스퍼는 사거리, 고스트는 치명타, 강철은 광역입니다. '
      + '볼에서 무엇이 나왔는지가 어느 타입을 모을지와 바로 얽힙니다.',
    tab: 'info', focus: '#synergy',
  },
  {
    id: 'mega',
    title: '12. 메가진화 — 유대로 발동',
    text: '연습용으로 <b>최종진화 2기</b>를 붙여 놓아 드렸습니다. 반짝이는 리자몽을 클릭하고 '
      + '<b>메가진화</b> 항목에서 합쳐보세요. 메가진화는 혼자서는 못 하고 <b>인접한 동료와의 유대</b>가 필요합니다. '
      + '상하좌우로 맞닿은 2기가 1기가 되어 슬롯은 줄지만 훨씬 강해집니다. '
      + '리자몽은 어떤 파트너와 붙느냐에 따라 <b>X와 Y</b>로 갈립니다.',
    tab: 'unit', focus: '#selected-body', tiles: [[11, 7], [12, 7]],
    enter: (s) => {
      grant(s, { bits: 700, cores: 2 });
      const put = (id, c, r) => {
        if (s.towerAt(c, r)) return;
        return s.addTower(id, c, r, c * 44 + 22, r * 44 + 22, 350);
      };
      const a = put('charizard', 11, 7);
      put('dragonite', 12, 7);
      if (a) s.selectedTowerUid = a.uid;
    },
    check: (s) => s.towers.some((t) => t.def.mega),
  },
  {
    id: 'augment',
    title: '13. 특성과 리롤',
    text: '특정 웨이브에 도달하면 <b>특성 3장 중 1장</b>을 고릅니다. 이번 판 내내 유지되고, '
      + '고르기 전에는 다음 웨이브가 시작되지 않습니다. 마음에 안 들면 <b>리롤</b>로 다시 뽑을 수 있는데 '
      + '판당 2회뿐입니다. 하나 골라보세요.',
    enter: (s) => { if (!s.offer && s.augments.length === 0) s.openOffer(s.wave); },
    check: (s) => s.augments.length >= 1,
  },
  {
    id: 'rent',
    title: '14. 리그 참가비',
    text: 'HUD의 🏅 칸을 보세요. <b>5웨이브마다 리그 참가비</b>가 청구되고, 못 내면 그 자리에서 압류(패배)입니다. '
      + '청구는 웨이브를 시작하는 순간 빠져나가므로, 모자라면 준비 시간 동안 포켓몬을 <b>방생</b>해서 마련하면 됩니다. '
      + '화력에 전부 쏟을 수도, 리그 참가비만 챙길 수도 없게 만드는 장치입니다.',
    focus: '#chip-rent',
  },
  {
    id: 'done',
    title: '준비 끝!',
    text: '남은 것은 이것뿐입니다 — 유닛 탭의 <b>방생</b>으로 칸과 코인을 회수하고, '
      + '<b>1×</b> 버튼으로 배속을 올리고, 준비 페이즈는 자동 저장되어 나갔다 와도 <b>이어하기</b>가 됩니다. '
      + '이제 스테이지를 골라 시작하세요.',
  },
];

/** 튜토리얼 진행 상태 컨트롤러 */
export function createTutorial() {
  let index = -1;
  let entered = false;

  const api = {
    get active() { return index >= 0 && index < STEPS.length; },
    get index() { return index; },
    get total() { return STEPS.length; },
    get step() { return api.active ? STEPS[index] : null; },
    /** 이 단계가 조건 충족을 기다리는 중인가 (아니면 '다음' 버튼) */
    get waiting() { return !!(api.step && api.step.check); },

    start(state, onEnter) {
      index = 0; entered = false;
      api.enter(state, onEnter);
    },

    stop() { index = -1; entered = false; },

    enter(state, onEnter) {
      const st = api.step;
      if (!st || entered) return;
      entered = true;
      if (st.enter) st.enter(state);
      if (onEnter) onEnter(st);
    },

    next(state, onEnter) {
      if (!api.active) return false;
      index++;
      entered = false;
      if (!api.active) return false;
      api.enter(state, onEnter);
      return true;
    },

    /** 매 프레임 호출 — 조건형 단계면 충족 시 자동으로 넘어간다 */
    update(state, onEnter) {
      if (!api.active) return;
      api.enter(state, onEnter);
      const st = api.step;
      if (st.check && st.check(state)) api.next(state, onEnter);
    },

    /** 이 단계에서 반짝여야 할 타일 */
    tiles(state) {
      const st = api.step;
      if (!st || !st.tiles) return [];
      return typeof st.tiles === 'function' ? st.tiles(state) : st.tiles;
    },
  };
  return api;
}
