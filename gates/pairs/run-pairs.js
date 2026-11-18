#!/usr/bin/env node
'use strict';
// gates/pairs/run-pairs.js - THE GRADING MACHINE. It checks a job with no model reading anything: it runs the job's gate on the
// real code in every situation the job must work in (the gate must PASS in each), then on two or three copies of the code each
// broken a different way on purpose (the gate must FAIL on each). A gate that passes a broken copy is BLIND; a gate that fails
// the real code somewhere is OVER STRICT. jobs/build-the-grading-machine-2026-11-15 (batch 12; decisions/batch-12-adopts-break-it-
// again-testing-2026-11-15). The format, the verdicts and how to add a job are in gates/pairs/README.md.
//
//   node gates/pairs/run-pairs.js --job <id>      one job, from gates/pairs/jobs/<id>.json
//   node gates/pairs/run-pairs.js --all           every job in gates/pairs/jobs/
//   node gates/pairs/run-pairs.js --selftest      the machine's own test (fixture gates, no browser, well under 10 minutes)
//   options: --base <ref> (default HEAD: the COMMITTED tree is what is graded, never uncommitted edits), --keep (leave the
//            worktrees for a look), --flip <1-4> (selftest only: reverse one expectation, which must turn it red),
//            --only <real|break-name,...> (run only those tries of a job; a partial run is never CHECKED, see below)
//
// WHAT IT TOUCHES. It never edits the real tree. Every try - the real code included - runs in a throwaway `git worktree` of the
// base under gates/pairs/.work/, which is removed afterwards; gates/node_modules is linked in so a bundle can be built. Logs go
// to gates/pairs/logs/, the verdicts to gates/pairs/report.json and gates/pairs/report.txt. Nothing else is written, apart from
// git's own worktree bookkeeping under .git/worktrees, which `git worktree remove` clears.
//
// EXIT 0 only when every job it ran reads CHECKED (for --selftest: only when it prints SELFTEST OK). Anything else exits 1.
// It runs apart from the full suite: gates/gates.sh does not call it, and it changes no gate.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const HERE=__dirname;const ROOT=path.resolve(HERE,'..','..');
const WORK=path.join(HERE,'.work'),LOGS=path.join(HERE,'logs');
const BUILD_INPUTS=/^(chess\.jsx|gates\/entry\.jsx)$/;   // what gates/build.sh bundles: a patch touching one of these needs a fresh bundle
const ERR_RE=/\b(error|exception|cannot|could not|not found|missing|threw|throws?|ENOENT|TypeError|ReferenceError|SyntaxError|RangeError|timed? ?out|unhandled|refused|crash(ed)?)\b/i;
const SCRUB=['CT_APP','CT_PIN','CT_EXPECT','CT_SHOTS','CT_OUT','CT_INPUTS_OUT','GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY'];

function args(argv){const o={_:[]};for(let i=0;i<argv.length;i++){const a=argv[i];if(a==='--all'||a==='--selftest'||a==='--keep')o[a.slice(2)]=true;
  else if(a==='--job'||a==='--base'||a==='--flip'||a==='--only')o[a.slice(2)]=argv[++i];else o._.push(a);}return o;}
const sh=(cmd,a,opt)=>cp.spawnSync(cmd,a,Object.assign({encoding:'utf8',maxBuffer:256*1024*1024},opt||{}));
const git=(a,cwd)=>sh('git',a,{cwd:cwd||ROOT});
const rel=p=>path.relative(ROOT,p);
const stamp=()=>new Date().toISOString().replace(/[-:]/g,'').replace(/\..*/,'Z');
const trim=(s,n)=>{s=String(s).replace(/\s+$/,'');return s.length>(n||170)?s.slice(0,(n||170)-1)+'…':s;};
const md5=f=>{try{return require('crypto').createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0,12);}catch(e){return null;}};

// ── LOADING AND CHECKING A JOB FILE ────────────────────────────────────────────────────────────────────────────────────────────
function loadJob(file){
  const j=JSON.parse(fs.readFileSync(file,'utf8'));const bad=[];
  if(!j.job)bad.push('no "job"');if(!j.gate)bad.push('no "gate"');
  if(!Array.isArray(j.checks)||!j.checks.length)bad.push('no "checks"');
  if(!Array.isArray(j.situations)||!j.situations.length)bad.push('no "situations"');
  if(!Array.isArray(j.breaks)||j.breaks.length<1)bad.push('no "breaks"');
  (j.situations||[]).forEach((s,k)=>{if(!s.name)bad.push('situation '+k+' has no name');if(!s.match&&!s.env)bad.push('situation '+(s.name||k)+' has neither match nor env');});
  (j.breaks||[]).forEach((b,k)=>{if(!b.name)bad.push('break '+k+' has no name');if(!b.patch)bad.push('break '+(b.name||k)+' has no patch');});
  const envMode=(j.situations||[]).map(s=>!!s.env);if(envMode.some(Boolean)&&!envMode.every(Boolean))bad.push('situations mix env and match-only; give every situation an env, or none');
  j._file=file;j._dir=path.dirname(file);j._bad=bad;return j;
}
const patchPath=(j,b)=>path.isAbsolute(b.patch)?b.patch:path.resolve(j._root||HERE,b.patch);
function patchFiles(p){const t=fs.readFileSync(p,'utf8');const out=new Set();for(const m of t.matchAll(/^\+\+\+ b\/(\S+)/gm))out.add(m[1]);for(const m of t.matchAll(/^--- a\/(\S+)/gm))out.add(m[1]);return [...out];}
function needsBuild(j){if(j.build==='always')return true;if(j.build==='never')return false;
  return j.breaks.some(b=>{try{return patchFiles(patchPath(j,b)).some(f=>BUILD_INPUTS.test(f));}catch(e){return false;}});}

// ── A WORKTREE, A PATCH, A BUILD, A RUN ────────────────────────────────────────────────────────────────────────────────────────
function mkTree(base,name){
  fs.mkdirSync(WORK,{recursive:true});const dir=path.join(WORK,name.replace(/[^\w.-]+/g,'_')+'-'+process.pid+'-'+Date.now());
  const r=git(['worktree','add','--detach','-q',dir,base]);if(r.status!==0)return {err:'git worktree add failed: '+trim(r.stderr||r.stdout)};
  const nm=path.join(ROOT,'gates','node_modules');if(fs.existsSync(nm)&&!fs.existsSync(path.join(dir,'gates','node_modules')))fs.symlinkSync(nm,path.join(dir,'gates','node_modules'));
  return {dir};
}
function rmTree(dir,keep){if(keep||!dir)return;git(['worktree','remove','--force',dir]);try{fs.rmSync(dir,{recursive:true,force:true});}catch(e){}git(['worktree','prune']);
  for(const f of fs.existsSync(WORK)?fs.readdirSync(WORK):[]){if(f.startsWith(path.basename(dir)+'.'))try{fs.rmSync(path.join(WORK,f),{force:true});}catch(e){}}}
function applyPatch(dir,p){
  const c=git(['apply','--check','--whitespace=nowarn',p],dir);if(c.status!==0)return 'the patch does not apply: '+trim((c.stderr||c.stdout).split('\n')[0]);
  const a=git(['apply','--whitespace=nowarn',p],dir);if(a.status!==0)return 'git apply failed: '+trim((a.stderr||a.stdout).split('\n')[0]);
  const d=git(['diff','--quiet'],dir);if(d.status===0)return 'the patch applied but changed nothing';return null;
}
function buildNumber(dir){const t=(()=>{try{return fs.readFileSync(path.join(dir,'app.js'),'utf8').slice(0,4000);}catch(e){return '';}})();
  const m=/#(\d{3,4}) - \d{4}-\d\d-\d\d/.exec(t)||/#(\d{3,4})/.exec(t);return m?'#'+m[1]:'#999';}
function build(dir,logf){
  const out=dir+'.app.js';const env=Object.assign({},process.env,{CT_OUT:out,CT_RUNID:process.env.CT_RUNID||'pairs-runner'});SCRUB.filter(k=>k!=='CT_OUT').forEach(k=>delete env[k]);
  const r=sh('bash',[path.join(dir,'gates','build.sh'),buildNumber(dir)],{cwd:dir,env,timeout:600000});
  fs.appendFileSync(logf,'=== build '+buildNumber(dir)+' -> '+out+' (exit '+r.status+')\n'+(r.stdout||'')+(r.stderr||'')+'\n');
  if(r.status!==0||!fs.existsSync(out))return {err:'the build failed (exit '+r.status+'): '+trim(((r.stdout||'')+(r.stderr||'')).split('\n').filter(l=>/FAIL|error/i.test(l))[0]||'see the log')};
  return {bundle:out,md5:md5(out)};
}
function runGate(j,dir,bundle,sit,logf){
  const env=Object.assign({},process.env);SCRUB.forEach(k=>delete env[k]);
  Object.assign(env,j.env||{},(sit&&sit.env)||{});if(bundle)env.CT_APP=bundle;env.CT_SHOTS=path.join(LOGS,'shots');
  const cmd=j.cmd||['node',j.gate];const t0=Date.now();
  const r=sh(cmd[0],cmd.slice(1),{cwd:dir,env,timeout:(j.timeoutSec||3600)*1000,killSignal:'SIGKILL'});
  const text=(r.stdout||'')+(r.stderr?'\n--- stderr ---\n'+r.stderr:'');
  const start=fs.existsSync(logf)?fs.readFileSync(logf,'utf8').split('\n').length:1;
  const head='=== run '+cmd.join(' ')+(sit&&sit.env?'  situation '+sit.name+' env '+JSON.stringify(sit.env):'')+(bundle?'  CT_APP='+bundle:'')+'  (exit '+r.status+(r.signal?' signal '+r.signal:'')+', '+Math.round((Date.now()-t0)/1000)+'s)\n';
  fs.appendFileSync(logf,head+text+'\n');
  return {lines:text.split('\n'),offset:start+1,status:r.status,signal:r.signal,timedOut:!!(r.error&&/ETIMEDOUT/.test(String(r.error.code||r.error))),secs:Math.round((Date.now()-t0)/1000)};
}

// ── READING A GATE'S OUTPUT ────────────────────────────────────────────────────────────────────────────────────────────────────
// A checked line is a line that starts PASS or FAIL (gates/lib.js L.say) and matches one of the job's checks. A situation picks
// its lines by `match` (a regex over the line's text after PASS/FAIL), or - when it carries an env - is a run of its own.
function judge(j,run,sit){
  const checks=j.checks.map(s=>new RegExp(s));const sm=sit&&sit.match?new RegExp(sit.match):null;const sel=[];
  run.lines.forEach((l,i)=>{const m=/^(PASS|FAIL) (.*)$/.exec(l);if(!m)return;const body=m[2];if(!checks.some(r=>r.test(body)))return;if(sm&&!sm.test(body))return;sel.push({ok:m[1]==='PASS',text:l,i});});
  return {n:sel.length,fail:sel.filter(x=>!x.ok),pass:sel.filter(x=>x.ok),sel};
}
// THE SHORT FAILURE REPORT [his pick at about 3:14pm EST Sun 15 Nov 2026]: at most about 15 lines - the job, gate and check, what
// was expected against what happened, the situation, the first error the gate printed and the few lines before the failure, and
// the full log's path and line. A first look, never a replacement for the log.
function shortReport(o){
  const L=[];const lines=o.run?o.run.lines:[];const at=o.at!=null?o.at:(lines.length-1);
  L.push(o.verdict+'  job '+o.job+'  try '+o.tryName+'  gate '+o.gate);
  L.push('  check: '+trim(o.checks.join(' | '),120)+'   situation: '+(o.situation||'all'));
  L.push('  expected: '+o.expected);L.push('  happened: '+trim(o.happened,150));
  if(o.firstLine)L.push('  first failing line: '+trim(o.firstLine,150));
  let err=null;for(let i=0;i<Math.min(at+1,lines.length);i++){const l=lines[i];if(/^(PASS|FAIL) /.test(l))continue;if(ERR_RE.test(l)){err={i,l};break;}}
  L.push('  first error printed: '+(err?'line '+(o.run.offset+err.i)+': '+trim(err.l.trim(),130):'none before the failure'));
  const before=[];for(let i=at-1;i>=0&&before.length<4;i--){if(lines[i].trim())before.unshift({i,l:lines[i]});}
  if(before.length){L.push('  the lines before it:');before.forEach(b=>L.push('    '+(o.run.offset+b.i)+': '+trim(b.l.trim(),130)));}
  L.push('  full log: '+o.log+(o.run?':'+(o.run.offset+at):''));
  return L.slice(0,15);
}

// ── ONE JOB ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function runJob(j,opt){
  const res={job:j.job,gate:j.gate,checks:j.checks,base:null,tries:[],findings:[],verdict:null,started:new Date().toISOString()};
  const logdir=path.join(LOGS,(opt.stampDir||stamp()),j.job.replace(/[^\w.-]+/g,'_'));fs.mkdirSync(logdir,{recursive:true});
  const base=git(['rev-parse','--verify',(opt.base||'HEAD')+'^{commit}']);if(base.status!==0){res.verdict='ERROR';res.findings.push({verdict:'ERROR',short:['ERROR  job '+j.job+': the base '+(opt.base||'HEAD')+' is not a commit']});return res;}
  res.base=base.stdout.trim();
  if(j._bad.length){res.verdict='ERROR';res.findings.push({verdict:'ERROR',short:['ERROR  job '+j.job+'  the job file is malformed: '+j._bad.join('; '),'  file: '+rel(j._file)]});return res;}
  const doBuild=needsBuild(j);const envMode=j.situations.every(s=>!!s.env);
  const only=opt.only?new Set(String(opt.only).split(',')):null;
  const tries=[{name:'real',real:true}].concat(j.breaks.map(b=>Object.assign({name:'break:'+b.name},{brk:b}))).filter(t=>!only||only.has(t.real?'real':t.brk.name));
  for(const t of tries){
    const logf=path.join(logdir,t.name.replace(/[^\w.-]+/g,'_')+'.log');fs.writeFileSync(logf,'# '+j.job+'  '+t.name+'  base '+res.base+'  '+new Date().toISOString()+'\n');
    const tr={name:t.name,log:rel(logf),outcome:null,detail:null,bundleMd5:null,secs:0,situations:{}};res.tries.push(tr);
    const fail=(verdict,o)=>{const f=Object.assign({verdict,job:j.job,tryName:t.name,gate:j.gate,checks:j.checks,log:rel(logf)},o);f.short=shortReport(f);res.findings.push({verdict,try:t.name,situation:o.situation||null,short:f.short});};
    const w=mkTree(res.base,t.name);if(w.err){tr.outcome='ERROR';tr.detail=w.err;fail('ERROR',{expected:'a worktree of the base',happened:w.err});continue;}
    try{
      if(t.brk){const p=patchPath(j,t.brk);if(!fs.existsSync(p)){tr.outcome='ERROR';tr.detail='no patch file '+rel(p);fail('ERROR',{expected:'the break\'s patch file',happened:tr.detail});continue;}
        const e=applyPatch(w.dir,p);if(e){tr.outcome='ERROR';tr.detail=e+' ('+rel(p)+')';fail('ERROR',{expected:'the patch applies to the base and changes something',happened:tr.detail});continue;}}
      let bundle=null;if(doBuild){const b=build(w.dir,logf);if(b.err){tr.outcome='ERROR';tr.detail=b.err;fail('ERROR',{expected:'the copy builds',happened:b.err});continue;}bundle=b.bundle;tr.bundleMd5=b.md5;}
      else tr.bundleMd5=md5(path.join(w.dir,'app.js'));
      const runs=envMode?j.situations.map(s=>({sit:s,run:runGate(j,w.dir,bundle,s,logf)})):(()=>{const r=runGate(j,w.dir,bundle,null,logf);return j.situations.map(s=>({sit:s,run:r}));})();
      tr.secs=[...new Set(runs.map(x=>x.run))].reduce((a,r)=>a+r.secs,0);
      for(const {sit,run} of runs){
        const v=judge(j,run,sit);tr.situations[sit.name]={lines:v.n,fail:v.fail.length,exit:run.status,timedOut:run.timedOut};
        if(run.timedOut){tr.situations[sit.name].error='timed out after '+(j.timeoutSec||3600)+'s';}
      }
      const sits=Object.entries(tr.situations);
      const timed=sits.find(([,s])=>s.timedOut);if(timed){tr.outcome='ERROR';tr.detail='the gate timed out';const r0=runs[0].run;fail('ERROR',{situation:timed[0],expected:'the gate finishes',happened:'killed after '+(j.timeoutSec||3600)+'s',run:r0});continue;}
      if(t.real){
        // REAL CODE: every situation must carry checked lines (a situation with none is vacuous, not a pass) and every one must PASS.
        const empty=sits.filter(([,s])=>s.lines===0);const strict=sits.filter(([,s])=>s.fail>0);
        for(const [n] of empty){const x=runs.find(r=>r.sit.name===n);fail('ERROR',{situation:n,expected:'the real code is checked in this situation (at least one checked line)',happened:'no line matched the checks in this situation (exit '+x.run.status+'): the gate did not reach it, or a check or match is misspelt',run:x.run});}
        for(const [n] of strict){const x=runs.find(r=>r.sit.name===n);const v=judge(j,x.run,x.sit);const f0=v.fail[0];
          fail('OVER STRICT',{situation:n,expected:'every checked line PASSES on the real code',happened:v.fail.length+' of '+v.n+' checked lines FAIL on the real code',firstLine:f0.text,run:x.run,at:f0.i});}
        tr.outcome=empty.length?'ERROR':strict.length?'OVER STRICT':'PASSED';tr.detail=sits.map(([n,s])=>n+' '+(s.lines-s.fail)+'/'+s.lines).join(', ');
      } else {
        // A BREAK: it must make the gate FAIL - in each situation named by mustFailIn, or in at least one when none is named.
        const total=sits.reduce((a,[,s])=>a+s.lines,0);const need=t.brk.mustFailIn&&t.brk.mustFailIn.length?t.brk.mustFailIn:null;
        if(total===0){tr.outcome='ERROR';tr.detail='no checked line at all: the broken copy stopped the gate before any check (exit '+runs[0].run.status+')';
          fail('ERROR',{expected:'the gate runs its checks on the broken copy and one FAILS',happened:tr.detail,run:runs[0].run});continue;}
        const caught=need?need.every(n=>tr.situations[n]&&tr.situations[n].fail>0):sits.some(([,s])=>s.fail>0);
        if(caught){tr.outcome='CAUGHT';tr.detail=sits.filter(([,s])=>s.fail>0).map(([n,s])=>n+' '+s.fail+' FAIL').join(', ');}
        else{tr.outcome='BLIND';const miss=need?need.filter(n=>!(tr.situations[n]&&tr.situations[n].fail>0)):sits.map(([n])=>n);
          const x=runs.find(r=>r.sit.name===miss[0])||runs[0];const v=judge(j,x.run,x.sit);
          tr.detail='every checked line PASSED on the broken copy'+(need?' in '+miss.join(', '):'')+' ('+total+' lines)';
          fail('BLIND',{situation:miss.join(', '),expected:'the gate FAILS on this broken copy ('+(t.brk.why||t.brk.name)+')'+(need?' in '+need.join(', '):''),happened:tr.detail,firstLine:v.pass[0]?'(passed) '+v.pass[0].text:null,run:x.run,at:v.pass[0]?v.pass[0].i:null});}
      }
    } finally {rmTree(w.dir,opt.keep);}
  }
  const vs=new Set(res.findings.map(f=>f.verdict));
  res.verdict=vs.has('ERROR')?'ERROR':vs.has('BLIND')?'BLIND':vs.has('OVER STRICT')?'OVER STRICT':'CHECKED';
  if(res.verdict==='CHECKED'&&only)res.verdict='PARTIAL';   // a run of some tries can show a fault, never certify a job
  res.verdicts=[...vs];res.finished=new Date().toISOString();return res;
}

function writeReport(results,label){
  const rep={label,at:new Date().toISOString(),base:results[0]&&results[0].base,jobs:results.map(r=>({job:r.job,gate:r.gate,verdict:r.verdict,verdicts:r.verdicts,base:r.base,
    tries:r.tries.map(t=>({name:t.name,outcome:t.outcome,detail:t.detail,bundleMd5:t.bundleMd5,secs:t.secs,situations:t.situations,log:t.log})),findings:r.findings.map(f=>({verdict:f.verdict,try:f.try,situation:f.situation,short:f.short}))}))};
  const txt=[];txt.push('GRADING MACHINE '+label+'  '+rep.at+'  base '+(rep.base||'?').slice(0,12));
  for(const r of rep.jobs){txt.push('');txt.push(r.verdict+'  '+r.job+'  ('+r.gate+')');for(const t of r.tries)txt.push('   '+(t.outcome||'?').padEnd(11)+t.name+'  '+(t.detail||'')+(t.bundleMd5?'  bundle '+t.bundleMd5:'')+'  '+t.secs+'s  log '+t.log);
    for(const f of r.findings){txt.push('');f.short.forEach(l=>txt.push('   '+l));}}
  const all=rep.jobs.every(r=>r.verdict==='CHECKED');txt.push('');txt.push(all?'ALL CHECKED ('+rep.jobs.length+' job'+(rep.jobs.length===1?'':'s')+')':'NOT ALL CHECKED: '+rep.jobs.filter(r=>r.verdict!=='CHECKED').map(r=>r.job+' '+r.verdict).join('; '));
  return {rep,txt:txt.join('\n')+'\n',all};
}

// ── ITS OWN TEST ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Four fixture pairs in gates/pairs/selftest/ (node scripts, no browser): one whose gate catches its break (must read CHECKED), one
// whose gate is blind to its break (BLIND), one where the gate is over strict in a situation (OVER STRICT), and one whose failure's
// cause is printed well before the failing check (its short report must carry that earlier line, its log path and line, and be at
// most 15 lines). SELFTEST OK only when all four behave AND reversing any one expectation turns the verdict red, which is shown
// on the same results so the reversal is a property of the comparison and not of a second run. --flip <k> reverses one for real.
const EXPECT=[
  {pair:'st1-caught',want:'CHECKED',what:'a pair whose gate catches its break reads CHECKED'},
  {pair:'st2-blind',want:'BLIND',what:'a pair whose gate is blind to its break reads BLIND'},
  {pair:'st3-overstrict',want:'OVER STRICT',what:'a situation where the gate fails the real code reads OVER STRICT'},
  {pair:'st4-cause',want:'OVER STRICT',report:"fixture key 'tabTop' not found",what:"a failure whose cause is printed before the failing check: its short report carries that earlier line, the log's path and line, in at most 15 lines"}];
function evalExpect(e,r,flip){
  let ok=r&&r.verdict===e.want;
  if(ok&&e.report){const f=r.findings.find(x=>x.verdict===e.want);const s=f?f.short:[];ok=s.length<=15&&s.some(l=>l.includes(e.report))&&s.some(l=>/full log: gates\/pairs\/logs\/\S+:\d+$/.test(l));}
  return flip?!ok:ok;
}
function selftest(opt){
  const dir=path.join(HERE,'selftest','jobs');const t0=Date.now();const sd='selftest-'+stamp();const results={};
  for(const e of EXPECT){const j=loadJob(path.join(dir,e.pair+'.json'));j._root=path.join(HERE,'selftest');results[e.pair]=runJob(j,Object.assign({},opt,{stampDir:sd}));}
  const flip=opt.flip?+opt.flip:0;let ok=true;const out=[];
  EXPECT.forEach((e,k)=>{const r=results[e.pair];const pass=evalExpect(e,r,flip===k+1);ok=ok&&pass;
    out.push((pass?'ok   ':'FAIL ')+(k+1)+'. '+e.what+(flip===k+1?'  [REVERSED by --flip '+flip+']':'')+': read '+(r?r.verdict:'nothing'));});
  // the reversal proof, on these same results: reversing expectation k alone must turn the selftest red
  const rev=EXPECT.map((e,k)=>{const red=EXPECT.some((e2,k2)=>!evalExpect(e2,results[e2.pair],k2===k));return {k:k+1,red};});
  rev.forEach(x=>out.push((x.red?'ok   ':'FAIL ')+'reversing expectation '+x.k+' alone turns the selftest '+(x.red?'red':'GREEN - it cannot fail')));
  if(!flip)ok=ok&&rev.every(x=>x.red);
  const st4=results['st4-cause'];const f4=st4&&st4.findings.find(f=>f.verdict==='OVER STRICT');
  if(f4){out.push('the st4 short report ('+f4.short.length+' lines):');f4.short.forEach(l=>out.push('   | '+l));}
  const {rep,txt}=writeReport(Object.values(results),'selftest');fs.writeFileSync(path.join(LOGS,sd,'report.txt'),txt);fs.writeFileSync(path.join(LOGS,sd,'report.json'),JSON.stringify(rep,null,1));
  out.push('selftest report: '+rel(path.join(LOGS,sd,'report.txt'))+'  ('+Math.round((Date.now()-t0)/1000)+'s)');
  out.push(ok?'SELFTEST OK':'SELFTEST FAILED');console.log(out.join('\n'));return ok;
}

function main(){
  const o=args(process.argv.slice(2));fs.mkdirSync(LOGS,{recursive:true});
  if(o.selftest){process.exit(selftest(o)?0:1);}
  let files=[];const jd=path.join(HERE,'jobs');
  if(o.all)files=fs.readdirSync(jd).filter(f=>f.endsWith('.json')).sort().map(f=>path.join(jd,f));
  else if(o.job){const f=path.join(jd,o.job.replace(/\.json$/,'')+'.json');if(!fs.existsSync(f)){console.error('no job file '+rel(f));process.exit(1);}files=[f];}
  else{console.error('usage: node gates/pairs/run-pairs.js --job <id> | --all | --selftest  [--base <ref>] [--keep] [--only real,<break>]');process.exit(2);}
  const sd=stamp();const results=[];
  for(const f of files){const j=loadJob(f);j._root=HERE;console.log('grading '+j.job+' ('+j.gate+'): '+(1+j.breaks.length)+' tries over '+j.situations.length+' situations');const r=runJob(j,Object.assign({},o,{stampDir:sd}));results.push(r);
    console.log('  '+r.verdict+'  '+r.tries.map(t=>t.name+'='+t.outcome).join('  '));}
  const {rep,txt,all}=writeReport(results,o.all?'--all':'--job '+o.job);
  fs.writeFileSync(path.join(HERE,'report.json'),JSON.stringify(rep,null,1));fs.writeFileSync(path.join(HERE,'report.txt'),txt);
  fs.writeFileSync(path.join(LOGS,sd,'report.txt'),txt);
  process.stdout.write(txt);process.exit(all?0:1);
}
if(require.main===module)main();
module.exports={loadJob,runJob,judge,shortReport,writeReport,EXPECT,evalExpect};
