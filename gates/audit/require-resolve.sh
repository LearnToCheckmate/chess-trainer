#!/usr/bin/env bash
# gates/audit/require-resolve.sh   jobs/gate-19-requires-an-absolute-path-that-exists-only-in-the-build-lanes-container-2026-10-07
#
# ONE QUESTION: can every require() a REQUIRED GATE makes be resolved from a clone at an ARBITRARY filesystem
# location? Nothing in this project asked it until 2026-10-08, and the cost of not asking was 86 minutes of a
# nightly fire plus a suite that was unpassable outside one container.
#
# WHY IT IS NOT gates/gatemanifest.sh's JOB AND WHY IT IS NOT COVERED BY WHAT WE HAVE. gatemanifest.sh check
# asks whether the gate FILE is present; the gate anchor asks whether its assertions vanished or weakened.
# Both ask about the file and neither asks whether what the file requires can be found. That is the vocabulary
# gap #489's antagonist named on gates/fastgate.sh - "the check and the thing being checked written in one
# vocabulary" - wearing a second costume: the manifest is written in filenames and gates reach their
# dependencies through require().
#
# THE TWO FAILURE CLASSES, SEPARATED BECAUSE THEY HAVE DIFFERENT REMEDIES.
#   ABS  a static require() spec beginning with "/". Container-dependent BY CONSTRUCTION, and therefore a FAIL
#        EVEN WHERE IT RESOLVES ON THIS MACHINE - which is the whole point. Resolving here is exactly what hid
#        gate 19 for five days: it resolved in the one container that ran it. Remedy: derive from __dirname.
#   MISS a relative spec ("./x", "../lib") that does not resolve from the gate's own directory. A real broken
#        dependency. Remedy: fix the path.
# AND ONE CLASS DELIBERATELY NOT FAILED, with its count printed rather than swallowed:
#   PKG  a bare spec ("puppeteer"). Unresolvable means node_modules is not installed, which is an install
#        question and not a path-portability one. Counted and named, never failed, never silently dropped.
#   DYN  require(VARIABLE) or require(expr) - no string literal to read. NOT CHECKED, counted, and printed with
#        the file and line, because a count of 0 here is the difference between "all requires are static" and
#        "this tool cannot see them".
#
# THE VACUITY GUARD, because every arm below reasons over a set a parse produced and every() over nothing is
# true. If the manifest cannot be read, or zero required gates are examined, the verdict is NOT CHECKED at
# exit 2 with both counts printed. It is never PASS.
#
# WHAT THIS DOES NOT DO, said here rather than discovered later. It reads the gate's own source only: a
# dependency required by something the gate requires is not followed (depth 1). It strips a require() on a line
# whose first non-space characters are "//" but does not parse block comments, so a require() inside a /* */
# block counts as code - which errs toward reporting rather than toward green. It does not execute the gate.
#
# USAGE
#   gates/audit/require-resolve.sh [repo-dir]     repo-dir defaults to the git toplevel
#   gates/audit/require-resolve.sh --selftest     both-direction controls over planted fixtures
# EXIT 0 clean, 1 at least one ABS or MISS, 2 NOT CHECKED (nothing examined / manifest unreadable / bad path).

set -uo pipefail

SCAN_JS='
const fs=require("fs"),path=require("path");
// argv, AND THIS WAS A REAL BUG CAUGHT BY AN ACCOUNTING LINE AND NOT BY READING. With `node -e <script> --
// a b`, node does NOT put the script in argv[1], so slice(2) silently dropped the FIRST gate: the report
// said "57 present on disk" and the counts said files:56, one gate never scanned and a green verdict over
// it. The two numbers disagreeing is the only reason it was found, which is why scan_repo now REFUSES on a
// mismatch instead of printing both and carrying on.
const files=process.argv.slice(1).filter(a=>a!=="--"&&/\.js$/.test(a));
let abs=0,miss=0,pkg=0,dyn=0,ok=0;
const lines=[];
for(const f of files){
  let src;
  try{ src=fs.readFileSync(f,"utf8"); }catch(e){ lines.push(["MISS",f,0,"(unreadable)",e.code||"read error"]); miss++; continue; }
  const dir=path.dirname(path.resolve(f));
  src.split(/\n/).forEach((line,i)=>{
    if(/^\s*\/\//.test(line)) return;                 // whole-line comment
    const re=/require(?:\.resolve)?\s*\(\s*([^)]*?)\s*\)/g;
    let m;
    while((m=re.exec(line))!==null){
      const arg=m[1];
      const lit=arg.match(/^[\x27"]([^\x27"]+)[\x27"]$/);
      if(!lit){ dyn++; lines.push(["DYN",f,i+1,arg.slice(0,60),"no string literal to resolve"]); continue; }
      const spec=lit[1];
      if(spec.startsWith("/")){ abs++; lines.push(["ABS",f,i+1,spec,"absolute path: resolves in one container only"]); continue; }
      if(!spec.startsWith(".")){
        try{ require.resolve(spec,{paths:[dir]}); ok++; }
        catch(e){ pkg++; lines.push(["PKG",f,i+1,spec,"bare spec did not resolve (node_modules?)"]); }
        continue;
      }
      try{ require.resolve(spec,{paths:[dir]}); ok++; }
      catch(e){ miss++; lines.push(["MISS",f,i+1,spec,"relative spec does not resolve from the gate dir"]); }
    }
  });
}
for(const l of lines) console.log(l[0]+"\t"+l[1]+":"+l[2]+"\t"+l[3]+"\t"+l[4]);
console.log("COUNTS\t"+JSON.stringify({files:files.length,resolved:ok,abs,miss,pkg,dyn}));
'

scan_repo() {   # $1 = repo dir ; prints report ; returns 0 clean / 1 fail / 2 not checked
  local repo="$1"
  if [ ! -d "$repo" ]; then
    echo "NOT CHECKED: not a directory: $repo"; return 2
  fi
  local mani="$repo/gates/gate-manifest.tsv"
  if [ ! -r "$mani" ]; then
    echo "NOT CHECKED: gates/gate-manifest.tsv is not readable under $repo"; return 2
  fi
  local names
  names="$(awk -F'\t' '$2=="required"{print $1}' "$mani")"
  local -a gates=() missing=()
  local n
  while IFS= read -r n; do
    [ -z "$n" ] && continue
    if [ -f "$repo/gates/regress/$n" ]; then gates+=("$repo/gates/regress/$n"); else missing+=("$n"); fi
  done <<< "$names"
  local listed=0
  listed="$(printf '%s\n' "$names" | grep -c . || true)"
  echo "MANIFEST: $listed required gate(s) listed, ${#gates[@]} present on disk, ${#missing[@]} listed-but-absent"
  if [ "${#missing[@]}" -gt 0 ]; then printf 'ABSENT\t%s\n' "${missing[@]}"; fi
  if [ "${#gates[@]}" -eq 0 ]; then
    echo "NOT CHECKED: zero required gates were examined (listed $listed). A verdict over an empty set is not a verdict."
    return 2
  fi
  local out
  out="$(node -e "$SCAN_JS" -- "${gates[@]}" 2>&1)" || { echo "NOT CHECKED: the scanner itself failed"; echo "$out"; return 2; }
  echo "$out" | grep -v '^COUNTS' || true
  local counts; counts="$(echo "$out" | sed -n 's/^COUNTS\t//p')"
  echo "COUNTS: $counts"
  # ACCOUNTING GUARD. The number of files the scanner says it read must equal the number handed to it. A
  # mismatch means the verdict covers fewer gates than the report claims, which is how the argv bug above hid.
  local scanned; scanned="$(echo "$counts" | sed -n 's/.*"files":\([0-9]*\).*/\1/p')"
  if [ "${scanned:-0}" != "${#gates[@]}" ]; then
    echo "NOT CHECKED: the scanner read ${scanned:-0} file(s) but ${#gates[@]} were handed to it. A verdict over a different set than the one reported is not a verdict."
    return 2
  fi
  local a m
  a="$(echo "$counts" | sed -n 's/.*"abs":\([0-9]*\).*/\1/p')"
  m="$(echo "$counts" | sed -n 's/.*"miss":\([0-9]*\).*/\1/p')"
  if [ "${a:-0}" -gt 0 ] || [ "${m:-0}" -gt 0 ]; then
    echo "VERDICT: REQUIRE-RESOLVE RED - ${a:-0} absolute and ${m:-0} unresolvable require(s) in required gates"
    return 1
  fi
  echo "VERDICT: REQUIRE-RESOLVE OK - every static require() in every required gate resolves from the gate's own directory and none is absolute"
  return 0
}

# ---------------------------------------------------------------- selftest
C_PASS=0; C_FAIL=0
ck() { # ck <name> <expected-exit> <actual-exit> [extra condition description:result]
  if [ "$2" = "$3" ]; then echo "PASS $1 (exit $3)"; C_PASS=$((C_PASS+1));
  else echo "FAIL $1 (expected exit $2, got $3)"; C_FAIL=$((C_FAIL+1)); fi
}
ckgrep() { # ckgrep <name> <pattern> <file> <want: yes|no>
  if grep -q -- "$2" "$3"; then got=yes; else got=no; fi
  if [ "$got" = "$4" ]; then echo "PASS $1 ($2 $got)"; C_PASS=$((C_PASS+1));
  else echo "FAIL $1 (wanted $2 $4, got $got)"; C_FAIL=$((C_FAIL+1)); fi
}

mkfix() { # mkfix <dir>  : a minimal repo with a manifest and a lib
  local d="$1"
  mkdir -p "$d/gates/regress"
  printf 'module.exports={ok:1};\n' > "$d/gates/lib.js"
  : > "$d/gates/gate-manifest.tsv"
}
addgate() { # addgate <dir> <name> <body> <required|optional>
  printf '%s\n' "$3" > "$1/gates/regress/$2"
  printf '%s\t%s\t#0\t2026-10-08\tselftest\tfixture\tfixture\n' "$2" "$4" >> "$1/gates/gate-manifest.tsv"
}

selftest() {
  local T; T="$(mktemp -d)"; trap 'rm -rf "$T"' RETURN
  local o="$T/out"

  # C1/C2  THE FIRING ARM FIRST. An absolute require in a required gate must go RED and must name the gate.
  mkfix "$T/r1"
  addgate "$T/r1" 01-abs.js "const L=require('/home/user/chess-trainer/gates/lib');" required
  scan_repo "$T/r1" > "$o" 2>&1; ck C1-absolute-require-is-RED 1 $?
  ckgrep C2-the-message-names-the-gate-and-the-path "01-abs.js" "$o" yes
  ckgrep C2b-the-message-classifies-it-ABS "^ABS" "$o" yes
  ckgrep C2c-RED-is-not-accompanied-by-an-OK-line "REQUIRE-RESOLVE OK" "$o" no

  # C3/C4  AND THE SAME ABSOLUTE PATH IS STILL RED WHEN IT DOES RESOLVE. This is the control that makes the
  #        tool worth having: gate 19 resolved for five days in the one container that ran it.
  mkfix "$T/r2"
  addgate "$T/r2" 02-abs-resolves.js "const L=require('$T/r2/gates/lib.js');" required
  scan_repo "$T/r2" > "$o" 2>&1; ck C3-absolute-that-DOES-resolve-is-still-RED 1 $?
  ckgrep C4-and-is-classified-ABS-not-resolved "^ABS" "$o" yes

  # C5/C6  THE SILENT ARM. A clean relative require must be OK and must say so.
  mkfix "$T/r3"
  addgate "$T/r3" 03-clean.js "const L=require('../lib');" required
  scan_repo "$T/r3" > "$o" 2>&1; ck C5-clean-relative-require-is-GREEN 0 $?
  ckgrep C6-green-prints-the-OK-verdict "REQUIRE-RESOLVE OK" "$o" yes

  # C7/C8  A BROKEN RELATIVE PATH IS A DIFFERENT CLASS AND MUST BE RED AS MISS, NOT AS ABS.
  mkfix "$T/r4"
  addgate "$T/r4" 04-missing.js "const L=require('../nope-not-here');" required
  scan_repo "$T/r4" > "$o" 2>&1; ck C7-unresolvable-relative-require-is-RED 1 $?
  ckgrep C8-classified-MISS-and-not-ABS "^MISS" "$o" yes

  # C9/C10 A require() MENTIONED IN A COMMENT MUST NOT FIRE. Without this the tool would go red on its own
  #        explanatory comments, and on gate 19's new comment block, which quotes the old absolute path.
  mkfix "$T/r5"
  addgate "$T/r5" 05-comment.js "// const L=require('/home/user/chess-trainer/gates/lib');
const L=require('../lib');" required
  scan_repo "$T/r5" > "$o" 2>&1; ck C9-commented-out-absolute-require-does-not-fire 0 $?
  ckgrep C10-and-nothing-is-classified-ABS "^ABS" "$o" no

  # C11/C12 AN OPTIONAL (not required) GATE IS OUT OF SCOPE AND MUST NOT FIRE.
  mkfix "$T/r6"
  addgate "$T/r6" 06-clean.js "const L=require('../lib');" required
  addgate "$T/r6" 07-abs-optional.js "const L=require('/home/user/chess-trainer/gates/lib');" optional
  scan_repo "$T/r6" > "$o" 2>&1; ck C11-an-optional-gate-is-out-of-scope 0 $?
  ckgrep C12-and-the-optional-gate-is-not-reported "07-abs-optional.js" "$o" no

  # C13/C14 THE VACUITY GUARD. A manifest with no required rows must be NOT CHECKED at exit 2, never PASS.
  mkfix "$T/r7"
  addgate "$T/r7" 08-opt.js "const L=require('../lib');" optional
  scan_repo "$T/r7" > "$o" 2>&1; ck C13-no-required-gates-is-NOT-CHECKED-exit-2 2 $?
  ckgrep C14-and-does-not-print-a-green-verdict "REQUIRE-RESOLVE OK" "$o" no

  # C15/C16 AND A LISTED-BUT-ABSENT GATE IS REPORTED RATHER THAN COUNTED AS CLEAN.
  mkfix "$T/r8"
  addgate "$T/r8" 09-clean.js "const L=require('../lib');" required
  printf '99-does-not-exist.js\trequired\t#0\t2026-10-08\tselftest\tfixture\tfixture\n' >> "$T/r8/gates/gate-manifest.tsv"
  scan_repo "$T/r8" > "$o" 2>&1; ck C15-a-listed-but-absent-gate-does-not-make-the-run-red 0 $?
  ckgrep C16-but-it-IS-named-in-the-report "99-does-not-exist.js" "$o" yes

  # C17/C18 A DYNAMIC require IS NOT CHECKED AND IS COUNTED, NOT SWALLOWED.
  mkfix "$T/r9"
  addgate "$T/r9" 10-dyn.js "const p='../lib';const L=require(p);" required
  scan_repo "$T/r9" > "$o" 2>&1; ck C17-a-dynamic-require-does-not-make-the-run-red 0 $?
  ckgrep C18-but-is-reported-DYN "^DYN" "$o" yes

  # C19/C20 A MISSING OR UNREADABLE MANIFEST IS NOT CHECKED, NOT GREEN.
  rm -rf "$T/r10"; mkdir -p "$T/r10/gates/regress"
  scan_repo "$T/r10" > "$o" 2>&1; ck C19-no-manifest-is-NOT-CHECKED-exit-2 2 $?
  scan_repo "$T/does-not-exist" > "$o" 2>&1; ck C20-a-bad-repo-path-is-NOT-CHECKED-exit-2 2 $?

  # C21/C22 THE MUTATION CONTROL ON THIS TOOL'S OWN SUBJECT: the real repository must be GREEN now and the
  #         same scan over a tree with gate 19's old absolute path restored must be RED. Without the second
  #         half, a green reading here is unfalsifiable.
  local REPO; REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  scan_repo "$REPO" > "$o" 2>&1; ck C21-this-repository-is-GREEN-as-it-stands 0 $?
  local M="$T/mut"; mkdir -p "$M"
  cp -r "$REPO/gates" "$M/gates" 2>/dev/null
  if [ -f "$M/gates/regress/19-review-grade-counts.js" ]; then
    sed -i "s#require(LESSONS_JS)#require('/home/user/chess-trainer/lessons.js')#" "$M/gates/regress/19-review-grade-counts.js"
    scan_repo "$M" > "$o" 2>&1; ck C22-restoring-gate-19s-absolute-path-turns-it-RED 1 $?
  else
    echo "FAIL C22-restoring-gate-19s-absolute-path-turns-it-RED (fixture not found)"; C_FAIL=$((C_FAIL+1))
  fi

  # C23/C24 THE ACCOUNTING GUARD ITSELF, driven rather than asserted: a scanner that reads fewer files than it
  #         was handed must make the run NOT CHECKED. Driven by listing a required gate whose name the .js
  #         filter rejects, so handed (2) != read (1).
  mkfix "$T/r11"
  addgate "$T/r11" 11-clean.js "const L=require('../lib');" required
  printf '12-not-js.txt\trequired\t#0\t2026-10-08\tselftest\tfixture\tfixture\n' >> "$T/r11/gates/gate-manifest.tsv"
  printf 'const L=require("../lib");\n' > "$T/r11/gates/regress/12-not-js.txt"
  scan_repo "$T/r11" > "$o" 2>&1; ck C23-handed-two-read-one-is-NOT-CHECKED-exit-2 2 $?
  ckgrep C24-and-says-both-numbers "handed to it" "$o" yes

  # C25 AND THE SAME TREE WITH BOTH FILES READABLE IS GREEN, so C23 is not green-by-accident.
  mkfix "$T/r12"
  addgate "$T/r12" 13-clean.js "const L=require('../lib');" required
  addgate "$T/r12" 14-clean.js "const L=require('../lib');" required
  scan_repo "$T/r12" > "$o" 2>&1; ck C25-two-readable-gates-is-GREEN 0 $?

  echo "SELFTEST: $C_PASS pass, $C_FAIL fail"
  [ "$C_FAIL" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  -h|--help) sed -n '2,40p' "$0"; exit 0 ;;
  "") R="$(git rev-parse --show-toplevel 2>/dev/null || pwd)" ;;
  *)  R="$1" ;;
esac
scan_repo "$R"
exit $?
