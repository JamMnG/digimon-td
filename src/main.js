// ─────────────────────────────────────────────────────────────
// main.js — 엔트리포인트: 입력 처리 + 렌더 루프 배선
// 게임 로직은 core/stageManager 에, 그리기는 render/renderer 에,
// DOM은 ui/ui.js 에 있다. 이 파일은 그 셋을 잇는 얇은 계층.
// ─────────────────────────────────────────────────────────────
import { CANVAS } from './config/balance.js';
import { GameState, PHASE, defOf } from './core/gameState.js';
import * as stage from './core/stageManager.js';
import * as save from './core/save.js';
import { drawFrame } from './render/renderer.js';
import { initUI } from './ui/ui.js';
import { pxToTile, isBuildable } from './grid/pathGrid.js';
import { MONSTERS, STARTERS, validateMonsterData } from './data/monsters.js';
import { stageById } from './data/stages.js';
import { evolve, sellValue } from './evolution/evolutionTree.js';
import { megaEvolve, validateMegaData } from './evolution/megaTable.js';
import * as eco from './economy/economyManager.js';
import { createTutorial } from './tutorial/tutorial.js';
import { summon, releasePending } from './core/summon.js';
import { createVersus, VS } from './net/versus.js';
import { randomSeed } from './core/rng.js';
import { MODE, weeklyPlan } from './core/modes.js';
import { STAGES, REGIONS, stagesOfRegion } from './data/stages.js';

// 개발용 데이터 검증
const dataErrors = [...validateMonsterData(), ...validateMegaData()];
if (dataErrors.length) console.warn('[data] 데이터 오류:\n' + dataErrors.join('\n'));

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS.w;
canvas.height = CANVAS.h;

const state = new GameState();
state.speed = save.getSetting('speed', 1);
let hover = null;
const tutorial = createTutorial();

// 이번 세션에서 실제로 스테이지에 들어갔는가.
// 부팅 직후 state 는 아무도 시작하지 않은 기본 스테이지다. 이때 저장하면
// 진짜 저장된 판을 빈 판으로 덮어써 버린다 — 스테이지 목록에 있는 동안
// 탭을 닫거나 앱을 전환하면 저장이 날아가던 원인이 바로 이것이었다.
let runLive = false;

// 대결은 판 하나가 통째로 승부라 중간 저장을 하지 않는다.
// (이어하기로 되돌리면 같은 운을 두 번 쓰는 셈이 된다)
const versus = createVersus();

/** 지방을 다 깬 사람이 가진 특전들 — 힘이 아니라 선택지를 준다 */
function earnedPerks() {
  return REGIONS
    .filter((r) => save.hasBadge(r.id, stagesOfRegion(r.id)))
    .map((r) => r.perk);
}

// 남과 기록을 겨루는 모드(대결·고스트·주간)에서는 배지 특전을 끈다.
// 리롤 횟수나 볼 값이 사람마다 다르면 "같은 판을 같은 운으로"가 거짓말이 된다.
// 배지는 일반 스테이지와 엔드리스에서만 힘을 쓴다.
const FAIR = [];

const HINT_DEFAULT = '몬스터볼(Q)을 던져 포켓몬을 잡고, 풀숲 위 빈 칸을 클릭해 배치하세요.';

// 단축키에서도 같은 동작을 부르므로 이름을 붙여 둔다
const handlers = {
  onPickShop: (id) => {
    state.buildMonsterId = state.buildMonsterId === id ? null : id;
    state.buildDef = state.buildMonsterId ? defOf(state.buildMonsterId) : null;
    ui.setHint(state.buildMonsterId
      ? `${defOf(id).name} 배치 — 풀숲 위 빈 칸 클릭 (Esc 취소)`
      : '배치를 취소했습니다.');
    ui.invalidate();
  },

  onSummon: () => {
    const res = summon(state);
    if (!res.ok) { ui.setHint(res.reason, true); ui.invalidate(); return; }
    // 잡은 포켓몬은 곧바로 배치 대기 상태가 된다
    state.buildMonsterId = state.pending.id;
    state.buildDef = defOf(state.pending.id);
    ui.setHint(`${state.buildDef.name} 포획! 풀숲 위 빈 칸을 클릭해 배치하세요.`);
    flushSave();
    ui.invalidate();
  },

  onReleasePending: () => {
    const back = releasePending(state);
    state.buildMonsterId = null;
    state.buildDef = null;
    ui.setHint(`배치를 취소했습니다 (+${back} 코인)`);
    flushSave();
    ui.invalidate();
  },

  onBuyItem: (item) => {
    if (eco.buyItem(state, item)) {
      ui.setHint(`${eco.ITEM_NAME[item]} 구매 완료`);
      flushSave();
    } else {
      ui.setHint('코인이 부족합니다.', true);
    }
    ui.invalidate();
  },

  onStartWave: (opts) => {
    if (stage.beginWave(state, opts)) ui.invalidate();
  },

  onToggleSpeed: () => {
    state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
    save.setSetting('speed', state.speed);
    ui.invalidate();
  },

  onEvolve: (toId) => {
    const t = state.selectedTower();
    if (!t) return;
    const from = t.def.name;
    if (evolve(state, t, toId)) {
      ui.setHint(`${from} → ${t.def.name} 진화 완료!`);
      flushSave();
    } else {
      ui.setHint('진화 조건을 충족하지 못했습니다.', true);
    }
    ui.invalidate();
  },

  onMega: (partnerUid) => {
    const keep = state.selectedTower();
    const partner = state.towers.find((t) => t.uid === partnerUid);
    if (!keep || !partner) return;
    const names = [keep.def.name, partner.def.name];
    if (megaEvolve(state, keep, partner)) {
      ui.setHint(`${names[0]} + ${names[1]} → ${keep.def.name} 메가진화 성공!`);
      flushSave();
    } else {
      ui.setHint('메가진화 조건을 충족하지 못했습니다.', true);
    }
    ui.invalidate();
  },

  onSell: () => {
    const t = state.selectedTower();
    if (!t) return;
    const refund = sellValue(t, state);
    eco.gain(state, refund);
    state.pushLog(`${t.def.name} 방생 — 코인 +${refund}`);
    state.removeTower(t);
    ui.setHint(`방생 완료 (+${refund} 코인)`);
    flushSave();
    ui.invalidate();
  },

  onTakeAugment: (id) => {
    if (state.takeAugment(id)) {
      ui.setHint('특성 획득 — 이번 판 내내 유지됩니다.');
      flushSave();
    }
    ui.invalidate();
  },

  onReroll: () => {
    if (!state.rerollOffer()) ui.setHint('리롤을 모두 사용했습니다.', true);
    flushSave();
    ui.invalidate();
  },

  onRestart: () => {
    // 대결이 끝난 뒤 '다시 도전'은 혼자 하는 판이다.
    // 같은 시드로 재시작하면 이미 아는 운을 다시 쓰는 셈이라 방을 먼저 닫는다.
    if (versus.active) { versus.leave(); state.seed = randomSeed(); }
    state.reset();
    state.speed = save.getSetting('speed', 1);
    runLive = true;
    afterStageChange();
    flushSave();
  },

  // 진행 중인 판에서 메뉴로 나가는 순간 — 여기서 저장하지 않으면
  // 나갔다 온 사이의 진행이 통째로 사라진다
  onLeaveToMenu: () => { flushSave(); },

  // 스테이지 카드를 눌러 '새로' 시작하는 경로. UI가 이미 확인을 받았다.
  onSelectStage: (stageId, opts = {}) => {
    if (versus.active) versus.leave();
    if (stageId === 'tutorial') { startTutorial(); return; }
    stopTutorial();
    save.clearRun();
    const mode = opts.mode || MODE.NORMAL;
    const seed = opts.seed ?? randomSeed();
    state.loadStage(stageById(stageId), seed, {
      mode, modifiers: opts.modifiers || [], perks: earnedPerks(),
    });
    state.noSave = false;
    state.bannedLines = null; state.versusSend = null; state.incoming = 0; state.ghost = null;
    state.speed = save.getSetting('speed', 1);
    runLive = true;
    afterStageChange();
    flushSave();                     // 들어선 즉시 이어하기 지점을 만든다
    const tagline = mode === MODE.ENDLESS ? '엔드리스'
      : mode === MODE.WEEKLY ? '주간 챌린지' : (state.stage.tag || '');
    state.showBanner(state.stage.name, tagline, 2.0);
  },

  /** 주간 챌린지 — 그 주 시드로 스테이지·도전 규칙이 고정된다 */
  onWeekly: () => {
    const plan = weeklyPlan(STAGES);
    ui.closeStageSelect();
    if (versus.active) versus.leave();
    stopTutorial();
    save.clearRun();
    state.loadStage(plan.stage, plan.seed, {
      mode: MODE.WEEKLY, modifiers: plan.mods, perks: FAIR,
    });
    state.noSave = false;
    state.bannedLines = null; state.versusSend = null; state.incoming = 0; state.ghost = null;
    state.speed = save.getSetting('speed', 1);
    runLive = true;
    afterStageChange();
    flushSave();
    state.showBanner('주간 챌린지', `${plan.week} · ${plan.stage.name}`, 2.4);
  },

  onResume: () => {
    const run = save.loadRun();
    if (!run) return;
    if (versus.active) versus.leave();
    stopTutorial();
    state.restore(run);
    runLive = true;
    afterStageChange();
    state.showBanner('이어하기', `웨이브 ${state.wave}`, 1.8);
  },

  onResetProgress: () => {
    save.resetProgress();
    stopTutorial();
    runLive = false;
    state.reset();
    afterStageChange();
  },

  onTutorialNext: () => {
    tutorial.next(state, onTutorialStep);
    if (tutorial.active) syncTutorial(); else finishTutorial();
    ui.invalidate();
  },

  onTutorialSkip: () => {
    stopTutorial();
    save.setTutorialDone();
    save.clearRun();
    ui.setHint('튜토리얼을 건너뛰었습니다. 스테이지 목록에서 언제든 다시 볼 수 있습니다.');
    ui.openStageSelect();
  },

  // ── 대결 ──
  vsState: () => versus.state,
  onVsHost: (room, stageId, kind) => versus.host(room, stageId, kind),
  onVsJoin: (room, kind) => versus.join(room, kind),
  onVsBegin: () => startVersus(),
  onVsLeave: () => versus.leave(),
  /** 고스트 레이스 — 친구 기록과 같은 시드로 달린다 */
  onGhostRace: (g) => {
    if (versus.active) versus.leave();
    stopTutorial();
    save.clearRun();
    state.loadStage(stageById(g.stageId), g.seed, {
      // 기록을 남긴 사람과 같은 특전으로 달린다 (코드에 담겨 온다)
      mode: MODE.NORMAL, modifiers: g.modifiers || [], perks: g.perks || FAIR,
    });
    state.noSave = false;
    state.bannedLines = null; state.versusSend = null; state.incoming = 0;
    state.ghost = g;                       // UI가 매 웨이브 비교해 보여준다
    state.speed = save.getSetting('speed', 1);
    runLive = true;
    afterStageChange();
    flushSave();
    state.showBanner('고스트 레이스', `상대 기록 ${g.reached}웨이브`, 2.4);
    ui.setHint('같은 시드로 친구의 기록과 겨룹니다. 같은 웨이브에서 라이프가 많으면 앞선 것입니다.');
  },

  onVsBan: (id) => versus.toggleBan(id),
  onVsBanConfirm: () => versus.confirmBans(),

  /** 선택한 유닛을 들었다 놓기 — 다음 빈 칸 클릭이 목적지가 된다 */
  onMoveStart: () => {
    const t = state.selectedTower();
    if (!t) { ui.setHint('옮길 유닛을 먼저 클릭하세요.', true); ui.invalidate(); return; }
    if (state.phase !== PHASE.PREP) {
      ui.setHint('웨이브 중에는 옮길 수 없습니다. 웨이브 사이에만 재배치할 수 있습니다.', true);
      ui.invalidate(); return;
    }
    state.movingUid = state.movingUid === t.uid ? null : t.uid;
    ui.setHint(state.movingUid
      ? `${t.def.name} 이동 — 옮길 빈 칸을 클릭하세요 (Esc 취소)`
      : '이동을 취소했습니다.');
    ui.invalidate();
  },
};

const ui = initUI(state, handlers);

// 로비 상태가 바뀔 때마다 스테이지 화면을 다시 그린다.
// 참가자 쪽은 방장이 '대결 시작'을 누르는 순간 begin 신호로 같이 들어간다.
versus.onChange((vs) => {
  if (vs.phase === VS.PLAYING && ui.isMenuOpen()) enterVersusStage();
  if (ui.isMenuOpen()) ui.drawVersus();
  ui.invalidate();
});

/** 방장이 시작을 누름 — begin 이 양쪽 onChange 를 거쳐 enterVersusStage 로 이어진다 */
function startVersus() {
  if (versus.state.stageId) versus.begin();
}

function enterVersusStage() {
  const vs = versus.state;
  if (!vs.stageId) return;
  stopTutorial();
  runLive = false;              // 대결 판은 이어하기로 저장하지 않는다
  save.clearRun();
  state.loadStage(stageById(vs.stageId), vs.seed, { perks: FAIR });
  state.noSave = true;          // 웨이브 클리어 자동저장까지 막는다
  state.bannedLines = vs.banned;                 // 밴픽 결과가 소환 풀에서 빠진다
  state.incoming = 0;
  state.versusSend = (n) => versus.sendGarbage(n);   // 웨이브를 빨리 깨면 상대에게
  state.speed = save.getSetting('speed', 1);
  afterStageChange();
  ui.closeStageSelect();
  state.showBanner('대결 시작', `${state.stage.name} · 방 ${vs.room}`, 2.2);
  ui.setHint('대결 중 — 웨이브를 라이프 손실 없이 빨리 깨면 상대에게 적을 보냅니다.');
}

// ── 튜토리얼 ──
function onTutorialStep() { ui.invalidate(); }

function startTutorial() {
  save.clearRun();
  runLive = false;                    // 튜토리얼은 이어하기 대상이 아니다
  ui.closeStageSelect();
  state.loadStage(stageById('tutorial'));
  state.speed = save.getSetting('speed', 1);
  afterStageChange();
  tutorial.start(state, onTutorialStep);
  syncTutorial();
}

function stopTutorial() {
  tutorial.stop();
  state.tutorialTiles = [];
  ui.showCoach(null);
}

function syncTutorial() {
  if (!tutorial.active) { ui.showCoach(null); return; }
  state.tutorialTiles = tutorial.tiles(state);
  ui.showCoach(tutorial.step, tutorial.index, tutorial.total, tutorial.waiting);
}

/** 마지막 단계까지 마쳤을 때 — 어느 경로로 끝나든 여기 한 곳만 지난다 */
function finishTutorial() {
  stopTutorial();
  save.setTutorialDone();
  save.clearRun();
  ui.setHint('튜토리얼 완료! 스테이지를 골라 시작하세요.');
  ui.openStageSelect();
}

function afterStageChange() {
  stage.maybeOfferAugment(state);
  hover = null;
  ui.setHint(HINT_DEFAULT);
  ui.setTab('build');
  ui.invalidate();
}

// ── 입력 ──
function canvasPos(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (CANVAS.w / r.width),
    y: (ev.clientY - r.top) * (CANVAS.h / r.height),
  };
}

canvas.addEventListener('mousemove', (ev) => {
  const p = canvasPos(ev);
  const { c, r } = pxToTile(p.x, p.y);
  hover = { c, r, buildable: isBuildable(state.path, state.occupied, c, r) };
});

canvas.addEventListener('mouseleave', () => { hover = null; });

canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  if (!state.pending) { state.buildMonsterId = null; state.buildDef = null; }
  state.selectedTowerUid = null;
  ui.invalidate();
});

canvas.addEventListener('click', (ev) => {
  const p = canvasPos(ev);
  const { c, r } = pxToTile(p.x, p.y);

  // 이동 대기 중이면 이 클릭이 곧 목적지다
  if (state.movingUid != null) {
    const res = stage.moveTower(state, state.movingUid, p.x, p.y);
    if (typeof res === 'string') {
      ui.setHint(res, true);
    } else {
      if (res) {
        state.pushLog(`${res.def.name} 이동`);
        ui.setHint(`${res.def.name} 이동 완료. 인접 효과가 다시 계산되었습니다.`);
        flushSave();
      }
      state.movingUid = null;
    }
    ui.invalidate();
    return;
  }

  const existing = state.towerAt(c, r);
  if (existing) {
    // 배치 대기 중에 찬 칸을 누른 건 오조작이다 — 탭을 옮기지 않고 알려만 준다
    if (state.pending) {
      ui.setHint('그 칸에는 이미 유닛이 있습니다. 빈 풀숲 칸을 클릭하세요.', true);
      ui.invalidate();
      return;
    }
    state.buildMonsterId = null;
    state.buildDef = null;
    state.selectedTowerUid = existing.uid;
    ui.setTab('unit');                    // 유닛을 '클릭'했을 때만 정보 탭을 연다
    ui.setHint(`${existing.def.name} 선택 — 진화·메가진화 선택지를 확인하세요.`);
    ui.invalidate();
    return;
  }

  if (state.buildMonsterId) {
    const res = stage.placeTower(state, state.buildMonsterId, p.x, p.y);
    if (typeof res === 'string') {
      ui.setHint(res, true);
    } else {
      state.pushLog(`${res.def.name} 배치`);
      ui.setHint(`${res.def.name} 배치 완료. 계속 배치하려면 다시 클릭하세요.`);
      flushSave();
      // 소환분은 1기뿐이고, 도구는 코인이 남는 동안 연속 배치
      const def = defOf(state.buildMonsterId);
      if (!def.prop || state.bits < stage.towerCost(state, def)) {
        state.buildMonsterId = null;
        state.buildDef = null;
      }
    }
    ui.invalidate();
    return;
  }

  state.selectedTowerUid = null;
  ui.invalidate();
});

window.addEventListener('keydown', (ev) => {
  // 입력칸(방 코드·고스트 코드)에 타이핑 중이면 단축키가 가로채면 안 된다
  const tag = (ev.target && ev.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (ev.key === 'Escape') {
    if (!state.pending) { state.buildMonsterId = null; state.buildDef = null; }
    state.selectedTowerUid = null;
    state.movingUid = null;
    ui.invalidate();
  } else if (ev.code === 'Space') {
    ev.preventDefault();
    if (stage.beginWave(state)) ui.invalidate();
  } else if (ev.key === 'q' || ev.key === 'Q') {
    ui.click('#btn-summon');
  } else if (ev.key === 's' || ev.key === 'S') {
    // 방생 — 하나씩 클릭해서 파는 게 번거롭다는 피드백
    handlers.onSell();
  } else if (ev.key === 'e' || ev.key === 'E') {
    ui.click('#btn-evolve');                  // 첫 진화 선택지로 바로
  } else if (ev.key === 'm' || ev.key === 'M') {
    handlers.onMoveStart();
  }
});

// 창을 닫거나 앱을 전환해도 지점이 남게 한다.
// 모바일 브라우저는 beforeunload 를 거의 쏘지 않으므로 pagehide/visibilitychange 가 본선이다.
// 단, 판에 들어가지 않았으면 절대 쓰지 않는다 (빈 판이 진짜 저장을 덮어쓴다).
function flushSave() {
  if (!runLive || tutorial.active) return false;
  return stage.autosave(state);
}
window.addEventListener('beforeunload', flushSave);
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

// ── 메인 루프 ──
function tick(dt, now = performance.now()) {
  // 스테이지 목록이 덮고 있는 동안에는 게임 시간이 흐르지 않는다.
  // (예전에는 계속 흘러서, 메뉴를 보는 사이 패배하면 저장까지 지워졌다)
  if (!ui.isMenuOpen()) {
    const wasPlaying = state.phase === PHASE.PREP || state.phase === PHASE.COMBAT;
    stage.update(state, dt);
    if (tutorial.active) {
      const before = tutorial.index;
      tutorial.update(state, onTutorialStep);
      if (!tutorial.active) finishTutorial();
      else if (tutorial.index !== before) syncTutorial();
    }
    if (versus.state.phase === VS.PLAYING) {
      versus.update(state, dt);
      const got = versus.takeIncoming();
      if (got) state.incoming = (state.incoming || 0) + got;
      // 내 판이 방금 끝났다 — 최종 웨이브를 보내고 상대 결과를 기다린다
      if (wasPlaying && (state.phase === PHASE.WIN || state.phase === PHASE.LOSE)) {
        versus.finish(state);
      }
    }
  }
  drawFrame(ctx, state, hover);
  ui.refresh(now);
}

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  tick(dt, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 첫 실행이면 튜토리얼부터, 이미 봤으면 스테이지 선택
if (save.isTutorialDone()) ui.openStageSelect();
else startTutorial();

// 디버그 핸들 (콘솔에서 밸런스·UI 확인용)
window.DTD = { state, PHASE, stage, ui, tick, save, tutorial, startTutorial, versus };
