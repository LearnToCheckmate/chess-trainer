#!/usr/bin/env node
// gates/audit/assert-runledger-std.js <export-dir> [--since <ISO>] [--run <runId>]  -> CLAUSE R43 ("the typed std block") AS A RUNNABLE PREDICATE.
//
// WHY [#550 test-system helper A; jobs/entry-three-contracts-become-runnable-asserts-2026-10-10 theFIX (3), and its control set (b):
// "a known process breach, for example a check-out row missing its typed std block, must make the door REFUSE and not merely
// report"]. prompts/rule-contracts' R43 row (document version 26) names the artefact (runledger, the check-out row), the breach
// (untyped-checkout) and the field list, std = 23 keys. This reads a runledger EXPORT - ArtifactData query with out_dir, one JSON per
// row under <export-dir>/runledger/ - because the tracker is not reachable from the suite, exactly as gates/audit/tracker-cited-ids.sh
// reads its jobs. A check-out row is one with finishedAt; it holds when its std is an object carrying every one of the 23 keys
// (null is a legal VALUE - prompts/common has the held-gate rows write std.wip* as null - and a MISSING key is the breach).
// THE FIELD LIST IS A COPY of rule-contracts' R43 subfields.std, and that row's own whatThisRowCouldNotDo says such a copy drifts
// (it drifted by seven fields in six days); the copy is pinned to the document version it came from, printed every run.
// --run <runId> (#550 test-system helper A, jobs/r43-std-block-missing-on-most-runledger-check-out-rows-2026-11-14 part 2): judge
// ONE row, the run's own - by doc id or data.runId - so a run can hold its own check-out row to R43 after writing it. No such row,
// or a row with no finishedAt yet (checked in, not out), is exit 2: the run has not written what is being asserted.
// AND THE VALUE TWO KEYS MUST HAVE, from the same R43 row's subfields: std.outcome is EXACTLY one of the six values
// (rule-contracts subfields["std.outcome"]; the export carries 'held', null and whole objects there), and std.pushedShas is a LIST
// (prompts/common: "Never a sentence, never null"). Each is named as a breach beside the missing keys.
// EXIT 0 every check-out row in the window holds | 1 one does not (each named, with its missing keys) | 2 could not run: no export
// directory, no runledger rows in it, or no check-out row in the window (an empty denominator is not a clearance).
// The count line: "runledger-std: <held> pass / <broken> fail (<n> check-out row(s) since <since>, field list R43 at rule-contracts v26)".
'use strict';
const fs = require('fs'), path = require('path');
const OUTCOMES = ['shipped', 'records-only', 'built-not-shipped', 'stood-down-pen', 'stood-down-empty', 'failed'];
const STD = ['lane','build','outcome','penTaken','item','blockedBy','pushedShas','appCode','appChanged','bundleMd5','gates','minutes','filedJobs',
  'deskAsk','artefactsHeld','artefactsReleased','rulesAttested','conclusion','wipAtCheckIn','wipAtCheckOut','wipRoseForBand16','filedTyped','filedUntyped'];
function check(dir, since, run) {
  const rd = path.join(dir || '', 'runledger');
  let files; try { files = fs.readdirSync(rd).filter(f => f.endsWith('.json')); } catch (e) { console.log('RUNLEDGER STD COULD NOT RUN - no export at ' + rd); return 2; }
  if (!files.length) { console.log('RUNLEDGER STD COULD NOT RUN - the export ' + rd + ' holds no rows'); return 2; }
  let p = 0, f = 0, n = 0, found = false;
  for (const fn of files.sort()) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(rd, fn), 'utf8')); } catch (e) { f++; n++; console.log('runledger-std: UNREADABLE ' + fn); continue; }
    d = d && d.data ? d.data : d;
    const id = fn.replace(/\.json$/, '');
    if (run) { if (id !== run && (d && d.runId) !== run) continue; found = true;
      if (!d || !d.finishedAt) { console.log('RUNLEDGER STD COULD NOT RUN - the row ' + run + ' has no finishedAt: it is checked in and not yet checked out'); return 2; } }
    if (!d || !d.finishedAt || (since && String(d.finishedAt) < since)) continue;
    n++;
    const s = d.std, obj = (s && typeof s === 'object' && !Array.isArray(s));
    const miss = obj ? STD.filter(k => !(k in s)) : ['(no std object)'];
    const badv = [];
    if (obj && 'outcome' in s && !OUTCOMES.includes(s.outcome)) badv.push('outcome ' + JSON.stringify(s.outcome).slice(0, 40) + ' is not one of the six');
    if (obj && 'pushedShas' in s && !Array.isArray(s.pushedShas)) badv.push('pushedShas is not a list');
    if (miss.length || badv.length) { f++; console.log('runledger-std: UNTYPED ' + id + ' finished ' + d.finishedAt + (miss.length ? ' - missing ' + miss.length + ': ' + miss.join(' ') : '') + (badv.length ? ' - ' + badv.join('; ') : '')); } else p++;
  }
  if (run && !found) { console.log('RUNLEDGER STD COULD NOT RUN - the export holds no row for ' + run); return 2; }
  if (!n) { console.log('RUNLEDGER STD COULD NOT RUN - no check-out row in the window' + (since ? ' since ' + since : '') + ', and an empty window is not a clearance'); return 2; }
  console.log('runledger-std: ' + p + ' pass / ' + f + ' fail (' + n + ' check-out row(s) ' + (run ? 'for ' + run + ' only' : 'since ' + (since || 'the start of the export')) + ', field list R43 at rule-contracts v26)');
  return f ? 1 : 0;
}
function selftest() {
  const os = require('os'); let ok = 0, bad = 0;
  const chk = (w, want, got) => { if (String(want) === String(got)) { ok++; console.log('  ok   ' + w); } else { bad++; console.log('  FAIL ' + w + ' (want ' + want + ', got ' + got + ')'); } };
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-std-')), R = path.join(T, 'runledger'); fs.mkdirSync(R);
  const full = {}; STD.forEach(k => full[k] = null); full.outcome = 'stood-down-empty'; full.pushedShas = [];   // null is legal elsewhere; these two have a required shape
  const put = (id, data) => fs.writeFileSync(path.join(R, id + '.json'), JSON.stringify({ id, data }));
  const quiet = (fn) => { const o = console.log; const buf = []; console.log = (...a) => buf.push(a.join(' ')); try { return [fn(), buf.join('\n')]; } finally { console.log = o; } };
  try {
    put('a__1', { finishedAt: '2026-11-10T00:00:00Z', std: full });
    put('a__2', { finishedAt: '2026-11-11T00:00:00Z', std: Object.assign({}, full, { outcome: 'shipped' }) });
    put('a__3', { startedAt: '2026-11-12T00:00:00Z' });   // checked in, not out: not judged
    let [rc, out] = quiet(() => check(T)); chk('S1 two typed check-out rows (null values legal), one open row not judged: 0', 0, rc);
    chk('S1b and the count line reads 2 pass / 0 fail', true, /runledger-std: 2 pass \/ 0 fail \(2 check-out/.test(out));
    const m = Object.assign({}, full); delete m.filedTyped; put('b__4', { finishedAt: '2026-11-12T00:00:00Z', std: m });
    [rc, out] = quiet(() => check(T)); chk('S2 a check-out row missing ONE std key refuses: 1 (control (b), the known breach)', 1, rc);
    chk('S2b and names the row and the key', true, /UNTYPED b__4 .*missing 1: filedTyped/.test(out));
    put('b__5', { finishedAt: '2026-11-13T00:00:00Z' });
    [rc, out] = quiet(() => check(T)); chk('S3 a check-out row with no std at all refuses and says so', true, rc === 1 && /UNTYPED b__5 .*\(no std object\)/.test(out));
    [rc, out] = quiet(() => check(T, '2026-11-14T00:00:00Z')); chk('S4 a window holding no check-out row: 2, not a clearance', 2, rc);
    [rc, out] = quiet(() => check(T, '2026-11-10T12:00:00Z')); chk('S5 --since keeps the window: a__1 is outside it (3 judged, 2 broken)', true, rc === 1 && /1 pass \/ 2 fail \(3 check-out/.test(out));
    [rc] = quiet(() => check(path.join(T, 'nope'))); chk('S6 no export directory: 2', 2, rc);
    // S8-S11 --run <id>, the run's own row (jobs/r43-std-block-missing-on-most-runledger-check-out-rows-2026-11-14 part 2)
    [rc, out] = quiet(() => check(T, null, 'a__1')); chk('S8 --run on a typed row judges that row alone: 0, 1 pass', true, rc === 0 && /1 pass \/ 0 fail \(1 check-out row\(s\) for a__1 only/.test(out));
    [rc, out] = quiet(() => check(T, null, 'b__4')); chk('S9 --run on the row missing filedTyped: 1, named', true, rc === 1 && /UNTYPED b__4/.test(out));
    [rc] = quiet(() => check(T, null, 'a__3')); chk('S10 --run on a row checked in and not out: 2 (nothing to assert yet)', 2, rc);
    [rc] = quiet(() => check(T, null, 'zz__9')); chk('S11 --run on a row the export does not hold: 2', 2, rc);
    put('c__6', { finishedAt: '2026-11-13T01:00:00Z', runId: 'c__6', std: Object.assign({}, full, { outcome: 'held', pushedShas: 'none' }) });
    [rc, out] = quiet(() => check(T, null, 'c__6')); chk('S12 every key present but outcome "held" and pushedShas a sentence: 1, both named', true, rc === 1 && /outcome "held" is not one of the six; pushedShas is not a list/.test(out));
    fs.unlinkSync(path.join(R, 'c__6.json'));
    // S7 THE CHECK WITH ITS SUBJECT REMOVED: with the key test defanged (no key is ever missing) the broken rows pass.
    const src = fs.readFileSync(__filename, 'utf8'), def = src.replace("STD.filter(k => !(k in s))", "[]");
    chk('S7 the defang edit applied', true, def !== src);
    fs.writeFileSync(path.join(T, 'defanged.js'), def);
    const r = require('child_process').spawnSync(process.execPath, [path.join(T, 'defanged.js'), T, '--since', '2026-11-12T00:00:00Z'], { encoding: 'utf8' });
    chk('S7b control: with the key test defanged, the row missing filedTyped PASSES (b__4 and b__5 only lose S3\'s no-std arm)', true, /UNTYPED b__5/.test(r.stdout) && !/UNTYPED b__4/.test(r.stdout));
  } finally { fs.rmSync(T, { recursive: true, force: true }); }
  console.log('runledger-std selftest: ' + ok + ' pass / ' + bad + ' fail'); return bad ? 1 : 0;
}
const a = process.argv.slice(2);
if (a[0] === '--selftest') process.exitCode = selftest();
else { const i = a.indexOf('--since'), j = a.indexOf('--run'); process.exitCode = check(a[0], i >= 0 ? a[i + 1] : null, j >= 0 ? a[j + 1] : null); }
