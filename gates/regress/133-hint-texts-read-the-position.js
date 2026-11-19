'use strict';
// gates/regress/133-hint-texts-read-the-position.js - HINTS AND EXPLANATIONS SAY WHAT IS CONCRETELY IN THE POSITION. US-R141 / TC-R209a..d.
//
// WHY [#550, docs/hint-audit-2026-11-12 HEX-T-01, -04, -05, -07; run-answers build__1794388896663-a37, Kunal 12 Nov: "you could've said
// something like they left the queen hanging take it with the bishop"]: the audit read 44 of 50 drill hints as "No tactic to spot here",
// two templates (25 distinct strings) over all 876 generated puzzles, and one fixed sentence on every Brilliant card.
// WHAT IT READS: chess.jsx through gates/engine-extract.js (concreteRead, pzText, brilHint) - the bundle is minified, so these have no name in
// it, the way gates 79 and 131 read it; the extractor prints the source md5. CT_SRC selects another chess.jsx (the control); one that predates
// these functions does not declare them and every line below goes red on the missing function, which is the point of the control.
// The puzzle rows are read from the same source's PZGEN_RAW literal.
// KNOW ITS LIMIT: the browser surfaces are gates 130 (Play) and 132 (the drill); this gate pins the readings themselves.
// CONTROL-RECORD: 359de94 2026-11-13 total=8 red=2 scope=env:CT_SRC=tip-chess.jsx how=#550 jobs/brilliant-drill-explanation-is-never-fully-readable-on-kunals-phone-2026-11-13: the branch tip's chess.jsx (fbd9ff8) - TC-R209d (Rxh6+ read 'A rook can be given up with check here.') and TC-R209d2 (Qb8+ read 'There is mate in two, and it starts with a check.') red; with this fix 8/0
// CONTROL-RECORD: 55ca2c7 2026-11-13 total=26 red=5 scope=env:CT_SRC=tip-chess.jsx how=#550 cg7: the branch tip chess.jsx (d04a8ed0b851, before the mate-threat, fork and pin readings) - TC-R209f F1 F5 F9 F10 F13 red; every must-NOT line, every older line and the six TC-R209g pins green (total 20 before TC-R209g was added)
// CONTROL-RECORD: c9213e6 2026-11-13 total=32 red=3 scope=env:CT_SRC=tip-chess.jsx how=#550 jobs/fork-reading-fires-on-a-move-that-is-mated-2026-11-13: the branch tip's chess.jsx (17e366d62462, no mate-in-one guard) - TC-R209f F5b (Nc6 read as a fork of Qd8 and Rb8 while Rb1 mates) and two TC-R209h lines red (the reading, and the drill verdict 'Nc6 forks ...'); a fork-only guard (81b1b1c1e55a) left TC-R209h 2 red on the 'attack' fall-through; with the fix 32/0
// CONTROL-RECORD: 1a6ab41 2026-11-14 total=37 red=3 scope=source:CT_SRC how=#550 helper lessons HEX-T-06: chess.jsx with pzMissNote stubbed to return null (CT_SRC=<copy>) - TC-R209k Kf1, the material puzzle and the coverage line red (0 of 876); on the fix tree 37/0
// CONTROL-RECORD: e118d13 2026-11-14 total=39 red=2 scope=source:CT_SRC how=#550 helper lessons, jobs/pzmissnote-says-a-piece-is-left-to-be-won-that-the-wrong-move-just-captured-2026-11-14: chess.jsx before the fix (the 072d767 pzMissNote, CT_SRC=<copy>) - the Qxa1 line and the capture recount (88 of 1660) red; on the fix 39/0
// CONTROL-RECORD: 7a8c909 2026-11-14 total=62 red=5 scope=source:CT_SRC how=#550 helper lessons, antagonists A and B on the Review text: d21c7bf's chess.jsx (CT_SRC=<copy>) - TC-R209q A4 (You mates / You plays), A1 (a defended queen 'taken for nothing'), A5 (the W8 reason dropped at maxw 130), B1 ('[object Object]' in the Book line) and A7 (the reason lost from more at maxw 60) go red; the fix reads 62/0
// CONTROL-RECORD: 5517aa33 2026-11-19 total=62 red=1 scope=source:CT_SRC how=batch 13, jobs/review-sentences-name-what-the-moves-do-2026-11-12, TC-R209p F5 re-pinned to the run with its check sign (16.Qb8+ Nxb8 17.Rd8 mate): 3d1a988b's chess.jsx (CT_SRC=<copy>, md5 3bea9d949937) prints 16.Qb8 Nxb8 and F5 is red, the other 61 green; on the change 62/0
const L=require('../lib');
const fs=require('fs');
const E=require('../engine-extract');
const has=(n)=>typeof E[n]==='function';
const AUDIT=[ // the audit's own examples: position, best move, what the hint must say
  ['r5k1/3r1p1p/3p2pP/pp1Pp3/4R3/5N2/Pn3PP1/1R4K1 b - - 0 1','Na4',/knight on b2 is under attack from the rook on b1/],
  ['r4rk1/p1p1qpp1/2pp3Q/2b1p3/4P2P/P1NP1b2/1PP2P2/R3K1R1 b Q - 0 1','f5',/threaten Qxg7 mate/],
  ['r4rk1/np6/3pNq1Q/p2p4/2bP4/2P5/3B1PPP/R3R1K1 w - - 0 1','Nxf8',/rook on f8 can be taken/],
  ['Q7/2K1k2p/3p1p2/1B1P1Pp1/2pbP1P1/8/8/8 b - - 0 1','Kf7',/threaten Qe8 mate/],
  ['r6k/1p3Q2/2n5/3p4/3P4/2P3P1/1q1B1PKP/8 w - - 0 1','Bg5',/bishop on d2 is under attack from the queen on b2/],
  ['6k1/5p1p/6p1/3b4/1p2N3/8/5PPP/6K1 w - - 0 1','Nf6+',/check that also hits the bishop on d5/],
  ['7k/pb3rpp/2p5/5p2/3P4/8/PPP2PPP/4R1K1 w - - 0 1','Re8+',/mate in two/],
  ['1r4k1/1P3ppp/1Q6/p7/3R4/8/PKP4q/8 w - - 0 1','Qd8+',/mate in two/],
  ['6kr/3q1p1p/8/4N3/8/8/PB4PP/6K1 w - - 0 1','Nxd7',/queen on d7 can be taken/],
];
L.run(async()=>{
  console.log('     source: '+E.SRC_PATH+'  md5 '+E.SOURCE_MD5);
  L.say(has('concreteRead')&&has('pzText')&&has('brilHint'),'TC-R209 PRECONDITION the source declares the readers (concreteRead, pzText, brilHint)',{concreteRead:has('concreteRead'),pzText:has('pzText'),brilHint:has('brilHint')});
  let hit=0;const miss=[];
  for(const [f,san,want] of AUDIT){let t='';try{const g=E.fromFEN(f);const r=E.concreteRead(g,E.findMoveBySAN(g,san));t=r?r.hint:'';}catch(e){t='';}if(want.test(t))hit++;else miss.push(san+': "'+t+'"');}
  L.say(hit===AUDIT.length,'TC-R209a the reading names what is there on all '+AUDIT.length+' of the audit\'s positions ('+hit+'/'+AUDIT.length+(miss.length?'; '+miss.join(' | '):'')+')',miss);
  let raw=[];try{const src=fs.readFileSync(E.SRC_PATH,'utf8');const i=src.indexOf('const PZGEN_RAW=');raw=JSON.parse(src.slice(i+16,src.indexOf('\n',i)).replace(/;\s*$/,''));}catch(e){raw=[];}
  L.say(raw.length===876,'TC-R209 PRECONDITION the source carries the 876 generated puzzles ('+raw.length+')',raw.length);
  let conc=0;const dist=new Set();let ex0='';
  raw.forEach((r,i)=>{let x=null;try{x=E.pzText({id:'g'+i,fen:r.f,sol:r.s,reply:r.y,goal:(r.n>0?'mate in '+r.n:''),hint:'OLD',explain:'OLD'});}catch(e){x=null;}
    if(x&&x.hint&&x.hint!=='OLD'){conc++;dist.add(x.hint);}if(i===0&&x)ex0=x.explain;});
  L.say(conc>=780,'TC-R209b at least 780 of the 876 generated puzzles get a hint read from their position ('+conc+')',conc);
  L.say(dist.size>=300,'TC-R209b and those hints are at least 300 distinct sentences, not a template ('+dist.size+'; the two templates gave 25)',dist.size);
  L.say(ex0==='Re8 checks, Rf8 is forced, and Rxf8 is mate.','TC-R209c the solve line is read from the stored line: the first back-rank puzzle reads "'+ex0+'"',ex0);
  // ── TC-R209k [#550 HEX-T-06, jobs/puzzles-hints-and-explanations-concrete-2026-11-12, its whatIsLeft]: Puzzles' SECOND wrong move read
  // "isn't it either" whatever was played. Where the board gives no reason (wrongWhy), pzMissNote reads one from the stored line without
  // naming the move: a mate puzzle that starts with a check -> the move is not a check; a material puzzle -> the piece still there to be won.
  // The audit's own example (Kf1 in the first back-rank puzzle), a material one, the two cases that must give nothing (the answer's own kind
  // of move, a hand-written puzzle), and the coverage: of the 876, the first legal wrong move gets a note on 627 (measured on the fix tree).
  {const BR={id:'g0',fen:'7k/pb3rpp/2p5/5p2/3P4/8/PPP2PPP/4R1K1 w - - 0 1',sol:['Re8+','Rxf8#'],reply:['Rf8'],goal:'White to move: mate in 2'};
   const MT={id:'g1',fen:'3r3r/4bk2/1R2p3/3pP2p/P2n4/2Q2p1P/6P1/R5K1 b - - 0 1',sol:null,reply:null,goal:''};
   const note=(P,f,san)=>{try{const g=E.fromFEN(f);return E.pzMissNote(P,g,E.findMoveBySAN(g,san));}catch(e){return 'THREW '+e.message;}};
   const n1=note(BR,BR.fen,'Kf1');
   L.say(n1==='is not a check, and the mate needs one now','TC-R209k the audit\'s second wrong move (Kf1, back-rank mate in 2 that starts Re8+) gets a reason from the line: "'+n1+'"',n1);
   const mrow=raw.find(r=>r.f===MT.fen);let n2=null;if(mrow){MT.sol=mrow.s;MT.reply=mrow.y;n2=note(MT,MT.fen,'Rd7');}
   L.say(!!mrow&&n2==='leaves the queen on c3 to be won','TC-R209k a material puzzle names the piece the line wins and where it stands ("'+n2+'")',{found:!!mrow,n2});
   const n3=note({...BR,id:'c0'},BR.fen,'Kf1');
   L.say(n3===null,'TC-R209k a hand-written puzzle (id c0) gets no line note - its texts are authored ('+n3+')',n3);
   let tot=0,got=0;raw.forEach((r,k)=>{try{const g=E.fromFEN(r.f);const P={id:'g'+k,fen:r.f,sol:r.s,reply:r.y,goal:(r.n>0?'mate in '+r.n:'')};const s0=E.findMoveBySAN(g,r.s[0]);
     const m=E.getLegal(g).find(m=>!(s0&&m.fr===s0.fr&&m.fc===s0.fc&&m.tr===s0.tr&&m.tc===s0.tc));if(!m)return;tot++;if(E.pzMissNote(P,g,m))got++;}catch(e){}});
   // [#550 helper lessons, jobs/pzmissnote-says-a-piece-is-left-to-be-won-that-the-wrong-move-just-captured-2026-11-14]: a wrong move that
   // CAPTURES the piece the line wins was told that piece is "left to be won" (the checker's Qxa1, rook on a1). Its example, and the whole class:
   // every capturing wrong move over the 876 (the class needs a capture on the named square, so captures are its whole population).
   {const f='r5k1/5ppp/2bpp3/1pp5/4P1P1/1PqP1N2/2P1RPP1/R1Q3K1 b - - 0 1';const ri=raw.findIndex(r=>r.f===f);let nx=null;
    if(ri>=0)nx=note({id:'g'+ri,fen:f,sol:raw[ri].s,reply:raw[ri].y,goal:''},f,'Qxa1');
    L.say(ri>=0&&!/ on a1 /.test(String(nx)),'TC-R209k the checker\'s Qxa1 (it takes the rook on a1) is not told the rook on a1 is left to be won ("'+nx+'")',{found:ri>=0,nx});
    let caps=0,named=0;const ex=[];raw.forEach((r,k)=>{try{const g=E.fromFEN(r.f);const P={id:'g'+k,fen:r.f,sol:r.s,reply:r.y,goal:(r.n>0?'mate in '+r.n:'')};const s0=E.findMoveBySAN(g,r.s[0]);
      for(const m of E.getLegal(g)){if(s0&&m.fr===s0.fr&&m.fc===s0.fc&&m.tr===s0.tr&&m.tc===s0.tc)continue;if(!g.board[m.tr][m.tc])continue;caps++;
        const n=E.pzMissNote(P,g,m);if(n&&n.indexOf(' on '+E.rc2sq(m.tr,m.tc)+' ')>=0){named++;if(ex.length<3)ex.push(r.f+' '+E.rc2sq(m.tr,m.tc)+': '+n);}}}catch(e){}});
    L.say(caps>1000&&named===0,'TC-R209k over all '+caps+' capturing wrong moves, no line note names the square the move itself took on ('+named+'; 88 before the fix)',{caps,named,ex});}
   L.say(tot===876&&got>=600,'TC-R209k DENOMINATOR and coverage: of '+tot+' generated puzzles, the first legal wrong move gets a line note on '+got+' (at least 600; 627 measured)',{tot,got});}
  // ── TC-R209p [#550 helper lessons; docs/review-text-design-2026-11-14 (tracker 5326ERvZCZ5tEYRkPavPTF) 7b F1..F12; closes
  // jobs/review-slip-sentences-say-whose-move-and-why-2026-11-14 and the wording parts of review-sentences-name-what-the-moves-do]: the Review
  // text read through the SOURCE's own explainAnno (and reviewMore where the source has it), its block evaluated with the engine in scope,
  // so a control source runs its own sentence. Position, move, reply and better move are given (no engine). The expected shapes are the
  // design's; each was red on the tip before (68451db's source, CT_SRC). 'line' is the text under the board, 'more' is behind the tap.
  {let XA=null,XM=null,xerr=null;try{const src=fs.readFileSync(E.SRC_PATH,'utf8'),ls=src.split('\n'),bl=new Map(),st=[];for(let i=0;i<ls.length;i++)if(/^(async\s+function|function|const|let|var)\s/.test(ls[i]))st.push(i);
     for(let k=0;k<st.length;k++){const m=/^(?:async\s+function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(ls[st[k]]);if(m&&!bl.has(m[1]))bl.set(m[1],ls.slice(st[k],k+1<st.length?st[k+1]:ls.length).join('\n'));}
     const want=['WHY_MAXW','gistInContext','forcedMateTxt','slipReplyRead','betterRead','explainAnno','reviewMore'].filter(n=>bl.has(n)&&!(n in E));const nm=Object.keys(E).filter(n=>/^[A-Za-z_$][\w$]*$/.test(n)&&!want.includes(n));
     const fns=new Function(...nm,want.map(n=>bl.get(n)).join('\n')+'\nreturn {explainAnno:typeof explainAnno==="function"?explainAnno:null,reviewMore:typeof reviewMore==="function"?reviewMore:null};')(...nm.map(n=>E[n]));XA=fns.explainAnno;XM=fns.reviewMore;}catch(e){xerr=e.message;}
   L.say(!!XA,'TC-R209p PRECONDITION the source\'s explainAnno evaluates in Node ('+(xerr||'ok')+')',xerr);

    const P=(fen,san,label,o)=>{o=o||{};const pre=E.fromFEN(fen),mv=E.findMoveBySAN(pre,san);if(!mv)return {err:'no move '+san};const post=E.makeMove(pre,mv);
      const rep=o.reply?E.findMoveBySAN(post,o.reply):null,bm=o.best?E.findMoveBySAN(pre,o.best):null;
      const np=o.played?E.findMoveBySAN(post,o.played):rep;
      const a={cls:{label:o.raw||label},loss:o.loss||0,evalAfter:o.ev!=null?o.ev:0,bestSan:o.best||null,bestMove:bm,gist:E.moveGist(pre,mv),motifs:E.moveMotifs(pre,mv)||[],altSan:null,altDrop:null};
      let prev=null;if(o.prevFen){const pp=E.fromFEN(o.prevFen);prev={move:E.findMoveBySAN(pp,o.prevSan),pos:pp,chain:false};}
      const ctx={mover:pre.turn==='w'?'White':'Black',label,userColor:o.uc===undefined?'w':o.uc,pos:pre,ply:{move:mv,san},prev,next:rep?{bestSan:o.reply,bestMove:rep}:null,nextPly:np?{san:o.played||o.reply,move:np}:null,nextPos:post,moveNo:o.no||+fen.split(' ')[5]||1,opening:o.opening||null,maxw:150};
      return {a,ctx};};
    const FC=[
      ['F1',P('r2qkb1r/1pp2ppp/p1n1pn2/3p4/3P2b1/2PBPN2/PP3PPP/RNBQ1RK1 w kq - 0 7','Re1','Inaccuracy',{reply:'e5',best:'Nbd2',loss:90,ev:0}),
        t=>/your opponent/i.test(t.all)&&/\.\.\.e5/.test(t.line)&&/d3/.test(t.line)&&/f3/.test(t.line)&&!/(stops|prevents|so \.\.\.e5)/.test(t.all)&&!/is the answer|held it/.test(t.all),'names ...e5, d3 and f3; says your opponent; does not say Nbd2 stops ...e5'],
      ['F2',P('r4rk1/1pp1p2p/p1n2pp1/3b2q1/3P1b2/2P2NBP/PPB1RPP1/RQ4K1 w - - 1 19','Bh4','Blunder',{reply:'Qh5',best:'Nxg5',loss:430,ev:0.6}),
        t=>/could take (their|the) queen/.test(t.line)&&/19\.Nxg5/.test(t.line),'could take the queen: 19.Nxg5'],
      ['F3',P('3r1rk1/1p1b1pp1/p3p3/4b3/2p5/2P1BB2/PPQ1KPP1/7R w - - 1 25','Bxb7','Mistake',{reply:'f5',best:'Qh7#',loss:900,ev:5}),
        t=>/missed checkmate/.test(t.line)&&/25\.Qh7/.test(t.line)&&/still winning/.test(t.line),'missed checkmate, 25.Qh7, still winning'],
      ['F4',P('r1b1r1k1/ppp2ppp/2p2q2/8/8/2NP1N1P/PPP3P1/R1BQ1K2 b - - 4 13','Bxh3','Mistake',{reply:'gxh3',best:'c5',loss:190,ev:-3,uc:'b'}),
        t=>/bishop for a pawn/i.test(t.line)&&/14\.gxh3/.test(t.line)&&/\byour?\b/i.test(t.line),'bishop for a pawn, 14.gxh3, you'],
      ['F5',P('4kb1r/p2B1ppp/4qn2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 15','Nxd7','Blunder',{reply:'Qb8+',best:'Qxd7',loss:1500,ev:99}),
        t=>/^Your opponent.s blunder/.test(t.line)&&/mate in two/.test(t.line)&&/16\.Qb8\+ Nxb8 17\.Rd8 mate/.test(t.line),"Your opponent's blunder, mate in two, 16.Qb8+ Nxb8 17.Rd8 mate (batch 13: the check keeps its sign, the design pair's residual B6)"],
      ['F6',P('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4','g6','Mistake',{reply:'Ng5',played:'d3',best:'Nxe4',loss:130,ev:1.3,uc:'b'}),
        t=>/could play[^.]*5\.Ng5/.test(t.line)&&/f7/.test(t.line),'could play 5.Ng5, f7'],
      ['F7',P('r1bq1rk1/1p2bppp/p1n1pn2/8/2pPp3/2P2N2/PPBN1PPP/R1BQR1K1 w - - 0 11','Nxe4','Best',{prevFen:'r1bq1rk1/1p2bppp/p1n1pn2/3p4/2pPP3/2P2N2/PPBN1PPP/R1BQR1K1 b - - 0 10',prevSan:'dxe4',ev:1}),
        t=>/takes the pawn back/.test(t.line)&&!/\bwins\b/.test(t.all),'takes the pawn back, never wins'],
      ['F8',P('rnbqkb1r/pp1p1ppp/4pn2/2p5/3P4/2P2N2/PP2PPPP/RNBQKB1R w KQkq - 1 4','e3','Excellent',{ev:0.1}),
        t=>(/d4/.test(t.line)||/f1 bishop/.test(t.line))&&!/(was just as good|\d\.\d)/.test(t.all)&&!/\b[a-h]?[NBRQK]?x?[a-h][1-8]\b was/.test(t.all),'names d4 or the f1 bishop, no alternative, no number'],
      ['F9',P('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2','f4','Book',{raw:'Inaccuracy',opening:'King’s Gambit',loss:80}),
        t=>/opening move/i.test(t.line)&&!/(slip|mistake|blunder|Fine|sharp)/i.test(t.all),'opening move, no grading word'],
      ['F10',P('2kr1b1r/pp1np1pp/1q3p1n/3p4/2pPP1b1/2P2N2/PPBN1PPP/R1BQR1K1 w - - 1 11','b4','Mistake',{reply:'e6',best:'exd5',loss:190,ev:1.9}),
        t=>/A mistake, though you are still better/.test(t.line)&&/11\.exd5/.test(t.all),'A mistake, though you are still better; 11.exd5'],
      ['F11',P('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','a3','Inaccuracy',{reply:'e5',best:'e4',loss:40,ev:-0.3}),
        t=>/^A small slip\. Nothing is lost at once, but your opponent.s best reply is the pawn move \.\.\.e5\.$/.test(t.line)&&/Tap best to see it/.test(t.more)&&!/\d\.\d/.test(t.line),'the fallback shape exactly; no fact claimed'],
      ['F12',P('r2qkb1r/1pp2ppp/p1n1pn2/3p4/3P2b1/2PBPN2/PP3PPP/RNBQ1RK1 w kq - 0 7','Re1','Inaccuracy',{reply:'e5',best:'Nbd2',loss:90,ev:0,uc:null}),
        t=>/\b(White|Black)\b/.test(t.all)&&!/\byou(r)?\b/i.test(t.all),'White and Black throughout, no you'],
    ];
  
   if(XA)for(const [id,c,ok,what] of FC){let line='',more='';if(c.err)line='SETUP '+c.err;else{try{line=XA(c.a,c.ctx)||'';more=XM?(XM(c.a,c.ctx)||''):'';}catch(e){line='THREW '+e.message;}}
     const t={line,more,all:line+' '+more};let pass=false;try{pass=!!ok(t);}catch(e){}
     L.say(pass,'TC-R209p '+id+' '+what+': "'+line+'"'+(more?(' | more: "'+more+'"'):''),{line,more});}}
  // ── TC-R209q [#550 helper lessons, the final read's antagonist A on 0473182 (bundle 192802292e06), four P1s in the Review text]: A4 the
  // verb agrees with "you" ("You mate", "You play", never "You mates"/"You plays"); A1 "for nothing" only on an undefended piece (a defended
  // queen taken by a pawn is a queen for a pawn); A5 a narrow box (maxw 130, sideways) never empties the line, the verdict survives; A7 a
  // reason the ladder computed is in the line or behind the tap, never nowhere. Through the shipped reviewText (a control source runs its own).
  {const RT=(fen,san,label,o)=>{o=o||{};try{const pre=E.fromFEN(fen),mv=E.findMoveBySAN(pre,san),post=E.makeMove(pre,mv);const rep=o.reply?E.findMoveBySAN(post,o.reply):null;
       const a={cls:{label},loss:o.loss||300,evalAfter:o.ev!=null?o.ev:0,bestSan:null,bestMove:o.best?E.findMoveBySAN(pre,o.best):null,gist:E.moveGist(pre,mv),motifs:E.moveMotifs(pre,mv)||[]};
       return E.reviewText(a,{label,userColor:o.uc===undefined?'w':o.uc,pos:pre,ply:{move:mv,san},next:rep?{bestMove:rep}:null,nextPly:rep?{move:rep,san:o.reply}:null,nextPos:post,moveNo:o.n||10,maxw:o.maxw||150})||{line:'',more:''};}catch(e){return {line:'THREW '+e.message,more:''};}};
   const a4a=RT('6k1/1p3ppp/8/8/8/8/5PPP/R5K1 b - - 0 30','b6','Blunder',{reply:'Ra8#',uc:'w',n:30}),a4b=RT('6k1/5ppp/8/4n3/8/8/5P1P/R2Q2K1 w - - 0 20','Qd2','Blunder',{reply:'Nf3+',uc:'b',n:20});
   L.say(/\bYou mate /.test(a4a.line)&&/\bYou play /.test(a4b.line)&&!/\bYou (mates|plays)\b/.test(a4a.line+' '+a4b.line),'TC-R209q A4 the verb agrees with "you": a black slip with your played mate reads "'+a4a.line+'", a white slip with your played fork reads "'+a4b.line+'"',{a4a,a4b});
   const a1=RT('6k1/8/8/4p3/8/5N2/8/3Q2K1 w - - 0 20','Qd4','Blunder',{reply:'exd4',uc:'w',n:20});
   L.say(!!a1.line&&!/for nothing/.test(a1.line+' '+a1.more)&&/queen for a pawn/.test(a1.line),'TC-R209q A1 a defended queen taken by a pawn is not "taken for nothing": "'+a1.line+'"',a1);
   const a5=RT('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','a3','Inaccuracy',{reply:'e5',ev:1.6,maxw:130,n:1});
   L.say(/^A small slip/.test(a5.line),'TC-R209q A5 at maxw 130 (sideways) the line keeps its verdict when there is more behind the tap: "'+a5.line+'" | more "'+a5.more+'"',a5);
   // antagonist B, B1: a recognised opening reaches the builder as nameOpening's OBJECT; the Book line printed "An opening move ([object Object])."
   {let b1='';try{const pre=E.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),mv=E.findMoveBySAN(pre,'e4');
      b1=(E.reviewText({cls:{label:'Book'},gist:E.moveGist(pre,mv),motifs:[]},{label:'Book',userColor:null,opening:{name:'Philidor Defense',eco:'C41'},pos:pre,ply:{move:mv,san:'e4'},nextPos:E.makeMove(pre,mv),moveNo:1,maxw:150})||{}).line||'';}catch(e){b1='THREW '+e.message;}
    L.say(!/\[object/.test(b1)&&/\(Philidor Defense\)/.test(b1),'TC-R209q B1 a recognised opening (an object from nameOpening) prints its name, never "[object Object]": "'+b1+'"',b1);}
   const a7=RT('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4','g6','Mistake',{reply:'Ng5',uc:'b',maxw:60,n:4});
   L.say(/5\.Ng5/.test(a7.line+' '+a7.more),'TC-R209q A7 a reason the ladder computed but cannot fit a 60-character line is behind the tap, not dropped: "'+a7.line+'" | more "'+a7.more+'"',a7);}
  // ── TC-R209m [#550 helper lessons, docs/hint-audit-2026-11-12 HEX-R-03; jobs/review-sentences-name-what-the-moves-do-2026-11-12]: the Review
  // sentence's clauses read IN THE GAME. The Opera Game through the shipped moveGist and gistInContext: 5.Qxf3 takes back on f3 (a bishop for
  // the knight), not "wins the bishop"; 13...Rxd7 takes back a rook for the knight; 4...Bxf3 and 13.Rxd7 no longer "chase" a queen when the
  // next move takes the piece that moved; and the case that must NOT change - 16...Nxb8 takes a queen that arrived without capturing, so it
  // still WINS the queen. And a Forced move whose next ply mates says so (the audit's 31.Rxf1 ... Rxf1#).
  {const SANS='e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'.split(' ');
   let g=E.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');const P=[],M=[];
   for(const s of SANS){P.push(g);const m=E.findMoveBySAN(g,s);M.push(m);g=m?E.makeMove(g,m):g;}
   const at=(i)=>{try{const did=(E.moveGist(P[i],M[i])||{}).did||[];return {did,ctx:E.gistInContext(did,P[i],M[i],i>0?{move:M[i-1],pos:P[i-1]}:null,i+1<SANS.length?{move:M[i+1],san:SANS[i+1]}:null)};}catch(e){return {did:[],ctx:['THREW '+e.message]};}};
   const q5=at(8),r13=at(25),b4=at(7),w13=at(24),n16=at(31);
   L.say(M.every(Boolean)&&q5.ctx[0]==='takes back on f3, a bishop for the knight'&&!q5.ctx.some(x=>/^wins the /.test(x)),'TC-R209m 5.Qxf3 takes back on f3, a bishop for the knight, and no longer "wins the bishop" (gist '+JSON.stringify(q5.did.slice(0,2))+' -> '+JSON.stringify(q5.ctx.slice(0,2))+')',q5);
   L.say(r13.ctx[0]==='takes back on d7, a rook for the knight','TC-R209m 13...Rxd7 takes back on d7, a rook for the knight ('+JSON.stringify(r13.ctx.slice(0,2))+')',r13);
   L.say(b4.did.some(x=>/^chases /.test(x))&&!b4.ctx.some(x=>/^chases /.test(x))&&w13.did.some(x=>/^chases /.test(x))&&!w13.ctx.some(x=>/^chases /.test(x)),'TC-R209m 4...Bxf3 and 13.Rxd7 no longer chase the queen: the next move takes the piece that moved (gists '+JSON.stringify([b4.did[0],w13.did[0]])+' -> '+JSON.stringify([b4.ctx[0],w13.ctx[0]])+')',{b4,w13});
   L.say(n16.ctx.indexOf('wins the queen')>=0&&!n16.ctx.some(x=>/^takes back/.test(x)),'TC-R209m (must NOT change) 16...Nxb8 takes a queen that arrived without capturing: it still wins the queen ('+JSON.stringify(n16.ctx.slice(0,2))+')',n16);
   const fpre=E.fromFEN('5rk1/r6p/2p1p1p1/P3B3/1P1P4/2P4Q/6PP/2R2q1K w - - 0 31'),fmv=E.findMoveBySAN(fpre,'Rxf1'),fpost=fmv?E.makeMove(fpre,fmv):null,fmate=fpost?E.findMoveBySAN(fpost,'Rxf1#'):null;
   const fr=(np)=>{try{return (E.reviewText({cls:{label:'Forced'},gist:E.moveGist(fpre,fmv),motifs:[]},{label:'Forced',userColor:'w',pos:fpre,ply:{move:fmv,san:'Rxf1'},nextPly:np,nextPos:fpost,moveNo:31})||{}).line||'';}catch(e){return 'THREW '+e.message;}};
   const f1=fr({san:'Rxf1#',move:fmate}),f0=fr(null);
   L.say(f1==='Your only legal move, and ...Rxf1 is mate next.'&&!/mate next/.test(f0),'TC-R209m a Forced move whose next ply mates says so ("'+f1+'"), and one whose next ply does not mate gets nothing from this rule ("'+f0+'")',{f1,f0});}
  const B=[['6k1/1pp3pn/1p1p2pp/3P4/4P1P1/2PB1P2/rrQK3P/3R3R w - - 0 1','h4',/queen on c2 is attacked/],['8/8/P1p1prkp/2Pp2p1/4q3/4B1PR/3Q3K/8 w - - 0 1','Rxh6+',/rook on h3 can be given up with check/]];
  let bh=0;const bm=[];for(const [f,san,want] of B){let t='';try{const g=E.fromFEN(f);t=E.brilHint(g,E.findMoveBySAN(g,san),false)||'';}catch(e){t='';}if(want.test(t))bh++;else bm.push(san+': "'+t+'"');}
  L.say(bh===B.length,'TC-R209d the Brilliant drill hint names what is offered or left on the audit\'s two cards ('+bh+'/2'+(bm.length?'; '+bm.join(' | '):'')+')',bm);
  // #550 jobs/brilliant-drill-explanation-is-never-fully-readable-on-kunals-phone-2026-11-13: the hint names the piece AND the square it stands on
  // (never the square it goes to, which is the answer): Rxh6+ above from h3 (an offer), and the Opera Game's 16.Qb8+ from b3, whose reading
  // ("There is mate in two ...") named no square at all
  {let t='';try{const g=E.fromFEN('1n2kb1r/p2r1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16');t=E.brilHint(g,E.getLegal(g).find(m=>E.rc2sq(m.fr,m.fc)==='b3'&&E.rc2sq(m.tr,m.tc)==='b8'),false)||'';}catch(e){t='';}
   L.say(/queen on b3/.test(t)&&!/b8/.test(t),'TC-R209d2 the Brilliant drill hint for the Opera Game\'s Qb8+ names the piece and the square it stands on, not where it goes ("'+t+'")',t);}
  // ── TC-R209f [#550 cg7; jobs/drill-hints-name-the-positions-point-2026-11-12, the independent checker's gap]: the three readings it had no
  // words for - a mate threat, a fork without check, a pin - each on positions where it must fire AND positions where it must not.
  const rd=(f,san)=>{try{const g=E.fromFEN(f);const m=E.findMoveBySAN(g,san);if(!m)return {k:'NOMOVE'};return E.concreteRead(g,m)||{k:null,hint:null};}catch(e){return {k:'THREW '+e.message};}};
  const MOT=[ // [id, fen, move, kind, must fire?, the hint must match (fire) / why it must not]
    ['F1','5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe4','matethreat',true,/^One move sets up a mate threat on h7\.$/,'Qxh7 mate is threatened (the knight on g5 guards h7)'],
    ['F2','5rk1/5ppp/5n2/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe4','matethreat',false,null,'the knight on f6 takes the queen on e4'],
    ['F3','5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe3','matethreat',false,null,'Qe3 sees nothing near the king'],
    ['F4','5rk1/5p1p/6p1/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe4','matethreat',false,null,'the pawn on g6 shuts the diagonal to h7'],
    // F5 REPLACED [#550 jobs/fork-reading-fires-on-a-move-that-is-mated-2026-11-13]: it pinned the fork on Nc6 in 1r1q2k1/5ppp/8/4N3/8/8/5PPP/6K1 w,
    // which Rb1 mates (stockfish-18-lite-single, depth 20, Nc6 searched alone: mate in 1 for Black; the best move h3 is itself mated in 9).
    // The fork now pinned is one the engine plays: Nc7 below is its first choice at depth 20 (+3.97, the next move f1d1 +0.15), material level.
    ['F5','r2nr1k1/pp3ppp/8/3N4/8/8/PP3PPP/R4RK1 w - - 0 1','Nc7','fork',true,/^Your knight can attack the rook on a8 and the rook on e8 at once\.$/,'the engine\'s best move: the knight on d8 parts the rooks, so one of them falls'],
    ['F5b','1r1q2k1/5ppp/8/4N3/8/8/5PPP/6K1 w - - 0 1','Nc6','fork',false,null,'the old F5: Rb1 mates, and a move that is mated next sets up nothing'],
    ['F6','1r1q2k1/1p3ppp/8/4N3/8/8/5PPP/6K1 w - - 0 1','Nc6','fork',false,null,'the pawn on b7 takes the knight'],
    ['F7','1r4kq/5ppp/8/4N3/8/8/5PPP/6K1 w - - 0 1','Nc6','fork',false,null,'only the rook is hit'],
    ['F8','r1b1bk2/6pp/8/8/4N3/8/5PPP/6K1 w - - 0 1','Nd6','fork',false,null,'two guarded bishops, each worth no more than the knight'],
    ['F9','r1bqkbnr/ppp2ppp/2np4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1','Bb5','pin',true,/^Your bishop can pin their knight on c6 to the king\.$/,'d7 is empty, so the knight is pinned to the king'],
    ['F10','rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 1','Bg5','pin',true,/^Your bishop can pin their knight on f6 to the queen\.$/,'e7 is empty, so the knight is pinned to the queen'],
    ['F11','rnbqkb1r/ppp1pppp/5n2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 1','Bg5','pin',false,null,'the pawn on e7 stands between the knight and the queen'],
    ['F12','r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1','Bb5','pin',false,null,'the Ruy Lopez: the pawn on d7 stands between the knight and the king'],
  ];
  for(const [id,f,san,kind,fire,want,why] of MOT){const r=rd(f,san);
    if(fire)L.say(r.k===kind&&want.test(r.hint||''),'TC-R209f '+id+' '+kind+' MUST fire: '+san+' ('+why+') reads "'+r.hint+'" ['+r.k+']',r);
    else L.say(r.k!==kind&&!/^THREW|^NOMOVE/.test(String(r.k)),'TC-R209f '+id+' '+kind+' must NOT fire: '+san+' ('+why+') reads "'+r.hint+'" ['+r.k+']',r);}
  // His six cards that read "isn't it" for his own move (claude/agents/HINT-TEXTS-550.md cards 2, 5, 6, 7, 8, 10): the Hint each now shows,
  // pinned as it stands (a regression pin with no control of its own: the three new readings change none of them, measured at #550 cg7).
  const SIXH=[
    ['K2','rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq e3 0 1','exd4','Bb4+','Their pawn on d4 can be taken, and taking it is right even though it can be taken back.'],
    ['K5','rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq e6 0 1','dxe5','Nf3','Their pawn on e5 can be taken. Take it with the pawn.'],
    ['K6','r2qk2r/ppp2ppp/2nbpn2/3p4/3P2b1/2PBPN2/PP3PPP/RNBQ1RK1 w kq - 0 1','h3','Qc2','Their bishop on g4 is short of defenders. Attack it.'],
    ['K7','rnb2r1k/ppqp1ppB/3bp3/8/3P2n1/2P2NN1/PPQ2PPP/R1B1R1K1 w - - 0 1','Re4','Be4','Their knight on g4 is short of defenders. Attack it.'],
    ['K8','5rk1/pBqb1pbp/4p1p1/1p1nN3/2pP4/2P3B1/PP3PPP/R2QR1K1 w - - 0 1','Bxd5','Ba6','Their knight on d5 can be taken, and taking it is right even though it can be taken back.'],
    ['K10','r3r1k1/p2q1p1p/1p1p2pB/1Pp5/3bPP2/1Q6/1PP3PP/3RR2K b - - 0 1','Qb7','Re7','No tactic to spot here: look for the move that improves your worst piece.'],
  ];
  for(const [id,f,bs,ps,want] of SIXH){let t='';try{const g=E.fromFEN(f);t=E.mistakeHint(g,E.findMoveBySAN(g,bs),E.findMoveBySAN(g,ps));}catch(e){t='THREW '+e.message;}
    L.say(t===want,'TC-R209g '+id+' his card ('+ps+', best '+bs+'): the Hint reads "'+t+'"',{t,want});}
  // and the drill's verdict names the same thing (say), so the solve sentence does not fall back to "was stronger" on them
  {const g=E.fromFEN(MOT[4][1]);const v=E.drillVerdict(g,E.findMoveBySAN(g,'Nc7'),null,'Nc7 was stronger. Kh1 went from level to losing.');
   L.say(/^Nc7 forks the rook on a8 and the rook on e8\./.test(v),'TC-R209f F13 the drill verdict on the fork says it ("'+v+'")',v);}
  // TC-R209h [#550 jobs/fork-reading-fires-on-a-move-that-is-mated-2026-11-13]: a move after which they have mate in one gets NO reading - not
  // the fork, and not the older 'attack' reading it fell through to ("Their rook on b8 is short of defenders. Attack it.") - and the drill
  // verdict for a card that stored it as best keeps the stored sentence rather than calling it a fork. The checker's card, Nc6 then Rb1#.
  {const g=E.fromFEN(MOT[5][1]);const m=E.findMoveBySAN(g,'Nc6');let r=null,v='',mated=false;
   try{r=E.concreteRead(g,m);const g2=E.makeMove(g,m);mated=E.getLegal(g2).some(x=>E.getStatus(E.makeMove(g2,x))==='checkmate');v=E.drillVerdict(g,m,null,'Nc6 was stronger. Kh1 went from level to losing.');}catch(e){r={k:'THREW '+e.message};}
   L.say(mated,'TC-R209h PRECONDITION after Nc6 Black has a mate in one (Rb1#) on the checker\'s position',mated);
   L.say(r===null,'TC-R209h Nc6, which Rb1 mates, gets no reading at all ('+(r?('['+r.k+'] "'+r.hint+'"'):'null')+')',r);
   /* #550 helper B [jobs/sweep-for-regexes-checked-in-one-direction-only-2026-10-02]: this read /forks|attacks/, which cannot see the forms
      chess.jsx's readings print - ', a fork', ', a forking check', ', forking two at once', ' and hits the ', ' threatens ', ' is attacked'
      and the older reading this block's own comment quotes, '... short of defenders. Attack it.' (capital A, no s). FORK133 is checked both
      ways against those strings and the stored sentence the verdict must keep. */
   const FORK133=/\bfork(s|ing)?\b|\battack(s|ed|ing)?\b|\bhits\b|\bthreatens\b/i;
   const forkForms133=['Nc7 forks the rook on a8 and the rook on e8.','Nd5, a fork','Qe4+, a forking check','Ne6, forking two at once','Qb3 checks the king and attacks the bishop','Bd5 and hits the rook','Re1 threatens mate','Their rook on b8 is short of defenders. Attack it.','The knight is attacked.'];
   const notFork133=['Nc6 was stronger. Kh1 went from level to losing.','Rf3 was stronger. Qxh3 went from clearly better to losing.'];
   L.say(forkForms133.every(t=>FORK133.test(t))&&!notFork133.some(t=>FORK133.test(t))&&!forkForms133.slice(1,8).every(t=>/forks|attacks/.test(t)),'TC-SUITE-265 (TC-R209h) the no-fork pattern catches every fork, attack and threat form the readings print, not the stored sentence, and the old /forks|attacks/ missed some (checked both ways)',{missed:forkForms133.filter(t=>!FORK133.test(t)),wronglyCaught:notFork133.filter(t=>FORK133.test(t)),oldMissed:forkForms133.filter(t=>!/forks|attacks/.test(t))});
   L.say(!FORK133.test(v),'TC-R209h and the drill verdict on a card storing Nc6 does not call it a fork or an attack ("'+v+'")',v);
   const g0=E.fromFEN(MOT[5][1]);let t=null;try{t=E.concreteRead(g0,E.findMoveBySAN(g0,'h3'));}catch(e){t=null;}
   L.say(!!t&&t.k==='threat'&&/They threaten Rb1 mate/.test(t.hint),'TC-R209h the move that does stop it (h3) still reads the threat ("'+(t&&t.hint)+'")',t);}
},'133-hint-texts-read-the-position');
