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
