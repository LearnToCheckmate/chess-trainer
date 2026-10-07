#!/usr/bin/env bash
# gates/audit/stamp-regex-selftest.sh
#
# THE CASE jobs/uat-stamp-regex-4xx HAS BEEN OWED SINCE 2026-09-22.
#
# That job is two halves. The first - widening the build-stamp regex from three digits to
# three-or-four, so #400 and upward can be read at all - landed. The second is this file.
# The job's own outcome.whatIsLeft, written by the orchestrator's second reconciliation
# sweep on 2026-10-04T05:10Z, states the gap verbatim: "nothing in gates/ drives
# b.stamp()'s regex over synthetic stamps, and no row in claude/stories/TEST-CASES.md
# covers it ... So a future narrowing of lib.js:113 would be invisible again."
#
# THE SPECIFIED INPUTS, FROM THE JOB'S `case` FIELD, NOT INVENTED HERE: "One case over
# stamps #399, #400, #416, #422, #1000; input count 5." Those five are the fixtures below.
# #399 is the last number the pre-fix regex could read, #400 the first it could not, #416
# and #422 the two builds the flag was filed against, #1000 the four-digit boundary.
#
# WHY IT EXTRACTS EACH REGEX FROM ITS OWN SOURCE FILE INSTEAD OF HOLDING A COPY, and this
# is the whole design rather than a flourish. The job's whatDidNot already names the
# nearest existing instrument and says why it does not cover this: gates/buildnum-selftest.sh
# drives "#999/#1000/#1001 fixtures" but over the build-number REGISTER sweep, with its own
# different extractor, "(#|\bbuild +)[0-9]{3,4}". So the tree already contains a test that
# passes a four-digit stamp through a regex that is NOT the one that broke. A test carrying
# its own copy of a pattern cannot fail when the shipped pattern narrows; it can only fail
# when the copy does. Every pattern below is read out of the file that uses it, at run time,
# by command. If a site is renamed or its anchor moves, this file goes RED on C1 rather than
# quietly testing a string.
#
# AND IT IS A COMPARATOR, WHICH IS THE SHAPE R47 ASKS FOR. C9 does not ask whether the
# parsers agree with each other; it builds a stamp THE WAY gates/build.sh BUILDS IT, from
# build.sh's own line, and asks whether every parser in the tree can read what the producer
# actually writes. Four of the four Kunal-found defects measured on 2026-10-03 shared one
# shape: the ground truth was already in our hands and nothing read it. The producer's
# format is ground truth we hold.
#
# WHAT THIS FILE DOES NOT DO, said here so nobody reads coverage into it that is not here:
#   - It does not launch a browser and it does not open a bundle. b.stamp() reads
#     document.documentElement.innerHTML in a page; this drives the REGEX over text, which
#     is the part that broke and the part a unit control can hold. A live-DOM assertion
#     belongs to gates/regress/49-home.js, which already has one (S3 below).
#   - It does not add the register row in claude/stories/TEST-CASES.md that the same job's
#     whatDidNot also asks for. That row is still owed and the job still says so.
#
# USAGE
#   gates/audit/stamp-regex-selftest.sh              run the audit over the live tree
#   gates/audit/stamp-regex-selftest.sh --selftest   run the audit's own controls
#   Exit 0 all green, 1 any red, 2 could not measure (missing node, missing file).
#
# Both arms are pure reads of tracked files plus one node process. Nothing is written, no
# network, no browser, no bundle, no app code touched.

set -u
G="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$G/.." && pwd)"
NODE="$(command -v node || true)"

# --- THE PINNED SITE LIST AND THE RATCHET ------------------------------------------------
# Swept 2026-10-07 at origin/main 97393a6 with:
#   grep -rnE 'd\{3,4\}|\[0-9\]\{3,4\}' --include=*.js --include=*.sh --include=*.jsx
# Four LIVE extractors and one DOC COPY. The ratchet C1 refuses a fifth live site, because a
# new unchecked extractor is exactly how this defect got in: the regex that broke was one of
# several and nothing enumerated them.
STAMP_SITES_CEIL=4
DOC_COPY_CEIL=1
# EXCLUDED, with the reason, so the exclusion is a decision and not an oversight:
#   gates/audit/pixel-literal-classify.sh:120  \d{3,4}x\d{3,4} is a GEOMETRY key
#   (375x812), not a build stamp. It never sees a '#' and never sees ' ET'.

# --- THE FIXTURES, FROM THE JOB'S case FIELD --------------------------------------------
NUMS="399 400 416 422 1000"
STAMP_DATE="2026-09-14 10:04"

say(){ printf '%-30s %-5s %s\n' "$1" "$2" "${3:-}"; }

need_node(){
  if [ -z "$NODE" ]; then
    echo "stamp-regex-selftest.sh: no node on PATH. The three JS sites use JavaScript regex" >&2
    echo "  semantics and cannot be driven by grep. MEASURED NOTHING - this is exit 2, not a pass." >&2
    exit 2
  fi
}

# --- EXTRACTION. Each function prints the pattern as it stands in the file, or nothing. ---
# S1 gates/lib.js  the BANNER reader: reads the stamp out of the bundle head on disk.
x_S1(){ grep -n 'const m=head.match(' "$G/lib.js" | head -1 | sed -n 's|.*head\.match(/\(.*\)/).*|\1|p'; }
# S2 gates/lib.js  b.stamp(): reads the stamp out of the live DOM. THE SITE THE JOB NAMES.
x_S2(){ grep -n 'async stamp()' "$G/lib.js" | head -1 | sed -n 's|.*innerHTML\.match(/\(.*\)/);.*|\1|p'; }
# S3 gates/regress/49-home.js  the shipped-banner assertion, anchored and prefixed 'Build '.
x_S3(){ grep -n 'Build #' "$G/regress/49-home.js" | grep 'L.say(/' | head -1 | sed -n 's|.*L\.say(/\(.*\)/\.test(.*|\1|p'; }
# S4 gates/buildnum.sh  the REGISTER sweep's own ERE, driven by grep -oiE, not by node.
x_S4(){ grep -n "grep -oiE" "$G/buildnum.sh" | head -1 | sed -n "s|.*grep -oiE '\([^']*\)'.*|\1|p"; }
# D1 gates/buildnum.sh:69  a COMMENT quoting S2's regex. A copy that can drift silently.
x_D1(){ grep -n 'is the actual regex parser' "$G/buildnum.sh" | head -1 | sed -n 's|.*parser (/\(.*\)/) behind.*|\1|p'; }

# THE RATCHET COUNTS LINES, NOT SUCCESSFUL EXTRACTIONS, and that distinction was this
# file's second self-inflicted red. The first version summed the four x_SN functions, each
# of which ends in `head -1`, so the count was capped at 4 by construction: control K5 added
# a fifth extractor line and the number did not move. A ceiling that cannot be exceeded is
# not a ceiling. It now greps every occurrence of each site's signature across the four
# files and sums them, so a new extractor - or a copy-pasted one, which is how this class
# grows - pushes the count over the pin and reddens C1.
# A COMMENTED-OUT extractor line still counts, deliberately: this check cannot parse
# JavaScript, and a reader deleting a site by commenting it out should have to re-pin the
# number on purpose rather than have the count quietly agree with them.
count_live_sites(){
  local c=0 f
  c=$((c + $(grep -c 'head\.match(/#' "$G/lib.js" 2>/dev/null || echo 0) ))
  c=$((c + $(grep -c 'innerHTML\.match(/#' "$G/lib.js" 2>/dev/null || echo 0) ))
  c=$((c + $(grep -c 'L\.say(/\^Build #' "$G/regress/49-home.js" 2>/dev/null || echo 0) ))
  c=$((c + $(grep -c "grep -oiE '(#" "$G/buildnum.sh" 2>/dev/null || echo 0) ))
  printf '%s' "$c"
}

# --- THE AUDIT ---------------------------------------------------------------------------
audit(){
  need_node
  local n=0 ok=0
  local s1 s2 s3 s4 d1
  s1="$(x_S1)"; s2="$(x_S2)"; s3="$(x_S3)"; s4="$(x_S4)"; d1="$(x_D1)"

  # C1  THE RATCHET. Every pinned site must still be findable, and no site may vanish.
  n=$((n+1))
  local live; live="$(count_live_sites)"
  if [ "$live" -eq "$STAMP_SITES_CEIL" ]; then
    ok=$((ok+1)); say C1-SITE-COUNT PASS "$live live extractors found, ceiling $STAMP_SITES_CEIL"
  else
    say C1-SITE-COUNT FAIL "found $live live extractors, pinned at $STAMP_SITES_CEIL - a site moved, was renamed, or was added. Re-sweep and re-pin deliberately; do not widen this number to make the line green."
  fi

  # C2  THE DOC COPY MUST AGREE WITH THE CODE. R45 shape (1): one number, two values.
  n=$((n+1))
  if [ -n "$d1" ] && [ "$d1" = "$s2" ]; then
    ok=$((ok+1)); say C2-DOC-COPY-AGREES PASS "buildnum.sh's comment quotes b.stamp()'s regex exactly"
  else
    say C2-DOC-COPY-AGREES FAIL "comment says [$d1], b.stamp() says [$s2]"
  fi

  # C3..C6  EVERY LIVE EXTRACTOR OVER THE FIVE SPECIFIED STAMPS, plus negatives, plus the
  #         mutation control. node for the three JS sites; grep -oiE for the ERE site.
  local out rc
  out="$("$NODE" -e '
    const [s1,s2,s3,nums,date]=process.argv.slice(1);
    const sites=[["S1-BANNER-READER",s1,""],["S2-B-STAMP",s2,""],["S3-49-HOME-BANNER",s3,"Build "]];
    const ns=nums.split(" ");
    const lines=[];
    for(const [name,src,prefix] of sites){
      if(!src){lines.push(name+"\tEXTRACT-FAILED\t-");continue;}
      let re; try{re=new RegExp(src);}catch(e){lines.push(name+"\tBAD-REGEX\t"+e.message);continue;}
      // positives: every one of the five must match and yield its own number back
      const bad=[];
      for(const num of ns){
        const stamp=prefix+"#"+num+" - "+date+" ET";
        const m=stamp.match(re);
        if(!m){bad.push(num+":no-match");continue;}
        const got=(m[0].match(/#(\d+)/)||[])[1];
        if(got!==num)bad.push(num+":read-as-"+got);
      }
      lines.push(name+"-POSITIVES\t"+(bad.length?("FAIL\t"+bad.join(",")):("PASS\t"+ns.length+"/"+ns.length+" stamps read, numbers round-trip")));
      // negatives: four malformed stamps, each must be rejected by an anchored or
      // structurally complete pattern. Un-anchored patterns legitimately match a
      // substring, so only the shapes that break the PATTERN itself are controls here.
      const negs=[[prefix+"#99 - "+date+" ET","two-digit number"],
                  [prefix+"#416 - 2026-09-14 ET","no time"],
                  [prefix+"#416 - "+date,"no ET"],
                  [prefix+"#416 ET","no date at all"]];
      const leaked=negs.filter(([t])=>re.test(t)).map(([,w])=>w);
      lines.push(name+"-NEGATIVES\t"+(leaked.length?("FAIL\tmatched: "+leaked.join("; ")):("PASS\t"+negs.length+"/"+negs.length+" malformed stamps rejected")));
      // MUTATION CONTROL: re-narrow the live pattern to the pre-fix three digits. The
      // mutant MUST stop reading #1000. If it still reads it, this check could not have
      // caught the original defect and says so instead of passing.
      const mutSrc=src.replace(/\\d\{3,4\}/g,"\\d{3}");
      if(mutSrc===src){lines.push(name+"-MUTATION\tFAIL\tno \\d{3,4} to narrow in ["+src+"] - the control cannot be applied, so this site is untested against the original defect");continue;}
      let mre; try{mre=new RegExp(mutSrc);}catch(e){lines.push(name+"-MUTATION\tFAIL\tmutant would not compile");continue;}
      const fourDigit=prefix+"#1000 - "+date+" ET";
      const mm=fourDigit.match(mre);
      const mutNum=mm?(mm[0].match(/#(\d+)/)||[])[1]:null;
      const caught=!mm||mutNum!=="1000";
      lines.push(name+"-MUTATION\t"+(caught?("PASS\tnarrowed to \\d{3}, #1000 "+(mm?("mis-read as #"+mutNum):"no longer matches")):"FAIL\tmutant still reads #1000, so a re-narrowing would be invisible"));
    }
    console.log(lines.join("\n"));
  ' "$s1" "$s2" "$s3" "$NUMS" "$STAMP_DATE" 2>&1)"; rc=$?
  if [ $rc -ne 0 ]; then
    n=$((n+1)); say C3-JS-SITES FAIL "node arm failed: $out"
  else
    while IFS=$'\t' read -r nm vd detail; do
      [ -z "${nm:-}" ] && continue
      n=$((n+1))
      if [ "${vd:-}" = "PASS" ]; then ok=$((ok+1)); say "C3-$nm" PASS "$detail"; else say "C3-$nm" FAIL "${vd} ${detail}"; fi
    done <<< "$out"
  fi

  # C7  THE ERE SITE, driven by the tool that actually drives it.
  n=$((n+1))
  if [ -z "$s4" ]; then
    say C7-S4-ERE-EXTRACT FAIL "could not read the ERE out of gates/buildnum.sh"
  else
    local badn="" num got
    for num in $NUMS; do
      got="$(printf '#%s - %s ET\n' "$num" "$STAMP_DATE" | grep -oiE "$s4" | grep -oE '[0-9]{3,4}' | head -1)"
      [ "$got" = "$num" ] || badn="$badn $num:[${got:-none}]"
    done
    if [ -z "$badn" ]; then ok=$((ok+1)); say C7-S4-ERE-POSITIVES PASS "5/5 stamps read by gates/buildnum.sh's own ERE"
    else say C7-S4-ERE-POSITIVES FAIL "$badn"; fi
  fi
  # C8  the same ERE, mutated to three digits, must stop reading #1000.
  n=$((n+1))
  if [ -z "$s4" ]; then
    say C8-S4-ERE-MUTATION FAIL "no ERE to mutate"
  else
    local mut got4
    mut="$(printf '%s' "$s4" | sed 's/\[0-9\]{3,4}/[0-9]{3}/g')"
    if [ "$mut" = "$s4" ]; then
      say C8-S4-ERE-MUTATION FAIL "no [0-9]{3,4} to narrow in [$s4] - control cannot be applied"
    else
      got4="$(printf '#1000 - %s ET\n' "$STAMP_DATE" | grep -oiE "$mut" | grep -oE '[0-9]{3,4}' | head -1)"
      if [ "$got4" != "1000" ]; then ok=$((ok+1)); say C8-S4-ERE-MUTATION PASS "narrowed to [0-9]{3}, #1000 read as [${got4:-none}]"
      else say C8-S4-ERE-MUTATION FAIL "mutant still reads 1000"; fi
    fi
  fi

  # C9  THE COMPARATOR. Build the stamp the way gates/build.sh builds it, from build.sh's
  #     own line, and require every live extractor to read it. This is the only check here
  #     that compares the parsers against the PRODUCER rather than against each other.
  n=$((n+1))
  local prod_line prod_stamp
  prod_line="$(grep -h '^STAMP=' "$G/build.sh" | head -1)"
  if [ -z "$prod_line" ]; then
    say C9-PRODUCER-FORMAT FAIL "no STAMP= line in gates/build.sh - the producer moved and this comparator is blind"
  else
    # THE STAMP IS EVALUATED FROM build.sh's OWN ASSIGNMENT LINE, not rebuilt here. The
    # first version hard-coded "#422 - <date> ET" and only checked that a STAMP= line
    # existed, so control K4 deleted ' ET' from the producer and C9 stayed green - the
    # comparator was comparing the parsers against a copy of the format, which is the exact
    # mistake the header says this file exists to avoid. Now build.sh's line is run in a
    # subshell with its two inputs supplied (N, which carries the '#', and CT_STAMP_TIME,
    # which build.sh already honours for reproducible stamps), so if the producer's format
    # changes by one character this check sees it.
    prod_stamp="$(N='#422' CT_STAMP_TIME="$STAMP_DATE" bash -c "$prod_line; printf '%s' \"\$STAMP\"" 2>/dev/null)"
    if [ -z "$prod_stamp" ]; then
      say C9-PRODUCER-FORMAT FAIL "gates/build.sh's STAMP= line did not evaluate: [$prod_line]"
      prod_stamp="__unevaluable__"
    fi
    local misses=""
    # All three JS patterns go through node, because \d is JavaScript and grep -E does not
    # know it. S3 is anchored and prefixed, so the producer's stamp is handed to it the way
    # the app renders it: 'Build ' + the stamp. GETTING THIS WRONG WAS THIS FILE'S OWN FIRST
    # RED - the first draft tested S3 with grep -qE, which cannot read \d{3,4}, so C9 failed
    # on a producer the parser reads perfectly. Kept as a comment rather than quietly fixed,
    # because it is the same class of error the file is written to catch: a check whose own
    # engine differs from the engine that ships.
    local jsbad
    jsbad="$("$NODE" -e '
      const [s1,s2,s3,stamp]=process.argv.slice(1);
      const bad=[];
      for(const [nm,src,pre] of [["S1",s1,""],["S2",s2,""],["S3",s3,"Build "]]){
        if(!src){bad.push(nm+"(no-pattern)");continue;}
        let re; try{re=new RegExp(src);}catch(e){bad.push(nm+"(bad-regex)");continue;}
        if(!re.test(pre+stamp))bad.push(nm);
      }
      console.log(bad.join(","));
    ' "$s1" "$s2" "$s3" "$prod_stamp" 2>&1)"
    [ -z "$jsbad" ] || misses="$misses $jsbad"
    printf '%s\n' "$prod_stamp" | grep -oiE "${s4:-zzz}" >/dev/null 2>&1 || misses="$misses S4"
    if [ -z "$misses" ]; then ok=$((ok+1)); say C9-PRODUCER-FORMAT PASS "the stamp gates/build.sh writes is read by all 4 extractors"
    else say C9-PRODUCER-FORMAT FAIL "cannot read the producer's own stamp:$misses"; fi
  fi

  echo
  echo "stamp-regex-selftest.sh: $ok PASS / $((n-ok)) FAIL  (of $n assertions over 5 specified stamps: $NUMS)"
  echo "  sites audited: S1 gates/lib.js banner, S2 gates/lib.js b.stamp(), S3 gates/regress/49-home.js, S4 gates/buildnum.sh ERE; doc copy D1 gates/buildnum.sh comment"
  [ "$ok" -eq "$n" ]
}

# --- THE AUDIT'S OWN CONTROLS ------------------------------------------------------------
# Every control below answers one question: can this file go RED? An audit nobody has seen
# fail is a decoration. Each control copies the tree into scratch, breaks ONE thing, and
# requires the named assertion to fail.
selftest(){
  need_node
  local n=0 ok=0 T
  T="$(mktemp -d)"
  mkdir -p "$T/gates/regress" "$T/gates/audit"
  cp "$G/lib.js" "$G/buildnum.sh" "$G/build.sh" "$T/gates/" 2>/dev/null
  cp "$G/regress/49-home.js" "$T/gates/regress/" 2>/dev/null
  cp "$G/audit/stamp-regex-selftest.sh" "$T/gates/audit/"
  chmod +x "$T/gates/audit/stamp-regex-selftest.sh"
  local SUT="$T/gates/audit/stamp-regex-selftest.sh"

  # K0  GREEN ON THE UNTOUCHED TREE. If this is red, every other control is meaningless.
  n=$((n+1))
  if "$SUT" >"$T/k0.log" 2>&1; then ok=$((ok+1)); say K0-GREEN-ON-MAIN PASS "$(grep -c ' PASS ' "$T/k0.log") assertions green on the copied tree"
  else say K0-GREEN-ON-MAIN FAIL "audit is red on an untouched tree: $(tail -3 "$T/k0.log" | tr '\n' ' ')"; fi

  # K1  THE ORIGINAL DEFECT, REINTRODUCED. Narrow b.stamp() back to three digits in the
  #     tree, exactly as it was before the fix landed. The audit MUST go red.
  n=$((n+1))
  sed -i 's|innerHTML.match(/#\\d{3,4} |innerHTML.match(/#\\d{3} |' "$T/gates/lib.js"
  if grep -q 'innerHTML.match(/#\\d{3} ' "$T/gates/lib.js"; then
    if "$SUT" >"$T/k1.log" 2>&1; then say K1-REFIX-CAUGHT FAIL "the pre-fix three-digit b.stamp() regex passes this audit - it cannot catch the defect it was written for"
    else ok=$((ok+1)); say K1-REFIX-CAUGHT PASS "re-narrowed b.stamp() to \\d{3} and the audit went red"; fi
  else
    say K1-REFIX-CAUGHT FAIL "could not apply the mutation to the copied lib.js - the anchor moved"
  fi
  cp "$G/lib.js" "$T/gates/lib.js"

  # K2  THE DOC COPY DRIFTS. Change the comment in buildnum.sh only. C2 must catch it.
  n=$((n+1))
  sed -i 's|is the actual regex parser (/#\\d{3,4}|is the actual regex parser (/#\\d{3}|' "$T/gates/buildnum.sh"
  if "$SUT" 2>&1 | grep -q 'C2-DOC-COPY-AGREES *FAIL'; then ok=$((ok+1)); say K2-DOC-DRIFT-CAUGHT PASS "comment narrowed, C2 went red"
  else say K2-DOC-DRIFT-CAUGHT FAIL "a drifted comment did not redden C2"; fi
  cp "$G/buildnum.sh" "$T/gates/buildnum.sh"

  # K3  A SITE DISAPPEARS. Delete the banner reader's line outright. The ratchet must
  #     notice that the class shrank, because a deleted extractor is a deleted assertion.
  #     THE FIRST VERSION OF THIS CONTROL RENAMED THE VARIABLE (`const m=` to `const mm=`)
  #     AND PASSED FOR THE WRONG REASON: the site was still there, so C1 was right to stay
  #     green, and what actually reddened was the extraction. That is a different failure
  #     and it now has its own control, K6. Recorded rather than silently swapped, because
  #     a control that passes for the wrong reason is the thing this family of files is for.
  n=$((n+1))
  sed -i '/const m=head.match(\/#/d' "$T/gates/lib.js"
  if "$SUT" 2>&1 | grep -q 'C1-SITE-COUNT *FAIL'; then ok=$((ok+1)); say K3-SITE-VANISH-CAUGHT PASS "deleted an extractor line, C1 went red"
  else say K3-SITE-VANISH-CAUGHT FAIL "a deleted extractor did not redden C1"; fi
  cp "$G/lib.js" "$T/gates/lib.js"

  # K4  THE PRODUCER CHANGES AND THE PARSERS DO NOT. Drop ' ET' from build.sh's stamp.
  #     C9 is the only check that can see this, which is why it is a separate check.
  n=$((n+1))
  sed -i "s| ET\"$|\"|" "$T/gates/build.sh"
  if "$SUT" 2>&1 | grep -qE 'C9-PRODUCER-FORMAT *FAIL'; then ok=$((ok+1)); say K4-PRODUCER-DRIFT-CAUGHT PASS "producer stopped writing ' ET', C9 went red"
  else say K4-PRODUCER-DRIFT-CAUGHT FAIL "the producer and the parsers disagreed and C9 stayed green"; fi
  cp "$G/build.sh" "$T/gates/build.sh"

  # K5  A FIFTH EXTRACTOR APPEARS, UNCHECKED. This is the class-growth control: the reason
  #     the original defect existed is that nobody enumerated the sites.
  n=$((n+1))
  printf '\n// const m=head.match(/#\\d{3,4} - 20\\d\\d-\\d\\d-\\d\\d \\d\\d:\\d\\d ET/);\n' >> "$T/gates/lib.js"
  if "$SUT" 2>&1 | grep -q 'C1-SITE-COUNT *FAIL'; then ok=$((ok+1)); say K5-NEW-SITE-CAUGHT PASS "a second banner-reader line reddened C1"
  else say K5-NEW-SITE-CAUGHT FAIL "a new extractor site did not move the count - the ratchet reads only the first match and cannot see growth"; fi
  cp "$G/lib.js" "$T/gates/lib.js"

  # K6  AN ANCHOR MOVES WITHOUT THE SITE MOVING. Rename the variable the banner reader
  #     assigns to. The site count is unchanged and C1 is correctly green; the EXTRACTION
  #     must fail loudly instead of silently testing nothing, which is the failure mode of
  #     every grep-anchored instrument in this directory.
  n=$((n+1))
  sed -i 's|const m=head.match(|const mm=head.match(|' "$T/gates/lib.js"
  if "$SUT" 2>&1 | grep -qE 'C3-S1-BANNER-READER.*(EXTRACT-FAILED|FAIL)'; then ok=$((ok+1)); say K6-MOVED-ANCHOR-CAUGHT PASS "renamed the assignment, extraction failed loudly rather than passing on nothing"
  else say K6-MOVED-ANCHOR-CAUGHT FAIL "a moved anchor left the audit green, so it was testing a pattern it could not read"; fi
  cp "$G/lib.js" "$T/gates/lib.js"

  echo
  echo "stamp-regex-selftest.sh --selftest: $ok PASS / $((n-ok)) FAIL  (of $n controls)"
  echo "scratch left at $T"
  [ "$ok" -eq "$n" ]
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "") audit; exit $? ;;
  *) echo "usage: stamp-regex-selftest.sh [--selftest]" >&2; exit 2 ;;
esac
