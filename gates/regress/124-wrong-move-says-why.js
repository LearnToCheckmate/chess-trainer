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
// CONTROL-RECORD: 55ca2c7 2026-11-13 total=69 red=12 scope=trial:f04242ef6603 how=#550 cg7: the branch tip's bundle (before missWhy) - TC-R210c red on K2 K5 K6 at kunal761 and 320x568 (two lines each); every other line green, K7 K8 K10 included
// CONTROL-RECORD: 55ca2c7 2026-11-13 total=23 red=3 scope=env:CT_SRC=tip-chess.jsx how=#550 cg7: the branch tip's chess.jsx d04a8ed0b851 (no missWhy) - TC-R210a K2 K5 K6 red; the null cards and every TC-R210b must-not line green
const L=require('../lib');
const E=require('../engine-extract.js');
console.log('124-wrong-move-says-why: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5+' (blocks A-B); bundle '+(process.env.CT_APP||'app.js')+' (blocks C-E)');
const mvOf=(p,from,to)=>E.getLegal(p).find(m=>E.rc2sq(m.fr,m.fc)===from&&E.rc2sq(m.tr,m.tc)===to);
// his six cards that read "isn't it" for his own move (claude/agents/HINT-TEXTS-550.md, cards 2, 5, 6, 7, 8, 10): [id, fen, his move, the
// review's best move, the board reason the line must carry (null: none is provable, so none is printed)]
const SIX=[
  ['K2','rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq e3 0 1','Bb4+','exd4','is met by c3, which blocks and hits the bishop'],
  ['K5','rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq e6 0 1','Nf3','dxe5','lets the pawn on e5 get away (e4)'],
  ['K6','r2qk2r/ppp2ppp/2nbpn2/3p4/3P2b1/2PBPN2/PP3PPP/RNBQ1RK1 w kq - 0 1','Qc2','h3','unguards f3: only gxf3 meets Bxf3'],
  ['K7','rnb2r1k/ppqp1ppB/3bp3/8/3P2n1/2P2NN1/PPQ2PPP/R1B1R1K1 w - - 0 1','Be4','Re4',null],
  ['K8','5rk1/pBqb1pbp/4p1p1/1p1nN3/2pP4/2P3B1/PP3PPP/R2QR1K1 w - - 0 1','Ba6','Bxd5',null],
  ['K10','r3r1k1/p2q1p1p/1p1p2pB/1Pp5/3bPP2/1Q6/1PP3PP/3RR2K b - - 0 1','Re7','Qb7',null],
];
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
  // ── G. HIS SIX CARDS, THE BOARD READ AGAINST THE CARD'S BEST MOVE (missWhy) [#550 cg7; jobs/drill-hints-name-the-positions-point-2026-11-12,
  // the independent checker's gap: playing his own move on his ten cards (claude/agents/HINT-TEXTS-550.md) gave a reason on 4; these 6 read
  // "isn't it. Try again" whenever the 300ms engine reply named nothing]. Each line is what the drill puts after "✗ <move> " from the board
  // alone: wrongWhy, else missWhy. Three are provable on the board; three are not, and must stay null so the line stays honest.
  {const mw=(f,ps,bs)=>{try{const p=E.fromFEN(f);const pm=E.findMoveBySAN(p,ps),bm=E.findMoveBySAN(p,bs);const w=E.wrongWhy(p,pm);if(w)return w.text;return (typeof E.missWhy==='function'&&E.missWhy(p,pm,bm)||{}).text||null;}catch(e){return 'THREW '+e.message;}};
   for(const [id,f,ps,bs,want] of SIX){const t=mw(f,ps,bs);
     if(want)L.say(t===want,'TC-R210a '+id+' '+ps+' (best '+bs+') reads "'+ps+' '+want+'" from the board ("'+t+'")',{t});
     else L.say(t===null,'TC-R210a '+id+' '+ps+' (best '+bs+'): nothing on the board alone proves a point, so NO board reason - the line keeps what it had ('+t+')',{t});}
   // where each reading must NOT fire
   const NOT=[
     ['N1','rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq e6 0 1','dxe5','dxe5','the best move itself is not a wrong move'],
     ['N2','r2qk2r/ppp2ppp/2nbpn2/3p4/3P2b1/2PBPN2/PP3PPP/RNBQ1RK1 w kq - 0 1','Qe2','h3','Qe2 still guards the knight on f3'],
     ['N3','r2qk2r/ppp2ppp/2nbpn2/3p4/3P2b1/2PBPN2/PP3PPP/RNBQ1RK1 w kq - 0 1','Nbd2','h3','the knight on d2 adds a guard, and the queen stays on d1'],
     ['N4','rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PP3PPP/RNBQKBNR b KQkq - 0 1','Bb4+','exd4','with no c-pawn only a piece can block the check, so nothing blocks and hits'],
     ['N5','rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq e3 0 1','Nf6','exd4','Nf6 takes nothing, and exd4 was an even trade (not a win of material), so there is nothing it lets go'],
   ];
   for(const [id,f,ps,bs,why] of NOT){const t=mw(f,ps,bs);L.say(t===null,'TC-R210b '+id+' '+ps+' (best '+bs+'): '+why+' - no board reason ('+t+')',{t});}}
  if(process.env.CT_SRC){L.note('CT_SRC set: browser blocks C-F skipped');return;}
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
  // #550: the fixture carries wc (already graded), as gate 123's does. Without it the a41 Home re-grade correctly finds Kd1 is no Mistake or
  // Blunder (K+Q v K, still completely winning) and removes the card before the drill can open - measured on t164: no practice card on Review.
  {const row={fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Blunder',played:'Kd1',ts:1791000000000,last:null,why:'w',hint:'h',wc:{g:'Blunder',drop:30,v:1}};
   const b=await L.launch({geo:'kunal761',name:'say-why-none',store:{ct_mymistakes:[row,{...row,ts:1791000001000,fen:'4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1',uci:'c2c7'}],ct_pool:'3'}});await b.open();let ok=true;
   try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(2500);await b.move('e1','d1',0);}catch(e){ok=false;}
   await b.page.waitForTimeout(6000);
   const t=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-top"]');return e?((e.innerText||'').split('\n').find(x=>/✗/.test(x))||null):null;});
   L.say(ok&&!!t&&/^✗ Kd1 isn't it/.test(t),'TC-R200e a wrong move with no reason (Kd1, still completely winning) keeps the line it had, six seconds on ("'+t+'")',{t});
   await b.close();}
  // ── F. HIS SIX CARDS IN THE DRILL [#550 cg7]: his own move played on each, at 375x761. The FIRST ✗ line painted is read (polled every
  // 40ms, so it is the board's line and not the engine's, which cannot arrive before its 300ms search), then again three seconds on.
  // A board reason must be the first line, must not be replaced, and must not be cut by its box. The three with no board reason must open
  // on the honest "isn't it" line (what the engine may add later is block D's business, and is not asserted here).
  // The three with a board reason are read at 320x568 too, where the box is narrowest (74- and 66-character drafts of the Qc2 line were cut there).
  for(const [geo,id,fen,ps,bs,want] of [...SIX.map(x=>['kunal761',...x]),...SIX.filter(x=>x[4]).map(x=>['se',...x])]){
    const p=E.fromFEN(fen);const bm=E.findMoveBySAN(p,bs),pm=E.findMoveBySAN(p,ps);const uci=E.rc2sq(bm.fr,bm.fc)+E.rc2sq(bm.tr,bm.tc);
    const row={fen,uci,label:'Mistake',played:ps,ts:1791000000000,last:null,why:bs+' was stronger.',hint:'h',wc:{g:'Mistake',drop:15,v:1}};
    const b=await L.launch({geo,name:'say-why-card-'+id+'-'+geo,store:{ct_mymistakes:[row,{...row,ts:1791000001000,fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',played:'Kd1'}],ct_pool:'3'}});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(2500);
      ok=await b.page.evaluate((ps)=>((document.querySelector('[data-ct="pz-top"]')||{}).innerText||'').includes('you played '+ps+' here'),ps);
      await b.move(E.rc2sq(pm.fr,pm.fc),E.rc2sq(pm.tr,pm.tc),0);}catch(e){ok=false;}
    const read=()=>b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');if(!top)return null;const e=[...top.querySelectorAll('div,span')].filter(x=>x.children.length===0&&/^✗/.test((x.innerText||'').trim()))[0];
      return e?{t:e.innerText.trim(),cut:e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1}:null;});
    let first=null;const t0=Date.now();while(Date.now()-t0<2500){first=await read();if(first)break;await b.page.waitForTimeout(40);}
    await b.page.waitForTimeout(3000);const later=await read();
    L.say(ok&&!!first,'TC-R210c '+geo+' '+id+' PRECONDITION the drill opened on his card ("you played '+ps+' here") and rejected '+ps+' with a ✗ line',{first});
    if(want){const exp='✗ '+ps+' '+want+'. Try again.';
      L.say(!!first&&first.t===exp,'TC-R210c '+geo+' '+id+' the first line is the board\'s reason: "'+(first&&first.t)+'"',{first,exp});
      L.say(!!later&&later.t===exp&&!later.cut,'TC-R210c '+geo+' '+id+' three seconds on it is unchanged and not cut by its box ("'+(later&&later.t)+'", cut '+(later&&later.cut)+')',{later});}
    else L.say(!!first&&/^✗ \S+ isn't it/.test(first.t),'TC-R210c '+geo+' '+id+' no board reason: the first line is the honest one ("'+(first&&first.t)+'")',{first});
    L.say(b.errs.length===0,'TC-R210c '+geo+' '+id+' zero app errors',b.errs.slice(0,3));
    await b.close();}
},'124-wrong-move-says-why');
