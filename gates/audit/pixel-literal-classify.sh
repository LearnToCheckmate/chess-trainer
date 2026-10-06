#!/bin/sh
# gates/audit/pixel-literal-classify.sh — WHICH OF THE SUITE'S PINNED LAYOUT LITERALS CAN MOVE WITH THE FONT.
#
# Seeded #481, 2026-10-06, for the one thing
# jobs/the-suites-absolute-pixel-pins-are-container-dependent-so-this-container-cannot-gate-any-tree-2026-10-06
# names TWICE as uncounted and as "the number an owner actually needs":
#   classSwept.ANDWHYITISNOTSUFFICIENT - "24 OF THE 33 CLASS MEMBERS WENT GREEN, so carrying a >=100 literal is
#   necessary-ish and plainly not sufficient ... the at-risk set is the subset whose literal descends from a text
#   measurement, and THAT subset is still uncounted. I did not separate them, and separating them is a per-literal
#   reading of 123 sites rather than a grep."
#
# WHY A SECOND INSTRUMENT RATHER THAN A RE-RUN OF THE FIRST. #480's published count is 33 of 55 files and
# 123 literals, by "a hard-coded number >= 100". RE-DERIVED at f586fd2 this run the count is 42 of 55 files
# and 378 pinned sites, and the band is wrong because MAGNITUDE IS NOT THE PROPERTY THAT MATTERS:
#
#   UNDER-INCLUSIVE, AND THIS IS THE WHOLE OF THE CORRECTION. 180 of the 378 sites are literals BELOW 100,
#   so a magnitude band cannot see them, and THREE OF #479's OWN RED SECTIONS FAILED ON ONE:
#     49-home.js:670    near(s.h,68)  - "TC-HM-038 the streak card is 68 tall"; it measured 69.
#     39-pz-streak.js   the same 68-against-69 card.
#     40-reachability.js:313  const want=[{w:119,x:4},{w:93,x:148},{w:105,x:266}]  - the Z-06 header pin.
#     46-play.js:100    PP={se:{bw:272,bx:24,by:63,...}}  - the by/bx terms are 63 and 24.
#   A text-metric shift moves a 68px text box exactly as readily as a 268px one.
#
#   AND A SECOND SHAPE THE BAND MISSES, found only by control: tables keyed the OTHER way round, by
#   GEOMETRY, with the pinned quantity as the value - WANT={kunal:375,'390':390,se:259} (12-hint.js:16) and
#   WANTB={'320x568':259,'360x640':331,...} (57-pz-solved-explanation.js:159). Those two files hold the
#   failing assertions of two red sections and a key-name filter drops them silently.
#
# A CAUTION ON METHOD RATHER THAN A CHARGE AGAINST #480's NUMBER, because the first draft of this header
# got this backwards and the control caught it. A RAW grep of 3-or-more-digit tokens returns 751 tokens for
# gates/regress/48-lesson-flow.js and 265 for 45-play-setup.js, almost all of it COMMENT PROSE - chess.jsx
# line references, the year 2026, case ids, settle timeouts. This script reports 28 and 19 for those files,
# which is MORE than #480's published 20 and 7, not fewer. So #480 plainly did not simply count comments,
# and the first draft of this header said it reported 3 for 48-lesson-flow and implied it had - that figure
# came from a buggy earlier version of THIS script which dropped geometry-keyed tables, and it is WITHDRAWN
# here rather than left in a committed file [R18]. The durable point is only that comments must be stripped
# BEFORE matching, which this script does structurally, so prose can never reach the count.
#
# THE PREDICATE, STATED BEFORE THE COUNT [R06, R07]:
#   A PINNED LAYOUT LITERAL is a numeric literal, of any magnitude, that is compared against a MEASURED quantity
#   (a rect field .w/.h/.top/.left/.bottom/.right/.x/.y, a *Width/*Height, a scroll/client/offset dimension),
#   either directly, or through a named table whose identifier is used in such a comparison. Comments are stripped
#   before matching, so prose is structurally excluded rather than filtered.
#   An assertion comparing TWO MEASURED values ("the board does not move", before.w vs after.w) is NOT a member:
#   both sides move together, so it is container-INDEPENDENT. That distinction is the whole point of the class and
#   it is why a raw grep cannot produce this number.
#
# AND KNOW WHAT THIS SCRIPT DOES NOT DECIDE. It counts and classifies PROVENANCE by the key the literal is
# written under and by the assertion text around it. Whether a given box's size truly descends from a text
# measurement is a per-site reading, and the HEURISTIC column says which way this script guessed. The
# empirical column is the one to trust: it joins each file against the sections that actually reddened in
# #479's full run, which is ground truth from a container where the fonts differ.
#
# DO NOT USE THIS TO RE-PIN ANYTHING. Re-pinning 375 to 361 is forbidden by this job, by gate 40's job and by
# CLAUDE.md; making the pins RELATIVE is test-authoring's and must not be done by a run holding the pen to
# unblock itself. This script exists to SIZE the problem, not to solve it.
#
# USAGE:  sh gates/audit/pixel-literal-classify.sh [--json] [repo-root]
# Reachable from no suite run by design: it is an audit tool, not a gate. Adding a "=== " section to the suite
# would break the roster arm of gates/verify-log.sh - see jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28.
set -eu
JSON=0
if [ "${1:-}" = "--json" ]; then JSON=1; shift; fi
ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
[ -d "$ROOT/gates/regress" ] || { echo "no gates/regress under $ROOT" >&2; exit 2; }

CLASSIFY_JSON="$JSON" CLASSIFY_ROOT="$ROOT" node - <<'JS'
const fs=require('fs'),path=require('path');
const ROOT=process.env.CLASSIFY_ROOT, ASJSON=process.env.CLASSIFY_JSON==='1';
const DIR=path.join(ROOT,'gates','regress');
const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.js')).sort();

// #479's full-run red sections, from claude/agents/gatelogs/479-all.log as recorded on the job. GROUND TRUTH
// from a container whose fonts differ, which is the only empirical discriminator anyone has.
const RED_479={'12-hint.js':2,'26-invariants.js':38,'39-pz-streak.js':1,'40-reachability.js':1,
  '45-play-setup.js':6,'46-play.js':3,'48-lesson-flow.js':15,'49-home.js':2,
  '57-pz-solved-explanation.js':6,'72-drill-prev.js':2,'52-drill-grades-the-move.js':4};
// The two #479 itself identified as NOT container artefacts (its own arithmetic defect and the drill reserve).
const NOT_CONTAINER=new Set(['52-drill-grades-the-move.js','72-drill-prev.js']);

const MEAS=String.raw`(?:\.w\b|\.h\b|\.top\b|\.left\b|\.bottom\b|\.right\b|\.x\b|\.y\b|[Ww]idth|[Hh]eight|scrollW|scrollH|clientW|clientH|offsetW|offsetH|\.bw\b|\.bx\b|\.by\b)`;
const MEASRE=new RegExp(MEAS);
// Keys that name a laid-out quantity. A literal written under one of these IS a layout pin.
const LAYOUT_KEY=/^(w|h|x|y|top|left|bottom|right|bw|bx|by|barW|barH|colW|sh|travel|cw|ch|width|height)$/;
// A table may be keyed the OTHER way round - by geometry, with the pinned quantity as the value:
//   WANT={kunal:375,'390':390,se:259}   (gates/regress/12-hint.js:16)
// Dropping these was a real bug in this script's first draft: it reported ONE site for 12-hint, whose
// whole failing assertion is that table. Caught by controlling against a file whose contents I had read.
// Keys are spelled THREE ways across the suite and all three had to be found by control rather than
// guessed: the GEOS names (kunal, kunal730, se, '390'), a bare width ('375'), and a geometry LABEL
// ('320x568', '375x730 KUNAL'). The label form is how gates/regress/57-pz-solved-explanation.js:159
// writes it - WANTB={'320x568':259,'360x640':331,...} - and missing it made CONTROL 1 fail on the one
// file whose six reds are all one-pixel pin moves. Found because the control named the file.
const GEO_KEY=/^(kunal|kunal730|kunal761|se|390|430|320|375|short375|wide|\d{3,4}x\d{3,4}(?:\s+.*)?)$/;

function stripComments(s){
  let o='',st=0;
  for(let i=0;i<s.length;i++){const c=s[i],n=s[i+1];
    if(st===0){ if(c==='/'&&n==='/'){st=1;o+=' ';i++;} else if(c==='/'&&n==='*'){st=2;o+=' ';i++;} else o+=c; }
    else if(st===1){ if(c==='\n'){st=0;o+='\n';} else o+=' '; }
    else { if(c==='*'&&n==='/'){st=0;o+='  ';i++;} else o+=(c==='\n'?'\n':' '); } }
  return o;
}
function lineAt(s,p){ let n=1; for(let i=0;i<p&&i<s.length;i++) if(s[i]==='\n') n++; return n; }
function balanced(s,i){ const op=s[i],cl=op==='{'?'}':']'; let d=0;
  for(let k=i;k<s.length;k++){ if(s[k]===op)d++; else if(s[k]===cl){d--; if(!d)return k;} } return -1; }

const rows=[];
for(const f of files){
  const raw=fs.readFileSync(path.join(DIR,f),'utf8');
  const src=stripComments(raw);
  const rawLines=raw.split('\n');
  const seen=new Set();
  const push=(pos,lit,how,key,tbl)=>{
    // A ZERO IS A SIGN TEST, NOT A PIN. `after.top>=0`, `filled.h>0`, `head.y>=0` ask whether a box exists
    // or is on screen; nothing about them moves with the font. 42 such sites were counted by the first
    // draft, and ONE of them (73-review-list-filter.js:328, `onScreen:after.top>=0` sitting on the same
    // line as `before.top-after.top`) was what made CONTROL 3 fail. Excluding zero fixed the predicate and
    // the control together, which is the tell that the control was reporting a real defect and not noise.
    if(Number(lit)===0) return;
    const ln=lineAt(src,pos), k=f+':'+ln+':'+lit+':'+how;
    if(seen.has(k))return; seen.add(k);
    rows.push({file:f,line:ln,lit:+lit,how,key:key||'',tbl:tbl||'',
               code:(rawLines[ln-1]||'').trim().slice(0,200)});
  };

  // (A) NAMED TABLES whose identifier is later used in a comparison against a measured quantity.
  const tblRe=/(?:^|[\s;({,])(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*([{[])/g;
  let m;
  while((m=tblRe.exec(src))){
    const name=m[1], open=m.index+m[0].lastIndexOf(m[2]);
    const end=balanced(src,open); if(end<0) continue;
    const body=src.slice(open,end+1);
    if(!/\d/.test(body)) continue;
    // Is this table consulted by an assertion about a measured quantity?
    const uses=new RegExp('\\b'+name.replace(/[$]/g,'\\$')+'\\b','g');
    let consulted=false,um;
    while((um=uses.exec(src))){
      if(um.index>=open&&um.index<=end) continue;
      const ctx=src.slice(Math.max(0,um.index-220),um.index+220);
      if(MEASRE.test(ctx)&&/near\s*\(|Math\.abs\s*\(|[<>]=?|===|!==/.test(ctx)){consulted=true;break;}
    }
    if(!consulted) continue;
    // every numeric literal in the body, under the key it is written against
    const kv=/([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")\s*:\s*(-?\d+(?:\.\d+)?)/g;
    let km;
    while((km=kv.exec(body))){
      const key=km[1].replace(/^['"]|['"]$/g,'');
      if(LAYOUT_KEY.test(key))      push(open+km.index,km[2],'tbl',key,name);
      else if(GEO_KEY.test(key))    push(open+km.index,km[2],'geo-tbl',key,name);
    }
  }

  // (B) near(measured, N) and Math.abs(measured - N)
  const callRe=/\b(near|Math\.abs)\s*\(/g;
  while((m=callRe.exec(src))){
    const op=src.indexOf('(',m.index+m[1].length-1);
    let d=0,k=op;
    for(;k<src.length;k++){ if(src[k]==='(')d++; else if(src[k]===')'){d--; if(!d)break;} }
    const inner=src.slice(op+1,k);
    if(!MEASRE.test(inner)) continue;
    const nums=inner.match(/(?<![\w.$])-?\d+(?:\.\d+)?(?![\w.])/g)||[];
    for(const nn of nums) push(m.index,nn,m[1]==='near'?'near':'abs','','');
  }

  // (C) direct comparison, either side
  const c1=new RegExp(MEAS+String.raw`\s*(?:[<>]=?|===|!==|==)\s*(-?\d+(?:\.\d+)?)`,'g');
  while((m=c1.exec(src))) push(m.index,m[1],'cmp','','');
  const c2=new RegExp(String.raw`(-?\d+(?:\.\d+)?)\s*(?:[<>]=?|===|!==|==)\s*[A-Za-z_$][\w.$\[\]'"]*`+MEAS,'g');
  while((m=c2.exec(src))) push(m.index,m[1],'cmp','','');
}

// ---- classify provenance
// TWO BUCKETS, AND DELIBERATELY NOT THREE. The first draft of this script sorted every site into
// text-derived / viewport-bound / layout-offset and published "351 of 390 AT RISK". That number came
// almost entirely from a FALLBACK branch - anything this script could not place was called text-derived -
// which is #480's loose predicate wearing the opposite label, and publishing it would have repeated the
// exact error this script exists to correct. WITHDRAWN before it was ever committed [R18].
// What IS decidable mechanically is whether the literal is a VIEWPORT CONSTANT used as a bound. Everything
// else is a measured layout quantity pinned to a number, which is container-SENSITIVE until someone shows
// otherwise - and showing otherwise is the per-site reading the job asks for and this script does not do.
const VIEWPORT=new Set([320,360,375,390,414,430,440,520,568,640,667,679,730,761,812,844,896,932,956]);
for(const r of rows){
  r.prov = (VIEWPORT.has(Math.abs(r.lit)) && r.how!=='geo-tbl') ? 'viewport-constant' : 'pinned-layout';
}
const byFile={};
for(const r of rows){ (byFile[r.file]=byFile[r.file]||[]).push(r); }
const atRisk=r=>r.prov==='pinned-layout';

// NOTE: process.exit() after console.log TRUNCATES a piped stdout - node's write to a pipe is async and
// exit does not flush it. The first draft lost this output at exactly 65523 bytes, which looked like a
// parse error in the consumer rather than a bug here. Write synchronously and set exitCode instead.
if(ASJSON){ fs.writeSync(1,JSON.stringify({rows,files:files.length},null,1)+'\n'); process.exitCode=0; }
else {

console.log('PINNED LAYOUT LITERALS IN THE GATE SUITE — provenance, not magnitude');
console.log('predicate: a numeric literal of ANY magnitude compared against a MEASURED quantity, directly or');
console.log('           through a named table an assertion consults. Comments stripped. Measured-vs-measured');
console.log('           comparisons are NOT members: both sides move together.');
console.log('tree     : '+(process.env.CLASSIFY_SHA||'(working tree)'));
console.log('');
console.log('gate .js files                      : '+files.length);
console.log('files carrying >=1 pinned literal   : '+Object.keys(byFile).length);
console.log('files carrying none                 : '+(files.length-Object.keys(byFile).length));
console.log('pinned literal SITES                : '+rows.length);
console.log('  pinned-layout (container-SENSITIVE): '+rows.filter(atRisk).length);
console.log('  viewport-constant used as a bound : '+rows.filter(r=>r.prov==='viewport-constant').length);
console.log('  NOT SPLIT BY THIS SCRIPT: which pinned-layout literals descend from a TEXT measurement.');
console.log('  That is the per-site reading the job asks for; this tool sizes the population, not the subset.');
console.log('literals BELOW 100 (invisible to the >=100 band): '+rows.filter(r=>Math.abs(r.lit)<100).length);
console.log('  of those, AT RISK                 : '+rows.filter(r=>Math.abs(r.lit)<100&&atRisk(r)).length);
console.log('');
console.log('PER FILE  (red479 = FAIL count in #479\'s full run; * = #479 called it NOT a container artefact)');
console.log('  sites  pinned <100  red479  file');
for(const f of Object.keys(byFile).sort((a,b)=>byFile[b].length-byFile[a].length)){
  const rs=byFile[f];
  console.log('  %s  %s  %s  %s  %s',
    String(rs.length).padStart(5), String(rs.filter(atRisk).length).padStart(4),
    String(rs.filter(r=>Math.abs(r.lit)<100).length).padStart(4),
    String(RED_479[f]==null?'-':RED_479[f]+(NOT_CONTAINER.has(f)?'*':'')).padStart(6), f);
}
console.log('');
// ---- CONTROL: the class must contain the sections that actually reddened on a moved pin
const containerReds=Object.keys(RED_479).filter(f=>!NOT_CONTAINER.has(f));
const missed=containerReds.filter(f=>!byFile[f]);
const caught=containerReds.filter(f=>byFile[f]);
console.log('CONTROL 1 - every #479 red that was a container artefact must be inside the class.');
console.log('  container-artefact reds : '+containerReds.length+'   caught '+caught.length+'   MISSED '+missed.length
            +(missed.length?'  -> '+missed.join(', '):''));
console.log('CONTROL 2 - the two #479 called NOT container artefacts should look different.');
for(const f of [...NOT_CONTAINER]) console.log('  '+f.padEnd(30)+(byFile[f]?byFile[f].length+' pinned sites':'0 pinned sites - correctly outside the class'));
// CONTROL 3 - MEASURED, NOT NARRATED. The first draft PRINTED a sentence asserting this and checked
// nothing, which is the "a claim this harness computes is not an independent measurement" trap recorded
// at #419 and #461. Now it finds the measured-vs-measured lines itself and intersects them with the
// reported sites. A non-empty intersection is a FAILURE of the predicate.
{
  const mm=[];
  for(const f of files){
    const raw=fs.readFileSync(path.join(DIR,f),'utf8'), lines=stripComments(raw).split('\n');
    lines.forEach((ln,i)=>{
      // two measured terms either side of a subtraction or an equality, with no numeric literal between
      if(/(?:before|pre|after|afterHint|afterWrong|post|a)\b[\w.]*(?:\.w|\.h|\.top|\.left)\b[^;]{0,80}?-\s*[A-Za-z_$][\w.$]*(?:\.w|\.h|\.top|\.left)\b/.test(ln))
        mm.push(f+':'+(i+1));
    });
  }
  const reported=new Set(rows.map(r=>r.file+':'+r.line));
  const overlap=mm.filter(k=>reported.has(k));
  console.log('CONTROL 3 - a measured-vs-measured assertion must NOT be counted (measured, not asserted).');
  console.log('  measured-vs-measured lines found : '+mm.length);
  console.log('  of those also reported as pins   : '+overlap.length+(overlap.length?'  FAIL -> '+overlap.slice(0,6).join(', '):'  (correct: none)'));
  if(overlap.length) process.exitCode=1;
}
process.exitCode = missed.length?1:0;
}
JS
