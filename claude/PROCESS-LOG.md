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
