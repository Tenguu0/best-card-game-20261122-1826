// Ember Duel — every tuning number, colour and card definition in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const TABLE = { width: 1280, height: 720 };

export const START_HP = 30;
export const START_HAND = 5;
export const MAX_HAND = 7;
export const START_ENERGY = 3;
export const MAX_ENERGY = 6;
/** Energy grows by one each round until it reaches MAX_ENERGY. */
export const ENERGY_GROWTH_TURN = 3;
/** Same-suit bonus when two cards of one suit are played on the same turn. */
export const COMBO_BONUS = 2;

// The four suits. Each has a colour and a drawn shape, so a card is readable
// by colour and by shape, never by its text alone.
export const SUIT = {
  FLAME: 'flame',
  TIDE: 'tide',
  LEAF: 'leaf',
  STONE: 'stone',
};

export const SUIT_STYLE = {
  [SUIT.FLAME]: { label: 'Flame', colour: '#ff6b4a', dark: '#a8321f', glow: '#ffb199' },
  [SUIT.TIDE]: { label: 'Tide', colour: '#4aa8ff', dark: '#1d5fa8', glow: '#a8d4ff' },
  [SUIT.LEAF]: { label: 'Leaf', colour: '#58c96b', dark: '#237a33', glow: '#a9e8b4' },
  [SUIT.STONE]: { label: 'Stone', colour: '#e8b13c', dark: '#96690f', glow: '#f7dd9a' },
};

// What a card does. damage / heal / shield take the card's value; draw and
// energy take the card's value too. A card may do more than one thing.
export const CARD_KINDS = {
  STRIKE: 'strike',
  KINDLE: 'kindle',
  MEND: 'mend',
  GUARD: 'guard',
  BLOOM: 'bloom',
  HAUL: 'haul',
};

// The deck list: [id, name, suit, kind, cost, value, blurb]. Two copies of
// each line go into a 26-card deck.
export const CARD_DEFS = [
  ['ember-strike', 'Ember Strike', SUIT.FLAME, CARD_KINDS.STRIKE, 1, 3, 'Deal 3 damage.'],
  ['wildfire', 'Wildfire', SUIT.FLAME, CARD_KINDS.STRIKE, 2, 5, 'Deal 5 damage.'],
  ['inferno', 'Inferno', SUIT.FLAME, CARD_KINDS.STRIKE, 3, 8, 'Deal 8 damage.'],
  ['kindling', 'Kindling', SUIT.FLAME, CARD_KINDS.KINDLE, 1, 2, 'Deal 2 damage. Draw 1 card.'],
  ['spring-water', 'Spring Water', SUIT.TIDE, CARD_KINDS.MEND, 1, 4, 'Restore 4 life.'],
  ['deep-well', 'Deep Well', SUIT.TIDE, CARD_KINDS.MEND, 2, 7, 'Restore 7 life.'],
  ['frost-guard', 'Frost Guard', SUIT.TIDE, CARD_KINDS.GUARD, 2, 6, 'Gain a 6 shield.'],
  ['bramble-wall', 'Bramble Wall', SUIT.LEAF, CARD_KINDS.GUARD, 1, 4, 'Gain a 4 shield.'],
  ['thornbark', 'Thornbark', SUIT.LEAF, CARD_KINDS.GUARD, 2, 7, 'Gain a 7 shield.'],
  ['grove-bloom', 'Grove Bloom', SUIT.LEAF, CARD_KINDS.BLOOM, 2, 5, 'Restore 5 life. Gain a 3 shield.'],
  ['pebble-toss', 'Pebble Toss', SUIT.STONE, CARD_KINDS.KINDLE, 1, 2, 'Deal 2 damage. Gain 1 energy.'],
  ['quarry-haul', 'Quarry Haul', SUIT.STONE, CARD_KINDS.HAUL, 2, 2, 'Draw 2 cards.'],
  ['lodestone', 'Lodestone', SUIT.STONE, CARD_KINDS.KINDLE, 3, 4, 'Deal 4 damage. Draw 1. Gain 1 energy.'],
];

export const PALETTE = {
  backdrop: '#171009',
  table: '#2b1d12',
  tableEdge: '#4a3420',
  felt: '#3d2b18',
  panel: '#241a10',
  panelEdge: '#6b4d2a',
  text: '#f5ead6',
  muted: '#c9b08a',
  gold: '#f2c14e',
  ember: '#ff6b4a',
  player: '#f2c14e',
  foe: '#b06be8',
  hpGood: '#58c96b',
  hpLow: '#e5534b',
  shield: '#4aa8ff',
  energy: '#7fe3ff',
  button: '#8a5a1d',
  buttonEdge: '#f2c14e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const FOE_NAME = 'Cinder, the Ash Warden';
export const PLAYER_NAME = 'You';
