'use strict';
// gates/regress/178-clean-at-every-width-and-text-size-small-phones.js - EVERY SCREEN IS CLEAN AT EVERY PHONE WIDTH AND TEXT SIZE (the small phones).
// batch 13, jobs/every-screen-stays-clean-at-every-phone-width-and-text-size-2026-11-19, built with
// jobs/short-upright-boards-sized-to-height-2026-11-12. US-R174 / TC-R248a..f.
// THE SECOND HALF OF GATE 177: the same screens, the same six readings (overlap, cut, spill, sideways scroll, the board's side gaps,
// a card's side gaps) and the same pins file, on the phones WITHOUT a notch - 320x568 and 360x640 - and on the short 375x667 that
// job 12 names (a 375 phone inside a browser's toolbars), each at 50%, 75%, 100% and 125% text: 12 cells per screen state, no insets.
// It is a gate of its own because the app reads its insets once at mount, so the two sets of phones need two launches, and one
// gate driving every state twice would not fit the suite's 900 s limit per gate.
// Everything else - how the app sets text size (it does not: the page zoom does), what each reading is, the pins and how to
// re-pin, the environment switches and the limits - is in gate 177's header and in gates/drive/layout.js, and is not repeated here.
const L=require('../lib');
const LAYOUT=require('../drive/layout');
L.run(()=>LAYOUT.run('flat'),'CLEAN-EVERYWHERE-SMALL');
