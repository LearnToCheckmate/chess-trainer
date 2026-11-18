# gates/pairs — the grading machine

It checks a job with no model reading anything. For each job it runs the job's gate:

- **on the real code in every situation the job must work in** — every checked line must PASS in each;
- **on two or three copies of the code, each broken a different way on purpose** — the gate must FAIL on each.

A gate that passes a broken copy is **BLIND**. A gate that fails the real code somewhere is **OVER STRICT**.
Once a job's broken copies are written, rechecking it costs machine time only, so it can run every night.

Built by batch 12 (jobs/build-the-grading-machine-2026-11-15; decisions/batch-12-adopts-break-it-again-testing-2026-11-15).
It runs apart from the full suite: `gates/gates.sh` does not call it, and it changes no gate.

## Running it

```
node gates/pairs/run-pairs.js --job <id>     # one job, gates/pairs/jobs/<id>.json
node gates/pairs/run-pairs.js --all          # every job in gates/pairs/jobs/
node gates/pairs/run-pairs.js --selftest     # the machine's own test: fixture gates, no browser, about 10 seconds
```

Options: `--base <ref>` grades that commit (default `HEAD`); `--keep` leaves the worktrees under `gates/pairs/.work/`;
`--only real,<break>` runs some tries only (the job then reads PARTIAL at best, never CHECKED);
`--flip <1-4>` (selftest) reverses one expectation, which must turn the selftest red.

**It grades the COMMITTED tree.** Every try — the real code included — runs in a throwaway `git worktree` of the base, so an
uncommitted edit is never graded. Commit first.

It exits 0 only when every job it ran reads CHECKED (`--selftest`: only when it prints `SELFTEST OK`).

## The verdicts

| verdict | means |
|---|---|
| CHECKED | every try came out as expected: the real code passed in every situation, and every break failed the gate |
| BLIND | a break the gate passed: the gate cannot see that defect |
| OVER STRICT | a situation where the real code failed the gate |
| ERROR | the machine could not judge: a patch that does not apply, a build that fails, a gate that timed out, a job file that is malformed, or a situation with no checked line at all (a situation that is never reached is vacuous, not a pass) |
| PARTIAL | `--only` ran some tries and none went wrong; it certifies nothing |

A job with several problems reads the worst, in the order ERROR, BLIND, OVER STRICT; `report.json` lists every one.

## The format: one JSON file per job in `gates/pairs/jobs/`

```json
{
 "job": "the tracker job id",
 "about": "what is graded, and what is NOT covered, in words",
 "gate": "gates/regress/78-inner-scroller-fold.js",
 "cmd": ["node", "gates/regress/78-inner-scroller-fold.js"],
 "env": {"CT_G78_08P_ONLY": "1"},
 "checks": ["TC-INV-08[dek] "],
 "build": "auto",
 "situations": [
   {"name": "kunal761", "match": "^375x761\\+51,31 "},
   {"name": "small", "env": {"ST_W": "320"}}
 ],
 "breaks": [
   {"name": "board-under-the-tab-bar", "patch": "breaks/78-board-under-the-tab-bar.diff",
    "why": "what is broken, in words", "mustFailIn": ["kunal761"]}
 ],
 "timeoutSec": 1500
}
```

- **gate / cmd / env** — the gate and the part of it to run. `cmd` defaults to `node <gate>`; `env` is passed to every run
  (a gate's own "run only this block" switch goes here). The run's working directory is the worktree's root.
- **checks** — regular expressions over a gate's `PASS ` / `FAIL ` lines (the text after the word). Only lines matching one
  of them are graded; everything else the gate prints is ignored.
- **situations** — where the real code must pass. Two kinds, never mixed in one job:
  - `match`: a regular expression over the checked line's text. Use it for a gate that loops over its own geometries and
    names each in its lines (gate 78 prints `375x761+51,31 Tactics: TC-INV-08e ...`). The gate runs ONCE per try.
  - `env`: extra environment for a run of its own. Use it when the gate takes its situation from the environment. The gate
    runs once per situation per try.
  A situation in which no checked line appears is an ERROR, never a pass.
- **build** — `auto` (default): when any break's patch touches what `gates/build.sh` bundles (`chess.jsx`,
  `gates/entry.jsx`), every try — the real code too — builds a trial bundle with `CT_OUT` and serves it with `CT_APP`, so the
  real code and each break differ by exactly the patch. `always` / `never` force it. The trial is stamped with the base's own
  build number; a trial is never an issued build (`gates/build.sh` reports, does not enforce, under `CT_OUT`).
- **breaks** — two or three, each a unified diff against the base (paths `a/<repo path>`, `b/<repo path>`), stored under
  `gates/pairs/breaks/`, applied with `git apply`. Make one with `git diff -U2 <file> > gates/pairs/breaks/<name>.diff` and
  then `git checkout <file>`. `mustFailIn` names situations the gate must fail in; without it, a FAIL in any situation counts.
  **A patch that no longer applies is an ERROR**, which is how a break that went stale with the code says so.

## What it writes

- `gates/pairs/logs/<stamp>/<job>/<try>.log` — the full log of each try: the build's output and the gate's whole output.
- `gates/pairs/report.json` and `gates/pairs/report.txt` — the verdicts of the last `--job` or `--all` run (gitignored).
- `gates/pairs/.work/` — the worktrees, removed after each try (gitignored); `git worktree remove` clears git's own bookkeeping.

It never edits the real tree and writes nothing outside `gates/pairs/` and its worktrees.

## The short failure report

For each unexpected result, at most 15 lines: the job, gate and check; what was expected against what happened; the situation;
the first failing line; **the first error the gate printed before it** (the first non-PASS/FAIL line matching error, missing,
not found, threw, timed out ...) with its line number in the log; the four lines before the failure; and the full log's path
and line. It is a first look, never a replacement for the log.

## Its own test

`--selftest` grades four fixture pairs in `gates/pairs/selftest/` (node scripts that print PASS/FAIL lines; no browser):

1. `st1-caught` — the gate catches its break: must read CHECKED;
2. `st2-blind` — the gate's check cannot see its break: must read BLIND;
3. `st3-overstrict` — the gate fails the real code at `ST_W=320`: must read OVER STRICT;
4. `st4-cause` — the real code fails and the cause is printed seven lines earlier: the short report must carry that line,
   the log's path and line, in at most 15 lines.

It prints `SELFTEST OK` only when all four behave **and** reversing any one expectation turns it red (shown on the same
results; `--flip <k>` does it for real). It was also run against three broken copies of the runner itself (the error-line
search disabled, FAIL lines ignored, the real code never judged) and went red on each.

## Adding a job

1. Find the gate and the lines that prove the job (`checks`), and the situations it must hold in.
2. Run the gate on the real code once and check every checked line passes in each situation.
3. Write two or three breaks — each a different way the thing the job fixed could come undone — and check each by hand once.
4. `node gates/pairs/run-pairs.js --job <id>` must read CHECKED. Write its report line on the job.
