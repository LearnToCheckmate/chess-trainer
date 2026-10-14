# Process build lane 4 - run log

(First entry. File created this run under step 6 of prompts/process-build, which
restricts this lane's own append-only record to claude/process-log/lane-<N>.md
rather than the shared claude/PROCESS-LOG.md. This entry covers a hand-fired
RECUT-ONLY run, not a normal queue pass - see the scope note below - and
supersedes the truncated version of this same record that an earlier attempt
at this run's second recut tried to park on 2026-10-13 and that the
integration slot twice refused to apply, #517 and #518, because its diff body
had been replaced with a placeholder sentence instead of real content.)

## 2026-10-14T03:53Z-04:4xZ (process-build-4__1791949999240, hand-fire, RECUT-ONLY)

Hand-fired by the orchestrator on Kunal's word, scoped to re-cutting exactly
two stale parked payloads against current origin/main and parking the
results. Steps 2b, 2c and 3 were skipped entirely by instruction: no job was
taken from the queue, nothing was closed, and the schedule (cron
`48 3,9,15,21 * * *`) stayed disabled - this fire does not resume it.

**RECUT 4a - claude/stories/TEST-CASES.md, two payloads re-cut as one chain.**
`proc-lane4-art-claude-stories-TEST-CASES-md-2026-10-07` (the TC-R50 rewrite,
base `109d897`) and its sibling `proc-lane4-art-claude-stories-TEST-CASES-md-2026-10-07T22`
(the TC-R32 addition, base `41894d6`) were re-cut in one ordered chain onto
current main, `c6c50cc5a327ecf6c0eb21457a6bc9a8e4e432bc`, 10-07 first then
10-07T22, each commit keeping its original subject and touching nothing else.

The first commit's own TC-R50 hunk no longer conflicted with its sibling (the
collision both old docs had already measured in both orders) - main had
independently landed its own correction of the same cell since both payloads
were parked (`5d37e95`, "FAILS TODAY AT FIFTEEN"), so the re-cut collided with
main's own prose instead. Resolved by re-measuring `gates/audit/cited-not-run.sh`
live against current main rather than quoting either side's stale figure, which
is the same principle the old row's own text argued for.

Writing that resolution into the file surfaced a self-referential trap worth
recording in its own right: `claude/stories/TEST-CASES.md` is itself one of
the ten records `gates/audit/cited-not-run.sh` scans, so rewriting the TC-R50
cell changes what the instrument counts as cited. A first draft of the
resolved cell quoted a reading taken against the pre-edit text (RED, 39
cited-and-unreachable); re-running the script against the post-edit text gave
38, not 39, because the old row's own prose had been the only citation of one
probe file and replacing that prose un-cited it. The committed cell was
corrected to the post-edit, stable figure and verified to a genuine fixed
point over three consecutive runs (report md5
`7d3aa5de7dfbb94767eac56527f9ff3d`); the retired probe file is deliberately
not named inside the cell, since naming it would re-cite it and flip the
count back. A second, smaller instance of the same trap was caught before
parking: an earlier draft of the cell happened to contain the substring
"first-pass", which made `gates/verify-log.sh --citations` arm (2) treat the
row as publishing a gated PASS/FAIL result and flag it UNSUPPORTED against a
log it was never run against - reworded to drop the substring, confirmed back
at the pristine-main baseline (22 unsupported, unchanged).

`gates/verify-log.sh --citations` run before (pristine origin/main) and after
(this chain's HEAD): dead paths 17/17, unsupported case ids 22/22, misfiled
rows 11/11, dead line citations 0/0, stale line citations 0/0, over-ceiling
0/0, wrong-width rows 2/2 (ceiling 2, unchanged - TC-R19 and TC-R37,
pre-existing), case rows 66/67 (+1, the new TC-R32 row), story headings
35/35. TC-R32 and TC-R50 each occur exactly once as a table row in the final
tree (32 total TC-R rows, no duplicates). `appliesClean` measured in a fresh
detached worktree against current origin/main: both commits apply clean under
`git am --3way`, exit 0, tree byte-identical to the one this chain produced in
the worktree it was authored in.

Parked as `patches/proc-lane4-art-claude-stories-TEST-CASES-md-recut-2026-10-14`,
with `supersedes` naming both old docs and `supersededBy` written back onto
each.

**RECUT 4b - gates/regress/26-invariants.js, and this record.**
`proc-lane4-art-gates-regress-26-invariants-js-2026-10-13` carried two
commits: a seven-line fix to the rev-summary grade-table non-vacuity check
(`jobs/gate-26-grade-table-nonvacuity-assertion-passes-on-an-empty-object-2026-10-10`
- `evaluate()` returned `{}`, truthy, when the panel rendered with zero
matching rows, so the `!!grades` assertion at `:1300` that exists to prove
non-vacuity was satisfied by an empty table; now returns `null` in that case,
indistinguishable from the absent-panel case), and a second commit meant to
carry this lane's own record of that fix. The integration slot refused the
payload twice, #517 and #518, both times on the second commit: its diff
header claimed 51 insertions creating `claude/process-log/lane-4.md`, but the
hunk body had been replaced with a placeholder sentence rather than a real
diff, so `git am` reported "No valid patches in input" and then "could not
build fake ancestor" rather than applying anything.

The first commit re-applies clean against current main with no change needed:
`git am --3way` exit 0, no 3-way fallback invoked, `gates/regress/26-invariants.js`
md5 `ec936926a0d0dc26760191b5c004bcf9` - identical to the figure the original
patch document already carried, confirming nothing has touched this file on
main since. `node --check` passes.

The second commit is this entry: a complete, non-truncated record of both
recuts in this run, written directly rather than carried over from the
truncated placeholder, isolated and last, touching only this lane's own
record file.

Gates run this run: `gates/audit/cited-not-run.sh` (hand, no suite gate - see
TC-R50's own row for why), `gates/verify-log.sh --citations` (hand), `node --check
gates/regress/26-invariants.js` (syntax only). No suite run (`gates.sh`) was
invoked - out of scope for a RECUT-ONLY fire that skips steps 2b/2c/3.

Parked as `patches/proc-lane4-art-gates-regress-26-invariants-js-recut-2026-10-14`,
with `supersedes` naming the old doc and `supersededBy` written back onto it.

Three artefact claims held for this run (`claims/art-claude-stories-TEST-CASES-md`,
`claims/art-gates-regress-26-invariants-js`, `claims/art-claude-process-log-lane-4-md`
- the last a same-lane takeover of this run's own prior truncated-record
holder) are released at check-out. No job was taken from the queue; none was
closed. This lane cannot push; the build lane's integration slot lands both
recuts when it next runs.
