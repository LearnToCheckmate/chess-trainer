# The H1 flake in `fastgate-drive.sh unfixed`, reproduced on demand - #549, item (60)

Job: `jobs/one-in-ten-unfixed-harness-runs-adds-h1-and-the-cause-is-unpinned-2026-10-16`. Its close condition, first
branch: "a reproduction that names the assertion and the mechanism". This directory is that reproduction. It needs no
quiet machine and no series of runs, because it makes the race certain instead of rare.

## What flaked, and the configuration it ran in

On 16 Oct 2026, 13:58:00Z to 14:02:11Z, #525's antagonist B got `4 ok, 21 FAIL, 1 skipped` with H1 added, once in
ten `bash gates/fastgate-drive.sh unfixed` runs. The detailed log was overwritten. The tree B was judging was #525's
working tree, whose last harness commit before 13:58Z is `9a4663e`. In `unfixed` mode the harness replaces
`gates/fastgate.sh`, `gates/buildnum.sh` and `gates/build.sh` in its clone with origin/main's copies. On 16 Oct,
origin/main was `c661487` (#524 close-out, 02:13:05Z). Every other file, `gates/records-gate.sh` included, is the
candidate's.

H1 [TC-SUITE-057] is the positive "honest rebuild" case. It mints, restamps app.js, records, commits, and expects
`gates/fastgate.sh` to exit 0 with `FAST GATE GREEN`.

## The mechanism: an early-exit pipe under `set -uo pipefail`, at two sites on H1's path

1. **fastgate.sh at c661487**, the register's membership test:
   `"$G/records-gate.sh" --entries 2>/dev/null | grep -qxF "$(printf 'appendonly\tgates/build-numbers.tsv')" && BNRATCHET=yes`.
   The register is line 2 of the nine lines `--entries` prints. `grep -q` exits at that match. If records-gate.sh
   writes again after that, it takes SIGPIPE, the pipeline returns 141, `&&` is skipped and BNRATCHET stays `no`.
   classify() then FORCEs `gates/build-numbers.tsv` and fastgate exits 2 `FULL SUITE REQUIRED`, so H1 reads
   `exit 2, expected 0`. #523's antagonist B measured this exact pipe at 9 misses in 150 under load. #524 rewrote
   it capture-first, and that reached main at #526 (`b8055c7`, 20 Oct 2026).
2. **records-gate.sh at 9a4663e** (also c661487), in `entries_ratchet()`:
   `printf '%s' "$live" | grep -qxF "<mode><TAB><path>" || gone=...`. Bash's printf writes this line by line, so
   every entry but the last can lose the same race. The door then refuses itself with
   `RECORDS GATE REFUSED - the entry list LOST a required check`, fastgate goes RED (exit 1), and H1 reads
   `exit 1, expected 0`. This was rewritten as an in-shell `case` at #527 (`ad07c70`, 20 Oct 2026).

Whether a write lands after `grep -q` has exited is a matter of scheduling. That is why the flake needed load and
showed up about once in ten runs: H1 and H2 both run these pipes as positive cases, so each run had two exposures.

**What this does not settle:** which of the two sites fired in B's run. The log that would say is gone. Either one
fails H1 and only H1-type positive cases, and both are removed on main.

## How it is made deterministic

`strace -f -e trace=write -e inject=write:delay_enter=20000` (strace 6.8) delays every `write(2)` in the fastgate
process tree by 20 ms. The consumer of each pipe has then always exited before the producer's next write, so every
racy pipe loses every time. Pipes that capture output first, or match in-shell, are unaffected by the delay.

## Results (6 Nov 2026, about 19:29Z to 19:52Z, 1-minute load 4 to 6, other build workers running)

| script | configuration | writes | verdict |
|---|---|---|---|
| `h1-flaked-config.sh` | 9a4663e + c661487 baseline | plain | `FAST GATE GREEN`, exit 0 (H1 ok) |
| `h1-flaked-config.sh` | same | delayed | `FULL SUITE REQUIRED`, exit 2, BNRATCHET `no` (site 1) |
| `h1-flaked-config-fastgate-site-fixed.sh` | site 1 capture-first | delayed | `RECORDS GATE REFUSED`, exit 1: 8 of 9 entries "lost", the last line kept (site 2) |
| `h1-flaked-config-both-sites-fixed.sh` | sites 1 and 2 fixed | delayed | `FAST GATE GREEN`, exit 0 |
| `h1-head.sh` | run head 68020d0, fixed mode | plain | `FAST GATE GREEN`, exit 0 |
| `h1-head.sh` | same | delayed | `FAST GATE GREEN`, exit 0 (17m53s) |

So on the flaked configuration these two pipes are the only write-order-sensitive sites on H1's path. On today's
tree there are none: the delayed HEAD run is green. The `unfixed` baseline today is origin/main `7340372`. Its
fastgate.sh differs from HEAD's only by a FORCE arm for `gates/gatelog-exceptions.tsv`, a file H1 does not touch,
and its buildnum.sh and build.sh are identical to HEAD's, so the HEAD result covers both modes.

`pipe-probe.sh` isolates site 1 (`out/pipe-probe.txt`). With writes delayed the racy pipe read `no`, with status
`141 0`, 5 of 5 times, and the capture-first form read `yes` 5 of 5. With no delay but this machine's load, the
racy pipe already missed 2 of 5 times. The capture-first form read `yes` 10 of 10 overall.

## Candidates ruled out on the way

- **`$NOWET`.** fastgate.sh at c661487 reads no clock at all. Its stamp test compares lengths, and a same-format
  restamp always has the same length. The stamp-against-row time band that does read the clock arrived at #526 and
  allows an hour.
- **`mint_in_clone`'s pipe** (`next | grep -oE | head -1 | tr`). `head` cannot lose a line it has already read, so
  SIGPIPE in that pipe cannot empty the number. buildnum.sh at c661487 is a deterministic function of the register
  apart from its lock, which nothing else holds in a fresh clone.
- **The ratchet tools disagreeing between base and head.** On this tree, `verify-log.sh` over the gatelog that
  `control-audit.js` picks exited 0 in 40 of 40 runs (`out/verify-log-40-exit-codes.txt`). The `control-audit` and
  `--citations` verdict lines, grepped exactly as fastgate greps them, were byte-identical across 25 runs each
  (`out/ratchet-readings-25-md5s.txt`).

## Re-running

```
git worktree add --detach <dir> 9a4663e
claude/agents/h1-cause-549/h1-flaked-config.sh <dir> <outdir>          # plain: GREEN
claude/agents/h1-cause-549/h1-flaked-config.sh <dir> <outdir> 20000    # delayed: FULL SUITE REQUIRED
claude/agents/h1-cause-549/h1-head.sh <repo at the tree to judge> <outdir> 20000
```

Each script prints `rc=<exit> <verdict line>` and leaves fastgate's stdout in `<outdir>/fg.out`. The
`out/*.fastgate-stdout.txt` files here are those outputs from the runs in the table.
