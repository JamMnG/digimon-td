// ─────────────────────────────────────────────────────────────
// rng.js — 시드 난수
//
// 대결 모드는 "둘이 똑같은 운을 받고 누가 더 잘 굴리나"가 전부다.
// 그러려면 소환·증강·드랍이 두 브라우저에서 같은 순서로 나와야 한다.
//
// 스트림을 셋으로 나눈 이유:
//   하나의 난수열을 공유하면 "상대가 나보다 소환을 한 번 더 했다"는 이유로
//   그 뒤의 증강까지 전부 어긋난다. 스트림을 나눠 두면
//   "n번째 소환"과 "n번째 증강"이 서로 독립적으로 같아진다.
//
// 전투 중 난수(크리티컬·타격 이펙트·걷기 위상)는 일부러 그대로 뒀다.
// 호출 횟수가 플레이어의 조작 속도에 따라 달라져서 고정해도 의미가 없고,
// 웨이브 편성 자체가 이미 결정적(composeWave)이라 공정성에 영향이 없다.
// ─────────────────────────────────────────────────────────────

/** mulberry32 — 상태가 uint32 하나뿐이라 그대로 저장·복원할 수 있다 */
export class Rng {
  constructor(seed = 1) { this.s = (seed >>> 0) || 1; }

  next() {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 0 이상 n 미만 정수 */
  int(n) { return Math.floor(this.next() * n); }

  /** 가중 추첨 — 항목에서 가중치를 꺼내는 함수를 받는다 */
  weighted(list, weightOf) {
    let total = 0;
    for (const e of list) total += weightOf(e);
    let r = this.next() * total;
    for (const e of list) {
      r -= weightOf(e);
      if (r <= 0) return e;
    }
    return list[list.length - 1];
  }
}

/** 문자열/숫자를 32비트로 흩는다 (xmur3) */
export function hashSeed(input) {
  const str = String(input);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

const STREAMS = ['summon', 'augment', 'drop'];

/** 마스터 시드 하나에서 스트림 셋을 파생한다 */
export function makeStreams(seed) {
  const out = {};
  for (const k of STREAMS) out[k] = new Rng(hashSeed(`${seed}:${k}`));
  return out;
}

/** 스냅샷 저장용 — 각 스트림의 현재 상태 */
export function dumpStreams(streams) {
  const out = {};
  for (const k of STREAMS) out[k] = streams[k] ? streams[k].s : 1;
  return out;
}

/** 스냅샷 복원용 */
export function loadStreams(streams, dump) {
  if (!dump) return streams;
  for (const k of STREAMS) if (streams[k] && dump[k] != null) streams[k].s = dump[k] >>> 0;
  return streams;
}

// ── 방 코드 ──
// 사람이 불러주기 쉬운 6글자. 헷갈리는 글자(0/O, 1/I/L)는 뺐다.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomRoomCode() {
  let out = '';
  const buf = new Uint32Array(6);
  (globalThis.crypto || {}).getRandomValues
    ? crypto.getRandomValues(buf)
    : buf.forEach((_, i) => { buf[i] = Math.floor(Math.random() * 0xffffffff); });
  for (let i = 0; i < 6; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

export const normalizeRoomCode = (s) =>
  String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

/** 싱글플레이용 — 매 판 다른 운 */
export const randomSeed = () => hashSeed(`${randomRoomCode()}${performance.now()}`);
