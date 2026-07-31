// ─────────────────────────────────────────────────────────────
// stageManager.js — 코어 루프 오케스트레이션
//   준비 → 전투(자동) → 보상 → 준비 …
// 페이즈 전환과 승패 판정만 담당하고, 실제 계산은 각 시스템에 위임한다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { PHASE } from './gameState.js';
import { recordRun, saveRun, clearRun, dexMark, DEX_CAUGHT, DEX_SHINY } from './save.js';
import { computeSynergy } from '../combat/synergy.js';
import { computeAdjacency, propIncome } from '../combat/adjacency.js';
import { OFFER_WAVES } from '../augments/augments.js';
import { sellValue } from '../evolution/evolutionTree.js';
import { PROPS } from '../data/props.js';
import * as spawner from '../enemy/enemySpawner.js';
import * as combat from '../combat/combatSystem.js';
import * as eco from '../economy/economyManager.js';
import { MONSTERS } from '../data/monsters.js';
import { pxToTile, tileToPx, isBuildable, tileKey } from '../grid/pathGrid.js';

/** 특성이 반영된 배치 비용 (도구는 할인 대상이 아니다) */
export function towerCost(state, def) {
  if (def.prop) return def.cost;
  return Math.max(5, Math.round(def.cost * (1 + (state.mods?.towerCostMult || 0))));
}

// ── 리그 참가비 ──────────────────────────────────────────
const R = BALANCE.rent;

/** n번째 청구액 (n은 1부터) */
export const rentAmount = (n) => Math.round(R.base * Math.pow(R.growth, n - 1));

/** 이번 웨이브에 청구되는 리그 참가비. 없거나 이미 냈으면 0 */
export function rentDue(state) {
  if (state.wave % R.everyN !== 0) return 0;
  if (state.rentPaid.includes(state.wave)) return 0;
  return rentAmount(Math.floor(state.wave / R.everyN));
}

/** 다음 청구 예고 { wave, amount } — UI가 미리 보여주기 위한 것 */
export function nextRent(state) {
  for (let w = state.wave; w <= state.totalWaves; w++) {
    if (w % R.everyN !== 0 || state.rentPaid.includes(w)) continue;
    return { wave: w, amount: rentAmount(Math.floor(w / R.everyN)) };
  }
  return null;
}

/** 방생으로 끌어모을 수 있는 최대 코인 — 압류 판정에 쓴다 */
export function liquidValue(state) {
  return state.towers.reduce((s, t) => s + sellValue(t, state), 0);
}

/** 타워 배치 시도 → 배치된 타워 또는 실패 사유 문자열 */
/**
 * 배치. 소환된 포켓몬(state.pending)은 이미 값을 치렀으므로 추가 비용이 없고,
 * 도구는 여기서 비용을 낸다.
 */
export function placeTower(state, monsterId, px, py) {
  const def = MONSTERS[monsterId] || PROPS[monsterId];
  if (!def) return '알 수 없는 대상입니다';

  if (def.prop && state.noProps) return '도전 규칙 「맨손」 — 도구를 놓을 수 없습니다';
  const fromSummon = state.pending && state.pending.id === monsterId;
  const shiny = fromSummon ? !!state.pending.shiny : false;
  if (!def.prop && !fromSummon) return '포켓몬은 소환으로만 얻을 수 있습니다';

  const { c, r } = pxToTile(px, py);
  if (!isBuildable(state.path, state.occupied, c, r)) return '풀숲 위 빈 칸에만 놓을 수 있습니다';

  let cost = 0;
  if (fromSummon) {
    cost = state.pending.paid;                 // 소환 때 이미 지불
    state.pending = null;
  } else {
    cost = towerCost(state, def);
    if (state.bits < cost) return '코인이 부족합니다';
    eco.spend(state, cost);
  }

  const p = tileToPx(c, r);
  const t = state.addTower(monsterId, c, r, p.x, p.y, cost, shiny);
  // 도감 — 필드에 올린 순간 '잡음'으로 친다 (대결 판은 기록하지 않는다)
  if (!def.prop && !state.noSave) {
    dexMark(monsterId, DEX_CAUGHT | (shiny ? DEX_SHINY : 0));
  }
  state.selectedTowerUid = t.uid;
  return t;
}

/**
 * 이미 놓은 유닛을 다른 빈 칸으로 옮긴다.
 *
 * 배치가 이 게임의 퍼즐이라 아무 때나 옮기면 긴장이 사라진다. 그래서
 * 준비 페이즈에만 허용한다 — 웨이브를 열기 전에는 얼마든지 고쳐 놓고,
 * 한번 시작하면 그 배치로 끝까지 간다. "잘못 놓아서 판을 버렸다"는
 * 억울함만 없애고 "무엇을 어디에 둘까"라는 선택은 그대로 남긴다.
 */
export function moveTower(state, uid, px, py) {
  if (state.phase !== PHASE.PREP) return '웨이브 중에는 옮길 수 없습니다';
  const t = state.towers.find((x) => x.uid === uid);
  if (!t) return '옮길 유닛이 없습니다';

  const { c, r } = pxToTile(px, py);
  if (c === t.c && r === t.r) return null;                 // 제자리 — 조용히 취소
  if (!isBuildable(state.path, state.occupied, c, r)) return '풀숲 위 빈 칸에만 놓을 수 있습니다';

  state.occupied.delete(tileKey(t.c, t.r));
  t.c = c; t.r = r;
  const p = tileToPx(c, r);
  t.x = p.x; t.y = p.y;
  state.occupied.add(tileKey(c, r));
  state.adjacency = computeAdjacency(state);               // 옮기면 인접 효과가 즉시 바뀐다
  return t;
}

/**
 * 웨이브 시작.
 * opts.skipFee 면 리그 참가비를 내지 않고 들어간다 — 코인을 아끼는 대신
 * 이 웨이브의 적이 강해진다. 어느 쪽이든 판이 끝나지는 않는다.
 */
export function beginWave(state, opts = {}) {
  if (state.phase !== PHASE.PREP) return false;
  if (state.offer) return false;      // 특성을 고르기 전에는 다음 웨이브가 시작되지 않는다

  // 전투 중에 나가도 잃을 게 없도록, 웨이브를 여는 순간을 따로 떠 둔다.
  // 리그 참가비 청구 전 시점이라 이어하기하면 이 웨이브의 준비 페이즈로 정확히 돌아간다.
  state.waveStart = state.serialize();

  // 리그 참가비 — 웨이브를 시작하는 순간이 결정 시점이다
  const due = rentDue(state);
  state.feeSkipped = false;
  if (due > 0) {
    const canPay = state.bits >= due;
    if (canPay && !opts.skipFee) {
      eco.spend(state, due);
      state.rentPaid.push(state.wave);
      state.pushLog(`리그 참가비 납부 — 코인 −${due}`);
      state.showBanner('리그 참가비 납부', `−${due} 코인`, 1.4);
    } else {
      // 불참. 코인은 굳지만 이 웨이브만 적이 세진다
      state.rentPaid.push(state.wave);
      state.feeSkipped = true;
      const pct = Math.round(R.skipHp * 100);
      state.pushLog(canPay
        ? `리그 불참 — 이번 웨이브 적 체력 +${pct}%`
        : `참가비 ${due} 코인이 없어 불참 — 이번 웨이브 적 체력 +${pct}%`);
      state.showBanner('리그 불참', `적 체력 +${pct}%`, 1.6);
    }
  }

  state.phase = PHASE.COMBAT;
  spawner.startWave(state);

  // 대결 — 상대가 보낸 적을 이번 웨이브에 얹는다.
  // 큐 앞이 아니라 중간중간 끼워 넣어야 "한 덩어리로 몰려오는" 어색함이 없다.
  if (state.incoming > 0) {
    const extra = spawner.garbageFor(state, state.incoming);
    const q = state.spawnQueue;
    for (let i = 0; i < extra.length; i++) {
      const at = Math.floor(((i + 1) / (extra.length + 1)) * q.length);
      q.splice(at + i, 0, extra[i]);
    }
    state.pushLog(`상대가 보낸 적 ${state.incoming}기가 합류했다!`);
    state.showBanner('적 증원', `상대가 보낸 ${state.incoming}기`, 1.6);
    state.incoming = 0;
  }

  // 이번 웨이브를 얼마나 깔끔하게 넘기는지 재려고 시작 시점을 기록한다
  state.waveClock = 0;
  state.waveLifeAtStart = state.life;
  const boss = state.isBossWave();
  state.showBanner(
    boss ? `보스 웨이브 ${state.wave}` : `웨이브 ${state.wave}`,
    boss ? '경계 태세' : `${state.stage.name}`,
    boss ? 2.4 : 1.6,
  );
  return true;
}

export function update(state, dtRaw) {
  const raw = Math.min(dtRaw, 0.05);

  // 히트스톱: 큰 타격 순간 게임 시간만 멎는다. 이펙트와 화면은 계속 흐른다.
  let scale = state.speed;
  if (state.hitstop > 0) {
    state.hitstop = Math.max(0, state.hitstop - raw);
    scale = 0;
  }
  const dt = raw * scale;

  state.synergy = computeSynergy(state.towers.filter((t) => !t.def.prop), state.mods);
  state.adjacency = computeAdjacency(state);
  state.advanceDpsWindow(dt);
  combat.updateEffects(state, raw * Math.max(0.35, state.speed));

  if (state.combo.t > 0) {
    state.combo.t -= raw;
    if (state.combo.t <= 0) state.combo.count = 0;
  }
  if (state.vignette) {
    state.vignette.t -= raw;
    if (state.vignette.t <= 0) state.vignette = null;
  }
  if (state.banner) {
    state.banner.t -= Math.min(dtRaw, 0.05);   // 배너는 배속과 무관하게 흐른다
    if (state.banner.t <= 0) state.banner = null;
  }

  if (state.phase === PHASE.PREP) {
    if (state.clearDelay > 0) state.clearDelay -= dt;
    // 참가비를 못 낸다고 판이 끝나지는 않는다 — 불참하고 더 센 웨이브를 받는 길이 있다.
    // (예전에는 여기서 '압류' 패배가 났는데, 손쓸 수 없는 방식이라 재미가 없었다)
  }

  if (state.phase !== PHASE.COMBAT) return;

  spawner.updateSpawn(state, dt);
  const lifeLost = spawner.updateMovement(state, dt);
  if (lifeLost > 0) state.life -= lifeLost;

  combat.updateTowers(state, dt);
  combat.updateProjectiles(state, dt);
  combat.cleanupEnemies(state);

  if (state.life <= 0) {
    state.life = 0;
    state.phase = PHASE.LOSE;
    finishRun(state);
    return;
  }

  if (state.waveClock !== undefined) state.waveClock += dt;

  const cleared = state.spawnQueue.length === 0 && state.enemies.length === 0;
  if (cleared) {
    // ── 대결 간섭 ──
    // 라이프를 하나도 안 잃고 빠르게 정리했을수록 상대에게 적을 보낸다.
    // "안전하게 두껍게" vs "얇게 빨리 깨서 압박" 이라는 축이 여기서 생긴다.
    if (state.versusSend) {
      const clean = state.life >= (state.waveLifeAtStart ?? state.life);
      const par = 10 + state.wave * 1.1;              // 이 웨이브의 기준 시간(초)
      const fast = Math.max(0, 1 - (state.waveClock || par) / par);
      const n = clean ? Math.round(fast * (2 + state.wave * 0.22)) : 0;
      if (n > 0) state.versusSend(n);
    }

    // 고스트 기록 — 이 웨이브를 끝냈을 때 남은 라이프
    if (state.ghostLives) state.ghostLives[state.wave - 1] = state.life;

    eco.onWaveClear(state, state.wave);
    const inc = propIncome(state);
    if (inc > 0) {
      eco.gain(state, inc);
      state.pushLog(`도구 수익 — 코인 +${inc}`);
    }
    if (state.wave >= state.totalWaves) {
      state.phase = PHASE.WIN;
      finishRun(state);
      return;
    }
    state.wave++;
    state.phase = PHASE.PREP;
    state.clearDelay = BALANCE.wave.autoNextDelay;
    maybeOfferAugment(state);
    autosave(state);   // 준비 페이즈에 들어설 때마다 이어하기 지점을 갱신
  }
}

/** 지정 웨이브에 도달하면 특성 3종을 제안한다 */
export function maybeOfferAugment(state) {
  if (state.offer) return false;
  if (!OFFER_WAVES.includes(state.wave)) return false;
  if (state.offeredWaves.includes(state.wave)) return false;
  state.openOffer(state.wave);
  return true;
}

/**
 * 이어하기 지점 저장.
 *  준비 페이즈 → 지금 이 순간을 그대로 저장한다.
 *  전투 중     → 웨이브를 연 순간으로 저장한다. 전투 상태(적·투사체·쿨다운)는
 *                복원할 수 없으므로 이번 웨이브를 다시 치르게 되지만,
 *                최소한 나갔다고 판이 통째로 날아가지는 않는다.
 *  승패 확정 후 → 저장하지 않는다 (판이 끝나면 스냅샷은 지워져야 한다).
 */
export function autosave(state) {
  // 대결 판은 저장하지 않는다. 이어하기가 되면 이미 아는 운을 다시 쓰는 셈이라
  // 대결의 전제(둘 다 같은 운을 한 번씩)가 무너진다.
  if (state.noSave) return false;
  if (state.phase === PHASE.PREP) return saveRun(state.serialize());
  if (state.phase === PHASE.COMBAT && state.waveStart) return saveRun(state.waveStart);
  return false;
}

function finishRun(state) {
  const won = state.phase === PHASE.WIN;
  // 엔드리스는 끝이 없으므로 '도달한 웨이브'가 곧 기록이다.
  // 도전 규칙 배수를 곱해 같은 웨이브라도 더 어렵게 간 쪽이 위로 온다.
  const reached = state.isEndless
    ? Math.round(state.wave * state.scoreMult)
    : (won ? state.totalWaves : state.wave);
  state.newBest = recordRun(state.stage.id, reached, won, state.isEndless);
  clearRun();
}
