// Ember Duel rules: two sides, one deck each, energy that grows each round,
// and a same-suit combo. A card is played by spending its cost; damage first
// eats the target's shield, then its life. The match ends the moment a side
// reaches 0 life.

import {
  CARD_KINDS,
  COMBO_BONUS,
  ENERGY_GROWTH_TURN,
  MAX_ENERGY,
  MAX_HAND,
  START_ENERGY,
  START_HAND,
  START_HP,
} from './config.js';
import { buildDeck, drawCards } from './deck.js';

export const PHASE_PLAYER = 'player';
export const PHASE_FOE = 'foe';
export const PHASE_OVER = 'over';

/** One side of the duel: life, shield, energy, deck, hand and discard. */
export function createSide(rng) {
  return {
    hp: START_HP,
    maxHp: START_HP,
    shield: 0,
    energy: START_ENERGY,
    maxEnergy: START_ENERGY,
    deck: buildDeck(rng),
    hand: [],
    discard: [],
  };
}

/** A fresh match. The player draws first and takes the first turn. */
export function createMatch(rng) {
  const match = {
    rng,
    player: createSide(rng),
    foe: createSide(rng),
    turn: 1,
    phase: PHASE_PLAYER,
    winner: null,
    lastSuit: null,
    comboActive: false,
    log: [],
    stats: { cardsPlayed: 0, damageDealt: 0, turnsTaken: 0 },
    lastPlay: null,
  };
  drawCards(match.player, START_HAND, rng);
  drawCards(match.foe, START_HAND, rng);
  pushLog(match, 'The duel begins. Your move — play a card or end your turn.');
  return match;
}

function pushLog(match, text) {
  match.log.push(text);
  if (match.log.length > 4) match.log.shift();
}

/** The energy cap for a given round: it grows until MAX_ENERGY. */
export function energyCapForTurn(turn) {
  return Math.min(MAX_ENERGY, START_ENERGY + Math.floor((turn - 1) / ENERGY_GROWTH_TURN));
}

/** Start a side's turn: refill energy to the round's cap and draw one card. */
export function beginTurn(match, side) {
  side.maxEnergy = energyCapForTurn(match.turn);
  side.energy = side.maxEnergy;
  drawCards(side, 1, match.rng);
}

/** Deal damage to a side: the shield absorbs first, the rest hits life. */
export function dealDamage(match, target, amount, sourceName) {
  let remaining = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }
  target.hp = Math.max(0, target.hp - remaining);
  if (target === match.foe) match.stats.damageDealt += amount;
  if (target.hp <= 0) {
    match.phase = PHASE_OVER;
    match.winner = target === match.foe ? 'player' : 'foe';
  }
  return remaining;
}

/** Apply one card's effects. Returns a short line for the log. */
export function resolveCard(match, actor, target, card, bonus) {
  const value = card.value + bonus;
  const parts = [];
  if (card.kind === CARD_KINDS.STRIKE || card.kind === CARD_KINDS.KINDLE) {
    dealDamage(match, target, value, card.name);
    parts.push(`hits for ${value}`);
  }
  if (card.kind === CARD_KINDS.MEND || card.kind === CARD_KINDS.BLOOM) {
    const healed = Math.min(actor.maxHp - actor.hp, value);
    actor.hp += healed;
    parts.push(`restores ${healed} life`);
  }
  if (card.kind === CARD_KINDS.GUARD || card.kind === CARD_KINDS.BLOOM) {
    const shield = card.kind === CARD_KINDS.BLOOM ? 3 + bonus : value;
    actor.shield += shield;
    parts.push(`gains a ${shield} shield`);
  }
  if (card.kind === CARD_KINDS.KINDLE) {
    if (card.id === 'kindling' || card.id === 'lodestone') {
      const drew = drawCards(actor, 1, match.rng);
      if (drew > 0) parts.push('draws a card');
    }
    if (card.id === 'pebble-toss' || card.id === 'lodestone') {
      actor.energy = Math.min(actor.maxEnergy, actor.energy + 1);
      parts.push('gains 1 energy');
    }
  }
  if (card.kind === CARD_KINDS.HAUL) {
    const drew = drawCards(actor, card.value, match.rng);
    parts.push(`draws ${drew} card${drew === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

/**
 * Play the card at `handIndex` for `side` against the other side.
 * Returns null when the card cannot be played, else the log line.
 */
export function playCard(match, side, handIndex) {
  if (match.phase === PHASE_OVER) return null;
  const card = side.hand[handIndex];
  if (!card || card.cost > side.energy) return null;
  const target = side === match.player ? match.foe : match.player;
  const combo = match.lastSuit === card.suit;
  const bonus = combo ? COMBO_BONUS : 0;
  side.energy -= card.cost;
  side.hand.splice(handIndex, 1);
  side.discard.push(card);
  match.lastSuit = card.suit;
  match.comboActive = combo;
  match.stats.cardsPlayed += 1;
  const line = resolveCard(match, side, target, card, bonus);
  const who = side === match.player ? 'You play' : 'Cinder plays';
  const full = `${who} ${card.name}${combo ? ' — COMBO +2!' : ''} (${line}).`;
  pushLog(match, full);
  match.lastPlay = {
    card,
    byPlayer: side === match.player,
    combo,
    text: full,
    age: 0,
  };
  return full;
}

/** End the player's turn and hand the table to the foe. */
export function endPlayerTurn(match) {
  if (match.phase !== PHASE_PLAYER) return false;
  match.stats.turnsTaken += 1;
  match.phase = PHASE_FOE;
  match.lastSuit = null;
  pushLog(match, 'You end your turn. Cinder is thinking…');
  return true;
}

/** After the foe finishes, start the next player turn. */
export function startNextRound(match) {
  match.turn += 1;
  match.phase = PHASE_PLAYER;
  match.lastSuit = null;
  beginTurn(match, match.player);
  pushLog(match, `Round ${match.turn} — ${match.player.maxEnergy} energy, draw a card.`);
}

/** Begin the foe's turn: refill energy and draw, ready for the AI. */
export function beginFoeTurn(match) {
  beginTurn(match, match.foe);
}

/** Whether the match is over, and who won. */
export function matchResult(match) {
  if (match.phase !== PHASE_OVER) return null;
  return match.winner;
}

export { MAX_HAND };
