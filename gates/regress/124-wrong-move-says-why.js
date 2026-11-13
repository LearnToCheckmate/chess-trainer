'use strict';
// gates/regress/124-wrong-move-says-why.js - A WRONG MOVE ON PUZZLES AND IN THE DRILL SAYS WHY, IN ONE LINE. US-R132 / TC-R200a..e.
//
// WHY [#550 item (24), jobs/pz-one-message-slot-overwrites-the-hint-2026-09-28, its folded lead
// jobs/wrong-move-line-says-why-instead-of-isnt-it-try-again-2026-10-13 (Kunal's Desk answer say-why, 13 Oct 2026)]: every wrong move
// read "<move> isn't it. Try again", the same to the character for a blunder and a fair alternative. His bar: the line names the move and
// gives one reason in words; it differs between the two benchmark drill positions (cxb5 and Nxd7); it is never "isn't it" where a reason
// exists; where none exists it stays as it is (a miss is never blank); on Puzzles it fits the one-line row.
// HOW THE APP DOES IT (chess.jsx): wrongWhy reads the board alone - the reply that mates, the moved piece left en prise, another piece
// left en prise - and names the capture; failing that, the analysis engine's reply (300ms) is described by replyWhy, by what the board
// proves after it or by the engine's own score in the drill's band words. Over the 890 library puzzles the board alone gives a reason for
// 8141 of 25978 wrong first moves (31.3%: 1123 mate, 5822 hangs, 1196 drops), measured at #550; the rest wait on the engine.
// WHAT IT READS: A-B are NODE blocks over chess.jsx through gates/engine-extract.js (the shipped functions). C-E are BROWSER blocks over the
// bundle under test (CT_APP): the Puzzles screen's first library puzzle (Re7, drive/puzzles 'train-fail') and the mistakes drill on the
// job's two benchmark positions, each card's stored move set to another legal move so cxb5 and Nxd7 are wrong there.
// CONTROL-RECORD: c539ae4 2026-11-11 total=21 red=5 scope=trial:8b141ccb9067 how=#550 item (24): the tree before say-why - TC-R200c at both geometries and the three TC-R200d lines red; A, B and E green
// CONTROL-RECORD: c539ae4 2026-11-11 total=8 red=5 scope=env:CT_SRC=c124-null how=wrongWhy and replyWhy both returning null - TC-R200a A1 A3 and TC-R200b B1 B2 B3 red
// CONTROL-RECORD: 66bcd7f 2026-11-13 total=12 red=2 scope=env:CT_SRC=tip-chess.jsx how=#550 HEX-T-03: the branch tip's chess.jsx (before the gist and the baseline) - TC-R209e B5 and B7 red; B6, B8 and every A/B line green
const L=require('../lib');
const E=require('../engine-extract.js');
console.log('124-wrong-move-says-why: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5+' (blocks A-B); bundle '+(process.env.CT_APP||'app.js')+' (blocks C-E)');
const mvOf=(p,from,to)=>E.getLegal(p).find(m=>E.rc2sq(m.fr,m.fc)===from&&E.rc2sq(m.tr,m.tc)===to);
const B1='rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 1',B2='4kb1r/p2B1ppp/4qn2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 1';
L.run(async()=>{
  // ── A. THE BOARD ALONE (wrongWhy) ─────────────────────────────────────────────────────────────────────────────────────────────
  {const p=E.fromFEN('7k/pb3rpp/2p5/5p2/3P4/8/PPP2PPP/4R1K1 w - - 0 1');   // the library's first generated puzzle; Re7 drops the rook to Rxe7
   const w=E.wrongWhy(p,mvOf(p,'e1','e7'));
   L.say(!!w&&w.kind==='hangs'&&w.text==='hangs the rook (Rxe7)','TC-R200a A1 Re7 hangs the rook, named with the capture that takes it ('+(w&&w.text)+')',w);
   const q=E.fromFEN('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');const m=E.wrongWhy(q,mvOf(q,'g2','g3'));   // any quiet move: Black has no mate, nothing hangs
   L.say(m===null,'TC-R200a A2 a move that leaves nothing en prise and allows no mate has NO board reason (null), so the line stays as it was',m);
   const k=E.fromFEN('4r1k1/5ppp/8/8/8/8/P4PPP/6K1 w - - 0 1');   // the back rank: White's king boxed by its own pawns, Black's rook on e8
   const a3=E.wrongWhy(k,mvOf(k,'a2','a3')),h3=E.wrongWhy(k,mvOf(k,'h2','h3'));
   L.say(!!a3&&a3.kind==='mate'&&a3.text==='allows mate (Re1#)','TC-R200a A3 a3 leaves the back rank open: "allows mate (Re1#)" ('+(a3&&a3.text)+')',a3);
   L.say(h3===null,'TC-R200a A4 h3 makes room for the king, so the same position gives no reason for it (the mate branch is not a default)',h3);}
  // ── B. THE ENGINE'S REPLY (replyWhy), fed the score the analysis worker would send ─────────────────────────────────────────────
  {const p1=E.fromFEN(B1),g1=E.makeMove(p1,mvOf(p1,'c6','b5')),r1=mvOf(g1,'c4','b5');
   const p2=E.fromFEN(B2),g2=E.makeMove(p2,mvOf(p2,'f6','d7')),r2=mvOf(g2,'b3','b8');
   const t1=E.replyWhy(g1,r1,{cp:509,mate:null}),t2=E.replyWhy(g2,r2,{cp:null,mate:2});
   L.say(t1==='allows Bxb5+ and leaves you losing','TC-R200b B1 cxb5: the engine\'s reply Bxb5+ at +5.09 for White reads "allows Bxb5+ and leaves you losing" ('+t1+')');
   L.say(t2==='allows mate in 2 (Qb8+)','TC-R200b B2 Nxd7: the engine\'s mate in 2 reads "allows mate in 2 (Qb8+)" ('+t2+')');
   L.say(!!t1&&!!t2&&t1!==t2,'TC-R200b B3 the two benchmark positions get DIFFERENT reasons');
   const t3=E.replyWhy(g1,r1,{cp:40,mate:null});
   L.say(t3===null,'TC-R200b B4 the same reply at +0.40 (not clearly worse) and only a pawn captured gives NO reason: a pawn won is not named, a level band is not a reason ('+t3+')');
   // #550 HEX-T-03 (docs/hint-audit-2026-11-12; jobs/drill-hints-name-the-positions-point-2026-11-12): the reply described by what it does
   // (moveGist's threat, board-proven) and the drill's baseline (base: the engine's score BEFORE the wrong move, mover's side). B5-B8.
   const q=E.fromFEN('4k3/8/2n5/8/8/8/8/4KB2 b - - 0 1'),gq=E.makeMove(q,mvOf(q,'e8','d8')),rq=mvOf(gq,'f1','b5');   // after Kd8 the c6 knight has no guard; Bb5 is a new attack on it
   const t5=E.replyWhy(gq,rq,{cp:300,mate:null});
   L.say(t5==='allows Bb5, which hits the knight on c6, and leaves you losing','TC-R209e B5 a reply that hits an unguarded piece is described by what it does, beside the band ('+t5+')');
   const t6=E.replyWhy(gq,rq,{cp:20,mate:null});
   L.say(t6===null,'TC-R209e B6 the same reply with the position level (no band, no baseline) gives NO reason: a threat that costs nothing is not one ('+t6+')');
   const t7=E.replyWhy(g1,r1,{cp:40,mate:null},3.0);
   L.say(t7==='allows Bxb5+: you go from winning to level','TC-R209e B7 cxb5 with the drill\'s baseline (+3.0 before, -0.4 after, for Black): the slide from winning to level is named ('+t7+')');
   const t8=E.replyWhy(g1,r1,{cp:40,mate:null},0.6);
   L.say(t8===null,'TC-R209e B8 the same reply from a baseline of +0.6 (a drop of 1.0, one band) gives no reason, as B4 ('+t8+')');}
  if(process.env.CT_SRC){L.note('CT_SRC set: browser blocks C-E skipped');return;}
  // ── C. PUZZLES: Re7 on the first library puzzle, the one-line row ──────────────────────────────────────────────────────────────
  {const Z=require('../drive/puzzles');
   for(const geo of ['kunal761','se']){const b=await L.launch({geo,name:'say-why-pz-'+geo});await b.open();let ok=true;
    try{await Z.states['train-fail'](b);await b.settle(400);}catch(e){ok=false;}
    const r=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div,span')].filter(x=>x.children.length===0&&/^✗/.test((x.innerText||'').trim()))[0];return e?{t:e.innerText.trim(),cut:e.scrollWidth>e.clientWidth+1}:null;});
    L.say(ok&&!!r,'TC-R200c '+geo+' PRECONDITION the wrong move Re7 was played and a ✗ line is on screen',r);
    L.say(!!r&&r.t==='✗ Re7 hangs the rook (Rxe7).'&&!r.cut,'TC-R200c '+geo+' Puzzles: the line names the move and its reason, and the one-line row does not cut it ("'+(r&&r.t)+'")',r);
    L.say(b.errs.length===0,'TC-R200c '+geo+' zero app errors',b.errs.slice(0,3));
    await b.close();}}
  // ── D. THE DRILL: the two benchmark positions, the engine's reason arriving within five seconds ─────────────────────────────────
  {const lines={};
   for(const [fen,from,to,key] of [[B1,'c6','b5','cxb5'],[B2,'f6','d7','Nxd7']]){
    const p=E.fromFEN(fen);const alt=E.getLegal(p).find(m=>!(E.rc2sq(m.fr,m.fc)===from&&E.rc2sq(m.tr,m.tc)===to));const uci=E.rc2sq(alt.fr,alt.fc)+E.rc2sq(alt.tr,alt.tc);
    const row={fen,uci,label:'Blunder',played:'Kd1',ts:1791000000000,last:null,why:'w',hint:'h'};
    const b=await L.launch({geo:'kunal761',name:'say-why-drill-'+key,store:{ct_mymistakes:[row,{...row,ts:1791000001000,fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7'}],ct_pool:'3'}});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(2500);await b.move(from,to,0);}catch(e){ok=false;}
    let t=null;const t0=Date.now();while(Date.now()-t0<9000){t=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-top"]');return e?((e.innerText||'').split('\n').find(x=>/✗/.test(x))||null):null;});if(t&&!/isn't it/.test(t))break;await b.page.waitForTimeout(300);}
    lines[key]=t;
    L.say(ok&&!!t,'TC-R200d '+key+' PRECONDITION the drill rejected the move with a ✗ line',{t});
    L.say(!!t&&!/isn't it/.test(t)&&new RegExp('^✗ '+key.replace('+','\\+')+' (allows|hangs|drops) .+\\. Try again\\.$').test(t),'TC-R200d '+key+' the drill line names the move and one reason, within 9s of the move ("'+t+'")',{t,ms:Date.now()-t0});
    await b.close();}
   L.say(!!lines.cxb5&&!!lines.Nxd7&&lines.cxb5.replace('cxb5','')!==lines.Nxd7.replace('Nxd7',''),'TC-R200d the two benchmark positions read DIFFERENT reasons',lines);}
  // ── E. NO REASON: the line stays as it was ─────────────────────────────────────────────────────────────────────────────────────
  {const row={fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Blunder',played:'Kd1',ts:1791000000000,last:null,why:'w',hint:'h'};
   const b=await L.launch({geo:'kunal761',name:'say-why-none',store:{ct_mymistakes:[row,{...row,ts:1791000001000,fen:'4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1',uci:'c2c7'}],ct_pool:'3'}});await b.open();let ok=true;
   try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(2500);await b.move('e1','d1',0);}catch(e){ok=false;}
   await b.page.waitForTimeout(6000);
   const t=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-top"]');return e?((e.innerText||'').split('\n').find(x=>/✗/.test(x))||null):null;});
   L.say(ok&&!!t&&/^✗ Kd1 isn't it/.test(t),'TC-R200e a wrong move with no reason (Kd1, still completely winning) keeps the line it had, six seconds on ("'+t+'")',{t});
   await b.close();}
},'124-wrong-move-says-why');
