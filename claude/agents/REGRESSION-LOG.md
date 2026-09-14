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
| 15-gallery-playall.js | the recording-free gallery gate Kunal's feedback session asked for: drives "Play all" at 375x730 and 375x812, every caption reached in order, no page scroll, no board shrink inside a card, the RECORDING COMPLETE frame | new (#376) |
| 32-plylog.js | the ply log is dev-gated and temporary: plies stepped with the switch off leave nothing behind when the readout is later turned on, plies stepped with it on are recorded and printed, switching off clears the buffer | new (#376) |
| 33-reproducible-review.js | the stuck-worker timeout read straight out of the bundle under test (at least 20 s), plus reproducibility: two fresh contexts with the eval cache cleared, same PGN, sequential; accuracy within 1.0 point, all nine verdict counts identical, run times within 12 s, and 10.Nxb5 not scored as a mistake | rebuilt from repro373, which died with its sandbox (#376) |
| 31-antagonist373.js | the antagonist's three numbers on #373 (label inside the board on the h-file, 0-1 for a mate by Black on the analysis board, Analyze/Copy hit 6px above and below the chip) and the Online lobby's Back | new (#374) |

## Counts

| build | PASS lines | gates | log |
|---|---|---|---|
| #372 | 138 | the old sandbox's gates.sh (lost with the sandbox) | gatelogs/372-all.log (not in the repo) |
| #373 | 203 (the run of record on the pushed bundle, 22:41 ET; a trial run earlier had 200 before the engine-on label check was added) | 10 | claude/agents/gatelogs/373-all.log |
| #374 | 217 (adds 31-antagonist373.js) | 11 | claude/agents/gatelogs/374-all.log |
| #375 | 160 over 24 gates, in the retiring chat's own suite, which is not in this repo | 24 (theirs) | not in the repo; see flag handover-from-brilliant-chat |
| #376 | 256 across 12 suites (adds 15-gallery-playall 12, 32-plylog 16, 33-reproducible-review 11) | 12 | claude/agents/gatelogs/376-all.log |
| #377 | 258 across 12 suites (33-reproducible-review grows from 11 to 20: four bundle assertions for the single-worker path and a third review at ct_pool=1 that must match the pool's verdicts exactly) | 12 | claude/agents/gatelogs/377-all.log |
| #378 | 272 across 14 suites (adds 34-takeback, 14 assertions; A-11 and the effective-tap-box proof MOVED into the More sheet with the controls rather than being deleted) | 13 | claude/agents/gatelogs/378-all.log |
| #379 | 286 across 14 suites (adds 36-evalbar, 14 assertions. 35-width-containment was written this run and is HELD in gates/pending/ with its reason, not in the suite: it is red on a confirmed defect that is blocked on a decision, and putting it in regress/ would leave main permanently red) | 14 | claude/agents/gatelogs/379-all.log |

Not yet ported (the old suite's other harnesses, to be rebuilt as the screens get their charter pass): fit.js (14
phone viewports per board screen), shift346 (26 samples through the engine's think), veteran360 (stored-profile
sweep), skills368 (pure gameSkills), elo349, gist350 / read350, engcrash / trap356, look367, overlay366, open370,
pzafter370, acct353's full survival set, chrome347, kunal364c/d.

## Negative controls: does a gate still fail when the thing it guards is broken?

BUILD-CONTEXT §2 asks for this, and it changed a gate on the day it was first run.

| gate | broken build used | result | what it changed |
|---|---|---|---|
| 33-reproducible-review | the stuck-worker guard put back from 20 s to 4 s, bundled and served | **PASSED, 8 of 8** | The behavioural half cannot see that regression on this machine: a whole 33-ply review finishes here in 9 to 10 s with three workers, so no search approaches even the broken 4 s ceiling. The bug bit on a slower device. The constant is now read directly out of the bundle under test, and the same broken build then goes RED on it. The reproducibility assertions stay, but they are no longer described as protecting the timeout, because they measurably do not. |
| 33-reproducible-review, #377 | the single-worker path put back the way #376 shipped it: `go movetime` with a flat 4 s guard, no depth argument, bundled and served | **FAILED, 4 of 20** - as it should | Three bundle assertions went red (no depth-mode guard; the depth argument not wired to `go depth`; the review not asking for depth 16) AND, unlike the timeout control, THE BEHAVIOURAL HALF FIRED TOO: the ct_pool=1 review published different verdicts from the pool review of the same game in the same build. That is the user-visible harm, measured rather than argued, and it is why this control is worth more than the first one - the fault is reachable on this hardware, so the gate does not have to rely on reading a constant. |
| 33-reproducible-review, #377, UNPLANNED | none - this one was not a control. The gate was run against its own author's FIX | **FAILED, 2 of 20** | The most valuable red of the run, and the only time this suite has caught something its writer did not already know. Putting both review paths on depth 16 did not make them agree: the single-worker run still returned Best 7,6 against the pool's 5,5 and Black 58.8 against 57.7. The difference was the transposition TABLE, not the search - it was cleared at each worker's block start, and block boundaries move with the worker count, so a position's depth-16 score was a function of the DEVICE. The temptation was to weaken the assertion to match the code. It was the assertion that was right. Fixed in the app instead: a table-reset cadence tied to the position index, blocks aligned to it, and the two configurations now agree exactly. |
| 34-takeback, #378 | the `opponent==='computer'` guard removed, so the row appears in Pass & Play too | **FAILED, 1 of 14** - on exactly the right line | "in PASS & PLAY there is no Takeback row at all" went red and nothing else did. The absence half is the half that is easy to get wrong here, because the More sheet opens on that screen too, so a gate that only checked vs Computer would have gone green on a build that gave Pass & Play a takeback Kunal explicitly scoped out. |
| 34-takeback, #378, ITS OWN FIRST RUN | none - the gate was measuring wrongly | **3 red on a CORRECT build** | Worth recording because the reflex is to suspect the app. The MOVES panel renders one token per line ("MOVES\n1.\ne4\ne5"), so counting matches of "<n>. <san>" counted ROWS, and a row holds two plies: a working takeback read 2 -> 1 instead of 2 -> 0. The second cut then counted the empty-state line ("Your moves appear here as you play.") as a move and read 2 -> 1 again. Both were found by DUMPING THE REAL TEXT from a running build instead of reasoning about it, which is the same rule as measure-do-not-read applied to the harness itself. |
| 36-evalbar, #379 | the bar put back to 10px wide with the old #2b2932 track | **FAILED, 6 of 14** | Fires on exactly the six things that changed and nothing else: the Play bar's width at move 0 and after four plies, the track not being the old colour, the track being the measured one, the board being 353, and the Review bar's track. |
| 36-evalbar, #379, THE COLOUR ITSELF | not a gate control - the CHOICE was checked against reality before it shipped | **the proposed colour failed** | Worth recording because it is the same failure mode as a gate that never runs the broken build. The plan computed #6b6978 at over 3:1 from its hex value; screenshotted from a running build it paints rgb(84,82,94) for 2.36:1, BELOW the 3:1 floor that motivated the whole change. Six candidates were built and sampled to find one that clears it. The method was validated against a known answer first: the old #2b2932 sampled 1.12:1, independently reproducing the 1.15:1 Kunal's own decision cites. Measure, do not read, applies to colour too. |

The lesson generalises past this gate: a suite that has never been run against a broken build is a suite whose
greens have not been earned. Where a behavioural assertion cannot reach the fault on this hardware, guard the
artifact directly and say which half is doing the work.
