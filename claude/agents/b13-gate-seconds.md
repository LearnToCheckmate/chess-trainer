# Gate seconds, and the slowest gates (batch 13)

Job: `jobs/the-slowest-gates-are-made-faster-with-every-check-kept-2026-11-18`.

## Where the seconds come from

`claude/agents/gatelogs/551c-all.log`, the newest green full suite, **does not carry any per-gate seconds.** gates.sh
stamps only the time the suite starts (`2026-11-18 14:43:35 UTC`) and nothing per gate, and that run's per-gate logs
(`gates/logs/551c-*.log`, whose mtimes would give the seconds) are no longer in any container. So no gate's seconds can
be read out of that log. `node gates/audit/gate-seconds.js --log claude/agents/gatelogs/551c-all.log` prints the
145-gate roster and PASS counts, gives every gate's seconds as `n/a`, and exits 2. It does not estimate.

The seconds below were **measured here**, one gate at a time with `gates/audit/time-gates.sh`. It runs each gate the way
gates.sh does: `CT_OBSERVE_EXIT=1 timeout 900 node -r gates/lib.js gates/regress/<gate>.js`, never two at once, and
only once the 5-minute load reads 4 or under. Every row gives the 5-minute load at the moment that gate started.
Other seats were running browsers at the same time, so these are busy-machine seconds, not quiet ones.
Bundle: a trial build of 8c6b7bba, md5 `ea5ad8645463`.

To re-derive a table from rows like these: `node gates/audit/gate-seconds.js --tsv <rows> --md`. On the lead's next
full suite, run `node gates/audit/gate-seconds.js --log gates/logs/<stem>-all.log --dir gates/logs --md` before
anything touches gates/logs. That gives every gate's seconds from its per-gate log mtime.

## Measured (before any change, 8c6b7bba)

| gate | seconds | PASS | FAIL | exit | 5-min load at start | where the time goes (read from the gate) |
|---|---|---|---|---|---|---|
| 22-engline-recovery | 709.5 | 113 | 0 | 0 | 2.64 | 10 launches; about a dozen fresh analyses of the Opera Game and two bench games at ct_pool 3; deliberate engine-race waits (settle 12000 x4, 7000, 6000, 5000 x3); five concurrent browsers in the handshake block |
| 61-review-list-month-independence | 577.6 | 288 | 2 | 1 | 2.93 | 28 launch sites, about 35 browsers; no engine; fixed settles of 1800/1200/700 ms around stubbed chess.com fetches, then polls until the rows settle |
| 16-cpu-result-line | 556.3 | 214 | 0 | 0 | 3.38 | about 40 launches; Play games driven to an end; settles of 4200-5600 ms that wait past the app's own 2600/3300 ms result-card fade, which is the thing it measures |

**Gate 61 is RED on 8c6b7bba, and not because of anything in this job:** `A33d TC-R154` and `A33e TC-R155` fail (the daily-game
rows). It fails the same way before and after every change here, and the lead should know about it.

**The slowest ten are not named here.** Each of these three gates took 9 to 12 minutes, and the shared load paused this seat
twice, so ten gates measured before and after would have cost three to four hours of single-browser time this seat did not
have. The seconds of all 145 gates come for free from the lead's next full suite: `gate-seconds.js --dir` reads the per-gate
log mtimes (see the commands above). 20, 26, 48, 177, 178, 181 and the coach gates are another seat's work and were not timed.

## Changed, before and after (the same bundle `ea5ad8645463`, the same method, one browser gate at a time)

| gate | change | before s (load) | after s (load) | PASS before -> after | assertion texts (gates/audit/assert-diff.js) |
|---|---|---|---|---|---|
| 22-engline-recovery | shared analysis in TC-R105 and TC-R116 only: 6 Opera analyses become 2, 4 launches seeded | 709.5 (2.64) | **634.1 (2.65)**, -75.4 s, -10.6% | 113 -> 113 | SAME ASSERTIONS: 102 distinct texts each, 0 differing |

The after-log of gate 22 says which launches took which path: two `analysed from nothing (engine path pool) and kept`, then
four `seeded ... -> engine path cache`.

## Tried and NOT adopted: one Chromium per gate (a new context for each launch)

An opt-in `L.shareBrowser()` was built and measured on the two launch-heavy gates. It saved about 2%, which is close to the
noise in these runs: gate 61 went from 577.6 to 564.8 s (288 -> 288 PASS, SAME ASSERTIONS) and gate 16 from 556.3 to 545.7 s
(214 -> 214 PASS, SAME ASSERTIONS). Starting a browser is cheap here, so the launches are not where these gates spend their time.
The change would have touched the environment every gate runs in, for a gain smaller than the noise, so it was taken out
of lib.js and is not in this commit.

## What was deliberately not changed, and why

- Gate 22's race, handshake, sac-worker-death and coach-sentence blocks keep their fresh analyses. In those blocks the review's
  own workers, and the load they put on the machine, are part of the case, so seeding them would make the gate blinder.
- Gate 16's long settles wait past the app's own 2600/3300 ms fade timers, and they are what the gate measures ("~6.8s after
  the resignation the card has gone"). If they were replaced with a wait for the card to go, the assertion would have nothing left to test.
- Gate 61's 1800 ms settle after opening Review covers the first account's auto-fetch starting AND finishing. The Fetch button
  is already enabled before the fetch starts, so a wait on the button alone would not be the condition the settle waits for.

## The grading machine

The first pairs run (stopped after 2 of its 3 tries, for the shared load) showed the real code passing, with 113 PASS and the
seeded launches on the app's cache path. It also found the first break BLIND. With the engine-row reservation turned off,
the board does not move at this tree, so that break was not a defect gate 22 can see, and it was replaced with a Review board
that loses 8px of width while the engine line is on. The job's line from the full run is in the build's reply.

The replacement break was checked red on gate 22 before it went into the pairs file: bundle `c3f2ea602039` (09ecebf7 plus the
break), 626.2 s at a load of 1.63, 105 PASS and 8 FAIL. All 8 are TC-R116: switching the line on and off moves the board in the
fresh se launch and in the seeded short375, w375h667 and kunal761 launches, so a seeded launch sees the defect as well as a
fresh one does. The four commits of this job were rebased onto 09ecebf7. The only conflicts were the appended rows in
USER-STORIES.md and TEST-CASES.md, and both sides were kept.

Full pairs run on c450b660 (2026-11-20T18:42Z): `CHECKED the-slowest-gates-are-made-faster-with-every-check-kept-2026-11-18
(gates/regress/22-engline-recovery.js)`. The real code PASSED in all 6 situations (bundle 2c788b67aa4b, 629 s). Break
board-shrinks-with-the-engine-line was CAUGHT in all 4 TC-R116 situations (2 FAIL each, 642 s), and break
engine-reading-does-not-close was CAUGHT in both TC-R105 situations (1 FAIL each, 637 s).
