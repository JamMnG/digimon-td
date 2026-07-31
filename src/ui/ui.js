// ─────────────────────────────────────────────────────────────
// ui.js — DOM 계층 (HUD / 스테이지 선택 / 탭 패널 / 결과)
// 상태를 읽어 DOM에 반영하기만 하고, 변경은 handlers 콜백으로 위임한다.
// ─────────────────────────────────────────────────────────────
import { MONSTERS, ATTR, FIELD, KIND, STARTERS } from '../data/monsters.js';
import { ENEMIES } from '../data/enemies.js';
import { STAGES } from '../data/stages.js';
import { PHASE } from '../core/gameState.js';
import { stageRecord, unlockState, loadRun } from '../core/save.js';
import { BALANCE, TILE } from '../config/balance.js';
import { effectiveStats } from '../combat/combatSystem.js';
import { evolveOptions, evolveCost, sellValue } from '../evolution/evolutionTree.js';
import { jogressOptions, jogressCost } from '../evolution/jogressTable.js';
import { previewWave } from '../enemy/enemySpawner.js';
import { ITEM_NAME, ITEM_ICON, itemPrice } from '../economy/economyManager.js';
import { SYNERGY_DEFS } from '../combat/synergy.js';
import { towerCost, rentDue, nextRent, liquidValue } from '../core/stageManager.js';
import { PROPS, PROP_IDS, isProp } from '../data/props.js';
import { ADJ_RULES } from '../combat/adjacency.js';
import { summonCost, summonOdds, GRADE } from '../core/summon.js';
import { iconTag, iconURL } from '../render/itemArt.js';
import { augmentById, TIER, OFFER_WAVES } from '../augments/augments.js';

const $ = (id) => document.getElementById(id);
const attrClass = { VACCINE: 'vaccine', DATA: 'data', VIRUS: 'virus' };

export function initUI(state, handlers) {
  const el = {
    screen: $('screen-stage'), stageGrid: $('stage-grid'), resumeBox: $('resume-box'),
    progressLine: $('progress-line'), reset: $('btn-reset'), menu: $('btn-menu'),
    stageName: $('hud-stage-name'), stageTag: $('hud-stage-tag'),
    wave: $('chip-wave'), bits: $('chip-bits'), life: $('chip-life'),
    chips: $('chip-chips'), disks: $('chip-disks'), cores: $('chip-cores'),
    start: $('btn-start'), speed: $('btn-speed'),
    shop: $('shop'), exchange: $('exchange'),
    selected: $('selected-body'), synergy: $('synergy'),
    preview: $('wave-preview'), log: $('log'), hint: $('hint'),
    overlay: $('overlay'), ovTitle: $('ov-title'), ovBody: $('ov-body'),
    ovRibbon: $('ov-ribbon'), ovStats: $('ov-stats'),
    restart: $('btn-restart'), toMenu: $('btn-tomenu'),
    augOverlay: $('aug-overlay'), augGrid: $('aug-grid'), augWave: $('aug-wave'),
    augRerolls: $('aug-rerolls'), reroll: $('btn-reroll'), chipAug: $('chip-aug'),
    ownedAug: $('owned-aug'),
    props: $('props'), rentChip: $('chip-rent'), adjBox: $('adj-rules'),
    summonBox: $('summon-box'), summonOdds: $('summon-odds'),
    icoChips: $('ico-chips'), icoDisks: $('ico-disks'), icoCores: $('ico-cores'),
    coach: $('coach'), coachStep: $('coach-step'), coachTitle: $('coach-title'),
    coachText: $('coach-text'), coachNext: $('coach-next'), coachSkip: $('coach-skip'),
    coachWait: $('coach-wait'),
  };

  el.icoChips.innerHTML = iconTag('item', 'chips', 16);
  el.icoDisks.innerHTML = iconTag('item', 'disks', 16);
  el.icoCores.innerHTML = iconTag('item', 'cores', 16);

  el.coachNext.addEventListener('click', () => handlers.onTutorialNext());
  el.coachSkip.addEventListener('click', () => handlers.onTutorialSkip());

  el.reroll.addEventListener('click', () => handlers.onReroll());

  el.start.addEventListener('click', () => handlers.onStartWave());
  el.speed.addEventListener('click', () => handlers.onToggleSpeed());
  el.restart.addEventListener('click', () => handlers.onRestart());
  el.toMenu.addEventListener('click', () => openStageSelect());
  el.menu.addEventListener('click', () => openStageSelect());
  el.reset.addEventListener('click', () => {
    if (confirm('모든 스테이지 기록과 진행 중인 판이 지워집니다. 계속할까요?')) {
      handlers.onResetProgress();
      drawStageSelect();
    }
  });

  // ── 탭 ──
  let tab = 'build';
  const tabs = [...document.querySelectorAll('.tab')];
  for (const b of tabs) b.addEventListener('click', () => setTab(b.dataset.tab));

  function setTab(name) {
    tab = name;
    for (const b of tabs) b.classList.toggle('on', b.dataset.tab === name);
    for (const p of ['build', 'unit', 'info']) $(`pane-${p}`).classList.toggle('hidden', p !== name);
  }

  let panelsAt = 0;
  let lastSig = '';

  function sig() {
    return [
      state.stage.id, state.phase, state.wave, Math.floor(state.bits),
      state.items.chips, state.items.disks, state.items.cores,
      state.selectedTowerUid, state.buildMonsterId,
      state.towers.map((t) => `${t.monsterId}@${t.c},${t.r}`).join(','),
      state.log[0] ?? '', tab,
      state.summons, state.pending ? state.pending.id : '',
      state.augments.join(','), state.rerolls,
      state.offer ? state.offer.list.map((a) => a.id).join(',') : '',
    ].join('|');
  }

  function refresh(now) {
    drawHud();
    // 탭 전환은 여기서 하지 않는다. 배치할 때마다 넘어가면 연속 소환이 번거로워지므로
    // 필드에서 유닛을 '클릭'했을 때만 main 이 setTab('unit') 을 부른다.
    const s = sig();
    if (s !== lastSig && now - panelsAt > 160) {
      lastSig = s; panelsAt = now;
      if (tab === 'build') { drawPreview(); drawSummon(); drawProps(); drawExchange(); }
      if (tab === 'unit') drawSelected();
      if (tab === 'info') { drawSynergy(); drawLog(); drawOwnedAugments(); drawAdjRules(); }
      drawAugmentOffer();
      drawOverlay();
    }
  }

  // ── HUD ──
  function drawHud() {
    el.stageName.textContent = state.stage.name;
    el.stageTag.textContent = state.stage.tag || '';
    el.wave.textContent = `${Math.min(state.wave, state.totalWaves)}/${state.totalWaves}`;
    el.bits.textContent = Math.floor(state.bits);
    el.life.textContent = state.life;
    el.chips.textContent = state.items.chips;
    el.disks.textContent = state.items.disks;
    el.cores.textContent = state.items.cores;
    el.chipAug.textContent = state.augments.length;
    el.speed.textContent = `${state.speed}×`;

    const inCombat = state.phase === PHASE.COMBAT;
    const due = rentDue(state);
    const nx = nextRent(state);

    el.rentChip.textContent = nx ? `W${nx.wave} · ◈${nx.amount}` : '없음';
    el.rentChip.parentElement.classList.toggle('danger', due > 0 && state.bits < due);
    el.rentChip.parentElement.classList.toggle('warn', due > 0 && state.bits >= due);

    if (inCombat) {
      el.start.disabled = true;
      el.start.textContent = `전투 중 · ${state.enemies.length + state.spawnQueue.length}`;
    } else if (due > 0) {
      el.start.disabled = state.phase !== PHASE.PREP || state.bits < due;
      el.start.textContent = state.bits < due
        ? `유지비 ◈${due} 부족`
        : `유지비 ◈${due} 납부 후 시작`;
    } else {
      el.start.disabled = state.phase !== PHASE.PREP;
      el.start.textContent = '웨이브 시작';
    }
  }

  // ── 스테이지 선택 ──
  function openStageSelect() {
    drawStageSelect();
    el.screen.classList.remove('hidden');
  }
  function closeStageSelect() {
    el.screen.classList.add('hidden');
  }

  function drawStageSelect() {
    // 이어하기
    const run = loadRun();
    el.resumeBox.innerHTML = '';
    if (run) {
      const st = STAGES.find((s) => s.id === run.stageId);
      const box = document.createElement('div');
      box.className = 'resume';
      box.innerHTML = `
        <div>
          <div class="rz-t">이어하기 — ${st.name}</div>
          <div class="rz-s">웨이브 ${run.wave} · 디지몬 ${run.towers.length}기 · 비트 ${run.bits} · ♥ ${run.life}</div>
        </div>`;
      const b = document.createElement('button');
      b.className = 'gbtn gold';
      b.textContent = '이어서 하기';
      b.addEventListener('click', () => { handlers.onResume(); closeStageSelect(); });
      box.appendChild(b);
      el.resumeBox.appendChild(box);
    }

    // 스테이지 카드
    el.stageGrid.innerHTML = '';
    let cleared = 0;
    STAGES.forEach((st, i) => {
      const rec = stageRecord(st.id);
      const lock = unlockState(st);
      if (rec.cleared) cleared++;

      const card = document.createElement('button');
      card.className = 'stagecard' + (lock.unlocked ? '' : ' locked') + (rec.cleared ? ' cleared' : '');
      card.disabled = !lock.unlocked;
      card.innerHTML = `
        <div class="sc-top">
          <span class="sc-no">${i + 1}</span>
          <span class="nm">${lock.unlocked ? st.name : '???'}</span>
          <span class="tag">${st.tag}</span>
        </div>`;
      card.appendChild(miniMap(st, lock.unlocked));
      const rest = document.createElement('div');
      rest.innerHTML = lock.unlocked
        ? `<div class="sc-desc">${st.desc}</div>
           <div class="sc-meta">
             <span class="mix">${st.waves}웨이브</span>
             <span class="mix">체력 ×${(st.scale?.hp ?? 1).toFixed(2)}</span>
             <span class="mix">속도 ×${(st.scale?.speed ?? 1).toFixed(2)}</span>
             ${rec.cleared ? '<span class="mix" style="color:#ffd166">★ 클리어</span>' : ''}
             <span class="mix">최고 ${rec.best}</span>
           </div>`
        : `<div class="sc-lock">🔒 ${lock.reason}</div>`;
      card.appendChild(rest);

      if (lock.unlocked) {
        card.addEventListener('click', () => { handlers.onSelectStage(st.id); closeStageSelect(); });
      }
      el.stageGrid.appendChild(card);
    });

    el.progressLine.textContent = `클리어 ${cleared} / ${STAGES.length} 스테이지`;
  }

  /** 스테이지 카드용 경로 썸네일 — 어떤 맵인지 글보다 빠르게 알려준다 */
  function miniMap(stage, unlocked) {
    const { cols, rows } = BALANCE.grid;
    const cv = document.createElement('canvas');
    const px = 12;
    cv.width = cols * px; cv.height = rows * px;
    cv.className = 'sc-map';
    const g = cv.getContext('2d');

    g.fillStyle = unlocked ? '#a99039' : '#3a3220';
    g.fillRect(0, 0, cv.width, cv.height);

    if (unlocked) {
      g.fillStyle = '#83bb44';
      for (const [c0, r0, c1, r1] of stage.platforms || []) {
        g.fillRect(Math.min(c0, c1) * px, Math.min(r0, r1) * px,
          (Math.abs(c1 - c0) + 1) * px, (Math.abs(r1 - r0) + 1) * px);
      }
      g.strokeStyle = '#e2c87c';
      g.lineWidth = px * 0.85;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      stage.waypoints.forEach(([c, r], i) => {
        const x = c * px + px / 2, y = r * px + px / 2;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
    } else {
      g.fillStyle = '#5a5031';
      g.font = `bold ${px * 2}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('🔒', cv.width / 2, cv.height / 2 + px);
    }
    return cv;
  }

  // ── 다음 웨이브 미리보기 ──
  function drawPreview() {
    if (state.phase === PHASE.WIN || state.phase === PHASE.LOSE) {
      el.preview.innerHTML = '<span class="muted">스테이지 종료</span>';
      return;
    }
    const p = previewWave(state.wave);
    const parts = [];
    parts.push('<div class="wprev-top">');
    parts.push(`<span class="big">웨이브 ${state.wave}</span>`);
    parts.push(`<span class="muted">${p.total}기</span>`);
    if (p.hasBoss) parts.push('<span class="pill boss">보스</span>');
    if (p.hasElite) parts.push('<span class="pill elite">정예</span>');
    parts.push('</div>');

    parts.push('<div class="bar">');
    for (const a of ['VACCINE', 'DATA', 'VIRUS']) {
      const n = p.byAttr[a] || 0;
      if (!n) continue;
      parts.push(`<i style="width:${(n / p.total) * 100}%;background:${ATTR[a].color}"></i>`);
    }
    parts.push('</div>');

    parts.push('<div class="mixlist">');
    for (const a of ['VACCINE', 'DATA', 'VIRUS']) {
      const n = p.byAttr[a] || 0;
      if (!n) continue;
      parts.push(`<span class="mix ${attrClass[a]}">${ATTR[a].mark} ${ATTR[a].name} ${n}</span>`);
    }
    parts.push('</div>');

    const dominant = Object.entries(p.byAttr).sort((x, y) => y[1] - x[1])[0]?.[0];
    if (dominant) {
      const counter = { VIRUS: 'VACCINE', DATA: 'VIRUS', VACCINE: 'DATA' }[dominant];
      parts.push(`<p class="fine">주력이 <b class="${attrClass[dominant]}">${ATTR[dominant].name}</b> → <b class="${attrClass[counter]}">${ATTR[counter].name}</b> 타워가 ×1.5</p>`);
    }

    parts.push(`<div class="mixlist" style="margin-top:6px">${
      Object.entries(p.byName).map(([n, c]) => `<span class="mix">${n} ×${c}</span>`).join('')
    }</div>`);

    el.preview.innerHTML = parts.join('');
  }

  // ── 소환 ──
  function drawSummon() {
    const cost = summonCost(state);
    const p = state.pending;
    const rows = [];

    if (p) {
      const d = MONSTERS[p.id];
      const g = GRADE[p.grade];
      rows.push(`<div class="pending" style="--gc:${g.color}">
        <span class="pg">${g.name}</span>
        <span class="pn">${d.name}</span>
        <span class="ps"><b class="${attrClass[d.attr]}">${ATTR[d.attr].mark} ${ATTR[d.attr].name}</b>
          · ${FIELD[d.field].name} · ${KIND[d.kind]}</span>
        <span class="ph">잔디 위 빈 칸을 클릭해 배치하세요</span>
      </div>
      <button class="gbtn tiny ghost" id="btn-release">배치 취소 (+${Math.floor(p.paid * 0.5)})</button>`);
    } else {
      rows.push(`<button class="gbtn go summon-btn" id="btn-summon" ${state.bits < cost ? 'disabled' : ''}>
        <span class="sb-t">디지몬 소환</span>
        <span class="sb-c">◈ ${cost}</span>
      </button>
      <p class="fine">무엇이 나올지는 무작위입니다. 소환할수록 비용이 오릅니다. (지금까지 ${state.summons}회)</p>`);
    }
    el.summonBox.innerHTML = rows.join('');

    const b = $('btn-summon');
    if (b) b.addEventListener('click', () => handlers.onSummon());
    const rb = $('btn-release');
    if (rb) rb.addEventListener('click', () => handlers.onReleasePending());

    el.summonOdds.innerHTML = summonOdds().map((o) => `
      <div class="odd" style="--gc:${GRADE[o.grade].color}">
        <span class="og">${GRADE[o.grade].name}</span>
        <span class="on">${o.def.name}</span>
        <span class="op">${o.pct.toFixed(1)}%</span>
      </div>`).join('');
  }

  // ── 디지멘탈 (설치물) ──
  function drawProps() {
    el.props.innerHTML = '';
    for (const id of PROP_IDS) {
      const d = PROPS[id];
      const b = document.createElement('button');
      b.className = 'card prop' + (state.buildMonsterId === id ? ' active' : '');
      b.disabled = state.bits < d.cost;
      b.innerHTML = `
        <span class="nm">${iconTag('prop', id, 26, d.color)} ${d.short}</span>
        <span class="sub">${d.desc}</span>
        <span class="price">${d.cost} 비트</span>`;
      b.addEventListener('click', () => handlers.onPickShop(id));
      el.props.appendChild(b);
    }
  }

  // ── 교환소 ──
  function drawExchange() {
    el.exchange.innerHTML = '';
    for (const item of ['chips', 'disks', 'cores']) {
      const price = itemPrice(state, item);
      const b = document.createElement('button');
      b.className = 'card';
      b.disabled = state.bits < price;
      b.innerHTML = `
        <span class="nm">${iconTag('item', item, 26)}</span>
        <span class="sub">${ITEM_NAME[item]}</span>
        <span class="price">${price}</span>`;
      b.addEventListener('click', () => handlers.onBuyItem(item));
      el.exchange.appendChild(b);
    }
  }

  // ── 선택한 타워 + 진화 / 죠그레스 ──
  function drawSelected() {
    const t = state.selectedTower();
    if (!t) {
      el.selected.className = 'muted';
      el.selected.textContent = '필드의 디지몬을 클릭하세요.';
      return;
    }
    el.selected.className = '';
    const d = t.def;

    // ── 설치물 ──
    if (isProp(d)) {
      const boosted = state.towers.filter((x) => !isProp(x.def)
        && Math.abs(x.c - t.c) <= 1 && Math.abs(x.r - t.r) <= 1 && x !== t);
      el.selected.innerHTML = `
        <div class="selhead">
          <span class="nm">${d.icon} ${d.name}</span>
          <span class="tier">설치물</span>
        </div>
        <p class="desc">${d.desc}</p>
        <div class="mixlist">
          <span class="mix">인접 강화 중 ${boosted.length}기</span>
          ${boosted.map((x) => `<span class="mix">${x.def.name}</span>`).join('')}
        </div>
        <p class="fine">디지멘탈은 공격하지 않습니다. 무엇 옆에 놓느냐가 전부입니다.</p>
        <div style="margin-top:12px">
          <button class="gbtn tiny danger" id="btn-sell">매각 (+${sellValue(t, state)})</button>
        </div>`;
      const s0 = $('btn-sell');
      if (s0) s0.addEventListener('click', () => handlers.onSell());
      return;
    }

    const adj = state.adjacency[t.uid] || { atk: 0, rate: 0, range: 0, splash: 0, crit: 0, notes: [] };
    const st = effectiveStats(t, state.synergy, state.mods, adj);
    const tierName = d.jogress ? '죠그레스체' : ['', '성장기', '성숙기', '완전체', '궁극체'][d.tier];

    const tags = [];
    if (d.slowPct) tags.push(`둔화 ${Math.round(d.slowPct * 100)}% / ${d.slowDur}s`);
    if (st.salvo > 1) tags.push(`${st.salvo}연사`);
    if (st.crit > 0) tags.push(`치명 ${Math.round(st.crit * 100)}%`);
    if (d.armorPierce) tags.push('방어 무시');
    if (d.execute) tags.push('처형');
    if (st.splash > 0) tags.push(`반경 ${Math.round(st.splash)}`);
    if (st.pierce > 0) tags.push(`관통 ${st.pierce}`);

    const rows = [];
    rows.push(`<div class="selhead">
      <span class="nm">${d.name}</span>
      <span class="badge ${attrClass[d.attr]}">${ATTR[d.attr].mark} ${ATTR[d.attr].name}</span>
      <span class="badge field">${FIELD[d.field].name}</span>
      <span class="tier">T${d.tier} ${tierName}</span>
    </div>`);

    rows.push(`<div class="statgrid">
      <span class="k">DPS</span><span class="v">${Math.round(st.dps)}</span>
      <span class="k">공격력</span><span class="v">${Math.round(st.atk)}</span>
      <span class="k">사거리</span><span class="v">${Math.round(st.range)}</span>
      <span class="k">공격속도</span><span class="v">${st.rate.toFixed(2)}/s</span>
      <span class="k">방식</span><span class="v">${KIND[d.kind]}</span>
      <span class="k">누적 피해</span><span class="v">${Math.round(t.damage)}</span>
    </div>`);

    if (tags.length) rows.push(`<div class="mixlist">${tags.map((x) => `<span class="mix">${x}</span>`).join('')}</div>`);
    rows.push(`<p class="desc">${d.desc}</p>`);

    // 인접 효과 — 지금 이 자리에서 얼마를 받고 있는지 그대로 보여준다
    const rule = ADJ_RULES[d.field];
    const gains = [
      ['공격력', adj.atk], ['공격속도', adj.rate], ['사거리', adj.range],
      ['광역·관통', adj.splash], ['치명타', adj.crit],
    ].filter(([, v]) => v > 0.0001);
    rows.push(`<div class="adjbox">
      <div class="adj-rule"><b>${rule.label}</b> — ${rule.text}</div>
      ${gains.length
        ? `<div class="mixlist">${gains.map(([k, v]) =>
            `<span class="mix up">${k} +${Math.round(v * 100)}%</span>`).join('')}</div>`
        : '<div class="fine" style="margin:4px 0 0">지금 이 자리에서 받는 인접 보너스 없음</div>'}
      ${adj.notes.length ? `<div class="fine">${[...new Set(adj.notes)].join(' · ')}</div>` : ''}
    </div>`);

    const opts = evolveOptions(state, t);
    if (opts.length === 0) {
      rows.push(d.jogress
        ? '<div class="final">◈ 죠그레스체 — 합체 진화의 최종형.</div>'
        : '<div class="final">■ 궁극체 — 더 이상 진화할 수 없습니다.</div>');
    } else {
      const cost = evolveCost(t.monsterId, state);
      rows.push(`<h2 style="margin-top:14px">진화 (${cost.bits} 비트 + ${iconTag('item', cost.item, 15)} ${ITEM_NAME[cost.item]} ${cost.amount})</h2>`);
      rows.push('<div class="evolve-list" id="evolist"></div>');
    }

    const jopts = jogressOptions(state, t);
    if (jopts.length) {
      const jc = jogressCost(state);
      rows.push(`<h2 style="margin-top:14px">죠그레스 · 합체 진화 (${jc.bits} 비트 + ${iconTag('item', jc.item, 15)} ${ITEM_NAME[jc.item]} ${jc.amount})</h2>`);
      rows.push('<div class="evolve-list" id="joglist"></div>');
      rows.push('<p class="fine">상하좌우로 맞닿은 완전체 2기가 1기로 합쳐집니다. 이 디지몬의 타일이 남습니다.</p>');
    }

    rows.push(`<div style="margin-top:12px">
      <button class="gbtn tiny danger" id="btn-sell">매각 (+${sellValue(t, state)})</button>
    </div>`);

    el.selected.innerHTML = rows.join('');

    const list = $('evolist');
    if (list) {
      for (const o of opts) {
        const b = document.createElement('button');
        b.className = 'evo';
        b.disabled = !o.ok;

        const deltas = o.changes.map((ch) => {
          if (ch.special) {
            const label = ch.label === '속성'
              ? `${ATTR[ch.from].name}→${ATTR[ch.to].name}`
              : `${FIELD[ch.from].name}→${FIELD[ch.to].name}`;
            return `<span class="special">${ch.label} ${label}</span>`;
          }
          const cls = ch.to > ch.from ? 'up' : ch.to < ch.from ? 'down' : '';
          const sign = ch.to > ch.from ? '▲' : ch.to < ch.from ? '▼' : '=';
          return `<span class="${cls}">${ch.label} ${ch.from}${sign}${ch.to}</span>`;
        }).join('');

        b.innerHTML = `
          <div class="row1">
            <span class="arrowto">→</span>
            <b>${o.to.name}</b>
            <span class="badge ${attrClass[o.to.attr]}">${ATTR[o.to.attr].mark}</span>
            <span class="badge field">${FIELD[o.to.field].name}</span>
            <span class="mix">${KIND[o.to.kind]}</span>
          </div>
          <div class="deltas">${deltas}</div>
          <div class="note">${o.to.desc}</div>
          ${o.ok ? '' : `<div class="why">${o.reason}</div>`}`;
        b.addEventListener('click', () => handlers.onEvolve(o.toId));
        list.appendChild(b);
      }
    }

    const jlist = $('joglist');
    if (jlist) {
      // 즉시 가능한 조합을 위로 — 계획용 정보(파트너 부족/거리)는 아래로 밀어둔다
      const order = { ready: 0, cost: 1, far: 2, missing: 3 };
      for (const o of [...jopts].sort((a, b) => order[a.status] - order[b.status])) {
        const b = document.createElement('button');
        b.className = `evo jog ${o.status}`;
        b.disabled = !o.ok;

        const g = o.gain;
        const dpsCls = g.ratio >= 1 ? 'up' : 'down';
        const rangeCls = g.rangeAfter > g.rangeBefore ? 'up' : g.rangeAfter < g.rangeBefore ? 'down' : '';

        b.innerHTML = `
          <div class="row1">
            <span class="arrowto">◈</span>
            <b>${o.to.name}</b>
            <span class="badge ${attrClass[o.to.attr]}">${ATTR[o.to.attr].mark}</span>
            <span class="badge field">${FIELD[o.to.field].name}</span>
            <span class="mix">${KIND[o.to.kind]}</span>
          </div>
          <div class="parts">${d.name} <span class="plus">+</span> ${o.partnerDef.name}</div>
          <div class="deltas">
            <span class="${dpsCls}">합계 DPS ${g.dpsBefore}→${g.dpsAfter} (×${g.ratio.toFixed(2)})</span>
            <span class="${rangeCls}">사거리 ${g.rangeBefore}→${g.rangeAfter}</span>
            <span class="special">슬롯 2→1</span>
          </div>
          <div class="note">${o.to.desc}</div>
          ${o.ok ? '' : `<div class="why">${o.reason}</div>`}`;
        if (o.ok) b.addEventListener('click', () => handlers.onJogress(o.partner.uid));
        jlist.appendChild(b);
      }
    }

    const sell = $('btn-sell');
    if (sell) sell.addEventListener('click', () => handlers.onSell());
  }

  // ── 인접 규칙표 ──
  function drawAdjRules() {
    el.adjBox.innerHTML = Object.entries(ADJ_RULES).map(([f, r]) => `
      <div class="syn on">
        <span>${FIELD[f].mark} ${FIELD[f].name}</span>
        <span class="cnt">${r.short}</span>
        <span class="eff">${r.text}</span>
      </div>`).join('');
  }

  // ── 시너지 ──
  function drawSynergy() {
    const entries = Object.entries(state.synergy);
    if (entries.length === 0) {
      el.synergy.className = 'muted';
      el.synergy.textContent = '배치된 디지몬 없음';
      return;
    }
    el.synergy.className = '';
    entries.sort((a, b) => b[1].count - a[1].count);
    el.synergy.innerHTML = entries.map(([id, s]) => {
      const on = s.threshold > 0;
      const def = SYNERGY_DEFS[id];
      const pct = def.kind === 'add'
        ? `+${Math.round(s.value * 100)}%p`
        : `+${Math.round(s.value * 100)}%`;
      const eff = on
        ? `${s.label} ${pct} (${s.threshold}체)`
        : `${s.nextAt}체부터 ${s.label} 상승`;
      return `<div class="syn ${on ? 'on' : 'off'}">
        <span>${s.mark} ${s.name}</span>
        <span class="cnt">${s.count}체</span>
        <span class="eff">${eff}</span>
      </div>`;
    }).join('');
  }

  function drawLog() {
    if (state.log.length === 0) {
      el.log.className = 'log muted';
      el.log.textContent = '—';
      return;
    }
    el.log.className = 'log';
    el.log.innerHTML = state.log.map((t, i) =>
      `<span style="opacity:${1 - i * 0.13}">${t}</span>`).join('');
  }

  // ── 증강 선택 ──
  function drawAugmentOffer() {
    if (!state.offer) { el.augOverlay.classList.add('hidden'); return; }
    el.augOverlay.classList.remove('hidden');
    el.augWave.textContent = state.offer.wave;
    el.augRerolls.textContent = state.rerolls;
    el.reroll.disabled = state.rerolls <= 0;

    el.augGrid.innerHTML = '';
    for (const a of state.offer.list) {
      const t = TIER[a.tier];
      const card = document.createElement('button');
      card.className = `augcard ${a.tier}`;
      card.innerHTML = `
        <span class="ac-icon">${a.icon}</span>
        <span class="ac-tier">${t.name}</span>
        <span class="ac-name">${a.name}</span>
        <span class="ac-desc">${a.desc}</span>`;
      card.addEventListener('click', () => handlers.onTakeAugment(a.id));
      el.augGrid.appendChild(card);
    }
  }

  function drawOwnedAugments() {
    if (state.augments.length === 0) {
      el.ownedAug.className = 'muted';
      el.ownedAug.textContent = `아직 없음 — 웨이브 ${OFFER_WAVES.join(', ')}에 선택`;
      return;
    }
    el.ownedAug.className = 'owned-aug';
    el.ownedAug.innerHTML = state.augments.map((id) => {
      const a = augmentById(id);
      return `<div class="oa" style="color:${TIER[a.tier].color}">
        <span>${a.icon}</span>
        <span><span class="nm">${a.name}</span><br><span class="ds">${a.desc}</span></span>
      </div>`;
    }).join('');
  }

  // ── 결과 ──
  function drawOverlay() {
    if (state.phase !== PHASE.WIN && state.phase !== PHASE.LOSE) {
      el.overlay.classList.add('hidden');
      return;
    }
    el.overlay.classList.remove('hidden');
    const win = state.phase === PHASE.WIN;
    const rec = stageRecord(state.stage.id);

    el.ovRibbon.textContent = state.stage.name;
    el.ovTitle.textContent = win ? '스테이지 클리어!'
      : state.lostTo === 'rent' ? '압류' : '기지 함락';
    el.ovStats.innerHTML = `
      <div><span>도달 웨이브</span><b>${win ? state.totalWaves : state.wave}</b></div>
      <div><span>처치</span><b>${state.kills}</b></div>
      <div><span>남은 라이프</span><b>${state.life}</b></div>
      <div><span>이 맵 최고</span><b>${rec.best}</b></div>`;
    el.ovBody.textContent = [
      state.newBest ? '★ 최고 기록 갱신!' : '',
      `증강: ${state.augments.map((id) => augmentById(id).name).join(', ') || '없음'}`,
      `최종 배치: ${state.towers.map((t) => t.def.name).join(', ') || '없음'}`,
    ].filter(Boolean).join('\n');
  }

  function setHint(text, warn = false) {
    el.hint.textContent = text;
    el.hint.className = warn ? 'hint warn' : 'hint';
  }

  function invalidate() { lastSig = ''; panelsAt = 0; }

  // ── 튜토리얼 코치 ──
  let focused = null;
  function showCoach(step, index, total, waiting) {
    if (!step) {
      el.coach.classList.add('hidden');
      setFocus(null);
      return;
    }
    el.coach.classList.remove('hidden');
    el.coachStep.textContent = `${index + 1} / ${total}`;
    el.coachTitle.textContent = step.title;
    el.coachText.innerHTML = step.text;
    el.coachNext.classList.toggle('hidden', !!waiting);
    el.coachWait.textContent = waiting ? '↑ 안내대로 진행하면 넘어갑니다' : '';
    if (step.tab) setTab(step.tab);
    setFocus(step.focus || null);
  }

  function setFocus(selector) {
    if (focused === selector) return;
    document.querySelectorAll('.tut-focus').forEach((e) => e.classList.remove('tut-focus'));
    focused = selector;
    if (!selector) return;
    const node = document.querySelector(selector);
    if (node) node.classList.add('tut-focus');
  }

  const click = (sel) => { const n = document.querySelector(sel); if (n && !n.disabled) n.click(); };

  return { refresh, setHint, invalidate, setTab, openStageSelect, closeStageSelect,
           drawStageSelect, showCoach, click };
}

export { ENEMIES, TILE };
