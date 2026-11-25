// Simmer & Serve — main: the game loop, the state machine, and the wiring
// between input, cooking actions and rendering.

import { FLOOR, GAME_HEIGHT, GAME_WIDTH, INGREDIENTS, PLAYER_SPEED, STATIONS } from './config.js';
import { newShift, patienceTick, shiftTimerTick, showToast, spawnTimerTick } from './kitchen.js';
import {
  chopTick,
  cookableCarried,
  choppableCarried,
  grabIngredient,
  interact,
  nearestStation,
  plateMatchedOrder,
  stoveTick,
} from './cook.js';
import { createInput, movementFromKeys } from './input.js';
import { render } from './render.js';
import { sfx, toggleMute, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 20261125);

let state = shot ? stageShot(shot, seed) : newShift(seed);
const frozen = Boolean(shot);
let lastError = null;

window.addEventListener('error', (event) => {
  lastError = String(event.message || event.error || 'error');
});

function fitCanvas() {
  const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  canvas.style.width = `${Math.floor(GAME_WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(GAME_HEIGHT * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function startShift() {
  state = newShift((Date.now() % 100000) + 1);
  state.mode = 'playing';
  sfx.start();
}

function stationFront(station) {
  return { x: station.x, y: station.y + station.h / 2 + 60 };
}

const input = createInput(canvas, {
  onInteract() {
    if (state.mode === 'title') {
      startShift();
      return;
    }
    if (state.mode !== 'playing') return;
    const before = state.score;
    const ok = interact(state);
    if (ok) sfx.place();
    if (state.score > before) sfx.serve();
  },
  onPantryKey(n) {
    if (state.mode !== 'playing') return;
    const station = nearestStation(state);
    if (!station || station.id !== 'pantry') return;
    if (n < 1 || n > INGREDIENTS.length) return;
    if (grabIngredient(state, INGREDIENTS[n - 1].id)) sfx.pickup();
    else sfx.error();
  },
  onRestart() {
    if (state.mode === 'over') startShift();
  },
  onMute() {
    const muted = toggleMute();
    showToast(state, muted ? 'Sound off.' : 'Sound on.');
  },
  onConfirm() {
    if (state.mode === 'title') startShift();
    else if (state.mode === 'over') startShift();
  },
  onPointer(x, y) {
    unlockAudio();
    if (state.mode === 'title') {
      startShift();
      return;
    }
    if (state.mode === 'over') {
      startShift();
      return;
    }
    if (state.mode !== 'playing') return;
    const station = nearestStation(state);
    if (station && station.id === 'pantry' && y > GAME_HEIGHT - 56) {
      for (let i = 0; i < INGREDIENTS.length; i += 1) {
        const bx = 300 + i * 130;
        if (x >= bx && x <= bx + 120) {
          if (grabIngredient(state, INGREDIENTS[i].id)) sfx.pickup();
          else sfx.error();
          return;
        }
      }
    }
    const clicked = STATIONS.find((s) => Math.abs(x - s.x) < s.w / 2 + 10 && Math.abs(y - s.y) < s.h / 2 + 10);
    if (clicked) {
      const front = stationFront(clicked);
      state.player.tx = front.x;
      state.player.ty = front.y;
      input.clickStation = clicked.id;
      return;
    }
    state.player.tx = Math.max(FLOOR.x, Math.min(FLOOR.x + FLOOR.w, x));
    state.player.ty = Math.max(FLOOR.y, Math.min(FLOOR.y + FLOOR.h, y));
    input.clickStation = null;
  },
});

function movePlayer(dt) {
  const p = state.player;
  const mv = movementFromKeys(input);
  if (mv.x !== 0 || mv.y !== 0) {
    p.tx = p.x;
    p.ty = p.y;
    input.clickStation = null;
    p.x += mv.x * PLAYER_SPEED * dt;
    p.y += mv.y * PLAYER_SPEED * dt;
    p.facing = mv.x !== 0 ? Math.sign(mv.x) : p.facing;
    p.moving = true;
  } else if (p.tx !== p.x || p.ty !== p.y) {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = PLAYER_SPEED * dt;
    if (dist <= step) {
      p.x = p.tx;
      p.y = p.ty;
      p.moving = false;
      if (input.clickStation) {
        const id = input.clickStation;
        input.clickStation = null;
        if (id !== 'pantry') {
          const before = state.score;
          interact(state);
          if (state.score > before) sfx.serve();
        }
      }
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      p.facing = dx !== 0 ? Math.sign(dx) : p.facing;
      p.moving = true;
    }
  } else {
    p.moving = false;
  }
  p.x = Math.max(FLOOR.x + 22, Math.min(FLOOR.x + FLOOR.w - 22, p.x));
  p.y = Math.max(FLOOR.y + 22, Math.min(FLOOR.y + FLOOR.h - 22, p.y));
}

function promptFor(state) {
  const station = nearestStation(state);
  if (!station) return '';
  if (station.id === 'pantry') return 'Pantry — click an ingredient, or press 1–6.';
  if (station.id === 'board') {
    const item = choppableCarried(state);
    if (item) return `Hold E to chop the ${item.label.toLowerCase()}.`;
    return 'Bring tomato, pepper or mushroom to chop.';
  }
  if (station.id === 'stove-a' || station.id === 'stove-b') {
    const stove = state.stoves[station.id === 'stove-a' ? 0 : 1];
    if (stove.item) {
      if (stove.item.state === 'cooking') return 'Cooking… wait for the ring, then press E.';
      if (stove.item.state === 'ready') return `Press E to take the ${stove.item.label.toLowerCase()}.`;
      return 'Burnt! Press E, then bin it.';
    }
    const item = cookableCarried(state);
    if (item) return `Press E to cook the ${item.label.toLowerCase()}.`;
    return 'Bring noodles, egg or chopped veg to cook.';
  }
  if (station.id === 'plate') {
    const matched = plateMatchedOrder(state);
    if (matched) return `Press E to pick up the finished ${matched.dish.name}.`;
    if (state.plate.items.length > 0) {
      return `Plate: ${state.plate.items.length}/3 — add a prepared ingredient, or bin it.`;
    }
    return 'Press E to add a prepared ingredient to the plate.';
  }
  if (station.id === 'serve') {
    const plate = state.player.carrying.find((c) => c.kind === 'plate');
    if (plate) return `Press E to serve the ${plate.label}!`;
    return 'Bring a finished plate here to serve.';
  }
  if (station.id === 'bin') return 'Press E to bin what you carry.';
  return '';
}

let last = performance.now();
let chopSoundT = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    if (!frozen && state.mode === 'playing') {
      movePlayer(dt);
      spawnTimerTick(state, dt);
      patienceTick(state, dt);
      shiftTimerTick(state, dt);
      stoveTick(state, dt);
      const station = nearestStation(state);
      const holding = input.interactHeld && station && station.id === 'board';
      const before = state.chopping.progress;
      chopTick(state, dt, holding);
      if (holding && state.chopping.progress > before) {
        chopSoundT -= dt;
        if (chopSoundT <= 0) {
          sfx.chop();
          chopSoundT = 0.28;
        }
      }
      if (state.toastT > 0) state.toastT -= dt;
      if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2);
    }
    const station = nearestStation(state);
    const ui = {
      nearPantry: Boolean(station && station.id === 'pantry' && state.mode === 'playing'),
      prompt: state.mode === 'playing' ? promptFor(state) : '',
    };
    render(ctx, state, ui);
    if (lastError) {
      ctx.fillStyle = 'rgba(200,0,0,0.9)';
      ctx.fillRect(0, 0, GAME_WIDTH, 30);
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(lastError.slice(0, 140), 8, 19);
    }
  } catch (err) {
    lastError = String(err && err.message ? err.message : err);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

export { state };
