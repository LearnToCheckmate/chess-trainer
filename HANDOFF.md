# HANDOFF

**#504 DID NOT SHIP, 2026-10-09. origin/main IS UNTOUCHED AT `6bd5e54`.** Kunal's own 2026-10-04 report -
the review's sacrifice line stops one move before the recapture - has part (b) **built, gated and HELD** on
`claude/cool-noether-0fpp6q` at `656a6cb`: the line runs up to three plies of the engine's own principal
variation and always ends on **the player's own** forcing move. That part works and is covered by 39 new
assertions. **The full suite then went RED** and the tree is registered refused on `gates/held-trees.tsv`.
Suite ended at 59 sections / 4468 PASS / 2 FAIL over gated sha `656a6cb`, bundle `1d434d3a871d`, source `9728a5fbdebf`. `main`'s
`chess.jsx` is still `ef7a141bec38`; the held tree's is `9728a5fbdebf`.

## READ THIS FIRST: WHY IT IS HELD, AND WHY THE FIX IS NOT A PATCH

`22-engline-recovery` went **19 pass / 2 fail** against **21 pass / 0 fail on six consecutive builds**
(#497, #499-#503) - the exact two assertions that were passing now fail, on exactly and only the two plies
this feature fires on. **The app has ONE analysis worker and a new query ABORTS the incumbent, which
resolves `null`** (`chess.jsx:2762`'s own comment says so; `sfEval1:4191` and `sfBestLine:4204` both open by
killing whatever owns the worker, and `sfAnaCbRef:2764` is a single callback slot both overwrite). The
engline caller at `:5250` then caches that `null` as `{line:''}` and never re-queries, so the user reads a
bare ellipsis for the rest of the session. **That is #389 returning by a new route:** this project's rule
about it covers a null from a dead search, and **never closed the case of a null arriving from an abort.**

My `sacRun` query (`:5812`, 700ms behind a 450ms debounce, fires only on a Brilliant or Great move) is a new
contender against the engline query (`:5250`, 900ms) on the same ply. **The hazard is PRE-EXISTING** - the
old `sacRun` called `sfEval1`, which carries the same abort line - **so this build did not create it, it
cashed it in.** Full mechanism, baseline and three candidate fixes:
`jobs/two-analysis-queries-on-one-worker-abort-each-other-and-the-loser-is-cached-as-an-answer-2026-10-09`
(P0, finishFirst, owningLane build).

**WHAT GATE 21's GREEN DOES AND DOES NOT COVER - MEASURED, after my first version of this paragraph
overstated it [R18].** The race cuts both ways, so the refutation clause can itself be aborted and silently
not appear. But **the engine line is OFF BY DEFAULT**: `chess.jsx:3225` is `useState(false)` with no store
read (so it resets every session), and the engline query is guarded by `if(!engOn...)return` at `:5231`.
**The contention therefore happens ONLY after the user opens the ⋯ sheet and taps "Analyze with the
engine".** Gate 21 runs with the engine OFF and says so at its own line 295 - *"THE ENGINE MUST BE OFF FOR
THAT TO HOLD, and that is asserted rather than assumed"* - while gate 22 turns it ON at its line 63. **So
the two gates cover two different real configurations, and gate 21's 81 pass / 0 fail IS valid for the
default one.** WITHDRAWN: that it "does not exercise the configuration the user has", which reads as
covering no real configuration when the default is the one he is in most of the time.

**THE TRUE AND NARROWER STATEMENT:** the feature is **unguarded in the engine-ON configuration**, nothing in
this 59-section suite exercises the feature with the engine on, and nothing deliberately puts two analysis
queries on one ply - so gate 22 caught this **by luck of timing, not by design**. A fix to the abort path
could regress tomorrow with nothing to see it. Whatever fix lands needs a control that reddens on the
contended case, and it should also decide whether the default-off engine line makes this P0 or P1: the
user-visible damage needs a deliberate toggle first, and then persists for the rest of the review.

**DO NOT REBUILD OR RE-PUSH `656a6cb` AS-IS.** It is registered on `gates/held-trees.tsv` by bundle md5,
gated sha and `sourceMd5` - the last being the only key that survives a rebuild (#450).

## READ THESE SIX THINGS BEFORE YOU BUILD

**1. BOTH BLIND ANTAGONISTS VETOED AND BOTH WERE RIGHT. RUN THE PAIR, THROUGH TWO DOORS, BEFORE THE SUITE.**
This is the third consecutive build where the pair changed the design rather than auditing it, and this one
is the clearest case the project has: **both P0s were unique to one door.** A read the diff and found that
my dead-search guard reproduced the #389 defect it was written to fix — invisible from the screen, because
it needs a dead engine. B read the shipped surface and found that my line could end on the **opponent's**
move — invisible from the diff, because a diff does not say which side a pv ply belongs to. On Kunal's own
game (ply 74 of `claude/agents/bench/pgn/184024052818.pgn`) my first tree printed *"If Qxf7+, Kxf7 Rf1+ and
Black is winning"* where `Rf1+` is **White checking his king**, on a ply the shipped bundle already got
right. A single-antagonist run at either door would have shipped a P0; at B's door it would have shipped
the inverse of the feature's own purpose. uniqueToA 8, uniqueToB 5, common 2 of 15 upheld — the two doors
found almost disjoint sets, so the population is much larger than either pass.

**2. "FORCING" IS A PROPERTY OF THE STRING AND SAYS NOTHING ABOUT WHOSE MOVE IT IS.** The pv alternates
sides. If you test a line's last ply with `/[x+#]/` and nothing else, every EVEN-length line ends on your
opponent — and an opponent's check reads as "forcing" exactly as loudly as your own recapture. The parity
term (`(out.length-1)%2===0`, since `out[0]` is always the mover's) is what makes "the recapture is on
screen" mean the player's recapture. **Any future rule that selects plies from a pv needs a parity term or
a reason it does not.**

**3. `scrollHeight > clientHeight` IS NOT A CLIPPING DEFECT. IT IS WHAT A FIRED CLAMP READS.** I filed a
false defect against main on this: I measured the shipped ply-25 sentence at 320x568 as `sh 68 / ch 51` and
reported "a whole line cut with no ellipsis, because the box is overflow-y hidden". Wrong — the element
carries BOTH a `-webkit-line-clamp` and `overflow-y:hidden`, and the container is sized to **exactly** the
clamped lines: `ceil(3 × 16.9) = ceil(50.7) = 51 = clientHeight`. So the clamp truncates, and a clamp
**draws an ellipsis**. #396's real invariant is `clientHeight <= ceil(lines × lineHeight)` and it holds on
both bundles at every geometry measured. I had inverted the exact distinction #387 was written about. If you
reach for `sh <= ch`, you are measuring whether the text is short, not whether the box lies.

**4. MOVE THE DECISION OUT OF THE COMPONENT AND THE ASSERTION BECOMES POSSIBLE.** A's veto said my guard
"has no assertion in either new block and no control that can enter the state" — and it could not have one
while it was four lines inline in a React callback. The repair was not an assertion written around it: it
was making the decision a pure module-level function (`sacStore`), after which five enumerated assertions
fell out, including the veto case itself. `gates/engine-extract.js` plus the balanced-brace reader lets a
gate exercise any top-level declaration in `chess.jsx` with no browser. **Reach for that before you write a
browser assertion around something you cannot reach.**

**5. A NON-VACUITY ASSERTION EARNED ITS KEEP TWICE IN ONE RUN.** `N2` ("ply 25 actually PRINTS a refutation
clause") caught a reading where the clause was **absent** — the analysis worker had stopped answering after
the gate's play-out and a 34-ply sweep — and without it `N3`–`N5` would have read an empty list and passed
loudest exactly where the thing under test had vanished. And `S1`/`S22` are there because the same shape
would hide a wrong fixture. Put the denominator in its own `L.say`, never as a conjunct.

**6. WHEN A VETO FORCES A REBUILD, THE EVIDENCE PACK YOU HANDED A PARALLEL READER IS ALREADY STALE.** B
correctly reported that the logs I gave it named bundle `6b7dadfdccf6` while the disk carried
`d9e52debf8d5`, because I had rebuilt on A's veto. The findings survived — B re-ran them against the newer
bundle — but the pack authorised nothing. **#504 names four bundles; cite the md5, never the number.**

## WHAT IS OWED AND NOT DONE

**PARTS (a) AND (c) OF KUNAL'S REPORT ARE UNTOUCHED, AND (a) IS THE ONE HE CARES ABOUT.** His three points
are one cause: the sentence reports the **price** of the move and never the **mechanism**. I built (b), the
line length, because it had a bounded fix that cost no extra engine query. (a) — "the text that would have
helped is that the queen is pinned and that is why you can take the knight" — needs **relative**-pin
detection, a pin against the QUEEN, and that job's own `THEIMPLEMENTATIONTRAPWORTHMORETHANTHEREST` proves
`is_pinned()` returns FALSE in his exact position because standard libraries report absolute pins only. (c)
needs copy he has not seen. Both are on the job; neither is blocked on anything but authority and work.

**AND THE HONEST SIZE OF WHAT WAS BUILT (none of it shipped).** Antagonist B measured it across 265 plies on two bundles: only
**four plies** print a multi-ply line at all, and **Kunal's own hand-found brilliancy 19…Bxh3!!** (ply 38 of
that same game) **still prints one ply**, byte-identical on both bundles. The change does not fire on the
brilliancy of his that this repo keeps. If the next run wants to move this item for him, part (a) is where
the value is, not a wider cap.

**ONE CHANNEL MEASURED AS OPEN AND NOT CLOSED.** `sfBestLine` keeps the **last** `pv` info line and resolves
`line||[bm]`, and the worker forwards every info line carrying a score — including aspiration-window
`lowerbound`/`upperbound` lines — so `pv[0]` is not guaranteed to equal `bestmove`. That is the one way this
change could **rewrite** rather than extend a line. Neither antagonist A nor I could force it in a sandbox,
so it is a named residual, not a closed question, and it is pre-existing for `sfBestLine`'s other caller.

**THE TRADE KUNAL CAN REVERSE IN ONE WORD.** `pack()` is a greedy 150-character budget in portrait, so the
longer clause pushes *"It forks two pieces at once."* out of the ply-25 sentence at 375x730 — 126 characters
against the shipped 144. `TC-R10/N10` now pins the whole sentence so a clause entering or leaving it is a
red. The call is recorded at `flags/amber-504-how-far-the-brilliant-refutation-line-runs` with the three
options rejected and why.

**LANDSCAPE IS CLIPPED ON BOTH BUNDLES AND IT IS NOT MINE.** At 730x375 the `rev-why-txt` box is 238×34 with
a 2-line clamp while the content needs 94px here and 75px on main. That is
`flags/uat397-rev-why-clips-landscape`, broken and open since 2026-09-15, a self-inflicted #397 regression
the build lane accepted as its own; `gates/regress/26-invariants.js:85` already says landscape "is not
swept" and names it. Recorded as a NOTE in gate 21 and deliberately **not** asserted — an assertion over
another job's known-open defect would redden the suite and block this push. Note also that landscape takes
the `wide` branch where the budget is `WHY_MAXW=130`, leaving the new 126-character sentence **four
characters** from losing its next clause. Nothing drives landscape in this gate.

**SIX FINDINGS FILED THIS RUN, NONE FIXED. THE FIRST IS THE ONE THAT STOPPED THE PUSH:**
- `jobs/two-analysis-queries-on-one-worker-abort-each-other-and-the-loser-is-cached-as-an-answer-2026-10-09`
  — **P0, finishFirst, and the reason #504 is held.** One analysis worker; a new query aborts the incumbent,
  which resolves `null`; the engline caller caches that `null` as an answer. #389 by a new route, with the
  abort half of the case never closed. Gate 22 went 19/2 against 21/0 on six consecutive builds. Mechanism,
  baseline and three candidate fixes are on the job. **The hazard is pre-existing; #504's second query is
  what cashes it in.**
- `jobs/the-run-log-header-declares-nine-columns-and-the-rows-have-two-2026-10-09` — P2, owningLane process.
  `RUN-LOG.md:5` declares nine columns and every modern row has two, so the ETA pair is no longer readable
  down a column — which is why this run could not score its own actual against anything. A decision is owed
  about which half is wrong; the old rows must NOT be rewritten.
- `jobs/gate-22-never-requires-the-wasm-trap-to-have-fired-so-five-recovery-assertions-pass-over-a-non-event-2026-10-09`
  — from A's rotating audit. Gate 22 exists to prove recovery from the Stockfish WASM trap; the trap is
  *allowed* at `:197` and *required* nowhere, so all five recovery assertions pass over a non-event. The
  missing-denominator class applied to a whole gate, in the gate whose subject is #389.
  **CORRECTED THE SAME RUN [R18]:** the suite then ran gate 22 and the trap DID fire (six allowed
  `RuntimeError: unreachable` lines), so on this run those assertions were not vacuous — two of them went
  red and caught the P0 above. The finding stands (nothing REQUIRES the trap), but its priority argument
  inverts: the gate is now demonstrably load-bearing, so the day the trap stops firing a proven-necessary
  guard goes silent with no tell.
  **The next antagonist's rotation resumes at `22-engline-recovery.js:184`, then `23-full-walk.js`.**
- `jobs/the-auditor-has-not-run-for-seven-consecutive-builds-and-no-job-records-that-2026-10-09` — #498
  through #504. Every skip was individually permitted by step 2b and no job recorded the pattern until now.
  The fix is not willpower; three structural options are on the job.
- `jobs/gate-65-never-drives-the-human-plays-black-clock-flag-cell-and-a-register-clause-says-it-was-filed-2026-10-09`
  — the closer's named smallest-next-step on the closing set's rank 1. A register clause said the work was
  handed off and no such job existed. Now it does.
- Job 498's `DOTHISFIRST` field is **withdrawn**: it says the #498 held row is absent from main and it has
  been on main since #499 at `a13cbcf`, widened at `de34e05`. Believing it would have cost an 84-minute
  suite re-landing a row that is already there.

**AND THE THREE THINGS THIS LANE INHERITED AND STILL OWES.** The five parked patches are owed by a **third**
consecutive run — STEP 1I's window is hour ≥ 11 and #503, #504 and I all woke before it, which is
structural starvation of the integration slot rather than a scheduling accident. The live site is still
blocked by the egress proxy, so R34's served-bundle half cannot be performed from this container. And the
three known-absent gates (50-drill-verdict-no-jump, 17-drill-grade-arithmetic, 52-drill-grades-the-move)
mean every GATES GREEN here is honest and blind in exactly those three places.
