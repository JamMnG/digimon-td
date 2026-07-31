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

    // ── 밴픽 ──
    myBans: [],          // 내가 금지한 라인 (기본형 id)
    oppBans: [],
    banned: [],          // 합쳐진 금지 목록 — 소환 풀에서 빠진다
    banReady: false,     // 나는 밴을 확정했나
    oppBanReady: false,

    // ── 간섭 ──
    incoming: 0,         // 상대가 보낸 적 (아직 안 받은 분)
    sentTotal: 0,        // 내가 보낸 누적
    tookTotal: 0,        // 내가 받은 누적
    lastSend: 0,         // 방금 보낸 수 (UI 반짝임용)
    lastTake: 0,

    // ── 고스트 ──
    ghost: null,         // { name, waves: [{w, life}] } — 비동기 상대
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
      } else if (m.t === 'ban') {
        s.oppBans = m.bans || [];
        s.oppBanReady = true;
        syncBans();
        emit();
      } else if (m.t === 'send') {
        // 상대가 웨이브를 빠르게 정리해 적을 보냈다
        s.incoming += m.n || 0;
        s.tookTotal += m.n || 0;
        s.lastTake = m.n || 0;
        emit();
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

  /** 두 사람의 밴을 합친다 — 소환 풀에서 빠질 라인 목록 */
  function syncBans() {
    s.banned = [...new Set([...s.myBans, ...s.oppBans])];
  }

  /** 내가 금지할 라인을 정한다 (확정 전까지 자유롭게 토글) */
  function toggleBan(id, max = 2) {
    if (s.banReady) return false;
    const i = s.myBans.indexOf(id);
    if (i >= 0) s.myBans.splice(i, 1);
    else if (s.myBans.length < max) s.myBans.push(id);
    else return false;
    emit();
    return true;
  }

  /** 밴 확정 — 상대에게 보내고 서로 합친다 */
  function confirmBans() {
    if (s.banReady) return;
    s.banReady = true;
    if (tp) tp.send({ t: 'ban', bans: s.myBans });
    syncBans();
    emit();
  }

  /**
   * 웨이브를 라이프 손실 없이 정리하면 잉여 화력만큼 상대에게 적을 보낸다.
   * 각자 자기 시뮬을 돌리므로 메시지 하나면 되고, 락스텝이 아니라 디싱크가 없다.
   */
  function sendGarbage(n) {
    if (s.phase !== VS.PLAYING || n <= 0) return;
    s.sentTotal += n;
    s.lastSend = n;
    if (tp) tp.send({ t: 'send', n });
    emit();
  }

  /** 받은 적을 실제로 꺼낸다 (웨이브 시작 시 스폰 큐에 얹는다) */
  function takeIncoming() {
    const n = s.incoming;
    s.incoming = 0;
    if (n) emit();
    return n;
  }

  function localBegin() {
    if (s.phase === VS.PLAYING) return;
    s.phase = VS.PLAYING;
    s.myResult = null;
    s.oppResult = null;
    s.verdict = null;
    s.incoming = 0; s.sentTotal = 0; s.tookTotal = 0;
    s.lastSend = 0; s.lastTake = 0;
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
    s.myBans = []; s.oppBans = []; s.banned = [];
    s.banReady = false; s.oppBanReady = false;
    s.incoming = 0; s.sentTotal = 0; s.tookTotal = 0;
    s.ghost = null;
    s.error = '';
    emit();
  }

  return {
    get state() { return s; },
    get active() { return s.phase === VS.PLAYING || s.phase === VS.FINISHED; },
    onChange(fn) { listener = fn; },
    host, join, begin, update, finish, leave,
    toggleBan, confirmBans, sendGarbage, takeIncoming,
    setGhost(g) { s.ghost = g; emit(); },
  };
}
