// ─────────────────────────────────────────────────────────────
// balance.js — 모든 밸런스 수치의 단일 소스 (보고서 7장 리스크 대응)
// 튜닝은 이 파일만 건드리면 되도록 유지한다.
// ─────────────────────────────────────────────────────────────

export const BALANCE = {
  // 그리드 / 맵
  grid: { tile: 44, cols: 20, rows: 12 },

  // 스테이지 시작 자원
  start: {
    bits: 430,
    life: 20,
    chips: 2,   // 진화칩   (T1→T2)
    disks: 0,   // 진화디스크 (T2→T3)
    cores: 0,   // 디지코어  (T3→T4)
  },

  // 진화 비용 — [비트, 아이템종류, 아이템수]
  evolve: {
    2: { bits: 90,  item: 'chips', amount: 1 },
    3: { bits: 200, item: 'disks', amount: 1 },
    4: { bits: 450, item: 'cores', amount: 1 },
  },

  // 죠그레스(합체 진화) — 인접한 완전체 2기 → 죠그레스체 1기
  // 슬롯 2칸을 1칸으로 줄이는 대신 개별 궁극체보다 강한 유닛을 얻는다.
  // 디지코어를 2개 요구해서 "궁극체 2기 vs 죠그레스체 1기"가 실제 선택이 되게 한다.
  jogress: { bits: 620, item: 'cores', amount: 2 },

  // 네트워크 유지비 (참고작의 월세) — everyN 웨이브마다 청구되고, 못 내면 압류(패배).
  // 화력에 전부 쏟으면 유지비를 못 내고, 유지비만 챙기면 방어가 뚫린다.
  // 청구는 준비 페이즈에 예고되므로 매각으로 마련할 시간이 있다.
  rent: { everyN: 5, base: 190, growth: 1.46 },

  // 랜덤 소환 — 부를수록 비싸진다. "한 번 더 뽑을까 vs 진화에 쓸까"를 만드는 축.
  summon: { base: 45, step: 7 },

  // 매각 환급률
  sellRefund: 0.6,

  // 교환소 — 비트로 진화 아이템 구매. 살수록 비싸진다(step 가산).
  exchange: {
    chips: { base: 130, step: 45 },
    disks: { base: 340, step: 110 },
    cores: { base: 760, step: 240 },
  },

  // 경제
  economy: {
    waveClearBase: 24,     // 웨이브 클리어 보너스 = base + wave*perWave
    waveClearPerWave: 5,
    eliteChipChance: 0.35, // 정예 처치 시 진화칩 드랍 확률
  },

  // 웨이브 클리어 시 확정 아이템 지급 규칙
  itemGrant: {
    chipEveryWave: 1,   // 매 웨이브 진화칩 +1
    diskEveryN: 3,      // 3웨이브마다 진화디스크 +1
    coreEveryN: 10,     // 10웨이브(보스)마다 디지코어 +1
  },

  // 적 스케일링
  scaling: {
    hpPerWave: 0.14,    // HP = base × (1 + 0.14×(wave-1))
    speedPerWave: 0.006,
    bountyPerWave: 0.03,
    eliteFromWave: 5,   // 5웨이브부터 정예 등장
    eliteEveryN: 5,
    bossEveryN: 10,
    // 보스는 등장 웨이브가 고정(10/20/30)이라 기본 HP에 이미 그 웨이브의
    // 난이도가 반영돼 있다. 여기에 웨이브 스케일링까지 곱하면 이중 계산이 되어
    // 만렙 보드로도 처치 불가능해진다(검증: W30 보스 121,000 HP). → 보스는 스케일 제외.
    scaleBosses: false,
  },

  // 속성 상성 배율 (백신▶바이러스▶데이터▶백신)
  attrMult: { strong: 1.5, weak: 0.6, neutral: 1.0 },

  // 전투
  combat: {
    projectileSpeed: 460,
    critMult: 1.8,
    executeThreshold: 0.25, // 처형: 대상 HP 비율 이하일 때
    executeMult: 2.2,
    minDamageRatio: 0.1,    // 방어력이 높아도 최소 이만큼은 들어간다
    leakDamage: 1,          // 적 1기 누출 시 라이프 감소
    bossLeakDamage: 5,
  },

  // 웨이브 진행
  wave: {
    total: 30,
    spawnGapBase: 0.85,   // 적 스폰 간격(초)
    spawnGapMin: 0.28,
    autoNextDelay: 1.2,   // 웨이브 클리어 후 준비 페이즈 진입 딜레이
  },
};

export const TILE = BALANCE.grid.tile;
export const CANVAS = {
  w: BALANCE.grid.cols * TILE,
  h: BALANCE.grid.rows * TILE,
};
