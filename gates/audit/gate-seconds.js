#!/usr/bin/env node
// gates/audit/gate-seconds.js - the seconds of every gate in a suite, and the slowest N [batch 13;
// jobs/the-slowest-gates-are-made-faster-with-every-check-kept-2026-11-18, part 1].
//
// WHERE THE SECONDS COME FROM, because an archived -all.log DOES NOT CARRY THEM. gates.sh writes one header time at the
// start of the suite and none per gate, so claude/agents/gatelogs/551c-all.log (the newest green full suite when this was
// written) names every gate and its PASS count and NOT ONE gate's duration. This script never invents a number: given only
// an -all.log it prints the roster and PASS counts with every seconds cell "n/a", says why, and exits 2. Two sources DO
// carry seconds, and it reads either:
//   --dir <gates/logs>   the per-gate logs a suite leaves beside its -all.log (<stem>-<gate>.log). gates.sh writes each one
//                        when that gate finishes and runs the gates one after another, so a gate's seconds are its log's
//                        mtime less the previous gate's (the first gate's: less the -all.log header time, so it also
//                        carries the unit layer and is marked so). Valid only for logs still in the container that ran
//                        the suite, before anything touched them; a file's mtime older than the previous one is refused.
//   --tsv <file>         rows "<gate>\t<seconds>\t<PASS>\t<FAIL>\t<exit>[\t...]" as gates/audit/time-gates.sh writes them
//                        (each gate timed alone, the way gates.sh runs it). Rows not matching the shape are ignored.
// usage: node gates/audit/gate-seconds.js --log <stem>-all.log [--dir gates/logs | --tsv file] [--top 10] [--md]
'use strict';
const fs=require('fs'),path=require('path');
const A=process.argv.slice(2);const opt=(k)=>{const i=A.indexOf(k);return i>=0?A[i+1]:null;};
const LOG=opt('--log'),DIR=opt('--dir'),TSV=opt('--tsv'),TOP=+(opt('--top')||10),MD=A.includes('--md');
if(!LOG&&!TSV){console.error('usage: gate-seconds.js --log <stem>-all.log [--dir gates/logs | --tsv file] [--top N] [--md]');process.exit(2);}
const rows=new Map();   // gate -> {pass, secs, note}
let order=[],stem=null,t0=null;
if(LOG){
  const txt=fs.readFileSync(LOG,'utf8').split('\n');stem=path.basename(LOG).replace(/-all\.log$/,'');
  const h=/^gates\.sh \S+ .* (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) UTC$/.exec(txt[0]||'');if(h)t0=Date.parse(h[1].replace(' ','T')+'Z');
  let cur=null;
  for(const l of txt){
    const s=/^=== (.+) ===$/.exec(l);if(s){cur=s[1];order.push(cur);rows.set(cur,{pass:0,secs:null,note:''});continue;}
    if(cur&&/^PASS/.test(l))rows.get(cur).pass++;
  }
}
let source='none';
if(DIR&&LOG){
  source='per-gate log mtimes in '+DIR;let prev=t0;
  for(const g of order){const f=path.join(DIR,stem+'-'+g+'.log');const r=rows.get(g);
    if(!fs.existsSync(f)){r.note='no per-gate log';prev=null;continue;}
    const m=fs.statSync(f).mtimeMs;
    if(prev==null){r.note='previous gate unknown';}
    else if(m<prev){r.note='mtime older than the previous gate: refused';}
    else{r.secs=(m-prev)/1000;if(g===order[0])r.note='includes the unit layer (measured from the suite header)';}
    prev=m;}
}else if(TSV){
  source='timed rows in '+TSV;
  for(const l of fs.readFileSync(TSV,'utf8').split('\n')){const c=l.split('\t');if(c.length<5||!/^\d+(\.\d+)?$/.test(c[1]))continue;
    const g=c[0].replace(/\.js$/,'');if(!rows.has(g)){rows.set(g,{pass:+c[2],secs:null,note:LOG?'not in the log':''});order.push(g);}
    const r=rows.get(g);r.secs=+c[1];r.tpass=+c[2];r.tfail=+c[3];r.rc=+c[4];}
}
const timed=order.filter(g=>rows.get(g).secs!=null);
const sorted=[...timed].sort((a,b)=>rows.get(b).secs-rows.get(a).secs);
const total=timed.reduce((s,g)=>s+rows.get(g).secs,0);
const out=[];
out.push((MD?'':'# ')+'source: '+(LOG?path.basename(LOG):'(no log)')+' - '+order.length+' gate(s) named, '+timed.length+' timed; seconds from: '+source);
if(!timed.length){out.push((MD?'':'# ')+'NO SECONDS: '+(LOG?path.basename(LOG):'the input')+' carries no per-gate duration (gates.sh stamps only the suite start). Pass --dir <the per-gate logs of that run> or --tsv <timed rows>; nothing is estimated.');}
else out.push((MD?'':'# ')+'timed total '+total.toFixed(0)+' s over '+timed.length+' gate(s); slowest '+Math.min(TOP,sorted.length)+' below');
const line=(i,g)=>{const r=rows.get(g);const c=[String(i),g,r.secs==null?'n/a':r.secs.toFixed(1),String(r.tpass!=null?r.tpass:r.pass),r.tfail!=null?String(r.tfail):'',r.rc!=null?String(r.rc):'',r.note];return MD?'| '+c.join(' | ')+' |':c.join('\t');};
if(MD)out.push('| rank | gate | seconds | PASS | FAIL | exit | note |','|---|---|---|---|---|---|---|');
(timed.length?sorted.slice(0,TOP):order).forEach((g,i)=>out.push(line(i+1,g)));
console.log(out.join('\n'));
process.exit(timed.length?0:2);
