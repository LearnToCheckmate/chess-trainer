# #433 pen note — TEMPORARY CARRIER, written to the repo because the tracker was down

**Removal condition: delete this file once `claims/repo-pen` carries the release below and
`scores/build` carries the correction below. It is a second home for something whose real home is
the tracker (R17), and it exists only because that home was unreachable.**

At **2026-09-29T14:17–14:19Z** the tracker artifact `5326ERvZCZ5tEYRkPavPTF` returned **HTTP 503 on
every write**, three times, on two different documents. Every other write this run landed: the ledger
row, `runreports/433`, `builds/433`, `builds/batch-433-to-433-2026-09-29`, the snapshot, the pickup
board, eleven jobs, eleven fingerprints, four notes, the antagonist and auditor flags, the amber
record. **Two writes did not.**

## 1. The pen is still held by this run, and test (c) is what frees it

`claims/repo-pen` still reads `status: "open"` with `runId: build__1790684483528`. The release could
not be written. This is contained, and deliberately so:

- R38 test **(a)** will call the row stale at the next fire (it started 12:21:23Z).
- R38 test **(b)** reads my `runledger` row, which **is** `status: "done"` — that write landed — so (b)
  says not live.
- R38 test **(c)** is positive: `origin/main` carries **`cb57411 "#433 close-out: ..."`**, titled that
  way precisely because R41 requires it and because #430 and #431 titling theirs `records:` cost two
  later fires a wrong verdict.

So **the next run should take the pen on test (c)**, record that it did, and delete this file.

## 2. `scores/build` is owed this update, and it includes a correction

Provisional self-score for `build__1790684483528` is **7**; the reasoning is in the ledger row's
`scoreBecause` and in `runreports/433`. The document also needs an arithmetic correction [R18]:

> It publishes `mean` 1.43 **and** `mean7` 2.29 with a note saying the two "coincide" because every
> scored run is inside the last seven. They cannot both be right, and they did not coincide: 2.29 is
> 16/7 against a `history` array summing to 10. Re-derived from the array itself, the eight values are
> **0, -2, 0, 1, 0, 7, 4, 7** → sum **17**, n **8**, mean **2.13**; `mean7` drops the -2 and is
> 19/7 = **2.71**. Minutes 670.8; positive sum 19 → **35.3 minutes per point**, down from 46.3.

## 3. Everything else the next holder needs is in `runreports/433`

Including: the item to take (`jobs/cpu-game-over-says-nothing-three-seconds-later-2026-09-29`, whose
control and mechanism are already measured, with one branch named as unmeasured), why the auditor was
affordable this time, why the pair's coverage is published as a range, and the nine findings left open
with owners.
