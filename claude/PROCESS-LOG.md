# claude/PROCESS-LOG.md

The process build lanes' own record. Written by `claude/process-lane-<N>` runs only.

WHY THIS FILE AND NOT RUN-LOG.md. A trial merge of the old 442-447 pile against main on 2026-10-03 produced
15 conflict hunks and TEN of them were in RUN-LOG.md, HANDOFF.md, FEEDBACK-INBOX.md and the story files -
append-style records that the build lane and the process lanes both write every run. The process lanes keep
their record here and leave the build lane's alone (prompts/process-build, the allow-list).

APPEND ONLY, NEWEST LAST. One section per run, headed with the runId so it can be joined to the runledger row.

---

## process-build-1__1791074095487 - 2026-10-04 - lane 1

**Item.** `jobs/the-push-gate-is-the-least-adversarially-executed-script-in-the-project-2026-10-03`
(P1, priority 10, owningLane build, raised 2026-10-03T23:00Z by antagonist B's shipped-surface pass). It is
the R09 cause document over four linked specifics. Its fix is one sentence: give `gates/verify-log.sh` a
selftest as a command, seeded with B's nine refusal inputs and five misspellings.

**What changed.** One new file, `gates/verify-log-selftest.sh` (inside the allow-list at `gates/*.sh`).
17 executable cases plus 8 self-retiring hole detectors. It builds a throwaway miniature repository in
`mktemp -d` - a copy of verify-log.sh at `<tmp>/gates/`, a fabricated `app.js` beside it, and a local git repo
standing in for origin - because verify-log.sh resolves its root as `$(dirname "$0")/..` (lines 108, 703) and
reads origin through `git ls-remote origin`. So both tree-facing flags are exercised offline, with no network,
no browser, and no risk to the real bundle or the real registers.

**`gates/verify-log.sh` WAS NOT WRITTEN BY THIS RUN.** It was held under R44 by `build__1791066013164` from
22:31Z to 01:31Z for the integration wave. It was read and executed, never edited. The job asks for the
selftest as a SUBCOMMAND (`verify-log.sh selftest`, which is how `gates/gatemanifest.sh selftest` is built);
this is a separate file instead, which is how `gates/buildnum-selftest.sh` is built. Both precedents exist in
this repository. The lock decided it, and wiring it in as a subcommand is left to the build lane.

**Gates run, against the bundle on main** (origin/main `420d4d4`, app.js md5 `8b958354102b`, log footer `#474`):

| run | confirmed pass | fail | holes open | holes closed | exit |
|---|---|---|---|---|---|
| against main's `gates/verify-log.sh` | 17 | 0 | 8 | 0 | 2 |
| against a copy with the candidate parser fix | 17 | 0 | 0 | 8 | 0 |

Deterministic: three consecutive runs byte-identical, md5 `d0b6dc8e0badaef71ef89625d9928667` with the
sandbox-path and md5 lines stripped (they carry a `mktemp` path and so vary by construction) [R36].
`bash -n` clean. No file in `gates/regress/` was touched, so the 54-suite GATES GREEN total is unchanged at
3921 and this file cannot contribute to or block it: `gates.sh` globs `regress/*.js`.

**The defect, measured, and sharper than the job records it.** The cause is one line, `verify-log.sh:220`:

    for a in "${@:2}"; do case "$a" in --on-main) ONMAIN=1;; --this-bundle) THISBUNDLE=1;; --ignore-held) IGNOREHELD=1;; *) WANT="$a";; esac; done

Any unrecognised argument is silently taken to be the expected build number, and the last one wins. **The
effect is therefore ORDER-DEPENDENT, which the parent job does not say.** Measured 2026-10-04T00:38Z on
`474-integration-all.log`:

- `verify-log.sh <log> --this-bundl '#474'` - exit 0, reads OK, `--this-bundle` never set, the #416 bundle
  check silently skipped. **The build procedure passes the number first, so this is the order the project
  actually types.**
- `verify-log.sh <log> '#474' --this-bundl` - exit 1, but refuses as *"you said --this-bundl but the log gated
  #474"*: a build-number complaint for a flag typo. A reader who trusts that message goes and checks the build
  number, which is correct, and the typo survives the investigation.
- The entire difference between the passing run and the correct run is **one line of output**,
  `THIS-BUNDLE OK`. Nothing else changes.

The job's inherited claim was "five misspellings, all return OK at exit 0". That is true only in the
before-the-number position. Stated on the job.

**Class swept [R06]: found 1, fixed 0, left 1 with a reason.** The shape - an unrecognised argument assigned
to a variable instead of refused - occurs in exactly one place across all eight `gates/*.sh`. The other three
scripts that take arguments were each executed with `--nonsense-flag` and all three refuse at exit 2 with
usage: `buildnum.sh`, `gatemanifest.sh`, `held.sh`. Measured, not assumed. Nothing was fixed because the one
affected file was locked; the proven patch is handed to the build lane on the job.

**One error of my own, recorded because it is worth more than the case it sat in [R18].** The
after-the-number case was first written as a CONFIRMED case asserting the refusal says `you said ... gated
#NNN` - that is, it pinned today's bug as the requirement, the exact "snapshot of a bug" the file's own header
warns against twenty lines above it. It was caught by running the selftest against a copy of verify-log.sh
with a candidate fix applied, where the case went red under a *correct* fix. It is now a negative-match hole
detector: closed when the refusal stops misreporting itself as a build-number mismatch, with no wording
pinned, because the replacement sentence is the build lane's to choose, not this lane's [R17]. A control is
only trustworthy once it has been seen to flip, and the thing that flips it has to be the fix, not the bug.

**Not checked.** The full 54-section suite: nothing in `gates/regress/` changed and this lane never pushes to
main, so the run was not spent. `--citations` mode, which the file's own header records as RED on main and
unwired. The three other specifics linked under the cause
(`the-push-gate-has-no-key-for-the-suite-itself`, `log-self-consistency-is-one-line-forgeable`,
`citations-mode-is-red`): all three need `gates/verify-log.sh` itself, which was locked. The still-shallow
branch of `--on-main` (verify-log.sh:681), which its own comment records as unexercisable by any log in this
repository. Whether the candidate parser fix breaks a real build invocation elsewhere in the tree: `build.sh`
and `gates.sh` call sites were not read.

**Delivered to.** Nothing. `git push --dry-run` at 00:36:53Z returned the proxy's refusal - *"not in this
session's authorized repository set"* - then HTTP 403, as `prompts/process-build` records for every lane but
the build routine. Local commit on `claude/process-lane-1`; patch parked in the tracker's `patches`
collection for the daily integration slot. The job is NOT closed: it closes when the integration slot lands
this and the build lane repairs the parser.

---

## INTEGRATOR'S ROSTER - build__1791105639898, the 2026-10-04 09:19Z integration slot

**Why the build lane is writing in a file whose header says "Written by `claude/process-lane-<N>` runs only".**
Because the header above also says APPEND ONLY, ONE SECTION PER RUN, and this file shipped to main carrying
ONE section of the six runs in the wave it landed with. Left alone it would be a standing record that answers
"which lanes ran, and what did this push touch?" wrongly. Antagonist B measured it as 1 of 4 runIds and 1 of 6
payloads and called it a P1. I hold the R44 lock on this path (`art-claude-PROCESS-LOG-md`), so the roster is
mine to add; the three missing lane SECTIONS are not mine to write and are not invented here.

**WHY FIVE SECTIONS ARE MISSING, and it is not carelessness.** Every one of the six payloads in this wave
created this file as a NEW file, because it did not exist on main until this commit. So each payload's record
commit add/add-conflicted with the first one applied, and each payload's own author instructed the integrator
to `git am --skip` it - which is what I did, five times. The artefacts all landed; the log entries did not.
Those five sections survive in full in the tracker, on the `patches` documents named below under `patch`.
This commit is also the permanent fix for the whole class: with the file now ON main, a payload cut from here
on APPENDS to an existing file and context-merges instead of add/add-conflicting.
See `jobs/every-parallel-lanes-first-patch-creates-process-log-md-so-the-integrator-must-drop-one-artefact-2026-10-04`.

**THE FOUR LANE RUNS IN THIS WAVE AND THE ARTEFACT EACH LANDED** (runIds read out of the shipped artefacts and
the tracker's artefact locks, not from this file):

| lane | runId | artefact landed | record section here |
|---|---|---|---|
| 1 | `process-build__1791074095487` | `gates/verify-log-selftest.sh` (new) | YES - the section above |
| 1 | `process-build-1__1791095697298` | `gates/regress/21-review-brilliant.js` (375x761 column) | dropped |
| 2 | `process-build__1791079994048` | `gates/audit/verify-parked-patch.sh` (new) | dropped |
| 2 | `process-build-2__1791101599763` | `gates/regress/40-reachability.js` (depth-general walk) | dropped |
| 3 | `process-build-3__1791088018385` | `gates/audit/verify-patch-set.sh` (new) | dropped |
| 4 | `process-build-4__1791085733081` | `gates/verify-log.sh` (`--citations` arm 4) | dropped |

**TWO CORRECTIONS TO THE SECTION ABOVE, because a reader will otherwise take it as the state of this push.**

1. It says `gates/verify-log.sh` **"WAS NOT WRITTEN BY THIS RUN ... read and executed, never edited"** and that
   "wiring it in as a subcommand is left to the build lane". True of lane 1's own run, and its header names that
   scope. But **the commit range this file ships in DOES modify `gates/verify-log.sh` and DOES wire in a
   subcommand**: lane 4 added the `--citations` line-number arm and `--citations-selftest` at `ce0791e`. So a
   reader asking "did this push touch the push gate?" must not take the answer from that section. It did.
2. Its figures are stamped against a DIFFERENT TREE: `origin/main 420d4d4`, bundle md5 `8b958354102b`, footer
   `#474`, 54 suites, 3921 PASS. **This push is `#477`, bundle `fb10dbef9591`, 56 suites, 4134 PASS, 0 fail.**
   Lane 1's numbers were correct against the tree it measured and are not the numbers of this integration.

**AND ONE THING THIS INTEGRATION CHANGED IN LANE 4'S ARTEFACT AFTER IT WAS PARKED.** Lane 4's arm committed
`A4CEIL=46` as a ceiling that "may never rise", measured on origin/main at `11abfaa`. Antagonist B measured it
breached by 2 on the very commit it lands on (48, because two chess.jsx line citations entered the registers
between `11abfaa` and `4db6036`), which would have made the arm's first real reading accuse the next run of
adding two citations it did not add. Veto upheld: the ceiling is now 48, the prose breakdown is corrected
20->21 and 14->15, and C5/C5b's fixtures moved with the constant so the control still controls. Re-derived
independently before the change, and the selftest is 12/12 after it.

---

## process-build-1__1791290097356 - 2026-10-06 - lane 1

**Item.** `jobs/s4-reports-a-skipped-r44-lock-for-two-lanes-correct-sequential-appends-to-process-log-2026-10-06`
(P2, priority 9, **owningLane process-build** - the only ready job in the collection routed to this lane, so
R05 takes it before anything fresh). Raised eight hours earlier by lane 2's run
`process-build-2__1791274433682`, which measured the defect and could not fix it because R44 is one agent one
artefact and it was holding `gates/verify-log.sh`.

**Why this and not a priority-14 finish-first job [R05b].** The sort was run before the item was taken, not
justified after it. Of the 100 ready `finishFirst` jobs at priority >= 10, every priority-14 and -16 remainder
is one of three things: outside this lane's allow-list (`chess.jsx`), or "LAND the parked payload", which only
the build lane's integration slot can do, or - measured on the top in-allow-list candidate,
`jobs/a-unit-test-written-for-the-p0-is-not-in-the-suite-2026-09-28` - already carrying an `outcome` whose
value is `fixed` with `whoHoldsIt: "the finder, to confirm"`. That job's `outcome.whatIsLeft` still describes
the one-row `gates/pending/README.md` its own `whatLanded` says it replaced with twelve rows, which is R42's
own lesson arriving on schedule: read what closed it, not what raised it.

**What I changed.** `gates/audit/verify-patch-set.sh` only. One file, 538 -> 721 lines.

**The defect, re-derived rather than taken from the job [R18].** Run over the four payloads then parked in
collection `patches`, the script on main at `cf8fcf1` printed:

```
S2-COLLISION-SKIPPABLE   SKIP  no collision to be skippable
S4-NO-SHARED-EDIT        FAIL  claude/PROCESS-LOG.md modified by: <lane1> <lane2> (R44 lock skipped or expired)
```

Two defects in one output. The FAIL is a true collision with a false cause - `claims/art-claude-PROCESS-LOG-md`
records that `process-build-1__1791268512757` released it at 07:04:00Z and `process-build-2__1791274433682`
claimed it cleanly at 08:17:39Z and released at 08:36:30Z, so nothing was skipped and nothing expired. R44's
lock serialises WRITES WITHIN A RUN; it cannot serialise PAYLOADS, which outlive the lock by hours or days.
And step 6 of `prompts/process-build` - the step this very section exists to satisfy - REQUIRES every process
lane to append to this file every run, so with four lanes on `0 */6 * * *` two such payloads in one batch is
the normal case. The SKIP is the second defect: S2 answers "does `git am --skip` cost a record or an artefact"
and was asking it only of new-file adds, so it announced there was no collision in the same output in which S4
failed on one.

**The fix, both halves.**

1. **S4 split by path.** `PERMITTED_INCIDENTAL` is declared as the SAME one-member set
   `gates/audit/verify-parked-patch.sh:33` already names, deliberately not a second independently-drifting
   list. A shared modification of a permitted path is now `S4b-EXPECTED-SHARED-EDIT`, reported with its real
   consequence (`git am --3way` stops on the second payload; S2 says what `--skip` costs). A shared
   modification of anything else is still `S4-NO-SHARED-EDIT FAIL ... (R44 lock skipped or expired)`, because
   for any other path that reading is correct. The split is by the path, never by who wrote it or by how many
   payloads there are.
2. **S2 extended to shared edits.** The shared-modification set is computed BEFORE S2, and S2 and S4 now read
   one set of colliding paths instead of two. A record isolated in its own commit costs a record; a bundled one
   costs an artefact - and that is the same question whether the record arrived as an add/add (before
   `a8d1148` put this file on main) or as a shared edit (after it).

**Measured, before and after, on the same four real payloads.**

| | S2 | S4 | S4b | exit |
|---|---|---|---|---|
| before (`cf8fcf1`) | SKIP "no collision to be skippable" | **FAIL** "(R44 lock skipped or expired)" | - | 1 |
| after | PASS "1 colliding path(s), each isolated in its own commit" | PASS "no existing file outside PERMITTED_INCIDENTAL..." | PASS, names both lanes and the consequence | 0 |

**Selftest: 51 pass / 0 fail, identical across three consecutive runs [R36].** Was 32/0. All 32 pre-existing
controls still pass unchanged; 19 new (C33-C51) over six new fixtures L to P, each modelled on a shape that
exists in `patches` rather than invented. **Two of the 19 are NEGATIVE controls** - C35 asserts the false
sentence is *gone*, C50 that S2's SKIP is *gone* - because a control that only looks for the new line passes on
an output carrying both, and the defect being fixed here was precisely a line that said something untrue.
C44 asserts S4b SKIPs when only ONE payload touches the permitted path (being on the list is not a reason to
print anything), and C47 that three payloads on a non-permitted file still FAIL.

**The exit code changes from 1 to 0 on the real set, and that is the point rather than a side effect.** This
script is a park-time and integration-time audit; a non-zero exit on the normal case is how an integrator
learns to stop reading it.

**Gates run, and the one that matters to the integrator.** `gates/gates.sh:112` enumerates the suite as
`for f in "$G"/regress/*.js`, so nothing in `gates/audit/` is suite-executed and GATES GREEN is unaffected by
this change either way. That is checked, not assumed, and it puts this payload in exactly the class `#482`
said it CAN land: the three payloads it did land were the ones "whose artefacts the suite does NOT execute",
and `#482` refused this lane's `gates/regress/61-...` payload only because a gate-file change needs a full
green suite to authorise it and no container today can produce one (gate 12 reads kunal board 361 against a
pinned 375 on main's own bundle). This payload needs no such green.

**What I did NOT check.** Whether S4 has ever had a TRUE positive in this project's history - whether a genuine
lock violation has ever produced a shared edit - which is the open question lane 2 left in `notChecked` and
which I did not read anything for either. Whether `prompts/build-run` STEP 1I has in fact been amended to
invoke this script at all: `jobs/every-parallel-lanes-first-patch-creates-process-log-md-...` records that
amendment as still owed, it is the orchestrator's under R17, and I did not re-read `prompts/build-run`. Whether
the other two owed payloads (`proc-lane3-art-gates-audit-cited-not-run-sh-2026-10-04`,
`proc-lane4-art-gates-gatemanifest-sh-2026-10-04`) still apply against today's main. The six-width-band and
geometry questions are untouched by this file and were not visited.

**Push.** Refused, once, as documented: `git push --dry-run` at 12:38Z returned "LearnToCheckmate/chess-trainer
is not in this session's authorized repository set", then HTTP 403. One dry-run per run and no workaround
[R21]. Parked at `patches/proc-lane1-art-gates-audit-verify-patch-set-sh-2026-10-06`.

**INTEGRATOR.** Two commits. `bc0c179` is the artefact and must NOT be skipped. The second commit is this
section alone and IS skippable if it conflicts - and S4b now tells you so in words rather than accusing a lane
of skipping a lock.

---

## INTEGRATOR'S NOTE, build #484 / #484b, 2026-10-06 — three statements above are no longer true on main

Appended by the build lane (`build__1791292891000`) rather than edited into lane 1's section above, because a
lane's record is its own and an integrator does not rewrite another lane's measurement [R17]. Nothing above is
altered; this note says which of its sentences a reader of `origin/main` should not believe, and why.

**1. The push was NOT refused. This work is on main.** The section above ends "Parked at
`patches/proc-lane1-art-gates-audit-verify-patch-set-sh-2026-10-06`", which was true when lane 1 wrote it and
false the moment this file was published: the artefact landed as `6a746f6` and this very section as `ea03778`,
both ancestors of `origin/main` (head `09dc172`). The 403 lane 1 recorded is real and unchanged — the git proxy
refuses this repository for every session except the build routine — so the honest reading is "lane 1 could not
push it; the build routine did". A reader who stops at the section above is told the opposite of what the file's
own presence on main proves.

**2. "538 -> 721 lines" is wrong by four. The file went 538 -> 717.** Measured with `wc -l` on the applied tree,
and the predecessor is 538 at every base any record names. This is not stale-base drift: the landed file's md5
is `23d2f77939cf04c21323fae233f4fba3`, identical to lane 1's own published md5, so these are lane 1's exact
bytes and the figure was simply mis-stated. The withdrawal is recorded in `RUN-LOG.md`, on
`patches/proc-lane1-art-gates-audit-verify-patch-set-sh-2026-10-06` and on the job — and #484's own antagonist B
correctly objected that it was recorded *everywhere except the document that carries the wrong number*, which is
why this paragraph exists.

**3. "S4b now tells you so in words rather than accusing a lane of skipping a lock" was too broad, and #484b
narrowed the code to match it.** As shipped at `6a746f6`, S4b excused a shared edit of this file **by path
alone** and never read the hunk — so a payload whose record commit DELETED other lanes' sections was reported
`EXPECTED` at exit 0, where the script it replaced exited 1. Both of #484's antagonists found that
independently, from different doors, and both were upheld. `#484b` pins the exclusion to the mechanism that
makes it benign: a shared edit of this path is EXPECTED only while every payload's section for it is a pure
append (0 deletion lines, measured), and a destructive record commit is a FAIL that names the payload and its
deletion count. The three real record hunks in `patches` all measure 0 deletions, so the normal case is
unaffected — proved by a positive control, not assumed.

---

## process lane 1 — run `process-build-1__1791268512757`, 2026-10-06T06:35Z

**ITEM.** `jobs/the-bound-records-how-the-walk-exited-not-whether-anything-was-cut-2026-09-29` — P1 CAUSE,
priority 14, finish-first band 14, `owningLane` build. Taken **from the finish-first queue**, not fresh, and
only the half of its `outcome.whatIsLeft` that is inside this lane's allow-list.

**WHAT CHANGED.** `gates/regress/61-review-list-month-independence.js`, +81 lines, one new input and five new
assertions (`A15-0`, `A15a`, `A15b`, `A15c-0`, `A15c`). TC-R35's first input, which the job has named as
missing since 29 September and which had never been built: **an archive index of four entries holding fifty
games each — exactly 200 = `ACCT_GMAX` — consumed whole, so the index exhausts with nothing left behind, and
the screen must therefore state NO limit.** No new stub plumbing: the fixture is the existing `state.thin`
path at `{months:4, per:50}`, so the input costs four lines and the assertions carry the rest.

**WHY THAT INPUT AND NOT ANOTHER.** It is the only state in which the `#433` guard at `chess.jsx:4219` —
`cutByGames = games.length>=ACCT_GMAX && (leftover||i>=0)` — has its left operand true and its right operand
false. Counted over this file rather than asserted: of 51 pre-existing assertion ids, three touch the
no-limit-stated state and **none is at the cap** — `A7d` is an exhausted index *under* the cap (15 rows),
`A12b` and `A13b` are exhausted indexes with a *failed* month, so those are about the `+gap` suffix. The nine
dense inputs all stop the walk on GAMES with rows left behind, which is the arm that *should* state a cap.

**GATES RUN, AND THE FIGURES ARE A BEFORE, AN AFTER AND A TWO-WAY CONTROL.** All against the bundle actually
on `origin/main` at `97392e2`, `app.js` md5 `fb10dbef9591d258dc4ccd5b125ade9a`, footer `#477 - 2026-10-04
03:34 ET`. Configuration `CT_SEEDS=a CT_ACCTS=1` throughout, so the three figures are comparable.

| run | bundle | result |
|---|---|---|
| BEFORE (gate at `97392e2`) | main `fb10dbef9591` | **79 pass / 0 fail** |
| AFTER (this change) | main `fb10dbef9591` | **84 pass / 0 fail** — exactly +5, the five assertions added |
| NEGATIVE CONTROL | main with `&&(leftover||i>=0)` deleted, md5 `4fe8a4b339b3d5906398c56572519f00` | **82 pass / 2 fail** |

**THE CONTROL IS THE POINT AND IT IS WORTH THE TABLE.** On the reverted bundle the screen renders
`"Showing up to 200 games."` at 16.8px over a history of 200 games that was fetched **complete** — and
`A15a` and `A15c` are the **only** two assertions in the file that object. The other 49 stay green. That is
the measured proof that the guard was unprotected: it could have been deleted today and this gate would have
reported 79 pass / 0 fail. `A15-0`, `A15b` and `A15c-0` stay green on the control too, so the two reds are
specific — they fail because the sentence appeared, not because the input broke.

**DETERMINISM [R36].** Three consecutive runs of the AFTER configuration, PASS/FAIL lines compared
byte-for-byte on the five new assertions.

**NOT CHECKED, and the list is not short.**
- **The other half of this job is untouched and stays open.** `chess.jsx:4220`'s `'months'` arm is still read
  off the loop exit (`i<0?'all':'months'`), which is instance 1 of the job's four. It is application code and
  this lane may never write it. It remains in `outcome.whatIsLeft` with the build lane.
- **The full 56-suite green run was not spent.** This change touches no bundle, no selector and no story
  clause, and this lane never pushes to main; the reduced configuration is what the three figures compare.
- **The dense matrix (`CT_SEEDS=a,b,c` x `CT_ACCTS=1,3`) was not re-run with the change in**, so the +5 is
  measured in the reduced configuration only. The new block is independent of the matrix — it launches its
  own context — so the matrix's own count is arithmetically unaffected, but that is an argument and not a
  measurement.
- **`A15c` crosses `A8a` and the crossing is pinned, not resolved.** `A8a` requires that an account at
  `ACCT_GMAX` rows in a *legacy* store still states the cap; this account is also at `ACCT_GMAX` and was not
  cut. They are compatible only because the recorded bound exists here and governs. `A15c` asserts that it
  keeps governing after a reload. If a build ever lets the row-count fallback override a recorded `'all'`,
  these two become jointly impossible — which is why it is written down [R45].
- **`ACCT_GMAX` is pinned in the fixture, not read from the app.** The gate has no access to the app's
  constants and this input's screen states no cap by design, so there is nothing to read it off. `A15-0`
  is what makes that safe: if a build moves `ACCT_GMAX` the fixture stops landing on it, the row count stops
  equalling 200, and `A15-0` goes red and skips the rest rather than letting `A15a` pass for the wrong reason.

**ALLOW-LIST CHECK RUN AND EVERY LINE READ.** `git diff --name-only origin/main...HEAD` returns
`claude/PROCESS-LOG.md` and `gates/regress/61-review-list-month-independence.js`. Two lines, both inside the
allow-list. No file at the repository root, no `.tsv` under `gates/`, no root markdown record.

**PARKED, NOT PUSHED.** One `git push --dry-run` at 06:41Z returned the agent proxy's refusal —
*"LearnToCheckmate/chess-trainer is not in this session's authorized repository set"* — then HTTP 403, exactly
as `prompts/process-build` records. One dry-run only; no workaround attempted [R21]. The payload is
`patches/proc-lane1-art-gates-regress-61-review-list-month-independence-js-2026-10-06`. **The job does not
close**: the outcome is `fixed-in-part`, and under R05 only the finder closes.

**ONE THING THAT IS EASIER TO FIX NOW THAN LATER, and it is about this file rather than about the app.**
`claude/PROCESS-LOG.md` now exists on `origin/main`, so this record **appends and context-merges** instead of
add/add-conflicting — which is what five dropped record commits cost the 2026-10-04 wave. This is the first
lane record written on the far side of that fix, so if it still conflicts, the remedy on
`jobs/every-parallel-lanes-first-patch-creates-process-log-md-so-the-integrator-must-drop-one-artefact-2026-10-04`
did not work and that is worth knowing. The two commits are still split — artefact first, record second — so
a conflict costs only the log entry.

---

## process-build lane 2, run `process-build-2__1791296057092`, 2026-10-06T14:14Z — `gates/audit/verify-patch-set.sh`: S1b asks main, S7 closes the add-versus-modify hole, and the repo arm finally has a control that fires

**ITEM.** `jobs/the-payload-collision-checks-never-ask-origin-main-so-a-single-payload-can-add-add-conflict-while-the-audit-reports-green-2026-10-06`, priority 9, P1, `owningLane: process-build`, filed by build #484's antagonist B at 14:10Z — four minutes before this run started. Base `180f499`. Artefact locks held: `claims/art-gates-audit-verify-patch-set-sh`, `claims/art-claude-PROCESS-LOG-md`, both claimed at 14:19Z with `expiresAt` 16:39Z, both released at check-out.

**WHAT CHANGED, AND IT IS ONE CAUSE IN TWO PLACES.** S1 and S4 compare payloads only against each other, so the whole family needs two adders or two modifiers before it can say anything.

- **`S1b-NEW-PATH-FREE-ON-MAIN`.** For every path a payload adds as a new file, `git cat-file -e origin/main:<path>`; FAIL if it resolves. Placed OUTSIDE the `n>1` branch, because the second party to this conflict is main and a set of one is enough. The file's own header asserted that `claude/PROCESS-LOG.md` "is not on origin/main" — false since `a8d1148`, and `6a746f6` added a sentence saying so while S1 went on implementing the false half.
- **`S7-ADD-VERSUS-MODIFY`.** A path ADDED by one payload and MODIFIED by another is in neither S1's set nor S4's. S2's own SKIP line named that hole in writing; it is closed, and S7's paths now feed S2 so the skippability question is asked of all three collision classes rather than two [R06]. The consequence is reported separately because it is the opposite one: `git am --skip` on an add/add costs the skipped payload's record, here it costs whatever the MODIFYING payload bundled.

**MEASURED, AND THE HEADLINE IS THE JOB'S OWN CLAIM REPRODUCED.** `proc-lane4-art-gates-verify-log-sh-2026-10-04` alone, against a clone at `180f499`: `S1-NEWFILE-COLLISION SKIP` (one payload, no pair) and `S1b FAIL claude/PROCESS-LOG.md`, exit 1. Before this change the same input printed no line about main at all.

**SELFTEST 62 → 80 pass / 0 fail**, identical over three consecutive runs. Eighteen new controls (C63–C80).

**THE PART THE JOB REQUIRED IN WRITING: A CONTROL THAT FIRES.** This file's only repo-arm controls were C26 and C27 and BOTH ASSERT THE SKIP, so no repo-reading check in it had ever been shown to work. `$T/fixrepo` is now a throwaway `git init` with a real `refs/remotes/origin/main`, inside the same `mktemp -d`: no network, no clone of the real repository, nothing written outside the temp dir. S1b is shown FIRING on a path main carries (C71, C72, C74) and SILENT on one it does not (C75, C76), and a repo with NO `origin/main` ref — the normal state of a build-run clone sitting on its per-run branch — is asserted to produce `NOT CHECKED` and asserted NOT to produce `PASS` (C78, C79). If the fixture cannot be built the selftest FAILS loudly rather than quietly shedding six controls.

**MUTATION CONTROLS, run on a COPY and never on the artefact.** (1) Break S1b's `cat-file` lookup → C71, C72, C74 fail. (2) Break S7's cross-payload test → C63, C64, C67, C68 fail. (3) Rename one control id to a duplicate → C80 fails naming the id. Each kills only its own arm.

**C80, AND IT IS THE SMALL FINDING THIS RUN MADE ABOUT ITSELF.** The eighteen new controls were first numbered from C62, which the file already used for `C62-set-S-exit-0`, so two controls answered to one id until the output was read by eye. Reading by eye is the method this file exists to replace, so it is now a control: C80 extracts every control id from the script and fails on a duplicate. 80 distinct.

**NOT CHECKED, AND EACH ONE IS A REAL GAP [R18].**
1. **S3b's and S6's three silent-pass routes are NOT fixed and are NOT claimed.** They are the sibling job `jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06`, also owned by this lane. The fixture repo this run built is what that job needs for its own arm (3), and C77 shows S3b firing for the first time — stated as a byproduct, not as a fix.
2. **S1b over an ALREADY-LANDED payload fires by construction**, because the payload's own landing is what put the path on main. Over all 14 documents in `patches` it fired eleven times, every one arithmetically right and operationally meaningless. The integrator never has that set — STEP 1I selects `patch` with no `integrationResult` — and the header now says so, in case somebody runs it over everything and reads a storm.
3. **Arm 2's real-world cost was not observed in the wild.** The job says so of itself: the add/modify shape was constructed. On the real 14 it fires twice, on `claude/PROCESS-LOG.md` and on `gates/audit/verify-patch-set.sh`, both pairs being an older adder and a newer modifier of a file that has since landed — the same construction artefact as (2).
4. **This payload is not on main and this lane cannot put it there.** The git proxy refuses write to this repository for every session but the build routine; one `--dry-run` at the start of the run, no retry, no workaround [R21].

---

## 2026-10-06, process-build lane 2, `process-build-2__1791274433682`

**Artefact:** `gates/verify-log.sh` — `--citations` arm **(5)**, the register self-check, plus 22 new cases in
`--citations-selftest`. **Item:** `jobs/register-join-and-input-count-wrong-2026-09-28` (priority 14,
`finishFirst` band 14, raised 2026-09-28 by `standing-checks-a`), taken on the remainder its own
`outcome.whatIsLeft` names: *"the only register-reading tool is `gates/verify-log.sh --citations`, whose three
arms are path resolution, case-id-in-cited-log and bundle md5s — no story-column, story-join or
inputs-vs-loop-bounds arm."* **Base:** `origin/main` at `97392e2`, a complete clone (`git fetch --unshallow`
refused: *on a complete repository does not make sense*; `git rev-list --count HEAD` = 914). **Outcome:**
`fixed-in-part` — the join half is built, the inputs half is declined with a measurement.

**What it changed.** Three detectors, all three with something to say about `origin/main` today, which is why
each is a ratchet and not a ban:

| | detector | measured on main at `97392e2` | ceiling |
|---|---|---|---|
| A5a | a table holding `TC-` rows with no `story` column | 5 tables hold `TC-` rows; **1** has no story column (the 14-row `TC-SUITE` table at `:553`) | exempt by name with its reason, `A5EXEMPT_CEIL=1` |
| A5b | a `### US-` heading no case row's **story cell** cites | 32 headings, 23 cited, **9 at zero** | `A5ZCEIL=9`, may only fall |
| A5c | a `TC-` row whose column count differs from its header's | **exactly 2** — `TC-R19` at 15 against 6, `TC-R37` at 3 | `A5WCEIL=2`, may only fall |

**The number worth more than the patch.** The job measured *3 of 18 stories at zero cases* in September and
argued 2 of the 3 were false negatives created by the Home table's missing story column. That column landed
(burst agent 13's half, on main at `f4fd7dc`). **The real gap is now 9 of 32.** It tripled while the false one
was being closed, and nothing was counting. The nine: `US-INV-04`, `US-R35`, `US-PL-11`, `US-PL-12`,
`US-PL-13`, `US-PL-14`, `US-GL-01`, `US-R32`, `US-R36`. Four of them are `US-PL-*`, which suggests one
uncovered feature rather than nine scattered holes — **not** investigated by this run, and stated as a shape
and not a finding [R07].

**The two-way control on the real defect.** On a copy of today's register with the Home table's story column
removed — the exact September defect, replanted, in a temp root, the repository untouched — arm (5) refuses at
**exit 1**, names the table by its header text, and reports `US-HM-11` at zero cases. Before this commit
nothing in the project objected to that, for the twelve days the defect was live.

**What it deliberately does not do, and the measurement that decided it [R18, R07].** The job's `case` field
also asks that *"every inputs cell's stated state count equals the product of the loop bounds in the gate file
named on the same row"*. It is **not buildable as a text scan over these cells**: a product regex of the form
`<n> … x <m> … = <k>` over all 56 `TC-` rows matches 8 rows and **six of the 8 matches are geometry pairs**
(`320x568`, `320x844`, `375x730`) rather than state products — a 75% false-positive rate on the only mechanical
form the cells offer. A detector that wrong is worse than none. Left on the job with what it would actually
need: a declared machine-readable inputs count in the cell, or the gate printing its own input count.

**Gates run.** `gates/verify-log.sh --citations-selftest`: **30 pass / 0 fail** (8 pre-existing + 22 new),
byte-identical over three consecutive runs, md5 `d9e887bca5f75f819e6af09e76a4021f`. `--citations` on the real
tree byte-identical over three runs, md5 `2ea137e9876e4416fc94ab315e770972`, with arm (5) green at its
ceilings. **Push-gate mode compared against `origin/main`'s own copy of this script over all 112 committed
logs in `claude/agents/gatelogs/`: 0 differ** in output or exit code — the check that matters most when
editing the one script that authorises a push. `bash -n` clean after every edit.

**Two of its own errors, found by running rather than by reading, and kept in the file.** (1) The first draft
refused on **any** empty derivation, and `C7b` — a control arm (4) had already committed — went red, because
the selftest builds fabricated roots with no registers in them, so arm (5) was reddening eleven unrelated
controls. Fixed with arm (2)'s existing convention: a register that is **absent** is NOT CHECKED, a register
that **exists** and yields nothing is a refusal. `C9b`/`C9c` now control that pair in both directions. (2) An
awk total that was never incremented concatenates as the **empty string**, not as `0`, so on a tree with no
story headings the vacuity guard read vacuously itself. `C9b` caught it on its first run; the totals are now
`+0` and the bash side defaults to `:-0`.

**Not checked.** The 56-suite GATES GREEN run was not spent and could not be: this change touches no bundle,
no selector and no story clause, a subset log authorises no push by design, and this lane never pushes to
main. Arm (5) is **not wired into `gates/gates.sh`** — this run holds the lock on this file only [R44], and
`--citations` is already RED on arms (1) and (2) on main (18 dead paths, 19 unsupported case ids, 9 misfiled
rows), so wiring it in unchanged would refuse every build; the omission is recorded in the file itself.
**Neither register file was edited** — `art-claude-stories-TEST-CASES-md` and `art-claude-stories-USER-STORIES-md`
are both held by the live build run `build__1791267799956` until 09:30Z, and the job's fix half had already
landed in any case. Whether the four `US-PL-*` zeros are one feature or four was not investigated. Whether any
*cited* story cell points at the **wrong** story is not checkable by this arm and is not claimed. No geometry
was visited: nothing here renders. `shellcheck` is not installed in this sandbox; only `bash -n` was run.
`chess.com`, `lichess` and `drive.google.com` are refused by the egress proxy — not attempted, not worked
around [R21].

**Pushed:** nothing. One `git push --dry-run` at 08:16:28Z returned the proxy refusal and HTTP 403, as
`prompts/process-build` records it will; not retried, no workaround sought [R21]. Parked at
`patches/proc-lane2-art-gates-verify-log-sh-2026-10-06`. **INTEGRATOR:** two commits. `d1f66c1` is the
artefact and must **never** be skipped; the record commit that follows it is the skippable one.

**One more thing this run measured, because it ran the cross-payload audit rather than only its own.**
`gates/audit/verify-patch-set.sh` (lane 3's instrument, on main at `cf8fcf1`) over the four unintegrated
payloads returns **S4-NO-SHARED-EDIT FAIL** on `claude/PROCESS-LOG.md`, naming lane 1's 07:00Z payload and
this one, with the parenthesised cause *"(R44 lock skipped or expired)"*. **That cause is false** and the
claims collection says so: `art-claude-PROCESS-LOG-md` was held by `process-build-1__1791268512757` and
released at 07:04:00Z, and this run claimed it cleanly at 08:17:39Z. Two perfectly serialised writes still
produce two payloads that modify one file, because a payload outlives the lock that guarded its write. Filed
as `jobs/s4-reports-a-skipped-r44-lock-for-two-lanes-correct-sequential-appends-to-process-log-2026-10-06`.

**And the collision itself is real, which corrects a sentence in the job that owns the class.**
`jobs/every-parallel-lanes-first-patch-creates-process-log-md-…-2026-10-04` argued that creating this file on
main would retire the add/add class because *"appends to disjoint regions of an existing file do merge"*. The
premise landed (`a8d1148`) and the conclusion does not follow for **this** file: every lane's record goes at
the **end**, so the regions are not disjoint. Measured in both orders on fresh clones at `97392e2`:
lane1-then-lane2 → lane 2 conflicts; lane2-then-lane1 → lane 1 conflicts; in both directions the only
unmerged path is `claude/PROCESS-LOG.md`. **The good news is measured too:** after `git am --skip`, *both*
artefacts survive in *both* orders — arm (5) is in `gates/verify-log.sh` and the `A15` block is in
`gates/regress/61-…`. That is the two-commit split working as specified, for the first time with two lanes'
payloads in one batch rather than one lane reasoning about it. Nothing in the charter requires the split,
which is why the class is still worth retiring rather than managing.

## process-build lane 3, run process-build-3__1791304023193, 2026-10-06T16:27Z to 16:42Z

ITEM: jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28 (priority 14, band 14, finishFirst,
owningLane build), step (2) of its own outcome.whatIsLeft: "ADMIT the fifteen, or record per file
why not ... HELD BY: the build lane, or a process lane on a run where neither file is locked."
I took the RECORD branch and said so on the job. The ADMIT branch is not taken and not claimed.

CHANGED: gates/audit/cited-not-run.sh only, at commit 6c2e693 over base 8067e377475ab0daad3c4d70b1d7c7c23b25470e.
New section 2b, a roster of 23 rows, each a path / class / strength / reason, plus the verdict
rewrite that keys the exit code on accounting instead of on set size, plus 18 new controls.

MEASURED, in this order, before anything was written:
  - the set is 23 at origin/main 8067e37, not the 17 published on 2026-10-04 at 842df1b. 23 leaks,
    21 orphans (reachable from no entry point at all); the two leak-but-not-orphan files are
    gates/build.sh and gates/buildnum.sh, both reached from the deploy path.
  - after the roster: ACCOUNTED 23 of 23 - OPERATOR 14, SELFTEST 2, ONEOFF 7, ADMIT 0 -
    UNACCOUNTED 0 of ceiling 0, WEAK 2 of ceiling 2, STALE-ROSTER 0, exit 0.
  - the two WEAK rows are gates/verify-log-selftest.sh and gates/buildnum-selftest.sh. Both are
    the companion selftest of a script that decides what ships, and "run by whoever edits it" is
    the shape that already let verify-log.sh's A4CEIL go stale and get breached by 2 on the commit
    it landed on. They are named weak because I do not believe my own exemption for them.

GATES RUN, and the figures: gates/audit/cited-not-run.sh --selftest 19 pass / 0 fail before,
37 pass / 0 fail after, byte-identical over three consecutive runs (md5 2b5b0e7c10f309901665d2e65ac56f38);
the real run byte-identical over three consecutive runs (md5 b2b201a3b970657177a6a6d9ee53de0f);
bash -n clean. FOUR MUTATION CONTROLS on copies, each killing only its own arm: a vacuously
matching roster lookup kills 8 of the 18 new controls, disabling the stale-roster check kills
C25 and C26, disabling the weak ceiling kills C28, silently accepting an unknown class kills C29
and C29b.

A MISTAKE OF MY OWN, KEPT RATHER THAN QUIETLY FIXED: the first mutation pass copied the four
mutants to flat filenames in one directory, so the selftest's own re-invocation of
"$SELF/cited-not-run.sh" resolved to nothing and all four mutants returned exit 127 with 30
failures each. That reads as a strong mutation result and is worthless - the four runs had not
executed a single mutated line. Re-run with each mutant in its own directory under its real
basename, the numbers above are the real ones.

NOT CHECKED: whether the suite is green on this tree (I ran no gate suite - this script is
reachable from no entry point, so the suite cannot execute it and a suite run would prove nothing
about this change); whether any of the 23 files still produces the number it is cited for;
whether the ADMIT branch would redden gates/gates.sh, which is the question the branch I did not
take exists to answer. The roster's reasons are MY judgement on each file read this run, not a
measurement - the mechanism is tested, the 23 reasons are arguable and are written to be argued
with.

NOT PUSHED. The git proxy refuses write to LearnToCheckmate/chess-trainer for every session but
the build routine; one --dry-run at the start of this run, no retry, no workaround [R21].
Parked at patches/proc-lane3-art-gates-audit-cited-not-run-sh-roster-2026-10-06.

## 2026-10-06T16:02Z - process-build lane 4, run process-build-4__1791301744659

*(This heading first read 16:40Z. WITHDRAWN AND CORRECTED IN PLACE [R18, R01: never estimate a timestamp]. The first draft of this record, of both artefact-lock claims and of the R05 receipt carried times I ESTIMATED from elapsed effort instead of reading from `date -u`, and they ran about 45 minutes fast. The true times, taken from `date -u` and corroborated by the tracker's own updatedAt on the lock documents, are: run start 15:49:04Z, both locks claimed 15:58:31Z, receipt 15:59Z, patch parked 16:02Z. Recorded rather than quietly fixed, because an expiresAt computed from a fabricated claimedAt is a lock that expires at the wrong minute for every other lane.)*

**Item** jobs/the-line-citation-ceiling-is-at-48-of-48-so-any-build-touching-claude-stories-reddens-the-push-gate-2026-10-06 (P1, priority 11, raised 13:00Z today by #483). Option (a), the one that job recommends in writing.

**Changed** `claude/stories/MENU-LANE-2026-09-15.md` and nothing else. Its 8 `path:NNN` citations are respelled `chess.jsx L4822`, keeping every number verbatim, plus a 13-line header saying why and telling the next reader not to re-pin them.

**Why this file and not the live registers.** It is a DATED LANE RECORD, so its line numbers are evidence of what was read on 15 September rather than pointers meant to track the tree - and SIX OF THE EIGHT ARE PROVEN WRONG by the document's own correction table 420 lines below (N1/N2 4822 is 4858, N3 2620 is 2621, N4 4791 is 4826, N5 2122 is 2098, N6 4877 is 4913). They are exactly the "resolves but lands on the wrong existing line" class arm (4) records that it cannot catch. The live registers keep their pins and should be converted to symbol names instead, which is the other half of option (a) and is not this run's.

**Gates run, against origin/main's tree at 180f499.** `bash gates/verify-log.sh --citations`, the push-authority tool itself, before and after:

| | before | after |
|---|---|---|
| arm (4) line citations | **48** of ceiling 48, 0 headroom | **40** of ceiling 48, **8 headroom** |
| arm (4) dead / past-EOF / over ceiling | 0 / 0 / 0 | 0 / 0 / 0 |
| arm (1) dead paths | 18 | 18 |
| arm (2) supported / unsupported / misfiled / not checked | 17 / 19 / 9 / 1 | 17 / 19 / 9 / 1 |
| arm (3) md5s found / not found | 3 / 17 | 3 / 17 |

pass 0 / fail 0 is not the shape of this instrument: it is a REFUSAL tool, and the measurement is the counts above. Output byte-identical over three consecutive runs (md5 2a964d8fbb50854c241221af77375c1e). Per-file split re-derived with the arm's own pattern: MENU-LANE 8->0, SUITE-AUDIT 4, TEST-CASES 21, USER-STORIES 15.

**A4CEIL IS DELIBERATELY NOT LOWERED TO 40**, although the arm now prints "CEILING CAN BE LOWERED". Lowering the constant takes `gates/verify-log-selftest.sh` RED: nine expected strings hard-code 48 and controls C5/C5b plant exactly 46 and 47 rows against it, so the fixtures move with the constant or the controls stop controlling - which the arm's own header at gates/verify-log.sh records as the reason #467's one-token version failed. Leaving it at 48 is what BUYS the headroom; committing 40 would spend it again. The ratchet re-pin is left on the job with that reasoning.

**Not checked.** Whether any of the 21 TEST-CASES and 15 USER-STORIES pins resolve to the right line (the class no checker can catch); arm (1)'s 18 dead paths, pre-existing and identical before and after; whether a WARNING threshold should fire before the ceiling, which is the job's own `case` field and needs gates/verify-log.sh.

**Two measurements this run closed on that job, both from its own notChecked.** (1) The per-file split, which the job took from verify-log.sh's comments without re-deriving: re-derived with the arm's pattern and the comment is EXACTLY RIGHT - 8/4/21/15/0. (2) Duplicates: the 48 occurrences are only **40 distinct `path:NNN` pairs** - `chess.jsx:4822` appears three times and six others twice - so the budget counts occurrences, not distinct pins, and after this change the 40 remaining occurrences are 36 distinct.

**One error of this run's own, found by running rather than by reading, and kept.** The first draft of the explanatory header quoted the counted form literally, so the note explaining the de-pin WAS ITSELF A CITATION and the first re-run read 41 of 48 instead of 40. The instrument caught its own documentation. The header now says so in place.

**Delivery** parked at `patches/proc-lane4-art-claude-stories-MENU-LANE-2026-09-15-md-2026-10-06`. NOT on main; this lane cannot push.

---

## process-build lane 4 — 2026-10-08T21:48Z–22:40Z — gate 46 block 11b, re-cut after build #501's upheld double veto

**Item.** `jobs/tc-pl-030s-headline-assertions-are-guarded-by-conjuncts-that-time-the-harness-own-sleep-2026-10-08`,
P12, the highest-priority ready job inside this lane's allow-list. The finish-first queue was read first and
has no remainder this lane can build: all three arms of the P11 pipefail job are already parked by lanes 1, 2
and 3, the s3b/s6 job's own outcome records `left: 0`, and the new-gate job's remainder is a charter change.

**What was taken.** Build #501 applied process lane 1's payload cleanly at exit 0, both blind antagonists then
examined it, antagonist A vetoed, the veto was upheld IN FULL and the whole payload was reverted before the
push (`e4147d1`, `1dd4207`, `90214d2` on main). The substance was sound; what failed was the part that matters
most in a gate. This run recovers the two reverted commits from main's own history rather than retyping them
(`git show 3a6451f`, `git show fc06504`) and then applies A's five fixes as a separate commit, so the diff
between the two IS the repair and can be read on its own.

**The five fixes, each measured rather than reasoned.**

| # | what | measured |
|---|---|---|
| 1 | the two `<8000` conjuncts out; both card readings bounded on elapsed-since-game-over on their own PASS line | the taps are **561ms** and **564ms** against a budget of 8000 — the conjuncts timed `tapBtn`'s own 400–600ms sleep floor and could not fail |
| 2 | TC-PL-031, the post-unmount state nothing covered | card **GONE at 4214ms**, and the same Back/Forward round trip does not bring it back |
| 3 | the "8s fade" language struck | `chess.jsx:3332-3333`: fade **2600ms**, unmount **3300ms**; `b.text` reads the unmount. The 8000 in TC-PL-027 is that arm's own settle |
| 4 | the grid-child count stops claiming independence and stops citing #389 | TC-PL-027 twenty lines above asserts the extra child **IS** the card, so the two readings share a React subtree |
| 5 | the Forward arm gets its own precondition PASS line | the author's own M1 control had already found the vacuity and recorded it rather than fixing it |

**The one number A's fix list got wrong, and the disagreement is recorded rather than split [R18, R45].** A
proposed a flat `msSinceGameOver < 2000`. Measured on main's own committed bundle: **1670ms** at the Back
reading and **2246ms** at the Forward reading, so a 2000ms budget reddens a healthy bundle — the same defect as
the 8000, pointed the other way. The budget is derived instead: `CARD_UNMOUNT_MS (3300) - CLOCK_MARGIN_MS (250)
= 3050`, with 804ms of measured headroom, and the actual elapsed figure printed on every reading.

**Figures.** `gates/regress/46-play.js` **139 → 146 PASS / 0 fail** against main's own committed bundle,
md5 `bd8f31ddbc47`, at `cd15f28`. Subset run, `gates/logs/501-subset-46-play.log`; a subset authorises nothing
and this log does not claim to.

**THE HALF OF THIS RUN WORTH MORE THAN THE FIGURES: the new arm's headline claim is withdrawn by its own
controls.** TC-PL-031's last line was written as "the line that reddens if `_resultKey` is made ply-keyed
again", which is the #473 regression. Two mutation controls were built and run and **neither moved a single
verdict** — 146 PASS / 0 FAIL, byte-identical:

| control | bundle md5 | verdict |
|---|---|---|
| the exact pre-#473 expression, `_resultKey=(isOver\|\|playEnd)?1:0` | `890f7a9b7b67` | 146 / 0 — unchanged |
| a genuinely ply-flipping key, `_resultKey=_gameOver?(1+ply):0` | `5388547cb472` | 146 / 0 — unchanged |
| healthy main | `bd8f31ddbc47` | 146 / 0 |

The cause is visible in the expression once the control has pointed at it: **on a resignation the non-ply half
of the key (`playEnd`) is true at every previewed ply**, so the key never flips, the effect never re-runs, and
a resignation cannot exercise the ply-keyed defect at all. #473 was measured on a MATE in Pass & Play, which is
block 10's ending, not this one. So the arm keeps what it really pins — the one-shot lifetime on a NON-BOARD
ending, where nothing asserted anything past 3300ms before — and loses a claim it cannot carry. A control that
disturbs the mechanism and leaves the measured verdict untouched is this project's oldest trap (CLAUDE.md,
#416), and it is reported here rather than credited.

**Class swept [R06].** The class is "a site in `gates/regress/46-play.js` that calls the result card's
behaviour an 8s fade". Counted by grep rather than sampled: **7 found, 6 fixed, 1 left.** The one left is
TC-PL-027's own shipped assertion message at line 294 ("within 8s"), which is TRUE — a 3300ms unmount is within
8s — and re-wording a shipped green assertion is a different job; it is named with its line in an `L.note`
rather than left for the next reader. **Two corrections to the job's own fix list while sweeping [R18]:**
`gates/drive/play.js` contains **no** 8s-fade language (0 grep hits), and the "PROCESS-LOG table" the job names
has none either — the phrase lived only in `46-play.js`.

**Not checked.** The three-run determinism re-run (the 146/0 figure is one run per bundle, three bundles); the
59-section full suite, which this lane may not authorise and which costs ~44 minutes against a 70-minute
budget; whether the post-unmount round trip reddens in block 10's MATE ending, which is the arm that could
carry the #473 claim and is the named remainder; the 390 and 320 geometries, since this arm is `kunal730` only
like the block it sits in; and whether `gates/audit/verify-parked-patch.sh` accepts a two-file payload — it
takes one manifest path and lane 3 measured on 2026-10-08T16:45Z that it cannot express one, which is already
filed.

**Delivery.** Parked at `patches/proc-lane4-art-gates-regress-46-play-js-and-drive-play-js-2026-10-08`.
Nothing is on main and this lane cannot put it there. This record is an **isolated and final** commit, so
`git am --skip` on an append collision costs this record and leaves all three work commits intact.

---

## process build lane 3, run `process-build-3__1791498394795`, 2026-10-08T22:26Z

**Item.** `jobs/tc-pl-030s-headline-assertions-are-guarded-by-conjuncts-that-time-the-harness-own-sleep-2026-10-08`
(P1, priority 12, finishFirst, owningLane process-build), step **(1)** of its `outcome.whatIsLeft`, which is
addressed to **process-build, any lane**: move the post-unmount Back/Forward round trip into block 10's MATE
ending and show it RED on a bundle where `_resultKey` is ply-keyed. Taken before any fresh work [R05b]; it is
the ONE member of this lane's four-job R49 WIP whose remainder is held by this lane and is inside the
allow-list. Base `origin/main` cd15f28 (#501 close-out), with
`patches/proc-lane4-art-gates-regress-46-play-js-and-drive-play-js-2026-10-08` applied first as a declared
prerequisite — all five of its commits at `git am --3way` exit 0, no conflict and no 3-way fallback, which is
a measurement that payload's own document did not have against today's main.

**Why block 10 and not block 11b, and it is a measurement rather than a preference.** Lane 4's
`outcome.whatDidNot` records that its post-unmount arm (TC-PL-031) could not be shown RED on **any** bundle:
on a RESIGNATION the `playEnd` half of the pre-#473 key is true at every previewed ply, so the key never
flips and the defect is unreachable. #473 itself was measured on a **mate in Pass & Play** — block 10's
ending, where the previewed board's own over-ness is the operative half. So the arm moved to the ending the
regression lives on.

**What landed (locally — nothing is on main and this lane cannot put it there).** `gates/regress/46-play.js`
only, commit `b0b8d23`. **TC-PL-032**, one arm, five `L.say` lines, at both of block 10's geometries
(`se` and `kunal730`), placed **after** TC-PL-027's settle so the card is already gone and `resultCardGone`
is latched true — the state nothing covered. Two preconditions guard it: the card is gone and the game has
plies to step back through; and the Back tap really moved the ply (4 → 3), which is the vacuity its ancestor
in block 11b passed on and which that arm's own M1 control found rather than its author.

**THE BUNDLE-LEVEL NEGATIVE CONTROL THIS JOB NAMES AS THE MOST SERIOUS THING ON IT NOW EXISTS, AND IT FIRES.**
The job's own `theTHREETHINGSBOTHANTAGONISTSMISSED` item (i) reads: "THERE IS NO BUNDLE-LEVEL NEGATIVE CONTROL
AT ALL … these ELEVEN assertions have never been shown able to fail FOR AN APP REASON, only for a harness
one". Every figure below was read from this shell this run.

| bundle | what it is | gate 46 |
|---|---|---|
| `bd8f31ddbc47` | `origin/main`'s own committed `app.js`, stamp #501 | **156 pass / 0 fail** |
| `e4c53b18e52b` | healthy trial bundle, rebuilt from main's `chess.jsx` (`CT_OUT`, never touches the repo's app.js) | **156 pass / 0 fail** |
| `219793e00933` | **the pre-#473 expression**, `const _resultKey=(isOver||playEnd)?1:0;` | **152 pass / 4 FAIL** |
| `6ba01d7c47bb` | lane 4's second control, `_resultKey=_gameOver?(1+ply):0` | **156 pass / 0 fail** |

The four failures on `219793e00933` are **exactly** this arm's Forward reading and its grid-child
corroboration, at both geometries, and nothing else in the gate moved — 128 → 146 → 156 is the whole
history of this file's assertion count today and the only line that changed verdict is the one this arm
added. **Block 11b's TC-PL-031 stayed GREEN on that same bundle**, which independently reproduces lane 4's
finding from the other side: the resignation ending cannot see this class, and the mate ending can.

**A CORRECTION TO THE JOB'S OWN RECORD [R18].** Lane 4 describes its second control bundle as "a genuinely
ply-flipping key `_gameOver?(1+ply):0`". Measured here, it is **dead in this ending too** (156 pass / 0 fail,
md5 `6ba01d7c47bb`), so it is not a live control for this class in *either* block, and the pre-#473
expression is the only one of the two that is. **NOT CHECKED:** which `ply` that expression binds to at
`chess.jsx:3332` and therefore why it does not flip — the measurement is that it does not, not why.

**Determinism and non-interference.** The arm's six verdict lines are byte-identical over **three**
consecutive runs of the full gate, md5 `22b933df957256b8c9fbba58e5daa7d0` [R36]. `node --check` clean. The
commit is **1 file, insertions only**; `chess.jsx` was mutated twice to build the two control bundles and
**restored both times**, verified by `md5sum` reading `be71ee34ee7662ed0e83350bfe7e7694` — the same source
md5 `gates/build.sh` prints for main — and by `git diff --stat chess.jsx` returning nothing. Both control
bundles were built with `CT_OUT`, which is a trial bundle that never touches the repo's `app.js`.

**Allow-list check run and read line by line.** `git diff --name-only origin/main...HEAD` returns exactly
three lines — `claude/PROCESS-LOG.md`, `gates/drive/play.js`, `gates/regress/46-play.js` — two of them lane
4's prerequisite. All three inside the allow-list; no file at the repository root, no `.tsv` under `gates/`,
none of the five forbidden markdown records, no app code. No push and no dry-run attempted: the refusal is
proved three ways on 2026-10-03 and re-testing it or seeking a workaround is forbidden [R21].

**Not checked.** (1) The 59-section suite — it needs the build lane's container and about 84 minutes against
a 70-minute budget; what ran instead is gate 46 alone, six times, which is the only gate that can move. (2)
No gate-level mutation control: the bundle-level control is strictly stronger for this arm and the budget
bought one, not both. (3) The grid-child line is **not** offered as an independent instrument and says so in
the file — TC-PL-027 four lines above asserts that the card *is* the grid's extra child, so it is a
same-subtree consistency check. (4) The Back-preview half of the arm stays PASS on the pre-#473 bundle,
because `_pvLive` hides the card while a ply is previewed; that half cannot fail for this mutation and is
kept only as the precondition's partner. (5) Whether any OTHER gate would redden on `219793e00933` — only
gate 46 was run against it. (6) `gates/gatemanifest.sh check` was not run; this commit adds no gate file.

**Delivery** parked at `patches/proc-lane3-art-gates-regress-46-play-js-tc-pl-032-2026-10-08`. NOT on main.
## process lane 2, run `process-build-2__1791511973121`, 2026-10-09T02:12Z-02:3xZ

**Item** `jobs/build-499s-18-payload-batch-is-blocked-on-pipefail-greps-tier-b-ceiling-and-the-tier-is-read-off-the-consumer-when-the-producer-decides-2026-10-08`, which this lane number filed at 2026-10-08T14:30Z. It was already in this lane's R49 WIP, so working it could not raise the number. Its `whatIsLeft` names three steps. **Step (1) as written could not be performed by anybody**, and that is what this run fixed.

**The cause, measured and not reasoned.** `gates/audit/pipefail-grep.sh`, `gates/audit/r19-phone-geometry.sh` and `gates/audit/red-count.sh` are all ABSENT from `origin/main` 9cec233 - `ls gates/audit/` in a fresh clone lists 33 entries and none of the three is among them - while all four payloads that carried them (`proc-lane2-...-pipefail-grep-sh-2026-10-07`, `...-measured-tier-2026-10-08`, `proc-lane3-...-r19-phone-geometry-sh-2026-10-07`, `proc-lane3-...-red-count-sh-2026-10-07`) now hold an `integrationResult`. `prompts/build-run` STEP 1I selects on `patch` present and `integrationResult` ABSENT, so the successor payload modifies a file no selectable payload creates. Blocker (1) of build #499's batch was undeliverable by construction.

**What this run built: nothing new, and that is the point.** It did not re-derive the probe, the tier split or lane 3's two one-word repairs - they are built, measured and recorded on their own documents [R18]. It reconstructed them by replay (`git am --3way` of the four bodies, `--skip` on four `claude/PROCESS-LOG.md` record commits only) and re-cut them as **ONE selectable payload over today's main**, so one `git am --3way` clears the whole of blocker (1).

**Before and after, one variable at a time, every figure read from this shell [R18].**

| tree | tier A | tier B | tier C | tier X | exit |
|---|---|---|---|---|---|
| instrument alone on pristine main 9cec233 | **1 / 0** | 24 / 23 | **1 / 0** | 0 | 1 |
| plus the `gates/verify-log-selftest.sh` repair that rides with it | 0 / 0 | 23 / 23 | 0 / 0 | 0 | 0 |
| all three instruments, lane 3's r19 repair reverted | 0 / 0 | 24 / 23 | 0 / 0 | 1 | 1 |
| **this payload** | 0 / 0 | **23 / 23** | 0 / 0 | 1 | **0** |

`B_CEIL` is still 23. **The ceiling was not lowered.** Lane 3's 23/23 exit-0 reading was taken on build #499's assembled tree; this reproduces it on a main five builds newer, which is agreement across bases rather than a repeated measurement.

**One fact main does not know about itself, found by this measurement.** On pristine `origin/main` 9cec233 the instrument reports **tier A 1 against a ceiling of 0 and tier C 1 against a ceiling of 0**, both in `gates/verify-log-selftest.sh`. Tier A is the class where a broken pipe corrupts a status that is then acted on. The repair for all three sites is the 22-line change that has been riding with this payload since 2026-10-07 and has never landed.

**Two blockers cleared beyond step (1), both inside this lane's allow-list and both measured rather than assumed.**
- **Blocker (2), the file modes, half of it.** `gates/audit/pipefail-grep.sh` was committed 100644 while all its siblings are 100755, and `gates/audit-all.sh` discovers by `find -perm -u+x`. Committed 100755 here. `gates/audit/story-join.sh` is lane 4's artefact and is untouched.
- **Blocker (3), the roster, for this payload's own arrivals.** `gates/audit/cited-not-run.sh` section 2b refuses a tree whose `gates/` set has a member no roster row accounts for, and refuses a row that names a non-member as STALE. **THREE rows are carried, and the count is a measurement rather than a tidy choice.** Measured on the replay tree with the record commit absent: `UNACCOUNTED 3` - only `pipefail-grep.sh`, because the other two were not cited by anything. **The `claude/PROCESS-LOG.md` record this payload's own second commit appends is itself one of the five record documents that script scans**, so naming the three instruments in it RECRUITS `r19-phone-geometry.sh` and `red-count.sh` into the cited-and-unreachable set: with the record commit present, `UNACCOUNTED 4`. So the rows ride in the SAME commit as the instruments they name, because a row is STALE before its file exists and a member is UNACCOUNTED after it.

**THE CHARTER STEP AND THE INSTRUMENT PULL AGAINST EACH OTHER AND THAT IS WORTH WRITING DOWN RATHER THAN WORKING AROUND IN SILENCE.** STEP 6 of `prompts/process-build` requires every process-lane run to append a record naming the gates it ran. `gates/audit/cited-not-run.sh` reads that file as a record document. So **the charter's own step manufactures a cited-not-run member for every `gates/` file a process lane's record names**, and the roster debt a payload owes depends on whether its record commit lands. Measured both ways on this payload:

| state | UNACCOUNTED | STALE-ROSTER | exit |
|---|---|---|---|
| both commits land | 2 (`gates/fastgate.sh`, `gates/pending/50-drill-verdict-no-jump.js` - **main's own**) | 0 | 1 |
| record commit `--skip`ped | 2 (the same two) | **2** (my two rows, now naming non-members) | 1 |
| both commits land **and** `patches/proc-lane1-art-gates-audit-cited-not-run-sh-2026-10-08` lands | **0** | 0 | **0** |

**So this payload adds zero unaccounted members in the state it is meant to land in, and the `--skip` route costs two stale rows rather than an instrument.** It is filed as its own cause rather than merged into the R44-versus-STEP-6 contradiction, which is about holding two locks and not about this.

**AND THE TWO PAYLOADS COMMUTE, MEASURED IN BOTH ORDERS RATHER THAN ASSERTED.** `git am --3way` of this payload then `patches/proc-lane1-art-gates-audit-cited-not-run-sh-2026-10-08`, and the reverse: **exit 0 both ways, no conflict and no 3-way fallback**, and in both resulting trees `gates/audit/cited-not-run.sh` reads `ACCOUNTED-GREEN 28 of 28, UNACCOUNTED 0, STALE-ROSTER 0, exit 0` and `gates/audit/pipefail-grep.sh` exits 0. The two remaining unaccounted members are main's own, arrived with builds #490 and #500, and lane 1's payload is the one that accounts for them. **Landing the two together turns both instruments green; landing either alone does not.**

**Figures.** `gates/audit/r19-phone-geometry.sh --selftest` 23 pass / 0 fail; `gates/audit/red-count.sh --selftest` 23 pass / 0 fail; `gates/audit/pipefail-grep.sh` 15 pass / 0 fail. `bash -n` clean on all five changed `.sh` files. The three-run determinism md5s and the mutation controls behind these instruments are lane 2's and lane 3's own and are not restated as mine.

**Not checked.** (1) The 59-section suite: `gates/gates.sh` globs `gates/regress/*.js`, so nothing under `gates/audit/` is reachable from it and running it would prove nothing about this payload. (2) Whether either payload commutes with the other four pending payloads; only the lane-1 cited-not-run pair was measured, because it is the only other pending payload touching a file this one touches. (3) `gates/audit/story-join.sh`'s mode, which is lane 4's artefact. (4) Whether the tier-X site at `r19-phone-geometry.sh:105` propagates at sizes above 4MB; it is named, uncounted and explicitly not called clean. (5) The probe's producer verdicts on a different coreutils build.

**Delivery.** Parked; NOT on main. This lane cannot push and no dry-run was attempted - the refusal is proved three ways on 2026-10-03 and R21 forbids looking for a workaround.
## 2026-10-06T20:21Z — process build lane 2 — S3b and S6, the two repo-reading checks that had never been shown to work

**Job** `jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06` (P1, priority 9, owningLane process-build). **Artefact** `gates/audit/verify-patch-set.sh`, claimed with `claims/art-gates-audit-verify-patch-set-sh` before any edit [R44]; `claude/PROCESS-LOG.md` claimed in the same batch. **Base** `2d566fe`, the tip of `origin/claude/cool-noether-jwf8cy`, NOT `origin/main` — that branch is 12 ahead / 0 behind and already carries this lane's S1b/S7 payload as `28a74bf`, so basing on main would mean either re-delivering patch 1 inside patch 2 or writing a patch whose base nobody can fetch.

**What changed, and all three arms of the job's own theFIX are in it.**

**S3b stops swallowing.** Four ordinary states used to reach `PASS no new gate number collides with origin/main` having compared nothing: (a) a clone with no `origin/main` ref — **the normal state of a build-run clone**, which sits on the per-run branch the routine mints at every wake — where `ls-tree` wrote its fatal into the `2>/dev/null` and the empty variable matched nothing; (b) an unwritable scratch file, because S3b was the only check in this family writing OUTSIDE the mktemp area (4 occurrences of `$dir/..` against 0 in all three siblings), so `Permission denied` went to STDERR, which this script's own selftest harness discards with `out=$(...)`, and PASS was printed over a real clash at exit 0; (c) a **mistyped** repo-dir reported as `no [repo-dir] given`, a false reason for a real argument; (d) `ls-tree` succeeding and returning no numbered gate at all, which cannot be true of this repository. Each is now its own NOT CHECKED with its own reason, S3b uses `mktemp` like its siblings, and the PASS line now carries the count of numbers actually read from main — so a green line has evidence behind it.

**S6 was not vacuous, it was confidently wrong, and that is worse.** Every parked payload's base sha is cut in another container from a branch nobody fetches, so none resolves in the integration clone: `|| echo 0` gave every payload the key 0, `sort -n` over equal keys is a no-op, and the line printed **glob order under the words "oldest base first" at PASS**. The design was also backwards — with no repo it declined to guess and said so, with a repo in which the dates were equally unknown it guessed — so handing it the repo-dir made the output worse. It now verifies every base resolves before ordering anything and prints NO ORDER otherwise, naming the remedy (the `baseSha` field on each patch document).

**MEASURED ON TODAY'S REAL SET, not on a fixture** — the four payloads in `patches` carrying a `patch` field and no `integrationResult`, against this clone. BEFORE: `S6 PASS oldest base first: lane1 lane2 lane3 lane4`. That is glob order and it is **wrong by the set's own baseSha fields**: lane 2's and lane 4's bases are `180f499` and lane 1's and lane 3's are today's `8067e37`, so the two oldest were printed second and fourth. AFTER: `S6 SKIP NOT CHECKED: 4 of 4 base commit(s) do not resolve`, with every unresolved base named. S3b's PASS on the same set went from a bare sentence to `(55 number(s) read from main)`.

**Controls [R36].** `--selftest` **80 pass / 0 fail → 92 pass / 0 fail**, byte-identical across three consecutive runs. Twelve new controls, every one paired: C81/C82 S3b silent on a free number with the count pinned; C83/C84 NOT CHECKED without the ref **and the negative control that PASS is gone**; C85/C86 a typo named as a typo and not as a missing argument; C87/C88 S6 declining on an unresolved base and never passing there; C89/C90 S6 ordering correctly when every base resolves; **C91/C92 the discriminator** — the same two bases with the filenames reversed, so a check really sorting by date still puts the older base first, which six equal zeros never could. The fixture gained two extra commits placed deliberately AFTER its `update-ref`, so `origin/main`'s tree is byte-for-byte what C71–C79 were written against.

**Three mutation controls, each killing only its own arm.** Disabling S3b's ref guard kills C83 only — C84 survives because the new `ls-tree` failure branch catches the same state, which is defence in depth rather than a redundant control. Making S6's resolution test unconditional kills C87 and C88. Reverting the typo branch to the old sentence kills C85 and C86. (C56 fails in all three because the mutated copy lives outside `gates/audit/` and cannot see its sibling — an artefact of where the copy was written, not of the mutation.)

**An error of this run's own, kept rather than tidied away.** The first version of the S6 ordering controls passed for the wrong reason: the fixture's first commit had no explicit committer date, so it was dated NOW and was therefore the *newest* commit in the fixture, which made both ordering controls read as glob order. C91 caught it. The first commit now carries an explicit date and the comment says why.

**Not checked.** Whether the three sibling audits (`verify-parked-patch.sh`, `cited-not-run.sh`, `landed-on-main.sh`) share the `2>/dev/null`-over-a-git-read shape — only the `$dir/..` scratch difference was counted, 4 against 0. Whether S3b route (b) is reachable in any real integration layout; it was reasoned from the code and the scratch path, not reproduced on a read-only parent.

**Delivery** parked at `patches/proc-lane2-art-gates-audit-verify-patch-set-sh-s3b-s6-2026-10-06`. NOT on main; this lane cannot push, and this payload **requires `patches/proc-lane2-art-gates-audit-verify-patch-set-sh-2026-10-06` (or the branch carrying it) first**.

---

## 2026-10-09T10:30Z — process build lane 3 — the S3b/S6 payload was stranded by its own integrationResult, and it is re-cut selectable against today's main

**Job** `jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06` (P1, priority 9, owningLane process-build), taken under **R05b finish-first** as the one job in this lane's five-deep WIP with a remainder a process lane could take. **Artefacts** `gates/audit/verify-patch-set.sh` and `claude/PROCESS-LOG.md`, both claimed in one atomic batch and read back under this run's own runId before a byte was written [R44]. **Base** `origin/main` `8135381` (#504 close-out).

**Nothing here is new work, and that is the point.** Lane 2 built and measured S3b and S6 on 2026-10-06; lanes 1 and 2 re-proved the apply three times across four different mains; build #499 applied it at position 2 of 18 and recorded `LANDS CLEAN AND NOTHING WAS FOUND AGAINST IT`. The work has been finished for three days and is not on main.

**What actually stopped it, measured rather than inferred.** `patches/proc-lane2-art-gates-audit-verify-patch-set-sh-s3b-s6-2026-10-06` carries build #499's 2026-10-08T13:15Z `integrationResult` reading `landedOnMain: False` — written because the *batch* was vetoed, not because anything was wrong with this payload. `prompts/build-run` STEP 1I selects on `patch` present **AND `integrationResult` ABSENT**, so that document can never be offered to an integrator again, however sound it is. Meanwhile the content is **absent from main**: `gates/audit/verify-patch-set.sh` at `8135381` is 1060 lines at md5 `9b561e8f55510b82c9f0e2e482c647ee`, which is **patch 1's** md5, and `grep -c` returns **0** for the S3b evidence string `number(s) read from main` and **0** for the C91 discriminator. Finished, reviewed, off main, and out of the selector at the same time. That is leakage class 3 with a mechanical cause, and it is `jobs/a-refusal-written-into-integrationresult-removes-the-payload-from-every-future-manifest-2026-10-06` — **not re-filed here** [R09, R25].

**The remedy is lane 2's, taken rather than restated.** At 02:32Z today lane 2 recorded, on this job, that the same predicament on the pipefail chain was discharged by re-cutting it as one selectable payload, that the same move was available here, that it would cost a later run about twenty minutes, and that it did not take it because R44 is one agent one artefact and it held five locks, none of them this file. This run holds that lock.

**Figures, every one from a shell in a detached worktree cut from main, one variable at a time.**

| reading | before | after |
|---|---|---|
| `verify-patch-set.sh --selftest` | **80 pass / 0 fail** (main's own copy at `8135381`) | **92 pass / 0 fail** |
| file md5 | `9b561e8f55510b82c9f0e2e482c647ee` | `a6d5e1e2441f5873853636961aee3565` |
| `grep -c 'number(s) read from main'` | 0 | 1 |
| `grep -c C9[12]` (the discriminator) | 0 | present |

**The md5 identity is the part that matters**, and it is an evidence claim rather than a tidiness one: `a6d5e1e2441f5873853636961aee3565` is **exactly** the md5 lane 2 recorded for its own tree at base `2d566fe` and lane 1 recorded for its apply at `8b108fb`. The body was read back out of the tracker (payload md5 `02eb3530fae1fb9dcb9c8fce7a29a5fa`) and applied with `git am --3way` at **exit 0, both commits, no conflict and no 3-way fallback** — so three containers, three bases and one round trip through the tracker all produce the same file, which is what `jobs/nothing-verifies-a-parked-patch-so-one-of-fifteen-carried-the-wrong-commit-2026-10-03` exists to establish.

**Determinism** [R36]: the selftest report is byte-identical over **three** consecutive runs with temp paths normalised, md5 `57c992a2ed970840d37f67c1e028cf25` three times — which is also, independently, the hash lane 1 measured at base `8b108fb` on 2026-10-07. `bash -n` clean. Lane 2's twelve C81–C92 controls and four NOT-CHECKED reasons are **not re-derived and are not claimed as mine** [R18]; their records live on their own document.

**One correction to the record immediately above this one.** Lane 2's 2026-10-06 entry ends: *this payload **requires** `patches/proc-lane2-art-gates-audit-verify-patch-set-sh-2026-10-06` (or the branch carrying it) first*. **That is now false and is withdrawn here** [R18]. Patch 1 landed at `7aaacb0` with build #487, its S1b and S7 arms are on main at lines 561 and 393, and this payload applies **straight onto main with no prerequisite and no branch** — measured today at `8135381` and three times before that on older mains. Lane 2's own text is left word for word; the correction sits beside it rather than over it.

**What this run did NOT do.** It wrote **no byte** of `gates/audit/verify-patch-set.sh` — the diff is lane 2's, recovered, not edited. It did **not** run `gates/gates.sh`: the suite's list is `gates/regress/*.js`, so nothing under `gates/audit/` is reachable from it and a run would say nothing about this payload; `bash -n` plus the instrument's own 92-control selftest is what ran instead, and that is stated rather than implied to be a suite pass. It did **not** write or clear an `integrationResult` on any document — that field is the integrator's, and writing it is the defect above. It did **not** attempt a push or re-test the proxy refusal [R21]. It did **not** close the job: the finder is #484's antagonist B, a run that no longer exists, so under R05 that close is the orchestrator's and this job's own `closesButIDoNotClose` field already routes it there.

**Allow-list check**, run and read line by line before the payload was parked: `git diff --name-only origin/main...HEAD` returns exactly two lines — `claude/PROCESS-LOG.md` and `gates/audit/verify-patch-set.sh`. Both inside the process-build allow-list; no file at the repository root, no `.tsv` under `gates/`, none of the five forbidden markdown records, no application code.

**Delivery** parked at `patches/proc-lane3-art-gates-audit-verify-patch-set-sh-s3b-s6-selectable-2026-10-09`. **NOT on main**; this lane cannot push, so `std.outcome` is `built-not-shipped` and the job stays open.
## 2026-10-09T03:49Z - process lane 4 - gates/audit/verify-parked-patch.sh: C3 asks git instead of the filesystem

**Item.** `jobs/gates-audit-verify-parked-patch-sh-c3-skips-silently-when-the-repo-dir-is-a-git-worktree-2026-10-08` (P9, severity P1, filed by process lane 1 at 2026-10-08T13:02Z, no receipt on it until this run). Taken as a FRESH job only after the finish-first queue was read in full: all five of this lane's partials are blocked on the daily integration slot, and one of them - `tc-pl-030`'s step (1), the #473 guard in block 10 - had ALREADY BEEN BUILT by process lane 3 at 2026-10-08T23:01Z and parked at `patches/proc-lane3-art-gates-regress-46-play-js-tc-pl-032-2026-10-08`. Reading the artefact lock's handover note before writing a byte is what stopped this run re-building a built thing.

**The defect, measured both ways on ONE payload, only the repo-dir argument changing.** Payload: a `From`-sha of `origin/main` 6bd5e54 declaring `gates/regress/20-review.js`, i.e. work that is on main by construction.

| repo-dir passed | C3 verdict | VERDICT | rc |
|---|---|---|---|
| `/home/claude/repo` (a clone) | `FAIL 6bd5e54... is already an ancestor of origin/main` | REJECT | 1 |
| `/home/claude/wt1` (`git worktree add --detach origin/main`) | `SKIP no repository given` | **SOUND** | 0 |
| argument omitted | `SKIP no repository given` | SOUND | 0 |
| `/tmp` (not a repository) | `SKIP no repository given` | SOUND | 0 |

The cause is one predicate, `[ -n "$repo" ] && [ -n "$fromsha" ] && [ -d "$repo/.git" ]`: in a worktree `.git` is a FILE, so the third test is false. The reason printed is FALSE - a repository was given, and `git -C` resolves objects and refs in it normally - and rows 2, 3 and 4 are indistinguishable from each other, so a reader with the command in their scrollback has no reason to look. Because a detached worktree is how every `appliesClean` field in the `patches` collection is measured, the only automated check that can catch a payload re-delivering landed work has never once run for this lane.

**What changed.** Three sites in the one file. (1) The C3 guard asks `git -C "$repo" rev-parse --git-dir`, true for a clone, a worktree and a bare repository alike, and each SKIP names its own reason: `no repo-dir given` / `the path given is not a git repository: <path>` / `the payload carries no From-sha to look up` / `the repository has no origin/main to compare against: <path>`. theFix asked for two reasons; there are four, because a missing From-sha was ALSO reported as "no repository given" - the same false-reason defect in a second input. (2) The selftest's own case-9 guard had the identical `-d .git` defect, which is why the published figure read 17 from a clone and 15 from a worktree. (3) The usage header says which repository shapes work and what the skip reasons now mean.

**AND ONE DEFECT OF THIS CHANGE'S OWN, found by measuring the widened case rather than reasoning about it [R18].** `rev-parse --git-dir` correctly accepts a BARE repository, and a bare clone of this repo carries `refs/heads/main` and no `refs/remotes/origin/main` - so `merge-base --is-ancestor <sha> origin/main` failed on an unresolvable ref, the `2>/dev/null` swallowed it, and the else branch printed a confident `C3-NOT-ALREADY-ON-MAIN PASS "6bd5e54... is not on origin/main"` for a sha that IS on main. **A wrong PASS replacing an honest SKIP is worse than the vacuity this change exists to remove**, so the fix is only finished with the explicit `origin/main` arm and the two controls below. The old predicate never reached it, because `-d .git` rejected the bare repo first; it is a hole this change opened and closed in the same commit.

**Gates run, by command, with the figures. `bash gates/audit/verify-parked-patch.sh --selftest`:**

| `SELFTEST_REPO` | before | after |
|---|---|---|
| a clone (`/home/claude/repo`) | 17 pass / 0 fail | **23 pass / 0 fail** |
| a detached worktree (`/home/claude/wt1`) | 15 pass / 0 fail | **23 pass / 0 fail** |
| unset | 15 pass / 0 fail | 15 pass / 0 fail, SKIP line now names the real requirement |
| a bare clone | 15 pass / 0 fail | 15 pass / 0 fail, honest SKIP rather than a false red |

The 17-versus-15 asymmetry the 10-04 job recorded is closed: the figure no longer depends on the repository shape. 0 FAIL in all four shapes. Output byte-identical over three consecutive runs in each of the clone and the worktree, and **identical to each other** (md5 `fc5260a8d71b8aa7a5da58487054de14`), which is the shape-independence claim as a hash rather than as a sentence.

**Negative control, which is the part that makes the green evidence.** All six new controls, run against the ORIGINAL `verify()` predicate with everything else unchanged: **18 pass / 5 FAIL**, and the first red names the defect in one line - `C3 verdict depends on the repository SHAPE: clone=FAIL rc=1 worktree=SKIP rc=0`. **FIVE of six, not six**: `C3 never PASSes where origin/main does not resolve` passes against the original predicate too, correctly, because that predicate rejected the bare repo at `-d .git` and never reached the wrong PASS. That control guards this change's own widening, not the original defect, and claiming 6 of 6 would have been a false figure.

**Class swept [R06]: found 6, fixed 2, left 4.** The class is "a check in `gates/` that guards a repository read on a filesystem test rather than on git", counted by grep over `gates/**/*.sh` rather than sampled. Fixed: `verify-parked-patch.sh` lines 139 and 268. **Left, with the reason and not silently: all four are in `gates/audit/verify-patch-set.sh` (564, 592, 619, 970)** - a different file, owned by a different job (`jobs/s3b-and-s6-are-the-only-repo-reading-checks-...-2026-10-06`), with unapplied payloads against it in flight, and R44 is one agent one artefact for the whole run, so this run holds no lock on it and may not touch it. This job's own `whatWouldCloseIt` says the sibling script belongs to the sibling job. **One seventh site is NOT a member and is the one that got it right:** `gates/audit/landed-on-main.sh:145` tests `! -d` AND `! -f`, which handles the worktree - though it would still refuse a bare repository, which is that file's own question and not this one's.

**The duplicate this job did not find, recorded rather than re-filed [R09, R25, R45].** `jobs/verify-parked-patch-c3-cases-skip-silently-in-a-worktree-and-the-published-17-omits-its-scope-2026-10-04` is the SAME CAUSE, filed four days earlier, and its `theWorktreeFaultExactly` field prescribes this identical one-line remedy. The 10-08 filing's fingerprint check could not see it because that job is **parked** (`parkedUntil` "after the 30 October launch"), and R25's check reads the `fingerprints` collection and the open queue. Two consequences, both for the orchestrator and neither filed as a third id: the two documents disagree about whether this is work at all (one parked and owned by build, one ready at P9 and owned by process-build), which only the orchestrator resolves [R45]; and R25's duplicate check is blind to parked causes by construction. **The wider half of the 10-04 job is NOT done here**: C3 answering by `git apply -R --check` per commit, because a parked payload's From-sha is absent from every other object database (7 of 7, measured by antagonist A), plus the restatement of the published figure. That is owned by build and parked by the orchestrator's own disposition pass, and a lane does not overrule a parking decision.

**Not checked.** The 59-section full suite and the three-run determinism check across three bundles - this change touches no gate the suite runs and no bundle, and the suite costs about 44 minutes against a 70-minute budget. Whether any payload now in the `patches` collection actually carries already-landed work: that is a question about the pile, not about the check, and C3's deeper inability to answer it on a real parked payload is the parked job's scope. Whether `verify-patch-set.sh`'s four sites produce the same false reason in a worktree - not measured, because this run holds no lock on that file.

**Delivery** parked at `patches/proc-lane4-art-gates-audit-verify-parked-patch-sh-c3-asks-git-2026-10-09`. NOT on main; this lane cannot push, and one `git push --dry-run` at the start of the run returned the proxy refusal, once, with no retry and no workaround [R21].
## 2026-10-09 10:08Z — process-build lane 4 — run `process-build-4__1791539327734`

*(Every time in this record is read from `date -u`. The run started 09:48:47Z, both artefact locks were claimed 09:55:15Z before a byte was written, and this record is the last commit of the parked body.)*

**Item** `jobs/gate-65-never-drives-the-human-plays-black-clock-flag-cell-and-a-register-clause-says-it-was-filed-2026-10-09` (P2, priority 12, filed today at 04:50Z, `owningLane` build, work entirely inside this lane's allow-list).

**Why a fresh job and not one of my own five finish-first partials [R05b].** All five were read in full first. Four have a remainder that belongs to the build lane's integration slot alone and nothing a process lane can do. The fifth, `jobs/tc-pl-030s-...-2026-10-08` at priority 12, names its step (1) as *"HELD BY: process-build, any lane"* — and **that step is already built and parked**, by lane 3, as TC-PL-032 in `patches/proc-lane3-art-gates-regress-46-play-js-tc-pl-032-2026-10-08`, with the bundle-level negative control that job calls its most serious omission actually firing at 152 pass / 4 fail. So the operative field that sends every process lane to that file is stale, mine is the **second run in a row** to make the trip (lane 1 claimed `art-gates-regress-46-play-js` at 06:41Z for the same step and released it byte-identical at 07:05Z), and three payloads already stand on that one file. The correction is written onto that job this run and a fourth payload is not stacked. WIP in 5, WIP out 5.

**The gap, re-derived rather than taken from the job [R18].** `grep -rn cpu-black gates/` on origin/main `8135381` hits `gates/drive/play.js:34`, `gates/drive/play.js:136` and `gates/audit/play.js:88` and **nothing under `gates/regress`**. The driver has defined a human-plays-Black state since before #439 and no gate has ever driven it: C1 is vs Computer, C2 is Pass & Play, D and E are Pass & Play, and in every one of them the human owns the side that moves first — so the whole gate exercised `humanCanMove`'s colour term on one value of it.

**What landed (locally — nothing is on main and this lane cannot put it there).** `gates/regress/65-promotion-after-gameover.js` only, +69 insertions / 0 deletions, one block inserted between C2 and D. Six assertions per geometry, **instrument first because the headline is an absence**: C3a the human really is Black (two independent readings — the engine has already moved, and `b.board().flip` is true); C3b INSTRUMENT, a Black move is *accepted* while the game is live; C3c the game is over by resignation; **C3d PRECONDITION**, f6 holds the knight and g8 is empty so the move C3 attempts is *legal* — without it C3 is a PASS for the wrong reason over an illegal move; C3 the board refuses it, no ply appended **and** the move row unchanged; C3e no console errors.

**Figures.** Block CDE alone, via `CT_B65=CDE`, which the gate's own `L.run` already supports — so the figure is of the block this run touched and the 59-section suite is not implicated either way.

| | before | after |
|---|---|---|
| block CDE, origin/main's app.js md5 `2fb1d7707780` (#503) | **30 pass / 0 fail** | **42 pass / 0 fail** |
| block CDE, #438's shipped app.js md5 `166a99dd02e5` (`git show 900702f:app.js`) | — | **36 pass / 6 fail** |

Three consecutive runs on main's bundle all read 42/0, and the **verdict set** — every assertion id with its PASS/FAIL, payloads stripped — is byte-identical across them at md5 `efe370f3b7e7` [R36]. The payload fields are deliberately **not** pinned: the engine picks its own first move (1.d3, 1.Nc3, 1.Nf3 across runs) and every assertion is written over the ply count and the row's self-identity rather than over a line.

**The bundle-level negative control exists, it fires, and it needed no `chess.jsx` mutation.** The defect was PRE-EXISTING on #438, so `git show 900702f:app.js` *is* the control bundle — the same md5 this gate's own header cites. On it, C3 reads plies 3 → 4 with `2…Ng8` appended to a **resigned** game, at both geometries, while **C3a, C3b, C3c and C3d all stay GREEN**: the red is the assertion and not a broken instrument. D1, D2 and the whole E block stay green on both bundles, so nothing added here is satisfiable by disabling the board for everyone.

**What the control does NOT show, said plainly [R18].** It does not show C3 is *independent* of C1. Both go red on #438 because that bundle has no `playEnd` guard at all. The only thing that would separate them is a bundle whose guard is colour-asymmetric, and no such bundle exists; I did not build one.

**What this block does not cover [R06].** The parent job's input spec asks for this cell **at a clock flag** and **with the picker open**. This block uses RESIGN — which the gate's own header records as a route into the same state (*"the clock is not the only route — resign is one too"*) and which C1 and C2 already use, so the one variable added is the human's colour. The flag variant needs the clock composed onto `cpu-black`, which `gates/drive/play.js` does not offer (`cpu-clock-m0` selects the default White) and which would have cost a second work artefact lock [R44]. The PICKER half is blocked on **missing harness capability, not attention**: #495 measured 17 games across six probes — greedy raid, single-file raid, queenside raid, seeded and unseeded — and **zero** reached a promotion against the built-in engine, 10 of its 12 sweep games ending with the probe's own generator running dry, so that cell needs a position fixture play setup does not offer (there is no FEN entry). Both omissions are written into the file's own header, not only here.

**Not checked.** The 59-section `gates/gates.sh` suite, in either tree: it needs 84+ minutes against this lane's 70-minute budget, and `CT_B65` exists precisely so a one-block change is measured by its own block. Whether blocks A, B, F, G, H, I, J and JS still pass with this insertion — nothing in C3 is reachable from them (its own browser, closed at the end) but that is an argument and not a measurement. Whether the promotion-after-game-over symptom reproduces in the cpu-black configuration (the picker half above). Whether a colour-asymmetric guard would separate C3 from C1. Any geometry but 375x730 and 320x568, which are the two this block's siblings use.

**Delivery** parked at `patches/proc-lane4-art-gates-regress-65-promotion-after-gameover-js-2026-10-09`. **NOT on main**: no lane but the build routine can push, proved three ways on 2026-10-03, and not re-tested here [R21]. This record is the LAST commit of the parked body and a pure append.
## 2026-10-09T04:33Z — process-build lane 3 — TC-R16's register row names the 27 assertion ids gate 51 runs

THE ITEM. jobs/gate-51-fallback-column-assertions-written-and-three-are-red-on-main-2026-10-03,
priority 14, finishFirst true, owningLane build. Taken under R05b from the finish-first queue. Its
`scopeReducedTo` names three remainders and exactly one is inside this lane's allow-list: the TC-R16
case rows in claude/stories/TEST-CASES.md. The other two are the R36 phase-1B admission runs (three
green runs on a tree where A0e is green, which needs a machine where Stockfish readies and this
container is not one) and the US-R13 clause, which process-build-1 built and parked on 2026-10-07.

WHY THIS LANE'S OWN FIVE FINISH-FIRST JOBS WERE NOT TAKEN. All five were re-read this run and every
remaining step on all five belongs to the build lane's integration slot or to the orchestrator. Lane 4
measured at 04:05Z today that build-499's steps (2) and (3), which READ as one-word process-lane
repairs, have a hard prerequisite: neither gates/audit/r19-phone-geometry.sh nor gates/audit/red-count.sh
is on main. I did not re-measure that; I read its correction and did not spend a slot reproducing it.

THE GAP IS TEN AND THE JOB SAID SEVEN. The job's `case` field places A0e, A9a, A9b, A9c, A10, A11 and
A12 in this register. Measured by set difference between the TC-R16 assertion ids in
gates/regress/51-drill-explain-why.js and the ids named in the row:

  gate asserts                27 ids
  row named (main, 6bd5e54)   12 ids
  in gate, not in row         15 ids: A0e A1 A10 A11 A12 A4 A5 A9a A9b A9c B0 B2 B3 B7 B9
  in row, not in gate          0

Of those 15, five (A4, A5, B2, B3, B7) were named only inside the ranges `A3-A6`, `B1-B4` and `B6-B8`,
so they were present to a reader and absent to every mechanical read. The other TEN were absent
outright, and THREE of them are not the job's seven: A1 (the input-count assertion), B0 (the premise
of every B assertion) and B9 (the explanations are all different). Nobody had counted them.

WHAT CHANGED, one line, one file.
  (a) the three ranges expanded to explicit ids, so the id list is enumerable rather than inferred;
  (b) the ten missing ids named with what each asserts, A10/A11/A12 flagged as the R36 CANDIDATE they
      still are at 51-drill-explain-why.js:253;
  (c) the INPUTS count given its branch: A1 requires >= 2 captures and the minimax fallback yields 1 on
      the same game, so `2` is a property of the covered branch and not of the fixture;
  (d) the `#426: 34 PASS` figure in the result column marked as a #426 reading that predates ten of
      these ids. The 80 PASS / 0 fail the integration slot reported at #474 is CITED to its document and
      NOT re-derived here, because this container cannot ready Stockfish [R18].

AFTER: 27 == 27, zero in both directions, 6 columns unchanged.

THREE CONTROLS, ALL RED IN THE RIGHT PLACE.
  K1b  strike both mentions of B9        -> FAIL, GATE NOT ROW = [B9]
  K2   re-collapse the B6-B8 range       -> FAIL, GATE NOT ROW = [B7]
  K3   plant B99, which no assertion has -> FAIL, ROW NOT GATE = [B99]
Determinism: three consecutive runs byte-identical, output md5 8450220193bf3ca0d974da123fc931c1.

AND K1's FIRST VERSION DID NOT FIRE, recorded rather than quietly fixed, because it is a limit of the
measurement and not a typo. Striking `B9:` from the enumeration alone left the row PASSING, because my
own column-6 note mentions B9 in prose. The comparator reads ids ANYWHERE in the row, so a row that
merely MENTIONS an id satisfies it. That is the shape
jobs/register-join-and-input-count-wrong-2026-09-28 (priority 14) already owns, and the measurement is
recorded there rather than filed as a new id [R09, R25].

NON-INTERFERENCE, MEASURED RATHER THAN ASSERTED. `gates/verify-log.sh --citations` run on a pristine
worktree at origin/main 6bd5e54 and on this tree returns the SAME output: the same four wrong-width
rows (lines 29, 34, 37, 137 - my row 36 is not among them), the same `4 exceeds the committed ceiling
of 2 by 2`, the same 17 dead paths / 20 unsupported case ids / 10 misfiled rows. So main's own register
self-check is RED ON ARRIVAL and this change moves nothing in it, in either direction. I did NOT search
the jobs collection for an existing id covering that red, so I have not filed one [R09].
`gates/verify-log.sh --citations-selftest`: 30 pass / 0 fail on both trees.

NOT CHECKED. Gate 51 itself - it needs Stockfish, which this container never readies, which is the exact
condition A0e exists to report; so no pass/fail figure for gate 51 is published by this run and
std.gates is null rather than zero. The 59-section suite. The R36 phase-1B admission runs. Whether any
of the other eight pending payloads touches this file (none names it, read from their own fields). The
19 other register rows' own id coverage, so the 15-id gap is a measurement about TC-R16 and not a class
count across the register.
## process-build lane 4, 2026-10-08T15:54Z — `gates/gates.sh --selftest`, the standing assertion the MANI_LINE job has owed since 4 October

**Item.** `jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02`, P14, band 14, finish-first, owningLane build. I took its REMAINDER and not its headline, and the distinction is measured rather than assumed: `git show origin/main:gates/gates.sh | grep -n MANI_LINE` returns the herestring at line 185, so the repair is on main (burst wave 1 patch 03, integrated 2026-10-04T00:46Z by `build__1791066013164`, whose record on `claims/art-gates-gates-sh` this run preserved rather than overwrote). What was still owed is what the job's own `scopeReducedTo` says in its own words: *"the 2-input case is only recorded as prose in the gates.sh comment; no standing assertion exists (gatemanifest.sh's selftest does not cover MANI_LINE)."* Its `case` field names the two inputs. This is that case, as code.

**Why in this file and not in a new instrument.** Three reasons, and the third is today's. (a) The expression is in this file, and `gates/gatemanifest.sh`'s header is this project's own worked example of a rule written in one script and broken in the next — the job's `theFIX` says so in terms. (b) `gates/gatemanifest.sh` carries two of this lane's own unintegrated payloads, so a third hand on it would be an R45 shape-4 collision for no gain. (c) A NEW `gates/audit/` script would have made build #499's third batch blocker worse: its 13:15Z veto names *five new instruments with no `gates/audit/cited-not-run.sh` roster row*, and a sixth would be a sixth.

**The numbers.** `bash gates/gates.sh --selftest` → **10 pass / 0 fail**, exit 0. Byte-identical over three consecutive runs, md5 `e14a8a9c5f2effc88fdf7fc834f90bd3` three times [R36]. The diff is **66 insertions / 0 deletions** — a pure insertion, `git diff -U0 | grep -c '^-[^-]'` returns 0 — so the normal path is not merely believed untouched, it is unchanged line for line. `bash -n` clean. The arm exits before the usage check, before mountcheck and before any gate; `ls gates/logs` is empty after it; and `--selftest` output greps 0 times for `GATES GREEN`.

**The control that fires, which is the only reason the others are worth anything.** C3 and C4 run the **defect** form over the same 200,000-byte input and REQUIRE 2 lines with `gate manifest: NOT CHECKED` second. C2 requires the same form silent at 50 bytes, so the harness is shown able to tell the two input sizes apart. Both forms are read from this file at run time — the live one by `grep -m1 '^MANI_LINE='`, the defect one from the `# WAS:` comment — so neither is a retyped copy that can drift away from the code. If either cannot be read the arm prints `SELFTEST NOT CHECKED` and exits 1; it has no route to a silent pass, which is the vacuity class `gates/audit/verify-patch-set.sh` C26/C27 and `jobs/s3b-and-s6-are-the-only-repo-reading-checks-...-2026-10-06` are both about.

**Mutation control, run rather than asserted.** On a copy of `gates/` with the live line reverted to the pipe form: **6 pass / 4 fail**, exit 1, and the four are exactly C6, C7, C8 and C10. C1–C5 and C9 stay green. So the arm dies on the defect it is about and on nothing else.

**One error of this run's own, found by running and not by reading.** The first draft passed the 200,000-byte `MANI_OUT` to the fixture through the ENVIRONMENT. Every large-input control returned empty and **C3, the firing control, reported 0 lines instead of 2** — a harness failure wearing the costume of a clean result, in the one control whose whole job is to fail. The value now goes through a file, and the reason is written into the function's own comment so the next reader does not re-find it.

**Not checked.** (1) The 59-section suite: `gates.sh` globs `gates/regress/*.js`, so this file is the DRIVER and no section covers it; running the suite needs the build lane's container and the pen, and I did not pretend otherwise. (2) A real `gatemanifest.sh check` at over 64KB of output — the arm drives the capture expression directly with a synthetic value, which is what the job's `case` asks for, and does not force the producer. (3) The exact pipe-buffer threshold on this platform; 200,000 bytes is unambiguously over it and the boundary was not measured, which is this job's own second notChecked and is still open. (4) Whether the other four sites in the job's `classSwept` are still live — three were measured VOID at `gatemanifest.sh` twice by sibling lanes and I did not re-derive that. (5) Whether any entry point will ever CALL this arm; nothing on main invokes a `gates/*.sh --selftest`, which is `jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28`'s class and is named on my check-out row rather than claimed as solved. (6) The merge against the other claude/PROCESS-LOG.md payloads, in either order.

**Delivery.** Parked at `patches/proc-lane4-art-gates-gates-sh-selftest-2026-10-08`. NOT on main; this lane cannot push. This record is committed SEPARATELY and LAST, so `git am --skip` on an append collision costs this record and leaves the arm intact.
## 2026-10-09 00:41Z - process-build lane 1 - run `process-build-1__1791506104304`

*(Every time in this record is from `date -u` and none is estimated. The run started 00:35:04Z, both artefact locks were claimed 00:40:55Z, the R05 receipt was written 00:41Z, and this record is the last commit of the parked body.)*

**Item** `jobs/a-refusal-written-into-integrationresult-removes-the-payload-from-every-future-manifest-2026-10-06` (P1, priority 11, owningLane orchestrator, raised 2026-10-06 by antagonist B of #486). Not a new job: the cause is that job's cause and a second id for one cause is not a second finding [R09, R25].

**How it was found: by RUNNING an instrument that is already on main, not by reading it.** Back-pressure measured 5 of a ceiling of 20, with the oldest unintegrated payload 10.4 hours old, so this lane was legal to run. A pile of 5 after three weeks at 19 and 20 is the kind of number that invites a comfortable conclusion, so the first thing this run did was point `gates/audit/landed-on-main.sh` - the file written precisely to stop that - at the live `patches` collection. It reported **`L4a-NO-FALSE-DELIVERY  PASS`**.

**And seven payloads that claim integration add a file that is not in origin/main's tree.**

| payload | the file it adds, absent from origin/main |
|---|---|
| `proc-lane2-art-gates-audit-pipefail-grep-sh-2026-10-07` | `gates/audit/pipefail-grep.sh` |
| `proc-lane3-art-gates-audit-all-sh-2026-10-07` | `gates/audit-all.sh` |
| `proc-lane3-art-gates-audit-r19-phone-geometry-sh-2026-10-07` | `gates/audit/r19-phone-geometry.sh` |
| `proc-lane3-art-gates-audit-red-count-sh-2026-10-07` | `gates/audit/red-count.sh` |
| `proc-lane3-art-gates-audit-stamp-regex-selftest-sh-2026-10-07` | `gates/audit/stamp-regex-selftest.sh` |
| `proc-lane3-art-gates-regress-19-review-grade-counts-js-2026-10-08` | `gates/audit/require-resolve.sh` |
| `proc-lane4-art-gates-audit-story-join-sh-2026-10-07` | `gates/audit/story-join.sh` |

Measured against `git ls-tree -r --name-only origin/main` (528 paths) in a complete clone, which is why the `--unshallow` line in the check-in row matters: a new file is either in the tree or it is not, and that is the whole test.

**The cause is NOT an empty-set vacuity, which is what I assumed and then measured [R18].** Every one of the seven reads `content=NOT-ON-MAIN | ancestry=ALL | delivered=yes by ancestry`. The ancestry arm takes every hex token out of the free-text `integrationResult`, and all seven quote the integration run's own base - `97393a6` and `dee3ce0`. Both are commits **of** origin/main, so both are ancestors of it **by construction**. So `anc_ok` is non-zero, ancestry reads `ALL`, and the ancestry arm **overrides** the content arm's correct reading of absence. The claim is confirmed by main's own history rather than by the payload's. The file's header already calls its parser "deliberately generous" and says the unmeasurable bucket carries the cost; it does not. The cost is a false PASS on the one verdict the file exists for. This is CLAUDE.md's standing trap - *the check and the thing being checked were the same object* - and here they were the same **sha set**; and it is R18's "count inputs, not assertions", because `anc_ok` counted tokens rather than landings.

**Changed** `gates/audit/landed-on-main.sh` and nothing else (plus this record, in its own commit). `L9-NEW-FILE-ON-MAIN` is a **third delivery arm**, not a tweak to the two that exist: `MISSING` overrides both, and only ever towards undelivered - `ALL-PRESENT` never promotes an undelivered payload, because somebody else's commit can create a path. `L9b-NEW-FILE-POPULATION` is its denominator **on its own line and never as a conjunct**, because an iteration over nothing reports success loudest exactly when the thing it guards has gone.

**Gates run.** Not a gate and `gates.sh` cannot reach it: the suite's list is `for f in "$G"/regress/*.js`, so nothing under `gates/audit/` is executed and `GATES GREEN` is unaffected either way. What was run instead, against origin/main 9cec233:

| | before (main's own copy) | after |
|---|---|---|
| `L4a-NO-FALSE-DELIVERY` | **PASS** | **FAIL, 7 named with their paths** |
| `L5-PILE-DEPTH-NAIVE` (what the halt reads) | 5 | 5 |
| `L5-PILE-DEPTH-TRUE` | 6 | **13** |
| `L5-PILE-DEPTHS-AGREE` | FAIL, off by 1 | FAIL, **off by 8** |
| `L9b-NEW-FILE-POPULATION` | - | 16 of 43 payloads add a file, 19 added paths, 528 tracked |
| `--selftest` | 19 controls | **26 controls, 26 PASS / 0 FAIL** |

Real-population report byte-identical over three consecutive runs, md5 `4dff36381bf2aca1681710cf24f9ab04`, exit 1 three times [R36]. The exit 1 is the file doing its job.

**Two mutation controls, run rather than asserted.** Forcing the tree lookup to say *present* (`grep -Fxq` → `false`) gives **22 PASS / 4 FAIL** and kills exactly C27, C27b, C27c and C30 - the four arms that depend on absence being detectable - leaving the other 22 green. Removing the empty-population guard so `nf_pop == 0` reads as a PASS gives **25 PASS / 1 FAIL** and kills exactly C29. Each mutation kills the controls written for it and nothing else.

**No new `producer | grep -q` site.** The lookup is `grep -Fxq -- "$nfp" "$treefile"` against a FILE and not a pipe, deliberately: `gates/audit/pipefail-grep.sh`'s tier-B roster ceiling is blocker (1) of build #499's dropped 18-payload batch, and adding a status-only pipe here would have put one more member against that ceiling.

**What this does NOT fix, so a green L9 is not read as a clean pile [R06 class sweep].** The class is "a delivery arm in this file confirmable by evidence that is true independent of the payload". It has **one** member - the ancestry arm - and it is **narrowed, not removed**: 13 payloads still read `content=NOT-ON-MAIN` with `delivered=yes by ancestry`, and **every one of the 13 is modify-only**, so L9 cannot reach them by construction. A further 16 are `INDETERMINATE` and decided by ancestry, which is the arm's legitimate job. The fix for the 13 is the ancestry narrowing **already parked** at `patches/proc-lane1-art-gates-audit-landed-on-main-sh-2026-10-06`; re-deriving it here is the duplicate work R09 exists to stop. found 1 / fixed 0 / narrowed 1 / left 1, said that way rather than as a 1-of-1.

**A correction to the job's own `whatIsLeft` [R18], and it is worth more than the patch.** Step (2) reads, verbatim: *"LAND patches/proc-lane1-art-gates-audit-landed-on-main-sh-2026-10-06, which carries a `patch` field and no `integrationResult` and is therefore exactly what STEP 1I selects by."* **That payload now carries an `integrationResult`** - build #499 wrote one onto it at 2026-10-08T13:15Z recording the batch veto. So the remedy for this defect was removed from every future manifest **by this defect**, eight hours after the remedy was named, and the compensating control for the class is inside the thing the class has hidden. The diagnosis is unchanged; its remedy can no longer be reached by the selector as written and now needs the integrator to take that document **by id**.

**Not checked.** Whether the 14 payloads that claim integration while only MODIFYING a file are delivered (a modification is not decidable without a 3-way, which is exactly why the new-file arm is worth having alone); whether `gates/audit-all.sh` discovers this file, since that umbrella is one of the seven absentees and is therefore not on main to ask; whether `gates/audit/cited-not-run.sh` has a roster row for the new arm (the arm is in a file that already has one, so no new instrument is added); the 59-section suite, which this change cannot reach; and whether any sibling payload also edits this file in the window - no process lane held this lock between 2026-10-06T18:50Z and this claim.

**Delivery** parked at `patches/proc-lane1-art-gates-audit-landed-on-main-sh-L9-2026-10-09`. **NOT on main**: no lane but the build routine can push, proved three ways on 2026-10-03, and not re-tested here [R21]. This record is the LAST commit of the parked body and a pure append, so `git am --skip` on a collision costs this lane's record and leaves the instrument intact.
## 2026-10-09T08:18Z - process lane 2 - gates/audit/story-join.sh delivered 100755, with its roster row

**Item.** `jobs/build-499s-18-payload-batch-is-blocked-on-pipefail-greps-tier-b-ceiling-and-the-tier-is-read-off-the-consumer-when-the-producer-decides-2026-10-08`, step (2) of its own `outcome.whatIsLeft` and the **last step on that job addressed to a process lane**. It reads: *any process lane holding `claims/art-gates-audit-story-join-sh` - `chmod +x gates/audit/story-join.sh`*. The first half of the same blocker, `chmod +x gates/audit/pipefail-grep.sh`, went out at 02:30Z in `patches/proc-lane2-pipefail-chain-consolidated-selectable-2026-10-09`.

**The step as written could not be performed by anybody, and that was re-derived here rather than taken from a field.** `git cat-file -e origin/main:gates/audit/story-join.sh` fails at main `8135381`, and `git ls-tree origin/main gates/audit/` lists 32 files with no `story-join.sh` among them. The file arrives with `patches/proc-lane4-art-gates-audit-story-join-sh-2026-10-07`, which carries an `integrationResult` written by build #499 at 2026-10-08T13:15Z with `landedOnMain: false` - so STEP 1I, which selects on `patch` present and `integrationResult` absent, can never reach it again. That is `jobs/a-refusal-written-into-integrationresult-removes-the-payload-from-every-future-manifest-2026-10-06`. The remedy is the one this lane used at 02:30Z: carry the prerequisite, so the work is selectable. Lane 4's file body is **copied byte-for-byte out of its own parked document** and not retyped; its commit, author and message are preserved.

**What changed.** Three commits. (1) lane 4's file commit, unmodified. (2) the mode, `100644 -> 100755`. (3) one roster row in `gates/audit/cited-not-run.sh` plus this record.

**Before and after, one variable at a time, in a detached worktree cut from `origin/main` 8135381.**

| reading | before | after |
|---|---|---|
| committed mode of `gates/audit/story-join.sh` | `100644` | `100755` |
| blob sha / content md5 | `d87d80b2` / `edbea1371a1558effbb2644e0071a160` | **unchanged, both** |
| `./gates/audit/story-join.sh` (direct) | rc **126**, `Permission denied` | rc **0** |
| `bash gates/audit/story-join.sh` | rc 0, output md5 `0cd7048dbf1a6238c46c6d2082dcf29b` | rc 0, **same md5** |
| `find gates/audit -name '*.sh' -perm -u+x` | **5** members | **6** members |

The mode commit is `0 insertions(+), 0 deletions(-)` - a pure mode change, not a rewrite. The positive control is the direct-execution line: rc 126 before and rc 0 after is the only reading in this table that a mode change can move and a content change cannot.

**WHY THE MODE MATTERS, STATED HONESTLY, BECAUSE ITS CONSUMER IS NOT ON MAIN.** Blocker (2)'s own words are that `gates/audit-all.sh` discovers instruments with `find -perm -u+x`, so a `100644` instrument "is reported, never counted". **`gates/audit-all.sh` is absent from `origin/main`** (`git cat-file -e` fails), and `grep -rn 'perm -u+x'` over `gates/` on main returns **nothing**: there is no discovery on main today for this fix to satisfy. What is on main is the convention, and it is uniform - all five `.sh` files under `gates/audit/` are `100755` (`cited-not-run`, `landed-on-main`, `pixel-literal-classify`, `verify-parked-patch`, `verify-patch-set`). So this change makes the file countable by the umbrella caller **when that caller lands**, and until then it buys consistency and direct executability and nothing else. Said here rather than implied, because a payload that claims a live reader it does not have is the frozen-denominator shape.

**THE THING THIS RUN FOUND BY MEASURING AND WOULD HAVE SHIPPED BY REASONING.** Delivering the file at all takes `gates/audit/cited-not-run.sh` from **UNACCOUNTED 2 to UNACCOUNTED 3**, with `gates/audit/story-join.sh` as the new member, read from the shell on the assembled tree. Pristine main reads `CITED-NOT-RUN 25, ACCOUNTED 23, UNACCOUNTED 2` (`gates/fastgate.sh`, `gates/pending/50-drill-verdict-no-jump.js`); the assembled tree reads `CITED-NOT-RUN 29, ACCOUNTED 26, UNACCOUNTED 3`. **And the citation that recruits it is this lane's own 02:30Z record**: `grep -c 'gates/audit/story-join\.sh'` over the record documents returns **0 on pristine main** and **2 on the tree with the consolidated payload applied**, both hits in `claude/PROCESS-LOG.md`. That is exactly the mechanism filed at 02:33Z as `jobs/step-6s-process-log-record-recruits-every-gates-file-it-names-into-cited-not-runs-member-set-so-the-roster-debt-depends-on-whether-the-record-commit-lands-2026-10-09`, firing on this lane's own chain. The roster row is therefore not tidiness; without it this payload ships a new RED.

**THE ROSTER ROW AND THIS RECORD ARE IN ONE COMMIT, DELIBERATELY, AND IT BREAKS THIS LANE'S OWN ISOLATE-THE-RECORD CONVENTION.** Every payload in `patches` says the record commit is isolated and last so `git am --skip` on an append collision costs the record alone. Here that arrangement is **unsafe**, and the reason is a four-case table rather than a preference. `story-join.sh` is in `cited-not-run`'s member set only if the file exists **and** some record cites it; the citation comes from the consolidated payload's record (call it C) or from this one (M); and a roster row whose path is **not** in that set is counted as `STALE-ROSTER`, which is a RED of its own. With the row in a work commit and the record isolated: C false and M skipped leaves the file present, uncited, and the row stale - a failure main does not have, manufactured by a `--skip` the integrator is entitled to make. With the row and the record in **one** commit, the row exists exactly when its citation does, so every one of the four cases is either correct or no worse than doing nothing. The cost is that a union-resolve is now needed to keep the row, and Route B (resolve and `--continue`) is what #499 measured as losing zero records across 18 payloads. **Integrator: prefer Route B here; `--skip` on this commit costs the roster row as well as the record, and the payload is still safe without both.**

**Determinism.** Three runs of the instrument on this tree: rc 0 each, output md5 `0cd7048dbf1a6238c46c6d2082dcf29b` all three.

**Non-interference.** The four `.sh` instruments already on main, run at `HEAD~1` and at `HEAD`: `landed-on-main` rc 2, `verify-parked-patch` rc 2, `verify-patch-set` rc 2 - byte-identical output. `cited-not-run` rc 1 both, and its output differed on **one line**, the `root` path it prints; re-run with the path held constant (two detached worktrees, same directory name) the outputs are byte-identical at md5 `f50fe65435451a051e733a7ef6143855`. That first MOVED reading was an artefact of the measurement, and it is recorded rather than quietly re-run.

**Not checked, six things.** (1) No gate and no suite ran: `gates/gates.sh` globs `gates/regress/*.js`, so nothing in this payload is reachable from the 59-section suite and a run would say nothing about it - no PASS/FAIL figure is given here and none is implied. (2) ~~its own controls were not re-run~~ **WITHDRAWN IN PLACE [R18]: they were run, and the first version of this line and of the roster row named the wrong command.** The invocation is `bash gates/audit/story-join.sh --selftest`, not `CT_SELFTEST=1`, which the script's own usage line at :379 refuses; the wrong form was written from the convention of its siblings and found by RUNNING it rather than by reading. Run correctly it returns `SELFTEST 17 pass / 0 fail` at rc 0, reproducing lane 4's 2026-10-07 figure on a byte-identical file - so the roster row's claim that the controls are a command is now true as written. (3) Whether `gates/audit-all.sh` actually counts the file once both land - that caller is not on main and the measurement cannot be made here. (4) The 320 and 375 geometries: nothing in this payload renders anything. (5) The apply against the other eight pending payloads in every order; what was measured is this payload alone onto main and after the consolidated prerequisite, in both directions. (6) `gates/fastgate.sh` and `gates/pending/50-drill-verdict-no-jump.js`, the two UNACCOUNTED members main already carries - they are older debt, named rather than swept.

**Delivery** parked at `patches/proc-lane2-art-gates-audit-story-join-sh-mode-and-roster-2026-10-09`. NOT on main; this lane cannot push and did not try [R21].

**One error of this run's own, found by running rather than reading, and kept rather than quietly repaired.** The roster row first ended `Its own 17 controls are a command: CT_SELFTEST=1.` Two mistakes in one clause: the variable is not the script's selftest switch (`:377` takes `--selftest`; `:379` refuses anything else with exit 64, and `CT_SELFTEST=1 bash ...` therefore ran the ordinary report and printed a CLEAN verdict that looked like a passing selftest), and a count in a roster reason is a frozen denominator of exactly the kind `cited-not-run.sh`'s own header argues against. The row now names the command and no number; the command prints the number. Measured after the correction: `SELFTEST 17 pass / 0 fail`, rc 0.

---

## 2026-10-10, 2:34am ET — process lane 1, run `process-build-1__1791614078511` — the arm (5) breach is real, the two new rows are fixed, and FIXING IT TURNS THE FAST TIER RED

**The item.** `jobs/citations-arm-5-is-breached-on-main-so-the-push-gate-may-be-red-2026-10-10` (P1, priority 14, `cls` suite, `mode` wrong-oracle), filed by the orchestrator at 1:55am ET from a subagent's incidental observation and filed EXPLICITLY as unconfirmed: its own `whatIDIDNOTVERIFY_sayItPlainly` says "I did not run gates/verify-log.sh --citations myself and I did not count the rows myself", and names the first step as running it on a clean clone of main and reading the real exit code. That is what this run did, in that order, before touching a byte.

**(1) THE BREACH IS REAL, AT THE REPORTED FIGURES.** `bash gates/verify-log.sh --citations` on a clean clone of `origin/main` at `4c7e007` (`#509 close-out`), exit **1**:

| arm | reading on pristine main |
|---|---|
| (5) wrong-width rows | **4** against the committed ceiling of **2** — `NEW WRONG-WIDTH ROW(S): 4 exceeds the committed ceiling of 2 by 2.` |
| (5) verdict | `REGISTER SELF-CHECK RED: ... 2 new wrong-width row(s) ...` |
| (1) dead paths | 17 dead, 66 resolved, 2 allowlisted |
| (2) case ids | 20 unsupported, 10 misfiled, 1 not checked |
| (4) line citations | 46 of ceiling 48, 0 dead, 0 past EOF — **the ceiling CAN BE LOWERED to 46** |
| whole mode | `CITATIONS RED`, exit 1 |

So the job is **confirmed, not withdrawn**. Independently corroborated three hours earlier by lane 4, whose `claims/art-claude-stories-TEST-CASES-md` release note at 12:07am ET records "arm (5) reads 4 of ceiling 2 before AND after" — i.e. the breach is standing and was not introduced by lane 4's two rows.

**(2) WHICH TWO ROWS ARE NEW, AND THEY HAVE TWO DIFFERENT CAUSES.** Read from the ceiling's own provenance comment at `gates/verify-log.sh:525-527`, which names the two the ceiling was derived for — TC-R19 at 15 columns and TC-R37 at 3 — so the other two are new.

| row | line | columns | cause | fix |
|---|---|---|---|---|
| TC-R09c | :29 | 10 vs 6 | **four unescaped pipes inside code spans** — two in the regex `^(1-0\|0-1\|-?M\d*)$`, two in `\|m\|>=1` | escaped as `\|`, exactly as the arm's own message prescribes |
| TC-R15 | :34 | 7 vs 6 | **not a pipe at all** — a seventh cell in a six-column table, holding the R08 input count, for which the table has no column | folded into the executed-by cell, where the other 56 rows carry that figure; no word lost |

That distinction matters because the arm's message only ever prescribes escaping, and following it on TC-R15 would have found nothing to escape.

**(3) THE FIX, MEASURED BEFORE AND AFTER ON THIS TREE.**

| measurement | before | after |
|---|---|---|
| arm (5) wrong-width | 4 (ceiling 2) | **2 (ceiling 2)** |
| arm (5) verdict | `REGISTER SELF-CHECK RED` | **`REGISTER SELF-CHECK OK`** |
| case rows / story headings / at-zero | 59 / 34 / 9 | 59 / 34 / 9 — **unmoved**, which is what a cell-shift would have changed |
| `gates/verify-log.sh --citations-selftest` | — | **30 pass / 0 fail**, rc 0, including C13/C13b (unescaped pipe fires, escaped form silent) and C14 (exactly at the width ceiling is not over it) — this tree's exact state |
| `gates/audit/story-join.sh` | — | **CLEAN**, rc 0, `CROSS-CHECK AGREES with arm (5): both read 9 story(ies) at zero cases` |
| determinism | — | arm (5) + verdict lines **byte-identical over three runs**, md5 `a55853171752f2e24fd3354d10d378a1` |

`A5WCEIL` was NOT touched. It lives in `gates/verify-log.sh`, a second artefact this run does not hold [R44], and lowering a ceiling to meet a breach is the shortcut the job itself names as forbidden.

**(4) AND HERE IS THE THING THIS RUN FOUND BY MEASURING AND WOULD HAVE SHIPPED BY REASONING. THE FIX TURNS THE FAST TIER RED.**

`gates/fastgate.sh:669` reads:

    ratchet "records"       '^(CITATIONS|REGISTER SELF-CHECK)' bash "$G/verify-log.sh" --citations

so the records tier of the **push path** runs this mode, HEAD against a BASE worktree, and compares `sig()` — the OK/RED/GREEN/FAIL words and every integer on the two summary lines — with `worse()`. Reproduced here with `sig()` and `worse()` copied line for line out of `fastgate.sh`:

| | signature |
|---|---|
| BASE (pristine main) | `RED,0,0,0,2,0,0,RED,17,20,10,0,0,0,1` — **15 fields** |
| HEAD (this fix) | `OK,59,5,34,9,9,2,2,RED,17,20,10,0,0,0,1` — **16 fields** |
| `worse()` verdict | **WORSE** — `fastgate.sh:617`, "different shape cannot be compared: treat as worse" |

`red=1` → `FAST GATE RED` → **exit 1** (`fastgate.sh:706-707`). The ratchet cannot accept the commit that fixes the breach it is watching, because the arm's OK line and its RED line are different shapes and the comparison short-circuits on length before it ever looks at a number. It is bounded — once the fix is on main, BASE and HEAD both read OK and the tier goes green again, so exactly ONE commit is refused, the improving one — and it is still a ratchet that refuses an improvement.

**And the same measurement falsifies a load-bearing claim in the roster.** `gates/audit/cited-not-run.sh:187` states of `gates/verify-log.sh`: "gates/gates.sh never executes this file (every reference in it is a comment) and the --citations mode exits before the log-verification path, so **an over-ceiling arm cannot redden any build**." The first half is TRUE and re-measured here — every one of the nine `verify-log` matches in `gates/gates.sh` is a comment line, so the full suite is unaffected and this payload cannot redden it. The conclusion is FALSE: `fastgate.sh` runs the mode on the push path, the over-ceiling figure is inside the ratcheted signature, and a commit that pushes wrong-width rows from 2 to 3 moves `new wrong-width row(s)` 0 → 1, a number that rose, which is `FAST GATE RED`. One cause, two consequences, filed once [R09] as `jobs/the-records-ratchet-refuses-the-commit-that-fixes-the-arm-5-breach-and-the-roster-says-this-mode-cannot-redden-a-build-2026-10-10`.

**INTEGRATOR, THIS IS THE ONE LINE THAT MATTERS TO YOU.** Land this payload through the **full suite**, not the records fast tier. On the fast tier it will read `FAST GATE RED` with `records: RED - this commit made it WORSE`, and that red is the ratchet's shape bug and **not** a defect in this change. Through `gates/gates.sh` there is no exposure at all, because the suite never executes `verify-log.sh`.

**Not checked, five things, named rather than swept.** (1) The whole `--citations` mode stays **RED at exit 1** on arms (1) and (2) — 17 dead paths, 20 unsupported case ids, 10 misfiled rows — none of which is this job's scope and none of which this payload touches. (2) TC-R19 at 15 columns and TC-R37 at 3: deliberately untouched, the baseline the ceiling was set for, owned by `jobs/two-case-rows-carry-unescaped-pipes`. (3) Arm (4)'s own finding, that the line-citation ceiling can be lowered from 48 to **46**, is read and reported here and NOT acted on — it is an edit to `gates/verify-log.sh`, an artefact this run does not hold. (4) No gate and no suite ran: nothing in this payload is reachable from the 59-section suite, so no PASS/FAIL figure is given and none is implied. (5) The apply against the other nine pending payloads in every order; what was measured is this payload alone onto `4c7e007`.

**Delivery** parked at `patches/proc-lane1-art-claude-stories-TEST-CASES-md-arm5-2026-10-10`. NOT on main; this lane cannot push and did not try [R21].
# PROCESS-LOG.md

The parallel process lanes' own run record. The build lane writes claude/RUN-LOG.md and this file is
deliberately NOT that file: prompts/process-build excludes RUN-LOG.md, HANDOFF.md, FEEDBACK-INBOX.md and
DECISIONS-LOG.md from the parallel lanes' allow-list because a trial merge on 2026-10-03 produced fifteen
conflict hunks and ten of them were in those append-style registers. One line per run, newest last.

NOTE FOR WHOEVER LANDS THE FIRST OF THESE PATCHES: this file does not exist on origin/main, so every
parallel lane's first payload creates it and two payloads add/add-conflict under `git am --3way`. That is
jobs/every-parallel-lanes-first-patch-creates-process-log-md-so-the-integrator-must-drop-one-artefact-2026-10-04.
Each lane therefore puts its record in its OWN commit, separate from its artefact: skip the record commit
if it conflicts, never the artefact commit.

---

## 2026-10-04, process-build lane 1, run process-build-1__1791095697298

**Item** jobs/gate-20-and-gate-21-never-visit-kunals-actual-geometry-2026-10-01 (P1, priority 14,
finishFirst band 14 - the gate-21 remainder). **Artefact** gates/regress/21-review-brilliant.js,
locked as claims/art-gates-regress-21-review-brilliant-js. **Base** origin/main 11abfaa.

**What changed.** Gate 21 had run at 375x679 and nothing else since #356. It now has a second geometry
column at 375x761 (block 5) plus eight no-browser controls on that column's four predicates (block 5a),
and a header that names both columns and says which is Kunal's.

**Work item 1, counted before anything was written [R07].** Of gate 21's 28 pre-existing assertions,
**ZERO** pin an absolute position, width or fit: 23 are text or value assertions on engine and template
output, 5 are presence or liveness, and the file contains no px literal at all. So the trap the job warns
about - literal pins measured at 679 reddening when the geometry moves - does not apply to this file, and
the 761 column deliberately does **not** re-run the 23 text assertions, because a quantity that cannot
depend on viewport height does not need 60 seconds of engine to be re-measured at a second height.

**Work item 2, and it uses 761 rather than the 730 the job asks for.** The job was filed 2026-10-01 citing
CLAUDE.md's 375x730. R19 settled it the other way on 2026-10-03 - "USE 375 x 761 ... The figure 730 is
wrong ... GEOS already carries kunal761 and that is the right one" - and gates/regress/72-drill-prev.js:43
is the one precedent on main that already reads R19 that way. 375x679 is kept untouched as the
shorter-phone column, exactly as the job's trap demands.

**Work item 4, the fleet-wide sweep, now COUNTED (it was the job's uncounted half).** Over all 55 files in
gates/regress at 11abfaa: **17 never visit any geometry but 375x679** - 10 that write `geo:'kunal'`
(10, 11, 12, 13, 14, 21-before-this-change, 30, 31, 51, 70) and 7 that pass no geometry at all and so take
gates/lib.js:95's default, which is `GEOS.kunal` = 375x679 (27, 53, 58, 61, 64, 68, 69). **37 visit
kunal730.** **Only 3 of 55 ever visit kunal761** - 26-invariants, 45-play-setup and 72-drill-prev - which
is the geometry R19 names as his. Gate 21 is the fourth.

**Measured** against the bundle on main (origin/main 11abfaa, app.js unchanged by this patch).

| run | assertions | result |
|---|---|---|
| gate 21 at 11abfaa, unmodified | 28 | 28 pass / 0 fail |
| gate 21 with this change | 42 | 42 pass / 0 fail, twice, byte-identical on the new lines |
| block 5 pointed at GEOS.short375 (375x568) as a negative control | 42 | 33 pass / **1 fail** |

**THE NEGATIVE CONTROL FAILED AND THAT IS WHY BLOCK 5a EXISTS.** Pointing the new column at 375x568
flipped exactly ONE of its six assertions, the viewport identity; the other five stayed green because the
Review screen scales down gracefully (board 264 wide at 568, nothing clipped, nothing absent, the sentence
unchanged). A geometry change cannot exercise five of six, so publishing them as six green geometry checks
would have been precisely
jobs/a-control-set-can-score-full-marks-with-its-own-subject-deleted-2026-10-02. The four predicates were
therefore lifted out by name and driven over fabricated readings in both directions - absent element,
25px overflow, self-clipping element, a sentence differing in its last clause, an empty pair, a wrong sign
(-2.8, the #389 shipped defect), a near-zero (+0.1, the #385 defect), a hundredfold error and an
unreadable bar. Eight controls, no browser, no engine time, count fixed at 8.

**THE MEASUREMENT WORTH MORE THAN THE PATCH.** At 375x761 with ct_safe 51,31 the review board renders
**349.03px** wide. Kunal's own 2026-09-14 diagnostics report `boardPx 349.04` [R19]. gates/lib.js:25-26
records a 2026-09-12 measurement predicting **293** at that configuration and uses it as the reason the
suite emulates him at 375x679 instead. **That prediction is false against today's bundle, by 56px.** The
reading is published as a note in the gate and asserted nowhere, because which of Kunal's two figures the
suite should build against is not a gate's decision [R45]; the contradiction is filed for the
orchestrator.

**Gates run.** gates/regress/21-review-brilliant.js only, three times plus one mutant. The 55-suite GATES
GREEN run was not spent: this patch changes no bundle, no selector and no story clause, and a subset run
cannot authorise a push in any case - this lane never pushes.

**Not checked.** The review board width at kunal730, which would settle the three-way comparison rather
than the two-way one (one command: run this file with block 5's geo set to 'kunal730'). Whether the 17
679-only gates have assertions that would move at 761 - counted, not run. 390x844 and 430x932 on this
gate. Whether `samePin761` would catch a sentence differing only in whitespace, since lib's `text()`
collapses runs of whitespace before this gate ever sees it.

**Delivered to** patches/proc-lane1-art-gates-regress-21-review-brilliant-js-2026-10-04. Nothing is on
main: the git proxy refused one push dry-run at 2026-10-04T06:38:53Z with HTTP 403, as the charter records
it will.
# PROCESS-LOG.md — the parallel process lanes' own record

This file is written ONLY by the parallel lanes (`claude/process-lane-<N>` and `claude/burst-*`), per
prompts/process-build step 6. The build lane's own records are RUN-LOG.md and HANDOFF.md and this file never
touches them: a trial merge on 2026-10-03 put ten of fifteen conflict hunks in the files both sides append to,
which is why this file exists separately.

## TO THE INTEGRATOR, AND IT IS THE FIRST THING TO READ

This file DOES NOT EXIST on origin/main. Every parallel lane's payload therefore creates it as a NEW file, and
two payloads add/add-conflict under `git am --3way`. As of 2026-10-04T09:0xZ that is at least the sixth payload
doing so. **Every lane's record is committed SEPARATELY from its artefact**, so the correct move on a conflict
here is `git am --skip` of the RECORD commit only — never of the artefact commit, which is independent and
carries the work. Each payload's `appliesClean` field names both shas explicitly.

The cheapest permanent remedy is the one lane 3 recommended and lane 1 repeated: have one build create this
file on main with this header alone, after which the whole add/add class disappears. That is
jobs/every-parallel-lanes-first-patch-creates-process-log-md-so-the-integrator-must-drop-one-artefact-2026-10-04,
owned by the orchestrator.

---

## 2026-10-04 08:13Z–09:0xZ — process-build lane 2 — run `process-build-2__1791101599763`

**Item** jobs/gate40-headline-assertion-has-a-zero-denominator-at-kunals-geometry-2026-09-28, priority 14,
finish-first band 14, taken FROM the finish-first queue (my own WIP was 0, so nothing of mine was owed; the
priority-16 row above it is a chess.jsx product P0 and the three 15s are orchestrator Desk items, neither of
which this lane may touch). Scope taken: `alsoFromTheSameAudit` **item 2 only**.

**Artefact** `gates/regress/40-reachability.js` (lock `art-gates-regress-40-reachability-js`, held 08:15:57Z,
released at check-out).

### What changed

1. **The puzzle-header right-edge walk is depth-general.** It read `kids:[...r.children]` — depth 1 — so only
   the direct children of the first div inside `pz-top` were measured and a spilling descendant was invisible
   to the one assertion in this file about the spill that *cannot* be recovered (overflow-x hidden ancestor,
   `document.scrollWidth` pinned at the viewport). `kids` is left untouched at depth 1 because the Z-06
   position pin is written against the three direct children; a new `all` carries every painted descendant
   with its depth, and the right-edge assertion is made over `all`.
2. **The predicate is a named function, `spillPast(boxes, vw)`, driven by 8 both-direction controls** over
   fabricated readings with no browser and no bundle. The live assertions call the same function, so the
   controls constrain the live check rather than a copy of it. C2 is the input the old walk could not even
   represent: a depth-2 box ending at 391.2 on a 375 viewport. C4/C5 pin the existing 0.5px tolerance as a
   threshold rather than a hole. C7/C8 cover the depth classifier in both directions and on an empty reading.
3. **The gate opens `pzView==='online'` for the first time.** A grep for `online` over the file returned
   nothing before this change; the audit's item 2 names it as the screen #426 changed. The online view renders
   its own `pz-top` (chess.jsx:7554), so every selector this block uses resolved there and measured nothing
   there. Both swept geometries now assert the view actually changed (the header names Lichess) before
   measuring anything, then measure the same right-edge claim over its own descendants.
4. **The depth guard is a DECLARED kind, not a requirement to be deep.** Written first as `deeper>0`, it went
   RED on the online header on its first real run — correctly, because that header is genuinely flat. A
   vacuity guard written that way is a layout pin wearing a coverage message, which is the error recorded on
   jobs/a-control-set-can-score-full-marks-with-its-own-subject-deleted-2026-10-02. `HDR_DEPTH_KIND` declares
   browse `deep` and online `flat` and asserts the measurement against the declaration, falsifiable in both
   directions. That red is kept in the file's comments rather than quietly repaired.

### Measured

Against the bundle on origin/main `2e5f30bde801f4c8844fd415879f0bae0bbc83e6` (`app.js` stamp
`#476 - 2026-10-04 01:16 ET`), real Chromium, no network:

| | PASS | FAIL |
|---|---|---|
| gate 40, unmodified main | 20 | 1 |
| gate 40, this change | 36 | 1 |

Byte-identical `PASS`/`FAIL` lines over **three consecutive runs** (md5 `9cf14a0c52d7a4bf9f3ecd280686d473`) [R36].

- Browse header: **4** painted descendants, max depth **2**, **1** below depth 1 — so the depth-1 walk was
  missing a real box, not a hypothetical one.
- Online header: **2** painted descendants, max depth **1**, **0** below depth 1 — flat, and declared flat.
- The online view offline shows the app's own message: *"Couldn't reach Lichess. This works on the deployed
  site with internet — it may be blocked in this in-app preview."* That is an honest message for the state
  [R14], and it is the state this block now covers; nothing covered it before, at any depth.

### THE ONE FAIL IS PRE-EXISTING AND IS NOT MINE

`kunal730: the header is UNCHANGED at 375 by the 320 fix` at :248 pins three literal widths and offsets
(119@4, 93@148, 105@266) and measures **108@4, 81@154, 94@277** on unmodified origin/main in this container —
red before my change and red after it, identically. All three widths are short by **11, 12 and 11 px**, a
uniform shortfall across three unrelated strings, which is the signature of a font fallback rather than of a
layout change; the x offsets follow because the row is `justify-content: space-between`. That reproduces
jobs/gate-40-reads-16-of-17-in-one-container-and-17-of-17-in-473s-suite-on-one-bundle-2026-10-03 on a second
bundle seven builds later, and the measurement is reported onto that job. **It is not repaired here**: landing
a repair to somebody else's red, inside a literal pin that encodes one of Kunal's own conditions, would be
this lane deciding a question that is not its own.

### Not checked

- The full 56-suite GATES GREEN run. Nothing outside `gates/regress/40-reachability.js` changed, a subset log
  authorises no push by design, and this lane never pushes to main in any case.
- Whether the depth-2 box the old walk was missing has *ever* spilled on any shipped bundle. `git log -S` on
  the header markup was not run [R35], so this change closes a hole rather than reporting a historical defect.
- The **connected** online puzzle state (`curPuz.ext` set, board showing, chess.jsx:5037). Unreachable here:
  it needs lichess.org and the egress proxy refuses it [R21, recorded rather than worked around]. A fixture
  would need a `CT_*` override in chess.jsx, outside this lane's allow-list. Declared in an `L.note` in the
  gate itself so the absence is never read as coverage.
- Geometries other than `se` (320x568) and `kunal730` (375x730). In particular **not** 375x761, the geometry
  R19 settles on as Kunal's: the three-way disagreement between R19's 761, `gates/lib.js`'s 679 and GEOS's
  `kunal730` is live and unresolved today, and pointing a fourth file at a figure that may move is worse than
  leaving it [R45]. Lane 1 measured at 06:5xZ that only 3 of 55 gates visit 761.
- `alsoFromTheSameAudit` **item 4** (`41-coach-bubble.js:47` pinning the board width at 2 of 7 geometries) —
  the other half of this job's remainder, and left for the same geometry reason, stated on the job.
- The four jobs with status `blocked`: re-derived by query this run, same four, none re-tested, none reachable
  from inside this lane's allow-list [R23]. The cause is already filed.

### Delivery

**NOTHING PUSHED.** One `git push --dry-run` at 08:14Z returned the agent proxy's refusal —
*"LearnToCheckmate/chess-trainer is not in this session's authorized repository set"* — then HTTP 403, exactly
as prompts/process-build records it will. One dry-run only, at the start of the run; not retried, no workaround
attempted and none sought [R21]. Clone and fetch both succeed, so this session has read and not write.
Parked at `patches/proc-lane2-art-gates-regress-40-reachability-js-2026-10-04`.
## 2026-10-06T22:27Z — process lane 3 — `gates/verify-log.sh`, the last SIGPIPE site that can invert an answer

**Item** `jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02` (priority 14, `finishFirst`), step (1) of its `outcome.whatIsLeft`. The highest band with a remainder inside this lane's allow-list: all eight priority-16 jobs are `chess.jsx`, and the six at 15 are prompts or Desk work owned by the orchestrator under R17.

**What changed.** Arm (1) of `--citations` tested the allowlist with `printf '%s\n' "$ALLOW" | cut -f1 | grep -qxF "$P"` under `set -o pipefail`. `grep -q` exits the instant it matches, `cut` is killed by SIGPIPE, the pipeline returns **141**, and because that rc lands in an `if`, a path that **is** allowlisted reads as not found. It is then counted at `A1BAD`, and line 662 turns the arm `CITATIONS RED` — a green suite refused at the push gate for a reason that is false, which is the class this job is named after. Now a herestring, which has no pipe.

**Measured rather than read [R18].** On the pipe form with the match on row 1 of an `$ALLOW` of *n* rows: rc 0 at n=1, 2, 10, 100, 500, 1000; **141 at 1500**; 0 again at 1800, 2000, 2200; **141 at 2500, 3000, 6000**. So it is a **race, not a threshold** — intermittent from about 1500 rows and reliable from about 2500 (~65KB, one pipe buffer). `$ALLOW` holds one row today, so the defect is **latent**, and the trigger grows every time a reserved name is added to that allowlist. A flaky push gate is worse than a failing one.

**Four controls, and the one that matters is proved to fire.** `C17` pins the banned form's inverted answer and `C17b` the herestring's correct answer **on the same input** — a boundary, so neither half can be satisfied by a detector that tests nothing. `C17c` is the static ratchet at ceiling 0 over this file's **code**, and `C17d` ratchets its one deliberate exemption, the shape `C11b` already uses here. **Negative control:** reverting only the repair and leaving the controls gives **33 pass / 1 fail, exit 1**, failing at `C17c`.

**C17's first two drafts were inadmissible under R36 and both are recorded in the file rather than quietly replaced, because they are the more useful half of what this run learned.** Draft one built a 3000-row allowlist and asserted rc 141 on the strength of the race measurement above. It went green six times here and then **failed once in six runs in a second tree built from a byte-identical file** — caught only because this run re-ran the selftest *inside* the applied tree rather than trusting its own branch. Asserting a race is inadmissible however green it looks on the run that writes it. Draft two tried to *order* the race with a three-row producer and a `sleep` between its writes, so that `grep -q` has certainly exited before the second write; it read rc 0 on every run, because a short stream is flushed inside one buffer and the write never blocks. **Draft three takes the race out by arithmetic:** 20,000 rows is ~520KB, eight pipe buffers, so the producer *must* block on a write nobody is reading. Measured **20 of 20 at rc 141**, and the rows are written by `awk` rather than a bash loop because the loop took over 30 seconds, which fails R36's second admission test.

**An error of this run's own, kept rather than tidied away.** `C17c`'s first draft returned 2. One of the two was the *comment* 600 lines below that quotes the banned form while explaining it. A detector that reddens on its own documentation teaches the next holder to delete the documentation, so it strips comment-only lines before matching, and the header says so.

**Gates run, against main's own tree.** `--citations-selftest` **34 pass / 0 fail, exit 0** (main: 30 / 0), byte-identical over **six** consecutive runs at ~3.2s each [R36], and 34 / 0 again in a fresh `git am --3way` tree at the recorded base. `--citations` over the real tree is **byte-identical to main's output**, both exit 1 on the pre-existing `CITATIONS RED: 18 dead path(s)` — which is not mine and not changed. `gates/verify-log-selftest.sh` unchanged at 17 pass / 0 fail, 8 holes open. `bash -n` clean.

**Class swept [R06]: found 3, fixed 1, left 2.** Across all 13 shell scripts under `gates/`, seven set `pipefail`, and in exactly three places a pipeline whose consumer can short-circuit has its rc consumed in a boolean position: this one, and `gates/verify-log-selftest.sh:83` and `:97`. The latter two are **not in this run's artefact lock** [R44] and are already registered as outstanding debt by lane 4's parked `gatemanifest` payload. `gates/audit/verify-patch-set.sh` has seven syntactically identical sites and **none** is in the class, because that file never sets `pipefail`.

**Not checked.** Whether the repaired arm behaves correctly with an `$ALLOW` of 2500+ rows *through the real `--citations` entry point* — `$ALLOW` is a hard-coded literal and making it injectable would change the push gate's own surface, which is more than this remainder asks for. No suite-level run: `gates/gates.sh` globs `regress/*.js` and never runs this file, and running the suite is the pen's.

**The half this run did not take, and it is a collision rather than a shortfall [R45].** `whatIsLeft` says to lower `SP_A_CEIL` from 1 to 0 in `gates/gatemanifest.sh` **in the same commit**. `grep -n 'SP_' gates/gatemanifest.sh` on `origin/main` 7aaacb0 returns nothing: no `SP_*` constant has ever been on main. It exists only inside lane 4's parked payloads, the newer of which — parked at 22:20Z, seven minutes before this run began — deletes all three bare ceilings in favour of an `SP_REGISTER` table. Writing a competing hunk into that file would put two payloads on one artefact in one integration batch.

**Delivery** parked at `patches/proc-lane3-art-gates-verify-log-sh-2026-10-06`. One commit, one file. **Not on main; this lane cannot push.**
## 2026-10-07T00:35Z — process-build lane 1, run `process-build-1__1791333309448`

**What I changed in the repository: nothing but this record.** The run's output is three measurements and two tracker writes, and the one repair it found is one R45 forbids the finder from making.

**Finish-first, not fresh work [R05b].** WIP in at 2, both `finishFirst` on one artefact, `gates/audit/verify-patch-set.sh`. Took `jobs/s3b-and-s6-are-the-only-repo-reading-checks-and-neither-has-a-control-that-fires-while-three-states-turn-a-fail-into-pass-2026-10-06`, whose `outcome.whatIsLeft` names one step and a hard prerequisite. **The prerequisite had been met and nobody had re-measured.** Patch 1 landed as `28a74bf`; main's copy of the file now has md5 `9b561e8f55510b82c9f0e2e482c647ee`, the md5 lane 2 recorded for patch 1's tree, and `git merge-base --is-ancestor 2d566fe origin/main` exits 0.

**Re-measured at `origin/main` 8b108fb.** `git am --3way` of `patches/proc-lane2-art-gates-audit-verify-patch-set-sh-s3b-s6-2026-10-06`: both commits apply clean, exit 0. Applied file md5 `a6d5e1e2441f5873853636961aee3565`, identical to lane 2's. `--selftest` **92 pass / 0 fail**, byte-identical over three consecutive runs with temp paths normalised (md5 `57c992a2ed970840d37f67c1e028cf25` three times) [R36]. `gates/audit/verify-parked-patch.sh` at base 8b108fb: **VERDICT SOUND**, exit 0. Recorded on the patch document as `appliesCleanRemeasured_2026_10_07`; **no `integrationResult` written** — that field is the integrator's and writing it would remove the payload from STEP 1I's selection.

**The whole pending pile, applied as a set.** All five unintegrated payloads apply clean onto today's main **individually**. As a set, oldest base first, four land and lane 3's stops at its second commit with `CONFLICT (content)` in `claude/PROCESS-LOG.md`; resolving by keeping both sides and `--continue` lands all seven commits at **47 insertions / 0 deletions** in that file, no conflict markers. First end-to-end confirmation of what this file's own S2/S4b predict.

**The finding, and it is a second instance of a cause already on record.** In that merged tree `gates/gatemanifest.sh selftest` reads **53 pass / 2 fail**, exit 1; plain main reads 32/0. Bisected pairwise: lane4+lane1 55/0, lane4+lane2 55/0, lane4+orch 55/0, **lane4+lane3 53/2**. Lane 4's `SP_REGISTER` rows for `gates/verify-log.sh` were measured before lane 3's payload existed — TIER D is now 5 sites against 4 registered (REFUSES), TIER A is 1 registered and 0 found (tightenable). The **totals still agree at 17**, so a total-only ceiling would have missed it; the per-site register is both what breaks and the only reason the break is visible. The TIER A half is lane 3 hitting a target this register's own debt section set.

**Blocks nothing, measured.** `gates/gatemanifest.sh check` exits 0 in the merged tree, and `gates/gates.sh:165` runs `check`, never `sigpipe` or `selftest`. So no suite stops and no push is refused; what goes red is a hand-run instrument. Filed with an owner, not escalated [R45, R46] — added to `contradictions/two-lane-4-payloads-are-each-correct-and-jointly-over-the-sigpipe-ceiling-2026-10-04` with `fingerprints/4b2dc571ec5e30db` incremented to count 2, **not filed as a second document** [R09, R25]. That fingerprint had written in advance that a second instance would justify building a cross-payload instrument that checks measured numbers; this is it, and it is between two lanes seven minutes apart rather than one lane six hours apart.

**I did not repair it, deliberately.** R45 reserves resolving a contradiction to someone other than the finder. I also did not touch `gates/audit/verify-patch-set.sh` despite holding its lock: lane 2's two payloads on it are unintegrated, so any edit of mine would be cut against a base missing them — which is the very class this run just filed.

**Not checked.** The 84-minute `gates.sh` suite (unreachable for `gates/audit` and `gates/*.sh`: the suite globs `gates/regress/*.js`). Whether the other three payloads interact in any instrument other than gatemanifest's selftest. Whether the five-payload order I used is the order STEP 1I will choose.

**Delivery:** this record only, parked at `patches/proc-lane1-art-claude-PROCESS-LOG-md-2026-10-07`. It carries **no artefact commit** and is a pure append, so `git am --skip` costs this record and nothing else. NOT on main; this lane cannot push.
## 2026-10-07T18:4xZ — process-build lane 1, run process-build-1__1791398097932

**Item.** jobs/a-new-gates-regress-gate-cannot-be-delivered-by-a-process-lane-because-its-manifest-row-is-outside-the-allow-list-2026-10-07, filed by this run. It was found while choosing an item, not while hunting: the oldest priority-13 finish-first job whose remainder is inside this lane's allow-list is jobs/20-review-cats-frozen-at-eight (raised 2026-09-22), and its remainder is `gates/regress/56-review-ladder.js`, a NEW numbered gate. Checking whether that was deliverable is what produced the finding, so the job this run filed is the reason the job this run wanted to take cannot be taken by this lane at all.

**Changed.** `gates/audit/verify-parked-patch.sh` only, one file, commit `cd8f457` over base `6fb630d`. New check **C5-NEW-GATE-MANIFEST-ROW**: a parked payload that ADDS a path matching `gates/regress/[0-9]*.js` is refused, with the gate named.

**What was measured, and it is measured in both directions rather than read off the source.**

| what | command | result |
|---|---|---|
| manifest baseline | `gatemanifest.sh check` on a throwaway copy of `gates/` | exit 0, `57 required, 57 present, 0 missing, 0 unlisted` |
| manifest with one unlisted gate | same copy + `gates/regress/74-synthetic-measurement.js` | exit **2**, `57 required, 58 present, 0 missing, 1 unlisted` |
| the file removed again | same copy | exit 0, `0 unlisted` — so the detector is silent as well as firing |
| push gate, control | `verify-log.sh claude/agents/gatelogs/493b-all.log '#493'` | exit **0** |
| push gate, 1 unlisted | the SAME log, three footer lines changed to `58 present, 1 unlisted` | exit **1**, `REFUSED (gate manifest)` |

The arithmetic in the forged log was kept consistent (`58 present - 1 unlisted + 0 missing = 57 required`) so that `verify-log.sh`'s separate add-up refusal cannot be what fired. Four lines differ between the two logs.

**Why the two checks together are a proof and not a precaution.** The row that makes a new gate pushable goes in `gates/gate-manifest.tsv`. That path is in this lane's forbidden list, and `verify-parked-patch.sh`'s own `forbidden()` already rejects `gates/*.tsv` — there is a committed control for it (`C4 fires on a .tsv under gates`). So C4 fails the payload if the row is included and C5 fails it if it is not. There is no third route. **And the refusal lands at the PUSH, so the cost is not the payload: it is every commit in the build that landed it.** A process lane's unlandable gate would stop the build lane pushing anything at all until someone added the row by hand.

**Gates run, and their numbers.** `gates/audit/verify-parked-patch.sh --selftest`, **17 → 25 pass / 0 fail** with `SELFTEST_REPO` set; 15 → 23 without, which is this file's own already-filed C3 scope defect and not something this change introduced. Byte-identical over three consecutive runs with temp paths normalised, md5 `d984d0b35a518833` three times [R36]. Eight new controls, the firing arm written first: C5 fires on a new numbered gate; the **negative control** that `VERDICT SOUND` is genuinely replaced by `VERDICT REJECT`, not merely accompanied by a FAIL line; the message names the gate; **two silent arms** — a MODIFIED gate (its manifest row already exists) and a new `gates/audit/` script (the manifest's required set is `gates/regress/*.js` only); a **two-gate discriminator**, so a check that found the first and stopped reads differently from one that counts; and a **NOT CHECKED** arm for a `new file mode` line that no `diff --git` claims. **Mutation control on a copy**: replacing C5's gate-number match with a pattern that cannot match kills exactly the three C5 firing controls and leaves all 22 others green, so the mutation kills only its own arm.

**Measured on the live pile, not only on fixtures [R18].** All **15** payloads in `patches` carrying a `patch` and no `integrationResult` read SKIP. Six add exactly one file each and **every one of those six is a `gates/audit/` script**. The parse's attributed count equals each payload's own `new file mode` count on all 15, so nothing read NOT CHECKED either. C5 therefore fires on nothing today and is prospective — stated that way rather than counted as a catch. The six adders being six more callerless `gates/audit/` scripts is the other half of the same hole: the manifest's required set is `gates/regress/*.js`, which is exactly why five such scripts have landed on main with nothing invoking them and nothing objecting.

**An error of my own, found by running and not by reading.** The control block was first inserted after the selftest's `rm -rf "$T"`, so all eight new controls ran against a deleted temp directory and reported `C0-PAYLOAD-NON-EMPTY FAIL payload file is missing or empty` — 17 pass / 8 fail, with every failure message pointing at the payload rather than at the harness. Relocated above the cleanup. Kept here rather than quietly fixed, because the failure mode is the one worth knowing: a control that cannot reach its fixture fails in the vocabulary of the thing under test.

**Not checked.**
1. I did **not** re-run the 56-section suite. Nothing under `gates/audit/` is reachable from `gates.sh`, whose list is `gates/regress/*.js`, so this payload cannot move a suite number and running it would prove nothing.
2. I did **not** verify that `gates/gatemanifest.sh sync` would in fact make a new gate pushable. The claim here is only that it is refused without the row.
3. I did **not** sweep the three sibling audits (`verify-patch-set.sh`, `cited-not-run.sh`, `landed-on-main.sh`) for whether any of them already asks this question. `verify-patch-set.sh` is the cross-payload audit and S3b reads the gate NUMBER space on main, which is adjacent and not the same check; I did not read the other two.
4. I did **not** test this payload's merge against the other five `claude/PROCESS-LOG.md` payloads parked today, in either order. The record is committed separately from the artefact (`cd8f457` artefact, the record alone) so an append conflict costs this record and not the check, but the split is **declared** safe rather than proved safe.
5. I did **not** mutate the vacuity guard. Its NOT-CHECKED arm has a firing control and a forged input; it has no mutation.
## process-build lane 1, run process-build-1__1791376534811, 2026-10-07T12:35Z-13:4xZ

ITEM: jobs/no-gate-mates-a-game-and-then-steps-the-ply-2026-09-30, piece (1) of its whatDidNot only.
ARTEFACTS HELD: gates/regress/46-play.js (never claimed before this run), claude/PROCESS-LOG.md.

WHAT CHANGED. Block 10 of gates/regress/46-play.js - the fool's-mate block - now steps the ply after the
mate and asserts the chrome there. Until this run NO GATE IN THE SUITE mated a game and then stepped the
ply, so the ply-keyed half of the `(isOver||playEnd)` predicate had never been the operative half of any
assertion: everything mates and asserts at the TERMINAL ply, where isOver alone carries the verdict and the
ply term can be anything at all. The harness could already reach the state - gates/drive/play.js has carried
the `pp-mate-back` drive state since it was written - and nothing asserted over it.

MEASURED BEFORE ANYTHING WAS WRITTEN, on origin/main's own bundle (app.js md5 431326911ca7, stamp #492),
with a standalone probe rather than from source [R18, R35]:
  terminal ply 4 : row Moves,Back,Forward,Review,Rematch,More   card "Checkmate! Black wins"
  one ply back 3 : row Moves,Back,Forward,Review,Rematch,More   card null
  forward to 4   : row Moves,Back,Forward,Review,Rematch,More   card "Checkmate! Black wins"
The two halves of the game-over chrome behave DIFFERENTLY one ply back: the control row is NOT ply-keyed and
the result card IS. That difference is the whole point of the arm.

GATES RUN, AND THE NUMBERS. gates/regress/46-play.js alone, against main's committed bundle - the gate does
not change app.js so there is nothing else to run it against. 128 pass / 0 fail before, 142 pass / 0 fail
after: +14 assertions, 7 at each of the two Pass & Play geometries the block already visits. gates.sh was
NOT run: it is the whole 58-section suite and this lane's budget is 70 minutes.

THE ONE THING THIS ARM COST, AND IT IS RECORDED RATHER THAN HIDDEN. The first placement put the arm
mid-block, immediately after the TC-PL-024 Review assertion. That run came back 142 pass / 2 FAIL, and both
fails were TC-PL-027's extra-child line reading 64 -> 64 at se and at kunal730 - caused by this arm and by
nothing else: the result card lives for 8 seconds after the mate, TC-PL-027 pins exactly that fade, and a
~3s Back/Forward detour before it pushes the `kidsWithCard` read past the window. The arm therefore MOVED to
the end of block 10 rather than TC-PL-027 being loosened to accommodate it. The cost of moving is that the
card's ply-keying is measured in the comment and NOT asserted, because after the fade there is no card to
lose; a card arm inside the 8s window needs its own browser on `pp-mate-back`, which is named as the
remainder on the job.

WHAT I DID NOT CHECK, AND WHAT I DID NOT DO.
- The full suite. Only gate 46 ran.
- Pieces (2) and (3) of the job are NOT done and are not mine this run. (2) is the conventions line in
  claude/stories/TEST-CASES.md: inside the allow-list, but two sibling lanes have parked payloads against
  that exact file today and R44 is one agent one artefact for the whole run. (3) is the harness composition
  rule, which lives in gates/lib.js - NOT in the process-build allow-list, which covers gates/regress/,
  gates/drive/, gates/audit/, gates/pending/ and gates/*.sh and nothing else.
- Block 11's resign arm, the NON-BOARD ending the same job asks for, still asserts at its terminal ply only.
- The geometry label. Block 10 runs at `se` and `kunal730`, and R19 settled on 2026-10-03 that Kunal's phone
  is 375x761 and that kunal730 is the wrong entry. Not corrected here: it is a different job, already open,
  and changing a geometry key under an assertion whose pins were measured at that geometry would silently
  move every number in the block.

## process-build lane 1 — run process-build-1__1791441292721 — 2026-10-08T06:34Z

THE CARD ARM ON gates/regress/46-play.js, piece (2) of the whatDidNot on
jobs/no-gate-mates-a-game-and-then-steps-the-ply-2026-09-30.

- CHANGED: `gates/regress/46-play.js` only. A second launch at the end of block 10 (`play-over-card-<geo>`)
  that runs `pp-mate` then Back then Forward with NO 8s settle anywhere in it, so every reading is taken
  inside the result card's fade window. +12 assertions, 6 at each of `se` and `kunal730`.
- WHY: the Back arm added on 2026-10-07 steps the ply only AFTER `await b.settle(8000)`, and its own note
  line says the card reading there "is about the fade and NOT evidence either way about ply-keying". The two
  causes of an absent card were indistinguishable in this suite. They are not now.
- MEASURED, on origin/main's own committed bundle (app.js md5 01387f706cea, stamp `#496 - 2026-10-07 20:07
  ET`), identical at both geometries: T+0 ply 4 / card "Checkmate! Black wins" / 65 board-grid children;
  T+~570ms ply 3 / card null / 64; T+~1140ms ply 4 / card up / 65.
- GATE RUN: `node gates/regress/46-play.js` against that bundle. 142 pass / 0 fail before, 154 pass / 0 fail
  after. Run twice (the 142 baseline and the 154 after) with identical figures.
- NEGATIVE CONTROL: the Back tap replaced by a no-op `settle(400)`. 2 pass / 3 fail, and the three reds are
  the three that must be (the ply step, the card absence, the grid child count). A5, the round-trip
  assertion, stays GREEN under that control and cannot see the defect — recorded, because that is why
  A2–A4 exist as separate lines rather than as one conjunct.
- NOT CHECKED: the full `gates/gates.sh` suite (58 sections against a 70-minute lane budget); the
  non-board ending (block 11 resigns at move 0, where Back and Forward are both disabled, so a
  resign-with-moves drive state is needed and `gates/drive/play.js` has none); the harness rule that would
  run every game-over assertion at both plies, which lives in `gates/lib.js`, outside this lane's
  allow-list. The last two stay on the job with reasons.
- THE PILE WAS AT ITS CEILING, SO NOTHING NEW WAS PARKED. `patches` held exactly 20 documents with a
  `patch` field and no `integrationResult` at 06:38Z, and prompts/process-build halts this lane above 20.
  This run therefore UPDATED the existing `patches/proc-lane1-art-gates-regress-46-play-js-2026-10-07`
  in place and the pile is still 20. Last integration on main: `7aaacb0` (#487), 2026-10-06T20:54Z —
  nine builds ago.
## 2026-10-07 14:14Z — process-build lane 2 — the four-gate engine-branch class, closed by route 2

**Item** `jobs/four-gates-force-a-three-worker-pool-and-never-test-the-fallback-2026-09-27` (priority 13, band 13 finish-first, raised 2026-09-27T17:12Z by #424's antagonist A, never picked up since). It was the OLDEST job at the highest priority available inside this lane's allow-list; the one job above it (priority 15, `the-suite-lock-was-never-justified-by-a-measured-timing-conflict-2026-10-04`) needs two concurrent 83-minute suites, which does not fit a 70-minute budget, and that is said here rather than left as an unexplained skip.

**Changed** `gates/regress/34-takeback.js`, `35-width-containment.js`, `36-evalbar.js`, `37-strip-sync.js`. 139 comment lines inserted, 0 deleted, **0 executable bytes changed**. Commit `5c14fc5` on `claude/process-lane-2` over base `7353e67`.

**Which route and why.** The job's `doneWhen` offers two: run both branches, or state in the header which branch is not covered and why. Route 1 is unavailable to any lane — the job's own `aFifthInstance_addedByBuild440` and `processBurstReport_2026-10-03_gate51` both established that there is no harness route to the no-Stockfish fallback at all — and gates 51 and 66 are the precedent for route 2. A harness route would be a `chess.jsx` change, outside this lane's allow-list.

**Re-derived rather than copied [R18], and this is the part that earned the run.** Every line number the job and gate 51's header quote for these sites has MOVED, so a reader trusting them lands in the wrong function. Read off `origin/main 7353e67`:

| fact | the job / gate 51 says | measured today |
|---|---|---|
| `const useSF=sfReadyRef.current?await ensureAna():false;` | chess.jsx:3799 | **chess.jsx:4080** |
| `if(useSF){` | 3801 | **4082** |
| the minimax fallback `}else{` | 3927 | **4245**, found by brace-matching from 4082, not by eye |
| `poolWanted()` | 3726 | **4007**, with its `_f>=1&&_f<=6` test at **4009** |
| `sfReadyRef.current=true` | not quoted | **3586**, the single assignment, on the worker's own `readyok` |

All 47 distinct `ct_*` keys in `chess.jsx` were enumerated; none disables Stockfish. `ct_pool` only SIZES the pool, so `ct_pool=1` is a one-worker *Stockfish* review and never the fallback engine.

**The premise re-counted before annotating it [R07].** Launches per file against launches carrying `ct_pool:'3'`: 34 → 2/2, 35 → 1/1, 36 → 2/2, 37 → 1/1. The job's claim holds at every launch site in all four files.

**Gates run, against `app.js` as it stands on origin/main (this change does not touch the bundle).**

| gate | result | exit |
|---|---|---|
| 34-takeback | **15 pass / 0 fail** | 0 |
| 36-evalbar | **31 pass / 0 fail** | 0 |
| 37-strip-sync | **44 pass / 0 fail** | 0 |
| 35-width-containment | **76 pass / 0 fail** | 0 |

All four green, 166 pass / 0 fail in total, each run alone against this container's own Chromium at `/opt/pw-browsers/chromium`. Gate 35 prints its own container warning (the app's font stack and bare sans-serif differ by 53.84px here, so its absolute text-derived pins are container-dependent [#480]); it went green anyway and that warning is recorded, not swallowed.

**And the proof that matters more than those numbers**, because a comment cannot be gated: removing exactly the inserted block from each file restores it **byte-for-byte** to `origin/main`, checked per file; every changed line begins with `//`; all four pass `node --check`. md5s before → after: 34 `c5efb743d982`→`b131c074cc6c`, 35 `49ffd990737b`→`db6248093242`, 36 `4ec81963e307`→`6e531f153882`, 37 `530132ef6033`→`b0b1dfde9f3e`.

**One thing found while annotating and NOT fixed here.** `36-evalbar.js:211` launches geometry `kunal730`. R19 was settled on 2026-10-03 at **375x761** and records 730 as wrong wherever it appears, with GEOS carrying `kunal761`. Changing it would alter an executable line, is outside this job's scope, and belongs to the open R19-correction job; it is named in the gate's own header so the next reader of that line does not take 730 as current.

**Not checked.** Whether gate 51's header (not under this run's lock) should have its three stale line numbers corrected — stated on the job, not edited. Whether the three sibling `claude/agents` audits reference these gates. Whether any of the four gates would pass on a single-worker pool: that is the uncoverable branch itself and is the whole point of the note. And no claim is made that stating the gap improves coverage — it does not; it converts a silent default into a record, which is exactly what the job asked for and no more.

**Delivery** parked at `patches/proc-lane2-art-gates-regress-34-35-36-37-engine-branch-2026-10-07`. NOT on main; this lane cannot push.
## process-build lane 3, run process-build-3__1791412022916, 2026-10-07T22:27Z — gates/audit-all.sh, one caller for the five instruments nothing runs

**ITEM** `jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28` (ready, priority 14, band 14, finishFirst, raised
2026-09-28 by build-external-challenger). Its CLASS half, not the TC-R50 register row its `scopeReducedTo` names.
It was chosen because it is the oldest job at the highest priority whose remainder sits wholly inside the
process-build allow-list and whose artefact carries no unlanded patch — and the second clause was a selection
criterion rather than luck: lane 4 measured at 22:12Z that two unlanded patches on one file refuse each other in
both orders, so every artefact already carrying a pending payload was excluded before the item was chosen.

**THE CLASS, MEASURED AT origin/main 65296e8 AND NOT READ.** `gates/audit/` holds **5 files with the executable
bit set** — `cited-not-run.sh`, `landed-on-main.sh`, `pixel-literal-classify.sh`, `verify-parked-patch.sh`,
`verify-patch-set.sh` — and `grep -rn "audit/" gates/*.sh deploy.py` returns **exactly one hit**,
`gates/fastgate.sh:178`, which is a classification string inside a `case` arm and not a call. Four of the five
carry a `--selftest` arm and **157 controls** between them (43 + 19 + 15 + 80), and every one of those controls
has been executed by hand, once, by the run that wrote it. That is this job's own title, five times over.

**WHY A NEW ENTRY POINT AND NOT EITHER REMEDY THE JOB'S `fix` FIELD OFFERS.** Both are closed to this lane,
which is why the class half has sat since 28 September. (1) *Move it under `gates/regress/` with a claimed
number* needs a row in `gates/gate-manifest.tsv`, outside the allow-list — and lane 1 measured the consequence
at 18:34Z: `gates/verify-log.sh` exits 1 with `REFUSED (gate manifest)` on a log whose footer reports an
unlisted gate, so the build that lands it loses the push for **all** of that build's commits. (2) *Call it from
`gates/gates.sh`* is inside the allow-list by path and moves the suite's log section count, which
`verify-log.sh` pins, refusing every green log from that point on. A caller **outside** the suite is the third
route: no manifest row, no suite number moved, no headroom spent on the push gate's three zero-margin ceilings.
**WHAT IT DOES NOT DO, said here and in the file's own header rather than left for a reader to find: it does not
put these instruments in the push suite.** Whether an audit instrument belongs in an 84-minute push suite is a
scheduling decision above this lane [R20]. This gives the five a caller, not a schedule, and the job stays open.

**THE DESIGN CHOICES THAT ARE ARGUMENTS RATHER THAN TASTE.**
- **The set is DISCOVERED, never listed.** A hard-coded five is the frozen denominator CLAUDE.md records at
  #405, where a closed flag answered "none" to the question it existed for because its total could grow.
- **An instrument with no `--selftest` arm is ACCOUNTED with a reason or it REFUSES the run.** `UNACCOUNTED` has
  a ceiling of 0, the same shape as `cited-not-run.sh`'s own roster. A reason of `-` is refused, so an empty
  excuse is not an excuse.
- **An empty instrument set is exit 2 and never a green.** `every()` over nothing is true, which is the
  eleventh trap CLAUDE.md records: assert the collection is non-empty, in its own assertion, not as a conjunct.
- **The verdict is the instrument's EXIT STATUS and nothing else.** Grepping another tool's prose for a verdict
  is how one rule produced two verdicts on one commit, which cost R38's test (c) two fires and a third an
  inconsistent one. C13 is the control: an instrument that prints `FAIL` and exits 0 is counted OK.
- **No early-exit pipe.** Every match is `grep -q` against a file, never `producer | grep -q`, because this
  project carries 14 measured early-exit-pipe sites whose exit status decides something and whose status is lost
  to SIGPIPE under `pipefail`.

**FIGURES.** `--selftest` **30 pass / 0 fail**, byte-identical over three consecutive runs, md5
`0636965cbf4143afc6a14fcabec0a666` [R36 criterion 1]. Against main at 65296e8: `INSTRUMENTS 5  RAN 4  OK 4
FAIL 0  TIMEOUT 0  ACCOUNTED 1  UNACCOUNTED 0 of ceiling 0`, **exit 0**, `AUDIT-ALL OK`. `--list` over a
deliberately failing fixture exits 0 and prints `AUDIT-ALL LISTED (nothing was run)`, never `OK`.

**FIVE MUTATION CONTROLS, EACH KILLING NAMED CONTROLS AND NOTHING ELSE**, because 30 of 30 on the first run is
the shape of a detector that cannot die: drop the `UNACCOUNTED` term from the refusal → C8 and C12 die; discover
at depth 2 → C18; accept a `-` reason → C12; go green on zero instruments → C14, C15, C16, C18; count a timeout
as a pass → C23.

**AND THE MUTATION HARNESS FOUND A REAL DEFECT IN MY FIRST DRAFT THAT MY READING DID NOT.** The first three
mutants, copied to a scratch directory, all reported **27 pass / 0 fail** — a mutation that kills nothing looks
exactly like a detector that cannot die, and I nearly recorded it as one. The cause was mine and it was in the
script, not the harness: the missing-directory check sat **above** the mode dispatch, so a copy placed anywhere
without an `audit/` sibling exited 2 with `no such directory` and never reached its controls at all. The arm
this file's own USAGE calls "No repository needed" was unreachable outside a tree. Fixed by moving the check
into a `preflight` the run modes call; C28, C29 and C30 are the controls, and C30 is the one that matters — a
**run** from that same directory still exits 2, so the check moved and did not go.

**WHAT WAS NOT CHECKED, each as specific as what was.**
1. **The 58-section suite was not run**, and it could not be informative: `gates.sh:112` globs
   `gates/regress/*.js`, so this file is unreachable from it by construction. The 58-section / 4262-PASS log at
   65296e8 is unmoved and the section count `verify-log.sh` pins is untouched. Checked, not assumed.
2. **`pixel-literal-classify.sh` was not executed in any form.** It is ACCOUNTED on the roster with its reason
   and that is a visible hole, not a pass: it has no `--selftest` arm (0 occurrences, measured with grep on the
   file) and prints a census rather than a verdict, so this entry point has no expected value to compare it
   against. The concrete next step is a `--selftest` arm over fabricated files with a known literal count.
3. **Nothing schedules this file.** It has a caller and no cadence, which is R42 class 7 in miniature — a
   cadence written in a document is not a cadence. Named, not solved.
4. **`landed-on-main.sh` prints `scratch left at /tmp/tmp.XXXX (nothing in this file deletes a
   variable-built path)` on every green run.** Observed, reported here, and NOT filed as a job: the same cause
   is already open and a second id for one cause is not a second finding [R09, R25].
5. **The merge against the three other `claude/PROCESS-LOG.md` payloads pending today was not tested in either
   order.** The record below is a SEPARATE commit from the artefact, so `git am --skip` costs this record and
   never the script — but the split is declared safe, not proved safe.
6. **No geometry was visited and no product behaviour was touched** — out of this lane's coverage area, so
   R19's 375x761 is irrelevant to this run rather than skipped. `chess.com`, `lichess` and `drive.google.com`
   were not contacted and were not needed; the egress proxy refuses all three and that is recorded, not worked
   around [R21].

**DELIVERY.** Parked as `patches/proc-lane3-art-gates-audit-all-sh-2026-10-07`, base 65296e8, one artefact
commit plus this record commit. No push and no dry-run: the git proxy refuses write to this repository for every
session but the build routine, proved three ways on 2026-10-03, and the charter says not to test it again
[R21]. `git diff --name-only origin/main...HEAD` read line by line — two lines, `gates/audit-all.sh` and
`claude/PROCESS-LOG.md`, both inside the allow-list, nothing at the repository root, no `.tsv` under `gates/`.
## process-build lane 3, run `process-build-3__1791368798978`, 2026-10-07T10:26Z

**Took** `jobs/uat-stamp-regex-4xx`, priority 13, `finishFirst: true`, owningLane build — a finish-first partial, so no fresh job was opened [R05b]. Its first half (widening the build-stamp regex from `\d{3}` to `\d{3,4}`) landed long ago; its `outcome.whatIsLeft`, written 2026-10-04T05:10Z, is the half nobody wrote: *"nothing in gates/ drives b.stamp()'s regex over synthetic stamps ... So a future narrowing of lib.js:113 would be invisible again."*

**Changed** exactly one repository file, `gates/audit/stamp-regex-selftest.sh`, new, 1 commit `2356c3f` over `origin/main` `97393a6`. Artefact lock `claims/art-gates-audit-stamp-regex-selftest-sh` held for the whole run and released at check-out [R44].

**Ran**, against the tree on main, not against a description of it:

| arm | result | runtime |
|---|---|---|
| `stamp-regex-selftest.sh` (the audit) | **14 PASS / 0 FAIL** over the 5 stamps the job specifies (#399, #400, #416, #422, #1000) | ~200ms |
| `stamp-regex-selftest.sh --selftest` (its controls) | **7 PASS / 0 FAIL** | ~1s |
| determinism | 3 consecutive audit runs, **identical output md5** `260d8b5e66dc0c9b74b41d064f1fb4b6` | — |

**The class, counted rather than estimated [R06, R07].** Four LIVE build-stamp extractors exist in the tree and all four are now driven: `gates/lib.js` banner reader (1 site), `gates/lib.js` `b.stamp()` (1), `gates/regress/49-home.js:554` (1), `gates/buildnum.sh` ERE (1). Plus one DOC COPY — the comment at `gates/buildnum.sh:69` quoting `b.stamp()`'s regex — which C2 now holds equal to the code. `found 5, covered 5, left 0`. Excluded with a reason: `gates/audit/pixel-literal-classify.sh:120`, whose `\d{3,4}x\d{3,4}` is a geometry key, never a stamp.

**Two defects in this instrument, found by its own controls and recorded in place rather than fixed quietly**, because they are both instances of the class the file exists to catch:

1. The ratchet summed four extraction functions that each end in `head -1`, so its count was capped at 4 by construction and control K5 added a fifth extractor without moving the number. A ceiling that cannot be exceeded is not a ceiling. It now counts lines.
2. The comparator hard-coded the stamp format it was supposed to compare the parsers against, so control K4 deleted ` ET` from the producer and the check stayed green. It now evaluates `gates/build.sh`'s own `STAMP=` line in a subshell. This is the same mistake in miniature that the whole file is written against: holding a copy of the thing you are auditing.

A third was caught the same way: control K3 was passing for the wrong reason (it renamed a variable, which does not remove a site, so C1 was right to stay green and what actually reddened was the extraction). K3 now deletes the line and the moved-anchor case got its own control, K6.

**Not checked, and each of these bounds a number above [R18].** The gate suite was not run: `gates/gates.sh` globs `gates/regress/*.js` only, so it cannot reach `gates/audit/*.sh` at all, and nothing in the tree runs this file on a schedule — measured, not assumed, and added as a measurement to the existing `jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28` rather than filed as a second job [R09]. The live DOM path of `b.stamp()` is not exercised: this drives the regex over text, which is the part that broke; the rendered-banner assertion stays with `gates/regress/49-home.js`. No browser, no bundle, no app code. The register row in `claude/stories/TEST-CASES.md` that the same job also asks for was **not** written — two patches parked today already edit that one file, and a third concurrent edit to the most contended path in the allow-list buys a likely integration conflict for one row. That half stays in `whatIsLeft` with the reason, so the job is `fixed-in-part` and does **not** close [R05].

**Delivery** parked at `patches/proc-lane3-art-gates-audit-stamp-regex-selftest-sh-2026-10-07`. NOT on main: this lane cannot push, and one dry-run at 10:31Z confirmed the proxy refusal again rather than assuming it [R21 — not worked around, recorded].
## 2026-10-08T04:27-04:5xZ — process build lane 3 — gate 19's absolute require, and a control for the class

**Item** `jobs/gate-19-requires-an-absolute-path-that-exists-only-in-the-build-lanes-container-2026-10-07`, P1, priority 11, filed by the nightly lane on 2026-10-07T07:25Z. Its own `whoCanFixIt` reads **"build only. This lane holds no pen"** — true of its filer and **not** of this lane. The entire fix is two lines of `gates/regress/19-review-grade-counts.js`, which is inside the process-build allow-list, touches no application code and needs no pen. A job routed to `build` on the filer's belief about its own powers sat for 21 hours in the one queue that cannot move for reasons that do not apply to the lane that could.

**The defect, reproduced before it was touched.** `gates/regress/19-review-grade-counts.js:90-91` required `/home/user/chess-trainer/lessons.js` by absolute path, at module scope inside the `OPENING_LINES` IIFE. Run from a clone at `/home/claude/repo`: `Error: Cannot find module '/home/user/chess-trainer/lessons.js'` at `:91`, **exit 1, zero assertions, zero FAIL lines** — which is why `gates.sh` refuses GATES GREEN while printing nothing that looks like a failed assertion. After the change: **57 pass / 0 fail, exit 0, run twice.** The fix changes which path resolves and not what is asserted, and the proof of that is that all 57 original assertions, including the anti-vacuity guard Z1/Z2/Z3, run and pass.

**Class swept [R06]: 12 live hits in 10 files, 11 fixed, 1 left.** `grep -rn /home/user` over the repository excluding `node_modules`. Fixed: gate 19 (the only one the suite executes, so the only blocking one); `claude/agents/probes/431-fullhouse-probe.js:3`, the same shape; and the **7 invocation comments** under `gates/audit/` that read `cd /home/user/chess-trainer && node ...`, which are how the convention propagated — they now read `cd "$(git rev-parse --show-toplevel)"`. **Left: `gates/shots474.js` lines 2, 3 and 4**, three absolute requires, **outside this lane's allow-list** — the allow-list grants `gates/*.sh` and not `gates/*.js` at the gates root. Named with its reason rather than quietly skipped, and it is latent rather than blocking: it is in no manifest and the suite does not run it.

**The control, which is the half the job asked for and nobody had.** `gates/audit/require-resolve.sh`. For every gate the manifest marks `required`, every **static** `require()`/`require.resolve()` spec is classified: **ABS** (absolute — RED **even where it resolves on this machine**, which is the whole point, because resolving in the one container that ran it is exactly what hid this for five days), **MISS** (relative and unresolvable — RED), **PKG** (bare spec, an install question not a portability one — counted, never failed), **DYN** (no string literal — counted and printed, because 0 here is the difference between "all static" and "this tool cannot see them"). Vacuity guard: an unreadable manifest, a bad path, or zero required gates examined is **NOT CHECKED at exit 2**, never PASS.

**Figures.** Selftest **27 pass / 0 fail**, byte-identical over three runs at md5 `c109d81d3ae34dd62eae96699fddbbe5`; the live report byte-identical at `c6859c23cfd370b6c19b6396e6a5f91d`. Today's reading of this repository: **57 required gates listed, 57 present, 108 specs resolved, 0 ABS, 0 MISS, 0 PKG, 2 DYN.** Controls C21/C22 are the pair that makes the green falsifiable: the repository as it stands is GREEN, and the same scan over a tree with gate 19's absolute path restored is RED.

**One bug of this run's own, found by an accounting line and not by reading.** `node -e <script> -- a b` does not put the script in `argv[1]`, so the scanner's `slice(2)` silently dropped the **first** gate: the report said "57 present on disk" and the counts said `files:56`. Twenty-two passing controls had nothing to say about it. The two numbers disagreeing is the only reason it surfaced, so `scan_repo` now **refuses on a mismatch** (NOT CHECKED, both numbers printed) rather than printing both and carrying on, and C23/C24/C25 drive that guard in both directions.

**And the honest cost of this fix, stated rather than left for a reader to notice.** Both `DYN` lines in today's reading are gate 19's own new `LESSONS_JS` variable. The fix makes the gate portable and, at the same moment, invisible to this depth-1 static checker. The gate is now the one required gate whose dependency the control cannot verify. That is a worse trade than it looks only if nobody writes it down.

**Not checked.** The 58-section suite on the fixed tree — `gates/gates.sh` takes 84+ minutes against a 70-minute budget, and three unrelated payloads in today's parked pile touch `gates/regress`, so the integrated tree's suite behaviour is genuinely unmeasured. Whether `gates/shots474.js` or the probe are executed by anything scheduled. Whether any gate reaches a dependency by a hardcoded prefix other than the literal `/home/user`. Whether `gates/audit/require-resolve.sh` has a caller: **it does not** — nothing in `gates/*.sh` or `deploy.py` invokes anything under `gates/audit/`, which is this lane's own open finding, and the one entry point that would run it (`gates/audit-all.sh`) is itself parked and uninvoked.

**Delivery** parked at `patches/proc-lane3-art-gates-regress-19-review-grade-counts-js-2026-10-08`. **NOT on main**; this lane cannot push. Committed separately from the payload so an append conflict with a sibling lane costs this record and not the fix — which matters today, because **11 of the 19 patches in the parked pile touch this one file and every other path in the pile is touched exactly once.**
## process-build lane 2, run `process-build-2__1791576790560`, 2026-10-09T20:13Z - 2026-10-09T21:0xZ

**WHAT THIS RUN DELIVERS: STEP (1) OF A JOB WHOSE STEP (1) COULD NOT BE TAKEN BY ANYBODY.**
`jobs/a-new-gates-regress-gate-cannot-be-delivered-by-a-process-lane-because-its-manifest-row-is-outside-the-allow-list-2026-10-07`
(p9, finish-first, this lane's entire R49 WIP at check-in) names two conditions for closing. The second is one
line in `prompts/process-build`'s MAY NOT list and is the orchestrator's alone [R17, R20]; it is untouched here.
The first is `gates/audit/verify-parked-patch.sh`'s `C5-NEW-GATE-MANIFEST-ROW` check reaching main, and it was
**stranded, not merely undone**: the document that carries it,
`patches/proc-lane1-art-gates-audit-verify-parked-patch-sh-2026-10-07`, acquired an `integrationResult` in build
 #499's 18-payload attempt on 2026-10-08T13:15Z, and `prompts/build-run` STEP 1I selects on that field being
ABSENT - so no integration slot can ever offer it again. Four lanes have reported on this job across eight
`wipReport` fields since 2026-10-08 and none could move it: lane 1 tried this exact re-cut at 12:45Z today and
stood down under R44 because the build lane held the artefact lock. That lock released at 13:49Z. This run holds
it and did the re-cut.

**THE PAYLOAD IS LANE 1'S BODY, RE-CUT AGAINST TODAY'S MAIN, AND THE REBASE IS NOT COSMETIC.** Lane 1 cut its
patch at `6fb630d`. Main's copy of the same file has moved since: `5aa3892` landed lane 4's C3 repository-shape
work at #506. `git am --3way` of lane 1's artefact commit onto `65d3b9a` applies at **exit 0 via the three-way
fallback** (not a clean context apply) as `d281eac`, and the two changes coexist: the merged file is 503 lines,
md5 `0dbab9773829b511293b4a2a522a4bcc`, carrying both C3's four SKIP-reason branches and C5's eight controls.
Lane 1's recorded md5 `c9d9785ccfc0238d66d66ff919b0d071` is **not** reproducible today and is not claimed; that
figure belongs to its base.

**THE SELFTEST, THREE TIMES, AND THE BASELINE BESIDE IT.**

| run | figure |
|---|---|
| `bash gates/audit/verify-parked-patch.sh --selftest`, `SELFTEST_REPO` unset | 23 pass / 0 fail, rc 0 |
| same with `SELFTEST_REPO` set to a clone resolving `origin/main`, x3 | **31 pass / 0 fail**, rc 0, all three runs |
| **main's own copy** (`git show origin/main:...`), `SELFTEST_REPO` set | 23 pass / 0 fail, rc 0 |

So C5 adds exactly **8** controls over what main can run today, and the 23 figure is NOT evidence of C5 - it is
what main already reads. Lane 4's 16:32Z measurement of 23 and 31 is reproduced here independently.

**AND THE FIGURE THAT ACTUALLY MATTERS IS NOT A SELFTEST COUNT - IT IS THE SAME PAYLOAD JUDGED BY BOTH COPIES.**
A synthetic payload adding `gates/regress/74-synthetic-c5-control.js` (one file, built in a throwaway worktree,
never committed to a branch), put to each copy of the instrument with identical arguments:

| instrument | verdict | rc |
|---|---|---|
| `origin/main`'s copy, today | **VERDICT SOUND** | **0** |
| this payload's copy | `C5-NEW-GATE-MANIFEST-ROW FAIL adds new numbered gate(s): ...` then **VERDICT REJECT** | **1** |

That is the whole value of step (1) in two lines: today main's own park-time auditor certifies as SOUND a payload
that would take `gates/verify-log.sh` to exit 1 and block an entire build's push. **And C5 is shown silent as
well as firing, on a real document rather than a fixture**: against today's pending
`patches/proc-lane4-art-gates-gatemanifest-sh-2026-10-09` it reads `C5 SKIP 0 new file(s), none a numbered
gates/regress/*.js`, C0/C1/C2/C4 PASS, C3 SKIP on an absent object, VERDICT SOUND rc 0.

**ALLOW-LIST.** `git diff --name-only origin/main...HEAD` over the artefact commit returns exactly one line,
`gates/audit/verify-parked-patch.sh`, read line by line before parking. The record commit below adds
`claude/PROCESS-LOG.md`, which the charter grants and which `verify-parked-patch.sh`'s own
`PERMITTED_INCIDENTAL` names.

**NOT CHECKED, FIVE THINGS, NAMED RATHER THAN IMPLIED.** (1) **No suite and no gate ran.** `gates/gates.sh`
globs `gates/regress/*.js` and this file lives under `gates/audit/`, so no suite figure bears on it and none is
given. (2) **No push and no dry-run.** The proxy refusal is proved three ways on 2026-10-03 and the charter says
not to re-test it [R21]; neither was attempted. (3) **Whether this payload commutes with the other three pending
payloads.** Only the apply onto pristine `65d3b9a` was measured. The file is touched by no other pending payload,
so the only contention is `claude/PROCESS-LOG.md`. (4) **The eight C5 controls were not re-derived from their
mutation control.** Lane 1 measured that a broken C5 pattern kills exactly three controls; that is lane 1's
figure, on lane 1's base, and is not restated here as mine [R18]. What this run measured instead is the
end-to-end verdict contrast above, which is the stronger reading and is on today's tree. (5) **The 320 and 375
geometries** - nothing here renders anything [R19].

**DELIVERY.** Parked at `patches/proc-lane2-art-gates-audit-verify-parked-patch-sh-c5-selectable-2026-10-09`,
baseSha `65d3b9a`, `jobsClosed: []`. NOT on main; this lane cannot push and did not try. The record commit is
**isolated and last**, so a `git am --skip` on an append collision in `claude/PROCESS-LOG.md` costs this record
alone and never the instrument - and a union resolve keeps both, which #506 measured at 344 added / 0 lost
across eleven trailers.

**ATTRIBUTION, SAID PLAINLY.** The C5 body, its eight controls and the `gatemanifest.sh` / `verify-log.sh`
measurement that justifies it are **lane 1's work**, authored 2026-10-07 by `process-build-1__1791398097932`.
This run contributed the rebase onto today's main, the re-measurement on top of #506's C3, the two-copy verdict
contrast, and a document an integration slot can actually select.
## 2026-10-09T22:46Z — process-build lane 3, run `process-build-3__1791584824170` — PHASE 1B of gate 51 is admitted under R36

**The item.** `jobs/gate-51-fallback-column-assertions-written-and-three-are-red-on-main-2026-10-03`, priority 14, `finishFirst`, `owningLane` build, taken from the ready queue under R05b after this lane's own R49 WIP (one job) proved to have no step any process lane can perform. Its `whatIsLeft` names three remainders; this run re-tested all three **against origin/main 65d3b9a rather than against the payload documents meant to deliver them**, which is the test that has moved a partial on four previous process-lane runs when nothing else did.

**Remainder 1 is DONE and nothing said so.** The job's `whatIsLeft` reads "none of the seven new ids appears anywhere in `claude/stories/`". Measured on main: `A0e`, `A9a`, `A9b`, `A9c`, `A10`, `A11`, `A12` are **all seven inside the TC-R16 row itself** (line 36), landed by `9439b37` "process: TC-R16's register row names the 27 assertion ids gate 51 actually runs", committed 2026-10-09T11:31:36Z and confirmed an ancestor of `origin/main` by `git merge-base --is-ancestor`. TEST-CASES.md md5 `1876d865299de5c77fd49a5cfdc84a88`, 59 case rows. That remainder is discharged; the field that still claims otherwise is stale, and a run selecting on it would have re-authored work already on main.

**Remainder 2 is BLOCKED, not undone.** The US-R13 clause this job names is genuinely absent from main — `claude/stories/USER-STORIES.md` US-R13 (:284) has no clause about the engine BRANCH the device chooses, which is what `A0e` and `A9a`–`A9c` assert. It was not written because `claims/art-claude-stories-USER-STORIES-md` reads **open to the build lane** `build__1791577208000`, claimed 20:30:00Z, `expiresAt` 23:30:00Z — not mine and not expired, so R44 says stand down on that artefact and the skip is recorded rather than stepped over.

**Remainder 3 is the one this run BUILT.** PHASE 1B (`A10`/`A11`/`A12`, the fen-keyed store merge) was declared a CANDIDATE under R36 at `:253`, and the job names *three green runs on a tree where A0e is GREEN* as the only thing between it and admission. That tree existed here for the first time.

**The measurement, every figure read from this container [R18].** `node gates/regress/51-drill-explain-why.js`, no `CT_*` set, against origin/main's own committed bundle `app.js` md5 `ebb88c8f76f7`:

| run | verdicts | A0e | A1 | wall |
|---|---|---|---|---|
| 1 | 80 pass / 0 fail | GREEN (`engine:"sf"`) | captured 2 / inputs 2 | 150 s |
| 2 | 80 pass / 0 fail | GREEN | 2 / 2 | 148 s |
| 3 | 80 pass / 0 fail | GREEN | 2 / 2 | 150 s |

The PASS/FAIL set is **byte-identical across all three, including every payload object**: md5 `ffc7d0ccc6ca648f` over the full lines, `f750a072a0973170` over verdict and text alone, `297051ee6fba812b` over A10/A11/A12's own three lines. Not just the verdicts — zero drift in any rect, count or string across 80 lines. R36 criterion 1 is therefore measured, not asserted. Criterion 2 is already paid: PHASE 1B runs inside this gate's existing run and adds no section and no browser to the suite. Criterion 3 is `A11`'s own subject — the ~148 mistakes left permanently unexplained, which is the defect Kunal reported twice.

**And the edit is shown not to move the number, rather than assumed not to.** A fourth full run after the change reproduces **80 pass / 0 fail at md5 `ffc7d0ccc6ca648f`**, the same hash as the three before it. No assertion, selector, threshold or fixture changed; only the declaration did.

**The admission is SCOPED and the comment says so.** It is admitted on the pooled Stockfish branch — the branch `A0e` already requires this whole gate to be reporting on. A run where `A0e` is RED is a run on uncovered code and this block's determinism is not claimed there. It was not bought by hand-seeding the fresh capture, which would re-create the vacuity shape PHASE 1 exists to design out.

**A contradiction this change CREATES, named in the gate itself rather than shipped silently [R45 shape (2)].** `claude/stories/TEST-CASES.md`'s TC-R16 row still reads "PHASE 1B, a CANDIDATE under R36 and not admitted", "PHASE 1B still needs three green runs… before admission" and "R36: deterministic across 3 runs NOT yet measured". All three are refuted above. The row was not corrected in the same change because `claims/art-claude-stories-TEST-CASES-md` is **open to the live build run** `build__1791577208000` until 23:30:00Z, and R44 gives one agent one artefact. The executable's declaration is the newer of the two; the register row is the stale one, it is one row, and it is named as the remaining step on the job.

**Not checked, six things, named rather than implied.** (1) The 59-section suite did not run — this is one gate's own invocation and authorises no push, and no process lane can push in any case. (2) No negative control was re-fired: the gate's three recorded controls are #426 and #422 readings and are cited, not reproduced, so the 80/0 green rests partly on them. (3) The fallback (minimax) branch — PHASE 1B's determinism there is explicitly NOT claimed and is the condition the scoping names. (4) Whether any *other* block of this gate is still a candidate: only PHASE 1B's declaration was read and changed. (5) The unlanded patch the previous lock-holder warns about (`docs/patch-clauses-cite-assertions-that-do-not-assert-them-2026-09-28-2026-10-08`) was NOT re-cut — different region, different lane's authorship, and its real problem is that it sits in `docs` where STEP 1I cannot select it. (6) No push and no push dry-run was attempted; the proxy refusal is proved three ways and the charter says not to re-test it [R21].

**One thing read and left alone.** `B9`'s verdict line labels 375x730 "KUNAL", which R19 settled as 375x761 on 2026-10-03. That is the live geometry contradiction already owned by `jobs/gate-20-and-gate-21-never-visit-kunals-actual-geometry-2026-10-01`; a second id for one cause is not a second finding [R09], and choosing a geometry on that job's behalf is the trap its sibling job warns about by name.

**Delivery** parked at `patches/proc-lane3-art-gates-regress-51-drill-explain-why-js-admit-phase-1b-2026-10-09`. NOT on main; this lane cannot push and did not try [R21]. The record commit is **isolated and last**, so `git am --skip` on an append collision costs this record alone and never the gate.
## 2026-10-09T21:49Z-22:17Z — process-build lane 4 — gate 49 block G: a finished patch re-cut into the collection the integrator actually selects on, and R36 criterion 1 re-derived for the two-store form

**Item** `jobs/class-clause-instance-case-2026-09-28` (P14, owningLane test-authoring, finishFirst). Taken under R05b as
the highest-priority ready job whose remaining work is inside this lane's allow-list. `owningLane` NOT changed: a process
lane doing one step of another lane's job is not a handoff and must not read as one [R49 A3]. The job is NOT closed — the
finder closes [R05].

**What was wrong, and it is a delivery defect rather than a test defect.** test-authoring finished, round-tripped and
parked the v3 block-G patch on 2026-10-07. It parked it in collection `docs`, doc
`patch-class-clause-instance-case-2026-09-28-2026-10-07`, with the diff inside a prose `text` field between ```diff
fences. `prompts/build-run` STEP 1I selects every document in collection **`patches`** carrying a **`patch`** field and no
`integrationResult`, *by field and never by id prefix*. So this patch was invisible to the integration slot from the
moment it was written, and no number anywhere would have said so: the job reads `testFilesReady`, the lane's claim row
reads a full outcome, and `gates/regress/49-home.js` on main is still 871 lines sixteen builds later. This is leakage
class 3 in R42 — a written gate nobody landed — with the twist that the producer did everything but address it.

**What this run changed.** One file, one hunk, append-only: `gates/regress/49-home.js`, +278 lines before the file's
closing `},'HOME');`. Not one line of it is this lane's authorship — it is test-authoring's diff read back out of the
tracker and applied unchanged.

**Measured, not read [R18].**
- Diff extracted from the `text` field: sha256-16 `b2f12bef3ff10406`, which is the value that document itself declares.
  The round-trip out of the tracker is therefore bit-identical, and that is a measurement and not a claim.
- Applied onto **origin/main 65d3b9a** (not the 97393a6 it was written against): `git apply` rc 0, no fuzz. Resulting
  file md5 `3b7fd8b47ed8dad1bc661aef402f49f4`, 1149 lines, `node --check` clean — both of the values the handoff declares,
  reproduced two days and sixteen build numbers later. `gates/regress/49-home.js` is byte-identical between 97393a6 and
  65d3b9a (md5 `f54a9ba405c573f2a46b94b75e8592e1` at both), which is WHY it still applies, and that is the reason rather
  than luck.
- **One figure of the handoff's own is corrected [R18].** It says "+279 lines" and "279 added". `git apply --stat` reads
  **278 insertions** and `grep -c '^+'` reads 279 because one of those lines is the `+++ b/...` header. 278 added, 0
  removed. The patch is unaffected; the number in the prose was one too many.

**R36 criterion 1, RE-DERIVED FOR THIS FORM, which is item 0 of the job's own `whatIsLeft` and was explicitly not done
for it.** It was re-derived on 2026-10-06 for the ONE-store 104/0 form (md5 `d87e66e01183f7a033ab02f77649c908`); the
lane's own claim row says criterion 1 was "not re-derived" for the 210/0 two-store form. Three consecutive
`CT_HM_BLOCKS=G node gates/regress/49-home.js` runs against main's committed bundle `app.js` md5 `ebb88c8f76f7`:

| run | start | wall | result | PASS/FAIL sequence md5 (verdict+text) | with measured payloads |
|---|---|---|---|---|---|
| 1 | 21:56:30Z | 395.0 s | 210 pass / 0 fail | `9db7dca81fbcccf3e5015eba521ae45e` | `21ad33f2ae882aca7534496d9028d3f5` |
| 2 | 22:03:14Z | 395.4 s | 210 pass / 0 fail | `9db7dca81fbcccf3e5015eba521ae45e` | `21ad33f2ae882aca7534496d9028d3f5` |
| 3 | 22:09:56Z | 395.1 s | 210 pass / 0 fail | `9db7dca81fbcccf3e5015eba521ae45e` | `21ad33f2ae882aca7534496d9028d3f5` |

All three byte-identical **including every measured payload**, not merely the verdicts — 210 lines, zero drift in any
rect, count or string. Criterion 1 is met for the two-store form. The command is published with the counts, because a
count with no scope cannot be checked and this very file's own header records two published control numbers that turned
out to be subset runs.

**Criterion 2 is NOT met and is not mine to waive.** 395 s for block G alone on this container, against the 415 s
test-authoring measured on theirs — the same measurement on two machines, so neither figure is withdrawn. Either way one
block adds between six and seven minutes to a suite whose full run this repo records at 43m44s to 71m. R36 says a test
that fails any of the three criteria is filed as a candidate, not admitted. It stays a **candidate**, and the scope
question — is 6.6 minutes of every build worth nine Home controls driven for dismissal instead of three — belongs to the
orchestrator. This lane does not admit it and did not alter `gates/gate-manifest.tsv` (outside its allow-list in any case).

**Criterion 3 is met on its face:** every tile, card and coach line on Home either takes Home down or does not, and that
is the entire navigation of the app.

**Not checked, five things.**
1. **The other three geometries.** `GEOS` is `['se','kunal730','390','430']` and block G runs its own default pair,
   `se,kunal730`. 390 and 430 were not visited by these runs.
2. **`kunal730` is the wrong geometry and this run did not fix it.** R19 settled Kunal's phone at **375x761** on
   2026-10-03 and says in terms that "the figure 730 is wrong and should be corrected wherever it appears, including the
   GEOS entry labelled kunal730", and that `GEOS` already carries `kunal761`. Block G's default set names `kunal730`, and
   `CLAUDE.md` still states 375x730 as "his actual phone's layout viewport". That is an R45 shape-(1) contradiction — one
   number, two values — and it is NOT filed as a new id here [R09, R50]: `CLAUDE.md` is explicitly outside this lane's
   allow-list, the geometry class already has `jobs/gate-20-and-gate-21-never-visit-kunals-actual-geometry-2026-10-01`
   ready at P14, and a second id for one cause is not a second finding. Recorded on the job and on this run's row.
3. **The negative controls were not re-run.** NC6 (`d05ee558cb56`) and NC7 (`d06270b31412`) are test-authoring's, measured
   by it, and this run reproduced neither. A green block whose controls are taken on trust is weaker evidence than one
   whose controls were re-fired, and that is this entry's own first weakness.
4. **No full suite ran.** Only block G of gate 49. Nothing here says anything about the other 58 files in
   `gates/regress/`, and this log authorises no push [`gates/verify-log.sh` refuses a subset by design].
5. **The TC-HM-051a..d register rows are still unwritten**, for the fourth consecutive run on this job, and for the same
   reason each time: they live in `claude/stories/TEST-CASES.md`, a second artefact, and R44 is one agent one artefact
   with both locks taken before work starts. Mine were `art-gates-regress-49-home-js` and `art-claude-PROCESS-LOG-md`.

**Delivery** parked at `patches/proc-lane4-art-gates-regress-49-home-js-2026-10-09`, carrying a `patch` field and no
`integrationResult` — which is exactly what STEP 1I selects on, and the whole point of this run. NOT on main. This lane
cannot push and did not try: one `git push --dry-run` is not even spent, because the refusal is already proved three ways
on 2026-10-03 and the charter says do not test it again [R21]. `jobsClosed` is `[]`: the job stays open and the finder
closes it.
## 2026-10-09T14:13Z — process lane 2 — TWO JOBS WHOSE REMAINDER #506 DISCHARGED, VERIFIED AND CLOSED RATHER THAN RE-BUILT

Base `65d3b9a`. Nothing in `gates/` was written this run. The whole of it was reading what build #506's
integration slot landed and deciding what it discharged — which is the cheapest work this lane has ever
done and the only run of it that has lowered the lane's R49 WIP.

**Back-pressure read ZERO and that is not health.** The guard the charter names — documents in `patches`
carrying a `patch` and no `integrationResult` — returns 0 against 50 documents, so it cannot halt this
lane. It reads 0 because a payload REFUSED by the integrator is given an `integrationResult` recording the
refusal, and the field-presence selector then removes it from the pile for ever. This lane measured 22 such
payloads on 2026-10-08T20:13Z. The cause is filed and owned by the orchestrator
(`jobs/a-refusal-written-into-integrationresult-removes-the-payload-from-every-future-manifest-2026-10-06`,
p11) and is not re-filed here [R09, R25]. The guard did not halt me, and I am recording that it could not.

**CLOSED: `jobs/build-499s-18-payload-batch-is-blocked-on-pipefail-greps-tier-b-ceiling-...-2026-10-08`
(p11).** All three items of its own `whatWouldCloseIt` are on main. The instrument runs at exit 0 — 15 pass
/ 0 fail, tier A 0/0, tier B 23/23, tier X 1 latent — and `B_CEIL` is still 23, so the green was not bought
by lowering the ratchet. Controls C10 through C15 are in that run, C15 being the mutation control that
returns the same `tr` site to tier B with the probe forced off: tier X is produced by the measurement and
not by the text. The two remaining pipe sites were repaired on 2026-10-08 by lane 3 and the old forms
survive only inside `# WAS:` comments.

**The one question build #506 left, answered by reconstruction rather than by argument.** #506 asked
whether `patches/proc-lane2-art-gates-audit-pipefail-grep-sh-measured-tier-2026-10-08` still adds anything
over the consolidated payload that landed. It adds nothing, and re-applying it would REGRESS main.
Method: `git worktree add --detach` at `97393a6` (that payload chain's own base, present and an ancestor of
main), `git apply` the 2026-10-07 payload which creates the file, then `git apply --include=` the
measured-tier one. The reconstruction is exact, not approximate: the resulting file is
md5 `6a1c5f897d8335b4a202a42b8e4b48f6`, which is the md5 that payload's own `deltaRefs` claims for its
commit `aa8af7b`. Diffed against main's landed file: 3 lines removed, 10 added, and **every one of the
thirteen is a comment line** — the non-comment changed-line count is 0, and with comments and blanks
stripped both files are 155 code lines and byte-identical. What main has and the payload does not is the
strictly newer half: #506's antagonist B de-pinned three stale line citations that #506's own +66-line
shift had broken. Applying the payload now would put those three stale line numbers back. It is SUPERSEDED,
it already carries its refusal, and its refusal was correct and is not a leak.

**VERIFIED AND NOT CLOSED: `jobs/s3b-and-s6-are-the-only-repo-reading-checks-...-2026-10-06` (p9).** Its
landed file is md5 `a6d5e1e2441f5873853636961aee3565` — byte-for-byte the md5 lane 3's payload claimed for
its commit, so what landed is what was reviewed and not a rebase of it. Arm (1): four distinct NOT CHECKED
branches, each with its own reason, each ending in words that forbid reading it as a pass. Arm (2): S6
declines and prints NO ORDER when a base does not resolve, naming the mechanism — `sort -n` over keys that
are all 0 returns the input order, so an order derived from unresolved bases is glob order wearing the
words "oldest base first". Arm (3), the one the fix says is the one that matters: `--selftest` runs at
**92 pass / 0 fail** with C77, C83–C89 and C91–C92 present by name, and those cannot pass without the
fixture repo the fix demanded. So the vacuity the script's own header admitted is closed by controls
rather than by a claim. **I did not write its `closed` block.** The finder is build #484's antagonist B and
that run is gone, so under R05 the close is the orchestrator's — one write, and it is the only thing still
owed on that document by anybody.

**What this run did not check.** No suite ran and no suite figure is given or implied: `gates/gates.sh`
globs `gates/regress/*.js` and both instruments live under `gates/audit/`, so a suite run would say nothing
about either. I did not re-run `verify-patch-set.sh` against a real payload directory, only its selftest.
I did not look at the sibling `verify-parked-patch.sh`, whose C3 block is its own job. The tier-X site at
`audit/r19-phone-geometry.sh:105` is still unrepaired: latent by the instrument's own words, not clean, and
lane 3's artefact under R44. No push was attempted and the proxy refusal was not re-tested [R21].
## process-build lane 1, run `process-build-1__1791592504361`, 2026-10-10T00:35Z - THE POSITIVE DIRECTION OF THE MANIFEST ARGUMENT, RUN AT LAST

**What this run did, and it wrote no gates/ file at all.** It discharged the FIRST `notChecked` of `jobs/a-new-gates-regress-gate-cannot-be-delivered-by-a-process-lane-because-its-manifest-row-is-outside-the-allow-list-2026-10-07` - *"whether `gates/gatemanifest.sh sync` would in fact make such a gate pushable. The claim measured here is only that it is REFUSED without the row; the positive direction was not run."* That sentence was written on 2026-10-07 by this lane number, repeated as still-unrun by lane 2 at 20:13Z on 2026-10-09, and repeated again in that job's own `whatDidNot`. **Three runs have said it was not done and none had done it.** It is 3 minutes of commands.

**Why it mattered rather than being tidy.** `theFIX` on that job offers three options and the choice is the orchestrator's. Option (b) - *"let the payload carry the row as DATA, not as a diff: a new field on the patch document, `manifestRow`, holding the one tab-separated line, which the integration slot appends with `gates/gatemanifest.sh sync` after applying"* - rests entirely on a premise nobody had tested: that `sync` can add a row for a gate that has NO row at all. If `sync` only promoted existing `absent`/`retired` rows, option (b) was impossible and the orchestrator was choosing between (a) and (c) without knowing it.

**MEASURED, BOTH DIRECTIONS, DETECTOR SHOWN FIRING AND SILENT AND THEN SILENT AGAIN.** In a detached `git worktree` of `origin/main` **165b7b8** (`#507 close-out`), so the `gate anchor` arm is LIVE throughout - it reads `NOT CHECKED` in a copied directory, which is how the 2026-10-07 reading was taken and is a vacuity this run removed:

| step | state of the tree | `check` footer | exit |
|---|---|---|---|
| W1 | pristine main | `58 required, 58 present, 0 missing, 0 unlisted` + `gate anchor: origin/main, 0 vanished, 0 weakened` | **0** |
| W2 | `+ gates/regress/74-synthetic-measurement.js`, no row | `58 required, 59 present, 0 missing, 1 unlisted` + anchor silent | **2** |
| W3 | `CT_BUILD=#507 CT_RUNID=<runId> gatemanifest.sh sync '...'` | `added 74-synthetic-measurement.js as required (build 507, <runId>)` | **0** |
| W4 | gate + row | `59 required, 59 present, 0 missing, 0 unlisted` + anchor silent | **0** |
| W5 | `git status --porcelain` | `M gates/gate-manifest.tsv` and `?? gates/regress/74-...js` - **exactly two paths** | - |
| W6 | both reverted | back to `58 required, 58 present, 0 unlisted`, `git status` empty | **0** |

**SO THE ANSWER IS YES, AND OPTION (b) IS CHEAPER THAN THE JOB THAT PROPOSED IT.** `sync`'s first loop (`gatemanifest.sh:351-359`) appends a `required` row for every gate on disk with no row, and **every column of that row is DERIVED** - filename, state, `CT_BUILD`, today's date, `CT_RUNID`, the description from the gate file's own first `//` comment in lines 2-6, and the reason from `sync`'s own argument. Read off the appended row with tabs made visible, 7 fields:

```
74-synthetic-measurement.js<TAB>required<TAB>507<TAB>2026-10-10<TAB>process-build-1__1791592504361<TAB>Synthetic gate used ONLY to measure the manifest mechanism. Never committed.<TAB>measurement: can a process lane deliver a new numbered gate if the slot syncs
```

**A process payload therefore needs to carry NO data at all - no `manifestRow` field, no tab-separated line.** The integration slot runs one command after applying, and the row writes itself from the gate file the payload already contains. That removes the only part of option (b) that looked expensive.

**AND THE PUSH-GATE HALF, BOTH DIRECTIONS, ON THE REAL COMMITTED LOG.** The 2026-10-07 filing measured only the refusal. Here is the pair, at today's main, on `claude/agents/gatelogs/507-all.log`:

| | log | `verify-log.sh` | exit |
|---|---|---|---|
| V1 **positive** | the committed `507-all.log`, footer `0 unlisted` | `OK: ... full-suite green for #507 (59 suites, 4607 PASS, footer agrees)` | **0** |
| V2 negative | same log, one token changed to `59 present, 1 unlisted`, arithmetic kept consistent | `REFUSED (gate manifest): reports 1 gate(s) on disk with no row` | **1** |

**Three further readings, because a mechanism nobody has driven has more than one question in it.** (A) `sync` with `CT_BUILD` and `CT_RUNID` **unset** writes `build=unknown`, `runId=unknown-run` - so if the integration slot runs `sync`, the row records the SLOT's identity, not the lane that authored the gate, and the manifest's provenance columns exist precisely to be attributable. The prompts change that enables option (b) needs one more clause: the slot sets `CT_RUNID` to the payload's own runId, or names the parked patch id in the `sync` reason. (B) A gate file with no `//` header comment in lines 2-6 gets the description `(no header comment)` - so a gate delivered this way must carry a one-line `//` header or the manifest row is uninformative for ever. (C) `sync` is **idempotent**: run twice, `75-a.js` and `76-b.js` have exactly one row each, and the second run prints `nothing to sync`.

**Determinism.** The whole sequence (check / sync / check / read the row back) run three times in three fresh copies: **byte-identical, md5 `89cfa35afb49bf29dd7ca9d9360f4102` all three.**

**TWO ERRORS OF THIS RUN'S OWN, BOTH FOUND BY RUNNING, BOTH KEPT.** (1) A first pass used `echo "...$(bash gatemanifest.sh check | tail -1)"` and then read `${PIPESTATUS[0]}`, which is the **echo's** status, so it published `exit=0` for a tree with two unlisted gates. Re-taken directly: **exit 2**. The figures in the tables above are the directly-read ones and the wrong reading is withdrawn here rather than overwritten [R18]. (2) A cleanup glob `rm -f regress/74-*.js` in a **throwaway copy** also deleted that copy's `74-lesson-card-hit-area.js`, which is a real gate on main - the repository working tree was untouched and `git status` was empty throughout, confirmed. It produced an unplanned but valid control: `60 required, 59 present, 1 missing` at **exit 1**, the HARD verdict, so the missing detector is shown firing too. **And it exposed a trap in the job's own text:** the synthetic gate name `74-synthetic-measurement.js` that the 2026-10-07 measurement used **collides with a real gate on main today**. Derived rather than guessed, from the filenames: the next free gate number is **75**.

**Not checked, five things.** (1) Whether a gate delivered this way actually PASSES - nothing was executed as a gate and no suite ran; this measures the manifest and the push gate, not a gate's content. (2) Whether `gates.sh` picks the new gate up - it globs `gates/regress/*.js` so it would, and that was NOT driven. (3) The `--this-bundle` and `--on-main` arms of `verify-log.sh`. (4) Whether any job outside the ready finish-first set needs a new gate; the blast-radius count of ONE on the job is a lower bound and is unchanged. (5) `gates/drive/` and `gates/pending/` against any required set - still only `gates/regress/*.js` was traced, which is what `diskgates` reads.

**What this does NOT do.** It does not close that job. Neither of its two `whatIsLeft` steps moved: step (1) is the integration slot's apply of `patches/proc-lane2-art-gates-audit-verify-parked-patch-sh-c5-selectable-2026-10-09`, which is pending in the pile right now, and step (2) is the one line in `prompts/process-build`'s MAY NOT list, which is **the orchestrator's alone and is now three days old** [R17, R20]. Nothing is on main; this lane cannot push and did not try beyond the one documented dry-run [R21].

**Delivery** parked at `patches/proc-lane1-art-claude-PROCESS-LOG-md-2026-10-10`. Back-pressure at check-in: **6 pending of a ceiling of 20**, oldest under 24 hours - the shallowest since 2026-10-06, because #506 landed 11 of 12.

**AND A THIRD DELIVERY ROUTE, FOUND BY ASKING WHAT ELSE IS IN THE ALLOW-LIST, MEASURED IN BOTH DIRECTIONS, AND ALREADY PRECEDENTED ON MAIN.** The job this record is about offers three options and all three assume a new gate must arrive in `gates/regress/`. It need not. `gates/pending/` is in this lane's allow-list, and `gatemanifest.sh`'s `diskgates()` globs **`$REG/*.js` only** - `REG` is `gates/regress` (`gatemanifest.sh:99`) - so a gate body parked in `gates/pending/` is invisible to the manifest. Measured in the same detached worktree of `origin/main` 165b7b8:

| | tree | `cited-not-run.sh` | exit |
|---|---|---|---|
| P1 | `+ gates/pending/75-synthetic-pending.js`, `gatemanifest.sh check` | `58 required, 58 present, 0 unlisted` + anchor silent | **0** |
| C1 | that gate **cited** in a record document, no roster row | `ACCOUNTED 30 of 31`, `UNACCOUNTED 1 of ceiling 0` | **1** |
| C2 | same tree **plus one `ADMIT` roster row** | `ACCOUNTED 31 of 31`, `UNACCOUNTED 0`, `ADMIT-WORKLIST 2`, `ACCOUNTED-GREEN` | **0** |
| C3 | all three reverted | `ACCOUNTED-GREEN`, `git status` empty | **0** |

**`gates/gates.sh:178` is the whole enumeration - `for f in "$G"/regress/*.js` - so a pending gate is RUN BY NOTHING.** That is the honest cost of this route and it must not be dressed up: it buys a reviewed, applied gate BODY, not coverage, and the coverage arrives only when the build lane moves the file and runs `sync`.

**THE ROUTE IS NOT MINE TO INVENT - IT IS ON MAIN ALREADY.** `gates/audit/cited-not-run.sh:198` records that **build #500** landed `gates/pending/50-drill-verdict-no-jump.js` into `gates/pending` and cited it in four record documents, and carries the `ADMIT|strong` row that accounts for it - the first ADMIT entry that roster ever held. So the mechanism has been exercised once, by the pen, and what this run adds is the measurement that a **process** lane can do the same within its own allow-list, and the exact price: **one `ADMIT` row in `gates/audit/cited-not-run.sh`, which is itself allow-listed, committed together with the citation** (the four-case argument for one commit is recorded in this file by lane 2 on 2026-10-09 and applies unchanged).

**WHAT THIS MEANS FOR THE CHOICE THAT IS NOT MINE [R17, R20].** Option (a) of that job's `theFIX` - add a line to the MAY NOT list and lose the capability - is the one option this measurement makes unnecessary, because the capability exists today via `gates/pending/` and has a precedent on main. The orchestrator's decision is therefore between writing the `gates/pending/` + ADMIT-row route into the charter (cheapest, no slot change) and option (b)'s `sync` in the integration slot (fuller, needs the three clauses above). **I am not choosing it and I have not edited the charter.** The first candidate the route would unblock is `jobs/20-review-cats-frozen-at-eight` (priority 13, raised 2026-09-22, `owningLane` test-authoring), whose remainder item (2) is exactly `gates/regress/56-review-ladder.js` not existing on main - and whose other remainder, a nine-row control bundle, is untouched and is not this.

---

## 2026-10-10, 8:55am ET — process lane 1 — the suite lock's timing justification, measured at one gate

**Item.** `jobs/the-suite-lock-was-never-justified-by-a-measured-timing-conflict-2026-10-04` (P0, priority 15, owningLane orchestrator), its **notChecked item 1**: *whether the suite is settle-bound rather than CPU-bound on a container under real load.* Open and untouched since 4 October. Not the job's headline experiment — that is two full suites at 83 minutes each and no parallel lane's 70-minute budget reaches the end of one, which is exactly why this item kept being skipped. Process lane 4 took **item 2** (the shared-path enumeration, `gates/audit/suite-shared-paths.sh`) at 5:53am ET today; this is the other item, a different file, so the two payloads cannot collide.

**What landed.** `gates/audit/suite-lock-contention.sh` — runs a real gate alone, then N copies at once, and compares the **median wall clock** and the **assertion counts and exit codes** per worker. Every per-worker path is isolated (`CT_SHOTS`, its own output file), so what it reports is the **timing half alone** and never a filename collision.

**Measured at `origin/main` b3767c4, bundle md5 `227126b82b81`, two cores, node v22.22.0.** Two gates, not one assertion:

| gate | solo | C=2 | C=4 | counts |
|---|---|---|---|---|
| `42-home-devrow` | 19358 ms, 45 pass / 0 fail | 19736 ms (+1%) | 21330 ms (+10%) | identical at every worker |
| `36-evalbar` | 24468 ms, 31 pass / 0 fail | 28192 ms (+15%) | not run | identical at every worker |

**Verdict on the timing half: SETTLE-BOUND.** Four concurrent copies of a browser gate on two cores cost 10% of wall clock and changed no assertion. `CLAUDE.md`'s claim that the wall clock is set by the app's own holds rather than by CPU — written there as an observation its own text calls unmeasured — now has a measurement behind it.

**The positive control is the part worth reading, because the first two did not flip.** One busy loop per core moved gate 42 by 8%; eight per core by 22%; both inside the 25% tolerance, so the control came out SETTLE-BOUND and proved nothing about the detector. A control that cannot flip the verdict is this project's own *gate that cannot fail*, written into the instrument built to measure gates. The script therefore **refuses its own verdict at exit 4** when a control run does not flip, and `CT_CONTENTION_HOGS` raises the load. At 16 loops on 2 cores it read **+44% and CPU-BOUND, exit 0**. So the detector is shown firing, and the clean runs above are a measurement rather than a vacuity.

**What this does NOT license, stated because the job's headline is a P0 about throughput.** It does not license removing or weakening the lock. `gates/gates.sh:112-120` records a **second and independent** reason for it — a shared per-gate log path that produced two collage logs at #418, one of them with an 18KB hole of NUL bytes — and lane 4 measured today that `gates/shots/gates-$TAG` is shared the same way. This script isolates both on purpose. **Both halves have to be answered before the lock can be scoped per-log-path**, and only one of them is answered now.

**Not checked, four things, named rather than swept.** (1) No full suite was run: 2 gates of 59 sections, and the suite's own settle profile may differ at the gates that drive long games. (2) C=4 was measured on `42-home-devrow` only. (3) Reps are 2 per level, so the medians are two or four samples — enough to see a 44% effect, not enough to bound variance tightly. (4) This container is not the build lane's: `jobs/the-suites-absolute-pixel-pins-are-container-dependent-so-this-container-cannot-gate-any-tree` is about pass/fail here, not wall clock, and both gates above read green anyway.

**Delivery** parked at `patches/proc-lane1-art-gates-audit-suite-lock-contention-sh-2026-10-10`. NOT on main; this lane cannot push and did not try [R21].

---

## process build lane 2, 10:13am–11:0xam ET, 10 Oct 2026 — `gates/held.sh` field 7 is COMPUTED, from the GATED SHA, and it has controls

`runId process-build-2__1791641605418`. Item: `jobs/held-sh-add-leaves-the-only-rebuild-proof-key-empty-2026-10-02`, p13, P2, band 13 (a burst wave-1 dropped patch). Base `2bb09bff` (#511 close-out). Four artefact locks held: `gates/held.sh`, `gates/held-selftest.sh`, `gates/audit/cited-not-run.sh`, `claude/PROCESS-LOG.md`.

**I WAS SENT TO DELIVER A PARKED PATCH AND THE PATCH WAS NOT THERE.** The job says its work "exists as a parked patch and the commit does not" and names `docs/burst-patch-held-sh-field7-2026-10-03`. That document's metadata is exactly right — `touched: ["gates/held.sh"]`, `localSha 6e2bdf5`, 12 pass / 0 fail, `closes` two jobs — and its `patch` field carries **a `RUN-LOG.md` diff from #473**. The integration slot measured this on 2026-10-03 and wrote the diagnosis into the document's own `integrationResult`: `git format-patch` was handed the base commit instead of `baseSha..HEAD`, and the tell is free — the patch's own From-sha *is* the document's `baseSha`. So agent 01's work was never in the tracker and is gone with its container. **Nothing new is filed about it**: the integrationResult already says it in terms [R09]. It was rebuilt from the two jobs' text instead.

**AND THE JOB'S OWN PRESCRIBED FIX IS THE ONE THING I DID NOT BUILD.** This job asks for `md5sum $ROOT/chess.jsx` as field 7's default. #463 shipped precisely that and its antagonist measured it as **an active inversion of both polarities**: gate V1, take a veto, edit to V2, stand down, `add` → field 7 names V2. A later run rebuilds V1, gets a fresh bundle md5 in a new minute and a fresh sha, `check` says *not held*, **and the refused tree ships**; meanwhile the never-gated V2 gets `HELD BY SOURCE`, a false hold. The deciding consumer is not this file: `gates/verify-log.sh:833` takes the same key as `git show "$LOGSHAH:chess.jsx" | md5sum | cut -c1-12` **at the door that authorises a push**, and `list` has printed the label "(chess.jsx at that sha)" all along. Two readers, one key. A prescription is a hypothesis [R18].

**What is now true, five clauses in `add`.** (1) Field 7 defaults to `git show <gatedSha>:chess.jsx | md5sum | cut -c1-12`. (2) It falls back to the working tree **only** when that sha is absent from the clone — shallow clones are normal here — and says which tree it used, every time, in a closing provenance line. (3) It **warns loudly** when disk and gated sha disagree, names the gated key it wrote, and prints the `CT_SRCMD5=<disk>` the operator would use to mean the other tree: that disagreement is the mechanical tell that the gate-then-edit-then-stand-down sequence happened, and it is the one moment a human has to choose. (4) It writes `-` **loudly** when the computed key equals main's own `chess.jsx`, naming what the row loses — a harness-only hold has no held source, and that key would make `check` print `HELD BY SOURCE` for every future tree built from main. (5) A comma-separated sha list is **refused** (exit 2) rather than guessed, because two shas are two trees with two keys; `CT_SRCMD5` makes it sayable, and `CT_SRCMD5=-` is legal because "this hold has no source key" must stay sayable. The header's "add the sourceMd5 7th field by hand" is deleted in the same commit, and `list`'s label becomes true for every row this writes.

**THE HEADLINE FIGURE IS RE-DERIVED AND HAS MOVED [R18].** The job's title says "one of the five live rows has it empty" and its own `measured` field says 2 of 6. Against main at `2bb09bff` today: `gates/held-trees.tsv` carries **12** rows with `NF>=6` and **exactly one** — bundle `e7d0499e886b` — has field 7 = `-`. So the rate is 1 in 12, not 1 in 5 or 2 in 6, and the absolute count has *fallen* from 2 to 1. The defect is unchanged: the key is opt-in, so every future row is.

**The control that nobody had written, and it is the whole point.** `gates/held-selftest.sh`, new, following the `gates/buildnum-selftest.sh` house pattern — the home the sibling job names, `gates/run-suite-selftest.sh`, **does not exist on main** (`ls gates/run-suite*` → No such file; `grep -r TC-RS-00 gates/ claude/` → nothing). The sibling job measured that the two pre-existing controls, TC-RS-007 and TC-RS-011, both set up the *trivially agreeing* case: field 7 is written from `chess.jsx` and compared against the same bytes moments later, so both sides are one file and neither tests the arm the field exists for. **Case 2 creates the disagreeing configuration** — a fixture repo with three distinct `chess.jsx` (main's, the gated V1, the edited V2) and its own `origin/main` — and asserts field 7 is V1 and is *not* V2.

| | result |
|---|---|
| HEAD (this change) | **35 PASS / 0 FAIL**, 35 assertions over 19 inputs to `add` |
| BASE, same 35 assertions against pristine `origin/main`'s `held.sh` in a detached worktree | **18 PASS / 17 FAIL** |
| determinism [R36] | three runs, PASS/FAIL sequence byte-identical, md5 `14d11cb967f4baff2a033d233b91e9f6`, ~1s |
| `gates/gatemanifest.sh check` | 58 required / 58 present / 0 missing / 0 unlisted, exit 0 |
| `gates/audit/cited-not-run.sh` | ACCOUNTED 32 of 32, UNACCOUNTED 0 of ceiling 0, STALE-ROSTER 0, **ACCOUNTED-GREEN exit 0** |
| `gates/audit/cited-not-run.sh selftest` | 43 pass / 0 fail |

**17 of 35 fail on main, and that is what makes it a control rather than a demonstration.** `1b`, `1c`, `2b`, `3b` and `4c` all read `-` where a key is required; `2d`, `2e`, `3c` and `5c` find no warning at all; `4a` *accepts* a two-sha row; `6a` and `6b` accept a non-hex and a 32-char override; `7h` — `check` by the source key — exits 0 where it must exit 1.

**A FOURTH LOCK WAS TAKEN MID-RUN AND IT IS DECLARED, NOT SMOOTHED [R44].** `gates/audit/cited-not-run.sh` builds its CITED set by scanning five record documents, **and this file is one of them**. So naming the new selftest in the record that step 6 of my charter *requires* me to write recruits it into the audit's set, where it had no roster row. **Proved, not reasoned**: one probe line appended to a copy of this file took the audit to `UNACCOUNTED 1 of ceiling 0`, **exit 1**; probe reverted. One roster row closes it. It is classed `ADMIT|strong` and the choice is argued in the row itself: the two existing `SELFTEST|weak` rows each say "it is the strongest ADMIT candidate in this roster and it is not mine to admit", written when there was no door to admit anything to — and there is one now, by Kunal's own 12:49am ET one-door decision, which lists **`gates/held.sh --selftest` by name**. `held.sh` now answers that spelling *and* `selftest`, both reaching the same script, so the door's entry cannot be a path that does not answer. **The cost is declared as the two ADMIT rows below it declare theirs: this row takes ADMIT from 2 to 3** against a header calling ADMIT a ceiling that may only fall — a contradiction gate 50's row already names (ADMIT is excluded from the exit code at line 331) and which I am not resolving and not re-filing [R09, R45].

**Two controls failed on the first run and in both cases the control was wrong, not the tool [R18].** `3c` expected one occurrence of "not a commit in this clone" and measured two — it appears in the NOTE *and* in the closing provenance line, which is right, so the assertion is now presence rather than a count. `7g`, "check on an unknown key passes", exited 1: `chess.jsx` on disk was still the V1 that cases 1 and 2 had put on the register, so the **source arm refused it exactly as designed**. The control had quietly assumed an unknown bundle key means not-held, which is the inference the source key exists to break. Both corrections are written into the file beside the cases, with the measurement.

**Not checked, five things.** (1) No browser gate and no suite ran: nothing here is reachable from `gates/gates.sh`, which globs `regress/*.js`, so no PASS/FAIL suite figure is given and none is implied. (2) `gates/verify-log.sh`'s side of the key is **read, not run** — the `:833` recipe is as read; I do not hold that artefact and did not touch it. (3) The one live row with field 7 = `-` (`e7d0499e886b`) is **not backfilled**: `held-trees.tsv` is a `.tsv` under `gates/` and outside this lane's allow-list, and the register is append-only, so an existing row cannot be repaired by this lane at all. (4) The apply against the other 14 pending payloads in every order; what was measured is this payload alone onto pristine `2bb09bff`. (5) Whether `gates/records-gate.sh` will in fact call this selftest — that file is parked, not on main.

**Delivery** parked at `patches/proc-lane2-art-gates-held-sh-field7-2026-10-10`. NOT on main; this lane cannot push and made exactly one dry-run to record the refusal [R21].
## 2026-10-10T02:28Z - process lane 2 - gate 41 finally visits the geometry R19 names

**Run** `process-build-2__1791598370867`, trigger `trig_01XTGhmYb`, branch `claude/process-lane-2`, base `origin/main` 165b7b8.

**Item** alsoFromTheSameAudit **item 4** of `jobs/gate40-headline-assertion-has-a-zero-denominator-at-kunals-geometry-2026-09-28` (p14, owningLane test-authoring, status ready). This is the half **this same lane declined on 2026-10-04** and wrote its reason for on the item claim: *"it is a geometry pin, and the geometry this suite emulates is itself in dispute right now ... widening that pin before the dispute is settled would pin a fifth file to a figure that may change [R45]."* The dispute is still open. What changed is the **shape** of the change, not the dispute.

**What changed** one file, `gates/regress/41-coach-bubble.js`. Its `WANT` pinned the review board at **2 of the 7 GEOS** - `kunal730` and `se` - and neither is the geometry `prompts/common` R19 has named since 2026-10-03. A `kunal761` column is **added first** and both existing columns are left byte-for-byte alone.

**Why adding and not repinning, and it is deliberate rather than timid.** `contradictions/r19-height-settled-against-the-phone-card-still-asking-2026-10-04` is **open at version 6 with eight sides**: R19 says 761; `gates/lib.js:31` says *"'kunal730' is the real phone and new gates should use it"*; `claude/stories/USER-STORIES.md` names 375x730 in **both** canonical geometry sets. R45 reserves resolving a contradiction to someone other than whoever reports it. So this payload picks no side, deletes no column - deleting the 730 column is the migration hazard owned by `jobs/the-geometry-token-is-a-control-flow-discriminator-so-the-761-migration-stays-green-while-deleting-coverage-2026-10-08` - and does not touch `gates/lib.js`, which is outside this lane's allow-list in any case. It is the same shape process lane 1's gate-21 payload took, which that contradiction's own fifth side records as side A behaviour.

**The number is measured on this bundle and is NOT copied from the 730 column [R18].** Real Chromium, `origin/main` 165b7b8's own `app.js`, md5 `28f1ff838440` - the same bundle #507 gated green at 59 sections / 4607 PASS / 0 FAIL. At `GEOS.kunal761` (375x761 viewport, `ct_safe 51,31`) on the Review screen with the Opera Game analysed, **the review board renders 349.03125px wide**: byte-identical to what this gate already reads at `kunal730`, and 0.01px from the `boardPx 349.04` in Kunal's own 2026-09-14 diagnostics report that R19 quotes. That the two 375-wide columns agree is a **result, not an assumption**, and it independently reproduces process lane 1's 2026-10-04 finding that `gates/lib.js:24-26`'s 2026-09-12 prediction of a 293px board under `ct_safe` at 761 is false by 56px.

**The pin is shown firing and silent, because a pin never seen to fire is not a pin.** In a throwaway copy of `gates/` outside the repository: pinned at `-1` the headline assertion **FAILS** and prints `349.03125` as the actual, 17 pass / 1 fail; pinned at `349` the same run reads **18 pass / 0 fail**.

**Gate figures, whole gate, against main's bundle.** 36 pass / 0 fail before; **54 pass / 0 fail** after - exactly the 18 the new column adds; and **54 / 0 on three consecutive runs**, so the added column is deterministic in the sense R36 asks for. The file is **MODIFIED, not added**, so no `gates/gate-manifest.tsv` row is owed and the new-gate refusal this lane is still blocked by does not apply: `bash gates/gatemanifest.sh check` reads *58 required, 58 present, 0 missing, 0 unlisted, 3 known-absent, 0 unjustified* both before and after, and `gate anchor: origin/main, 0 vanished, 0 weakened`.

**Allow-list** `git diff --name-only origin/main...HEAD` returns **one line**, `gates/regress/41-coach-bubble.js`, read before anything was parked.

**The item I could not take, recorded rather than silently swapped [R44].** My first choice was older and higher-value: the `TC-R22` row that is the `scopeReducedTo` of `jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28`. `claims/art-claude-stories-TEST-CASES-md` read **status open, runId `build__1791588049000`, expiresAt 2026-10-10T02:40:00Z** - 23 minutes still to run at my 02:17Z read, and held by the lane that holds the pen. R44 says stand down off the item and take the next.

**Not checked, five things.** (1) The other five geometries: `kunal`, `390`, `430`, `short375` are still unvisited by this gate, and only the column R19 names was added - the remaining four are the rest of item 4 and are **not** claimed as done. (2) Whether the two 375-wide columns agree on any screen other than Review - measured on Review only, which is all this gate drives. (3) The full 59-section suite: this run ran gate 41 alone, so nothing here says the suite total rose by 18 rather than by 18 net of something else. (4) `gates/lib.js:24-26`'s 293 prediction at other geometries. (5) Whether any record document pins gate 41's assertion count - grepped `.tsv`, `.sh`, `.md` and `.js` and found the manifest row (no count) and three `REGRESSION-LOG.md` control rows (historical, 42 / 56 / 34 / 36), none of which is a pin a run reads.

**Delivery** parked at `patches/proc-lane2-art-gates-regress-41-coach-bubble-js-2026-10-10`. NOT on main; this lane cannot push and did not try [R21].
