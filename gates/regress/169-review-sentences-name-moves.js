'use strict';
// gates/regress/169-review-sentences-name-moves.js - THE REVIEW'S SENTENCES NAME WHAT THE MOVES DO. US-R163 / TC-R234a..n.
//
// WHY [batch 13, jobs/review-sentences-name-what-the-moves-do-2026-11-12, the remainder: docs/hint-audit-2026-11-12 HEX-R-02, -06, -07, -08
// and the named residuals A2, A3, A6, B6, B7 of docs/review-text-design-2026-11-14; Kunal, 12 Nov 2026: "we have a few places we are giving
// hints explanations. We should check all of those."]: after the Review text was rebuilt at batch 10, a good move whose point the board
// proves still said nothing about it (12...Ne4 out of a pawn's attack: "The best move."), a queen sacrifice that forces mate said only what it
// gave up until a search landed, the only legal move that TAKES the checking piece "blocked the check", a move out of check "let a bishop
// out", the last ply claimed "Nothing is lost at once" with no reply looked at, checks lost their sign in the prose ("11.Bxb5"), the why
// pill spelt a pawn move "E4", the engine line in words called a recapture "wins the queen" when the move before it had only LANDED on the
// square, and the summary's Coach's take named its toughest moment as a bare move with no word on what it lost.
//
// WHAT IT READS: chess.jsx through gates/engine-extract.js for the node lines (the shipped reviewText, rtRead, explainLine, playWhyTxt,
// revChain, coachWorst), and the bundle under test (CT_APP) for the screen lines at his phone (kunal761, 375x761) and at 320x568, each read
// AFTER stepping to the ply through the move strip, never at ply 0.
// NOT THE SAME OBJECT TWICE (CLAUDE.md, "a cross-check against a readout fed by the thing under test is not a cross-check"): every sentence
// is matched against ONE template and the facts it prints are then checked against the POSITION by this gate's own reading of the rules
// (legal moves, check, checkmate, who attacks what) - never against another output of the sentence builder. A threat names a move this gate
// plays and finds to be mate; "the only legal move" is counted; a move number is the one the ply has.
// THE SCREEN LINES RUN TWO GAMES: the Opera Game (gates/drive/review.js) and a 13-ply Alekhine Defense that ends 6...Qxf2+ 7.Kxf2 (the
// king's only legal move takes the checking queen). A pasted game has no player colour, so the screen reads the White/Black voice; the
// node lines read the you/your voice. CT_G169_NODE_ONLY=1 runs the node lines alone and SAYS so (controls; gates.sh never sets it).
// ON THE REAL TREE: 61/0 on trial f3ca51cee808 (chess.jsx 057f3b41371c), 19 Nov 2026, in a subset run. The pair
// (gates/pairs/jobs/review-sentences-name-what-the-moves-do-2026-11-12.json) re-runs breaks A, B and C whole on the committed head.
// The node-only controls below were run with CT_SRC on a copy of chess.jsx carrying one change each (36 node lines).
// CONTROL-RECORD: 5517aa33 2026-11-19 total=36 red=25 scope=env:CT_G169_NODE_ONLY=1 how=batch 13: THE TREE BEFORE THE CHANGE (CT_SRC the chess.jsx of 3d1a988b, md5 3bea9d949937) - every TC-R234a..l line that reads a changed sentence red, the must-still lines green
// CONTROL-RECORD: 5517aa33 2026-11-19 total=36 red=7 scope=env:CT_G169_NODE_ONLY=1 how=batch 13 break A (gates/pairs/breaks/g169-good-move-readings-gone.diff): reviewText no longer reads rtRead - TC-R234a (Ne4), the three TC-R234b threats, both TC-R234c stops and TC-R234d (Nb6) red
// CONTROL-RECORD: 5517aa33 2026-11-19 total=36 red=2 scope=env:CT_G169_NODE_ONLY=1 how=batch 13 break B (g169-brilliant-mate-waits-for-the-search.diff): the Brilliant mate waits for the refutation search again - both TC-R234g mate lines red
// CONTROL-RECORD: 5517aa33 2026-11-19 total=36 red=5 scope=env:CT_G169_NODE_ONLY=1 how=batch 13 break C (g169-check-signs-dropped.diff): rtN and rtRun drop the check sign again - both TC-R234g runs, both TC-R234h lines and the TC-R234l reason red
// CONTROL-RECORD: 5517aa33 2026-11-19 total=36 red=2 scope=env:CT_G169_NODE_ONLY=1 how=batch 13 control D (not a pairs break; the diff is kept as gates/pairs/breaks/g169-forced-capture-blocks-the-check.diff): the Forced branch never reads the captured piece - TC-R234e Rxe1 and Kxg1 red ("it blocks the check", "the king steps out of check")
// CONTROL-RECORD: 5517aa33 2026-11-19 total=36 red=2 scope=env:CT_G169_NODE_ONLY=1 how=batch 13 control E (not a pairs break; g169-take-back-bit-is-a-landing.diff): the chain bit is set when the move before only landed on the square - TC-R234j (Bxb4+ "wins the queen, with check") and TC-R234k red
const L=require('../lib');
const E=require('../engine-extract.js');
const RV=require('../drive/review');
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OPERA='e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'.split(' ');
const G1='[Event "gate 169"]\n[White "A"]\n[Black "B"]\n[Result "*"]\n\n1. e4 Nf6 2. e5 Nd5 3. c4 Nb6 4. d3 e6 5. Nc3 Qh4 6. a3 Qxf2+ 7. Kxf2 *';
// ── this gate's own reading of the rules (never the sentence builder's) ─────────────────────────────────────────────────────────────
const mv=(g,san)=>E.findMoveBySAN(g,san);
const sanOf=(g,m)=>E.toSAN(g,m,E.applyMove(g.board,m));
const flip=(g)=>Object.assign({},g,{turn:g.turn==='w'?'b':'w',ep:null});
const matesIn1=(g)=>E.getLegal(g).filter(m=>E.getStatus(E.makeMove(g,m))==='checkmate').map(m=>sanOf(g,m).replace(/[+#]$/,''));
const sqRC=(sq)=>[8-(+sq[1]),'abcdefgh'.indexOf(sq[0])];
const PW={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
function line(fen,san,label,o){o=o||{};try{const pre=E.fromFEN(fen),m=mv(pre,san);if(!m)return {line:'NOMOVE '+san,more:''};const post=E.makeMove(pre,m);
    const rep=o.reply?mv(post,o.reply):null;let prev=null;if(o.prev)prev=o.prev;
    const a={cls:{label},loss:o.loss||0,evalAfter:o.ev!=null?o.ev:0,bestMove:o.best?mv(pre,o.best):null,gist:E.moveGist(pre,m),motifs:E.moveMotifs(pre,m)||[],gate:o.gate||{}};
    const r=E.reviewText(a,Object.assign({label,userColor:o.uc===undefined?pre.turn:o.uc,pos:pre,ply:{move:m,san},prev,next:rep?{bestMove:rep}:null,nextPly:rep?{move:rep,san:o.reply}:null,nextPos:post,moveNo:o.n||10,maxw:150},o.ctx||{}))||{line:'',more:''};
    return {line:r.line||'',more:r.more||'',pre,post,m};}catch(e){return {line:'THREW '+e.message,more:''};}}
L.run(async()=>{
  L.note('169: chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5);
  const has=['reviewText','rtRead','explainLine','playWhyTxt','revChain','coachWorst'].filter(n=>typeof E[n]!=='function');
  L.say(has.length===0,'node TC-R234a PRECONDITION the source under test declares the functions these lines call (missing: '+(has.join(', ')||'none')+')',has);
  // ── TC-R234a, HEX-R-02: A PIECE MOVED AWAY FROM AN ATTACKER THAT WAS WINNING IT ─────────────────────────────────────────────────────
  {const F='r2qr1k1/ppp2ppp/2n1pn2/3pP3/3P4/2PQ1N2/PP1B1PPP/R3R1K1 b - - 0 12';const t=line(F,'Ne4','Best',{n:12});
   const m=/^The best move\. It moves your (\w+) away from their (\w+) on ([a-h][1-8])\.$/.exec(t.line);let truth=false,why='';
   if(m&&t.pre){const [ar,ac]=sqRC(m[3]);const at=t.pre.board[ar][ac],me=t.pre.board[t.m.fr][t.m.fc];
     truth=!!at&&at.c==='w'&&PW[at.t]===m[2]&&!!me&&PW[me.t]===m[1]&&E.moveHits(t.pre.board,ar,ac,t.m.fr,t.m.fc)&&!E.moveHits(t.post.board,ar,ac,t.m.tr,t.m.tc);why=PW[at&&at.t]+' on '+m[3]+' hits f6 before and not e4 after';}
   L.say(!!m&&truth,'node TC-R234a 12...Ne4 (the audit\'s position) says the knight moves away from the pawn on e5, and the board agrees ('+why+'): "'+t.line+'"',t.line);
   const no1=line('rnbqkb1r/pppp1ppp/5n2/4P3/8/7P/PPPP1PP1/RNBQKBNR b KQkq - 0 3','Ng4','Good',{n:3}),no2=line(F,'a6','Good',{n:12});
   L.say(!/away from|out of danger|out of the attack/.test(no1.line)&&!/away from|out of danger|out of the attack/.test(no2.line)&&no1.line.indexOf('THREW')<0&&no2.line.indexOf('NOMOVE')<0,'node TC-R234a (must not) a knight that steps onto a square where a pawn takes it (3...Ng4, hxg4) and a move that leaves the knight where it is (12...a6) are not "moved away": "'+no1.line+'" | "'+no2.line+'"',{no1:no1.line,no2:no2.line});}
  // ── TC-R234b, HEX-R-02: A MATE THREAT, the move named with ITS number, and this gate plays it ────────────────────────────────────────
  {const C=[['r4rk1/6pp/2p1p3/P2qB3/1P1P4/2PQ4/5PPP/R5K1 w - - 0 25','Qg3','Good',25,/It threatens (26)\.(Qxg7) mate/],
            ['5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w - - 0 30','Qe4','Best',30,/It threatens (31)\.(Qxh7) mate/],
            ['4q1k1/5ppp/8/8/6n1/8/5PPP/5RK1 b - - 0 20','Qe5','Best',20,/It threatens (21)\.\.\.(Qxh2) mate/]];
   for(const [fen,san,lab,n,re] of C){const t=line(fen,san,lab,{n,best:lab==='Good'?'c4':null,loss:lab==='Good'?40:0,ev:4});const m=re.exec(t.line);let truth=false,was=[],now=[];
     if(m&&t.pre){was=matesIn1(t.pre);now=matesIn1(flip(t.post));truth=now.indexOf(m[2])>=0&&was.length===0&&+m[1]===n+1&&matesIn1(t.post).length===0;}
     L.say(!!m&&truth,'node TC-R234b '+n+(fen.indexOf(' w ')>0?'.':'...')+san+' names the mate it threatens with the next move number, and this gate finds that move to be mate (mates the mover has if it moves again: '+now.join(',')+'; before the move: '+(was.join(',')||'none')+'): "'+t.line+'"',t.line);}
   const n1=line('5rk1/5ppp/5n2/6N1/8/8/5PPP/4Q1K1 w - - 0 30','Qe4','Good',{n:30}),n2=line('5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w - - 0 30','Qe3','Good',{n:30});
   L.say(!/threaten/.test(n1.line)&&!/threaten/.test(n2.line)&&n1.line.indexOf('THREW')<0,'node TC-R234b (must not) no mate threat is claimed where the knight on f6 takes the queen (Qe4) or the queen sees nothing near the king (Qe3): "'+n1.line+'" | "'+n2.line+'"',{n1:n1.line,n2:n2.line});}
  // ── TC-R234c, HEX-R-02: A MATE IN ONE STOPPED ───────────────────────────────────────────────────────────────────────────────────────
  {let g=E.fromFEN(START);for(const s of OPERA.slice(0,11))g=E.makeMove(g,mv(g,s));const fenO=E.toFEN(g);
   const C=[[fenO,'Nf6','Best',6,/It stops (7)\.(Qxf7) mate/],['4r1k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 30','h3','Best',30,/It stops ()\.\.\.(Re1) mate/]];
   for(const [fen,san,lab,n,re] of C){const t=line(fen,san,lab,{n});const m=re.exec(t.line);let truth=false,had=[],left=[];
     if(m&&t.pre){had=matesIn1(flip(t.pre));left=matesIn1(t.post);truth=had.indexOf(m[2])>=0&&left.length===0&&(m[1]===''||+m[1]===n+1);}
     L.say(!!m&&truth,'node TC-R234c '+n+(fen.indexOf(' w ')>0?'.':'...')+san+' names the mate it stops, and this gate finds that mate there before the move and none after (before: '+had.join(',')+'; after: '+(left.join(',')||'none')+'): "'+t.line+'"',t.line);}
   const n0=line('4r1k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 30','Ra6','Good',{n:30});
   L.say(!/stops/.test(n0.line)&&n0.line.indexOf('NOMOVE')<0,'node TC-R234c (must not) a move that leaves ...Re1 mate on the board (30.Ra6) stops nothing: "'+n0.line+'"',n0.line);}
  // ── TC-R234d, residual A3 and the backs-up test: a move out of check lets nothing out; nothing unattacked is "backed up" ─────────────
  {const F='rnbqk1nr/pppp1ppp/8/4p3/1b1PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';const k=line(F,'Ke2','Good',{n:3}),c=line(F,'c3','Best',{n:3});
   L.say(k.line==='Fine.'&&E.isInCheck(E.fromFEN(F).board,'w'),'node TC-R234d 3.Ke2, a king move out of the bishop\'s check, lets no bishop out and backs up nothing (it read "It backs up your bishop on f1, and lets your c1 bishop out."): "'+k.line+'"',k.line);
   const m=/backs up your (\w+) on ([a-h][1-8])/.exec(c.line);let att=false;if(m&&c.post){const [r,cc]=sqRC(m[2]);att=E.isAttacked(c.post.board,r,cc,'b');}
   L.say(!!m&&att&&!/lets your/.test(c.line),'node TC-R234d (must still) 3.c3 in the same check backs up the d4 pawn, which Black does attack: "'+c.line+'"',c.line);
   let g=E.fromFEN(START);for(const s of 'e4 Nf6 e5 Nd5 c4'.split(' '))g=E.makeMove(g,mv(g,s));const nb=line(E.toFEN(g),'Nb6','Best',{n:3});
   L.say(!/backs up/.test(nb.line)&&/away from their pawn on c4/.test(nb.line),'node TC-R234d 3...Nb6 no longer "backs up your rook on a8", a rook nothing attacks: "'+nb.line+'"',nb.line);
   const f8=line('rnbqkb1r/pp1p1ppp/4pn2/2p5/3P4/2P2N2/PP2PPPP/RNBQKB1R w KQkq - 1 4','e3','Excellent',{n:4,ev:0.1});
   L.say(/backs up your pawn on d4/.test(f8.line)&&/lets your f1 bishop out/.test(f8.line),'node TC-R234d (must still) 4.e3 backs up the attacked d4 pawn and lets the f1 bishop out: "'+f8.line+'"',f8.line);}
  // ── TC-R234e, residual A2: the only legal move, and what it does about the check ────────────────────────────────────────────────────
  {const C=[['6k1/5ppp/8/8/8/8/6PP/R3r2K w - - 0 30','Rxe1',/^Your only legal move: it takes the (rook) that gives check\./,'takes'],
            ['6k1/5ppp/8/8/8/8/7P/6rK w - - 0 30','Kxg1',/^Your only legal move: the king takes the (rook) that gives check\./,'takes'],
            ['6k1/5ppp/8/8/2B5/8/6PP/4r2K w - - 0 30','Bf1',/^Your only legal move: it blocks the check\./,'blocks'],
            ['6k1/5ppp/8/2b5/8/8/6P1/4r1K1 w - - 0 30','Kh2',/^Your only legal move: the king steps out of check\./,'steps']];
   for(const [fen,san,re,kind] of C){const t=line(fen,san,'Forced',{n:30,ev:0});const m=re.exec(t.line);let truth=false,n=0;
     if(t.pre){n=E.getLegal(t.pre).length;const k=E.findKing(t.pre.board,'w');const cap=t.pre.board[t.m.tr][t.m.tc];const chk=E.isInCheck(t.pre.board,'w');
       const capChecks=!!cap&&E.moveHits(t.pre.board,t.m.tr,t.m.tc,k[0],k[1]);
       truth=n===1&&chk&&(kind==='takes'?(capChecks&&!!m&&PW[cap.t]===m[1]):kind==='blocks'?(!cap&&t.pre.board[t.m.fr][t.m.fc].t!=='k'):(!cap&&t.pre.board[t.m.fr][t.m.fc].t==='k'));}
     L.say(!!m&&truth,'node TC-R234e 30.'+san+' ('+kind+'; legal moves counted here: '+n+') reads what the board shows: "'+t.line+'"',t.line);}}
  // ── TC-R234f, residual A6: with no reply in hand the fallback claims nothing ────────────────────────────────────────────────────────
  {const last=line(START,'a3','Inaccuracy',{n:1,loss:40}),mid=line(START,'a3','Inaccuracy',{n:1,loss:40,reply:'e5'});
   L.say(last.line==='A small slip.','node TC-R234f the last ply (no reply to look at) keeps its verdict and claims nothing about what is lost: "'+last.line+'"',last.line);
   L.say(mid.line==='A small slip. Nothing is lost at once, but your opponent’s best reply is the pawn move ...e5.','node TC-R234f (must still) with the reply in hand the fallback is the design\'s sentence: "'+mid.line+'"',mid.line);}
  // ── TC-R234g, HEX-R-06: a sacrifice that forces mate in two says so at once, and the same when the search lands ─────────────────────
  {const C=[['4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16','Qb8+',16,'16.Qb8+ Nxb8 17.Rd8 mate',['Qb8+','Nxb8','Rd8#']],
            ['5rk1/r6p/2p1p1p1/P3B3/1P1P4/2P4Q/5qPP/2R4K b - - 0 30','Qf1+',30,'30...Qf1+ 31.Rxf1 Rxf1 mate',['Qf1+','Rxf1','Rxf1#']]];
   for(const [fen,san,n,run,three] of C){const due=line(fen,san,'Brilliant',{n,ctx:{refuteDue:true}}),got=line(fen,san,'Brilliant',{n,ctx:{refute:{capSan:three[1],replyLine:[three[2]]}}});
     let truth=false,rep=0;try{let g=E.fromFEN(fen);const m1=mv(g,three[0]);g=E.makeMove(g,m1);rep=E.getLegal(g).length;const m2=mv(g,three[1]);g=E.makeMove(g,m2);const m3=mv(g,three[2]);g=E.makeMove(g,m3);truth=rep===1&&E.getStatus(g)==='checkmate';}catch(e){}
     const want=new RegExp('^(You give|You leave)[^.]*\\. It is mate in two: '+run.replace(/[.+]/g,'\\$&')+'\\.$');
     L.say(want.test(due.line)&&due.line===got.line&&truth,'node TC-R234g '+san+' prints the mate before the refutation search lands and the same after it (this gate plays '+three.join(' ')+': one legal reply ('+rep+'), then checkmate): "'+due.line+'"',{due:due.line,got:got.line});}
   const nb=line('rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq - 0 10','Nxb5','Brilliant',{n:10,ctx:{refuteDue:true}});
   L.say(!/mate\b/i.test(nb.line)&&/^You give/.test(nb.line),'node TC-R234g (must not) 10.Nxb5, a sacrifice that mates nobody, claims no mate: "'+nb.line+'"',nb.line);}
  // ── TC-R234h, residual B6: a check keeps its sign, in a run and in the prose ────────────────────────────────────────────────────────
  {const f5=line('4kb1r/p2B1ppp/4qn2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 15','Nxd7','Blunder',{n:15,reply:'Qb8+',best:'Qxd7',loss:1500,ev:99,uc:'w'});
   L.say(/It allows mate in two: 16\.Qb8\+ Nxb8 17\.Rd8 mate\.$/.test(f5.line),'node TC-R234h the mate-in-two run keeps the check sign on the move that checks and drops only the mate mark: "'+f5.line+'"',f5.line);
   let g=E.fromFEN(START);for(const s of OPERA.slice(0,19))g=E.makeMove(g,mv(g,s));const w8=line(E.toFEN(g),'cxb5','Inaccuracy',{n:10,reply:'Bxb5+',loss:60,uc:'b'});
   const m=/best reply is the bishop move (11)\.(Bxb5)(\+?)\.$/.exec(w8.line);let chk=false;if(w8.post){const r=mv(w8.post,'Bxb5+');chk=!!r&&E.isInCheck(E.makeMove(w8.post,r).board,'b');}
   L.say(!!m&&m[3]==='+'&&chk,'node TC-R234h 10...cxb5: the reply is written 11.Bxb5+ and this gate finds it gives check (it read "11.Bxb5"): "'+w8.line+'"',w8.line);
   const q=line(START,'a3','Inaccuracy',{n:1,loss:40,reply:'e5'});
   L.say(!/\+/.test(q.line),'node TC-R234h (must not) a reply that gives no check carries no sign: "'+q.line+'"',q.line);}
  // ── TC-R234i, residual B7: the why pill's words keep a move's own spelling ──────────────────────────────────────────────────────────
  // a control source older than a helper must go red on its own line and carry on (CLAUDE.md: a gate that halts on the first missing element hides every regression after it)
  const PWT=typeof E.playWhyTxt==='function'?E.playWhyTxt:(()=>'NO playWhyTxt'),RCH=typeof E.revChain==='function'?E.revChain:(()=>null),CWO=typeof E.coachWorst==='function'?E.coachWorst:(()=>({name:'NO coachWorst',why:''}));
  {const rows=E.explainLine(START,['e2e4','e7e5','g1f3'],3,1)||[];const t=PWT(rows);const t2=PWT(E.explainLine(START,['g1f3','d7d5'],3,1)||[]);
   L.say(/^e4 [a-z]/.test(t)&&/\.$/.test(t)&&!/^E4/.test(t),'node TC-R234i a line that starts with a pawn move starts "e4", never "E4": "'+t+'"',t);
   L.say(/^Nf3 [a-z]/.test(t2),'node TC-R234i (must still) a piece move keeps its capital: "'+t2+'"',t2);}
  // ── TC-R234j, HEX-R-08: the engine line in words ────────────────────────────────────────────────────────────────────────────────────
  {const pv=(fen,sans)=>{let g=E.fromFEN(fen);const o=[];for(const s of sans){const m=mv(g,s);if(!m)break;o.push(E.rc2sq(m.fr,m.fc)+E.rc2sq(m.tr,m.tc)+(m.promo||''));g=E.makeMove(g,m);}return o;};
   const XL=(fen,sans,no)=>(E.explainLine(fen,pv(fen,sans),6,no)||[]).map(r=>r.why);
   const a=XL('rn2kb1r/ppp1qppp/5n2/4p3/2B1P3/1Q6/PPP2PPP/RNB1K2R w KQkq - 0 8',['Qxb7','Qb4+','Qxb4','Bxb4+'],8);
   L.say(a.length===4&&a[3]==='takes back on b4, so the queens are traded, with check'&&!a.some(x=>/wins the queen/.test(x)),'node TC-R234j 8.Qxb7 Qb4+ 9.Qxb4 Bxb4+: the recapture takes back and the queens are traded - Qb4+ only LANDED on b4, so nothing was "won" (it read "wins the queen, with check"): '+JSON.stringify(a),a);
   const c=XL('3q4/6k1/5Q2/4P3/8/8/8/6K1 b - - 0 1',['Qxf6','exf6+','Kxf6'],1);
   L.say(c.length===3&&/^takes back on f6, so the queens are traded/.test(c[1])&&c[2]==='wins the pawn','node TC-R234j (must still) 1...Qxf6 2.exf6+ Kxf6: the pawn takes back, and the king then WINS the pawn (the capture before it was itself a take-back): '+JSON.stringify(c),c);
   const b=XL('4kb1r/p2q1ppp/5n2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',['Qb8+','Ke7','Qxe5+'],16);
   L.say(b[0]==='gives check'&&b[1]==='steps out of check','node TC-R234j 16.Qb8+ is a check (it read "hits the pawn on a7, with check") and 16...Ke7, a row that had no words, steps out of it: '+JSON.stringify(b),b);
   const F='r4rk1/7p/2p1p1pQ/P3B3/1P1P4/2P5/5qPP/2R4K b - - 0 29';const d=XL(F,['Qf1+','Rxf1','Rxf1#'],29);let n2=0,n1=0;try{const g0=E.fromFEN(F);n1=E.getLegal(g0).length;n2=E.getLegal(E.makeMove(g0,mv(g0,'Qf1+'))).length;}catch(e){}
   L.say(/, the only legal move$/.test(d[1]||'')&&n2===1&&!/only legal/.test(d[0]||'')&&n1>1&&d[2]==='mates','node TC-R234j 29...Qf1+ 30.Rxf1 Rxf1#: the forced capture says it is the only legal move (legal moves counted here: '+n2+'), the first move (one of '+n1+') does not: '+JSON.stringify(d),d);}
  // ── TC-R234k, HEX-R-08 in the Review line: the take-back bit is a CAPTURE before, not a landing ─────────────────────────────────────
  {const F='rn2kb1r/ppp1qppp/5n2/4p3/2B1P3/1Q6/PPP2PPP/RNB1K2R w KQkq - 0 8';const S=['Qxb7','Qb4+','Qxb4','Bxb4+'];let g=E.fromFEN(F);const pos=[g],pl=[];for(const s of S){const m=mv(g,s);pl.push({san:s,move:m});g=E.makeMove(g,m);pos.push(g);}
   const rv={plies:pl,positions:pos,analysis:[],plyBase:14};const ch=RCH(rv,2);
   const t=line(E.toFEN(pos[3]),'Bxb4+','Best',{n:9,prev:{move:pl[2].move,pos:pos[2],chain:ch}});
   const mat=(b)=>{let w=0,k=0;for(const r of b)for(const p of r){if(!p||p.t==='k')continue;const v={p:1,n:3,b:3,r:5,q:9}[p.t];if(p.c==='w')w+=v;else k+=v;}return w-k;};
   L.say(ch===false&&/takes the queen back, so material is even/.test(t.line)&&!/\bwins\b/.test(t.line)&&mat(pos[2].board)===mat(pos[4].board),'node TC-R234k 9...Bxb4+ after 8...Qb4+ 9.Qxb4 takes the queen back (material counted here before the trade and after it: '+mat(pos[2].board)+' and '+mat(pos[4].board)+'), it does not "win" one: "'+t.line+'"',t.line);
   let g2=E.fromFEN('3q4/6k1/5Q2/4P3/8/8/8/6K1 b - - 0 1');const p2=[g2],l2=[];for(const s of ['Qxf6','exf6+','Kxf6']){const m=mv(g2,s);l2.push({san:s,move:m});g2=E.makeMove(g2,m);p2.push(g2);}
   L.say(RCH({plies:l2,positions:p2},1)===true&&RCH({plies:l2,positions:p2},0)===false,'node TC-R234k (must still) after 1...Qxf6 2.exf6+ the pawn\'s capture IS a take-back, so the king\'s capture after it wins what it takes');}
  // ── TC-R234l, HEX-R-07: the Coach's take names its toughest moment with the move number and what the board proves it lost ───────────
  {let g=E.fromFEN(START);const pos=[g],pl=[];for(const s of OPERA){const m=mv(g,s);pl.push({san:s,move:m});g=E.makeMove(g,m);pos.push(g);}
   const an=pl.map((p,i)=>({cls:{label:'Best'},loss:0,evalAfter:0,gist:E.moveGist(pos[i],p.move),motifs:[]}));
   an[29]=Object.assign(an[29],{cls:{label:'Blunder'},loss:1500,bestMove:mv(pos[29],'Qxd7')});an[30].bestMove=pl[30].move;
   an[19]=Object.assign(an[19],{cls:{label:'Inaccuracy'},loss:60});an[20].bestMove=pl[20].move;
   const rv={plies:pl,positions:pos,analysis:an,plyBase:0,summary:{book:0}};const w=CWO(rv,29,null),q=CWO(rv,19,null),b=CWO(rv,10,null);
   let truth=false;try{let x=pos[30];for(const s of ['Qb8+','Nxb8','Rd8#'])x=E.makeMove(x,mv(x,s));truth=E.getStatus(x)==='checkmate'&&pos[29].turn==='b';}catch(e){}
   L.say(w.name==='15...Nxd7'&&w.why==='It allows mate in two: 16.Qb8+ Nxb8 17.Rd8 mate.'&&truth,'node TC-R234l the Opera Game\'s 15...Nxd7 is named with its number and its reason, and this gate plays the mate: "'+w.name+'" | "'+w.why+'"',w);
   L.say(q.name==='10...cxb5'&&q.why===''&&b.name==='6.Bc4'&&b.why==='','node TC-R234l (must not) a slip no rung proves a reason for (10...cxb5) and a move that is no slip (6.Bc4) get the numbered name and no reason: '+JSON.stringify([q,b]),[q,b]);}
  if(process.env.CT_G169_NODE_ONLY){L.note('169 NARROWED by CT_G169_NODE_ONLY: the node lines only - the screen lines at kunal761 and 320x568 did NOT run');return;}
  // ── THE SCREEN: the bundle under test, both games, after stepping to the ply ────────────────────────────────────────────────────────
  const GOOD=/\b(Book|Best|Excellent|Good|Great)\b/;
  const read=(b)=>b.page.evaluate(()=>{const vis=(s)=>[...document.querySelectorAll('[data-ct="'+s+'"]')].find(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1;});
    const tx=(e)=>e?(e.innerText||'').replace(/\s+/g,' ').trim():null;const w=vis('rev-why-txt');let fit=null;
    if(w){const r=w.getBoundingClientRect(),st=getComputedStyle(w);const ch=Math.round(r.height*100)/100,lc=w.style.webkitLineClamp,hh=w.style.height;w.style.webkitLineClamp='none';w.style.height='auto';const sh=Math.round(w.getBoundingClientRect().height*100)/100;w.style.webkitLineClamp=lc;w.style.height=hh;
      fit={ch,sh,clamp:parseInt(st.webkitLineClamp,10)||null,lh:parseFloat(st.lineHeight),l:Math.round(r.left),r:Math.round(r.right),vw:window.innerWidth};}
    return {why:tx(w),move:tx(vis('rev-move-line')),fit};});
  const coachTxt=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-summary"]');const c=s&&[...s.querySelectorAll('div')].find(d=>(d.innerText||'').trim()==="Coach's take");const e=c&&c.nextElementSibling;if(!e)return null;const r=e.getBoundingClientRect();
    return {t:(e.innerText||'').replace(/\s+/g,' ').trim(),l:Math.round(r.left),r:Math.round(r.right),sw:e.scrollWidth,cw:e.clientWidth,vw:window.innerWidth};});
  for(const geo of ['kunal761','se']){const G=geo+' ';
    // game 1: the 13-ply Alekhine
    {const b=await L.launch({geo,store:{ct_pool:'3'},name:'g169-a-'+geo});await b.open();let ok=true;try{await RV.importPgn(b,G1,240000);await RV.startReview(b);}catch(e){ok=false;}
     L.say(ok,G+'TC-R234m PRECONDITION the 13-ply game is reviewed and its move screen is open');
     if(ok){await RV.goPly(b,4);await b.page.waitForTimeout(500);const p4=await read(b);
       L.say(!!p4.why&&GOOD.test(p4.move||'')&&/^(An opening move( \([^)]*\))?\.|Black’s (best|good) move\.|Fine\.) It moves Black’s knight away from White’s pawn on e5\b/.test(p4.why),G+'TC-R234m ply 4, 2...Nd5 (chip: '+((GOOD.exec(p4.move||'')||[])[0]||'none')+'): the knight moves away from the pawn on e5 - "'+p4.why+'"',p4);
       await RV.goPly(b,13);await b.page.waitForTimeout(500);const p13=await read(b);
       L.say(/\bForced\b/.test(p13.move||'')&&/^The only legal move: the king takes the queen that gives check\./.test(p13.why||''),G+'TC-R234m ply 13, 7.Kxf2 (chip Forced): the king takes the queen that gives check, it does not "block" it - "'+p13.why+'"',p13);
       const f=p13.fit;L.say(!!f&&f.l>=0&&f.r<=f.vw&&(f.sh<=f.ch+0.5||(!!f.clamp&&f.ch<=Math.ceil(f.clamp*f.lh)+1)),G+'TC-R234m the sentence at ply 13 fits its box, or is cut by the line clamp and nothing else ('+(f?f.sh+' in '+f.ch+', clamp '+f.clamp+' x '+f.lh:'none')+')',f);
       if(geo==='kunal761'&&process.env.CT_G169_SHOT)await b.shot(process.env.CT_G169_SHOT+'-forced');
       // the why pill on 1.e4: the words start with the move as it is spelt
       await RV.goPly(b,1);await b.page.waitForTimeout(300);let pw=null;
       try{await b.tapCt('rev-playout',200);for(let i=0;i<40&&!pw;i++){await b.page.waitForTimeout(250);pw=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-playwhy"]');return e?(e.innerText||'').trim():null;});}}catch(e){}
       L.say(!!pw&&/^e4 [a-z]/.test(pw),G+'TC-R234m ply 1, the why pill pressed on 1.e4: its words start "e4", never "E4" - "'+pw+'"',pw);}
     await b.close();}
    // game 2: the Opera Game
    {const b=await L.launch({geo,store:{ct_pool:'3'},name:'g169-o-'+geo});await b.open();let ok=true;try{await RV.importPgn(b,RV.PGN_OPERA,240000);}catch(e){ok=false;}
     const co=ok?await coachTxt(b):null;
     L.say(!!co&&/The toughest moment was 15\.\.\.Nxd7 \(a game-deciding swing\)\. It allows mate in two: 16\.Qb8\+ Nxb8 17\.Rd8 mate\./.test(co.t)&&co.l>=0&&co.r<=co.vw&&co.sw<=co.cw+1,G+'TC-R234n the summary\'s Coach\'s take names 15...Nxd7 with its number and the mate it allowed, inside the screen ('+(co?co.l+'..'+co.r+' of '+co.vw:'none')+') - "'+(co&&co.t)+'"',co);
     if(ok&&geo==='kunal761'&&process.env.CT_G169_SHOT)await b.shot(process.env.CT_G169_SHOT+'-coach');
     try{await RV.startReview(b);}catch(e){ok=false;}
     L.say(ok,G+'TC-R234n PRECONDITION the Opera Game is reviewed and its move screen is open');
     if(ok){await RV.goPly(b,11);await b.page.waitForTimeout(500);const p11=await read(b);
       L.say(GOOD.test(p11.move||'')&&/It threatens 7\.Qxf7 mate\b/.test(p11.why||''),G+'TC-R234n ply 11, 6.Bc4 (chip: '+((GOOD.exec(p11.move||'')||[])[0]||'none')+'): the mate on f7 it threatens is named with its number - "'+p11.why+'"',p11);
       if(geo==='kunal761'&&process.env.CT_G169_SHOT)await b.shot(process.env.CT_G169_SHOT+'-threat');
       await RV.goPly(b,20);await b.page.waitForTimeout(500);const p20=await read(b);
       L.say(/\?/.test(p20.move||'')?/11\.Bxb5\+/.test(p20.why||'')&&!/11\.Bxb5(?!\+)/.test(p20.why||''):false,G+'TC-R234n ply 20, 10...cxb5 (a slip): White\'s reply is written 11.Bxb5+, with its check sign - "'+p20.why+'"',p20);
       await RV.goPly(b,30);await b.page.waitForTimeout(500);const p30=await read(b);
       L.say(/It allows mate in two: 16\.Qb8\+ Nxb8 17\.Rd8 mate\.$/.test(p30.why||''),G+'TC-R234n ply 30, 15...Nxd7: the mate-in-two run keeps the check sign - "'+p30.why+'"',p30);
       // ply 31, read as soon as the ply lands and again after the refutation search has had its time: the same sentence, the mate in it
       await b.page.evaluate(()=>{const s=document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]');s[30].click();});await b.page.waitForTimeout(250);const e1=await read(b);await b.page.waitForTimeout(3200);const e2=await read(b);
       const W='White gives up the queen on b8. It is mate in two: 16.Qb8+ Nxb8 17.Rd8 mate.';
       L.say(/\bBrilliant\b/.test(e1.move||'')&&e1.why===W&&e2.why===W,G+'TC-R234n ply 31, 16.Qb8+ (chip Brilliant): the mate is in the sentence a quarter of a second after landing and unchanged 3.2 s later - "'+e1.why+'" then "'+e2.why+'"',{e1:e1.why,e2:e2.why});
       const f=e2.fit;L.say(!!f&&f.l>=0&&f.r<=f.vw&&(f.sh<=f.ch+0.5||(!!f.clamp&&f.ch<=Math.ceil(f.clamp*f.lh)+1)),G+'TC-R234n the sentence at ply 31 fits its box, or is cut by the line clamp and nothing else ('+(f?f.sh+' in '+f.ch+', clamp '+f.clamp+' x '+f.lh:'none')+')',f);
       if(geo==='kunal761'&&process.env.CT_G169_SHOT)await b.shot(process.env.CT_G169_SHOT+'-brilliant');}
     await b.close();}
  }
});
