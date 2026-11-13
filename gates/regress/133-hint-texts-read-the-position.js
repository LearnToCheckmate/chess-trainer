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
  const B=[['6k1/1pp3pn/1p1p2pp/3P4/4P1P1/2PB1P2/rrQK3P/3R3R w - - 0 1','h4',/queen on c2 is attacked/],['8/8/P1p1prkp/2Pp2p1/4q3/4B1PR/3Q3K/8 w - - 0 1','Rxh6+',/rook on h3 can be given up with check/]];
  let bh=0;const bm=[];for(const [f,san,want] of B){let t='';try{const g=E.fromFEN(f);t=E.brilHint(g,E.findMoveBySAN(g,san),false)||'';}catch(e){t='';}if(want.test(t))bh++;else bm.push(san+': "'+t+'"');}
  L.say(bh===B.length,'TC-R209d the Brilliant drill hint names what is offered or left on the audit\'s two cards ('+bh+'/2'+(bm.length?'; '+bm.join(' | '):'')+')',bm);
  // #550 jobs/brilliant-drill-explanation-is-never-fully-readable-on-kunals-phone-2026-11-13: the hint names the piece AND the square it stands on
  // (never the square it goes to, which is the answer): Rxh6+ above from h3 (an offer), and the Opera Game's 16.Qb8+ from b3, whose reading
  // ("There is mate in two ...") named no square at all
  {let t='';try{const g=E.fromFEN('1n2kb1r/p2r1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16');t=E.brilHint(g,E.getLegal(g).find(m=>E.rc2sq(m.fr,m.fc)==='b3'&&E.rc2sq(m.tr,m.tc)==='b8'),false)||'';}catch(e){t='';}
   L.say(/queen on b3/.test(t)&&!/b8/.test(t),'TC-R209d2 the Brilliant drill hint for the Opera Game\'s Qb8+ names the piece and the square it stands on, not where it goes ("'+t+'")',t);}
},'133-hint-texts-read-the-position');
