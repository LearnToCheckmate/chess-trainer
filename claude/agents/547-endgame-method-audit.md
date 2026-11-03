# #547 item (114): endgame lessons, method audit

Job: `jobs/lessons-teach-the-finish-not-the-method-2026-09-24`, work item 1. That item asks for the audit to be reported before anything is proposed. The test used is the job's own `theBetterAuditPredicate_2026-09-24`: state each lesson's governing idea, then say whether its opening position comes before or after that decision.

**Measured from `lessons.js` on HEAD.** The count is 20: the 16 lessons in `window.CTLESSONS.ENDGAMES` plus the 4 from `MORE` whose `cat` is "♚ Endgames & Theory". "Plies" is the length of `line`.

## The SMALL fix is already met

The job's SMALL fix asks for three to five sentences of plan, shown before the run and reachable during it. All 20 lessons carry two such fields:
- `idea`, the plan in plain words;
- `plans`, the procedure.

Where they appear in the app:
- **Before the run:** `chess.jsx` renders `learnIdea` and then `learnPlans` in the intro card, which opens on entering a lesson (`setIntroCard(true)` in the lesson opener).
- **During the run:** the same card reopens from the info button in the lesson header.

No new `method` field is needed, so no content was written by this item.

A side finding on that button: its title reads "About this opening" on every lesson, endgames included. That is a wording slip, not part of this job.

## The table

| lesson | plies | governing idea | opening position is | 
|---|---|---|---|
| King & Queen Mate | 3 | box the king to the edge with the queen a knight's move away, then bring the king | **AFTER**: the king is already on the edge (f8), boxed |
| Two-Rook Checkmate | 7 | the ladder: one rook checks, the other fences the next rank | before: the king starts on d5 and the ladder is shown |
| King & Rook Mate | 3 | your king takes squares, the rook drives the king to the edge | **AFTER**: the king is already in the corner (h8) |
| Two Bishops Mate | 3 | bishops side by side as a moving wall, herding the king to a corner | **AFTER**: the king is already in the corner (g8) |
| Smothered Mate | 3 | pattern (Philidor's Legacy) | pattern lesson; the format fits |
| Back-Rank Mate | 1 | pattern | pattern lesson; the format fits |
| King & Pawn: the 6th Rank | 9 | the king must lead, in front of the pawn; opposition decides | **AFTER**: the king is already in front, on the 6th (Kunal's second instance) |
| Square of the Pawn | 5 | geometry rule for a race | a concept shown on an example; the format fits |
| Rook & Knight Mate | 3 | knight and king take the flight squares, the rook mates on the edge | **AFTER**: the king is already cornered |
| Lucena Position | 13 | build the bridge | before: it starts at the Lucena position and the bridge is played |
| Philidor Position | 7 | third-rank defence, then checks from behind | at the decision: the switch happens inside the line |
| Anastasia's Mate | 5 | pattern | pattern lesson; the format fits |
| Boden's Mate | 3 | pattern | pattern lesson; the format fits |
| Queen vs Pawn (on the 7th) | 11 | check the king in front of its pawn to gain tempi | before: the tempo-gaining checks are the line |
| Bishop & Knight Mate | 5 | drive the king to the bishop's-colour corner (the W manoeuvre) | **AFTER**: the king is already in that corner; its own `plans` says "this shows the finish" |
| Rook vs Pawn | 3 | stop the pawn with the rook, bring the king | late: the king is already on d4, two moves from the pawn |
| Arabian Mate | 1 | pattern | pattern lesson; the format fits |
| Epaulette Mate | 1 | pattern | pattern lesson; the format fits |
| Dovetail Mate | 1 | pattern | pattern lesson; the format fits |
| Fool's Mate | 4 | a warning about f- and g-pawn pushes | not a technique |

## What the table says

Six technique lessons open after their governing idea: King & Queen, King & Rook, Two Bishops, King & Pawn, Rook & Knight, and Bishop & Knight. Rook vs Pawn is a borderline seventh. That matches Kunal's "all-six" answer on `questions/q-seven-lessons-start-too-late`, which this build carries as item (117). Earlier starting positions are therefore the route he has already chosen, so this item proposes nothing new.

Two things still belong to him:
- **Work item 3**, the MEDIUM size for Two Bishops: the engine defending freely, judged by a progress test rather than a matched move. The job itself says that is "for Kunal to judge before it is applied anywhere else".
- **The defender's choices:** `questions/endgame-lessons-should-the-defender-choose-2026-10-10`, answered "one-first", item (91).

Every position judgment above is a reading of the FEN and the line, made by this build. None comes from an engine.
