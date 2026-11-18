'use strict';
// gates/pairs/selftest/gate-ab.js - a fixture gate for the grading machine's own test (no browser). It reads fixture.json and
// prints gates/lib.js-shaped PASS/FAIL lines for two situations it loops over itself ("phone" and "wide"): ST-A (the board fits a
// 375 screen, which the st1 break violates) and ST-B (the tab bar has a top, which no break touches, so st2 is blind by design).
const f=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'fixture.json'),'utf8'));let fails=0;
const say=(ok,t)=>{console.log((ok?'PASS ':'FAIL ')+t);if(!ok)fails++;};
for(const s of ['phone','wide']){say(f.board<=375,s+': ST-A the board fits its 375 screen ('+f.board+')');say(f.tabTop>0,s+': ST-B the tab bar has a top ('+f.tabTop+')');}
console.log('gate-ab: '+(4-fails)+' pass, '+fails+' fail');process.exit(fails?1:0);
