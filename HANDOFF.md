# Chess Trainer — Build Chat Handoff (refreshed 2026-06-16, app at build #200)

## Boot sequence for the new build chat
1. SECRET FIRST: the GitHub fine-grained PAT is NOT in this repo and must never be written to any file. Retrieve it by searching the original build chat for "github_pat" (conversation_search). Use it inline in env only.
2. Refetch chess.jsx, gen_tracker.py, chess-trainer-backlog.md (and index.html when touching the host) from this repo via the contents API with Accept: application/vnd.github.raw at the START of every session (disk reverts between turns).
3. Read chess-trainer-backlog.md fully: it is the single source of truth. The ACTIVE QUEUE is the section at the TOP of that file. RECONCILE the queue at the END of every run: move shipped items to Recently-shipped, delete stale ones, keep only genuinely-open items each tagged CLAUDE or KUNAL. WIPE THE PREVIEW GALLERY every run too: the in-app film-clapper tool is the `SC` array in chess.jsx, and it must hold ONLY screens I still need Kunal to record, so empty it (`const SC=[]`) once those screens are confirmed (default state is empty). Standing authorization is unlimited (BUILDGO retired); every Kunal message buys the longest safe run.
4. Conventions: timing line at top and bottom of every reply (sandbox clock; note it can read UTC across turns — the build STAMP via TZ=America/New_York is the correct EDT). Build stamp line at the very bottom. Run table (Fuel | Run | Started | Ended | Duration), Fuel = infinity. No em-dashes in replies or app labels. Lead with the answer, minimal formatting. High autonomy: batch work, make judgment calls and flag for veto, defer design-taste/device/backend calls to Kunal.

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
