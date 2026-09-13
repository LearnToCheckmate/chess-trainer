# RUN-LOG — one line per build: ETA stated, started, ready, actual, delta, gates. (Supervisor ruling B, 2026-09-12)
Kunal's rule p1/p2: an ETA before each build and the actual against it after; elapsed at the end of every
response. This file is the persistent record; the chat is not. Times are ET.

| build | what | ETA stated (at) | started | staged for his click | actual | delta | gates | live (his commit) |
|---|---|---|---|---|---|---|---|---|
| #366 | y3b y15b y11b lay-B | 50 min (16:12) | 16:12 | 17:08 | 56 min | +6 | green (mountcheck reg343 pzgate fit bril357 ipad355 veteran360 kunal364c before366 overlay366) | 17:09 (6cd1449) |
| #367 | y12c picker | none given | 17:08 | 17:17 | 9 min | — | green (look367 mountcheck reg343 pzgate bril357 kunal364c) | 17:17 (e65119c) |
| #368 | y17b Skills panel | none given | 17:17 | 17:26 | 9 min | — | green (skills368 summary368 mountcheck) | pending, staged |
| #369 | y1b graph behind a switch | none given | 17:26 | 17:36 | 10 min | — | green (graph369 mountcheck reg343) | pending, staged |
| #370 | k8 board shrink after 1.e4; n3; n9; k9 | none given | 17:36 | 17:55 (rebuilt 17:57, re-staged) | 21 min | — | green (jump370 open370 pzafter370 reg343 pzgate kunal364c bril357 veteran360) | pending, staged |
| #371 | agents' P0s: game over, lesson end, mate sign, forks, ink metric, fab corner, hint banner | none given (agents ran first) | 18:36 | 19:12 | 36 min build + 16 min gates | — | gates.sh GREEN (gates371c.log; two stale test expectations fixed and rerun) | 19:23 (2a74c13) |

Lesson recorded by the supervisor: the ETA was said in chat for #366 only and never for the rest. From #372 on,
the ETA line is written HERE before build.sh runs, and the actual is written here before the upload is staged.
| #372 | antagonist objections on #371 (Y-01 Y-02 Y-03 Y-04 Y-06 Y-09) + the checks as Preview gallery cards (Kunal 19:16 ET), then the charter's card rules (item-id captions, recording-complete frame, 19:39 ET) | 45 min (19:25) | 19:25 | 20:4x | 30 min to the first bundle (19:55); 55 min to the final one (20:20, after the hint-capacity gate caught a clip); +~40 min gates from the top (twice) and the record (DECISIONS-LOG overrules, this line, inbox, HANDOFF, tracker) | +~50 on the whole, −9 on the build itself | gates.sh from the top on the final bundle (gates372c.log); the 19:37 run was void (bundle replaced mid-run, two stale gallery-card drives) | pending, staged (one click carries #372 alone; #371 went live at 19:23) |

Lesson from #372: the ETA covered the build and not the record. Gates from the top are ~15 min on their own,
and the antagonist's objections arrive after the first bundle, so the honest ETA for a build that the agents
attack is build + 15 min gates + 20-30 min of answering objections + a second gate run. From #373 on the ETA
line names those parts separately.
