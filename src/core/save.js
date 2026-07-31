// ─────────────────────────────────────────────────────────────
// save.js — localStorage 저장 (진행도 + 진행 중인 판)
//
// 두 가지를 따로 저장한다.
//  1) 진행도(meta) : 스테이지별 최고 웨이브·클리어 여부·설정. 절대 지워지지 않는다.
//  2) 진행 중인 판(run) : 이어하기용 스냅샷. 판이 끝나면 지운다.
//
// 저장 실패(사생활 보호 모드 등)해도 게임은 그대로 돌아가야 하므로 전부 try로 감싼다.
// ─────────────────────────────────────────────────────────────
import { STAGES, stageById } from '../data/stages.js';

const META_KEY = 'pokemontd_meta_v1';
const RUN_KEY = 'pokemontd_run_v1';
const LEGACY_BEST = 'digimontd_best_wave';

// 포켓몬 테마로 바꾸기 전의 저장 키. 이미 진행한 사람의 기록을 버리지 않으려고
// 첫 실행 때 한 번만 새 키로 옮긴다 (옮긴 뒤 옛 키는 지운다).
const OLD_KEYS = { 'digimontd_meta_v1': 'pokemontd_meta_v1', 'digimontd_run_v1': 'pokemontd_run_v1' };
try {
  for (const [from, to] of Object.entries(OLD_KEYS)) {
    const v = localStorage.getItem(from);
    if (v !== null && localStorage.getItem(to) === null) localStorage.setItem(to, v);
    if (v !== null) localStorage.removeItem(from);
  }
} catch { /* 저장이 막힌 브라우저 — 그냥 넘어간다 */ }

// dex: { [monsterId]: 1|2|4 비트마스크 } — 잡음(1) / 진화시킴(2) / 이로치로 봄(4)
// 셋을 따로 세는 이유는 도감에서 "봤다"와 "키웠다"를 구분해 보여주기 위함이다.
export const DEX_CAUGHT = 1;
export const DEX_GROWN = 2;
export const DEX_SHINY = 4;

const emptyMeta = () => ({
  v: 2,
  stages: {},        // { [stageId]: { best, cleared, runs, endless } }
  dex: {},           // { [monsterId]: 비트마스크 }
  settings: { speed: 1 },
});

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

/**
 * localStorage 를 실제로 쓸 수 있는가.
 * 시크릿 모드·저장공간 차단·서드파티 쿠키 차단(iframe 안) 에서는 예외가 난다.
 * 이 경우 저장이 조용히 실패하므로 UI가 미리 알려줘야 한다.
 */
export function storageWorks() {
  try {
    localStorage.setItem('__dtd_probe__', '1');
    localStorage.removeItem('__dtd_probe__');
    return true;
  } catch { return false; }
}

// ── 진행도 ──
let meta = null;

export function loadMeta() {
  if (meta) return meta;
  meta = read(META_KEY) || emptyMeta();
  // v1 → v2: 도감이 없던 시절의 저장에도 빈 칸을 만들어 준다
  if (!meta.stages) meta.stages = {};
  if (!meta.dex) meta.dex = {};
  if (!meta.settings) meta.settings = { speed: 1 };
  meta.v = 2;

  // 구버전(단일 최고 기록)에서 넘어온 값을 1스테이지 기록으로 옮긴다
  try {
    const legacy = parseInt(localStorage.getItem(LEGACY_BEST) || '0', 10);
    if (legacy > 0) {
      const s = stageRecord(STAGES[0].id);
      if (legacy > s.best) s.best = legacy;
      localStorage.removeItem(LEGACY_BEST);
      write(META_KEY, meta);
    }
  } catch { /* ignore */ }

  return meta;
}

export function stageRecord(stageId) {
  const m = loadMeta();
  if (!m.stages[stageId]) m.stages[stageId] = { best: 0, cleared: false, runs: 0, endless: 0 };
  if (m.stages[stageId].endless === undefined) m.stages[stageId].endless = 0;
  return m.stages[stageId];
}

/**
 * 판이 끝났을 때 기록 갱신. 최고 기록을 새로 세웠으면 true.
 * endless 판은 정규 기록과 따로 센다 — 무한 모드 200웨이브가 정규 30웨이브
 * 클리어 기록을 덮어쓰면 해금 조건이 이상해진다.
 */
export function recordRun(stageId, reachedWave, won, endless = false) {
  const rec = stageRecord(stageId);
  rec.runs++;
  if (endless) {
    const isBest = reachedWave > rec.endless;
    if (isBest) rec.endless = reachedWave;
    write(META_KEY, meta);
    return isBest;
  }
  if (won) rec.cleared = true;
  const isBest = reachedWave > rec.best;
  if (isBest) rec.best = reachedWave;
  write(META_KEY, meta);
  return isBest;
}

// ── 도감 ──
/** 잡거나 진화시킬 때마다 호출. 새로 채워진 칸이 있으면 true */
export function dexMark(monsterId, flags) {
  const m = loadMeta();
  const before = m.dex[monsterId] || 0;
  const after = before | flags;
  if (after === before) return false;
  m.dex[monsterId] = after;
  write(META_KEY, m);
  return true;
}

export const dexOf = (monsterId) => loadMeta().dex[monsterId] || 0;
export const dexAll = () => loadMeta().dex;

// ── 지방 배지 ──
/** 한 지방의 스테이지를 전부 클리어했으면 배지를 가진 것으로 본다 */
export function hasBadge(region, stagesOfRegion) {
  return stagesOfRegion.length > 0 && stagesOfRegion.every((s) => stageRecord(s.id).cleared);
}

export const isTutorialDone = () => !!loadMeta().settings.tutorialDone;
export function setTutorialDone(v = true) { setSetting('tutorialDone', v); }

export function setSetting(key, value) {
  const m = loadMeta();
  m.settings[key] = value;
  write(META_KEY, m);
}

export function getSetting(key, fallback) {
  const v = loadMeta().settings[key];
  return v === undefined ? fallback : v;
}

/** 해금 여부 + 사유 — UI가 "무엇을 해야 열리는지"를 그대로 보여줄 수 있게 함께 돌려준다 */
export function unlockState(stage) {
  if (!stage.unlock) return { unlocked: true, reason: '' };
  const need = stage.unlock;
  const rec = stageRecord(need.stage);
  const from = stageById(need.stage);
  if (rec.cleared || rec.best >= need.wave) return { unlocked: true, reason: '' };
  return {
    unlocked: false,
    reason: `${from.name} ${need.wave}웨이브 도달 시 해금 (현재 ${rec.best})`,
  };
}

export function resetProgress() {
  meta = emptyMeta();
  write(META_KEY, meta);
  clearRun();
}

// ── 진행 중인 판 ──
export function saveRun(snapshot) {
  return write(RUN_KEY, snapshot);
}

export function loadRun() {
  const run = read(RUN_KEY);
  if (!run || run.v !== 1) return null;
  if (!STAGES.some((s) => s.id === run.stageId)) return null;
  // 튜토리얼은 이어하기 대상이 아니다. 구버전이 남긴 튜토리얼 스냅샷은 여기서 버린다.
  if (run.stageId === 'tutorial') { clearRun(); return null; }
  return run;
}

export function clearRun() {
  try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ }
}
