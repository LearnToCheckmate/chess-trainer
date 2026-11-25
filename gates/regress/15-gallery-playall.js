// regress/15-gallery-playall.js  THE RECORDING-FREE GALLERY GATE (Kunal's feedback session, flag
// #553 SPLIT (B1, the lead's go of 25 Nov, gate 249 issued): gates.sh kills a gate at 900 s and this file ran 948.8 s (168/0, bundle
// 1982df233185, 18:57-19:13Z), the two Play-all walks 367 s each. So the walk at 375x812 and blocks F, M, Q, TC-GL-007/009 and HM moved
// to gates/regress/249-gallery-walk-375x812-and-the-gallery-blocks.js; this file keeps the units, the walk at kunal (375x679) and block
// S at both geometries. THE WALK LOOP IS IN BOTH FILES AND MUST STAY BYTE-IDENTICAL between the WALK-BODY markers: change one, change
// the other in the same commit - gate 249 reds if their md5s differ. CT_G15_GEOS still selects any of kunal, 375x812, kunal761, se here.
// CONTROL-RECORD: de0deaa 2026-11-03 total=128 red=3 scope=trial:c2ec502721bd how=#547 item (174)'s pre-fix bundle, gallery exit 34x34 and action buttons 42/41 tall: TC-GL-004 red at 320x568, 375x730 and 375x568 (run nc174) [#547 close-out, ratchet]
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
// ── A KNOWN DISAGREEMENT WITH gates/control-audit.js, RECORDED RATHER THAN WORKED AROUND (#451). That tool
//    requires `total` to lie inside 1..<number of L.say SITES in the file> and reports FAULT otherwise. No gate that
//    LOOPS can satisfy it: gate 15 has always run its sites over two geometries, so its runtime total exceeds its
//    site count, and the EIGHT PRE-EXISTING records below violate the bound too (total=25 against 13 sites at the
//    time) - they were only ever reported FAULT for the earlier reason, so nobody noticed. The totals in the rows
//    below are the MEASURED runtime counts, which is what a reader needs to reproduce them; publishing a smaller
//    number to satisfy the bound would be inventing a figure. So gate 15 reads ASSERTIONS-MOVED until the tool's
//    bound is fixed, and that is the honest state:
//    jobs/control-audit-bounds-total-by-the-L-say-SITE-count-so-no-looping-gate-can-be-covered-2026-10-01.
// ── #451's controls. SEVEN runs, every count MEASURED at one walk geometry and the scope published with it
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
// CONTROL-RECORD: b9465d2 2026-10-01 total=54 red=6 scope=env:CT_APP=548b4a913652 how=a trial bundle from chess.jsx with `const TS=[]` (md5 548b4a913652) - the fixture list deleted while the two asks stay. Reds the total-population assertion and all five STATE_IDS as they then were - the assertion that would have caught this build's own worst mistake before the suite did. NOTE: measured BEFORE block S and the y3 id were added, so re-run it when that row is next cited
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board width+height+squares cut 24px from card 2 on, persistent
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=a laid-out 14px child appended to #root
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=2 scope=env:CT_G15_GEOS=kunal how=board width flipped every 60ms so no 900ms window has a settled tail
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board display:none after the entry window - the hole the antagonist found
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=board display:none before the entry window
// CONTROL-RECORD: 955501e 2026-09-18 total=25 red=1 scope=env:CT_G15_GEOS=kunal how=body forced out of position:fixed with 3000px appended, so the page really scrolls
// CONTROL-RECORD: 8c9a628 2026-11-05 total=143 red=4 scope=trial:c7f6a1228e43 how=#548 items (119)(129)(112)(162): main #547 - TC-GL-006, TC-GL-007 and TC-GL-008 red
// CONTROL-RECORD: a8f0648 2026-11-06 total=153 red=0 scope=trial:d4f570553154 how=#549 item (51), the fixed trial bundle, no injection - the baseline the two rows below are read against
// CONTROL-RECORD: a8f0648 2026-11-06 total=153 red=2 scope=trial:d5069383fa60 how=#549 item (51), a trial bundle with _steps' fallback hold removed (the #452 code): reds SF3 and SF4 (TC-GL-011) and no other line (151 PASS)
// CONTROL-RECORD: a8f0648 2026-11-06 total=153 red=1 scope=env:CT_G15_NC=landLow,trial:d4f570553154 how=#549 item (51), the held bar pushed to bottom:-30px at 730x375 only: reds M6b 730x375 (TC-GL-008) alone
// CONTROL-RECORD: 7035d01 2026-11-11 total=132 red=9 scope=trial:d367ca5603b2 how=#550 answer a29: the tree before KEV was removed (the queue still '1 KEV|2 SCR|3 EXP', a manual card in it) - the pinned-queue lines at kunal and 375x812, the F1 count at three widths and M1 red; on t50 (87014810e439) 132 of 132 green, the three manual-card blocks NOT RUN, NAMED
// CONTROL-RECORD: afc6977 2026-11-06 total=155 red=1 scope=trial:2d58713526fe how=#549 item (88): the home dev row's guard with `!recCap` removed (the hide dropped): TC-GL-012 M12 red alone at 375x730 (run nc1)
// CONTROL-RECORD: afc6977 2026-11-06 total=155 red=1 scope=trial:4b74d46c0ea8 how=#549 item (88): the dev row also gated on a flag set by the manual card and never cleared (a hide that never lifts): TC-GL-012 M13 red alone at 375x730 (run nc2)
// CONTROL-RECORD: e4a169a 2026-11-12 total=132 red=9 scope=trial:3ab724514641 how=#550 re-control of the gate as it stands today (the control audit read ASSERTIONS-MOVED): origin/main's own #549 bundle, which carries none of batch 10 - first red: kunal: the ask queue holds the 2 cards this commit pins, in order (1)
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
/* #547 item (53): PHONE removed from the ask queue (Kunal's phone is settled at 375x761), so KEV is card 1 and the
   queue holds one card. */
/* #550 item (1): SCR, his phone check of the full-screen shell, joins as card 2. */
/* #550 answer a29 (the orchestrator, 11:37am ET: the Kevitsch screenshot is held, 'remove the KEV card as provided'): KEV leaves, so SCR
   is card 1 and EXP card 2. */
/* #553 B1 (jobs/load-the-550-phone-checks-into-the-preview-gallery-2026-11-16; the orchestrator's q26 ruling, run-answers
   orchestrator-B14-Q26-RULING-2026-11-24): IPAD leaves the queue under CLAUDE.md's Parked line ("The iPad, entirely, until the phone
   layout is settled. Do not spend a run on it and do not ask about it again."), and three cards join: 3 AUD (his page picks of 14 Nov),
   4 DSK (his desktop look at 1920x1080 and 1440x900, on the retired IPAD card's walk) and 5 SPD (speed with his own games). */
const PINNED_IDS='1 SCR|2 EXP|3 AUD|4 DSK|5 SPD';   /* #550 hold-landing (6): his iPad card, every screen the desktop and tablet rule touches */ //   /* #550 item (11): EXP, the plain-words engine reading, joined as card 3 (card 2 since a29) */
const EXPECTED_N=5;   // #550 hold-landing (6): + 3 IPAD; #553 B1: IPAD out, AUD, DSK and SPD in
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
/* #550 item (11): the gallery's EXP card ('explanations on the Review board', self-driving: the Opera import, then plies 9, 19 and 25 with the
   engine line and its why) is a REVIEW card, so all four of its captions paint the review board. Measured on trial t6: the walk's only
   board-painting captions are EXP, EXP-1, EXP-2 and EXP-3, at both geometries. Pinned, so the board-conditioned checks stop being inert
   for this walk and a caption of EXP that LOSES its board reds rather than passing as 'boardless'. */
const EXPECT_BOARD=['EXP','EXP-1','EXP-2','EXP-3','AUD','DSK','SPD'];   /* #550: IPAD walked screens with boards; #553 B1: AUD (a puzzle, a lesson, the review) and DSK (IPAD's walk) do, and so does SPD - measured 25 Nov (07:32Z run): its row tap opens the stored Opera game that EXP, AUD and DSK imported earlier in the walk, so 'no caption painted a board where this commit pins none' read red on SPD until it was pinned here */
/* #553 B1: THE WALK EXCUSALS, EARNED BY MEASUREMENT AND PINNED PER CARD ID (the lead's condition). IPAD, a walk across screens under one
   caption, was excused from two checks: the board's size across the walk (SHRINK) and pages that may scroll on the way (SCROLL). A card
   gets an excusal here only if gate 15 run with it OFF (CT_G15_NO_EXCUSE=<ids>, a measurement switch, printed loudly) reds exactly that
   walk check for that card, on screens where the board legitimately changes size or a page legitimately scrolls; the run is named in the
   reason. No pattern: the lookup is by the card id read out of the caption, and a card with no entry is excused from nothing. */
const WALK_EXCUSE={
  /* AUD, MEASURED with its excusals off (CT_G15_NO_EXCUSE=AUD,DSK,SPD; 06:56-07:07Z and 07:32-07:48Z on 25 Nov, bundle a5c973667137):
     SCROLL earned - its two over-episodes are pages that scroll by design, the Puzzles road (about 1140px over, 7 s into the card) and
     the 8.8-screen Openings list (about 5700px, 21 s in; jobs/bench-97-lesson-list-is-5934px-...), each cleared when the next screen came.
     SHRINK is BOUNDED, at 375x679 only (the lead's ruling): AUD's baseline is the previous card's leftover board (375, EXP's review
     under the Home overlay, taken when AUD's caption appears) and the lesson it opens settles at 341.03 there (07:32Z run: 375.03 -> 341
     at t=140901..142311 ms) - a legitimate size of another screen. It may go down to that settled lesson board and NO lower, so a
     board at the fit loop's 192 floor stays red. R18 [#553 B1, 25 Nov]: this comment first called that 192 frame a LESSON-entry frame;
     measured per frame it is Review's analysis-wait board on AUD's re-import of the already-analysed Opera Game, trimmed to the floor
     because a review was still in state (jobs/the-lesson-board-paints-half-width-for-its-first-half-second-on-entry-2026-11-25,
     re-titled; fixed by the fit loop staying off while analysing; gate 243 TC-R441 holds it per frame).
     No shrink excusal at 375x812, where the lesson board settles at the full 375. */
  AUD:{scroll:'the Puzzles road and the Openings list scroll by design (measured 25 Nov, see above)',shrinkFloor:{kunal:341.03-TOL}},
  /* DSK: NO SCROLL excusal (measured with its excusals off: no scroll episode). SHRINK is BOUNDED, at 375x679 only (the lead's ruling,
     25 Nov): DSK's baseline is the previous card's leftover board (375) and its re-import's review settles at 341.03 there - Review's own
     settled board at 375x679, the size EXP's own review settles at (341.03 at t=24061 in the 08:43Z whole-walk recording on the fix
     bundle; the final run at 10:57Z read DSK 375.03 -> 341 at t=244286..245743). Before the fit loop stayed off while analysing, that
     re-import painted the 192 floor and grew back past 341, so the sampler never read it. It may go down to that settled review board and
     NO lower. No shrink excusal at 375x812, where the review board settles at the full 375. */
  DSK:{shrinkFloor:{kunal:341.03-TOL}},
  /* SPD, MEASURED (07:32Z run): SCROLL earned - it ends on the Puzzles road, which scrolls by design (1115.6px at 375x812, still over at
     the end of the record because the road is its last screen: the SPD-10 glow check). No shrink: it paints one board, the stored game. */
  SPD:{scroll:'it ends on the Puzzles road, which scrolls by design (measured 25 Nov, see above)'},
};
const NO_EXCUSE=(process.env.CT_G15_NO_EXCUSE||'').split(',').map(x=>x.trim()).filter(Boolean);
const capId=(cap)=>{const m=/\s\d+\/\d+\s\u00b7\s([A-Z][A-Z0-9]*)(?:-\d+)?\s/.exec(String(cap||''));return m?m[1]:null;};   // the caption is '🎬 #553 · 3/5 · AUD · 375x679 ...'
const excused=(cap,check)=>{const id=capId(cap);if(!id||NO_EXCUSE.includes(id))return null;const e=WALK_EXCUSE[id];return e&&e[check]?id:null;};
// a bounded shrink: excused only down to the card's measured floor at this geometry; below it, or at a geometry with no floor, it counts
const shrinkExcused=(cap,lab,w)=>{const id=capId(cap);if(!id||NO_EXCUSE.includes(id))return false;const e=WALK_EXCUSE[id];const f=e&&e.shrinkFloor&&e.shrinkFloor[lab];return f!=null&&w>=f;};

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
/* #553 jobs/gate-15-reddened-on-a-review-entry-frame-2px-over-that-clears-in-ms-2026-11-21: "LEAVES THE PAGE SCROLLING" IS DECIDED
   ON THE SETTLED FRAME, BY A RECORDER THAT SEES EVERY FRAME, NOT BY A 700ms SAMPLE AND ONE RE-READ.
   WHAT THE APP DOES, traced frame by frame (an in-page requestAnimationFrame recorder, the same overflow rule as lib's b.over(), on the
   #553 trial bundle 41cb9b63624a): when Review mounts under the EXP caption the first painted frame has the board at the full 375.03
   and the shell (#root's first child) 699 tall in a 679 viewport - over 20 - for one frame (~37ms); the fit loop's first pass trims 16
   (board 357.03, shell 681, over 2) for one more frame (~33ms); its second pass lands on 341.03 and over 0, which then holds. Two
   painted frames, about 70ms. At 320x568 the same mount paints ONE frame over 45 (board 320 -> 265.03, ~26ms); at 375x761 (his phone)
   and 375x812 the first frame already fits, so there is no transient at all. The cause is that the fit loop (chess.jsx, the effect
   that measures `over` and calls setBoardTrim from a requestAnimationFrame tick) runs AFTER paint, so the frames it corrects are
   painted. Sizing the board before the first paint is a change to the Review fit, which another seat owns this batch; it is not
   made here, so the close condition's branch (3) applies: the gate keeps a settle window, and this is why.
   THE OLD RE-READ (b7317056) HAD TWO HOLES, and they are why it is replaced rather than lengthened. (a) It decided on ONE more
   sample 250ms later: an overflow that flickers (over in some frames, not in others - a fit loop oscillating between two trims,
   which is a real board jump) passes whenever that one read lands in a clear frame. (b) A re-read that found the caption changed
   was NOTED and not counted whatever it read, so a persistent overflow sampled near the end of a card escaped. And it saw the
   transient only by luck - a 70ms window under a 700ms sampler - which is why the red was random (1 of 2, 1 of 1) and why no
   control could show the settle wait was doing anything.
   WHY A PERSISTENCE RULE IS RIGHT HERE WHEN CLAUDE.md SAYS ONE WAS WRONG FOR THIS SAME GATE (gate15-baseline-is-the-unsettled-
   frame, "THE FIX A FLAG PROPOSES IS A HYPOTHESIS"): that flag's transient was the BASELINE, so the shrink from it to the settled
   width persisted for ever and a two-sample filter kept the false red. Overflow has no baseline - its bound is the viewport, which
   does not move - so "is it still over once the frame has settled" is a question with a fixed reference, and a transient really
   does end. The rule: an episode (over > 0.5) is a TRANSIENT only if it clears within OV_WIN of its onset AND the clear then holds
   for OV_HOLD (the same 900ms and 250ms as tailStable's window). Anything else PERSISTS and is counted: still over at the end of
   the record, cleared too late, or back over before the clear has held (a flicker is one episode, not two transients).
   Episodes are followed ACROSS a caption change on purpose: an overflow that lasts until the card changes has lasted longer than
   the window and so persists anyway, and one that starts just before a change is judged by its own duration, not by the caption. */
const OV_WIN=900, OV_HOLD=250;
function ovEpisodes(ev,tEnd,win,hold){
  const eps=[];let ep=null;
  const close=(why)=>{ep.why=why;ep.persists=!!why;ep.ms=(ep.clearAt===null?null:Math.round(ep.clearAt-ep.onset));eps.push(ep);ep=null;};
  for(const e of ev){
    const isOver=e.over>0.5;
    if(isOver){
      if(!ep){ep={cap:e.cap,onset:e.t,peak:e.over,clearAt:null,flicks:0};continue;}
      if(ep.clearAt!==null){
        if(e.t-ep.clearAt>=hold){close(ep.clearAt-ep.onset<=win?null:'took '+Math.round(ep.clearAt-ep.onset)+'ms to clear, past the '+win+'ms window');
          ep={cap:e.cap,onset:e.t,peak:e.over,clearAt:null,flicks:0};continue;}
        ep.clearAt=null;ep.flicks++;}
      ep.peak=Math.max(ep.peak,e.over);
    }else if(ep&&ep.clearAt===null)ep.clearAt=e.t;
  }
  if(ep){
    if(ep.clearAt===null)close('still over at the end of the record');
    else if(tEnd-ep.clearAt<hold)close('the record ended '+Math.round(tEnd-ep.clearAt)+'ms after it cleared, before the clear had held '+hold+'ms');
    else close(ep.clearAt-ep.onset<=win?null:'took '+Math.round(ep.clearAt-ep.onset)+'ms to clear, past the '+win+'ms window');
  }
  return eps;
}
// Each fixture is a recorder event list (only the frames where the value changed, as the recorder stores them), the time the record
// was read, and the verdicts ovEpisodes MUST give. O1 is the trace measured at 375x679; O3, O4, O5 and O7 are what must never be
// waved through as a transient.
const OVE=(a)=>a.map(x=>({t:x[0],cap:x[1]||'c',over:x[2]}));
const OVFIX=[
  ['O1 the measured 375x679 Review entry: over 20 for a frame, 2 for a frame, then 0 to the end - one TRANSIENT',
   OVE([[0,'c',0],[19790,'c',20],[19827,'c',2],[19860,'c',0]]),64000,[false]],
  ['O2 nothing ever over - no episodes',OVE([[0,'c',0],[500,'d',0]]),9000,[]],
  ['O3 a persistent overflow (NC=over, 14px for good) PERSISTS',OVE([[0,'c',0],[1000,'c',14],[2000,'d',14]]),9000,[true]],
  ['O4 a flicker - over, clear 100ms, over again, clear for good - is ONE episode that did not clear inside the window: PERSISTS',
   OVE([[0,'c',0],[1000,'c',6],[1100,'c',0],[1200,'c',6],[1300,'c',0],[1400,'c',6],[1500,'c',0],[1600,'c',6],[1700,'c',0],[1800,'c',6],[1950,'c',0]]),9000,[true]],
  ['O5 an overflow that takes 1200ms to clear PERSISTS (past the 900ms window)',OVE([[0,'c',0],[1000,'c',9],[2200,'c',0]]),9000,[true]],
  ['O6 two separate transients, each cleared fast and held, are two TRANSIENTS',
   OVE([[0,'c',0],[1000,'c',20],[1060,'c',0],[5000,'d',45],[5030,'d',0]]),9000,[false,false]],
  ['O7 a clear the record ends before it has held PERSISTS (not yet proved settled)',OVE([[0,'c',0],[1000,'c',3],[1040,'c',0]]),1100,[true]],
  ['O8 an overflow that lasts until the caption changes and clears on the next card: judged by its duration (3s), PERSISTS',
   OVE([[0,'c',0],[1000,'c',5],[4000,'d',5],[4020,'d',0]]),9000,[true]],
];
/* The recorder itself. Installed in the page before Play-all; every requestAnimationFrame it computes `over` by the rule lib's
   b.over() uses (bottom-most laid-out child of #root to depth 4, fixed and absolute children skipped, minus innerHeight) and stores
   an event only when the value or the caption changes, so a 100s walk is a few hundred events. frames[cap] counts the frames it ran
   under each caption (its denominator, asserted non-empty per caption below); cur/since are the current value and when it last
   changed, which the walk compares against b.over() at every steady sample so the recorder is shown to measure what the harness
   measures rather than trusted to. */
const OVREC=(b)=>b.page.evaluate(()=>{
  const R=window.__g15ov={ev:[],frames:{},cur:null,since:0,cap:null};
  const tick=()=>{
    const t=performance.now();
    const ce=document.querySelector('[data-ct="rec-cap"]');const cap=ce?(ce.innerText||'').replace(/\s+/g,' ').trim():null;
    const root=document.getElementById('root');let bottom=0;
    const walk=(el,depth)=>{for(const c of el.children){const st=getComputedStyle(c);if(st.position==='fixed'||st.position==='absolute')continue;const r=c.getBoundingClientRect();if(r.height>0)bottom=Math.max(bottom,r.bottom);if(depth<4)walk(c,depth+1);}};
    if(root)walk(root,0);
    const over=Math.round((bottom-innerHeight)*10)/10;
    if(cap)R.frames[cap]=(R.frames[cap]||0)+1;
    if(over!==R.cur||cap!==R.cap){if(R.ev.length<50000)R.ev.push({t:Math.round(t),cap,over});if(over!==R.cur)R.since=t;R.cur=over;R.cap=cap;}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);return true;
});
const OVREAD=(b)=>b.page.evaluate(()=>{const R=window.__g15ov;return R?{cur:R.cur,steadyMs:Math.round(performance.now()-R.since),now:Math.round(performance.now())}:null;});
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
  for(const f of OVFIX){
    const got=ovEpisodes(f[1],f[2],OV_WIN,OV_HOLD).map(e=>e.persists);
    L.say(JSON.stringify(got)===JSON.stringify(f[3]),'ovEpisodes unit: '+f[0],{got,want:f[3]});
  }
  for(const f of WFIX){
    const got=walkOk(f[1],f[2]);
    L.say(got.ok===f[3],'walkOk unit: '+f[0],{ok:got.ok,why:got.why,ns:got.ns});
  }
  const ALL=[['kunal','kunal'],['375x812',{w:375,h:812,safe:'',label:'375x812'}]];
  /* #553: his phone and the narrowest screen, SELECTABLE (CT_G15_GEOS=kunal761,se) and not in the default walk, so the suite's run time
     does not change in this commit; the pairs file for this job grades all four. 375x761 paints no transient at Review entry, 320x568
     paints one frame over 45 - which is why both are worth walking. */
  const OPT=[['kunal761','kunal761'],['se','se']];
  const pick=(process.env.CT_G15_GEOS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(pick.length){const bad=pick.filter(p=>!ALL.concat(OPT).some(a=>a[0]===p));if(bad.length)throw new Error('CT_G15_GEOS: unknown geometry '+bad.join(','));}
  const GEOS=pick.length?ALL.concat(OPT).filter(a=>pick.includes(a[0])):ALL.filter(a=>a[0]==='kunal');   // #553 split: 15 walks kunal by default, 249 walks 375x812
  if(NO_EXCUSE.length)L.note('!! CT_G15_NO_EXCUSE='+NO_EXCUSE.join(',')+' - A MEASUREMENT RUN: the walk excusals of these cards are OFF, so their walk checks count (an excusal is earned by this run, never given)');
  L.note('geometries: '+GEOS.map(g=>g[0]).join(' ')+(pick.length?'  (CT_G15_GEOS subset)':'')+(NC?'   NEGATIVE CONTROL '+NC+' at card '+NC_CARD:''));
  // WALK-BODY-BEGIN: this loop is BYTE-IDENTICAL in gates/regress/15-gallery-playall.js and gates/regress/249-gallery-walk-375x812-and-the-gallery-blocks.js (#553 split); gate 249 asserts the md5 of the text between these two markers matches
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
    /* THE PLAY-ALL BUTTON IS GUARDED, AND ITS ABSENCE IS DECLARED RATHER THAN THROWN. chess.jsx renders no
       Play button at all when the ask queue is EMPTY - which is this feature's SUCCESS condition, the state it
       exists to reach the day Kunal clears the list. Unguarded, this `.click()` then times out and the gate THROWS,
       taking every walk assertion after it down with it - the #393 fault this file already fixed once in block S
       ("a gate that halts on the first missing element hides every regression after it"). So: count first, and if
       the button is not there, say so as a red on a named assertion and a declared skip rather than as a throw.
       WHAT IS STILL OWED, AND IT IS NOT IN THIS FILE: the other half of
       jobs/the-gallery-ask-queue-has-no-coverage-for-being-empty-which-is-its-success-condition-2026-10-01 is a
       CT_* override that truncates or empties SC at launch, in the shape of CT_HM_BLOCKS. That lives in chess.jsx,
       which this run may not touch, so the empty and one-card states still have no POSITIVE coverage - this guard
       only stops the gate from throwing when they arrive. Recorded on that job as a skip, not as done. */
    const pab=b.page.locator('button',{hasText:/^Play( all \d+)? \(screen-record this\)$/});
    const pabN=await pab.count();
    L.say(pabN>0,lab+': the gallery offers a Play-all button to walk ('+pabN+' found) - if the ask queue is EMPTY this is the expected red and the walk below is skipped BY DECLARATION, not by a harness throw',{pabN,asks:N});
    if(pabN===0){L.note(lab+': walk skipped - no Play-all button, which is what an empty ask queue renders. The queue pin above still ran, so this run is not vacuous about the queue itself.');await b.close();continue;}
    const recOn=await OVREC(b).catch(()=>false);
    await pab.first().click();const walkT0=Date.now();   // #553 B1: the walk's own clock, so a shrink names when (and so on which screen of a walk card) it happened
    let ovCompared=0;const ovDisagree=[];
    const seen=[];let done=false;const scrolled=[],shrunk=[],pageScroll=[],unsettled=[],cards=[];
    let cur=null,base=null,raced=0,sampled=0,lateBase=0;
    let lastSample=Date.now();
    for(let i=0;i<8000;i++){                                  // runaway guard only; the walk breaks on RECORDING COMPLETE
      // #553 B1: was 4000, which ended the walk before card 5 once AUD (100 s) and SPD (60 s) joined - measured with the walk excusals
      // off (CT_G15_NO_EXCUSE=AUD,DSK,SPD, 06:56Z): DSK began about 246 s in and 'card 5 never appeared' at both geometries. The walk is
      // now about 420 s; the guard still only stops a walk that never ends, and 'the run ends on RECORDING COMPLETE' still asserts it ended.
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
      /* #550 lead, final suite: the IPAD card is a WALK across screens under one caption (the shrink check below already excuses it), and
         at 375x679 it passes through pages that still scroll there (jobs/pages-that-scroll-must-fit-on-one-screen-2026-11-11, open;
         the long lists may scroll by design, AUD-L08/L16). Seen at 37, 204.7 and 261.3px over in this run's suites, and 0 in others,
         by which screen the sample caught. Those pages have their own gates (159 and the job's list); this check is for the cards. */
      /* #552 (batch 13, run 3) reddened here on a 2px Review-entry frame; #553 moved the verdict to the frame recorder (see ovEpisodes).
         What a sample does now is CHECK THE RECORDER: when the recorder's value has been steady for 200ms, it must equal b.over()'s. */
      {const rr=await OVREAD(b);if(rr&&rr.cur!==null&&rr.steadyMs>=200){ovCompared++;if(Math.abs(rr.cur-m.over.over)>0.6)ovDisagree.push({cap:cur.slice(0,34),rec:rr.cur,harness:m.over.over});}}
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
      if(m.board&&base!==null&&m.board.w<base-TOL&&!shrinkExcused(cur,lab,m.board.w))shrunk.push({cap:cur.slice(0,34),base,to:m.board.w,t:Date.now()-walkT0});   /* #550: the IPAD card is a WALK across screens (lesson, puzzle, game, review) under one caption, so its board changes size by design; every other card is one screen */
    }
    await b.shot('playall-'+lab+'-final');
    L.say(done,lab+': the run ends on the RECORDING COMPLETE frame ('+seen.length+' captions seen)');
    const w=walkOk(seen,N);
    L.say(w.ok,lab+': every one of the '+N+' gallery cards was reached, in order ('+seen.length+' captions'+
      (w.ok?', card numbers '+w.ns.join(',')+')':') - '+w.why),w.ok?undefined:seen.map(c=>c.slice(0,44)));
    /* #553: the verdict, from every frame of the walk. IPAD is a walk across screens that may scroll (see above) and is excused as before. */
    const ovR=recOn?await b.page.evaluate(()=>({ev:(window.__g15ov||{}).ev||[],frames:(window.__g15ov||{}).frames||{},now:Math.round(performance.now())})):{ev:[],frames:{},now:0};
    const eps=ovEpisodes(ovR.ev,ovR.now,OV_WIN,OV_HOLD);
    for(const e of eps){
      const tag='      '+lab+' card "'+String(e.cap||'').slice(0,34)+'": over '+e.peak+' from '+e.onset+'ms';
      {const ex=excused(e.cap,'scroll');if(ex){L.note(tag+' - excused for '+ex+': '+WALK_EXCUSE[ex].scroll);continue;}}
      if(e.persists)scrolled.push({cap:String(e.cap||'').slice(0,34),over:e.peak,onset:e.onset,why:e.why});
      else L.note(tag+', cleared in '+e.ms+'ms and held - a layout-in-progress frame of the fit loop, not counted (#553, ovEpisodes)');
    }
    const capsNoFrames=seen.filter(c=>!/RECORDING COMPLETE/i.test(c)&&!(ovR.frames[c]>0));
    L.say(recOn&&capsNoFrames.length===0&&Object.keys(ovR.frames).length>0,lab+': the frame recorder ran under every caption of the walk ('+
      Object.values(ovR.frames).reduce((a,v)=>a+v,0)+' frames, '+ovR.ev.length+' changes, '+eps.length+' over-episodes) - the verdict below is over every painted frame, not a sample',
      {recOn,capsNoFrames:capsNoFrames.map(c=>c.slice(0,34))});
    L.say(ovCompared>=Math.max(1,N)&&ovDisagree.length===0,lab+': the recorder reads the same overflow as the harness\'s own b.over() at every steady sample ('+ovCompared+' compared, '+ovDisagree.length+' disagreed)',ovDisagree.slice(0,3));
    L.say(scrolled.length===0,lab+': no card leaves the page scrolling',scrolled.slice(0,3));
    // expected vacuous by design and kept as a tripwire for the design changing: index.html says #root is the
    // app's scroller and "the page never does", so docScroll is 0 on every screen (CLAUDE.md, two false P0s).
    L.say(pageScroll.length===0,lab+': the page itself cannot scroll - body is out of flow and #root is the scroller',pageScroll.slice(0,3));
    // ── THE FIVE BOARD-CONDITIONED CHECKS ARE REPORTED, NEVER CREDITED, WHEN THERE IS NO BOARD TO CHECK
    // [#544 item (31); jobs/three-suite-assertions-read-an-empty-or-constant-denominator-as-a-pass-2026-10-07,
    // P1, this file's instance found by antagonist B of #493 while reading the suite log for vacuity].
    // WHAT WAS WRONG, and this file already said half of it: `const EXPECT_BOARD=[]` makes capWants
    // constant-FALSE, so missingBoard and noBase are unconditional passes and unexpectedBoard reduces to
    // `withBoard===0`, which is the NEXT assertion - the same measurement counted as two PASSes. shrunk and
    // unsettled are conditioned on a board existing in the same way. SIX of the eight board-conditioned PASS
    // lines could not independently fail, and the file DECLARED that in a comment and credited them anyway,
    // which is precisely the half #493's own note says must not happen.
    // THE JOB OFFERS TWO REMEDIES AND ONLY ONE OF THEM IS AVAILABLE HERE [the rule against treating a flag's
    // proposed fix as a prescription]: "either populate EXPECT_BOARD or convert the vacuous cases to notes".
    // POPULATING IT WOULD BE FALSE. This walk's own measurement, taken at both geometries over five runs and
    // recorded above, is that the captions WITHOUT a board are exactly one and that the five board-owning
    // cards are driven by block S instead - which is why the declaration assertion below asserts
    // `withBoard===0`. Pinning a card id here would assert a board this walk does not paint.
    // SO THEY BECOME NOTES, AND ONLY IN THE STATE THAT MAKES THEM INERT. When a board IS painted, or when a
    // future commit pins one, every one of them is a real assertion again and unexpectedBoard stops being a
    // duplicate - so this does not weaken the gate, it stops it claiming eight checks where it ran one.
    const withBoard=cards.filter(c=>c.sawBoard).length;
    const boardInert=(EXPECT_BOARD.length===0&&withBoard===0);
    const sayBoard=(cond,msg,detail)=>{
      if(boardInert)L.note(lab+': NOT CHECKED (no board in this walk, EXPECT_BOARD empty) - '+msg);
      else L.say(cond,msg,detail);
    };
    sayBoard(shrunk.length===0,lab+': no board shrinks inside a card, against a SETTLED baseline',shrunk.slice(0,3));
    sayBoard(unsettled.length===0,lab+': every card whose board is measurable settles inside the 900ms window',unsettled.slice(0,2));
    /* THE SAMPLE FLOOR IS SCOPED TO THE QUEUE, NOT A CONSTANT 8 [R18]. It read `sampled>=8`, a bare literal from a
       time when the ask list was pinned at eight cards. #451 turned that list into a real QUEUE whose length is the
       thing that varies, and the walk's wall clock is now the queue's total hold: two cards give roughly 24 samples
       while ONE SHORT CARD can fall through 8 on a perfectly healthy build. A floor that reds because Kunal did
       what the feature asked him to do is worse than no floor - and a floor of 8 against a two-card queue is also
       three times slacker than it looks. One sample per queued card is the honest floor: being non-vacuous is the
       only thing this line was ever for. So it is derived from N, the count the pin above already established, and
       the scope is published with the number rather than left in the literal. */
    const SAMPLE_FLOOR=Math.max(1,N);
    L.say(sampled>=SAMPLE_FLOOR,lab+': the walk actually took samples to assert over - at least one per queued card ('+sampled+' attributed against a floor of '+SAMPLE_FLOOR+' for '+N+' cards, '+raced+' discarded across a caption change)',{sampled,floor:SAMPLE_FLOOR,N,raced});
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
    // withBoard is computed above, beside boardInert, so the five checks can be gated on it [#544 item (31)]
    // #451: two-sided against EXPECT_BOARD. `capWants` reads the card id out of the caption itself rather than
    // out of SC, so the expectation stays external to the thing it checks.
    const capWants=(cap)=>EXPECT_BOARD.some(id=>new RegExp('\\s'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s').test(cap));
    const missingBoard=cards.filter(c=>!/Starting/.test(c.cap)&&capWants(c.cap)&&!c.sawBoard);
    const unexpectedBoard=cards.filter(c=>!/Starting/.test(c.cap)&&!capWants(c.cap)&&c.sawBoard);
    sayBoard(missingBoard.length===0,lab+': every caption whose card is pinned to show a board showed one ('+
      withBoard+' of '+cards.length+' captions had a board; '+EXPECT_BOARD.length+' card ids pinned)',
      missingBoard.map(c=>c.cap));
    sayBoard(unexpectedBoard.length===0,lab+': no caption painted a board where this commit pins none - so a card '+
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
    sayBoard(noBase.length===0,lab+': every caption whose board was on screen got a settled baseline ('+
      cards.filter(c=>c.sawBoard).length+' of '+cards.length+' captions had a board, '+lateBase+' baselined late)',
      noBase.map(c=>c.cap));
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,lab+': no app error beyond the allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
    await b.close();
  }
  // WALK-BODY-END

  if(process.env.CT_G15_ONLY==='WALK'){L.note('CT_G15_ONLY=WALK: the units and the Play-all walk only - blocks S, F, M and HM skipped (a subset; never a push gate)');return;}   // #553: the pairs file's scope
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
     THREE OF THE EIGHT ARE EXCLUDED, NOT ONE, and the five that remain cost 44s per geometry, not 55s.
     **THE THREE NUMBERS THAT STOOD HERE UNTIL NOW ARE WITHDRAWN [R18]**: this header read "US-R IS EXCLUDED AND IT
     IS THE ONLY EXCLUSION ... The other seven cost 55s per geometry", and all three figures disagreed with the same
     file. RE-DERIVED FROM STATE_CARDS, WHICH IS THE AUTHORITY (:255-256), BY PARSING IT RATHER THAN READING IT:
     five entries - k10 13000, k8 8000, card 3 7000, card 4 9000, A-06 7000 - summing to 44000ms = 44s per geometry,
     88s for both. The exclusions, each for its own measured reason and all three stated at :243-254: US-R (hold
     88000ms, ~3 minutes per geometry for a state 14-uat-review-card and 20-review both drive directly - cost, not
     coverage) AND CARDS 7 AND 8, both y3, which have no board of their own. WHY THE CORRECTION IS THE SAME FINDING
     THE BLOCK IS ABOUT: block S exists because a published count had no scope, and this header published three
     unscoped numbers of its own. A reader who trusted the nearer comment would re-derive a wrong exclusion set and
     either widen block S to the two boardless cards or mis-budget the suite by 11s a geometry.
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

},'GALLERY-PLAYALL');
// SELECTOR-OPENED: gallery-blurb-more reading=presence round 4: TC-GL-007 needs the fold reachable
// SELECTOR-OPENED: rec-cap-back reading=presence round 4: M11 needs the 44px control
// SELECTOR-OPENED: state-card reading=precondition round 4: Q needs four state cards
// SELECTOR-OPENED: menu-foot reading=nav #550 lead, opened by reading: the click opens the fold and the next tapText(/^Layout readout$/) targets a row behind it, so a missing hook leaves it unreachable and the tap fails red
// CONTROL-RECORD: fb7bfc7 2026-11-14 total=135 red=18 scope=trial:ae6bed67afdf how=#550 #432 sweep round 5 (the queue counted by its cards' mode badges): c15, ask-card renamed AND the gallery drawing every ask card whatever ct_scmax truncates the queue to - 'Q empty: the ask queue holds exactly 0' red (by hook 0, by mode badges 3); the hook-keyed version (5de53c1) on the same bundle is 119/16 with that line GREEN beside three drawn cards (its reds are the presence lines reading the missing hook, and TC-GL-005 because the cards push the empty sentence below the fold); the one further red in the new run ('no card leaves the page scrolling', in the play-all walk, which this commit does not touch) did not recur on t0; on t0 6925a0ca4de2 156/0
// CONTROL-RECORD: b7317056 2026-11-21 total=130 red=1 scope=env:CT_G15_GEOS=kunal,CT_G15_NC=over how=batch 13, the over re-read (an over counts only if still there 250ms later): a persistent 14px child of #root still reddens 'no card leaves the page scrolling', every sample reading over 14 and again 14 (claude/agents/gatelogs/552-15-NC-over-after-b7317056.log)
// CONTROL-RECORD: 22ce1e17 2026-11-25 total=140 red=2 scope=trial:721f7b18e5c4 how=#553 B1, AUD's bounded shrink floor (341.03-TOL at 375x679), the lesson board pinned at 192 in a trial of this tree, CT_G15_GEOS=kunal, floor ON (10:12-10:21Z): AUD red below the floor (375.03 -> 192 at t=132827, 133528, 134290); the other red is EXP's 20px (jobs/gate-15-exp-card-leaves-review-20px-over-...)
// CONTROL-RECORD: 22ce1e17 2026-11-25 total=140 red=2 scope=trial:721f7b18e5c4 how=#553 B1, the same bundle with AUD's excusals OFF (CT_G15_NO_EXCUSE=AUD, 10:43-10:52Z): red - the same three 192 shrinks, and AUD's road and Openings-list scroll episodes count
// CONTROL-RECORD: 22ce1e17 2026-11-25 total=140 red=2 scope=trial:589e8788d01c how=#553 B1, DSK's bounded shrink floor (341.03-TOL at 375x679), the REVIEW board pinned at 192 from the walk's THIRD import on (DSK's; EXP's and AUD's reviews keep their sizes, so DSK's baseline is real), CT_G15_GEOS=kunal, floor ON (12:01-12:09Z): DSK red below the floor (375.03 -> 192 at t=244177, 244885, 245593); the other red is EXP's 20px
// CONTROL-RECORD: 22ce1e17 2026-11-25 total=140 red=2 scope=trial:589e8788d01c how=#553 B1, the same bundle with DSK's excusals OFF (CT_G15_NO_EXCUSE=DSK, 12:11-12:20Z): red - DSK 375.03 -> 192 at t=243795, 244495, 245203
// CONTROL-RECORD: 4e9c0b5e 2026-11-25 total=69 red=1 scope=env:CT_G15_ONLY=WALK how=#553 B3, jobs/gate-15-exp-card-leaves-review-20px-over-for-11-to-13-seconds-at-375x679-2026-11-25, its pairs break (trial c6502b016dec: the Review waiting screen's fit back to stopping at |room|<=2) at CT_G15_GEOS=kunal,kunal761 - 'no card leaves the page scrolling' red at 375x679 (EXP: over 20, onset 13491ms, 18549ms to clear; the wait screen 1.8px over for the whole review), kunal761 green; with the fix (trial bbb70a37eb88) 69/0, and the whole gate 168/0 on b47260aecb0a
// CONTROL-RECORD (B1 #553), not a control: a first DSK control pinned EVERY Review board at 192 (trial 8ddc12c1a522, 11:44-11:52Z) and was VACUOUS - AUD's review was 192 too, so DSK's baseline was 192 and it could not shrink; not counted
// (not control records) batch 13, 2026-11-21, on 73249bd45e30: BEFORE b7317056 the whole gate read 156/0, 155/1 and, on the bundle from before batch 13's fixes 81d3ffd0b7ba, 155/1 - the same 2px on the EXP card's entry step each time it went red. AFTER it, 156/0 and 156/0; the first of those NOTED the very frame ('over 2 at one sample, 0 250ms later'; claude/agents/gatelogs/552-15-after-b7317056-real1.log).
// SELECTOR-OPENED: ask-card control=fb7bfc7 round 5: Q's queue-length line also counts the cards by their mode badges; c15 renamed the hook and drew three cards in the empty queue, red
// SELECTOR-OPENED: rec-cap-done reading=presence round 5: M5b requires the Hide control by this hook before M6/M7 read or tap it, M7's own absence check reads rec-cap (#451, not this pair), and the block is NOT RUN since a29 (MANUAL_CARD null), so no line reads the hook on any bundle today
// CONTROL-RECORD: d71d2831 2026-11-25 total=56 red=1 scope=trial:34084b86698a how=#553 B1, the split's control for this half: e370bd84 with gates/pairs/breaks/g15-wait-fit-stops-on-a-negative-room.diff (the waiting screen's fit stops at |room|<=2 again) - reds 'kunal: no card leaves the page scrolling' (EXP at 375x679, 20px, 16372 ms) and nothing else; the same tree unbroken (1982df233185) read 56/0 in 487.2 s, 19:17-19:25Z
