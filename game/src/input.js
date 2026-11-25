// Simmer & Serve — input: keyboard movement, mouse click-to-move, pantry keys.
// This file only reads events and hands the game clean intents; main.js decides
// what they do.

export function createInput(canvas, handlers) {
  const keys = new Set();
  const input = {
    keys,
    interactHeld: false,
    clickTarget: null,
    clickStation: null,
  };

  const KEY_ACTIONS = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (event.code === 'KeyE' || event.code === 'Space') input.interactHeld = true;
      return;
    }
    keys.add(event.code);
    if (event.code === 'KeyE' || event.code === 'Space') {
      input.interactHeld = true;
      handlers.onInteract();
      event.preventDefault();
    }
    if (event.code >= 'Digit1' && event.code <= 'Digit6') {
      handlers.onPantryKey(Number(event.code.slice(-1)));
    }
    if (event.code === 'KeyR') handlers.onRestart();
    if (event.code === 'KeyM') handlers.onMute();
    if (event.code === 'Enter' || event.code === 'Space') handlers.onConfirm();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'KeyE' || event.code === 'Space') input.interactHeld = false;
  });

  window.addEventListener('blur', () => {
    keys.clear();
    input.interactHeld = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    handlers.onPointer(x, y);
  });

  return input;
}

export function movementFromKeys(input) {
  const keys = input.keys;
  let x = 0;
  let y = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (x !== 0 && y !== 0) {
    const len = Math.sqrt(x * x + y * y);
    x /= len;
    y /= len;
  }
  return { x, y };
}
