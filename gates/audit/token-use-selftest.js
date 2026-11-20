#!/usr/bin/env node
// gates/audit/token-use-selftest.js - THE PROOF FOR gates/audit/token-use.js (job
// the-fleet-has-no-token-or-cost-instrumentation-at-all-2026-10-06). Node only, no browser, no network, no transcript
// from any real session: every fixture under gates/fixtures/token-use/ is synthetic and written by hand.
//   dup.jsonl   msg_A appears on 3 lines (output 5 then 20 then 20: the largest wins, counted once), an attachment line
//               carrying huge usage (must be ignored), msg_B on another model.   msg_A weighted = 10 + 1.25*100 + 0.1*1000
//               + 5*20 = 335; msg_B = 1 + 0 + 0.1*200 + 5*3 = 36.
//   empty.jsonl no assistant line at all: must report zero rather than crash.
//   seat.jsonl  one call: 4 + 1.25*8 + 0 + 5*2 = 24.
// USAGE  node gates/audit/token-use-selftest.js            prints "  ok  <name>" / "  FAIL <name>", exit 1 on any FAIL
//        CT_TOKEN_COUNTER=<path> node gates/audit/token-use-selftest.js   holds another copy of the counter to the same facts
//
// CONTROL-RECORD: copy gates/audit/token-use.js to a scratch file with the dedupe removed (in readCalls, replace
//   `const id = o.message.id || ('uuid:' + o.uuid);` with `const id = 'u' + (n++) + o.uuid;` after declaring `let n=0;`
//   so every line is its own id), then run `CT_TOKEN_COUNTER=<that copy> node gates/audit/token-use-selftest.js`.
//   (the sed that made the copy: add `let n = 0;` after `const byId = new Map();` and replace the id line as above.)
//   Recorded when written: the real counter 19 ok / 0 FAIL, exit 0; the no-dedupe copy 13 ok / 6 FAIL, exit 1: the call
//   count (3 not 1), the model-one numbers, model-one weighted (930 not 335), the whole-file window (4 calls / 966 not
//   2 / 371), the map's model-one summary and the lead block.
'use strict';
const cp = require('child_process'), path = require('path');
const COUNTER = process.env.CT_TOKEN_COUNTER || path.join(__dirname, 'token-use.js');
const FX = path.join(__dirname, '..', 'fixtures', 'token-use');
let ok = 0, fail = 0;
const say = (pass, name) => { if (pass) { ok++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } };
const run = (args) => {
  const r = cp.spawnSync('node', [COUNTER, ...args], { encoding: 'utf8' });
  let j = null; try { j = JSON.parse(r.stdout.split('\n\n')[0]); } catch (e) { /* leave null */ }
  return { status: r.status, json: j, out: r.stdout };
};
const f = (n) => path.join(FX, n);

// 1. duplicate ids counted once, weighting exact, non-assistant lines ignored
{
  const r = run(['count', f('dup.jsonl')]);
  const rows = r.json || [];
  const one = rows.find((x) => x.model === 'model-one') || {}, two = rows.find((x) => x.model === 'model-two') || {};
  say(rows.length === 2, 'dup: two model rows (the attachment line with no model is ignored)');
  say(one.calls === 1, 'dup: msg_A on three lines is one call (got ' + one.calls + ')');
  say(one.input === 10 && one.cacheWrite === 100 && one.cacheRead === 1000 && one.output === 20, 'dup: model-one five numbers are 10/100/1000/20 (largest output wins)');
  say(one.weighted === 335, 'dup: model-one weighted is exactly 335 (got ' + one.weighted + ')');
  say(two.calls === 1 && two.weighted === 36, 'dup: model-two is one call, weighted exactly 36');
  say(one.from === '2026-01-01T10:00:01.000Z' && two.to === '2026-01-01T10:05:00.000Z', 'dup: from is the first line of the call, to is the last call');
  say(!rows.some((x) => x.input >= 999999 || x.output >= 999999), 'dup: the attachment line huge usage is not counted');
}
// 2. no assistant messages: zero, no crash
{
  const r = run(['count', f('empty.jsonl')]);
  const row = (r.json || [])[0] || {};
  say(r.status === 0, 'empty: exit 0, no crash');
  say(row.calls === 0 && row.input === 0 && row.cacheWrite === 0 && row.cacheRead === 0 && row.output === 0 && row.weighted === 0, 'empty: every number is zero');
  say(row.model === null && row.from === null, 'empty: no model and no times invented');
}
// 3. window mode
{
  const all = run(['window', f('dup.jsonl'), '--from', '2026-01-01T00:00:00Z', '--to', '2026-01-02T00:00:00Z']).json || {};
  say(all.calls === 2 && all.weighted === 371, 'window: whole file is 2 calls, weighted exactly 371 (got ' + all.calls + '/' + all.weighted + ')');
  const late = run(['window', f('dup.jsonl'), '--from', '2026-01-01T10:03:00.000Z', '--to', '2026-01-01T10:10:00.000Z']).json || {};
  say(late.calls === 1 && late.input === 1 && late.cacheRead === 200 && late.output === 3 && late.weighted === 36, 'window: [10:03, 10:10] holds only msg_B');
  const none = run(['window', f('dup.jsonl'), '--from', '2027-01-01T00:00:00Z', '--to', '2027-01-02T00:00:00Z']).json || {};
  say(none.calls === 0 && none.weighted === 0, 'window: a window with no calls is zero');
  say(Object.keys(all).sort().join() === 'cacheRead,cacheWrite,calls,input,output,weighted', 'window: the block has exactly the six fields');
}
// 4. map mode
{
  const r = run(['map', f('map.json')]);
  const j = r.json || {};
  const jobs = (j.jobs || {})['job-x'] || [];
  say(jobs.length === 3, 'map: job-x lists three {part, model} rows (p1 x two models, p2)');
  const s1 = (j.summary || []).find((x) => x.model === 'model-one') || {};
  say(s1.weighted === 359 && s1.estimateMinutes === 60 && s1.weightedPerEstimateHour === 359, 'map: model-one summary is 335+24=359 weighted, 60 min estimate, 359 per hour');
  say(Math.abs(s1.wallMinutes - 29.98) < 0.02, 'map: wall minutes is first call to last call (about 29.98)');
  say(j.lead && j.lead.calls === 2 && j.lead.weighted === 371, 'map: the lead block counts the lead transcript');
  say(/\| job \| model \|/.test(r.out), 'map: a markdown table follows the JSON');
}
console.log('token-use selftest: ' + ok + ' ok / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
