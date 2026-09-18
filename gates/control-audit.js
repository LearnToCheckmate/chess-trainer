#!/usr/bin/env node
/* gates/control-audit.js - WHICH GATES CARRY ASSERTIONS THEIR CONTROL NEVER COVERED?
 *
 * WHY THIS EXISTS. That question has been asked four times by four different readers and answered
 * four different ways, because the evidence is free prose in THREE places - the gate's own header, a
 * RUN-LOG row, and tracker flag `gates-without-a-negative-control` - and no place holds all of it.
 * Every audit of it has therefore measured WHERE THE WORDS ARE rather than what was run:
 *   - #381 closed the flag at "ALL 19 SUITES", a denominator that was true that day and wrong a week later.
 *   - update6 found its own list of seven uncontrolled gates was wrong and had been repeated twice.
 *   - uat-ext-2026-09-17 reported ten of thirty-five gates drifted; its headline case was measured here at
 *     #417 and was false when written - it looked for a block headed "NEGATIVE CONTROL" and gate 26's
 *     newer block is headed "4b's OWN CONTROLS", committed two hours before that flag was filed.
 *   - and this session re-ran that same method and it called 15-gallery-playall DRIFTED on 955501e, the
 *     commit that ADDED THREE CONTROLS to it. A metric that calls a gate drifted for gaining controls
 *     cannot answer the question it is for.
 * So the fix is not another audit. It is a fixed shape the gate declares and a command that checks it.
 *
 * THE SHAPE, one line per control, anywhere in the gate file:
 *
 *   // CONTROL-RECORD: <commit> <YYYY-MM-DD> total=<N> red=<N> scope=<scope> how=<what was broken>
 *
 *   commit  the sha the control was RUN against (the trial bundle's base, or the shipped release used).
 *   total   the gate's whole assertion count at that time. Not the control's, the GATE's.
 *   red     how many went red under the control.
 *   scope   `full`, or exactly what restricted the run - a geometry, an env filter, a block list.
 *           THIS FIELD IS NOT OPTIONAL AND IT IS WHY THE FORMAT EXISTS. At #411 two of six published
 *           control counts turned out to be SUBSET runs: the full gate gave 27 and 14 where the lane had
 *           published 15 and 12, and in one case the subset had dropped the two assertions that most
 *           directly proved the breakage. Neither number was wrong; neither was reproducible. A count
 *           without its scope is not evidence.
 *   how     one clause naming the MECHANISM broken, so a reader can re-run it.
 *
 * WHAT THIS TOOL DECIDES, and the three verdicts are deliberately different faults:
 *   NONE         the gate declares no control. Not a lie - a gap, and the one the flag exists to show.
 *   STALE        the gate has been modified since its newest record's commit. The record may still be
 *                true, but nothing here can say so, which is exactly the decay question.
 *   COUNT-MOVED  the gate's `total` disagrees with what the cited gatelog says it runs now. The record
 *                is making a false claim about its own scope.
 *   CURRENT      the newest record names the gate's last commit and its total matches the log.
 * Exit 1 if anything is NONE, STALE or COUNT-MOVED. That will be loud on day one and it should be: the
 * honest current state is that most gates declare nothing, and a tool that hid that would be the frozen
 * denominator again.
 *
 * NEGATIVE CONTROLS, run at #418 against this repo and then reverted. They live here rather than in
 * gates-without-a-negative-control because that flag's own update6 says three-places IS the defect - a
 * tool that audits control records and keeps its own somewhere else would be funny once.
 *   CURRENT     15-gallery-playall declares 7 records at 955501e, its own last commit -> CURRENT, and its
 *               scoped totals (25 of 36, at CT_G15_GEOS=kunal) are correctly NOT compared to the log.
 *   NONE        the other 34 gates declare nothing -> NONE. That is the honest baseline on day one.
 *   STALE       a record appended to 20-review.js naming addf84d, three commits back, while the file last
 *               changed at 79083a8 -> "STALE: newest record is addf84d (2026-09-13); the file last changed
 *               at 79083a8". Reverted.
 *   COUNT-MOVED a full-scope record appended to 34-takeback.js with total=9999 -> "COUNT-MOVED: newest
 *               full-scope record says total=9999, the log says this gate runs 15". Reverted.
 * AND ONE DEFECT THIS TOOL HAD, found by writing its first real record rather than by testing it: the
 * count comparison ignored `scope`, so gate 15's controls - run at one geometry, where the gate runs 25 of
 * its 36 - would have been reported COUNT-MOVED. Fixed: only a `scope=full` record is compared to the log.
 *
 * usage: node gates/control-audit.js [gatelog]     (default: the newest claude/agents/gatelogs/*-all.log
 *                                                   that is not a *DEFECTIVE* one)
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const G = (a) => cp.execSync('git -C ' + JSON.stringify(ROOT) + ' ' + a, { encoding: 'utf8' }).trim();

/* ---- the gatelog that says what each gate runs NOW ---- */
const LOGDIR = path.join(ROOT, 'claude/agents/gatelogs');
let LOG = process.argv[2];
if (!LOG) {
  const cands = fs.readdirSync(LOGDIR).filter(f => /-all\.log$/.test(f) && !/DEFECTIVE/i.test(f))
    .map(f => ({ f, n: parseInt(f, 10) || 0 })).sort((a, b) => b.n - a.n || (a.f < b.f ? 1 : -1));
  if (!cands.length) { console.error('control-audit: no *-all.log under ' + LOGDIR); process.exit(2); }
  LOG = path.join(LOGDIR, cands[0].f);
}
if (!fs.existsSync(LOG)) { console.error('control-audit: no such log ' + LOG); process.exit(2); }
const logText = fs.readFileSync(LOG, 'utf8');
// each gate's own summary line, e.g. "GALLERY-PLAYALL: 36 pass, 0 fail" - keyed by the file it came from
const ranNow = {};
{
  let cur = null;
  for (const line of logText.split('\n')) {
    const h = line.match(/^=== (\S+) ===$/); if (h) { cur = h[1]; continue; }
    const s = line.match(/^\s*(\S+): (?:green \((\d+) PASS\)|RED)/);
    if (s && cur && s[2]) ranNow[cur] = parseInt(s[2], 10);
  }
}

/* ---- the records the gates declare ---- */
const RE = /CONTROL-RECORD:\s*([0-9a-f]{7,40})\s+(\d{4}-\d{2}-\d{2})\s+total=(\d+)\s+red=(\d+)\s+scope=(\S+)\s+how=(.*)$/;
const files = fs.readdirSync(path.join(ROOT, 'gates/regress')).filter(f => f.endsWith('.js')).sort();
const rows = [];
for (const f of files) {
  const rel = 'gates/regress/' + f, name = f.replace(/\.js$/, '');
  const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const recs = txt.split('\n').map(l => l.match(RE)).filter(Boolean).map(m => ({
    commit: m[1], date: m[2], total: +m[3], red: +m[4], scope: m[5], how: m[6].trim(),
  }));
  const lastCommit = G('log -1 --format=%H -- ' + JSON.stringify(rel));
  const now = ranNow[name];
  let verdict, why = '';
  if (!recs.length) { verdict = 'NONE'; why = 'the gate declares no CONTROL-RECORD'; }
  else {
    const newest = recs.slice().sort((a, b) => a.date < b.date ? 1 : -1)[0];
    const short = lastCommit.slice(0, newest.commit.length);
    const isLast = newest.commit === short;
    let ancestorOfLast = false;
    try { G('merge-base --is-ancestor ' + newest.commit + ' ' + lastCommit); ancestorOfLast = true; } catch (e) {}
    // COUNT-MOVED only applies to a FULL-scope record. A scoped record's total is the scoped count and
    // there is nothing in the log to compare it against - which is the whole reason `scope` is mandatory.
    // Caught by writing the first record: gate 15's controls ran at CT_G15_GEOS=kunal where the gate runs
    // 25 of its 36, and comparing that to the log's 36 would have reported a false COUNT-MOVED.
    if (now !== undefined && newest.scope === 'full' && newest.total !== now) {
      verdict = 'COUNT-MOVED';
      why = 'newest full-scope record says total=' + newest.total + ', the log says this gate runs ' + now;
    } else if (!isLast && ancestorOfLast) {
      verdict = 'STALE';
      why = 'newest record is ' + newest.commit + ' (' + newest.date + '); the file last changed at ' + lastCommit.slice(0, 7);
    } else if (!isLast && !ancestorOfLast) {
      verdict = 'STALE';
      why = 'newest record names ' + newest.commit + ', which is not an ancestor of the file\'s last commit ' + lastCommit.slice(0, 7);
    } else { verdict = 'CURRENT'; why = recs.length + ' record(s), newest ' + newest.commit + ' ' + newest.date; }
  }
  rows.push({ name, rel, recs, now, verdict, why });
}

/* ---- report ---- */
const pad = (s, n) => String(s).padEnd(n);
console.log('CONTROL AUDIT   log=' + path.relative(ROOT, LOG) + '   gates=' + rows.length);
console.log('');
for (const v of ['NONE', 'STALE', 'COUNT-MOVED', 'CURRENT']) {
  const g = rows.filter(r => r.verdict === v);
  console.log('--- ' + v + ' (' + g.length + ') ---');
  for (const r of g) {
    console.log('  ' + pad(r.name, 24) + (r.now === undefined ? 'not in log' : pad(r.now + ' assertions', 16)) + r.why);
    if (v === 'CURRENT' || v === 'STALE') for (const c of r.recs)
      console.log('      ' + c.commit + ' ' + c.date + '  total=' + c.total + ' red=' + c.red + ' scope=' + c.scope + '  ' + c.how);
  }
  console.log('');
}
const bad = rows.filter(r => r.verdict !== 'CURRENT');
const n = (v) => rows.filter(r => r.verdict === v).length;
console.log('SUMMARY  ' + n('CURRENT') + ' current, ' + n('NONE') + ' none, ' + n('STALE') + ' stale, ' + n('COUNT-MOVED') + ' count-moved, of ' + rows.length + ' gates');
if (bad.length) {
  console.log('CONTROL-AUDIT RED: ' + bad.length + ' gate(s) cannot show that their current assertions have ever been');
  console.log('shown able to fail. NONE is a gap, STALE is a record nothing can confirm, COUNT-MOVED is a record');
  console.log('making a false claim about its own scope. Back-fill only what you can verify - an invented record is');
  console.log('worse than none, because the next reader will trust it.');
  process.exit(1);
}
console.log('CONTROL-AUDIT GREEN: every gate declares a control against its own newest commit and count.');
