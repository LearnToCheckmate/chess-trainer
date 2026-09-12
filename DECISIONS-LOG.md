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
