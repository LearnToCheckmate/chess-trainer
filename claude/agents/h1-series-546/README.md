# Twenty `unfixed` fastgate-drive runs with every log kept - #546, batch 6 item (17)

Job: `jobs/one-in-ten-unfixed-harness-runs-adds-h1-and-the-cause-is-unpinned-2026-10-16`. Its close condition:
"20 consecutive `unfixed` runs with logs kept and no H1 failure, published with the command, the load and the
denominator". #545 had 16 runs, then two excluded, then 4 more, with the logs left in its scratchpad.

**Result: 20 of 20 runs read `68 ok, 0 FAIL, 1 skipped`, and H1 [TC-SUITE-057] reads `ok` in every log.**
`grep -cE '^ *ok +H1 ' logs/unfixed-*.log` prints 1 for each of the 20 files. The one skip is H1b, because esbuild
cannot be fixtured in this container, and the harness does not count it as ok.

- **Command:** `run.sh` here, run from a clean scratch clone of the repository at `d5260d3` (#546 item (16)), so the
  build run's own commits could not make the harness refuse. Each iteration is `bash gates/fastgate-drive.sh unfixed`,
  with its whole output kept as `logs/unfixed-<i>.log`.
- **Load and denominator:** `table.tsv` gives one row per run, with start and end (UTC, 30 Oct 2026), the 1-minute load
  average at the start, free MB on /tmp, the summary line and H1's verdict. The load ran from 0.05 to 3.33. Through
  most of the series a build run and its browser gates were running on the same container. The denominator is 20 runs.
- **Two interruptions, both container restarts, neither an H1 result, stated so nobody has to infer them:**
  1. The first attempt started at 04:59:10Z and was killed by a container restart after its first run, which was
     `ok`. That run's log and table are kept in `aborted-attempt/`. It is not counted, and the series restarted
     from 1 at 05:30:45Z.
  2. A container restart at about 08:58Z killed run 17 part-way through. That partial log was overwritten when the
     series resumed at 17 (09:00:13Z), so it is not kept. Runs 1 to 16 and 17 to 20 are each consecutive. The gap
     is a killed process, not a run that produced a verdict.
- **What this does NOT show:** the mechanism behind #545's one H1 FAIL (its run 18, inside a disk-full window that
  run caused itself). Twenty clean runs with free space above 29 GB throughout are consistent with that reading, and
  they are not a reproduction of it.
