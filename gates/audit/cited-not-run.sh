#!/usr/bin/env bash
# gates/audit/cited-not-run.sh
#
# WHAT IT ANSWERS, in one line: which files under gates/ are CITED in our own records as the
# evidence behind a published number, and are reachable by NO suite run.
#
# WHY IT EXISTS. jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28 is that class. Its first
# published answer was ZERO, which was the number true of the single file that had just been fixed;
# its corrected answer was FIVE, hand-derived by reading RUN-LOG.md, and its own claim row calls
# that "itself a floor over one document". Both numbers were read by a person. This derives the set
# instead, from gates/gates.sh and from the record documents, so the count cannot be published wrong
# again and cannot go stale the next time a file is added beside the suite rather than inside it.
# It is a COMPARATOR in the sense of R47: it checks what we PRINT as evidence against what the
# runner can actually REACH. Both halves were already in our hands and nothing read them together.
#
# IT DOES NOT ADMIT ANYTHING TO A SUITE. Admission needs gates/gates.sh, whose log section count is
# pinned by gates/verify-log.sh:431-440 - one extra section header there refuses every green log from
# that point on. This script only reports, so it can never redden the suite it audits.
#
# USAGE
#   gates/audit/cited-not-run.sh            report against the repository it lives in
#   gates/audit/cited-not-run.sh --selftest run the controls (no repository needed)
#   CT_ROOT=<dir>                           audit a different tree (the selftest uses this)
#   CT_RECORDS="a.md b.md"                  override the record document list
#
# EXIT CODES. 0 nothing cited-and-unreachable. 1 the set is non-empty, and every member is named
# with the document and line that cites it. 2 the derivation itself is unsound - too few reachable
# files or no citations found at all - which is the vacuous pass this script refuses to print green
# over. A report that cannot see the suite must not read like a clean suite.

set -uo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${CT_ROOT:-$(cd "$SELF/../.." && pwd)}"
G="$ROOT/gates"

# ── 1. REACHABLE: derived from gates/gates.sh, never from a hand-written list ──────────────────────
# A hand-list is the bug this whole class is made of: gates/unit-drill-why.js sat one directory above
# the only directory that is executed, for 30 days, while a list said it ran.
# STRIP COMMENTS BEFORE READING AN ENTRY POINT, and this is not fussiness: gates/gates.sh carries
# 100+ lines of commentary that NAME files it does not run - "gates/regress/67-sel-cls-consumers.js
# ... absent from it", "gates/.pin-app.js cannot divert the gate", "verify-log.sh:431-440 refuses".
# Matching those made five build-toolchain scripts read as reachable and dropped the leak count from
# 17 to 12 in the wrong direction. A detector that reads a comment as an invocation understates the
# class it exists to count, which is the quietest way for this file to be useless.
decomment(){ sed -e 's/^[[:space:]]*#.*$//' -e 's/[[:space:]]#[[:space:]].*$//' "$1"; }

reachable_seed(){
  local sh="$ROOT/$1"
  [ -r "$sh" ] || return 0
  printf '%s\n' "$1"
  local CODE; CODE="$(mktemp)"; decomment "$sh" > "$CODE"
  # the regress glob at gates.sh:112 is the suite's whole enumeration
  if grep -qE '"\$G"/regress/\*\.js' "$CODE"; then
    local f
    for f in "$G"/regress/*.js; do [ -e "$f" ] && printf '%s\n' "gates/regress/$(basename "$f")"; done
  fi
  # every explicit "$G/<name>.js|.sh" or "gates/<name>.js|.sh" path literal in the entry point
  # (mountcheck, unit-drill-why, gatemanifest.sh ...). Captured by pattern so a new one is free.
  grep -oE '\$G/[A-Za-z0-9._/-]+\.(js|sh)' "$CODE" | sed 's|^\$G/|gates/|' | sort -u
  grep -oE '(^|[^A-Za-z0-9._/-])gates/[A-Za-z0-9._/-]+\.(js|sh)' "$CODE" | grep -oE 'gates/[A-Za-z0-9._/-]+\.(js|sh)' | sort -u
  rm -f "$CODE"
}

# transitive closure over require() for .js and over "$G/x.sh" invocations for .sh.
# WITHOUT THIS THE REPORT IS WRONG IN THE EXPENSIVE DIRECTION: gates/regress/22-engline-recovery.js
# carries require('../engine-extract.js'), so engine-extract.js IS executed by the suite even though
# no glob and no path literal names it. A detector that missed that would file a leak that is not one.
closure(){
  local -A seen=(); local -a queue=(); local p
  while IFS= read -r p; do [ -n "$p" ] && { seen["$p"]=1; queue+=("$p"); }; done
  local i=0
  while [ $i -lt ${#queue[@]} ]; do
    local cur="${queue[$i]}"; i=$((i+1))
    local abs="$ROOT/$cur"; [ -r "$abs" ] || continue
    local dir; dir="$(dirname "$cur")"
    local spec res
    case "$cur" in
      *.js)
        while IFS= read -r spec; do
          case "$spec" in
            ./*|../*) ;;                      # relative only: a bare specifier is a node module
            *) continue;;
          esac
          res="$(norm "$dir/$spec")"
          [ -r "$ROOT/$res" ] || res="$(norm "$dir/$spec.js")"
          [ -r "$ROOT/$res" ] || res="$(norm "$dir/$spec/index.js")"
          [ -r "$ROOT/$res" ] || continue
          case "$res" in gates/*) ;; *) continue;; esac
          [ -n "${seen[$res]:-}" ] && continue
          seen["$res"]=1; queue+=("$res")
        done < <(grep -oE "require\(['\"][^'\"]+['\"]\)" "$abs" | sed -E "s/require\(['\"]//; s/['\"]\)//")
        ;;
      *.sh|*.py)
        while IFS= read -r spec; do
          res="gates/${spec#\$G/}"; res="${res#gates/gates/}"; case "$res" in gates/*) ;; *) res="gates/$res";; esac
          [ -r "$ROOT/$res" ] || continue
          [ -n "${seen[$res]:-}" ] && continue
          seen["$res"]=1; queue+=("$res")
        done < <( { decomment "$abs" | grep -oE '\$G/[A-Za-z0-9._/-]+\.(js|sh)'; decomment "$abs" | grep -oE 'gates/[A-Za-z0-9._/-]+\.(js|sh)'; } | sort -u)
        ;;
    esac
  done
  printf '%s\n' "${!seen[@]}" | sort -u
}

# normalise a/./b and a/../b without touching the filesystem (the fixture trees have no such paths
# on disk until they are resolved, and realpath would resolve against the wrong root).
norm(){ printf '%s\n' "$1" | awk -F/ '{n=0; for(i=1;i<=NF;i++){ if($i=="."||$i==""){continue} else if($i==".."){ if(n>0) n-- } else { a[++n]=$i } } s=""; for(i=1;i<=n;i++) s=s (i>1?"/":"") a[i]; print s}'; }

# ── 2. CITED: every file under gates/ named in a record document ───────────────────────────────────
# Default list. RUN-LOG.md alone is what produced the FIVE, and the claim row that published it says
# five "is itself a floor over one document", so the floor is lifted here by scanning the records that
# actually carry published numbers. The list is overridable so the number can be re-derived narrowly.
default_records(){
  local f
  for f in RUN-LOG.md HANDOFF.md DECISIONS-LOG.md FEEDBACK-INBOX.md claude/PROCESS-LOG.md; do
    [ -r "$ROOT/$f" ] && printf '%s\n' "$f"
  done
  for f in "$ROOT"/claude/stories/*.md; do [ -e "$f" ] && printf '%s\n' "claude/stories/$(basename "$f")"; done
}

main_report(){
  local -a RECS=()
  if [ -n "${CT_RECORDS:-}" ]; then read -r -a RECS <<<"$CT_RECORDS"; else
    while IFS= read -r l; do RECS+=("$l"); done < <(default_records); fi

  local REACH; REACH="$( { reachable_seed gates/gates.sh; } | closure)"
  # TIER 2. The suite is not the only thing that executes a file under gates/. gates/build.sh and
  # deploy.py are the deploy path, and gates/buildnum.sh, held.sh and gatemanifest.sh are reached
  # from there rather than from gates.sh. Reporting those as orphans would overstate the class in
  # the expensive direction - a lane would go admitting a build script to a gate suite. So the
  # headline stays SUITE-UNREACHABLE and the harder subset, reachable from NO entry point at all,
  # is reported separately. The entry list is the only hand-written list in this file and it is
  # printed in the header so it can be argued with.
  local ENTRIES2="gates/gates.sh gates/build.sh deploy.py"
  local REACH2 e; REACH2="$( for e in $ENTRIES2; do reachable_seed "$e"; done | closure)"
  local nreach; nreach="$(printf '%s\n' "$REACH" | grep -c . || true)"

  # citations: "gates/x/y.js" wins; a bare "y.js" resolves only if exactly one file under gates/
  # carries that basename, so an ambiguous bare name is reported as ambiguous rather than guessed.
  local CIT="" ; local rec line tok cand n
  for rec in "${RECS[@]}"; do
    [ -r "$ROOT/$rec" ] || continue
    while IFS= read -r line; do
      local no="${line%%:*}"; local body="${line#*:}"
      while IFS= read -r tok; do
        [ -n "$tok" ] || continue
        case "$tok" in
          gates/*) cand="$tok"; [ -r "$ROOT/$cand" ] || continue;;
          *)
            n="$(cd "$G" 2>/dev/null && find . -name "$tok" -type f 2>/dev/null | wc -l | tr -d ' ')"
            [ "$n" = "1" ] || continue
            cand="gates/$(cd "$G" && find . -name "$tok" -type f | sed 's|^\./||')";;
        esac
        case "$cand" in gates/logs/*) continue;; esac
        CIT+="$cand	$rec:$no"$'\n'
      done < <(printf '%s\n' "$body" | grep -oE '(gates/[A-Za-z0-9._/-]+|[A-Za-z0-9._-]+)\.(js|sh)')
    done < <(grep -nE '\.(js|sh)' "$ROOT/$rec" 2>/dev/null)
  done

  local citfiles; citfiles="$(printf '%s' "$CIT" | awk -F'\t' 'NF{print $1}' | sort -u)"
  local ncit; ncit="$(printf '%s\n' "$citfiles" | grep -c . || true)"

  echo "=== cited-not-run: files under gates/ cited as evidence and reachable by no suite run ==="
  echo "root            $ROOT"
  echo "records scanned ${#RECS[@]}: ${RECS[*]}"
  echo "reachable       $nreach files, derived from gates/gates.sh + require/source closure"
  echo "cited           $ncit distinct files under gates/"
  echo "entry points    $ENTRIES2 (tier 2 only; tier 1 is gates/gates.sh alone)"

  # THE VACUOUS-PASS GUARD. An empty derivation must never print green: that failure mode has already
  # happened once in this project, to a sibling audit script, on its first real run.
  if [ "$nreach" -lt 20 ]; then
    echo "UNSOUND: only $nreach reachable files derived; gates/gates.sh is missing or its enumeration changed shape."
    return 2
  fi
  if [ "$ncit" -lt 1 ]; then
    echo "UNSOUND: no file under gates/ is cited in any scanned record; the citation scan found nothing to compare."
    return 2
  fi

  local leak; leak="$(comm -23 <(printf '%s\n' "$citfiles") <(printf '%s\n' "$REACH" | sort -u))"
  local nleak; nleak="$(printf '%s\n' "$leak" | grep -c . || true)"
  echo "CITED-NOT-RUN   $nleak"
  if [ "$nleak" -eq 0 ]; then echo "GREEN: every cited file under gates/ is reachable by a suite run."; return 0; fi
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    echo "  LEAK $f"
    printf '%s' "$CIT" | awk -F'\t' -v k="$f" 'NF && $1==k {print "       cited at " $2}' | sort -u | head -6
  done <<<"$leak"
  local orphan; orphan="$(comm -23 <(printf '%s\n' "$leak" | grep . | sort -u) <(printf '%s\n' "$REACH2" | sort -u))"
  local norph; norph="$(printf '%s\n' "$orphan" | grep -c . || true)"
  echo "ORPHAN          $norph of the $nleak are reachable from NO entry point ($ENTRIES2):"
  printf '%s\n' "$orphan" | grep . | sed 's/^/  ORPHAN /'
  echo "RED at $nleak. Each file above is quoted as evidence for a published number and no gates.sh invocation can execute it."
  return 1
}

# ── 3. THE CONTROLS. Every detector shown FIRING and SILENT, per R18, on a fixture tree ───────────
selftest(){
  local pass=0 fail=0
  ck(){ local name="$1" want="$2" got="$3"; if [ "$want" = "$got" ]; then pass=$((pass+1)); echo "  ok   $name"; else fail=$((fail+1)); echo "  FAIL $name (want $want, got $got)"; fi; }

  local T; T="$(mktemp -d)"; trap 'rm -rf "$T"' RETURN
  mkdir -p "$T/gates/regress" "$T/gates/audit" "$T/gates/drive" "$T/claude/stories"
  # a gates.sh with the real enumeration shape: the regress glob plus two path literals
  cat > "$T/gates/gates.sh" <<'EOF'
ALLREG=(); for f in "$G"/regress/*.js; do [ -e "$f" ] && ALLREG+=("$f"); done
gates=("$G/mountcheck.js")
UNITJS="$G/unit-drill-why.js"
MANI_OUT="$("$G/gatemanifest.sh" check 2>&1)"
EOF
  : > "$T/gates/mountcheck.js"; : > "$T/gates/unit-drill-why.js"; : > "$T/gates/gatemanifest.sh"
  # 25 reachable regress gates, so the soundness floor of 20 is cleared by the fixture too
  local i; for i in $(seq 1 25); do echo "// gate $i" > "$T/gates/regress/$i-fix.js"; done
  echo "require('../lib.js')"      >> "$T/gates/regress/1-fix.js"   # C4 transitive .js
  echo "require('../drive/play')"  >> "$T/gates/regress/2-fix.js"   # C4b extensionless + dir
  : > "$T/gates/lib.js"; : > "$T/gates/drive/play.js"
  : > "$T/gates/orphan-cited.js"       # C2 cited, unreachable        -> LEAK
  : > "$T/gates/orphan-uncited.js"     # C3 uncited, unreachable      -> silent
  : > "$T/gates/bare-named.js"         # C5 cited by basename only    -> LEAK
  : > "$T/gates/measure-thing.sh"      # C7 a .sh cited, unreachable  -> LEAK
  : > "$T/gates/regress/9-fix.js"
  cat > "$T/RUN-LOG.md" <<'EOF'
ran gates/regress/1-fix.js -> 12 PASS            (C1 reachable+cited, must stay silent)
evidence: gates/orphan-cited.js -> 7 checks      (C2)
evidence: bare-named.js -> 3 checks              (C5, no directory given)
evidence: gates/measure-thing.sh -> 41px         (C7)
evidence: gates/lib.js helper                    (C4, reachable by require)
evidence: gates/drive/play.js                    (C4b)
EOF
  echo "nothing cited here" > "$T/claude/stories/EMPTY.md"

  local out rc
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C0  exit 1 when the set is non-empty"            "1" "$rc"
  ck "C1  a reachable regress gate is NOT a leak"      "0" "$(grep -c 'LEAK gates/regress/1-fix.js' <<<"$out")"
  ck "C2  an unreachable cited .js IS a leak"          "1" "$(grep -c 'LEAK gates/orphan-cited.js' <<<"$out")"
  ck "C3  an unreachable UNCITED file is silent"       "0" "$(grep -c 'orphan-uncited' <<<"$out")"
  ck "C4  a file reachable via require is NOT a leak"  "0" "$(grep -c 'LEAK gates/lib.js' <<<"$out")"
  ck "C4b extensionless require resolves"             "0" "$(grep -c 'LEAK gates/drive/play.js' <<<"$out")"
  ck "C5  a bare basename citation resolves"           "1" "$(grep -c 'LEAK gates/bare-named.js' <<<"$out")"
  ck "C6  mountcheck named by path literal is clear"   "0" "$(grep -c 'LEAK gates/mountcheck.js' <<<"$out")"
  ck "C7  a cited .sh is in scope, not only .js"       "1" "$(grep -c 'LEAK gates/measure-thing.sh' <<<"$out")"
  ck "C8  the count equals the lines printed"          "3" "$(sed -n 's/^CITED-NOT-RUN *//p' <<<"$out")"
  ck "C9  every leak names a citing document and line" "3" "$(grep -c 'cited at RUN-LOG.md:' <<<"$out")"

  # C16/C17: the comment arm. Both directions, because stripping too much is as wrong as too little.
  : > "$T/gates/mentioned-only.js"
  echo "# see gates/mentioned-only.js for the argument" >> "$T/gates/gates.sh"
  echo "evidence: gates/mentioned-only.js -> 9 checks" >> "$T/RUN-LOG.md"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"
  ck "C16 a file named only in a COMMENT is still a leak" "1" "$(grep -c 'LEAK gates/mentioned-only.js' <<<"$out")"
  ck "C17 and a file named on a CODE line is not"         "0" "$(grep -c 'LEAK gates/gatemanifest.sh' <<<"$out")"
  rm -f "$T/gates/mentioned-only.js"
  sed -i '$d' "$T/RUN-LOG.md"

  # the GREEN arm: delete the three leaks and the same tree must pass
  rm -f "$T/gates/orphan-cited.js" "$T/gates/bare-named.js" "$T/gates/measure-thing.sh"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C10 exit 0 once nothing is cited-and-unreachable" "0" "$rc"
  ck "C11 and it says so"                               "1" "$(grep -c '^GREEN' <<<"$out")"

  # the UNSOUND arm. Both guards must fire: this is the control my own sibling script lacked on its
  # first real run, and a green printed over an empty derivation is the worst output this file could have.
  mv "$T/gates/gates.sh" "$T/gates/gates.sh.off"
  out="$(CT_ROOT="$T" CT_RECORDS="RUN-LOG.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C12 exit 2 when the suite cannot be derived"     "2" "$rc"
  ck "C13 and it is not reported as green"             "0" "$(grep -c '^GREEN' <<<"$out")"
  mv "$T/gates/gates.sh.off" "$T/gates/gates.sh"
  echo "no file names here" > "$T/EMPTY-REC.md"
  out="$(CT_ROOT="$T" CT_RECORDS="EMPTY-REC.md" bash "$SELF/cited-not-run.sh" 2>&1)"; rc=$?
  ck "C14 exit 2 when no citation is found at all"     "2" "$rc"
  ck "C15 and the reason names the citation scan"      "1" "$(grep -c 'no file under gates/ is cited' <<<"$out")"

  echo "cited-not-run selftest: $pass pass / $fail fail"
  [ "$fail" -eq 0 ]
}

case "${1:-}" in
  --selftest|selftest) selftest;;
  *) main_report;;
esac
