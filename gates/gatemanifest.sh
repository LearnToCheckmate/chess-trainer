#!/usr/bin/env bash
# gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | floor | sigpipe [dir] | selftest
#   CT_BUILD=#NNN CT_RUNID=<your runId> gates/gatemanifest.sh sync 'what it covers'
#
# SET CT_BUILD AND CT_RUNID ON `sync` AND `retire`, OR THE ROW YOU WRITE IS UNATTRIBUTED [antagonist B's F8 on
# #461]. Both are read and neither was documented anywhere, so the DOCUMENTED happy path - following the usage
# line above - writes `unknown` into the build column and `unknown-run` into the who column. That is #454's own
# tell wearing different clothes: there, the register shipped with zero `minted` rows because the happy path had
# never been executed once; here the happy path executes and silently produces a worse row than the tool can
# write. The 47 seeded rows carry real values (461 / build__1790925639766) because they were written by a script
# that set them, not by following these instructions.
#
# THE EXPECTED-GATES CHECK. Shipped #461 for
# jobs/gates-green-does-not-assert-which-gates-RAN-so-a-deleted-gate-is-invisible-2026-10-01, found by
# antagonist B on #450 ("this is B's best finding and it is better than the fix it was reviewing").
#
# THE DEFECT IT CLOSES, in one sentence: gates.sh globs gates/regress/*.js, so it asserts that the gates PRESENT
# all passed and never that the gates that MATTER were present - a deleted, renamed or never-merged gate is
# indistinguishable from a gate that was never needed, and the suite still ends GATES GREEN.
#
# THE SHAPE, AND WHY IT IS NOT ONE SINGLE VERDICT. Two different failures need two different answers, and giving
# them the same answer is what makes a guard unusable:
#   MISSING  (state=required, file not on disk) -> HARD. Exit 1, and gates.sh refuses to run a single gate.
#            THIS SENTENCE READ "Nothing legitimate produces this: a gate only leaves the required set through
#            `retire`" AND IT IS FALSE. WITHDRAWN AT #462 [R18], measured by both antagonists independently.
#            A gate ALSO leaves the required set by a hand edit of two fields - state -> `absent` plus any
#            non-`-` note - and `retire`'s own refusal is bypassed by deleting the file first, because it only
#            refuses while [ -f "$REG/$g" ]. Antagonist A measured the whole bar for de-requiring the gate
#            CLAUDE.md calls the only cover for brilliancy explanations: delete the file, change one word, type
#            one character; check then exits 0 and the suite runs. So what protects the required set is the
#            COMMIT DIFF and a reviewer, NOT this tool, and the two must not be confused. The missing/absent
#            asymmetry is still worth having; what is withdrawn is the claim that it is mechanical.
#   UNLISTED (file on disk, no row at all)      -> SOFT. Exit 2. The suite still RUNS, because a build that adds
#            a gate must be able to run it, and a hard failure here would mean every new gate reddens its own
#            first suite. But it is NOT a silence either: the count goes in the log footer and
#            gates/verify-log.sh REFUSES a log carrying one, so a gate cannot reach main without a row.
# That asymmetry is the same one gates/verify-log.sh already draws between its default checks and --this-bundle,
# and for the same reason: a guard that fires on the normal case gets switched off.
#
#
# THE COMMITTED-SELF ANCHOR, ADDED HERE FOR
# jobs/the-gate-manifest-can-be-weakened-by-hand-and-only-git-can-object-2026-10-02 (antagonist B on #461,
# grounds F5 and F6; its baseline question was answered on the job by #467). Everything above this block
# compares the manifest against the TREE or against ITSELF, and B's point is that both of those are editable in
# the same breath as the edit: `grep -n git gates/gatemanifest.sh` returned one comment and no invocation, so
# deleting a row, commenting it out, or flipping `required` -> `absent` with the single character `x` as the
# reason all reached exit 0. The only baseline a hand edit cannot satisfy is the manifest's own committed copy.
#
# (1) WHICH BASELINE: origin/main, FALLING BACK TO HEAD, AND NOT CHECKED WHEN NEITHER RESOLVES. The job
#     recorded this as a dilemma - "every build that legitimately adds a gate reports a diff against main until
#     it pushes, which is the normal case, and a guard that fires on the normal case gets switched off" - and
#     that clause is false, which is why the choice is free. This is NOT A DIFF. It reports only rows that
#     VANISHED and rows whose state WEAKENED. Adding a gate ADDS a row: nothing vanishes and nothing weakens,
#     so the normal case is invisible to it. origin/main is therefore the baseline, because it also catches
#     weakening that already LANDED, which is the case HEAD is blind to and the case that matters. HEAD is the
#     fallback for a clone with no remote ref (a routine clone is shallow at --depth 50 and the remote-tracking
#     ref may not resolve) and the baseline that resolved is NAMED in the output, so a reader knows which
#     question was answered.
#
# (2) WHAT COUNTS AS WEAKENING, AND THE ONE EXEMPTION. required -> absent or required -> retired is weakening.
#     absent -> retired is not: the gate had already left. The exemption is keyed to the TOOL'S OWN TOKEN and
#     to the state, not to the presence of a reason, because "say something" is the bar #461 already set and
#     the single character `x` cleared it:
#       required -> retired  is exempt WHEN field 7 begins `RETIRED at `, which is the exact prefix the
#                            `retire` subcommand below writes and nothing else does. That keeps the legitimate
#                            door open - a real retire stays clean before it is committed.
#       required -> absent   has NO exemption, because no subcommand in this file ever writes `absent`. A row
#                            in that state is either seeded that way or was typed by hand, and the typed case
#                            is exactly #461's and #462's measured hole.
#     SAID PLAINLY, BECAUSE THE JOB'S OWN STANDARD IS THAT A GUARD MUST NOT BE TAKEN FOR MORE THAN IT IS: an
#     attacker who writes `RETIRED at 999 (2026-10-03, x): x` into field 7 of a retired row still passes. What
#     this closes is the cheap edit; what it raises the bar to is forging the tool's own token into a row that
#     then names a build and a runId a reader can check against the commit. It is a narrowing, not a closure,
#     and A's "fix the anchor, not the alphabet" still applies to field 7's CONTENT.
#
# (3) IT DEGRADES TO NOT CHECKED, NEVER TO A PASS, and never to a hard failure either. No git on PATH, the
#     script outside a work tree, or the manifest untracked at both refs prints `gate anchor: NOT CHECKED -
#     <why>` and leaves the exit code to the checks above. That is deliberate and it is the asymmetry this file
#     already draws twice: a run from a copied directory or a tree with no git is not a weakened manifest, and
#     a guard that reddens it gets switched off. NOT CHECKED is not a silence - it is a token in the output,
#     with no counts in it, so a consumer can refuse it.
#
# (4) WHAT IS NOT DONE HERE, AND IT IS THE HALF THAT REACHES THE PUSH GATE. The job's work item 5 says to put
#     the count in the `gate manifest:` summary line. THAT WOULD BREAK THE PUSH GATE: gates/verify-log.sh's
#     MANIRE is anchored at both ends over exactly eight fields, so a ninth field makes every log fail to parse
#     and be REFUSED. Measured on this tree, not inferred - the regex is at gates/verify-log.sh:331 and ends
#     `([0-9]+) unreadable$`. The anchor counts therefore go in a SEPARATE `gate anchor:` line, which gates.sh
#     already tees into the log because it prints this script's whole output, and which verify-log.sh ignores
#     because it greps `^gate manifest:`. So the count reaches the LOG but not the push GATE, and closing that
#     needs an arm in gates/verify-log.sh - a second file this run did not hold.
#
# WHAT THIS CANNOT DO, SAID HERE RATHER THAN DISCOVERED LATER [#419, "a gate log's footer cannot vouch for the
# file it was derived from"]. The summary line this script writes into the log is computed by this script, so
# verify-log.sh reading it back is reading a CLAIM, not an independent measurement - exactly as the PASS-count
# footer is. It cannot be otherwise: verify-log.sh is routinely run on archived logs with no matching tree on
# disk, so it has nothing to re-derive from. What this buys is that the claim now EXISTS and is checkable by
# anyone with the tree; what protects a log's provenance remains the suite lock, not anything in this file.
set -uo pipefail
G="$(cd "$(dirname "$0")" && pwd)"; M="$G/gate-manifest.tsv"; REG="$G/regress"
# THE REPOSITORY IS THE SCRIPT'S OWN PARENT, PINNED, AND NEVER WHAT THE ENVIRONMENT SAYS [#540, GMROOT part 1,
# jobs/gatemanifest-derives-its-root-with-git-c-so-an-inherited-git-dir-switches-off-the-gate-anchor-while-the-tier-still-prints-green-2026-10-22].
# This file used to find its repository with `git -C "$G" rev-parse --show-toplevel`, and `-C` does NOT override
# an inherited GIT_DIR or GIT_WORK_TREE - git hooks EXPORT GIT_DIR, so anything run from a pre-push or post-commit
# wrapper inherits one. Under that inheritance the three reads below answered for the OTHER repository, the manifest
# was "tracked at neither origin/main nor HEAD" there, and the gate anchor switched itself off with a NOT CHECKED
# line while every verdict around it stayed green. So every git call in this file now goes through GITP, which
# names the repository the way gates/gates.sh:1425 and :2418 do: the directory above gates/, with --git-dir and
# --work-tree set explicitly, so GIT_DIR and GIT_WORK_TREE cannot redirect it. WHAT THE PIN DOES NOT COVER, named
# rather than implied [#540, antagonist B's B-F5 and the fresh pair's A2-F3/B2-F1, all P3]: GIT_OBJECT_DIRECTORY.
# Measured on this script and on e8dd9cb's alike (git 2.43.0), at exit 0 both ways: pointed at an EXISTING EMPTY
# directory, `rev-parse --show-toplevel` still answers, only `cat-file -e` fails, and the anchor prints
# `NOT CHECKED - gates/gate-manifest.tsv is tracked at neither origin/main nor HEAD` - a true statement about
# git's answer that reads as a false one about the manifest, which IS tracked; pointed at a NON-EXISTENT directory
# the liveness test fails and the anchor prints the `no repository answers at ROOT/.git` reason below. Either way
# the anchor is off by one environment variable, which is the pre-existing shape and not this pin's regression;
# pointed at another repository holding the same objects it answers from those objects. GIT_INDEX_FILE,
# GIT_CEILING_DIRECTORIES, GIT_DISCOVERY_ACROSS_FILESYSTEM, GIT_NAMESPACE and GIT_ALTERNATE_OBJECT_DIRECTORIES read
# correctly under this pin (measured by B, A2 and B2). The first version of this block cited "<empty dir>" for the
# `no repository` reason and named GIT_INDEX_FILE beside it in the reason string; both were wrong and both fresh
# reviewers found it. A directory with no readable repository at ROOT/.git is otherwise the only way to reach NOT
# CHECKED here, which is what that outcome was written for.
ROOT="$(dirname "$G")"
# ── THE GIT REDIRECT VARIABLES ARE SCRUBBED, ONCE, HERE [#544, item (11) of
# directOpening_2026_10_28_batch4; the class sweep of
# jobs/gatemanifest-derives-its-root-with-git-c-so-an-inherited-git-dir-switches-off-the-gate-anchor-while-the-tier-still-prints-green-2026-10-22].
# `git -C <dir>` does NOT override an inherited GIT_DIR or GIT_WORK_TREE, so a hook, a wrapper or a parent
# process that exports one makes every git call in a script answer about ANOTHER repository - and #540 measured
# the consequence: the gate anchor read NOT CHECKED at exit 0 with every verdict around it green. #540 fixed
# that one file by PINNING --git-dir and --work-tree on each call. THE SCRUB IS THE OTHER HALF AND IT IS
# STRICTLY STRONGER: pinning cannot stop GIT_OBJECT_DIRECTORY, which redirects the OBJECT STORE rather than the
# repository, and that variable alone still switched the anchor off (that job's knownLimits 48b7b4ab6433ba59,
# P3). Removing the variables leaves each script's own root derivation - cwd, or the script's location - doing
# exactly what it did before, which is why this closes the hole without changing any selection.
# WHY IT IS SAFE: nothing in this project sets these deliberately. A caller that genuinely wants another
# repository passes a path, which still works.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES \
      GIT_NAMESPACE GIT_CEILING_DIRECTORIES GIT_COMMON_DIR GIT_DISCOVERY_ACROSS_FILESYSTEM 2>/dev/null || true
GITP=(git -C "$ROOT" --git-dir="$ROOT/.git" --work-tree="$ROOT")
CMD="${1:-check}"

# A missing manifest is reported as NOT CHECKED, never as a pass. Antagonist B's ground on #450's held register:
# "A guard whose absence is indistinguishable from its success is not a guard." Same rule, same file shape.
if [ ! -f "$M" ]; then
  echo "gate manifest: NOT CHECKED - no manifest at $M"
  echo "  This file is tracked on main. Its absence means a stale checkout or a deleted file, not an empty"
  echo "  manifest, and a green suite here says NOTHING about whether every expected gate was present."
  [ "$CMD" = "check" ] && exit 3
  exit 3
fi

# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# WHY THERE IS NOT ONE PIPE INTO `grep -q` IN THIS FILE, and it is the most expensive thing #461's antagonist
# pass found. ANTAGONIST A, VETO 1, UPHELD AND REPRODUCED.
#
# `printf '%s\n' "$listed" | grep -qx "$g"` looks exact and is FLAKY under `set -o pipefail` (line 30).
# `grep -q` exits the instant it matches; `printf` is then killed by SIGPIPE and exits 141; `pipefail` returns
# the RIGHTMOST NON-ZERO status, which is printf's 141 - so the pipeline reports failure WHILE GREP ITSELF
# RETURNED 0, i.e. while the row was found. MEASURED HERE, not inferred: an instrumented loop over the real
# manifest prints `PIPESTATUS=[141 0]` - printf 141, grep 0 - and A measured the end-to-end rate at about 2.4%
# of `check` runs under the load a gate suite itself creates, 0 when idle, which is exactly why no control saw
# it. A different random gate each time.
# WHAT IT COST, had it shipped: `check` marks a PRESENT, LISTED gate as UNLISTED, which is exit 2, which lets
# the suite run and then has gates/verify-log.sh REFUSE the log - so roughly one full 44-minute suite in forty
# would be refused by this project's own push gate, naming a gate that is demonstrably there. CLAUDE.md's rule
# is that a flaky assertion is worse than no assertion, and this one is worse again: the `sync` site appended a
# DUPLICATE `required` row on a false miss (A measured 8 spurious rows in 140 runs), corrupting the one file the
# whole mechanism rests on, via the command this tool tells you to run.
# THE FIX IS A HERESTRING, which has no pipe and therefore no SIGPIPE. If you add a membership test to this
# file, use `grep -qx "$x" <<<"$list"` and never `printf ... | grep -q`.
#
# "EVERY SITE BELOW USES ONE" - WITHDRAWN 2026-10-04 BY process-build-4__1791107333380, IN THE DOCUMENT THAT
# CARRIED IT [R18]. That sentence stood here for three days and was false: `sync` at the `d=` assignment piped
# `sed -n '2,6p'` into `grep -m1`, which is the same mechanism with a different flag - grep -m1 leaves the
# instant it matches, exactly as grep -q does. It is fixed in this commit. The claim is kept and marked rather
# than deleted, because a note asserting a property the file does not have is worse than no note: the next
# reader trusts it instead of looking, which is what happened here.
#
# AND THE CLASS IS NOW COUNTED RATHER THAN ASSERTED, which is the other half of
# jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02's own theFIX:
# "whoever fixes it should grep the WHOLE gates/ directory". `gatemanifest.sh sigpipe` does that, with a
# committed ceiling, and `selftest` runs it. MEASURED 2026-10-04 over all seven gates/*.sh: 44 pipes into grep,
# of which 10 have a reader that EXITS EARLY and so can orphan its writer. The classifier is the consequence
# and not the shape, because that is what decides whether a site is live:
#   TIER A  the pipeline's status DECIDES CONTROL FLOW (an `if`/`while` test). A false negative changes
#           behaviour. 1 site: gates/verify-log.sh:128, in the push gate's citation allow-list test.
#   TIER B  a `|| echo` fallback inside a command substitution, so the correct value AND the fallback are both
#           captured. 0 sites - this is the shape this job was filed for, fixed at gates.sh:167 at #477.
#   TIER C  masked by `|| true`. Benign for this class, and it also swallows a genuine error. 6 sites.
#   TIER D  status discarded, so latent until somebody reads $? or adds `set -e`. 2 sites after this commit.
# THE MECHANISM'S REAL DISCRIMINATOR IS INPUT SIZE, not load, and that is new: a writer whose output exceeds
# the 64 KiB pipe buffer is still writing when the reader leaves, so the failure is CERTAIN - measured 20 of 20
# at 200k lines, and 0 of 20 for the herestring form of the same test. Below the buffer it is a scheduling
# race: the exact shape at verify-log.sh:128 carries 127 bytes and read 0 of 2000 idle here, which is the same
# zero antagonist A measured before finding 2.4% under suite load. SO AN IDLE ZERO IS NOT EVIDENCE OF SAFETY -
# it is the reading the original defect also gave. Size tells you which sites are certain; only load tells you
# the rate for the rest.
# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
rows(){ grep -v '^[[:space:]]*#' "$M" | grep -v '^[[:space:]]*$'; }
diskgates(){ for f in "$REG"/*.js; do [ -e "$f" ] && basename "$f"; done | sort; }

# THE RANK IS A FUNCTION SO THE TWO CALLERS CANNOT DRIFT, and it takes its value as $1 and returns it on stdout
# rather than writing a shared name: #467's own build report records a defect in this very file caused by two
# functions sharing an unlocalised `gate`, so nothing here assigns to a caller's variable.
mstate_rank(){ case "$1" in required) echo 2;; absent|retired) echo 1;; *) echo 0;; esac; }

# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# THE GATE-REQUIRED FLOOR AND THE REQUIRED-SET DIGEST [#549 item (36), the remainder of
# jobs/468-the-floor-and-the-digest-fix-are-built-and-controlled-and-held-on-the-detector-they-added-2026-10-03].
# Built at #467 and #468 on branch claude/cool-noether-me7uq8 (c69a304) and NEVER LANDED; rebuilt here by hand
# onto a file that has since gained the committed-self anchor above. Read gates/gate-required-floor.tsv's header
# for the defect, the mechanism and the two residuals. WHAT THE FLOOR ADDS THAT THE ANCHOR DOES NOT, measured
# rather than argued, because the anchor makes half of the branch's case look overtaken:
#   (a) the anchor reads NOT CHECKED wherever git cannot answer (a copied tree, a throwaway selftest dir, an
#       object-store redirect) and then leaves the exit code to the checks above it - so in exactly those trees
#       the two-field de-require (`required` -> `absent`, any reason) is still exit 0. The floor needs no git.
#   (b) the anchor compares the tree against origin/main, so a weakening that has ALREADY LANDED is the baseline
#       and reads clean; the floor register remembers every value the suite has stood at.
#   (c) the SWAP (promote a known-absent row, de-require a real gate at constant count) is invisible to any count;
#       the digest is a function of the sorted required NAMES.
# AND ONE THING THE ANCHOR NOW GIVES THE FLOOR, which closes the branch's own named residual: the floor register
# cannot detect its own trailing truncation or a rewrite of row 1 ("a file cannot anchor itself" - antagonist A's
# cross-read item (a) on #468). `floor_anchor` below holds the register to its committed copy, by the same
# baseline rule the manifest anchor uses: the committed rows must be a PREFIX of the working rows.
#
# needids: both writing doors REFUSE before touching either file unless CT_BUILD and CT_RUNID are set [#467,
# antagonist B's F4/F8]. The floor register is append-only and a row is never deleted, so an `unknown-run` row in
# it would be permanent. It runs BEFORE any write so a refusal can never leave the manifest edited and the floor
# not (the half-applied write #467's first fix produced).
needids(){
  [ -n "${CT_RUNID:-}" ] && [ -n "${CT_BUILD:-}" ] && return 0
  echo "REFUSED: set CT_BUILD and CT_RUNID before writing either register."
  echo "    CT_BUILD=#NNN CT_RUNID=<your runId> gates/gatemanifest.sh $CMD ..."
  echo "  Both are read by this command and neither has a safe default. gates/gate-required-floor.tsv is"
  echo "  append-only and a row is never deleted, so an 'unknown-run' row in it is permanent and permanently"
  echo "  unattributable - which is why this is a refusal rather than the warning #461 left behind [B's F8/F4]."
  exit 1
}
FLOORF="$G/gate-required-floor.tsv"
# The digest of the SORTED REQUIRED GATE NAMES. No grep reads early here, so no SIGPIPE site [see above].
reqdigest(){
  rows | awk -F'\t' '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($2=="required") print $1}' | LC_ALL=C sort | sha256sum | cut -c1-12
}
nreq_now(){ rows | awk -F'\t' '{gsub(/[ \r]/,"",$2); if($2=="required") c++} END{print c+0}'; }

# floorread sets FLOOR, FLOORWHY, FLOORDIG, FLOORBAD, FLOORABSENT. FLOORBAD non-empty is NEVER a pass: with
# FLOORABSENT it is NOT CHECKED (exit 3), without it the register is CORRUPT (exit 1).
# EVERY LOOP VARIABLE IS local [#467: floorread once overwrote floorwrite's own `gate` and every row it wrote
# carried an empty field 8, which the next check refused].
# THE `|| [ -n "$line" ]` IS LOAD-BEARING: a last row with no trailing newline would otherwise be invisible, and
# the last row is the one that sets the floor.
floorread(){
  FLOOR=""; FLOORWHY=""; FLOORBAD=""; FLOORDIG=""; FLOORABSENT=""
  if [ ! -f "$FLOORF" ]; then FLOORBAD="no floor register at $FLOORF"; FLOORABSENT=1; return 0; fi
  local n=0 line cand trimmed stripped f pv k why gate mstate dig last="" lastdig=""
  while IFS= read -r line || [ -n "$line" ]; do
    # THREE CASES, SEPARATED, because conflating two of them was #467's antagonist A's 5.2: a row behind ONE
    # leading space was skipped as blank, with no FLOORBAD, and every structural test below was bypassed.
    #   empty or whitespace-only           -> genuinely blank, ignored
    #   first non-space character is `#`   -> a comment, but a commented-out ROW is a hidden lowering: HARD
    #   anything else that is indented     -> a row made invisible to the replay: HARD
    stripped="$(printf '%s' "$line" | tr -d '[:space:]')"
    [ -z "$stripped" ] && continue
    trimmed="$(printf '%s' "$line" | sed 's/^[[:space:]]*//')"
    case "$trimmed" in
      \#*)
        cand="$(printf '%s' "$trimmed" | sed 's/^#[[:space:]]*//')"
        case "$cand" in [0-9]*"	"*) FLOORBAD="a floor row is COMMENTED OUT: $(printf '%s' "$cand" | cut -c1-48)"; return 0;; esac
        continue;;
    esac
    if [ "$trimmed" != "$line" ]; then
      case "$trimmed" in [0-9]*"	"*) FLOORBAD="a floor row is INDENTED, which makes it invisible to the replay: $(printf '%s' "$trimmed" | cut -c1-48)"; return 0;; esac
      continue
    fi
    case "$line" in *"	"*) ;; *) FLOORBAD="unreadable floor row (no tab): $(printf '%s' "$line" | cut -c1-60)"; return 0;; esac
    f="$(printf '%s' "$line"  | cut -f1 | tr -d ' \r')"
    pv="$(printf '%s' "$line" | cut -f2 | tr -d ' \r')"
    k="$(printf '%s' "$line"  | cut -f3 | tr -d ' \r')"
    why="$(printf '%s' "$line" | cut -f7 | tr -d ' \r')"
    gate="$(printf '%s' "$line" | cut -f8 | tr -d ' \r')"
    dig="$(printf '%s' "$line" | cut -f9 | tr -d ' \r')"
    # BOUNDED TO SIX DIGITS [#467, antagonist A's 5.3]: an unbounded number reaches `test` as a >64-bit value,
    # which errors, and an error inside a comparison is a comparison that did not happen.
    case "$f" in ''|*[!0-9]*) FLOORBAD="floor value is not a number: '$f'"; return 0;; esac
    [ "${#f}" -le 6 ] || { FLOORBAD="floor value '$f' is more than six digits"; return 0; }
    # FIELD 9 IS VALIDATED AND THERE IS NO '-' SENTINEL [#468, antagonist B's veto F1]. On the branch, field 9
    # was the one field nothing checked: one character (`-`) on the seed row made the required-set comparison
    # UNREACHABLE WITH NO MESSAGE, `check` exited 0 and `selftest` still read 55/0; with field 1 also edited,
    # twenty gates could be deleted at exit 0. `-` meant "this register predates the digest" and no such
    # register can exist - this file's register is born, here, WITH its digest.
    case "$dig" in
      *[!0-9a-f]*|'') FLOORBAD="row $((n+1))'s required-set digest (field 9) is not 12 hex characters: '$dig'. There is no legitimate value other than a digest: the '-' sentinel was removed at #468 because it silently disabled the set check."; return 0;;
    esac
    [ "${#dig}" -eq 12 ] || { FLOORBAD="row $((n+1))'s required-set digest (field 9) is ${#dig} characters, not 12: '$dig'"; return 0; }
    n=$((n+1))
    if [ "$n" -eq 1 ]; then
      [ "$k" = seed ] || { FLOORBAD="the first floor row must be kind 'seed', not '$k'"; return 0; }
    else
      # THE CHAIN: row i's prev must be row i-1's floor, so an interior row cannot be removed or edited unseen.
      [ "$pv" = "$last" ] || { FLOORBAD="BROKEN CHAIN at row $n: its prev is '$pv' but the previous row's floor is '$last'"; return 0; }
      case "$k" in
        raise) [ "$f" -gt "$last" ] || { FLOORBAD="row $n is a 'raise' from $last to $f, which does not raise"; return 0; };;
        lower)
          # BY EXACTLY ONE, NAMING A GATE THE MANIFEST RECORDS AS `retired` [#467, antagonist B's F1 and F2]:
          # otherwise one retire absorbs twenty removals, and a hand-APPENDED row - neither an edit nor a
          # deletion, so the chain says nothing - lowers the floor at will.
          [ "$f" -eq $((last-1)) ] || { FLOORBAD="row $n lowers the floor $last -> $f; a lowering is by EXACTLY ONE (one gate leaves per row), so this row should read $((last-1))"; return 0; }
          if [ -z "$why" ] || [ "$why" = "-" ]; then FLOORBAD="row $n lowers the floor $last -> $f with no reason in field 7"; return 0; fi
          case "$gate" in
            ''|'-') FLOORBAD="row $n lowers the floor but names no gate in field 8; a lowering must say WHICH gate left"; return 0;;
            *.js) ;;
            *) FLOORBAD="row $n names '$gate' in field 8, which is not a .js gate file"; return 0;;
          esac
          mstate="$(rows | awk -F'\t' -v g="$gate" '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($1==g) print $2}' | sed -n '1p')"
          if [ "${mstate:-}" != "retired" ]; then
            FLOORBAD="row $n lowers the floor for $gate, but that gate's state in $(basename "$M") is '${mstate:-NO ROW AT ALL}', not 'retired'. Use: gates/gatemanifest.sh retire $gate 'why'"; return 0
          fi;;
        *) FLOORBAD="row $n has kind '$k', which is not seed/raise/lower"; return 0;;
      esac
    fi
    if [ "$k" = seed ]; then FLOORWHY="seeded at $f by build $(printf '%s' "$line" | cut -f5 | tr -d ' \r')"
    else FLOORWHY="$k $pv -> $f at build $(printf '%s' "$line" | cut -f5 | tr -d ' \r')"; fi
    last="$f"; lastdig="$dig"
  done < "$FLOORF"
  [ "$n" -eq 0 ] && { FLOORBAD="the floor register has no rows at all"; FLOORABSENT=1; return 0; }
  FLOOR="$last"; FLOORDIG="$lastdig"
}
# floorwrite <newfloor> <kind> <why> [gate] - appends ONE row, keeping the chain, with this tree's digest.
floorwrite(){
  local nf="$1" k="$2" why="$3" gate="${4:--}" DIG AT
  floorread
  [ -n "$FLOORBAD" ] && { echo "  REFUSING to write the floor register: $FLOORBAD"; return 1; }
  AT="$(date -u +%Y-%m-%d)"
  # A trailing newline is written first if the file lacks one, or this row would join the previous one.
  [ -n "$(tail -c1 "$FLOORF")" ] && printf '\n' >> "$FLOORF"
  DIG="$(reqdigest)"
  why="$(printf '%s' "$why" | tr '\t\n' '  ')"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$nf" "$FLOOR" "$k" "$AT" "${CT_BUILD#\#}" "$CT_RUNID" "$why" "$gate" "$DIG" >> "$FLOORF"
  echo "  floor register: $k $FLOOR -> $nf, required-set digest $DIG (build ${CT_BUILD#\#}, $CT_RUNID)"
}
# floor_anchor: the floor register's committed rows must be a PREFIX of its working rows. Sets FANCH_BASE,
# FANCH_WHY, FANCH_BAD. Degrades to NOT CHECKED (FANCH_BASE empty, FANCH_BAD empty) exactly as the manifest
# anchor does, and for its reason: a tree with no git is not a tampered register. Blank and comment lines are
# ignored on both sides, so only ROWS are compared.
floor_anchor(){
  FANCH_BASE=""; FANCH_WHY=""; FANCH_BAD=""
  local rel base_rows now_rows nb nn
  if ! command -v git >/dev/null 2>&1; then FANCH_WHY="git is not on PATH"; return 0; fi
  if ! "${GITP[@]}" rev-parse --show-toplevel >/dev/null 2>&1; then FANCH_WHY="no repository answers at $ROOT/.git"; return 0; fi
  [ -f "$FLOORF" ] || { FANCH_WHY="no floor register on this tree"; return 0; }
  rel="${FLOORF#"$ROOT"/}"
  if "${GITP[@]}" cat-file -e "origin/main:$rel" 2>/dev/null; then FANCH_BASE="origin/main"
  elif "${GITP[@]}" cat-file -e "HEAD:$rel" 2>/dev/null; then FANCH_BASE="HEAD"
  else FANCH_WHY="$rel is tracked at neither origin/main nor HEAD"; return 0; fi
  base_rows="$("${GITP[@]}" show "$FANCH_BASE:$rel" 2>/dev/null | awk '/^[[:space:]]*#/ {next} {s=$0; gsub(/[[:space:]]/,"",s); if(s!="") print}')"
  now_rows="$(awk '/^[[:space:]]*#/ {next} {s=$0; gsub(/[[:space:]]/,"",s); if(s!="") print}' "$FLOORF")"
  nb=$(printf '%s' "$base_rows" | grep -c . || true); nn=$(printf '%s' "$now_rows" | grep -c . || true)
  # A committed copy with no rows is not a baseline (and `sed -n 1,0p` would print line 1): NOT CHECKED.
  if [ "$nb" -eq 0 ]; then FANCH_WHY="the copy of $rel at $FANCH_BASE has no rows"; FANCH_BASE=""; return 0; fi
  if [ "$nn" -lt "$nb" ]; then
    FANCH_BAD="the register has $nn row(s) and its copy at $FANCH_BASE has $nb: $((nb-nn)) committed row(s) are GONE (a trailing truncation, which no chain can see from inside the file)"
  elif [ "$(printf '%s\n' "$now_rows" | sed -n "1,${nb}p")" != "$base_rows" ]; then
    FANCH_BAD="a row committed at $FANCH_BASE has been REWRITTEN in the working register (its first $nb row(s) differ from the committed ones; row 1 is the one no chain can protect)"
  fi
}

# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# THE SIGPIPE AUDIT. ONE FUNCTION, TWO CALLERS - the `sigpipe` subcommand and `selftest` - for the same reason
# mstate_rank is a function: two copies of a classifier drift, and this project has the measurement for it
# (R43's 449 field names). It takes the directory to scan as $1 so the controls can point it at a fabricated
# tree, which is what makes it falsifiable rather than merely green.
#
# IT PRINTS, ONE SITE PER LINE: tier TAB file TAB line number TAB the source line.
# IT IS A DETECTOR AND NOT A FIX. It cannot see a pipe built across two lines with a backslash, it reads
# `grep` and not `sed -n '1p'` or `awk 'NR==1{...;exit}'` which orphan a writer the same way, and it cannot
# tell a 127-byte writer from a 70 KiB one - which is the difference between a race and a certainty. Those
# three are its stated blind spots rather than discoveries waiting to be made.
sigpipe_sites(){
  # ── #530. THE TIER IS DECIDED ON THE LOGICAL LINE, NOT THE PHYSICAL ONE ─────────────────────────────────────
  # jobs/the-sigpipe-audit-files-a-pipeline-whose-status-a-continuation-line-reads-as-tier-d-so-the-race-that-reddened-h23-counted-as-latent-2026-10-20.
  # This classifier read ONE PHYSICAL LINE, so a pipeline ending in a backslash whose status is read by an `||`
  # or `&&` on the NEXT line was filed TIER D - status discarded, latent - when its status DECIDES CONTROL FLOW
  # and it is the banned TIER A shape. The one shape this audit exists to refuse passed it twice as harmless:
  # gates/records-gate.sh's membership test and gates/buildnum-selftest.sh's subject check, the first of which is
  # the pipeline the orchestrator measured taking SIGPIPE under load (2 of 36,000, and one false red of H23 in a
  # loop of 20). #527's P2 removed both SITES, so the COUNT is right on main; the CLASSIFIER was not changed by
  # it, and the next such site would be filed D again. That is what this fixes.
  # HOW, AND WHY IT CANNOT MOVE AN EXISTING VERDICT: the physical lines of one logical line are joined before the
  # tier test, the site keeps the line number of its FIRST physical line, and the same-line tests below are
  # applied to that first line EXACTLY as before - so every single-line site in this tree classifies identically
  # and the committed ceilings stay calibrated. Only a site with a REAL continuation can move, and it moves one
  # way: to A, when the continuation reads the status with `||`, `&&` or `then`. A continuation that genuinely
  # discards the status stays D, which is the second half of the control.
  local root="${1:-$G}" f n n0 line s tier early logical cont j sp_pipes
  for f in "$root"/*.sh; do
    [ -e "$f" ] || continue
    n=0
    while IFS= read -r line || [ -n "$line" ]; do
      n=$((n+1))
      s="${line#"${line%%[![:space:]]*}"}"
      case "$s" in '#'*) continue;; esac
      # ── #530. JOIN THE CONTINUATION LINES INTO THE LOGICAL LINE. `cont` holds only what came AFTER the first
      # physical line, so the same-line tests below can still be applied to `$line` alone and nothing that does
      # not continue is affected. The reads consume the continuation lines, so each logical line is visited once
      # and `n` stays the first physical line's number, which is what every existing site reference names.
      logical="$line"; cont=0; n0=$n
      while [ "${logical%\\}" != "$logical" ]; do
        IFS= read -r j || break
        n=$((n+1))
        logical="${logical%\\}$j"
        # ── #530. THE TEST IS THAT A CONTINUATION LINE *BEGINS* WITH THE OPERATOR, NOT THAT ONE APPEARS IN IT.
        # THE FIRST VERSION OF THIS CLAUSE ASKED WHETHER THE JOINED CONTINUATION TEXT *CONTAINED* `||`, `&&` or
        # `then`, AND IT PRODUCED A FALSE TIER A ON ITS FIRST RUN - caught by running the audit rather than by
        # reading it. gates/verify-log.sh's C8b control spans three physical lines, and its third carries
        # `$( cd "$R9" && bash gates/verify-log.sh --citations ... | grep -E ... | head -1 )`: that `&&` is
        # INSIDE a command substitution and joins `cd` to `bash`, so it does not read the pipeline's status at
        # all - the status is discarded into an argument, which is TIER D and what the base classifier said.
        # An operator that reads the PRECEDING pipeline's status has to sit at the START of the continuation,
        # because that is what binds it to the command before the backslash. That is also exactly the shape the
        # job's own control names (`|| echo z` on the next line) and the shape of the two real sites #527 removed.
        case "${j#"${j%%[![:space:]]*}"}" in '||'*|'&&'*|then*) cont=1;; esac
      done
      # THE EXEMPTION, AND IT EXISTS BECAUSE THE FIRST RUN OF THIS AUDIT CAUGHT ITS OWN CONTROLS. The controls
      # below MUST contain live instances of every tier - that is what makes them controls - and they live in
      # this file, so the detector read six of its own fixtures as real sites and refused the tree. That is
      # the "the check and the thing being checked are the same set" trap claude/stories/TEST-CASES.md's
      # TC-R50 names for the suite's own roster, reproduced here in one file. The red and the reason are kept
      # rather than repaired quietly, because an audit that cannot be pointed at itself is not one.
      # IT IS A LOUD TOKEN AND IT IS COUNTED. Anything could be silenced with a quiet exemption, so the token
      # is one nobody types by accident, it shows up in any diff, and the number of lines carrying it is
      # ratcheted against SP_FIXTURE_CEIL exactly as the sites are. A site hiding behind it is a site the
      # audit still reports, in its own tier.
      early=0
      # a reader that LEAVES EARLY: grep -q (any flag cluster containing q), grep -m1, or a head downstream
      # of the grep - in which case head is the one that leaves and grep is the writer that is killed.
      # ── THE PIPE TEST READS THE LINE WITH EVERY `||` MASKED [#545, item (66);
      # jobs/the-sigpipe-audits-herestring-exemption-is-defeated-by-an-or-chain-so-the-remedy-its-own-message-prescribes-creates-the-site-it-removes-2026-10-23].
      # `\|[[:space:]]*grep` also matched the SECOND bar of an `||`, so `grep -q x <<<"$a" || grep -q y <<<"$a"` -
      # two herestrings, no pipe, nothing that can be orphaned - was filed as a pipe into grep, and converting a real
      # `cmd | grep -q a || cmd | grep -q b` to herestrings (the remedy this audit's own refusal prescribes) left the
      # line flagged. An OR is not a pipe, so it is masked for detection only; the tier tests below still read the
      # real `||`. Control: the selftest fixture's line 18.
      sp_pipes="${logical//||/ ;OR; }"
      if [[ $sp_pipes =~ \|[[:space:]]*grep[[:space:]]+(-[A-Za-z]*q|-m[[:space:]]*1) ]]; then early=1; fi
      if [[ $sp_pipes =~ \|[[:space:]]*grep[^|]*\|[[:space:]]*head ]]; then early=1; fi   # both read the LOGICAL line [#530]
      [ "$early" = 1 ] || continue
      # THE EXEMPTION IS APPLIED HERE AND NOT EARLIER, and the first draft had it earlier, which is why the
      # fixture count read 11 instead of 8: a line that merely NAMES the token - the three lines of this
      # audit's own code and comment that have to spell it - was being reported as an exempt site. An
      # exemption that fires on a mention rather than on a match inflates the very number it is ratcheted
      # against, which would have let three real sites in behind it. Only a line that WOULD HAVE BEEN a site
      # can be exempt.
      case "$logical" in *SIGPIPE-FIXTURE*) printf 'X\t%s\t%s\t%s\n' "${f##*/}" "$n0" "$s"; continue;; esac
      # ── #530, CORRECTED ON ANTAGONIST A's UPHELD VETO V1. CLASSIFY ON THE LOGICAL LINE, NOT THE FIRST ONE.
      # THE DEFECT I SHIPPED AND A FOUND: the first version of this change widened DETECTION to the logical line
      # and left CLASSIFICATION on the first PHYSICAL line. So a pipeline into grep whose `|| echo` sits on the
      # CONTINUATION was detected and then classified off a line holding no operator at all - tier D. The new
      # cont test below only ever RAISES to A, so nothing recovered it, and TIER B IS THE ONE TIER WITH A
      # CEILING OF ZERO: the guard stopped being able to refuse the exact shape it exists for.
      # A's reproduction, which I ran myself before accepting it: a fixture holding
      # `P="$(printf "%s\n" "$v" \` then `  | grep -qxF "$n" || echo missing)"` reads TIER B at exit 1 under
      # d7a022b and read TIER D at exit 0 under my first version. A `|| true` across the same break moved C->D
      # the same way. My commit message for that change asserted the opposite twice - "it moves one way: to A" -
      # which was PROSE about intent, not a measurement: the run that found the false-positive direction never
      # ran the false-negative one. Withdrawn [R18].
      # So the same-line tests now read the joined logical line, exactly as detection does, and the detector and
      # the classifier are looking at the same object again.
      tier=D
      case "$logical" in *'|| true'*) tier=C;; esac
      case "$logical" in *'|| echo'*) tier=B;; esac
      case "${logical#"${logical%%[![:space:]]*}"}" in if\ *|while\ *|elif\ *|until\ *) tier=A;; esac
      # ── #530. THE CONTINUATION TEST, AND IT IS THE ONLY NEW WAY TO REACH A. It runs LAST, as the if/while test
      # does, because A is the strictest verdict. It fires only when there WAS a continuation (`cont` non-empty)
      # and that continuation reads the pipeline's status - `||`, `&&` or a `then`. The job's own control names
      # this shape: `printf x | grep -q y \` with `|| echo z` on the next line must be A, where the same text on
      # ONE line is B. The asymmetry is deliberate: the B and C verdicts were calibrated on same-line shapes that
      # a reader can see at a glance, and a status read around a line break is the shape that went unseen twice.
      [ "$cont" = 1 ] && tier=A
      # $n0, not $n: the site is reported at the FIRST physical line of its logical line, which is the line
      # number every existing reference to these sites names and the one a reader opens. The join loop above
      # advances $n past the continuations so the file is read once; reporting $n would silently move every
      # multi-line site's address, and this comment claimed $n0 before the code did [#530].
      printf '%s\t%s\t%s\t%s\n' "$tier" "${f##*/}" "$n0" "$s"
    done < "$f"
  done
}

# THE COMMITTED CEILINGS. A maximum, never an equality, so removing a site passes and only adding one fires -
# the shape that worked for gates/verify-log.sh's A4CEIL. Lower them in the same commit that fixes a site; the
# audit prints the number to commit, so it never has to be remembered.
SP_A_CEIL=1      # gates/verify-log.sh:128. Target 0. Needs that file's own artefact lock [R44].
                 # THE INTEGRATION RUN (#513) TRIED TO TIGHTEN THIS TO 0 AND PUT IT BACK, AND THE REASON IS
                 # WORTH MORE THAN THE CHANGE. The tightening looked free and correct: this batch's
                 # verify-log.sh payloads genuinely removed the site this comment names, so the audit reads
                 # A 0 on this tree against A 1 on main plus this file alone, and the instruction two lines
                 # above says to lower a ceiling in the commit that fixes its site. BUT RUNNING THE
                 # CONTROLS REFUSED IT: with SP_A_CEIL=0 the selftest's own tier-A control ("the TIER A
                 # ceiling REFUSES when it is exceeded", which drives a fabricated fixture holding 3 tier-A
                 # sites) goes RED with "the tier A ceiling did not refuse" - it is calibrated against this
                 # ceiling being 1, so moving the ceiling moves the control's own expected value. That is
                 # this project's "a threshold belongs to the instrument it was calibrated on" arriving one
                 # level up: the number and the control that proves the number are the same object. So the
                 # ceiling stays where its lane left it, the live count is 0 on this tree and is published
                 # as such, and the tightening is filed as a job together with the control repair it needs
                 # rather than taken here under a suite deadline. Found by running the controls, not by
                 # reading them [self-caught, #513].
SP_B_CEIL=0      # the shape that shipped a wrong push-gate verdict. There is no legitimate instance of it.
SP_TOTAL_CEIL=12   # #550 (jobs/gatemanifest-selftest-is-red-on-main-23-sigpipe-sites-against-a-ceiling-of-15-2026-11-11): 15 -> 12 in the commit that made eleven `grep | head -1` sites in verify-log.sh (10) and verify-log-selftest.sh (1) end in `| sed -n 1p`, which reads all its input and so cannot orphan its writer. The tree read 23 against 15; it reads 12.
                   # WAS: #527: 17 -> 15 in the commit that removed gates/records-gate.sh:94 and gates/buildnum-selftest.sh:419.
                   # RE-RATCHETED 9 -> 17 BY THE INTEGRATION RUN (#513), WITH THE REASON, which is what this
                   # audit's own refusal message demands ("Fix the new site, or raise SP_TOTAL_CEIL in this
                   # file WITH the reason"). READ WHY BEFORE READING IT AS A WEAKENING, because the number
                   # was ALREADY BREACHED ON ARRIVAL AND THAT IS THE FINDING: measured by a one-variable
                   # control, this file's own payload checked out ALONE onto pristine origin/main at b8b2153
                   # reads `total 14` against its committed ceiling of 9 and FAILS, with not one other
                   # payload of this batch present. So the ceiling was never run against the tree it was
                   # written on - the #454 shape, where the build-number register shipped with zero `minted`
                   # rows and the happy path had therefore never been executed once.
                   # THE BATCH'S OWN CONTRIBUTION IS +3, DECOMPOSED BY TIER RATHER THAN BY LINE, because a
                   # by-line diff of the two site lists is dominated by DRIFT - verify-log.sh and this file
                   # both grew, so 20 of the 23 "changed" lines are the same site at a new number, which is
                   # #399's moved-line trap. The counts do not drift:
                   #     base (main + this file alone)  A 1  B 0  C 6  D 7   total 14
                   #     head (this batch)              A 0  B 0  C 6  D 11  total 17
                   # So A -1, B 0, C 0, D +4. The D arrivals are verify-log.sh +2 and buildnum-selftest.sh
                   # +1, both pre-existing files this batch rewrites, and records-gate.sh +1, which is the
                   # only genuinely new file among them. AN EARLIER VERSION OF THIS COMMENT CLAIMED THE +3
                   # CAME FROM THREE NEW FILES INCLUDING buildnum-selftest.sh AND verify-log-selftest.sh;
                   # WITHDRAWN [R18] - `git cat-file -e origin/main:<path>` says both are already on main,
                   # and I had asserted it from the shape of the filename instead of asking the object
                   # store. BOTH HALVES ARE PUBLISHED BECAUSE A NET IS NOT A MEASUREMENT: the total got
                   # worse by 3 and the one tier that decides control flow got better by 1.
                   # WHAT THIS DOES NOT DO: it does not excuse a new site. 17 is the honest floor for C and
                   # D on this tree and the next run that adds one still fires.
                   # AND A SENTENCE THAT STOOD HERE IS WITHDRAWN AS FALSE [R18], CAUGHT BY #513's OWN
                   # ANTAGONIST A BEFORE THE PUSH. It read: "A and B, the two tiers that can produce a wrong
                   # verdict, are both 0 with ceilings of 0, so the guard that matters is STRICTLY TIGHTER
                   # than it arrived." THE LIVE COUNTS ARE 0, AND SP_A_CEIL IS 1, NOT 0 - it is 17 lines
                   # above this comment, in this same file, and the audit's own stdout prints "A 0
                   # (ceiling 1)" and then "CEILING CAN BE LOWERED: SP_A_CEIL=0" in the same run. So the
                   # file contradicted itself in two places seventeen lines apart, and the direction of the
                   # error OVERSTATED the guard.
                   # THE CONSEQUENCE, MEASURED BY THE ANTAGONIST WITH A SHARPER CONTROL THAN MINE: TIER A
                   # HAS ONE UNUSED SLOT. Defuse one TIER C site to hold the total at 17, then append a new
                   # TIER A site - the banned shape, a pipeline into `grep -q` whose status decides control
                   # flow - and the audit reports "A 1 (ceiling 1)" at EXIT 0 with no refusal and no advice
                   # line. My own attempt at that control was weaker and I record the difference: I appended
                   # a TIER A site WITHOUT holding the total down, so it refused on the TOTAL (18 > 17) and
                   # told me nothing about the A arm. Holding the other variable fixed is what made the
                   # control discriminate.
                   # SO THE TRUE STATEMENT IS: the guard is tighter on TOTAL and UNCHANGED on the one tier
                   # that can produce a wrong verdict, which still has a slot. Tightening SP_A_CEIL to 0 is
                   # the right fix and it reddens this file's own tier-A control, which is calibrated
                   # against the ceiling being 1 - the threshold and the control that proves it are the same
                   # object. Filed with the control repair it needs rather than taken here.
SP_FIXTURE_CEIL=13 # RAISED 9 -> 11 -> 13 AT #530, the second step for the two controls antagonist A's upheld veto
                   # V1 showed were missing (the B and C shapes across a continuation). Each adds ONE marked
                   # printf line, the one carrying a `| grep`; its partner line carries no grep and is no
                   # candidate. Declared here, in the commit that adds the lines, as the ratchet requires.
                   # WAS: RAISED FROM 9 TO 11 AT #530, IN THE COMMIT THAT ADDS THE TWO LINES, WITH THE REASON, which is
                   # what the instruction above this block prescribes for a ratchet that may only move with its
                   # cause. The two new lines are the printf lines that WRITE the continuation-line controls for
                   # jobs/the-sigpipe-audit-files-a-pipeline-whose-status-a-continuation-line-reads-as-tier-d-so-the-race-that-reddened-h23-counted-as-latent-2026-10-20:
                   # each carries a `| grep` inside a printf FORMAT STRING, so the audit reads it as a candidate
                   # exactly as it reads the heredoc controls beside it, and each is a specimen rather than a
                   # site. The REAL-TREE verdict is unchanged by the whole change - A 0, B 0, C 6, D 9, total 15,
                   # measured before and after - so this ceiling is the only number that moves.
                   # early-exit lines carrying SIGPIPE-FIXTURE. Eight are this file's own controls and the
                   # ninth is a quoted specimen inside a refusal message - which the audit flagged on its
                   # own next run, correctly, because a specimen and a site look identical to a text scan.
                   # That is the third time in one run that this audit caught its own source; the exemption
                   # covers a line that WOULD have been a site and is deliberately a specimen, and nothing
                   # else. Controls,
                   # which must hold live instances to be controls at all. Lines that merely NAME the token
                   # are not counted; the first draft counted them and read 11, which is recorded below.
                   # IF THIS NUMBER RISES, A REAL SITE IS HIDING.
sigpipe_audit(){
  local root="${1:-$G}" sites a b c d x tot
  sites="$(sigpipe_sites "$root")"
  a=$(grep -c '^A' <<<"$sites" || true); b=$(grep -c '^B' <<<"$sites" || true)
  c=$(grep -c '^C' <<<"$sites" || true); d=$(grep -c '^D' <<<"$sites" || true)
  x=$(grep -c '^X' <<<"$sites" || true)
  [ -n "$sites" ] || { a=0; b=0; c=0; d=0; x=0; }
  tot=$((a+b+c+d))
  echo "sigpipe audit: $tot early-exit pipe(s) into grep under pipefail - A $a (ceiling $SP_A_CEIL), B $b (ceiling $SP_B_CEIL), C $c, D $d, total ceiling $SP_TOTAL_CEIL; $x fixture line(s) exempt (ceiling $SP_FIXTURE_CEIL)"
  [ -n "$sites" ] && while IFS=$'\t' read -r t fl ln tx; do
    [ -n "$t" ] || continue
    echo "  TIER $t  $fl:$ln  $tx"
  done <<<"$sites"
  local rc=0
  if [ "$b" -gt "$SP_B_CEIL" ]; then echo "  REFUSED: a TIER B site exists. The correct value and the fallback are both captured - this is the defect gates.sh:167 shipped."; rc=1; fi
  if [ "$a" -gt "$SP_A_CEIL" ]; then echo "  REFUSED: TIER A count $a is above its ceiling $SP_A_CEIL. A pipeline whose status decides control flow may not orphan its writer."; rc=1; fi
  if [ "$tot" -gt "$SP_TOTAL_CEIL" ]; then
    echo "  REFUSED: total $tot is above the committed ceiling $SP_TOTAL_CEIL. Fix the new site, or raise SP_TOTAL_CEIL in this file WITH the reason."
    echo "  ONE BREACH IS ALREADY KNOWN AND IT IS NOT A SURPRISE [R45]: patches/proc-lane4-art-gates-verify-log-sh-2026-10-04,"
    echo "  parked 2026-10-04T04:02Z and not yet integrated, adds a TIER D site in its own citations selftest -"
    echo "    ( cd \"\$1\" && bash gates/verify-log.sh --citations 2>&1 | grep -E '^  \\(4\\) ' | head -1 )"   # SIGPIPE-FIXTURE: a QUOTED SPECIMEN inside a message, not code
    echo "  so landing it takes the total from 9 to 10. MEASURED by applying both payloads to one worktree at"
    echo "  842df1b, not predicted. Two patches from one lane, each correct alone and jointly over the ceiling,"
    echo "  which is R45's definition exactly. The ceiling is deliberately left at 9 - tight against the tree it"
    echo "  was measured on - rather than pre-raised to 10, because a ceiling set for a patch that may never"
    echo "  land silently permits a site nobody has seen. Whoever integrates that patch does ONE of two things:"
    echo "  make that line a herestring, or set SP_TOTAL_CEIL=10 naming this as the reason. Not both, and not"
    echo "  neither."
    rc=1
  fi
  if [ "$x" -gt "$SP_FIXTURE_CEIL" ]; then echo "  REFUSED: $x lines carry SIGPIPE-FIXTURE against a ceiling of $SP_FIXTURE_CEIL. The exemption is for this file's own controls and nothing else - a new one is a site in hiding."; rc=1; fi
  if [ "$rc" = 0 ]; then
    [ "$tot" -lt "$SP_TOTAL_CEIL" ] && echo "  CEILING CAN BE LOWERED: $tot of $SP_TOTAL_CEIL in use. Commit SP_TOTAL_CEIL=$tot so it cannot rise again."
    [ "$a" -lt "$SP_A_CEIL" ] && echo "  CEILING CAN BE LOWERED: SP_A_CEIL=$a."
  fi
  return $rc
}
# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

case "$CMD" in
check)
  MISSING=""; UNLISTED=""; ABSENT=""; BACK=""; UNJUSTIFIED=""; MALFORMED=0; DISABLED=""
  # ANTAGONIST A's VETO 2, DOOR 6, AND IT IS THE ONLY ONE OF HIS SIX THE #461 FIX DID NOT CLOSE. A row prefixed
  # with `#` is not a malformed row - it is NOT A ROW AT ALL, because rows() strips comments - so `required` fell
  # 47 -> 46 with NO warning, "0 missing", "0 unreadable" and exit 0. A proved it end to end through the real
  # gates.sh: GATES GREEN #461 with 29-draws appearing zero times in the log. A's own proposed invariant
  # (NREQ == NPRES - NUNL + NMISS) does NOT catch it, which I checked before relying on it: with both the row and
  # the file gone, 46 == 46 - 0 + 0 holds.
  # SO IT IS CAUGHT BY SHAPE INSTEAD: a comment line whose text, with the # and any spaces stripped, would parse
  # as a gate row - a filename ending .js followed by a TAB - is a DISABLED ROW, not documentation. The TAB is
  # what makes this safe: this file's header names 67-sel-cls-consumers.js and 50-drill-verdict-no-jump.js in
  # prose, followed by spaces and commas, so no real comment matches. Counted into the same `unreadable` field
  # rather than a ninth column, because it is the same thing from a reader's point of view - a row the tool
  # cannot use - and because a stable 8-field line is what gates/verify-log.sh parses strictly.
  # THE `|| [ -n "$line" ]` IS NOT DECORATION. Without it, a row appended with NO TRAILING NEWLINE makes `read`
  # return non-zero and the loop body never runs for it - so a commented-out row added by hand, which is exactly
  # what this loop exists to catch, would be INVISIBLE to it. gates/verify-log.sh learned this on held-trees.tsv
  # and records it as guard (i) on the same file shape; measured here before fixing: a `#`-prefixed row with no
  # final newline gave "46 required ... 0 unreadable" and exit 0.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in \#*|[[:space:]]*\#*) ;; *) continue;; esac
    cand="$(printf '%s' "$line" | sed 's/^[[:space:]]*#[[:space:]]*//')"
    case "$cand" in *.js"	"*) DISABLED="$DISABLED$(printf '%s' "$cand" | cut -f1)"$'\n'; MALFORMED=$((MALFORMED+1));; esac
  done < "$M"
  NREQ=0; NABS=0; NRET=0
  # Bound the row shape the way verify-log.sh bounds held-trees.tsv: a row somebody wrote meaning to require a
  # gate must never be skipped in silence, so a malformed one is counted and reported rather than ignored.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in *"	"*) ;; *) MALFORMED=$((MALFORMED+1)); continue;; esac
    g="$(printf '%s' "$line" | cut -f1 | tr -d ' \r')"
    s="$(printf '%s' "$line" | cut -f2 | tr -d ' \r')"
    case "$g" in *.js) ;; *) MALFORMED=$((MALFORMED+1)); continue;; esac
    present=0; [ -f "$REG/$g" ] && present=1
    # THE REASON IS LOAD-BEARING, AND I FOUND THAT OUT BY ATTACKING MY OWN GUARD. Measured before this was
    # here: deleting gates/regress/26-invariants.js and hand-editing its row's state from `required` to
    # `absent` gave "46 required, 46 present, 0 missing, 4 known-absent" and EXIT 0. So the whole mechanism -
    # "a gate can only leave in a commit that says why" - was defeated by a two-line edit that said nothing,
    # while `retire` (which refuses while the file is on disk and demands a reason) was the only guarded door.
    # An unguarded second door makes the guarded one decorative. So a row claiming a gate is GONE must carry a
    # reason in field 7, and one that does not is treated as MISSING - hard - rather than warned about: a row
    # that says a gate is absent without saying why does not get the benefit of the doubt. The commit diff is
    # still the real protection; this makes the diff say something.
    note="$(printf '%s' "$line" | cut -f7 | tr -d ' \r')"
    case "$s" in
      required) NREQ=$((NREQ+1)); [ $present -eq 1 ] || MISSING="$MISSING$g"$'\n';;
      absent|retired)
        [ "$s" = absent ] && NABS=$((NABS+1)) || NRET=$((NRET+1))
        if [ $present -eq 1 ]; then
          BACK="$BACK$g (row says $s)"$'\n'
        elif [ -z "$note" ] || [ "$note" = "-" ]; then
          UNJUSTIFIED="$UNJUSTIFIED$g (state $s, no reason in field 7)"$'\n'
        elif [ "$s" = absent ]; then
          ABSENT="$ABSENT$g"$'\n'
        fi
        ;;
      *) MALFORMED=$((MALFORMED+1));;
    esac
  done < <(rows)
  listed="$(rows | cut -f1 | tr -d ' \r' | sort -u)"
  for g in $(diskgates); do
    grep -qx "$g" <<<"$listed" || UNLISTED="$UNLISTED$g"$'\n'   # herestring, NOT a pipe - see the SIGPIPE note above
  done
  NMISS=$(printf '%s' "$MISSING" | grep -c . || true)
  NUNL=$(printf '%s' "$UNLISTED" | grep -c . || true)
  NPRES=$(diskgates | grep -c . || true)
  if [ -n "$UNJUSTIFIED" ]; then
    echo "MANIFEST ROW CLAIMS A GATE IS GONE AND GIVES NO REASON - treated as MISSING, not as an excuse:"
    printf '%s' "$UNJUSTIFIED" | sed 's/^/    /'
    echo "  A row whose state is absent or retired must say WHY in field 7. Without that, flipping a row from"
    echo "  required to absent silently removes a gate from the suite, which is the one thing this file exists"
    echo "  to prevent. Use:  gates/gatemanifest.sh retire <gate> 'the reason'"
  fi
  if [ -n "$MISSING" ]; then
    echo "MANIFEST MISSING GATE(S) - the suite cannot be trusted and must not report green:"
    printf '%s' "$MISSING" | sed 's/^/    /'
    echo "  Each of these has state=required in $M, so a previous commit asserted the suite needs it, and it is"
    echo "  not in $REG. Either restore the file, or retire the row ON PURPOSE and say why:"
    echo "      gates/gatemanifest.sh retire <gate> 'the reason'"
    echo "  Deleting the row instead makes the manifest agree with the deletion silently, which is the whole"
    echo "  defect this file exists to stop."
  fi
  if [ -n "$UNLISTED" ]; then
    echo "MANIFEST UNLISTED GATE(S) - present in $REG with no row in the manifest:"
    printf '%s' "$UNLISTED" | sed 's/^/    /'
    echo "  The suite still runs these. But verify-log.sh REFUSES a log that reports unlisted gates, so this"
    echo "  must be resolved before a push:  gates/gatemanifest.sh sync 'what they cover'"
    echo "  >> DO IT NOW, BEFORE THE SUITE RUNS. This is known at second two and the refusal lands at the PUSH,"
    echo "  >> so carrying on costs you the whole suite and then sends you back here [antagonist B's F9, #461]."
  fi
  if [ -n "$ABSENT" ]; then
    echo "KNOWN-ABSENT GATE(S) - recorded as not on this tree, NOT a failure, reported every run on purpose:"
    printf '%s' "$ABSENT" | sed 's/^/    /'
    echo "  A defect class with no gate on main is the thing that was previously invisible. Read the note column."
  fi
  if [ -n "$BACK" ]; then
    echo "MANIFEST ROW IS STALE - the file is present but its row says it is not:"
    printf '%s' "$BACK" | sed 's/^/    /'
    echo "  Promote it:  gates/gatemanifest.sh sync 'now on this tree'"
  fi
  if [ -n "$DISABLED" ]; then
    echo "MANIFEST ROW(S) COMMENTED OUT - a disabled row is not a removed gate, it is a hidden one:"
    printf '%s' "$DISABLED" | sed 's/^/    /'
    echo "  Prefixing a row with # does not make the gate optional, it makes the requirement INVISIBLE: the row"
    echo "  stops being counted and nothing says so. To remove a gate, use:"
    echo "      gates/gatemanifest.sh retire <gate> 'the reason'"
    echo "  which keeps the row and writes the reason into it, so the removal appears in a commit diff."
  fi
  if [ "$MALFORMED" -gt 0 ]; then
    # ANTAGONIST B's VETO F2 ON #461, UPHELD, AND IT IS THE WORST SHAPE A GUARD CAN HAVE. This was a WARNING and
    # nothing else: the count was NOT in the summary line, so it never reached the log footer and verify-log.sh
    # could not see it, and `check` exited 0. MEASURED by B and reproduced here: mangle the tabs on ONE required
    # row (or capitalise its state to `Required`) AND delete that gate, and the line that travels into the push
    # gate read "46 required, 46 present, 0 MISSING" and exit 0 - an AFFIRMATIVE statement that nothing was
    # missing, for a tree with a required gate gone. Not a silence: a false assurance, which is worse.
    # IT IS NOW HARD, not soft, and the reasoning is the asymmetry this file already draws. An UNLISTED gate is
    # soft because it happens every time a build legitimately adds a gate. A malformed row happens only when
    # somebody typed into this file wrongly: it is not a normal occurrence, it cannot block normal work, it is one
    # edit to fix, and while it stands the tool CANNOT KNOW what the suite requires. A row that says a gate is
    # gone without saying why gets no benefit of the doubt (above); a row that cannot be read at all gets less.
    echo "MANIFEST ROW(S) UNREADABLE - $MALFORMED row(s) could not be parsed, so what the suite requires is UNKNOWN:"
    echo "    (no tab separator, no .js in field 1, or a state that is not required/absent/retired)"
    echo "  Somebody wrote those rows meaning to require a gate. Until they are fixed this check cannot tell you"
    echo "  whether a gate is missing - and the count below EXCLUDES them, so it would understate `required`."
  fi
  # ── THE COMMITTED-SELF ANCHOR. See the block at the head of this file for the baseline decision, the one
  # exemption, and what this deliberately does NOT reach. Nothing below pipes into `grep -q`: every membership
  # test is a herestring or an awk pass, for the SIGPIPE reason recorded at the top of this file.
  ANCHOR_BASE=""; ANCHOR_WHY=""; VANISHED=""; WEAKENED=""; NVAN=0; NWEAK=0
  GITROOT=""
  if ! command -v git >/dev/null 2>&1; then
    ANCHOR_WHY="git is not on PATH"
  else
    # PINNED, not discovered: the repository is $ROOT or there is none. `rev-parse --show-toplevel` is kept only
    # as the liveness test of that pinned repository; its ANSWER is not consulted, because under an inherited
    # GIT_DIR an unpinned rev-parse answers for the wrong repository and that is the defect this replaces.
    if "${GITP[@]}" rev-parse --show-toplevel >/dev/null 2>&1; then GITROOT="$ROOT"; fi
    if [ -z "$GITROOT" ]; then
      ANCHOR_WHY="$G is not inside a git work tree: no repository answers at $ROOT/.git (a script run from a copied directory is the common case; a GIT_OBJECT_DIRECTORY naming a directory that does not exist does this to a .git that exists)"
    else
      MANIREL="${M#"$GITROOT"/}"
      if "${GITP[@]}" cat-file -e "origin/main:$MANIREL" 2>/dev/null; then
        ANCHOR_BASE="origin/main"
      elif "${GITP[@]}" cat-file -e "HEAD:$MANIREL" 2>/dev/null; then
        ANCHOR_BASE="HEAD"
      else
        ANCHOR_WHY="$MANIREL is tracked at neither origin/main nor HEAD, or the repository's objects could not be read (a GIT_OBJECT_DIRECTORY naming an existing empty directory does this to a manifest that IS tracked)"
      fi
    fi
  fi
  if [ -n "$ANCHOR_BASE" ]; then
    # Field 1 and field 2 of the baseline's rows, and field 7 of the WORKING row for the retire exemption.
    BASEPAIRS="$("${GITP[@]}" show "$ANCHOR_BASE:$MANIREL" 2>/dev/null \
      | grep -v '^[[:space:]]*#' | grep -v '^[[:space:]]*$' \
      | awk -F'\t' -v OFS='\t' 'NF>1{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); print $1,$2}' || true)"
    if [ -z "$BASEPAIRS" ]; then
      ANCHOR_BASE=""; ANCHOR_WHY="the baseline copy of $MANIREL read back with no rows in it"
    else
      NOWPAIRS="$(rows | awk -F'\t' -v OFS='\t' 'NF>1{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); print $1,$2,$7}')"
      while IFS="$(printf '\t')" read -r bg bs; do
        [ -n "$bg" ] || continue
        cur="$(awk -F'\t' -v g="$bg" '$1==g{print $2; exit}' <<<"$NOWPAIRS")"
        if [ -z "$cur" ]; then
          VANISHED="$VANISHED$bg (row was $bs at $ANCHOR_BASE; no row here at all)"$'\n'
          continue
        fi
        br="$(mstate_rank "$bs")"; cr="$(mstate_rank "$cur")"
        [ "$br" -gt 0 ] && [ "$cr" -gt 0 ] || continue
        [ "$cr" -lt "$br" ] || continue
        cnote="$(awk -F'\t' -v g="$bg" '$1==g{print $3; exit}' <<<"$NOWPAIRS")"
        case "$cur" in
          retired) case "$cnote" in "RETIRED at "*) continue;; esac;;
        esac
        WEAKENED="$WEAKENED$bg ($bs at $ANCHOR_BASE -> $cur here)"$'\n'
      done <<<"$BASEPAIRS"
      NVAN=$(printf '%s' "$VANISHED" | grep -c . || true)
      NWEAK=$(printf '%s' "$WEAKENED" | grep -c . || true)
    fi
  fi
  if [ -n "$VANISHED" ]; then
    echo "MANIFEST ROW(S) VANISHED SINCE $ANCHOR_BASE - the committed manifest has a row this tree does not:"
    printf '%s' "$VANISHED" | sed 's/^/    /'
    echo "  \"A ROW IS NEVER DELETED, which is the whole mechanism\" - gates/gate-manifest.tsv's own header. A"
    echo "  deleted row and a row commented out with a leading # are the same thing to every check in this file"
    echo "  except this one, because both stop being rows. To remove a gate, keep the row:"
    echo "      gates/gatemanifest.sh retire <gate> 'the reason'"
  fi
  if [ -n "$WEAKENED" ]; then
    echo "MANIFEST ROW(S) WEAKENED SINCE $ANCHOR_BASE - a gate this tree's own history requires is no longer required:"
    printf '%s' "$WEAKENED" | sed 's/^/    /'
    echo "  required -> absent is never written by this tool, so a row in that state was typed by hand, and a"
    echo "  reason in field 7 is not a substitute for the one door that records the removal:"
    echo "      gates/gatemanifest.sh retire <gate> 'the reason'    (which writes 'RETIRED at ...' and is exempt)"
  fi
  if [ -n "$ANCHOR_BASE" ]; then
    echo "gate anchor: $ANCHOR_BASE, $NVAN vanished, $NWEAK weakened"
  else
    echo "gate anchor: NOT CHECKED - $ANCHOR_WHY"
  fi
  NUNJ=$(printf '%s' "$UNJUSTIFIED" | grep -c . || true)

  # ── #549 item (36): THE FLOOR AND THE REQUIRED SET, COMPARED AND NEVER WRITTEN HERE [the block at the head of
  # this file]. `check` only compares: a tool that wrote its own floor and read it back as authority would be the
  # check and the thing being checked being the same object [#454].
  floorread
  floor_anchor
  FLOORTXT="NOT-CHECKED"; FLOORSUNK=""; NOWDIG="$(reqdigest)"; SETVERIFIED=0
  if [ -n "$FLOORBAD" ]; then
    if [ -n "$FLOORABSENT" ]; then echo "GATE-REQUIRED FLOOR: NOT CHECKED - $FLOORBAD"
    else echo "GATE-REQUIRED FLOOR REGISTER IS CORRUPT - $FLOORBAD"; fi
    echo "  The floor register bounds \`required\` from BELOW and pins the required SET. Without it this check"
    echo "  cannot tell a tree that needs $NREQ gates from one edited down to fewer. It is NOT a pass: the carrier"
    echo "  line below reads NOT-CHECKED and gates/verify-log.sh REFUSES a log carrying that token."
    echo "  Restore gates/gate-required-floor.tsv from main, or if a row is corrupt, fix the row - do NOT delete it."
  else
    FLOORTXT="$FLOOR"
    # THE SET CHECK FIRST: every breach of the count is a change of the set, but a SWAP changes the set at
    # constant count [#467, antagonist A's 5.1], so this is the stronger of the two.
    SETVERIFIED=1
    if [ "$NOWDIG" != "$FLOORDIG" ]; then
      FLOORSUNK=1
      echo "REQUIRED-SET DIGEST CHANGED WITH NO ROW IN THE FLOOR REGISTER:"
      echo "    register's last row: $FLOORDIG   this tree: $NOWDIG   ($NREQ required here, floor $FLOOR)"
      LEFTC="$(rows | awk -F'\t' '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($2!="required") print "      "$1" (now "$2")"}')"
      if [ -n "$LEFTC" ]; then
        echo "    gates NOT in the required set on this tree - if one LEFT, it is one of these (the candidate list,"
        echo "    not the diff: a digest cannot be run backwards to the names it came from):"
        printf '%s\n' "$LEFTC"
      fi
      echo "  The SET of gates this suite requires is not the set the register last recorded, and no row says why."
      echo "  EVERY change to the required set goes through a door that records it:"
      echo "      CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh sync '<what it covers>'      # a gate arrives"
      echo "      CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh retire <gate.js> '<why>'     # a gate leaves"
      echo "  A swap is BOTH, one row each. A build that added a row by hand, or landed a branch whose sync ran"
      echo "  before this register existed, runs sync now: it raises the floor and records the new set."
    fi
    if [ "$NREQ" -lt "$FLOOR" ]; then
      FLOORSUNK=1
      echo "GATE-REQUIRED FLOOR BREACHED - this tree requires FEWER gates than an accepted tree already did:"
      echo "    floor $FLOOR (set: $FLOORWHY), this tree requires $NREQ"
      echo "  A gate a previous commit asserted the suite needs has left the required set. The two-field edit that"
      echo "  does this - delete the file, flip the row to \`absent\`, type any reason - is exit 0 wherever the"
      echo "  committed-self anchor reads NOT CHECKED. If the removal is DELIBERATE, retire it, which lowers the"
      echo "  floor by one and records the gate by name:"
      echo "      CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh retire <gate.js> 'why it is going'"
      echo "  Appending a 'lower' row by hand will not work either: a lowering is by EXACTLY ONE and must name in"
      echo "  field 8 a gate whose manifest state is 'retired'. If the removal is not deliberate, restore the gate."
    fi
  fi
  if [ -n "$FANCH_BAD" ]; then
    FLOORSUNK=1
    echo "FLOOR REGISTER DIFFERS FROM ITS COMMITTED COPY - $FANCH_BAD"
    echo "  The register is append-only: a committed row is never removed or edited. This is the one attack its"
    echo "  own chain cannot see (deleting the LAST row leaves a consistent chain one step shorter, and row 1 has"
    echo "  no predecessor to chain to), so it is checked against git here. Restore it: git checkout -- gates/gate-required-floor.tsv"
  fi
  if [ -n "$FANCH_BASE" ]; then echo "floor anchor: $FANCH_BASE, committed rows intact$([ -n "$FANCH_BAD" ] && echo ' - NO, see above')"
  else echo "floor anchor: NOT CHECKED - $FANCH_WHY"; fi
  # ARITHMETIC, AT SECOND TWO [#467, antagonist B's F3]: a DUPLICATE row pads `required` back up over a deleted
  # gate, so the line contradicts itself. verify-log.sh has refused such a log since #461; this file never did,
  # so the suite ran its full length first.
  # THE STALE-ROW CASE IS SUBTRACTED, which the branch's version did not do: a row reading absent/retired whose
  # file IS present (BACK, reported above as STALE and fixed by `sync`) is counted present and not required, so
  # without this term an ordinary "a gate landed for a known-absent row, sync not yet run" tree would turn from
  # a soft report into a hard failure here. With it, the only thing left to make the line not add up is a
  # duplicate or otherwise double-counted required row, which is what this arm is for.
  ARITHBAD=""; NBACK=$(printf '%s' "$BACK" | grep -c . || true)
  if [ $(( NPRES - NUNL - NBACK + NMISS )) -ne "$NREQ" ]; then
    ARITHBAD=1
    echo "MANIFEST LINE DOES NOT ADD UP - so 'missing' does not mean what it says:"
    echo "    required($NREQ) should equal present($NPRES) - unlisted($NUNL) - stale($NBACK) + missing($NMISS) = $(( NPRES - NUNL - NBACK + NMISS ))"
    echo "  The usual cause is a DUPLICATE row: two rows naming one gate count twice toward required, padding the"
    echo "  count back up over a gate that has gone. Check:  gates/gatemanifest.sh list | awk '{print \$1}' | sort | uniq -d"
  fi
  REQSETTXT="$NOWDIG"; [ -n "$FLOORBAD" ] && REQSETTXT="NOT-CHECKED"
  # THE AFFIRMATIVE TOKEN [#468, antagonist A's cross-read item (c)]: printed ONLY on the path where the digest
  # comparison ran and matched, and gates/verify-log.sh REQUIRES it, so a skipped comparison reads as a MISSING
  # token rather than as the absence of a complaint. ITS PREFIX IS NOT `gate manifest:`, AND THAT IS A REPAIR TO
  # THE BRANCH THIS WAS PORTED FROM: there the token began `gate manifest:` and was printed BEFORE the carrier
  # line, so gates.sh's `grep -m1 '^gate manifest:'` took the TOKEN as MANI_LINE and wrote it into the footer
  # (468d-GREEN-SUPERSEDED-two-orphaned-assertions.log:4448 is the token, not the carrier), and verify-log.sh's
  # own grep -m1 read the token as the manifest line. A distinct prefix cannot be mistaken for the carrier.
  if [ "$SETVERIFIED" = 1 ] && [ "$NOWDIG" = "$FLOORDIG" ]; then
    echo "gate reqset: VERIFIED against the register ($NOWDIG)"
  fi
  # MALFORMED IS IN THIS LINE BECAUSE THIS LINE IS THE CARRIER. gates.sh copies it into the log footer and
  # gates/verify-log.sh reads it back; a count that is not here is invisible to the push gate [B's F2].
  # #549: TWO FIELDS APPENDED, the floor and the required-set digest - the only two not computed from the tree
  # alone, so the only two a log can be checked against after the tree has moved on. verify-log.sh parses both
  # shapes, and refuses the short one on a log footed #550 or later.
  echo "gate manifest: $NREQ required, $NPRES present, $NMISS missing, $NUNL unlisted, $NABS known-absent, $NRET retired, $NUNJ unjustified, $MALFORMED unreadable, $FLOORTXT floor, $REQSETTXT reqset"
  # VANISHED AND WEAKENED ARE HARD, for the reason the UNLISTED/MISSING asymmetry above already gives: neither
  # happens when a build legitimately adds a gate, so neither can fire on the normal case, and while one stands
  # the suite is covering less than this tree's own history says it must. A BREACHED floor, a CHANGED set, a
  # register that differs from its committed copy and a line that does not add up are hard for the same reason.
  { [ -n "$MISSING" ] || [ -n "$UNJUSTIFIED" ] || [ "$MALFORMED" -gt 0 ] || [ -n "$VANISHED" ] || [ -n "$WEAKENED" ] || [ -n "$FLOORSUNK" ] || [ -n "$ARITHBAD" ]; } && exit 1
  # A CORRUPT register is HARD (somebody wrote into it wrongly; while it stands nothing can say what the suite
  # requires). An ABSENT one is exit 3, NOT CHECKED, like an absent manifest: it does not wedge a diagnostic
  # run, and it cannot reach main because the NOT-CHECKED token makes verify-log.sh refuse the log.
  if [ -n "$FLOORBAD" ]; then
    [ -n "$FLOORABSENT" ] && exit 3
    exit 1
  fi
  [ -n "$UNLISTED" ] && exit 2
  exit 0
  ;;
floor)
  floorread
  if [ -n "$FLOORBAD" ]; then echo "gate-required floor: NOT CHECKED - $FLOORBAD"; exit 3; fi
  echo "gate-required floor: $FLOOR, required-set digest $FLOORDIG (last change: $FLOORWHY)"
  echo "  register: $FLOORF, $(awk '/^[[:space:]]*#/ {next} {s=$0; gsub(/[[:space:]]/,"",s); if(s!="") c++} END{print c+0}' "$FLOORF") row(s), append-only, chain-checked"
  exit 0
  ;;
sync)
  WHY="${2:-}"; [ -n "$WHY" ] || { echo "usage: gates/gatemanifest.sh sync 'what these gates cover / why they arrived'"; exit 1; }
  needids
  # THE FLOOR REGISTER IS READ BEFORE ANYTHING IS WRITTEN, so a corrupt register refuses the whole sync rather
  # than leaving rows in the manifest that no floor row records [#467's half-applied-write lesson]. An ABSENT
  # register does not block a sync: the rows are written and the absence is reported below.
  floorread
  if [ -n "$FLOORBAD" ] && [ -z "$FLOORABSENT" ]; then
    echo "REFUSED: the floor register is corrupt, so sync cannot record what it adds: $FLOORBAD"; exit 1
  fi
  B="${CT_BUILD:-unknown}"; WHO="${CT_RUNID:-unknown-run}"; AT="$(date -u +%Y-%m-%d)"
  listed="$(rows | cut -f1 | tr -d ' \r' | sort -u)"; n=0
  for g in $(diskgates); do
    if ! grep -qx "$g" <<<"$listed"; then   # herestring, NOT a pipe - a false miss here APPENDED A DUPLICATE ROW
      # HERESTRING, NOT A PIPE [the note at the top of this file, whose "every site below" claim this line
      # falsified]. `grep -m1` leaves on its first match and `sed` is then killed by SIGPIPE, so under
      # `set -o pipefail` (line 98) the substitution reports failure while grep returned 0 and $d is correct.
      # Nothing reads $? here today and this file does not `set -e`, so it is latent rather than live - stated
      # that way rather than dressed up as a shipped defect. What it is NOT is safe to leave: one `set -e`, or
      # one caller that tests the status, turns it into a `sync` that stops mid-loop AFTER appending rows to
      # the one file this whole mechanism rests on. The two downstream stages consume all of grep's single
      # line, so they cannot orphan anything and stay as a pipe.
      hdr="$(sed -n '2,6p' "$REG/$g")"
      d="$(grep -m1 '^//' <<<"$hdr" | sed 's|^//[ ]*||' | tr '\t' ' ' | cut -c1-88 || true)"
      [ -z "$d" ] && d="(no header comment)"
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$g" "required" "${B#\#}" "$AT" "$WHO" "$d" "$WHY" >> "$M"
      echo "  added $g as required (build ${B#\#}, $WHO)"; n=$((n+1))
    fi
  done
  # A row that says absent/retired while the file is here is promoted, in place, with the old state kept in note.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in *"	"*) ;; *) continue;; esac
    g="$(printf '%s' "$line" | cut -f1 | tr -d ' \r')"; s="$(printf '%s' "$line" | cut -f2 | tr -d ' \r')"
    case "$s" in absent|retired) [ -f "$REG/$g" ] || continue;; *) continue;; esac
    old="$(printf '%s' "$line" | cut -f7)"
    new="$(printf '%s' "$line" | awk -F'\t' -v OFS='\t' -v w="PROMOTED from $s at ${B#\#}: $WHY | was: $old" '{$2="required";$7=w;print}')"
    python3 - "$M" "$line" "$new" <<'PY'
import sys
p,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
t=open(p).read()
assert t.count(old+"\n")==1, "row not unique"
open(p,'w').write(t.replace(old+"\n",new+"\n"))
PY
    echo "  promoted $g from $s to required"; n=$((n+1))
  done < <(rows)
  [ "$n" -eq 0 ] && echo "nothing to sync: every gate in $REG already has a row"
  # RAISE THE FLOOR TO WHAT THIS TREE NOW REQUIRES [#467]. sync is the only door that ADDS required rows, so it is
  # the only door that raises the floor; `check` never writes. Re-read rather than computed from $n, because $n
  # counts promotions too. ALSO THE REMEDY for a tree whose rows arrived without this door (a hand-added row, or
  # a branch rebased under this register): a run with nothing to add still records the larger set.
  NREQNOW=$(nreq_now)
  floorread
  if [ -n "$FLOORBAD" ]; then
    echo "  floor register NOT UPDATED: $FLOORBAD"
    [ -n "$FLOORABSENT" ] || exit 1
  elif [ "$NREQNOW" -gt "$FLOOR" ]; then
    floorwrite "$NREQNOW" raise "${WHY}" "-" || exit 1
  elif [ "$(reqdigest)" != "$FLOORDIG" ]; then
    # The SET moved and the COUNT did not: a gate left as this one arrived [#467, A's 5.1]. sync is the arriving
    # door only; the leaving gate goes through retire so the register says which one.
    echo "  floor register NOT UPDATED, and this tree will not check clean."
    echo "    the required SET has changed but the COUNT has not ($NREQNOW, floor $FLOOR), so a gate left as this"
    echo "    one arrived. Retire the one that left, by name, so the register records both halves:"
    echo "        CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh retire <gate.js> 'why it is going'"
    echo "    A swap is two rows, one per door. That is what makes the register a record rather than a tally."
    exit 1
  else
    echo "  floor register unchanged at $FLOOR (this tree requires $NREQNOW)"
  fi
  exit 0
  ;;
retire)
  g="${2:-}"; WHY="${3:-}"
  [ -n "$g" ] && [ -n "$WHY" ] || { echo "usage: gates/gatemanifest.sh retire <gate.js> 'why it is going'"; exit 1; }
  needids
  ALLROWS="$(rows | cut -f1 | tr -d ' \r')"
  grep -qx "$g" <<<"$ALLROWS" || { echo "no row for $g in $M"; exit 1; }   # herestring; the pipe form made a legitimate retire fail
  if [ -f "$REG/$g" ]; then
    echo "REFUSED: $REG/$g is still on disk. Retire the ROW only when the gate is actually going, and in the"
    echo "  same commit, so the diff shows the file leaving and the reason arriving together."
    exit 1
  fi
  # THE FLOOR IS CHECKED BEFORE THE MANIFEST IS WRITTEN, so both refusals below leave BOTH files untouched
  # [#467's half-applied write]. ONE GATE LEAVES PER ROW [#467, antagonist B's F1]: if the tree is already more
  # than one gate below the floor, this retire cannot account for the rest, and lowering the floor to whatever
  # the tree requires is the hole that let one row absorb twenty removals.
  floorread
  if [ -n "$FLOORBAD" ] && [ -z "$FLOORABSENT" ]; then
    echo "REFUSED: the floor register is corrupt, so this retirement cannot be recorded: $FLOORBAD"; exit 1
  fi
  if [ -z "$FLOORBAD" ]; then
    # What `required` will be after this row goes: one fewer only if the row is `required` now.
    GSTATE="$(rows | awk -F'\t' -v g="$g" '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($1==g) print $2}' | sed -n '1p')"
    NREQAFTER=$(nreq_now); [ "$GSTATE" = required ] && NREQAFTER=$((NREQAFTER-1))
    if [ "$NREQAFTER" -lt $((FLOOR-1)) ]; then
      echo "REFUSED: FLOOR NOT LOWERED, and nothing was written."
      echo "    floor $FLOOR; after retiring $g this tree would require $NREQAFTER, so $((FLOOR-NREQAFTER)) gate(s) have left"
      echo "    the required set and this is ONE retirement. A lowering is by exactly one, so the register's row count"
      echo "    is the number of retirements and cannot be made to stand for more. The others that have left:"
      rows | awk -F'\t' -v reg="$REG" -v me="$g" '{gsub(/[ \r]/,"",$1); gsub(/[ \r]/,"",$2); if($1!=me && $2=="absent" && system("[ -f \""reg"/"$1"\" ]")!=0) print "      "$1" (state absent, file gone)"}' | sed -n '1,8p'
      echo "  Restore them, or put each back to required and retire it by name, one row each."
      exit 1
    fi
    # AND THE TREE MUST BE AT ITS RECORDED STATE BEFORE ONE GATE LEAVES IT. A retire writes a `lower` row carrying
    # the digest of the set it leaves behind, so if the set ALREADY differs from the register's last row - a swap
    # pending, a hand-flipped row, or rows added with no sync - this retire would record that difference as though
    # it were the retirement, which launders it. #467's version had that hole; it is closed by refusing.
    if [ "$(nreq_now)" -ne "$FLOOR" ] || [ "$(reqdigest)" != "$FLOORDIG" ]; then
      echo "REFUSED: the required set on this tree ($(nreq_now) gates, digest $(reqdigest)) is not the one the floor"
      echo "  register last recorded ($FLOOR gates, digest $FLOORDIG), so this retirement cannot be recorded as ONE"
      echo "  gate leaving. Nothing was written. If gates ARRIVED, record them first:"
      echo "      CT_BUILD=#NNN CT_RUNID=<runId> gates/gatemanifest.sh sync '<what they cover>'"
      echo "  If a row was flipped to absent by hand, put it back to required; then retire it by name."
      exit 1
    fi
  fi
  B="${CT_BUILD:-unknown}"; WHO="${CT_RUNID:-unknown-run}"; AT="$(date -u +%Y-%m-%d)"
  line="$(rows | grep -P "^\Q$g\E\t" | sed -n '1p')"   # sed -n 1p reads the whole stream; head -1 would SIGPIPE the grep
  new="$(printf '%s' "$line" | awk -F'\t' -v OFS='\t' -v w="RETIRED at ${B#\#} ($AT, $WHO): $WHY" '{$2="retired";$7=w;print}')"
  python3 - "$M" "$line" "$new" <<'PY'
import sys
p,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
t=open(p).read()
assert t.count(old+"\n")==1, "row not unique"
open(p,'w').write(t.replace(old+"\n",new+"\n"))
PY
  # LOWER THE FLOOR, BY THE ONLY DOOR THAT MAY [#467]. Without this the guard deadlocks: a legitimate retire
  # would leave the tree below the floor and the first honest retirement would need a hand edit of the register.
  if [ -n "$FLOORBAD" ]; then
    echo "  floor register NOT UPDATED: $FLOORBAD"
  else
    # The pre-check above guarantees the tree stood at exactly FLOOR before this row went, so it now stands at
    # FLOOR-1 unless the row was not `required` to begin with (retiring an `absent` row), when nothing moves.
    NREQNOW=$(nreq_now)
    if [ "$NREQNOW" -eq $((FLOOR-1)) ]; then
      floorwrite "$NREQNOW" lower "retire $g at ${B#\#} ($WHO): $WHY" "$g" || exit 1
    else
      echo "  floor register unchanged at $FLOOR ($g was not a required gate, so the required set did not move)"
    fi
  fi
  echo "retired $g. The row stays in $M with the reason; commit this together with the file's removal."
  exit 0
  ;;
list)
  printf '%-40s %-9s %-6s %s\n' GATE STATE BUILD NOTE
  rows | while IFS= read -r line || [ -n "$line" ]; do
    printf '%-40s %-9s %-6s %s\n' "$(printf '%s' "$line" | cut -f1)" "$(printf '%s' "$line" | cut -f2)" "$(printf '%s' "$line" | cut -f3)" "$(printf '%s' "$line" | cut -f7 | cut -c1-70)"
  done
  exit 0
  ;;
sigpipe)
  # THE WHOLE-DIRECTORY AUDIT AS A COMMAND, which is the half of
  # jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02's theFIX that
  # was never done: "whoever fixes it should grep the WHOLE gates/ directory for `| grep -` under pipefail
  # rather than only this line." Takes an optional directory so it can be pointed at a fabricated tree.
  # EXIT 0 clean, 1 if a ceiling is breached. NOTHING INVOKES THIS YET and that is stated rather than hidden:
  # gates/gates.sh runs `gatemanifest.sh check` and not this, so it is a check a reader must type. Wiring it
  # in is a gates/gates.sh edit and that file was not this run's claimed artefact [R44]; the gap is routed on
  # jobs/five-cited-harness-files-are-unreachable-by-every-suite-run-2026-10-04, which is the same class.
  sigpipe_audit "${2:-$G}"
  exit $?
  ;;
selftest)
  # ITS CONTROLS AS A COMMAND RATHER THAN A PARAGRAPH, following gates/buildnum-selftest.sh (#454). Every case
  # runs against a THROWAWAY COPY of the manifest and regress dir, so it can never touch the real ones.
  T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
  mkdir -p "$T/regress"; cp "$M" "$T/gate-manifest.tsv"; cp "$0" "$T/gatemanifest.sh"; chmod +x "$T/gatemanifest.sh"; cp "$M" "$T/kept2.tsv"
  # #549 item (36): THE FLOOR REGISTER IS COPIED TOO, or every case below reads "floor NOT CHECKED" and exits 3
  # instead of the code it asserts [#467 measured sixteen controls reddening for that reason]. The copy also means
  # the floor cases append rows to a throwaway and never to the register this repository ships.
  [ -f "$FLOORF" ] && cp "$FLOORF" "$T/gate-required-floor.tsv"; cp "$T/gate-required-floor.tsv" "$T/keptfloor.tsv" 2>/dev/null || true
  for f in "$REG"/*.js; do [ -e "$f" ] && : > "$T/regress/$(basename "$f")"; done
  pass=0; fail=0
  # RESET ALL THREE SURFACES [#467]: a case that deletes a stub to breach the floor otherwise leaves a MISSING
  # gate behind, which outranks the floor, and every later control fails for a reason other than its subject.
  resetT(){
    cp "$T/kept2.tsv" "$T/gate-manifest.tsv"
    cp "$T/keptfloor.tsv" "$T/gate-required-floor.tsv" 2>/dev/null || true
    rm -f "$T"/regress/*.js
    for f in "$REG"/*.js; do [ -e "$f" ] && : > "$T/regress/$(basename "$f")"; done
  }
  ck(){ local want="$1" desc="$2"; shift 2; local out rc
    out="$("$@" 2>&1)"; rc=$?
    if [ "$rc" = "$want" ]; then echo "PASS selftest: $desc (exit $rc)"; pass=$((pass+1));
    else echo "FAIL selftest: $desc — wanted exit $want, got $rc"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi; }
  # 1. the control that proves the whole thing: a clean tree is clean.
  ck 0 "a complete tree checks clean" "$T/gatemanifest.sh" check
  # 2. THE DEFECT THE JOB WAS FILED FOR. Delete a required gate -> hard fail. Today, without this, green.
  rm -f "$T/regress/26-invariants.js"
  ck 1 "a DELETED required gate is a hard failure" "$T/gatemanifest.sh" check
  cp /dev/null "$T/regress/26-invariants.js"
  ck 0 "restoring it clears the failure" "$T/gatemanifest.sh" check
  # 3. a RENAMED gate must fail too - it is a deletion plus an unlisted arrival, and the deletion is what matters.
  mv "$T/regress/29-draws.js" "$T/regress/29-draws-renamed.js"
  ck 1 "a RENAMED required gate is a hard failure" "$T/gatemanifest.sh" check
  mv "$T/regress/29-draws-renamed.js" "$T/regress/29-draws.js"
  # 4. an UNLISTED new gate is soft (exit 2), not hard: a build adding a gate must still be able to run it.
  : > "$T/regress/99-brand-new.js"
  ck 2 "an UNLISTED new gate is soft (exit 2), so the suite can still run" "$T/gatemanifest.sh" check
  rm -f "$T/regress/99-brand-new.js"
  # 5. missing beats unlisted when both are true, because the hard case must win.
  rm -f "$T/regress/26-invariants.js"; : > "$T/regress/99-brand-new.js"
  ck 1 "MISSING outranks UNLISTED when both hold" "$T/gatemanifest.sh" check
  cp /dev/null "$T/regress/26-invariants.js"; rm -f "$T/regress/99-brand-new.js"
  # 6. a vanished manifest is NOT CHECKED (exit 3), never a pass.
  mv "$T/gate-manifest.tsv" "$T/kept.tsv"
  ck 3 "a MISSING manifest is NOT CHECKED, not a pass" "$T/gatemanifest.sh" check
  mv "$T/kept.tsv" "$T/gate-manifest.tsv"
  # 7. a malformed row is counted and reported, not skipped in silence.
  printf 'junkrow-no-tab\n' >> "$T/gate-manifest.tsv"
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  # STRENGTHENED AFTER B's F2: the first version of this case asserted only that a WARNING printed, which is
  # what let the de-requirement through. It now checks all three things that have to be true - the row is
  # named, the count REACHES THE SUMMARY LINE (the carrier verify-log.sh reads), and the exit code is hard.
  if grep -q 'UNREADABLE' <<<"$out" && grep -q '1 unreadable' <<<"$out" && [ "$rc" = 1 ]; then
    echo "PASS selftest: an unreadable row is reported, counted in the summary line, and exits 1"; pass=$((pass+1));
  else echo "FAIL selftest: an unreadable row did not reach the summary line or did not exit 1 (rc=$rc)"; fail=$((fail+1)); fi
  python3 - "$T/gate-manifest.tsv" <<'PY'
import sys
p=sys.argv[1]; t=open(p).read().replace("junkrow-no-tab\n","")
open(p,'w').write(t)
PY
  # 8. retire REFUSES while the file is still there, so a row cannot be softened ahead of the deletion.
  ck 1 "retire refuses while the gate is still on disk" "$T/gatemanifest.sh" retire 26-invariants.js "testing"
  # 9. retire works once the file is gone, and the row SURVIVES carrying the reason.
  rm -f "$T/regress/26-invariants.js"
  # CT_BUILD AND CT_RUNID SINCE #549 item (36): both writing doors now REFUSE without them, because the floor
  # register is append-only and an 'unknown-run' row in it is permanent. The assertion is unchanged.
  ck 0 "retire works once the gate is gone" env CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" retire 26-invariants.js "selftest reason"
  if grep -q 'RETIRED at .*selftest reason' "$T/gate-manifest.tsv" && grep -qc '26-invariants' "$T/gate-manifest.tsv"; then
    echo "PASS selftest: the retired row stays in the file, carrying its reason"; pass=$((pass+1))
  else echo "FAIL selftest: the retired row did not keep its reason"; fail=$((fail+1)); fi
  # 10. and a retired gate no longer reddens the check.
  ck 0 "a retired gate no longer reddens the check" "$T/gatemanifest.sh" check
  # 11. THE HOLE THIS BUILD'S OWN ANTAGONIST PASS FOUND. Flipping required->absent by hand, with no reason, used
  #     to give exit 0 and quietly shrink the suite. It is now exit 1.
  rm -f "$T/regress/29-draws.js"
  python3 - "$T/gate-manifest.tsv" <<'PY2'
import sys
p=sys.argv[1]; t=open(p).read()
t=t.replace("29-draws.js\trequired","29-draws.js\tabsent",1)
# strip the reason the way a hand edit that says nothing would
ls=t.split("\n")
for i,l in enumerate(ls):
    if l.startswith("29-draws.js\tabsent"):
        f=l.split("\t"); f[6]="-"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PY2
  ck 1 "flipping a row to absent WITH NO REASON is still a hard failure" "$T/gatemanifest.sh" check
  # 12. #549 item (36) REVERSED THIS CASE'S VERDICT ON PURPOSE, SO READ WHY BEFORE "FIXING" IT BACK. As written at
  #     #461 it asserted exit 0 - "the same flip WITH a reason is accepted" - and that contract WAS the defect: a
  #     hand flip from `required` to `absent` with any reason is the two-field edit that de-requires a gate, and
  #     $T is not a git work tree, so the committed-self anchor reads NOT CHECKED here and cannot object. The
  #     floor catches it. The discrimination case 11 was built for is KEPT and moved to the MESSAGE: a
  #     reasonless row is UNJUSTIFIED, a well-formed one is a FLOOR BREACH.
  python3 - "$T/gate-manifest.tsv" <<'PY3'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("29-draws.js\tabsent"):
        f=l.split("\t"); f[6]="lives on branch X, see job Y"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PY3
  ck 1 "the same flip WITH a reason is NOW hard too - the floor catches it where the anchor cannot run [#549, was exit 0 at #461]" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'FLOOR BREACHED' <<<"$out" && ! grep -q 'GIVES NO REASON' <<<"$out"; then
    echo "PASS selftest: a well-formed de-requiring flip is caught by the FLOOR, not by the reason check"; pass=$((pass+1))
  else echo "FAIL selftest: the two de-requiring routes are no longer distinguished by their message"; fail=$((fail+1)); fi
  # 15/16. ANTAGONIST B's F2, AND NOTE WHY CASE 7 COULD NOT SEE IT. Case 7 appends a BRAND-NEW junk row and
  #     asserts only that the WARNING prints - it never checks that the gate stopped being required, so it
  #     "disturbed the mechanism without crossing the threshold" (CLAUDE.md), in the one case where the EXIT CODE
  #     is the defect. These two malform an EXISTING required row whose gate is GONE, which is the real shape.
  rm -f "$T/regress/35-width-containment.js"
  python3 - "$T/gate-manifest.tsv" <<'PY4'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("35-width-containment.js\t"): ls[i]=l.replace("\t","    ")
open(p,'w').write("\n".join(ls))
PY4
  ck 1 "a MALFORMED row whose gate is deleted is a hard failure, not a warning" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q '0 missing' <<<"$out" && ! grep -q 'unreadable' <<<"$out"; then
    echo "FAIL selftest: the summary line still claims 0 missing with no unreadable count"; fail=$((fail+1))
  else echo "PASS selftest: the summary line reports the unreadable row rather than claiming 0 missing"; pass=$((pass+1)); fi
  # 17. an unknown subcommand exits 2, so it can never be mistaken for the MISSING code gates.sh branches on.
  ck 2 "an unknown subcommand exits 2, not the MISSING code 1" "$T/gatemanifest.sh" frobnicate
  # 18/19. ANTAGONIST A's DOOR 6: commenting a row out, with the gate deleted. Exit 0 before this was written.
  cp "$T/kept2.tsv" "$T/gate-manifest.tsv" 2>/dev/null || true
  cp "$T/keptfloor.tsv" "$T/gate-required-floor.tsv" 2>/dev/null || true
  rm -f "$T/regress/41-coach-bubble.js"
  python3 - "$T/gate-manifest.tsv" <<'PY5'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("41-coach-bubble.js\t"): ls[i]="#"+l
open(p,'w').write("\n".join(ls))
PY5
  ck 1 "a COMMENTED-OUT row whose gate is deleted is a hard failure" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'COMMENTED OUT' <<<"$out" && grep -q '41-coach-bubble' <<<"$out"; then
    echo "PASS selftest: the commented-out row is named, not silently uncounted"; pass=$((pass+1))
  else echo "FAIL selftest: a commented-out row was not reported"; fail=$((fail+1)); fi
  # ── FL1 to FL31: THE FLOOR AND THE REQUIRED-SET DIGEST [#549 item (36)]. Ported from #467/#468's cases on
  # claude/cool-noether-me7uq8 with every literal count (49/48/50) replaced by the SEED FLOOR read off the
  # register, because those numbers described a 49-gate tree and a control pinned to a stale count is the frozen
  # denominator. Every case label below is a SOURCE LABEL (FLn); the authority for the total is the last line.
  resetT
  SEEDF="$(awk -F'\t' '!/^[[:space:]]*#/ && NF>1 {f=$1} END{print f}' "$T/keptfloor.tsv")"
  case "$SEEDF" in ''|*[!0-9]*) echo "FAIL selftest: FL FIXTURE - could not read the seed floor from the register copy ('$SEEDF'); the floor cases did not run"; fail=$((fail+1)); SEEDF="";; esac
  if [ -n "$SEEDF" ]; then
  # FL1. a tree at the recorded floor is accepted, and logs the AFFIRMATIVE token.
  ck 0 "FL1 a tree whose required count equals the floor checks clean" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q '^gate reqset: VERIFIED against the register ([0-9a-f]\{12\})$' <<<"$out"; then
    echo "PASS selftest: FL2 an honest tree logs the affirmative 'gate reqset: VERIFIED' token, so a later reader can tell the comparison RAN"; pass=$((pass+1))
  else echo "FAIL selftest: FL2 the honest path printed no VERIFIED token"; fail=$((fail+1)); fi
  # FL3. THE TOKEN IS NOT THE CARRIER. gates.sh and verify-log.sh both take the FIRST '^gate manifest:' line; on
  #      the branch the token carried that prefix and was printed first, so the footer carried the token.
  if [[ "$(grep -m1 '^gate manifest:' <<<"$out" || true)" =~ ,\ ${SEEDF}\ floor,\ [0-9a-f]{12}\ reqset$ ]]; then
    echo "PASS selftest: FL3 the first '^gate manifest:' line is the CARRIER with its floor and reqset fields, not the token"; pass=$((pass+1))
  else echo "FAIL selftest: FL3 the first '^gate manifest:' line is not the carrier: $(grep -m1 '^gate manifest:' <<<"$out" || true)"; fail=$((fail+1)); fi
  # FL4. THE DEFECT: delete the gate CLAUDE.md names as the only cover for brilliancy explanations, flip its row
  #      to absent, give the reason `x`. $T is no work tree, so the anchor is NOT CHECKED; exit 0 before #549.
  rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF1'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="x"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF1
  ck 1 "FL4 one gate DE-REQUIRED below the floor is a hard failure where the anchor cannot run" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'FLOOR BREACHED' <<<"$out" && grep -q "$((SEEDF-1)) required" <<<"$out" && grep -q '^gate anchor: NOT CHECKED' <<<"$out"; then
    echo "PASS selftest: FL5 the breach is named with both numbers, in the state where the anchor is NOT CHECKED"; pass=$((pass+1))
  else echo "FAIL selftest: FL5 a breached floor was not reported with its numbers (or the anchor ran)"; fail=$((fail+1)); fi
  # FL6. the floor binds only DOWNWARD, and sync raises it.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest extra gate' >/dev/null 2>&1
  ck 0 "FL6 a tree requiring MORE than the floor is accepted, and sync raised the floor" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" floor 2>&1)"
  if grep -q "floor: $((SEEDF+1))," <<<"$out"; then echo "PASS selftest: FL7 sync raised the floor $SEEDF -> $((SEEDF+1))"; pass=$((pass+1))
  else echo "FAIL selftest: FL7 sync did not raise the floor (got: $out)"; fail=$((fail+1)); fi
  # FL8. THE LEGITIMATE DOOR DOWN MUST WORK, or the guard deadlocks and gets switched off.
  rm -f "$T/regress/98-extra-gate.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" retire 98-extra-gate.js 'selftest: the legitimate route down' >/dev/null 2>&1
  ck 0 "FL8 a LEGITIMATE retire lowers the floor and leaves the tree clean" "$T/gatemanifest.sh" check
  # FL9. ABSENT REGISTER -> NOT CHECKED (exit 3), and the carrier carries the token the push gate refuses.
  mv "$T/gate-required-floor.tsv" "$T/floor.hidden"
  ck 3 "FL9 an ABSENT floor register is NOT CHECKED (exit 3), not a pass" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'NOT-CHECKED floor, NOT-CHECKED reqset$' <<<"$out" && ! grep -q '^gate reqset: VERIFIED' <<<"$out"; then echo "PASS selftest: FL10 the carrier carries the NOT-CHECKED tokens and no VERIFIED line"; pass=$((pass+1))
  else echo "FAIL selftest: FL10 an absent register did not reach the carrier line as NOT-CHECKED"; fail=$((fail+1)); fi
  mv "$T/floor.hidden" "$T/gate-required-floor.tsv"
  # FL11. THE CHAIN: deleting an INTERIOR row. The fixture builds its own three rows through the writer and says
  #       so if it could not [#467, antagonist A's non-veto note: a fixture failure must not read as a verdict].
  resetT
  : > "$T/regress/98-x1.js"; CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'first extra' >/dev/null 2>&1
  : > "$T/regress/98-x2.js"; CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'second extra' >/dev/null 2>&1
  nrows=$(awk '/^[[:space:]]*#/ {next} {s=$0; gsub(/[[:space:]]/,"",s); if(s!="") c++} END{print c+0}' "$T/gate-required-floor.tsv")
  if [ "${nrows:-0}" -lt 3 ]; then
    echo "FAIL selftest: FL11 FIXTURE could not be built - wanted 3 floor rows, got ${nrows:-0}; NOT a verdict about the chain"; fail=$((fail+1))
  else
  python3 - "$T/gate-required-floor.tsv" <<'PYF2'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l.strip() and not l.lstrip().startswith("#")]
del ls[rows[1]]
open(p,'w').write("\n".join(ls))
PYF2
  ck 1 "FL11 a DELETED INTERIOR floor row breaks the chain and is HARD" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'BROKEN CHAIN' <<<"$out"; then echo "PASS selftest: FL12 the broken chain is named"; pass=$((pass+1))
  else echo "FAIL selftest: FL12 a broken chain was not reported"; fail=$((fail+1)); fi
  fi
  # FL13. a COMMENTED-OUT floor row is a hidden lowering.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest extra gate again' >/dev/null 2>&1
  python3 - "$T/gate-required-floor.tsv" <<'PYF3'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l.strip() and not l.lstrip().startswith("#")]
ls[rows[-1]]="#"+ls[rows[-1]]
open(p,'w').write("\n".join(ls))
PYF3
  ck 1 "FL13 a COMMENTED-OUT floor row is a hidden lowering, and is HARD" "$T/gatemanifest.sh" check
  # FL14. a `lower` row naming NO gate in field 8. Field 9 is a real-shaped digest so the arm under test is the
  #       one that refuses, not the format test [#468's own note on its fixtures].
  resetT
  printf '%s\t%s\tlower\t2026-11-06\t549\tselftest\tdropping the brilliancy gate\t-\taaaaaaaaaaaa\n' "$((SEEDF-1))" "$SEEDF" >> "$T/gate-required-floor.tsv"
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q 'names no gate in field 8' <<<"$out"; then echo "PASS selftest: FL14 a 'lower' row naming no gate in field 8 is refused, by that arm (exit 1)"; pass=$((pass+1))
  else echo "FAIL selftest: FL14 a gateless lower row was not refused by its own arm (rc=$rc)"; fail=$((fail+1)); fi
  # FL15. THE HAND-APPENDED `lower` ROW [#467, B's F2]: it must name a gate the MANIFEST records as `retired`.
  resetT; rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF4'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="not on this tree"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF4
  printf '%s\t%s\tlower\t2026-11-06\t549\tselftest\tdropping the brilliancy gate\t21-review-brilliant.js\taaaaaaaaaaaa\n' "$((SEEDF-1))" "$SEEDF" >> "$T/gate-required-floor.tsv"
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q "not 'retired'" <<<"$out"; then echo "PASS selftest: FL15 a hand-appended 'lower' for a gate that is 'absent', not 'retired', is refused and the state is named (exit 1)"; pass=$((pass+1))
  else echo "FAIL selftest: FL15 the two-file disagreement was not refused by name (rc=$rc)"; fail=$((fail+1)); fi
  # FL16. ONE RETIRE CANNOT ABSORB THREE REMOVALS [#467, B's F1 - the veto], and the refusal writes NOTHING.
  resetT
  for g in 21-review-brilliant.js 26-invariants.js 47-menu.js; do
    rm -f "$T/regress/$g"
    python3 - "$T/gate-manifest.tsv" "$g" <<'PYF5'
import sys
p,g=sys.argv[1],sys.argv[2]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith(g+"\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="not on this tree"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF5
  done
  ck 1 "FL16 three gates de-required is a breach before any retire" "$T/gatemanifest.sh" check
  cp "$T/gate-manifest.tsv" "$T/m.before"; cp "$T/gate-required-floor.tsv" "$T/f.before"
  out="$(CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" retire 21-review-brilliant.js 'superseded, see the job' 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ] && grep -q 'FLOOR NOT LOWERED' <<<"$out" && grep -q '26-invariants' <<<"$out"; then
    echo "PASS selftest: FL17 retire REFUSES to account for three removals with one row, and names the others (exit $rc)"; pass=$((pass+1))
  else echo "FAIL selftest: FL17 one retire still absorbed three removals (exit $rc)"; echo "$out" | sed 's/^/      /' | tail -6; fail=$((fail+1)); fi
  if cmp -s "$T/gate-manifest.tsv" "$T/m.before" && cmp -s "$T/gate-required-floor.tsv" "$T/f.before"; then
    echo "PASS selftest: FL18 the refused retire wrote NEITHER file - no half-applied write"; pass=$((pass+1))
  else echo "FAIL selftest: FL18 the refused retire changed a file"; fail=$((fail+1)); fi
  rm -f "$T/m.before" "$T/f.before"
  # FL19. AND THE LEGITIMATE ROUTE, one gate at a time: the floor falls by exactly one.
  resetT; rm -f "$T/regress/21-review-brilliant.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" retire 21-review-brilliant.js 'superseded, see the job' >/dev/null 2>&1
  ck 0 "FL19 ONE removal plus ONE retire is clean" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" floor 2>&1)"
  if grep -q "floor: $((SEEDF-1))," <<<"$out"; then echo "PASS selftest: FL20 the legitimate retire lowered the floor by exactly one"; pass=$((pass+1))
  else echo "FAIL selftest: FL20 the legitimate retire did not lower the floor ($out)"; fail=$((fail+1)); fi
  # FL21. A RETIRE OVER A PENDING SWAP IS REFUSED, which is new at #549: #467's retire recorded whatever set the
  #       tree had, so a swap followed by one honest retire was laundered into a `lower` row.
  resetT
  KA="$(awk -F'\t' '!/^[[:space:]]*#/ && NF>1 {s=$2; gsub(/[ \r]/,"",s); if(s=="absent"){print $1; exit}}' "$T/gate-manifest.tsv")"
  if [ -z "$KA" ]; then echo "FAIL selftest: FL21 FIXTURE - no known-absent row to promote; the swap cases did not run"; fail=$((fail+1)); else
  : > "$T/regress/$KA"; rm -f "$T/regress/21-review-brilliant.js"
  python3 - "$T/gate-manifest.tsv" "$KA" <<'PYF8'
import sys
p,ka=sys.argv[1],sys.argv[2]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith(ka+"\t"):
        f=l.split("\t"); f[1]="required"; ls[i]="\t".join(f)
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="moved to the drill suite, see job Y"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYF8
  # FL21. A SWAP at constant count and constant floor [#467, A's 5.1].
  ck 1 "FL21 a SWAP at constant count and constant floor is a hard failure" "$T/gatemanifest.sh" check
  out="$("$T/gatemanifest.sh" check 2>&1)"
  if grep -q 'REQUIRED-SET DIGEST CHANGED' <<<"$out" && ! grep -q 'FLOOR BREACHED' <<<"$out"; then echo "PASS selftest: FL22 the swap is caught by the SET digest and not by the count, which cannot see it"; pass=$((pass+1))
  else echo "FAIL selftest: FL22 the swap was not caught by the digest"; fail=$((fail+1)); fi
  if ! grep -q '^gate reqset: VERIFIED' <<<"$out"; then echo "PASS selftest: FL23 and the swapped tree prints NO VERIFIED token"; pass=$((pass+1))
  else echo "FAIL selftest: FL23 the VERIFIED token printed over a changed set"; fail=$((fail+1)); fi
  out="$(CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'the drill gate arrives' 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ] && grep -q 'required SET has changed but the COUNT has not' <<<"$out"; then
    echo "PASS selftest: FL24 sync REFUSES a swap and sends you to the leaving door (exit $rc)"; pass=$((pass+1))
  else echo "FAIL selftest: FL24 sync accepted a swap at constant count (exit $rc)"; echo "$out" | sed 's/^/      /' | tail -5; fail=$((fail+1)); fi
  rm -f "$T/regress/26-invariants.js"
  out="$(CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" retire 26-invariants.js 'an honest retire over the swap' 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ] && grep -q 'is not the one the floor' <<<"$out" && [ "$(awk -F'\t' '!/^[[:space:]]*#/ && $3=="lower"{c++} END{print c+0}' "$T/gate-required-floor.tsv")" = 0 ]; then
    echo "PASS selftest: FL25 a retire over a pending swap is REFUSED and writes no 'lower' row, so it cannot launder the swap (exit $rc)"; pass=$((pass+1))
  else echo "FAIL selftest: FL25 a retire recorded a swapped set as one gate leaving (exit $rc)"; echo "$out" | sed 's/^/      /' | tail -5; fail=$((fail+1)); fi
  fi
  # FL26. A DUPLICATE row padding the required count over a deleted gate [#467, B's F3] - at second two now.
  resetT; rm -f "$T/regress/26-invariants.js"
  python3 - "$T/gate-manifest.tsv" <<'PYF6'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("26-invariants.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="not on this tree"; ls[i]="\t".join(f)
t="\n".join(ls)
if not t.endswith("\n"): t+="\n"
t+="10-gameover.js\trequired\t549\t2026-11-06\tselftest\tpadding\t-\n"
open(p,'w').write(t)
PYF6
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q 'DOES NOT ADD UP' <<<"$out" && grep -q 'uniq -d' <<<"$out"; then
    echo "PASS selftest: FL26 a DUPLICATE row padding the required count is HARD, named, with the remedy printed"; pass=$((pass+1))
  else echo "FAIL selftest: FL26 the arithmetic contradiction was not reported (rc=$rc)"; fail=$((fail+1)); fi
  # FL27. AND A STALE ROW (file present, row absent - the normal 'a gate landed for a known-absent row' state)
  #       is NOT an arithmetic failure: it stays the soft STALE report it was before #549.
  resetT
  if [ -n "${KA:-}" ]; then : > "$T/regress/$KA"
    out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
    if [ "$rc" = 0 ] && grep -q 'MANIFEST ROW IS STALE' <<<"$out" && ! grep -q 'DOES NOT ADD UP' <<<"$out"; then
      echo "PASS selftest: FL27 a stale known-absent row whose gate has arrived stays soft and is not an arithmetic failure"; pass=$((pass+1))
    else echo "FAIL selftest: FL27 a stale row turned hard (rc=$rc)"; echo "$out" | sed 's/^/      /' | tail -4; fail=$((fail+1)); fi
  fi
  # FL28. Both writing doors REFUSE without CT_BUILD/CT_RUNID, before touching either file.
  resetT; : > "$T/regress/98-extra-gate.js"
  out="$(env -u CT_RUNID -u CT_BUILD "$T/gatemanifest.sh" sync 'covers the new thing' 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q 'CT_BUILD and CT_RUNID' <<<"$out" && ! grep -q '98-extra-gate.js' "$T/gate-manifest.tsv" && cmp -s "$T/gate-required-floor.tsv" "$T/keptfloor.tsv"; then
    echo "PASS selftest: FL28 sync REFUSES before touching either file when CT_BUILD/CT_RUNID are unset"; pass=$((pass+1))
  else echo "FAIL selftest: FL28 sync wrote something with no CT_RUNID (rc=$rc)"; fail=$((fail+1)); fi
  # FL29. a `raise` that lowers, and a `lower` by more than one naming a retired gate, are both refused.
  resetT
  printf '%s\t%s\traise\t2026-11-06\t549\tselftest\tthis does not raise anything\t-\taaaaaaaaaaaa\n' "$((SEEDF-9))" "$SEEDF" >> "$T/gate-required-floor.tsv"
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q 'which does not raise' <<<"$out"; then echo "PASS selftest: FL29 a 'raise' row that lowers is refused by that arm (exit 1)"; pass=$((pass+1))
  else echo "FAIL selftest: FL29 a lowering raise was not refused by its arm (rc=$rc)"; fail=$((fail+1)); fi
  resetT; rm -f "$T/regress/21-review-brilliant.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" retire 21-review-brilliant.js 'superseded, see the job' >/dev/null 2>&1
  printf '%s\t%s\tlower\t2026-11-06\t549\tselftest\tdropping several at once\t21-review-brilliant.js\taaaaaaaaaaaa\n' "$((SEEDF-4))" "$((SEEDF-1))" >> "$T/gate-required-floor.tsv"
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q 'by EXACTLY ONE' <<<"$out"; then echo "PASS selftest: FL30 a 'lower' dropping more than one is refused even naming a retired gate (exit 1)"; pass=$((pass+1))
  else echo "FAIL selftest: FL30 a multi-step lower was not refused by its arm (rc=$rc)"; fail=$((fail+1)); fi
  # FL31. A final row with NO TRAILING NEWLINE is still read, and the writer does not join two rows.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest no-newline case' >/dev/null 2>&1
  printf '%s' "$(cat "$T/gate-required-floor.tsv")" > "$T/floor.nonl" && mv "$T/floor.nonl" "$T/gate-required-floor.tsv"
  out="$("$T/gatemanifest.sh" floor 2>&1)"
  if grep -q "floor: $((SEEDF+1))," <<<"$out"; then echo "PASS selftest: FL31 a final row with no trailing newline is still read"; pass=$((pass+1))
  else echo "FAIL selftest: FL31 the last floor row was lost without a trailing newline (got: $out)"; fail=$((fail+1)); fi
  rm -f "$T/regress/98-extra-gate.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" retire 98-extra-gate.js 'appending after a newline-less row' >/dev/null 2>&1
  ck 0 "FL32 appending after a newline-less row does not join two rows" "$T/gatemanifest.sh" check
  # FL33/FL34. ONE LEADING SPACE hides a row from the replay [#467, A's 5.2] - and a genuinely blank line is fine.
  resetT; : > "$T/regress/98-extra-gate.js"
  CT_BUILD=#549 CT_RUNID=selftest "$T/gatemanifest.sh" sync 'selftest indent case' >/dev/null 2>&1
  python3 - "$T/gate-required-floor.tsv" <<'PYF7'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l.strip() and not l.lstrip().startswith("#")]
ls[rows[-1]]=" "+ls[rows[-1]]
open(p,'w').write("\n".join(ls))
PYF7
  out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q 'INDENTED' <<<"$out"; then echo "PASS selftest: FL33 an INDENTED floor row is HARD and named, not silently skipped"; pass=$((pass+1))
  else echo "FAIL selftest: FL33 an indented row was not refused by name (rc=$rc)"; fail=$((fail+1)); fi
  resetT; printf '\n   \n\t\n  \t \n' >> "$T/gate-required-floor.tsv"
  ck 0 "FL34 blank and whitespace-only lines in the register are still ignored" "$T/gatemanifest.sh" check
  # FL35/FL36/FL37. FIELD 9 [#468, B's veto F1]: the '-' sentinel and junk are HARD, by the format arm; and the
  #       same tree with a real digest is clean again, so the two pin the FIELD and not something the edit moved.
  for bad in '-' 'zzzz' 'a11d1951843' 'zzzzzzzzzzzz'; do
    resetT
    python3 - "$T/gate-required-floor.tsv" "$bad" <<'PYFB'
import sys
p,bad=sys.argv[1],sys.argv[2]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.strip() and not l.lstrip().startswith("#") and "\t" in l:
        f=l.split("\t")
        if len(f)>=9: f[8]=bad; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYFB
    out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
    if [ "$rc" = 1 ] && grep -q 'field 9' <<<"$out" && ! grep -q '^gate reqset: VERIFIED' <<<"$out"; then
      echo "PASS selftest: FL35 a floor row whose field 9 is '$bad' is HARD, refused by the format arm, with no VERIFIED token"; pass=$((pass+1))
    else echo "FAIL selftest: FL35 field 9 '$bad' was not refused by the format arm (rc=$rc)"; fail=$((fail+1)); fi
  done
  resetT
  ck 0 "FL36 and with field 9 a real digest again the same tree is clean - so FL35 pins the FIELD" "$T/gatemanifest.sh" check
  fi
  resetT
  # ── 20 to 27: THE COMMITTED-SELF ANCHOR. These cannot run against $T, because $T is a mktemp directory and
  # therefore not a git work tree - which is itself case 27. So they build a THROWAWAY REPOSITORY, commit the
  # real manifest and a stub regress/ into it, and attack the working copy. Every case crosses the threshold -
  # the verdict changes - rather than disturbing the mechanism: #467's own report records that a control which
  # only perturbs is what let a de-requirement through, and case 7 in this very file is the example.
  # AND THE SCRIPT IS RUN IN PLACE, under $GT/gates/, never from the temp root: these scripts resolve their
  # registers from `dirname $0`, so a copy outside gates/ loses the manifest and reports NOT CHECKED, which
  # reads as a pass or a failure depending on which way you hold it [#467, notes/build__1790976005325__1].
  if command -v git >/dev/null 2>&1; then
    GT="$(mktemp -d)"; trap 'rm -rf "$T" "$GT"' EXIT
    mkdir -p "$GT/gates/regress"
    cp "$M" "$GT/gates/gate-manifest.tsv"; cp "$0" "$GT/gates/gatemanifest.sh"; chmod +x "$GT/gates/gatemanifest.sh"
    [ -f "$FLOORF" ] && cp "$FLOORF" "$GT/gates/gate-required-floor.tsv"   # #549: committed with the seed, so the floor anchor has a baseline
    for f in "$REG"/*.js; do [ -e "$f" ] && : > "$GT/gates/regress/$(basename "$f")"; done
    GM="$GT/gates/gatemanifest.sh"; GMF="$GT/gates/gate-manifest.tsv"
    # PINNED [#540, GMROOT part 1]: this used to be `cd "$GT" && git init -q -b main .` with bare git, which under
    # an inherited GIT_DIR would have seeded, reset and cleaned the INHERITED repository instead of $GT - the
    # selftest would then have measured the wrong tree while reporting on this one.
    GTG=(git -C "$GT" --git-dir="$GT/.git" --work-tree="$GT")
    ( "${GTG[@]}" init -q -b main \
        && "${GTG[@]}" -c user.email=selftest@local -c user.name=selftest add -A \
        && "${GTG[@]}" -c user.email=selftest@local -c user.name=selftest commit -qm "selftest seed" ) >/dev/null 2>&1
    reset_gt(){ ( "${GTG[@]}" checkout -q -- . && "${GTG[@]}" clean -qfd ) >/dev/null 2>&1; }
    # 20. the control that proves the rest: a tree identical to its committed manifest is clean, and the
    #     baseline that resolved is NAMED. There is no remote in this repo, so this is the HEAD fallback.
    ck 0 "ANCHOR: a tree identical to its committed manifest is clean" "$GM" check
    out="$("$GM" check 2>&1)" || true
    if grep -q '^gate anchor: HEAD, 0 vanished, 0 weakened$' <<<"$out"; then
      echo "PASS selftest: ANCHOR names the baseline that resolved and reports 0 and 0"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR did not print the HEAD-fallback carrier line"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi
    # 21. ROUTE 2 OF B's THREE: delete the row outright, with the gate gone too so nothing else objects.
    #     Every other check in this file reads the manifest, so a row that is not there is not a complaint.
    rm -f "$GT/gates/regress/29-draws.js"
    python3 - "$GMF" <<'PY6'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
open(p,'w').write("\n".join(l for l in ls if not l.startswith("29-draws.js\t")))
PY6
    ck 1 "ANCHOR: a row DELETED outright is a hard failure" "$GM" check
    out="$("$GM" check 2>&1)" || true
    if grep -q 'VANISHED' <<<"$out" && grep -q '29-draws.js' <<<"$out" && grep -q '1 vanished' <<<"$out"; then
      echo "PASS selftest: ANCHOR names the vanished row and counts it in the carrier line"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR did not name or count the deleted row"; fail=$((fail+1)); fi
    reset_gt
    # 22. ROUTE 1, AND THIS IS THE DEFECT THE JOB WAS FILED FOR. required -> absent with the single character
    #     `x` as the reason, gate deleted. #461 made a MISSING reason hard, so this cleared the bar and exited 0.
    rm -f "$GT/gates/regress/21-review-brilliant.js"
    python3 - "$GMF" <<'PY7'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="x"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PY7
    ck 1 "ANCHOR: required -> absent with the reason 'x' is a hard failure (exit 0 before this)" "$GM" check
    out="$("$GM" check 2>&1)" || true
    if grep -q 'WEAKENED' <<<"$out" && grep -q '1 weakened' <<<"$out"; then
      echo "PASS selftest: ANCHOR names the weakening and counts it in the carrier line"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR did not report the required->absent flip"; fail=$((fail+1)); fi
    reset_gt
    # 23. THE EXEMPTION IS KEYED TO THE STATE AS WELL AS THE TOKEN. The same flip to `absent` carrying a
    #     forged `RETIRED at ...` reason is STILL hard, because no subcommand here ever writes `absent`.
    rm -f "$GT/gates/regress/21-review-brilliant.js"
    python3 - "$GMF" <<'PY8'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("21-review-brilliant.js\t"):
        f=l.split("\t"); f[1]="absent"; f[6]="RETIRED at 999 (2026-10-03, x): x"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PY8
    ck 1 "ANCHOR: required -> absent is hard even with a retire-shaped reason" "$GM" check
    reset_gt
    # 24. THE LEGITIMATE DOOR MUST STAY OPEN, and this is the case that decided the exemption's shape: a real
    #     retire weakens a row in the working tree, so an anchor with no exemption would redden it.
    rm -f "$GT/gates/regress/41-coach-bubble.js"
    ck 0 "ANCHOR: a LEGITIMATE retire runs" env CT_BUILD=#549 CT_RUNID=selftest "$GM" retire 41-coach-bubble.js "selftest: the legitimate door"
    ck 0 "ANCHOR: and the tree it leaves behind is clean" "$GM" check
    reset_gt
    # 25. ROUTE 3: commented out with a leading #. The DISABLED detector already makes this hard, so the
    #     threshold this case crosses is the anchor's own: the row must be named as VANISHED as well, because
    #     to the anchor a commented row and a deleted row are the same event and only one of them has a detector.
    rm -f "$GT/gates/regress/34-takeback.js"
    python3 - "$GMF" <<'PY9'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("34-takeback.js\t"): ls[i]="#"+l
open(p,'w').write("\n".join(ls))
PY9
    out="$("$GM" check 2>&1)"; rc=$?
    if [ "$rc" = 1 ] && grep -q 'VANISHED' <<<"$out" && grep -q '34-takeback.js (row was required' <<<"$out"; then
      echo "PASS selftest: ANCHOR reports a COMMENTED-OUT row as vanished, not only as disabled"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR did not report the commented-out row (rc=$rc)"; fail=$((fail+1)); fi
    reset_gt
    # 26. THE NORMAL CASE MUST NOT FIRE, which is the whole reason origin/main was affordable as a baseline.
    #     A build that legitimately ADDS a gate adds a row: nothing vanishes and nothing weakens.
    : > "$GT/gates/regress/98-selftest-new-gate.js"
    printf '// a stub a build added\n' > "$GT/gates/regress/98-selftest-new-gate.js"
    ck 0 "ANCHOR: a legitimate sync adding a gate runs" env CT_BUILD=#549 CT_RUNID=selftest "$GM" sync "selftest: a build adding a gate"
    out="$("$GM" check 2>&1)"; rc=$?
    if [ "$rc" = 0 ] && grep -q '0 vanished, 0 weakened' <<<"$out"; then
      echo "PASS selftest: ANCHOR is silent on an ADDED gate - the normal case does not fire it"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR fired on a legitimately added gate (rc=$rc)"; fail=$((fail+1)); fi
    reset_gt
    # FA1-FA4. THE FLOOR ANCHOR [#549 item (36)]: the register's committed rows must be a PREFIX of its working
    #     rows, which is the only defence against the two edits its own chain cannot see. Case 26 above is the
    #     normal case for it (a sync APPENDS a row and the tree stays clean); these are the attacks.
    out="$("$GM" check 2>&1)"; rc=$?
    if [ "$rc" = 0 ] && grep -q '^floor anchor: HEAD, committed rows intact$' <<<"$out"; then
      echo "PASS selftest: FA1 the floor anchor names its baseline and reads intact on a tree identical to it"; pass=$((pass+1))
    else echo "FAIL selftest: FA1 the floor anchor did not read intact on a clean tree (rc=$rc)"; echo "$out" | grep -i floor | sed 's/^/      /'; fail=$((fail+1)); fi
    # FA2. TRAILING TRUNCATION: delete the last (here the only) row. Without git this is an ABSENT register (exit 3);
    #      with git it is a committed row GONE, and hard.
    python3 - "$GT/gates/gate-required-floor.tsv" <<'PYFA'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l.strip() and not l.lstrip().startswith("#")]
del ls[rows[-1]]
open(p,'w').write("\n".join(ls))
PYFA
    out="$("$GM" check 2>&1)"; rc=$?
    if [ "$rc" = 1 ] && grep -q 'committed row(s) are GONE' <<<"$out"; then
      echo "PASS selftest: FA2 a TRAILING TRUNCATION of the floor register is hard against its committed copy (exit 3 without git)"; pass=$((pass+1))
    else echo "FAIL selftest: FA2 a truncated register was not caught by the floor anchor (rc=$rc)"; fail=$((fail+1)); fi
    reset_gt
    # FA3. ROW 1 REWRITTEN CONSISTENTLY [#468's named residual: "a file cannot anchor itself"]: every floor is
    #      lowered by ten and every chain field re-pointed with it, digests left valid - so the rewritten register
    #      passes every in-file check and only the anchor can object. RE-ANCHORED at #549 fix round 5 (A4-R5): the
    #      first version lowered ROW 1 ALONE, which was a consistent rewrite only while the register had one row;
    #      once 3720349 appended the 65 -> 66 raise, row 2's prev ('65') no longer matched the rewritten row 1
    #      ('55'), the in-file chain check fired BROKEN CHAIN, and FA3 went red without testing its residual. The
    #      fixture is now built FROM WHATEVER REGISTER IT READS: subtracting one constant from every floor and
    #      every prev keeps each raise a raise, each lower a lower-by-one, and each chain link intact, at any row
    #      count. FA3b proves that claim rather than asserting it: the same rewrite on a copy with no repository,
    #      where the anchor cannot run, must be accepted at exit 0 - so FA3's refusal is the anchor's alone.
    python3 - "$GT/gates/gate-required-floor.tsv" <<'PYFB2'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
rows=[i for i,l in enumerate(ls) if l.strip() and not l.lstrip().startswith("#")]
for i in rows:
    f=ls[i].split("\t"); f[0]=str(int(f[0])-10)
    if f[1].strip() not in ("-",""): f[1]=str(int(f[1])-10)
    ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PYFB2
    out="$("$GM" check 2>&1)"; rc=$?
    if [ "$rc" = 1 ] && grep -q 'REWRITTEN' <<<"$out" && ! grep -q 'CORRUPT' <<<"$out" && ! grep -q 'BROKEN CHAIN' <<<"$out" && ! grep -q 'FLOOR BREACHED' <<<"$out"; then
      echo "PASS selftest: FA3 a consistent rewrite of ROW 1 (and every later row) passes every in-file check and is caught by the floor anchor alone"; pass=$((pass+1))
    else echo "FAIL selftest: FA3 a rewritten seed row was not caught by the anchor alone (rc=$rc)"; echo "$out" | grep -iE 'floor|corrupt' | sed 's/^/      /'; fail=$((fail+1)); fi
    GT3="$(mktemp -d)"; mkdir -p "$GT3/gates"; cp -R "$GT/gates/." "$GT3/gates/"
    out="$("$GT3/gates/gatemanifest.sh" check 2>&1)"; rc=$?; rm -rf "$GT3"
    if [ "$rc" = 0 ] && grep -q '^floor anchor: NOT CHECKED' <<<"$out" && ! grep -qE 'CORRUPT|BROKEN CHAIN|FLOOR BREACHED' <<<"$out"; then
      echo "PASS selftest: FA3b the same rewrite with NO repository (anchor NOT CHECKED) is accepted at exit 0 - every in-file check passes it, so FA3's refusal is the anchor's"; pass=$((pass+1))
    else echo "FAIL selftest: FA3b the FA3 fixture is not a consistent rewrite - an in-file check objects with the anchor off (rc=$rc)"; echo "$out" | grep -iE 'floor|corrupt|chain' | sed 's/^/      /'; fail=$((fail+1)); fi
    reset_gt
    # 26b. THE DEFECT jobs/gatemanifest-derives-its-root-with-git-c-...-2026-10-22 WAS FILED FOR [#540, GMROOT
    #     part 1]. A SECOND throwaway repository is seeded and the environment is pointed at it, the way a git
    #     hook's exported GIT_DIR points a child at the hooked repository. Before the pin, `check` run in $GT
    #     under that environment answered for $GT2, found no manifest tracked there, and printed
    #     `gate anchor: NOT CHECKED - ... is tracked at neither origin/main nor HEAD` at exit 0 - the anchor
    #     switched off by an environment variable while every other line stayed green. Pinned, it reads $GT's
    #     own HEAD exactly as case 20 does with no environment at all. TWO PASS LINES, deliberately separate:
    #     the first proves the redirect is REAL (an unpinned git in $GT answers $GT2), because an assertion
    #     that "X holds in state S" is evidence only once S is shown to have been reached [CLAUDE.md, #385].
    GT2="$(mktemp -d)"
    GT2G=(git -C "$GT2" --git-dir="$GT2/.git" --work-tree="$GT2")
    printf 'the other repository\n' > "$GT2/README"
    ( "${GT2G[@]}" init -q -b main \
        && "${GT2G[@]}" -c user.email=selftest@local -c user.name=selftest add -A \
        && "${GT2G[@]}" -c user.email=selftest@local -c user.name=selftest commit -qm "selftest other repository" ) >/dev/null 2>&1
    seen="$( cd "$GT" && GIT_DIR="$GT2/.git" GIT_WORK_TREE="$GT2" git rev-parse --show-toplevel 2>/dev/null || true )"
    if [ "$seen" = "$GT2" ]; then
      echo "PASS selftest: the redirect is real - an UNPINNED git run inside the first repository answers for the second"; pass=$((pass+1))
    else echo "FAIL selftest: the redirect control did not take (unpinned git answered '$seen', wanted $GT2)"; fail=$((fail+1)); fi
    out="$( GIT_DIR="$GT2/.git" GIT_WORK_TREE="$GT2" "$GM" check 2>&1 )"; rc=$?
    if [ "$rc" = 0 ] && grep -q '^gate anchor: HEAD, 0 vanished, 0 weakened$' <<<"$out"; then
      echo "PASS selftest: ANCHOR under an inherited GIT_DIR and GIT_WORK_TREE still reads this repository's HEAD (NOT CHECKED before the pin)"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR followed the inherited GIT_DIR instead of the script's own repository (rc=$rc)"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi
    # 26c. THE ONE VARIABLE NO PIN CAN REACH [#544, item (11); the knownLimits entry 48b7b4ab6433ba59 of the
    #     same job, found by antagonist B of #540 from the shipped-surface door]. GIT_OBJECT_DIRECTORY redirects
    #     the OBJECT STORE rather than the repository, so --git-dir and --work-tree - which is all 26b's pin
    #     does - leave it in force: `GIT_OBJECT_DIRECTORY=<empty dir> gatemanifest.sh check` read
    #     `gate anchor: NOT CHECKED` at exit 0, the anchor off by one environment variable, on the pinned
    #     script. The fix is to SCRUB the redirect variables rather than out-pin them, which is what the block
    #     at the top of this file now does, and the scrub leaves the root derivation doing exactly what it did.
    #     TWO PASS LINES AGAIN, for 26b's reason: the first shows the redirect is REAL in this state.
    GT3="$(mktemp -d)"
    seen3="$( cd "$GT" && GIT_OBJECT_DIRECTORY="$GT3" git cat-file -e HEAD^{commit} 2>/dev/null && echo readable || echo unreadable )"
    if [ "$seen3" = "unreadable" ]; then
      echo "PASS selftest: the object-store redirect is real - with GIT_OBJECT_DIRECTORY at an empty directory an unscrubbed git cannot read HEAD"; pass=$((pass+1))
    else echo "FAIL selftest: the GIT_OBJECT_DIRECTORY control did not take (HEAD still $seen3)"; fail=$((fail+1)); fi
    out="$( GIT_OBJECT_DIRECTORY="$GT3" "$GM" check 2>&1 )"; rc=$?
    if [ "$rc" = 0 ] && grep -q '^gate anchor: HEAD, 0 vanished, 0 weakened$' <<<"$out"; then
      echo "PASS selftest: ANCHOR under an inherited GIT_OBJECT_DIRECTORY still reads this repository's HEAD (NOT CHECKED before the scrub, on the PINNED script)"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR followed the inherited GIT_OBJECT_DIRECTORY (rc=$rc)"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi
    rm -rf "$GT3"
    rm -rf "$GT2"
    # 27. NOT CHECKED, NEVER A PASS AND NEVER A HARD FAILURE. $T is a mktemp copy and not a work tree, so this
    #     is the real degradation path and not a simulation of one. The exit code must be the one the checks
    #     above would have given on their own - here 0 - and the token must say so.
    # $T IS RESTORED FIRST, AND THE FIRST VERSION OF THIS CASE DID NOT DO IT AND FAILED FOR THE WRONG REASON:
    # cases 2 to 19 leave $T carrying a commented-out row and three deleted stubs, so `check` there exits 1 on
    # the DISABLED detector and the case read as "the anchor changed the exit code" when the anchor had not been
    # consulted at all. A control whose setup is not reset measures the previous control.
    cp "$T/kept2.tsv" "$T/gate-manifest.tsv"; cp "$T/keptfloor.tsv" "$T/gate-required-floor.tsv" 2>/dev/null || true
    for f in "$REG"/*.js; do [ -e "$f" ] && : > "$T/regress/$(basename "$f")"; done
    rm -f "$T/regress/99-brand-new.js" "$T/regress/29-draws-renamed.js"
    out="$("$T/gatemanifest.sh" check 2>&1)"; rc=$?
    if grep -q '^gate anchor: NOT CHECKED - ' <<<"$out" && ! grep -q 'gate anchor:.*vanished' <<<"$out" && [ "$rc" = 0 ]; then
      echo "PASS selftest: outside a git work tree the anchor reads NOT CHECKED, carries no counts, and reddens nothing"; pass=$((pass+1))
    else echo "FAIL selftest: the no-git path did not read NOT CHECKED or changed the exit code (rc=$rc)"; fail=$((fail+1)); fi
  else
    echo "SKIP selftest: cases 20-27 need git on PATH and it is not here - the anchor itself reads NOT CHECKED"
  fi
  # ── 28 to 40: THE SIGPIPE CLASS. Two halves, and the second is the one that makes the first worth having.
  # FIRST the MECHANISM, deterministically, which no control in this project had: a writer whose output
  # exceeds the 64 KiB pipe buffer is still writing when an early-exiting reader leaves, so the failure is
  # certain rather than a 2.4% flake. That is why these cases use 200k lines - not to be dramatic, but because
  # it is the only way to assert the mechanism without a flaky control, and CLAUDE.md says a flaky assertion
  # is worse than none. SECOND the DETECTOR, over a fabricated tree, shown both firing and silent on every
  # tier - because a control set that only runs against today's real directory scores full marks with its own
  # subject deleted, which is this project's fingerprint 7f3c1a9e4b2d8065.
  spck(){ local want="$1" got="$2" desc="$3"
    if [ "$want" = "$got" ]; then echo "PASS selftest: $desc"; pass=$((pass+1));
    else echo "FAIL selftest: $desc — wanted [$want], got [$got]"; fail=$((fail+1)); fi; }
  # 28. THE MECHANISM FIRES. grep -m1 leaves on the first line; seq is killed; pipefail returns seq's 141.
  spv="$(seq 1 200000 | grep -m1 '^1$')"; sprc=$?   # SIGPIPE-FIXTURE: this line IS the mechanism
  spck "1 nonzero" "$spv $([ "$sprc" -ne 0 ] && echo nonzero || echo zero)" \
    "a pipe into grep -m1 over 200k lines reports FAILURE while grep returned the right value"
  # 29. AND IS SILENT IN THE HERESTRING FORM. Same reader, same match, no writer to kill.
  spbig="$(seq 1 20000)"; spv="$(grep -m1 '^1$' <<<"$spbig")"; sprc=$?
  spck "1 zero" "$spv $([ "$sprc" -ne 0 ] && echo nonzero || echo zero)" \
    "the HERESTRING form of the same test reports success"
  # 30. THE TIER B SHAPE, WHICH IS THE DEFECT THIS JOB WAS FILED FOR, reproduced deterministically for the
  #     first time: the value AND the fallback are both captured, so a green suite is refused with a false cause.
  spv="$(seq 1 200000 | grep -m1 '^1$' || echo 'NOT CHECKED')"   # SIGPIPE-FIXTURE: the tier B shape, on purpose
  spck "2" "$(printf '%s\n' "$spv" | wc -l | tr -d ' ')" \
    "a captured || echo fallback yields TWO lines - the gates.sh:167 defect, on demand rather than at 2.4%"
  # 31. and one line once the pipe is gone, which is the fix gates.sh took at #477.
  spv="$(grep -m1 '^1$' <<<"$spbig" || echo 'NOT CHECKED')"
  spck "1" "$(printf '%s\n' "$spv" | wc -l | tr -d ' ')" "the herestring form of that shape yields ONE line"
  # 32. a reader that CONSUMES ALL ITS INPUT cannot orphan anything - the negative that keeps the detector
  #     from being a ban on pipes. grep -c reads to EOF.
  spv="$(seq 1 200000 | grep -c '^1$')"; sprc=$?
  spck "1 zero" "$spv $([ "$sprc" -ne 0 ] && echo nonzero || echo zero)" \
    "a pipe into grep -c reports success, so the class is early EXIT and not pipes"
  # ── THE DETECTOR, over a fabricated directory. Every tier is present once, and two lines that must NOT be
  # flagged sit beside them, so the classifier is constrained in both directions.
  SPD="$(mktemp -d)"
  # THE FIXTURE IS WRITTEN THROUGH A FILTER THAT STRIPS THE EXEMPTION MARKER, and that is not a trick: these
  # heredoc lines are PHYSICALLY IN gatemanifest.sh, so they must carry SIGPIPE-FIXTURE or the real-tree audit
  # reads this file's own controls as sites - which it did, on this audit's first run. The fixture the detector
  # is then pointed at must NOT carry it, or every control would assert the exemption instead of the tier.
  # One source, two readings, with the difference stated rather than left to be noticed.
  cat > "$SPD/fab.src" <<'FAB'
#!/usr/bin/env bash
set -uo pipefail
if printf '%s\n' "$list" | cut -f1 | grep -qxF "$p"; then echo yes; fi   # SIGPIPE-FIXTURE
V="$(printf '%s\n' "$o" | grep -m1 '^k:' || echo 'NOT CHECKED')"   # SIGPIPE-FIXTURE
W="$(printf '%s' "$l" | grep -oE 'x+' | head -1 || true)"   # SIGPIPE-FIXTURE
X="$(sed -n '2,6p' "$f" | grep -m1 '^//' | sed 's|^//||')"   # SIGPIPE-FIXTURE
Y="$(printf '%s\n' "$o" | grep -c '^k:' || true)"
Z="$(grep -qx "$g" <<<"$list" && echo in || echo out)"
# if printf '%s\n' "$list" | grep -qxF "$p"; then echo commented; fi
FAB
  sed 's/[[:space:]]*# SIGPIPE-FIXTURE.*$//' "$SPD/fab.src" > "$SPD/fab.sh"; rm -f "$SPD/fab.src"
  # ── #530. THE TWO CONTINUATION-LINE CONTROLS, APPENDED WITH printf AND NOT WITH THE HEREDOC ABOVE, FOR A
  # REASON THAT IS NOT STYLE. A fixture line that ENDS IN A BACKSLASH cannot carry a trailing
  # `# SIGPIPE-FIXTURE` marker - a comment after the backslash would stop it being a continuation - and these
  # heredoc lines are PHYSICALLY IN gatemanifest.sh, so an unmarked one would be read as a real site by the
  # real-tree audit and inflate the very counts it is ratcheted against. That is this fixture's own recorded
  # trap, one level down. Written through printf, the backslash lives in $SPBS and never appears literally at
  # the end of a line here, so every physical line below can carry the marker.
  SPBS='\'
  { printf 'P="$(printf %s | grep -qxF "$n" %s\n' '"$v"' "$SPBS"      # SIGPIPE-FIXTURE
    printf '  || echo missing)"\n'
    printf 'Q="$(wrap "a quoted name" %s\n' "$SPBS"
    printf '  "$( cd "$d" && bash x.sh | grep -E %s | head -1 )")"\n' "'^k'"   # SIGPIPE-FIXTURE
    # ── THE TWO CONTROLS ANTAGONIST A's VETO V1 SHOWED WERE MISSING. Both fixtures above start from tier D, so
    # the whole DOWNGRADE half of this classifier's new input space was uncontrolled - and that is exactly where
    # the defect lived: a `|| echo` or `|| true` on a continuation was classified off a first line holding no
    # operator and fell to D, taking a TIER B site (ceiling ZERO) with it. Line 14 is the B shape across a break
    # and line 16 the C shape; in both the continuation begins with `|` and NOT with `||`, so the cont test does
    # not raise them to A and the logical-line classification is what has to get them right.
    printf 'R="$(printf %s "$x" %s\n' "'%s'" "$SPBS"
    printf '  | grep -qxF "$y" || echo nope)"\n'   # SIGPIPE-FIXTURE
    printf 'S="$(printf %s "$x" %s\n' "'%s'" "$SPBS"
    printf '  | grep -oE %s | head -1 || true)"\n' "'z+'"   # SIGPIPE-FIXTURE
    # LINE 18 [#545, item (66)]: an `||` chain of two HERESTRING greps - no pipe anywhere - must not be a site.
    printf 'T="$(grep -qx "$g" <<<"$list" || grep -qx "$h" <<<"$list" && echo in)"\n'
  } >> "$SPD/fab.sh"
  spsites="$(sigpipe_sites "$SPD")"
  spck "A" "$(awk -F'\t' '$3==3{print $1}' <<<"$spsites")" "DETECTOR: an if-test pipe into grep -qxF is TIER A"
  spck "B" "$(awk -F'\t' '$3==4{print $1}' <<<"$spsites")" "DETECTOR: a captured || echo fallback is TIER B"
  spck "C" "$(awk -F'\t' '$3==5{print $1}' <<<"$spsites")" "DETECTOR: a grep | head masked by || true is TIER C"
  spck "D" "$(awk -F'\t' '$3==6{print $1}' <<<"$spsites")" "DETECTOR: a bare grep -m1 with its status discarded is TIER D"
  spck "" "$(awk -F'\t' '$3==7{print $1}' <<<"$spsites")" "DETECTOR: a pipe into grep -c is NOT flagged"
  spck "" "$(awk -F'\t' '$3==8{print $1}' <<<"$spsites")" "DETECTOR: a herestring into grep -qx is NOT flagged"
  spck "" "$(awk -F'\t' '$3==9{print $1}' <<<"$spsites")" "DETECTOR: a COMMENTED-OUT tier A line is NOT flagged"
  # AND THE TOTAL, which is the case that keeps the six above from passing while the detector silently also
  # flags something else. IT WAS WRITTEN AS 5 AND THE DETECTOR SAID 4, AND THE DETECTOR WAS RIGHT: the
  # fixture holds seven candidate lines, four of which are sites (3, 4, 5, 6) and three of which must not be
  # (7, 8, 9). The wrong number came from counting the lines rather than the expected verdicts. Kept as a
  # note rather than silently corrected, because a number this file publishes and a number it measures
  # disagreeing once is exactly the shape R18 is about.
  # AND IT HAPPENED A SECOND TIME, TO THE SAME LINE, AND IS CORRECTED IN PLACE HERE [R18, #530]: that assertion
  # went on to publish "8 of the fixture's 13 candidate lines" once the two continuation fixtures were appended.
  # 13 is SP_FIXTURE_CEIL - the count of MARKED LINES IN THIS FILE - wearing the name of a quantity it is not,
  # and the predecessor of that string read "6 of the fixture's 9" when the ceiling was 9, so the denominator had
  # tracked the ceiling rather than the fixture for two builds. MEASURED at #530 by dumping the generated
  # fixture from a sibling copy of this script (a copy in gates/, never a scratch directory: the script derives
  # $ROOT from its own location): fab.sh is 17 PHYSICAL lines, of which 11 are candidate LOGICAL lines holding a
  # grep - 3, 4, 5, 6, 7, 8, the commented-out 9, and the four continuation pairs beginning at 10, 12, 14 and
  # 16. Eight are sites; the three that must not be are 7, 8 and 9, exactly as the note above describes them.
  # The NUMERATOR was never wrong, which is the point: the assertion is on 8, and 13 was unasserted prose inside
  # a PASS line - the same class as the "all six sets" count this run corrected in gates/fastgate.sh, found by
  # the same reviewer in the same pass.
  # ── #530. THE CONTINUATION-LINE CONTROLS [jobs/the-sigpipe-audit-files-a-pipeline-whose-status-a-continuation-line-reads-as-tier-d-so-the-race-that-reddened-h23-counted-as-latent-2026-10-20]
  # TWO FIXTURES, AND THE SECOND IS THE ONE THAT MATTERS AS MUCH AS THE FIRST. Line 10 is the banned shape
  # written across two lines - a pipeline into grep -qxF whose status is read by an `||` at the START of the
  # continuation - and it must be TIER A; the base classifier reads one physical line and calls it D, which is
  # the defect. Line 12 is a logical line whose continuation contains `&&` but does NOT begin with it: the `&&`
  # is inside a command substitution and joins `cd` to `bash`, so it does not read the pipeline's status and the
  # site must stay D. The second fixture is not hypothetical - the first version of this fix had no such test,
  # matched `&&` anywhere in the continuation, and produced a FALSE TIER A on gates/verify-log.sh's own C8b
  # control, which is exactly this shape. A classifier constrained in one direction only is how that happened.
  spck "A" "$(awk -F'\t' '$3==10{print $1}' <<<"$spsites")" "DETECTOR: a pipeline whose status an || on the next line reads is TIER A, not D"
  spck "D" "$(awk -F'\t' '$3==12{print $1}' <<<"$spsites")" "DETECTOR: a continuation that merely CONTAINS && inside a substitution stays TIER D"
  spck "B" "$(awk -F'\t' '$3==14{print $1}' <<<"$spsites")" "DETECTOR: a || echo across a continuation is TIER B, not downgraded to D [A's veto V1]"
  spck "C" "$(awk -F'\t' '$3==16{print $1}' <<<"$spsites")" "DETECTOR: a || true across a continuation is TIER C, not downgraded to D [A's veto V1]"
  spck "" "$(awk -F'\t' '$3==18{print $1}' <<<"$spsites")" "DETECTOR: an || chain of two herestring greps is NOT flagged - an OR is not a pipe [#545, item (66)]"
  spck "8" "$(printf '%s\n' "$spsites" | grep -c . || true)" "DETECTOR: exactly 8 of the fixture's 12 candidate logical lines are sites, and no others"
  # 40. THE CEILING ITSELF FIRES. Two tier A lines against SP_A_CEIL=1 must be a refusal, otherwise the
  #     ratchet is decoration. The vacuity guard is the pair: an EMPTY directory is clean and says 0.
  cat > "$SPD/fab2.src" <<'FAB2'
#!/usr/bin/env bash
if printf '%s\n' "$a" | grep -qxF "$b"; then echo 1; fi   # SIGPIPE-FIXTURE
while printf '%s\n' "$c" | grep -qxF "$d"; do echo 2; done   # SIGPIPE-FIXTURE
FAB2
  sed 's/[[:space:]]*# SIGPIPE-FIXTURE.*$//' "$SPD/fab2.src" > "$SPD/fab2.sh"; rm -f "$SPD/fab2.src"
  out="$(sigpipe_audit "$SPD" 2>&1)"; rc=$?
  # THE EXPECTED COUNT IS 4 AT #530, WAS 3, AND THE CHANGE IS DECLARED RATHER THAN SILENT [R18]. This control
  # drives sigpipe_audit over $SPD, which holds fab.sh AND fab2.sh, so its tier A total is every tier A site in
  # BOTH fixtures: fab.sh:3, fab2.sh's two, and now fab.sh:10, the continuation-line control this build added.
  # The number is a property of the fixture set and not of the tree, so adding a fixture moves it by one; it is
  # updated here in the same commit that adds the line, which is the only way a hard-coded expectation stays
  # honest. The ASSERTION is unchanged: the tier A ceiling must still refuse, and it still must say so by name.
  if [ "$rc" = 1 ] && grep -q 'TIER A count 4 is above its ceiling 1' <<<"$out"; then
    echo "PASS selftest: the TIER A ceiling REFUSES when it is exceeded"; pass=$((pass+1))
  else echo "FAIL selftest: the tier A ceiling did not refuse (rc=$rc)"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi
  rm -rf "$SPD"; SPE="$(mktemp -d)"
  out="$(sigpipe_audit "$SPE" 2>&1)"; rc=$?
  if [ "$rc" = 0 ] && grep -q 'sigpipe audit: 0 early-exit' <<<"$out"; then
    echo "PASS selftest: an empty directory reports 0 and refuses nothing"; pass=$((pass+1))
  else echo "FAIL selftest: the empty-directory reading was not a clean 0 (rc=$rc)"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi
  rm -rf "$SPE"
  # 41. AND THE LIVE RATCHET, against the REAL gates/ directory. This is the one case here that can go red on
  #     somebody else's commit, and that is the point of it.
  out="$(sigpipe_audit "$G" 2>&1)"; rc=$?
  if [ "$rc" = 0 ]; then echo "PASS selftest: the real gates/ directory is inside every sigpipe ceiling"; pass=$((pass+1))
  else echo "FAIL selftest: gates/ breached a sigpipe ceiling — fix the site or re-ratchet WITH the reason"; echo "$out" | sed 's/^/      /'; fail=$((fail+1)); fi
  echo "selftest: $pass passed, $fail failed"
  [ "$fail" -eq 0 ] || exit 1
  exit 0
  ;;
*)
  echo "  (on sync and retire, set CT_BUILD=#NNN and CT_RUNID=<your runId> or the row records 'unknown')"
  # EXIT 2, NOT 1, and the number matters [antagonist B's F3 on #461, corrected]. B reported this as exit 0 and
  # MEASURED it is exit 1, so it never was a false-pass route - it fails CLOSED. But 1 is the code gates.sh keys
  # on for "a required gate is MISSING", so a mistyped subcommand made the suite stop and blame the manifest,
  # which is a wrong reason reaching a right verdict - the thing this project calls a trap rather than a check.
  # gates/buildnum.sh and gates/held.sh both exit 2 on an unknown subcommand; this now matches them.
  echo "usage: gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | floor | sigpipe [dir] | selftest"; exit 2;;
esac
