# Chess Trainer — Build Chat Handoff (written 2026-06-12, app at build #153)

## Boot sequence for the new build chat
1. SECRET FIRST: the GitHub fine-grained PAT is NOT in this repo and must never be written to any file (public repo + secret scanning). Retrieve it with conversation_search for "github_pat" in the original build chat ("New Chess App"). Use it inline-env per command only.
2. Refetch chess.jsx, gen_tracker.py, chess-trainer-backlog.md from this repo via the contents API with Accept: application/vnd.github.raw (the sandbox disk REVERTS between turns: always refetch at turn start; raw.githubusercontent CDN can serve stale).
3. Read chess-trainer-backlog.md fully: it carries the queue, decisions, BUILDGO protocol (standing authorization: unlimited), parked questions, and per-build history.
4. Conventions: timing line at top and bottom of every reply (sandbox clock); build stamp line at the very bottom; run table (Fuel | Run | Started | Ended | Duration) after runs; sweep feedback chat (uri c4a59ce7-00b1-46ee-8ec7-a062a987ff90) + manual-tasks chat (uri 45a6557f-98bd-4d65-99f6-ca5ef3bf805e) + "BUILDGO" at session start and after each run; regenerate gen_tracker.py and present chess-tracker.html after build runs. No em-dashes anywhere. Plain English, lead with the answer.

## Deploy recipe (battle-tested)
- Edit via python with assert-unique anchors; ENCODE BEFORE WRITE: buf=s.encode('utf-8'); open(path,'wb').write(buf). A mid-write encode failure once truncated the source to 0 bytes and shipped a broken bundle.
- Compile check UNPIPED: esbuild chess.jsx --bundle --external:react --external:react-dom --outfile=/dev/null (capture stderr; fail on WARNING/ERROR).
- Bundle: wrapper adds createRoot import + render line; sed strips "export default "; esbuild --format=iife --jsx=automatic --minify --define:process.env.NODE_ENV='"production"' --define:__BUILD__="#N · YYYY-MM-DD HH:MM EDT".
- Gates before deploy (set -e): node --check; bundle > 700000 bytes; grep ASCII feature strings (unicode gets escaped by esbuild); grep the new stamp.
- Deploy: ONE commit per build via Git Data API (blobs -> tree -> commit -> patch ref) carrying app.js + chess.jsx + chess-trainer-backlog.md + gen_tracker.py. Retry once on transient 403 (20s).
- Verify by refetching repo app.js byte size; the sandbox CANNOT see the live CDN (403 to sandbox is cosmetic; Kunal's phone is fine).
- Gentle cadence: batch coherent work; the account was once suspended for rapid scripted commits.

## Queue (in order)
Phase C remainder: player bars hugging the board. Phase D: lesson action bar + variation chips. Phase E: puzzles art pass. Gray/radius inspected sweep + a11y focus ring + faint-text rule. Reviews 3-8 (funnel, content QA, competitive, performance, retention, paywall). Tournaments stage 1 then 2. Five roadmap items: rv-gaps, pl-sound, hm-today, in-sw, dc-coachvoice. Then fd-legal, fd-errlog.

## Waiting on Kunal
Play + lesson screenshots (steers Phases C/D), the 2026-06-12 feedback-chat paste (screenshots, unreadable via search), sign-in failure details (Safari vs installed app), palm-rejection feel test.
