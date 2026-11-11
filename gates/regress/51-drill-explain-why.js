// regress/51-drill-explain-why.js   TC-R16 (US-R13): the mistake drill must say WHY the better move was better.
//
// AUTHORED BY THE TEST-AUTHORING LANE (docs/patch-drill-explain-why-it-was-better-2026-09-27, run
// test-authoring__1790473988000) and landed by build #426. That patch ran it RED on #422 (49 pass / 76 fail
// over 6 of 7 geometries), GREEN at 42 of 52 against a scratch implementation of the fix, and RED under all
// four of its designed negative controls. Two changes were made to it here, both flagged in place:
//   (1) THE SPLIT the patch asked for. Its own verdict said the content assertions are geometry-invariant by
//       construction - the sentence is built in JS at the capture site with no viewport term - so they run at
//       Kunal's 375x730 ONLY, and only the three FIT assertions sweep all seven widths. See "GEOMETRY" below.
//   (2) A5 AND B4 CORRECTED, with the measurement that forced it, at "THE BAND ASSERTION" below. Read that
//       paragraph before changing them back.
//
// WHAT THIS GUARDS, AND WHERE THE DEFECT LIVED. Measured on #425 (736b322), the bundle before the fix:
//   the capture site   caps.push({fen,uci,label,ts,last,played});            <- NO `why`. out[i] was in scope
//          carrying loss, evalBefore, evalAfter, bestMove, bestSan and motifs, and every one was discarded.
//          Compare the Brilliant branch three lines below, which built a real `_why` from the same out[i].
//   the render site    o.explain = isB ? ("That's your brilliant move. Nicely done."+(m.why?(' '+m.why):''))
//                                     : "That's the move you missed - well spotted.";
//          <- the brilliant branch APPENDED m.why; the mistake branch was a fixed string and appended nothing.
// Kunal raised it on 2026-09-19 and again on 2026-09-20 (jobs/drill-explain-why-it-was-better, fingerprint
// drill-explain-nothing, count 2, both from him): "it told me yes that's the move you missed, but it doesn't
// explain to me why that's better, which is what it should be doing."
//
// WHY IT IS IN TWO PHASES, AND WHY PHASE 1 EXISTS AT ALL. A gate that seeded its own `why` values into
// ct_mymistakes would go green the moment the render site appends whatever it was handed, while the CAPTURE
// site - where the data is actually thrown away - stayed broken. That is the vacuity shape the 2026-09-23
// external challenger counted 34 times in this suite, so it is designed out here rather than checked for:
//   PHASE 1 (CAPTURE) reviews a REAL game through the stored-account path, so the APP does the capturing, and
//           then reads ct_mymistakes back out of localStorage. Nothing in the fixture can satisfy it.
//   PHASE 2 (RENDER) re-seeds ONLY what phase 1 harvested - the app's own capture, never hand-written - and
//           drives the drill, so the sentence is read off the screen the player sees.
// Both halves were red on #422/#425 for DIFFERENT reasons, so a partial fix cannot make this gate green.
//
// THE INPUT COUNT, SAID OUT LOUD (correction 014, R18). The Opera Game reviewed as BLACK captures exactly 2 of
// the user's own Mistake/Blunder moves (e7b4 after cxb5, e6d7 after Nxd7), measured, not assumed - the gate
// prints the count and FAILS below 2. Two positions is more than one and less than plenty; it is the ceiling
// the Opera Game provides and this gate says so rather than implying a wider sweep than it ran.
//
// THE SELECTOR GAP, DELIBERATELY NOT PAPERED OVER. The drill's verdict box carries NO data-ct - it is an
// anonymous div inside [data-ct="pz-top"]. The charter forbids inventing a selector, so this gate locates it
// structurally: the childless descendant of pz-top whose own text is the verdict. That is fragile on purpose
// and filed as jobs/pz-verdict-box-has-no-data-ct; when build adds data-ct="pz-verdict", replace verdictBox()
// with it and delete this paragraph.
//
// GEOMETRY, AFTER THE SPLIT. The sentence's CONTENT has no viewport term, so every content assertion runs at
// Kunal's 375x730 and the gate says so in its output. What IS geometry-dependent is whether the sentence
// FITS: the verdict box is maxHeight 74 with overflowY auto, so a longer explanation is CLIPPED rather than
// wrapped. B6/B7/B8 therefore run at all seven widths.
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED (jobs/four-gates-force-a-three-worker-pool-and-never-
// test-the-fallback-2026-09-27, doneWhen route 2; gate 51 is a member of that class and was not listed in it).
// Every launch below passes ct_pool:'3', so this gate runs the POOLED Stockfish review and nothing else.
// WHICH BRANCH IS NOT COVERED, AND WHY IT CANNOT BE FROM HERE, read off the tree rather than assumed:
//   chess.jsx:3799  const useSF = sfReadyRef.current ? await ensureAna() : false;   and 3801 `if(useSF){`
//   The minimax fallback is the `else` at 3927. useSF is gated on sfReadyRef/ensureAna and there is NO ct_*
//   override that reaches it, so no store value this harness can set selects that branch. ct_pool is NOT
//   that switch: poolWanted() at 3726 accepts 1..6 and only SIZES the pool, so ct_pool=1 is still a
//   one-worker STOCKFISH review and never the fallback engine. So this gate cannot run a fallback column,
//   and the gap is recorded here instead of being left as a silent default.
// WHAT IS DONE ABOUT IT INSTEAD: the fallback path is INSTRUMENTED rather than driven. chess.jsx:3965
// writes engine:'sf'|'fallback' into ct_gamestats for the reviewed game, so A0e below READS which branch
// actually produced this run's capture and fails if it is not the one this header claims. A run on a
// machine where Stockfish never readies therefore goes red and says so, instead of silently measuring the
// uncovered branch and reporting it as the covered one. The route itself is jobs/no-harness-route-to-the-
// drill-capture-producer-2026-09-30 and belongs to test-authoring, not here.
//
// A CONTRADICTION, NOW RESOLVED (#549, item 118; jobs/chessjsx-claims-gate-51-runs-a-fallback-column-and-
// it-does-not-2026-10-03). The #426 P0-1 comment in chess.jsx (find it by the text "#426 antagonist B,
// P0-1") stated "Gate 51 now runs a fallback column." It never did. That comment now says what is true -
// the fallback branch is instrumented (A0e) but not driven, and has no gate until the route job lands -
// and this file's paragraph above was already right, so only the bundle side changed.
//
// THE ALT-MATE SOLVE STATE, AND WHY THIS GATE DOES NOT REACH IT (jobs/veto-fixes-land-with-no-assertion-
// because-the-gate-is-frozen-pre-veto-2026-09-28, fix part 1, third item, which allows "or a written
// statement of why it cannot be reached" - this is that statement). The alt-mate verdict is the branch
// where the drill accepts a DIFFERENT mating move from the one stored in `uci`. drillSolve() below plays
// exactly m.uci, which is the stored best move, so the solve always takes the primary branch. Reaching the
// alt branch needs a captured position with a second, equally-mating move AND the drill accepting it; the
// reference game (the Opera Game as Black) provides neither at its two captured plies - neither is a mate
// position. ["both are quiet" WAS WRITTEN HERE AND IS WITHDRAWN at #549 item (113) [R18]: by Kunal's 5 Nov 2026
// definition neither is quiet - e7b4 (Qb4+) is a check and e6d7 (Qxd7) a capture, measured by B5c's predicate.] So the state is not reachable from this fixture, and seeding one by hand
// would be the vacuity shape PHASE 1 exists to design out (the fixture would be asserting against itself).
// It stays uncovered here, on purpose and in writing. The clip antagonist A measured in that state is
// jobs/the-alt-mate-verdict-is-cut-17px-at-320x568-with-no-ellipsis-2026-10-02.

// ── B11 AND B5c, #549 item (113), jobs/clauses-cite-assertions-that-do-not-assert-them-2026-09-28 ──────────────
// Rebuilt by hand from docs/patch-clauses-cite-assertions-that-do-not-assert-them-2026-09-28-2026-10-08 (test-
// authoring, 2026-10-08, against #497), which no longer applied: #547's FLOAT (Kunal, 11 Oct) rewrote this screen.
// B11 - US-R13 "the board does not move while the explanation lands". Three board rects per card: on open, before
//   the solving move with the hint up, after the verdict. B11a asserts the pair was really measured (no verdict
//   before, a verdict after); B11b asserts the clause AS WRITTEN, all three deltas under 0.6px. The 2026-10-08 patch
//   had to make it a ratchet plus a soft clause, because #497 violated it at 13 of 14 states (worst dTop 36.9, dW 52).
//   RE-MEASURED at #549 on HEAD 37f44ea, trial md5 1f47e032b8e7: 0,0,0 at ALL 14 states (7 geometries x 2 cards),
//   and the hint line's own delta is 0,0,0 too - the float does what Kunal chose it for, so the clause is now HARD.
// B5c - US-R13 "the hint never tells me to look for a forcing move in a quiet position". QUIET is Kunal's answer
//   (Desk questions/B9-QUIET, 5 Nov 2026): the better move is not a check, a capture or a promotion. The predicate
//   (forcingKind) is the gate's own board arithmetic, unit-tested on 15 moves as B5c-PREDICATE; the per-card check
//   runs on every quiet captured card. THIS FIXTURE HAS NONE (e7b4 is a check, e6d7 a capture), so B5c prints that
//   it DID NOT RUN rather than passing; a fixture with a quiet better move is what makes it bite.
// CONTROL-RECORD: 42041fe 2026-11-11 total=62 red=1 scope=env:CT_GEO51=375x730 how=#550 item (61): chess.jsx's quiet-position hint ('No tactic to spot here - look for the move that improves your worst piece.') replaced by 'Look for a forcing move here: a check or a capture.' (trial 21eb8bf7bc84) - TC-R16 B5c[1/1] on the quiet card c6d4 red; every other line green
// CONTROL-RECORD: 6ebc189 2026-11-06 total=69 red=4 scope=env:CT_GEO51=375x730,320x568 how=#549 item (113) TC-R16 B11b, pz-float gains paddingBottom:40 once the card is solved so the board drops when the verdict lands, trial md5 6ab721ae0ed1 - FAIL TC-R16 B11b at 4 of 4 (dTop 40 and 36.5) with B11a green; the HEAD trial 1f47e032b8e7 reads 119 pass 0 fail over the full sweep
// CONTROL-RECORD: 03f1aea 2026-11-06 total=89 red=1 scope=full how=#549 item (13) TC-R103 A every-card form run against the #548 capture code (search on the card's own position, the first-move guard drops e6d7), trial md5 f2281c9d65cf - FAIL TC-R103 A (1 of 2); the fixed trial f29eb175f86d reads 90 pass 0 fail
'use strict';
const L=require('../lib');
// the stored-account path is the ONLY one that captures: the bare textarea import leaves meta null, so the
// userColor is null at the capture guard and nothing is captured at all (measured 2026-09-27). The user must
// be the LOSING side, which is also what makes this gate's frame coverage real - see B4.
const PGN=`[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.01"]
[White "Jsmiller1112"]
[Black "DukeKarlCountIsouard99"]
[Result "1-0"]
[WhiteElo "1523"]
[BlackElo "1487"]
[TimeControl "600"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
const ACCT={ct_accts:['cc:dukekarlcountisouard99'],ct_acctgames:{'cc:dukekarlcountisouard99':[{src:'cc',acct:'dukekarlcountisouard99',pgn:PGN,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr:'win',tc:'blitz',date:Date.now()-86400000}]},ct_pool:'3'};
// THE CANONICAL GEOMETRY SET, AND IT HAS A NAMED HOME (jobs/supported-geometry-names-two-different-sets-
// 2026-09-28, whose fix asks for the set to be "named once, in one place, with its members listed" and for
// every gate header to cite that one name - this paragraph is gate 51's half of that, and it is the half
// that needed no change).
//   ONE SET, TWO NAMES, RECONCILED AT #545 [item (13)]: claude/stories/USER-STORIES.md calls this set THE DRILL
//   SEVEN and this file calls it TA-7; they are the same seven, and gates/audit/geometry-sets.sh G1 holds them equal.
//   THE NAME: TA-7, the seven geometries prompts/test-authoring (tracker, version 7) names in its gate-
//   writing step, verbatim: 320x568, 360x640, 375x667, 375x730 (named there as the device; R19 settled 375x761), 390x844, 414x896, 440x956,
//   and "the harness geometry 375x679 is never used".
//   VERIFIED 2026-10-03 by reading that lane document rather than by reading another gate: ALLGEOS below is
//   TA-7 member for member, in that order. So this file's attribution is CORRECT.
//   AND THAT REVERSES THE JOB'S PREMISE, which is why it is written down here. The job reads this file's
//   attribution as the overreach ("51-drill-explain-why.js:67 goes further and attributes its list to
//   prompts/test-authoring"). Measured against the governing lane document, gate 51 is the only one of the
//   three sources that MATCHES it. The divergent set is gate 48's - 320x568, 375x568, 375x730, 390x844,
//   375x520, 320x520, 320x540 - which shares 3 of 7 with TA-7 and contains the short-corner band (520/540)
//   that TA-7 does not name at all. So the fix is not to re-name this list; it is to decide whether the
//   short-corner band is a SECOND named set and to say which set each story clause means. That belongs to
//   test-authoring and to the two files it owns, not here, and the finding is reported on the job.
// the seven geometries prompts/test-authoring names. 375x679 (the harness default 'kunal') is NOT one of them.
// CT_GEO51='375x730' narrows the sweep for a control run. The gate PRINTS the list it ran, every time, so a
// narrowed run can never be read as a full one - the #388 lesson is that a green whose scope is not stated is
// worth less than it looks. gates/gates.sh must NEVER set it.
const ALLGEOS=[{w:320,h:568,n:'320x568'},{w:360,h:640,n:'360x640'},{w:375,h:667,n:'375x667'},{w:375,h:730,n:'375x730 KUNAL',content:true},{w:390,h:844,n:'390x844'},{w:414,h:896,n:'414x896'},{w:440,h:956,n:'440x956'}];
const GEOS=process.env.CT_GEO51?ALLGEOS.filter(g=>process.env.CT_GEO51.split(',').some(x=>g.n.indexOf(x)===0)):ALLGEOS;
// the one geometry the content assertions run at, per the split. A10-R4 [antagonist A round 4]: the split was `g.n===CONTENT_GEO` with
// CONTENT_GEO='375x730 KUNAL' - a comparison of a geometry's DISPLAY LABEL, which r19-phone-geometry.sh's A4 could not see and which a
// relabel would turn into a silent NOT RUN of every content assertion. It is now a PROPERTY of the entry (content:true), and the label is
// read off that entry for messages only.
const CONTENT_GEO=(ALLGEOS.find(g=>g.content)||{n:'<no content geometry>'}).n;
const FIXED="That's the move you missed";                 // the string under test, the render site
const GENERIC_HINT='There was a better move than the one you chose.';  // the hint under test, same line
const SAN=/\b(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
// THE BAND WORDS. Kunal's five from 2026-09-20 (theSentenceDesign) map the ABSOLUTE eval, so they only
// describe a player who is AHEAD. #426 added their four mirror images because every mistake in a LOST game
// needs them, and the reference game is a lost game - see flags/amber-426-drill-why-sentence-shape call 1.
// Longest-first, so 'completely winning' is consumed before 'winning' can match inside it.
const BANDS=['completely winning','completely losing','clearly better','clearly worse','slightly better','slightly worse','winning','losing','level'];
const bandsIn=(s)=>{let t=' '+String(s).toLowerCase()+' ',hit=[];for(const b of BANDS){if(t.indexOf(b)>=0){hit.push(b);t=t.split(b).join(' ');}}return hit;};
// the verdict box: the deepest descendant of pz-top whose own trimmed text IS the verdict line. No data-ct
// exists for it (see the header); this reads real rendered content rather than an invented selector.
const verdictBox=(b)=>b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');if(!top)return null;
  const all=[...top.querySelectorAll('div,span')].filter(e=>{const t=(e.innerText||'').trim();return /^(?:🎉|✗)/.test(t)&&e.children.length===0;});
  const e=all[all.length-1];if(!e)return null;const r=e.getBoundingClientRect();const p=e.parentElement,pr=p.getBoundingClientRect();
  return {text:(e.innerText||'').replace(/\s+/g,' ').trim(),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,
          sw:e.scrollWidth,cw:e.clientWidth,esh:e.scrollHeight,ech:e.clientHeight,eovf:getComputedStyle(e).overflowY,epan:(()=>{for(let p=e;p&&p!==document.documentElement;p=p.parentElement){const ta=(getComputedStyle(p).touchAction||'auto').trim();if(/\bnone\b/.test(ta))return false;if(/\bpan-(x|left|right)\b/.test(ta)&&!/\bpan-(y|up|down)\b/.test(ta))return false;}return true;})(),ancCut:(()=>{const out=[];for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);if(cs.overflowY==='visible'&&cs.overflowX==='visible')continue;const q=a.getBoundingClientRect(),cb=q.top+a.clientTop+a.clientHeight;const canScroll=/auto|scroll/.test(cs.overflowY)&&a.scrollHeight>a.clientHeight+1;if(r.bottom>cb+1&&!canScroll)out.push({ct:a.dataset.ct||a.tagName,ovf:cs.overflowY,clipBottom:Math.round(cb*10)/10,msgBottom:Math.round(r.bottom*10)/10});}return out;})(),psh:p.scrollHeight,pch:p.clientHeight,pmax:getComputedStyle(p).maxHeight,povf:getComputedStyle(p).overflowY,pbottom:Math.round(pr.bottom*10)/10,vh:innerHeight,vw:innerWidth};});
// enter the drill and solve the ONE item the store was seeded with.
//
// #422 RUN, FIRST ATTEMPT, AND THE MISTAKE IS RECORDED RATHER THAN QUIETLY FIXED. This function first read
// the "hint" as the whole innerText of pz-top and walked the queue with 'Next >'. Both were wrong and the
// gate caught it on its own first red run:
//   (a) pz-top's innerText is the GOAL line ("you played cxb5 here, a mistake"), not o.hint. o.hint renders
//       only after the HINT BUTTON is pressed. So B5 and B10 went GREEN on #422 against the very generic hint
//       they exist to reject, and B10's "all different" was satisfied by the goal line's differing move name.
//       That is the vacuity shape this gate's header claims to design out, reproduced inside the gate itself
//       on its first run. B5/B10 now press the hint button and read what it puts on screen.
//   (b) walking with 'Next >' threw "no board on screen" at 360x640 item 2. The queue is now driven by SEEDING
//       ONE ENTRY per launch, which is deterministic at every geometry and cannot inherit a 'solved before'
//       state from the previous item either.
async function drillSolve(b,m){
  await b.tapText(/find the move you missed/,{wait:1500});
  await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
  const bdOpen=await b.board();   // B11: on open, BEFORE the hint button - see the board pair below
  // o.hint at the render site, reached the only way a player reaches it
  let hint='';
  try{await b.tapText(/^💡 Hint$/,{wait:900});
      hint=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return '';
        const c=[...t.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^💡/.test((e.innerText||'').trim()));
        return c.length?(c[c.length-1].innerText||'').replace(/\s+/g,' ').trim():'';});
  }catch(e){hint='<HINT BUTTON NOT REACHED: '+e.message.slice(0,60)+'>';}
  // THE BOARD PAIR, for B11 (US-R13's "without the board moving"). A jump is a DIFFERENCE between two states, so
  // the rect is read immediately BEFORE the solving move (hint already up, so the hint line is present in both
  // readings and is not a confound) and again once the verdict has landed. bdOpen is read on open, before the
  // hint, so the hint line's own effect is PRINTED as a separate delta and never folded into the clause's.
  const vtxt=()=>b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');if(!top)return null;
    const all=[...top.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^(?:\u{1F389}|\u2717)/u.test((e.innerText||'').trim()));
    return all.length?(all[all.length-1].innerText||'').replace(/\s+/g,' ').trim().slice(0,80):null;});
  const preVerdict=await vtxt();
  const bdPre=await b.board();
  const u=m.uci;await b.move(u.slice(0,2),u.slice(2,4),900);await b.settle(1100);
  const bdPost=await b.board();
  const postVerdict=await vtxt();
  return {hint,box:await verdictBox(b),bdOpen,bdPre,bdPost,preVerdict,postVerdict};
}
// the three deltas B11 reads, rounded to a tenth. null when either rect is missing - B11a is what refuses that.
const jump=(a,c)=>(!a||!c)?null:{dTop:Math.round((c.y-a.y)*10)/10,dLeft:Math.round((c.x-a.x)*10)/10,dW:Math.round((c.w-a.w)*10)/10};
const bfmt=(r)=>r?('top '+Math.round(r.y*10)/10+' left '+Math.round(r.x*10)/10+' w '+Math.round(r.w*10)/10):'no board';
// ===== B5c's PREDICATE: IS THE BETTER MOVE A CHECK, A CAPTURE OR A PROMOTION? ===========================
// Kunal, Desk questions/B9-QUIET, 5 Nov 2026 (decisions/a-drill-position-is-quiet-when-its-better-move-is-not-a-
// check-capture-or-promotion-2026-11-05): a drill position is QUIET when its better move is none of the three.
// Computed HERE from the stored fen and uci with a few lines of board arithmetic, NOT from the app's moveMotifs or
// whyShape - those are what produce the hint, so reading them would make the check and the thing checked one object.
// Check is decided on the WHOLE board after the move, so a discovered check and a castling rook's check count.
function forcingKind(fen,uci){
  const pa=String(fen).split(' '),ep=pa[3]||'-';const B=pa[0].split('/').map(row=>{const r=[];for(const ch of row){if(/\d/.test(ch)){for(let k=0;k<+ch;k++)r.push(null);}else r.push(ch);}return r;});
  const at=(s)=>({c:s.charCodeAt(0)-97,r:8-(+s[1])});const f=at(uci.slice(0,2)),t=at(uci.slice(2,4));const p=B[f.r]&&B[f.r][f.c];if(!p)return null;
  const white=p===p.toUpperCase(),pawn=/p/i.test(p),mine=(x)=>!!x&&(white?x===x.toUpperCase():x===x.toLowerCase());
  let capture=!!B[t.r][t.c];
  if(pawn&&f.c!==t.c&&!B[t.r][t.c]&&ep===uci.slice(2,4)){capture=true;B[f.r][t.c]=null;}   // en passant lands on an EMPTY square
  const promotion=uci.length>4||(pawn&&(t.r===0||t.r===7));
  B[t.r][t.c]=uci.length>4?(white?uci[4].toUpperCase():uci[4].toLowerCase()):p;B[f.r][f.c]=null;
  if(/k/i.test(p)&&Math.abs(t.c-f.c)===2){const rc=t.c>f.c?7:0,nc=t.c>f.c?5:3;B[f.r][nc]=B[f.r][rc];B[f.r][rc]=null;}
  let kr=-1,kc=-1;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(B[r][c]===(white?'k':'K')){kr=r;kc=c;}
  if(kr<0)return null;
  const on=(r,c)=>r>=0&&r<8&&c>=0&&c<8,is=(r,c,re)=>on(r,c)&&mine(B[r][c])&&re.test(B[r][c]);
  let check=false;const pr=white?kr+1:kr-1;                       // a white pawn attacks toward rank 8 (row 0)
  if(is(pr,kc-1,/p/i)||is(pr,kc+1,/p/i))check=true;
  for(const [dr,dc] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])if(is(kr+dr,kc+dc,/n/i))check=true;
  for(const [dr,dc,re] of [[1,0,/[rq]/i],[-1,0,/[rq]/i],[0,1,/[rq]/i],[0,-1,/[rq]/i],[1,1,/[bq]/i],[1,-1,/[bq]/i],[-1,1,/[bq]/i],[-1,-1,/[bq]/i]]){
    let r=kr+dr,c=kc+dc;while(on(r,c)&&!B[r][c]){r+=dr;c+=dc;}if(is(r,c,re))check=true;}
  return {check,capture,promotion,quiet:!check&&!capture&&!promotion};
}
// the hints that send the player hunting for a forcing move. mistakeHint's own vocabulary plus the generic and the
// puzzle-hint wording, so a hint copied from either path onto a quiet card is caught. A FORK hint ("one move can hit
// two things at once") is NOT here: a quiet fork is a threat, not a check, capture or promotion, and the decision
// draws the line at those three.
const FORCING_HINT=/forcing|\bcheck|captur|material to be taken|ends the game|promot|closer to the end|uncover/i;
L.run(async()=>{
  // ===== PHASE 1: THE CAPTURE. A real review, by the app, into localStorage. =============================
  const b=await L.launch({geo:{w:375,h:730,safe:''},name:'drill-explain',store:ACCT});await b.open();
  const stamp=await b.stamp();L.note('bundle on the page: '+stamp);
  L.note('GEOMETRIES THIS RUN: '+GEOS.map(g=>g.n).join(', ')+(process.env.CT_GEO51?('   *** NARROWED by CT_GEO51='+process.env.CT_GEO51+' - this run does NOT cover the full sweep ***'):'   (full sweep)'));
  L.note('SPLIT: content assertions run at '+CONTENT_GEO+' only (no viewport term in the sentence); B6/B7/B8 (the FIT) run at every geometry above.');
  await b.tile('Review');await b.settle(700);
  await b.page.locator('button',{hasText:/Review ›/}).first().click();
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(1200);
  const mis=await b.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mymistakes')||'[]'));
  L.note('ct_mymistakes captured by the app: '+mis.length+'  '+JSON.stringify(mis.map(m=>({uci:m.uci,played:m.played,label:m.label,why:m.why===undefined?'<ABSENT>':String(m.why),hint:m.hint===undefined?'<ABSENT>':String(m.hint)}))));
  // WHICH ENGINE BRANCH ACTUALLY PRODUCED THIS CAPTURE. chess.jsx:3965 stamps the reviewed game with
  // engine:'sf' or engine:'fallback'. This gate's whole sentence contract is measured on the sf branch
  // only (see "THE ENGINE BRANCH" in the header), so the branch is READ and asserted rather than assumed.
  const _eng=await b.page.evaluate(()=>{try{const g=JSON.parse(localStorage.getItem('ct_gamestats')||'{}');
    const r=Object.values(g).filter(x=>x&&x.src==='review');return r.length?{n:r.length,engine:String(r[r.length-1].engine)}:{n:0,engine:'<NO REVIEW ROW>'};}catch(e){return {n:-1,engine:'<UNREADABLE: '+e.message.slice(0,40)+'>'};}});
  L.note('engine branch that produced this capture: '+_eng.engine+'  (review rows in ct_gamestats: '+_eng.n+')');
  L.say(_eng.engine==='sf','TC-R16 A0e the capture was produced by the POOLED STOCKFISH branch, which is the only branch this gate covers - if this is "fallback" the run measured the branch the header says it cannot reach, and its sentence assertions below are reporting on uncovered code',{engine:_eng.engine,reviewRows:_eng.n,ct_pool:'3'});
  L.say(mis.length>=2,'TC-R16 A1 the app captured at least 2 of the user\'s own mistakes from a REAL review - this is the gate\'s input count, and every A-assertion below runs over all of them',{captured:mis.length,inputs:mis.length});
  // TC-R103 [#548 item (125); jobs/mistake-drill-is-single-move-by-construction-2026-09-28, Kunal's feature 2]: EACH CAPTURED MISTAKE
  // CARRIES THE NEXT TWO OR THREE MOVES OF THE BETTER LINE, from the app's own engine search on the card's position - read out of the
  // store the review wrote, not seeded. Each `line` is 2 or 3 SAN plies, numbered, and never repeats the better move it follows.
  {const withLine=mis.filter(m=>typeof m.line==='string'&&m.line.trim());
   // EVERY CARD, SINCE #549 item (13). #548 asked for 'at least half', reading the 1-of-2 it measured as a one-ply pv carried by design.
   // MEASURED at #549 it was not: the e6d7 card's search ran on the card's own position and returned f6d7 first at 300ms AND at 900ms (two
   // runs, raw pv printed), so the app's first-move guard dropped it - a defect, not a short line. The app now searches AFTER the better
   // move. The only card that may carry none is one whose better move leaves no legal reply (mate or stalemate); neither fixture card does
   // (10...Qb4+ and 15...Qxd7 both leave White moves), so A asks for every captured card here.
   L.say(mis.length>0&&withLine.length===mis.length,'TC-R103 A every captured mistake carries the better line\'s continuation ('+withLine.length+' of '+mis.length+')',mis.map(m=>({uci:m.uci,line:m.line===undefined?'<ABSENT>':m.line})));
   const bad=withLine.filter(m=>{const t=m.line.trim().split(/\s+/).map(x=>x.replace(/^\d+(\.|\u2026)/,''));return t.length<2||t.length>3||!/^\d+(\.|\u2026)/.test(m.line.trim());});
   L.say(withLine.length>0&&bad.length===0,'TC-R103 A2 each continuation is 2 or 3 plies of numbered SAN',{bad:bad.map(m=>m.line)});
   // A2 IS A SHAPE, AND A SHAPE IS NOT A VALUE [#548 round-1 antagonist A veto]: the first draft printed '2.Qxb4 Bxb4+ 3.c3' for a card
   // at Black's 10th move, because toFEN always writes ' 0 1'. A2b pins the NUMBER to the fixture game itself (PGN above): 10...Qb4 for
   // 10...cxb5 continues 11.Qxb4, and 15...Qxd7 for 15...Nxd7 continues 16.<White>. Each line's first move number is read and compared.
   const WANT={e7b4:'11',e6d7:'16'};const known=withLine.filter(m=>WANT[m.uci]);
   const wrongNo=known.filter(m=>(m.line.trim().match(/^(\d+)/)||[])[1]!==WANT[m.uci]);
   L.say(known.length>0&&wrongNo.length===0,'TC-R103 A2b each continuation is numbered from the GAME, not from move 1 ('+known.map(m=>m.uci+' '+m.line.split(' ')[0]).join(', ')+')',{known:known.length,wrong:wrongNo.map(m=>({uci:m.uci,line:m.line,want:WANT[m.uci]}))});}
  const N=mis.length;
  for(let i=0;i<N;i++){const m=mis[i],w=m.why;
    L.say(typeof w==='string'&&w.trim().length>0,'TC-R16 A2['+(i+1)+'/'+N+'] the captured mistake carries a non-empty `why` (the capture site must store it, as the Brilliant branch does three lines below)',{uci:m.uci,played:m.played,why:w===undefined?'<FIELD ABSENT>':w});
    if(typeof w!=='string')continue;
    L.say(w.indexOf(m.played)>=0,'TC-R16 A3['+(i+1)+'/'+N+'] clause two names the move the player ACTUALLY PLAYED, so the sentence is a comparison and not a description',{played:m.played,why:w});
    const others=(w.match(SAN)||[]).filter(s=>s!==m.played);
    L.say(others.length>0,'TC-R16 A4['+(i+1)+'/'+N+'] clause one names a move OTHER than the one played - the solution',{played:m.played,otherMoves:others.slice(0,4)});
    const bs=bandsIn(w);
    // ==================== THE BAND ASSERTION, CORRECTED AT #426. READ THIS BEFORE CHANGING IT. ===========
    // AS HANDED, A5 and B4 required TWO DISTINCT bands, because Kunal's sentence design writes
    // "<played> let it slip from <band before> to <band after>" and that phrasing assumes the mistake moved
    // the position ACROSS a band boundary. MEASURED on this gate's own two inputs, in the player's frame,
    // that assumption is false 2 times out of 2: both of the reference game's mistakes stay inside one band
    // (the game is already lost, and a 1.7-pawn swing at -4 or -7 does not cross 3 or 6). The numbers this
    // run measured are printed in the note above and in the A5 rows below.
    // So a fix cannot satisfy "two distinct bands" on these inputs WITHOUT NAMING THE SAME BAND TWICE
    // ("from losing to losing"), which the authoring lane itself called nonsense (Q4 in
    // docs/drill-explain-why-it-was-better-lane, routed to Kunal, still unanswered, no Desk item).
    // This is NOT the assertion being weakened to get green - CLAUDE.md forbids that and it is the right
    // rule. It is an assertion whose DESIGN ASSUMPTION was falsified by measurement, corrected to the
    // property that is actually true and still discriminating: clause two must name AT LEAST ONE band, and
    // where the two bands DIFFER it must name BOTH. Its negative-control power is unchanged and checked:
    // NC3 (engine units - "cost +1.7 (centipawn loss 170)") yields ZERO bands and still FAILS here; NC1
    // (one sentence reused on every mistake) still fails A7/B9; NC2 still fails A3. What it no longer does
    // is fail a CORRECT sentence about a position that did not change band, which is what it did on #426's
    // fix before this correction.
    // Q4 is filed as flags/gate51-A5-B4-assume-a-mistake-crosses-a-band-boundary-2026-09-28 for the
    // authoring lane and the orchestrator. If Kunal answers Q4 with a wording that always names two bands,
    // restore the stricter form.
    L.say(bs.length>=1,'TC-R16 A5['+(i+1)+'/'+N+'] clause two names at least one eval band IN WORDS, and both when the move changed band (corrected at #426 - see the paragraph above this assertion; as handed it demanded two distinct bands and 2 of 2 real inputs do not cross a boundary)',{bands:bs,why:w});
    L.say(!/centipawn|\bcpl?\b|[+-]\d+\.\d/i.test(w),'TC-R16 A6['+(i+1)+'/'+N+'] no engine units leak into a player\'s sentence: no centipawns and no signed decimal eval',{why:w});
    // #426: the FRAME. This is the defect test-authoring's scratch bundle exposed and the reason the naive
    // fix is wrong: the evals are in WHITE's frame, so a losing BLACK player was told the game went "from
    // winning to winning". The user in this fixture is Black and is losing at both captured plies, so no
    // band in either sentence may be a winning-side word. This assertion is the whole point of reviewing
    // the game as the LOSING side, and it cannot pass by accident.
    L.say(bs.length>0&&bs.every(x=>x==='level'||/worse|losing/.test(x)),'TC-R16 A8['+(i+1)+'/'+N+'] THE FRAME: the user is BLACK and losing at this ply, so every band named is a losing-side word - a White-frame eval prints "winning" here and is the defect the scratch fix shipped',{bands:bs,why:w});
    // ================= A9: THE FALLBACK-ENGINE PIN (#426 antagonist B, P0-1). =========================
    // This is the assertion jobs/veto-fixes-land-with-no-assertion-because-the-gate-is-frozen-pre-veto-
    // 2026-09-28 asked for as part 1, first item, and its absence is why that veto round added 0 assertions
    // to this suite. The defect: the fallback engine's out.push omitted evalBefore (chess.jsx:3940-3949),
    // mistakeWhy() saw undefined, treated it as 0 and printed a FABRICATED starting band - "went from
    // level" - on every fallback sentence, including one that told a player being mated in six that he was
    // "slightly better". A8 above cannot catch it, because A8's own predicate ALLOWS 'level'.
    // THE TWO PROPERTIES, both read off the shipped builder rather than guessed:
    //  (a) 'level' is whyBand() |v|<0.5 (chess.jsx:796-801). The user here is BLACK and materially lost at
    //      both captured plies - the same premise A8 rests on and which A8's own pass re-establishes every
    //      run - so NO honest band in either sentence is 'level'. A 'level' here is either the fabricated
    //      evalBefore above or a White-frame read, and both are defects.
    //  (b) THE SHAPE FOLLOWS THE DATA. chess.jsx:877 emits 'went from <bB> to <bA>' only when evalBefore is
    //      a real number AND the two bands DIFFER, and 'left you <bA>' otherwise. So 'went from' must be
    //      followed by two DISTINCT bands, and a sentence naming one band must not say 'went from'. This
    //      pins the haveB branch itself, so putting evalBefore back out of that push is visible here even
    //      where the fabricated band would have been a losing-side word and slipped past (a).
    // Neither property is a restatement of A5/A8: NC3 (engine units) yields zero bands and fails A5 before
    // reaching here, and a correct sentence on a band-crossing mistake satisfies both.
    L.say(bs.indexOf('level')<0,'TC-R16 A9a['+(i+1)+'/'+N+'] no band is "level": the user is Black and materially lost at this ply, so a "level" band is a fabricated evalBefore (the fallback-engine P0-1) or a White-frame eval, never an honest read',{bands:bs,why:w});
    const _wf=/\bwent from\b/.test(w);
    L.say(_wf?(bs.length>=2&&new Set(bs).size>=2):!_wf||bs.length>=2,'TC-R16 A9b['+(i+1)+'/'+N+'] the sentence SHAPE follows the data: "went from X to Y" is emitted only when evalBefore is a real number and the two bands differ (chess.jsx:877), so a "went from" sentence names two DISTINCT bands',{saysWentFrom:_wf,bands:bs,distinct:new Set(bs).size,why:w});
    L.say(_wf||/\bleft you\b/.test(w),'TC-R16 A9c['+(i+1)+'/'+N+'] a sentence that does NOT say "went from" uses the one-band form "left you <band>" - the only other branch the builder has',{saysWentFrom:_wf,why:w});
  }
  const whys=mis.map(m=>String(m.why||''));
  L.say(new Set(whys).size===N,'TC-R16 A7 the '+N+' whys are all DIFFERENT - one sentence reused on every mistake is the generic-hint defect again (escapes/generic-hint-on-every-mistake-2026-09-20, -8)',{distinct:new Set(whys).size,of:N});
  await b.close();

  // ===== PHASE 1B: THE FEN-KEYED STORE MERGE. ============================================================
  // SUITE ADMISSION [R36]: PHASE 1B IS ADMITTED. Measured 2026-10-09 by process-build-3__1791584824170
  // against origin/main 65d3b9a's OWN committed bundle, app.js md5 ebb88c8f76f7, on the pooled Stockfish
  // branch. THREE CONSECUTIVE FULL RUNS, no narrowing and no CT_GEO51: 80 pass / 0 fail each, and the
  // PASS/FAIL set is BYTE-IDENTICAL across all three INCLUDING every payload object - md5 ffc7d0ccc6ca648f
  // over the full lines, f750a072a0973170 over verdict and text alone, and 297051ee6fba812b over A10, A11
  // and A12's own three lines. Wall clock 150 s, 148 s, 150 s. A0e was GREEN in all three (engine 'sf') and
  // A1 read captured 2 / inputs 2 - which is exactly the tree state the admission condition below NAMED, so
  // this is the measurement that was asked for and not a near neighbour of it. Criterion 2 is already paid:
  // PHASE 1B runs inside this gate's own existing run and adds no section and no browser to the suite.
  // Criterion 3 is the defect Kunal reported twice, recorded four paragraphs below.
  // THE COMMAND, because a count with no scope cannot be checked: `node gates/regress/51-drill-explain-why.js`
  // with no CT_* set, three times, on a tree at 65d3b9a with gates/node_modules installed.
  // WHY IT WAS A CANDIDATE UNTIL TODAY - KEPT RATHER THAN DELETED, because the history is the useful part.
  // Two runs on the same tree (f3ae36a, #473) disagreed about A11: the narrowed run at CT_GEO51=375x730 read
  // why '<FIELD ABSENT>' and went RED; the full seven-geometry run two minutes later read the upgraded
  // sentence and went GREEN, with A10 and A12 green in both. Nothing about the tree or this block changed
  // between them. The cause was upstream and A1 showed it: the capture set itself varies on the minimax
  // fallback branch (1 mistake where this gate's header claims a measured 2), so whether a fresh capture
  // lands on the seeded fen - the precondition for the merge to have anything to upgrade - was not determined.
  // SO THE ADMISSION IS SCOPED, AND SAYING SO IS THE POINT: it is admitted ON THE POOLED STOCKFISH BRANCH,
  // which is the branch A0e already requires this whole gate to be reporting on. A run where A0e is RED is a
  // run on uncovered code, and this block's determinism is NOT claimed there. If the fallback branch is ever
  // brought into this gate's coverage, PHASE 1B's determinism has to be re-measured on it before it carries
  // over; nothing here says it will hold.
  // THE ADMISSION WAS NOT BOUGHT BY HAND-SEEDING THE FRESH CAPTURE - that would re-create the vacuity shape
  // PHASE 1 exists to design out, because the sentence the merge is asked to copy would then be the fixture's
  // own. Not one assertion, selector, threshold or fixture in this block changed; only this declaration did,
  // which is why the three runs measure the same code the previous reading measured.
  // AND THE REGISTER DOES NOT AGREE WITH THIS YET, WHICH IS SAID HERE RATHER THAN LEFT TO BE DISCOVERED
  // [R45 shape (2), a gate against its register]. claude/stories/TEST-CASES.md's TC-R16 row still reads
  // "A10/A11/A12 (PHASE 1B, a CANDIDATE under R36 and not admitted - see below)" and ends "PHASE 1B still
  // needs three green runs on a tree where A0e is green before admission", and "R36: deterministic across
  // 3 runs NOT yet measured". All three of those sentences are refuted by the measurement above, and the
  // row was NOT corrected in the same change for one mechanical reason: claims/art-claude-stories-TEST-CASES-md
  // was held open by the live build run build__1791577208000 from 20:30:00Z to 23:30:00Z, and R44 gives one
  // agent one artefact. So this declaration is the NEWER of the two and the register row is the stale one.
  // The register edit is one row, it is owed, and it is named as the remaining step on
  // jobs/gate-51-fallback-column-assertions-written-and-three-are-red-on-main-2026-10-03.
  // A FIRST READING OF THE RED WAS WRONG AND IS WITHDRAWN HERE RATHER THAN QUIETLY DROPPED [R18]: it was
  // filed as "the #426 P0-3 merge may not work". The second run refutes that - the merge upgrades in place
  // and preserves ts, played and last exactly as designed. The defect is this block's determinism, not the
  // app's merge.
  // jobs/veto-fixes-land-with-no-assertion-because-the-gate-is-frozen-pre-veto-2026-09-28, fix part 1,
  // SECOND item, and the build's own RUN-LOG calls this antagonist B's most valuable finding of #426:
  // "without it this build would have shipped and changed nothing he could see." The merge at chess.jsx:
  // 3996-4005 is fen-keyed and USED TO DROP every position it already held, so an entry captured by a
  // pre-#426 build stayed without a `why` for ever - and the ~148 mistakes already in Kunal's store were
  // exactly the ones that produced his complaint, twice. A solved card is also deleted from the queue, so
  // there is no second chance. The fix UPGRADES an existing entry in place when a fresh capture of the same
  // position carries a sentence it lacks, and touches nothing else about it.
  // WHY THIS IS NOT THE VACUITY SHAPE THE HEADER DESIGNS OUT: the legacy row is built by STRIPPING `why`
  // and `hint` off what PHASE 1 harvested, so the fen is the app's own and the `why` that must appear is
  // the app's own too. Nothing is hand-written except the absence being tested for, and the sentinel ts/
  // last/played values that prove the row was upgraded rather than replaced.
  if(N>0){
    const legacy={...mis[0]};delete legacy.why;delete legacy.hint;
    legacy.ts=1600000000000;legacy.played=String(mis[0].played||'');legacy.last=mis[0].last||null;
    const b2=await L.launch({geo:{w:375,h:730,safe:''},name:'drill-explain-merge',store:{...ACCT,ct_mymistakes:[legacy]}});await b2.open();
    L.note('PHASE 1B seeded a legacy row: fen='+String(legacy.fen).slice(0,40)+'...  why=<STRIPPED>  hint=<STRIPPED>  ts='+legacy.ts);
    await b2.tile('Review');await b2.settle(700);
    await b2.page.locator('button',{hasText:/Review ›/}).first().click();
    await b2.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b2.settle(1200);
    const after=await b2.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mymistakes')||'[]'));
    const row=after.filter(x=>x&&x.fen===legacy.fen);
    L.note('PHASE 1B store after re-review: '+after.length+' rows, '+row.length+' at the seeded fen  '+JSON.stringify(row.map(x=>({why:x.why===undefined?'<ABSENT>':String(x.why).slice(0,60),hint:x.hint===undefined?'<ABSENT>':'<present>',ts:x.ts,played:x.played}))));
    L.say(row.length===1,'TC-R16 A10 re-reviewing the same game leaves exactly ONE row at the seeded position - the merge upgrades in place and does not duplicate the entry',{rowsAtFen:row.length,totalRows:after.length});
    const r0=row[0]||{};
    L.say(typeof r0.why==='string'&&r0.why.trim().length>0,'TC-R16 A11 THE MERGE: a pre-#426 entry that was stored WITHOUT a `why` carries one after a re-review of the same game - the fen-keyed merge used to drop every position it already held, which left the ~148 mistakes already in the store permanently unexplained and is the defect Kunal reported twice',{why:r0.why===undefined?'<FIELD ABSENT>':r0.why});
    L.say(r0.ts===legacy.ts&&String(r0.played)===String(legacy.played),'TC-R16 A12 the upgrade is IN PLACE and not a replacement: ts, played and last are the legacy row\'s own values, so a solved-before card is not silently re-dated or re-queued by the merge',{ts:r0.ts,expectedTs:legacy.ts,played:r0.played,expectedPlayed:legacy.played});
    await b2.close();
  } else { L.say(false,'TC-R16 A10/A11/A12 PHASE 1B did not run: phase 1 harvested no mistake to build a legacy row from'); }

  // ===== B5c's PREDICATE, UNIT-TESTED BEFORE IT IS TRUSTED [CLAUDE.md: enumerate what can be produced, including
  // what the predicate must reject]. Every class the decision names, plus the two that a naive test misses: en passant
  // (lands on an empty square) and a check the moving piece does not give (discovered, and the castling rook).
  {
    const U=[['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','e2e4','quiet'],['4k3/8/8/8/8/8/8/R5K1 w - - 0 1','g1g2','quiet'],
             ['4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1','e4d5','capture'],['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','e5d6','capture'],
             ['8/P7/7k/8/8/8/8/4K3 w - - 0 1','a7a8q','promotion'],['4k3/8/8/8/8/8/8/R3K3 w - - 0 1','a1a8','check'],
             ['4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1','e4c3','check'],['5k2/8/8/8/8/8/8/4K2R w K - 0 1','e1g1','check'],
             ['4k3/8/8/8/8/7K/3p4/8 b - - 0 1','d2d1q','promotion'],['4k3/8/8/8/8/8/p7/4K3 b - - 0 1','e8e7','quiet'],['4k3/8/8/8/8/5p2/8/4K3 b - - 0 1','f3f2','check'],['4k3/8/8/8/1n6/8/8/4K3 b - - 0 1','b4d3','check'],
             ['4k3/8/8/8/8/8/8/3K4 b - - 0 1','e8d8','quiet'],['4k3/8/8/8/8/2n5/8/4K3 b - - 0 1','c3d1','quiet'],['4k3/8/8/8/8/2n5/8/K7 b - - 0 1','c3b5','quiet']];
    const bad=U.map(([f,u,want])=>{const k=forcingKind(f,u);const got=!k?'null':k.quiet?'quiet':k.check?'check':k.capture?'capture':'promotion';return got===want?null:{fen:f,uci:u,want,got};}).filter(Boolean);
    L.say(bad.length===0,'TC-R16 B5c-PREDICATE the quiet test classifies '+U.length+' known moves correctly - quiet, capture (en passant too), promotion (both colours), and check (direct, by a pawn and a knight, discovered, by the castling rook)',{cases:U.length,wrong:bad});
  }
  // ===== PHASE 1Q: A CAPTURE WITH A QUIET BETTER MOVE, SO B5c HAS AN INPUT [#550 item (61)] ====================
  // jobs/clauses-cite-assertions-that-do-not-assert-them-2026-09-28's one remainder: this file's reference game captures two mistakes and
  // both better moves are forcing, so B5c printed DID NOT RUN on every geometry. A second REAL review supplies the input: the reference
  // game of jobs/the-sel-cls-split-...-2026-09-30 (pgnForRepro), reviewed by the app as Black through a stored account. Measured on
  // #550 trial t10: it captures 6 mistakes and the first, 3...Nd4 (c6d4 on r1bq1bnr/ppp2kpp/2n5/3Pp3/8/2N5/PPPP1PPP/R1B1KBNR b), is
  // QUIET by forcingKind. Each quiet card is drilled the way a player reaches its hint (drillSolve), at Kunal's phone, and B5c runs on it.
  // Its denominator is its own line, and the card set is read from the store the review wrote, never seeded.
  {const QPGN='[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2026.09.01"]\n[White "Jsmiller1112"]\n[Black "Crusher9000"]\n[Result "0-1"]\n[TimeControl "600"]\n\n1. e4 e5 2. Qh5 Nc6 3. Qxf7+ Kxf7 4. Nc3 d5 5. exd5 Qxd5 6. Be2 Qxg2 7. Nf3 Qxh1+ 8. Bf1 Nf6 9. d3 Bd6 10. Bg5 Qg2 11. Bxf6 gxf6 12. Ne4 Bb4+ 13. c3 Bxc3+ 14. bxc3 Qxf1+ 15. Kd2 Qxa1 0-1\n';
   const QACCT={ct_accts:['cc:crusher9000'],ct_acctgames:{'cc:crusher9000':[{src:'cc',acct:'Crusher9000',pgn:QPGN,white:'Jsmiller1112',black:'Crusher9000',wr:'win',tc:'rapid',date:Date.now()-86400000}]},ct_pool:'3'};
   const q=await L.launch({geo:'kunal761',name:'drill-quiet-capture',store:QACCT});await q.open();let qmis=[];
   try{await q.tile('Review');await q.settle(700);await q.page.locator('button',{hasText:/Review ›/}).first().click();
     await q.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await q.settle(1200);
     qmis=await q.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mymistakes')||'[]'));}catch(e){L.note('PHASE 1Q capture threw: '+String(e).slice(0,120));}
   await q.close();
   const QTAG=L.GEOS.kunal761.w+'x'+L.GEOS.kunal761.h;
   const quiet=qmis.filter(m=>{const k=forcingKind(m.fen,m.uci);return k&&k.quiet;});
   L.note('PHASE 1Q captured '+qmis.length+': '+JSON.stringify(qmis.map(m=>({uci:m.uci,played:m.played,kind:forcingKind(m.fen,m.uci)}))));
   L.say(quiet.length>=1,'TC-R16 B5c DENOMINATOR a real review captured at least one mistake whose better move is QUIET ('+quiet.length+' of '+qmis.length+' from the second reference game) - without it B5c has no input, as on the first fixture',{quiet:quiet.map(m=>m.uci)});
   for(let i=0;i<quiet.length;i++){
     const c=await L.launch({geo:'kunal761',name:'drill-quiet-'+i,store:{ct_mymistakes:[quiet[i]],ct_pool:'3'}});await c.open();
     let r=null;try{await c.tile('Review');await c.settle(700);r=await drillSolve(c,quiet[i]);}catch(e){r={hint:'<DRILL NOT REACHED: '+String(e).slice(0,60)+'>'};}
     L.say(!!r&&r.hint.length>0&&r.hint.indexOf('<')!==0,'TC-R16 B5c['+(i+1)+'/'+quiet.length+'] '+QTAG+' PRECONDITION the hint button put a hint on screen on the quiet card '+quiet[i].uci,{hint:r&&r.hint});
     L.say(!!r&&r.hint.length>0&&r.hint.indexOf('<')!==0&&!FORCING_HINT.test(r.hint),'TC-R16 B5c['+(i+1)+'/'+quiet.length+'] '+QTAG+' QUIET POSITION (the better move '+quiet[i].uci+' is not a check, a capture or a promotion): the hint on screen does not tell the player to look for a forcing move ("'+(r&&r.hint)+'")',{hint:r&&r.hint});
     await c.close();}
  }
  // ===== PHASE 2: THE RENDER. Content at one geometry, the FIT at all of them. ===========================
  for(const g of GEOS){
    const seen=[],hints=[];const isC=(g.content===true);let quietN=0;
    for(let i=0;i<N;i++){
      // ONE entry seeded, so the drill opens on it: deterministic, and no 'solved before' carry-over.
      const c=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'drill-'+g.n.replace(/\s+/g,'_')+'-'+i,store:{ct_mymistakes:[mis[i]],ct_pool:'3'}});await c.open();
      await c.tile('Review');await c.settle(700);
      const r=await drillSolve(c,mis[i]);
      if(!r.box){L.say(false,'TC-R16 B0['+(i+1)+'] '+g.n+' the verdict box was not on screen after solving - nothing to measure');await c.close();continue;}
      const t=r.box.text;seen.push(t);hints.push(r.hint);
      L.note(g.n+' item '+(i+1)+' verdict: '+t);
      L.note(g.n+' item '+(i+1)+' hint:    '+r.hint);
      if(isC){
        L.say(t.indexOf(FIXED)<0||t.length>FIXED.length+40,'TC-R16 B1['+(i+1)+'/'+N+'] '+g.n+' the verdict is more than the fixed praise string - it carries an explanation',{len:t.length,text:t});
        L.say(t.indexOf(mis[i].played)>=0,'TC-R16 B2['+(i+1)+'/'+N+'] '+g.n+' the explanation ON SCREEN names what the player played',{played:mis[i].played,text:t});
        L.say((t.match(SAN)||[]).filter(s=>s!==mis[i].played).length>0,'TC-R16 B3['+(i+1)+'/'+N+'] '+g.n+' the explanation ON SCREEN names the better move',{text:t});
        L.say(bandsIn(t).length>=1,'TC-R16 B4['+(i+1)+'/'+N+'] '+g.n+' the explanation ON SCREEN names at least one eval band (corrected at #426 with A5 - see that paragraph)',{bands:bandsIn(t),text:t});
        if(mis[i].line)L.say(t.indexOf('It goes on '+mis[i].line)>=0,'TC-R103 B['+(i+1)+'/'+N+'] '+g.n+' the solved card shows what the better move led to - "It goes on '+mis[i].line+'"',{line:mis[i].line,text:t});
        L.say(r.hint.length>0&&r.hint.indexOf('<HINT BUTTON NOT REACHED')<0,'TC-R16 B5a['+(i+1)+'/'+N+'] '+g.n+' the hint button put a hint on screen at all - without this the assertion below measures nothing',{hint:r.hint});
        L.say(r.hint.length>0&&r.hint.indexOf(GENERIC_HINT)<0,'TC-R16 B5b['+(i+1)+'/'+N+'] '+g.n+' o.hint is NOT the fixed directive string that fired on every one of 148 captured mistakes. "Look for the most forcing option" misdirects on every quiet position, and Kunal promoted this from secondary to equal first on 2026-09-20',{hint:r.hint});
        // B5c: US-R13's second hint claim, now that "quiet" is a definition (Kunal, 5 Nov 2026): on a card whose better move
        // is not a check, a capture or a promotion, the hint on screen does not send the player looking for one.
        const fk=forcingKind(mis[i].fen,mis[i].uci);
        L.note(g.n+' item '+(i+1)+' better move '+mis[i].uci+' is '+(fk?JSON.stringify(fk):'<NOT CLASSIFIED>'));
        if(fk&&fk.quiet){quietN++;L.say(!FORCING_HINT.test(r.hint),'TC-R16 B5c['+(i+1)+'/'+N+'] '+g.n+' QUIET POSITION (the better move '+mis[i].uci+' is not a check, a capture or a promotion): the hint on screen does not tell the player to look for a forcing move',{hint:r.hint,kind:fk});}
        else L.note(g.n+' item '+(i+1)+' TC-R16 B5c NOT APPLICABLE: the better move is forcing ('+JSON.stringify(fk)+'), so a forcing hint is allowed here');
      }
      // THE FIT, AT EVERY GEOMETRY. The verdict box is maxHeight 74 with overflowY auto, so a two-clause
      // sentence that is too long is CLIPPED rather than wrapped and the player sees part of it. This is the
      // assertion that made jobs/drill-verdict-box-74px-cap-clips-the-new-explanation-2026-09-27 a
      // measurement instead of a prediction: it was RED on the scratch fix (scrollHeight 91 and 113 against
      // clientHeight 74 at Kunal's phone, a 114- and a 136-character string). Measured, not read.
      L.say(r.box.sw<=r.box.cw+1,'TC-R16 B6['+(i+1)+'/'+N+'] '+g.n+' the verdict text is not truncated sideways (scrollWidth <= clientWidth)',{sw:r.box.sw,cw:r.box.cw});
      /* #547 item (48): Kunal chose FLOAT (questions/drill-verdict-float-or-slot-2026-10-10, 11 Oct): the verdict is absolute over the goal
         card and a long one RUNS DOWN OVER THE BOARD IN FULL, its parent overflow:visible. So "fits the parent" no longer describes the
         design - measured 91.3px over a 62px pz-float at 390x844, by intent - and B7 asserts what it always protected: no line of the
         explanation is CUT. Either it fits a parent that clips, or the parent does not clip and the message box itself holds all its text. */
      /* #547, ANTAGONIST A's A2: the first version only looked at the message and its parent, so with both overflow:visible (all 18 rows,
         every geometry) it was a constant. It now ALSO walks every ancestor that clips: the text is cut if any of them ends above the
         message's bottom and cannot be scrolled to show the rest (overflow hidden, or no room). In landscape the verdict sits in an
         auto scroller with 96px spare - a longer verdict there is reachable by scrolling and is not "cut"; a hidden box is. */
      const _cut=((r.box.povf!=='visible')?(r.box.psh>r.box.pch+1):(r.box.esh>r.box.ech+1&&(!/^(visible|auto|scroll)$/.test(r.box.eovf)||(/^(auto|scroll)$/.test(r.box.eovf)&&!r.box.epan)))/* cross-read A(1): a scroller a FINGER cannot pan (touch-action) still cuts *//* #547 B1: pz-msg is now a scroller at the reserve - auto/scroll is REACHED by scrolling, not cut */)||(r.box.ancCut&&r.box.ancCut.length>0);
      L.say(!_cut,'TC-R16 B7['+(i+1)+'/'+N+'] '+g.n+' the whole explanation is SHOWN - no clipping box cuts it (a clipping parent: scrollHeight <= clientHeight; the float, whose parent does not clip: the message box itself is not cut)',{scrollHeight:r.box.psh,clientHeight:r.box.pch,maxHeight:r.box.pmax,overflowY:r.box.povf,msgScrollHeight:r.box.esh,msgClientHeight:r.box.ech,msgOverflowY:r.box.eovf,clippingAncestorsThatCut:r.box.ancCut,chars:t.length});
      L.say(r.box.bottom<=r.box.vh+0.5,'TC-R16 B8['+(i+1)+'/'+N+'] '+g.n+' the verdict box is inside the viewport',{bottom:r.box.bottom,vh:r.box.vh});
      // ===== B11: THE BOARD DOES NOT MOVE WHILE THE EXPLANATION LANDS (US-R13). ==========================
      const jp=jump(r.bdPre,r.bdPost),jh=jump(r.bdOpen,r.bdPre);
      L.note(g.n+' item '+(i+1)+' board ON OPEN: '+bfmt(r.bdOpen)+'   BEFORE THE MOVE (hint up): '+bfmt(r.bdPre)+'   AFTER THE EXPLANATION: '+bfmt(r.bdPost)+'   deltas: verdict lands '+(jp?JSON.stringify(jp):'<NOT MEASURED>')+', hint line (printed, not asserted) '+(jh?JSON.stringify(jh):'<NOT MEASURED>'));
      L.say(!!r.bdPre&&!!r.bdPost&&r.preVerdict===null&&r.postVerdict!==null,'TC-R16 B11a['+(i+1)+'/'+N+'] '+g.n+' THE PAIR WAS REALLY MEASURED: a board on screen before the solving move with NO verdict up, and a board on screen after the verdict rendered - without this B11b compares two readings of the same state',{boardBefore:bfmt(r.bdPre),verdictBefore:r.preVerdict,boardAfter:bfmt(r.bdPost),verdictAfter:r.postVerdict?r.postVerdict.slice(0,40):null});
      if(jp)L.say(Math.abs(jp.dTop)<0.6&&Math.abs(jp.dLeft)<0.6&&Math.abs(jp.dW)<0.6,'TC-R16 B11b['+(i+1)+'/'+N+'] '+g.n+' US-R13 AS WRITTEN: the board does not move while the explanation lands - top, left and width each within the 0.6px house tolerance',{delta:jp});
      await c.close();
    }
    // A missing denominator is REPORTED, never credited: on a fixture with no quiet card B5c asserts nothing, and says so.
    if(isC&&quietN===0)L.note('TC-R16 B5c DID NOT RUN at '+g.n+' - NOT A PASS: none of the '+N+' captured mistakes has a quiet better move (each is a check, a capture or a promotion - see the lines above), so the quiet-position hint check had no input here.');
    if(isC&&seen.length===N)L.say(new Set(seen).size===N,'TC-R16 B9 '+g.n+' the '+N+' on-screen explanations are all DIFFERENT',{distinct:new Set(seen).size,of:N});
    // B10 AS HANDED asserted the N hints are all DIFFERENT. #426 keeps it, and records that it is the WEAKER
    // of the two properties it could assert and will mis-fire one day: a hint names a SHAPE ("one move can
    // hit two things at once"), and two captured mistakes can honestly share a shape, at which point a
    // correct implementation goes red here. The property that always holds is the one B5b already checks -
    // the hint is not a single fixed string and it follows the position. Filed with the A5/B4 flag; not
    // changed this run, because on these two inputs the shapes genuinely differ and an untested loosening is
    // worse than a known-narrow assertion.
    if(isC&&hints.length===N)L.say(new Set(hints).size===N&&hints.every(h=>h.length>0&&h.indexOf('<HINT')<0),'TC-R16 B10 '+g.n+' the '+N+' HINTS are all DIFFERENT and all real - the hint must vary with the position (see the note above: this asserts distinctness where "varies with the shape" is the true property)',{distinct:new Set(hints).size,of:N,hints:hints});
  }
  // ===== TC-R74 [#547 item (79); Kunal's Desk answer 'per-account' on drill-own-games-only]. THE SAME REVIEW, ITS ACCOUNT MARKED
  // NOT HIS, CAPTURES NOTHING. Phase 1 above is the positive half (A1: the same game from the same stored account captured
  // at least 2 mistakes); here the only difference is ct_acctmine switching that account off. The chip must SAY so first
  // (precondition), the review must actually finish (precondition), and then neither pool may gain a row.
  {
    const ID='cc:dukekarlcountisouard99';
    const c=await L.launch({geo:{w:375,h:730,safe:''},name:'drill-not-mine',store:{...ACCT,ct_acctmine:{[ID]:false},ct_mymistakes:[],ct_mybrilliancies:[]}});await c.open();
    await c.tile('Review');await c.settle(700);
    const chip=await c.page.evaluate(()=>{const e=document.querySelector('[data-ct="acct-mine"]');return e?{t:(e.innerText||'').trim(),p:e.getAttribute('aria-pressed')}:null;});
    L.say(!!chip&&chip.t==='not mine'&&chip.p==='false','TC-R74 PRECONDITION the account chip reads "not mine" - the switch the player sets is on screen, and set',chip);
    let done=true;try{await c.page.locator('button',{hasText:/Review ›/}).first().click();await c.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await c.settle(1200);}catch(e){done=false;}
    L.say(done,'TC-R74 PRECONDITION the review of that account\'s game reached its summary, so a capture had every chance to run',{done});
    const pools=await c.page.evaluate(()=>({mis:JSON.parse(localStorage.getItem('ct_mymistakes')||'[]').length,bril:JSON.parse(localStorage.getItem('ct_mybrilliancies')||'[]').length}));
    L.say(done&&pools.mis===0&&pools.bril===0,'TC-R74 a game from an account marked NOT his adds nothing to his mistakes drill or his brilliant moves (phase 1 captured '+mis.length+' mistakes from the same game when the account was his)',{...pools,phase1:mis.length});
    L.say(c.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,'TC-R74 no app error beyond the allowed engine trap',c.errs.slice(0,2));
    await c.close();
  }
},'51-drill-explain-why');
