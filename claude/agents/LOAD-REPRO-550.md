# Load reproduction, #550: WIP, paused on Kunal's load rule

For `jobs/review-accuracy-and-grade-counts-depend-on-machine-load-2026-10-04`. Written by #550 test-system helper B on
2026-11-14. **Paused partway** under run-answers `hold-the-load-reproduction-and-cite-r19`: a job that loads the machine
on purpose does not start while the 5-minute load is over 6. Nothing is running now. The cgroup this work used
(`/sys/fs/cgroup/cpu/hbprobe`) has been removed.

## Result so far: the OLD tree diverges, and the tip has not been measured under that condition

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
| - | tip5 | quota 10%, early and late | - | - | **NOT MEASURED**: stopped by the pause before either finished | - | - |

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

## What is left when the pause lifts (on the lead's word)

1. Run tip5 at quota 10%, early and late; the start command is `bash load-repro-550/ltrialq.sh tip5 early 10`. It needs the
   cgroup, which ltrialq.sh recreates with `mkdir -p`.
   - Expected, if the fixes hold: 87.6/78.9 with the same counts and evW, or the refusal panel ("The review stopped before
     it finished.").
   - If so, quota 10% is the separating load.
2. Then add it to gate 163 (b87bb6a, held off the branch) as its control arm. The arm reviews under the cgroup quota
   instead of, or as well as, CT_163_LOAD browsers. It then records w0 red, past TC-R152c, and the tip green.
3. Run w0 at quota 10% two or three more times, to say how often it diverges. One run each of early and late is evidence
   that it can, not a rate.

## Scripts

They are in `claude/agents/load-repro-550/`, copied from scratchpad hbcf/. Both shell scripts wait for a 1-minute load of
10 or less before starting, and that is now superseded by the 5-minute-under-6 rule.

| script | md5 (12) | what it does |
|---|---|---|
| `lprobe.js` | 804bbc747d4a | `CT_APP=<bundle> LP_TAP=early\|late node lprobe.js` -> one LPROBE line |
| `ltrial.sh` | 11b70fe15ac3 | `<bundle> <tap> <K busy loops> [throttle] [nice]`: the probe and K loops pinned to cpu 3, loops killed by captured PID |
| `ltrialq.sh` | 7e9d2ffb313a | `<bundle> <tap> <quota %>`: the probe inside cgroup `cpu/hbprobe` with `cfs_quota_us = Q*1000` per 100 ms |
| `ltrials.log` | - | every LPROBE line above, with the cgroup's throttle counters |

Bundles: w0 `e04e657dfc3c` (51f47e7); tip5 `78aa4aeb9c04` (trial of e599269, stamp `#550 - 2026-11-14 01:40 ET`).
