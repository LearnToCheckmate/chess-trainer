# Chess Trainer - HANDOFF (boot document for any new session, chat or Cowork)
**Written 2026-09-06. Live repo HEAD = build #329 (`#329 · 2026-09-08 01:03 EDT`).**
Give this file to Claude in Cowork as the first thing in the session.

## 0) THE PEN RULE (read first)
Only ONE environment may commit to LearnToCheckmate/chess-trainer at a time. Two writers once caused a GitHub account suspension. When Cowork starts building, say "Cowork has the pen" in the old chat so it stands down, and vice versa. Never let both deploy in the same sitting.

## 1) Boot sequence for a new session
1. Ask Kunal to paste the GitHub fine-grained PAT (never write it to any file; env-inline only). Current token: chess-trainer-deploy, expires Dec 5 2026, Contents read-write on the one repo. The old no-expiration token was deleted 2026-09-06. Also pick his Chrome (switch_browser) if live verification is planned.
2. Refetch from the repo at session start (source of truth): `chess.jsx`, `lessons.js`, `chess-trainer-backlog.md`, `gen_tracker.py`, `deploy.py`, `audit.py`, `sweep.py`, `chess-tracker.template.html` from `https://raw.githubusercontent.com/LearnToCheckmate/chess-trainer/main/FILE`. For verifying deploys, fetch by COMMIT HASH (the main path caches ~5 min).
3. Read the backlog fully; ACTIVE QUEUE is at the top; reconcile it at the end of every run.
4. READ KUNAL'S FEEDBACK FROM THE TWO ARTIFACTS before choosing work (Artifact tool, action read_db, db_op list):
   - Roadmap: url https://claude.ai/code/artifact/b0acbc6c-af09-4af3-8c0e-a31e84ae63ec, collection "feedback" (doc id = roadmap item id; fields text, pick, at). pick=true means "Build next"; text is his per-item feedback. Treat as his instructions for the queue.
   - Space audit: url https://claude.ai/code/artifact/ca66f603-c14a-4163-85f7-7660e6ce6a02, collection "decisions" (doc id P1..L2; status approve/skip/discuss or A/B/C for L2).
   Acknowledge what was read in the pre-flight block ("Feedback swept: N roadmap notes, M audit verdicts"). Republish the roadmap artifact (same URL, capabilities db) whenever gen_tracker.py changes so the item list stays current; item ids are t<index>-<slug>, keep them stable by appending new items at the end of T.
5. Kunal's standing authorization is unlimited: every message buys the longest safe run.

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
- No em-dashes in replies or UI labels. No emojis unless he uses them. US spelling. Answer-first. Vertical status blocks. Build stamp at the bottom only when a deploy happened.
- Voice-to-text decoding: "PNG"=PGN, "bills"=builds, "gosling"=castling, "Fortnite's game"=Four Knights, "Maltese"=make sure. Repeated identical messages = one message.
- Design-taste decisions: annotate his actual screenshots (color-coded keep/change/demote) + a decision table + tap-to-approve buttons. He explicitly likes approving in place. The chess.com-style redesign is PERMANENTLY closed; current simplification work is subtraction only, identity untouched.
- Trap/gambit lessons must frame unsound moves honestly (sweep.py flags; named traps flag by design). Videos: only embed Hanging Pawns IDs confirmed via search with attribution; never from memory; note confidence.

## 5) State at handoff (build #329, Cowork session 2026-09-06 evening)
- #321 shipped from Cowork: the last UX straggler. Prev / All-openings / Next row gone inside lessons (watch + practice); previous/next lesson now named buttons at the top of the 3-dot sheet. Gallery card "Lesson nav row gone (NEW)".
- COWORK DEPLOY PATH (differs from deploy.py): the Cowork sandbox blocks api.github.com AND learntocheckmate.github.io. Deploy = same gates, esbuild bundle, then `git commit` + `git push` over github.com with the PAT as an HTTP Basic header: `git -c credential.helper= -c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$T" | base64 -w0)" push https://github.com/LearnToCheckmate/chess-trainer.git HEAD:main` with GIT_CONFIG_GLOBAL=/dev/null (the sandbox git proxy refuses a token on the URL; the header form works). Verify by fetching raw.githubusercontent.com at the COMMIT HASH (works); Pages liveness must be confirmed by Kunal's phone (host blocked). Driver files live in the build dir: mountcheck.js (gate 3 + drive runner), deploy_git.py.
- #324-#326 (same evening, acting on Kunal's roadmap feedback "build everything that does not need me, one by one, without stopping"): #324 21 Hanging Pawns videos sourced by driving his Chrome to youtube.com/@HangingPawns/search (channel-scoped, IDs read from ytInitialPlayerResponse on each watch page; sandbox YouTube fetches are 429-blocked, Chrome is the way); #325 WebRTC video call in online play (signaling through the game doc via gamePush, STUN only, needs his two-device test; TURN is his infra item); #326 ring-bar wrap in the rail. Domain: gambitcoach.com is TAKEN; candidates checked live at Cloudflare are in the backlog #324 entry; the purchase click is Kunal's (blocked for Claude by design). After purchase: DNS CNAME @ and www -> learntocheckmate.github.io (proxy off), commit a CNAME file, Firebase authorized domains (his console), Enforce HTTPS (his GitHub Pages settings).
- #327 (Kunal said "keep going" and went to bed): space audit batch 1, the four pure subtractions P1/P3/M1/L1, verified live in his Chrome. The audit page now shows those four as Built; the other eight (P2 P5 D1 D2 D3 M2 M3 L2) still need his taps, they are taste calls and were deliberately NOT built unattended.
- #328 (2026-09-08): opening videos batch 2, 11 more channel-confirmed Hanging Pawns walkthroughs, 82 of 170 lessons now have one. Terms that came back empty are listed in the backlog so nobody re-searches them; note that HP channel search is keyword-flaky (Winawer returned nothing under its own name and surfaced under another term), so an empty result means "not found by that term", never "does not exist".
- #329 (2026-09-08): FIXED the long-standing join-by-CODE bug. The invite-link path always stripped non-alphanumerics; the typed path did not, so one stray keyboard character 404'd as "no game found". Typed codes are now sanitized the same way, the box carries the iOS keyboard attributes, and a failed join names the exact code tried. Root cause is strong but was NOT reproduced on Kunal's device; if a clean code still fails, suspect Firestore rules on the games collection next.
- Remaining autonomous items: NONE that do not need Kunal. Deliberately NOT shipped unattended: the iOS PWA sign-in fix (popup to redirect fallback) - it touches the auth path for every user and cannot be verified without his iPhone, and after the #315 outage an unverifiable auth change is not worth the risk. Queued for a session where he can test. iOS PWA sign-in persistence needs an iPhone; Tournaments Stage 3+ needs his Firestore rules; the space audit needs his taps. Next session: read both artifact dbs first, then build what is approved.
- #323: sw.js fetches the fresh set with cache:no-cache (Pages max-age=600 was hiding new builds for up to 10 min; that was the force-close ritual). #322: gallery flush. Two cards verified LIVE by Claude driving Kunal's Chrome (see next bullet) and removed. Gallery: 2 live cards, both one-screen-fit questions that need his phone: "New Game on one screen", "Focus mode stage C".
- NEW VERIFICATION PATH (Kunal's standing approval, 2026-09-06): Claude in Chrome is connected to his "Personal Chrome" (Windows). Claude may open learntocheckmate.github.io there, run gallery cards, read the DOM with javascript_tool, screenshot, and FLUSH cards it confirms. Limits: the window would not resize below desktop width (1278), so phone-fit questions still need Kunal; Pages liveness can be read there (sandbox cannot reach the host). Pick the browser with switch_browser at session start (two Chromes are registered on the account).
- Space audit: proposed (not built) as a tap-to-approve artifact with real Chromium renders of #321: Puzzles header (P1-P5), Discover rows (D1-D4), Menu sheet (M1-M4), lesson focus (L1 title duplicate, L2 the 123 px flex-spacer band above the board, options A/B/C). Build only what Kunal approves; read his taps back from the artifact db (collection "decisions").
- Waiting on Kunal (his dashboard): old GitHub token DELETED 2026-09-06 (done); two-device sync check; Stripe test prices at $2.99/$19.99 + checkout test; buy gambitcoach.com; deploy scanBoard function; publish Firestore rules for tournaments/friends/nearby (this last one unlocks three buildable features).
- Sourcing notes: Caro-Kann Fantasy video 0yMkAJ6Pyig is single-source attribution; Kunal has not yet confirmed playback. Held HP IDs (no matching lessons yet): Two Knights Caro S5OjT1K_s58, Karpov YLEmufSFoGk.

## 6) Files in this handoff
This MD is self-sufficient; everything else refetches from the repo (section 1.2). The repo's own HANDOFF.md is June-era; this file supersedes it until committed.
