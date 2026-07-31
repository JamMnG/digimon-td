// ─────────────────────────────────────────────────────────────
// enemySpawner.js — 웨이브 구성 + 스폰 + 이동
// 웨이브 구성은 결정적(웨이브 번호로만 결정)이라 UI에서 미리 보여줄 수 있다.
// "적 속성을 미리 공개해 배치를 읽는 퍼즐로 만든다"(보고서 3.2)는 전제.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { ENEMIES, normalPool, ELITE_ID, bossFor } from '../data/enemies.js';
import { nextUid } from '../core/gameState.js';
import { posAtDistance } from '../grid/pathGrid.js';

const S = BALANCE.scaling;

/** 웨이브 스케일 계수. stageScale은 맵별 고정 배율(stages.js의 scale). */
export function waveScale(wave, stageScale = { hp: 1, speed: 1, bounty: 1 }) {
  return {
    hp: (1 + S.hpPerWave * (wave - 1)) * stageScale.hp,
    speed: (1 + S.speedPerWave * (wave - 1)) * stageScale.speed,
    bounty: (1 + S.bountyPerWave * (wave - 1)) * stageScale.bounty,
  };
}

/** 웨이브 편성 → enemyId[] (스폰 순서). 순수 함수라 미리보기에도 쓴다. */
export function composeWave(wave) {
  const queue = [];

  if (wave % S.bossEveryN === 0) {
    // 보스 웨이브: 호위 소수 + 보스
    const pool = normalPool(wave);
    const escorts = 6 + Math.floor(wave / 4);
    for (let i = 0; i < escorts; i++) queue.push(pool[i % pool.length]);
    queue.push(bossFor(wave));
    return queue;
  }

  const pool = normalPool(wave);
  const count = 8 + Math.floor(wave * 1.5);
  for (let i = 0; i < count; i++) {
    // 결정적 분배: 웨이브가 오를수록 뒤쪽(강한) 풀 비중이 커진다
    const bias = Math.min(pool.length - 1, Math.floor((i + wave) % pool.length));
    queue.push(pool[bias]);
  }

  if (wave >= S.eliteFromWave && wave % S.eliteEveryN === 0) {
    const n = 1 + Math.floor(wave / 10);
    for (let i = 0; i < n; i++) queue.splice(Math.floor(queue.length * (i + 1) / (n + 1)), 0, ELITE_ID);
  }

  return queue;
}

/** 웨이브 미리보기 요약 — { 속성별 비중, 총 수, 보스여부 } */
export function previewWave(wave) {
  const q = composeWave(wave);
  const byAttr = {};
  const byName = {};
  for (const id of q) {
    const d = ENEMIES[id];
    // 복합 타입은 두 타입 모두 센다 — "이번 웨이브에 비행이 몇이나 오는가"가
    // 무엇을 놓을지 정하는 정보이므로, 주 타입만 세면 절반을 놓친다
    for (const a of d.attr) byAttr[a] = (byAttr[a] || 0) + 1;
    byName[d.name] = (byName[d.name] || 0) + 1;
  }
  const byId = {};
  for (const id of q) byId[id] = (byId[id] || 0) + 1;

  return {
    total: q.length,
    byAttr,
    byName,
    byId,
    hasBoss: q.some((id) => ENEMIES[id].cls === 'boss'),
    hasElite: q.some((id) => ENEMIES[id].cls === 'elite'),
  };
}

/**
 * 대결 간섭으로 보낸 적 n기.
 * 그 웨이브의 정규 풀에서 뽑아 난이도가 갑자기 튀지 않게 한다 —
 * 보스나 정예를 보내면 받는 쪽이 손쓸 방법이 없어 대결이 아니라 사고가 된다.
 */
export function garbageFor(state, n) {
  const pool = normalPool(state.wave);
  const out = [];
  for (let i = 0; i < n; i++) out.push(pool[(state.wave + i) % pool.length]);
  return out;
}

export function startWave(state) {
  state.spawnQueue = composeWave(state.wave);
  state.spawnTimer = 0;
}

function spawnGap(wave) {
  const w = BALANCE.wave;
  return Math.max(w.spawnGapMin, w.spawnGapBase - wave * 0.016);
}

export function spawnOne(state, enemyId) {
  const d = ENEMIES[enemyId];
  const ss = state.scale;
  const sc = (d.cls === 'boss' && !S.scaleBosses)
    ? { hp: ss.hp, speed: ss.speed, bounty: ss.bounty }   // 보스는 웨이브 스케일만 제외
    : waveScale(state.wave, ss);
  // 리그에 불참한 웨이브만 적이 두꺼워진다 — 참가비를 안 낸 대가
  const feeMult = state.feeSkipped ? 1 + (BALANCE.rent.skipHp ?? 0.30) : 1;
  const hp = Math.round(d.hp * sc.hp * feeMult);
  const p = posAtDistance(state.path, 0);

  state.enemies.push({
    uid: nextUid(),
    enemyId,
    name: d.name,
    cls: d.cls,
    attr: d.attr,
    color: d.color,
    radius: d.radius,
    shape: d.shape || 'brute',
    parts: d.parts || {},
    face: 1,        // 진행 방향 (표현용): 1 오른쪽 / -1 왼쪽
    hitT: 0,        // 피격 섬광 1 → 0 (표현용)
    walk: Math.random() * 6.28,  // 걷기 위상 — 다 같이 움직이지 않게
    hp,
    maxHp: hp,
    armor: d.armor,
    baseSpeed: d.speed * sc.speed,
    bounty: Math.round(d.bounty * sc.bounty),
    dist: 0,
    x: p.x, y: p.y,
    slowPct: 0,
    slowTime: 0,
  });
}

/** 스폰 타이머 진행 */
export function updateSpawn(state, dt) {
  if (state.spawnQueue.length === 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  spawnOne(state, state.spawnQueue.shift());
  state.spawnTimer = spawnGap(state.wave);
}

/** 적 이동 + 누출 처리. 누출된 라이프 감소량 반환 */
export function updateMovement(state, dt) {
  let lifeLost = 0;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;

    if (e.slowTime > 0) {
      e.slowTime -= dt;
      if (e.slowTime <= 0) { e.slowTime = 0; e.slowPct = 0; }
    }

    const speed = e.baseSpeed * (1 - e.slowPct);
    e.dist += speed * dt;
    const p = posAtDistance(state.path, e.dist);
    // 진행 방향과 걷기 위상 — 좌우로 꺾일 때 몸이 따라 돌아본다
    if (Math.abs(p.x - e.x) > 0.01) e.face = p.x > e.x ? 1 : -1;
    e.walk += speed * dt * 0.16;
    if (e.hitT > 0) e.hitT = Math.max(0, e.hitT - dt * 6);
    e.x = p.x; e.y = p.y;

    if (p.done) {
      const raw = e.cls === 'boss'
        ? BALANCE.combat.bossLeakDamage
        : BALANCE.combat.leakDamage;
      const dmg = Math.max(1, raw - (state.mods?.leakReduce || 0));
      lifeLost += dmg;
      e.hp = 0;
      e.leaked = true;
      state.leaked++;
      state.fx({ type: 'leak', x: p.x, y: p.y, amount: dmg, ttl: 0.9, t: 0.9 });
      state.vignette = { color: '#ff4a3a', t: 0.55, ttl: 0.55 };
      state.combo.count = 0;      // 하나라도 놓치면 콤보가 끊긴다
      state.combo.t = 0;
    }
  }
  return lifeLost;
}
