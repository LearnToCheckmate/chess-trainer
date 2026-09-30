# The whole red surface blocking the push is ONE 20-line block, measured

Run `build__1790796015749`, 2026-09-30, on `claude/cool-noether-r1k2ir` at `27fab23`
(24 commits ahead of `origin/main` = `1f6939e` = #439).

## What was believed before this run

Two separate reds, one owned and one not:

- **gate 66 B1** — red because #441's mate floor contradicts an assertion #440 shipped.
  Routed to the orchestrator as Kunal's decision. Correctly not touched by three runs.
- **gate 26, five assertions** — red, cause unknown. #442 established they reproduce on
  #441's head too (so not #442's), published two attributions and withdrew both, and left
  the job saying the missing fact was "which of the ten grade rows carried `0|3`".

So the tree looked like it carried *one routed decision* plus *one unattributed P1 that
somebody would have to root-cause before any push*.

## The experiment

Two bundles from this tree, built by the same `gates/build.sh` with the same
`CT_STAMP_TIME`, differing by **exactly one thing**: the 20-line `#441` mate-floor block
at `chess.jsx:3670-3689` present or absent. Built with `CT_OUT` so the repo's `app.js` and
`chess.jsx` were never touched — `chess.jsx` md5 `55288417624afe074bbacdefb2946dde` before
and after, `git diff` empty.

| bundle | md5 | gate 26 | gate 66 |
|---|---|---|---|
| mate floor **ON** (the tree as handed over) | `a37cb9f9550b` | 359 pass / **5 FAIL** | 36 pass / **1 FAIL** |
| mate floor **OFF** (control)                | `ab8a39564665` | **364 pass / 0 FAIL** | **37 pass / 0 FAIL** |

`364 = 359 + 5`. The five that fail are exactly the five named in the job —
`kunal730 rev-summary`, `short375 rev-summary`, `se rev-summary`, `se rev-best-ply30`,
`short375 rev-best-ply30` — and removing the floor turns those five green **and changes
no other assertion in the gate**. Gate 66's single failure is `B1 Black, who is being
mated, is charged with NO blunder (#439 charged 1)`, payload `{"blackBlunder":1}`, and it
clears the same way.

The prediction was written down before the control finished
(`PREDICTION.txt`, pre-registered at 19:30Z) and named the mechanism from gate 26's own
note (b) at lines 524-535: the grade table is ten White|Black pairs, the scanner counts a
pair as a row only while both numbers sit side by side, and the floor moves Black's
Inaccuracy 3→2 and Blunder 0→1 on the Opera Game. It also named what a red control would
have meant — a second, unowned defect — which is the answer this run was most afraid of.

## What this changes

**The gate-26 job is not independent work, and it must not be re-pinned yet.**

Its five pins cannot be *correctly* re-derived until Kunal answers gate 66, because the
right pin depends on his answer:

- if the floor **stays**, the pins are stale and must move to 9 / 4 / 23 with the grade
  label named beside each;
- if the floor **goes**, the pins at 10 / 5 / 25 are already right and must not be touched.

Re-pinning now is a coin flip that would look like diligence either way. That is the
#405 frozen-denominator trap wearing a new costume: not a number bumped to match a build,
but a number bumped to match a build *that has not been decided on yet*.

**And the ask to Kunal is much cheaper than it looked.** It is not "one gate assertion
disagrees with the build". It is: *one sentence from you turns six assertions in two gates
green and releases 24 commits, including two P0 fixes, to main.* Nothing else is red.

## What was NOT checked

- **The other 46 gates were not re-run on the no-floor bundle.** With the floor ON, #442's
  full suite had everything except these six green (48 sections / 3108 PASS / 12 FAIL —
  12 lines, 6 distinct assertions, gate 26 walks twice). Whether removing the floor
  reddens something else is **untested here**. It is *likely* green, because #441's own
  green suite (47 suites / 3097 PASS / 0 fail) was measured on a pre-floor bundle — but
  that is a different tree and is evidence, not proof. Only a full suite settles it.
- Whether the floor is *right*. That is the decision, and it is not this lane's.
- The per-card provenance of the 23 preview-gallery cards (see the separate job).

## Build number hygiene

The two control bundles were stamped `#443` because `gates/build.sh` requires a
`#NNN` argument. **No build number was issued and #443 is still free.** Neither bundle was
ever copied to `app.js`, committed, or served outside these two gate runs; both live only
in the run's scratch directory, which dies with the container. Recorded because CLAUDE.md
says two trees carrying one number cost a rebase at #375.

## Addendum, same run: the pile is sound, and this is the first time anyone checked

`jobs/a-run-must-not-hand-over-a-tree-its-own-gate-log-refuses-2026-09-30` exists because
#441 rebuilt `app.js` after its green suite, so its log described a bundle that no longer
existed and the next two runs paid for it. The obvious question nobody had actually asked
is whether #442 did the same thing. **It did not.**

Rebuilt the committed `chess.jsx` with `gates/build.sh '#442'` and
`CT_STAMP_TIME='2026-09-30 13:26'`, the stamp `app.js` itself carries:

```
BUILD OK: #442 - 2026-09-30 13:26 ET   bytes=954908  md5=0bbc5c85b1df
repo app.js                            bytes=954908  md5=0bbc5c85b1df
cmp: identical
```

So the committed bundle reproduces **byte for byte** from the committed source. And
`gates/verify-log.sh claude/agents/gatelogs/442-all.log '#442'` refuses the log for one
reason only — `last line: GATES RED #442` — and gives the *same* verdict with and without
`--this-bundle`, i.e. it is refused for being **red**, not for describing a different
bundle.

**What that means for whoever pushes.** The 24-commit pile is not carrying a hidden
mismatch. When Kunal answers, the remaining work is exactly three things and no
archaeology: re-pin gate 26's three `rev-summary` counts (and tighten or drop the two
`rev-best-ply30` pins) *in the direction his answer chooses*, rewrite gate 66's B1 with a
re-derived rationale if the floor stays, and run one full suite. Nothing else is red.

The check cost about ninety seconds. It is written down because the rule it tests has
existed for two hours and had never once been *run* as a check.
