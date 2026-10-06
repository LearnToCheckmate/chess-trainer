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
# USAGE:  sh gates/audit/pixel-literal-classify.sh [--json] [--join <logdir>] [repo-root]
#
#   --join <logdir>  THE CONTROL THAT IS WORTH MORE THAN THE COUNT, and the one that found this script's
#   worst bug. Point it at a directory of per-gate logs produced by running gates against ONE bundle in a
#   container whose fonts differ (CT_APP=<that bundle> node gates/regress/<gate>.js > <logdir>/<gate>.log).
#   Every FAIL in such a log is a PROVEN container-dependent pin - no reading required, because the bundle
#   is identical and only the container changed. The join reports, per gate, whether the literals the
#   failures NAME are in this script's site list. A failure whose literal is absent is a HOLE IN THE
#   PREDICATE, and that is exactly how the camelCase gap below was found: CONTROL 1 joins at FILE level and
#   passed, while 45-play-setup's six actually-failing y-positions were not in the list at all.
# Reachable from no suite run by design: it is an audit tool, not a gate. Adding a "=== " section to the suite
# would break the roster arm of gates/verify-log.sh - see jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28.
set -eu
JSON=0
JOIN=""
while :; do
  case "${1:-}" in
    --json) JSON=1; shift ;;
    --join) JOIN="${2:-}"; [ -n "$JOIN" ] || { echo "--join needs a directory" >&2; exit 2; }; shift 2 ;;
    *) break ;;
  esac
done
ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
[ -d "$ROOT/gates/regress" ] || { echo "no gates/regress under $ROOT" >&2; exit 2; }

CLASSIFY_JSON="$JSON" CLASSIFY_ROOT="$ROOT" CLASSIFY_JOIN="$JOIN" node - <<'JS'
const fs=require('fs'),path=require('path');
const ROOT=process.env.CLASSIFY_ROOT, ASJSON=process.env.CLASSIFY_JSON==='1';
const JOINDIR=process.env.CLASSIFY_JOIN||'';
const DIR=path.join(ROOT,'gates','regress');
const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.js')).sort();

// #479's full-run red sections, from claude/agents/gatelogs/479-all.log as recorded on the job. GROUND TRUTH
// from a container whose fonts differ, which is the only empirical discriminator anyone has.
const RED_479={'12-hint.js':2,'26-invariants.js':38,'39-pz-streak.js':1,'40-reachability.js':1,
  '45-play-setup.js':6,'46-play.js':3,'48-lesson-flow.js':15,'49-home.js':2,
  '57-pz-solved-explanation.js':6,'72-drill-prev.js':2,'52-drill-grades-the-move.js':4};
// The two #479 itself identified as NOT container artefacts (its own arithmetic defect and the drill reserve).
const NOT_CONTAINER=new Set(['52-drill-grades-the-move.js','72-drill-prev.js']);

// CAMELCASE MEASURED ACCESSORS ARE PART OF THIS PATTERN AND LEAVING THEM OUT HID A WHOLE GATE'S PINS.
// The first draft matched `.top` but not `.restTop`, so gates/regress/45-play-setup.js:247 -
//   Math.abs(st.restTop - START_REST[geo]) < 2
// - was invisible, and with it the START_REST table at :214 ({se:903,kunal:837,kunal730:873,...}) whose six
// y-positions are the six assertions that ACTUALLY FAIL in a font-substituted container. CONTROL 1 passed
// anyway, because it joins at FILE level and that file carries other pins - so the control was satisfied by
// something other than the thing it was meant to find, which is the trap CLAUDE.md records seven times over.
// Found by joining the empirical failures against the site list per gate and noticing the failing literals
// were not in it. A file-level join is necessary and NOT sufficient; the per-assertion join is what caught it.
const MEAS=String.raw`(?:\.w\b|\.h\b|\.x\b|\.y\b|[A-Za-z]?[Tt]op\b|[A-Za-z]?[Bb]ottom\b|[A-Za-z]?[Ll]eft\b|[A-Za-z]?[Rr]ight\b|[Ww]idth|[Hh]eight|scrollW|scrollH|clientW|clientH|offsetW|offsetH|\.bw\b|\.bx\b|\.by\b)`;
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
// THE THIRD BUCKET IS AMBIGUOUS AND SAYING SO IS THE POINT. A literal equal to a known viewport dimension
// is sometimes a viewport DECLARATION the gate launches at ({w:375,h:812} in 15-gallery-playall.js:381,
// {w:730,h:375} in 16-cpu-result-line.js:457) and sometimes a LAYOUT PIN that merely happens to equal one.
// gates/regress/46-play.js:100 is the proof the bucket is mixed: PP={se:{bw:272,...},kunal730:{bw:375,...}}
// is a BOARD-WIDTH pin throughout, and its se entry MOVES in this container (272 measured 264). So calling
// the whole bucket safe would excuse a real pin for the arithmetic accident of matching the viewport - the
// clip-intersection mistake CLAUDE.md records, which excuses the real 38.9px defect as readily as the false
// 1.4px one. An earlier draft of this script did exactly that for 92 sites. They are reported as their own
// bucket, NOT netted out of the at-risk count, and splitting them is a reading like the main residue.
const VIEWPORT=new Set([320,360,375,390,414,430,440,520,568,640,667,679,730,761,812,844,896,932,956]);
for(const r of rows){
  if(!VIEWPORT.has(Math.abs(r.lit))) r.prov='pinned-layout';
  else if(r.how==='geo-tbl')         r.prov='pinned-layout';      // the geometry is the KEY, so the value is the pin
  else if(r.how==='tbl')             r.prov='viewport-valued';    // AMBIGUOUS - declaration or pin, needs a reading
  else                               r.prov='viewport-bound';     // a bare comparison against a viewport dimension
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
console.log('  viewport-VALUED, AMBIGUOUS        : '+rows.filter(r=>r.prov==='viewport-valued').length
            +'  (a viewport declaration OR a pin that equals one - needs a reading, NOT netted out)');
console.log('  viewport-bound (a bare comparison): '+rows.filter(r=>r.prov==='viewport-bound').length);
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
// ---- CONTROL 4 (optional): per-ASSERTION join against logs from a font-substituted container.
if(JOINDIR){
  console.log('');
  console.log('CONTROL 4 - per-ASSERTION join against '+JOINDIR);
  console.log('  Every FAIL below is a PROVEN container-dependent assertion: same bundle, only the container');
  console.log('  differs. A gate that carries pins and does NOT fail is the other half of the evidence - it is');
  console.log('  what shows that carrying a pinned literal is NECESSARY and not SUFFICIENT.');
  let holes=0, joined=0, provenFiles=0, greenGates=0, greenWithPins=0, pinnedNamed=0;
  let logs=[];
  try{ logs=fs.readdirSync(JOINDIR).filter(x=>x.endsWith('.log')).sort(); }
  catch(e){ console.log('  cannot read '+JOINDIR+': '+e.message); process.exitCode=2; }
  // node's console.log has no width specifiers - %6d prints literally. Pad by hand.
  console.log('  '+'gate'.padEnd(30)+' '+'sites'.padStart(5)+' '+'<100'.padStart(5)+' '+'fails'.padStart(5)+'  literals the failures name');
  for(const lg of logs){
    const f=lg.replace(/\.log$/,'')+'.js';
    let txt=''; try{ txt=fs.readFileSync(path.join(JOINDIR,lg),'utf8'); }catch(e){ continue; }
    const fails=txt.split('\n').filter(l=>l.startsWith('FAIL'));
    const sitesHere=rows.filter(r=>r.file===f);
    if(!fails.length){ greenWithPins += sitesHere.length?1:0; greenGates++; continue; }
    provenFiles++;
    const sites=rows.filter(r=>r.file===f);
    if(!sites.length && fails.length){ /* a red gate with no pins at all is itself worth seeing */ }
    const lits=new Set(sites.map(r=>String(r.lit)));
    const named=new Set();
    for(const l of fails){
      const head=l.slice(0,240);
      for(const m of head.matchAll(/(?<![\w.])(\d{2,4})(?![\w.])/g)) named.add(m[1]);
    }
    const hit=[...named].filter(n=>lits.has(n));
    // a literal the failure names that looks like a pin (>=20) and is NOT in the list
    // The unmatched set is dominated by the MEASURED value the message prints beside its pin - 49-home
    // names 68 (the pin) AND 69 (what it measured), 46-play names 272 and 264. Viewport constants the
    // message quotes are dropped too. So this column is a LEAD, never a verdict, and the first draft of
    // this control presented it as "NOT IN LIST", which reads like an accusation against the predicate.
    const miss=[...named].filter(n=>!lits.has(n) && Number(n)>=20 && !VIEWPORT.has(Number(n)));
    joined+=hit.length; holes+=miss.length?1:0; pinnedNamed+=hit.length?1:0;
    console.log('  '+f.padEnd(30)+' '+String(sites.length).padStart(5)+' '
      +String(sites.filter(r=>Math.abs(r.lit)<100).length).padStart(5)+' '+String(fails.length).padStart(5)+'  '
      +(hit.length?'PINNED: '+hit.sort((a,b)=>a-b).join(',')+'  ':'')
      +(miss.length?'unmatched: '+miss.sort((a,b)=>a-b).join(','):''));
  }
  console.log('');
  console.log('  gates RED on this bundle            : '+provenFiles+'   of which the failing literal IS a known pin: '+pinnedNamed);
  console.log('  gates GREEN on this bundle          : '+greenGates+'   of which carry pinned literals anyway: '+greenWithPins);
  console.log('  THE SECOND LINE IS THE IMPORTANT ONE. A gate that carries pins and stays green proves the');
  console.log('  population is not the at-risk set, which is the whole reason the subset is still owed.');
  console.log('  READ THE COLUMNS THIS WAY. PINNED = a literal the failure names that IS in the site list,');
  console.log('  which is the predicate working. `unmatched` = a number the message printed that is not a');
  console.log('  known pin, and it is USUALLY THE MEASURED VALUE sitting beside its pin (49-home prints the');
  console.log('  pin 68 and the measured 69; 46-play prints 272 and 264). It is a LEAD for a human glance,');
  console.log('  never a verdict about the predicate. The one time it WAS a real hole, it was decisive:');
  console.log('  45-play-setup named 837/856/873/903 and none was in the list, because the measured-term');
  console.log('  pattern knew .top and not .restTop. That is what this control is for.');
}
process.exitCode = missed.length?1:0;
}
JS
