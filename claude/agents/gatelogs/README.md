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

- A run whose bundle is **gated and then DISCARDED**: say so in the name. `#454` ran `gates.sh '#454'` against
  its own #454 bundle, so the footer and the name agree about what was measured - but the suite went red on a
  known non-deterministic assertion, no bundle was pushed, and `app.js` on main stayed at the #452 bundle. A
  plain `454-all.log` would have been self-consistent and still misleading, because every reader of this
  directory assumes a `NNN-all.log` measured something that shipped. Hence
  `454-all-RED-bundle-not-shipped.log`. The #388 lesson generalises: a name must assert only what its content
  supports, and "this gated the tree you are running" is an assertion a discarded bundle cannot support.

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

## #549: which instrument produced a log, and the boundary before which no log can say

A log in here records its own instrument only from **#485** on. `gates.sh` writes a `toolchain:` line (playwright
and chromium versions), a `fontconfig:` line (the pinned `gates/fonts.conf` and, from #486, the face `sans-serif`
resolves to) and a `text metrics:` line into the header of each gate section; since #539 its footer also carries an
`instrument:` line with the calibration verdict. Before #485 none of that existed, and nothing retroactive can be
written into an old log (see "Never edit a log" above).

MEASURED at #549 over this directory, by `ls *.log | wc -l` and
`grep -l -e 'toolchain: playwright' *.log`: **181 logs; every one numbered 485 or above (68) carries the
toolchain, fontconfig and text-metrics lines, and every one numbered below 485 (113) carries none of them**
(`480-container-fingerprint-control.log` mentions the word `toolchain` but has no `toolchain: playwright` line).
The 68 split into two toolchains, also read from the logs: playwright 1.56.1 with chromium 141.0.7390.37, and
playwright 1.63.0 with chromium 153.0.8010.12; every `fontconfig:` line that names a face names `DejaVu Sans`.
Re-run the two commands rather than trusting these counts - the directory grows every build.

**What that means for a reader.** A log from before #485 is not wrong, and neither is a number pinned from it: the
#485 antagonist's root cause (`/etc/fonts/conf.d/56-prefer-inter.conf`, dated 2026-10-03; without it the stock
Debian chain answers the app's font stack with DejaVu Sans, the face #485 pinned) makes it likely that the older
logs measured DejaVu too. But that is a DERIVATION about what the image used to hold, not a record, and no
pre-#485 log can confirm it from its own contents. So a text-derived number (a width, a height, a line count)
whose only evidence is a pre-#485 log rests on that inference. If a re-derivation disagrees with such a log, the
log cannot tell you whether the pin or the face moved; re-measure on the current instrument instead of reasoning
from the old log.

**Whether a pre-#485 log may still be CITED as the calibration source for a pinned number is not decided here.**
It is a policy question for the orchestrator (job
`jobs/the-harness-has-two-font-regimes-and-no-archived-log-can-say-which-one-produced-it-2026-10-06`, and the
related `jobs/no-push-authority-tool-can-see-which-fontconfig-produced-a-gate-log-2026-10-06`).
`decisions/an-off-calibration-suite-may-not-push-2026-10-27` governs whether a NEW suite may push; it does not
say what an archived log may be cited for. One live citation of this kind, found at #549 by grepping
`gates/regress/*.js` for archived log names below 485: `gates/regress/26-invariants.js` (search `451-all-RED.log`)
identifies the element behind a pinned height at short375 from that pre-#485 log.
