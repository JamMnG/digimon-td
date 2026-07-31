// ─────────────────────────────────────────────────────────────
// transport.js — 두 브라우저를 잇는 통로
//
// 백엔드가 둘이다.
//   peer  : WebRTC DataChannel. 진짜 원격(다른 집, 다른 기기)용.
//           연결 자체는 P2P라 서버를 거치지 않고, 상대를 찾는 순간에만
//           PeerJS 공개 브로커를 쓴다.
//   local : BroadcastChannel. 같은 브라우저의 다른 탭끼리.
//           개발·검증용이자, 한 컴퓨터에서 창 두 개로 붙어 보는 용도.
//
// PeerJS 스크립트는 대결 로비를 열 때만 받아온다.
// 혼자 하는 판은 지금까지처럼 외부 요청이 0건이다.
// ─────────────────────────────────────────────────────────────

const PEERJS_SRC = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

// 방 코드로 PeerJS id 를 만든다. 공개 브로커라 남의 방과 겹치지 않게 접두어를 붙인다.
const peerId = (room, side) => `digimontd-${room}-${side}`;

let peerScript = null;
function loadPeerJs() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (peerScript) return peerScript;
  peerScript = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = PEERJS_SRC;
    el.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS 로드 실패')));
    el.onerror = () => { peerScript = null; reject(new Error('PeerJS 를 받아오지 못했습니다')); };
    document.head.appendChild(el);
  });
  return peerScript;
}

/** 공통 껍데기 — open/message/close/error 콜백만 노출한다 */
function baseTransport() {
  return {
    on: { open: () => {}, message: () => {}, close: () => {}, error: () => {} },
    onOpen(fn) { this.on.open = fn; return this; },
    onMessage(fn) { this.on.message = fn; return this; },
    onClose(fn) { this.on.close = fn; return this; },
    onError(fn) { this.on.error = fn; return this; },
  };
}

// ── 같은 브라우저의 다른 탭 ──
export function localTransport(room, isHost) {
  const t = baseTransport();
  const ch = new BroadcastChannel(`digimontd-${room}`);
  const me = isHost ? 'host' : 'guest';
  let open = false;

  ch.onmessage = (ev) => {
    const m = ev.data;
    if (!m || m.from === me) return;
    if (m.t === 'hi') {
      // 늦게 들어온 쪽에게도 존재를 알린다
      ch.postMessage({ from: me, t: 'hi-ack' });
      if (!open) { open = true; t.on.open(); }
      return;
    }
    if (m.t === 'hi-ack') { if (!open) { open = true; t.on.open(); } return; }
    if (m.t === 'bye') { t.on.close(); return; }
    t.on.message(m.d);
  };

  t.send = (data) => ch.postMessage({ from: me, t: 'd', d: data });
  t.close = () => { try { ch.postMessage({ from: me, t: 'bye' }); ch.close(); } catch { /* 이미 닫힘 */ } };
  t.kind = 'local';

  // 상대가 먼저 들어와 있으면 hi-ack 이 바로 온다
  setTimeout(() => ch.postMessage({ from: me, t: 'hi' }), 0);
  return t;
}

// ── 다른 기기 (WebRTC) ──
export function peerTransport(room, isHost) {
  const t = baseTransport();
  let peer = null;
  let conn = null;
  let dead = false;

  const bind = (c) => {
    conn = c;
    c.on('open', () => { if (!dead) t.on.open(); });
    c.on('data', (d) => { if (!dead) t.on.message(d); });
    c.on('close', () => { if (!dead) t.on.close(); });
    c.on('error', (e) => { if (!dead) t.on.error(new Error(e?.message || '연결 오류')); });
  };

  loadPeerJs().then((Peer) => {
    if (dead) return;
    peer = new Peer(peerId(room, isHost ? 'h' : 'g'), { debug: 0 });

    peer.on('open', () => {
      if (dead) return;
      if (isHost) return;                     // 방장은 기다리기만 한다
      bind(peer.connect(peerId(room, 'h'), { reliable: true }));
    });

    peer.on('connection', (c) => { if (!dead && isHost) bind(c); });

    peer.on('error', (e) => {
      if (dead) return;
      const type = e?.type || '';
      if (type === 'unavailable-id') {
        t.on.error(new Error('이미 쓰이고 있는 방 코드입니다. 새 코드로 다시 만들어 주세요.'));
      } else if (type === 'peer-unavailable') {
        t.on.error(new Error('그 방을 찾지 못했습니다. 코드를 확인하거나, 방장이 먼저 방을 만들었는지 보세요.'));
      } else {
        t.on.error(new Error(e?.message || '연결에 실패했습니다'));
      }
    });
  }).catch((e) => { if (!dead) t.on.error(e); });

  t.send = (data) => { if (conn && conn.open) conn.send(data); };
  t.close = () => {
    dead = true;
    try { conn && conn.close(); } catch { /* 이미 닫힘 */ }
    try { peer && peer.destroy(); } catch { /* 이미 닫힘 */ }
  };
  t.kind = 'peer';
  return t;
}

export function createTransport(kind, room, isHost) {
  return kind === 'local' ? localTransport(room, isHost) : peerTransport(room, isHost);
}
