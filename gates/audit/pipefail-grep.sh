#!/usr/bin/env bash
# gates/audit/pipefail-grep.sh   THE EARLY-EXITING GREP UNDER PIPEFAIL, DERIVED BY COMMAND AND RATCHETED.
#
# jobs/gates-sh-mani-line-captures-the-fallback-as-well-as-the-verdict-on-sigpipe-2026-10-02 asked for three
# things. Two were done at #461 and #467: the gates.sh:167 site was repaired and the mechanism was written
# down at gates/gates.sh:168-184. The third is this file, and the job's own notChecked says why it is owed:
#   "Whether any OTHER | grep under pipefail survives in gates/. I verified this one site and fixed my own
#    new instance in verify-log.sh's floor arm during #467, but I did NOT sweep the directory - that is the
#    class sweep this job should carry and it is not done."
# Its scopeReducedTo adds the second half: "the 2-input case is only recorded as prose in the gates.sh
# comment; no standing assertion exists".
#
# THE MECHANISM, stated once and then only measured. `set -o pipefail` reports the pipeline's status as the
# RIGHTMOST non-zero. An early-exiting consumer - `grep -q`, `grep -m1`, `grep -l`, `head -N` - stops reading
# as soon as it has its answer, so the kernel kills the producer with SIGPIPE and the producer exits 141. The
# consumer SUCCEEDED; the pipeline reports 141 anyway. It only happens once the producer's output exceeds the
# pipe buffer (~64KB here), which is why every instance of this is LATENT until some record grows.
#
# THE THREE CONSEQUENCES ARE DIFFERENT AND THE CLASS IS WORTH SWEEPING BECAUSE OF THAT, not because the
# shape repeats. Measured instances, all three now on this branch:
#   TIER A  `$( producer | grep -m1 X || echo FALLBACK )`   both outputs are captured. gates.sh:167.
#           A false NOT CHECKED printed beside a manifest that was read perfectly, refusing a green suite.
#   TIER B  `if producer | grep -q X; then`                  a present needle reads ABSENT. verify-log-selftest.sh:83.
#           A false FAIL on a self-test that passed.
#   TIER C  `if ! producer | grep -q X; then`                a present needle reads ABSENT, NEGATED.
#           verify-log-selftest.sh:110. A false PASS - a hole reported CLOSED while the defect is still there.
# TIER C IS THE WORST AND WAS THE LAST ONE FOUND, which is the argument for a derived sweep over a reading:
# the two repaired-by-hand instances were both of the shape the original job described, and the one that can
# print a false GREEN was in the same twenty lines and nobody had looked.
#
# THE REPAIR IS ALWAYS THE SAME ONE WORD: a herestring. `grep -q X <<<"$v"` has no pipe and therefore no
# SIGPIPE. gates/gatemanifest.sh's header has said so since #461 ("use grep -qx \"$x\" <<<\"$list\" and never
# printf ... | grep -q"); this file is that sentence turned into a command, because the sentence did not
# travel to the next script by itself.
#
# NOT A GATE. It lives in gates/audit/ and not gates/regress/, so gates.sh (which globs regress/*.js) never
# runs it and it can never contribute to or block a GATES GREEN. Run it by name.
#
# USAGE: bash gates/audit/pipefail-grep.sh            scan + controls, exit 1 if the tier-A ceiling is breached
#        bash gates/audit/pipefail-grep.sh --scan     scan only
set -uo pipefail
G="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-all}"
P=0; F=0; FIXT=0

# ── THE CEILINGS. A ratchet, not a report: a number that can only be lowered. ────────────────────────────
# TIER A, the shape that CONCATENATES, is the one this project has already shipped and refused a suite over.
# Its ceiling is 0 and it is checkable rather than aspirational.
A_CEIL=0
# TIER C is 0 after this branch's two repairs and stays 0: a negated early-exiting pipe can print a false
# GREEN, and there is no bounded-producer case worth that risk.
C_CEIL=0
# TIER B IS A ROSTER CEILING, NOT A ZERO, AND THAT IS A MEASUREMENT RATHER THAN A CONCESSION. Derived on this
# branch over origin/main 97393a6: 23 members across six files. Setting it to 0 would have made this audit
# red on arrival and therefore ignorable, which is the failure mode gatemanifest.sh's header warns about. A
# ratchet can only be lowered: the 25th member breaches, and every one of the 24 is printed above so the next
# run that touches one of those files can repair it and lower the number. NONE of the 24 is in the shape that
# concatenates; each is a status-only corruption and each is latent on its own producer's size.
B_CEIL=23
# A bounded producer is not a member. Each entry names WHY it is bounded, because an exemption with no
# reason is a hole rather than a decision [the gatemanifest.sh C11b argument].
#   gatemanifest.sh:353  producer is `sed -n '2,6p'` - at most 5 lines, cannot reach the buffer.
#   gatemanifest.sh:389  producer is `rows`, consumer is `sed -n 1p` which READS THE WHOLE STREAM (its own
#                        comment says so and says head -1 would SIGPIPE it) - so there is no early exit.
EXEMPT_CEIL=2

# ── ARM 1. THE PROPAGATION PROBE. MEASURED AT RUN TIME, BECAUSE THIS FILE'S OWN C5 LEFT IT OPEN. ─────────
# C5 below records that at 200,000 bytes `printf | grep -m1` propagated and `printf | grep -qF` did NOT, and
# says in terms: "the honest statement is that `grep -q` here does not SIGPIPE its producer at this size
# while `grep -m1` does, and WHY is not measured". IT IS MEASURED NOW, and the answer is that the CONSUMER
# is not the only variable - THE PRODUCER DECIDES, and two producers in live use here never propagate at all.
# Measured in this container at 20MB, one pipeline per row, read from the probe below and not copied in:
#     cat FILE      | grep -q   -> 141      tr -d '\n' < FILE | grep -q  -> 0
#     printf '%s'   | grep -q   -> 141      grep -n PAT FILE  | head -1  -> 0
#     sed -n R FILE | grep -q   -> 141      awk FILE | head -1           -> 141
#     cut/sort/git/bash -c      -> 141
# GNU grep exits 0 once it has selected a line and tr returns 0 on a write error, so neither reports the
# broken pipe; cat, sed, awk, cut, sort, git and a bash subshell all die 141 and pipefail publishes it.
# SO A TIER ASSIGNED FROM THE CONSUMER ALONE OVER-COUNTS, and that is not a quibble: it is why this audit
# went RED ON ARRIVAL inside build #499's 18-payload batch at 2026-10-08T13:15Z and blocked all eighteen.
# WHAT THE PROBE IS NOT. A pair that does not propagate at the probe size is NOT absolved. The repair still
# costs one word and removes the possibility for every future input size, so such a site is reported as
# LATENT-NOT-REPRODUCED with its measured rc, never as clean and never silently.
PROBE_BYTES="${CT_PFG_BYTES:-4000000}"
PROBE_CACHE=""
probe_file() {
  [ -n "${PROBE_BIG:-}" ] && return 0
  PROBE_BIG="$(mktemp)"; PROBE_TRASH="${PROBE_TRASH:-} $PROBE_BIG"
  { printf 'NEEDLEx:\n'; head -c "$PROBE_BYTES" /dev/zero | tr '\0' 'y' | fold -w 100; } > "$PROBE_BIG" 2>/dev/null
}
# probe <producer-word> <consumer-word> -> the pipeline's rc under pipefail, measured, cached
probe() {
  local key="$1/$2" hit rc
  # THIS FILE PRACTISES WHAT IT AUDITS: a herestring, not `printf ... | grep -m1`, which would otherwise
  # have been a REAL tier-A member added to the roster by the very change that detects them. It was, for
  # about four minutes, and the scan found it rather than my reading - the count went 26 to 27 on the run
  # before this line was written. Recorded rather than quietly fixed, because the first draft of the C7-C9
  # plant made the same mistake and this file's own header already says so.
  hit="$(grep -m1 -F "${key}=" <<<"$PROBE_CACHE" || true)"
  if [ -n "$hit" ]; then printf '%s' "${hit#*=}"; return 0; fi
  probe_file
  local cons; case "$2" in
    head) cons='head -1 >/dev/null' ;;
    *)    cons='grep -qF -- NEEDLE' ;;
  esac
  local prod; case "$1" in
    tr)      prod="tr -d '\n' < \"\$PROBE_BIG\"" ;;
    printf)  prod="printf '%s' \"\$(cat \"\$PROBE_BIG\")\"" ;;
    sed)     prod="sed -n '1,100000000p' \"\$PROBE_BIG\"" ;;
    awk)     prod="awk '{print}' \"\$PROBE_BIG\"" ;;
    cut)     prod="cut -c1-120 \"\$PROBE_BIG\"" ;;
    sort)    prod="sort \"\$PROBE_BIG\"" ;;
    grep)    prod="grep -n y \"\$PROBE_BIG\"" ;;
    cat|*)   prod="cat \"\$PROBE_BIG\"" ;;
  esac
  rc="$(PROBE_BIG="$PROBE_BIG" bash -c "set -uo pipefail; $prod | $cons; echo \$?" 2>/dev/null | tail -1)"
  case "$rc" in ''|*[!0-9]*) rc=141 ;; esac   # UNREADABLE PROBE IS TREATED AS PROPAGATING, never as clean
  PROBE_CACHE="$(printf '%s\n%s=%s' "$PROBE_CACHE" "$key" "$rc")"
  printf '%s' "$rc"
}
# THE PRODUCER WORD OF A SITE, read from the text left of the LAST pipe, and the consumer word right of it.
prod_word() { # prod_word <line text>
  local l="${1%%|*}"
  l="$(printf '%s' "$l" | sed 's/.*[;(){}&]//; s/^[[:space:]]*//; s/^[A-Za-z_][A-Za-z0-9_]*=//; s/^"*//; s/^\$(//; s/^[[:space:]]*//')"
  # LEADING SHELL KEYWORDS ARE NOT PRODUCERS, and omitting this cost two failing controls rather than a
  # wrong green, which is the right way round: C13 and C14 read tier B on a planted `if tr ... | grep -q`
  # because prod_word returned the word `if`, the probe fell to its cat default, and every keyword-prefixed
  # site in the repository would silently have been treated as propagating. Stripped in a loop, not once,
  # because `if ! command ...` carries two.
  local prev=""
  while [ "$l" != "$prev" ]; do
    prev="$l"
    l="$(printf '%s' "$l" | sed 's/^\(if\|then\|elif\|while\|until\|do\|else\|!\|time\|eval\)[[:space:]]\+//; s/^[[:space:]]*//')"
  done
  printf '%s' "${l%% *}"
}
cons_word() { # cons_word <line text>
  local r="${1##*|}"; r="$(printf '%s' "$r" | sed 's/^[[:space:]]*!*[[:space:]]*//')"
  printf '%s' "${r%% *}"
}

sh_files() { ls "$G"/*.sh "$G"/audit/*.sh 2>/dev/null; }
pipefail_files() { local f; for f in $(sh_files); do grep -qE '^set -[a-zA-Z]*o pipefail|^set -o pipefail' "$f" && echo "$f"; done; }

# ── THE DERIVATION. One expression, applied to every pipefail file, printing file:line. ──────────────────
# A member is a pipe whose CONSUMER exits early. Comment lines are excluded by the ^[[:space:]]*# test
# rather than by hoping, because this file's own prose quotes the defective form twice and would otherwise
# count itself - which the first draft of this scan did.
EARLY='\|[[:space:]]*!?[[:space:]]*(grep[[:space:]]+-[a-zA-Z]*[ql][a-zA-Z]*([[:space:]]|$)|grep[[:space:]]+-m[0-9]|head[[:space:]]+-[0-9]|head[[:space:]]+-n[[:space:]]*[0-9])'
scan() {
  local f ln txt
  for f in $(pipefail_files); do
    while IFS=: read -r ln txt; do
      [ -n "${ln:-}" ] || continue
      case "$txt" in *[!' ']*) ;; *) continue ;; esac
      grep -qE '^[[:space:]]*#' <<<"$txt" && continue
      # THIS FILE'S OWN REPRODUCTION FIXTURES ARE DELIBERATE MEMBERS AND ARE NOT DEFECTS. They are exempted
      # by the marker below rather than by file name, so a REAL member added to this file would still count.
      grep -qF 'PFG-FIXTURE' <<<"$txt" && { FIXT=$((FIXT+1)); continue; }
      local tier=B
      grep -qE '\|\|[[:space:]]*(echo|printf)' <<<"$txt" && tier=A
      grep -qE '(if|&&|\|\|)[[:space:]]*!' <<<"$txt" && [ "$tier" = B ] && tier=C
      # THE MEASURED RE-TIER. A site whose (producer, consumer) pair is measured NOT to propagate at
      # PROBE_BYTES is tier X: reported with its rc, NOT counted against any ceiling, NOT called clean.
      # PFG_NOPROBE=1 forces every pair to count, which is the mutation control C14 drives.
      local pw cw prc
      if [ "${PFG_NOPROBE:-0}" != 1 ]; then
        pw="$(prod_word "$txt")"; cw="$(cons_word "$txt")"; prc="$(probe "$pw" "$cw")"
        [ "$prc" = 0 ] && tier="X"
      fi
      printf '%s\t%s:%s\t%s\n' "$tier" "${f#"$G"/}" "$ln" "$(printf '%s' "$txt" | sed 's/^[[:space:]]*//' | cut -c1-96)"
    done < <(grep -nE "$EARLY" "$f" 2>/dev/null)
  done
}

ck() { # ck <description> <expected> <got>
  if [ "$2" = "$3" ]; then P=$((P+1)); printf 'PASS %s\n' "$1"
  else F=$((F+1)); printf 'FAIL %s (wanted "%s" got "%s")\n' "$1" "$2" "$3"; fi
}

if [ "$MODE" = "--scan" ] || [ "$MODE" = "all" ]; then
  echo "── SCAN: early-exiting consumers in pipefail scripts under gates/ ──────────────────────────────"
  NFILES="$(pipefail_files | wc -l | tr -d ' ')"
  echo "pipefail .sh files scanned: $NFILES"
  OUT="$(scan)"
  NA="$(grep -c '^A' <<<"$OUT" || true)"; NB="$(grep -c '^B' <<<"$OUT" || true)"; NC="$(grep -c '^C' <<<"$OUT" || true)"
  [ -n "$OUT" ] && printf '%s\n' "$OUT" | sed 's/^/  /'
  NX="$(grep -c '^X' <<<"$OUT" || true)"
  printf '  tier A %s (ceiling %s), tier B %s (ceiling %s), tier C %s (ceiling %s), tier X %s (measured not to propagate at %s bytes - LATENT, not clean), own fixtures %s, exempt-by-bounded-producer 2 (ceiling %s)\n' \
    "$NA" "$A_CEIL" "$NB" "$B_CEIL" "$NC" "$C_CEIL" "$NX" "$PROBE_BYTES" "$FIXT" "$EXEMPT_CEIL"
fi
[ "$MODE" = "--scan" ] && exit 0

echo "── CONTROLS ────────────────────────────────────────────────────────────────────────────────────"
# C1/C2 THE MECHANISM, REPRODUCED AND REPAIRED, at the two input sizes the job's case asks for. This is the
# standing assertion scopeReducedTo says does not exist. It asserts BEHAVIOUR, not the text of a repair.
repro() { # repro <bytes> <form: pipe|herestring>  -> number of lines captured
  local v; v="gate manifest: ok$(printf '\n%*s' "$1" '' | tr ' ' 'x')"
  local got
  if [ "$2" = pipe ]; then got="$(printf '%s\n' "$v" | grep -m1 '^gate manifest:' || echo 'gate manifest: NOT CHECKED')" # PFG-FIXTURE
  else got="$(grep -m1 '^gate manifest:' <<<"$v" || echo 'gate manifest: NOT CHECKED')"; fi
  printf '%s' "$got" | wc -l | tr -d ' '
}
ck "C1 POSITIVE CONTROL: at 10 bytes the pipe form captures ONE line, so the scan is not chasing a phantom" "0" "$(repro 10 pipe)"
ck "C2 THE DEFECT FIRES: at 200000 bytes the pipe form captures the fallback AS WELL as the verdict" "1" "$(repro 200000 pipe)"
ck "C3 THE REPAIR SILENCES IT: the herestring form captures one line at 200000 bytes" "0" "$(repro 200000 herestring)"

# C4 TIER C, the false PASS, reproduced on its own because it is the consequence nobody had measured.
tierc() { # tierc <bytes> <form> -> "absent" or "present"
  local v; v="NEEDLE$(printf '%*s' "$1" '' | tr ' ' 'y')"
  if [ "$2" = pipe ]; then if ! printf '%s' "$v" | grep -qF -- NEEDLE; then echo absent; else echo present; fi  # PFG-FIXTURE
  else if ! grep -qF -- NEEDLE <<<"$v"; then echo absent; else echo present; fi; fi
}
ck "C4 POSITIVE CONTROL: at 10 bytes the negated pipe form sees the needle" "present" "$(tierc 10 pipe)"
# C5 AS FIRST WRITTEN ASSERTED "absent" HERE AND FAILED, AND THE FAILURE IS RECORDED RATHER THAN THE
# ASSERTION QUIETLY FLIPPED [R18]. The prediction was that tier C reproduces exactly as tier A does. MEASURED
# in this container at 200,000 bytes: it does NOT. tier A's pipeline (`printf | grep -m1`) returns non-zero
# and the fallback runs - C2 proves it. tier C's (`printf | grep -qF`) returns ZERO and the needle is seen.
# The two differ in the consumer only, so the honest statement is that `grep -q` here does not SIGPIPE its
# producer at this size while `grep -m1` does, and WHY is not measured - it is a property of when each
# consumer closes its input, and a 200KB sample is not a proof of the boundary.
# WHAT THAT MEANS FOR THE REPAIRS: the two tier-C/B sites repaired in gates/verify-log-selftest.sh on this
# branch are repaired on the MECHANISM (the shape is identical to the one that provably fires) and NOT on a
# reproduction of their own symptom. That is weaker than tier A's evidence and is stated as such. The repair
# is still right - it costs one word and removes the possibility - but nobody should cite a measured false
# PASS in this project, because this run looked for one and did not find it.
ck "C5 WHAT WAS ACTUALLY MEASURED: at 200000 bytes the negated pipe form still sees the needle, so tier C's symptom did NOT reproduce here and the tier-C consequence is a mechanism argument, not a measurement" "present" "$(tierc 200000 pipe)"
ck "C6 the herestring form sees it at 200000 bytes" "present" "$(tierc 200000 herestring)"

# C7..C9 THE SCANNER ITSELF. A scan with no control is a number nobody can trust.
TD="$(mktemp -d)"; trap 'rm -rf "$TD"' EXIT
mkdir -p "$TD/audit"
# THE PLANT IS ASSEMBLED FROM A VARIABLE RATHER THAN WRITTEN AS A LITERAL, and the reason is a defect this
# run found in its own first draft: a heredoc holding the defective form put a real tier-A member INTO this
# file, so the scan counted its own fixture and the ratchet read 2 against a ceiling of 0 on arrival. The
# pipe character comes from $PIPE, so the token sequence exists only in the generated file.
PIPE='|'
{ printf 'set -uo pipefail\n'
  printf 'X="$(printf %%s \"$BIG\" %s grep -m1 %s^k:%s || echo %sk: NOT CHECKED%s)"\n' "$PIPE" "'" "'" "'" "'"
  printf 'Y="$(grep -m1 %s^k:%s <<<\"$BIG\" || echo %sk: NOT CHECKED%s)"\n' "'" "'" "'" "'"
} > "$TD/plant.sh"
ck "C7 the scan FINDS a planted tier-A member" "1" "$(G="$TD" ; scan | grep -c '^A' || true)"
ck "C8 the scan does NOT count the herestring line beside it" "0" "$(G="$TD"; scan | grep -c 'Y=' || true)"
sed -i 's/^set -uo pipefail/set -u/' "$TD/plant.sh"
ck "C9 and it finds nothing in the same file once pipefail is off, so the predicate is pipefail and not grep" "0" "$(G="$TD"; scan | wc -l | tr -d ' ')"

PIPE="${PIPE:-|}"
# ── C10..C15 THE PROBE AND THE RE-TIER, WITH A DISCRIMINATOR. ───────────────────────────────────────────
# C1..C9 above control the MECHANISM and the SCANNER. They say nothing about the re-tier, and a re-tier with
# no control that fires is the vacuity this project's own jobs/s3b-and-s6-are-the-only-repo-reading-checks
# is about. C15 is the one that matters: it drives the probe to the wrong answer and shows tier X collapse,
# so a reader can tell a tier produced by MEASUREMENT from a tier produced by the shape of the line.
ck "C10 the probe measures cat as PROPAGATING, so the defect is real and not a story" "141" "$(probe cat grep)"
ck "C11 the probe measures tr as NOT propagating, which is the fact C5 left open" "0" "$(probe tr grep)"
PA="$(probe cat grep)"; PB="$(probe tr grep)"
ck "C12 THE PROBE IS NOT VACUOUS: the two answers differ, so it has discriminating power at all" "differ" "$([ "$PA" != "$PB" ] && echo differ || echo same)"
TD2="$(mktemp -d)"; trap 'rm -rf "$TD" "$TD2" ${PROBE_TRASH:-}' EXIT
mkdir -p "$TD2/audit"
{ printf 'set -uo pipefail\n'
  printf 'if tr -d %s\\n%s < "$f" %s grep -q NEEDLE; then :; fi\n' "'" "'" "$PIPE"
  printf 'if cat "$f" %s grep -q NEEDLE; then :; fi\n' "$PIPE"
} > "$TD2/plant2.sh"
ck "C13 the scan assigns tier X to the tr-producer site" "1" "$(G="$TD2"; scan | grep -c '^X' || true)"
ck "C14 THE DISCRIMINATOR: the cat-producer site beside it is still tier B, so X is not given to every status-only line" "1" "$(G="$TD2"; scan | grep -c '^B' || true)"
ck "C15 MUTATION CONTROL: with the probe forced off, the SAME tr site returns to tier B and tier X is empty - so tier X is produced by the measurement, not by the text" "0+2" "$(G="$TD2"; PFG_NOPROBE=1; export PFG_NOPROBE; printf '%s+%s' "$(scan | grep -c '^X' || true)" "$(scan | grep -c '^B' || true)")"
unset PFG_NOPROBE

echo "── THE RATCHET ─────────────────────────────────────────────────────────────────────────────────"
FIXT=0; OUT="$(scan)"
NA="$(grep -c '^A' <<<"$OUT" || true)"; NB="$(grep -c '^B' <<<"$OUT" || true)"; NC="$(grep -c '^C' <<<"$OUT" || true)"
NX="$(grep -c '^X' <<<"$OUT" || true)"
BREACH=0
# ── ARM 2. A BREACH NAMES ITS MEMBERS AND THE REPAIR. ───────────────────────────────────────────────────
# IT PRINTED A COUNT AND NOTHING ELSE UNTIL NOW, AND THAT COST A RUN. Build #499's integration slot met
# "TIER B ROSTER CEILING BREACHED: 26 status-only sites against a ceiling of 23" over an 18-payload batch
# and had to re-derive which three sites were new by hand, across two other lanes' files, before it could
# say what the fix was. A ceiling message that does not name the member it is complaining about transfers
# the investigation to whoever reads it, which is the cost R50's whatWouldCloseIt obligation exists to stop.
members() { # members <tier letter>
  printf '%s\n' "$OUT" | awk -F'\t' -v t="$1" '$1==t {printf "      %s\n        %s\n", $2, $3}'
}
# THE NOTE IS ASSEMBLED FROM $PIPE RATHER THAN WRITTEN AS A LITERAL, for the reason this file's own header
# already records about the C7 plant: prose that quotes the defective form IS the defective form as far as a
# textual scan is concerned, and the scan counted this very string as a real tier-B member on the run before
# this line was written - 26 against 25. Found by running it, not by reading it, which is the whole argument
# for a derived sweep.
repair_note="      THE REPAIR IS ONE WORD IN EACH, AND IT IS THE SAME WORD: replace a pipe ${PIPE} into
      \`grep -q X\` with \`grep -q X <<<\"\$v\"\`, holding the producer output in a variable first. A
      herestring has no pipe and therefore no SIGPIPE, so the site stops being latent on its producer size."

if [ "$NA" -gt "$A_CEIL" ]; then echo "TIER A CEILING BREACHED: $NA concatenating sites against a ceiling of $A_CEIL. Every member, with the line:"; members A; printf '%s\n' "$repair_note"; BREACH=1; fi
if [ "$NC" -gt "$C_CEIL" ]; then echo "TIER C CEILING BREACHED: $NC negated sites against a ceiling of $C_CEIL - a negated one can print a false GREEN. Every member, with the line:"; members C; printf '%s\n' "$repair_note"; BREACH=1; fi
if [ "$NB" -gt "$B_CEIL" ]; then echo "TIER B ROSTER CEILING BREACHED: $NB status-only sites against a ceiling of $B_CEIL, and the ceiling is NOT lowered to clear it. Every member, with the line, so the reader does not re-derive which ones are new:"; members B; printf '%s\n' "$repair_note"; BREACH=1; fi
[ "$NX" -gt 0 ] && { echo "TIER X, $NX site(s): measured NOT to propagate at $PROBE_BYTES bytes, so NOT counted against a ceiling and NOT clean. Repair them anyway - the measurement is of this container at this size, never of every input:"; members X; }
printf 'pipefail-grep audit: %s pass, %s fail; tier A %s/%s, tier B %s/%s, tier C %s/%s, tier X %s (latent, uncounted)\n' "$P" "$F" "$NA" "$A_CEIL" "$NB" "$B_CEIL" "$NC" "$C_CEIL" "$NX"
[ "$F" -eq 0 ] && [ "$BREACH" -eq 0 ] && { if [ "$NX" -gt 0 ]; then echo "NO CEILING BREACHED. $NX tier-X site(s) remain LATENT and are named above; this is not the word CLEAN and must not be quoted as one."; else echo "CLEAN. No early-exiting consumer under pipefail survives in gates/ outside the two bounded-producer exemptions."; fi; exit 0; }
exit 1
