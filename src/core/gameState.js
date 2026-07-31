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
import { makeStreams, dumpStreams, loadStreams, randomSeed } from './rng.js';
import { MODE, MODIFIERS, ENDLESS_WAVES, endlessStartWave, modifierScale, modifierMods, hasFlag, scoreMult } from './modes.js';

/** 포켓몬이든 도구든 id 하나로 정의를 찾는다 */
export const defOf = (id) => MONSTERS[id] || PROPS[id] || null;

export const PHASE = { PREP: 'PREP', COMBAT: 'COMBAT', WIN: 'WIN', LOSE: 'LOSE' };

let _uid = 1;
export const nextUid = () => _uid++;

export class GameState {
  constructor(stage = DEFAULT_STAGE) {
    this.seed = randomSeed();
    this.loadStage(stage);
  }

  /**
   * 스테이지 교체 + 초기화.
   * seed 를 주면 그 운으로 시작한다 — 대결 모드에서 둘이 같은 값을 쓴다.
   */
  loadStage(stage, seed = null, opts = {}) {
    if (seed != null) this.seed = seed;
    // 안 넘기면 '직전 판 그대로'가 아니라 '기본값'이다.
    // 예전에는 엔드리스를 하고 나서 대결에 들어가면 999웨이브 판이 열렸다.
    this.mode = opts.mode || MODE.NORMAL;
    this.modifiers = [...(opts.modifiers || [])];
    this.perks = [...(opts.perks || [])];
    this.stage = stage;
    this.path = buildPath(stage.waypoints, stage.platforms);
    this.reset();
  }

  get totalWaves() {
    if (this.mode === MODE.ENDLESS) return ENDLESS_WAVES;
    return this.stage.waves ?? BALANCE.wave.total;
  }

  /** 엔드리스인가 — 저장·기록·결과 문구가 갈린다 */
  get isEndless() { return this.mode === MODE.ENDLESS; }

  /** 이 판의 기록 배수 (도전 규칙의 합) */
  get scoreMult() { return scoreMult(this.modifiers); }

  /** 이 스테이지의 적 배율 (맵마다 난이도가 다르다) */
  get scale() {
    const base = { hp: 1, speed: 1, bounty: 1, ...(this.stage.scale || {}) };
    const m = modifierScale(this.modifiers);
    return { hp: base.hp * m.hp, speed: base.speed * m.speed, bounty: base.bounty * m.bounty };
  }

  reset() {
    const s = { ...BALANCE.start, ...(this.stage.start || {}) };
    // 모드·도전 규칙·배지 특전은 loadStage 에서 들어오고, 없으면 기본값이다
    this.mode = this.mode || MODE.NORMAL;
    this.modifiers = this.modifiers || [];
    this.perks = this.perks || [];
    this.rng = makeStreams(this.seed);   // 포획·특성·드랍 스트림
    this.phase = PHASE.PREP;
    this.bits = s.bits;
    this.life = s.life;
    this.maxLife = s.life;
    // 엔드리스는 정규 후반부터 — 앞부분을 다시 시키면 지루하기만 하다
    this.wave = this.mode === MODE.ENDLESS ? endlessStartWave(this.stage) : 1;
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
    this.noSave = false;            // 대결 판 — 이어하기로 같은 운을 다시 쓰지 못하게 막는다

    // 실시간 DPS 측정 — 최근 3초를 0.25초 버킷 12칸으로 굴린다.
    // 이론값(공격력×연사)이 아니라 실제로 들어간 피해라서, 상성·방어·놓친 샷이
    // 전부 반영된다. "지금 이 배치가 실제로 얼마나 때리고 있나"를 보여주는 것이 목적.
    this.dmgBuckets = new Array(12).fill(0);
    this.dmgBucketT = 0;
    this.totalDamage = 0;
    this.peakDps = 0;

    this.synergy = {};
    this.adjacency = {};            // uid → 인접 보정
    this.rentPaid = [];             // 납부 완료한 유지비 웨이브
    this.lostTo = null;             // 'rent' 면 압류 패배
    this.selectedTowerUid = null;   // 필드에서 선택된 타워
    this.buildMonsterId = null;     // 배치 예정 대상 (도구 또는 잡은 포켓몬)
    this.buildDef = null;
    this.summons = 0;               // 누적 소환 횟수 (비용 상승)
    this.pending = null;            // 잡았지만 아직 안 놓은 포켓몬
    this.speed = 1;                 // 1x / 2x / 3x
    this.log = [];
    this.shake = null;              // 화면 흔들림 { mag, t, ttl }
    this.hitstop = 0;               // 큰 타격 순간 시간이 멎는 시간(초)
    this.combo = { count: 0, t: 0 };
    this.vignette = null;           // 화면 가장자리 섬광 { color, t, ttl }
    this.newBest = false;
    this.banner = null;             // 캔버스 중앙 배너 { text, sub, t, ttl }

    // ── 특성 ──
    this.augments = [];
    // 도전 규칙과 배지 특전은 특성(mods)과 같은 계층에 얹는다 —
    // 그래서 전투·경제 시스템은 어디서 온 값인지 알 필요가 없다
    this.mods = { ...computeMods([]), ...modifierMods(this.modifiers) };
    if (this.perks.includes('shinyLuck')) this.mods.shinyLuck = 2;      // 이로치 3배
    if (this.perks.includes('ballDiscount')) this.mods.ballStepMult = -0.25;
    this.rerolls = REROLLS + (this.perks.includes('extraReroll') ? 1 : 0);
    this.noAugment = hasFlag(this.modifiers, 'noAugment');
    this.noProps = hasFlag(this.modifiers, 'noProps');
    this.costlyBall = hasFlag(this.modifiers, 'costlyBall');
    this.offer = null;              // 진행 중인 특성 선택 { list, wave }
    this.offeredWaves = [];

    // 고스트 레이스 — 웨이브마다 남은 라이프를 적어 둔다.
    // 같은 시드면 운이 같으므로, 공유할 게 이것뿐이다.
    this.ghostLives = [];

    // 즉시 효과가 있는 도전 규칙 (라이프 1, 코인 −30% 등)
    for (const id of this.modifiers) {
      const m = MODIFIERS.find((x) => x.id === id);
      if (m?.apply) m.apply(this);
    }
    // 배지 특전 — 시작 자원
    if (this.perks.includes('startStone')) this.items.disks += 1;
  }

  // ── 실시간 DPS ──
  /** 전투 시스템이 피해를 넣을 때마다 부른다 */
  recordDamage(dmg) {
    this.dmgBuckets[0] += dmg;
    this.totalDamage += dmg;
  }

  /** 게임 시간이 흐를 때마다 창을 민다 */
  advanceDpsWindow(dt) {
    this.dmgBucketT += dt;
    while (this.dmgBucketT >= 0.25) {
      this.dmgBucketT -= 0.25;
      this.dmgBuckets.pop();
      this.dmgBuckets.unshift(0);
    }
    if (this.phase === PHASE.COMBAT) this.peakDps = Math.max(this.peakDps, this.dps);
  }

  /** 최근 3초 평균 실효 DPS */
  get dps() {
    let s = 0;
    for (const b of this.dmgBuckets) s += b;
    return s / 3;
  }

  // ── 특성 ──
  hasAugment(id) { return this.augments.includes(id); }

  openOffer(wave) {
    if (this.noAugment) return;          // 도전 규칙 '무특성'
    this.offer = { list: rollOffer(this.augments, this.rng.augment), wave };
  }

  rerollOffer() {
    if (!this.offer || this.rerolls <= 0) return false;
    this.rerolls--;
    this.offer.list = rollOffer(this.augments, this.rng.augment);
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
    this.pushLog(`특성 획득 — ${a.name}`);
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

  addTower(monsterId, c, r, x, y, invested, shiny = false) {
    const t = {
      uid: nextUid(),
      monsterId,
      def: defOf(monsterId),
      shiny,          // 이로치 — 도트 색이 다르고 스탯이 조금 높다
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
      seed: this.seed,
      mode: this.mode,
      modifiers: [...this.modifiers],
      perks: [...this.perks],
      rs: dumpStreams(this.rng),     // 난수 스트림 위치 — 이어해도 같은 운을 이어간다
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
      towers: this.towers.map((t) => ({ m: t.monsterId, c: t.c, r: t.r, i: t.invested, s: t.shiny ? 1 : 0 })),
    };
  }

  restore(snap) {
    this.loadStage(stageById(snap.stageId), snap.seed ?? this.seed,
      { mode: snap.mode, modifiers: snap.modifiers || [], perks: snap.perks || [] });
    loadStreams(this.rng, snap.rs);
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
      this.addTower(t.m, t.c, t.r, x, y, t.i, !!t.s);
    }
    this.pushLog(`이어하기 — ${this.stage.name} 웨이브 ${this.wave}`);
  }
}
