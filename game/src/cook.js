// Simmer & Serve — cooking actions: grab, chop, cook, plate, serve, bin.
// Every rule about what a station does with what you carry lives here.

import {
  BASE_SCORE,
  BURN_AFTER_SECONDS,
  CHOP_SECONDS,
  COMBO_BONUS_EVERY,
  COOK_SECONDS,
  INGREDIENTS,
  MAX_TIP,
  PREPARED,
  STATIONS,
} from './config.js';
import { endShift, handsFree, showToast } from './kitchen.js';

export function stationById(id) {
  return STATIONS.find((s) => s.id === id);
}

export function nearestStation(state) {
  const p = state.player;
  let best = null;
  let bestD = Infinity;
  for (const s of STATIONS) {
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < s.range && d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

// ---- pantry ----

export function grabIngredient(state, ingredientId) {
  const def = INGREDIENTS.find((i) => i.id === ingredientId);
  if (!def) return false;
  if (handsFree(state) <= 0) {
    showToast(state, 'Hands full — serve or bin something first.');
    return false;
  }
  // An ingredient with no prep step (herb) is ready the moment you pick it.
  const kind = def.prep ? 'raw' : 'prepared';
  state.player.carrying.push({ id: def.id, kind, label: def.name });
  return true;
}

// ---- chopping board ----

export function choppableCarried(state) {
  return state.player.carrying.find((item) => {
    const def = INGREDIENTS.find((i) => i.id === item.id);
    return item.kind === 'raw' && def && def.prep && def.prep.station === 'board';
  });
}

export function chopTick(state, dt, holding) {
  const target = choppableCarried(state);
  if (!target || !holding) {
    state.chopping.progress = 0;
    state.chopping.item = null;
    return;
  }
  state.chopping.item = target.id;
  state.chopping.progress += dt / CHOP_SECONDS;
  if (state.chopping.progress >= 1) {
    const def = INGREDIENTS.find((i) => i.id === target.id);
    target.id = def.prep.result;
    target.kind = 'prepared';
    target.label = PREPARED[def.prep.result].name;
    state.chopping.progress = 0;
    state.chopping.item = null;
    showToast(state, `${target.label} ready!`);
  }
}

// ---- stoves ----

export function cookableCarried(state) {
  return state.player.carrying.find((item) => {
    if (item.kind === 'raw') {
      const def = INGREDIENTS.find((i) => i.id === item.id);
      return def && def.prep && def.prep.station === 'stove';
    }
    const prep = PREPARED[item.id];
    return prep && prep.stove;
  });
}

export function stoveResultFor(item) {
  if (item.kind === 'raw') {
    const def = INGREDIENTS.find((i) => i.id === item.id);
    return def && def.prep && def.prep.station === 'stove' ? def.prep.result : null;
  }
  const prep = PREPARED[item.id];
  return prep && prep.stove ? prep.stove : null;
}

export function stoveTick(state, dt) {
  for (const stove of state.stoves) {
    if (!stove.item) continue;
    stove.t += dt;
    if (stove.t >= COOK_SECONDS && stove.item.state === 'cooking') {
      stove.item.state = 'ready';
      showToast(state, `${stove.item.label} is ready — grab it before it burns!`);
    }
    if (stove.t >= COOK_SECONDS + BURN_AFTER_SECONDS && stove.item.state !== 'burnt') {
      stove.item.state = 'burnt';
      showToast(state, 'Something burnt on the stove!');
    }
  }
}

export function placeOnStove(state, stoveIndex) {
  const stove = state.stoves[stoveIndex];
  if (!stove || stove.item) return false;
  const item = cookableCarried(state);
  if (!item) return false;
  state.player.carrying = state.player.carrying.filter((c) => c !== item);
  stove.item = { id: item.id, kind: item.kind, label: item.label, state: 'cooking', t: 0 };
  stove.t = 0;
  return true;
}

export function takeFromStove(state, stoveIndex) {
  const stove = state.stoves[stoveIndex];
  if (!stove || !stove.item) return false;
  if (stove.item.state === 'cooking') {
    showToast(state, 'Still cooking — wait for the ring!');
    return false;
  }
  if (handsFree(state) <= 0) {
    showToast(state, 'Hands full!');
    return false;
  }
  const done = stove.item;
  if (done.state === 'burnt') {
    state.player.carrying.push({ id: 'burnt', kind: 'burnt', label: 'Burnt mess' });
  } else {
    const result = stoveResultFor(done);
    const label = PREPARED[result].name;
    state.player.carrying.push({ id: result, kind: 'prepared', label });
  }
  stove.item = null;
  stove.t = 0;
  return true;
}

// ---- plating counter ----

export function plateMatchesOrder(plateItems, order) {
  const have = plateItems.slice().sort();
  const want = order.dish.needs.slice().sort();
  return have.length === want.length && have.every((v, i) => v === want[i]);
}

export function plateMatchedOrder(state) {
  if (state.plate.items.length !== 3) return null;
  return state.orders.find((o) => plateMatchesOrder(state.plate.items, o)) || null;
}

export function addToPlate(state) {
  const prepared = state.player.carrying.find((c) => c.kind === 'prepared');
  if (!prepared) {
    showToast(state, 'The plate needs a prepared ingredient.');
    return false;
  }
  if (state.plate.items.length >= 3) {
    showToast(state, 'The plate is full — serve it or bin it.');
    return false;
  }
  state.player.carrying = state.player.carrying.filter((c) => c !== prepared);
  state.plate.items.push(prepared.id);
  const matched = plateMatchedOrder(state);
  if (matched) showToast(state, `That completes ${matched.dish.name} — serve it!`);
  return true;
}

export function takeFinishedPlate(state) {
  const matched = plateMatchedOrder(state);
  if (!matched) return false;
  if (handsFree(state) <= 0) {
    showToast(state, 'Hands full!');
    return false;
  }
  state.player.carrying.push({ id: 'plate', kind: 'plate', label: matched.dish.name, orderId: matched.id });
  state.plate.items = [];
  return true;
}

// ---- serve window + bin ----

export function servePlate(state) {
  const plate = state.player.carrying.find((c) => c.kind === 'plate');
  if (!plate) return false;
  const order = state.orders.find((o) => o.id === plate.orderId);
  if (!order) {
    showToast(state, 'That order already left — bin the plate.');
    return false;
  }
  const tip = Math.round((MAX_TIP * order.patience) / order.patienceMax);
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  let gained = BASE_SCORE + tip;
  if (state.combo > 0 && state.combo % COMBO_BONUS_EVERY === 0) {
    gained = Math.round(gained * 1.5);
    showToast(state, `Combo x${state.combo}! ${order.dish.name} served +${gained}`);
  } else {
    showToast(state, `${order.dish.name} served! +${gained}`);
  }
  state.score += gained;
  state.served += 1;
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.player.carrying = state.player.carrying.filter((c) => c !== plate);
  state.flash = 1;
  return true;
}

export function binCarried(state) {
  if (state.player.carrying.length > 0) {
    state.player.carrying = [];
    showToast(state, 'Binned.');
    return true;
  }
  if (state.plate.items.length > 0) {
    state.plate.items = [];
    showToast(state, 'Plate cleared.');
    return true;
  }
  return false;
}

// ---- one context action: what E / Space / a click does at a station ----

export function interact(state) {
  const station = nearestStation(state);
  if (!station) return false;
  if (station.id === 'pantry') {
    showToast(state, 'Pantry: click an ingredient, or press 1–6.');
    return true;
  }
  if (station.id === 'board') {
    if (!choppableCarried(state)) {
      showToast(state, 'Bring something choppable: tomato, pepper or mushroom.');
      return false;
    }
    return true;
  }
  if (station.id === 'stove-a') return stoveAction(state, 0);
  if (station.id === 'stove-b') return stoveAction(state, 1);
  if (station.id === 'plate') {
    if (plateMatchedOrder(state)) return takeFinishedPlate(state);
    return addToPlate(state);
  }
  if (station.id === 'serve') return servePlate(state);
  if (station.id === 'bin') return binCarried(state);
  return false;
}

function stoveAction(state, index) {
  const stove = state.stoves[index];
  if (stove.item) return takeFromStove(state, index);
  if (placeOnStove(state, index)) return true;
  showToast(state, 'Bring something to cook: noodles, egg, chopped tomato or mushroom.');
  return false;
}
