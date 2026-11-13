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
// CONTROL-RECORD: 55ca2c7 2026-11-13 total=26 red=5 scope=env:CT_SRC=tip-chess.jsx how=#550 cg7: the branch tip chess.jsx (d04a8ed0b851, before the mate-threat, fork and pin readings) - TC-R209f F1 F5 F9 F10 F13 red; every must-NOT line, every older line and the six TC-R209g pins green (total 20 before TC-R209g was added)
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
  const B=[['6k1/1pp3pn/1p1p2pp/3P4/4P1P1/2PB1P2/rrQK3P/3R3R w - - 0 1','h4',/queen on c2 is attacked/],['8/8/P1p1prkp/2Pp2p1/4q3/4B1PR/3Q3K/8 w - - 0 1','Rxh6+',/rook can be given up with check/]];
  let bh=0;const bm=[];for(const [f,san,want] of B){let t='';try{const g=E.fromFEN(f);t=E.brilHint(g,E.findMoveBySAN(g,san),false)||'';}catch(e){t='';}if(want.test(t))bh++;else bm.push(san+': "'+t+'"');}
  L.say(bh===B.length,'TC-R209d the Brilliant drill hint names what is offered or left on the audit\'s two cards ('+bh+'/2'+(bm.length?'; '+bm.join(' | '):'')+')',bm);
  // ── TC-R209f [#550 cg7; jobs/drill-hints-name-the-positions-point-2026-11-12, the independent checker's gap]: the three readings it had no
  // words for - a mate threat, a fork without check, a pin - each on positions where it must fire AND positions where it must not.
  const rd=(f,san)=>{try{const g=E.fromFEN(f);const m=E.findMoveBySAN(g,san);if(!m)return {k:'NOMOVE'};return E.concreteRead(g,m)||{k:null,hint:null};}catch(e){return {k:'THREW '+e.message};}};
  const MOT=[ // [id, fen, move, kind, must fire?, the hint must match (fire) / why it must not]
    ['F1','5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe4','matethreat',true,/^One move sets up a mate threat on h7\.$/,'Qxh7 mate is threatened (the knight on g5 guards h7)'],
    ['F2','5rk1/5ppp/5n2/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe4','matethreat',false,null,'the knight on f6 takes the queen on e4'],
    ['F3','5rk1/5ppp/8/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe3','matethreat',false,null,'Qe3 sees nothing near the king'],
    ['F4','5rk1/5p1p/6p1/6N1/8/8/5PPP/4Q1K1 w - - 0 1','Qe4','matethreat',false,null,'the pawn on g6 shuts the diagonal to h7'],
    ['F5','1r1q2k1/5ppp/8/4N3/8/8/5PPP/6K1 w - - 0 1','Nc6','fork',true,/^Your knight can attack the queen on d8 and the rook on b8 at once\.$/,'the checker\'s case: it used to name only the rook'],
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
    ['K10','r3r1k1/p2q1p1p/1p1p2pB/1Pp5/3bPP2/1Q6/1PP3PP/3RR2K b - - 0 1','Qb7','Re7','No tactic to spot here — look for the move that improves your worst piece.'],
  ];
  for(const [id,f,bs,ps,want] of SIXH){let t='';try{const g=E.fromFEN(f);t=E.mistakeHint(g,E.findMoveBySAN(g,bs),E.findMoveBySAN(g,ps));}catch(e){t='THREW '+e.message;}
    L.say(t===want,'TC-R209g '+id+' his card ('+ps+', best '+bs+'): the Hint reads "'+t+'"',{t,want});}
  // and the drill's verdict names the same thing (say), so the solve sentence does not fall back to "was stronger" on them
  {const g=E.fromFEN(MOT[4][1]);const v=E.drillVerdict(g,E.findMoveBySAN(g,'Nc6'),null,'Nc6 was stronger. Kh1 went from level to losing.');
   L.say(/^Nc6 forks the queen on d8 and the rook on b8\./.test(v),'TC-R209f F13 the drill verdict on the fork says it ("'+v+'")',v);}
},'133-hint-texts-read-the-position');
