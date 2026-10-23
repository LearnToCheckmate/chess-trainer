# gates/cases/ — the convention for new control files

This directory exists so that a fix to one of the four push check scripts can **add a control without touching
a harness**. It is the one place `gates/checks-tier.sh` lets a commit add executable checks, and the reason it
exists is a measured attack rather than a preference.

## Why a new file and not a new case in the harness

The design's reviewer broke an earlier draft of the tier with a **two-commit split**:

1. **S1** added ONE line to `gates/held-selftest.sh` — a `ck` helper that prints `PASS` with whatever exit it
   was handed — and the harness still read **71 of 71**.
2. **S2** then turned `held.sh`'s SOURCE key off, and the weakened harness said nothing.

Measured against `a30fc59`'s own harness, that second commit reads **68 pass and 3 fail** (7h once, 10e twice).
So the harness is only a judge while it is *main's* harness. On this tier:

- `gates/fastgate-drive.sh`, `gates/verify-log-selftest.sh`, `gates/held-selftest.sh` and
  `gates/buildnum-selftest.sh` must be **byte-identical to the base**. A change to any of them routes the commit
  to the full suite (exit 2), where the whole suite judges it.
- An **existing** file in this directory must also be byte-identical to the base. Changing one, or deleting one,
  routes to the full suite.
- A **new** file here is allowed, is run by the tier, and must pass.

That asymmetry is the whole point: **this directory is append-only to the tier. A new file may ADD a check and
nothing may REMOVE one.** A control set that can be edited down is not a control set.

## What a control file must do

**Every `.sh` file under `gates/cases/` is run on every tier commit — the ones already on main as well as the one
you are adding.** That is the point of the directory and it is what makes a control worth writing: controls
**accumulate**, they cost milliseconds each, and a fix that lands a control here has that control judging every
later commit to the four scripts.

It was not always true, and the correction is worth keeping. In `#535`'s first draft the tier ran only the
**new** controls and merely byte-*compared* the existing ones, so a control was executed exactly once — in the
commit that added it — and never again. Antagonist A reproduced it: a base carrying a control that prints `FAIL`
and exits 1, with a candidate changing only `gates/held.sh`, reached **exit 0, `CHECKS TIER GREEN`**. A control
set that does not accumulate is a label, so now the tier runs the union.

A file is run when it ends in `.sh` and lives under `gates/cases/` — **including a subdirectory**; a *new* file
here must be `.sh` or `.md`, and anything else routes the commit to the full suite, because a file nothing
executes is not a control. The tier runs it with `bash <path>` from the root of a throwaway clone checked out at
your HEAD, with `refs/remotes/origin/main` pointed at the base. Its contract, all three asserted:

| | requirement |
|---|---|
| exit code | **0** |
| stdout | at least one line containing **`PASS`** |
| stdout | **no line reporting a non-zero `FAIL` count** |

The `PASS` requirement is not decoration. A script that asserts nothing exits 0 too, and
`CLAUDE.md` records `#405`'s rule for exactly this shape: *0 PASS is the tell*. Print one `PASS` line per
assertion, with an id and a short description, as the other self tests here do — **and a `N PASS  0 FAIL` footer
is fine.** The forbid pattern is `([1-9][0-9]*|^)[[:space:]]*FAIL`, so a zero count passes and a non-zero one
reddens. An earlier draft forbade the bare word `FAIL`, which reddened a control written exactly as this
paragraph tells you to write it — documentation and code disagreeing, with the code winning silently.

## What a control file may NOT do

The tier takes `gates/logs/.suite.lock`, snapshots the real tree, and compares the snapshot before it writes its
log. The snapshot covers tracked bytes, the untracked set including ignored files, every ref, `.git/config`,
`.git/hooks`, `.git/info` and the global git config. **Any difference is exit 1**, with exactly two paths
excluded and one of them checked another way:

- `gates/logs/.suite.lock` and the tier's own `gates/logs/checks-<sha>-all.log` are excluded, because this run
  creates both and they would always differ. An earlier draft excluded **every** path containing `gates/logs/`,
  a substring match, which hid a control writing anywhere under that directory while this document claimed the
  real tree was untouched.
- The lock is therefore asserted **directly** instead: it must still exist and still carry this run's pid when
  the battery ends. Antagonist A measured the hole that makes this necessary — a control running
  `rm -rf gates/logs/.suite.lock` reached `CHECKS TIER GREEN` with the lock gone, which is a control releasing
  the only guard against two suites overlapping (`#419`) mid-battery.

So a control must not:

- write anywhere outside its own clone and its own `mktemp -d` (the reviewer planted a `post-commit` hook that
  fired at the *next* commit, where nothing would have connected it to the run that planted it);
- move a ref, set a git config entry, or install a hook;
- run in a **git worktree** of the real checkout. Worktrees share refs and `.git/info/exclude`, and `#530`'s own
  controls moved the real `refs/remotes/origin/main` that way. Use `git clone` into `mktemp -d`.

Two habits this project has paid for, both cheap to keep:

- **Check every `mktemp -d` before you use it.** `#532`'s door did not, so under an unwritable `TMPDIR` its
  scratch paths became files at the filesystem root, where a safety check then refused to remove six of them.
- **Never match a process by a pattern your own command line carries** (`pgrep -f`, `pkill -f`, `ps | grep`).
  `#407` waited on itself and `#416` killed its own shell that way. Capture the pid at launch.

## One more constraint, and it is mechanical

`gates/gatemanifest.sh sigpipe` ratchets **early-exiting pipes into grep under `pipefail`** across `gates/*.sh`
against a committed ceiling. A file here is inside that scan, so do not write `… | grep -q`, `… | grep -m1` or
`… | grep … | head`: the producer takes SIGPIPE and `pipefail` turns a correct answer into a failure. Use a
herestring (`grep -q … <<<"$var"`), or capture into a variable first, or `sed -n '1p'`, which reads the whole
stream. The audit reads **23** sites against a ceiling of **15** on `a30fc59` and is therefore already red: do
not add to it.

## Naming

`c-<what-it-controls>.sh`, lower case, one subject per file — `c-held-source-key.sh`,
`c-buildnum-nul-rows.sh`. Put the job id the control belongs to in a comment at the top, so a later reader can
walk from the control back to the defect it was written for.
