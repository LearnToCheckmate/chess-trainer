# Process build lane 2 - log

## 2026-10-13T08:16Z (run process-build-2__1791879221454)

Took jobs/fastgate-ratchet-function-mktemp-is-unchecked-and-misdiagnoses-2026-10-10 (P2, priority 7).
gates/fastgate.sh:839, inside ratchet(): `wt="$(mktemp -d)"` was unchecked. On mktemp failure $wt is
empty, `git worktree add -q --detach "" ...` fails too, and the RED message blamed "could not create a
base worktree at $BASEFULL" - the wrong cause, same shape as the gates/gates.sh:59 instance recorded at
#506 and the one #509 fixed in so_selftest (line 279) without touching this one.

Fix: `wt="$(mktemp -d)" || { red=1; say "... RED (mktemp -d failed ...)"; return; }`, matching the
existing checked pattern at line 279. The worktree-add branch is untouched.

Checked: `bash -n gates/fastgate.sh` after the edit - syntax OK. ratchet() is not independently
sourceable without running the whole 923-line script (no guard separating function defs from the
run-on-invoke body), so I did not wire this into gates/fastgate.sh's own harness or the regress suite -
built a standalone before/after reproduction of the two candidate lines instead (mktemp shimmed to always
fail via PATH override): OLD line reports "could not create a base worktree at deadbeef" (wrong cause,
reproducing the defect); NEW line reports "mktemp -d failed - could not create a temp directory for the
base worktree" (right cause). With mktemp working and worktree-add failing, OLD and NEW report the
unchanged message identically, so the pre-existing behaviour on that path is preserved.

Not checked: whether any other gates/*.sh file beyond gates/gates.sh:59 (already filed) carries the same
unchecked-mktemp shape; the job's own notChecked field asks the same question and I did not extend it.
Did not run gates/gates.sh or gates/fastgate.sh itself end to end - no app.js change, no bundle built,
std.appChanged null not false.

Parked at patches/proc-lane2-art-gates-fastgate-sh-ratchet-mktemp-2026-10-13 for the build lane's
integration slot. jobsClosed: [] - outcome built-not-delivered, not fixed; this lane holds no pen [R21].
