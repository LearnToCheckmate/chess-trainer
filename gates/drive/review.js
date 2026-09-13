// gates/drive/review.js - drives the Review screen (game review: list, import, summary, move screen, analysis
// board) of the live bundle from a launched+opened gates/lib browser. Every state function takes `b` and puts
// the app into that state from wherever it is (it imports the game itself when it has to). Reused by the
// regression suite; names are plain and the steps deterministic (the eval cache makes a repeat import take
// seconds; seed store {ct_pool:'3'} for a first analysis of ~20-60 s).
//
// STATES
//   list-empty        the Review list with nothing stored (Import from ... / OR PASTE A PGN / Analyze Game)
//   list-stored       the list with two stored accounts (ct_accts + ct_acctgames), one game with long names
//   summary           the Opera Game imported through the textarea (headers: long names, WhiteElo/BlackElo):
//                     the accuracy table, the Skills panel (rev-skills), the pinned footer (rev-summary-foot)
//   summary-scrolled  the same, scrolled to the bottom (is the Skills panel reachable above the footer?)
//   moves-ply0        'Start review' -> the move screen at the start position
//   moves-ply5 / moves-ply10   mid-game plies (tapped on the move strip)
//   moves-ply31       16.Qb8+ (a verdict badge on b8, rank 8)
//   moves-last        17.Rd8# (eval label must read 1-0, bar white), engine line off
//   moves-last-engine 17.Rd8# with the engine line switched on from the ⋯ sheet (the label must still read 1-0)
//   evalgraph-last    the graph on, at 17.Rd8# (where the current-ply line ends)
//   why-open          a Brilliant/Great move with its '▶ why' (rev-playout) pressed: the reason grows by two lines
//   analysis          the round Analyze button (rev-fab) at ply 0, then 1.e4 e5 on the analysis board
//   analysis-undo     ... then ↶ Undo (one move left)
//   analysis-exit     ... then ✕ Exit analysis (back on the review at ply 0)
//   more-sheet        the ⋯ sheet (rev-more -> rev-sheet)
//   flipped           the review flipped from the sheet ('Flip board'), at 17.Rd8#
//   evalgraph         ct_evalgraph='1' (reload + re-import from the cache), the move screen at ply 10 with
//                     the graph (eval-graph) in the bottom player bar
//   back-summary      the back arrow (rev-back) from the move screen -> the summary
//   back-list         '‹ Back to games' from the summary -> the list (the textarea still holds the PGN)
//   fab-corner-last   a 7-ply game whose last move is 4.Rh1: the round button must step to the bottom-left
//   fab-corner-mid    the same game at 3...Rb8 (last move on b8): the button is back at the bottom-right
//   stored-review     a stored account row tapped (pickCcGame) -> the summary of that game
//
// HELPERS exported for the audit: PGN_OPERA, PGN_CORNER, SEED, goPly, importPgn, toList, inMoves, ensureReview
'use strict';
const PGN_OPERA=`[Event "Live Chess"]
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
// the last move lands on h1 (4.Rh1): the round Analyze button must step aside; 3.Rg1 is a corner move too, 3...Rb8 is not
const PGN_CORNER=`[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.02"]
[White "Jsmiller1112"]
[Black "DukeKarlCountIsouard99"]
[Result "*"]
[WhiteElo "1523"]
[BlackElo "1487"]

1. e4 e5 2. Nf3 Nc6 3. Rg1 Rb8 4. Rh1 *`;
const OPERA_PLIES=33, CORNER_PLIES=7;
const DAY=86400000;
// two stored accounts; shape from chess.jsx acctStore/mergeGames: map acctId -> [{src,acct,pgn,white,black,wr,tc,date}]
const SEED={
  ct_accts:['cc:jsmiller1112','li:kunalchess'],
  ct_acctgames:{
    'cc:jsmiller1112':[
      {src:'cc',acct:'jsmiller1112',pgn:PGN_OPERA,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr:'win',tc:'blitz',date:Date.now()-1*DAY},
      {src:'cc',acct:'jsmiller1112',pgn:PGN_CORNER,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr:'agreed',tc:'rapid',date:Date.now()-2*DAY}
    ],
    'li:kunalchess':[
      {src:'li',acct:'kunalchess',pgn:'[White "Morphy"] [Black "kunalchess"] 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7',white:'Morphy',black:'kunalchess',wr:'checkmated',tc:'bullet',date:Date.now()-3*DAY}
    ]
  }
};
const vis=(b,sel)=>b.page.locator(sel).last().isVisible().catch(()=>false);
const onSummary=(b)=>vis(b,'[data-ct="rev-summary"]');
async function inMoves(b){return (await vis(b,'[data-ct="strip-row"]'))&&!(await onSummary(b));}
async function onList(b){return (await vis(b,'textarea'))&&!(await onSummary(b))&&!(await vis(b,'[data-ct="strip-row"]'));}
// the Review list from anywhere (summary -> Back to games; move screen -> back arrow, then Back to games)
async function toList(b){
  if(await onList(b))return;
  if(await inMoves(b)){if(await vis(b,'[data-ct="rev-more"]')){ /* a sheet may be open: close it first */ }
    if(await vis(b,'[data-ct="rev-sheet"]')){await b.page.mouse.click(8,8);await b.settle(300);}
    await b.tapCt('rev-back');await b.settle(400);}
  if(await onSummary(b)){await b.tapText(/^‹ Back to games$/);await b.settle(500);}
  if(await onList(b))return;
  await b.home();await b.tile('Review');await b.settle(600);
  if(!(await onList(b)))throw new Error('toList: the Review list did not open');
}
// paste a PGN and analyse it; waits for the summary (a cached game takes seconds, a fresh one 20-60 s)
async function importPgn(b,pgn,timeout){
  await toList(b);
  await b.page.locator('textarea').fill(pgn);await b.settle(150);
  await b.tapText(/^⚡ Analyze Game$/);
  await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:timeout||180000});
  await b.settle(900);b._ctReview=pgn===PGN_OPERA?'opera':(pgn===PGN_CORNER?'corner':'other');
}
// the summary of `which` ('opera'|'corner') on screen, importing when it is not the current review
async function ensureReview(b,which){
  which=which||'opera';
  const inRev=(await onSummary(b))||(await inMoves(b));
  if(inRev&&b._ctReview===which){if(await inMoves(b)){if(await vis(b,'[data-ct="rev-sheet"]')){await b.page.mouse.click(8,8);await b.settle(300);}await b.tapCt('rev-back');await b.settle(400);}return;}
  await importPgn(b,which==='corner'?PGN_CORNER:PGN_OPERA);
}
async function startReview(b){if(await inMoves(b))return;await b.tapText(/^Start review ›$/);await b.page.locator('[data-ct="strip-row"]').last().waitFor({state:'visible',timeout:8000});await b.settle(600);}
// ply n of the current review: 0 = first, the strip's n-th move span otherwise (title buttons for first/last)
async function goPly(b,n){
  const N=await b.page.evaluate(()=>document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]').length);
  if(n<=0){await b.page.locator('button[title="First move"]').last().click();}
  else if(n>=N){await b.page.locator('button[title="Last move"]').last().click();}
  else{await b.page.evaluate((i)=>{const s=document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]');s[i-1].click();},n);}
  await b.settle(700);return N;
}
async function movesAt(b,n,which){await ensureReview(b,which||'opera');await startReview(b);await goPly(b,n);}
async function closeSheet(b){if(await vis(b,'[data-ct="rev-sheet"]')){await b.page.mouse.click(8,8);await b.settle(350);}}
async function exitAnalysis(b){if(await vis(b,'[data-ct="rev-row1"]')){const t=await b.texts();if(t.some(x=>/Exit analysis/.test(x))){await b.tapText(/Exit analysis$/);await b.settle(400);}}}
async function seed(b,obj){await b.page.evaluate((o)=>{for(const k in o)localStorage.setItem(k,typeof o[k]==='string'?o[k]:JSON.stringify(o[k]));},obj);}
// the engine line (⋯ sheet: 'Analyze with the engine' / 'Engine line: on') set on or off on the move screen
async function engineSet(b,on){await closeSheet(b);const isOn=await vis(b,'[data-ct="rev-engline"]');if(!!isOn===!!on)return;await b.tapCt('rev-more',400);await b.tapText(on?/^Analyze with the engine$/:/^Engine line: on$/);await b.settle(on?2500:500);}

const states={
  'list-empty':async(b)=>{await seed(b,{ct_accts:'[]',ct_acctgames:'{}'});await b.open();b._ctReview=null;await b.tile('Review');await b.settle(600);},
  'list-stored':async(b)=>{await seed(b,SEED);await b.open();b._ctReview=null;await b.tile('Review');await b.settle(700);},
  'summary':async(b)=>{await ensureReview(b,'opera');},
  'summary-scrolled':async(b)=>{await ensureReview(b,'opera');await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"] .scroll');if(s)s.scrollTop=s.scrollHeight;});await b.settle(500);},
  'moves-ply0':async(b)=>{await exitAnalysis(b);await movesAt(b,0);},
  'moves-ply5':async(b)=>{await exitAnalysis(b);await movesAt(b,5);},
  'moves-ply10':async(b)=>{await exitAnalysis(b);await movesAt(b,10);},
  'moves-ply31':async(b)=>{await exitAnalysis(b);await movesAt(b,31);},
  'moves-last':async(b)=>{await exitAnalysis(b);await movesAt(b,OPERA_PLIES);await engineSet(b,false);},
  'moves-last-engine':async(b)=>{await exitAnalysis(b);await movesAt(b,OPERA_PLIES);await engineSet(b,true);},
  // the first key moment (★) whose move has a '▶ why' button, then the button pressed (the engine plays the move out)
  'why-open':async(b)=>{await exitAnalysis(b);await movesAt(b,0);let found=false;for(let i=0;i<14;i++){await b.page.locator('button[title^="Next key moment"]').last().click();await b.settle(450);if(await vis(b,'[data-ct="rev-playout"]')){found=true;break;}}
    if(!found)throw new Error('why-open: no Brilliant/Great move with a why button in 14 key moments');
    b._ctWhyPly=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="rev-move-line"]');const m=(t&&t.innerText||'').match(/(\d+)\/\d+/);return m?+m[1]:null;});
    await b.tapCt('rev-playout',300);await b.page.locator('[data-ct="rev-engline"]').last().waitFor({state:'visible',timeout:6000}).catch(()=>{});await b.settle(2500);},
  'analysis':async(b)=>{await exitAnalysis(b);await movesAt(b,0);await b.tapCt('rev-fab',600);await b.move('e2','e4',600);await b.move('e7','e5',600);},
  'analysis-undo':async(b)=>{if(!(await b.texts()).some(x=>/Undo/.test(x)))await states['analysis'](b);await b.tapText(/^↶ Undo$/);await b.settle(500);},
  'analysis-exit':async(b)=>{if(!(await b.texts()).some(x=>/Exit analysis/.test(x)))await states['analysis'](b);await b.tapText(/Exit analysis$/);await b.settle(600);},
  'more-sheet':async(b)=>{await exitAnalysis(b);await movesAt(b,10);await b.tapCt('rev-more',500);await b.page.locator('[data-ct="rev-sheet"]').waitFor({state:'visible',timeout:5000});},
  'flipped':async(b)=>{await exitAnalysis(b);await movesAt(b,OPERA_PLIES);await engineSet(b,false);await b.tapCt('rev-more',400);await b.tapText(/^Flip board$/);await b.settle(700);},
  'flipped-off':async(b)=>{const bd=await b.board();if(bd&&bd.flip){await closeSheet(b);await b.tapCt('rev-more',400);await b.tapText(/^Flip board$/);await b.settle(500);}},
  'evalgraph':async(b)=>{await seed(b,{ct_evalgraph:'1'});await b.open();b._ctReview=null;await movesAt(b,10);},
  'evalgraph-last':async(b)=>{if(!(await vis(b,'[data-ct="eval-graph"]')))await states['evalgraph'](b);await goPly(b,OPERA_PLIES);await engineSet(b,false);},
  'evalgraph-off':async(b)=>{await seed(b,{ct_evalgraph:'0'});await b.open();b._ctReview=null;},
  'back-summary':async(b)=>{await exitAnalysis(b);await movesAt(b,10);await closeSheet(b);await b.tapCt('rev-back',500);await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:5000});},
  'back-list':async(b)=>{await ensureReview(b,'opera');await b.tapText(/^‹ Back to games$/);await b.settle(600);},
  'fab-corner-last':async(b)=>{await exitAnalysis(b);await movesAt(b,CORNER_PLIES,'corner');},
  'fab-corner-mid':async(b)=>{await exitAnalysis(b);await movesAt(b,6,'corner');},
  'stored-review':async(b)=>{await seed(b,SEED);await b.open();b._ctReview=null;await b.tile('Review');await b.settle(700);await b.page.locator('button',{hasText:/Review ›/}).first().click();await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(900);b._ctReview='stored';}
};
module.exports={states,PGN_OPERA,PGN_CORNER,SEED,OPERA_PLIES,CORNER_PLIES,goPly,importPgn,toList,inMoves,onSummary,onList,ensureReview,startReview,closeSheet,exitAnalysis,seed,engineSet,
  notes:'Home tile Review -> the list (textarea + "⚡ Analyze Game"). The summary is a fixed overlay (rev-summary) with a pinned footer (rev-summary-foot: "‹ Back to games" / "Start review ›"). The move screen: top player bar holds rev-back and rev-more, the round rev-fab sits on the board, rev-compact holds the move line, the reason (rev-why/rev-why-txt), the control row (rev-row1: ⏮ ▶ ⏭ ★) and the strip (strip-row: 26px arrows + [data-mstrip] move spans). Plies are reached by clicking the strip spans (goPly). Stored games render as "Review ›" rows from ct_accts/ct_acctgames (SEED). The eval cache (ct_evalcache) makes a repeat import instant; a first analysis of the Opera Game takes ~20-60 s with ct_pool=3. b._ctReview remembers which PGN is loaded.'};
