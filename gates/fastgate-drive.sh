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

# ── BUILD THE CLONE AND MAKE ITS origin/main THE CANDIDATE. ────────────────────────────────────────────────
git clone --quiet --no-hardlinks --shared "$ROOT" "$C" >/dev/null 2>&1 \
  || { echo "fastgate-drive.sh: REFUSING - could not clone the repository into the scratch directory."; exit 2; }
git -C "$C" -c advice.detachedHead=false checkout --quiet "$CAND" >/dev/null 2>&1 \
  || { echo "fastgate-drive.sh: REFUSING - could not check the candidate out in the clone."; exit 2; }
BASESHA="$CAND"
if [ "$MODE" = unfixed ]; then
  # H12. THE HARNESS MUST BE ABLE TO FAIL. Replace the two files this change touches with their origin/main
  # copies and COMMIT that as the clone's base, so the cases run against the script as it ships today.
  for f in gates/fastgate.sh gates/buildnum.sh; do
    if git -C "$C" cat-file -e "$UPSTREAM:$f" 2>/dev/null; then
      git -C "$C" show "$UPSTREAM:$f" > "$C/$f" || true
      chmod +x "$C/$f" 2>/dev/null || true
    fi
  done
  git -C "$C" add -A >/dev/null 2>&1
  git -C "$C" -c user.name=ct-drive -c user.email=ct-drive@local commit --quiet --allow-empty \
      -m "UNFIXED BASE: fastgate.sh and buildnum.sh as origin/main carries them" >/dev/null 2>&1 \
    || { echo "fastgate-drive.sh: REFUSING - could not commit the unfixed base."; exit 2; }
  BASESHA="$(git -C "$C" rev-parse HEAD)"
fi
git -C "$C" update-ref refs/remotes/origin/main "$BASESHA" \
  || { echo "fastgate-drive.sh: REFUSING - could not point the clone's origin/main at the base."; exit 2; }
note "fastgate-drive.sh mode=$MODE  candidate=$(printf '%.12s' "$CAND")  clone base=$(printf '%.12s' "$BASESHA")  clock=$NOWET ET"
[ "$MODE" = unfixed ] && note "  unfixed baseline taken from origin/main $(printf '%.12s' "$UPSTREAM"), resolved in the parent repository"

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
    H27) printf 'TC-SUITE-084' ;;
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
show_verdict(){ # <text>: up to three verdict lines, indented, with no pipeline anywhere
  awk '/FAST GATE|FULL SUITE|NOT-STAMP-ONLY|REFUSED|REFUSING|BUILDNUM_MAX_DELTA/{printf "         %s\n", $0; if(++n==3) exit}' <<<"$1"
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
  local n out raw
  raw="$(cd "$C" && bash "$C/gates/buildnum.sh" next 2>/dev/null || true)"
  n="${raw%%$'\n'*}"                 # first line, in-shell
  n="${n##*[!0-9#]}"                 # drop any leading prose
  n="${n#\#}"; n="${n%%[!0-9]*}"      # bare digits only
  [ -n "$n" ] || return 1
  out="$(cd "$C" && CT_RUNID=fastgate-drive bash "$C/gates/buildnum.sh" mint "fastgate-drive.sh fixture, never pushed" 2>&1)" || { note "    (mint failed: $out)"; return 1; }
  printf '%s' "$n"
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
if [ -z "$H1N" ]; then
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
if [ -z "$H2N" ]; then
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
  note "  FAIL H5  could not build the fixture (number '$H5N', date '$H5D')"; BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H5"
fi

# H6  NEGATIVE, STAMP WITH NO REGISTER ROW. Plausible number and date; nothing appended to the register. This
#     is the case the withdrawn mitigation used to cover: a real build also writes a row, and a row forced FULL.
reset_clone
restamp "#$((BASENUM + 1)) - $NOWET ET" || true
commit_case "H6 stamp with no register row: #$((BASENUM + 1))"
expect H6 2 "no \`built\` row"

# H7  NEGATIVE, ROW THAT DOES NOT MATCH THE BUNDLE. The row exists for the right number; its bundle field names
#     a different artefact. This is the one that stops a row being borrowed from another build.
reset_clone
H7N="$(mint_in_clone)"
if [ -n "$H7N" ]; then
  restamp "#$H7N - $NOWET ET" || true
  record_in_clone "$H7N" "ffffffffffff" "$(md5_12 "$C/chess.jsx")"
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
  printf '  FAIL %s  buildnum.sh next exited %s on the planted tree, expected 2\n' "H8b" "$H8NEXT_RC"
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
  # same variable (gates/fastgate.sh:695, "register plausibility [#524]: $PLAUS_DELTA_SRC."). H21's fixture
  # appends register rows, so the register arm runs and prints it - and the reviewer showed H21 still ok 1 of 1
  # with the subshell bug put back by
  #   sed -i '/no subshell \[#524\]$/a PLAUS_DELTA_SRC=""' gates/fastgate.sh
  # i.e. THE CONTROL COULD NOT FAIL FOR ITS OWN DEFECT - this project's oldest trap, where the thing being
  # detected is also printed by a path the assertion cannot distinguish.
  # plaus_pred's success line (gates/fastgate.sh:626) is the only place the margin and its provenance appear
  # TOGETHER, as "(step N, margin D [SRC])"; the register arm prints no "margin D [" at all. Asserting the
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
#     that also changes 5000 other records paths. That is the one confounder every other case holds fixed: a
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
  while [ "$H24N" -lt 5000 ]; do
    H24N=$((H24N + 1))
    : > "$C/zzz-drive-pad/pad-$H24N.md"
  done
  commit_case "H24 planted register row #$H24ROW plus 5000 records paths in one commit"
  # THREE SELF-CHECKS, AND BYTES IS THE OPERATIVE ONE [#526]. DO NOT ADD A FOURTH PROXY.
  # The variable this case actually depends on is neither the path COUNT nor the target's POSITION: it is
  # whether the bytes still unwritten when `grep -q` exits exceed the 64 KiB pipe buffer, because that is
  # what makes the writer get SIGPIPE and the arm get skipped. Count and position are PROXIES for it. They
  # are kept because they are cheap and they catch different regressions - a fixture that shrank, and a
  # prefix that sorts the target late - but they are not the thing.
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
  if [ "$H24B" -le 65536 ]; then
    note "  FAIL H24 [$(tc H24)]  the changed list is only $H24B bytes, at or under the 64 KiB pipe buffer, so"
    note "         the writer never blocks, grep -q's early exit sends no SIGPIPE, and the register arm is not"
    note "         skipped - this case would assert exit 1 against a script that answers exit 1 either way."
    note "         BYTES, not the $H24C paths and not the target's position, is what this case depends on."
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
  else
    # THE ASSERTION IS THE VERDICT LINE AND NOT THE EXIT CODE, because exit 1 is reachable from the stamp arm
    # too, and this case is about whether the REGISTER arm ran at all. H8 asserts the same sentence on the same
    # planted row with a SMALL diff; the only difference here is the 5000 paths, which is the whole point.
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
  printf '  FAIL %s  exit %s, or it did not refuse by name, or it printed an ok line\n' "H13" "$H13_RC"
  show_verdict "$H13_OUT"
  BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H13"
fi

# ── VERDICT. ───────────────────────────────────────────────────────────────────────────────────────────────
# A HARNESS THAT CANNOT FAIL PROVES NOTHING, so zero ok is a failure in its own right and not a clean run -
# the empty-denominator class this project files against: `every()` and a negated `test()` are both true over
# nothing, and so is a case loop that never executed.
note ""
note "fastgate-drive.sh mode=$MODE: $OK ok, $BAD FAIL, $SKIP skipped"
if [ "$BAD" != 0 ]; then
  note "  failed:$FAILED_CASES"
  exit 1
fi
if [ "$OK" = 0 ]; then
  note "  REFUSING TO REPORT GREEN - no case ran, so nothing was asserted."
  exit 1
fi
exit 0
