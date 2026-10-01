# #446run — the test that settles whether the no-floor control's last red is the floor or the walk

**Run** `build__1790810415632` · **started** 2026-09-30T23:20:15Z · **branch** `claude/cool-noether-gccllp`
**Pile head under test** `379857b` (32 commits ahead of `origin/main` `1f6939e`, 0 behind — a clean fast-forward)

## Why this run exists

`jobs/the-no-floor-control-is-not-green-and-the-desk-item-promises-kunal-that-it-is-2026-09-30` (P1, owningLane
build) was opened by the previous run with an explicit experiment in its `theTestThatSettlesIt` field, and R05
puts a job routed to my own lane first. The experiment matters because **eight consecutive builds have now stood
down on the push** and the tracker was about to tell Kunal that one of his three options is free.

The previous run measured, with n=1 on each side, that removing #441's mate floor turns gate 26's five known reds
green and introduces **one different red**: invariant 3's icon-drift guard at `short375`, `added:[16]`. It
deliberately did **not** claim the floor caused it, because gate 26's screen walk has a recorded
revisit/skip defect (`flags/gate26-screen-walk-can-revisit-and-skip-and-stays-green-2026-09-18`) and that
assertion reads the SET of icon glyph heights the walk actually rendered — so one extra screen adds a height with
no code change at all. A 16px icon already exists in the app: `se` renders it on **both** bundles and its pinned
`want` includes it.

## Provenance of the two bundles, re-derived rather than inherited

| | md5 | how |
|---|---|---|
| committed `app.js` at the pile head | `0bbc5c85b1df` | in the tree |
| rebuilt from `chess.jsx` at the pile head | `0bbc5c85b1df` | `CT_STAMP_TIME='2026-09-30 13:26' gates/build.sh '#442'` — **byte-identical**, so the tree is sound |
| control, floor OFF | `c31a7ee506c9` | delete only the 4 executable lines `chess.jsx:3686-3689`, rebuild, restore tree (`git status` 0 modified) |

Both md5s reproduce the previous run's figures exactly, so the two bundles are the same two bundles.

## The test

Gate 26 alone, **sequentially, never concurrently** (the suite lock exists because #418's two overlapping runs
produced collage logs), three runs per bundle:

```
CT_APP=<bundle> CT_EXPECT='#442' node gates/regress/26-invariants.js
```

    BUNDLE     RUN     PASS   FAIL   short375 icon set  |  drift-guard verdict at short375
    tree       run1    359    5      [17, 18, 19, 20, 21, 22, 24, 25, 27, 28]  PASS
    tree       run2    359    5      [17, 18, 19, 20, 21, 22, 24, 25, 27, 28]  PASS
    tree       run3    359    5      [17, 18, 19, 20, 21, 22, 24, 25, 27, 28]  PASS
    control    run1    364    0      [17, 18, 19, 20, 21, 22, 24, 25, 27, 28]  PASS
    control    run2    364    0      [17, 18, 19, 20, 21, 22, 24, 25, 27, 28]  PASS
    control    run3    364    0      [17, 18, 19, 20, 21, 22, 24, 25, 27, 28]  PASS
    

## The result

Six runs, strictly sequential, one gate, two bundles. Every run emitted 364 assertions, so nothing
was skipped on either side and the denominator never moved.

| bundle | md5 | run | pass | fail | `short375` icon set | drift guard |
|---|---|---|---|---|---|---|
| tree, floor ON | `0bbc5c85b1df` | 1 | 359 | 5 | `[17,18,19,20,21,22,24,25,27,28]` | PASS |
| tree, floor ON | `0bbc5c85b1df` | 2 | 359 | 5 | identical | PASS |
| tree, floor ON | `0bbc5c85b1df` | 3 | 359 | 5 | identical | PASS |
| control, floor OFF | `c31a7ee506c9` | 1 | **364** | **0** | `[17,18,19,20,21,22,24,25,27,28]` | PASS |
| control, floor OFF | `c31a7ee506c9` | 2 | **364** | **0** | identical | PASS |
| control, floor OFF | `c31a7ee506c9` | 3 | **364** | **0** | identical | PASS |

## What this settles

**1. `added:[16]` IS NOT FLOOR-CAUSED, and it is not reproducible at all in this method.** The
previous run's own decision rule was: "If `added:[16]` at `short375` appears on all three control runs
and none of the three tree runs, it is floor-caused... If it appears on some runs of either bundle, it
is the walk." It appeared on **none of the six**. So neither branch of that rule fires as written,
and the correct verdict is the stronger one: on the same bundle, by md5, the assertion has now been
observed both ways.

**2. The two readings that disagree differ by METHOD, not by bundle.** Both are on `c31a7ee506c9`:

| reading | method | `short375` | gate 26 |
|---|---|---|---|
| #445run, `445run-control-PARTIAL-38of47-mate-floor-OFF.log:1348` | inside a 47-gate suite, gate 26 running 26th | **11**, including 16 | 363 pass / **1 fail** |
| this run, three times | standalone `node gates/regress/26-invariants.js` | **10** | 364 pass / **0 fail** |

**3. And it is not a plain suite-vs-standalone effect, because the TREE reads 10 under both methods**
— `442-all.log:1347` is a full-suite run of the floor-ON bundle and gives 10 at `short375`, the same as
my three standalone tree runs. So the disagreement is an interaction that appears only on the no-floor
bundle inside a full suite. I have n=1 on that cell and I am not going to claim a mechanism for it.

## What follows for the decision, which I did not touch

The Desk item owed on `jobs/gate-66-b1-and-the-mate-floor-disagree-...` says, under `whatItUnblocks`,
"Six assertions in two gates go green on the answer. Nothing else is red." The previous run corrected
that to FALSE for outcome (ii). **On this evidence the correction itself needs correcting, and the
honest wording is neither of the two so far:**

> For outcome (ii), gate 26 has been measured GREEN three times standalone and RED once inside a full
> suite, on one bundle identified by md5. Nothing else is red in either reading. Whether a full suite
> on the no-floor bundle ends green is still unmeasured, because the only attempt was killed at 38 of 47.

That is the sentence that should reach Kunal. It does not favour any of the three outcomes, which is
the point: **the outcome he is being asked to choose between is not the thing in doubt — the instrument is.**

## The finding this actually produces

`gates/regress/26-invariants.js`'s invariant-3 drift guard at `short375` can return two different
values for one bundle depending on the context it runs in, so **it cannot certify either side of the
mate-floor decision**, and it is a pin the suite currently treats as a drift guard. That is the
"ALSO worth having" branch the previous run named in advance, and it is worse than the flakiness it
predicted: a drift guard that is context-sensitive will fire on whoever happens to run a full suite next
and will clear for whoever re-checks it standalone, which is the most expensive shape a red can have.

## Not checked, stated plainly

- **A full 47-gate suite on the no-floor control.** Still never completed: #445run's was killed at 38/47.
  This run did not attempt it and could not have inside its budget.
- **Whether gate 26 inside a full suite reproduces `added:[16]` on the control a second time.** n=1, and
  re-deriving it costs a ~44-minute suite.
- **The mate-floor question itself.** Untouched, and not mine [R32]. B1 not touched, the floor not dropped,
  gate 26's pins not re-pinned, the Desk item not written.
- **The other 46 gates on the control**, unchanged as a standing item.
