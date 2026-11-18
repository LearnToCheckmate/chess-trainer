'use strict';
// gates/pairs/selftest/gate-d.js - a fixture gate whose failure has its CAUSE printed well before the failing check: fixture-d.json
// has no tabTop, the gate says so early, prints unrelated notes, and only then fails ST-D. The machine's short report must carry
// the early line, or a reader of the report sees a failure with no cause.
const f=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'fixture-d.json'),'utf8'));
if(f.tabTop==null)console.log("Error: fixture key 'tabTop' not found in gates/pairs/selftest/fixture-d.json - the tab bar's top reads as 0");
for(let i=1;i<=6;i++)console.log('     note '+i+': measuring the board ('+f.board+' wide, bottom '+f.boardBottom+')');
const top=f.tabTop||0;const ok=f.boardBottom<=top&&f.board<=375;
console.log((ok?'PASS ':'FAIL ')+'ST-D the board ends above the tab bar (bottom '+f.boardBottom+', tab bar '+top+')');process.exit(ok?0:1);
