// ─────────────────────────────────────────────────────────────
// ui.js — DOM 계층 (HUD / 스테이지 선택 / 탭 패널 / 결과)
// 상태를 읽어 DOM에 반영하기만 하고, 변경은 handlers 콜백으로 위임한다.
// ─────────────────────────────────────────────────────────────
import { MONSTERS, ATTR, FIELD, KIND, STARTERS } from '../data/monsters.js';
import { ENEMIES } from '../data/enemies.js';
import { STAGES } from '../data/stages.js';
import { PHASE } from '../core/gameState.js';
import { stageRecord, unlockState, loadRun, storageWorks } from '../core/save.js';
import { VS } from '../net/versus.js';
import { randomRoomCode, normalizeRoomCode } from '../core/rng.js';
import { BALANCE, TILE } from '../config/balance.js';
import { effectiveStats } from '../combat/combatSystem.js';
import { evolveOptions, evolveCost, sellValue } from '../evolution/evolutionTree.js';
import { megaOptions, megaCost } from '../evolution/megaTable.js';
import { beatenBy } from '../combat/attributeChart.js';
import { previewWave } from '../enemy/enemySpawner.js';
import { ITEM_NAME, ITEM_ICON, itemPrice } from '../economy/economyManager.js';
import { SYNERGY_DEFS } from '../combat/synergy.js';
import { towerCost, rentDue, nextRent, liquidValue } from '../core/stageManager.js';
import { PROPS, PROP_IDS, isProp } from '../data/props.js';
import { ADJ_RULES } from '../combat/adjacency.js';
import { summonCost, summonOdds, GRADE } from '../core/summon.js';
import { iconTag, iconURL } from '../render/itemArt.js';
import { spriteURL } from '../render/unitArt.js';
import { augmentById, TIER, OFFER_WAVES } from '../augments/augments.js';

const $ = (id) => document.getElementById(id);
const attrClass = { FIRE: 'fire', GRASS: 'grass', WATER: 'water' };

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
    dps: $('chip-dps'), dpsPeak: $('chip-dps-peak'),
    fbSynergy: $('fb-synergy'), fbLog: $('fb-log'),
    summonBox: $('summon-box'), summonOdds: $('summon-odds'),
    icoChips: $('ico-chips'), icoDisks: $('ico-disks'), icoCores: $('ico-cores'),
    coach: $('coach'), coachStep: $('coach-step'), coachTitle: $('coach-title'),
    coachText: $('coach-text'), coachNext: $('coach-next'), coachSkip: $('coach-skip'),
    coachWait: $('coach-wait'),
    vsBox: $('vs-box'), vsBar: $('vs-bar'), vsRoom: $('vs-room'), vsMe: $('vs-me'),
    vsOpp: $('vs-opp'), vsOppName: $('vs-opp-name'), vsGap: $('vs-gap'),
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
  // 판이 끝난 뒤의 '메뉴로' — 되돌아갈 판이 없다
  el.toMenu.addEventListener('click', () => openStageSelect());
  // HUD의 ☰ — 진행 중인 판에서 나가는 길. 나가기 전에 반드시 저장하고,
  // 돌아갈 수 있게 표시해 둔다.
  el.menu.addEventListener('click', () => {
    handlers.onLeaveToMenu();
    openStageSelect({ resumable: true });
  });
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
    refreshVersusBar();
    // 탭 전환은 여기서 하지 않는다. 배치할 때마다 넘어가면 연속 소환이 번거로워지므로
    // 필드에서 유닛을 '클릭'했을 때만 main 이 setTab('unit') 을 부른다.
    const s = sig();
    if (s !== lastSig && now - panelsAt > 160) {
      lastSig = s; panelsAt = now;
      if (tab === 'build') { drawPreview(); drawSummon(); drawProps(); drawExchange(); }
      if (tab === 'unit') drawSelected();
      if (tab === 'info') { drawSynergy(); drawLog(); drawOwnedAugments(); drawAdjRules(); }
      drawFieldBar();
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

    // 실시간 DPS — 실제로 들어간 피해의 최근 3초 평균이다.
    // 전투가 끝나면 0으로 수렴하므로, 준비 페이즈에는 직전 최고치를 보여준다.
    const live = Math.round(state.dps);
    el.dps.textContent = state.phase === PHASE.COMBAT ? live.toLocaleString() : '—';
    el.dpsPeak.textContent = state.peakDps > 0 ? ` 최고 ${Math.round(state.peakDps).toLocaleString()}` : '';
    // .mi → .metabar.dps
    el.dps.closest('.metabar').classList.toggle('live', state.phase === PHASE.COMBAT && live > 0);

    const inCombat = state.phase === PHASE.COMBAT;
    const due = rentDue(state);
    const nx = nextRent(state);

    // 라이프가 30% 아래로 떨어지면 눈에 띄게 알린다
    el.life.closest('.vital').classList.toggle('hurt', state.life > 0 && state.life <= state.maxLife * 0.3);

    el.rentChip.textContent = nx ? `W${nx.wave}·◈${nx.amount}` : '없음';
    const rentBar = el.rentChip.closest('.metabar');
    rentBar.classList.toggle('danger', due > 0 && state.bits < due);
    rentBar.classList.toggle('warn', due > 0 && state.bits >= due);

    if (inCombat) {
      // 화면에서 가장 큰 버튼이 전투 내내 회색으로 죽어 있으면 화면이 멈춘 것처럼 보인다.
      // 남은 적 비율을 버튼 배경에 채워 진행 상황 자체를 보여준다.
      const left = state.enemies.length + state.spawnQueue.length;
      const total = Math.max(left, state.waveTotal || left);
      state.waveTotal = total;
      const done = total > 0 ? 1 - left / total : 0;
      el.start.disabled = true;
      el.start.textContent = `전투 중 · 남은 ${left}`;
      el.start.style.setProperty('--prog', `${Math.round(done * 100)}%`);
      el.start.classList.add('fighting');
    } else if (due > 0) {
      el.start.classList.remove('fighting');
      state.waveTotal = 0;
      el.start.disabled = state.phase !== PHASE.PREP || state.bits < due;
      el.start.textContent = state.bits < due
        ? `리그 참가비 ◈${due} 부족`
        : `리그 참가비 ◈${due} 납부 후 시작`;
    } else {
      el.start.classList.remove('fighting');
      state.waveTotal = 0;
      el.start.disabled = state.phase !== PHASE.PREP;
      el.start.textContent = '웨이브 시작';
    }
  }

  /**
   * 보드 아래 요약 바.
   * 타입 시너지와 기록은 원래 '정보' 탭에 묻혀 있어서, 배치 중에는 아무도 안 봤다.
   * 배치하면서 바로 확인해야 하는 정보라 보드 옆으로 끌어냈다.
   */
  function drawFieldBar() {
    const units = state.towers.filter((t) => !isProp(t.def));
    if (!units.length) {
      el.fbSynergy.className = 'fb-chips muted';
      el.fbSynergy.textContent = '배치된 포켓몬 없음';
    } else {
      el.fbSynergy.className = 'fb-chips';
      const rows = Object.entries(state.synergy)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([, v]) => {
          const on = v.threshold > 0;
          const amt = v.kind === 'add'
            ? `+${Math.round(v.value * 100)}%p`
            : `+${Math.round(v.value * 100)}%`;
          return `<span class="fbchip${on ? ' on' : ''}">
            <b>${v.mark} ${v.name}</b><i>${v.count}</i>
            <small>${on ? `${v.label} ${amt}` : `${v.nextAt ?? '-'}체 필요`}</small>
          </span>`;
        });
      const props = state.towers.length - units.length;
      rows.unshift(`<span class="fbchip count"><b>포켓몬</b><i>${units.length}</i>${props ? `<small>도구 ${props}</small>` : ''}</span>`);
      el.fbSynergy.innerHTML = rows.join('');
    }

    const log = state.log.slice(0, 3);
    el.fbLog.className = log.length ? 'fb-log' : 'fb-log muted';
    el.fbLog.innerHTML = log.length
      ? log.map((t, i) => `<div class="fbl${i === 0 ? ' fresh' : ''}">${t}</div>`).join('')
      : '아직 기록이 없습니다.';
  }

  // ── 스테이지 선택 ──
  // 화면을 덮고 있는 동안에는 게임 시간이 멈춘다 (main.js가 isMenuOpen을 본다).
  // 예전에는 멈추지 않아서, 메뉴를 보는 사이 뒤에서 웨이브가 굴러가다
  // 패배하면 저장까지 지워졌다.
  let liveRun = false;      // 지금 화면 뒤에 되돌아갈 판이 살아 있는가

  function openStageSelect(opts = {}) {
    liveRun = !!opts.resumable;
    drawStageSelect();
    el.screen.classList.remove('hidden');
  }
  function closeStageSelect() {
    el.screen.classList.add('hidden');
  }
  const isMenuOpen = () => !el.screen.classList.contains('hidden');

  function drawStageSelect() {
    const run = loadRun();
    el.resumeBox.innerHTML = '';

    // 저장 자체가 막혀 있으면 먼저 알린다 — 조용히 실패하는 게 제일 나쁘다
    if (!storageWorks()) {
      const warn = document.createElement('div');
      warn.className = 'resume danger';
      warn.innerHTML = `
        <div>
          <div class="rz-t">이 브라우저에서는 저장이 되지 않습니다</div>
          <div class="rz-s">시크릿/프라이빗 모드이거나 사이트 데이터가 차단돼 있습니다. 일반 창에서 열면 진행도가 남습니다.</div>
        </div>`;
      el.resumeBox.appendChild(warn);
    }

    // 게임으로 돌아가기 — 나갔다가 그대로 복귀하는 길
    if (liveRun) {
      const back = document.createElement('div');
      back.className = 'resume';
      back.innerHTML = `
        <div>
          <div class="rz-t">진행 중인 판이 화면 뒤에서 기다리고 있습니다</div>
          <div class="rz-s">메뉴를 보는 동안 게임 시간은 멈춰 있습니다.</div>
        </div>`;
      const b = document.createElement('button');
      b.className = 'gbtn gold';
      b.textContent = '◀ 게임으로 돌아가기';
      b.addEventListener('click', () => closeStageSelect());
      back.appendChild(b);
      el.resumeBox.appendChild(back);
    }

    // 이어하기 (저장된 판을 불러온다)
    if (run) {
      const st = STAGES.find((s) => s.id === run.stageId);
      const box = document.createElement('div');
      box.className = 'resume';
      box.innerHTML = `
        <div>
          <div class="rz-t">이어하기 — ${st.name}</div>
          <div class="rz-s">웨이브 ${run.wave} · 포켓몬 ${run.towers.length}기 · 코인 ${run.bits} · ♥ ${run.life}</div>
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
      const saved = run && run.stageId === st.id;
      if (rec.cleared) cleared++;

      const card = document.createElement('button');
      card.className = 'stagecard' + (lock.unlocked ? '' : ' locked')
        + (rec.cleared ? ' cleared' : '') + (saved ? ' saved' : '');
      card.disabled = !lock.unlocked;
      // 난이도는 숫자 두 개(체력·속도 배율)보다 별 다섯 개가 훨씬 빨리 읽힌다.
      // 1.0배를 별 1개, 2.2배를 별 5개로 매핑한다.
      const hp = st.scale?.hp ?? 1;
      const diff = Math.max(1, Math.min(5, Math.round((hp - 0.9) / 0.32) + 1));
      const stars = '★'.repeat(diff) + '☆'.repeat(5 - diff);
      // 최고 기록을 진행 막대로 — "여기까지 갔다"가 한눈에 보인다
      const prog = Math.min(100, Math.round((rec.best / st.waves) * 100));

      // 미니맵을 카드 상단 히어로 영역으로 올린다
      const hero = document.createElement('div');
      hero.className = 'sc-hero';
      hero.appendChild(miniMap(st, lock.unlocked));
      hero.insertAdjacentHTML('beforeend', `
        <span class="sc-no">${i + 1}</span>
        ${rec.cleared ? '<span class="sc-flag clear">★ 클리어</span>' : ''}
        ${saved ? '<span class="sc-flag save">● 저장된 판</span>' : ''}
        ${lock.unlocked ? '' : '<span class="sc-veil">🔒</span>'}`);
      card.appendChild(hero);

      const rest = document.createElement('div');
      rest.className = 'sc-body';
      rest.innerHTML = lock.unlocked
        ? `<div class="sc-top">
             <span class="nm">${st.name}</span>
             <span class="tag">${st.tag}</span>
           </div>
           <div class="sc-desc">${st.desc}</div>
           <div class="sc-stats">
             <span class="sc-diff" title="체력 ×${hp.toFixed(2)} · 속도 ×${(st.scale?.speed ?? 1).toFixed(2)}">
               <i>난이도</i><b>${stars}</b>
             </span>
             <span class="sc-waves"><i>웨이브</i><b>${st.waves}</b></span>
           </div>
           <div class="sc-prog" title="최고 ${rec.best} / ${st.waves}웨이브">
             <span class="sp-bar"><i style="width:${prog}%"></i></span>
             <span class="sp-txt">최고 <b>${rec.best}</b></span>
           </div>`
        : `<div class="sc-top"><span class="nm">???</span><span class="tag">${st.tag}</span></div>
           <div class="sc-lock">${lock.reason}</div>`;
      card.appendChild(rest);

      if (lock.unlocked) {
        card.addEventListener('click', () => {
          // 카드를 누르는 건 '새로 시작'이다. 저장된 판이 있으면 먼저 물어본다 —
          // 예전에는 여기서 말없이 저장을 지워버려서, 나갔다 들어오면 판이 사라졌다.
          if (run) { askNewRun(st, run); return; }
          handlers.onSelectStage(st.id);
          closeStageSelect();
        });
      }
      el.stageGrid.appendChild(card);
    });

    el.progressLine.textContent = `클리어 ${cleared} / ${STAGES.length} 스테이지`;
    drawVersus();
  }

  // ── 대결 로비 ──
  // 방 코드가 곧 시드다. 같은 코드로 들어오면 포획·특성·드랍 운이 똑같아진다.
  let vsForm = { code: '', stageId: null, kind: 'peer' };

  function playableStages() {
    return STAGES.filter((st) => st.id !== 'tutorial' && unlockState(st).unlocked);
  }

  function drawVersus() {
    const vs = handlers.vsState();
    const box = el.vsBox;
    box.innerHTML = '';

    const line = (cls, html) => {
      const d = document.createElement('div');
      d.className = cls;
      d.innerHTML = html;
      return d;
    };

    if (vs.error) box.appendChild(line('vs-err', `⚠ ${vs.error}`));

    // ── 대결 중이 아님: 방 만들기 / 참가 ──
    if (vs.phase === VS.OFF) {
      box.appendChild(line('vs-lead',
        '같은 맵을 <b>같은 운</b>으로 각자 돌립니다. 포획·특성·드랍이 둘 다 똑같이 나오고, 더 높은 웨이브까지 버틴 쪽이 이깁니다.'));

      const open = playableStages();
      if (!vsForm.stageId || !open.some((st) => st.id === vsForm.stageId)) {
        vsForm.stageId = open.length ? open[0].id : null;
      }

      const row1 = document.createElement('div');
      row1.className = 'vs-row';

      const stagePick = document.createElement('select');
      stagePick.className = 'vs-input';
      for (const st of open) {
        const o = document.createElement('option');
        o.value = st.id; o.textContent = `${st.name} (${st.waves}웨이브)`;
        if (st.id === vsForm.stageId) o.selected = true;
        stagePick.appendChild(o);
      }
      stagePick.addEventListener('change', () => { vsForm.stageId = stagePick.value; });

      const kindPick = document.createElement('select');
      kindPick.className = 'vs-input';
      kindPick.innerHTML = `
        <option value="peer">다른 기기 · 인터넷</option>
        <option value="local">같은 컴퓨터 · 창 2개</option>`;
      kindPick.value = vsForm.kind;
      kindPick.addEventListener('change', () => { vsForm.kind = kindPick.value; });

      const mk = document.createElement('button');
      mk.className = 'gbtn gold';
      mk.textContent = '방 만들기';
      mk.addEventListener('click', () => {
        handlers.onVsHost(randomRoomCode(), vsForm.stageId, vsForm.kind);
      });

      row1.append(stagePick, kindPick, mk);
      box.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'vs-row';
      const code = document.createElement('input');
      code.className = 'vs-input code';
      code.placeholder = '친구가 준 방 코드';
      code.maxLength = 7;
      code.value = vsForm.code;
      code.addEventListener('input', () => {
        vsForm.code = normalizeRoomCode(code.value);
        code.value = vsForm.code;
        jn.disabled = vsForm.code.length < 6;
      });

      const jn = document.createElement('button');
      jn.className = 'gbtn';
      jn.textContent = '참가';
      jn.disabled = vsForm.code.length < 6;
      jn.addEventListener('click', () => handlers.onVsJoin(vsForm.code, vsForm.kind));
      code.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !jn.disabled) jn.click(); });

      row2.append(code, jn);
      box.appendChild(row2);
      box.appendChild(line('fine',
        vsForm.kind === 'local'
          ? '같은 브라우저에서 창(탭)을 하나 더 열고 같은 코드로 참가하면 됩니다.'
          : '방 코드만 알려주면 됩니다. 연결은 두 사람 사이에서 직접 맺어집니다.'));
      return;
    }

    // ── 방을 만들었거나 참가 중 ──
    const st = STAGES.find((x) => x.id === vs.stageId);
    const head = document.createElement('div');
    head.className = 'vs-room-head';

    if (vs.isHost) {
      head.innerHTML = `
        <div>
          <div class="rz-s">친구에게 이 코드를 알려주세요</div>
          <div class="vs-code">${vs.room}</div>
        </div>`;
      const copy = document.createElement('button');
      copy.className = 'gbtn tiny ghost';
      copy.textContent = '복사';
      copy.addEventListener('click', () => {
        navigator.clipboard?.writeText(vs.room);
        copy.textContent = '복사됨!';
        setTimeout(() => { copy.textContent = '복사'; }, 1200);
      });
      head.appendChild(copy);
    } else {
      head.innerHTML = `
        <div>
          <div class="rz-s">참가한 방</div>
          <div class="vs-code">${vs.room}</div>
        </div>`;
    }
    box.appendChild(head);

    if (vs.phase === VS.WAITING) {
      box.appendChild(line('vs-wait', vs.isHost
        ? '상대가 들어오기를 기다리는 중…'
        : '방에 연결하는 중…'));
    } else if (vs.phase === VS.READY) {
      box.appendChild(line('vs-ready',
        `상대 접속 완료 — <b>${st ? st.name : '맵 확인 중'}</b> ${st ? `${st.waves}웨이브` : ''}`));
    } else if (vs.phase === VS.PLAYING) {
      box.appendChild(line('vs-wait', '대결 진행 중 — 게임 화면으로 돌아가세요.'));
    } else if (vs.phase === VS.FINISHED) {
      const v = vs.verdict;
      box.appendChild(line(v === 'lose' ? 'vs-wait' : 'vs-ready',
        `대결 종료 — <b>${v === 'win' ? '승리' : v === 'lose' ? '패배' : '무승부'}</b>`
        + ` (나 ${vs.myResult ? vs.myResult.wave : '?'}웨이브 · 상대 ${vs.oppResult ? vs.oppResult.wave : '?'}웨이브)`));
    }

    const foot = document.createElement('div');
    foot.className = 'vs-row';
    if (vs.phase === VS.READY && vs.isHost) {
      const go = document.createElement('button');
      go.className = 'gbtn gold';
      go.textContent = '대결 시작';
      go.addEventListener('click', () => handlers.onVsBegin());
      foot.appendChild(go);
    } else if (vs.phase === VS.READY) {
      foot.appendChild(line('vs-wait', '방장이 시작하기를 기다리는 중…'));
    }
    const out = document.createElement('button');
    out.className = 'gbtn tiny ghost';
    out.textContent = vs.phase === VS.FINISHED ? '새 대결 준비' : '나가기';
    out.addEventListener('click', () => handlers.onVsLeave());
    foot.appendChild(out);
    box.appendChild(foot);
  }

  /** 게임 화면 상단의 대결 바 — 상대가 지금 어디까지 갔는지 */
  function refreshVersusBar() {
    const vs = handlers.vsState();
    const on = vs.phase === VS.PLAYING || vs.phase === VS.FINISHED;
    el.vsBar.classList.toggle('hidden', !on);
    if (!on) return;

    el.vsRoom.textContent = vs.room;
    el.vsMe.textContent = `웨이브 ${state.wave} · ♥${state.life}`;

    const o = vs.opponent;
    if (!o) {
      el.vsOpp.textContent = vs.error ? '연결 끊김' : '연결 중…';
      el.vsGap.textContent = '—';
      el.vsBar.classList.remove('ahead', 'behind');
      return;
    }
    const done = vs.oppResult ? (vs.oppResult.won ? ' · 클리어' : ' · 종료') : '';
    el.vsOpp.textContent = `웨이브 ${o.wave} · ♥${o.life}${done}`;

    const d = state.wave - o.wave;
    el.vsGap.textContent = d === 0 ? '동률' : (d > 0 ? `+${d} 앞섬` : `${d} 뒤짐`);
    el.vsBar.classList.toggle('ahead', d > 0);
    el.vsBar.classList.toggle('behind', d < 0);
  }

  /** 저장된 판이 있는데 새 판을 시작하려 할 때 — 지우기 전에 반드시 거친다 */
  function askNewRun(st, run) {
    const from = STAGES.find((s) => s.id === run.stageId);
    const same = run.stageId === st.id;
    el.resumeBox.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'resume danger';
    box.innerHTML = `
      <div>
        <div class="rz-t">${st.name} — 처음부터 시작할까요?</div>
        <div class="rz-s">${same ? '저장된 판' : `${from ? from.name : '저장된 판'}`}
          (웨이브 ${run.wave} · 포켓몬 ${run.towers.length}기)이 지워집니다.</div>
      </div>`;

    const keep = document.createElement('button');
    keep.className = 'gbtn gold';
    keep.textContent = same ? '이어서 하기' : `${from ? from.name : ''} 이어하기`;
    keep.addEventListener('click', () => { handlers.onResume(); closeStageSelect(); });

    const go = document.createElement('button');
    go.className = 'gbtn tiny ghost';
    go.textContent = '지우고 새로 시작';
    go.addEventListener('click', () => { handlers.onSelectStage(st.id); closeStageSelect(); });

    box.appendChild(keep);
    box.appendChild(go);
    el.resumeBox.appendChild(box);
    el.resumeBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    for (const a of ['FIRE', 'GRASS', 'WATER']) {
      const n = p.byAttr[a] || 0;
      if (!n) continue;
      parts.push(`<i style="width:${(n / p.total) * 100}%;background:${ATTR[a].color}"></i>`);
    }
    parts.push('</div>');

    parts.push('<div class="mixlist">');
    for (const a of ['FIRE', 'GRASS', 'WATER']) {
      const n = p.byAttr[a] || 0;
      if (!n) continue;
      parts.push(`<span class="mix ${attrClass[a]}">${ATTR[a].mark} ${ATTR[a].name} ${n}</span>`);
    }
    parts.push('</div>');

    const dominant = Object.entries(p.byAttr).sort((x, y) => y[1] - x[1])[0]?.[0];
    if (dominant) {
      const counter = beatenBy(dominant);
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
        <span class="ph">풀숲 위 빈 칸을 클릭해 배치하세요</span>
      </div>
      <button class="gbtn tiny ghost" id="btn-release">배치 취소 (+${Math.floor(p.paid * 0.5)})</button>`);
    } else {
      rows.push(`<button class="gbtn go summon-btn" id="btn-summon" ${state.bits < cost ? 'disabled' : ''}>
        <span class="sb-t">몬스터볼 던지기</span>
        <span class="sb-c">◈ ${cost}</span>
      </button>
      <p class="fine">무엇이 나올지는 무작위입니다. 던질수록 값이 오릅니다. (지금까지 ${state.summons}회)</p>`);
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

  // ── 도구 (도구) ──
  function drawProps() {
    el.props.innerHTML = '';
    for (const id of PROP_IDS) {
      const d = PROPS[id];
      const b = document.createElement('button');
      b.className = 'card prop' + (state.buildMonsterId === id ? ' active' : '');
      b.disabled = state.bits < d.cost;
      // 아이콘을 액자에 넣고 이름·효과·가격을 세로로 세운다 —
      // 예전엔 이름 앞의 작은 색점이라 무슨 도구인지 구분이 안 됐다
      b.innerHTML = `
        <span class="cardtop">
          <span class="icoframe" style="--ic:${d.color}">${iconTag('prop', id, 34, d.color)}</span>
          <span class="nm">${d.short}</span>
        </span>
        <span class="sub">${d.desc}</span>
        <span class="price">${d.cost} 코인</span>`;
      b.addEventListener('click', () => handlers.onPickShop(id));
      el.props.appendChild(b);
    }
  }

  // ── 프렌들리샵 ──
  function drawExchange() {
    el.exchange.innerHTML = '';
    for (const item of ['chips', 'disks', 'cores']) {
      const price = itemPrice(state, item);
      const b = document.createElement('button');
      b.className = 'card';
      b.disabled = state.bits < price;
      b.innerHTML = `
        <span class="icoframe big">${iconTag('item', item, 38)}</span>
        <span class="nm center">${ITEM_NAME[item]}</span>
        <span class="price center">${price}</span>
        <span class="have">보유 ${state.items[item] || 0}</span>`;
      b.addEventListener('click', () => handlers.onBuyItem(item));
      el.exchange.appendChild(b);
    }
  }

  // ── 선택한 타워 + 진화 / 메가진화 ──
  function drawSelected() {
    const t = state.selectedTower();
    if (!t) {
      el.selected.className = 'muted';
      el.selected.textContent = '필드의 포켓몬을 클릭하세요.';
      return;
    }
    el.selected.className = '';
    const d = t.def;

    // ── 도구 ──
    if (isProp(d)) {
      const boosted = state.towers.filter((x) => !isProp(x.def)
        && Math.abs(x.c - t.c) <= 1 && Math.abs(x.r - t.r) <= 1 && x !== t);
      el.selected.innerHTML = `
        <div class="selhead">
          <span class="nm">${d.icon} ${d.name}</span>
          <span class="tier">도구</span>
        </div>
        <p class="desc">${d.desc}</p>
        <div class="mixlist">
          <span class="mix">인접 강화 중 ${boosted.length}기</span>
          ${boosted.map((x) => `<span class="mix">${x.def.name}</span>`).join('')}
        </div>
        <p class="fine">도구는 공격하지 않습니다. 무엇 옆에 놓느냐가 전부입니다.</p>
        <div style="margin-top:12px">
          <button class="gbtn tiny danger" id="btn-sell">방생 (+${sellValue(t, state)})</button>
        </div>`;
      const s0 = $('btn-sell');
      if (s0) s0.addEventListener('click', () => handlers.onSell());
      return;
    }

    const adj = state.adjacency[t.uid] || { atk: 0, rate: 0, range: 0, splash: 0, crit: 0, notes: [] };
    const st = effectiveStats(t, state.synergy, state.mods, adj);
    const tierName = d.mega ? '메가진화' : ['', '기본', '1차진화', '최종진화', '메가진화'][d.tier];

    const tags = [];
    if (d.slowPct) tags.push(`둔화 ${Math.round(d.slowPct * 100)}% / ${d.slowDur}s`);
    if (st.salvo > 1) tags.push(`${st.salvo}연사`);
    if (st.crit > 0) tags.push(`치명 ${Math.round(st.crit * 100)}%`);
    if (d.armorPierce) tags.push('방어 무시');
    if (d.execute) tags.push('처형');
    if (st.splash > 0) tags.push(`반경 ${Math.round(st.splash)}`);
    if (st.pierce > 0) tags.push(`관통 ${st.pierce}`);

    const rows = [];
    // 초상화를 왼쪽에 세우면 "지금 무엇을 보고 있는지"가 글자 없이 먼저 읽힌다
    rows.push(`<div class="selhead">
      <span class="portrait" style="--pc:${d.color}">
        <img src="${spriteURL(d)}" alt="" width="52" height="57">
      </span>
      <span class="sh-body">
        <span class="nm">${d.name}</span>
        <span class="sh-badges">
          <span class="badge ${attrClass[d.attr]}">${ATTR[d.attr].mark} ${ATTR[d.attr].name}</span>
          <span class="badge field">${FIELD[d.field].mark} ${FIELD[d.field].name}</span>
          <span class="badge tierb t${d.tier}">${tierName}</span>
        </span>
      </span>
    </div>`);

    // DPS 는 다른 스탯의 결과값이라 따로 크게 세운다
    const share = state.totalDamage > 0 ? (t.damage / state.totalDamage) * 100 : 0;
    rows.push(`<div class="dpshero">
      <span class="dh-l"><i>실효 DPS</i><b>${Math.round(st.dps).toLocaleString()}</b></span>
      <span class="dh-r">
        <span><i>누적 피해</i><b>${Math.round(t.damage).toLocaleString()}</b></span>
        <span><i>필드 기여</i><b>${share.toFixed(1)}%</b></span>
      </span>
      <span class="dh-bar"><i style="width:${Math.min(100, share)}%"></i></span>
    </div>`);

    // 스탯은 표가 아니라 막대로 — 숫자만 있으면 이게 높은 건지 낮은 건지 알 수 없다
    const bar = (label, val, max, txt, cls = '') => `
      <span class="statrow ${cls}">
        <i>${label}</i>
        <span class="sr-bar"><b style="width:${Math.max(3, Math.min(100, (val / max) * 100))}%"></b></span>
        <em>${txt}</em>
      </span>`;
    rows.push(`<div class="statbars">
      ${bar('공격력', st.atk, 320, Math.round(st.atk))}
      ${bar('사거리', st.range, 280, Math.round(st.range))}
      ${bar('공격속도', st.rate, 2.2, st.rate.toFixed(2) + '/s')}
      <span class="statrow kindrow"><i>방식</i><em class="k-${d.kind}">${KIND[d.kind]}</em></span>
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
      rows.push(d.mega
        ? '<div class="final">◈ 메가진화 — 이 판에서 도달할 수 있는 최종 형태입니다.</div>'
        : '<div class="final">■ 최종진화 — 일반 진화는 여기까지입니다. 메가진화만 남았습니다.</div>');
    } else {
      const cost = evolveCost(t.monsterId, state);
      rows.push(`<h2 style="margin-top:14px">진화 (${cost.bits} 코인 + ${iconTag('item', cost.item, 15)} ${ITEM_NAME[cost.item]} ${cost.amount})</h2>`);
      rows.push('<div class="evolve-list" id="evolist"></div>');
    }

    const jopts = megaOptions(state, t);
    if (jopts.length) {
      const jc = megaCost(state);
      rows.push(`<h2 style="margin-top:14px">메가진화 · 인접한 동료와의 유대 (${jc.bits} 코인 + ${iconTag('item', jc.item, 15)} ${ITEM_NAME[jc.item]} ${jc.amount})</h2>`);
      rows.push('<div class="evolve-list" id="joglist"></div>');
      rows.push('<p class="fine">상하좌우로 맞닿은 최종진화 2기가 1기로 합쳐집니다. 이 포켓몬의 타일이 남습니다.</p>');
    }

    rows.push(`<div style="margin-top:12px">
      <button class="gbtn tiny danger" id="btn-sell">방생 (+${sellValue(t, state)})</button>
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
        if (o.ok) b.addEventListener('click', () => handlers.onMega(o.partner.uid));
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
      el.synergy.textContent = '배치된 포켓몬 없음';
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

  // ── 특성 선택 ──
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
    const vs = handlers.vsState();
    const inVs = vs.phase === VS.PLAYING || vs.phase === VS.FINISHED;

    // 대결 중이면 내 클리어 여부보다 "상대보다 잘했나"가 결론이다
    if (inVs) {
      const mine = win ? state.totalWaves : state.wave;
      const done = vs.verdict != null;
      el.ovRibbon.textContent = `대결 · ${vs.room}`;
      el.ovTitle.textContent = !done ? '내 판 종료 — 상대를 기다리는 중'
        : vs.verdict === 'win' ? '승리!'
        : vs.verdict === 'lose' ? '패배' : '무승부';
      el.ovStats.innerHTML = `
        <div><span>내 도달 웨이브</span><b>${mine}</b></div>
        <div><span>상대 도달 웨이브</span><b>${vs.oppResult ? vs.oppResult.wave : '진행 중'}</b></div>
        <div><span>남은 라이프</span><b>${state.life}</b></div>
        <div><span>처치</span><b>${state.kills}</b></div>`;
      el.ovBody.textContent = [
        done ? '' : '상대가 아직 진행 중입니다. 끝나면 승패가 표시됩니다.',
        state.newBest ? '★ 최고 기록 갱신!' : '',
        `특성: ${state.augments.map((id) => augmentById(id).name).join(', ') || '없음'}`,
      ].filter(Boolean).join('\n');
      return;
    }

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
      `특성: ${state.augments.map((id) => augmentById(id).name).join(', ') || '없음'}`,
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
           drawStageSelect, drawVersus, showCoach, click, isMenuOpen };
}

export { ENEMIES, TILE };
