# HANDOFF - where the last run left off

#535 IS BUILT AND HELD. NO SUITE RAN, NOTHING WENT TO MAIN, AND NOTHING ON KUNAL'S SCREEN MOVED.
origin/main is still a30fc59 (#534). The deliverable is on origin/claude/gallant-wozniak-ci1jbl.

WHERE #535 LEFT OFF (run 12, build__1792755737000, session_01GxScV3ZbzBFVB8VFUTXHX4)

THE PUSH CHECKS TIER IS FINISHED AND UNLANDED. ONE RUN OF WORK IS LEFT AND IT IS A SUITE AND A READ.

  WHAT IT IS. A commit that changes only gates/fastgate.sh, gates/verify-log.sh, gates/held.sh or
  gates/buildnum.sh pays the full 113-minute browser suite today, and no browser gate reads any of
  them. gates/checks-tier.sh judges such a commit by MAIN'S OWN COPY of the checks. 42 open jobs
  change only those four scripts.

  WHAT IS PROVEN, and every figure here was measured on the branch rather than carried. NOTE ONE
  CORRECTION THE FIFTH ROUND FORCED: the 77 ok / 347s figures were measured with a one-line fixture
  edit that was UNCOMMITTED at the time, so on bbc603f exactly as committed, A1 fails in 0 seconds
  and `fixed` mode reads 76 ok / 1 FAIL. That line is committed now, so the numbers below describe
  what is in git. Antagonist A measured and disputed it, and it was right to.
    `bash gates/checks-tier-drive.sh fixed`   77 ok, 0 FAIL, 0 skipped, exit 0
    `bash gates/checks-tier-drive.sh`         76 ok, 0 FAIL, 1 skipped (A1 is opt-in), exit 0
    A1, the WHOLE REAL BATTERY in a full clone of this repository, over a candidate shaped like the
      job it exists for: CHECKS TIER GREEN in 347s, and 365s / 365s / 364s on three earlier trees.
      Against the suite's 113 minutes. That is the job's entire economic claim, measured four times.
    Cases A2 to A41 and mutants M1 to M30 - a case AND a mutant for every arm of the judge.
    Sigpipe audit 23 sites, A 0, BYTE-EQUAL to a30fc59, re-taken on the tree that ships.
    Gate manifest 59 required / 59 present / 0 missing / 0 unlisted, anchor 0 vanished 0 weakened.
    verify-log.sh --citations byte-identical to the base on every defect number; the register
      self-check moved 143 rows to 151, exactly the eight rows this run added.
    app.js, chess.jsx and index.html byte-identical to main at EVERY commit of the branch.

  WHAT IS NOT PROVEN, and it is the whole of what stopped the build:
    **NO FULL GATE SUITE HAS EVER RUN OVER THIS TREE.** No GATES GREEN, no GATES RED, no gatelog.
    The prediction is 5026 PASS over 60 sections, byte-equal to #531-#534, because none of the three
    new files is under gates/regress and nothing the suite globs reads them - but predicted is not
    measured, and a total that moves is a finding rather than a bonus.

WHY IT HELD, AND READ THIS BEFORE YOU PLAN THE NEXT RUN.

FOUR ADVERSARIAL ROUNDS. EACH ONE FOUND A REAL DEFECT. THREE OF THE FOUR FOUND IT IN THE PREVIOUS
ROUND'S FIX.
  1. Two P1s: an EXISTING gates/cases control was byte-COMPARED and never RUN; and five of thirteen
     mutants did not establish their arm, two of them leaving a judge that does not PARSE - and bash
     on an unparseable script exits 2, which this tier defines as GO FULL, so the cases "turned"
     because the judge would not start.
  2. The acceptance arm greped the WHOLE archived log for `bundle md5 <12 hex>`. That phrase occurs
     FOUR times in #534's log and only ONE is the log's own ref line - the other three are PROSE in
     gate 66's assertion text. `sort -u | tr -d '\n'` concatenated them into a 48-character string,
     so the arm answered GO FULL on every candidate and THE TIER COULD NOT EMIT A GREEN AT ALL,
     after paying the full battery first. Measured across all 131 archived logs: every log from #506
     to #534 names four distinct tokens. THE ARM WAS ADDED BY THAT SAME ROUND, to fix a false RED.
  3. A control under gates/cases/ reads `git config --get remote.origin.url` - which IS the real
     repository root - computes this run's own log path, links app.js at it, asserts nothing, and
     exits 0. Round 2 fixed that with a `[ -L ]` symlink guard. ROUND 3 DEFEATED THE GUARD WITH ONE
     CHARACTER: `ln` instead of `ln -s`, because -L is FALSE for a hard link and `>` truncates the
     inode it finds. Exit 0, CHECKS TIER GREEN, the sentence "the real tree was not touched" printed,
     app.js replaced by the tier's own log text. BOTH antagonists found it independently.
  4. The repair, bbc603f: the write is a RENAME now (it replaces the directory entry and never opens
     the old inode, so it cannot follow a link of either kind), with the guard as the reporter beside
     it; M21 and M30 measure the two separately. Plus eight further findings - a DIRECTORY at the log
     path suppressing the log while still greening; the base never checked against origin/main, so a
     changed BROWSER GATE two commits past main rode a green; the snapshot arm hard-refusing an
     honest tree and blaming a control for another session's doc write; both premise arms refusing on
     base-only state; and four verdict lines that contradicted themselves.

  5. THE FIFTH ROUND, ON THE ROUND-4 TREE, RETURNED THREE MORE P1s - and the two doors converged
     again. **DO NOT TREAT bbc603f AS NEARLY DONE.** Read these three before you plan anything:
       (a) THE JUDGE'S OWN TEMPORARY IS UNGUARDED. The write is `printf > "$LOGTMP"` then `mv`, and
           `$LOGTMP` is `gates/logs/.checks-<short>-<pid>.tmp`. The write-target arm checks `$OUT`
           and never `$LOGTMP`, and BOTH its components are published to a control for free by the
           judge itself - `$LOCK/pid` holds the pid and `$LOCK/log` holds the short sha. A control
           that asserts nothing symlinks app.js at that name and `>` follows it. Reproduced by both
           doors, with before and after md5s. It lands at EXIT 2 - a ROUTE, the weakest verdict this
           judge has - and afterwards the log file IS a symlink to app.js, so `cat`ting the log
           prints a perfect log and only `git status` says the bundle is gone. The grave classifier
           misses it BY ONE CHARACTER: it has `gates/logs/(\.suite\.lock|checks-)` and the
           temporary is `.checks-`.
       (b) A CONTROL REDIRECTS A LATER CONTROL'S OUTPUT INTO THE REAL TREE. `run_ctl` writes
           `>"$WORK/ctl-N.out"` and each control's cwd is `$WORK/cN`, so `$WORK` is
           `dirname "$PWD"`. A control pre-plants symlinks at every `$WORK/ctl-N.out` and the NEXT
           control's stdout is written through one. Reproduced: app.js replaced by the following
           control's stdout. THIS WAS INTRODUCED BY ROUND 4, in the fix that moved run_ctl off a
           command substitution to bound a backgrounded child.
       (c) THE SNAPSHOT HASHES THE NAMES OF UNTRACKED AND IGNORED PATHS, NOT THEIR BYTES. So a
           control can rewrite the CONTENT of any ignored file - including `gates/logs/534-all.log`,
           which is where this project keeps its gate-log evidence - and the run prints EXIT 0,
           CHECKS TIER GREEN and "the real tree was not touched". Reproduced. The README's
           "NOTHING IS EXCLUDED FROM IT" is true of the SET and false of the BYTES.
     Plus: a GLOBAL `core.hooksPath` escapes the grave classifier, which only knows the `.git/config`
     INI shape while `git config --global --list` emits `key.sub=value`; an empty directory at the
     temporary makes ONE run print BOTH `CHECKS TIER GREEN` and `CHECKS TIER RED` and leave no log;
     the entrance dirty-tree check is a TENTH false hard-refuse and fires on this tree TODAY; the
     self pin refuses when invoked by a relative path and prints `running=none`, an empty variable in
     a blob-id slot; and a new `.md` alone earns a green while being run by nothing.

**THE PATTERN IS THE DEFECT, NOT THE PATH, AND BOTH DOORS SAID SO INDEPENDENTLY: three of the five
rounds' P1s on this file are "the judge's own write lands somewhere else".** The remedy they
converged on is structural rather than another guard: create EVERY file the judge writes with
`mktemp` or `mkdir` - O_EXCL semantics, which cannot follow a link - rather than by a derived name a
control can compute, and never under a directory a control's cwd sits inside. Do that once and (a),
(b) and the empty-directory case go together. Then hash untracked and ignored CONTENT, not just the
name set. Then split the entrance dirty-tree check the way the snapshot arm is already split.

I DID NOT FIX THESE, AND THAT IS A DECISION RATHER THAN AN OMISSION. Three P1s arrived with no
remaining budget for a pair to read a sixth repair and no possibility of a suite today. A fix nobody
has read is exactly what cut line (c) exists to prevent, and four of the five rounds found their
defect IN THE PREVIOUS ROUND'S FIX - so patching three P1s unread, at speed, is the single most
reliable way to produce a sixth. A known-bad tree with the defects named and reproduced is worth more
to you than a tree with three hurried fixes in it.

A judge that has produced a P1 on FIVE consecutive adversarial reads is not ready to be the thing
that decides whether a push may skip the suite. The clock settled it too: cut line (d) forbids
starting a suite on a tree the pair has not read, and a fifth pair plus 113 minutes did not fit.

WHAT THE NEXT RUN DOES, in order. The hand-off job is
jobs/535-the-push-checks-tier-is-built-and-controlled-on-a-branch-and-held-after-four-adversarial-rounds-each-of-which-found-a-real-defect-2026-10-23
and it carries this list with the detail.

  1. `git fetch && git log -1 --oneline origin/main`. If main moved, rebase the branch onto it.
     Nothing on main conflicts: the branch ADDS three files that did not exist at a30fc59, appends
     eight rows to claude/stories/TEST-CASES.md and one to gates/build-numbers.tsv, and touches
     nothing else.
  2. Launch a blind pair on the branch head BEFORE the suite. A FIFTH pair was launched at 14:25Z on
     the round-4 tree so you inherit a read branch - its verdict is on the hand-off job and on
     flags/antagonist-a-535 and flags/antagonist-b-535. READ THAT FIRST. If it found a P1, fix it and
     owe another pair; if it was clean, you owe one short pair on your own rebase and no more.
  3. `bash gates/checks-tier-drive.sh fixed` must read 77 ok / 0 FAIL / 0 skipped with A1 green in
     about 350s.
  4. The subset run and the unit layer.
  5. ONE full suite under `CT_EXPECT='#530'`. The bundle is main's #530 artefact; gates.sh would
     otherwise default CT_EXPECT to the suite's NUMBER argument and redden mountcheck in about 90
     seconds. #524 lost sixteen minutes to exactly that.
  6. One fast-forward push.

THE BUILD NUMBER: #535 IS MINTED AND HAS STAMPED NOTHING. gates/build-numbers.tsv carries one
`minted` row for it and NO `built` row, because this run never ran gates/build.sh. Read
`gates/buildnum.sh stampable '#535'` and decide deliberately whether to land under #535 or mint your
own. Do not assume either way.

TWO RESIDUALS THE FOURTH ROUND NAMED AND THIS RUN DID NOT FIX, both on the carried job's knownLimits:
  - the three `return 2`s in the acceptance block fire with the real tree's lock held and BEFORE
    SNAP1, so there is a window in which tampering is neither detected nor reported;
  - a control whose entire output is one hand-typed `PASS` line is still credited. The contract
    cannot detect vacuity, and the README's "0 PASS is the tell" framing overreads what the regex
    buys. Both antagonist doors found this one, independently.

THREE THINGS THIS RUN MEASURED THAT ARE NOT ABOUT THE TIER AND THAT COST SOMEBODY ELSE TIME:
  - A `git clone` of this repository sets refs/remotes/origin/main from the SOURCE repository's LOCAL
    `main` branch - STALE in this container at 366428f (#526) - and NOT from the real origin/main. It
    gave me a sigpipe baseline twelve builds old and failed one A1 run outright. CHECK OUT SHAS
    EXPLICITLY in any clone. It is written into the sigpipe job's measurement recipe.
  - TWO OF THE SEVEN ROWS in the dashboard's `snapshots` collection are FRAGMENTS - 15 and 20 keys
    against 207 to 227, missing all eight required keys - and one of them was the NEWEST by `at`,
    which is the field the page sorts on. #535's own row is built from the newest COMPLETE row
    instead, so the newest is a full document again. The cause is untouched and is filed.
  - gates/regress/46-play.js:125 and :127 are the SAME MISTAKE ON TWO AXES: a dead `docScroll===0`
    conjunct and a `documentElement.scrollWidth` read, in an app whose scroller is `#root`. The
    second leaves the whole horizontal-overflow class - the one CLAUDE.md calls the real
    unrecoverable bug - untested. Both filed.

THE ROTATING AUDIT advanced TWICE this build, because the number of duty-4 passes equals the number
of ADVERSARIAL ROUNDS and not the number of runs. docs/rotating-audit-pointer is at
gates/regress/46-play.js:197. gates/regress/45-play-setup.js is FINISHED.
