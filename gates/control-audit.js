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
 *   PARTIAL         every assertion line the record's sha carried is STILL in the gate, but the gate has
 *                   grown (or reordered) since, so the record is true about what it named and says nothing
 *                   about the assertions added after it. Added #540 (CANUM): before it, one added assertion
 *                   turned every record on a gate into ASSERTIONS-MOVED, so the gate with the MOST recorded
 *                   controls (15-gallery-playall, fifteen of them) counted as zero and the numerator of this
 *                   ledger DECAYED every time the suite improved. A PARTIAL gate is counted as covered in the
 *                   SUMMARY (it has a non-FAULT record) and is NEVER green: the GREEN line below says every
 *                   assertion run today was shown able to fail, and a partial record cannot say that.
 *   ASSERTIONS-MOVED  an assertion line the record's sha carried is GONE from the gate. The record may be
 *                   true about what it ran; it cannot be true about what the gate asserts today. (Until
 *                   #540 this verdict also covered a gate that had merely GROWN; that half is PARTIAL now.)
 *   BAD-RECORD      the sha does not exist, the date is in the future, the scope is not in the vocabulary,
 *                   red=0 with no other record, red>total, or a count outside its bounds.
 *   NO-LOG          the cited log does not say what this gate runs, so `total` was compared with nothing.
 *                   v1 called that CURRENT and printed "and count" having checked no count.
 * EVERY record is checked, not the date-newest one: v1 sorted on the typed date with an inconsistent
 * comparator, so in a file where all records share a date, which one won a tie was V8's business - and a
 * false full-scope record hidden at the top of the list was invisible.
 *
 * THE SUBSET TEST IS A MULTISET TEST OVER TRIMMED `L.say(` LINES, NOT A COUNT TEST [#540]. :137 of the
 * previous version compared the joined TEXT of the lines, so an edit to one assertion faulted every record
 * on its gate even when the count was unchanged; the count appeared only in the message. PARTIAL therefore
 * asks: is every line the record's sha carried still present, as many times as it was? If one is missing,
 * the record is ASSERTIONS-MOVED exactly as before. If none is missing and the gate is not byte-identical,
 * it grew or was reordered: PARTIAL. A trailing-comma difference on an otherwise identical line is NOT seen
 * through - the header above defines a sound record by byte-identical assertion lines, and loosening that
 * is a separate decision, recorded as a known limit on the CANUM job rather than taken here.
 *
 * HOW A PARTIAL RECORD MEETS THE COUNT CHECKS, which were written for an unchanged gate. A full-scope
 * record's `total` is the gate's whole PASS count WHEN IT RAN, and nothing here can re-derive that figure
 * for an older sha: a PASS count is not an L.say site count (the real records read total=25 against 13
 * sites), and the cited log counts the grown gate. So a partial record's total, full or scoped, is bounded
 * the one way that is still sound: positive, and no more than what the log runs today, because the gate
 * grew. The exact equality the sound path demands is NOT asked of it. red=0 is still a baseline and not
 * a control.
 *
 * THE TWO VERDICT LINES ARE READ BY gates/fastgate.sh's RATCHET, which keys on ^(SUMMARY|CONTROL-AUDIT) and
 * reads every number on them as a count whose RISE is worse. So the partial count is NOT on either of
 * those lines: it is on its own PARTIAL-RECORDS line, which that key does not match. (That `covered`, the
 * SUMMARY's first number, is a count whose rise is GOOD and is read the wrong way round there is a limit of
 * fastgate.sh that predates this change; it is recorded on the CANUM job and not repaired here.)
 *
 * THE LOG IS RUN THROUGH gates/verify-log.sh, which is the one place that decides whether a log is
 * evidence. v1 chose the newest filename matching *-all.log and excluded names containing DEFECTIVE,
 * which is a convention, not a check: a `<N>-subset-all.log` matched it and would have become the
 * authority on what every gate runs, and the repo's `<N>-regate-of-the-<M>-bundle.log` full greens were
 * skipped. Filenames are not evidence.
 *
 * usage: node gates/control-audit.js [gatelog]
 *        node gates/control-audit.js --selftest     <- three inputs in scratch repositories, see selftest()
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const SCOPE_OK = (s) => s === 'full' || /^(env:[A-Za-z_][A-Za-z0-9_]*=\S+|geo:\S+|blocks:\S+)$/.test(s);
const TODAY = new Date().toISOString().slice(0, 10);
const RE = /^\s*\/\/\s*CONTROL-RECORD:\s*([0-9a-f]{7,40})\s+(\d{4}-\d{2}-\d{2})\s+total=(\d+)\s+red=(\d+)\s+scope=(\S+)\s+how=(\S.*)$/;
const ORDER = ['NONE', 'UNPARSABLE', 'DIRTY', 'ASSERTIONS-MOVED', 'NO-LOG', 'NO-RED', 'BAD-RECORD', 'PARTIAL', 'COVERED'];

/* ---- the log's own account of what each gate ran ---- */
function parseLog(logText) {
  const ranNow = {}, redNow = {};
  let cur = null;
  for (const line of logText.split('\n')) {
    const h = line.match(/^=== (\S+) ===$/); if (h) { cur = h[1]; continue; }
    const g = line.match(/^\s*(\S+): green \((\d+) PASS\)/); if (g && cur) { ranNow[cur] = +g[2]; continue; }
    if (/^\s*(\S+): RED/.test(line) && cur) redNow[cur] = true;
  }
  return { ranNow, redNow };
}

/* ---- the audit itself, over one repository root and one parsed log ---- */
function audit(ROOT, { ranNow, redNow }) {
  const G = (a) => cp.execSync('git -C ' + JSON.stringify(ROOT) + ' ' + a, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
  const Gq = (a) => { try { G(a); return true; } catch (e) { return false; } };
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
    const linesOf = (s) => s.split('\n').filter(l => /L\.say\(/.test(l)).map(l => l.trim());
    const nowSrc = fs.readFileSync(abs, 'utf8');
    const nowL = linesOf(nowSrc);
    const faults = [];
    for (const r of recs) {
      if (!Gq('cat-file -e ' + r.commit + '^{commit}')) { r.fault = 'sha ' + r.commit + ' is not a commit in this repo'; faults.push(r); continue; }
      if (r.date > TODAY) { r.fault = 'dated ' + r.date + ', which is in the future'; faults.push(r); continue; }
      if (!SCOPE_OK(r.scope)) { r.fault = 'scope=' + r.scope + ' is not in the vocabulary (full | env:K=V | geo:X | blocks:X)'; faults.push(r); continue; }
      if (r.red > r.total) { r.fault = 'red=' + r.red + ' exceeds total=' + r.total; faults.push(r); continue; }
      let old;
      try { old = G('show ' + r.commit + ':' + rel); } catch (e) { r.fault = 'the gate did not exist at ' + r.commit; faults.push(r); continue; }
      const oldL = linesOf(old);
      // THE COLLECTION IS ASSERTED NON-EMPTY BEFORE A PROPERTY OF IT IS [#540 repair, antagonist A's A-F1, P2]. A
      // record whose sha carried ZERO `L.say(` lines satisfied the subset test over nothing ("every line it ran is
      // still here" is true of no lines), read PARTIAL, and was counted covered on SUMMARY - where e8dd9cb read
      // ASSERTIONS-MOVED (0 -> N). CLAUDE.md records this trap as a class: every() over nothing is true. No live
      // record on main has it (their old gates carry 13 to 57 sites), so it is guarded here and posed in --selftest.
      if (oldL.length === 0) {
        r.fault = 'the gate carried no L.say( line at ' + r.commit + ' (0 -> ' + says(nowSrc) + ' L.say sites), so nothing the record ran can be matched to what runs today';
        r.moved = true; faults.push(r); continue;
      }
      if (oldL.join('\n') !== nowL.join('\n')) {
        // THE SUBSET TEST [#540]: every line the record's sha carried must still be here, as often as it was.
        const have = new Map(); for (const l of nowL) have.set(l, (have.get(l) || 0) + 1);
        const need = new Map(); let missing = 0;
        for (const l of oldL) { need.set(l, (need.get(l) || 0) + 1); if ((have.get(l) || 0) < need.get(l)) missing++; }
        if (missing > 0) {
          r.fault = 'the assertions changed since ' + r.commit + ' (' + says(old) + ' -> ' + says(nowSrc) + ' L.say sites; ' + missing + ' line(s) it ran are gone)';
          r.moved = true; faults.push(r); continue;
        }
        r.partial = true;
        r.growth = nowL.length > oldL.length ? 'the gate has grown ' + says(old) + ' -> ' + says(nowSrc) + ' L.say sites since'
                                               : 'the same ' + says(old) + ' L.say sites in a different order since';
      }
      if (now === undefined) { r.fault = 'this gate is not in the cited log' + (redNow[name] ? ' as green (it is RED there)' : ''); r.nolog = true; faults.push(r); continue; }
      if (r.partial) {
        // A partial record's full-scope total was the WHOLE count when it ran, and no log here says what the
        // gate ran at that sha (a PASS count is not an L.say site count: real records read total=25 against 13
        // sites), so it cannot be re-verified exactly. What CAN be asked: the gate grew, so today's log must run
        // at least that many, and the count must be positive. A scoped record keeps today's bound unchanged.
        if (!(r.total > 0 && r.total <= now)) { r.fault = (r.scope === 'full' ? 'full-scope' : 'scoped') + ' total=' + r.total + ' is not inside 1..' + now + ' (a partial record is bounded by what the log runs today, because the gate grew)'; faults.push(r); continue; }
      } else {
        if (r.scope === 'full' && r.total !== now) { r.fault = 'full-scope total=' + r.total + ' but the log says this gate runs ' + now; faults.push(r); continue; }
        if (r.scope !== 'full' && !(r.total > 0 && r.total <= now)) { r.fault = 'scoped total=' + r.total + ' is not inside 1..' + now; faults.push(r); continue; }
      }
      if (r.red === 0) { r.fault = 'red=0 - a baseline, not a control'; r.baseline = true; faults.push(r); continue; }
      if (r.partial) r.partialOk = true; else r.sound = true;
    }
    const sound = recs.filter(r => r.sound);
    const partial = recs.filter(r => r.partialOk);
    let verdict, note;
    if (dirty) { verdict = 'DIRTY'; note = 'the working copy differs from HEAD; nothing here can judge it against a commit'; }
    else if (bad.length) { verdict = 'UNPARSABLE'; note = bad.length + ' line(s) say CONTROL-RECORD and do not match the format'; }
    else if (!recs.length) { verdict = 'NONE'; note = 'the gate declares no CONTROL-RECORD'; }
    else if (sound.length) { verdict = 'COVERED'; note = sound.length + ' sound record(s) of ' + recs.length + ', assertions unchanged since each'; }
    else if (partial.length) { verdict = 'PARTIAL'; note = partial.length + ' partial record(s) of ' + recs.length + ': every line each one ran is still here, but ' + partial[0].growth + ' - the newer assertions are unshown'; }
    else if (faults.some(r => r.moved)) { verdict = 'ASSERTIONS-MOVED'; note = faults.find(r => r.moved).fault; }
    else if (faults.some(r => r.nolog)) { verdict = 'NO-LOG'; note = faults.find(r => r.nolog).fault; }
    else if (faults.every(r => r.baseline)) { verdict = 'NO-RED'; note = 'every record has red=0 - baselines, not controls'; }
    else { verdict = 'BAD-RECORD'; note = faults[0].fault; }
    rows.push({ name, rel, recs, bad, now, verdict, note, faults });
  }
  return rows;
}

/* ---- report. Returns the process exit code rather than exiting, so the selftest can read it. ---- */
function report(rows, logLabel) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log('CONTROL AUDIT   log=' + logLabel + '   gates=' + rows.length);
  console.log('');
  for (const v of ORDER) {
    const g = rows.filter(r => r.verdict === v);
    if (!g.length) { console.log('--- ' + v + ' (0) ---'); console.log(''); continue; }
    console.log('--- ' + v + ' (' + g.length + ') ---');
    for (const r of g) {
      console.log('  ' + pad(r.name, 24) + pad(r.now === undefined ? 'not in log' : r.now + ' assertions', 16) + r.note);
      if (v !== 'NONE') {
        for (const c of r.recs) console.log('      ' + (c.sound ? 'sound   ' : c.partialOk ? 'partial ' : c.baseline ? 'base    ' : 'FAULT   ') + c.commit + ' ' + c.date +
          '  total=' + c.total + ' red=' + c.red + ' scope=' + c.scope + '  ' + c.how + (c.fault ? '   <- ' + c.fault : c.partialOk ? '   <- ' + c.growth : ''));
        for (const b of r.bad) console.log('      UNPARSABLE  ' + b.slice(0, 120));
      }
    }
    console.log('');
  }
  const n = (v) => rows.filter(r => r.verdict === v).length;
  // `covered` counts gates with at least one non-FAULT record: COVERED and PARTIAL both. PARTIAL is kept OFF
  // this line and off the CONTROL-AUDIT line, because fastgate.sh's ratchet reads every number on those two
  // as a count whose rise is worse, and a rise in partial records is a gate gaining a record, not losing one.
  const covered = n('COVERED') + n('PARTIAL');
  console.log('SUMMARY  ' + covered + ' covered, of ' + rows.length + ' gates  |  ' +
    ORDER.filter(v => v !== 'COVERED' && v !== 'PARTIAL' && n(v)).map(v => n(v) + ' ' + v.toLowerCase()).join(', '));
  console.log('PARTIAL-RECORDS  ' + n('PARTIAL') + ' of those ' + covered + ' covered gate(s) rest on partial records only: shown able to fail for the assertions the record ran, not for the ones added since.');
  const bad = rows.filter(r => r.verdict !== 'COVERED');
  // ── THE RATCHET LINE: ONE FIXED SHAPE, DEFECTS ONLY, PRINTED WHETHER THIS AUDIT IS GREEN OR RED ───────────
  // [#544, item (5) of directOpening_2026_10_28_batch4; the SECOND of the two instances
  // jobs/the-records-ratchet-refuses-the-commit-that-fixes-the-arm-5-breach-and-the-roster-says-this-mode-cannot-redden-a-build-2026-10-10
  // counts in its classSwept, left unfixed there "to the owning lane with the count stated".]
  // WHAT THE TWO LINES ABOVE CANNOT BE COMPARED BY. gates/fastgate.sh ratchets this tool: it reduces the lines
  // matching its key to every OK/RED/GREEN/FAIL word plus every integer, and refuses outright when the field
  // count differs. The SUMMARY line fails that twice over - `of <rows.length> gates` is a SIZE, so adding a gate
  // reads as a defect rising, and the category list only prints the NON-ZERO categories, so a category falling
  // to zero removes a field - and the verdict flips between a RED line carrying a count and a GREEN line
  // carrying no number at all. The comment at the SUMMARY line already records one escape from this (PARTIAL is
  // deliberately kept off both lines because a rise in it is a gate GAINING a record); that is a fact about one
  // counter, not a fix for the shape.
  // SO THIS LINE CARRIES WHAT A RATCHET CAN HONESTLY COMPARE: a verdict word and EIGHT counters, always all of
  // them, always in this order, every one a count of gates in a FAULT state where lower is better. No size, so
  // adding a gate with a sound control moves nothing here; and PARTIAL stays off it for the reason above.
  // ITS LABELS ARE LOWERCASE AND CARRY NO DIGITS, AND BOTH HALVES ARE LOAD-BEARING: sig() takes every integer on
  // the line, so a digit in a label would shift every counter after it, and its verdict-word pattern is
  // case-sensitive, so the category `NO-RED` has to be spelled `nored` or it would read as a verdict of its own.
  console.log('CONTROL-AUDIT RATCHET: ' + (bad.length ? 'RED' : 'GREEN') +
    ' uncovered=' + bad.length +
    ' none=' + n('NONE') + ' unparsable=' + n('UNPARSABLE') + ' dirty=' + n('DIRTY') +
    ' assertionsmoved=' + n('ASSERTIONS-MOVED') + ' nolog=' + n('NO-LOG') + ' nored=' + n('NO-RED') +
    ' badrecord=' + n('BAD-RECORD'));
  if (bad.length) {
    console.log('CONTROL-AUDIT RED: ' + bad.length + ' gate(s) cannot show that the assertions they run TODAY have ever');
    console.log('been shown able to fail. Back-fill only what you can verify - an invented record is worse than none,');
    console.log('because the next reader will trust it, and this tool cannot tell an invented sha from a real one');
    console.log('beyond checking that it is a commit in this repo.');
    return 1;
  }
  console.log('CONTROL-AUDIT GREEN: every gate declares a sound control over the assertions it runs today.');
  return 0;
}

/* ---- --selftest: three inputs, each a scratch git repository built here and removed here [#540, CANUM] ----
 * (1) a gate with a valid record and NO assertions added since    -> COVERED, counted covered, GREEN
 * (2) the same gate with ONE assertion added                       -> PARTIAL, STILL counted covered, never GREEN
 * (3) a gate whose recorded assertions no longer exist             -> ASSERTIONS-MOVED, not covered
 * The log is a minimal text in the suite's own shape (=== gate === / gate: green (N PASS)), parsed by the same
 * parseLog the real path uses; verify-log.sh is NOT consulted here, because these inputs test the record logic
 * and not log acceptance, and a forged full-suite green would be a worse fixture than none. The MUTANT this
 * arm is built to catch: the subset test taken out (strict equality restored at the comparison) turns input
 * (2) back to zero covered, which is exactly the decay the CANUM job describes.
 */
function selftest() {
  let pass = 0, fail = 0;
  const ok = (cond, what) => { if (cond) { pass++; console.log('SELFTEST PASS ' + what); } else { fail++; console.log('SELFTEST FAIL ' + what); } };
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'control-audit-selftest-'));
  // THE SCRATCH REPOSITORY IS PINNED AND THE ENVIRONMENT IS STRIPPED [#540 repair, antagonist B's B-F1, P1].
  // The first version of this arm ran `git -C <scratch> init/add/commit` with the environment as found, and `-C`
  // does not override an inherited GIT_DIR: B measured `GIT_DIR=<victim>/.git node gates/control-audit.js
  // --selftest` printing 12 pass / 0 fail while writing SIX commits onto the victim's main and dropping its
  // tracked file from HEAD's tree. git hooks export GIT_DIR, so that is the environment a hook's child gets.
  // Two guards, both here: every git call this arm makes names --git-dir and --work-tree explicitly, as
  // gates/gatemanifest.sh's selftest does since the same build; and the GIT_* variables that can redirect a
  // repository, its index or its object store are removed from THIS process's environment before any child
  // runs, so audit()'s own reads (which still use a bare `git -C`, the class GMROOT's whatIsLeft names) read the
  // scratch repository and not the inherited one. A selftest that can rewrite another repository's history is
  // worse than no selftest.
  for (const v of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_NAMESPACE','GIT_CEILING_DIRECTORIES','GIT_COMMON_DIR']) delete process.env[v];
  const PIN = 'git -C ' + JSON.stringify(root) + ' --git-dir=' + JSON.stringify(path.join(root, '.git')) + ' --work-tree=' + JSON.stringify(root) + ' ';
  const git = (a) => cp.execSync(PIN + a, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
  const gate = path.join(root, 'gates/regress/01-fixture.js');
  const write = (lines) => fs.writeFileSync(gate, lines.join('\n') + '\n');
  const commit = (m) => { git('add -A'); git('-c user.email=selftest@local -c user.name=selftest commit -q -m ' + JSON.stringify(m)); return git('rev-parse HEAD'); };
  const capture = (fn) => { const buf = []; const orig = console.log; console.log = (...a) => buf.push(a.join(' ')); let rc; try { rc = fn(); } finally { console.log = orig; } return { rc, out: buf.join('\n') }; };
  const run = (passCount, label) => capture(() => report(audit(root, parseLog('=== 01-fixture ===\n  01-fixture: green (' + passCount + ' PASS)\n')), label));
  try {
    fs.mkdirSync(path.join(root, 'gates/regress'), { recursive: true });
    git('init -q -b main');
    const A1 = "L.say('a', 1 === 1);", A2 = "L.say('b', 2 === 2);", A3 = "L.say('c', 3 === 3);";
    write(['// fixture gate', A1, A2, A3]);
    const seed = commit('seed: three assertions');
    const rec = '// CONTROL-RECORD: ' + seed + ' ' + TODAY + ' total=3 red=1 scope=full how=the fixture flipped assertion b';
    // (1) a valid record and no assertions added since
    write(['// fixture gate', rec, A1, A2, A3]); commit('record');
    let r = run(3, 'selftest-1');
    ok(/^--- COVERED \(1\) ---$/m.test(r.out), '(1) a gate with a valid record and no assertions added since reads COVERED');
    ok(/^SUMMARY  1 covered, of 1 gates/m.test(r.out), '(1) and the SUMMARY counts it covered');
    ok(/^PARTIAL-RECORDS  0 of those 1 covered/m.test(r.out) && r.rc === 0 && /^CONTROL-AUDIT GREEN/m.test(r.out), '(1) with 0 partial, and the GREEN line prints at exit 0');
    const RAT1 = (r.out.match(/^CONTROL-AUDIT RATCHET:.*$/m) || [''])[0];   // captured GREEN, compared at (3c)
    // (2) the same gate with ONE assertion added
    write(['// fixture gate', rec, A1, A2, A3, "L.say('d', 4 === 4);"]); commit('one assertion added');
    r = run(4, 'selftest-2');
    ok(/^--- PARTIAL \(1\) ---$/m.test(r.out) && /^--- ASSERTIONS-MOVED \(0\) ---$/m.test(r.out), '(2) one assertion added reads PARTIAL, not ASSERTIONS-MOVED');
    ok(/^SUMMARY  1 covered, of 1 gates/m.test(r.out), '(2) covered does NOT fall to zero - the record is still true about the three lines it ran');
    ok(/^PARTIAL-RECORDS  1 of those 1 covered/m.test(r.out), '(2) and the partial count is on its own line, not on SUMMARY');
    ok(r.rc === 1 && !/CONTROL-AUDIT GREEN/.test(r.out) && /^CONTROL-AUDIT RED: 1 gate/m.test(r.out), '(2) a partial gate never prints the GREEN line: exit 1, RED names it');
    ok(/partial.*the gate has grown 3 -> 4 L\.say sites/.test(r.out), '(2) the record line says the gate grew 3 -> 4');
    // (2b) the count check a partial record meets: its total is bounded by what the log runs today
    write(['// fixture gate', rec.replace('total=3', 'total=9'), A1, A2, A3, "L.say('d', 4 === 4);"]); commit('record claims more than the log runs');
    r = run(4, 'selftest-2b');
    ok(/^--- BAD-RECORD \(1\) ---$/m.test(r.out) && /is not inside 1\.\.4 \(a partial record is bounded/.test(r.out) && /^SUMMARY  0 covered/m.test(r.out), '(2b) a partial record whose total exceeds what the log runs today is BAD-RECORD');
    // (3) a gate whose recorded assertions no longer exist
    write(['// fixture gate', rec, A1, "L.say('b', 2 === 3);", A3, "L.say('d', 4 === 4);"]); commit('one recorded assertion rewritten');
    r = run(4, 'selftest-3');
    ok(/^--- ASSERTIONS-MOVED \(1\) ---$/m.test(r.out) && /1 line\(s\) it ran are gone/.test(r.out), '(3) a gate whose recorded assertion no longer exists is still FAULT: ASSERTIONS-MOVED');
    ok(/^SUMMARY  0 covered, of 1 gates  \|  1 assertions-moved/m.test(r.out) && r.rc === 1, '(3) and it is not covered, at exit 1');
    // ── (3c) THE RATCHET LINE KEEPS ONE SHAPE ACROSS GREEN AND RED [#544, item (5)]. This is the property
    //     gates/fastgate.sh's records-tier repair rests on, asserted for THIS tool against its own two states:
    //     input (1), a sound control, and input (3), a recorded assertion that no longer exists. sig() as
    //     gates/fastgate.sh defines it is reproduced here rather than imported, because this file must run with
    //     no fastgate.sh present; if that definition changes, this copy is wrong and this assertion stops
    //     meaning what it says.
    const RAT3 = (r.out.match(/^CONTROL-AUDIT RATCHET:.*$/m) || [''])[0];
    const sigf = (t) => ((t.match(/\b(OK|RED|GREEN|FAIL)\b|[0-9]+/g)) || []).length;
    ok(RAT1 !== '' && RAT3 !== '' && sigf(RAT1) === 9 && sigf(RAT3) === 9,
       '(3c) the ratchet line reduces to the same 9 fields green and red (one verdict word, eight counters)');
    // AND THE TWO READINGS MUST BE TWO STATES, or the line above is 9 === 9 over one string twice.
    ok(/RATCHET: GREEN uncovered=0 /.test(RAT1) && /RATCHET: RED uncovered=1 /.test(RAT3) && /assertionsmoved=1/.test(RAT3),
       '(3d) and they are green-with-nothing-uncovered against red-with-one, so (3c) is not one state twice');
    // (3b) the same multiset in a different order is PARTIAL (every line it ran is still here), never COVERED
    write(['// fixture gate', rec, A3, A2, A1]); commit('reordered');
    r = run(3, 'selftest-3b');
    ok(/^--- PARTIAL \(1\) ---$/m.test(r.out) && /in a different order since/.test(r.out) && r.rc === 1, '(3b) the same three lines reordered read PARTIAL at exit 1, not COVERED');
    // (1b) THE EMPTY COLLECTION [#540 repair, A-F1]: a record naming a sha at which the gate carried NO L.say line.
    //      The subset test is vacuously true over nothing; it must read ASSERTIONS-MOVED (as e8dd9cb did), never
    //      PARTIAL, and never count as covered.
    write(['// fixture gate', "L.check('x');", "L.check('y');"]); const empty = commit('a sha with no L.say at all');
    const rec0 = '// CONTROL-RECORD: ' + empty + ' ' + TODAY + ' total=2 red=1 scope=full how=the fixture flipped a check';
    write(['// fixture gate', rec0, A1, A2, A3]); commit('record naming the L.say-less sha');
    r = run(3, 'selftest-1b');
    ok(/^--- ASSERTIONS-MOVED \(1\) ---$/m.test(r.out) && /carried no L.say\( line at/.test(r.out), '(1b) a record whose sha carried no L.say line reads ASSERTIONS-MOVED, not PARTIAL over nothing');
    ok(/^SUMMARY  0 covered, of 1 gates/m.test(r.out) && r.rc === 1, '(1b) and it is not counted covered, at exit 1');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log('control-audit selftest: ' + pass + ' pass / ' + fail + ' fail');
  return fail ? 1 : 0;
}

/* ---- main ---- */
if (process.argv[2] === '--selftest') process.exit(selftest());

const ROOT = path.resolve(__dirname, '..');
const Gq = (a) => { try { cp.execSync('git -C ' + JSON.stringify(ROOT) + ' ' + a, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }); return true; } catch (e) { return false; } };
const LOGDIR = path.join(ROOT, 'claude/agents/gatelogs');
let LOG = process.argv[2];
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
process.exit(report(audit(ROOT, parseLog(fs.readFileSync(LOG, 'utf8'))), path.relative(ROOT, LOG) + ' (accepted by verify-log.sh)'));
