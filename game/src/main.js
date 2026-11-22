// Ember Duel boot and the one loop. The game moves between four screens:
// title, the duel table, victory and defeat. The player acts with mouse or
// keyboard; the foe's turn plays out one card at a time so its choices can
// be read. ?seed=N fixes the deal; ?shot=start|play|win|loss (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { createRandom } from './random.js';
import { findCardByUid, planFoeTurn } from './ai.js';
import {
  ACTION_CARD_BASE,
  ACTION_CONFIRM,
  ACTION_END_TURN,
  createInput,
} from './input.js';
import {
  PHASE_OVER,
  beginFoeTurn,
  createMatch,
  endPlayerTurn,
  playCard,
  startNextRound,
} from './rules.js';
import {
  SCREEN_LOSS,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';
import {
  drawSound,
  guardSound,
  healSound,
  loseSound,
  playCardSound,
  strikeSound,
  unlockAudio,
  winSound,
} from './audio.js';

const FOE_CARD_DELAY_MS = 750;
const BEST_KEY = 'ember-duel.best-rounds';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

/** The best result this browser remembers: fewest rounds to a win. */
function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

/** Play the right sound for the card that was just played. */
function soundForCard(card) {
  if (card.kind === 'mend' || card.kind === 'bloom') healSound();
  else if (card.kind === 'guard') guardSound();
  else if (card.kind === 'haul' || card.kind === 'kindle') drawSound();
  else strikeSound();
}

/** Stage one screenshot scene, paint it twice, then signal readiness. */
function runShot(name) {
  const staged = stageShot(name, seed, planFoeTurn);
  window.__ember = { screen: staged.screen, match: staged.match };
  let painted = 0;
  function paint() {
    renderer.draw(staged.match, staged.screen, { hoveredCard: -1 }, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let match = createMatch(createRandom(seed));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let hoveredCard = -1;
  // The foe's plan, played one card per FOE_CARD_DELAY_MS.
  let foePlan = [];
  let foeTimer = 0;
  let lastTick = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startDuel() {
    match = createMatch(createRandom(seed));
    foePlan = [];
    screen = SCREEN_PLAY;
    announce('The duel begins. Your move.');
  }

  function finishDuel() {
    const won = match.winner === 'player';
    screen = won ? SCREEN_WIN : SCREEN_LOSS;
    if (won) {
      winSound();
      if (best === 0 || match.turn < best) {
        best = match.turn;
        saveBest(best);
      }
      announce(`Victory in ${match.turn} rounds.`);
    } else {
      loseSound();
      announce('Defeat. Cinder wins the table.');
    }
  }

  function playPlayerCard(index) {
    if (match.phase !== 'player' || screen !== SCREEN_PLAY) return;
    const card = match.player.hand[index];
    if (!card || card.cost > match.player.energy) return;
    unlockAudio();
    playCardSound();
    playCard(match, match.player, index);
    soundForCard(card);
    if (match.phase === PHASE_OVER) finishDuel();
  }

  function endTurn() {
    if (match.phase !== 'player' || screen !== SCREEN_PLAY) return;
    unlockAudio();
    endPlayerTurn(match);
    beginFoeTurn(match);
    foePlan = planFoeTurn(match);
    foeTimer = 0;
    announce('Cinder is playing.');
  }

  /** Advance the foe's turn by `dt` milliseconds of wall time. */
  function stepFoeTurn(dt) {
    if (foePlan.length === 0) {
      // The foe is done: next round, your turn.
      startNextRound(match);
      announce(`Round ${match.turn}. Your move.`);
      return;
    }
    foeTimer += dt;
    if (foeTimer < FOE_CARD_DELAY_MS) return;
    foeTimer = 0;
    const uid = foePlan.shift();
    const index = findCardByUid(match, uid);
    if (index === -1) return;
    const card = match.foe.hand[index];
    playCardSound();
    playCard(match, match.foe, index);
    soundForCard(card);
    if (match.phase === PHASE_OVER) finishDuel();
  }

  function handleClicks() {
    for (const click of input.takeClicks()) {
      unlockAudio();
      const hit = renderer.hitTest(match, screen, click.x, click.y);
      if (!hit) continue;
      if (hit.type === 'start') startDuel();
      else if (hit.type === 'endTurn') endTurn();
      else if (hit.type === 'card') playPlayerCard(hit.index);
    }
  }

  function handleKeys() {
    const actions = input.takeActions();
    if (!actions) return;
    unlockAudio();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) startDuel();
      else if (screen === SCREEN_PLAY) endTurn();
    }
    if (actions & ACTION_END_TURN) endTurn();
    for (let i = 0; i < 7; i += 1) {
      if (actions & (ACTION_CARD_BASE << i)) playPlayerCard(i);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(now - lastTick, 250);
    lastTick = now;
    handleKeys();
    handleClicks();
    if (screen === SCREEN_PLAY) {
      const hover = input.hover();
      hoveredCard = renderer.hoveredCard(match, screen, hover.x, hover.y);
      if (match.phase === 'foe') stepFoeTurn(dt);
    } else {
      hoveredCard = -1;
    }
    if (match.lastPlay) match.lastPlay.age += dt;
    renderer.draw(match, screen, { hoveredCard }, best);
  }

  announce('Ember Duel. Press Enter or click to begin.');
  window.__ember = {
    screen: () => screen,
    match: () => match,
  };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
