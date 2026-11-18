'use strict';
// gates/pairs/selftest/gate-c.js - a fixture gate whose situation comes from the environment (ST_W, the screen width). ST-C asserts
// the board fits the screen, so it is OVER STRICT by design at ST_W=320 on the real fixture (a 375 board on a 320 screen).
const f=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'fixture.json'),'utf8'));const w=+process.env.ST_W;
const ok=f.board<=w;console.log((ok?'PASS ':'FAIL ')+'ST-C the board fits the '+w+' screen ('+f.board+')');process.exit(ok?0:1);
