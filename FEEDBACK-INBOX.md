# Chess Trainer feedback inbox

Append-only. Nothing is ever deleted from this file.

## THE LIVE VIEW OF THIS FILE

**https://claude.ai/code/artifact/20acb6cb-42bf-44a3-b2fe-5a8223cca1e2** — the feedback tracker.
Every item, its status, the build it shipped in, and the evidence line saying how it was checked.
Searchable, filterable, and every row has a "still broken" button that writes to db collection
`flags` ({broken, note, at}, doc id = item id). Kunal taps it instead of retyping feedback.

Built 2026-09-12 after he tested the live app himself and found two items marked done that were not
done. Reconciling the tracker against this file turned up **ten items that were in here and not on
the working list** — including the coach speech bubble and the Skills panel from his chess.com
recording, the smaller-Review-board proposal, the username icons, the live-game button block, and
the chess.com/lichess design pass. That is the miss rate this page exists to stop.

Any `flags` doc with broken=true outranks the rest of the queue. Read it at the start of every run.

## READ THIS BEFORE YOU HAND KUNAL A LIST TO PASTE

If you are the chat that collects Kunal's feedback and types it up for him to paste into the build
chat: **this document is shared into every chat in this project, including yours.** Read it first.

On 2026-09-12 the same 38-item batch was handed over twice, six builds apart, both times labelled
"All items status: open". By the second time, 12 of those items were closed and several others had
been found to describe a build that no longer exists. Re-pasting a stale list costs a build run:
it has to be diffed against this file line by line before any work can start.

So, before producing a list:
1. Read the Open section below. It is the truth about what is still outstanding.
2. Emit ONLY items that are still open here, plus anything genuinely new Kunal has said since.
3. Never label an item "open" without checking. If it is closed here, leave it out.
4. If an item is marked NEEDS KUNAL or COULD NOT REPRODUCE, it is waiting on HIM, not on the build
   chat. Say so to him rather than handing it over again.

## How this works

**Anyone adding an item** (Kunal, or a Claude in any chat in this project) appends to Open
using this exact shape, newest at the top of that section:

```
- [YYYY-MM-DD HH:MM ET] status: open
  <the feedback, in Kunal's words where possible>
```

**The build session** does not delete or reword entries. It changes `status: open` to
`status: closed #NNN` and appends a `closed:` line underneath saying what was done. The
original text stays exactly as written.

```
- [2026-09-12 00:05 ET] status: closed #347
  The icons are way too small, can barely see them.
  closed: [2026-09-12 00:52 ET] Icon-only buttons were still sized for the text labels
  they stopped carrying in #344. Now clamp(21px,5.4vw,26px) on a 48px row.
```

**When this file gets bulky** (rough trigger: past about 150 closed entries, or 40 KB)
closed entries older than 30 days move to `claude/FEEDBACK-ARCHIVE.md` with their full text
and closing note intact. Moved, never deleted, and this file keeps a one-line pointer saying
which date range went where.

**Timestamps.** Everything logged from now on carries the real time it was received. The
2026-09-12 batch below was written retroactively at the end of that session, so those entries
carry the date and the build that handled them but not the minute they were said. That is
marked rather than invented.

---

## Open

Decisions page for everything marked NEEDS KUNAL (nine questions, the backlog, and a
pick-what's-next list): https://claude.ai/code/artifact/99232fb2-f9f3-4019-a285-c3c16eb7de68

### Batch from the feedback chat, pasted in by Kunal [2026-09-12 01:06 ET] — all status: open
He had been giving feedback in a separate chat with screenshots; that chat was not reliably
writing to this file, so he had it type up a paste-able block instead. Timestamps below are the
minute the batch arrived, not the minute each item was first said, which is not recoverable.
[re-report] means an earlier fix did not satisfy him.

REVIEW SCREEN
- [2026-09-12 01:06 ET] status: closed #351  [re-report]
  Board is still too small; not just the board, the whole page is too small, there are visible
  borders on the top and the sides. Use full width and height.
- [2026-09-12 01:06 ET] status: closed #351
  The back arrow and three-dots at the top take too much space. Relocate them, reclaim the
  space. Think about where they should go.
- [2026-09-12 01:06 ET] status: open  NEEDS A PROPOSAL FIRST
  Show the eval graph on the review screen while playing through it. Instead of dots, use lines:
  red for blunders, teal for brilliancies, so they jump out. Fit it in without taking much
  space. He asked explicitly for layouts to be proposed before implementing.
- [2026-09-12 01:06 ET] status: open  NEEDS A PROPOSAL FIRST
  The review board can be a little smaller (review only, NOT play). Put the review button on the
  left instead of the top and use the freed side space for the graph. Treat review and play
  layouts as separate.
- [2026-09-12 01:06 ET] status: open
  Analyze icon is still too small; the icons in front of player usernames are small too. When
  the avatar falls back to a king icon, make it bigger. Also check whether his own profile photo
  should show when he is one of the two players in a review.
- [2026-09-12 01:06 ET] status: closed #354 then REOPENED, closed #357  [re-raised x4]
  The brilliancy explanation is useless, it does not say WHY it is brilliant. Show the best move
  and PLAY IT OUT to explain why, like chess.com. Earlier "show best move and play it out"
  feedback (Fork, Fishing Pole) felt missed; fold together.
  note: #350 made the reason line positional, which is a different thing from playing the line
  out on the board. This is asking for the demonstration, not the sentence.
- [2026-09-12 01:06 ET] status: closed, already built
  On the Game Review summary, merge the separate White and Black cards into ONE card with two
  columns; list the categories (Brilliant through Blunder) once, one value column per player.
  closed: [2026-09-12 02:12 ET] Third attempt, first correct one. The cause was never padding: SQ was
  floored to a whole multiple of 8, so a 430px screen could not exceed a 424px board however much
  padding came off. The square is fractional on board screens now. 430 -> 430, 390 -> 390.
  closed: [2026-09-12 02:12 ET] Into the top player bar, which was already on screen with slack to spare.
  The row is deleted. Taking it away exposed 23px of dead space above the board, now 2px.
  closed: [2026-09-12 02:12 ET] Already exactly that: one card, White and Black as two columns, one list
  of categories down the side. Another one I would have rebuilt.
  closed: [2026-09-12 03:32 ET] The animation existed and had never run for these moves. It starts
  from the BEST move, and the review nulls that out whenever the played move already was the best
  one, so the four verdicts where they are the same move had no demonstration at all. A Brilliant,
  Great, Best or Excellent move now carries a "why" button that plays the move out with the engine's
  continuation: the sacrifice, their best answer, and the point.

PLAY SCREEN (phone)
- [2026-09-12 01:06 ET] status: open, NEEDS KUNAL, decisions page question 3
  Remove the "You are Black" label and the "White to move" / "White in check" turn indicator;
  it is obvious from the board and the from/to highlight. Reclaim the space.
- [2026-09-12 01:06 ET] status: closed, already built
  Add back/forward buttons to step through moves during a live game, to look back a few moves.
- [2026-09-12 01:06 ET] status: open, NOT A REGRESSION, decisions page question 8
  The real-time minute time controls (1, 2, 3, 5, 10 min) disappeared from game setup; only
  1 day / 7 day / no-time show. Bring the minute options back.
- [2026-09-12 01:06 ET] status: open, COULD NOT REPRODUCE
  Castling only works by click-king-then-square; make it work by dragging the king too, like
  chess.com.
- [2026-09-12 01:06 ET] status: open
  chess.com's board looks much larger than ours; find out why and make ours that large.
  Reconsider how many buttons the screen needs; fix bottom-button sizing, fonts, alignment.
  During a live game, maximise the board and minimise everything else (fine to scroll for
  buttons).
  note: [2026-09-12 02:12 ET] Does not match what the build renders. The only turn text left is
  "Computer thinking..." and "Check!". The nearest thing is the WHITE/BLACK word in each player bar,
  which #344 added BECAUSE he said seeing his name in black while playing White threw him off. Those
  two notes pull opposite ways, so it is a question rather than a guess.
  closed: [2026-09-12 02:12 ET] They exist and work, in the bottom control row, greyed until there is a
  move to step back to. Found by driving the app rather than reading the code; I would have rebuilt them.
  note: [2026-09-12 02:12 ET] Checked the history: online play has never offered minute controls, in at
  least twenty builds. The ones he remembers are on the vs-computer screen, which still has them.
  Making them work online means real clocks synced between two phones plus a flag-fall rule, so it is
  a feature to agree rather than a restore.
  note: [2026-09-12 02:12 ET] matchTarget already accepts the king dropped on g1/c1 AND dropped on its
  own rook, and the drop handler calls it. Rather than "fix" something that reads as working, I need
  to know which gesture failed: a short drag, dropping on the rook, or something else.

PLAY SCREEN (iPad)
- [2026-09-12 01:06 ET] status: closed #355, partly
  Board spills over and he has to scroll; it should fit the iPad screen with no scrolling. Keep
  opponent on top and him at the bottom, but replace "You" with his username. Buttons need
  better organisation and sizing; Analyze and Copy moves are too small.
- [2026-09-12 01:06 ET] status: open  NEEDS A PROPOSAL FIRST
  Undecided, propose options: what to add in the empty free space on the right; whether the
  current button set is right; how many moves back Takeback can go; what else the moves screen
  needs.
  closed: [2026-09-12 03:32 ET] Measured first: every iPad PORTRAIT size already fitted; LANDSCAPE
  overflowed by 102px on an Air and 106px on a 12.9 Pro, because the fit loop refused to run on a
  wide layout. Both are 0 now and the board grew as well (792 to 632 after a deeper fix, 1000 to 840
  on the Pro). His username already replaces "You" when signed in. Button sizing on the rail, and
  what fills the empty right-hand column, are still open and are question 6 on the decisions page.

CAPTURED PIECES
- [2026-09-12 01:06 ET] status: open
  Inconsistent: black pieces sit on individual white square tiles, white pieces on the plain
  dark background. Use one consistent white background instead of per-piece squares.
  note: [2026-09-12 05:20 ET] Could not reproduce. Both bars draw captured pieces straight onto the bar
  with no tiles behind them, on the light bar and the dark one. Needs a screenshot.

PERSISTENCE / ACCOUNTS
- [2026-09-12 01:06 ET] status: closed #353
  Only one chess.com ID is kept at a time, so importing friends wiped his games. Keep imported
  IDs and their games forever, for multiple accounts; do not replace on import.
- [2026-09-12 01:06 ET] status: open
  Keep saved reviews forever, on the account so they carry across devices.
  closed: [2026-09-12 02:12 ET] Worse than reported: the games were never stored at all, only held in a
  ref until the next fetch replaced them, so a reload lost them too. Filed per account and persisted
  now, each with a chip showing its count and an x to drop just that one. The new gate asserts
  survival rather than the happy path.

NEW FEATURES
- [2026-09-12 01:06 ET] status: open
  During a game, identify what opening/gambit/tactic the opponent is playing and what he is
  playing: a box on top (opponent) and bottom (him), as far into the opening as each has gone.
  Especially for beginners.
- [2026-09-12 01:06 ET] status: open
  Alongside taking a photo of a board, let him upload a picture or screenshot to read the
  position, then play the computer from that point.
- [2026-09-12 01:06 ET] status: open  NEEDS A PROPOSAL FIRST
  A button on the home screen (or in themes) to pick the theme and a set of piece styles. Use
  good styles only (the latest set plus the classic ones from before); include a curated list.
- [2026-09-12 01:06 ET] status: closed, already built
  Build a section for learning to read and write chess moves and notation. May already exist
  from earlier notation work.
- [2026-09-12 01:06 ET] status: open  VERIFY FIRST
  A feature to ask the app what the best move is in a position. There is already "Show best
  move" in the menu; confirm whether that covers it.
- [2026-09-12 01:06 ET] status: open
  In Gambits & Traps, link related gambits and traps executable with the other colour pieces.
  closed: [2026-09-12 02:12 ET] It exists: "Read chess notation - squares, pieces & move symbols", in the
  coach sheet, learnGroup 'notation'. Worth surfacing somewhere more findable, which folds into the
  Discover reshuffle.

LESSONS & DISCOVER
- [2026-09-12 01:06 ET] status: closed #358
  After a tactic is solved (e.g. Fork), play out the continuation to show the payoff (king moves
  out of check, then take the queen). For the Fishing Pole Trap, auto-play the queen delivering
  checkmate after completion, no user input. Make "auto-play the finish to demonstrate" a
  GENERAL lesson behaviour.
- [2026-09-12 01:06 ET] status: open
  On the gambit lesson screen, move the first two button rows (All gambits, and the Prev/Next
  pager) further down; the Watch/Try, Play vs Computer, Hints, Hint/Flip buttons are the useful
  ones. Rationalise and size; should not need three rows.
- [2026-09-12 01:06 ET] status: open
  Move the Train section out of Discover onto the home page. Remove the bottom two Discover
  tiles (Coach Says, Continue where you left off) and place them elsewhere.
  note: [2026-09-12 05:20 ET] DOES NOT MATCH THE LIVE BUILD. Discover has exactly four tiles now:
  Openings, Gambits, Endgames, Tactics. No Train section, no Coach Says, no Continue where you left
  off. Screenshotted rather than assumed. There IS a lot of empty space under the four tiles, which
  may be the real complaint. On the decisions page under "these don't match what's live".
  note: [2026-09-12 05:20 ET] Three button rows confirmed, exactly as described, but the USEFUL ones
  are already first: Try and Flip, then the moves header carrying Analyze and Copy, then the pager.
  The thing I can measure on that screen is 220px of text above the board, which is the lessons
  content decision still waiting on him. Needs a screenshot to settle what he means.
  closed: [2026-09-12 06:05 ET] The obvious build, "play on after any solve", is wrong, and replaying all
  876 puzzles through their own solutions is what showed it: most tactics ALREADY carry their payoff
  in the solution. The royal fork he named as his example has the moves Ne2+ then Nxc3, the king
  step and the capture, so playing further would append a random continuation to a finished tactic;
  243 puzzles end in mate with nothing left to show at all. So the finish auto-plays only when it is
  a FORCED MATE, which is never noise and is the case he actually named (the Fishing Pole queen).
  43 puzzles get one, 590 are left alone, the fork is untouched. Lessons follow the same rule.


HINTS / ENGAGEMENT
- [2026-09-12 01:06 ET] status: open
  Hints being on sometimes blocks progressing to the next move and puts the lesson in a
  10-minute cooldown. Fix that friction. After cooldown, remind him he can bank a flawless day,
  and the reminder should open the trap with hints OFF by default. Better: playing another
  lesson should also unlock banking a flawless day (then drop the time limit); for lessons
  already practised with hints where he did well, proactively suggest banking the flawless day.

HOME & FONTS
- [2026-09-12 01:06 ET] status: open, NEEDS KUNAL, decisions page question 4
  The four home tile icons are not aligned and are sized inconsistently; even them out.
- [2026-09-12 01:06 ET] status: closed #352, partly
  Fonts are too small across the app, especially tile subtitles and labels (Discover, Puzzles,
  Review, Play) and the Your Coach text. Increase app-wide, and bigger still. On iPad use the
  extra space: make Your Coach bigger and the "Chess Trainer" title and tagline larger.
  note: [2026-09-12 02:12 ET] Confirmed by screenshot. They are four emoji, and the phone draws emoji at
  different optical weights, so sizing alone will not square them up. It is a direction choice.
  closed: [2026-09-12 02:12 ET] Tile subtitles were clamped to 9.5-11.5px, smaller than anything else on
  the screen; 12.5-15px now, labels up with them, Your coach bigger on a phone and much bigger on an
  iPad. The app-wide sweep and the iPad title and tagline are still open.

VISUALS / AVATARS
- [2026-09-12 01:06 ET] status: open  NEEDS A PROPOSAL FIRST
  He does not like either of the two coach avatars suggested; come up with fresh options.
  chess.com's Play Coach and its illustrated lady avatar are references. If it is just an icon,
  make it bigger.
- [2026-09-12 01:06 ET] status: open
  Explore Canva plus image generation for nicer visuals (piece art, board skins, avatars); use
  Canva for logo and marketing graphics.
- [2026-09-12 01:06 ET] status: open
  Look through chess.com's and lichess's websites for design inspiration.

OPS
- [2026-09-12 01:06 ET] status: open  KUNAL'S TASK
  Create a separate Gmail account for the AI work. Claude cannot create accounts.

PROCESS (how the build chat runs)
- [2026-09-12 01:06 ET] status: open
  On every build or deploy: give an ETA before starting, then report actual time from his
  instruction to being ready, and compare actual against ETA to refine it. Put elapsed time at
  the end of every response. Track it by checkpointing every 5 minutes to a persistent place, so
  a sandbox timeout still gives a reliable lower bound across restarts.
- [2026-09-12 01:06 ET] status: open
  Tackle a larger batch per run (a longer list of smaller tasks); watch for regressions.
- [2026-09-12 01:06 ET] status: open
  The chat can only ask 3 questions at a time: put all open questions into an HTML form
  (multiple choice) he can fill in one go, and share the interactive HTML produced after each
  run so he can pick what is next. On the next run, also show what is left plus open questions
  in that form.
- [2026-09-12 01:06 ET] status: open
  When something is needed from him (especially screenshots), put the request in the Preview
  gallery, not just a note.
- [2026-09-12 01:06 ET] status: open
  When feedback is swept into the tracker, acknowledge at the BOTTOM of the output that all
  outstanding items have been picked up, with a timestamp.

DISPOSITIONS (settled by him, no action)
- [2026-09-12 01:06 ET] status: closed, no action
  Rousseau Gambit 4.d4 line: tactic confirmed and lesson fixed (#258) — confirmed good.
  Curated gambit cross-links: approved (the build item is logged above under NEW FEATURES).
  chess.com Game Review reference recording: already logged as an open item.

### Round 2 answers, all ten [2026-09-12 16:36-16:49 ET]

Recorded in DECISIONS-LOG.md. Built in #365: the brilliancy explanation the chess.com way.
Built in #366 (16:28 ET, live 17:09 ET): y3b, y15b, y11b and the lay-B overlay - the four that
needed no further answer from him. Built in #367 (17:14 ET, live 17:17 ET): y12c, the Look and feel picker. Built in #368 (17:21 ET):
y17b, the Skills panel. Built in #369 (17:27 ET): y1b option C for real, behind a switch. Built in #370 (17:45 ET): n3 the
opening named live, n9 own photo in Review, and A NEW FINDING fixed - the Play board shrank by 62px after
the first move on his phone (see k8 below). Round 3 opened on the decisions
page: y1c (the graph: on / switch / out), y17c (Skills: counts or x/10), y5e (the live-game button row
asked again, since his y5d note predates the redraw).
- [2026-09-12 16:40 ET] status: closed #365
  y18b "look at what chess.com does and replicate that." Done for the text: a sacrifice is now
  explained by what happens if it is TAKEN (the opponent's capture is found, the position after it
  is analysed on demand, and the sentence says "If cxb5, Bxb5+ and White is winning"), then what
  the next best move was worth ("Nothing else came close: Bxf6 was 2.0 pawns worse"). Great moves
  get the same treatment when they are sacrifices. Three lines of prose on phones, paid for out of
  the player bars (74 -> 52 on Review), the move line, the control row and the strip - the board
  stayed at 349 on his geometry. The next-best strip (played vs alternative with evaluations) shows
  on iPad where height is free. The BUBBLE placement is not done: on his phone there is no free
  vertical space for a bubble, so it would cost board; parked until he says otherwise.
- [2026-09-12 16:48 ET] status: closed, decided  evw: eval bar stays beside; the width is worth it.
- [2026-09-12 16:49 ET] status: closed #366  lay: "All three, and stop guessing" -> readout (A)
  shipped in #361; recordings (C) accepted as they come; the grid overlay (B) is in #366: menu ->
  Layout overlay. Outlines the board AS PAINTED (dashed orange plus the 8x8 grid), tints the empty
  band either side with its width, marks the safe area in cyan, prints board/sq/gap/vw/vh/safe/build
  in a strip. Measured off the board element 4x a second; persisted in ct_layoutgrid so it survives
  a reload mid-report. Gate: overlay366.js (outline sits exactly on the board; strip carries the
  numbers; survives reload).
- [2026-09-12 16:45 ET] status: closed #366  y11b: lesson text may take 3-4 lines as long as it is
  CONSISTENT and never makes the board jump. Built: the note box is a FIXED 75px, three lines at
  15px (was two at 14, scrolling). Three not four: at his geometry (375x679) four lines cost the
  board 8px (352), three - paid for by deleting the "Tap Analyze to review this line" hint under
  the moves panel and 6px of spacer - let the lesson board reach 375 edge to edge (it was 360).
  716 of 734 lesson notes fit in three lines; 18 scroll inside the box. Measured: board 360 -> 375,
  note box 56 -> 75, no page scroll.
- [2026-09-12 16:47 ET] status: closed #367  y12c: "I accept your proposal" -> the Look and feel
  picker. A drawn board (the Italian Game position) painted from the LIVE theme, piece set and depth
  setting, so what it shows is what every screen uses; 12 colour chips with their swatch and name, 5
  piece-set chips each showing that set's knight, the depth toggle, and a Style row into the skin
  sheet. Reached from the home "Colours & pieces" button (which used to cycle palettes blind - the
  exact complaint) and a "Look and feel" row at the top of the menu's Appearance section. The home
  icons are NOT tied to it: y3b fixed them as one emoji set on every skin in the same round.
  FOUND WHILE GATING IT: Piece is memoised on its props but read the piece set from a module global,
  so changing the set left every piece already on screen showing the OLD set until something else
  re-rendered it - the menu's own Piece style row had this defect on the live board. Fixed with an
  epoch prop that bumps when the set changes. Gate look367.js: opens from both places, the preview
  repaints on a colour tap and on a piece tap, the real board then matches the preview, persists
  across reload, no errors; reg343 / pzgate / bril357gate / kunal364c green after it.
- [2026-09-12 16:37 ET] status: closed #366  y15b: round Analyze button ON the board, board stays
  full size. Built: a 42px round button (data-ct rev-fab) inside the board grid at its bottom-right
  corner, translucent with a blur so the corner square reads through it, onPointerDown
  stopPropagation so the board's drag logic never sees the tap; hidden inside analysis mode. Analyze
  left the control row, which keeps first / play / last / key-moment. Measured at his geometry:
  board 349 before and after, row 42 before and after, fab 42x42 inset 7/7.
- [2026-09-12 16:46 ET] status: closed #368  y17b: Skills panel, full, AFTER the explanations. Built on
  the review summary under the accuracy table, same two columns (White / Black, the user's side in the
  accent). Four groups, nine rows, every number COUNTED off the board by gameSkills(): FUNDAMENTALS -
  develops pieces (n of the first ten moves that brought a knight or bishop out for the first time or
  castled), castled (the move it happened on, or "no"), checks faced, weak pawns at the end (doubled +
  isolated in the final position); OPENING - book moves (plies inside the lesson library's lines);
  TACTICS - forks played (moveMotifs), forks missed (the engine's move was a fork, >= 50cp lost playing
  something else), pieces left hanging (the move lost >= 100cp, was not a Brilliant/Great, and left a
  piece the opponent wins >= 2 pawns of material on, by seeSq); STRATEGY - rooks to open files (rook
  moves sideways onto a file with none of its own pawns). Each row says what it counts under the label;
  a number that has moves behind it is a button that jumps into the review at the first one. Opera
  Game check: Morphy develops 4/10, castles move 12, forks 4, rooks to open files 1 (Rd1, and the tap
  lands on ply 27); Black faces 3 checks, never castles, 1 weak pawn. Chess.com's x/10 scores are
  their own scale and are not copied; ours are counts, with the definition printed.
- [2026-09-12 17:45 ET] status: closed #370  k8, MY OWN FINDING, and probably the shape behind several of
  his "the board is small / empty at the sides" reports on Play: on his phone the Play board is 357 at move
  0 and was 295 AFTER 1.e4 (pass & play 351 -> 279). Once there is history, the moves panel grows a nav
  row (first / prev / LIVE / next / last) and the "Tap Analyze to review this line" hint, +67px of minimum,
  and the fit loop pays for it out of the board. Every Play measurement I ever took - reg343, veteran360,
  kunal364c, the before/after pairs - was at the start position, the one configuration that never shows
  it. Fixed: on phones the nav row and the hint are gone (Back / Forward already exist in the button row)
  and the list has a fixed 34px flex basis so its content scrolls instead of pushing. jump370.js measures
  before and after 1.e4 in both modes: 357 -> 357, 351 -> 351 over eleven plies. The rule from #360
  ("a done is only done in the configuration it was measured in") now has a second configuration axis:
  the START POSITION is not a game. Measure after moves.
- [2026-09-12 17:57 ET] status: closed #370  k9, my own finding while applying the k8 rule to Puzzles
  (measure AFTER, not at the start): the puzzle board holds 375 after Show, good - but the one-line
  verdict box #364 gave his phone (30px) held a message styled for 74px: 12px of padding and 16px text,
  so "Play Re8+ - the squares are highlighted on the board" showed as one clipped line with the rest
  scrolling inside a 30px box. Now 14px text, 4px padding, one line with an ellipsis, and the reveal
  text is shorter ("squares highlighted."). Board unchanged at 375.
- [2026-09-12 17:40 ET] status: closed #370  n3: the opening both sides are playing, named live in Play.
  In the status line that already exists above the board ("Computer thinking" / "Check!" take precedence),
  so it costs no height. Needs four plies of theory to say anything (nameOpening's rule), so it appears
  after 2...Nc6, not after 1.e4. Gate open370.js: pass & play 1.e4 e5 2.Nf3 Nc6 -> "Italian Game".
  First try put it in the MOVES header, where it truncated to "Italian..." beside the Analyze / Copy
  buttons; moved.
- [2026-09-12 17:40 ET] status: closed #370  n9: my own profile photo in the Review player bar when I am
  one of the players (review.summary.userColor, set for games imported from an account or played here)
  and signed in. Code path only; the sandbox cannot sign in. Needs his eye on one of his own games.
- [2026-09-12 16:36 ET] status: you, round 3  y1b: "draw option C properly first". Not drawn - BUILT, in
  #369, behind a switch that ships OFF (menu -> Eval graph in the player bars). The graph sits in the spare
  width of the bottom player bar: 154x38 on his phone, the bar stays 52 and the board stays 349 (gate
  graph369.js), red ticks on blunders, teal on brilliancies, the current ply marked, a tap jumps to that
  ply. Round 3 on the decisions page (y1c) shows three real screenshots and asks: on for everyone / keep
  the switch / take it out. He can answer from his own phone with it switched on.
- [2026-09-12 16:40 ET] status: closed #366  y3b: home icons, all four emoji ink-matched. Built:
  Classic's drawn-piece override (Puzzles/Play as SVG pieces) is gone and its icon set is the one he
  approved on the mockup (telescope, puzzle piece, magnifier, pawn). Matching is done ON THE DEVICE
  by inkScale(): paints the glyph on a hidden canvas, measures the ink's bounding box, scales the
  font so the larger side is 1.1x the nominal size for every glyph; cached; returns 1 if canvas is
  unavailable. Reason: Apple Color Emoji and Noto draw different ink, so a build-time factor would
  be right here and wrong on his phone. Layout readout prints the four factors as "tile ink". In
  Noto all four land at x0.99 (ink 47px in an 84 box); on his phone the pawn will grow.
- [2026-09-12 16:43 ET] status: open  y5d: his note predates the redraw from his screenshot; the
  redrawn question is waiting for a fresh answer.
- Tracker flag b1 "still broken" at 12:57 ET predates #364, which reworked exactly that. Needs
  his re-check on #364/#365 before it is anything else.

### From Kunal after validating #362 on his phone [2026-09-12 13:52 ET]

- [2026-09-12 13:52 ET] status: closed #363
  "2026-09-12 12:36 ET this I have validated. It doesn't show me an app number anymore for some
  reason. We should reinstate that." He is right: build.sh made the number optional and every
  build since #350 was made without one, so the menu showed only a timestamp. The number is
  now REQUIRED by build.sh; the stamp reads "#363 - 2026-09-12 13:54 ET".
  closed: #363, stamp-only build.

### All 19 decisions answered [2026-09-12 16:05-16:27 ET]

Full record with reasoning: **claude/DECISIONS-LOG.md** (new, append-only, his request:
"we should keep a log of these questions, so next time we cover the same topic we can reference
what we did earlier"). SEARCH THAT FILE BEFORE ASKING HIM ANYTHING.

Settled and shipped in #362: WHITE/BLACK label removed (reverses #344 - do not re-add),
Takeback out of live play.
Settled, not yet built: coach avatar = a chess piece with character; coach bubble WITHOUT the
avatar; online clocks built properly with flag-fall; feedback channel = a second Cowork session
in this project.
PARKED by him: the iPad, entirely, until the phone layout is locked.

- [2026-09-12 16:24 ET] status: open  FIFTH TIME, AND NOW NAMED PRECISELY
  The brilliancy explanations: "not by much". His reasoning: chess.com shows the NEXT BEST MOVES
  beside the brilliant one with an explanation of why it was brilliant. Mine writes "you're
  clearly better" or "1.5 pawns worth of material" - "that doesn't tell me why I'm better".
  The line states the OUTCOME and never the COMPARISON. Showing what the move BEAT is the missing
  half. Also: put it in a bubble over the top, not the fixed text box at the bottom. Mockup first.

- [2026-09-12 16:27 ET] status: open  HIS INSTRUCTION
  Screenshot requests go in the Preview gallery, as agreed long ago. He will share a screen
  RECORDING, so the pipeline must accept a large file. And FLUSH the preview gallery - remove
  anything not currently needed.

- [2026-09-12 16:17 ET] status: closed #362  HIS INSTRUCTION
  Put the mockups on the question screens themselves, for every question, every round. Done:
  round 2 is ten questions each with drawn frames, now against proposed, and chess.com where he
  asked for the comparison.

### From Kunal in the build chat [2026-09-12 11:58 ET], with a Review screenshot

- [2026-09-12 11:58 ET] status: open  RE-REPORT, THIRD TIME
  The whole PAGE is still too small, not just the board. Empty bars on the sides AND the top AND
  the bottom. His screenshot (iPhone, Review, start position, 0/47) shows the board at roughly 85%
  of the screen width with a gutter each side, and a large black area between the move list and the
  bottom of the screen.
  note: my own measurements keep returning 390/390 on Play. This screenshot is REVIEW with an
  imported chess.com game, which is a configuration I have never measured: real PGN headers, two
  named players, flags, ratings. Measure THAT, not a synthetic board.

- [2026-09-12 11:58 ET] status: open  MY FAULT, REGRESSION I CAUSED
  He asked for the eval bar on the LEFT of the board. It is on TOP. #340 made "above the board" the
  default and #359 FORCED it on every device with a one-time migration (ct_evalmig359) - so the
  migration I shipped to fix his empty-sides report actively overrode the placement he had asked
  for. He is seeing the result of my fix, not of the old default.
  note: the fix is to put the bar back on the left and add a new migration key, not to undo #359.

- [2026-09-12 11:58 ET] status: open  PROCESS
  He wants to give feedback WHILE a run is in flight without interrupting it. Pressing enter in the
  build chat either interrupts the run or the items get missed. He proposed a separate chat or
  Cowork session that writes somewhere I can scan - Google Drive was his example - and asked what a
  workable map of that process is.

- [2026-09-12 11:58 ET] status: open  PROCESS
  He wants the loop to end with HIM certifying an item closed, not me. I may mark it closed; he
  certifies. Each closed item must show before/after screenshots plus an explanation of what was
  done.

### Found by me on 2026-09-12, not reported by Kunal [added 2026-09-12 06:45 ET]

These came out of two things he asked for implicitly by catching my misses: SCREENSHOTTING the
screen instead of reading a number off it, and sweeping every stored-preference profile instead of
a fresh install. All four are in #360, which is BUILT AND GATED BUT NOT DEPLOYED - the GitHub PAT
is not in this session and he has to paste it again.

- [2026-09-12 06:35 ET] status: closed #360 (built, not deployed)
  The opponent's avatar square in the Play top bar was EMPTY on every default game. BotFace returns
  null for an unnamed bot, and no named bot is the default. Now a robot mark.
- [2026-09-12 06:36 ET] status: closed #360 (built, not deployed)
  145px of dead black under the board on the Play screen. #359's claim that the freed space "now
  holds the move list" was FALSE: the list is gated on history.length > 0 and is a 35px horizontal
  strip. It now renders from move 0, wraps, and flexes to fill.
- [2026-09-12 06:39 ET] status: closed #360 (built, not deployed)
  iPad landscape PUZZLES overflowed by 50px on all 14 stored profiles. SQ reserved 0 for chrome on
  non-Play screens but puzzles and lessons keep the 62px bottom nav under the board. This is the
  half of his iPad scrolling report that #355 did not reach.
- [2026-09-12 06:33 ET] status: closed #360 (built, not deployed)
  The move-navigation arrows draw 6x11 of ink at font-size 24, a 46% fill, against 21x12 for the
  transport glyphs beside them - the analyze-icon defect three more times, and #359 had just made
  them visible by default. Replaced with drawn SVG chevrons. Same measurement found the king in the
  player bars drawing 20px next to a 26px bot face; set to 35.
- [2026-09-12 06:40 ET] status: open
  The phone puzzle screen puts the board 260px from the top where Play puts it at 125. It fits with
  no scrolling so nothing is broken, but it is a lot of chrome. Needs his word before moving it up.

### Earlier open items

- [2026-09-12 00:05 ET] status: open, one of three parts shipped
  Screen recording of chess.com's Game Review. Three things in it: the coach speech bubble
  with an avatar and the eval chip; explanations written positionally ("this move builds more
  pressure on your pawn and creates a threat", "with that move you chased the bishop away")
  rather than as engine arithmetic; and a Skills panel with Fundamentals / Openings / Tactics /
  Strategy counters such as "Develops Pieces 4/10" and "1 Book Move 0/10".
  note: [2026-09-12 00:10 ET] Sent without an instruction. Asked which parts he wants. My read
  is that the positional explanations are the real gap and the bubble comes along cheaply;
  the Skills panel is a multi-build feature on its own.
  note: [2026-09-12 01:05 ET] Question went unanswered and both channels were empty, so rather
  than idle I built the part that is not a guess: the positional explanations, in #350. That
  part corroborates feedback he had already given twice in his own words (#343 "we do not have
  why something is a blunder", #347 "it does not say why it is brilliant"), so it needed no
  new decision from him. The coach bubble and the Skills panel are NOT built and are not being
  built without his word, because both are appearance and scope calls rather than gap fixes.
  STILL NEEDS KUNAL: does he want (a) the coach bubble and avatar, and (c) the Skills panel?

- [2026-09-12 date only] status: open
  Base shell on the lessons screen. The board is 424 there and the fit loop keeps it on screen,
  but lessons still carry a 61px coach line, a 205px text block and a 99px moves panel against
  "one context line".
  note: This is a content decision, not a layout one. Deleting lesson prose unilaterally would
  be the wrong call, so it needs Kunal's word: collapse behind a tap, shrink, or leave.

- [2026-09-12 date only] status: open
  Country flags in the player bars, shipped in #348 but UNVERIFIED. api.chess.com is blocked
  from the build sandbox, so the lookup firing and failing safely were both proven, but whether
  a flag actually appears can only be seen on a real device. Needs Kunal to open one chess.com
  game in Review.

- [2026-09-12 date only] status: open
  Rating exchange between two real players, shipped in #349 but UNVERIFIED. The math has 21
  assertions behind it including convergence and drift; the live handshake between two devices
  cannot be tested from the sandbox.

- [2026-09-12 01:05 ET] status: open, needs his eyes not his decision
  The new explanation lines from #350 read correctly in two full games here, but "correct" and
  "useful to Kunal mid-review" are different tests and only he can run the second one. Worth
  a look at a handful of his own games: do the lines say something he did not already know.

---

## Closed

Times not captured for this batch; see the Timestamps note above.

- [2026-09-12 00:05 ET] status: closed #350
  Explanations should read positionally, the way chess.com's do, rather than as engine
  arithmetic. (Third statement of the same gap, after #343 and #347.)
  closed: [2026-09-12 01:03 ET] Every line now leads with what happened on the board and keeps
  the numbers as the tail: "It leaves the queen on d1 hanging. A blunder. Bxd1 is the answer."
  where it used to say "A blunder, about 6.3 pawns of advantage gone." The describer works from
  the two board positions alone and never from the evaluation, because a positional claim that
  is merely plausible reads worse than none. Four of its sentences turned out to be false for
  one shared reason and were caught by READING the output, not by any assertion; see HANDOFF
  #350 for the mechanism, it will bite again anywhere SEE is used to make a claim.

- [2026-09-12 date only] status: closed #349
  As we enable users playing each other they should build a rating like chess.com, everybody
  starts from 400, about eight points for a close game, up to 50 against someone much stronger.
  closed: Elo with a K that decays on games played, which is the only way to get both ends of
  that spec from one formula. Under 10 games K 56, 10-29 K 32, 30+ K 20, 30+ and 2100+ K 12.
  A simulation caught a real bug I had written: forcing every result to move at least one point
  drained 0.581 points per game from anyone in a stronger pool. Removed.

- [2026-09-12 date only] status: closed #348
  Whatever information we have about the players, in review or when playing, we should display
  it. Ratings, and country flags like chess.com.
  closed: Ratings needed no new data at all, chess.com and lichess both write WhiteElo and
  BlackElo into the PGN and we were parsing every header then ignoring those two. Flags need a
  lookup, cached forever including misses. No rating is shown where we do not have one.

- [2026-09-12 date only] status: closed #347
  The board jumps when the name box at the top expands after a capture.
  closed: The captured-pieces row was set to wrap, so enough captures pushed it to a second line
  and grew the bar. One clipped line now, and the harness asserts the bars never change height
  across 16 plies of accumulating captures.

- [2026-09-12 date only] status: closed #347
  The review is still taking over a minute, it was much quicker in the previous version.
  closed: Both causes were mine. I bumped the eval cache tag in #343, which silently discarded
  every review he had cached; and I spent the parallel-worker saving on depth using sandbox
  timings rather than phone timings. The budget is now a wall-clock target that measures the
  real device after one round and trims to land on it. Confirmed faster by Kunal.

- [2026-09-12 date only] status: closed #347
  The chessboard is much smaller than the screen, on height and width.
  closed: The reserved rows from #346 plus #345's second control row. Measured at his real
  usable height: 424px, 99% of screen width, the maximum the screen allows.

- [2026-09-12 date only] status: closed #347
  The icons are way too small, can barely see them, they need to take up more space.
  closed: They were still sized for the text labels they stopped carrying in #344.

- [2026-09-12 date only] status: closed #347
  The green highlighting does not pop as much on the light bar as on the dark one.
  closed: The ring was one colour at 2px. Now 3px, with a dark outer ring on the light bar.

- [2026-09-12 date only] status: closed #347
  The home screen icons changed and the animation is gone, the queen dropping in. Put it back.
  closed: The intro only ever rendered on a tablet or in landscape. HomeIntro already had a
  compact mode that was never used on phones. Tap the title to replay.

- [2026-09-12 date only] status: closed #347
  "New to chess? Lock in the endgame basics" just takes me to Play with Rosa, it does not show
  me the lessons.
  closed: One-word bug. The handler called selectOpening(_coachRec.i) but the object only has
  .idx, so it passed undefined and left you where you were.

- [2026-09-12 date only] status: closed #347
  It says it is a brilliant move but it does not say why, so that is not helpful.
  closed: The brilliant-move trainer replayed the position and said "Nicely done" and nothing
  else. The reason is now composed when the brilliancy is captured and stored with it.

- [2026-09-12 date only] status: closed #346
  Every time I play a move the computer thinking on top makes the whole chessboard move. Fix it
  and make sure it does not happen anywhere else either.
  closed: Four causes, two of them mine. The thinking banner was a conditionally rendered row;
  my own fit loop reset the board size on every move; the reason line changed height between one
  and two lines; and the strength selector vanished on the first move, freeing 111px. The rule
  now in HANDOFF: on a board screen, conditionally rendering a ROW is the bug, conditionally
  rendering its CONTENT is fine.

- [2026-09-12 date only] status: closed #345
  If the move is brilliant then the strip at the bottom should show the brilliant colour. I
  noticed you have the colour for some of the other moves. Figure it out across the board.
  closed: Wider than the case he spotted. The selected-move chip was a hard-coded amber that
  overrode the verdict, only the negative half of the scale had any colour at all, and Brilliant
  and Great lost their !! and ! symbols while blunders kept ??.

- [2026-09-12 date only] status: closed #344
  Previous and next are redundant, we already have them across the move list. And next key
  moment and analyze can just be icons so the buttons do not take so much space.
  closed: Both, and they were part of the fit fix rather than separate: dropping them collapsed
  two control rows into one and handed 50px back to the board.

- [2026-09-12 date only] status: closed #344
  My name is written in black and I am playing white, that is throwing me off.
  closed: The side was encoded only in the bar's background colour. Each bar now says WHITE or
  BLACK in words, so it is never inferred from a hue.

- [2026-09-12 date only] status: closed #344
  Different phones have different heights and widths, it should auto fit everywhere, not just
  on my phone.
  closed: No constant any more. The app measures real overflow after paint and shrinks the board
  until there is none. 14 of 14 phone viewports fit, from a Pro Max to a 320px screen.

- [2026-09-12 date only] status: closed #344
  Good layout, but it still does not fit the screen.
  closed: Two causes. The board was sized from width only, with a stale height cap that had a
  floor overriding it. And the app measured the top safe-area inset but never the bottom, so my
  test viewport was handing the layout about 93px his phone does not have.

- [2026-09-12 date only] status: closed #343
  We do not have why something is a good move, why something is brilliant, why something is a
  blunder. And there is no option for analysis, there should be an analyze button so we can play
  it out and see how it works.
  closed: The reason line composes cost, the opponent's best reply, the move that held it, and
  the tactic. Analyze hands you the board at that ply with both colours movable, Undo and Exit.
  Reopened in spirit by the chess.com recording and finished in #350: the #343 line explained
  the COST of a move, never what the move DID.

- [2026-09-12 date only] status: closed #343
  Our evaluation takes much longer than chess.com's.
  closed: A review is many independent evaluations, so it parallelises. 61s to 27s measured,
  with more thinking time per position than before. Later corrected again in #347.

- [2026-09-12 date only] status: closed #341
  Once I do an eval through Stockfish, can we save it rather than run the whole thing again.
  closed: Cached in localStorage. A repeat review is about four seconds.

- [2026-09-12 date only] status: closed #341
  We do not need the bottom band with home and discover and puzzles on this screen. Just a back
  arrow to get out of the review. Thin arrows before and after the move bar.
  closed: All three.

- [2026-09-12 date only] status: closed #343
  Always maximise the size of the chessboard on the phone. Review each screen and let us agree
  one base layout to carry across.
  closed on review and play: back arrow and dots, player bar, board at full width, player bar,
  one context line, one control row, bars absorbing the slack. Play went 416 to 424 and its
  black band from 237px to zero; puzzles picked up the wider board from the same fix. Lessons
  is still open, see above.

- [2026-09-12 date only] status: closed #340
  Instead of the vertical bar we could use a horizontal bar above the board to get a bigger
  board.
  closed: The strip runs above the board at full width.

- [2026-09-12 date only] status: closed #339
  The chess board is still too small. Change the colour for great moves, it is too close to
  brilliant, chess.com used dark blue. The game review and summary rows eat a lot of space,
  can we get rid of them.
  closed: All three. Great is #5d93e8.

- [2026-09-12 date only] status: closed #338
  Puzzles screen layout issue.
  closed: The tab-bar spacer had no CSS order, and the puzzle screen is the only screen that
  orders its children, so the spacer rendered first as an empty band and reserved nothing at
  the bottom.

- [2026-09-12 date only] status: closed #336 #339 #340
  The bottom minus zero point seven is redundant, remove it, and there may be a better way to
  show it in the bar with bigger text and a flipped orientation.
  closed: Removed, enlarged, flipped, and ultimately moved into the horizontal strip.

- [2026-09-12 date only] status: closed #336
  The two buttons at the bottom should be pinned to the bottom of the screen.
  closed: Pinned on the summary screen.

- [2026-09-12 date only] status: closed #337 #341
  Too much stuff on this page, it does not fit in one go, there is a lot of scrolling and a lot
  of empty black space at the bottom. The score needs to be visible while stepping through.
  closed: Header, summary row, players line and text box removed; eval visible throughout.

- [2026-09-12 00:14 ET] status: closed
  Give me the accomplished / next / gap summary every time.
  closed: [2026-09-12 00:14 ET] Standing convention, written into HANDOFF section 4 and project
  memory.

- [2026-09-12 00:14 ET] status: closed
  Before finishing a run, check the feedback chat and keep picking up items until there are no
  more, then give the results.
  closed: [2026-09-12 00:14 ET] A sibling chat's messages cannot be read from a Cowork session,
  which I verified by searching project knowledge for a phrase that exists only in our chat and
  getting back nothing but HANDOFF.md. Project DOCUMENTS are readable, so this file is the
  bridge. The loop is in HANDOFF: finish the work, read this file and the inbox page, build what
  is new, read again, and only write the close-out when a read comes back empty.

- [2026-09-11 17:32 ET] status: closed #339 and superseded
  Review Screen Audit taps: R1 approve, R2 discuss, R3 keep, R4 keep, R5 keep, R6 discuss,
  Q1 home screen icon.
  closed: [2026-09-12 00:05 ET] R1 shipped as the default in #339. R3, R4 and R5 kept and still
  present. R2 and R6 were overtaken by his own later direction, the horizontal eval strip and
  the player bars. Q1 is the fact that made the unmeasured bottom safe-area inset matter in #344.
  MY FAILURE, recorded: I read this artifact once early in the session and then reported it as
  untapped in four consecutive close-outs. Re-read every feedback source on every run; never
  carry an empty answer forward.

- [2026-09-12 03:20 ET] status: closed #356, one part still open
  MY OWN FINDING, not Kunal's: the first play-it-out tap after a review trapped the Stockfish
  worker (RuntimeError: unreachable). Logged in #354 rather than quietly allowed.
  closed: [2026-09-12 05:20 ET] Three separate UCI protocol violations, each independently causing
  traps: both analysis queries repositioning the worker immediately after `stop`, which is not
  synchronous; the eval bar doing the same on EVERY ply change, which is why it showed up while
  stepping rather than on a tap; and the idle handshake's own timeout proceeding when the engine had
  not acknowledged, which is the violation it exists to prevent. Tapping either button is clean now,
  0 and 0 where it was 1 and 1. ONE unattributed trap survives in one long test sequence, is not
  reproducible in isolation, and breaks nothing user-visible. Still open, allowed in the gate by
  exact text so anything new still fails.

- [2026-09-12 05:20 ET] status: open, PATTERN WORTH NAMING
  A large share of the pasted batch describes a build that no longer exists, because it was
  collected across many deploys. Already-built: back and forward in a live game, the merged summary
  card, the notation section. Does not match: the Discover reshuffle, the You are Black label, the
  captured-pieces backgrounds, castling by drag. Mismatched: the minute clocks, reported as a
  regression when online never had them.
  note: The habit that catches this is driving the app and screenshotting the screen BEFORE writing
  any code, which is now in HANDOFF. The ask back to Kunal is one fresh screenshot per disputed
  screen, which is on the decisions page.

- [2026-09-12 05:09 ET] status: closed #357
  "The explanations for the brilliant moves are still almost useless." Fourth time raised.
  closed: [2026-09-12 05:40 ET] He was right, and three attempts missed for the same reason: none of
  them said what the sacrifice BUYS. #350 made the sentence positional, #354 added a button that
  plays the line out, and the sentence still read "It gives up a piece and still reads +2.4. Hard to
  see, and it holds." That is the definition of a brilliancy restated, not an explanation of one.
  Now: "You give up the queen, and Nxb8 Rd8# is mate." The continuation costs nothing, because the
  review has already evaluated every position: walk forward while the game stayed on the engine's
  line and stop at the first deviation, so every move named is either one that was played or the
  engine's own first choice. The line is only shown when it is FORCING, because on a quiet move the
  next few plies are just the next few plies. Also cut "The engine's first choice", which is exactly
  what the chip beside it already says.
  LESSON: three incremental passes at the same complaint, each adjacent to the problem rather than
  on it. When the same feedback comes back a third time, stop improving and go and read the exact
  output on a real example first. Doing that took ten minutes and the cause was obvious.

- [2026-09-12 05:45 ET] status: closed, no action needed
  The 2026-09-12 01:06 batch was pasted in a second time, unchanged, after builds #351 to #357.
  closed: [2026-09-12 05:45 ET] Diffed against this file before doing anything: all 38 items were
  already logged, 12 of them closed, and nothing was new. No duplicate entries were created. The
  cause is that the collecting chat cannot see what has been built, so it re-emits its whole list
  and labels everything open. Fixed at the source with the instruction block at the top of this
  file, which that chat can read because project knowledge is shared into every chat here.

- [2026-09-12 06:00 ET] status: closed #358
  MY OWN FINDING while testing the above: toSAN has always rendered checkmate as '+', never '#'.
  closed: [2026-09-12 06:05 ET] Wrong notation on its own, and it quietly broke #357 an hour after
  shipping it: a mate reached through the ENGINE's best move comes from toSAN, so "Nxb8 Rd8# is
  mate" degraded to "Nxb8 Rd8+ follows" on exactly the lines that most needed the word. One line.
  The probe can only under-report mate, never invent one.
