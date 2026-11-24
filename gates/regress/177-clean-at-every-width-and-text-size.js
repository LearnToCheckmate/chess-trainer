'use strict';
// gates/regress/177-clean-at-every-width-and-text-size.js - EVERY SCREEN IS CLEAN AT EVERY PHONE WIDTH AND TEXT SIZE (the notch phones).
// batch 13, jobs/every-screen-stays-clean-at-every-phone-width-and-text-size-2026-11-19 (Kunal, about 7:35pm EST Thu 19 Nov 2026:
// "once I make the size smaller, it starts getting messy but that shouldn't happen ... Every setting should be, and it should work on
// every setting. It should be clean."), built with jobs/short-upright-boards-sized-to-height-2026-11-12 (its board half).
// AT SIX PHONE WIDTHS AND FOUR TEXT SIZES NO SCREEN HAS OVERLAPPING TEXT OR CONTROLS, TEXT CUT OFF OR SPILLING OUT OF ITS BOX, A
// SIDEWAYS SCROLL, OR A SIDE GAP WHERE A BOARD OR A CARD SHOULD FILL THE WIDTH. US-R174 / TC-R248a..f.
// THIS GATE IS THE FOUR PHONES WITH A NOTCH; gate 178 is the two without one and the short 375. Both run gates/drive/layout.js.
//
// HOW THE APP SETS TEXT SIZE, MEASURED BEFORE THIS WAS WRITTEN: IT DOES NOT. chess.jsx has no text-size setting and no stored key for
// one, and index.html pins `-webkit-text-size-adjust:100%`, so a phone's text-only scaling never reaches it (settled 19 Nov 2026: his
// screenshots of the Home Screen app at three steps of the iPhone Settings text-size slider are the same pixel for pixel, and he picked
// "Keep text fixed for now"; that slider is not an axis here and never caused a fault). What reaches a web app
// when the text size is changed is the PAGE ZOOM (Safari's aA menu, 50% to 300%; Chrome's zoom; and Display Zoom, which is why his
// 430-point phone is 375 wide at "Larger Text"): the same screen is laid out on MORE or FEWER CSS pixels. So a text size t on a phone
// W x H points is, to the app's layout, the viewport W/t x H/t, and that is what is rendered here. Smaller text = a bigger sheet of
// CSS pixels (375 at 50% is 750 wide), larger text = a smaller one (320 at 125% is 256 wide).
//   PHONES  gate 177: 375x761 (his phone, R19), 390x844, 414x896, 430x932, each with ct_safe 51,31 (the kunal761 launch)
//           gate 178: 320x568, 360x640, the short 375x667 of job 12, and 375x730 - the room his own phone leaves the column in the
//           Home Screen app (a 812 shell less its 51 and 31 insets; ct_safe sets the inset numbers but pads nothing) - no insets
//   SIZES   50% (the smallest Safari offers), 75% (one step between), 100% (the default), 125% (see THE LARGEST)
//   = 4 cells per phone, 32 cells per screen state over the two gates. The insets are read once at mount, which is why there are two
//   launches; within a launch a cell is reached by RESIZING the live screen, which is what a zoom change is on a phone.
// THE LARGEST: nothing in the app declares a ceiling and Safari's goes to 300% (a 107px-wide sheet on a 320 phone, where no board
// app holds). 125% is the ceiling (his pick, 19 Nov 2026); it is the one constant SIZES in gates/drive/layout.js.
//
// WHAT IS READ, in every cell, from what is PAINTED AND IN FRONT (rects after every clipping ancestor; an atom whose sample points
// are covered by another fixed layer - a sheet over the page, Home over the tabs - is not read, because the user cannot see it;
// text kept for screen readers only is not read). Atoms are text runs (one per line of a text node) and controls (button, input,
// select, link, role=button; not the marks inside an svg). A transform is paint, not layout (CLAUDE.md): pieces are not atoms.
//  a OVERLAP   two text runs of different elements whose boxes intersect (more than 2px across and a third of a line down) with no
//              opaque box between either and their common ancestor (ink on ink); two controls that intersect by more than 2px both
//              ways and are not one inside the other; a text run and a control that is not its own (a badge with its own face drawn
//              over a control is excused); a line half under a pinned bar where nothing scrolls; a text run or a pill less than
//              2px from a neighbouring pill in its own row (board squares and pairs of buttons are not pills).
//  b CUT       a text run losing more than 2px sideways or a quarter of a line down to an overflow:hidden box that draws no ellipsis
//              and sets no line clamp (cut without saying so; an ellipsis or a clamp is counted, not failed); a placeholder or a
//              chosen option wider than its field (measured, since neither is a text node).
//  c SPILL     a text run or a control that straddles the edge of the box it sits in (the nearest ancestor that paints a background
//              or a border) or the edge of the screen; a word that runs into the border of its own small box.
//  d SIDEWAYS  the page, #root, or any tall or vertically scrolling panel that can be scrolled sideways.
//  e BOARD     the playing board's left and right gaps to the screen: more than 1.5px either side is a finding (FB-07, "full width"),
//              EXCEPT in a cell listed as height-capped (the fixture's `capped`: state -> cell -> width), where the rows have nothing
//              left to give: there the board must be centred within 1.5px and at least as wide as listed.
//  f CARD      a card (the outermost painted, rounded box at least half the screen wide, not a panel over the board) that is off
//              centre by more than 3px with nothing beside it, or that leaves more than max(32px, 10% of the width) empty on BOTH
//              sides; and a list that hides rows behind its own scroll while 15% of the screen's height under it is empty.
//
// PINNED, NOT REPORT-ONLY. On the tree it was written against (c608f411, a trial bundle of its chess.jsx) the two gates find the
// faults listed in gates/fixtures/177-layout-pins.json: the job's fix list, as screen state | kind | what -> the cells it happens
// in. A finding that is on that list is printed and counted; A FINDING THAT IS NOT ON IT IS RED, so from the day it lands the gate
// stops any NEW fault in any cell, and each fix deletes its pins (parts 2 and 3 of the job). CT_G177_STRICT=1 ignores the pins
// (everything found is red): that is the form the job closes on. A pin that no longer fires is printed as STALE and is not red.
// IF A MERGE MOVES A SCREEN and this gate reddens on findings that are the old ones under a new name, re-pin on the merged tree,
// by hand, with the diff of the pins file read: CT_APP=<trial> CT_G177_WRITE_PINS=1 node <this gate>, then the same for gate 178.
// ENV: CT_G177_STATES=<regex over state names>  CT_G177_CELLS=<regex over 'WxH@pct'>  CT_G177_OUT=<file> every finding as JSON
//      CT_G177_STRICT=1  CT_G177_WRITE_PINS=1  CT_G177_SHOTS=1 (a render of every cell)
// KNOW ITS LIMIT. Headless DejaVu, not his iOS fonts: a string that fits here by a pixel may not fit there, and the reverse. A cell is
// reached by RESIZING a live screen; a fault that exists only when the app is LOADED at that size is not seen. States are sampled:
// one to six per screen, after interaction (a move played, a sheet open, a puzzle failed). NOT DRIVEN: the board scanner, online
// play, the video call, tournaments, coach mode, the sign-in flow beyond the account sheet, the sideways (landscape) layouts, the
// desktop page (gate 149) and the iPad. Overlap is geometry of boxes, not of glyph pixels: lines whose boxes touch but whose ink
// does not are excused by the one-third rule, and ink that collides inside it is missed. A long name or a long engine line that
// the fixtures do not contain is not rendered. The pins are per descriptor, so a second fault of the same kind on the same element
// in a pinned cell is not seen until the first is fixed.
// CONTROL-RECORD: 7d0c3b9a 2026-11-20 total=30 red=1 scope=trial:b0701b4a645c how=batch 13, pairs break the-vs-sits-on-the-name (the word vs pulled 22px onto the opponent's name), run by the grading machine with CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint)$ (4 of the 36 states): TC-R248a notch review-list red: [game-opp] x 'vs' text on text in all 16 cells; the real code's trial 45cd057fcb91 reads 30/0 under the same switch
// CONTROL-RECORD: 7d0c3b9a 2026-11-20 total=30 red=5 scope=trial:f66a8fea0c6a how=batch 13, pairs break the-board-leaves-a-side-gap (the board pushed 16px in from the left), run by the grading machine with CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint)$ (4 of the 36 states): TC-R248e red at puzzle-hint (16 cells) and review-move-10 (12 new cells), with TC-R248b (the h file letter cut at the board's edge) at both and TC-R248f (the player bar off centre); the real code's trial 45cd057fcb91 reads 30/0 under the same switch
// CONTROL-RECORD: 7d0c3b9a 2026-11-20 total=30 red=1 scope=trial:d2d0ac20f676 how=batch 13, pairs break home-scrolls-sideways (Home's first card wider than the screen), run by the grading machine with CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint)$ (4 of the 36 states): TC-R248d notch home red: [home-scroller] scrolls sideways in 13 cells that are not pinned; the real code's trial 45cd057fcb91 reads 30/0 under the same switch
// CONTROL-RECORD: c0d52abf 2026-11-20 total=30 red=2 scope=trial:bcaa1908fc65 how=batch 13, the board half, pairs break review-board-fits-the-height-again (the Review board sized as if no row gave way), run by the grading machine with CT_G177_STATES=^(review-move-10|drill-analysis|lesson-demo|puzzle-hint)$: TC-R248e red at review-move-10 and drill-analysis (375x761 at 125 percent, 273 of 300); the real code's trial 15c7a2577368 reads 30/0
// CONTROL-RECORD: c0d52abf 2026-11-20 total=30 red=3 scope=trial:48dafea5c23d how=batch 13, the board half, pairs break the-820-cap-on-a-phone-sheet, same switch: TC-R248e red at review-move-10, drill-analysis and lesson-demo (414 and 430 at 50 percent, 820 of 828 and 860)
// batch 14 (#553, B2): the batch-13 records above cite c0d52abf / 7d0c3b9a / ff11ce90, which are in no ref of this repository (rebased away
// before the push), so control-audit.js reads them BAD-RECORD. They are kept as history; the controls were RE-RUN at 864311df and recorded below.
// CONTROL-RECORD: 864311df 2026-11-24 total=37 red=1 scope=trial:2bd52859f7db how=batch 14 re-run, pairs break the-vs-sits-on-the-name, CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint|lesson-demo-end)$ (job every-screen-stays-clean, run-pairs CHECKED at 864311df): TC-R248a notch review-list red: [game-opp] x 'vs' text on text; the real code's trial 595f707dde9e reads 37/0
// CONTROL-RECORD: 864311df 2026-11-24 total=37 red=6 scope=trial:e6c46c80607c how=batch 14 re-run, pairs break the-board-leaves-a-side-gap, CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint|lesson-demo-end)$ (job every-screen-stays-clean, run-pairs CHECKED at 864311df): TC-R248b and TC-R248e notch red at lesson-demo-end, puzzle-hint and review-move-10 (the h file letter cut, the board not filling the width); the real code's trial 595f707dde9e reads 37/0
// CONTROL-RECORD: 864311df 2026-11-24 total=37 red=1 scope=trial:2b3fbb0763e6 how=batch 14 re-run, pairs break home-scrolls-sideways, CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint|lesson-demo-end)$ (job every-screen-stays-clean, run-pairs CHECKED at 864311df): TC-R248d notch home red: [home-scroller] scrolls sideways; the real code's trial 595f707dde9e reads 37/0
// CONTROL-RECORD: 864311df 2026-11-24 total=44 red=2 scope=trial:42022f373b49 how=batch 14 re-run, pairs break review-board-fits-the-height-again, CT_G177_STATES=^(review-move-10|drill-analysis|lesson-demo|puzzle-hint|play-cpu|play-cpu-resigned)$ (job short-upright-boards, run-pairs CHECKED at 864311df): TC-R248e notch red at review-move-10 and drill-analysis (the board not filling the width); the real code's trial faa610e62e88 reads 44/0
// CONTROL-RECORD: 864311df 2026-11-24 total=44 red=3 scope=trial:d3736ec6da3a how=batch 14 re-run, pairs break the-820-cap-on-a-phone-sheet, CT_G177_STATES=^(review-move-10|drill-analysis|lesson-demo|puzzle-hint|play-cpu|play-cpu-resigned)$ (job short-upright-boards, run-pairs CHECKED at 864311df): TC-R248e notch red at lesson-demo, review-move-10 and drill-analysis (820 of 828 at 414x896@50 and 430x932@50); the real code's trial faa610e62e88 reads 44/0
const L=require('../lib');
const LAYOUT=require('../drive/layout');
L.run(()=>LAYOUT.run('notch'),'CLEAN-EVERYWHERE-NOTCH');
