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
UPSTREAM="$($GIT rev-parse --quiet --verify refs/remotes/origin/main 2>/dev/null)"
if [ -z "$UPSTREAM" ]; then
  echo "fastgate-drive.sh: REFUSING - refs/remotes/origin/main does not resolve in this repository, so the"
  echo "  unfixed baseline cannot be built from the script as it actually ships. Run git fetch origin main."
  exit 2
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
  git -C "$C" add -A >/dev/null 2>&1
  git -C "$C" -c user.name=ct-drive -c user.email=ct-drive@local commit --quiet -m "$1" >/dev/null 2>&1
}
# ONE INVOCATION POINT, so the guard variable and the timeout are set the same way for every case.
run_fastgate(){
  ( cd "$C" && CT_FASTGATE_DRIVE=1 timeout 250 bash "$C/gates/fastgate.sh" "$BASESHA" 2>&1 )
}
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
    *)   printf 'TC-SUITE-UNMAPPED(%s)' "$1" ;;
  esac
}
expect(){ # <case> <expected rc> <expected substring>
  local name="$1" wantrc="$2" want="$3" out rc id
  id="$(tc "$name")"
  out="$(run_fastgate)"; rc=$?
  if [ "$rc" != "$wantrc" ]; then
    printf '  FAIL %s [%s]  exit %s, expected %s\n' "$name" "$id" "$rc" "$wantrc"
    printf '%s\n' "$out" | grep -aE 'FAST GATE|FULL SUITE|NOT-STAMP-ONLY|REFUSED' | head -3 | sed 's/^/         /'
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1
  fi
  if ! printf '%s' "$out" | grep -qaF "$want"; then
    printf '  FAIL %s [%s]  exit %s as expected, but the verdict line does not carry %s\n' "$name" "$id" "$rc" "\"$want\""
    printf '%s\n' "$out" | grep -aE 'FAST GATE|FULL SUITE|NOT-STAMP-ONLY|REFUSED' | head -3 | sed 's/^/         /'
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1
  fi
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
    printf '%s\n' "$out" | grep -aE 'FAST GATE|FULL SUITE|NOT-STAMP-ONLY|REFUSED' | head -3 | sed 's/^/         /'
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1
  fi
  if ! printf '%s' "$out" | grep -qaF "$want"; then
    printf '  FAIL %s [%s]  exit %s as expected, but no line carries %s (with %s)\n' "$name" "$id" "$rc" "\"$want\"" "$kv"
    printf '%s\n' "$out" | grep -aE 'FAST GATE|FULL SUITE|NOT-STAMP-ONLY|REFUSED|BUILDNUM_MAX_DELTA' | head -3 | sed 's/^/         /'
    BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES $name"; return 1
  fi
  printf '  ok  %s [%s]  (exit %s, with %s, %s)\n' "$name" "$id" "$rc" "$kv" "$want"
  OK=$((OK+1)); return 0
}
mint_in_clone(){ # echoes the minted bare number, or empty
  local n out
  n="$(cd "$C" && bash "$C/gates/buildnum.sh" next 2>/dev/null | grep -oE '#?[0-9]{3,4}' | head -1 | tr -d '#')"
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
  note "  FAIL H1  could not mint a fixture number in the clone, so the positive case cannot be built"
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
  note "  FAIL H2  could not mint a fixture number in the clone"
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
  note "  FAIL H4  could not mint a fixture number in the clone"; BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H4"
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
  note "  FAIL H7  could not mint a fixture number in the clone"; BAD=$((BAD+1)); FAILED_CASES="$FAILED_CASES H7"
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
expect_env H17 1 "BUILDNUM_MAX_DELTA=1000 is set in the environment" "BUILDNUM_MAX_DELTA=1000"

# H13 RECURSION GUARD. Re-enter this harness with the guard set and require a named refusal at exit 2, no
#     recursion and no ok line. Run as a case rather than described, because an unproven control is not one.
H13_OUT="$(CT_FASTGATE_DRIVE=1 bash "$HERE/fastgate-drive.sh" "$MODE" 2>&1)"; H13_RC=$?
if [ "$H13_RC" = 2 ] && printf '%s' "$H13_OUT" | grep -qaF 'CT_FASTGATE_DRIVE is set' \
   && ! printf '%s' "$H13_OUT" | grep -qaE '^  ok  '; then
  printf '  ok  %s [%s]  (exit 2, refuses by name, recursed into no case and printed no ok)\n' "H13" "$(tc H13)"
  OK=$((OK+1))
else
  printf '  FAIL %s  exit %s, or it did not refuse by name, or it printed an ok line\n' "H13" "$H13_RC"
  printf '%s\n' "$H13_OUT" | head -3 | sed 's/^/         /'
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
