#!/usr/bin/env node
'use strict';
// gates/suite-compare.js <unbroken -all.log> <joined -all.log> [<second unbroken -all.log>]   |   --selftest
//
// WHY [batch 13; jobs/the-full-suite-resumes-after-a-container-restart-from-the-first-unfinished-gate-2026-11-18, its
// whatWouldCloseIt (2): "a suite killed in the middle of a gate and resumed gives a joined log ... whose PASS and FAIL
// lines match an unbroken run on the same head apart from the known natural variation"]. gates/verify-join.sh judges a
// joined log ALONE (one mark per section, the roster in order, one tree and bundle); nothing compared it with an unbroken
// run. A byte diff of two real suites is useless for that, because most PASS lines carry measured rects, timings and a
// JSON detail that differ between any two runs of one bundle. So this compares what must NOT vary and lists what may:
//   MUST MATCH (exit 1 if not): the same bundle md5 in both headers; the same gate sections in the same order; per gate,
//     the same verdict (green or RED), the same PASS count and the same FAIL count; and, per gate, the same multiset of
//     assertion lines once each is NORMALISED - the trailing two-space JSON detail cut and every number replaced by '#'.
//   REPORTED, NOT REFUSED: the joined log's suite-resume lines (marks, the `resume:` footer), which an unbroken log has
//     no reason to carry; and the count of lines whose raw text differs only in numbers (the natural variation).
//   THE KNOWN NATURAL VARIATION, MEASURED RATHER THAN ASSUMED: given a SECOND unbroken log of the same head (job 26's other
//     serial run), a gate whose lines or counts already differ between the two unbroken runs is KNOWN TO VARY, and the same
//     kind of difference in the joined log is listed as KNOWN and does not refuse. A missing, doubled or reordered gate, a
//     verdict change and another bundle are never excused. Without the third log every difference refuses and is named.
// It reads two or three files and nothing else: no browser, no git, no network. It is NOT a push authority; verify-log.sh is.
// EXIT 0 SAME (apart from numbers) | 1 DIFFERENT, every difference named | 2 could not run (missing file, no sections).
const fs = require('fs');

const norm = (l) => l.replace(/\s{2,}[\[{].*$/, '').replace(/-?\d+(?:\.\d+)?/g, '#').replace(/\s+$/, '');
function parse(text) {
  const L = text.split('\n');
  const h = (L[0] || '').match(/md5 ([0-9a-f]{12})/);
  const order = [], sec = {};
  let cur = null, resumeLines = 0;
  for (const l of L) {
    if (/^    resume-mark: |^resume: |^suite-resume: /.test(l)) { resumeLines++; continue; }
    const m = l.match(/^=== (\S+) ===$/);
    if (m) { cur = m[1]; if (sec[cur]) sec[cur].dup = (sec[cur].dup || 1) + 1; else { order.push(cur); sec[cur] = { pass: [], fail: [], verdict: null }; } continue; }
    if (!cur) continue;
    if (/^(regression assertions|unit-layer assertions|gates ran|gate manifest:|instrument:|ref:|GATES |SUBSET|build-number series:|assertion counts:)/.test(l)) { cur = null; continue; }
    const v = l.match(new RegExp('^    ' + cur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': (green|RED)\\b'));
    if (v) { sec[cur].verdict = v[1]; continue; }
    if (/^PASS/.test(l)) sec[cur].pass.push(l); else if (/^FAIL/.test(l)) sec[cur].fail.push(l);
  }
  return { md5: h && h[1], order, sec, resumeLines };
}
function multisetDiff(a, b) { // lines in a not matched in b
  const have = new Map(); for (const x of b) have.set(x, (have.get(x) || 0) + 1);
  const out = []; for (const x of a) { const n = have.get(x) || 0; if (n > 0) have.set(x, n - 1); else out.push(x); }
  return out;
}
function compare(uText, jText, u2Text) {
  const U = parse(uText), J = parse(jText), diffs = [], known = [];
  let varies = new Set();
  if (u2Text) { const b = compare(uText, u2Text); if (b.rc === 2) return b; varies = new Set(b.gatesVarying); }
  const gatesVarying = [];
  if (!U.order.length || !J.order.length) return { rc: 2, lines: ['COULD NOT COMPARE: a log carries no "=== gate ===" section (' + U.order.length + ' and ' + J.order.length + ')'] };
  if (U.md5 !== J.md5) diffs.push('bundle: the unbroken log gated ' + U.md5 + ' and the joined log ' + J.md5);
  for (const [X, nm] of [[U, 'unbroken'], [J, 'joined']]) for (const g of X.order) if (X.sec[g].dup) diffs.push(g + ': appears ' + X.sec[g].dup + ' times in the ' + nm + ' log');
  const onlyU = U.order.filter((g) => !J.sec[g]), onlyJ = J.order.filter((g) => !U.sec[g]);
  for (const g of onlyU) diffs.push(g + ': in the unbroken log and MISSING from the joined one');
  for (const g of onlyJ) diffs.push(g + ': in the joined log and not in the unbroken one');
  const common = U.order.filter((g) => J.sec[g]);
  if (common.join(' ') !== J.order.filter((g) => U.sec[g]).join(' ')) diffs.push('order: the gates common to both run in a different order');
  let numericOnly = 0;
  for (const g of common) {
    const u = U.sec[g], j = J.sec[g];
    if (u.verdict !== j.verdict) diffs.push(g + ': verdict ' + u.verdict + ' unbroken, ' + j.verdict + ' joined');
    const soft = []; // line and count differences: excusable only when the two unbroken runs differ on this gate too
    if (u.pass.length !== j.pass.length || u.fail.length !== j.fail.length) soft.push(g + ': ' + u.pass.length + ' PASS / ' + u.fail.length + ' FAIL unbroken, ' + j.pass.length + ' PASS / ' + j.fail.length + ' FAIL joined');
    const un = [...u.pass, ...u.fail].map(norm), jn = [...j.pass, ...j.fail].map(norm);
    const a = multisetDiff(un, jn), b = multisetDiff(jn, un);
    for (const x of a.slice(0, 3)) soft.push(g + ': only unbroken: ' + x.slice(0, 160));
    for (const x of b.slice(0, 3)) soft.push(g + ': only joined:   ' + x.slice(0, 160));
    if (a.length > 3 || b.length > 3) soft.push(g + ': ... ' + a.length + ' and ' + b.length + ' normalised line(s) unmatched in all');
    if (soft.length) { gatesVarying.push(g); if (varies.has(g) && u.verdict === j.verdict) known.push(...soft); else diffs.push(...soft); }
    const ur = multisetDiff([...u.pass, ...u.fail], [...j.pass, ...j.fail]).length;
    numericOnly += Math.max(0, ur - a.length);
  }
  const head = 'suite-compare: ' + common.length + ' gate(s) in both, bundle ' + U.md5 + (U.md5 === J.md5 ? '' : '/' + J.md5) + ', ' + J.resumeLines + ' suite-resume line(s) in the second log (reported, not compared), ' + numericOnly + ' assertion line(s) differing in numbers only (the natural variation)' + (u2Text ? ', ' + varies.size + ' gate(s) that already differ between the two unbroken runs' : '');
  const kn = known.map((d) => '  KNOWN (varies between the two unbroken runs too) ' + d);
  if (diffs.length) return { rc: 1, gatesVarying, lines: [head, ...kn, ...diffs.map((d) => '  DIFFERENT ' + d), 'SUITE COMPARE: DIFFERENT (' + diffs.length + (known.length ? ', and ' + known.length + ' known' : '') + ')'] };
  return { rc: 0, gatesVarying, lines: [head, ...kn, 'SUITE COMPARE: SAME apart from numbers' + (known.length ? ' and ' + known.length + ' known variation(s)' : '')] };
}

function selftest() {
  let ok = 0, fail = 0;
  const t = (c, name) => { if (c) { ok++; console.log('  ok  ' + name); } else { fail++; console.log('  FAIL ' + name); } };
  const sec = (g, lines, v) => ['=== ' + g + ' ===', ...lines, '    ' + g + ': ' + (v || 'green') + ' (' + lines.length + ' PASS)'];
  const log = (md5, secs, extra) => ['gates.sh #999  bundle app.js  md5 ' + md5 + '  x', ...(extra || []), ...secs.flat(), 'regression assertions (PASS lines): 0', 'GATES GREEN #999'].join('\n') + '\n';
  const A = [sec('10-a', ['PASS a one', 'PASS a box at 12.5  [{"x":12.5}]']), sec('11-b', ['PASS b two', 'PASS b took 300ms'])];
  const base = log('aaaaaaaaaaaa', A);
  t(compare(base, base).rc === 0, 'S1 a log compared with itself is SAME');
  const vary = log('aaaaaaaaaaaa', [sec('10-a', ['PASS a one', 'PASS a box at 13.1  [{"x":13.1}]']), sec('11-b', ['PASS b two', 'PASS b took 412ms'])],
    ['suite-resume: RESUMING from x'].concat([]));
  const rv = compare(base, vary + '    resume-mark: 1/2 10-a\n');
  t(rv.rc === 0 && / 2 assertion line\(s\) differing in numbers only/.test(rv.lines[0]), 'S2 numbers and the JSON detail may differ, and suite-resume lines are reported, not compared (' + rv.lines[0].slice(-80) + ')');
  t(compare(base, log('aaaaaaaaaaaa', [A[0]])).rc === 1, 'S3 a gate missing from the joined log is DIFFERENT');
  t(compare(base, log('aaaaaaaaaaaa', [A[0], A[1], A[1]])).rc === 1, 'S4 a gate counted twice is DIFFERENT');
  t(compare(base, log('bbbbbbbbbbbb', A)).rc === 1, 'S5 another bundle is DIFFERENT');
  const r6 = compare(base, log('aaaaaaaaaaaa', [A[0], sec('11-b', ['PASS b two', 'FAIL b took 300ms'], 'RED')]));
  t(r6.rc === 1 && r6.lines.some((l) => /11-b: verdict green unbroken, RED joined/.test(l)), 'S6 a PASS turned FAIL (and the gate RED) is DIFFERENT and named');
  t(compare(base, log('aaaaaaaaaaaa', [A[0], sec('11-b', ['PASS b two', 'PASS b took 300ms', 'PASS b three'])])).rc === 1, 'S7 one more assertion in a gate is DIFFERENT');
  t(compare(base, log('aaaaaaaaaaaa', [A[0], sec('11-b', ['PASS b TWO', 'PASS b took 300ms'])])).rc === 1, 'S8 a reworded assertion with the same counts is DIFFERENT (words are compared, only numbers are not)');
  t(compare(base, log('aaaaaaaaaaaa', [A[1], A[0]])).rc === 1, 'S9 the same gates in another order is DIFFERENT');
  t(compare('no sections\n', base).rc === 2, 'S10 a log with no gate section cannot be compared: exit 2, never SAME');
  const clk = (n) => log('aaaaaaaaaaaa', [A[0], sec('11-b', ['PASS b two', 'PASS b clocks ' + n])]);
  const k1 = compare(clk('["5:00","5:00"]'), clk('["5:00"]'));
  t(k1.rc === 1, 'S11 a word-level difference with no second unbroken log refuses');
  const k2 = compare(clk('["5:00","5:00"]'), clk('["5:00"]'), clk('["5:00"]'));
  t(k2.rc === 0 && k2.lines.some((l) => /^  KNOWN .*11-b/.test(l)), 'S12 the same difference on a gate that also differs between the two unbroken runs is KNOWN and does not refuse');
  const k3 = compare(clk('["5:00","5:00"]'), log('aaaaaaaaaaaa', [sec('10-a', ['PASS a one', 'PASS a box at 12.5 CHANGED']), sec('11-b', ['PASS b two', 'PASS b clocks ["5:00"]'])]), clk('["5:00"]'));
  t(k3.rc === 1 && k3.lines.some((l) => /DIFFERENT 10-a/.test(l)), 'S13 a gate that does NOT vary between the unbroken runs still refuses (the excuse is per gate, not global)');
  const k4 = compare(base, log('aaaaaaaaaaaa', [A[0]]), log('aaaaaaaaaaaa', [A[0], sec('11-b', ['PASS b other', 'PASS b took 300ms'])]));
  t(k4.rc === 1, 'S14 a MISSING gate is never excused, even when that gate varies between the two unbroken runs');
  console.log('suite-compare selftest: ' + ok + ' ok / ' + fail + ' FAIL');
  return fail ? 1 : 0;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--selftest') process.exit(selftest());
  if (a.length !== 2 && a.length !== 3) { console.log('usage: gates/suite-compare.js <unbroken -all.log> <joined -all.log> [<second unbroken -all.log>] | --selftest'); process.exit(2); }
  let u, j, u2 = null;
  try { u = fs.readFileSync(a[0], 'utf8'); j = fs.readFileSync(a[1], 'utf8'); if (a[2]) u2 = fs.readFileSync(a[2], 'utf8'); } catch (e) { console.log('COULD NOT COMPARE: ' + e.message); process.exit(2); }
  const r = compare(u, j, u2); console.log(r.lines.join('\n')); process.exit(r.rc);
}
module.exports = { compare, norm, parse };
