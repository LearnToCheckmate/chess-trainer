// regress/50-drill-verdict-no-jump.js  jobs/board-jumps-on-drill-verdict (P0, found by Kunal on his phone:
// "Board jumps when the message in red comes up."). Implements TC-R15 (story US-R12; ids continue the repo id space per prompts/test-authoring step 6). Authored by the
// test-authoring lane 2026-09-22; handed to build as a patch, never committed by that lane.
//
// THE DEFECT. The puzzle screen has TWO renderers for the same verdict box. The browse/training view reserves
// its space - height:(vp.h<820?30:74), #364 - and gate 39 already proves the board does not move there. The
// ONLINE view, which is also the view the "Practice your mistakes" and "Your brilliant moves" drills load into
// (startMistakes/startBrilliant -> loadExternal -> pzView 'online'), uses maxHeight:74. maxHeight collapses to
// 0 while there is no message and grows when the verdict arrives, so the board is pushed down (and, because the
// fit loop then trims it, shrunk). Measured on #416 at 375x730: board top 198 -> 245.9, width 339 -> 291.
//
// THE SHAPE THIS ADDS. A jump is not a property of one state, it is a DIFFERENCE between two, so every input
// here is a PAIR: board rect BEFORE the move, board rect AFTER the red ✗ verdict has rendered, top/left/width delta
// asserted 0 (<0.6px, the house tolerance), at seven geometries: 7 pairs, 14 measured states. The 30-vs-74 reserve
// is chosen by vp.h<820: 568, 640, 667, 730 run the 30 branch; 844, 896, 956 run the 74 branch. Both run.
// Also asserted per pair: the drill opened with no verdict, and the verdict actually rendered (a pair where nothing
// appeared proves nothing).
//
// NOT IN THIS GATE, AND WHY (authoring run 2026-09-22): (a) the SOLVED path - with the reserve fixed the board still
// moves on a correct move (320x568 top +14.5, 390x844 +26, 375x730 width 325 -> 375) because the Hint/Show/Reset
// row collapses (pz-bottom 104 -> 52) and the centring spacers / fit loop re-lay the stack. A different cause; filed
// as its own job (jobs/drill-solved-board-jumps-bottom-row-collapse) with its case, not asserted green here.
// (b) the brilliant drill - seeding ct_mybrilliancies did not surface the "Your brilliant moves" entry in this run;
// not reached.
//
// MEASUREMENT RULES OBSERVED: the rect is read by b.board() (the painted 8-column grid) before any tap; the move is
// b.move (piece tap then target tap, mouse at measured centres, no locator auto-scroll); the bundle stamp is
// printed by lib.serve and read back from the page before the first measurement.
//
// NEGATIVE CONTROLS (see docs/board-jumps-on-drill-verdict-lane): NC1 the fix reverted (maxHeight:74) - the
// shipped #416 tree, red at every pair; NC2 reserve 0 (height:0) - red; NC3 reserve only the tall branch
// (height:(vp.h<820?0:74)) - red at the four short geometries only; NC4 the verdict never set on a wrong move -
// red on the "verdict rendered" assertion.
// ── WHAT ACTUALLY SHIPPED, ADDED BY #428 WHEN THIS GATE WAS LANDED. READ THIS BEFORE "CORRECTING" THE FIX. ──────
// The fix on main is chess.jsx:6293  maxHeight:74 -> height:74.  A CONSTANT 74 AT EVERY GEOMETRY, and deliberately
// NOT the height:(vp.h<820?30:74) branch that the sibling renderer at :6221 uses and that this job's brief
// prescribed. Both pass THIS gate at 35/35 - the board stops moving either way - so this gate alone cannot tell
// you which fix is on the tree, and that is exactly why the note is here rather than in a commit message.
//
// The 30px branch was built, measured and REJECTED at #428: it carries whiteSpace:nowrap + textOverflow:ellipsis,
// and this renderer has carried the two-clause drill EXPLANATION since #426, so the branch truncates it to a single
// line. gates/regress/51-drill-explain-why.js B6 goes RED on it at 320x568, 360x640, 375x667 and 375x730 -
// scrollWidth 455 against clientWidth 362 at Kunal's own geometry. #364 reasoned about that 30 for a ONE-LINE
// verdict on the OTHER renderer, where it is still correct; it does not transfer here.
//
// SO: 50 green + 51 green is the pair that pins this fix. If you change :6293, run BOTH. Rejected candidate bundle
// md5 6b7dbe7bccec; shipped bundle md5 7515c47ee8ad (as #992 locally, pushed as #428).
//
// COST, MEASURED AND NOT HIDDEN: reserving 74px always costs board size at rest. At 375x730 the board is 281 wide
// after this fix; on the pre-fix tree it is 339 before the first move and 291 once the verdict lands. Recorded as an
// amber default (flags/amber-428-drill-verdict-reserve-costs-board-width-at-rest); the width is meant to come back
// via Kunal's own answer for this screen (once solved, the goal card yields its 71px), which is queued separately.

'use strict';
const L=require('../lib');
// One seeded card per drill. The position is White to move with Qxf7# available (uci f3f7). The wrong move a2a3
// is legal and not the solution. Seeded under the app's own key (chess.jsx: ct_mymistakes).
const FEN='r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
const CARD=(label)=>[{fen:FEN,uci:'f3f7',label,ts:1,played:'Qe2'}];
const KINDS=[
  {kind:'mistake',  key:'ct_mymistakes',     btn:/^Practice your mistakes/},
];
const GEOS=[
  {w:320,h:568,label:'320x568'},{w:360,h:640,label:'360x640'},{w:375,h:667,label:'375x667'},
  {w:375,h:730,label:'375x730 (Kunal)'},{w:390,h:844,label:'390x844'},{w:414,h:896,label:'414x896'},{w:440,h:956,label:'440x956'},
];
const verdictText=(b,re)=>b.page.evaluate((src)=>{const r=new RegExp(src[0],src[1]);const d=[...document.querySelectorAll('div')].filter(x=>{const t=(x.innerText||'').trim();const q=x.getBoundingClientRect();return r.test(t)&&q.height>0;});return d.length?(d[d.length-1].innerText||'').trim().slice(0,60):null;},[re.source,re.flags]);
// The verdict must be SEEN, not merely present: its box intersected with every clipping ancestor (overflow not
// visible) must leave at least 18px of height (one 14px line at lineHeight 1.3), and elementFromPoint at the centre
// of that visible area must land inside the verdict (measurement rule 1: hit-test, do not trust layout). Without this,
// a reserve of 0px passes the no-jump assertion by hiding the verdict (negative control NC2, green before this line).
const verdictSeen=(b)=>b.page.evaluate(()=>{
  const d=[...document.querySelectorAll('div')].filter(x=>/^✗/.test((x.innerText||'').trim())&&x.getBoundingClientRect().height>0);
  const el=d[d.length-1];if(!el)return {ok:false,why:'no ✗ element'};
  let r=el.getBoundingClientRect();let top=r.top,bot=r.bottom,left=r.left,right=r.right;
  for(let a=el.parentElement;a;a=a.parentElement){const st=getComputedStyle(a);if(st.overflowY!=='visible'||st.overflowX!=='visible'){const q=a.getBoundingClientRect();top=Math.max(top,q.top);bot=Math.min(bot,q.bottom);left=Math.max(left,q.left);right=Math.min(right,q.right);}}
  top=Math.max(top,0);bot=Math.min(bot,innerHeight);
  const vis=Math.round((bot-top)*10)/10;if(vis<18||right-left<40)return {ok:false,vis,why:'clipped'};
  const hit=document.elementFromPoint((left+right)/2,(top+bot)/2);
  return {ok:!!hit&&(el===hit||el.contains(hit)),vis,hit:hit?(hit.tagName+' '+(hit.innerText||'').slice(0,20)):null};
});
const same=(a,b)=>!!a&&!!b&&Math.abs(a.y-b.y)<0.6&&Math.abs(a.w-b.w)<0.6&&Math.abs(a.x-b.x)<0.6;
const fmt=(r)=>r?('top '+Math.round(r.y*10)/10+' w '+Math.round(r.w*10)/10):'no board';

L.run(async()=>{
  for(const g of GEOS){
    for(const K of KINDS){
      for(const path of ['wrong']){
        const tag=g.label+' '+K.kind+' '+path;
        const b=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'dv-'+g.w+'x'+g.h+'-'+K.kind+'-'+path,store:{[K.key]:CARD(K.kind==='brilliant'?'Brilliant':'Mistake')}});
        await b.open();
        if(path==='wrong'&&K.kind==='mistake'&&g.w===375&&g.h===730)L.note('page stamp '+(await b.stamp()));
        await b.tapCt('tile-ic-analyze');await b.settle(500);   // data-ct tile-ic-analyze (chess.jsx); the tile's text label is absent at 320 wide
        await b.tapText(K.btn);await b.settle(900);
        const before=await b.board();
        const pre=await verdictText(b,/^(✗|🎉)/);
        L.say(!!before&&pre===null,tag+': the drill opened on a board with no verdict yet',{board:fmt(before),verdict:pre});
        if(path==='wrong')await b.move('a2','a3',900);else await b.move('f3','f7',900);
        await b.settle(700);
        const v=await verdictText(b,path==='wrong'?/^✗/:/^🎉/);
        const after=await b.board();
        L.say(!!v,tag+': the verdict rendered ('+(path==='wrong'?'✗ line':'🎉 line')+')',v);
        if(path==='wrong'){const vs=await verdictSeen(b);L.say(vs.ok,tag+': the verdict is visible and on top (>=18px unclipped, hit-test lands on it)',vs);}
        L.say(same(before,after),tag+': the board did not move when the verdict appeared ('+fmt(before)+' -> '+fmt(after)+')',
              before&&after?{dTop:Math.round((after.y-before.y)*10)/10,dW:Math.round((after.w-before.w)*10)/10}:null);
        const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
        L.say(bad.length===0,tag+': no app error beyond the allowed engine trap',bad.slice(0,2));
        await b.close();
      }
    }
  }
},'50-drill-verdict-no-jump');
