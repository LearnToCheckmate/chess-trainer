# Chess Trainer user stories

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
- A checkmate is written 1-0 / 0-1 in the eval label, never M0 (#371). (TC-R09)

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
