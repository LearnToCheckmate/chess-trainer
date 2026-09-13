# Chess Trainer test cases

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
