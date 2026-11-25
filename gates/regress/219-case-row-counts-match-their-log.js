'use strict';
// gates/regress/219-case-row-counts-match-their-log.js - A CASE ROW THAT PUBLISHES "N PASS / M FAIL lines naming <id> in <log>"
// MUST BE RIGHT ABOUT N AND M. TC-R361..362, US-R230. No browser: it reads committed files.
//
// WHY [#553 batch 14 B2; jobs/tc-inv-case-rows-cite-a-result-that-is-not-in-the-log-2026-09-27]. The job was filed because six TC-INV
// rows published 'PASS #423' from a log that never named one of their ids. #548 and #550 re-cited them in a COUNTED form - "45 PASS /
// 0 FAIL lines naming TC-INV-02a in gates/logs/548b-all.log ... counted as the lines that begin PASS or FAIL and contain the word" -
// and `verify-log.sh --citations` arm (2) now refuses a row whose id is absent from its cited log. The checker of 14 Nov left one
// caveat: the arm checks that the id OCCURS, not the count the cell publishes, so a cell claiming 45 PASS where the log has 3 would
// still pass. This gate closes that: for every case row in claude/stories/*.md written in that counted form, it re-counts in the
// cited log, by the cell's own stated rule, and requires both numbers to match.
//
//  TC-R361 (DENOMINATOR, its own line) at least one counted row is found, and each cited log resolves to a committed file
//          (gates/logs/<f> is read from claude/agents/gatelogs/<f> when only the archive is committed, as arm (2) maps it).
//  TC-R362 per row: the PASS and FAIL lines naming the id (the id not followed by a letter or digit, so 03 does not count 03b) equal
//          the published N and M, and N + M > 0.
// CONTROL-RECORD: e3317d5 2026-11-24 total=6 red=1 scope=full how=#553 B2 (the pair gates/pairs/jobs/tc-inv-case-rows-cite-a-result-that-is-not-in-the-log-2026-09-27.json, base e3317d5): TC-INV-02a's cell given 46 PASS where 548b-all.log carries 45 - TC-R362 for 02a red alone, while verify-log.sh --citations arm (2) stays green (the id occurs); TC-INV-02c re-cited to 423-all.log reds 02c's TC-R362 alone; two of the seven TC-INV-02d lines cut from the archived log reds 02d's alone. The committed tree 6/0
const L=require('../lib');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.join(__dirname,'..','..');
const SD=process.env.CT_G219_STORIES||path.join(ROOT,'claude','stories');
/* READ THROUGH GIT, NOT fs [#553 B2, the landing pre-check's red: 'READ A RECORDS-ONLY PATH ... make the path FORCE in classify(), or stop
   reading it' (#549 item (71))]. claude/stories/ and claude/agents/gatelogs/ are RECORDS to gates/fastgate.sh's classify(), and must stay so
   (FORCE would send every story, case or close-out-log commit to a full suite), so this gate reads them as gate 81 does: through a git
   child process, which lib.js's fs observer does not see - and gates/fastgate.sh RUNS this gate when a records range adds or changes
   anything under either path, refusing on any red (the twin of its gate-81 block; gates/fastgate-drive.sh H76/H77). The bytes are the
   WORKING TREE's (git ls-files lists the tracked and untracked files; git hash-object -w stores each file's bytes as a loose blob, which is
   harmless and already present for a committed file, and cat-file blob reads them back), which on a committed checkout is the committed object, and which still sees an uncommitted edit - the grading
   machine's breaks are applied and not committed. Same rows, same counts, same lines as the fs read on the same tree. CT_G219_STORIES
   (an operator-named directory, never set by gates.sh) is still read through fs. */
const git=(args,input)=>cp.execFileSync('git',['-C',ROOT,...args],{maxBuffer:1<<28,input,stdio:['pipe','pipe','ignore']}).toString();
const viaGit=!process.env.CT_G219_STORIES;
const rel=(p)=>path.relative(ROOT,p).split(path.sep).join('/');
const readText=(p)=>{if(!viaGit)return fs.readFileSync(p,'utf8');const h=git(['hash-object','-w','--stdin-paths'],rel(p)+'\n').trim();return git(['cat-file','blob',h]);};
const listed=(dir)=>new Set(git(['ls-files','-co','--exclude-standard','--',rel(dir)]).split('\n').filter(Boolean));
const isFile=(p)=>{if(!viaGit){try{return fs.statSync(p).isFile();}catch(e){return false;}}return listed(path.dirname(p)).has(rel(p));};
const mdIn=(dir)=>viaGit?[...listed(dir)].filter(f=>path.posix.dirname(f)===rel(dir)).map(f=>path.posix.basename(f)):fs.readdirSync(dir);
const RE=/(\d+) PASS \/ (\d+) FAIL lines naming (TC-[A-Za-z0-9-]+) in (\S+?-all\.log)/g;
L.run(async()=>{
  const rows=[];
  for(const f of mdIn(SD).filter(x=>/\.md$/.test(x)).sort()){
    const lines=readText(path.join(SD,f)).split('\n');
    lines.forEach((ln,i)=>{if(!/^\|/.test(ln))return;let m;RE.lastIndex=0;while((m=RE.exec(ln))){rows.push({file:f,line:i+1,pass:+m[1],fail:+m[2],id:m[3],log:m[4]});}});
  }
  const resolve=(p)=>{const cands=[path.join(ROOT,p)];const b=path.basename(p);cands.push(path.join(ROOT,'claude','agents','gatelogs',b));
    for(const c of cands){if(isFile(c))return c;}return null;};
  const unresolved=rows.filter(r=>!resolve(r.log)).map(r=>r.id+' -> '+r.log);
  L.say(rows.length>0&&unresolved.length===0,'TC-R361 DENOMINATOR '+rows.length+' case row(s) publish a counted result ('+rows.map(r=>r.id).join(', ')+') and every cited log resolves to a committed file',{unresolved});
  const cache={};
  for(const r of rows){const lp=resolve(r.log);if(!lp)continue;
    const txt=cache[lp]||(cache[lp]=readText(lp).split('\n'));
    const idre=new RegExp(r.id.replace(/[-]/g,'\\-')+'(?![A-Za-z0-9])');
    const p=txt.filter(t=>/^PASS /.test(t)&&idre.test(t)).length,fl=txt.filter(t=>/^FAIL /.test(t)&&idre.test(t)).length;
    L.say(p===r.pass&&fl===r.fail&&p+fl>0,'TC-R362 '+r.id+' ('+r.file+':'+r.line+') publishes '+r.pass+' PASS / '+r.fail+' FAIL and '+path.relative(ROOT,lp)+' carries '+p+' / '+fl,{published:[r.pass,r.fail],counted:[p,fl]});
  }
},'219-case-row-counts-match-their-log');
