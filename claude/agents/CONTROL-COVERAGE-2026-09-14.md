# Which gates have been proved able to fail — the tally, re-derived at #388

Written 2026-09-14 at chain link 2, answering the third finding of tracker flag `uat-ext-2026-09-14`:
that "FIVE gates have no control at all (168 of the 499 assertions untested against a broken build)".
That was measured at **#383**, when the suite was 18. It is **25** now, so the number had to be
re-derived against the current `gates/regress/` directory rather than carried forward. I could not read
the challenger's own report (`claude/agents/UAT-CHALLENGE-EXTERNAL-2026-09-14.md` lives in the claude.ai
project, which a build session cannot see), so this is built from `claude/agents/REGRESSION-LOG.md`, the
two lane documents staged in the tracker artifact, and `git log` per gate file — not from their five.

## Read this before the table, because the table is not the finding

**"Does this gate have a negative control" is the wrong question, and #388 is the proof.**
`21-review-brilliant.js` HAD a control. It was run at the #381 re-gate, it went red 2 of 7, and it is
recorded in the regression log as clean. Two builds later the same gate passed **7 of 7** against a
bundle whose brilliancy explanation had been rewritten — because the control that had been run broke the
*play-out button*, and nothing had ever broken the *sentence*.

So a gate is not "controlled" or "uncontrolled". Each ASSERTION is proved able to fail, or it is not, and
a gate can carry both kinds at once. The honest unit is the assertion, and the honest tally has a shape
the four-numbers block cannot hold: 990 assertions, of which some known number have been demonstrated to
fail on a bundle built to make them fail, and the rest have not. That second number is the one worth
driving down. **A raw assertion total goes UP when someone adds a check that cannot fail.**

## The tally

25 suites: 24 files in `gates/regress/` plus `mountcheck`. "Proved red here" means this session built a
bundle to fail it and watched it go red, with the count recorded in the regression log.

| suite | proved red | at | gate last changed | note |
|---|---|---|---|---|
| mountcheck | yes | #381 re-gate, 2 of 16 | pre-#373 | control is newer than the gate |
| 10-gameover | yes | #381 re-gate | #381 (e7b75ba) | its FIRST control passed 12 of 12 and the gate was blind; red only after the width was pinned |
| 11-lesson | yes | #381 (2 of 16), #382 (7 of 46) | #382 (212714f) | the #382 control replaced a first attempt that fired on the old assertion only |
| 12-hint | yes | #381 (6 of 21), #383 (3 red) | #383 (f03f4fb) | |
| 13-play-after-moves | yes | **#388, two controls, 8 of 18 and 4 of 18** | #388 | its only earlier red was ACCIDENTAL (#380, a bundle nobody meant to gate). Controlled deliberately at #388, which found nine of eleven assertions blind to a constant-wrong board; numbers now pinned per geo and per configuration |
| 14-uat-review-card | yes | #381 re-gate, 1 of 14 | #373 (3006de0) | first attempt inert (broke a dimension the gate does not measure) |
| 15-gallery-playall | yes | #381 re-gate, 2 of 12 | #376 (48e97a6) | reproduced the #378 defect exactly |
| 20-review | yes | #381 (8 of 79), #383 (1 of 87) | #383 (8d3cc3d) | |
| 21-review-brilliant | yes | #381 (2 of 7), **#388 (3 of 24)** | #388 (5030f7e) | **the cautionary case — see above** |
| 30-p1-fixes | PARTLY | #381: A-04/A-11, A-16, A-10, A-13 | #381 (af415a9) | **A-12's across-toggle claim is UNFALSIFIED** and known to be unfalsifiable by the obvious break |
| 31-antagonist373 | yes | #381 re-gate, 2 of 14 | #378 (88cd2a1) | |
| 32-plylog | yes | #381 (4 of 16), **#388 (4 of 16)** | #376 (944eec8) | the control the challenger called inert was a DIFFERENT break; re-designed and re-verified at #388 |
| 33-reproducible-review | yes | #377, 4 of 20 and 2 of 20 | #377 (248b55d) | |
| 34-takeback | PARTLY | #378 (1 of 14), #383 | #383 (f03f4fb) | **the #383 control went red EARLIER than the new assertion** — `b.move` missed its squares on the smaller board and threw. A red, not an isolation |
| 35-width-containment | yes | #384, three controls | #384 (0777ed4) | one control also answered the question the blocked fix waits on |
| 36-evalbar | yes | #379, 6 of 14 | #379 (1b38db1) | |
| 37-strip-sync | yes | #380 (3 of 41), #383 (3 red) | #383 (f03f4fb) | its own first run was a false green on a branch that never ran |
| 38-rev-sheet-reach | yes | #380, 14 of 45 | #380 (c2d1bed) | |
| 39-pz-streak | yes | #381 (21 of 45), #383 | #383 (f03f4fb) | |
| 40-reachability | yes | #382, 1 of 17 | #382 (ac3084e) | its FIRST control was worthless — every number came back byte-identical |
| 41-coach-bubble | yes | #385 (×3), #387 (×2) | #387 (6e19f7e) | one of its own new assertions went green 38 of 38 and could not fail; found by its control on the day |
| 42-home-devrow | yes | #386, three controls | #386 (06502c7) | one assertion was too weak and one too strong; the surviving test is behavioural |
| 43-tcrl-analysis | PARTLY | #386 re-gate, three controls | #386 (7551dfa) | **TC-RL-007 and TC-RL-010 have none**, and said so when it landed |
| 45-play-setup | SECOND-HAND | author's 8 controls, all red | #387 (3610d17) | not reproduced here. Their table names each one-line change and what went red; P1 discriminates reach from position |
| 46-play | SECOND-HAND, PARTLY | author's 4 of 12 controls run red | #387 (3610d17) | **NC5-NC12 are named and NOT RUN, by the author's own statement.** Eight asserted properties unproved |

## What that adds up to, stated so it cannot be read as better than it is

- **23 of 25 suites** have been run against a bundle built to fail them, here, and gone red (24 counting
  `13-play-after-moves`, controlled deliberately for the first time in this same pass).
- **2 of 25** (`45-play-setup`, `46-play`) rest on their authors' recorded evidence. I have read both
  tables and they are specific and credible; I have not reproduced them. Until this session runs one,
  "proved" is their word, not a measurement of mine.
- **Four suites carry a named internal gap**: `30-p1-fixes` (A-12), `43-tcrl-analysis` (TC-RL-007, -010),
  `46-play` (NC5-NC12), `34-takeback` (its #383 control never reached the line it was aimed at).
- **One suite had never been deliberately controlled at all**: `13-play-after-moves`. **Done at #388, in this
  same pass** — and it was worth doing, because the control found nine of its eleven assertions unable to see a
  board that had been the wrong size all along. Its numbers are now pinned per geometry and per configuration
  and the two controls fire 8 of 18 and 4 of 18.

So the challenger's "five gates with no control" does not survive re-derivation in that form — but the
correction is not in our favour, because the thing it was pointing at is worse than a count of gates. The
finding it produced, `21-review-brilliant`, was a gate that the old tally would have scored as covered.

## The next controls to run, in the order they are worth running

1. ~~**`13-play-after-moves`**~~ — **DONE at #388.** See the regression log; it was not the formality it looked.
2. **`46-play` NC5-NC12** — eight named one-line changes, already written down by its author, guarding
   properties nobody has demonstrated. The work is done; only the running is left.
3. **`45-play-setup`** — reproduce one or two of the author's eight, to convert second-hand into measured.
4. **`30-p1-fixes` A-12** — needs an assertion before it needs a control. Its subject is "toggling Moves
   leaves the board unchanged" and the obvious break moves nothing, so the gate's comment describes an
   intention rather than a mechanism.
5. **`43-tcrl-analysis` TC-RL-007** — simply untested; TC-RL-010's property is already guarded by
   `33-reproducible-review`, which IS controlled, so that one is a lower priority than it looks.

## And the thing to stop doing

Counting assertions as though they were coverage. 990 is the number in the four-numbers block and it went
up by 17 this week because a gate was FIXED, not because anything new is guarded. Seven of the 990 were,
until #388, provably incapable of failing. The figure that means something is in the table above.
