# Chess Trainer - HANDOFF (boot document for any new session, chat or Cowork)
**Written 2026-09-06. Live repo HEAD = build #320 (`#320 · 2026-09-06 19:16 EDT`).**
Give this file to Claude in Cowork as the first thing in the session.

## 0) THE PEN RULE (read first)
Only ONE environment may commit to LearnToCheckmate/chess-trainer at a time. Two writers once caused a GitHub account suspension. When Cowork starts building, say "Cowork has the pen" in the old chat so it stands down, and vice versa. Never let both deploy in the same sitting.

## 1) Boot sequence for a new session
1. Ask Kunal to paste the GitHub fine-grained PAT (never write it to any file; env-inline only). Current token: chess-trainer-deploy, expires Dec 5 2026, Contents read-write on the one repo. NOTE: the OLD no-expiration "Chess Trainer Deploy" token may still exist on his tokens page; remind him to delete it.
2. Refetch from the repo at session start (source of truth): `chess.jsx`, `lessons.js`, `chess-trainer-backlog.md`, `gen_tracker.py`, `deploy.py`, `audit.py`, `sweep.py`, `chess-tracker.template.html` from `https://raw.githubusercontent.com/LearnToCheckmate/chess-trainer/main/FILE`. For verifying deploys, fetch by COMMIT HASH (the main path caches ~5 min).
3. Read the backlog fully; ACTIVE QUEUE is at the top; reconcile it at the end of every run.
4. Kunal's standing authorization is unlimited: every message buys the longest safe run.

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

## 5) State at handoff (build #320)
- Sep 6 was a big day: shipped #309-#320. Two June builds (Fried Liver video + 7 gambits; sync/Daily 3/Coach's take/toasts/branches/brilliant fixes), the lesson-data split, Caro-Kann Fantasy video, and a full UX simplification arc from Kunal's annotated screenshots: Home regroup (one screen), lesson focus mode stages A-C (tab bar gone in lessons, bottom X/nav/3-dot bar, boxes in sheet, intro card auto-dismiss), New Game one-screen, Review summary with tappable jump-counts, floating buttons Home-only. One 7-minute outage (#315) caused, fixed, and turned into gate #3 above.
- Gallery: 3 live cards awaiting his recordings: "Focus mode stage C", "New Game on one screen", "Tappable review numbers".
- Autonomous queue: (1) last UX straggler: hide/demote the Prev / All-openings / Next row in lessons; (2) app-wide space audit (Puzzles roadmap header, Discover list rows, Menu sheet) - propose with annotations before building taste changes.
- Waiting on Kunal (his dashboard): delete old GitHub token; two-device sync check; Stripe test prices at $2.99/$19.99 + checkout test; buy gambitcoach.com; deploy scanBoard function; publish Firestore rules for tournaments/friends/nearby (this last one unlocks three buildable features).
- Sourcing notes: Caro-Kann Fantasy video 0yMkAJ6Pyig is single-source attribution; Kunal has not yet confirmed playback. Held HP IDs (no matching lessons yet): Two Knights Caro S5OjT1K_s58, Karpov YLEmufSFoGk.

## 6) Files in this handoff
This MD is self-sufficient; everything else refetches from the repo (section 1.2). The repo's own HANDOFF.md is June-era; this file supersedes it until committed.
