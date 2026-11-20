'use strict';
// gates/regress/178-clean-at-every-width-and-text-size-small-phones.js - EVERY SCREEN IS CLEAN AT EVERY PHONE WIDTH AND TEXT SIZE (the small phones).
// batch 13, jobs/every-screen-stays-clean-at-every-phone-width-and-text-size-2026-11-19, built with
// jobs/short-upright-boards-sized-to-height-2026-11-12. US-R174 / TC-R248a..f.
// THE SECOND HALF OF GATE 177: the same screens, the same six readings (overlap, cut, spill, sideways scroll, the board's side gaps,
// a card's side gaps) and the same pins file, on the phones WITHOUT a notch - 320x568 and 360x640 - on the short 375x667 that
// job 12 names (a 375 phone inside a browser's toolbars) and on 375x730 (the room his own phone leaves the column in the Home Screen
// app), each at 50%, 75%, 100% and 125% text: 16 cells per screen state, no insets.
// It is a gate of its own because the app reads its insets once at mount, so the two sets of phones need two launches, and one
// gate driving every state twice would not fit the suite's 900 s limit per gate.
// Everything else - how the app sets text size (it does not: the page zoom does), what each reading is, the pins and how to
// re-pin, the environment switches and the limits - is in gate 177's header and in gates/drive/layout.js, and is not repeated here.
// CONTROL-RECORD: 7d0c3b9a 2026-11-20 total=30 red=1 scope=trial:b0701b4a645c how=batch 13, pairs break the-vs-sits-on-the-name (the word vs pulled 22px onto the opponent's name), run by the grading machine with CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint)$ (4 of the 36 states): TC-R248a flat review-list red: [game-opp] x 'vs' text on text in 10 cells; the real code's trial 45cd057fcb91 reads 30/0 under the same switch
// CONTROL-RECORD: 7d0c3b9a 2026-11-20 total=30 red=5 scope=trial:f66a8fea0c6a how=batch 13, pairs break the-board-leaves-a-side-gap (the board pushed 16px in from the left), run by the grading machine with CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint)$ (4 of the 36 states): TC-R248e red at puzzle-hint (10 new cells) and review-move-10 (2 new cells), with TC-R248b at both and TC-R248f; the real code's trial 45cd057fcb91 reads 30/0 under the same switch
// CONTROL-RECORD: 7d0c3b9a 2026-11-20 total=30 red=1 scope=trial:d2d0ac20f676 how=batch 13, pairs break home-scrolls-sideways (Home's first card wider than the screen), run by the grading machine with CT_G177_STATES=^(home|review-list|review-move-10|puzzle-hint)$ (4 of the 36 states): TC-R248d flat home red: [home-scroller] scrolls sideways in 9 cells that are not pinned; the real code's trial 45cd057fcb91 reads 30/0 under the same switch
const L=require('../lib');
const LAYOUT=require('../drive/layout');
L.run(()=>LAYOUT.run('flat'),'CLEAN-EVERYWHERE-SMALL');
