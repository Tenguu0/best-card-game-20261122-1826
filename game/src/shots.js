// The screenshot scenes behind ?shot=start|play|win|loss. Each one is the
// real rules engine driven forward from a fresh match with the same seed, so
// the frame is what a short game really looks like and the same seed always
// gives the same frame. The win and loss scenes stage a finishing blow: the
// table is set through the rules, then one real card ends the duel.

import { CARD_DEFS } from './config.js';
import { scoreCard } from './ai.js';
import { makeCard } from './deck.js';
import { createRandom } from './random.js';
import {
  PHASE_OVER,
  beginFoeTurn,
  createMatch,
  endPlayerTurn,
  playCard,
  startNextRound,
} from './rules.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** The player's autopilot: the best-scoring affordable card, else none. */
function autopilotChoice(match) {
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < match.player.hand.length; i += 1) {
    const card = match.player.hand[i];
    if (card.cost > match.player.energy) continue;
    const fake = {
      foe: match.player,
      player: match.foe,
      lastSuit: match.lastSuit,
    };
    const score = scoreCard(fake, card, i);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Play one full player turn with the autopilot, then hand over to the foe. */
function playAutopilotTurn(match) {
  for (;;) {
    const index = autopilotChoice(match);
    if (index === -1) break;
    playCard(match, match.player, index);
    if (match.phase === PHASE_OVER) return;
  }
  endPlayerTurn(match);
}

/** Play one full foe turn with the AI plan, instantly (no animation). */
function playFoeTurnInstant(match, planFoeTurn) {
  beginFoeTurn(match);
  const plan = planFoeTurn(match);
  for (const uid of plan) {
    let index = -1;
    for (let i = 0; i < match.foe.hand.length; i += 1) {
      if (match.foe.hand[i].uid === uid) index = i;
    }
    if (index === -1) continue;
    playCard(match, match.foe, index);
    if (match.phase === PHASE_OVER) return;
  }
  startNextRound(match);
}

/** The mid-game table: `rounds` full rounds of autopilot against the AI. */
function stagePlay(match, planFoeTurn, rounds = 4) {
  for (let round = 0; round < rounds; round += 1) {
    playAutopilotTurn(match);
    if (match.phase === PHASE_OVER) break;
    playFoeTurnInstant(match, planFoeTurn);
    if (match.phase === PHASE_OVER) break;
  }
  return match.phase === PHASE_OVER
    ? { screen: match.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS }
    : { screen: SCREEN_PLAY };
}

/** Stage a win: two real rounds, then Cinder is left at 4 life and the
 *  player draws a real Wildfire from the deck list and plays it. */
function stageWin(match, planFoeTurn) {
  stagePlay(match, planFoeTurn, 2);
  if (match.phase === PHASE_OVER) return { screen: match.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS };
  match.foe.hp = 4;
  match.foe.shield = 0;
  match.player.energy = match.player.maxEnergy;
  const def = CARD_DEFS.find((line) => line[0] === 'wildfire');
  const finisher = makeCard(def);
  finisher.uid = 900001;
  match.player.hand.push(finisher);
  playCard(match, match.player, match.player.hand.length - 1);
  return { screen: SCREEN_WIN };
}

/** Stage a loss: two real rounds, then the player is left at 3 life and
 *  Cinder draws a real Ember Strike from the deck list and plays it. */
function stageLoss(match, planFoeTurn) {
  stagePlay(match, planFoeTurn, 2);
  if (match.phase === PHASE_OVER) return { screen: match.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS };
  match.player.hp = 3;
  match.player.shield = 0;
  const def = CARD_DEFS.find((line) => line[0] === 'ember-strike');
  const finisher = makeCard(def);
  finisher.uid = 900002;
  match.foe.hand.push(finisher);
  match.foe.energy = match.foe.maxEnergy;
  endPlayerTurn(match);
  playCard(match, match.foe, match.foe.hand.length - 1);
  return { screen: SCREEN_LOSS };
}

/**
 * Set `match` to the named scene (start, play, win or loss; any other name
 * is start) and return the screen to draw over it.
 */
export function stageShot(name, seed, planFoeTurn) {
  const rng = createRandom(seed);
  const match = createMatch(rng);
  if (name === 'play') return { match, ...stagePlay(match, planFoeTurn) };
  if (name === 'win') return { match, ...stageWin(match, planFoeTurn) };
  if (name === 'loss') return { match, ...stageLoss(match, planFoeTurn) };
  return { match, screen: SCREEN_TITLE };
}
