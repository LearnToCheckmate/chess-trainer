# UAT pack

Kunal's charter (2026-09-12 19:39 ET): UAT is not a tap list. The agent authors a Preview gallery card that plays
the whole journey itself; Kunal screen-records it and uploads one clip; the agent verifies from the frames.
Captions name the item id at each checkpoint and hold at least 2 s. Where the sandbox and the recording disagree,
the recording wins.

How to record (any card, or all of them): Home → 🎬 → start the iPhone screen recording (Control Center) → tap
"▶ Play all N (screen-record this)" or one card → put the phone down → stop when the green RECORDING COMPLETE
frame shows (Play all) or when the caption strip disappears (one card) → upload the clip.

## Batch #373 - the Review screen (stories US-R01..US-R11)

Gallery card 6, "US-R · The Review journey". One card, 88 seconds, seven checkpoints. The Opera Game (Morphy vs
Duke Karl / Count Isouard, 1858) is imported from a PGN and analysed on the phone, then the card walks the review.

| at | caption id | what must be true in the frame | story |
|---|---|---|---|
| 0 s | US-R01 | the Review screen shows the PGN box with the game pasted, then the analysis progress | US-R01 |
| 52 s | US-R03 | the summary: an accuracy figure per side, the ten categories with a number per side, the Skills panel below, the footer (Back to games · Start review) pinned at the bottom | US-R03 |
| 58 s | US-R04 | the move screen at the first move: the board runs to the right edge, the eval bar is on its left, nothing is cut off at the bottom | US-R04 |
| 64 s | US-R06 | 10.Nxb5!! with the Brilliant badge; the reason under the move names the sacrifice and the forcing line (cxb5 / Bxb5+) and the next-best comparison | US-R06 |
| 70 s | k12 | 17.Rd8#: the label beside the board reads 1-0 and the bar is white; the badge on d8 is whole (not clipped by the top edge) | US-R05, A-09 |
| 76 s | US-R07 | the analysis board: the round button has opened it, the row reads ↶ Undo · ✕ Exit analysis | US-R07 |
| 82 s | US-R09 | Exit analysis, then the summary again | US-R09 |

Verification from the clip (what I check frame by frame): the board's left and right edges against the screen
at 58 s; the badge at 70 s whole; the caption strip never covering the board; the three-line reason at 64 s not
clipped; the bar height the same at 58 s, 64 s and 70 s.

Not in this card (needs your phone in the real network): flags and ratings from a chess.com fetch (y13), your own
photo on your own game (n9), the analysis wall-clock on the phone (#347).

Sandbox execution of this card: gates/regress/14-uat-review-card.js runs it at your geometry and asserts every
row above; its PASS lines are in gates/logs/373-all.log.

## Still in the gallery from #371/#372 (not yet recorded)

Cards 1-5, 7, 8: k10 game over, k8 four plies in, k11 demo end, k11 practice, A-06 hint, y3 Layout readout, y3
Home. The k12 card (17.Rd8# = 1-0) is folded into card 6 above as its 70 s checkpoint.
