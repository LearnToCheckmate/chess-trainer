# Inset census, #550: what moves on kunal761 when CSS `env(safe-area-inset-*)` is real

For `jobs/kunal761-emulates-ct-safe-only-so-css-env-positions-sit-51px-off-his-phone-2026-11-14` (P1), the census half.
Measurement only: no app code, `gates/lib.js` or pin was changed. Written by #550 test-system helper B (run
build__1794388896663) on 2026-11-14.

## What was measured

- **Bundle**: a trial of tree ad33023 (b8a56cd plus one gate comment), app.js md5 **c3a2b2924fa3**, stamp
  `#550 - 2026-11-14 01:19 ET (src 39a619b6b822)`, built with `CT_OUT` (no register row).
- **Geometry**: `kunal761`, 375x761. lib.js gives this geometry `ct_safe '51,31'` and nothing else.
- **Two modes, one fresh browser each, run one after the other**:
  - **A** is `ct_safe` only. This is what every kunal761 gate measures today. The probe reads `env(safe-area-inset-top)`
    = **0** and bottom = **0**.
  - **B** is `ct_safe` plus CDP `Emulation.setSafeAreaInsetsOverride {top:51,bottom:31,left:0,right:0}`, sent before
    `open()`, exactly as `gates/regress/77-empty-bands.js:226` does. The probe reads env top = **51** and bottom = **31**.
- **States**: the 12 states of `gates/vocab.js`, in its order and with its drivers. Both modes reached all 12 (13 PASS / 0 FAIL
  each).
- **Elements**: every painted element counts: a `[data-ct]`, a button/a/input/textarea, or a leaf text node, if it
  is on screen, visible and at least 1x1. Each is keyed by data-ct, tag, the first 40 characters of its text and its
  occurrence number.
- **Bands**: the top band is 0..51. The bottom band is the last 31 px (730..761).

## 1. Every `env(safe-area-inset-*)` site

There are 65 uses: **64 in chess.jsx** (41 lines; 28 bottom, 25 top, 8 right, 3 left) and **1 in index.html**. The full
list, with line, side, property, nearest data-ct and context, is in `inset-census-550/envsites.tsv`. Grouped by role:

| role | chess.jsx lines | side(s) |
|---|---|---|
| top rows / corner buttons, `top: calc(env(top) + TOP_Y or 6px)` | 10322-10323 (home-menu, account), 10924-10925 (tab-screen corner buttons), 10926 (offline-edge) | top, right |
| tab-screen and sideways shells, `paddingTop` / `paddingLeft` / `paddingRight` | 9965 (9 uses), 13294 (tactics rail) | top, left, right |
| full-screen pages, `padding: max(Npx, env(top)) ... max(20px, env(bottom))` | 10320 (home-scroller), 10432, 10547, 10584, 10632, 10648, 10663, 11038 (look), 11073, 11547 (rev-summary `max(safeTop, env)`) | top, bottom |
| sheets padded at the foot, `calc(Npx + env(bottom))` | 10031 more-sheet, 10034 regrade-preview, 10049 rev-sheet, 11531 lesson-note-sheet, 11758 bril-lib, 12909 online-talk, 13110 drill-pick, 13854 | bottom |
| sheets padded at the head | 9981, 10293 (menu sheet column) | top |
| fixed toasts and overlays | 10026 online-info, 10028 rec-cap, 10029-10030 toasts, 10308 celebrate, 12552 rev-engwhy, 13879 | top, bottom |
| tab bar | 4747 (`paddingRight`), 4754 (`padding-bottom: calc(6px + env(bottom))`) | right, bottom |
| footers / spacers | 11681 rev-summary-foot, 13827 spacer, 13844 lesson-footer (3) | bottom |
| probes, not layout | 5694-5695 (app: setSafeTop / setSafeBot, which **return early when `ct_safe` is set**, so the probe never reads env under any kunal761 gate); index.html:90 (full-screen shell `topInset()`, which also prefers `ct_safe`) | top, bottom |

## 2-3. Per screen, A against B

Columns:
- *moved*: elements present in both modes whose rect changed by more than 0.5 px.
- *new overlap*: control pairs that intersect in B and not in A, without either containing the other.
- *band*: painted elements touching 0..51 or the bottom 31.
- *board*: `b.metrics()` top/width.

| state | els A/B | moved | main moves (dy px, count) | new overlap in B | band A | band B | overflow | board A -> B |
|---|---|---|---|---|---|---|---|---|
| home | 68/67 | 66 | +39 (41: home-col and its tiles), +51 (8: home-menu, account, top-row), +36/+10/+25/+14 (Discover tiles mounted under Home) | 7 (Home tiles vs the Discover screen mounted under it) | 8: ☰, account and top-row at y2; home-build at 728 | 9: home-footrow (Ocean / Classic / 🎬 / 💬) at 715+44, ends at 759 | home-col 51+729 runs 19 px past 761; **home-build gone** (A only) | - |
| discover | 33/33 | 33 | +51 (top row, title), -31 (tab bar buttons 711->680) | 0 | 14: top row at y2, tab bar 705..761 | 1: tab bar 674+87 | none | - |
| puzzles-roadmap | 33/32 | 32 | +51 (21), -31 (10) | 2: 'Student' row vs Home and Discover tabs (scroll content passing under the fixed tab bar) | 15 | 3 | root scroll 1058 -> 1140 | - |
| puzzles-browse | 44/44 | 44 | +51 (33: board and its labels), -31 (10) | 0 | 17: pz-top row at y2 (Back to Journey, ☰), tab bar | 1: tab bar | none | top 173 -> 224, w 375 both |
| review-list | 23/23 | 23 | +51 (12), -31 (10) | 0 | 14 | 1 | none | - |
| play-setup | 120/119 | 119 | +51 (108: the whole setup sheet), -31 (10) | 5: a range input vs all five tab buttons | 20: setup-top at y2 | 3: **setup-start '▶ Start game' at 732+44, bottom 776, past the 761 viewport** (681+44 in A); setup-sheet 53+773 | root scroll 0 -> 19 | top 149 -> 200, w 368 both |
| play-setup-passplay | 97/97 | 97 | +51 (86), -31 (10) | 0 | 19 | 1 | root scroll 0 -> 19 | top 149 -> 200 |
| play-live-computer | 55/53 | 43 | +38.2/+38.3 (board, eval bar, rank labels), +25.5 (control row 587->612.5), +44.7 (top player bar), +51 (⌂ and ☰), +31.9 (bottom bar) | 0 | 6: ⌂, ☰, 'Chess Trainer' at y2..14; moves-panel at 655+98 | 7: moves-panel 680.5+72.5 and its move spans at 715.5 | none | top 140.5 -> 178.7, w 375 both |
| play-gameover | 62/62 | 62 | +25.5 (27: move row, control row), +38.2/+38.3 (board), +51 (5: chrome row), +44.6 (top bar) | 0 | 6: chrome row at y2 | 1: moves-panel 676.5+76.5 (A 651+102, 25.5 shorter) | none | top 120.5 -> 158.7, w 375 both |
| lesson-demo-end | 57/57 | 57 | +51 (27: lesson-note and the board above the moves), +49 (23: move spans), -31 (5: footer buttons 709->678) | 0 | 9: lesson-note at y5; lesson footer 700+61 | 1: lesson-footer 669+92 | moves-panel 82 px shorter | top 92 -> 143, w 375 both |
| puzzle-hint | 44/44 | 44 | +51 (33), -31 (10) | 0 | 15: pz-top and the 💡 hint head at y2..10.6 | 1: tab bar | none | top 173 -> 224, w 375 both |
| menu | 70/70 | 70 | +41 (37: menu-sheet 10->51 and its rows), +51 (top row), -31 (tab bar), Discover tiles under the sheet ±10..-12.5 | 12: menu rows vs the Discover tiles under the sheet (the sheet overlays the screen; cross-layer, not a control-on-control defect) | 17: menu sheet head at y10, ✕ at y14 | 1: tab bar | none | - |

**What the table shows:**
- **In A, every env-positioned top element sits inside the 0..51 band** that the phone gives to the status bar: top rows,
  corner buttons, pz-top, the lesson note, the play chrome row and the menu sheet head, at y 2 to 14. The tab bar,
  lesson footer and play moves panel also sit in the bottom 31.
- **In B, with env real**:
  - Nothing is left in the top band.
  - The tab bar grows from 56 to 87 tall, starting at 674 instead of 705.
  - The lesson footer grows from 61 to 92.
  - Everything stacked under a top row moves down by 51, or by 38-45 where the layout absorbs some of it (play boards).
- **Board width does not change in any state.** Board top moves +38.2 (play) or +51 (puzzles, setup, lesson).
- **Three things go past the viewport in B and not in A**:
  - setup-start ends at 776 against 761.
  - The home column runs 19 px past the bottom, and the build line drops off screen.
  - The setup sheet's root gains 19 px of scroll.
- This census did not measure whether those three can be scrolled into reach. That is a reachability question (gate 40's
  method), not a reading.
- **Of the new overlaps, only play-setup's** could be a defect: the range input under the five tab buttons. The others
  are a screen mounted under Home, a sheet over its screen, or scroll content passing under a fixed bar.
- **Not inset-caused**: play-live-computer's A and B games differ in the engine's replies (1...Nf6 / 1...Na6), so its
  A-only and B-only element lists (the opening name, the eval chip) are content, not geometry.

**Open for the ruling, not decided here.** lib.js describes 375x761 as "375x812 points less the 51px top inset". In B, the
51 is taken a second time inside that 761 by every env site. Which of A or B is his phone therefore depends on whether his
phone's 761 already excludes the inset. A device recording settles that, per CLAUDE.md, and this census cannot.

## Reproducing it

The scripts are in `claude/agents/inset-census-550/`. They were run from scratch copies. census.js hard-codes this
worktree's `gates/` path in `R`; change it to your checkout.

| script | md5 (first 12) | what it does |
|---|---|---|
| `envsites.js` | 06b8775431b7 | `node envsites.js chess.jsx` and `index.html` -> `envsites.tsv` |
| `census.js` | e3275dbb4d73 | `CT_APP=<bundle> CENSUS_MODE=A\|B CENSUS_OUT=census-<M>.json node census.js`, on bundle c3a2b2924fa3; screenshots `gates/shots/census-<M>-<state>.png` |
| `diff.js` | c480ffc7e047 | `node diff.js census-A.json census-B.json` -> per-state summary and `census-diff.json` |
| `detail.js` | 2a5d5120f8f3 | `node detail.js census-diff.json` -> `detail-output.txt` (moves grouped by dy, overlaps, band contents) |

`census-A.json` and `census-B.json` are the raw snapshots this table was read from.
