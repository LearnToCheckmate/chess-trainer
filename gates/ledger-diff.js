#!/usr/bin/env node
/* gates/ledger-diff.js - THE TWO-WAY DIFF BETWEEN THE FLAG REGISTER AND THIS REPOSITORY.
 *
 * WHY THIS FILE EXISTS. The rule "write `handled` on every flag your build touched" has
 * existed since the build lane began and was never VERIFIED afterwards. Measured 2026-09-17:
 * 33 flags were acted on in the repo and never closed, and 20 carried a close naming nothing
 * in the repo. The ledger and the repository disagreed in both directions, so neither could
 * be used to judge whether any agent's findings mattered. Correction 012 is about the CHECK,
 * not about the rule - so this is the check, and it lives in the repo so it cannot be lost
 * the way the June scanBoard function was.
 *
 * IT TAKES THE REGISTER AS A FILE, DELIBERATELY. Node cannot read the artifact database - it
 * has no credential for it and no session. So the caller dumps the `flags` collection first
 * (Artifact tool, action read_db, db_op list, collection flags, with out_dir) and passes the
 * directory of JSON documents. One file per flag, named <flag-id>.json, which is exactly the
 * shape out_dir writes. A single JSON file mapping id -> document works too.
 *
 *   node gates/ledger-diff.js <flags-dir-or-json> [repo-root]
 *
 * EXIT 1 when the named-but-unclosed list is not empty. That list is the leak: a flag the
 * repository talks about and the ledger records nothing for.
 *
 * WHAT A "CLOSE" IS: a `handled` or a `closedIn` field with something in it. `acked` does NOT
 * count and never has - it only means someone read it. That is the same filter build-run
 * step 1 applies, and getting it wrong here would quietly widen or narrow every number below.
 *
 * ONE-IN-ONE-OUT ON FILING: file ONE flag per run carrying these five numbers, never one per
 * unclosed item. A check that files thirty findings a day is part of the problem it measures.
 * That is a rule about THIS script's output only - correction 013 forbids capping findings in
 * general, and nothing here caps anything: every unclosed id is printed in full below.
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');

const SRC  = process.argv[2];
const REPO = path.resolve(process.argv[3] || path.join(__dirname, '..'));
if (!SRC) { console.error('usage: node gates/ledger-diff.js <flags-dir-or-json> [repo-root]'); process.exit(2); }

/* ---- 1. the register ---- */
const flags = {};
const st = fs.statSync(SRC);
if (st.isDirectory()) {
  for (const f of fs.readdirSync(SRC)) if (f.endsWith('.json')) {
    const d = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    flags[f.slice(0, -5)] = (d && d.data && typeof d.data === 'object') ? d.data : d;
  }
} else {
  const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const rows = Array.isArray(raw) ? raw : Object.entries(raw).map(([id, v]) => ({ id, ...v }));
  for (const r of rows) flags[r.id] = (r.data && typeof r.data === 'object') ? r.data : r;
}
const ids = Object.keys(flags);
if (!ids.length) { console.error('ledger-diff: no flag documents found under ' + SRC); process.exit(2); }

const hasClose = id => {
  const d = flags[id] || {};
  const v = x => x !== undefined && x !== null && String(x).trim() !== '';
  return v(d.handled) || v(d.closedIn);          // `acked` deliberately excluded
};

/* ---- 2. the repository text ---- */
const EXT = new Set(['.md', '.log', '.js', '.jsx', '.html', '.sh', '.py', '.json', '.txt']);
const SKIP = new Set(['.git', 'node_modules', '.trial-cache', '.site']);
// '.site' added by the build session at #417, the first time this script was RUN in the repo rather than in a
// clean clone - which is what the staging note asked for. gates/lib.js builds a symlink farm per gate-run PID
// under gates/.site/<pid>/, and 93 of them were on disk here, so every repo file was counted up to 94 times and
// the 'named in the repository' corpus was mostly duplicates of itself. git never showed them because
// gates/.gitignore ignores .site/, so this walk saw what git does not. Committed WITH this fix rather than
// verbatim, and said so: a file staged 'to commit verbatim' still gets read and run first.
const corpus = [];   // {label, text}
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (EXT.has(path.extname(e.name))) {
      try { corpus.push({ label: path.relative(REPO, p), text: fs.readFileSync(p, 'utf8') }); } catch (_) {}
    }
  }
})(REPO);
try {
  corpus.push({ label: '<git log>', text: cp.execSync('git -C ' + JSON.stringify(REPO) + ' log --format=%B',
    { maxBuffer: 1 << 28 }).toString() });
} catch (_) { console.error('ledger-diff: WARNING - git log unavailable; commit messages are NOT in this scan.'); }

/* ---- 3. the intersection ---- */
const named = new Map();                      // id -> [files]
for (const id of ids) {
  const hits = corpus.filter(c => c.text.includes(id)).map(c => c.label);
  if (hits.length) named.set(id, hits);
}
const closed        = ids.filter(hasClose);
const namedNoClose  = [...named.keys()].filter(id => !hasClose(id)).sort();
const closedNotNamed= closed.filter(id => !named.has(id)).sort();

/* ---- 4. the five numbers, and the two lists ---- */
const pad = n => String(n).padStart(5);
console.log('LEDGER / REPOSITORY TWO-WAY DIFF   register=' + SRC + '   repo=' + REPO);
console.log('  ' + pad(ids.length)          + '  flags on the register');
console.log('  ' + pad(closed.length)       + '  carry a close (handled or closedIn; acked does not count)');
console.log('  ' + pad(named.size)          + '  named somewhere in the repository');
console.log('  ' + pad(namedNoClose.length) + '  NAMED IN THE REPO AND NOT CLOSED   <- the leak');
console.log('  ' + pad(closedNotNamed.length)+ '  closed while naming nothing in the repo (the close cannot be checked here)');
console.log('');
console.log('--- NAMED IN THE REPO, NO CLOSE (' + namedNoClose.length + ') ---');
for (const id of namedNoClose) console.log('  ' + id + '  <- ' + named.get(id).slice(0, 6).join(', '));
console.log('');
console.log('--- CLOSED, NOT NAMED IN THE REPO (' + closedNotNamed.length + ') ---');
for (const id of closedNotNamed) console.log('  ' + id);
console.log('');
if (namedNoClose.length) {
  console.log('LEDGER-DIFF RED: ' + namedNoClose.length + ' flag(s) this repository talks about carry no close.');
  console.log('Write `handled` on each. "cited as a blocker, not fixed", "found already fixed at #NNN" and');
  console.log('"not a work item" are all correct closes; `stillOpenBecause` is how you leave one open on purpose.');
  process.exit(1);
}
console.log('LEDGER-DIFF GREEN: every flag named in this repository carries a close.');
