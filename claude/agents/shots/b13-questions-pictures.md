# Batch 13: pictures for the four open Decision Desk questions

Kunal, 20 Nov 2026: "Anything you put on the decision desk should really have mock-ups and highlights so I can follow along."
Every picture is a real render at deviceScaleFactor 2 (375x761 with insets 51/31 = his phone; 320x568 = the small phone), with a
3px red box (#ff2a2a) round the thing the call is about. Names: `b13-q<NN>-c<call>-<today|built|opt-<short>>-<W>x<H>.png`.

- **today** = main (`c58695d5`) built as a trial (bundle md5 `c0177ee4fcde`).
- **built** = the tree `7f7fdf73` built as a trial (bundle md5 `8b47b239eb90`).
- **opt-** = a MOCK-UP made on the built bundle by editing the DOM in the page; each carries a yellow caption bar burned into the image,
  "MOCK-UP - option (N): ...", so it cannot be taken for the app. A mock-up is a sketch of the look, not a finished layout.
- Made by `gates/audit/question-shots.js` (reusable: `CT_TODAY=<trial bundle> CT_BUILT=<trial bundle> node gates/audit/question-shots.js`).

All paths below are in `claude/agents/shots/`.

## q27 - the Brilliant tile (job brilliancy-library-and-motif-coverage)

**Call 1: who sees "Your brilliant moves"** (any card in his store, a missed Brilliant included, or "Famous" until he has played one himself)
- Today (a new player has no tile at all; box = where it would be): `b13-q27-c1-today-375x761.png`
- Built, a new player: tile reads "Famous brilliant moves": `b13-q27-c1-built-new-player-375x761.png` (box: the tile)
- Built, only a missed Brilliant in his store: reads "Your brilliant moves": `b13-q27-c1-built-375x761.png` (box: the tile)
- Option (1) "Famous until he has played a Brilliant himself": `b13-q27-c1-opt-famous-375x761.png` (mock-up; box: the tile, reworded)
- Behaviour: the choice itself is which cards count; the pictures show only the one word that changes.

**Call 2: the Famous tile with his games listed** (practice card above the games box; the usual place; hidden under 700 tall)
- Today (tile as the games box's first row, shown with one card of his own): `b13-q27-c2-today-375x761.png`, `b13-q27-c2-today-320x568.png` (box: the tile)
- Built (a practice card beside "Practice your mistakes"): `b13-q27-c2-built-375x761.png`, `b13-q27-c2-built-320x568.png` (box: the tile)
- Option "the usual place, page scrolls": `b13-q27-c2-opt-usual-place-375x761.png`, `b13-q27-c2-opt-usual-place-320x568.png` (mock-up: the tile moved into the games box as its first row, two lines; box: the tile)
- Option "hidden on phones under 700 tall": `b13-q27-c2-opt-hidden-320x568.png` (mock-up; box: the gap where the tile was)

**Call 3: the followed player's shelf** (fills from games you open, or reviewed in the background)
- Today (the library has no followed shelf; box: the only shelf, "You played them"): `b13-q27-c3-today-375x761.png`
- Built (the "From peterpatzer · 2" shelf; box: its heading): `b13-q27-c3-built-375x761.png`
- Option (3) "review followed players' new games in the background": behaviour, no picture (the shelf looks the same; only when it fills changes).

## q28 - Coach mode (job coach-mode-...)

**Call 1: where the engine card sits**
- Today: main has no Coach mode at all, so there is no card. A game against the computer, box = the top two ranks where the built card sits: `b13-q28-c1-today-375x761.png`, `b13-q28-c1-today-320x568.png`
- Built (the card over the top of the board; box: the card): `b13-q28-c1-built-375x761.png`, `b13-q28-c1-built-320x568.png`
- Option "at the bottom of the board": `b13-q28-c1-opt-bottom-375x761.png`, `b13-q28-c1-opt-bottom-320x568.png` (mock-up: the same card moved to the board's bottom edge; box: the card)

**Call 2: 30 saved coach games or only 10**: behaviour, no picture.

## q32 - the Review list's final layout (Q25 B)

**Call 1: the back icon**
- Today (a words pill "Back to your analysis" under the top row, shown after a review; box: the pill): `b13-q32-c1-today-375x761.png`
- Built with an analysis to go back to (icon at the top left; box: the icon): `b13-q32-c1-built-375x761.png`
- Built with no analysis yet (no icon; box: the empty corner where it would be): `b13-q32-c1-built-no-analysis-375x761.png`
- Option "always": `b13-q32-c1-opt-always-375x761.png` (mock-up on the no-analysis list: an icon in the corner; box: the icon)
- Option "never": `b13-q32-c1-opt-never-375x761.png` (mock-up on the with-analysis list: the icon hidden; box: where it was)

**Call 2: the two practice cards under 360 wide**
- Today (the cards stacked, each with its sentence; box: both cards): `b13-q32-c2-today-320x568.png`
- Built (side by side, icon squares dropped, names on two lines; box: both): `b13-q32-c2-built-320x568.png`
- Option "shorter names": `b13-q32-c2-opt-shorter-names-320x568.png` (mock-up: icon squares kept, "Mistakes" / "Brilliants"; box: the row)
- Option "stacked on small phones": `b13-q32-c2-opt-stacked-320x568.png` (mock-up; box: both cards)

**Call 3: Fetch**
- Today ("Fetch" in words, "Analyze game" with words; box: both): `b13-q32-c3-today-375x761.png`
- Built (download arrow; box: the button): `b13-q32-c3-built-375x761.png`
- Option "the inbox emoji": `b13-q32-c3-opt-inbox-375x761.png` (mock-up; box: the button)

**Call 4: the Filter chips on the small phone**
- Today (chips open inside the games box; box: the chips): `b13-q32-c4-today-320x568.png`
- Built (chips inside the games box under the search line; box: the chips): `b13-q32-c4-built-320x568.png`
- Option "above the line, page scrolls": `b13-q32-c4-opt-above-320x568.png` (mock-up: the chips moved above the search line; the games are pushed down off the screen; box: the chips)

**Call 5: the search placeholder**
- Today (at 320 the name box is behind the Filter button; at 375 it reads "Filter by player name"): `b13-q32-c5-today-320x568.png` (box: the Filter button), `b13-q32-c5-today-375x761.png` (box: the box)
- Built "Player name": `b13-q32-c5-built-320x568.png`, `b13-q32-c5-built-375x761.png` (box: the box)
- Option "Search players": `b13-q32-c5-opt-search-players-320x568.png`, `b13-q32-c5-opt-search-players-375x761.png` (mock-up; box: the box)

## q33 - Play against the computer on a short phone

**Call 1: the move list on 320x568**
- Today (the move list in the column under the board, bar beside the board; box: the list): `b13-q33-c1-today-320x568.png`
- Built (list closed; box: the Moves button): `b13-q33-c1-built-320x568.png`; his phone unchanged: `b13-q33-c1-built-375x761.png` (box: the list, in the column)
- Option (2) "open by default": `b13-q33-c1-opt-open-320x568.png` (the built app with Moves tapped, captioned as a mock-up; box: the sheet over the foot of the board)

**Call 2: the label "Eval bar: above on tall screens"**
- The label is in the review screen's three-dots sheet. In every state reachable here (small phone, 375x667, his phone) the built sheet already reads "Eval bar: above the board" (a Review streamlined view puts the bar above), so the old wording never appears in my renders; "keep" is therefore a mock-up too.
- Today's sheet row: `b13-q33-c2-today-375x761.png`; built's: `b13-q33-c2-built-375x761.png` (box: the row; both read "above the board" in this state)
- Option "keep the label": `b13-q33-c2-opt-keep-375x761.png` (mock-up: the old wording; box: the row)
- Option "reword to 'Eval bar: above the board'": `b13-q33-c2-opt-reword-375x761.png` (mock-up; box: the row)
- Where the bar's setting is worded in Play: the menu's "Eval bar  Above / Left / Off" row, today `b13-q33-c2-menu-today-320x568.png`, built `b13-q33-c2-menu-built-320x568.png` (box: the row)

## q34 - the game card's unknown move count

One call. A game whose best and great counts are not known paints those two boxes with a dash. Red boxes mark the two unknown counts.
- Today: the en dash. Main (`c58695d5`) has an older card layout with no such boxes, so this is the batch head just before the change (`1bb794b9`, the parent of `4994fd67`), which is where the en dash was: `b13-q34-c1-today-375x761.png`
- Built (`bd8758c1`, a plain hyphen): `b13-q34-c1-built-375x761.png`
- Option "?": `b13-q34-c1-opt-question-mark-375x761.png` (mock-up on the built bundle)
- Option "blank": `b13-q34-c1-opt-blank-375x761.png` (mock-up: the dash removed, the box left empty)
