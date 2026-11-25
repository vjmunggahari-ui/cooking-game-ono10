// Simmer & Serve — kitchen state: the cook, the orders, the plate, the stoves.
// This file owns the shape of a shift and nothing else; cook.js changes it,
// render.js draws it.

import {
  CARRY_LIMIT,
  DISHES,
  FLOOR,
  MAX_HEARTS,
  MAX_ORDERS,
  PLAYER_START,
  SHIFT_SECONDS,
  patienceFor,
  spawnGapFor,
} from './config.js';
import { makeRandom, pickRandom } from './random.js';

let nextOrderId = 1;

export function newShift(seed) {
  nextOrderId = 1;
  const rng = makeRandom(seed || 20261125);
  const state = {
    mode: 'title',
    seed,
    rng,
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    score: 0,
    served: 0,
    missed: 0,
    hearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    player: {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      tx: PLAYER_START.x,
      ty: PLAYER_START.y,
      facing: 1,
      moving: false,
      carrying: [],
    },
    orders: [],
    plate: { items: [] },
    stoves: [
      { item: null, t: 0 },
      { item: null, t: 0 },
    ],
    chopping: { item: null, progress: 0 },
    spawnIn: 4,
    toast: '',
    toastT: 0,
    flash: 0,
    over: null,
  };
  spawnOrder(state);
  spawnOrder(state);
  return state;
}

export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const onBoard = new Set(state.orders.map((o) => o.dishId));
  const fresh = DISHES.filter((d) => !onBoard.has(d.id));
  const dish = pickRandom(state.rng, fresh.length > 0 ? fresh : DISHES);
  const patience = patienceFor(state.elapsed);
  const order = {
    id: nextOrderId,
    dishId: dish.id,
    dish,
    patience,
    patienceMax: patience,
  };
  nextOrderId += 1;
  state.orders.push(order);
  return order;
}

export function spawnTimerTick(state, dt) {
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (spawnOrder(state)) {
      state.spawnIn = spawnGapFor(state.elapsed);
    } else {
      state.spawnIn = 2;
    }
  }
}

export function patienceTick(state, dt) {
  for (const order of state.orders.slice()) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((o) => o.id !== order.id);
      state.missed += 1;
      state.combo = 0;
      state.hearts -= 1;
      showToast(state, `Order #${order.id} walked out — a heart lost!`);
      if (state.hearts <= 0) {
        endShift(state, 'The cart ran out of hearts.');
      }
    }
  }
}

export function shiftTimerTick(state, dt) {
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
  if (state.timeLeft <= 0) {
    endShift(state, 'Closing time — the shift is over!');
  }
}

export function endShift(state, reason) {
  if (state.mode === 'over') return;
  state.mode = 'over';
  const ladles = state.score >= 1500 ? 3 : state.score >= 900 ? 2 : 1;
  state.over = {
    reason,
    score: state.score,
    served: state.served,
    missed: state.missed,
    bestCombo: state.bestCombo,
    ladles,
  };
}

export function showToast(state, text) {
  state.toast = text;
  state.toastT = 3;
}

export function clampPlayerToFloor(player) {
  const r = 22;
  player.x = Math.max(FLOOR.x + r, Math.min(FLOOR.x + FLOOR.w - r, player.x));
  player.y = Math.max(FLOOR.y + r, Math.min(FLOOR.y + FLOOR.h - r, player.y));
}

export function handsFree(state) {
  return CARRY_LIMIT - state.player.carrying.length;
}
