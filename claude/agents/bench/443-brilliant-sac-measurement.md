# #443 — the brilliancy sacrifice measurement

**Run** `build__1790821185953`, 2026-10-01. **Job**
`brilliant-gate-cannot-fire-on-a-non-sacrifice-only-move-2026-09-30`, taken under its
`KUNAL_NAMED_THIS_AS_THE_NEXT_BUILD_2026-10-01` field rather than under the priority sort.
**chess.jsx md5 `6329bd09816b`** (= `origin/main` 364f700, #439). **Nothing shipped to the app.**

> **THIS DOCUMENT WAS REWRITTEN AFTER ANTAGONIST A VETOED ITS FIRST VERSION, AND THE VETO WAS RIGHT
> ON ALL THREE COUNTS.** The first version (a) blamed the job's own proposed measure for 14 false
> positives that were produced by a missing term in *this lane's* arithmetic, (b) said two chess.com
> Brilliants were missed "by ten centipawns" against a cap it assumed was 220 and never printed —
> the cap is 90, the margin is 140, and each move fails **three** conditions, not one — and (c)
> published five legal queen origins of which two cannot arise in a game. Every number below has
> been re-measured. The corrections are kept visible rather than quietly applied, because the
> conclusion survived all three and the reasoning did not.
>
> **ANTAGONIST B, reading the committed artifacts from the shipped-surface door, then found something
> neither A nor this lane had: a LIVE DEFECT ON MAIN.** The shipped gate labels an ordinary pawn
> promotion `!! Brilliant` as a nine-pawn queen sacrifice, and it has one measured false positive in
> this very corpus — `174540842570 37.Qf6+`, a queen trade offered with check — which was sitting in
> this run's own TOTALS line unreconciled. Both are the mirror of the defect the job is about, and
> both are now `jobs/a-non-sacrifice-on-an-empty-landing-square-scores-full-value-2026-10-01`.
> B's other corrections are folded in below and attributed where they land.

## The answer in four lines

1. **Kunal is right and the defect is real.** Measured with the shipped `seeSq`, not read off a
   screenshot: in the position after 22...Qh3 the bishop on c5 is winnable by White (`seeSq = 3`) and
   h3 is not (`seeSq = 0`). The shipped measure therefore scores `sac = 0`, `isSac = false`, and the
   gate exits on its first condition with the other four never evaluated.
2. **The candidate that fixes it changes nothing on the only population we can measure.** Of the four
   named chess.com Brilliants that have a PGN, the shipped measure agrees with chess.com on two and
   the whole-board candidate agrees on *the same two*.
3. **And it costs five false positives.** C1 newly calls five moves Brilliant that the shipped gate
   does not, and chess.com calls none of them Brilliant.
4. **So the job's own ship condition fails and no gate change is shipped.** The rule it set was "ship
   iff the candidate agrees with chess.com on materially more of them AND the negative control stays
   red". The first half fails outright: not materially more, not more at all.

## Reproducing it

```
node gates/run-brilliant-measurement.js     # 9 PGNs, 697 plies, ~15s
node gates/measure-kunal-qh3.js             # the 22...Qh3 position and every legal queen origin
```
Logs: `443-brilliant-sac-measurement.log` and `443-kunal-qh3.log` beside this file; PGNs in
`claude/agents/bench/pgn/`. Publishing the command with the count, per the `#411`/`#412` rule.

## Two premises in the job that do not survive measurement [R18]

**"The answerkey collection holds 16 chess.com games ... carrying 12 chess.com Brilliants across 7 of
them."** Measured, summing `brilliantWhite + brilliantBlack` over all sixteen rows: **7, not 12**, one
per game across seven games. Only **two** of those seven appear in `docs/benchmark-answerkey-7-pgn`;
counting the two rows that carry their own PGN pointer brings the usable population to **four named
Brilliants with a replayable game** — a third of the stated figure, and the figure the ship decision
rests on. *Caveat, and it is load-bearing:* the answer key is hand-transcribed into
`gates/run-brilliant-measurement.js`, and the five `{w:0,b:0}` rows are the denominator of every
false-positive count here. "Five false positives" means "five moves that chess.com's **per-game
count** implies are not Brilliant". That is the right inference from a count, and it is an inference.

**"A candidate: ... the material the opponent can win by force that they could NOT have won before
it."** Measured as C2 below, and **it scores 0 on the very move it was proposed for** — the bishop on
c5 was *already* attacked before 22...Qh3, which is exactly what makes ignoring the threat a
sacrifice, so the before-and-after difference is zero by construction. That half of the original
finding stands and is confirmed on all three legal origins.
**What does NOT stand is the claim that C2 is reckless.** See the table below: implemented with the
trade guard its own definition requires, C2 adds **zero** false positives. It does not fix the case
and it does not break anything.

## The measures, and the trade guard that is the whole argument

| | definition |
|---|---|
| **M0** *(shipped)* | `max(0, value of the piece now on the LANDING SQUARE − value of what the move captured)`, counted only when `seeSq(after, landing square, opponent) > 0`. |
| **C1** *(whole board)* | the same, with "the landing square" replaced by "whichever square holding one of the mover's pieces the opponent can win the most on". M0 is C1 restricted to one square. |
| **C2** *(the job's own)* | four readings, because the wording admits all four: maxima-difference and per-square, each with and without the trade guard. |

Measured over 697 plies:

| measure | labelled Brilliant | against the shipped 3 |
|---|---|---|
| **M0 (shipped)** | 3 | — |
| **C1 (whole board)** | 8 | **+5** |
| C2, maxima difference, **no** trade guard | 17 | +14 |
| C2, maxima difference, **with** trade guard | 3 | **0** |
| C2, per-square, **no** trade guard | 24 | +21 |
| C2, per-square, **with** trade guard | 3 | **0** |

**THE 14 WAS THIS LANE'S BUG AND IT WAS PUBLISHED AS A CRITICISM OF KUNAL'S IDEA.** M0 and C1 both
subtract `capVal`; that term is what stops an ordinary *capture* reading as a sacrifice, because the
piece you captured **with** now stands on a square where it can be taken. The first draft of C2
dropped it while this file's own comment said it was there. **With the guard restored, both faithful
readings add zero.**
**And the story attached to the 14 was wrong too, in a second way [antagonist B].** The first version
called all fourteen "ordinary recaptures" and named six of them. Measured against the preceding ply,
**only 2 of the 14 are recaptures and none of the six named is one** — `4.Bxc6` and `5.Bxc6+` are Ruy
Lopez *initiating* captures. Nothing about the previous ply is involved: C2-without-the-guard fires on
any capture that walks the capturing piece onto a square where it can be taken back. A causal story
fitted to 2 of 14 cases and generalised to all fourteen is the thing CLAUDE.md warns about —
*a wrong reason that reaches the right verdict is a trap, not a check* — and it is doubly so here,
because the verdict it propped up was a criticism of the job's author.
CLAUDE.md: *a wrong reason that reaches the right verdict is a trap, not a check* — and the `#416`
rule the first version cited (*a flag's proposed fix is a hypothesis, check it against the mechanism
before implementing it*) is better illustrated by this lane's own arithmetic than by the job's idea.

**One other trap in the same family, caught earlier by the Opera Game.** `seeSq` returns the **net**
gain of the exchange; M0 does not use that number — only its sign, as a yes/no — and then counts the
**full value** of the piece. C1's first draft scored off the net gain and read **1** on 10.Nxb5 where
the shipped gate reads **2**. A candidate that scores the project's reference brilliancy *lower* than
the measure it generalises is not a generalisation.

## That the harness measures the thing that ships

`gates/engine-extract.js` reads the real declarations out of `chess.jsx` by balanced braces, the way
`gates/unit-drill-why.js` already does, so `brilliantGate` here **is** the shipped function rather than
a copy. The cross-check, over the whole corpus rather than one game: the independently re-derived M0
reproduces the real `brilliantGate(...).sac` on **697 of 697 plies**, and the re-derived verdict
matches `brilliantGate(...).ok` on **697 of 697**. **The honest denominator is smaller and the runner
now prints both:** only **29** of those 697 plies have a *nonzero* `sac`, so 668 of the agreements are
`0 == 0` [antagonist B]. The check is 29 of 29 where it can discriminate. It also verifies a
transcription of the same eight lines over the same imported `seeSq`, not an independent derivation —
worth knowing before leaning on it. Every run prints the `chess.jsx` path and md5 it read.

**WHICH BRANCH, said plainly.** `chess.jsx` scores a review on one of two device-chosen paths: the
Stockfish path (`chess.jsx:3566`) and the fallback path (`chess.jsx:3602`, `evalPawns` +
`rankMoves(pos,2)`). This harness reproduces the **fallback** path.

- the **sacrifice term** is computed inside `brilliantGate` from the board alone and is byte-identical
  on both paths, so **every `sac` number here holds on both**;
- the **four eval conditions** are not, so a "would be labelled Brilliant" verdict here is a verdict
  about the fallback branch. The Stockfish branch is **NOT CHECKED**.

**There are THREE call sites, not two** [antagonist B]: `:3566`, `:3602`, and `chess.jsx:1047` inside
`analyzeGameCounts`, which calls `isBrilliant` (`:1028`) — `brilliantGate(...).ok` plus a `loss>=250`
pre-guard — and produces the **Brilliant count on the review summary card**. The harness calls
`brilliantGate` directly. The substitution is harmless here (`ok` already requires `loss < cap ≤ 220`,
so the guard is dead, and no hit in this corpus has `loss >= 250`), but "one of two paths" was a wrong
description of the surface being reported on, in the section headed "said plainly".
`analyzeGameCounts` also takes a `userColor` and skips the opponent's plies, which this harness does
not: **one of the five C1 false positives (`174433078044 21...Bxf3`) is the opponent's move** in a game
Kunal played as White, so the app would never grade it when the colour is known.

## Work item 1 — the position, as far as the data allows

**The PGN of `Kunal2023 vs abdallah050195` is not in this project.** Not in `answerkey` (sixteen rows,
no such opponent) and not in `docs/benchmark-answerkey-7-pgn` (seven games, all other opponents). So
work item 1 as written — "replay to ply 44" — **could not be done**, and is not reported as done.

What *was* done needs no PGN. The sacrifice term depends only on the position **after** the move and
on what the move captured, and 22...Qh3 captured nothing, so M0 and C1 are fully determined by the
position the job states piece by piece:

```
FEN  8/pppQ3p/6pk/2b1Rp2/5P2/5bPq/PPP2P1P/R5K1 w - -
seeSq(after, c5, White) = 3      <- the black bishop, exactly as Kunal said
seeSq(after, h3, White) = 0      <- the queen that moved is not attackable
maxLoose(after, black, White)    = 3  (bishop on c5)
```

The queen's origin is unknown, so **every origin was enumerated** — and filtered for legality, which
the first version did not do:

| origin | shipped `sac` | `isSac` | C1 | C2 (guarded) |
|---|---|---|---|---|
| Qh5–h3 | 0 | false | **3** (b@c5) | 0 |
| Qg4–h3 | 0 | false | **3** (b@c5) | 0 |
| Qh4–h3 | 0 | false | **3** (b@c5) | 0 |
| ~~Qg2–h3~~ | — | — | — | **rejected: White, not to move, would be in check** |
| ~~Qf1–h3~~ | — | — | — | **rejected: same** |

**`getLegal()` cannot apply that filter** — it checks only that the *mover's* king is safe, so as a
legality test for a constructed predecessor position it is vacuous. The test is
`isInCheck(board, the side NOT to move)`. The surviving claim is stronger than the one withdrawn:
the shipped measure scores 0 and C1 scores 3 on **all three** legal origins, and C2 is 0 on **three of
three** rather than four of five.

## Work items 3 and 4 — both measures over the real games

Nine PGNs, 697 plies, both sides. All nine parse completely (`parsePGN` = `loadSANs` = an independent
raw-token count, game by game), so the denominator is not silently short.

| game | chess.com's Brilliant | shipped | C1 | C2 |
|---|---|---|---|---|
| `184024052818` | 19...Bxh3 | **BRILLIANT** ✓ | **BRILLIANT** ✓ | BRILLIANT ✓ |
| `184222697658` | 22...Qxc3 | **BRILLIANT** ✓ | **BRILLIANT** ✓ | BRILLIANT ✓ |
| `174386847848` | 17.Bxh7+ | no | no — *same* | no |
| `184267782076` | 25.Bxg6 | no | no — *same* | no |

**Agreement with chess.com: 2 of 4 under the shipped measure, 2 of 4 under C1.** Identical.

**AND THE BASELINE IS NOT 3 TRUE, IT IS 2 TRUE AND 1 FALSE** [antagonist B]. The log's TOTALS say the
shipped gate labels **3** moves Brilliant while agreement is **2**; the first version of this document
never reconciled those. The third is `174540842570 37.Qf6+` — `sac=9`, `capturedValue=0`, in a game
chess.com gives zero Brilliants. It is a queen trade offered with check, scored as a nine-pawn
sacrifice because f6 was empty. In absolute terms on this corpus: **shipped 2 true / 1 false, C1 2
true / 6 false.** That strengthens the no-ship call, and the false positive is now its own job.

**AND THE REASON THE TWO ARE MISSED IS NOT ONE CONDITION, IT IS THREE.** `isSac` is already **true** on
both, so the sacrifice test is not what rejects them. The gate's own inputs, which the first version
of this document never printed:

| | loss | cap | evAfter | evBefore | conditions failed |
|---|---|---|---|---|---|
| 17.Bxh7+ | 230 | **90** | **−0.30** | **−1.15** | `loss<cap`, `evAfter>=0.8`, `evBefore>-1.0` |
| 25.Bxg6 | 110 | **90** | **−1.75** | **−2.70** | `loss<cap`, `evAfter>=0.8`, `evBefore>-1.0` |

The cap is `(isSac && evAfter>=1.2) ? 220 : 90`, and `evAfter` is negative on both, so **the cap is 90,
not 220** — across the whole corpus it is 220 on only 7 of 697 plies, and neither of these is one of
them. The first version read the harness's *first-failing-condition* field and reported it as the only
one, producing "misses by ten centipawns" for a move that misses by **140** and fails two further
conditions besides. The fallback evaluator scores the position after 17.Bxh7+ at **−0.30 for the
mover**: it thinks White is slightly *worse*. That is three conditions away from Brilliant, not one,
and the follow-up job has been re-scoped accordingly. The runner now prints `cap`, `evAfter`,
`evBefore` and **every** failing condition — #432's rule, that a threshold must print its own inputs.

**False positives (work item 4).** Moves a candidate calls Brilliant that the shipped gate does not,
none of which chess.com calls Brilliant:

- **C1: 5.** 174433078044 21...Bxf3, 180000436342 8...O-O and 9...Ng3+, 184222697658 15...exd4 and 18...dxc3.
- **C2 (guarded): 0.**

Note **8...O-O** in that C1 list: castling scored as a 3-pawn sacrifice because a knight sat loose on
e4. That is the generosity the job warned about, reached by the most ordinary move in chess.

## Why the population cannot settle the question, which is the real result

**All four named chess.com Brilliants are captures** — Bxh3, Qxc3, Bxh7+, Bxg6 — so all four are
landing-square sacrifices, the kind M0 already sees. **Zero are abandoned-piece sacrifices.** Work
item 3 asked how many are "like this one"; the answer is **none**.

So this population contains no instance of the defect class, and a population with no instances of a
class cannot discriminate a measure that sees the class from one that does not. The two columns come
out identical not because C1 is wrong but because nothing here tests it. The only known instance of
the class is Kunal's own game, and this project does not have its PGN.

Shipping C1 on this evidence would be accepting five measured false positives to fix a class with zero
measured instances, on one position read off a screenshot.

## NOT CHECKED

- **The Stockfish branch** (`chess.jsx:3566`). Every eval-conditioned verdict here is the fallback
  branch. The `sac` numbers transfer; the `ok` verdicts do not. Compounding this: at search depth 3
  the fallback's own `loss` for 17.Bxh7+ is **0**, not 230, so the 230 is itself a depth-2 artifact.
- **PROMOTION AND EN-PASSANT: 0 of 697 plies.** This is a gap in the **sacrifice** term, the one thing
  said above to transfer to both branches. M0 counts *the value of the piece now standing on the
  landing square*, which after a promotion is the **new queen**: a pawn promoting onto a contested
  square scores `sac = 9` for a one-pawn investment, and C1 inherits it identically. Measured on
  constructed positions, `isSac` is true on 20 of 20 promotions. No false Brilliant was driven end to
  end (the depth-2 `loss` came back as a mate score), so this is a demonstrated 9× error in the
  measure rather than a demonstrated false label. Same family as #432's contiguous-archive fixture:
  the corpus has no instance of the class, so the measure's behaviour on the class was never observed.
- **`maxLoose` excludes the king; shipped M0 does not.** So "M0 is exactly C1 restricted to the landing
  square" is false for king moves. Unreachable in practice — `seeSq` on a legal king destination is 0 —
  but the published equivalence is not quite the one implemented.
- **The PGN of Kunal's game vs abdallah050195.** Not in this project; the position is the job's own
  transcription of a screenshot. The *board claim* is confirmed mechanically; the *move* is not replayed.
- **The three chess.com Brilliants with no PGN** (174087094684, 174137371866, 174294340246). Their rows
  say in terms that the ply was not identified.
- **Whether chess.com would call any of the 5 C1 false positives Brilliant.** Taken as "no" from the
  per-side counts in a hand-transcribed key. An inference from a count, not a per-move reading.
- **THE ANSWER KEY ITSELF CANNOT BE FALSIFIED FROM THIS REPOSITORY** [antagonist B]. The chess.com
  counts are nine hand-typed literals in `gates/run-brilliant-measurement.js`; the `answerkey`
  collection lives in the tracker and nothing committed here can check them, yet both numerators and
  both denominators of the ship decision come from them. What B *could* check passes: the `kunal`
  field matches the PGN headers 9 of 9, and all four named SANs appear at the stated move numbers.
  That rules out a transposed side or move number. It does **not** rule out a `{w:0,b:0}` row that
  should be `{w:0,b:1}` — any such error turns a C1 false positive into a true positive, and five of
  those are the whole argument against shipping.
- **The corpus is nine games of one player at roughly 500–700 Elo.** The eval conditions
  (`evBefore > -1.0 && evBefore < 4.5`) are what does most of the rejecting at that level, so the
  false-positive rates here are rates on this one player's games.
- **`gates.sh` was not run.** No bundle was built and no build number issued, so there is nothing to
  gate: `mountcheck` would reject a `#443` stamp this run never wrote. `app.js` is proven unchanged by
  md5 against `origin/main` instead. The new files live in `gates/` root, and `gates.sh` globs
  `mountcheck.js` + `regress/*.js` only (gates/gates.sh:112), so they cannot enter the suite.
