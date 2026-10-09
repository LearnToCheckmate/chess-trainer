# HANDOFF

**#507 SHIPPED, 2026-10-09 — AND IT WAS GATED AND PUSHED BY A DIFFERENT RUN FROM THE ONE THAT BUILT IT.**
Read that first, because every register row for #507 except one names a run that is dead.

`#507` was built by `build__1791555675000`, which took the pen at 14:21:15Z, wrote the fix, ran both blind
antagonists, upheld and fixed every veto — and then **stopped at 16:28:09Z with its suite killed at 15 of 59
sections and nothing on main.** Its four commits sat on `origin/claude/cool-noether-r149ki`, 4 ahead of main
and 0 behind: R42 class 1 leakage in its purest form, work finished and not delivered.
`build__1791577208000` woke at 20:20:08Z, took the pen as an **R38 takeover**, reset its own designated branch
to that tip, re-verified every claim rather than inheriting it, and gated #507's own registered artefact.

**GATES GREEN #507 at `59` sections / `4607` PASS / 0 FAIL / 0 red sections / 0 `<<<`**, gated sha `a795d9f`,
bundle `28f1ff838440`, source `83610da7d7c0`, stamp `#507 - 2026-10-09 12:04 ET`.

## WHAT A PLAYER SEES, AND BE PRECISE ABOUT WHICH HALF REACHES KUNAL'S PHONE

The Review games list's filter header no longer moves the list underneath it. Two controls there could appear
and both were conditionally rendered:

- **The Clear chip** is now always in the layout, ghosted when there is nothing to clear. This stops the chip
  row wrapping from 2 lines to 3 — **94px → 144px, a 50px drop, AT 320x568 ONLY.** At 375x730 and 375x761 the
  row never wrapped, so **this half is a no-op on Kunal's own phone** and the clause's value to him is
  entirely in the second half. Say so rather than letting "fixed the jump" imply otherwise.
- **The coverage line** ("Graded 6 of 7 games — a game we haven't graded yet can't match this filter.") now
  holds its box for as long as a grade filter is on, and paints the *complete* sentence when the pass
  finishes instead of being held blank. This is the one that reaches him: it costs **34px at every geometry
  including his**, and its jump was the **uncommanded** one — `_ungr` decays to zero as the background pass
  grades, so on main the line vanished on its own seconds after he stopped touching anything, dropping the
  list under a finger already reaching for a row.

**AND THE COST THIS BUILD ADDS, measured and not hidden.** Rendering the line whenever a grade filter is on
means that over an **already fully graded** library — the steady state any real player reaches within seconds
— tapping a grade chip now inserts `17px box + 9px flex gap = 26px` at 375x730, where main inserted **zero**.
Gate 73's new `C3g` prints that every run. It is a NOTE and not an assertion on purpose: removing it means
reserving the box on *every* Review screen, including for players who never filter, which spends the same
pixels permanently to save them on one tap. That is a product trade-off and it is Kunal's, routed as
`jobs/orchestrator-the-coverage-line-now-adds-a-commanded-26px-jump-where-main-has-zero-...-2026-10-09`.

**ONE OF THE THREE RESIDUALS WAS WITHDRAWN AS A FALSE DEFECT AND MUST NOT BE RE-TAKEN.** A closer screen read
the empty state's Clear button as below the fold at `top 748.5` in a 730 viewport. #507 measured the band from
the filter row the player has just tapped to the bottom of that button as 291.6px at 730, 291.6 at 761 and
341.6 at 568 — it fits every geometry, and the 748.5 came from reading at a scroll origin the player is never
at. `B6c` was already the right assertion and is untouched. Its published 291.6 figure is itself now withdrawn
as state-dependent (270.59 / 320.59) at `chess.jsx:7725`; the **conclusion** survives on `B6c`'s own
reachability walk, which scrolls and re-reads the rect the #382 way.

## THE FINDING THE NEXT RUN SHOULD ACTUALLY CARRY

**An upheld veto was silently un-fixed between two of #507's own commits.** Its antagonist vetoed gate 73's
`E7b` when it read `ungFound` (the element exists). `bebd6ef` repaired it to `ungFound && ungInk`, and that
repair was **correct against the bundle of its moment**, which carried `visibility:_ungr>0?'visible':'hidden'`
on the element. `880fda5` — part 3, taking the other antagonist's painted-ink recommendation — **deleted that
toggle.** Nothing in the shipping tree sets `visibility` on the element or any ancestor, visibility is
inherited, so `ungInk === ungFound` identically and the predicate collapsed back to the vetoed one.

Measured rather than argued: control `nc-ungr` (`53d219441ba6`, `gradeCacheUsable` reverted to `!!st`, which
IS the #503/TC-R61 P0) made **E7b PASS** with payload
`{"ungraded":"All 7 games are graded.","graded":null,"total":null}` — the screen stating a complete answer over
a stale library, certified by the assertion written to forbid exactly that. Re-pointed at the warning branch
(`ungGraded<ungTotal`, which is C2's existing shape) and it now reddens.

**The generalisable part is not "re-run your controls".** It is that a repair and the mechanism it depends on
can live in one build, two commits apart, with nothing mechanical connecting them — and that #507 *did* write
the assertion its veto asked for, so the class rule as currently drafted would have been satisfied at
`bebd6ef`. Recorded on `jobs/veto-fixes-land-with-no-assertion-because-the-gate-is-frozen-pre-veto-2026-09-28`
rather than as a new id.

**AND MY ANTAGONIST WAS WRONG ON ONE DECISIVE FACT, which is why it was reproduced before being acted on.** It
predicted `nc-ungr` would score 90/0 — that the P0 had *no* coverage left. It scores **86/5**: the control does
redden, via the invalidation assertions, because one mutation breaks both paths. What was unguarded is narrower
than claimed and still real — a display-only regression leaving invalidation intact would have passed unseen.

## FIVE POINTERS FOR WHOEVER HOLDS THE PEN NEXT

1. **A TAKEOVER IS CHEAP AND THE TREE IS USUALLY SOUND — VERIFY THE CLAIMS, NOT THE CODE.** This run changed no
   line of `chess.jsx` and still found a veto-level defect, five stale control figures and nine false claims,
   all in the *records about* the tree. When you inherit a dead run's branch, the code is the part its
   antagonists already attacked; the claims are the part nobody re-read.
2. **RE-RUN THE CONTROL SET AGAINST THE GATE AS IT SHIPS, not as it was when you measured.** Every row's
   `pass + fail` should sum to the gate's assertion count — that one arithmetic check would have caught all
   three of #507's stale sets instantly, and it costs nothing.
3. **NEVER READ AN EXIT CODE THROUGH A PIPE.** `fastgate.sh ... | tail -20; echo $?` printed **0** (FAST GATE
   GREEN, push with no suite). The real code is **2 = GO FULL**. #506 recorded this class against itself twice
   and it still landed here, on the one command that decides whether the suite happens at all. A `||` at the
   end of an `&&` chain bit the same way, reporting the suite dead when an empty `grep` had failed four
   commands earlier.
4. **DO NOT REBUILD AN INHERITED BUNDLE TO FIX A COMMENT.** `app.js` is the bundle *of* a specific `chess.jsx`,
   and `build.sh` embeds the minute in the stamp, so any rebuild changes the md5 and orphans every control and
   determinism figure measured against it. Three false comments in `chess.jsx` are therefore left standing,
   named here and on the job, and owed by the next build that rebuilds anyway.
5. **THE REGISTER ROW UNDER YOUR OWN runId IS NOT BOOKKEEPING.** All five prior #507 rows name a dead run.
   Without the sixth, nothing records which run gated and pushed the artefact, and the audit trail for the
   build ends at a session that never finished.

## WHAT IS OWED AND NOT DONE

1. **The auditor did not run, making it NINE consecutive builds.** The structural cause is not this lane's:
   seventeen of eighteen lanes have no enabled scheduled task and a build lane may not enable a trigger [R20].
   Owned by `jobs/seventeen-of-eighteen-lanes-have-no-enabled-scheduled-task-2026-10-03`. One antagonist ran,
   not two: the tree arrived already cleared by #507's full blind pair, so a single careful pass was the right
   trade — **and no coverage estimate is published from it, because a single antagonist cannot produce one.**
2. **`builds/507` is `closed:false` with its derived auditors unrun**, for the same reason.
3. **Three false comments in `chess.jsx`** (`:7424`'s TDZ justification and `:7441`'s "cannot drift apart
   again", both describing a draft that was reverted when antagonist B's finding 5 was declined). Withdrawn in
   the gate and on the job; owed in `chess.jsx` by the next build that rebuilds it.
4. **Two of ten assertions in `gates/regress/25-online-clocks.js` cannot fail**, found by this run's required
   rotating audit and filed with the fix and the controls that would close it. The file is **byte-identical to
   `13a4ba2` (#416)**, and #493's antagonists already named two of these — so this is the second independent
   audit to land on the same two lines with nothing changed in between. Next rotation starts at
   `gates/regress/26-invariants.js`.
5. **`gates/closeout.sh` does not exist on main.** #504's pointer 5 says it "now greps the FINISHED records for
   a false ship claim and exits 1" — that script is on no ref. #504 stood down and never pushed it, so the
   mechanical guard against a records file claiming a ship it did not make was lost with its container. This
   run wrote its records by hand and checked them by reading.
6. **The live site is still unverifiable from this container** — `learntocheckmate.github.io` is blocked by the
   egress proxy, so every claim here is about a bundle and never about the deployed site. Inherited, still live.
7. **The three known-absent gates remain absent** (`50-drill-verdict-no-jump`, `17-drill-grade-arithmetic`,
   `52-drill-grades-the-move`), so this GATES GREEN is honest and blind in exactly those three places — the
   drill verdict's board movement and the drill's grading arithmetic. The suite reports them every run on
   purpose.

**AND ONE THING THAT IS NOT OWED, said so it is not redone:** the control set does not need re-deriving. All
five controls were rebuilt on the shipping source `83610da7d7c0`, each is one change from it, each reddens a
disjoint set, every row sums to 91, and the two repaired assertions are each uniquely caught. Gate 73's 91 PASS
is reproduced on two independent instruments (standalone three times, and inside the suite).
