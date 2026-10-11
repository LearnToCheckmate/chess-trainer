# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#515**, runId `build__1791688900717`, 2026-10-11. Pen taken free on a clean release (fourth
consecutive) and released at close-out.

## *** #515 SHIPPED NOTHING TO MAIN, AND THAT IS THE OUTCOME RATHER THAN A STAND-DOWN FROM WORK ***

`origin/main` is **87b432a** at both ends of this run, still serving bundle **f47aa0197967** stamped
`#511 - 2026-10-10 07:40 ET`. `appChanged` **no** — fourth build running with no application change.
**No full suite was launched, deliberately:** the tree carries no shippable change, and spending ~100
minutes to certify a bundle byte-identical to the one #514 gated green two hours earlier buys nothing.
Stated plainly so this is not read as a suite skipped under time pressure.

## What #515 did, in one line

Took the band-16 lesson-board latch, **established the mechanism completely**, built the two fixes the
record pointed at, **had both falsified by gate 48**, and closed the whole measurement route with a reason
rather than a shrug — leaving one question for Kunal and no further investigation for the next run.

## *** READ THIS BEFORE YOU TOUCH THE FIT LOOP: THE MEASUREMENT ROUTE IS CLOSED ***

The cause fingerprint `94a2c0fe0b10aab2` re-opened a measurement-based fix ("a loop that compared that
panel's box to its own content would see the slack `over` structurally cannot"). **It does not work, and not
just in my two attempts.** The fit loop's whole job is to make the board consume the free space, so

    free  ==  viewport − board − chrome

and therefore **every** reading of free space moves exactly as `−Δboard`, whether the board's current size
is correct or latched. Two measurements already on record make the coupling exact: the fingerprint has the
moves panel going `74.13 → 90.13` at 375x568, "+16.00, EXACTLY the board lost", and gate 48 has the inverse,
"the panel falls from 98.13px to 74.13px and the board takes those 24px back". So the absorber is a **mirror
of the quantity under test** — #389's "a cross-check fed by the thing under test is not a cross-check" — and
measuring one level deeper, or summing min-content heights, reduces to the same complement.

The information the loop needs is **historical**: was this trim added for content that has since left the
flow? No instantaneous measurement contains it.

### The two forms and their figures, so nobody rebuilds either

| form | gate 75 (the latch) | gate 48 (the board pins) | why it failed |
|---|---|---|---|
| base = main | 60 / 4 | green, 353 PASS | the latch, live |
| v1 absolute | **64 / 0** | **RED, 3 FAIL** | handed the practice board 8.00 of the 16.0px practice chrome legitimately takes at 320x568 (pinned 254.9, measured 262.9) |
| v2 delta | **64 / 0** | **RED, 352 / 1** | moves the **demo** board +8.00px at 320x540 and 375x568 and costs 320x540's practice 8.00px — the reclamation I had excluded, because slack rises on every ordinary settle |

**Gate 75 passed v2 and could not see its regression**, because every block compares clean against injected
*within one bundle*, so a uniform shift of its own baseline is invisible to it. Its own header says it
carries no expected board width. A self-controlled assertion is immune to container drift and blind to a
baseline shift; those are the same property.

## THE ONE FINDING A FUTURE FIX MUST ACT ON

**The loop's RE-ARM is blind for the same structural reason its measurement is.** `chess.jsx:3115`'s #364
ResizeObserver watches `rootRef` and tests its contentRect height, which **is** the viewport, because
`#root` has exactly one in-flow child whose height equals it — measured 540.00 at 320x540 and 568.00 at
375x568, root height identical. So `setFitBump` can **never** fire in portrait and once the loop spends its
36 passes nothing wakes it. That is why the latch is permanent rather than slow to clear, and why no
threshold or deadband change could ever have worked. **Two of the job's three prescribed "one-liners" are now
retired for a second, independent reason.**

Also measured, and it is the number that separates this job from the reclamation one:
**`boardTrim` is 104.01 in the clean settled state at 320x540**, not 0 (widthCap 320, heightCap
540*0.66−16 = 340.40, `_edge` true so `boardPx == _cap`, clean board 236.39). Any fix whose safety argument
is "trim is 0 when clean, so this cannot fire" is resting on a false premise.

## WHAT THE NEXT RUN SHOULD NOT DO

1. **Do not re-attempt a slack- or free-space-based signal in any form.** See above.
2. **Do not add** "on a shrink at or below base, null the base and re-learn it" as an oscillation guard. It
   **silently disables the fix**: the shrink happens while the transient is still in the flow, so the base is
   re-recorded at the inflated trim and the board never comes back, while every gate still passes. I wrote
   it, traced the real sequence and reverted it unbuilt.
3. **Do not re-pin gate 48's board numbers to get green.** They are measured identities with derivations —
   254.9 at 320x568 is #430's own arithmetic, and the latched 212.39 at 320x540 re-opens the overflow #430
   closed.
4. **Do not promote `gates/pending/75-fit-loop-one-way-ratchet.js`.** It reds on main by design and its
   manifest row stays `absent`; promoting it without a fix blocks every push on a tree no build broke.

## WHAT IS OWED, AND IT IS ONE QUESTION

`jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29` now reads `outcome: cannot`. The surviving route —
re-derive the trim on a content change instead of settling from the current value — is **sound and is not
this lane's call**: it trades directly against #355's stated reason for settling from the current trim ("or
the board visibly jumps to full size and back on every single move, which is exactly what Kunal saw"). Two
of his own rulings pull opposite ways, which is R45's shape.

Routed as **`jobs/route-to-desk-the-fit-loop-latch-needs-a-one-frame-jump-he-has-to-price-2026-10-11`**
(owningLane orchestrator). The question: *on a lesson content change, is a one-frame board jump back to full
size acceptable, in exchange for the board never staying 16–79px small for the rest of a visit?* The latch
costs **78.88px (29%)** at 375x568 on an 88px transient and reaches his own phone at **29.20px**; the fix's
cost is **not measured** and that is said rather than estimated.

## HOUSEKEEPING THE NEXT RUN WILL SEE

- **The build-number halves will disagree, and the higher is right.** #515 is minted in both halves but its
  register row is **not on main**, because nothing was pushed there. So `gates/buildnum.sh next` will answer
  **515** while `docs/buildnumber` answers **516**. Take **516**. This is the two-halves mechanism working,
  not a defect to re-file — fifth instance in the repository-stale direction.
- **No `held-trees.tsv` row, deliberately.** That register holds gated-GREEN trees that must not ship; mine
  is red and `verify-log.sh` already refuses it. A row keyed on my sourceMd5 would make `held.sh check`
  refuse the very tree a later run should read and discard.
- **The work is on `claude/practical-sagan-1hptj6` at `4c563e8`**, two commits, each carrying its own
  falsification in its message. Read it for the findings; do not rebuild it.
- **Three `status: duplicate` jobs sit in this lane's WIP** (R05c retired that word on 2026-10-11), inflating
  the count by three. Named on the ledger row; not mine to relabel.
- **The auditor did not run — fourteenth consecutive build.** My own scheduling choice.
- Still live from previous runs: the live site is blocked by the egress proxy so no run from this container
  can verify the deployed app; `gate 50` is in `gates/pending/`; and the known-absent gates mean every
  `GATES GREEN` here is honest and blind in exactly those places.
