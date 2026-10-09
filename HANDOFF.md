# HANDOFF

**#506 SHIPPED, 2026-10-09. It is the INTEGRATION RUN and it changed NO APPLICATION CODE.** `app.js` is
byte-identical to #505's registered artefact `ebb88c8f76f7` and `chess.jsx` to `a58bafeb9f65`, so
**nothing on Kunal's phone looks or behaves differently because of this build** — say that first, because a
reader skimming "SHIPPED" will otherwise assume otherwise. What landed is eleven of twelve parked payloads
from four process-build lanes that cannot push: four audit instruments that were off main, two regression
gates, the suite driver's `--selftest` arm, a case-register row and eleven lane records.
**GATES GREEN #506 at `59` sections / `4577` PASS / 0 FAIL** over gated sha `0a73757`, bundle
`ebb88c8f76f7`, source `a58bafeb9f65`.

**THE SLOT OPENED FOR THE FIRST TIME IN FOUR DAYS.** STEP 1I's window is UTC hour >= 11. #502, #503, #504
and #505 all woke before it, each measured the slot shut, and each wrote that it was owed by "the first fire
after 11:00Z that wins the pen". This run woke at 11:21:08Z. **The manifest was TWELVE, not the five handed
forward** — re-derived, not carried — because the backlog grew while the window stayed closed.

## READ THIS FIRST: FIVE POINTERS, AND THE FIRST IS THE ONE THAT NEARLY COST THIS RUN ITS LOG

**(1) THE BUILD NUMBER YOU GATE UNDER IS NOT THE NUMBER THE BUNDLE IS STAMPED WITH, AND `CT_EXPECT` IS THE
SEAM.** I launched the suite as `'#505'`, reasoning that `gates/mountcheck.js` asserts the bundle carries the
number being gated and that this run may not rebuild (`gates/build.sh` embeds the minute in the stamp, and
`app.js` in the diff is a STOP under STEP 1I.3's allow-list). Antagonist A vetoed on four limbs and three
were right — #505 is issued with five register rows, #506 was unminted, and
**`claude/agents/gatelogs/505-all.log` ALREADY EXISTS COMMITTED**, so archiving over it would have destroyed
the #416-class evidence this project keeps two logs for. THE FIX IS ONE ENV VAR: `gates.sh:160` is
`export CT_EXPECT="${CT_EXPECT:-$N}"`, so `CT_EXPECT='#505' gates/.gates-run-506.sh '#506'` stamps the log
#506 while mountcheck asserts the bundle's true #505 stamp — green at 16 PASS. **AND MY OWN PREMISE WAS
WRONG TOO:** `node gates/mountcheck.js '#506'` run directly PASSES at 14/0, because that assertion is
conditional on `CT_EXPECT`; the suite's mountcheck reports SIXTEEN, and the two extra assertions are the
stamp check. The 14-vs-16 discrepancy is the instrument that catches this. Cost: ten minutes.

**(2) A VETO CAN BE RIGHT ON THE VERDICT AND WRONG ON THE DECISIVE FACT — CHECK IT BEFORE YOU ACT.** A's limb
(1) said neither registered #505 bundle is `ebb88c8f76f7`. `awk -F'\t' '$1==505'` over
`gates/build-numbers.tsv` returns FIVE rows, FOUR of them `built`, and `ebb88c8f76f7` IS the fourth. A later
conceded it had run `buildnum.sh check | head -8` and published "neither" over a listing it had TRUNCATED —
"the same sin as the `| tail` I was engaged to catch". **I made the identical error earlier in the same run**,
reading an exit code through `| tail` and printing 0 for a script whose own last line says RED. Two
independent instances of one class in one run: a count or a status read through a truncating pipe.

**(3) RUN THE CROSS-READ. IT FALSIFIED A CAUSE I HAD ALREADY COMMITTED.** Both antagonists found the
`gates/audit/play.js` roster gap independently and both said one roster row closes it — correct. But B
located the recruiting citation at `gates/regress/65-promotion-after-gameover.js:282`, I wrote that into the
roster row AND the commit message, and A falsified it on the cross-read: `cited-not-run.sh`'s own
`default_records()` scans the record documents and **never `gates/regress/`**, so a line in a gate file
cannot recruit anything. The real citation is `claude/PROCESS-LOG.md:858`. A's sentence is the one that
matters: *a run that acted on B's line would edit the gate, re-run the audit, and find the member still
there.* Corrected in its own commit. The two doors disagreed about a mechanism and the disagreement was the
product.

**(4) A FIX FOR STALE CITATIONS CAN BE A STALE CITATION. MINE WAS.** This batch grows `gates/gates.sh`
329 -> 395 lines, all below `set -uo pipefail`, so every citation into it is stale by **+66** — and five were
brand-new text in these very payloads. I re-pointed them BY SYMBOL per #503's pointer 4. **My first draft
quoted them literally in the counted `path:NNN` form, so the note explaining the de-pin became three live
citations itself and the tree-wide count did not fall.** `claude/PROCESS-LOG.md` already records that exact
failure. Rewritten in words. Nineteen PRE-EXISTING live sites remain stale and are NOT fixed: five of their
ten files are ones this run held no R44 lock on, and `RUN-LOG.md`'s six are historical rows that must not be
rewritten. Enumerated with the command on the job that owns the cause.

**(5) THE FROZEN COPY PROTECTS ONE FILE OUT OF SIXTY-THREE, AND THE OTHER SIXTY-TWO ARE THE DANGEROUS ONES.**
Copying `gates.sh` to `gates/.gates-run-NNN.sh` inside `gates/` is right and it worked (all three md5s equal,
`ROOT` resolves). But the suite reads `gatemanifest.sh`, `mountcheck.js`, `lib.js`, `drive/play.js` and all 58
regress gates **from the live working tree, progressively, over 95 minutes** — and node reads a gate wholly
at require time, so a mid-run edit to a gate NOT YET REACHED produces no error at all, just a green log that
is a collage of two trees. That is strictly worse than #461's loud bash failure. So before making the veto
edits mid-run I measured that ZERO files under `gates/regress/`, `gates/lib.js` or `gates/drive/` reference
any of the three scripts I touched, and I re-measured all 79 suite-read JS files as byte-identical between
launch and finish. **Freeze them and diff them; do not reason about it.**

## WHAT IS OWED, AND NONE OF IT IS DISCHARGED BY THIS RUN

1. **THE 4000ms CLOCK IS THE RESIDUAL AND IT IS NOT MINE.** `jobs/the-intro-card-dismisses-itself-under-a-reader-and-the-next-tap-steps-the-demo-2026-10-08`
   (P1, priority 11, build) now carries this run's measurements: the clock starts at **open**, not at the
   gesture, so a reader who reads before scrolling loses the card at **+4049ms** on a 676-character card, and
   every figure is **identical on both bundles** — pre-existing, and this build neither causes nor cures it.
   Staged pauses of 0/2000/3500ms survive; 4200ms is already gone. The honest scope of #505's own claim is
   therefore *the card survives a scroll gesture BEGUN inside the 4000ms window, on a card that has something
   below the fold*, and the commit and the comment both say exactly that. Two remedies were named by the
   antagonists and **neither was measured**: pause the demo while the card is up, or make the hold expire.
   Both are AMBER, not green.
2. **THE CTA IS STILL BELOW THE FOLD ON THE ONE CARD THAT NEEDS THE CAP.** Reachable by scrolling, which
   US-R50 accepts in terms, and not on screen at rest. That is route 2 —
   `jobs/the-intro-cards-primary-button-should-not-be-below-its-own-fold-2026-10-08` — a flex restructure of a
   SHARED overlay, with #398 as this project's worked example of that going wrong. It needs its own run and
   its own control set.
3. **BLOCK F SCROLLS PROGRAMMATICALLY AND A FINGER-DRIVEN F IS OWED.** It says so in its own header. The
   mechanism is the right instrument for the question F asks, and it is weaker than a finger.
4. **375x679 EXERCISES BLOCK D AND IS NOT IN `CT_74_GEOS`.** Antagonist A measured the cap binding there
   (plans room 5, card survives, tap works), so a fourth geometry exercises D2 and nothing runs there. Block D
   emits **no PASS at `kunal730`**, which is Kunal's own phone.
5. **THE FIVE PARKED PATCHES ARE NOW OWED BY A FIFTH CONSECUTIVE RUN.** STEP 1I's window is hour ≥ 11 and five
   consecutive fires have woken before it. That is a structural starvation of the integration slot, not a
   scheduling accident, and it belongs to the orchestrator.
6. **THE AUDITOR HAS NOT RUN FOR EIGHT CONSECUTIVE BUILDS**, and the live site is unreachable from this
   container so no run here can verify the deployed app.
7. **THREE GATES ARE KNOWN-ABSENT** (`50-drill-verdict-no-jump`, `17-drill-grade-arithmetic`,
   `52-drill-grades-the-move`), so every GATES GREEN in this project is honest and blind in exactly those three
   places. Gate 50 is still in `gates/pending/`, which nothing enumerates.
8. **SIX NEW MEMBERS OF THE EMPTY-DENOMINATOR CLASS** are named with file and line on
   `jobs/three-suite-assertions-read-an-empty-or-constant-denominator-as-a-pass-2026-10-07`, from A's rotating
   audit. The rotation covered `53-lesson-hit-area.js` fully and sampled 63, 65, 66 and 70; **continue at
   `gates/regress/51-drill-explain-why.js`.**

### 6. R19 IS CITED BY NAME AS THE AUTHORITY FOR BOTH ANSWERS, AND THIS RUN DID NOT FIX IT — DELIBERATELY

Found by the second R37 feedback read, not by me: `flags/build-ext-2026-10-09` at 09:37Z, written by the
build lane's external challenger **while this suite was running**. Five lines cite rule R19 as the authority
FOR 375x730 — the exact figure R19's own text declares wrong and orders corrected wherever it appears —
while four cite it correctly for 375x761. I re-derived all nine with one grep rather than repeating the
claim, and the five are exact: `gates/shots476.js:1`, `gates/regress/70-live-game-reset-guard.js:78`,
`gates/regress/20-review.js:3`, `gates/regress/18-drill-credit-provenance.js:41`,
`gates/regress/73-review-list-filter.js:216`.

**Gate 74 adds no sixth false citation — it cites R19 nowhere — but it runs the wrong phone, and it was
told to.** `gates/lib.js:31` reads verbatim *"'kunal730' is the real phone and new gates should use it"*,
five days after R19 settled against it, and gate 74 obeyed: it runs `se,short375,kunal730` and never
`kunal761`. The challenger's own class count already names gate 74 as one of the 730-only files, so that
count is filed and is NOT re-filed here [R09, R25].

**WHY THIS RUN LEFT IT ALONE, so the next run does not read the silence as an oversight.** Three reasons,
in order of force. (1) Editing any of those five files mid-suite would have invalidated the suite: four of
them (`18`, `20`, `70`, `73`) are gate files the running suite loads as node subprocesses, and `70`, `73`
and `74` had not yet run at the moment the flag arrived — so the log would have gated a tree that no longer
existed on disk. That is #461's "freeze the harness before you launch" generalised from shell scripts to
gates, and it is the same family as the suite dying on an edited `gates.sh`. (2) It is a parked P3 whose own
challenger wrote *"I am not arguing for a change and priority is not mine to set"*. (3) It needs five more
artefact locks on top of the nine this run already holds.

**WHAT THIS RUN DID INSTEAD, and it is the half the challenger could not do:** it MEASURED whether the
#505 fix holds at 375x761, which no document carried. See the job's own record. The expected answer is that
the defect is NOT EXERCISED at 761 — the panel caps at `100vh` and block F requires `panelRoom===0`, so a
taller viewport makes the collision less likely, exactly as gate 74 already reports for `kunal730` at B3
and B5 — which would mean the coverage gap is real but much weaker than it looks, because the defect lives
at the SHORT geometries the gate does cover. That is a prediction, and the measurement is what settles it.
