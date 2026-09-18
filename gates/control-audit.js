#!/usr/bin/env node
/* gates/control-audit.js - WHICH GATES CARRY ASSERTIONS THEIR CONTROL NEVER COVERED?
 *
 * WHY THIS EXISTS. That question has been asked four times by four readers and answered four different
 * ways, because the evidence is free prose in THREE places - the gate's own header, a RUN-LOG row, and
 * tracker flag `gates-without-a-negative-control` - and no place holds all of it. Every audit of it has
 * therefore measured WHERE THE WORDS ARE rather than what was run:
 *   - #381 closed the flag at "ALL 19 SUITES", true that day and wrong a week later;
 *   - its own update6 found its list of seven uncontrolled gates was wrong and had been repeated twice;
 *   - uat-ext-2026-09-17 reported ten of thirty-five drifted, and its headline case was measured at #417
 *     and was FALSE WHEN WRITTEN - it looked for a block headed "NEGATIVE CONTROL" while gate 26's newer
 *     block is headed "4b's OWN CONTROLS", committed two hours before that flag was filed;
 *   - and this session re-ran that method, which called 15-gallery-playall DRIFTED on the very commit
 *     that ADDED THREE CONTROLS to it.
 * So this is not another audit. It is a shape the gate declares and a command that checks it.
 *
 * THE SHAPE, one line per control, anywhere in the gate file:
 *
 *   // CONTROL-RECORD: <commit> <YYYY-MM-DD> total=<N> red=<N> scope=<scope> how=<what was broken>
 *
 *   commit  the sha the control was RUN against. HEAD at run time - NOT the gate's last commit.
 *   total   the gate's whole assertion count at that time, under `scope`.
 *   red     how many went red. A record with red=0 is a baseline, not a control.
 *   scope   `full`, or `env:K=V`, `geo:X`, `blocks:X`. A CLOSED VOCABULARY, because a free-form scope is
 *           an opt-out from the only automatic check, held by the party being audited: `scope=FULL` or
 *           `scope=full-run` silenced it with a typo. Why the field exists at all: at #411 two of six
 *           published control counts were SUBSET runs - the full gate gave 27 and 14 where the lane had
 *           published 15 and 12, and one subset had dropped the assertions that proved the breakage.
 *           Neither number was wrong; neither was reproducible.
 *   how     one clause naming the MECHANISM broken, so a reader can re-run it.
 *
 * WHAT IT ASKS, AND THE FIRST VERSION ASKED THE WRONG THING. v1 called a gate CURRENT iff its newest
 * record's sha WAS the file's last commit. That contradicted the format's own definition of `commit`, and
 * the #418 antagonist proved it the worst way: the commit that ADDS the records is itself the file's last
 * commit, so CURRENT was structurally unreachable and this tool's own header published a control result
 * that was false in the tree it shipped in. The question is not "which commit is newest". It is
 * DID THE ASSERTIONS CHANGE SINCE THE CONTROL RAN, so that is what is compared: the gate's `L.say(`
 * lines at the record's sha, against the gate's now. Ancestry and polarity stop mattering - a record
 * naming a commit NEWER than the file's last change is the strongest kind, and v1 filed it as STALE with
 * a reversed reason.
 *
 * A GATE IS COVERED iff at least one of its records is SOUND: its sha exists, the gate's assertion lines
 * are byte-identical between that sha and now, red > 0, the scope is in the vocabulary, and the counts
 * are within bounds. Anything else is reported as the specific fault, never as silence:
 *   NONE            declares nothing. A gap, not a lie - and the honest state of most gates today.
 *   UNPARSABLE      a line contains CONTROL-RECORD and does not match the format. v1 dropped five natural
 *                   malformations silently (an uppercase sha, a 6-char sha, `2026-9-18`, reordered fields,
 *                   a missing `how=`) and reported the gate as NONE, so a malformed claim was
 *                   indistinguishable from no claim.
 *   DIRTY           the working copy differs from HEAD, so nothing here can judge it against a commit.
 *                   #417's own lesson - sample the tree and print the dirty count - failing one build later.
 *   ASSERTIONS-MOVED  the assertion lines changed between the record's sha and now. The record may be true
 *                   about what it ran; it cannot be true about what the gate asserts today.
 *   BAD-RECORD      the sha does not exist, the date is in the future, the scope is not in the vocabulary,
 *                   red=0 with no other record, red>total, or a count outside its bounds.
 *   NO-LOG          the cited log does not say what this gate runs, so `total` was compared with nothing.
 *                   v1 called that CURRENT and printed "and count" having checked no count.
 * EVERY record is checked, not the date-newest one: v1 sorted on the typed date with an inconsistent
 * comparator, so in a file where all records share a date, which one won a tie was V8's business - and a
 * false full-scope record hidden at the top of the list was invisible.
 *
 * THE LOG IS RUN THROUGH gates/verify-log.sh, which is the one place that decides whether a log is
 * evidence. v1 chose the newest filename matching *-all.log and excluded names containing DEFECTIVE,
 * which is a convention, not a check: a `<N>-subset-all.log` matched it and would have become the
 * authority on what every gate runs, and the repo's `<N>-regate-of-the-<M>-bundle.log` full greens were
 * skipped. Filenames are not evidence.
 *
 * usage: node gates/control-audit.js [gatelog]
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const G = (a) => cp.execSync('git -C ' + JSON.stringify(ROOT) + ' ' + a, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
const Gq = (a) => { try { G(a); return true; } catch (e) { return false; } };
const SCOPE_OK = (s) => s === 'full' || /^(env:[A-Za-z_][A-Za-z0-9_]*=\S+|geo:\S+|blocks:\S+)$/.test(s);
const TODAY = new Date().toISOString().slice(0, 10);

/* ---- the log, and it must be evidence rather than a filename ---- */
const LOGDIR = path.join(ROOT, 'claude/agents/gatelogs');
let LOG = process.argv[2], why = '';
if (LOG) {
  if (!Gq('rev-parse --git-dir') || !fs.existsSync(LOG)) { console.error('control-audit: no such log ' + LOG); process.exit(2); }
  const r = cp.spawnSync(path.join(ROOT, 'gates/verify-log.sh'), [LOG], { encoding: 'utf8' });
  if (r.status !== 0) { console.error('control-audit: REFUSED that log - verify-log.sh says:\n' + (r.stdout || '') + (r.stderr || '')); process.exit(2); }
} else {
  const cands = fs.readdirSync(LOGDIR).filter(f => f.endsWith('.log'))
    .map(f => ({ f, n: parseInt(f, 10) || 0 })).sort((a, b) => b.n - a.n || (a.f < b.f ? 1 : -1));
  for (const c of cands) {
    const p = path.join(LOGDIR, c.f);
    if (cp.spawnSync(path.join(ROOT, 'gates/verify-log.sh'), [p], { encoding: 'utf8' }).status === 0) { LOG = p; break; }
  }
  if (!LOG) { console.error('control-audit: no log under ' + LOGDIR + ' passes verify-log.sh'); process.exit(2); }
}
const logText = fs.readFileSync(LOG, 'utf8');
const ranNow = {}, redNow = {};
{
  let cur = null;
  for (const line of logText.split('\n')) {
    const h = line.match(/^=== (\S+) ===$/); if (h) { cur = h[1]; continue; }
    const g = line.match(/^\s*(\S+): green \((\d+) PASS\)/); if (g && cur) { ranNow[cur] = +g[2]; continue; }
    if (/^\s*(\S+): RED/.test(line) && cur) redNow[cur] = true;
  }
}

/* ---- the records ---- */
const RE = /^\s*\/\/\s*CONTROL-RECORD:\s*([0-9a-f]{7,40})\s+(\d{4}-\d{2}-\d{2})\s+total=(\d+)\s+red=(\d+)\s+scope=(\S+)\s+how=(\S.*)$/;
const targets = fs.readdirSync(path.join(ROOT, 'gates/regress')).filter(f => f.endsWith('.js'))
  .map(f => 'gates/regress/' + f).concat(['gates/mountcheck.js']).sort();   // mountcheck runs in the suite too
const rows = [];
for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const name = path.basename(rel, '.js');
  const txt = fs.readFileSync(abs, 'utf8').split('\n');
  const recs = [], bad = [];
  for (const l of txt) {
    // the COLON is what makes a line a claim. Without it, `// CONTROL-RECORD lines, the form this tool
    // reads` - prose ABOUT the format, which gate 15 carries - was reported as a malformed record.
    if (!/CONTROL-RECORD:/.test(l)) continue;
    const m = l.match(RE);
    if (m) recs.push({ commit: m[1], date: m[2], total: +m[3], red: +m[4], scope: m[5], how: m[6].trim(), raw: l.trim() });
    else bad.push(l.trim());
  }
  const dirty = !Gq('diff --quiet HEAD -- ' + JSON.stringify(rel));
  const now = ranNow[name];
  const says = (s) => (s.match(/L\.say\(/g) || []).length;
  const lines = (s) => s.split('\n').filter(l => /L\.say\(/.test(l)).map(l => l.trim()).join('\n');
  const nowSrc = fs.readFileSync(abs, 'utf8');
  const faults = [];
  for (const r of recs) {
    if (!Gq('cat-file -e ' + r.commit + '^{commit}')) { r.fault = 'sha ' + r.commit + ' is not a commit in this repo'; faults.push(r); continue; }
    if (r.date > TODAY) { r.fault = 'dated ' + r.date + ', which is in the future'; faults.push(r); continue; }
    if (!SCOPE_OK(r.scope)) { r.fault = 'scope=' + r.scope + ' is not in the vocabulary (full | env:K=V | geo:X | blocks:X)'; faults.push(r); continue; }
    if (r.red > r.total) { r.fault = 'red=' + r.red + ' exceeds total=' + r.total; faults.push(r); continue; }
    let old;
    try { old = G('show ' + r.commit + ':' + rel); } catch (e) { r.fault = 'the gate did not exist at ' + r.commit; faults.push(r); continue; }
    if (lines(old) !== lines(nowSrc)) {
      r.fault = 'the assertions changed since ' + r.commit + ' (' + says(old) + ' -> ' + says(nowSrc) + ' L.say sites)';
      r.moved = true; faults.push(r); continue;
    }
    if (now === undefined) { r.fault = 'this gate is not in the cited log' + (redNow[name] ? ' as green (it is RED there)' : ''); r.nolog = true; faults.push(r); continue; }
    if (r.scope === 'full' && r.total !== now) { r.fault = 'full-scope total=' + r.total + ' but the log says this gate runs ' + now; faults.push(r); continue; }
    if (r.scope !== 'full' && !(r.total > 0 && r.total <= now)) { r.fault = 'scoped total=' + r.total + ' is not inside 1..' + now; faults.push(r); continue; }
    if (r.red === 0) { r.fault = 'red=0 - a baseline, not a control'; r.baseline = true; faults.push(r); continue; }
    r.sound = true;
  }
  const sound = recs.filter(r => r.sound);
  let verdict, note;
  if (dirty) { verdict = 'DIRTY'; note = 'the working copy differs from HEAD; nothing here can judge it against a commit'; }
  else if (bad.length) { verdict = 'UNPARSABLE'; note = bad.length + ' line(s) say CONTROL-RECORD and do not match the format'; }
  else if (!recs.length) { verdict = 'NONE'; note = 'the gate declares no CONTROL-RECORD'; }
  else if (sound.length) { verdict = 'COVERED'; note = sound.length + ' sound record(s) of ' + recs.length + ', assertions unchanged since each'; }
  else if (faults.some(r => r.moved)) { verdict = 'ASSERTIONS-MOVED'; note = faults.find(r => r.moved).fault; }
  else if (faults.some(r => r.nolog)) { verdict = 'NO-LOG'; note = faults.find(r => r.nolog).fault; }
  else if (faults.every(r => r.baseline)) { verdict = 'NO-RED'; note = 'every record has red=0 - baselines, not controls'; }
  else { verdict = 'BAD-RECORD'; note = faults[0].fault; }
  rows.push({ name, rel, recs, bad, now, verdict, note, faults });
}

/* ---- report ---- */
const pad = (s, n) => String(s).padEnd(n);
console.log('CONTROL AUDIT   log=' + path.relative(ROOT, LOG) + ' (accepted by verify-log.sh)   gates=' + rows.length);
console.log('');
const ORDER = ['NONE', 'UNPARSABLE', 'DIRTY', 'ASSERTIONS-MOVED', 'NO-LOG', 'NO-RED', 'BAD-RECORD', 'COVERED'];
for (const v of ORDER) {
  const g = rows.filter(r => r.verdict === v);
  if (!g.length) { console.log('--- ' + v + ' (0) ---'); console.log(''); continue; }
  console.log('--- ' + v + ' (' + g.length + ') ---');
  for (const r of g) {
    console.log('  ' + pad(r.name, 24) + pad(r.now === undefined ? 'not in log' : r.now + ' assertions', 16) + r.note);
    if (v !== 'NONE') {
      for (const c of r.recs) console.log('      ' + (c.sound ? 'sound  ' : c.baseline ? 'base   ' : 'FAULT  ') + c.commit + ' ' + c.date +
        '  total=' + c.total + ' red=' + c.red + ' scope=' + c.scope + '  ' + c.how + (c.fault ? '   <- ' + c.fault : ''));
      for (const b of r.bad) console.log('      UNPARSABLE  ' + b.slice(0, 120));
    }
  }
  console.log('');
}
const n = (v) => rows.filter(r => r.verdict === v).length;
console.log('SUMMARY  ' + n('COVERED') + ' covered, of ' + rows.length + ' gates  |  ' +
  ORDER.filter(v => v !== 'COVERED' && n(v)).map(v => n(v) + ' ' + v.toLowerCase()).join(', '));
const bad = rows.filter(r => r.verdict !== 'COVERED');
if (bad.length) {
  console.log('CONTROL-AUDIT RED: ' + bad.length + ' gate(s) cannot show that the assertions they run TODAY have ever');
  console.log('been shown able to fail. Back-fill only what you can verify - an invented record is worse than none,');
  console.log('because the next reader will trust it, and this tool cannot tell an invented sha from a real one');
  console.log('beyond checking that it is a commit in this repo.');
  process.exit(1);
}
console.log('CONTROL-AUDIT GREEN: every gate declares a sound control over the assertions it runs today.');
