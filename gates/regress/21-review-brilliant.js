// regress/21-review-brilliant.js  TC-R10 (US-R06): a brilliancy is explained by what the sacrifice buys, and the
// play-out button animates the line. Port of bril357gate's live half + why354. Opera Game, 10.Nxb5!! (ply 19).
// The sentence must name the follow-up (a forcing move such as Bxb5+ / "If cxb5"); the play-out must move a piece.
// #356: one engine trap is allowed BY EXACT TEXT ("RuntimeError: unreachable") and nothing else.
//
// #388, uat-ext-2026-09-14 - WHY THIS GATE NOW PINS THE WHOLE SENTENCE.
// An external challenger applied the designed negative control to this gate and it stayed GREEN at 7 of 7
// against a build whose brilliancy explanation had DEMONSTRABLY CHANGED: from
//     "Nothing else came close: Bxf6 was 1.1 pawns worse."   to   "Bxf6 was the only other try, 1.1 worse."
// The assertion that was supposed to catch that read /Nothing else came close|worse|next best|instead/i, and the
// bare word "worse" appears in EVERY branch of dropTxt() (chess.jsx:667-673). A regex that matches every branch
// pins nothing, and this is the ONLY gate covering brilliancy explanations - the item Kunal raised five times -
// so every green it had ever reported was worth less than it looked.
//
// Three things changed, and they are three different kinds of assertion on purpose:
//   1. THE PIN. The whole sentence is compared to the one measured on #387, verbatim. All four clause builders
//      (_give, refTxt, cmpTxt, standing in explainAnno) are then pinned separately so a red says WHICH clause moved.
//   2. THE BRANCH/VALUE CHECK. The comparison clause must match exactly ONE dropTxt template, and the number it
//      prints must lie in the band that template is printed for. The challenger's break puts a 1.1 inside the
//      0.35-0.99 wording, so this fires even if the pin is ever loosened.
//   3. THE CROSS-CHECK. "White is winning here" is a WORD for a quantity the coach chip shows as a NUMBER eight
//      pixels away. #385 shipped a chip reading +0.0 beside a bar reading +5.9 because nothing compared them.
//      NOTE THE COUPLING THIS CREATES, deliberately: assertions here now read the COACH BUBBLE's chip and
//      sentence (data-ct coach-eval / coach-say, shipped #385). If the bubble is ever removed or its guard
//      changes, three assertions in THIS gate go red for a reason that has nothing to do with brilliancies.
//      That is the right trade - a cross-check has to read something else on the screen to be a cross-check -
//      but whoever changes the bubble should expect to move these three lines with it, not delete them.
'use strict';
const L=require('../lib');
const PGN='[White "Morphy"] [Black "Duke Karl / Count Isouard"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
// measured on #387 (ae5ebbc4497645dd19a7215a0402010e) at 375x679, ct_pool 3, ply 19, twice with the same result
const WANT='You give up a piece. If cxb5, Bxb5+ and White is winning. Nothing else came close: Bxf6 was 1.1 pawns worse. White is winning here.';
const SAN='(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?';
// the four forms of dropTxt(), chess.jsx:667-673, with the drop band each one is printed for
const FORMS=[
  {k:'throws-the-win-away',re:new RegExp('(?:^|[.] )('+SAN+'), the next best, throws the win away\\.'),band:null},
  {k:'nothing-came-close', re:new RegExp('(?:^|[.] )Nothing else came close: ('+SAN+') was (\\d+\\.\\d) pawns worse\\.'),band:[1.0,89.99]},
  {k:'only-other-try',     re:new RegExp('(?:^|[.] )('+SAN+') was the only other try, (\\d+\\.\\d) worse\\.'),band:[0.35,0.99]},
  {k:'as-good-on-paper',   re:new RegExp('(?:^|[.] )('+SAN+') was as good on paper, but nothing like as forcing\\.'),band:null},
];
// the five forms of `standing`, chess.jsx:727
const STAND=/(?:White|Black) is (?:winning|losing) here\.$|(?:White|Black) is clearly (?:better|worse)\.$|The position stays roughly level\.$/;
const gridSig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'review-brilliant',store:{ct_pool:'3'}});await b.open();
  await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000});await b.settle(600);
  await b.tapText(/^Start review/,{wait:900});
  for(let i=0;i<19;i++){await b.page.locator('[aria-label="Next move"], [title="Next move"]').first().click({timeout:5000});await b.page.waitForTimeout(140);}await b.settle(1500);
  const ml=await b.rect('[data-ct="rev-move-line"]');L.say(!!ml&&/Nxb5/.test(ml.text),'at 10.Nxb5',ml&&ml.text);
  const txt=(await b.text('[data-ct="rev-why-txt"]'))||(await b.text('[data-ct="rev-why"]'))||'';
  L.note('reason: '+txt.slice(0,200));
  L.say(/give|sacrific|gives up/i.test(txt),'TC-R10 the reason says what was given up');
  L.say(/If cxb5|Bxb5\+|cxb5/.test(txt),'TC-R10 the reason names the forcing follow-up (cxb5 / Bxb5+)');
  L.say(/Nothing else came close|worse|next best|instead/i.test(txt),'TC-R10 the reason compares with the next-best move');

  // ── 1. THE PIN, and the four clauses separately so a red names the one that moved ────────────────
  L.say(txt===WANT,'TC-R10 PINNED the brilliancy sentence is EXACTLY the one measured on #387',{want:WANT,got:txt});
  L.say(/^You give up (?:the queen|a rook|a piece|a pawn|material)(?:\.|, and )/.test(txt),'TC-R10 clause 1 matches the _give template verbatim',txt.slice(0,44));
  L.say(/^You give up a piece\./.test(txt),'TC-R10 clause 1 PINNED to "a piece" - Nxb5 gives up a knight',txt.slice(0,24));
  L.say(/(?:^|[.] )If cxb5, Bxb5\+(?:[^.]*)?\./.test(txt),'TC-R10 clause 2 is the refutation template "If <capture>, <reply>."');
  L.say(STAND.test(txt),'TC-R10 clause 4 matches a `standing` template verbatim and closes the sentence','...'+txt.slice(-34));

  // ── 2. EXACTLY ONE dropTxt template, and its NUMBER inside that template's own band ──────────────
  const hit=FORMS.filter(f=>f.re.test(txt));
  L.say(hit.length===1,'TC-R10 the comparison clause matches EXACTLY ONE dropTxt template',{matched:hit.map(f=>f.k),n:hit.length});
  const F=hit.length===1?hit[0]:null, m=F?txt.match(F.re):null;
  L.say(!!m&&!!m[1],'TC-R10 the comparison clause yielded a move to read',{form:F&&F.k,clause:m&&m[0]});
  L.say(F?F.k==='nothing-came-close':false,'TC-R10 PINNED the branch is "Nothing else came close" - the gap at 10.Nxb5 is over a pawn',F&&F.k);
  const bandOk=(()=>{if(!F||!m)return false;if(!F.band)return !/\d+\.\d/.test(m[0]);const d=parseFloat(m[2]);return d>=F.band[0]&&d<=F.band[1];})();
  L.say(bandOk,'TC-R10 the drop VALUE lies in the band its own wording is printed for (a 1.1 cannot wear the 0.35-0.99 sentence)',{form:F&&F.k,clause:m&&m[0]});
  const altSan=m?m[1]:null;
  L.say(!!altSan&&altSan!=='Nxb5','TC-R10 the comparison names a move OTHER than the one played',{alt:altSan,played:'Nxb5'});
  L.say(altSan==='Bxf6','TC-R10 PINNED the next-best move is Bxf6',altSan);
  L.say(!!m&&parseFloat(m[2])===1.1,'TC-R10 PINNED the gap is 1.1 pawns',m&&m[2]);

  // ── 3. THE WORD AGAINST THE NUMBER, on the same screen, before anything is tapped ────────────────
  const say=await b.text('[data-ct="coach-say"]');
  L.say(!!say&&say.length>20,'TC-R10 the coach bubble is on screen with a sentence in it (non-empty companion)',say&&say.slice(0,40));
  L.say(say===txt,'TC-R10 the coach bubble and the why panel show the SAME sentence',{bubble:say&&say.slice(0,60),panel:txt.slice(0,60)});
  const chip=await b.text('[data-ct="coach-eval"]');
  const cN=(chip==='mate')?99:((chip==='-mate')?-99:(/^[+-]?\d+\.\d$/.test(String(chip))?parseFloat(chip):null));
  L.say(cN!==null,'TC-R10 the coach chip shows a readable evaluation to cross-check the words against',chip);
  const saysWinning=/White is winning here\.$/.test(txt);
  L.say(saysWinning,'TC-R10 PINNED the standing clause reads "White is winning here."','...'+txt.slice(-26));
  L.say(cN!==null&&saysWinning&&cN>=3,'TC-R10 the VERDICT WORD agrees with the eval NUMBER beside it (>= +3.0 for "is winning")',{chip:chip,n:cN,words:txt.slice(-26)});

  const po=await b.rect('[data-ct="rev-playout"]');L.say(!!po,'TC-R10 the play-out (why) button exists on the brilliancy');
  const s0=await gridSig(b);await b.tapCt('rev-playout',400);let moved=false;for(let i=0;i<12;i++){await b.settle(350);if((await gridSig(b))!==s0){moved=true;break;}}
  L.say(moved,'TC-R10 the play-out moves a piece within ~4 s');
  await b.settle(3000);await b.shot('review-brilliant-playout');
  const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
  L.say(bad.length===0,'TC-R10 no app error beyond the one allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
  await b.close();
},'REVIEW-BRILLIANT');
