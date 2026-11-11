#!/usr/bin/env node
'use strict';
// gates/rerun-after-red.js - AFTER A RED SUITE WHOSE FIX LEAVES THE BUNDLE UNCHANGED, RERUN ONLY WHAT CAN HAVE CHANGED.
//
// WHY [#550, item (102) of directOpening_2026_11_11_batch10; jobs/after-a-red-suite-rerun-only-the-checks-that-read-what-the-
// dropped-fixes-changed-instead-of-the-whole-suite-2026-10-28; Kunal's answer "build" on questions/B9-RERUN-AFTER-RED, Thu 5 Nov
// 2026; decisions/after-a-red-whose-fix-leaves-the-bundle-unchanged-only-the-checks-it-can-change-are-rerun-2026-11-05; the design
// is docs/design-rerun-after-red-2026-11-05 (v1) on the tracker]. A red full suite costs a second full suite (about 190 minutes)
// even when the fix touched only a gate. Every browser gate reads the built bundle plus its own files, so when the bundle md5 is
// unchanged a gate whose own files are byte identical cannot change its verdict.
//
// VERBS
//   plan    <red-log>                      which gates must rerun, and why; or FULL with the reason
//   combine <red-log> <subset-log> [out]   re-derives the plan, checks the subset rerun covers it green over the SAME bundle md5
//                                          and the same toolchain, reruns the three fast layers (unit-drill-why, unit-held-guard,
//                                          fastgate-drive) itself, and writes one combined log
//   selftest                               the controls, over constructed logs in a scratch git repository
//
// THE RULE (the design's three points):
//   1. the bundle md5 changed since the red suite (any app code): FULL - rerun the whole suite, as before.
//   2. otherwise rerun (a) every gate the red log reports RED, (b) every gate whose READ SET changed since the red suite's HEAD -
//      its gate file, every local file it require()s, transitively, and every tracked repository file it names (chess.jsx,
//      lessons.js, a fixture...), (c) every gate the red suite did not run (new since), and (d) the fast layers. Everything else
//      keeps its green from the red suite.
//   A change to the harness itself (gates/gates.sh, gates/package.json, gates/package-lock.json) is FULL: it can change how
//   every gate runs rather than what it reads. A red log with no "gates ran" footer (a killed suite) is FULL: it cannot vouch.
//
// WHAT IT IS NOT, NAMED: THE COMBINED LOG IS NOT A PUSH AUTHORITY TODAY. It never carries the string the push consumers grep for
// (its verdict line is "RERUN-AFTER-RED COMBINED GREEN"), and gates/verify-log.sh refuses it as it refuses any log without that
// footer. The verify-log.sh arm that would accept it (md5 + manifest + both runs' ids, a control per refusal) is the job's
// whatIsLeft: it changes the push-gate tool, and CLAUDE.md records why that is not done inside the run that needs the same tool
// to gate its own push (#516's deepen-400 note). The read-set scan is textual: a file a gate reads through a computed path it
// does not name is invisible to it (the design's first risk), which is why a harness change is FULL and over-inclusion is the
// direction every heuristic here errs in.
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');

const HARNESS=['gates/gates.sh','gates/package.json','gates/package-lock.json'];
const FAST=[['unit-drill-why','node',['gates/unit-drill-why.js']],['unit-held-guard','bash',['gates/unit-held-guard.sh']],['fastgate-drive','bash',['gates/fastgate-drive.sh','fixed']]];

function git(root,args){return cp.execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']});}
function md5_12(file){return require('crypto').createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0,12);}

function parseLog(text){
  const L=text.split('\n');
  const h=(L[0]||'').match(/^gates\.sh (#\S+)\s+bundle (\S+)\s+md5 ([0-9a-f]{12})/);
  const ref=text.match(/^ref: HEAD ([0-9a-f]{40})/m);
  const ran=text.match(/^gates ran \((\d+)\): (.*)$/m);
  const tool=text.match(/^instrument: toolchain: (.*?)(\s+\[|\s*\|)/m);
  const red=[],green=[];
  for(const l of L){let m=l.match(/^    (\S+): RED\b/);if(m)red.push(m[1]);m=l.match(/^    (\S+): green \((\d+) PASS\)/);if(m)green.push(m[1]);}
  const sections={};let cur=null;
  for(const l of L){const m=l.match(/^=== (\S+) ===$/);if(m){cur=m[1];sections[cur]=[l];continue;}
    if(cur&&/^(regression assertions|gates ran|gate manifest:|instrument:|ref:|GATES|SUBSET|build-number series:|unit-layer assertions|assertion counts:)/.test(l)){cur=null;continue;}
    if(cur&&/^--- /.test(l)){cur=null;continue;}
    if(cur)sections[cur].push(l);}
  return {tag:h&&h[1],bundle:h&&h[2],md5:h&&h[3],head:ref&&ref[1],ran:ran?ran[2].trim().split(/\s+/).filter(Boolean):null,
    toolchain:tool?tool[1].trim():null,red,green,sections,subsetOk:/^SUBSET OK #/m.test(text),
    verdictGreen:/^GATES GREEN #/m.test(text)};
}

// the read set of one gate: its file, local require()s transitively, and tracked files its CODE names (comments are stripped first:
// a gate's WHY block cites CLAUDE.md, the story files and other gates, and counting those would rerun every gate on every docs commit).
// A tracked file is named when the code carries its full repository path, its path below gates/ ('fixtures/x.json'), or its
// basename where that basename is unique in the repository (lessons.js, chess.jsx, TEST-CASES.md) - so a bare 'README.md' or
// 'package.json', which name a dozen files each, matches none of them - and only inside a string literal with no whitespace in
// it, which is what a path is: lib.js's geometry labels say "the shorter-phone column CLAUDE.md names", and counting that made
// every gate read CLAUDE.md (measured on 6239001: 85 of 87 gates before this rule, 0 after).
function stripComments(s){return s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[\s;{}()])\/\/.*$/mg,'$1');}
function readSet(root,gateRel,tracked){
  const seen=new Set([gateRel]),q=[gateRel];
  const baseCount={};for(const t of tracked){const b=path.basename(t);baseCount[b]=(baseCount[b]||0)+1;}
  const keys=[];for(const t of tracked){if(t==='app.js')continue;const k=[t];if(t.startsWith('gates/'))k.push(t.slice(6));const b=path.basename(t);
    if(baseCount[b]===1&&b.length>=6&&b.includes('.'))k.push(b);keys.push([t,[...new Set(k)]]);}
  while(q.length){const f=q.shift();let s;try{s=stripComments(fs.readFileSync(path.join(root,f),'utf8'));}catch(e){continue;}
    const re=/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;let m;
    while((m=re.exec(s))){let r=path.normalize(path.join(path.dirname(f),m[1]));
      for(const c of [r,r+'.js',path.join(r,'index.js')]){if(tracked.has(c)||fs.existsSync(path.join(root,c))&&fs.statSync(path.join(root,c)).isFile()){if(!seen.has(c)){seen.add(c);q.push(c);}break;}}}
    // only string literals WITHOUT whitespace count: a path is one ('lessons.js', 'fixtures/x.json'); a prose label naming CLAUDE.md is not
    const lits=(s.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g)||[]).map(x=>x.slice(1,-1)).filter(x=>x&&!/\s/.test(x));
    for(const [t,ks] of keys){if(seen.has(t))continue;if(ks.some(k=>lits.some(l=>l===k||l.endsWith('/'+k)||l.includes(k))))
      {seen.add(t);if(/^gates\/.*\.js$/.test(t))q.push(t);}}}
  return seen;
}

function plan(root,redLogPath,opts={}){
  const R=parseLog(fs.readFileSync(redLogPath,'utf8'));
  const out={log:redLogPath,red:R,full:null,rerun:[],keep:[],reasons:{}};
  if(!R.md5||!R.tag){out.full='the red log has no readable header (gates.sh #N bundle ... md5 ...)';return out;}
  if(!R.head){out.full='the red log has no "ref: HEAD <sha>" line, so what changed since it cannot be computed';return out;}
  if(!R.ran){out.full='the red log has no "gates ran" footer: a killed or truncated suite cannot vouch for any green';return out;}
  if(R.verdictGreen){out.full='the red log is GATES GREEN: nothing to rerun after, and nothing here applies';return out;}
  const app=opts.app||path.join(root,'app.js');
  if(!fs.existsSync(app)){out.full='no bundle at '+app;return out;}
  const now=md5_12(app);out.bundleNow=now;
  if(now!==R.md5){out.full='THE BUNDLE CHANGED since the red suite ('+R.md5+' -> '+now+'): app code moved, so every gate reruns (rule 1)';return out;}
  try{git(root,['cat-file','-e',R.head+'^{commit}']);}catch(e){out.full='the red suite\'s HEAD '+R.head.slice(0,12)+' is not in this clone (unshallow it): what changed cannot be computed';return out;}
  const changed=new Set(git(root,['diff','--name-only',R.head]).split('\n').filter(Boolean));
  for(const u of git(root,['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean))changed.add(u);
  out.changed=[...changed].sort();
  const h=HARNESS.filter(f=>changed.has(f));
  if(h.length){out.full='the HARNESS changed ('+h.join(', ')+'): it can change how every gate runs, not only what it reads';return out;}
  const tracked=new Set(git(root,['ls-files']).split('\n').filter(Boolean));
  for(const u of changed)tracked.add(u);
  const regress=fs.readdirSync(path.join(root,'gates/regress')).filter(f=>/^\d.*\.js$/.test(f)).map(f=>f.replace(/\.js$/,'')).sort();
  const ranSet=new Set(R.ran);
  const gone=R.ran.filter(g=>g!=='mountcheck'&&!regress.includes(g));
  if(gone.length){out.full='gate(s) the red suite ran are gone from gates/regress ('+gone.join(', ')+'): that is the manifest\'s question, and a partial rerun cannot answer it';return out;}
  for(const g of regress){const why=[];
    if(R.red.includes(g))why.push('red in the red suite');
    if(!ranSet.has(g))why.push('not run by the red suite (new since)');
    const rs=readSet(root,'gates/regress/'+g+'.js',tracked);const hit=[...rs].filter(f=>changed.has(f));
    if(hit.length)why.push('its read set changed: '+hit.join(', '));
    if(why.length){out.rerun.push(g);out.reasons[g]=why;}else out.keep.push(g);}
  if(R.red.includes('mountcheck')||!R.green.includes('mountcheck')){out.rerun.unshift('mountcheck');out.reasons.mountcheck=['mountcheck was not green in the red suite'];}
  else out.keep.unshift('mountcheck');
  return out;
}

function printPlan(p){
  if(p.full){console.log('PLAN: FULL - '+p.full);return 3;}
  for(const g of p.rerun)console.log('RERUN '+g+'  ('+p.reasons[g].join('; ')+')');
  console.log('KEEP '+p.keep.length+' gate(s) at their red-suite green: '+p.keep.join(' '));
  console.log('FAST LAYERS: '+FAST.map(f=>f[0]).join(', ')+' - always rerun, by `combine` itself, which therefore needs a CLEAN committed tree (fastgate-drive.sh refuses a dirty one, and combine refuses on its exit)');
  const sub=p.rerun.filter(g=>g!=='mountcheck');
  console.log('PLAN: PARTIAL - '+p.rerun.length+' of '+(p.rerun.length+p.keep.length)+' gates rerun over bundle md5 '+p.red.md5);
  if(sub.length)console.log("THE RERUN: CT_APP=<the red suite's bundle> bash gates/gates.sh '"+p.red.tag+"' '"+sub.join(' ')+"'");
  return 0;
}

function runFast(root){
  const res=[];
  for(const [name,cmd,args] of FAST){
    if(!fs.existsSync(path.join(root,args[0]))){res.push({name,ok:0,fail:0,rc:-1,missing:true});continue;}
    const r=cp.spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout:600000});
    const o=(r.stdout||'')+'\n'+(r.stderr||'');
    const ok=(o.match(/^  ok  +.*$/mg)||[]).length,fail=(o.match(/^  FAIL/mg)||[]).length;
    res.push({name,ok,fail,rc:r.status,pass:(r.stdout||'').split('\n').filter(l=>/^  ok  +/.test(l)).map(l=>'PASS '+name+' '+l.replace(/^  ok  +/,''))});}
  return res;
}

function combine(root,redLog,subLog,outPath,opts={}){
  const refuse=(why)=>({refused:why});
  const p=plan(root,redLog,opts);
  if(p.full)return refuse('the plan is FULL, so no partial rerun can stand in for the suite: '+p.full);
  const S=parseLog(fs.readFileSync(subLog,'utf8')),R=p.red;
  if(!S.subsetOk&&!S.verdictGreen)return refuse('the rerun log does not end SUBSET OK (or GATES GREEN): it was red, killed or not a gates.sh log');
  if(S.tag!==R.tag)return refuse('the two logs name different builds ('+R.tag+' and '+S.tag+')');
  if(S.md5!==R.md5)return refuse('the rerun measured a different bundle ('+S.md5+') from the red suite ('+R.md5+')');
  if(R.toolchain&&S.toolchain&&R.toolchain!==S.toolchain)return refuse('the toolchain changed between the two runs ('+R.toolchain+' | '+S.toolchain+'): the font regime is a known gap, so this is a full rerun');
  const need=p.rerun.filter(g=>g!=='mountcheck');
  const missing=need.filter(g=>!S.green.includes(g));
  if(missing.length)return refuse('the rerun does not carry a green section for '+missing.join(', '));
  if(S.red.length)return refuse('the rerun has red section(s): '+S.red.join(', '));
  for(const g of p.keep){if(!R.green.includes(g))return refuse('gate '+g+' is kept from the red suite, which does not show it green');}
  const fast=opts.fast||runFast(root);
  for(const f of fast){if(f.missing||f.rc!==0||f.fail>0||f.ok===0)return refuse('fast layer '+f.name+' is not green now (exit '+f.rc+', '+f.ok+' ok, '+f.fail+' FAIL'+(f.missing?', MISSING':'')+')');}
  const head=git(root,['rev-parse','HEAD']).trim();
  const lines=[];
  lines.push('rerun-after-red COMBINED '+R.tag+'  bundle md5 '+R.md5+'  '+new Date().toISOString());
  lines.push('red suite: '+path.basename(redLog)+' (HEAD '+R.head+', '+R.red.length+' red: '+R.red.join(' ')+')');
  lines.push('rerun: '+path.basename(subLog)+' (HEAD '+(S.head||'?')+', gates '+need.join(' ')+')');
  lines.push('combined at HEAD '+head+'; changed since the red suite: '+(p.changed.join(' ')||'(nothing)'));
  for(const f of fast){lines.push('--- '+f.name+' (fast layer, rerun by rerun-after-red.js) ---');lines.push(...f.pass);lines.push('    '+f.name+': green ('+f.ok+' ok -> '+f.ok+' PASS lines)');}
  let total=0;
  for(const g of [...p.keep,...p.rerun]){const src=p.rerun.includes(g)&&g!=='mountcheck'?S:R;const sec=src.sections[g];
    if(!sec&&g!=='mountcheck')return refuse('no section for '+g+' in the '+(src===S?'rerun':'red')+' log');
    if(sec){lines.push(...sec);lines.push('    ['+g+' from the '+(src===S?'RERUN':'RED SUITE (unchanged read set)')+']');}}
  total=lines.filter(l=>/^PASS/.test(l)).length;
  lines.push('regression and fast-layer assertions (PASS lines): '+total);
  lines.push('gates combined ('+(p.keep.length+p.rerun.length)+'): kept '+p.keep.length+', rerun '+p.rerun.length);
  lines.push('RERUN-AFTER-RED COMBINED GREEN '+R.tag+' - NOT A PUSH AUTHORITY: gates/verify-log.sh has no combined arm yet');
  const text=lines.join('\n')+'\n';
  if(/GATES GREEN/.test(text))return refuse('a copied section carries the push string; refusing to write a log a grep could mistake for a push authority');
  if(outPath)fs.writeFileSync(outPath,text);
  return {ok:true,text,plan:p};
}

// ---------------------------------------------------------------------------------------------------------------- selftest
function selftest(){
  const T=fs.mkdtempSync(path.join(os.tmpdir(),'rar-'));let pass=0,fail=0;
  const t=(id,cond,msg)=>{if(cond){pass++;console.log('  ok  '+id+' '+msg);}else{fail++;console.log('  FAIL '+id+' '+msg);}};
  const sh=(a)=>cp.execFileSync('git',a,{cwd:T,stdio:'ignore'});
  const w=(f,s)=>{fs.mkdirSync(path.dirname(path.join(T,f)),{recursive:true});fs.writeFileSync(path.join(T,f),s);};
  w('app.js','bundle-1');w('chess.jsx','src');w('gates/gates.sh','#!');w('gates/lib.js','// lib');w('gates/drive/x.js',"require('../lib');");
  w('gates/regress/10-a.js',"const L=require('../lib');");w('gates/regress/11-b.js',"const L=require('../lib');const D=require('../drive/x');");
  w('gates/regress/12-c.js',"const L=require('../lib');fs.readFileSync('chess.jsx');");w('gates/fixtures/f12.json','{}');
  w('gates/regress/13-d.js',"const L=require('../lib');load('fixtures/f12.json');");
  sh(['init','-q']);sh(['-c','user.email=t@t','-c','user.name=t','-c','commit.gpgsign=false','add','-A']);
  sh(['-c','user.email=t@t','-c','user.name=t','-c','commit.gpgsign=false','commit','-qm','base']);
  const head=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:T,encoding:'utf8'}).trim();
  const md5=md5_12(path.join(T,'app.js'));
  const sec=(g,ok)=>['=== '+g+' ===','PASS '+g+' one',ok?'    '+g+': green (1 PASS)':'    '+g+': RED (exit 1, 1 FAIL lines, 0 <<<)'];
  const mk=(f,{tag='#9',m=md5,red=[],ran=['mountcheck','10-a','11-b','12-c','13-d'],foot=true,verdict='GATES RED #9',tool='pw 1',hd=head,only=null})=>{
    const L=['gates.sh '+tag+'  bundle '+T+'/app.js  md5 '+m+'  2026'];
    for(const g of (only||ran))L.push(...sec(g,!red.includes(g)));
    L.push('regression assertions (PASS lines): 5');if(foot)L.push('gates ran ('+(only||ran).length+'): '+(only||ran).join(' ')+' ');
    L.push('instrument: toolchain: '+tool+'  [x]');L.push('ref: HEAD '+hd+' | bundle md5 '+m);L.push(verdict);
    w(f,L.join('\n')+'\n');return path.join(T,f);};
  const FASTOK=[{name:'unit-drill-why',ok:2,fail:0,rc:0,pass:['PASS unit-drill-why a','PASS unit-drill-why b']},{name:'unit-held-guard',ok:1,fail:0,rc:0,pass:['PASS unit-held-guard a']},{name:'fastgate-drive',ok:1,fail:0,rc:0,pass:['PASS fastgate-drive a']}];
  const logs=path.join(T,'logs');fs.mkdirSync(logs);
  const red=mk('logs/9-all.log',{red:['11-b']});
  // RAR-01 nothing changed: only the red gate reruns
  let p=plan(T,red);t('RAR-01',!p.full&&p.rerun.join()==='11-b'&&p.keep.length===4,'a red gate with nothing changed: only it reruns ('+(p.full||p.rerun.join(' '))+')');
  // RAR-02 the bundle changed: FULL
  w('app.js','bundle-2');p=plan(T,red);t('RAR-02',!!p.full&&/BUNDLE CHANGED/.test(p.full),'the bundle md5 moved: FULL ('+p.full+')');w('app.js','bundle-1');
  // RAR-03 a gate file changed: that gate joins the set
  w('gates/regress/10-a.js',"const L=require('../lib');// fixed");p=plan(T,red);t('RAR-03',!p.full&&p.rerun.includes('10-a')&&!p.rerun.includes('12-c'),'a gate\'s own file changed: it reruns, an untouched gate keeps ('+p.rerun.join(' ')+')');
  sh(['checkout','-q','--','gates/regress/10-a.js']);
  // RAR-04 a driver one gate requires changed: only the gate that requires it
  w('gates/drive/x.js',"require('../lib');// drv");p=plan(T,mk('logs/9b-all.log',{red:[]  ,verdict:'GATES RED #9'}));
  t('RAR-04',!p.full&&p.rerun.join()==='11-b','a driver changed: only the gate that require()s it reruns ('+p.rerun.join(' ')+')');sh(['checkout','-q','--','gates/drive/x.js']);
  // RAR-05 a named source file changed (chess.jsx, bundle unchanged): the gate that names it
  w('chess.jsx','src2');p=plan(T,red);t('RAR-05',!p.full&&p.rerun.includes('12-c')&&!p.rerun.includes('10-a'),'chess.jsx changed with the bundle unchanged: the gate naming it reruns ('+p.rerun.join(' ')+')');sh(['checkout','-q','--','chess.jsx']);
  // RAR-06 a fixture named by a relative path changed
  w('gates/fixtures/f12.json','{"x":1}');p=plan(T,red);t('RAR-06',!p.full&&p.rerun.includes('13-d'),'a fixture the gate names changed: it reruns ('+p.rerun.join(' ')+')');sh(['checkout','-q','--','gates/fixtures/f12.json']);
  // RAR-07 the shared lib changed: every gate reruns (and it is still partial in form)
  w('gates/lib.js','// lib2');p=plan(T,red);t('RAR-07',!p.full&&['10-a','11-b','12-c','13-d'].every(g=>p.rerun.includes(g)),'gates/lib.js changed: every gate that loads it reruns ('+p.rerun.join(' ')+')');sh(['checkout','-q','--','gates/lib.js']);
  // RAR-24 a file named only in a comment or a prose string is not in the read set (a docs commit does not rerun the suite)
  w('NOTES.md','n');w('gates/regress/15-f.js',"// see NOTES.md\nconst L=require('../lib');const why='the column NOTES.md names';");
  sh(['-c','user.email=t@t','-c','user.name=t','-c','commit.gpgsign=false','add','-A']);
  const tr=new Set(cp.execFileSync('git',['ls-files'],{cwd:T,encoding:'utf8'}).split('\n').filter(Boolean));
  t('RAR-24',!readSet(T,'gates/regress/15-f.js',tr).has('NOTES.md')&&readSet(T,'gates/regress/12-c.js',tr).has('chess.jsx'),'a file named in a comment or a prose string is not read; one named as a path literal is');
  sh(['rm','-q','--cached','NOTES.md','gates/regress/15-f.js']);fs.unlinkSync(path.join(T,'NOTES.md'));fs.unlinkSync(path.join(T,'gates/regress/15-f.js'));
  // RAR-08 the harness changed: FULL
  w('gates/gates.sh','#!2');p=plan(T,red);t('RAR-08',!!p.full&&/HARNESS/.test(p.full),'gates/gates.sh changed: FULL ('+p.full+')');sh(['checkout','-q','--','gates/gates.sh']);
  // RAR-09 a killed red suite (no gates ran footer): FULL
  p=plan(T,mk('logs/9c-all.log',{red:['11-b'],foot:false,verdict:''}));t('RAR-09',!!p.full&&/killed/.test(p.full),'a red log with no "gates ran" footer: FULL ('+p.full+')');
  // RAR-10 a new gate since the red suite reruns
  w('gates/regress/14-e.js',"const L=require('../lib');");p=plan(T,red);t('RAR-10',!p.full&&p.rerun.includes('14-e'),'a gate added since the red suite reruns ('+p.rerun.join(' ')+')');fs.unlinkSync(path.join(T,'gates/regress/14-e.js'));
  // RAR-11 a gate the red suite ran is gone: FULL
  fs.renameSync(path.join(T,'gates/regress/13-d.js'),path.join(T,'x13'));p=plan(T,red);t('RAR-11',!!p.full&&/gone/.test(p.full),'a gate the red suite ran is gone: FULL ('+p.full+')');fs.renameSync(path.join(T,'x13'),path.join(T,'gates/regress/13-d.js'));
  // combine
  const sub=mk('logs/9-subset-all.log',{only:['11-b'],verdict:'SUBSET OK #9 — NOT A PUSH GATE'});
  let c=combine(T,red,sub,null,{fast:FASTOK});
  t('RAR-12',!!c.ok&&/RERUN-AFTER-RED COMBINED GREEN #9/.test(c.text)&&!/GATES GREEN/.test(c.text),'the sound case combines, and the combined log cannot be grepped as a push authority'+(c.refused?' (refused: '+c.refused+')':''));
  t('RAR-13',!!c.ok&&/\[10-a from the RED SUITE/.test(c.text)&&/\[11-b from the RERUN\]/.test(c.text),'kept gates come from the red suite and the rerun gate from the rerun');
  c=combine(T,red,mk('logs/9m-subset-all.log',{only:['11-b'],m:'aaaaaaaaaaaa',verdict:'SUBSET OK #9'}),null,{fast:FASTOK});t('RAR-14',!!c.refused&&/different bundle/.test(c.refused),'refused: the rerun measured another bundle ('+c.refused+')');
  c=combine(T,red,mk('logs/9n-subset-all.log',{only:['10-a'],verdict:'SUBSET OK #9'}),null,{fast:FASTOK});t('RAR-15',!!c.refused&&/11-b/.test(c.refused),'refused: the rerun skipped the red gate ('+c.refused+')');
  c=combine(T,red,mk('logs/9r-subset-all.log',{only:['11-b'],red:['11-b'],verdict:'SUBSET RED #9'}),null,{fast:FASTOK});t('RAR-16',!!c.refused,'refused: the rerun is itself red ('+c.refused+')');
  c=combine(T,red,mk('logs/9t-subset-all.log',{only:['11-b'],tag:'#8',verdict:'SUBSET OK #8'}),null,{fast:FASTOK});t('RAR-17',!!c.refused&&/different builds/.test(c.refused),'refused: the two logs name different builds ('+c.refused+')');
  c=combine(T,red,mk('logs/9u-subset-all.log',{only:['11-b'],tool:'pw 2',verdict:'SUBSET OK #9'}),null,{fast:FASTOK});t('RAR-18',!!c.refused&&/toolchain/.test(c.refused),'refused: the toolchain changed between the runs ('+c.refused+')');
  c=combine(T,red,sub,null,{fast:[FASTOK[0],{name:'unit-held-guard',ok:0,fail:1,rc:1,pass:[]},FASTOK[2]]});t('RAR-19',!!c.refused&&/unit-held-guard/.test(c.refused),'refused: a fast layer is red now ('+c.refused+')');
  c=combine(T,red,sub,null,{fast:[FASTOK[0],FASTOK[1],{name:'fastgate-drive',ok:0,fail:0,rc:0,pass:[]}]});t('RAR-20',!!c.refused&&/fastgate-drive/.test(c.refused),'refused: a fast layer asserting nothing (0 ok at exit 0) is not green ('+c.refused+')');
  w('app.js','bundle-2');c=combine(T,red,sub,null,{fast:FASTOK});t('RAR-21',!!c.refused&&/FULL/.test(c.refused),'refused: the bundle changed after the red suite, so the plan is FULL ('+c.refused+')');w('app.js','bundle-1');
  const red2=mk('logs/9k-all.log',{red:['11-b','10-a']});const ex=red2;
  // a kept gate that is not green in the red log (it was red there but its read set unchanged cannot happen; force via a log with a missing section)
  w('logs/9h-all.log',fs.readFileSync(red,'utf8').replace(/=== 12-c ===\nPASS 12-c one\n    12-c: green \(1 PASS\)\n/,''));
  c=combine(T,path.join(T,'logs/9h-all.log'),sub,null,{fast:FASTOK});t('RAR-22',!!c.refused&&/12-c/.test(c.refused),'refused: a kept gate shows no green in the red suite ('+c.refused+')');
  // RAR-23 the verify-log.sh consumers cannot read it as a push: no GATES GREEN line
  c=combine(T,red,sub,null,{fast:FASTOK});t('RAR-23',!!c.ok&&!c.text.split('\n').some(l=>/^GATES GREEN/.test(l)),'the combined log carries no GATES GREEN line, so verify-log.sh refuses it as a push authority today');
  void ex;
  fs.rmSync(T,{recursive:true,force:true});
  console.log('rerun-after-red selftest: '+pass+' ok, '+fail+' FAIL');
  return fail?1:0;
}

if(require.main===module){
  const [verb,...a]=process.argv.slice(2);const root=path.resolve(__dirname,'..');
  if(verb==='plan'&&a[0])process.exitCode=printPlan(plan(root,a[0],{app:process.env.CT_APP}));   // #550: exitCode, not exit() - a piped stdout is not truncated (90d0c90)
  else if(verb==='combine'&&a[1]){const r=combine(root,a[0],a[1],a[2],{app:process.env.CT_APP});
    if(r.refused){console.log('REFUSED: '+r.refused);process.exitCode=1;return;}
    console.log(a[2]?'wrote '+a[2]:r.text);console.log('RERUN-AFTER-RED: combined, '+r.plan.keep.length+' kept, '+r.plan.rerun.length+' rerun');process.exitCode=0;}
  else if(verb==='selftest')process.exitCode=selftest();
  else{console.log('usage: node gates/rerun-after-red.js plan <red-log> | combine <red-log> <subset-log> [out] | selftest');process.exitCode=2;}
}
module.exports={plan,combine,parseLog,readSet,stripComments};
