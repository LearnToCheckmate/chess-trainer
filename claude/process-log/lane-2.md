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

## 2026-10-14, 11:52pm ET, 13 Oct - process-build lane 2, runId process-build-2__1791949713906

RECUT-ONLY RUN per schedule/process-build-2 handFired_2026-10-14, hand-fired by the orchestrator on
Kunal's instruction in chat (~11:15pm ET, 13 Oct): "switch on a lane just to recut the items that need
to be recut. Don't let them work on anything else." No job taken from the queue; steps 2b, 2c and 3
skipped per the fire instruction.

ITEMS ASSIGNED: (2a) proc-lane2-art-gates-audit-pipefail-grep-sh-2026-10-07 AND
proc-lane2-art-gates-audit-pipefail-grep-sh-measured-tier-2026-10-08; (2b)
proc-lane2-art-gates-verify-log-sh-arm5-readguard-2026-10-10.

(2a) MEASURED SUPERSEDED, NOT RE-CUT. gates/audit/pipefail-grep.sh already exists on origin/main
c6c50cc (added by build commit 5999484 "process: blocker (1) of build #499's batch...", refined by
187682f "#506 veto fixes..."). The measured-tier controls (2008-10-08's own payload) are also already
present on main: `grep -n "C10..C15"` in the live file on main returns the exact same control ids
(C10 the probe measures cat as PROPAGATING, C11 tr NOT propagating, C12 discriminating power, C13/C14
the discriminator, C15 the mutation control) that proc-lane2-art-gates-audit-pipefail-grep-sh-measured-tier-2026-10-08's
own notes describe adding. Both old patch documents' integrationResult517/518 already recorded
ADD-vs-MODIFY collisions against bases that no longer resolve - consistent with the work having
already landed through the build lane's own consolidated payload route rather than through either of
these two parked documents. Wrote `supersededBy` on both old documents naming commit 5999484 (and
187682f) with this evidence; no new patch parked for (2a).

(2b) RE-CUT AND PARKED. gates/verify-log.sh arm (5)'s A5READ read-guard was confirmed ABSENT from
origin/main c6c50cc by direct grep (`grep -n A5READ gates/verify-log.sh` on pristine main: no match;
the two fall-advice branches at the old line numbers still echo unconditionally). Original patch's
base e8af040 does not resolve in this clone (matches integrationResult517/518's own refusal cause).
Applied the same diff by hand against current main (exact string match on both anchor points -
"C16b the real register is read: story headings > 0" and the A5ZRISE=0 block - both present
byte-identical on main, so the hand-apply is the same change the original patch specified, not a
reinterpretation). Measured: gates/verify-log.sh --citations-selftest 39 pass / 0 fail (baseline on
pristine c6c50cc) -> 47 pass / 0 fail (after), all 8 new controls (C17, C17b, C17c, C17c-b, C17c-c,
C17d, C17d-b, C17e) passing; the real register's --citations summary line is byte-identical before
and after ("(5) 66 case row(s) in 5 table(s), 35 story heading(s), 8 at zero cases (ceiling 9), 2
wrong-width row(s) (ceiling 2)..."), confirming the guard changes nothing on the tree that ships.
`bash -n gates/verify-log.sh` clean. Parked as patches/proc-lane2-art-gates-verify-log-sh-arm5-readguard-recut-2026-10-14,
`supersedes` naming the 2026-10-10 original, `supersededBy` written on the original. Artefact lock
claims/art-gates-verify-log-sh taken over from the stale parked-unlanded entry (`takeoverFrom` set)
and re-claimed under this run's runId.

NOT RE-CUT, PER INSTRUCTION: proc-lane1-art-gates-buildnum-sh-record-idempotence-2026-10-13,
proc-lane2-art-gates-buildnum-sh-2026-10-11 (wait for the build-number fix to land first);
proc-lane2-art-gates-regress-67-sel-cls-consumers-js-2026-10-13,
proc-lane4-art-gates-regress-65-promotion-after-gameover-js-blockk-2026-10-10 (need rework, not
a recut); ta-art-claude-stories-TEST-CASES-md-hm-051-rows-2026-10-13 (test-authoring's own);
orch-art-gates-buildnum-sh-delta-bound-reland-2026-10-13 (the orchestrator's own).

NOT CHECKED: full gate suite not run (no pen held, 45-minute budget); the wider pipefail-grep.sh
tier-B breach visible on current main (39 of ceiling 23, well over) was observed incidentally while
checking (2a) but is NOT this run's to fix - it belongs to whichever job already owns gates/audit/pipefail-grep.sh
on current main, and is named here rather than worked, since this run's instruction was recut-only
on the two named items.
