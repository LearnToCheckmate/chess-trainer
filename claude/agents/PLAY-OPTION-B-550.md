# Play: today's layout against Option B, for the comparison he asked for (#550)

For decision `q-play-buttons-now` ("HOLD - you should show what chess.com has so i can compare") and
jobs/a-streamlined-board-view-like-chesscoms-2026-11-11, whose Option B (a21) is built on Review only.
**These are pictures. Nothing here is on the branch.** Option B is a trial bundle that only reorders the
screen: the move list goes straight under the board and the button row goes to the foot of the screen.

Measured in headless Chromium at his phone, 375x761 (kunal761). Bundles: today's layout `1d2962b8a991`
(tree bc88759); Option B trial `a6b670fdeac5` (the same bundle plus the reorder, never committed).
The vs-computer game is 1.e4 Nc6 2.Nf3 3.Bc4 4.d3 against Pip, with Pip's replies. The Pass & Play game is the
18-ply `pp-captures` game.

## The pictures

| | vs the computer | Pass & Play |
|---|---|---|
| today | `shots/550-playB-current-cpu-375x761.png` | `shots/550-playB-current-pp-375x761.png` |
| Option B | `shots/550-playB-optionB-cpu-375x761.png` | `shots/550-playB-optionB-pp-375x761.png` |
| chess.com | not in this repository (see below) | |

## What moves (px from the top of the screen, 761 tall)

| row | vs computer, today | vs computer, B | Pass & Play, today | Pass & Play, B |
|---|---|---|---|---|
| top row (Home, opening, menu) | 2-46 | 2-46 | 2-46 | 2-46 |
| opponent's bar | 52-116.5 | same | 52-118.5 | same |
| eval bar | 118.5-135.5 | same | none | none |
| board | 140.5-515.5, 375 wide | same | 120.5-495.5, 375 wide | same |
| your bar | 517.5-582 | same | 497.5-564 | same |
| button row (Moves, Back, Forward, Hint, Flip, More) | 587-638 | **695-746** | 590-641 | **702-753** |
| move list | 655-753 | **592-690** | 651-753 | **574-676** |
| empty at the foot | 8 | 15 | 8 | 8 |

The board does not change: 375 wide at the same height in both layouts. Only the button row and the move list
trade places. In the Pass & Play picture of B, the "vs Human · no clock" line sits between the list and the
buttons. That is a by-product of the trial's reorder, not a design choice.

## The chess.com picture

BENCHMARK-REFERENCE.md is not in this repository and not in any ref of it. Its rows (`bots-04-game-start.jpg`
for the play screen, captured 2026-09-14 at desktop 1536x674) live in the claude.ai project, which
a Claude Code session cannot read. So the third column has to come from there, or from his own screenshot
of 11 Nov (jobs/a-streamlined-board-view-like-chesscoms-2026-11-11, kunalWords). That screenshot shows, top to
bottom: the move strip, the opponent's bar with its clock, the board edge to edge, his bar with its clock, and
a bottom toolbar (Options, Chat, a review button, Back, Forward). Option B matches that order except
the move strip, which chess.com puts at the top (Option A on Review).
