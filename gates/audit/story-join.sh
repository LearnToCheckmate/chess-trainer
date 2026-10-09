#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────────────────────────
# gates/audit/story-join.sh - IS A STORY WITH NO CASES REALLY UNCOVERED, OR JUST UNREADABLE?
#
# WHY THIS EXISTS. gates/verify-log.sh --citations arm (5) prints a list it calls STORY AT ZERO
# CASES and ratchets its length at A5ZCEIL. Arm (5) builds that list from ONE predicate, and the
# predicate is narrow by construction: it harvests `US-` tokens from CELL 2 of lines matching
# `^\|[ \t]*TC-` inside a table whose header carries a column literally named `story`. A case
# written in ANY other shape - a prose block, a whitespace-separated line, a row in a table with no
# story column, or a row whose story cell has been shifted out of position by an unescaped pipe -
# contributes nothing. The story then reads as having no test when it has one.
#
# THAT IS NOT A HYPOTHESIS. It is the defect
# jobs/register-join-and-input-count-wrong-2026-09-28 was filed about on 2026-09-28, where the Home
# table's missing story column put two stories on the list; and it is the mechanism
# jobs/nothing-in-the-push-path-runs-verify-log-sh-citations-...-2026-10-07 names as the SECOND
# ceiling at risk, because an unescaped pipe shifts the story cell that arm (5) joins on.
#
# SO THIS IS A COMPARATOR, NOT A SECOND REVIEWER [R47]. It re-implements arm (5)'s predicate
# EXACTLY, derives a WIDE predicate beside it, and reports the DIFFERENCE. The ground truth was
# always in our hands: the case text names its story. Nothing read it.
#
#   ARM5   a story is covered if arm (5)'s own predicate says so. Re-implemented here line for line.
#   WIDE   a story is covered if ANY line of the case register names BOTH that story and a `TC-` id.
#          The `TC-` id is load-bearing: it is what distinguishes a CASE naming its story from a
#          passing mention of the story in a paragraph. C4 controls that distinction in both
#          directions, because without it this script would report every story as covered and read
#          as good news.
#
#   GENUINE ORPHAN   on arm (5)'s list AND not covered under WIDE.  A real gap. RATCHETED.
#   JOIN FAILURE     on arm (5)'s list AND covered under WIDE.      A register the tool cannot read.
#
# WHAT THE RATCHET IS ON, AND WHY IT IS NOT ON THE LIST ARM 5 ALREADY RATCHETS. A5ZCEIL caps the
# length of a list that mixes the two. A ceiling over a mixed population is satisfied by writing a
# case for whichever member is cheapest, and it is RAISED - which is the obvious response to a
# breach - without anybody learning that the real gaps were never the reason it was full. This
# ratchet is on GENUINE ORPHANS only, so it cannot be satisfied by bookkeeping and cannot be relieved
# by raising a number that describes something else.
#
# USAGE
#   bash gates/audit/story-join.sh              report; exit 0 CLEAN, 2 REFUSED or NOT CHECKED
#   bash gates/audit/story-join.sh --selftest   the controls; exit 0 all pass, 1 any fail
#
# OVERRIDES, used by the selftest and by nothing else
#   CT_ROOT=<dir>      the tree to read                      (default: .)
#   CT_STORIES=<path>  relative to CT_ROOT                   (default: claude/stories/USER-STORIES.md)
#   CT_CASES=<path>    relative to CT_ROOT                   (default: claude/stories/TEST-CASES.md)
#   CT_GCEIL=<n>       the genuine-orphan ceiling            (default: G_CEIL below)
#   CT_CROSS=0|1       cross-check against arm (5) itself    (default: 1 when gates/verify-log.sh
#                      exists in CT_ROOT, else 0 - fixture trees self-select out)
#
# NO PIPE UNDER pipefail CONSUMES PART OF ITS PRODUCER'S OUTPUT ANYWHERE IN THIS FILE. That is the
# class gates/audit/pipefail-grep.sh exists to scan for; `grep -q`, `grep -m1` and `head` are not
# used on the output of anything that could be large.
# ──────────────────────────────────────────────────────────────────────────────────────────────────
set -uo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── THE COMMITTED CEILING ────────────────────────────────────────────────────────────────────────
# 1, and the one member is US-INV-04, the cross-app invariant that has had no case since
# 2026-09-15. It is named rather than merely counted, because a ceiling of 1 with no name is
# satisfied by ANY single orphan and would let the real one be swapped out silently.
G_CEIL=1
G_NAMED="US-INV-04"

ROOT="${CT_ROOT:-.}"
SF="${CT_STORIES:-claude/stories/USER-STORIES.md}"
CF="${CT_CASES:-claude/stories/TEST-CASES.md}"
GCEIL="${CT_GCEIL:-$G_CEIL}"

derive(){
  # One awk over both registers. Field 1 is a tag so the shell never has to parse prose.
  awk '
    function trim(s){ gsub(/^[ \t]+|[ \t]+$/,"",s); return s }
    # ncell: split a markdown row into cells on UNESCAPED pipes only. This is arm (5)s own
    # convention and the whole reason an unescaped pipe is a defect rather than a typo.
    function ncell(line,C,  i,n,ch,cur,prev){
      n=0; cur=""; prev=""
      for(i=2;i<=length(line);i++){
        ch=substr(line,i,1)
        if(ch=="|" && prev!="\\"){ C[++n]=cur; cur="" } else { cur=cur ch }
        prev=ch
      }
      if(trim(cur)!="") C[++n]=cur
      return n
    }
    # flush: a completed block. If it names a TC- id AND one or more US- ids, every one of those
    # stories has a case in this register, wherever arm (5) can or cannot read it.
    function flush(blk,ln,  t,tc,m,u){
      if (blk=="") return
      if (blk !~ /TC-[A-Za-z0-9-]+/ || blk !~ /US-[A-Za-z0-9-]+/) return
      t=blk; match(t,/TC-[A-Za-z0-9-]+/); tc=substr(t,RSTART,RLENGTH)
      m=blk
      while (match(m,/US-[A-Za-z0-9-]+/)){ u=substr(m,RSTART,RLENGTH)
        if(!(u in wide)) wide[u]=ln "\t" tc
        widen[u]++
        m=substr(m,RSTART+RLENGTH) }
    }
    FNR==1 { fi++ }
    fi==1 {                                            # USER-STORIES.md
      if ($0 ~ /^### US-/){ id=$0; sub(/^### /,"",id); sub(/[^A-Za-z0-9-].*$/,"",id)
                            if(!(id in seen)){ seen[id]=1; so[++sn]=id } }
      next
    }
    {                                                  # TEST-CASES.md
      L[++n]=$0
      # WIDE IS BLOCK-SCOPED, AND THE FIRST DRAFT OF THIS FILE GOT IT WRONG. It was LINE-scoped,
      # and against the real register that under-reported by one and made the ratchet refuse on a
      # story that has two cases: US-GL-01 is cited in the gallery section as
      #     **TC-GL-001 - ... every card
      #     fits at 320 and 375 ...** US-GL-01.
      # so the TC- id and the US- id sit on DIFFERENT LINES of one case block, and a line-scoped
      # predicate called it a genuine orphan. A ratchet that refuses on a false positive is the
      # brittle-literal failure this project has already paid for in the ICON_PIN of gate 26 and the
      # line numbers of gate 47, so the wrong predicate is recorded here rather than quietly replaced.
      #
      # THE BLOCK IS THE HONEST UNIT, and the two kinds of block are deliberately different:
      #   a line beginning with | is ITS OWN block. A markdown table has no blank lines in it, so
      #     paragraph scope over a table would pair row 1s TC- id with row 5s story and report
      #     coverage that nobody wrote. C12b controls exactly that.
      #   every other line accumulates into a paragraph block, ended by a blank line or by the
      #     next pipe line. C12 controls the split-across-lines case this was written for.
      if ($0 ~ /^\|/){ flush(prevblk,prevln); prevblk=""; flush($0,FNR) }
      else if ($0 ~ /^[ \t]*$/){ flush(prevblk,prevln); prevblk="" }
      else { if(prevblk==""){ prevln=FNR }; prevblk=prevblk " " $0 }
      if ($0 ~ /^\|[ \t]*TC-/) tcrows++
      next
    }
    END {
      flush(prevblk,prevln)                            # the last block, if the file does not end blank
      # ARM5: replicated line for line from gates/verify-log.sh --citations arm (5).
      hl=""
      for(i=1;i<=n;i++){
        if (substr(L[i],1,1)=="|" && L[i+1] ~ /^\|[ :|-]+$/) {
          k=ncell(L[i],C); hl=i; hstory[hl]=0
          for(j=1;j<=k;j++) if (tolower(trim(C[j]))=="story") hstory[hl]=1
          tabs++
          continue
        }
        if (L[i] ~ /^\|[ \t]*TC-/) {
          k=ncell(L[i],C); rows++
          if (hl=="") continue
          if (hstory[hl]) { m=(k>=2 ? C[2] : "")
            while (match(m,/US-[A-Za-z0-9-]+/)){ cited[substr(m,RSTART,RLENGTH)]=1; m=substr(m,RSTART+RLENGTH) } }
        }
      }
      for(i=1;i<=sn;i++){
        s=so[i]
        if (s in cited) { print "COVERED\t" s; continue }
        if (s in wide)  { print "JOINFAIL\t" s "\t" wide[s] "\t" widen[s] }
        else            { print "GENUINE\t" s }
      }
      print "TOTALS\t" sn+0 "\t" rows+0 "\t" tabs+0 "\t" tcrows+0
    }
  ' "$1" "$2" 2>/dev/null
}

report(){
  local sp="$ROOT/$SF" cp="$ROOT/$CF"
  echo "=== gates/audit/story-join.sh - STORY AT ZERO CASES, split into real gaps and join failures"
  echo "registers       $SF  |  $CF   (root $ROOT)"

  # ABSENT IS NOT EMPTY. Arm (5) learned this from its own control C7b and the convention is
  # copied deliberately: a register that is not there is NOT CHECKED and that is not a pass.
  if [ ! -f "$sp" ] || [ ! -f "$cp" ]; then
    echo "NOT CHECKED     one or both registers are not in this tree. This is NOT a pass."
    echo "NOT CHECKED."
    return 2
  fi

  local out; out="$(derive "$sp" "$cp")"
  local STORIES=0 ROWS=0 TABS=0 TCROWS=0 NG=0 NJ=0 NC=0 GLIST="" JLIST=""
  while IFS="$(printf '\t')" read -r TAG F2 F3 F4 F5; do
    [ -n "$TAG" ] || continue
    case "$TAG" in
      COVERED)  NC=$((NC+1)) ;;
      GENUINE)  NG=$((NG+1)); GLIST="$GLIST $F2" ;;
      JOINFAIL) NJ=$((NJ+1)); JLIST="$JLIST $F2"
                echo "  JOIN FAILURE    $F2 is on arm (5)'s zero-cases list, and $CF:$F3 names it beside $F4 ($F5 block pairing(s)). The case exists; arm (5)'s cell-2 join cannot see it." ;;
      TOTALS)   STORIES="${F2:-0}"; ROWS="${F3:-0}"; TABS="${F4:-0}"; TCROWS="${F5:-0}" ;;
    esac
  done <<EOF
$out
EOF
  local g; for g in $GLIST; do echo "  GENUINE ORPHAN  $g is on arm (5)'s zero-cases list and NO block of $CF names it beside a TC- id. This is a real gap."; done

  # VACUITY. A derivation that reads nothing prints perfect numbers. Both registers exist here, so
  # an empty reading is a REFUSAL, not a pass. This is lane 2's C9b lesson, imported rather than
  # rediscovered.
  if [ "$STORIES" -eq 0 ] || [ "$ROWS" -eq 0 ] || [ "$TABS" -eq 0 ]; then
    echo "REFUSED         both registers EXIST and the derivation is EMPTY - $STORIES story heading(s), $ROWS table case row(s), $TABS table(s). This tool cannot report a clean register it failed to read."
    echo "REFUSED."
    return 2
  fi

  echo "STORIES         $STORIES heading(s) in $SF"
  echo "ARM5 COVERED    $NC of $STORIES"
  echo "ZERO CASES      $((NG+NJ)) of $STORIES  <- this is the number arm (5) prints and ratchets"
  echo "  JOIN FAILURE  $NJ    a case exists and arm (5) cannot read it"
  echo "  GENUINE       $NG of ceiling $GCEIL    a real gap"
  echo "TABLE CASE ROWS $TCROWS pipe-table row(s) beginning TC-; cases written in any other shape are invisible to arm (5)"

  local rc=0
  if [ "$NG" -gt "$GCEIL" ]; then
    echo "REFUSED         GENUINE ORPHANS $NG exceeds the committed ceiling of $GCEIL. Write the case, or list the story with a reason and lower this number - do NOT raise A5ZCEIL, which caps a mixed list and would hide this one."
    rc=2
  elif [ "$NG" -lt "$GCEIL" ]; then
    echo "CEILING CAN BE LOWERED: $NG of $GCEIL genuine orphan(s). Commit G_CEIL=$NG in this file so it cannot rise again."
  fi
  case " $GLIST " in *" $G_NAMED "*) echo "NAMED MEMBER    $G_NAMED is present in the genuine list, as this file records it should be" ;;
    *) if [ "$NG" -gt 0 ]; then echo "NAMED MEMBER    $G_NAMED is NOT in the genuine list but the ceiling is still $GCEIL and $NG orphan(s) are present - the committed member has CHANGED and the ceiling is now guarding a different story. Re-derive G_CEIL and G_NAMED together."; rc=2
       else echo "NAMED MEMBER    $G_NAMED is no longer a genuine orphan and there are none. Lower G_CEIL to 0 in this file."; fi ;;
  esac

  # CROSS-CHECK AGAINST THE ARM ITSELF. The whole value of this tool is that its ARM5 column IS
  # arm (5). A re-implementation that drifts reports a difference that does not exist, which is
  # worse than no tool. So when gates/verify-log.sh is in the tree, ask it, and refuse on a
  # disagreement rather than printing both numbers and leaving the reader to choose.
  local cross="${CT_CROSS:-}"
  if [ -z "$cross" ]; then if [ -f "$ROOT/gates/verify-log.sh" ]; then cross=1; else cross=0; fi; fi
  if [ "$cross" = "1" ]; then
    local armout armz
    armout="$(cd "$ROOT" && bash gates/verify-log.sh --citations 2>&1)"
    armz="$(printf '%s\n' "$armout" | grep -c '^  STORY AT ZERO CASES:')"
    if [ "$armz" -eq "$((NG+NJ))" ]; then
      echo "CROSS-CHECK     AGREES with gates/verify-log.sh --citations arm (5): both read $armz story(ies) at zero cases."
    else
      echo "REFUSED         CROSS-CHECK DISAGREES: arm (5) reads $armz at zero cases, this file's replica reads $((NG+NJ)). The replica has drifted from the arm it is measuring and its split is not trustworthy until they agree."
      rc=2
    fi
  else
    echo "CROSS-CHECK     NOT RUN (no gates/verify-log.sh in this tree). The ARM5 column is this file's replica only."
  fi

  if [ "$rc" -eq 0 ]; then echo "CLEAN. $NG genuine orphan(s) of ceiling $GCEIL; $NJ of the $((NG+NJ)) stories on arm (5)'s list have a case it cannot read."
  else echo "REFUSED. See the REFUSED line(s) above."; fi
  return $rc
}

# ── THE CONTROLS. EVERY DETECTOR FIRING AND SILENT, ON THE SAME FIXTURE SHAPE ────────────────────
# A detector shown only firing is a demonstration. Each pair below differs by ONE character or one
# column, so a pass cannot come from the fixtures being different in some other way.
selftest(){
  local P=0 F=0 out rc
  # T IS DELIBERATELY NOT `local`. It was, and the EXIT trap below then fired AFTER the function
  # returned, with T out of scope and `set -u` in force, so a selftest that FAILED printed
  # "T: unbound variable" and exited 1 for the wrong reason - a cleanup handler turning a real
  # verdict into a harness error. Found by running it, not by reading it.
  T="$(mktemp -d)"; trap 'rm -rf "${T:-}"' EXIT
  mk(){ # mk <dir> <stories-body> <cases-body>
    mkdir -p "$1"; printf '%s\n' "$2" > "$1/us.md"; printf '%s\n' "$3" > "$1/tc.md"; }
  run(){ CT_ROOT="$1" CT_STORIES=us.md CT_CASES=tc.md CT_CROSS=0 ${2:+CT_GCEIL=$2} bash "$SELF/story-join.sh" 2>&1; }
  say(){ if [ "$2" = "1" ]; then P=$((P+1)); echo "  PASS  $1"; else F=$((F+1)); echo "  FAIL  $1"; fi; }
  has(){ case "$1" in *"$2"*) echo 1;; *) echo 0;; esac; }

  local TBL='| id | story | what it asserts |
|---|---|---|
| TC-A-01 | US-A-01 | a thing |'

  # C1 / C2  GENUINE ORPHAN, firing and silent. One line differs: whether US-B-02 is cited at all.
  mk "$T/c1" '### US-A-01 a
### US-B-02 b' "$TBL"
  out="$(run "$T/c1")"; rc=$?
  say "C1  a story named nowhere in the case register is a GENUINE ORPHAN" "$(has "$out" 'GENUINE ORPHAN  US-B-02')"
  # C1b WAS WRONG WHEN FIRST WRITTEN AND IS KEPT IN ITS CORRECTED FORM RATHER THAN DELETED.
  # It asserted that one orphan against a ceiling of 1 is CLEAN. It is not, and should not be: the
  # single orphan here is US-B-02 and the committed named member is US-INV-04, so the named-member
  # arm refuses - which is exactly what C11b exists to prove. The control was asserting the
  # ratchet's behaviour and reading the named-member arm's exit code. Corrected to assert the
  # thing it was actually for: that the COUNT ratchet did not fire on this fixture.
  say "C1b and the refusal here is NOT the count ratchet - one orphan against ceiling 1 prints no ceiling breach" "$([ "$(has "$out" 'exceeds the committed ceiling')" = 0 ] && echo 1 || echo 0)"
  mk "$T/c2" '### US-A-01 a' "$TBL"
  out="$(run "$T/c2")"
  say "C2  a story cited in cell 2 of a story-column table is SILENT - no orphan, no join failure" "$([ "$(has "$out" 'US-A-01')" = 0 ] && echo 1 || echo 0)"

  # C3 / C4  JOIN FAILURE, firing and silent. THE ONE CHARACTER THAT DIFFERS IS THE TC- ID.
  # This is the control that stops this tool reporting every passing mention as coverage.
  mk "$T/c3" '### US-A-01 a
### US-B-02 b' "$TBL
**TC-B-02 - the case for it.** US-B-02."
  out="$(run "$T/c3")"
  say "C3  a prose case naming its story beside a TC- id is a JOIN FAILURE, not a genuine orphan" "$([ "$(has "$out" 'JOIN FAILURE    US-B-02')" = 1 ] && [ "$(has "$out" 'GENUINE ORPHAN  US-B-02')" = 0 ] && echo 1 || echo 0)"
  mk "$T/c4" '### US-A-01 a
### US-B-02 b' "$TBL
A paragraph that merely mentions US-B-02 and names no case."
  out="$(run "$T/c4")"
  say "C4  a bare mention with NO TC- id on the line is a GENUINE ORPHAN, not a join failure - the discrimination this tool stands on" "$([ "$(has "$out" 'GENUINE ORPHAN  US-B-02')" = 1 ] && [ "$(has "$out" 'JOIN FAILURE    US-B-02')" = 0 ] && echo 1 || echo 0)"

  # C5 / C6  THE RATCHET, firing and silent, on the same tree with the ceiling moved by one.
  mk "$T/c5" '### US-A-01 a
### US-B-02 b
### US-C-03 c' "$TBL"
  out="$(run "$T/c5")"; rc=$?
  say "C5  two genuine orphans against ceiling 1 REFUSES, exit 2" "$([ $rc -eq 2 ] && [ "$(has "$out" 'exceeds the committed ceiling of 1')" = 1 ] && echo 1 || echo 0)"
  out="$(run "$T/c5" 2)"; rc=$?
  say "C6  the same two against ceiling 2 does NOT refuse on the ratchet - the fixture is not what refused in C5" "$([ "$(has "$out" 'exceeds the committed ceiling')" = 0 ] && echo 1 || echo 0)"

  # C7  THE HOME-TABLE DEFECT THIS JOB WAS FILED ABOUT, as a control. A table with no story column.
  mk "$T/c7" '### US-A-01 a
### US-H-11 h' "$TBL
| id | what it asserts | pass condition |
|---|---|---|
| TC-H-050c | US-H-11 reaches the lesson | it does |"
  out="$(run "$T/c7")"
  say "C7  a case row in a table with NO story column is a JOIN FAILURE - the 2026-09-28 Home-table defect, reproduced" "$([ "$(has "$out" 'JOIN FAILURE    US-H-11')" = 1 ] && echo 1 || echo 0)"

  # C8  THE UNESCAPED-PIPE DEFECT, as a control, and its escaped twin. ONE BACKSLASH DIFFERS.
  mk "$T/c8" '### US-A-01 a
### US-W-09 w' "$TBL
| id | story | what it asserts |
|---|---|---|
| TC-W-09 | a|b US-W-09 | shifted |"
  out="$(run "$T/c8")"
  say "C8  a row whose unescaped pipe shifts the story out of cell 2 is a JOIN FAILURE" "$([ "$(has "$out" 'JOIN FAILURE    US-W-09')" = 1 ] && echo 1 || echo 0)"
  mk "$T/c8b" '### US-A-01 a
### US-W-09 w' "$TBL
| id | story | what it asserts |
|---|---|---|
| TC-W-09 | US-W-09 a\|b | not shifted |"
  out="$(run "$T/c8b")"
  say "C8b the same row with the pipe ESCAPED is SILENT - the pipe is what fired C8, not the row" "$([ "$(has "$out" 'US-W-09')" = 0 ] && echo 1 || echo 0)"

  # C9 / C10  ABSENT versus EMPTY. Arm (5)'s own distinction, and it must not collapse.
  mkdir -p "$T/c9"
  out="$(run "$T/c9")"; rc=$?
  say "C9  registers ABSENT is NOT CHECKED and exit 2 - explicitly not a pass" "$([ $rc -eq 2 ] && [ "$(has "$out" 'NOT CHECKED')" = 1 ] && [ "$(has "$out" 'REFUSED')" = 0 ] && echo 1 || echo 0)"
  mk "$T/c10" '' ''
  out="$(run "$T/c10")"; rc=$?
  say "C10 registers PRESENT and EMPTY is REFUSED and exit 2 - a tool cannot clear a register it did not read" "$([ $rc -eq 2 ] && [ "$(has "$out" 'REFUSED')" = 1 ] && [ "$(has "$out" 'NOT CHECKED')" = 0 ] && echo 1 || echo 0)"

  # C11 THE NAMED MEMBER. A ceiling of 1 must not be satisfiable by a DIFFERENT single orphan.
  mk "$T/c11" '### US-A-01 a
### US-INV-04 the named one' "$TBL"
  out="$(run "$T/c11")"; rc=$?
  say "C11 the committed named member as the single orphan is CLEAN and says so" "$([ $rc -eq 0 ] && [ "$(has "$out" 'NAMED MEMBER    US-INV-04 is present')" = 1 ] && echo 1 || echo 0)"
  out="$(run "$T/c1")"
  say "C11b a DIFFERENT single orphan against the same ceiling REFUSES - the ceiling guards one story, not a count" "$([ "$(has "$out" 'the committed member has CHANGED')" = 1 ] && echo 1 || echo 0)"

  # C12 / C12b  BLOCK SCOPE, firing and silent. The ONE character that differs is a blank line.
  # C12 is the real register's gallery section reduced to its shape: the TC- id on one line, the
  # story citation on the next, inside one block. C12b separates them with a blank line, so they
  # are two blocks and the story has no case - which is what stops block scope from pairing
  # anything with anything.
  mk "$T/c12" '### US-A-01 a
### US-G-01 g' "$TBL
**TC-G-001 - the gallery holds exactly the asks that are due, and every card
fits at 320 and 375.** US-G-01."
  out="$(run "$T/c12")"
  say "C12  a TC- id and its story on DIFFERENT lines of ONE block is a JOIN FAILURE - the gallery shape, and the defect this file's own first draft had" "$([ "$(has "$out" 'JOIN FAILURE    US-G-01')" = 1 ] && [ "$(has "$out" 'GENUINE ORPHAN  US-G-01')" = 0 ] && echo 1 || echo 0)"
  mk "$T/c12b" '### US-A-01 a
### US-G-01 g' "$TBL
**TC-G-001 - a case about something else.**

A later paragraph that mentions US-G-01 and names no case."
  out="$(run "$T/c12b")"
  say "C12b a blank line between them makes two blocks and the story a GENUINE ORPHAN - block scope does not pair across blocks" "$([ "$(has "$out" 'GENUINE ORPHAN  US-G-01')" = 1 ] && [ "$(has "$out" 'JOIN FAILURE    US-G-01')" = 0 ] && echo 1 || echo 0)"

  # C13  TABLE ROWS ARE NOT PARAGRAPH-SCOPED. A table has no blank lines, so paragraph scope over
  # one would pair row 1's TC- id with row 3's story and invent coverage. Each pipe line is its own
  # block, and this control is what says so.
  mk "$T/c13" '### US-A-01 a
### US-T-02 t' "$TBL
| id | story | what it asserts |
|---|---|---|
| TC-T-01 | US-A-01 | one |
| TC-T-02 |  | no story cell of its own |
| no-tc-id-here | US-T-02 | a row that names a story and no case |"
  out="$(run "$T/c13")"
  say "C13  a story named in a table row that carries NO TC- id is a GENUINE ORPHAN - pipe lines are their own blocks, so no neighbouring row's id covers it" "$([ "$(has "$out" 'GENUINE ORPHAN  US-T-02')" = 1 ] && [ "$(has "$out" 'JOIN FAILURE    US-T-02')" = 0 ] && echo 1 || echo 0)"

  echo "SELFTEST $P pass / $F fail"
  [ "$F" -eq 0 ]
}

case "${1:-}" in
  --selftest) selftest; exit $?;;
  ""|--report) report; exit $?;;
  *) echo "usage: $0 [--report|--selftest]" >&2; exit 64;;
esac
