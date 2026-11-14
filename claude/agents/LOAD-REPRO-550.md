# Load reproduction, #550: a 10% CPU quota separates the trees

For `jobs/review-accuracy-and-grade-counts-depend-on-machine-load-2026-10-04`. Written by #550 test-system helper B on
2026-11-14. Rows 1 to 13 were measured before the pause under run-answers `hold-the-load-reproduction-and-cite-r19`.
Rows 14 to 16 were measured after the lead's restart (3:18am ET), ALONE: the LOADREPRO.lock was held, the other slots ran
no browser, and the 5-minute load was at or under 2 at the start. Nothing is running now, and the cgroup
(`/sys/fs/cgroup/cpu/hbprobe`) and the lock have been removed.

## Result: at a 10% CPU quota the old tree gives three different reviews in three runs, and the tip gives one

| tree | runs at 10% | accuracy W / B | positions of 34 differing from its own unloaded reference | grade counts |
|---|---|---|---|---|
| **w0** `e04e657dfc3c` (51f47e7, before the fixes) | 3 (rows 10, 11, 16) | 96.9/85.9, 96.8/84.0, 96.2/83.2 (unloaded 97.6/88.9) | **18, 19, 20** | different in all three, and different from each other |
| **tip** `926f7a68948b` (a trial of a88ba8c) | 2 (rows 14, 15) | 87.6/78.9 both (unloaded 87.6/78.9) | **0, 0** | identical to unloaded; row 15's engine record reads `retried 3`, the fix re-searching instead of grading partials |

## The runs

**The probe.** `load-repro-550/lprobe.js` reviews the Opera Game once at kunal761, with ct_pool 3 and the eval cache
cleared, and prints one `LPROBE {...}` line containing:
- the accuracy pair;
- the ten grade counts, each as White/Black;
- the 34 cached engine outputs (evW);
- `__ctReview.engine` (the tip records it, the old tree does not).

**When Analyze is tapped:**
- *early*: as soon as Review is up after open;
- *late*: after a 10 s settle.

**The trees:**
- **w0** `e04e657dfc3c`: the tree before the load fixes (51f47e7), copied from scratchpad helperB/.
- **tip5** `78aa4aeb9c04`: a trial of e599269.

Every row below is one run, on this 4-core container. *Max evW* is the largest change in one position's evW from w0's
reference row (row 1). The full JSON is in `load-repro-550/ltrials.log`.

| # | tree | load applied | tap | time | accuracy W / B | grade counts (W/B, in L.GRADES order) | evW differing from reference |
|---|---|---|---|---|---|---|---|
| 1 | w0 | none: pinned to one core (`taskset -c 3`) | late | 20 s | 97.6 / 88.9 | 1/0 6/0 5/7 1/3 1/1 3/2 0/2 0/0 0/0 0/1 | reference |
| 2 | w0 | none, pinned | early (2 s after open) | 21 s | 97.6 / 88.9 | same | 0 of 34 |
| 3 | w0 | 6 busy loops pinned to the same core | early | 43 s | 97.6 / 88.9 | same | 0 |
| 4 | w0 | 6 busy loops, same core | late | 47 s | 97.6 / 88.9 | same | 0 |
| 5 | w0 | 4 loops, probe at nice 10 | early | 45 s | 97.6 / 88.9 | same | 0 |
| 6 | w0 | 4 loops, nice 15 | early | 45 s | 97.6 / 88.9 | same | 0 |
| 7 | w0 | 4 loops, nice 15 | late | 43 s | 97.6 / 88.9 | same | 0 |
| 8 | w0 | 4 loops, nice 19 | early | 44 s | 97.6 / 88.9 | same | 0 |
| 9 | w0 | cgroup cpu quota **25%** of one core | early | 85 s | 97.6 / 88.9 | same | 0 |
| 10 | w0 | cgroup cpu quota **10%** of one core | early | 234 s | **96.9 / 85.9** | 1/0 6/0 5/**6** 1/3 1/**2** 3/2 0/2 0/0 0/0 0/1 | **18 of 34** (e.g. ply 21: 496 -> 419) |
| 11 | w0 | cgroup cpu quota **10%** of one core | late | 232 s | **96.8 / 84.0** | 1/0 **7**/0 **4/5** 1/**5** 1/**0** 3/2 0/**3** 0/0 0/0 0/1 | **19 of 34** |
| 12 | tip5 | none, pinned | late | 25 s | 87.6 / 78.9 | 3/0 3/0 6/3 1/6 1/1 3/2 0/2 0/0 0/0 0/1 | (its own reference); engine path pool, retried 0, abandoned 0 |
| 13 | tip5 | 6 busy loops, same core | early | 48 s | 87.6 / 78.9 | same as row 12 | engine path pool, retried 0 |
| - | tip5 | quota 10%, early and late | - | - | NOT MEASURED: stopped by the pause before either finished | - | - |
| 14 | tip6 | quota 10% | early | 276 s | **87.6 / 78.9** | 3/0 3/0 6/3 1/6 1/1 3/2 0/2 0/0 0/0 0/1 (same as row 12) | **0 of 34** against row 12; engine pool, retried 0 |
| - | tip6 | quota 10% | late | - | STOPPED at 08:26:47Z: the stretch watcher saw the 5-minute load reach 4.07. The load came from another slot's gate 22 browser, started before the lock reached it. No verdict, and it is not counted | - | - |
| - | w0 | quota 10% | early | about 45 s | STOPPED, no verdict. This stretch script's own fault: its TERM handler removed the lock but did not exit, so the loop started this run after the lock was gone. Killed by PID at about 08:27:30Z | - | - |
| 15 | tip6 | quota 10% | late | 394 s | **87.6 / 78.9** | same as row 12 | **0 of 34**; engine pool, **retried 3**, abandoned 0 |
| 16 | w0 | quota 10% | early | 242 s | **96.2 / 83.2** | 1/0 6/0 **3/5 3/3** 1/**3** 3/2 0/2 0/0 0/0 0/1 | **20 of 34** |

**What this says:**
- **CDP `Emulation.setCPUThrottlingRate` was not tried as a lever.** Gate 86's header already measured that it throttles
  the page thread and not the engine workers (rate 8 changed neither the time nor a number).
- **Busy loops and nice do not separate the trees on this machine.** They slow the measured browser only about 2x (20 s
  -> 43-47 s). That is not enough to push any search past the old tree's 20 s wall-clock guard. The early tap still finds
  Stockfish ready, so the old sfReadyRef / ensureAna 5 s path, which grades with the built-in engine, was never entered:
  every evW row is Stockfish-scaled, and there is no Blunder from nowhere.
- **A cgroup-v1 CPU quota of 10% of one core does.**
  - The review took about 230 s. The old tree's searches then ran past its 20 s guard (chess.jsx:5346/5409/5472 at
    51f47e7, `setTimeout(...,20000)`) and were graded from partial scores.
  - 18 and 19 of the 34 positions moved. The accuracy pair moved (97.6/88.9 -> 96.9/85.9 and 96.8/84.0), and so did the
    counts.
  - **The two runs disagreed with each other**, which is the job's defect: the same PGN gave three different reviews
    under three loads.
  - This is the job's second measured mechanism, the 20 s wall-clock guard with partial scores. It is not the first
    (built-in engine).
- **The quota lever also fits the load rule.** The other three cores stay free, and throttled tasks add no busy loops, so
  the load average does not rise the way it does with K loops. The 1-minute load read 4.4 to 8.0 when rows 10 and 11
  started.

## What is left

1. **Gate 163's control arm is NOT added in this commit.** The lead's last instruction was to measure and commit. The
   arm itself needs a decision:
   - The lever is a cgroup-v1 `cpu.cfs_quota_us`, which needs root and this container's cgroup layout. That is unlike
     every other gate's lever, and a gate that cannot create the group must say NOT CONCLUSIVE, never green.
   - A 10% run takes 4 to 7 minutes per review, and the run has to be alone (the lock).
   - The proposal: an arm in gate 163 (b87bb6a, still held off the branch) that runs R alone and L under the quota, using
     the same TC-R152c/d comparison. Expected: w0 red, from 3 of 3 measured divergences, and the tip green, 2 of 2.
2. **The rate:** w0 diverged in 3 of 3 runs at 10%, and in 0 of 9 at lighter loads (25% quota, nice, busy loops). The
   tip has 2 of 2 at 10%. Those are small counts: the evidence shows the old tree can diverge here, not how often.
3. **The first mechanism** (the built-in engine taking over when Stockfish is not ready by the tap) did not show in any
   run. Even the early tap at 10% found Stockfish ready, so gate 86's TC-R148 injection remains the only control of that
   path.

## Scripts

They are in `claude/agents/load-repro-550/`, copied from scratchpad hbcf/. Both shell scripts wait for a 1-minute load of
10 or less before starting, and that is now superseded by the 5-minute-under-6 rule.

| script | md5 (12) | what it does |
|---|---|---|
| `lprobe.js` | 804bbc747d4a | `CT_APP=<bundle> LP_TAP=early\|late node lprobe.js` -> one LPROBE line |
| `ltrial.sh` | 11b70fe15ac3 | `<bundle> <tap> <K busy loops> [throttle] [nice]`: the probe and K loops pinned to cpu 3, loops killed by captured PID |
| `ltrialq.sh` | 7e9d2ffb313a | `<bundle> <tap> <quota %>`: the probe inside cgroup `cpu/hbprobe` with `cfs_quota_us = Q*1000` per 100 ms |
| `stretch.sh` | 0352c8c10109 | `<bundle:tap:quota>...`: holds LOADREPRO.lock and removes it on any exit, waits for a 5-minute load of 2 or less, drains (60 s, then up to 11 min until no other chrome-headless-shell runs), and stops the whole stretch at a 5-minute load over 4. Rows 14 to 16 ran through it |
| `ltrials.log` | - | every LPROBE line above, with the cgroup's throttle counters |

Bundles: tip6 `926f7a68948b` (trial of a88ba8c, stamp `#550 - 2026-11-14 03:19 ET`). tip6 was not reviewed unloaded: rows 14 and 15
are compared with row 12 (tip5), and their 34 engine outputs equal row 12's exactly. w0 `e04e657dfc3c` (51f47e7); tip5 `78aa4aeb9c04` (trial of e599269, stamp `#550 - 2026-11-14 01:40 ET`).
