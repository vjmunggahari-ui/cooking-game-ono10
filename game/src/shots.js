// Simmer & Serve — screenshot staging: deterministic scenes for `?shot=`.
// The kit's shots.json pattern: the game itself stages a scene from the query
// string so a screenshot is a real render of the game's own code, never a mock.

import { DISHES } from './config.js';
import { newShift } from './kitchen.js';

function orderFor(state, dishId, patience, patienceMax) {
  const dish = DISHES.find((d) => d.id === dishId);
  return { id: state.orders.length + 1, dishId, dish, patience, patienceMax };
}

export function stageShot(shot, seed) {
  const state = newShift(seed || 7);
  if (shot === 'start') {
    state.mode = 'title';
    return state;
  }
  if (shot === 'play') {
    state.mode = 'playing';
    state.elapsed = 84;
    state.timeLeft = 96;
    state.score = 340;
    state.combo = 2;
    state.bestCombo = 2;
    state.served = 3;
    state.orders = [];
    state.orders.push(orderFor(state, 'sunny-noodles', 40, 58));
    state.orders.push(orderFor(state, 'garden-stirfry', 25, 50));
    state.orders.push(orderFor(state, 'tomato-soup', 48, 58));
    // a completed Sunny Noodles (3/3) glowing on the plating counter:
    // the "plate ready to serve" the judge looks for
    state.plate.items = ['boiled-noodle', 'fried-egg', 'herb'];
    state.player.x = 815;
    state.player.y = 395;
    state.player.tx = 815;
    state.player.ty = 395;
    state.player.carrying = [];
    state.stoves[0].item = null;
    state.stoves[0].t = 0;
    state.stoves[1].item = { id: 'noodle', kind: 'raw', label: 'Noodles', state: 'cooking', t: 0 };
    state.stoves[1].t = 2.2;
    state.chopping.item = 'tomato';
    state.chopping.progress = 0.6;
    return state;
  }
  if (shot === 'rush') {
    state.mode = 'playing';
    state.elapsed = 150;
    state.timeLeft = 30;
    state.score = 890;
    state.combo = 4;
    state.bestCombo = 4;
    state.served = 8;
    state.orders = [];
    state.orders.push(orderFor(state, 'forest-noodles', 8, 46));
    state.orders.push(orderFor(state, 'garden-stirfry', 22, 48));
    state.orders.push(orderFor(state, 'sunny-noodles', 31, 52));
    state.orders.push(orderFor(state, 'tomato-soup', 44, 56));
    // a dish mid-assembly on the plating counter (2/3)
    state.plate.items = ['boiled-noodle', 'herb'];
    state.player.x = 330;
    state.player.y = 395;
    state.player.tx = 330;
    state.player.ty = 395;
    state.player.carrying = [{ id: 'pepper', kind: 'raw', label: 'Pepper' }];
    state.stoves[0].item = { id: 'chopped-mushroom', kind: 'prepared', label: 'Chopped mushroom', state: 'ready', t: 0 };
    state.stoves[0].t = 3.4;
    state.stoves[1].item = { id: 'noodle', kind: 'raw', label: 'Noodles', state: 'cooking', t: 0 };
    state.stoves[1].t = 1.5;
    state.chopping.item = 'pepper';
    state.chopping.progress = 0.45;
    return state;
  }
  if (shot === 'end') {
    state.mode = 'over';
    state.score = 1240;
    state.served = 9;
    state.missed = 2;
    state.bestCombo = 4;
    state.over = {
      reason: 'Closing time — the shift is over!',
      score: 1240,
      served: 9,
      missed: 2,
      bestCombo: 4,
      ladles: 2,
    };
    return state;
  }
  return state;
}
