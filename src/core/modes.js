// ─────────────────────────────────────────────────────────────
// modes.js — 판을 시작하는 방식들
//
// 정규 / 엔드리스 / 주간 챌린지 세 가지가 있고, 어느 쪽이든
// '도전 규칙(모디파이어)'을 얹을 수 있다.
//
// 셋 다 이미 있는 것들 위에 얹힌다:
//   엔드리스   waveScale 공식이 웨이브 번호만 받으므로 상한만 풀면 된다
//   주간 챌린지 시드 RNG 가 이미 방 코드로 판의 운을 고정하고 있다
//   모디파이어  mods 계층(특성)이 쓰는 키를 그대로 쓴다
// ─────────────────────────────────────────────────────────────
import { hashSeed } from './rng.js';

export const MODE = {
  NORMAL: 'NORMAL',
  ENDLESS: 'ENDLESS',
  WEEKLY: 'WEEKLY',
};

// ── 엔드리스 ────────────────────────────────────────────────
/** 엔드리스에서 쓰는 총 웨이브 수. 사실상 무한 */
export const ENDLESS_WAVES = 999;

/**
 * 엔드리스는 정규 30~40웨이브 뒤부터 시작한다.
 * 정규를 클리어한 사람만 여는 모드라 앞부분을 다시 시키면 지루하기만 하다.
 */
export const endlessStartWave = (stage) => Math.max(1, Math.floor(stage.waves * 0.6));

// ── 주간 챌린지 ─────────────────────────────────────────────
/** 그 주의 월요일을 기준으로 시드를 뽑는다 — 전 세계가 같은 판을 한다 */
export function weekKey(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7;            // 월=0
  d.setDate(d.getDate() - dow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export const weeklySeed = (now) => hashSeed('weekly:' + weekKey(now));

/** 주차마다 스테이지·모디파이어도 바뀐다 (시드에서 결정적으로 뽑는다) */
export function weeklyPlan(stages, now) {
  const seed = weeklySeed(now);
  const pool = stages.filter((s) => s.id !== 'tutorial');
  const stage = pool[seed % pool.length];
  // 모디파이어 2개를 시드로 고른다
  const ids = MODIFIERS.map((m) => m.id);
  const a = ids[(seed >>> 3) % ids.length];
  let b = ids[(seed >>> 11) % ids.length];
  if (b === a) b = ids[((seed >>> 11) + 1) % ids.length];
  return { seed, stage, mods: [a, b], week: weekKey(now) };
}

// ── 도전 규칙 (모디파이어) ──────────────────────────────────
/**
 * 스스로 거는 제약. 걸수록 기록에 배수가 붙는다.
 * mods 키는 특성(augments)이 쓰는 것과 같은 계층이라 시스템 코드를 건드릴 필요가 없다.
 * apply(state) 는 판 시작 직후 한 번 호출된다.
 */
export const MODIFIERS = [
  {
    id: 'glass', name: '유리몸', icon: '💔', mult: 0.45,
    desc: '라이프 1로 시작. 한 번만 새도 끝.',
    apply: (s) => { s.life = 1; s.maxLife = 1; },
  },
  {
    // 아이콘은 구형 윈도우 이모지 폰트에 있는 것만 쓴다 — 없으면 두부(□)로 나온다
    id: 'poverty', name: '빈털터리', icon: '💰', mult: 0.35,
    desc: '시작 코인과 웨이브 보상이 30% 줄어든다.',
    apply: (s) => { s.bits = Math.round(s.bits * 0.7); },
    mods: { waveClearMult: -0.30 },
  },
  {
    id: 'rush', name: '속공', icon: '💨', mult: 0.40,
    desc: '적이 40% 빨라진다.',
    scale: { speed: 1.4 },
  },
  {
    id: 'tough', name: '강골', icon: '🛡️', mult: 0.50,
    desc: '적 체력이 60% 늘어난다.',
    scale: { hp: 1.6 },
  },
  {
    id: 'notraits', name: '무특성', icon: '🚫', mult: 0.55,
    desc: '특성을 하나도 받지 못한다.',
    noAugment: true,
  },
  {
    id: 'notools', name: '맨손', icon: '🧤', mult: 0.30,
    desc: '포켓몬 도구를 놓을 수 없다.',
    noProps: true,
  },
  {
    id: 'costly', name: '고가정책', icon: '📈', mult: 0.35,
    desc: '몬스터볼 값이 두 배로 빨리 오른다.',
    mods: { towerCostMult: 0 },   // 실제 처리는 summonCost 에서 costlyBall 로
    costlyBall: true,
  },
];

export const modifierById = (id) => MODIFIERS.find((m) => m.id === id) || null;

/** 고른 모디파이어들의 기록 배수 (1 + 각 mult 의 합) */
export function scoreMult(ids) {
  return 1 + (ids || []).reduce((sum, id) => sum + (modifierById(id)?.mult || 0), 0);
}

/** 모디파이어들이 합쳐 만드는 적 배율 */
export function modifierScale(ids) {
  const out = { hp: 1, speed: 1, bounty: 1 };
  for (const id of ids || []) {
    const m = modifierById(id);
    if (!m?.scale) continue;
    for (const k of Object.keys(out)) if (m.scale[k]) out[k] *= m.scale[k];
  }
  return out;
}

/** 모디파이어들이 mods 계층에 얹는 값 */
export function modifierMods(ids) {
  const out = {};
  for (const id of ids || []) {
    const m = modifierById(id);
    if (!m?.mods) continue;
    for (const [k, v] of Object.entries(m.mods)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

export const hasFlag = (ids, flag) => (ids || []).some((id) => modifierById(id)?.[flag]);
