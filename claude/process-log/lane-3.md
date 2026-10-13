# Process build lane 3 - run log

(First entry. File created this run under step 6 of prompts/process-build, which
restricts this lane's own append-only record to claude/process-log/lane-<N>.md
rather than the shared claude/PROCESS-LOG.md.)

## 2026-10-13T04:40Z (process-build-3__1791865634907)

Fixed gates/audit/cited-not-run.sh: closure()'s `*.js` arm scanned `require()`
off the raw file with no comment-stripping, so a `//`-commented require was a
real edge in the reachability graph (a false GREEN - it made an unreachable,
cited file look reachable). Added `decomment_js()` (strips `//` and `/* */`,
kept separate from the existing sh-flavoured `decomment()`) and routed the
`*.js` require scan through it.

Gates run: `gates/audit/cited-not-run.sh --selftest` - 47 pass / 0 fail,
deterministic over three consecutive runs (identical stdout md5
6312a876f2521909593ada12b7df2481). Two new controls, C34 and C35: a commented-
out require must create no edge (verified to fire red against the pre-fix
code, by precise revert-and-rerun), and the identical line uncommented must
still create one.

Also ran the real (non-selftest) audit against origin/main 87b432a: both the
fixed and the pre-fix code report CITED-NOT-RUN 38, ACCOUNTED 38 of 38,
UNACCOUNTED 0, ACCOUNTED-GREEN, exit 0 - identical. So nothing on main today
is misclassified by the defect; it is a latent mechanism bug, which matches
the filing job's own "none is load-bearing... Latent, named, and filed."

Not checked: whether any gate file OTHER than the fabricated fixtures carries
a commented-out require anywhere in the tree today (the real-repo run above
answers this indirectly - the accounted/unaccounted totals did not move - but
no direct grep count of commented requires across gates/ was taken).

Parked as patches/proc-lane3-art-gates-audit-cited-not-run-sh-closure-2026-10-13.
This lane cannot push; the build lane's integration slot lands it.
