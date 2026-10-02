# 459-gate17-black-to-move.patch — admission-ready, deliberately NOT applied at #459

Apply with `git apply claude/agents/patches/459-gate17-black-to-move.patch` from the repo root, then run
the FULL suite. It adds three assertions to `gates/regress/17-drill-grade-arithmetic.js` and removes none.

## What it closes

Job `457-drill-sentence-ladders-eat-their-own-lead-candidate-2026-10-02`, work item 8. Gate 17's fixture
loop keeps a position only when `ply%2===0`, so all 8 of its fixtures are WHITE to move and the
mover's-frame arm of `gradeDrillMove`'s subtraction — the `maxing?(vBest-vPlay):(vPlay-vBest)` ternary at
`chess.jsx:980`, the arm this gate's own header says cost #426 a wrong sentence — executes ZERO times.

The patch adds a SEPARATE Black-to-move fixture set rather than widening `POS`, so it cannot move any count
in A0..A4. Measured at chess.jsx `f54e39ea571d`: A2c derives 6 fixtures (turns `bbbbbb`), A2d grades 182
Black-to-move non-mating moves, A3c reads 10 Best against 10 at Black's own ranking minimum.

## Why it is not in the suite yet, stated plainly

NOT because it is unproven. It is green, it is controlled, and it is deterministic. It is held out purely
because of WHEN it was finished: the #459 suite had already logged its section 17 against the 26-assertion
version of the file, so admitting it would have left the committed gate different from the gate the green
log describes — and the only honest way to fix that is another full ~44-minute suite, which would have put
the three P0 fixes #459 actually shipped at the mercy of a re-run (see `flags/451-gates-red-on-a-known-
nondeterministic-invariant`). Trading a shipped P0 for a coverage gain is the wrong way round.

It is **not** in `gates/pending/` on purpose: that directory's own README says it is only for a gate blocked
on a decision Kunal has not made, and this one is blocked on nothing.

## Evidence, so the next run does not re-derive it

- **Green**: 29 PASS / 0 FAIL on `f54e39ea571d`.
- **Determinism (R36)**: three consecutive runs, byte-identical numbers (6 / 182 / 10 each time).
- **Negative control**: flip ONLY the non-maximising arm at `chess.jsx:980` to `maxing?(vBest-vPlay):(vBest-vPlay)`
  — White untouched — and **A3c goes red at 182 Best against 10**, while A2b and A3 (the White assertions)
  stay green. So the block sees a defect the existing gate cannot.

## THE FINDING THAT CAME OUT OF BUILDING IT, which is worth more than the patch

Two drafts of a fourth assertion, "no Black-to-move move has a negative loss", were written and both were
killed by that control:

1. Reading `gr.loss` — `gradeDrillMove` clamps with `Math.max(0,...)`, so `gr.loss<0` is **unsatisfiable in
   every build**. It stayed green at 0 of 182 with the sign deliberately flipped.
2. Reading a raw gap the gate computes itself from the ranking — which never consults the app's ternary at
   all, so it stayed green on the same control for the opposite reason.

**The clamp destroys the evidence**: a wrong sign cannot be observed through the loss, only through its
consequence, and that consequence is A3c. So there is no A3b in this patch and its absence is deliberate.

**AND THE SAME SHAPE IS ALREADY IN THE SUITE AND IS NOT MINE.** `A2b` asserts "no graded move has a negative
loss" over that same clamped value for White, and it cannot fail either — confirmed green above with the
arithmetic broken. `A4a`, which recomputes #456's RAW arithmetic, is what actually carries that load. Filed
as `jobs/gate-17-a2b-asserts-a-clamped-value-so-it-cannot-fail-2026-10-02` rather than rewritten here,
because it is a pre-existing assertion and its author should see it.
