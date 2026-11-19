# Review sentences, old and new (batch 13)

For Kunal's look. Job: `jobs/review-sentences-name-what-the-moves-do-2026-11-12`, the remainder after batch 10
(docs/hint-audit-2026-11-12 HEX-R-02, -06, -07, -08, and the residuals A2, A3, A6, B6, B7 named by the pair that read
docs/review-text-design-2026-11-14). Story US-R163, cases TC-R234a to TC-R234n, gate 169.

Every OLD line below was produced by the chess.jsx this work started from (commit 3d1a988b, md5 `3bea9d949937`) and every NEW
line by this work's chess.jsx, on the same position, through the app's own `reviewText`, `explainLine` and `coachWorst`
(`gates/regress/169-review-sentences-name-moves.js`, node lines; the old column is that gate run with `CT_SRC` on the old
file). Lines marked "on screen" were also read off the Review screen at 375x761 and at 320x568 after stepping to the move.
A pasted game has no player colour, so the screen lines read "White" and "Black"; in your own games they read "you" and
"your opponent".

## 1. A good move that does something the board proves (HEX-R-02)

| Move | Old | New |
|---|---|---|
| 12...Ne4, Best (`r2qr1k1/ppp2ppp/2n1pn2/3pP3/3P4/2PQ1N2/PP1B1PPP/R3R1K1 b`) | The best move. | The best move. It moves your knight away from their pawn on e5. |
| 25.Qg3, Good (`r4rk1/6pp/2p1p3/P2qB3/1P1P4/2PQ4/5PPP/R5K1 w`) | Fine. It backs up your bishop on e5. 25.c4 was a little stronger. You are winning. | Fine. It threatens 26.Qxg7 mate, and backs up your bishop on e5. 25.c4 was a little stronger. You are winning. |
| 30.Qe4, Best (`5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w`) | The best move. It backs up your pawn on g2. You are winning. | The best move. It threatens 31.Qxh7 mate. You are winning. |
| 20...Qe5, Best (`4q1k1/5ppp/8/8/6n1/8/5PPP/5RK1 b`) | The best move. It backs up your pawn on g7. You are losing. | The best move. It threatens 21...Qxh2 mate. You are losing. |
| Opera Game 6...Nf6, as a Best move | The best move. It brings a knight out, and backs up your bishop on f8. | The best move. It stops 7.Qxf7 mate, and brings a knight out. |
| 30.h3, Best (`4r1k1/R4ppp/8/8/8/8/5PPP/6K1 w`) | The best move. | The best move. It stops ...Re1 mate. |
| Opera Game 6.Bc4, Excellent (on screen) | White's good move. It brings a bishop out, and backs up White's pawn on a2. White is a little better. | White's good move. It threatens 7.Qxf7 mate, and brings a bishop out. White is a little better. |
| Alekhine Defense 2...Nd5, Book (on screen) | An opening move (Alekhine Defense). It backs up Black's pawn on c7. | An opening move (Alekhine Defense). It moves Black's knight away from White's pawn on e5. |

The three readings: the move takes a piece away from an attacker that was winning it; it threatens a mate in one that was
not there before (the mating move is named with its number); it stops a mate in one the opponent had. Each is said only
when neither side is in check and the piece cannot be won on the square it goes to. The audit's third reading, a pawn
defended ("2...d6 backs up your pawn on e5"), was already in place.

## 2. "Backs up" and "lets a bishop out" said of nothing (residual A3)

| Move | Old | New |
|---|---|---|
| 3.Ke2 out of the check from b4 (`rnbqk1nr/pppp1ppp/8/4p3/1b1PP3/8/PPP2PPP/RNBQKBNR w`) | Fine. It backs up your bishop on f1, and lets your c1 bishop out. | Fine. |
| Alekhine Defense 3...Nb6 | The best move. It moves your knight out of danger, and backs up your rook on a8. | The best move. It moves your knight away from their pawn on c4. |
| the same move on screen | Black's best move. It moves Black's knight out of danger, and backs up Black's rook on a8. White is a little better. | Black's best move. It moves Black's knight away from White's pawn on c4. White is a little better. |
| 3.c3 in the same check (unchanged) | The best move. It attacks their bishop, so it has to move, and backs up your pawn on d4. | the same |
| 4.e3, the design's F8 (unchanged) | A good move. It backs up your pawn on d4, and lets your f1 bishop out. | the same |

"Backs up" is now said only of a piece the opponent attacks after the move (the old lines above also show "backs up White's pawn on a2" and "Black's pawn on c7", pawns nothing attacked). "Lets your bishop out" is not read when the
move answers a check (in a check every piece that cannot answer it has no legal move, so any answer "let it out").

## 3. The only legal move (residual A2)

| Move | Old | New |
|---|---|---|
| 30.Rxe1 (`6k1/5ppp/8/8/8/8/6PP/R3r2K w`) | Your only legal move: it blocks the check. | Your only legal move: it takes the rook that gives check. |
| 30.Kxg1 (`6k1/5ppp/8/8/8/8/7P/6rK w`) | Your only legal move: the king steps out of check. | Your only legal move: the king takes the rook that gives check. |
| 7.Kxf2 after 6...Qxf2+ (on screen) | The only legal move: the king steps out of check. White is winning. | The only legal move: the king takes the queen that gives check. White is winning. |
| 30.Bf1 (a block, unchanged) | Your only legal move: it blocks the check. | the same |

## 4. The last move of a game (residual A6)

| Move | Old | New |
|---|---|---|
| A small slip with no reply to look at | A small slip. Nothing is lost at once. | A small slip. |
| The same slip with the reply in hand (unchanged) | A small slip. Nothing is lost at once, but your opponent's best reply is the pawn move ...e5. | the same |

## 5. A sacrifice that forces mate (HEX-R-06)

| Move | Old | New |
|---|---|---|
| Opera Game 16.Qb8+, as the move lands (on screen) | White gives up the queen on b8. | White gives up the queen on b8. It is mate in two: 16.Qb8+ Nxb8 17.Rd8 mate. |
| the same, once the search has landed | White gives up the queen on b8. If ...Nxb8, 17.Rd8 mate. | White gives up the queen on b8. It is mate in two: 16.Qb8+ Nxb8 17.Rd8 mate. |
| 30...Qf1+ (`5rk1/r6p/2p1p1p1/P3B3/1P1P4/2P4Q/5qPP/2R4K b`), the clause after what was given up | nothing, then once the search landed: If 31.Rxf1, Rxf1 mate. | It is mate in two: 30...Qf1+ 31.Rxf1 Rxf1 mate. |
| Opera Game 10.Nxb5 (not a mate; only the check sign changed) | White gives up the knight for a pawn. If ...cxb5, 11.Bxb5. | White gives up the knight for a pawn. If ...cxb5, 11.Bxb5+. |

The mate is read from the board (every reply is answered by a mate in one), so it is printed at once and the sentence no
longer changes a second or two after you arrive. When the defender has several replies it reads "It forces mate in two."

## 6. Checks keep their sign (residual B6)

| Where | Old | New |
|---|---|---|
| Opera Game 15...Nxd7 (on screen) | Black's blunder. It allows mate in two: 16.Qb8 Nxb8 17.Rd8 mate. | Black's blunder. It allows mate in two: 16.Qb8+ Nxb8 17.Rd8 mate. |
| Opera Game 10...cxb5 (on screen) | Black's small slip. White's best reply is the bishop move 11.Bxb5. | Black's small slip. White's best reply is the bishop move 11.Bxb5+. |

The mate mark is still dropped and said as the word "mate". The design's rule P5 said both marks are dropped; its own
examples print "16.Qb8+", and without the sign the forced reply after a check has no cause on the page.

## 7. The why button's words (residual B7)

| Where | Old | New |
|---|---|---|
| the why button on 1.e4 (on screen) | E4 stakes out the center; Nc6 develops the knight. | e4 stakes out the center; Nc6 develops the knight. |

## 8. The engine line in words, the ? sheet (HEX-R-08)

| Line | Old | New |
|---|---|---|
| 8.Qxb7 Qb4+ 9.Qxb4 Bxb4+ | wins the pawn / gives check / trades the queens off / **wins the queen, with check** | wins the pawn / gives check / trades the queens off / **takes back on b4, so the queens are traded, with check** |
| 16.Qb8+ Ke7 17.Qxe5+ | **hits the pawn on a7, with check** / *(no words)* / wins the pawn, with check | **gives check** / **steps out of check** / wins the pawn, with check |
| 29...Qf1+ 30.Rxf1 Rxf1# | gives check / wins the queen / mates | gives check / wins the queen, **the only legal move** / mates |

The same slip was in the line under the board: a capture that takes back on a square the move before only landed on
(8...Qb4+ 9.Qxb4 Bxb4+) read "It wins their queen"; it now reads "It takes the queen back, so material is even". A row
that had no words also gets the three readings of section 1 where the board proves one.

## 9. The summary: Coach's take (HEX-R-07)

| Game | Old | New |
|---|---|---|
| Opera Game (on screen) | Most trouble came in the middlegame. The toughest moment was Nxd7 (a game-deciding swing). | Most trouble came in the middlegame. The toughest moment was 15...Nxd7 (a game-deciding swing). It allows mate in two: 16.Qb8+ Nxb8 17.Rd8 mate. |
| the 13-move Alekhine game (on screen) | Most trouble came in the opening. The toughest moment was Qxf2+ (about 5.1 pawns). | Most trouble came in the opening. The toughest moment was 6...Qxf2+ (about 5.1 pawns). Black's queen takes a pawn but can be taken straight back: 7.Kxf2. A queen for a pawn. |

The reason is the Review line's own (the same board checks), so the summary and the move screen say the same thing about
that move. Where no reason can be proved the line keeps the move, now with its number, and the size.

## Not changed here

- HEX-R-05, the "best line" row after tapping best: still the moves only.
- HEX-R-09, the analysis board: still no sentence about the move just tried.
- HEX-R-07, the rest: the toughest moment is not a button, and the speech bubble still says "below" in four of its six
  sentences (the count tiles under it do jump to the moves; the key moments list is still switched off).
- HEX-R-14 has no text of its own: the star lands on the sentences above.
- HEX-R-03 was already in place (batch 10, b5f67e3): 5.Qxf3 "takes back on f3: a bishop for a knight".
