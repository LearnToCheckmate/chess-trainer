# Chess Trainer — Build Chat Handoff (refreshed 2026-06-21, app at build #290)

## EVERY-REPLY PRE-FLIGHT (MANDATORY - do FIRST, and PRINT it as the first lines of EVERY reply in this project, not just big build runs)
The PRINTED block is the forcing function: its absence is Kunal's instant signal that the routine was skipped, so he can reset it in one word instead of discovering drift later. Print 3 short lines at the very top of every reply:
1. Feedback: swept the #2 Feedback chat (+ #3 manual-tasks; + all project chats ~daily) - new items folded into the backlog (dated), else "nothing new".
2. Gallery: PROACTIVELY flushed every SC item Kunal now has evidence for (any recording/screenshot/confirmation) AND added any newly-outstanding screen; report what changed + the new count. Lean = 2-3 live items, NEVER pad. Never wait to be asked - a recording/confirmation triggers the flush THAT SAME TURN.
3. Backlog: synced (single source of truth; the gallery + the questions-form are generated FROM it; the form uses ONLY OPEN QUESTIONS, and if empty send no form).


## GALLERY-VERIFY HARD RULE (missed 10+ times - the #1 rule, do not break)
NEVER ask Kunal to manually open / navigate / step through any screen to verify a change. EVERY change he must see ships as an AUTO-RUNNING Preview-gallery scenario (the `SC` array in chess.jsx) that sets itself up and plays itself, so he just hits record once. Building the scenario is PART OF THE BUILD and the definition-of-done, not an afterthought.
- "It can't be shown in the gallery" is almost always FALSE. Tools: `_play(fen,col)` for live board/game states; `selectOpening`/`_lesson` for lessons; for screens that need data, BUILD a synthetic auto-play scenario - e.g. Review: construct a valid review object via `loadSANs` + synthetic `analysis` matching importGame's `_rv` shape ({positions,plies,headers,analysis,counts,openingName,summary,pgn}) and trigger `setRevAuto(true)`.
- Only ask Kunal separately if Claude must first go OBTAIN external info (e.g. an opening line from a video).
- VERIFY the scenario renders before shipping by DRIVING it in jsdom: mount app -> click the clapper button (textContent includes the clapper emoji) -> click the new card by its label -> assert the screen renders with zero console/runtime errors. Shim `window.HTMLElement.prototype.scrollTo` + `scrollIntoView` + `Element.prototype.scrollTo` (jsdom lacks them; that error is NOT an app bug). Run the driver from the build dir so `jsdom` resolves.
- A "please check / step through X" ask that is NOT a gallery scenario means Claude drifted.

## Boot sequence for the new build chat
1. SECRET FIRST: the GitHub fine-grained PAT is NOT in this repo and must never be written to any file. Retrieve it by searching the original build chat for "github_pat" (conversation_search). Use it inline in env only.
2. Refetch chess.jsx, gen_tracker.py, chess-trainer-backlog.md (and index.html when touching the host) from this repo via the contents API with Accept: application/vnd.github.raw at the START of every session (disk reverts between turns).
3. Read chess-trainer-backlog.md fully: it is the single source of truth. The ACTIVE QUEUE is the section at the TOP of that file. RECONCILE the queue at the END of every run: move shipped items to Recently-shipped, delete stale ones, keep only genuinely-open items each tagged CLAUDE or KUNAL. PREVIEW GALLERY POLICY (updated 2026-06-20, SUPERSEDES the ~10/cap-25 rule): the in-app film-clapper tool is the `SC` array in chess.jsx. Keep it LEAN - ONLY scenarios tied to a live decision or a recent change Kunal has NOT yet verified; 2-3 items is correct, NEVER pad to a target. Flush each item the moment Kunal sends evidence (recording/screenshot/confirmation) for it - that same turn, proactively, without being asked - and add anything newly outstanding. Gallery scenarios auto-dismiss the intro/flash card (the `_lesson` helper calls setIntroCard(false) shortly after opening) so the board shows without a manual tap. Standing authorization is unlimited (BUILDGO retired); every Kunal message buys the longest safe run.
4. Conventions: timing line at top and bottom of every reply (sandbox clock; note it can read UTC across turns — the build STAMP via TZ=America/New_York is the correct EDT). Build stamp line at the very bottom. Post-run STATUS as a VERTICAL stack of lines (Run/number, Ended time, Active build time, Fuel: unlimited) NOT a wide table (it runs off-screen on phone). End each build-run reply with a short 'What I need from you' section of a few easy things Kunal can provide now. Manual-task handoffs: give paste-ready steps FIRST at the very top, then run the build. No em-dashes in replies or app labels. Lead with the answer, minimal formatting. High autonomy: batch work, make judgment calls and flag for veto, defer design-taste/device/backend calls to Kunal.

## Deploy recipe (battle-tested, unchanged)
- Edit via python with assert-unique anchors; ENCODE BEFORE WRITE: buf=s.encode('utf-8'); open(path,'wb').write(buf).
- GOTCHA: JSX text/attributes CANNOT contain literal \u{...} or \uXXXX escapes — write ACTUAL unicode chars in the python source (file is utf-8). Always compile-check; trust COMPILE_CLEAN over any over-broad leaked-escape grep.
- GOTCHA: the minifier strips leading zeros (0.66 -> .66); don't grep the bundle for '0.NN', grep '.NN' or the stamp.
- Compile check UNPIPED: esbuild chess.jsx --bundle --external:react --external:react-dom --outfile=/dev/null 2>/tmp/esw ; fail on WARNING|ERROR.
- Bundle: wrapper prepends createRoot import; sed strips "export default "; append render; flags --format=iife --jsx=automatic --minify --define:process.env.NODE_ENV='"production"' --define:__BUILD__="#N · DATE EDT".
- Gates (set -e): node --check; size > 700000; grep literal feature strings that survive minification; grep the stamp.
- Deploy: ONE commit per build via Git Data API (blobs -> tree -> commit -> patch ref) carrying app.js + chess.jsx + chess-trainer-backlog.md + gen_tracker.py. Retry once on 403 (sleep 20). Verify by refetching repo app.js byte size; sandbox CANNOT see the live CDN.
- After build runs: regenerate the tracker (edit STAMP + entries in gen_tracker.py, run it, present chess-tracker.html).

## State at handoff (build #173)
- Design overhaul A-E: COMPLETE and screenshot-confirmed (board, lessons, celebrations, Puzzles roadmap already had the Phase E art, Coach plan, checkmate modal, Review, Play, account/Pro).
- Tournaments: Stage 1 (host CTCloud methods in index.html + lobby/create/detail overlay) and Stage 2a (verified pairing engine: round-robin circle method, seeded knockout, Swiss R1 + host "Start" + schedule/bracket display) DONE. NOT done: Stage 2b (wire each pairing to a real online game via existing gameCreate/gameJoin, report results back) and 2c (live standings + advancing rounds).
- First-run "Start here" path: DONE (#172). Lesson screen decluttered (#171) and board enlarged to 66% height cap (#173).
- Paywall card corrected to match real gating (Pro = Coach + themes only; puzzles/review are free) (#167).
- Review suite 8/8 DONE (delivered as HTML in outputs): accessibility, first-session funnel, content QA (130/130 lines engine-verified legal), competitive, performance (measured: 233KB gz; 188 useState/0 useCallback in one component), retention, paywall.

## Queue -> see the ACTIVE QUEUE at the TOP of chess-trainer-backlog.md (reconciled every run). The list below is stale (build #173 era), kept only for reference.

## Stale queue (build #173 reference)
1. perf-memo-board + perf-callback-handlers: React.memo the board grid + player bars, useCallback the square-tap/drag/move handlers. HIGH RISK blind — the board is a SHARED render and the component has 188 useState; wrong deps cause SILENT stale-render bugs. Do with Kunal screenshotting gameplay immediately after each step to verify.
2. lesson-board-bottom-anchor: full "board anchored to bottom, content flows from top, ONE button row at bottom" reorder. The board is shared across play+lesson through ~700 lines (SQ at ~1974; lesson chrome at 3555-3572 and 4248-4264). Real restructure; do carefully with screenshots.
3. Tournaments Stage 2b then 2c (needs the /tournaments Firestore rule live + two accounts).
4. Review follow-up builds: first-run done; remaining candidates retain-streak-nudge, retain-streak-freeze, pay-coach-taste, pay-highintent-upsell, pay-annual-default, coach-hook-day1, reward-teaser.
5. fd-legal (privacy/terms/refund/account-deletion BEFORE Stripe live), fd-errlog. Microcopy + gray/radius polish sweeps.

## Waiting on Kunal (manual steps, none need me)
- Publish /tournaments Firestore rule: inside match /databases/{database}/documents add `match /tournaments/{tid} { allow read: if true; allow create, update: if request.auth != null; }` then Publish. Unblocks all Tournaments testing.
- Publish Friends + Play-nearby Firestore rules. Stripe 4242 TEST checkout (then revisit the $0.99 price vs ~$2.99-3.99 per Review 5/8). Deploy scanBoard Cloud Function with ANTHROPIC_API_KEY. Buy gambitcoach.com (Cloudflare).
- Two-account live tests: Tournaments create/join/start, Friends, Play-nearby.


## Recent state (build #228, 2026-06-20)
- Library is comprehensive (~150 engine-verified lessons across OPENINGS/ENDGAMES/MORE): all major openings, dozens of gambits, the standard checkmate patterns, and endgame theory. Verify gaps before adding (earlier name-extraction under-counted; the majors are already in).
- #226 shipped the Square of the Pawn VISUALIZATION: in any king+pawn endgame a 'Show the square of the pawn' toggle draws a live tinted box (computed from the pawn, shrinks as it advances) + a catches/promotes verdict, using the per-cell overlay pattern (no change to the shared board render).
- #224 shipped Prev/Next lesson navigation (the [‹ Prev][All ...][Next ›] row in the learn controls; infra was pre-computed at the nav IIFE) and a content-aware HEADER (shows the lesson/gambit/ending name, or Play/Online/Puzzles/Game review, instead of CHESS TRAINER on content screens; wordmark stays on home).

## New-lesson convention (since #224)
- Append to the `MORE` array (LIB=OPENINGS.concat(ENDGAMES).concat(MORE)) via the concat-last pattern so existing LIB indices never shift.
- Validate EVERY line legal with python-chess (board.push_san); for endgame/mate FENs assert is_valid() AND not in check at start AND is_checkmate() after the line.
- assert notes length == line length; assert no double-quotes in any string.
- Per-move notes do NOT repeat the move (the UI prepends the move label): write 'The Sicilian: fight for d4' NOT '…c5 — the Sicilian'.

## Feedback (shipped #223)
- A floating button + a menu item capture the screen context (build/screen/lesson/phase/step/moves) and copy a paste-ready '[Chess Trainer feedback]' block to the clipboard; Kunal pastes it into chat (the sandbox cannot read Firebase/localStorage; LOG_ENDPOINT is empty).
- Auto-pickup decision is PARKED in the backlog: (A) a tiny Firebase Cloud Function that verifies the Firebase Auth token and appends each submit to a repo file Claude reads each run, vs (B) batch the feedback so Kunal pastes once per session.


## FEEDBACK RELAY (#240) - read at run start
Feedback now flows from the app to **feedback-inbox.md** via a Firebase Function (functions/index.js). AT THE START OF EVERY RUN, read feedback-inbox.md and fold any new items into chess-trainer-backlog.md, then clear them from the inbox in that run's commit. The relay is BUILT but goes LIVE only once Kunal deploys the function and Claude sets LOG_ENDPOINT + RELAY_KEY in chess.jsx (see the backlog 'Feedback auto-pickup' item for the exact remaining steps).

## ENGINE SWEEP - content safeguard (added 2026-06-20)
Stockfish 16 is installed at /usr/games/stockfish. audit.py only proves moves are LEGAL; it does NOT catch a line that is legal but relies on a move no engine plays (the Rousseau bug: a variation mislabeled "Stockfish's best" that only "won" because White played 6.Nxf5). RUN `python3 sweep.py` (in repo) on any NEW or CHANGED lesson before deploy: it evals every position and flags moves that lose >200cp vs best. Named traps/gambits flag BY DESIGN - confirm those are framed as traps ("if White greedily grabs", "??", "objectively losing"), never as "best". A full-library sweep on 2026-06-20 found no silent mislabels beyond the already-fixed Rousseau.

## Lesson videos (gotcha)
- The lesson video box renders ONLY for TOP-LEVEL lessons (objects with eco:/cat:), reading op.video where op=LIB[openIdx]. A `video:` added to a vars:[] VARIATION never displays (variations inherit the parent's video via pickVariation). When batching videos, target TOP-LEVEL video-less lessons only (name:"X", eco:... with no video:). Verify by driving a gallery card that opens the lesson and asserting the video title+author render.

## Brilliant detection v3 (build #300) - how it works + how to tune it
- `seeSq(game,tr,tc,side)`: recursive Static Exchange Evaluation on one square (least-valuable-attacker first, each capture optional, x-ray-aware via getLegal on the updated board). Returns pawns the initiating side wins.
- `brilliantGate(pos,pl,loss,evA,evB)` returns {ok, loss, sac, evAfter, evBefore, cap, isSac}. sac = (value of piece just placed) - (value of what the move captured), but only if SEE>0 (the piece is actually winnable). So an even TRADE = 0, a RETREAT/defended move = 0 (this is what structurally kills the old Bc7 false positive). A clearly-winning sac (sac>=2 AND evAfter>=1.2) gets a relaxed near-best cap of 220cp; otherwise cap is 90.
- isBrilliant() just returns brilliantGate(...).ok (after a cheap loss>=250 reject). Both analysis loops store gate:_g per ply.
- VERIFIED in jsdom on the Harris game: Bxh3 sac=2, Nd5 sac=3, trades (Bxf6/Bxg4/Qxd7+) sac=0, nothing falsely flagged in the weak fallback. The sandbox CANNOT reproduce the phone's Stockfish eval, so the eval side is validated on-device.
- ON-DEVICE READOUT: Review has a "show brilliant-gate numbers" toggle (showGates state) under the move nav; it prints loss/sac/evAfter/evBefore/cap + verdict from curAnno.gate. Use it to read REAL Stockfish numbers per move and tune the 1.2 (winning) and 220 (near-best cap) thresholds. Bxh3 is the reference case.

## Gallery demo cards that must land on a specific move (build #301)
- importGame resets ply to 0 when analysis completes, and Stockfish on a real device takes tens of seconds - so a demo card that steps via a fixed setTimeout will fire before analysis finishes and get wiped. Pattern: set a ref (e.g. gateDemoRef.current=targetPly) BEFORE importGame, and a useEffect on [review] performs the jump (setReviewView/ setPly/ setShowGates) once review is set. Never rely on timers alone for post-analysis navigation.
