// regress/15-gallery-playall.js  THE RECORDING-FREE GALLERY GATE (Kunal's feedback session, flag
// uat372-headless-run, 2026-09-12 22:30 ET: "the whole Play-all runs headlessly in real Chromium ... this is the
// shape the daily UAT check now takes: Playwright, not a phone recording ... worth committing under gates/").
// Drives "▶ Play all N" from Home at his geometry and at 375x812, sampling every 700 ms: every card's caption is
// reached in order with its item id, no card leaves a page scroll, the board (where a card shows one) never shrinks
// within a card, the run ends on the green RECORDING COMPLETE frame, and there are no app errors beyond the one
// allowed engine trap (#356). A phone is slower than this container, so the gate asserts ORDER and COMPLETION,
// never wall-clock; the per-card checkpoints live in 14-uat-review-card.js.
//
// #416: THE BASELINE USED TO BE THE UNSETTLED FRAME, AND THAT IS WHY THIS GATE REDDENED A GOOD BUILD ABOUT ONE
// FULL RUN IN SEVEN (flag gate15-baseline-is-the-unsettled-frame-2026-09-18, six green and one red on one
// verified-identical bundle). The old loop did `if(cap!==cur){cur=cap;curBoard=null;}` and then took curBoard from
// the FIRST sample under the new caption - systematically the frame least likely to be settled, because the caption
// changes at the moment the card sets its state up. Re-measured here at 40ms on the #415 bundle in ONE atomic
// evaluate per sample, card 1/8 (k10) at 375x679: the board is 375.03 with over=12 at the first post-caption sample
// and 351.03 with over=0 from 88ms on, holding for the remaining 296 samples of that card; every other card in the
// walk holds ONE width for its whole duration. So the transient is real - a ~130ms, 24px painted jump on ENTERING
// that card, which is the gallery mounting a pre-set-up state, and the #415 antagonist measured the only
// user-reachable analogue (playing into mate) and found NO jump there - and reading a baseline out of it made the
// settled value look like a shrink. Both reds came from that one frame: `over 12` and `375 -> 351`.
// THE SAME WALK AT 375x812 HAS NO TRANSIENT AT ALL: card 1/8 is 375.03 with over=0 from its first frame, because
// at 812 there is height enough that the pre-setup width IS the settled one. So the flake this fixes was only ever
// reachable at the shorter geometry, on the one card whose board is fit to a height that binds. Two other facts
// out of the same 3336-sample sweep, both of which the fix has to respect: card 6/8 US-R01 shows NO BOARD for the
// first 11.5s of its 52s (so an entry-window baseline alone would silently stop covering that card, which is why
// the late baseline below exists), and cards 7/8 and 8/8 report 349.03 - the review board still mounted UNDER the
// Home overlay, since this app keeps several screens mounted at once (#393). Every other card holds one width.
//
// WHAT REPLACED IT. On every caption change the gate reads the board every 50ms for a FIXED 900ms and takes the
// baseline from the TAIL of that series: the last run of reads agreeing within 0.6px must span at least 250ms. It
// deliberately does NOT stop at the first value that holds for 250ms - that is the same thing as trusting the first
// stable-looking value, and a transient LONGER than the hold would then be taken as settled. Reading to the end of
// the window instead sees through any transient shorter than 900-250 = 650ms, and a card still moving at 900ms is
// REPORTED by its own assertion rather than silently baselined. tailStable() is a pure function over the read
// series and FIXTURE unit-tests it against the shapes this walk can produce including the ones it must reject (the
// #391 rule) - which is how the alternative the flag proposed was ruled out: "require the shrink to persist across
// two consecutive samples" DOES NOT FIX THIS, because the transient is the BASELINE and the shrink to the settled
// value persists for ever, so a persistence filter keeps the false red. Every run also NOTES what the old baseline
// would have said, taken from reads[0] of the same series, so the log carries the before-and-after rather than an
// argument about it. And the sample that feeds an assertion is now bracketed by two caption reads: b.metrics() is
// two evaluates, so without that guard a caption change between them attributes card N+1's setup frame to card N.
//
// WHY THE CAPTION IS NOW POLLED EVERY 60ms AND NOT EVERY 700. The first version of this fix kept the 700ms poll,
// and its first run showed why that will not do: it recorded card 1/8's first read as 351.03, the SETTLED value,
// because a 700ms-quantised poll detects the caption change up to 700ms after it happens and so usually starts
// reading after the transient has gone. That is the lucky six-in-seven, and a gate that dodges the state it
// guards against six times in seven is not evidence about the seventh (#385: when an assertion is about a state,
// prove the state was entered). Polling at 60ms means reads[0] lands inside the ~130ms transient every time, so
// at 375x679 the log shows "first read 375.03, settled baseline 351.03" on EVERY run - the old baseline and the
// new one side by side, on the same series, from the same run. The 700ms cadence of the assertion samples is
// unchanged; only the caption watch is fast.
//
// AND THE HEADLINE ASSERTION WAS ASSERTING NOTHING. "Every card was reached in order" was `seen.length>=N`,
// which checks neither reaching nor order: card 6/8 alone emits SEVEN sub-captions, so this walk's 16 captions
// clear a bar of 8 with six of the eight cards missing. It is the alternation-that-matches-every-branch fault
// (#388) in arithmetic form, on the claim this gate exists to make. walkOk() now parses the n/N token out of
// every caption and requires the totals to agree with the gallery's own card count, the numbers to be
// non-decreasing, and every card 1..N to appear; WFIX unit-tests it against five lists it must REJECT, one of
// which (W4) is exactly the nine-caption list that satisfied the old bar.
//
// WHAT THIS GATE STILL CANNOT SEE, stated rather than left to be discovered as a fresh defect - and the first
// version of this paragraph got its own coverage claim wrong, which the #416 antagonist measured.
// (i) A shrink INSIDE the 900ms entry window is invisible: brief, and the tail absorbs it; sustained for 250ms at
// the end of the window, and it BECOMES the baseline. That is the unavoidable price of not reading the expected
// value out of an unsettled frame, and it is bounded - 900ms of a card that runs 5 to 52s.
// (ii) A board that is the WRONG SIZE for its whole card passes everything here, because every assertion is
// relative to the card's own settled width. This paragraph used to say that absolute board size "is pinned in
// 35-width-containment, 46-play and 48-lesson-flow" - and NONE OF THOSE THREE GATES RUNS AT EITHER OF THIS
// GATE'S GEOMETRIES: 35 runs se/short375/kunal730, 46 se/kunal730/390, 48 se/kunal730/390 plus four short
// columns, and `812` appears in gate 35 only inside a comment. That is the "it is covered elsewhere" excuse
// CLAUDE.md warns about, written by the session that had just added the rule about it. What DOES pin an absolute
// board width at 375x679, checked file by file: 10-gameover.js:25 `WANT={kunal:351}` (card 1/8's state),
// 13-play-after-moves.js:27 `PIN={kunal:{card:{w:351}}}` (card 2/8), 11-lesson.js:13 demo end 375 wide (cards
// 3/8 and 4/8), 12-hint.js:16 `WANT={kunal:375}` (card 5/8), and 20-review.js:80 with 14-uat-review-card.js:21
// both at 349 (card 6/8). AT 375x812 NOTHING IN THE SUITE PINS AN ABSOLUTE BOARD WIDTH - this gate is the only
// file under gates/regress/ that visits that viewport at all. So (ii) is genuinely uncovered there, and saying
// so is the point. The numbers to pin if the next session wants to close it are in the header above (375x679:
// card 1/8 351.03, cards 3-5 375.03, cards 6-8 349.03; 375x812: 375.03 then 349.03).
// (iii) What (ii) does NOT excuse, and what the population assertion below now catches: a board that is ABSENT.
// Every board check here is conditioned on `m.board` existing, so `display:none` on the grid used to give
// 24 pass / 0 fail with the log printing "2 of 15 captions had a board" and nothing reading that number -
// the count-with-no-assertion fault, measured by the #416 antagonist with a control it wrote itself.
// `CT_G15_NC=hide` and `=hideEntry` are that control, kept. The assertion is pinned to the MECHANISM (the only
// boardless caption is the one whose text is "Starting...") rather than to a count with slack, because "at
// least 13 of 15" was the first draft and one caption of slack is how a frozen denominator starts.
// (iv) The shrink check is ONE-SIDED (`w < base - TOL`), so a board that GROWS mid-card and returns is
// invisible, and CLAUDE.md's rule is that the board must never JUMP. A running max over each card's settled
// samples would catch it; nothing in this walk grows (one width per caption, measured over 32,000+ samples at
// 1x/4x/6x throttling across both geometries), so it is a gap in the argument rather than a missed defect.
// (v) Latent: `tailStable` reports `why:'no board'` when the LAST read is null even if the board was present
// for the rest of the window, and such a card lands in `noBase` and reds with a misleading reason. Not
// reachable here - no caption group in five 40ms sweeps has a board present early and null later.
//
// ── CONTROL-RECORD lines, the machine-readable form gates/control-audit.js reads (#418). One per control, and
// every one of these numbers was produced by the command in the block below, on this file at 955501e. `scope`
// is mandatory and is why the format exists: all SEVEN ran at 375x679 only, where this gate runs 25 of its 36
// assertions, and a count without its scope is not evidence (#411, where two of six published control counts
// turned out to be subset runs nobody could reproduce).
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=0 scope=env:CT_G15_GEOS=kunal how=shipped bundle, no injection - the baseline the other six are read against
// ── #451's controls. SIX runs, every count MEASURED at one walk geometry and the scope published with it
//    [#411/#412: publish the command with the count]. Block F is NOT governed by CT_G15_GEOS - its two widths are
//    the acceptance condition - so every row below includes both F geometries. Totals differ between rows because
//    F2's three readout assertions are CONDITIONAL on the readout line existing, so they do not run on a bundle
//    without it; that is why the #450 row totals 56 and the baseline 62.
// CONTROL-RECORD: b9465d2 2026-10-01 total=62 red=0 scope=env:CT_G15_GEOS=kunal how=the shipping #451 bundle, no injection - the baseline the five rows below are read against
// CONTROL-RECORD: b9465d2 2026-10-01 total=56 red=11 scope=env:CT_G15_GEOS=kunal,CT_APP=ce2d8b7896c3 how=the REAL SHIPPED #450 app.js, read out of origin/main (md5 ce2d8b7896c3) - the previous build itself, eight obsolete cards, no ask-card hook, no readout line. The 11: the ask-queue pin, the total population, walkOk, unexpectedBoard, the vacuity declaration, F1 card count x2, F1 fixture-population x2, F2 readout line x2. Block S PASSES on it, which is the right answer - the fixture cards exist there under the same labels, so block S is portable across bundles rather than keyed to anything #451 added
// CONTROL-RECORD: b9465d2 2026-10-01 total=46 red=2 scope=env:CT_G15_GEOS=kunal,CT_G15_NC=cardwide how=every gallery button forced to min-width 520px, card boxes at left 16 right 536 against a 320 viewport. Reds F1 "past the viewport" at BOTH F geometries. A BLUNT CONTROL, SAID SO: 520px buttons also break the menu navigation F2 needs, so 16 later assertions do not run (46 against the baseline's 62). It is a targeted control for ONE assertion, not a whole-gate control
// CONTROL-RECORD: b9465d2 2026-10-01 total=62 red=2 scope=env:CT_G15_GEOS=kunal,CT_G15_NC=cardclip how=card text forced to one nowrap line inside overflow:hidden, scrollWidth 2529 vs clientWidth 341. Reds F1 "cut horizontally" at both F geometries and nothing else
// CONTROL-RECORD: b9465d2 2026-10-01 total=62 red=1 scope=env:CT_G15_GEOS=kunal,CT_G15_NC=statesshrink how=the board cut 24px AFTER the baseline settles, inside a fixture card. Reds block S's S2 (k10, base 351.03 -> 327 at 375x679; 375.03 -> 351 at 375x812) - the board-jump instrument, including at 375x812 where no other gate in gates/regress/ visits at all
// CONTROL-RECORD: b9465d2 2026-10-01 total=62 red=2 scope=env:CT_G15_GEOS=kunal,CT_G15_NC=stateshide how=the board grid display:none from the first fixture card on. Reds S0 (the instrument) and S0a (reachability), leaving S2 vacuous-but-declared. THIS CONTROL IMPROVED THE GATE: its first run threw on the harness's own navigation at the second card and took S0 to S3 with it (35 pass, one "harness threw", S0 never asserted) - the #393 fault in a block I had just written. The tap is guarded now and an unreachable card is its own red
// A TRIAL-BUNDLE CONTROL IS RECORDED SEPARATELY BELOW because its scope is a bundle rather than an env var:
// CONTROL-RECORD: b9465d2 2026-10-01 total=54 red=6 scope=trial:548b4a913652 how=a trial bundle from chess.jsx with `const TS=[]` (md5 548b4a913652) - the fixture list deleted while the two asks stay. Reds the total-population assertion and all five STATE_IDS as they then were - the assertion that would have caught this build's own worst mistake before the suite did. NOTE: measured BEFORE block S and the y3 id were added, so re-run it when that row is next cited
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board width+height+squares cut 24px from card 2 on, persistent
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=a laid-out 14px child appended to #root
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=2 scope=env:CT_G15_GEOS=kunal how=board width flipped every 60ms so no 900ms window has a settled tail
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board display:none after the entry window - the hole the antagonist found
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board display:none before the entry window
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=body forced out of position:fixed with 3000px appended, so the page really scrolls
//
// THE CONTROLS, each with the command that reproduces its count (#412: publish the command with the number).
// Measured on the shipped #415 bundle (app.js md5 6f42b141eac4), 2026-09-18, all at 375x679:
//   CT_G15_GEOS=kunal node gates/regress/15-gallery-playall.js                     -> 24 pass, 0 fail  (shipped)
//   CT_G15_GEOS=kunal CT_G15_NC=shrink    node gates/regress/15-gallery-playall.js -> 24 pass, 1 fail
//        the fail is "no board shrinks inside a card", card 2/8, base 351.03 -> 327 on three consecutive samples
//   CT_G15_GEOS=kunal CT_G15_NC=over      node gates/regress/15-gallery-playall.js -> 24 pass, 1 fail
//        the fail is "no card leaves the page scrolling", card 2/8, over 14 on three consecutive samples
//   CT_G15_GEOS=kunal CT_G15_NC=unsettled node gates/regress/15-gallery-playall.js -> 23 pass, 2 FAILS, and both
//        of them are right: the settle assertion goes red ("settled only 0ms", reads alternating 351.03/327.03),
//        and so does the baseline-population one, because a card whose width never settles gets no baseline while
//        its board plainly WAS on screen. The two are coupled on purpose - that is the pairing that stops an
//        unsettled card from being quietly dropped from the shrink check instead of reported.
//   CT_G15_GEOS=kunal CT_G15_NC=hide       ... -> the population assertion reds ("2 of 15 captions had a board")
//   CT_G15_GEOS=kunal CT_G15_NC=hideEntry  ... -> the same, "1 of 15"
//   CT_G15_GEOS=kunal CT_G15_NC=pagescroll ... -> the page-scroll assertion reds (body position:static)
//   With no CT_G15_GEOS the gate runs both geometries.
//
// INDEPENDENTLY REPRODUCED by the #416 antagonist on its own instrument (an in-page 40ms sampler recording
// [performance.now(), width, caption] in one synchronous callback, 32,000+ samples over five sweeps): the
// transient's end at 89ms against the 88ms in this header; 113ms under 4x CPU throttling and 134ms under 6x, so
// the worst transient anywhere in the walk is 134ms against this window's 650ms limit; card 6/8's board first
// appearing at 13.1s (1x), 22.6s (4x), 14.4s (6x) of its 51.9s, which is what the late baseline exists for; and
// every other caption holding exactly one width at every geometry and every throttle rate. Runtime, back to
// back on the same machine: this gate 294s against the old one's 296s for the same walk, because the wall clock
// is set by the app's own 5-88s holds and the read windows happen inside them.
// THE MARGIN ON reads[0] IS ABOUT 60ms and that is worth knowing: detection is within one 60ms TICK of the
// caption change and the transient runs to 89-134ms, so the note is not guaranteed for ever - but the failure
// mode is a missing LOG NOTE, never a red, and it held on 5 of 5 runs plus the suite's own.
//
// WHY ct_pool IS FORCED TO 3 HERE (asked and answered at #416, not left for the next reader to re-derive):
// determinism on card 6/8, which is a 52-second engine-bound review. The branch it skips is covered where it
// matters - 33-reproducible-review.js run C forces ct_pool=1 and asserts the single-worker review returns the
// same verdicts, and 23-full-walk.js drives this same gallery with NO override, so the device-chosen branch
// runs there. Measured at #416: forcing ct_pool=1 here gives 24 pass / 0 fail with the transient still caught,
// because pool size changes analysis speed, not geometry.
// Each NC injects a REAL layout change AT card CT_G15_NC_CARD (default 2) and then LEAVES IT IN PLACE for the rest
// of the run - the injected `<style id="ct-nc">` is never removed - so these are global from that card on, not
// per-card. That wording matters, because it is why only card 2/8 ever reds for `shrink` and `over`: every later
// card takes its baseline AFTER the injection and so measures the broken board as its own settled width. That is
// blind spot (ii) above, demonstrated by the controls themselves rather than argued.
// `shrink` takes 24px off the board's width, height and squares, which is the persistent shrink this gate exists
// to catch; `over` appends a laid-out 14px child to #root; `unsettled` flips the board's width every 60ms so the
// 900ms read window never has a settled tail; `hide` and `hideEntry` remove the board entirely, after and before
// the entry window, which is the control for the population assertion; `pagescroll` forces `body` out of
// `position:fixed` and appends 3000px to it, which is the control for the page-scroll mechanism. The first draft of `shrink`
// overrode only `grid-template-columns` and the board's rect did not move at all - the box is fixed by an inline
// `width:boardPx` on the same element - so the control injected something real and measured nothing, which is
// #384's rule ("the numbers moved" is not enough) failing one step earlier still: the numbers had not moved.
'use strict';
const L=require('../lib');

const TOL=0.6, HOLD=250, WIN=900, STEP=50, TICK=60;
/* #451: THE PIN MOVES WITH THE CARDS, IN THE SAME COMMIT, AND IT STAYS EXTERNAL.
   jobs/preview-gallery-flush-and-load-current-asks flushed the eight obsolete cards and loaded the two that are
   due, so this pin changes with them. THREE THINGS DELIBERATELY NOT DONE, because each is a trap this repo has
   already paid for:
   (1) NOT DERIVED FROM SC AT RUNTIME. That is the obvious fix and it is the one costume this file must not wear -
       the check and the thing checked become the same object (CLAUDE.md records it six times: clip-intersection,
       #393's "the covering element is big", #394's grid.contains, #398's flex-shrink, #419's log footer, #432's
       own-build selector). A gate that reads SC to check SC cannot see a card silently removed.
   (2) THE COUNT IS PARAMETERISED, NOT DROPPED. `N===8` becomes `N===EXPECTED_N`, and EXPECTED_N is asserted to be
       what this commit says it is, so a drift of one card is still RED. A bare count with no scope is what
       #411/#412 charged.
   (3) W1 TO W6 AND CAPS8 ARE UNTOUCHED. CAPS8 is a pure FIXTURE for unit-testing walkOk() against caption shapes
       it must accept and reject; it is not an assertion about the live card set, and it carries gate 15's real
       invariant - that every card actually played, in order, with a coherent n/N token. Nothing here weakens it. */
const PINNED_IDS='1 PHONE|2 KEV';
const EXPECTED_N=2;
/* #451: WHICH PINNED CARDS SHOW A BOARD, AS AN EXPLICIT TWO-SIDED PIN - and this is the assertion that would
   otherwise have gone quietly vacuous when the card set changed, which is the fault this file is full of warnings
   about. Until #451 every SC card drove a board screen, so "every caption except Starting showed a board" was a
   real assertion. The flush replaced them with two cards that legitimately have NO board: PHONE is the menu sheet
   over home, KEV is the Review ENTRY screen before a game is imported. Three ways to get this wrong and the one
   that is right:
     - leaving the old assertion: RED on a healthy build, a false defect on two cards that correctly have no board.
     - deleting it: the board invariants vanish silently the moment the queue changes again.
     - a count with slack ("at least N boardless are allowed"): the frozen denominator this file already rejects
       for exactly this line, in the comment below.
   So the expectation is NAMED per card id and asserted IN BOTH DIRECTIONS: a card in this set must show a board,
   and a card NOT in it must NOT. That is strictly stronger than what it replaces - it reds if a board stops
   appearing where one is expected AND if one starts appearing where none is, so a card whose state silently
   changes cannot pass either way. Empty today, and the empty case is asserted rather than skipped.
   WHERE THE REMOVED CARDS' BOARD COVERAGE LIVES, so this is a relocation and not a loss [R06, and build-run's
   "if you move a UI element the assertion moves WITH it"]: the comment at the head of this file already measured
   it file by file, and all six gates are present on main - 10-gameover.js (the old card 1/8 k10 state),
   13-play-after-moves.js (2/8 k8), 11-lesson.js (3/8 and 4/8 k11), 12-hint.js (5/8 A-06), and 20-review.js with
   14-uat-review-card.js (6/8 US-R01).
   **AND THE SENTENCE THAT STOOD HERE IS WITHDRAWN [R18], BY THE SUITE, BEFORE IT COULD REACH MAIN.** It read "The
   states are still pinned; what changed is which gate drives them." The first half is true and the second is false
   in the way that matters: those six gates do not merely pin those states, they REACH them by tapping these very
   gallery cards through gates/lib.js b.card(). Deleting the cards therefore took 10, 11, 12, 13 and 14 RED inside
   six minutes of the full suite, every one on `locator.waitFor: Timeout 8000ms exceeded`. What I had removed was
   the ROUTE IN, not a duplicate assertion. The cards are consequently kept as a SEPARATE fixture list (chess.jsx,
   const TS) with byte-identical labels, so EXPECT_BOARD being empty is a statement about Kunal's ask queue only,
   and the board states above are still both pinned AND reachable. The assertions that would have caught this -
   the total card population and STATE_IDS - are below, and their control is a bundle built with TS empty. */
const EXPECTED_STATES=8;      /* the fixed states the harness drives (chess.jsx const TS), NOT asks */
/* THE IDS THE HARNESS REACHES ITS STATES THROUGH, via b.card(). RE-MEASURED AFTER ANTAGONIST A DISPUTED THE FIRST
   VERSION OF THIS COMMENT, AND IT WAS RIGHT ON BOTH COUNTS [R18]. The first version said "five gates and two
   drivers" and listed five ids. MEASURED with `grep -rn 'b\.card(' gates/regress/ gates/drive/ gates/vocab.js`:
   **24 call sites in 14 files**, and inside gates/regress/ alone NINE files - the five this build discovered by
   breaking them (10-gameover, 11-lesson, 12-hint, 13-play-after-moves, 14-uat-review-card) PLUS 30-p1-fixes.js,
   31-antagonist373.js, 35-width-containment.js and this file. The "five" was a count taken from the first six
   minutes of a suite that was still running, published as the complete set - #405's lesson running backwards.
   Outside gates/regress/: drive/play.js (k10), drive/puzzles.js (A-06), drive/lesson.js (cards 3 and 4),
   drive/menu.js (card 7) and vocab.js (k8, k10, k11, A-06).
   **y3 IS IN THIS LIST BECAUSE OF drive/menu.js:104**, which taps card 7 - `7 · y3 · Layout readout`. The first
   version of STATE_IDS omitted it, so the assertion written precisely to name "the ids the harness reaches its
   states through" did not name one a committed driver reaches by number. Found by antagonist A.
   Pinned BY NAME because deleting these cards took five gates red in one suite this run and nothing in gate 15
   could see it coming - this is the assertion that would have, and it would have named the card rather than
   leaving the next reader with eight `locator.waitFor` timeouts to diagnose. */
const STATE_IDS=['k10','k8','k11','A-06','US-R','y3'];
/* #451: the fixture cards block S samples, with the hold each one declares in chess.jsx's TS array, re-read from
   source rather than remembered. THREE OF THE EIGHT ARE EXCLUDED AND EACH FOR ITS OWN MEASURED REASON:
     - US-R: hold 88000ms, and 14-uat-review-card and 20-review drive that state directly. Cost, not coverage.
     - CARDS 7 AND 8 (both y3): THEY HAVE NO BOARD OF THEIR OWN - 7 is the menu sheet over home, 8 is home. I caught
       this writing block S, and it corrects my reading of the assertion I was replacing. The old walk's
       "every caption except Starting showed a board (14 of 15)" DID count these two, at 349.03 - and this file's own
       header says why: "cards 7/8 and 8/8 report 349.03 - the review board still mounted UNDER the [home overlay]".
       That reading was an artefact of WALK ORDER: cards 7 and 8 follow card 6's Review journey, so what they
       reported was the PREVIOUS card's board, still mounted beneath a fixed overlay. Block S taps each card from a
       fresh gallery, so no stale board exists and these two are honestly boardless. Worth stating plainly: for two
       of its fifteen captions, the assertion I inherited was measuring a board that did not belong to the screen
       under test - which is the same family as #394's bubble satisfying grid.contains(), one costume over.
   So block S drives the five cards that own a board: 44s per geometry, 88s for both. */
const STATE_CARDS=[{id:'k10',hold:13000},{id:'k8',hold:8000},{id:3,hold:7000},{id:4,hold:9000},
  {id:'A-06',hold:7000}];
const EXPECT_BOARD=[];   /* card ids (as PINNED_IDS spells them) expected to paint a board during the walk */

// tailStable(reads,hold,tol): reads are [{w,ms}] in poll order. The baseline is the value at the END of the read
// window, and it counts as settled only if the run of reads agreeing with it within tol spans >= hold ms.
// Pure, so FIXTURE below can test it against the shapes the walk produces and the ones it must reject.
function tailStable(reads,hold,tol){
  if(!reads.length)return {ok:false,why:'no reads'};
  const last=reads[reads.length-1];
  if(last.w===null||!isFinite(last.w))return {ok:false,why:'no board'};
  let i=reads.length-1;
  while(i>0&&reads[i-1].w!==null&&isFinite(reads[i-1].w)&&Math.abs(reads[i-1].w-last.w)<=tol)i--;
  const heldMs=last.ms-reads[i].ms;
  return {ok:heldMs>=hold,w:last.w,fromMs:reads[i].ms,heldMs,why:heldMs>=hold?null:'settled only '+heldMs+'ms'};
}
const mk=(pairs)=>pairs.map(p=>({w:p[0],ms:p[1]}));
const ser=(w,a,b,step)=>{const o=[];for(let t=a;t<=b;t+=step)o.push({w,ms:t});return o;};
// Each fixture is a read series at 50ms and what tailStable MUST say about it. F1 is the shape measured on card
// 1/8; F3 is why the window is read to its end; F4/F5/F7 are what must never be silently baselined.
const FIXTURE=[
  ['F1 the measured card-1/8 shape: 375 for three reads then 351 to the end',
   mk([[375.03,0],[375.03,50],[375.03,100]]).concat(ser(351.03,150,900,50)),{ok:true,w:351.03,fromMs:150}],
  ['F2 already settled for the whole window',ser(351.03,0,900,50),{ok:true,w:351.03,fromMs:0}],
  ['F3 a transient LONGER than the hold (300ms) is still seen through, because the tail is what counts',
   ser(375.03,0,300,50).concat(ser(351.03,350,900,50)),{ok:true,w:351.03,fromMs:350}],
  ['F4 a width still moving at the end of the window is NOT settled',
   mk([[375,0],[351,50],[375,100],[351,150],[375,200],[351,250],[375,300],[351,350],[375,400],[351,450],[375,500],[351,550],[375,600],[351,650],[375,700],[351,750],[375,800],[351,850],[375,900]]),{ok:false}],
  ['F5 a tail that has only held 100ms is NOT settled',ser(375,0,800,50).concat(mk([[351,850],[351,900]])),{ok:false}],
  ['F6 sub-pixel jitter inside the tolerance IS settled',
   mk([[351.03,0],[351.5,50],[351.03,100],[350.9,150]]).concat(ser(351.03,200,900,50)),{ok:true,w:351.03,fromMs:0}],
  ['F7 a card with no board on screen yields no baseline rather than a zero one',ser(null,0,900,50),{ok:false}],
  ['F8 the settled value is the LAST one even when an earlier value held longer',
   ser(375,0,600,50).concat(ser(351,650,900,50)),{ok:true,w:351,fromMs:650}],
];

// walkOk(caps,N): the captions this walk produced, in order, against the gallery's own card count. The old
// assertion for "every card was reached in order" was `seen.length>=N`, which checks NEITHER: card 6/8 alone
// emits seven sub-captions, so nine captions out of two cards satisfied it and the gate could go green having
// skipped most of the gallery. W4 below is exactly that list. Pure, so the FIXTURE tests it against lists it
// must reject as well as the one this walk really produces (#391).
function walkOk(caps,N){
  const ns=[];
  for(const c of caps){const m=String(c||'').match(/·\s*(\d+)\/(\d+)\s*·/);if(!m)continue;
    if(Number(m[2])!==N)return {ok:false,why:'caption says '+m[1]+'/'+m[2]+' but the gallery holds '+N,ns};
    ns.push(Number(m[1]));}
  if(!ns.length)return {ok:false,why:'no caption carried an n/N token',ns};
  for(let i=1;i<ns.length;i++)if(ns[i]<ns[i-1])return {ok:false,why:'card '+ns[i]+' came after card '+ns[i-1],ns};
  for(let n=1;n<=N;n++)if(!ns.includes(n))return {ok:false,why:'card '+n+' never appeared',ns};
  return {ok:true,ns};
}
const CAPS8=['🎬 #415 · 375x679 Starting…','🎬 #415 · 1/8 · k10 · 375x679 game over','🎬 #415 · 2/8 · k8 · 375x679 four plies',
  '🎬 #415 · 3/8 · k11 · 375x679 demo end','🎬 #415 · 4/8 · k11 · 375x679 practice','🎬 #415 · 5/8 · A-06 · 375x679 hint',
  '🎬 #415 · 6/8 · US-R01 · 375x679 Review','🎬 #415 · 6/8 · US-R03 · 375x679 Summary','🎬 #415 · 6/8 · US-R04 · 375x679 Move',
  '🎬 #415 · 6/8 · US-R06 · 375x679 10.Nxb5','🎬 #415 · 6/8 · k12 · 375x679 17.Rd8#','🎬 #415 · 6/8 · US-R07 · 375x679 Analysis',
  '🎬 #415 · 6/8 · US-R09 · 375x679 Exit','🎬 #415 · 7/8 · y3 · 375x679 Layout','🎬 #415 · 8/8 · y3 · 375x679 Home',
  '🎬 #415 · 8/8 · END · 375x679 RECORDING COMPLETE'];
const WFIX=[
  ['W1 the list this walk really produces, sub-captions and the END frame included',CAPS8,8,true],
  ['W2 a gallery card that never played is rejected',CAPS8.filter(c=>!/·\s*5\//.test(c)),8,false],
  ['W3 cards out of order are rejected',[CAPS8[1],CAPS8[3],CAPS8[2]].concat(CAPS8.slice(4)),8,false],
  ['W4 THE HOLE THE OLD `seen.length>=N` LEFT: nine captions from two cards satisfied it and must not satisfy this',
   [CAPS8[1]].concat(CAPS8.slice(6,13),[CAPS8[15]]),8,false],
  ['W5 a caption whose total disagrees with the gallery count is rejected',CAPS8.map(c=>c.replace('/8 ·','/9 ·')),8,false],
  ['W6 no n/N token anywhere is rejected rather than passing vacuously',[CAPS8[0],CAPS8[0]],8,false],
];
// the page CANNOT scroll, and the reason is not the one this gate used to give. index.html sets
// `body{position:fixed;inset:0}`, so documentElement has no scrollable content whatever anyone adds to it -
// measured by the #416 antagonist: 3000px injected into #root gives over=3000 and docScroll STILL 0, and
// docScroll only moves once `body{position:static}` is forced. So asserting docScroll===0 is inert by
// construction and cannot be controlled; assert the MECHANISM instead, which is a positive claim and flips
// under CT_G15_NC=pagescroll.
const PAGEFIX=(b)=>b.page.evaluate(()=>{const r=document.getElementById('root');
  return {bodyPos:getComputedStyle(document.body).position,rootOv:r?getComputedStyle(r).overflowY:null,
    docScroll:Math.round(document.documentElement.scrollHeight-document.documentElement.clientHeight)};});
const CAP=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rec-cap"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
// read the board every STEP ms for exactly WIN ms, then take the tail. Uses b.board() so the width is measured by
// the one harness library and cannot drift from what the assertions compare against.
async function settleBoard(b){
  const reads=[];const t0=Date.now();
  for(;;){
    const bd=await b.board();
    reads.push({w:bd?Math.round(bd.w*100)/100:null,ms:Date.now()-t0});
    if(Date.now()-t0>=WIN)break;
    await b.settle(STEP);
  }
  return {st:tailStable(reads,HOLD,TOL),reads};
}
const NC=process.env.CT_G15_NC||'';
const NC_CARD=process.env.CT_G15_NC_CARD||'2';
async function inject(b,kind){
  return b.page.evaluate((k)=>{
    const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
    let best=null;for(const e of els){const r=e.getBoundingClientRect();if(r.width<40)continue;if(!best||r.width>best.getBoundingClientRect().width)best=e;}
    if(k==='over'){const d=document.createElement('div');d.style.height='14px';d.textContent='.';document.getElementById('root').appendChild(d);return 'appended a laid-out 14px child to #root';}
    if(k==='pagescroll'){const st2=document.createElement('style');st2.id='ct-nc';
      st2.textContent='body{position:static!important;height:auto!important}html,body{overflow:auto!important}';document.head.appendChild(st2);
      const d=document.createElement('div');d.style.height='3000px';d.textContent='.';document.body.appendChild(d);
      return 'body forced out of position:fixed and 3000px appended to it - the page really can scroll now';}
    if(k==='hide'||k==='hideEntry'){const st3=document.createElement('style');st3.id='ct-nc';
      st3.textContent='div[style*="repeat(8"]{display:none!important}';document.head.appendChild(st3);
      return 'the board grid is display:none from here on - no board at all, not merely a smaller one';}
    if(!best)return 'NO BOARD TO INJECT INTO';
    const w0=best.getBoundingClientRect().width, sq=w0/8;
    // the board carries BOTH `grid-template-columns:repeat(8,SQpx)` AND an inline `width:boardPx` (chess.jsx:6537),
    // and it is the WIDTH that fixes its rect - overriding the columns alone left the box at 375.03 and the first
    // version of this control injected nothing measurable. So set the box and the squares together.
    const rule=(w)=>'div[style*="repeat(8"]{width:'+w+'px!important;height:'+w+'px!important;'+
      'grid-template-columns:repeat(8,'+(w/8)+'px)!important;grid-template-rows:repeat(8,'+(w/8)+'px)!important}';
    const st=document.createElement('style');st.id='ct-nc';document.head.appendChild(st);
    if(k==='shrink'){st.textContent=rule(w0-24);return 'board '+w0.toFixed(2)+' -> '+(w0-24).toFixed(2)+'px, squares '+sq.toFixed(2)+' -> '+((w0-24)/8).toFixed(2)+'px, and it STAYS there';}
    if(k==='unsettled'){let f=0;setInterval(()=>{f++;st.textContent=rule(f%2?w0-24:w0);},60);return 'board flipping '+w0.toFixed(2)+'/'+(w0-24).toFixed(2)+'px every 60ms';}
    return 'unknown NC '+k;
  },kind);
}

L.run(async()=>{
  for(const f of FIXTURE){
    const got=tailStable(f[1],HOLD,TOL),want=f[2];
    const ok=got.ok===want.ok&&(!want.ok||(Math.abs(got.w-want.w)<1e-9&&got.fromMs===want.fromMs));
    L.say(ok,'tailStable unit: '+f[0],{got:{ok:got.ok,w:got.w,fromMs:got.fromMs,heldMs:got.heldMs,why:got.why},want});
  }
  for(const f of WFIX){
    const got=walkOk(f[1],f[2]);
    L.say(got.ok===f[3],'walkOk unit: '+f[0],{ok:got.ok,why:got.why,ns:got.ns});
  }
  const ALL=[['kunal','kunal'],['375x812',{w:375,h:812,safe:'',label:'375x812'}]];
  const pick=(process.env.CT_G15_GEOS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(pick.length){const bad=pick.filter(p=>!ALL.some(a=>a[0]===p));if(bad.length)throw new Error('CT_G15_GEOS: unknown geometry '+bad.join(','));}
  const GEOS=pick.length?ALL.filter(a=>pick.includes(a[0])):ALL;
  L.note('geometries: '+GEOS.map(g=>g[0]).join(' ')+(pick.length?'  (CT_G15_GEOS subset)':'')+(NC?'   NEGATIVE CONTROL '+NC+' at card '+NC_CARD:''));
  for(const [lab,geo] of GEOS){
    const b=await L.launch({geo,name:'playall-'+lab,store:{ct_pool:'3'}});await b.open();
    /* #451: the pin reads the ASK QUEUE, not every card in the gallery. The gallery also renders the eight fixed
       states the harness drives, and those are NOT asks - see chess.jsx const TS. BOTH populations are asserted
       below, so this pin does not rest solely on the data-ct scoping that one commit introduced (#432: a check that
       reads only what the fix added cannot see what the fix removed). */
    const titles=await b.askTitles();const N=titles.length;
    const allTitles=await b.cardTitles();
    // PINNED, not a floor. `N>=6` was two cards of slack, and since walkOk takes N from this same call both
    // sides moved together: delete two cards from SC and N would be 6, every caption would read /6, and the
    // gate would go green having walked six. A deliberate change to the gallery updates this line on purpose.
    // measured off b.cardTitles(), not guessed: card 6's own id is `US-R`, while its seven mid-walk steps
    // re-caption as US-R01, US-R03 and so on. My first draft of this pin wrote US-R01 from the walk's
    // captions and would have gone red on a healthy build.
    const ids=titles.map(t=>t.split(' · ').slice(0,2).join(' '));
    L.say(EXPECTED_N===PINNED_IDS.split('|').length,
      lab+': the pin is self-consistent - EXPECTED_N agrees with the id list this commit declares',{EXPECTED_N,pinned:PINNED_IDS.split('|').length});
    L.say(N===EXPECTED_N&&ids.join('|')===PINNED_IDS,
      lab+': the ask queue holds the '+EXPECTED_N+' cards this commit pins, in order ('+N+')',ids);
    // the fixture list, asserted as a population so it cannot quietly vanish and take five gates' route in with it
    L.say(allTitles.length===EXPECTED_N+EXPECTED_STATES,
      lab+': the gallery renders the '+EXPECTED_N+' asks AND the '+EXPECTED_STATES+' harness states that five gates tap ('+allTitles.length+')',
      {asks:N,all:allTitles.length,want:EXPECTED_N+EXPECTED_STATES});
    for(const need of STATE_IDS){
      L.say(allTitles.some(t=>new RegExp('^\\d+ \u00b7 '+need.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' \u00b7 ').test(t)),
        lab+': the harness state card "'+need+'" is still reachable by the label gates/lib.js b.card() locates it by',
        allTitles.filter(t=>t.indexOf(need)>=0));
    }
    await b.home();const gb=b.page.locator('button[title="Preview gallery (dev)"]');await gb.click();await b.settle(400);
    await b.page.locator('button',{hasText:/^▶ Play/}).first().click();
    const seen=[];let done=false;const scrolled=[],shrunk=[],pageScroll=[],unsettled=[],cards=[];
    let cur=null,base=null,raced=0,sampled=0,lateBase=0;
    let lastSample=Date.now();
    for(let i=0;i<4000;i++){                                  // runaway guard only; the walk breaks on RECORDING COMPLETE
      const cap=await CAP(b);
      if(cap&&cap!==cur){
        cur=cap;seen.push(cap);
        if(/RECORDING COMPLETE/i.test(cap)){done=true;break;}
        if(NC&&new RegExp('·\\s*'+NC_CARD+'/').test(cap)&&(NC==='unsettled'||NC==='hideEntry'))L.note('NC '+NC+': '+await inject(b,NC));
        const s=await settleBoard(b);base=s.st.ok?s.st.w:null;
        const first=s.reads[0].w;
        // what the OLD baseline (the first post-caption frame) would have been, from the same series
        const oldBase=first, oldWouldRed=(oldBase!==null&&base!==null&&base<oldBase-TOL);
        cards.push({cap:cap.slice(0,34),first,base,settleMs:s.st.ok?s.st.fromMs:null,oldWouldRed,
          sawBoard:s.reads.some(r=>r.w!==null&&isFinite(r.w))});
        L.note(lab+' card "'+cap.slice(0,34)+'": first read '+first+', settled baseline '+base+
          (s.st.ok?' (held from '+s.st.fromMs+'ms of the 900ms window)':' NOT SETTLED: '+s.st.why)+
          (oldWouldRed?'   <- the OLD first-frame baseline would have reported a shrink of '+(oldBase-base).toFixed(2)+'px here':''));
        if(!s.st.ok&&s.st.why!=='no board')unsettled.push({cap:cap.slice(0,34),why:s.st.why,reads:s.reads.map(r=>r.w).slice(0,20)});
        if(NC&&new RegExp('·\\s*'+NC_CARD+'/').test(cap)&&NC!=='unsettled'&&NC!=='hideEntry')L.note('NC '+NC+': '+await inject(b,NC));
        lastSample=Date.now();continue;
      }
      if(cap&&/RECORDING COMPLETE/i.test(cap)){done=true;break;}
      if(Date.now()-lastSample<700){await b.settle(TICK);continue;}
      lastSample=Date.now();
      const m=await b.metrics();
      if(await CAP(b)!==cur){raced++;continue;}                // metrics is two evaluates; do not attribute across a change
      if(!cur)continue;
      sampled++;
      if(m.over.over>0.5)scrolled.push({cap:cur.slice(0,34),over:m.over.over});
      const pf=await PAGEFIX(b);
      if(pf.bodyPos!=='fixed'||!/^(auto|scroll)$/.test(String(pf.rootOv))||pf.docScroll>0)
        pageScroll.push(Object.assign({cap:cur.slice(0,34)},pf));
      const rec=cards[cards.length-1];
      if(m.board&&rec)rec.sawBoard=true;
      if(m.board&&base===null&&rec&&(rec.lateTried||0)<2){    // the board arrived after the entry window
        rec.lateTried=(rec.lateTried||0)+1;
        const s2=await settleBoard(b);base=s2.st.ok?s2.st.w:null;if(s2.st.ok)lateBase++;
        if(rec){rec.base=base;rec.settleMs=s2.st.ok?s2.st.fromMs:null;}
        L.note(lab+' card "'+cur.slice(0,34)+'": no board at entry; settled baseline '+base+' once it appeared'+
          (s2.st.ok?' (held from '+s2.st.fromMs+'ms of a second 900ms window)':' NOT SETTLED: '+s2.st.why));
        if(!s2.st.ok&&s2.st.why!=='no board')unsettled.push({cap:cur.slice(0,34),why:s2.st.why,late:true,reads:s2.reads.map(r=>r.w).slice(0,20)});
        continue;
      }
      if(m.board&&base!==null&&m.board.w<base-TOL)shrunk.push({cap:cur.slice(0,34),base,to:m.board.w});
    }
    await b.shot('playall-'+lab+'-final');
    L.say(done,lab+': the run ends on the RECORDING COMPLETE frame ('+seen.length+' captions seen)');
    const w=walkOk(seen,N);
    L.say(w.ok,lab+': every one of the '+N+' gallery cards was reached, in order ('+seen.length+' captions'+
      (w.ok?', card numbers '+w.ns.join(',')+')':') - '+w.why),w.ok?undefined:seen.map(c=>c.slice(0,44)));
    L.say(scrolled.length===0,lab+': no card leaves the page scrolling',scrolled.slice(0,3));
    // expected vacuous by design and kept as a tripwire for the design changing: index.html says #root is the
    // app's scroller and "the page never does", so docScroll is 0 on every screen (CLAUDE.md, two false P0s).
    L.say(pageScroll.length===0,lab+': the page itself cannot scroll - body is out of flow and #root is the scroller',pageScroll.slice(0,3));
    L.say(shrunk.length===0,lab+': no board shrinks inside a card, against a SETTLED baseline',shrunk.slice(0,3));
    L.say(unsettled.length===0,lab+': every card whose board is measurable settles inside the 900ms window',unsettled.slice(0,2));
    L.say(sampled>=8,lab+': the walk actually took samples to assert over ('+sampled+' attributed, '+raced+' discarded across a caption change)');
    // the population this gate's board assertion actually covers, pinned to the MECHANISM rather than to a card
    // count that the gallery can change under it: a caption whose board was never on screen has nothing to
    // baseline (the Starting frame), but one whose board WAS on screen must never be left unbaselined - which is
    // what the old lazy `if(curBoard===null)curBoard=m.board.w` did cover and a fixed entry window alone does not
    // (measured: card 6/8 US-R01 shows no board for the first 11.5s of its 52s).
    // AND THE POPULATION ITSELF MUST BE ASSERTED, not merely printed. Every board check here is conditioned on
    // the board existing, so a bundle whose board is display:none passes ALL of them - measured by the #416
    // antagonist at 24 pass / 0 fail with this line printing "2 of 15" and nothing reading it. That is the
    // count-with-no-assertion fault (#405, #413's invariant 4b), and the number was already on the page.
    // PINNED TO THE MECHANISM, NOT TO A COUNT WITH SLACK. The first draft of this line asserted
    // "at least 13 of 15", and a bar with one caption of slack is how a frozen denominator starts - a gallery
    // that legitimately gains one boardless caption would spend the slack silently. Measured at both
    // geometries over five runs, the captions WITHOUT a board are exactly one, and it is the frame whose own
    // text is "Starting...". So assert that: any other boardless caption is a finding, and a deliberate
    // change to the gallery has to come through here on purpose.
    const withBoard=cards.filter(c=>c.sawBoard).length;
    // #451: two-sided against EXPECT_BOARD. `capWants` reads the card id out of the caption itself rather than
    // out of SC, so the expectation stays external to the thing it checks.
    const capWants=(cap)=>EXPECT_BOARD.some(id=>new RegExp('\\s'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s').test(cap));
    const missingBoard=cards.filter(c=>!/Starting/.test(c.cap)&&capWants(c.cap)&&!c.sawBoard);
    const unexpectedBoard=cards.filter(c=>!/Starting/.test(c.cap)&&!capWants(c.cap)&&c.sawBoard);
    L.say(missingBoard.length===0,lab+': every caption whose card is pinned to show a board showed one ('+
      withBoard+' of '+cards.length+' captions had a board; '+EXPECT_BOARD.length+' card ids pinned)',
      missingBoard.map(c=>c.cap));
    L.say(unexpectedBoard.length===0,lab+': no caption painted a board where this commit pins none - so a card '+
      'whose state changes under us cannot pass by being boardless',unexpectedBoard.map(c=>c.cap));
    // AND THE VACUOUS CASE IS STATED, NOT SKIPPED. With EXPECT_BOARD empty every board-conditioned check in this
    // gate (shrunk, unsettled, noBase, and the two above) is trivially satisfied, which is precisely how an
    // assertion dies without anybody noticing (#405's frozen denominator; the #416 antagonist's 24 pass / 0 fail
    // over a display:none board). So assert the condition itself: if nothing is pinned, nothing may have painted
    // a board, and the log says in one line that the board invariants are carried elsewhere this run.
    if(EXPECT_BOARD.length===0){
      L.say(withBoard===0,lab+': EXPECT_BOARD is empty and NO caption painted a board - the board-shrink, settle '+
        'and baseline checks in this gate are inert this run BY DECLARATION, and the states they covered are '+
        'pinned in 10-gameover, 13-play-after-moves, 11-lesson, 12-hint, 20-review and 14-uat-review-card',
        {withBoard,captions:cards.length});
    }
    const noBase=cards.filter(c=>c.sawBoard&&c.base===null);   // #451: inert while EXPECT_BOARD is empty, asserted as such above
    L.say(noBase.length===0,lab+': every caption whose board was on screen got a settled baseline ('+
      cards.filter(c=>c.sawBoard).length+' of '+cards.length+' captions had a board, '+lateBase+' baselined late)',
      noBase.map(c=>c.cap));
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,lab+': no app error beyond the allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
    await b.close();
  }

  /* #451 BLOCK S: THE DENSE BOARD SAMPLER, MOVED ONTO THE FIXTURE CARDS RATHER THAN DELETED WITH THE QUEUE.
     THIS EXISTS BECAUSE ANTAGONIST A MEASURED WHAT MY CHANGE COST AND IT WAS MORE THAN I HAD NOTICED.
     Before #451 the walk above drove eight board screens, and the loop sampled the board every ~700ms against a
     baseline settled over a 900ms window - that is the only instrument in this repository that can see the board
     JUMP rather than merely differ between two stills, and gate 15 was rebuilt at #416 to see exactly that (a
     ~130ms, ~24px painted jump on card entry). #451 replaced those eight cards with two that correctly have no
     board, so every board assertion above went inert. I had argued the coverage "lives in" 10-gameover,
     13-play-after-moves, 11-lesson, 12-hint, 20-review and 14-uat-review-card. TWO MEASUREMENTS SAY THAT IS
     ADJACENT AND NOT EQUIVALENT:
       (a) THOSE GATES TAKE DISCRETE SNAPSHOTS, two to six per state. None of them samples densely enough to see a
           transient, so a jump would read as "both stills agree" and pass.
       (b) GEOMETRY, and this is the one that settles it: `grep -ln 812 gates/regress/*.js` returns exactly TWO
           files, this one and 35-width-containment - and in 35 the only occurrence is a COMMENT on line 10. All six
           gates I named read 0 occurrences of 812. This file's own header already said so in terms: "AT 375x812
           NOTHING IN THE SUITE PINS AN ABSOLUTE BOARD WIDTH - this gate is the only file under gates/regress/ that
           visits that viewport at all." So deleting the sampler would have taken the suite's board coverage at
           375x812 from one dense instrument to ZERO, and the proof was in the file I was editing.
     SO THE SAMPLER MOVES WITH THE CARDS, which is this project's own rule: if you move a UI element, the assertion
     that pins it moves WITH it rather than being deleted. The fixtures still drive the same eight states; block S
     taps them one at a time and samples each for its own hold. The machinery is reused unchanged - b.board() via
     settleBoard() for the baseline, b.metrics() for the samples, the same TOL - so nothing here is a new instrument
     that would itself need validating.
     US-R IS EXCLUDED AND IT IS THE ONLY EXCLUSION: its hold is 88000ms (measured off the TS array, not read off a
     flag), which would add ~3 minutes per geometry for a state that 14-uat-review-card and 20-review both drive
     directly. The other seven cost 55s per geometry. Stated rather than left as a silent gap.
     THE INSTRUMENT IS ASSERTED FIRST, because every claim below is "the board did not shrink" and that is vacuous
     if no board was ever on screen - the #416 antagonist got 24 pass / 0 fail over a display:none board. */
  /* block S honours CT_G15_GEOS like the walk does, so a control run can be scoped to one geometry and the scope
     published with its count [#411/#412]. Block F deliberately does NOT: its two widths ARE the acceptance
     condition ("every card fits at 320 and 375"), so narrowing them would narrow the thing being asserted. */
  const SALL=[['kunal','kunal'],['375x812',{w:375,h:812,safe:'',label:'375x812'}]];
  const SGEOS=pick.length?SALL.filter(a=>pick.includes(a[0])):SALL;
  for(const [slab,sgeo] of SGEOS){
    if(process.env.CT_G15_NOBOARD==='1'){L.note('block S skipped by CT_G15_NOBOARD=1');break;}
    const b=await L.launch({geo:sgeo,name:'states-'+slab,store:{ct_pool:'3'}});await b.open();
    let sawAny=0,settledAny=0;const shrunkS=[],noBaseS=[],boardlessS=[],unreachedS=[];
    for(const sc of STATE_CARDS){
      /* #451: THE TAP IS GUARDED, per this project's #393 rule - b.card() throws when its target is absent, and an
         unguarded throw here would take every assertion after it down with it ("a gate that halts on the first
         missing element hides every regression after it"). Found by running block S's OWN stateshide control, which
         broke the harness's navigation on the second card and took S0 to S3 with it: 35 pass, one "harness threw",
         and S0 never asserted at all. So an unreachable card is now its own red and the loop carries on. */
      let reached=true;
      try{await b.card(sc.id,300);}catch(e){reached=false;unreachedS.push({id:sc.id,err:String((e&&e.message)||e).slice(0,90)});}
      if(!reached){L.note('block S '+slab+' '+sc.id+': COULD NOT REACH THE CARD - its own red, loop continues');continue;}
      /* #451: block S's own negative controls, reusing the inject() this file already has rather than writing a new
         breaker. `statesshrink` shrinks the board 24px AFTER the baseline has settled, which is exactly the shape S2
         exists to catch and it crosses the TOL of 0.6 by a factor of 40. `stateshide` removes the board entirely,
         which must red S0 - the instrument - and NOT be allowed to pass S2 by making the shrink check vacuous. */
      if(NC==='stateshide')L.note('NC stateshide ['+sc.id+']: '+await inject(b,'hide'));
      const st=await settleBoard(b);
      const base=st.st.ok?st.st.w:null;
      if(NC==='statesshrink'&&base!==null)L.note('NC statesshrink ['+sc.id+']: '+await inject(b,'shrink'));
      const had=st.reads.some(r=>r.w!==null&&isFinite(r.w));
      if(had)sawAny++;if(base!==null)settledAny++;
      if(!had){boardlessS.push(sc.id);L.note('block S '+slab+' '+sc.id+': NO BOARD in the settle window');continue;}
      if(base===null){noBaseS.push({id:sc.id,why:st.st.why,reads:st.reads.map(r=>r.w).slice(0,12)});continue;}
      // sample for the rest of the card's own hold, densely, the way the walk used to
      const until=Date.now()+Math.max(1200,(sc.hold||5000)-1200);let n=0,lo=base;
      while(Date.now()<until){
        const m=await b.metrics();n++;
        if(m.board){if(m.board.w<lo)lo=m.board.w;
          if(m.board.w<base-TOL)shrunkS.push({id:sc.id,base,to:m.board.w});}
        await b.settle(TICK*4);
      }
      L.note('block S '+slab+' '+sc.id+': baseline '+base+', '+n+' samples, lowest '+lo+
        (st.st.ok?' (settled from '+st.st.fromMs+'ms)':''));
    }
    L.say(unreachedS.length===0,'S0a '+slab+': every one of the '+STATE_CARDS.length+
      ' fixture cards could be REACHED by the route gates/lib.js b.card() uses',unreachedS);
    L.say(sawAny===STATE_CARDS.length,'S0 '+slab+': THE INSTRUMENT - a board was on screen on every one of the '+
      STATE_CARDS.length+' fixture cards sampled ('+sawAny+'), so the shrink assertion below is not vacuous',
      {sawAny,boardless:boardlessS});
    L.say(noBaseS.length===0,'S1 '+slab+': every fixture card that showed a board got a SETTLED baseline inside the '+
      WIN+'ms window ('+settledAny+' of '+STATE_CARDS.length+')',noBaseS.slice(0,3));
    L.say(shrunkS.length===0,'S2 '+slab+': NO BOARD SHRINKS inside a fixture card, sampled densely against a '+
      'settled baseline - the board-jump instrument the ask queue no longer carries',shrunkS.slice(0,4));
    const badS=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(badS.length===0,'S3 '+slab+': no app error while driving the fixture cards',{other:badS.slice(0,2)});
    await b.close();
  }

  /* #451 BLOCK F: THE TWO ACCEPTANCE CONDITIONS THE FLUSHED GALLERY OWES, and neither is checked anywhere else.
     jobs/preview-gallery-flush-and-load-current-asks lists four; two are properties of the tracker record (which
     cards are due, what each removed card's verdict was) and two are properties of the running app:
       "Every card fits at 320 and 375 with nothing cut off."
       "Card 1's numbers match what the browser reports on the same device."
     F1/F2 run at 320x568 and at 375x730 - Kunal's real phone, which the walk above does NOT visit (it runs 375x679
     and 375x812), so this block is also the only place in this gate that measures his own geometry.
     HORIZONTAL, NOT VERTICAL, DELIBERATELY: the card list is an overflowY:auto scroller, so a long queue scrolling
     is correct and is not a cut (CLAUDE.md: "below the fold is not unreachable", two false P0s). What must never
     happen is a card's ink running past the viewport, which nothing can recover. */
  for(const [glab,ggeo] of [['320x568','se'],['375x730 (Kunal)','kunal730']]){
    const b=await L.launch({geo:ggeo,name:'cards-'+ggeo,store:{ct_pool:'3'}});await b.open();
    await b.home();await b.page.locator('button[title="Preview gallery (dev)"]').click();await b.settle(500);
    /* #451: F1's negative control, because two of its four assertions went GREEN against the #450 bundle and an
       assertion not yet shown able to fail is not evidence. CT_G15_NC=cardwide forces a card box wider than the
       viewport, which is the defect F1 exists to catch. **THE SECOND HALF OF THIS SENTENCE IS WITHDRAWN [R18]: it
       claimed cardwide also reds "cut horizontally", and it does not.** Antagonist A caught it and the mechanism is
       plain once stated - cardwide WIDENS the box, so the text wraps inside 536px and scrollWidth === clientWidth,
       leaving `cut` green. Each of the two controls reddens exactly ONE assertion: cardwide reds "past the
       viewport", cardclip reds "cut horizontally". Crediting one control with the other's coverage is how an
       uncontrolled assertion comes to look controlled. It must CROSS the threshold, not merely disturb the
       mechanism (CLAUDE.md, #384), so the width is set well past the widest geometry here rather than by a pixel. */
    if(NC==='cardwide'){
      const what=await b.page.evaluate(()=>{const st=document.createElement('style');st.id='ct-nc-cw';
        st.textContent='button{min-width:520px!important}';document.head.appendChild(st);
        return 'every button forced to min-width 520px - wider than 375 and than 320';});
      L.note('NC cardwide: '+what);await b.settle(400);
    }
    if(NC==='cardclip'){
      const what=await b.page.evaluate(()=>{const st=document.createElement('style');st.id='ct-nc-cc';
        st.textContent='button{white-space:nowrap!important;overflow:hidden!important}';document.head.appendChild(st);
        return 'card text forced to one nowrap line inside an overflow:hidden box - the card ink really is cut now';});
      L.note('NC cardclip: '+what);await b.settle(400);
    }
    const fit=await b.page.evaluate(()=>{
      const vw=window.innerWidth;
      const cards=[...document.querySelectorAll('button[data-ct="ask-card"]')];
      const states=[...document.querySelectorAll('button[data-ct="state-card"]')];
      const rd=(el)=>{const r=el.getBoundingClientRect();return {l:+r.left.toFixed(2),r:+r.right.toFixed(2),w:+r.width.toFixed(2)};};
      return {vw,n:cards.length,
        // a card's own box must sit inside the viewport, and its text must not be cut by its own box horizontally
        boxes:cards.map(c=>Object.assign({id:(c.innerText||'').split('\n')[0].slice(0,24),sw:c.scrollWidth,cw:c.clientWidth},rd(c))),
        states:states.map(c=>Object.assign({id:(c.innerText||'').split('\n')[0].slice(0,24),sw:c.scrollWidth,cw:c.clientWidth},rd(c))),
        docW:document.documentElement.scrollWidth};
    });
    L.note(glab+' gallery: vw '+fit.vw+', '+fit.n+' cards, doc scrollWidth '+fit.docW);
    L.say(fit.n===EXPECTED_N,'F1 '+glab+': the gallery renders the '+EXPECTED_N+' pinned cards at this width ('+fit.n+')',{n:fit.n});
    /* #451, AND THIS ONE EXISTS BECAUSE ANTAGONIST A BROKE THE ARGUMENT I HAD WRITTEN AGAINST IT. I claimed the
       data-ct scoping was not load-bearing "because assertion (3) also pins the TOTAL card count, which is readable
       on any bundle". That is true of the WALK loop and FALSE HERE, and the asymmetry is in the selectors: the walk
       reads `allTitles` from cardTitles(), which is unscoped text matching, while block F reads `fit.states` from
       `button[data-ct="state-card"]`. So a bundle that dropped ONLY that attribute while still rendering all eight
       cards would keep assertion (3) and all six STATE_IDS green, and `past`/`cut` below would silently measure 2
       of 10 boxes and pass - 74 PASS / 0 FAIL over 20% of the population they claim. Nothing in block F read
       fit.states.length at all. A also pointed out that MY OWN TS-EMPTY CONTROL had already demonstrated it: in
       that 48/6 run, `past` and `cut` went green having lost eight of their ten boxes, and I read the result only
       for what it proved about (3) and (4). That is the seventh costume of the trap this file is full of warnings
       about, in the half of the gate nobody cross-wired. One line closes it. */
    L.say(fit.states.length===EXPECTED_STATES,'F1 '+glab+': the '+EXPECTED_STATES+
      ' fixture card boxes are IN the population the two containment checks below measure ('+fit.states.length+')',
      {states:fit.states.length,want:EXPECTED_STATES});
    // the acceptance condition is about the cards Kunal is asked to record, but a fixture card painting off screen
    // is a real defect too, so both populations go through the same two checks rather than only the asks.
    const past=fit.boxes.concat(fit.states).filter(x=>x.l<-0.5||x.r>fit.vw+0.5);
    L.say(past.length===0,'F1 '+glab+': no card box paints past the viewport',past);
    const cut=fit.boxes.concat(fit.states).filter(x=>x.sw>x.cw+1);
    L.say(cut.length===0,'F1 '+glab+': no card is cut horizontally by its own box (scrollWidth vs clientWidth)',cut);
    /* EXPECTED VACUOUS BY DESIGN, AND SAID SO RATHER THAN COUNTED AS A LIVE CHECK - the same treatment this gate
       already gives the page-scroll line. Measured, not assumed: NEITHER of F1's two negative controls could red
       this one. CT_G15_NC=cardwide pushes both card boxes to 536 against a 320 viewport and docW stays 320;
       cardclip gives them a 2529px scrollWidth and docW stays 320. #root is the app's scroller and clips, so the
       document cannot grow horizontally whatever the gallery does. It is kept as a TRIPWIRE for that design
       changing, and it is NOT the assertion that protects the acceptance condition - the two above are, and both
       are controlled. Claiming this one as coverage would be the frozen-denominator shape (#405). */
    L.say(fit.docW<=fit.vw+0.5,'F1 '+glab+': TRIPWIRE (cannot fail while #root clips, proved against both NCs) - the gallery adds no horizontal page overflow',{docW:fit.docW,vw:fit.vw});

    /* F2: card 1 exists so ONE screenshot settles the height question, which makes the readout's own numbers
       load-bearing. Asserted against what the browser reports in the same evaluate, so a readout that printed a
       stale or wrong viewport goes red. LOCATED BY WHAT IT SAYS, not by a hook this commit added: the line is found
       by matching /^inner \d+x\d+/ over the rendered text. #432 - an assertion keyed only to a selector its own
       build adds cannot see the defect that build removes, and would have reported PASS against the old bundle by
       reading null. This way it goes red on any bundle whose readout lacks the line, including #450's. */
    await b.page.locator('button',{hasText:/^\u2715$/}).last().click().catch(()=>{});
    await b.settle(300);await b.home();
    await b.page.locator('button[data-ct="home-menu"]').click();await b.settle(500);
    const tog=b.page.locator('button',{hasText:/^Layout readout/}).first();
    const togSeen=await tog.count();
    L.say(togSeen>0,'F2 '+glab+': the menu offers the Layout readout toggle card 1 drives');
    if(togSeen>0){await tog.click();await b.settle(600);}
    const ro=await b.page.evaluate(()=>{
      let hit=null;
      for(const d of document.querySelectorAll('div')){
        if(d.children.length)continue;
        const t=(d.textContent||'').trim().replace(/\s+/g,' ');
        const m=t.match(/^inner\s+(\d+)x(\d+)\s+vv\s+(\S+)\s+app\s+(.+)$/);
        if(m){hit={text:t,innerW:+m[1],innerH:+m[2],vv:m[3],app:m[4].trim()};break;}
      }
      let vvReal=null;try{const q=window.visualViewport;if(q)vvReal=Math.round(q.width)+'x'+Math.round(q.height);}catch(e){}
      return {hit,real:{innerW:window.innerWidth,innerH:window.innerHeight,vv:vvReal}};
    });
    L.say(!!ro.hit,'F2 '+glab+': the readout prints the inner/vv/app line card 1 tells him to screenshot',
      ro.hit?ro.hit.text:'NO LINE MATCHING /^inner NxN vv .. app ../ IN THE READOUT');
    if(ro.hit){
      L.note('F2 '+glab+' readout says "'+ro.hit.text+'"; browser reports inner '+ro.real.innerW+'x'+ro.real.innerH+' vv '+ro.real.vv);
      L.say(ro.hit.innerW===ro.real.innerW&&ro.hit.innerH===ro.real.innerH,
        'F2 '+glab+": the readout's inner WxH equals what the browser reports",
        {readout:ro.hit.innerW+'x'+ro.hit.innerH,browser:ro.real.innerW+'x'+ro.real.innerH});
      L.say(ro.hit.vv===ro.real.vv,'F2 '+glab+": the readout's visual viewport equals window.visualViewport",
        {readout:ro.hit.vv,browser:ro.real.vv});
      // headless Chromium is a browser tab, never an installed app, so the branch is pinned rather than accepted loosely
      L.say(ro.hit.app==='browser tab','F2 '+glab+": the readout names the display mode, and in headless Chromium it is the browser branch",{app:ro.hit.app});
    }
    await b.shot('cards-'+ggeo+'-readout');
    const bad2=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad2.length===0,'F '+glab+': no app error in the gallery or the readout',{other:bad2.slice(0,2)});
    await b.close();
  }
},'GALLERY-PLAYALL');
