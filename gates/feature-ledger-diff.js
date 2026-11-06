#!/usr/bin/env node
/* gates/feature-ledger-diff.js - WHICH SHIPPED BUILDS CHANGED APPLICATION CODE AND HAVE NO ROW IN THE
 * FEATURE LEDGER. #549, item (116); jobs/the-feature-ledger-has-no-row-for-six-consecutive-builds-2026-09-30.
 *
 * WHY THIS FILE EXISTS. prompts/build-run procedure 1a-2026-09-19 says a build that changes a feature's
 * state writes a moved_NNN row into tracker jobs/feature-inventory-2026-09-15. It was followed for #422,
 * #425, #428, #429 and #431, then not for #432 to #437, and nothing noticed for days: a duty checked by
 * nothing decays at a measurable rate. This is the check, and it lives in the repo beside
 * gates/ledger-diff.js for the same reason that one does.
 *
 * WHAT IS DERIVED AND WHAT IS NOT. The job offered (a) a check and (b) deriving the ledger. This does the
 * half of (b) that can be derived with no judgement - WHICH builds moved application code - and does it
 * from git on the ref that Pages serves, not from the tracker's builds collection, whose `touched` field
 * is present on 86 of 107 numbered records (measured 2026-11-06). Git cannot say WHAT a player-visible
 * feature became: that sentence is still written by the run, and this script reports the builds owing one.
 * Deriving from the shipped ref gets #442's case right for free (jobs/... reportAt442): a build that was
 * gated and never pushed has no commit on main, so it owes no row.
 *
 * IT TAKES THE LEDGER AS A FILE, like gates/ledger-diff.js: node has no credential for the tracker. Dump
 * it first (ArtifactData get, collection jobs, doc_id feature-inventory-2026-09-15, with out_dir) and pass
 * the JSON file.
 *
 *   node gates/feature-ledger-diff.js <feature-inventory.json> [--ref origin/main] [--since 422] [--repo .]
 *   node gates/feature-ledger-diff.js --selftest
 *
 * A BUILD IS ACCOUNTED FOR by any of moved_NNN, movedNote_NNN or movedInNNN. A movedNote that records "no
 * feature state changed" is an answer, and the ledger already uses it that way (#466, #467).
 * APPLICATION CODE is chess.jsx, lessons.js and index.html (app.js is built from them). A commit is
 * attributed to the build whose number LEADS its subject (`#NNN ...`); an app-code commit whose subject
 * leads with no number (a revert such as 364f700) is listed as UNATTRIBUTED, never silently dropped.
 *
 * EXIT 0 nothing owed; 1 at least one build owes a row (each named); 2 cannot tell (bad args, unreadable
 * ledger, no such ref, or a shallow clone - a shallow clone under-reports history, CLAUDE.md, so it is
 * refused rather than read as clean).
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');

const APP = ['chess.jsx', 'lessons.js', 'index.html'];

function accounted(ledger) {
  const s = new Set();
  for (const k of Object.keys(ledger)) {
    const m = /^(?:moved_|movedNote_|movedIn)(\d+)$/.exec(k);
    if (m) s.add(+m[1]);
  }
  return s;
}

/* lines: "<sha>\t<subject>" for every commit on ref touching APP. */
function appCommits(repo, ref) {
  const out = cp.execFileSync('git', ['-C', repo, 'log', '--format=%h%x09%s', ref, '--', ...APP],
    { encoding: 'utf8', maxBuffer: 64 << 20 });
  return out.split('\n').filter(Boolean).map(l => { const i = l.indexOf('\t'); return { sha: l.slice(0, i), subj: l.slice(i + 1) }; });
}

function diff(commits, acc, since) {
  const builds = new Map(), unattributed = [];
  for (const c of commits) {
    const m = /^#(\d+)[a-z]?\b/.exec(c.subj);   // #424b is #424's second commit
    if (!m) { unattributed.push(c); continue; }
    const n = +m[1];
    if (n < since) continue;
    if (!builds.has(n)) builds.set(n, []);
    builds.get(n).push(c);
  }
  const nums = [...builds.keys()].sort((a, b) => a - b);
  const owed = nums.filter(n => !acc.has(n));
  return { nums, owed, builds, unattributed };
}

function report(r, acc, since, ref) {
  console.log(`feature-ledger-diff: builds from #${since} with an app-code commit on ${ref}: ${r.nums.length}` +
    ` (${APP.join(', ')})`);
  console.log(`  accounted for in the ledger (moved_/movedNote_/movedIn): ${r.nums.length - r.owed.length}`);
  for (const n of r.owed) {
    const cs = r.builds.get(n);
    console.log(`  OWED #${n}: ${cs.length} app-code commit(s), e.g. ${cs[cs.length - 1].sha} ${cs[cs.length - 1].subj.slice(0, 100)}`);
  }
  console.log(`  unattributed app-code commits on ${ref} (subject leads with no #NNN, whole history): ${r.unattributed.length}`);
  for (const c of r.unattributed.slice(0, 5)) console.log(`    ${c.sha} ${c.subj.slice(0, 100)}`);
  console.log(`FEATURE-LEDGER ${r.owed.length ? 'RED' : 'GREEN'}: owed=${r.owed.length} of ${r.nums.length}` +
    (r.owed.length ? ' [' + r.owed.map(n => '#' + n).join(' ') + ']' : ''));
}

function main(argv) {
  if (argv[0] === '--selftest') return selftest();
  let file = null, ref = 'origin/main', since = 422, repo = path.resolve(__dirname, '..');
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ref') ref = argv[++i];
    else if (a === '--since') since = +argv[++i];
    else if (a === '--repo') repo = path.resolve(argv[++i]);
    else if (!file) file = a;
    else { console.error('feature-ledger-diff: unexpected argument ' + a); return 2; }
  }
  if (!file || !Number.isInteger(since)) {
    console.error('usage: node gates/feature-ledger-diff.js <feature-inventory.json> [--ref R] [--since N] [--repo DIR] | --selftest');
    return 2;
  }
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (ledger && ledger.data && typeof ledger.data === 'object') ledger = ledger.data;
  } catch (e) { console.error('feature-ledger-diff: NOT CHECKED - cannot read ledger ' + file + ': ' + e.message); return 2; }
  try {
    const sh = cp.execFileSync('git', ['-C', repo, 'rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim();
    if (sh !== 'false') { console.error('feature-ledger-diff: NOT CHECKED - shallow clone (is-shallow ' + sh + '); run git fetch --unshallow first'); return 2; }
    cp.execFileSync('git', ['-C', repo, 'rev-parse', '--verify', '--quiet', ref + '^{commit}'], { stdio: 'ignore' });
  } catch (e) { console.error('feature-ledger-diff: NOT CHECKED - ref ' + ref + ' does not resolve in ' + repo); return 2; }
  const acc = accounted(ledger);
  if (!acc.size) { console.error('feature-ledger-diff: NOT CHECKED - the ledger file carries no moved_/movedNote_/movedIn key; wrong document?'); return 2; }
  const r = diff(appCommits(repo, ref), acc, since);
  if (!r.nums.length) { console.error('feature-ledger-diff: NOT CHECKED - no app-code build found on ' + ref + ' from #' + since); return 2; }
  report(r, acc, since, ref);
  return r.owed.length ? 1 : 0;
}

/* Controls on a fabricated repository, so the verdict is shown able to go both ways. */
function selftest() {
  const os = require('os');
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'fld-'));
  let pass = 0, fail = 0;
  const say = (ok, id, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${msg}`); ok ? pass++ : fail++; };
  const git = (...a) => cp.execFileSync('git', ['-C', T, ...a], { encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  const commit = (file, subj) => { fs.appendFileSync(path.join(T, file), subj + '\n'); git('add', file); git('-c', 'commit.gpgsign=false', 'commit', '-qm', subj); };
  const run = (ledger, extra = []) => {
    const lf = path.join(T, 'ledger.json'); fs.writeFileSync(lf, JSON.stringify(ledger));
    const r = cp.spawnSync(process.execPath, [__filename, lf, '--ref', 'HEAD', '--repo', T, ...extra], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  try {
    git('init', '-q');
    commit('chess.jsx', '#421 before the window');
    commit('chess.jsx', '#430 app change');
    commit('README', '#431 records only');
    commit('lessons.js', '#432 lesson change');
    commit('index.html', 'Revert main to #430');
    commit('chess.jsx', '#433 app change');
    commit('chess.jsx', '#434b suffixed follow-up');
    const full = { moved_430: [], movedNote_432: 'no state moved', movedIn433: [], moved_434: [] };
    let r = run(full, ['--since', '422']);
    say(r.code === 0 && /owed=0 of 4/.test(r.out), 'FLD-1', `every app-code build accounted for (a #434b subject counts as #434) -> exit 0, owed=0 of 4 (got ${r.code})`);
    say(/unattributed[^\n]*: 1\b/.test(r.out), 'FLD-2', 'the revert with no leading #NNN is counted as unattributed, not dropped');
    r = run({ moved_430: [], movedIn433: [], moved_434: [] }, ['--since', '422']);
    say(r.code === 1 && /OWED #432/.test(r.out) && /owed=1 of 4 \[#432\]/.test(r.out), 'FLD-3', `a build with no row is RED and named (got ${r.code})`);
    r = run(full, ['--since', '422']);
    say(!/#431/.test(r.out.split('FEATURE-LEDGER')[1] || '') && !/OWED #431/.test(r.out), 'FLD-4', 'a records-only build (#431) owes nothing');
    r = run({ moved_430: [], movedNote_432: 'x', movedIn433: [], moved_434: [] }, ['--since', '400']);
    say(r.code === 1 && /OWED #421/.test(r.out), 'FLD-5', `--since widens the window: #421 becomes owed (got ${r.code})`);
    r = run({ title: 'not the ledger' }, []);
    say(r.code === 2 && /NOT CHECKED/.test(r.out), 'FLD-6', `a document with no movement keys is NOT CHECKED, exit 2 (got ${r.code})`);
    r = run(full, ['--ref', 'no-such-ref']);
    say(r.code === 2 && /does not resolve/.test(r.out), 'FLD-7', `an unresolvable ref is exit 2, never a clean bill (got ${r.code})`);
  } finally { fs.rmSync(T, { recursive: true, force: true }); }
  console.log(`feature-ledger-diff selftest: ${pass} pass, ${fail} fail`);
  return fail ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
