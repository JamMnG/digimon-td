// ─────────────────────────────────────────────────────────────
// versus.js — 1:1 대결 진행 관리
//
// 두 사람이 각자 자기 브라우저에서 자기 판을 돌린다.
// 같은 방 코드 = 같은 시드 = 같은 포획·특성·드랍 운.
// 웨이브 편성은 원래부터 결정적(composeWave)이라 적도 똑같이 온다.
//
// 그래서 주고받는 건 딱 두 가지뿐이다.
//   start  : 어느 맵을 할지 (방장이 정한다)
//   status : 상대가 지금 몇 웨이브인지 (1초에 한 번, 300바이트 남짓)
//   done   : 끝났다 — 최종 웨이브와 승패
//
// 실시간 동기화가 없으니 랙이 나도 판이 깨지지 않는다.
// 연결이 끊기면 상대 정보만 사라지고 내 판은 그대로 굴러간다.
// ─────────────────────────────────────────────────────────────
import { createTransport } from './transport.js';
import { hashSeed, normalizeRoomCode } from '../core/rng.js';
import { PHASE } from '../core/gameState.js';

export const VS = {
  OFF: 'OFF',              // 대결 아님
  WAITING: 'WAITING',      // 상대를 기다리는 중
  READY: 'READY',          // 붙었다, 시작 대기
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
};

const STATUS_INTERVAL = 1.0;   // 초

export function createVersus() {
  let tp = null;
  let listener = () => {};

  const s = {
    phase: VS.OFF,
    room: '',
    isHost: false,
    kind: 'peer',
    stageId: null,
    seed: 0,
    error: '',
    opponent: null,      // { wave, life, maxLife, bits, towers, phase }
    myResult: null,      // { wave, won }
    oppResult: null,
    verdict: null,       // 'win' | 'lose' | 'draw'
    _t: 0,
  };

  const emit = () => listener({ ...s });

  function wire() {
    tp.onOpen(() => {
      s.error = '';
      s.phase = VS.READY;
      // 방장은 붙자마자 어느 맵인지 알려준다
      if (s.isHost && s.stageId) tp.send({ t: 'start', stageId: s.stageId, seed: s.seed });
      emit();
    });

    tp.onMessage((m) => {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'start') {
        s.stageId = m.stageId;
        s.seed = m.seed;
        s.phase = VS.READY;
        emit();
      } else if (m.t === 'begin') {
        // 방장이 시작을 눌렀다 — 참가자도 같이 들어간다
        if (m.stageId) s.stageId = m.stageId;
        if (m.seed != null) s.seed = m.seed;
        localBegin();
      } else if (m.t === 'status') {
        s.opponent = m.s;
        emit();
      } else if (m.t === 'done') {
        s.oppResult = m.r;
        s.opponent = m.r.snapshot || s.opponent;
        settle();
      }
    });

    tp.onClose(() => {
      if (s.phase === VS.FINISHED) return;
      s.error = '상대와의 연결이 끊겼습니다. 내 판은 그대로 이어집니다.';
      s.opponent = null;
      emit();
    });

    tp.onError((e) => {
      s.error = e.message || String(e);
      if (s.phase === VS.WAITING) s.phase = VS.OFF;
      emit();
    });
  }

  /** 방을 만든다 (방장) */
  function host(room, stageId, kind = 'peer') {
    close();
    s.room = normalizeRoomCode(room);
    s.isHost = true;
    s.kind = kind;
    s.stageId = stageId;
    s.seed = hashSeed(s.room);
    s.phase = VS.WAITING;
    s.error = '';
    tp = createTransport(kind, s.room, true);
    wire();
    emit();
  }

  /** 방에 들어간다 (참가자) */
  function join(room, kind = 'peer') {
    close();
    s.room = normalizeRoomCode(room);
    s.isHost = false;
    s.kind = kind;
    s.stageId = null;
    s.seed = hashSeed(s.room);
    s.phase = VS.WAITING;
    s.error = '';
    tp = createTransport(kind, s.room, false);
    wire();
    emit();
  }

  function localBegin() {
    if (s.phase === VS.PLAYING) return;
    s.phase = VS.PLAYING;
    s.myResult = null;
    s.oppResult = null;
    s.verdict = null;
    s._t = 0;
    emit();
  }

  /** 방장이 시작을 누름 — 상대도 같은 순간에 들여보낸다 */
  function begin() {
    if (tp) tp.send({ t: 'begin', stageId: s.stageId, seed: s.seed });
    localBegin();
  }

  const snapshotOf = (state) => ({
    wave: state.wave,
    life: state.life,
    maxLife: state.maxLife,
    bits: Math.floor(state.bits),
    towers: state.towers.length,
    phase: state.phase,
  });

  /** 매 프레임 호출 — 1초마다 내 진행 상황을 보낸다 */
  function update(state, dt) {
    if (s.phase !== VS.PLAYING || !tp) return;
    s._t -= dt;
    if (s._t > 0) return;
    s._t = STATUS_INTERVAL;
    tp.send({ t: 'status', s: snapshotOf(state) });
  }

  /** 내 판이 끝났다 */
  function finish(state) {
    if (s.phase !== VS.PLAYING) return;
    const won = state.phase === PHASE.WIN;
    s.myResult = {
      wave: won ? state.totalWaves : state.wave,
      won,
      snapshot: snapshotOf(state),
    };
    if (tp) tp.send({ t: 'done', r: s.myResult });
    settle();
  }

  /**
   * 승패 판정. 둘 다 끝나야 확정된다.
   *   1순위 도달 웨이브 → 2순위 남은 라이프 → 그래도 같으면 무승부
   */
  function settle() {
    if (!s.myResult || !s.oppResult) { emit(); return; }
    const a = s.myResult, b = s.oppResult;
    let v = 'draw';
    if (a.won !== b.won) v = a.won ? 'win' : 'lose';
    else if (a.wave !== b.wave) v = a.wave > b.wave ? 'win' : 'lose';
    else {
      const al = a.snapshot?.life ?? 0, bl = b.snapshot?.life ?? 0;
      if (al !== bl) v = al > bl ? 'win' : 'lose';
    }
    s.verdict = v;
    s.phase = VS.FINISHED;
    emit();
  }

  function close() {
    if (tp) { try { tp.close(); } catch { /* 이미 닫힘 */ } }
    tp = null;
  }

  function leave() {
    close();
    s.phase = VS.OFF;
    s.room = '';
    s.stageId = null;
    s.opponent = null;
    s.myResult = null;
    s.oppResult = null;
    s.verdict = null;
    s.error = '';
    emit();
  }

  return {
    get state() { return s; },
    get active() { return s.phase === VS.PLAYING || s.phase === VS.FINISHED; },
    onChange(fn) { listener = fn; },
    host, join, begin, update, finish, leave,
  };
}
