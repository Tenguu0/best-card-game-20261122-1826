// Cinder, the AI opponent. It scores every card in its hand against the
// table as it stands, plays the best affordable card, then scores again,
// until nothing good is left or the energy runs out. Its thinking is
// readable: it strikes when you are open, guards when you are loaded, and
// mends when it is hurt.

import { CARD_KINDS, COMBO_BONUS } from './config.js';

/** How much one card is worth to the foe right now. Higher is better. */
export function scoreCard(match, card, handIndex) {
  const foe = match.foe;
  const player = match.player;
  const combo = match.lastSuit === card.suit;
  const bonus = combo ? COMBO_BONUS : 0;
  const value = card.value + bonus;
  let score = 0;

  if (card.kind === CARD_KINDS.STRIKE || card.kind === CARD_KINDS.KINDLE) {
    // Damage is worth more when it can finish you; chewing through a shield
    // still counts, since the next strike then lands clean.
    const throughShield = Math.max(0, value - player.shield);
    const shieldDamage = Math.min(value, player.shield);
    score += throughShield * 3 + shieldDamage * 1;
    if (player.hp - throughShield <= 0) score += 100;
    if (player.hp <= 8) score += 6;
    if (card.kind === CARD_KINDS.KINDLE) score += 2;
  }
  if (card.kind === CARD_KINDS.MEND || card.kind === CARD_KINDS.BLOOM) {
    const missing = foe.maxHp - foe.hp;
    if (missing <= 0) score -= 20;
    else score += Math.min(value, missing) * 2.4;
    if (foe.hp <= 10) score += 8;
  }
  if (card.kind === CARD_KINDS.GUARD || card.kind === CARD_KINDS.BLOOM) {
    // A shield is worth more when you hold a big hand or a lot of energy,
    // but a wall already built is worth little: stacking shields forever
    // loses duels, so a shield past 6 counts against the card.
    const threat = player.hand.length + player.energy;
    score += value * (0.6 + threat * 0.12);
    if (foe.shield > 6) score -= 8;
  }
  if (card.kind === CARD_KINDS.HAUL) {
    score += foe.hand.length <= 3 ? 7 : 2;
    if (foe.energy >= 4) score += 2;
  }
  if (combo) score += 3;
  // Cheap cards first when the scores tie: keep the energy flowing.
  score -= card.cost * 0.5;
  return score;
}

/**
 * Plan the foe's whole turn up front: a list of hand indices to play, in
 * order, chosen greedily from the current table. Indices are re-scored after
 * each imagined play, so a plan never names a card twice.
 */
export function planFoeTurn(match) {
  const plan = [];
  // Simulate on a light copy of the numbers that matter, so planning never
  // touches the real match.
  const sim = {
    foeHp: match.foe.hp,
    foeShield: match.foe.shield,
    foeEnergy: match.foe.energy,
    foeHand: match.foe.hand.map((card) => card),
    playerHp: match.player.hp,
    playerShield: match.player.shield,
    lastSuit: match.lastSuit,
  };
  for (;;) {
    let bestIndex = -1;
    let bestScore = 1;
    for (let i = 0; i < sim.foeHand.length; i += 1) {
      const card = sim.foeHand[i];
      if (card.cost > sim.foeEnergy) continue;
      const fake = { foe: { hp: sim.foeHp, maxHp: match.foe.maxHp, shield: sim.foeShield, hand: sim.foeHand, energy: sim.foeEnergy }, player: { hp: sim.playerHp, shield: sim.playerShield, hand: match.player.hand, energy: match.player.energy }, lastSuit: sim.lastSuit };
      const score = scoreCard(fake, card, i);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) break;
    const card = sim.foeHand[bestIndex];
    plan.push(card.uid);
    sim.foeEnergy -= card.cost;
    sim.foeHand.splice(bestIndex, 1);
    const bonus = sim.lastSuit === card.suit ? COMBO_BONUS : 0;
    sim.lastSuit = card.suit;
    if (card.kind === CARD_KINDS.STRIKE || card.kind === CARD_KINDS.KINDLE) {
      const absorbed = Math.min(sim.playerShield, card.value + bonus);
      sim.playerShield -= absorbed;
      sim.playerHp = Math.max(0, sim.playerHp - (card.value + bonus - absorbed));
    }
    if (card.kind === CARD_KINDS.MEND || card.kind === CARD_KINDS.BLOOM) {
      sim.foeHp = Math.min(match.foe.maxHp, sim.foeHp + card.value + bonus);
    }
    if (card.kind === CARD_KINDS.GUARD || card.kind === CARD_KINDS.BLOOM) {
      sim.foeShield += card.kind === CARD_KINDS.BLOOM ? 3 + bonus : card.value + bonus;
    }
    if (sim.playerHp <= 0) break;
  }
  return plan;
}

/** The index of a card uid in the foe's current hand, or -1 when it is gone. */
export function findCardByUid(match, uid) {
  for (let i = 0; i < match.foe.hand.length; i += 1) {
    if (match.foe.hand[i].uid === uid) return i;
  }
  return -1;
}
