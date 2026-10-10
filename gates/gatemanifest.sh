#!/usr/bin/env bash
# gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | sigpipe [dir] | selftest
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
  local root="${1:-$G}" f n line s tier early
  for f in "$root"/*.sh; do
    [ -e "$f" ] || continue
    n=0
    while IFS= read -r line || [ -n "$line" ]; do
      n=$((n+1))
      s="${line#"${line%%[![:space:]]*}"}"
      case "$s" in '#'*) continue;; esac
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
      if [[ $line =~ \|[[:space:]]*grep[[:space:]]+(-[A-Za-z]*q|-m[[:space:]]*1) ]]; then early=1; fi
      if [[ $line =~ \|[[:space:]]*grep[^|]*\|[[:space:]]*head ]]; then early=1; fi
      [ "$early" = 1 ] || continue
      # THE EXEMPTION IS APPLIED HERE AND NOT EARLIER, and the first draft had it earlier, which is why the
      # fixture count read 11 instead of 8: a line that merely NAMES the token - the three lines of this
      # audit's own code and comment that have to spell it - was being reported as an exempt site. An
      # exemption that fires on a mention rather than on a match inflates the very number it is ratcheted
      # against, which would have let three real sites in behind it. Only a line that WOULD HAVE BEEN a site
      # can be exempt.
      case "$line" in *SIGPIPE-FIXTURE*) printf 'X\t%s\t%s\t%s\n' "${f##*/}" "$n" "$s"; continue;; esac
      tier=D
      case "$line" in *'|| true'*) tier=C;; esac
      case "$line" in *'|| echo'*) tier=B;; esac
      case "$s" in if\ *|while\ *|elif\ *|until\ *) tier=A;; esac
      printf '%s\t%s\t%s\t%s\n' "$tier" "${f##*/}" "$n" "$s"
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
SP_TOTAL_CEIL=17   # RE-RATCHETED 9 -> 17 BY THE INTEGRATION RUN (#513), WITH THE REASON, which is what this
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
SP_FIXTURE_CEIL=9  # early-exit lines carrying SIGPIPE-FIXTURE. Eight are this file's own controls and the
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
    GITROOT="$(git -C "$G" rev-parse --show-toplevel 2>/dev/null || true)"
    if [ -z "$GITROOT" ]; then
      ANCHOR_WHY="$G is not inside a git work tree (a script run from a copied directory is the common case)"
    else
      MANIREL="${M#"$GITROOT"/}"
      if git -C "$GITROOT" cat-file -e "origin/main:$MANIREL" 2>/dev/null; then
        ANCHOR_BASE="origin/main"
      elif git -C "$GITROOT" cat-file -e "HEAD:$MANIREL" 2>/dev/null; then
        ANCHOR_BASE="HEAD"
      else
        ANCHOR_WHY="$MANIREL is tracked at neither origin/main nor HEAD"
      fi
    fi
  fi
  if [ -n "$ANCHOR_BASE" ]; then
    # Field 1 and field 2 of the baseline's rows, and field 7 of the WORKING row for the retire exemption.
    BASEPAIRS="$(git -C "$GITROOT" show "$ANCHOR_BASE:$MANIREL" 2>/dev/null \
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
  # MALFORMED IS IN THIS LINE BECAUSE THIS LINE IS THE CARRIER. gates.sh copies it into the log footer and
  # gates/verify-log.sh reads it back; a count that is not here is invisible to the push gate [B's F2].
  echo "gate manifest: $NREQ required, $NPRES present, $NMISS missing, $NUNL unlisted, $NABS known-absent, $NRET retired, $NUNJ unjustified, $MALFORMED unreadable"
  # VANISHED AND WEAKENED ARE HARD, for the reason the UNLISTED/MISSING asymmetry above already gives: neither
  # happens when a build legitimately adds a gate, so neither can fire on the normal case, and while one stands
  # the suite is covering less than this tree's own history says it must.
  { [ -n "$MISSING" ] || [ -n "$UNJUSTIFIED" ] || [ "$MALFORMED" -gt 0 ] || [ -n "$VANISHED" ] || [ -n "$WEAKENED" ]; } && exit 1
  [ -n "$UNLISTED" ] && exit 2
  exit 0
  ;;
sync)
  WHY="${2:-}"; [ -n "$WHY" ] || { echo "usage: gates/gatemanifest.sh sync 'what these gates cover / why they arrived'"; exit 1; }
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
  exit 0
  ;;
retire)
  g="${2:-}"; WHY="${3:-}"
  [ -n "$g" ] && [ -n "$WHY" ] || { echo "usage: gates/gatemanifest.sh retire <gate.js> 'why it is going'"; exit 1; }
  ALLROWS="$(rows | cut -f1 | tr -d ' \r')"
  grep -qx "$g" <<<"$ALLROWS" || { echo "no row for $g in $M"; exit 1; }   # herestring; the pipe form made a legitimate retire fail
  if [ -f "$REG/$g" ]; then
    echo "REFUSED: $REG/$g is still on disk. Retire the ROW only when the gate is actually going, and in the"
    echo "  same commit, so the diff shows the file leaving and the reason arriving together."
    exit 1
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
  for f in "$REG"/*.js; do [ -e "$f" ] && : > "$T/regress/$(basename "$f")"; done
  pass=0; fail=0
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
  ck 0 "retire works once the gate is gone" "$T/gatemanifest.sh" retire 26-invariants.js "selftest reason"
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
  # 12. and the same flip WITH a reason is accepted, so 11 is keyed to the reason and not to the state.
  python3 - "$T/gate-manifest.tsv" <<'PY3'
import sys
p=sys.argv[1]; ls=open(p).read().split("\n")
for i,l in enumerate(ls):
    if l.startswith("29-draws.js\tabsent"):
        f=l.split("\t"); f[6]="lives on branch X, see job Y"; ls[i]="\t".join(f)
open(p,'w').write("\n".join(ls))
PY3
  ck 0 "the same flip WITH a reason is accepted" "$T/gatemanifest.sh" check
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
    for f in "$REG"/*.js; do [ -e "$f" ] && : > "$GT/gates/regress/$(basename "$f")"; done
    GM="$GT/gates/gatemanifest.sh"; GMF="$GT/gates/gate-manifest.tsv"
    ( cd "$GT" && git init -q -b main . \
        && git -c user.email=selftest@local -c user.name=selftest add -A \
        && git -c user.email=selftest@local -c user.name=selftest commit -qm "selftest seed" ) >/dev/null 2>&1
    reset_gt(){ ( cd "$GT" && git checkout -q -- . && git clean -qfd ) >/dev/null 2>&1; }
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
    ck 0 "ANCHOR: a LEGITIMATE retire runs" "$GM" retire 41-coach-bubble.js "selftest: the legitimate door"
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
    ck 0 "ANCHOR: a legitimate sync adding a gate runs" "$GM" sync "selftest: a build adding a gate"
    out="$("$GM" check 2>&1)"; rc=$?
    if [ "$rc" = 0 ] && grep -q '0 vanished, 0 weakened' <<<"$out"; then
      echo "PASS selftest: ANCHOR is silent on an ADDED gate - the normal case does not fire it"; pass=$((pass+1))
    else echo "FAIL selftest: ANCHOR fired on a legitimately added gate (rc=$rc)"; fail=$((fail+1)); fi
    reset_gt
    # 27. NOT CHECKED, NEVER A PASS AND NEVER A HARD FAILURE. $T is a mktemp copy and not a work tree, so this
    #     is the real degradation path and not a simulation of one. The exit code must be the one the checks
    #     above would have given on their own - here 0 - and the token must say so.
    # $T IS RESTORED FIRST, AND THE FIRST VERSION OF THIS CASE DID NOT DO IT AND FAILED FOR THE WRONG REASON:
    # cases 2 to 19 leave $T carrying a commented-out row and three deleted stubs, so `check` there exits 1 on
    # the DISABLED detector and the case read as "the anchor changed the exit code" when the anchor had not been
    # consulted at all. A control whose setup is not reset measures the previous control.
    cp "$T/kept2.tsv" "$T/gate-manifest.tsv"
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
  spck "4" "$(printf '%s\n' "$spsites" | grep -c . || true)" "DETECTOR: exactly 4 of the fixture's 7 candidate lines are sites, and no others"
  # 40. THE CEILING ITSELF FIRES. Two tier A lines against SP_A_CEIL=1 must be a refusal, otherwise the
  #     ratchet is decoration. The vacuity guard is the pair: an EMPTY directory is clean and says 0.
  cat > "$SPD/fab2.src" <<'FAB2'
#!/usr/bin/env bash
if printf '%s\n' "$a" | grep -qxF "$b"; then echo 1; fi   # SIGPIPE-FIXTURE
while printf '%s\n' "$c" | grep -qxF "$d"; do echo 2; done   # SIGPIPE-FIXTURE
FAB2
  sed 's/[[:space:]]*# SIGPIPE-FIXTURE.*$//' "$SPD/fab2.src" > "$SPD/fab2.sh"; rm -f "$SPD/fab2.src"
  out="$(sigpipe_audit "$SPD" 2>&1)"; rc=$?
  if [ "$rc" = 1 ] && grep -q 'TIER A count 3 is above its ceiling 1' <<<"$out"; then
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
  echo "usage: gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | sigpipe [dir] | selftest"; exit 2;;
esac
