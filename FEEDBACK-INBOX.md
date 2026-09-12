# Chess Trainer feedback inbox

Append-only. Nothing is ever deleted from this file.

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
