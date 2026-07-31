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
import { jogress, validateJogressData } from './evolution/jogressTable.js';
import * as eco from './economy/economyManager.js';
import { createTutorial } from './tutorial/tutorial.js';
import { summon, releasePending } from './core/summon.js';

// 개발용 데이터 검증
const dataErrors = [...validateMonsterData(), ...validateJogressData()];
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

const HINT_DEFAULT = '소환(Q)으로 디지몬을 뽑고, 잔디 위 빈 칸을 클릭해 배치하세요.';

const ui = initUI(state, {
  onPickShop: (id) => {
    state.buildMonsterId = state.buildMonsterId === id ? null : id;
    state.buildDef = state.buildMonsterId ? defOf(state.buildMonsterId) : null;
    ui.setHint(state.buildMonsterId
      ? `${defOf(id).name} 배치 — 잔디 위 빈 칸 클릭 (Esc 취소)`
      : '배치를 취소했습니다.');
    ui.invalidate();
  },

  onSummon: () => {
    const res = summon(state);
    if (!res.ok) { ui.setHint(res.reason, true); ui.invalidate(); return; }
    // 소환된 디지몬은 곧바로 배치 대기 상태가 된다
    state.buildMonsterId = state.pending.id;
    state.buildDef = defOf(state.pending.id);
    ui.setHint(`${state.buildDef.name} 소환! 잔디 위 빈 칸을 클릭해 배치하세요.`);
    flushSave();
    ui.invalidate();
  },

  onReleasePending: () => {
    const back = releasePending(state);
    state.buildMonsterId = null;
    state.buildDef = null;
    ui.setHint(`배치를 취소했습니다 (+${back} 비트)`);
    flushSave();
    ui.invalidate();
  },

  onBuyItem: (item) => {
    if (eco.buyItem(state, item)) {
      ui.setHint(`${eco.ITEM_NAME[item]} 구매 완료`);
      flushSave();
    } else {
      ui.setHint('비트가 부족합니다.', true);
    }
    ui.invalidate();
  },

  onStartWave: () => {
    if (stage.beginWave(state)) ui.invalidate();
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

  onJogress: (partnerUid) => {
    const keep = state.selectedTower();
    const partner = state.towers.find((t) => t.uid === partnerUid);
    if (!keep || !partner) return;
    const names = [keep.def.name, partner.def.name];
    if (jogress(state, keep, partner)) {
      ui.setHint(`${names[0]} + ${names[1]} → ${keep.def.name} 죠그레스 성공!`);
      flushSave();
    } else {
      ui.setHint('죠그레스 조건을 충족하지 못했습니다.', true);
    }
    ui.invalidate();
  },

  onSell: () => {
    const t = state.selectedTower();
    if (!t) return;
    const refund = sellValue(t, state);
    eco.gain(state, refund);
    state.pushLog(`${t.def.name} 매각 — 비트 +${refund}`);
    state.removeTower(t);
    ui.setHint(`매각 완료 (+${refund} 비트)`);
    flushSave();
    ui.invalidate();
  },

  onTakeAugment: (id) => {
    if (state.takeAugment(id)) {
      ui.setHint('증강 획득 — 이번 판 내내 유지됩니다.');
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
  onSelectStage: (stageId) => {
    if (stageId === 'tutorial') { startTutorial(); return; }
    stopTutorial();
    save.clearRun();
    state.loadStage(stageById(stageId));
    state.speed = save.getSetting('speed', 1);
    runLive = true;
    afterStageChange();
    flushSave();                     // 들어선 즉시 이어하기 지점을 만든다
    state.showBanner(state.stage.name, state.stage.tag || '', 2.0);
  },

  onResume: () => {
    const run = save.loadRun();
    if (!run) return;
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
});

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

  const existing = state.towerAt(c, r);
  if (existing) {
    // 배치 대기 중에 찬 칸을 누른 건 오조작이다 — 탭을 옮기지 않고 알려만 준다
    if (state.pending) {
      ui.setHint('그 칸에는 이미 유닛이 있습니다. 빈 잔디 칸을 클릭하세요.', true);
      ui.invalidate();
      return;
    }
    state.buildMonsterId = null;
    state.buildDef = null;
    state.selectedTowerUid = existing.uid;
    ui.setTab('unit');                    // 유닛을 '클릭'했을 때만 정보 탭을 연다
    ui.setHint(`${existing.def.name} 선택 — 진화·죠그레스 선택지를 확인하세요.`);
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
      // 소환분은 1기뿐이고, 설치물은 비트가 남는 동안 연속 배치
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
  if (ev.key === 'Escape') {
    if (!state.pending) { state.buildMonsterId = null; state.buildDef = null; }
    state.selectedTowerUid = null;
    ui.invalidate();
  } else if (ev.code === 'Space') {
    ev.preventDefault();
    if (stage.beginWave(state)) ui.invalidate();
  } else if (ev.key === 'q' || ev.key === 'Q') {
    ui.click('#btn-summon');
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
    stage.update(state, dt);
    if (tutorial.active) {
      const before = tutorial.index;
      tutorial.update(state, onTutorialStep);
      if (!tutorial.active) finishTutorial();
      else if (tutorial.index !== before) syncTutorial();
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
window.DTD = { state, PHASE, stage, ui, tick, save, tutorial, startTutorial };
