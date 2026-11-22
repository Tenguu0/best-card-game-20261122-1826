// Mouse and keyboard input. The game reads clicks and keys into a small
// queue of actions the main loop drains each frame, so a click is never
// lost between frames and the renderer owns all hit-testing.

export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_CARD_BASE = 16;

/** A click the renderer has not placed yet: logical canvas coordinates. */
export function createInput(canvas) {
  const state = {
    actions: 0,
    clicks: [],
    hover: { x: -1, y: -1 },
  };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    state.hover = canvasPoint(event);
  });
  canvas.addEventListener('pointerdown', (event) => {
    state.clicks.push(canvasPoint(event));
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'enter' || key === ' ') {
      state.actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (key === 'e') {
      state.actions |= ACTION_END_TURN;
    } else if (key >= '1' && key <= '7') {
      state.actions |= ACTION_CARD_BASE << (Number(key) - 1);
    }
  });

  return {
    /** Drain the queued key actions, leaving clicks for the renderer. */
    takeActions() {
      const actions = state.actions;
      state.actions = 0;
      return actions;
    },
    /** Drain the queued clicks, in order. */
    takeClicks() {
      const clicks = state.clicks;
      state.clicks = [];
      return clicks;
    },
    hover() {
      return state.hover;
    },
  };
}
