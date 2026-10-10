# HANDOFF — where the last run left off

**Build #510. If you are about to touch the portrait fit loop in `chess.jsx` (search `_fitScreen`),
read `gates/pending/75-fit-loop-one-way-ratchet.js` first — its header carries the whole measurement
and three falsified fixes.** Everything below is either measured this run or explicitly marked as not.

## What #510 did, in one line

Turned a defect the owning job records as firing "about 1 run in 5" into a **deterministic six-cell
reproduction**, built a fix, and **had that fix killed by its own control**. **No app behaviour
changed** — `app.js` is `227126b82b81`, `chess.jsx` is `a510e35796cb` and `index.html` is
`4a95e865bca8`, byte-identical to main at my base and at my tip, measured with `git show | md5sum` on
both sides. **That is the fifth consecutive build in which the app did not change**, which is the
honest headline and not a good one.

## THE ONE THING THE NEXT RUN MUST NOT CARRY FORWARD

The owning job is titled "the lesson demo board latches **16-24px**". **BOTH NUMBERS ARE ARTEFACTS OF
THE TRANSIENT SIZE I HAPPENED TO DRIVE** (16px), and the worst thing this build did was publish the
converse as a property: I measured 0px at Kunal's two geometries at 16px and wrote **"NOT on Kunal's
phone"** into a gate assertion, a durable manifest row, two story docs and a job. **IT IS ON HIS
PHONE.** Measured on main's own bundle, board read after the content is gone:

| geometry | 16px | 56/64px | 88px | 120px | via the real demo→practice route |
|---|---|---|---|---|---|
| 375x730 | 0.00 | 0.00 | **29.20** | — | **45.20** |
| 375x761 (R19's settled figure) | 0.00 | — | — | **32.80** | **48.80** |
| 375x568 | 16.00 | — | **78.88 = 29%** | — | 16.00 |
| 320x540 | 24.00 | — | — | — | 24.00 |

`chess.jsx`'s own #436 comment said so in a clause I dropped — *"the trim cannot move the board at all
UNTIL IT EXCEEDS ~145px"*. Antagonist B's veto; I reproduced it myself before accepting it, and the
withdrawal is withdrawn in all six places it landed. **The 60-90px band is reachable, not
hypothetical:** `gates/regress/16-cpu-result-line.js` already measures a **62px** in-flow tab-bar
spacer doing this (224.00 → 192.00, and *"card-gone 192.00"* is the latch). Read that citation's scope
limit in the gate header before reusing it — it is a landscape measurement on a dead bundle, which
antagonist A caught in the cross-read.

## What the deliverable is, and why it is in `pending/`

`gates/pending/75-fit-loop-one-way-ratchet.js`, **TC-R64 / US-R72**: 64 assertions over 10 browser
launches, **60 pass / 4 fail on main's own bundle** — PROVISIONAL AS THIS LINE IS WRITTEN: that figure
was taken on the PREVIOUS version of the file, before the cross-read replaced the A6/C6 precondition,
and the final file is re-run after the suite finishes and this number corrected if it moved. A browser
was deliberately not launched beside the push-gate suite. It carries **no expected board width** — every
block drives the same path twice, clean and transient, in one run — so it cannot go stale on this
container's fonts. It is in `pending/` with an `absent` manifest row (**known-absent 4 → 5**) because
it reds on main *by design*: the app defect is unfixed and `L.run` exits non-zero. Promote it in the
build that fixes the loop.

**It is also one of the only gates that visits 761.** The SIT lane measured, independently and the
same morning, that **47 of the 48 `geo:` literals in `gates/regress` still drive the figure R19
corrects** (`flags/sit-2026-10-10`). The 761 cell carries the largest number in my whole measurement —
48.80px against 45.20 at 730 — so a 730-only gate would have published a smaller defect and called it
the maximum. Two lanes arriving at the same argument from different directions is the strongest thing
on either report.

## Three fixes are falsified. Do not re-take them without reading why.

1. **The one-confirmation-frame guard on the shrink branch** — I built it (bundle `fc54d99154d7` over
   source `c662604ceb87`) and **its own control reproduced the latch unchanged, 24.00px and 16.00px.**
   My reading that the overflow was a 1–2 frame transient was wrong: it appeared on one frame only
   because the shrink landed on the next one. Both register rows are `abandoned`; the source is on no
   ref, deliberately.
2. **Two of the job's three prescribed "one-liners" are falsified by measurement.** `spacers` reads 0
   (its predicate needs a direct `aria-hidden` grow child of `#root` with no children; the only
   grow-capable box is a level deeper with six children) and `over` reads exactly **0** in every
   settled state.
3. The third trades against **#355's** stated reason for settling from the current trim, so it is a
   product trade-off and not a one-liner.

**And "where the slack goes" is no longer open.** `data-ct="moves-panel"` goes 64.61 → 88.61 at 320x540
and 74.13 → 90.13 at 375x568 — **+24.00 and +16.00, exactly the board lost** — and `chess.jsx`'s own
comment there says it *"ABSORBS THE SLACK"*. My probe looked for flex FREE SPACE, which is identically
0 wherever a flex-grow child exists, so it could not have printed anything else on any bundle. Both
antagonists found this independently in the frozen log I handed them. **A measurement-based fix is back
on the table.**

## The one number that matters to the next run

**A close-out touching only `RUN-LOG.md` and `HANDOFF.md` now takes `FAST GATE GREEN` in about 7
seconds instead of the 84-minute suite.** Measured, control (e), 7421 ms. Ask the script; do not judge
the changed set yourself:

    bash gates/fastgate.sh "$(git rev-parse origin/main)"

`0` = you may push THIS COMMIT. `2` = GO FULL, which is not a failure. `1` = STOP.

STEP 0F(3) still applies: `docs/fast-gate-state` must be green and under 36 hours old, or fast mode is
off whatever the changed set says.

## What is NOT records-only, and the second one will surprise you

`gates/`, `chess.jsx`, `app.js`, the two guard registers — and **`CLAUDE.md`**. `RUN-LOG.md`, `HANDOFF.md`,
`DECISIONS-LOG.md`, `FEEDBACK-INBOX.md`, `README.md`, `chess-trainer-backlog.md` and
`feedback-inbox.md` ARE records-only, each behind a ratchet.

**THIS SECTION AND THE ONE ABOVE IT ARE CARRIED FORWARD FROM #509, NOT MEASURED BY #510** [R18]. They
are kept because they are durable tool facts the next run needs on its first screen, and dropping them
to avoid inheriting them would cost the next run the 84-minute suite. Two things were edited out rather
than left to read as mine: #509's sentence that the `CLAUDE.md` arm "is the whole subject of this run's
cross-read; see below" — true of #509, false here, and its "see below" pointed at sections this
rewrite replaced — and the 7421 ms figure is #509's control (e), not a #510 measurement. **#510 did not
use the fast tier at all**, so it has no reading of its own to offer: this run went through the full
suite because it changed `gates/` and `claude/stories/`.


## Two process findings this run filed, both with dates attached

- **The snapshot prune ceiling of TWELVE is a frozen denominator** and it has a date.
  `prompts/build-run` step 7 justifies twelve as *"about 800KB … plenty of headroom"*, which implies
  65KB a row. **Measured on the live collection: twelve rows = 1,909,609 bytes, mean 159KB, so twelve
  is 1.82MB — 71% of the 2.7MB that blanked Kunal's dashboard on 2026-09-14.** Growth is +4,969 bytes
  per build least-squares over twelve rows, so twelve rows reach 2.7MB in **about 13 builds, a week
  away**. I pruned to twelve as instructed and did not freelance the retention: 1.82MB demonstrably
  still renders, and the count feeds two things he looks at. The remedy is to prune on BYTES and to
  stop the rows growing without bound.
  `jobs/the-snapshot-prune-ceiling-of-twelve-was-calibrated-at-65kb-a-row-2026-10-10`.
- **R49 A2's WIP id-sha is a perfect equality check that carries no information about a difference.**
  It worked: my 44 at check-in hashed to #509's `c7195f1857db7ce4` exactly, so I could say *the same 44
  documents*. Then my check-out read **42** — it FELL — and four build-owned finish-first jobs closed
  after my check-in against a net of two, so two of the four were already non-ready **and I cannot say
  which two**, because only the hash was stored. Store the list.
  `jobs/r49-a2s-wip-id-sha-cannot-explain-a-difference-only-detect-one-2026-10-10`.

## What I got wrong against myself, before any antagonist

- **The non-vacuity precondition took three tries.** Try 1 (peak `over`) **reddened a working control
  at 3 of 6 cells**. Try 2 (the board moved while the transient was in flow) is green on main and still
  wrong — it is a claim about the APP, so a fix that absorbed the transient without shrinking the board
  would redden it **while being correct**. Only try 3 is sound: assert the **control** was applied
  (`injRect.inFlow === true && |injRect.h − px| < 1`), a fact no correct bundle can falsify.
- **My own story doc breached the register ratchet.** TC-R64 written as a prose section added a story
  heading and no case ROW, so US-R72 went into the at-zero set, **9 → 10 against a ceiling of 9**.
  Found only by running `verify-log.sh --citations` against **my** tree rather than against main.
- **I left the gate name I changed mid-run stale in two docs**, both naming a path that exists nowhere.
- **A pipe destroyed a probe's output.** `node probe.js 2>&1 | tail -30` under `timeout`: SIGTERM
  killed the pipeline and `tail` died with its buffer unflushed, leaving a 35-byte file reading
  "Terminated". **A pipe does not only mislabel a value, it can DELETE one.**

## R30's four numbers, and why the series' own pointer cannot be satisfied

**openP0 7, openP1 86**, with the series' own query (`severity` field + `status eq ready`). #508's
pointer 2b asks me to reproduce the predecessor's value first. **I cannot, and it is not the
instrument** — #509's method is character-for-character mine. The collection moved: closing waves at
05:40, 05:41, 06:08, 06:40 and 07:14Z. **P0 reconciles row-exactly** (−4 = four datable departures, 0
arrivals). **P1 brackets** (−16 departures, ≤7 arrivals, giving −12…−9 around an observed −11) and
cannot be closed, because a departure is datable only where the closing lane wrote a stamp and
`jobs/42-closed-jobs-skipped-r05s-middle-write…` records that it often does not — five of eighteen
closed P0 rows carry no closing stamp at all. So **2b is unsatisfiable as written for this series**:
nothing freezes a predecessor's read. Reproduce the METHOD and account for the delta as far as the
stamps allow, saying where they run out.

## Still owed, and none of it is mine to take

- **The drill-verdict P0 Kunal reported twice is still live on main.** Seven P0s read `ready`; I took
  none of them.
- The auditor did not run, making it **eleven consecutive builds**. Structural: seventeen of eighteen
  lanes have no enabled scheduled task and a build lane may not enable a trigger.
- `--citations` **exits 1 on main and on my tree** for 17 dead paths, 20 unsupported case ids and 10
  misfiled rows — identical figures both sides, independently measured by process-build lane 1 at
  06:47Z. It **cannot refuse a push**: all nine `verify-log` references in `gates/gates.sh` are
  comments (0 non-comment, measured) and `--citations` is an opt-in first argument at `:330`. Arm 5 is
  now OK, because this run landed lane 1's parked payload in the integration slot.
- The live site is unverifiable from this container (egress-blocked), so every claim here is about a
  bundle and never about the deployed site.
- A **per-run branch carries real work until main has its commit.** Mine is
  `claude/cool-noether-rgpj7r`.

## Provenance

PROVENANCE_PLACEHOLDER
