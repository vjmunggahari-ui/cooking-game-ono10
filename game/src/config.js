// Simmer & Serve — configuration: recipes, ingredients, timings, layout.
// Every number that tunes the game lives here so the rest of the code reads it,
// never a magic number of its own.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 800;

export const SHIFT_SECONDS = 180;
export const MAX_HEARTS = 3;
export const CARRY_LIMIT = 2;
export const MAX_ORDERS = 4;

export const CHOP_SECONDS = 1.0;
export const COOK_SECONDS = 3.0;
export const BURN_AFTER_SECONDS = 4.0;

export const PLAYER_SPEED = 280;
export const PLAYER_RADIUS = 22;

// Raw ingredients the pantry hands out. prep says what a station turns it into:
// board = chopping board, stove = the wok range. null = ready as picked.
export const INGREDIENTS = [
  { id: 'noodle', name: 'Noodles', color: '#f2c94c', prep: { station: 'stove', result: 'boiled-noodle' } },
  { id: 'egg', name: 'Egg', color: '#fdf3d0', prep: { station: 'stove', result: 'fried-egg' } },
  { id: 'tomato', name: 'Tomato', color: '#e4572e', prep: { station: 'board', result: 'chopped-tomato' } },
  { id: 'pepper', name: 'Pepper', color: '#5aa469', prep: { station: 'board', result: 'chopped-pepper' } },
  { id: 'mushroom', name: 'Mushroom', color: '#c9a876', prep: { station: 'board', result: 'chopped-mushroom' } },
  { id: 'herb', name: 'Herb', color: '#3e7d4e', prep: null },
];

// Prepared items: the id a station produces, and which raw item it came from.
export const PREPARED = {
  'boiled-noodle': { name: 'Boiled noodles', color: '#f2c94c', from: 'noodle' },
  'fried-egg': { name: 'Fried egg', color: '#fdf3d0', from: 'egg' },
  'chopped-tomato': { name: 'Chopped tomato', color: '#e4572e', from: 'tomato', stove: 'cooked-tomato' },
  'cooked-tomato': { name: 'Cooked tomato', color: '#c65a35', from: 'tomato' },
  'chopped-pepper': { name: 'Chopped pepper', color: '#5aa469', from: 'pepper' },
  'chopped-mushroom': { name: 'Chopped mushroom', color: '#c9a876', from: 'mushroom', stove: 'cooked-mushroom' },
  'cooked-mushroom': { name: 'Cooked mushroom', color: '#a9805a', from: 'mushroom' },
  herb: { name: 'Fresh herb', color: '#3e7d4e', from: 'herb' },
};

// Dishes: three prepared items on one plate. The order board shows these.
export const DISHES = [
  {
    id: 'sunny-noodles',
    name: 'Sunny Noodles',
    needs: ['boiled-noodle', 'fried-egg', 'herb'],
    blurb: 'noodles, fried egg, herb',
  },
  {
    id: 'garden-stirfry',
    name: 'Garden Stir-Fry',
    needs: ['chopped-pepper', 'cooked-mushroom', 'chopped-tomato'],
    blurb: 'pepper, mushroom, tomato',
  },
  {
    id: 'tomato-soup',
    name: 'Tomato Soup',
    needs: ['cooked-tomato', 'chopped-tomato', 'herb'],
    blurb: 'cooked tomato, tomato, herb',
  },
  {
    id: 'forest-noodles',
    name: 'Forest Noodles',
    needs: ['boiled-noodle', 'cooked-mushroom', 'fried-egg'],
    blurb: 'noodles, mushroom, egg',
  },
];

export const BASE_SCORE = 100;
export const MAX_TIP = 50;
export const COMBO_BONUS_EVERY = 3;

// Patience (seconds) of a fresh order, and how the spawn gap shrinks over a shift.
export function patienceFor(elapsedSeconds) {
  return Math.max(34, 58 - elapsedSeconds * 0.08);
}
export function spawnGapFor(elapsedSeconds) {
  return Math.max(8, 13 - elapsedSeconds * 0.03);
}

// Stations along the top wall. x/y is the counter centre; interactRange is how close
// the cook must stand. Every station is drawn by render.js from this table.
// Ranges are 130 for every station: the cook's closest approach is the aisle's
// top edge (FLOOR.y + 22 = 352), 102px from a station centre, so every range
// must clear 102 with margin or the station cannot be used at all.
export const STATIONS = [
  { id: 'pantry', name: 'Pantry', x: 120, y: 250, w: 170, h: 76, range: 130 },
  { id: 'board', name: 'Chopping Board', x: 310, y: 250, w: 150, h: 76, range: 130 },
  { id: 'stove-a', name: 'Stove', x: 490, y: 250, w: 130, h: 76, range: 130 },
  { id: 'stove-b', name: 'Stove', x: 640, y: 250, w: 130, h: 76, range: 130 },
  { id: 'plate', name: 'Plating Counter', x: 815, y: 250, w: 170, h: 76, range: 130 },
  { id: 'serve', name: 'Serve Window', x: 1010, y: 250, w: 150, h: 76, range: 130 },
  { id: 'bin', name: 'Bin', x: 1180, y: 250, w: 90, h: 76, range: 130 },
];

// The walkable aisle: a compact band directly in front of the cooking counter.
// Below it is the street-side customer area (drawn, not walkable).
export const FLOOR = { x: 24, y: 330, w: 1232, h: 130 };
export const PLAYER_START = { x: 640, y: 395 };

export const COLORS = {
  wall: '#7a4a2b',
  wallTrim: '#5e3820',
  floorA: '#d9a066',
  floorB: '#cf9459',
  counterTop: '#8a5a33',
  counterFront: '#6e4525',
  steel: '#c8ccd2',
  darkSteel: '#9aa0a8',
  cream: '#fff6e5',
  ink: '#2b1a12',
  softInk: '#5a4636',
  ticket: '#fff8e7',
  ticketEdge: '#e0c896',
  good: '#2f9e44',
  warn: '#f08c00',
  bad: '#e03131',
  gold: '#f2c94c',
  // street-side customer area
  aisleA: '#b98a5a',
  aisleB: '#a87a4e',
  awningA: '#f8f3e6',
  awningB: '#d94f3d',
  streetA: '#4a3628',
  streetB: '#3d2c20',
  cobble: '#5d4632',
  counterRail: '#d9a441',
  lanternGlow: 'rgba(255, 190, 90, 0.28)',
  chalk: '#2e4038',
  chalkText: '#e8f5e9',
};
