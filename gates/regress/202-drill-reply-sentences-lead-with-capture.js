'use strict';
// gates/regress/202-drill-reply-sentences-lead-with-capture.js - EVERY REPLY THE DRILL CAN DESCRIBE IS DESCRIBED BY WHAT IT CAPTURES AND CHECKS, FIRST.
// US-R212 / TC-R302..R305. Jobs: drill-reply-description-leads-with-a-side-effect-not-the-capture-2026-11-13 (replyWhy),
// drill-reply-capture-with-check-described-by-its-side-effect-2026-11-13 (missWhy letsgo, replyWhy). Node-only: the shipped replyWhy and
// missWhy through gates/engine-extract.js, over the library puzzle positions (PZGEN_RAW, read out of the source) and the drill's fixtures.
// WHY A SCAN: the checker's GAP (15 Nov) was one position (Rd2 then Qxg5, "allows Qxg5, a fork" for a queen taking a knight) found by
// scanning 262 positions - 70 fork and 52 forking-check lines named no capture. Pinning one position pins one branch, so this reads
// every wrong move x every reply, and checks each sentence against FACTS COMPUTED HERE from the board (what the reply took, whether it
// checks), never from the sentence code:
//   S1 a reply that takes a piece worth 3+ (or trades even) says so BEFORE any fork / discovered / hits / chases / pins clause;
//   S2 a reply that gives check and carries a side-effect clause says "check";
//   S3 every capture phrase names the piece actually taken ("taking your knight", "trading queens"), and "check" is said only of a check;
//   S4 missWhy letsgo: "take the X" only for a capture of an X, "with check" iff it checks, "give check" only for a check with no capture,
//      "get away"/"guard" only when the reply neither captures nor checks.
// Alternation note (CLAUDE.md): every pattern is read against ALL the branches of replyWhy (mate / forking check / fork / discovered check /
// winning the X / capture phrase with or without band / gist / band) and missWhy letsgo (off the hook / take / give check / get away / guard).
const L=require('../lib');const E=require('../engine-extract.js');const fs=require('fs');
console.log('202-drill-reply-sentences: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5);
const src=fs.readFileSync(E.SRC_PATH,'utf8');
const raw=JSON.parse(/const PZGEN_RAW=(\[.*?\]);\s*\n/s.exec(src)[1]);
const NAMEOF={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const FIX=[['job card','r4rk1/np6/3pNq1Q/p2p4/2bP4/2P5/3B1PPP/R3R1K1 w - - 0 1','Nxf8'],
 ['fork lib','2r4k/1p2bp1p/p1n1p1pq/3pP1N1/3P2Q1/1P6/P4PPP/3R2K1 w - - 0 1','Nxf7+'],
 ['B1','rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 1','Qd7'],
 ['B2','4kb1r/p2B1ppp/4qn2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 1','Qd7']];
const POS=FIX.map(x=>({n:x[0],f:x[1],best:x[2]}));
raw.slice(0,Number(process.env.CT_G202_N||40)).forEach((p,i)=>POS.push({n:'lib'+i,f:p.f,best:p.s[0]}));
const SCORES=[[{cp:300,mate:null},0],[{cp:150,mate:null},1.0],[{cp:40,mate:null},3.0],[{cp:null,mate:null},null]];
const SIDE=/fork|discovered|which (hits|chases|pins)|a check that/;
const stats={replies:0,sentences:0,capFork:0,capSide:0,chkSide:0,letsgo:0,letsCap:0,letsChk:0,letsCapChk:0,letsPlain:0};
const bad={S1:[],S2:[],S3:[],S4:[]};
const piecesOf=(s)=>{const m=[];const r=/(?:taking your|winning the|take the|trading its|for your) (\w+)/g;let x;while((x=r.exec(s)))m.push(x[1]);return m;};
L.run(async()=>{
 let nFen=0;
 for(const P of POS){
  let p;try{p=E.fromFEN(P.f);}catch(e){continue;}nFen++;
  const bm=E.findMoveBySAN(p,P.best);
  for(const mv of E.getLegal(p)){
   const g2=E.makeMove(p,mv);if(!g2)continue;const st=E.getStatus(g2);if(st!=='playing'&&st!=='check')continue;
   // ── missWhy (letsgo) ──
   try{const w=bm?E.missWhy(p,mv,bm):null;
    if(w&&w.kind==='letsgo'&&w.reply){stats.letsgo++;const r=E.findMoveBySAN(g2,w.reply);
     if(r){const g3=E.makeMove(g2,r);const cap=(g2.board[r.tr][r.tc])||(r.epCap?{t:'p'}:null),chk=E.getStatus(g3)==='check';const t=w.text;
      const takes=/^lets them take the (\w+)( with check)? \(/.exec(t),gives=/^lets them give check \(/.test(t),plain=/^lets the .* get away|^lets them guard/.test(t);
      if(cap&&chk)stats.letsCapChk++;else if(cap)stats.letsCap++;else if(chk)stats.letsChk++;else stats.letsPlain++;
      let ok=true;
      if(cap){ok=!!takes&&takes[1]===NAMEOF[cap.t]&&!!takes[2]===chk;}
      else if(chk)ok=gives;
      else ok=plain;
      if(!ok)bad.S4.push({pos:P.n,mv:E.toSAN(p,mv,E.applyMove(p.board,mv)),t,cap:cap&&cap.t,chk});}}
   }catch(e){bad.S4.push({pos:P.n,err:e.message});}
   // ── replyWhy ──
   for(const r of E.getLegal(g2)){
    const g3=E.makeMove(g2,r);if(!g3)continue;if(!(g2.board[r.tr][r.tc]||r.epCap)&&E.getStatus(g3)!=='check')continue;stats.replies++;   /* only replies that take or check: the rest carry nothing S1-S3 read */
    const cap=(g2.board[r.tr][r.tc])||(r.epCap?{t:'p'}:null),mp=g2.board[r.fr][r.fc],chk=E.getStatus(g3)==='check',mate=E.getStatus(g3)==='checkmate';
    let back=false;try{back=E.getLegal(g3).some(m=>m.tr===r.tr&&m.tc===r.tc);}catch(e){}
    const cv=cap?(E.SEEVAL[cap.t]||0):0,mv2=E.SEEVAL[mp.t]||0;
    const named=cap&&(cv>=3||(back&&cv===mv2&&cv>=3));
    for(const [sc,base] of SCORES){
     let t=null;try{t=E.replyWhy(g2,r,sc,base);}catch(e){bad.S1.push({pos:P.n,err:e.message});}
     if(!t||mate||/^allows mate/.test(t))continue;stats.sentences++;
     const at={pos:P.n,reply:E.toSAN(g2,r,E.applyMove(g2.board,r)),cap:cap&&cap.t,chk,t};
     const side=SIDE.exec(t);
     if(named){const ci=t.search(/taking your|winning the|trading/);
      if(side)stats.capSide++;if(/fork/.test(t))stats.capFork++;
      if(ci<0||(side&&ci>side.index))bad.S1.push(at);}
     if(chk&&side){stats.chkSide++;if(!/check/.test(t))bad.S2.push(at);}
     if(/check/.test(t)&&!chk)bad.S3.push(Object.assign({why:'says check, none given'},at));
     for(const nm of piecesOf(t)){
      const okNm=cap&&(nm===NAMEOF[cap.t]||nm===NAMEOF[mp.t]);
      if(!okNm)bad.S3.push(Object.assign({why:'names '+nm},at));}
     if(/trading (pawn|knight|bishop|rook|queen)s\b/.test(t)&&!(cap&&mp.t===cap.t&&back))bad.S3.push(Object.assign({why:'trading with no even trade'},at));
    }
   }
  }
 }
 const j=(a)=>JSON.stringify(a.slice(0,3));
 L.say(nFen>=40&&stats.replies>500,'TC-R302 PRECONDITION the scan has a denominator: '+nFen+' positions, '+stats.replies+' replies, '+stats.sentences+' sentences',stats);
 L.say(stats.capSide>=20&&stats.capFork>=3,'TC-R302 PRECONDITION the scan met named captures with a side-effect clause ('+stats.capSide+') and with a fork ('+stats.capFork+')',stats);
 L.say(bad.S1.length===0,'TC-R302 S1 every reply that takes a minor piece or more (or trades even) names the capture before any fork, discovered check or threat clause ('+bad.S1.length+' break it)',j(bad.S1));
 L.say(stats.chkSide>=5,'TC-R303 PRECONDITION checking replies with a side-effect clause were met ('+stats.chkSide+')',stats);
 L.say(bad.S2.length===0,'TC-R303 S2 a reply that gives check and carries a side-effect clause says "check" ('+bad.S2.length+' do not)',j(bad.S2));
 L.say(bad.S3.length===0,'TC-R304 S3 every capture phrase names the piece really taken, and "check" is said only of a check ('+bad.S3.length+' wrong)',j(bad.S3));
 L.say(stats.letsCap>=1&&stats.letsChk+stats.letsCapChk>=1&&stats.letsgo>=5,'TC-R305 PRECONDITION missWhy letsgo met a capture ('+stats.letsCap+'), a check ('+stats.letsChk+') or capture with check ('+stats.letsCapChk+') of '+stats.letsgo,stats);
 L.say(bad.S4.length===0,'TC-R305 S4 missWhy letsgo describes a capture, a check, a capture with check by exactly that, and only a quiet reply by get away or guard ('+bad.S4.length+' wrong)',j(bad.S4));
 // the two named positions, pinned as sentences (their branches are all read above)
 const pk=E.fromFEN('2r4k/1p2bp1p/p1n1p1pq/3pP1N1/3P2Q1/1P6/P4PPP/3R2K1 w - - 0 1');const g=E.makeMove(pk,E.findMoveBySAN(pk,'Rd2'));
 const rq=E.findMoveBySAN(g,'Qxg5');const tq=rq&&E.replyWhy(g,rq,{cp:300,mate:null},0);
 L.say(tq==='allows Qxg5, taking your knight, a fork','TC-R302 the checker\'s position: Rd2 then Qxg5 reads "allows Qxg5, taking your knight, a fork" ('+tq+')',tq);
 const pb=E.fromFEN('r4rk1/np6/3pNq1Q/p2p4/2bP4/2P5/3B1PPP/R3R1K1 w - - 0 1');
 const mb=E.missWhy(pb,E.findMoveBySAN(pb,'Bg5'),E.findMoveBySAN(pb,'Nxf8'));
 L.say(!!mb&&mb.text==='lets them take the pawn with check (Qxf2+)','TC-R305 the job card: Bg5 (best Nxf8) reads "lets them take the pawn with check (Qxf2+)" ('+(mb&&mb.text)+')',mb);
},'202-drill-reply-sentences');
