'use strict';
// gates/gate-series-busy.js - THE BUSY HALF'S LOAD for gates/gate-series.sh [#553]. One fixed loop on one core:
// Math.sqrt over a counter, no allocation, no I/O except writing the running iteration count to argv[2] once a
// second, so gate-series.sh can measure the rate it actually got. It runs until killed (by PID, never by pattern).
process.title = 'gate-series-busy';
const fs = require('fs'), f = process.argv[2];
let i = 0, x = 0, t = Date.now();
for (;;) { x += Math.sqrt(i); i++; if ((i & 0xfffff) === 0 && Date.now() - t >= 1000) { fs.writeFileSync(f, i + '\n'); t = Date.now(); } }
