# HANDOFF - where the last run left off

> The live version lives in the tracker (artifact 5326ERvZCZ5tEYRkPavPTF); see decisions/one-home-per-document-2026-09-22. This file is the build lane close-out copy; where the two differ the tracker wins.
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
