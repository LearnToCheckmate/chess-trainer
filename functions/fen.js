// functions/fen.js — FEN validation for the scanBoard function, as a PURE module.
//
// Lifted out of the build spec's Part 1 listing (tracker artifact 5326ERvZCZ5tEYRkPavPTF,
// jobs/build-spec-board-scan-server, `result`) deliberately as its OWN FILE rather than inline in
// functions/index.js. R-BS-7 of that spec offered two ways to make it testable and said which it would build:
// "lift fenCheck into functions/fen.js and require it from both. The second is cleaner and is what I would
// build." The reason is mechanical, not taste: requiring functions/index.js evaluates `defineSecret`, which
// needs a Firebase project context, so a gate cannot require it without an emulator. This file has no SDK
// reference, no I/O and no network, so gates/regress/27-scan-fen.js requires it in plain Node in under a second.
//
// WHY IT EXISTS AT ALL. A vision model returns a plausible MALFORMED FEN without hesitating, and the position
// it hands back is the one the player then plays. So a wrong board on screen is the defect this whole feature
// is about.
//
// THE DESIGN CALL, carried from the spec rather than re-derived, and stated so it can be overruled:
// checks 1-5 REJECT and checks 6-8 REPAIR. 1-5 are claims about THE BOARD, which the photograph does show, so
// a fault there means the read is wrong. 6-8 are claims about THE GAME'S HISTORY - castling rights, en passant,
// move counters - which no photograph can ever show, so a fault there means the model answered a question it
// should not have been asked, and throwing away a correctly-read board over it would refuse good scans for a
// reason the player can neither understand nor fix.
//
// AND THE SUB-CALL INSIDE CHECK 6, which is the one a reviewer should look at hardest. When the model returns
// NO castling field at all - which the prompt tells it to do - this INFERS rights from the position (a king on
// its origin square with a rook on its origin square) rather than defaulting to none. Defaulting to none is
// safer in the narrow sense and is what the spec's author wrote first; it means a photograph of the opening
// position hands the player a game where neither side may ever castle, which is a wrong position dressed as a
// cautious one. Inference grants a right only where the board itself supports it, which is exactly the standard
// check 6 already applies to an explicit field. AN EXPLICIT "-" IS HONOURED AND NEVER RE-INFERRED, and the gate
// pins that distinction, because it is the difference between the two behaviours and it is one character wide.
'use strict';

const FILES = 'abcdefgh';

function fenCheck(raw) {
  const out = {ok: false, fen: null, err: null, repaired: []};
  const s = String(raw || '').trim();
  if (!s) { out.err = 'empty'; return out; }
  const p = s.split(/\s+/);
  if (p.length < 1 || p.length > 6) { out.err = 'field-count'; return out; }

  // 1. placement: 8 ranks, each summing to exactly 8, legal characters only
  const ranks = p[0].split('/');
  if (ranks.length !== 8) { out.err = 'rank-count'; return out; }
  const grid = [];
  for (const r of ranks) {
    if (!/^[pnbrqkPNBRQK1-8]+$/.test(r)) { out.err = 'bad-char'; return out; }
    if (/[1-8]{2}/.test(r)) { out.err = 'adjacent-digits'; return out; }
    let n = 0; const row = [];
    for (const ch of r) {
      if (ch >= '1' && ch <= '8') { const k = +ch; n += k; for (let i = 0; i < k; i++) row.push(null); }
      else { n += 1; row.push(ch); }
    }
    if (n !== 8) { out.err = 'rank-width'; return out; }
    grid.push(row);
  }

  // 2. exactly one king each
  const all = p[0].replace(/[^pnbrqkPNBRQK]/g, '');
  const c = (ch) => (all.split(ch).length - 1);
  if (c('K') !== 1) { out.err = 'white-kings'; return out; }
  if (c('k') !== 1) { out.err = 'black-kings'; return out; }

  // 3. no pawns on the first or eighth rank
  if (/[pP]/.test(ranks[0]) || /[pP]/.test(ranks[7])) { out.err = 'pawn-on-back-rank'; return out; }

  // 4. piece counts, promotion-aware: every piece beyond the starting complement has to be paid for by a
  //    pawn that is no longer on the board.
  for (const side of ['w', 'b']) {
    const u = (ch) => (side === 'w' ? ch.toUpperCase() : ch.toLowerCase());
    const P = c(u('p')), N = c(u('n')), B = c(u('b')), R = c(u('r')), Q = c(u('q'));
    if (P > 8) { out.err = side + '-pawns'; return out; }
    if (P + N + B + R + Q + 1 > 16) { out.err = side + '-total'; return out; }
    const extra = Math.max(0, N - 2) + Math.max(0, B - 2) + Math.max(0, R - 2) + Math.max(0, Q - 1);
    if (extra > 8 - P) { out.err = side + '-promotions'; return out; }
  }

  // 5. the two kings may not be adjacent - cheap, and it catches a real misread class (two pieces on
  //    neighbouring squares both read as kings)
  let wk = null, bk = null;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    if (grid[r][f] === 'K') wk = [r, f];
    if (grid[r][f] === 'k') bk = [r, f];
  }
  if (Math.abs(wk[0] - bk[0]) <= 1 && Math.abs(wk[1] - bk[1]) <= 1) { out.err = 'kings-adjacent'; return out; }

  // ── from here the board is sound; the tail fields are REPAIRED, not rejected ──
  const turn = (p[1] === 'b') ? 'b' : 'w';
  if (p[1] !== 'w' && p[1] !== 'b') out.repaired.push('side-to-move->w');

  // 6. castling rights the position can actually support
  const at = (sq) => grid[8 - (+sq[1])][FILES.indexOf(sq[0])];
  let cas = '';
  const given = (p.length >= 3);
  const want = given ? (p[2] === '-' ? '' : p[2]) : 'KQkq';
  if (want.includes('K') && at('e1') === 'K' && at('h1') === 'R') cas += 'K';
  if (want.includes('Q') && at('e1') === 'K' && at('a1') === 'R') cas += 'Q';
  if (want.includes('k') && at('e8') === 'k' && at('h8') === 'r') cas += 'k';
  if (want.includes('q') && at('e8') === 'k' && at('a8') === 'r') cas += 'q';
  // #405 DEVIATION FROM THE SPEC'S LISTING, and the gate is what found it. The listing recorded a castling
  // repair only when the result DIFFERED from what was wanted, so INFERENCE THAT HAPPENED TO PRODUCE FULL
  // RIGHTS WAS SILENT: a photograph of the opening position came back `KQkq` with an empty `repaired` list,
  // indistinguishable from a model that had been asked for rights and observed them. That defeats the purpose
  // of the field. `repaired` is the record of what this function DID, and inferring four castling rights from
  // a board is the largest single thing it does - the spec's own note calls it "a sub-call inside check 6 that
  // I want visible". So an inferred field is ALWAYS recorded; an explicitly GIVEN field is still recorded only
  // when it was narrowed, because there is nothing to report when the model's answer survived intact.
  // Found by gates/regress/27-scan-fen.js TC-BS-004r going red on the spec's own fixture - the assertion asks
  // for the exact repair list rather than for "some repair", which is why it could see this at all.
  if (!given) out.repaired.push('castling-inferred->' + (cas || '-'));
  else if (cas !== want.replace(/[^KQkq]/g, '')) out.repaired.push('castling->' + (cas || '-'));

  // 7. en passant must sit on the rank the side to move can capture onto, with the pawn that just moved
  //    actually standing beside it, and the square itself empty
  let ep = '-';
  const wep = p[3] || '-';
  if (/^[a-h][36]$/.test(wep)) {
    const rank = wep[1];
    const pawnSq = (turn === 'w') ? (wep[0] + '5') : (wep[0] + '4');
    if (((turn === 'w' && rank === '6') || (turn === 'b' && rank === '3')) &&
        at(wep) === null && at(pawnSq) === (turn === 'w' ? 'p' : 'P')) ep = wep;
  }
  if (ep !== (wep === '-' ? '-' : wep)) out.repaired.push('ep->-');

  const half = /^\d+$/.test(p[4] || '') ? p[4] : '0';
  const full = /^[1-9]\d*$/.test(p[5] || '') ? p[5] : '1';
  if (half !== p[4]) out.repaired.push('halfmove->0');
  if (full !== p[5]) out.repaired.push('fullmove->1');

  out.ok = true;
  out.fen = [p[0], turn, cas || '-', ep, half, full].join(' ');
  return out;
}

module.exports = {fenCheck, FILES};
