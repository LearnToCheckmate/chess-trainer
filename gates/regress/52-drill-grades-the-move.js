// regress/52-drill-grades-the-move.js   TC-R147 (US-R108): the mistakes drill must GRADE the move the player
// actually made, not string-match it against the one move it stored.
//
// AUTHORED BY THE TEST-AUTHORING LANE (docs/patch-drill-accepts-one-move-only-2026-09-28) for
// jobs/drill-accepts-one-move-only, P0, raised by Kunal 2026-09-20:
//   "This is the second time that I solve this position, but last time it told me the solution that was
//    correct was moving rook to d8 from f8. Now it's telling me to move the queen in the exact same
//    position. Why are there two different suggestions, there can only be one best move."
// LANDED AT #549 item (97) with the grading it guards, rebuilt from the copy held at 67ca361 (#459); no build
// shipped it before (gates/held-trees.tsv #456/#457/#459). Cite code by IDENTIFIER: `matchesLine` and
// `gradeDrillMove` in chess.jsx, and puzzleFromMistake's `_lichessObj(g,[m.uci]`, which builds every `mine:` card
// with EXACTLY ONE solution.
//
// THE FIXTURE, AND WHY ITS EQUALITY NEEDS NO ENGINE. 6k1/5ppp/8/3q3R/8/8/5PPP/3R2K1 w: TWO WHITE ROOKS BEAR ON
// THE SAME UNDEFENDED QUEEN. d1d5 (Rdxd5) is the stored solution; h5d5 (Rhxd5) wins the identical queen on the
// identical move. g2g3 is a quiet move that leaves the queen on the board, h5h7 hangs a rook to the king, so the
// gate can tell "graded" from "accepted everything". All four are non-mating, so none passes through the
// `isMate` hatch that already accepted a different mate.
//
// WHAT CHANGED AGAINST 67ca361's COPY, AND WHY:
//   - THE ROUTE. "find the move you missed" is gone from the app; the drill is entered as gate 50 enters it
//     (tile-ic-analyze, then "Practice your mistakes"), and the verdict is read from its own data-ct, pz-msg.
//   - C7/C7b WERE "the verdict box does not clip" AND THAT CONTRADICTED KUNAL'S ANSWER
//     (contradictions/gate-52-c7b-against-kunals-fixed-reserve-and-scroll-answer-2026-10-06). Since #547 the drill
//     verdict floats over the goal card at that card's size and scrolls ("Don't change the size just allow the
//     player to scroll through the text"; float chosen on questions/drill-verdict-float-or-slot-2026-10-10). So
//     C7/C7b now assert what that design promises, the recommendation that document made: ONE full line of the
//     box's own type painted at rest, a REAL scroller wherever it overflows, and the LAST character reached after
//     actually scrolling it. C9 is the board: it must not move when a graded verdict lands (gate 50's rule, on
//     the sentences this build adds rather than gate 50's own).
//   - C5b/C1b: a GRADED accept must RETAIN the card (#457 ground 2, "the ground with the worst consequence") and a
//     real solve must still remove it. C10: a card the depth-2 search cannot grade honestly (the benchmark's own
//     position, where it rates the stored Qb4+ a Mistake and Kunal's game Mistake cxb5 best) falls back to the flat
//     string, so his own mistake is never told it is the best move.
// C6 (the lichess: leak guard) and C8 (the eval bar) stay NOTES, for the reasons their comments give.
// THE GRADER SHIPS SWITCHED OFF (#549, jobs/drill-accepts-one-move-only after job (106)'s measurement: the depth-3
// grade disagrees with the review on 84.8% of 132 cards). So every C assertion runs with ct_drill_grade='1' SEEDED
// into localStorage by L.launch's addInitScript (`store`), and the D block below runs with NOTHING seeded and asserts
// the default is the pre-(97) drill to the character: only the stored move solves, anything else reads the old
// "isn't it" sentence on the first and the second try, and the card is kept. The D block is red on 2f4e07a's bundle,
// which grades by default.
// Geometries: the content assertions run at kunal761 (Kunal's phone, R19); the C7/C7b/C9 sweep runs THE DRILL
// SEVEN plus kunal761. CT_GEO52=<name,...> narrows the sweep and the run says so.
'use strict';
const L=require('../lib');

const FEN='6k1/5ppp/8/3q3R/8/8/5PPP/3R2K1 w - - 0 1';
const CARD={fen:FEN,uci:'d1d5',label:'Mistake',played:'Kf1',ts:1,last:null,
  hint:'There was a better move than the one you chose. Look for the most forcing or solid option.'};
const STORE_OFF={ct_mymistakes:[CARD],ct_pool:'3'};
const STORE=Object.assign({},STORE_OFF,{ct_drill_grade:'1'});   // the switch ON: 2f4e07a's grading
const BENFEN='rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 1';
const BEN={ct_mymistakes:[{fen:BENFEN,uci:'e7b4',label:'Mistake',played:'cxb5',ts:1,last:null}],ct_pool:'3',ct_drill_grade:'1'};

const BANDS=['brilliant','best','excellent','good','inaccuracy','mistake','blunder'];
const bandsIn=(s)=>{const t=' '+String(s||'').toLowerCase()+' ';return BANDS.filter(b=>t.indexOf(b)>=0);};
const GENERIC=/isn't it/;

const SWEEP=['kunal761'].concat(L.TA7);
const GEOS=process.env.CT_GEO52?SWEEP.filter(n=>process.env.CT_GEO52.split(',').indexOf(n)>=0):SWEEP;

// the verdict box and its readability, in one read: text, at-rest paint of its first line and its last character,
// then scroll to the bottom and re-read the last character [CLAUDE.md: below the fold is not unreachable - scroll it].
const verdict=(b)=>b.page.evaluate(async()=>{
  const el=document.querySelector('[data-ct="pz-msg"]');if(!el)return null;
  const st=getComputedStyle(el);const r=el.getBoundingClientRect();
  const lh=parseFloat(st.lineHeight)||parseFloat(st.fontSize)*1.5;
  const padV=parseFloat(st.paddingTop)+parseFloat(st.paddingBottom),bordV=parseFloat(st.borderTopWidth)+parseFloat(st.borderBottomWidth);
  const text=(el.innerText||'').replace(/\s+/g,' ').trim();
  const lastRect=()=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n=null,k;while((k=w.nextNode()))if((k.nodeValue||'').trim())n=k;if(!n)return null;
    const v=n.nodeValue.replace(/\s+$/,'');const rg=document.createRange();rg.setStart(n,v.length-1);rg.setEnd(n,v.length);return rg.getBoundingClientRect();};
  const inside=(q)=>{const o=el.getBoundingClientRect();return !!q&&q.top>=o.top-0.5&&q.bottom<=o.bottom+0.5&&q.top>=-0.5&&q.bottom<=innerHeight+0.5;};
  const atRest=inside(lastRect());
  el.scrollTop=el.scrollHeight;await new Promise(f=>setTimeout(f,120));
  const atBottom=inside(lastRect());el.scrollTop=0;
  return {text,ch:el.clientHeight,sh:el.scrollHeight,need:Math.ceil(lh+padV),lh,overflowY:st.overflowY,
    overflows:el.scrollHeight>el.clientHeight+1,lastAtRest:atRest,lastAtBottom:atBottom,box:{top:Math.round(r.top),h:Math.round(r.height)}};});
const screenText=(b)=>b.page.evaluate(()=>{const r=document.getElementById('root');return (r?r.innerText:'').replace(/\s+/g,' ').trim();});
const storeLen=(b)=>b.page.evaluate(()=>{try{return (JSON.parse(localStorage.getItem('ct_mymistakes')||'[]')||[]).length;}catch(e){return -1;}});
const evalBarOnDrill=(b)=>b.page.evaluate(()=>{
  const v=document.querySelector('[data-ct="eval-bar-v"]'),h=document.querySelector('[data-ct="eval-bar-h"]');
  const vis=(e)=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1;};
  return {v:vis(v),h:vis(h)};});
const fmt=(r)=>r?(Math.round(r.x*10)/10+','+Math.round(r.y*10)/10+' '+Math.round(r.w*10)/10):'none';
const same=(a,c)=>!!a&&!!c&&Math.abs(a.x-c.x)<0.6&&Math.abs(a.y-c.y)<0.6&&Math.abs(a.w-c.w)<0.6;

// ONE card per launch, entered fresh, ONE move played: no state carried between inputs.
async function drillPlay(b,uci){
  await b.tapCt('tile-ic-analyze');await b.settle(500);
  await b.tapText(/^Practice your mistakes/);await b.settle(1200);
  const before=await b.board();const bar=await evalBarOnDrill(b);
  await b.move(uci.slice(0,2),uci.slice(2,4),900);await b.settle(1200);
  const after=await b.board();
  await b.settle(400);
  return {v:await verdict(b),screen:await screenText(b),bar,before,after,left:await storeLen(b)};
}

// the pre-(97) flat answers, copied from 13e1513's chess.jsx (the else branch of doMove's puzzle solve), short form
// because kunal761's height is under 820
const OLD1=(san)=>'✗ '+san+" isn't it. Try again, or tap 💡.";
const OLD2=(san)=>'✗ '+san+" isn't it either. Tap 👁 to see the move.";
const playMore=async(b,uci)=>{await b.move(uci.slice(0,2),uci.slice(2,4),900);await b.settle(1600);return {v:await verdict(b),left:await storeLen(b)};};

L.run(async()=>{
  L.note('GEOMETRIES THIS RUN: '+GEOS.join(', ')+(process.env.CT_GEO52?'   *** NARROWED by CT_GEO52 - NOT the full sweep ***':'   (full sweep: kunal761 + THE DRILL SEVEN)'));
  L.note('CONTENT assertions run at kunal761 only. Input count: 4 mine: moves on one card + 1 move on the benchmark card.');

  // ===== CONTENT, at Kunal's phone =====================================================================
  const runs={};
  for(const uci of ['d1d5','h5d5','g2g3','h5h7']){
    const b=await L.launch({geo:'kunal761',name:'drill52-'+uci,store:STORE});await b.open();
    if(uci==='d1d5')L.note('bundle on the page: '+(await b.stamp()));
    runs[uci]=await drillPlay(b,uci);
    L.note(uci+' -> '+JSON.stringify(runs[uci].v&&runs[uci].v.text)+' | cards left '+runs[uci].left);
    await b.close();
  }
  const stored=runs['d1d5'],alt=runs['h5d5'],quiet=runs['g2g3'],bad=runs['h5h7'];
  const T=(r)=>(r&&r.v&&r.v.text)||'';

  L.say(/^🎉/.test(T(stored)),'C1 the stored solution d1d5 (Rdxd5) still solves the drill',T(stored));
  L.say(stored.left===0,'C1b a REAL solve still removes the card from ct_mymistakes (cards left '+stored.left+')');
  L.say(/^🎉/.test(T(alt)),'C2 the EQUAL alternative h5d5 (Rhxd5, the same capture by the other rook) is ACCEPTED',T(alt));
  const altBands=bandsIn(T(alt));
  L.say(altBands.length>0,'C3 the response to the alternative NAMES a grade band from the app\'s own ladder',altBands.join(',')||'NONE');
  // the SAN is masked so "three different responses" means three different SENTENCES, not three move names
  const texts=[alt,quiet,bad].map(r=>T(r).replace(/^\S+\s+/,'').replace(/^\S+\s+/,'<SAN> '));
  L.say(new Set(texts).size===3,'C4 the three non-stored moves get three DIFFERENT responses, not one generic sentence',texts);
  L.say(T(alt)!==''&&!GENERIC.test(T(alt)),'C4b the equal alternative is not told "isn\'t it"',T(alt));
  const revealed=/R[dh]?x?d5/.test(quiet.screen||'');const qsolved=/^🎉/.test(T(quiet));
  L.say(T(quiet)!==''&&!revealed&&!qsolved,'C5 a sub-Excellent move (g2g3) is graded, and neither reveals the stored solution nor marks the drill solved',{revealed,solved:qsolved,text:T(quiet)});
  L.say(alt.left===1,'C5b a GRADED accept RETAINS the card, so the move the player missed is still drilled (#457 ground 2; cards left '+alt.left+')');
  L.say(/leaves you|straight back/.test(T(bad))&&/Blunder|Mistake|Inaccuracy/.test(T(bad)),'C5c the hung rook (h5h7) is told its band and its consequence',T(bad));

  // C8 KUNAL'S SECOND ASK, 2026-09-20: "This thing also needs a review bar on the side." NOT ASSERTED: an AMBER
  // board-width decision, jobs/drill-eval-bar-is-an-amber-board-width-decision-2026-10-01. The measurement prints.
  L.note('C8 NOT ASSERTED (would be '+((stored.bar.v||stored.bar.h)?'PASS':'FAIL')+'): eval bar on the drill board, '+JSON.stringify(stored.bar)+'. See jobs/drill-eval-bar-is-an-amber-board-width-decision-2026-10-01.');
  // C6 THE LEAK GUARD, the lichess: path must NOT change: NOT ASSERTED. The only route to a lichess: puzzle that is
  // not mine: fetches a pack over the network and the harness blocks egress (jobs/drill-grading-leak-guard-has-no-
  // harness-route-2026-09-28). The guard in the code is p.mine, which only puzzleFromMistake sets.
  L.note('C6 NOT ASSERTED: the lichess: leak guard needs a fetchable pack URL and the harness blocks egress.');

  // ===== D: THE DEFAULT, NOTHING SEEDED - the pre-(97) drill, byte for byte ==============================
  L.note('D block: ct_drill_grade NOT seeded (the shipped default). Inputs: d1d5 on one launch; h5d5 then h5h7 on another.');
  {const b=await L.launch({geo:'kunal761',name:'drill52-off-d1d5',store:STORE_OFF});await b.open();
   const r=await drillPlay(b,'d1d5');
   L.say(/^🎉/.test(T(r))&&r.left===0,'D1 switch OFF: the stored move d1d5 still solves and the card is removed (cards left '+r.left+')',T(r));
   await b.close();}
  {const b=await L.launch({geo:'kunal761',name:'drill52-off-h5d5',store:STORE_OFF});await b.open();
   const r=await drillPlay(b,'h5d5');
   L.say(T(r)===OLD1('Rhxd5'),'D2 switch OFF: the equal alternative h5d5 gets the pre-(97) first-try sentence, to the character (not graded, not accepted)',{got:T(r),want:OLD1('Rhxd5')});
   L.say(r.left===1,'D2b switch OFF: and the card is kept (cards left '+r.left+')');
   const r2=await playMore(b,'h5h7');
   L.say(!!r2.v&&r2.v.text===OLD2('Rxh7'),'D3 switch OFF: a second wrong try (h5h7) gets the pre-(97) second-try sentence, to the character - no band, no consequence',{got:r2.v&&r2.v.text,want:OLD2('Rxh7')});
   L.say(r2.left===1,'D3b switch OFF: the card is still kept after two wrong tries (cards left '+r2.left+')');
   await b.close();}

  // ===== C10 THE TRUST GUARD, on the benchmark's own card ================================================
  {const b=await L.launch({geo:'kunal761',name:'drill52-bench-cxb5',store:BEN});await b.open();
   const r=await drillPlay(b,'c6b5');
   L.say(!!r.v&&GENERIC.test(T(r))&&!/^🎉/.test(T(r)),'C10 on a card the depth-2 search cannot grade honestly (it rates the stored Qb4+ a Mistake), Kunal\'s game Mistake cxb5 is NOT accepted: the flat string stands',T(r));
   L.say(r.left===1,'C10b and the card is kept (cards left '+r.left+')');
   await b.close();}

  // ===== C7, C7b, C9: the box and the board, the only sweep ==============================================
  for(const name of GEOS){
    for(const [uci,kind] of [['h5d5','ACCEPTED'],['g2g3','REJECTED']]){
      const b=await L.launch({geo:name,name:'drill52-fit-'+name+'-'+uci,store:STORE});await b.open();
      const r=await drillPlay(b,uci);const v=r.v;const tag=L.GEOS[name].label+' '+kind;
      L.say(!!v&&v.text.length>0,'C7 '+tag+': the graded verdict rendered',v&&v.text);
      L.say(!!v&&v.ch>=v.need,'C7a '+tag+': the box holds ONE FULL LINE of its own type without scrolling (clientHeight '+(v?v.ch:'n/a')+' >= '+(v?v.need:'n/a')+')',v);
      L.say(!!v&&(!v.overflows||/auto|scroll/.test(v.overflowY)),'C7b '+tag+': where the sentence overflows the box, the box is a REAL scroller, never a silent clip (overflow-y '+(v?v.overflowY:'n/a')+', sh '+(v?v.sh:'n/a')+' v ch '+(v?v.ch:'n/a')+')');
      L.say(!!v&&v.lastAtBottom,'C7c '+tag+': the LAST character of the sentence is painted once the box is scrolled to its bottom ('+(v?('at rest '+v.lastAtRest):'n/a')+')');
      L.say(same(r.before,r.after),'C9 '+tag+': the board did not move when the graded verdict landed ('+fmt(r.before)+' -> '+fmt(r.after)+')');
      await b.close();
    }
  }
},'GATE52-drill-grades-the-move');
