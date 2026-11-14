#!/usr/bin/env bash
# gates/audit/control-floor.sh [--selftest]  -> THE GATES THAT ARE SHOWN ABLE TO FAIL STAY SHOWN, AS A BINARY.
#
# WHY [#550 helper A; jobs/build-one-door-for-every-non-gate-check-2026-10-10 theFIX part (3), "CONVERT ITS RATCHETS TO BINARIES
# so a standing breach blocks instead of being grandfathered"]. gates/fastgate.sh's `ratchet "control audit"` compares the fault
# COUNTS of gates/control-audit.js at base and head and refuses only a head that is WORSE. That ratchet cannot be turned into a
# binary whole: on 2994c8f the audit reads RED with uncovered=104 of 139, so a binary over it refuses every commit until the
# coverage job is done (records-gate.sh's part (3) comment says so). Two things it lets through today, both measured by reading
# it rather than assumed:
#   (a) A SWAP. A commit that moves gate X out of COVERED while moving gate Y in leaves every count where it was, so the
#       ratchet reads "no worse than base" while X - a gate that WAS shown able to fail - no longer is.
#   (b) A STANDING LOSS. A gate that lost its cover on a commit the fast tier never judged (a full-suite build lands on main
#       through gates.sh, not fastgate) is in the BASE of every later comparison, so the ratchet grandfathers it for ever.
# THIS IS THE PART OF THAT RATCHET THAT CAN BE A BINARY TODAY: the gates the audit reads COVERED or PARTIAL are named in
# gates/control-covered-floor.tsv, and any named gate that the audit, run now, does not read COVERED or PARTIAL refuses - whatever
# the base had and whatever else rose. PARTIAL is held as covered for the reason control-audit.js gives (a partial record is a
# gate that GAINED assertions since its control, every line that control ran still present). The uncovered remainder stays under
# the ratchet until the coverage job turns it green.
#
# WHAT A ROW LEAVING MEANS. A gate leaves the floor only in a commit that deletes its row - for instance because its assertions
# changed and nobody re-ran a control, which is exactly the event this exists to make visible. The row count is pinned too
# (door:control-floor in gates/harness-case-counts.tsv, read by gates/door-checks.sh), so a deleted row also has to lower that pin
# in the same diff. A gate that BECOMES covered and is not on the floor is reported and does not refuse: add its row.
#
# EXIT  0 every floor gate reads COVERED or PARTIAL | 1 one does not, or a row names no gate the audit knows
#       2 could not run: no floor, an empty floor, the audit could not choose a log (its exit 2), the audit is UNDECIDED on a
#         shallow clone (its exit 3), or its output carries no gate rows. None of those is a clearance.
# The count line, read by gates/door-checks.sh: "control-floor: <held> pass / <fell> fail".
# CT_CF_FLOOR overrides the register and CT_CA_SCRIPT the audit script (both for the selftest and for controls).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; G="$(dirname "$HERE")"; ROOT="$(dirname "$G")"

check(){ # check <floor-register> <audit-script>
  ( cd "$ROOT" && CF="$1" CA="$2" node -e '
    const fs=require("fs"),cp=require("child_process");
    let reg;try{reg=fs.readFileSync(process.env.CF,"utf8");}catch(e){console.log("CONTROL FLOOR COULD NOT RUN - the floor "+process.env.CF+" cannot be read");process.exit(2);}
    const floor=[],seen=new Set(),dup=[];
    for(const l of reg.split("\n")){if(!l.trim()||l[0]==="#")continue;const g=l.split("\t")[0].trim();if(seen.has(g))dup.push(g);seen.add(g);floor.push(g);}
    if(!floor.length){console.log("CONTROL FLOOR COULD NOT RUN - the floor names no gate, and an empty floor is not a clearance");process.exit(2);}
    const r=cp.spawnSync("node",[process.env.CA],{encoding:"utf8",maxBuffer:1<<27});
    if(r.status===2||r.status===null){console.log("CONTROL FLOOR COULD NOT RUN - the audit exited "+r.status+" (it could not choose a log): "+String(r.stderr||"").trim().slice(0,200));process.exit(2);}
    if(r.status===3){console.log("CONTROL FLOOR COULD NOT RUN - the audit is UNDECIDED (exit 3: a shallow clone); run git fetch --unshallow");process.exit(2);}
    const verdict={},note={};let cur=null;
    for(const l of String(r.stdout||"").split("\n")){const h=/^--- ([A-Z-]+) \((\d+)\) ---$/.exec(l);if(h){cur=h[1];continue;}
      if(/^SUMMARY/.test(l)){cur=null;continue;}
      const m=/^  (\S+?)\s*(?:\d+ assertions|not in log)\s*(.*)$/.exec(l);if(m&&cur){verdict[m[1]]=cur;note[m[1]]=m[2].slice(0,140);}}
    const known=Object.keys(verdict);
    if(!known.length){console.log("CONTROL FLOOR COULD NOT RUN - the audit printed no gate rows (exit "+r.status+")");process.exit(2);}
    const HELD=new Set(["COVERED","PARTIAL"]);let held=0,fell=0;
    for(const g of dup){fell++;console.log("control-floor: DUPLICATE ROW "+g+" - one row per gate");}
    for(const g of floor){
      if(!(g in verdict)){fell++;console.log("control-floor: ROW NAMES NO GATE "+g+" - the audit has no such gate (renamed or deleted? edit the row in the same commit)");continue;}
      if(HELD.has(verdict[g]))held++;else{fell++;console.log("control-floor: FELL "+g+" now reads "+verdict[g]+" - "+note[g]);}}
    const fresh=known.filter(g=>HELD.has(verdict[g])&&!seen.has(g));
    for(const g of fresh)console.log("control-floor: NOT ON THE FLOOR "+g+" reads "+verdict[g]+" - add its row so it cannot fall unseen (not a refusal)");
    console.log("control-floor: "+held+" pass / "+fell+" fail   ("+floor.length+" floor row(s), "+known.length+" gates audited, "+fresh.length+" covered gate(s) not on the floor)");
    process.exit(fell?1:0);' ); }

selftest(){
  local T ok=0 bad=0; T="$(mktemp -d 2>/dev/null)" || { echo "selftest: no scratch"; return 2; }
  trap 'rm -rf "$T"' RETURN
  chk(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "  ok   $1"; else bad=$((bad+1)); echo "  FAIL $1 (want $2, got $3)"; fi; }
  # a stub audit: the real report's shape (section headers, two-space rows, SUMMARY), with the exit code it is told
  stub(){ # stub <exit> <section:gate>...
    local ex="$1"; shift; { echo 'const L=[];'; echo 'L.push("CONTROL AUDIT   log=x   gates='"$#"'");'
      local s; for s in "$@"; do echo 'L.push("--- '"${s%%:*}"' (1) ---","  '"${s#*:}"'              12 assertions   note for '"${s#*:}"'","");'; done
      echo 'L.push("SUMMARY  stub");console.log(L.join("\n"));process.exitCode='"$ex"';'; } > "$T/ca.js"; }
  fl(){ printf '# gate\tnote\n' > "$T/floor"; local g; for g in "$@"; do printf '%s\tn\n' "$g" >> "$T/floor"; done; }
  rr(){ check "${2:-$T/floor}" "${3:-$T/ca.js}" > "$T/last" 2>&1; echo $?; }
  stub 1 COVERED:a PARTIAL:b NONE:c; fl a b
  chk "F1 every floor gate COVERED or PARTIAL: 0 (the audit itself exits 1, which is not this check's verdict)" 0 "$(rr)"
  chk "F1b and the count line reads 2 pass / 0 fail" 1 "$(grep -c '^control-floor: 2 pass / 0 fail' "$T/last")"
  stub 1 ASSERTIONS-MOVED:a PARTIAL:b COVERED:c; fl a b
  chk "F2 a floor gate that fell to ASSERTIONS-MOVED refuses: 1 - although c rose, so the counts are a swap the ratchet passes" 1 "$(rr)"
  chk "F2b and the refusal names that gate and its verdict" 1 "$(grep -c '^control-floor: FELL a now reads ASSERTIONS-MOVED' "$T/last")"
  chk "F2c and c, covered and not on the floor, is reported and not refused" 1 "$(grep -c '^control-floor: NOT ON THE FLOOR c reads COVERED' "$T/last")"
  stub 1 COVERED:a; fl a gone
  chk "F3 a row naming a gate the audit does not know refuses: 1" 1 "$(rr)"
  chk "F3b and says so" 1 "$(grep -c '^control-floor: ROW NAMES NO GATE gone' "$T/last")"
  stub 1 COVERED:a; fl a a
  chk "F4 a duplicated row refuses: 1" 1 "$(rr)"
  stub 2 COVERED:a; fl a
  chk "F5 the audit could not choose a log (exit 2): 2, never a clearance" 2 "$(rr)"
  stub 3 COVERED:a; fl a
  chk "F6 the audit is UNDECIDED on a shallow clone (exit 3): 2" 2 "$(rr)"
  printf 'console.log("SUMMARY  0 covered, of 59 gates")\n' > "$T/ca.js"; fl a
  chk "F7 an audit that prints no gate rows (the control-audit-selftest stub): 2" 2 "$(rr)"
  stub 1 COVERED:a; fl
  chk "F8 an empty floor: 2, not a clearance" 2 "$(rr)"
  chk "F9 an unreadable floor: 2" 2 "$(rr "$T/no-such-floor")"
  stub 1 COVERED:a NO-LOG:b UNPARSABLE:c BAD-RECORD:d DIRTY:e NO-RED:f NONE:g; fl a b c d e f g
  chk "F10 every verdict but COVERED and PARTIAL refuses: 1" 1 "$(rr)"
  chk "F10b and all six fell: 1 pass / 6 fail" 1 "$(grep -c '^control-floor: 1 pass / 6 fail' "$T/last")"
  # F11 THE LIVE FLOOR: it parses, names at least one gate, and every row's gate file exists
  local miss=0 n=0 g; while IFS=$'\t' read -r g _; do [ -n "$g" ] && [ "${g:0:1}" != "#" ] || continue; n=$((n+1))
    if [ "$g" = mountcheck ]; then [ -f "$G/mountcheck.js" ] || miss=$((miss+1)); else [ -f "$G/regress/$g.js" ] || miss=$((miss+1)); fi; done < "$G/control-covered-floor.tsv"
  chk "F11 the live floor names gates ($n rows) and every one has a gate file" "yes 0" "$([ "$n" -gt 0 ] && echo yes || echo no) $miss"
  # F12 THE CHECK WITH ITS SUBJECT REMOVED: a copy of this file whose held test is defanged (every verdict held) must fail
  # F2 - so this selftest is shown able to fail on the one comparison the file exists for.
  sed 's/if(HELD.has(verdict\[g\]))held++;/if(true)held++;/' "${BASH_SOURCE[0]}" > "$T/defanged.sh"
  if cmp -s "${BASH_SOURCE[0]}" "$T/defanged.sh"; then chk "F12 the defang edit applied" applied missed
  else stub 1 ASSERTIONS-MOVED:a; fl a; chk "F12 control: with the held test defanged, a fallen gate PASSES (exit 0) - the arm F2 is what catches it" 0 "$(bash "$T/defanged.sh" --check "$T/floor" "$T/ca.js" >/dev/null 2>&1; echo $?)"; fi
  echo "control-floor selftest: $ok pass / $bad fail"; [ "$bad" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  --check)    check "$2" "$3"; exit $? ;;   # explicit inputs, for the selftest's defanged copy
  "")         check "${CT_CF_FLOOR:-$G/control-covered-floor.tsv}" "${CT_CA_SCRIPT:-$G/control-audit.js}"; exit $? ;;
  *)          echo "usage: gates/audit/control-floor.sh [--selftest]"; exit 2 ;;
esac
