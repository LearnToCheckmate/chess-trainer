# HANDOFF — where the last run left off

**Build #508. Read `gates/regress/73-review-list-filter.js`'s block F and block G headers before you
touch that gate.** Everything below is either measured this run or explicitly marked as not.

## What #508 did, in one line

Closed a coverage hole in an already-green gate. **No app behaviour changed** — `chess.jsx` is
comment-only, proved by stamp-normalised byte identity with main (968504 bytes each), not asserted.

## The hole, because it is the reusable part

Gate 73's F2/F3 are the no-jump assertions over the Review filter row's reserved Clear chip. On the
**two-account** fixture every earlier run used, they have **zero discriminating power at BOTH 375
geometries** — a bundle with the reserve removed passes them unchanged — because at two accounts the
ghost fits on the line the account chips already occupy, so the reserve is spent nowhere. Block G
drives a **four-account** store and reddens: 94px/2 lines → 144px/3 lines, delta 50, at `kunal730`
and `kunal761`.

**THE VARIABLE IS TOTAL CHIP WIDTH, NOT ACCOUNT COUNT.** The relation is not monotonic — no-op at 1,
2, 3 and 5, live at 4 *with these labels*, and short labels `al/be/ga/de` give a four-account state
at 94px/2 lines. The first draft said "the account count moves the wrap boundary"; that is
**withdrawn** everywhere it was written, including inside my own first withdrawal note.

## Do not "restore" se to block G

The count fell 109 → 105 and **that is not weakening.** G0b *failed* at `se` with
`otherTops [603.8,653.8,703.8]` against `clearTop 703.8`: at 320 the Clear chip **shares line 3**,
the row is 144px/3 lines on both bundles, and block G there was four assertions duplicating block F
plus two that pass on the only control. Six assertions left and no coverage did. If the labels or the
chip set change, 320 may become live again — **re-measure it, do not assume it stays dead.**

## THE THING I DID NOT FIX, AND IT IS ABOUT KUNAL'S OWN PHONE

At four accounts 375x730 the painted Clear chip rests **wholly under the `position:fixed` tab bar or
off-screen**, hit-tests to `SPAN:"Home"`, and a real tap **navigates instead of clearing**. Found by
antagonist B from the shipped-surface door; my own block G stayed green because `mkTap` scrolls the
control into view and a thumb does not.

**Why it is not asserted:** it is pre-existing on main, so an assertion would redden the suite on a
tree no build broke and block every push. Instead:
- measured every run as note `G5-occlusion` (fixed bar, chip box, `coveredByBarPx`, `offScreenPx`,
  `hit`, `hitIsClear`);
- filed as **instance 5** of `jobs/the-drill-nav-row-rests-under-the-tab-bar-at-320x568-on-main`, the
  first instance **not** on a short screen, with the existing fingerprint incremented rather than a
  duplicate filed (`filedThisRun` 0, R50 holds);
- carried as the **fourth known-absent manifest row**,
  `76-no-control-under-the-fixed-tab-bar.js`, so `gatemanifest check` names the gap every run.

**One correction against B:** its framing "whether the filter can be turned off at all" overstates —
the grade chips sit at y 588.9 well clear of the bar, and the empty state has its own Clear filters
button.

## Two more things named rather than claimed covered

1. `n===0` prints *"All the 0 games this filter is looking at are graded."* — a completeness claim
   over nothing, reachable with a non-matching name box plus a grade chip. Block C drove `n===1`;
   nobody has driven zero.
2. **The inherited residual-(3) figures do not reproduce and are withdrawn**: `empOH 85 → 64`,
   "moved UP 21.0px", and the sentence naming "the 6 graded". Over 70 samples by me and 200 by an
   antagonist, `empOH` is 85 in every state and never 64, and Clear takes exactly one y value and
   moves 0.0px. **The quoted sentence is unreachable by mechanism** — g6/g7 carry moveless PGNs, so
   `_nG` cannot exceed 5 and `_ungr` cannot reach 0. Whatever that residual was originally about has
   **not been re-identified**, so it is not closed; it is unmeasured. It was the one inherited figure
   I carried without re-deriving while re-deriving every other one.

## Process lessons this run paid for

- **The sum check is necessary and NOT sufficient.** The nc-noghost control row was published three
  times in one build — 82/27, 85/24, 83/22 — and **all three summed correctly** (109, 109, 105), so
  the sum check never fired once. What caught the first was reading *which ids* failed; the second, a
  new assertion failing on the shipping bundle. Neither was arithmetic.
- **Five source mutations, not six.** nc-noghost and nc-noreserve are the same one-line change re-cut
  against a later source, with a strict-superset red set — the sets differ because the *gate* grew.
- **My own two new assertions were defective and my own gate run caught both.** G0b read a `top`
  field the shared `READ` helper never emitted, so it compared `undefined` to `undefined` and
  reddened on the *shipping* bundle (#394). G5 ran *after* `tapG('gf-clear')`, so it measured a
  ghosted chip at a scrolled position — 342.9 where the resting value is 688.9 (#507's own
  known-scroll-position trap).
- **A freeze file printed but not rewritten is a stale freeze.** Three instances of one class this
  run: the stale frozen inputs I handed the antagonist pair (which paired a pre-split control log
  with a post-split shipped log — the same mismatch that produced my withdrawn 82/27); an apparent
  mid-run gate edit that was a **false alarm** (the gate's mtime predated the run's first output and
  matched its committed blob); and a published freeze of "96 files" that is **unreproducible**
  because I overwrote the file.
- **The freeze set must be derived from the runner.** My first re-derivation silently omitted
  `mountcheck.js` and `unit-drill-why.js`, both node-invoked by `gates.sh`. The set is now 74 files,
  defined by what the runner executes, published as a command.
- **#493's correction matters:** the suite copy must stay **inside `gates/`**, because `gates.sh:33`
  derives `G` and `ROOT` from its own location and a scratch-directory copy cannot resolve them.

## Standing items re-tested, so you do not re-test them

- **Flag 498's standing ask is DISCHARGED.** It calls landing the #498 held row on main "the cheapest
  and highest-value thing the next run can do". `gates/held-trees.tsv` row 78 on main already carries
  build #498 (md5 `95ee23d86752`, four shas). The `e60f12585339` that flag names is **main's own
  bundle**, never a held tree. Nothing owed.
- **Band 16 is non-empty but holds nothing takeable** [R23]: the two drill jobs are blocked by an open
  contradiction R45 forbids this lane from resolving. Departure note recorded.
- **The R30 pair is corrected** [R18]: open P0 is **20** and open P1 is **151**, measured by the
  method published in the run report. The 17 and 145 I cited earlier in this run do not reproduce and
  are withdrawn. Both are **lower bounds** — the query matches an exact string in a free-text field,
  already filed as `jobs/four-job-fields-are-free-text-so-four-different-queries-silently-under-report`.
