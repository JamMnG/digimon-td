// ─────────────────────────────────────────────────────────────
// fxKit.js — 타격 연출 생성기
//
// 전투 로직(combatSystem)이 "무슨 일이 일어났는지"만 알려주면
// 여기서 그에 맞는 파티클·숫자·충격파를 state.effects 에 밀어 넣는다.
// 물리(속도·중력·감쇠)는 combat.updateEffects 가 한 번에 돌린다.
//
// 파티클은 화면을 채우면 오히려 안 보이므로 총량에 상한을 둔다.
// ─────────────────────────────────────────────────────────────

const MAX_FX = 420;

const room = (state, n = 1) => state.effects.length + n <= MAX_FX;
const rnd = (a, b) => a + Math.random() * (b - a);

/** 피격 지점에서 튀는 불꽃 */
export function sparks(state, x, y, color, count = 6, power = 1, dir = null) {
  if (!room(state, count)) return;
  for (let i = 0; i < count; i++) {
    const a = dir === null
      ? rnd(0, Math.PI * 2)
      : dir + rnd(-0.9, 0.9);
    const sp = rnd(60, 210) * power;
    const ttl = rnd(0.22, 0.46);
    state.effects.push({
      type: 'spark', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0, 60),
      size: rnd(1.6, 3.6) * power, color,
      gravity: 320, drag: 2.2, ttl, t: ttl,
    });
  }
}

/** 떠오르는 피해 숫자. kind: norm | crit | strong | weak | exec */
export function damageNumber(state, x, y, amount, kind = 'norm') {
  if (!room(state)) return;
  state.effects.push({
    type: 'dmgnum', x: x + rnd(-6, 6), y: y - 8,
    vx: rnd(-14, 14), vy: -62, gravity: 96, drag: 0.4,
    amount, kind,
    ttl: kind === 'norm' ? 0.62 : 0.9, t: kind === 'norm' ? 0.62 : 0.9,
  });
}

/** 퍼져나가는 충격파 링 */
export function shockwave(state, x, y, r, color, width = 5, ttl = 0.34) {
  if (!room(state)) return;
  state.effects.push({ type: 'shock', x, y, r0: r * 0.25, r1: r, color, width, ttl, t: ttl });
}

/** 발사구 섬광 */
export function muzzle(state, x, y, angle, color, len = 17, shotId = null) {
  if (!room(state)) return;
  state.effects.push({ type: 'muzzle', x, y, angle, color, len, shotId, ttl: 0.13, t: 0.13 });
}

/** 사망 시 흩어지는 파편 */
export function debris(state, x, y, color, count = 8, power = 1) {
  if (!room(state, count)) return;
  for (let i = 0; i < count; i++) {
    const a = rnd(0, Math.PI * 2);
    const sp = rnd(80, 260) * power;
    const ttl = rnd(0.45, 0.85);
    state.effects.push({
      type: 'debris', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(40, 130),
      size: rnd(2.4, 5.2) * power, color,
      rot: rnd(0, 6.28), spin: rnd(-12, 12),
      gravity: 520, drag: 1.1, ttl, t: ttl,
    });
  }
}

/** 바닥에 남는 그을음 — 광역기가 "터진 자리"를 남긴다 */
export function scorch(state, x, y, r, color) {
  if (!room(state)) return;
  state.effects.push({ type: 'scorch', x, y, r, color, ttl: 0.9, t: 0.9 });
}

/** 화면 흔들림. 이미 흔들리는 중이면 더 센 쪽이 이긴다 */
export function shake(state, mag, ttl = 0.28) {
  const cur = state.shake;
  if (cur && cur.mag > mag && cur.t > 0) return;
  state.shake = { mag, t: ttl, ttl };
}

/** 히트스톱 — 큰 타격 순간 게임 시간만 잠깐 멎어 타격이 "걸린다" */
export function hitstop(state, dur) {
  state.hitstop = Math.max(state.hitstop || 0, dur);
}

/** 치명타 십자 섬광 — 일반 타격과 한눈에 구분되게 */
export function critFlash(state, x, y, angle) {
  if (!room(state)) return;
  state.effects.push({ type: 'critflash', x, y, angle, ttl: 0.26, t: 0.26 });
}

/** 관통이 몸을 지나갈 때 남기는 베인 자국 */
export function slash(state, x, y, angle, color) {
  if (!room(state)) return;
  state.effects.push({ type: 'slash', x, y, angle, color, ttl: 0.2, t: 0.2 });
}

/** 둔화가 걸릴 때 튀는 얼음 조각 */
export function frost(state, x, y, count = 5) {
  if (!room(state, count)) return;
  for (let i = 0; i < count; i++) {
    const a = rnd(0, Math.PI * 2);
    const sp = rnd(30, 95);
    const ttl = rnd(0.3, 0.6);
    state.effects.push({
      type: 'frost', x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
      size: rnd(2.2, 4.4), rot: rnd(0, 6.28), spin: rnd(-6, 6),
      gravity: 130, drag: 1.6, ttl, t: ttl,
    });
  }
}

/** 처치 보상 — 비트 코인이 튀어올랐다 사라진다 */
export function coins(state, x, y, amount) {
  const n = Math.min(6, 1 + Math.floor(amount / 12));
  if (!room(state, n + 1)) return;
  for (let i = 0; i < n; i++) {
    const ttl = rnd(0.55, 0.8);
    state.effects.push({
      type: 'coin', x, y,
      vx: rnd(-70, 70), vy: rnd(-190, -110),
      size: rnd(3.4, 5), rot: rnd(0, 6.28), spin: rnd(-9, 9),
      gravity: 430, drag: 0.5, ttl, t: ttl,
    });
  }
  state.effects.push({
    type: 'dmgnum', x, y: y - 4, vx: 0, vy: -46, gravity: 70, drag: 0.5,
    amount: `+${amount}`, kind: 'bits', ttl: 0.8, t: 0.8,
  });
}

/** 화면 가장자리 섬광 — 누출처럼 "플레이어가 손해 본" 사건 전용 */
export function vignette(state, color, ttl = 0.5) {
  state.vignette = { color, t: ttl, ttl };
}

/** 연속 처치 콤보 */
export function bumpCombo(state) {
  state.combo.count++;
  state.combo.t = 1.5;
  return state.combo.count;
}
