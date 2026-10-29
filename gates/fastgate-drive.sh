#!/usr/bin/env bash
# gates/fastgate-drive.sh - DRIVE gates/fastgate.sh END TO END AND ASSERT ITS VERDICTS. Added #523.
#
# WHY THIS EXISTS. gates/fastgate.sh is the tiered push gate: it decides whether a commit may reach main
# WITHOUT the full suite, which took 107 minutes at #514 and 111 at #522. Nothing in this repository tested it.
# No gate in gates/regress reads it and it had no gates/gate-manifest.tsv row, so GATES GREEN said nothing
# about it - #522 landed 291 lines of that script under a green suite that read none of them, and the job that
# landed them says so in its own outcome ("There is no regression coverage for fastgate.sh at all, so each run
# that touches it re-proves it by hand or not at all").
# jobs/no-test-drives-gates-fastgate-sh-end-to-end-so-a-same-length-wrong-stamp-and-a-planted-register-row-both-take-a-fast-green-2026-10-15
#
# WHAT IT ASSERTS, AND WHY BOTH HALVES. Every case asserts the EXIT CODE **and** a substring of the verdict
# line. Exit code alone is not enough: this script's own convention gives exit 1 to a check that answered
# WRONGLY and exit 2 to one that could not RUN or that routes the commit to the full suite, and those two are
# deliberately not one (the #514 antagonist A veto). A refusal that silently changes from 1 to 2, or a FULL
# that arrives for the wrong reason, is exactly the drift a non-zero test cannot see.
#
# IT TESTS THE COMMITTED CANDIDATE, IN A THROWAWAY CLONE, AND A CLONE RATHER THAN A WORKTREE ON PURPOSE.
# gates/fastgate.sh refuses (FAST GATE REFUSED, exit 1) unless its base equals refs/remotes/origin/main, and a
# linked worktree SHARES the real repository refs - so making the base check true would mean moving this
# repository's own origin/main, which this harness must never do. A clone has its own refs: we point
# refs/remotes/origin/main at the candidate there and the base check is true by construction.
#
# THE FIXTURES COME FROM THE REAL TOOLS, NOT FROM A HAND-TYPED COPY OF THEIR OUTPUT. `fixture-lies` is a mode
# in this project's own taxonomy, and the orchestrator's measurement of this defect used a hand-written
# register row and a stamp three hours ahead of the clock - which the Part 2 bounds would now refuse, so that
# fixture could not have been reused as the positive case. Register rows here are written by
# `gates/buildnum.sh mint` and `gates/buildnum.sh record` RUN INSIDE THE CLONE (so the lock they take is the
# clone's own .buildnum.lock and can never touch a real one), and the stamp is a byte restamp of the base's own
# app.js at its three sites, exactly as fastgate.sh's existing so_selftest fixtures are cut - no esbuild, no
# network. ONE case (H1b) rebuilds for real with gates/build.sh when esbuild is present; where it is absent it
# prints SKIPPED and does NOT count as an ok.
#
# THE CLOCK IS READ ONCE, AT THE START, AND THAT ONE EASTERN MINUTE IS USED BY EVERY CASE. It is a held-fixed
# input [R08]: a harness that re-read the clock per case would have cases that pass or fail on a minute
# boundary, which is the flakiness this project files against.
#
# IT DOES NOT RUN ON THE FAST TIER, DELIBERATELY. gates/fastgate.sh is FORCE by its own classify() ("this
# script gates itself by the full suite") and so are the files Part 2 executes, gates/buildnum.sh among them
# since #523 added it to the blob-identity list. So any commit that changes the behaviour this harness asserts
# ALWAYS pays the full suite, which is where this harness runs. CHECKED, not assumed: classify() returns FORCE
# for gates/fastgate.sh by name, and `gates/*` - which covers gates/buildnum.sh and this file - falls to
# "FORCE gates/ path this script does not recognise". A records-only commit cannot change any verdict here.
#
# NEVER PUSHES, NEVER TOUCHES THE REAL WORKTREE, INDEX OR REFS. Every mutation happens inside the mktemp clone,
# which a trap removes on every exit path including a failed case.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(dirname "$HERE")"

# ── RECURSION GUARD. Controlled by H13. ────────────────────────────────────────────────────────────────────
# One variable does both jobs the job asks for: it is set while this harness invokes fastgate.sh, so being
# entered from inside a fastgate.sh run and being entered with the guard set are the same condition.
if [ -n "${CT_FASTGATE_DRIVE:-}" ]; then
  echo "fastgate-drive.sh: REFUSING - CT_FASTGATE_DRIVE is set ('${CT_FASTGATE_DRIVE}'), so this is either a"
  echo "  re-entry from inside a gates/fastgate.sh run that this harness started, or the guard was set by hand."
  echo "  It does not recurse and it reports no ok lines."
  exit 2
fi

MODE="${1:-fixed}"
case "$MODE" in fixed|unfixed) ;; *) echo "fastgate-drive.sh: usage: gates/fastgate-drive.sh [fixed|unfixed]"; exit 2 ;; esac

GIT="git -C $ROOT"
if [ -n "$($GIT status --porcelain 2>/dev/null)" ]; then
  echo "fastgate-drive.sh: REFUSING - the working tree is not clean, and this harness tests the COMMITTED"
  echo "  candidate. Every verdict it prints would be about a commit that is not what you are looking at."
  $GIT status --porcelain | sed 's/^/    /'
  exit 2
fi
CAND="$($GIT rev-parse HEAD 2>/dev/null)"
[ -n "$CAND" ] || { echo "fastgate-drive.sh: REFUSING - cannot resolve HEAD."; exit 2; }
# THE UPSTREAM SHA IS RESOLVED HERE, IN THE PARENT, AND PASSED INTO THE CLONE, AND THIS IS NOT A DETAIL -
# IT IS A BUG THIS HARNESS HAD ON ITS FIRST RUN AND CAUGHT IN ITS OWN CONTROL. `git clone` of a LOCAL
# repository sets the clone's `origin` to that local path, so the clone's refs/remotes/origin/main tracks the
# parent's LOCAL `main` BRANCH - not the parent's refs/remotes/origin/main. In this container the local branch
# is whatever the routine's clone left behind and is routinely many builds stale: measured here at 87b432a
# (the #514 era) against a real origin/main of 7b2f5b9, EIGHT builds apart. So unfixed mode was comparing
# against a script old enough to predate the register arm split entirely (`grep -c BNRATCHET` 0 against 5),
# which made gates/build-numbers.tsv FORCE and sent SEVEN cases to the full suite for a reason that has
# nothing to do with the defect under test. They were red, and red for the wrong reason, which is the control
# that disturbs something real and leaves the measured quantity untouched [CLAUDE.md, #416].
# THE CHECK BELONGS TO `unfixed` AND IT USED TO FIRE FOR BOTH MODES [#524 second pass, antagonist B
# finding 7]. `fixed` never reads UPSTREAM, so in any plain clone - which is how a reviewer naturally works -
# `bash gates/fastgate-drive.sh fixed` REFUSED at exit 2 because a REMOTE-TRACKING REF was absent. Under
# gates/gates.sh that is exactly the decline branch this same build added, so the suite would print
# "fastgate-drive: SKIPPED - the tiered push gate was not exercised by this suite" and lose the whole block's
# coverage over a ref that has nothing to do with the thing under test. It is not reachable in the live
# repository, which has the ref; it is reachable for everyone else.
UPSTREAM=""
if [ "$MODE" = unfixed ]; then
  UPSTREAM="$($GIT rev-parse --quiet --verify refs/remotes/origin/main 2>/dev/null)"
  if [ -z "$UPSTREAM" ]; then
    echo "fastgate-drive.sh: REFUSING - refs/remotes/origin/main does not resolve in this repository, so the"
    echo "  unfixed baseline cannot be built from the script as it actually ships. Run git fetch origin main."
    exit 2
  fi
  # AND THE BASELINE MUST CARRY THE ARM UNDER TEST, OR ITS REDS MEAN NOTHING [#524, B finding 8]. B ran
  # `unfixed` in a straight `git clone` of this repository and got 2 ok / 16 FAIL against the published
  # 5 ok / 13 FAIL, because a clone's refs/remotes/origin/main tracks the PARENT'S LOCAL `main` branch -
  # 87b432a here, the #514 era - and not the real origin/main at cbeb4ff. `git show 87b432a:gates/fastgate.sh
  # | grep -c BNRATCHET` is 0, so H1/H2/H8b failed for "paths are not records-only", unrelated to anything
  # under test. The baseline sha is printed, so the published count was disclosed rather than false - this is
  # #411/#412's rule, not a lie - but a control whose reds come from the wrong script is not a control.
  if [ "$($GIT cat-file blob "$UPSTREAM:gates/fastgate.sh" 2>/dev/null | grep -ac 'BNRATCHET' || true)" = 0 ]; then
    echo "fastgate-drive.sh: REFUSING - the unfixed baseline $(printf '%.12s' "$UPSTREAM") predates the register"
    echo "  arm entirely (grep -c BNRATCHET = 0), so every case would go red for 'paths are not records-only'"
    echo "  rather than for the defect it targets. In a CLONE, refs/remotes/origin/main tracks the parent's"
    echo "  LOCAL main, which can be many builds behind the real origin/main - that is what this is. Run"
    echo "  'git fetch origin main:refs/remotes/origin/main' in this repository, or run unfixed in one whose"
    echo "  origin/main is the real upstream."
    exit 2
  fi
fi

# THE ONE CLOCK READ. Eastern, through the zone name and never an offset [R52]; this project crosses the DST
# boundary on 1 November 2026 and a hard-coded -4 would be silently an hour wrong after it.
NOWET="$(TZ=America/New_York date '+%Y-%m-%d %H:%M')"
[ -n "$NOWET" ] || { echo "fastgate-drive.sh: REFUSING - cannot read the wall clock."; exit 2; }

W="$(mktemp -d)" || { echo "fastgate-drive.sh: REFUSING - mktemp -d failed."; exit 2; }
cleanup(){ rm -rf "$W"; }
trap cleanup EXIT INT TERM
C="$W/clone"

OK=0; BAD=0; SKIP=0; FAILED_CASES=""
note(){ printf '%s\n' "$*"; }
# THE CASES THIS HARNESS RUNS, DECLARED ONCE, BEFORE ANY OF THEM RUNS [#529, jobs/the-unit-blocks-verdict-bounds-skips-rather-than-the-denominator-so-a-harness-that-stops-silently-is-green-on-one-assertion-2026-10-20].
# gates/gates.sh holds the run to this list: its unit block requires ok + SKIPPED + FAIL to equal the count
# printed from it, so a harness that stops running its cases WITHOUT announcing a skip (a renamed fixture, a
# changed guard, a case loop over an empty list) is RED there and not "green on one assertion of 26". The list
# is the tc() table below less H12, which is the unfixed MODE and has no case body. A new case is added here AND
# to tc(); one added to either alone makes the counts disagree, and the verdict below says which way.
# ── #530. THE DECLARATION IS DERIVED FROM THE tc() TABLE AND IS NO LONGER A HAND-KEPT LIST ─────────────────
# jobs/the-unit-blocks-declared-case-count-is-a-hand-kept-array-so-it-can-be-edited-down-together-with-the-cases-2026-10-21,
# from antagonist A of #529. #529 made gates/gates.sh require ok + SKIPPED + FAIL to equal the count printed
# here, which closes the three ways the harness could stop running cases while the declaration stayed intact.
# The declaration ITSELF was still a hand-maintained array, so it could be edited DOWN TOGETHER WITH the cases:
# A demonstrated it with a stub printing "cases: 1 declared" and one well-formed ok line, and the unit block read
# "fastgate-drive: green (1 ok -> 1 PASS lines, 0 skipped, of 1 declared)" with red 0. What protected it was the
# commit diff alone - the same shape CLAUDE.md records for the gate manifest's two-field hand edit.
#
# SO THERE IS ONE SOURCE NOW: the tc() table below, read out of this script's own text, less H12, which is the
# unfixed MODE and has no case body. A case added to tc() is declared automatically; a case deleted from tc()
# lowers the declaration AND loses its TC id in the same edit, which is visible in the diff as a changed id
# mapping rather than as one number. It does not make the declaration unforgeable - nothing inside one file can -
# but it removes the second place that had to be kept in step by hand, which is what the job asks for.
#
# IT READS THE FILE RATHER THAN `declare -f tc` ONLY BECAUSE OF ORDER: tc() is defined about a hundred lines
# below this point and the declared count is printed above it, so the function does not exist yet here. The sed
# range is the table's own definition, so this is still the table and not a second copy of it.
#
# AND IT ASSERTS ITS OWN DENOMINATOR IS NON-EMPTY, IN ITS OWN LINE AND NOT AS A CONJUNCT [prompts/common]. An
# empty derived list would declare 0 cases, and 0 == 0 against a harness that ran none, so the unit block's
# equality test would read GREEN on nothing - which is the exact vacuity this whole job is about, re-created one
# level up. A table that yields no ids is a damaged script, never a normal state, so it refuses loudly.
CASES=()
while IFS= read -r _cid; do CASES+=("$_cid"); done < <(
  sed -n '/^tc(){/,/^}/p' "$0" | grep -oE '(^|[[:space:]])H[0-9]+b?\)' | tr -d ' \t\r)' | grep -vx H12 || true)
if [ "${#CASES[@]}" -eq 0 ]; then
  echo "fastgate-drive.sh: REFUSING - the tc() table in this script yielded no case ids, so the declared case"
  echo "  count cannot be derived and a declaration of 0 would make the unit block's equality test vacuous."
  echo "  This is a damaged script, not a tree to judge: restore tc() and re-run."
  exit 2
fi

# ── BUILD THE CLONE AND MAKE ITS origin/main THE CANDIDATE. ────────────────────────────────────────────────
git clone --quiet --no-hardlinks --shared "$ROOT" "$C" >/dev/null 2>&1 \
  || { echo "fastgate-drive.sh: REFUSING - could not clone the repository into the scratch directory."; exit 2; }
git -C "$C" -c advice.detachedHead=false checkout --quiet "$CAND" >/dev/null 2>&1 \
  || { echo "fastgate-drive.sh: REFUSING - could not check the candidate out in the clone."; exit 2; }
BASESHA="$CAND"
if [ "$MODE" = unfixed ]; then
  # H12. THE HARNESS MUST BE ABLE TO FAIL. Replace the files this change touches with their origin/main
  # copies and COMMIT that as the clone's base, so the cases run against the script as it ships today.
  # gates/build.sh JOINED THE LIST AT #529, because H38 and H39 drive it directly and could not fail otherwise.
  # H12 IS THIS MODE AND HAS NO CASE BODY, BY DESIGN [#527]. It prints no ok line of its own, so no `fixed` log,
  # which is the only mode gates/gates.sh runs, can carry TC-SUITE-067; its figure is this mode's own count line,
  # and it means something only BEFORE a landing, while origin/main still carries the script being replaced.
  for f in gates/fastgate.sh gates/buildnum.sh gates/build.sh; do
    if git -C "$C" cat-file -e "$UPSTREAM:$f" 2>/dev/null; then
      git -C "$C" show "$UPSTREAM:$f" > "$C/$f" || true
      chmod +x "$C/$f" 2>/dev/null || true
    fi
  done
  git -C "$C" add -A >/dev/null 2>&1
  git -C "$C" -c user.name=ct-drive -c user.email=ct-drive@local commit --quiet --allow-empty \
      -m "UNFIXED BASE: fastgate.sh, buildnum.sh and build.sh as origin/main carries them" >/dev/null 2>&1 \
    || { echo "fastgate-drive.sh: REFUSING - could not commit the unfixed base."; exit 2; }
  BASESHA="$(git -C "$C" rev-parse HEAD)"
fi
git -C "$C" update-ref refs/remotes/origin/main "$BASESHA" \
  || { echo "fastgate-drive.sh: REFUSING - could not point the clone's origin/main at the base."; exit 2; }
note "fastgate-drive.sh mode=$MODE  candidate=$(printf '%.12s' "$CAND")  clone base=$(printf '%.12s' "$BASESHA")  clock=$NOWET ET"
[ "$MODE" = unfixed ] && note "  unfixed baseline taken from origin/main $(printf '%.12s' "$UPSTREAM"), resolved in the parent repository"
note "cases: ${#CASES[@]} declared (DERIVED at run time from the tc() table in this script, less H12, which is this harness's unfixed mode and has no case body)"   # #529, derived at #530

BASESTAMP="$(grep -aoE '#[0-9]{3,4} - 20[0-9]{2}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} ET' "$C/app.js" 2>/dev/null | head -1)"
if [ -z "$BASESTAMP" ]; then
  echo "fastgate-drive.sh: REFUSING - the base app.js carries no build stamp, so no stamp fixture can be cut."
  exit 2
fi
BASENUM="${BASESTAMP#\#}"; BASENUM="${BASENUM%% *}"
BASEDATE="${BASESTAMP#* - }"; BASEDATE="${BASEDATE% ET}"
note "  base stamp $BASESTAMP   base register top #$(grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1}' | sort -n | tail -1)"

# ── CASE MACHINERY. ────────────────────────────────────────────────────────────────────────────────────────
reset_clone(){
  git -C "$C" reset --hard --quiet "$BASESHA" >/dev/null 2>&1
  git -C "$C" clean -qfd >/dev/null 2>&1
  # AND THE BASE REF AND INDEX FLAGS GO BACK TOO [#525]. The cases added below move
  # refs/remotes/origin/main so a fixture can put rows in the BASE rather than in the diff, which is what the
  # held-trees exemption now reads, and one of them sets an update-index flag to hide a doctored file. Without
  # this restore the first such case would silently become the base of every case after it, and a fixture
  # leaking into its successors is exactly the confounder this harness exists to avoid.
  CASEBASE=""
  git -C "$C" update-ref refs/remotes/origin/main "$BASESHA" >/dev/null 2>&1
  git -C "$C" update-index --no-assume-unchanged gates/held-trees.tsv >/dev/null 2>&1 || true
  git -C "$C" update-index --no-skip-worktree gates/held-trees.tsv >/dev/null 2>&1 || true
}
restamp(){ # <new stamp literal>   replaces ALL THREE sites, byte for byte, as so_selftest's fixtures do
  python3 -I - "$C/app.js" "$BASESTAMP" "$1" <<'PY'
import sys
p,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
b=open(p,'rb').read()
o=old.encode('latin1'); n=new.encode('latin1')
if b.count(o)!=3: sys.exit("restamp: base stamp occurs %d times, not 3"%b.count(o))
open(p,'wb').write(b.replace(o,n))
PY
}
commit_case(){ # <subject>
  # EXCLUDE gates/.buildnum.lock [#524, antagonist A finding 7, and it is the mechanism behind a RED THIS
  # HARNESS PRODUCES ON A CORRECT SCRIPT]. gates/buildnum.sh:129 is LOCKD="$HERE/.buildnum.lock", a directory
  # holding a pid file, and it is NOT gitignored - so `git add -A` sweeps it into the fixture commit whenever
  # a mint is in flight, the commit then touches an unrecognised gates/ path, and fastgate exits 2 for
  # "paths are not records-only" instead of the reason the case asserts. A OBSERVED the directory inside the
  # clone mid-run and reproduced the consequence deterministically. In `unfixed` mode that cost H5 its
  # negative control; in `fixed` mode it hits the POSITIVE cases, which expect exit 0, so one leaked lock
  # gives dfail>0 and gates.sh's block then reddens a 70-minute suite over a fixture's lock file. Belt and
  # braces: the path is gitignored as well, so a future caller that forgets this exclusion is still safe.
  git -C "$C" add -A -- ':!gates/.buildnum.lock' >/dev/null 2>&1
  git -C "$C" -c user.name=ct-drive -c user.email=ct-drive@local commit --quiet -m "$1" >/dev/null 2>&1
}
# ONE INVOCATION POINT, so the guard variable and the timeout are set the same way for every case.
CASEBASE=""
run_fastgate(){
  ( cd "$C" && CT_FASTGATE_DRIVE=1 timeout 250 bash "$C/gates/fastgate.sh" "${CASEBASE:-$BASESHA}" 2>&1 )
}
# ── A FIXTURE CAN NOW PUT ROWS IN THE BASE, NOT ONLY IN THE DIFF [#525]. ─────────────────────────
# The held-trees exemption reads gates/held-trees.tsv from the BASE COMMIT since #525, because a row the diff
# supplies must not vouch for the diff's own mints. Every case here shared one global base, so a fixture could
# only ever add rows to the DIFF - which is why H23 planted its vouching rows beside the mint and therefore
# could not tell the two sides apart. new_base() commits the working state as a fresh base and points the
# clone's origin/main at it; CASEBASE makes run_fastgate gate against it; reset_clone puts both back.
new_base(){ # <subject>: commit the working state as this case's base and echo its sha
  commit_case "$1"
  CASEBASE="$(git -C "$C" rev-parse HEAD)"
  git -C "$C" update-ref refs/remotes/origin/main "$CASEBASE" >/dev/null 2>&1
  printf '%s' "$CASEBASE"
}
held_row(){ # <number> <nonce>: one well-formed LIVE held-trees row vouching for that number in FIELD 3
  printf 'deadbeef%s00\t%s\t#%s\t%s\tfastgate-drive-fixture\tFIXTURE ONLY - vouching row for a held mint.\t-\n' \
    "$2" "$(printf 'f%039d' "$2")" "$1" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/held-trees.tsv"
}
reg_row(){ # <number>: one well-formed hand-written `minted` register row
  printf '%s\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tfixture only, never pushed\n' \
    "$1" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
}
reg_top(){ grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1+0}' | sort -n | tail -1; }
# ── THE CASE NAME CARRIES ITS TC ID [#524]. ────────────────────────────────────────────────────────────────
# claude/stories/TEST-CASES.md publishes thirteen TC-SUITE ids for these cases and the LOG CARRIED NONE of
# them, so "TC-SUITE-060 passed" could not be checked against any artefact: a reader had to map H4 -> 060 by
# hand out of a 1,270-line register. One table, one place, and the ok line prints it - which is also what makes
# the two re-measured cells below verifiable by whoever reads the log next.
# A MISSING ID IS NAMED RATHER THAN BLANK, because a silently empty field is how a register and a log drift.
tc(){ # <case> -> its TC id, or a loud placeholder
  case "$1" in
    H1)  printf 'TC-SUITE-057' ;;  H2)  printf 'TC-SUITE-058' ;;  H3)  printf 'TC-SUITE-059' ;;
    H4)  printf 'TC-SUITE-060' ;;  H5)  printf 'TC-SUITE-061' ;;  H6)  printf 'TC-SUITE-062' ;;
    H7)  printf 'TC-SUITE-063' ;;  H8)  printf 'TC-SUITE-064' ;;  H8b) printf 'TC-SUITE-065' ;;
    H9)  printf 'TC-SUITE-066' ;;  H12) printf 'TC-SUITE-067' ;;  H13) printf 'TC-SUITE-068' ;;
    H1b) printf 'TC-SUITE-070' ;;  H14) printf 'TC-SUITE-071' ;;  H15) printf 'TC-SUITE-072' ;;
    H16) printf 'TC-SUITE-073' ;;  H17) printf 'TC-SUITE-074' ;;
    H18) printf 'TC-SUITE-075' ;;  H19) printf 'TC-SUITE-076' ;;  H20) printf 'TC-SUITE-077' ;;
    H21) printf 'TC-SUITE-078' ;;  H22) printf 'TC-SUITE-079' ;;  H23) printf 'TC-SUITE-080' ;;
    H24) printf 'TC-SUITE-081' ;;  H25) printf 'TC-SUITE-082' ;;  H26) printf 'TC-SUITE-083' ;;
    H27) printf 'TC-SUITE-084' ;;  H10) printf 'TC-SUITE-085' ;;  H11) printf 'TC-SUITE-086' ;;
    H28) printf 'TC-SUITE-087' ;;  H30) printf 'TC-SUITE-088' ;;  H31) printf 'TC-SUITE-089' ;;
    H29) printf 'TC-SUITE-091' ;;
    H32) printf 'TC-SUITE-090' ;;
    H33) printf 'TC-SUITE-092' ;;  H34) printf 'TC-SUITE-093' ;;
    H35) printf 'TC-SUITE-094' ;;  H36) printf 'TC-SUITE-095' ;;  H37) printf 'TC-SUITE-096' ;;
    H38) printf 'TC-SUITE-097' ;;  H39) printf 'TC-SUITE-098' ;;
    H40) printf 'TC-SUITE-099' ;;  H41) printf 'TC-SUITE-100' ;;  H42) printf 'TC-SUITE-101' ;;  H43) printf 'TC-SUITE-102' ;;
    H44) printf 'TC-SUITE-103' ;;  H45) printf 'TC-SUITE-104' ;;  H46) printf 'TC-SUITE-105' ;;  H47) printf 'TC-SUITE-106' ;;  H48) printf 'TC-SUITE-107' ;;
    H49) printf 'TC-SUITE-109' ;;  H50) printf 'TC-SUITE-110' ;;  H51) printf 'TC-SUITE-111' ;;
    H52) printf 'TC-SUITE-178' ;;
    H53) printf 'TC-SUITE-185' ;;  H54) printf 'TC-SUITE-186' ;;
    H55) printf 'TC-SUITE-212' ;;
    H56) printf 'TC-SUITE-227' ;;
    H57) printf 'TC-SUITE-234' ;;
    H58) printf 'TC-SUITE-239' ;;  H59) printf 'TC-SUITE-240' ;;
    H60) printf 'TC-SUITE-241' ;;  H61) printf 'TC-SUITE-242' ;;
    H62) printf 'TC-SUITE-246' ;;
    H63) printf 'TC-SUITE-272' ;;  H64) printf 'TC-SUITE-273' ;;  H65) printf 'TC-SUITE-274' ;;  H66) printf 'TC-SUITE-275' ;;
    H67) printf 'TC-SUITE-276' ;;
    *)   printf 'TC-SUITE-UNMAPPED(%s)' "$1" ;;
  esac
}
# ── THE VERDICT DISPLAY HAS NO PIPELINE EITHER [#525]. ─────────────────────────────────
# Four FAIL paths below printed `printf | grep -aE ... | head -3 | sed ...`. `head -3` exits at its third
# match and SIGPIPEs grep, which SIGPIPEs printf, so under `set -uo pipefail` (:47) the pipeline status is
# 141. These are DISPLAY lines whose status nothing reads, so no verdict was ever wrong because of them and I
# claim no measured defect here - but they are the same shape as the P0 this run fixed in gates/fastgate.sh,
# sitting in the file that reports that P0, and leaving them is how a class comes back.
# ONE awk DOES THE MATCH, THE LIMIT AND THE INDENT, so there is no pipe to break: awk exits itself after the
# third line. The herestring is a redirection and not a pipeline, so pipefail does not apply to it - the
# distinction H13's own corrected comment below spells out, measured on bash 5.2.21.
# REFUSING is in show_verdict's alternation [#526]. The harness's OWN refusals say REFUSING, not REFUSED, and
# REFUSED does not match REFUSING - so the H13 FAIL path, which exists to print the reason a drive refused,
# printed NOTHING. Diagnostic loss only: H13 could always still fail and still went red, and no verdict moves.
# THIS COMMENT IS ABOVE THE FUNCTION AND NOT INSIDE IT ON PURPOSE: the control for that fix is
# `sed -n '/^show_verdict()/,+2p' <this file> | grep -c REFUSING` -> 1, and a comment carrying the word inside
# that three-line window is itself counted, which reads 2 and breaks the control it is explaining.
# AND IT PRINTS THE LAST THREE MATCHING LINES, NOT THE FIRST THREE [#527,
# jobs/the-harnesss-verdict-display-truncates-at-the-first-three-matching-lines-so-chatter-buries-the-decisive-one-2026-10-20].
# The decisive verdict comes last: a refusal is printed where it is decided, after any notices. MEASURED: in a 20
# run loop of `fastgate-drive.sh fixed` under load on main 366428f, H21 went red at exit 1 and the three lines
# shown were BUILDNUM_MAX_DELTA notices, so the line that decided it is in no log. Display only: no verdict moves.
show_verdict(){ # <text>: the LAST three verdict lines, indented, with no pipeline anywhere
  awk '/FAST GATE|FULL SUITE|NOT-STAMP-ONLY|REFUSED|REFUSING|BUILDNUM_MAX_DELTA/{v[++n]=$0} END{for(i=(n>3?n-2:1);i<=n;i++) printf "         %s\n", v[i]}' <<<"$1"
}
expect(){ # <case> <expected rc> <expected substring>
  local name="$1" wantrc="$2" want="$3" out rc id
  id="$(tc "$name")"
  out="$(run_fastgate)"; rc=$?
  if [ "$rc" != "$wantrc" ]; then
    printf '  FAIL %s [%s]  exit %s, expected %s\n' "$name" "$id" "$rc" "$wantrc"
    show_verdict "$out"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1
  fi
  # NO SUBPROCESS AND NO PIPELINE FOR THE CONTENT TEST [#524, antagonist B's veto, UPHELD].
  # This was `printf '%s' "$out" | grep -qaF "$want"`. B ran 31 runs and got ONE red with two FAILs - H7 and
  # H14 both reporting "the verdict line does not carry <string>" - while the same log PROVED the string was
  # there, and H4 had passed on the identical substring earlier in that very run. A false RED, which under
  # this build's own gates.sh logic is drc=1 with dfail=2 and reddens an honest tree. 1 in 31 is worse than a
  # high rate, because a reviewer who re-runs twice sees green.
  # THE MECHANISM IS NOT PINNED FOR THIS SITE AND I AM NOT PRETENDING IT IS. B ruled out SIGPIPE here by
  # measurement (the output is ~1 KB, far under the 64 KiB pipe buffer, so the single write cannot block) and
  # ruled out fork failure, grep errors and line corruption. Antagonist A separately pinned a DIFFERENT
  # wrong-reason red to a leaked gates/.buildnum.lock (fixed below), which explains A's H5 but not B's H7/H14,
  # whose logged verdict line carries the string.
  # SO THE FIX REMOVES THE CLASS RATHER THAN THE SUSPECTED CAUSE: a quoted `case` pattern is a literal
  # substring test done by bash itself - no fork, no pipe, no second process to be killed or starved - so it
  # cannot fail in any of the ways a pipeline can. That is the only honest response to a defect whose cause is
  # unknown. The quoting is what makes it literal: inside a pattern a quoted expansion matches byte-for-byte
  # and glob metacharacters in $want are not special, so this is `grep -F` semantics without grep.
  case "$out" in *"$want"*) : ;; *)
    printf '  FAIL %s [%s]  exit %s as expected, but the verdict line does not carry %s\n' "$name" "$id" "$rc" "\"$want\""
    show_verdict "$out"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1 ;;
  esac
  printf '  ok  %s [%s]  (exit %s, %s)\n' "$name" "$id" "$rc" "$want"
  OK=$((OK+1)); return 0
}
# expect_env: as expect, but with one environment variable set for the fastgate call only. H17 needs it and
# nothing else does, so it is a wrapper rather than a parameter on the common path.
expect_env(){ # <case> <expected rc> <expected substring> <VAR=VALUE>
  local name="$1" wantrc="$2" want="$3" kv="$4" out rc id
  id="$(tc "$name")"
  out="$( ( cd "$C" && env "$kv" CT_FASTGATE_DRIVE=1 timeout 250 bash "$C/gates/fastgate.sh" "$BASESHA" 2>&1 ) )"; rc=$?
  if [ "$rc" != "$wantrc" ]; then
    printf '  FAIL %s [%s]  exit %s, expected %s (with %s)\n' "$name" "$id" "$rc" "$wantrc" "$kv"
    show_verdict "$out"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1
  fi
  case "$out" in *"$want"*) : ;; *)                 # in-shell, no pipeline [#524, as expect() above]
    printf '  FAIL %s [%s]  exit %s as expected, but no line carries %s (with %s)\n' "$name" "$id" "$rc" "\"$want\"" "$kv"
    show_verdict "$out"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1 ;;
  esac
  printf '  ok  %s [%s]  (exit %s, with %s, %s)\n' "$name" "$id" "$rc" "$kv" "$want"
  OK=$((OK+1)); return 0
}
# expect_build: as expect, but the verdict is gates/build.sh's own, called with CT_STAMP_TIME set [#529]. H38 and
# H39 need it and nothing else does. The refusal comes before esbuild, so these run in a container without it.
expect_build(){ # <case> <expected rc> <expected substring> <bare number> <CT_STAMP_TIME>
  local name="$1" wantrc="$2" want="$3" out rc id
  id="$(tc "$name")"
  out="$( ( cd "$C" && env CT_RUNID=fastgate-drive CT_STAMP_TIME="$5" timeout 250 bash "$C/gates/build.sh" "#$4" 2>&1 ) )"; rc=$?
  if [ "$rc" != "$wantrc" ]; then
    printf '  FAIL %s [%s]  exit %s, expected %s (gates/build.sh with CT_STAMP_TIME=%s)\n' "$name" "$id" "$rc" "$wantrc" "$5"
    printf '         %s\n' "${out##*$'\n'}"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1
  fi
  case "$out" in *"$want"*) : ;; *)
    printf '  FAIL %s [%s]  exit %s as expected, but gates/build.sh does not say %s\n' "$name" "$id" "$rc" "\"$want\""
    printf '         %s\n' "${out##*$'\n'}"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1 ;;
  esac
  printf '  ok  %s [%s]  (exit %s, %s)\n' "$name" "$id" "$rc" "$want"
  OK=$((OK+1)); return 0
}
# badnum <value>: TRUE (0) when the value is NOT a plausible build number, so a caller reads
#   `if badnum "$H1N"; then <the labelled FAIL>; fi`
# It is the SHAPE test the job's theFix asks the guards to use in place of emptiness, and it is one function so
# the twelve call sites cannot drift from each other - which is the defect #490 recorded about a second
# hand-written list. Three or four digits: the register's own ^#[0-9]{3,4}$ shape, and the bound the pipeline
# this harness used to run had in its grep.
badnum(){ case "${1:-}" in ''|*[!0-9]*) return 0 ;; esac
  { [ "${#1}" -ge 3 ] && [ "${#1}" -le 4 ]; } && return 1 || return 0; }
# AND badnum HAS ITS OWN CONTROL, AT STARTUP, IN BOTH MODES, BECAUSE TWENTY GUARDS NOW DEPEND ON IT [#544,
# item (27)]. A predicate that twenty call sites read is the last place to accept "it looks right": this is
# CLAUDE.md's #391 rule - enumerate what the producer can emit and unit-test the predicate against it,
# INCLUDING the cases it must reject - and it costs microseconds. The three rejected strings in the first list
# are the job's own: `error 2`, `#52 6` and `#10000` all parsed to a NUMBER under the expansions that replaced
# the old grep's {3,4} bound. It REFUSES rather than reporting, because a harness whose own guard is broken
# cannot judge a tree.
for _bn in '' ' ' 'x' '2' '52' '10000' '00001' 'error 2' '1e3' '545x' '-545'; do
  badnum "$_bn" || { echo "fastgate-drive.sh: REFUSING - badnum ACCEPTED [$_bn], which is not a build number."; exit 2; }
done
for _bn in '100' '545' '1234' '9999'; do
  badnum "$_bn" && { echo "fastgate-drive.sh: REFUSING - badnum REJECTED [$_bn], which is a valid build number."; exit 2; }
done
unset _bn
mint_in_clone(){ # echoes the minted bare number, or empty
  # NO PIPELINE HERE EITHER [#525, antagonist B's finding 4]. This was
  #   bash buildnum.sh next | grep -oE '#?[0-9]{3,4}' | head -1 | tr -d '#'
  # a four-stage pipeline with `head -1` in the middle, under `set -uo pipefail` (:47), whose status is
  # then discarded by the `[ -n "$n" ]` test. gatemanifest.sh's own sigpipe audit already flagged it
  # TIER D. B measured ONE flake in TEN identical `unfixed` runs - nine at 5 ok / 20 FAIL / 1 skipped
  # and one at 4 ok / 21 FAIL with H1 added - and could not pin the cause because the detailed log was
  # overwritten, so I am NOT claiming this was it. What is true without that claim: this is the same
  # early-exit-pipe class the P0 of this very run was about, in the harness that reports the P0, and a
  # flaky assertion is worse than no assertion [CLAUDE.md]. The repair removes the class rather than the
  # suspected cause, which is the only honest response to a defect whose cause is unknown.
  # SCOPE, so nobody over-reads it: `fixed` is the only mode gates/gates.sh runs, and B measured it
  # stable at 25 ok / 0 FAIL / 1 skipped in 3 of 3, one of them at loadavg 3.47.
  # ── TWO FAULTS REPAIRED AT #544, item (27) [jobs/mint-in-clones-failure-note-is-captured-into-its-own-
  # return-value-and-its-parse-is-unbounded-2026-10-16, P2, from #525's re-read pair at the diff door].
  # (1) THE FAILURE NOTE WENT TO STDOUT AND WAS CAPTURED INTO THE VARIABLE IT IS MEANT TO LEAVE EMPTY. Every
  # caller is `HxN="$(mint_in_clone)"`, and `note` prints to STDOUT, so `note "    (mint failed: $out)"` was
  # captured instead of reaching the log - the variable was then NON-EMPTY, the `[ -z "$HxN" ]` branch was not
  # taken, the labelled FAIL never printed, and the harness went on to restamp with the ERROR TEXT as the build
  # number. The diff door reproduced it with the function copied byte-for-byte and CT_SRCMD5 carrying a TAB so
  # `mint` refuses. It is PRE-EXISTING and not #525's: a3829c2 shows that line as context. It is filed P2 and
  # not vetoed because nobody could make it fire on an HONEST tree - but the direction is a false red on the
  # one block that authorises a push, which is the expensive direction.
  # (2) THE PARSE LOST THE BOUND THE PIPELINE IT REPLACED HAD. #525 correctly removed a four-stage pipeline
  # with `head -1` in the middle (the early-exit-pipe class), and the parameter expansions that replaced
  # `grep -oE '#?[0-9]{3,4}'` kept the digits and dropped the {3,4}: `error 2` parsed to 2, `#52 6` to 6,
  # `#10000` to 10000. Against the real producer in six register states it never returned a wrong number, so
  # this is latent - one new stdout line ending in a digit makes it reachable.
  # THE CONTRACT IS NOW ENFORCED AT THIS FUNCTION'S OWN EXIT, which is why the callers' `[ -z ]` guards are
  # sound again rather than merely unbroken: on ANY failure path it prints NOTHING to stdout and returns 1, and
  # on success it prints three or four digits and nothing else. Both halves are asserted here rather than
  # trusted at twelve call sites.
  local n out raw
  raw="$(cd "$C" && bash "$C/gates/buildnum.sh" next 2>/dev/null || true)"
  n="${raw%%$'\n'*}"                 # first line, in-shell
  n="${n##*[!0-9#]}"                 # drop any leading prose
  n="${n#\#}"; n="${n%%[!0-9]*}"      # bare digits only
  badnum "$n" && return 1            # digits only, three or four of them - the bound #525's expansions dropped
  out="$(cd "$C" && CT_RUNID=fastgate-drive bash "$C/gates/buildnum.sh" mint "fastgate-drive.sh fixture, never pushed" 2>&1)" || { note "    (mint failed: $out)" >&2; return 1; }
  # ── THE NUMBER RETURNED IS THE ONE `mint` ACTUALLY TOOK, AND IT IS CHECKED AGAINST THE ONE `next` PREDICTED
  # [antagonist A of #544, finding F3, UPHELD]. This line used to read `badnum "$n" && return 1` with the
  # comment "the output contract, checked on the value actually printed" - and BOTH halves of that were false:
  # `n` is not reassigned between the guard above and here, so it could never fire where that one did not, and
  # `n` comes from `next` while `$out` - what mint PRINTED - was captured and thrown away. A copied this
  # function byte-for-byte against a stub where `next` predicts 545 and `mint` takes 546 and says so at exit 0,
  # and the function returned 545: the harness would then restamp with a number nobody minted. Latent against
  # the real tool, where the two agree, which is why it is a finding and not a veto.
  # THE DISAGREEMENT IS ITS OWN REFUSAL rather than a silent preference for either value, because a mint that
  # took a different number than `next` predicted means another writer moved the register under this function,
  # and a fixture built on either reading would be built on a race.
  # THE FIRST LINE ONLY, exactly as the `next` parse above does it, and that is not a stylistic echo: `mint`
  # prints `#NNN` on line one and then three lines of prose that CONTAIN THE SAME NUMBER AGAIN. A parse that
  # flattened the newlines first - which my first draft of this repair did - leaves the trailing digits of the
  # last number in the prose, so the check would have compared the wrong token and refused an honest mint.
  # Measured against the real tool in a clone before this was written.
  local got
  got="${out%%$'\n'*}"
  got="${got##*[!0-9#]}"; got="${got#\#}"; got="${got%%[!0-9]*}"
  if badnum "$got"; then
    note "    (mint printed no usable number: $out)" >&2; return 1
  fi
  if [ "$got" != "$n" ]; then
    note "    (mint took #$got while next predicted #$n - the register moved under this function)" >&2; return 1
  fi
  printf '%s' "$got"
}
record_in_clone(){ # <num> <bundle md5-12> <source md5-12>
  ( cd "$C" && CT_RUNID=fastgate-drive bash "$C/gates/buildnum.sh" record "$1" "$2" "$3" >/dev/null 2>&1 ) || return 1
}
md5_12(){ md5sum "$1" 2>/dev/null | cut -c1-12; }

# ── THE CASES. Every "TODAY" figure below is what origin/main's script answers, measured, not guessed. ──────
# H1  POSITIVE, HONEST REBUILD. Held fixed: the candidate base, the clone, the working directory, the clock
#     minute and the log directory. Varied: the stamp (the number buildnum.sh next prints IN THE CLONE, the one
#     Eastern minute, all three sites) and register rows written by the real mint and record.
reset_clone
H1N="$(mint_in_clone)"
if badnum "$H1N"; then
  note "  FAIL H1 [$(tc H1)]  could not mint a fixture number in the clone, so the positive case cannot be built"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H1"
else
  restamp "#$H1N - $NOWET ET" || true
  record_in_clone "$H1N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
  commit_case "H1 honest rebuild: stamp #$H1N and its register rows"
  expect H1 0 "FAST GATE GREEN"
fi

# H2  POSITIVE, REGISTER ONLY. The ordinary records-only run: one minted row, no bundle change. The new arm
#     must not tax it - APPDIFF is empty so the stamp block never runs, and only Part 2(c) applies.
reset_clone
H2N="$(mint_in_clone)"
if badnum "$H2N"; then
  note "  FAIL H2 [$(tc H2)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H2"
else
  commit_case "H2 register only: one minted row for #$H2N, no bundle change"
  expect H2 0 "FAST GATE GREEN"
fi

# H3  NEGATIVE, LOWER NUMBER. Same length, a lower number, real rows so the number is the only thing wrong.
#     TODAY on origin/main: exit 0 FAST GATE GREEN (measured). This is #521 antagonist A's case, which took
#     exit 2 before the register left the FORCE arm and has been live since.
reset_clone
H3N="$(mint_in_clone)"
restamp "#001 - $NOWET ET" || true
[ -n "$H3N" ] && record_in_clone "$H3N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")"
commit_case "H3 lower number: stamp #001"
expect H3 2 "LOWER than the base"

# H4  NEGATIVE, FUTURE DATE. Plus-one number and the real rows, so the DATE is the only thing varied.
reset_clone
H4N="$(mint_in_clone)"
if [ -n "$H4N" ]; then
  restamp "#$H4N - 2031-01-01 00:00 ET" || true
  record_in_clone "$H4N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")"
  commit_case "H4 future date: stamp #$H4N dated 2031"
  expect H4 2 "later than the wall clock"
else
  note "  FAIL H4 [$(tc H4)]  could not mint a fixture number in the clone"; BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H4"
fi

# H5  NEGATIVE, DATE BEFORE THE BASE.
reset_clone
H5N="$(mint_in_clone)"
# THE FIXTURE DATE IS NAIVE ARITHMETIC AND MUST NOT GO THROUGH A ZONE. A build stamp is a naive
# "YYYY-MM-DD HH:MM" in Eastern, and subtracting a day from it is string arithmetic, not an instant. My first
# version wrote `date -d 'TZ="America/New_York" $BASEDATE - 1 day'`, and GNU date does NOT combine a TZ prefix
# with a relative offset the way it looks: it returned 2026-10-15 21:37 for a base of 2026-10-14 20:37 - a date
# in the FUTURE - so H5 exercised H4's future-date rule instead of the before-the-base rule it exists for, and
# the harness caught it by asserting the verdict LINE and not merely the exit code. That is the whole argument
# for asserting both, arriving on this harness's first run.
  H5D="$(python3 -I -c "
import datetime,sys
print((datetime.datetime.strptime(sys.argv[1],'%Y-%m-%d %H:%M')-datetime.timedelta(days=1)).strftime('%Y-%m-%d %H:%M'))
" "$BASEDATE" 2>/dev/null)"
if [ -n "$H5N" ] && [ -n "$H5D" ]; then
  restamp "#$H5N - $H5D ET" || true
  record_in_clone "$H5N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")"
  commit_case "H5 date before the base: stamp #$H5N dated $H5D"
  expect H5 2 "EARLIER than the base stamp date"
else
  note "  FAIL H5 [$(tc H5)]  could not build the fixture (number '$H5N', date '$H5D')"; BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H5"
fi

# H6  NEGATIVE, STAMP WITH NO REGISTER ROW. Plausible number and date; nothing appended to the register. This
#     is the case the withdrawn mitigation used to cover: a real build also writes a row, and a row forced FULL.
reset_clone
# ONE PAST THE SERIES SINCE #529. A head number inside the base series is refused by plaus_pred before this arm
# is reached (H44), so on a base whose register top sits above its stamp the base stamp plus one stopped testing
# the second witness. The number past the higher of the two is the one a fresh mint would take.
H6REF="$(reg_top)"
{ [ -n "$H6REF" ] && [ "$H6REF" -gt "$BASENUM" ]; } || H6REF="$BASENUM"
restamp "#$((H6REF + 1)) - $NOWET ET" || true
commit_case "H6 stamp with no register row: #$((H6REF + 1))"
expect H6 2 "no \`built\` row"

# H7  NEGATIVE, ROW THAT DOES NOT MATCH THE BUNDLE. The row exists for the right number; its bundle field names
#     a different artefact. This is the one that stops a row being borrowed from another build.
reset_clone
H7N="$(mint_in_clone)"
# THE BORROWED BUNDLE IS A REAL ONE SINCE #529. This recorded ffffffffffff, and since #529 the register arm refuses a
# built row naming a bundle nothing holds at exit 1 (H36, H43) before this arm is reached, so the case had stopped
# testing the second witness. The base's own app.js md5 is a bundle another build really made, which is what
# "borrowed" means; the register arm vouches for it and the stamp arm must still send the commit FULL.
H7B="$(md5_12 "$C/app.js")"
if [ -n "$H7N" ]; then
  restamp "#$H7N - $NOWET ET" || true
  record_in_clone "$H7N" "$H7B" "$(md5_12 "$C/chess.jsx")"
  commit_case "H7 register row names the wrong bundle: #$H7N"
  expect H7 2 "whose bundle field is"
else
  note "  FAIL H7 [$(tc H7)]  could not mint a fixture number in the clone"; BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H7"
fi

# H8  NEGATIVE, PLANTED ROW. One well-formed hand-written row, nothing else changed. It must be REFUSED at
#     exit 1 and not routed to a suite that does not check the register. The second assertion is the wedge the
#     refusal prevents: in that same tree buildnum.sh next refuses, and the register is append-only, so the row
#     could not be taken back out once it landed.
reset_clone
printf '999\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tplanted row, fixture only, never pushed\n' \
  "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
commit_case "H8 planted register row 999"
# THE EXPECTED TEXT CHANGED WITH THE BOUND [#524]. This read "series margin", which was the right assertion
# while the bound WAS the margin. The bound is now contiguity, so that substring no longer appears and this
# case would have gone red on a correct script - the failure mode the job calls a stale pin. Asserting the
# verdict LINE and not merely the exit code is what makes that visible rather than silent.
expect H8 1 "an honest mint would have made it"
H8NEXT_RC=0
( cd "$C" && bash "$C/gates/buildnum.sh" next >/dev/null 2>&1 ) || H8NEXT_RC=$?
if [ "$H8NEXT_RC" = 2 ]; then
  printf '  ok  %s [%s]  (exit 2, %s)\n' "H8b" "$(tc H8b)" "buildnum.sh next refuses on the planted tree - the wedge the refusal prevents"
  OK=$((OK+1))
else
  printf '  FAIL %s [%s]  buildnum.sh next exited %s on the planted tree, expected 2\n' "H8b" "$(tc H8b)" "$H8NEXT_RC"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H8b"
fi

# H9  NEGATIVE, ONE CODE BYTE OUTSIDE THE STAMPS. The control that the new arm loosened nothing: this must
#     still reach the full suite through so_pred, before plausibility is ever consulted.
#     TODAY on origin/main: exit 2 (measured). It must stay 2.
reset_clone
python3 -I - "$C/app.js" <<'PY'
import sys
p=sys.argv[1]; b=open(p,'rb').read()
i=b.find(b'function ')
if i<0: sys.exit("no 'function ' in app.js")
open(p,'wb').write(b[:i+9]+b' '+b[i+9:])
PY
commit_case "H9 one code byte outside the stamps"
expect H9 2 "NOT-STAMP-ONLY"

# H1b POSITIVE, A REAL REBUILD THROUGH gates/build.sh. The strongest positive available, because the stamp and
#     the register row are both written by the tools the live path uses rather than by this harness. It needs
#     esbuild; where that is absent it prints SKIPPED and does NOT count as an ok, so a container without it
#     cannot quietly turn this suite green on fewer cases.
reset_clone
if [ -x "$C/node_modules/.bin/esbuild" ] || command -v esbuild >/dev/null 2>&1; then
  H1BN="$(mint_in_clone)"
  if [ -n "$H1BN" ] && ( cd "$C" && CT_RUNID=fastgate-drive bash "$C/gates/build.sh" "#$H1BN" >/dev/null 2>&1 ); then
    commit_case "H1b real rebuild through build.sh at #$H1BN"
    expect H1b 0 "FAST GATE GREEN"
  else
    note "  SKIPPED H1b [$(tc H1b)]  esbuild is present but gates/build.sh did not produce a bundle here; not counted as ok"
    SKIP=$((SKIP+1))
  fi
else
  note "  SKIPPED H1b [$(tc H1b)]  esbuild is not available in this container, so a real rebuild cannot be fixtured; not counted as ok"
  SKIP=$((SKIP+1))
fi

# ── THE FOUR CASES #524 ADDS, ONE PER UPHELD FINDING AGAINST #523's GATED TREE. ────────────────────────────

# H14 NEGATIVE, FUTURE DATE BY THREE HOURS. THE CONTROL FOR THE DEFECT THIS WHOLE BUILD EXISTS TO CLOSE.
#     H4 already covers a future date and CANNOT SEE THIS CLASS: it uses 2031-01-01, five years out, which
#     fails the lexicographic base-date rule whatever the wall-clock bound says. The untested band was +10
#     minutes to +4h10m - the only band a PLAUSIBLE wrong stamp lives in - and it was open because the bound
#     was formatted in UTC. +3 hours sits squarely inside it and is the orchestrator's own named fixture.
#     ON THE UNFIXED SCRIPT this takes exit 0: origin/main's fastgate.sh carries no plausibility arm at all.
reset_clone
H14N="$(mint_in_clone)"
H14D="$(TZ=America/New_York date -d 'now + 3 hours' '+%Y-%m-%d %H:%M' 2>/dev/null)"
if [ -n "$H14N" ] && [ -n "$H14D" ]; then
  restamp "#$H14N - $H14D ET" || true
  record_in_clone "$H14N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")"
  commit_case "H14 future date by three hours: stamp #$H14N dated $H14D"
  expect H14 2 "later than the wall clock"
else
  note "  FAIL H14 [$(tc H14)]  could not build the fixture (number '$H14N', date '$H14D')"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H14"
fi

# H15 NEGATIVE, BOTH WRONGS IN ONE COMMIT: a bad stamp AND a planted register row. THE ORDERING CASE.
#     The harness tested each alone - H3 the stamp, H8 the row - and had no case with both, which is exactly
#     how the ordering defect survived a green suite. Before the reorder the stamp arm exited 2 first and
#     Part 2(c) never ran, so the planted row LANDED. It must now be exit 1, the register's refusal, because
#     exit 1 means REFUSE and exit 2 only means pay for the suite - and the suite does not check the register.
reset_clone
printf '999\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tplanted row beside a bad stamp, fixture only, never pushed\n' \
  "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
restamp "#001 - $NOWET ET" || true
commit_case "H15 planted register row 999 AND stamp #001 in one commit"
expect H15 1 "an honest mint would have made it"

# H16 NEGATIVE, A PLANTED ROW INSIDE THE OLD MARGIN. The margin was 10, so a row at top+5 was ACCEPTED and
#     burned four numbers silently and permanently - measured by #523's antagonist B, which appended `530` to a
#     base topping out at #523 and got FAST GATE GREEN, after which buildnum.sh next returned #531 with four
#     numbers reading free. H8's 999 is far out of band and could never see this. Under contiguity the only
#     honest first new number is top+1, so this is refused and the number it names is printed.
reset_clone
H16TOP="$(grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1}' | sort -n | tail -1)"
if [ -n "$H16TOP" ]; then
  printf '%s\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tplanted row five above the top, inside the old margin of ten, fixture only\n' \
    "$((H16TOP + 5))" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
  commit_case "H16 planted register row #$((H16TOP + 5)), five above the base top and inside the old margin"
  expect H16 1 "an honest mint would have made it"
else
  note "  FAIL H16 [$(tc H16)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H16"
fi

# H17 THE OVERRIDE IS NAMED AND DOES NOT BUY ANYTHING. BUILDNUM_MAX_DELTA used to widen the margin this arm
#     read, so BUILDNUM_MAX_DELTA=1000 took H8's own 999 fixture to exit 0 while the log said only what the
#     resulting margin was - buildnum.sh warns loudly on stderr in that situation and this script did not.
#     TWO ASSERTIONS IN ONE CASE, deliberately: the refusal must STILL hold (contiguity does not read the
#     margin, so the override cannot move it) and the log must SAY the override is live. Asserting only the
#     second would pass on a script that still honoured it.
reset_clone
printf '999\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tplanted row under a widened margin, fixture only\n' \
  "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
commit_case "H17 planted register row 999 with BUILDNUM_MAX_DELTA=1000"
# RE-PINNED [#524 second pass]: the notice used to be built by a SECOND re-grep of BN_DEFAULT_DELTA inside the
# register arm, printing "BUILDNUM_MAX_DELTA=1000 is set in the environment and the default is 10". That
# duplicate is exactly why this case stayed green while plaus_pred's identical claim was dead in a subshell, so
# the duplicate is gone and both sites now read one string from plaus_delta. The wording changed with it. THIS
# IS THE SECOND STALE PIN THIS HARNESS HAS CAUGHT ON A CORRECT SCRIPT (H8 was the first, at the contiguity
# change) and both were caught because every case asserts the verdict LINE and not merely the exit code.
expect_env H17 1 "OVERRIDDEN by BUILDNUM_MAX_DELTA=1000 in the environment" "BUILDNUM_MAX_DELTA=1000"

# H18 NEGATIVE, A GAP FILL BELOW THE TOP - THE DOOR #524's FIRST BOUND LEFT WIDE OPEN. Antagonist A measured
#     NINE gaps in this register (126, 256, 257, 258, 278, 303, 304, 361, 363), committed one `363 minted` row
#     in a clone and got EXIT 0 FAST GATE GREEN under a log that POSITIVELY ASSERTED "every new number in this
#     diff is contiguous with the base register top" - a check the code skipped for any number at or below the
#     top. `buildnum.sh check 363` then went from free to ISSUED, permanently, because the register is
#     append-only. The expected verdict is exit 2 and NOT exit 1: #454's census (f6127fcb36, a records-only
#     commit touching this file and nothing else) filled 123 such numbers legitimately, so refusing the shape
#     would refuse honest work. What must never happen again is the FAST door plus a false assertion.
#     THE GAP IS FOUND, NOT HARD-CODED: a literal 363 would stop testing anything the day someone fills it.
reset_clone
H18TOP="$(grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1+0}' | sort -n | tail -1)"
H18GAP="$(grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | cut -f1 | awk 'NF && $1 ~ /^[0-9]+$/ {print $1+0}' | sort -n -u \
          | awk -v t="$H18TOP" 'BEGIN{for(i=1;i<=t;i++) want[i]=1} {delete want[$1]} END{m=0; for(k in want) if(k+0>m) m=k+0; if(m) print m}')"
if [ -n "$H18GAP" ] && [ "$H18GAP" -gt 0 ] 2>/dev/null; then
  printf '%s\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tplanted row filling a gap BELOW the base top, fixture only\n' \
    "$H18GAP" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
  commit_case "H18 planted register row #$H18GAP, a free number BELOW the base top of #$H18TOP"
  expect H18 2 "fills a gap and turns a number"
else
  note "  FAIL H18 [$(tc H18)]  could not find a free number below the base top of '${H18TOP:-?}' to plant"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H18"
fi

# H19 NEGATIVE, THE DENSE ATTACK A ACTUALLY RAN. A planted ten CONTIGUOUS rows at top+1..top+10 and took EXIT 0
#     FAST GATE GREEN, moving `buildnum.sh next` from #525 to #535: ten numbers burned in one commit, strictly
#     worse than the six H16's sparse form was written for, because the per-position bound (`rnum > top + i`)
#     is satisfied by every row of a dense run and NOTHING bounded how many rows there were. Four is used here
#     rather than ten because four is the first count the measured ceiling refuses - #469 and #480 each
#     appended three legitimately - so this case pins the ceiling itself and not merely some large number.
reset_clone
H19TOP="$(grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1+0}' | sort -n | tail -1)"
if [ -n "$H19TOP" ]; then
  for k in 1 2 3 4; do
    printf '%s\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tdense planted run, row %s of 4, fixture only\n' \
      "$((H19TOP + k))" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$k" >> "$C/gates/build-numbers.tsv"
  done
  commit_case "H19 four contiguous planted rows #$((H19TOP+1))..#$((H19TOP+4))"
  expect H19 1 "NEW build numbers ABOVE the base top"
else
  note "  FAIL H19 [$(tc H19)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H19"
fi

# H20 POSITIVE, AND IT IS THE CASE THAT CAUGHT MY OWN FIRST BOUND. My first answer to A's dense attack was a
#     flat ceiling of two new numbers per commit, justified in the comment by "nothing in this project's
#     history appends three" - a sentence I had not measured. Measured, #480 (dc0ece3609) and #469 (21b5967513)
#     each append THREE numbers above the then-top, and #454's census appends 123 below it. So the bound this
#     case proves is not "small is good": it is that the ceiling sits ABOVE every shape this register has
#     actually produced. A guard that refuses honest work is worse than no guard, and the accept direction is
#     the one no attacker will ever report for me. The assertion names the COUNT, so it goes red both if three
#     is refused and if the success line stops saying how many numbers it bounded.
reset_clone
H20TOP="$(grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1+0}' | sort -n | tail -1)"
if [ -n "$H20TOP" ]; then
  for k in 1 2 3; do
    printf '%s\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tthe #469/#480 shape, row %s of 3, fixture only\n' \
      "$((H20TOP + k))" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$k" >> "$C/gates/build-numbers.tsv"
  done
  commit_case "H20 three contiguous minted rows #$((H20TOP+1))..#$((H20TOP+3)), the #469/#480 shape"
  expect H20 0 "3 new build number(s) above the base register"
else
  note "  FAIL H20 [$(tc H20)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H20"
fi

# H21 THE OVERRIDE IS NAMED ON THE PATH THAT REGRESSED, NOT ONLY ON A REFUSAL. H17 asserts the notice on a
#     REFUSED tree and passed throughout - on the register arm's own duplicate re-grep - while the identical
#     claim in plaus_pred was dead, because plaus_delta's globals were assigned inside a command substitution.
#     So the case that was missing is the GREEN one: a stamp-only commit under BUILDNUM_MAX_DELTA, whose
#     verdict line must carry the provenance rather than an empty bracket. Both antagonists vetoed on this
#     independently and NOTHING in this harness could see it: `grep -c 'OVERRIDDEN by'` was 0.
reset_clone
H21N="$(mint_in_clone)"
if [ -n "$H21N" ]; then
  restamp "#$H21N - $NOWET ET" || true
  record_in_clone "$H21N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || true
  commit_case "H21 honest rebuild to #$H21N, judged with BUILDNUM_MAX_DELTA=20 set"
  # THE SUBSTRING IS NOW ONE ONLY THE GREEN STAMP PATH CAN PRINT [#525, the reviewer's F4, UPHELD].
  # H21 asserted "OVERRIDDEN by BUILDNUM_MAX_DELTA=20", and THE REGISTER ARM PRINTS THAT SAME STRING from the
  # same variable (gates/fastgate.sh:828, "register plausibility [#524]: $PLAUS_DELTA_SRC."). H21's fixture
  # appends register rows, so the register arm runs and prints it - and the reviewer showed H21 still ok 1 of 1
  # with the subshell bug put back by
  #   sed -i '/no subshell \[#524\]$/a PLAUS_DELTA_SRC=""' gates/fastgate.sh
  # i.e. THE CONTROL COULD NOT FAIL FOR ITS OWN DEFECT - this project's oldest trap, where the thing being
  # detected is also printed by a path the assertion cannot distinguish.
  # plaus_pred's success line (gates/fastgate.sh:759) is the only place the margin and its provenance appear
  # TOGETHER, as "(step N over #REF, the higher of the base stamp and the base series top #TOP; margin D [SRC])"
  # since #529; the register arm prints no "margin D [" at all. Asserting the
  # PAIR pins the branch, which is CLAUDE.md's rule against an alternation that matches every branch.
  expect_env H21 0 "margin 20 [OVERRIDDEN by BUILDNUM_MAX_DELTA=20" "BUILDNUM_MAX_DELTA=20"
else
  note "  FAIL H21 [$(tc H21)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H21"
fi

# H22 NEGATIVE, A ROW WHOSE NUMBER OVERFLOWS 64-BIT ARITHMETIC. 18446744073709552016 is 2^64 + 400 and 400 is
#     in the base register, so `$((10#...))` wrapped to 400, the membership test matched, the row was skipped
#     as "a number the base already carries" and the run took EXIT 0 FAST GATE GREEN under a log asserting
#     "0 new build number(s)" - while `buildnum.sh next` went BACKWARDS from #525 to #401. Measured by
#     antagonist A end to end in a clone. Refused on the FIELD WIDTH now, because no arithmetic repair makes a
#     20-digit build number meaningful.
reset_clone
printf '18446744073709552016\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\t2^64+400, where 400 is in the base register, fixture only\n' \
  "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
commit_case "H22 planted register row 18446744073709552016 (= 2^64 + 400)"
expect H22 1 "more than six digits"

# H23 POSITIVE, AND IT IS THE ACCEPT CASE FOR THE ONE FINDING I ALMOST SHIPPED AS A RESIDUAL. Four contiguous
#     rows above the top, with gates/held-trees.tsv vouching for three of them - the shape a run inherits after
#     three consecutive HELD runs, which this register records happening for real (#456-#459). Antagonist A's
#     NOTE 5: the ceiling was measured over pushes that LANDED, which by construction cannot contain a held
#     run's unlanded mint, and exit 1 is terminal with no full-suite escape. Measured how near it was: this
#     branch adds exactly #523 and #524 above main's top, #523 already has a held row, and two more held runs
#     reach four. So this case is the project's own writer being blocked by my guard in two runs' time, and it
#     must go GREEN. H19 (four rows, NO held rows) must stay RED in the same run - the pair is what shows the
#     exclusion discriminates rather than widens.
reset_clone
H23TOP="$(grep -v '^[[:space:]]*#' "$C/gates/build-numbers.tsv" | awk -F'\t' 'NF>=2 && $1 ~ /^[0-9]+$/ {print $1+0}' | sort -n | tail -1)"
if [ -n "$H23TOP" ]; then
  # THE VOUCHING ROWS GO IN THE BASE, NOT BESIDE THE MINT [#525]. They used to be appended in the SAME commit
  # as the four mints, which the reviewer caught (its F3): since #525 the exemption reads gates/held-trees.tsv
  # from the BASE COMMIT, so a fixture that supplies its own vouchers tests nothing a real tree can do, and
  # before #525 it could not tell a row the base holds from one the diff adds. H27 below is the negative twin
  # of this change: the same shape with the rows in the DIFF, which must be REFUSED.
  for k in 1 2 3; do held_row "$((H23TOP + k))" "$k"; done
  new_base "H23 base: held-trees rows vouching for #$((H23TOP+1))..#$((H23TOP+3))" >/dev/null
  for k in 1 2 3 4; do reg_row "$((H23TOP + k))"; done
  commit_case "H23 four contiguous mints #$((H23TOP+1))..#$((H23TOP+4)), vouching rows already in the base"
  # NOW exit 0, AND THAT IS THE POINT OF MOVING THE ROWS [#525]. While the fixture planted its vouchers beside
  # the mint, the diff touched gates/held-trees.tsv, which classify() deliberately FORCES - "a GUARD REGISTER
  # whose protection lives in its row VALUES" - so the case could only ever assert exit 2, i.e. that the arm
  # had not REFUSED. With the vouchers in the base the diff is records-only and the case asserts the accept
  # direction for real: a FAST GREEN, with three of the four mints excused and ONE counting.
  # H19 IS THE DISCRIMINATING TWIN AND MUST STAY RED at exit 1 in the same run: four UNVOUCHED rows. H27 is
  # the other twin: the same four with the vouchers in the DIFF instead of the base. One accept, two refusals,
  # and the three together are what show the exemption discriminates rather than widens.
  expect H23 0 "1 of them count toward the ceiling of three"
else
  note "  FAIL H23 [$(tc H23)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H23"
fi

# H24 NEGATIVE, AND IT IS THE P0 THIS RUN EXISTS FOR. The SAME planted register row as H8, carried by a commit
#     that also changes 6000 other records paths [5000 until the #529 review]. That is the one confounder every
#     other case holds fixed: a
#     SMALL diff. gates/fastgate.sh entered the register arm only if the changed-path list, piped into
#     `grep -qxF` under `set -uo pipefail`, matched - and past the 64 KiB pipe buffer grep exits at its first
#     match, printf takes SIGPIPE, the pipeline reads 141, the test reads FALSE, and the WHOLE arm is skipped
#     SILENTLY. MEASURED before the fix, with the mutation in the base so fastgate.sh is outside the changed
#     set: EXIT 0 FAST GATE GREEN, 3 of 3, at 5001 changed paths, with `buildnum.sh next` then exiting 2 in
#     that same tree - the wedge landing under a green. With the fix: exit 1 REFUSED, 3 of 3. The reviewer
#     measured the bare pipeline losing the race 3 of 5 times at 3000 paths and 5 of 5 at 5000.
#     THE DIRECTION IS WHAT MAKES IT A P0: the failure SKIPS a refusal, so the bigger the commit the weaker the
#     gate, and one bulk records commit reaches it by accident rather than on purpose.
#     THE PADDING PATHS ARE RECORDS PATHS on purpose, so that the only reason this commit could be refused is
#     the register row itself. If they forced the suite the case would pass for the wrong reason.
reset_clone
H24TOP="$(reg_top)"
if [ -n "$H24TOP" ]; then
  # THE ROW MUST BE ONE THE ARM WOULD REFUSE, AND MY FIRST FIXTURE WAS NOT [#525, caught by running it].
  # It planted #$((H24TOP+1)), which is exactly what an honest mint produces: contiguous and inside the
  # ceiling, so the arm was RIGHT to pass it and the case went green for a correct reason. A case whose
  # fixture is legal cannot detect a skipped refusal - the empty-denominator shape, one level up. So this
  # plants a NON-CONTIGUOUS number, the same shape H8 uses, which the arm must refuse on contiguity alone.
  H24ROW=$((H24TOP + 474))
  reg_row "$H24ROW"
  # THE PADDING PREFIX IS LOAD-BEARING AND MY FIRST CHOICE DEFEATED THE CASE [#525, antagonist A's
  # VETO, UPHELD AND REPRODUCED]. The defect is a SIGPIPE race, so it needs `grep -q` to EXIT EARLY,
  # which needs the TARGET EARLY in the list. `git diff --name-only` emits sorted paths, and
  # `claude/agents/drive-pad/...` sorts BEFORE `gates/build-numbers.tsv` - so the target was the LAST
  # of 5001 lines, grep read the whole stream, printf had already finished, there was NO SIGPIPE, and
  # the arm ran normally. H24 asserted exit 1 against a script that answers exit 1 either way.
  # MEASURED, 40 trials per ordering at the same payload size: with the target at line 5001 the test
  # reads TRUE 40 of 40 (the race never fires); with it at line 1, TRUE 2 of 40. A reproduced the case
  # staying `ok` with the P0 fully reverted in the base, which is the definition of a harness lie.
  # AND IT INVALIDATED A PUBLISHED NUMBER: TC-SUITE-081's "40 of 40 ... target at list position 1" was
  # measured on the orchestrator's `zzz/` fixture and then carried across to this one after I changed
  # the prefix - the threshold-belongs-to-its-instrument rule, committed by moving the instrument.
  # `zzz-drive-pad/` sorts after `gates/` and is still RECORDS (classify()'s `*/*.md` arm).
  mkdir -p "$C/zzz-drive-pad"
  H24N=0
  while [ "$H24N" -lt 6000 ]; do   # 5000 until the #529 review; THE FOURTH CHECK below says why
    H24N=$((H24N + 1))
    : > "$C/zzz-drive-pad/pad-$H24N.md"
  done
  commit_case "H24 planted register row #$H24ROW plus 6000 records paths in one commit"
  # FOUR SELF-CHECKS SINCE #529, AND THE FOURTH IS THE OPERATIVE ONE [jobs/h24s-byte-check-measures-the-whole-list-so-a-fixture-passing-all-three-self-checks-still-misses-the-race-2026-10-20].
  # The history below is kept because each step of it was a fixture that passed the checks of its day.
  # THREE SELF-CHECKS, AND ALL THREE ARE PROXIES [#526]. THE BYTE-LENGTH CHECK IS THE CLOSEST OF THE THREE AND IS
  # STILL NOT THE THING [#527: this line named it by an ordinal, and in the order a reader meets the checks, the
  # if/elif chain below and the register cell alike, that ordinal names the POSITION check].
  # WITHDRAWN IN THE LINE THAT CARRIED IT [R18]: this comment first read "BYTES IS THE OPERATIVE ONE ... DO NOT
  # ADD A FOURTH PROXY", and both of this build's blind antagonists found that wrong, independently, from two
  # different doors, and I reproduced it before changing a word.
  # The variable this case depends on is the bytes STILL UNWRITTEN WHEN `grep -q` EXITS - that is what makes
  # the writer take SIGPIPE and the register arm get skipped. What the check below measures is the length of
  # the WHOLE changed list, and the two come apart, because padding placed BEFORE the target inflates the
  # total while adding nothing after it. A fixture of 499 long paths, the target at line 500, then 4501 short
  # ones is 66,273 long over 5001 paths with the target inside the first tenth - so it SATISFIES ALL THREE
  # CHECKS - and it does not reliably fire the race at all.
  # THE FIGURE TO QUOTE IS THE DETERMINISTIC ONE, AND IT IS NOT THE TRIAL COUNT. Bytes-after-the-target is
  # 43,903 in that fixture against 128,893 in the 5000-pad one this case committed until the #529 review; that is a
  # property of the fixture and does not move. THE RACE RATE IS LOAD-DEPENDENT AND MUST NOT BE PUBLISHED AS A
  # POINT FIGURE - `gates/fastgate.sh:1464` already says so about the same mechanism [#527: this line pointed
  # at "this file", 900 lines down, and the words are in gates/fastgate.sh]. Across four fixtures and several runs of the same 40 trials the readings were
  # 0, 6, 7, 11, 11, 12, 20, 25, 26 and 29 of 40 in the middle band, and 39 to 40 of 40 for the committed shape;
  # antagonist A withdrew its own "7 of 40" after re-reading 26, 29 and 25 on the identical fixture. So the
  # honest form is a direction plus the command: a fixture can satisfy all three checks and fire well under the
  # committed shape's rate. Reproduce with 40 trials of
  # `printf '%s\n' "$LIST" | grep -qxF 'gates/build-numbers.tsv'` under `set -uo pipefail`, counting FALSE.
  # SO THE HONEST STATEMENT IS: count catches a fixture that shrank, position catches a prefix that sorts the
  # target late, and total length catches the `h/` class the #525 veto left open. THE FOURTH CHECK [#529]
  # measures the length of the list AFTER the target line, newlines included, which is the quantity the race
  # depends on, AND ITS BOUND IS 131,072, NOT THE 65,536 BUFFER [#529 review, reviewer A's F2, by strace]: grep's
  # one read asks for 98,304 bytes against a 65,536-byte pipe, so the read that finds the target can drain a full
  # pipe, and the writer is forced to block, and so to take SIGPIPE, only when more than 65,536 bytes remain
  # after it. Between 65,537 and 131,072 the verdict is a timing race, and the first version of this check,
  # bounded at 65,536, passed the 5000-pad fixture this case then committed (128,893 after the target) inside
  # that band. The fixture is 6000 pads since: 154,893 after the target, which is 6000 lines of 22 bytes plus
  # 22,893 digits, and the case prints the figure on every run. The 499-long-paths fixture above (43,903) and
  # the 5000-pad one both FAIL here now. The three proxies stay, because each
  # names a different way a fixture goes wrong and a FAIL that says which one is worth its line.
  # ON THE UNIT [antagonist A, F4; corrected #527]: `${#H24L}` returns the BYTE count in this container's POSIX
  # locale and the CHARACTER count under a UTF-8 one. The direction is safe either way: characters <= bytes, so
  # under UTF-8 the figure is a LOWER BOUND on the real byte count and the test is only ever stricter than it
  # reads, never looser. Today the two are equal for either of two reasons, each enough alone: the POSIX locale,
  # where `${#}` counts bytes, and the paths themselves, which git prints in ASCII (core.quotePath quotes every
  # other byte), where one character is one byte [#527: the job dictated "the LOCALE, not the paths being ASCII";
  # an independent reader showed that the ASCII half alone suffices in any locale].
  # WHY A THIRD CHECK RATHER THAN TIGHTER PROXIES [#525's veto, then the #526 review]: a fixture of 5001
  # paths under `h/` with the target at line 1 SATISFIES BOTH PROXIES (5001 >= 5000, and line 1 is inside
  # the first tenth) and is still only ~48 KB, under the buffer - and end to end, with the P0 restored
  # verbatim, H24 reported `ok` in FOUR of six runs against a fully broken script. The committed
  # `zzz-drive-pad` fixture is ~129 KB and reddens it 4 of 4. So the proxies cannot tell the two fixtures
  # apart and the byte length can.
  # Computed ONCE here and reused, rather than re-running the diff per check.
  H24L="$(git -C "$C" diff --name-only --no-renames "$BASESHA..HEAD")"
  H24C="$(printf '%s\n' "$H24L" | grep -c . || true)"
  H24B="${#H24L}"
  H24P="$(printf '%s\n' "$H24L" | grep -nxF 'gates/build-numbers.tsv' | cut -d: -f1)"
  H24P="${H24P:-0}"
  # THE FOURTH CHECK'S QUANTITY [#529]: every line AFTER the target, plus its newline, counted by ONE awk over a
  # herestring, so the case that is about SIGPIPE adds no pipeline of its own. 0 when the target is absent,
  # which the position check below already reports as line 0. awk's length() counts characters; git prints
  # these paths in ASCII (see ON THE UNIT above), so here that is the byte count.
  H24A="$(awk -v p="$H24P" 'p > 0 && NR > p { n += length($0) + 1 } END { print n + 0 }' <<< "$H24L")"
  # ── #530 [jobs/h24s-operative-figure-reaches-the-log-on-two-of-the-five-ways-the-case-ends-while-the-harness-says-every-run-2026-10-21]
  # THE FIGURES ARE PRINTED HERE, ABOVE THE BRANCH CHAIN, SO EVERY ENDING CARRIES THEM. They used to be printed
  # inside the ok branch and inside the fourth check's FAIL branch only, so on the three proxy FAIL endings a
  # reader got the proxy that fired and NOT H24A - the operative quantity this case exists to report, and the one
  # the job was filed to promote over those proxies. Antagonist A of #529 measured it: a grep for "H24 fixture"
  # in its M10 mutant log returned no match. Printed once, before the chain, rather than copied into five
  # branches, because five copies of one line is five places for them to drift apart.
  note "         H24 fixture: $H24A bytes after the target line, $H24C paths, target at line $H24P, list $H24B bytes"
  if [ "$H24B" -le 65536 ]; then
    note "  FAIL H24 [$(tc H24)]  the changed list is only $H24B bytes, at or under the 64 KiB pipe buffer, so"
    note "         the writer never blocks, grep -q's early exit sends no SIGPIPE, and the register arm is not"
    note "         skipped - this case would assert exit 1 against a script that answers exit 1 either way."
    note "         The $H24C paths and the target's position are not what this case depends on either; the"
    note "         length AFTER the target is, and the fourth check below reads it [#529]."
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H24"
  elif [ "$H24C" -lt 5000 ]; then
    note "  FAIL H24 [$(tc H24)]  the fixture only produced $H24C changed paths, under the pipe buffer, so it"
    note "         cannot exercise the defect - a case that cannot see what it guards is not a case."
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H24"
  elif [ "$H24P" -eq 0 ] || [ "$H24P" -gt $((H24C / 10)) ]; then
    note "  FAIL H24 [$(tc H24)]  the target path sits at line $H24P of $H24C, too late in the sorted list for"
    note "         grep -q to exit early, so the SIGPIPE race cannot fire and this case would assert exit 1"
    note "         against a script that answers exit 1 either way [#525, antagonist A's veto]. Pad under a"
    note "         prefix that sorts AFTER gates/ ."
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H24"
  elif [ "$H24A" -le 131072 ]; then   # a full pipe plus the one read grep takes [#529 review]
    # THE OPERATIVE CHECK [#529]. Reached only when the three proxies above all passed, which is why its
    # message says so: this is the fixture shape that used to report ok against a broken script.
    note "  FAIL H24 [$(tc H24)]  only $H24A bytes of the changed list come AFTER the target line, at or under"
    note "         131,072, a full 64 KiB pipe plus the one read grep takes before it exits, so the writer need never"
    note "         block and the register arm is not reliably skipped. The three proxy checks passed ($H24B bytes,"
    note "         $H24C paths, target at line $H24P), and this fourth one measures what the race depends on [#529]."
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H24"
  else
    # THE ASSERTION IS THE VERDICT LINE AND NOT THE EXIT CODE, because exit 1 is reachable from the stamp arm
    # too, and this case is about whether the REGISTER arm ran at all. H8 asserts the same sentence on the same
    # planted row with a SMALL diff; the only difference here is the 6000 paths, which is the whole point.
    # The fixture's figures are printed ABOVE the branch chain [#530], so the deterministic one is read and not
    # recomputed, on this ending and on all four FAIL endings alike. THE ONE ENDING THAT CANNOT CARRY THEM is the
    # outer `else` below, where reg_top could not be read: the fixture was never built there, so H24A, H24C, H24P
    # and H24B do not exist to print. That is the whole of what "every run" now means here, said exactly rather
    # than left as the overclaim #529's review wrote [#530, R18].
    expect H24 1 "an honest mint would have made it"
  fi
else
  note "  FAIL H24 [$(tc H24)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H24"
fi

# H25 NEGATIVE, A DOCTORED WORKING TREE. Ten unvouched mints are refused (that is H19's shape). The same commit,
#     with ten matching held rows written into the WORKING TREE ONLY and hidden from `git status` with
#     `git update-index --assume-unchanged`, took EXIT 0 FAST GATE GREEN before #525 - orchestrator 1 of 1,
#     reviewer 4 of 4 (three with assume-unchanged, one with skip-worktree) - with `git status --porcelain`
#     EMPTY. The exemption read the working tree, and this script's tamper pin covers what it EXECUTES, not
#     what it READS. A merely dirty file is caught by the dirty-tree refusal; those two index flags walk past
#     it. Since #525 the exemption reads the base blob with git show, so a working-tree row vouches for
#     nothing. reset_clone clears both flags, so this case cannot leak into the next.
reset_clone
H25TOP="$(reg_top)"
if [ -n "$H25TOP" ]; then
  for k in $(seq 1 10); do reg_row "$((H25TOP + k))"; done
  commit_case "H25 ten mints #$((H25TOP+1))..#$((H25TOP+10)), vouchers to be faked in the working tree"
  for k in $(seq 1 10); do held_row "$((H25TOP + k))" "$k"; done
  git -C "$C" update-index --assume-unchanged gates/held-trees.tsv >/dev/null 2>&1 || true
  H25DIRT="$(git -C "$C" status --porcelain | grep -c . || true)"
  if [ "$H25DIRT" != 0 ]; then
    note "  SKIPPED H25 [$(tc H25)]  update-index --assume-unchanged did not hide the file ($H25DIRT dirty"
    note "         path(s)), so the fixture cannot reach the exemption and would be refused for dirtiness."
    SKIP=$((SKIP+1))
  else
    expect H25 1 "are NOT vouched for by a row in gates/held-trees.tsv"
  fi
  git -C "$C" update-index --no-assume-unchanged gates/held-trees.tsv >/dev/null 2>&1 || true
else
  note "  FAIL H25 [$(tc H25)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H25"
fi

# H26 NEGATIVE, LINES THAT LOOK LIKE VOUCHERS AND ARE NOT. The old read accepted ANY line carrying the number
#     between two tabs in ANY column, so a COMMENT line and a CLEARED row (field 1 starting with `-`) both
#     vouched - while gates/held.sh's own `match_rows` (:33) excludes exactly those, and `held.sh add` writes
#     the number to FIELD 3. Three such lines in the base plus FOUR new numbers took EXIT 0 FAST GATE GREEN
#     before #525 with "1 of them count toward the ceiling of three"; after, exit 1 with "4 are NOT vouched"
#     (1 of 1 each way). FOUR and not three deliberately: three would sit inside the ceiling and the case
#     would pass whatever the exemption did - the control has to CROSS the line, not merely approach it.
reset_clone
H26TOP="$(reg_top)"
if [ -n "$H26TOP" ]; then
  printf 'aaaaaaaaaaaa\t%s\tn/a\t%s\t#%s\tFIXTURE - the number is in the heldBy column, not the number column.\t-\n' \
    "$(printf 'f%039d' 1)" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$((H26TOP + 1))" >> "$C/gates/held-trees.tsv"
  printf -- '-bbbbbbbbbbbb\t%s\t#%s\t%s\tfastgate-drive-fixture\tFIXTURE - a CLEARED row; match_rows rejects a leading dash.\t-\n' \
    "$(printf 'f%039d' 2)" "$((H26TOP + 2))" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/held-trees.tsv"
  printf '#\t#%s\tFIXTURE - a COMMENT line; match_rows strips it.\n' "$((H26TOP + 3))" >> "$C/gates/held-trees.tsv"
  new_base "H26 base: three lines that mention a number without vouching for it" >/dev/null
  for k in 1 2 3 4; do reg_row "$((H26TOP + k))"; done
  commit_case "H26 four mints #$((H26TOP+1))..#$((H26TOP+4)) against three look-alike held lines"
  expect H26 1 "are NOT vouched for by a row in gates/held-trees.tsv"
else
  note "  FAIL H26 [$(tc H26)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H26"
fi

# H27 NEGATIVE, THE DIFF VOUCHING FOR ITSELF, and the twin of H23. Ten mints and ten matching held rows in ONE
#     commit answered exit 2 before #525 (orchestrator 1 of 1) - and this script's own comments say exit 2 lands
#     a burn, because the full suite runs no series check. Since the exemption reads the BASE, a row the diff
#     adds cannot excuse a mint the same diff makes: exit 1 REFUSED, 1 of 1. H23 is the accept direction of the
#     identical fixture with the rows in the base, so the pair is what shows the rule is about WHERE the row
#     is and not about whether one exists.
reset_clone
H27TOP="$(reg_top)"
if [ -n "$H27TOP" ]; then
  for k in $(seq 1 10); do reg_row "$((H27TOP + k))"; held_row "$((H27TOP + k))" "$k"; done
  commit_case "H27 ten mints and their ten vouching rows in the SAME commit"
  expect H27 1 "are NOT vouched for by a row in gates/held-trees.tsv"
else
  note "  FAIL H27 [$(tc H27)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H27"
fi

# ── PART 3 OF THE STAMP JOB [#527]: THE TIER READS THE WORKING TREE, SO EACH ROUTE GETS A CASE. ─────────────
# jobs/the-tier-guards-what-it-executes-but-not-what-it-reads-2026-10-14. Each case below first runs its fixture
# HONESTLY and requires the refusal the doctoring is meant to hide - the fixture's own premise, a FAIL if it does
# not hold, so a case can never pass because its fixture stopped meaning anything - and then hides the change
# from `git status` and requires the guard that is meant to see it. A route git cannot be made to hide here
# (the flag does not suppress the change on this git) is SKIPPED, never counted as ok; a route that hid and was
# not refused is a FAIL. probe() runs fastgate once and checks the exit code and every substring, in-shell.
probe(){ # <rc> <substring>...   sets PROBE_OUT and PROBE_RC
  local want="$1" s; shift
  PROBE_OUT="$(run_fastgate)"; PROBE_RC=$?
  [ "$PROBE_RC" = "$want" ] || return 1
  for s in "$@"; do case "$PROBE_OUT" in *"$s"*) : ;; *) return 1 ;; esac; done
  return 0
}
hidden(){ [ "$(git -C "$C" status --porcelain | grep -c . || true)" = 0 ]; }
# EVERY ROUTE PUTS THE COMMITTED BYTES BACK, AND CHECKS THEM RAW [#527 v3]. MEASURED by the orchestrator: after a
# clean-filter route, a `git status` that runs more than a second after the file was written refreshes the index
# with the DOCTORED file's stat data (its content matched through the filter), and from then on
# `git checkout -- <path>` and `git reset --hard` both see an up-to-date entry and leave the doctored bytes in
# place, invisible to `git status` even once the filter is gone. In the unfixed mode that made H29, the case
# after H32, fail at the executable pin instead of at the series ceiling: one fixture confounding the next,
# which reset_clone exists to prevent. restore_raw writes the bytes the commit records whatever the index says
# and then checks them raw; a fixture that cannot put its file back is a FAIL of its own case.
restore_raw(){ # <path>
  git -C "$C" show "HEAD:$1" > "$C/$1" 2>/dev/null || return 1
  [ "$(git -C "$C" hash-object --no-filters "$C/$1" 2>/dev/null)" = "$(git -C "$C" rev-parse --quiet --verify "HEAD:$1" 2>/dev/null)" ]
}
route_verdict(){ # <case> <ok text> : reads ROUTES_FAIL, ROUTES_SKIP, ROUTES_OK, ROUTES_LEAK and ROUTE_SHOW
  if [ -n "$ROUTES_FAIL$ROUTES_LEAK" ]; then
    note "  FAIL $1 [$(tc "$1")]  ${ROUTES_FAIL:+a route hid the change and was NOT refused:$ROUTES_FAIL}${ROUTES_FAIL:+${ROUTES_LEAK:+; }}${ROUTES_LEAK:+the fixture could not put back the committed bytes of:$ROUTES_LEAK}"
    [ -n "$ROUTES_FAIL" ] && show_verdict "$ROUTE_SHOW"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $1"
  elif [ -z "$ROUTES_OK" ]; then
    note "  SKIPPED $1 [$(tc "$1")]  no route could hide the change from git status on this git:$ROUTES_SKIP"
    SKIP=$((SKIP+1))
  else
    note "  ok  $1 [$(tc "$1")]  ($2; refused by route:$ROUTES_OK${ROUTES_SKIP:+; could not hide:$ROUTES_SKIP})"
    OK=$((OK+1))
  fi
}

# H10 NEGATIVE, A DOCTORED GATE 49 THAT TURNS CONTROL (g)'s HONEST RED INTO A GREEN. The case base TIGHTENS gate
#     49's stamp regex from \d{3,4} to \d{3}, so on an honest stamp-only rebuild control (g) answers
#     NOT-CONTAINED. Then the WORKING-TREE copy is put back to the looser regex and hidden two ways: with
#     assume-unchanged, and with a clean filter in .git/info/attributes and no index flag at all (git reads a
#     file through its filter only when the index's stat data does not already call it changed, and a size
#     change does, so that route first resets the stat data with `git read-tree HEAD`). On #526's
#     script control (g) read the doctored copy, printed CONTAINED and the commit took EXIT 0 FAST GATE GREEN
#     both ways; the read pin, hashing raw bytes, refuses both at exit 1 and names the file.
#     THE FILTER IS DECLARED AS `**/<path>` AND NOT `<path>` [#527 v2]. The pin hashes an ABSOLUTE path, and a
#     pattern starting `gates/` matches the repository-relative path `git status` uses but never an absolute
#     one, so the plain form hid the file from status and never reached the hash at all: a mutant of the read
#     pin with --no-filters deleted SURVIVED this case, 31 ok and 0 FAIL, measured by the orchestrator on git
#     2.43.0. `**/` matches both, so the route now reaches the one line it exists to control.
reset_clone
H10F=gates/regress/49-home.js
H10OLD='^Build #\d{3,4} - '; H10NEW='^Build #\d{3} - '
if [ "$(grep -cF -- "$H10OLD" "$C/$H10F" 2>/dev/null || true)" != 1 ]; then
  note "  FAIL H10 [$(tc H10)]  gate 49 does not carry exactly one line with '$H10OLD', so the fixture cannot be cut"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H10"
else
  python3 -I - "$C/$H10F" "$H10OLD" "$H10NEW" <<'PY'
import sys
p,o,n=sys.argv[1],sys.argv[2],sys.argv[3]
s=open(p,encoding='utf-8').read()
if s.count(o)!=1: sys.exit("H10 fixture: the regex occurs %d times, not 1"%s.count(o))
open(p,'w',encoding='utf-8').write(s.replace(o,n))
PY
  new_base "H10 base: gate 49's stamp regex tightened to three digits" >/dev/null
  H10N="$(mint_in_clone)"
  if badnum "$H10N"; then
    note "  FAIL H10 [$(tc H10)]  could not mint a fixture number in the clone"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H10"
  else
    restamp "#$H10N - $NOWET ET" || true
    record_in_clone "$H10N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || true
    commit_case "H10 honest rebuild to #$H10N over the tightened gate 49"
    if ! probe 1 "CONTROL (g) FAILED"; then
      note "  FAIL H10 [$(tc H10)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
      note "         not exit 1 with control (g) refusing, so hiding the regex would prove nothing"
      show_verdict "$PROBE_OUT"
      BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H10"
    else
      ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
      git -C "$C" show "$BASESHA:$H10F" > "$C/$H10F"
      git -C "$C" update-index --assume-unchanged "$H10F" >/dev/null 2>&1 || true
      if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP assume-unchanged"
      elif probe 1 "this tier READS a verdict out of these files" "$H10F: commit "; then ROUTES_OK="$ROUTES_OK assume-unchanged"
      else ROUTES_FAIL="$ROUTES_FAIL assume-unchanged(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
      git -C "$C" update-index --no-assume-unchanged "$H10F" >/dev/null 2>&1 || true
      restore_raw "$H10F" || ROUTES_LEAK="$ROUTES_LEAK $H10F"
      git -C "$C" show "$BASESHA:$H10F" > "$C/$H10F"
      printf '**/%s filter=ctdrive10\n' "$H10F" >> "$C/.git/info/attributes"   # `**/`: see the comment above
      git -C "$C" config filter.ctdrive10.clean "cat >/dev/null; git show HEAD:$H10F"
      git -C "$C" read-tree HEAD >/dev/null 2>&1 || true   # zero the index stat data, or git calls a size change a change unread
      if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP clean-filter"
      elif probe 1 "this tier READS a verdict out of these files" "$H10F: commit "; then ROUTES_OK="$ROUTES_OK clean-filter"
      else ROUTES_FAIL="$ROUTES_FAIL clean-filter(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
      git -C "$C" config --unset filter.ctdrive10.clean >/dev/null 2>&1 || true
      sed -i '/ filter=ctdrive10$/d' "$C/.git/info/attributes"
      restore_raw "$H10F" || ROUTES_LEAK="$ROUTES_LEAK $H10F"
      route_verdict H10 "exit 1, this tier READS a verdict out of these files, naming $H10F"
    fi
  fi
fi

# H11 NEGATIVE, A DOCTORED GATE THAT HIDES A RECORDS REQUIRE FROM THE PREMISE CHECK. The case base appends one
#     require() of a records-only path to gate 10's file (claude/agents/zz-h11-fixture.js: classify() calls
#     claude/* RECORDS, and the path need not exist, because part one resolves with realpath -m), so on a
#     register-only commit the premise check answers THE PREMISE IS BROKEN. Then the require is removed from the
#     WORKING-TREE copy only and hidden with assume-unchanged. On #526's script the premise check read the
#     doctored copy and the commit took EXIT 0 FAST GATE GREEN while the COMMITTED gate still required a records
#     file, which is #490's defect reached through another door. The read pin refuses it and names the file.
reset_clone
H11F=gates/regress/10-gameover.js
printf '\n// fastgate-drive.sh H11 fixture, never pushed: a gate that requires a records-only path\nrequire("../../claude/agents/zz-h11-fixture.js");\n' >> "$C/$H11F"
new_base "H11 base: gate 10 requires a records-only path" >/dev/null
H11N="$(mint_in_clone)"
if badnum "$H11N"; then
  note "  FAIL H11 [$(tc H11)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H11"
else
  commit_case "H11 register only: one minted row for #$H11N over the gate that requires a records path"
  if ! probe 1 "THE PREMISE IS BROKEN"; then
    note "  FAIL H11 [$(tc H11)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 1 with THE PREMISE IS BROKEN, so hiding the require would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H11"
  else
    ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
    git -C "$C" show "$BASESHA:$H11F" > "$C/$H11F"
    git -C "$C" update-index --assume-unchanged "$H11F" >/dev/null 2>&1 || true
    if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP assume-unchanged"
    elif probe 1 "this tier READS a verdict out of these files" "$H11F: commit "; then ROUTES_OK="$ROUTES_OK assume-unchanged"
    else ROUTES_FAIL="$ROUTES_FAIL assume-unchanged(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
    git -C "$C" update-index --no-assume-unchanged "$H11F" >/dev/null 2>&1 || true
    restore_raw "$H11F" || ROUTES_LEAK="$ROUTES_LEAK $H11F"
    route_verdict H11 "exit 1, this tier READS a verdict out of these files, naming $H11F"
  fi
fi

# H28 NEGATIVE, THE CATCH-ALL: A WORSE CASE REGISTER, PUT BACK ON DISK AND HIDDEN FOUR WAYS. The commit adds one
#     dead citation to claude/stories/TEST-CASES.md, so the records ratchet honestly answers "this commit made it
#     WORSE" (FAST GATE RED, exit 1). Then the WORKING-TREE copy is put back as the base had it and hidden with
#     assume-unchanged, with skip-worktree, with a clean filter, and with STALE STAT DATA [#527 v3]: the clean
#     filter makes `git status` record the doctored file's stat as clean and is then removed, so no index flag and
#     no filter is left and status still says nothing (the mechanism restore_raw above exists for). Neither pin
#     covers that file: the ratchet's HEAD half reads it from the working tree, so on #526's script it printed "no worse than base" and the commit
#     took EXIT 0 FAST GATE GREEN. The catch-all, which hashes every tracked file raw, refuses each route at exit 1.
reset_clone
H28F=claude/stories/TEST-CASES.md
printf '\nfastgate-drive.sh H28 fixture, never pushed: this line names claude/stories/ZZ-H28-NO-SUCH-FILE.md, one more dead path for the citations arm.\n' >> "$C/$H28F"
commit_case "H28 one more dead citation in the case register"
if ! probe 1 "this commit made it WORSE"; then
  note "  FAIL H28 [$(tc H28)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
  note "         not exit 1 with the records ratchet reporting WORSE, so hiding the register would prove nothing"
  show_verdict "$PROBE_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H28"
else
  ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
  for H28R in assume-unchanged skip-worktree clean-filter stale-stat; do
    git -C "$C" show "$BASESHA:$H28F" > "$C/$H28F"
    case "$H28R" in
      assume-unchanged) git -C "$C" update-index --assume-unchanged "$H28F" >/dev/null 2>&1 || true ;;
      skip-worktree)    git -C "$C" update-index --skip-worktree "$H28F" >/dev/null 2>&1 || true ;;
      clean-filter)     printf '**/%s filter=ctdrive28\n' "$H28F" >> "$C/.git/info/attributes"   # `**/` as H10
                        git -C "$C" config filter.ctdrive28.clean "cat >/dev/null; git show HEAD:$H28F"
                        git -C "$C" read-tree HEAD >/dev/null 2>&1 || true ;;   # as H10: zero the index stat data
      stale-stat)       printf '**/%s filter=ctdrive28\n' "$H28F" >> "$C/.git/info/attributes"
                        git -C "$C" config filter.ctdrive28.clean "cat >/dev/null; git show HEAD:$H28F"
                        touch -d '-10 seconds' "$C/$H28F"   # older than the index write below, so git trusts its stat
                        git -C "$C" read-tree HEAD >/dev/null 2>&1 || true
                        git -C "$C" status --porcelain >/dev/null 2>&1   # records the doctored file's stat as clean
                        git -C "$C" config --unset filter.ctdrive28.clean >/dev/null 2>&1 || true
                        sed -i '/ filter=ctdrive28$/d' "$C/.git/info/attributes" ;;   # no flag and no filter is left
    esac
    if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP $H28R"
    elif probe 1 "not the blob the commit records" "$H28F: commit "; then ROUTES_OK="$ROUTES_OK $H28R"
    else ROUTES_FAIL="$ROUTES_FAIL $H28R(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
    git -C "$C" update-index --no-assume-unchanged --no-skip-worktree "$H28F" >/dev/null 2>&1 || true
    git -C "$C" config --unset filter.ctdrive28.clean >/dev/null 2>&1 || true
    sed -i '/ filter=ctdrive28$/d' "$C/.git/info/attributes"
    restore_raw "$H28F" || ROUTES_LEAK="$ROUTES_LEAK $H28F"
  done
  route_verdict H28 "exit 1, the catch-all names $H28F"
fi

# H30 NEGATIVE, A RECORDS FILE A COMMITTED GATE NAMES, DELETED ON DISK AND HIDDEN. The case base appends one
#     path.join of an EXISTING records file (claude/process-log/lane-2.md) to gate 12's file, so on a
#     register-only commit the premise check's part two answers THE PREMISE IS BROKEN. Then that records file is
#     deleted from the WORKING TREE and hidden with assume-unchanged. Part two skipped any reference not on disk,
#     so on #526's script the commit took EXIT 0 FAST GATE GREEN with the committed gate still reading a records
#     file. Since #527 part two asks the COMMIT as well, and the same refusal stands.
reset_clone
H30F=gates/regress/12-hint.js; H30R=claude/process-log/lane-2.md
if ! git -C "$C" cat-file -e "HEAD:$H30R" 2>/dev/null; then
  note "  FAIL H30 [$(tc H30)]  $H30R is not a tracked file of the candidate, so the fixture cannot be cut"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H30"
else
  printf "\n// fastgate-drive.sh H30 fixture, never pushed: a gate that names a records file\nconst _zzH30=path.join(__dirname,'..','..','claude','process-log','lane-2.md');\n" >> "$C/$H30F"
  new_base "H30 base: gate 12 names a records file with path.join" >/dev/null
  H30N="$(mint_in_clone)"
  if badnum "$H30N"; then
    note "  FAIL H30 [$(tc H30)]  could not mint a fixture number in the clone"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H30"
  else
    commit_case "H30 register only: one minted row for #$H30N over the gate that names a records file"
    if ! probe 1 "THE PREMISE IS BROKEN"; then
      note "  FAIL H30 [$(tc H30)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
      note "         not exit 1 with THE PREMISE IS BROKEN, so hiding the file would prove nothing"
      show_verdict "$PROBE_OUT"
      BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H30"
    else
      ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
      git -C "$C" update-index --assume-unchanged "$H30R" >/dev/null 2>&1 || true
      rm -f "$C/$H30R"
      if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP assume-unchanged"
      elif probe 1 "THE PREMISE IS BROKEN" "$H30R"; then ROUTES_OK="$ROUTES_OK assume-unchanged"
      else ROUTES_FAIL="$ROUTES_FAIL assume-unchanged(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
      git -C "$C" update-index --no-assume-unchanged "$H30R" >/dev/null 2>&1 || true
      restore_raw "$H30R" || ROUTES_LEAK="$ROUTES_LEAK $H30R"
      route_verdict H30 "exit 1, THE PREMISE IS BROKEN, naming $H30R"
    fi
  fi
fi

# H31 NEGATIVE, AN UNTRACKED, EXCLUDED FILE THAT CHANGES WHICH PATH A REQUIRE RESOLVES TO. The case base appends
#     require("../claude/agents/zz-h31-fixture.js") to gates/lib.js and commits that records-only target, so the
#     gates-relative spelling exists in the commit and the premise check answers THE PREMISE IS BROKEN. Then an
#     UNTRACKED file is put at the regress-relative spelling (gates/claude/agents/zz-h31-fixture.js) and matched by
#     .git/info/exclude, so `git status` shows nothing. Part one chose its spelling by what was on DISK, kept the
#     regress-relative one (classified FORCE), and on #526's script the commit took EXIT 0 FAST GATE GREEN. Since
#     #527 the COMMIT decides, and the same refusal stands. `git clean -fd` keeps excluded files, so this case
#     removes its own.
reset_clone
H31L=gates/lib.js; H31R=claude/agents/zz-h31-fixture.js; H31U=gates/claude/agents/zz-h31-fixture.js
mkdir -p "$C/claude/agents"
printf '// fastgate-drive.sh H31 fixture, never pushed: a records-only file a gates-level require names\n' > "$C/$H31R"
printf '\n// fastgate-drive.sh H31 fixture, never pushed: a gates-level file that requires a records-only path\nrequire("../claude/agents/zz-h31-fixture.js");\n' >> "$C/$H31L"
new_base "H31 base: gates/lib.js requires a records-only file that the commit carries" >/dev/null
H31N="$(mint_in_clone)"
if badnum "$H31N"; then
  note "  FAIL H31 [$(tc H31)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H31"
else
  commit_case "H31 register only: one minted row for #$H31N over the require of a records file"
  if ! probe 1 "THE PREMISE IS BROKEN"; then
    note "  FAIL H31 [$(tc H31)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 1 with THE PREMISE IS BROKEN, so the untracked file would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H31"
  else
    ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
    mkdir -p "$C/gates/claude/agents"
    printf '// fastgate-drive.sh H31 fixture, never pushed: untracked and excluded\n' > "$C/$H31U"
    printf 'gates/claude/\n' >> "$C/.git/info/exclude"
    if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP info-exclude"
    elif probe 1 "THE PREMISE IS BROKEN" "$H31R"; then ROUTES_OK="$ROUTES_OK info-exclude"
    else ROUTES_FAIL="$ROUTES_FAIL info-exclude(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
    rm -rf "$C/gates/claude"
    sed -i '/^gates\/claude\/$/d' "$C/.git/info/exclude"
    route_verdict H31 "exit 1, THE PREMISE IS BROKEN, naming $H31R"
  fi
fi

# H32 NEGATIVE, AN EXECUTED FILE DOCTORED ON DISK AND HIDDEN THREE WAYS: THE EXECUTABLE PIN'S OWN CASE [#527 v2].
#     #521's pin refuses when a file this tier EXECUTES is not the blob the commit records, and until #527 no case
#     here drove it. A register-only commit is made (H2's shape, green when honest, which is the fixture's
#     premise); then one comment line is appended to the WORKING-TREE copy of gates/verify-log.sh, which the
#     citations ratchet runs, and hidden with assume-unchanged, with skip-worktree and with a clean filter
#     declared `**/<path>` (H10 says why that form). The pin hashes raw bytes and refuses each route at exit 1,
#     naming the file. On #526's script the two index-flag routes were refused as well, because hash-object reads
#     the disk whatever the index says; the clean-filter route was not, because that pin hashed through the
#     filter and read the committed blob. A mutant of the pin without --no-filters is caught LATER, by the
#     catch-all, and this case requires the pin's own refusal, so it fails that mutant rather than crediting it.
reset_clone
H32F=gates/verify-log.sh
H32N="$(mint_in_clone)"
if badnum "$H32N"; then
  note "  FAIL H32 [$(tc H32)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H32"
else
  commit_case "H32 register only: one minted row for #$H32N, then an executed file doctored on disk"
  if ! probe 0 "FAST GATE GREEN"; then
    note "  FAIL H32 [$(tc H32)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 0 FAST GATE GREEN, so a refusal of the doctored tree would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H32"
  else
    ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
    for H32R in assume-unchanged skip-worktree clean-filter; do
      printf '\n# fastgate-drive.sh H32 fixture, never pushed: one line the commit does not carry\n' >> "$C/$H32F"
      case "$H32R" in
        assume-unchanged) git -C "$C" update-index --assume-unchanged "$H32F" >/dev/null 2>&1 || true ;;
        skip-worktree)    git -C "$C" update-index --skip-worktree "$H32F" >/dev/null 2>&1 || true ;;
        clean-filter)     printf '**/%s filter=ctdrive32\n' "$H32F" >> "$C/.git/info/attributes"   # `**/` as H10
                          git -C "$C" config filter.ctdrive32.clean "cat >/dev/null; git show HEAD:$H32F"
                          git -C "$C" read-tree HEAD >/dev/null 2>&1 || true ;;   # as H10: zero the index stat data
      esac
      if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP $H32R"
      elif probe 1 "this tier EXECUTES these files" "$H32F: commit "; then ROUTES_OK="$ROUTES_OK $H32R"
      else ROUTES_FAIL="$ROUTES_FAIL $H32R(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
      git -C "$C" update-index --no-assume-unchanged --no-skip-worktree "$H32F" >/dev/null 2>&1 || true
      git -C "$C" config --unset filter.ctdrive32.clean >/dev/null 2>&1 || true
      sed -i '/ filter=ctdrive32$/d' "$C/.git/info/attributes"
      restore_raw "$H32F" || ROUTES_LEAK="$ROUTES_LEAK $H32F"
    done
    route_verdict H32 "exit 1, this tier EXECUTES these files, naming $H32F"
  fi
fi

# H29 NO TEMPORARY OUTLIVES A REFUSED RUN [#527, item (2)(c) of the H21 case job]. Four contiguous planted rows
#     (H19's shape) are refused at exit 1, at the series ceiling, after the register copies are made. Run with TMPDIR pointed at a fresh,
#     empty directory, that directory must still be empty afterwards. On #526's script two register copies of
#     about 235 KB each were left there, measured by the orchestrator, because no exit path between their
#     mktemp and their rm removed them.
reset_clone
H29TOP="$(reg_top)"
H29T="$(mktemp -d 2>/dev/null || true)"
if [ -z "$H29TOP" ] || [ -z "$H29T" ] || [ ! -d "$H29T" ]; then
  note "  FAIL H29 [$(tc H29)]  could not read the base register top or make the empty TMPDIR"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H29"
else
  for k in 1 2 3 4; do reg_row "$((H29TOP + k))"; done
  commit_case "H29 four contiguous mints #$((H29TOP+1))..#$((H29TOP+4)), judged with an empty TMPDIR"
  H29OUT="$( ( cd "$C" && TMPDIR="$H29T" CT_FASTGATE_DRIVE=1 timeout 250 bash "$C/gates/fastgate.sh" "$BASESHA" 2>&1 ) )"; H29RC=$?
  H29LEFT="$(find "$H29T" -mindepth 1 -maxdepth 1 2>/dev/null | grep -c . || true)"
  H29WHY=no; case "$H29OUT" in *"gains a row the series cannot carry"*) H29WHY=yes ;; esac
  if [ "$H29RC" = 1 ] && [ "$H29WHY" = yes ] && [ "$H29LEFT" = 0 ]; then
    printf '  ok  %s [%s]  (exit 1 at the series ceiling, and TMPDIR held nothing afterwards)\n' "H29" "$(tc H29)"
    OK=$((OK+1))
  else
    printf '  FAIL %s [%s]  exit %s (1 expected), series refusal %s, %s path(s) left in TMPDIR (0 expected)\n' "H29" "$(tc H29)" "$H29RC" "$H29WHY" "$H29LEFT"
    show_verdict "$H29OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H29"
  fi
  rm -rf "$H29T"
fi

# H33 POSITIVE, AN HONEST REBUILD AFTER HELD MINTS [#529, jobs/the-series-margin-of-fastgate-is-measured-from-the-base-stamp-so-an-honest-rebuild-after-held-mints-pays-the-full-suite-2026-10-16].
#     A held run mints and never ships, so main's register can sit far above the stamp main's bundle carries.
#     The case BASE carries eleven minted-only rows above the register top, one more than the margin, so the
#     step from the base stamp is past it whatever that stamp is; then the honest rebuild on top: the real
#     mint, the restamp, the real record, exactly as H1. #527's script answered exit 2 FULL SUITE REQUIRED
#     ("past the series margin"); since #529 the step is measured from the base series top and this is green.
reset_clone
H33TOP="$(reg_top)"
if [ -z "$H33TOP" ]; then
  note "  FAIL H33 [$(tc H33)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H33"
else
  for k in $(seq 1 11); do
    printf '%s\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\theld mint %s of 11, fixture only\n' \
      "$((H33TOP + k))" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$k" >> "$C/gates/build-numbers.tsv"
  done
  new_base "H33 case base: eleven minted-only rows #$((H33TOP+1))..#$((H33TOP+11)), the shape held runs leave" >/dev/null
  H33N="$(mint_in_clone)"
  if badnum "$H33N"; then
    note "  FAIL H33 [$(tc H33)]  could not mint a fixture number in the clone above the held mints"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H33"
  else
    restamp "#$H33N - $NOWET ET" || true
    record_in_clone "$H33N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
    commit_case "H33 honest rebuild to #$H33N above eleven held mints"
    expect H33 0 "FAST GATE GREEN"
  fi
fi

# H34 AN UNUSABLE MARGIN IS AN ENVIRONMENT FAULT, NOT A FAULT OF THE TREE [#529, jobs/the-series-margin-of-fastgate-is-measured-from-the-base-stamp-so-an-honest-rebuild-after-held-mints-pays-the-full-suite-2026-10-16,
#     jobs/the-register-arm-of-fastgate-asks-buildnum-sh-next-under-the-callers-environment-so-an-unusable-margin-refuses-an-honest-mint-at-exit-1-2026-10-20].
#     H1's honest rebuild, judged with BUILDNUM_MAX_DELTA=99999999999999999999. On #527's script it took EXIT 1
#     FAST GATE REFUSED, blaming the commit: the register arm asked gates/buildnum.sh next under the caller's
#     environment, buildnum.sh refused the value before reading the register, and the arm read the refusal as
#     a wedge (measured; 0 and abc do the same). The stamp arm behind it was wrong the other way: its numeric
#     range test errors on twenty digits and reads false, so it ACCEPTED the value as the margin (measured by
#     calling plaus_delta alone on #527's script). Since #529 the stamp arm length tests the margin first, as
#     gates/buildnum.sh does, and the register arm asks the minter with the variable removed whenever the
#     stamp arm's function calls the value unusable. Reverting either change makes this case read exit 1.
reset_clone
H34N="$(mint_in_clone)"
if badnum "$H34N"; then
  note "  FAIL H34 [$(tc H34)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H34"
else
  restamp "#$H34N - $NOWET ET" || true
  record_in_clone "$H34N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
  commit_case "H34 honest rebuild to #$H34N, judged with a twenty-digit BUILDNUM_MAX_DELTA"
  expect_env H34 2 "an environment fault, not a fault of the tree" "BUILDNUM_MAX_DELTA=99999999999999999999"
fi

# H35 A BYTE-IDENTICAL COPY OF A REGISTER ROW IS REFUSED [#529, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
#     The orchestrator's P6 (15 Oct 2026): a hand-appended copy of the register's last row took exit 0 FAST GATE
#     GREEN, because the appended rows were a SET difference and a copy is not in it. Since #529 the rows are
#     counted with their multiplicity. The copy is read with awk, not `grep | tail`, so this case adds no pipe.
reset_clone
H35L="$(awk '$0 !~ /^[[:space:]]*#/ && NF {l = $0} END {print l}' "$C/gates/build-numbers.tsv")"
if [ -z "$H35L" ]; then
  note "  FAIL H35 [$(tc H35)]  could not read a row of the base register to copy"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H35"
else
  printf '%s\n' "$H35L" >> "$C/gates/build-numbers.tsv"
  commit_case "H35 a byte-identical copy of the register's last row"
  expect H35 1 "BYTE-IDENTICAL copy"
fi

# H36 A BUILT ROW NAMING A BUNDLE NOTHING HOLDS IS REFUSED [#529, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
#     The orchestrator's P7: the real mint, then the real record naming bundle ffffffffffff, with app.js untouched,
#     took exit 0, because the bound read the number field only and a records-only commit has no bundle to
#     match. Since #529 a built row must name a bundle this history holds.
reset_clone
H36N="$(mint_in_clone)"
if badnum "$H36N"; then
  note "  FAIL H36 [$(tc H36)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H36"
else
  record_in_clone "$H36N" ffffffffffff "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
  commit_case "H36 a built row for #$H36N naming bundle ffffffffffff, app.js untouched"
  expect H36 1 "names bundle ffffffffffff"
fi

# H37 POSITIVE, A HELD RUN'S CLOSE-OUT STAYS GREEN [#529, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
#     The shape of #456, #459 and #504's close-outs, which a stricter rule would have refused (main's register
#     history was replayed against the rule before it was written): a held run records every bundle it built,
#     and its held row names only the last. The held row sits in the case base, so the diff does not touch
#     gates/held-trees.tsv, which classify() would FORCE; the diff carries the real mint and two real records
#     for that number, the first naming a bundle no file holds (the mid pass rebuild) and the second the held
#     bundle. app.js is untouched, so only the hold register and the run's own rebuild can vouch.
reset_clone
H37TOP="$(reg_top)"
if [ -z "$H37TOP" ]; then
  note "  FAIL H37 [$(tc H37)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H37"
else
  H37N=$((H37TOP + 1)); H37X="$(printf 'c0ffee%06d' "$H37N")"; H37Y="$(printf 'abcdef%06d' "$H37N")"
  printf '%s\t%s\t#%s\t%s\tfastgate-drive\tFIXTURE ONLY - a held run whose last bundle this row names.\t-\n' \
    "$H37X" "$(printf 'f%039d' 37)" "$H37N" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/held-trees.tsv"
  new_base "H37 case base: a held row for #$H37N naming bundle $H37X" >/dev/null
  H37M="$(mint_in_clone)"
  if [ "$H37M" != "$H37N" ]; then
    note "  FAIL H37 [$(tc H37)]  the clone minted #${H37M:-nothing}, not #$H37N, so the held row does not name it"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H37"
  else
    record_in_clone "$H37N" "$H37Y" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
    record_in_clone "$H37N" "$H37X" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
    commit_case "H37 a held run's close-out for #$H37N: the mint and two records, app.js untouched"
    expect H37 0 "FAST GATE GREEN"
  fi
fi

# H38 gates/build.sh REFUSES A STAMP TIME THREE HOURS AHEAD [#529, jobs/a-wrong-build-stamp-can-reach-main-on-an-app-changing-build-because-build-sh-does-not-validate-ct-stamp-time-2026-10-16].
#     Not a fastgate verdict, on purpose: an app changing build is never stamp only, so the fast tier never judges
#     its stamp and the full suite reads no date, which is why the refusal is at the bundler. The time is the
#     harness's one Eastern minute plus three hours, computed through epoch seconds so no relative date parse is
#     involved. On #527's build.sh the same call goes on to esbuild, and builds the bundle where esbuild exists.
reset_clone
H38N="$(mint_in_clone)"
H38E="$(TZ=America/New_York date -d "$NOWET" '+%s' 2>/dev/null || true)"
if badnum "$H38N" || [ -z "$H38E" ]; then
  note "  FAIL H38 [$(tc H38)]  could not mint a fixture number or read the harness clock"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H38"
else
  expect_build H38 1 "later than the wall clock plus ten minutes" "$H38N" "$(TZ=America/New_York date -d "@$((H38E + 10800))" '+%Y-%m-%d %H:%M')"
fi

# H39 gates/build.sh REFUSES A STAMP TIME EARLIER THAN MAIN'S [#529, jobs/a-wrong-build-stamp-can-reach-main-on-an-app-changing-build-because-build-sh-does-not-validate-ct-stamp-time-2026-10-16].
#     The clone's origin/main is the case base, whose app.js carries a real stamp, and 2026-01-01 00:00 is before
#     any stamp this project has shipped, so the home screen would go backwards. Same door as H38, other bound.
reset_clone
H39N="$(mint_in_clone)"
if badnum "$H39N"; then
  note "  FAIL H39 [$(tc H39)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H39"
else
  expect_build H39 1 "is earlier than the stamp origin/main already serves" "$H39N" "2026-01-01 00:00"
fi

# H40 TO H43, THE FOUR FORGERIES G6'S FIRST VERSION LET THROUGH [#529 review, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
#     Each took EXIT 0 FAST GATE GREEN on the first version, measured by both independent reviewers, under a line
#     saying every appended built row names a bundle this history holds. Each must now be refused, naming it.
# H40: a built row for the LIVE number, the base stamp's own, naming ffffffffffff, with app.js untouched.
reset_clone
H40N="${BASESTAMP#\#}"; H40N="${H40N%% *}"
if ! [[ "$H40N" =~ ^[0-9]+$ ]]; then
  note "  FAIL H40 [$(tc H40)]  could not read the live number from the base stamp '$BASESTAMP'"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H40"
else
  record_in_clone "$H40N" ffffffffffff "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero)"
  commit_case "H40 a built row for the live number #$H40N naming bundle ffffffffffff, app.js untouched"
  expect H40 1 "names bundle ffffffffffff"
fi

# H41: a built row copying the number and runId of the base register's last real built row, naming ffffffffffff.
reset_clone
H41ROW="$(awk -F'\t' '$0 !~ /^[[:space:]]*#/ && NF == 9 && $2 == "built" {r = $1 " " $7} END {print r}' "$C/gates/build-numbers.tsv")"
H41N="${H41ROW%% *}"; H41R="${H41ROW#* }"
if badnum "$H41N" || [ -z "$H41R" ] || [ "$H41N" = "$H41ROW" ]; then
  note "  FAIL H41 [$(tc H41)]  the base register carries no built row to copy"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H41"
else
  printf '%s\tbuilt\t-\tffffffffffff\t%s\t%s\t%s\tbuild.sh\tFIXTURE ONLY, a built row copying the number and runId of a real one.\n' \
    "$H41N" "$(md5_12 "$C/chess.jsx")" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$H41R" >> "$C/gates/build-numbers.tsv"
  commit_case "H41 a built row for #$H41N under its own runId $H41R naming bundle ffffffffffff"
  expect H41 1 "names bundle ffffffffffff"
fi

# H42: a built row naming the held register's sentinel `sha-only` as its bundle, under the number and runId of a
#      sanctioned sha-only held row. Since the third pass keyed the held vouch on number and runId, that is the
#      one shape the hex test alone refuses; it was the real mint until then. No tool can write the row
#      (buildnum.sh record refuses a non-hex bundle), so it is written by hand, as a forger would.
reset_clone
H42K="$(awk -F'\t' '$1 == "sha-only" && NF >= 5 { n = $3; sub(/^#/, "", n); print n "\t" $5; exit }' "$C/gates/held-trees.tsv" 2>/dev/null)"
H42N="${H42K%%$'\t'*}"; H42R="${H42K#*$'\t'}"
if [ -z "$H42K" ] || ! [[ "$H42N" =~ ^[0-9]+$ ]] || [ -z "$H42R" ] || [ "$H42R" = "$H42K" ]; then
  note "  FAIL H42 [$(tc H42)]  no sanctioned sha-only row in gates/held-trees.tsv to take a number and runId from"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H42"
else
  printf '%s\tbuilt\t-\tsha-only\t%s\t%s\t%s\tbuild.sh\tFIXTURE ONLY, a built row naming the held register sentinel as its bundle.\n' \
    "$H42N" "$(md5_12 "$C/chess.jsx")" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$H42R" >> "$C/gates/build-numbers.tsv"
  commit_case "H42 a built row for #$H42N under $H42R naming the sentinel sha-only as its bundle"
  expect H42 1 "names bundle sha-only"
fi

# H43: H1's honest rebuild, plus a second built row for the same number by another run, naming ffffffffffff.
reset_clone
H43N="$(mint_in_clone)"
if badnum "$H43N"; then
  note "  FAIL H43 [$(tc H43)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H43"
else
  restamp "#$H43N - $NOWET ET" || true
  record_in_clone "$H43N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
  printf '%s\tbuilt\t-\tffffffffffff\t%s\t%s\tanother-run\tbuild.sh\tFIXTURE ONLY, a second built row for this number by another run.\n' \
    "$H43N" "$(md5_12 "$C/chess.jsx")" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
  commit_case "H43 an honest rebuild to #$H43N plus a built row naming ffffffffffff by another run"
  expect H43 1 "names bundle ffffffffffff"
fi

# H44 A RESTAMP TO A NUMBER THE REGISTER ALREADY ISSUED GOES FULL [#529 review, jobs/the-series-margin-of-fastgate-is-measured-from-the-base-stamp-so-an-honest-rebuild-after-held-mints-pays-the-full-suite-2026-10-16].
#     Eleven minted-only rows above the top in the case base, each another run's, the shape H33 uses; then app.js
#     restamped to the ninth of them and the real record of that bundle under this harness's runId. #529's first
#     version answered exit 0 with a negative step. A number inside the series is not a fresh mint.
reset_clone
H44TOP="$(reg_top)"
if [ -z "$H44TOP" ]; then
  note "  FAIL H44 [$(tc H44)]  could not read the base register top"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H44"
else
  for k in $(seq 1 11); do
    printf '%s\tminted\t-\t-\t-\t%s\theld-run-%s\tminted\tfixture only, a held run whose mint never landed\n' \
      "$((H44TOP + k))" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$k" >> "$C/gates/build-numbers.tsv"
  done
  new_base "H44 case base: eleven minted-only rows #$((H44TOP+1))..#$((H44TOP+11)), each another run's" >/dev/null
  H44N=$((H44TOP + 9))
  restamp "#$H44N - $NOWET ET" || true
  record_in_clone "$H44N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
  commit_case "H44 restamp to #$H44N, a number another run holds"
  expect H44 2 "sits inside the base series"
fi

# H45 POSITIVE, A RUN WHOSE OWN MINT REACHED MAIN FIRST [#529 second review, both reviewers' N1, jobs/the-series-margin-of-fastgate-is-measured-from-the-base-stamp-so-an-honest-rebuild-after-held-mints-pays-the-full-suite-2026-10-16].
#     The case base carries this harness's own minted row for the next number, the shape a run leaves when its mint
#     travels in an earlier push than its bundle; then app.js restamped to that number and the real record of the
#     bundle under the same runId. buildnum.sh stampable calls the number the run's own, and the first form of the
#     #529 fix sent it FULL as "a number the register already issued". It must take the fast door, as it does on
#     #527's script, so this case is a control that reads ok in both modes.
reset_clone
H45N="$(mint_in_clone)"
if badnum "$H45N"; then
  note "  FAIL H45 [$(tc H45)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H45"
else
  new_base "H45 case base: this harness's own minted row #$H45N, as an earlier push would land it" >/dev/null
  restamp "#$H45N - $NOWET ET" || true
  record_in_clone "$H45N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero; it is best-effort in build.sh too)"
  commit_case "H45 stamp only commit to this run's own #$H45N, minted in the base"
  expect H45 0 "FAST GATE GREEN"
fi

# H46 A BUILT ROW NAMING A CLEARED HELD ROW'S FIELD 1 [#529 second review, reviewer A's N2, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
#     A cleared row is withdrawn, and three of them carry a gated sha in field 1, not a bundle. The forged built row
#     names the first cleared hex row's first 12 characters UNDER THAT ROW'S OWN NUMBER AND RUNID, app.js
#     untouched: since the third pass keyed the held vouch, that is the one shape only the cleared-row rule
#     refuses. Written by hand, because buildnum.sh record writes this harness's runId only.
reset_clone
H46K="$(awk -F'\t' '$1 ~ /^-[0-9a-f]+$/ && NF >= 5 { n = $3; sub(/^#/, "", n); print substr($1, 2, 12) "\t" n "\t" $5; exit }' "$C/gates/held-trees.tsv" 2>/dev/null)"
IFS=$'\t' read -r H46X H46N H46R <<< "$H46K"
if [ -z "$H46X" ] || ! [[ "${H46N:-}" =~ ^[0-9]+$ ]] || [ -z "${H46R:-}" ]; then
  note "  FAIL H46 [$(tc H46)]  no cleared hex row with a number and a runId in gates/held-trees.tsv to fixture"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H46"
else
  printf '%s\tbuilt\t-\t%s\t%s\t%s\t%s\tbuild.sh\tFIXTURE ONLY, a built row naming a cleared held row\047s field 1 under its own key.\n' \
    "$H46N" "$H46X" "$(md5_12 "$C/chess.jsx")" "$(date -u '+%Y-%m-%dT%H:%MZ')" "$H46R" >> "$C/gates/build-numbers.tsv"
  commit_case "H46 a built row for #$H46N under $H46R naming $H46X, that cleared held row's own field 1"
  expect H46 1 "names bundle $H46X"
fi

# H47 A FORGED ROW BESIDE A COPY OF THE LIVE ONE [#529 second review, reviewer B's N2, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
#     On a commit that changes only the register, one run appends two built rows for the live number: one naming
#     the base app.js's own md5, which the vouch holds, and one naming ffffffffffff. The first must not stand for
#     the second, because only a bundle this diff changes, or a live held one, may stand for a sibling.
reset_clone
H47N="${BASESTAMP#\#}"; H47N="${H47N%% *}"
if ! [[ "$H47N" =~ ^[0-9]+$ ]]; then
  note "  FAIL H47 [$(tc H47)]  could not read the live number from the base stamp '$BASESTAMP'"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H47"
else
  # THE COPY IS WRITTEN BY HAND [#529, found by mutant M27]. `buildnum.sh record` is idempotent on number, bundle
  # and source whatever the runId, and the base already holds the live row, so asking it for the copy appended
  # nothing and this case reduced to H40: with seeding from every vouched bundle restored, it still read ok.
  printf '%s\tbuilt\t-\t%s\t%s\t%s\tfastgate-drive\tbuild.sh\tFIXTURE ONLY, a copy of the live bundle under this run.\n' \
    "$H47N" "$(md5_12 "$C/app.js")" "$(md5_12 "$C/chess.jsx")" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
  record_in_clone "$H47N" ffffffffffff "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero)"
  commit_case "H47 two built rows for the live number #$H47N by one run, a copy of the live bundle and ffffffffffff"
  expect H47 1 "names bundle ffffffffffff"
fi

# H48 A HELD ROW VOUCHES FOR ITS OWN NUMBER AND RUNID ONLY [#529 third pass, reviewer B's N3, jobs/the-register-arm-of-fastgate-checks-the-numbers-of-appended-rows-and-not-the-rows-so-a-duplicate-or-wrong-bundle-row-takes-a-fast-green-2026-10-16].
#     The case base carries a live held row for another number under another runId, as H37's does; then, on a
#     commit that changes only the register, one run appends two built rows for the live number: one naming that
#     held bundle and one naming ffffffffffff. A held row vouches for the build it names, not for a row that
#     copies its bundle, so the copy is refused and cannot stand for the forged sibling.
reset_clone
H48TOP="$(reg_top)"
H48N="${BASESTAMP#\#}"; H48N="${H48N%% *}"
if [ -z "$H48TOP" ] || ! [[ "$H48N" =~ ^[0-9]+$ ]]; then
  note "  FAIL H48 [$(tc H48)]  could not read the base register top or the live number from the base stamp"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H48"
else
  H48M=$((H48TOP + 3)); H48Z="$(printf 'd0d0e0%06d' "$H48M")"
  printf '%s\t%s\t#%s\t%s\theld-owner-run\tFIXTURE ONLY, a live held row for another number and run.\t-\n' \
    "$H48Z" "$(printf 'e%039d' 48)" "$H48M" "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/held-trees.tsv"
  new_base "H48 case base: a live held row for #$H48M by held-owner-run naming bundle $H48Z" >/dev/null
  record_in_clone "$H48N" "$H48Z" "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero)"
  record_in_clone "$H48N" ffffffffffff "$(md5_12 "$C/chess.jsx")" || note "    (record returned non-zero)"
  commit_case "H48 two built rows for the live number #$H48N, a copy of another run's held bundle $H48Z and ffffffffffff"
  expect H48 1 "names bundle $H48Z"
fi

# H13 RECURSION GUARD. Re-enter this harness with the guard set and require a named refusal at exit 2, no
#     recursion and no ok line. Run as a case rather than described, because an unproven control is not one.
H13_OUT="$(CT_FASTGATE_DRIVE=1 bash "$HERE/fastgate-drive.sh" "$MODE" 2>&1)"; H13_RC=$?
# Same change as expect() [#524]: the substring test is in-shell and the line-anchored one uses a HERESTRING.
# THE REASON THIS LINE FIRST GAVE WAS FALSE AND IS WITHDRAWN [#524 second pass, antagonist A's NOTE 8]. It
# said "a herestring is a file descriptor, not a pipe, so neither can take SIGPIPE". Measured on bash 5.2.21:
#     $ bash -c 'readlink /proc/self/fd/0 <<<"small payload"'          -> pipe:[2592247]
#     $ bash -c 'B=$(seq 1 200000); readlink /proc/self/fd/0 <<<"$B"'  -> /tmp/sh-thd.5ZFM51 (deleted)
# Since bash 5.1 a SMALL here-string IS a pipe and only a large one falls back to a temp file, so the small
# case - this one, and the membership test in fastgate.sh - is precisely the pipe case. The code is safe for a
# DIFFERENT reason: a redirection is not a PIPELINE, so `pipefail` does not apply and the `if` reads grep's own
# status; the writer that could take SIGPIPE is bash's own child and its death does not change that status.
# Stress on the same shape: 0 misses in 200 trials. The sentence is corrected rather than the code, because a
# future build that cited it would conclude here-strings are immune to a class they are not immune to.
H13_NAMED=no; case "$H13_OUT" in *"CT_FASTGATE_DRIVE is set"*) H13_NAMED=yes ;; esac
H13_SAWOK=no; grep -qaE '^  ok  ' <<<"$H13_OUT" && H13_SAWOK=yes
if [ "$H13_RC" = 2 ] && [ "$H13_NAMED" = yes ] && [ "$H13_SAWOK" = no ]; then
  printf '  ok  %s [%s]  (exit 2, refuses by name, recursed into no case and printed no ok)\n' "H13" "$(tc H13)"
  OK=$((OK+1))
else
  printf '  FAIL %s [%s]  exit %s, or it did not refuse by name, or it printed an ok line\n' "H13" "$(tc H13)" "$H13_RC"
  show_verdict "$H13_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H13"
fi

# ── H49 TO H51: THE UNTRACKED-FILE AND UNTRACKED-DIRECTORY SCANS GET THEIR CASES [#531]. ──────────────────
# jobs/an-untracked-file-hidden-by-info-exclude-steers-the-records-ratchet-of-fastgate-past-every-raw-byte-guard-2026-10-20.
# #530 landed the scan in gates/fastgate.sh and added NO CASE for it, which that job's whatIsLeft (1) names in
# terms: the close condition asks for a case driving the reader's own fixture and a second one for the gatelog
# route, and neither existed anywhere in this harness or in any selftest. These are those cases. H51 covers the
# empty-directory hole that scan could not see and that this run closes beside it.
# WHAT EACH ONE ASSERTS, AND THE LAST CLAUSE IS THE ONE THAT MATTERS: exit 2 with the scan's own reason named,
# AND NO RECORDS VERDICT IN THE OUTPUT AT ALL. The defect was never "the gate says the wrong word" - it was
# that a verdict ABOUT THE COMMIT was computed from a file the commit does not hold, so a case that accepted
# any refusal would pass over the thing it exists to detect. The scans exit before the ratchets run, so the
# absence of a `records:` line is what shows the ratchet never saw the planted path.

# H49 NEGATIVE, THE READER'S OWN FIXTURE: AN EXCLUDED UNTRACKED gates/zz-*.js NAMING A DEAD GATE LOG. The job's
#     `case` field is this, verbatim: an honest register-only commit is GREEN, then an untracked gates/zz-*.js
#     matched by .git/info/exclude names a log nothing holds, and on 366428f that turned the same commit RED
#     with the records ratchet reporting 19 to 20 dead paths - a verdict about the commit, computed from a file
#     the commit does not carry and that neither `git status` nor `git ls-files` reports.
reset_clone
H49U=gates/zz-h49-steer.js
H49N="$(mint_in_clone)"
if badnum "$H49N"; then
  note "  FAIL H49 [$(tc H49)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H49"
else
  commit_case "H49 register only: one minted row for #$H49N"
  if ! probe 0 "FAST GATE GREEN"; then
    note "  FAIL H49 [$(tc H49)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 0 FAST GATE GREEN, so a refusal of the planted tree would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H49"
  else
    ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
    printf '// fastgate-drive.sh H49 fixture, never pushed: this line names claude/agents/gatelogs/000000-nonexistent-xyz.log\n' > "$C/$H49U"
    printf 'gates/zz-h49-steer.js\n' >> "$C/.git/info/exclude"
    if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP info-exclude"
    elif probe 2 "there are UNTRACKED files" "$H49U"; then
      case "$PROBE_OUT" in
        *"records: "*) ROUTES_FAIL="$ROUTES_FAIL info-exclude(a records verdict was computed anyway)"; ROUTE_SHOW="$PROBE_OUT" ;;
        *)             ROUTES_OK="$ROUTES_OK info-exclude" ;;
      esac
    else ROUTES_FAIL="$ROUTES_FAIL info-exclude(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
    rm -f "$C/$H49U"
    sed -i '/^gates\/zz-h49-steer\.js$/d' "$C/.git/info/exclude"
    route_verdict H49 "exit 2, the untracked-file scan names $H49U and no records verdict was computed"
  fi
fi

# H50 NEGATIVE, THE GATELOG ROUTE THE READER NAMED BUT DID NOT DEMONSTRATE: AN EXCLUDED UNTRACKED
#     claude/agents/gatelogs/999999-all.log. gates/control-audit.js audits the HIGHEST-NUMBERED log that passes
#     verify-log.sh, so a planted 999999 would be chosen over the real top log and the audit's verdict would be
#     computed from a file the commit does not hold. This case requires the tier to refuse before that happens.
reset_clone
H50U=claude/agents/gatelogs/999999-all.log
H50N="$(mint_in_clone)"
if badnum "$H50N"; then
  note "  FAIL H50 [$(tc H50)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H50"
else
  commit_case "H50 register only: one minted row for #$H50N"
  if ! probe 0 "FAST GATE GREEN"; then
    note "  FAIL H50 [$(tc H50)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 0 FAST GATE GREEN, so a refusal of the planted tree would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H50"
  else
    ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
    mkdir -p "$C/claude/agents/gatelogs"
    printf 'fastgate-drive.sh H50 fixture, never pushed: a log the commit does not hold, numbered above every real one\nGATES GREEN #999999\n' > "$C/$H50U"
    printf 'claude/agents/gatelogs/999999-all.log\n' >> "$C/.git/info/exclude"
    if ! hidden; then ROUTES_SKIP="$ROUTES_SKIP info-exclude"
    # THE FORBIDDEN TOKEN IS THE RATCHET'S VERDICT AND NOT THE AUDIT'S NAME. My first version of this case
    # also rejected the substring "control-audit", and it FAILED on a tree that had refused correctly: the
    # honest exit-2 output names gates/control-audit.js among the files this tier executes, so the token
    # occurs whatever the verdict. A case must forbid the thing that would mean the audit RAN, which is a
    # records verdict line, not a mention of the script's path. Caught by reading the output rather than the
    # exit code [R18, and CLAUDE.md's rule that a wrong reason reaching the right verdict is a trap].
    elif probe 2 "there are UNTRACKED files" "$H50U"; then
      case "$PROBE_OUT" in
        *"records: "*) ROUTES_FAIL="$ROUTES_FAIL info-exclude(a records verdict was computed anyway)"; ROUTE_SHOW="$PROBE_OUT" ;;
        *)             ROUTES_OK="$ROUTES_OK info-exclude" ;;
      esac
    else ROUTES_FAIL="$ROUTES_FAIL info-exclude(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
    rm -f "$C/$H50U"
    sed -i '/^claude\/agents\/gatelogs\/999999-all\.log$/d' "$C/.git/info/exclude"
    route_verdict H50 "exit 2, the untracked-file scan names $H50U and control-audit.js never audited it"
  fi
fi

# H51 NEGATIVE, AN EMPTY UNTRACKED DIRECTORY, WHICH IS THE ONE THE FILE SCAN CANNOT SEE [#531]. git reports no
#     empty directory in `status` or in `ls-files --others` UNDER A PATHSPEC, which is the measurement #530's
#     comment rested on; `ls-files --others --directory` with NO pathspec does report it, which is the route
#     this run took. The second fresh reviewer of #530 showed the consequence end to end: a directory named
#     after an existing dead citation satisfies the citations reader's existence test, the dead count falls, and
#     the same sha flips from RED at exit 1 to GREEN at exit 0.
#     WHAT THIS CASE PROVES AND WHAT IT DOES NOT, stated rather than left to a reader: it proves the tier now
#     REFUSES a tree carrying such a directory, which closes the route into this tier. It does NOT prove the
#     reader's own premise is fixed - a full suite still reads that directory as a live path - because the
#     durable repair is inside gates/verify-log.sh, whose lock is parked-unlanded by another lane.
reset_clone
H51D=gates/zz-h51-dead-citation.js
H51N="$(mint_in_clone)"
if badnum "$H51N"; then
  note "  FAIL H51 [$(tc H51)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H51"
else
  commit_case "H51 register only: one minted row for #$H51N"
  if ! probe 0 "FAST GATE GREEN"; then
    note "  FAIL H51 [$(tc H51)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 0 FAST GATE GREEN, so a refusal of the planted tree would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H51"
  else
    ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
    mkdir -p "$C/$H51D"
    printf 'gates/zz-h51-dead-citation.js\n' >> "$C/.git/info/exclude"
    # THE PREMISE OF THIS CASE IS THAT GIT CANNOT SEE IT, so that is asserted and not assumed: an empty
    # directory must be absent from `git status` AND from the file scan's own pathspec form, or the case is
    # measuring something else entirely.
    H51SEEN="$(git -C "$C" ls-files --others -- ':(glob)gates/*.js' 2>/dev/null | grep -c . || true)"
    if ! hidden || [ "$H51SEEN" != 0 ]; then
      ROUTES_SKIP="$ROUTES_SKIP info-exclude(git reported the empty directory on this git, so the case cannot pose)"
    elif probe 2 "UNTRACKED DIRECTORIES" "$H51D"; then
      case "$PROBE_OUT" in
        *"records: "*) ROUTES_FAIL="$ROUTES_FAIL info-exclude(a records verdict was computed anyway)"; ROUTE_SHOW="$PROBE_OUT" ;;
        *)             ROUTES_OK="$ROUTES_OK info-exclude" ;;
      esac
    else ROUTES_FAIL="$ROUTES_FAIL info-exclude(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"; fi
    rmdir "$C/$H51D" 2>/dev/null || rm -rf "$C/$H51D"
    sed -i '/^gates\/zz-h51-dead-citation\.js$/d' "$C/.git/info/exclude"
    route_verdict H51 "exit 2, the untracked-DIRECTORY scan names $H51D and no records verdict was computed"
  fi
fi

# H52 A TAMPERED EXECUTED FILE PLUS ONE PLANTED PATH MUST BE REFUSED, NOT ROUTED [#537, TAMPER]. The two
#     untracked scans exit 2 and the tamper pin exits 1, and until this build the scans ran FIRST - so a tree
#     whose gates/verify-log.sh differs from the commit AND which also carries one excluded untracked file was
#     handed to the full suite with the tier's output SILENT about the tamper. Exit 2 is not a safe fallback
#     here: the full suite then runs gates/verify-log.sh, which is the tampered file, and it answers OK about
#     itself. THIS CASE READS exit 2 ON ed65bab AND exit 1 ON THE FIX.
#     IT POSES THREE STEPS AND ASSERTS ALL THREE, because each is worthless without the one before it: the
#     PLANT ALONE must already route to exit 2 (otherwise the plant is inert and step (ii) is just step (i)
#     again), the TAMPER ALONE must already refuse (otherwise there is no refusal for a scan to get in front
#     of), and the tamper WITH the plant must still refuse (which is the defect).
#     STEP (0) WAS MISSING UNTIL ANTAGONIST A MEASURED WHAT IT COST: with an INERT plant, this case's whole
#     assertion set goes GREEN on ed65bab - the one tree it exists to redden - because nothing then produces
#     the exit 2 the ordering bug needs, so (ii) reads exit 1 for the wrong reason and agrees with (i). The
#     case could not fail on the broken tree, which is this project's oldest trap wearing one more costume:
#     the plant was the thing under test AND the thing assumed to work. H49 and H51 both probe their own
#     plants; this one did not.
reset_clone
H52U=gates/zz-h52-plant.js
H52N="$(mint_in_clone)"
if badnum "$H52N"; then
  note "  FAIL H52 [$(tc H52)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H52"
else
  commit_case "H52 register only: one minted row for #$H52N"
  if ! probe 0 "FAST GATE GREEN"; then
    note "  FAIL H52 [$(tc H52)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 0 FAST GATE GREEN, so a refusal of the planted tree would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H52"
  else
    ROUTES_FAIL=""; ROUTES_SKIP=""; ROUTES_OK=""; ROUTES_LEAK=""; ROUTE_SHOW=""
    # (0) THE PLANT MUST STEER. One excluded untracked file at a path this tier's checks read off disk has to
    #     route the HONEST tree to exit 2 by itself. Asserted before the tamper goes anywhere near the tree,
    #     because that is the only state in which the plant's own effect is visible: with the tamper present a
    #     fixed tree refuses at exit 1 whatever the plant does, so a plant that had stopped steering would be
    #     indistinguishable from one that steers. The exclude line is added here and removed in the cleanup
    #     below; step (ii) re-creates only the FILE.
    printf 'gates/zz-h52-plant.js\n' >> "$C/.git/info/exclude"
    printf '// gates/fastgate-drive.sh H52 plant, never pushed\n' > "$C/$H52U"
    if ! hidden; then
      ROUTES_SKIP="$ROUTES_SKIP plant-steers(git reports the plant on this git, so the case cannot pose)"
    elif probe 2 "there are UNTRACKED files" "$H52U"; then
      ROUTES_OK="$ROUTES_OK plant-steers"
    else
      ROUTES_FAIL="$ROUTES_FAIL plant-steers(exit $PROBE_RC - the plant is INERT, so this case cannot redden the tree it exists for)"
      ROUTE_SHOW="$PROBE_OUT"
    fi
    rm -f "$C/$H52U"
    # THE TAMPER: one comment line appended to a file the tier EXECUTES, hidden with assume-unchanged so that
    # `git status` prints nothing - which is the whole reason the raw-byte pin exists and why a reviewer looking
    # at the checkout sees a clean tree.
    printf '\n# gates/fastgate-drive.sh H52 tamper line, never pushed\n' >> "$C/gates/verify-log.sh"
    git -C "$C" update-index --assume-unchanged gates/verify-log.sh >/dev/null 2>&1
    if ! hidden; then
      ROUTES_SKIP="$ROUTES_SKIP assume-unchanged(git still reports the tamper on this git, so the case cannot pose)"
    else
      # (i) THE CONTROL: the tamper on its own must already be a REFUSAL. If this does not hold, the case below
      #     proves nothing about ordering, because there would be no refusal for a scan to get in front of.
      if probe 1 "FAST GATE REFUSED" "gates/verify-log.sh: commit"; then
        ROUTES_OK="$ROUTES_OK tamper-alone"
      else
        ROUTES_FAIL="$ROUTES_FAIL tamper-alone(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"
      fi
      # (ii) THE CASE ITSELF: add one EXCLUDED untracked file at a path the tier's checks read off disk. On
      #      ed65bab this flips the verdict to exit 2 and the tamper vanishes from the output.
      # The exclude line went in at step (0) and is still there; only the file is re-created.
      printf '// gates/fastgate-drive.sh H52 plant, never pushed\n' > "$C/$H52U"
      if probe 1 "FAST GATE REFUSED" "gates/verify-log.sh: commit"; then
        ROUTES_OK="$ROUTES_OK tamper-plus-plant"
      else
        ROUTES_FAIL="$ROUTES_FAIL tamper-plus-plant(exit $PROBE_RC)"; ROUTE_SHOW="$PROBE_OUT"
      fi
      # AND THE PLANT MUST REALLY HAVE BEEN THERE, or (ii) just repeated (i). Asserted rather than assumed,
      # because a cleanup that ran early would make this case silently identical to the control above.
      if [ ! -e "$C/$H52U" ]; then
        ROUTES_FAIL="$ROUTES_FAIL plant-vanished(the fixture file was gone before the probe)"
      fi
      # THIS CASE CLEANS UP AFTER ITSELF: reset_clone's `git clean -qfd` KEEPS IGNORED FILES, and the exclude
      # line and the index flag are outside the commit graph entirely, so none of the three is removed by it.
      # H49 and H51 remove their own plants for the same reason and H25 clears its own flag.
      rm -f "$C/$H52U"
    fi
    # THE EXCLUDE LINE IS REMOVED AT THE SAME LEVEL IT WAS ADDED. Step (0) appends it unconditionally, so a
    # remove nested inside `if ! hidden`'s else - where it sat when step (ii) still added it - leaks the entry
    # into whatever case runs after this one on the ROUTES_SKIP path. H49 and H51 are symmetric and this is now
    # too. Blast radius today is zero (H52 is last and the clone is trap-removed), which is exactly why the
    # commit message's claim that cleanup was "unchanged, and still explicit" needed correcting rather than
    # excusing. Found by antagonist A, #537.
    sed -i '/^gates\/zz-h52-plant\.js$/d' "$C/.git/info/exclude"
    git -C "$C" update-index --no-assume-unchanged gates/verify-log.sh >/dev/null 2>&1
    if ! restore_raw gates/verify-log.sh; then
      ROUTES_FAIL="$ROUTES_FAIL could-not-restore(gates/verify-log.sh left doctored, which would confound every later case)"
    fi
    route_verdict H52 "exit 1, FAST GATE REFUSED naming the gates/verify-log.sh tamper, with a plant that is first shown to route the honest tree to exit 2 on its own"
  fi
fi

# H53 NEGATIVE [#540, F4]. THE HEAD'S records-gate.sh IS EXECUTED BEFORE FORCE IS DECIDED, which is
#     jobs/fastgate-runs-the-heads-records-gate-before-it-decides-force-so-a-planted-entries-arm-turns-a-records-gate-change-into-a-fast-green-2026-10-23.
#     A COMMITTED records-gate.sh whose --entries arm writes a marker file is FORCE by path, and on main
#     e8dd9cb's script the verdict is exit 2 FULL SUITE REQUIRED - with the marker WRITTEN, because the tier
#     ran `records-gate.sh --entries` from the working tree in its BNRATCHET block before the FORCE loop ever
#     looked at the changed set. The exit code is 2 either way, so the exit code alone cannot see this case:
#     the discriminating observable is the marker, and the TAMPER pin cannot help, because a committed plant
#     equals its own head blob. The fixture is committed, never hidden, and the harness's own scratch
#     directory holds the marker so no case can leave one behind.
#     THE PREMISE IS ASSERTED FIRST: the plant must be LIVE (running the head's --entries by hand writes the
#     marker), or an absent marker would prove nothing about the order.
reset_clone
H53M="$W/h53-marker"; rm -f "$H53M"
sed -i "2i case \"\${1:-}\" in --entries) : > $H53M ;; esac" "$C/gates/records-gate.sh"
commit_case "H53 planted records-gate.sh: its --entries arm writes a marker, never pushed"
( cd "$C" && bash "$C/gates/records-gate.sh" --entries >/dev/null 2>&1 ) || true
if [ ! -e "$H53M" ]; then
  note "  FAIL H53 [$(tc H53)]  the fixture's premise does not hold: the planted --entries arm did not write its marker when run by hand, so the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H53"
else
  rm -f "$H53M"
  if probe 2 "FULL SUITE REQUIRED" "gates/records-gate.sh"; then
    if [ -e "$H53M" ]; then
      note "  FAIL H53 [$(tc H53)]  exit 2 and the path named, but the head's records-gate.sh --entries RAN before the decision (marker written) - the defect"
      show_verdict "$PROBE_OUT"
      BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H53"
    else
      note "  ok  H53 [$(tc H53)]  (exit 2, FULL SUITE REQUIRED naming gates/records-gate.sh, and the head's --entries arm never ran: no marker)"
      OK=$((OK+1))
    fi
  else
    note "  FAIL H53 [$(tc H53)]  exit $PROBE_RC, expected 2 FULL SUITE REQUIRED naming gates/records-gate.sh"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H53"
  fi
fi
rm -f "$H53M"

# H54 NEGATIVE [#540, F4], THE SAME ORDER IN THE REGISTER ARM. Whenever gates/build-numbers.tsv is in the
#     changed set the register arm runs the head's `buildnum.sh next` before the FORCE loop, so a committed
#     buildnum.sh whose next arm writes a marker, beside an honest mint, had its head copy executed on main
#     e8dd9cb's script (exit 2 FULL SUITE REQUIRED, marker WRITTEN). TWO HALVES, ONE VERDICT, because the
#     placement of the fix is the point: (i) the ORDERING CONTROL - the same plant beside a planted `999
#     minted` row must STILL be refused at exit 1 by the read-only series ceiling, which precedes any
#     execution, with no marker; a fix placed at the top of the script would route that wedge to a suite
#     that runs no series check and land it. (ii) THE CASE - the plant beside an honest mint must exit 2
#     naming gates/buildnum.sh with the marker ABSENT. The mint is made with the PLANTED buildnum.sh, whose
#     next arm writes the marker while the fixture is cut, so the marker is removed after the mint and before
#     the probe - and the premise (the plant is live) is that very write.
reset_clone
H54M="$W/h54-marker"; rm -f "$H54M"
H54FAIL=""
sed -i "2i case \"\${1:-}\" in next) : > $H54M ;; esac" "$C/gates/buildnum.sh"
printf '999\tminted\t-\t-\t-\t%s\tfastgate-drive-fixture\tminted\tplanted row beside a planted buildnum.sh, fixture only, never pushed\n' \
  "$(date -u '+%Y-%m-%dT%H:%MZ')" >> "$C/gates/build-numbers.tsv"
commit_case "H54 (i) planted buildnum.sh beside a planted 999 row"
rm -f "$H54M"
if probe 1 "FAST GATE REFUSED" "the series cannot carry"; then
  [ -e "$H54M" ] && H54FAIL="$H54FAIL ceiling-ran-the-plant(the 999 refusal is read-only and must not execute buildnum.sh, but the marker was written)"
else
  H54FAIL="$H54FAIL ceiling(exit $PROBE_RC, expected 1 at the series ceiling - a fix placed above the ceiling routes the wedge to a suite that runs no series check)"; H54SHOW="$PROBE_OUT"
fi
rm -f "$H54M"
reset_clone
sed -i "2i case \"\${1:-}\" in next) : > $H54M ;; esac" "$C/gates/buildnum.sh"
H54N="$(mint_in_clone)"
if badnum "$H54N"; then
  H54FAIL="$H54FAIL mint(could not mint a fixture number in the clone with the planted buildnum.sh)"
elif [ ! -e "$H54M" ]; then
  H54FAIL="$H54FAIL premise(the planted next arm did not write its marker while the mint ran, so the plant is not live)"
else
  rm -f "$H54M"
  commit_case "H54 (ii) planted buildnum.sh beside an honest mint for #$H54N, never pushed"
  if probe 2 "FULL SUITE REQUIRED" "gates/buildnum.sh"; then
    [ -e "$H54M" ] && { H54FAIL="$H54FAIL order(exit 2 and the path named, but the head's buildnum.sh next RAN before the decision - marker written - the defect)"; H54SHOW="$PROBE_OUT"; }
  else
    H54FAIL="$H54FAIL case(exit $PROBE_RC, expected 2 FULL SUITE REQUIRED naming gates/buildnum.sh)"; H54SHOW="$PROBE_OUT"
  fi
fi
rm -f "$H54M"
if [ -n "$H54FAIL" ]; then
  note "  FAIL H54 [$(tc H54)] $H54FAIL"
  [ -n "${H54SHOW:-}" ] && show_verdict "$H54SHOW"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H54"
else
  note "  ok  H54 [$(tc H54)]  (exit 1 at the series ceiling with the 999 row and no marker; exit 2 FULL SUITE REQUIRED naming gates/buildnum.sh beside an honest mint, and the head's next arm never ran: no marker)"
  OK=$((OK+1))
fi

# H55 THREE TREES: THE RECORDS RATCHET MUST ACCEPT AN IMPROVEMENT AND STILL REFUSE A REGRESSION [#544, item (5)
#     of directOpening_2026_10_28_batch4;
#     jobs/the-records-ratchet-refuses-the-commit-that-fixes-the-arm-5-breach-and-the-roster-says-this-mode-cannot-redden-a-build-2026-10-10,
#     whose testCase field asks for exactly this shape and these three expectations].
#     WHAT WAS WRONG. gates/fastgate.sh's records ratchet reduced the two PROSE verdict lines of
#     `verify-log.sh --citations` with sig() and compared them with worse(), and those lines change shape
#     between their branches: the arm (5) RED line enumerates six breach counters, its OK line enumerates the
#     register's TOTALS, and NOT CHECKED carries no number at all. worse() refuses outright when the field count
#     differs, so FIXING a breach read WORSE and the commit that repaired the thing the ratchet watches read
#     FAST GATE RED. The same comparison also called a GROWING register worse, because rows, tables and stories
#     are sizes rather than defects.
#     WHY THREE HEADS AND NOT ONE. The defect is visible only in the direction nobody tested. A single-input
#     control is satisfied by (a) alone, and a two-input one by (a) and (c) - the pair any author would write -
#     while (b), the improvement, is the case that failed. So the base is held fixed and three heads are driven
#     against it: unchanged, improved, and worsened.
#     THE FIXTURE IS TWO WRONG-WIDTH ROWS IN THE CASE REGISTER, which is the defect class arm (5) counts and the
#     one the job measured at 4 of a ceiling of 2. Each row carries one unescaped pipe, so it reads one column
#     too wide; the improvement escapes the pipe and changes nothing else, so the flip is arm (5)'s and no other
#     arm's. The premise is asserted before any head is driven: the base must actually read widthrise=2.
reset_clone
H55F=claude/stories/TEST-CASES.md
h55_set(){ # <broken2|fixed2|broken3>  rewrite the fixture rows, idempotently
  python3 -I - "$C/$H55F" "$1" <<'PY'
import sys
p, mode = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read().split('\n')
s = [l for l in s if not l.startswith('| TC-DRIVE-H55-')]
idx = max(i for i, l in enumerate(s) if l.startswith('| TC-SUITE-'))
pipe = r'an escaped \| pipe' if mode == 'fixed2' else 'an unescaped | pipe'
ids = ['A', 'B', 'C'] if mode == 'broken3' else ['A', 'B']
rows = ['| TC-DRIVE-H55-%s | US-BN-01 | fixture only, never pushed: this row carries %s, so it reads one '
        'column too wide | - | - | - |' % (i, pipe) for i in ids]
s[idx+1:idx+1] = rows
open(p, 'w', encoding='utf-8').write('\n'.join(s))
PY
}
# NO PIPELINE OUT OF THE SCRIPT [#544, antagonist A's finding F4]. This read
#   timeout 120 bash gates/verify-log.sh --citations 2>&1 | grep -oE 'widthrise=[0-9]+' | head -1 | cut -d= -f2
# which is a TIER D early-exit pipe: `head` can close the pipe while the producer is still writing and the
# pipeline's status is discarded, so a producer killed by SIGPIPE is indistinguishable from one that finished.
# It is one of the two sites item (5) and item (14) of this run created, and the close-out commit that fixed two
# others attributed these two to the wrong file - corrected on the record and fixed here.
# The output goes to a file and awk reads it: no second process to signal, and the early exit is awk's own.
# AND THE CAPTURE IS A VARIABLE, NOT A FILE IN THE CLONE. MEASURED: my first draft of this repair wrote
# `$C/.h55w.txt`, and `commit_case` does `git add -A`, so the scratch file landed IN THE FIXTURE COMMIT and
# fastgate answered `exit 2 FULL SUITE REQUIRED - These paths are not records-only` - H55 red for a reason
# that has nothing to do with widthrise, which is a wrong-reason red of exactly the kind this run has spent
# its day removing. A herestring has no producer process to kill and leaves nothing on disk.
h55_width(){ local o; o="$( cd "$C" && timeout 120 bash gates/verify-log.sh --citations 2>&1 || true )"
             awk 'match($0,/widthrise=[0-9]+/){print substr($0,RSTART+10,RLENGTH-10); exit}' <<<"$o" ; }
h55_set broken2
# `new_base ... >/dev/null` AND NOT `$(new_base ...)`, WHICH IS THE IDIOM EVERY OTHER CALLER USES AND THE FIRST
# DRAFT OF THIS CASE GOT WRONG: new_base sets the global CASEBASE that run_fastgate gates against, and command
# substitution runs it in a SUBSHELL, so the assignment is lost while its `update-ref` still moves the clone's
# origin/main. The result is a base and an origin/main that disagree, and all three heads read
# `FAST GATE REFUSED - the base is not what origin/main carries` - exit 1 in every pose, which (c) would have
# accepted on the exit code alone. Caught by this case's own substring assertion, which is why probe() takes one.
new_base "H55 base: two wrong-width fixture rows, never pushed" >/dev/null
H55BASE="$CASEBASE"
H55W="$(h55_width)"
if [ "${H55W:-missing}" != 2 ]; then
  note "  FAIL H55 [$(tc H55)]  the fixture's premise does not hold: the base reads widthrise=${H55W:-missing},"
  note "         not 2, so neither the improvement nor the regression below would be the flip they claim"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H55"
else
  H55FAIL=""; H55SHOW=""
  # (a) THE SAME REGISTER STATE. One innocuous records-only line, deliberately carrying no path, no pipe and no
  #     case id, so every counter on the ratchet line is identical on both sides. Expect exit 0.
  printf '\nH55 fixture line, never pushed: it deliberately carries no path, no pipe and no case id.\n' >> "$C/$H55F"
  commit_case "H55a an innocuous records-only line, the register state unchanged"
  if ! probe 0 "records: no worse than base"; then H55FAIL="$H55FAIL (a) exit $PROBE_RC"; H55SHOW="$PROBE_OUT"; fi
  # (b) THE IMPROVEMENT, AND THE ONE THAT READ EXIT 1 BEFORE THIS ITEM. The two rows' pipes are escaped, so
  #     arm (5) flips RED -> OK and widthrise falls 2 -> 0 with every other counter unmoved. Expect exit 0.
  git -C "$C" reset --hard --quiet "$H55BASE" >/dev/null 2>&1; git -C "$C" clean -qfd >/dev/null 2>&1
  h55_set fixed2
  commit_case "H55b the two wrong-width rows escaped, so arm (5) flips RED to OK"
  if ! probe 0 "records: no worse than base"; then H55FAIL="$H55FAIL (b) exit $PROBE_RC"; H55SHOW="$PROBE_OUT"; fi
  # (c) THE REGRESSION, WHICH MUST STILL BE REFUSED. One further wrong-width row: widthrise rises 2 -> 3.
  #     Expect exit 1 with the ratchet naming it. A fix that made (b) pass by loosening the comparison would
  #     show up here, which is why this head is in the same case rather than trusted to the ones above.
  git -C "$C" reset --hard --quiet "$H55BASE" >/dev/null 2>&1; git -C "$C" clean -qfd >/dev/null 2>&1
  h55_set broken3
  commit_case "H55c one further wrong-width row, never pushed"
  if ! probe 1 "this commit made it WORSE"; then H55FAIL="$H55FAIL (c) exit $PROBE_RC"; H55SHOW="$PROBE_OUT"; fi
  if [ -n "$H55FAIL" ]; then
    note "  FAIL H55 [$(tc H55)] $H55FAIL  (wanted: (a) 0 no worse, (b) 0 no worse, (c) 1 WORSE)"
    [ -n "$H55SHOW" ] && show_verdict "$H55SHOW"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H55"
  else
    note "  ok  H55 [$(tc H55)]  (base widthrise=2; head unchanged -> exit 0 no worse, head improved -> exit 0 no worse, head worsened -> exit 1 WORSE)"
    OK=$((OK+1))
  fi
fi

# H56 A CHECKOUT PATH CONTAINING A SPACE [#544, item (14) of directOpening_2026_10_28_batch4;
#     jobs/gates-fastgate-sh-keeps-git-in-a-string-so-at-a-checkout-path-with-a-space-every-git-call-fails-and-its-refusals-become-routes-2026-10-22].
#     WHAT WAS WRONG: gates/fastgate.sh kept `GIT="git -C $ROOT --git-dir=$ROOT/.git --work-tree=$ROOT"` as a
#     STRING and used it unquoted at 42 sites. At a path with a space, $ROOT word-split and EVERY git call in
#     the file failed silently: HEAD resolved to the literal string `unknown`, and the base-identity and
#     ancestry REFUSALS did not fire - so exit 1 became exit 2 and a refusal became a route to the full suite.
#     THE CASE IS THE JOB'S OWN whatWouldCloseIt: a clone at a path containing a space, a bogus base sha, and
#     exit 1 with "does not name a commit in this repository" - which is what a path WITHOUT a space has always
#     given. MEASURED at #544 in both directions over byte-identical trees: with $GIT an array, exit 1 and the
#     base refusal; with main's string version, `head unknown` and FULL SUITE REQUIRED at exit 2.
#     IT CLONES RATHER THAN RENAMING $C, because $C is this harness's own scratch clone and every case above
#     uses it; a case that moved it would be measuring the previous case's tree.
reset_clone
H56D="$W/with space"
mkdir -p "$H56D"
if ! git clone --quiet --no-hardlinks --shared "$C" "$H56D/clone" >/dev/null 2>&1; then
  note "  FAIL H56 [$(tc H56)]  could not clone into a path containing a space, so the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H56"
else
  ( cd "$H56D/clone" && git update-ref refs/remotes/origin/main "$(git rev-parse HEAD)" ) >/dev/null 2>&1
  printf 'gates/node_modules\n' >> "$H56D/clone/.git/info/exclude"
  ln -s "$ROOT/gates/node_modules" "$H56D/clone/gates/node_modules" 2>/dev/null || true
  H56DIRTY="$( cd "$H56D/clone" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ' )"
  H56OUT="$( cd "$H56D/clone" && CT_FASTGATE_DRIVE=1 timeout 250 bash gates/fastgate.sh 0000000000000000000000000000000000000000 2>&1 )"; H56RC=$?
  # A HERESTRING AND awk, NOT `printf | grep -m1 || true` [#544, antagonist A's finding F4]: that form is a
# TIER C site - an early-exiting grep whose status is swallowed by `|| true` - and item (14) of this run
# created it. awk over a herestring has no producer process to kill and its exit is its own.
# THE LENGTH BOUND IS A TEST AND NOT AN INTERVAL, because THIS CONTAINER'S awk IS mawk 1.3.4 AND mawk DOES
# NOT SUPPORT `{n,m}` INTERVALS. Measured while writing this: `/head ([0-9a-f]{7,40}|unknown)/` matched
# `head 1234567` out of `head 1234567abcdef0` - a TRUNCATED sha, which would have made H56 compare the wrong
# string and go red for a reason that has nothing to do with provenance. The greedy `+` plus an explicit length
# test reproduces grep -oE's 7-to-40 bound: "head " is five characters, so seven hex digits is length 12.
H56HEAD="$( awk 'match($0,/head ([0-9a-f]+|unknown)/){v=substr($0,RSTART,RLENGTH); if(v=="head unknown"||length(v)>=12){print v; exit}}' <<<"$H56OUT" )"
  if [ "$H56DIRTY" != "0" ]; then
    note "  FAIL H56 [$(tc H56)]  the spaced clone is DIRTY ($H56DIRTY path(s)), so fastgate refuses for that instead of for the base - the case cannot pose"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H56"
  elif [ "$H56RC" = 1 ] && case "$H56OUT" in *"does not name a commit in this repository"*) true;; *) false;; esac; then
    note "  ok  H56 [$(tc H56)]  (exit 1 at a path containing a space, refusing the bogus base by name, with the provenance reading '$H56HEAD')"
    OK=$((OK+1))
  else
    note "  FAIL H56 [$(tc H56)]  exit $H56RC at a path containing a space, provenance '$H56HEAD' - wanted exit 1 refusing the base by name. A STRING \$GIT reads 'head unknown' and routes at exit 2."
    show_verdict "$H56OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H56"
  fi
fi
rm -rf "$H56D"

# ── H57 AN EXTENSIONLESS UNTRACKED FILE THAT SHADOWS A COMMITTED MODULE [#544, item (22) of
# directOpening_2026_10_28_batch4; jobs/the-untracked-plant-scans-of-fastgate-key-on-the-file-extension-so-an-
# extensionless-gates-lib-that-node-resolves-first-takes-a-fast-green-2026-10-22, P1, antagonist B of #531].
# WHAT IT POSES: every untracked-plant scan in gates/fastgate.sh before #544 keyed on the EXTENSION, and an
# extensionless file is the one shape Node tries BEFORE the committed .js. B measured `gates/lib` and
# `gates/drive/home`, each untracked and hidden in .git/info/exclude, taking EXIT 0 FAST GATE GREEN on 166d2ed,
# while the inert gates/regress/zz.txt took exit 2 - and proved the shadow LOADS, with require.resolve('../lib')
# from gates/regress/ resolving to the plant.
# TWO PLANTS, NOT ONE, because they exercise the two different pathspec depths the scan has to reach:
# gates/lib is one level under gates/ and gates/drive/home is two, and B measured both.
# THE PREMISE IS ASSERTED FIRST, in its own step, the way H28, H53 and H56 do it: the honest tree must answer
# exit 0 FAST GATE GREEN, or a refusal of the planted tree proves nothing about the plant. That step is also
# what the job's whatWouldCloseIt asks for in its second clause - the four real untracked directories
# (gates/logs/, gates/node_modules/, gates/shots/, gates/.site/) still read exit 0. [#545: "the clone carries
# them" was FALSE as #544 wrote it - a fresh clone carries none of them - so the premise now writes them first.]
# AND IT ASSERTS THE PLANTS ARE HIDDEN, because if `git status` can see them fastgate refuses for dirtiness and
# the case would pass for the wrong reason, which is this project's standing trap.
H57N="$(mint_in_clone)"
if badnum "$H57N"; then
  note "  FAIL H57 [$(tc H57)]  could not mint a fixture number in the clone"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H57"
else
  commit_case "H57 register only: one minted row for #$H57N"
  # THE SECOND CLAUSE, DRIVEN AND NOT ARGUED [#545, item (5) of directOpening_2026_10_29_batch5]. The orchestrator's
  # verification of #544 measured that the sentence above ("the clone carries them") was false: the clone is a
  # fresh `git clone`, and gates/logs/, gates/node_modules/, gates/shots/ and gates/.site/ are gitignored with no
  # tracked files, so the clone carried NONE of them and the GREEN premise was over a tree without them. So the
  # premise now POPULATES all four before it probes, with the shapes a real container has - and EXTENSIONLESS files
  # among them, because that is exactly what the scan hunts: a live suite lock is gates/logs/.suite.lock/ holding
  # `pid`, `log` and `started`, and node_modules is full of extensionless LICENSE and bin entries. If the scan
  # ever stops honouring .gitignore, this premise goes red at exit 2 instead of the honest tree reading green.
  # THREE OF THEM ARE THE SHAPE THE SCAN ACTUALLY READS - two levels under gates/, no dot anywhere in the path, no
  # extension: gates/logs/h57, gates/node_modules/h57 and gates/shots/h57. The rest are realistic and the scan
  # skips them by design (a dot in the path, or three levels deep); the three are what make this premise able to
  # fail. MEASURED in a scratch clone: `ls-files --others` with the scan's pathspecs lists all three, and only the
  # `HEAD:<f>.js` sibling test keeps them out of the refusal - drop that test and this premise reads exit 2.
  H57POP="gates/logs/.suite.lock/pid gates/logs/.suite.lock/log gates/logs/545-all.log gates/logs/h57 gates/node_modules/h57pkg/LICENSE gates/node_modules/h57pkg/index.js gates/node_modules/.bin/h57 gates/node_modules/h57 gates/shots/gates-545/h57.png gates/shots/h57 gates/.site/index.html gates/.site/h57"
  for p in $H57POP; do mkdir -p "$C/$(dirname "$p")"; printf 'fastgate-drive H57 populated ignored path, never pushed\n' > "$C/$p"; done
  H57POPN=0; for p in $H57POP; do [ -f "$C/$p" ] && H57POPN=$((H57POPN+1)); done
  if [ "$H57POPN" != 12 ] || ! hidden; then
    note "  FAIL H57 [$(tc H57)]  the populated ignored directories did not pose: $H57POPN of 12 files written, or git status can see them"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H57"
  elif ! probe 0 "FAST GATE GREEN"; then
    note "  FAIL H57 [$(tc H57)]  the fixture's premise does not hold: the honest tree answered exit $PROBE_RC and"
    note "         not exit 0 FAST GATE GREEN, so a refusal of the planted tree would prove nothing"
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H57"
  else
    printf 'module.exports={PLANTED:"fastgate-drive H57, never pushed"};\n' > "$C/gates/lib"
    printf 'module.exports={PLANTED:"fastgate-drive H57, never pushed"};\n' > "$C/gates/drive/home"
    printf 'gates/lib\ngates/drive/home\n' >> "$C/.git/info/exclude"
    H57RESOLVE="$( cd "$C/gates/regress" && node -e 'process.stdout.write(require.resolve("../lib"))' 2>/dev/null || true )"
    if ! hidden; then
      note "  FAIL H57 [$(tc H57)]  the plants are VISIBLE to git status, so fastgate would refuse for dirtiness instead - the case cannot pose"
      BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H57"
    elif [ "$H57RESOLVE" != "$C/gates/lib" ]; then
      # THE SHADOW MUST ACTUALLY SHADOW, or this case is about a file nothing would load [#385's rule: assert
      # the thing is PRESENT before asserting anything about its effect]. Node's own resolver answers this.
      note "  FAIL H57 [$(tc H57)]  require.resolve('../lib') from gates/regress/ answered '$H57RESOLVE', not the plant, so there is no shadow to detect"
      BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H57"
    elif probe 2 "UNTRACKED EXTENSIONLESS FILES" "gates/lib" "gates/drive/home"; then
      note "  ok  H57 [$(tc H57)]  (exit 2, the extensionless-shadow scan names BOTH plants, and node's own resolver confirms require('../lib') from gates/regress/ loads the plant)"
      OK=$((OK+1))
    else
      note "  FAIL H57 [$(tc H57)]  exit $PROBE_RC - wanted exit 2 naming both extensionless plants. A scan that keys on the extension answers exit 0 FAST GATE GREEN here."
      show_verdict "$PROBE_OUT"
      BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H57"
    fi
    rm -f "$C/gates/lib" "$C/gates/drive/home"
    sed -i -e '/^gates\/lib$/d' -e '/^gates\/drive\/home$/d' "$C/.git/info/exclude"
  fi
  for p in $H57POP; do rm -f "$C/$p"; done
  rm -rf "$C/gates/logs/.suite.lock" "$C/gates/node_modules/h57pkg" "$C/gates/node_modules/.bin/h57" "$C/gates/shots/gates-545" "$C/gates/.site/h57"
fi


# ── H58..H61 FOUR REFUSAL BRANCHES THAT HAD NEITHER A CASE NOR A MUTANT [#544, item (33) of
# directOpening_2026_10_28_batch4; jobs/four-new-refusal-branches-in-fastgates-read-pin-and-catch-all-have-
# neither-a-case-nor-a-mutant-2026-10-20, P2, raised by build #527's blind antagonist pair from BOTH doors].
# #527's P1 added the READ pin and the catch-all with six cases and nine mutants. FOUR of its exit-2/exit-1
# branches were covered by neither, so their refusals were asserted by their author and by nobody else - which
# is this project's own "prove a gate against a deliberately broken build" rule unmet for four branches of the
# script every future push is justified by. All four FAIL SAFE today, which is why the job is a filing and not
# a veto; the risk is that a later edit turns one into a silent pass.
#
# EVERY FIXTURE BELOW LEAVES `git status --porcelain` EMPTY, measured in its own step, because fastgate's first
# guard refuses a dirty tree at exit 1 and a case that trips it is green for the wrong reason - this project's
# standing trap, and the reason H57 asserts `hidden` before it asserts anything else.
#
# AND EVERY MUTANT IS COMMITTED, WHICH IS NOT A DETAIL: MEASURED while building this item, a mutant sed'd into
# the clone's working tree and left uncommitted makes the run answer "FAST GATE REFUSED - working tree is DIRTY
# (1 path(s))" - the mutant run goes red for a reason that has nothing to do with the branch under test, which
# would read exactly like a mutant that turns. mutant_probe therefore commits the edit, and it CHECKS THE SED
# CHANGED THE FILE before trusting the result [CLAUDE.md #416: a control that disturbs nothing and leaves the
# measured quantity untouched reads like a gate that cannot fail].
MUT_OUT=""; MUT_RC=0
mutant_probe(){ # <case> <sed expr> <the sentence the branch prints>: 0 when the sentence is GONE after mutation
  local c="$1" sx="$2" sent="$3" before after
  before="$(md5sum "$C/gates/fastgate.sh" | cut -d' ' -f1)"
  sed -i "$sx" "$C/gates/fastgate.sh" 2>/dev/null || { MUT_OUT="sed failed"; MUT_RC=-1; return 1; }
  after="$(md5sum "$C/gates/fastgate.sh" | cut -d' ' -f1)"
  if [ "$before" = "$after" ]; then MUT_OUT="THE SED MATCHED NOTHING - the mutant did not mutate"; MUT_RC=-1; return 1; fi
  if ! bash -n "$C/gates/fastgate.sh" 2>/dev/null; then MUT_OUT="the mutant does not parse"; MUT_RC=-1; return 1; fi
  commit_case "$c mutant: the branch under test disabled"
  MUT_OUT="$(run_fastgate)"; MUT_RC=$?
  case "$MUT_OUT" in *"$sent"*) return 1 ;; *) return 0 ;; esac
}

# H58 THE READ PIN'S `!= MISSING` CONJUNCT. A name the commit cannot resolve must be a refusal and never
# MISSING = MISSING credited as a match. THE REACHABLE FIXTURE IS A TRACKED NAME CONTAINING A NEWLINE, and it
# took three tries to find one that keeps the tree clean: a path staged but absent from HEAD is visible to
# `git status` as a staged addition, so the dirty guard eats it. `git ls-files` QUOTES a name containing a
# newline even under core.quotePath=false, so the read pin reads the literal 11-character-prefixed string
# `"gates/regress/zz\nq.js"`, quotes and backslash included; `rev-parse HEAD:<that>` and
# `hash-object <that>` both fail, so hb and wb are BOTH MISSING - the exact state the conjunct exists for -
# while the commit itself is ordinary and the tree is clean.
reset_clone
printf 'module.exports={};\n' > "$C/$(printf 'gates/regress/zz\nq.js')"
commit_case "H58 fixture: a tracked file whose name contains a newline"
if [ -n "$(git -C "$C" status --porcelain 2>/dev/null)" ]; then
  note "  FAIL H58 [$(tc H58)]  the fixture left the clone DIRTY, so fastgate would refuse for dirtiness and the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H58"
elif ! probe 1 "FAST GATE REFUSED" "commit MISSING, working tree MISSING"; then
  note "  FAIL H58 [$(tc H58)]  exit $PROBE_RC - wanted exit 1 with the read pin naming the unresolvable name as MISSING on both sides"
  show_verdict "$PROBE_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H58"
elif ! mutant_probe H58 's|^  \[ "$hb" != MISSING \] && \[ "$hb" = "$wb" \] |  [ "$hb" = "$wb" ] |' "commit MISSING, working tree MISSING"; then
  note "  FAIL H58 [$(tc H58)]  the MUTANT did not turn: with the \`!= MISSING\` conjunct dropped the run still prints the read pin's refusal (exit $MUT_RC), so the conjunct is not what produced the green above"
  show_verdict "$MUT_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H58"
else
  note "  ok  H58 [$(tc H58)]  (exit 1 naming the name MISSING on both sides; with the conjunct dropped MISSING = MISSING is credited as a match and the run falls through to exit $MUT_RC)"
  OK=$((OK+1))
fi
reset_clone

# H59 THE READ PIN'S EMPTY-SET REFUSAL. An empty input set is the state the non-empty-denominator rule exists
# for, and the job names it as one of the two that most need a case: with no tracked file matching PSCAN_PATS
# the pin pins NOTHING, and `[ -n "$READPIN" ]` is false over nothing, so without the RN = 0 branch the tier
# would be taken on a pin that read no file at all. The fixture commits the removal of every PSCAN path, which
# keeps index and disk consistent and the tree clean.
reset_clone
git -C "$C" rm -q -r gates/regress gates/drive gates/lib.js gates/mountcheck.js gates/engine-extract.js >/dev/null 2>&1
commit_case "H59 fixture: no tracked file matches PSCAN_PATS"
if [ -n "$(git -C "$C" status --porcelain 2>/dev/null)" ]; then
  note "  FAIL H59 [$(tc H59)]  the fixture left the clone DIRTY, so the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H59"
elif [ -n "$(git -C "$C" -c core.quotePath=false ls-files -- ':(glob)gates/regress/*.js' ':(glob)gates/lib.js' 2>/dev/null)" ]; then
  note "  FAIL H59 [$(tc H59)]  the fixture did not empty the set: ls-files still lists a PSCAN path, so RN cannot be 0"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H59"
elif ! probe 2 "The read pin found NO tracked file matching PSCAN_PATS" "never credited"; then
  note "  FAIL H59 [$(tc H59)]  exit $PROBE_RC - wanted exit 2 with the read pin reporting its empty set and refusing to credit it"
  show_verdict "$PROBE_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H59"
elif ! mutant_probe H59 's|^if \[ "$RN" = 0 \]; then|if false; then|' "The read pin found NO tracked file matching PSCAN_PATS"; then
  note "  FAIL H59 [$(tc H59)]  the MUTANT did not turn: with the RN = 0 branch disabled the run still reports the empty set (exit $MUT_RC)"
  show_verdict "$MUT_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H59"
else
  note "  ok  H59 [$(tc H59)]  (exit 2 reporting the empty pin set; with the branch disabled an empty pin is silent and the run goes on to exit $MUT_RC)"
  OK=$((OK+1))
fi
reset_clone

# H60 THE CATCH-ALL'S NON-PLAIN-ENTRY REFUSAL, the job's other named priority. The catch-all hashes FILE BYTES,
# so a symlink, a submodule or a conflict stage is routed to the full suite rather than judged. THE FIXTURE HAD
# TO BE A RECORDS-ONLY PATH and that is a measurement, not a preference: a tracked symlink at gates/zzlink is
# refused 1900 lines EARLIER, by the records-only classifier ("gates/ path this script does not recognise -
# defaulting to FULL"), so CA_ODD never runs and the case would have been green for another branch's reason.
# A symlink under claude/agents/gatelogs/ is records-only, so the tier is taken and the catch-all is reached.
# new_base makes the candidate itself the base, so the diff is the fixture alone and nothing else can classify.
reset_clone
new_base "H60 base: the candidate itself, so the diff is the fixture alone" >/dev/null
ln -s 540-all.log "$C/claude/agents/gatelogs/zz-h60.log"
commit_case "H60 fixture: a records-only path committed as a symlink"
if [ -n "$(git -C "$C" status --porcelain 2>/dev/null)" ]; then
  note "  FAIL H60 [$(tc H60)]  the fixture left the clone DIRTY, so the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H60"
elif [ "$(git -C "$C" ls-files -s -- claude/agents/gatelogs/zz-h60.log 2>/dev/null | cut -d' ' -f1)" != "120000" ]; then
  note "  FAIL H60 [$(tc H60)]  the index entry is not mode 120000, so there is no non-plain entry to detect"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H60"
elif ! probe 2 "these tracked entries are not plain files with a" "zz-h60.log"; then
  note "  FAIL H60 [$(tc H60)]  exit $PROBE_RC - wanted exit 2 with the catch-all naming the non-plain entry"
  show_verdict "$PROBE_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H60"
elif ! mutant_probe H60 's|if ((m\[1\] != "100644" \&\& m\[1\] != "100755") \|\| m\[3\] != "0"|if ((m[3] != "0"|' "these tracked entries are not plain files with a"; then
  note "  FAIL H60 [$(tc H60)]  the MUTANT did not turn: with the mode test dropped the run still refuses for a non-plain entry (exit $MUT_RC)"
  show_verdict "$MUT_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H60"
else
  note "  ok  H60 [$(tc H60)]  (exit 2 naming the mode-120000 entry; with the mode test dropped the link is hashed as its target's bytes and the run answers exit $MUT_RC instead)"
  OK=$((OK+1))
fi
reset_clone

# H61 THE CATCH-ALL'S PARTIAL-HASH REFUSAL. `git hash-object --stdin-paths` STOPS at the first unreadable path,
# so the hash stream is shorter than the path list and every tracked file after it is simply not hashed - which
# without this branch would be reported as a clean comparison over the files that did hash. The fixture is the
# one route that keeps `git status` empty: --assume-unchanged on a tracked records file and then delete it, so
# the worktree check is suppressed and the file is gone.
reset_clone
new_base "H61 base: the candidate itself, so the diff is the fixture alone" >/dev/null
printf '\n<!-- H61 fixture row -->\n' >> "$C/RUN-LOG.md"
commit_case "H61 fixture: a records-only change"
git -C "$C" update-index --assume-unchanged claude/agents/gatelogs/537-all.log >/dev/null 2>&1
rm -f "$C/claude/agents/gatelogs/537-all.log"
if [ -n "$(git -C "$C" status --porcelain 2>/dev/null)" ]; then
  note "  FAIL H61 [$(tc H61)]  the fixture left the clone DIRTY, so the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H61"
elif [ -e "$C/claude/agents/gatelogs/537-all.log" ]; then
  note "  FAIL H61 [$(tc H61)]  the fixture's file is still on disk, so hash-object will not stop and the stream cannot be partial"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H61"
elif ! probe 1 "working tree MISSING or unreadable, and git hash-object" "stopped there, so the"; then
  note "  FAIL H61 [$(tc H61)]  exit $PROBE_RC - wanted exit 1 naming the file the hash stream stopped at and how many after it went unhashed"
  show_verdict "$PROBE_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H61"
elif ! mutant_probe H61 's|^  if \[ "$CA_HASHED" -lt "${#CA_P\[@\]}" \]; then|  if false; then|' "stopped there, so the"; then
  note "  FAIL H61 [$(tc H61)]  the MUTANT did not turn: with the partial-stream branch disabled the run still says where the hashing stopped (exit $MUT_RC)"
  show_verdict "$MUT_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H61"
else
  note "  ok  H61 [$(tc H61)]  (exit 1 naming the stop and the unhashed remainder; with the branch disabled the stop is silent and the refusal counts 0 bad files at exit $MUT_RC)"
  OK=$((OK+1))
fi
reset_clone
git -C "$C" update-index --no-assume-unchanged claude/agents/gatelogs/537-all.log >/dev/null 2>&1 || true
git -C "$C" checkout --quiet -- claude/agents/gatelogs/537-all.log >/dev/null 2>&1 || true


# ── H62 A ROW WRITTEN BY THE REGISTER'S OWN `clear` VERB MUST NOT BE REFUSED [#544, antagonist A's veto V1,
# UPHELD; jobs/the-build-number-register-landed-with-a-named-remainder-2026-10-01 item 5 is where `clear` came
# from]. gates/fastgate.sh keeps a HARD COPY of the vocabulary `gates/buildnum.sh add` accepts, and its own
# comment names that tool as the source of truth. When item (10) added the state `cleared` and a whole `clear`
# subcommand, the copy went stale: a records-only commit whose single change was a row written by the project's
# own sanctioned verb was REFUSED at EXIT 1 - "a row no tool in gates/ writes" - which is a refusal with no
# route onward, as the comment beside it says in terms. A reproduced it and showed with a control that the
# identical row shape under `abandoned` answered FAST GATE GREEN on the same base, so the state token was the
# only variable.
# THIS CASE IS THE GUARD AGAINST THE EIGHTH STATE, which is why it is worth a case rather than only a fix: the
# list has gone stale once and the only thing that noticed was an adversarial pass.
# THE FIXTURE IS THE VERB ITSELF, not a hand-written row: `buildnum.sh clear` is run in the clone over a number
# that already has a row, so what is judged is what the tool produces. new_base makes the candidate the base so
# the diff is the register row alone and nothing else can classify the commit.
reset_clone
new_base "H62 base: the candidate itself, so the diff is the register row alone" >/dev/null
H62N="$( cd "$C" && bash gates/buildnum.sh list 2>/dev/null | awk '/^ *#[0-9]+ +minted /{gsub(/#/,"",$1); print $1; exit}' )"
if [ -z "$H62N" ]; then
  note "  FAIL H62 [$(tc H62)]  no number on the clone's register carries a \`minted\` row, so there is nothing to clear and the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H62"
elif ! ( cd "$C" && CT_RUNID=fastgate-drive-h62 bash gates/buildnum.sh clear "#$H62N" "fastgate-drive H62 fixture, never pushed: the sanctioned clear verb" >/dev/null 2>&1 ); then
  note "  FAIL H62 [$(tc H62)]  \`buildnum.sh clear '#$H62N'\` did not write its row, so the fixture does not exist"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H62"
else
  commit_case "H62 fixture: one row written by gates/buildnum.sh clear"
  H62ROW="$( git -C "$C" show --stat --format= HEAD 2>/dev/null | grep -c 'gates/build-numbers.tsv' || true )"
  if [ -n "$(git -C "$C" status --porcelain 2>/dev/null)" ]; then
    note "  FAIL H62 [$(tc H62)]  the fixture left the clone DIRTY, so the case cannot pose"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H62"
  elif [ "$H62ROW" = "0" ]; then
    note "  FAIL H62 [$(tc H62)]  the fixture commit does not touch gates/build-numbers.tsv, so the row did not land"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H62"
  elif probe 0 "FAST GATE GREEN"; then
    note "  ok  H62 [$(tc H62)]  (exit 0 FAST GATE GREEN over a row written by \`buildnum.sh clear\`; on the pre-veto script this answered exit 1 'a row no tool in gates/ writes')"
    OK=$((OK+1))
  else
    note "  FAIL H62 [$(tc H62)]  exit $PROBE_RC - wanted exit 0. A state the register's own \`clear\` verb writes is being refused by the hard-copied vocabulary in gates/fastgate.sh; add it to ST, to the refusal message and to the comment above them."
    show_verdict "$PROBE_OUT"
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H62"
  fi
fi
reset_clone

# ── H63..H66 THE EVIDENCE REFUSALS SIT BELOW THE FORCE DECISION [#545, item (59);
# jobs/fastgate-shorter-guard-refuses-a-commit-that-should-be-told-to-run-the-full-suite-2026-10-10]. The job's three
# controls, (a) to (c), plus the GONE sibling the same move covers. A commit that shrinks a register or deletes a gate
# log AND touches chess.jsx is told GO FULL (exit 2, naming chess.jsx); a records-only commit that does either is
# still REFUSED (exit 1) - the move must not weaken the guard; a records-only commit that only GROWS the register
# still goes fast (exit 0). H63 and H66 are the cases #490's placement failed: it answered exit 1 about the register.
shrink_cases(){ head -n -3 "$C/claude/stories/TEST-CASES.md" > "$C/.tc.tmp" && mv "$C/.tc.tmp" "$C/claude/stories/TEST-CASES.md"; }
reset_clone
shrink_cases; printf '\n// H63 fixture: a code change beside the register shrink\n' >> "$C/chess.jsx"
commit_case "H63 fixture: TEST-CASES.md shorter AND chess.jsx touched"
expect H63 2 "chess.jsx"
reset_clone
shrink_cases
commit_case "H64 fixture: TEST-CASES.md shorter, records only"
expect H64 1 "got SHORTER"
reset_clone
printf '\n<!-- H65 fixture: the register grows by a comment line -->\n' >> "$C/claude/stories/TEST-CASES.md"
commit_case "H65 fixture: TEST-CASES.md longer, records only"
expect H65 0 "FAST GATE GREEN"
reset_clone
H66LOG="$(git -C "$C" ls-files claude/agents/gatelogs)"; H66LOG="$(awk '/-all\.log$/{print; exit}' <<< "$H66LOG")"
if [ -z "$H66LOG" ]; then
  note "  FAIL H66 [$(tc H66)]  no archived gate log in the clone to delete, so the case cannot pose"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H66"
else
  git -C "$C" rm --quiet -- "$H66LOG" >/dev/null 2>&1; printf '\n// H66 fixture: a code change beside the deleted log\n' >> "$C/chess.jsx"
  commit_case "H66 fixture: a gate log deleted AND chess.jsx touched"
  expect H66 2 "chess.jsx"
fi
reset_clone
# H67 THE GREEN VERDICT NAMES WHAT ITS PREMISE CHECK DID NOT SCAN [#545, item (60);
# jobs/fastgate-premise-check-scans-only-js-so-it-cannot-see-the-shell-consumers-2026-10-10]. The premise check opens
# JavaScript only; a records-only green must say so in its own line rather than read as a whole-tree claim.
printf '\n<!-- H67 fixture row -->\n' >> "$C/RUN-LOG.md"
commit_case "H67 fixture: a records-only change"
expect H67 0 "NOT SCANNED: no shell script's reads"
reset_clone

# ── VERDICT. ───────────────────────────────────────────────────────────────────────────────────────────────
# A HARNESS THAT CANNOT FAIL PROVES NOTHING, so zero ok is a failure in its own right and not a clean run -
# the empty-denominator class this project files against: `every()` and a negated `test()` are both true over
# nothing, and so is a case loop that never executed.
note ""
note "fastgate-drive.sh mode=$MODE: $OK ok, $BAD FAIL, $SKIP skipped"
# AND THE HARNESS CHECKS ITS OWN COUNT [#529]. gates/gates.sh checks it too and is the control that matters,
# because a harness cannot be the only witness to its own silence; this line is for a run that reads the
# harness directly, which every landing run does before its suite.
# IT IS A COUNT, NOT A SET [#529 review, reviewer B's F3]: a case reported twice while another reports nothing
# balances it. gates/gates.sh refuses that by the distinct case names on the verdict lines (its C28).
CASES_SEEN=$((OK + BAD + SKIP))
if [ "$CASES_SEEN" != "${#CASES[@]}" ]; then
  note "  REFUSING TO REPORT GREEN - ${#CASES[@]} cases are declared and $CASES_SEEN reported a verdict, so at least one"
  note "  case ran without one, or one gave an extra verdict, or a case was added to one list and not the other."
  [ "$BAD" != 0 ] && note "  failed:$FAILED_CASES"
  exit 1
fi
if [ "$BAD" != 0 ]; then
  note "  failed:$FAILED_CASES"
  exit 1
fi
if [ "$OK" = 0 ]; then
  note "  REFUSING TO REPORT GREEN - no case ran, so nothing was asserted."
  exit 1
fi
exit 0
