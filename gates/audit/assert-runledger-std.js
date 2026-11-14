#!/usr/bin/env node
// gates/audit/assert-runledger-std.js <export-dir> [--since <ISO>]  -> CLAUSE R43 ("the typed std block") AS A RUNNABLE PREDICATE.
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
// EXIT 0 every check-out row in the window holds | 1 one does not (each named, with its missing keys) | 2 could not run: no export
// directory, no runledger rows in it, or no check-out row in the window (an empty denominator is not a clearance).
// The count line: "runledger-std: <held> pass / <broken> fail (<n> check-out row(s) since <since>, field list R43 at rule-contracts v26)".
'use strict';
const fs = require('fs'), path = require('path');
const STD = ['lane','build','outcome','penTaken','item','blockedBy','pushedShas','appCode','appChanged','bundleMd5','gates','minutes','filedJobs',
  'deskAsk','artefactsHeld','artefactsReleased','rulesAttested','conclusion','wipAtCheckIn','wipAtCheckOut','wipRoseForBand16','filedTyped','filedUntyped'];
function check(dir, since) {
  const rd = path.join(dir || '', 'runledger');
  let files; try { files = fs.readdirSync(rd).filter(f => f.endsWith('.json')); } catch (e) { console.log('RUNLEDGER STD COULD NOT RUN - no export at ' + rd); return 2; }
  if (!files.length) { console.log('RUNLEDGER STD COULD NOT RUN - the export ' + rd + ' holds no rows'); return 2; }
  let p = 0, f = 0, n = 0;
  for (const fn of files.sort()) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(rd, fn), 'utf8')); } catch (e) { f++; n++; console.log('runledger-std: UNREADABLE ' + fn); continue; }
    d = d && d.data ? d.data : d;
    if (!d || !d.finishedAt || (since && String(d.finishedAt) < since)) continue;
    n++;
    const s = d.std, miss = (s && typeof s === 'object' && !Array.isArray(s)) ? STD.filter(k => !(k in s)) : ['(no std object)'];
    if (miss.length) { f++; console.log('runledger-std: UNTYPED ' + fn.replace(/\.json$/, '') + ' finished ' + d.finishedAt + ' - missing ' + miss.length + ': ' + miss.join(' ')); } else p++;
  }
  if (!n) { console.log('RUNLEDGER STD COULD NOT RUN - no check-out row in the window' + (since ? ' since ' + since : '') + ', and an empty window is not a clearance'); return 2; }
  console.log('runledger-std: ' + p + ' pass / ' + f + ' fail (' + n + ' check-out row(s) since ' + (since || 'the start of the export') + ', field list R43 at rule-contracts v26)');
  return f ? 1 : 0;
}
function selftest() {
  const os = require('os'); let ok = 0, bad = 0;
  const chk = (w, want, got) => { if (String(want) === String(got)) { ok++; console.log('  ok   ' + w); } else { bad++; console.log('  FAIL ' + w + ' (want ' + want + ', got ' + got + ')'); } };
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-std-')), R = path.join(T, 'runledger'); fs.mkdirSync(R);
  const full = {}; STD.forEach(k => full[k] = null);
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
else { const i = a.indexOf('--since'); process.exitCode = check(a[0], i >= 0 ? a[i + 1] : null); }
