// ─────────────────────────────────────────────────────────────
// economyManager.js — 코인(재화)과 진화 아이템 수급
// 진화 아이템은 "설계자가 공급량을 통제"하는 축이므로 여기 한 곳에 모은다.
// ─────────────────────────────────────────────────────────────
import { BALANCE } from '../config/balance.js';

export const ITEM_NAME = { chips: '이상한사탕', disks: '진화의돌', cores: '메가스톤' };
export const ITEM_ICON = { chips: '🍬', disks: '💎', cores: '🔶' };

// ── 교환소: 코인 → 진화 아이템 ──
// 후반에 코인이 남아도 쓸 곳이 없으면 경제가 죽는다. 대신 가격이 살 때마다
// 올라가서, "코인으로 진화를 사는" 것이 무한 치트가 되지는 않게 한다.
export function itemPrice(state, item) {
  const t = BALANCE.exchange[item];
  const raw = t.base + t.step * (state.purchases[item] || 0);
  return Math.max(10, Math.round(raw * (1 + (state.mods?.exchangeMult || 0))));
}

export function buyItem(state, item) {
  const price = itemPrice(state, item);
  if (state.bits < price) return false;
  state.bits -= price;
  state.purchases[item] = (state.purchases[item] || 0) + 1;
  grantItem(state, item, 1);
  state.pushLog(`프렌들리샵 — ${ITEM_NAME[item]} 구매 (−${price} 코인)`);
  return true;
}

export function canAfford(state, bits) {
  return state.bits >= bits;
}

export function spend(state, bits) {
  if (state.bits < bits) return false;
  state.bits -= bits;
  return true;
}

export function gain(state, bits) {
  state.bits += Math.round(bits);
}

export function hasItem(state, item, amount) {
  return (state.items[item] || 0) >= amount;
}

export function consumeItem(state, item, amount) {
  if (!hasItem(state, item, amount)) return false;
  state.items[item] -= amount;
  return true;
}

export function grantItem(state, item, amount = 1) {
  state.items[item] = (state.items[item] || 0) + amount;
}

/** 적 처치 보상 */
export function onKill(state, enemy) {
  gain(state, enemy.bounty); // bounty는 스폰 시점에 웨이브 스케일링이 이미 적용됨
  state.kills++;
  const dropChance = BALANCE.economy.eliteChipChance * (1 + (state.mods?.eliteDropMult || 0));
  // 시드 스트림 — 대결 모드에서 두 사람의 드랍 운이 같아야 한다.
  // 웨이브 편성이 결정적이라 정예 수도 같으므로 "n번째 정예"가 서로 맞물린다.
  if (enemy.cls === 'elite' && state.rng.drop.next() < dropChance) {
    grantItem(state, 'chips', 1);
    state.pushLog(`에이스 격파 — ${ITEM_NAME.chips} +1`);
  }
}

/** 웨이브 클리어 보상: 비트 보너스 + 확정 아이템 */
export function onWaveClear(state, wave) {
  const eco = BALANCE.economy;
  const bonus = Math.round((eco.waveClearBase + wave * eco.waveClearPerWave)
    * (1 + (state.mods?.waveClearMult || 0)));
  gain(state, bonus);

  const g = BALANCE.itemGrant;
  const granted = [];
  const chips = g.chipEveryWave + (state.mods?.chipPerWave || 0);
  if (chips > 0) {
    grantItem(state, 'chips', chips);
    granted.push(`${ITEM_NAME.chips} +${chips}`);
  }
  if (wave % g.diskEveryN === 0) {
    grantItem(state, 'disks', 1);
    granted.push(`${ITEM_NAME.disks} +1`);
  }
  if (wave % g.coreEveryN === 0) {
    grantItem(state, 'cores', 1);
    granted.push(`${ITEM_NAME.cores} +1`);
  }

  state.pushLog(`웨이브 ${wave} 클리어 — 비트 +${bonus}, ${granted.join(', ')}`);
  return { bonus, granted };
}
