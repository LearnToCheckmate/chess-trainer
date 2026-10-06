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
