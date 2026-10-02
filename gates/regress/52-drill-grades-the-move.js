// regress/52-drill-grades-the-move.js   TC-R17 (US-R14): the mistakes drill must GRADE the move the player
// actually made, not string-match it against the one move it stored.
//
// AUTHORED BY THE TEST-AUTHORING LANE (docs/patch-drill-accepts-one-move-only-2026-09-28, run
// test-authoring__1790581882086) for jobs/drill-accepts-one-move-only, P0, raised by Kunal 2026-09-20:
//   "This is the second time that I solve this position, but last time it told me the solution that was
//    correct was moving rook to d8 from f8. Now it's telling me to move the queen in the exact same
//    position. Why are there two different suggestions, there can only be one best move."
// and designed by him the same day: "when somebody plays a better move, maybe we should tell them what
// category it is in ... a good move, an excellent move, a brilliant move ... and we should explain why."
//
// THE DEFECT, CERTAIN, FROM TWO LINES. Cited by IDENTIFIER first and line number second, because the numbers
// in this header were written against #426 (4b38f93) and had moved by 348 and 385 lines by the time the fix
// landed - the stale-citation class this repo has paid for twice. Search, do not trust the number.
//   `matchesLine` (chess.jsx:4015 as fixed at #456, was 3667 at #426):
//     const matchesLine = cleanSAN(played) === cleanSAN(p.sol[step]);
//   `_lichessObj(g,[m.uci]` in puzzleFromMistake (chess.jsx:4805 at #456, was 4420 at #426), which builds
//   every `mine:` drill with EXACTLY ONE solution:
//     const o=_lichessObj(g,[m.uci],0,null,['mix'],'mine:'+m.fen);
// So the drill does not ask IS THIS MOVE AS GOOD. It asks IS THIS MOVE THE STRING WE STORED. Every other
// move of equal value falls to :3693 and is told "isn't it. Try again." The machinery to grade it already
// exists and is thrown away: classify(loss) at chess.jsx:347 returns the bands the review screen uses
// (Best <15, Excellent <40, Good <90, Inaccuracy <160, Mistake <320, else Blunder).
//
// THE ONE ESCAPE HATCH ALREADY IN THE CODE, AND WHY THIS GATE STEPS AROUND IT. :3668 reads
// `if(isMate||matchesLine)`, so a DIFFERENT move that delivers checkmate is already accepted. That is the
// app conceding the principle in the one case it could compute without the engine. Every assertion here is
// therefore driven with NON-MATING moves, or it would pass through that hatch and prove nothing.
//
// THE FIXTURE, AND WHY ITS EQUALITY NEEDS NO ENGINE. One position, four legal non-mating inputs:
//     6k1/5ppp/8/3q3R/8/8/5PPP/3R2K1 w - - 0 1
//     Black Kg8 f7 g7 h7 Qd5 · White Rh5 Rd1 f2 g2 h2 Kg1 · White to move, Black is not in check.
//   TWO WHITE ROOKS BEAR ON THE SAME UNDEFENDED QUEEN. d1d5 (R1xd5) is the stored solution; h5d5 (R5xd5)
//   wins the identical queen for nothing on the identical move. No engine is needed to know these are the
//   same idea and the same material: it is one capture reachable two ways, which is exactly the shape
//   Kunal described. The other two inputs are deliberately NOT equal - g2g3 is a quiet move that leaves the
//   queen on the board, h5h7 hangs a rook to the king - so the gate can tell "graded" from "accepted
//   everything", which a gate that only ever played the good alternative could not.
//
// WHAT IS ASSERTED AND WHAT IS ALREADY TRUE. C1, C5 and C6 PASS on #426 and are here so the fix cannot buy
// C2/C3/C4 by breaking them: C1 the stored move still solves, C5 a sub-Excellent move still does NOT reveal
// the solution (Kunal's "can you find it?" band), C6 the Lichess path still rejects flatly, because there a
// single intended line IS correct and the job says in terms that the fix must not leak into it. C2, C3, C4
// and C8 are RED on #426 by construction; that is the defect.
//
// WHAT #456 CHANGED, AND WHAT IT DID NOT. #456 made the drill GRADE the played move with the synchronous
// local search the review already falls back to (`gradeDrillMove` in chess.jsx), accepting at Excellent or
// better and naming the band at every other, so C2, C3, C4 and C4b are the fix. C8 IS NOT SHIPPED and is
// demoted to a printed note below rather than left red - see the long comment there. C6 is still a note for
// the reason its author gave. So this gate asserts C1, C2, C3, C4, C4b, C5 and C7 x 7 geometries.
//
// INPUT COUNT, SAID OUT LOUD (correction 014, R18): 1 position x 4 moves on the `mine:` path + 1 position
// x 1 move on the `lichess:` path = 5 measured drill responses per geometry. The CONTENT assertions run at
// Kunal's 375x730 only - none of the verdict strings has a viewport term - and only the FIT assertion C7
// sweeps all seven geometries, per the split gate 51 records in its own header.
//
// THE SELECTOR GAP, NOT PAPERED OVER. The verdict box still carries no data-ct (jobs/pz-verdict-box-has-no-
// data-ct, filed 2026-09-27, still status ready). This gate locates it structurally, exactly as gate 51
// does, and shares that job's fate: when build adds data-ct="pz-verdict", replace verdictBox().
'use strict';
const L=require('../lib');

const FEN='6k1/5ppp/8/3q3R/8/8/5PPP/3R2K1 w - - 0 1';
const CARD={fen:FEN,uci:'d1d5',label:'Mistake',played:'Kf1',last:null,
  hint:'There was a better move than the one you chose. Look for the most forcing or solid option.'};
const STORE={ct_mymistakes:[CARD],ct_pool:'3'};

// a real Lichess-shaped puzzle, so the leak guard runs on the path the job says must NOT change.
// Same position, same stored move, but reached through the pack loader, so p.ext is true and p.mine is not.
const PACKFEN='6k1/5ppp/8/3q3R/8/8/5PPP/3R2K1 b - - 0 1';

const BANDS=['brilliant','best','excellent','good','inaccuracy','mistake','blunder'];
const bandsIn=(s)=>{const t=' '+String(s||'').toLowerCase()+' ';return BANDS.filter(b=>t.indexOf(b)>=0);};
const GENERIC=/isn't it/;

const ALLGEOS=[{w:320,h:568,n:'320x568'},{w:360,h:640,n:'360x640'},{w:375,h:667,n:'375x667'},
  {w:375,h:730,n:'375x730 KUNAL'},{w:390,h:844,n:'390x844'},{w:414,h:896,n:'414x896'},{w:440,h:956,n:'440x956'}];
const GEOS=process.env.CT_GEO52?ALLGEOS.filter(g=>process.env.CT_GEO52.split(',').some(x=>g.n.indexOf(x)===0)):ALLGEOS;
const CONTENT_GEO={w:375,h:730,safe:''};

// the verdict box: the deepest descendant of pz-top whose own trimmed text IS the verdict line.
const verdictBox=(b)=>b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');if(!top)return null;
  const all=[...top.querySelectorAll('div,span')].filter(e=>{const t=(e.innerText||'').trim();return /^(?:🎉|✗|✓)/.test(t)&&e.children.length===0;});
  const e=all[all.length-1];if(!e)return null;const r=e.getBoundingClientRect();const p=e.parentElement,pr=p.getBoundingClientRect();
  return {text:(e.innerText||'').replace(/\s+/g,' ').trim(),h:Math.round(r.height*10)/10,
    psh:p.scrollHeight,pch:p.clientHeight,pmax:getComputedStyle(p).maxHeight,povf:getComputedStyle(p).overflowY,
    clipped:Math.max(0,p.scrollHeight-p.clientHeight),vw:innerWidth,vh:innerHeight};});

const screenText=(b)=>b.page.evaluate(()=>{const r=document.getElementById('root');return (r?r.innerText:'').replace(/\s+/g,' ').trim();});

const evalBarOnDrill=(b)=>b.page.evaluate(()=>{
  const v=document.querySelector('[data-ct="eval-bar-v"]'),h=document.querySelector('[data-ct="eval-bar-h"]');
  const vis=(e)=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1;};
  return {v:vis(v),h:vis(h)};});

// enter the mistakes drill on a freshly seeded single-card store and play ONE uci.
// ONE ENTRY PER LAUNCH, deterministic at every geometry, and it cannot inherit a solved state from a
// previous item - the trap gate 51 recorded when it walked the queue with 'Next >'.
async function drillPlay(b,uci){
  await b.tile('Review');await b.settle(700);
  await b.tapText(/find the move you missed/,{wait:1500});
  await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
  const bar=await evalBarOnDrill(b);
  await b.move(uci.slice(0,2),uci.slice(2,4),900);await b.settle(1000);
  return {box:await verdictBox(b),screen:await screenText(b),bar};
}

L.run(async()=>{
  L.note('GEOMETRIES THIS RUN: '+GEOS.map(g=>g.n).join(', ')+(process.env.CT_GEO52?'   *** NARROWED by CT_GEO52 - NOT the full sweep ***':'   (full sweep)'));
  L.note('CONTENT assertions run at 375x730 (Kunal) only; C7 is the only sweep. Input count: 4 mine: moves + 1 lichess: move.');

  // ===== CONTENT, at Kunal's 375x730 =====================================================================
  const runs={};
  for(const uci of ['d1d5','h5d5','g2g3','h5h7']){
    const b=await L.launch({geo:CONTENT_GEO,name:'drill52-'+uci,store:STORE,fresh:false});await b.open();
    if(uci==='d1d5'){const st=await b.stamp();L.note('bundle on the page: '+st);}
    runs[uci]=await drillPlay(b,uci);
    L.note(uci+' -> '+JSON.stringify(runs[uci].box&&runs[uci].box.text));
    await b.close();
  }

  const stored=runs['d1d5'],alt=runs['h5d5'],quiet=runs['g2g3'],bad=runs['h5h7'];

  // C1 CONTROL, GREEN ON #426 AND MUST STAY GREEN: the stored move still solves. If the fix breaks this the
  // gate says so rather than counting C2 as progress.
  L.say(!!stored.box&&/^🎉/.test(stored.box.text),'C1 the stored solution d1d5 (R1xd5) still solves the drill',stored.box&&stored.box.text);

  // C2 THE DEFECT. The second rook takes the same queen. RED on #426: "✗ Rxd5 isn't it - try again."
  L.say(!!alt.box&&/^🎉/.test(alt.box.text),'C2 the EQUAL alternative h5d5 (R5xd5, the same capture by the other rook) is ACCEPTED',alt.box&&alt.box.text);

  // C3 KUNAL'S DESIGN: the response names the band. RED on #426 - the reject string names none.
  const altBands=bandsIn(alt.box&&alt.box.text);
  L.say(altBands.length>0,'C3 the response to the alternative NAMES a grade band from the app\'s own ladder',altBands.join(',')||'NONE');

  // C4 R10 ITEM 5, NO GENERIC STRING: three different moves of three different qualities must not produce
  // one interchangeable sentence. RED on #426 - all three are "✗ <san> isn't it - try again."
  // the SAN is masked so that "three different responses" means three different SENTENCES, not three
  // different move names inside one interchangeable sentence. #426 prints Rhxd5 (file disambiguation), not
  // R5xd5, so the mask is positional - the first token after the ✗/🎉 glyph - rather than a list of SANs.
  const texts=[alt,quiet,bad].map(r=>(r.box&&r.box.text||'').replace(/^\S+\s+/,'').replace(/^\S+\s+/,'<SAN> '));
  const distinct=new Set(texts).size;
  L.say(distinct===3,'C4 the three non-stored moves get three DIFFERENT responses, not one generic sentence',distinct+' distinct of 3: '+JSON.stringify(texts));
  L.say(!GENERIC.test(alt.box&&alt.box.text||''),'C4b the equal alternative is not told "isn\'t it"',alt.box&&alt.box.text);

  // C5 CONTROL, GREEN ON #426 AND MUST STAY GREEN (Kunal: "there is more here. Can you find it?"): a move
  // below Excellent must NOT reveal the stored solution. This is what a fix that accepts everything breaks.
  // C5 WAS UNCONTROLLED AS FIRST WRITTEN AND ITS OWN NEGATIVE CONTROL SAID SO. As handed it asserted only
  // that the stored SAN is absent from the screen. NC1 (matchesLine=true, accept every move) left it GREEN,
  // because the app's solve string is "That's the move you missed - well spotted." and never names the move:
  // a build that accepts a quiet pawn push as a solution passed the assertion that exists to catch exactly
  // that. So C5 now also asserts the drill is NOT MARKED SOLVED by a sub-Excellent move, which is the
  // property Kunal's "there is more here, can you find it?" band actually needs. Re-run under NC1: RED.
  const revealed=/R[15dh]?x?d5/.test(quiet.screen||'');
  const solved=/^🎉/.test((quiet.box&&quiet.box.text)||'');
  L.say(!revealed&&!solved,'C5 a sub-Excellent move (g2g3) neither reveals the stored solution nor marks the drill solved',{revealed:revealed,solved:solved,text:quiet.box&&quiet.box.text});

  // C8 KUNAL'S SECOND ASK, 2026-09-20: "This thing also needs a review bar on the side."
  // NOT ASSERTED AT #456, AND IT IS A NOTE RATHER THAN A PASS - exactly the demotion this gate's own author
  // applied to C6 below, and for the same reason: a green that measures nothing is worse than an honest gap.
  // WHY IT IS NOT ASSERTED. #456 shipped the GRADING half of jobs/drill-accepts-one-move-only and
  // deliberately did not ship the bar. The bar is not a bug fix, it is an AMBER product change under
  // prompts/decision-rights: on main it renders only under _evalOn and costs evalW of BOARD WIDTH
  // (data-ct="eval-bar-v"), and the drill board already lands ON the 192px floor at 360x640 and 375x667
  // (measured by jobs/drill-verdict-reserve-costs-more-board-than-a-short-phone-has-2026-09-28). So it
  // collides head-on with that job and with jobs/board-is-too-small-against-chesscom-2026-09-23, which is
  // priority 9 and Kunal's own. "The board is sacred" says a fix that costs board HEIGHT goes in a sheet;
  // nothing in this project says what a fix that costs board WIDTH on the one screen already at the floor
  // does, and that is his call and not the build lane's.
  // LANDING THE ASSERTION RED WAS THE OTHER OPTION AND IT IS WORSE THAN IT LOOKS: a permanent red means no
  // later run can emit GATES GREEN, so one deferred product decision would block every push in the project.
  // The patch document offered that as the build lane's call (docs/patch-drill-accepts-one-move-only-
  // 2026-09-28, applyNote); this is the lane taking it, and saying so here rather than only in a run report.
  // THE MEASUREMENT STILL RUNS AND IS PRINTED, so re-arming this is one line and the number is on the record
  // either way. Owner: jobs/drill-eval-bar-is-an-amber-board-width-decision-2026-10-01, which carries the
  // Desk ask. When the bar ships, replace this note with the L.say quoted inside it.
  L.note('C8 NOT ASSERTED (would be '+((stored.bar.v||stored.bar.h)?'PASS':'FAIL')+'): eval bar on the drill board, '
    +JSON.stringify(stored.bar)+'. The assertion is L.say(!!(stored.bar.v||stored.bar.h), ...) and it is '
    +'deferred as an AMBER board-width decision, not as a defect. See the comment above and '
    +'jobs/drill-eval-bar-is-an-amber-board-width-decision-2026-10-01.');

  // ===== C6 THE LEAK GUARD: the Lichess path must NOT change ============================================
  // GREEN on #426 and must stay green. The job says in terms: a Lichess puzzle has one intended line and
  // rejecting everything else is correct there.
  // C6 IS NOT ASSERTED THIS RUN AND IS A NOTE, NOT A PASS. It was first written as L.say(true, 'PLACEHOLDER'),
  // which is a green that measures nothing - the exact shape the 2026-09-23 external challenger counted 34
  // times in this suite - so it was demoted before hand-over rather than left to inflate the pass count.
  // WHY IT COULD NOT RUN: the only in-app route to a `lichess:` puzzle that is NOT `mine:` is loadPack(url)
  // at chess.jsx:4415, which fetches a JSON pack over the network, and gates/lib.js aborts every external
  // host by design. Seeding one is not a workaround: nothing writes an ext puzzle to localStorage.
  // WHAT BUILD MUST DO BEFORE LANDING THE FIX: assert by hand, or add a dev route, that an alternative move
  // on a lichess: puzzle is STILL rejected flatly. The job says in terms that the grading must not leak
  // there. Filed as jobs/drill-grading-leak-guard-has-no-harness-route-2026-09-28.
  L.note('C6 NOT ASSERTED: the lichess: leak guard needs a fetchable pack URL and the harness blocks egress. See the header and jobs/drill-grading-leak-guard-has-no-harness-route-2026-09-28.');

  // ===== C7 and C7b FIT, the only sweeps =================================================================
  // C7b ADDED AT #456 AND IT IS THE REASON C7 ALONE IS NO LONGER ENOUGH. C7 drives h5d5, the EQUAL
  // ALTERNATIVE - which before #456 was REJECTED and after #456 is ACCEPTED. The accepted path renders the
  // verdict in the SOLVED box, which is `position:absolute inset:0 overflowY:auto` and so has the whole
  // remaining column; the rejected path renders in the RESERVED box, which is a hard 74px cap that wraps at
  // vp.h>=820 and a single 30px nowrap line with an ellipsis below it. So the fix silently moved C7 off the
  // tighter of the two boxes, and the only assertion over that box stopped covering it on the very build that
  // rewrote every string it holds. Nothing went red; the coverage just went quiet. That is the trap this repo
  // records as "a threshold belongs to the instrument it was calibrated on", one step earlier - not an
  // assertion that goes red when you move it, but one that keeps passing about something else.
  // C7b therefore drives g2g3, which is REJECTED at every band the grader can return, and asserts the
  // reserved box does not clip. It is also the only thing that MEASURES the character budget
  // DRILL_MSG_MAXW: 48 was calibrated against the 49-character string #452 shipped, which measures 70/74 at
  // 390x844, and a character count is a heuristic standing in for a pixel one. This is the pixel one.
  for(const g of GEOS){
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'drill52-fit-'+g.n,store:STORE});await b.open();
    const r=await drillPlay(b,'h5d5');
    const box=r.box;
    L.say(!!box&&box.clipped===0,'C7 '+g.n+' the ACCEPTED verdict box does not clip its own text (scrollHeight vs clientHeight)',box?(box.psh+'/'+box.pch+' max '+box.pmax+' overflow '+box.povf):'NO BOX');
    await b.close();
  }
  for(const g of GEOS){
    const b=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'drill52-rfit-'+g.n,store:STORE});await b.open();
    const r=await drillPlay(b,'g2g3');
    const box=r.box;
    const ok=!!box&&box.clipped===0;
    L.say(ok,'C7b '+g.n+' the REJECTED verdict box does not clip its own text',box?(box.psh+'/'+box.pch+' max '+box.pmax+' overflow '+box.povf+' len '+box.text.length+' '+JSON.stringify(box.text)):'NO BOX');
    await b.close();
  }
},'GATE52-drill-grades-the-move');
