# Regression log

The regression suite is `gates/gates.sh` (one script, run on every build: mountcheck first, then every
`gates/regress/*.js`). It lives in the repo since #373 - the previous suite (138 PASS lines at #372) existed only in
a sandbox that is gone. The charter's number is the count of PASS lines in `gates/logs/<N>-all.log`; it may only
rise. A gate that is red blocks the build (GATES RED); a build is "gated" only when the log ends GATES GREEN.

## Gates

| gate | what it asserts | ported from |
|---|---|---|
| mountcheck.js | the bundle mounts at 375x679 and 390x844, stamp in the DOM, four tiles, each tab opens with zero app errors | HANDOFF gate 3 |
| 10-gameover.js | card k10: board width and top unchanged after checkmate, no scroll, row Review · Rematch, no Resign | gameover371 |
| 11-lesson.js | cards 3/4: lesson board 375@92 at the demo end and in practice, note box 75px, unchanged after one practice move, no scroll | lesson371 |
| 12-hint.js | card 5 at 375/390/320: board unmoved by the hint, hint text unclipped in the header, header above the board | gallery372 / hintcap372 |
| 13-play-after-moves.js | card k8 and a real Pass & Play game: one width and one top across five plies, 351 on Kunal's phone, no scroll | jump370 |
| 14-uat-review-card.js | the Review UAT card: seven captioned checkpoints and the state each claims | new (#373) |
| 20-review.js | TC-R01..R09, R11..R14: import < 90 s, summary content and pinned footer, Skills jump, board 349 with one top/width across plies, bars one height, ratings from headers, 1-0 at mate, rank-8 badge inside the board, verdict chips, analysis board, sheet and navigation, cached re-import < 8 s with identical numbers, eval graph, stored accounts survive a reload | rev342 / mate371 / summary368 / graph369 / acct353 (partly) |
| 21-review-brilliant.js | TC-R10: the brilliancy's reason names the sacrifice, the forcing line and the comparison; the play-out moves a piece; only the one allowed engine trap | bril357gate / why354 |
| 30-p1-fixes.js | the #373 P1 fixes: Home ☰, menu sheet to the bottom, Pass & Play setup fits, Next puzzle advances, 40px targets, Moves toggle leaves the board still | new (#373) |
| 31-antagonist373.js | the antagonist's three numbers on #373 (label inside the board on the h-file, 0-1 for a mate by Black on the analysis board, Analyze/Copy hit 6px above and below the chip) and the Online lobby's Back | new (#374) |

## Counts

| build | PASS lines | gates | log |
|---|---|---|---|
| #372 | 138 | the old sandbox's gates.sh (lost with the sandbox) | gatelogs/372-all.log (not in the repo) |
| #373 | 203 (the run of record on the pushed bundle, 22:41 ET; a trial run earlier had 200 before the engine-on label check was added) | 10 | claude/agents/gatelogs/373-all.log |
| #374 | 217 (adds 31-antagonist373.js) | 11 | claude/agents/gatelogs/374-all.log |

Not yet ported (the old suite's other harnesses, to be rebuilt as the screens get their charter pass): fit.js (14
phone viewports per board screen), shift346 (26 samples through the engine's think), veteran360 (stored-profile
sweep), skills368 (pure gameSkills), elo349, gist350 / read350, engcrash / trap356, look367, overlay366, open370,
pzafter370, acct353's full survival set, chrome347, kunal364c/d.
