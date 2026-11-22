// The deck: every card is a plain object built from CARD_DEFS, two copies of
// each line, shuffled once per match. Drawing reshuffles the discard pile
// into a fresh deck when the deck runs out.

import { CARD_DEFS, MAX_HAND } from './config.js';
import { shuffleDeck } from './random.js';

/** Build one fresh card object from a definition line. */
export function makeCard(def) {
  const [id, name, suit, kind, cost, value, blurb] = def;
  return { id, name, suit, kind, cost, value, blurb, uid: 0 };
}

let nextUid = 1;

/** A new shuffled deck: two copies of every card definition. */
export function buildDeck(rng) {
  const deck = [];
  for (const def of CARD_DEFS) {
    for (let copy = 0; copy < 2; copy += 1) {
      const card = makeCard(def);
      card.uid = nextUid;
      nextUid += 1;
      deck.push(card);
    }
  }
  return shuffleDeck(deck, rng);
}

/** Move up to `count` cards from a side's deck into its hand. */
export function drawCards(side, count, rng) {
  let drawn = 0;
  for (let i = 0; i < count; i += 1) {
    if (side.hand.length >= MAX_HAND) break;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffleDeck(side.discard.splice(0), rng);
    }
    side.hand.push(side.deck.pop());
    drawn += 1;
  }
  return drawn;
}

/** The small label a card shows for its main number: damage, heal or shield. */
export function cardValueLabel(card) {
  if (card.kind === 'mend') return `+${card.value} HP`;
  if (card.kind === 'guard') return `+${card.value} SHIELD`;
  if (card.kind === 'haul') return `DRAW ${card.value}`;
  return `${card.value} DMG`;
}
