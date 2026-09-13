# ANTAGONIST #373 — verdict: **FIX FIRST** (two claims measurably false in states the gates never entered; both one-line fixes)

Bundle under test: `app.js` stamped `#373 - 2026-09-12 22:22 ET` (served via `CT_APP`); before-numbers from `gates/.pin-app.js` (`#372 - 2026-09-12 20:20 ET`).
Harness: `gates/lib.js` (kunal = 375x679 no ct_safe, se = 320x568, 430 = 430x932, land = 844x390, land-se = 568x320).
Scripts: `gates/audit/antagonist373-*.js` (13; the earlier attempt's 11 reused, `-setup372c`, `-label`, `-solve`, `-foolsmate` added).
Logs: `gates/logs/antagonist373/*.log`. Shots: `gates/shots/antagonist373/`. Every number below is from a log line; nothing eyeballed.

## The two disputed numbers

1. **A-09 (label clamped inside the board) is false on the h-file.** Blunder game `1.e4 e5 2.Qh5 Nf6 3.Qxh7?? Rxh7 …`, ply 5, unflipped:
   the `rev-badge-label` "Blunder" (56x14) sits **16.5 px outside the board and is clipped by the grid at kunal** (`l:310, r:-16`, sq 43.6),
   **26 px outside/clipped at 320x568** (sq 33). Flipped (the same move on the a-side) 0 px. The round badge itself is inside (0 px) everywhere.
   Cause, in the code: the label carries `transform:'translateX(-50%)'` AND `animation:'iconpop .4s … both'`, and `@keyframes iconpop` ends at
   `100%{transform:scale(1) rotate(0)}` — with fill-mode `both` the animation's transform replaces the inline translateX for good, so the
   label is anchored at its LEFT edge on the clamped centre: `left = boardPx - 0.9*SQ`, width 56 → runs past the h-file. On the a-file the
   same missing translate hides the bug (the label starts at 0.9*SQ and runs inward). The gate's TC-R07 `badgesOutside` filters
   `borderRadius:50%` elements, i.e. the round badge only; the label was never measured, and the Opera fixture's only labels (10.Nxb5!! on
   b5, 9…b5?? on b5) are a-side. (`antagonist373-label.js`; shots `rev-*`.)
2. **N-review-2 (a checkmated position names the mated side) is false for a mate delivered by Black on the analysis board.** kunal, Opera
   review, ply 0 → round button → `1.f3 e5 2.g4 Qh4#`: the eval label reads **"M1"** (engine line "M1 …") and stays M1 for 8 s of 500 ms
   samples, engine line ON and OFF alike (`antagonist373-foolsmate.js`, shot `fools-kunal-eng.png`: queen on h4, king e1 flagged red). The same
   path with White mating (ply 32 → analysis board → Rd1-d8#) reads 1-0, and 17.Rd8# in the review reads 1-0 unflipped, flipped, engine on
   or off. So the `_mated` branch works on the review path; the M-score formatter on the analysis path wins over it when the score arrives
   as a mate-in-N.

## Table

| claim | measured? | configuration the gate skipped | number there | verdict |
|---|---|---|---|---|
| A-04 Home ☰ 46px, opens the menu | measured | 320x568, 430x932, 844x390, 568x320; 7 points inside the circle; tap 6px inside the left edge | 46x46 at every geometry; all 7 probe points hit the ☰; the tap opens the sheet. Bounding-box corners hit "Tap to replay"/the heading's line box (the button is round; the heading is not painted on the phone home), so no overlap that a finger can reach. Landscape only: a fixed 🏠 (z 60, 42x32 at 744,6) shares 30x24 px with the ☰ box but is not the hit target at any probe point. | HOLDS |
| A-16 menu sheet fills the viewport minus insets | measured | se, 430, land, kunal; from Home and from Discover | top 10 / bottom vh-10 everywhere (558/568, 922/932, 380/390, 669/679); sheet scrolls internally 944 / 484 / 1027 / 788 px; Look sheet open: not measured (time) | HOLDS |
| A-13 setup rhythm under 720px | measured | Computer + Viktor + Black + 1 min, and Online, at kunal / se / 430, before and after | Pass & Play: kunal 0 (was 0), se **108 (was 154)**, 430 0 — as the log says. **Computer+Viktor+Black+1min at kunal: scrolls 312 px (was 370), Start game bottom 931 of 679**; se 489 (was 547); 430 99 (was 99: gap stays 16 there). Online kunal 89 (was 135), se 269 (was 315). Nothing removed, gap 16→10 confirmed under 720. The DECISIONS-LOG line "at 375x679 the sheet already fitted on #372" is true of Pass & Play only. | HOLDS as worded; the Computer sheet on his phone scrolls 312 px (prose should say so) |
| A-10 Next puzzle advances before solving | measured | full tier lap at se (111 puzzles); AFTER solving via the 👁 line at se/kunal/430; Next at the tier END with the first puzzle solved | lap of 111 presses, 0 dead, 111 distinct, wraps to the first; after solving: Next → 2nd, Next → 3rd, Prev → 2nd, Prev → solved 1st, Next → 2nd; at the tier end Next wraps PAST the solved first to the 2nd (lap 111). Previous from the tier's first puzzle leaves the tier (plain `puzIdx-1`, unchanged by #373). | HOLDS |
| X-07 wrong-move wording on phones | measured | se, kunal (short form), 430x932 (vp.h ≥ 820 → long form on a phone) | se/kunal: "✗ a3 isn't it. Try again, or tap 💡." 1 line, nowrap, text 307/307 and 362/362 wide, not clipped; 430: long form "✗ a3 isn't it — try again. (Tap 💡 for a hint.)" 2 lines (46/46 tall, box 74/74), not clipped | HOLDS (the 820 cut puts the long form on a 430x932 phone, where it wraps cleanly) |
| A-11 Analyze/Copy 43px tap boxes via negative margins, row does not grow; chips 40; links 40 | measured | pixel-by-pixel `elementFromPoint` down the button's centre column at se and kunal, 20 plies; real clicks 6px above / 6px below the chip; stored profile ct_evalunder 0 + ct_hideEval 1 | box 43 (was 23), chip 23, but the **effective hit-tested height is 37 px** (10 above the chip, 4 below): the moves panel (marginTop 10) overlays the bottom 6 px of the box at se, kunal, 430 and kunal-prof (`atBot1: moves-panel`). Click 6px above the chip: "✓ Copied!"; 6px below: nothing (label unchanged; the panel's inner scroll is 0 at 20 plies, so nothing scrolled). #372 before-number: 23 effective, neither edge fired. Chips 40x5, links 40x4 at every geometry (DECISIONS-LOG says 41). Top-edge Analyze click leaves the game (opens the analysis import) at se/430/kunal-prof. | DISPUTED as "43": it is 37 (still +14 over #372, below the 40 the gate thought it measured) |
| A-12 moves panel always laid out; Moves toggles visibility; board never moves | measured | 0 plies and 20 plies at se, 430, kunal + stored profile | board w/top constant across off/on/off: se 272@63, 430 430@115, kunal-prof 351@78; panel h 65 / 154 / 67, visibility hidden↔visible, over 0, docScroll 0 | HOLDS |
| A-09 badge and label clamped inside the board | measured | a-file and h-file 10-ply game unflipped + flipped at se/430 (badges); Opera 16.Qb8+ and 17.Rd8# FLIPPED with the eval graph on; a Blunder LABEL on h7 and a6, unflipped + flipped, at se and kunal | badges: 0 px outside/clipped in all 40 edge-game plies and both flipped Opera plies. **Label: 26 px outside and clipped at se, 16.5 px at kunal on the h-file (unflipped); 0 px on the a-file / flipped** (see disputed 1) | DISPUTED for the label |
| N-review-2 label reads 1-0 at 17.Rd8# with the engine line on | measured | flipped board; a mate played on the ANALYSIS board by White (Rd8# from ply 32) and by Black (Fool's mate) | 1-0 unflipped, 1-0 flipped, 1-0 for Rd8# on the analysis board; **"M1" for Qh4# on the analysis board, steady for 8 s, engine on or off** (see disputed 2) | DISPUTED for a Black mate on the analysis board |
| Review UAT card 6 (`steps`) | measured | ct_pool '1' at kunal; default pool at se; CPU throttled x8 (CDP) at kunal | summary lands at 24.1 / 24.1 / 24.8 s in every configuration — neither one worker nor 8x CPU throttling pushes the analysis past the 52 s first checkpoint in this container; every step's caption named the right id AND the app was in the captioned state 1.5–2.4 s after it (52 summary, 58 ply 0, 64 10.Nxb5!!, 70 17.Rd8# 1-0, 76 Undo+Exit, 82 summary); caption clears by 88 s; 0 errors | HOLDS as far as this container can push it; a phone whose analysis takes > 52 s was NOT reproduced (the fn steps would then call setPly on a review that is not there) |

## States the gates skipped (all measured above)
- The label half of A-09 (only the round badge was ever asserted) — h-file, unflipped: clipped on his phone.
- A mate delivered by Black, and any mate on the analysis board, for N-review-2 — reads M1.
- The hit-tested height of the A-11 tap boxes (the gate read `getBoundingClientRect`) — 37, not 43.
- The Computer / Online setup sheets for A-13 — 312 / 89 px of scroll at kunal (improved from 370 / 135, never claimed to fit).
- Next puzzle AFTER solving and at the tier END for A-10 — holds.
- The Review card with a slow pool / throttled CPU — holds, but the > 52 s case could not be produced here.

## Fixes implied (not made; chess.jsx untouched)
1. `rev-badge-label`: keep the translate in the keyframes (`iconpop` 100% → `translateX(-50%) scale(1) rotate(0)`, or give the label its own keyframes / drop `both`), or centre it with a wrapper. Re-measure with `antagonist373-label.js` (expects worst 0 px at se and kunal, unflipped).
2. The analysis-board eval label: apply the `_mated` branch before the M-score formatting (a mated position has no mate-in-N to show). Re-measure with `antagonist373-foolsmate.js` (expects 0-1).
3. Prose only: A-11 "43px" → "43px box, 37px effective (the moves panel's 10px top margin covers the bottom 6px)"; footer links 40 not 41; A-13 note the Computer sheet scrolls 312 at 375x679.

All of this run's browsers were closed by the scripts (`b.close()`); no node/chrome process of these scripts remains. The chrome processes alive at the end (pid 8310 tree, 27 s old) belong to another agent's concurrent `node gates/audit/puzzles.js` (pid 7526, ppid 502), and `gates/.site/7863`, `8515` predate this run (02:04–02:06); left untouched.
