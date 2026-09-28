# Chess Trainer user stories

> **Ids here are the REPO suite.** `TC-Rnn` and `US-Rnn` in this file mean the gate-executed Review
> suite and nothing else. A different 30-story / 31-case suite in the claude.ai project uses the same prefix for
> different cases, so a bare "TC-R05" is ambiguous outside this file. See `claude/stories/README.md`, the id-space
> register, before quoting an id anywhere else.

Kunal's testing charter (2026-09-12 19:39 ET): spec and test the whole app screen by screen, in the order
Review, Play, Lesson, Puzzles, Home/Discover, Menu, then the never-tested areas. Nothing is written here that
is not executed in the same pass: every story names the test cases that check it (claude/stories/TEST-CASES.md)
and every test case names the gate that runs it (gates/regress/*.js, run by gates/gates.sh on every build).
A screen counts toward the charter's coverage number only when its stories are all written AND all executed.

Story ids are permanent. A story is never deleted; when the product changes, the story is amended with a
dated note. Acceptance criteria are things a harness can measure or a recording can show.

Status line per screen: `specced <date> · executed <build> · coverage counted: yes/no`.

---

## Review (game review) - specced 2026-09-12 · executed #373 (see TEST-CASES.md for the run) · coverage counted: see the #373 close-out

The Review screen is three screens in a row: the **list** (import a game, or pick one already imported), the
**summary** (accuracy, verdict counts, Skills), and the **move screen** (one ply at a time, with the reason
and the engine's answer). On a phone the move screen is the one-screen layout (#337 default): no app header,
a back arrow and ⋯ in the top player bar, the eval bar beside the board (left, his choice, #361), the move
line, the reason, one row of controls, the move strip.

### US-R01 Import a game by pasting a PGN
As a player who just finished a game on chess.com, I paste its PGN and get a review without an account.
- Given the Review list, when I paste a PGN into the box and tap "⚡ Analyze Game", the app analyses every
  position and lands on the summary. (TC-R01)
- The analysis of a 33-ply game finishes in under 90 s on the test machine with the 3-worker pool, and a
  second analysis of the same PGN comes from the cache in under 8 s (#341, #343 cache key). (TC-R01, TC-R02)
- Zero application console errors during import and analysis. (TC-R01)

### US-R02 Games fetched from an account are kept, per account, across reloads
As a player with several chess.com or Lichess accounts (or friends' accounts), every account I have fetched
stays listed with its games until I remove it, and fetching a friend never replaces mine (#353).
- Given two stored accounts in `ct_accts` / `ct_acctgames`, the list shows a chip per account with its game
  count and one row per game; a reload keeps both. (TC-R03)
- Each row names both players and the result from the game's own account, not from whatever is typed in the
  username box (#353 gameInfo). (TC-R03)
- The network fetch itself is not testable here (api.chess.com is blocked); it is Kunal's y13 check.

### US-R03 The summary tells me how each side played, in one card
As a player, I see one card with the categories down the side and one value column per player.
- The summary shows an accuracy figure per side and the verdict counts (Brilliant, Great, Best, Good,
  Inaccuracy, Mistake, Miss, Blunder; Excellent is folded into Best and Book moves are a Skills row) for White
  and Black in two columns. (TC-R04)
- The Skills panel (data-ct rev-skills, #368) is present under the accuracy table with its nine counted rows,
  and a number with moves behind it is a button that jumps into the review at that ply. (TC-R05)
- The footer (Back to games, Start review; data-ct rev-summary-foot, #334) is pinned inside the viewport at
  both phone geometries and the body scrolls under it. (TC-R04)

### US-R04 The move screen fits the phone and the board never moves
As a player stepping through a review on my phone, the board is as large as the screen allows and it stays
put from the first ply to the last.
- At 375x679 with insets 51/31 (Kunal's phone) the review board is 349 wide with the eval bar on its left
  (22 + padding, chosen in round 2 "evw"); at 390x844 it is the width minus the bar. (TC-R06)
- Across ply 0, a middle ply, a Brilliant ply (three-line reason) and the last ply, the board has ONE top and
  ONE width (a row that can appear must reserve its space, #346). (TC-R06)
- Nothing scrolls: the bottom-most laid-out element is inside the viewport at every ply. (TC-R06)
- The verdict badge on a rank-8 or a-file square is entirely inside the board (open item A-09). (TC-R07)

### US-R05 Every move gets a verdict, a reason and the better move
As a player, each ply shows what the move was (the verdict word and its symbol), why (a sentence about the
board, #350), and what the engine preferred (the best-move chip) when the played move was not best.
- The move line (data-ct rev-move-line) shows the move, the verdict, and the best chip (rev-best) on
  non-best moves; the reason (rev-why) is one to three lines that lead with what happened on the board.
  (TC-R08)
- The move strip (strip-row) colours every verdict on the whole scale, not only the negative half (#345).
  (TC-R08)
- A checkmate is written 1-0 / 0-1 in the eval label, never M0 (#371), and still when the engine line is switched
  on from the ⋯ sheet (audit N-review-2: it read +99.0 on #372; fixed #373). (TC-R09)

### US-R06 A brilliancy explains what the sacrifice buys, and can be played out
As a player who played (or suffered) a brilliancy, I read what was given up and the forcing line that makes it
work, and I can watch that line on the board.
- On 10.Nxb5!! in the Opera Game the reason names the sacrifice and the forcing continuation ("If cxb5,
  Bxb5+ ...") and the next-best comparison (#357, #365). (TC-R10)
- The "why" / play-out button (rev-playout) exists on Brilliant, Great, Best and Excellent moves and animates
  the line on the board without a console error (#354, #356). (TC-R10)

### US-R07 I can analyse any position myself
As a player, from any ply I open an analysis board where both colours are movable, with Undo and Exit.
- The round Analyze button (rev-fab, 42px, #366) sits on the board's bottom-right corner, translucent, and
  steps to the bottom-left when the last move landed on g1/h1/g2/h2 (#371). (TC-R11)
- Tapping it opens the analysis board at the current ply; two moves can be played; Undo takes one back;
  Exit returns to the same ply with the board unchanged in size. (TC-R11)

### US-R08 The eval is visible while stepping, and optionally as a graph
As a player, I always see the evaluation for the current position; the graph in the player bar is a switch.
- The eval bar (eval-bar-v) and its number (eval-bar-num) update on every ply. (TC-R09)
- With `ct_evalgraph` on, the graph (eval-graph) renders in the bottom player bar without changing the bar's
  height or the board's width (#369); a tap on it jumps to that ply. (TC-R12)

### US-R09 I get out the way I came in
As a player, the back arrow in the top bar returns to the summary, and from the summary Back to games returns
to the list; the ⋯ sheet holds the rarely used controls.
- rev-back from the move screen shows the summary; Back to games shows the list; no console errors. (TC-R13)
- rev-more opens the sheet (rev-sheet) with Flip and the layout switches; closing it changes nothing on the
  board. (TC-R13)

### US-R10 The players are named, rated and flagged where the data exists
As a player, each bar shows the name, the rating from the PGN headers (#348) and a flag when the site knows
the country; my own photo when the game is mine and I am signed in (#370).
- With WhiteElo/BlackElo headers the rating pills render; without them no pill is invented (#348). (TC-R14)
- Long names ellipsize inside one line and the bars never change height (open item A-15 asks whether the
  truncation is acceptable; the rule under test is that nothing overflows). (TC-R14)
- Flags and the own photo need a real device (y13, n9) and are listed as not executed.

### US-R11 A cached review is instant and correct
As a player re-opening a game I reviewed yesterday, the review opens in seconds and shows the same verdicts.
- The second analysis of the same PGN skips the engine (under 8 s) and yields identical verdict counts.
  (TC-R02)
- Reviews cached before #371 are corrected on read for the mate sign (#371). Not separately executed: the
  fixture cannot be produced without the old bundle; covered by TC-R09's 1-0 assertion on a fresh review.

Not in scope for this screen: the analysis budget on a phone (wall-clock adaptive, #347) can only be timed on
a phone; the country lookup and the own photo need a device (y13, n9).

## Home - the overlay the app boots on · specced 2026-09-15 by the Home lane · US-HM-11 added #425 (49-home.js)

ID SPACE, SAID PLAINLY SO THE NEXT WRITER DOES NOT REPEAT THE `TC-R05` COLLISION. The Home lane defined
US-HM-01 … US-HM-10 and TC-HM-001 … TC-HM-046 in its own document (`claude/stories/HOME-LANE-2026-09-15.md`,
cited in `gates/regress/49-home.js`'s header), and that document is NOT in this repository - so until #425 this
register carried no `US-HM` or `TC-HM` id at all while gate 49 cited forty-six of them. This section does not
transcribe those clauses: a hand-made second copy is what `R17` forbids and what made "TC-R05 passed" an unsafe
sentence in two documents. It names the one that already covers this class, and adds the one new clause at the
NEXT free number rather than re-using an existing one for a different meaning. The gap itself is
`jobs/story-and-case-register-frozen-at-380-2026-09-27`, and this section does not close it.

**The clause that already covers the class** is US-HM-05, "each tile opens ITS screen and Home comes down with
it". It is written for the four tiles. The NEW HERE card is not a tile, which is exactly how the defect below
survived: the clause was true of every control it named.

### US-HM-11 Every card on Home that opens a screen brings Home down with it, and lands on the screen it named

Written for the CLASS and not for the one card, because the Home overlay is `position:fixed inset:0 zIndex:500`
and opaque, so ANY control under it that navigates without dismissing it appears to the player to do nothing at
all. Measured at #425: of the nine navigating controls inside the Home layer (`chess.jsx:4540`-`4629` - the four
tiles, the streak card, the Daily 3 card, the coach line, Continue, and NEW HERE), eight dismissed Home and one
did not.

- Tapping a Home card that opens a screen leaves the Home overlay unmounted: the `zIndex:500` layer is absent
  AND it is not the element `elementFromPoint` returns at the centre of the viewport. Those are two readings
  because they fail differently - a layer can be mounted but scrolled away, or present and transparent. (TC-HM-050b)
- The card lands on the screen it named, not merely off Home. `selectOpening` (`chess.jsx:2971`) sets the whole
  lesson state and never touches `mode`, so a card that dismisses Home without setting `mode` reveals whatever
  screen `mode` already named. This is only observable when Home is opened from somewhere other than a fresh
  boot - `mode` defaults to `'learn'` at `chess.jsx:1972`, so on a first boot the two fixes are
  indistinguishable and a gate that only ever taps from a fresh store cannot tell them apart. (TC-HM-050c)
- The card's own work still happens: the lesson loads. This half was ALREADY TRUE while the defect was live -
  it is why the card looked dead rather than broken - and is kept as a separate assertion so that "Home came
  down" can never pass on a card that navigated nowhere. (TC-HM-050a)

Not in scope for this clause: whether the NEW HERE card should exist, what it should say, or which lesson it
should choose. It picks the first `openings`/`gambits` entry and that is unchanged.

## Cross-app invariants - specced 2026-09-15 by Kunal · invariants 2 and 3 executed #423 (26-invariants.js)

Every clause here is a RELATIONSHIP rather than a value, and that is the whole point of the section. The other
1961 assertions in this suite each pin a number on one element; a property that ought to hold across the app had
no home in it, which is why no test found the inconsistent Review icons and why Kunal found them by hand. Flag
`build-the-invariant-gate` carries his commission and the reasoning.

### US-INV-01 Every control I can tap is big enough to tap
As a player using the app on my phone, every button is at least 44x44, because that is the size a finger needs.
- REPORTED, NOT ASSERTED as of #423. Measured on 8cd81ec across twelve screens and three geometries: 90
  distinct visible controls are under 44x44, against the six the commission named by hand. Part of that gap is
  population rather than defect (tappable move-strip tokens, grade-table cells, divs that are headers), so it is
  not pinned until the population is settled - a pin table over an unsettled population freezes the population
  into the suite. `jobs/invariant-1-tap-targets` owns it; the gate prints the list every run.

### US-INV-02 The icons in a row are all one size
As a player looking at a row of controls, the icons in it are the same size as each other, because a row of
mismatched glyphs looks broken whatever each individual size is.
- In any container whose direct children include two or more controls laid out side by side, every glyph box is
  the same height within 1px. Measured as 11-lesson.js measures a glyph: the SVG box where there is an SVG,
  otherwise a Range over the control's own contents. (TC-INV-02a)
- Six rows fail this today and each is pinned to its measured heights per geometry, so the suite is green now
  and goes red the day any of them moves in EITHER direction - a fix included, so a pin must be retired on
  purpose rather than decaying into a permanent excuse. (TC-INV-02b)
- The pinned failures must be found in exactly the states they were measured in: one that disappears is red,
  and one that appears on a new screen is red. (TC-INV-02c)

### US-INV-03 The app uses a short, deliberate set of icon sizes
As a player, the app looks like one app, because its icons come from a small set of sizes rather than from
whatever each screen happened to use.
- The commission's "at most four" is a PLACEHOLDER. Measured at #423: 11 distinct icon glyph heights at
  375x730 and 375x568, 12 at 320x568, 13 across the union. The measured set is pinned per geometry as a DRIFT
  GUARD, not a target - nothing here claims the current set is right, only that it cannot change without
  someone noticing, and the log names any height that appears or vanishes. (TC-INV-03)
- Which sizes survive is Kunal's choice, not a gate's: collapsing 11 into 4 moves ink on six screens.
  `jobs/invariant-3-icon-size-target-set` carries the measured list to him.

### US-INV-04 Nothing on screen is cut without saying so
Shipped #404 and #413; see 26-invariants.js invariants 4a and 4b and the flags they name.

### US-INV-05 No part of a control is put where I cannot reach it
As a player on a narrow or a short phone, no part of a button is painted outside the box that clips it, because a
button whose edge is cut cannot be fully seen or confidently tapped and no gesture brings it back.

WRITTEN AT #424, AND ITS ABSENCE IS PART OF THE FINDING. Flag `uat422-lesson-lines-overhang-320` said so in as
many words - "STORY CLAUSE: none exists ... the nearest is the general fit-to-screen dimension in R14, which is a
scoring dimension and not a story clause" - which is why this class could be fixed at #404, narrowed at #405 and
re-keyed at #406 and still come back twice: there was nothing for a case to hang off, so each pass fixed an
instance.

- A control's box is at or inside the right edge of ITS OWN containing row, not merely inside the viewport. These
  are two different boxes, and the whole reason this class survived three fixes with a green suite is that every
  assertion checked the second one. Measured on #424 before the fix: the lesson demo row's "Other lines" button
  ran 16.86px past its row at 320x568 and 375x568 while sitting 7.70px INSIDE the 320 viewport. (TC-INV-05a)
- And it is inside because the row can HOLD it - the row's RESOLVED TRACK SIZES plus the gaps fit the
  row - rather than because something was truncated to make it fit. Read from the browser's own
  `gridTemplateColumns` and not from a detached clone: measured at #424, a clone reads this button 2.00px under
  its own resolved track, which is four times the tolerance the assertion uses. A box-only clause is satisfied by an ellipsis,
  and #415 built exactly that (minWidth:0 plus textOverflow), measured it squeezing the button to 26.83px at
  320x520, and reverted it. Kunal's standing rule for this class is "shrink beats dropping content". (TC-INV-05b)
- No control's box extends past the VIEWPORT's right edge at any supported geometry, because
  `document.documentElement.scrollWidth` equals the viewport there, so nothing scrolls it back. CLAUDE.md calls
  this the one unrecoverable kind of overflow. (TC-INV-05c)
- Where a row genuinely cannot hold its content, the residual is PINNED at its own measured value per geometry and
  printed every run, never excused - and a pin is retired by a deliberate edit when it is fixed, not left to decay
  into a permanent exception. At #424 that is the lesson demo row at viewport height 520, where the board is 192px
  and the row is short by nearly twice everything Kunal's three-rung shrink ladder can free. (TC-INV-05d)

### US-R13 The mistake drill says WHY the better move was better
As a player replaying a mistake from my own game, the drill explains why the move I missed was better than the
one I played, in a comparison, so I learn something from my own game rather than being congratulated.
- Every Mistake/Blunder/Miss captured from a reviewed game stores a `why` built from THAT position's own engine
  data (`out[i]` at the capture site), exactly as the Brilliant branch already does three lines below, and no
  two captured positions carry the same sentence. (TC-R16 A2, A7)
- The sentence names the better move AND the move I actually played, and translates the evaluation into words
  by naming the band, never centipawns and never a signed decimal. (TC-R16 A3, A4, A5, A6, B2, B3, B4)
- The evaluation is in MY frame, not White's: when I am Black and losing, the sentence says I am losing.
  (TC-R16 A8 - the assertion a White-frame implementation fails and nothing else in the gate catches)
- Where the engine data does not support a shape, the sentence says less rather than guessing: a plausible
  wrong explanation is worse than a short true one. The motif named is the BETTER move's own, never the one I
  played. (#426; Q1 in the lane record is still open with Kunal)
- The hint shown before I solve varies with the position, and never tells me to look for a forcing move in a
  quiet one. (TC-R16 B5a, B5b, B10)
- The whole explanation fits the verdict box on screen at every supported geometry, 320x568 through 440x956,
  without the box growing and without the board moving. (TC-R16 B6, B7, B8)

### US-R15 A control's hit area is its own

As a player tapping a button on a lesson, the action I get is the action I aimed at, because a button whose
painted word answers for a DIFFERENT button gives me the wrong result with no error to tell me it happened -
and I conclude the button is broken rather than that I missed it.

WRITTEN AT #428 FOR jobs/lesson-action-row-wraps-and-analyze-taps-fire-copy-moves-2026-09-28, AND ITS ABSENCE
IS PART OF THE FINDING. US-INV-05 covers the ROW box: a control fully painted, fully on screen, 43px tall and
unclipped satisfies every one of its bullets and every assertion in gate 48 - and on the shipped #427 a real
click on the painted word "Analyze" at 320x520 raises "Copied!". The box was never the thing that was lost.

- Every painted pixel of a control answers for that control. Measured as a hit test down the control's own
  centre line over its INK (a Range over its contents), not over its box, and run in BOTH directions over
  every pair of controls that can overlap - because a fix that raises one control's z-order moves the theft to
  the other and satisfies a one-way scan. (TC-R18 A2, A3)
- And there is no y inside a control's own box at which it stops answering for itself. This is the half that a
  lost-ink count alone does not carry: a partial fix can clear the ink and leave the invisible padding under
  the word still firing the neighbour. Measured by stepping the boundary at 0.125px, because Chromium snaps
  hit rects to LayoutUnits and an integer scan and a half-pixel scan disagree by one row at the edge.
  (TC-R18 D4 - the assertion NC2 is the control for, and the one the job's own agreed amendment did not ask for)
- Where a row of controls can wrap, the property holds on both sides of the wrap boundary, not only where the
  suite's existing columns happen to land. The wrap state itself is NOT the clause: a correct fix may make a
  row wrap at more geometries and is still correct if no control's ink is lost. (TC-R18 C2)
