// ─────────────────────────────────────────────────────────────
// combatSystem.js — 타겟팅 / 발사 / 투사체 / 피해 계산
//
// 타겟팅 규칙: 사거리 내에서 "경로를 가장 많이 진행한 적"을 노린다.
//   → 누출 직전의 적을 우선 처리하는 정통 TD 기본값.
// 피해 공식:
//   피해 = atk × 속성배율 × (치명타) × (처형) − 방어력
//   단, 방어력이 아무리 높아도 raw×0.1 은 관통해서 들어간다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { attrMultiplier } from './attributeChart.js';
import { bonusFor } from './synergy.js';
import * as eco from '../economy/economyManager.js';
import * as fx from '../render/fxKit.js';

const C = BALANCE.combat;

const NO_MODS = {
  atkMult: 0, rateMult: 0, rangeMult: 0, splashMult: 0, critAdd: 0, pierceAdd: 0, slowAdd: 0,
  fieldAtk: {}, fieldRate: {}, fieldRange: {}, fieldSplash: {}, fieldCrit: {},
};

const NO_ADJ = { atk: 0, rate: 0, range: 0, splash: 0, crit: 0 };

/** 시너지 + 증강 + 인접 효과가 반영된 실효 스탯 */
export function effectiveStats(tower, synergy, mods = NO_MODS, adj = NO_ADJ) {
  const d = tower.def;
  const f = d.field;
  const a = adj || NO_ADJ;
  const mAtk = 1 + bonusFor(synergy, tower, 'atk') + mods.atkMult + (mods.fieldAtk[f] || 0) + a.atk;
  const mRate = 1 + bonusFor(synergy, tower, 'rate') + mods.rateMult + (mods.fieldRate[f] || 0) + a.rate;
  const mRange = 1 + bonusFor(synergy, tower, 'range') + mods.rangeMult + (mods.fieldRange[f] || 0) + a.range;
  const mSplash = 1 + bonusFor(synergy, tower, 'splash') + mods.splashMult + (mods.fieldSplash[f] || 0) + a.splash;
  const aCrit = bonusFor(synergy, tower, 'crit') + mods.critAdd + (mods.fieldCrit[f] || 0) + a.crit;

  return {
    atk: d.atk * mAtk,
    rate: d.rate * mRate,
    range: d.range * mRange,
    splash: (d.splash || 0) * mSplash,
    pierce: d.pierce ? Math.round(d.pierce * mSplash) + mods.pierceAdd : 0,
    salvo: d.salvo || 1,
    crit: Math.min(0.95, (d.crit || 0) + aCrit),
    slowPct: d.slowPct ? Math.min(0.9, d.slowPct + mods.slowAdd) : 0,
    dps: d.atk * mAtk * d.rate * mRate * (d.salvo || 1),
  };
}

/** 사거리 내 가장 앞선 적 */
function pickTarget(state, tower, range) {
  let best = null, bestDist = -1;
  const r2 = range * range;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - tower.x, dy = e.y - tower.y;
    if (dx * dx + dy * dy > r2) continue;
    if (e.dist > bestDist) { bestDist = e.dist; best = e; }
  }
  return best;
}

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    if (t.def.prop) continue;                 // 설치물은 사격하지 않는다
    const st = effectiveStats(t, state.synergy, state.mods, state.adjacency[t.uid]);

    // 연사(salvo) 잔탄 처리
    if (t.salvoLeft > 0) {
      t.salvoCd -= dt;
      if (t.salvoCd <= 0) {
        const target = (t.salvoTarget && t.salvoTarget.hp > 0)
          ? t.salvoTarget
          : pickTarget(state, t, st.range);
        if (target) fire(state, t, st, target);
        t.salvoLeft--;
        t.salvoCd = 0.11;
      }
      continue;
    }

    // 발사 반동은 표현 계층이 읽는 값 — dt 기반이라 배속에도 맞게 줄어든다
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 5.5);

    t.cd -= dt;
    if (t.cd > 0) continue;

    const target = pickTarget(state, t, st.range);
    if (!target) continue;

    fire(state, t, st, target);
    t.cd = 1 / st.rate;
    if (st.salvo > 1) {
      t.salvoLeft = st.salvo - 1;
      t.salvoCd = 0.11;
      t.salvoTarget = target;
    }
  }
}

function fire(state, tower, st, target) {
  const d = tower.def;
  const crit = Math.random() < st.crit;
  tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.recoil = 1;
  fx.muzzle(state, tower.x + Math.cos(tower.aim) * 13, tower.y - 7 + Math.sin(tower.aim) * 13,
    tower.aim, d.color, d.kind === 'pierce' ? 22 : 15, d.id);
  const base = {
    ownerUid: tower.uid,
    shotId: d.id,                 // 전용 탄·발사구 섬광용
    attr: d.attr,
    color: d.color,
    dmg: st.atk,
    crit,
    armorPierce: !!d.armorPierce,
    execute: !!d.execute,
    slowPct: st.slowPct || 0,
    slowDur: d.slowDur || 0,
    x: tower.x, y: tower.y,
  };

  if (d.kind === 'pierce') {
    // 관통: 발사 시점 방향으로 직선 비행하며 pierce 수만큼 타격
    const ang = Math.atan2(target.y - tower.y, target.x - tower.x);
    state.projectiles.push({
      ...base,
      mode: 'beam',
      vx: Math.cos(ang) * C.projectileSpeed,
      vy: Math.sin(ang) * C.projectileSpeed,
      life: (st.range * 1.35) / C.projectileSpeed,
      pierceLeft: Math.max(1, st.pierce),
      hit: new Set(),
    });
  } else {
    state.projectiles.push({
      ...base,
      mode: 'homing',
      target,
      tx: target.x, ty: target.y,
      splash: d.kind === 'splash' ? st.splash : 0,
    });
  }
}

export function updateProjectiles(state, dt) {
  const speed = C.projectileSpeed;
  const alive = [];

  for (const p of state.projectiles) {
    if (p.mode === 'beam') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      for (const e of state.enemies) {
        if (e.hp <= 0 || p.hit.has(e.uid)) continue;
        const rr = e.radius + 6;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= rr * rr) {
          p.hit.add(e.uid);
          applyDamage(state, p, e);
          p.pierceLeft--;
          if (p.pierceLeft <= 0) break;
        }
      }
      if (p.life > 0 && p.pierceLeft > 0) alive.push(p);
      continue;
    }

    // homing
    if (p.target && p.target.hp > 0) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;

    if (dist <= step) {
      p.x = p.tx; p.y = p.ty;
      impact(state, p);
      continue;
    }
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    alive.push(p);
  }

  state.projectiles = alive;
}

function impact(state, p) {
  if (p.splash > 0) {
    const r2 = p.splash * p.splash;
    let hitAny = false;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) {
        applyDamage(state, p, e);
        hitAny = true;
      }
    }
    // 폭발은 링 하나로 끝내지 않는다: 그을음 + 이중 충격파 + 사방으로 튀는 불꽃
    fx.scorch(state, p.x, p.y, p.splash * 0.8, p.color);
    fx.shockwave(state, p.x, p.y, p.splash, '#fff6d8', 6, 0.24);
    fx.shockwave(state, p.x, p.y, p.splash * 1.15, p.color, 4, 0.38);
    fx.sparks(state, p.x, p.y, p.color, Math.min(18, 6 + Math.round(p.splash / 6)), 1.25);
    if (p.splash > 60) fx.shake(state, Math.min(5, p.splash / 22), 0.22);
    if (!hitAny) return;
  } else if (p.target && p.target.hp > 0) {
    applyDamage(state, p, p.target);
  }
}

function applyDamage(state, p, enemy) {
  const mult = attrMultiplier(p.attr, enemy.attr, state.mods);
  let dmg = p.dmg * mult;
  if (p.crit) dmg *= C.critMult;
  const executed = p.execute && enemy.hp / enemy.maxHp <= C.executeThreshold;
  if (executed) dmg *= C.executeMult;

  const floor = p.dmg * C.minDamageRatio;
  if (!p.armorPierce) dmg = Math.max(dmg - enemy.armor, floor);

  dmg = Math.round(dmg);
  enemy.hp -= dmg;
  enemy.hitT = 1;                                   // 피격 섬광
  const dir = Math.atan2(enemy.y - p.y, enemy.x - p.x);

  // 넉백 — 표현용 오프셋. 경로 진행도(dist)는 건드리지 않는다.
  const push = Math.min(7, (p.crit ? 4.5 : 2.6) * (28 / Math.max(10, enemy.radius * 2)));
  enemy.kx = (enemy.kx || 0) + Math.cos(dir) * push;
  enemy.ky = (enemy.ky || 0) + Math.sin(dir) * push;

  const owner = state.towers.find((t) => t.uid === p.ownerUid);
  if (owner) owner.damage += dmg;

  if (p.slowPct > 0) {
    // 더 강한 둔화가 덮어쓴다
    const fresh = enemy.slowTime <= 0;
    if (p.slowPct >= enemy.slowPct) enemy.slowPct = p.slowPct;
    enemy.slowTime = Math.max(enemy.slowTime, p.slowDur);
    if (fresh) fx.frost(state, enemy.x, enemy.y, 6);
  }

  const kind = executed ? 'exec' : p.crit ? 'crit'
    : mult > 1 ? 'strong' : mult < 1 ? 'weak' : 'norm';
  const big = enemy.cls === 'boss' || enemy.cls === 'elite';

  fx.sparks(state, enemy.x, enemy.y, p.crit ? '#fff6d8' : p.color,
    p.crit ? 11 : 5, p.crit ? 1.5 : 1, dir);
  // 숫자를 전부 띄우면 화면이 숫자로 덮인다 — 의미 있는 타격만 남긴다
  if (kind !== 'norm' || big || Math.random() < 0.45) {
    fx.damageNumber(state, enemy.x, enemy.y - enemy.radius, dmg, kind);
  }
  if (p.mode === 'beam') fx.slash(state, enemy.x, enemy.y, Math.atan2(p.vy, p.vx), p.color);
  if (p.crit) {
    fx.critFlash(state, enemy.x, enemy.y, dir);
    fx.shockwave(state, enemy.x, enemy.y, 30, '#fff6d8', 3.5, 0.24);
    fx.hitstop(state, 0.035);
  }
  if (executed) {
    fx.shockwave(state, enemy.x, enemy.y, 42, '#ff6b5a', 5, 0.3);
    fx.shake(state, 3.5, 0.2);
    fx.hitstop(state, 0.07);
  }

  if (enemy.hp <= 0 && !enemy.leaked) {
    enemy.killerUid = p.ownerUid;
  }
}

/** 죽은 적 정리 + 보상 지급 */
export function cleanupEnemies(state) {
  if (state.enemies.length === 0) return;
  const alive = [];
  for (const e of state.enemies) {
    if (e.hp > 0) { alive.push(e); continue; }
    if (!e.leaked) {
      eco.onKill(state, e);
      const killer = state.towers.find((t) => t.uid === e.killerUid);
      if (killer) killer.kills++;

      const boss = e.cls === 'boss';
      const elite = e.cls === 'elite';
      const power = boss ? 2.1 : elite ? 1.4 : 1;
      state.fx({
        type: 'death', x: e.x, y: e.y, color: e.color, r: e.radius,
        boss, ttl: boss ? 0.6 : 0.35, t: boss ? 0.6 : 0.35,
      });
      fx.debris(state, e.x, e.y, e.color, boss ? 22 : elite ? 14 : 8, power);
      fx.sparks(state, e.x, e.y, '#fff6d8', boss ? 16 : 7, power);
      fx.shockwave(state, e.x, e.y, e.radius * (boss ? 5 : 2.6), e.color, boss ? 7 : 4,
        boss ? 0.6 : 0.32);
      fx.coins(state, e.x, e.y, e.bounty);
      const combo = fx.bumpCombo(state);
      if (combo >= 3) fx.shockwave(state, e.x, e.y, 34, '#ffd166', 3, 0.3);
      if (boss) {
        fx.shake(state, 6, 0.55);
        fx.scorch(state, e.x, e.y, e.radius * 2.4, e.color);
        fx.hitstop(state, 0.18);
      } else if (elite) {
        fx.shake(state, 3, 0.2);
        fx.hitstop(state, 0.05);
      }
    }
  }
  state.enemies = alive;
}

export function updateEffects(state, dt) {
  // 넉백 복귀 — 밀린 만큼 제자리로 돌아온다
  for (const e of state.enemies) {
    if (e.kx) e.kx *= Math.max(0, 1 - dt * 9);
    if (e.ky) e.ky *= Math.max(0, 1 - dt * 9);
  }
  for (const f of state.effects) {
    f.t -= dt;
    if (f.vx === undefined) continue;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.gravity) f.vy += f.gravity * dt;
    if (f.drag) {
      const k = Math.max(0, 1 - f.drag * dt);
      f.vx *= k; f.vy *= k;
    }
    if (f.spin) f.rot += f.spin * dt;
  }
  state.effects = state.effects.filter((f) => f.t > 0);

  if (state.shake) {
    state.shake.t -= dt;
    if (state.shake.t <= 0) state.shake = null;
  }
}
