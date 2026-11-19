# Design review of the suite resume (worktree agent-aa51d13fb0e935e7c, 1e0c21e8..0481a730), 19 Nov 2026 ~16:3xZ
Reviewer: an independent read-only agent started by the lead. Self-test run once: 71 pass, 0 fail. VERDICT: SOUND WITH FIXES.
FIXES NEEDED BEFORE USE (each with a self-test case that fails before the fix):
1. (1a, most serious) A clean-prefix journal check lets the operator cut the last rows (or a kill during gate k+1 while it prints FAIL) and
   drop a finished RED gate from the joined log, which then reads GATES GREEN. gates/suite-resume.sh:105-123 checks only that rows are 1..k.
   Fix: refuse when the count of '    resume-mark: ' lines in the killed log is not k; scan the bytes after the last journaled unit: a gate
   verdict line there means the journal was cut (refuse); FAIL lines or a 'RED (' line there are carried into the joined log as a named line
   or make the run red. Remove the "cut back to it by hand" advice at suite-resume.sh:83.
2. (1b) The env digest (suite-resume.sh:34-37) covers variable names/values only, not node / Playwright / Chromium versions or system fonts,
   which a container restart can change (#537 was a Chromium 141->153 change). gates.sh:3222 TC_LINE and verify-log.sh:1754 read only the
   first 'toolchain:' line (grep -m1). Fix: add node --version, the Playwright version and the Chromium build to the start record and env
   digest; verify-join.sh requires exactly one distinct 'toolchain:' line across all sections; add a fixture with toolchain and metrics lines.
3. (1c) A part-1 prelude red is discarded, including 'TREE MOVED BEFORE THE BROWSER GATES' (gates.sh:3050). Fix: sr_resume_check requires
   the killed log to carry 'tree unchanged before the browser gates' and no 'TREE MOVED' line.
4. (1d) On import the journal's green/red column sets red (suite-resume.sh:142); an edited field makes gates.sh print GATES GREEN over a
   copied RED section (verify-log.sh:1578 still refuses). Fix: recompute the verdict from the copied bytes, as sr_mark does at :156.
RECOMMENDED: put the tree, status and env digests in each mark and require them equal (1e); trigger the verify-log hook on '^suite-resume: '
too (1f); narrow the 'resume: ' anchor to e.g. '^resume: [0-9]+ part\(s\): ' (2i); check gates/audit/pipefail-grep.sh / audit-all.sh against
suite-resume-selftest.sh:161 (2ii); fix the comment at suite-resume.sh:15 (2iii); prove design section 8 (every existing self-test same counts
before and after) (2iv); bring design section 5's footer line in line with the code (3).
DEFAULT PATH (both vars unset): no change in effect found (hooks a-d no-ops; extracted selftest blocks untouched; no committed gatelog carries
'^    resume-mark: ' or '^resume: '; d2/d3 byte-identical).
