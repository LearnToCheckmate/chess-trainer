# Suite audit — Review test cases, build #378 (2026-09-14)

Unattended audit of the existing Review suite. Everything below is either **recounted from the documents
themselves** or **measured on the running build**. Where a claim could not be checked it says so in those
words. Nothing in `TEST-CASES.md`, `USER-STORIES.md`, `SAT-REVIEW-373.md` or `REGRESSION-CANDIDATES.md` was
edited; this document is a report plus proposed replacements.

**What was audited.** The two suite documents in this project (`claude/stories/TEST-CASES.md`,
`claude/stories/USER-STORIES.md`) plus `REGRESSION-CANDIDATES.md`, `SAT-REVIEW-373.md`, `UAT-PIPELINE.md`
and `METRICS.md`; the read-only clone at `/home/claude/gatescan` (build **#378**, `app.js` md5 `985d61643b88`,
stamp `#378 - 2026-09-14 00:07 ET`); the 13 gates in `gates/regress/`; and the live build served at
`http://127.0.0.1:8766`.

**How the live checks were made.** Playwright / `playwright-core` against `/opt/pw-browsers/chromium`,
`--no-sandbox`, viewport **375x730** (Kunal's real phone, `gates/lib.js` GEOS `kunal730`), `deviceScaleFactor`
1, `isMobile`, `hasTouch`, `ct_pool=3`, routes to gstatic / googleapis / firebase / google.com aborted. Fixture
is the Opera Game PGN (33 plies, 17.Rd8#). Scripts live in `/home/claude/work/build/` (`audit378.js`,
`audit378c.js`, `audit378d.js`, `audit378e.js`, `engline.js`). Nothing in `/home/claude/gatescan` was modified.

**Citation convention.** Repo files are cited `path:line` and every line number was verified by `grep -n`.
Project documents are cited by **section heading plus the exact quoted string**, because the Projects tool
serves a project doc as one content blob with no stable line numbering; every quote below is exact and
greppable.

---

## 0. The finding that changes every other number

**The 31 cases in `claude/stories/TEST-CASES.md` are not executed by anything, and have not been executed
since build #373.**

- `TEST-CASES.md` opens: *"Every case is executed by `review373.js` in the same pass that wrote this file
  (that is the rule: nothing is written here that is not run)."*
- **`review373.js` does not exist.** `find / -name "review373*" -o -name "repro373*" -o -name "iso373*"
  -o -name "evals373*" -o -name "geo373*"` returns **nothing** on this container. Neither harness is in the
  repo, in `gates/`, or in `/home/claude/work/build/`.
- The repo corroborates it. `gates/regress/33-reproducible-review.js:1-2`: *"Rebuilt from repro373.js, which
  lived in a sandbox that no longer exists and was never in git."*
- Consequently **0 of 31 cases and 0 of 30 stories have a result against the build under audit (#378)**. Every
  PASS and FAIL quoted in `SAT-REVIEW-373.md` is five builds old (#373 → #378).

This is not the same as saying the Review screen is ungated. It is gated — by a **different suite that also
lives at `claude/stories/`**. See §4.1. But the 31 cases as written are, today, prose.

**Ten Review behaviours the project suite claims to cover have no assertion in any gate.** Checked by reading
every `L.say(...)` line in all 13 gates:

| behaviour | project case | gate assertion |
|---|---|---|
| bad-PGN inline message | TC-R03 | none |
| tap a move token in the strip | TC-R10 | none (`strip-row` is read only to count colours, `20-review.js:67`) |
| ★ key moments | TC-R11 | none |
| best-move chip → best line | TC-R12 | none |
| flip the board | TC-R18 | none |
| drill chips in the ⋯ sheet | TC-R19 | none |
| Copy PGN | TC-R20 | none (`31-antagonist373.js` checks `moves-copy` on the **Play** screen, not Review) |
| autoplay | TC-R23 | none |
| Play from here | TC-R24 | none |
| eval-bar placement cycle | TC-R26 | none |

---

## 1. Recount from the documents

### 1.1 The true numbers

Counted row by row from the `TEST-CASES.md` table and the `US-R..` headings in `USER-STORIES.md`.

| figure | true value | working |
|---|---|---|
| user stories | **30** | US-R01 … US-R30, each with a `**US-Rnn — …**` heading and a `[TC-…]` cite. No gaps, no duplicates. |
| test cases | **31** | 31 table rows; ids TC-R01 … TC-R30 (30) **plus** TC-R04b. |
| cases per story | **median 1, mean 1.033, max 2** | 29 stories carry exactly one case. One story (US-R04) carries two: TC-R02 and TC-R30. |
| stories with at least one case | **30 of 30** | every story is cited by at least one case row. |
| cases recorded FAIL (at #373) | **5** | TC-R04, TC-R05, TC-R06, TC-R12, TC-R22 — `SAT-REVIEW-373.md`, *"Still failing at the close of #373, and why"*. |
| cases recorded PASS (at #373) | **23** | the PASS list in *"Case-by-case (phone, run 3 on the shipping bundle)"*. |
| **cases with no recorded result at all** | **3** | TC-R04b, TC-R27, TC-R28 appear in neither the PASS list nor the FAIL list. 23 + 5 + 3 = 31. |
| **stories with no passing case** | **8** | see 1.2. |
| cases / stories executed against **#378** | **0** | see §0. |

### 1.2 Stories with no passing case — the prior audit's "6" is wrong, the answer is 8

Each of the five recorded failures belongs to a different story, and each of those stories has exactly one
case. Five failing cases can therefore strand **five** stories, never six. Adding the three cases with no
recorded result — a case with no result has not been shown to pass — gives **eight**:

| story | its only case | recorded state at #373 |
|---|---|---|
| US-R02 games list rows | TC-R04 | FAIL |
| US-R05 review a listed game with one tap | TC-R04b | **no result recorded** |
| US-R06 the summary | TC-R05 | FAIL |
| US-R07 the Skills panel | TC-R06 | FAIL |
| US-R13 see the move I should have played | TC-R12 | FAIL |
| US-R14 the board sits still | TC-R27 | **no result recorded** |
| US-R15 no console errors | TC-R28 | **no result recorded** |
| US-R27 play a position out and come back | TC-R22 | FAIL |

The other 22 stories each have a recorded passing case (US-R04 has two).

The "6" almost certainly comes from the coverage line's *"6 failed on the first pass"*, which is a count of
**first-pass** failures, not of stranded stories, and is contradicted four lines later in its own document
(§4.2).

### 1.3 What the prior audit got right and wrong

| # | prior audit claim | verdict |
|---|---|---|
| 1 | 30 stories, 31 cases, median 1, max 2 | **right** on all four numbers. |
| 1a | "31 not 30 — TC-R04b was uncounted" | **wrong reason.** TC-R04b *is* inside the 30: `SAT-REVIEW-373.md` says *"30 cases (TC-R01..TC-R29 plus TC-R04b …)"* — 29 + TC-R04b = 30. The case left out of the 30 is **TC-R30**, run by `repro373.js`, not TC-R04b. |
| 2 | 5 cases failing | **right** as a reading of the #373 record — but it is a #373 number, not a #378 number, and it omits the 3 cases with no result. |
| 3 | "so 6 of 30 stories have no passing case" | **wrong.** 5 failing cases strand 5 stories; counting the 3 unrecorded cases honestly gives **8**. |
| 4 | 9 cases have no measurable pass condition | **right in count, and I can name a defensible 9** (§2) — but the prior audit published no criterion, so I cannot confirm it picked the same nine. Under my criterion at least **14** cases contain an unmeasurable clause; 9 of them are unmeasurable in the clause the case exists to prove. |
| 5 | 4 cases assert less than their story | **undercount. There are at least 6** (§3). |
| 6 | Only Review has coverage; 9 areas have zero | **right in substance, on one of two live denominators.** The docs disagree about whether the app has 6 screens or 10 (§4.3). "9 uncovered" follows only from the 10-denominator, which is itself the unsourced half of the contradiction. §5 ranks nine areas and shows how the two denominators reconcile. |
| 7 | "Three counting inconsistencies" | **undercount. There are 7** (§4), and the largest one — two different suites at the same document paths — is not among the three named. |

**Four of the prior audit's figures are wrong or misattributed** (rows 1a, 3, 5, 7), one is right but stale
and incomplete (row 2), and three are right (rows 1, 4, 6).

---

## 2. Nine cases with no measurable pass condition

**Criterion used.** A case fails the measurability test when the clause it exists to prove cannot be
evaluated true/false by a harness without a human judgement or a value the case does not supply. Under a
looser criterion — *any* unmeasurable clause anywhere in the expected column — the count is at least 14; the
extra five are listed after the table.

Every selector below was taken from `chess.jsx` by `grep -o 'data-ct="[^"]*"'` (69 distinct static values)
and confirmed rendered at 375x730 on #378. **No selector in this section is invented.**

### TC-R06 (US-R07) — the Skills panel

> unmeasurable: **"9 rows each with a printed definition"**

"A printed definition" has no test. This is exactly the clause that failed: `SAT-REVIEW-373.md` records
TC-R06 failing because *"one Skills row's definition does not match the harness's 'contains a lowercase
word' rule"* — a proxy invented at run time because the case supplied none.

**Replacement (measured on #378):** `document.querySelectorAll('[data-ct^="skill-"]').length === 9`, and the
nine ids are exactly, in DOM order:
`skill-develops-pieces`, `skill-castled`, `skill-checks-faced`, `skill-weak-pawns-at-the-end`,
`skill-book-moves`, `skill-forks-played`, `skill-forks-missed`, `skill-pieces-left-hanging`,
`skill-rooks-to-open-files`. Each row's definition span is **≥ 20 characters** (shortest measured: *"the move
it happened on"*, 23). Values: `skill-develops-pieces` contains `4/10` and `2/10`; `skill-castled` contains
`move 12` and `no`; `skill-checks-faced` ends `0 4`; `skill-rooks-to-open-files` ends `1 1`.

### TC-R11 (US-R12) — ★ key moments

> unmeasurable: **"two non-Best plies in ascending order"**

No plies named, so any two ascending non-Best plies pass. Measured at #378 the ★ control is
`aria-label="Next key moment (10)"` and four successive taps from ply 0 land on **12, 19, 20, 21** — while
the story it tests says *"successive taps land on ply 12 and ply 18"*. The case passes; the story's own
criterion is false, and nothing notices.

**Replacement:** from ply 0, four successive taps of `aria-label="Next key moment (10)"` put
`[data-ct="rev-move-line"]` at, in order, a string ending `12/33`, then `19/33`, then `20/33`, then `21/33`;
the board rect stays `349x349` at `(24, 56)` throughout.

### TC-R12 (US-R13) — the best-move chip

> unmeasurable: **"a 'best line' appears naming a move"**

No move named; any non-empty line passes.

**Replacement (measured):** at ply 12, `[data-ct="rev-best"]` reads exactly `best Qf6 ›`. Tapping it makes
`[data-ct="rev-bestline"]` appear **within 4000 ms** reading exactly
`best line 6... Qf6 7. Qb3 Bc5 8. O-O`. Board rect unchanged at `349x349` `(24, 56)`;
`document.documentElement.scrollHeight - innerHeight === 0`.
(The 4000 ms bound is the fix for SAT's stated cause of failure — *"waits less than the engine takes on this
machine"*. Measured latency on this container was under 3.5 s.)

### TC-R19 (US-R23) — drill chips

> unmeasurable: **"opens the first move of that class, verdict matches the chip"**

Neither the chip nor the target ply is named, so the case is a relation with no anchor.

**Replacement (measured):** in `[data-ct="rev-sheet"]`, the chip matching `/mistakes? ›$/` reads exactly
`1 mistakes ›`; tapping it sets `[data-ct="rev-move-line"]` to a string containing both `Mistake` and
`20/33` (measured: `10… cxb5 ? Mistake best Qb4+ ✓ 20/33`).

### TC-R21 (US-R25) — the eval graph

> unmeasurable: **"a graph appears in the bottom bar, the bars keep their height, the board does not move,
> and the tap jumps the ply"**

Four relations, no values: no graph size, no bar height, no target ply.

**Replacement (measured):** after tapping `[data-ct="menu-evalgraph"]` its text reads
`Eval graph in the player bars ON · try it in Review` (it read `… OFF · option C` before);
`[data-ct="eval-graph"]` is exactly **126 x 38**; `[data-ct="pbar-bottom"]` height stays **52**; the board
stays `349` wide at `(24, 56)`; a click at 90 % of the graph's width sets `[data-ct="rev-move-line"]` to a
string containing `30/33` (measured `15… Nxd7 ?? Blunder best Qxd7 › 30/33`).
The 126 is not a magic number: `chess.jsx:5957` computes `gw = Math.max(90, Math.min(130, Math.round(boardPx*0.36)))`,
and `349 * 0.36 = 125.6 → 126`. At other widths assert `gw === Math.max(90, Math.min(130, Math.round(boardWidth*0.36)))`.

### TC-R22 (US-R27) — the analysis board

> unmeasurable: **"an engine line for the position; the line changes after the move; Undo restores it; Exit
> returns to the same ply"**

All four are relations with no bound and no anchor; there is no time limit, which is the stated cause of the
recorded failure.

**Replacement:** at ply 19, tapping `[data-ct="rev-fab"]` makes `[data-ct="rev-engline"]` non-empty **within
8000 ms** and puts buttons reading `↶ Undo` and `✕ Exit analysis` on screen. Record `rev-engline` as `E0`;
after one legal move `rev-engline !== E0` within 8000 ms; after `↶ Undo`, `rev-engline === E0` within 8000 ms;
after `✕ Exit analysis`, `[data-ct="rev-move-line"]` contains `19/33` and the board rect is `349x349` at
`(24, 56)`.

### TC-R23 (US-R30) — autoplay

> unmeasurable: **"the ply advances on its own; ⏸ shows"**

No interval, no target ply, no stop condition.

**Replacement (measured):** at ply 0, tap `aria-label="Auto-play"` (text `▶`). Within **500 ms** the same
control reads `aria-label="Pause"`, text `⏸`. `[data-ct="rev-move-line"]` then ends `1/33` by **2000 ms**,
`2/33` by **3000 ms**, and **≥ 5/33 by 8000 ms** (measured 6/33). Tapping `⏸` freezes it: the `n/33` read
500 ms after the tap is identical to the one read 3500 ms after (measured `6/33` both times).

### TC-R24 (US-R28) — Play from here

> unmeasurable: **"Play setup says Continuing with the right side; returning keeps the review"**

"The right side" names no side; "keeps the review" names no element.

**Replacement (measured, from a review paused at ply 6 — White to move):** tapping `Play from here` in
`[data-ct="rev-sheet"]` opens `[data-ct="setup-sheet"]`, whose text contains
`Continuing from your reviewed position.` and `You'll play White (the side to move)`, and whose start button
reads `▶ Play this position vs Computer · White · No clock`. Assert the side word equals `White` when the ply
is even and `Black` when odd.
For the return half, assert against a named element rather than "keeps": after the Review tab is reselected,
a button reading `‹ Back to your analysis` is present, and tapping it makes `[data-ct="rev-summary"]` visible.
**Not verified:** I did not reach the return leg — the Play setup sheet intercepted the tab tap in my run, so
the `‹ Back to your analysis` label is taken from `TC-R25`'s own text and is unconfirmed on #378.

### TC-R25 (US-R29) — the cached re-open

> unmeasurable: **"the summary returns in well under a second; the re-analysis comes from the cache"**

"Well under a second" is not a threshold, and "comes from the cache" has no observable — a slow re-run would
satisfy the sentence.

**Replacement:** `‹ Back to games` then `‹ Back to your analysis` makes `[data-ct="rev-summary"]` visible
**within 1500 ms** of the tap. Re-pasting the identical PGN reaches `[data-ct="rev-summary"]` **within
8000 ms**, and `[data-ct="rev-summary"]` innerText is byte-identical to the first run's — same two accuracy
percentages, same nine verdict counts. The 8000 ms is not invented: `gates/regress/20-review.js:92` already
asserts *"TC-R02 the cached re-analysis reaches the summary in under 8 s"* and is green at #378. The contrast
that makes it meaningful: the **cold** run measured **16.15 s and 16.38 s** on this container at pool 3.

### TC-R02 (US-R04) — the analysis run

> unmeasurable: **"time recorded"**

A record is not a pass condition; nothing can fail. The story says the Opera Game *"takes about 22 s at pool
3"*, and the case declines to assert it.

**Replacement (measured):** `Analyzing your game` appears; the progress percentage sampled every 500 ms is
non-decreasing; `[data-ct="rev-summary"]` becomes visible **within 60000 ms** and **no sooner than 3000 ms**
(a summary that arrives instantly means a cache hit, not an analysis). Measured cold at 375x730, pool 3:
**16.15 s** and **16.38 s** — so 60 s is a safe ceiling on slower hardware while still catching a hang.
Note the story's "about 22 s" is stale: #378 analyses the same game in about 16 s.

### The five cases with an unmeasurable clause beside a measurable core

Not counted in the nine, but each needs the same treatment:

- **TC-R15** — *"Reports which squares it covers and whether a piece is under one (A-08, open, Kunal's call)"*.
  Explicitly a report, not a condition. Its measurable half is green: `[data-ct="rev-fab"]` measured
  **42 x 42 at (324, 356)**, inside a board spanning `(24, 56)`–`(373, 405)`.
- **TC-R17** — *"every row ≥44 px"*. "Row" is undefined, and the plain reading is false at #378: inside
  `[data-ct="rev-sheet"]` the ten option rows measure **45 px** but the five drill chips measure **27 px**.
  Split it: *option rows ≥ 44, chips ≥ 24*, and keep the measurable clauses (`rev-sheet` bottom = 730 = the
  viewport bottom, measured; chips equal the summary totals — measured `1 brilliant / 6 great / 1 blunders /
  1 mistakes / 1 inaccuracies` against summary Brilliant 1+0, Great 6+0, Blunder 0+1, Mistake 0+1,
  Inaccuracy 0+1).
- **TC-R29** — *"within ~5 s"*. Replace the `~` with `5000 ms`.
- **TC-R30** — *"in a comparable time"*. `gates/regress/33-reproducible-review.js:138` already pins this at
  *"within 12 s of each other"*; adopt that number.
- **TC-R03** — *"no analysis starts"*. Replace with: `[data-ct="rev-summary"]` is absent and the body text
  does not contain `Analyzing your game`, 3000 ms after the tap. The message half is measurable and correct:
  measured at #378 the inline text is exactly `Move 1 ("this") didn't fit the position.`

---

## 3. Cases that assert less than their story

The prior audit said four. There are **six**. Each was checked against the running build.

### 3.1 TC-R11 vs US-R12 — the ★ button

| | |
|---|---|
| **story** | *"successive taps land on **ply 12 and ply 18**, each a non-Best verdict, board unchanged."* |
| **case** | *"tap ★ twice \| **two non-Best plies in ascending order**, board unchanged"* |

**Measured at #378:** the taps land on **12, 19, 20, 21**. The case passes. The story's criterion is false and
has been false for at least one build with nothing to say so.
**Missing assertion:** *the first four taps from ply 0 land on ply 12, 19, 20 and 21 in that order* — and
US-R12's "ply 18" must be corrected to 19.

### 3.2 TC-R19 vs US-R23 — the drill chip

| | |
|---|---|
| **story** | *"**\"2 mistakes ›\"** opens ply 20, verdict Mistake."* |
| **case** | *"tap a drill chip \| opens the first move of that class, verdict matches the chip"* |

**Measured at #378:** the chip reads **`1 mistakes ›`**, and it does open ply 20 with verdict Mistake. The
case's wording is loose enough to pass either way; the story's literal is wrong.
**Missing assertion:** *the mistakes chip reads `1 mistakes ›` and opens a move line containing `Mistake` and
`20/33`.* (Separately: `1 mistakes` is a pluralisation defect, unasserted anywhere.)

### 3.3 TC-R21 vs US-R25 — the eval graph

| | |
|---|---|
| **story** | *"a **126x38** graph appears in the bottom bar, the bars keep their height and the board does not move."* |
| **case** | *"a graph appears in the bottom bar, the bars keep their height, the board does not move"* |

The case drops the only number in the criterion. **Measured at #378: exactly 126 x 38.** A 20 x 8 graph would
pass the case.
**Missing assertion:** *`[data-ct="eval-graph"]` measures 126 x 38 at 375x730.*

### 3.4 TC-R13 vs US-R16 — the mate move line

| | |
|---|---|
| **story** | *"the move line reads **\"17. Rd8# ! Great\"**"* |
| **case** | *"\"1-0\", bar ≥80 % white, **\"17. Rd8#\"**, why \"Checkmate.\""* |

The case drops the verdict. **Measured at #378:** `17. Rd8# ! Great ▶ why 33/33`. A build that printed
`17. Rd8#` with no verdict, or with the wrong verdict, passes TC-R13 and violates US-R16. This is the same
shape of hole the supervisor already found once in the other suite
(`claude/agents/SUPERVISOR-373.md:26`: *"TC-R07 asserts only the round badge, not the label … which is how
the h-file label got through"*).
**Missing assertion:** *`[data-ct="rev-move-line"]` at ply 33 contains `17. Rd8#` **and** `Great`.*

### 3.5 TC-R01 vs US-R01 — the PGN box (missed by the prior audit)

| | |
|---|---|
| **story** | *"a PGN box (**368x130**, placeholder naming an example move)"* |
| **case** | *"textarea **≥360x120** with a placeholder"* |

A 360 x 120 box passes the case and fails the story. **Measured at #378: 367.5 x 130**, placeholder
`Paste your PGN here, e.g. 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ... or the full Chess.com export with [Event ...] headers.`
**Missing assertion:** *width 367.5 ± 1 and height 130 ± 1 at 375x730; the placeholder contains `1. e4`.*

### 3.6 TC-R05 vs US-R06 — the rating estimate (missed by the prior audit)

| | |
|---|---|
| **story** | *"accuracy per side **with an estimated rating**"* |
| **case** | *"White accuracy ≥90 % and > Black's; 9 verdict rows; White 17 / Black 16 moves; Brilliant 1/0"* |

The rating is never asserted. **Measured at #378** the summary reads `White 98% ACCURACY ≈1945 EST` /
`Black 62.4% ACCURACY ≈948 EST`.
**Missing assertion:** *`[data-ct="rev-summary"]` contains one `≈<digits> EST` token per side.*

### 3.7 A defect in TC-R16 that is not under-assertion but a wrong assertion

TC-R16 expects *"engine line says \"checkmate\""* and US-R18 says *"the engine line reading \"checkmate\""*.
**Measured at #378, with the analysis board open at ply 33, `[data-ct="rev-engline"]` reads exactly
`1-0 …` and is still `1-0 …` after 20 seconds.** The word "checkmate" is on screen, but in the result banner
(`White won by checkmate`), not the engine line. So the case either fails against the selector, or passes
against body text — a pass earned by the wrong element. TC-R16 is recorded PASS at #373, which suggests the
latter.
**Correction:** assert `[data-ct="eval-bar-num"] === "1-0"` **and** `[data-ct="rev-engline"]` starts `1-0`,
and move the "checkmate" wording assertion onto the result banner where the word actually lives.

### 3.8 Two story criteria that are wrong against the app

- **US-R06** lists the nine verdict rows as *"Brilliant, Great, Best, **Excellent**, Good, Book, Inaccuracy,
  Mistake, Blunder"*. **Measured at #378** the nine rows are Brilliant, Great, Best, Good, Book, Inaccuracy,
  **Miss**, Mistake, Blunder. The story names a category the summary does not show and omits one it does.
  (The repo gate's own list, `20-review.js:8`, has a third shape: eight categories, omitting Book.)
- **R-05 is fixed on the summary and alive in the Skills panel.** All eighteen zero-value verdict chips
  measured `disabled: true` at #378 — R-05 as filed is closed. But in the Skills panel four **non-zero**
  numbers are styled as tappable and are `disabled`: `skill-checks-faced` Black = **4**, `skill-book-moves`
  White = **3** and Black = **2**, `skill-weak-pawns-at-the-end` Black = **1**. Nothing in either suite
  asserts tappability, so nothing catches it.

---

## 4. Counting inconsistencies

Seven, not three.

### 4.1 Two different suites live at the same two document paths — the largest one, and unnamed before now

| | project copy (claude.ai Project) | repo copy (`/home/claude/gatescan/claude/stories/`) |
|---|---|---|
| `USER-STORIES.md` title | *"Review screen — user stories (charter role 1). Build #373"* | *"Chess Trainer user stories"* (`:1`) |
| stories | **30** (US-R01…US-R30) | **11** (`:24, :32, :41, :51, :61, :72, :80, :87, :93, :100, :108`) |
| `TEST-CASES.md` cases | **31** (TC-R01…TC-R30 + TC-R04b) | **14** (`:15`–`:28`) |
| executed by | `review373.js` + `repro373.js` — **do not exist** | `gates/regress/20-review.js`, `21-review-brilliant.js` — **run on every build** |
| last result | #373, prose | #373, per-case PASS counts copied from the gate log |

**The ids collide and mean different things.** Project `TC-R05` = *"read the summary"* (US-R06); repo
`TC-R05` = *"tap a Skills number"* (US-R03). Project `US-R01` = *"see, in one screen, both ways to get a game
in"*; repo `US-R01` = *"Import a game by pasting a PGN"*. Any sentence of the form "TC-R05 passed" is
ambiguous across the two.
**Which is correct:** both are real work; neither is wrong. What is wrong is that they share paths and an id
space. The repo pair is the one with running gates behind it; the project pair is the one with the wider
story set. They must be renamed apart before either number can be quoted safely.

### 4.2 "30 cases" vs 31, and "6 failed" vs 5 — both inside `SAT-REVIEW-373.md`

- Header: *"`review373.js`, 30 cases (TC-R01..TC-R29 plus TC-R04b and the aggregates R27/R28), plus
  `repro373.js` (TC-R30)."* — 29 + TC-R04b = 30 for `review373.js`, and TC-R30 makes **31 in the suite**.
  The parenthetical *"plus the aggregates R27/R28"* double-counts: R27 and R28 are already inside R01..R29.
- Coverage line: *"Review: **30 stories, 30 cases**, all executed"* — drops TC-R30 from the suite total.
  **Correct: 30 stories, 31 cases.**
- Coverage line: *"**6 failed** on the first pass, 5 fixed in #373, 1 left open by Kunal's decision (A-08)"*
  implies one case failing at close-out. Four lines later: *"Still failing at the close of #373, and why:
  TC-R04 …, TC-R05 …, TC-R06 …, TC-R12 and TC-R22"* — **five**. And TC-R15, the A-08 case, is in the **PASS**
  list of the same document.
  **Correct: 5 recorded failing at #373.** The "1 left open" refers to decision A-08, which the case reports
  rather than fails — it is not a failing case.
- Coverage line: *"all executed"*. **Three cases (TC-R04b, TC-R27, TC-R28) have no recorded result** anywhere
  in the document. Correct: 28 of 31 have a recorded result.

### 4.3 "1 of 10" vs "1 of 6" — five documents, two denominators

| where | figure |
|---|---|
| `claude/BUILD-CONTEXT.md:137` | *"Coverage — **1 of 10** screens fully specced and tested. The headline…"* |
| `claude/RUN-LOG.md:32` and `:40` | table header *"coverage (screens fully specced AND tested, **of 6**)"* |
| `claude/RUN-LOG.md:42` | *"**1 of 6** (Review, by both sessions independently…)"* |
| `claude/agents/SUPERVISOR-373.md:26` | *"coverage \| **1 of 6 (Review).**"* |
| `claude/FEEDBACK-INBOX.md:222` | *"Coverage **1 of 6**."* |
| `claude/stories/SAT-REVIEW-373.md` coverage line | *"Screens fully specced AND tested: **1 of 6** (Review)."* |

**Which is correct: 1 of 6 is the sourced number; 1 of 10 is not.** The 6 has a named list behind it in three
places (`BUILD-CONTEXT.md:62-63`, and SAT's *"Play, Lesson, Puzzles, Home/Discover and Menu still have no
stories"*). **No document anywhere in the repo or the project enumerates ten screens** — I grepped every
`.md` in both. The 10 is a bare figure with no list, in the one document that calls coverage "the headline".
§5 reconciles them.

### 4.4 Three different figures for "regression assertions after #373"

| where | figure |
|---|---|
| `claude/stories/REGRESSION-CANDIDATES.md` | *"138 … + 30 (review373) + 3 (repro373) + k373 (10), mate373 (5), gallery373 (23) and playall373 (5) = **214**"* |
| `claude/RUN-LOG.md:42` | *"**194** in this sandbox's suite (gatelogs/373-all.log) + 30 review373 + 3 repro373"* = **227** |
| `claude/agents/SUPERVISOR-373.md:26` | *"**203** (gates/logs/373-all.log:263 … sum of the nine gate lines :28-262 = 203)"* |

**Which is correct: 203.** It is the only one taken from the gate's own footer, and I confirmed it:
`grep -c '^PASS' claude/agents/gatelogs/373-all.log` = **203**, and the file's footer line reads
`regression assertions (PASS lines): 203`. The 214 and the 227 are both hand-arithmetic over harnesses that
do not exist (`review373`, `repro373`) plus a 138 the supervisor note says is gone.
The internal arithmetic of the 214 is also self-inconsistent: 138 + 10 + 5 + 23 + 5 = **181**, not the 194
`RUN-LOG.md:42` uses for the same set.

**The current number, measured:** `claude/agents/gatelogs/378-all.log` — **272 PASS lines, 0 FAIL,
`GATES GREEN #378`**. Trajectory: 203 (#373) → 217 (#374) → 256 (#376) → 258 (#377) → **272 (#378)**.

### 4.5 One-way traceability on TC-R30

`TEST-CASES.md` maps `TC-R30 → US-R04`, but US-R04 in `USER-STORIES.md` cites only `[TC-R02]`. Every other
one of the 30 stories cites every case that names it. **Correct: US-R04 should read `[TC-R02, TC-R30]`.**
This is why the coverage line's "30 cases" looked right to whoever wrote it — from the story side, TC-R30 is
invisible.

### 4.6 The suite documents are stamped #373; the build is #378

Both project documents are headed *"Build #373, 2026-09-13"*, the repo `TEST-CASES.md:11` reads
*"Review - executed against #373"*, and `SAT-REVIEW-373.md` gives `app.js md5 9413e8d4`. The build under
audit is **#378**, `app.js` md5 **985d61643b88**. Five builds and one md5 apart. The repo suite's *gates*
have run on all five (272 PASS, green); only its *written results* are stale. The project suite has no result
after #373 at all.

### 4.7 The story-to-app mismatches in §3.8

`US-R06`'s verdict list names **Excellent** (not shown) and omits **Miss** (shown); `US-R12` names ply 18
(measured 19); `US-R23` names "2 mistakes" (measured "1 mistakes"). Three story criteria disagree with the
app, and no case is tight enough to have noticed.

---

## 5. The nine uncovered areas, ranked by risk

**How the two denominators reconcile.** The 6-screen list is Review, Play, Lesson, Puzzles, Home/Discover,
Menu. The app's actual surfaces, each confirmed by its own `data-ct` hooks in `chess.jsx`, are **ten**: the
6-list splits Home from Discover, and adds three flows the 6-list omits entirely — Play setup, Online, and
Account/import. Ten minus Review is the nine below. That is where "1 of 10" comes from; it is a defensible
denominator, it has simply never been written down.

Ranked on the three criteria asked for: **value behind it**, **likelihood a defect reaches Kunal**, and
**whether a gate could catch it headlessly**.

### 1. Play — the game screen (vs Computer and Pass & Play)
Value: the highest in the app. Review exists to explain games that were played here; every other screen is
upstream or downstream of this one. Reach: he is in it every session, on the one device that certifies.
Headless: proven — gates 10, 13 and 34 already drive it, so the harness cost is zero. What makes it first is
the gap between that and specification: **not one story, not one case**, and gate 34's own header records
that the antagonist pass on #378 *"found NO existing assertion that fails on this change"* for a feature
being restored into live play. Highest value, highest exposure, cheapest to cover.

### 2. Play setup
Value: it gates 100 % of Play's value — a broken setup sheet blocks the core loop outright. Reach: every
single game starts here, and it has a proven break history at short heights (A-13: the Computer sheet
scrolling 312 px on his phone, Start game at 931 of 679; still tracked at 375x640 by
`30-p1-fixes.js:67`). Headless: the best case in the whole list — it is pure geometry, which is exactly what
Chromium at six widths measures perfectly and jsdom cannot see at all. Ranked above Puzzles because a defect
here costs the user the whole session, not one feature.

### 3. Puzzles
Value: the daily-return loop, and the second thing he opens. Reach: high, daily. Headless: fully drivable —
gates 12 and 30 already enter puzzles and step them. Coverage today is two assertions (the hint header, and
Next/Previous before solving); the solve path, the wrong-move text (X-07, still open and ungated) and the
end-of-set behaviour are untouched.

### 4. Menu and settings
Value: disproportionate, because it holds the settings every other screen renders against — board, pieces,
colours, eval-bar placement, the Layout readout. One bad combination changes five screens at once. Reach: he
uses it actively (eval-bar placement is his own decision, #361; the Layout readout is his only instrument on
the phone). Headless: easy — `menu-sheet`, `menu-look`, `menu-evalgraph`, `look-board`, `look-pieces`,
`look-colours`, `layout-grid` are all hooked. Today only the sheet's bottom edge and the chip/link tap sizes
are asserted (gate 30), plus the ply-log gating (gate 32).

### 5. Lesson
Value: the "trainer" half of the product — Discover → lesson is what makes this more than an analysis board.
Reach: moderate; he goes there deliberately rather than constantly. Headless: proven (gate 11 drives the demo
and the practice phases at two geometries). Ranked below Menu because a lesson defect is local, where a
settings defect is systemic. History is real though: Y-01, Y-02 and the note-box readability all landed here.

### 6. Home
Value: navigational rather than functional; it is the first screen of every session, so a defect is seen
immediately — but it is mostly static tiles, so defect density is low. Reach: highest frequency, lowest
severity. Headless: trivial. Gate 30 already asserts the ☰ (A-04). Ranked here because frequency without
severity is a lower risk than severity with frequency.

### 7. Discover
Value: browse-and-enter for the lesson library. Reach: moderate. Headless: easy (`tile-ic-*`, and the tile
ink line y3 is the one thing Chromium genuinely cannot judge, per `UAT-PIPELINE.md`). Current instrumentation:
effectively none. Ranked below Home only because it is entered less often.

### 8. Account and import (Chess.com / Lichess fetch, stored accounts, rating exchange)
Value: high in principle — it is how real games get in, and `US-R02`/`US-R05` depend on it. Reach: real.
**But a gate cannot catch most of it headlessly**, and that is why it ranks here rather than at the top:
`UAT-PIPELINE.md` records that the network is blocked in the sandbox, so only the stored/seeded half is
reachable. That is precisely why TC-R04 and TC-R04b are the two cases stuck since #373 — SAT's own note is
*"harness seeding, not the app"*. Cover the seeded half (`game-row`, `gstat-est`, `gstat-rev`,
`gstat-esttag`, `bril-pill`, `bril-pill-est`, `bril-downgrade`, `acct-chips` all exist in `chess.jsx`), and
send the live-fetch half to the phone-recording exception.

### 9. Online and friends play
Value: real but unrealised — there is no server in the sandbox and the feature is behind sign-in. Reach:
lowest; he cannot use it in the certification loop today. Headless: worst in the list — only the lobby's back
button is reachable, and gate 31 already asserts it (`online-back`, ≥ 40 px, N-play-1). Last, on all three
criteria at once.

**What this ordering means for the next pass:** write Play first, then Play setup, then Puzzles. Those three
are the whole core loop, all three are already proven drivable by an existing gate, and between them they
carry more of the app's value than the remaining six combined.

---

## 6. The negative control — proving the 13 gates can go red

The 13 gates in `gates/regress/` have run green on five consecutive builds (203 → 272 PASS, 0 FAIL). Green
against a working build proves nothing about whether a gate would notice a broken one; `METRICS.md` says so
directly: *"The regression suite's health is measured by whether it fails against a deliberately broken
build, not by its green rate."*

Below is the smallest such set: **one one-line change to `chess.jsx` per gate**, each aimed at the property
that gate exists to protect, each applied and reverted on its own. Every line number and every quoted
expression was verified by `grep -n` against `/home/claude/gatescan/chess.jsx` at #378.

**These were designed, not run.** The clone is read-only and nothing in it was modified. The "expected red"
column names the exact assertion string that should flip, quoted from the gate. Run them one at a time, with
`CT_APP=/path/to/broken-bundle.js gates/gates.sh '#378'` against a trial bundle, never against the repo copy.

| # | gate | breakage (one line in `chess.jsx`) | expected RED assertion | collateral |
|---|---|---|---|---|
| 1 | `10-gameover` | `:5303` `label="Rematch"` → `label="Play again"` | *"row reads Review · Rematch, no Resign"* | none — `Rematch` appears as a label only at `:5303`, and no other gate reads it |
| 2 | `11-lesson` | `:4920` `lesson-note` style `height:75` → `height:95` | *"note box is 75px"*, and *"demo end board top is 92"* | none — `lesson-note` is read only by gate 11 (verified) |
| 3 | `12-hint` | `:5535` `pz-hint-head` style `WebkitLineClamp:3` → `WebkitLineClamp:1` | *"hint text not clipped (scroll … vs …)"* | none — `pz-hint-head` is read only by gate 12 (verified) |
| 4 | `13-play-after-moves` | `:5295` `play-moverow` style `height:30` → `height:boardGame.history.length>4?38:30` | *"Pass & Play board has ONE width and ONE top across five plies"* | **expected**: also reddens gate 1's board assertions (its mid measurement is at ~2 plies, its end at 7) — which usefully proves gate 10's *other* half |
| 5 | `14-uat-review-card` | `:4150` card step `id:'US-R07'` → `id:'US-R70'` | *"76 s: US-R07 analysis board with Undo and Exit"* | none — gate 15 counts captions, not ids |
| 6 | `15-gallery-playall` | `:4162` `l:'RECORDING COMPLETE — you can stop now.'` → `l:'ALL CARDS DONE.'` | *"the run ends on the RECORDING COMPLETE frame"* | none — gate 14's end check is `!cEnd` (caption cleared), which still happens |
| 7 | `20-review` | `:4995` Skills jump `const go=(idx)=>{…setPly(idx+1);}` → `setPly(idx)` | *"TC-R05 tapping the Skills number opens the review at 14.Rd1"* | none — no other gate taps a Skills number |
| 8 | `21-review-brilliant` | `:671` `if(d>=1.0)return 'Nothing else came close: '…` → `if(d>=99.0)return …` | *"TC-R10 the reason compares with the next-best move"* | none — gate 20's only reason check is `why.text.length>20`, which survives |
| 9 | `30-p1-fixes` | `:4189` `home-menu` style `width:46,height:46` → `width:38,height:38` | *"A-04 Home has a ☰ button of at least 40px"* | gate 32 also uses `home-menu`, but only to open the menu; a 38 px button still clicks, so 32 stays green |
| 10 | `31-antagonist373` | `:6017` `rev-badge-label` `left:Math.min(Math.max(x+SQ/2,SQ*0.9),boardPx-SQ*0.9)` → `left:x+SQ/2` | *"the verdict label on h7 is inside the board (was 16.5px out on #373)"* | none — gate 20's `badgesOutside` only inspects 50 %-radius elements, and the label is not one |
| 11 | `32-plylog` | `:2295` `const plyLogOnRef=useRef(false);` → `useRef(true);` | *"plies stepped with the switch OFF left nothing in the buffer"* | none — only gate 32 touches the ply log |
| 12 | `33-reproducible-review` | `:3009` pool guard `Math.max(20000,movetime*8)` → `Math.max(4000,movetime*8)` | *"the pool's stuck-worker timeout is at least 20 s"* — a static bundle check, so it fails in seconds | **expected and desirable**: verdicts rot at 4 s (this is the exact R-01/R-02 mechanism), so gates 20 and 21 may also redden. If they do not, that is itself a finding. |
| 13 | `34-takeback` | `:3491` `setGame(playHist[_tbIdx]);…setPlayHist(playHist.slice(0,_tbIdx));` → use `_tbIdx+1` in both places | *"the takeback gave back BOTH plies … so it is his move again"* (`pAfter===pBefore-2`) | none — only gate 34 drives takeback |

**Bonus (the 14th thing `gates.sh` runs).** `mountcheck.js` runs before the 13 and guards against a stale or
unmountable bundle. Its negative control is not a `chess.jsx` edit at all: run `gates.sh '#379'` against the
#378 bundle. `CT_EXPECT` defaults to `$1`, so mountcheck should reject the stamp mismatch in seconds. If it
does not, the gate that is supposed to catch "you are testing yesterday's build" does not work — and every
other result in the suite becomes unreliable.

**Two properties this set deliberately does not prove.** No breakage here targets gate 15's *"no card leaves
the page scrolling"* or gate 20's *"TC-R06 one board width and one top across plies 0/10/19/33"*, because
every one-line change that moves the board reddens four or five gates at once and isolates nothing. Those two
need a fixture-level control (a forced `min-height` on one card) rather than a source edit, and are left for
a second pass.

---

## 7. What I could not verify

Stated plainly, because everything above that is not in this list was measured.

- **The 5 recorded failures against #378.** Without `review373.js` there is no way to re-run TC-R04, TC-R05,
  TC-R06, TC-R12 or TC-R22 as written. What I could check by hand at #378: **TC-R05's cause is gone** (all 18
  zero chips are `disabled`), **TC-R06's five numeric claims all hold** (develops 4/10 and 2/10, castled
  `move 12`/`no`, checks faced 4 for Black, rooks 1 for White, and all nine rows carry a definition), and
  **TC-R12's behaviour works** (`rev-bestline` appears in under 3.5 s). TC-R04 and TC-R22 I could not reach.
- **The games list (TC-R04, TC-R04b).** `game-row`, `gstat-est`, `gstat-rev`, `gstat-esttag`, `bril-pill`,
  `bril-pill-est`, `bril-downgrade` and `acct-chips` all exist in `chess.jsx` (verified by grep), but none
  rendered in my runs because I did not seed `ct_accts` / `ct_acctgames` / `ct_gamestats` / `ct_ccuser`. The
  Review entry screen with no stored account carries **zero** `data-ct` attributes — measured.
- **The Skills-number tap (TC-R06's last clause, "the tap opens ply 27").** Not driven. It is asserted green
  by `20-review.js` at `:34`.
- **The `‹ Back to your analysis` return leg (TC-R24, TC-R25).** The Play setup sheet intercepted the Review
  tab tap in my run. The label is taken from the case text and is unconfirmed on #378.
- **`repro373.js`'s three assertions (TC-R30).** Re-implemented as gate 33 and green at #378; I did not
  re-run the two-context comparison myself.
- **Whether the prior audit's nine unmeasurable cases are my nine.** It published no criterion, so the counts
  agreeing does not mean the lists do.
- **All thirteen breakages in §6.** Designed against verified source anchors. None was applied; the clone is
  read-only and was not modified.
- **Geometry other than 375x730.** Every measurement here is at Kunal's phone. `UAT-PIPELINE.md` makes width
  a first-class axis across six bands; none of the numbers above has been re-measured at 320, 360, 390, 414
  or 440, and the pinned pixel values (349 board, 126x38 graph, 367.5x130 box) are width-derived and **will**
  differ there. Pin them as formulas, not constants, if they are to hold across the band.

---

## 8. What to do, in order

1. **Rename one of the two suites.** Nothing else in this report can be quoted safely until `TC-R05` means
   one thing. Suggest `claude/stories/REVIEW-SUITE-FULL.md` for the 30/31 pair.
2. **Either rebuild `review373.js` or fold the 31 cases into `gates/regress/`.** Prose that claims to be
   executed is worse than an acknowledged gap, and ten Review behaviours have no assertion anywhere (§0).
3. **Apply the nine replacement pass conditions in §2** — they are written against selectors that exist and
   values measured on #378.
4. **Run the thirteen negative controls in §6**, one at a time, and record the result as `METRICS.md`'s
   regression-agent quality number. Any gate that stays green is not a gate.
5. **Fix the seven counting inconsistencies in §4**, taking 1-of-6, 203-at-#373 / 272-at-#378, and
   30-stories / 31-cases as the correct figures.
6. **Start Play, then Play setup, then Puzzles** (§5).

```metrics
agent: suite-audit
build: 378
volume: 31 cases and 30 stories recounted, 13 gates read, 7 inconsistencies found
quality: 9 unmeasurable cases given measured replacements, 6 under-assertions given missing assertions, 13 negative controls designed
blocked: 0
note: the 31 cases have no harness on disk, so 0 of 30 stories has a result against the build under audit
```
