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
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const SD=process.env.CT_G219_STORIES||path.join(ROOT,'claude','stories');
const RE=/(\d+) PASS \/ (\d+) FAIL lines naming (TC-[A-Za-z0-9-]+) in (\S+?-all\.log)/g;
L.run(async()=>{
  const rows=[];
  for(const f of fs.readdirSync(SD).filter(x=>/\.md$/.test(x)).sort()){
    const lines=fs.readFileSync(path.join(SD,f),'utf8').split('\n');
    lines.forEach((ln,i)=>{if(!/^\|/.test(ln))return;let m;RE.lastIndex=0;while((m=RE.exec(ln))){rows.push({file:f,line:i+1,pass:+m[1],fail:+m[2],id:m[3],log:m[4]});}});
  }
  const resolve=(p)=>{const cands=[path.join(ROOT,p)];const b=path.basename(p);cands.push(path.join(ROOT,'claude','agents','gatelogs',b));
    for(const c of cands){try{if(fs.statSync(c).isFile())return c;}catch(e){}}return null;};
  const unresolved=rows.filter(r=>!resolve(r.log)).map(r=>r.id+' -> '+r.log);
  L.say(rows.length>0&&unresolved.length===0,'TC-R361 DENOMINATOR '+rows.length+' case row(s) publish a counted result ('+rows.map(r=>r.id).join(', ')+') and every cited log resolves to a committed file',{unresolved});
  const cache={};
  for(const r of rows){const lp=resolve(r.log);if(!lp)continue;
    const txt=cache[lp]||(cache[lp]=fs.readFileSync(lp,'utf8').split('\n'));
    const idre=new RegExp(r.id.replace(/[-]/g,'\\-')+'(?![A-Za-z0-9])');
    const p=txt.filter(t=>/^PASS /.test(t)&&idre.test(t)).length,fl=txt.filter(t=>/^FAIL /.test(t)&&idre.test(t)).length;
    L.say(p===r.pass&&fl===r.fail&&p+fl>0,'TC-R362 '+r.id+' ('+r.file+':'+r.line+') publishes '+r.pass+' PASS / '+r.fail+' FAIL and '+path.relative(ROOT,lp)+' carries '+p+' / '+fl,{published:[r.pass,r.fail],counted:[p,fl]});
  }
},'219-case-row-counts-match-their-log');
