#!/usr/bin/env bash
# gates/audit/observed-inputs.sh - DOES gates/lib.js SEE EVERY FIXTURE A GATE READS, HOWEVER THE PATH IS SPELLED?
#
# WHY THIS EXISTS [#545, item (29); jobs/the-premise-checks-read-the-gates-source-instead-of-asking-them-to-declare-
# their-inputs-2026-10-07]. gates/fastgate.sh finds a gate's inputs by PARSING its source, and has been out-grammared
# three times. gates/lib.js now OBSERVES them instead (see OBSERVED INPUTS in its header) and prints the set at
# done(). This is that observer's control, TC-FG-004's four shapes plus two: it builds a throwaway tree holding a
# copy of THIS repo's gates/lib.js, a probe gate under gates/regress/ and six fixtures under claude/, has the probe
# read each fixture a different way, and asserts the printed set names all six.
#
#   O1 path.join with a VARIABLE first segment       O4 a process.env default pointing into claude/
#   O2 fs.readFileSync of a template literal          O5 fs.readdirSync of a fixture directory
#   O3 __dirname + '...' string concatenation         O6 a local module loaded with require()
#   O0 the probe ran and printed the inputs line at all (an absent line is NOT CHECKED, never a pass)
#   ON negative control: a probe that reads nothing must yield a set naming none of the six
# Every one of O1..O4 is a shape the source parser in gates/fastgate.sh does not model (the job's
# measuredResidualsTHATREMAINOPEN), which is the point.
# USAGE  bash gates/audit/observed-inputs.sh --selftest     exit 0 all hold, 1 any fails, 2 no scratch
set -uo pipefail
ROOTD="$(cd "$(dirname "$0")/../.." && pwd)"

selftest(){
  local T pass=0 fail=0 out
  T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  mkdir -p "$T/gates/regress" "$T/claude/fx/dir"
  cp "$ROOTD/gates/lib.js" "$T/gates/lib.js"
  for f in a b c d; do echo "$f" > "$T/claude/fx/$f.txt"; done
  echo e > "$T/claude/fx/dir/e.txt"
  echo "module.exports=1;" > "$T/claude/fx/mod.js"
  cat > "$T/gates/regress/probe.js" <<'JS'
const L=require('../lib');const fs=require('fs'),path=require('path');
if(!process.env.PROBE_NOTHING){
  const D=path.join(__dirname,'..','..','claude','fx'); fs.readFileSync(path.join(D,'a.txt'),'utf8');
  fs.readFileSync(`${__dirname}/../../claude/fx/b.txt`,'utf8');
  fs.readFileSync(__dirname+'/../../claude/fx/c.txt','utf8');
  fs.readFileSync(process.env.CT_PROBE_FIX||path.resolve(__dirname,'../../claude/fx/d.txt'),'utf8');
  fs.readdirSync(path.join(D,'dir'));
  require('../../claude/fx/mod.js');
}
L.done('probe');
JS
  ck(){ if eval "$2"; then echo "  ok   $1"; pass=$((pass+1)); else echo "  FAIL $1"; fail=$((fail+1)); fi; }
  out="$(cd "$T" && node gates/regress/probe.js 2>&1)"
  local line; line="$(grep 'inputs observed' <<<"$out" || true)"
  ck "O0 the probe printed its inputs line (absent = not checked, never a pass)" '[ -n "$line" ]'
  ck "O1 path.join with a variable first segment: claude/fx/a.txt" 'grep -q "claude/fx/a.txt" <<<"$line"'
  ck "O2 a template literal: claude/fx/b.txt" 'grep -q "claude/fx/b.txt" <<<"$line"'
  ck "O3 __dirname concatenation: claude/fx/c.txt" 'grep -q "claude/fx/c.txt" <<<"$line"'
  ck "O4 a process.env default: claude/fx/d.txt" 'grep -q "claude/fx/d.txt" <<<"$line"'
  ck "O5 readdirSync of a fixture directory: claude/fx/dir" 'grep -q "claude/fx/dir" <<<"$line"'
  ck "O6 a local module via require(): claude/fx/mod.js" 'grep -q "claude/fx/mod.js" <<<"$line"'
  out="$(cd "$T" && PROBE_NOTHING=1 node gates/regress/probe.js 2>&1)"
  line="$(grep 'inputs observed' <<<"$out" || true)"
  ck "ON negative control: a probe that reads nothing names none of the six (and still prints the line)" '[ -n "$line" ] && ! grep -q "claude/fx/" <<<"$line"'
  echo "observed-inputs selftest: $pass pass / $fail fail"; [ "$fail" -eq 0 ]
}
case "${1:-}" in --selftest) selftest; exit $? ;; *) echo "usage: $0 --selftest"; exit 2 ;; esac
