# Which gates force `ct_pool`, and which of them the engine branch can change (#550)

Job: `jobs/twenty-four-regress-gates-force-ct-pool-on-every-launch-and-no-harness-route-reaches-the-single-worker-fallback-2026-10-21`,
part (2). Helper test-system B, on tree `c211125`.

**How this list was made, so it can be re-made:** `grep -l ct_pool gates/regress/*.js` on `c211125` returns **75 gates** (the
job's "24" is lane 2's 7 Oct count and is history). Each was then classified by reading its header and its `L.say` lines,
NOT by running it, so the class column is a reading. What decides the class is which engine the asserted output comes from:

- **review pool** - the review (`Analyze Game`) grades every ply on the pool (`sfEvalOn`) when `ct_pool` is set, and on the
  analysis worker (`sfEval1`, `review.engine.path === 'one'`) when the pool has no live worker - the branch a busy or cheap
  phone takes. `L.launch({engineFail:'pool'})` reaches it; `window.__ctReview.engine.path` says which ran.
- **built-in** - the mistakes drill grades with `drillRanking` -> `rankMoves` (module-level minimax, chess.jsx `drillRanking`),
  not Stockfish, so neither `ct_pool` nor `engineFail:'pool'` changes what a drill gate asserts.
- **analysis worker / play** - the live engine line, hints and the computer opponent use the analysis or mount worker;
  `engineFail:'all'` is their fallback route (gate 34 for play, gate 146 for the error text).

`ct_pool` on a drill, layout or play gate is a harness habit and changes nothing those gates assert.

## Already driving a fallback (5)

| gate | route | what it covers |
|---|---|---|
| 33 | `ct_pool=1` | one pool worker - still the POOL branch (#377), so not the `sfEval1` fallback |
| 34 | `engineFail:'all'` | takeback against the built-in computer |
| 86 | `engineFail:'pool'` | review accuracy and counts equal across pool / no pool (the `sfEval1` fallback) |
| 110 | `engineFail:'review'` | the review's failure panel when every engine dies mid-review |
| 146 | `engineFail:'all'` | "the engine could not start" wording; Astrid game on the built-in engine |

## Assertions DEPEND on the review engine's output (grades, accuracy, explanations, brilliant) - 19

| gate | what it asserts from the review | fallback arm |
|---|---|---|
| **66** winprob-ladder | block B: Opera Game Black Blunder exactly 1 (15...Nxd7), Mistake 0, accuracy floors, totals | **next (not built: part (b) parked, see below)** |
| **21** review-brilliant | block 6: Kunal's game, no ply names the played move as its own alternative (Bxh3 guard, at pool 3 and 1) | **next (not built: part (b) parked, see below)** |
| **19** review-grade-counts | summary counts equal the badges the move screen paints; Book prefix; accuracy shown | **next (not built: part (b) parked, see below)** |
| 14 | UAT review card end to end: 10.Nxb5!! brilliant and its sentence | none |
| 20 | Review suite TC-R01..R14: import, summary, grade heads, best-line badge | none |
| 21 (blocks 1-5) | the pinned brilliancy sentence at 10.Nxb5 (Bxf6, 1.1) | none (only block 6 has the arm) |
| 22 | engine-line recovery (analysis worker) on reviewed plies | none |
| 31 | antagonist-373 measurements: Brilliant / Blunder placement | none |
| 43 | analysis progress and its reproducibility | none |
| 55 | play-from-here at terminal plies found through the review | none |
| 58 | summary rating lines (header-only; review must complete) | none |
| 67 | TC-R180 counts and the review-driven sel/cls blocks | none |
| 82, 83 | brilliant gate / missed-brilliant mark on reviewed positions (partly seeded `ct_evalcache`) | none |
| 99 | the "Loading the Stockfish engine" wait line (pool worker held) | none |
| 101 | summary columns ordered by his side (accuracy values) | none |
| 106 | games-list Brilliant/Best/Great/Blunder equal the summary's | none |
| 120, 121 | the coach sentence fits / clamps at every ply of a live review | none |
| 87 | opening-book counts against chess.com (seeded cache plus a live review) | none |

## Runs a review but asserts layout, navigation or text only - pool-independent by construction (28)

15, 16, 29, 32, 35, 36, 37, 38, 41, 45, 73, 75, 90, 91, 94, 97, 100, 102, 112, 125, 127, 128, 135, 139, 143, 144, 148, 149

(102 and 143 assert engine MESSAGE discipline and movement, not graded values; 94 and 100 seed or count cache rows.)

## Drill, play or other screens - the review pool is not on their path (23)

Drill (built-in `rankMoves`): 50, 51, 52, 72, 77, 98, 111, 115, 118, 123, 124, 132, 134, 140, 145, 147, 157.
Play / analysis worker / other: 28, 42, 46, 62, 122, 130.

## Left uncovered by an `engineFail:'pool'` arm

Part (b) was stopped by an order change (Kunal, 13 Nov 2026 8:27pm ET: the job is on no list), so **every gate in the DEPEND
table is uncovered except 86**: 14, 19, 20, 21, 22, 31, 43, 55, 58, 66, 67, 82, 83, 87, 99, 101, 106, 120, 121.

What exists of part (b), unmerged: a third block-B column for gate 66, `blockB('3',' [engineFail=pool]','pool')`, whose B0f
asserts `b.engineFail().failed>0` AND `window.__ctReview.engine.path==='one'` (workers 0, not cached) before B1..B7 count.
MEASURED once on trial `ef94191cdf74` (this tree, unchanged source): gate 66 **97 pass, 0 fail**, B0f read 3 pool workers
killed of 5 created, path `one`, analysis 33 s against 12 s pooled; Opera Game Black Blunder 1, accuracy 87.6 / 78.9. Its
negative controls were built (`b20a26191019`: the fallback's `_block` resolves null; `b3adc5c04ed6`: the fallback searches on
one uncleared table and skips the mate-boundary re-search, the pre-#549 item (30) review) and NOT RUN. The patch was not
committed. The strongest next candidates are 14 and 21 block 1 (the pinned brilliancy sentence) and 67's
TC-R180 counts, because their assertions are pinned to values, not to consistency.
