// ─────────────────────────────────────────────────────────────
// attackArt.js — 공격 모션 (몬스터별)
//
// 두 축으로 나눈다.
//   1) 공격 포즈  — 기본 스프라이트 위에 몇 줄만 덮어써서 "쏘는 자세"를 만든다.
//                   입을 벌리거나, 무기를 들거나, 포문을 연다.
//   2) 전용 탄    — 필살기마다 탄 모양이 다르다. 도트로 굽고 각도만 돌려 붙인다.
//
// 포즈는 발사 직후 반동(recoil) 동안만 나타난다. 프레임 두 장짜리 애니메이션이다.
// ─────────────────────────────────────────────────────────────
import { shade } from './shading.js';
import { createSprite } from './pixelSprite.js';

const CLAW = '#f6f2e4';
const WHITE = '#f4efe6';
const BONE = '#e8e2d0';
const GOLD = '#f0c040';
const STEEL = '#b9c4d2';

// ── 1) 공격 포즈 ────────────────────────────────────────────
// 기본 스프라이트를 그린 뒤 실행된다. 필요한 부분만 덮어쓴다.
export const ATTACK = {
  // 입을 크게 벌린다
  agumon(S, C) {
    S.rect(8, 8, 7, 4, '#5c1a08');                 // 벌린 입
    S.rect(9, 9, 5, 2, '#c0392b');
    for (const x of [8, 10, 12, 14]) S.set(x, 8, CLAW);
    for (const x of [9, 11, 13]) S.set(x, 11, CLAW);
  },
  greymon(S, C) {
    S.rect(7, 8, 9, 5, '#5c1a08');
    S.rect(8, 9, 7, 3, '#e0603a');
    for (const x of [7, 9, 11, 13, 15]) S.set(x, 8, CLAW);
    for (const x of [8, 10, 12, 14]) S.set(x, 12, CLAW);
  },
  // 가슴 장갑을 열고 미사일을 드러낸다
  metalgreymon(S, C) {
    S.rect(6, 11, 4, 4, '#3a3f48');                // 열린 흉부
    S.rect(11, 11, 4, 4, '#3a3f48');
    S.rect(7, 12, 2, 2, '#ff5a3c');
    S.rect(12, 12, 2, 2, '#ff5a3c');
    S.rect(12, 5, 3, 1, '#ffd166');                // 눈이 밝아진다
  },
  // 등의 미사일이 점화된다
  skullgreymon(S, C) {
    S.shaded(16, 5, 5, 5, '#8e94a0');
    S.rect(16, 10, 5, 2, '#ff8a3c');
    S.rect(17, 12, 3, 2, '#ffd166');
    S.set(8, 5, '#ffd166'); S.set(13, 5, '#ffd166');
  },
  // 양손을 모아 기를 만든다
  wargreymon(S, C) {
    S.shaded(8, 12, 6, 6, '#ff8a3c');
    S.shaded(9, 13, 4, 4, '#ffd166');
    S.rect(10, 14, 2, 2, WHITE);
    S.rect(9, 5, 4, 1, '#ffffff');
  },
  blackwargreymon(S, C) {
    S.shaded(8, 12, 6, 6, '#6b3ba8');
    S.shaded(9, 13, 4, 4, '#a860ff');
    S.rect(10, 14, 2, 2, WHITE);
  },

  // 입에서 푸른 불꽃
  gabumon(S, C) {
    S.rect(9, 9, 5, 3, '#0d2a4a');
    S.rect(10, 10, 3, 1, '#5ad1ff');
  },
  garurumon(S, C) {
    S.rect(18, 10, 4, 3, '#0d2a4a');               // 벌린 주둥이
    S.rect(19, 11, 3, 1, '#8ee6ff');
    S.set(16, 8, '#ffe066');
  },
  // 발차기 — 몸을 낮추고 다리를 든다
  weregarurumon(S, C) {
    S.rect(7, 17, 3, 5, null);
    S.shaded(15, 14, 6, 3, C.base);                // 뻗은 다리
    S.rect(20, 14, 1, 3, CLAW);
    S.shaded(7, 19, 4, 3, C.dark);
  },
  blackweregarurumon(S, C) {
    ATTACK.weregarurumon(S, C);
    S.rect(7, 4, 2, 2, '#ff8a8a'); S.rect(13, 4, 2, 2, '#ff8a8a');
  },
  metalgarurumon(S, C) {
    S.rect(5, 8, 4, 4, '#3a3f48');                 // 미사일 해치 개방
    S.rect(10, 8, 4, 4, '#3a3f48');
    S.rect(6, 9, 2, 2, '#ff5a3c'); S.rect(11, 9, 2, 2, '#ff5a3c');
    S.rect(18, 10, 4, 3, '#0d2a4a'); S.rect(19, 11, 3, 1, '#d6f4ff');
  },
  blackmetalgarurumon(S, C) {
    ATTACK.metalgarurumon(S, C);
    S.rect(17, 8, 2, 1, '#ff6b6b');
  },

  // 입을 오므려 공기탄
  patamon(S, C) {
    S.rect(9, 12, 4, 3, '#c98a4b');
    S.rect(10, 13, 2, 1, '#fff0cc');
    S.symShaded(0, 5, 6, 10, C.base);              // 귀를 크게 펼친다
  },
  // 지팡이를 앞으로 내지른다
  angemon(S, C) {
    S.rect(18, 4, 1, 14, null);
    S.rect(14, 12, 7, 2, GOLD);                    // 앞으로 겨눈 지팡이
    S.rect(20, 11, 2, 4, '#ffe9a8');
    S.rect(7, 4, 8, 1, '#ffffff');
  },
  holyangemon(S, C) {
    S.rect(17, 4, 2, 12, null);
    S.shaded(15, 6, 7, 7, '#fff6dd');              // 열린 게이트
    S.rect(17, 8, 3, 3, '#ffd166');
  },
  slashangemon(S, C) {
    S.rect(18, 8, 2, 12, null);
    S.shaded(15, 9, 7, 2, '#e6edf6');              // 앞으로 뻗은 검
    S.rect(21, 8, 1, 4, '#ffffff');
  },
  seraphimon(S, C) {
    S.shaded(8, 11, 6, 6, '#8ecfff');
    S.rect(9, 12, 4, 4, '#ffffff');
    S.rect(7, 5, 8, 1, '#ffffff');
  },
  dominimon(S, C) {
    S.rect(17, 2, 2, 15, null);
    S.shaded(14, 9, 8, 2, '#f6faff');              // 찌르기
    S.rect(21, 8, 1, 4, '#ffffff');
  },

  // 손끝에 보라 불꽃
  impmon(S, C) {
    S.shaded(15, 11, 4, 4, '#b34cff');
    S.rect(16, 12, 2, 2, '#ffd6ff');
    S.rect(9, 8, 4, 2, '#2a1030');
  },
  devimon(S, C) {
    S.shaded(15, 9, 5, 8, shade(C.base, -0.3));    // 길게 뻗는 손톱
    for (const y of [16, 17, 18]) S.set(20, y, CLAW);
    S.rect(8, 6, 2, 2, '#ff8a8a'); S.rect(12, 6, 2, 2, '#ff8a8a');
  },
  skullsatamon(S, C) {
    S.rect(19, 3, 1, 16, null);
    S.shaded(14, 10, 8, 2, BONE);                  // 뼈 지팡이를 휘두른다
    S.shaded(20, 8, 3, 3, '#ff8a4a');
  },
  wizardmon(S, C) {
    S.rect(19, 4, 1, 15, null);
    S.rect(15, 8, 6, 1, '#8ee6ff');                // 지팡이를 앞으로
    S.shaded(20, 5, 3, 4, '#c8f4ff');
    S.rect(9, 10, 2, 2, '#ffffff'); S.rect(12, 10, 2, 2, '#ffffff');
  },
  demon(S, C) {
    S.shaded(7, 11, 10, 5, '#ff5a2b');             // 몸에서 화염
    S.rect(8, 12, 8, 2, '#ffb03a');
    S.rect(8, 6, 2, 2, '#ffffff'); S.rect(12, 6, 2, 2, '#ffffff');
  },
  beelzemon(S, C) {
    S.shaded(16, 12, 6, 3, '#8a8f98');             // 총을 겨눈다
    S.rect(21, 13, 1, 1, '#ffd166');
    S.shaded(0, 12, 6, 3, '#8a8f98');
    S.rect(0, 13, 1, 1, '#ffd166');
  },

  // 메가진화
  omnimon(S, C) {
    S.rect(17, 2, 2, 14, null);
    S.shaded(14, 8, 8, 2, '#f6faff');              // 그레이 소드 찌르기
    S.rect(21, 7, 1, 4, '#ffffff');
    S.rect(0, 12, 2, 2, '#8ee6ff');                // 가루루 캐논 점화
  },
  omnimon_zwart(S, C) {
    S.shaded(1, 11, 6, 4, '#454b58');
    S.rect(0, 11, 2, 4, '#ff5a3c');
    S.rect(17, 2, 2, 14, '#6b727d');
  },
  shakkoumon(S, C) {
    S.rect(8, 12, 6, 5, '#e6fffb');                // 가슴의 눈이 빛난다
    S.rect(9, 13, 4, 3, '#ffffff');
    S.rect(0, 11, 2, 2, '#5ad1ff'); S.rect(20, 11, 2, 2, '#5ad1ff');
  },
  lordknightmon(S, C) {
    S.rect(18, 3, 2, 14, null);
    S.shaded(14, 9, 8, 2, '#fff0f4');
    S.rect(21, 8, 1, 4, '#ff8ab0');
  },
  lucemon_fm(S, C) {
    S.shaded(8, 12, 6, 6, '#ff3b6b');
    S.rect(9, 13, 4, 4, '#ffd6e0');
    S.rect(8, 6, 2, 2, '#ffffff'); S.rect(12, 6, 2, 2, '#ffffff');
  },
  chaosmon(S, C) {
    S.shaded(15, 11, 7, 4, '#9aa4b0');
    S.rect(21, 12, 1, 2, '#ff3b6b');
    S.rect(8, 5, 2, 2, '#ff3b6b'); S.rect(12, 5, 2, 2, '#ff3b6b');
  },
  sakuyamon(S, C) {
    S.rect(19, 3, 1, 16, null);
    S.rect(15, 9, 6, 1, GOLD);                     // 석장을 앞으로
    S.shaded(20, 6, 3, 4, '#fff3c4');
    S.shaded(8, 12, 6, 4, '#fff0c2');
  },
  justimon(S, C) {
    S.rect(19, 4, 2, 9, null);
    S.shaded(15, 9, 7, 3, '#d6f6ff');              // 블레이드를 뻗는다
    S.rect(21, 8, 1, 5, '#ffffff');
  },
};

// ── 2) 전용 탄 ──────────────────────────────────────────────
// 몬스터 id → 탄 종류. 없으면 'orb'.
export const SHOT_OF = {
  agumon: ['fire', '#ff8c42'], greymon: ['bigfire', '#ff6b2b'],
  metalgreymon: ['missile', '#c9d2dc'], skullgreymon: ['missile', '#8e94a0'],
  wargreymon: ['orb', '#ff9a3c'], blackwargreymon: ['orb', '#a860ff'],

  gabumon: ['fire', '#7ec8f0'], garurumon: ['ice', '#8ee6ff'],
  weregarurumon: ['slash', '#bfe4ff'], blackweregarurumon: ['slash', '#8a93b0'],
  metalgarurumon: ['ice', '#d6f4ff'], blackmetalgarurumon: ['beam', '#7f8ab0'],

  patamon: ['orb', '#fff0cc'], angemon: ['arrow', '#ffe9a8'],
  holyangemon: ['star', '#fff6dd'], slashangemon: ['slash', '#e6edf6'],
  seraphimon: ['star', '#ffd166'], dominimon: ['beam', '#f6faff'],

  impmon: ['fire', '#b34cff'], devimon: ['dark', '#7a2bd6'],
  skullsatamon: ['bone', '#e8e2d0'], wizardmon: ['bolt', '#8ee6ff'],
  demon: ['bigfire', '#ff4a2b'], beelzemon: ['bullet', '#ffd166'],

  omnimon: ['beam', '#f6faff'], omnimon_zwart: ['bigfire', '#6b727d'],
  shakkoumon: ['beam', '#8ee6ff'], lordknightmon: ['slash', '#ff8ab0'],
  lucemon_fm: ['dark', '#ff3b6b'], chaosmon: ['missile', '#9aa4b0'],
  sakuyamon: ['star', '#ffd54f'], justimon: ['bolt', '#5ad1ff'],
};

const shotCache = new Map();

/** 탄 스프라이트 (오른쪽을 향한 상태로 굽는다) */
function shotSprite(kind, col) {
  const key = kind + col;
  if (shotCache.has(key)) return shotCache.get(key);
  const lo = shade(col, -0.35), hi = shade(col, 0.55);
  let S;

  switch (kind) {
    case 'fire':
      S = createSprite(7, 5);
      S.rect(0, 2, 3, 1, lo); S.rect(2, 1, 3, 3, col);
      S.rect(4, 2, 2, 1, hi); S.set(3, 2, hi);
      break;
    case 'bigfire':
      S = createSprite(10, 7);
      S.rect(0, 3, 4, 1, lo); S.rect(1, 2, 3, 3, lo);
      S.rect(3, 1, 5, 5, col); S.rect(5, 2, 3, 3, hi);
      S.rect(7, 3, 2, 1, '#ffffff');
      break;
    case 'missile':
      S = createSprite(11, 5);
      S.rect(0, 2, 3, 1, '#ff8a3c'); S.rect(1, 1, 2, 3, '#ffd166');
      S.rect(3, 1, 5, 3, col); S.rect(3, 1, 5, 1, hi);
      S.rect(8, 2, 2, 1, lo); S.set(10, 2, lo);
      S.set(3, 0, lo); S.set(3, 4, lo);
      break;
    case 'ice':
      S = createSprite(9, 7);
      S.rect(2, 2, 5, 3, col); S.rect(3, 1, 3, 1, hi);
      S.rect(3, 5, 3, 1, lo); S.set(0, 3, hi); S.set(8, 3, hi);
      S.set(1, 1, col); S.set(7, 5, col);
      break;
    case 'beam':
      S = createSprite(16, 5);
      S.rect(0, 2, 16, 1, lo);
      S.rect(2, 1, 12, 3, col);
      S.rect(4, 2, 10, 1, '#ffffff');
      break;
    case 'bolt':
      S = createSprite(12, 8);
      S.rect(0, 4, 3, 1, col); S.rect(3, 2, 3, 1, col);
      S.rect(6, 5, 3, 1, col); S.rect(9, 3, 3, 1, col);
      S.rect(3, 3, 1, 1, hi); S.rect(6, 4, 1, 1, hi); S.rect(9, 4, 1, 1, hi);
      break;
    case 'arrow':
      S = createSprite(12, 5);
      S.rect(0, 2, 8, 1, col); S.rect(7, 1, 3, 3, hi);
      S.set(10, 2, '#ffffff'); S.set(0, 1, lo); S.set(0, 3, lo);
      break;
    case 'star':
      S = createSprite(9, 9);
      S.rect(4, 0, 1, 9, col); S.rect(0, 4, 9, 1, col);
      S.rect(3, 3, 3, 3, hi); S.set(4, 4, '#ffffff');
      S.set(2, 2, col); S.set(6, 6, col); S.set(6, 2, col); S.set(2, 6, col);
      break;
    case 'slash':
      S = createSprite(9, 11);
      for (let i = 0; i < 9; i++) {
        const y = Math.round(5 - Math.cos((i / 8) * Math.PI) * 4.5);
        S.set(i, y, col); S.set(i, y + 1, hi);
      }
      break;
    case 'bone':
      S = createSprite(11, 5);
      S.rect(2, 2, 7, 1, col);
      S.set(1, 1, col); S.set(1, 3, col); S.set(9, 1, col); S.set(9, 3, col);
      S.rect(3, 2, 4, 1, hi);
      break;
    case 'dark':
      S = createSprite(9, 9);
      S.rect(2, 2, 5, 5, col); S.rect(3, 3, 3, 3, lo);
      S.set(0, 4, col); S.set(8, 4, col); S.set(4, 0, col); S.set(4, 8, col);
      S.set(4, 4, '#1a0a24');
      break;
    case 'bullet':
      S = createSprite(6, 3);
      S.rect(0, 1, 4, 1, lo); S.rect(3, 0, 3, 3, col); S.set(5, 1, '#ffffff');
      break;
    default:                                       // orb
      S = createSprite(7, 7);
      S.rect(1, 1, 5, 5, col); S.rect(2, 2, 3, 3, hi);
      S.set(3, 3, '#ffffff');
      S.rect(0, 3, 1, 1, lo); S.rect(6, 3, 1, 1, lo);
  }
  const cv = S.bake(3);
  shotCache.set(key, cv);
  return cv;
}

/** 탄 하나 그리기 — 도트가 뭉개지지 않게 확대 보간을 끈다 */
export function drawShot(ctx, shotId, x, y, angle, scale = 1) {
  const [kind, col] = SHOT_OF[shotId] || ['orb', '#ffd166'];
  const cv = shotSprite(kind, col);
  const w = cv.width / 3 * 2.0 * scale;
  const h = cv.height / 3 * 2.0 * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(cv, -w * 0.5, -h * 0.5, w, h);
  ctx.restore();
}

/** 발사구 섬광 — 탄 종류에 맞춘 도트 폭발 */
export function drawCast(ctx, shotId, x, y, angle, k) {
  const [kind, col] = SHOT_OF[shotId] || ['orb', '#ffd166'];
  const n = kind === 'beam' ? 5 : 4;
  const len = (kind === 'beam' ? 16 : 11) * (0.5 + k * 0.7);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = k;
  const px = 3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1);
    const w = Math.max(px, (1 - t) * len * 0.55);
    ctx.fillStyle = i === 0 ? '#ffffff' : (i < n - 1 ? shade(col, 0.4) : col);
    ctx.fillRect(t * len, -w / 2, px, w);
  }
  ctx.restore();
}
