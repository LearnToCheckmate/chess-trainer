// gates/regress/174-scan-check-then-ask-then-play.js - AFTER A SCAN: CHECK THE BOARD FIRST, THEN WHO MOVES AND WHICH SIDE,
// THEN PLAY OR ANALYZE (US-R171, TC-R244).
// batch 13, jobs/scan-check-the-board-first-then-who-moves-and-which-side-then-play-or-analyze-2026-11-18. Kunal's pick on
// questions/Q30, 11:24pm EST Tue 17 Nov 2026: "Accept as shown", built from FB-16 (the board the way the photo shows it,
// and "from a picture is not always possible to tell which side I am interested in playing so you should also ask that
// question ... just ask it after you set it up"), FB-17 (a Check the board screen first), FB-18 (the best three moves under
// the board) and FB-19 (Analyze, to move both sides).
//
// THE ENGINE BRANCH, STATED: the four screen launches pass ct_pool, so the app runs its pooled Stockfish and the best three
// moves come from the row's own Stockfish at three lines; the LAST launch passes engineFail:'all' (every Stockfish worker
// fails), where the row ranks with the app's own search - both branches of the row are driven and each says which it was.
//
// NO NETWORK AND NO REAL SCAN: the scan's answer is doubled at window.CTCloud._scanBoard (gates/drive/scan.js; gate 28's
// header says why that seam is the deployed bridge's own) with three RECORDED answers:
//   ITALIAN   both readings agree, the picture shows White at the bottom, Black is to move (after 1.e4 e5 2.Nf3 Nc6 3.Bc4)
//   CORNER    the camera was on BLACK's side: the two readings DISAGREE (the as-shot reading is the board turned 180 degrees),
//             the app asks which side the camera was on, and the answer is Black's side. White to move, and Ra8 is mate.
//   GIUOCO    both readings agree and the as-shot reading says Black is at the bottom of the picture; White to move
// What it cannot prove: that the deployed function returns these shapes for a real photograph. That is his look with a real
// photo after the deploy of Q32.
//
// WHAT IS ASSERTED, per phone (kunal761, 320x568) and skin (classic, medieval), every line named '<geo> <skin> TC-R244x':
//   a  the scan opens Check the board, not the New Game sheet's 'Play this position'
//   b  its line reads 'Tap a square to fix it.'
//   c  the board is the position read, turned the way the PHOTO shows it (the painted bottom-left square)
//   d  a tap on a square changes it: the line asks what stands there, Empty square clears it, a piece puts one back; and a
//      board with a king missing cannot be accepted and says so
//   e  the next step asks who moves next and which side you are, the board is in the same place at the same size, and
//      NEITHER question is answered for him
//   f  Play and Analyze are their words, and neither starts a game until BOTH questions are answered
//   g  the game starts as answered: the position on the board is the checked one (the fix included), the side to move is
//      the one he said, and the computer moves first exactly when he said the other side moves next
//   h  the board keeps the photo's orientation whichever side he plays
//   i  three best moves sit under the board: three different legal moves of the position on the board, the first one the
//      mate where there is a mate in one, the row below the board and inside the screen, none cut
//   j  they update after each move: he plays the FIRST move shown, and after it (and the reply) all three are legal in the
//      NEW position, which the move just played is not
//   k  the Flip icon turns the board, and a move later it is still turned
//   m  in Analyze both sides are his to move: after his move nothing moves by itself, his move for the other side is
//      taken, and the board does not turn to the side to move
//   n  the board is the same size as the same game set up without a scan (the row costs it nothing) and does not move
//      between moves; the screen does not overflow
//   u  (node, once) the pure pieces: the FEN keeps the reading's own tail while nothing changed, drops castling the pieces
//      no longer allow, and the two refusals (a king in check with the other side to move; checkmate) say why
'use strict';
const L=require('../lib');
const S=require('../drive/scan');
const P=require('../drive/play');
const E=require('../engine-extract');
const ITALIAN='r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R';
const CORNER='6k1/5ppp/8/8/8/8/5PPP/R5K1',CORNER_TURNED='1K5R/PPP5/8/8/8/8/ppp5/1k6';
const GIUOCO='r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R';
const GEOS=(process.env.CT_G174_GEOS||'kunal761,se').split(',');
const SKINS=[['classic',{},false],['medieval',{ct_skin:'2'},true]].filter(s=>!process.env.CT_G174_SKINS||process.env.CT_G174_SKINS.split(',').includes(s[0]));
const occOf=(g)=>{const o=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(g.board[r][c])o.push(E.rc2sq(r,c));return o.sort();};
const legalSans=(g)=>E.getLegal(g).map(m=>E.cleanSAN(E.toSAN(g,m,E.applyMove(g.board,m))));
const moveOf=(g,san)=>E.getLegal(g).find(m=>E.cleanSAN(E.toSAN(g,m,E.applyMove(g.board,m)))===E.cleanSAN(san))||null;
const applySans=(g,sans)=>{let cur=g;for(const s of sans){const m=moveOf(cur,s);if(!m)return null;cur=E.makeMove(cur,m);}return cur;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// wait for the row to answer for the position on the board: three (or every) legal moves of `g`, none of them a wait mark
async function bestFor(b,g,ms){const legal=new Set(legalSans(g));const want=Math.min(3,legal.size);let r=null;
  for(let t=0;t<(ms||12000);t+=300){r=await S.best(b);if(r&&r.sans.length>=want&&r.sans.every(s=>legal.has(s)))return r;await b.settle(300);}return r;}
async function playSan(b,g,san){const m=moveOf(g,san);if(!m)return null;await b.move(E.rc2sq(m.fr,m.fc),E.rc2sq(m.tr,m.tc),500);return E.makeMove(g,m);}
const bd=async(b)=>{const x=await b.board();return x?{x:Math.round(x.x*10)/10,y:Math.round(x.y*10)/10,w:Math.round(x.w*10)/10,flip:x.flip}:null;};

function unit(){
  const T='TC-R244u ';
  const g0=E.scanGridOf('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 5 20');
  L.say(E.scanPlacement(g0)==='r3k2r/8/8/8/8/8/8/R3K2R',T+'a scanned board becomes a grid and back to the same placement',E.scanPlacement(g0));
  L.say(E.scanFenFor({fen0:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 5 20',grid:g0,turn:'w'})==='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 5 20',T+'with nothing changed and the same side to move the game starts from the reading\'s own FEN, castling and move counters kept');
  L.say(E.scanFenFor({fen0:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 5 20',grid:g0,turn:'b'})==='r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1',T+'the side HE says moves next is the side to move, whatever the reading guessed',E.scanFenFor({fen0:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 5 20',grid:g0,turn:'b'}));
  const g1=g0.map(r=>r.slice());g1[7][7]=null;
  L.say(E.scanFenFor({fen0:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 5 20',grid:g1,turn:'w'})==='r3k2r/8/8/8/8/8/8/R3K3 w Qkq - 0 1',T+'a rook taken off h1 takes White\'s short castling with it',E.scanFenFor({fen0:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 5 20',grid:g1,turn:'w'}));
  L.say(E.scanBoardProblem(g0)===null&&/exactly one king/.test(E.scanBoardProblem(E.scanGridOf('8/8/8/8/8/8/8/K7'))||'')&&/exactly one king/.test(E.scanBoardProblem(E.scanGridOf('k6K/8/8/8/8/8/8/K7'))||''),T+'a board without exactly one king a side is refused in words; a sound one is not');
  L.say(/pawn cannot stand/.test(E.scanBoardProblem(E.scanGridOf('k6P/8/8/8/8/8/8/K7'))||''),T+'a pawn on the last row is refused in words');
  L.say(E.scanTurnProblem(CORNER+' w - - 0 1')===null,T+'a playable position with the right side to move is not refused');
  L.say(/White cannot be next: Black's king is in check/.test(E.scanTurnProblem('R5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1')||''),T+'the wrong side to move (the other king could be taken) is refused in words',E.scanTurnProblem('R5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1'));
  L.say(/With Black to move it is checkmate/.test(E.scanTurnProblem('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1')||''),T+'a position that is already checkmate is refused in words',E.scanTurnProblem('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1'));
}

// the same position set up with NO scan row: the board's size in an ordinary game from a position, read on this bundle.
// Any game from a position will do: the one-device game the More sheet's rows never reach is out, so this is a plain
// game against the computer at move 0, whose board the scan game's must equal (TC-R244n).
async function plainBoard(b){await P.states['cpu-m0'](b);await b.settle(400);return bd(b);}

async function screens(geo,skin,sstore,pro){
  const T=geo+' '+skin+' TC-R244';
  const b=await L.launch({geo,name:'g174-'+skin+'-'+geo,pro:!!pro,store:{ct_pool:'3',...sstore}});await b.open();
  let stage='the plain game';
  try{
    const plain=await plainBoard(b);
    /* ── ITALIAN: White at the bottom of the picture, Black to move; he plays BLACK ─────────────────────────────── */
    stage='ITALIAN the scan';
    await S.scan(b,{fen:ITALIAN+' w KQkq - 0 1',orientation:'white-bottom'});
    let c=await S.check(b);const sheetText=await b.page.evaluate(()=>(document.body.innerText||'').replace(/\s+/g,' '));
    L.say(!!c&&c.step===1&&/^Check the board$/.test(c.title),T+'a ITALIAN: the scan opens a screen titled Check the board',c&&{title:c.title,step:c.step});
    L.say(!!c&&c.count===64&&!!c.board&&c.board.w>=Math.min(c.vw,300)-1&&c.board.x>=-0.5&&c.board.x+c.board.w<=c.vw+0.5,T+'a ITALIAN: with a board of 64 squares on it, inside the screen ('+(c&&c.board&&c.board.w)+' wide on a '+(c&&c.vw)+' screen)',c&&c.board);
    L.say(!!c&&c.line==='Tap a square to fix it.',T+'b ITALIAN: the line under the board reads "Tap a square to fix it."',c&&c.line);
    L.say(!!c&&c.placement===ITALIAN,T+'c ITALIAN: the board shows the position that was read',c&&c.placement);
    L.say(!!c&&c.bottomLeft==='a1',T+'c ITALIAN: turned the way the photo shows it - White at the bottom, a1 painted bottom-left',c&&c.bottomLeft);
    L.say(!!c&&c.bottom<=c.vh+0.5,T+'a ITALIAN: every button of the screen is on the screen (lowest '+(c&&c.bottom)+' of '+(c&&c.vh)+')',c&&{bottom:c.bottom,vh:c.vh});
    const pal0=await S.btn(b,'Empty square'),ok0=await S.btn(b,'The board is right');
    L.say(!!pal0&&pal0.dis===true,T+'d ITALIAN: the piece row is inert until a square is tapped',pal0);
    L.say(!!ok0&&ok0.dis===false&&ok0.words===''&&ok0.icons===1&&ok0.h>=44,T+'d ITALIAN: the accept button is an icon with no words, 44 tall ('+(ok0&&ok0.w)+'x'+(ok0&&ok0.h)+')',ok0);
    stage='ITALIAN a tap on a square';
    await S.tapSquare(b,'a7');let c1=await S.check(b);
    L.say(!!c1&&c1.line==='Pick what stands on a7.',T+'d ITALIAN: a tapped square is asked about by name ("'+(c1&&c1.line)+'")',c1&&c1.line);
    await S.pick(b,'Empty square');let c2=await S.check(b);
    L.say(!!c2&&c2.squares.a7==='empty'&&c.squares.a7==='black pawn',T+'d ITALIAN: Empty square clears it (a7 was a '+c.squares.a7+', now '+(c2&&c2.squares.a7)+')',c2&&c2.squares.a7);
    L.say(!!c2&&c2.line==='Tap a square to fix it.'&&same(c2.board,c.board),T+'d ITALIAN: and the screen is back to its line with the board where it was',c2&&{line:c2.line,board:c2.board});
    await S.tapSquare(b,'h3');await S.pick(b,'white pawn');await S.tapSquare(b,'h2');await S.pick(b,'Empty square');
    let c3=await S.check(b);const FIXED='r1bqkbnr/1ppp1ppp/2n5/4p3/2B1P3/5N1P/PPPP1PP1/RNBQK2R';
    L.say(!!c3&&c3.placement===FIXED,T+'d ITALIAN: a piece is put on a square the same way (h2 to h3: '+(c3&&c3.placement)+')',c3&&c3.placement);
    await S.tapSquare(b,'e8');await S.pick(b,'Empty square');
    const c4=await S.check(b),ok4=await S.btn(b,'The board is right');
    L.say(!!c4&&/exactly one king/.test(c4.line||'')&&!!ok4&&ok4.dis===true,T+'d ITALIAN: with a king taken off the board cannot be accepted and the line says why ("'+(c4&&c4.line)+'")',{line:c4&&c4.line,ok4});
    L.say(!!c4&&!!c4.lineBox&&c4.lineBox.sh<=c4.lineBox.ch+1,T+'d ITALIAN: that line is not cut by its box ('+(c4&&c4.lineBox&&c4.lineBox.sh)+' in '+(c4&&c4.lineBox&&c4.lineBox.ch)+')',c4&&c4.lineBox);
    await S.tapSquare(b,'e8');await S.pick(b,'black king');
    stage='ITALIAN the questions';
    const nx=await S.next(b);c=await S.check(b);
    const qT=await S.answered(b,'turn'),qS=await S.answered(b,'side');
    L.say(nx==='ok'&&!!c&&c.step===2&&!!qT&&!!qS,T+'e ITALIAN: the next step asks "Who moves next?" and "Which side are you?"',{nx,step:c&&c.step,qT,qS});
    L.say(!!c&&same(c.board,c3.board)&&c.placement===FIXED&&c.bottomLeft==='a1',T+'e ITALIAN: the board is the same board in the same place at the same size ('+JSON.stringify(c&&c.board)+')',{now:c&&c.board,was:c3.board});
    L.say(!!qT&&!!qS&&qT.on.length===0&&qS.on.length===0,T+'e ITALIAN: neither question is answered for him',{qT,qS});
    let pb=await S.btn(b,'Play'),ab=await S.btn(b,'Analyze');
    L.say(!!pb&&!!ab&&pb.words==='Play'&&ab.words==='Analyze'&&pb.h>=44&&ab.h>=44,T+'f ITALIAN: Play and Analyze are their words, 44 tall',{pb,ab});
    L.say(!!pb&&!!ab&&pb.dis===true&&ab.dis===true,T+'f ITALIAN: with nothing answered neither starts a game',{pb:pb&&pb.dis,ab:ab&&ab.dis});
    await S.answer(b,'turn','Black');pb=await S.btn(b,'Play');ab=await S.btn(b,'Analyze');
    const early=await S.start(b,'Play');const still=await S.check(b);
    L.say(!!pb&&pb.dis===true&&!!ab&&ab.dis===true&&early==='disabled'&&!!still&&still.step===2,T+'f ITALIAN: with only who-moves answered Play still does not start a game - the side is asked, never assumed',{pb:pb&&pb.dis,ab:ab&&ab.dis,early,step:still&&still.step});
    await S.answer(b,'side','Black');pb=await S.btn(b,'Play');const qS2=await S.answered(b,'side'),qT2=await S.answered(b,'turn');
    L.say(!!pb&&pb.dis===false&&same(qS2&&qS2.on,['Black'])&&same(qT2&&qT2.on,['Black']),T+'f ITALIAN: with both answered (Black moves, he is Black) Play is live',{pb,qS2,qT2});
    stage='ITALIAN Play';
    const st=await S.start(b,'Play');await b.settle(2200);
    let g=E.fromFEN(FIXED+' b KQkq - 0 1');
    const gone=!(await S.check(b));let o=await S.occupied(b),pl=await S.played(b),B0=await bd(b);
    L.say(st==='ok'&&gone&&!!o,T+'g ITALIAN: Play starts a game and the check screen is gone',{st,gone});
    L.say(!!o&&same(o.sq,occOf(g)),T+'g ITALIAN: the board holds the checked position, the fix included (a7 empty, the pawn on h3)',o&&o.sq.join(' '));
    L.say(Array.isArray(pl)&&pl.length===0,T+'g ITALIAN: Black moves next and he is Black, so the computer has NOT moved first (2.2s in, moves played: '+JSON.stringify(pl)+')',pl);
    L.say(!!B0&&B0.flip===false,T+'h ITALIAN: he plays Black and the board still shows White at the bottom, as the photo does',B0);
    let r=await bestFor(b,g);
    L.say(!!r&&r.sans.length===3&&new Set(r.sans).size===3&&r.sans.every(s=>legalSans(g).includes(s)),T+'i ITALIAN: three different legal moves for Black sit in the best-moves row ('+(r&&r.slots.map(x=>x.text).join(' | '))+')',r&&r.slots);
    L.say(!!r&&r.head==='BEST'&&r.vis==='visible',T+'i ITALIAN: the row is headed BEST',r&&{head:r.head,vis:r.vis});
    L.say(!!r&&!!B0&&r.y>=B0.y+B0.w-0.5&&r.x>=-0.5&&r.right<=r.vw+0.5,T+'i ITALIAN: it is under the board (row top '+(r&&r.y)+', board bottom '+(B0&&(B0.y+B0.w))+') and inside the screen',r&&{y:r.y,x:r.x,right:r.right});
    L.say(!!r&&r.slots.every(x=>!x.cut&&/^[+-]?\d+\.\d$|^-?M\d+$|^#$/.test(x.ev)),T+'i ITALIAN: each move carries a score and none is cut ('+(r&&r.slots.map(x=>x.ev+' in '+x.w).join(', '))+')',r&&r.slots);
    L.say(!!plain&&!!B0&&Math.abs(B0.w-plain.w)<0.6,T+'n ITALIAN: the board is the size of an ordinary game\'s on this phone ('+(B0&&B0.w)+' against '+(plain&&plain.w)+') - the row costs it nothing',{scan:B0,plain});
    stage='ITALIAN his move and the reply';
    const first=r&&r.sans[0];const g1=first?await playSan(b,g,first):null;
    let reply=null;for(let t=0;t<12000&&g1;t+=300){pl=await S.played(b);if(pl&&pl.length>=2){reply=pl[1];break;}await b.settle(300);}
    const g2=(g1&&reply)?applySans(g1,[reply]):null;
    L.say(!!g1&&!!pl&&E.cleanSAN(pl[0]||'')===first,T+'j ITALIAN: he plays the first move shown ('+first+') and it is taken as Black\'s move',pl);
    L.say(!!g2,T+'g ITALIAN: and the computer answers as White ('+reply+')',pl);
    const r2=g2?await bestFor(b,g2):null;
    L.say(!!r2&&!!g2&&r2.sans.length===3&&r2.sans.every(s=>legalSans(g2).includes(s)),T+'j ITALIAN: after the two moves the row shows three legal moves of the NEW position ('+(r2&&r2.sans.join(' '))+'; before: '+(r&&r.sans.join(' '))+')',r2&&r2.sans);
    L.say(!!g2&&!!first&&!legalSans(g2).includes(first),T+'j ITALIAN: DENOMINATOR the move he played ('+first+') is not legal any more, so a row left as it was could not pass the line above',first);
    const B1=await bd(b);const ov=await b.over();
    L.say(!!B1&&!!B0&&same(B1,B0),T+'n ITALIAN: the board did not move or change size across the moves',{B0,B1});
    L.say(!!ov&&ov.over<=0.5,T+'n ITALIAN: the screen does not overflow ('+(ov&&ov.over)+')',ov);
    stage='ITALIAN Flip';
    const fb=await S.rowBtn(b,'Flip');await S.tapRow(b,'Flip',500);const B2=await bd(b);
    L.say(!!fb&&!fb.dis&&fb.words===''&&!!B2&&B2.flip===true,T+'k ITALIAN: the Flip icon (no words) turns the board',{fb,B2});
    const r3=g2?await bestFor(b,g2):null;const second=r3&&r3.sans[0];const g3=second?await playSan(b,g2,second):null;await b.settle(600);const B3=await bd(b);
    L.say(!!g3&&!!B3&&B3.flip===true,T+'k ITALIAN: and after his next move ('+second+') it is still turned',B3);
    L.say(b.errs.length===0,T+' ITALIAN: zero app errors',b.errs.slice(0,3));

    /* ── CORNER: the camera on Black's side (the readings disagree); Analyze ─────────────────────────────────────── */
    stage='CORNER the scan';
    await S.scan(b,{seq:[{ok:true,fen:CORNER_TURNED+' w - - 0 1',orientation:'unknown'},{ok:true,fen:CORNER+' w - - 0 1',orientation:'unknown'}],asym:true});
    const askTxt=await b.page.evaluate(()=>(document.body.innerText||'').replace(/\s+/g,' '));
    L.say(/Which side of the board was the camera on\?/.test(askTxt)&&!(await S.check(b)),T+'c CORNER: the two readings disagree, so the app asks which side the camera was on before showing a board');
    await S.cameraSide(b,'Black');c=await S.check(b);
    L.say(!!c&&c.step===1&&c.placement===CORNER,T+'c CORNER: answered Black\'s side, Check the board shows the reading for a camera on Black\'s side',c&&c.placement);
    L.say(!!c&&c.bottomLeft==='h8',T+'c CORNER: turned the way the photo shows it - Black at the bottom, h8 painted bottom-left',c&&c.bottomLeft);
    stage='CORNER the questions';
    await S.next(b);await S.answer(b,'turn','Black');const cw=await S.check(b);
    L.say(!!cw&&/^With Black to move|Black cannot be next/.test(cw.line||'')===false,T+'e CORNER: Black to move is a playable answer here and is not refused',cw&&cw.line);
    await S.answer(b,'turn','White');await S.answer(b,'side','Black');
    const ab2=await S.btn(b,'Analyze');
    L.say(!!ab2&&ab2.dis===false,T+'f CORNER: with both answered (White moves, he is Black) Analyze is live',ab2);
    stage='CORNER Analyze';
    const st2=await S.start(b,'Analyze');await b.settle(1800);
    g=E.fromFEN(CORNER+' w - - 0 1');o=await S.occupied(b);pl=await S.played(b);const A0=await bd(b);
    L.say(st2==='ok'&&!(await S.check(b))&&!!o&&same(o.sq,occOf(g)),T+'g CORNER: Analyze puts the checked position on the board',o&&o.sq.join(' '));
    L.say(Array.isArray(pl)&&pl.length===0,T+'m CORNER: nothing has moved by itself (1.8s in, moves: '+JSON.stringify(pl)+')',pl);
    L.say(!!A0&&A0.flip===true,T+'h CORNER: White is to move and the board still shows Black at the bottom, as the photo does',A0);
    r=await bestFor(b,g);
    L.say(!!r&&r.sans.length===3&&new Set(r.sans).size===3,T+'i CORNER: three different legal moves for White sit in the row ('+(r&&r.slots.map(x=>x.text).join(' | '))+')',r&&r.slots);
    L.say(!!r&&r.sans[0]==='Ra8'&&/^M1$|^#$/.test(r.slots[0].ev),T+'i CORNER: Ra8 is mate here whatever any readout says, and it is the FIRST move shown, scored as mate ('+(r&&r.slots[0]&&r.slots[0].text)+')',r&&r.slots[0]);
    stage='CORNER both sides by hand';
    const ga=await playSan(b,g,'h3');await b.settle(1800);pl=await S.played(b);
    L.say(!!ga&&same((pl||[]).map(E.cleanSAN),['h3']),T+'m CORNER: he moves for White (h3) and 1.8s later Black has not moved by itself ('+JSON.stringify(pl)+')',pl);
    const A1=await bd(b);
    L.say(!!A1&&A1.flip===true&&same(A1,A0),T+'m CORNER: the board did not turn to the side to move, and did not move',{A0,A1});
    const ra=await bestFor(b,ga);
    L.say(!!ra&&ra.sans.length===3&&ra.sans.every(s=>legalSans(ga).includes(s)),T+'j CORNER: the row now shows three legal moves for Black ('+(ra&&ra.sans.join(' '))+')',ra&&ra.sans);
    const gb=await playSan(b,ga,'Kh8');await b.settle(900);pl=await S.played(b);
    L.say(!!gb&&same((pl||[]).map(E.cleanSAN),['h3','Kh8']),T+'m CORNER: and he moves for Black too (Kh8): both sides are his ('+JSON.stringify(pl)+')',pl);
    const rb=await bestFor(b,gb);
    L.say(!!rb&&rb.sans.length===3&&rb.sans.every(s=>legalSans(gb).includes(s))&&rb.sans[0]==='Ra8',T+'j CORNER: and the row is White\'s again, Ra8 (still mate) first ('+(rb&&rb.sans.join(' '))+')',rb&&rb.sans);
    L.say(b.errs.length===0,T+' CORNER: zero app errors',b.errs.slice(0,3));

    /* ── GIUOCO: the as-shot reading says Black is at the bottom; White moves next and he is BLACK ───────────────── */
    stage='GIUOCO the scan';
    await S.scan(b,{fen:GIUOCO+' w KQkq - 0 1',orientation:'black-bottom'});
    c=await S.check(b);
    L.say(!!c&&c.step===1&&c.placement===GIUOCO&&c.bottomLeft==='h8',T+'c GIUOCO: the reading says the photo has Black at the bottom, and Check the board is turned that way (h8 bottom-left)',c&&{placement:c.placement,bl:c.bottomLeft});
    stage='GIUOCO Play';
    await S.next(b);await S.answer(b,'turn','White');await S.answer(b,'side','Black');
    const st3=await S.start(b,'Play');g=E.fromFEN(GIUOCO+' w KQkq - 0 1');
    let w1=null;for(let t=0;t<12000;t+=300){await b.settle(300);pl=await S.played(b);if(pl&&pl.length>=1){w1=pl[0];break;}}
    const gw=w1?applySans(g,[w1]):null;
    L.say(st3==='ok'&&!!gw,T+'g GIUOCO: White moves next and he is Black, so the computer moves first, a legal move for White ('+w1+')',pl);
    const G0=await bd(b);
    L.say(!!G0&&G0.flip===true,T+'h GIUOCO: the board shows Black at the bottom, as the photo does',G0);
    const rg=gw?await bestFor(b,gw):null;
    L.say(!!rg&&rg.sans.length===3&&rg.sans.every(s=>legalSans(gw).includes(s)),T+'i GIUOCO: the row shows three legal moves for Black after the computer\'s move ('+(rg&&rg.sans.join(' '))+')',rg&&rg.sans);
    L.say(b.errs.length===0,T+' GIUOCO: zero app errors',b.errs.slice(0,3));
  }catch(e){L.say(false,T+' HARNESS: the drive threw at "'+stage+'" (NOT an app result; every line after it is unrun)',String(e&&e.message||e).slice(0,220));}
  await b.close();
}

// every Stockfish worker fails: the row ranks with the app's own search and says so
async function noEngine(geo){
  const T=geo+' no-engine TC-R244';
  const b=await L.launch({geo,name:'g174-noeng-'+geo,engineFail:'all',store:{ct_pool:'3'}});await b.open();
  try{
    const st=await S.through(b,{fen:CORNER+' w - - 0 1',turn:'w',side:'w',kind:'Analyze',settle:1500});
    const ef=await b.engineFail();
    L.say(st==='ok'&&!!ef&&ef.failed>0,T+'i PRECONDITION the game started and the harness failed '+(ef&&ef.failed)+' Stockfish worker(s), so this is the no-engine branch',{st,ef});
    const g=E.fromFEN(CORNER+' w - - 0 1');const r=await bestFor(b,g,20000);
    L.say(!!r&&r.sans.length===3&&new Set(r.sans).size===3&&r.sans.every(s=>legalSans(g).includes(s)),T+'i with no Stockfish the row still shows three different legal moves ('+(r&&r.slots.map(x=>x.text).join(' | '))+')',r&&r.slots);
    L.say(!!r&&r.sans[0]==='Ra8'&&r.slots[0].ev==='#',T+'i and the mate is first, marked # (the app\'s own search does not count the moves to mate)',r&&r.slots[0]);
    const ga=await playSan(b,g,'h3');const ra=ga?await bestFor(b,ga,20000):null;
    L.say(!!ra&&ra.sans.length===3&&ra.sans.every(s=>legalSans(ga).includes(s)),T+'j and it updates after a move: three legal moves for Black ('+(ra&&ra.sans.join(' '))+')',ra&&ra.sans);
    L.say(b.errs.length===0,T+' zero app errors',b.errs.slice(0,3));
  }catch(e){L.say(false,T+' HARNESS: the no-engine drive threw (NOT an app result)',String(e&&e.message||e).slice(0,220));}
  await b.close();
}

L.run(async()=>{
  console.log('     engine-extract read chess.jsx md5 '+E.SOURCE_MD5+' (the legal-move lists and the unit lines come from it)');
  if(!process.env.CT_G174_NO_UNIT)unit();
  for(const geo of GEOS)for(const [skin,sstore,pro] of SKINS)await screens(geo,skin,sstore,pro);
  if(!process.env.CT_G174_NO_NOENG)await noEngine(GEOS[0]);
  L.done();
});
