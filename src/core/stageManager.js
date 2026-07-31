// ─────────────────────────────────────────────────────────────
// stageManager.js — 코어 루프 오케스트레이션
//   준비 → 전투(자동) → 보상 → 준비 …
// 페이즈 전환과 승패 판정만 담당하고, 실제 계산은 각 시스템에 위임한다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { PHASE } from './gameState.js';
import { recordRun, saveRun, clearRun } from './save.js';
import { computeSynergy } from '../combat/synergy.js';
import { computeAdjacency, propIncome } from '../combat/adjacency.js';
import { OFFER_WAVES } from '../augments/augments.js';
import { sellValue } from '../evolution/evolutionTree.js';
import { PROPS } from '../data/props.js';
import * as spawner from '../enemy/enemySpawner.js';
import * as combat from '../combat/combatSystem.js';
import * as eco from '../economy/economyManager.js';
import { MONSTERS } from '../data/monsters.js';
import { pxToTile, tileToPx, isBuildable } from '../grid/pathGrid.js';

/** 증강이 반영된 배치 비용 (설치물은 할인 대상이 아니다) */
export function towerCost(state, def) {
  if (def.prop) return def.cost;
  return Math.max(5, Math.round(def.cost * (1 + (state.mods?.towerCostMult || 0))));
}

// ── 네트워크 유지비 ──────────────────────────────────────────
const R = BALANCE.rent;

/** n번째 청구액 (n은 1부터) */
export const rentAmount = (n) => Math.round(R.base * Math.pow(R.growth, n - 1));

/** 이번 웨이브에 청구되는 유지비. 없거나 이미 냈으면 0 */
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

/** 매각으로 끌어모을 수 있는 최대 비트 — 압류 판정에 쓴다 */
export function liquidValue(state) {
  return state.towers.reduce((s, t) => s + sellValue(t, state), 0);
}

/** 타워 배치 시도 → 배치된 타워 또는 실패 사유 문자열 */
/**
 * 배치. 소환된 디지몬(state.pending)은 이미 값을 치렀으므로 추가 비용이 없고,
 * 설치물은 여기서 비용을 낸다.
 */
export function placeTower(state, monsterId, px, py) {
  const def = MONSTERS[monsterId] || PROPS[monsterId];
  if (!def) return '알 수 없는 대상입니다';

  const fromSummon = state.pending && state.pending.id === monsterId;
  if (!def.prop && !fromSummon) return '디지몬은 소환으로만 얻을 수 있습니다';

  const { c, r } = pxToTile(px, py);
  if (!isBuildable(state.path, state.occupied, c, r)) return '잔디 위 빈 칸에만 놓을 수 있습니다';

  let cost = 0;
  if (fromSummon) {
    cost = state.pending.paid;                 // 소환 때 이미 지불
    state.pending = null;
  } else {
    cost = towerCost(state, def);
    if (state.bits < cost) return '비트가 부족합니다';
    eco.spend(state, cost);
  }

  const p = tileToPx(c, r);
  const t = state.addTower(monsterId, c, r, p.x, p.y, cost);
  state.selectedTowerUid = t.uid;
  return t;
}

export function beginWave(state) {
  if (state.phase !== PHASE.PREP) return false;
  if (state.offer) return false;      // 증강을 고르기 전에는 다음 웨이브가 시작되지 않는다

  // 유지비는 웨이브를 시작하는 순간 청구된다 — 준비 페이즈 내내 매각해 마련할 수 있다
  const due = rentDue(state);
  if (due > 0) {
    if (state.bits < due) return false;
    eco.spend(state, due);
    state.rentPaid.push(state.wave);
    state.pushLog(`네트워크 유지비 납부 — 비트 −${due}`);
    state.showBanner('유지비 납부', `−${due} 비트`, 1.4);
  }

  state.phase = PHASE.COMBAT;
  spawner.startWave(state);
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
    // 압류: 유지비를 낼 비트도, 팔아서 마련할 자산도 없으면 판이 끝난다
    const due = rentDue(state);
    if (due > 0 && state.bits + liquidValue(state) < due) {
      state.phase = PHASE.LOSE;
      state.lostTo = 'rent';
      state.pushLog(`유지비 ${due} 비트를 마련하지 못해 압류되었습니다.`);
      finishRun(state);
    }
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

  const cleared = state.spawnQueue.length === 0 && state.enemies.length === 0;
  if (cleared) {
    eco.onWaveClear(state, state.wave);
    const inc = propIncome(state);
    if (inc > 0) {
      eco.gain(state, inc);
      state.pushLog(`설치물 수익 — 비트 +${inc}`);
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

/** 지정 웨이브에 도달하면 증강 3종을 제안한다 */
export function maybeOfferAugment(state) {
  if (state.offer) return false;
  if (!OFFER_WAVES.includes(state.wave)) return false;
  if (state.offeredWaves.includes(state.wave)) return false;
  state.openOffer(state.wave);
  return true;
}

/** 준비 페이즈 스냅샷 저장 — 전투 중에는 저장하지 않는다 */
export function autosave(state) {
  if (state.phase !== PHASE.PREP) return false;
  return saveRun(state.serialize());
}

function finishRun(state) {
  const won = state.phase === PHASE.WIN;
  const reached = won ? state.totalWaves : state.wave;
  state.newBest = recordRun(state.stage.id, reached, won);
  clearRun();
}
