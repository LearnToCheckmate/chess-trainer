# #473 — the `isOver` class sweep [R06, R07]

**THE DECISION BEING SWEPT:** does this site want *is the GAME finished* or *is the PREVIEWED position
terminal*? `isOver` (chess.jsx:2951 on main) answers the second, because `status` reads `boardGame` =
`playHist[pvIdx]`. #437 added `_gameOver` for the first and moved four sites; #473 adds `_gameTermStatus`
(the terminal KIND, which a boolean cannot carry) and moves four more.

**THIS FILE EXISTS BECAUSE ANTAGONIST A ASKED FOR IT, AND IT CORRECTS THE SWEEP IT REPLACES.** The first
version lived in `gates/.m473/`, an untracked directory the commit did not carry, while the build's own
claims document cited it as the evidence for the classification. A ran `ls`, got *No such file or
directory*, and called it the #450 lesson exactly: a finding that lives only in a container dies with it.

## THE COUNT — WITHDRAWN AND RE-MEASURED [R18, R07]

This build first published "`isOver` appears **32 times** in chess.jsx on main; most are comments", and
then "33 lines mention it, 21 prose, 11 code". **Both are LINE counts published as occurrence counts.**
Antagonist A measured it properly on `git show 51b5668:chess.jsx`:

```
lines containing isOver ........ 32      <- what "32" actually was
OCCURRENCES of isOver .......... 39      <- the real figure
  in CODE (comments stripped) .. 16
  in COMMENTS .................. 23      (59%, so "most are comments" survives)
code LINES ..................... 12
```

Code lines: `2951 2994 3102 4738 4744 5942 6258 6269 6971 7614(x5) 7739 7754`.

**Why the seven-occurrence gap is not pedantry:** a sweep is a per-SITE exercise, and line **7614** alone
carries **five** occurrences of `isOver` and was counted once. CLAUDE.md, #411/#412: *a count with no scope
cannot be checked — publish the command with the count.* The command is
`git show 51b5668:chess.jsx | grep -o isOver | wc -l` for occurrences and `| grep -c isOver` for lines,
and those two numbers are 39 and 32.

## THE 12 DECISION SITES — 4 changed, 2 defective, 2 dead, 3 correct-as-is, 1 not a question

Pre-fix line numbers (post-fix in brackets). **Every verdict marked MEASURED was DRIVEN by antagonist A
with a browser, not read.** The verdicts marked READ were mine and two of them were wrong.

| line | site | verdict |
|---|---|---|
| 2951 | `const isOver=` | the definition. Not a site. |
| 2994 [3016] | `_resultKey` | **CHANGED.** Drove the result card's fade timers. Ply-keyed, Back reset them and Forward RESTARTED them, re-opening a card the player had already watched fade. Measured on #471: `cardAfterFwd "Checkmate!Black wins"`. **Not named in the job — found by this sweep.** |
| 4738 [4767] | `turnTxt` | **LEFT: DEAD VARIABLE**, documented at :4765, filed as `dead-turntxt-2026-09-17`. |
| 4744 [4766] | `gameResult` | **CHANGED.** Whether a result EXISTS. **The site the job's prescribed fix misses**, which is why that fix measures identically to the defect. |
| 3102 [3131] | the fit loop's dependency array | **LEFT: not a question, a dependency.** `playEnd` is already in it. |
| 5942 [5971] | header 🏠 button | **LEFT: DEAD IN FACT, and MY READING OF THIS WAS WRONG.** I classified it "LIVE, same class" from the source. A DROVE it: the parent row is guarded `!(mode==='play'&&!playSetup&&opponent)` while the button itself requires exactly that conjunction, so the two are **mutually exclusive and it cannot render in any play state**. Measured in a live portrait Pass & Play game, where its own condition holds: **zero** `button[title="Home"]` carrying 🏠 exists; the only one present is `play-home` (⌂, from :7779). Unreachable code with no row in CLAUDE.md's expiry table. |
| 6258 [6287] | the status row's `_done` | **CHANGED.** The site the job was filed about. |
| 6269 [6298] | the clock row's `active` | **LEFT: DEAD CODE.** The whole block is `{false&&mode==='play'&&…}` at :6297 — one of the five `{false&&…}` blocks CLAUDE.md records as a QUESTION for Kunal (OPEN-QUESTIONS Q5), not a build. |
| **6971 [7000]** | the wide strength chip and its ± buttons | **LEFT: A LIVE DEFECT, MEASURED BY A, AND I MISSED IT ENTIRELY.** I recorded this as "#437 left it on `isOver` deliberately" and stopped there. `!(opponent&&!isOver&&!playEnd)&&wide` is a row that exists ONLY once the game is over, so a step-back **deletes it**. Landscape 730x375, vs computer, real mate, 2-ply game so the moves panel stays mounted: `≈750 Elo` 64.8×15 at (326.6, 207.0), `−` 22×22 at (300,204), `+` 22×22 at (396,204) — **all three gone after one Back tap.** Board 216→216, so no board jump, but by CLAUDE.md's "a row that can appear must reserve its space" this is the #435 class. **PRE-EXISTING: identical on `40c8cdb1bcff`.** |
| **7754 [7783]** | the eval pill on the player bar | **LEFT: A LIVE DEFECT, MEASURED BY A — and the one site my reading got right.** `isTop&&_evalOn&&!inReview&&!isOver&&!playEnd`. `_evalOn` requires `opponent==='computer'` (:7732), which is why no Pass & Play input in the suite can ever see it. vs computer, real checkmate, `playEnd` null: pill **absent** at the mate, and after ONE Back tap it **relights** reading **`-M1`, 43.3×24 at (71.0, 47.4)** at 375x730 and at (30.0, 39.5) at 730x375, still there at +3.5s so not transient. A live engine evaluation saying "mate in 1" beside a slot reading `Checkmate! · You win! 🎉`. It also jogs the rating pill **x 200.5 → 251.8**, 51.3px. This is #437's own defect verbatim — `_myTurn` at :7758 carries the comment *"was `!isOver&&!playEnd`, which re-lit the turn highlight on a finished game the moment you stepped back"* — **eight lines above it.** **PRE-EXISTING: identical on `40c8cdb1bcff`.** |
| 7739 [7768] | `_livePlay` | **LEFT: the `isOver` arm is unreachable.** `(!wide||(!isOver&&!playEnd))`; its one consumer `_hbPlay` itself requires `!wide`, so the second arm is never read. The source says so at :7772-7774 and A confirmed by drive. |
| 7614 [7643] | `learn-play-position` `disabled={isOver}` | **LEFT: CORRECT AS IS**, and the comment at :7641 says why — this button plays FROM the position on the board, so "is the shown position terminal" is exactly its question. Holds **5 of the 16** code occurrences. |

`classSwept: {found: 12, fixed: 4, left: 8}` — of the 8 left, **2 are live defects**, 2 are dead code, 1 is
a dead variable, 1 is a dependency, 1 is an unreachable arm, 1 is correct as written.

## WHAT THIS SWEEP GOT WRONG, STATED PLAINLY

I classified the six "left" sites **by reading them and labelled that honestly as a reading**, and said in
terms that antagonist A had been handed the line numbers and told to drive them. That was the right
instinct and it still produced two wrong answers out of six: **5971 is dead, not live** (I called it live)
and **7000 is a live defect, not a deliberate #437 decision** (I called it deliberate, on the strength of
a comment at :6930 that is about a *different* half of that expression). The one I got right, 7783, I got
right for the right reason.

**The reusable part:** a reading is not a cheap measurement, it is a different instrument with its own
error rate, and here that rate was 2 in 6. The two residuals are filed as
`jobs/two-ply-keyed-play-chrome-residuals-measured-by-473s-antagonist-a-2026-10-03` with A's numbers, and
NOT as a `held-trees.tsv` row — A's own ruling, which I accept: they are pre-existing residuals on a tree
that strictly improves on them, and a hold row is for a tree that must not ship.
