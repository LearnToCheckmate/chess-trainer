# #445run — the first full-suite run ever attempted on a NO-FLOOR control, and what it found before it died

Run `build__1790803179000`. Launched 21:35:01Z, **killed at 22:30:19Z at 38 of 47 gates** — see
"How it died" below; the cause was my own timeout, not the container.

## Why this was run

Both #442 and #444run listed the same item under `notChecked`: *"the other 46 gates on a no-floor
bundle, so 'removing the floor makes the suite green' is NOT established, only that those six clear."*
Every prior reading of the no-floor bundle was a **targeted run of gates 26 and 66 only**. The Desk
item drafted for Kunal promises, for outcome (ii): *"Six assertions in two gates go green on the
answer. Nothing else is red."* Nobody had tested that.

## Method

From the pile head `e74c7b8` (committed `app.js` md5 `0bbc5c85b1df`, stamp `#442 - 2026-09-30 13:26 ET`),
delete **only the four executable lines** of #441's mate floor — `chess.jsx:3686-3689`, the
`{const _isM=…}` block. The surrounding 16-line comment is not behaviour and was left in place; it is
stripped by minification either way. Then:

    CT_OUT=<tmp>/ctrl-nofloor.js CT_STAMP_TIME='2026-09-30 13:26' gates/build.sh '#442'
    #  -> control md5 c31a7ee506c9        (tree, floor ON: 0bbc5c85b1df)
    git checkout chess.jsx                # tree restored to CLEAN before the suite ran (0 modified)
    CT_APP=<tmp>/ctrl-nofloor.js CT_EXPECT='#442' gates/gates.sh '#442'

The two bundles differ **only** by that block, and both carry the same stamp, so md5 is what tells them
apart — which is the discrimination CLAUDE.md's #416 table already relies on.

## Result: #443run's mechanism reproduces; its COUNT does not

**Reproduced exactly, and this is the part that matters for the decision.** All five of the tree's
gate-26 reds are PASS on the control:

| assertion family | control |
|---|---|
| `rev-best-ply30` | 17 / 17 PASS |
| `rev-summary` occluded-controls pins | 39 / 39 PASS |
| `rev-summary` side-by-side-rows pins | 39 / 39 PASS |

And gate 66 on the control is **37 pass / 0 fail**, with B1 passing at `blackBlunder: 0`
(`445run-control-gate66-mate-floor-OFF.log`). So "gate 26's five reds and gate 66's B1 share one
cause, the mate floor" is confirmed on a **third independent reading**.

**Not reproduced: the count.** #443run published *"floor OFF: gate 26 = 364 pass / 0 FAIL"*. This run
gives `26-invariants: RED (exit 1, 1 FAIL lines)` — a **different** assertion, at one geometry only:

    FAIL short375: the set of distinct ICON glyph heights is exactly what #423 measured at 375px wide
      want [17,18,19,20,21,22,24,25,27,28]   got [16,17,...,28]   added:[16]   gone:[]

Both readings are from full-suite logs, same assertion, same geometry:

| bundle | `short375` icon heights | verdict |
|---|---|---|
| tree, floor ON `0bbc5c85b1df` | 10 (`17..28`) | PASS — committed `442-all.log:1359` |
| control, floor OFF `c31a7ee506c9` | **11, `16` added** | FAIL — `445run-control-…:1361` |

`se` reads 11 including 16 and PASSES on **both** (its pinned set already contains 16); `kunal730`
reads 10 and passes on both. **Only `short375` moves.**

## WHAT IS NOT ESTABLISHED, and must not be written up as though it were

**Whether removing the floor CAUSED the 16px icon.** There is a live competing explanation that one
run cannot exclude: `flags/gate26-screen-walk-can-revisit-and-skip-and-stays-green-2026-09-18` records
that gate 26's screen walk can revisit and skip screens, and this assertion reads the **set of icon
heights actually rendered during that walk**. A walk that reaches one extra screen adds a height with
no code change at all — and a 16px icon demonstrably already exists in the app, because `se` renders
it on both bundles. I have control n=1 and tree n=1. CLAUDE.md is explicit that a predicate whose value
depends on what a walk happens to reach is **not** settled by repeating the run once.

**The test that settles it**, and it must be sequential — never concurrent, because the suite lock
exists precisely because #418's two overlapping runs produced collage logs:

    for i in 1 2 3; do CT_APP=<control>  node gates/regress/26-invariants.js; done
    for i in 1 2 3; do CT_APP=./app.js   node gates/regress/26-invariants.js; done

- `added:[16]` on all three control runs and none of the three tree runs → floor-caused, and outcome
  (ii) has a consequence Kunal has not been told about.
- `added:[16]` on some runs of either bundle → it is the walk, and the finding becomes a flakiness
  finding against an assertion that currently presents itself as a drift guard. **Also** worth having,
  because then gate 26 cannot certify either outcome.

Either way **the Desk item's wording has to change**, which is the actionable half and does not wait on
the disambiguation. Filed as
`jobs/the-no-floor-control-is-not-green-and-the-desk-item-promises-kunal-that-it-is-2026-09-30`.

## How it died, and whose fault that was

Mine. I launched the suite as a harness-tracked background task with `timeout: 3300000` — 55 minutes —
when the allowed maximum is 7200000. #419 measured a clean full suite at 43m44s, so 55 looked ample;
this run was slower and was at 38 of 47 when the limit cut it. **It was not the container**: the
documented SIGKILL-across-an-idle-turn failure leaves the lock behind un-trapped, and here the trap
ran and `gates/logs/.suite.lock` was gone, i.e. an orderly termination. Nine gates never ran
(`57-pz-solved-explanation` onward), so there is **no terminal verdict** and this log cannot and must
not be read as one. `verify-log.sh` refuses it correctly, for the right reason: no `GATES GREEN`.

What the watcher got right, for once, is worth recording: the monitor's first version tested liveness
with `pgrep -f 'gates\.sh'`, whose pattern **matches the watcher's own command line** — the #407/#416
self-reference trap, which would have made DEATH unfireable and left silence looking like progress. It
was caught before it mattered and re-armed against the lock's PID, the way `gates.sh` itself does with
`kill -0`. The corrected watcher **did** emit `DEATH: suite pid 1897 gone, no GATES verdict, gates
38/47`.

## Not checked

- The last nine gates on the no-floor control (`57` onward). The `notChecked` item this run set out to
  retire is therefore **narrowed, not closed**: 38 of 47 gates measured, plus gate 66 run separately.
- The disambiguation above. Control n=1, tree n=1.
- Nothing on the floor-ON tree was re-run; its figures are the committed `442-all.log`.
