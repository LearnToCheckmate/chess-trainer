# How these logs are named, and the one time the name lied

`gates.sh '#NNN'` derives BOTH the log footer and `CT_EXPECT` from its argument, so a log's footer names the
**bundle that was gated**, not the build the work was filed under. Those are usually the same. They are not the
same on a **re-gate** — a pass that changes gates or docs and leaves `app.js` untouched — because the right
thing to run is `gates.sh` against the bundle that is actually live.

**The failure this file exists to prevent.** The #388 passes were gate work with no bundle change, so they ran
`gates.sh '#387'` against the #387 bundle and the logs correctly end `GATES GREEN #387`. They were then filed as
`388-all.log` and `388b-all.log`, and the dashboard credited their assertion totals to "#388". An external
challenger caught it (`uat-ext-2026-09-14b`): a log footed `#387` filed under a `388` name is a provenance
claim nobody can check without opening the file. Nothing measured was wrong — mountcheck verified the #387 stamp
because #387 is what was running — but the NAME asserted something the CONTENT did not support.

**The convention from now on:**
- A build that changes the bundle: `NNN-all.log`, and the footer will read `GATES GREEN #NNN`. Self-consistent.
- A re-gate that does not: `NNN-regate-of-the-MMM-bundle.log`, where MMM is the bundle actually gated and the
  footer will read `GATES GREEN #MMM`. The filename then says exactly what the footer says.

Never edit a log. Rename it if the name is wrong, and say so here.

## A green log in here is not a permission, and since #450 there is a place that says so

Every log in this directory ends `GATES GREEN`. That is a statement about the SUITE: those assertions ran over
that bundle and none failed. **It is not a statement that the tree shipped, or that it may.** **ONE** of the
trees these logs describe was deliberately HELD by the run that gated it, for a reason no gate in the suite
could see - and a later run cannot tell which, because the log is honest either way.

*(That count read "Two" when this paragraph was first written and the register had exactly one row. Antagonist B
caught it in the same build: a published count that the guard's own tool contradicts is the worst possible state
for a guard, because a reader who trusts "two" and gets "not held" on their tree cannot tell whether the
register is incomplete or the prose is wrong. It was the prose. `gates/held.sh list` is the count that is
true by construction - read it rather than this sentence.)*

`441-all.log` is the case that cost a revert. It is a real 4100-line green at 3097 PASS and `verify-log.sh`
accepts it. The tree it gated carries two P0s: measured at its own gated sha `409b897`, `chess.jsx` has 0
occurrences of the `_selL` fix and `gates/regress/67-sel-cls-consumers.js` - the only gate that reddens on
them - is absent from that tree. On 2026-10-01T00:31Z a run pushed it on four correct green checks and it was
reverted 17 minutes later. (That log is **absent from main's tree** but it is **reachable from main's
history**: `e765135` is an ancestor of `origin/main`, so `git show e765135:claude/agents/gatelogs/441-all.log`
yields all 4100 lines from a clean main checkout, and feeding it to `gates/verify-log.sh` produces the refusal.
This paragraph first said the log "reached only `claude/cool-noether-gccllp`", which antagonist B disproved by
eleven refs - and the correction matters because the pessimistic version discourages the one recovery that
works.)

**So: `gates/held-trees.tsv` is the register, and `gates/verify-log.sh` reads it by default and refuses.** Before
you cite any log in here as grounds for a push, run `gates/verify-log.sh <log> '#NNN'` and read what it says
rather than only its exit code. If you are the run STANDING DOWN, `gates/held.sh add <bundleMd5> <gatedSha>
'#NNN' <reason>` in the same step, and commit it to `main`.

| file | run under | bundle gated | note |
|---|---|---|---|
| `388-regate-of-the-387-bundle.log` | #388 | #387 | renamed from `388-all.log` at #389, per the above |
| `388b-regate-of-the-387-bundle.log` | #388 chain link 2 | #387 | renamed from `388b-all.log` at #389 |

## #391: two more things this directory was getting wrong

**THE COMMITTED LOGS WERE THE WRONG FILE.** `gates.sh` `tee`s only the summary lines to stdout and writes every
PASS line to `gates/logs/<N>-all.log`. Every gatelog committed here before #391 is the ~57-line STDOUT capture,
not the ~1200-line real log. The footer totals in them are correct, and nothing else in them can be audited -
you cannot check which assertion produced which number. Found by `verify-log.sh` reporting "27 suites, 0 PASS"
on a log that footed 1029. **Copy `gates/logs/<N>-all.log`, never the terminal output.** `390-all.log` has been
replaced with the real one; the earlier thin ones are left as they are rather than rewritten, because they are
the record of what was actually reported at the time.

**AND THERE IS NOW A CHECK, so none of this depends on remembering.** `gates/verify-log.sh <log> [#NNN]` is the
one place that decides whether a log authorises a push. It refuses an empty log, a SUBSET log, anything not
ending in a clean `GATES GREEN #NNN`, and a log whose header and footer name different builds. Run it before
citing any log. Its PASS count is also the tell for a thin log: a full suite reporting 0 PASS is the stdout
capture, not the log.

| file | run under | bundle gated | note |
|---|---|---|---|
| `390-all.log` | #390 | #390 | replaced at #391 with the real `gates/logs` file, 1228 lines, 1029 PASS |
