// Simmer & Serve — rendering: every pixel of the kitchen, drawn on one canvas.
// Food, tickets, stations, the cook and the overlays are all vector-drawn here;
// the game loads no images at all.

import { COLORS, FLOOR, GAME_HEIGHT, GAME_WIDTH, INGREDIENTS, PREPARED, STATIONS } from './config.js';
import { plateMatchedOrder } from './cook.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// ---- food icons (drawn, never loaded) ----

export function drawFoodIcon(ctx, id, x, y, size) {
  const s = size / 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (id === 'noodle' || id === 'boiled-noodle') {
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-10, i * 6);
      ctx.bezierCurveTo(-5, i * 6 - 4, 0, i * 6 + 4, 5, i * 6);
      ctx.bezierCurveTo(8, i * 6 - 3, 9, i * 6 + 2, 10, i * 6);
      ctx.stroke();
    }
    if (id === 'boiled-noodle') drawSteam(ctx, 0, -12);
  } else if (id === 'egg' || id === 'fried-egg') {
    ctx.fillStyle = '#fdf3d0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59f00';
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'tomato' || id === 'chopped-tomato' || id === 'cooked-tomato') {
    if (id === 'chopped-tomato') {
      ctx.fillStyle = '#e4572e';
      for (const [dx, dy] of [[-7, -4], [6, -5], [-2, 6]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = id === 'cooked-tomato' ? '#c65a35' : '#e4572e';
      ctx.beginPath();
      ctx.arc(0, 1, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3e7d4e';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-5, -13);
      ctx.lineTo(0, -11);
      ctx.lineTo(5, -13);
      ctx.closePath();
      ctx.fill();
      if (id === 'cooked-tomato') drawSteam(ctx, 0, -14);
    }
  } else if (id === 'pepper' || id === 'chopped-pepper') {
    ctx.fillStyle = '#5aa469';
    if (id === 'chopped-pepper') {
      for (const [dx, dy] of [[-7, -3], [5, -5], [0, 6]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.quadraticCurveTo(-10, -10, 0, -10);
      ctx.quadraticCurveTo(10, -10, 10, 2);
      ctx.quadraticCurveTo(6, 8, 0, 8);
      ctx.quadraticCurveTo(-6, 8, -10, 2);
      ctx.fill();
      ctx.fillStyle = '#3e7d4e';
      ctx.fillRect(-1.5, -13, 3, 5);
    }
  } else if (id === 'mushroom' || id === 'chopped-mushroom' || id === 'cooked-mushroom') {
    const cap = id === 'cooked-mushroom' ? '#a9805a' : '#c9a876';
    if (id === 'chopped-mushroom') {
      ctx.fillStyle = cap;
      for (const [dx, dy] of [[-7, -4], [6, -4], [-1, 6]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.arc(0, -2, 11, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f3e5c8';
      ctx.fillRect(-3, -2, 6, 10);
      if (id === 'cooked-mushroom') drawSteam(ctx, 0, -14);
    }
  } else if (id === 'herb') {
    ctx.strokeStyle = '#3e7d4e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (const [dx, dy, a] of [[-6, 4, -0.5], [0, 6, 0], [6, 4, 0.5]]) {
      ctx.beginPath();
      ctx.moveTo(dx, dy + 6);
      ctx.lineTo(dx + Math.sin(a) * 8, dy - 8);
      ctx.stroke();
    }
  } else if (id === 'burnt') {
    ctx.fillStyle = '#1f1a17';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    drawSteam(ctx, 0, -12, '#666');
  } else if (id === 'plate') {
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSteam(ctx, x, y, color = '#fff') {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 6);
  ctx.quadraticCurveTo(x - 7, y, x - 4, y - 6);
  ctx.moveTo(x + 4, y + 6);
  ctx.quadraticCurveTo(x + 7, y, x + 4, y - 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---- the whole frame ----

export function render(ctx, state, ui) {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawWallAndFloor(ctx);
  drawStations(ctx, state);
  drawCustomers(ctx, state);
  drawOrders(ctx, state);
  drawPlayer(ctx, state);
  drawHud(ctx, state);
  drawBottomBar(ctx, state, ui);
  drawToast(ctx, state);
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 246, 220, ${state.flash * 0.35})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
  if (state.mode === 'title') drawTitle(ctx, state);
  if (state.mode === 'over' && state.over) drawGameOver(ctx, state);
}

function drawWallAndFloor(ctx) {
  // Back wall with the cooking counter against it.
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, GAME_WIDTH, 330);
  ctx.fillStyle = COLORS.wallTrim;
  ctx.fillRect(0, 322, GAME_WIDTH, 8);

  // The chef's aisle: a compact band of wooden planks directly in front of
  // the counter. This is the whole walkable floor now.
  const aisleY = 330;
  const aisleH = 130;
  ctx.fillStyle = COLORS.aisleA;
  ctx.fillRect(FLOOR.x, aisleY, FLOOR.w, aisleH);
  const plankH = 26;
  for (let y = aisleY; y < aisleY + aisleH; y += plankH) {
    const row = Math.round((y - aisleY) / plankH);
    ctx.fillStyle = row % 2 === 0 ? COLORS.aisleA : COLORS.aisleB;
    ctx.fillRect(FLOOR.x, y, FLOOR.w, plankH);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(FLOOR.x, y);
    ctx.lineTo(FLOOR.x + FLOOR.w, y);
    ctx.stroke();
    // staggered plank seams
    const seamX = FLOOR.x + ((row * 317) % 900) + 120;
    ctx.beginPath();
    ctx.moveTo(seamX, y);
    ctx.lineTo(seamX, y + plankH);
    ctx.stroke();
  }
  // warm runner carpet down the middle of the aisle
  ctx.fillStyle = '#8c2f2f';
  ctx.fillRect(FLOOR.x + 60, 388, FLOOR.w - 120, 40);
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 2;
  ctx.strokeRect(FLOOR.x + 60, 388, FLOOR.w - 120, 40);
  // soft shadow where the aisle meets the counter
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(FLOOR.x, aisleY, FLOOR.w, 8);

  // Striped awning valance over the street side of the cart.
  const awnY = 458;
  const stripeW = 32;
  for (let x = 0; x < GAME_WIDTH; x += stripeW) {
    const i = Math.round(x / stripeW);
    ctx.fillStyle = i % 2 === 0 ? COLORS.awningA : COLORS.awningB;
    ctx.fillRect(x, awnY, stripeW, 30);
    ctx.beginPath();
    ctx.arc(x + stripeW / 2, awnY + 30, stripeW / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, awnY, GAME_WIDTH, 3);

  // The customer counter: the front of the cart, brass rail on top.
  ctx.fillStyle = COLORS.counterFront;
  ctx.fillRect(24, 496, 1232, 44);
  ctx.fillStyle = '#a06a3a';
  ctx.fillRect(24, 496, 1232, 12);
  ctx.fillStyle = COLORS.counterRail;
  ctx.fillRect(24, 494, 1232, 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let x = 24 + 64; x < 1256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 508);
    ctx.lineTo(x, 540);
    ctx.stroke();
  }

  // The street: warm cobblestones where customers wait.
  ctx.fillStyle = COLORS.streetA;
  ctx.fillRect(0, 540, GAME_WIDTH, 204);
  for (let row = 0; row < 4; row += 1) {
    const y = 556 + row * 48;
    const off = row % 2 === 0 ? 0 : 46;
    for (let x = -20 + off; x < GAME_WIDTH + 20; x += 92) {
      const shade = (x * 7 + row * 13) % 3;
      ctx.fillStyle = shade === 0 ? COLORS.cobble : shade === 1 ? COLORS.streetB : '#54402c';
      roundRect(ctx, x, y, 84, 40, 14);
      ctx.fill();
    }
  }
  // lantern glow pools on the street
  for (const lx of [300, 640, 980]) {
    const g = ctx.createRadialGradient(lx, 640, 10, lx, 640, 110);
    g.addColorStop(0, COLORS.lanternGlow);
    g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 110, 530, 220, 220);
  }

  drawStreetDecor(ctx);
}

function drawStreetDecor(ctx) {
  // Paper lanterns hanging from the awning.
  for (const [lx, hue] of [[300, '#e4572e'], [640, '#f2c94c'], [980, '#e4572e']]) {
    ctx.strokeStyle = '#5a4636';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, 494);
    ctx.lineTo(lx, 506);
    ctx.stroke();
    ctx.fillStyle = hue;
    ctx.beginPath();
    ctx.ellipse(lx, 524, 17, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(lx - 8, 500, 16, 5);
    ctx.fillRect(lx - 8, 543, 16, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(lx - 5, 516, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chalkboard menu standing on the street, far left.
  ctx.fillStyle = '#5a4636';
  ctx.beginPath();
  ctx.moveTo(44, 716);
  ctx.lineTo(58, 606);
  ctx.moveTo(124, 716);
  ctx.lineTo(110, 606);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = COLORS.chalk;
  roundRect(ctx, 34, 600, 100, 108, 6);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3f';
  ctx.lineWidth = 3;
  roundRect(ctx, 34, 600, 100, 108, 6);
  ctx.stroke();
  text(ctx, 'MENU', 84, 616, 11, COLORS.chalkText, 'center');
  const menu = ['Sunny Noodles', 'Garden Stir-Fry', 'Tomato Soup', 'Forest Noodles'];
  menu.forEach((line, i) => {
    text(ctx, line, 84, 636 + i * 16, 9, COLORS.chalkText, 'center');
  });

  // Crates and stacked bowls, far right.
  ctx.fillStyle = '#8a6a3f';
  ctx.fillRect(1124, 648, 62, 62);
  ctx.fillRect(1192, 664, 56, 46);
  ctx.strokeStyle = '#5a4636';
  ctx.lineWidth = 2;
  ctx.strokeRect(1124, 648, 62, 62);
  ctx.strokeRect(1192, 664, 56, 46);
  ctx.beginPath();
  ctx.moveTo(1124, 648);
  ctx.lineTo(1186, 710);
  ctx.moveTo(1186, 648);
  ctx.lineTo(1124, 710);
  ctx.stroke();
  // stacked bowls on the left crate
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.ellipse(1155, 640 - i * 12, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(1155, 640 - i * 12, 24, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // steam curls rising from the stoves, over the counter
  const t = Date.now() / 900;
  for (const [sx, ph] of [[490, 0], [640, 2.1]]) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const wob = Math.sin(t + ph) * 4;
    ctx.moveTo(sx + wob, 214);
    ctx.quadraticCurveTo(sx + wob - 8, 196, sx + wob + 2, 180);
    ctx.moveTo(sx + 12 + wob, 216);
    ctx.quadraticCurveTo(sx + 20 + wob, 198, sx + 10 + wob, 182);
    ctx.stroke();
  }
}

function drawStations(ctx, state) {
  for (const s of STATIONS) {
    const x = s.x - s.w / 2;
    const y = s.y - s.h / 2;
    const near = uiNear(state, s);
    ctx.fillStyle = COLORS.counterFront;
    roundRect(ctx, x, y + 8, s.w, s.h, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.counterTop;
    roundRect(ctx, x, y, s.w, s.h - 10, 10);
    ctx.fill();
    if (near) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3;
      roundRect(ctx, x - 3, y - 3, s.w + 6, s.h + 6, 12);
      ctx.stroke();
    }
    text(ctx, s.name.toUpperCase(), s.x, y + s.h - 6, 11, COLORS.cream, 'center');

    if (s.id === 'pantry') {
      for (let i = 0; i < INGREDIENTS.length; i += 1) {
        drawFoodIcon(ctx, INGREDIENTS[i].id, x + 22 + i * 24, y + 24, 22);
      }
    }
    if (s.id === 'board') {
      ctx.fillStyle = '#e8c98f';
      roundRect(ctx, x + 18, y + 12, s.w - 36, 34, 6);
      ctx.fill();
      if (state.chopping.item) {
        drawFoodIcon(ctx, state.chopping.item, s.x, y + 29, 24);
        drawProgressRing(ctx, s.x + 44, y + 29, 16, state.chopping.progress);
      } else {
        text(ctx, 'chop here', s.x, y + 29, 12, '#8a6a3f', 'center');
      }
    }
    if (s.id === 'stove-a' || s.id === 'stove-b') {
      const stove = state.stoves[s.id === 'stove-a' ? 0 : 1];
      ctx.fillStyle = '#3a3f45';
      ctx.beginPath();
      ctx.arc(s.x, y + 28, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22262b';
      ctx.beginPath();
      ctx.arc(s.x, y + 28, 20, 0, Math.PI * 2);
      ctx.fill();
      if (stove.item) {
        const done = stove.item.state === 'ready';
        const burnt = stove.item.state === 'burnt';
        ctx.fillStyle = burnt ? '#1f1a17' : '#5a4636';
        ctx.beginPath();
        ctx.arc(s.x, y + 26, 15, 0, Math.PI * 2);
        ctx.fill();
        if (!burnt) drawFoodIcon(ctx, stove.item.id, s.x, y + 26, 18);
        const frac = Math.min(1, stove.t / 3);
        drawProgressRing(ctx, s.x + 30, y + 12, 12, frac, done ? COLORS.good : '#f2c94c');
        if (done) text(ctx, 'READY', s.x, y + 52, 10, COLORS.good, 'center');
        if (burnt) text(ctx, 'BURNT!', s.x, y + 52, 10, COLORS.bad, 'center');
      } else {
        text(ctx, 'stove', s.x, y + 28, 12, '#8a919c', 'center');
      }
    }
    if (s.id === 'plate') {
      const matched = plateMatchedOrder(state);
      if (matched) {
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = `rgba(242, 201, 76, ${pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(s.x, y + 30, 62, 26, 0, 0, Math.PI * 2);
        ctx.stroke();
        drawSteam(ctx, s.x - 20, y - 6);
        drawSteam(ctx, s.x + 18, y - 8);
      }
      drawLayeredBowl(ctx, state.plate.items, s.x, y + 30, 120);
      // progress dots below the counter: how full the plate is, readable at thumbnail size
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = i < state.plate.items.length ? COLORS.gold : 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(s.x - 16 + i * 16, y + 90, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (matched) {
        text(ctx, 'READY TO SERVE', s.x, y + 104, 10, COLORS.good, 'center');
      } else if (state.plate.items.length > 0) {
        text(ctx, `${state.plate.items.length}/3 on the plate`, s.x, y + 104, 10, COLORS.cream, 'center');
      }
    }
    if (s.id === 'serve') {
      const matched = plateMatchedOrder(state);
      if (matched) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        const g = ctx.createRadialGradient(s.x, y + 25, 4, s.x, y + 25, 46);
        g.addColorStop(0, `rgba(242, 201, 76, ${0.55 * pulse + 0.25})`);
        g.addColorStop(1, 'rgba(242, 201, 76, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - 46, y - 21, 92, 92);
      }
      ctx.fillStyle = COLORS.steel;
      roundRect(ctx, x + 14, y + 8, s.w - 28, 34, 6);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(s.x, y + 25, 9, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(s.x - 12, y + 25, 24, 3);
      text(ctx, 'ring the bell', s.x, y + 52, 10, COLORS.cream, 'center');
      // glowing tray + bell on the customer counter below the serve window
      const trayY = 512;
      ctx.fillStyle = matched ? '#f2c94c' : '#c8ccd2';
      ctx.beginPath();
      ctx.ellipse(s.x, trayY, 34, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(s.x, trayY - 8, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(s.x - 9, trayY - 8, 18, 2);
      if (matched) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        ctx.fillStyle = `rgba(242, 201, 76, ${pulse})`;
        text(ctx, 'DING!', s.x + 44, trayY - 6, 12, '#f2c94c', 'center');
      }
    }
    if (s.id === 'bin') {
      ctx.fillStyle = '#495057';
      roundRect(ctx, s.x - 16, y + 10, 32, 34, 5);
      ctx.fill();
      ctx.fillStyle = '#343a40';
      ctx.fillRect(s.x - 19, y + 6, 38, 6);
    }
  }
}

function uiNear(state, station) {
  const p = state.player;
  const dx = p.x - station.x;
  const dy = p.y - station.y;
  return Math.sqrt(dx * dx + dy * dy) < station.range;
}

// ---- layered plated dish: a bowl that builds as ingredients land in it ----

function drawLayeredBowl(ctx, items, x, y, size) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // bowl body
  ctx.fillStyle = '#2f5d8a';
  ctx.beginPath();
  ctx.ellipse(0, 6, 52, 22, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#3a6ea5';
  ctx.beginPath();
  ctx.ellipse(0, 4, 52, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // broth / base once anything is in
  if (items.length >= 1) {
    ctx.fillStyle = '#f7b733';
    ctx.beginPath();
    ctx.ellipse(0, 2, 44, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // noodle waves as the base layer
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-30, -2 + i * 5);
      ctx.bezierCurveTo(-15, -6 + i * 5, 5, 2 + i * 5, 28, -2 + i * 5);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#dfe7ee';
    ctx.beginPath();
    ctx.ellipse(0, 2, 44, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // toppings layer: one drawn item per plate item, building left to right
  const slots = [[-26, -4], [2, -8], [26, -4]];
  items.forEach((id, i) => {
    if (i >= slots.length) return;
    drawFoodIcon(ctx, id, slots[i][0], slots[i][1], 26);
  });
  // garnish + steam on a finished dish
  if (items.length >= 3) {
    drawFoodIcon(ctx, 'herb', 0, -16, 20);
    drawSteam(ctx, -14, -24);
    drawSteam(ctx, 12, -26);
  }
  // rim highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 2, 48, 16, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---- street customers: one waiting figure per open ticket ----

const CUSTOMER_COLORS = ['#2a9d8f', '#7b2cbf', '#e07a5f', '#4361ee'];
const CUSTOMER_SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];

function drawCustomers(ctx, state) {
  state.orders.forEach((order, i) => {
    const x = 170 + i * 304;
    const frac = Math.max(0, order.patience / order.patienceMax);
    const mood = frac < 0.3 ? 'angry' : frac < 0.6 ? 'worried' : 'happy';
    const wob = mood === 'angry' ? Math.sin(order.id * 1.7) * 2 : 0;
    const cx = x + wob;
    const feetY = 712;
    const color = CUSTOMER_COLORS[i % CUSTOMER_COLORS.length];
    const skin = CUSTOMER_SKIN[i % CUSTOMER_SKIN.length];

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, feetY, 34, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // body / tunic
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 26, feetY);
    ctx.quadraticCurveTo(cx - 30, feetY - 62, cx - 18, feetY - 72);
    ctx.lineTo(cx + 18, feetY - 72);
    ctx.quadraticCurveTo(cx + 30, feetY - 62, cx + 26, feetY);
    ctx.closePath();
    ctx.fill();
    // belt
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(cx - 26, feetY - 34, 52, 6);
    // arms holding a small empty bowl
    ctx.strokeStyle = color;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 20, feetY - 62);
    ctx.quadraticCurveTo(cx - 30, feetY - 44, cx - 12, feetY - 42);
    ctx.moveTo(cx + 20, feetY - 62);
    ctx.quadraticCurveTo(cx + 30, feetY - 44, cx + 12, feetY - 42);
    ctx.stroke();
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.ellipse(cx, feetY - 42, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx, feetY - 88, 20, 0, Math.PI * 2);
    ctx.fill();
    // hair by slot: bun, cap, headband, curly
    ctx.fillStyle = '#2b1a12';
    if (i % 4 === 0) {
      ctx.beginPath();
      ctx.arc(cx, feetY - 102, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, feetY - 90, 20, Math.PI, 0);
      ctx.fill();
    } else if (i % 4 === 1) {
      ctx.beginPath();
      ctx.arc(cx, feetY - 92, 21, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 22, feetY - 96, 44, 6);
    } else if (i % 4 === 2) {
      ctx.strokeStyle = '#e03131';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, feetY - 90, 19, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      for (const [dx, dy] of [[-14, -8], [0, -12], [14, -8], [-8, -14], [8, -14]]) {
        ctx.beginPath();
        ctx.arc(cx + dx, feetY - 88 + dy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // eyes + mouth by mood
    ctx.fillStyle = '#2b1a12';
    ctx.beginPath();
    ctx.arc(cx - 7, feetY - 90, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 7, feetY - 90, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b1a12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (mood === 'happy') {
      ctx.arc(cx, feetY - 82, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (mood === 'worried') {
      ctx.moveTo(cx - 5, feetY - 80);
      ctx.lineTo(cx + 5, feetY - 80);
    } else {
      ctx.arc(cx, feetY - 76, 6, 1.15 * Math.PI, 1.85 * Math.PI);
    }
    ctx.stroke();
    // ticket-number badge above the head, matching the order ticket
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.arc(cx + 22, feetY - 116, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mood === 'angry' ? COLORS.bad : '#e0c896';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + 22, feetY - 116, 11, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, `#${order.id}`, cx + 22, feetY - 116, 9, COLORS.ink, 'center');
    // impatient marker
    if (mood === 'angry') {
      ctx.fillStyle = COLORS.bad;
      ctx.beginPath();
      ctx.arc(cx - 24, feetY - 118, 10, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '!', cx - 24, feetY - 118, 13, '#fff', 'center');
    }
  });
}

function drawProgressRing(ctx, x, y, r, frac, color = '#f2c94c') {
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

function drawOrders(ctx, state) {
  const w = 292;
  const h = 86;
  const gap = 12;
  state.orders.forEach((order, i) => {
    const x = 24 + i * (w + gap);
    const y = 78;
    const frac = Math.max(0, order.patience / order.patienceMax);
    ctx.fillStyle = COLORS.ticket;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = frac < 0.3 ? COLORS.bad : COLORS.ticketEdge;
    ctx.lineWidth = frac < 0.3 ? 3 : 1.5;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    text(ctx, `#${order.id}  ${order.dish.name.toUpperCase()}`, x + 12, y + 16, 15, COLORS.ink);
    text(ctx, order.dish.blurb, x + 12, y + 38, 11, COLORS.softInk);
    order.dish.needs.forEach((need, j) => {
      drawFoodIcon(ctx, need, x + 22 + j * 30, y + 60, 22);
    });
    ctx.fillStyle = '#e9ecef';
    roundRect(ctx, x + 110, y + 52, w - 122, 12, 6);
    ctx.fill();
    ctx.fillStyle = frac < 0.3 ? COLORS.bad : frac < 0.6 ? COLORS.warn : COLORS.good;
    roundRect(ctx, x + 110, y + 52, (w - 122) * frac, 12, 6);
    ctx.fill();
  });
  if (state.orders.length === 0) {
    text(ctx, 'No orders — take a breath, chef.', 24, 120, 15, COLORS.cream);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 20, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // body / apron
  ctx.fillStyle = '#e9ecef';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f08c00';
  ctx.beginPath();
  ctx.arc(p.x, p.y + 6, 14, 0, Math.PI);
  ctx.fill();
  // face
  ctx.fillStyle = '#2b1a12';
  ctx.beginPath();
  ctx.arc(p.x - 7 + p.facing * 2, p.y - 4, 2.5, 0, Math.PI * 2);
  ctx.arc(p.x + 7 + p.facing * 2, p.y - 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // chef hat
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x - 9, p.y - 20, 8, 0, Math.PI * 2);
  ctx.arc(p.x, p.y - 24, 9, 0, Math.PI * 2);
  ctx.arc(p.x + 9, p.y - 20, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(p.x - 14, p.y - 22, 28, 7);
  // carried items above the head
  p.carrying.forEach((item, i) => {
    const cx = p.x - (p.carrying.length - 1) * 18 + i * 36;
    ctx.fillStyle = 'rgba(255,246,229,0.95)';
    ctx.beginPath();
    ctx.arc(cx, p.y - 44, 14, 0, Math.PI * 2);
    ctx.fill();
    drawFoodIcon(ctx, item.id === 'plate' ? 'plate' : item.id, cx, p.y - 44, 18);
  });
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(43,26,18,0.85)';
  ctx.fillRect(0, 0, GAME_WIDTH, 64);
  text(ctx, 'SIMMER & SERVE', 24, 22, 20, COLORS.gold);
  text(ctx, `SCORE ${state.score}`, 24, 46, 14, COLORS.cream);
  const mins = Math.floor(state.timeLeft / 60);
  const secs = Math.floor(state.timeLeft % 60);
  const timeText = `${mins}:${secs.toString().padStart(2, '0')}`;
  const urgent = state.timeLeft < 30;
  text(ctx, timeText, GAME_WIDTH / 2, 26, 26, urgent ? COLORS.bad : COLORS.cream, 'center');
  ctx.fillStyle = '#e9ecef';
  roundRect(ctx, GAME_WIDTH / 2 - 150, 46, 300, 10, 5);
  ctx.fill();
  ctx.fillStyle = urgent ? COLORS.bad : COLORS.good;
  roundRect(ctx, GAME_WIDTH / 2 - 150, 46, 300 * (state.timeLeft / 180), 10, 5);
  ctx.fill();
  for (let i = 0; i < 3; i += 1) {
    const x = GAME_WIDTH - 120 + i * 30;
    drawHeart(ctx, x, 24, i < state.hearts);
  }
  if (state.combo >= 2) {
    text(ctx, `COMBO x${state.combo}`, GAME_WIDTH - 140, 48, 14, COLORS.gold, 'center');
  }
}

function drawHeart(ctx, x, y, full) {
  ctx.fillStyle = full ? COLORS.bad : 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + 7);
  ctx.bezierCurveTo(x - 10, y - 2, x - 6, y - 10, x, y - 4);
  ctx.bezierCurveTo(x + 6, y - 10, x + 10, y - 2, x, y + 7);
  ctx.fill();
}

function drawBottomBar(ctx, state, ui) {
  ctx.fillStyle = 'rgba(43,26,18,0.9)';
  ctx.fillRect(0, GAME_HEIGHT - 56, GAME_WIDTH, 56);
  if (ui.nearPantry) {
    text(ctx, 'PANTRY — click or press 1–6:', 24, GAME_HEIGHT - 28, 14, COLORS.gold);
    INGREDIENTS.forEach((ing, i) => {
      const x = 300 + i * 130;
      ctx.fillStyle = 'rgba(255,246,229,0.12)';
      roundRect(ctx, x, GAME_HEIGHT - 48, 120, 40, 8);
      ctx.fill();
      drawFoodIcon(ctx, ing.id, x + 18, GAME_HEIGHT - 28, 20);
      text(ctx, `${i + 1} ${ing.name}`, x + 34, GAME_HEIGHT - 28, 12, COLORS.cream);
    });
  } else {
    const prompt = ui.prompt || 'Move with WASD / arrows or click the floor. Press E at a station to work it.';
    text(ctx, prompt, 24, GAME_HEIGHT - 28, 14, COLORS.cream);
    text(ctx, 'E interact · 1–6 pantry · M mute · R restart', GAME_WIDTH - 24, GAME_HEIGHT - 28, 12, '#c9b8a3', 'right');
  }
}

function drawToast(ctx, state) {
  if (state.toastT <= 0 || !state.toast) return;
  ctx.globalAlpha = Math.min(1, state.toastT);
  const w = ctx.measureText(state.toast).width + 40;
  ctx.fillStyle = 'rgba(43,26,18,0.9)';
  roundRect(ctx, GAME_WIDTH / 2 - w / 2, 178, w, 34, 17);
  ctx.fill();
  text(ctx, state.toast, GAME_WIDTH / 2, 195, 14, COLORS.cream, 'center');
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(30,16,8,0.72)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  text(ctx, 'SIMMER & SERVE', GAME_WIDTH / 2, 220, 64, COLORS.gold, 'center');
  text(ctx, 'a tiny noodle-cart rush', GAME_WIDTH / 2, 272, 22, COLORS.cream, 'center');
  const lines = [
    'Orders land on the board — read the ticket, then cook what it asks.',
    'Pantry (1–6) grabs ingredients · Board chops · Stove cooks · Plate builds · Bell serves.',
    'Serve before patience runs out. Three strikes and the cart closes early.',
    '180 seconds. How many plates can you land?',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, GAME_WIDTH / 2, 340 + i * 30, 16, '#e8dcc8', 'center');
  });
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = pulse;
  text(ctx, 'Click or press Enter to start', GAME_WIDTH / 2, 520, 22, COLORS.gold, 'center');
  ctx.globalAlpha = 1;
}

function drawGameOver(ctx, state) {
  const o = state.over;
  ctx.fillStyle = 'rgba(30,16,8,0.78)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  text(ctx, 'SHIFT OVER', GAME_WIDTH / 2, 210, 56, COLORS.gold, 'center');
  text(ctx, o.reason, GAME_WIDTH / 2, 262, 18, COLORS.cream, 'center');
  text(ctx, `SCORE  ${o.score}`, GAME_WIDTH / 2, 330, 30, COLORS.cream, 'center');
  text(ctx, `Plates served ${o.served}   •   Walked out ${o.missed}   •   Best combo x${o.bestCombo}`, GAME_WIDTH / 2, 380, 16, '#e8dcc8', 'center');
  for (let i = 0; i < 3; i += 1) {
    drawLadle(ctx, GAME_WIDTH / 2 - 70 + i * 70, 440, i < o.ladles);
  }
  text(ctx, 'Press R or click to play again', GAME_WIDTH / 2, 520, 20, COLORS.gold, 'center');
}

function drawLadle(ctx, x, y, lit) {
  ctx.strokeStyle = lit ? COLORS.gold : 'rgba(255,255,255,0.25)';
  ctx.fillStyle = lit ? COLORS.gold : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y - 26);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y + 14, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b1a12';
  ctx.beginPath();
  ctx.arc(x, y + 14, 7, 0, Math.PI * 2);
  ctx.fill();
}
