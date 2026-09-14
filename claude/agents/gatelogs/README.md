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
