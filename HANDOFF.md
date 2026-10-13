# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#516**, runId `build__1791901250083`, 2026-10-13. Pen taken free on a clean release and
released at close-out. **HELD — nothing pushed to main.**

## *** FIRST GIT ACTION OF YOUR RUN: `git fetch --unshallow`. NOT `--deepen=400`. ***

This replaces the instruction that stood here through #515. **`--deepen=400` is measurably
insufficient and it fails SILENTLY WITH EXIT 0**: from a `--depth 50` clone it reaches **456 of 1162**
commits, which is enough to answer the one ancestry question #516's job happened to cite and **not**
enough for 24 of the 78 archived gatelogs, 20 of the 105 refs on origin, two shas named in CLAUDE.md's
own branch-record table, or the `ecstatic-tesla` merge-base that table's figure rests on. Worse, with
that partial deepen the branch-record cell's own command prints **`456 50`** where the truth is
**`624 1`** — wrong by 50x, no warning, exit 0. Use `--unshallow`; it costs one fetch on a container
that is about to spend 70 minutes in a browser.

**And `gates/verify-log.sh:1222` still hard-codes that 400**, with a comment asserting its failure
branch is unreachable. It is reachable by 24 logs. #516 left it unfixed on purpose — it needed that
script to gate its own push — and routed it as
`jobs/the-deepen-400-in-verify-log-is-calibrated-against-a-main-that-has-since-grown-2026-10-13`
with the full measurement attached. **If you are a shallow container trying to verify an archived log
and it refuses for clone depth, that job is your answer, and `--unshallow` is your workaround.**

## *** #516 HELD. NOTHING WENT TO MAIN. ITS WORK IS ON A BRANCH AND YOU SHOULD LAND IT. ***

`GATES RED #516` — one red section, `48-lesson-flow`, on the **known portrait fit-loop latch**. Second
recorded firing, reproducing #512 to the digit (35.23 / 227.23 / board 192, four 192 readings in each
log). Not this tree's doing: the tree is records-only and the bundle is main's own. But a red log
authorises nothing, Kunal decided on 4 Oct that this gate keeps blocking and the app gets fixed, and
the fix he chose at 9:28am ET today is parked under `docs/product-pause-2026-10-13`.

**WHAT YOU SHOULD DO ABOUT IT, AND IT IS THE MOST ACTIONABLE ITEM IN THIS FILE.** Seven corrections to
*this file's own rulebook* are sitting on `origin/claude/practical-sagan-k2famj` at **`1202355`**, four
commits ahead of main, touching only `CLAUDE.md` and `gates/build-numbers.tsv`. They include a
prescription CLAUDE.md was giving every session — `git fetch --deepen=400` — that #516 measured to
leave a different figure **on the same page** wrong by 50x with exit 0 and no warning. **If your suite
goes green, cherry-pick or merge that branch and land it.** It needs no rebuild: `app.js`, `chess.jsx`
and `index.html` on it are byte-identical to main. Leaving it on a branch is the #441 shape this
project has already paid for once, where the only copy of a warning lived on a ref that never merged.

## *** #516 CHANGED NO APPLICATION CODE. NOTHING ON KUNAL'S PHONE CHANGED. ***

**MEASURED, not assumed**, and independently by an antagonist with no database access: `app.js`,
`chess.jsx` and `index.html` are byte-identical to `origin/main` — md5 `f47aa0197967`, `b6b7fbb25df0`,
`4a95e865bca8` — across all three commits. `appChanged` is **no**, the bundle stays `f47aa0197967`
stamped `#511 - 2026-10-10 07:40 ET`, and #516 never ran `gates/build.sh`: it took the number for the
register's sake and minted no bundle, gating main's existing bundle through the `gates.sh:161`
`CT_EXPECT` seam. A green suite here is a statement about the **harness and the records**, not about
anything a player sees. **Fifth such build in a row** (#512, #513, #514, #515, #516) — which is itself
worth noticing: the lane has spent five consecutive passes on its own instruments.

## What #516 did, and the one thing it got wrong twice

It took `jobs/the-is-ancestor-instrument-returns-false-negatives-in-a-shallow-clone-2026-10-01`, scope
reduced to its two CLAUDE.md edits, and landed both: a new row documenting the instrument, and a
re-measurement of the branch-record cell at `CLAUDE.md:52`.

**THE FINDING THAT MATTERS MOST IS NOT THE ONE THE JOB ASKED FOR.** The cell's historic figures — 539
and 46 as the ahead and behind counts — were filed as stale leftovers from #376's era. They are not.
`git clone --depth 46` plus the cell's own command prints `46` then `539` **today**: the branch's whole
reachable history is 539 commits, so a main truncated to 46 leaves every one of them on the branch
side, and **the left-hand number simply is the clone depth**. The figures were reproducible by anyone
on any day they stood there; what was missing was the precondition. So the rule now in CLAUDE.md is
**publish the clone depth beside any count derived from graph distance** — and the two halves of the
job turn out to be one defect, since the branch-record cell was a live instance of the instrument the
new row documents.

**BOTH BLIND ANTAGONISTS VETOED AND BOTH VETOES WERE UPHELD.** Six claims in the first draft of that
row were wrong and were fixed before the push to main, each re-measured by me rather than taken on
report: the `--depth 50` recipe omitted the load-bearing `--no-single-branch`; `--deepen=400` was
prescribed; "THIRTEEN CONSECUTIVE CONTAINERS, #502 to #516" is 15 numbers and 14 runIds; the
discriminator is reachability through fetched objects, not object presence; `error: no such commit`
comes from `git branch --contains` and never from `merge-base`; and "LIES IN TWO DIRECTIONS" is one
direction too many, since a graft only ever removes reachability — **a YES can be trusted and a NO
cannot.**

**And one sentence was corrected twice, the second correction undoing the first.** Antagonist B argued
from content that #504's two readings must contradict each other; the argument was tight and I shipped
it. Antagonist A ran the command: `git branch -a --contains` omits main, so the readings **agree** and
are wrong together, which is exactly what makes a second opinion corroborate the lie instead of
catching it. Recorded in CLAUDE.md as what reproduces, with the note that #504's record does not.

## THE SUITE: `GATES RED #516`

**14:35:12Z to 16:28:04Z, 113 minutes.** 59 sections green, **1 red** (`48-lesson-flow`), **4884 PASS**,
1 FAIL (printed twice — once in the block, once in the section summary). Manifest 58 required / 58
present / 0 missing / 0 unlisted / **5 known-absent**. Footer self-consistent: actual `^PASS` is 4884
and the footer says 4884. `gates/verify-log.sh` **refuses it**, for the right reason — *"does not end
with a clean 'GATES GREEN #NNN'"* — and that refusal is correct and was expected.

Ran from the frozen sibling copy `gates/.gates-run-516.sh`, md5 `9dd41aaff6c2a7b191de3df1a02a4164`,
equal to `gates/gates.sh` **at launch and at finish**. `CT_EXPECT='#511'` so mountcheck asserted the
bundle's true stamp while the log is stemmed `#516`.

**The PASS total was pre-registered before the result, and it predicted the decomposition.** #513,
#514 and last night's nightly each read **4885** over this same never-rebuilt bundle; my diff touches
no file under `gates/regress/`, so determinism predicted equality rather than a floor, and with one
assertion flipped the prediction was **4884 + 1 = 4885**. That is exactly what landed. Treat that as
the baseline: *if your PASS total over `f47aa0197967` is not 4885 minus your FAILs, something moved
that you did not move.*

## THE BLIND PAIR: BOTH VETOED, BOTH UPHELD, AND THEY DISAGREED WITH EACH OTHER ONCE

A entered by the diff door with database tools; B by the shipped surface with **no** database tool, on
purpose. Neither could see the other. Both vetoed; both vetoes were upheld; every contested claim was
re-measured by me before I amended anything, and that mattered in both directions.

- **B was wrong once, in my favour.** It reported the `--depth 50` recipe returning 128. Measured, it
  returns **1 with empty stderr** in a `--no-single-branch` clone and 128 only single-branch — so the
  real repair was to name the clone shape, not to add the fetch B asked for. **This container is
  multi-branch (105 refs), so the routine lives in the SILENT variant**, which makes the finding more
  serious than B knew.
- **A was wrong once too**, offering "present and inside the graft" as the discriminator. Measured,
  `origin/main~50` answers correctly because sibling packs supply parents and main walks **57** commits,
  not the 50 requested. The real predicate is reachability from `origin/main` through the objects
  actually fetched — which is what the row's own refinement (b) had said all along.
- **And they contradicted each other on #504's anecdote, where the measuring door beat the reasoning
  door.** See the head of this file.

What the pair did NOT cover, named so you do not assume it: neither ran the gate suite, and B could not
see any tracker document, so its "fast-gate-state is stale" sub-finding is wrong — `docs/fast-gate-state`
re-certified `f47aa0197967` at 01:01:33Z today, which B had no way to read. **`HANDOFF.md`'s own fast-mode
paragraph was the stale thing**, and it is corrected below.

## WHAT IS LEFT, NAMED

1. **`gates/verify-log.sh:1222` still hard-codes `--deepen=400`** against a main that has grown from 860
   to 1162 commits. 24 of 78 archived logs are past its reach. Routed with the full measurement; see the
   head of this file. **Fail direction is REFUSE, never accept** — nothing has been wrongly authorised.
2. **`gates/regress/70`'s `resultText` predicate matches ordinary chrome.** Unanchored
   `/won|win|lose|lost|…|draw/i` makes `Close` match via *lose*, `Withdraw` via *draw* and
   `is winning here` via *win*, so F0/F1b's "the screen states a result" can be satisfied by the gate's
   own sheet chrome. #391's rule unapplied. Job filed, P1.
3. **`gates/regress/41`'s five coach-overlay absence assertions cannot fail** against any bundle built
   from main — all four `data-ct` tokens occur 0 times in `app.js`. Keep them as tripwires; the real
   coverage is the nine-point square hit-test beside them. Job filed, P2.
4. **Nine integration payload bases are absent from origin ENTIRELY**, not merely outside a graft —
   checked against a fully unshallowed clone with all 105 refs. So `S6-APPLY-ORDER` can never be checked
   for that set and no deepen helps; those payloads must be re-cut or retired by someone who still has
   the trees. Job filed, P1, owning lane **orchestrator**.
5. **The integration slot is still structurally deadlocked.** STEP 1I fires, its mandatory pre-check
   S2-FAILs on two `gates/buildnum.sh` payloads, so nothing lands — and those are the payloads a
   prerequisite needs. Recorded on the band-17 job; the one-sentence fix is an orchestrator job.
6. **The auditor still has not run.** `expectedAuditors` names `build-external-challenger` and
   `auditedBy` is empty for the **sixteenth consecutive** build.
7. **`prompts/common` says `prompts/build-run` is ~92,000 characters; it is 191,950.** Stale by 108%.
   On the tracker, so this lane cannot edit it.
8. **Implausible stamps are still accepted** (`so_pred` pins shape and length, not value) and
   **`gates/held.sh check` is still not called from the fast tier**, both deliberately, both from #514.

## If you are the next run

- **LAND #516's BRANCH if your suite goes green.** `origin/claude/practical-sagan-k2famj` at `1202355`,
  records-only, byte-identical app. See the top of this file.
- **YOUR SUITE MAY GO RED ON SOMETHING THAT IS NOT YOURS, AND HERE IS HOW TO RECOGNISE IT IN ONE GREP.**
  `grep -n 'board":192' gates/logs/<N>-all.log`. If `48-lesson-flow` is your only red section and its
  single FAIL reads *"Flip runs 35.23px past its OWN row ... at board 192 ... (227.23px against 192px)"*
  at 320x540 `[endgame-demo-end]`, that is the known portrait fit-loop latch, it is live on main, and it
  is owned by `jobs/lesson-demo-board-is-bistable-at-375x568-2026-09-29` (priority 16, parked). It is
  **rare, not deterministic** — and do NOT quote an incidence as a per-run probability, because the
  recorded figure is an observation frequency across six builds on six different bundles, which that job
  says in terms must not be read that way. Record it as a recurrence; do not re-pin gate 48 (Kunal's own
  bar calls a pin changed to reach green a breach), and do NOT add a `held-trees` row — that register is
  keyed on bundle md5 and the bundle is main's own `f47aa0197967`, so a row would make every later run's
  `held.sh check` refuse the bundle main is serving.
- **WHEN ASKING "HAS THIS HAPPENED BEFORE", SWEEP `gates/logs/*.log` AND NOT `*-all.log`.** #516 swept 57
  `*-all.log` files for a 192 board and got zero, concluding the event was unprecedented in the project's
  whole history and hunting a container cause that does not exist. The prior firing is archived — as
  `512-RED-the-pre-existing-gate-48-latch-fired-at-320x540.log`, which no `*-all.log` glob can see,
  *because it was named descriptively for being the exception.* The one log that answers the question is
  the one the conventional selector hides.
- **`git fetch --unshallow` FIRST.** See the top of this file for why `--deepen=400` is not enough.
- **Fast mode may actually be available to you, and #514's note here was stale.**
  `docs/fast-gate-state` certifies `f47aa0197967` — which is what main serves — as of
  `2026-10-13T01:01:33Z`. #516 still paid the full suite, because `classify()` puts both `CLAUDE.md` and
  `gates/*.tsv` on the FORCE list and this diff touches both. Check the state document yourself; do not
  carry this paragraph forward without re-reading it, which is the mistake it is correcting.
- **This container was NOT shallow** (`--is-shallow-repository` printed false, 105 refs), the first in a
  long run of shallow ones. Measure your own rather than inheriting a tally:
  `head -1 .git/logs/refs/remotes/origin/main` tells you how yours was fetched.
- `app.js` and `chess.jsx` are byte-identical to main. If you intend to change application code you are
  the first in **five** builds — re-read "the board is sacred" first.
- The UAT kick (`fire_trigger` on `trig_01JGZboE9JSXYgMSXqA5GWkB`) is **not available** in this session.
  I did not substitute another trigger and did not enable, disable or edit any trigger [R21].
