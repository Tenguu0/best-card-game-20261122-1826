// Ember Duel renderer: one canvas, one fixed 1280x720 table, scaled to the
// window. It draws the title screen, the duel table (both hands, both life
// totals, energy, the log and the last played card) and the win/loss screens.
// It also owns hit-testing, so the main loop asks it where a click landed.

import { FOE_NAME, PALETTE, PLAYER_NAME, SUIT, SUIT_STYLE, TABLE } from './config.js';
import { cardValueLabel } from './deck.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const CARD_W = 150;
const CARD_H = 210;
const FOE_CARD_W = 62;
const FOE_CARD_H = 88;
const HAND_Y = 496;
const HAND_GAP = 132;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, align = 'left', weight = 'normal') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function wrapText(ctx, value, maxWidth) {
  const words = value.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw one suit's shape: flame triangle, tide droplet, leaf diamond, stone square. */
export function drawSuitIcon(ctx, suit, x, y, size, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  const s = size / 2;
  ctx.beginPath();
  if (suit === SUIT.FLAME) {
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.9, y + s * 0.7);
    ctx.lineTo(x - s * 0.9, y + s * 0.7);
  } else if (suit === SUIT.TIDE) {
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x + s, y + s * 0.2, x, y + s);
    ctx.quadraticCurveTo(x - s, y + s * 0.2, x, y - s);
  } else if (suit === SUIT.LEAF) {
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x + s, y, x, y + s);
    ctx.quadraticCurveTo(x - s, y, x, y - s);
  } else {
    ctx.rect(x - s * 0.8, y - s * 0.8, s * 1.6, s * 1.6);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The rectangle of the player's i-th card in a hand of `count`. */
export function playerCardRect(index, count, hoveredIndex) {
  const total = (count - 1) * HAND_GAP + CARD_W;
  const startX = (TABLE.width - total) / 2;
  const y = index === hoveredIndex ? HAND_Y - 34 : HAND_Y;
  return { x: startX + index * HAND_GAP, y, w: CARD_W, h: CARD_H };
}

/** The End Turn button, bottom right of the table. */
export function endTurnRect() {
  return { x: 1072, y: 636, w: 168, h: 52 };
}

/** The big start button on the title screen. */
export function startButtonRect() {
  return { x: 490, y: 560, w: 300, h: 64 };
}

function drawCardFace(ctx, card, x, y, w, h, playable, hovered) {
  const style = SUIT_STYLE[card.suit];
  ctx.save();
  if (hovered) {
    ctx.shadowColor = style.colour;
    ctx.shadowBlur = 22;
  }
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = '#f7ecd4';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = playable ? style.colour : '#8a7a5c';
  ctx.stroke();
  // Suit colour band across the top.
  ctx.save();
  roundRect(ctx, x + 3, y + 3, w - 6, 34, 9);
  ctx.fillStyle = style.colour;
  ctx.fill();
  ctx.restore();
  // Cost gem, top left.
  ctx.beginPath();
  ctx.arc(x + 24, y + 20, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#1d4e89';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#bfe3ff';
  ctx.stroke();
  text(ctx, String(card.cost), x + 24, y + 26, 18, '#ffffff', 'center', 'bold');
  drawSuitIcon(ctx, card.suit, x + w - 26, y + 20, 22, '#ffffff');
  // Name.
  text(ctx, card.name, x + w / 2, y + 62, 16, '#241a10', 'center', 'bold');
  // Big value, centre: shrink long labels so they never bleed past the card.
  const valueSize = cardValueLabel(card).length <= 6 ? 30 : cardValueLabel(card).length <= 8 ? 25 : 21;
  text(ctx, cardValueLabel(card), x + w / 2, y + 122, valueSize, style.dark, 'center', 'bold');
  drawSuitIcon(ctx, card.suit, x + w / 2, y + 152, 26, style.colour);
  // Blurb, wrapped.
  ctx.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
  const lines = wrapText(ctx, card.blurb, w - 20);
  lines.forEach((line, i) => text(ctx, line, x + w / 2, y + 182 + i * 15, 12, '#5c4a30', 'center'));
  if (!playable) {
    ctx.fillStyle = 'rgba(40, 30, 18, 0.35)';
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#5a2d18';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f2c14e';
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 5);
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.6)';
  ctx.stroke();
  drawSuitIcon(ctx, SUIT.FLAME, x + w / 2, y + h / 2, 26, '#f2c14e');
}

function drawHpBar(ctx, x, y, w, label, hp, maxHp, shield) {
  text(ctx, label, x, y - 8, 15, PALETTE.text, 'left', 'bold');
  roundRect(ctx, x, y, w, 22, 11);
  ctx.fillStyle = '#1a120a';
  ctx.fill();
  const frac = Math.max(0, hp / maxHp);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 18, 9);
    ctx.fillStyle = frac > 0.5 ? PALETTE.hpGood : frac > 0.25 ? PALETTE.gold : PALETTE.hpLow;
    ctx.fill();
  }
  text(ctx, `${hp} / ${maxHp}`, x + w / 2, y + 17, 14, '#ffffff', 'center', 'bold');
  if (shield > 0) {
    roundRect(ctx, x + w + 10, y - 2, 74, 26, 8);
    ctx.fillStyle = PALETTE.shield;
    ctx.fill();
    text(ctx, `SHIELD ${shield}`, x + w + 47, y + 16, 14, '#ffffff', 'center', 'bold');
  }
}

function drawEnergyPips(ctx, x, y, energy, maxEnergy) {
  text(ctx, 'ENERGY', x, y - 8, 13, PALETTE.muted, 'left', 'bold');
  for (let i = 0; i < maxEnergy; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 12 + i * 28, y + 10, 10, 0, Math.PI * 2);
    ctx.fillStyle = i < energy ? PALETTE.energy : '#3a2c1c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = i < energy ? '#bfefff' : '#6b4d2a';
    ctx.stroke();
  }
}

function drawTableBackdrop(ctx) {
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, TABLE.width, TABLE.height);
  ctx.fillStyle = PALETTE.table;
  ctx.fillRect(24, 24, TABLE.width - 48, TABLE.height - 48);
  ctx.strokeStyle = PALETTE.tableEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, TABLE.width - 48, TABLE.height - 48);
  // Felt centre.
  ctx.fillStyle = PALETTE.felt;
  ctx.beginPath();
  ctx.ellipse(TABLE.width / 2, 330, 380, 130, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTitle(ctx, best) {
  drawTableBackdrop(ctx);
  // A fanned row of sample cards behind the title.
  const samples = [
    { name: 'Ember Strike', suit: SUIT.FLAME, kind: 'strike', cost: 1, value: 3, blurb: 'Deal 3 damage.' },
    { name: 'Spring Water', suit: SUIT.TIDE, kind: 'mend', cost: 1, value: 4, blurb: 'Restore 4 life.' },
    { name: 'Thornbark', suit: SUIT.LEAF, kind: 'guard', cost: 2, value: 7, blurb: 'Gain a 7 shield.' },
  ];
  samples.forEach((card, i) => {
    ctx.save();
    ctx.translate(430 + i * 170, 300);
    ctx.rotate((i - 1) * 0.12);
    drawCardFace(ctx, card, -75, -105, CARD_W, CARD_H, true, false);
    ctx.restore();
  });
  text(ctx, 'EMBER DUEL', TABLE.width / 2, 120, 72, PALETTE.gold, 'center', 'bold');
  text(ctx, 'A duel of ember cards against Cinder, the Ash Warden', TABLE.width / 2, 158, 20, PALETTE.text, 'center');
  text(ctx, 'Play cards with the mouse or keys 1–7 • E or Space ends your turn', TABLE.width / 2, 470, 17, PALETTE.muted, 'center');
  text(ctx, 'Two cards of one suit in a turn kindle a COMBO +2 • First to 0 life loses', TABLE.width / 2, 496, 17, PALETTE.muted, 'center');
  const button = startButtonRect();
  roundRect(ctx, button.x, button.y, button.w, button.h, 12);
  ctx.fillStyle = PALETTE.button;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.buttonEdge;
  ctx.stroke();
  text(ctx, 'BEGIN THE DUEL', button.x + button.w / 2, button.y + 40, 24, '#ffffff', 'center', 'bold');
  text(ctx, 'Press Enter or click', TABLE.width / 2, 660, 15, PALETTE.muted, 'center');
  if (best > 0) text(ctx, `Best result: won in ${best} rounds`, TABLE.width / 2, 690, 14, PALETTE.gold, 'center');
}

function drawEndScreen(ctx, match, won) {
  drawTableBackdrop(ctx);
  const title = won ? 'VICTORY' : 'DEFEAT';
  const colour = won ? PALETTE.gold : '#e5534b';
  text(ctx, title, TABLE.width / 2, 220, 84, colour, 'center', 'bold');
  text(
    ctx,
    won ? 'Cinder’s embers gutter out. The table is yours.' : 'Cinder’s embers burn you down. The table is lost.',
    TABLE.width / 2,
    270,
    22,
    PALETTE.text,
    'center',
  );
  text(ctx, `Rounds played: ${match.turn}`, TABLE.width / 2, 330, 20, PALETTE.muted, 'center');
  text(ctx, `Cards played: ${match.stats.cardsPlayed}`, TABLE.width / 2, 360, 20, PALETTE.muted, 'center');
  text(ctx, `Damage dealt: ${match.stats.damageDealt}`, TABLE.width / 2, 390, 20, PALETTE.muted, 'center');
  text(ctx, `Your life: ${match.player.hp} / ${match.player.maxHp}    •    Cinder’s life: ${match.foe.hp} / ${match.foe.maxHp}`, TABLE.width / 2, 430, 20, PALETTE.text, 'center');
  const button = startButtonRect();
  roundRect(ctx, button.x, button.y, button.w, button.h, 12);
  ctx.fillStyle = PALETTE.button;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.buttonEdge;
  ctx.stroke();
  text(ctx, 'PLAY AGAIN', button.x + button.w / 2, button.y + 40, 24, '#ffffff', 'center', 'bold');
  text(ctx, 'Press Enter or click', TABLE.width / 2, 660, 15, PALETTE.muted, 'center');
}

function drawPlayTable(ctx, match, ui) {
  drawTableBackdrop(ctx);
  // Foe panel: name, life, shield, deck.
  text(ctx, FOE_NAME, 48, 62, 20, '#d9b8ff', 'left', 'bold');
  drawHpBar(ctx, 48, 72, 420, '', match.foe.hp, match.foe.maxHp, match.foe.shield);
  text(ctx, `Deck ${match.foe.deck.length} • Hand ${match.foe.hand.length}`, 560, 90, 15, PALETTE.muted, 'left');
  // Foe hand, face down.
  const foeTotal = match.foe.hand.length * (FOE_CARD_W + 8) - 8;
  match.foe.hand.forEach((card, i) => {
    drawCardBack(ctx, (TABLE.width - foeTotal) / 2 + i * (FOE_CARD_W + 8), 116, FOE_CARD_W, FOE_CARD_H);
  });
  // Round + phase banner.
  const phaseText = match.phase === 'player' ? `ROUND ${match.turn} — YOUR TURN` : match.phase === 'foe' ? `ROUND ${match.turn} — CINDER IS PLAYING…` : '';
  text(ctx, phaseText, TABLE.width / 2, 240, 18, PALETTE.gold, 'center', 'bold');
  if (match.comboActive) {
    text(ctx, 'COMBO KINDLED +2', TABLE.width / 2, 268, 18, PALETTE.ember, 'center', 'bold');
  }
  // Last played card, compact, centre left — clear of the player panel below.
  if (match.lastPlay) {
    const card = match.lastPlay.card;
    const style = SUIT_STYLE[card.suit];
    const x = 240;
    const y = 282;
    const w = 120;
    const h = 168;
    text(ctx, match.lastPlay.byPlayer ? 'YOU PLAYED' : 'CINDER PLAYED', x + w / 2, y - 10, 14, PALETTE.muted, 'center', 'bold');
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = '#f7ecd4';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = style.colour;
    ctx.stroke();
    ctx.save();
    roundRect(ctx, x + 3, y + 3, w - 6, 28, 7);
    ctx.fillStyle = style.colour;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x + 19, y + 17, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#1d4e89';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#bfe3ff';
    ctx.stroke();
    text(ctx, String(card.cost), x + 19, y + 22, 15, '#ffffff', 'center', 'bold');
    drawSuitIcon(ctx, card.suit, x + w - 20, y + 17, 18, '#ffffff');
    text(ctx, card.name, x + w / 2, y + 54, 13, '#241a10', 'center', 'bold');
    const label = cardValueLabel(card);
    text(ctx, label, x + w / 2, y + 100, label.length <= 6 ? 22 : 18, style.dark, 'center', 'bold');
    drawSuitIcon(ctx, card.suit, x + w / 2, y + 124, 20, style.colour);
    ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
    const lines = wrapText(ctx, card.blurb, w - 14);
    lines.forEach((line, i) => text(ctx, line, x + w / 2, y + 146 + i * 12, 10, '#5c4a30', 'center'));
  }
  // Log, right of centre.
  text(ctx, 'DUEL LOG', 560, 300, 14, PALETTE.muted, 'left', 'bold');
  let logY = 324;
  for (const line of match.log) {
    ctx.font = '14px system-ui, -apple-system, "Segoe UI", sans-serif';
    const lines = wrapText(ctx, line, 420).slice(0, 2);
    for (const wrapped of lines) {
      text(ctx, wrapped, 560, logY, 14, PALETTE.text, 'left');
      logY += 17;
    }
    logY += 4;
  }
  // Player panel: life, shield, energy.
  text(ctx, PLAYER_NAME, 48, 452, 20, PALETTE.player, 'left', 'bold');
  drawHpBar(ctx, 48, 462, 420, '', match.player.hp, match.player.maxHp, match.player.shield);
  drawEnergyPips(ctx, 560, 462, match.player.energy, match.player.maxEnergy);
  text(ctx, `Deck ${match.player.deck.length} • Discard ${match.player.discard.length}`, 760, 478, 15, PALETTE.muted, 'left');
  // End Turn button.
  const button = endTurnRect();
  const enabled = match.phase === 'player';
  roundRect(ctx, button.x, button.y, button.w, button.h, 10);
  ctx.fillStyle = enabled ? PALETTE.button : '#4a3a26';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = enabled ? PALETTE.buttonEdge : '#6b5a40';
  ctx.stroke();
  text(ctx, 'END TURN  (E)', button.x + button.w / 2, button.y + 34, 18, enabled ? '#ffffff' : '#a08a68', 'center', 'bold');
  // Player hand.
  match.player.hand.forEach((card, i) => {
    const rect = playerCardRect(i, match.player.hand.length, ui.hoveredCard);
    const playable = match.phase === 'player' && card.cost <= match.player.energy;
    drawCardFace(ctx, card, rect.x, rect.y, rect.w, rect.h, playable, i === ui.hoveredCard);
  });
  // Hint when the player cannot afford anything.
  if (match.phase === 'player' && match.player.hand.every((card) => card.cost > match.player.energy)) {
    text(ctx, 'No card affordable — end your turn to draw and recharge.', TABLE.width / 2, 484, 15, PALETTE.muted, 'center');
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = TABLE.width;
  canvas.height = TABLE.height;

  function fitCanvas() {
    const scale = Math.min(window.innerWidth / TABLE.width, window.innerHeight / TABLE.height);
    canvas.style.width = `${Math.floor(TABLE.width * scale)}px`;
    canvas.style.height = `${Math.floor(TABLE.height * scale)}px`;
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  return {
    draw(match, screen, ui, best) {
      ctx.clearRect(0, 0, TABLE.width, TABLE.height);
      if (screen === SCREEN_TITLE) drawTitle(ctx, best);
      else if (screen === SCREEN_WIN) drawEndScreen(ctx, match, true);
      else if (screen === SCREEN_LOSS) drawEndScreen(ctx, match, false);
      else drawPlayTable(ctx, match, ui);
    },
    /** Where a click lands: a card index, the end-turn button, or nothing. */
    hitTest(match, screen, x, y) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) {
        const button = startButtonRect();
        if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
          return { type: 'start' };
        }
        return null;
      }
      const button = endTurnRect();
      if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
        return { type: 'endTurn' };
      }
      // Check the raised (hovered) card first, then the rest topmost last.
      for (let i = match.player.hand.length - 1; i >= 0; i -= 1) {
        const rect = playerCardRect(i, match.player.hand.length, -1);
        const raised = { ...rect, y: rect.y - 34, h: rect.h + 34 };
        if (x >= raised.x && x <= raised.x + raised.w && y >= raised.y && y <= raised.y + raised.h) {
          return { type: 'card', index: i };
        }
      }
      return null;
    },
    /** Which player card the pointer hovers, or -1. */
    hoveredCard(match, screen, x, y) {
      if (screen !== SCREEN_PLAY) return -1;
      for (let i = match.player.hand.length - 1; i >= 0; i -= 1) {
        const rect = playerCardRect(i, match.player.hand.length, -1);
        const raised = { ...rect, y: rect.y - 34, h: rect.h + 34 };
        if (x >= raised.x && x <= raised.x + raised.w && y >= raised.y && y <= raised.y + raised.h) return i;
      }
      return -1;
    },
  };
}
