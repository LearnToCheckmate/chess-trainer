// gates/regress/81-gatelog-covers-shipped-bundle.js   THE COMMITTED GATE LOG GATED THE BUNDLE ITS OWN COMMIT SHIPPED.
// #546, batch 6 item (80), for jobs/no-gate-asserts-the-committed-log-gated-the-shipped-bundle-2026-09-28. Authored by the
// SIT lane, run 11, 2026-09-28 (docs/sit-gate-gatelog-covers-shipped-bundle-2026-09-28); numbered and landed by the build
// lane, on gates/lib.js, with one scope rule added and measured (HELD TREES, below). Case TC-SUITE-351.
//
// WHAT IT GUARDS. Every committed gate log ends in a ref line carrying `bundle md5 <12 hex>` - the bundle the suite actually
// measured. The log is then committed BY A LATER COMMIT, with the app.js that ships. Nothing compared those two:
// verify-log.sh --this-bundle compares the log with the WORKING TREE at the moment it runs, so it speaks for the build's
// own session and not for what the landing commit carried. #416's half-merge is this project's proof that discipline alone
// does not hold the property. This reads committed git objects only: no browser, no network, no timing.
//
// SCOPE, BOTH RULES PRINTED: a log whose NAME says it authorised nothing (SUPERSEDED, VOID) is skipped, as the SIT lane
// wrote it; and - ADDED AT #546, MEASURED - a log that MISMATCHES its commit's app.js is excused when the bundle it gated
// is on a row of the COMMITTED held register (gates/held-trees.tsv at HEAD): the tree was refused, so its commit shipping
// something else is the register working. A held log that matches is still checked. On the tree of #546 exactly one log
// needs the rule: 459b-all.log gated fb009ca7734a (held, #459) and was committed by #459's close-out, which made no
// application change. Every excused log is printed by name, so an excuse is a reading and never a silence.
//
// AND, SINCE #549 (item (63); jobs/gatelogs-missing-for-401-and-418-2026-09-27), TC-SUITE-372: every build number stamped in an app.js on
// HEAD's history has a committed log, or a sourced row in gates/gatelog-exceptions.tsv; a stale row is red too. See the block at the end.
//
// NON-VACUITY. A separate line requires at least MIN_LOGS checked logs, so a rename, a moved directory or a changed
// ref-line format turns the gate red rather than green over an empty set.
'use strict';
const L=require('../lib');
const cp=require('child_process'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..');
const g=(a)=>cp.execSync('git -C "'+ROOT+'" '+a,{maxBuffer:1<<28});
const MIN_LOGS=8;
const SKIP=/SUPERSEDED|VOID/;

L.run(async()=>{
  // A SHALLOW CLONE CANNOT ANSWER THIS, SO IT IS ONE RED THAT SAYS SO [#546, antagonist B's V3 and A's F1]. Every log older
  // than the graft boundary has its --diff-filter=A commit read as the boundary commit, so a depth-50 clone of a healthy
  // tree read 77 misattributed reds. The routine's containers arrive at depth 50 (CLAUDE.md), so this is checked first.
  const shallow=g('rev-parse --is-shallow-repository').toString().trim();
  L.say(shallow==='false','TC-SUITE-351 PRECONDITION the clone is COMPLETE (git rev-parse --is-shallow-repository reads '+shallow+'), because a shallow clone attributes every older log to its graft boundary - run `git fetch --unshallow` before the suite; nothing below was checked if this is red',{shallow});
  if(shallow!=='false')return;
  const held=new Set();
  try{for(const l of g('show HEAD:gates/held-trees.tsv').toString().split('\n')){if(/^\s*#/.test(l))continue;const f=l.split('\t');if(f.length>=2&&/^[0-9a-f]{12}$/.test(f[0]))held.add(f[0]);}}catch(e){}
  L.say(held.size>0,'TC-SUITE-351 PRECONDITION the committed held register was read ('+held.size+' live bundle rows), so the held-tree skip below is a lookup and not a silence',{liveBundleRows:held.size});
  const logs=g('ls-tree -r --name-only HEAD -- claude/agents/gatelogs').toString().split('\n').filter(f=>/-all\.log$/.test(f));
  const checked=[],skippedName=[],skippedHeld=[];
  for(const f of logs){
    if(SKIP.test(f)){skippedName.push(path.basename(f));continue;}
    const body=g('show HEAD:"'+f+'"').toString();
    const ref=(body.match(/^ref: HEAD .*$/gm)||[]).pop();
    if(!ref)continue;                                    // pre-#417 logs carry no ref line
    const logMd5=(ref.match(/bundle md5 ([0-9a-f]{12})/)||[])[1];
    if(!logMd5)continue;
    const addSha=g('log --format=%H --diff-filter=A -1 -- "'+f+'"').toString().trim();
    const shipped=cp.execSync('git -C "'+ROOT+'" show '+addSha+':app.js | md5sum',{maxBuffer:1<<28}).toString().slice(0,12);
    // A HELD LOG IS EXCUSED ONLY WHEN IT MISMATCHES: then the commit that added it shipped something else, which is what a
    // held tree is for. A held log that MATCHES is still checked (452-all.log on #546's tree), so the rule never hides a PASS.
    if(logMd5!==shipped&&held.has(logMd5)){skippedHeld.push(path.basename(f)+' (gated '+logMd5+', held; its commit shipped '+shipped+')');continue;}
    checked.push(f);
    L.say(logMd5===shipped,'TC-SUITE-351 '+path.basename(f)+': the bundle the log gated is the bundle the commit that added the log shipped',{log:logMd5,shipped,addedBy:addSha.slice(0,12)});
  }
  L.note('     skipped by name (authorised nothing): '+(skippedName.join(', ')||'none'));
  L.note('     skipped as a HELD tree (authorised nothing): '+(skippedHeld.join(', ')||'none'));
  L.say(checked.length>=MIN_LOGS,'TC-SUITE-351 the gate checked at least '+MIN_LOGS+' committed gate logs carrying a ref line (non-vacuity)',{checked:checked.length,min:MIN_LOGS});

  // ── TC-SUITE-372: EVERY BUILD NUMBER STAMPED IN AN app.js ON HEAD'S HISTORY HAS A COMMITTED LOG, OR A SOURCED ROW SAYING WHY NOT.
  // #549, item (63); jobs/gatelogs-missing-for-401-and-418-2026-09-27, scoped by orchestratorRuling_2026_11_04 (shipped with app changes;
  // gates-only builds - #401 - change no app.js and so stamp nothing, which is what keeps them out mechanically). The exception list is
  // gates/gatelog-exceptions.tsv AT HEAD; a row that is no longer needed is red, so the list cannot hide a log that later arrived.
  const STAMP=/#(\d{3})[a-z]? - 20\d\d-\d\d-\d\d \d\d:\d\d ET/;
  const appShas=g('log --format=%H HEAD -- app.js').toString().split('\n').filter(Boolean);
  const stamped=new Map();                               // number -> newest app.js commit carrying it
  for(let i=0;i<appShas.length;i+=64){
    const batch=appShas.slice(i,i+64);
    let out='';
    try{out=cp.execSync('git -C "'+ROOT+'" grep -h -m1 -oE "#[0-9]{3}[a-z]? - 20[0-9]{2}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} ET" '+batch.join(' ')+' -- app.js',{maxBuffer:1<<28}).toString();}catch(e){out=(e.stdout||'').toString();}
    for(const ln of out.split('\n')){const m=ln.match(STAMP);if(m&&!stamped.has(m[1]))stamped.set(m[1],true);}
  }
  const logNums=new Set(g('ls-tree -r --name-only HEAD -- claude/agents/gatelogs').toString().split('\n')
    .map(f=>path.basename(f)).filter(b=>/^\d{3}[a-z]?-.*all.*\.log$/.test(b)).map(b=>b.slice(0,3)));
  const exc=new Map();
  try{for(const l of g('show HEAD:gates/gatelog-exceptions.tsv').toString().split('\n')){if(/^\s*(#|$)/.test(l))continue;const f=l.split('\t');exc.set(f[0],{cls:f[1]||'',src:f[2]||''});}}catch(e){}
  L.say(stamped.size>=100,'TC-SUITE-372 PRECONDITION at least 100 distinct build stamps were read from the app.js commits on HEAD\'s history, so the coverage check below is over the real set (non-vacuity)',{appJsCommits:appShas.length,stamps:stamped.size});
  L.say(exc.size>=1,'TC-SUITE-372 PRECONDITION gates/gatelog-exceptions.tsv was read at HEAD ('+exc.size+' rows), so an excused number is a lookup and not a silence',{rows:exc.size});
  // THE BUILD UNDER TEST IS NOT YET OWED ITS LOG: the suite runs at a sha whose app.js already carries this build's stamp, and the log it
  // writes is committed after it (548d-all.log gated 2ef1165, whose app.js reads #548). So HEAD's own stamp is excused, BY NAME, here only.
  const headStamp=((()=>{try{return g('show HEAD:app.js').toString();}catch(e){return '';}})().match(STAMP)||[])[1]||null;
  L.note('     the build under test (HEAD\'s own app.js stamp, its log is written by this suite): '+(headStamp?'#'+headStamp:'none read'));
  const missing=[...stamped.keys()].filter(n=>n!==headStamp&&!logNums.has(n)&&!exc.has(n)).sort();
  L.say(missing.length===0,'TC-SUITE-372 every build number stamped in an app.js on HEAD\'s history has a committed claude/agents/gatelogs/<n>*-all*.log or a sourced row in gates/gatelog-exceptions.tsv'+(missing.length?' - MISSING: #'+missing.join(', #'):''),{stamps:stamped.size,withLog:[...stamped.keys()].filter(n=>logNums.has(n)).length,excused:[...stamped.keys()].filter(n=>exc.has(n)).length,missing});
  const stale=[...exc.keys()].filter(n=>logNums.has(n)||!stamped.has(n)).sort();
  L.say(stale.length===0,'TC-SUITE-372 no row of gates/gatelog-exceptions.tsv is stale (its number now has a log, or no app.js on HEAD\'s history stamps it)'+(stale.length?' - STALE: #'+stale.join(', #'):''),{stale});
  const unsourced=[...exc.entries()].filter(([n,r])=>!/^\d{3}$/.test(n)||!/^(pre-practice|never-committed|reverted|burnt)$/.test(r.cls)||r.src.trim().length<20).map(([n])=>n);
  L.say(unsourced.length===0,'TC-SUITE-372 every exception row carries a known class (pre-practice, never-committed, reverted, burnt) and a source of at least 20 characters',{unsourced});
  L.note('     excused (no log, sourced): '+[...exc.entries()].map(([n,r])=>'#'+n+' '+r.cls).join(', '));
},'GATELOG-COVERS-SHIPPED-BUNDLE');
