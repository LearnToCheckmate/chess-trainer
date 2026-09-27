# Chess Trainer test cases

> **Ids here are the REPO suite.** `TC-Rnn` and `US-Rnn` in this file mean the gate-executed Review
> suite and nothing else. A different 30-story / 31-case suite in the claude.ai project uses the same prefix for
> different cases, so a bare "TC-R05" is ambiguous outside this file. See `claude/stories/README.md`, the id-space
> register, before quoting an id anywhere else.

One case per acceptance criterion in USER-STORIES.md. Each case names the gate that executes it and the
build it was last executed against; a case with no gate is not a case, it is a wish. Results are copied
from gates/logs/<N>-all.log by the SAT pass, never typed from memory.

Columns: id · story · steps · expected (measured) · executed by · last result.

---

## Review - executed against #373 (gates/regress/20-review.js and 21-review-brilliant.js; log gates/logs/373-all.log, copied to claude/agents/gatelogs/373-all.log) - SAT copied 2026-09-12 23:4x ET from that log

| id | story | steps (harness) | expected, measured | executed by | last result |
|---|---|---|---|---|---|
| TC-R01 | US-R01 | Home → Review tile → paste the Opera Game PGN → "⚡ Analyze Game" → wait for the summary | summary reached in < 90 s; rev-summary visible; b.errs empty | 20-review.js `import` | PASS #373: 4 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R02 | US-R01, US-R11 | reload, paste the same PGN, Analyze again | summary in < 8 s; the ten verdict counts identical to the first run | 20-review.js `cache` | PASS #373: 4 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R03 | US-R02 | seed ct_accts + ct_acctgames with two accounts (one long-named game), open Review, reload | two account chips with counts; rows name both players; survive the reload | 20-review.js `accounts` | PASS #373: 4 PASS lines, 0 FAIL (kunal only; gates/logs/373-all.log) |
| TC-R04 | US-R03 | on the summary at 375x679 and 390x844 | accuracy and the eight verdict categories for both sides present; rev-summary-foot inside the viewport (bottom ≤ vh); body scrolls under it | 20-review.js `summary` | PASS #373: 4 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R05 | US-R03 | tap a Skills number that has moves (Morphy's rooks to open files) | the move screen opens at that ply (14.Rd1, ply 27) | 20-review.js `skills-jump` | PASS #373: 4 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R06 | US-R04 | Start review, First move; measure at ply 0, ply 10, ply 19 (10.Nxb5!!), last ply | board 349 at 375x679; one top and one width across the four plies; over ≤ 0; docScroll 0 | 20-review.js `plies` | PASS #373: 5 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R07 | US-R04 | at 16.Qb8+ / 17.Rd8# (badges on rank 8) | every round verdict badge's rect is inside the board rect (open A-09: a FAIL here is the audit finding, not a harness bug) | 20-review.js `badges`; the LABEL (not round) by 31-antagonist373.js from #374 | PASS #373: 4 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R08 | US-R05 | at a Blunder ply and at a Best ply | move line shows verdict text; rev-best present on the blunder, absent on the best; rev-why has 1-3 lines; strip chips carry a colour for Brilliant/Great as well as Blunder | 20-review.js `verdicts` | PASS #373: 8 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R09 | US-R05, US-R08 | at the last ply (17.Rd8#); then the ⋯ sheet → Analyze with the engine | eval label reads 1-0; eval-bar-num present; the number changed between ply 0 and the last ply; with the engine line on the label still reads 1-0 (N-review-2) | 20-review.js `mate-label` | PASS #373: 4 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R10 | US-R06 | at 10.Nxb5!! | rev-why text names the sacrifice and a forcing line ("If cxb5" or "Bxb5+"); rev-playout exists; tapping it moves a piece within 3 s; b.errs empty (the one allowed engine trap by exact text, #356) | 21-review-brilliant.js | PASS #373: 6 PASS lines, 0 FAIL (kunal only; gates/logs/373-all.log) |
| TC-R11 | US-R07 | tap rev-fab at ply 10; play e.g. h2-h3, a7-a6; Undo; Exit | fab is 42x42 in the board's bottom-right; the analysis board accepts two moves; Undo reverts one; after Exit the board width equals the review board width | 20-review.js `analysis-board` | PASS #373: 10 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R12 | US-R08 | store ct_evalgraph '1'; open the review | eval-graph present in pbar-bottom; bar height and board width equal to the graph-off run; tapping the graph changes the ply | 20-review.js `graph` | PASS #373: 6 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R13 | US-R09 | rev-back; Back to games; rev-more; close the sheet | summary then list reached; sheet opens and closes; board width unchanged after the sheet; b.errs empty | 20-review.js `nav` | PASS #373: 8 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |
| TC-R14 | US-R10 | import a PGN with WhiteElo/BlackElo and long names; and one without ratings | pbar-rating-w/-b present with the header values; absent without headers; each pbar's name span has scrollWidth ≤ clientWidth+1 (ellipsis, no overflow); pbar heights equal across plies | 20-review.js `players` | PASS #373: 6 PASS lines, 0 FAIL (kunal + 390; gates/logs/373-all.log) |

Not executed (needs a device): flags (y13), own photo (n9), phone-side analysis budget.

---

## Cross-app invariants - executed against #423 (gates/regress/26-invariants.js; log gates/logs/423-all.log, copied to claude/agents/gatelogs/423-all.log)

Population, stated once because every count below depends on it: a control is button, input, select, textarea,
[role=button], a[href], [onclick], or an element whose computed `cursor` is `pointer` - and cursor is INHERITED,
so an element in the SVG namespace and any control that has a control ancestor are both excluded and both
counted. React attaches click handlers at the root, so a div with onClick and no cursor:pointer is NOT covered;
that is a stated hole. The board is excluded by mechanism (the widest div whose inline gridTemplateColumns
matches `repeat(8,`) because its squares take taps and its pieces are drawn inside transform:scale(1.06).
Geometries: 320x568, 375x730, 375x568. Twelve screens, listed in the gate's SCREENS table.

| id | story | steps (harness) | expected, measured | executed by | last result |
|---|---|---|---|---|---|
| TC-INV-02a | US-INV-02 | at each of 12 screens x 3 geometries, enumerate control rows and compare glyph heights within each row | every row whose members' glyph heights spread more than 1.05px is a pinned known failure; unpinned spread is a FAIL. Measured: 44 rows at 375x730, 36 at 320x568, 38 at 375x568; 6 spread classes, all pinned | 26-invariants.js `inv2` | PASS #423: 0 unpinned spreads, 3 geometries (gates/logs/423-all.log) |
| TC-INV-02b | US-INV-02 | the same sweep, against the pin table | each pinned row's sorted glyph heights equal the #422 measurement within 0.6px. pbar-top [21,28]; lesson footer [22,22,22,27,27]; CHESS TRAINER+hamburger [17,21.6] at 375-wide and [17,20.7] at 320; pz-bottom [16,16,16,20,20]; home greeting [22,25]; lesson practice [16,18,18,18] | 26-invariants.js `inv2-pins` | PASS #423. NEGATIVE CONTROL NC-B (`rev-more` fontSize 19 -> 23, md5 cb195701c545): 6 red, 5 of them this assertion, one per review screen |
| TC-INV-02c | US-INV-02 | compare the set of (geometry, screen) pairs where each pinned class was found against the set it was measured in | exactly equal; a vanished pin and a pin on a new screen are both FAIL | 26-invariants.js `inv2-pinset` | PASS #423. NEGATIVE CONTROL NC-A (`rev-back` fontSize 25 -> 19, making pbar-top uniform, md5 854e6d33b244): 1 red, this assertion, naming all 5 states the pin vanished from |
| TC-INV-02d | US-INV-02 | assert the population, not only the result | rows >= 30 and controls >= 150 per geometry sweep; both exclusions must still have excluded something | 26-invariants.js `inv2-population` | PASS #423: 44/36/38 rows, 150+ controls per geometry; nested and svg-internal exclusions both non-zero |
| TC-INV-03 | US-INV-03 | union the distinct ICON glyph heights (svg box, or a one-grapheme text node) over the 12 screens, per geometry | the set equals the #423 measurement exactly: 375x730 and 375x568 [17,18,19,20,21,21.6,22,24,25,27,28]; 320x568 [16,17,18,19,20,20.7,21,22,24,25,27,28] | 26-invariants.js `inv3` | PASS #423. NEGATIVE CONTROLS NC-B and NC-D (`rev-more` to 23 and to 31): red, naming the added height 26 and 35 respectively |
| TC-INV-01 | US-INV-01 | the same sweep, reporting controls under 44x44 | REPORTED, NOT ASSERTED. 90 distinct undersized controls on 8cd81ec | 26-invariants.js, `invariant 1` notes | not a pass/fail case at #423; `jobs/invariant-1-tap-targets` |

Negative-control scope, published with the counts because a count with no scope cannot be checked (#411/#412):
every control above was run as
`CT_INV_GEOS=kunal730 CT_APP=<trial bundle> node gates/regress/26-invariants.js`
— ONE geometry of three, 88 assertions. The shipped bundle at that same scope is 88 pass / 0 fail, which is the
baseline the control counts are differences from. At all three geometries the shipped bundle is 266 pass / 0 fail.
NC-D is not an independent control: it triggers the same two assertions as NC-B, more strongly. So three distinct
control outcomes, not four.
