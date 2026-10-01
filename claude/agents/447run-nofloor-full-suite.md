# #447run — the full suite on the no-floor control, and the push nine runs left on the table

`build__1790814028000`, session `session_019nmMV8MxYXa466nxxpRW6f`, 2026-10-01.

## Two things, and the second one was not on the agenda

**(1) The handed-over measurement.** `jobs/gate-26-invariant-3-short375-returns-two-values-for-one-bundle-2026-09-30`
asks for one thing first: reproduce the `11` by running gate 26 **inside a full suite** on the no-floor control
`c31a7ee506c9`. That run is also the lane's oldest standing `notChecked` item — every prior reading of the no-floor
bundle was a targeted run of gates 26 and 66 only, and the one full attempt (#445run) **died at 38 of 47**.

**(2) The push.** While that ran, I checked whether the pile's red was separable. It was, entirely, and the finding
is in `CLAUDE.md` and `jobs/a-red-pile-head-is-not-a-red-pile-2026-10-01`. See `RUN-LOG.md`'s #441 row.

## Method for (1)

Control rebuilt from the pile head by the recorded recipe — delete only the four executable lines of #441's mate
floor (`chess.jsx:3686-3689`, the `{const _isM=…}` block; the 16-line comment is not behaviour and minification
strips it either way), then:

```
CT_OUT=<tmp>/ctrl-nofloor.js CT_STAMP_TIME='2026-09-30 13:26' gates/build.sh '#442'
git checkout chess.jsx          # tree restored to 0 modified BEFORE the suite ran
CT_APP=<tmp>/ctrl-nofloor.js CT_EXPECT='#442' gates/gates.sh '#442'
```

**The rebuild reproduced md5 `c31a7ee506c9` exactly** — the third independent reproduction of that figure, after
#445run and #446run. The tree's own `app.js` was `0bbc5c85b1df` before and after, and `git status` was clean, so the
suite gated a bundle through `CT_APP` and never a dirty tree.

Launched detached with progress written to a FILE and watched by a `Monitor` whose filter covers death as well as
progress — not a `pgrep` pattern, which is the self-reference trap this repo records at #407, #416 and #445run, and
not an unwatched background run, which is how #419 was SIGKILLed twice at 11 and 7 of 36 gates.

## Result: GATES GREEN, first completion, and the 11 does not reproduce

```
GATES GREEN #442    48 suites (47 gates + mountcheck)    3114 PASS / 0 fail
verify-log.sh gates/logs/442-all.log '#442'  ->  OK
bundle md5 c31a7ee506c9   HEAD 4307c97   01:32:12Z, 67 minutes wall
```

Committed as `claude/agents/gatelogs/447run-control-FULLSUITE-mate-floor-OFF.log` (4125 lines).

**`verify-log.sh` passes PLAIN only, and that is correct rather than a shortfall.** `--this-bundle` would be
refused, because the bundle under test is a `CT_APP` control and the repo's `app.js` is the pile head
`0bbc5c85b1df`. A control suite is not a push authorisation and this one is not offered as one.

### 1. The headline: the no-floor tree is green end to end

Every prior reading of this bundle was gates 26 and 66 only. This is the first complete one. **Nothing is red** —
not the six assertions #443run attributed to the floor, not gate 11, not `49-home`, not the landscape gates, and
notably **not `67-sel-cls-consumers` (17 PASS)**, which is the gate for the two P0s `#442` fixed.

### 2. `added:[16]` does not reproduce, in the configuration built to produce it

| reading | method | short375 icon heights | verdict |
|---|---|---|---|
| #443run | gate 26 alone | 10 | PASS |
| #445run | **26th gate of a 47-gate suite** | **11, `16` added** | **FAIL** — the only sighting, n=1 |
| #446run x3 | gate 26 alone | 10 | PASS x3 |
| **#447run (this)** | **26th gate of a 48-section suite** | **10, `added:[]`** | **PASS** |

`#446run` ruled out "the floor causes it" and left the live hypothesis as *suite-vs-standalone*. **That hypothesis
is now also falsified**: this run read 10 under the very method that produced the 11, on the same bundle by md5.
So the sighting stands at **1 occurrence in 2 full-suite attempts and 0 in 8 runs of the cell** across three runs.

**I claim no mechanism, and I am not closing the job on this.** One non-reproduction does not explain a prior
observation, and "it went away" is the most seductive wrong answer available here — the pin is *context-sensitive
or it is not*, and two conflicting readings plus six concordant ones is weaker evidence of a stable instrument
than it looks. What this does change is the **advice**: a run that meets a gate-26 `short375` red is now much more
likely to be looking at the rare reading than at a real drift, and `jobs/gate-26-invariant-3-...`'s standing
instruction — **do not re-pin it to 10 and do not re-pin it to 11** — is unaffected and still right.

### 3. What this settles for Kunal's decision, and what it does not

**Outcome (ii) — keep the pure chances rule, drop the floor — is now measured green across the whole suite.** That
was never established before; #445run's Desk wording claimed the opposite and #443run's claimed it without the
measurement. Outcome (i) — restore the floor — remains **un-gated**: no full suite has ever run on a floor-ON
bundle that is green, and `gate 66 B1` plus five of gate 26's pins would have to be reworked for it.

**That asymmetry is NOT an argument for (ii), and must not be presented to him as one.** It is an artefact of
which bundle this lane happened to build controls for. The two options are not equally measured, and the cheaper
one to ship is not therefore the right one — `HANDOFF.md` makes the point that this lane's own recommendation is
**(i)**.

## And a thing this run got wrong, recorded here because the write-up is where it will be read

This run pushed `e765135` to main at 00:31Z and reverted it at 00:48Z (`364f700`). It carried two P0s its own
build had stood down on, and not shipping the mate floor is itself outcome (ii). See `HANDOFF.md`'s #447run block,
`flags/antagonist-a-447run`, and `jobs/a-gated-green-log-is-not-a-shippable-tree-2026-10-01`. The antagonist pass
is supposed to run **before** the push; I ran it alongside one.
