# HANDOFF — where the last run left off

Read this, then `claude/BUILD-CONTEXT.md`, then the flags. The procedure is tracker
`5326ERvZCZ5tEYRkPavPTF`, collection `prompts`, docs `common` then `build-run`; where it and CLAUDE.md
differ, the tracker wins.

Build **#518**, runId `build__1791932300000`, 2026-10-13/14. Pen taken free on a clean release (eighth
consecutive) and released at close-out.

## *** READ THIS FIRST: #518 RAN UNDER A ONE-RUN OPENING INSIDE A USAGE PAUSE THAT IS STILL IN FORCE ***

`docs/restart-readiness` read **READY** only because the orchestrator opened it at 6:47pm ET on Kunal's
word, **for exactly one run**, to land two re-cut payloads. Its own `closeRule` sets **PAUSED** again as
soon as the pen is taken. **So the next fire almost certainly stands down at STEP ZERO, and that is
correct, not a fault.** Do not read this green as the fleet being open.

## *** #518 WAS THE INTEGRATION SLOT. NO APPLICATION CODE, AND ONE PAYLOAD OF TWENTY LANDED. ***

**MEASURED:** `app.js` (`f47aa0197967`), `chess.jsx` (`b6b7fbb25df0`) and `index.html` (`4a95e865bca8`)
are byte-identical to `origin/main`, by `md5sum` against `git show origin/main:<f>`. `appChanged` is
**no**, no bundle was built, and the suite re-gated main's own registered `#511` artefact under
`CT_EXPECT='#511'` — the resolution #506 reached and #513, #514, #516 and #517 reused.
**SEVENTH CONSECUTIVE BUILD WITH NO APPLICATION CODE ON MAIN,** and the drill-verdict P0 Kunal reported
twice is still live across all seven.

**`GATES GREEN #518` IS A RE-CERTIFICATION OF MAIN'S OWN BUNDLE, NOT NEW COVERAGE.** 59 suites,
4885 PASS, 0 FAIL — identical to #514 and #517 to the assertion, because not one path under
`gates/regress/` is in the diff.

## The accounting, stated once so nobody reconciles it twice

**20 unlanded payloads = 1 LANDED + 1 applied-then-REVERTED + 3 excluded on S2 + 3 dropped on #517's
upheld vetoes + 1 superseded + 11 refused on a stale base.** Every one carries an `integrationResult518`.

Shipped: `origin/main 5ede631 -> <close-out sha>`, a clean fast-forward. Gated sha **`42fa803`**; the
close-out commit above it adds only records and changes no served file.

## THE ONE THING THAT WILL COST YOU A RUN IF YOU DO NOT READ IT

**DO NOT RE-LAND `patches/proc-lane1-art-gates-buildnum-sh-delta-bound-2026-10-13-recut` AS IT STANDS.**
It applies cleanly and the delta bound in it is *good work* — minting #518 through it hit exit 0 first
try, and its margin of 10 is never approached (max historical distinct gap: 4). It was reverted at
`613efca` because it renumbers `gates/buildnum-selftest.sh`'s fixture onto **`#518/#519`**, and `:22`
seeds that fixture by **copying the live register**: 95 pass/0 fail before the mint, **93/2 after**, 92/3
once #519 is minted. The three commits are **coupled** — keeping the bound and reverting only the
renumber measures **89/6**, worse than landing nothing. The repair is already in the same file eight
lines down: cases 22–25 build an isolated register (`R08D`, `seed_r08`); cases 9–19 must do the same,
and then the fixture number stops mattering. Full measurements:
`jobs/the-buildnum-selftest-fixture-was-renumbered-onto-the-live-series-so-it-breaks-the-moment-that-number-is-minted-2026-10-13`.

## What the next run is owed, in order

1. **The three S2-excluded payloads still need a re-cut** — `recut-excluded-s2-payloads-2026-10-13`,
   now excluded by **two consecutive passes**, so the exclusion is stable and repeats until somebody
   re-cuts. Two of the three touch the same two buildnum files, so the fixture job above is a
   **prerequisite**, not a sibling.
2. **`records-gate.sh`'s new arm is landed and must not be credited.** Antagonist B's veto was upheld:
   it must **not** be recorded as closing
   `jobs/the-guard-registers-cannot-leave-force-until-the-ratchet-speaks-the-consumers-language-2026-10-10`,
   and `held-trees.tsv`/`build-numbers.tsv` must **not** leave `classify()`'s FORCE arm on its strength.
   Three small fixes with existing controls are on
   `jobs/records-gates-new-parse-stability-arm-changes-no-verdict-and-its-headline-control-passes-on-the-arm-it-supersedes-2026-10-13`.
3. **`ta-art-claude-stories-TEST-CASES-md-hm-051-rows-2026-10-13` can never be landed by any pass** — its
   `patch` field is not `git format-patch` output at all (`S0` caught it; `git am` reports "Patch format
   detection failed"). The owning lane must re-export it. Recorded so it stops being retried silently.
4. **`&& over.docScroll===0` is inert by construction** and still live as a conjunct in three assertions
   (`11-lesson.js:15`, `:20`, `13-play-after-moves.js:48`). Filed; `49-home.js:456` shows the right
   treatment. Antagonist A's rotating audit **resumes at `gates/regress/11-lesson.js:74`**.

## Two things that bit this run and will bite the next one

**The tree moved three times under a blind antagonist pair.** Both reports carry measurements against
shas that no longer exist in the diff, and both had to stamp every number with its sha to stay usable.
If you revert or amend mid-pass, tell the pair, or expect to reconcile stale findings yourself.

**`gates/buildnum.sh check '#NNN' | head` exits 141, not 1.** `check` pipes through a `while read` loop,
so SIGPIPE surfaces as 141 and a wrapper testing `-eq 1` reads an ISSUED number as neither issued nor
free. Reproduced twice. Nothing documents it; carried on the fixture job.

## Still true, carried forward unchanged

The live site is unverifiable from this container (egress proxy), so no run here can check the deployed
bundle. **The auditor has not run for seven consecutive builds.** Gate 50 is still in `gates/pending/`.
Five gates are known-absent and the suite reports them every run on purpose, so every `GATES GREEN` here
is honest and blind in exactly those five places.
