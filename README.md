# Ember Duel

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Tenguu0/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Tenguu0/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An original card duel for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826).
You sit across the table from Cinder, the Ash Warden, and trade ember cards
until one of you runs out of life.

## How it plays

- **Life totals:** you and Cinder both start at 30 life. First to 0 loses.
- **Energy:** you start each round with 3 energy, growing to 6 as the duel
  goes on. Every card costs energy, and it refills each round.
- **Hands:** five cards to start, one drawn each round, from a 26-card deck
  of thirteen original cards in four suits — Flame, Tide, Leaf and Stone.
- **Cards:** strikes deal damage, mends restore life, guards raise a shield
  that absorbs damage, and hauls draw more cards. Some cards do two things
  at once.
- **Combos:** play two cards of the same suit in one turn and the second
  kindles a **COMBO +2** to its effect. Reading Cinder's hand and your own
  suit balance is the whole game.
- **The opponent:** Cinder scores every card in its hand against the table —
  it strikes when you are open, guards when your hand is loaded, and mends
  when it is hurt — and plays one card at a time so you can read its plan.

## Controls

- **Mouse:** click a card to play it, click **END TURN** to pass.
- **Keyboard:** keys `1`–`7` play a card, `E` or `Space` ends your turn,
  `Enter` starts a new duel or plays again after a win or loss.
- **Sound:** short synthesised effects, made with WebAudio at run time.
  No audio files, no network.

## Run it

The game is plain static files under `game/` — no build step, no network
request. Serve the folder with any static server and open `index.html`:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in a desktop browser.

## Screenshots

The four screenshots in `screenshots/` are real renders of this game in a
browser, taken with `?shot=start|play|win|loss&seed=1`:

| file | scene |
| --- | --- |
| `1-start.jpg` | title screen |
| `2-play.jpg` | the duel table, mid-game |
| `3-win.jpg` | victory screen |
| `4-loss.jpg` | defeat screen |

## Hand in

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `game/index.html` — the page; the canvas and the module entry point.
- `game/src/config.js` — tuning, colours, suits and the card list.
- `game/src/random.js` — seeded random source for fair, repeatable deals.
- `game/src/deck.js` — deck building, drawing and reshuffling.
- `game/src/rules.js` — the duel itself: turns, energy, damage, shields,
  combos and the win/loss check.
- `game/src/ai.js` — Cinder's decisions: how it scores and plans a turn.
- `game/src/render.js` — the canvas table, cards, life bars and screens.
- `game/src/input.js` — mouse and keyboard, read into a per-frame queue.
- `game/src/audio.js` — synthesised WebAudio sound effects.
- `game/src/shots.js` — the deterministic `?shot=` scenes.
- `game/src/main.js` — boot, the frame loop and the foe's timed turns.
- `main.ts` — the hand-in program.
- `vendor/makefun-game.ts` — the kit's library, unchanged.

## License

MIT. See [LICENSE](LICENSE).
