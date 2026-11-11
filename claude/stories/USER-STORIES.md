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

### THE GEOMETRY SETS, NAMED ONCE
*Added 2026-10-03 from jobs/supported-geometry-names-two-different-sets-2026-09-28. The phrase "supported
geometry" occurred twice in this file and resolved to two different sets that share three members, so no clause
using it could be decided. Both sets are named here and every clause below says which one it means. Re-measured
from the gate sources at main f3ae36a, not read from prose [R18].*

- **THE DRILL SEVEN** - `gates/regress/51-drill-explain-why.js`'s `ALLGEOS`, and the same seven in
  `gates/measure-drill-verdict-reserve.js:51` and `gates/regress/57-pz-solved-explanation.js:55` (`G7`):
  **320x568, 360x640, 375x667, 375x730, 390x844, 414x896, 440x956.** This is the set `prompts/test-authoring`
  names, and gate 51 and that lane document call it **TA-7** - one set, two names, the same seven members (reconciled
  at #545). The harness default 375x679 (`kunal`) is NOT one of them. `gates/audit/geometry-sets.sh` (TC-SUITE-253)
  holds THE DRILL SEVEN equal to gate 51's ALLGEOS and THE LESSON THREE equal to gate 48's GEOS.
- **THE LESSON THREE** - `gates/regress/48-lesson-flow.js:424` (`GEOS`), resolved through `gates/lib.js:34`:
  **320x568 (`se`), 375x730 (`kunal730`), 390x844 (`390`)**, with a separate short-and-wide column in that
  gate's block D (320x520, 375x520, 320x540, 390x568) that is NOT part of the three and is pinned per point.

**Intersection: 3 members (320x568, 375x730, 390x844).** A clause that names neither set names nothing.

**375x730 IN BOTH SETS IS THE GATES' COLUMN AND NOT THE DEVICE. R19 SETTLED THE DEVICE AT 375x761, AND A CLAUSE
ABOUT HIM NAMES IT [#545, item (55); #549, item (110); jobs/registers-canonise-375x730-after-r19-settled-761-2026-10-06].**
prompts/common R19 settled the device on 2026-10-03: his layout viewport is **375x761** (his own 2026-09-14
diagnostics: vw 375, vh 761, boardPx 349.04), and the figure 730 is wrong as a statement about the device. The two
sets above are GATE sets, held equal to gates 51 and 48 by `gates/audit/geometry-sets.sh`, and those gates still
visit `kunal730`, so their member is 375x730 and is left as measured. What that means for a clause: **naming a set
means "what these gates drive", not "what he sees".** A clause whose subject is the device - a height, a fold, a
board size he will look at - names **375x761** (`GEOS.kunal761`) explicitly, beside whichever set it also names.

**THE ORDERING IS DECIDED, AND THE REGISTERS FOLLOW IT [#549, item (110)].** The orchestrator ruled on 2026-11-04
(decisions/the-orchestrators-calls-on-the-jobs-batch-8-left-out-for-them-2026-11-04, on Kunal's word of that
evening): the gates/lib.js sweep first, the registers second; canonise 375x761 as the device; a literal outside both
sets that is a legitimate column stays, named as such. The sweep landed at #549 item (23): gates/lib.js labels
`kunal730` "superseded by R19" and `kunal761` the device. The registers followed at #549 item (110): every line of
USER-STORIES.md and TEST-CASES.md that called 375x730 the device now names it the gates' superseded column, which
`gates/audit/r19-phone-geometry.sh` A1 reads. 375x730 is still a set member because gates 51 and 48
still drive it; moving a set's member to 375x761 is a gate change, made gate by gate, and the set line here moves in
the same commit as its gate, so the register and the suite never disagree about what a set means.

**A NUMBER THE RAISING JOB CARRIED IS WITHDRAWN HERE [R18], in the clause that inherits it.** The job measured
gate 48 as a SEVEN-member set at 2026-09-28 ("320x568, 375x568, 375x730, 390x844, 375x520, 320x520, 320x540",
cited to :647-650). At f3ae36a that gate's `GEOS` is a THREE-member list at :424, and the short points live in
block D as pins rather than in the sweep. So the shape of the defect - two sets, one undefined term - holds and
is fixed here; the "two disjoint seven-member sets" figure does not, and the intersection is 3 of 7 against the
drill seven rather than 3 of 7 against another seven.

---

## Review (game review) - specced 2026-09-12 · executed #373 (see TEST-CASES.md for the run) · coverage counted: see the #373 close-out

The Review screen is three screens in a row: the **list** (import a game, or pick one already imported), the
**summary** (accuracy, verdict counts, Skills), and the **move screen** (one ply at a time, with the reason
and the engine's answer). On a phone the move screen is the one-screen layout (#337 default): no app header,
a back arrow and ⋯ in the top player bar, the eval bar beside the board (left, his choice, #361), the move
line, the reason, one row of controls, the move strip.


### THE ENGINE BRANCH, NAMED ONCE
Every clause in this section that promises a WORD or a NUMBER the review produces is a promise about the output
of one of TWO code paths, and the device chooses which one. `const useSF=sfReadyRef.current?await ensureAna():false`
decides it in `chess.jsx`; there is no `ct_*` override on either side, so a phone whose Stockfish worker never
answers `readyok` takes the minimax fallback - the `else` of that same `if(useSF)` - and the player still reads a
full review. Which branch ran IS recorded: the review writes `engine:useSF?'sf':'fallback'` into `ct_gamestats`
(the `engine:` key written beside `ct_gamestats` in `chess.jsx` - cited BY SYMBOL rather than by line, because the
arm (4) line-citation ceiling is at 48 of 48 and a line number in a register rots the moment the file it points into
is edited).

**AND THE TWO BRANCHES DO NOT PRODUCE THE SAME DATA. MEASURED on main 97393a6, by reading the two `out.push`
calls rather than by inference.** The pooled-Stockfish push carries twelve fields:
`loss, cls, bestSan, bestMove, evalAfter, evalBefore, gate, altSan, altDrop, motifs, gist, pv`. The fallback push
carries seven: `loss, cls, bestSan, bestMove, evalAfter, evalBefore, gate`. **FOUR FIELDS ARE PRESENT ON ONE
BRANCH AND ABSENT ON THE OTHER: `altSan`, `altDrop`, `motifs`, `gist`** (`pv` is `null` on both, so it is not a
difference). Anything a sentence says that is built from those four is, on the fallback branch, built from
`undefined`.

**WHAT THIS BLOCK IS AND IS NOT.** It is the one home for that fact [R17], so a clause can name the branch
instead of re-deriving it. It is NOT a per-story verdict: which stories' promises actually consume the four
fields has NOT been measured, and the honest size of that question is 42 occurrences in `chess.jsx` (`altSan`
14, `motifs` 13, `altDrop` 12, `gist` 3), counted rather than estimated [R07]. The one story audited so far is
US-R13, where the consequence is measured and live - see its last clause. The remaining five stories in this
section whose promise rests on review engine output (US-R03, US-R05, US-R06, US-R08, US-R11, identified by
reading each section's body, not by grep, because `fallback` in US-R27 is a FONT fallback and a term match
over-counted this class by six on its first pass) are named here and NOT claused, because a clause written
without that measurement would assert something nobody has checked [R18].

### US-R01 Import a game by pasting a PGN
As a player who just finished a game on chess.com, I paste its PGN and get a review without an account.
- Given the Review list, when I paste a PGN into the box and tap "⚡ Analyze Game", the app analyses every
  position and lands on the summary. (TC-R01)
- The analysis of a 33-ply game finishes in under 90 s on the test machine with the 3-worker pool, and a
  second analysis of the same PGN comes from the cache in under 8 s (#341, #343 cache key). (TC-R01, TC-R02)
- Zero application console errors during import and analysis. (TC-R01)
- A best-effort lookup the review makes on the side (the players' countries for their flags) that FAILS leaves the app as it
  was and is tried again the next time the review opens: a refused or offline lookup is never stored as the answer, so one
  offline review cannot remove a player's flag for good. A country that IS known paints as its flag in that player's
  bar, before the name, and a value that is not a two-letter code paints nothing. (TC-R68, TC-R107; #548 item (41), #549 item (3),
  jobs/a-failed-country-lookup-is-cached-as-an-answer-so-one-offline-review-removes-the-flag-for-ever-2026-10-10)
- A pasted PGN whose [FEN] header sets up a position is reviewed FROM THAT POSITION: the review's first board is the header's,
  and the move numbers and the side each move belongs to follow it (a study chapter with Black to move at 23 opens on '23…').
  A header that cannot be read is REFUSED with a sentence that names the [FEN] header, and no review, accuracy, grade count or
  rating is produced for that game. SetUp "0", or a header equal to the standard start, is an ordinary game. Kunal's answer on
  jobs/honour-fen-header: "honour it, and refuse a header we cannot parse rather than silently starting from move 1". (TC-R66;
  #547 item (78) the refusal, #549 item (66) the honoured half)

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
- The summary shows an accuracy figure per side and the verdict counts for the TEN grades (Brilliant, Great, Best,
  Excellent, Good, Book, Inaccuracy, Miss, Mistake, Blunder, in that order) for White and Black in two columns. (TC-R04)
  Amended 2026-10-27: this bullet read "Excellent is folded into Best" and named eight grades until today; #421 split Excellent out after Kunal raised it against chess.com.
- On a game also reviewed on chess.com, each player's accuracy is within chess.com's own noise band and not systematically
  higher, and each grade label means what chess.com's label of the same name means: over the eight one-sitting answer-key
  games the accuracy ordering agrees, Brilliant is equal and Book within 1 per side, accuracy MAE is at most 5.7 with the mean
  signed error within 3.0, and no move is Great where both the best and the second line are already decided (both above 90%
  or both below 10% winning chances). NOT MET at #549 and measured, not asserted by the suite (#549 item (34),
  jobs/reconcile-kevitsch-review-vs-chesscom). (TC-R167, TC-R168)
- The Skills panel (data-ct rev-skills, #368) is present under the accuracy table with its nine counted rows,
  and a number with moves behind it is a button that jumps into the review at that ply. (TC-R05)
- The footer (Back to games, Start review; data-ct rev-summary-foot, #334) is pinned inside the viewport at
  both phone geometries and the body scrolls under it. (TC-R04)
- No summary text is painted under the status bar, and the summary's own menu button (rev-summary-menu) is never
  painted over summary text at any scroll position: it sits in a row of its own that does not scroll. (TC-R79,
  TC-R111; #549, jobs/review-summary-runs-under-the-status-bar-2026-09-22)
- The Coach's take never calls a game of mine clean when moves of mine from it went into Practice your mistakes: where no move is
  labelled a mistake or a blunder but some cost enough to be saved, it says both and gives that number, which is the number the drill
  holds from that review; a game with nothing saved still reads 'A clean game'. The tiles below stay on the labels. (TC-R180; #550
  item (57), Kunal's reword-coach of 11 Oct 2026; SHOW FIRST)

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
- The engine line never recommends a move the review itself calls a blunder: it is searched as deep as the review graded
  (depth 16), and until that search finishes it shows the stored evaluation with no move after it. At Opera ply 29 (after
  15.Bxd7+) it reads 15... Qxd7, never 15... Nxd7 (which loses to 16.Qb8+ Nxb8 17.Rd8#), on Review and on the drill's
  'Analyse this position' board (#549, from #548's antagonist B). (TC-R109)
- Switching the engine line on or off from the ⋯ sheet moves nothing on the board: where the board leaves under 20px of the
  screen's height spare (320x568, 375x568, 375x667) the row's 20px is reserved with the line off too, so the board does not rise 10px when it
  appears (#549 item (95)). At 360x640 the reservation would cost the board 14px for good, so it is not made there and the board
  still shrinks 334 to 320 on the toggle - a named remainder, not covered. (TC-R116)

### US-R06 A brilliancy explains what the sacrifice buys, and can be played out
As a player who played (or suffered) a brilliancy, I read what was given up and the forcing line that makes it
work, and I can watch that line on the board.
- On 10.Nxb5!! in the Opera Game the reason names the sacrifice and the forcing continuation ("If cxb5,
  Bxb5+ ...") and the next-best comparison (#357, #365). (TC-R10)
- The "why" / play-out button (rev-playout) exists on Brilliant, Great, Best and Excellent moves and animates
  the line on the board without a console error (#354, #356). (TC-R10)
- The next-best comparison never names the move I actually played as its own alternative. Kunal found the review telling him "Bxh3 was as good on paper, but nothing like as forcing" about the Bxh3 he had just played (#420): whenever the played move is the engine's second choice, the runner-up IS the played move. This holds on every ply of the Opera Game (TC-R10), and on every ply of Kunal's own game 184024052818, where the played move is the runner-up at 19...Bxh3, 24.c4 and 41...Qh3+, at both worker-pool sizes (TC-R10b, added at #545).

- THE LINE RUNS TO MY OWN RECOVERY (#547, item (63), landing #512's work from claude/cool-noether-9p0hf1). Where the
  engine's line has a forcing continuation of the player who moved, the reason shows up to three of its plies and
  ends on that player's own capture, check or mate - never on a quiet move and never on the opponent's reply. On
  13.Rxd7 in the Opera Game it reads "If Nxd7, Bxe7 Bxe7 Bxd7+ ..."; on 10.Nxb5, whose line has no forcing
  continuation of White's own, it stays at one ply. A recovery outside the three plies is not shown and the reason
  falls back to its one ply: the line shown is never wrong, only sometimes shorter. A failed engine search is never
  shown and never remembered as an answer (#389, #511). (Kunal, 2026-10-04: "the line runs one move further so the
  recapture is on screen".) (TC-R10)
- IF THE ENGINE DIES WHILE THAT LINE IS BEING WORKED OUT, I STILL GET IT WITHOUT LEAVING THE MOVE (#549, item (81)). When the
  analysis worker fails under the search for the reason's "If ..." clause, the app asks again on a fresh worker while I stay on
  the ply, so the clause arrives a few seconds late instead of only after I step off and come back. A worker that stops
  answering without reporting an error is not covered. (TC-R115)
- WHAT I HAVE STARTED READING IS NEVER TAKEN BACK (#549, item (102)). The "If ..." clause is worked out after the move is
  shown, so until it arrives the reason stops at its opening clause ("You give up a piece.", "The only move that keeps it.")
  and the rest is then added after it; nothing already on screen is deleted or moved. Before this, at 37...Rf7 in Kunal's own
  game the reason read "... Nothing else came close: Kh6 was 1.7 pawns worse." and that clause vanished a second later. The
  settled reason and the size of its box are unchanged: the comparison still gives way to the "If ..." clause only when both
  do not fit. (TC-R117)

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
- The clause is checked over its whole class, not over the three cards above: the clickable controls in the Home
  layer are enumerated off the running screen on a fresh store and on an earned one (which trades NEW HERE for the
  streak card and turns Daily 3 into "Continue"), the set must equal the declared roster, every control declared
  as opening a screen must take Home down and land where it named, and every control that opens a sheet must leave
  Home up. (TC-HM-051a, TC-HM-051b, TC-HM-051c, TC-HM-051d)

Not in scope for this clause: whether the NEW HERE card should exist, what it should say, or which lesson it
should choose. It picks the first `openings`/`gambits` entry and that is unchanged.

## Home, Lesson and Play lane stories, imported #549 from the gate headers that quote them

DATED AMENDMENT, 2026-11-06, #549 item (69) (jobs/spec-docs-frozen-at-373). The Home section above says it "does not
transcribe" US-HM-01 … US-HM-10. That stood until the orchestrator's ruling of 2026-11-05T02:43:05Z on Kunal's
word (decisions/the-orchestrators-calls-on-the-jobs-batch-8-left-out-for-them-2026-11-04): "Re-point the gates'
quotes to existing story ids where they match, and import only the stories that have none." Measured before
this edit, `gates/verify-log.sh --citations` arm (8) read 30 of 94 US- ids quoted under gates/regress/ defined
nowhere here. Three of the 30 matched a story this repo already holds and the gate's quote was re-pointed, not
imported: the id quoted in `45-play-setup.js` as "R28" is the project-space id of US-RF28 (claude/stories/REVIEW-SUITE-FULL.md,
"take a position into a real game"); the "R30" in `66-winprob-ladder.js`'s header is the grading ladder, which
TC-R40, the case that gate prints, already files under US-R03; and the "INV-05b" in `58-review-rating-source.js`
names a clause of US-INV-05 (TC-INV-05a/05b), not a story. The other 27 have no story here, so they are
imported below.

WHAT THESE LINES ARE, SAID PLAINLY. Each is the one-line summary the gate's own header gives for that id,
copied word for word. The lane documents that hold the full stories (the Home and Lesson lanes' of 2026-09-15 and the Play
lane's of 2026-09-14, which each gate header names) are NOT in this repository, so the gate header is the
only text of these stories a build session can read. Where a fuller lane text later reaches this repo it
amends the line with a dated note; it does not replace it. US-HM-01 is imported too, because until now it was
"defined" here only by a sentence that happens to open with it. Numbers in these lines (92, 75, 61, 44,
2600ms, 3300ms, 84x84, 88px) are the gate's pins as written there, measured on the builds that header names,
and are owned by the gate, not by this file.

US-HM-01  the Home overlay is a fixed, self-scrolling layer whose column is min(vw-36, 420) wide, and NOTHING escapes it sideways at any width. (gates/regress/49-home.js)
US-HM-02  the card set and its ORDER on a fresh store - intro, Daily 3, NEW HERE, tiles, coach line, look row, dev row, build stamp - asserted as an exact signature, so a card that appears or disappears is a red line rather than a silent change of screen. (49-home.js)
US-HM-03  four tiles, their labels, their subtitles, their 84x84 icon boxes and their #366 ink scales, measured BEFORE any tap. (49-home.js)
US-HM-04  every tile is reachable and hit-testable, including the bottom row at 320x568 where it is 88px below the fold at rest. (49-home.js)
US-HM-05  each tile opens ITS screen and Home comes down with it. (49-home.js; US-HM-11 extends it to every card)
US-HM-06  the ☰ and the 👋 open the menu sheet and the account sheet OVER Home, without dismounting it. (49-home.js)
US-HM-07  the streak card: it is absent on a fresh store, present once anything is earned, and its three chips and goal bar read the stored numbers. (49-home.js)
US-HM-08  the Daily 3 card: three dots, ticked from ct_daily3, and "Continue: <lesson>" from ct_lastlesson. (49-home.js)
US-HM-09  the coach line is one row of three spans and it changes to the at-risk wording when the streak is at risk. (49-home.js)
US-HM-10  the foot of the column - the look row, the dev row and the build stamp - is reachable. (49-home.js)

US-LS-01  the demo board is a PINNED size per geometry and its top is 92 at every geometry. (gates/regress/48-lesson-flow.js)
US-LS-02  nothing scrolls on either axis, in demo or practice. (48-lesson-flow.js)
US-LS-03  the note box is EXACTLY 75 tall on every ply, whatever the note says (#366), and its width is min(98vw, board+44). (48-lesson-flow.js)
US-LS-04  a note too long for three lines gets the "more ▾" badge, and only then; tapping it opens a sheet in which the whole note fits UNCLIPPED; closing it leaves the board where it was. (48-lesson-flow.js)
US-LS-04b how many notes do not fit the box is MEASURED over the whole library (every lesson and variation note, in the painted box's own font and width) and pinned per geometry, so a content edit or a box change that clips more notes is seen; at #550 67 of 2262 at 375x761 and 119 at 320x568. (11-lesson.js TC-LS-058)
US-LS-05  the demo transport: ▶ paused, ⏸ playing, ↻ at the end; Back at ply 0 is a no-op; ten Forwards walk the Italian Game line exactly. (48-lesson-flow.js)
US-LS-06  the fixed footer is 61 tall, pinned to the bottom, and carries five buttons in demo and TWO in practice - and NO laid-out control is hidden underneath it. (48-lesson-flow.js)
US-LS-07  the practice control row is ⟳ 💡 ↻Try-again ⋯, 44 tall, the board's own width, and fits inside a 320 screen with the short label (#384). (48-lesson-flow.js; US-R73 is the later clause on when the row says "Try again")
US-LS-08  hints are on by default and paint EXACTLY the two squares of the book move; 💡 turns them off and on again, and the board does not move either way. (48-lesson-flow.js)
US-LS-09  a wrong move changes nothing on the board and does not advance the progress bar; ↻ Try again puts the lesson back to move 0; a correct move advances it one step and moves the hint on. (48-lesson-flow.js)
US-LS-10  the ⋯ sheet's prev/next row names the neighbouring lessons and disables the end it is at. (48-lesson-flow.js)
US-LS-11  the footer controls are the same size and shape on every board screen: the lesson footer (demo and practice) and the Review transport row are one component - one glyph size, one radius, no outline, a 44px floor - so they cannot drift apart again (#549 item (80), jobs/lesson-footer-icons-consistent). (11-lesson.js)
US-LS-12  a lesson left mid-practice - closed with X, or left for Home and re-reached through Discover - re-opens where it was left, in practice on the same move and note, for the rest of the sitting; a finished or never-started practice opens at the demo as before (#549 item (107), flags/amber-549-lesson-resume). (11-lesson.js)
US-LS-13  every move of every lesson line and every variation line is legal in its own position, replayed with the app's own move code - a lesson never stops at a move that does not exist (#550; jobs/lessons-teach-the-finish-not-the-method-2026-09-24 work item 4). (95-lesson-lines-legal.js TC-LS-059)
US-LS-14  the 'Line learned' toast after a practice line shows over the centre of the board for its three seconds, the way a game result does, and closes by itself (#550 answer a11, Kunal's card on build__1794388896663-q11; jobs/explanation-boxes-must-not-time-out-2026-09-24). (105-bank-toast-over-the-board.js TC-LS-060)
US-LS-15  in the Medieval skin the four Discover tiles draw their own painted shields on banner cloth (Kunal's pick, medieval-b); the Classic and Playful skins keep today's icons (#550 answer a22, jobs/discover-tile-icons-should-match-each-theme-2026-11-11). (108-medieval-discover-icons.js TC-LS-061)

The Play header numbers its ten lines 1 to 10 under the heading "US-PL-01 … US-PL-10"; line n is US-PL-0n, which
is how the gate's own comments use them (TC-PL-009 under US-PL-04, TC-PL-012 under US-PL-06). US-PL-02 and
US-PL-03 are quoted by no gate and are imported with the rest so the series has no hole.

US-PL-01  the board is a PINNED size per geometry in a live game, and nothing scrolls on either axis. (gates/regress/46-play.js)
US-PL-02  the two player bars are the board's width and carry the ⌂ and ☰ chrome. (46-play.js; US-PL-22 later moved that chrome to a top row of its own on a phone)
US-PL-03  the control row is exactly Moves Back Forward Hint Flip More, 51 tall, fully inside the viewport. (46-play.js)
US-PL-04  Moves toggles the list's VISIBILITY and the board does not move (the #373 rule). (46-play.js)
US-PL-05  Back/Forward step the painted position; Forward is dead at the live head, Back at move 0. (46-play.js)
US-PL-06  a board tap while previewing returns to live and plays NO move. (46-play.js)
US-PL-07  Hint paints exactly two squares and clears on the next move, without moving the board. (46-play.js)
US-PL-08  Flip turns the board and swaps the bars, without moving the board. (46-play.js)
US-PL-09  a clock counts down the side to move only, and not before the first move. (46-play.js)
US-PL-10  at game over the row becomes Moves Back Forward Review Rematch More, the result card shows, fades at 2600ms and UNMOUNTS at 3300ms - there is no "8s fade" - Resign leaves the sheet, and the board is the same PINNED size it was mid-game. (46-play.js; US-PL-11 to US-PL-14 are the later game-over clauses)

## Online - the New Game sheet's Online branch · registered #545 from gates/regress/25-online-clocks.js (jobs/online-cases-are-executed-but-unregistered-2026-09-28)

WHERE THESE CAME FROM, SO NOBODY READS THEM AS NEW REQUIREMENTS. Gate 25 asserted these cases from #400 onward,
citing requirement ids R-OC-1 to R-OC-7 that lived only in its own header. Until #545 there was no `US-OC` clause
and no `TC-OC` row in this register, although TC-SUITE-251 already cited US-OC-01. The two stories below restate
what the gate header says R-OC-1, R-OC-2 and R-OC-3 require. Nothing new is decided here. R-OC-4 to R-OC-7 are
about a LIVE online game (sign-in, Firestore, a two-context harness nobody has written). They get NO story here,
because no case can execute them, and the gate header names them as NOT COVERED.


### US-HM-12 The Discover tiles fill the screen they are on

Kunal's answer on questions/B8-DISCOVER ('tiles', 4 Nov 2026): the four Discover tiles grow into the space the screen gives them
rather than leaving most of it empty (jobs/bench-discover-is-57-per-cent-empty-2026-09-30).

- The band between the last row of tiles and the tab bar is at most 60px at 320x568, 375x730 and 375x812, because the extra height
  went into the tiles and their icons, and no tile runs under the tab bar. (TC-HM-DISC)

### US-HM-13 The coach can be the owl

Kunal's answer on questions/B8B-OWL ('new', 4 Nov 2026): the owl coach drawing approved on 14 September ships as a fifth coach look
(jobs/ship-the-owl-coach-drawing-approved-14-sept-2026-10-10).

- The Coach look picker offers five looks, Owl among them, every one a drawing inside its own button and inside the screen's width,
  and tapping Owl chooses it. (TC-MN-049)
- Each of the five looks draws its own picture at one and the same size, and the look I pick is the one I find again after a reload.
  (TC-MN-050)
- On a small phone, his own and a wide one (320x568, 375x679, 390x844) the five looks all sit inside the sheet, none overlaps
  another, no name is cut, each is at least 40 by 40 to tap, and none sits alone on a second row. (TC-MN-053)

### US-HM-14 Whether the app treats me as new is decided by what I have done in it, not by a score I have earned

#549, item (22) of batch 9 (jobs/new-user-first-lesson-journey-2026-09-27, findings C and D and its folded job
the-new-here-card-now-never-clears-for-a-drill-only-player-2026-10-02), taken on default and recorded as
flags/amber-549-new-here-retires and flags/amber-549-new-here-promise. US-HM-11 covers the NEW HERE card landing on its
lesson and leaves what the card says, and when it shows, out of scope. This clause covers those two.

- Once I have watched the walkthrough to its end, banked a lesson day, or have a saved mistakes or brilliancies drill, Home
  stops showing me the NEW HERE card, even with no puzzle XP and no learned drill line, so it never says "Start here" beside
  Daily 3's "Continue" for the same lesson. (TC-HM-054, TC-HM-055)
- Merely opening the lesson is not using it: if I tap NEW HERE and come straight back to Home, the card is still there, and
  still there after a reload (#549 item (22), antagonist A2-R1). (TC-HM-055, TC-HM-056)
- The card promises only what the journey delivers: a clean practice run banks a day, and the card says that, not "a win".
  (TC-HM-055)

### US-HM-15 Each skin has its own icons
*Added #550 item (68), jobs/playful-and-classic-skins-show-the-same-icon-2026-11-11 (Kunal, 11 Nov 2026: "Why do playful and classic have the same Icon ... We used to have different ones.").*
As a player choosing a skin, each skin looks like itself: no two skins share their Home tile icons, and each skin's row in the menu leads with its own icons, so Playful and Classic can be told apart at a glance. Classic's are its own pre-#366 emoji (📖 🧩 📈 👑), still all four emoji as Kunal chose at #366. (TC-HM-057)

### US-HM-16 I can find a lesson in a long list without scrolling through all of it
*Added #550 item (77), jobs/bench-97-lesson-list-is-5934px-of-scroll-with-no-filter-and-no-position-marker-2026-10-06 (Kunal, 8 Oct 2026, on counts and a filter for these lists: "Yes, same rule everywhere"; orchestratorRuling_2026_11_07).*
As a player who knows the opening I came for, I type part of its name or its idea into one filter box under the list's header and see only the lessons that match, on either side, and each section says how many it holds.
- On the Openings, Gambits and Endgames lists, at 375x761 and 320x568, a filter box 44px tall sits under the group header; typing a part of a lesson's name or idea (accents ignored, so 'reti' finds Réti) leaves exactly the lessons whose name or idea contains it, and a text no lesson contains says so and offers to clear the filter. (TC-S08a, TC-S08b)
- Every section of those lists shows its count, and the count equals the rows under it, filtered or not. (TC-S08c)

### US-HM-17 A player is never offered a test switch that turns Pro on for free
*Added #550, from docs/app-audit-2026-11-11 AUD-H14 (P1) and Kunal's answer a1 on questions/B10-Q1 (11 Nov 2026): "Hide it from players".*
As a player opening the Account sheet, I see the real ways to get Pro and nothing that turns it on without paying; a developer can still opt in on their own device.
- Signed out on a player's store, the Account sheet opened from Home shows its Pro plans and no "Unlock Pro (test mode)"; on a store opted in as a developer (ct_protest=1) the same sheet offers it. (TC-HM-058a, TC-HM-058b)

### US-HM-18 A locked skin tells me why it opened the Account sheet
*Added #550, AUD-H05 of docs/app-audit-2026-11-11 (P2).*
As a player who is not Pro, when I tap the Style button or a locked skin, the Account sheet that opens says that Playful and Medieval are Pro skins, naming the one I tapped, so it does not read as a wrong turn.
- The Home Style button opens it with "Playful and Medieval are Pro skins. Upgrade to use them." (TC-HM-059a)
- A locked skin in the menu opens it naming that skin, "Playful is a Pro skin." (TC-HM-059b)

### US-OC-01 When I set up an online game I can choose any clock, and the sheet shows exactly one choice
- All eight live time controls can be chosen for an Online game, not only the day-per-move limits (R-OC-1).
- The correspondence row's three day limits can still be chosen (adding live clocks costs nothing that already worked).
- The live row and the day-limit row each have their own heading, and the two headings differ.
- EXACTLY ONE pill reads as selected, never two and never none (R-OC-1's other half).
- The "Live ticking clocks for online are still coming" notice is gone, because it stopped being true (R-OC-3).
- No pill is painted past the right edge of the screen. The sheet, not the document, scrolls to pay for the extra
  pills, and its action button can be reached by a finger (TC-OC-006e, registered under US-INV-05).

### US-OC-02 The clock I picked survives a switch to Online, and a day limit does not survive a switch away
- A live clock chosen under Computer is still the one chosen after I pick Online (R-OC-2).
- A day-per-move limit, which means nothing offline, is dropped when I switch from Online to Computer. The app's
  own summary line under Start stops advertising it, and exactly one pill stays selected.

## Cross-app invariants - specced 2026-09-15 by Kunal · invariants 2 and 3 executed #423 (26-invariants.js)

Every clause here is a RELATIONSHIP rather than a value, and that is the whole point of the section. Every other
assertion in this suite pins a number on one element (how many there are is the newest gate log's footer, not a number
typed here - this sentence said 1961, #422's figure, inside a section executed against #423); a property that ought to hold across the app had
no home in it, which is why no test found the inconsistent Review icons and why Kunal found them by hand. Flag
`build-the-invariant-gate` carries his commission and the reasoning.

### US-INV-01 Every control I can tap is big enough to tap
As a player using the app on my phone, every button is at least 44x44, because that is the size a finger needs.
- REPORTED, NOT ASSERTED as of #423. Measured on 8cd81ec across twelve screens and three geometries: 90
  distinct visible controls are under 44x44, against the six the commission named by hand. Part of that gap is
  population rather than defect (tappable move-strip tokens, grade-table cells, divs that are headers), so it is
  not pinned until the population is settled - a pin table over an unsettled population freezes the population
  into the suite. `jobs/invariant-1-tap-targets` owns it; the gate prints the list every run.
- ASSERTED SINCE #545, as a pin and not as a pass. The population is settled: move-strip tokens and the summary
  table's count cells are tappable but are not buttons in the sense of this clause, and are excluded by name. The
  rev-sheet category rows are counted as real tap targets, and so are pinned. Every other undersized control is pinned
  to its measured size, so a NEW undersized control, or one that changes size, goes red. The pinned controls still
  break this clause, and fixing each one is product work that retires its pin. (TC-INV-01b)

### US-INV-02 The icons in a row are all one size
As a player looking at a row of controls, the icons in it are the same size as each other, because a row of
mismatched glyphs looks broken whatever each individual size is.
- In any container whose direct children include two or more controls laid out side by side, every glyph box is
  the same height within 1px. Measured as 11-lesson.js measures a glyph: the SVG box where there is an SVG,
  otherwise a Range over the control's own contents. (TC-INV-02a)
- Six rows fail this today and each is pinned to its measured heights per geometry, so the suite is green now
  and goes red the day any of them moves in EITHER direction, a fix included. (TC-INV-02b)
- A RULE ABOUT THE SUITE, NOT A PROPERTY OF THE APP, split out of the bullet above at #549 item (77)
  (jobs/five-of-ten-423-spec-items-are-not-singular-2026-09-27): a pin is retired on purpose, in a commit that
  says why, rather than decaying into a permanent excuse. No gate can assert intent; what the suite asserts is
  the mechanism that forces it - a pin that moves is red (TC-INV-02b) and a pin that vanishes is red
  (TC-INV-02c) - so the only route to a green after a fix is editing the pin.
- The pinned failures must be found in exactly the states they were measured in: one that disappears is red,
  and one that appears on a new screen is red. (TC-INV-02c)

### US-INV-03 The app uses a short, deliberate set of icon sizes
As a player, the app looks like one app, because its icons come from a small set of sizes rather than from
whatever each screen happened to use.
- The commission's "at most four" is a PLACEHOLDER. Measured at #423: 11 distinct icon glyph heights at
  375x730 and 375x568, 12 at 320x568, 13 across the union. The measured set is pinned per geometry as a DRIFT
  GUARD, not a target - nothing here claims the current set is right, only that it cannot change without
  someone noticing. (TC-INV-03)
- When that set changes, the red names WHICH height appeared and which vanished, not merely that the set
  differs: the TC-INV-03 failure carries `added` and `gone` lists beside `want` and `got`. Split out of the
  bullet above at #549 item (77). (TC-INV-03)
- Which sizes survive is Kunal's choice, not a gate's: collapsing 11 into 4 moves ink on six screens.
  `jobs/invariant-3-icon-size-target-set` carries the measured list to him.
- AMENDED 2026-10-29 (#545, jobs/spec-clauses-record-a-measurement-not-a-pass-condition-2026-09-27), THE CONDITION A TEST
  DECIDES, which the bullets above describe without stating. At every width the invariant sweep covers (320 and 375),
  the set of distinct icon glyph heights equals the set pinned for that width in gates/regress/26-invariants.js
  (ICON_PIN). A height that appears is red, and a height that vanishes is red. A target set below the drift guard
  waits on Kunal's choice. The counts quoted above are #423's and are kept as the history of the pin; the pin
  itself is the current value. (TC-INV-03)
- AMENDED 2026-11-06 (#549 item (74), jobs/invariant-2-and-3-sheets-and-unswept-screens, part (3)), THE GUARD COVERS THE STATES
  THE WALK DOES NOT. The same condition holds over a second, named list of states the invariant walk does not stand on - the
  Play setup sheet, the first-lesson screen NEW HERE opens, the feedback sheet, the menu sheet at its top and its bottom, the
  Look picker, and the puzzle roadmap - against its own pinned set per width (ICON_PIN_EXTRA). An svg counts as an icon only
  when its box is at most 48 x 48, so an illustration is not an icon size. (TC-INV-03b)

### US-INV-04 Nothing on screen is cut without saying so
- 4a. No text's ink extends outside the box that clips it, at every screen and geometry in the invariant sweep, unless the cut is EXCUSED. TC-INV-04a names five excusals as EXAMPLES and, since #545 item (68), points at the gate for the set instead of claiming 'only' those five: a text-overflow ellipsis on the clipping box, a -webkit-line-clamp whose own arithmetic accounts for the cut, a finger-scrollable clipping ancestor, the 38x38 king-glyph case, and the pinned rev-best-ply30 residual. THE GATE'S OWN SET IS WIDER AND IS DELIBERATELY NOT REPRODUCED HERE, because a copy of it in this file is a copy that rots: read the classifier and clipper() of gates/regress/26-invariants.js before writing any assertion from this clause. One instance so the gap is not abstract: a cut the gate classifies OVERSHOOT - its box had no layout overflow on that axis - is excused and is on nobody's list of five. Corrected at #541 after four antagonist passes: the five-case wording this replaced was inherited verbatim from TC-INV-04a and is still in that row, and the first repair's own enumeration of the gate's skips was withdrawn for naming a GUARDED one - the rotated-ancestor skip is asserted to be zero at 26-invariants.js:1468, so it reddens the gate rather than hiding anything. (TC-INV-04a)
- 4b. No text's ink is painted outside its own box, onto a sibling. (TC-INV-04b) Amended 2026-10-27: until today this story's only body was "Shipped #404 and #413; see 26-invariants.js invariants 4a and 4b", with no criterion of its own; both criteria are read from that gate's own header and are executed there. 4b is narrower than this one sentence: the gate measures the inline axis only and skips a wrapping holder, a holder that clips its own text, and any spill of 1px or less, which is why the sentence is a clause and not a specification - read the gate. The sentence that stood here until #541's second repair said 4a's excusal list was "the gate's own five"; that is withdrawn [R18], it contradicted 4a one line above, and it was the half that licensed the understated assertion.
- 4c. **An ellipsis says a cut happened; it does not make a name readable.** A name I have to read to know what I am looking at is never cut short, with an ellipsis or without one. That is the rule on jobs/labels-truncate-in-shared-rows-2026-09-24. What the suite enforces today is narrower: an ellipsed text paints at least half of itself (READ_MIN 0.5, chosen at #545 and not yet agreed), unless it is a pinned known defect. Added at #545 from jobs/signalled-truncation-passes-as-green-2026-09-27, which found Kunal's own label truncations sitting under PASS 19 times in the #422 log. (TC-INV-04c) Since #549 item (100) four surfaces are held to the whole sentence, not the half-painted floor, each measured against the LONGEST real value in its content set rather than the fixture's: the lesson name (its own line above the moves panel, not a cell between the footer's controls), the More sheet's previous and next lesson buttons, Home's Daily 3 'Continue:' label, and the Review games list's opponent line and the line under it, which wrap. (TC-R152, TC-R153)

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
- No control's box extends past the VIEWPORT's right edge at any geometry in THE LESSON THREE (see THE
  GEOMETRY SETS, NAMED ONCE, above; this clause said "any supported geometry" until 2026-10-03 and that phrase
  named two different sets), because
  `document.documentElement.scrollWidth` equals the viewport there, so nothing scrolls it back. CLAUDE.md calls
  this the one unrecoverable kind of overflow. (TC-INV-05c)
- And in a LIVE GAME nothing at all sits past the right edge where no scroller can bring it back. The check asks the painted boxes, not a scroll range. Measured at #545: a player bar 60px wider than the board moved neither documentElement's scrollWidth (html and body are overflow:hidden) nor #root's (an overflow:hidden box inside it clips the spill). So the only reading that sees the spill is gate 35's painted-box predicate. The clause above rests on `document.documentElement.scrollWidth` in the same way and is NOT re-checked here: that is TC-INV-05c's own measurement to redo. (TC-INV-05g)
- Where a row genuinely cannot hold its content, the residual is PINNED at its own measured value per geometry and
  printed every run, never excused - and a pin is retired by a deliberate edit when it is fixed, not left to decay
  into a permanent exception. At #424 that is the lesson demo row at viewport height 520, where the board is 192px
  and the row is short by nearly twice everything Kunal's three-rung shrink ladder can free. (TC-INV-05d)
- And where a control starts below the fold of the landscape side column, the '▾ More below' chip that says so sits
  at the BOTTOM of that column, inside its clip, and one tap on it brings the control on screen. Measured at #549 on
  the landscape puzzle screen at 730x375: the chip painted at the TOP of the rail (30-55) while the Prev/Next pair sat
  clipped below it at 329.5. Whether the pair should fit at rest is a layout decision this clause does not take
  (jobs/landscape-puzzle-prev-next-unnamed-and-under-the-tab-bar-2026-11-03). (TC-PZ-LAND2)
- With the phone sideways on Puzzles, the tabs are a slim rail on the right edge, the board fills the height, and Roadmap, Hint,
  Show move, Reset, Prev and Next are all on screen with nothing to scroll (#550 answer a8, Option A). (TC-PZ-LAND3)

### US-INV-06 No screen that does not scroll leaves an empty band over 60px
On a screen that does not scroll, no empty vertical band is over 60px. This is certified at 375x761 with the real insets (51 top, 31 bottom), and the top 51px status area does not count. Other heights are reported, not asserted. A screen meets it by growing the board or by moving something useful into the gap, not by adding padding.

Kunal adopted this rule on 11 Oct 2026, on Decision Desk card empty-space-limit-per-screen-2026-10-10 ("Yes, adopt the 60px rule"). It was written at #545 for jobs/empty-band-cases-and-clause-at-375x761-report-only-first-2026-10-12.

- THIS CLAUSE NAMES ITS OWN GEOMETRY. 375x761 is in neither THE DRILL SEVEN nor THE LESSON THREE; both list 375x730. The section that names those sets says 375x730 is the gates' column and 375x761 the device (#549, item (110)); this clause names 375x761 itself.
- EVERY CASE IS REPORT-ONLY TODAY. TC-S04 covers nine states across Discover, Puzzles and the Review move screen. TC-S05 covers Discover, and since #549 is asserted at 375x761 with the real insets. TC-S06 covers the Review move screen, and the drill when it is driven. The measurement is gates/regress/77-empty-bands.js.
- PROMOTION. A state becomes asserted in the same commit as the fix that brings it to 60px or under, or on a re-measure that finds it already there.
- OWNERS. The Review move screen is owned by jobs/eval-graph-into-the-band. Puzzles right after a solve is owned by jobs/puzzle-screen-celebration-overlaps-and-dead-space-2026-09-24. Discover goes to its own Desk card first and then its own build. The drill is owned by jobs/board-jumps-on-drill-verdict, then jobs/drill-empty-bands-at-375x761-once-the-float-has-landed-2026-10-12. The Puzzles rankup state has no owner.

### US-INV-07 On arrival, the action a screen exists for is on screen
As a player arriving at a screen, I can see the button that screen is for without scrolling, because a primary action
below the fold reads as missing.

WRITTEN AT #545 for jobs/bench-inner-scrollers-invisible-to-the-overflow-rule-2026-09-28, the clause that job proposed.
gates/lib.js's over() cannot see inside an inner scroller, so this clause had no instrument until L.innerScrollers() and
gate 78.

- On the Play setup sheet, "▶ Start game" is on screen on arrival, unscrolled, at every geometry of THE DRILL SEVEN.
  NOT MET TODAY at six of the seven. The distances are pinned (TC-INV-08b), not passed. The fix is the options-row build
  Kunal chose on 11 Oct 2026 (questions/play-setup-start-game-on-screen-2026-10-10), and that build retires the pins,
  applying the job's acceptance A to C (320x568 with real insets passes on "reachable by scroll").
- Below the fold is not unreachable: the button can always be scrolled into view and tapped (TC-INV-08c).
- On Discover -> Tactics, both tabs, the board is the thing the screen is for: at rest its bottom sits at or above the fixed
  tab bar's top at 375x761 and every geometry of THE DRILL SEVEN, as on Lessons and Puzzles (Kunal's default (5) on
  questions/B8-SMALL-DEFAULTS, 4 Nov 2026). The board shrinks to the room above the bar, never below 176px. That holds on
  EVERY card, not only the first, and the board is ONE size on every card of a tab: it never changes size or jumps as the
  player steps from card to card (a longer motif idea scrolls inside its two-line box). (TC-INV-08d, TC-INV-08e,
  TC-INV-08k; #549, jobs/tactics-landing-overflows-104px-and-sits-under-the-tab-bar-2026-09-28)
- And (#550 answer a26, AUD-L01 Option A, docs/mockup-l01-tactics-2026-11-11) nothing on that page scrolls: one bar at the top holds
  back, the two tabs and the menu, the page's own buttons (Hint, Show answer, Next motif; Prev and Next) end above the tab bar on every
  card, with the answer showing too, and the answer text scrolls inside its own box under the board. (TC-INV-08l, TC-INV-08m)
- On Puzzles (the roadmap, fresh store) "▶ Start training", and on Review's import box "⚡ Analyze Game", are above the
  fold on arrival - the fold being the fixed tab bar's top - at 375x761 (Kunal's phone) and every geometry of THE DRILL SEVEN (TC-INV-08f to 08h).
  Q2 settled by the orchestrator's ruling of 4 Nov 2026 (decisions/the-orchestrators-calls-on-the-jobs-batch-8-left-out-for-them-2026-11-04).
  MET with no stored games, and (#550 answer a12, Option A) MET with stored games: the paste row sits above Import, so
  "⚡ Analyze Game" is on screen at every geometry (TC-INV-08i, its REV_PIN retired). Before a12 it sat under the game list,
  28.5 to 373.5px below the fold. Reachable by scroll either way (TC-INV-08j).
- NOT COVERED YET: Home's primary action, which no ruling names.
- On Home, all four tiles are on screen without scrolling on his phone (375x761); at 320x568 two sit below the fold at a
  pinned distance (#550 AUD-H01, answer a18, the compact Home). (TC-INV-08n)

### US-INV-08 A check that passes was able to fail on the build it was guarding against

Written at #548 from the parked lane record of jobs/an-assertion-keyed-to-a-selector-its-own-build-adds-cannot-control-2026-09-29
(Kunal's 'move-close' on questions/B8-LANE-JOBS). The lane reserved US-INV-07 and TC-INV-08a..c; both were taken on main by the
drill-setup invariant before the rows were written, so this story and its cases carry the next free ids instead.

- When a build adds an attribute to the app and, in the same build, writes an assertion that reads it, that assertion has never
  been run against a bundle where the thing it looks for is absent - so a green from it is a statement about the fix and not about
  the defect. (TC-INV-11a)
- I can ask, mechanically and with no browser, how many assertions are in that position, and the tool's own controls prove it
  reports what it should and declines what it should. (TC-INV-11b)
- A selector the app never emits as a literal is named rather than counted as coverage. (TC-INV-11c)
### US-INV-09 The app paints my whole screen, down to the home bar
As Kunal opening the app from its Home Screen icon, every page is painted to the bottom edge of my screen, with no plain strip
under the last row or under the tab bar, and the tab bar rests on the home bar rather than above it.

Written at #550 for jobs/a-51-point-strip-at-the-bottom-of-every-page-is-never-painted-on-kunals-phone-2026-11-11, from his report
of 11 Nov 2026 ("a blank space that we are not using ... in almost every page of the app").

- When the installed app is handed a page shorter than its screen by exactly the status bar (375x761 on his 375x812 phone), the
  app's shell, every full-screen layer and the tab bar take the screen's height, not the page's. (TC-INV-14a, TC-INV-14b,
  TC-INV-14c, TC-INV-14d)
- The home-bar inset is counted once: the tab bar's own inset padding sits at the screen's bottom edge, with nothing under it.
  (TC-INV-14d)
- Nothing changes anywhere that signature does not hold: a Safari tab, a page short by something else, or a page that already
  equals its screen. (TC-INV-14e)
- Whether iOS then paints those 51pt is his phone's to say: gallery card SCR, after the landing.
### US-R12 The drill board stays still when the app answers me
> **NOT TRUE ON main AS OF #500, AND THIS CLAUSE IS THE TARGET RATHER THAN THE RECORD.** The board still jumps:
> measured at #500 on bundle c37f70f2e989, at 375x730 it goes 339 -> 291 when the red verdict lands and
> 339 -> 265 on the hint. #500 built a fix that removes it (gates/pending/50-drill-verdict-no-jump.js, 98 pass /
> 0 fail against 84/14 on main) and stood down because the same change made the SOLVED state unreadable. The
> remainder is jobs/500-the-drill-reserve-is-measured-and-held-on-an-unreadable-solved-overlay-2026-10-08 and
> the refused tree is on gates/held-trees.tsv. Do not read the bullets below as shipped behaviour.
As a player practising my own mistakes or my own brilliancies, when the app tells me my move was not the one - or
gives me a hint, or tells me I found it - the board does not move or change size, so my eye stays on the position.
- **And when I find the move, nothing that celebrates it may cover, move or replace the text that tells me what I did, and nothing that explains it may disappear on a timer** - the same clause US-R17 carries for puzzles, added at #545 from jobs/suite-never-asserts-after-a-success-2026-09-27. (TC-DR-01, NOT YET EXECUTED: see that row.)
- Kunal reported this twice by hand: 2026-09-20 "Board jumps when the message in red comes up. Thought all of this
  had been tested already." and 2026-09-23 "the chess board just jumped again, I thought we had fixed it across the
  board." Both reports are this clause. (TC-R15)
- The verdict box reserves a CONSISTENT height that does not change between states, so the board's top edge, left
  edge and width are unchanged to within 0.6px when the red ✗ line appears and when the 💡 hint appears, at
  320x568, 360x640, 375x667, 375x730, 390x844, 414x896 and 440x956. (TC-R15)
- The red ✗ line is fully readable without scrolling at every one of those geometries: the box holds at least one
  full line of its own type, and the ✗ message fits inside it. (TC-R15)
- A message longer than the reserve is REACHED BY SCROLLING rather than lost: the box is a real scroller, not a
  silent clip, and scrolling it to the bottom paints the end of the message. This is Kunal's own ruling of
  2026-10-04 on this box - "Don't change the size just allow the player to scroll through the text" - and it is
  what makes a consistent height affordable. (TC-R15)
- Once the attempt is GRADED the goal card above the box has no job, so it yields its space to the explanation and
  the box expands over it, which is Kunal's own answer of 2026-09-22 for this screen. The total reserved height is
  identical in both states, so this costs the board nothing beyond the reserve itself. (TC-R15)
- NOT YET TRUE, and this clause does not claim it: on a SOLVE the board still shifts a few px, because the
  Hint/Show/Reset row collapses at the same moment (pz-bottom 104 -> 52). Measured at #500 as +4 / -4.5 / +5.5
  against +66 / +78 / +74 before the fix. That residual is a different cause and is carried by
  jobs/drill-solved-board-jumps-bottom-row-collapse.


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
- The hint shown before I solve VARIES WITH THE POSITION. (TC-R16 B5a, B10 - B10 asserts the N hints are all
  distinct and all real, which is the weaker proxy the gate's own note at :201 concedes it to be.)
- And the hint never tells me to look for a forcing move in a quiet position. A position is QUIET when its better
  move is not a check, a capture or a promotion (Kunal, Desk questions/B9-QUIET, 5 Nov 2026). (TC-R16 B5c, with its
  predicate held by TC-R16 B5c-PREDICATE; TC-R16 B5b still asserts the hint is not the fixed generic string. B5c bites
  only on a captured card whose better move is quiet, and gate 51's reference game captures none - e7b4 is a check
  and e6d7 a capture - so on that fixture the gate prints that B5c DID NOT RUN, never a PASS. A fixture with a quiet
  card is the remaining gate-side work, jobs/clauses-cite-assertions-that-do-not-assert-them-2026-09-28.)
- The whole explanation fits the verdict box HORIZONTALLY at every geometry in THE DRILL SEVEN, 320x568 through
  440x956 (see THE GEOMETRY SETS, NAMED ONCE, above). (TC-R16 B6 - verdict `scrollWidth <= clientWidth`)
- And the box does not grow to make it fit: the reserved parent's `scrollHeight` stays inside its `clientHeight`,
  the 74px cap. (TC-R16 B7)
- And the box's bottom stays on screen. (TC-R16 B8)
- And the board does not move while the explanation lands: its top, left and width each stay within 0.6px from
  just before the solving move to after the verdict renders, at every geometry in THE DRILL SEVEN. (TC-R16 B11b,
  with TC-R16 B11a asserting the before/after pair was really measured. Asserted from #549 item (113); until then
  it was asserted by nothing. Measured at #549 on HEAD 37f44ea: 0,0,0 at all 14 states, which #547's float is why.)
  (jobs/clauses-cite-assertions-that-do-not-assert-them-2026-09-28)
- **AND IT MUST BE RIGHT ON THE ENGINE BRANCH THE DEVICE CHOOSES, NOT ONLY ON THE ONE THE FIXTURE GETS.**
  Every clause above is a promise about a sentence, and the sentence is built from the review's engine output, so
  a clause satisfied on one branch is not satisfied on the other - and the player, not the test, is on the branch
  his phone chose. The two branches and the four fields that differ between them are stated once in THE ENGINE
  BRANCH, NAMED ONCE, at the head of this section; this clause does not restate them. A run that cannot say which
  branch produced its capture has not met this clause. (TC-R16 A0e in `51-drill-explain-why.js`, which asserts the
  capture came from the pooled Stockfish branch - located by its assertion id, not by a line number.)
  **WHAT A0e DOES AND DOES NOT GIVE US, because the difference is the whole clause.** A0e LABELS the branch; it
  does not assert the sentence is correct on the fallback branch, and the gate's own header says why it cannot:
  the fallback is reachable only by a worker that fails to ready, which no `ct_*` can arrange, so the branch is
  INSTRUMENTED rather than driven. The consequence to hold on to is that a GREEN gate 51 on a tree where A0e is
  RED is a green on uncovered code. MEASURED, and this is why the clause is written as a requirement rather than
  a note: on #473 (f3ae36a) at 375x730 with `engine='fallback'`, the drill told a BLACK player whose Mistake lost
  the game that it 'left you slightly better' - TC-R16 A8 red, `bands=['slightly better']` - which is the
  sentence class the #426 veto was raised over, live on the branch the device may choose. **NOT YET MEASURED ON
  THE COVERED BRANCH**: whether that same sentence ships on `sf` is unknown, because no run on a tree where A0e
  is green has been recorded. That run is the job's own next step and it needs a machine where Stockfish readies;
  this clause does not pre-judge it.
  **ONE NOTE ON CITATIONS, KEPT BECAUSE IT IS A MEASUREMENT AND NOT A STYLE POINT.** `gates/verify-log.sh
  --citations` arm (4) is a ratchet on line-number citations in `claude/stories/*.md`. MEASURED in one clone by
  stash and pop at main 97393a6: this clause's first draft took the count from 44 of a ceiling of 48 to 47 -
  three quarters of the remaining headroom for one clause - and all three resolved (0 dead, 0 past end of file),
  so the numbers were right and the instrument was still wrong, because a line number in a story file is the
  thing that goes stale. This job's own `3965` is the proof: true at #473, false by #490. So the line citations
  were replaced by quoted expressions, which grep finds wherever the code moves, and the only one left in this
  section is the single `chess.jsx` line in the named block above. The arm counts OCCURRENCES and not distinct
  targets - naming one citation twice counts twice - which is the right design for a ratchet and the wrong thing
  to be surprised by.

**NOT YET A CLAUSE, moved out of the acceptance list on 2026-10-03.** *Where the engine data does not support a
shape, the sentence says less rather than guessing: a plausible wrong explanation is worse than a short true one,
and the motif named is the BETTER move's own, never the one I played.* This was written as an acceptance bullet at
#426 and cited no case id - its only parenthesis was "(#426; Q1 in the lane record is still open with Kunal)". A
clause whose citation is an open question is not a pass condition, so it sits here, named and unenforced, until
Q1 is answered and a case id is allocated for it in `claude/stories/TEST-CASES.md`. It is NOT deleted: the
requirement is wanted. (jobs/clauses-cite-assertions-that-do-not-assert-them-2026-09-28)

### US-R16 A game I am in the middle of is not thrown away when I look at something else
As a player who taps the house mid-game to check the Daily 3 or a lesson, I can get back to the game I was
playing, and nothing takes it away from me without asking.
- Leaving the Play screen by the house (⌂) does not end the game: the position, the move list and whose turn
  it is are all still there when I come back. (TC-R19 E1)
- The screen I come back through SAYS a game is in progress and OFFERS me the way back into it. The app already
  does exactly this on the other side of the product - leaving a review and reselecting Review offers
  '‹ Back to your analysis' (TC-R24) - so this is the same rule applied to Play. (TC-R19 A, B, C)
- 'Start game' over a game I have not finished either keeps that game or asks me first, the way Resign asks me
  first (#375). One tap must not be able to destroy a game I am winning. (TC-R19 D)
- A difference the player cannot read is not a way back: a sheet that merely LOOKS different over a live game,
  with no control that offers the game and no words that name it, does not satisfy this story. (TC-R19 A vs B/C;
  this clause exists because negative control NC2 passes A alone.)
- **AND THE RULE IS ABOUT EVERY CONTROL THAT REPLACES THE GAME, NOT ABOUT ONE BUTTON. (TC-R45, added #471.)**
  Wherever I can reach it - the More sheet's 'New game', any Game-setup choice in the hamburger menu (who I am
  playing, the clock, my colour), or a lesson's 'Play this position vs Computer' - a control that would replace
  the game I am in: (5a) asks me first (TC-R45a); (5b) asks in the SAME WORDS at every such control, "Tap again to
  discard your game" (Kunal's B9C-CONFIRM-WORDS answer 'same-words', 10 Nov 2026), with a Game-setup choice I tapped
  still turning amber so I can see which one the second tap must be (TC-R45b); and (5c) the thing I must tap twice
  is the same thing both times (TC-R45c). SPLIT AT #550 item (75) [jobs/us-r16-clause-5-bundles-three-claims-under-one-
  case-2026-10-06]: the clause used to carry all three under the one id TC-R45, so a fix satisfying (5a) with four
  different wordings read as satisfying the clause.
  A game that has just FINISHED counts: it is still mine to review, and Review is only offered from the result
  screen, so discarding it discards the only route to it. AND A POSITION I HAVE LOADED BUT NOT YET MOVED IN
  COUNTS - one I sent over from a review, opened from a lesson, or PHOTOGRAPHED off a real board. It has no
  moves in it, so anything counting moves thinks there is nothing there; it is the one kind of game I cannot
  get back by replaying, which makes it the one that most needs asking about. Two things this clause deliberately does NOT ask for: a control that destroys nothing because
  there is no game yet still works on one tap, and Rematch still works on one tap, because the game is over and
  replacing it is what that button is for.
  WHY THE CLAUSE IS WRITTEN AT THE CLASS AND NOT AT THE BUTTON: the bullet above was satisfied by #469, which
  guarded 'Start game' and published the class as "2 found / 1 fixed / 1 left". One grep found at least eleven,
  two of them measured discarding a live game at 3 plies -> 0. A clause written about one control is a clause a
  fix to one control can close.
- **AND THE SCREEN MUST NOT OFFER ME A GAME THAT IS ALREADY GONE. (TC-R46, added #474.)**
  The way back into my game, and any warning about discarding it, are only honest if the game is still there.
  When something else has already replaced the board - a lesson I opened, a puzzle I started - the way back is
  not offered at all, and nothing warns me about discarding a game I no longer have. Measured on the shipped
  #473 build at 375x730: three moves into Pass & Play, then a lesson and back, the sheet read 'Resume your
  game in progress (2 moves played)' while the move row behind it was ALREADY EMPTY, and tapping the row gave
  me the starting position. A promise the app cannot keep is worse than the silence it replaced, because I act
  on it.
  WHY THIS CLAUSE IS ABOUT ONE QUANTITY AND NOT ABOUT ONE DOOR: the row was computed from `playHist` and the
  board from `game`, two different pieces of state, so they could disagree on screen nine pixels apart. A
  clause written door-by-door would need re-auditing every build, and the count below is the proof of that
  rather than a figure to rely on. What this story asks is that the screen read THE BOARD - the thing I can
  actually see.

  THE CENSUS THIS CLAUSE USED TO CARRY IS WITHDRAWN, AND NOT REPLACED [R18]. This register published "17 of
  this app's 21" and `chess.jsx` published "SIXTEEN of this file's 21"; #477 measured both wrong, published
  "17 of 22" in their place, and withdrew that too when both of its antagonists independently broke it. The
  figure has now been wrong three times in four builds, and the diagnosis is not carelessness.

  **NO INTEGER IS THE ANSWER, BECAUSE "REPLACES THE BOARD WITHOUT SETTING `playHist`" IS NOT A PROPERTY OF A
  CALL SITE.** `doMove` (`chess.jsx:4327-4453`) is one function body holding **seven** `setGame` sites
  against **one** `setPlayHist`, and the fallthrough commit two lines below that guard is reached with mode
  `learn` in demo and with analyze and `anaMode` off - paths on which the guard never fires. So one site
  both pairs and does not pair, depending on a mode the question does not fix. Scoped per statement the
  answer is 18; per enclosing function, which is what "in the same handler" literally says, 11; per
  reachable path, 18; and over only the sites that REPLACE the board rather than ADVANCE it by a ply - which
  is this clause's own wording - 11 of 14. Each is defensible, each is a different sentence, and a reader
  told to trust the command over the figure gets a different number from the one printed beside it.

  SO THE CLAUSE RESTS ON THE INVARIANT AND THE MECHANISM, WHICH NEED NO NUMBER: the row and the board were
  two pieces of state that could disagree, and the fix is that the screen reads THE BOARD. `chess.jsx`'s own
  comment gave the right reason not to make a census load-bearing - "it would rot as the app grows" - and
  then three builds proved it by rotting. The useful fact for a future reader is the mechanism, not the
  tally: **#475 added a board-replacing site (`loadExternalSolved`, `15bb881`) that sets no `playHist`, and
  nothing in this project noticed**, which is exactly why a door-by-door clause would need re-auditing every
  build and this one does not.

NOTE ON THE ID [#469]. US-R16 was reserved by the test-authoring lane on 2026-09-28, when the highest story
ON MAIN was US-R13; main has since reached US-R33, and US-R16 is still free there, so the reservation was
honoured rather than renumbered. `claude/stories/SUITE-AUDIT-2026-09-14.md` uses the id US-R16 for
something else entirely (the mate move line, against its own TC-R13). That is the two-id-space collision
this project already records as item 5 of the test-lane queue, not a duplicate introduced here: that file
is a frozen 2026-09-14 audit in the claude.ai project's id space, and no sentence of the form "US-R16
passed" is safe across the two until it is unwound. Said here so the next reader does not resolve it the
wrong way.

### US-R17 Once I solve a puzzle I can read the whole explanation
As a player who has just solved a puzzle, I can read the explanation of what I found in full, without any of it
being cut off, and the board does not move underneath me while I read it.
- **When I get something right, nothing that celebrates it may cover, move or replace the text that tells me what I did, and nothing that explains something may disappear on a timer.** Added at #545 from jobs/suite-never-asserts-after-a-success-2026-09-27, which measured that the suite took no assertion after a success - where four of Kunal's thirteen findings live. (TC-PZ-01 for the solved card; TC-PZ-02 for the RANK UP overlay on the 10th Novice solve.)
- **And before the RANK UP, nothing on the Puzzles screens names me by the rank it is about to award:** the roadmap heading and the puzzle header chip name the TIER and my progress into it ('Novice puzzles · 0 of 10', '🌱 Novice 0/10'), so 'you reached Novice' at the 10th solve is news (Kunal, questions/B8B-RANK-UP, wording; jobs/pz-rank-up-announces-a-rank-the-screen-already-showed-2026-09-28). (TC-PZ-TIER for the roadmap heading; TC-PZ-CHIP for the header chip.)
- The explanation WRAPS onto as many lines as it needs rather than being ellipsed on one line: on a phone the
  box holding it is not `white-space: nowrap` and not `text-overflow: ellipsis`. (TC-R20 B, C)
- Every character of the explanation is actually painted inside the box on screen. Not "the box is tall enough",
  which is true of the broken build at every geometry: the characters themselves are counted, and a character
  hidden behind an inner scroller counts as lost. (TC-R20 E - the only clause no partial fix satisfies)
- Nothing hides the rest of it in a scroller I cannot see: the reserved box's own scrollHeight is inside its
  clientHeight, so there is never more sentence below the fold of a 74px box on a tall phone. (TC-R20 D)
- The BOARD DOES NOT MOVE when the verdict appears. (TC-R20 A "board top and width unchanged across the solve",
  A2 "board width equals the value measured on #427 per geometry" - and NC2 is the naive fix that moves the board
  15px at 375x730 and 56.5px at 390x844)
- And nothing is pushed off the bottom of the screen. (TC-R20 F, `L.over() <= 0`)
- **And the room for it comes FROM THE GOAL CARD, which has done its job by the time I have solved the puzzle.
  THIS CLAUSE IS ASSERTED BY NOTHING TODAY.** Split out of the bullet above on 2026-10-03 because it was the LEAD
  claim of a three-claim bullet and the only one no cited assertion reads: TC-R20 A, A2 and F cannot tell room
  taken from the goal card from room taken from the board's container or from the verdict's own font, so a build
  that finds the space the wrong way goes green against the clause written to stop it. What would decide it, and
  it costs no new run time because it rides the 14 states TC-R20 already drives (7 geometries x 2 verdict
  lengths): across the solve, the goal card's own height DECREASES by at least the reserved verdict parent's
  height increase, within 1px - and it must go red on NC2 (reserved height removed, md5 94a389d21fb6), which
  #427 already built, so the negative control exists. That is a TC-R20 amendment and a gate line, both outside
  this file. (jobs/two-of-us-r17s-clauses-are-decided-by-something-other-than-what-they-say-2026-09-29)
- **IF the goal card is still present**, its goal line fits in full: giving its space away must not truncate it
  instead. (TC-R20 H.) Stated as the conditional it actually is, 2026-10-03. It read "the goal card ends up
  either gone or still showing its goal in full", and TC-R20 H is "the goal card is absent OR its goal-line has
  `scrollWidth <= clientWidth+1` and fits its own height" - a disjunction BOTH fix routes satisfy, so a build
  that DELETES the goal card outright passed at every geometry and so did one that kept it intact. Whether the
  goal card goes or stays is Kunal's decision and is not settled here; writing the clause as a conditional means
  deleting the card is a SPEC CHANGE rather than a silent pass. The `OR` comes out of TC-R20 H once the route is
  chosen - that half is in `claude/stories/TEST-CASES.md`, not here.
  (jobs/two-of-us-r17s-clauses-are-decided-by-something-other-than-what-they-say-2026-09-29)

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
- And what the sentence says ABOUT the rating is true of the rating it shows: where a rating is shown, the
  sentence names the game's PGN as its source and calls no rating an estimate, however it is worded or ordered;
  and the sentence is never simply missing. (#545 item (79): the half the veto proved is the same requirement.
  TC-R21e's 21e-SOURCE and 21e-NONEMPTY lines.)
- Where only ONE side carries a rating header, that side shows its rating and the other invents nothing.
  (TC-R21f)
- The sentence under the panel describes exactly what is on the panel: it speaks of ONE rating when one side is
  rated (and says the game records none for the other player), of the ratings when both are, and of no rating when
  neither is. Before #549 item (94) it was chosen from one boolean and said "The ratings are" over a single number.
  (TC-R21g)
- With several games pasted at once, the rating shown is the analysed game's own: the first game's, because that is
  the game the review loads. Before #549 item (94) the header scan was last-write-wins over the whole paste, so the
  summary printed game 2's rating over game 1's accuracy. What the app does with games 2..n otherwise is not
  settled here. (TC-R56)

NOTE ON THE ID: this clause was handed over as US-R17 by test-authoring at 21:24Z and renumbered here, because
build #428 landed US-R17 (the puzzle explanation) at 22:53Z, 89 minutes later. The handover's id reasoning was
sound when written; it expired before it was applied.

### US-R34 Choosing an opponent on the New Game screen does not play a move in the game I am already in
As a player who is mid-game and opens the New Game screen to look at my options, nothing I touch there changes
the game behind it. The New Game screen is where I DECIDE; the game only changes when I say Start.
- Tapping an opponent tile (Online / Computer / Pass & Play) while a game is in progress plays NO move in that
  game. MEASURED on the build this clause was written against: a Pass & Play game of 1.f3 e5 2.g4, then the
  Computer tile and nothing else, moved the game from 3 plies to 4 and the move the engine played was Qh4# -
  checkmate. The player chose an opponent and lost the game they were playing. (TC-R44 A4)
- Nor does it score that game against anything. The same tap over a FINISHED Pass & Play game moved the
  computer's adaptive strength from 800 to 750 - a game the computer was never in - and said nothing, because
  the message that announces a strength change is painted behind the sheet. (TC-R44 B5)
- '▶ Resume your game in progress' gives me back the game I LEFT, not the game with whatever I tapped on the
  way past. If I tap Computer and then Resume, I am in my Pass & Play game again, with my opponent, my colour
  and my clock. (TC-R44 A6, A7)
- AND THIS CLAUSE EXISTS BECAUSE THE OBVIOUS FIX SATISFIES EVERY CLAUSE ABOVE AND STILL FAILS THIS STORY:
  blocking the move only WHILE the New Game screen is up hands it straight back on the Resume tap. Negative
  control NC2 of 69-setup-sheet-live-game.js is that build; it is green on clause 1 and red here. A guard that
  moves the moment to a different tap has not kept the game. (TC-R44 A6b vs A4a)
- The rule is about the DECISION, not about one tile: nothing on the New Game screen may act on the live game
  before Start. Clauses 1 and 2 are the two effects that were measured doing it; the story is the class.
- What this story does NOT say, named rather than left silent: it does not say the clock behind the screen must
  pause, and it does not say Start must stop asking. '▶ Start game' still arms over a live game (US-R16), and
  starting a new game still discards the old one once the player has confirmed - that is what Start is for.

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

US-R25  The Review list offers every game the connected account has, bounded only by a limit the app STATES ON SCREEN, and the number of games it can show NEVER depends on which month it is. A player who has not played this month still sees their history. (Kunal, 2026-09-23: "Why are there only 47 games in review. There should be thousands." A cap is correct here - the public API serves one month per request, rows carry full PGNs, localStorage is about 5MB for the whole app - so the clause names BOTH halves: state the limit, and do not let the calendar set it.) Checkable: with 300 games in the months before this one and none in this one, the list is non-empty and holds rows dated outside this month; the stated limit is readable on the list; and what was fetched is still there after a reload.  #432 AND THE LIMIT IT STATES MUST BE THE LIMIT THAT ACTUALLY BOUND, which is the half of this clause #431 satisfied only by accident. There are TWO bounds in the code (ACCT_GMAX games, ACCT_GMONTHS months) and #431 printed the games one unconditionally, so a player with a THIN BUT LONG history - a few games a month for years, the ordinary shape - read "Showing up to 200 games per account." on a list that 6 months had stopped at 30 of their 120, with 90 unreachable by any interaction. "Bounded only by a limit the app STATES" is then false: it was bounded by one the app did not state. Also checkable: with 5 games in each of 24 months the list holds 30 rows and the screen names the SIX-MONTH window and does NOT name a games cap; and with 3 months of 5 nothing bounds the list, so NO limit sentence is on screen at all. And the clause binds ON THE LAUNCH AFTER AN UPGRADE, not only after a fetch: an account imported by an earlier build records no bound, so the app states the games cap when that account sits AT the cap (which is inferable) and states nothing when it sits below it (which is not) - it never names a limit it cannot know bound. #433 AND THE UNITS OF THAT LIMIT MUST BE UNITS THE APP POSSESSES. ACCT_GMONTHS bounds ARCHIVE INDEX ENTRIES and api.chess.com's index lists only the months in which the player HAS games, so "your last 6 months" is a CALENDAR claim the code never computes: antagonist B measured 8 entries spread over 28 calendar months - 4.7x - under that sentence, on rows whose dates carry no year to contradict it. The clause is not satisfied by a limit stated in the wrong unit any more than by the wrong limit. Also checkable: with archive entries at 2023-11, 2024-01, 2024-06, 2025-02, 2025-09, 2026-03, 2026-08 and 2026-09 the screen states a bound in MONTHS OF PLAY and makes no calendar claim smaller than the span of the games it is showing. AND A MONTH THE APP ASKED FOR AND DID NOT GET IS PART OF THE BOUND: if a month request fails mid-walk the games are missing, so the screen says so - rendering nothing there claims the whole history is present, which is the same defect as an unstated cap. Checkable: with three months of 5 games and the middle month answering 503, 10 rows are shown and the screen states that some months could not be loaded. AND A LIMIT THE APP CANNOT KNOW BOUND IS STILL NOT ONE IT MAY CLAIM, WHICH #433's OWN FIRST ATTEMPT BROKE: a store with no recorded bound was written by a build whose cap was one of the two this app has ever shipped, so it is evidence of a cut only when it sits exactly at one of them - a store of 137 rows is not a 137-game cap. Checkable: with 137 or 41 stored rows and no recorded bound, NO limit is on screen. And where accounts were stopped by different bounds, the cap named is the one that applies to the account with the largest cap, qualified for the older ones - naming the legacy cap of 40 over 70 rows on screen is the same defect as naming a cap that did not bind. And reaching the cap is not being cut by it: with exactly the cap's worth of games and the index exhausted, nothing was cut and no limit is stated. #549 item (31) [Amber: flags/amber-549-merged-list-limit-line], Kunal's merge-big on questions/B8B-MERGED-GAMES (4 Nov 2026): A REFRESH NEVER REMOVES A GAME ALREADY HELD. Fetching an account again MERGES what comes back into what the app holds, so a walk that half-fails, or a thin recent window, cannot shrink the list - and what is held survives a reload. The store holds thousands of games (2,000 per account), so the list can grow past what any one fetch returns. Because a merged list holds games older than any one fetch reaches, the stated limit names WHAT IS HELD: how far back each cut account's games go, by the date of its oldest held game ("Games back to Jun 1, 2024; older ones aren't loaded."), never the last fetch's month window or game cap; the store's own cap is named only for an account that sits at it. Games kept by an earlier version move to the larger storage without loss. And when the device has no room to keep an account, the list shows only what was kept and says which account could not be kept. Checkable: 200 games held, then a refresh with 5 of 6 months answering 503 - 200 or more are still listed after it and after a reload; the same refresh twice holds 200 with none twice; a refresh bringing 30 newer games lists 230; 50 games left in localStorage by an earlier build are all in the new store after one launch, and only then is the old copy removed. #549 item (32): AND A REFRESH ASKS ONLY FOR WHAT IT DOES NOT ALREADY HOLD. Opening Review fetches the account once per launch (not on every visit), and that fetch stops at the newest game already held instead of re-reading every month behind it - unless the list is known to be missing a month, which a full walk can fill. Checkable: with 200 games held and nothing new, the relaunch asks Chess.com for the game index and the newest month only and downloads less than half of a first fetch; with 10 games in a new month it asks for that month and the newest held month only, lists 210, and the stated limit reads as before; leaving Review and coming back asks for nothing. #549 item (78) [Amber: flags/amber-549-review-load-older-games]: AND EVERY GAME THE ACCOUNT HAS CAN BE REACHED, by an explicit tap and never by the calendar. Every fetch starts at the newest month, so the list could never reach further back than the first one did; at the end of the list a 'Load older games' control walks back from the oldest held game by one more fetch's worth and merges what it brings, and it is offered only while an account has older games the app does not hold and the store has room for them - so it disappears when the history is exhausted (and the limit line with it) or at the store's cap (which the line then names). And the list RENDERS ONE PAGE (200, one fetch's worth) with a control below it that says how many more it shows and how many are not shown, so a large store does not slow the screen; the count above the list still names every held game. Checkable: with 675 games over 15 listed months, 200 are held after the first fetch, each tap adds only games older than any held, and three taps hold all 675 with no control and no limit line left; with 2250 games the taps stop at the stated cap of 2,000 with the control gone; a launch with 2000 held shows 200 rows and 'Show 200 more games · 1,800 not shown'; a Lichess account pages back the same way. #549 (antagonist A round 5, A2-R5) AND WHAT IS HELD IS NEVER LOST TO A FAILURE THAT IS NOT ABOUT ROOM: only a storage-full (quota) failure may drop an account to make room, and the line then names it; any other failed write (a transient UnknownError, a lost connection) deletes nothing and does not claim there was no room. Checkable: with an older account held and one or two non-quota write failures on a refresh, the older account's games are all still held afterwards (TC-R143). (A3-R5) AND A STORE THAT COULD NOT BE READ IS NEVER SHOWN AS AN EMPTY ONE: on a launch where the saved games cannot be read the screen says so and that nothing was deleted, and an account removed on such a launch stays removed once the store reads again (TC-R144). #549 item (103), jobs/follow-a-player-not-reimport-2026-09-23 (Kunal, 23 Sep 2026: "I'd like to see his brilliant moves without actually having to keep importing them"): AN ACCOUNT ONCE IMPORTED IS FOLLOWED, NOT RE-IMPORTED. Besides the account in the username box, each launch refreshes at most ONE other stored account, the one fetched least recently, and only when its last fetch or try is more than a day old - so a watched player's new games arrive without being typed in again, and chess.com is asked politely. That refresh is quiet: it shows no progress or error, and a failure removes nothing. Checkable: three followed accounts last fetched 2h, 30h and 50h ago - the launch asks for the 50h one only and adds its new games to what it held; the next launch asks for the 30h one; when that one answers 503 no error is on screen and its games stay; the launch after asks for no followed account. #549 item (104), jobs/finished-chesscom-daily-games-come-into-review-by-username-when-each-ends-2026-11-03 (Kunal, 3 Nov 2026, "Both": a teacher and student go over each Chess.com daily game right after it ends): A CHESS.COM GAME COMES INTO REVIEW ONCE IT HAS ENDED AND NEVER WHILE IT IS BEING PLAYED. With a username set, a finished daily game is in the Review list on the first check after it ends, labelled Daily, with no manual import; a game still in progress (no end time, no result for either player, or a PGN Result of "*") is never stored, listed or analysed, and no request goes to chess.com's lists of games in progress - Chess.com's fair-play rules count outside help in a live game as a breach whatever the reason. Declining a game in progress is not a month that could not be loaded. Checkable: a month holding one daily game in progress beside a month of four finished games lists the four and nothing of it, holds nothing of it and states no gap; once it is served ended, the next launch lists it once as Daily beside the four (TC-R154, TC-R155).

### US-R35 In a drill I can go back to a position I have already passed, and it is as I left it
*Added #475, from jobs/drill-needs-a-previous-card-2026-09-23, which Kunal raised TWICE.*
Kunal, 2026-09-23: "I also want the ability to go backwards, not just forward, because sometimes I see a
position and I want to come back to it after four or five additional positions." Again on 2026-09-30: "if I
wanna practice something I've already been to".
- Any drill (Your mistakes and Your brilliant moves alike - they are two entry points over one renderer) offers
  a way back to the card before the current one, not only a way forward. MEASURED ABSENT on the shipped #437
  bundle by sit run 19 at 375x812 and 320x568: the complete button set was `['< Review','HINT','SHOW MOVE',
  'RESET','< Review','Next >']` and a regex for previous|prev|back over every visible button returned EMPTY at
  both geometries. Re-measured on #474 (md5 8b958354102b) by gate 72's negative control: still absent.
  (TC-R47 A1)
- Going back one card moves the counter by exactly one, in both directions, and the counter states the card the
  player is on. (TC-R47 A6, A9, A10a, A11a)
- **RETURNING TO A CARD SHOWS THE STATE IT WAS LEFT IN RATHER THAN ASKING IT AGAIN.** This half is not
  decoration: without it a Prev that re-asks a solved card satisfies the clause above and still throws away the
  work the player went back to look at. (TC-R47 A10b, A10c)
- At the FRONT of the queue the control is present and visibly inert, not absent - a control that disappears
  moves the row underneath the player's finger, and a row that can appear must reserve its space. Tapping it
  there does nothing at all and in particular does NOT leave the drill: Next falling off the END of the queue
  is a completion, so exiting is right there; falling off the front is not an event. (TC-R47 A2a-A2d, A4, A11b)
- The drill keeps EXACTLY ONE control that leaves it. Before #475 there were two, both spelled "< Review" and
  both doing the same thing - one in the header and one bottom-left - which is why this clause costs no board
  height to satisfy: the duplicate became the way back. (TC-R47 A3, A11c)
- The queue does not change length under the player mid-drill. (TC-R47 A11d)

AN ID NOTE, BECAUSE THE JOB CARRIES THE WRONG ONES. jobs/drill-needs-a-previous-card-2026-09-23 names its
clause "US-R27 (NEW)" and its case "TC-R37 (NEW)", written by spec-a__1790630194889 on 2026-09-28. BOTH WERE
ALREADY TAKEN in this register when that was written - US-R27 and TC-R37 are the Lesson MOVES row pair - so a
later run following the job verbatim would have created a second US-R27 and a second TC-R37, which is exactly
the one-id-two-meanings shape R45 exists to catch. #475 allocated US-R35 and TC-R47 instead, both beyond the
highest id in use, and filed the cause rather than only working around it.
- *Added #550 item (54), jobs/the-drill-nav-row-rests-under-the-tab-bar-at-320x568-on-main-2026-10-04:* at rest, with nothing scrolled, every
  button in the drill's bottom area (Hint, Show move, Reset, Prev, Next, and Analyse after a solve) is the thing under its own centre on
  every phone in THE DRILL SEVEN, in both drills: none rests under the tab bar waiting for a scroll. (TC-R181)

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
4. *Split into 4a and 4b on 2026-10-03
   (jobs/us-pl-11-clauses-4-and-6-bundle-two-claims-each-2026-09-30). The two halves are decided by two separate
   assertions in `gates/regress/16-cpu-result-line.js` and a build can satisfy either without the other, so
   "clause 4 passed" was not a statement anyone could make. The NUMBER is kept and the halves are lettered,
   because other documents cite clause numbers in this register and renumbering is not free.*
   - **4a.** Nothing about the transition moves the board. (A7/B7 in `16-cpu-result-line.js` - board geometry
     across the fade, tolerance 0.05px)
   - **4b.** Nothing in the line carrying it is cut without a signal. (A6/B6 in `16-cpu-result-line.js` -
     `nowrap` and `scrollWidth <= clientWidth + 1`. Asserted MORE STRICTLY than written: the gate requires the
     slot not to be cut at all, which satisfies "not cut without a signal" a fortiori. A build that dropped the
     ellipsis while still fitting the width would stay green - the predicate captures `textOverflow` in its
     evidence without asserting on it. Named here and deliberately NOT filed as a job, because no shipped
     behaviour depends on it today.)
5. **It is stated for EVERY opponent.** The adaptive-strength note that only a vs-computer game produces is a
   nicety; it may share the slot but it may never be the reason the outcome goes unstated.
6. *Split into 6a and 6b on 2026-10-03, same job and same shape as clause 4: the presence half and the geometry
   half are decided by different assertion blocks, and clause 7 - added one build later for the board alone - is
   the standing evidence that the geometry half was always a separate requirement. The number is kept and the
   halves are lettered.*
   - **6a. The outcome is stated in EVERY ORIENTATION.** (E1-E6 / F1-F6 - the presence half, and the half Kunal
     would actually notice, because a phone held sideways stating no outcome at all is the defect the clause was
     written for.)
   - **6b. And the board does not pay for it.** (E7/E8 / F7/F8 - board geometry.)

   *(Added #435, from
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
8. **A game nobody can win ends as a draw, and says why - offline and online.** *(Added #549 item (92), from
   jobs/draws-insufficient-material-and-dead-positions: "the game ends in a draw when no mate is possible, offline and
   online".)* Insufficient material (K v K, K and one minor v K, bishops all on one colour; #547) and a dead position -
   kings and pawns only, every pawn blocked by a pawn, no capture on, no en-passant square, neither king able to reach an
   undefended enemy pawn - end a Pass & Play or vs Computer game with a card reading Draw and naming the rule. In an online
   game the player whose move makes it so pushes the draw with that move (endBy material or dead, as stalemate already
   was), and the card heads it Draw and names the rule rather than "Draw agreed". The dead-position rule is SOUND, NOT
   COMPLETE: a position it misses plays on (a dead position with pieces, or a fortress, is not called). Cases TC-PL-065,
   TC-PL-066, TC-PL-067 in `gates/regress/29-draws.js` blocks (H), (I), (J).

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
3b. **AND THE SCREEN GOES ON STATING THE RESULT WHILE I STEP BACK, NOT ONLY OFFERING THE RIGHT CONTROLS.**
   *Added #473, from jobs/play-status-slot-loses-the-result-on-one-back-tap-2026-09-30, the
   uat-internal-challenger's P1. Case TC-PL-037.* The one status line a phone has
   (`[data-ct="play-opening"]`) is where the result lives once the result card has faded — #434 bought that
   slot for the result and #435 made the row render in every play state — and it was keyed to the previewed
   ply exactly as the control row was. MEASURED on the shipped #471 bundle (md5 40c8cdb1bcff) at 375x730,
   375x568 and 320x568, Pass & Play, 1.f3 e5 2.g4 Qh4#, +4.4s so the card has gone: the slot reads
   "Checkmate! · Black wins" and ONE tap on Back empties it, painted result-vocabulary hits 1 → 0. A player
   who has just been mated and taps Back once — the ordinary thing to do after a mate — is on a screen that
   states no result at all, which is #434's own zero-hit state restored on Kunal's geometry.
   **AND THE DISMISSED RESULT CARD MUST NOT COME BACK.** `_resultKey` was ply-keyed too, so Back reset the
   fade timers and Forward restarted them: measured on #471, the card re-opened over the board reading
   "Checkmate!Black wins" on every Back/Forward round trip, for ever. Neither half was in the job; the second
   was found by sweeping the class rather than by driving it.
   **WHY THIS CLAUSE EXISTS SEPARATELY FROM CLAUSE 1.** #437 wrote this story from the CONTROL ROW it had
   measured, and clause 4 names the cause correctly and in full — but the slot was not in view, so the sweep
   that closed the row left the row's own status line behind. Three builds and 2831 green assertions passed
   over it, because every input in the suite reached game over by RESIGNING, and `playEnd` is not ply-keyed,
   so the one arm that could never fail was the only arm anyone drove. A clause is only swept as wide as the
   surfaces its author had on screen.

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
   already answered the question at #390 — `decisions/q-play-flip-gameover` (on the old Agent Metrics artifact 7UnnqXyJ5knRwB4t1qHaiN - not the tracker or the Desk; located at #547, item (177)), choice *"Flip a finished game in
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
   **Its cost is bounded, and on purpose** (#549 item (88), jobs/a-held-gallery-instruction-hides-the-home-dev-row-for-an-unbounded-time-2026-10-01,
   the orchestrator's ruling of 4 Nov 2026): while any instruction is up, Home deliberately hides its dev row
   (Preview and feedback), because build-run 6d keeps that chrome out of a recording. The hide lasts only as long
   as the instruction: a timed one clears on its own single timer (one pending clear at a time, cleared before every
   new instruction, so an earlier card's timer cannot take down a later one), and a held one clears on the bar's
   own Hide or Back, after which the row is back on Home. TC-GL-012.

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

US-P01  **As the closer, when I verify a job someone has marked fixed, I need every case id and story id that job cites to exist in the repository registers, or I cannot check the fix against anything.**  R08 makes every defect job carry a case id and a story clause; an id that resolves to no register line turns a fixed outcome into a claim nobody can check. Added at #545 with its case TC-R17 (jobs/story-and-case-register-frozen-at-380-2026-09-27). The ids are joined from the tracker side by `gates/audit/tracker-cited-ids.sh`, run by hand against an export, and the count of ids that resolve nowhere is a ceiling that may only fall.

US-P02  **As anyone reading a figure this project reports about itself, I need to re-derive it from rows stored beside it, and each row must say the build, the geometry and the concurrency it was read under.**  Two benchmark runs reported +453.0 and +519.6 as one mean and stored no rows, and the disagreement cost six days without settling; once rows were kept, the cause was that each reading depended on how many analyses ran at once (jobs/review-accuracy-and-grade-counts-depend-on-machine-load-2026-10-04). So: (1) a reported mean stores its rows, its N is their count, and the mean equals the mean over exactly those rows; (2) every row carries its build, geometry and concurrency, because a corpus with no concurrency recorded is as unauditable as a mean with no rows. Case TC-SUITE-267. Added #545 (item (53); jobs/tc-r16-a-reported-mean-must-be-re-derivable-from-stored-rows-2026-10-04). NOTE ON THE IDS: that job proposed case id TC-R16 and story US-R09. TC-R16 is already the US-R13 drill case in TEST-CASES.md, and US-R09 is "I get out the way I came in", a navigation story, so neither is used. US-P02 was checked free by grep over claude/stories/.

US-P03  **As anyone asking what has changed for a player lately, I need every build that shipped application code to have a row in the feature ledger, or to be named by a check as owing one.**  prompts/build-run procedure 1a-2026-09-19 requires a moved_NNN row in tracker jobs/feature-inventory-2026-09-15 on every feature state change; it was kept for five builds and then skipped for six (#432 to #437) with nothing noticing (jobs/the-feature-ledger-has-no-row-for-six-consecutive-builds-2026-09-30). NOT A PLAYER-FACING STORY: records. The clause: which builds moved application code is DERIVED from the shipped ref (a build gated and never pushed owes nothing), a build counts as accounted for by a moved, movedNote or movedIn row (a note saying nothing moved is an answer), and a reading that cannot see the whole history (a shallow clone) is NOT CHECKED, never clean. What it does not claim: that git can say what a feature became - that sentence is still the run's to write. Case TC-SUITE-381. Added #549, item (116).

## US-R33

US-R33  **As a player who has just finished reviewing a game, when I ask to play on from a position, I need the app to refuse honestly if that position is already over rather than start me in a game I have already lost.**  The last ply is where every review of a decisive game ENDS, so "Play from here" there is one tap from the most common resting place in the app. Two clauses, and they are separate because they failed separately when measured:

(1) THE ROUTE MUST NOT START A GAME IN A POSITION THAT IS ALREADY OVER, and the screen must say why it will not. Before #466, at the last ply of 1.f3 e5 2.g4 Qh4# the route opened a real game reading "Checkmate! / You lose" with zero plies and Rematch already offered, and the setup sheet's own banner was BYTE-IDENTICAL to a non-terminal ply's — so nothing on screen distinguished "continue this position" from "start a position with no legal move". The refusal has to name the remedy (step back a move), because a refusal with no way forward is a dead end.

(2) A GAME ENDING THAT NOBODY PLAYED MUST NOT MOVE THE COMPUTER'S ADAPTIVE STRENGTH. Before #466 the instant checkmate wrote `ct_elo` down from 800 to 750 and PERSISTED it, so one tap at a finished review permanently made the bot easier. This clause is about what was EARNED, not about move count: a resign or a flag at move zero is a real player action and still counts, because those endings arrive through `playEnd` rather than through the board's own status.

WHAT THIS CLAUSE DOES NOT CLAIM. Clause (2) is currently unreachable from the UI while clause (1) holds, since the only routes that could start an already-over game are the ones clause (1) now refuses. It is kept as an independent guard for any future caller that bypasses the setup sheet, and it is proved live only by a negative control that reverts clause (1) alone. Said here rather than left to be discovered, which is the #449 inert-arm discipline.

NOTE ON THE ID [#466]. US-R33 was checked free by grep over `claude/stories/` and the whole repository before use. It deliberately sits above US-R32 rather than inside the "US-R20..US-R29" block a spec run once reserved, because the note under US-R20 records that that reservation was made against a register which had already moved past parts of it.

## US-R36

### US-R36 I can narrow the Review list to the games I am looking for, and the screen never lets a narrowed answer read as the whole truth

US-R36  **As a player with hundreds of imported games, when I go looking for the games where I played a brilliancy, or blundered, or that belong to one of my accounts, I need to find them without scrolling — and whenever the list is narrowed I need the screen to tell me it is narrowed, so an empty result reads as a filter and never as an empty archive.**  Asked by Kunal on 2026-09-23 and widened by him the same day (`jobs/review-list-filter-and-search-2026-09-23`): *"might be good to add the ability to filter, so if I want to filter for games where I have brilliancies, or if I want to filter for games that I have blunders, or by the usernames, because I was trying to see [peter-patzer's] games and I couldn't find any. It's a little hard to scroll through that list right now."* and *"I can't specifically filter for his right now. I think maybe there should be some filter on the overall review screen."*  The ask became urgent when #431 raised the per-account cap from 40 games to 200: a filter over 40 games is a nicety, a filter over 200 is what makes the screen usable.

Four clauses, separate because they fail separately:

(1) THE LIST CAN BE NARROWED BY WHAT THE PLAYER ACTUALLY ASKED FOR: by grade — a brilliancy, a blunder, a mistake — and by connected account. A player-name box already shipped before #476 and is unchanged by it; this clause is about the filters that did not exist.

(2) WHENEVER THE LIST IS NARROWED THE SCREEN STATES HOW MANY GAMES IT IS SHOWING, as one readout that changes shape rather than a second number beside the first. Before #476 the header read a bare "N loaded" — a count of what was fetched — and it said that over a list the existing name box had already emptied.

(3) AN EMPTY RESULT NAMES THE NARROWING THAT PRODUCED IT AND OFFERS A WAY BACK. This is the clause the report came from: he looked for one account's games, found nothing, and concluded the games were not there. A blank list under an unchanged count cannot be told apart from an empty archive, and the player has no reason to suspect the control they just used.

(4) A GRADE FILTER OVER A PARTLY COMPUTED TALLY STATES ITS OWN COVERAGE. **This clause exists because the obvious implementation of clause (1) reproduces the complaint that opened the job.** The per-game grade tally is not a stored property of a game; it is filled in by a background pass that walks the list one game at a time, 60ms apart, only while the Review screen is open, and pauses while a manual review computes. With 200 games per account that map is incomplete for minutes after a fetch. So a grade filter answers from however far that pass has got, and a filter that stays silent about it tells a player with brilliancies that they have none — the same false negative he reported, arriving this time from the feature built to fix it. The screen must therefore say how many of the games it is choosing from have been graded, and the denominator must be the set the filter is choosing from rather than the whole list, or the sentence is true of a set nobody is looking at.

WHAT THIS CLAUSE DELIBERATELY DOES NOT CLAIM. (a) It says nothing about the grade tally being CORRECT: the tally is a depth-2 estimate (`analyzeGameCounts` with `rankMoves(pos,2)`) and can disagree with the full review a player sees on opening the game, which is why the row already paints an EST tag and why `jobs/games-list-card-whose-game-and-layout` owns the agreement question. Filtering on the estimate is fine; presenting it as the review's own number is a different defect and is not this clause's. (b) It does not claim the coverage line DISAPPEARS as the pass finishes while the player watches — only that it is absent on a fully graded set. The gap between those two is named in `gates/regress/73-review-list-filter.js`'s header rather than left to be discovered. (c) Result and colour filters were drafted at #476 and REMOVED before the push as scope he did not ask for; they are not part of this clause and one commit adds them if he wants them.

(5) A GRADE FILTER NEVER ANSWERS FROM A TALLY GRADED UNDER A RULE THE APP NO LONGER USES. **Added at #503; clause (4)'s sibling, and it fails separately from it.** Clause (4) is about a tally that is INCOMPLETE - the background pass has not reached a game yet. This clause is about one that is COMPLETE AND WRONG: the tally is cached per game in `ct_gamestats` and the pass skips any game that already has one, which is the whole point of the cache until the GRADER changes. `decisions/brilliant-is-not-gated-by-who-is-winning-2026-09-23` is already decided in Kunal's own words - *"even if one is completely losing before or after, that kind of a brilliant move, it should not matter"* - and drops the `evBefore` condition from the brilliant gate; only its exact floor is still owed by `jobs/grading-convergence-index-2026-09-23`. The day that lands, every cached tally keeps serving counts computed under the old rule, and the brilliancy filter tells a player with brilliancies that they have none. That is the same false negative that opened this job, arriving for a third time: once from the missing filter, once from the partly computed tally in clause (4), and once from a stale one here. So a cached tally carries the grading version it was computed under, and one computed under any other version is recomputed rather than served.

(5b) AND A FILTER NEVER PRESENTS A DECAYING ANSWER AS A COMPLETE ONE. Clause (4) already requires a grade filter over a partly computed tally to state its own coverage. That requirement is about a game with NO tally; it must hold equally for a game whose tally exists and is no longer usable, because to the player the two are the same situation - the screen cannot yet answer for that game. Found by measurement, not by reading: with every entry stale at the real 200-game cap, the blunder filter answered "26 of 200" and decayed monotonically through 27 distinct counts to "0 of 200" over 23.9 seconds while the coverage line stayed ABSENT at all 57 samples, ending on the flat "No games match blunders." - the exact claim clause (3) and its case forbid while games are unanswered. One quantity feeds the coverage line and all three empty-state sentences, so the clause is satisfied by counting a game as unanswered when it has no USABLE tally rather than no tally at all.

WHAT THIS CLAUSE DELIBERATELY DOES NOT CLAIM. **(a) IT DOES NOT CLAIM THAT NOTHING IS STALE TODAY, AND THE FIRST VERSION OF THIS PARAGRAPH DID - WRONGLY [R18].** That version said every tally on a phone was written under the rule still in force, "because no grading change has shipped yet". FOUR HAVE, all on origin/main, each confirmed with `git merge-base --is-ancestor` and by reading its diff: `c30b7a9` (#440, `classify` re-banded onto `winDrop`, 2026-09-30), `8f4cb19` (#449, `brilliantGate`'s sacrifice credit), `996a4b4` (#491, `mateLadder` added inside `analyzeGameCounts`), `b84595e` (#494, `brilliantGate`'s ceiling). `ct_gamestats` has been written since #310, so the pre-#503 estimate population IS genuinely stale, and this build does not clear it. The stamp is kept at version 1 so that nothing is re-graded without a decision, and the decision is Kunal's because the price is real and measured: a full re-grade of 200 entries takes 23.9 seconds, during which the filter's answer moves. Routed as `jobs/bump-grade-ver-to-clear-the-four-shipped-grading-changes-2026-10-09`. What this build delivers is the mechanism, which must exist before the grading change Kunal has already ruled on can ship at all. **(b) It does NOT claim a stale REVIEWED tally is refreshed promptly.** The background pass can only produce a depth-2 estimate, so refreshing a reviewed game would replace better data with worse and flip the row's badge from `gstat-rev` to `gstat-est`; a reviewed tally is therefore left for the next full review of that game, which re-stamps it through the same writer. The consequence was measured and is stated rather than implied: three games with identical PGNs, cached as review+stale, estimate+stale and review+unstamped, paint "1 blunder", "0 blunders" and "1 blunder" on ONE screen after the pass, so the filter is not a function of the game. That is a named residual on the job, not a property this clause claims. **THE FIRST VERSION ALSO JUSTIFIED (a) WITH A HARM THAT CANNOT HAPPEN**, saying invalidation "would drop every REVIEWED game back to an estimate" - which the `src:'review'` exemption in (b) makes impossible, measured on a version-2 bundle where reviewed entries are skipped and no badge flips. Both halves of that justification were wrong and both are withdrawn here.

CASE: TC-R48 (clauses 1-4) and TC-R61 (clauses 5 and 5b), gate `gates/regress/73-review-list-filter.js`.

(6) THE CONTROLS IN THE FILTER HEADER RESERVE THEIR SPACE, SO NOTHING UNDER THEM MOVES WHEN ONE APPEARS. **Added at #507.** CLAUDE.md's standing rule is that a row which can appear must reserve its space, and this header has TWO controls that can appear: the Clear chip, which arrives the moment any filter goes on, and clause (4)'s coverage line, which arrives when a grade filter is on over a set with unanswered games. Both were conditionally rendered, so both moved the list underneath them.

THE TWO FAIL DIFFERENTLY AND THE SECOND IS THE WORSE ONE, which is why this clause names both rather than only the Clear chip. MEASURED on main's own bundle `ebb88c8f76f7` and on `6683fe5db924` with ONE probe across three geometries, so the two readings are comparable (`6683fe5db924` is a SUPERSEDED #507 bundle and is named here because it is what the probe ran on; the bundle that SHIPS is `28f1ff838440` over source `83610da7d7c0`, and these px figures are unaffected because neither later rebuild touched the chip row [#508, R18]): turning on a grade chip makes the Clear chip appear and the chip row wrap from 2 lines to 3, growing **94px to 144px at 320x568 ONLY** - at 375x730 and 375x761 it is 94px and 2 lines in BOTH states and does not move one pixel. The coverage line, by contrast, costs **34px at EVERY geometry including Kunal's own**, and its jump is the UNCOMMANDED one: `_ungr` decays to zero as clause (4)'s background pass walks the list, so the line vanishes on its own seconds after the player stopped touching anything, and the list jumps up under a finger already reaching for a row. #503 measured that decay running through 27 distinct counts over 23.9 seconds.

WHAT THIS CLAUSE REQUIRES. A control that can appear in this header occupies its space whenever the state that can summon it is live, and only its INK is conditional. The Clear chip is therefore always in the layout and is painted only when there is something to clear; the coverage line holds its box for as long as a grade filter is on and drops only its text. A reserved box must also be genuinely INERT - out of the tap path, out of the accessibility tree and out of the tab order - because a box the player cannot see but can press would clear a filter with no visible cause, which is a worse defect than the jump it replaces.

WHAT THIS CLAUSE DELIBERATELY DOES NOT CLAIM. **(a) It does not claim the reserve is free, and the cost is stated rather than implied.** At 320x568 the unfiltered chip row is now 144px where it was 94px, so 50px of a 568-tall screen is held for a control a player who never filters never sees. That is the trade CLAUDE.md's rule prescribes and it is a real cost on the shortest screen; it buys a list that does not move under the finger that is filtering it. **THE SENTENCE THAT FOLLOWED IS WITHDRAWN AS FALSE [#508, R18].** It read: *"At 375 the reserve costs nothing and buys nothing, because the row never wrapped there - so for Kunal's own phone this half of the clause is a no-op and clause (6)'s value to him is entirely in the coverage line."* BOTH HALVES ARE FALSE, AND THEY ARE FALSE AT KUNAL'S OWN GEOMETRY. The account chips share this row, so the NUMBER OF CONNECTED ACCOUNTS moves the wrap boundary exactly as the viewport width does, and #507's figure was taken at one account count. **MEASURED at #508 over three geometries x two account counts, on the shipped bundle `28f1ff838440` and on a one-change control (`00add5c76697`, the Clear chip returned to its conditional render):** with FOUR connected accounts at **375x730 and 375x761** the control grows the row 94px/2 lines -> 144px/3 lines on the tap - a **50px jump, the same 50px the 320x568 reading describes** - while the shipped bundle holds 144px/3 lines in both states. So at 375 the reserve **costs 50px at rest and buys a 50px jump removed at four accounts**.

**AND THE PRICE TAG THIS BUILD FIRST PUT ON THAT IS ITSELF WITHDRAWN, ON AN UPHELD ANTAGONIST FINDING, BEFORE IT REACHED ANYONE [#508, R18].** The withdrawn sentence read: *"it is 6.8% of his 730-tall viewport, spent permanently and also spent by a player who never filters … the boundary between those two counts is NOT measured - three accounts was not driven and no claim is made about it … the trade is Kunal's to settle, so it is routed to the Desk."* The error is not arithmetic — 50/730 is 6.849% — it is **that the figure is taken at an account count Kunal is not recorded as having, while the one he is was explicitly skipped.** `FEEDBACK-INBOX.md`'s #431 entry records his 47 games as played **across three accounts**. **MEASURED at three accounts at 375x730 and 375x761, on the shipping bundle AND on the no-reserve control: 94px / 2 lines at rest, jump 0, on both.** So at his own account count **the reserve costs nothing and buys nothing**, and #507's sentence that this clause set out to withdraw is TRUE there. That is CLAUDE.md's #375 rule — *a gate must exercise the configuration the USER has, not the one the fix was written for* — turned on this build's own framing.

**THE ACCURATE STATEMENT, and the variable is not the one this build first named.** What crosses the wrap boundary is the **total width of the chips**, not the account count; the count is only a proxy for it. Measured at 375x730 the relation is **not monotonic** in the count — 94px/2 lines at one, two and three accounts, 144px/3 at four — and an antagonist measured a four-account state with short labels (`al`, `be`, `ga`, `de`) that is 94px/2 lines, where the reserve costs nothing. The reserve does cost 50px at **one** account (94 against 44), which is the only count measured where that 50px costs a visible game row.

**SO NO DESK QUESTION IS RAISED FOR THIS AND THAT IS THE CORRECTION THAT MATTERS.** The trade as first framed would have spent Kunal's attention pricing a cost he does not currently pay. The measurements live on `jobs/review-list-filter-and-search-2026-09-23` for whoever next touches this row [R20/R32].

**WHAT IS A DEFECT RATHER THAN A TRADE, AND IS FILED:** at four accounts at 375x730 the painted Clear chip's box runs 688.9–732.9 against a fixed bottom tab bar starting at 674 on a 730 viewport, so the control is wholly covered or off-screen at the resting scroll position, `elementFromPoint` at its own centre returns the Home tab, and a real finger tap there does not clear the filter. Measured at one, two and three accounts the same tap works. It is **pre-existing on main** and not caused by this clause; the filter stays clearable by re-tapping a grade chip, which sits well above the bar. **(b) It does not claim every jump on this screen is gone.** The coverage sentence's own box is sized by its own text, and clause (3)'s narrowed wording is longer than the unnarrowed one, so at 320x568 toggling an account chip still moves that box 34px to 50px - a 16px residual, down from 34px, measured and named on the job rather than left for someone to find. **(c) It says nothing about the empty state's position.** A closer screen read the empty state's Clear button as sitting below the fold at scroll origin and proposed moving it; that was measured and WITHDRAWN as a false defect at #507 - the band from the filter row the player has just tapped to the bottom of that button is 291.6px against a 730 viewport and 341.6px against 568, so it fits every geometry, and the reading came from measuring at a scroll origin the player is never at. CLAUDE.md records two false P0s in one night from exactly that confusion and one of them was this screen.

(5) [#549 item (27)] THE FIRST GAME ON THE LIST IS ON SCREEN WHEN I ARRIVE, TALLIES AND ALL, on his phone (375x761) and on the shorter 375x679 column. A tallied row (EST badge, brilliant line, grade counts) is 124px, so what yields the height is the YOUR PROGRESS panel: by his answer on questions/B9-TALLIED-ROW ("collapse") it is one line at the top that opens in place on tap, showing the six tiles and the Achievements row. (TC-R104, TC-R110)

NOTE ON THE ID [#476]. US-R36 was checked free by grep over `claude/` and `gates/` before use; the only hits were this build's own gate file and its manifest row. It follows US-R35 (#475) and continues above the "US-R20..US-R29" block for the reason recorded under US-R20 and restated at US-R33.

US-R37  **As a player stepping through a review, when the position I land on is a forced mate, I need the evaluation readout to say so — never to report the mate as a number, and never to report one thing for the instant before the engine answers and another thing after.**  The review's eval readout has two sources for one quantity: the live full-strength search (`sfEval`), and the per-ply evaluation stored by the analysis pass (`review.analysis[].evalAfter`). The stored one is clamped to ±99 pawns where it is written (`chess.jsx:4015`), and a mated line scores ±99950 centipawns, so EVERY forced mate reaches the readout as exactly ±99. The live search is keyed on the displayed FEN, so it is unavailable by construction for at least one render after every ply change — which means the stored value is ALWAYS what paints first on a new ply, and is what keeps painting on every path where the search fails to answer at all (`sfBestLine` resolves null on five of them; see #389).

Two clauses, separate because they failed separately:

(1) A FORCED MATE IS NEVER PRINTED AS A NUMBER. Before #489 the stored path ran through `Math.max(-9.9,Math.min(9.9,…))`, so a position with mate on the board printed the string `+9.9` — a plausible-looking evaluation, in the same shape and the same monospace pill as a real one, with nothing distinguishing it from a genuine +9.9 advantage. MEASURED on the shipped #488 bundle at 375x730, 375x679 and 390x844: stepping through plies 30 to 33 of the Opera Game paints `+9.9` on all four, 9 to 14 times depending on geometry, before the live search overwrites it.

(2) THE TWO SOURCES AGREE ABOUT WHAT KIND OF THING THEY ARE REPORTING. The engine-line path has printed a mate LABEL for the same quantity since #375 (`chess.jsx:4757`), so before #489 the same position reported a mate one way and a number the other, and which one the player saw depended on a race they cannot see. The clause is about the KIND, not the digits: `M`, `M1` and `M2` are all acceptable readings of one position depending on how much search has happened, and a number is not. Requiring the two to agree digit-for-digit would be the #391 trap — an assertion whose verdict depends on which answer an engine happened to return.

WHAT THIS CLAUSE DOES NOT SAY: it does not promise the mate DISTANCE is exact before the search lands. The stored value carries no distance — the clamp destroyed it long before this readout — so the honest first paint is `M` where a mate exists and `M1` where one is available immediately, and the distance arrives with the search. Promising a distance would need the analysis pass to carry mate through, which is a larger change and is still open on `jobs/review-mate-label-not-plus9-9`.

(3) [#549 item (79)] A SHALLOWER SEARCH DOES NOT TALK THE READOUT OUT OF A MATE. The live probe paints every depth it reaches, so on a ply the stored analysis calls a forced mate its first depths arrive as numbers: MEASURED on the #549 trial bundle before the fix, Lasker v Thomas 1912 at ply 28 (14...Kf4, mate in 3) painted `M`, `+8.1`, `+9.7`, `M4` in turn, and plies 21 and 24 did the same. While the stored analysis says mate and the live search has not itself found one, the readout stays on the stored mate label; once the search reports a mate, its `M<n>` shows. And the converse holds: a REAL evaluation near +9.9 (measured +9.7 to +10.3) is printed as a number at every site and never as a mate. Amber: `flags/amber-549-review-mate-holds-over-shallow-cp`.

CASE: TC-R09c and TC-R09d, gate `gates/regress/20-review.js`.

NOTE ON THE ID [#489]. US-R37 was checked free by grep over `claude/` and `gates/` before use; there were no hits. It follows US-R36 (#476).

---

US-R38  **As a player promoting a pawn, I need the promotion picker to offer MY pieces — the same pieces, in the same colour and the same set, that my side is already wearing on the board.**  The picker is the one place in the app where a player chooses a piece rather than moves one, and until #496 it drew the choice in a way that contradicted the board eight pixels above it.

THE DEFECT THIS CLAUSE IS WRITTEN FROM, measured rather than described. `chess.jsx` chose the glyph SET correctly by side — `const col=promo.g.turn; const gl={w:{q:'♕',…},b:{q:'♛',…}}[col]` — and then painted whichever set it had chosen with a hard-coded `color:'#fff'`. The two Unicode sets differ in FILL and not in hue: `♕` is an outline and `♛` is a solid, so painting both white gave White a hollow white queen and Black a filled white one. A player promoting as Black was offered four white-coloured pieces while every black piece on the board beside them was a dark sprite. The #433 auditor measured it as bright(>170) 2.0% for White against 3.6% for Black over the identical 273x114 crop — the same ink, more of it — which is the number that says this is a colour defect and not a shape one.

Two clauses, separate because they can fail separately:

(1) THE PICKER SHOWS THE PROMOTING SIDE'S COLOUR. Black promotes, Black's pieces are offered. This is the half a player sees and the half the job was raised about.

(2) THE PICKER SHOWS THE PLAYER'S CHOSEN PIECE SET. The picker used text glyphs, so it ignored whichever of the four skins (`classic`, `merida`, `chessnut`, `spatial`) the player had selected, while the board honoured it. A picker that got the colour right and the set wrong would satisfy (1) and still be a screen that does not match the board under it.

WHY ONE CHANGE SATISFIES BOTH: the app already has a component whose whole job is "draw this piece, this colour, in the player's set" — `_Piece` at `chess.jsx:1621`, memoised as `Piece` at `:2446`, which the board itself uses at `:8532`. Rendering it in the picker takes `color` from the same `promo.g.turn` the old glyph map used, reads `_ACTIVE_PIECES` so the skin follows, and its own `useFallback` branch colours by side correctly (`#fff` against `#1a1a1a` with an inverted text-shadow) — **but only on a surface those two colours were calibrated for, which is why clause (3) exists.**

WHAT THIS CLAUSE DOES NOT SAY. It does not say the picker must use IMAGES: the `useFallback` branch legitimately draws text glyphs when the player has chosen the symbol set or when an image fails to load, and it is correct there because it colours them by side. The clause is about which side's pieces and which set, not about the drawing mechanism. It also says nothing about the picker's LAYOUT — the four 52x52 buttons and their placement are block H's subject, not this one's.

(3) THE PIECE IS LEGIBLE ON THE SURFACE IT IS DRAWN ON. A piece the player cannot see is not a piece they were offered, so clauses (1) and (2) are both satisfiable in a way that still fails the player.

**THIS CLAUSE WAS ADDED AFTER TWO UPHELD VETOES AGAINST MY OWN FIRST FIX, AND THE SENTENCE IT REPLACES IS WITHDRAWN [R18].** The first version of this story said the fallback branch "colours by side correctly … so even the symbol set comes out right". That was asserted, never measured, and false. With `ct_pieceSet='symbol'` — one of five chips in the look sheet, so an ordinary setting — `_Piece` draws Black's glyph in `#1a1a1a`, a colour calibrated for a board square. On the first fix's button face (`rgba(var(--acr),.14)` over the `#1f1f30` panel) that composites to **1.33:1**, against a WCAG floor of 3:1 for a graphical object. Before this build the same glyph was painted `#fff` there and read about **12.5:1**. So the first fix traded "legible but the wrong colour" for "the right colour and invisible" — and I looked at the render rather than only the ratio: the glyph's fill vanishes and only its 2px white halo survives, so a black piece reads as a faint WHITE outline, which is the original defect wearing a worse costume.

Both blind antagonists found it independently, from the diff door and from the shipped-surface door, in a pass where neither could see the other.

THE FIX IS THE SURFACE, NOT THE INK: each piece is drawn on the square colour a chess diagram would use, which is the opposite one — `background: col==='b'?TH.light:TH.dark`. Measured across all twelve themes rather than on the default alone, which is what caught the second draft: a flat `TH.dark` face cleared 3:1 on nine themes and failed on three (Dragonstone 1.90 and Royal 2.75 for black, Candy 2.86 for white). The opposite-square face gives **black a worst case of 10.52:1** and **white a worst case of 2.86:1** — Candy, the single cell under the floor, where the glyph carries its own `0 0 2px #000` outline and the sprite carries `#000` strokes, so the fill ratio understates it. That cell is named rather than rounded away.

(4) THE CHOICE HAS A NAME A SCREEN READER CAN SPEAK. Drawing the piece as an `<img alt="">` left the four buttons with no accessible name at all; before this build the text glyph *was* the name, so the change turned "Queen, button" into "button, button, button, button". Upheld veto, one expression: `aria-label` on each button. Recorded as a clause because the gate's J3 pins the empty-`innerText` state, so without it the suite would have required the unlabelled picker.

CASE: TC-R51, gate `gates/regress/65-promotion-after-gameover.js` blocks J and JS.

NOTE ON THE ID [#496]. US-R38 was checked free with `grep -r 'US-R38' .` over the whole repository (0 hits) and against the id list under `claude/stories/`, not one file — which is the mistake TEST-CASES.md records at TC-R22. It follows US-R37 (#489). US-R47 was deliberately NOT taken: it is reserved, un-written, by `jobs/rank-up-verdict-line-is-cut-mid-word-2026-09-28`, and reserved ids are invisible to grep because they live on the tracker and not in the tree.

## US-R50 — a control the app is telling the player to press is the control their finger lands on

**ARRIVED AT #497** for `jobs/the-lesson-cta-centre-hit-tests-to-the-lesson-footer-and-a-tap-closes-the-lesson-at-568-tall-2026-10-04` (band 16, P0). The job asked for this clause by name and said it does not exist: *"The clause that covers it does not exist: nothing in claude/stories/ says a control must be tappable at its own centre. That cross-app clause is part of this job."*

**THE CLAUSE.** When this app puts a dialog over the screen — a full-viewport overlay with a dimmed backdrop, which this app uses for the lesson intro card, the promotion picker and the puzzle celebration — then every control that dialog offers is reachable at its own centre. A tap at the middle of the button the dialog is asking the player to press reaches that button, and not a bar, a tab or any other chrome behind or in front of it.

**WHY THIS IS ABOUT HIT TESTING AND NOT ABOUT LAYOUT, which is the distinction that makes it checkable.** A control can be fully painted, fully inside the viewport, the right size, above the 44pt minimum and still be untappable, because something else is drawn over it and takes the tap. None of the clauses this register already carries can see that: they are about size (US-R15's tap targets), about overflow, and about truncation. This one is about *what the finger reaches*.

**AND IT IS NOT "NOTHING MAY EVER OVERLAP ANYTHING", which would be false and unmeasurable.** A dialog is *supposed* to cover the screen behind it, and the controls behind a dialog are *supposed* to be unreachable — that is what a modal is for. The clause is scoped to the dialog that is currently on top: its own controls must be its own. Measured consequence of getting that scoping wrong, recorded here because it is the whole difficulty: a probe that simply asks "does every button own its centre" reports **12 of 42 lesson states red on a correct build**, and **eleven of the twelve reds are the lesson's own buttons sitting legitimately behind the intro card or behind the ⋯ sheet.** #393 tried three versions of that probe and shipped none of them, correctly.

**WHAT WENT WRONG, so the clause has a measured instance behind it rather than only a principle.** The lesson intro card was a `position:fixed; inset:0` modal at `zIndex:120`. The lesson footer is a `position:fixed` bar at `zIndex:471`. So the footer painted *over the dialog* and won the hit test on whatever part of the card reached its band. On the shipped #496 bundle `01387f706cea` at 320x568:

| lesson | the CTA's box | footer top | what the centre actually hit |
|---|---|---|---|
| Italian Game | 466.20..510.20 | 507 | itself — **this lesson was clean, which is why it hid** |
| Four Knights Game | 487.89..531.89 | 507 | the footer bar; at 75%, `Forward a move` |
| Queen's Gambit | 495.56..539.56 | 507 | `Forward a move`; at 25%, already the bar |
| King's Gambit | 506.41..550.41 | 507 | at 25%, `Forward a move` |
| Petroff (Russian) Defense | 540.28..584.28 | 507 | runs **16px off the bottom of a 568-tall screen** |

A real tap at the CTA's own centre **left the card up**, because it went to the footer; on Queen's Gambit it stepped the demo; and at 375x568 on King's Gambit it hit `✕ Close lesson` and **the lesson closed** — the destructive outcome the job named, reproduced. Nothing scrolled it back: `#root` scrollHeight equals clientHeight at 568, and forcing every scroller to its end left the CTA at the same y, so this was unreachable and not merely below the fold.

**IT IS PER-LESSON, AND THAT IS WHY THIS CLAUSE HAS TO SAY "EVERY CONTROL" RATHER THAN NAME A POSITION.** The overlay is `alignItems:'center'`, so the CTA's y is a function of the card's height, which is a function of the lesson's own content — the idea block is capped at 40vh, the plans block at 26vh, and the Related-lessons row is present for some lessons only. Driven over **every** lesson row of all four groups at 320x568 on the broken bundle: **46 of 170 cards** had at least one of three sample points land off the CTA (Openings 8/97, Gambits 37/53, Endgames 1/20, Tactics 0/0). So there is no single y to pin and no one lesson to check.

**THE SCOPE OF THE FIX, counted rather than called minor [R06, R07].** 27 full-viewport fixed overlays exist in `chess.jsx`; 24 already sit at 470 or above and are clear of both bottom bars. The three below were the intro card (120), the puzzle celebration (`:8018`, 80) and the promotion picker (`:8052`, 60). **The other two were DRIVEN rather than assumed:** the picker reads 0 of 4 controls not-own at 320x568, 375x568 and 375x730, because no fixed bottom bar is on screen during a Pass & Play game at all; the celebration could not be reached and is reported as unmeasured rather than counted clean. Only the intro card is changed at #497. The clause covers all three, because a dialog below a chrome bar is latently wrong whether or not today's content reaches the bar.

**WHAT THIS CLAUSE DOES NOT SAY.** It says nothing about landscape, which is unmeasured. It says nothing about larger accessibility fonts, which would make every card taller and is the obvious way to turn a clean lesson into an affected one — named here as the next thing to measure rather than implied to be covered. It does not say a dialog may never be taller than the viewport; it says its controls must be reachable, and a dialog whose content scrolls satisfies that by scrolling.

CASE: TC-R60, gate `gates/regress/74-lesson-card-hit-area.js`.

**NOTE ON THE ID, AND A NEAR MISS WORTH MORE THAN THE ID [#497].** This clause was first written as **US-R39** and the case as **TC-R52**, and **both were already reserved**. `grep -rn 'US-R39' .` over the whole repository returned only my own new files, which is exactly the false clear TC-R51's note warns about: *"a reserved id is invisible to grep because it lives on the tracker and not in the tree."* Checked properly — against the `storyClause` and `case` fields of all 437 ready jobs — **US-R39 is reserved by `jobs/brilliant-drill-explanation-prints-the-eval-in-the-wrong-frame-2026-09-23` and TC-R52 by `jobs/bench-lesson-complete-has-nowhere-to-go-2026-09-28`**, which has a six-input spec written against it. Seventeen US ids and sixteen TC ids are in that state. US-R50 and TC-R60 are taken instead: one above the highest id known anywhere (US-R49 and TC-R59), rather than filling a low gap, because a gap may be a reservation whose job is closed or parked and therefore outside the 437 I could read. `US-R70` appears in `claude/stories/SUITE-AUDIT-2026-09-14.md` and is NOT a story id — it is a deliberately mutated gallery-card id in a negative-control table, and reading it as a ceiling would have sent the next clause to US-R71.

**NOTE ON THIS CLAUSE'S HEADING LEVEL, AND IT IS A DISCLOSURE RATHER THAN A DETAIL [#497].** This clause is written as `## US-R50`, with two hashes, and `gates/verify-log.sh --citations` arm (5) joins the registers on `### US-` headings with THREE. So **this clause is invisible to that join and is not counted by it**, and I am saying so rather than letting an unchanged number read as coverage. It is deliberate and the reason is arithmetic: arm (5) already reports **REGISTER SELF-CHECK RED on origin/main before this build touched anything** — 3 wrong-width rows against a committed ceiling of 2, measured in a detached worktree at 047256d, so pre-existing and not mine — and it counts **9 stories at zero cases against a ceiling of 9**. A `###` heading here would become the tenth, because TC-R60 is written as a `### TC-R60 (US-R50)` section and the join reads case TABLE ROWS, not case headings. So the convention that makes a clause visible would also push a second pre-existing ceiling over, and a build should not redden a push gate further in order to satisfy a formatting convention. MEASURED BOTH WAYS: with `##`, arm (5) reads identically on this tree and on 047256d — 57 case rows, 32 story headings, 9 at zero cases, 3 wrong-width — so this build moves none of its numbers.

**THE REAL FINDING UNDERNEATH IS NOT MINE AND IS NOT NEW: THE RECENT CLAUSES IN THIS FILE HAVE DRIFTED OUT OF THE JOIN ALTOGETHER.** `US-R38`, written at #496, has **no heading at all** — it was appended as body text — and `US-R20`, `US-R33` and `US-R36` carry `##`. Six clauses in this file use `##` and thirty-two use `###`, so the join's denominator of 32 story headings is not the number of clauses this file contains, and every clause outside it is unjoinable by construction. That is the same shape as #405's frozen denominator: a count that looks like coverage over a set that has quietly stopped being the whole set. Filed with the measurement rather than fixed here, because making all six joinable at once would take the zero-cases count from 9 to as many as 15 against a ceiling of 9 and redden a gate nothing in the push path currently runs — which is its own recorded job.

**CORRECTIONS TO US-R50, MADE BEFORE THE PUSH ON TWO UPHELD BLIND-ANTAGONIST VETOES [R18, #497].** Both vetoed independently and converged; the full list of twelve is on TC-R60. Three of them change what this clause says rather than how it was tested, so they are here.

**(i) THE TABLE'S LAST ROW IS NOT SATISFIED BY #497, AND THE CLAUSE SHOULD NOT HAVE IMPLIED IT WAS.** Petroff (Russian) Defense at 320x568 is in that table with "runs 16px off the bottom of a 568-tall screen", and that sentence is true BEFORE and AFTER this build. Measured on both bundles: the panel is **634.55px tall in a 568px viewport** (-33.27..601.28), the CTA is **540.28..584.28** and the close ✕ is **-23.27..6.73**. Z-index is paint, not layout, so the fix moves none of them. What it does move for that card is the hit test — own 25/50/75 from **false/false/false** to **true/true/(outside the viewport)** — so the button became tappable at its centre and the card still cannot be read in full. **THIS CLAUSE WAS THEREFORE SATISFIED ON 169 OF 170 CARDS AT 320x568 AND UNMET ON ONE — AND AT #498 IT IS SATISFIED ON 170 OF 170 [R18, the number is moved in the document that carried it].** #498 gave the card's panel `maxHeight:'100vh'` and `overflowY:'auto'`, which is the remedy this clause's own words prescribe. Re-swept over all 170 cards of all four groups at 320x568: cards with an UNREACHABLE control **1 -> 0**. Petroff measured `panel -33.27..601.28 h634.55` -> `0..568`; its close ✕ went from 6.73px of a 30px button on screen with zero user-scrollable ancestors to **fully on screen at rest**; its CTA is now below the fold with **one** finger-scrollable ancestor and comes fully into view when that ancestor is scrolled (the panel's full travel is 67px; the 58px figure an earlier version of this paragraph gave is the harness's own minimum scroll step — 49.55 of overrun plus an 8px overshoot — and not a property of the card [R18, antagonist A]), which this clause accepts in terms and which the sentence below already drew the line for. The reachability treatment behind both numbers is `gates/regress/40-reachability.js`'s: only ancestors a finger can scroll, scrolled for real, rect re-read, `scrollTop` restored, never `scrollIntoView`. Gate 74's B1b now asserts exactly that at a ceiling of zero, and #497's `fullyOnScreen` ceiling of 2 is withdrawn as unable to see its own fix — Petroff still has two controls below the fold on the FIXED bundle, so `2 <= 2` held on both trees. Case: TC-R62. The clause itself already draws the right line and is unchanged: "it does not say a dialog may never be taller than the viewport; it says its controls must be reachable, and a dialog whose content scrolls satisfies that by scrolling." Petroff's does not scroll. Filed as `jobs/the-lesson-intro-card-can-be-taller-than-the-viewport-and-nothing-scrolls-it-2026-10-08`.

**(ii) "A TAP CLOSES THE LESSON" BELONGS TO 375x568, NOT TO 320x568.** Counted over all 46 affected cards at 320x568, the centre hits the footer bar on 11, "Forward a move" on 11, a chevron on 5, and `✕ Close lesson` on **none**. The destructive outcome is measured twice, both at **375x568**: King's Gambit and Petroff. And the severity of the whole class is smaller than "46 cards" suggests: on **19** of the 46 the centre still hit the CTA, so the number of cards where the tap is actually lost is **27 of 170**. Both figures are now published together, because the stronger sentence is not supported by the stronger number.

**(iii) THE COST OF THE FIX WAS STATED WRONGLY IN THE SHIPPED COMMENT AND IS CORRECTED THERE AND HERE.** The comment said "nothing needs the transport controls before the demo has started". **The demo has already started.** `selectOpening` fires `setDemoPlaying(true)` three lines before `setIntroCard(true)`, and the build's own gate log records the footer's text as beginning with the ⏸ glyph, which renders only while `demoPlaying` is true. So raising the card above the footer costs a player one extra tap to reach Pause or the ✕ exit, for as long as the card is up — at most 4000ms, or until any tap dismisses it. That is a small and defensible price for a CTA that works, and it is the price; asserting "nothing needs them" without driving it is the same unmeasured-assertion-as-fact that both of #496's antagonists vetoed #496 for, in the one sentence carrying the trade-off.

**AND ONE THING THIS CLAUSE SHOULD RECORD THAT NEITHER THE JOB NOR THE FIX NOTICED.** The intro card has **no re-entry**: the only `setIntroCard(true)` outside `selectOpening` is an "about" button that sits inside a block whose contents are wrapped in `{!lessonFocus&&(...)}` while `lessonFocus` is the same predicate the block tests, so it never renders. The card is therefore only ever on screen in the first moments of a lesson — which is why (iii)'s cost is small, and which also means a player has no way back to the lesson's own idea text once it is gone. Argued from the source by antagonist A, not driven in a browser, and labelled as such. Recorded on the overflow job rather than filed separately, because it bounds that job's exposure.

- (4b) WIDENED AT #547 (item (67); Kunal chose "real-only"): the same principle holds for the whole Review screen, not only
  the filter. A count the screen prints as the games I REVIEWED - the Your progress panel's Games reviewed and Brilliancies, and
  the review badges (Self-Aware at one review, Analyst at ten) - counts only games I gave a full review. The background pass's
  estimates, and old entries that carry no source, are skims and never count as reviews; the panel itself still shows when
  any entry exists, so the Achievements route stays reachable. (TC-R49)

### US-R47 — a box that carries news shows the news, or does not carry it

**ARRIVED AT #502** for `jobs/rank-up-verdict-line-is-cut-mid-word-2026-09-28` (ship-list id 8, priority 13, finishFirst). The clause was drafted **verbatim** on that job by `spec-c__1790639770809` on 2026-09-28 and never written here; #496 recorded that it deliberately did not take the id because it was reserved by that job. This is that write, and the clause text is the job's own, unchanged.

**THE CLAUSE.** A box that carries an event announcement shows that announcement in full, or the announcement is not put in that box.

**WHAT AN EVENT ANNOUNCEMENT IS, because the clause is useless if it reads as "no text may ever be truncated".** An *event announcement* is news: a thing that just happened and will not happen again on this screen — a rank up, a rating change, a game ending. A *state sentence* describes the screen as it now is, and the screen will say it again next time. The app's reward moment concatenates one of each into a single box; in `chess.jsx`, search `Rank up — you reached`, the verdict is the party popper, then either `Solved! ` or the alt-mate line, then the puzzle's own `explain`, then the announcement appended **last** behind a conditional.

**WHY THE DISTINCTION IS THE CLAUSE.** A clipped state sentence costs the player a detail they can recover from the board. News clipped is not recoverable from anywhere on that screen, and because the announcement is appended **last** it is the first thing to fall out of a box that fills up. The defect this clause was written from is the #427 instance: a 593px string in a 362px `white-space:nowrap` box, reading `'. Solved! Mate in 2 - nicely done. . Ra...'`.

**THE STATE OF THE CLAUSE ON MAIN: UNMET, AND THE GOVERNING VARIABLE IS NOT THE LENGTH OF THE STRING.** Measured at #502 on bundle `958b5d4dc8d8` through real play — not injected text — on the rank-up to Master. **The verdict box is not a fixed cap. Its height is computed from the GOAL CARD above it**, so the exposed input is the one with the largest verdict *relative to its own goal card*, not the longest verdict in the app:

| puzzle (absolute index) | goal card, as pz-top | box | hidden | announcement ink | what the player sees of the news |
|---|---|---|---|---|---|
| curated `c7` "Smothered mate" (720), verdict 265 cp, at 375x761 | 161 | 109 / 137 | **28px** | **0 of 26** | nothing |
| the same, at 320x568 | 161 | 109 / 156 | **47px** | **0 of 26** | nothing |
| the same, at 390x844 | 205 | **153** / 178 | **25px** | **5 of 26** | `⬆Rank` |
| curated `c13` "Lasker Trap" (722), verdict 285 cp — **CONTROL** | 221 | 169 / 169 | **0px** | **26 of 26** | the whole announcement |

So a **longer** verdict is whole and a shorter one is cut, because `c13`'s two-line goal card reserves 169px and `c7`'s one-line goal card reserves 109px. The Master announcement is 36 code points: 26 ink and 10 whitespace.

**THREE CLAIMS THIS ENTRY MADE EARLIER TODAY ARE WITHDRAWN, AND THE WITHDRAWN VERSIONS ARE WORTH MORE THAN THE CORRECTION [R18].** Both blind antagonists vetoed the first version and both vetoes were upheld in full.

1. **"The worst reachable verdict is 307 code points, with the alt-mate prefix."** WITHDRAWN. `alt=isMate&&!matchesLine` (search `const alt=isMate`) fires only when the player delivers a checkmate that is *not* the scripted solution, so it is mutually exclusive with solving the puzzle as written, and it is unreachable on every long curated puzzle. The figure also mis-stated the arithmetic: `c13`'s real verdict is 285 cp, not 307.
2. **"The announcement is painted 10 of 41 code points."** WITHDRAWN, and this one was an instrument artefact rather than a slip. The probe credited **every whitespace code point as painted without constructing a Range for it**, and the clause contains exactly 10 spaces — so a clause that is entirely invisible reported "10 of 41". Measured ink is **0 of 26**. `gates/regress/57-pz-solved-explanation.js`'s assertion E carries the same whitespace floor and should be fixed in the same edit.
3. **"The player is shown `⬆ Rank up —` and no more."** WITHDRAWN as fabricated from that artefact. At 375x761 and 320x568 the player is shown **nothing** of the announcement; only at 390x844 do five ink characters survive.

**AND TWO THINGS THAT MAKE THIS LESS SEVERE THAN THE FIRST VERSION CLAIMED, recorded because overstating a defect spends the register's credibility.** The box is `overflow-y:auto` with a zero-width scrollbar, so the news is behind an undiscoverable drag rather than destroyed. And the celebration modal raised by the same solve **says the rank in full, at every geometry measured**, before the player dismisses it — so "the box is the only place the news is said" was false. What survives is the clause itself: once the modal is dismissed the box is the only carrier, and it shows none of it.

**THE CLASS HAS TWO MEMBERS IN THAT BOX AND EXACTLY ONE VIOLATION.** `chess.jsx`, search `Checkmate — that works too!`, prepends the same kind of news on the external and drill path into the same box — and the comment beneath it already records it overflowing at scrollHeight 91 / clientHeight 74 at 375x730. It **satisfies** this clause, because it puts the news FIRST and lets the explanation fall out instead. That is a shipped precedent for the remedy below, in the same element, and the first version of this sweep claimed the class had "exactly one live member" and missed it.

**WHAT THIS CLAUSE DOES NOT DECIDE.** Four changes satisfy it — put the news first (precedent above); cap the explanation; give the news its own row; or leave it to the modal and keep it out of the box — and they differ in what the player reads and what the screen costs. That is not a choice the run that found it may make [R45]. Routed with the measurement and a recommendation.

CASE: TC-R58, and the gate is owed by the test-authoring lane [R17].

### US-R72 The lesson board does not get smaller because something appeared for a moment
As a player working through a lesson on a short phone, the demo board is as large as the screen allows, and it
stays that size for the whole visit — it does not end up smaller than it started because a note, a label or a
font arrived a frame late.

- The board is maximised and must never jump (CLAUDE.md's first layout rule). This clause adds the half that
  rule does not state: a board that shrinks ONCE and never comes back is not a jump, it is a permanent loss,
  and it is invisible to any assertion that only compares two adjacent states.
- WHY THIS CLAUSE IS NEW RATHER THAN A REPOINTING, and the citation it replaces was FALSE. The gate for this
  defect was written at #510 citing a clause numbered **21**, and no story clause in this file has ever been
  numbered 21 — the ids run to US-R71. I am deliberately NOT writing that id out again here, because this
  paragraph would then be the only occurrence of it in the file and would falsify its own check: that is the
  recursion #506 recorded against itself, where "prose that quotes the defective form IS the defective form
  as far as a textual scan is concerned". The two nearest real clauses do not cover this screen either:
  **US-R04** ("The move screen fits the phone and the board never moves") is scoped to REVIEW and **US-R12**
  ("The drill board stays still when the app answers me") to the DRILL. Nothing here covered the LESSON
  board's stability, which is why the defect could sit for eleven days with its own job at band 16 and no
  clause to hold a fix to. Found by the #510 build against its own gate, before any antagonist read it.
- NOT TRUE ON main AS OF #510, AND THIS CLAUSE IS THE TARGET RATHER THAN THE RECORD. Measured on main's own
  bundle `227126b82b81`: after a transient 16px of in-flow content across one loop-dependency change at the
  lesson demo end, the board is **24.00px smaller at 320x540** and **16.00px smaller at 375x568**, for the
  rest of the visit, and nothing in the app can reclaim it. It recovers only by leaving and re-entering.
- **AND AT 320x540 IT COSTS MORE THAN BOARD WIDTH.** The latched board is 212.39, the exact pre-#430 value.
  `gates/regress/48-lesson-flow.js` publishes the arithmetic — the MOVES row's residual is its min-content
  (231.55px, geometry-independent) minus the board — so 231.55 − 212.39 = **19.16**, which is #424's PINNED
  residual at that height to the hundredth. The latch therefore RE-OPENS the "Other lines" button overflow
  that #430 closed and that gate 48 had pinned as a live unrecoverable defect. The clean board 236.39
  reproduces gate 48's own "−4.84, fits with 4.84px to spare". At 375x568 the residual stays negative.
- **IT HAPPENS ON KUNAL'S OWN PHONE, AND THE FIRST DRAFT OF THIS CLAUSE SAID IT DOES NOT [R18].** That draft
  measured 0px at 375x730 and 375x761 with a **16px** transient and withdrew the owning job's claim about his
  phone. The transient SIZE is an input axis and it drove one value of it. Measured on main's own bundle at
  the lesson demo end, injection alone, board read after the content is gone: 375x730 loses **0.00px at 16,
  56 and 64px** and **29.20px at 88px** (board 345.83); 375x761 loses **32.80px at 120px** (board 342.23).
  `chess.jsx`'s own #436 comment said so in a clause the draft dropped — *"the trim cannot move the board at
  all UNTIL IT EXCEEDS ~145px"*. So the withdrawal is withdrawn: the job's claim stands, and what it was
  missing is the THRESHOLD, which is new. (375x761 is his phone per R19; 730 is the legacy `lib.js` GEOS
  entry, and R19's own text calls 730 the figure to correct.)
- **AND THE APP PUTS A TRANSIENT OF THAT SIZE INTO THE FLOW FOR REAL, so this is not a synthetic worry.**
  `gates/regress/16-cpu-result-line.js:424` — a REQUIRED gate — measures a **62px** in-flow tab-bar spacer
  entering the flow at game over and trimming the board 224.00 → 192.00, with the irreversibility in its own
  figures: *"live 224.00 → card-up 192.00 → card-gone 192.00"*. 62px sits in the band that latches his phone.
- **THE LOSS SCALES WITH THE TRANSIENT, so "16–24px" was an artefact of a 16px probe.** At 375x568 an 88px
  transient lands the board on **192.00 — losing 78.88px, 29% of the board** — which is EXACTLY the floor
  `gates/regress/48-lesson-flow.js` records from the wild against a usual 270.88, "about 2 runs in 6". That
  is the only magnitude this project has ever observed in the field and it reproduces at one input size.
  A LIMIT ON THE SEVERITY, published beside it: repeated identical transients do NOT accumulate — 14
  inject/remove cycles moved the board once and 0 times after — so a single transient's size decides it.
- **THE CLASS IS FOUR SCREEN FAMILIES, NOT ONE.** `_fitScreen` spans compact review, play, puzzle
  browse/online and lesson, and the identical ratchet is measured on PLAY (272.00 → 256.00) and PUZZLE
  (259.03 → 235.03) at 375x568. Compact review did not reproduce with a ply-change trigger, which is NOT
  REPRODUCED and not immune. This clause is written for the lesson because that is where the gate drives;
  play and puzzle are measured-affected and uncovered, and that is owed work rather than a claim.
- **A PHONE GAME'S BOARD COMES BACK TOO (#549 run fix, 1029033 and its gate).** In Play against the computer the
  board, after a transient block of in-flow content has come and gone across one fit-loop dependency change (the
  Moves toggle), returns to within the loop's 8px step of its fresh-launch width. The mechanism there was not the
  lesson's: the two player bars and the moves panel grow into the room a shrink leaves and swallowed it back, so the
  loop read no overflow and no slack. Measured pre-fix (5a6c918bebaf) at 375x568: 296 -> 232 and stayed 232; fixed
  (8332d8e5c3a8): back to 296. COMPACT REVIEW HAD THE SAME DEFECT, ONE LEVEL WIDER, AND IS
  COVERED SINCE the #549 run fix fixr3e: the Review board, after a transient block across one ply change, returns to
  within the loop's 8px step of its fresh-launch width and never past it. There the whole board column is a flex filler,
  so the loop read no slack at any board size and the engine-row reservation lapsed with the trim; measured at 375x568,
  Opera Game ply 10, 264 -> 208 for good pre-fix, back to 264 fixed. AND WHERE THE PLAY BOARD IS ALREADY AT ITS WIDTH CAP
  (375x730, 375x761, 390x844) A SMALL OVERFLOW (20px or less) IS STILL TAKEN OUT WITHIN THE LOOP'S WAKE: the growth that
  brings the board back stops at the trim where the board meets its width cap, so the trim is never parked where no trim
  moves the board (#549 run fix fixr5a). AND THE PLAY BOARD COMES BACK TO ITS FRESH SIZE EXACTLY, NOT TO WITHIN A STEP:
  one state has one board size whatever its history. Measured on f462559 at 375x568 a transient left 304 against a fresh
  296 and at 320x540 268 against 276; since the #549 run fix fixr6b both return to fresh. AND THE PUZZLE TRAINER'S
  BOARD AT ITS WIDTH CAP (375x730, 375x761, 390x844) TAKES OUT AN OVERFLOW AFTER A PUZZLE MOVE AT ONCE: its growth stops
  at the width-cap trim as Play's does, so a launch never parks the trim at -480 (#549 run fix fixpz; measured on aba4af0 a
  100px block then Re8+ at 375x761 overflowed 17px for 10 to 13 frames, fixed 0). (TC-R64-D15, TC-R64-D16, TC-R64-D17,
  TC-R64-D18)
- THE MECHANISM IS ESTABLISHED AND THE TRIGGER IS NOT. The portrait fit loop (`chess.jsx`, search
  `boardTrim`) shrinks on a real overflow and can never grow back, for two independent reasons either of
  which alone is sufficient: the slack a single shrink leaves is `ceil(over/8)*8+8-over`, which lies in
  **[8,16)** for every possible `over>0` against a growth branch requiring `over<-24`; and `over` reads
  exactly 0 in every settled lesson state, because `#root` has one in-flow child whose height equals the
  viewport — which also means #364's growth branch, added for "Kunal's phone sat at board 319 with trim 0 and
  56px of slack nobody could claim", CANNOT FIRE ON ANY PORTRAIT SCREEN. That is a landed fix that never
  executes and it is a larger, separate item than this latch. The honest open question is NARROWER than
  "the trigger is unidentified", which the first draft wrote and which is true of the job and false of the
  repository: the trigger CLASS is measured in `gates/regress/16-cpu-result-line.js`, and what nobody knows
  is WHICH PORTRAIT SCREEN STILL PUTS MORE THAN ~60px INTO THE FLOW ON A CONTENT CHANGE.
- WHERE THE SLACK GOES **IS** KNOWN, and #510's first draft wrongly called it an open question: the MOVES
  PANEL absorbs it, +24.00px at 320x540 and +16.00px at 375x568, exactly the board lost, and `chess.jsx`'s
  own comment at the panel says it "ABSORBS THE SLACK". A probe looking for flex FREE SPACE cannot see that,
  because free space is identically 0 wherever a flex-grow child exists. So a measurement-based fix is NOT
  ruled out, which is the opposite of what that draft concluded.
- WHAT THIS CLAUSE DOES NOT DECIDE, and it is a product question rather than an implementation one: the
  surviving candidate fix is to stop re-deriving the trim from its current value on a content change, and
  #355's comment states the reason that behaviour exists ("or the board visibly jumps to full size and back
  on every single move, which is exactly what Kunal saw"). How big a residual jump is acceptable is Kunal's
  call, not this lane's.

CASE: TC-R64, gate `gates/pending/75-fit-loop-one-way-ratchet.js` (renamed from `75-lesson-demo-board-latch.js` during the run, because the same ratchet was measured on PLAY and PUZZLE) — in `pending/` and manifest-`absent`
because it reds on main by design, and it moves to `regress/` in the same commit as the fix.

- **Entering practice from a finished demo does not cost the board more than it already did.** The action row's own
  control takes the player from demo-end to practice; the board-width change across that step is held at or under the
  40px #428 started from (it measured 56 after #428's action-row fix), and the target is zero. (TC-R73; #547 item (59),
  from jobs/action-row-fix-widens-the-lesson-board-jump-2026-09-28, whose own TC-R41 / US-R31 were taken by #430.)

### US-R73 The practice row says "Try again" whenever the row has room for it
*Added #547, from jobs/practice-row-label-keyed-to-a-board-threshold-not-its-budget-2026-09-29.*
As a player practising a lesson line on a narrow phone, the button that restarts the line says "Try again" in
full whenever the row has room for it, and shortens only when it does not - Kunal's rule for narrow phones is to
shrink before dropping words (questions/R2-NARROW-LEVERS, icon-font-ls).
- The words follow the row's own budget, its width less the three fixed buttons and their gaps, not a board-width
  threshold. Where the budget holds the long label with a margin, the long label shows. (TC-LS-035)
- The long label is never shown where the budget cannot hold it - #384's ink over the button beside it. (gate 48's
  one-directional assertion, kept)
- The lesson lightbulb starts off, and before the first move one line says that using it means the run won't bank a
  day; a clean first run banks one. (TC-LS-037; #547 item (90), Kunal's 'warn-first' on lesson-hint-what-it-should-do)
- When the practice line is complete the same slot offers the NEXT lesson of the group instead of Try again, named in
  full only where the slot is wide enough, and never cut; with no next lesson it stays Try again. (TC-LS-036; #547 item
  (82), jobs/build-lesson-next-button)

### US-PL-15 Two players sharing the phone can agree a draw
*Added #547, from jobs/no-draw-offer-control-exists-anywhere-in-local-play-2026-09-30.*
As two players sharing one phone in Pass & Play, when the position is dead we can agree a draw, so neither of us has
to resign a game we did not lose.
- The live game's More sheet offers "Agree a draw". The first tap arms it ("Tap again to agree a draw") and leaves the
  game live; the second ends it as a draw, and the result card says Draw and names the agreement. (TC-PL-041)
- Against the computer there is no such item: an offer to the bot needs a rule for when it accepts, and that rule is
  Kunal's to choose. (TC-PL-041)

### US-PL-16 The New Game sheet fits a short phone, and still says exactly which build it is
*Added #547, from gate 30 A-13 going red on this build's own CHECK round: item (1) lengthened the build stamp.*
As a player on a 640px-tall phone, I can see Start game and the build line on the New Game sheet without scrolling, and
the build line names the source it was built from, so a screenshot of it identifies the code.
- The build line is one line, nothing of it is cut, and it ends with the stamp's "(src <12 hex>)". (TC-PL-044)

### US-R75 A brilliancy card spends its space on the board, not on what every card says
*Added #547, from jobs/drill-card-boxes-earn-their-space-2026-09-23 (Kunal, 23 Sep 2026: "the box right on top ... is the same text everywhere in all of those brilliancies ... everybody knows it's a brilliant move").*
As a player replaying my own brilliant moves, I see the board as large as the screen allows, with only what differs from card to card above it.
- The goal box is one line naming the side to move; there is no motif or level chip, which on my own cards read the same on every one. (TC-R80)
- When I find the move, the verdict is that move's own explanation, with no line telling me it was brilliant; when there is nothing to explain, no message appears at all. (TC-R80)
- The board takes the full column width, and it does not move when the verdict appears. (TC-R80)

### US-R76 Once I have found the move, the drill shows me how good the position is, from my side
*Added #547, from jobs/eval-bar-on-the-drill-board-2026-09-23 (Kunal, 23 Sep 2026: "The bar that goes up and down, points wise ... you can use that space on top"), and his ruling in that job's theOneRuleToDecide: hidden on an unsolved card, shown once it is solved or the line is shown.*
As a player working through my drill, I see an evaluation bar once I have solved the card or asked to see the move, so it never gives the answer away, and it costs the board nothing.
- On an unsolved card there is no bar at all. (TC-R81)
- Once the card is solved, or Show move is tapped, a bar appears in the drill's header row, beside "‹ Review"; the header, and the board's size and position, do not change. (TC-R81)
- The number and the fill are from my side: a position where I am a queen up reads positive whether I am White or Black. (TC-R81)

### US-R77 A box that explains something stays until I have read it
*Added #547, from jobs/explanation-boxes-must-not-time-out-2026-09-24 (Kunal, 24 Sep 2026: "realistically it's not on long enough for me to fully read it"). The spec reserved US-R35 for this, but #475 had already used that id.*
As a player, a message that explains something stays on screen until I dismiss it or make my next move. Only messages that confirm something I just did (copied, saved, joining) go away by themselves.
- The rank-up card is still up ten seconds later and closes on Continue. (TC-R82)
- The online explanations ("Move not saved", "Game created. Send ... your invite code", "That position needs a fix", "Could not copy the link") have a close control and never time out; the acknowledgements still do. (TC-R82)

### US-R78 At the end of a game, the engine row says why it has no line
*Added #547, from jobs/terminal-ply-engine-line-bare-ellipsis-2026-09-27. The spec reserved US-R21, but that id is already in use.*
As a player reviewing a game that ended on the board, I see why the engine shows no line at the last move, so I never mistake a finished game for an engine that has stopped answering.
- At a stalemate the engine row reads "Stalemate — no legal move."; at a checkmate, "Checkmate — the game is over." The reason is fully visible and stays; there is no ellipsis. (TC-R83)
- At any position the game is not over, the row still shows the engine's line. (TC-R83)

### US-R79 A technique endgame lesson starts before the technique, not at its last move
*Added #547, from jobs/seven-endgame-lessons-start-after-the-idea-2026-09-28 and Kunal's 'all-six' answer on questions/q-seven-lessons-start-too-late (recorded 28 Sep 2026).*
As a player learning a basic mate, I start where the method is still to be used, so I play the driving and not only the final blow.
- King & Queen, King & Rook, Two Bishops, Rook & Knight and Bishop & Knight start with the lone king two squares from any edge, and the line drives it there and mates. (TC-LS-038)
- King & Pawn starts with my king on the 5th rank, so stepping in front of the pawn onto the 6th is my move. (TC-LS-038)
- Every line ends where the technique ends, in mate or the pawn queening, with a note for every move. Each new line was checked move by move: legal in chess.js, a forced mate by Stockfish depth 22 with the distance to mate falling by one each move, and 70 square claims in the notes checked against the board. That is not a tablebase, which this environment cannot reach. (TC-LS-038)
- Rook vs Pawn keeps its position, with the rook in front of a pawn on the 7th, and its plan now says why that is right there. (no case: one clause of text)

### US-R107 In the Two Bishops Mate trial, the defending king chooses its own moves
*Added #549, from jobs/bench-lesson-one-format-two-content-types-2026-09-28 and Kunal's 'one-first' answer on questions/endgame-lessons-should-the-defender-choose-2026-10-10 (11 Oct 2026). One lesson only, for him to judge before anything spreads; the calls his answer did not settle are flags/amber-549-two-bishops-free-defender.*
As a player practising the two-bishops mate, I play the method against a king that tries to escape, not a script, so any move that keeps the net counts and the king can run the other way.
- The demo still plays the book line with its notes. In practice the defender's reply comes from the engine, not the script, and a first move off the book line is accepted. (TC-LS-055)
- A move that keeps the mating net is accepted. A stalemate, a bishop left where the king can take it, or a move that lets the king out of the net is refused with the reason, and the board does not move. (TC-LS-054, TC-LS-056)
- The run ends at checkmate, however many moves it took. A clean run banks a day as before; a run with a hint or a refused move does not. After 50 of my moves without mate it is a draw (the 50-move rule). (TC-LS-055, TC-LS-056)
- The progress text counts my moves ("move 5") rather than out of a fixed total, and the line-length strip is not drawn. The lesson screen's sizes hold at 375x761, 320x568 and 390x844: board top 92, note box 75, footer 61, practice buttons 44, no page scroll. (TC-LS-055)
- No other lesson changes. (TC-LS-054)

### US-R80 Stepping back from a tier's first puzzle keeps me in my tier
*Added #547, from jobs/puzzles-previous-from-the-first-puzzle-wraps-to-the-hardest-2026-09-28.*
As a beginner training in my tier, tapping Previous on its first puzzle takes me to that tier's last puzzle, not to the hardest puzzle in the whole collection under my tier's name.
- Previous from the tier's first puzzle lands on the tier's last puzzle; Next from there stays in the tier. (TC-R84)

### US-R81 When a solved puzzle's explanation is longer than its box, the box says there is more
*Added #547, from jobs/pz-solved-explanation-longest-curated-still-overruns-the-new-box-2026-09-28.*
As a player reading why a puzzle's answer works, I can tell when the explanation continues below what I can see, and reach the rest with one tap.
- While text is hidden below the box, a "▾ more" chip is on screen; each tap scrolls the box, and the chip goes when the end is reached. Where the text fits, there is no chip. (TC-R85)
- At rest the box shows whole lines: no line of the explanation is painted cut through its glyphs at the box's bottom edge. (TC-R112)

### US-R82 A hint I asked for stays while I keep trying
*Added #547, from jobs/pz-one-message-slot-overwrites-the-hint-2026-09-28.*
As a player stuck on a puzzle, the hint I asked for stays on screen while I try moves, and a second wrong move tells me where to look next instead of repeating itself.
- After 💡 Hint, a wrong move shows its ✗ line in the verdict box and the hint stays in the header; it is still there after a second wrong move. (TC-R86)
- The second wrong move on the same puzzle points at 👁 Show rather than printing the first sentence again. (TC-R86)
- The same holds with the phone turned sideways: in the landscape rail the hint takes the counter row, a wrong move does not replace it, and the board does not move. (TC-R86b, #549)
- The whole hint reads: no puzzle's hint needs more lines than the hint box draws, at any supported width, so the instruction half is never cut off behind an ellipsis. (TC-PZ-04, #550 item (139))

### US-R83 Starting to practise a lesson moves nothing on screen
*Added #547, from jobs/lesson-moves-head-and-action-row-jump-12px-demo-to-practice-2026-09-29 (Kunal's N-lesson-3, 13 Sep 2026).*
As a player who taps "Now I'll try it", the board, the MOVES heading and the Analyze button stay exactly where they were, so my thumb does not miss.
- Across that tap the board's size and position, the MOVES head and the Analyze row are unchanged; the practice progress strip still shows, below the board. (TC-LS-039)

### US-R84 Copying the moves does not move Analyze
*Added #547, from jobs/copy-chip-flash-slides-analyze-under-the-finger-2026-09-29.*
As a player who has just copied the moves, Analyze is still exactly where my finger expects it, so a second tap does what I meant.
- While the copy acknowledgement shows, Analyze and the Copy chip keep their exact positions; the acknowledgement appears just above the chip. (TC-LS-040)

### US-R101 With no moves to copy, the Copy chip says so before I tap it
*Added #549, from jobs/copy-chip-flash-slides-analyze-under-the-finger-2026-09-29 (folded: jobs/copy-chip-is-a-live-control-that-does-nothing-with-no-moves-2026-09-29).*
As a player at the start of a lesson's practice, I can see that Copy has nothing to copy yet, rather than tapping a live-looking chip that does nothing.
- With no move played, the Copy chip is disabled and drawn dimmed, at its usual label and place, so the row does not move when the first move is played. (TC-LS-048)

### US-PL-17 In landscape, scrolling the side column never hides how the game ended
*Added #547, from jobs/the-landscape-result-line-lives-in-a-scroller-that-can-take-it-off-screen-2026-09-29.*
As a player who finishes a game holding the phone sideways and scrolls the side column to read further down, the line stating the result stays in view.
- After the game ends, the status row stays wholly inside the side column's visible window at every scroll position. (TC-PL-045)

### US-PL-18 The review of a game I just played says who I played and how it ended
*Added #547, from jobs/review-of-a-played-game-drops-the-result-and-the-opponent-2026-09-29.*
As a player who taps Review straight after a game, the summary names me and my opponent and states the result, as it does for a game I import.
- After resigning against the computer, the header reads "You vs <bot> · 0-1", not "White vs Black". (TC-PL-046)
- Under that header a line says how the game ended ("You resigned", "Checkmate", "Draw by threefold repetition"), and a game I resigned is not summed up as "a clean game". (TC-PL-063, #549)
- How it ended is the app's own note: the PGN I copy from the review, and the one put in the paste box, are plain PGN without it. (TC-PL-064, #549)

### US-R85 The review never calls a position level when it simply has no evaluation for it
*Added #547, from jobs/a-missing-eval-and-a-level-position-print-the-same-sentence-2026-09-29.*
As a player stepping through a review, "the position stays roughly level" means the position IS level, not that the app has no number for that move.
- A move with no stored evaluation gets no sentence about who stands better; a genuinely level position is still called level. (TC-R87)
- A capture that is taken back is called a trade only when it is like for like; one that gives more than it gets says what it gives for what ('gives up the bishop for the pawn'), and an even trade of unlike pieces names both. (TC-R113)

### US-R86 When the best line plays, the board stops marking the move I did not make there
*Added #547, from jobs/best-line-preview-keeps-the-played-moves-verdict-badge-and-square-tint-2026-09-30.*
As a player watching the engine's better line in a review, the board shows only that line: the verdict badge and coloured squares of my own move leave the board while it plays.
- During the best-line replay there is no verdict badge, and the last-move tint is on the line's own move in the plain colour. (TC-R88)

### US-R87 A run with a wrong move is not flawless, even after Try again
*Added #547, from jobs/try-again-clears-the-wrong-try-so-a-flawless-day-banks-on-a-run-that-was-not-flawless-2026-10-06.*
As a player working towards Mastered, a flawless day means a run with no wrong move, so the badge cannot be earned by playing a wrong move and tapping Try again.
- A wrong move, then ↻ Try again, then the line to the end, is not called flawless and banks no learned day. (TC-LS-041)

### US-PL-19 I can find every computer opponent, even the ones off the edge
*Added #547, from jobs/bench-play-bot-row-hides-a-third-2026-09-28 (the spec's US-R45 id is used elsewhere).*
As a player choosing a computer opponent on a phone, I can tell there are more bots to the right and reach the strongest one.
- While a bot is hidden past the row's edge, a "›" chip shows in the row; tapping it scrolls the row until the last bot is fully in view, and then it goes. (TC-PL-047)

### US-PL-23 A number the app shows about the computer opponent is the number it is set to
*Added #549 item (39), from jobs/bench-the-player-bar-prints-the-stale-bot-label-for-every-live-game-2026-10-08 (Kunal chose "name-stays" on questions/bot-strength-shown-on-tile-and-bar-2026-10-10); it carries the tile half of jobs/bot-tile-advertises-the-nominal-rating-while-the-live-strength-is-elsewhere-and-off-screen-2026-09-29. US-R10 covers the review branch of the same player-bar line.*
As a player against a named computer character, every strength the app prints for it - the player bar in a game and the selected tile on the New Game sheet - is the strength the computer is set to, which moves by 50 after each result; the character's name and face stay its own.
- For each of the five characters at 375x761 and 320x568: at the start, after a resignation, and in the next game started without tapping the tile again, the computer's bar prints exactly the stored strength (ct_elo), and on the reopened sheet the selected tile prints it too (after one loss from Pip both read 450). (TC-PS-044)
- Tapping a character's tile sets its starting number again, and a slider move off the ladder clears the character, so no tile claims a number. (TC-PS-044)
- The character blurbs do not track strength (Kunal accepted Pip reading "just learning" at any number). Only a loss is driven; the ladder line is symmetric, so a win changes no reader.


### US-PL-24 A video call that nobody answers gives up, and I can refuse calls once
*Added #550 item (87), jobs/video-call-timeout-and-optout (Kunal's Desk answers of 19 Sep 2026: Q-VC-2 '20 seconds', Q-VC-3 'switch', Q-VC-1 'never' a relay server; moved into scope on his word of 10 Nov 2026).*
As a player in an online game, a call I place that does not connect gives up after 20 seconds and tells me honestly that the other side may not have picked up or the call may not have reached them; I can switch off 'Let opponents video call me' so calls are declined without ringing; and a friend's invite link opens on the game itself.
- A call not connected after 20 seconds is hung up and the words name both possibilities. (TC-PL-068a)
- With the switch off an incoming call never rings and is declined; switched back on it rings, and the ring stops when the caller hangs up. (TC-PL-068b, TC-PL-068c)

### US-PL-25 A game I play from a set-up position is copied and reviewed from that position
*Added #550 item (88), jobs/a-game-played-from-a-set-up-position-is-reviewed-and-copied-without-a-fen-header-so-review-fails-at-move-1-2026-11-07 (found by #549's job 66, play lane).*
As a player who starts a game from a scanned board or from a position in Review, Copy gives me moves I can paste anywhere, and Analyze and Review open the game, because the start position travels with the moves.
- The copied moves carry [SetUp "1"] [FEN "..."] and are numbered from the position's own move number. (TC-PL-069a)
- Analyze and Review of that game reach the review instead of failing at move 1, and the review's PGN carries the FEN. (TC-PL-069b, TC-PL-069c)

### US-PL-26 An online game whose clock ran out ends by itself
*Added #550 item (101), jobs/online-clock-flag-fall-auto-end (Kunal's Desk answer 'it should be automatic', 22 Sep 2026; in scope on his word of 10 Nov 2026).*
As a player in an online game with a clock, when one side's time runs out and nobody taps Claim win, the game is recorded as a loss on time 15 seconds later by whichever phone has it open, so my games list never shows a finished game as still in progress.
- Opened by either player after the 15 seconds: the loss on time is written once; opened inside them: nothing is written until they pass. (TC-PL-070a, TC-PL-070b, TC-PL-070c)
### US-PL-27 A game turned sideways keeps the board the height of the screen
*Added #550 answer a23 (Kunal on the Desk, B10-Q23: "Option A: the board on the left, everything else on the right"; jobs/the-landscape-result-line-lives-in-a-scroller-that-can-take-it-off-screen-2026-09-29).*
As a player with the phone sideways, the board is the height of the screen and everything else - both players, the moves, the result and the buttons - sits on the right, so a finished game shows its result and its four buttons with nothing scrolled away.
- In a live game the board is at least 340 tall, both player bars sit on the right, and the right side does not scroll. (TC-PL-071a)
- At the end the board stays the same size and the right side shows the result (Checkmate, Black wins). (TC-PL-071b)
- Review, Rematch, New game and More are on screen, a thumb's size, and the bottom player is still on screen. (TC-PL-071c)
- No result card covers the board. (TC-PL-071d)

### US-R88 The grade table's White and Black headers sit over their own numbers
*Added #547, from jobs/review-grade-table-header-and-colour (part 1; the Excellent colour, part 2, is an amber product change left for the Desk route).*
As a player reading the grade table, each column's header is directly above its numbers.
- The White and Black headers are centred over the first row's digits, within 1px. (TC-R89)

### US-R89 The Layout readout's "screen" figure is the screen
*Added #547, from jobs/bench-the-layout-readout-row-labelled-screen-prints-the-inner-viewport-2026-10-07.*
As Kunal checking a layout dispute from a screenshot of the readout, the row labelled "screen" gives the device screen and the "inner" row gives the viewport the app lays out in, so the two numbers that started the 730-vs-761 argument are no longer the same number twice.
- Over a 375x812 screen with a 375x730 viewport, the readout prints "screen 375x812" and "inner 375x730". (TC-MN-048)

### US-R90 Signing in on another device never loses the games this one has reviewed
*Added #547, from jobs/the-cloud-sync-pull-writes-ct-gamestats-past-the-stamp-2026-10-09.*
As a player signed in on two devices, my reviewed-game tallies are combined when my progress syncs, not replaced by whichever copy happens to be longer.
- After a cloud pull, every game either copy held is kept, and where both hold a game, this device's entry wins. (TC-R90)

### US-R91 A lesson's intro card waits for me, and the demo waits with it
*Added #547, from jobs/lesson-intro-sheet-clears-itself-while-the-demo-plays-behind-it-2026-09-28.*
As a player opening a lesson, I can read its introduction at my own pace, and the demonstration does not start playing behind it.
- Untouched, the intro card is still up after six seconds and no demo move has been played; "Got it" closes it and the demo starts. (TC-LS-042; the card staying after a scroll or a drag is gate 74's F1 and F2)

### US-R92 A lesson tells me how far through it I am
*Added #547, from jobs/bench-lesson-no-progress-indicator-2026-09-28 (the spec's US-R4x ids are taken).*
As a learner part-way through a lesson, I can see which of my moves I am on and how many there are.
- Every practice note before the last move ends with "N of M", counting only my own moves, from the lesson's own start position. (TC-LS-043)

### US-R93 When importing from Chess.com fails, the app says why, and only blames the network when the network failed
*Added #547, from jobs/review-fetch-blames-the-network-for-an-empty-month-2026-09-28 (the job's TC-R36 id is taken).*
As a player importing my games, I am told the real reason nothing arrived: no such account, no games in the months searched, a Chess.com error, or no connection.
- Those four outcomes produce four different sentences; the no-games one does not mention the network or a sandbox; a real connection failure still says the app could not reach Chess.com. (TC-R91)

### US-R94 Finishing a drill is a moment, not an exit
*Added #547, from jobs/drill-past-the-last-mistake-drops-you-on-the-review-landing-with-nothing-said-2026-09-29.*
As a player who has just worked through my mistakes, Next on the last one tells me I am done and how many I fixed, and offers to go again or go back.
- Next from the last card keeps me in the drill with an end card saying "fixed X of N" (N the set I started with); Go again returns to card 1. (TC-R92)

### US-PL-20 A double tap cannot resign my game
*Added #547, from jobs/resign-double-tap-defeats-its-own-two-tap-guard-2026-09-29.*
As a player, resigning takes two separate taps; an accidental double tap on Resign only arms it.
- Two clicks 100ms apart on Resign do not resign; a second tap 700ms after the first does. Agree a draw has the same guard. (TC-PL-048)

### US-PL-21 Black pieces stand out from dark squares as designed
*Added #547, from the job on --pcfilter resolving to 'none' (item (160)).*
As a player, black pieces carry the faint light outline the app gives them, so they separate from the dark squares.
- Every black piece computes both white drop-shadows its style declares. (TC-PL-049)
- That holds on every surface a black piece is drawn on (the board and the captured-pieces bar), in every image piece set, and in the Medieval board skin, whose own dark shadow combines with the two white ones rather than replacing them. (TC-PL-049b, TC-PL-049c)


### US-PL-22 On a phone, Home and the menu sit in a top row of their own above the game

Kunal, 13 and 14 September 2026, then 'everywhere' on questions/play-top-row-home-and-menu-2026-10-10 and 'ship' on
questions/B8-CHROME-ROW (jobs/chrome-row-still-unbuilt-2026-09-28). Built at #548.

- On every phone, in a live and a finished game, Pass and Play and vs Computer, the Home and Menu controls are in a row of
  their own at the top - not inside the top player bar - each at least 44px wide and the element under its own centre. (TC-PL-057)
- The middle of that row is the screen's one status line: the app name, then the opening once it is named, 'thinking',
  'Check!' or the result - so nothing on the screen says the opening twice and no blank band sits under the row.
- The move list is painted in exactly one place, the Moves box below the board; the strip that repeated the last moves under
  the board is gone. In landscape the side rail is unchanged.
- The Moves box's MOVES label keeps a gutter from the screen edge - at least 11px, as vs Computer - in Pass and Play too, where
  the board and so the Moves box run edge to edge (#549, from the #547 auditor's P2). (TC-PL-060)
### US-R95 The verdict word on the board is never covered by its own badge
*Added #547, from the job on the round verdict chip painting over the word pill (item (170)).*
As a player stepping through a review, "Blunder" and "Brilliant" on the board read in full.
- At every ply where the board shows both the round badge and the word pill, they do not overlap. (TC-R93)

### US-R96 On the analysis board the engine's line is numbered from the position I am looking at
*Added #547, from the job on the analysis engine line keeping the entry ply's move number (item (171)).*
As a player trying moves on the analysis board, the engine's suggested line carries the right move numbers for the position on the board.
- After 1.e4 e5 played on the analysis board from the start, the line begins "2. ...". (TC-R94)

### US-R97 While my games are fetched, the Review screen says what it is doing
*Added #547, from jobs/review-entry-costs-seven-requests-and-623kb-with-no-progress-shown-2026-09-29 (item (166), direction (a)).*
As a player opening Review with an account connected, I see what the fetch is doing while it runs, and not only a collapsed button.
- While Chess.com months are read, a status line names the month being read, of how many at most, and the games found so far. It
  is gone when the walk ends. Lichess shows a single line for its one request. (TC-R95)

### US-R98 The drill card tells me only true things
*Added #547, from jobs/drill-small-truths-solved-before-and-missing-played-2026-09-28 (item (164)), with the folded-in
solved-before-chip-paints-on-a-first-solve-2026-10-02.*
As a player drilling puzzles and my own mistakes, nothing on the card is false.
- A puzzle I have never solved shows no "solved before" chip, before or after I solve it this time. (TC-R96)
- When my mistake was saved without the move I played, the goal line reads "your move here was a blunder", not "you played
  here, a blunder". (TC-R96)
- When the best move is an en-passant capture, the hint says there is material to take, not that there is no tactic. (TC-R96)


### US-R99 From a drill card I have solved, I can take over the board and work the position out myself
*Added #548, from jobs/analyze-this-position-from-the-drill-2026-09-23 and Kunal's answer 'analyse (Let Review analyse it)' on questions/B8B-DRILL-POSITION (4 Nov 2026).*
As a player who has just found the move, I can open that card's position on the review's analysis board, try the move I was
actually considering, see what the engine says, take it back, and come back to the same card without losing my place.
- Only a solved card offers it; on an unsolved card it would hand me the answer. (TC-R106)
- It opens on exactly the card's position, the same side to move, with the engine on; I can move either side, take back, and reset to the card's position. (TC-R106)
- The way back lands on the same card, the same number out of the same total, still solved. (TC-R106)
### US-R100 When my mistakes list is full, nothing I have not yet seen goes first
*Added #549, from jobs/mistakes-pool-evicts-the-tail-the-drill-starts-at-the-head-2026-09-28 and Kunal's default on questions/B8-SMALL-DEFAULTS (2), 4 Nov 2026: when the list is full it drops ones already practised first, then the oldest.*
As a player who reviews more games than I drill, my mistakes list holds at most 150 positions, and when it is full the ones the drill has already shown me go first, then the oldest, so a mistake is not lost before I have seen it while a practised one could go instead.
- Every position the drill shows me counts as practised, the first card of a session included. (TC-R108)
- The 150 limit holds however the list arrives - from a review, or already stored over the limit by an earlier build - by the same rule. (TC-R108)
- The count I am offered is the positions the drill can play; a saved position it cannot play is kept, not deleted, and when none can be played the card and a tap on it say so and why. (TC-R177)
### US-R102 A figure the app prints about itself is the figure the device reports
*Added #549 item (59), from jobs/bench-no-gate-asserts-any-figure-the-layout-readout-prints-2026-10-07: the general clause that job drafted as TC-MN-041. US-R89 (the screen row) and US-PL-23 (the opponent's strength) are instances of it.*
As Kunal settling a layout or strength question from a screenshot, every number the app prints about the device, the page or itself is the number the device or the app's own configuration holds at that moment, so a screenshot of a readout can be believed without re-measuring it.
- The Layout readout's screen, vw, dpr, inner, visual-viewport and safe-inset figures each equal the page's own value read at the same moment, its board, square and gap agree with each other and with vw, and its build equals the stamp on the served bundle, at 375x761, 375x730 and 320x568. (TC-MN-042)
- A figure with no independent truth on the screen that prints it (the tile-ink ratios, which measure an unpinned font; the mode and eval rows) is excluded by name and says why, rather than counted as checked. (TC-MN-042)
### US-R103 Each opening is taught once, and what I studied under an old name stays mine
*Added #549 item (65), from jobs/the-openings-list-carries-petrov-and-petroff-as-two-adjacent-lessons-2026-10-04, built to the orchestrator's ruling of 4 Nov 2026 (Petroff survives, progress migrates). A clause about the lesson REGISTRY, not the list's rendering, as the job asked.*
As a learner browsing the openings, I see each opening as one lesson, and nothing I banked on a lesson that was merged into another is lost.
- The Openings list offers the Petrov/Petroff opening once, as "Petroff (Russian) Defense". (TC-LS-049)
- Days banked and drill records kept under the removed name move onto the survivor with no day lost, and the last lesson I opened still opens the same lesson. (TC-LS-050)
- That holds on a new phone too: a last lesson pulled from my account, saved by a build that still had both lessons, opens the same lesson there, and one saved by this build is not moved twice. (TC-LS-052)
- The same holds for the four other pairs that taught one line twice (#550 answer a13, the orchestrator's ruling a13): "Closed Sicilian", "Sicilian Dragon", "Sveshnikov Sicilian" and "Marshall Attack" are each taught once, "Sicilian: Closed", "Sicilian: Dragon", "Sicilian: Sveshnikov" and "Ruy Lopez: Marshall Attack" are gone, and what I banked under them moved with them, on this phone and on a new one. (TC-LS-049, TC-LS-050, TC-LS-052)

### US-R104 The review transport row's icons are the buttons, and every one is still a thumb-sized target
*Added #549 item (68), from jobs/transport-row-icon-only. Kunal, 2026-09-19: "do we need the outline, or can we just make the icons look like buttons themselves to save space".*
As a player stepping through a review on my phone, the first, play, last and key-moment controls under the board are bare icons on a flat tint, with no outline, gradient or shadow, and each is still at least 44 x 44 so my thumb lands on it; the board is not made smaller to pay for it.
- At 375x761, 320x568, 375x730 and 390x844 every control is at least 44 x 44, carries no border, gradient or shadow, hit-tests to itself at its centre, and the board keeps its width. (TC-R114)
### US-R105 A move is Brilliant by one rule, the reason names what I gave, and no stored verdict changes behind my back
*Added #549 item (28), from jobs/one-brilliant-rule-with-its-sentence-replaces-twelve-items-2026-11-03 (Kunal: the needed test at about +7, 4 Nov 2026; "recompute (Grade them again, show me the changes first)", 4 Nov 2026). Shipped switched OFF (BRIL_RULE_DEFAULT 1) until he has seen the 124 Brilliants it adds across his 196 chess.com games; flags/amber-549-one-brilliant-rule-ships-off.*
As a player who also reviews on chess.com, a move of mine is Brilliant when it is sound, gives up real material (the piece I moved or one I leave hanging), leaves me no worse than about a pawn down, and was needed (the next best move would not already have won easily, at +7); the reason says which piece I gave and for what; and when the rule changes, the app shows me every Brilliant that comes or goes before it changes any.
- A piece left en prise elsewhere is a sacrifice, unless I was answering check. (TC-R122, TC-R123)
- The needed test is +7 in the mover's own frame, both colours, and a move with no second choice is needed. (TC-R124)
- About -1 after the move is the floor; who was winning before the move does not gate it; the soundness cap is unchanged. (TC-R125)
- The reason names the piece and what it took or where it stood, never calls it a trade, reads in my own frame, says mate in words, and names both targets of a fork. (TC-R126)
- The thirteen Brilliants chess.com found in my games are Brilliant on the app's own engine. (TC-R127)
- A stored review graded by an older rule is graded again from its own engine output, and every change is listed game by game and move by move in a "Grading changed" sheet; Update applies them and Not now keeps everything; a game with no stored engine output waits for its next review. (TC-R128, TC-R129, TC-R130)

### US-R106 The review shows me where a brilliant move was there and I did not play it, and Show me plays it
*Added #549 item (29), from jobs/show-where-a-brilliant-move-was-available-and-the-player-did-not-play-it-2026-10-11 (Kunal, 11 Oct 2026; his answer on questions/B9-MISSED-BRILLIANTS, 5 Nov 2026: "A marker, and Show me plays it"). Shipped switched OFF (MISSED_BRIL_DEFAULT false) until he has seen the list of every missed brilliant it would mark across his games (the job's missedBrilliantsList_549); flags/amber-549-missed-brilliant-marker-ships-off.*
As a player reviewing my own game, at a move of mine where the engine's best move would itself have been Brilliant and I played something else, the review says so on that move and lets me watch the brilliant line, so I learn the sacrifice I walked past.
- A missed brilliant is the engine's best move graded by the same Brilliant rule the app grades every played move by, as if I had played it (loss 0, the position's own eval, the second line as the next best); a move I found, or a different Brilliant I played instead, is not a miss; the needed test applies. (TC-R133, TC-R134, TC-R135)
- On that move the move line carries "!! missed <move> >" in the place of the best-move button, and a tap plays the brilliant line on the board; the move strip marks the move (!!) and the eval graph rings it. (TC-R136)
- My opponent's moves carry no mark, under rule 1 nothing that only rule 2 calls Brilliant is marked, and with the switch off nothing is marked. (TC-R137)
- *#550 item (18):* the marker is on by default with its switch on the New features section, and marks only a clear miss, half a pawn or more; every position where I had a Brilliant and played something else goes into the brilliant-moves drill, asking me to find it. (TC-R137, TC-R195)

### US-R108 My mistakes drill grades the move I play, and says which kind of move it was
*Added #549 item (97), from jobs/drill-accepts-one-move-only (Kunal, 2026-09-20: "there can only be one best move"; his design the same day: "tell them what category it is in ... this is the absolute best move in the position, or this is better but there is an even better move, can you find it. And we should explain why"). Rebuilt from #459's held tree (67ca361), with the review's win-percentage ladder and the float-and-scroll verdict box.*
As a player drilling my own mistakes, any legal move I play is graded by the review's own ladder against the best move of the same search: a move as good as the stored one solves the card, and the answer says which kind of move it was and why; a Good move is told there is more here and asked to find it without being shown the answer; a worse move is told its grade and where it leaves me, never the stored move; and a Lichess puzzle still has its one intended line.
- An equal alternative is accepted with its grade and a reason, keeps the card in my list, and a real solve still removes it; three different wrong moves get three different sentences; a sub-Excellent move neither reveals nor solves. (TC-R147)
- The grade is honest: both sides of the comparison come from one ranking, so no move is Best because of a clamp; a card whose stored move that search cannot recognise, and the move I played in the game, fall back to the plain answer; a forced-mate card names the mate. (TC-R146, TC-R147)
- The verdict never moves the board and is always readable, scrolling inside its box when long, at Kunal's phone and THE DRILL SEVEN. (TC-R147)
- Until Kunal turns it on, the grading is switched off (#549, after job (106) measured the shallow grade disagreeing with the review on 84.8% of 132 cards): by default the drill accepts only the stored move and answers any other move with the same "isn't it" sentence it always gave, on the first and the second try, and keeps the card; the local switch ct_drill_grade set to 1 turns the grading above on. (TC-R146, TC-R147)
- *Added #550 item (51), Kunal's B9C-DRILL-GRADE answer 'review-two' ("Also accept the review's second move when it is nearly as good") and B10-SHIP-ON:* with the quick grade still off, a card from my own game also accepts the move the review ranked second there, when the review itself rated it Excellent or better; the answer names its band and the review's first choice, the card stays in my list so the first choice is still drilled, and its own switch in New features turns it off. A Lichess puzzle still rejects every move it does not store. (TC-R179)

### US-R109 The same game gets the same review on any phone, however busy it is
*Added #549 item (30), from jobs/review-accuracy-and-grade-counts-depend-on-machine-load-2026-10-04 (the job's storyClause: "the review's accuracy, grade counts and any rating derived from them are determined by the game alone, and are identical for the same PGN on any device and under any load").*
As a player who reviews a game, perhaps on a slow or busy phone, the accuracy, every grade and every count I am shown depend only on the game: the same PGN gives the same review whatever else the phone is doing, however many engine workers it has, and whether or not the engine was quick to load.
- A review asked for while the engine is still loading waits for it and is graded by it, never by a different engine because it was slow. (TC-R148)
- A search the engine has not finished is searched again, never graded from its partial answer, and a search that is slow but still working is waited for. (TC-R149, TC-R150)
- With no review-pool worker, the review on the one remaining engine worker is the same review. (TC-R151)
- A phone with no Stockfish at all is graded by the built-in engine; that is a different grader, and this story does not cover it.

### US-R112 Each brilliant move is named by the kind of sacrifice it is, so I can learn a kind I have not played
*Added #549 item (35), from jobs/brilliancy-library-and-motif-coverage-2026-09-23 (Kunal, 23 and 30 Sep 2026: his brilliant moves are "pretty much similar stuff ... create a battery with the bishop and then sac the bishop on the pawn", and he wants to pick "two or three different kinds of brilliance"). Work items 1, 3 and 4 only: the tagger and the measurement on his own recorded games. Nothing on screen shows a motif yet; the library, its store and its chooser wait on his word on the measurement.*
As a player who keeps finding the same brilliant move, every Brilliant move is named by its kind - a greek gift (a bishop taken on a pawn next to my opponent's king), a queen or exchange sacrifice, a quiet sacrifice, an underpromotion, a fork, a discovered check, and a smothered, back-rank or other mating attack when the line ends in mate - each with how sure the name is, and a move no rule fits is called a plain sacrifice rather than a guess.
- One fixture per kind, and a bishop on a pawn two squares from the king (his Bxh6, Bxg6, Bxh3) is the greek-gift family at medium. (TC-R169, TC-R170, TC-R171)
- A plain good move earns no name, a bishop for a pawn far from the king is not a greek gift, a capture that gives nothing away is not one either, and a line that does not end in mate is never a mating attack. (TC-R172)
- Over his 196 recorded chess.com games since 1 Sep 2026, under the rule the app grades by his 20 brilliants span 4 kinds and 9 are the greek gift; under the one rule (off) his 81 span 6 and 17% are. (TC-R173)

### US-R110 My review calls an opening move Book when it is a known opening, by position, however I got there
*Added #549 item (98), from jobs/opening-book-coverage-gap (Kunal, decisions/desk-round-1-2026-09-19 d05: "Widen the opening table, KEYED BY POSITION rather than by move prefix, so it survives transpositions").*
As a player reviewing a game (with the opening list switched on), the opening moves that reach a known, named opening position are marked Book and left out of my accuracy, whichever move order got me there, including openings the lessons do not teach such as 1.b3.
- Book is the larger of the lesson lines' move prefix and the last of the first 24 positions that ends a named line of the vendored opening list (lichess-org/chess-openings, CC0), keyed by board, side to move and castling. (TC-R156, TC-R157, TC-R159)
- On the seven answer-key games my Book count is within one ply of chess.com's on at least five, never more than one ply longer, and never shorter than the lessons alone gave. (TC-R158, TC-R161)
- It ships OFF until Kunal has seen what it does to accuracy (the #549 cut-line ruling): with no switch set Book is the lesson lines alone, exactly as before, and ct_book_table='1' turns the list on. (TC-R160, TC-R161)

### US-GL-02 The Preview gallery's controls are big enough to hit, its exit above all
*Added #547, from jobs/gallery-sub-44px-controls-including-its-only-exit-2026-10-01 (item (174)).*
As the person asked to record from the Preview gallery on a real phone, I can hit every one of its controls with a thumb, and
above all the one way out of it.
- The gallery's close control is at least 44x44, and every full-width action button on it is at least 44 tall, at 320x568,
  375x730 and 375x568. The header row does not grow to pay for it. (TC-GL-004)

### US-R74 Only my own accounts feed my drills
*Added #547, from jobs/games-list-card-whose-game-and-layout-2026-09-21 and Kunal's Desk answer 'per-account' on drill-own-games-only (22 Sep 2026).*
As a player who imports other people's games to look at, I mark which imported accounts are mine, and only mine feed my
mistakes drill and my brilliant moves - so the drill never asks me to find a move in a game I did not play.
- Each imported account carries a switch reading "mine" or "not mine". Every account starts as mine - the app cannot tell
  my accounts from anyone else's - and one tap flips it. (TC-R74)
- Reviewing a game from an account marked not mine adds nothing to either pool; the same game from an account marked mine
  does. (TC-R74)
- With more than one account imported, each game card names the account it came from, in the slot the site name used, at
  no extra height.


US-SC-01  **As a player who photographs a real board, I need it never set up the wrong way round.**
*Added #549, from jobs/scan-orientation-double-check (item (67)) and Kunal's Desk answer "double" (decisions/desk-round-1-2026-09-19). Amber: flags/amber-549-scan-ask-which-side. Its cases live only in gates/regress/28-scan-client.js, the TC-SC space having no register rows (claude/stories/README.md).*
I get the position that was in front of me - not its mirror, which is just as
legal and which nothing downstream can catch when the photo was taken from the other side.
- The app reads the photo twice, once as shot and once turned 180 degrees, so one photo is two reads. (TC-SC-014, TC-SC-039)
- When both reads give the same position it is set up at once. (TC-SC-040)
- When they disagree, or only one of them reads, nothing is set up until I say which side of the board the camera was on,
  White's or Black's; my answer sets up that reading, and the question then goes. (TC-SC-041 to TC-SC-047)
- When neither reads, I am told why, as before, and asked nothing. (TC-SC-048)
- When the first read fails outright but the turned one reads, I am not told it failed: I am asked which side the camera was on, as when they disagree. (TC-SC-049)

### US-R113 On Review, Next is never under my thumb when I reach for the star
*Added #550 item (2), from jobs/review-star-button-sits-on-the-next-move-arrow-so-next-taps-hit-the-star-2026-11-11 (Kunal, 11 Nov 2026: "I keep trying to hit next move and end up hitting the star button").*
As a player stepping through a reviewed game, the move strip's next arrow and the next key moment star are far apart, because the move's explanation sits between the button row and the move strip, so a tap on next moves one move.
- The order is the button row, then the move line with its explanation, then the move strip, and the star and the next arrow are at least 40pt apart. (TC-R176a, TC-R176b)
- A tap at the centre of the next arrow lands on it and moves the board exactly one move, at 375x761 and 320x568. (TC-R176c)

### US-R114 In a drill I can go straight to a card by its number
*Added #550 item (22), from jobs/the-brilliant-moves-drill-jumps-to-a-number-from-its-counter-2026-11-11 (Kunal, 11 Nov 2026: "a way to jump to a specific number so we don't have to hit next next next 50 times"), the scope added on 30 Sep to jobs/drill-needs-a-previous-card-2026-09-23 and dropped when it closed.*
As a player with dozens of cards in the brilliant moves drill or the mistakes drill, I tap the counter ('8 of 36'), choose a number, and the drill shows that card; Prev and Next work on from there.
- In both drills, at 375x761 and 320x568, the counter opens a chooser with every number at least 44 by 44, choosing the last shows it, and Prev steps back one. (TC-R178)

### US-R115 A game I have reviewed opens again without a second engine pass
*Added #550 item (79), jobs/precompute-reviews-while-the-app-is-open-2026-09-23 part (2) (Kunal, 23 Sep 2026, on reviewing his pulled-in games: the job's step 1, "cache every review he actually runs").*
As a player who reviews many games, every review I run is kept on this phone, so reopening an older one is instant instead of a fresh engine pass; only when the phone's storage is full do the reviews I have not touched for longest make room, and never the one I just ran.
- With 30 older reviews cached, a new review leaves all 31 cached (it used to keep 24). (TC-R182a)
- With storage full and fewer than 24 reviews cached, the review just run is kept and the least recently touched ones are evicted to make room. (TC-R182b)

### US-R116 An old drill card gives a hint about its own position
*Added #550 item (89), jobs/a-legacy-drill-card-with-no-stored-hint-shows-a-generic-look-for-the-most-forcing-line-that-misdirects-on-quiet-cards-2026-11-07.*
As a player drilling mistakes saved before hints were stored, the Hint on such a card names the shape of its own position, as a newly saved card does, and never sends me looking for a tactic on a quiet card.
- A legacy card with no stored hint: quiet - "No tactic to spot here"; forcing - the line "ends the game"; never "Look for the most forcing or solid option". (TC-R183a, TC-R183b)

### US-R117 While a review waits for the engine, the screen says so
*Added #550 item (90), jobs/a-review-can-wait-up-to-120s-for-stockfish-with-no-visible-waiting-state-2026-11-07 (#549 antagonist B's B3).*
As a player starting a review on a busy phone, when the review waits for Stockfish to load (up to two minutes, so every move is graded by the same engine) the screen tells me it is loading the engine and counts the seconds, instead of a progress line frozen at 0%.
- While the engine loads, the analysing panel reads "Loading the Stockfish engine… Ns" and the count rises; once the engine is served the review completes. (TC-R184a, TC-R184b)

### US-R46 Where the app holds a rating for a game, its review shows it
*Added #550 item (93), jobs/played-game-review-shows-no-rating-though-the-app-holds-one-2026-09-28 (the clause spec-c reserved on 28 Sep 2026; it extends US-R18 and does not contradict Kunal's 'show nothing where it does not carry one').*
As a player reviewing an online game I just played, the review summary shows the ratings the player bars showed for the same game; for a game against the computer or Pass & Play, which carry no rating that means anything, what to show is Kunal's call and is not part of this clause.
- An online game's review summary shows the White and Black ratings the player bars printed, side for side. (TC-R57)

### US-R118 On the review summary my side is always the left column
*Added #550 item (94), jobs/the-review-summary-puts-kunal-on-the-left-whichever-colour-he-played-2026-11-11 (Kunal, 11 Nov 2026: "I should always be on the left respect of whether or not it's black or white"; AUD-R08).*
As a player reviewing a game I played as Black, my accuracy card, my count column and my Skills column are on the left, as they are when I play White; a game with no side marked mine keeps White then Black.
- Reviewed as White: White's card and columns first; reviewed as Black: Black's first. (TC-R185a, TC-R185b)

### US-R119 Stepping fast through a review never crashes the engine
*Added #550 item (97), jobs/the-main-engine-worker-still-posts-go-before-the-stopped-search-answers-in-the-eval-bar-and-play-2026-11-07 (#549 antagonist A, A2-R3).*
As a player tapping quickly through my moves, every engine waits for its last search to answer before it is asked again, so the engine never traps and the eval bar keeps working.
- No worker is sent 'go' while its last search has not answered, on a fast Review walk and in Play, and no engine traps. (TC-R186)

### US-R120 Each game on my games list shows Brilliant, Best, Great and Blunder
*Added #550 item (73), jobs/opponent-brilliancies-on-the-games-list-2026-09-30 (Kunal's answer a9 on build__1794388896663-q9, 11 Nov 2026: "Four numbers. Each game row shows four separate counts, Brilliant, Best, Great and Blunder, each matching the game summary, with Brilliant kept below Won").*
As a player looking down my games list, each reviewed game shows its Brilliant count in the pill below the result, then its Best, Great and Blunder counts, each the number the game's summary shows for my side.
- A reviewed game's four counts are the summary's own, book moves kept out as the summary keeps them, and the row prints them. (TC-R187a)
- The counts are ★ Best, ! Great and ?? Blunder on one line, with no Mistake count, at 375x761 and 320x568. (TC-R187b)
- A game counted before the split shows one combined ★! count until it is graded again, never a guessed split. (TC-R187c)

### US-R121 When I import an account I am asked once whether it is mine
*Added #550 answer a19, jobs/follow-a-player-not-reimport-2026-09-23 (Kunal on build__1794388896663-q19, 11 Nov 2026: "Ask once when an account is imported whether it is his").*
As a player who imports a friend's account as well as my own, I am asked once, when it is imported, whether the account is mine, so a friend's games never feed my mistakes drill or my brilliant moves unless I say they are mine.
- A newly imported account is asked about under the Import box, with Yes and No at a thumb's size, at 375x761 and 320x568. (TC-R188a)
- No switches it off, as its chip's switch does, and Yes keeps it mine; either way the question goes and a re-import does not ask again. (TC-R188b, TC-R188c)
- An account imported before this question existed is never asked. (TC-R188c)

### US-R122 The lesson's Analyze and Copy are small icon buttons I can still tap easily
*Added #550 answer a6, jobs/copy-chip-flash-slides-analyze-under-the-finger-2026-09-29 (Kunal in chat, 11 Nov 2026: "Analyze and Copy become small icon-only buttons that keep a full-size tap area (44 points)"; where they sit waits on run question q34).*
As a player at a lesson's moves row, Analyze and Copy are small icons rather than worded pills, so the row stays quiet, and each still takes a full-size tap without stealing the other's.
- Each draws an icon and no words, and says what it is to a screen reader, at 375x761 and 320x568. (TC-R189a)
- Each tap area is at least 44 by 44 while the visible chip is at most 32 wide. (TC-R189b)
- The two tap areas do not overlap. (TC-R189c)

### US-R123 When a review cannot finish, it says so and lets me try again
*Added #550 answer a32 (Kunal on build__1794388896663, 11 Nov 2026: "a short message with Try again and Back to games when a review's analysis fails, as in your mockup (550-136-k14-2)").*
As a player whose review's engine stops answering partway, I am told the review stopped and that it was not my doing, with Try again and Back to games, instead of a progress screen that never ends or a review graded from nothing.
- The panel says "The review stopped before it finished." and "The engine stopped answering. Nothing you did caused it.", and no review summary is shown. (TC-R190a)
- Try again and Back to games are on screen and a thumb's size, and the progress line is gone. (TC-R190b)
- Try again reviews the same game again from the start. (TC-R190c)
- Back to games returns to the Review screen. (TC-R190d)

### US-R124 Finishing another lesson lets me bank a lesson again today, and a clean hints-on run offers to bank it
*Added #550 answer a33 (Kunal on build__1794388896663-q33, 11 Nov 2026: "build both. Finishing a different lesson can bank the day, and after a clean run with hints on a line suggests a hint-free run to bank it"; FEEDBACK-INBOX 12 Sep 2026).*
As a player practising lessons, a lesson I banked today banks again once I have finished a different lesson since, instead of waiting for tomorrow; and after a run with no mistakes but the hint on, Complete! offers to bank it with the hint off.
- With no other lesson finished since today's bank, the line does not bank again and the message says to finish a different lesson first. (TC-R191a)
- With another lesson finished after today's bank, the line banks another day today, which counts toward Mastered; each later bank needs another lesson finished in between. (TC-R191b)
- A bank stored before this change waits for tomorrow, as it did. (TC-R191c)
- A clean hints-on run offers "Bank it" in the lesson row; it restarts the line with the hint off, and a clean run then banks. (TC-R191d)

### US-R125 On my phone the review is the streamlined view: the board edge to edge and the move list right under it
*Added #550 answer a21 (Kunal on the Desk, B10-Q21: "Option B: the move list under the board"; jobs/a-streamlined-board-view-like-chesscoms-2026-11-11).*
As a player reviewing a game on my phone, the board is as wide as the screen with the eval bar above it, the move list sits right under the board, then the move's explanation, and Back, Key move, Analyze and Forward are at the bottom, like the chess.com view I asked for.
- The eval bar is above the board and the board is the screen's full width on my phone. (TC-R192a)
- The move strip is straight under the board's bottom player bar, and the explanation under the strip. (TC-R192b)
- The bottom toolbar is Back, Key move, Analyze and Forward, each a thumb's size, with the star never beside Forward. (TC-R192c)
- A header with back, Game Review and more is there when the screen is tall enough; on a short screen they stay in the top player bar. (TC-R192d)
- The board does not move between moves or in and out of analysis; switching the engine line off puts it back exactly. (TC-R192e)

### US-R126 When a drill's explanation is longer than its box, I can tell, and I can read the rest
*Added #550, AUD-R13 of the app audit (P1); Kunal's ruling on this box: "Don't change the size just allow the player to scroll through the text".*
As a player who solved a drill card, a long explanation keeps its box's size but shows that there is more, and one tap scrolls to it, so I never read a sentence cut off with no sign of the rest.
- An explanation longer than its box shows a "more" chip inside the box, a thumb's height. (TC-R193a)
- Tapping it scrolls the explanation. (TC-R193b)
- Solving the card does not move the board. (TC-R193c)

### US-R127 The app calls a move Brilliant when chess.com would, and misses none of chess.com's
*Added #550, item (17), jobs/one-brilliant-rule-with-its-sentence-replaces-twelve-items-2026-11-03; Kunal's answers B9C-BRIL-RULE2 "on" (on now, then trim: miss none, few extras) and B10-SHIP-ON "on"; rule 3 of docs/brilliant-rule-3-design-2026-11-10 at its recommended dial.*
As a player reviewing my games, a sacrifice that is sound and leaves me not worse is Brilliant, whether I gave the piece on the square I moved to or left one hanging elsewhere, so the app finds the Brilliants chess.com finds; and a move that only looks like one is not.
- Rule 3 is the app's rule by default, and the menu's New features section has its switch. (TC-R194a, TC-R194k)
- A move that costs an Inaccuracy's worth of win chance is never Brilliant. (TC-R194b)
- A piece left hanging while I rescue another that was attacked is not a sacrifice. (TC-R194c)
- The third move in a row that leaves the same piece is not a new sacrifice. (TC-R194d, TC-R194i)
- Nothing given while answering a check counts, except a counter-capture under a forking check that is clearly the best move. (TC-R194e, TC-R194g)
- A piece that was already lost counts only when the move is clearly the best. (TC-R194f)
- The thirteen named chess.com Brilliants stay Brilliant. (TC-R194h)

### US-R128 My moves are graded the way chess.com grades them
*Added #550, item (20), jobs/reconcile-kevitsch-review-vs-chesscom; Kunal's answers B9C-GRADE-BEST ("what does chess.com do? Align wiht them"), B9C-GRADE-GREAT "narrow" ("match to chess.com"), B10-SHIP-ON "on"; the rules of docs/grade-boundaries-design-2026-11-10.*
As a player comparing my review with chess.com's, Best means the engine's own move, Great means the only good move, Miss means I let my opponent's mistake go, Forced means I had no choice, and the other grades follow chess.com's bands, so the two reviews tell the same story.
- The grades are on by default, with a switch on the menu's New features section, and stored reviews are graded again. (TC-R196a, TC-R196h)
- A move that is not the engine's is Excellent at best, and the bands are 3, 6, 10 and 25 points of winning chances. (TC-R196b)
- A move with no alternative is Forced, even in the opening book. (TC-R196c)
- Great needs the second-best move to be clearly worse, and a plain recapture is never Great. (TC-R196d)
- Miss needs the opponent's previous move to have been an error and mine to have let it go while I am not lost. (TC-R196e, TC-R196f)

### US-R129 I practise my Brilliants by kind, the ones I played and the ones I missed
*Added #550, item (21), jobs/brilliancy-library-and-motif-coverage-2026-09-23; Kunal's answer B9C-BRIL-LIBRARY "now" (his chat words: "figure out the styles of the brilliant that it identifies"; on practising them by kind with the ones he missed, "Yes, I would like to see those") and B10-SHIP-ON "on".*
As a player who keeps finding the same Brilliant, I see my Brilliants and my missed Brilliants grouped by kind and practise two or three kinds at a time, so the drill stretches me instead of repeating the move I already know.
- The tile counts the Brilliants I found and the ones I missed apart. (TC-R197a)
- It opens a library of two shelves, each listing its kinds with their counts, every kind a 44px chip. (TC-R197b, TC-R197c)
- I can choose up to three kinds, and tap one off again; the button says how many cards I will practise. (TC-R197d)
- The drill then runs on the chosen kinds only. (TC-R197e)
- With one kind on one shelf, or with the switch off, the drill starts at once as before. (TC-R197f)

### US-R130 Against the computer my board is edge to edge, with the eval bar above it
*Added #550, item (64) move 1, jobs/board-is-too-small-against-chesscom-2026-09-23; Kunal's answer B9C-BOARD-SIZE "all-three: also move the eval bar above the board". The job reserved US-R38 and TC-R48, both taken long before (#496, #476), so the ids are new.*
As a player in a game against the computer, I see the board as wide as my phone, as chess.com shows it, because the eval bar sits above the board instead of taking a strip beside it.
- On a fresh store the bar is above the board and the board is the full width, at 375x761, 375x730 and 430x932. (TC-R198a)
- A store that kept the bar beside before #550 has it above once, and its board is edge to edge. (TC-R198b)
- The menu's Eval bar row still puts it beside, and that choice stands. (TC-R198c)
- Where the board is limited by height (320x568, 375x667) the bar above makes it smaller, and on every screen the board starts lower; that cost is his to judge (run question q35), and no case asserts it either way.

### US-R131 In both drills the five controls share one row, so the board takes the height
*Added #550, item (66), jobs/the-mistakes-drill-board-is-not-full-size-2026-11-11 (the audit's AUD-R12); Kunal: the mistakes drill board edge to edge, as in the brilliant moves drill.*
As a player practising my mistakes or my Brilliants on a small phone, I see the board as large as the screen allows, because Hint, Show move, Reset, Prev and Next sit on one row under it instead of stacking.
- The five controls sit on one row in both drills, at 375x761 and 320x568. (TC-R199a)
- Each is a 44pt tap target, on screen, takes a tap at its centre, and shows no cut label; under 430 wide Hint, Show move and Reset show their icon only, under the same accessible names. (TC-R199b)
- The board is 375 wide at 375x761 in both drills; at 320x568 the brilliant drill's is 320 (edge to edge) and the mistakes drill's 288, fitted to height under its three-line goal, where it was 192. (TC-R199c)

### US-R132 A wrong move on Puzzles or in the drill says why it was worse
*Added #550, item (24), jobs/pz-one-message-slot-overwrites-the-hint-2026-09-28 and its folded lead jobs/wrong-move-line-says-why-instead-of-isnt-it-try-again-2026-10-13; Kunal's Desk answer say-why, 13 Oct 2026.*
As a player who has just played a wrong move, I am told in one short line what the move allows, so the next try is better informed than the last.
- From the board alone: the reply that mates, the moved piece left en prise, or another piece left en prise, each named with the capture that takes it ("Re7 hangs the rook (Rxe7)"). (TC-R200a)
- Otherwise from the engine's reply, described by what the board proves after it or by the engine's own score in the drill's band words; the two benchmark positions read differently ("cxb5 allows Bxb5+ and leaves you losing", "Nxd7 allows mate in 2 (Qb8+)"). (TC-R200b, TC-R200d)
- On Puzzles the line fits its one-line row. (TC-R200c)
- Where no reason exists the line stays as it was; a miss is never blank. (TC-R200e)

