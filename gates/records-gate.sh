#!/usr/bin/env bash
# gates/records-gate.sh "<base-sha>" "<head-sha>"   -> the RATCHETED RECORDS check, as its own door.
#
# WHY THIS FILE EXISTS, AND IT IS KUNAL'S DECISION AND NOT THIS LANE'S IDEA.
# jobs/build-one-door-for-every-non-gate-check-2026-10-10, theDECISION: he answered one-door on the Desk at
# 12:49am ET on 2026-10-10, question q-only-a-browser-gate-can-refuse-a-push-which-door-do-we-widen-2026-10-10,
# choosing it over coverage-ratchet and contracts-become-code. That job's theFIX part (1) reads, verbatim:
# "Extract the binary-and-ratchet check block that already exists inside gates/fastgate.sh into a standalone
# gates/records-gate.sh, so it has an identity and a caller rather than living inside the fast tier."
# THE CAUSE IT ANSWERS, in that job's own measurement: five executable audit instruments sit in gates/audit/ on
# main and a grep for anything that calls them returns ONE hit, which is a classification string inside
# gates/fastgate.sh and not a call. 140 of the 682 open jobs trace to the fact that a check which is not a
# browser gate has no landable home, because gates/verify-log.sh pins an accepted green log to the
# manifest-required gate count plus one, so a new gates.sh section invalidates every archived green.
#
# WHAT THIS CHANGE IS, AND MORE IMPORTANTLY WHAT IT IS NOT. It is part (1) of four, and NOTHING ELSE.
#   DONE HERE:     the block has a file, a name, an exit code, a usage line, its own --selftest, and one caller.
#   NOT DONE HERE: part (2)'s second half - the FULL-SUITE path calling this after gates/gates.sh finishes.
#   NOT DONE HERE: part (3) - "CONVERT ITS RATCHETS TO BINARIES so a standing breach blocks instead of being
#                  grandfathered". That changes what the push bar REFUSES. It is the riskiest clause in that job,
#                  this lane holds no pen and cannot run the 83-minute suite to see what it breaks, and the job's
#                  own control (a) calls it "the one most likely to be quietly skipped". It is skipped LOUDLY:
#                  declared in the receipt before the work, declared again in the outcome, and declared here.
#   NOT DONE HERE: part (4)'s population with gates/verify-log.sh --citations-selftest, gates/verify-log-selftest.sh,
#                  gates/audit/cited-not-run.sh, gates/audit/verify-patch-set.sh and a gates/held.sh --selftest
#                  that does not yet exist. Four of those five are other lanes' artefacts under R44.
#
# SO THE WHOLE DISCIPLINE OF THIS COMMIT IS THAT IT CHANGES NO BEHAVIOUR, AND THAT IS A MEASUREMENT RATHER THAN
# AN INTENTION. The body below is the block from gates/fastgate.sh lines 302-493 at origin/main b3767c4, moved
# by `sed -n '302,493p'` and not retyped, so no transcription error is possible; every message string, every
# refusal, every `continue` and the literal "FAST GATE REFUSED" prefix are byte-identical, because every
# consumer in this project greps for strings and a reworded refusal is a silently broken reader. The proof is in
# the payload's own measurement, NOT a --selftest arm, and that is said rather than implied: fastgate.sh's stdout
# and its log are compared BEFORE and AFTER the extraction over the same commit pairs and must be byte-identical,
# which needs BOTH versions of fastgate.sh and so cannot live inside this file. The figures are on
# patches/proc-lane3-art-gates-records-gate-sh-2026-10-10 and in claude/PROCESS-LOG.md.
#
# HOW IT IS CALLED, AND WHY THE EXIT CODES ARE WHAT THEY ARE.
#   0  every ratcheted record was appended to or grown. The per-file lines are on stdout.
#   1  a ratcheted record was CHANGED. This is the refusal, and it is the same exit 1 fastgate.sh took inline.
#   2  USAGE - this door was called wrongly (missing argument, unresolvable ref, no repository). Deliberately
#      NOT 0 and deliberately NOT 1: a door that cannot tell "I checked and it is fine" from "I could not run"
#      is the vacuity trap CLAUDE.md records eleven times, and reporting a missing denominator rather than
#      crediting it is that file's own rule. fastgate.sh treats 2 as a refusal, because a records tier that
#      proceeds when its ratchet could not run is the shape this block exists to prevent.
#
# IT RESOLVES ITS OWN ROOT FROM ITS OWN LOCATION, AND THAT IS NOT A STYLE CHOICE [CLAUDE.md, #493, R18].
# gates.sh:33 derives the suite directory and the repository root from `dirname "$0"`, and CLAUDE.md records what
# that cost: a prescription to copy the suite script to a scratch directory "does not merely fail to help, it
# cannot be followed", because the copy then resolves ROOT to the scratch directory's parent and finds no app.js.
# This file does the same thing deliberately, so `bash gates/records-gate.sh` works from any cwd and a copy
# placed beside its siblings inside gates/ still resolves correctly.

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"; G="$ROOT/gates"

say(){ echo "$*"; }

# ── LOG IS /dev/null HERE, AND IT IS A FIX FOR A REAL BUG THIS FILE'S OWN CONTROLS FOUND. ───────────────────
# The moved body prints its refusal detail with `printf ... | sed ... | tee -a "$LOG"`, because inside
# fastgate.sh $LOG is that run's own log file. Standalone there is no such variable, and `set -u` therefore made
# the ONE LINE THAT NAMES WHICH RECORD WAS CHANGED die with "LOG: unbound variable" - while the exit code stayed
# a correct 1 and the surrounding refusal paragraph still printed. MEASURED, not reasoned: the first run of
# C1, C2 and C3 gave rc=1 three times out of three and their string arms all FAILED, which is the right way
# round and is why they are string arms and not rc arms alone. An exit code that is right for the wrong reason
# is CLAUDE.md's "a wrong reason that reaches the right verdict is a trap, not a check", and a refusal that
# cannot say WHICH file changed transfers the whole investigation to its reader.
# /dev/null rather than deleting the `tee`: the body is moved and not retyped, so its bytes stay the body's.
LOG=/dev/null

usage(){
  echo "usage: gates/records-gate.sh <base-sha> <head-sha>"
  echo "       gates/records-gate.sh --entries     # print the ratcheted entry list, one 'MODE<tab>path' per line"
  echo "       gates/records-gate.sh --selftest    # the controls, as a command rather than a paragraph"
  echo "exit 0 = every ratcheted record grew or was untouched; 1 = one was CHANGED; 2 = this door could not run."
}

entries_live(){
  # Printed from the SAME two variables the loop below reads, so the list and the executable cannot drift.
  # This is why --entries exists rather than a second hand-written copy: CLAUDE.md records the cost of a second
  # list twelve times over, most recently as "a second list is the defect, whatever its patterns say" (#490).
  local f
  for f in $RATCHET_APPENDONLY; do printf 'appendonly\t%s\n' "$f"; done
  for f in $RATCHET_NOSHRINK;  do printf 'noshrink\t%s\n'  "$f"; done
}

entries_ratchet(){
  # Returns 0 when every baseline entry is still live with its baseline MODE, 1 otherwise, naming what is gone.
  local e mode path live gone=""
  live="$(entries_live)"
  for e in $RECORDS_BASELINE; do
    mode="${e%%:*}"; path="${e#*:}"
    printf '%s' "$live" | grep -qxF "$(printf '%s\t%s' "$mode" "$path")" \
      || gone="$gone    $path: required as $mode by RECORDS_BASELINE and NOT in the live list.\n"
  done
  if [ -n "$gone" ]; then
    say "RECORDS GATE REFUSED - the entry list LOST a required check, which is how a door gets quietly emptied:"
    printf '%b' "$gone"
    say "A check leaves this door only in a commit that says why, and only by editing RECORDS_BASELINE with it."
    return 1
  fi
  return 0
}

case "${1:-}" in
  --entries)  : ;;                       # handled after the lists are defined, below
  --selftest) : ;;
  -h|--help)  usage; exit 0 ;;
  "")         usage; exit 2 ;;
esac

# ── THE ARGUMENTS, VALIDATED IN THEIR OWN REFUSALS AND NEVER AS A CONJUNCT. ─────────────────────────────────
# Each of these is a DENOMINATOR for everything below it, and CLAUDE.md's rule is that a missing denominator is
# reported and never credited. Exit 2, not 1 and not 0: see the header on why a door must distinguish "I ran and
# it is fine" from "I could not run".
MODE_RUN=yes
case "${1:-}" in --entries|--selftest) MODE_RUN=no ;; esac

if [ "$MODE_RUN" = yes ]; then
  if [ ! -d "$ROOT/.git" ] && [ ! -f "$ROOT/.git" ]; then
    say "RECORDS GATE COULD NOT RUN - $ROOT is not a git repository (no .git file or directory)."
    say "Both shapes are tested, because a `git worktree add` tree's .git is a FILE and this project's own"
    say "payload auditor skipped its most important check for two days on exactly that [jobs/gates-audit-"
    say "verify-parked-patch-sh-c3-skips-silently-when-the-repo-dir-is-a-git-worktree-2026-10-08]."
    exit 2
  fi
  GIT="git -C $ROOT --git-dir=$ROOT/.git --work-tree=$ROOT"
  if [ -z "${2:-}" ]; then say "RECORDS GATE COULD NOT RUN - no HEAD sha given."; usage; exit 2; fi
  BASEFULL="$($GIT rev-parse --quiet --verify "$1^{commit}" 2>/dev/null || true)"
  HEAD="$($GIT rev-parse --quiet --verify "$2^{commit}" 2>/dev/null || true)"
  if [ -z "$BASEFULL" ]; then say "RECORDS GATE COULD NOT RUN - the base ref '$1' does not resolve to a commit here."; exit 2; fi
  if [ -z "$HEAD" ];     then say "RECORDS GATE COULD NOT RUN - the head ref '$2' does not resolve to a commit here."; exit 2; fi
  if [ "$BASEFULL" = "$HEAD" ]; then
    say "RECORDS GATE COULD NOT RUN - base and head are the SAME commit ($BASEFULL), so every comparison below"
    say "would pass over nothing. That is the empty-denominator trap, reported rather than credited."
    exit 2
  fi
fi

# ── RATCHETED RECORDS. THREE CONDITIONS, REPORTED SEPARATELY, OVER THE FILES A RECORDS COMMIT MAY TOUCH. ─────
# WHAT THIS BLOCK IS FOR. A records-only commit may reach main in about seven seconds. So for every file that
# classify() calls RECORDS and that something in this project RELIES ON, "records-only" has to mean APPENDED TO
# or GROWN, never REWRITTEN. The 84 minutes this tier removes were the only thing that incidentally made
# destroying a record expensive, and fastgate.sh already accepted that argument once for the gate logs.
#
# ITS HISTORY IN THREE STEPS, KEPT IN FULL BECAUSE THE WRONG INVARIANT SHIPPED TWICE AND EACH REASON IS USEFUL.
# (1) #490 shipped a `wc -l` SHRANK test over the two guard registers. The threat is not emptying but DISARMING:
#     both #490 antagonists reproduced prefixing one "-" to a row's bundleMd5, which CLEARS that row
#     (verify-log.sh and held.sh treat a leading "-" as cleared) with ZERO lines removed, taking held.sh's live
#     count 9 -> 0 and `buildnum.sh check 490` from ISSUED/exit 1 to free/exit 0 on a FAST GATE GREEN.
# (2) #490 then put both registers in classify()'s FORCE arm and kept this block as a second line of defence
#     that, with those paths forced, "normally cannot fire" - correct, and the registers stayed safe.
# (3) #509 MEASURED THE PRICE OF ITS OWN FIX AND PAID A DIFFERENT ONE. Moving root-level *.md to RECORDS
#     un-forces EIGHT files, five of which CLAUDE.md's own truth table names as this project's record -
#     CLAUDE.md itself, HANDOFF.md, RUN-LOG.md, DECISIONS-LOG.md, and FEEDBACK-INBOX.md, which CLAUDE.md
#     declares "Append-only; never reword an entry". MEASURED by extracting classify() from both trees and
#     running it over all 539 tracked paths: exactly TEN paths change FORCE -> RECORDS, and before this block
#     was written EIGHT of them had no ratchet of any kind, in the same commit that built one for the other two.
#     BOTH of #509's blind antagonists found that independently, from different doors, and both prescribed this.
#
# THE THREE CONDITIONS, AND THEY ARE THREE RATHER THAN ONE CONJUNCT ON PURPOSE. prompts/common's rule is that
# halves which cannot fail independently read as two checks while being one. These fail independently and the
# log names which fired.
#   TEXT        the head blob carries no NUL and no C0 control byte but tab, newline and carriage return.
#   NOSHRINK    the line count a consumer actually sees may not fall.
#   APPENDONLY  for the listed files only: every byte present at BASE is byte-identical at HEAD.
#
# WHY TEXT EXISTS, AND IT IS THE ONE CONDITION NO AMOUNT OF BYTE COMPARISON CAN REPLACE. #509's antagonist B
# found that the ratchet's notion of "append" is BYTES while every consumer's is LINES SURVIVING grep, and GNU
# grep switches to binary mode on a NUL anywhere in the file and suppresses the matching lines. A single NUL
# appended after the final newline satisfies NOSHRINK and APPENDONLY PERFECTLY. Reproduced by B end to end and
# then by this build on its own instrument: one 0x00 byte takes held-trees.tsv from 12 live rows to 0 with grep
# printing "binary file matches", `held.sh check <a held md5>` from exit 1 to exit 0, and
# `buildnum.sh stampable 509` from exit 1 to exit 0 - which is the predicate gates/build.sh consults to refuse
# build-number reuse, so a second run could stamp #509 over a different tree. That is the #416 defect the
# register exists to make impossible. CLAUDE.md already records this grep-goes-binary trap from #419, where a
# corrupt log was refused for "carries no footer" when the footer was there and grep had gone binary on a NUL -
# "a wrong reason that reaches the right verdict is a trap, not a check". It arrived here at the instrument.
# THE TEST IS CONTROL BYTES AND DELIBERATELY NOT PRINTABLE-ASCII: CLAUDE.md carries 36 non-ASCII bytes and this
# script carries 1263, so an ASCII test would refuse the tree it is meant to protect. Measured at 38a8a25: all
# of these files carry ZERO bytes outside tab/newline/CR/0x20-0xff, so the condition is satisfied by every one.
# AND KNOW ITS HONEST LIMIT, because both of #509's antagonists swept it independently and agreed. Each appended
# all 256 byte values in turn and counted the rows a consumer's grep+awk pipeline still yields: EXACTLY ONE BYTE
# OF 256 SUPPRESSES LINES, 0x00, under LC_ALL=C and LC_ALL=C.utf8 alike. A lone 0xFF or a truncated multibyte
# sequence prints its lines normally and emits "binary file matches" to STDERR ONLY, so antagonist A's own
# encoding-error hypothesis was measured FALSE and withdrawn before it could cost a wrong fix. So this arm does
# close the grep class ON THIS TOOLCHAIN - and that is a property of grep 3.11 plus a non-UTF-8 default locale,
# NOT a property of the invariant, and nothing in this repository pins either. IT IS A BYTE-CLASS GUARD THAT
# HAPPENS TO COVER THE ONE BYTE grep CARES ABOUT, and it is NOT a semantic guard: a line can be destroyed by
# bytes that are all printable, which is what the CLAUDE.md arm in classify() and the line-boundary check below
# exist for. The condition that would catch the whole shape is the consumer's OWN row count - grep+awk over the
# head blob must equal the base plus the appended rows - and that is on
# jobs/the-guard-registers-cannot-leave-force-until-the-ratchet-speaks-the-consumers-language-2026-10-10.
#
# AND NOTE WHAT #509 DID *NOT* DO ON THE STRENGTH OF THIS BLOCK. It did NOT move gates/held-trees.tsv or
# gates/build-numbers.tsv out of classify()'s FORCE arm. It tried, its antagonists showed the ratchet is not
# sufficient for them, and the move was withdrawn - see the note in classify(). They are ratcheted here anyway,
# as #490 intended, as a second line of defence that normally cannot fire.
RATCHET_APPENDONLY="gates/held-trees.tsv gates/build-numbers.tsv FEEDBACK-INBOX.md DECISIONS-LOG.md"
RATCHET_NOSHRINK="RUN-LOG.md HANDOFF.md README.md chess-trainer-backlog.md feedback-inbox.md"
# CLAUDE.md IS DELIBERATELY NOT IN EITHER LIST: classify() FORCES it outright (see the arm below), which is
# strictly stronger than any ratchet here, so listing it would be dead code that reads like protection.
# APPENDONLY is for the files whose OLD ROWS ARE EVIDENCE and are never rewritten: the two guard registers, and
# the two records CLAUDE.md and DECISIONS-LOG.md's own line 6 declare append-only. NOSHRINK is the correct
# weaker guard for the rest, because CLAUDE.md, RUN-LOG.md and HANDOFF.md ARE legitimately edited in place
# every run and a byte prefix would refuse every honest close-out. Getting that split wrong in either direction
# is the whole difficulty: too strong and the tier is unusable, too weak and the record is disposable.


# ── THE ENTRY LIST, AND THE RATCHET OVER THE LIST ITSELF. ───────────────────────────────────────────────────
# jobs/build-one-door-for-every-non-gate-check-2026-10-10, control (e): "removing a check from records-gate.sh
# must itself be caught, so the door cannot be quietly emptied - the same never-delete ratchet the gate manifest
# already implements". That control is about this file and costs nothing while the file is being written, so it
# is in part (1) rather than deferred with the rest. The MECHANISM is deliberately the gate manifest's and not a
# new one: a committed baseline of required entries, and a check that the live list is a SUPERSET of it.
# IT IS A SUPERSET AND NOT AN EQUALITY ON PURPOSE. gates/gatemanifest.sh's own split is the precedent and
# CLAUDE.md states the reason in terms: missing is HARD and unlisted is SOFT, "because a build that adds a gate
# must be able to run it - a guard that fires on the normal case gets switched off". Adding an entry is the
# normal case here too, and it is what part (4) will do.
RECORDS_BASELINE="appendonly:gates/held-trees.tsv appendonly:gates/build-numbers.tsv appendonly:FEEDBACK-INBOX.md appendonly:DECISIONS-LOG.md noshrink:RUN-LOG.md noshrink:HANDOFF.md noshrink:README.md noshrink:chess-trainer-backlog.md noshrink:feedback-inbox.md"

# ── THE CONTROLS, AS A COMMAND RATHER THAN A PARAGRAPH. ─────────────────────────────────────────────────────
# Every one is a real exit code from a real subprocess over a real git repository where the answer is known, as
# jobs/build-one-door-for-every-non-gate-check-2026-10-10's theCONTROLSETThisNeeds_R08 asks: "Each one a real
# exit code on a tree where the answer is known, not an argument."
# THE DOOR IS RUN AS A SUBPROCESS AND NEVER AS A SOURCED FUNCTION, deliberately. The body's refusals are
# `exit 1`, and a sourced copy would make `exit` kill the harness, so the only faithful way to test an exit code
# is to let the thing exit. It also means the controls test the ENTRY POINT a caller actually has.
# C5 IS THE ONE THAT MAKES THE OTHERS MEAN ANYTHING. It empties the two ratchet lists and requires C1, C2 and C3
# to go GREEN. Without it, three refusals prove only that something refused; with it, they are shown to be
# produced BY the lists this file carries, which is the mutation control this project asks for by name.
PASSN=0; FAILN=0
ok(){ PASSN=$((PASSN+1)); echo "PASS $*"; }
no(){ FAILN=$((FAILN+1)); echo "FAIL $*"; }
chk(){ # chk <label> <expected-rc> <actual-rc>
  if [ "$2" = "$3" ]; then ok "$1 (rc=$3)"; else no "$1 (expected rc=$2, got rc=$3)"; fi; }

mkfix(){ # mkfix <dir> -> a repo with ONE base commit carrying every ratcheted file, all ending in a newline
  local d="$1"
  mkdir -p "$d/gates"
  git -C "$d" init -q 2>/dev/null
  git -C "$d" config user.email selftest@local; git -C "$d" config user.name selftest
  printf 'h1\th2\nr1\tv1\n'                 > "$d/gates/held-trees.tsv"
  printf '#440\tminted\n#441\tminted\n'     > "$d/gates/build-numbers.tsv"
  printf 'entry one\nentry two\n'           > "$d/FEEDBACK-INBOX.md"
  printf 'decision one\ndecision two\n'     > "$d/DECISIONS-LOG.md"
  printf 'run 1\nrun 2\nrun 3\n'            > "$d/RUN-LOG.md"
  printf 'handoff a\nhandoff b\n'           > "$d/HANDOFF.md"
  printf 'readme\n'                         > "$d/README.md"
  printf 'backlog\n'                        > "$d/chess-trainer-backlog.md"
  printf 'inbox\n'                          > "$d/feedback-inbox.md"
  git -C "$d" add -A >/dev/null; git -C "$d" commit -qm base >/dev/null
  git -C "$d" rev-parse HEAD
}
commitas(){ local d="$1"; shift; git -C "$d" add -A >/dev/null; git -C "$d" commit -qm "$*" >/dev/null; git -C "$d" rev-parse HEAD; }

selftest(){
  local T B H out rc door
  T="$(mktemp -d)" || { echo "FAIL could not mktemp"; return 1; }
  trap 'rm -rf "$T"' RETURN
  door="$T/door/records-gate.sh"; mkdir -p "$T/door"
  cp "${BASH_SOURCE[0]}" "$door"; chmod +x "$door"
  # The door resolves ROOT from its own location, so it is copied to <repo>/gates/ in each fixture, exactly as
  # CLAUDE.md's #493 entry requires of gates.sh. A copy outside the tree would resolve the wrong ROOT - which is
  # the failure that entry records, reproduced here as a harness requirement rather than rediscovered.

  # C4  A CLEAN RECORDS COMMIT. Both modes grow. This is the arm that must not be able to refuse.
  B="$(mkfix "$T/c4")"; cp "$door" "$T/c4/gates/records-gate.sh"
  printf 'entry three\n' >> "$T/c4/FEEDBACK-INBOX.md"; printf 'run 4\n' >> "$T/c4/RUN-LOG.md"
  H="$(commitas "$T/c4" append)"
  out="$(bash "$T/c4/gates/records-gate.sh" "$B" "$H" 2>&1)"; rc=$?
  chk "C4 a clean records commit is accepted" 0 "$rc"
  case "$out" in *"append-only BY VALUE"*) ok "C4 the APPENDONLY line names the mode it credited" ;;
                 *) no "C4 the APPENDONLY line is missing from a clean run" ;; esac

  # C1  APPENDONLY, EDITED IN PLACE. The threat #490's antagonists reproduced: clearing a row with a leading
  #     dash changes no line count and disarms the register, so the test is the BYTE PREFIX.
  B="$(mkfix "$T/c1")"; cp "$door" "$T/c1/gates/records-gate.sh"
  printf 'h1\th2\n-r1\tv1\n' > "$T/c1/gates/held-trees.tsv"
  H="$(commitas "$T/c1" clear-a-row)"
  out="$(bash "$T/c1/gates/records-gate.sh" "$B" "$H" 2>&1)"; rc=$?
  chk "C1 an APPENDONLY row cleared in place is refused" 1 "$rc"
  case "$out" in *"PREFIX"*held-trees*) ok "C1 the refusal names PREFIX and the file" ;;
                 *) no "C1 the refusal does not name PREFIX and held-trees.tsv" ;; esac

  # C2  NOSHRINK. And its DISCRIMINATOR: the refusal must name RUN-LOG.md and NOT drag in a file that is fine.
  B="$(mkfix "$T/c2")"; cp "$door" "$T/c2/gates/records-gate.sh"
  printf 'run 1\n' > "$T/c2/RUN-LOG.md"
  H="$(commitas "$T/c2" shrink)"
  out="$(bash "$T/c2/gates/records-gate.sh" "$B" "$H" 2>&1)"; rc=$?
  chk "C2 a NOSHRINK record that got shorter is refused" 1 "$rc"
  case "$out" in *"NOSHRINK - 1 lines at head against 3 at base"*) ok "C2 the refusal prints both counts" ;;
                 *) no "C2 the refusal does not print 1-against-3" ;; esac
  # THE DISCRIMINATOR IS SCOPED TO THE REFUSAL PARAGRAPH, AND ITS FIRST VERSION WAS NOT, WHICH IS WHY IT WENT
  # RED ON A CORRECT DOOR. It read `case "$out" in *HANDOFF.md:*NOSHRINK*)`, and a shell glob's `*` spans
  # newlines, so it matched "HANDOFF.md: untouched by this commit" eight lines ABOVE the refusal against the
  # word NOSHRINK below it - two true lines about two different files, read as one false claim. That is
  # CLAUDE.md's "an alternation that matches every branch pins nothing" arriving at a control rather than at a
  # gate, and it is recorded rather than quietly re-written because a control that fires on the healthy case is
  # how a control gets deleted. The scope is now the lines at and after the refusal header.
  local para; para="$(printf '%s\n' "$out" | sed -n '/FAST GATE REFUSED/,$p')"
  case "$para" in *RUN-LOG.md*) ok "C2 DISCRIMINATOR: the refusal paragraph names the shortened file" ;;
                  *) no "C2 DISCRIMINATOR: the refusal paragraph does not name RUN-LOG.md" ;; esac
  case "$para" in *HANDOFF.md*) no "C2 DISCRIMINATOR: the refusal paragraph drags in HANDOFF.md, which is fine" ;;
                  *) ok "C2 DISCRIMINATOR: the refusal paragraph names no file that is fine" ;; esac

  # C3  TEXT. One 0x00 appended after the final newline satisfies NOSHRINK and APPENDONLY perfectly and takes
  #     every grep-based consumer to zero rows [#509 antagonist B]. This is the arm no byte comparison replaces.
  B="$(mkfix "$T/c3")"; cp "$door" "$T/c3/gates/records-gate.sh"
  printf 'entry three\n\000' >> "$T/c3/FEEDBACK-INBOX.md"
  H="$(commitas "$T/c3" nul)"
  out="$(bash "$T/c3/gates/records-gate.sh" "$B" "$H" 2>&1)"; rc=$?
  chk "C3 a NUL appended to an APPENDONLY record is refused" 1 "$rc"
  case "$out" in *"TEXT - the head blob carries 1 control byte"*) ok "C3 the refusal names TEXT and counts the byte" ;;
                 *) no "C3 the refusal does not name TEXT with a count" ;; esac

  # C5  THE MUTATION CONTROL. Empty both lists and C1, C2 and C3 must all go GREEN, which is the only thing
  #     that shows the three refusals above are produced by THESE LISTS and not by something incidental.
  local mdoor="$T/door/mutant.sh"
  sed -e 's/^RATCHET_APPENDONLY=.*/RATCHET_APPENDONLY=""/' \
      -e 's/^RATCHET_NOSHRINK=.*/RATCHET_NOSHRINK=""/' \
      -e 's/^RECORDS_BASELINE=.*/RECORDS_BASELINE=""/' "$door" > "$mdoor"
  local mdead=0
  for c in c1 c2 c3; do
    cp "$mdoor" "$T/$c/gates/records-gate.sh"
    B="$(git -C "$T/$c" rev-parse HEAD~1)"; H="$(git -C "$T/$c" rev-parse HEAD)"
    bash "$T/$c/gates/records-gate.sh" "$B" "$H" >/dev/null 2>&1 || mdead=$((mdead+1))
  done
  chk "C5 MUTATION: with both ratchet lists emptied, all three refusals disappear" 0 "$mdead"

  # C6  THE DENOMINATOR. base == head must be rc 2 and must NOT be 0, because a door that answers "fine" when it
  #     compared nothing is the vacuity this project records eleven times.
  B="$(mkfix "$T/c6")"; cp "$door" "$T/c6/gates/records-gate.sh"
  out="$(bash "$T/c6/gates/records-gate.sh" "$B" "$B" 2>&1)"; rc=$?
  chk "C6 base == head is a could-not-run (2), never a pass" 2 "$rc"
  out="$(bash "$T/c6/gates/records-gate.sh" "$B" deadbeefdeadbeef 2>&1)"; rc=$?
  chk "C6 an unresolvable head ref is a could-not-run (2), never a pass" 2 "$rc"
  out="$(bash "$T/c6/gates/records-gate.sh" 2>&1)"; rc=$?
  chk "C6 no arguments at all is a could-not-run (2)" 2 "$rc"

  # C7  CONTROL (e) FROM THE JOB: removing a check from this door must itself be caught.
  local edoor="$T/door/emptied.sh"
  sed -e 's/^RATCHET_APPENDONLY=.*/RATCHET_APPENDONLY="gates\/held-trees.tsv"/' "$door" > "$edoor"
  B="$(mkfix "$T/c7")"; cp "$edoor" "$T/c7/gates/records-gate.sh"
  printf 'entry three\n' >> "$T/c7/FEEDBACK-INBOX.md"
  H="$(commitas "$T/c7" append)"
  out="$(bash "$T/c7/gates/records-gate.sh" "$B" "$H" 2>&1)"; rc=$?
  chk "C7 a door with three APPENDONLY entries deleted refuses itself" 1 "$rc"
  case "$out" in *"the entry list LOST a required check"*FEEDBACK-INBOX.md*) ok "C7 it names the lost entries" ;;
                 *) no "C7 it does not name the lost entries" ;; esac
  # AND THE NEGATIVE CONTROL FOR C7, because a ratchet that always fires is not a ratchet: the unmodified door
  # over the SAME commit pair must be green.
  cp "$door" "$T/c7/gates/records-gate.sh"
  bash "$T/c7/gates/records-gate.sh" "$B" "$H" >/dev/null 2>&1; rc=$?
  chk "C7 NEGATIVE: the unmodified door over the same pair is green" 0 "$rc"

  # C8  --entries agrees with the executable, which is the whole reason it is derived from the two variables.
  out="$(bash "$door" --entries 2>&1 | wc -l | tr -d ' ')"
  chk "C8 --entries prints 9 rows" 9 "$out"
  out="$(bash "$door" --entries 2>&1 | awk -F'\t' '{print $1}' | sort -u | tr '\n' ',' )"
  chk "C8 --entries uses exactly the two modes the loop reads" "appendonly,noshrink," "$out"

  echo "records-gate selftest: $PASSN pass, $FAILN fail"
  [ "$FAILN" -eq 0 ]
}

# ── THE TWO NON-RUN ARMS, PLACED HERE BECAUSE THEY READ THE LISTS ABOVE AND MUST NOT RUN THE LOOP BELOW. ─────
if [ "${1:-}" = "--entries" ]; then entries_live; exit 0; fi
if [ "${1:-}" = "--selftest" ]; then selftest; exit $?; fi

# THE ENTRY-LIST RATCHET RUNS BEFORE THE FILE LOOP, because a list that has lost a member gives a clean verdict
# over the members it still has, and that clean verdict is the thing control (e) exists to make impossible.
entries_ratchet || exit 1

REGTMP="$(mktemp -d 2>/dev/null || true)"
if [ -z "$REGTMP" ] || [ ! -d "$REGTMP" ]; then
  say "FAST GATE REFUSED - mktemp -d gave no usable directory, so the records ratchet cannot be staged."
  say "Refusing rather than skipping: this block is the only protection the root-level records have now that"
  say "classify() no longer forces them."
  exit 1
fi
trap 'rm -rf "$REGTMP"' EXIT

# blobsize <rev> <path> -> prints the blob's byte size, or MISSING, or NOTBLOB.
# WHY THE TYPE IS CHECKED. #509's antagonist A found that `git rev-parse --verify "<rev>:<path>"` resolves a
# DIRECTORY to a tree id just as happily as a file to a blob, and the first draft of this block then ran
# `cat-file blob` on it with no exit check: the redirect truncated the staged copy to 0 bytes, the prefix
# comparison became empty-against-empty, and the block PRINTED ITS OWN SUCCESS SENTENCE - verbatim the failure
# its own header says it refuses. A demonstrated it end to end with the register moved under a directory of the
# same name: 11 live held rows to 0, held.sh not-held, FAST GATE GREEN, certified by this ratchet. That is
# CLAUDE.md's non-empty-denominator rule arriving at the instrument, and it is why the size is asserted below
# in its own say rather than as a conjunct. `^{blob}` does NOT work here - A measured it: `git rev-parse
# --verify "<sha>:<path>^{blob}"` answers `fatal: Needed a single revision`, exit 128, on a real blob. The
# working form is `cat-file -t`, which answers blob, tree, or fails with exit 128 when the path is absent.
blobtype(){ $GIT cat-file -t "$1:$2" 2>/dev/null || echo MISSING; }

RECBAD=""
for f in $RATCHET_APPENDONLY $RATCHET_NOSHRINK; do
  case " $RATCHET_APPENDONLY " in *" $f "*) MODE=appendonly ;; *) MODE=noshrink ;; esac
  bt="$(blobtype "$BASEFULL" "$f")"; ht="$(blobtype "$HEAD" "$f")"
  bb="$($GIT rev-parse --quiet --verify "$BASEFULL:$f" 2>/dev/null || true)"
  hb="$($GIT rev-parse --quiet --verify "$HEAD:$f" 2>/dev/null || true)"
  if [ "$bt" = MISSING ]; then
    say "    $f: absent at base ($MODE) - no base content exists to protect."
    continue
  fi
  if [ "$bt" != blob ]; then
    RECBAD="$RECBAD$f: BASE is a $bt, not a blob, so no ratchet over it means anything. Run FULL.\n"; continue
  fi
  if [ "$bb" = "$hb" ] && [ "$ht" = blob ]; then
    say "    $f: untouched by this commit ($MODE, same blob id at base and head)."
    continue
  fi
  if [ "$ht" = MISSING ]; then
    RECBAD="$RECBAD$f: GONE - present at base, absent at head. A records commit may not delete a record.\n"; continue
  fi
  if [ "$ht" != blob ]; then
    RECBAD="$RECBAD$f: HEAD is a $ht, not a blob (replaced by a directory?). Run FULL.\n"; continue
  fi
  $GIT cat-file blob "$bb" > "$REGTMP/base" 2>/dev/null || { RECBAD="$RECBAD$f: could not read the BASE blob.\n"; continue; }
  $GIT cat-file blob "$hb" > "$REGTMP/head" 2>/dev/null || { RECBAD="$RECBAD$f: could not read the HEAD blob.\n"; continue; }
  nb="$(wc -c < "$REGTMP/base" | tr -d ' ')"; nb="${nb:-0}"
  nh="$(wc -c < "$REGTMP/head" | tr -d ' ')"; nh="${nh:-0}"
  # THE DENOMINATOR, ASSERTED IN ITS OWN say AND NEVER AS A CONJUNCT [prompts/common, CLAUDE.md].
  if [ "$nb" -eq 0 ] 2>/dev/null; then
    RECBAD="$RECBAD$f: the BASE blob is ZERO BYTES, so every comparison below would pass over nothing.\n"; continue
  fi
  # TEXT: no NUL and no C0 control byte but tab, newline, CR. Non-ASCII is fine and must be.
  CTL="$(LC_ALL=C tr -d '\11\12\15\40-\377' < "$REGTMP/head" | wc -c | tr -d ' ')"; CTL="${CTL:-0}"
  if [ "$CTL" -ne 0 ] 2>/dev/null; then
    RECBAD="$RECBAD$f: TEXT - the head blob carries $CTL control byte(s) outside tab/newline/CR. grep goes\n"
    RECBAD="$RECBAD    binary on a NUL and SUPPRESSES the matching lines, so every grep-based consumer of this\n"
    RECBAD="$RECBAD    file silently reads fewer rows while the bytes all verify as appended [#509 antagonist B].\n"
    continue
  fi
  # COUNTED WITH awk AND NOT WITH `grep -c '' || echo 0`, AND THIS IS #509's OWN WORST BUG, FOUND BY READING
  # ITS OWN LOG LINE AFTER A CONTROL THAT PASSED. `grep -c '' < an-empty-file` PRINTS 0 *AND EXITS 1*, so the
  # `|| echo 0` fallback ran as well and the captured value was TWO LINES, "0\n0". `[ "$LH" -lt "$LB" ]` on that
  # is not an integer comparison: it errors, the `if` is false, and THE REFUSAL NEVER HAPPENS. So NOSHRINK could
  # not fire on an EMPTY head - the single most important case it exists for - and the block printed its own
  # success sentence while naming the two numbers that contradict it: "HANDOFF.md: no shrink and no control bytes
  # (103 lines at base, 0...)". Control (h) masked it because every file it gutted still had a non-empty head or
  # was caught by APPENDONLY's LENGTH arm instead. `awk END{print NR}` exits 0 always, prints 0 for an empty
  # file, and counts a final line with no trailing newline - which is the count a consumer actually sees.
  LB="$(awk 'END{print NR}' "$REGTMP/base" 2>/dev/null)"; LB="${LB:-0}"
  LH="$(awk 'END{print NR}' "$REGTMP/head" 2>/dev/null)"; LH="${LH:-0}"
  # THE DENOMINATOR AGAIN, IN ITS OWN say. A base of zero lines makes NOSHRINK unfalsifiable.
  case "$LB" in ''|*[!0-9]*) RECBAD="$RECBAD$f: the base line count did not read as a number, so NOSHRINK cannot be evaluated.\n"; continue ;; esac
  case "$LH" in ''|*[!0-9]*) RECBAD="$RECBAD$f: the head line count did not read as a number, so NOSHRINK cannot be evaluated.\n"; continue ;; esac
  if [ "$LB" -eq 0 ]; then
    RECBAD="$RECBAD$f: the BASE is ZERO LINES, so NOSHRINK would pass over nothing.\n"; continue
  fi
  if [ "$LH" -lt "$LB" ]; then
    RECBAD="$RECBAD$f: NOSHRINK - $LH lines at head against $LB at base. A records commit may grow a record\n"
    RECBAD="$RECBAD    and may not shorten one.\n"
    continue
  fi
  if [ "$MODE" = appendonly ]; then
    if [ "$nh" -lt "$nb" ] 2>/dev/null; then
      RECBAD="$RECBAD$f: LENGTH - $nh bytes at head against $nb at base, so content was removed or truncated\n"
      continue
    fi
    # AN APPEND MUST START AT A LINE BOUNDARY, OR IT IS NOT AN APPEND. #509's antagonist B found that the byte
    # prefix test never requires this, and antagonist A then measured the live case: README.md's last byte at
    # HEAD is 0x72, not a newline, so any "append" to it concatenates onto the last existing line - rewriting
    # it - while the byte prefix verifies and the line count does not move. gates/held.sh appends a row with a
    # bare `>>` and no newline guard, where gates/buildnum.sh has ensure_nl() for exactly this reason. So the
    # base must END IN A NEWLINE before an append can be credited, and when it does not this is REPORTED and
    # never credited [CLAUDE.md: a missing denominator is reported, never credited]. Measured at this base: all
    # four APPENDONLY files end in 0x0a, so this reports nothing today and guards the arm rather than the tree.
    if [ "$(tail -c 1 "$REGTMP/base" | od -An -tx1 | tr -d ' \n')" != "0a" ]; then
      RECBAD="$RECBAD$f: the BASE does not end in a newline, so a byte append would extend its LAST ROW rather\n"
      RECBAD="$RECBAD    than add one. Not credited as append-only. Fix the writer (see gates/buildnum.sh ensure_nl).\n"
      continue
    fi
    head -c "$nb" "$REGTMP/head" > "$REGTMP/prefix" 2>/dev/null
    if ! cmp -s "$REGTMP/prefix" "$REGTMP/base"; then
      WHERE="$(cmp "$REGTMP/prefix" "$REGTMP/base" 2>&1 | head -1 | tr -d '%')"
      RECBAD="$RECBAD$f: PREFIX - the $nb bytes present at base are NOT byte-identical at head [$WHERE]. A row\n"
      RECBAD="$RECBAD    was edited in place, renumbered, cleared with a leading dash, removed, or inserted mid-file.\n"
      continue
    fi
    say "    $f: append-only BY VALUE ($nb base bytes all identical at head; $((nh-nb)) appended, $((LH-LB)) lines, 0 control bytes)."
  else
    say "    $f: no shrink and no control bytes ($LB lines at base, $LH at head; $nb -> $nh bytes)."
  fi
done
if [ -n "$RECBAD" ]; then
  say ""
  say "FAST GATE REFUSED - a ratcheted record was not appended to or grown, it was CHANGED:"
  printf "%b" "$RECBAD" | sed 's/^/    /' | tee -a "$LOG"
  say "These files are what this project knows. held-trees.tsv is the only carrier of a previous run's refusal"
  say "to ship a tree [#450]; build-numbers.tsv is the non-reuse register [#454]; CLAUDE.md is the one file"
  say "every build session reads before it acts; FEEDBACK-INBOX.md is append-only by CLAUDE.md's own rule."
  say "If the change is deliberate, it is not a records commit. Run the FULL suite."
  exit 1
fi

# ── NO SUMMARY LINE ON THE CLEAN PATH, AND THAT IS A MEASURED DECISION RATHER THAN AN OMISSION. ─────────────
# This file first ended with `say "records gate: N ratcheted record(s) checked, none changed."`, which is the
# obvious thing for a door with an identity to print. THE EQUALITY MEASUREMENT REFUSED IT: over six commit
# pairs against a clone of origin/main, fastgate.sh's stdout and its log were byte-identical before and after
# the extraction on FOUR - every refusal and both FULL-SUITE verdicts - and differed on the two clean-records
# pairs by exactly that one added line. One line in a log is not nothing: this project's own history is a
# footer total computed from a log (#419), a verify-log.sh that counts suite sections, and three "thin log"
# files whose footers were right and whose bodies were not (#405). A part (1) whose whole claim is that it
# changes no behaviour does not get to add a line to the record on the way past. The line comes back, if it is
# wanted, in the commit that makes this door a refusal on the full-suite path - where the output is new anyway.
# The per-file lines the body already prints are the identity; they were there before and they are unchanged.
exit 0
