// A small seeded random source (mulberry32) so a seed always deals the same
// hands and the same screenshots. The game never calls Math.random for rules.

export function createRandom(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    /** An integer from 0 to n - 1. */
    int(n) {
      return Math.floor(this.next() * n);
    },
  };
}

/** Fisher-Yates shuffle, in place, driven by the seeded source. */
export function shuffleDeck(deck, rng) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    const held = deck[i];
    deck[i] = deck[j];
    deck[j] = held;
  }
  return deck;
}
