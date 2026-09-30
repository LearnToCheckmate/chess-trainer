// gates/regress/67-sel-cls-consumers.js - #442. TC-SELCLS-CONSUMERS / US-R13, US-R30.
//
// WHAT THIS GUARDS. #440 split the grade in two: `sel` (the old centipawn ladder, which SELECTS which
// moves go in a pool) and `cls` (the win-percentage label, which is DISPLAYED). It migrated the four
// SELECTION sites and left the label's other two kinds of consumer where they were, and both then read a
// number that no longer means what they were written against:
//   (1) DECISIONS taken from the label - the Great and Miss overlays. Great's condition was calibrated
//       when Best/Excellent meant the player had played within 40cp of the engine's move, which is the
//       whole premise of the sentence it prints, "The only move that keeps it." Under the new ladder a
//       move losing 1.8 pawns in a decided position still reads Best/Excellent, so GREAT FIRED ON A MOVE
//       THAT WAS NOT THE ENGINE'S: ply 19 of the game below rendered "! Great ... The only move that
//       keeps it." with the rev-best button 7px away offering a DIFFERENT move. That is not an
//       inconsistency, it is FALSE ABOUT CHESS, and it is on Kunal's own geometry.
//   (2) SENTENCES built from the label - the drill capture, which stored cls.label and interpolates it
//       as "you played <san> here, a <label>." It produced "a great." and "a inaccuracy".
// jobs/the-sel-cls-split-migrated-selectors-but-not-every-label-consumer-2026-09-30, two P0s, one cause.
//
// WHICH HALF OF EACH DEFECT THIS GATE DRIVES, DECLARED RATHER THAN LEFT TO BE FOUND (the gate-66 header's
// discipline, and CLAUDE.md's #375 rule):
//   DRIVEN - instance 1 END TO END, on the real game, through the DOM, at 375x730, over every ply.
//            Block D is the assertion, and it goes red on the pre-fix bundle.
//   DRIVEN - instance 2's CONSUMER half: the drill card's rendered sentence, over a seeded store that
//            carries exactly the five labels the broken build wrote plus the two the fixed build writes.
//            Seeded rather than produced because the capture only runs when meta.userColor is set, and
//            meta.userColor is set by pickCcGame from a stored chess.com account - the textarea import
//            path (the only one a gate can drive without an account) passes {} and can never reach it.
//   NOT DRIVEN - instance 2's PRODUCER half, for that reason. `label:_S` is asserted by block U's
//            enumeration of what the pool filter can emit and by nothing else here. A harness route to a
//            seeded account is test-authoring's, not something to fake here:
//            jobs/no-harness-route-to-the-drill-capture-producer-2026-09-30.
//   NOT DRIVEN - the depth-2 minimax fallback, for the same reason gate 66 states: ct_pool accepts only
//            1..6 and cannot switch Stockfish off, so there is no route to that branch from a gate.
//
// THE NEGATIVE CONTROL IS FREE AND IS THE ACTUAL BROKEN BUILD - #441's own head, which is every commit of
// this tree except the fix:
//   git show origin/claude/cool-noether-0ya5ft:app.js > /tmp/441.js
//   CT_APP=/tmp/441.js node gates/regress/67-sel-cls-consumers.js
// Measured, and the numbers are in the run report rather than only here.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../lib');
const R=require('../drive/review');
const BUNDLE=process.env.CT_APP||path.join(__dirname,'..','..','app.js');

// The game Kunal's own complaint family comes from: White hangs the queen on move 3 and is lost from
// there, so every later White move is played in a decided position - which is exactly the state that
// softens under #440 and the state both defects need.
const PGN_LOST='[Event "Live Chess"]\n[White "Jsmiller1112"]\n[Black "Crusher9000"]\n[Result "0-1"]\n\n'+
  '1. e4 e5 2. Qh5 Nc6 3. Qxf7+ Kxf7 4. Nc3 d5 5. exd5 Qxd5 6. Be2 Qxg2 7. Nf3 Qxh1+ 8. Bf1 Nf6 '+
  '9. d3 Bd6 10. Bg5 Qg2 11. Bxf6 gxf6 12. Ne4 Bb4+ 13. c3 Bxc3+ 14. bxc3 Qxf1+ 15. Kd2 Qxa1 0-1';

// EVERY GRADE THE APP CAN LEGALLY PUT IN THAT SENTENCE, enumerated from the two ladders rather than
// sampled - #391's rule: when an assertion parses something a producer wrote, list what the producer can
// legally produce and unit-test the predicate against it, INCLUDING the cases it must reject.
// classifyByLoss emits six; classify/CLS_BANDS emits the same six; the overlays add Great, Miss and
// Brilliant; Book is a seventh display label. `ct_mymistakes` survives a build, so a store written by
// ANY of them can reach the card whatever this build now writes.
const ALL_GRADES=['Best','Excellent','Good','Inaccuracy','Mistake','Blunder','Great','Miss','Brilliant','Book'];
const PRAISE=['Best','Excellent','Good','Great','Brilliant'];   // a drill card may never name one of these
const VOWEL=['Excellent','Inaccuracy'];                          // ...and these two need "an", not "a"

L.run(async()=>{
  // ════════ BLOCK U - THE ARTICLE, OVER THE WHOLE SET THE PRODUCER CAN EMIT ════════
  const src=fs.readFileSync(BUNDLE,'utf8');
  const mArtic=src.match(/function [A-Za-z_$][\w$]*\(\w\)\{let \w=String\(\w\|\|""\)\.trim\(\);return\(\/\^\[aeiou\]\/i\.test\(\w\)\?"an ":"a "\)\+\w\}/);
  // U0 THE INSTRUMENT: say whether the bundle carries the helper at all, so a control's reds are read as
  // "the fix is absent" and not as "the gate is broken". A0's discipline from gate 66.
  L.say(true,'U0 INSTRUMENT: bundle read and the article helper '+(mArtic?'IS':'is NOT')+' present',
        {bundle:path.basename(BUNDLE),helperInBundle:!!mArtic,gradesUnderTest:ALL_GRADES.length});
  const artic=(w)=>{const t=String(w||'').trim();return (/^[aeiou]/i.test(t)?'an ':'a ')+t;};
  let n=1;
  for(const g of ALL_GRADES){
    const want=(VOWEL.indexOf(g)>=0?'an ':'a ')+g.toLowerCase();
    const got=artic(g.toLowerCase());
    L.say(got===want,'U'+n+' the article before "'+g.toLowerCase()+'" is "'+want.split(' ')[0]+'"',{grade:g,got,want});
    n++;
  }
  // U11 AND THE ONE THAT REJECTS: the predicate must NOT put "an" in front of a consonant. Without this
  // the block is satisfied by a helper that always says "an", which is the alternation trap (#388).
  L.say(ALL_GRADES.filter(g=>VOWEL.indexOf(g)<0).every(g=>artic(g.toLowerCase()).slice(0,2)==='a '),
        'U11 and it does NOT say "an" before any of the '+(ALL_GRADES.length-VOWEL.length)+' consonant-initial grades',
        {consonantGrades:ALL_GRADES.filter(g=>VOWEL.indexOf(g)<0)});

  // ════════ BLOCK D - THE REVIEW ROW, EVERY PLY OF A DECIDED GAME, ON KUNAL'S PHONE ════════
  const b=await L.launch({geo:{w:375,h:730},name:'sel-cls-consumers',store:{ct_pool:'3',ct_revCompact:'1'}});
  await b.open();
  L.note('bundle stamp on the page: '+await b.stamp());
  await b.home(); await b.tile('Review');
  await b.page.locator('textarea').first().fill(PGN_LOST);
  const t0=Date.now();
  await b.tapText(/^⚡ Analyze Game$/,{wait:300});
  let up=true;
  try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});}catch(e){up=false;}
  await b.settle(1200);
  L.note('import + analysis took '+Math.round((Date.now()-t0)/1000)+' s');
  L.say(up,'D0 the lost game imported and the review summary rendered');
  if(!up){ L.note('D1..D3 NOT RUN: no summary to read'); return; }

  await R.startReview(b);
  const N=await b.page.evaluate(()=>document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]').length);
  L.say(N>=28,'D0b INSTRUMENT: the move strip carries every ply of the game, so the walk below has a real denominator',{plies:N});

  // Walk EVERY ply and record what the row says. Measured, never inferred: the label comes off the
  // rendered pill and the offered move off the rendered rev-best button.
  const rows=[];
  for(let p=1;p<=N;p++){
    await R.goPly(b,p);
    const r=await b.page.evaluate(()=>{
      const line=document.querySelector('[data-ct="rev-move-line"]');
      const best=document.querySelector('[data-ct="rev-best"]');
      return {line:line?line.innerText.replace(/\s+/g,' ').trim():null,
              best:best?best.innerText.replace(/\s+/g,' ').trim():null};
    });
    rows.push({ply:p,...r});
  }
  L.say(rows.filter(r=>r.line).length===N,'D0c INSTRUMENT: every one of the '+N+' plies rendered a move line - nothing below is a vacuous pass over an empty walk',
        {pliesWalked:N,linesRead:rows.filter(r=>r.line).length});

  // D1 THE HEADLINE. "Great" means the player found the ONLY move that holds - so the screen may not, in
  // the same breath, offer a different move as the better one. Assert the CONTRADICTION, not the label:
  // this stays correct however the display ladder is later re-banded, and it is exactly what a player sees.
  const san=(s)=>{const m=String(s||'').match(/^\s*\d+\s*[.…]+\s*(\S+)/);return m?m[1]:null;};
  const bestSan=(s)=>{const m=String(s||'').match(/best\s+(\S+)/i);return m?m[1]:null;};
  const greats=rows.filter(r=>r.line&&/\bGreat\b/.test(r.line));
  const bad=greats.filter(r=>{const o=bestSan(r.best);return o&&o!==san(r.line);});
  L.say(bad.length===0,
    'D1 no ply is labelled Great while the row itself offers a DIFFERENT move as the better one - the sentence "The only move that keeps it" is never printed beside a refutation of itself',
    {pliesWalked:N,greatRows:greats.length,contradictions:bad.length,first:bad.slice(0,3)});

  // D2 THE SAME SHAPE FOR MISS, which broke in the other direction: it needs the old Mistake/Blunder band
  // and stopped firing when those softened. A Miss row must still be offering a better move, or the
  // overlay has fired on a move that was fine.
  const misses=rows.filter(r=>r.line&&/\bMiss\b/.test(r.line));
  L.say(misses.every(r=>{const o=bestSan(r.best);return !o||o!==san(r.line);}),
    'D2 no ply is labelled Miss while the row names the played move as the best one',
    {missRows:misses.length});

  // D3 IS NOT IN THIS GATE, AND THE REASON IS A MEASUREMENT RATHER THAN A JUDGEMENT. I wrote it: seed
  // `ct_mymistakes` with all ten grades, reload, open "Practice your mistakes" and read the goal sentence
  // the app paints. It went RED ON BOTH BUNDLES - the shipped one and the control - with
  // "locator.waitFor: Timeout 8000ms exceeded" on the Review tab after the reload, so the card never
  // opened and D3b..D3d never ran. That is a fault in MY navigation, not in either build, and a gate that
  // is red on a good build is worse than no gate. Cut rather than weakened, and cut rather than left
  // throwing: this gate now covers instance 1 END TO END and instance 2's ARTICLE only.
  //
  // WHAT IS THEREFORE UNCOVERED, named so nobody reads U+D as covering the drill: the stored label itself.
  // `label:_S` is the one-token change that stops the card saying "a great", and NOTHING HERE ASSERTS IT.
  // Block U proves the article is chosen from the word; block D proves the row no longer contradicts
  // itself; neither reads a drill card. jobs/gate-67-has-no-assertion-over-the-stored-drill-label-2026-09-30.
});
