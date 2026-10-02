#!/usr/bin/env bash
# gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | selftest
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
# THE FIX IS A HERESTRING, which has no pipe and therefore no SIGPIPE. Every site below uses one. If you add a
# membership test to this file, use `grep -qx "$x" <<<"$list"` and never `printf ... | grep -q`.
# ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
rows(){ grep -v '^[[:space:]]*#' "$M" | grep -v '^[[:space:]]*$'; }
diskgates(){ for f in "$REG"/*.js; do [ -e "$f" ] && basename "$f"; done | sort; }

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
  NUNJ=$(printf '%s' "$UNJUSTIFIED" | grep -c . || true)
  # MALFORMED IS IN THIS LINE BECAUSE THIS LINE IS THE CARRIER. gates.sh copies it into the log footer and
  # gates/verify-log.sh reads it back; a count that is not here is invisible to the push gate [B's F2].
  echo "gate manifest: $NREQ required, $NPRES present, $NMISS missing, $NUNL unlisted, $NABS known-absent, $NRET retired, $NUNJ unjustified, $MALFORMED unreadable"
  { [ -n "$MISSING" ] || [ -n "$UNJUSTIFIED" ] || [ "$MALFORMED" -gt 0 ]; } && exit 1
  [ -n "$UNLISTED" ] && exit 2
  exit 0
  ;;
sync)
  WHY="${2:-}"; [ -n "$WHY" ] || { echo "usage: gates/gatemanifest.sh sync 'what these gates cover / why they arrived'"; exit 1; }
  B="${CT_BUILD:-unknown}"; WHO="${CT_RUNID:-unknown-run}"; AT="$(date -u +%Y-%m-%d)"
  listed="$(rows | cut -f1 | tr -d ' \r' | sort -u)"; n=0
  for g in $(diskgates); do
    if ! grep -qx "$g" <<<"$listed"; then   # herestring, NOT a pipe - a false miss here APPENDED A DUPLICATE ROW
      d="$(sed -n '2,6p' "$REG/$g" | grep -m1 '^//' | sed 's|^//[ ]*||' | tr '\t' ' ' | cut -c1-88)"
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
  echo "usage: gates/gatemanifest.sh check | sync '<why>' | retire <gate> '<why>' | list | selftest"; exit 2;;
esac
