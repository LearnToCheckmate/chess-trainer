# HANDOFF - where the last run left off

> The live version lives in the tracker (artifact 5326ERvZCZ5tEYRkPavPTF); see decisions/one-home-per-document-2026-09-22. This file is the build lane close-out copy; where the two differ the tracker wins.
**#550: BATCH 10 LANDED ON MAIN BY BATCH 11 - GATES GREEN #550 (12080 PASS / 0 FAIL, 143 sections, `claude/agents/gatelogs/550e-all.log`), fast-forward 14f1eff..309f72e, 16 Nov 2026 03:00Z.**
Landing run `build__1794753583565` (batch 11, `directOpening_2026_11_15_batch11`): gate 50 alone 195/0; pins recorded from 550c (ec72925); first landing suite red on gate 21 (an unlisted legal engine branch, fixed at 309f72e) and gate 84 (load: 97/0 twice alone), archived `550d-all-RED.log`; the rerun green. Bundle `e26a2b329de9` unchanged, so the number stays #550. Everything in sections 00 and below that is LEFT FOR BATCH 11 now goes to batch 12. The section below is batch 10's hand-off as it was written; its first steps are done.

**#550 (as handed off at 1:57am EST Sun 15 Nov): BATCH 10, 96-HOUR WINDOW - BUILT, GATED RED, NOT SHIPPED. HAND-OFF: tracker jobs/land-the-550-branch-claude-exciting-noether-v1swj8-2026-11-15 and builds/550.**
Run `build__1794388896663`, 11 to 15 Nov 2026, under `docs/restart-readiness.directOpening_2026_11_11_batch10`, base 14f1eff (#549, main unmoved), per-run branch `claude/exciting-noether-v1swj8`.
Kunal said land now (run-answers build__1794388896663-land-batch-10-now, 9:48am ET Sat 14 Nov). Three final suites ran; the window closed before one was green.
**APPLICATION CODE CHANGED, NOT ON MAIN.** `app.js` md5 `e26a2b329de9` (commit 065617f), from chess.jsx `540e9ee7d2ab`; 717 commits over 14f1eff.
Suite logs, all RED, kept in `claude/agents/gatelogs/`: `550-all-RED-stopped-after-49.log` (bundle ad820f8bdd63; reds fixed), `550b-all-RED-stopped-after-148.log` (gate 147 alone, measurement fixed), `550c-all-RED.log` (12076 regression PASS over 143 gates; red at gate 50 only, plus the footer items below).

## 000. THE NEXT RUN'S FIRST STEPS (the hand-off job holds the same)
1. `git fetch`; origin/main must still be 14f1eff, or rebase this branch and rebuild under the next number.
2. Gate 50 alone (`CT_APP=app.js node -r ./gates/lib.js gates/regress/50-drill-verdict-no-jump.js`): 195 pass 0 fail on e26a2b329de9 after 75e4186, measured 07:3xZ Sun.
3. Before the suite, settle the third suite's footer: ASSERTION COUNT FELL on 25-online-clocks (40 to 38), 35-width-containment (104 to 98) and 48-lesson-flow (354 to 309) against gates/assertion-counts.tsv; each needs a reason (a deliberate re-key this batch) and `bash gates/assertcount.sh record`, or a fix. "RECORDS DOOR NOT CHECKED" and "origin/main UNKNOWN" came from the container restart at about 06:35Z (fetch works again), and "HEAD MOVED DURING THE RUN" from the gate 50 fix committed mid-suite.
4. ONE full suite alone from a copy of gates.sh, then verify-log --this-bundle --this-suite, held.sh check, push HEAD to main by fast-forward, R34, close out.


## 00. WHAT THE NEXT RUN NEEDS FROM #550
1. THE REVIEW TEXT, PART A OF docs/review-text-design-2026-11-14, SHIPPED (lessons slot, 5732ca8 and the veto fixes 7a8c909, ebb6898, 95a0111). LEFT FOR BATCH 11, with restart points:
   7a T1 to T11 over the nine games (needs the design's texts.json, not in the repo, and a new gate with a manifest row); 7c the both-lines
   check with a control; 7d the blind reader at 27 of 30 (a fresh agent); W7 the engine line after a slip (rtLadder, before W8); "they" after
   first mention (reviewText0); short forms for W2 and W6 (rtLadder); a checker's read; his look at ten of his own slips, old and new side by side.
   Named residuals from the pair: A2 a forced capture of the checker "blocks the check" (chess.jsx rtLadder Forced branch); A3 "lets your bishop out"
   on a move that only answers a check (rtQuiet); A6 the last ply asserts "Nothing is lost at once" with no reply to check; B6 check signs dropped in
   prose (11.Bxb5 for 11.Bxb5+); B7 "E4 stakes out" capitalised in the why playout; A9 (a) to (e).
2. ON HIS PHONE THE REVIEW EVAL GRAPH NOW SHOWS ON 2 OF 33 PLIES OF THE OPERA GAME (it was 4): the three-line text he chose (Q2) fills the room the
   streamlined review gives the graph (it needs 40px above the toolbar). Not a defect; his to judge on his phone.
3. TWO APP BUGS THE FINAL SUITE FOUND AND THIS RUN FIXED: the landscape graph's newest point lagged the bar one engine update (91173bf, gate 127);
   opening the Review list with his 465 games ran two full renders since q45 (ef0f72f, bisected), longest task 819-905 ms at 4x, now 422-450 (90866c7, gate 147).
4. NINE GATE AND HARNESS REDS FIXED IN THE LANDING, so a later run does not re-find them: fastgate-drive H71 (its fixture gate gained a record, and
   control-floor's NOT ON THE FLOOR notes push the refusal out of the fast tier's tail -4; batch 11 should pick the fixture gate at run time);
   gate 126 (functions/index.js needs firebase-admin since 451ae2d); gate 135 (kunal761 block re-keyed to ply 32); gates 142, 24 and 61 (left behind
   by q44 and the games-list card 558424b); gate 79 (no apostrophes inside engine-extract.js's NAMES); gate 15 (the IPAD walk card excused from the
   card no-scroll check).
5. OPEN QUESTIONS ON THE TABLE: run-questions q51 (Look and feel at 375x568 and 360x640, options A, B, C with pictures at 1b6df01); his picks
   AUD-R07 (the summary) and AUD-L16 (the roadmap). App B's restart point is q51's answer.
6. CHECKS NOT REACHED BEFORE THE LANDING STOP (checker seat 2): 4ba456c (gate 11 TC-LS-064, with two mutants built in the scratchpad that did not
   survive) and b9ef786 (the four endgame notes, cg10); the cg11 re-check (b6caacc). Each job's checkVerdict says so.
7. B3 (antagonist B): the Review board measured 327 wide at 375x761 with insets emulated in a page; the installed full-height shell may differ.
   A8 (antagonist A, reasoned): sw.js races each file against 3s separately, so from #551 on a slow line can mix a new index.html and lessons.js
   with a cached app.js, and the lessons index migrations make that risky.

**(previous) #549: BATCH 9. ALL 120 ORDERED JOBS WORKED, FIRST PASS AND A SECOND PASS TO THE CUT LINE - 31 FIXED, 77 FIXED IN PART, 12 CANNOT AFTER R34 - GATES GREEN #549 AT 8575 PASS / 0 FAIL OVER 74 SECTIONS.**
Run `build__1793935200785`, 6-7 Nov 2026, under `docs/restart-readiness.directOpening_2026_11_05_batch9`, base 7340372.
**APPLICATION CODE CHANGED.** `app.js` md5 `3ab724514641`, from chess.jsx `12d8e7944da3` (chess.jsx +1931/-362 over 7340372..f31f924).
The push-gate log is `claude/agents/gatelogs/549-all.log`, the SECOND final suite, gated sha e3e32fb, started 14:31:28Z (log header) and written 18:24:58Z.
Every job's outcome is in its own `outcome`: fixed-in-part until R34, then moved to fixed where nothing but the push was left (RB20).

## 00. WHAT THE NEXT RUN NEEDS FROM #549
1. FOUR FEATURES SHIP OFF BEHIND A SWITCH AND WAIT ON KUNAL: one Brilliant rule (28, `BRIL_RULE_DEFAULT=1`, 124 added Brilliants listed on the job),
   the missed-Brilliant marker (29, `MISSED_BRIL_DEFAULT=false`), played-move drill grading (97, `DRILL_GRADE_DEFAULT=false`, because (106) measured
   the depth-3 local grade disagreeing with the review 84.8% of the time), and the opening-book table (98, `BOOK_TABLE_DEFAULT=0`). The Two Bishops
   free-defender trial (85) ships ON for him to judge. The questions are in tracker `runreports/questions-549` for the orchestrator to route.
2. (105) WAS BUILT AND THEN REVERTED AT THE CUT LINE, unchecked on the final bundle. Its patch is tracker `patches/job105-games-list-card-second-pass-549`.
3. CONTROL-RECORDS NOT PLACED (their controls must be re-run): job 12 on gate 55 (x3), job 49 on gate 16, job 90 on gate 78, job 100 on gate 73.
   The auditor's AU1 P1 is the gate 55 one. Control-audit at the push: uncovered 28, none 24, assertionsmoved 1 (base 49/43/2).
4. RESIDUALS FROM THE FINAL PAIR READ, filed as jobs: B3 review waits up to 120s for Stockfish with no waiting state; B4 the moves-view engine line
   searches to depth 16 (slower on a phone); B7 the free-defender slack is calibrated on node, not a phone; B8 the Tactics board cap has no rAF retry;
   B9 `ct_mymistakes` is trimmed to 150 on load; A4-F (pre-existing on #548) a transient overflow with no re-render leaves the board shrunk on tall phones.
5. LOAD, NOT CODE: gate 20 alone takes ~730s of its 900s cap, and `fastgate-drive` reads an honest tree as FAST GATE RED when browsers run beside it.
   Run the final suite with nothing else on the machine. Every red this run saw under load was re-run alone twice and went green.
6. The commit message of f31f924 says the archived suite ran "13:48:38Z -> 18:24Z". 13:48:38Z was the FIRST, stopped suite; the archived log
   started 14:31:28Z by its own header [R18; the commit is on main and is not rewritten].
7. Not reached in the second pass: the rest of (107) and (108), (114) and (120). gatemanifest selftest's sigpipe miscount (23 vs 15) is still
   pre-existing on main. Gate 76 is now the only known-absent gate.

**(previous) #548: BATCH 8. ALL 164 ORDERED JOBS READ - 46 FIXED, 14 FIXED IN PART, 33 NOT YET, 71 CANNOT THIS PASS - GATES GREEN #548 AT 6829 PASS / 0 FAIL OVER 66 SECTIONS.**
Run `build__1793852110388`, 5 Nov 2026, under `docs/restart-readiness.directOpening_2026_11_04_batch8c`, base d083b72.
**APPLICATION CODE CHANGED.** `app.js` md5 `e07e3d4fb9ea`, stamp '#548 - 2026-11-05 11:26 ET', from chess.jsx `91d7fb10cadc`.
The push-gate log is `claude/agents/gatelogs/548d-all.log`, gated sha 2ef1165. Every job's outcome is on the job itself as `outcome_548` and `receipt_548`.

## 00. WHAT THE NEXT RUN NEEDS FROM #548
1. NEW P1, PRE-EXISTING ON MAIN (final antagonist B, B1): `jobs/review-engine-line-recommends-the-losing-recapture-at-opera-ply-29-2026-11-05`.
2. NEW P2 RESIDUAL OF (123) (B3): `jobs/the-first-tallied-game-row-is-still-below-the-tab-bar-on-kunals-phone-2026-11-05`.
3. THE DRILL ANALYSIS BOARD (109) is new surface: a solved card opens a one-position review flagged `fromDrill`, numbered from the
   card's `no` (`plyBase`); a card with no known move number shows no numbers at all (`noNum`). Its exit is "‹ Card".
4. (92) MOVED THE BOARD on Home-adjacent screens: gates 10, 30, 34, 36 and 62 carry new pins, each with a CONTROL-RECORD.
5. SET ASIDE, NOT WORKED THIS PASS (not-yet, with reasons on each job): (18) (19) (55) (56) (66) (71)-(75) (77) (78) (83) (87)-(89)
   (93) (94) (98) (99) (104) (106) (110) (115) (120) (137) (142) (149)-(152) (156). (138)'s register half was done at close-out (fixed-in-part; the verify-log arm stays with jobs/nothing-checks-that-the-registers-citations-resolve-2026-09-30).
6. THE PUSH GATE IS THE FOURTH #548 SUITE, 548d-all.log; see the RUN-LOG row for why 548, 548b and 548c do not authorise it.
7. gatemanifest selftest's sigpipe miscount (23 vs 15) is PRE-EXISTING on main, not this batch's.

**(previous) #547: BATCH 7. ALL 191 ORDERED JOBS READ (94 WITH A FIX COMMIT, 97 DECIDED WITHOUT ONE), GATES GREEN #547 AT 6397 PASS / 0 FAIL OVER 66 SECTIONS.**
Run `build__1793671541605`, 2-3 Nov 2026, under `docs/restart-readiness.directOpening_2026_11_02_batch7b`, base 29b60c2.
**APPLICATION CODE CHANGED.** `app.js` md5 `c7f6a1228e43`, stamp '#547 - 2026-11-03 04:29 ET', from chess.jsx `ec83770812c4`.
The push-gate log is `claude/agents/gatelogs/547d-all.log`, the FOURTH full suite (see RUN-LOG for why there are four).

## 00. WHAT THE NEXT RUN NEEDS FROM #547
1. SIX ITEMS OF THE BATCH WERE NEVER WORKED, missed in the in-order walk and found only by the receipts sweep: (18) gate 11 glyph
   band, (71) P1 review grades depend on CPU load, (74) widen the input space, (104) scan orientation, (105) icon-only transport
   (amber), (145) P1 stale story-id register. Their receipts say NOT WORKED, with scope.
2. NEW P1 JOBS FROM THE AUDITOR (not checked against base): lesson-complete-note-reports-progress-one-step-behind-2026-11-03 and
   puzzle-finished-with-answer-shown-pays-streak-and-xp-2026-11-03. Four P2s in auditor-547-p2-findings-2026-11-03.
3. PRE-EXISTING ON MAIN, FOUND BY THE SUITE: review-engine-line-never-arrives-at-ply-8-of-the-stalemate-game-2026-11-03. Gate 22's
   TC-R83 control was narrowed to (116)'s claim; restore its line half when that is fixed.
4. KNOWN LIMITS: the drill message now scrolls inside its reserve (Kunal's ruling) with no cue beyond the scroll bar; gate 74 F0d
   reads the viewport, not the panel clip; the same puzzle id solved twice in one session never shows 'solved before'.
5. THE FINAL PAIR'S B3-B6 are P3 jobs dated 2026-11-03 (intro card below fold, captured digit clipped, gallery button lost,
   landscape puzzle Prev/Next unnamed).

**(previous) #546: BATCH 6. ALL 89 ORDERED JOBS WORKED, GATES GREEN #546 AT 5699 PASS / 0 FAIL OVER 65 SECTIONS, PUSHED TO MAIN.**
Run `build__1793333947000`, 30 Oct 2026, under `docs/restart-readiness.directOpening_2026_10_30_batch6`.
**NO APPLICATION CODE CHANGED.** `app.js` is still #530's bundle, md5 `049b41dfb6f1`; `chess.jsx` is `1b41d1d1e765`.
The gated sha is `84e3c4f`; the log is `claude/agents/gatelogs/546c-all.log` (verify-log OK with --this-bundle and --this-suite).

## 0. WHAT THE NEXT RUN NEEDS FROM #546

1. **The suite now FAILS a gate that asserted and never reached done()** (gates/lib.js exit hook, fb5f2f0, antagonist A's
   upheld veto). A gate that stalls, throws past L.run or exits early reads `FAIL HARNESS: ...`, not green. Every gate on
   the tree reaches done(); a new gate must too.
2. **gates.sh fingerprints the tree before its first browser gate and reds on any move** (item 87). DO NOT commit, fetch,
   mint or write anything in the repository while a suite runs - the ~12-minute fastgate-drive window before the first
   browser gate is where an innocent ref update turns the suite red (antagonist A F10). Run every probe in a clone.
3. **held.sh is stricter, and `add` and `check` now agree on what a row is** (seven repair rounds, 2a4ea90 to 84e3c4f). A
   held-trees.tsv row in a shape check cannot read - spaces for tabs, field 1 not 8-12 hex or 'sha-only', a live field 2
   element not 7-40 hex, a live field 7 not exactly '-' or 8-12 hex - makes `check` answer exit 2 for EVERY tree. Write rows
   only with `held.sh add`, which refuses those shapes. A short 7-11 hex prefix of a held md5 now reads HELD.
4. **CONTROL-RECORD lines for the nine gates #545 deferred are landed** (item 89). control-audit reads badrecord 0,
   assertionsmoved 2 (gates 15 and 49, older than both batches), 16 covered. The trials were REBUILT (none survived #545's
   container); recipes are in each record's how= and in the job outcome.
5. **New gates 79, 80 and 81 are required and pinned** (gates/assertion-counts.tsv). Gate 81 needs a COMPLETE clone: in the
   routine's depth-50 arrival shape it reds in one PRECONDITION line - run `git fetch --unshallow` before the suite.
6. **Open, recorded for the orchestrator to route (pre-existing, measured on main 4aae4ed too):** verify-log.sh's default held
   arm skips a key it cannot read (a leading blank line, no ref line) and answers OK for a held log; it reads held-row shapes
   differently from held.sh; an empty held register clears; audit-all skips mode-644 instruments; buildnum reads only the
   working-tree register. All are on flags antagonist-a-546 and antagonist-b-546 with their commands.
7. **The rotating audit resumes at gates/regress/47-menu.js:562** (docs/rotating-audit-pointer v24). #545's flag named a
   different resume point and never moved the pointer; the pointer is authoritative.

**#545: BATCH 5. ALL 100 ORDERED JOBS WORKED, GATES GREEN #545 AT 5542 PASS / 0 FAIL OVER 62 SECTIONS, PUSHED TO MAIN.**
Run `build__1793280238451`, 29-30 Oct 2026, under `docs/restart-readiness.directOpening_2026_10_29_batch5`.
**NO APPLICATION CODE CHANGED.** `app.js` is still #530's bundle, md5 `049b41dfb6f1`; `chess.jsx` is `1b41d1d1e765`.

## 0b. WHAT #545 LEFT (items 1 and 5 discharged at #546)

1. **CONTROL-RECORD lines are owed, and they were deferred on purpose.** They are comment lines inside gate files, so adding
   them after the gated sha would change the gated tree. Land them with the next suite, using the measured trials in each
   job's outcome. The gates are 11 (777aa06's x0.9 record moved by item 83), 21 (00670be 49/3 trial b37e93213529),
   25 (991357c), 26 (7c596e9 467/13 trial d5f222191c63), 46 (now 206; 2f7fe2a 196/23 trial ebf59f1ad606),
   47 (8d80037 trial 78fd19c1c246), 58 (b9f71c7 trials 1b0a45293f13, 46a520e7b3aa and 1c2f3b4ad8bd), 66 (now 61;
   d1a2b0e trial 60c7535e7880) and 78 (488f642 22/7 trial 5e17541ffc01). control-audit reads assertionsmoved=3 until they land.
2. **gates/lib.js tapText now carries #441's straddle fix** (item 80, ported from fdca93d). A tapText call on a control that is
   wholly off screen and cannot be scrolled now THROWS instead of clicking blind. #545's full suite was green with it.
3. **gates.sh runs from a copy of itself** (item 86), **refuses a number the bundle is not stamped for** before any gate runs
   (item 98, so launch with CT_EXPECT set to the stamp), and has a third unit block, **unit-held-guard** (item 85, +5 PASS).
4. **verify-log.sh** gained check (6b) per-section self-consistency and check (6c) no red marker in a green log, and unshallows
   instead of `--deepen=400`. **held.sh check** refuses a malformed key at exit 2. **records-gate** freezes archived gatelogs.
   **fastgate.sh** with no argument exits 64.
5. **Open from the antagonists, not this build's:** red-count.sh's replay-cap red [5,8] is pre-existing on 1507ade, and
   `engine-extract.staleRefs()` with no argument throws. A's rotating audit resumes at gates/regress/13-play-after-moves.js.
6. **The disk:** gates/audit/pipefail-grep.sh leaked a 4MB file per probe call until 12a8665. If /tmp fills, look for leaked
   `tmp.*` files first.

**#544: BATCH 4. THIRTY-FIVE JOBS WORKED, GATES GREEN #544 AT 5171 PASS / 0 FAIL OVER 60 SECTIONS,
PUSHED TO MAIN - AND THE PUSH CHECKS TIER REVERTED WHOLE ON FOUR UPHELD VETOES.**
Run `build__1793215280362`, 28-29 Oct 2026, under `docs/restart-readiness.directOpening_2026_10_28_batch4`.
**NO APPLICATION CODE CHANGED AT ANY POINT.** `app.js` is still #530's bundle, md5 `049b41dfb6f1`, and
`chess.jsx` is `1b41d1d1e765` - both byte-identical to main's at the take and at the push. `gates/build.sh`
only ever wrote TRIAL bundles into the scratchpad. **Nothing a player can see moved.**

## 1. READ THIS FIRST: THE TIER IS REVERTED, AND THE SIXTH TRY STARTS BY REVERTING THE REVERTS

`jobs/535-the-push-checks-tier-is-built-and-controlled-on-a-branch-and-held-after-four-adversarial-rounds-each-of-which-found-a-real-defect-2026-10-23`
is **fixed-in-part**, carrier `claude/epic-cerf-c7umbg` at **`af90a0a`** - the last commit before the first
revert. Its fifth try's four repairs are at `6de2f83` on that branch with their eleven case rows
(TC-SUITE-197 to 207) and their mutants, and the drive harness read 163 ok / 0 FAIL / 1 named SKIP with A1
green on the final tree.

**IT WAS REVERTED ANYWAY, and the rule is the opening's own:** "THE TIER LANDS ONLY WHOLE. It passes only if
every repair is committed inside the time box, `gates/checks-tier-drive.sh fixed` reads 0 FAIL with A1 green
on the final tree, THE PAIR UPHOLDS NO VETO AGAINST IT (a veto is answered only by a recorded reproduction
showing it does not hold), and no culprit search names it. Otherwise revert the whole tier BEFORE THE SUITE."
Three of the four held. The fourth did not: antagonist B cast four vetoes from the shipped-surface door and I
could answer none of them with a reproduction showing it does not hold.

  **V1** The tier's ONLY documented invocation returns **exit 0 - which its own interface section defines as
  "CHECKS TIER GREEN ... this commit may push without the full suite" - FROM A ZERO-BYTE JUDGE.** The recipe
  its header publishes four times is `git show origin/main:gates/checks-tier.sh > "$T/checks-tier.sh"`, no
  base that exists carries that path, so `git show` fails at 128 while the redirect has already made the
  empty file, and nothing in the recipe reads `$?`. The honest branch EXISTS and is correct - run from the
  working tree, which the header forbids in capitals, it says `GO FULL: the base carries no
  gates/checks-tier.sh` at exit 2. **The only route that works is the one the tool tells you not to use**,
  which is #454's shape on the tool whose output is permission to skip an 84-minute suite.
  **V2** Its RED is not reproducible and its remedy forbids the one action that clears it. Same judge, same
  base, same head, back to back: run 1 `CHECKS TIER RED` at exit 1 with five FAIL lines, run 2 `GO FULL` at
  exit 2 with "61 ok, 0 FAIL, 1 skipped of 62 declared". `gates/fastgate-drive.sh`'s inner `timeout 250` fired
  under the tier's own load, 143 is SIGTERM, the fixture clone vanished and four later cases failed for a
  reason unrelated to anything they test. And the header reads "do not re-run hoping for a different answer".
  **V3** The unattributed-survivor arm fires on the ordinary case: **two of three real invocations routed on
  it and the process it named both times was the operator's own Claude Code shell.** `grep -rl "CHECKS TIER
  GREEN"` over every archived and working log in this repository returns NOTHING.
  **V4** This build filled the one free **TIER A** sigpipe slot that `gatemanifest.sh`'s own comment names as
  the hole, at `gates/checks-tier-drive.sh:3894` - a pipeline into `grep -q` whose status decides control
  flow, where a SIGPIPE'd `git status` returns 141 and `! 141` is true just as `! 1` is.

**WHAT THE SIXTH TRY DOES FIRST**, in this order, and the job's `outcomeWhatIsLeft` carries the detail:
revert the eleven reverts (`a0a6e69` then `7e304d2 ee03d13 ce5f6cc 0152579 55f3817 0374428 a6f6b97 e5791e9
0e00d85 533084b`), which restores the tier exactly as `af90a0a` had it; then `|| exit 2` on all four published
recipes; then the inner timeout, which must become a REPORTED DECLINE the way this run's item (34) made the
unit block's; then the survivor arm, which must tie a survivor by DESCENT and report rather than route when it
cannot. **AND BEFORE ANY OF IT: get the tier to print `CHECKS TIER GREEN` ONCE, on a real candidate, in this
container, and archive that log.** Five tries have proved its controls green on synthetic fixtures on an idle
box and have never produced the verdict it exists for. B's closing sentence is the one to read first.
**NONE of the four vetoes is against any of the fifth try's four repairs** except V3, which is a defect in the
firing condition of repair 3's own replacement - so do not re-cut what is sound.

## 2. WHAT LANDED ON MAIN

Items (3) to (35) of batch 4, each with its own signed commit, its case rows and its control measured both
ways. The ones a later run is most likely to touch:
- **the font pin is asserted IN THE BROWSER, in every gate** (item 21) - the old assertion read a HOST
  `fc-match` face, which printed clean straight through #537's ten-gate failure. `gates/fontpin-control.sh`
  drives four fontconfig states by EXIT CODE: pinned exits 0 at 322.15, all three degraded states exit 1 at
  373.42. **Know the polarity: the fault is `Segoe UI` NOT at 322.15.**
- **the suite footer's calibration comparison is a REFUSAL** (item 28, on
  `decisions/an-off-calibration-suite-may-not-push-2026-10-27`). A full run that is off calibration, drifted
  mid-run, or carries no comparable line sets red. It parses the four numbers rather than matching a sentence.
  A subset is never reddened. **This run's suite read `calibration AGREES - measured [402.12 322.15 348.28
  322.15]`**, so the gate has now been exercised green on a real full run.
- **`verify-log.sh` can finally say which fontconfig produced a log** (item 29), era-keyed on the log's own
  `toolchain: playwright` line so the 113 archived logs that carry no fontconfig line are reported and never
  refused. `--ignore-fc` prints the override loudly.
- **the unit block's timeout is 1800s with four measurements beside it, and a timeout is a REPORTED DECLINE**
  (item 34). Measured on this tree: 450s idle at 63 cases, so the loaded band is 2025-3150s against the old
  ceiling of 900.
- **the lesson driver's `intro` state now HOLDS the card** (item 30). It used to dismiss it - the hold-tap
  landed on the overlay's backdrop - so no gate in the suite had ever reached that screen. Gate 71 is the only
  regress consumer and it went 39/10 before being adapted; the other eight consumers were run as a subset
  first and every one read its own baseline plus the item (21) font-pin line.
- **`b.card(N)` is scoped to `[data-ct="state-card"]`** (item 35), so a third ask card cannot steal the
  ordinal from the lesson gates.
- **the register's ambiguity alarm counts distinct BUNDLES in all four reports** (item 32), with `RESERVED`
  for a number that names none and a `CLEARED` verdict for one that no longer stands.

## 3. THE TWO VETOES FROM THE DIFF DOOR, BOTH THIS RUN'S OWN WORK

- **`gates/buildnum.sh clear`, shipped by item (10), wrote a row that `gates/fastgate.sh` in the same tree
  REFUSED at exit 1** - "a row no tool in gates/ writes" - because that script keeps a HARD COPY of the state
  vocabulary and its own comment names `buildnum.sh add` as the source of truth. Reproduced both ways on
  separate clones; the control is that the same row shape under `abandoned` answers FAST GATE GREEN on the
  same base. Fixed in all three homes the list lives in, and given case **H62** because the list has gone
  stale once and the only thing that noticed was an adversarial pass.
- **the `check | head` paragraph item (16b) wrote was false in three ways.** The published command exits 0,
  not 141, unless the caller has set pipefail; `${PIPESTATUS[0]}` is the HAZARD, not the remedy, because it is
  141 in both shells; and the dangerous reading is the exit-0 one, which this same header defines as ABSENT,
  so a wrapper reads an ISSUED number as FREE.

## 4. WHAT IS STILL OWED, AND NONE OF IT NEEDS KUNAL

1. **`gates/gates.sh` IS MODE 100644, so every documented invocation of the suite exits 126** - CLAUDE.md's
   own happy path, the subset form, `--selftest`, the script's own usage line and fastgate's printed remedy.
   Longstanding, on main too, and invisible because every real path goes through `bash
   gates/.gates-run-<N>.sh`. One bit. Not this run's item; it needs a job.
2. **`verify-log.sh --citations` arm (2) reads ANY `pass`/`fail` SUBSTRING in a row's last cell as "publishes
   a result".** Found from both doors. It fired **nine times in this run alone** on words like FAILING and
   failed. And 55 case rows were added across this run while arm (2)'s population did not move by ONE, because
   the rows publish "N green / M red". The repair is to teach the arm this project's own result vocabulary.
3. **`gates/gatemanifest.sh selftest` IS RED ON MAIN** - 23 sigpipe sites against a total ceiling of 15 -
   and nothing on the push path runs that arm. This run brought its own contribution back to **zero net**
   (23, A 0, C 7, D 16, main's figure field for field) and did NOT raise `SP_TOTAL_CEIL`, because a ceiling
   raised to cover the count it bounds is the frozen denominator again. Recorded on the sigpipe job.
4. **`gatemanifest.sh selftest` prints NO `TC-SUITE-NNN` ids at all**, which is the direct cause of three
   items the citations ratchet reports every run. Re-labelling those arms closes three ratchet items.
5. **`gates/held.sh` names `clear` and `retire` in its dispatch guard and implements neither**, so both print
   the 35-line help byte-identically to a typo'd verb. The real route is the documented `-` prefix hand edit,
   and `records-gate.sh` accepts it.
6. The rotating audit's two findings from outside this diff: `47-menu.js:483`'s one-directional vacuity on a
   bare negated existence check, and `:496`'s published sentence being broader than its predicate while the
   comparison it claims is in scope and unmade. Pointer advanced to **`gates/regress/47-menu.js:498`**.

## 5. THE MECHANICS A NEXT RUN SHOULD COPY
- **The container restarted once mid-run** (about 03:47Z) and killed a nine-gate subset at the moment gate
  75's section opened. The working tree and the scratchpad survived; the per-run log stem is what preserved
  the rest. Keep a tool call in flight: nothing long survives an idle turn here.
- **Two suite launches were killed deliberately**, the moment each antagonist reported, because a suite of a
  tree that must change authorises nothing. Both partial logs were DELETED so no footerless `#544` log can be
  mistaken for evidence. The third ran 119 minutes on the final tree and is archived at
  `claude/agents/gatelogs/544-all.log`.
- **`md5sum gates/*.sh` was frozen before each harness run and diffed after.** Byte-identical across the whole
  119-minute suite.
- **Run the suite from a copy inside `gates/`** (`gates/.gates-run-<N>.sh`), which is what let item (34) and
  the veto fixes be written while a suite was in flight without touching the running interpreter.
- **Run `gates/verify-log.sh --citations` BEFORE staging, every time, and never a grep of your own.** My own
  check for the arm-(2) trap read awk's `$NF`, which is EMPTY because every row ends with a pipe, so it
  reported clean over nothing - the empty-denominator fault inside the probe looking for a fault.
