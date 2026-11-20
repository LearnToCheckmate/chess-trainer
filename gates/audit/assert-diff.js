#!/usr/bin/env node
// gates/audit/assert-diff.js - do two runs of one gate make the same assertions? [batch 13;
// jobs/the-slowest-gates-are-made-faster-with-every-check-kept-2026-11-18]. Reads two gate logs (before, after) and compares
// their PASS/FAIL lines. Each line's text is taken up to the first two-space-then-bracket payload ("  [" or "  {"), which holds
// measured values, and the digits are then folded to '#', so a reading that moved does not count as a different assertion.
// It prints the counts, every text present on one side only (with how many times on each side), and exits 0 only when the
// after run has no FAIL, its PASS count is the same or higher, and the two multisets of texts are equal.
// usage: node gates/audit/assert-diff.js <before.log> <after.log>
'use strict';
const fs=require('fs');
const [A,B]=process.argv.slice(2);if(!A||!B){console.error('usage: assert-diff.js <before.log> <after.log>');process.exit(2);}
const read=(f)=>{const m=new Map();let pass=0,fail=0;
  for(const l of fs.readFileSync(f,'utf8').split('\n')){const r=/^(PASS|FAIL) (.*)$/.exec(l);if(!r)continue;r[1]==='PASS'?pass++:fail++;
    let t=r[2];const i=t.search(/ {2}[[{]/);if(i>=0)t=t.slice(0,i);t=t.replace(/\d+(\.\d+)?/g,'#').trim();m.set(t,(m.get(t)||0)+1);}
  return {m,pass,fail};};
const a=read(A),b=read(B);const only=[];
for(const k of new Set([...a.m.keys(),...b.m.keys()])){const x=a.m.get(k)||0,y=b.m.get(k)||0;if(x!==y)only.push(x+' -> '+y+'  '+k);}
console.log('before: '+a.pass+' PASS '+a.fail+' FAIL, '+a.m.size+' distinct texts | after: '+b.pass+' PASS '+b.fail+' FAIL, '+b.m.size+' distinct texts | texts differing: '+only.length);
for(const o of only)console.log('  '+o);
const ok=b.fail===0&&b.pass>=a.pass&&only.length===0;
console.log(ok?'SAME ASSERTIONS':'NOT THE SAME');process.exit(ok?0:1);
