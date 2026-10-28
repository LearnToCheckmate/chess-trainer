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

That asymmetry is the whole point: **this directory is append-only TO THE TIER. A new file may ADD a check and
nothing may REMOVE one without leaving the fast path.**

**AND BE EXACT ABOUT THE SCOPE OF THAT, BECAUSE THE FIRST DRAFT OF THIS PARAGRAPH OVERCLAIMED IT** (fresh
antagonist A, F-L). It read "a control set that can be edited down is not a control set", which a reader takes
as a property of the directory. It is a property of the TIER only. Measured: `grep -rn 'gates/cases'` over the
repository returns the two tier scripts, this README, one `gates/build-numbers.tsv` row and four
`claude/stories/TEST-CASES.md` rows — **no section of the gate suite runs, counts or even mentions anything under
this directory.** So a commit that deletes every control here routes to the full suite (correctly, and that is
what the bullets above say), and the full suite then has no opinion whatever about the deletion. Append-only is
enforced on the fast path and nowhere else. Closing that is `jobs/the-full-suite-does-not-run-the-checks-tier-harness-or-the-gates-cases-controls-2026-10-23`,
and until it lands, the honest sentence is the one above and not the bolder one.

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
| stdout | at least one line matching **`^PASS<space>`** — a `PASS` line of its own, at the start of a line |
| stdout | **no `FAIL` except inside a zero-count footer such as `12 PASS  0 FAIL`** |

The `PASS` requirement is not decoration. A script that asserts nothing exits 0 too, and
`CLAUDE.md` records `#405`'s rule for exactly this shape: *0 PASS is the tell*. Print one `PASS` line per
assertion, with an id and a short description, as the other self tests here do — and a `N PASS  0 FAIL` footer
is fine beside them.

**BOTH HALVES OF THIS CONTRACT WERE DEFEATED IN REVIEW AND BOTH ARE NOW TIGHTER** (fresh antagonist A, F-G,
three poses, each reaching exit 0 and `CHECKS TIER GREEN`). The `PASS` test was a FIXED-STRING match, so
`all checks BYPASSED; nothing asserted` satisfied it — the letters `PASS` inside `BYPASSED` — and so did a
control whose entire output is `0 PASS  0 FAIL`, which is the empty denominator credited as a control inside
the directory whose whole purpose is accumulating controls. It is now `^PASS[[:space:]]`, so the line has to be
a `PASS` line rather than a word inside a sentence, and a zero-count footer alone is no longer enough. The
forbid was `([1-9][0-9]*|^)[[:space:]]*FAIL`, which let through a `FAIL` that is neither line-initial nor
digit-prefixed: `Result: FAIL - the key is off` passed. It is now
`(^|[^0-9[:space:]])[[:space:]]*FAIL|[1-9][0-9]*[[:space:]]*FAIL`, which catches that line and `3 FAIL` and a
bare leading `FAIL`, and still cannot match inside `0 FAIL`.

**AND HERE IS WHAT THE FORBID WILL DO TO HONEST PROSE, because this is where you learn the wording.** The
pattern catches `FAIL` preceded by anything that is not a digit, so a control that merely NARRATES the word is
reddened: `… must FAIL`, `FAIL: 0`, `0 of 12 FAILED` and `no FAILures` are all refused. That is deliberate —
the alternative is a pattern loose enough to miss a real `Result: FAIL` — but it means you write your prose
around it. Say `0 FAIL`, or `12 checks, none failed`, or avoid the word outside the footer.

The history is worth keeping, because the narrowing that opened the second hole was itself a correct fix: an
earlier draft forbade the bare word `FAIL` and reddened a control written exactly as this paragraph tells you
to write it — documentation and code disagreeing, with the code winning silently. Each round fixed the previous
round's over- or under-reach, which is why the pattern is now written out in full in both homes rather than
described.

## What a control file may NOT do

The tier takes `gates/logs/.suite.lock`, snapshots the real tree, and compares the snapshot before it writes its
log. The snapshot covers tracked bytes, the untracked set including ignored files, every ref, `.git/config`,
`.git/hooks`, `.git/info` and the global git config. **NOTHING IS EXCLUDED FROM IT.**

**THIS PARAGRAPH DESCRIBED A MECHANISM THAT HAD ALREADY BEEN DELETED, AND BOTH ANTAGONISTS OF THE THIRD ROUND
FOUND IT.** It read: "**Any difference is exit 1**, with exactly two paths excluded and one of them checked
another way — `gates/logs/.suite.lock` and the tier's own `gates/logs/checks-<sha>-all.log` are excluded,
because this run creates both and they would always differ. … The lock is therefore asserted **directly**
instead." Every clause of that is now false. The exclusion went through three versions — a substring match on
`gates/logs/`, then a two-needle substring match the code called "BY EXACT PATH" while being neither, then
nothing at all — and the commit that deleted it said it had corrected this README "in three places" and left
the one passage whose whole subject was the thing that changed. An author reading it to work out what is safe
was reading the previous draft's code, and the live rule is **stricter** than the published one.

What is true now:

- **Any difference at all is reported, and the lines are named in the verdict.** A difference that names tracked
  content, a ref, a hook, a git config entry, the working-tree diff, the suite lock or the tier's own log path
  is a hard **exit 1**. Any other difference — an added or removed untracked or ignored path — is **exit 2**,
  a route to the full suite, because this judge cannot tell a control's write from another session's, and
  `CLAUDE.md`'s pen rule lets every other chat read, measure, test and write docs and flags in this repository.
  An earlier version answered exit 1 for both, and asserted in its text that "a control" had done it; a reviewer
  reproduced an honest candidate hard-refused because an unrelated background writer created a doc.
- **The lock is additionally asserted directly**, by inode AND ctime as well as by pid: it must still be the
  same directory, not merely a directory with the same pid in it. A reviewer defeated the pid-only form in three
  lines — read the pid, `rm -rf` the lock, prove a second process can take it, write the pid back — and the
  inode alone was blind too, because `mkdir` after `rm -rf` reuses the inode on this filesystem.
- **The tier's own log is written by rename**, and its target is checked first: no path component may be a
  symlink, and the log path itself must be absent or a regular file with exactly one hard link. A reviewer
  reached `CHECKS TIER GREEN` over a replaced `app.js` with one character changed from the previous round's
  control — `ln` instead of `ln -s`, because `[ -L ]` is false for a hard link and `>` truncates whatever inode
  the name resolves to.

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
against a committed ceiling. Do not write `… | grep -q`, `… | grep -m1` or `… | grep … | head`: the producer
takes SIGPIPE and `pipefail` turns a correct answer into a failure. Capture into a variable first, or use
`sed -n '1p'`, which reads the whole stream, or a `case` over the captured text, which starts no process at all.

**A FILE IN THIS DIRECTORY IS NOT IN THAT SCAN, AND THE FIRST DRAFT OF THIS PARAGRAPH SAID IT WAS** (fresh
antagonist A, F-L). Measured: `sigpipe_sites()` iterates `for f in "$root"/*.sh` — ONE level — so adding a
control carrying `cat x | grep -q y` under `gates/cases/` leaves the audit's count unchanged. The advice above
is good and the mechanism named for it does not exist, which is this project's own "a written warning is not a
guard". Follow it because a SIGPIPE under `pipefail` will give you a wrong answer in your own control, not
because anything will stop you.

**AND THE COUNT: re-take it on the tree you ship.** The audit reads **23** sites against a ceiling of **15** at
`a30fc59` and is therefore already red. This build's first two commits of the tier published "unchanged at 23,
0 sites in either new file" and that was **false on the shipped tree**: `gates/checks-tier-drive.sh:754` carried
`if grep -qF … <<<"$TOUT" || grep -qF … <<<"$TOUT"`, which the classifier read as **the repository's first
TIER A site**, taking the total to 24 and `A 0` to `A 1` — at a ceiling of exactly 1, whose single slot the
audit's own comment reserves for `gates/verify-log.sh:128`. It is now a `case` and the count is back to 23,
measured on the tree that ships rather than carried forward from an earlier one. Note the shape of why it was
missed: a single herestring into `grep -q` IS exempt, and the exemption is applied per logical line rather than
per grep, so adding a second herestring with `||` created a site out of two lines that each cannot SIGPIPE.
That is a defect in the instrument and it is filed as
`jobs/the-sigpipe-audits-herestring-exemption-is-defeated-by-an-or-chain-so-the-remedy-its-own-message-prescribes-creates-the-site-it-removes-2026-10-23`.

## Naming

`c-<what-it-controls>.sh`, lower case, one subject per file — `c-held-source-key.sh`,
`c-buildnum-nul-rows.sh`. Put the job id the control belongs to in a comment at the top, so a later reader can
walk from the control back to the defect it was written for.

## What design round 4 changed for a control author (build #536)

Four of these are rules you will notice; the rest of the section is the honest list of what this layer still
cannot do. Round 4 exists because **three of the five adversarial rounds on `gates/checks-tier.sh` found the
same shape — the judge's own write landing somewhere else — and each earlier repair was a guard that REPORTED
the plant.** Round 4's answer is structural: the plant cannot land, because nothing the judge writes has a name
a control can compute, and no control is handed the real tree.

- **Your clone is not the repository under judgement.** Controls are cloned from a throwaway `--mirror` copy in
  the judge's own private directory, so `git config --get remote.origin.url` and
  `.git/objects/info/alternates` both name that mirror. Three P1s reached the real checkout through that url.
  If your control needs the real tree, it is not a control: say so on the job instead.
- **Your control gets its own HOME, TMPDIR, XDG_CONFIG_HOME and git config.** `GIT_CONFIG_GLOBAL` points at an
  empty file and `GIT_CONFIG_NOSYSTEM=1` is set, so `git config --global` writes into your throwaway directory
  and not the operator's `~/.gitconfig`. Do not expect to read the operator's configuration, and do not try to
  write it: the snapshot hashes `~/.gitconfig`, `~/.config/git/config`, `~/.bashrc`, `~/.bash_profile`,
  `~/.profile`, `~/.npmrc` and both git config scopes, and a change in any of them is a hard refusal.
- **Do not leave a process behind.** Your control runs in its own process group with a 600s bound
  (`CT_CTL_TIMEOUT`), the group is killed when it ends, and every control carries a per-run marker that the
  judge then looks for in `/proc`. A survivor is a **RED**, not a warning: a process that outlives the battery
  can write into the real tree after the snapshot that is supposed to prove nothing did.
- **A new `.md` on its own earns nothing.** This tier RUNS every `gates/cases/*.sh` and reads `.md` as
  documentation, so a commit whose only tier paths are new `.md` files routes to the full suite. A green that
  means "nothing was executed" is the one verdict this tier must not give.
- **A stale log refuses.** The judge's log destination must not exist at all when it writes, because asking
  what KIND of thing is at that name was insufficient three times running (a symlink, then a hard link, then a
  directory). So a second tier run at an **unchanged head** refuses rather than overwriting its own earlier
  `gates/logs/checks-<short>-all.log`. Move the old one aside and re-run; that is one command, and the
  alternative is a judge that writes through a name it cannot account for.

### The tier's own path set, and where it is named

`gates/checks-tier.sh` names it ONCE, in `tier_relevant_path()` immediately above the entrance's dirty-tree
arm: **every path under `gates/`, plus `app.js`, `chess.jsx` and `index.html`, and nothing else.** It is the
set of working-tree paths whose UNCOMMITTED state could change a verdict the judge reaches below, so a tracked
edit inside it refuses and a tracked edit outside it routes to the full suite. Matched at a true path boundary,
so `gatesX/` is not caught and the three blobs are exact top-level names.

**It is not the served tree of the identity arm**, which is "every top-level entry except `.git` and `gates`" -
the complement of this set's first half. Those two answer different questions: the served tree asks whether the
CANDIDATE moved what a player is served, and this set asks whether an uncommitted edit could move the JUDGE'S
OWN verdict. Conflating them would invert the set.

### What this layer still cannot do, stated rather than implied

- **A control runs as the same user as the judge.** It can signal it, trace it, read its `/proc` entry and so
  find the real tree by a route the mirror does not close. **This is a mechanical layer and not a sandbox**, and
  the check that covers the rest is the adversarial pass that reads every control before it lands.
- **A survivor that re-executes with a scrubbed environment keeps no marker**, so the `/proc` scan catches the
  ordinary escape (`setsid`, a double fork) and not the determined one.
- **A vacuous control is still credited.** A file whose entire output is `PASS` and which asserts nothing meets
  the contract, because the contract can see the SHAPE of a result and not its SUBSTANCE. The directory's whole
  economic case is that controls are milliseconds each and accumulate, and nothing here measures whether one
  of them tests anything. That is `theREMAINDER` (b) on the hand-off job and it is unchanged by round 4.
- **The premise stripper's expensive half is still owed.** A `/*` inside a string literal sets the comment
  state for the rest of the file, and over-stripping yields a false CLEAN. Round 4 added the cheap half — the
  state must be closed at end of file, and `://` is no longer read as a comment start — and a real
  string-aware scan remains a recorded known limit (fingerprint `4a14dac044acc63f`).

**Added by #542's adversarial pair, both reproduced:**

- **THE GROUP KILL IS ESCAPED BY A SHELL BUILTIN, NOT ONLY BY `setsid`.** This document said a control that
  calls `setsid` itself still escapes the process-group kill and is still RED by its marker. `set -m` is a
  SECOND escape, it is a bash builtin, it needs no binary, and combined with the env scrub disclosed below it
  defeats BOTH layers at once - the group kill misses the escapee because it is in its own group, and
  `ctl_survivors` misses it because the marker is gone. Measured by antagonist A against this file's own
  launch, kill and scan code: the escapee survived while the survivor scan reported nothing. Each half alone is
  caught. The fix direction is to make the survivor scan a SET test rather than an IDENTITY test - record
  `ps -eo pid,sid` before each control and treat any process in the judge's own session that was not there
  before as a survivor, since a scrubbed environment cannot change the session id and `set -m` does not either.
- **`timeout` carries no `-k`**, so a control whose body traps TERM and sleeps makes `timeout` wait on a child
  that will not die, and the judge's `wait` blocks past the bound with the real tree's suite lock held. The
  bound is on the process group but not on the clock.
- **THE `verify-log-selftest.sh` ARM ACCEPTS ANY NUMBER OF OPEN HOLES AND THE COMMENT ABOVE IT SAYS IT DOES
  NOT.** The arm pins the sentence and the exit set and forbids a `N fail` line; the selftest's own
  "holes still open" branch satisfies all three. There is no hole comparison in the arm at all. It is also a
  frozen premise: that comment calls exit 2 the expected state "until the push gate's argument parser is
  repaired", and #537 repaired it, so the selftest now exits 0 on main. One `[ "$HOPEN" = 0 ]` would make the
  arm match its own comment.
- **A HARD LINK DEFEATS THE NEW DESCRIPTOR-SWAP GUARD.** The guard is `[ "$outf" -ef /proc/self/fd/$ofd ]` plus
  `[ ! -L "$outf" ]`, and its comment claims it closes the swap "deterministically rather than by timing". For a
  HARD link both tests pass - the two names genuinely ARE the same inode, and a hard link is not a symlink - so
  a write through the descriptor lands on the victim. Measured by antagonist B on a faithful replica. The end
  state is still a REFUSAL, because `snapcheck` sees the changed bundle as GRAVE, so this is bundle destruction
  under a refusal rather than a false green - which is the same bar this file set for the round-3 log-path
  defect. The fix is the link-count check `writelog()` already applies to its own output: require
  `stat -c %h` to read 1.
- **`gates/cases/` HOLDS ONLY THIS README TODAY.** A tier run reports `gates/cases control(s) run: 0`. The
  convention this document describes is an accumulating control set whose present size is zero; the arm is
  reported rather than credited, but a reader should not take the section above as describing controls that
  exist.
- **THE SELFTESTS ARE NOT IN THIS TIER'S SET.** A commit that changes `gates/held-selftest.sh` answers GO FULL
  at exit 2, because the harnesses are pinned byte-identical to the base instead. So a fix to one of the four
  scripts that needs a NEW SELFTEST CASE cannot use this tier at all, and `gates/cases/` is the only place a
  tier commit may add a control. Measured by antagonist A through the carried judge.

## What the seventh round changed for a control author (build #536, held)

One line, because it is the only thing in this layer a control could use to reach outside the repository, and
it is gone: **the judge no longer reads the process group it kills out of a file.** `ctl_exec` used to launch
the control under `setsid --wait bash -c 'printf "%s\n" "$$" > "$0"' "$pgf"` and then run
`kill -TERM -- -$(cat "$pgf")`. $PRIV is `dirname "$(git config --get remote.origin.url)"` from inside any
control, and mktemp only stops a plant at a PREDICTABLE name - so a control could enumerate `"$PRIV"/pg-*`,
write any digit string into it, and choose the group the judge TERMed, as root, with the verdict still
`CHECKS TIER GREEN`. With `0` the judge killed itself mid-battery and left the suite lock standing. The group
is now the one the judge's own shell watched (`$!` under job control), so there is no file in the exchange at
all, and the floor refuses 0 and 1. `gates/checks-tier-drive.sh` A63 proves an unrelated process group
survives; M48 puts the file read back and the same control kills the victim.

Nothing a control may legitimately do has changed. A control that backgrounds a child is still reaped by the
group kill when it ends; a control that calls `setsid` itself still escapes the group and is still RED by its
marker. What a control can no longer do is pick the number.

**AND ONE THING THIS LAYER STILL GETS WRONG, measured and NOT fixed in that build:** an honest tier-only
commit is HARD-REFUSED (exit 1, "do not re-run") when another chat has modified a TRACKED doc or flag in the
working tree, where an untracked write of exactly the same kind correctly routes to exit 2. CLAUDE.md's pen
rule invites that concurrent write, so the entrance split keys on tracked-vs-untracked where it should key on
tier-relevant-vs-not. If you meet it, the tree is not at fault and the commit is not at fault: stash the
unrelated doc change, or run the full suite. The reproduction is on the hand-off job.
