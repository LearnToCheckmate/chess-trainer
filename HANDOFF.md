# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#511**, runId `build__1791624032000`, 2026-10-10. Pen taken and released on R38 test (c).

## What #511 did, in one line

Fixed the Brilliant/Great explanation losing its refutation clause — permanently, for the rest of a
session — by repairing **two** mechanisms in the analysis worker's single-slot plumbing, and proved the
fix with a four-bundle control matrix rather than against main alone.

## THE ONE THING THE NEXT RUN MUST NOT CARRY FORWARD

**The item's own locus was one caller off, and the line it cited already carries the fix.** The job said
the engline caller caches a failed query at `chess.jsx:5250`. Measured on main: that caller **deletes** its
cache entry on failure and its cleanup sets `dead` first, so the abort route cannot poison it (#389/#392
hardened it), and `:5250` is inside `playBestLine` — a different function. Had I implemented the job as
written I would have "fixed" code that was already correct and shipped the defect. The real fault is the
same SHAPE one caller away, in `sacRun`. I corrected the item's `locus` and its `fingerprint`
(`9728f8201c48df4a` → `2283ad1edeb50cc7`) in place, so a successor matching on fingerprint will find the
corrected row — but **a job is a report, not a prescription**, and this one's verdict and severity were
right while its locus was not.

## The deliverable, and the two mechanisms

Neither half works alone; that is measured, not argued.

1. **The cache/token half.** `sfEval1` resolves an **object** with `bestmove:null` on abort — not `null` —
   so its partial score looked like an answer. It now carries `ok`, set true only on a real `bestmove`.
   `sacRun` stores only `r.ok`, and only when the pending marker is still its own attempt (game key +
   per-attempt token), so a stale or aborted search can neither write nor be cached for ever.
2. **The yield half.** `sacRun` used to OPEN by aborting the incumbent analysis (#356's
   abort-before-readyok). That kills the engline query in flight and can trap the WASM. It now **yields**
   on a new `sfAnaBusyRef` — 300ms re-try, capped at 20 yields — instead of aborting, and both entry points
   install their callback INSIDE the `anaIdle` callback so a previous search's flushed `bestmove` finds a
   null slot.

What a player sees, on Kunal's own game `184024052818` at ply 38 (19...Bxh3!!, the move he found by hand
at #420), 375x730, engine on, stepping away and back:

- main `227126b82b81`: `You give up a piece. Black is clearly better.`
- #511 `f47aa0197967`: `You give up a piece. If gxh3, Rxf3 and Black keeps a clear edge. Black is clearly better.`

## #511 NAMES FOUR BUNDLES. CITE THE MD5, NOT THE NUMBER [#454]

| bundle md5 | source md5 | what it is |
|---|---|---|
| `fb850cc02250` | `a3a4fd6c557f` | the cache half alone. **SUPERSEDED, and kept as evidence**: it proved that half insufficient. |
| `81b805f1748b` | `c6884596f416` | pre-veto. **What both antagonists measured** — cite this one when reading their reports. |
| `f401c6bc08dc` | `ae98608b23db` | post-veto. |
| `f47aa0197967` | `b6b7fbb25df0` | **SHIPPED.** Comment-only from `f401c6bc08dc`, proved: executable content byte-identical, 886027 bytes, md5 `13b455ec4519` both sides. |

## The control matrix: one gate file, one container, four bundles one hunk-group apart

Antagonist A vetoed the fact that I had controlled only against main, which cannot distinguish the two
halves. This is the replacement. (A vetoed; B did NOT veto on its blind pass - it vetoed in the cross-read.
See below.)

| bundle | md5 | yield | cache/token | R3c | R4/R5 | R6 | englineArrivedMs | traps |
|---|---|---|---|---|---|---|---|---|
| main | `227126b82b81` | – | – | RED | RED | RED | null | 1 |
| cache-only | `17b13eec1d99` | – | ✓ | RED | RED | RED | null | 1 |
| yield-only | `a61066782641` | ✓ | – | green | **RED** | green | 805ms | 0 |
| shipped | `f47aa0197967` | ✓ | ✓ | green | green | green | 801ms | 0 |

**The cache/token half's clean control is the trap-free pair** — yield-only against shipped. On the two
no-yield bundles the worker traps and every arm reddens for the OTHER reason, so main is not a control for
that half at all. `gates/regress/22-engline-recovery.js` went 21 → 31 assertions (block R is 10). **R36 on
the final file: three runs, 31/0 each, setSha `d262a7d8a428f6a7`.**

## Four things are falsified. Do not re-take them without reading why.

- **The cache fix alone.** `fb850cc02250` leaves the clause absent at every arm, exactly as main. `sacRun`
  was aborting the query that would have produced the answer, so the token guard had nothing to protect.
- **A step-away arm at a fixed delay (`AWAY=1200`).** Antagonist B, in the CROSS-READ rather than its blind
  pass, measured the window: engline arrival
  839/840ms, clause 1676/1677ms, so 1200 sat ~150ms inside a ~600ms gap **whose both edges are
  engine-speed terms** — a faster engine makes the arm go silently green on a bundle missing the
  cache/token fix. This refuted my own written reason for thinking it safe (that `movetime` is wall-clock):
  the arrival is, the clause's second query is not. **Poll for the observed arrival; do not pick a number.**
- **A step-away as a way to control the yield half.** Any step-away during a LIVE engline query *is* an
  abort, so it reproduces #356 and traps the WASM — the clause then stays absent on every bundle, fixed or
  not. My replacement arm reddened the bundle I was trying to ship (37 pass / 2 FAIL + PAGEERROR). The
  instrument was manufacturing the defect it measured. R3c controls that half by **polling**, no step-away.
- **The Opera Game as the fixture.** No ply in it produces a `sacRun` attempt, so the clause is legitimately
  empty on every bundle and any gate built on it is green by construction.

## What I got wrong against myself, before any antagonist

- **Block R's first draft certified the defect ABSENT on main — 28 pass / 0 fail.** Its denominator settled
  on **ply 38, the ply under test**, which caches a good answer for that ply and papers the defect over
  before the assertions run. Moved to ply 74. The same-object trap again: the check and the
  thing checked were the same object — here the same PLY. **It gets no ordinal:** measured, "eleventh costume"
  appears FIVE times in RUN-LOG.md for five different findings, so the number identifies nothing, and my own
  pen note and first draft already disagreed (eleventh vs twelfth). The tell was a green where I had predicted red,
  visible only because I had built the control before writing the assertion. **I give it no ordinal on purpose:**
  measured, "eleventh costume" appears FIVE times in RUN-LOG.md for five different findings, so the number
  identifies nothing and my own pen note and first draft already disagreed (eleventh vs twelfth).
- **I edited the gate and launched a six-run matrix without once executing the file.** `ReferenceError: AWAY
  is not defined` — a leftover in a launch NAME after renaming the loop variable. The matrix's first run
  died at 20 pass / 1 fail in 67s with **block R never running**, and the 1 fail looked ordinary.
  `node --check` passes on a runtime ReferenceError.
- **I corrected antagonist A and the correction was wrong, so I withdrew it.** I attributed A's cache-only
  third red to a two-Chromium flake. Measured: my fresh run's third red was `harness threw: Target page...
  closed`, a flake **I caused by killing browsers mid-run**, while my earlier clean run had exactly 2 fails.
  Neither attribution holds. It is non-deterministic, A's mechanism is the best explanation, and it is filed
  as owing its own control rather than written off.
- **The clock drift reversed direction for the first time in sixteen builds.** I believed 55 minutes had
  passed when **648 seconds** had — slow, by a factor of five, where the previous fifteen all drifted fast.
  The decision it was steering was whether to cut the blind pair for time, on the build whose two
  antagonists then produced every veto that mattered.

## The numbers [R30]

- **openP0 7** (`severity eq P0` AND `status eq ready`) — reproduces #510's 7 exactly, same query.
- **openP1 88** — #510 read 86 at 07:4xZ. The delta closes **row-exactly**: +2, both arrivals are #510's own
  close-out filings, both stamped after its snapshot read, zero datable departures in the window. Better
  than #510 could do for P1, which could only bracket −12…−9 around −11.
- **coverage** 58/58 gate manifest, **5 known-absent**, 0 missing / unlisted / retired / unjustified.
- **assertions** **4631**, and that is the footer's figure AND an independent `grep -c '^PASS'` of the same file [#405] - 0 `^FAIL`, 0 `<<<` markers, 6050 lines, one `GATES GREEN`.

## Still owed, and none of it is mine to take

- `drill-eval-bar-is-an-amber-board-width-decision-2026-10-01` — **blocker holds, and I measured it rather
  than inferring it**: I listed all **87** Decision Desk questions and grepped them, and **zero** mention an
  eval bar. #510 recorded this re-test as PARTIAL (it relied on two closer screens); that partial is now
  closed. Desk spread: done 41, answered 10, none 27, open 3, snoozed 1, withdrawn 3, retired-stale 1, merged 1.
- `entry-two-the-coverage-ratchet-2026-10-10` and `entry-three-contracts-become-runnable-asserts-2026-10-10`
  — both blocked on `build-one-door-for-every-non-gate-check-2026-10-10`, which my own P1 query returns as
  `ready`. Whoever takes that unblocks two.
- `legal-pages-fill-placeholders` — **not re-tested**, said plainly rather than skipped silently: the content
  is Kunal's to supply and it is the lowest priority in the collection.
- `practice-row-label-keyed-to-a-board-threshold-not-its-budget-2026-09-29` — **not mine**, owningLane
  orchestrator.

Four jobs filed this run, all typed [R51], all with `ifNotDone`: the coach sentence losing its last sentence
in landscape (`d2b89afa604fb588`), the coach sentence being rewritten two seconds in (`0f51494d486d4380`),
block R driving `CT_POOL=3` only (`ea2aaae5baee5265`), and the trapped-worker class itself
(`e4ba36d7fe41a92b`). The ply-25 non-determinism was **appended to the gate-22 job rather than filed as a
fifth id** [R51: never file on the ground that the match was not exact].

## The auditor did NOT run. Twelfth consecutive build.

build-run 2b permits it — "if you are short of time, the antagonist wins … the auditor may be skipped for a
run, provided the run report says it was skipped and why." **Why:** the browser was continuously occupied by
the blind pair, then the four-bundle matrix, then the determinism set, then the suite; and two Chromiums in
one container is a measured flake source (#507 — and I caused one myself this run by killing browsers
mid-run). Twelve in a row is no longer a scheduling accident and the next run should treat the auditor as
the thing to protect time for, not the thing to drop.

## Provenance

`GATES GREEN #511`, **59 sections / 4631 PASS / 0 FAIL**, over bundle `f47aa0197967`, gated sha `6e243c0`,
base `b3767c4`. Suite 12:12:29Z to 13:55:53Z, **103 minutes 24 seconds**, pid 22334. Figures RE-DERIVED, not read off the
footer: the footer's 4631 equals an independent `grep -c '^PASS'`, with 0 `^FAIL` and 0 `<<<` markers.
PUSH GATE, every exit code captured in its own variable and never read through a pipe: `verify-log '#511'`
**0**, `--this-bundle` **0**, `--on-main` **1 before the push and 0 after** (so that instrument demonstrably
reports both answers, not only the one I wanted), `held.sh check` **0** not held - and **0** again when asked
by the gated sha and by the bundle md5 separately - and `buildnum.sh stampable '#511'` **0**.

Suite run from the frozen sibling copy `gates/.gates-run-511.sh` inside `gates/` (#493: the copy must live
there, because `gates.sh` derives `ROOT` from its own location). Harness frozen before launch and checked
after: `suite-freeze.txt` records the suite script and all 67 suite-read files (#461, where two mid-run
edits cost a complete 48-section green its footer). Pre-launch state: manifest 58/58/0/0, `held.sh check`
not held, fastgate REAL EXIT 2 = GO FULL, mountcheck 16/0. Archived log: `gates/logs/511-all.log`.

Development branch `claude/cool-noether-pz2fdl`. main was at `b3767c4` at check-in.
