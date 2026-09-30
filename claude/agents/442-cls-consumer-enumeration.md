# #442 — every read of the DISPLAY grade, enumerated and classified

The job `the-sel-cls-split-migrated-selectors-but-not-every-label-consumer-2026-09-30` made the
enumeration its first work item, on the grounds that three defects sharing a cause make the cause
the finding [R09]. This file is that enumeration, written down because the alternative is one
paragraph in a commit message — and a sweep that lives in a commit message is re-done by the next
person who needs it.

**Measured on the #442 tree (`0463dce` plus this file), not read off #441's numbers.** `chess.jsx`
carries **55 reads of `.cls` across 25 lines**, and **12 reads of the selection grade** (`_selL`,
`_curSel`, `o.sel`, `.sel||classifyByLoss(...)`) across 12. Command, so this is re-runnable rather
than trusted:

    grep -o '\.cls\b' chess.jsx | wc -l          # 55
    grep -c '\.cls\b' chess.jsx                  # 25

Line numbers move with every edit — #433 recorded a citation that was 36 lines out — so each row
below is findable by its **subject**, and the line number is a convenience valid at `0463dce` only.

## The three categories, which are the whole point

`sel` is the old centipawn ladder (`classifyByLoss(loss)`). `cls` is #440's win-percentage label.
They are two strings of the same shape with different meanings, which is why a consumer can read the
wrong one and still compile, still render, and still pass a suite of 3097 assertions.

| category | what it does with the label | which ladder it wants |
|---|---|---|
| **DECISION** | branches on the label to decide whether some behaviour happens at all | **`sel`** — because the branch was calibrated against a centipawn band |
| **SENTENCE** | interpolates the label into text a player reads | whichever the surrounding claim is about; the two must not be mixed in one sentence |
| **DISPLAY** | shows the label, or a colour/count derived from it | **`cls`** — this is what the chip says, by definition |

## DECISION sites — 3 found, 3 fixed, 0 left

| where (subject) | line at 0463dce | was | is |
|---|---|---|---|
| the **Great** overlay ("the only move that keeps it") | 3700 | `cls.label` in {Best, Excellent} | `_selL` in {Best, Excellent} |
| the **Miss** overlay | 3701 | `cls.label` in {Mistake, Blunder} | `_selL` in {Mistake, Blunder} |
| **`_wasBest`** — "was the played move the engine's move", which gates the play-it-out button | 6353 | `cls.label` in {Brilliant, Great, Best, Excellent} | Brilliant/Great from `cls` (both are overlays cls owns), Best/Excellent from `_curSel` |

## SENTENCE sites — 2, one fixed and one deliberately left

| where | line | verdict |
|---|---|---|
| the **drill capture**'s stored `label`, interpolated at `puzzleFromMistake` as `"you played <san> here, a <label>."` | 3777 (store), 4861 (use) | **FIXED.** Stores `_S` — the same expression the pool filter two lines above selects on — so the card can only say "a mistake" or "a blunder". The article now comes from `artic()`, because `ct_mymistakes` survives a build and an older store can still hold `Inaccuracy`. |
| **`explainAnno`**'s size-and-cost pair: `A small slip.` from the label, `About 6.4 pawns of advantage gone.` from `loss` | 986, 1063–1064 | **NOT FIXED, and this is instance 3.** The adjective is on the win-percentage ladder and the figure is in centipawns, in one sentence. Making them one ladder is a copy decision — either the cost clause moves to win-percentage (new copy) or it is qualified — and guessing it inside a P0 fix is how an amber call goes unrecorded. Left with the reason. |

## DISPLAY sites — 20 lines, all correct on `cls`, and TWO repair themselves

The remaining 20 lines read `cls` to show something, and showing the display label is what `cls` is
for: the grade chip in both layouts (6371, 6492), the `?!`/`??` glyph, the per-grade counts and the
summary panel's ten rows (3751, 3754, 3822, 6010, 6043), the tap-to-jump handlers (3844, 3846,
6043), the move strip's colouring (7393), the eval-graph dots and marks (1827, 7489), the square
tint under the current ply (7538), the key-moments list (6079–6089), the brilliancy chime (4861),
and `explainAnno`'s own branch selection (986) — that last one correctly, because the explanation
sits beside the chip and has to be about the label the chip shows.

**Two of the 20 looked like DECISION sites and needed no patch, and that is the test that the fix is
structural rather than three patches wearing a comment:**

- the **hanging-piece detector** (1205) skips a ply when the label is Brilliant or Great;
- the **`pv` continuation** (3716) draws a demonstration line for Brilliant/Great/Best/Excellent.

Both would have been wrong for the same reason the overlays were — except that **Great can now only
fire when `_selL` is Best or Excellent**, so both agree with the selection ladder by construction.
Fixing the definition fixed its consumers. Had the three instances been patched individually, these
two would still be wrong and nothing would have pointed at them.

## What this enumeration does NOT establish

It is a **reading of the source**, and this project's first rule is measure, do not read. What is
measured is the three DECISION sites' effect: `gates/regress/67-sel-cls-consumers.js` D1 walks all 30
plies of a real lost game through the DOM and reads 2 contradictions on the pre-fix bundle and 0 on
the fix. The 20 DISPLAY verdicts are **asserted by nothing** — they are an argument that they are
already right, not evidence. If one of them is wrong, this file is where the error will be, and the
next person should distrust the table and re-read the site rather than distrust the gate.
