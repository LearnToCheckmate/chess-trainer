# The comparison rule for the split suite, written before any run

Job: `jobs/the-full-suite-is-split-across-two-or-three-test-machines-and-the-joined-log-is-proved-2026-11-18`,
whatWouldCloseIt (1) and (2). Written by builder seat B3 of batch 13 on 20 Nov 2026, **before any of the three runs
exists**, so the rule cannot be fitted to the result. The lead copies this file onto the job before the suite window.
The script that applies it is `node gates/suite-compare.js --split <serial A> <serial B> <split joined>` (added with
this rule; its controls are `node gates/suite-compare.js --selftest`, cases S15 onward). The verdict is the script's,
never a reading of the logs by eye.

## The three runs

All three on ONE tree and ONE bundle: the same HEAD sha, the same `app.js` md5 (each log's header carries it; the
script refuses with exit 2 if the three differ), the same build number, the same toolchain line.

- **Serial A** and **serial B**: two ordinary full suites, one after the other, on one machine, nothing else running
  (`uptime` under 4 before each; no other browser). They measure the suite's own run-to-run noise.
- **Split S**: the same suite run as N parts (2 or 3) on N separate machines at once (`CT_PART=K/N`), joined with
  `gates/suite-split.sh join` and the joining run (`CT_RESUME=<the merged journal>`), so S is one `-all.log` that
  `gates/verify-log.sh` has accepted (or refused for a stated reason, which is then the result).

## What is compared, line by line

Every `PASS` and `FAIL` line of every gate section (`=== <gate> ===`), in the three logs. Each line is reduced to its
**words** (suite-compare.js's `norm`: the two-space JSON detail cut and every number replaced by `#`) and its
**values** (every number in the raw line, the JSON detail included, in order). Inside a gate a line is identified by
its words plus its occurrence number among lines with the same words, so two lines that print the same sentence
over different values are told apart by their order.

### Rule 1. What must be identical (any difference is SPLIT MOVES RESULTS)

1. The same gate sections, each once, in the same order, in A, B and S.
2. Per gate: the same verdict (green or RED) and the same PASS count and FAIL count in S as in A, **when A and B
   agree**. If A and B themselves disagree on a gate's verdict or counts, that gate is NOISY AT THE COUNT LEVEL: S is
   reported for it and does not decide the verdict, and the gate is named in the report as unusable evidence.
3. Per gate: the same multiset of words-only lines in S as in A, when A and B agree on that gate's words. Where A and
   B differ in words on a gate (28 Oct and the two 551 runs found such gates, e.g. 69-setup-sheet-live-game's clock
   list), that gate's word differences in S are KNOWN, which is suite-compare.js's existing per-gate KNOWN mechanism,
   and are listed, not counted.
4. A PASS in A and B that is a FAIL in S, or the reverse, always counts, whatever the noise: a verdict is never noise.

### Rule 2. What is noise, and how the 166 lines of 28 Oct are treated

A line is a **known noisy line** when its values differ between A and B (on 28 Oct that was 166 lines). Such a line
**does not decide the verdict**, whatever S prints for it. The report still lists each one with its three values and
whether S lies inside the closed range [min(A,B), max(A,B)] for every value, so a reader can see if the split widened
the noise, but no count of them refuses. This is the same choice suite-compare.js already makes for a gate that varies
between two unbroken runs, taken down to the line: what two serial runs of one bundle do not agree on is not a
result, so it cannot be moved.

A line is a **stable line** when A and B print exactly the same values. **A stable line whose values differ in S is a
MOVED RESULT.** This is the test that rejected the 28 Oct split (12 values in gates 18, 20, 22, 26, 51, 61 and 75 that
were the same in both serial runs moved in the split), and it is kept unchanged so the two measurements are comparable.
It is stricter than the 28 Oct spread rule for stable lines (whose spread is a single point, so the two rules agree
there) and looser for noisy lines (which 28 Oct held to the spread and this rule reports only). The reason for the
looser half: with two samples the spread of a timing is a coincidence, and the 28 Oct rule would reject any split on a
line whose noise happened to be small in A and B. Stated so nobody reads the looser half as an accident.

### Rule 3. The verdict

- **SPLIT HOLDS** when rules 1 and 2 find nothing: every stable line identical, every count and verdict identical
  where A and B agree, words identical except on KNOWN gates. The script exits 0.
- **SPLIT MOVES RESULTS** when there is at least one: a stable line moved, a PASS/FAIL flip, a count or verdict change
  on a gate where A and B agree, a word difference on a gate where A and B agree, or a gate missing, doubled or out
  of order. The script exits 1 and prints **every** moved line (gate, words, the A/B value and the S value), never a
  sample. Per the job, that verdict stops the job there, the suite stays serial, and the job closes with the list.
- **NO VERDICT** (exit 2) when the three logs are not on one bundle, a log has no sections, or S was refused by
  `gates/verify-log.sh` (then the split did not produce a joined log at all, which is a defect of the runner, not a
  measurement, and is reported as such).

### What is written on the job afterwards

The script's output in full; the three logs' names and md5s; each serial run's wall time and the split's (the longest
part's start to the joining run's end, from `date -u` at each start and finish, and each part's own start and finish);
and, if it holds, the clock time before (mean of A and B) and after (S).

### Known limits of this rule

- Two serial runs are a small sample of the noise. A stable line in A and B can be noisy at a rate of one in three
  runs, and S may then "move" it by chance. If SPLIT MOVES RESULTS rests on a few stable lines in gates the 28 Oct
  measurement already named, the honest next step is a third serial run, not a reinterpretation: the rule is not
  changed after the runs.
- The rule compares results, not timing. A gate that runs faster on a quieter machine and therefore settles
  differently is a moved result by this rule, which is the point.
