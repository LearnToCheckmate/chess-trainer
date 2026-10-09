# HANDOFF

**#505 SHIPPED, 2026-10-09. origin/main at `dcfc09d` (the work) with this run’s close-out commit as its child.** The lesson intro card now survives the gesture
that reaches its own button. `jobs/the-lesson-cta-centre-hit-tests-to-the-lesson-footer-and-a-tap-closes-the-lesson-at-568-tall-2026-10-04`
(band 16, P0) — route 1 of #498's held tree, brought forward by diff, plus the one attribute it was held
for and the guard four upheld vetoes forced onto it. **GATES GREEN #505 at `59` sections /
`4537` PASS / 0 FAIL** over gated sha `dcfc09d`, bundle `ebb88c8f76f7`, source `a58bafeb9f65`.

## READ THIS FIRST: FIVE POINTERS, AND THE FIRST TWO ARE WORTH MORE THAN THE REST TOGETHER

**(1) RUN THE ANTAGONISTS BEFORE THE SUITE, THROUGH TWO DOORS, AND ADD THE THIRD QUESTION #504 ASKED FOR.**
This is now five builds of evidence and it paid again: both passes vetoed, four vetoes upheld, the tree was
rebuilt twice and the gate grew 35 → 42 assertions — and **not one gate minute** was spent on a tree that was
going to change. **BOTH DOORS WERE NECESSARY AND NEITHER WOULD HAVE DONE.** A's veto is a predicate in a
filter and is invisible from the screen; B's is a population sweep over 97 cards and the diff does not say
which cards have a scrollable child. A single antagonist at B's door would have shipped a regression on 80 of
97 cards **with the suite green**. #504's handover asked for a third question in the brief — *what shared
resource does this change newly contend for* — and I did not add it, because this change touches no worker,
cache or lock. **It should still go in the standing brief**, and a fourth belongs beside it, which this run
earned: *what population does your assertion's own skip condition exclude, and is it the population the fix
is about?* Block D skipped on the PANEL's room while the fix was about the CHILD's scroll.

**(2) AN ASSERTION'S SKIP CONDITION IS AN ASSERTION, AND NOBODY CONTROLS IT.** This is the generalisation of
B's veto and it is the thing most likely to recur. Gate 74's block D guarded itself with `if(pi.room>0)` —
the panel's scroll room — and that guard is where the 80-card population went. The gate had a negative
control for every assertion in the block and **none for the condition that decides whether the block runs**,
so the skip was invisible to the whole control set. The remedy that worked is a GLOBAL accumulator plus a
`>=1` assertion over it (`F1G`, the shape `B3G` and `B1bG2` already use): it turns "the population was not
present" from a silent pass into a red. **Before trusting a block's green, ask what its own `if` excluded and
whether anything asserts that the excluded set is empty.**

**(3) FIXING ONE COPY OF A DUPLICATED PREDICATE IS WORSE THAN FIXING NEITHER.** `userScrollables()` and block
C's inline walk are two copies of the same filter, duplicated because one runs in node and one inside a
`page.evaluate`. I corrected `userScrollables` for `touch-action`, re-ran the control, and **C0 still passed
from the uncorrected copy in the same run** — so the gate reported "what a finger could scroll" from a
corrected filter in B1b and an uncorrected one in C0, simultaneously. The duplication is forced by the
architecture and cannot be removed; what makes it safe is that the control reddens **both**, which is now
verified rather than assumed. If you touch either copy, run `nc-touchaction` and check both ids go red.

**(4) DO NOT PUT A BUNDLE md5 IN A FILE THAT IS AN INPUT TO THE BUNDLE — AND DO PUT IT IN ONE THAT IS NOT.**
#503's pointer was about line numbers; this is its sibling and the rule is sharper than "avoid md5s". A gate
file is **not** an input to `app.js`, so md5s there are stable and belong there. A `chess.jsx` comment **is**
an input, so an md5 written into one is invalidated by writing it. #505 rebuilt **four times** and any md5
pinned in a `chess.jsx` comment would have gone stale three times. Keep the figures in the gate's CONTROLS
block and rewrite that block once, at the end, against the final bundles.

**(5) A REGISTER YOU PORT UNCHANGED IS A CLAIM YOU ARE MAKING.** I carried #498's TC-R62 and manifest row
into a build that changes what they document, and both named a **must-not-ship** bundle as "SHIPPED" and
green, prescribed the attribute this build replaces, and described an assertion as the opposite of what its
own gate prints. `gates/held-trees.tsv` said the same md5 must not ship. **Two committed files, one md5,
opposite verdicts** — #450's shape with the sign flipped. When a build lands somebody else's case document,
diff what it says against what the gate now does, line by line, before the push.

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
