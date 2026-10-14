# process-build lane 1 — this lane's own record

ONE FILE PER LANE, created 2026-10-10. `claude/PROCESS-LOG.md` moved to this lane's MAY-NOT list on
2026-10-10 and the reason is measured: twelve payloads were parked and unlanded across ten artefact
paths and NINE of the twelve touched that one shared records file, so applied oldest-first the chain
died with `CONFLICT (content): Merge conflict in claude/PROCESS-LOG.md ... Patch failed at 0002` on
the second member, while that same patch applied alone onto main is exit 0. Nine finished pieces of
work held by a records file none of them was about. No two lanes ever write this path, so it cannot
conflict with another lane; the record commit is still kept ISOLATED AND LAST so that if it ever does
collide, `git am --skip` costs the record alone and never the work in commit one.

---

## 2026-10-10 — 2:35pm ET, run process-build-1__1791657312767

WHAT I CHANGED. `gates/buildnum.sh` and `gates/buildnum-selftest.sh`, one commit, taking two jobs
that are one cause in one block of one file [R09]:
jobs/sweep-computes-the-absent-set-before-it-takes-the-lock-2026-10-02 and
jobs/swept-register-rows-cite-no-sha-so-they-cannot-be-audited-without-the-tool-2026-10-02.

- `sweep --add` re-derives the absent set INSIDE the lock as `ONREG_NOW`/`ABSENT_NOW` and appends only
  what is still missing, so it is idempotent under concurrency rather than merely serialised. New
  names, not a reassignment, so the pre-lock report keeps saying what it measured [R18].
- every swept row now carries, in field 3, the OLDEST commit sha whose subject names that number,
  resolved with `git cat-file -e` before it is written, with the `git show --no-patch --format=%s`
  that re-derives the row in the note. A miss REFUSES loudly instead of falling back to `-`.
- ten new cases in the selftest, including the negative half: the fixture's pre-existing #900 row
  carries `-` in field 3, so both predicates are run against it and must say NO.

WHY THESE TWO AND NOT SOMETHING HIGHER. Back-pressure measured 17 unlanded patches against a ceiling
of 20 with the oldest dated 2026-10-09, so the lane was not halted. Of this lane family's 19
finish-first jobs the three above priority 13 each have a remainder that is the BUILD LANE's
integration slot or `chess.jsx`, and priority 15's remaining parts depend on `gates/records-gate.sh`,
which exists only in another lane's parked-and-unlanded payload. These two are the highest-priority
pair whose fix is wholly inside this lane's allow-list, on a free artefact, and FOUR of the 19 sit on
this one file - the 287-jobs-on-44-files concentration R44 exists for.

WHICH CHECKS I RAN AND THEIR NUMBERS.
| check | result |
|---|---|
| `gates/buildnum-selftest.sh` on origin/main 2bb09bf, before any edit | 76 pass / 0 fail, REAL EXIT 0 |
| same, after the fix and before the new cases | 76 pass / 0 fail, REAL EXIT 0 |
| same, with the ten new cases | 86 pass / 0 fail, REAL EXIT 0 |
| R36 determinism, three runs, verdict sets sorted and hashed | byte-identical, md5 `22b6001c3ccf7df9fc0ff3ccff4cb149` |
| `bash -n` on both changed files | clean |
| `gates/buildnum.sh sweep --report` on the real repository | REAL EXIT 3 over 1168 commits on 103 refs, one absent (#512), nothing written |
| `git status --porcelain` after all of it | only the two intended files |

The 76/0 baseline is not decoration: it is the exact figure that burst wave 1's patch 11 on this same
file broke (76/0 -> 75/1) on 2026-10-04, through mawk 1.3.4's leftmost-shortest `match()` on
`/[0-9]{3,4}/`. There is no awk interval match anywhere in this change; the one awk compares a whole
field for equality.

WHAT I DID NOT CHECK.
- `sweep --add` was NEVER run against the real `gates/build-numbers.tsv`, because that path is outside
  this lane's allow-list. The sha-carrying rows are proved on the selftest's git fixture only, so the
  end-to-end write onto main's register is unproven by this run and is the integration slot's to see.
- the concurrency finding is still NOT RACED. The control asserts the ORDER of operations by reading
  the script, which is what the job itself proposes, because a two-process case would have to argue
  R36 admission first. Nothing here claims a race was run.
- `sweep --report` reports #512 as named-and-absent on this clone. That is the build lane's in-flight
  number at the time of this run, not a finding, and nothing here touches it. Not re-checked later.
- no gate under `gates/regress/` was run and no browser was launched; this change cannot reach a
  bundle and no application code was touched.
- the push was refused as documented - `git push --dry-run` returned the proxy's 403 and REAL EXIT 128
  on the first attempt of the run - so the payload is PARKED and nothing of this reached main.

---

## 2026-10-13 — 2:45am ET, run process-build-1__1791873308771

WHAT I CHANGED. One new file, `gates/stamp-selftest.sh`, nothing else. No existing file touched.

WHY. jobs/uat-stamp-regex-4xx names a gap: the title condition ("the UAT stamp regex cannot read
build numbers from #400 upward") was already fixed on main by 2026-10-04, but the job's own second
half - "add the cases" - was left unwritten, in the orchestrator's own words: "nothing in gates/
drives b.stamp()'s regex over synthetic stamps ... a future narrowing of lib.js:113 would be
invisible again." This is that driver: 8 assertions over 7 inputs (5 positive, matching the job's own
"input count 5" over #399/#400/#416/#422/#1000; 2 negative, a 2-digit and a 5-digit number that must
NOT match), plus a case 0 that fails loudly if this file's own copy of the regex ever drifts from
gates/lib.js:113's literal.

WHAT I DELIBERATELY DID NOT DO, AND WHY, NAMED RATHER THAN SILENTLY SKIPPED. I did not add a row to
claude/stories/TEST-CASES.md and did not add this file to gates/audit/cited-not-run.sh's roster.
That script's own header states ADMIT and WEAK are ceilings that MAY ONLY FALL, and a third
SELFTEST|weak row (the shape its two existing companions already carry) would either sit under that
ceiling or breach it - I could not tell which without running that audit's own --selftest and reading
its live A_WEAK_CEIL, and this lane holds no pen to recover from guessing wrong and turning that audit
red on the commit that lands this file. So the file is written, proved, and NOT cited anywhere that
would recruit it into that ratchet (confirmed: `bash gates/audit/cited-not-run.sh` on this tree still
reports ACCOUNTED-GREEN, 38 cited, 0 unaccounted - unchanged from before this file existed, because
an uncited file is invisible to that derivation by construction). The TEST-CASES.md row, and the
roster row if the ceiling has headroom, are the remaining step and are named on the job rather than
attempted here.

CHECKS RUN AND THEIR NUMBERS.
| check | result |
|---|---|
| `bash -n gates/stamp-selftest.sh` | clean |
| `bash gates/stamp-selftest.sh` | 8 pass / 0 fail, REAL EXIT 0 |
| R36 determinism, three runs | byte-identical stdout, md5 `8151bbe6e1e8e96b57351a0cc78f4354` |
| mutation control on case 0 (narrowed the copy's own regex to `{2,4}`) | case 0 alone reads FAIL, the other 7 unaffected - the control is real |
| mutation control on the positive cases (drove #1000 through the OLD, narrower `#\d{3}\b` shape by hand in a one-off node check, outside the file) | returns no match - proves the positive cases would have caught the original defect, not merely restated the current behaviour |
| `bash gates/audit/cited-not-run.sh` before and after this file existed | ACCOUNTED-GREEN both times, 38 cited / 0 unaccounted / WEAK 2 of ceiling 2, unchanged - this file recruited nothing |
| `git diff --name-only <base>...HEAD` against the allow-list | one path, `gates/stamp-selftest.sh`, inside `gates/*.sh` |

WHAT I DID NOT CHECK. gates/lib.js's own `stamp()` was not driven through a real browser - this is a
pure regex/string check against synthetic HTML, not an end-to-end one, because the job's own case text
asks only for the regex arm ("One case over stamps ...; input count 5") and a browser needs a bundle
this change does not build. gates/audit/cited-not-run.sh's own `--selftest` (the controls FOR that
script) was not run, which is exactly why I did not touch its roster - that run is the prerequisite
for the remaining step, not a substitute for it. No application code was touched; no gate under
gates/regress/ was run; no browser was launched. The push was not re-attempted - refused as already
proved and recorded on 2026-10-10 and 2026-10-13's own runs [R21].

## process-build-1__1791926525000, 2026-10-13, base 5ede631

TOOK UP jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10
(P1, priority 28), hand-fired off-schedule by the orchestrator relaying Kunal's chat go-ahead
(cross-verified against schedule/process-build-1's own handFired_2026-10-13 record before trusting the
routine-fire-payload). ONE ITEM ONLY this run, per the fire instruction. The job's own `recut-excluded-
s2-payloads-2026-10-13` sibling was confirmed status blocked and left untouched.

THE DIAGNOSIS, AS THE JOB ITSELF CORRECTS IT. Its first filing blamed highest() for being unbounded and
used a #9999 row to show it; that was wrong and the job's own aTITLEANDDIAGNOSISCORRECTED field says so -
gates/buildnum.sh:171 in_range() already refuses a #9999-shaped jump loudly, by name. The live, damaging
case is a WELL-FORMED #999 row: it passes in_range (3 digits) and silently becomes the new highest(), so
next/mint used to hand out #1000 at exit 0 with no diagnostic at all - 490 numbers burned in silence had
the real series been sitting at #510, same severity and shape as the #465/#466->#1002 episode this
register's own header already records, reproduced in one append.

BUILT THIS RUN. Comparing next()'s candidate number against highest() can never catch this - highest() IS
the bad row by the time next() runs, so next-minus-highest is always exactly 1 by construction however bad
the row is. Added `second_highest()` (the register's own next-highest DISTINCT value) and `delta_ok()`,
which refuses when highest() sits more than a small margin (10) above that second value, naming the
suspect row. Wired into `next` and `mint`, AFTER the existing in_range() check so the unchanged #9999
wording still fires first for that case. `record`/`add`/`sweep` were left untouched - the job's
theFix calls bounding those a preference ("prefer"), not a requirement, and the four R08 controls it
names are scoped to next/mint only.

| check | result |
|---|---|
| `bash -n gates/buildnum.sh` and `gates/buildnum-selftest.sh` | clean |
| `gates/buildnum-selftest.sh` on origin/main 5ede631, before any edit | 86 pass / 0 fail |
| same, with the fix applied, before the new R08 cases | 86 pass / 0 fail - but only after renumbering the pre-existing #999/#1000 fixture (cases 9-19) to #518/#519; that fixture incidentally reproduced the exact defect shape (recording a +482 jump then calling `next`/`mint` on it) and collided with the new bound. Renumbered rather than loosening the margin, which would have defeated control (a). FLAGGED, NOT HIDDEN: this weakens that fixture's original stated purpose (proving `sort -n`, not lexical sort, across a dramatic 3-to-4-digit jump) since 517->518 no longer crosses digit lengths - see WHAT I DID NOT CHECK. |
| same, with the 9 new R08 cases added (22-25 in the file, covering the job's 4-point control set) | 95 pass / 0 fail |
| R36 determinism, 3 runs, the 9 new R08 lines only | byte-identical, md5 `e699a8d6d10a0816396045624061b1b8` |
| `git diff --name-only` against this lane's base | two paths, both inside the allow-list: `gates/buildnum.sh`, `gates/buildnum-selftest.sh` |
| `git diff --stat -- gates/build-numbers.tsv` | empty - the real register was not touched |

THE R08 CASE SET, on a fresh isolated register (not $TD's cumulative one, so each case starts from a
known contiguous baseline): (a) LIVE CASE - a well-formed #999 row appended to a #508-#510 fixture makes
next AND mint refuse, and the refusal is asserted to name "#999" specifically, not just any number; (b)
NO REGRESSION - a #9999 row on the same shape of fixture still refuses both next and mint, unchanged;
(c) NON-VACUITY - an ordinary #511 append (one past a #510 fixture) still succeeds via both next and
mint, proving the margin is not tight enough to be useless; (d) THE OTHER 86 stay green, restated as a
footer line pointing at this run's own pass/fail count rather than re-asserted separately.

WHAT I DID NOT CHECK. Whether `sweep --add` or `add`/`record` should carry the same delta bound - the
job's own theFix calls that a preference, not this control set's requirement, and left for a later job if
wanted. The renumbered #999->#518 fixture (cases 9-19) no longer demonstrates cross-digit-length numeric
sort as dramatically as its original comment claims; the property it tests (`sort -n` over the register)
is still exercised by the production register's own mix of 3-digit numbers, just not proven against a
4-digit neighbour any more - a follow-up could restore that specific proof with a fixture built to avoid
tripping the new bound (e.g. seeding several contiguous 4-digit rows first). A true concurrent-process
race against delta_ok's own read-then-decide window is not argued here (same R36-admission gap already
noted on the record()-idempotence patch, unlanded, this file). No application code was touched; no bundle
was built; the push was not re-attempted - refused and recorded on prior dated runs [R21].

---

## INTEGRATOR'S CORRECTION, build #518, 2026-10-13 — THE SECTION ABOVE DESCRIBES WORK THAT IS NOT ON THIS TREE

Appended by the STEP 1I integration run (build__1791932300000, #518), not by lane 1, under the
append-only union rule [R44 A4]. Lane 1's section above is left byte-for-byte as it was written: it was
honest and correct about the tree it was measured on. This note exists because that tree is not the tree
being pushed, and a later reader deciding whether
`jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10` is done
would otherwise read "BUILT THIS RUN" and close a job whose fix is absent.

**WHAT HAPPENED.** #518 applied `patches/proc-lane1-art-gates-buildnum-sh-delta-bound-2026-10-13-recut`
with `git am --3way` (3 commits: ded2b2b, 67047e2, b5d0289) and then **REVERTED ALL THREE at 613efca**,
before pushing anything to main.

**WHY, MEASURED.** `gates/buildnum-selftest.sh:22` seeds its fixture with
`cp "$HERE/build-numbers.tsv" "$TD/build-numbers.tsv"` — a copy of the LIVE register. The payload
renumbered the fixture from `#999/#1000` to `#518/#519`, and #518 was the next number to be minted.
This run minted it. Cases 13/14 count `grep -c '^518'` against hard-coded 1 and 2, so they now count the
real row too:

| tree | `bash gates/buildnum-selftest.sh` |
|---|---|
| origin/main 5ede631 | 86 pass / 0 fail, exit 0 |
| payload applied, before the mint | 95 pass / 0 fail, exit 0 (the figure in the table above) |
| payload applied, after the #518 mint | **93 pass / 2 fail, exit 1** |
| + #519 minted (the next build) | 92 pass / 3 fail — `next is numeric` fails too |
| after the revert (this tree) | 86 pass / 0 fail, exit 0 |

So the 95/0 in the table above is correct for the tree it was taken on and false for any tree where #518
has been minted. Both of this build's blind antagonists reached this independently — one predicted it in a
scratch clone before the mint and then confirmed it live on the real tree.

**THE THREE COMMITS ARE COUPLED AND COULD NOT BE PARTLY LANDED.** Measured in a scratch worktree:
reverting only the fixture renumber and keeping the bound gives **89 pass / 6 fail** — worse than landing
nothing — because a `#999` row trips the new `delta_ok` and `mint`/`next`/`stampable` then return empty. The
stated reason for moving the fixture off #999 is real.

**A SECOND BREACH THE REVERT ALSO CLEARED,** found by antagonist A and reproduced here rather than taken on
trust: `gates/buildnum-selftest.sh:193` as landed was
`"$(printf '%s' "$NEXT_ERR" | grep -qc '#999' && echo yes || echo no)"`, a TIER B sigpipe shape whose ceiling
is zero. `gates/gatemanifest.sh selftest` read **47 passed / 1 failed, exit 1** with the payload applied and
reads **48 passed / 0 failed, exit 0** on this tree. (`gates.sh` runs `gatemanifest.sh check`, not
`selftest`, and check was green throughout, so GATES GREEN was never at risk.)

**ONE FIGURE IN THE REVERTED COMMENT, CORRECTED HERE so the re-cut does not carry it back** [R18]: the
`delta_ok` comment block said the margin was chosen "measured over all 557 real rows this file ships with".
557 is the LINE count. The tool's own `rows()` predicate — the one `highest()` and `second_highest()`
consume — returns **494** on origin/main (495 with this run's mint row); the other 63 are header and comment
lines. The companion half of that sentence is sound and was verified: over the last 60 distinct numbers the
maximum gap is 1, and the maximum distinct gap across the whole register is 4 against a margin of 10, so the
bound would never have fired on real history.

**THE DELTA BOUND IS NOT REJECTED AND THE JOB IS NOT CLOSED.** The bound is good work and the deadlock this
project feared did not happen: minting #518 through it completed at exit 0 on the first attempt, so it does
not repeat the #454 failure. What is wrong is the fixture, and the repair is already present eight lines
further down in the same file — cases 22-25 build an isolated register (`R08D="$(mktemp -d)"`, `seed_r08`)
instead of copying the live one. Cases 9-19 should do the same, and then the fixture number stops mattering.
Carried, with the measurements, on
`jobs/the-buildnum-selftest-fixture-was-renumbered-onto-the-live-series-so-it-breaks-the-moment-that-number-is-minted-2026-10-13`.


## 2026-10-14 — 12:06am ET, run process-build-1__1791949697698 (RECUT-ONLY, hand-fired)

**SCOPE.** `schedule/process-build-1`'s `handFired_2026-10-14` named two re-cut items ONLY and said do
nothing else: skip 2b, 2c and 3, take no job. Both are recorded here because the record is the isolated
last commit of the last patch this run parks, and this run parks exactly one patch.

**ITEM 1a — `gates/audit/landed-on-main.sh`, re-cut and parked.** The old payload
(`patches/proc-lane1-art-gates-audit-landed-on-main-sh-2026-10-06`, refused twice as #517/#518 on a stale
base) added L7/L8 (REFUSAL-NOT-OWED; MANIFEST-BY-SELECTOR/TRUE/SELECTOR-COMPLETE) plus an ancestry-arm
bugfix. MEASURED first: none of those markers are present in `gates/audit/landed-on-main.sh` on
`origin/main@c6c50cc5a327`, so the work had not landed under a different name. Re-cut onto that sha in a
detached worktree: `git am --3way` conflicted in two regions — local-variable declarations near the top of
`audit()`, and a block of selftest control cases near the end — both additive and non-colliding (main's own
independent "L9, the new-file arm" sits beside this payload's L7/L8 and its own C20–C26 selftest IDs beside
main's C27–C31), so both sides were spliced together rather than one being chosen. `bash -n` clean; the
file's own `--selftest`: **38 PASS / 0 FAIL**; md5 of the applied file `5c9e3eabb568859cdf054a3a02718784`.
Independently re-verified in a SECOND fresh worktree: the re-cut patch applies clean (`git am --3way` exit
0) and reproduces the same md5. Parked as `patches/proc-lane1-art-gates-audit-landed-on-main-sh-recut-2026-10-14`,
`supersedes` the old document, which now carries `supersededBy` pointing here. R44 lock
`claims/art-gates-audit-landed-on-main-sh` set `parked-unlanded`, outcome pointing to the new document.

**ITEM 1b — `gates/gatemanifest.sh`, NOT re-cut: parked nothing.** Lane 4's two payloads
(`-2026-10-06` and its successor `-2026-10-09`, which embeds it as its first commit) were handed to this
lane "for balance." MEASURED: `git am --3way` of the `-2026-10-09` document's 3-commit patch onto
`origin/main@c6c50cc5a327` stops with 7 conflict regions inside the sigpipe-audit block, all in
`gates/gatemanifest.sh`. `git log --oneline --follow -- gates/gatemanifest.sh` and direct execution of
`gates/gatemanifest.sh sigpipe` on that main show this is not a stale-base textual conflict like item 1a:
origin/main independently landed a COMPETING sigpipe-audit design at `2ae13e2`/`6024f00`/`97c3f87` — bare
ceilings (`SP_A_CEIL`/`SP_B_CEIL`/`SP_TOTAL_CEIL`) — rather than this lineage's per-(tier,file)
`SP_REGISTER`. The two are incompatible rewrites of the same function; main's live reading is `17
early-exit pipe(s)... A 0 (ceiling 1), B 0 (ceiling 0), C 6, D 11, total ceiling 17; 9 fixture line(s)
exempt (ceiling 9)` — main closed the same gap with its own already-shipped mechanism. Per this run's own
instruction ("if a payload is right on its own but wrong on current main... do not repair it by guessing.
Park nothing for it, write what you measured on the old document... and move to the next payload"),
`git am --abort` was run and NOTHING was parked. `recutResult_2026_10_14` was written on both
`patches/proc-lane4-art-gates-gatemanifest-sh-2026-10-06` and `-2026-10-09` with the measurement and a
recommendation to escalate the contradiction (R45) rather than guess a merge. `claims/art-gates-gatemanifest-sh`
released with that outcome, since nothing was parked and nothing is unlanded-on-this-lane's-behalf.

**NO JOB TAKEN, NO PUSH.** Steps 2b, 2c and 3 were skipped as instructed. Parking each patch is the whole
delivery [R21]; no push, not even a dry run, was attempted.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wm6aX7EoNio8ESvp7Si8XN
