# Chess Trainer - HANDOFF (boot document for any new session, chat or Cowork)
**Written 2026-09-06, updated 2026-09-11. Live repo HEAD = build #334 (Cowork; #331 = 5f745f8, #332 = 7c3a8c5, #333 = ca44a61 review screen fixes plus the one-screen preview, #334 = summary footer pinned, #335 = eval number in the bar instead of a chip, #336 = that number flipped to read upward, #337 = one-screen review layout is the DEFAULT, #338 = puzzle screen spacer order fix, #339 = layout migration, eval bar off the side, blue Great; #340 = that bar sits above the board, #341 = review screen chess.com pass plus a Stockfish result cache).**
Give this file to Claude in Cowork as the first thing in the session.

## 0a) WHERE THE BUILD ACTUALLY IS (2026-09-12 22:2x ET, written by the #373 run)
LIVE = **#372** (commit 7c51f10 on origin/main, Kunal's click; verified by hash from this session at 21:28 ET, byte-identical
to the local app.js). **#373 = the first build pushed to main BY THE SESSION ITSELF** (this environment has push access;
no upload page, no PAT: `git push origin HEAD:main`, then verify raw.githubusercontent.com/<SHA>/app.js by stamp).
Commit: 5946b3c (pushed 22:55 ET, raw stamp and md5 verified at that SHA), stamp "#373 - 2026-09-12 22:22 ET". Kunal's phone shows it after a reload (Pages serves it within minutes;
the host is blocked from this container, so liveness on the phone is his check).
WHAT #373 CARRIES: (1) `gates/` - the build and gate tooling in the repo (the old suite is gone with its sandbox;
see "### #373" in section 5 for the rules); (2) the open P1s from the #371/#372 agents that needed no decision -
A-04, A-09, A-10, A-11 (partly), A-12/X-09, A-13, A-16, X-07 - each with a before/after measurement in the tracker;
(3) the testing charter's first screen, Review: stories, cases, a regression suite (gates/regress/20-*, 21-*), the UAT
card (gallery card 6, 88 s, seven captioned checkpoints) and the packs in claude/agents/; (4) the run-start audit as a
workflow (six screen agents + verifiers) whose report lands in claude/agents/AUDIT-373.md - if it was still running at
the close-out, its findings are the next build's queue.
STILL KUNAL'S: A-05 (floating buttons), A-08 (round button over a corner rook), A-14/Z-02 (one board-width rule, z7),
A-15 (names truncate - a look decision), b1 (his re-check of the Review board width on his phone: measured 349 here),
y13/n9/y14 (device-only), the recordings of gallery cards 1-6.
**#374 (same run, after the antagonist's FIX FIRST on #373 arrived post-push):** the Brilliant/Blunder label kept inside the
board on the h-file (animation moved to an inner span), no engine query on a checkmated position (a mate by Black on the
analysis board read M1), Analyze/Copy tap boxes effective for their full 43px, a "‹ Back" on the Online lobby without
sign-in (audit N-play-1, P0), and the readout/overlay print the painted board HEIGHT for the rank-1 finding on his #372
recording. Commit 1035aee (pushed 00:16 ET, raw stamp and md5 verified at that SHA). Gate 31-antagonist373.js. Open P0s at the close-out: uat372-k10 (his phone: rank 1 at 60%
at game over - instrumented, not fixed), uat372-k12 (his phone: the board stepped back a ply at the mate - not reproduced
in three configurations), N-review-1 (the Stockfish "unreachable" trap whenever the engine line runs - allowed by exact
text since #354; the root-cause agent was cut off by the session limit: FIRST AGENT OF THE NEXT RUN, brief in
claude/agents/AUDIT-373.md).
THE FOUR NUMBERS at the #373/#374 close-out are in RUN-LOG.md.
BOOT FOR THE NEXT RUN: read this file, FEEDBACK-INBOX.md, DECISIONS-LOG.md, RUN-LOG.md; `cd gates && npm ci`; verify the
live stamp by SHA; run `node gates/mountcheck.js` (must be 14/14 green on the live bundle) BEFORE anything else; drain
the tracker flags, the pickup board, the inbox artifact and round 3 (all read at 21:28 ET this run: flags b1 and the
charter still open, everything else empty); write `acked` the moment an item is read.

## 0a-history) WHERE THE BUILD WAS AT THE #372 CLOSE-OUT (2026-09-12 20:20 ET, superseded by the block above)
LIVE = **#371** (app.js stamp "#371 - 2026-09-12 18:56 ET", commit 2a74c13 on origin/main, Kunal's upload at
19:23 ET, verified by hash at raw.githubusercontent.com at 20:40 ET - byte-identical to local #371). Local history
is merged (`-s ours`; #372 sits on top). **ONE CLICK CARRIES #372**: the staged upload (tab
github.com/LearnToCheckmate/chess-trainer/upload/main, files from /mnt/user-data/outputs/docs-372/) holds app.js
with the stamp "#372 - 2026-09-12 20:20 ET"; after his commit the Layout readout must show #372.
BUILT, GATED (gates.sh from the top on the final bundle, gates372c.log), STAGED = **#372**: the antagonist's
objections on #371 answered (Y-01/Y-02 the lesson's playback row folds on phones and the moves panel absorbs the
slack - 375@92 through a wrong practice move to "Complete!", lesson371.js asserts it; Y-03/Z-01 the puzzle hint
takes the whole header row, three lines at 12px, a 44px "‹" back button, a 135-character hint unclipped with
the board top unmoved - gallery372.js reads the longest hint from the source; hintcap372.js sets all 27 curated
hints into the live header at 320/375/390 and fails on any clip - it caught a clip at 375 on the first pass, fixed
by shortening six hints and 11px text on phones <= 340 wide; Y-06 no Resign after the game; Y-09 note box 75px, three whole lines;
Y-04 the round Analyze button at 55% alpha, corner rule kept) and THE PREVIEW GALLERY REBUILT AS KUNAL'S UAT
(his 19:16 instruction and the 19:39 charter): eight cards - k10 game over, k8 four plies in, k11 demo end,
k11 practice, A-06 hint, k12 review last ply (1-0 at 17.Rd8#), y3 Layout readout, y3 Home - "▶ Play all 8
(screen-record this)" runs them unattended with a caption strip per card (data-ct rec-cap: item id + what should
be true, held >= 5 s) and ends on a green "RECORDING COMPLETE - you can stop now." frame (playall372.js drives
all eight). Everything decided alone, and every antagonist objection shipped over, is in DECISIONS-LOG (#372 and
OVERRULED OBJECTIONS). Two gates (mountcheck, pzgate) used to drive gallery cards that #372 removed; they now
drive the real paths (stored account rows on the Review list; the Puzzles screen's own Free play button) with the
same assertions plus one - the 19:37 gates372.log is VOID (bundle replaced mid-run, the #351 class).
#367 = y12c the Look and feel picker (data-ct look; drawn preview board painted from the live TH / pieceSet /
boardDepth, 12 colour chips, 5 piece-set chips, depth toggle, Style row). From the home "Colours & pieces"
button (data-ct home-look; it used to CYCLE palettes blind) and the "Look and feel" row at the top of the
menu's Appearance section (data-ct menu-look). Fixed with it: Piece is memo'd on props but read the piece SET
from a module global, so a set change left pieces on screen stale - _PIECE_EPOCH rides along as a prop now.
Gate look367.js. Shots: shots366/before366-menulook, after-look, after-look2.
#366 (6cd1449, 17:09 ET) = y3b home icons all emoji, ink-matched at run time (inkScale, canvas on the
device); y15b round Analyze button on the Review board (data-ct rev-fab), board full size, row keeps four;
y11b lesson note box fixed at 75px / three lines at 15px, lesson board 360 -> 375 on his phone; lay-B Layout
overlay (menu row, ct_layoutgrid, data-ct layout-grid). Evidence: shots366/ and tracker rows y3 y11 y15 k7.
Harnesses: before366.js, overlay366.js.
BUILT, GATED (gates.sh GREEN, gates371c.log), STAGED = **#371** (stamp "#371 - 2026-09-12 18:56 ET"), the response to
the three agents Kunal asked for (see 0c). Fixed: A-02/X-01 the Play board collapsed 357 -> 192 at GAME OVER on
phones (title row, tab bar, Elo stepper, slider and a full-width Review button all came back) - a finished game
keeps the live chrome and the Hint/Flip slots become Review/Rematch, same row, same height (gameover371.js:
357 -> 357, scroll 0); A-01 the lesson board collapsed 375 -> 272 at the demo's END and in practice (a 100px
variations box, then a spacer that swallowed the slack) - the box lives in the ⋯ sheet behind an "Other lines"
button on phones, the spacer is fixed 4px and aria-hidden, board 375 at top 92 in every phase (lesson371.js);
A-03 a checkmated side read as the WINNER (UCI mate 0 flipped by sign gave 0): mateW()/mateLbl(), labels
"1-0"/"0-1", cached reviews patched on read (mate371.js); X-02 every check counted as a fork (the king was a
target AND the check added one) - fixed in moveMotifs, Morphy's forks 4 -> 2; X-03 inkScale blends the larger
side with the ink's geometric mean; X-05 the round Analyze button steps to the bottom-left when the last move
landed on g1/h1/g2/h2; X-06 the eval graph is 126 wide on his phone; A-06 puzzle hints show as a banner over the
top of the board on phones (data-ct pz-hint-banner); X-04 the live opening name is the base name; X-10 the name
stays put while the computer thinks; X-11 open file = no pawn of either colour, '#' counts as a check; note box
77px; "Rematch" not "New game" so the label does not wrap. Decisions taken alone are in DECISIONS-LOG.
BUILT, GATED, STAGED FOR HIS CLICK = **#370** (stamp "#370 - 2026-09-12 17:57 ET", carries #368 and #369):
THE FINDING OF THE RUN: on his phone the Play board was 357 at move 0 and **295 after 1.e4** (pass & play 351 ->
279). The moves panel's nav row (first/prev/LIVE/next/last) and the "Tap Analyze" hint appear once there is
history, the panel's minimum grows by 67px and the fit loop takes it out of the board. EVERY play measurement
before this was taken at the start position, the one configuration that never shows it (jump370.js is the
harness: measures before and after 1.e4, vs computer and pass & play). Fix: on phones (_pFill) the nav row and
the hint are gone (the row's own Back/Forward do the job) and the move list has a FIXED flex basis of 34px so
its content can never push the board; it scrolls. Now 357 -> 357 and 351 -> 351 across eleven plies.
Also in #370: n3 the opening both sides are playing, named live in the status line above the board
(data-ct play-opening; thinking / check take precedence; nameOpening needs four matched plies, so it appears
after 2...Nc6, not after 1.e4) - gate open370.js; n9 my own photo in the Review player bar when the game is
mine (review.summary.userColor) and I am signed in (cloudUser.photo), untested here (no sign-in in the sandbox).
Also #370 (17:57 ET rebuild): the puzzle verdict box on phones (30px since #364) now holds one whole line -
14px text, 4px padding, ellipsis - instead of a 74px-styled message clipped inside it (pzafter370.js).
#369 (stamp "#369 - 2026-09-12 17:27 ET"): y1b
option C, the eval graph INSIDE the bottom player bar, built for real behind a switch that ships OFF (state
evalGraph / ct_evalgraph, menu row data-ct menu-evalgraph "Eval graph in the player bars", svg data-ct
eval-graph in pbar-bottom). Sparkline of evalAfter per ply, white light above the middle, black dark below,
red ticks blunders, teal brilliancies, accent line = current ply, tap jumps to that ply. Gate graph369.js:
bars 52 -> 52, board 349 -> 349, no scroll, tap 19 -> 30. Shots 369-graph-off/on/zoom are on the decisions
page as ROUND 3 (ids y1c, y17c, and y5e = the live-game button row asked again). No mockup was drawn: he can
switch it on on his own phone and answer from the real thing.
#368 (stamp "#368 - 2026-09-12 17:21 ET"): y17b the Skills panel on
the review summary (data-ct rev-skills, rows data-ct skill-*). gameSkills(positions,plies,out,bookN) is a pure
function next to openingBookPlies; it COUNTS everything off the board (develops pieces n/10, castled move,
checks faced, weak pawns at the end, book moves, forks played / missed, pieces left hanging via seeSq, rooks to
open files), keeps the ply indexes so a tapped number jumps into the review, and is exported into engine350.js.
Gates: skills368.js (pure, Opera Game, 17ms) and summary368.js (real app, Opera Game, the panel's numbers and
the jump to 14.Rd1). Shots: shots366/before367-summary (no panel) and after-summary.
Previously: #366 (6cd1449), #365 (34d8710), #364 (89b703d).
KUNAL'S PHONE, from his Layout readout: **375x761, dpr 3, insets 51/31 = 375x679 usable.** Emulate as a 375x679
viewport with insets 0 (or ct_safe='51,31'). HEIGHT binds there, not width; every width-only check will pass
while the board is squeezed. Harnesses: work/build/kunal364c.js (play/puzzle/lesson) and kunal364d.js (review).
Previously: #362
Builds #359-#362 went live TOGETHER, committed by Kunal through GitHub's web upload page - I staged
app.js and chess.jsx into the form from this session with Claude in Chrome and he pressed Commit.

WHY IT WENT THAT WAY, so nobody repeats the afternoon: this session's git proxy refuses to push to
LearnToCheckmate/chess-trainer ("not in this session's authorized repository set") and the GitHub
API is gated the same way. That set is fixed when a task STARTS and there is no tool in-session to
extend it. A PAT does NOT help - the gateway rejects before any credential is read. What DID get
fixed today: his GitHub account is now linked to Claude Code and the Claude GitHub App is installed
on LearnToCheckmate, scoped to chess-trainer. **A new task started with the repo attached will have
push access from the first second.** Until then, deploy = stage the built files into
github.com/LearnToCheckmate/chess-trainer/upload/main via Claude in Chrome's file_upload (it reads
straight from /mnt/user-data/outputs), fill the commit message, and let him press the button.

Also learned: deploy.py writes commits DIRECTLY on GitHub, so a local commit for the same build is a
DIFFERENT commit and the histories diverge. Always `git fetch` and rebase onto origin/main before
assuming a push is a fast-forward. And never version `.run/` - it was the only content difference.

## 0c) THE THREE AGENTS (Kunal's instruction, 2026-09-12 17:07 ET, from the feedback session)
"Start the next run by creating three agents: a supervisory agent; an antagonistic agent that really looks through
the work being done and the issues being hit, especially from a layout perspective but also everything else; an
audit agent that goes through the app as it currently is and identifies all the possible issues it can find."
They ran for the first time at 18:00-18:50 ET (Agent tool, general-purpose subagents). Their reports:
/home/claude/work/agents/{audit,antagonist,supervisor}/*-REPORT.md (also summarised in FEEDBACK-INBOX under #371).
The audit found two P0s no gate had ever seen (the board collapsing at game over and at the lesson's end), the
antagonist found the Skills panel and the eval graph showing wrong numbers, the supervisor ruled on process
(RUN-LOG.md exists because of it). HOW THE NEXT RUN USES THEM (supervisor ruling D, adopted):
- AUDIT at the START of every run, against the bundle that is live on his phone (verify the stamp first), at his
  geometry and 390x844, AFTER interaction on every board screen (moves played, game ended by resign AND checkmate,
  puzzle solved and failed, review at ply 0 / mid / last). Output: ranked P0/P1/P2, one screenshot + one
  measurement per finding, a "not checked" list. Hard rule: no finding without a measured number and a PNG.
- ANTAGONIST BEFORE EACH DEPLOY, on that build's diff and gate log only. Output: for every claim, "measured /
  measured in one configuration / prose", the state the gate skipped, at least one disputed number. Hard rule:
  it must try to break each claim in a configuration the gate did not use and report the numbers.
- SUPERVISOR at CLOSE-OUT (and whenever a tracker `flags` doc is broken=true). Output: the next run's priorities,
  the process scorecard (p1-p7, evidenced or "not evidenced"), the plain paragraph for Kunal. Hard rule: it does
  not build or drive; every sentence cites a file or a report id; it may veto the deploy click on a red gate.
- Their summaries go into FEEDBACK-INBOX under the build they belong to, so they survive the session.
- THE GATE IS ONE SCRIPT NOW: work/build/gates.sh runs every harness and exits 1 on any FAIL, "<<<" or a
  non-zero exit; a build is "gated" only when gates<N>.log ends in GATES GREEN. Hand-typed lists are over.
- MEASURE AT THE END, NOT ONLY AFTER THE FIRST MOVE: game over (resign and mate), lesson end and practice,
  puzzle solved and failed, review last ply. Two P0s lived there for months.

STANDING SINCE 19:39 ET - THE TESTING CHARTER AND THE ACK PROTOCOL (Kunal's, in the Project: claude/agents/CHARTER.md
and claude/agents/ACK-PROTOCOL.md; tracker flag kunal-testing-charter). Read both before any work. In short:
- Five testing roles on top of the three reviewers: user-story author (claude/stories/USER-STORIES.md, US-ids),
  test-case author (claude/stories/TEST-CASES.md), regression agent (a permanent suite inside gates.sh +
  claude/agents/REGRESSION-LOG.md), SAT agent (each story's criteria on the running app before anything reaches
  him), UAT agent (a Preview gallery card per BATCH that plays the whole journey; captions name the item id and
  what should be true, held >= 2 s; ends on a visible "recording complete" frame; verification from the frames of
  the clip he uploads - WHERE THE SANDBOX AND THE RECORDING DISAGREE, THE RECORDING WINS; output
  claude/agents/UAT-PACK.md; prune the gallery).
- COVERAGE: "testing everything from scratch, the entire workflow and functionality"; fewer builds is fine if each
  makes the product progressively better. Spec and test the whole app screen by screen in the order Review, Play,
  Lesson, Puzzles, Home/Discover, Menu, then the never-tested areas. Nothing written that is not executed in the
  same pass. Status at 20:20 ET: the gallery half is built (#372, eight cards); stories, cases, regression log,
  SAT and UAT-PACK are NOT started - the next run opens with the audit against the live stamp AND the Review
  screen's stories and cases, executed in the same pass.
- FOUR NUMBERS AT EVERY CLOSE-OUT: open P0 (must be zero), open P1 (must fall), coverage (screens fully specced
  AND tested), regression assertions (only rises). A new screen's coverage finding old defects is a GOOD run.
  Baseline at #372 (20:52 ET): P0 0, P1 12, coverage 0 of 6, assertions 138 (gates.sh counts the PASS lines of
  every gate into gatelogs/<N>-all.log and prints the number in its footer; RUN-LOG keeps the table).
- ACK: write `acked` (timestamp + build + ONE line of what the build chat understands the item to ask) onto every
  tracker `flags` item the moment it is read, before work; keep `handled`; the tracker renders both per row; the
  close-out ends with every item picked up by id with a timestamp.
- THE PICKUP BOARD (his feedback session built it 19:57 ET; Project doc claude/agents/PICKUP-BOARD.md):
  https://claude.ai/code/artifact/f38b7157-4bd7-4ae2-b2ce-2c7594b8cf36, collection `pickup`, one doc per item
  (title, ask, source, loggedAt, state logged|acked|shipped|certified, ackAt/ackBuild/ackNote, shipAt/shipBuild/
  shipNote). Set state "acked" with ackAt, ackBuild and a one-line ackNote THE MOMENT an item is read, before work
  (write_db update with the version from a read). Drain it at run start and before every close-out, like the
  tracker flags. First written 20:40 ET (ack-mechanism and tracker-set-bug shipped, testing-charter acked/part).

## 0b) BEFORE / AFTER SCREENSHOTS ARE PART OF CLOSING AN ITEM (2026-09-12)
Kunal: "for the feedback tracker show me screenshots of before and after for each of these items
under the item. I need to see them to certify them."

The machinery is in `/home/claude/work/snap/`:
- `mk.sh <commit>` builds ANY historical chess.jsx from git into `snap/site/app.js`.
- `shot.js --root <dir> --out <dir> --tag <t> --screens <list> --port N [--store '{json}']`
  drives the app and screenshots named screens: home, discover, menu, play0 (start position),
  play (three moves in), lesson, puzzle, ipad (puzzles, 1024x768), ipadplay, review, review2.
  `--store` seeds localStorage, which is how the veteran-profile bug is photographed at all.
- `run.sh` is the whole sweep; `shots/` holds the PNGs at deviceScaleFactor 1 (~80-230KB each).
- Publish them as a MULTI-FILE artifact: copy to the scratchpad, then pass `root` + a
  `files` map of {"shots/x.png": "x.png"}. 33 files, 3.8MB, well inside the limits.

TWO RULES LEARNED DOING IT:
1. The before shot must be taken in the CONFIGURATION THAT WAS BROKEN. `b358-play0.png` (fresh
   install) shows no gutter at all; `b358v-play0.png` (same build, ct_evalunder='0') shows the
   16px gutter he reported. A before shot that does not show the bug is worse than none.
2. Check the two files are not byte-identical before claiming a change. b354-ipad and b359-ipad
   came out the same size because #355 never touched the iPad PUZZLE screen - it fixed Play. The
   pair was relabelled to ipadplay, where the before shot really does show rank 1 cut off.

## 0) THE PEN RULE (read first)
Only ONE environment may commit to LearnToCheckmate/chess-trainer at a time. Two writers once caused a GitHub account suspension. When Cowork starts building, say "Cowork has the pen" in the old chat so it stands down, and vice versa. Never let both deploy in the same sitting.

## 1) Boot sequence for a new session
1. Ask Kunal to paste the GitHub fine-grained PAT (never write it to any file; env-inline only). Current token: chess-trainer-deploy, expires Dec 5 2026, Contents read-write on the one repo. The old no-expiration token was deleted 2026-09-06. Also pick his Chrome (switch_browser) if live verification is planned.
2. Refetch from the repo at session start (source of truth): `chess.jsx`, `lessons.js`, `chess-trainer-backlog.md`, `gen_tracker.py`, `deploy.py`, `audit.py`, `sweep.py`, `chess-tracker.template.html` from `https://raw.githubusercontent.com/LearnToCheckmate/chess-trainer/main/FILE`. For verifying deploys, fetch by COMMIT HASH (the main path caches ~5 min).
3. Read the backlog fully; ACTIVE QUEUE is at the top; reconcile it at the end of every run.
4. **READ THE FEEDBACK TRACKER FIRST: https://claude.ai/code/artifact/20acb6cb-42bf-44a3-b2fe-5a8223cca1e2** (Artifact action read_db, collection `flags`; doc id = item id, fields {broken, note, at}). Built 2026-09-12 after Kunal tested the live app himself and found two items I had marked done were not done, and concluded — correctly — that others were probably missed too. It holds every item he has raised with its status, the build it shipped in, and **the evidence line saying how it was checked**, plus a "still broken" button per row. ANY doc in `flags` with broken=true is a claim of mine that failed on his phone: it outranks everything else in the queue. Read it at the START of every run and again before the close-out. When an item's status changes, republish the page (same URL, file path in the scratchpad, capabilities db) so the list does not drift from reality.
   - THE RULE THAT PUT IT THERE: a "done" is only done in the configuration it was measured in. Both misses were closed on a FRESH-INSTALL measurement while his phone carried preferences saved months earlier. Run `work/build/veteran360.js` (the stored-profile sweep) before claiming any layout item is fixed.
5. READ KUNAL'S FEEDBACK FROM THE TWO ARTIFACTS before choosing work (Artifact tool, action read_db, db_op list):
   - Roadmap: url https://claude.ai/code/artifact/b0acbc6c-af09-4af3-8c0e-a31e84ae63ec, collection "feedback" (doc id = roadmap item id; fields text, pick, at). pick=true means "Build next"; text is his per-item feedback. Treat as his instructions for the queue.
   - Space audit: url https://claude.ai/code/artifact/ca66f603-c14a-4163-85f7-7660e6ce6a02, collection "decisions" (doc id P1..L2; status approve/skip/discuss or A/B/C for L2).
   Acknowledge what was read in the pre-flight block ("Feedback swept: N roadmap notes, M audit verdicts"). Republish the roadmap artifact (same URL, capabilities db) whenever gen_tracker.py changes so the item list stays current; item ids are t<index>-<slug>, keep them stable by appending new items at the end of T.
6. Kunal's standing authorization is unlimited: every message buys the longest safe run.

## 2) Architecture (CHANGED since June - read carefully)
- App = one React component in `chess.jsx` (~816KB) bundled to `app.js`. **The 170-lesson library now lives in `lessons.js`** (window.CTLESSONS, loaded by index.html BEFORE app.js; #311 split). Lesson edits are lessons.js-only data commits. audit.py reads lessons.js and HARD-FAILS if it finds no arrays.
- Service worker `sw.js` v4: app.js + lessons.js network-first; index.html network-first; heavy assets cache-first.
- Firebase (chess-trainer-d3664): auth + Firestore glue lives in index.html as window.CTCloud (load/save are merge:true on users/{uid} - progress sync uses ctProgress key). Stockfish 18 lite via Worker.
- Deploy: `python3 deploy.py --build N --msg "..." [--files extra...]` from the repo dir; build dir needs entry.jsx + node_modules (esbuild, react, react-dom); token via $GITHUB_TOKEN env inline.

## 3) HARD GATES before every deploy (blood-bought, 2026-09-06)
1. esbuild compile check clean.
2. audit.py PASS (currently 170 lessons; a 0-lesson pass is impossible now by design).
3. **jsdom MOUNT CHECK: root renders, body contains CHESS TRAINER, zero console errors.** #315 shipped a white-screen outage (effect deps referencing state before its declaration) precisely because this was skipped. Never again. Load lessons.js into the jsdom context BEFORE app.js.
4. Gallery-verify: every user-visible change ships as an auto-running Preview-gallery card (SC array), driven in jsdom before deploy.
5. After deploy, verify the live bundle at the commit hash, not main.

## 4) Conventions (Kunal's, unchanged and non-negotiable)
- Pre-flight block printed at the top of every reply: Feedback swept / Gallery state / Backlog synced.
- After every deployed build, END the reply with a faithful rendered mockup of the changed screen (phone frame, real colors/text), labeled as a rendering.
- END EVERY run with a brief three-part close-out: what was accomplished, what is next, what the remaining gap is. Short. Kunal asked for this as a standing habit on 2026-09-12, not a one-off.
- **BEFORE THAT CLOSE-OUT, DRAIN THE FEEDBACK INBOX. Kunal's standing instruction, 2026-09-12.** He adds items there while a run is in flight so he does not have to interrupt. The loop is: finish the work, READ THE INBOX, build whatever is new, read it AGAIN, and only when it comes back with nothing new do you write the close-out. Do not close out on a first read.
  - TWO CHANNELS, READ BOTH EVERY RUN:
    1. PROJECT DOCUMENT `claude/FEEDBACK-INBOX.md` (Projects tool, project_read). This is the primary one because it connects to Kunal's other chats: he can tell any Claude in this project to append to it, or add to it himself through the knowledge panel. APPEND-ONLY, HIS RULE: never delete or reword an entry. Change `status: open` to `status: closed #NNN` and append a `closed:` line under it saying what was done. Every entry carries a real `[YYYY-MM-DD HH:MM ET]` stamp; if a stamp is not known, write "date only" rather than inventing a time.
    2. INBOX ARTIFACT https://claude.ai/code/artifact/7b876dc4-be89-4f73-a839-3a454cab40ef, collection "items", fields {text, at, status, build}. Read with Artifact action read_db, db_op list; mark handled with write_db db_op update {status:"done", build:"#NNN"}. Faster for him to type into on a phone.
  - ARCHIVING, his instruction: when the document gets bulky (about 150 closed entries, or 40 KB) MOVE closed entries older than 30 days to `claude/FEEDBACK-ARCHIVE.md` with their text and closing notes intact, and leave a one-line pointer behind. Moved, never deleted.
  - WHY IT IS A DOCUMENT AND NOT THE CHAT, stated precisely because the loose version of this was wrong and Kunal rightly pushed back on it. A project's KNOWLEDGE (its documents and custom instructions) IS shared into every chat in the project. The chats' MESSAGES are not. VERIFIED rather than assumed: searching project knowledge for a phrase that exists only in his messages returned six hits, every one from HANDOFF.md and not one chat message, and a tool search turned up nothing in the session that reads a conversation. So the bridge is to move feedback OUT of a chat and INTO a document, which is exactly what claude/FEEDBACK-INBOX.md is for. Do not tell him "I cannot read project chats" flatly; the accurate sentence is "I can read any project DOCUMENT, I cannot read another chat's messages."
- THE OTHER FEEDBACK SURFACES, AND A MISTAKE NOT TO REPEAT: the Review Screen Audit artifact (9597e210-cb6c-4174-99d6-204d256dfb56, collection "decisions") was read ONCE early in the 2026-09-12 session and reported as "untapped" in four consecutive close-outs. He had in fact tapped all seven items on 2026-09-11 at 17:32. RE-READ EVERY FEEDBACK DB EACH TIME; never cache a "nothing there" answer across builds. His verdicts were R1 approve (one-screen default, shipped #339), R3/R4/R5 keep (move strip, key-moment button, best-move chip - all still present), R2 and R6 discuss (both overtaken by his later verbal direction: the horizontal eval strip and the player bars), Q1 icon (he opens from the HOME SCREEN, which is what made the missing bottom safe-area inset matter).
- No em-dashes in replies or UI labels. No emojis unless he uses them. US spelling. Answer-first. Vertical status blocks. Build stamp at the bottom only when a deploy happened.
- Voice-to-text decoding: "PNG"=PGN, "bills"=builds, "gosling"=castling, "Fortnite's game"=Four Knights, "Maltese"=make sure. Repeated identical messages = one message.
- Design-taste decisions: annotate his actual screenshots (color-coded keep/change/demote) + a decision table + tap-to-approve buttons. He explicitly likes approving in place. The chess.com-style redesign is PERMANENTLY closed; current simplification work is subtraction only, identity untouched.
- Trap/gambit lessons must frame unsound moves honestly (sweep.py flags; named traps flag by design). Videos: only embed Hanging Pawns IDs confirmed via search with attribution; never from memory; note confidence.

## 5) State at handoff (build #330, Cowork session 2026-09-06 evening)
- #321 shipped from Cowork: the last UX straggler. Prev / All-openings / Next row gone inside lessons (watch + practice); previous/next lesson now named buttons at the top of the 3-dot sheet. Gallery card "Lesson nav row gone (NEW)".
- COWORK DEPLOY PATH (differs from deploy.py): the Cowork sandbox blocks api.github.com AND learntocheckmate.github.io. Deploy = same gates, esbuild bundle, then `git commit` + `git push` over github.com with the PAT as an HTTP Basic header: `git -c credential.helper= -c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$T" | base64 -w0)" push https://github.com/LearnToCheckmate/chess-trainer.git HEAD:main` with GIT_CONFIG_GLOBAL=/dev/null (the sandbox git proxy refuses a token on the URL; the header form works). Verify by fetching raw.githubusercontent.com at the COMMIT HASH (works); Pages liveness must be confirmed by Kunal's phone (host blocked). Driver files live in the build dir: mountcheck.js (gate 3 + drive runner), deploy_git.py.
- #324-#326 (same evening, acting on Kunal's roadmap feedback "build everything that does not need me, one by one, without stopping"): #324 21 Hanging Pawns videos sourced by driving his Chrome to youtube.com/@HangingPawns/search (channel-scoped, IDs read from ytInitialPlayerResponse on each watch page; sandbox YouTube fetches are 429-blocked, Chrome is the way); #325 WebRTC video call in online play (signaling through the game doc via gamePush, STUN only, needs his two-device test; TURN is his infra item); #326 ring-bar wrap in the rail. Domain: gambitcoach.com is TAKEN; candidates checked live at Cloudflare are in the backlog #324 entry; the purchase click is Kunal's (blocked for Claude by design). After purchase: DNS CNAME @ and www -> learntocheckmate.github.io (proxy off), commit a CNAME file, Firebase authorized domains (his console), Enforce HTTPS (his GitHub Pages settings).
- #327 (Kunal said "keep going" and went to bed): space audit batch 1, the four pure subtractions P1/P3/M1/L1, verified live in his Chrome. The audit page now shows those four as Built; the other eight (P2 P5 D1 D2 D3 M2 M3 L2) still need his taps, they are taste calls and were deliberately NOT built unattended.
- #328 (2026-09-08): opening videos batch 2, 11 more channel-confirmed Hanging Pawns walkthroughs, 82 of 170 lessons now have one. Terms that came back empty are listed in the backlog so nobody re-searches them; note that HP channel search is keyword-flaky (Winawer returned nothing under its own name and surfaced under another term), so an empty result means "not found by that term", never "does not exist".
- #329 (2026-09-08): FIXED the long-standing join-by-CODE bug. The invite-link path always stripped non-alphanumerics; the typed path did not, so one stray keyboard character 404'd as "no game found". Typed codes are now sanitized the same way, the box carries the iOS keyboard attributes, and a failed join names the exact code tried. Root cause is strong but was NOT reproduced on Kunal's device; if a clean code still fails, suspect Firestore rules on the games collection next.
- #330 (2026-09-08): first ENDGAME videos (Bishop & Knight Mate, Queen vs Pawn), 84 of 170 lessons now have one; two stale entries closed by evidence rather than by code (the variation-branch issue was already fixed, proven by a jsdom drive; the "Review overhaul" note still claimed the brilliant heuristic was open, it closed in #307); tracker duplicate removed.
- UI SWEEP (2026-09-08, no defects): every main screen in real Chromium at 320x568, 390x844, 430x932. Zero horizontal overflow, zero off-screen elements, zero clipped text, zero app console errors. Do not re-run this speculatively; re-run it after a layout change.
- DEPLOY TIMING NOTE: after a push, Pages can serve the new app.js while the page still runs the old one for a minute or two. A second reload picks it up. Do not diagnose this as a service-worker bug; check the wire first with `fetch('/chess-trainer/app.js',{cache:'reload'})` in the console, which is what settled it on #330.
- Remaining autonomous items: NONE that do not need Kunal. Deliberately NOT shipped unattended: the iOS PWA sign-in fix (popup to redirect fallback) - it touches the auth path for every user and cannot be verified without his iPhone, and after the #315 outage an unverifiable auth change is not worth the risk. Queued for a session where he can test. iOS PWA sign-in persistence needs an iPhone; Tournaments Stage 3+ needs his Firestore rules; the space audit needs his taps. Next session: read both artifact dbs first, then build what is approved.
- #323: sw.js fetches the fresh set with cache:no-cache (Pages max-age=600 was hiding new builds for up to 10 min; that was the force-close ritual). #322: gallery flush. Two cards verified LIVE by Claude driving Kunal's Chrome (see next bullet) and removed. Gallery: 2 live cards, both one-screen-fit questions that need his phone: "New Game on one screen", "Focus mode stage C".
- NEW VERIFICATION PATH (Kunal's standing approval, 2026-09-06): Claude in Chrome is connected to his "Personal Chrome" (Windows). Claude may open learntocheckmate.github.io there, run gallery cards, read the DOM with javascript_tool, screenshot, and FLUSH cards it confirms. Limits: the window would not resize below desktop width (1278), so phone-fit questions still need Kunal; Pages liveness can be read there (sandbox cannot reach the host). Pick the browser with switch_browser at session start (two Chromes are registered on the account).
- Space audit: proposed (not built) as a tap-to-approve artifact with real Chromium renders of #321: Puzzles header (P1-P5), Discover rows (D1-D4), Menu sheet (M1-M4), lesson focus (L1 title duplicate, L2 the 123 px flex-spacer band above the board, options A/B/C). Build only what Kunal approves; read his taps back from the artifact db (collection "decisions").
- Waiting on Kunal (his dashboard): old GitHub token DELETED 2026-09-06 (done); two-device sync check; Stripe test prices at $2.99/$19.99 + checkout test; buy gambitcoach.com; deploy scanBoard function; publish Firestore rules for tournaments/friends/nearby (this last one unlocks three buildable features).
- Sourcing notes: Caro-Kann Fantasy video 0yMkAJ6Pyig is single-source attribution; Kunal has not yet confirmed playback. Held HP IDs (no matching lessons yet): Two Knights Caro S5OjT1K_s58, Karpov YLEmufSFoGk.

## 5a) State at builds #331 to #358 (Cowork session 2026-09-10 evening into 2026-09-12)
- #341: the review move screen has no tab bar, a back arrow as the only exit, a one-line reason under the move, thin arrows on the move strip, and "Analyze with the engine" (eval plus the engine's line in notation, cached per FEN). The engine pass for a whole game is cached in localStorage (ct_evalcache, keyed on the move list plus movetime, 24 games LRU): 62 s first run, 4 s on a repeat. If review output ever looks stale after changing the analysis code, bump the key string in evalCacheKey. Screen audit at 430x932: review board 424 of 430, puzzle and drill 416, play 416, lesson 416; play and lesson still carry heavy chrome, and the base-layout decision for them is open.
- #339: LESSON WORTH KEEPING. Flipping a default is not enough when an effect has already persisted the old value to every install: #337 made the one-screen review the default but Kunal's phone had ct_revCompact='0' stored from the preview era, so he kept seeing the classic screen and re-reported the same complaints. Any future default flip needs a one-time migration key like ct_revmig339. Also in #339: the eval bar moved off the side (full width strip, horizontal number) so the board takes the full screen width, with a three-way sheet control (above / beside / off); #340 put that strip above the board at his request. Great is now blue #5d93e8, not teal.
- #338: the tab-bar spacer now carries order 99. It had none, and the puzzle screen is the only screen that orders its children, so there the spacer rendered FIRST (empty band at the top) and reserved nothing at the bottom (board and controls under the tab bar). If you ever add order to another screen's children, give every sibling an order or this returns. Puzzle boards are now sized from a measured pzStackH; the drill hides the Lichess panel; dev loaders are collapsed.
- #337: one-screen review is the default (Kunal asked for its cuts a second time on the classic screen): no app header on this screen, ‹ Summary and ⋯ only, no text box, move + verdict + best chip on one line, board 360 px beside the bar. Classic stays in the sheet until he confirms R1; then delete the classic move-screen block and the sheet item. Audit page v3 reflects this.
- #336: bar number reads upward at both ends (Kunal asked for the 180-degree flip).
- #335: eval chip removed on Kunal's note; the eval bar's number is 13 px, vertical along the bar, at the leading side's end. Audit page R2 reworded (along the bar vs wider bar with horizontal number).
- #334: Game Review summary got a pinned footer (Back to games, Start review) with the body scrolling under it; Kunal's second note of the day, built after the move-screen piece reached its waiting-on-taps state. Gallery card "Summary: buttons pinned to the bottom".
- #333 (2026-09-11 afternoon): Kunal's four-point feedback on the Review move screen. FIXED: board plus eval bar overflowed the phone width (both sides clipped). ADDED: eval chip on every move line. PREVIEW (off by default, gallery card turns it on, the review three-dots sheet turns it off): one-screen review layout; his verdicts land in the "Review Screen Audit" artifact (9597e210-cb6c-4174-99d6-204d256dfb56, collection decisions, R1..R6 + Q1). READ IT FIRST next session, then: if R1 approved, make revCompact the default and delete the classic move-screen block and the Classic review layout sheet item; apply R2..R6 as tapped. The black band is undiagnosed; the "Layout numbers" card toasts the phone's viewport numbers and Q1 asks how he launches the app.
- #332: gallery-card-only fix. Verifying #331 LIVE in Kunal's Chrome showed the Review screen's one-time auto-fetch replacing the staged demo rows with his real 20-game list within seconds (the sandbox never sees this because Chess.com is blocked there). The card now sets gamesAutoRef and seeds ccRawRef before entering analyze mode. Lesson: any card that stages the games list must do this.
- #331: brilliant-pill inconsistency fixed at the UI and data layer, not the gate. Background tallies are stamped src:'est' and render as EST rows with a hollow dashed "!! N brilliant?" pill; a full review stamps src:'review' (solid glowing pill) and, if it finds fewer brilliants than the stored count, keeps was:N so the row says "review found 0 brilliant (estimate said 1)". The missing evalBefore argument in analyzeGameCounts is fixed (latent: the gate's null check already fell back to the same value; 0 verdict diffs across 286 plies). Gate thresholds UNCHANGED, by evidence: the Bxg5 brilliancy (gomdz game, not dev_mooie as the brief said) passes the deep gate with loss 0; the shallow pass fails it on loss 130 and evAfter 0.70. Full readout of all six evidence games is the top backlog entry.
- Open decision for Kunal (one line either way): keep the hollow estimate pill, or drop brilliant from the estimate pass entirely (0 for 4 precision on the Sep 10 sample).
- Bxh3 knife-edge: at depth 18 in the sandbox engine, evBefore reads 4.52 against the 4.5 ceiling (his phone read 3.87 and passes). If it ever shows ?! on device, raise the evBefore ceiling to 5.0; do not touch the caps.
- THIS SANDBOX (2026-09-10) blocked raw.githubusercontent.com, api.chess.com, npm and pypi. What worked: `git clone --depth 5 https://github.com/LearnToCheckmate/chess-trainer.git`; Kunal's Chrome (list_connected_browsers -> "Browser 1") for api.chess.com; React 18.3.1 REBUILT from the live app.js vendor prefix (the esbuild `gi(` module wrappers up to `var iI=Ko(gs())`) into node_modules/react and react-dom, so the bundle stays on the shipped React; esbuild 0.27.7 borrowed from the global tsx install; mount check and gallery drive in real headless Chromium via the global Playwright (mountcheck.js in /home/claude/work/build), which replaces jsdom when jsdom cannot be installed; the repo's own Stockfish worker runs in that Chromium at real depth (readout.js). audit.py needs python-chess, which could not be installed; a build that leaves lessons.js byte-identical to the last audited commit documents that instead of skipping silently.
- PUSH BLOCKED 2026-09-10 (this changes the deploy path): the sandbox git proxy only injects credentials for repositories in the session's SOURCES, and a request carrying its own Authorization header to github.com is refused outright ("no rule allows host github.com"), so the Sep 6 header-form push no longer works and neither does api.github.com. Exact messages: unauthenticated push -> "access denied by the git proxy: LearnToCheckmate/chess-trainer is not in this session's authorized repository set ... add the repository to the session's sources"; header push -> "request blocked: no rule allows host github.com". THE FIX FOR NEXT TIME: start the Cowork task with the LearnToCheckmate/chess-trainer GitHub repository added as a source; then a plain `git push origin main` works through the proxy's own credential and no PAT is needed at all. Fallback used for #331: the six changed files were handed to Kunal as deploy331.zip for a GitHub web upload (repo page, Add file, Upload files, commit directly to main), or uploaded by Claude through his Chrome (file_upload into the upload page's file input accepts files from the session outputs folder) when the extension is connected.
- Verify-by-hash after a push: raw.githubusercontent.com was blocked here, so verification goes through Kunal's Chrome (javascript fetch of raw.githubusercontent.com/LearnToCheckmate/chess-trainer/<hash>/app.js, check the stamp string), and the blob shas of the six files can be cross-checked against the local commit with `git ls-tree HEAD`.

- #343 (2026-09-12): the reason a move got its verdict, an analysis board, a parallel review engine and the first screen of the base shell. #342 was built and gated separately (reasons + analysis board) but never uploaded alone, so it is live INSIDE #343 and there is no #342 commit. Full detail in the backlog.
- LESSON, PARALLELISM: a game review is many INDEPENDENT shallow searches, not one deep one, so a pool of single-threaded workers beats a multi-threaded engine for this workload and needs no SharedArrayBuffer, no COOP/COEP and no new binary. Measured 61s -> 27s on 3 workers, same game, same machine, with MORE time per position than before. If anyone revisits threads: COEP require-corp WILL cut off Firebase/gstatic, the chess.com API and Lichess (all cross-origin, none send CORP); credentialless is the only variant worth trying, and its Safari support is the open question. The threaded binary is also not obtainable in this sandbox (npm, jsdelivr, cdnjs blocked; the Stockfish WASM repos on github are C++ source only; emscripten will not run here).
- LESSON, CACHE KEYS: never key a cache on a value that varies with the device. The eval cache key included movetime, which now depends on how many workers came up, so a valid cached review would have been missed on a differently sized pool. It is version-tagged (sf18c) instead, and the cache is read BEFORE any worker is created so a re-review still costs nothing.
- LESSON, THE BLACK BAND: Kunal flagged it twice and it was never a bug. A square board on a 932px phone leaves ~190px, and the layout split it into dead space above and below. The fix is the base shell: the board column takes the leftover height (flex 1 1 auto) and the two player bars absorb it (flex 1 1 0, min 46, max 96). Measured after: 4px above the top bar, 8px below the controls, board width unchanged.
- BASE SHELL, AGREED WITH KUNAL AND BUILT ON REVIEW FIRST: back arrow and dots, player bar, board at full width, player bar, one context line, one row of controls. STILL TO ROLL: play, lessons, puzzles (all three still lose 8px to a legacy reserve - 416 of 430, 376 of 390 - and play carries a 111px Elo/slider/controls row while lessons carry a 61px coach line, a 205px text block and a 99px moves panel).
- TWO HARNESS TRAPS THAT COST TIME, DO NOT REPEAT: (1) to play a move on the board in Playwright, tap the PIECE then tap the TARGET; pressing the source square a second time deselects it, so a click-then-drag from the same square never registers a move. (2) The round verdict badge (?? / !!) is an inline `border-radius: 50%` element, so any "find the legal-target dots" scan counts it on every square; diff the dot set before and after selecting instead of counting it.
- GATE SCRIPTS THIS SESSION (in /home/claude/work/build): rev342.js is the full review gate (25 assertions per viewport, both 430x932 and 390x844, includes the parallel-review timing and the base-shell measurements); reg343.js is the regression check for the screens NOT redesigned (play, puzzles, lessons: board width, squareness, no scroll, zero errors). audit-screens.js is legacy and its gallery-card opener is brittle; prefer reg343.js.
- BRILLIANT-GATE REGRESSION GUARD, CHEAPER METHOD: rather than re-measuring with Stockfish, byte-compare classify, seeSq, brilliantGate, isBrilliant and isAttacked against the live commit and confirm the thresholds 220 / 1.2 / 4.5 / -1.0 / 90 each still occur exactly once. If not one byte changed, Bxh3 passes and Bc7/Bxf6 fail by construction. Script pattern is in the #343 backlog entry.
- UPLOAD TRAP, COST TWO ROUND TRIPS: on GitHub's web upload page, clicking "Commit changes" BY ELEMENT REF silently does nothing - the form just sits there and the commit never lands. Click it by COORDINATE instead (screenshot, read the button position, left_click at those coordinates), then confirm with `git fetch origin main` before closing the tab. Never assume the upload committed because the click returned success.
- AFTER A WEB UPLOAD, RECONCILE THE LOCAL BRANCH: the web UI creates its own commit objects, so local main diverges from origin/main even though the content is identical. Confirm with `git diff --stat HEAD origin/main` (empty) and matching `git rev-parse HEAD^{tree}`, then `git reset --hard origin/main`. Otherwise every later session sees phantom unpushed commits.
- localStorage ct_pool (1..6) overrides the review worker-pool size; the gate uses it because this sandbox reports 2 cores and would otherwise never exercise the parallel path.

- #344 (2026-09-12): the review screen fits every phone. Detail in the backlog. Three lessons that generalise well beyond this screen:
- LESSON, THE TEST VIEWPORT WAS LYING. Headless Chromium reports `env(safe-area-inset-*)` as 0. A notched iPhone installed to the home screen has ~59px of status bar and ~34px of home indicator, so testing at 430x932 hands the layout ~93px it will not have in the user's hand. The app measured the TOP inset and never the bottom. If a layout passes every gate here and still fails on his phone, suspect this first. Both insets are measured now (safeTop, safeBot) and both come out of the height budget.
- LESSON, SIZE FROM BOTH AXES. The phone board was sized from WIDTH only. There was a height cap but it under-counted the chrome by ~124px and carried a floor that overrode it entirely on short screens, so the board never shrank and content fell off the bottom. Any board screen must be capped by BOTH the width cap and (usable height - chrome).
- LESSON, MEASURE, DO NOT TUNE. Kunal's own framing, and he was right: "different phones are gonna have different heights and different widths... we should do something that works across all phones, not just mine." The fix is a useLayoutEffect that reads the real `scrollHeight - clientHeight` after paint and shrinks the board until the overflow is zero. Shrink-only inside a settle cycle with an 8px cushion, and reset the trim to 0 when the screen or content changes so the board can grow back; growing back inside the same cycle oscillates and lands a few px over. Bounded passes. A constant cannot know about a wrapped name, a two-line reason, a mate score, a larger accessibility font, or a phone that does not exist yet. WHEN THE BASE SHELL IS ROLLED TO PLAY, LESSONS AND PUZZLES, REUSE THIS LOOP RATHER THAN COPYING A NEW CONSTANT PER SCREEN.
- BRILLIANT-GATE GUARD, GET THE SLICING RIGHT: compare BRACE-MATCHED function bodies, not a slice running to the next top-level `function`/`const`. The lazy version reported seeSq as CHANGED in #344 purely because an unrelated comment had been added below it. Brace-match, hash, and check the thresholds 220 / 1.2 / 4.5 / -1.0 / 90 each still occur exactly once in brilliantGate. Baseline against the last LIVE commit, not HEAD, or an in-session commit makes the comparison vacuous.
- FIT HARNESS: /home/claude/work/build/fit.js measures overflow on 14 real phone viewports (Pro Max through a 320px screen, installed and with-URL-bar variants). Run it on ANY layout change to a board screen. Before #344 the Safari-height cases were cut off by 89 to 158px and every one of them passed the ordinary gate, which only tested full device heights.
- CONTEXT COMPACTION ATE THE EARLY SESSION HISTORY. When Kunal asked for a sweep of feedback given "over the last day", only today's messages could be read back verbatim; the rest came from a summary. If a request goes missing, that is the mechanism. Fold feedback into the backlog AS IT ARRIVES rather than trusting the transcript to still be there.

- #345 (2026-09-12): move-strip verdict colours, a reason line that works on good moves, and the base shell on Play. Detail in the backlog.
- LESSON, COLOUR-CODE THE WHOLE SCALE OR NONE OF IT: the move strip coloured only Inaccuracy/Mistake/Blunder, so Brilliant, Great and Miss were invisible there and lost their symbols, and a hard-coded amber "current move" chip overrode the verdict colour outright. Kunal caught it from a screenshot. When a classification drives colour anywhere, check EVERY surface that shows that classification: the pill, the board badge, the strip chip, the summary counts.
- LESSON, THE 4px THAT COST 8: `reserved` subtracted 4px for the VERTICAL eval bar on every non-review screen even when the bar was running horizontally above the board. After the /8 square rounding that is a full 8px off the board width. Play and puzzles both went 416 -> 424 (and 376 -> 384) by deleting one condition. Look for this pattern whenever a board is mysteriously one square-width short.
- THE FIT LOOP IS GENERAL NOW: `_fitScreen` covers the one-screen review, play, puzzle browse/online and an open lesson, and `boardTrim` applies to all of them. Reuse it for any new board screen; do NOT add a per-screen constant.
- BASE SHELL PROGRESS: review DONE (#344), play DONE (#345, black band 237px -> 0), puzzles DONE by side effect (#345). LESSONS STILL OPEN and it is a CONTENT decision, not a layout one: 61px coach line + 205px text block + 99px moves panel against Kunal's "one context line". Do not delete lesson prose without asking him.
- RANK 1 IS NOT CLIPPED, settled by measurement at four sizes (all eight ranks identical to the pixel, ranks sum to the grid height, last rank clears the player bar by 2px). What looks like clipping in a screenshot is the file letters rendering inside rank 1 plus the 3px board border. Do not re-open.

- #346 (2026-09-12): the board holds still. Detail in the backlog.
- THE RULE THAT MATTERS MOST ON A BOARD SCREEN: a row that can appear or disappear MUST reserve its space. Because the player bars flex to absorb slack, a row appearing or vanishing ANYWHERE - above or below the board - changes the slack and therefore MOVES THE BOARD. Conditionally rendering a row is the bug; conditionally rendering its CONTENT is fine. Four separate instances of this were live at once in #345: the "Computer thinking..." banner, the review reason line (one line or two), the strength selector (vanished on the first move, freeing 111px), and the play move-history row.
- AND THE ONE I CAUSED: a measure-and-fit loop must separate GEOMETRY from CONTENT. #344's loop reset `boardTrim` to 0 on every dependency change and listed `playHist.length`, so the board flashed to full size and shrank back on every move. `_geoKey` (viewport, safe areas, mode, screen identity, eval-bar mode) decides whether to reset; content changes settle from the current trim. If you add a dependency to that effect, ask whether it is geometry or content.
- HARNESS: /home/claude/work/build/shift346.js plays a real move and samples the board's top and height 26 times through the engine's think, then steps 14 plies in review. It asserts exactly ONE distinct top and ONE distinct height per screen. Run it on any change that adds or removes a row on a board screen; the ordinary gates do not catch layout shift because they only measure the settled state.
- TRADE-OFF, on purpose: reserving the reason block costs board width on short screens (430x745 gives 368 where it gave 384). A board that does not move is worth more than 16px.

- #347 (2026-09-12): eight items from a screenshot batch. Detail in the backlog. Three lessons worth carrying:
- NEVER BUMP THE EVAL CACHE TAG WITHOUT A REASON. #343 changed the key from `sans|movetime|sf18` to `sans|sf18c` and silently threw away every review the user had cached. He reported it as "the review got slower", which is a very hard symptom to trace back to a cache key. The tag now carries a comment saying so.
- A PERFORMANCE BUDGET MEASURED IN THIS SANDBOX IS NOT A BUDGET ON A PHONE. #343 spent the parallel-worker saving on search depth (1333ms -> 2270ms per position) because the sandbox finished in 27s. On the user's device that wiped out the speedup completely. Budgets must target a WALL CLOCK and adapt: start low, measure real elapsed after one round of the pool, project the total, scale to land on target. Applies to anything timed, not just the review.
- FLEXWRAP IS A LAYOUT-SHIFT BUG WAITING TO HAPPEN on a board screen. The captured-pieces row wrapped to a second line once enough pieces were taken, grew the player bar and moved the board. Any row inside a flexing bar needs a fixed height and nowrap. The late-game pass in shift346.js (16 plies with most captures on the board, asserting the bars never change height) is what catches this class.
- CHROME BREAKDOWN, for the next person who wonders where the height goes. At 430x839 (a Pro Max installed, i.e. 932 minus the 59px status bar and 34px home indicator): header 40, top bar 72, eval strip 22, move line 38, reason block 38, controls 48, move strip 52, bottom bar 72 = 382px, leaving the board at its 424px width cap. The player bars are slack ABSORBERS, not cost: when the board is already at its width cap there is nothing left to reclaim. chrome347.js prints this.

- #348 (2026-09-12): player ratings and country flags in the player bars. Detail in the backlog.
- CHECK WHAT THE DATA ALREADY CONTAINS BEFORE BUILDING A FETCH. Ratings needed no network at all: `parsePGNHeaders` captures every header with a generic regex and chess.com and lichess both set `WhiteElo`/`BlackElo`, so the numbers were sitting in `review.headers` unused. Flags genuinely do need a lookup (no PGN carries a country) and that is the only part that touches the network.
- COUNTRY LOOKUP: `fetchCountry(site,user)` + `flagOf(cc)`, cached in localStorage under `ct_country` forever INCLUDING misses, so a player with no country is never re-fetched. chess.com returns `country` as a URL whose last segment is the ISO code; lichess returns `profile.flag`. api.chess.com is BLOCKED from the Cowork sandbox, so this path can only be confirmed on a real device - the gate can prove the fetch fires and that failure is harmless, nothing more.
- NEVER INVENT A NUMBER TO FILL A SLOT. `cpuElo` is the strength the user plays AGAINST, not their rating, so the user's own bar in Play shows no rating at all rather than a plausible-looking wrong one. No data, no pill.
- ADDING ANYTHING TO A PLAYER BAR IS A LAYOUT-SHIFT RISK: run shift346.js. The new flag and rating pills are `flexShrink:0` with the name ellipsizing, so line 1 stays one line and the bars still never change height.

- #349 (2026-09-12): a real Elo rating for human-vs-human games. Detail in the backlog.
- RATING DESIGN: K decays on games played (<10 K=56, 10-29 K=32, 30+ K=20, 30+ and 2100+ K=12), start 400, floor 100. That decay is the ONLY way to satisfy "about 10 points for a close game AND up to 50 for an upset" - a single K cannot do both. `eloK`/`eloExpected`/`eloDelta` are PURE and dependency-free so they can move to a Cloud Function verbatim; do not couple them to component state.
- NEVER FORCE A RATING RESULT TO MOVE AT LEAST ONE POINT. It feels right and it silently breaks Elo's fixed point: a player in a stronger pool gains +20 on a rare win and pays a forced -1 on every expected loss, measured at -0.581 points per game, enough to sink a correctly-rated player to the floor. Keep the rating as a FLOAT and round only for display, so rounding cannot leak either.
- AND BEWARE THE TEST THAT PROVES NOTHING: generating simulated results from the player's OWN CURRENT rating makes the walk driftless by construction, so it wanders until the floor absorbs it and looks like a bug in the code. The meaningful test gives the player a TRUE strength, generates results from that, and asserts the rating converges on it. elo349.js does both that and a direct drift measurement.
- THE EXCHANGE HAS NO SERVER REFEREE: each side's rating is written into the game record at create/join (index.html `_gameCreate`/`_gameJoin` take a meta argument), so both devices compute the same delta from the same two starting ratings. Guarded by `ct_rated` (already-settled game ids) because the watcher reports a result repeatedly. An opponent on an older build has no rating in the record, and then NO exchange happens rather than one side guessing.
- index.html IS PART OF THE APP, not just a shell: CTCloud lives there. When it changes, parse-check its classic script blocks as well as bundling chess.jsx, because esbuild never sees it.

### #350 the move describer (2026-09-12)
- THE SHAPE OF THE GAP, worth naming because it recurred three times: #343 asked for why a move is
  good or bad, #347 for why a move is brilliant, and the chess.com recording is the same question a
  third time. Our answers were always ARITHMETIC ("about 1.4 pawns gone", "nothing else came close").
  Chess.com's are POSITIONAL ("this builds pressure and creates a threat", "you chased the bishop
  away"). Both are explanations; only one is about chess. When Kunal says an explanation "doesn't
  help", check first whether the sentence describes the board at all.
- `moveGist(pos,mv)` returns `{did,left}` from the two board positions ALONE. The hard rule written
  into its comment: never infer a phrase from the evaluation. A positional claim that is merely
  plausible reads worse than none, because the reader cannot tell which kind they are looking at.
  `did` is ranked by interest so a clipped two-line box still leads with the thing worth reading.
- `explainAnno(a,ctx)` is module-level and PURE, not a closure inside the component. That is what
  lets a harness exercise the wording that actually ships. Any future wording change goes there.
- SEE FORCES THE SIDE TO MOVE, AND THAT FABRICATES FACTS AT BOTH ENDS. On a board where the MOVER is
  in check, every one of their pieces scores as winnable (the opponent "captures" while the king is
  still attacked), so every escape looks like it rescued the army. On a board where the OPPONENT is
  in check, nothing can be captured at all, so every checking move looks like it defended everything:
  Bxf7+ does not "defend the knight on e5", it just means Black has something more urgent to do.
  Guard any SEE-derived CLAIM with `!isInCheck` on both boards. Note the asymmetry: check suppresses
  a hanging verdict (fine, conservative) and invents a rescue (not fine).
- A VERIFIER THAT SHARES AN ASSUMPTION WITH THE CODE IS BLIND BY CONSTRUCTION. gist350's square
  exchange forces the side to move exactly as SEE does, so it could never have caught the four false
  sentences above; reading the output caught them. Where an invariant is known, ASSERT IT DIRECTLY
  (gist350 now asserts no rescue is claimed on a board with either king in check) rather than hoping
  a derived check notices.
- AND A VERIFIER CAN SIMPLY BE THE WRONG ONE. The first version of that check was a 2-ply search that
  modelled the recapture as the largest piece able to reach the square. It raised 17 false alarms and
  was thrown away, not acted on. Before believing a harness over shipped code, hand-check ONE case.
- READ THE OUTPUT. read350.js prints every explanation line of two full games with its character
  count. It is the only thing that caught: pointless pawn pins (five in one club game), "Checkmate.
  The position stays roughly level.", "Qxf3, forking two at once is the answer" as a comma splice,
  "about 1.1 pawn", and all four check artefacts. No assertion would have flagged any of them.
- Cost 294us per ply, cheaper than the motif pass already running, 0.1% of the 24-second budget. A
  describer that walks the board a few times is not what makes a review slow.

### #351 to #353 and the outage I caused (2026-09-12)
- **NEVER `git reset --hard origin/main` UNLESS EVERY CHANGED FILE WAS UPLOADED.** The GitHub web
  upload only carries the files you attach, so a hard reset afterwards silently reverts every local
  file you did NOT attach. It ate tonight's whole FEEDBACK-INBOX batch (recovered from the local
  commit via `git show <sha>:FILE`, and the project copy was untouched because project_write does
  not go through git). Either attach every changed file, or reconcile with `git fetch` alone and
  leave the branch ahead.
- **THE BUILD COMMAND IS build.sh AND NOTHING ELSE.** `/home/claude/work/build/build.sh "#NNN"`.
  I bundled #350 by hand with `esbuild chess.jsx` rather than `esbuild entry.jsx`. chess.jsx only
  DEFINES the component; entry.jsx is what calls createRoot. The shipped bundle therefore had no
  mount call in it and the live app was a white screen for about forty minutes. build.sh uses the
  right entry, minifies, stamps, runs node --check, REFUSES to emit a bundle with no createRoot,
  and writes ct/app.js and work/build/site/app.js from the same bytes.
- **AND THE GATES WERE LYING.** The browser harnesses serve `work/build/site/app.js` and nothing
  copied a new build into it, so all six gates I ran for #350 executed against the #349 bundle and
  reported on code I was not shipping. A gate that passes against a stale file is worse than no
  gate, because it buys confidence. If you ever hand-build, `md5sum ct/app.js site/app.js` before
  believing a single gate result. HANDOFF gate 3 (mount check) is the one that catches this class
  in seconds; run it FIRST, not last.
- A third bug rode along: `const _edge` referenced `wide` 35 lines before `wide` was declared. TDZ
  ReferenceError, white screen, the #315 failure mode verbatim. Declaration ORDER inside this
  component is load-bearing; putting a derived const near where it reads well is not safe.
- **THE BOARD IS NOW EXACTLY THE SCREEN WIDTH.** Kunal raised "visible borders on the top and the
  sides" three times and the first two fixes missed, because the cause was not padding. SQ was
  floored to a whole multiple of 8, so a 430px screen could never exceed a 424px board however
  much padding came off. On a board screen (`_edge`) the square is FRACTIONAL. If you ever
  reintroduce integer squares, those borders come back and he will raise it a fourth time.
- Slack on a board screen belongs to the player bars, and the board column must not CENTRE its
  children: taking the header row away handed it 40px which reappeared as a dead band ABOVE the
  board. `justifyContent:flex-start` when `_edge`.
- The back arrow, the dots, and on Play the house and the hamburger, all live INSIDE the top
  player bar now. Their rows are deleted. This is the cheapest 40-50px on any board screen and the
  bar had the room.
- **DRIVE THE APP BEFORE BUILDING FROM A FEEDBACK LIST.** Of the items Kunal pasted in, back and
  forward during a live game already existed, the summary was already one card with two columns,
  and a notation section already exists (coach sheet, learnGroup 'notation'). I would have rebuilt
  all three. His feedback spans several deploys, so some of it is already answered; screenshot the
  current build and check before writing code.
- Equally: "remove the You are Black label and the White to move indicator" does not match what
  the build renders. The only turn text left is "Computer thinking..." and "Check!". The nearest
  thing is the WHITE/BLACK word #344 added BECAUSE he said reading his side from colour alone
  threw him off. When two notes pull opposite ways, ask; do not pick one.
- The "minute time controls disappeared" report is NOT a regression: online play has never offered
  them, in at least twenty builds. The ones he remembers are on the vs-computer screen, which
  still has them. Check `git log -S` before accepting a regression report.
- Castling by drag could not be reproduced: `matchTarget` accepts the king dropped on g1/c1 AND on
  its own rook, and `commitOrPromote` calls it. Left open with a request for detail rather than
  "fixed".
- **#353 imported games were never persisted at all.** The username was one string and every fetch
  assigned `ccRawRef.current` wholesale, so looking up a friend destroyed your own history with no
  undo, and a reload did not help because nothing was ever written down. Games are now filed per
  account under `ct_acctgames` with `ct_accts`, capped 8 accounts x 40 games. `gameInfo` asks the
  GAME which account it came from rather than reading whatever is typed in the box, because with
  several accounts loaded the box is wrong for every game but the last.
- `acct353.js` asserts SURVIVAL, not the happy path, because the bug was silent and destructive.
  Writing it caught a harness hole first: `addInitScript` re-runs on every navigation, so an
  unguarded seed restored the removed account and the reload assertion was testing the seed.
- Decisions artifact for Kunal (nine open calls, the backlog, and a pick-next list), read his
  answers with `read_db`, collection `answers`:
  https://claude.ai/code/artifact/99232fb2-f9f3-4019-a285-c3c16eb7de68

### #354 and #355 (2026-09-12, overnight)
- **THE DEMONSTRATION EXISTED ALL ALONG AND NEVER RAN FOR THE MOVES THAT NEEDED IT.**
  `playBestLine` animates a line on the board. It starts from `analysis[i].bestMove`, and the review
  NULLS that whenever the played move already was the best one. So Brilliant, Great, Best and
  Excellent, the four verdicts where the played move IS the best move, had nothing to start from and
  no button at all. Kunal asked twice why a brilliancy never explains itself; that was the answer.
  `playBestLine(firstOverride)` now takes the played move, and `_wasBest` renders a "why" button.
- **THE SCROLLHEIGHT TRAP, and it had been costing board size on every device.** The fit loop's
  grow branch tested `over < -24` where `over = scrollHeight - clientHeight`. scrollHeight is
  CLAMPED to at least clientHeight, so a page that fits reports exactly 0 and never a negative
  number: the loop could shrink and could never grow back, and one over-correction was permanent.
  It now measures the bottom-most laid-out child of the root (skipping fixed/absolute overlays),
  which can be smaller than the viewport and answers in both directions.
- **AND IT OVER-CORRECTED, because setBoardTrim is async.** Measuring on every animation frame meant
  measuring the SAME overflow several times before the DOM had shrunk once, and every one of those
  frames trimmed again: a 6px overflow took 128px off the board. The loop now sits out one frame
  after each correction. If you touch this loop, keep the settle frame.
- The fit loop no longer refuses wide layouts. An iPad in LANDSCAPE was the last board screen sized
  by a constant, and that constant predates #344's player bars: 102px of overflow on an iPad Air.
  Every iPad PORTRAIT size already fitted, which is why measuring first mattered.
- On a WIDE screen the player bars must not flex. On a phone they absorb the slack a square board
  leaves (#344); on a wide screen the rail beside the board holds real content and the slack belongs
  there.
- **SQ IS ONE VERY LONG LINE. A `//` COMMENT INSIDE IT SWALLOWS THE REST OF THE LINE.** That cost a
  build. Use `/* */` inside any of the long single-line useMemos.
- KNOWN, MEASURED, NOT FIXED: the first play-it-out tap after a review traps the Stockfish worker
  once (RuntimeError: unreachable). `engcrash.js` taps each button first in its own fresh context and
  BOTH the new one and the long-standing best button produce exactly one trap, so it is not #354's
  doing. The line still plays because the local fallback search takes over. why354 allows that one
  error BY EXACT TEXT so any other error still fails the gate; remove the allowance when it is fixed.
- Adding `stop` before every reposition of a shared engine worker is correct UCI hygiene and is in,
  but it did NOT fix the trap. Do not let the commit message or the code imply otherwise.
- Harness traps worth knowing: matching a control by GLYPH found "Last move" before the aria-label
  for "Next move" and pinned a 44-ply walk to the final ply; and a board signature built from string
  LENGTHS barely moves when a piece does, so a working animation looked dead. Assert on content.

### #356 and the pattern behind the whole batch (2026-09-12, early morning)
- **`stop` IS NOT SYNCHRONOUS.** Sending `setoption` or `position` straight after it is a UCI
  violation while a search unwinds, and Stockfish answers a violation by trapping
  (RuntimeError: unreachable). readyok is the defined idle point: ask for it and WAIT. Three
  separate sites were doing it, and each independently caused traps:
  both analysis queries; the eval-bar effect, whose cleanup posted `stop` and whose next run posted
  `position` on EVERY ply change (this is the one that fires while stepping a review, which is why
  #354 looked only at the buttons and missed it); and the idle handshake's own timeout, which
  PROCEEDED when the engine had not acknowledged - the violation it exists to prevent, on a delay.
  A handshake timeout must ABANDON. A skipped evaluation is invisible; the next ply asks again.
- `sfAnaCbRef` is a SINGLE callback slot, so only one query may own the analysis worker. Nothing
  enforced that; a new query now retires the old one first.
- Still open and honest about it: one unattributed trap survives in why354's full sequence (44-ply
  walk, playout, second walk), deterministic there, not reproducible in isolation, no functional
  assertion affected. Allowed in the gate BY EXACT TEXT. `trap356.js` and `engcrash.js` are the
  tools; re-run both before changing that allowance.
- **THE PATTERN THAT MATTERS MOST FOR NEXT TIME.** Kunal collects feedback in another chat across
  many deploys and pastes it in as one batch, so a large share of any batch describes a build that
  NO LONGER EXISTS. From this one: back/forward in a live game, the merged summary card and the
  notation section were already built; the Discover reshuffle, the "You are Black" label, the
  captured-pieces backgrounds and castling-by-drag do not match what the app renders at all; and the
  "minute time controls regression" was never a regression. That is roughly a third of the list.
  DRIVE THE APP AND SCREENSHOT THE SCREEN BEFORE WRITING ANY CODE. `shots351.js` and `shotdisc.js`
  are the pattern: click through to the screen, screenshot it, and dump the measured geometry.
  Reading the source is not enough - two of these look correct in the source and wrong on screen,
  and three look wrong in the description and correct on screen.
- When an item does not match, do NOT quietly fix the nearest thing. Say what the build actually
  renders, put it on the decisions page under "these don't match what's live", and ask for one
  screenshot. He asked for requests to go there rather than be buried in a reply.

### #357 the brilliancy explanation, fourth attempt and the first useful one
- **A SACRIFICE IS EXPLAINED BY WHAT IT BUYS, AND NOTHING ELSE.** Three passes described how much
  material went and what the evaluation was afterwards, which together restate the DEFINITION of a
  brilliancy without explaining one. "You give up the queen, and Nxb8 Rd8# is mate" is the whole
  job. If this ever regresses, the test is whether the sentence names the follow-up moves.
- `contLine` costs nothing: the review has already evaluated every position, so the best move at
  every later ply is known. Walk forward while the game STAYED on the engine's line (a ply with no
  recorded `bestSan` is one where the played move was the best move) and stop at the first
  deviation, naming the better move there. Everything in the output is a move that was played or
  the engine's own first choice, so it can never be a guess, and no extra engine call is made.
- **ONLY SHOW A CONTINUATION WHEN IT IS FORCING** (every move a capture, check or mate), or on a
  sacrifice when they simply take. Shown unconditionally it made 1.e4 read "Then e5 Nf3 d6 d4
  follows", which is the next four plies dressed up as an insight.
- Never write what the badge already says. "The engine's first choice" sat next to a chip reading
  "Best" on every single one. And a forced mate ends the sentence: announcing mate and then adding
  "the position stays roughly level" is absurd, so `standing` is empty when the line mates.
- **THE PROCESS LESSON, which is the expensive one.** Three builds went into this complaint before
  anyone read the actual sentence on an actual brilliancy. Doing that took ten minutes and the cause
  was immediately obvious. WHEN THE SAME FEEDBACK RETURNS A THIRD TIME, STOP IMPROVING AND GO AND
  LOOK AT THE EXACT OUTPUT on a real example. The harness for it is `bril357gate.js`, which drives
  three famous sacrifices (Morphy's Opera Game, Legal's Mate, the Evans Gambit) through the real
  composer and asserts on CONTENT rather than code paths, and rebuilds its pure slice from the live
  source each run so it cannot test a stale copy.

### #358 auto-playing the finish, and the SAN bug it uncovered
- **"PLAY ON AFTER ANY SOLVE" IS THE WRONG BUILD.** Most tactics already carry their payoff in the
  solution itself: the royal-fork puzzle Kunal named as his example has the moves Ne2+ then Nxc3,
  which IS "the king moves out of check, then take the queen". Playing further appends a random
  engine continuation to a finished tactic. 243 of 876 puzzles end in mate with nothing left to
  show. The finish auto-plays only when it is a FORCED MATE: never noise, and the case he actually
  named (the Fishing Pole queen). 43 fire, 590 are left alone.
- `finishLine` is pure and module-level SO THAT IT CAN BE TESTED. Two attempts at driving a puzzle
  solve through the DOM failed on highlight detection and taught nothing; moving the function to
  module scope took five minutes and let the rule run against all 876 puzzles in a second. Same
  lesson as `explainAnno` and `moveGist`: if a rule matters, make it pure and test it on the
  library, not through a browser.
- **toSAN RENDERED CHECKMATE AS '+', ALWAYS.** Wrong notation on its own, and it silently broke
  #357 within the hour: `bestSan` comes from toSAN, so a mate found through the ENGINE read as an
  ordinary check and "Nxb8 Rd8# is mate" degraded to "Nxb8 Rd8+ follows" on exactly the lines that
  most needed the word. Fixed. The probe uses the parent game's castling and ep rights, which can
  only ADD an escape, so it can under-report mate but never invent one. `cleanSAN` strips both
  symbols, so nothing that matches moves was affected.
- The general lesson from tonight, stated once: a feature shipped an hour ago can be broken by a
  bug that predates it. When a new feature depends on the SHAPE of an existing output (here, that
  a mate carries a '#'), verify that shape rather than assuming it.

### #373 (2026-09-12 evening, the first run from a Claude Code session with push access)
- **THE GATES LIVE IN THE REPO NOW: `gates/`.** The whole previous suite (build.sh, gates.sh, 138 assertions of
  harnesses) existed only in the Cowork sandbox and is gone with it. `cd gates && npm ci` once, then
  `gates/build.sh '#NNN'` (entry.jsx + esbuild, stamp via __BUILD__, refuses a bundle without createRoot) and
  `gates/gates.sh '#NNN'` (mountcheck first, then every gates/regress/*.js, logs in gates/logs, PASS count in
  the footer, GATES GREEN / RED). `gates/lib.js` is the one harness library; read its header. Old harnesses are
  ported into gates/regress as each screen gets its charter pass (REGRESSION-LOG.md lists what is still unported).
- **TRIAL BUNDLES NEVER TOUCH app.js:** `CT_OUT=/path gates/build.sh '#NNN'` writes the bundle elsewhere and
  `CT_APP=/path node gates/...` or `CT_APP=/path gates/gates.sh '#NNN'` serves it. The repo's app.js changes only
  for the final build, so an audit of the live bundle can run while a build is being tried.
- **HARNESS TRAP, COST AN HOUR: DO NOT EMULATE HIS PHONE AS 375x679 *AND* ct_safe='51,31'.** 679 already is the
  usable height; ct_safe makes the app subtract the insets a second time, and the height-bound Review board came
  out 293 instead of 349 in every path (a "finding" that was the harness). Width-bound screens (Play 351, lesson
  375, puzzle 375) hide the error, which is why it survived the vocab pass. lib.js GEOS.kunal is 375x679 with no
  ct_safe; that reproduces every number in this file (review 349@56, Pass & Play 351@78, lesson 375@92).
  Corollary: a "finding" that is confined to one geometry and vanishes at the others is suspect until re-measured.
- **`rect()` KEEPS 80 CHARACTERS OF TEXT; `text()` KEEPS ALL OF IT.** The brilliancy gate "failed" because the
  comparison sentence starts at character 81. Assert on `text()`.
- **"Start review" RESUMES AT THE LAST VIEWED PLY.** After a Skills jump (ply 27) the move screen opens at 27, not
  0. A gate that assumes ply 0 measures the wrong plies; press First move (aria-label) first.
- **THE SUMMARY LISTS EIGHT VERDICTS, NOT TEN:** Excellent is folded into Best in analyzeGameCounts and Book is a
  Skills row. The story (US-R03) says so now; do not "fix" the summary to show Excellent.
- **GALLERY CARDS CAN CARRY `steps`:** `{at, id, l, fn}` re-captions the strip mid-journey and moves the app on.
  fn runs in the closure of the render that opened the gallery, so it may call state setters (setPly,
  setReviewView) but NOT render-scoped helpers that read state (`_goAnalyze` reads `review` and `ply`; click the
  DOM button instead, `_dom('[data-ct="rev-fab"]')`). The Review journey card (card 6) is the first user.
- **THE CHARTER PASS FOR REVIEW:** claude/stories/USER-STORIES.md (US-R01..R11), claude/stories/TEST-CASES.md
  (TC-R01..R14), gates/regress/20-review.js + 21-review-brilliant.js (the executed cases), 14-uat-review-card.js
  (the UAT card, checkpoint by checkpoint), claude/agents/UAT-PACK.md, claude/agents/REGRESSION-LOG.md.
- **THE AUDIT IS A WORKFLOW NOW:** six screen agents (each writes gates/drive/<screen>.js and gates/audit/<screen>.js
  and returns measured findings), two adversarial verifiers per P0/P1 in a configuration the finder did not use.
  Reports: claude/agents/AUDIT-373.md. The drive modules are reusable by every later gate.

## 6) Files in this handoff
This MD is self-sufficient; everything else refetches from the repo (section 1.2). The repo's own HANDOFF.md is June-era; this file supersedes it until committed.
