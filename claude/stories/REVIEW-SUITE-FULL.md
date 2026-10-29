# Review screen: the FULL suite (US-RFnn / TC-RFnn). A specification, not the executed suite.

> Landed in the repository by patch-reconcile-2026-09-22 (tracker docs/patch-reconcile-2026-09-22, job
> reconcile-document-homes), from the claude.ai project copies of claude/stories/USER-STORIES.md and
> claude/stories/TEST-CASES.md, which are now frozen as history. The ONLY change from those copies is the id
> rename the repository's own register reserves (claude/stories/README.md, row `US-RFnn` / `TC-RFnn`):
> US-Rnn -> US-RFnn and TC-Rnn -> TC-RFnn, applied mechanically to every id in the text, so that no id here
> collides with the executed suite in USER-STORIES.md / TEST-CASES.md in this directory.
> STATUS: 30 stories, 31 cases, written at #373 (2026-09-13) and NEVER EXECUTED: the harness they name,
> review373.js, was never in git (SUITE-AUDIT-2026-09-14.md section 0). Quote none of them as a result.
> The text below still names review373.js and "this file" as it did in the project; that is history, not a claim.

## Part 1. User stories (was project claude/stories/USER-STORIES.md)

# Review screen — user stories (charter role 1). Build #373, 2026-09-13.

Scope: everything the Review tab does today, written from what the app actually does when driven, not from
the source. Every story has acceptance criteria that can be seen on screen, and every criterion is executed by a
case in TEST-CASES.md in the same pass (review373.js). Numbers are from Kunal's phone (375x730) unless stated.
Gaps — things a user would expect Review to do and it does not — are listed at the end as gaps, not stories.

## Getting a game in

**US-RF01 — As a player, I want to open Review and see, in one screen, both ways to get a game in, so that I
never wonder where to start.** Criteria: the tab shows a PGN box (368x130, placeholder naming an example move)
with an "Analyze Game" button at least 44 px tall, and above it an import row with a site picker and a Fetch
button; nothing scrolls sideways. [TC-RF01]

**US-RF02 — As a player with a Chess.com account already imported, I want my recent games listed with what
each one is worth reviewing for, so that I can pick one without remembering it.** Criteria: three rows, each at
least 44 px tall and inside the screen width, each reading "<result badge> vs <opponent> · <site> · <time
control>"; a row that has only a background estimate carries an EST tag and a dashed "!! n brilliant?" pill; a
reviewed row carries the solid pill; a reviewed row that found fewer brilliants than the estimate keeps the line
"review found 0 brilliant (estimate said 1)" instead of silently erasing it. [TC-RF04]

**US-RF03 — As a player, I want a bad PGN to tell me what is wrong instead of starting a doomed analysis.**
Criteria: pasting a line with an illegal move shows an inline message naming the move that did not fit, within
about 10 px under the box, and no analysis starts. [TC-RF03]

**US-RF04 — As a player, I want a pasted game analysed with visible progress and a summary at the end.**
Criteria: "Analyzing your game" appears, the percentage rises and never goes backwards, and a summary card
replaces it; on this machine the Opera Game takes about 22 s at pool 3. [TC-RF02]

**US-RF05 — As a player, I want to review a listed game with one tap.** Criteria: tapping a row starts the
analysis for that game and ends on its summary, headed with that game's players; afterwards the row's pill is
the reviewed one, not the estimate. [TC-RF04b]

## Reading the summary

**US-RF06 — As a player, I want a summary that tells me the story of the game before I step through it.**
Criteria: the head names both players; the opening is named; a coach paragraph of more than 20 characters says
where the trouble was; accuracy per side with an estimated rating; nine verdict counts per side (Brilliant,
Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Blunder); the two big actions ("‹ Back to games",
"Start review ›") are at least 44 px tall and pinned so the page itself never scrolls. [TC-RF05]

**US-RF07 — As a player, I want the Skills panel to count things I can check myself, and to take me to the
move it is talking about.** Criteria: nine rows, each with a printed definition under the label; for the Opera
Game, develops 4/10 and 2/10, castled "move 12" and "no", checks faced 4 for Black, rooks to open files 1 for
White; tapping that number opens the moves view at 14.Rd1 (ply 27). [TC-RF06]

**US-RF08 — As a player, I want a count chip to take me to that kind of move, and the explanation to say what
the move bought.** Criteria: tapping White's "1" under Brilliant opens ply 19 (10.Nxb5!!), verdict Brilliant,
with an explanation of at least 40 characters that names the sacrifice; "←" returns to the summary. [TC-RF07]

## Stepping through the game

**US-RF09 — As a player, I want "Start review" to start at the start.** Criteria: from the summary it opens the
moves view at ply 0 ("Start position"), eval 0.0, bar half white, both player bars named, the move strip holding
all 33 plies inside the screen, the board as wide as the screen allows with no page scroll in either axis.
[TC-RF08]

**US-RF10 — As a player, I want the move controls to go where they say.** Criteria: Next twelve times lands on
ply 12 (6…Nf6, Inaccuracy, "best Qf6", a why line, a numeric eval); Previous goes to 11; ⏮ to 0; ⏭ to 33; the
board does not move or resize at any point. [TC-RF09]

**US-RF11 — As a player, I want to jump straight to a move by tapping it in the strip.** Criteria: tapping the
"Nf6" token opens ply 12 with that move on the line, board unchanged. [TC-RF10]

**US-RF12 — As a player, I want the ★ button to walk me through only the moments that matter.** Criteria:
successive taps land on ply 12 and ply 18, each a non-Best verdict, board unchanged. [TC-RF11]

**US-RF13 — As a player, I want to see the move I should have played without losing my place.** Criteria: the
best-move chip prints a best line naming the engine's move for that ply, and the board does not move or scroll
while it plays. [TC-RF12]

**US-RF14 — As a player, I want the board to sit still for the whole review.** Criteria: across every state in
this pass (at least 14 of them: ply 0, 11, 12, 18, 19, 27, 30, 32, 33, flipped, analysis, drill, graph on,
after Undo) the board keeps one size and position and the page never scrolls. [TC-RF27]

**US-RF15 — As a player, I want no console errors while I use the screen.** Criteria: zero page errors for the
whole run. [TC-RF28]

## The end of the game

**US-RF16 — As a player, I want a checkmate to read as a result, not a number.** Criteria: at ply 33 the label
is "1-0", the bar is at least 80 % white, the move line reads "17. Rd8# ! Great" and the why line says
"Checkmate."; the board is unchanged and nothing scrolls. [TC-RF13]

**US-RF17 — As a player, I want the move before mate to say mate in one.** Criteria: ply 32 reads "M1", not a
raw score. [TC-RF14]

**US-RF18 — As a player, I want the analysis board to agree with the review at the mate.** Criteria: tapping
the round Analyze button at ply 33 opens analysis mode with the label "1-0", the bar full, and the engine line
reading "checkmate". [TC-RF16]

**US-RF19 — As a player, I want "▶ why" to replay the finish and hand the board back.** Criteria: tapping why
on 17.Rd8# returns within about 5 s to the mate: rook on d8, label "1-0", "33/33" and no raw sentinel anywhere
on screen. [TC-RF29]

## The rest of the screen

**US-RF20 — As a player, I want the round Analyze button on the board, where I can reach it with my thumb.**
Criteria: 42x42, inside the board's bottom-right corner. Open: a piece is under it (A-08, Kunal's call).
[TC-RF15]

**US-RF21 — As a player, I want to flip the board and keep my place.** Criteria: the bars swap, the label is
unchanged, the board is unchanged. [TC-RF18]

**US-RF22 — As a player, I want the ⋯ sheet to hold the things I use occasionally and to fit the screen.**
Criteria: the sheet's drill chips match the summary counts; its rows are all at least 44 px; it ends within the
viewport. [TC-RF17]

**US-RF23 — As a player, I want a drill chip to take me to the first move of that kind.** Criteria: "2 mistakes
›" opens ply 20, verdict Mistake. [TC-RF19]

**US-RF24 — As a player, I want to copy the game out.** Criteria: Copy PGN puts the PGN on the clipboard and
the row says Copied. [TC-RF20]

**US-RF25 — As a player, I want the eval graph, when I switch it on, to sit in my own player bar and jump.**
Criteria: the menu row turns ON, a 126x38 graph appears in the bottom bar, the bars keep their height and the
board does not move. [TC-RF21]

**US-RF26 — As a player, I want to choose where the eval bar lives.** Criteria: the setting cycles beside →
off → above → beside; each state keeps the board on screen with no page scroll. [TC-RF26]

**US-RF27 — As a player, I want to play a position out myself and come back.** Criteria: the round button opens
analysis mode with an engine line for the position; playing a move changes that line; Undo restores it; Exit
returns to the same ply; the board never moves. [TC-RF22]

**US-RF28 — As a player, I want to take a position into a real game.** Criteria: "Play from here" opens the
Play setup continuing from that position with my side preselected; returning to the Review tab still holds the
review. [TC-RF24]

**US-RF29 — As a player, I want my analysis to survive leaving the screen.** Criteria: "‹ Back to games" then
"‹ Back to your analysis" reopens the same summary in well under a second, and re-analysing the same PGN comes
back from the cache rather than running Stockfish again. [TC-RF25]

**US-RF30 — As a player, I want autoplay to walk the game for me.** Criteria: ▶ advances the ply on its own and
shows ⏸ while it runs. [TC-RF23]

## Gaps — expected of a review screen, not built (not stories, not failures)

- No way to see two candidate moves compared side by side on the board (the best line plays, then vanishes).
- No move-by-move export of the annotations (Copy PGN copies the moves only).
- No search or filter over the games list, and no paging beyond the rows the import brought.
- Nothing saved per position: a note or a bookmark on a move does not exist, so a second visit starts blank.
- The summary's coach paragraph is one fixed shape; there is no way to ask it for more on a specific move.
- No keyboard or swipe stepping: arrows only.
- Reviews are kept per browser, not on the account (Kunal's n1, open since 2026-09-12).

## Part 2. Test cases (was project claude/stories/TEST-CASES.md)

# Review screen — test cases (charter role 2). Build #373, 2026-09-13.

Every case is executed by `review373.js` in the same pass that wrote this file (that is the rule: nothing is
written here that is not run). Run it with:

    node review373.js <siteDir> <outDir> [--views phone,ip14,short] [--port N]

Views: **phone = 375x730** (Kunal's iPhone: the #372 screen recording pins the layout viewport at 730, not the
679 used before — see DECISIONS-LOG #373), **ip14 = 390x844**, **short = 375x679** (a shorter phone, optional).
Every case screenshots into `<outDir>/shots/TC-Rnn-<tag>-<view>.png`. One PASS/FAIL line per case carries the
measured value, so a failure reads as a measurement, not an opinion. Exit code 1 on any FAIL.

Fixture: the Opera Game PGN (33 plies, ends 17.Rd8#) and three seeded Chess.com rows in `ct_acctgames` with
`ct_gamestats` staged as estimate / reviewed / reviewed-with-downgrade, plus `ct_ccuser=Kunal2023`.

| case | story | preconditions | steps | expected (measured) |
|---|---|---|---|---|
| TC-RF01 | US-RF01 | Home | Review tab | textarea ≥360x120 with a placeholder, "Analyze Game" ≥44 px tall, an import picker and Fetch present, horizontal scroll 0 |
| TC-RF04 | US-RF02 | rows seeded | Review tab, scroll to "Your games" | 3 rows, each ≥44 px tall and ≤ vw−32 wide; row 1 reads "vs mr_dhanzzxnsx"; pills exactly `gstat-est=1 gstat-esttag=1 bril-pill-est=1 gstat-rev=2 bril-pill=1 bril-downgrade=1`; the downgrade line survives |
| TC-RF03 | US-RF03 | Review tab | paste "1. this" → Analyze Game | an inline message naming the move, ≤12 px under the box; no analysis starts |
| TC-RF02 | US-RF04 | Review tab | paste the Opera PGN → Analyze Game | "Analyzing your game" appears, progress never decreases, a summary card appears; time recorded |
| TC-RF05 | US-RF06 | after TC-RF02 | read the summary | head "Morphy vs Duke Karl / Count Isouard"; opening named Philidor; coach text >20 chars; White accuracy ≥90 % and > Black's; 9 verdict rows; White 17 / Black 16 moves; Brilliant 1/0; both footer buttons ≥44 px; page scroll 0 |
| TC-RF06 | US-RF07 | summary | read the Skills panel, tap White's "rooks to open files" | 9 rows each with a printed definition; develops 4/10 and 2/10; castled "move 12" / "no"; checks faced 4 for Black; rooks 1 for White; the tap opens ply 27 (14.Rd1) |
| TC-RF07 | US-RF08 | summary | tap White's Brilliant count, then ← | ply 19, 10.Nxb5, verdict Brilliant, explanation ≥40 chars naming the sacrifice; ← returns to the summary |
| TC-RF08 | US-RF09 | summary | "Start review ›" | ply 0, "Start position", label 0.0, bar 50 %, both bars named, strip holds 33 plies inside the screen, board ≥ vw−30 wide, page scroll 0 in both axes |
| TC-RF15 | US-RF20 | ply 0 | measure the round button | 42x42 inside the board's bottom-right corner. Reports which squares it covers and whether a piece is under one (A-08, open, Kunal's call) |
| TC-RF09 | US-RF10 | ply 0 | Next×12, Previous, ⏮, ⏭ | ply 12 = 6…Nf6 with a verdict, a best-move chip, a why line and a numeric label; Previous → 11; ⏮ → 0; ⏭ → 33; the board never moves |
| TC-RF13 | US-RF16 | ply 33 | read the label, bar, move line, why | "1-0", bar ≥80 % white, "17. Rd8#", why "Checkmate.", board unchanged, scroll 0 |
| TC-RF14 | US-RF17 | ply 32 | read the label | "M1" |
| TC-RF16 | US-RF18 | ply 33 | tap the round button | analysis UI up, label "1-0", bar ≥80 %, engine line says "checkmate", board unchanged |
| TC-RF29 | US-RF19 | ply 33 | tap "▶ why" | within ~5 s: rook back on d8, label "1-0", 33/33, no "+99" anywhere |
| TC-RF18 | US-RF21 | ply 33 | flip | bars swap, label unchanged, board unchanged |
| TC-RF17 | US-RF22 | moves view | open ⋯ | drill chips equal the summary counts; every row ≥44 px; the sheet ends inside the viewport |
| TC-RF19 | US-RF23 | ⋯ sheet | tap a drill chip | opens the first move of that class, verdict matches the chip |
| TC-RF20 | US-RF24 | ⋯ sheet | Copy PGN | the clipboard holds the PGN; the row reads Copied |
| TC-RF21 | US-RF25 | menu | switch "Eval graph in the player bars" on, then tap the graph at 90 % | the row reads ON, a graph appears in the bottom bar, the bars keep their height, the board does not move, and the tap jumps the ply |
| TC-RF10 | US-RF11 | ply 0 | tap the "Nf6" token in the strip | ply 12, board unchanged |
| TC-RF11 | US-RF12 | ply 0 | tap ★ twice | two non-Best plies in ascending order, board unchanged |
| TC-RF12 | US-RF13 | a ply with a better move | tap the best-move chip | a "best line" appears naming a move; board unchanged; scroll 0 |
| TC-RF22 | US-RF27 | a middlegame ply | round button, play a move, Undo, Exit | an engine line for the position; the line changes after the move; Undo restores it; Exit returns to the same ply; board unchanged throughout |
| TC-RF23 | US-RF30 | ply 0 | ▶ | the ply advances on its own; ⏸ shows |
| TC-RF26 | US-RF26 | moves view | cycle the eval-bar setting | beside → off → above → beside; in each the board is on screen and nothing scrolls |
| TC-RF24 | US-RF28 | a ply | "Play from here", then the Review tab | Play setup says Continuing with the right side; returning keeps the review |
| TC-RF25 | US-RF29 | moves view | "‹ Back to games", "‹ Back to your analysis", re-paste the same PGN | the summary returns in well under a second; the re-analysis comes from the cache |
| TC-RF04b | US-RF05 | games list | tap the estimate row | its analysis runs and ends on that game's summary; the list's pills become reviewed |
| TC-RF27 | US-RF14 | the whole run | compare every recorded state | ≥14 states, one board box, page scroll 0 everywhere |
| TC-RF28 | US-RF15 | the whole run | collect page errors | none |
| TC-RF30 | US-RF04 | cold cache, twice | analyse the same PGN in two fresh contexts (`repro373.js`) | the same accuracies and the same verdict counts both times, in a comparable time |

Not covered (and why): online/friends games (no server in the sandbox); the camera and photo import (no device); a
real signed-in account, so the player photo and the rating exchange are untested (Kunal's n9); Lichess import
(network blocked); landscape and iPad (parked); any review longer than 40 plies; the coach's wording itself,
which is a content judgement rather than a measurement.
