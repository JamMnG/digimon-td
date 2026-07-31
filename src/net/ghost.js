// ─────────────────────────────────────────────────────────────
// ghost.js — 비동기 대결 (고스트 레이스)
//
// 실시간 대결은 둘이 동시에 접속해야 한다. 시간대가 안 맞는 친구와도
// 붙을 수 있게, 내 판의 진행을 짧은 코드로 뽑아 넘긴다.
//
// 서버가 없어도 되는 이유는 대결 모드와 같다 —
// 같은 시드면 같은 운이 나오므로, 넘길 게 "언제 몇 웨이브였나"뿐이다.
//
// 코드 형식:  G1.<seed36>.<stage>.<mods>.<웨이브별 라이프>.<배지특전>
//   예) G1.k3f9a1.pallet_road.glass+rush.20,20,19,17,17,12,4.extraReroll
//
// 배지 특전까지 코드에 담는 이유: 기록을 남긴 사람이 리롤 +1을 들고 있었다면
// 도전자도 같은 특전으로 달려야 공정하다. 없으면 양쪽 다 맨몸이 된다.
// ─────────────────────────────────────────────────────────────

const TAG = 'G1';

/** 판 기록 → 공유 코드 */
export function encodeGhost(rec) {
  if (!rec || !rec.lives?.length) return '';
  return [
    TAG,
    (rec.seed >>> 0).toString(36),
    rec.stageId,
    (rec.modifiers || []).join('+') || '-',
    rec.lives.join(','),
    (rec.perks || []).join('+') || '-',
  ].join('.');
}

/** 공유 코드 → 판 기록. 형식이 어긋나면 null */
export function decodeGhost(code) {
  if (typeof code !== 'string') return null;
  const parts = code.trim().split('.');
  if (parts.length < 5 || parts[0] !== TAG) return null;
  const seed = parseInt(parts[1], 36);
  if (!Number.isFinite(seed)) return null;
  const lives = parts[4].split(',').map((n) => parseInt(n, 10)).filter(Number.isFinite);
  if (!lives.length) return null;
  return {
    seed: seed >>> 0,
    stageId: parts[2],
    modifiers: parts[3] === '-' ? [] : parts[3].split('+'),
    // 특전 칸이 없는 옛 코드는 맨몸으로 본다
    perks: !parts[5] || parts[5] === '-' ? [] : parts[5].split('+'),
    lives,
    // 시작 웨이브는 기록 길이로 역산하지 않는다 — 1부터 센 것으로 본다
    reached: lives.length,
  };
}

/**
 * 지금 내 웨이브에서 고스트는 어땠는가.
 * 아직 그 웨이브에 도달하지 못했으면(=고스트가 먼저 죽었으면) null.
 */
export function ghostAt(ghost, wave) {
  if (!ghost) return null;
  const i = wave - 1;
  if (i < 0) return null;
  if (i >= ghost.lives.length) return { dead: true, life: 0, wave: ghost.reached };
  return { dead: false, life: ghost.lives[i], wave };
}

/** 내가 고스트를 이기고 있는가 — 같은 웨이브에서 라이프가 많으면 앞선 것 */
export function ghostVerdict(ghost, state) {
  if (!ghost) return null;
  if (state.wave > ghost.reached) return { lead: 1, text: `고스트를 앞질렀다 (${ghost.reached}웨이브)` };
  const g = ghostAt(ghost, state.wave);
  if (!g) return null;
  const d = state.life - g.life;
  if (d > 0) return { lead: 1, text: `라이프 +${d} 우세` };
  if (d < 0) return { lead: -1, text: `라이프 ${d} 열세` };
  return { lead: 0, text: '동률' };
}
