// ─────────────────────────────────────────────────────────────
// gameState.js — 스테이지 전역 상태 컨테이너
// 로직 계층은 이 객체만 읽고 쓴다. 렌더/UI는 읽기만 한다.
//
// 스테이지 전환은 새 객체를 만들지 않고 loadStage()로 갈아끼운다.
// (ui/main이 잡고 있는 참조를 그대로 유지하기 위함)
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';
import { buildPath, tileKey } from '../grid/pathGrid.js';
import { DEFAULT_STAGE, stageById } from '../data/stages.js';
import { MONSTERS } from '../data/monsters.js';
import { PROPS } from '../data/props.js';

import { computeMods, applyInstant, augmentById, rollOffer, REROLLS } from '../augments/augments.js';

/** 디지몬이든 설치물이든 id 하나로 정의를 찾는다 */
export const defOf = (id) => MONSTERS[id] || PROPS[id] || null;

export const PHASE = { PREP: 'PREP', COMBAT: 'COMBAT', WIN: 'WIN', LOSE: 'LOSE' };

let _uid = 1;
export const nextUid = () => _uid++;

export class GameState {
  constructor(stage = DEFAULT_STAGE) {
    this.loadStage(stage);
  }

  /** 스테이지 교체 + 초기화 */
  loadStage(stage) {
    this.stage = stage;
    this.path = buildPath(stage.waypoints, stage.platforms);
    this.reset();
  }

  get totalWaves() {
    return this.stage.waves ?? BALANCE.wave.total;
  }

  /** 이 스테이지의 적 배율 (맵마다 난이도가 다르다) */
  get scale() {
    return { hp: 1, speed: 1, bounty: 1, ...(this.stage.scale || {}) };
  }

  reset() {
    const s = { ...BALANCE.start, ...(this.stage.start || {}) };
    this.phase = PHASE.PREP;
    this.bits = s.bits;
    this.life = s.life;
    this.maxLife = s.life;
    this.wave = 1;
    this.kills = 0;
    this.leaked = 0;

    this.items = { chips: s.chips, disks: s.disks, cores: s.cores };
    this.purchases = { chips: 0, disks: 0, cores: 0 }; // 교환소 누적 구매(가격 상승용)

    this.towers = [];
    this.occupied = new Set();      // tileKey → 점유
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];

    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.clearDelay = 0;
    this.waveStart = null;          // 이번 웨이브를 시작한 순간의 스냅샷 (전투 중 이어하기용)

    this.synergy = {};
    this.adjacency = {};            // uid → 인접 보정
    this.rentPaid = [];             // 납부 완료한 유지비 웨이브
    this.lostTo = null;             // 'rent' 면 압류 패배
    this.selectedTowerUid = null;   // 필드에서 선택된 타워
    this.buildMonsterId = null;     // 배치 예정 대상 (설치물 또는 소환된 디지몬)
    this.buildDef = null;
    this.summons = 0;               // 누적 소환 횟수 (비용 상승)
    this.pending = null;            // 소환됐지만 아직 안 놓은 디지몬
    this.speed = 1;                 // 1x / 2x / 3x
    this.log = [];
    this.shake = null;              // 화면 흔들림 { mag, t, ttl }
    this.hitstop = 0;               // 큰 타격 순간 시간이 멎는 시간(초)
    this.combo = { count: 0, t: 0 };
    this.vignette = null;           // 화면 가장자리 섬광 { color, t, ttl }
    this.newBest = false;
    this.banner = null;             // 캔버스 중앙 배너 { text, sub, t, ttl }

    // ── 증강 ──
    this.augments = [];
    this.mods = computeMods([]);
    this.rerolls = REROLLS;
    this.offer = null;              // 진행 중인 증강 선택 { list, wave }
    this.offeredWaves = [];
  }

  // ── 증강 ──
  hasAugment(id) { return this.augments.includes(id); }

  openOffer(wave) {
    this.offer = { list: rollOffer(this.augments), wave };
  }

  rerollOffer() {
    if (!this.offer || this.rerolls <= 0) return false;
    this.rerolls--;
    this.offer.list = rollOffer(this.augments);
    return true;
  }

  takeAugment(id) {
    const a = augmentById(id);
    if (!a || this.hasAugment(id)) return false;
    this.augments.push(id);
    this.mods = computeMods(this.augments);
    applyInstant(this, a);
    if (this.offer) this.offeredWaves.push(this.offer.wave);
    this.offer = null;
    this.pushLog(`증강 획득 — ${a.name}`);
    return true;
  }

  // ── 타워 ──
  towerAt(c, r) {
    return this.towers.find((t) => t.c === c && t.r === r) || null;
  }

  selectedTower() {
    if (this.selectedTowerUid == null) return null;
    return this.towers.find((t) => t.uid === this.selectedTowerUid) || null;
  }

  addTower(monsterId, c, r, x, y, invested) {
    const t = {
      uid: nextUid(),
      monsterId,
      def: defOf(monsterId),
      c, r, x, y,
      cd: 0,
      salvoLeft: 0,
      salvoCd: 0,
      salvoTarget: null,
      aim: 0,        // 마지막 발사 방향 (표현용)
      recoil: 0,     // 발사 반동 1 → 0 (표현용)
      kills: 0,
      damage: 0,
      invested,
    };
    this.towers.push(t);
    this.occupied.add(tileKey(c, r));
    return t;
  }

  removeTower(t) {
    const i = this.towers.indexOf(t);
    if (i >= 0) this.towers.splice(i, 1);
    this.occupied.delete(tileKey(t.c, t.r));
    if (this.selectedTowerUid === t.uid) this.selectedTowerUid = null;
  }

  // ── 이펙트 / 로그 / 배너 ──
  fx(obj) {
    this.effects.push({ ttl: 0.4, t: 0.4, ...obj });
  }

  pushLog(text) {
    this.log.unshift(text);
    if (this.log.length > 6) this.log.pop();
  }

  showBanner(text, sub = '', ttl = 1.9) {
    this.banner = { text, sub, t: ttl, ttl };
  }

  isBossWave() {
    return this.wave % BALANCE.scaling.bossEveryN === 0;
  }

  score() {
    return this.wave * 100 + this.kills * 3 + this.life * 20;
  }

  // ── 이어하기 스냅샷 ──
  // 타워는 (몬스터, 좌표, 투자액)만 있으면 완전히 복원된다. 전투 중 상태
  // (적·투사체·쿨다운)는 저장하지 않는다 — 준비 페이즈에서만 저장하기 때문.
  serialize() {
    return {
      v: 1,
      stageId: this.stage.id,
      wave: this.wave,
      bits: Math.floor(this.bits),
      life: this.life,
      kills: this.kills,
      leaked: this.leaked,
      items: { ...this.items },
      purchases: { ...this.purchases },
      speed: this.speed,
      maxLife: this.maxLife,
      augments: [...this.augments],
      rerolls: this.rerolls,
      offeredWaves: [...this.offeredWaves],
      rentPaid: [...this.rentPaid],
      summons: this.summons,
      towers: this.towers.map((t) => ({ m: t.monsterId, c: t.c, r: t.r, i: t.invested })),
    };
  }

  restore(snap) {
    this.loadStage(stageById(snap.stageId));
    this.wave = snap.wave;
    this.bits = snap.bits;
    this.life = snap.life;
    this.kills = snap.kills || 0;
    this.leaked = snap.leaked || 0;
    this.items = { chips: 0, disks: 0, cores: 0, ...snap.items };
    this.purchases = { chips: 0, disks: 0, cores: 0, ...snap.purchases };
    this.speed = snap.speed || 1;
    this.maxLife = snap.maxLife || this.maxLife;
    // 증강은 즉시효과(라이프·자원)가 스냅샷 값에 이미 반영돼 있으므로 mods만 되살린다
    this.augments = [...(snap.augments || [])];
    this.mods = computeMods(this.augments);
    this.rerolls = snap.rerolls ?? REROLLS;
    this.offeredWaves = [...(snap.offeredWaves || [])];
    this.rentPaid = [...(snap.rentPaid || [])];
    this.summons = snap.summons || 0;
    for (const t of snap.towers || []) {
      if (!defOf(t.m)) continue;
      const x = t.c * BALANCE.grid.tile + BALANCE.grid.tile / 2;
      const y = t.r * BALANCE.grid.tile + BALANCE.grid.tile / 2;
      this.addTower(t.m, t.c, t.r, x, y, t.i);
    }
    this.pushLog(`이어하기 — ${this.stage.name} 웨이브 ${this.wave}`);
  }
}
