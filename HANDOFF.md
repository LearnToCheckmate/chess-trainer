# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#519**, runId `build__1791943111789`, 2026-10-14. Pen taken free on a clean release (ninth
consecutive) and released at close-out.

## *** READ THIS FIRST: NOTHING SHIPPED, AND THE GATE IS ALMOST CERTAINLY PAUSED AGAIN ***

#519 ran under the **SECOND one-run opening** of Tue 13 Oct (`docs/restart-readiness.oneRunOpening2_2026_10_13`),
opened 9:50pm ET on Kunal's word, **inside the 13 Oct usage pause, which is untouched and still in force**.
That opening's own `closeRule` sets the gate back to **PAUSED** as soon as the pen is taken. **So the next
fire almost certainly stands down at STEP ZERO, and that is correct, not a fault.** Do not read anything
here as the fleet being open.

**`origin/main` is UNCHANGED at `c6c50cc`.** There is no `GATES GREEN #519`, no gate log, and no bundle.
The full suite was never launched. Do not look for one and do not cite one.

## *** THE WORK IS SAFE ON ORIGIN AND NEEDS NO REBUILD ***

`origin/claude/practical-sagan-vg8hxx` at **`4d9b2443ee62`**, 4 commits ahead of main, 0 behind:
three commits of `patches/orch-art-gates-buildnum-sh-delta-bound-reland-2026-10-13` applied by
`git am --3way` (blobs `b3a7e73870` and `8add8de1c0`, exactly as that document predicts) plus the
`#519` mint register row. **NO APPLICATION CODE:** `app.js` `f47aa0197967`, `chess.jsx` `b6b7fbb25df0`,
`index.html` `4a95e865bca8`, all byte-identical to main.

## *** WHY IT WAS HELD: AN UPHELD BLIND-ANTAGONIST VETO, AND THE CAUSE IS ONE THING ***

`delta_ok()` compares `highest()` against the second-highest **distinct** number. A lone high row fires it
correctly. **Two adjacent high rows have each other, the delta collapses to 1, and the bound is silent** —
and `gates/buildnum.sh sweep --add` writes exactly that pair in **one command**, while `gates/build.sh:188`
runs `sweep` on **every build** and `:193` prints `sweep --add` as the remedy. Reproduced in a throwaway
clone: `next` → **#1001 at exit 0, no diagnostic**, `mint` hands it out, **481 numbers burned** — the
incident the job exists to prevent, surviving the fix.

Both antagonists found that cause independently from different doors, which is why it was upheld.
The disposition was **pre-committed**: the opening's `takeNothingElse` says an upheld antagonist veto means
push nothing, record, release the pen, stop.

## *** WHAT IS PROVEN, SO THE NEXT RUN DOES NOT PAY FOR IT AGAIN ***

- The defect reproduces **on base**: `next` #519 → **#1000 at exit 0, silent**, on one well-formed 999 row.
- All four R08 controls pass with the series applied, plus a boundary control: **delta 10 accepted, 11 refused**.
- `gates/buildnum-selftest.sh`: **86/0 on main, 98/0 at head**, zero failures either side, **identical verdicts
  across three consecutive runs** [R36] (only the `mktemp` path and three throwaway-register hashes vary).
- **The margin is sound and the bound would never have misfired on real history:** the register's distinct-number
  gap distribution is 1×379, 2×4, 3×1, 4×1 — **max gap 4** against a margin of 10 — and replaying every prefix
  through the predicate fires it zero times. **Do not rebuild the bound. It needs a different baseline, not a redesign.**
- The fixture fault that caused #518's revert is correctly undone: cases 9–13 keep their numbers byte for byte,
  case 14 has its own register, nearest fixture number `#777` is 258 builds away.
- `fastgate` exit **2 GO FULL**; `held.sh check` **not held**; `gatemanifest check` **58/58, 0 missing**;
  R19 audit A1 **25 before, 25 after**; harness md5-frozen before and byte-identical after.

## *** THE REMAINDER IS ON THE JOB, AND THERE ARE SIX STEPS ***

`jobs/buildnum-highest-has-no-plausibility-bound-so-one-appended-row-wedges-minting-2026-10-10`,
`outcome.value` **"cannot"**, with the old `built-not-delivered` object moved unchanged into `outcomeHistory`
[R05 second-pass rule]. Its `outcome.whatIsLeft` is the whole procedure: a cluster-robust baseline, bound
`sweep --add`, wire `check` to `delta_ok`, replace the unachievable remedy string and the header's
"add the intermediate numbers first" paragraph, add control cases for the pair and sweep shapes, and deal with
the **pre-existing `absent: 999 1000`** on main.

## *** TWO THINGS ON MAIN TODAY THAT ARE NOT MINE AND ARE LIVE ***

1. **`sweep --report` on main exits 3 with `absent: 519 999 1000`** (now 999/1000 after my mint recorded 519).
   `#999`/`#1000` come from `ded2b2b`, #518's own reverted commit subject. Any operator who follows the printed
   remedy burns 481 numbers **whether or not this bound is installed.**
2. **`gates/held.sh` cannot name a gates-only tree.** All three of its keys are main's own values when no bundle
   changes, so writing a hold would make `verify-log.sh` refuse every future log over main's shipped bundle.
   I did **not** write one, deliberately — see `builds/519`.

## Standing warnings carried forward

- **The auditor has not run for EIGHT consecutive builds**, and the live site stays unverifiable from this
  container behind the egress proxy, so no run here has checked the deployed bundle against the committed one.
- `gates/records-gate.sh`'s new PARSE STABILITY arm must **not** be credited as closing its job, and
  `held-trees.tsv` / `build-numbers.tsv` must **not** leave `classify()`'s FORCE arm on its strength (#518's
  upheld veto). I made no such claim and moved no FORCE arm.
- Antagonist A's rotating audit found **four findings in `gates/regress/20-review.js`** that are not yet jobs,
  because `takeNothingElse` forbade filing: `:102` is vacuous on three broken-bundle shapes, `:67` is keyed to a
  selector its own commit added, `:90` asserts DOM existence where its own sibling checks paint, and `:70`
  publishes a 30×28 tap target against this project's documented 44pt bar. They are on `flags/antagonist-a-519`
  and routed to the orchestrator. **Next rotating pass resumes at `20-review.js:114`.**
