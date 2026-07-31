// ─────────────────────────────────────────────────────────────
// monsterSprites.js — 몬스터별 전용 도트
//
// 부위 조합(digimonArt의 기본 경로)만으로는 "아구몬다움"이 안 나온다.
// 원작에서 한눈에 알아보게 하는 요소는 캐릭터마다 다르기 때문이다:
//   아구몬  튀어나온 주둥이 + 세 발톱 + 연한 배
//   가브몬  머리를 덮은 줄무늬 모피 후드 + 뿔 하나
//   파피몬  몸통만 한 커다란 귀(=날개)
//   위자몬  얼굴을 가리는 큰 마법사 모자 + 망토
//
// 그래서 32종을 하나씩 찍는다. 여기 없는 id는 부위 조합으로 자동 생성된다.
//
// ★ 원본 이미지를 옮긴 것이 아니라, 알아볼 수 있는 특징만 살려 새로 찍은 도트다.
//   이름·색과 마찬가지로 IP 격리 계층에 속한다 (보고서 0장).
//
// 격자 22×24, 중심 x = 10.5. 위쪽이 머리, 아래쪽이 발.
// ─────────────────────────────────────────────────────────────
import { shade } from './shading.js';

const BONE = '#e8e2d0';
const BONE_D = '#c9c2ac';
const WHITE = '#f4efe6';
const STEEL = '#b9c4d2';
const STEEL_D = '#7f8b9c';
const GOLD = '#f0c040';
const CLAW = '#f6f2e4';

// ── 공통 골격 ───────────────────────────────────────────────

/** 2족 공룡 — 아구몬 계열의 뼈대 */
function dino(S, C, o = {}) {
  const belly = o.belly || shade(C.light, 0.4);
  // 꼬리
  S.shaded(15, 14, 5, 3, C.dark);
  S.shaded(18, 11, 3, 4, C.dark);
  // 다리
  S.shaded(6, 17, 4, 5, C.base);
  S.shaded(12, 17, 4, 5, C.base);
  S.rect(5, 21, 5, 1, C.dark); S.rect(12, 21, 5, 1, C.dark);
  if (o.toes !== false) {
    for (const x of [5, 7, 9]) S.set(x, 22, CLAW);
    for (const x of [12, 14, 16]) S.set(x, 22, CLAW);
  }
  // 몸통 + 배
  S.shaded(6, 11, 10, 7, C.base);
  S.shaded(8, 13, 6, 5, belly);
  // 팔
  S.shaded(3, 12, 3, 4, C.base);
  S.shaded(16, 12, 3, 4, C.base);
  if (o.claws !== false) {
    for (const y of [16, 17]) { S.set(3, y, CLAW); S.set(18, y, CLAW); }
    S.set(4, 17, CLAW); S.set(17, 17, CLAW);
  }
}

/** 공룡 머리 — 주둥이가 앞으로 튀어나온다 */
function dinoHead(S, C, o = {}) {
  const top = o.top || C.base;
  S.shaded(5, 2, 12, 6, top);
  S.shaded(7, 7, 9, 3, o.snout || C.light);      // 주둥이
  if (o.teeth !== false) for (const x of [8, 10, 12, 14]) S.set(x, 10, CLAW);
  if (o.eyes !== false) {
    S.rect(7, 4, 2, 2, WHITE); S.rect(13, 4, 2, 2, WHITE);
    S.set(8, 5, '#2a1c10'); S.set(13, 5, '#2a1c10');
  }
}

/** 인간형 몸통 — 어깨·허리·두 다리 */
function humanoid(S, C, o = {}) {
  const leg = o.leg || C.dark;
  S.shaded(7, 17, 3, 5, leg);
  S.shaded(12, 17, 3, 5, leg);
  S.rect(6, 22, 4, 1, shade(leg, -0.35));
  S.rect(12, 22, 4, 1, shade(leg, -0.35));
  S.shaded(7, 10, 8, 8, C.base);
  S.symShaded(4, 10, 3, 3, o.shoulder || C.light);   // 어깨
  S.symShaded(4, 13, 2, 4, o.arm || C.base);         // 팔
}

/** 네발 짐승 */
function beast(S, C, o = {}) {
  S.shaded(3, 12, 16, 6, C.base);                 // 긴 몸통
  for (const x of [4, 8, 13, 17]) S.shaded(x, 17, 2, 5, C.dark);
  S.shaded(14, 6, 7, 7, C.base);                  // 머리 (오른쪽 앞)
  S.shaded(18, 10, 4, 3, o.snout || C.light);     // 주둥이
  S.taper(14, 3, 3, 4, C.light);                  // 귀
  S.taper(18, 3, 3, 4, C.light);
  S.rect(16, 8, 2, 2, WHITE); S.set(17, 9, '#1b1610');
  S.shaded(0, 10, 4, 4, o.tail || C.light);       // 꼬리
}

/** 천사형 — 날개 + 갑옷 */
function angel(S, C, o = {}) {
  const wing = o.wing || WHITE;
  const n = o.wings || 2;
  for (let i = 0; i < n; i++) {
    const y = 4 + i * 4;
    S.symShaded(0, y, 6, 3, i % 2 ? shade(wing, -0.12) : wing);
  }
  humanoid(S, C, { leg: o.leg || C.dark, shoulder: o.armor || C.light, arm: o.armor || C.base });
  if (o.halo !== false) {
    S.rect(8, 0, 6, 1, '#ffe9a8');
    S.set(7, 0, GOLD); S.set(14, 0, GOLD);
  }
}

/** 마인형 — 박쥐 날개 */
function batWings(S, col) {
  S.symShaded(0, 5, 6, 5, col);
  S.sym(0, 10, 4, 3, shade(col, -0.2));
  S.sym(0, 4, 3, 1, shade(col, 0.25));
  S.sym(1, 13, 3, 2, shade(col, -0.35));
}

// ── 몬스터별 ────────────────────────────────────────────────
export const SPRITES = {
  // ══ A라인 ══
  agumon(S, C) {
    dino(S, C, { belly: '#ffe0b5' });
    dinoHead(S, C, { snout: shade(C.base, 0.22) });
  },
  greymon(S, C) {
    dino(S, C, { belly: '#ffd9a8' });
    S.rect(6, 12, 10, 1, '#2f5d8c');              // 파란 줄무늬
    S.rect(6, 15, 10, 1, '#2f5d8c');
    // 갈색 뿔 투구
    S.shaded(5, 2, 12, 5, '#9a6b3a');
    S.taper(2, 1, 4, 4, BONE, 1);                 // 옆 뿔
    S.taper(16, 1, 4, 4, BONE, 1);
    S.shaded(7, 7, 9, 3, shade(C.base, 0.2));     // 주둥이
    S.taper(10, 5, 3, 3, BONE);                   // 코뿔
    for (const x of [8, 10, 12, 14]) S.set(x, 10, CLAW);
    S.rect(7, 4, 2, 2, '#ffe066'); S.rect(13, 4, 2, 2, '#ffe066');
    S.set(8, 5, '#2a1c10'); S.set(13, 5, '#2a1c10');
  },
  metalgreymon(S, C) {
    dino(S, C, { belly: '#ffcf9a', claws: false });
    S.shaded(6, 11, 10, 4, STEEL);                // 금속 상반신
    S.rect(8, 12, 6, 1, STEEL_D);
    S.shaded(15, 11, 6, 4, STEEL);                // 오른팔 금속 갈고리
    S.rect(20, 11, 1, 4, STEEL_D);
    S.set(21, 11, CLAW); S.set(21, 14, CLAW);
    S.shaded(5, 2, 12, 6, STEEL);                 // 금속 투구
    S.taper(2, 1, 4, 4, GOLD, 1); S.taper(16, 1, 4, 4, GOLD, 1);
    S.rect(7, 5, 8, 2, '#241c14');
    S.rect(12, 5, 3, 1, '#ff3b3b');               // 외눈 발광
    S.shaded(7, 8, 8, 2, shade(C.base, 0.15));
  },
  skullgreymon(S, C) {
    // 해골 공룡 — 갈비뼈와 등의 미사일
    S.shaded(15, 14, 5, 3, BONE_D);
    S.shaded(18, 10, 3, 5, BONE_D);
    S.shaded(6, 17, 4, 5, BONE_D); S.shaded(12, 17, 4, 5, BONE_D);
    S.rect(5, 22, 5, 1, BONE); S.rect(12, 22, 5, 1, BONE);
    S.shaded(7, 11, 8, 7, BONE);
    for (const y of [12, 14, 16]) {                // 갈비뼈
      S.rect(8, y, 6, 1, BONE_D);
      S.set(7, y, C.deep); S.set(14, y, C.deep);
    }
    S.shaded(3, 12, 4, 4, BONE_D); S.shaded(15, 12, 4, 4, BONE_D);
    S.shaded(16, 6, 5, 5, '#6e7480');              // 등의 미사일
    S.taper(17, 3, 3, 4, '#8e94a0');
    S.shaded(6, 2, 10, 6, BONE);                   // 해골 머리
    S.shaded(8, 7, 7, 3, BONE_D);
    S.rect(7, 4, 3, 3, '#12100c'); S.rect(12, 4, 3, 3, '#12100c');
    S.set(8, 5, '#ff3b3b'); S.set(13, 5, '#ff3b3b');
    for (const x of [8, 10, 12, 14]) S.set(x, 10, BONE);
  },
  wargreymon(S, C) {
    humanoid(S, C, { leg: shade(C.base, -0.25), shoulder: GOLD, arm: C.base });
    S.shaded(4, 10, 4, 4, GOLD);                   // 어깨 갑주
    S.shaded(14, 10, 4, 4, GOLD);
    for (const x of [3, 4, 5]) { S.set(x, 14, CLAW); S.set(x + 14, 14, CLAW); }  // 드라몬 킬러
    S.rect(9, 13, 4, 1, shade(C.attr, 0.3));       // 가슴 문장
    S.rect(9, 14, 4, 2, C.attr);
    S.shaded(6, 2, 10, 6, GOLD);                   // 투구
    S.taper(10, 0, 3, 3, '#fff0c0');               // 정수리 지느러미
    S.rect(8, 5, 6, 2, '#241c14');
    S.rect(9, 5, 4, 1, '#ffe066');
    S.symShaded(1, 6, 5, 6, shade(C.base, 0.1));   // 등의 방패 날개
  },
  blackwargreymon(S, C) {
    SPRITES.wargreymon(S, { ...C, base: C.base, light: C.light, attr: '#c77dff' });
    // 검은 개체는 갑주 톤만 어둡게 덮어쓴다
    S.shaded(4, 10, 4, 4, '#4a4f58'); S.shaded(14, 10, 4, 4, '#4a4f58');
    S.shaded(6, 2, 10, 6, '#4a4f58');
    S.rect(8, 5, 6, 2, '#12100c'); S.rect(9, 5, 4, 1, '#ff5a3c');
    S.taper(10, 0, 3, 3, '#6b727d');
  },

  // ══ B라인 ══
  gabumon(S, C) {
    // 노란 몸에 파란 줄무늬 모피 후드를 뒤집어쓴 형태
    S.shaded(7, 17, 3, 5, '#e8d18a'); S.shaded(12, 17, 3, 5, '#e8d18a');
    S.rect(6, 22, 4, 1, CLAW); S.rect(12, 22, 4, 1, CLAW);
    S.shaded(7, 11, 8, 7, '#f2dfa2');              // 노란 몸
    S.shaded(4, 8, 14, 6, C.base);                 // 모피 (몸 위를 덮음)
    for (const y of [9, 11, 13]) S.rect(5, y, 12, 1, '#2f5d8c');
    S.shaded(6, 2, 10, 7, C.base);                 // 모피 후드
    S.taper(4, 3, 4, 4, C.light); S.taper(14, 3, 4, 4, C.light);
    S.shaded(8, 6, 7, 4, '#f6e6b0');               // 얼굴이 앞으로 나옴
    S.rect(8, 6, 2, 2, WHITE); S.rect(12, 6, 2, 2, WHITE);
    S.set(9, 7, '#1b1610'); S.set(13, 7, '#1b1610');
    S.taper(10, 0, 3, 3, CLAW);                    // 뿔
  },
  garurumon(S, C) {
    beast(S, C, { snout: WHITE, tail: WHITE });
    for (const x of [5, 9, 13]) S.rect(x, 12, 1, 6, '#1f3a5c');   // 검은 줄무늬
    S.shaded(3, 13, 16, 2, WHITE);                 // 흰 배
  },
  weregarurumon(S, C) {
    humanoid(S, C, { leg: '#2f4a72', shoulder: C.light, arm: C.base });
    S.rect(7, 16, 8, 1, '#c0392b');                // 붉은 벨트
    S.shaded(8, 17, 6, 2, '#2f4a72');              // 청바지
    S.shaded(6, 2, 10, 6, C.base);                 // 늑대 머리
    S.shaded(8, 7, 7, 3, WHITE);
    S.taper(4, 0, 4, 4, C.light); S.taper(14, 0, 4, 4, C.light);
    S.rect(7, 4, 2, 2, '#ffe066'); S.rect(13, 4, 2, 2, '#ffe066');
    S.set(8, 5, '#1b1610'); S.set(13, 5, '#1b1610');
    for (const x of [4, 5, 16, 17]) S.set(x, 17, CLAW);
  },
  blackweregarurumon(S, C) {
    SPRITES.weregarurumon(S, C);
    S.shaded(8, 7, 7, 3, shade(C.base, 0.25));     // 흰 주둥이 대신 어두운 톤
    S.rect(7, 4, 2, 2, '#ff5a5a'); S.rect(13, 4, 2, 2, '#ff5a5a');
    S.rect(7, 16, 8, 1, '#7a2b2b');
  },
  metalgarurumon(S, C) {
    beast(S, C, { snout: STEEL, tail: STEEL });
    S.shaded(3, 12, 16, 3, STEEL);                 // 금속 등판
    S.shaded(5, 8, 4, 4, STEEL_D);                 // 등의 미사일
    S.shaded(10, 8, 4, 4, STEEL_D);
    S.rect(16, 8, 3, 2, '#12303a');                // 바이저
    S.rect(17, 8, 2, 1, '#d6f4ff');
    S.rect(3, 15, 16, 1, shade(STEEL, -0.3));
  },
  blackmetalgarurumon(S, C) {
    SPRITES.metalgarurumon(S, C);
    S.shaded(3, 12, 16, 3, '#4a5064');
    S.shaded(5, 8, 4, 4, '#343a4a'); S.shaded(10, 8, 4, 4, '#343a4a');
    S.rect(16, 8, 3, 2, '#1a1020'); S.rect(17, 8, 2, 1, '#ff6b6b');
  },

  // ══ C라인 ══
  patamon(S, C) {
    // 몸통만 한 커다란 귀 — 이것 하나로 알아본다
    S.symShaded(0, 6, 6, 9, C.base);
    S.sym(0, 8, 3, 5, C.light);
    S.shaded(6, 6, 10, 10, C.base);                // 둥근 몸
    S.shaded(8, 10, 6, 6, '#ffeec7');              // 크림색 배
    S.rect(7, 9, 2, 2, WHITE); S.rect(13, 9, 2, 2, WHITE);
    S.set(8, 10, '#2a1c10'); S.set(13, 10, '#2a1c10');
    S.set(10, 12, '#c98a4b'); S.set(11, 12, '#c98a4b');   // 작은 입
    S.shaded(7, 16, 3, 2, '#e8b878'); S.shaded(12, 16, 3, 2, '#e8b878');
  },
  angemon(S, C) {
    angel(S, C, { wings: 3, wing: WHITE, armor: '#e8dfc4', leg: '#d8ceb0' });
    S.rect(7, 3, 8, 3, '#e2d6b4');                 // 눈을 가린 투구
    S.rect(7, 4, 8, 1, '#8ecfff');
    S.shaded(6, 2, 10, 2, '#f0e8cc');
    S.rect(18, 4, 1, 14, GOLD);                    // 금속 지팡이
    S.rect(17, 3, 3, 2, '#ffe9a8');
  },
  holyangemon(S, C) {
    angel(S, C, { wings: 4, wing: WHITE, armor: '#f6e9c6', leg: '#e0d4ae' });
    S.rect(7, 3, 8, 3, '#e9dcb4');
    S.rect(7, 4, 8, 1, '#ffd166');
    S.rect(9, 13, 4, 3, C.attr);                   // 가슴 문장
    S.rect(17, 4, 2, 12, WHITE);                   // 빛의 검
    S.rect(16, 14, 4, 1, GOLD);
  },
  slashangemon(S, C) {
    angel(S, C, { wings: 2, wing: '#dbe4f0', armor: STEEL, leg: STEEL_D, halo: false });
    S.shaded(6, 2, 10, 6, STEEL);                  // 각진 투구
    S.rect(7, 5, 8, 2, '#12303a');
    S.rect(8, 5, 6, 1, '#ff8a5a');
    S.rect(2, 8, 2, 12, '#e6edf6');                // 양팔의 검
    S.rect(18, 8, 2, 12, '#e6edf6');
  },
  seraphimon(S, C) {
    angel(S, C, { wings: 4, wing: '#fff6dd', armor: GOLD, leg: '#d8b040' });
    S.shaded(6, 2, 10, 6, GOLD);
    S.rect(7, 5, 8, 2, '#241c14');
    S.rect(8, 5, 6, 1, '#ffe066');
    S.taper(10, 0, 3, 3, '#fff6dd');
    S.rect(9, 13, 4, 3, '#4fc3f7');                // 푸른 보석
  },
  dominimon(S, C) {
    angel(S, C, { wings: 3, wing: '#eef3fb', armor: '#eef3fb', leg: '#c8d2e2' });
    S.shaded(6, 2, 10, 6, '#eef3fb');
    S.rect(7, 5, 8, 2, '#1a2430');
    S.rect(8, 5, 6, 1, '#7fd8ff');
    S.taper(10, 0, 3, 3, GOLD);
    S.rect(17, 2, 2, 15, '#f6faff');               // 긴 창검
    S.rect(16, 15, 4, 1, GOLD);
  },

  // ══ D라인 ══
  impmon(S, C) {
    S.shaded(7, 17, 3, 4, C.dark); S.shaded(12, 17, 3, 4, C.dark);
    S.shaded(7, 11, 8, 7, C.base);                 // 작은 몸
    S.shaded(9, 13, 4, 4, '#e6c9ff');
    S.shaded(4, 12, 3, 4, '#c0392b');              // 빨간 장갑
    S.shaded(15, 12, 3, 4, '#c0392b');
    S.rect(7, 10, 8, 1, '#c0392b');                // 빨간 반다나
    S.shaded(6, 3, 10, 7, C.base);                 // 큰 머리
    S.taper(3, 0, 4, 5, C.light); S.taper(15, 0, 4, 5, C.light);   // 뾰족 귀
    S.rect(7, 5, 3, 2, '#7ee87e'); S.rect(12, 5, 3, 2, '#7ee87e'); // 초록 눈
    S.set(8, 6, '#12100c'); S.set(13, 6, '#12100c');
    S.rect(9, 8, 4, 1, '#2a1030');                 // 웃는 입
    S.rect(16, 15, 4, 1, C.dark); S.rect(19, 12, 1, 4, C.dark);    // 꼬리
  },
  devimon(S, C) {
    batWings(S, C.alt);
    S.shaded(8, 11, 6, 8, C.base);                 // 마르고 긴 몸
    S.shaded(4, 11, 3, 8, C.base);                 // 아주 긴 팔
    S.shaded(15, 11, 3, 8, C.base);
    for (const y of [19, 20]) { S.set(4, y, CLAW); S.set(6, y, CLAW); S.set(15, y, CLAW); S.set(17, y, CLAW); }
    S.rect(7, 12, 8, 1, '#3a2050'); S.rect(7, 15, 8, 1, '#3a2050');
    S.shaded(7, 3, 8, 7, shade(C.base, -0.15));    // 머리
    S.rect(8, 6, 2, 2, '#ff3b3b'); S.rect(12, 6, 2, 2, '#ff3b3b');
    S.taper(6, 0, 3, 4, C.dark); S.taper(13, 0, 3, 4, C.dark);
  },
  skullsatamon(S, C) {
    batWings(S, C.alt);
    S.shaded(8, 11, 6, 8, BONE);                   // 뼈 몸통
    for (const y of [12, 14, 16]) S.rect(9, y, 4, 1, BONE_D);
    S.shaded(5, 12, 3, 5, BONE_D); S.shaded(14, 12, 3, 5, BONE_D);
    S.shaded(7, 3, 8, 6, BONE);                    // 해골 머리
    S.rect(8, 5, 2, 2, '#12100c'); S.rect(12, 5, 2, 2, '#12100c');
    S.set(8, 6, '#ff8a4a'); S.set(13, 6, '#ff8a4a');
    S.taper(6, 0, 3, 4, BONE_D); S.taper(13, 0, 3, 4, BONE_D);
    S.rect(19, 3, 1, 16, BONE_D);                  // 뼈 지팡이
    S.shaded(18, 1, 3, 3, '#ff8a4a');
  },
  wizardmon(S, C) {
    // 얼굴을 가리는 큰 모자 + 망토
    S.shaded(6, 12, 10, 8, C.base);                // 망토
    S.rect(6, 19, 2, 2, C.dark); S.rect(9, 19, 2, 2, C.dark); S.rect(13, 19, 2, 2, C.dark);
    S.rect(7, 14, 8, 1, '#3a3080');
    S.shaded(8, 8, 6, 5, shade(C.base, 0.2));      // 얼굴 부위
    S.rect(9, 10, 2, 2, '#a5f3d0'); S.rect(12, 10, 2, 2, '#a5f3d0');
    S.taper(5, 1, 12, 8, '#4a3f9e', 1);            // 커다란 뾰족 모자
    S.rect(4, 8, 14, 2, '#3a3080');                // 모자 챙
    S.set(6, 3, GOLD); S.set(14, 4, GOLD);         // 모자 장식
    S.rect(19, 4, 1, 15, '#7a5a32');               // 지팡이
    S.shaded(18, 2, 3, 3, '#8ee6ff');
  },
  demon(S, C) {
    batWings(S, '#4a1010');
    S.shaded(6, 11, 10, 9, C.base);                // 거대한 몸
    S.rect(7, 13, 8, 1, '#2a0808'); S.rect(7, 16, 8, 1, '#2a0808');
    S.shaded(3, 12, 3, 6, C.base); S.shaded(16, 12, 3, 6, C.base);
    for (const y of [18, 19]) { S.set(3, y, CLAW); S.set(5, y, CLAW); S.set(16, y, CLAW); S.set(18, y, CLAW); }
    S.shaded(7, 3, 8, 7, shade(C.base, -0.2));     // 머리
    S.rect(8, 6, 2, 2, '#ffb03a'); S.rect(12, 6, 2, 2, '#ffb03a');
    S.taper(4, 0, 4, 5, '#6b1a1a', 1); S.taper(14, 0, 4, 5, '#6b1a1a', 1);  // 굽은 뿔
  },
  beelzemon(S, C) {
    batWings(S, '#3a2166');
    humanoid(S, C, { leg: '#1e1430', shoulder: '#2f1b52', arm: '#2f1b52' });
    S.rect(7, 11, 8, 1, '#c0392b');                // 재킷 깃
    S.rect(9, 12, 4, 6, '#1e1430');                // 지퍼 라인
    S.shaded(7, 3, 8, 6, '#2f1b52');               // 두건 쓴 머리
    S.rect(8, 5, 2, 2, '#ff4d6a'); S.rect(12, 5, 2, 2, '#ff4d6a');
    S.rect(7, 3, 8, 1, '#c0392b');
    S.shaded(16, 13, 5, 3, '#6b6f7a');             // 총
    S.rect(20, 14, 1, 1, '#241c14');
    S.shaded(1, 13, 5, 3, '#6b6f7a');
  },

  // ══ 죠그레스체 ══
  omnimon(S, C) {
    angel(S, C, { wings: 2, wing: '#e8eef8', armor: '#f2f6ff', leg: '#cdd6e6', halo: false });
    S.shaded(6, 2, 10, 6, '#f2f6ff');              // 흰 기사 투구
    S.taper(10, 0, 3, 3, GOLD);
    S.rect(7, 5, 8, 2, '#1a2430');
    S.rect(8, 5, 6, 1, '#ffd166');
    S.shaded(1, 11, 6, 4, '#3f6fd8');              // 왼팔 가루루 캐논
    S.rect(0, 12, 1, 2, '#241c14');
    S.rect(17, 2, 2, 14, '#f6faff');               // 오른손 그레이 소드
    S.rect(16, 14, 4, 1, '#c0392b');
    S.rect(9, 13, 4, 2, C.attr);
  },
  omnimon_zwart(S, C) {
    SPRITES.omnimon(S, C);
    S.shaded(6, 2, 10, 6, '#3d434e');
    S.rect(7, 5, 8, 2, '#12100c'); S.rect(8, 5, 6, 1, '#ff5a3c');
    S.taper(10, 0, 3, 3, '#8a8f98');
    S.shaded(1, 11, 6, 4, '#454b58');
    S.rect(17, 2, 2, 14, '#6b727d');
  },
  shakkoumon(S, C) {
    // 항아리 몸통 + 커다란 외눈
    S.shaded(4, 9, 14, 11, C.base);
    S.rect(4, 9, 14, 1, C.light);
    S.rect(6, 20, 10, 2, shade(C.base, -0.4));
    S.shaded(0, 10, 4, 4, STEEL); S.shaded(18, 10, 4, 4, STEEL);   // 양옆 팔
    S.rect(0, 11, 1, 2, '#241c14'); S.rect(21, 11, 1, 2, '#241c14');
    S.shaded(7, 3, 8, 6, shade(C.base, 0.15));     // 머리
    S.rect(8, 12, 6, 5, '#12303a');                // 가슴의 큰 눈
    S.rect(9, 13, 4, 3, '#e6fffb');
    S.rect(10, 14, 2, 1, '#12303a');
    S.rect(8, 5, 6, 2, '#12303a');
    S.rect(9, 5, 4, 1, '#e6fffb');
  },
  lordknightmon(S, C) {
    angel(S, C, { wings: 2, wing: '#ffe1ea', armor: '#ffd0dd', leg: '#e0a8bc', halo: false });
    S.shaded(5, 9, 4, 5, '#ffd0dd'); S.shaded(13, 9, 4, 5, '#ffd0dd');  // 큰 어깨 갑주
    S.shaded(6, 2, 10, 6, '#ffd0dd');
    S.taper(7, 0, 3, 3, '#fff0f4'); S.taper(12, 0, 3, 3, '#fff0f4');
    S.rect(7, 5, 8, 2, '#5a2030');
    S.rect(8, 5, 6, 1, '#ff5a8a');
    S.rect(18, 3, 2, 14, '#fff0f4');               // 리본형 검
    S.rect(17, 15, 4, 1, GOLD);
  },
  lucemon_fm(S, C) {
    batWings(S, '#3d1466');
    S.symShaded(0, 12, 5, 4, '#5a1f8e');           // 아래쪽 날개 한 쌍 더
    S.shaded(7, 11, 8, 8, C.base);
    for (const y of [13, 16]) S.rect(8, y, 6, 1, '#2a0a44');
    S.shaded(4, 12, 3, 5, C.base); S.shaded(15, 12, 3, 5, C.base);
    S.shaded(7, 3, 8, 7, shade(C.base, 0.12));
    S.rect(8, 6, 2, 2, '#ffd166'); S.rect(12, 6, 2, 2, '#ffd166');
    S.taper(5, 0, 4, 4, '#7a2bb8', 1); S.taper(13, 0, 4, 4, '#7a2bb8', 1);
    S.rect(9, 14, 4, 3, '#ff3b6b');                // 붉은 코어
  },
  chaosmon(S, C) {
    // 좌우가 서로 다른 뒤틀린 융합
    S.shaded(7, 17, 3, 5, '#5a6050'); S.shaded(12, 17, 3, 5, '#3d434e');
    S.shaded(7, 10, 4, 8, C.base);                 // 왼쪽 절반
    S.shaded(11, 10, 4, 8, '#6b7280');             // 오른쪽 절반
    S.symShaded(0, 7, 6, 3, '#7f8a72');            // 금속 날개
    S.shaded(3, 11, 4, 4, '#8a9480');
    S.shaded(15, 11, 6, 4, '#9aa4b0');             // 오른팔 대포
    S.rect(21, 12, 1, 2, '#241c14');
    S.shaded(7, 3, 8, 6, BONE);                    // 해골 머리
    S.rect(8, 5, 2, 2, '#12100c'); S.rect(12, 5, 2, 2, '#12100c');
    S.set(8, 6, '#ff3b6b'); S.set(13, 6, '#ff3b6b');
    S.taper(5, 0, 4, 4, BONE_D); S.taper(13, 0, 4, 4, BONE_D);
  },
  sakuyamon(S, C) {
    S.symShaded(0, 6, 5, 4, '#ffe9a8');            // 빛의 날개
    humanoid(S, C, { leg: '#d8a830', shoulder: '#fff0c2', arm: C.base });
    S.rect(7, 12, 8, 1, '#fff6dd');
    S.shaded(6, 2, 10, 7, '#ffe08a');              // 여우 가면
    S.rect(7, 5, 3, 2, '#ffffff'); S.rect(12, 5, 3, 2, '#ffffff');
    S.set(8, 6, '#c0392b'); S.set(13, 6, '#c0392b');
    S.taper(5, 0, 4, 4, '#fff0c2'); S.taper(13, 0, 4, 4, '#fff0c2');   // 여우 귀
    S.rect(9, 8, 4, 1, '#c0392b');
    S.rect(19, 3, 1, 16, GOLD);                    // 석장
    S.rect(18, 1, 3, 2, '#fff3c4');
    S.set(19, 0, '#fff3c4');
  },
  justimon(S, C) {
    humanoid(S, C, { leg: '#2f6f92', shoulder: '#4aa8d8', arm: C.base });
    S.rect(8, 12, 6, 4, '#3d8fbb');
    S.rect(9, 13, 4, 2, '#c8f4ff');
    S.shaded(6, 2, 10, 6, '#4aa8d8');              // 사이보그 헬멧
    S.rect(7, 5, 8, 2, '#12303a');
    S.rect(8, 5, 6, 1, '#c8f4ff');
    S.rect(12, 0, 1, 3, '#3d8fbb'); S.set(13, 0, '#ff6b4a');   // 안테나
    S.shaded(16, 8, 4, 4, '#b8ecff');              // 오른팔 저스티스 킥(블레이드)
    S.rect(19, 4, 2, 9, '#d6f6ff');
    S.rect(19, 3, 2, 1, '#ffffff');
  },
};

export const hasSprite = (id) => Object.prototype.hasOwnProperty.call(SPRITES, id);
