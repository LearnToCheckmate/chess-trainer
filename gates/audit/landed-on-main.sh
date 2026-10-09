#!/usr/bin/env bash
# gates/audit/landed-on-main.sh
#
# The THIRD and LAST member of the parked-patch audit family, and the only one that
# looks AFTER integration.
#
#   gates/audit/verify-parked-patch.sh  (lane 2, 2026-10-04)  ONE payload against its
#                                       own manifest, at PARK TIME.
#   gates/audit/verify-patch-set.sh     (lane 3, 2026-10-04)  a SET of payloads against
#                                       EACH OTHER, BEFORE the integration slot applies.
#   gates/audit/landed-on-main.sh       (lane 3, this file)   every payload against
#                                       origin/main, AFTER the slot has run.
#
# WHY THIS EXISTS, AND IT IS THIS LANE'S OWN FINDING AGAINST ITSELF.
# jobs/an-integrationresult-that-says-applied-names-a-branch-that-is-not-on-main-2026-10-04,
# raised by process-build lane 3 at 2026-10-04T10:46Z, field testCase, verbatim: "for
# every document in `patches` whose integrationResult claims a landing, assert
# `git merge-base --is-ancestor <the claimed sha> origin/main`. Pass condition: zero
# documents claim a landing that is not an ancestor of origin/main." This file is that,
# plus the per-file half the same job's theFIX step (2) asks for.
#
# THE MECHANISM IT GUARDS. prompts/process-build's back-pressure rule, as corrected on
# 2026-10-03T22:55Z, measures the parked pile as documents in `patches` carrying a
# `patch` field and NO `integrationResult`. Four process lanes and up to fifteen burst
# agents halt on that number. It is a field-presence test, so WRITING an
# integrationResult drains the pile whether or not anything reached main. The rule's own
# corrected text is the record of a guard that could never fire; this is the same failure
# one step along - a guard that fires on a number a bookkeeping write can zero.
#
# AND THE FIRST THING THIS FILE DID WAS FALSIFY ITS OWN JOB'S HEADLINE, WHICH IS WHY IT
# IS A COMMAND AND NOT A SENTENCE [R18]. That job asserted, correctly as measured at
# 2026-10-04T10:30Z, that six payloads said APPLIED to claude/cool-noether-x6ofht and
# that the branch was not on main. It was not on main AT 10:30Z. At 10:55Z the slot
# merged main into that branch (dd86f72) and at 11:05Z pushed it (f4fd7dc, "process-
# integration: 6 parked patches landed"), so all six claimed shas - a8d1148, 627a1ff,
# b476aff, cf8fcf1, ce0791e and 71022a4 - have been ancestors of origin/main since
# 11:05Z, EIGHTEEN MINUTES after the job was filed. The finding was right when filed and
# the job has read wrong for two days, because nothing re-ran it. A one-command check
# that anybody can re-run is the difference between a finding and a standing claim.
#
# L0 IS THE MOST IMPORTANT CHECK IN THIS FILE AND IT IS A PRECONDITION, NOT A TEST.
# `git merge-base --is-ancestor` returns a FALSE NEGATIVE in a shallow clone, which this
# project has already recorded as jobs/the-is-ancestor-instrument-returns-false-negatives-
# in-a-shallow-clone-2026-10-01. A shallow clone is a normal state in this sandbox. So an
# unguarded run of exactly the check this job asks for would report every payload as
# unlanded, which is the alarming direction, and the reader would believe it. L0 exits 2
# rather than 1: "I could not measure" is not "it failed".
#
# ONE KNOWN LIMITATION, MEASURED ON THE REAL TWELVE AND WRITTEN DOWN RATHER THAN LEFT
# FOR THE NEXT READER TO REDISCOVER. The claim parser takes every hex token of sha
# length out of the free-text integrationResult, so it also picks up things that are
# hex but are not commits - on the real pile it took `fb10dbef9591`, which is a BUNDLE
# MD5 that lane 1 wrote into its own result sentence. That token is not an object in any
# clone, so it lands in L2b as UNMEASURABLE (INFO) and not in L2 as a non-ancestor
# (FAIL), which is why L2b exists as a separate line instead of being folded into L2.
# The fix for this is not a cleverer regex: it is step (3) of this file's own job -
# a typed `landedSha` field - after which the parser can read one field instead of
# guessing at a paragraph. Until then the parser is deliberately generous and the
# unmeasurable bucket carries the cost.
#
# WHAT THIS IS NOT. It is not a gate. It lives in gates/audit/, so gates.sh's
# gates/regress/*.js glob cannot reach it and GATES GREEN is unaffected either way. It
# applies nothing, pushes nothing, needs no network beyond the fetch the caller already
# did, and never writes to the repository it reads.
#
# L9 ADDED 2026-10-09 BY process-build LANE 1, run process-build-1__1791506104304, AND IT IS
# A THIRD DELIVERY ARM RATHER THAN A TWEAK TO THE TWO ABOVE.
#
#   L9-NEW-FILE-ON-MAIN   for every payload that ADDS a file, is that path in
#                         `git ls-tree -r --name-only origin/main`.
#   L9b-NEW-FILE-POPULATION  how many payloads add a file at all. ITS OWN LINE,
#                         never a conjunct of L9, because `for` over nothing and
#                         `every()` over nothing both report success loudest
#                         exactly when the thing they guard has disappeared.
#
# WHY A THIRD ARM, MEASURED ON THE LIVE PILE AND NOT REASONED FROM THE SOURCE.
# Run over all 43 documents of collection `patches` at origin/main 9cec233 in a
# complete clone, THIS FILE AS IT STANDS ON MAIN REPORTS L4a-NO-FALSE-DELIVERY
# **PASS** - while SEVEN payloads that carry an integrationResult each add a new
# file that is not among origin/main's 528 tracked paths:
#   proc-lane2-art-gates-audit-pipefail-grep-sh-2026-10-07        gates/audit/pipefail-grep.sh
#   proc-lane3-art-gates-audit-all-sh-2026-10-07                  gates/audit-all.sh
#   proc-lane3-art-gates-audit-r19-phone-geometry-sh-2026-10-07    gates/audit/r19-phone-geometry.sh
#   proc-lane3-art-gates-audit-red-count-sh-2026-10-07             gates/audit/red-count.sh
#   proc-lane3-art-gates-audit-stamp-regex-selftest-sh-2026-10-07  gates/audit/stamp-regex-selftest.sh
#   proc-lane3-art-gates-regress-19-review-grade-counts-js-2026-10-08  gates/audit/require-resolve.sh
#   proc-lane4-art-gates-audit-story-join-sh-2026-10-07            gates/audit/story-join.sh
#
# AND THE REASON IS NOT A VACUITY, WHICH IS WHAT THIS ARM'S AUTHOR ASSUMED FIRST
# AND THEN MEASURED. Every one of the seven reads `content=NOT-ON-MAIN |
# ancestry=ALL | delivered=yes by ancestry`. The ancestry arm scrapes hex tokens
# out of the free-text integrationResult, and all seven quote the integration
# run's own base - `97393a6` and `dee3ce0` - which are commits OF origin/main and
# are therefore ancestors of it BY CONSTRUCTION. So `anc_ok` is non-zero, the
# ancestry arm reads ALL, and it OVERRIDES the content arm's correct reading of
# absence. The claim is confirmed by main's own history rather than by the
# payload's. This file's header above calls that parser "deliberately generous"
# and says the unmeasurable bucket carries the cost; it does not. The cost is a
# false PASS on the one verdict this file exists for.
#
# A NEW FILE IS THE ONLY DELIVERY QUESTION THAT IS DECIDABLE OUTRIGHT. It needs
# no 3-way, no base, and no sha: either the path is in the tree or it is not, so
# no token scraped out of prose can confirm it. That is why MISSING here
# OVERRIDES both other arms rather than joining a vote. A modification is not
# decidable this cheaply, and the 14 payloads that claim integration while only
# MODIFYING a file are NOT covered by this arm - stated so nobody reads a green
# L9 as a clean pile [R18].
#
# Written by process-build lane 3, run process-build-3__1791282388056, 2026-10-06.
# The PROSE half of its job - step (3), typing `integrationResult` so presence cannot
# read as delivery - is a schema change in prompts/* and is the orchestrator's under
# R17. It is NOT in this patch, so the job is fixed-in-part and not fixed.
#
# USAGE
#   landed-on-main.sh <doc-dir> <repo-dir>
#   landed-on-main.sh --selftest
#
#   <doc-dir>   a directory of JSON files, one per document in collection `patches`,
#               in the exact shape ArtifactData's out_dir writes: the document's own
#               fields at the top level, including `patch`, `artefact`, `baseSha` and
#               `integrationResult` where present. The FILENAME less .json is used as
#               the document id in the report.
#   <repo-dir>  a COMPLETE (non-shallow) clone whose origin/main has been fetched by
#               the caller. Required - there is no repo-less mode, because every
#               question in this file is a question about main.
#
# EXIT 0 only when every applicable check passed. 1 on any FAIL. 2 when the measurement
# could not be made at all (bad usage, shallow clone, no origin/main, nothing to read).
#
# IT LEAVES ITS SELFTEST SCRATCH BEHIND, ON PURPOSE. The scratch lives under mktemp -d
# and is a few kilobytes; no line in this file deletes a path built from a variable,
# because a selftest is not worth the class of accident that `rm -rf "$VAR"/...` is.

set -u

FAILED=0
say()  { printf '%-26s %-5s %s\n' "$1" "$2" "$3"; }
pass() { say "$1" PASS "$2"; }
fail() { say "$1" FAIL "$2"; FAILED=1; }
info() { say "$1" INFO "$2"; }

# ---------------------------------------------------------------------------
# JSON field reader. The documents are machine-written JSON with embedded
# newlines in `patch`, so this is python3 and not grep. A missing python3 is an
# EXIT 2, not a FAIL: it is an inability to measure.
# ---------------------------------------------------------------------------
PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1; then PY="$c"; break; fi
done

json_field() {   # json_field <file> <field>  -> prints value, empty if absent
  "$PY" -I -c '
import json,sys
try:
    d=json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
v=d.get(sys.argv[2])
if v is None: sys.exit(0)
sys.stdout.write(v if isinstance(v,str) else json.dumps(v))
' "$1" "$2" 2>/dev/null
}

# Every 7-to-40 character hex token in a string, one per line, de-duplicated and
# sorted. Written in python rather than awk ON PURPOSE: verify-patch-set.sh's own
# header records that mawk ignores interval expressions without --re-interval, so
# /[0-9a-f]{7,40}/ matched NOTHING on this sandbox and a real check reported a
# vacuous PASS. Same class, avoided by not using awk for this at all.
shas_in() {
  "$PY" -I -c '
import re,sys
s=sys.argv[1]
out=set()
for m in re.finditer(r"\b[0-9a-f]{7,40}\b", s):
    t=m.group(0)
    if len(t) in (7,8,9,10,11,12,40): out.add(t)
print("\n".join(sorted(out)))
' "$1" 2>/dev/null
}

# Every path a patch ADDS, one per line, de-duplicated and sorted. python rather
# than awk/sed for the same reason shas_in is: the patch body is a multi-line
# field and this sandbox's awk ignores interval expressions. The pairing is
# positional and deliberately tight - a `new file mode` line is matched to the
# nearest preceding `diff --git` header within three lines - so a `deleted file
# mode` or a plain modification contributes nothing.
newfiles_in() {
  "$PY" -I -c '
import re,sys
lines=sys.argv[1].split("\n")
out=set()
for n,l in enumerate(lines):
    if not l.startswith("new file mode"): continue
    for k in range(n-1,max(-1,n-4),-1):
        m=re.match(r"diff --git a/(.+) b/(.+)$",lines[k])
        if m:
            out.add(m.group(2)); break
print("\n".join(sorted(out)))
' "$1" 2>/dev/null
}

# ---------------------------------------------------------------------------
audit() {
  local docdir="$1" repo="$2"
  FAILED=0

  # ---- L0  PRECONDITION: the instrument works in this clone at all ----
  if [ ! -d "$repo/.git" ] && [ ! -f "$repo/.git" ]; then
    say L0-REPO-IS-A-CLONE SKIP "not a git clone: $repo"
    return 2
  fi
  local shallow
  shallow=$(git -C "$repo" rev-parse --is-shallow-repository 2>/dev/null || echo unknown)
  if [ "$shallow" != "false" ]; then
    say L0-CLONE-NOT-SHALLOW SKIP "rev-parse --is-shallow-repository = $shallow. --is-ancestor returns FALSE NEGATIVES here [jobs/the-is-ancestor-instrument-returns-false-negatives-in-a-shallow-clone-2026-10-01]. Run git fetch --unshallow and re-run. MEASURED NOTHING."
    return 2
  fi
  pass L0-CLONE-NOT-SHALLOW "complete clone, --is-ancestor is trustworthy"

  local mainsha
  mainsha=$(git -C "$repo" rev-parse --verify -q origin/main 2>/dev/null || true)
  if [ -z "$mainsha" ]; then
    say L0b-ORIGIN-MAIN-EXISTS SKIP "no origin/main in $repo - fetch it before running. MEASURED NOTHING."
    return 2
  fi
  pass L0b-ORIGIN-MAIN-EXISTS "origin/main = $mainsha"

  if [ ! -d "$docdir" ]; then
    say L0c-DOCDIR-READABLE SKIP "not a directory: $docdir"
    return 2
  fi

  local tmp
  tmp=$(mktemp -d) || { say L0d-TMPDIR SKIP "cannot mktemp"; return 2; }

  # The one listing the new-file arm reads, taken ONCE so the report cannot drift
  # mid-run. An UNREADABLE listing must never read as "nothing is missing": it
  # sets nf_readable=0 and L9 then says it measured nothing [R18].
  local treefile="$tmp/origin-main-tree.txt"
  git -C "$repo" ls-tree -r --name-only origin/main > "$treefile" 2>/dev/null || true
  [ -s "$treefile" ] || nf_readable=0

  local f id ir patchbody artefact nshas s content
  local total=0 withpatch=0 withir=0
  local naive_pile=0 true_undelivered=0
  local L1_NOSHA="" L2_NOTANC="" L2_ABSENT="" L4A="" L4B="" L4C="" L3_INDET=""
  local n1=0 n2=0 n2b=0 n4a=0 n4b=0 n4c=0 n3=0
  # L9: the new-file arm. nf_pop is the DENOMINATOR and is reported on its own
  # line; n9 is the breach count among payloads that claim integration.
  local L9_MISSING="" L9_OUTSTANDING="" n9=0 n9o=0 nf_pop=0 nf_sites=0 nf_readable=1

  for f in $(ls -1 "$docdir"/*.json 2>/dev/null | sort); do
    total=$((total+1))
    id=$(basename "$f" .json)
    patchbody=$(json_field "$f" patch)
    [ -n "$patchbody" ] || continue
    withpatch=$((withpatch+1))
    ir=$(json_field "$f" integrationResult)
    artefact=$(json_field "$f" artefact)
    printf '%s' "$patchbody" > "$tmp/$id.patch"

    # ---- L9  THE NEW-FILE ARM, PER DOCUMENT. ----
    # nf=NONE         this payload adds no file; this arm says nothing about it
    # nf=ALL-PRESENT  every path it adds is in origin/main's tree
    # nf=MISSING      at least one path it adds is NOT, and that is not a
    #                 judgement, an inference or a 3-way: it is absence.
    local nf=NONE nfmiss="" nfp
    if [ "$nf_readable" -eq 1 ]; then
      while IFS= read -r nfp; do
        [ -n "$nfp" ] || continue
        nf_sites=$((nf_sites+1))
        if ! grep -Fxq -- "$nfp" "$treefile"; then nfmiss="$nfmiss $nfp"; fi
      done <<< "$(newfiles_in "$patchbody")"
      if [ -n "$(newfiles_in "$patchbody")" ]; then
        nf_pop=$((nf_pop+1))
        if [ -n "$nfmiss" ]; then nf=MISSING; else nf=ALL-PRESENT; fi
      fi
    fi

    # ---- L3  PER-FILE RECONCILIATION, and this is the half the job's step (2)
    # ---- asks for. A PRESENT FILE IS NOT A LANDED CHANGE, so presence is not
    # ---- tested: the payload is REVERSE-applied against main's tree. If it
    # ---- reverse-applies, its content is already there, whatever any field says.
    content=INDETERMINATE
    if git -C "$repo" apply --reverse --check "$tmp/$id.patch" >/dev/null 2>&1; then
      content=ON-MAIN
    elif git -C "$repo" apply --check "$tmp/$id.patch" >/dev/null 2>&1; then
      content=NOT-ON-MAIN
    else
      n3=$((n3+1)); L3_INDET="$L3_INDET $id"
    fi

    [ -n "$ir" ] && withir=$((withir+1))
    [ -z "$ir" ] && naive_pile=$((naive_pile+1))

    # ---- L1 / L2  THE CLAIM, AND WHETHER IT IS TRUE ----
    # anc=ALL  every sha named is an ancestor of origin/main
    # anc=SOME-NOT at least one named sha is present and is NOT an ancestor
    # anc=NONE  nothing checkable was named, or no sha was named at all
    local anc=NONE anc_ok=0 anc_bad=0
    if [ -n "$ir" ]; then
      nshas=0
      while IFS= read -r s; do
        [ -n "$s" ] || continue
        nshas=$((nshas+1))
        if ! git -C "$repo" cat-file -e "$s" 2>/dev/null; then
          # Not the same thing as "not an ancestor", and conflating them is a
          # false FAIL: a sha from a container that is gone is unmeasurable here.
          n2b=$((n2b+1)); L2_ABSENT="$L2_ABSENT $id:$s"
        elif ! git -C "$repo" merge-base --is-ancestor "$s" origin/main 2>/dev/null; then
          n2=$((n2+1)); L2_NOTANC="$L2_NOTANC $id:$s"; anc_bad=$((anc_bad+1))
        else
          anc_ok=$((anc_ok+1))
        fi
      done <<< "$(shas_in "$ir")"
      if [ "$nshas" -eq 0 ]; then n1=$((n1+1)); L1_NOSHA="$L1_NOSHA $id"; fi
      if   [ "$anc_bad" -gt 0 ]; then anc=SOME-NOT
      elif [ "$anc_ok"  -gt 0 ]; then anc=ALL
      fi
    fi

    # ---- THE DELIVERY DECISION, AND IT HAS TWO INDEPENDENT ARMS. ----
    # THIS IS A BUG THIS FILE'S OWN FIRST REAL RUN FOUND IN ITSELF, recorded
    # rather than quietly fixed [R18]. The first draft decided delivery on the
    # content arm alone, so INDETERMINATE counted as undelivered "in the safe
    # direction". Run against the real twelve documents at origin/main f586fd2,
    # that printed PILE-DEPTH-TRUE 11 against a naive 5 - and SIX of those
    # eleven were payloads whose own claimed shas this same script had just
    # proved to be ancestors of main. Two arms of one script disagreeing is
    # worse than the gap it was written to close: the alarming number was the
    # wrong one, and "safe direction" is not a defence when the output is a
    # halt condition for four lanes. A payload is DELIVERED if EITHER arm shows
    # it: its content reverse-applies against main, OR every sha its own claim
    # names is an ancestor of main. INDETERMINATE with no ancestry evidence is
    # genuinely undecided and stays undelivered, which is where the safe
    # direction actually belongs.
    local delivered=no evidence=none
    if [ "$content" = "ON-MAIN" ]; then
      delivered=yes; evidence=content
    elif [ "$anc" = "ALL" ]; then
      delivered=yes; evidence=ancestry
    fi
    # L9 OVERRIDES BOTH ARMS, AND ONLY IN THE ONE DIRECTION IT CAN PROVE.
    # A path this payload creates is not in main's tree, so the payload did not
    # land - whatever reverse-apply could not decide and whatever sha its own
    # prose quotes. It can never override the other way: ALL-PRESENT does NOT
    # make an undelivered payload delivered, because a file can be created on
    # main by somebody else's commit.
    if [ "$nf" = "MISSING" ]; then
      delivered=no; evidence=new-file-absent
    fi
    [ "$delivered" = "yes" ] || true_undelivered=$((true_undelivered+1))

    info "DOC" "$id | artefact=${artefact:-<none>} | integrationResult=$([ -n "$ir" ] && echo present || echo absent) | content=$content | ancestry=$anc | newfile=$nf${nfmiss:+ (absent:$nfmiss)} | delivered=$delivered by $evidence"

    if [ "$nf" = "MISSING" ]; then
      if [ -n "$ir" ]; then n9=$((n9+1));  L9_MISSING="$L9_MISSING $id:${nfmiss# }"
      else                  n9o=$((n9o+1)); L9_OUTSTANDING="$L9_OUTSTANDING $id"; fi
    fi

    if [ -n "$ir" ]; then
      if [ "$content" = "NOT-ON-MAIN" ] && [ "$delivered" = "no" ]; then n4a=$((n4a+1)); L4A="$L4A $id"; fi
      if [ "$content" = "INDETERMINATE" ] && [ "$delivered" = "no" ]; then n4c=$((n4c+1)); L4C="$L4C $id"; fi
    else
      if [ "$delivered" = "yes" ]; then n4b=$((n4b+1)); L4B="$L4B $id"; fi
    fi
  done

  # ---- L6  VACUOUS-PASS GUARD. Exit 2, never 0, on an empty population. ----
  if [ "$total" -eq 0 ]; then
    say L6-POPULATION-NON-EMPTY SKIP "no *.json in $docdir - MEASURED NOTHING, and this is the state a green would be a lie in"
    return 2
  fi
  if [ "$withpatch" -eq 0 ]; then
    say L6-POPULATION-NON-EMPTY SKIP "$total document(s) read, NONE carrying a patch field - MEASURED NOTHING"
    return 2
  fi
  pass L6-POPULATION-NON-EMPTY "$withpatch of $total document(s) carry a patch field; $withir carry an integrationResult"

  # ---- the verdicts ----
  if [ "$n1" -eq 0 ]; then
    pass L1-CLAIM-NAMES-A-SHA "every integrationResult that claims anything names a sha"
  else
    fail L1-CLAIM-NAMES-A-SHA "$n1 integrationResult(s) carry NO sha, so the claim cannot be checked by anybody:$L1_NOSHA"
  fi

  if [ "$n2" -eq 0 ]; then
    pass L2-CLAIMED-SHA-ON-MAIN "no claimed sha is a non-ancestor of origin/main"
  else
    fail L2-CLAIMED-SHA-ON-MAIN "$n2 claimed sha(s) exist in this clone and are NOT ancestors of origin/main - applied to a branch, not landed:$L2_NOTANC"
  fi

  if [ "$n2b" -eq 0 ]; then
    pass L2b-CLAIMED-SHA-KNOWN "every claimed sha is an object this clone holds"
  else
    info L2b-CLAIMED-SHA-KNOWN "$n2b claimed sha(s) are not objects in this clone - UNMEASURABLE here, not failed; the commit may live only in a container that is gone:$L2_ABSENT"
  fi

  if [ "$n4a" -eq 0 ]; then
    pass L4a-NO-FALSE-DELIVERY "no document claims integration while its content is demonstrably absent from main"
  else
    fail L4a-NO-FALSE-DELIVERY "$n4a document(s) READ AS DELIVERED AND ARE NOT - the class this file was written for:$L4A"
  fi

  if [ "$n4c" -eq 0 ]; then
    pass L4c-CLAIM-IS-CHECKABLE "every claim of integration is confirmed by content or by ancestry"
  else
    fail L4c-CLAIM-IS-CHECKABLE "$n4c document(s) claim integration that NEITHER arm can confirm - content is indeterminate and no named sha is an ancestor of main, so the claim rests on prose alone:$L4C"
  fi

  if [ "$n4b" -eq 0 ]; then
    pass L4b-NO-SILENT-DELIVERY "no outstanding document's content is already on main"
  else
    fail L4b-NO-SILENT-DELIVERY "$n4b document(s) carry NO integrationResult while their work IS on main - they inflate the back-pressure pile and the slot will re-apply them [R42 class 5 at payload level]:$L4B"
  fi

  if [ "$n3" -eq 0 ]; then
    pass L3-CONTENT-DECIDABLE "every payload's content is decidably on or off main"
  else
    info L3-CONTENT-DECIDABLE "$n3 payload(s) neither apply nor reverse-apply against main's tree - main has moved under them and a 3-way is needed to tell; each is then decided by the ancestry arm instead, and only an indeterminate payload with no ancestry evidence counts as undelivered:$L3_INDET"
  fi

  # ---- L9  THE NEW-FILE ARM. Its denominator is printed FIRST and on its own
  # ---- line, so a green L9 over an empty population cannot be read as clean.
  if [ "$nf_readable" -ne 1 ]; then
    info L9b-NEW-FILE-POPULATION "origin/main's tree listing could not be read - MEASURED NOTHING on this arm"
    info L9-NEW-FILE-ON-MAIN     "MEASURED NOTHING on this arm"
  else
    info L9b-NEW-FILE-POPULATION "$nf_pop of $withpatch payload(s) add at least one file, $nf_sites added path(s) in all, against $(grep -c . "$treefile") path(s) tracked on origin/main"
    if [ "$nf_pop" -eq 0 ]; then
      info L9-NEW-FILE-ON-MAIN   "no payload in this population adds a new file - MEASURED NOTHING on this arm"
    elif [ "$n9" -eq 0 ]; then
      pass L9-NEW-FILE-ON-MAIN   "every path added by a payload that claims integration is on origin/main ($nf_pop payload(s) examined, $nf_sites added path(s))"
    else
      fail L9-NEW-FILE-ON-MAIN   "$n9 payload(s) CLAIM INTEGRATION AND ADD A FILE THAT IS NOT IN origin/main's TREE - a new file cannot half-land, so this is absence and not an inference, and it OUTRANKS any sha their prose quotes:$L9_MISSING"
    fi
    if [ "$n9o" -gt 0 ]; then
      info L9c-OUTSTANDING-ADDERS "$n9o payload(s) add a file that is not on main AND carry no integrationResult - correctly outstanding, listed so the integrator can see which pending payloads create files:$L9_OUTSTANDING"
    fi
  fi

  # ---- L5  THE TWO PILE DEPTHS, SIDE BY SIDE. This is the number the lanes halt
  # ---- on, against the number they ought to halt on.
  info L5-PILE-DEPTH-NAIVE "$naive_pile (documents with a patch field and no integrationResult - what prompts/process-build's back-pressure rule actually measures)"
  info L5-PILE-DEPTH-TRUE "$true_undelivered (documents whose content is NOT demonstrably on main)"
  if [ "$naive_pile" -eq "$true_undelivered" ]; then
    pass L5-PILE-DEPTHS-AGREE "both depths are $naive_pile, so the back-pressure number means what it says today"
  else
    fail L5-PILE-DEPTHS-AGREE "the guard reads $naive_pile and the truth is $true_undelivered - the back-pressure number is off by $((true_undelivered-naive_pile)) and lanes are halting, or not halting, on it"
  fi

  return $FAILED
}

# ---------------------------------------------------------------------------
# SELFTEST. Builds a throwaway repo and a FRESH throwaway doc directory per
# control, so every class below is exercised IN BOTH DIRECTIONS - a control that
# only ever fires one way cannot tell a working check from a stuck one.
# ---------------------------------------------------------------------------
selftest() {
  local T; T=$(mktemp -d) || { echo "cannot mktemp"; return 2; }
  local R="$T/repo" rc=0 n=0 ok=0 dseq=0
  local out D

  fresh_docdir() { dseq=$((dseq+1)); D="$T/docs$dseq"; mkdir -p "$D"; }

  check() {  # check <name> <expected-rc> <expected-grep-or-dash> <actual-rc> <outfile>
    n=$((n+1))
    local nm="$1" erc="$2" pat="$3" arc="$4" of="$5"
    if [ "$arc" != "$erc" ]; then
      printf '%-26s %-5s %s\n' "$nm" FAIL "expected rc $erc, got $arc"; return 0
    fi
    if [ "$pat" != "-" ] && ! grep -q -- "$pat" "$of"; then
      printf '%-26s %-5s %s\n' "$nm" FAIL "rc $arc correct but output lacks: $pat"; return 0
    fi
    printf '%-26s %-5s %s\n' "$nm" PASS "rc $arc, saw: $pat"; ok=$((ok+1)); return 0
  }

  # --- a repo with a main and a side branch ---
  mkdir -p "$R"; git -C "$R" init -q
  git -C "$R" config user.email a@b.c; git -C "$R" config user.name t
  mkdir -p "$R/gates/audit"
  printf 'base\n' > "$R/gates/audit/kept.js"
  git -C "$R" add -A; git -C "$R" commit -q -m base
  printf 'base\nlanded\n' > "$R/gates/audit/kept.js"
  git -C "$R" add -A; git -C "$R" commit -q -m landed
  local LANDED; LANDED=$(git -C "$R" rev-parse HEAD)
  git -C "$R" update-ref refs/remotes/origin/main HEAD
  git -C "$R" checkout -q -b side
  printf 'base\nlanded\nstranded\n' > "$R/gates/audit/kept.js"
  git -C "$R" add -A; git -C "$R" commit -q -m stranded
  local STRANDED; STRANDED=$(git -C "$R" rev-parse HEAD)
  git -C "$R" checkout -q "$LANDED" 2>/dev/null

  local P_LANDED="$T/p.landed" P_STRANDED="$T/p.stranded"
  git -C "$R" format-patch --stdout "$LANDED^..$LANDED"     > "$P_LANDED"
  git -C "$R" format-patch --stdout "$STRANDED^..$STRANDED" > "$P_STRANDED"

  mkdoc() {  # mkdoc <id> <patchfile> <integrationResult-or-empty>
    "$PY" -I -c '
import json,sys
d={"artefact":"gates/audit/kept.js","lane":"selftest","patch":open(sys.argv[2]).read()}
if sys.argv[3]: d["integrationResult"]=sys.argv[3]
json.dump(d,open(sys.argv[1],"w"))
' "$D/$1.json" "$2" "$3"
  }

  # ===================== C1 / C2  the shallow-clone precondition ============
  fresh_docdir; mkdoc d-landed "$P_LANDED" "APPLIED, commit $LANDED"
  out="$T/o1"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C1-COMPLETE-CLONE-RUNS 0 "L0-CLONE-NOT-SHALLOW       PASS" "$rc" "$out"
  if git clone -q --depth 1 "file://$R" "$T/shallow" 2>/dev/null; then
    out="$T/o2"; audit "$D" "$T/shallow" > "$out" 2>&1; rc=$?
    check C2-SHALLOW-CLONE-EXIT2 2 "MEASURED NOTHING" "$rc" "$out"
  else
    printf '%-26s %-5s %s\n' C2-SHALLOW-CLONE-EXIT2 SKIP "could not build a shallow clone here"
  fi

  # ===================== C3 / C4  L4a, both directions =====================
  fresh_docdir; mkdoc d-false "$P_STRANDED" "APPLIED, commit $STRANDED"
  out="$T/o3"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C3-FALSE-DELIVERY-CAUGHT 1 "L4a-NO-FALSE-DELIVERY      FAIL" "$rc" "$out"
  fresh_docdir; mkdoc d-true "$P_LANDED" "APPLIED, commit $LANDED"
  out="$T/o4"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C4-TRUE-DELIVERY-PASSES 0 "L4a-NO-FALSE-DELIVERY      PASS" "$rc" "$out"

  # ===================== C5 / C6  L2, both directions ======================
  fresh_docdir; mkdoc d-branch "$P_STRANDED" "APPLIED, commit $STRANDED on claude/side"
  out="$T/o5"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C5-BRANCH-SHA-CAUGHT 1 "L2-CLAIMED-SHA-ON-MAIN     FAIL" "$rc" "$out"
  fresh_docdir; mkdoc d-mainsha "$P_LANDED" "APPLIED, commit $LANDED on main"
  out="$T/o6"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C6-MAIN-SHA-PASSES 0 "L2-CLAIMED-SHA-ON-MAIN     PASS" "$rc" "$out"

  # ===================== C7  L1  a claim with no sha =======================
  fresh_docdir; mkdoc d-nosha "$P_LANDED" "ALREADY ON MAIN BEFORE THIS RUN TOUCHED IT"
  out="$T/o7"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C7-SHALESS-CLAIM-CAUGHT 1 "L1-CLAIM-NAMES-A-SHA       FAIL" "$rc" "$out"

  # ===================== C8  L2b  a sha this clone does not hold ===========
  # UNMEASURABLE, and it must NOT be reported as a non-ancestor: that would be a
  # false FAIL on a payload from a container that is gone.
  fresh_docdir; mkdoc d-unknown "$P_LANDED" "APPLIED, commit deadbee1234 on a dead container"
  out="$T/o8"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C8-UNKNOWN-SHA-IS-INFO 0 "L2b-CLAIMED-SHA-KNOWN      INFO" "$rc" "$out"

  # ===================== C9 / C10  L4b  silent delivery ====================
  fresh_docdir; mkdoc d-silent "$P_LANDED" ""
  out="$T/o9"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C9-SILENT-DELIVERY-CAUGHT 1 "L4b-NO-SILENT-DELIVERY     FAIL" "$rc" "$out"
  fresh_docdir; mkdoc d-outstanding "$P_STRANDED" ""
  out="$T/o10"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C10-OUTSTANDING-PASSES 0 "L4b-NO-SILENT-DELIVERY     PASS" "$rc" "$out"

  # ===================== C11  L5  the two depths disagree ==================
  fresh_docdir; mkdoc d-out "$P_STRANDED" ""; mkdoc d-mark "$P_STRANDED" "APPLIED, commit $STRANDED"
  out="$T/o11"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C11-DEPTHS-DISAGREE 1 "L5-PILE-DEPTHS-AGREE       FAIL" "$rc" "$out"

  # ===================== C12 / C13  the vacuous-pass guards ================
  fresh_docdir
  out="$T/o12"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C12-EMPTY-DIR-EXIT2 2 "L6-POPULATION-NON-EMPTY    SKIP" "$rc" "$out"
  fresh_docdir
  "$PY" -I -c 'import json,sys;json.dump({"lane":"selftest","notes":"no patch field"},open(sys.argv[1],"w"))' "$D/d-nopatch.json"
  out="$T/o13"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C13-NO-PATCH-FIELD-EXIT2 2 "NONE carrying a patch field" "$rc" "$out"

  # ===================== C14  no origin/main ===============================
  local N="$T/nomain"; mkdir -p "$N"; git -C "$N" init -q
  git -C "$N" config user.email a@b.c; git -C "$N" config user.name t
  printf 'x\n' > "$N/f"; git -C "$N" add -A; git -C "$N" commit -q -m x
  fresh_docdir; mkdoc d-landed "$P_LANDED" "APPLIED, commit $LANDED"
  out="$T/o14"; audit "$D" "$N" > "$out" 2>&1; rc=$?
  check C14-NO-ORIGIN-MAIN-EXIT2 2 "L0b-ORIGIN-MAIN-EXISTS     SKIP" "$rc" "$out"

  # ===================== C15  not a clone at all ===========================
  out="$T/o15"; audit "$D" "$T/nosuchclone" > "$out" 2>&1; rc=$?
  check C15-NOT-A-CLONE-EXIT2 2 "L0-REPO-IS-A-CLONE         SKIP" "$rc" "$out"

  # ===================== C18 / C19  THE TWO-ARM DELIVERY DECISION ==========
  # The bug this file found in itself. Fixture: a repo whose main has MOVED past
  # the payload's base, so the content arm returns INDETERMINATE and only the
  # ancestry arm can decide. Both directions are controlled.
  local M="$T/moved"
  git clone -q "$R" "$M" 2>/dev/null
  git -C "$M" config user.email a@b.c; git -C "$M" config user.name t
  git -C "$M" checkout -q -B movedmain "$LANDED"
  printf 'base\nlanded\nmoved-on\nagain\n' > "$M/gates/audit/kept.js"
  git -C "$M" add -A; git -C "$M" commit -q -m moved
  git -C "$M" update-ref refs/remotes/origin/main HEAD
  # C18: content INDETERMINATE but the claimed sha IS an ancestor -> DELIVERED,
  # and the pile depths must therefore AGREE (naive 0, true 0).
  fresh_docdir; mkdoc d-anc "$P_LANDED" "APPLIED, commit $LANDED"
  out="$T/o18"; audit "$D" "$M" > "$out" 2>&1; rc=$?
  check C18-ANCESTRY-ARM-DELIVERS 0 "delivered=yes by ancestry" "$rc" "$out"
  # C19: the same indeterminate content with a claim naming NO ancestor must stay
  # undelivered and be reported as an unconfirmable claim, not waved through.
  fresh_docdir; mkdoc d-noanc "$P_LANDED" "APPLIED to the branch, commit $STRANDED"
  out="$T/o19"; audit "$D" "$M" > "$out" 2>&1; rc=$?
  check C19-NO-ANCESTRY-STAYS-UNDEL 1 "L4c-CLAIM-IS-CHECKABLE     FAIL" "$rc" "$out"

  # ===================== C27 to C31  L9, THE NEW-FILE ARM ==================
  # A SEPARATE FIXTURE REPO, so none of C1 to C19's expectations move: every
  # patch above modifies one tracked file and adds nothing, so on those controls
  # nf_pop is 0 and L9 correctly says it measured nothing.
  local NFR="$T/nfrepo"
  git clone -q "$R" "$NFR" 2>/dev/null
  git -C "$NFR" config user.email a@b.c; git -C "$NFR" config user.name t
  git -C "$NFR" checkout -q -B nfmain "$LANDED"
  mkdir -p "$NFR/gates/audit"
  printf 'present\n' > "$NFR/gates/audit/present.js"
  git -C "$NFR" add -A; git -C "$NFR" commit -q -m 'adds present.js'
  local NFPRESENT; NFPRESENT=$(git -C "$NFR" rev-parse HEAD)
  git -C "$NFR" update-ref refs/remotes/origin/main HEAD
  git -C "$NFR" checkout -q -b nfside
  printf 'absent\n' > "$NFR/gates/audit/absent.js"
  git -C "$NFR" add -A; git -C "$NFR" commit -q -m 'adds absent.js'
  local NFABSENT; NFABSENT=$(git -C "$NFR" rev-parse HEAD)
  git -C "$NFR" checkout -q "$NFPRESENT" 2>/dev/null
  local P_ADDS_ABSENT="$T/p.adds_absent" P_ADDS_PRESENT="$T/p.adds_present"
  git -C "$NFR" format-patch --stdout "$NFABSENT^..$NFABSENT"   > "$P_ADDS_ABSENT"
  git -C "$NFR" format-patch --stdout "$NFPRESENT^..$NFPRESENT" > "$P_ADDS_PRESENT"

  # C27 / C27b: THE EXACT LIVE CASE. The payload adds a file that is NOT on
  # main, and its claim quotes MAIN'S OWN SHA - which is an ancestor by
  # construction, so before this arm existed the ancestry arm read ALL and
  # called it delivered. L9 must fail, and L4a must now fire with it.
  fresh_docdir; mkdoc d-adds-absent "$P_ADDS_ABSENT" "APPLIED onto origin/main $NFPRESENT, measured and parked again"
  out="$T/o27"; audit "$D" "$NFR" > "$out" 2>&1; rc=$?
  check C27-ADDED-FILE-ABSENT     1 "L9-NEW-FILE-ON-MAIN        FAIL" "$rc" "$out"
  check C27b-ANCESTRY-NO-LONGER-WINS 1 "delivered=no by new-file-absent" "$rc" "$out"
  check C27c-L4A-NOW-FIRES        1 "L4a-NO-FALSE-DELIVERY      FAIL" "$rc" "$out"

  # C28: the other direction. Same shape of payload, but the file it adds IS on
  # main, so L9 passes and the arm is shown able to return both answers.
  fresh_docdir; mkdoc d-adds-present "$P_ADDS_PRESENT" "APPLIED, commit $NFPRESENT"
  out="$T/o28"; audit "$D" "$NFR" > "$out" 2>&1; rc=$?
  check C28-ADDED-FILE-PRESENT    0 "L9-NEW-FILE-ON-MAIN        PASS" "$rc" "$out"

  # C29: THE DENOMINATOR. A population in which nothing adds a file must report
  # that it measured nothing, and must NOT print a PASS - the empty-collection
  # trap this project records as a class.
  fresh_docdir; mkdoc d-modify-only "$P_LANDED" "APPLIED, commit $LANDED"
  out="$T/o29"; audit "$D" "$R" > "$out" 2>&1; rc=$?
  check C29-NO-ADDERS-MEASURES-0  0 "no payload in this population adds a new file" "$rc" "$out"

  # C30: an adder with NO integrationResult is correctly outstanding, not a
  # false delivery, so it goes to L9c and L9 still passes over the claimers.
  fresh_docdir; mkdoc d-adds-absent-noir "$P_ADDS_ABSENT" ""
  out="$T/o30"; audit "$D" "$NFR" > "$out" 2>&1; rc=$?
  check C30-OUTSTANDING-ADDER-INFO 0 "L9c-OUTSTANDING-ADDERS     INFO" "$rc" "$out"

  # C31: the extractor itself, both directions, on the function and not through
  # a report - C17's shape. A `new file mode` must bind to its own header, and a
  # modify-only patch must contribute nothing at all.
  n=$((n+1))
  local nf_pos nf_neg
  nf_pos=$(newfiles_in "$(cat "$P_ADDS_ABSENT")")
  nf_neg=$(newfiles_in "$(cat "$P_LANDED")")
  if [ "$nf_pos" = "gates/audit/absent.js" ] && [ -z "$nf_neg" ]; then
    printf '%-26s %-5s %s\n' C31-ADD-EXTRACTOR-WORKS PASS "finds the added path, finds none in a modify-only patch"; ok=$((ok+1))
  else
    printf '%-26s %-5s %s\n' C31-ADD-EXTRACTOR-WORKS FAIL "positive gave [$nf_pos], negative gave [$nf_neg]"
  fi

  # ===================== C16  determinism of the report ====================
  # Byte-identical output on repeated runs over one input [R36]. A report whose
  # order wanders cannot be diffed, and a check nobody can diff is a check
  # nobody re-runs.
  fresh_docdir; mkdoc d-a "$P_LANDED" "APPLIED, commit $LANDED"; mkdoc d-b "$P_STRANDED" ""
  audit "$D" "$R" > "$T/r1" 2>&1 || true
  audit "$D" "$R" > "$T/r2" 2>&1 || true
  audit "$D" "$R" > "$T/r3" 2>&1 || true
  n=$((n+1))
  if cmp -s "$T/r1" "$T/r2" && cmp -s "$T/r2" "$T/r3"; then
    printf '%-26s %-5s %s\n' C16-REPORT-DETERMINISTIC PASS "three runs byte-identical"; ok=$((ok+1))
  else
    printf '%-26s %-5s %s\n' C16-REPORT-DETERMINISTIC FAIL "output differs between runs"
  fi

  # ===================== C17  the sha extractor is not awk-broken ==========
  # verify-patch-set.sh's own header records an interval-expression bug that made a
  # real check report a vacuous PASS. Both directions, on the extractor itself.
  n=$((n+1))
  local got_pos got_neg
  got_pos=$(shas_in "APPLIED, commit 1234abc and 0123456789abcdef0123456789abcdef01234567")
  got_neg=$(shas_in "APPLIED, no sha here at all, zzz, 123, and GHIJKLM")
  if [ "$(printf '%s\n' "$got_pos" | grep -c .)" -eq 2 ] && [ -z "$got_neg" ]; then
    printf '%-26s %-5s %s\n' C17-SHA-EXTRACTOR-WORKS PASS "finds 7 and 40 char shas, finds none in sha-less text"; ok=$((ok+1))
  else
    printf '%-26s %-5s %s\n' C17-SHA-EXTRACTOR-WORKS FAIL "positive gave [$got_pos], negative gave [$got_neg]"
  fi

  echo
  echo "landed-on-main.sh selftest: $ok PASS / $((n-ok)) FAIL  (of $n controls)"
  echo "scratch left at $T (nothing in this file deletes a variable-built path)"
  [ "$ok" -eq "$n" ]
}

# ---------------------------------------------------------------------------
if [ -z "$PY" ]; then
  echo "landed-on-main.sh: no python3 - the documents are JSON with embedded newlines and cannot be read without it. MEASURED NOTHING." >&2
  exit 2
fi

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  "" ) echo "usage: landed-on-main.sh <doc-dir> <repo-dir> | --selftest" >&2; exit 2 ;;
esac
if [ $# -ne 2 ]; then
  echo "usage: landed-on-main.sh <doc-dir> <repo-dir> | --selftest" >&2; exit 2
fi
audit "$1" "$2"
exit $?
