'use strict';
// gates/gate-series-busy.js - THE BUSY HALF'S LOAD for gates/gate-series.sh [#553]. One fixed loop on one core:
// Math.sqrt over a counter, no allocation, no I/O except once a second writing the running iteration count to argv[2].
// It writes ITS OWN pid to argv[2]+'.pid' at start, so gate-series.sh records the loop's pid and not a wrapper's, and
// it DIES WITH ITS PARENT: once a second it checks argv[3] (the parent's pid) and exits when that process is gone, so
// a series killed by SIGKILL or a container restart cannot leave a core-eating stray behind (two did, at #553, 02:06Z).
process.title = 'gate-series-busy';
const fs = require('fs'), f = process.argv[2], parent = +process.argv[3];
if (!f || !(parent > 1)) { console.error('usage: node gate-series-busy.js <countfile> <parentpid>'); process.exit(2); }
fs.writeFileSync(f + '.pid', process.pid + '\n');
const alive = () => { try { process.kill(parent, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
let i = 0, x = 0, t = Date.now();
for (;;) {
  x += Math.sqrt(i); i++;
  if ((i & 0xfffff) === 0 && Date.now() - t >= 1000) {
    if (!alive()) process.exit(0);
    fs.writeFileSync(f, i + '\n'); t = Date.now();
  }
}
