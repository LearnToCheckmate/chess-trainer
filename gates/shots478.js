// gates/shots478.js - the #478 before/after render pair, at Kunal's geometry (R19: 375x730).
//
// Definition of done (d): "a before-and-after rendering at 375x730 with a red box on the change".
//
// THE STATE CHOSEN IS THE DEFECT'S OWN STATE. Both frames are taken at the SAME moment of the SAME card:
// immediately after the player's wrong answer is judged, which is the moment Kunal screenshotted on
// 2026-09-20 ("Board jumps when the message in red comes up"). A pair taken at rest would show nothing,
// because at rest the two bundles differ only in a box that is empty in one of them.
//
// TWO FRAMES PER BUNDLE, NOT ONE, because the defect is a DIFFERENCE BETWEEN TWO STATES and a single frame
// cannot show a jump [#419's shape, and jobs/board-jumps-on-drill-verdict's own "whyTheGatesMISSEDIT": every
// gate in this suite measures ONE state, and a layout jump is not a property of a state]. So: rest, then
// wrong, for each bundle. The red box goes on the verdict container, which is the element that changes.
//
// PROVENANCE, and it is the #476 lesson applied rather than restated: b.stamp() reads the build stamp out of
// the LIVE DOM, and the drill screen does not render it, so on this screen a stamp sentinel comes back null
// and is not a sentinel at all. What carries the provenance here is (1) L.launch's own print, which names the
// bundle PATH and the stamp it read OUT OF THE FILE, and (2) the discriminating numbers printed beside each
// frame: the board's rect and the verdict box's computed height. The before frame must show the board MOVING
// between its two states and the after frame must show it still. A pair where both bundles read the same
// numbers is a mislabelled capture and the run should say so rather than publish the images.
//
// NOT A GATE. It asserts nothing and emits no PASS lines, so it can never be mistaken for a push gate
// [#405, #461]. It is also, honestly, a new member of the class in
// jobs/a-test-in-the-repo-that-no-suite-runs-2026-09-28 - a file under gates/ that no suite run reaches -
// and it joins gates/shots471.js, shots474.js and shots476.js there. Said rather than left for the next
// audit to find.
//
// RUN: CT_APP=<bundle> CT_SHOT_TAG=<before|after> node gates/shots478.js
'use strict';
const L = require('./lib');

const TAG = process.env.CT_SHOT_TAG || 'untagged';
const GEO = { w: 375, h: 730, safe: '' };   // R19: Kunal's phone

// gate 51's fixture and route, unchanged, so the APP captures its own mistakes and nothing in a
// hand-written fixture can satisfy the reading [#432's "a fixture that encodes the same assumption as
// the code cannot see that assumption"].
const ACCT = (() => {
  // BALANCED-BRACE EXTRACTION, not a regex. The first version matched /const ACCT=(\{[\s\S]*?\n\});/ and
  // returned NULL, because gate 51 declares ACCT on ONE line - so the store was empty, the Review screen had
  // no games, and the run died on a 30s timeout waiting for a "Review >" button that could never appear.
  // The failure was loud, which is the only reason it cost two minutes instead of producing an empty frame.
  const src = require('fs').readFileSync(__dirname + '/regress/51-drill-explain-why.js', 'utf8');
  const i = src.indexOf('const ACCT=');
  if (i < 0) return null;
  let j = src.indexOf('{', i), depth = 0, end = -1;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end < 0) return null;
  const PGN = require('fs').readFileSync(__dirname + '/regress/51-drill-explain-why.js', 'utf8')
    .match(/const PGN=`([\s\S]*?)`/)[1];
  return eval('(' + src.slice(j, end + 1) + ')');
})();

// The verdict container: located by the inner div's own rendered text and taking its PARENT, exactly as
// gates/measure-drill-verdict-reserve.js does. At rest there is no inner div - that IS the defect on the
// before bundle - so the container is then pz-top's last element child.
const markBox = (b) => b.page.evaluate(() => {
  const top = document.querySelector('[data-ct="pz-top"]');
  if (!top) return null;
  const inner = [...top.querySelectorAll('div,span')]
    .filter(e => e.children.length === 0 && /^(?:\u{1F389}|\u2717|\u{1F4A1})/u.test((e.innerText || '').trim()));
  const e = inner[inner.length - 1] || null;
  const p = e ? e.parentElement : (top.children.length ? top.children[top.children.length - 1] : null);
  if (!p) return null;
  const r = p.getBoundingClientRect(), cs = getComputedStyle(p);
  // the red box is drawn IN THE PAGE, because b.shot() passes its options to page.screenshot and has no
  // box/label of its own - checked against gates/lib.js:152 rather than assumed.
  document.querySelectorAll('[data-ct478-mark]').forEach(x => x.remove());
  const d = document.createElement('div');
  d.setAttribute('data-ct478-mark', '1');
  d.style.cssText = 'position:fixed;left:' + (r.left - 4) + 'px;top:' + (r.top - 4) + 'px;width:' +
    (r.width + 8) + 'px;height:' + (r.height + 8) + 'px;border:3px solid #ff2d2d;border-radius:8px;' +
    'z-index:99999;pointer-events:none';
  document.body.appendChild(d);
  return { x: +r.left.toFixed(2), y: +r.top.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
           cssHeight: cs.height, cssMaxHeight: cs.maxHeight, overflowY: cs.overflowY,
           text: e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null };
});

const boardRect = async (b) => {
  const x = await b.board();
  return x ? { w: +x.w.toFixed(2), top: +x.y.toFixed(2), sq: +x.sq.toFixed(2) } : null;
};

L.run(async () => {
  // ===== PHASE 1: the app captures its own mistakes from a real review (gate 51's route) =============
  const h = await L.launch({ geo: GEO, name: 's478-capture', store: ACCT });
  await h.open();
  L.note('TAG=' + TAG + '   bundle stamp read off the page: ' + await h.stamp());
  await h.tile('Review'); await h.settle(700);
  await h.page.locator('button', { hasText: /Review ›/ }).first().click();
  await h.page.locator('[data-ct="rev-summary"]').waitFor({ state: 'visible', timeout: 240000 });
  await h.settle(1200);
  const mis = await h.page.evaluate(() => JSON.parse(localStorage.getItem('ct_mymistakes') || '[]'));
  L.note('ct_mymistakes captured by the app: ' + mis.length);
  await h.close();
  if (!mis.length) { L.note('NOTHING CAPTURED - no frames taken. Stopping rather than shooting an empty screen.'); return; }

  const m = mis[0];
  const from = m.uci.slice(0, 2), f0 = from.charCodeAt(0) - 97, r0 = +from[1];
  const ring = [];
  for (const [df, dr] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,1],[-1,1],[1,-1],[0,-2],[0,2],[-2,0],[2,0]]) {
    const f = f0 + df, r = r0 + dr; if (f < 0 || f > 7 || r < 1 || r > 8) continue;
    const sq = String.fromCharCode(97 + f) + r; if (sq !== m.uci.slice(2, 4)) ring.push(from + sq);
  }

  // ===== PHASE 2: the two frames, same card, same geometry, same seed ================================
  const c = await L.launch({ geo: GEO, name: 's478-' + TAG, store: { ct_mymistakes: [m], ct_pool: '3' } });
  await c.open(); await c.tile('Review'); await c.settle(700);
  await c.tapText(/find the move you missed/, { wait: 1500 });
  await c.page.locator('[data-ct="pz-top"]').waitFor({ state: 'visible', timeout: 15000 });
  await c.settle(600);

  const restBox = await markBox(c), restBoard = await boardRect(c);
  L.note('REST  board=' + JSON.stringify(restBoard) + '  verdictBox=' + JSON.stringify(restBox));
  await c.shot('478-' + TAG + '-1-rest-375x730');

  let used = null, wrongBox = null, wrongBoard = null;
  for (const cand of ring) {
    await c.move(cand.slice(0, 2), cand.slice(2, 4), 900); await c.settle(1000);
    const bx = await markBox(c);
    if (bx && /^✗/.test(bx.text || '')) { used = cand; wrongBox = bx; wrongBoard = await boardRect(c); break; }
  }
  if (!used) { L.note('NO WRONG VERDICT REACHED over ' + ring.length + ' candidates - the second frame is ABSENT, not empty.'); return; }

  L.note('WRONG played=' + used + '  board=' + JSON.stringify(wrongBoard) + '  verdictBox=' + JSON.stringify(wrongBox));
  L.note('THE DISCRIMINATING NUMBERS for TAG=' + TAG + ': dBoardTop=' +
    (wrongBoard && restBoard ? (wrongBoard.top - restBoard.top).toFixed(2) : 'n/a') +
    '  dBoardW=' + (wrongBoard && restBoard ? (wrongBoard.w - restBoard.w).toFixed(2) : 'n/a') +
    '   (a BEFORE frame must show these non-zero and an AFTER frame must show them 0.00; if both read the' +
    ' same the pair is mislabelled and must not be published)');
  await c.shot('478-' + TAG + '-2-wrong-375x730');
  await c.close();
});
