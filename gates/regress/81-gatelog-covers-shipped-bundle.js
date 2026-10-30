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
},'GATELOG-COVERS-SHIPPED-BUNDLE');
