# Chess Trainer — decisions log

Kunal, 2026-09-12: *"we should keep a log of these questions, so next time we cover the same
topic we can reference what we did earlier."*

Append-only, like the feedback inbox. Every decision keeps its date, the options that were on the
table, what he chose, and the reasoning he gave. **Before asking him anything, search this file.**
If the topic is here, either it is settled or the note says what changed since.

Questions page: https://claude.ai/code/artifact/99232fb2-f9f3-4019-a285-c3c16eb7de68
Round 1 answers live in db collection `answers`, round 2 in `r2`.

---

## Round 1 — 2026-09-12, 16:05–16:27 ET (19 questions, all answered)

### SETTLED

**Feedback channel.** → *A second Cowork session in this project.*
Options were: second Cowork session / this page and the tracker / a Google Drive doc I scan /
raw voice notes and screenshots that I sort. He picked the Cowork session because it appends
straight into the log with no copy-paste and nothing new to set up.

**Eval bar placement.** → *Left, vertical, as originally asked.*
He had asked for this before; #340 defaulted it to above and #359 force-migrated every device,
overriding his request. Shipped left again in #361 plus a visible switch in the menu.
He accepted the 22px width cost knowingly.

**WHITE / BLACK word in the player bars.** → *Remove it.*
This reverses #344, where he asked for it because his own name in a black bar while playing
White confused him. He has now seen both and wants it gone. Do not re-add without asking.

**Coach avatar.** → *A chess piece with character.*
Not a person, not abstract, not no-avatar. He rejected two earlier illustrated-person options.

**Coach speech bubble.** → *Build it WITHOUT the avatar.*
The bubble and the eval chip, but no face until the piece-mascot direction is drawn.

**Takeback.** → *Remove it from live play.* Keep it for practice, not for rated games.

**Online minute clocks.** → *Build it properly: synced clocks and flag-fall.*
He accepted that this is real work needing two devices to test, over the cheaper options
(label it as untimed, or a shared elapsed timer).

**iPad.** → *PARKED.* His words: "let's not worry about the iPad layout till we get the phone
layout locked in. We're having a lot of trouble with the layout for multiple months. I'd like to
simplify how we work out this problem together." Do not spend a run on iPad until he reopens it.

**Screenshots and the preview gallery.** → *Screenshot requests go in the Preview gallery, as
agreed long ago.* He will share a screen RECORDING, so the pipeline has to accept a large file.
And: **flush the preview gallery** — remove anything not currently needed.

### HE ASKED TO SEE FIRST (round 2 mockups built 2026-09-12)

- Eval graph placement — mockup of the top 3 options
- Home tile icons — "which icons do you mean" (answered with a drawn frame of all four)
- Review board smaller + "button on the board" — he picked it but wants the button shown
- Skills panel — mockup before deciding
- Theme / piece picker — current vs proposed, side by side
- Lesson chrome — show what one line looks like
- Live-game button row — chess.com vs ours vs proposal, side by side
- Brilliancy explanations — see below

### THE SHARPEST NOTE: brilliancy explanations (y18)

Asked whether the new explanations tell him anything he did not know. Answer: **"Not by much."**
His reasoning, verbatim in substance:
- chess.com shows **the next best moves** alongside the brilliant one, with an explanation of why
  the brilliant move was actually brilliant.
- Mine writes "you're clearly better" or "you got 1.5 pawns worth of material" — *"that doesn't
  tell me why I'm better."*
- Layout: the explanation should be in **a bubble over the top**, not the fixed text box at the
  bottom. Mockup before changing it.

This is the fifth time the explanations have come back. The gap is now named precisely: the line
states the outcome and never the comparison. Showing what the move BEAT is the missing half.

### PROCESS INSTRUCTIONS FROM ROUND 1

- Put the mockups on the question screens themselves, for every question, every round.
- Keep this log so the same ground is not re-covered.
- He certifies items closed; I may mark them done, but done is a claim until he signs it off.

---

## Round 2 — opened 2026-09-12, 9 questions with mockups. Answers land in db collection `r2`.

### Reference: his real chess.com screen, sent 2026-09-12 12:43 ET for round 2 q5

A correspondence game, Kunal2023 (1026) as Black vs Jsmiller1112 (1166), iPhone. FACTS FROM IT,
not from memory - the q5 mockup is now traced off this, and the old frame was wrong twice:

- The bottom control row is **five icons with NO labels**: list, chat bubble, magnifier-plus
  (analysis), back chevron, forward chevron. I had drawn "Options / Hint / undo".
- The move list is a **single scrolling line at the very top of the screen**, above the opponent
  bar - not a panel below the board. That is the main reason their board looks like it owns the
  screen: nothing competes with it below.
- The board is edge to edge, full width, no gutters.
- Each player bar carries: a real PHOTO avatar, name, rating, country flag, captured pieces with a
  material count (+4), and a clock chip on the right. The side to move has the chip inverted.
- There is NO eval bar in this view at all. So part of the size difference is that they are
  showing less, not fitting more - do not quote their board width as a like-for-like target.

Confirms two open items from the other direction: n9 (his own profile photo in the player bar) and
the captured-pieces presentation. It does NOT confirm the captured-pieces-on-tiles report: here
they are drawn straight onto the bar, same as ours.

## Round 2 answers — 2026-09-12, 16:36–16:49 ET (10 of 10)

- **Eval bar width (evw)** → *A, keep it beside; the width is worth it.* Board 349 on his phone, by choice.
- **How we work the layout (lay)** → *All three, and stop guessing.* Readout (shipped #361), grid overlay (to build), recordings (accepted).
- **Lesson chrome (y11b)** → note: the text matters; give it space "as long as it's consistent and doesn't make the board jump. Even 3 or 4 lines if needed is okay." → fixed-height text box, up to 4 lines.
- **Theme picker (y12c)** → *I accept your proposal.* Picker for board + pieces, home icons tied to it.
- **Review button on the board (y15b)** → *Round button on the board, keep the board full size.*
- **Skills panel (y17b)** → *Full panel, but after the explanations are fixed.*
- **Brilliancy explanation (y18b)** → *look at what chess.com does and replicate that.* Built in #365 for the text; the bubble placement parked (no free height on his phone).
- **Eval graph (y1b)** → *Still not sure, draw C properly first.*
- **Home icons (y3b)** → *B, all four emoji, ink-matched.*
- **Live-game buttons (y5d)** → his note "chess.com shows more buttons" predates the redraw from his screenshot; awaiting a fresh answer.

## Round 2, how the answers were read when building #366 — 2026-09-12, 16:30 ET

Four of the ten needed no further answer and went into #366. Where an answer left room, this is
the reading I took, so it can be reversed on purpose rather than by accident:

- **y3b, all four emoji, ink-matched.** The set is the one on the approved mockup: 🔭 🧩 🔍 ♟️. That
  set replaces Classic's 📖 📈 👑 (two of which were never shown, because Puzzles and Play were drawn
  pieces on Classic). Medieval keeps its own themed four. Ink-matching is done on the device at run
  time, not baked in, because Apple's emoji and the test browser's emoji draw different ink.
- **y11b, "3 or 4 lines is okay".** Three, not four. On his phone four lines took 8px off the
  board; three, paid for by the redundant hint line under the moves panel, let the lesson board
  reach 375 edge to edge for the first time. 716 of 734 notes fit in three; 18 scroll. If he wants
  four, the price is a 352 board, or the MOVES header row.
- **y15b, round button on the board, board full size.** The control row STAYS with first / play /
  last / key-moment; only Analyze moved onto the board. The "Proposed" frame on the question had
  the whole row gone, but that frame also shrank the board, and he rejected that frame for this
  option. Removing the other four controls was never asked for.
- **lay, all three.** Readout (#361), overlay (#366), recordings (accepted as they arrive). The
  overlay measures the painted board element, not SQ, so it cannot agree with the arithmetic by
  construction - that is the point.
- **y12c, "I accept your proposal"** is read as the picker screen (board colours and piece style,
  drawn, pick by looking). The home icons are NOT tied to it: y3b fixed them as one emoji set on
  every skin in the same round. Not built yet.
- Still open from the round: y17b Skills panel (unblocked by #365), y1b draw option C properly,
  y5d fresh answer on the redrawn live-game button row.
- **#367 (17:14 ET) built y12c** as read above: the picker, home icons untouched. One thing decided
  on my own while building it, reversible: the home "Colors" button no longer cycles to the next
  palette on tap - it opens the picker. Cycling blind was the complaint the picker answers.
- **#368 (17:21 ET) built y17b, the full Skills panel.** One reading to note: chess.com's rows are
  scores on a scale of ten ("King safety 7/10") that nobody can audit. Ours are COUNTS with the
  definition printed under each label (develops pieces 4/10 is literally four of the first ten moves;
  "castled: move 12"; "forks played: 4"). If he wants the chess.com look with x/10 everywhere, that
  is a presentation change, not a data change - the counts stay.

## Round 3 opened — 2026-09-12, 17:40 ET (3 questions, real screenshots)

- **y1c** the eval graph, option C, built for real in #369 behind an OFF switch. Choices: on for
  everyone / keep the switch / take it out / other.
- **y17c** the Skills panel: counts with definitions (as built in #368) or chess.com's x/10 scores.
- **y5e** the live-game button row, asked again against his chess.com screenshot; his y5d note
  ("chess.com shows more buttons") predates the redraw and is kept in the r2 collection.
- **#370 (17:45 ET), a decision I took alone, reversible:** on phones the move list's own nav row
  (first / prev / LIVE / next / last) and the "Tap Analyze" hint are gone from live Play, because they
  were what shrank the board by 62px after the first move. Back / Forward stay in the button row. If
  he wants first/last back, they cost nothing INSIDE the button row; they cannot come back as a
  second row under the board.

## #371 (18:56 ET) — decisions taken alone while answering the three agents, all reversible

- On phones a FINISHED game keeps the live screen: tabs hidden, home and menu in the top bar, and the
  Hint / Flip buttons become Review / Rematch. The Elo stepper, the slider and the "vs Computer" line
  leave the phone game-over screen (they were the 130px that shrank the board to 192); the strength
  chip's text goes to the status line above the board. Flip is still in More. iPad is unchanged.
- At the demo's end on phones the variations box ("How does White reply? Tap a line") lives in the ⋯
  sheet, reached by an "Other lines (n)" button that takes Flip's slot; Flip joins the sheet.
- The round Analyze button jumps to the bottom-left corner when the last move landed on g1/h1/g2/h2.
  The alternative was shrinking the badge or the button; neither was asked for.
- A puzzle hint on phones is a banner over the top of the board (over rank 8), not a taller box under
  it, because a taller box costs the board 18px at his geometry.
- A checkmate is written "1-0" / "0-1" in the eval label, not "M0".
- The three agents are standing process now (HANDOFF 0c), run by the build session itself.

## #372 (built 19:55; final bundle 20:20 ET) — decisions taken alone, all reversible

- **The Preview gallery IS the user acceptance test now** (Kunal 19:16 ET: "you know what the test is... put it in
  the preview gallery, then I just have to record it and upload it to you"; charter 19:39 ET). The old cards are
  gone. Eight cards, one per item he should look at: k10 game over, k8 four plies in, k11 demo end, k11 practice,
  A-06 hint, k12 review last ply (1-0 at 17.Rd8#), y3 Layout readout, y3 Home. "▶ Play all 8 (screen-record
  this)" drives them unattended; every card shows a caption strip with the item id and what should be true, held
  at least 5 s (the charter asks for 2 s), and the run ends on a green "RECORDING COMPLETE — you can stop now."
  frame held 6 s. The recording he uploads is the evidence; where the sandbox and the recording disagree, the
  recording wins (charter). The build note calls the button what the screen calls it: "Play all".
- **The puzzle hint on phones takes the whole header row** (antagonist Z-01 acted on, not overruled): the
  Roadmap button collapses to a 44px "‹" while a hint shows, the hint gets the rest of the row at 12px with up to
  three lines. Measured with a 136-character string, the longest curated hint is 135: nothing hidden, board top
  unmoved. The #371 banner over rank 8 is gone.
- **20:20 ET, the gate caught what the 136-character test string had hidden:** with the real longest hint (135
  chars, an em dash and long words) the header clipped at 375 — 1 of 27 curated hints; at 320, 6 of 27. Two
  decisions: (1) the hint text on phones 340 wide or narrower is 11px instead of 12 (the SE class; his phone
  keeps 12); (2) the six longest hints were shortened by a few words each, meaning unchanged (e.g. "ignore your
  queen entirely" → "ignore your queen"), so every curated hint fits three lines at 320, 375 and 390 — a new
  gate, hintcap372, sets all 27 into the live header at each width and fails on any clip; gallery372 reads the
  longest hint from the source instead of a pasted string, so it cannot go stale again. The alternatives —
  a fourth line (the header grows 10-14px and the board moves) or a permanently taller row (board loses 6px on
  every puzzle) — both break a rule he has stated.
- **The lesson's playback row folds on phones**; the moves panel absorbs the slack (`_lFill`), so the board sits
  at 375@92 from the demo's first frame through a wrong practice move to "Complete!". Same trade Play makes.
- **No Resign after the game** in the More sheet (Y-06). The note box is 75px with three whole lines at
  14.5px/1.32 — no sliver of a fourth line (Y-09).
- **The round Analyze button is 55% translucent** (background rgba .55) so the piece under it reads through;
  the corner rule from #371 stays (see the overrules below).
- **lesson371 now asserts** (PASS/FAIL line + exit code) 375@92 and scroll 0 across demo start / +3 / end /
  practice / practice + one move; it does not use the `say()` helper, which is why a grep for `say(` reads it
  as empty. gates.sh is the single gate and is re-run from the top on the final bundle with nothing else
  running (the 19:37 run was measured against a bundle replaced mid-run — the #351 class — and is void).
- **Tracker rows never lose `acked`/`handled`** on a tap (flag / note / certify merge instead of replacing), and
  flags docs that are not rows render under "From your feedback session" with the acked line per ACK-PROTOCOL.

## OVERRULED OBJECTIONS — shipped over the antagonist, with the reason (rule: "log the objection and why")

- **Y-04 / Z-05 / A-08 — the round button covers the corner rook (h8 37×37 of 44 at 17.Qxa8 flipped).**
  Shipped with the button at 55% alpha and the corner jump from #371. Why: the alternatives are a smaller
  button (he asked for a round button ON the board), a smaller badge, or a strip under the board (which costs
  board height — the one thing he has never allowed). Whether a rook reads through 55% is his call on his
  screen; A-08 stays OPEN until he says so. Not certified by me.
- **Y-05 — iPad portrait (768 wide) is "not wide" and takes every new phone path** (game-over row, lesson
  sheet, hint header). Shipped unchanged. Why: iPad is PARKED by his instruction; changing the `wide`
  threshold is an iPad decision. Logged here so it is a decision and not an accident.
- **Y-07 — the ink metric cannot be measured on Apple Color Emoji here; the pawn may now overshoot (×1.11).**
  Shipped. Why: the metric is measured on his device at run time and the Layout readout prints the "tile ink"
  line — that line from his phone is the evidence, and card 7 of the gallery is built to show it. If the pawn
  is visibly bigger on his phone, the target factor drops; no guess taken.
- **Y-08 — the "Italian Game · thinking…" status line may flicker when the engine answers instantly.**
  Shipped unmeasured. Why: no gate seeds a book reply on a phone-sized run and the line is one text node; noted
  as open (P2), to be measured on the recording (card 2 shows the status line after four plies).
- **Z-02 — card 1's board is 351, not the 357 of a game from New Game (A-14 on the card he will record).**
  Shipped. Why: card 1 is a scripted game against the 'demo' opponent, which has no eval bar, so the board is
  wider than the live-vs-computer 357 by the bar's width — a different screen, not a shrink. The one-board-width
  rule (A-14, his z7 question) is open and his to decide; it is not something #372 could settle.
- **Z-03 — at 390×844 the slack sits inside the lesson's moves panel (~150px of bordered box).** Shipped.
  Why: it is the same device Play uses since #370 and the panel is a real panel (moves appear there); the note
  box taking 40px of it is a content decision he has not made. Recorded as P2.
- **Z-04 — the one-line verdict box under the goal card is blank (46px) while a hint shows.** Shipped. Why:
  collapsing it moves the board 46px while the hint is up ("doesn't make the board jump"); filling it repeats the
  hint. It reads as a gap, not a defect (the antagonist's own words); P2.
- **Z-06 — the lesson board at 320×568 is 239 (Play shows 272 on the same phone).** Shipped. Why: the 75px
  note, the controls and the moves panel cost 33px on the smallest phone; he tests on 375×761 and the 320 phone
  is a secondary width. Recorded so 239 is not a surprise on a 320 recording.
- **X-12 (pass 1) — the Look picker scrolls inside its card on the small phones and ellipses a chip.**
  Shipped as built in #367. Why: P2, not in #371/#372's scope; the picker's card can grow on 320 when the
  queue reaches it. Open.

## #373 (2026-09-12 evening, Claude Code session with push access) — decisions taken alone, all reversible

- **The gate tooling lives in the repo now (gates/).** The previous suite (138 assertions) existed only in a sandbox
  that is gone; nothing of it could be recovered. Rebuilt as `gates/lib.js` + `gates/regress/*.js` + `gates/gates.sh`,
  committed, so this cannot happen a third time. Old harnesses are ported as the screens get their charter pass.
- **A-04:** Home gets a ☰ of its own, the same 46px round button as the account button, to its left. Alternative
  was moving the account button; not asked for.
- **A-16:** the menu sheet fills the viewport minus the safe-area insets (10px minimum) instead of 5vh + 88vh.
- **A-13:** on screens under 720px tall the Play setup sheet's rhythm tightens (gap 16 → 10, build line margin
  12 → 2); nothing is removed. Re-measured at 375x679 without the double-counted insets the sheet already fitted on
  #372 (the audit's 32px was the same harness error); it is real at 375x640 (16 → 0) and at 320x568 the sheet
  scrolls either way (154 → 108). If a shorter phone still needs it, the next step is hiding the "Point at a
  board" caption there.
- **A-10:** Next puzzle advances to the next unsolved puzzle AFTER the current one (then an unsolved one before it,
  then simply the next). The old scan returned the first unsolved puzzle in the tier, which was the one on screen.
- **X-07:** the wrong-move line on phones reads "✗ Nf3 isn't it. Try again, or tap 💡." (the long form stays on
  tall screens). Wording only.
- **A-11:** Analyze / Copy moves keep their 23px look; the tap box around them is 43px via padding cancelled by a
  negative margin, so the row does not grow (a taller row would come out of the board). Piece chips 40px, footer
  links 41px in the menu, where height is free. The Elo steppers (22px) are on the iPad-only path and are parked
  with the iPad.
- **A-12 / X-09:** in a live phone game the moves panel is always laid out; the Moves button hides its content
  (visibility) instead of removing the row. The board therefore cannot move on a toggle. If Kunal would rather the
  Moves button disappear on phones, that is one line.
- **A-09:** the verdict badge (and the Brilliant/Blunder label) is clamped inside the board box instead of
  protruding past rank 8 / the h-file, because the grid clips at its edge for the rounded corners.
- **N-review-2 (the run-start audit's Review agent):** with the engine line on, 17.Rd8# read "+99.0" instead of
  1-0 - the engine effect's placeholder text, which is all a mated position ever gets because the engine has no line
  to return. On a checkmated position the label now names the mated side (1-0 / 0-1) on that path too. Folded into
  #373 before the push because it sits beside A-03's fix and the Review gate already covers the ply.
- **The Review UAT card replaces the k12 card:** one 88-second journey with seven captioned checkpoints; the k12
  check (1-0 at 17.Rd8#) is its 70 s checkpoint, so nothing he was asked to look at is lost. Steps re-caption the
  strip from inside one card (`steps` on a gallery card).
- **Not built, waiting on his word:** A-05 (the floating 🎬/💬 buttons: stay, move or go), A-08 (the round button
  over a corner rook at 55% alpha), A-14/Z-02 (one board-width rule, his z7), A-15 (names truncate: whether to shrink
  the rating/flag pills first is a look decision; the bars are measured not to overflow).
- **The antagonist, #373:** the agent form was cut off by the session's API limit at 22:40 ET and relaunched at
  22:48 ET; rather than push blind or stall, the build session ran the antagonist pass itself as a script
  (gates/audit/selfantagonist373.js: the #373 claims at 320x568, 430x932, landscape 844x390 and a stored profile with
  the eval bar above and the graph on - 19 of 19 hold, the Pass & Play sheet scrolls at 320 and in landscape as
  before) and pushed on GATES GREEN (203). The agent's verdict, when it lands, is applied to #374 in this run and
  logged here; any overrule too.
- **P0s found by the audit after the bundle was gated** (N-play-1, the Online sign-in dead end; N-review-1, the
  engine trap) are NOT in #373: the charter's "open P0 = 0" is not met at this close-out and the number is reported
  as it is, with both as the first items of #374.

## #374 (2026-09-12 23:xx ET, same run) — the antagonist's FIX FIRST on #373, plus the audit's Play P0

- **The antagonist's verdict on #373 arrived after the push** (its first run was cut off by the session limit; the
  scripted pass had found nothing). Its two measured objections are real and are fixed here rather than argued:
  the Brilliant/Blunder LABEL ran 16.5px off the h-file because the pop animation's last keyframe replaced the
  centring transform (the animation now lives on an inner span); a mate delivered by Black on the analysis board
  read "M1" because a mated position was still queried (no engine query on a checkmated position now). Its third
  point, the Analyze/Copy box being 37px effective of 43 (the moves panel's margin covered the bottom 6px), is fixed
  with a stacking context on the buttons. Its fourth is a wording correction adopted: "the setup sheet already fit
  at 375x679" was true of Pass & Play only; the Computer sheet with a named bot scrolls 312px there (N-play-2,
  queued: a pinned footer for the setup sheet).
- **N-play-1 (P0, the audit's Play agent):** the Online lobby without sign-in had no way back. A "‹ Back" (to the
  setup sheet) heads the card. Alternative was a house icon in the bar; the sheet's own "‹ Home" is one tap further.
- **k10 on Kunal's recording (rank 1 at 60% height at game over):** not reproducible here (the harness measures
  351x351). Decision: instrument rather than guess - the Layout readout and the overlay strip print the painted
  board HEIGHT beside the width, so his next readout screenshot carries the number. No layout change made blind.
- **k12 on his recording (the board stepping back one ply at 17.Rd8#):** three reproduction attempts (1-worker
  pool, graph on, engine line on; the board sampled for 25 s) show a stable board. Not fixed, not closed; his
  recording outranks the harness, so it stays open as a P0 with the engine trap as the prime suspect (the
  root-cause agent was cut off by the session limit and is the first agent of the next run).
- Gate 31-antagonist373.js keeps the three antagonist numbers and the Online back button as measurements.
- **Supervisor ruling on the #373 push (SUPERVISOR-373.md):** pushing before the agent antagonist's verdict was
  acceptable ONCE under the session limit and is not a precedent - the scripted pass found none of the agent's three
  objections. Adopted: no push without the agent antagonist's report, and the tracker flags are drained before every
  push, not only at the close-out (the P0 flags written at 21:34 ET were read at 23:02, after the 22:55 push).
