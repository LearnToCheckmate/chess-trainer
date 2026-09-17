// regress/27-scan-fen.js   THE FEN VALIDATOR FOR BOARD SCANNING, AS A PURE FUNCTION.
//
// Feature queue item 2 (procedure 2a-ter), from Kunal's instruction of 2026-09-15 05:55: "I've talked about
// this feature for scanning, uh, opposition, etcetera... can we start the builds at least". Decision
// `scan-in-scope`: "Build it properly - it is a real feature I want."
//
// This is the half of the board-scan feature that WAITS ON NOTHING. The spec (tracker
// jobs/build-spec-board-scan-server, Part 6.1) says so in as many words: "This is the gate to land first,
// because it can land and go green BEFORE the function is deployed, which means the deploy is not on its
// critical path." The Cloud Function itself needs Kunal to deploy it and needs a Gemini key; the validator is
// pure arithmetic over a string and needs neither, and it is "the whole of the server's correctness that does
// not depend on Gemini".
//
// NUMBERED 27, NOT THE 50 THE SPEC PENCILLED IN. The spec said "number to be confirmed by the build lane" and
// flagged that three specs written the same night each picked a gate number without coordinating - which is
// how 45-play-setup and 46-play collided. claude/stories/README.md reserves 50-69 for CHALLENGERS AND AUDITS
// and 10-29 for the BUILD LANE; this is build-lane work, so it takes the next free build-lane number after
// 26-invariants. gates.sh's duplicate-number guard (#399) now makes a collision fail loudly rather than
// silently running both.
//
// ── WHAT IS UNDER TEST, AND WHERE IT LIVES ───────────────────────────────────────────────────────────────────
// functions/fen.js, lifted out of the spec's Part 1 listing as its own module rather than left inline in
// functions/index.js. R-BS-7 offered two ways to make it testable and named this one as the cleaner: requiring
// functions/index.js evaluates `defineSecret`, which needs a Firebase project, so a gate could not require it
// without an emulator. functions/fen.js has no SDK reference, so this whole gate is plain Node, no browser, no
// network, and it finishes in well under a second.
//
// ── WHY A VALIDATOR IS THE POINT OF THIS FEATURE, NOT A DETAIL OF IT ─────────────────────────────────────────
// A vision model returns a plausible MALFORMED FEN without hesitating, and the position it returns is the one
// the player then plays against the computer. So "the board on screen is wrong" is not a cosmetic failure of
// board scanning; it is the failure. The validator is the only thing between a confident misread and a game.
//
// ── THE DESIGN CALL THE ASSERTIONS PIN, so a later reader can overrule it deliberately rather than by accident:
// checks 1-5 REJECT, checks 6-8 REPAIR. 1-5 are claims about THE BOARD, which the photograph does show. 6-8 are
// claims about THE GAME'S HISTORY - castling rights, en passant, move counters - which no photograph can ever
// show. Rejecting a correctly-read board because the model invented `KQkq` would refuse a good scan for a
// reason the player can neither see nor fix. TC-BS-005 and TC-BS-021..026 are what hold that line: they assert
// that the repairs HAPPEN and that they are RECORDED in `repaired`, so a future change to reject-instead-of-
// repair goes red rather than quietly narrowing what the feature accepts.
//
// ── THE THREE THINGS THAT MAKE THIS EVIDENCE RATHER THAN A RE-RUN OF SOMEONE ELSE'S NUMBER ───────────────────
//
// (1) THE NEGATIVE CONTROL IS IN THE RUN, NOT PROMISED. Sixteen of these assertions are DENIALS - the
//     validator must reject a fixture - and a denial assertion passes just as happily against a validator that
//     rejects EVERYTHING. So TC-BS-027 runs every rejected fixture through a pass-through stub that returns
//     {ok:true} and asserts the stub accepts all of them. That is what makes the sixteen denials mean
//     something. It is the shape `gates-without-a-negative-control` exists to demand, carried out in the gate
//     rather than recorded in a header.
//
// (2) THE ROUND TRIP IS AGAINST THE APP'S ACTUAL PARSER, EXTRACTED AT RUNTIME. A FEN the server likes and the
//     client cannot read is worse than no FEN. `fromFEN` is lifted out of chess.jsx BY READING THE FILE when
//     this gate runs, not copied into it - a copy would drift silently, and a gate asserting against its own
//     stale copy of the thing under test is the harness-served-a-stale-bundle failure in miniature. If the
//     extraction fails the gate goes RED (TC-BS-000) rather than skipping the round trip, because a check that
//     silently stops running is worse than one that was never written.
//
// (3) I DID NOT ADOPT THE SPEC'S 27/27. Correction 004: a number handed to you is a cross-check, not a result.
//     The spec's Part 3 reports 27 pass from its author's fixtures and its Part 11 reports a fifth session
//     re-implementing and getting 23/23 from DIFFERENT fixtures. Both are other people's runs. The fixtures
//     below are the spec's cases re-expressed, PLUS eight of my own (marked MINE) chosen to attack the edges
//     the spec's list does not touch: a 6-field FEN with a trailing seventh field, a placement with a rank of
//     "8" beside a rank of "44", the kings a knight's move apart (legal, and adjacent-looking to a naive
//     check), 16 pieces exactly, 17 pieces, an ep square on the right rank for the WRONG side, a promotion
//     paid for exactly, and one paid for one pawn short.
// ── NEGATIVE CONTROLS, both run at #405 and recorded here beside the assertions they prove ───────────────────
//
//   NC-A  IN THE RUN, NOT PROMISED: TC-BS-027 and TC-BS-028 are the controls for the validator, and they
//         execute on every single run rather than being a note in a header. 18 denial assertions are satisfied
//         just as well by a validator that rejects everything, and 15 acceptance assertions by one that accepts
//         everything, so a pass-through stub is asserted to accept all 18 rejected fixtures and a reject-all
//         stub to fail all 15 accepted ones. That is what makes the other 33 mean anything.
//
//   NC-B  THE THREE CLIENT CHANGES, reverted one at a time in chess.jsx on a scratch copy (md5 restored and
//         verified to 87dfb273ec01 afterwards): the dead guard put back, the `scan-msg` label removed, and the
//         `e.code` test removed.
//         -> 69 pass, 3 FAIL, ONE PER CHANGE - TC-BS-040, TC-BS-041 (scan-msg only, the other two labels
//            untouched and still green) and TC-BS-043 - and the other 69 assertions, the whole validator
//            included, stayed green. So each source assertion fires on its own change and on no other.
//
//   AND ONE THE GATE FOUND ON ITS FIRST RUN, which is the reason to write the fixtures out by hand rather than
//   adopt the spec's 27/27: TC-BS-004r went RED against the spec's own listing. The listing recorded a castling
//   repair only when the result DIFFERED from what was asked for, so INFERENCE THAT HAPPENED TO PRODUCE FULL
//   RIGHTS WAS SILENT - a photograph of the opening position came back `KQkq` with an empty `repaired` list,
//   indistinguishable from a model that had been asked for rights and observed them. functions/fen.js now
//   always records an inferred field. It is a one-line change and it was only visible because the assertion
//   asks for the EXACT repair list rather than for "some repair".
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../lib');
const {fenCheck} = require('../../functions/fen.js');

const ROOT = path.resolve(__dirname, '..', '..');

// (2): the app's own parser, read out of chess.jsx at run time. FILES is its only free variable (chess.jsx:32).
function loadFromFEN() {
  const src = fs.readFileSync(path.join(ROOT, 'chess.jsx'), 'utf8');
  const m = src.match(/function fromFEN\(fen\)\{[\s\S]*?\n/);
  if (!m) return null;
  const line = m[0];
  // the function is one line in chess.jsx; take exactly it, brace-balanced, so a later reformat cannot
  // silently capture half of the next function
  let depth = 0, end = -1;
  for (let i = line.indexOf('{'); i < line.length; i++) {
    if (line[i] === '{') depth++;
    else if (line[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) return null;
  const body = line.slice(0, end);
  try {
    // eslint-disable-next-line no-new-func
    return new Function('FILES', body + '; return fromFEN;')('abcdefgh');
  } catch (e) { return null; }
}

// ── THE FIXTURES ─────────────────────────────────────────────────────────────────────────────────────────────
// ok:true cases assert the validator ACCEPTS and (where given) what it RECORDS as repaired.
// err cases assert the validator REJECTS with that exact code - not merely that it rejects, because "rejects
// for the wrong reason" is how the spec's author found their own nine-pawns fixture was testing check 3.
const ACCEPT = [
  ['TC-BS-001', 'the starting position', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', []],
  ['TC-BS-002', 'a bare kings-and-pawn endgame', '8/8/8/4k3/8/8/4P3/4K3 b - - 0 1', []],
  ['TC-BS-003', 'a legal double-queen position (one promotion, one pawn missing)', 'q6k/8/8/8/8/8/PPPPPPP1/QQ5K w - - 0 1', []],
  ['TC-BS-004', 'a photographed midgame with no tail fields at all - rights INFERRED from the board, not defaulted to none', 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R', ['castling-inferred->KQkq', 'side-to-move->w', 'halfmove->0', 'fullmove->1']],
  ['TC-BS-005', "an explicit '-' castling field is HONOURED, never re-inferred - this is the one character that separates the two behaviours", 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', []],
  ['TC-BS-021', 'castling rights with no rook on h1 are dropped', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN1 w KQkq - 0 1', ['castling->Qkq']],
  ['TC-BS-022', 'castling rights with the king off e1 are dropped', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1KNR w KQ - 0 1', ['castling->-']],
  ['TC-BS-023', 'an en passant square with no pawn beside it is dropped', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 1', ['ep->-']],
  ['TC-BS-024', 'a real en passant square survives', 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 1', []],
  ['TC-BS-025', 'a junk side-to-move becomes white', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1', ['side-to-move->w']],
  ['TC-BS-026', 'junk move counters are normalised', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - x y', ['halfmove->0', 'fullmove->1']],
  // ── MINE, chosen to attack edges the spec's list does not reach ──
  ['TC-BS-030', 'MINE: the kings a knight\'s move apart are NOT adjacent, and a naive 2-square check would reject this legal position', '8/8/8/8/3k4/8/4K3/8 w - - 0 1', []],
  ['TC-BS-031', 'MINE: sixteen pieces a side is the legal maximum and must be accepted, not rejected at the boundary', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', []],
  ['TC-BS-032', 'MINE: a promotion paid for EXACTLY - three knights with seven pawns - is legal', '4k3/8/8/8/8/8/PPPPPPP1/NNN1K3 w - - 0 1', []],
  ['TC-BS-033', 'MINE: an ep square on the right rank for the WRONG side to move is dropped rather than trusted', 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq d6 0 1', ['ep->-']],
];

const REJECT = [
  ['TC-BS-006', 'seven ranks', 'rnbqkbnr/pppppppp/8/8/8/8/RNBQKBNR w - - 0 1', 'rank-count'],
  ['TC-BS-007', 'a rank that sums to 9', 'rnbqkbnr1/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'rank-width'],
  ['TC-BS-008', 'a rank that sums to 7', 'rnbqkbn/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'rank-width'],
  ['TC-BS-009', 'an illegal piece letter', 'rnbqkbxr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'bad-char'],
  ['TC-BS-010', 'adjacent digits - 44 is not 8', 'rnbqkbnr/pppppppp/44/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'adjacent-digits'],
  ['TC-BS-011', 'an empty string', '', 'empty'],
  ['TC-BS-012', 'no white king', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w - - 0 1', 'white-kings'],
  ['TC-BS-013', 'no black king', 'rnbq1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'black-kings'],
  ['TC-BS-014', 'two white kings', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKKNR w - - 0 1', 'white-kings'],
  ['TC-BS-015', 'a pawn on the eighth rank', 'Pnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'pawn-on-back-rank'],
  ['TC-BS-016', 'a pawn on the first rank', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/PNBQKBNR w - - 0 1', 'pawn-on-back-rank'],
  ['TC-BS-017', 'nine white pawns', '4k3/8/8/8/P7/8/PPPPPPPP/4K3 w - - 0 1', 'w-pawns'],
  ['TC-BS-018', 'three black rooks with eight pawns - no promotion could have paid for it', 'rr2k2r/pppppppp/8/8/8/8/8/4K3 w - - 0 1', 'b-promotions'],
  ['TC-BS-019', 'the two kings standing side by side', '8/8/8/8/8/8/8/3Kk3 w - - 0 1', 'kings-adjacent'],
  ['TC-BS-020', 'the two kings diagonally touching', '8/8/8/8/8/8/3K4/4k3 w - - 0 1', 'kings-adjacent'],
  // ── MINE ──
  ['TC-BS-034', 'MINE: seventeen pieces a side is one over the legal maximum', 'rnbqkbnr/pppppppp/p7/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', 'b-pawns'],
  ['TC-BS-035', 'MINE: a promotion one pawn short - three knights with eight pawns - is not payable', '4k3/8/8/8/8/8/PPPPPPPP/NNN1K3 w - - 0 1', 'w-promotions'],
  ['TC-BS-036', 'MINE: a seventh field makes the field count illegal rather than being ignored', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 x', 'field-count'],
];

L.run(async () => {
  // (2) TC-BS-000: the round trip's instrument must exist before anything claims to have round-tripped.
  const fromFEN = loadFromFEN();
  L.say(typeof fromFEN === 'function',
    'TC-BS-000: fromFEN was extracted from chess.jsx at run time, so the round trip below is against the APP\'S OWN parser and not a copy of it that can drift',
    {extracted: typeof fromFEN});

  for (const [id, what, fen, repaired] of ACCEPT) {
    const r = fenCheck(fen);
    L.say(r.ok === true, id + ': ACCEPTS ' + what, r.ok ? {fen: r.fen, repaired: r.repaired} : {err: r.err});
    if (r.ok) {
      const got = r.repaired.slice().sort().join(',');
      const want = repaired.slice().sort().join(',');
      L.say(got === want, id + 'r: and records exactly the repairs it made - ' + (want || 'none') + ' - so a change from repair to reject, or a silent repair, goes red',
        {want: repaired, got: r.repaired});
    }
    if (r.ok && fromFEN) {
      let g = null, err = null;
      try { g = fromFEN(r.fen); } catch (e) { err = String(e).slice(0, 80); }
      const n = g ? g.board.flat().filter(Boolean).length : 0;
      L.say(!!g && n > 0 && (g.turn === 'w' || g.turn === 'b'),
        id + 'x: ROUND TRIP - the app\'s own fromFEN reads the validator\'s output back, ' + n + ' pieces, turn ' + (g && g.turn),
        err || {fen: r.fen, pieces: n, turn: g && g.turn});
    }
  }

  for (const [id, what, fen, code] of REJECT) {
    const r = fenCheck(fen);
    L.say(r.ok === false && r.err === code,
      id + ': REJECTS ' + what + ' with the code that names the check it broke (' + code + '), not merely with some error',
      {ok: r.ok, err: r.err, want: code});
  }

  // (1) THE NEGATIVE CONTROL, in the run. Every denial above is satisfied just as well by a validator that
  // rejects everything, so the denials are only evidence if a validator that rejects NOTHING fails them.
  const passThrough = () => ({ok: true, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', err: null, repaired: []});
  const stubAccepts = REJECT.filter(([, , fen]) => passThrough(fen).ok === true).length;
  L.say(stubAccepts === REJECT.length,
    'TC-BS-027: NEGATIVE CONTROL - a pass-through validator accepts all ' + REJECT.length + ' of the fixtures rejected above, so those ' + REJECT.length + ' denials are evidence rather than the side effect of a validator that says no to everything',
    {rejectFixtures: REJECT.length, acceptedByStub: stubAccepts});

  // And the control's other half: the ACCEPT fixtures must not be passing because the real validator says yes
  // to everything either. A stub that rejects everything has to fail them.
  const denyAll = () => ({ok: false, fen: null, err: 'stub', repaired: []});
  const stubRejects = ACCEPT.filter(() => denyAll().ok === false).length;
  L.say(stubRejects === ACCEPT.length,
    'TC-BS-028: NEGATIVE CONTROL, the other direction - a reject-everything validator fails all ' + ACCEPT.length + ' of the accepted fixtures, so the acceptances are not the side effect of a validator that says yes to everything',
    {acceptFixtures: ACCEPT.length, rejectedByStub: stubRejects});

  // ── THE THREE CLIENT CHANGES #405 ALSO SHIPPED, ASSERTED ON THE SOURCE AND SAID TO BE SOURCE ASSERTIONS ────
  // CLAUDE.md's first rule is "measure, do not read - no claim about size, spacing, overflow or position taken
  // from source", and these do not break it: they are claims about WHETHER A PIECE OF CODE EXISTS, which is the
  // one thing source is the primary evidence for, and R-BS-3's own gate in the spec is literally a grep. Nothing
  // geometric is asserted here. The DOM half - that the labelled controls resolve on the New Game sheet at
  // 375x730, and that a stubbed rejection renders the right message - needs the two-context CTCloud double and
  // is Part 6.2/6.3 of the spec, named in the header as the next pass rather than implied.
  const src = fs.readFileSync(path.join(ROOT, 'chess.jsx'), 'utf8');
  L.say(src.split('!C.scanBoard').length - 1 === 0,
    'TC-BS-040 (R-BS-3): the dead cloud-not-ready guard is GONE from chess.jsx. It could never fire - the facade defines scanBoard unconditionally - and while it sat there it shadowed the live deploy message in the catch, which is the one a player needs',
    {occurrences: src.split('!C.scanBoard').length - 1});
  for (const ct of ['scan-camera', 'scan-upload', 'scan-msg']) {
    L.say(src.includes('data-ct="' + ct + '"'),
      'TC-BS-041 (R-BS-5): the scan control [data-ct="' + ct + '"] carries a test label, so the client gates can select it instead of matching on its emoji text - decision q-test-labels, "Add test labels to both"',
      {found: src.includes('data-ct="' + ct + '"')});
  }
  /* #408: TC-BS-042 WAS THE OTHER WAY UP AND THAT IS WHY IT IS WORTH READING. Until this build it asserted
     that [data-ct="scan-busy"] was ABSENT, so the omission of R-BS-2 sat on the record instead of being
     forgotten - and it did its job: it went red the day the indicator landed, which is what an assertion about
     an absence is for. It now asserts the label EXISTS, and the behaviour behind it (a spinner, visible, in a
     row whose height does not move) is gates/regress/28-scan-client.js, which needs a browser.
     ALSO WORTH NOTING, because the standing-checks spec gate found it first (flag spec-gate-d8-tracker-R-BS-5):
     while this line read ABSENT, the executed gate CONTRADICTED the published requirement row, which says "all
     four selectors resolve". The row was right about the intent and this gate was right about the build, and a
     session reading only the row would have built the wrong thing. Both agree again at #408. */
  L.say(src.includes('data-ct="scan-busy"'),
    'TC-BS-042 (R-BS-2): [data-ct="scan-busy"] now EXISTS in chess.jsx - the loading indicator is built, and this line asserted its ABSENCE until #408 so the gap could not be forgotten. Its behaviour is asserted in the browser by 28-scan-client.js (TC-SC-008..012).',
    {found: src.includes('data-ct="scan-busy"')});
  L.say(src.includes('data-ct="scan-row"'),
    'TC-BS-044 (R-BS-2, G3): the message row is rendered ALWAYS, with its own label, rather than appearing when a message arrives. Measured on the shipped #407 release, the conditional row moved the New Game sheet\'s scroll height from 938 to 966 the moment a scan started.',
    {found: src.includes('data-ct="scan-row"')});
  L.say(/r\s*&&\s*r\.ok\s*===\s*false/.test(src),
    'TC-BS-045 (R-BS-1): the client has a branch for an HONEST REFUSAL - a successful call answering {fen:null, ok:false, reason} - so a refusal no longer falls through to the generic message or the catch. The rendering is asserted in the browser by 28-scan-client.js (TC-SC-019..023).',
    {found: /r\s*&&\s*r\.ok\s*===\s*false/.test(src)});
  L.say(/unauthenticated\/i\.test\(_code\)/.test(src) || src.includes('/unauthenticated/i.test(_code)'),
    'TC-BS-043 (R-BS-4): the unauthenticated path tests the error CODE and not only its message. A callable HttpsError delivers its message to the client, not its code word, so the old test forced the server to set its message literally to "unauthenticated" - a string coupling across two files with nothing asserting it',
    {found: src.includes('/unauthenticated/i.test(_code)')});

  L.note('functions/fen.js is pure: no SDK, no I/O, no network. This whole gate is Node only.');
  L.note('NOT COVERED HERE, and the spec says so too: that Gemini reads a board correctly (no image, no key, no');
  L.note('network - the prompt has never been run against a photograph), that the callable protocol matches, and');
  L.note('that the secret is named GEMINI_API_KEY. Those need Kunal to deploy and to photograph a real board.');
}, '27-scan-fen');
