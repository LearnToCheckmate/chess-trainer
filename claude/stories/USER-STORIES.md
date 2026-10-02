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

### US-R17 Once I solve a puzzle I can read the whole explanation
As a player who has just solved a puzzle, I can read the explanation of what I found in full, without any of it
being cut off, and the board does not move underneath me while I read it.
- The explanation WRAPS onto as many lines as it needs rather than being ellipsed on one line: on a phone the
  box holding it is not `white-space: nowrap` and not `text-overflow: ellipsis`. (TC-R20 B, C)
- Every character of the explanation is actually painted inside the box on screen. Not "the box is tall enough",
  which is true of the broken build at every geometry: the characters themselves are counted, and a character
  hidden behind an inner scroller counts as lost. (TC-R20 E - the only clause no partial fix satisfies)
- Nothing hides the rest of it in a scroller I cannot see: the reserved box's own scrollHeight is inside its
  clientHeight, so there is never more sentence below the fold of a 74px box on a tall phone. (TC-R20 D)
- The room for it comes from the goal card, which has done its job by the time I have solved the puzzle - so the
  BOARD DOES NOT MOVE when the verdict appears, and nothing is pushed off the bottom of the screen. (TC-R20 A,
  A2, F - and NC2 is the naive fix that moves the board 15px at 375x730 and 56.5px at 390x844)
- The goal card ends up either gone or still showing its goal in full: giving its space away must not truncate
  it instead. (TC-R20 H, written so that either fix route passes)

### US-R18 The rating on my review summary is the rating the game carries
As a player reviewing a game whose PGN records what both players are rated, the summary shows me those ratings,
because a four-digit number beside my accuracy reads as my rating whatever label sits next to it - and the one the
app computes is wrong by hundreds of points in both directions on the same game. Kunal read it on 2026-09-23 and
concluded the app could not identify blunders. (Kunal's answer on Desk item q-est-rating-shown-at-all, 2026-09-28:
"show-header. Drop EST from the review summary and show the PGN header rating where the game carries one; show
nothing where it does not.")

- Where the PGN carries WhiteElo and BlackElo, the summary shows those values. Measured by THIS build on main at
  890b8eb (#428) with headers 1523 and 1487: the panel showed ~1945 and ~948 instead, +422 and -539. (TC-R21a)
- No computed rating is presented on the summary. The two errors have OPPOSITE SIGNS on one game, so this is not a
  calibration constant away from being right - which is the measured evidence against recalibrating it. (TC-R21b)
- Where the PGN carries no rating header, nothing is shown rather than a fallback. Measured on #428 with the headers
  stripped from the same game: the panel printed the same ~1945 and ~948, so the number never depended on them.
  (TC-R21c)
- Whatever is shown fits inside its own accuracy column, measured on the rendered spans and not on the flex row
  that clips them. This clause is why the label is `RATING` and not the `RATING (from PGN)` this job's own mockup
  proposed: measured, that label puts the White rating's own span at left -51.8 on a 320-wide phone, 84.8px outside
  its column and off the screen. (TC-R21d)

- The sentence under the panel never contradicts the number above it. Added on antagonist veto at #429: the
  first cut of this fix showed a real PGN rating under the words "Accuracy and rating are rough estimates from
  average centipawn loss, not official ratings" - the INVERSE of the defect being fixed, one string away from
  the line it edits, and invisible to a sweep over `.rating` because that string holds the word with no dot.
  (TC-R21e)
- Where only ONE side carries a rating header, that side shows its rating and the other invents nothing.
  (TC-R21f)

NOTE ON THE ID: this clause was handed over as US-R17 by test-authoring at 21:24Z and renumbered here, because
build #428 landed US-R17 (the puzzle explanation) at 22:53Z, 89 minutes later. The handover's id reasoning was
sound when written; it expired before it was applied.

### US-R15 A control's hit area is its own

As a player tapping a button on a lesson, the action I get is the action I aimed at, because a button whose
painted surface answers for a DIFFERENT button gives me the wrong result with no error to tell me it happened -
and I conclude the button is broken rather than that I missed it.

WRITTEN AT #428 FOR jobs/lesson-action-row-wraps-and-analyze-taps-fire-copy-moves-2026-09-28, AND ITS ABSENCE
IS PART OF THE FINDING. US-INV-05 covers the ROW box: a control fully painted, fully on screen, 43px tall and
unclipped satisfies every one of its bullets and every assertion in gate 48 - and on the shipped #427 a real
click 2px below the word "Analyze", still on its painted chip, at 320x520 raises "Copied!" (#428 measured the letters themselves ~1px clear of the boundary; what is lost is the bottom 4.00px of the 23px chip). The box was never the thing that was lost.

- Every painted pixel of a control - its chip, not only its letters - answers for that control. Measured as a hit test down the control's own
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

### US-R27 The MOVES row's two chips stay on one line
As a player in a lesson on a narrow phone, when I look at the MOVES row I want Analyze and Copy on the SAME line as the label, so that neither chip ever sits under the other and a tap lands on the control I aimed at. CHECKABLE: at every width the app supports, the two chips report the same top to within 1px (one line), the pair's width plus the row's gap plus the MOVES label is no wider than the row's content box, and the remaining slack is at least 8px - not merely non-negative, because the shipped build clears the boundary by 0.06px at 375x568 and a font fallback moves a label by more than that. Extends US-R15 (a control's hit area is its own): US-R15 says the hit areas must not overlap, this says the layout that creates the overlap must not occur.

NOTE ON BOTH IDS [#430]. US-R15 and US-R27 are free in THIS register and were checked against it before they
were written (grep of claude/stories/ and gates/ at 9087c28). They are NOT free in
claude/stories/SUITE-AUDIT-2026-09-14.md, which carries its own unrelated "US-R15 no console errors" and
"US-R27 play a position out and come back". That document is a separate, older id space and this register is
the real one (prompts/build-run: "the real id space of claude/stories/TEST-CASES.md"); the collision is
flags/suite-id-collision-tc-r, already open, and is not refiled here [R25]. Recorded so that the next reader
who greps the whole tree and finds two US-R15s knows which is which.

US-R25  The Review list offers every game the connected account has, bounded only by a limit the app STATES ON SCREEN, and the number of games it can show NEVER depends on which month it is. A player who has not played this month still sees their history. (Kunal, 2026-09-23: "Why are there only 47 games in review. There should be thousands." A cap is correct here - the public API serves one month per request, rows carry full PGNs, localStorage is about 5MB for the whole app - so the clause names BOTH halves: state the limit, and do not let the calendar set it.) Checkable: with 300 games in the months before this one and none in this one, the list is non-empty and holds rows dated outside this month; the stated limit is readable on the list; and what was fetched is still there after a reload.  #432 AND THE LIMIT IT STATES MUST BE THE LIMIT THAT ACTUALLY BOUND, which is the half of this clause #431 satisfied only by accident. There are TWO bounds in the code (ACCT_GMAX games, ACCT_GMONTHS months) and #431 printed the games one unconditionally, so a player with a THIN BUT LONG history - a few games a month for years, the ordinary shape - read "Showing up to 200 games per account." on a list that 6 months had stopped at 30 of their 120, with 90 unreachable by any interaction. "Bounded only by a limit the app STATES" is then false: it was bounded by one the app did not state. Also checkable: with 5 games in each of 24 months the list holds 30 rows and the screen names the SIX-MONTH window and does NOT name a games cap; and with 3 months of 5 nothing bounds the list, so NO limit sentence is on screen at all. And the clause binds ON THE LAUNCH AFTER AN UPGRADE, not only after a fetch: an account imported by an earlier build records no bound, so the app states the games cap when that account sits AT the cap (which is inferable) and states nothing when it sits below it (which is not) - it never names a limit it cannot know bound. #433 AND THE UNITS OF THAT LIMIT MUST BE UNITS THE APP POSSESSES. ACCT_GMONTHS bounds ARCHIVE INDEX ENTRIES and api.chess.com's index lists only the months in which the player HAS games, so "your last 6 months" is a CALENDAR claim the code never computes: antagonist B measured 8 entries spread over 28 calendar months - 4.7x - under that sentence, on rows whose dates carry no year to contradict it. The clause is not satisfied by a limit stated in the wrong unit any more than by the wrong limit. Also checkable: with archive entries at 2023-11, 2024-01, 2024-06, 2025-02, 2025-09, 2026-03, 2026-08 and 2026-09 the screen states a bound in MONTHS OF PLAY and makes no calendar claim smaller than the span of the games it is showing. AND A MONTH THE APP ASKED FOR AND DID NOT GET IS PART OF THE BOUND: if a month request fails mid-walk the games are missing, so the screen says so - rendering nothing there claims the whole history is present, which is the same defect as an unstated cap. Checkable: with three months of 5 games and the middle month answering 503, 10 rows are shown and the screen states that some months could not be loaded. AND A LIMIT THE APP CANNOT KNOW BOUND IS STILL NOT ONE IT MAY CLAIM, WHICH #433's OWN FIRST ATTEMPT BROKE: a store with no recorded bound was written by a build whose cap was one of the two this app has ever shipped, so it is evidence of a cut only when it sits exactly at one of them - a store of 137 rows is not a 137-game cap. Checkable: with 137 or 41 stored rows and no recorded bound, NO limit is on screen. And where accounts were stopped by different bounds, the cap named is the one that applies to the account with the largest cap, qualified for the older ones - naming the legacy cap of 40 over 70 rows on screen is the same defect as naming a cap that did not bind. And reaching the cap is not being cut by it: with exactly the cap's worth of games and the index exhausted, nothing was cut and no limit is stated.

### US-PL-11 When a game ends, the screen keeps saying how it ended
*Added #434, from the #433 auditor's P1 (jobs/cpu-game-over-says-nothing-three-seconds-later-2026-09-29).*

As a player, when my game finishes — by resignation, checkmate, a flag fall or a draw, against the computer
or against someone sharing my phone — I want the screen to go on stating the outcome after the celebration
has gone, so that I can look at it ten seconds later, or come back to it, and still see that the game is over
and who won.

The clauses, each one measurable:
1. While the result card is up, the card states the outcome. (Already true; asserted so the rest is not vacuous.)
2. Once the card has faded, the outcome is still stated somewhere painted on screen.
3. What it says names the termination AND the outcome, in the terms the game had — not "you" in a two-player
   game, and not an outcome contradicting who actually won.
4. Nothing about the transition moves the board, and nothing in the line carrying it is cut without a signal.
5. **It is stated for EVERY opponent.** The adaptive-strength note that only a vs-computer game produces is a
   nicety; it may share the slot but it may never be the reason the outcome goes unstated.
6. **It is stated in EVERY ORIENTATION, and the board does not pay for it.** *(Added #435, from
   jobs/landscape-drops-the-status-row-at-game-over-...-2026-09-29.)* Clauses 1-5 were written and gated at
   375x730 and 320x568 only, and were all GREEN on a build where a phone held sideways stated no outcome at
   all: chess.jsx:5616 did not render the carrier row when the game was over and `wide`, so at 730x375 the
   scan returned [] for every opponent. A clause that is true at the geometries someone happened to test is
   not the clause; holding the phone the other way is the same player in the same moment. And the board must
   not move as the outcome arrives - measured on #434, the board shrank 224.00 -> 192.00 at the instant the
   game ended in landscape, because the bottom tab bar returned and its 62px spacer was paid for out of the
   board. A row that can appear must reserve its space, in both orientations.
7. **The board's size in landscape is a property of the SCREEN, not of how the player got there.** *(Added
   #436, from jobs/landscape-board-shrinks-8px-on-a-rotation-round-trip-2026-09-29, found by #435's
   antagonist A.)* Clause 6 pinned the board across the game ENDING; this pins it across the player's ROUTE.
   A phone opened sideways and a phone rotated into landscape are the same phone on the same screen and must
   show the same board. MEASURED on the shipped #435 bundle, live game vs Pip: a fresh landscape launch gave
   224.00 at 730x375, 844x390 AND 667x375, while rotating out to portrait and back gave 216.00, 232.00 and
   216.00 - each screen's own analytic cap. One value across three screens whose correct answers differ is
   not a derivation, and that is what identified 224.00 as an artifact: a boardTrim written by the board-fit
   loop (chess.jsx:2763) from an unsettled first-paint frame, which survived because `over` - the only
   quantity that loop acts on - is exactly 0 in every SETTLED landscape state, so nothing could correct it.
   Note which way the harm ran: the NARROWER phone kept 8px it was not owed and the WIDER phone silently lost
   8px it was, so "the board is too small" and "the board is too big" were the same defect.
   **"224.00 AT EVERY WIDTH" IS WITHDRAWN AS A GENERAL CLAIM [R18], in the clause that carried it.** It is
   true of the three geometries above and false as a statement about landscape: swept by viewport HEIGHT,
   #435's fresh board reads 192 at vh 360 where its cap is 200 - there the loop SHRANK by 8 rather than
   growing - then 224 at vh 375 and 390, 248 at vh 414, 264 at vh 430. The artifact is roughly +/-8 AROUND
   the cap and geometry-dependent, not one wrong number. Both of #436's antagonists broke the generalisation
   independently, from different doors. The CLAUSE is unharmed by the correction, because what it asserts is
   that the fresh render must agree with the fitted one - not that either takes a particular value - and
   antagonist B measured #436's one-shot size equal to #435's post-nudge size at all twelve heights it swept.

### US-PL-12 A finished game stays finished, whatever ply I am looking at
*Added #437, from jobs/the-control-row-is-keyed-to-the-ply-shown-not-to-whether-the-game-is-over-2026-09-29,
found by #436's auditor pass at 375x730 after interaction. US-PL-11 is about the screen going on STATING the
outcome; this is about the screen going on BEHAVING as though the game is over. They were one defect wearing
two faces and are two clauses because the fixes are in different places.*

As a player who has just been checkmated, I want to step back through the moves to see what happened, and I
want the screen to keep treating the game as finished while I do it — so that the controls under my thumb are
still the ones a finished game offers, and nothing invites me to act on a game that is already decided.

The clauses, each one measurable:
1. **The control row a finished game shows does not change when I step back through it.** Same controls, in the
   same order, at the same positions. MEASURED on the shipped #436 bundle at 375x730, Pass & Play, 1.f3 e5
   2.g4 Qh4# then Back twice: the row went from [Moves, Back, Forward, Review, Rematch, More] to
   [Moves, Back, Forward, Hint, Flip, More]. Review and Rematch left x=191 and x=254 and did not come back
   until the player stepped Forward to the end again — so the two things a player most wants after a loss, see
   the game and play again, were the two things stepping back took away.
2. **No control anywhere on a finished game is enabled and inert.** A control that cannot act is either absent
   or visibly disabled — the app's own idiom, which it already uses at a 0-move resignation where Review is
   disabled:true at opacity 0.6. That Hint had disabled:false and opacity 1 and did nothing at all: the
   64-square signature was byte-identical across the tap. The instrument was shown able to move before its
   stillness was believed, which is what this repository demands of an absence claim — and the ATTRIBUTION is
   stated rather than blurred, because a clause that borrows another pass's coverage is claiming coverage this
   suite does not have: the #436 AUDITOR measured the same tap moving that signature in THREE live states
   (vs-computer at 4 plies, Pass & Play stepped back one ply, Pass & Play live at the same 2-ply position);
   #437's own gate re-derives the instrument in ONE live state, at each of two geometries. Both are real, they
   are different measurements, and only the second one runs on every build.
3. **It holds in the bottom sheet too, not only in the row.** The More sheet offered **Resign** on a finished
   game stepped back — [New game · Resign · Analyze · Copy moves] — and `resign()` returns immediately on
   getStatus(game), so it was a second enabled-but-inert control of the same mechanism. Nobody had reported
   this one; it was found by COUNTING the class rather than by reading a grep, which is the only reason it is
   in the same build as the first.
4. **The cause is that the question was asked of the wrong object, and the clause is written against the cause.**
   `isOver` is getStatus(boardGame), and boardGame is playHist[pvIdx] while a preview is live, so it answers
   "is the position on the board terminal" — right for the board, wrong for the chrome. The chrome asks
   "is the GAME over", which is playEnd or getStatus(game). Note where this had already been discovered: the
   takeback block at chess.jsx:3940 carries a comment saying exactly this ("isOver is NOT usable here ... on a
   finished game it reads false as soon as he steps back a move") and worked around it for itself alone. A
   lesson filed as a fact about one call site does not travel; this clause is what it should have become.
5. **THE DEFECT WAS NARROWER THAN THE JOB ASSUMED ON ONE AXIS AND WIDER ON ANOTHER, and saying only
   "narrower" was itself a half-truth that #437's antagonist A corrected [R18].** Narrower in TERMINAL KINDS,
   as set out below. WIDER in LAYOUT BRANCHES and in SURFACES: the swap is `(!wide&&_gameOver)`, so a whole
   orientation was outside the diagnosis (clause 7), and the More sheet was outside it entirely until the
   class was counted (clause 3). The terminal-kind half: The old predicate was `(isOver||playEnd)`, so the playEnd term was already
   independent of the previewed ply: a game ended by RESIGNATION or by a DRAW was never broken. Only the
   getStatus half was, which means checkmate and stalemate. The case drives all three terminal kinds anyway,
   and that is exactly what discriminated them — every red on the #436 control is in the checkmate block.
   Anyone reading the job would have expected 3 of 3 to redden and 1 of 3 does.

6. **What the finished-game row gives up must be given up BY DECISION, not by accident — and this clause is
   written the way it is because #437 got it wrong in both directions before getting it right.** The row drops
   Flip when the game ends. The source comment at chess.jsx:6273 claimed the More sheet carried it; MEASURED on
   every bundle, it did not — the only "Flip board" item in the file belongs to the REVIEW sheet. So #437's
   antagonist B was right that fixing clause 1 closed the last route to flipping a finished game, and #437 then
   added Flip to the play sheet to restore it. **That was wrong, and the full suite caught it**: Kunal had
   already answered the question at #390 — `decisions/q-play-flip-gameover`, choice *"Flip a finished game in
   Review instead"*, with no holding note. So the route to flipping a finished game IS the Review screen, by his
   decision; this row is right to drop Flip, the play sheet is right not to carry it, and
   `gates/regress/46-play.js`'s assertion that Flip is nowhere after a game ends is ENDORSED rather than merely
   recorded (its own "NEEDS-KUNAL K-PL-4" label is stale by five builds and is filed separately). What clause 1
   removed was an ACCIDENTAL route that existed only through the defect — stepping back rebuilt the live row and
   Flip came back with it — and removing that is consistent with his answer rather than a regression against it.
   The measurable form: on a finished game, at the terminal ply and at every previewed ply, Flip is offered
   neither in the row nor in the play sheet, and the wrong source comment does not come back.

7. **The clause binds in every ORIENTATION, and #437 does NOT satisfy it — stated as a residual, with the
   number.** *(Added #437 from both its antagonists, who found this independently from different doors.)* The
   row's swap is `(!wide&&_gameOver)`; #437 fixed the second operand and left the first, and its gate is
   portrait at both geometries, so `wide` is false in every one of its browser sessions and this state is
   unreachable by it. MEASURED at 730x375, Pass & Play, at the TERMINAL PLY with no Back tap: the row is
   Moves · Back · Forward(disabled) · Hint · Flip · More — no Review, no Rematch — Hint is 27x51 at x=362
   y=216 with disabled:false, and tapping it leaves the 64-square signature byte-identical, with the
   instrument validated moving in the same session and geometry three taps earlier. Identical on #436, so it
   is pre-existing and not a regression; it is the same defect, unfixed, in the orientation the clause also
   covers. A second half comes with it: the side rail [233,26,494,216] has clientHeight 216 and scrollHeight
   241 at game over, so the bottom 25px of all six controls — half of a 51px row, their own centres included —
   is unpainted and not hit-testable, recoverable only by scrolling a rail that shows no affordance.
   `jobs/landscape-game-over-keeps-the-live-row-and-the-rail-clips-half-of-it-2026-09-30`.

### US-PL-13 When I finish a game holding the phone sideways, I get the same screen as when I hold it upright
*Added #438, from jobs/landscape-game-over-keeps-the-live-row-and-the-rail-clips-half-of-it-2026-09-30, which
BOTH of #437's antagonists found independently from different doors and which #437 handed over on the pen.
US-PL-12 is the same complaint one axis over: it made a finished game keep behaving as finished across a
STEP BACK, and this one makes it behave as finished across a ROTATION. TC-PL-034's own "NOT COVERED" list names
both gaps this closes - "vs-COMPUTER as the opponent" and "LANDSCAPE at any geometry" - so this is a named gap
closed rather than a new discovery.*

As a player who has just lost a game with the phone turned sideways, I want the controls a finished game offers
- see the game, play again - to be the ones under my thumb, all of them tappable, so that turning the phone
never costs me the two things I want most after a loss.

The clauses, each one measurable:
1. **A finished game offers Review and Rematch at every orientation.** The swap was written
   `(!wide&&_gameOver)`, so it happened only in portrait. MEASURED on the shipped #437 bundle at 730x375, 844x390
   and 667x375, by mating in portrait and rotating: the row read [Moves, Back, Forward, Hint, Flip, More] at all
   three - no Review and no Rematch anywhere on the screen, at the moment the player most wants both.
2. **Nothing a finished game offers is enabled and inert, at any orientation.** That landscape Hint had
   disabled:false and did nothing: a mouse click AND element.click() both left the 64-square signature
   byte-identical, against an instrument shown in the same session and the same geometry to MOVE it in a live
   landscape game. This is US-PL-12 clause 2 extended to the axis it did not cover.
3. **Every control in that row is tappable down its whole height, including its own centre.** MEASURED on the
   shipped #437 bundle by sampling every 4px down each control's 51px box: Pass & Play gave 6 of 12 points with
   the first dead point at dy=27, and **vs COMPUTER gave 0 of 12 on all six controls with every centre dead** -
   the row ran to y305.5 against a rail that stops painting at 242. So in the mode most games are played in, the
   entire control row was unreachable on a finished landscape game. A control that is painted but cannot be
   touched is worse than one that is absent, because the player keeps aiming at it.
4. **The finished-game chrome does not cost the player the controls.** The mechanism behind clause 3 is that the
   side rail is exactly as tall as the board and its content at game over was taller: the wide-only "Review this
   game" button (52px) and, vs the computer, the bot chip, the Elo pill and the Elo slider (39px together) are
   laid out ABOVE the control row and pushed it out of the painted window. Chrome that states something a second
   time must never displace a control that can only be in one place. The bot chip was a literal duplicate - the
   same probe read two "Pip" chips, one in the player bar and one below it - which is the finding #435 acted on
   when it removed a wide-only duplicate strength chip from this same screen.
5. **It survives a step back.** Stepping back through a finished landscape game keeps all of the above. This is
   not the same assertion as clause 1 in a second state: on the shipped bundle a MATED game un-clipped on a step
   back (the button unmounted, because `isOver` reads the previewed ply) while a RESIGNED game stayed clipped for
   the rest of the game (because `playEnd` does not), so the defect was intermittent for one ending and permanent
   for the other. #437's handover note said stepping back un-clips; that is true of checkmate only, and the
   correction was found by driving both terms of `_gameOver` rather than one.
5b. **"Landscape" here means the rail layout, and that is a WIDTH threshold, not an orientation.** Antagonist A
   made this precise and it matters for reading every clause above: `wide` is
   `vp.w>vp.h && (vp.w-RAIL-48)>=360` (chess.jsx:2761), so a 568x320 or 480x320 phone held sideways takes the
   PORTRAIT layout, has no side rail at all, and was therefore already correct before this build - the swap
   fired there on #437 through the `!wide` branch. The rail/stack breakpoint sits at or below 640px wide.
   So this story fixes every geometry that HAS the defect, which is not the same sentence as every landscape
   geometry, and the difference is worth keeping because a pass at 568x320 is not evidence for this fix and a
   failure there is not evidence against it. (That screen has its own, worse trouble, and it is not this
   build's: jobs/landscape-320-tall-is-unusable-and-a-mate-cannot-be-played-2026-09-30.)
6. **A LIVE landscape game is untouched.** It still offers Hint and Flip and neither Review nor Rematch, and it
   still hides the Elo chrome. This clause exists so that "make the finished screen right" can never be satisfied
   by making every screen the finished one - the cheap fix that would satisfy clauses 1 to 5 and break every game
   in progress.


ID NOTE, because this project has already paid for one id collision (flags/suite-id-collision-tc-r). US-PL-01
to US-PL-10 and TC-PL-001 to TC-PL-030 are cited by gates/regress/46-play.js as living in
`claude/stories/PLAY-LANE-2026-09-14.md`, and THAT FILE IS NOT IN THIS REPOSITORY — measured, `ls
claude/stories/` returns MENU-LANE-2026-09-15.md, README.md, SUITE-AUDIT-2026-09-14.md, TEST-CASES.md and
USER-STORIES.md and nothing else. So this id is allocated one past the highest number that file's own consumer
names, and it is recorded here, in a file that IS in the repository, rather than in a document no session can
open. jobs/story-and-case-ids-have-no-claim-register-2026-09-28 is the open item that would make this safe
rather than careful; this run did not fix it.

### US-PL-14 Once a game is over, it is over: nothing I do on the board can add a move to it
*Added #439, from jobs/a-pawn-can-be-promoted-into-a-game-that-already-ended-on-time-2026-09-30, found by #438's
auditor pass and measured by #438 as pre-existing on the #437 bundle. US-PL-12 and US-PL-13 are the same
predicate on two other axes - a finished game must keep behaving as finished across a STEP BACK, and across a
ROTATION. This one is the axis underneath both: a finished game must keep behaving as finished when the player
TOUCHES THE BOARD. The job that asked for it names only the promotion picker; the clauses below are wider than
that because the measurement was.*

As a player whose game has just ended - I resigned, or my clock ran out - I want the game to be finished, so that
the move list I then review is the game I actually played and nothing else.

The clauses, each one measurable:
1. **After any ending, the board accepts no further move.** The guard was `getStatus(game)` for checkmate and
   stalemate, which reads the BOARD and therefore misses every ending that is not on the board: resign, a clock
   flag, and the #414 auto-draws. MEASURED on the shipped #438 bundle at 375x730 and 320x568: a RESIGNED game
   accepted a legal move and wrote it into the move list, vs Computer (plies 4 -> 5, `3.Bc4`) and Pass & Play
   (1 -> 2, `1...e5`); a game lost on TIME did the same (4 -> 5). A MATED game correctly refused (4 -> 4), which
   is what locates the hole in `playEnd` rather than in the status check.
2. **A choice the game was waiting on is dropped when the game ends, not left live.** MEASURED at 375x730 with a
   1-minute clock: with the promotion picker open, White's clock flagged, the result card read `Time! Black wins`
   and the control row had correctly swapped to the finished-game set - and the picker was still up with four
   enabled 52x52 buttons. Tapping the queen appended `5.fxg8=Q` to a game that had already ended (8 plies -> 9)
   and took the captured-material readout from +2 to +13. The picker's buttons call the move committer directly,
   so clause 1's guard does not reach them: this is a second hole, not the same one twice.
3. **Dropping it means clearing it, not hiding it.** `fullReset` - what Rematch and New game call - resets the
   ending, the board, the clock and the move list, and never touched the pending promotion choice. So a fix that
   only stopped PAINTING the picker would leave the choice set and raise it over the NEXT game, holding the dead
   game's moves. MEASURED on a bundle built that way (md5 14905f6f0ce3): the reported defect is closed, every
   other assertion in gate 65 goes green, and Rematch raises a stale picker.
4. **And a live game is untouched.** A game in progress still accepts moves, still opens the picker on a
   promotion, and still completes it: measured at both geometries, a white queen stands on a8 afterwards and the
   move row reads `5.bxa8=Q`. Fixing clause 1 by refusing the board, or clause 2 by never painting the picker,
   would satisfy every clause above and break the app; gate 65's E block is that pair of controls.

5. **And "the board" means the board, not one way of touching it.** The first candidate for this story guarded
   the tap path and left the DRAG path open: a piece picked up while the game was live and released after the
   ending still committed. MEASURED at 375x730 with a 1-minute clock - the clock flagged with the piece held, the
   result card read `Time! White wins`, and releasing it appended `3...Nf6` with no error. The guard therefore
   sits on the move COMMITTER rather than on its callers, which is what makes clause 1 a property of the game
   rather than a property of however many input routes someone has remembered to enumerate.

Case: TC-PL-036. Gate: gates/regress/65-promotion-after-gameover.js.

*Clause 5, and the mode term in clause 4, were both added after the #439 antagonist pass vetoed the first
candidate. The story is stronger for them and neither was in the job that asked for this work.*

## US-R31 - a move is only called a sacrifice when it actually gave something up

*As a player who also reviews on chess.com, I want "!! Brilliant" to mean I gave up real material and it
worked, so that the one grade the app gives out most sparingly still means something when I see it.*

1. **Material given up is net, and it is not "what is standing on the square now."** A move that lands a piece
   on a square the opponent can win is a sacrifice only to the extent of what the exchange actually costs,
   after every recapture. MEASURED on the shipped #439: a pawn promoting onto a contested empty square scored
   the FULL value of the piece it became - `b8=Q` read `sac=9 isSac=true ok=true` on
   `2r4k/1P6/8/8/8/8/8/K7 w` - so a beginner who queened a pawn and lost it was congratulated for a brilliant
   nine-pawn queen sacrifice. Queening a pawn and losing it gives up A PAWN; the app now reads `sac=1`.
2. **And it is not a rule about promotions.** The same expression, with no promotion anywhere, scored
   `174540842570 37.Qf6+` at `sac=9 ok=true` - a queen trade offered with check, in a game chess.com records
   zero Brilliants in. Promotions and that queen check are ONE defect, so the app decides this by asking
   whether the landing square was empty, not by asking whether a pawn was promoted. A fix that special-cased
   promotions would have left the queen check exactly as it was.
3. **And en passant is a capture.** Its landing square is empty, so a rule written only around "was the square
   empty" routes it to the wrong arm. A pawn taking a pawn en passant gives up nothing and must read `sac=0`.
4. **And a real sacrifice is still a real sacrifice.** The two moves this project agrees with chess.com about
   must be untouched: `184024052818 19...Bxh3` (the one Kunal found by hand at #420) still reads `sac=2` and
   `184222697658 22...Qxc3` still reads `sac=8`, both still Brilliant. Clause 1 could be satisfied by a measure
   that returned 0 for everything, and clause 4 is what stops that: over all 697 plies of the nine-game answer
   key corpus the gate fires on EXACTLY those two, where #439 fired on three.

Case: TC-R41. Gate: gates/regress/68-brilliant-sac-empty-square.js.

*Clause 3 is in this story because nothing in the corpus could have found it: there are 0 promotions and 0
en-passant captures in all 697 plies, so the input class this whole story is about was absent from every
measurement that had ever been taken of this gate. Clause 4 exists because the first candidate built for
clause 1 - net the exchange on EVERY path, which is more principled - measured 19...Bxh3 at 1 and so lost the
reference brilliancy. Making that candidate work needs the sacrifice threshold moved from 2 to about 1, which
is Kunal's decision and not this lane's; it is routed with its numbers rather than taken.*

### US-GL-01 The gallery asks me only for what is still outstanding, and asks for it so I can act without a reply
*Added #451, from jobs/preview-gallery-flush-and-load-current-asks (priority 10). Kunal, 2026-09-22: "whatever you
need from me have it saved in the preview gallery first make sure that the preview gallery is flushed of everything
that you don't need anymore or that's already been provided just put the items that you need in there and exactly
how you need it so all I have to do is essentially record it and upload it to you". The gallery had no story clause
at all before this, which is part of why eight cards pinned to builds #366-#373 survived eleven builds: nothing said
what the list was FOR, so nothing said when an entry should leave it.*

As the person the fleet depends on for everything a sandbox cannot see - Apple emoji ink, iOS Safari, real touch,
real safe-area insets, signed-in state, engine timing on my own phone - I want the Preview gallery to hold exactly
the things still waiting on me, each written so I can record it and upload it without asking what was meant, so
that opening it costs me no triage.

The clauses, each one measurable:
1. **The list holds only outstanding asks.** An ask leaves the list when it has been provided, when it is no longer
   needed, or when it is not yet due. MEASURED at #451: of the four asks the job carries, one was already provided
   (Desk item kevitsch-chesscom-review, choice "sent", 2026-09-22T21:30:50Z) and one is not due (it is added by the
   build that closes the last of three named drill jobs, all three still status "ready"), so the list holds two.
2. **A card states what to capture, the exact taps, and where to put it, and nothing else.** No card explains a
   build number or justifies itself to him; the reason a card exists belongs in the tracker, not on his screen.
3. **Nothing in the list is there for the test harness's benefit.** This is the clause the #451 flush exists for.
   The eight cards it removed were simultaneously Kunal's ask list AND the only route five gates had into the states
   they assert over, so the list could not shrink without taking the suite down with it - MEASURED, by doing it:
   deleting them took gates 10, 11, 12, 13 and 14 RED in one suite, every one on a `locator.waitFor` timeout for a
   card that no longer existed. Fixtures the harness drives are a separate list, under their own heading, labelled
   on screen as not an ask. A queue that cannot be emptied is not a queue.
4. **Every card fits the phone it is read on.** No card's box paints past the viewport and no card's ink is cut
   horizontally, at 320 wide and at 375 wide. Vertical scrolling of the list is correct and is not a cut: the list
   is its own scroller, and this project has filed two false P0s by reading a scroller's range as spill.
5. **A card that reports a measurement reports what the browser actually says.** Where a card exists so that one
   screenshot settles a number - card 1 exists because the record carries two different heights for his phone and
   names this card as the thing that decides - the figures it shows are asserted against the live browser values,
   not merely rendered. A readout that can be stale is worse than no readout, because a screenshot of it looks like
   evidence.
6. **A card says which of the two modes it is, and the screen's general instructions are derivable from the cards
   rather than contradicting them.** *Added #452, from jobs/the-gallery-ask-queue-states-three-different-deliverables-for-one-situation-2026-10-01.*
   There are exactly two kinds of ask: one the app can drive itself to the state for, and one that is a job on
   Kunal's own account which no recording can perform. The screen had ONE mode baked into the header and the
   Play-all button ("One recording is the whole test", "Each card drives itself", "Upload the clip") while the CARDS
   had two, so one screen stated three different deliverables for one situation and a reader could not tell whether
   to send a video or two stills. The mode is declared on the card, as data, and the header states both modes and
   devolves the deliverable to the card that knows it. This clause REFINES clause 2's "and nothing else": the mode
   is part of what to capture, not decoration.
7. **An instruction for a card he has to drive himself does not expire while he is still doing it.** *Added #452,
   from jobs/gallery-card-2-instruction-vanishes-before-its-task-can-start-2026-10-01.* MEASURED on the shipped #451
   bundle at 375x730: the manual card's instruction was first seen at 76ms and gone at 9154ms, while its own task -
   open a game, Analyze, open the summary, screenshot the grade rows for both players - takes 20 to 60 seconds by
   this repo's own gates/drive/review.js:5. So the instruction vanished two to seven times over before the first
   step could finish, leaving him on the Review list with the task text gone and the gallery closed behind him. A
   manual card's instruction now persists until he hides it, and the bar stays `pointerEvents:none` so it cannot eat
   the very taps it is asking for. A self-driving card still expires on its own hold, which is asserted separately
   so that "make it persist" cannot quietly become "make everything persist".

## US-R32 - what the Puzzles screen counts as a Lichess puzzle is a Lichess puzzle

*Added #460, from jobs/the-brilliant-drill-banks-online-puzzle-credit-without-bound-on-main-2026-10-02, which
antagonist A raised at #459's diff door as the generalisation of the defect it had been sent to audit.*

1. **A drill solve is not a Lichess solve.** The two drills built out of my own games - "Practice your
   mistakes" and "Your brilliant moves" - are positions from games I played, reached from Review. Solving one
   does not add to "Online puzzles (Lichess) - N solved", and does not put the card into the store that
   counter is computed from. MEASURED on the shipped #459 bundle at 375x730: solving one seeded brilliancy
   card took that counter to 1 and banked the id `lichess:mine:<fen>` beside real Lichess puzzles, for a
   player who had opened none. The cause is that `puzzleFromMistake` hands `_lichessObj` the id `'mine:'+fen`
   and `_lichessObj` prepends its own `'lichess:'`, so a drill card arrives downstream looking like one.

2. **Nothing I can repeat without limit may bank progress without limit.** The brilliancies drill never
   deletes its card - the delete effect keys on the drill being the MISTAKES one - so the same position can be
   solved again for as long as I like. MEASURED on #459, three solves of ONE retained card: streak 1, 2, 3;
   pzBest 1, 2, 3; XP 120, 123, 126; the daily puzzle goal bumped three times; and the online count stuck at 1
   the whole way, because the one guard that existed bounded the COUNT and nothing bounded the rest. A screen
   that says I have solved one puzzle while my streak says three is two readouts of one quantity disagreeing,
   which is the shape this project has shipped before.

3. **The credit is decided by what the card IS, not by how I answered it.** #459 closed the same leak on the
   mistakes drill by keying on how the accept was reached, and that could not reach the brilliancies drill at
   all, because on a brilliant card there is no grade to key off. The question "may this solve bank Lichess
   credit" is a question about the card's provenance, and it is asked in one place.

4. **And a real Lichess puzzle still counts.** This clause is a bound on what may be taken away as well as on
   what may be given: the daily puzzle and a pack puzzle still advance the count, the streak and the XP, and
   are still recorded so they are not counted twice. A change that stopped crediting everything would satisfy
   clauses 1 to 3 and break the feature, so TC-R42 asserts this on BOTH bundles.

*WHAT THIS CLAUSE DOES NOT SETTLE, and it is Kunal's:* whether drill work should earn puzzle XP and the daily
bump at all, bounded to once per card. #460 removed that credit along with the false attribution, because the
two came out of one call, and recorded the cost as an amber default on
flags/amber-460-drill-solves-stop-earning-puzzle-xp-and-the-daily-bump rather than deciding it. Stores written
before #460 keep their inflated numbers; no migration was shipped, on the #449 precedent that deleting a
player's recorded achievements is not a build default.

### US-R32 clause 5, ADDED IN THE SAME BUILD AFTER THE ANTAGONIST PASS - and it is a correction to clause 1 as much as an addition

**A drill neither builds nor breaks my Lichess puzzle progress.** Clauses 1 to 3 above say a drill solve must
not CREDIT the puzzle counters. They are silent on the other direction, and #460's first candidate shipped
that silence: `pzBreakStreak` (chess.jsx:3888, called from the miss branch of the solve handler) had no
provenance term either, so a wrong move in a drill still destroyed a streak built on real Lichess puzzles -
while clause 1's guard had just removed the only way drilling could rebuild it. MEASURED on that candidate at
375x730 with a live streak of 5: one fumble took it to 0 and solving the card left it at 0, where the shipped
bundle on main reads 5 -> 0 -> 1. So a fix written to stop a drill inflating my progress had made a drill able
to destroy it and nothing else, which is worse for that player than the defect being fixed.

The predicate is the same one, at the sibling site, and it is asserted as TC-R42 block E. The class is two
sites and not one: the credit at the solve branch and the debit at the miss branch. #460's own first published
`classSwept` of 1 found / 1 fixed is **withdrawn**; the sweep was counted over "call sites of `onlineSolved`",
which is the wrong predicate, rather than over "a place that decides whether a drill card moves Lichess
progress", which is the right one. Found by this build's antagonist A at the diff door.

## US-R20 - a grade count names a set of moves the player can reach, and the number equals that set
As a player reading my game review, when I look at the grade table and then at the moves themselves, I want
every number to name exactly the moves it counts, so that tapping a number takes me to one of them and counting
them by hand gives me back the number I tapped. CHECKABLE, two clauses with zero tolerance: (1) for every
rendered grade row, the displayed count equals the number of plies the MOVE SCREEN badges with that same grade
for that side, counted from the painted badges and never from a fixture constant; (2) for every rendered row
whose count is above zero and which is not disabled, a real click changes the view away from the summary AND
lands on a ply whose painted badge equals that row's label. A count that names no reachable move is not rendered
as an enabled control.

WHY A NEW CLAUSE AND NOT AN EXISTING ONE. The two visible consequences are different failures of one rule - a
count that disagrees with its moves, and a count that navigates nowhere - and no clause in this register ties a
NUMBER to the SET OF MOVES IT NAMES. Written for the class: it binds every grade row, not the Best row and not
the Book row. Measured on origin/main's shipped bundle c299c6a093cf at #464: on the Opera Game the Best row
reads 5 for White while the move screen badges 8 white moves Best, and the Book row's click leaves the view on
the summary every time, because 'Book' is never a cls.label while the counter reassigns book plies to it.

A CONSEQUENCE OF CLAUSE (1) WORTH STATING, because it is what the fix actually does: the grade a ply is
PRESENTED as has to be one rule, read by every element that presents it. #464 made that rule `effCls` and
pointed the counter, the summary jump, both verdict chips, the board square tint, the board badge and its label,
and the grade-coloured play-it-out button at it. What this clause does NOT require is that the same rule govern
BEHAVIOUR: a book ply that was objectively an inaccuracy may still offer the better move, and four call sites
are deliberately left reading the raw class for that reason.

NOTE ON THE ID [#464]. US-R20 is free in THIS register, checked by grep of claude/stories/ before it was
written. But the block the spec run reserved on 2026-09-28, "US-R20..US-R29", is NOT free: US-R27 is already
taken in this file (#430) and US-R31 and US-R32 are taken above it. So the reservation was made against a
register that had already moved past parts of it. Only US-R20 itself was verified free and used. Same shape as
the note under US-R27 and as flags/suite-id-collision-tc-r, which is already open and is not refiled here [R25].

US-BN-01  **As the build lane, when I ask whether a build number is free, I need the answer to be wrong in the safe direction only.**  The build number is the key the whole record hangs on — flags, gate logs, RUN-LOG rows, case results, the dashboard and every "shipped at #NNN" claim key off it — and `gates/build.sh` refuses to stamp only a number it can SEE on `gates/build-numbers.tsv`. So `issued` for a free number costs a gap, which costs nothing; `free` for a spent number costs a second tree under one name, which is the #416 defect that this project has never fully unwound and which cost a rebase at #375. **The register must therefore be able to answer that question about every number any commit in this repository names, and it must say what it measured over when it answers.**  NOT A PLAYER-FACING STORY: this is tooling and records, and it is written down because the definition of done requires a clause and because the alternative — a tool whose contract lives only in its own header — is how `check` came to be read as the stampability predicate it is not (#454). The clause it is held to: a number named by any commit TEXT on any ref - subject or body, in the `#NNN` form or the hashless `Build NNN` form this project's early history used - is `issued`, not `free`; and a measurement taken over a partial history (a shallow clone) is reported as partial rather than as clean.  **AND THE CLAUSE DELIBERATELY OVER-APPROXIMATES "SPENT", WHICH IS A POLICY CHOICE AND IS ARGUED RATHER THAN ASSUMED.** #454's own register row rejected an unanchored scan because it "also returns cross-references like '#125' in 'Friends: cloud functions (request/accept/list/remove) for #125', which was never a build number" - and that is true, and #465 records #125 anyway. The reason is the asymmetry this story opens with: a number recorded that nobody used costs a GAP, and the register's header says a gap costs nothing and must never be tidied away; a number left `free` that somebody used costs a second tree under one name. The two error directions are not comparable, so the cheap one is the one to take. What must NOT be claimed - and was, in this build's first draft, until antagonist A refused it with #454's own row - is that every number swept in is a genuine build number. Some are cross-references. Recording them is the point, not a defect.  CASE: TC-BN-001, run by `gates/buildnum-selftest.sh`.  WHAT IT DELIBERATELY DOES NOT CLAIM: that the register can see a number minted in another live container and not yet pushed. It cannot, by construction — the repository half is the half that works with no network — and that gap is tracker `docs/buildnumber`'s job, which is why neither half replaces the other.

## US-R33

US-R33  **As a player who has just finished reviewing a game, when I ask to play on from a position, I need the app to refuse honestly if that position is already over rather than start me in a game I have already lost.**  The last ply is where every review of a decisive game ENDS, so "Play from here" there is one tap from the most common resting place in the app. Two clauses, and they are separate because they failed separately when measured:

(1) THE ROUTE MUST NOT START A GAME IN A POSITION THAT IS ALREADY OVER, and the screen must say why it will not. Before #466, at the last ply of 1.f3 e5 2.g4 Qh4# the route opened a real game reading "Checkmate! / You lose" with zero plies and Rematch already offered, and the setup sheet's own banner was BYTE-IDENTICAL to a non-terminal ply's — so nothing on screen distinguished "continue this position" from "start a position with no legal move". The refusal has to name the remedy (step back a move), because a refusal with no way forward is a dead end.

(2) A GAME ENDING THAT NOBODY PLAYED MUST NOT MOVE THE COMPUTER'S ADAPTIVE STRENGTH. Before #466 the instant checkmate wrote `ct_elo` down from 800 to 750 and PERSISTED it, so one tap at a finished review permanently made the bot easier. This clause is about what was EARNED, not about move count: a resign or a flag at move zero is a real player action and still counts, because those endings arrive through `playEnd` rather than through the board's own status.

WHAT THIS CLAUSE DOES NOT CLAIM. Clause (2) is currently unreachable from the UI while clause (1) holds, since the only routes that could start an already-over game are the ones clause (1) now refuses. It is kept as an independent guard for any future caller that bypasses the setup sheet, and it is proved live only by a negative control that reverts clause (1) alone. Said here rather than left to be discovered, which is the #449 inert-arm discipline.

NOTE ON THE ID [#466]. US-R33 was checked free by grep over `claude/stories/` and the whole repository before use. It deliberately sits above US-R32 rather than inside the "US-R20..US-R29" block a spec run once reserved, because the note under US-R20 records that that reservation was made against a register which had already moved past parts of it.
