# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#512**, runId `build__1791642022000`, 2026-10-10. Pen taken on a clean hand-over and released.

## *** #512 DID NOT SHIP. NOTHING ON KUNAL'S PHONE CHANGED. ***

The suite went **GATES RED** on **one assertion** in `gates/regress/48-lesson-flow.js` at **320x540** —
the known, pre-existing lesson-board latch, where the demo board sits at **192px** and the Flip control
runs **35.23px** past its own row because that row cannot hold its children's min-content (227.23 against
192). **It is not this build's**, and that is measured rather than asserted — see below. But one red
section means `gates.sh` cannot emit `GATES GREEN`, and in this project a build is gated only when the log
ends with that string, so **no app code may reach main.**

**THE WORK IS GOOD AND IT IS ON `claude/cool-noether-9p0hf1` AT `8704fa2`.** Gate 21 reads 88/0 on it over
four independent runs including one inside the suite itself, six negative controls redden disjoint sets,
and both blind antagonists' vetoes were upheld and fixed. What it lacks is a green full suite.

## What #512 BUILT, in one line

Part (b) of Kunal's Brilliant-sentence job — the refutation line now runs to **the player's own
recovery** instead of stopping one ply short — **grafted** onto #511's rewritten `sacRun` rather
than replaying the tree that was built for the `sacRun` that no longer exists.

## THE RED: WHOSE IT IS, AND WHY I DID NOT GO ROUND IT

**Kunal has already decided this question.** `questions/q-latch-detector-blocking`, answered
**2026-10-04: `fix-app-first`**. The detector stays blocking and the app is to be fixed; the owning work
is `jobs/468-the-floor-and-the-digest-fix-...`, whose `whatThisJobMUSTDONOW` reads "The detector you added
stays blocking," and `jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29` carries the three
candidate one-liners.

**IT IS NOT MINE, AND HERE IS THE MEASUREMENT RATHER THAN THE ASSERTION.** My `chess.jsx` diff against
main is five hunks — `dropTxt`, `explainAnno`, and three inside `App()` (`sfBestLine`, `sacRun`, the
verdict clause) — 194 insertions / 16 deletions. Grepped for every fit-loop and lesson identifier:
`fitLoop` 0, `boardPx` 0, `SQ_MIN` 0, `lessonBoard` 0, `demoBoard` 0, `hyster` 0, `_legalBoard` 0,
`lesson` 0. The only hits were `over` (19) and `trim` (4) and **I checked them rather than reporting the
count**: every one is a substring of "rec**over**y", "**over**sight", "**over**write", or my own
trim-rule comments. **Zero lines of the board-sizing path are touched.** The latch's mechanism was
established by #468 — `over` is structurally 0 on that screen so the trim is frozen for the visit, and
two further passes hit the `SQ>=24` clamp, which is why the third observed width is exactly 192.00 —
and nothing in a review sentence can reach it.

**THE THREE ROUTES ROUND IT, AND WHY I TOOK NONE.** All three were already refused by #467 and #468 on
this exact gate and geometry, and nothing about my run makes them better:

1. **Widen or re-key `_legalBoard` to admit 192.** Forbidden by the comment beside the assertion in
   antagonist A's own words — firing means *the board shrank*, not that the pin is stale — and it would
   delete the suite's only detector of a defect whose mechanism took four builds and two antagonists to
   establish. #461 and #467 each refused the identical move on this file.
2. **Re-run until it passes.** The latch is measured at roughly **1 run in 5**, so a re-run would
   probably go green — *and that is the argument against it*, in #467's own words about itself. This is
   not a harness flake: it is a true positive on a real intermittent app defect, so re-running to get a
   green is suppressing a finding Kunal has explicitly ruled must keep blocking. It would also not have
   fitted: the suite finishes about 18:30Z and a re-run lands past the pen bound.
3. **Fix the app.** The correct route and **not this run's** — it is another job, it changes a layout
   path this build has no business touching at the end of its slot, and #468 records that its
   verification "is the red not returning across many runs, not a reproduction: the trigger could not be
   provoked in 36 launches." A fix I could not verify is worse than a hand-off.

**AND I WROTE NO `gates/held-trees.tsv` ROW, DELIBERATELY — READ THE REGISTER'S SIGNATURE BEFORE WRITING
ONE [#501's precedent].** That register is, in its own header's words, "the register of gated-**GREEN**
trees that must not ship", and its purpose is #450's: a *green* log cannot tell a later run that a tree
was deliberately refused. **My tree is gated RED, so the mechanical protection already exists** —
`verify-log.sh` refuses the log for not ending green, and no later run can cite a green log for this
tree because none exists. Worse, a row keyed on my `sourceMd5` (`98e60c9b98ca`, which differs from
main's) would make `held.sh check` refuse **the very tree the next run should pick up and re-gate**,
branding good work unshippable on a blocker that has nothing to do with it. The refusal here is not of
the tree; it is of a push without a green suite. That lives in this hand-off and on the job.

## THE ONE THING THE NEXT RUN MUST NOT CARRY FORWARD

**`sanLine.length` is not `r.ok`, and believing it was would have re-opened #389 on the function #511
fixed 28 minutes earlier.** Both blind antagonists found this independently and it is the pair's only
common finding. `sfBestLine`'s stuck-worker path does `setTimeout(()=>finish(line,false),...)` — it
resolves **whatever partial pv has arrived**, so a non-empty line can come out of a search that never
answered. #504's store guard keyed on the line being non-empty; grafted as-is onto #511's token guard it
would have stored a dead search's partial pv as the engine's answer and cached it for the session. Worse
than the defect #511 cured: gate 22 detects a poisoned *empty* record and cannot see a plausible-looking
*partial* one. Fixed by making the signal explicit rather than inferred — an **additive** fourth
parameter `onDone(ok)` on `sfBestLine` (the resolved value is byte-identical for its two other callers,
the moves-view engine line and `playBestLine`) and a pure `sacKeep(ok,line)` that `sacRun` consults. The
guard is TC-R10/S30, and NC5 (`sacKeep` ignoring `ok`) reddens it alone.

## The deliverable

`SAC_LINE_MAX=3` plies of the principal variation, cut back to the last ply that is both **forcing** and
**the mover's own** — so a surviving line is always ODD in length, and `out[0]` (the mover's reply to the
opponent's capture) is the floor. Two guards sit on it, each with its own control:

1. **Per-ply forcing** [antagonist B, F2]. The trim loop now breaks at the first non-forcing ply past the
   first, instead of admitting a quiet opponent move and trimming afterwards. B's ground: `explainAnno`'s
   own `pvForcing = _pv.every(...)` already holds every ply to that standard, so admitting one was a
   contradiction with an assertion already shipped. The **first** ply may be quiet — it is the mover's
   forced reply — and the stories say so.
2. **`sacKeep`** [both antagonists]. Above.

## #512 NAMES THREE BUNDLES. CITE THE MD5, NOT THE NUMBER [#454]

| bundle md5 | source md5 | what it is |
|---|---|---|
| `f6770938d081` | `b1eddfc83e32` | pre-veto. **What both antagonists measured** — cite this one when reading their reports. Gate 22 passed 31/0 on it, which is the R45 contradiction check. |
| `386457b8a54a` | `98e60c9b98ca` | post-veto. **SUPERSEDED BY AN UNNECESSARY REBUILD AND RECORDED AS WASTE** — same source md5 as the shipped bundle, so the only difference is `build.sh:14`'s stamp minute (16:09Z vs 16:12Z). Nothing was wrong with it. |
| `a33b9f8c6931` | `98e60c9b98ca` | **SHIPPED.** |

## The gate: 42 → 88 assertions, and FOUR generations of it exist. A figure belongs to ONE file [#510]

`gates/regress/21-review-brilliant.js`. **The final file is the `h` generation and only SHIPPING and NC3
were measured on it before the push gate**; the rest are labelled with the file they were taken on,
rather than quietly promoted.

| gen | assertions | what changed | SHIPPING | controls measured on it |
|---|---|---|---|---|
| `c` | 85 | the graft's first full gate | 85 / 0 | NC2 79/6, NC4 84/1, NC5 84/1, **NC6 85/0 — VACUOUS** |
| `f` | 86 | S32's input rebuilt from 49 enumerated legal triples | — | NC2 82/4, NC4 85/1 (S26), NC5 85/1 (S30), **NC6 85/1 (S32 alone)**, NC3 **86/0 — CONTROL DESTROYED**, det×3 86/0 |
| `g` | 88 | N3→N3c (max over three engine queries) + N3d (its denominator) | **87 / 1** | NC1 55/33, NC3 86/2 |
| `h` | 88 | third sample moved to its own arm | **88 / 0 ×3** (verdicts identical; det2's payloads differ) | NC3 **87/1, N3c alone** |

**R36 ON THE FINAL FILE, AND I ATTEST THE BAR PRECISELY RATHER THAN THE FLATTERING VERSION:** three runs,
**88 pass / 0 fail each, with an identical verdict on every one of the 88 assertions**. The logs are **NOT**
byte-identical and saying they were would have been an overclaim I caught in my own draft: det1 and det3
hash the same (`ccb10c436f2abd9ffdff67039a690d16`), det2 **differs in exactly five payloads** — N2, N3,
N3b, N4, N5 — because its ply-25 sample came back **one ply** where the others came back three. Its
`samples` field reads `[1,3,3]` against `[3,3,3]` twice. **That is stronger evidence than three identical
quiet runs, not weaker:** the known ply-25 variance fired INSIDE the determinism set and every verdict held
over it, which is the thing N3c was built to do. Verdict-determinism is met; payload-determinism is not,
and the reason is understood, asserted and published rather than smoothed over.

**A fourth run exists that I did not have to arrange:** gate 21 **inside the full suite** reads **88 PASS
/ 0 FAIL**. That is worth more than a fourth deliberate run, because it also proves *mechanically* that
the suite ran the 88-assertion file — a file edited mid-run would show a different total — which is the
independent check that the register fix below was correctly held until the suite had finished.

## Three gate defects I caught against myself, and each tell is reusable

- **S32 was vacuous and its control scored 85/0.** NC6 reverts the per-ply forcing fix and the gate did
  not notice, because the pv I had handed S32 had an **illegal** third ply — so both bundles truncated it
  for an unrelated reason. Rebuilt the input from 49 enumerated legal triples; NC6 then reddens S32 alone.
  The tell was a green where I had predicted red.
- **N3 and N10 were flaky, and my first repair destroyed a bundle-level control.** Measured 6 of 8 runs
  3-ply at ply 25 and 2 of 8 one-ply. Widening both to admit either made **NC3 go 86/0** — the clean
  control for the central hunk group gone, which is antagonist A's exact veto ground at #511 re-created by
  my own fix. Real fix: N3c as a **maximum over three independent engine queries** (1.6% false-red at the
  measured 75% per-query rate, 0% on the `sfEval1` control), with N3d as its published denominator.
- **The third sample was dead and its own denominator caught it on the SHIPPING bundle.** Piggybacked
  after the 761 arm's play-out test, it read 0 plies on every bundle. N3d went **red on the bundle I was
  trying to ship** (`g-SHIPPING` 87/1). A maximum over three samples where one is structurally dead is a
  maximum over two, dressed as three. Moved to its own arm. **Publish the denominator beside the
  maximum** — that is the whole reason the red was visible.

## Falsified. Do not re-take these.

- **`<(git show <sha>:app.js)` as `CT_APP`.** The process substitution's path is gone before the browser
  opens: NC1 read **0 pass / 32 fail** with a `harness threw`. An instrument failure that looks exactly
  like a catastrophic bundle. Re-run from real files: **55 / 33**. And my `run` helper always exits 0, so
  the `||` fallback I had written could never fire.
- **`sanLine.length` as a proxy for a successful search.** Above. It is the pair's common finding.
- **A bare `/[x+#]/` trim applied after the fact.** It admits the opponent's quiet move; B measured the
  inverse-of-the-complaint sentence this produces.

## The numbers [R30]

- **openP0 7 / openP1 90** at check-in (`severity in [P0,P1] AND status eq ready`, all lanes, 97 docs).
- **coverage** 58/58 gate manifest, **5 known-absent**, 0 missing / 0 unlisted. Every `GATES GREEN` in
  this project is honest and blind in exactly those five places.
- **wipAtCheckIn 43** (ready) / 46 (not-closed), set sha256 `42a6c372ee5de9d3`.

## The blind pair: both vetoed, both upheld in full, and the overlap is published without a point estimate

uniqueToA **5**, uniqueToB **3**, common **1**. The common finding is `sacKeep`. **I decline to publish a
Lincoln-Petersen population estimate**: at one shared finding the estimator's variance swamps it, and a
number that looks like coverage is worse than no number. The overlap itself is the finding — two
independent doors on one diff shared one of nine findings, which is an argument for the pair, not for
either door.

## The auditor did NOT run. THIRTEENTH consecutive build.

build-run 2b permits it provided the run says so and why. **Why:** the browser was occupied by the blind
pair, then four control generations, then the determinism set, then the 59-section suite; two Chromiums in
one container is a measured flake source (#507). Thirteen in a row is not a scheduling accident, and
#511's handoff already said the next run should protect time for it rather than drop it. I did not, and
saying so is the only honest version.

## The job is `fixed-in-part`, and the next run must not read it as done

`jobs/the-brilliant-sentence-prices-the-move-instead-of-explaining-it-2026-10-04`. Part **(b)** shipped.
Parts **(a)** the sentence that prices instead of explaining, and **(c)** the centipawn comparison, stay
**open**, and their obstacle is **authority, not difficulty**: both need wording Kunal has not seen. I
verified that against the Desk rather than assuming it — all 83 `answers` documents read, and the four
nearest all fail STEP 1's own test (two have empty `choice` fields with comments that hand work back,
one is about widening the detector, one picks a real option and comments "I'm not sure").

**And the job's own ceiling still stands, unchanged by this build:** (b) fires on **four plies in 265**,
and it does **NOT** fire on Kunal's own hand-found 19...Bxh3!! at ply 38 of game `184024052818` — that
ply prints one ply on the shipped bundle, byte-identical to before. The value of this job is in part (a).
Whoever takes it next should read `theLIMITSOFPARTb_measuredNotEstimated` before raising `SAC_LINE_MAX`.

`gates/held-trees.tsv` still carries **656a6cb** (#504's tree, source `9728a5fbdebf`). That row is
correct and stays: this build did **not** re-push that tree, it grafted the clean half onto #511's
`sacRun`, deliberately dropping #504's `sacStore`/`SAC_DEAD_TRIES` as an R45 contradiction I would
otherwise have authored myself — two mechanisms for one concern.

## Still owed, and what is not mine

- **The five remaining controls on the final gate file.** NC1, NC2, NC4, NC5 and NC6 are published above
  against the `f`/`g` generations, which is honest and is not the same as a figure for the file that
  shipped [#510]. Ordering was decided before the clock pressure, and deliberately: the push gate is the
  suite plus gate 21's own 88/0×3 and NC3 on the final file; the other five are **corroboration of
  disjointness**, so they run after the push, not instead of it.
- `drill-eval-bar-is-an-amber-board-width-decision-2026-10-01` — **blocker still holds, NINE days old
  against R23's 48-hour bound**, so it is a finding by R23's terms. Re-tested against its own instrument:
  all 83 Desk `answers` pulled and grepped for eval-bar/evalbar, **zero hits**. Already filed as
  `jobs/nothing-escalates-a-desk-item-that-was-routed-and-never-written-2026-10-01` [R09]; the build lane
  may not write the Desk [R32/R46], so it is not mine to clear.
- `entry-two-the-coverage-ratchet-2026-10-10` and `entry-three-contracts-become-runnable-asserts-2026-10-10`
  — both still blocked on `build-one-door-for-every-non-gate-check-2026-10-10`, which reads `ready`.
  Whoever takes that one unblocks two.
- `legal-pages-fill-placeholders` and
  `practice-row-label-keyed-to-a-board-threshold-not-its-budget-2026-09-29` — **untestable as written**,
  and that is the finding rather than a pass: both sit in status `blocked` with **no named blocker**, so
  no run can tell when the condition has changed. Covered by the existing ten-status job. The second is
  owningLane orchestrator in any case.

## Two jobs filed, and I filed both with the exact defect a sibling job exists for

Both typed [R51], both with `ifNotDone`, both `status: ready`:

1. **`claims-repo-pen-is-at-its-document-size-ceiling-and-refused-a-close-out-write-2026-10-10`** —
   cls `process`, mode `unexecutable`, fingerprint `3481b97e1542dea5`, P1, owningLane orchestrator.
2. **`held-trees-tsv-cannot-record-that-a-holds-cause-was-discharged-2026-10-10`** — cls `suite`,
   mode `missing-case`, fingerprint `2a13b233d1673f79`, P2, owningLane process-build. Found while
   discharging the hold on this run's own item: #504's row is still correct and there is nowhere to
   record that its blocking cause is now gone.

**AND I FILED BOTH WITH `createdByRunId` ABSENT AND `createdBy` CARRYING PROSE** — which is precisely
`jobs/four-job-fields-are-free-text-so-four-different-queries-silently-under-report-2026-10-06`, a field
read as a KEY and written as a NOTE, whose own remedy is a typed field *beside* the prose. **How it was
caught is the reusable part:** at close-out I queried `jobs where createdByRunId eq <my runId>` to verify
this very handoff's claim that two jobs were filed, and got **zero documents** — the check that would
prove the claim was defeated by the defect it was checking for. Repaired on both at 17:3xZ (prose kept,
typed field added), and recorded on each job rather than quietly patched. The prose version is genuinely
more useful to a human, which is exactly why this recurs.

The ply-25 engine variance was **appended to the existing gate-22 job rather than filed as a third id**
[R51: never file on the ground that the match was not exact].

**Two jobs arrived from OTHER lanes while this run was in flight, and the next run reads the queue:**
`the-tier-check-compares-a-stamped-bundle-so-no-rebuild-is-ever-byte-identical-2026-10-10` (17:05Z, cls
`suite`, mode `wrong-oracle`, on Kunal's instruction — it concerns `fastgate.sh`, directly adjacent to
this lane's push gate) and `the-three-r44-consumers-still-describe-a-two-state-lock-2026-10-10` (17:20Z,
cls `process`, mode `rule-gap`). Neither is mine and neither was acted on here; both are named so they
are not re-discovered.

## R37: the feedback list was drained TWICE and the second read is reported as a comparison

**186 documents both times, byte-identical, 62 not-closed, zero new arrivals and zero version bumps.**
Reported as a diff of the two reads rather than as "nothing there" — the rule exists because a first read
carried forward is indistinguishable from a second read that found nothing. `fb-20260912-1624-29e0`
("FIFTH TIME, AND NOW NAMED PRECISELY — the brilliancy explanations") is the entry this build serves.
