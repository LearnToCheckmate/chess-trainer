'use strict';
// gates/regress/136-chess-content-holds.js - THE LESSONS AND PUZZLES TEACH CHESS THE ENGINE AGREES WITH. US-R144 / TC-R212a..w.
//
// WHY [#550, docs/chess-correctness-2026-11-12 CHS-01..CHS-23; Kunal 12 Nov, "Batch 10, wrong first"]: the correctness check read every
// position the app teaches against the shipped Stockfish and found five places that teach wrong chess - the Legal Trap lesson and curated
// puzzle c11 rewarding Nxe5, which loses a piece to ...Nxe5 (-2.5), the Strategy card "Passed pawns must be pushed" where pushing throws the
// win away (the black king is inside the square), the Vienna "Bishop trap" promising a clean extra pawn in a level ending, and the Albin
// Lasker Trap calling an illegal move (Bxe3, the bishop is pinned) forced - and eighteen smaller ones (a weaker move taught, a "forced" that
// is not, a recapture said to be impossible, a "+" on 243 mating moves, a wrong move number). Gate 129 holds the Tactics and Strategy cards;
// this one holds what the audit found, each fixed until the engine agrees at depth 16.
// WHAT IT READS: chess.jsx (through gates/engine-extract.js for the rules: fromFEN, getLegal, makeMove, findMoveBySAN, getStatus; and the
// PUZZLES, TACTICS, STRAT and PZGEN_RAW literals read out of the same source text), lessons.js (CT_LESSONS, else ../../lessons.js - the
// lessons are not in app.js, index.html loads them beside it), and the app's own engine, stockfish-18-lite-single.js, run in node exactly as
// gate 129 runs it. CT_SRC and CT_LESSONS select another tree's files (the control). It prints both md5s.
// WHAT IT ASSERTS: P1 - TC-R212a every White move of the Legal Trap lesson is the engine's best or within 0.5 of it and the line mates;
// TC-R212b the same for every solver move of curated puzzle "Opening trap: Legal's Mate", first move at least +0.5; TC-R212c on "Passed pawns
// must be pushed" a passed-pawn push keeps the side to move winning (>= +3); TC-R212d the Vienna Bc4 line ends level in material and eval
// and its words claim no extra pawn; TC-R212e the Lasker Trap note on 6.Bxb4 names a legal saving move within 0.5 of the engine's best.
// P2/P3 - TC-R212f numbered moves in the audited notes are legal and agree with the line; g Tactics recapture and "save both" wording;
// h Traxler "forced"; i Tennison material; j Cochrane errors marked; k Scotch two-pawn punch taught moves; l Space and Good bishop cards not
// a pawn down; m Kieninger c9 goal true and its mate unique; n g575's accepted moves; o the two mate lessons say the scripted defence helps;
// p Lasker "new queen" reply and c13's Qxd1; q '#' on every generated mate; r '+'/'#' on every lesson SAN; s Stafford; t Queen v Pawn
// "in front of"; u "long diagonal"; v "only legal move"; w g235's label.
// KNOW ITS LIMIT: depth 16 in node, one thread - a deeper search may still move a 0.5 margin; the word checks are pinned to the words the
// audit quoted and to the domain facts behind them (legal-move counts, pawn counts, squares), so a new wrong sentence elsewhere in a note is
// not read; the audit's 87.5 percent of unread opening prose is still unread. It checks content, not how the screen shows it (gates 11, 12,
// 48 and 57 drive the screens).
// CONTROL-RECORD: 9a6a5c6 2026-11-12 total=47 red=34 scope=trial:12e0074a77f8 how=#550 the tree as the audit found it, read as source - CT_SRC its chess.jsx 717f5d4c7a90 (the trial bundle 12e0074a77f8 is built from it) and CT_LESSONS its lessons.js 40f99bd4425d (lessons.js is in no bundle): every one of CHS-01..23 red, Nxe5 -258 against h3 +66 in the lesson and in c11 (TC-R212a,b), d6 -3 (TC-R212c), 'Nxe4?' (TC-R212d), no numbered saving move (TC-R212e), 6.Qe2 and 3...Nf3 (TC-R212f), 243 mates written with + (TC-R212q), Qf3 (TC-R212r); on 1943eccd1609 (chess.jsx 86cdc01a5655, lessons.js 3f7bf7777e0d) 51/0
const L=require('../lib');
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const E=require('../engine-extract');
const LES=process.env.CT_LESSONS||path.join(__dirname,'..','..','lessons.js');
const SF=path.join(__dirname,'..','..','stockfish-18-lite-single.js');
const DEPTH=16, ENDDEPTH=22;   // the mate lessons are read at depth 22, as the audit read its endgames: at 16 the engine still takes the scripted king moves for best
const md5=s=>crypto.createHash('md5').update(s).digest('hex').slice(0,12);
const src=fs.readFileSync(E.SRC_PATH,'utf8');
const lsrc=fs.readFileSync(LES,'utf8');
console.log('     source: '+E.SRC_PATH+'  md5 '+E.SOURCE_MD5+'   lessons: '+LES+'  md5 '+md5(lsrc));
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const F='abcdefgh';
const uci=m=>F[m.fc]+(8-m.fr)+F[m.tc]+(8-m.tr)+(m.promo?m.promo.toLowerCase():'');
const sqOf=(r,c)=>F[c]+(8-r);
function lit(name){const i=src.indexOf('const '+name+'=[');if(i<0)return null;const j=src.indexOf('\n];',i);if(j<0)return null;try{return new Function('return '+src.slice(i+('const '+name+'=').length,j+2))();}catch(e){return null;}}
function rawGen(){try{const i=src.indexOf('const PZGEN_RAW=');return JSON.parse(src.slice(i+16,src.indexOf('\n',i)).replace(/;\s*$/,''));}catch(e){return null;}}
function lessonsAll(){const W={};try{new Function('window',lsrc)(W);}catch(e){return [];}const C=W.CTLESSONS||{};const out=[];
  for(const k of ['OPENINGS','ENDGAMES','MORE'])for(const l of (C[k]||[])){out.push({name:l.name,fen:l.fen||START,line:l.line||[],notes:l.notes||[],idea:l.idea||'',plans:l.plans||'',top:l});
    for(const v of (l.vars||[]))out.push({name:l.name+' / '+v.name,vname:v.name,fen:v.fen||l.fen||START,line:v.line||[],notes:v.notes||[],idea:v.idea||'',plans:v.plans||'',top:l});}
  return out;}
// replay a line: [{g (before), mv, san (computed), stored}] or null at the first illegal move
function replay(fen,sans){let g=E.fromFEN(fen);const out=[];for(const s of sans){const mv=E.findMoveBySAN(g,s);if(!mv)return {plies:out,bad:s};const ng=E.makeMove(g,mv);out.push({g,mv,san:ng.history[ng.history.length-1].san,stored:s,fen:E.toFEN(g)});g=ng;}return {plies:out,end:g};}
const fenOf=g=>E.toFEN(g);
function pawns(g,c){let n=0;for(const row of g.board)for(const p of row)if(p&&p.t==='p'&&p.c===c)n++;return n;}
function count(g,c,t){let n=0;for(const row of g.board)for(const p of row)if(p&&p.t===t&&p.c===c)n++;return n;}
function engine(){
  const p=cp.spawn(process.execPath,[SF],{stdio:['pipe','pipe','ignore']});let buf='',w=null;
  p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const l=buf.slice(0,k).trim();buf=buf.slice(k+1);if(w)w(l);}});
  const send=s=>p.stdin.write(s+'\n');const until=pr=>new Promise(r=>{w=l=>{if(pr(l)){w=null;r(l);}};});
  const go=(fen,extra,depth)=>new Promise(res=>{let sc=null,mate=null;w=l=>{if(l.startsWith('info ')&&/ score /.test(l)){const m=/ score (cp|mate) (-?\d+)/.exec(l);if(m){if(m[1]==='mate'){mate=+m[2];sc=mate>0?100000-mate:-100000-mate;}else{mate=null;sc=+m[2];}}}else if(l.startsWith('bestmove')){w=null;res({sc,mate,bm:l.split(' ')[1]});}};send('ucinewgame');send('position fen '+fen);send('go depth '+(depth||DEPTH)+(extra||''));});
  return {async init(){send('uci');await until(l=>l==='uciok');send('isready');await until(l=>l==='readyok');},go,quit(){try{send('quit');}catch(e){}setTimeout(()=>{try{p.kill();}catch(e){}},200);}};
}
const fmt=r=>r?(r.mate!=null?'M'+r.mate:r.sc):'none';
L.run(async()=>{
  const LS=lessonsAll(),PUZ=lit('PUZZLES'),TAC=lit('TACTICS'),STR=lit('STRAT'),RAW=rawGen();
  L.say(LS.length>=200,'TC-R212 PRECONDITION lessons.js carries the lessons and their variations ('+LS.length+' lines read)',LS.length);
  L.say(Array.isArray(PUZ)&&PUZ.length===14,'TC-R212 PRECONDITION chess.jsx carries the 14 curated puzzles ('+(PUZ?PUZ.length:'none')+')');
  L.say(Array.isArray(TAC)&&TAC.length===13&&Array.isArray(STR)&&STR.length===18,'TC-R212 PRECONDITION chess.jsx carries the 13 Tactics and 18 Strategy cards ('+(TAC?TAC.length:'none')+', '+(STR?STR.length:'none')+')');
  L.say(Array.isArray(RAW)&&RAW.length===876,'TC-R212 PRECONDITION chess.jsx carries the 876 generated puzzles ('+(RAW?RAW.length:'none')+')');
  const byName=n=>LS.find(l=>l.name===n);
  const byLine=(top,prefix)=>LS.find(l=>l.top.name===top&&l.vname&&prefix.every((s,i)=>l.line[i]===s));
  const pz=(re)=>(PUZ||[]).find(p=>re.test(p.motif));
  const T=n=>(TAC||[]).find(t=>t.motif===n),S=n=>(STR||[]).find(s=>s.title===n);
  const en=engine();await en.init();
  const best=(fen,d)=>en.go(fen,'',d);const only=(fen,mv,d)=>en.go(fen,' searchmoves '+uci(mv),d);
  // the move is the engine's best, or within 0.5 of it (two searches of one move differ by tens of cp, so the engine naming it best passes)
  async function near(fen,mv){const b=await best(fen),m=await only(fen,mv);return {ok:b.sc!=null&&m.sc!=null&&(uci(mv)===b.bm||m.sc>=b.sc-50),b,m};}
  async function sideMoves(les,side,id,label){
    if(!les){L.say(false,id+' '+label+': the lesson is not in lessons.js');return;}
    const r=replay(les.fen,les.line);L.say(!r.bad,id+' '+label+': every stored move is legal'+(r.bad?' (illegal: '+r.bad+')':''));if(r.bad)return null;
    const bad=[];for(let k=0;k<r.plies.length;k++){const q=r.plies[k];if(q.g.turn!==side)continue;const x=await near(q.fen,q.mv);if(!x.ok)bad.push((k+1)+'.'+q.stored+' '+fmt(x.m)+' against '+x.b.bm+' '+fmt(x.b));}
    L.say(bad.length===0,id+' '+label+': every '+(side==='w'?'White':'Black')+' move is the engine\'s best or within 0.5 of it at depth '+DEPTH+(bad.length?' - NOT: '+bad.join('; '):''),bad);
    return r;}

  // ---- P1 ----
  const legal=byName('Légal Trap');
  const rA=await sideMoves(legal,'w','TC-R212a','Légal Trap lesson (CHS-01)');
  if(rA){const k=rA.plies.findIndex(q=>q.stored==='Nxe5');const x=k>=0?await only(rA.plies[k].fen,rA.plies[k].mv):null;
    L.say(!!x&&x.sc>=50,'TC-R212a Légal Trap: Nxe5 leaves White better (at least +0.5, side to move: '+fmt(x)+')',x);
    L.say(E.getStatus(rA.end)==='checkmate','TC-R212a Légal Trap: the line ends in mate, as Légal\'s Mate does');
}
  const c11=pz(/Légal/);
  if(!c11)L.say(false,'TC-R212b curated puzzle "Opening trap: Légal\'s Mate" is in PUZZLES');
  else{let g=E.fromFEN(c11.fen);const bad=[];let first=null;
    for(let k=0;k<c11.sol.length;k++){const mv=E.findMoveBySAN(g,c11.sol[k]);if(!mv){bad.push(c11.sol[k]+' illegal');break;}const x=await near(fenOf(g),mv);if(k===0)first=x.m;if(!x.ok)bad.push(c11.sol[k]+' '+fmt(x.m)+' against '+x.b.bm+' '+fmt(x.b));g=E.makeMove(g,mv);const rp=c11.reply[k];if(rp){const rm=E.findMoveBySAN(g,rp);if(!rm){bad.push('reply '+rp+' illegal');break;}g=E.makeMove(g,rm);}}
    L.say(bad.length===0,'TC-R212b c11 (CHS-02): every solver move is the engine\'s best or within 0.5 of it'+(bad.length?' - NOT: '+bad.join('; '):''),bad);
    L.say(!!first&&first.sc>=50,'TC-R212b c11: the first move leaves the solver better (at least +0.5: '+fmt(first)+')',first);
    L.say(E.getStatus(g)==='checkmate','TC-R212b c11: the solution ends in mate');}
  const pp=S('Passed pawns must be pushed');
  if(!pp)L.say(false,'TC-R212c the Strategy card "Passed pawns must be pushed" is in STRAT');
  else{const g=E.fromFEN(pp.fen),me=g.turn,dir=me==='w'?-1:1;
    const passed=(r,c)=>{for(let rr=r+dir;rr>=0&&rr<8;rr+=dir)for(const cc of [c-1,c,c+1]){if(cc<0||cc>7)continue;const q=g.board[rr][cc];if(q&&q.t==='p'&&q.c!==me)return false;}return true;};
    const pushes=E.getLegal(g).filter(m=>{const q=g.board[m.fr][m.fc];return q&&q.t==='p'&&m.fc===m.tc&&!g.board[m.tr][m.tc]&&passed(m.fr,m.fc);});
    L.say(pushes.length>0,'TC-R212c "Passed pawns must be pushed": the side to move has a passed pawn it can push ('+pushes.map(uci).join(',')+')');
    for(const m of pushes){const x=await only(pp.fen,m);L.say(x.sc!=null&&x.sc>=300,'TC-R212c "Passed pawns must be pushed" (CHS-03): pushing '+uci(m)+' keeps the side to move winning, as the card says (at least +3: '+fmt(x)+')',x);}}
  const vie=byLine('Vienna Game',['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5']);
  if(!vie)L.say(false,'TC-R212d the Vienna Game variation 3.Bc4 Nxe4 4.Qh5 is in lessons.js');
  else{const r=replay(vie.fen,vie.line);if(r.bad)L.say(false,'TC-R212d Vienna Bc4 line: illegal move '+r.bad);else{
    const pw=pawns(r.end,'w'),pb=pawns(r.end,'b');const b=await best(fenOf(r.end));const wp=r.end.turn==='w'?b.sc:-b.sc;
    L.say(pw===pb,'TC-R212d Vienna "'+vie.vname+'" (CHS-04): material is level at the end ('+pw+' White pawns, '+pb+' Black)',{pw,pb});
    L.say(b.sc!=null&&Math.abs(wp)<=60,'TC-R212d Vienna "'+vie.vname+'": the engine calls the end level (within 0.6: '+wp+' cp for White)',b);
    const txt=[vie.vname,vie.idea,vie.plans,...vie.notes].join(' | ');const claim=/pawn up|win(?:s|ning)? a pawn|tempting mistake|Nxe4\?(?!\?)/i.exec(txt);
    L.say(!claim,'TC-R212d Vienna "'+vie.vname+'": its name and words claim no extra pawn and no mistake in 3...Nxe4'+(claim?' (says "'+claim[0]+'")':''));}}
  const las=byName('Albin Counter-Gambit: Lasker Trap');
  let rLas=null;
  if(!las)L.say(false,'TC-R212e the Albin Counter-Gambit: Lasker Trap lesson is in lessons.js');
  else{rLas=replay(las.fen,las.line);const k=las.line.indexOf('Bxb4');
    if(rLas.bad||k<0)L.say(false,'TC-R212e Lasker Trap: the line replays and has Bxb4');
    else{const q=rLas.plies[k],num=Math.floor(k/2)+1,side=q.g.turn;const note=las.notes[k]||'';
      const toks=[...note.matchAll(/\b(\d+)(\.|…|\.\.\.)\s?([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?)/g)].filter(m=>+m[1]===num&&(side==='w'?m[2]==='.':m[2]!=='.'));
      L.say(toks.length>0,'TC-R212e Lasker Trap (CHS-05): the note on '+num+'.Bxb4 names the move White should have played, by number ("'+note+'")',toks.map(m=>m[0]));
      for(const t of toks){const mv=E.findMoveBySAN(q.g,t[3]);L.say(!!mv,'TC-R212e Lasker Trap: '+t[0]+' is a legal move there');if(mv){const x=await near(q.fen,mv);L.say(x.ok,'TC-R212e Lasker Trap: '+t[0]+' is the engine\'s best or within 0.5 of it ('+fmt(x.m)+' against '+x.b.bm+' '+fmt(x.b)+')',x);}}}}

  // ---- P2 / P3 ----
  const AUD=['Légal Trap','Albin Counter-Gambit: Lasker Trap','Traxler Counterattack','Tennison Gambit','Cochrane Gambit','Scotch Gambit','Bishop & Knight Mate','Two Bishops Mate','Fried Liver Attack','Stafford Gambit: Mating Trap','Queen vs Pawn (on the 7th)','Blackburne Shilling Gambit','Vienna Game','Budapest Gambit: Kieninger Trap'];
  const audited=LS.filter(l=>AUD.includes(l.top.name));
  { const bad=[];let n=0;
    for(const l of audited){const r=replay(l.fen,l.line);if(r.bad)continue;const f0=E.fromFEN(l.fen);const startNum=1,firstSide=f0.turn;
      const plyOf=(num,side)=>{const base=(num-startNum)*2+(side==='w'?0:1)-(firstSide==='b'?1:0);return base;};
      l.notes.forEach((note,k)=>{for(const m of String(note).matchAll(/(?:^|[\s(])(\d+)(\.|…|\.\.\.)\s?([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?)/g)){
        if(l.fen!==START)continue;   // endgame lessons are numbered from 1 at a set-up position; their notes carry no numbers
        const side=m[2]==='.'?'w':'b',j=plyOf(+m[1],side);if(j<0||j>k)continue;n++;
        const q=r.plies[j];if(!q){bad.push(l.name+' note '+(k+1)+': '+m[0].trim()+' (no such ply)');continue;}
        const mv=E.findMoveBySAN(q.g,m[3]);
        if(!mv)bad.push(l.name+' note '+(k+1)+': '+m[0].trim()+' is not legal at that move');
        else if(j<k&&E.cleanSAN(m[3])!==E.cleanSAN(q.stored))bad.push(l.name+' note '+(k+1)+': '+m[0].trim()+' names an earlier move as '+m[3]+' but the line played '+q.stored);}});}
    L.say(n>0&&bad.length===0,'TC-R212f numbered moves in the audited lessons\' notes are legal at their move and agree with the line ('+n+' read; CHS-05, CHS-15, CHS-21)'+(bad.length?' - NOT: '+bad.join('; '):''),bad);}
  { const bad=[];let n=0;for(const t of (TAC||[])){const g=E.fromFEN(t.fen);const mv=E.getLegal(g).find(m=>sqOf(m.fr,m.fc)===t.from&&sqOf(m.tr,m.tc)===t.to);if(!mv)continue;const ng=E.makeMove(g,mv);
      const recap=E.getLegal(ng).some(m=>m.tr===mv.tr&&m.tc===mv.tc);if(recap&&/no time to recapture|can(?:no|')t recapture|cannot recapture/i.test(t.explain)){bad.push(t.motif);}n++;}
    L.say(n===13&&bad.length===0,'TC-R212g no Tactics card says the reply cannot recapture when a legal recapture exists (CHS-06; '+n+' cards)'+(bad.length?' - NOT: '+bad.join(', '):''),bad);
    const da=T('Discovered attack');let cap=false;if(da){const g=E.fromFEN(da.fen);const q=g.board[8-+da.to[1]][F.indexOf(da.to[0])];cap=!!(q&&q.t==='q');}
    L.say(!!da&&!(cap&&/cannot save both/i.test(da.explain)),'TC-R212g "Discovered attack" (CHS-22): the queen is taken by the move itself, so the card does not say Black "cannot save both"');}
  const trax=byName('Traxler Counterattack');
  if(trax){const r=replay(trax.fen,trax.line);const k=trax.line.indexOf('Kxf2');const q=k>=0&&!r.bad?r.plies[k]:null;const n=q?E.getLegal(q.g).length:0;
    L.say(!!q&&!(n>1&&/(?<!not )\bforced\b|must take/i.test(trax.notes[k]||'')),'TC-R212h Traxler (CHS-07): the note on Kxf2 does not call it forced when there are '+n+' legal moves ("'+(trax.notes[k]||'')+'")');}
  else L.say(false,'TC-R212h the Traxler Counterattack lesson is in lessons.js');
  const ten=byLine('Tennison Gambit',['e4','d5','Nf3','dxe4','Ng5','Nf6','d3','exd3','Bxd3','Nc6']);
  if(ten){const r=replay(ten.fen,ten.line);const pw=pawns(r.end,'w'),pb=pawns(r.end,'b');const txt=(ten.notes[ten.notes.length-1]||'')+' | '+ten.plans;
    const claim=/pawn'?s back|about equal|roughly equal/i.exec(txt);
    L.say(!(pw<pb&&claim),'TC-R212i Tennison "'+ten.vname+'" (CHS-08): White ends with '+pw+' pawns to Black\'s '+pb+', and the last note and plans do not call the pawn back or the game equal'+(claim?' (says "'+claim[0]+'")':''));}
  else L.say(false,'TC-R212i the Tennison Gambit "...Nc6" variation is in lessons.js');
  const coc=byName('Cochrane Gambit');
  if(coc){const r=replay(coc.fen,coc.line);const bad=[];let n=0;
    for(let k=8;k<r.plies.length;k++){const q=r.plies[k];const b=await best(q.fen),m=await only(q.fen,q.mv);n++;if(b.sc!=null&&m.sc!=null&&b.sc-m.sc>=100&&!/\?|mistake|more accurate|inaccura/i.test(coc.notes[k]||''))bad.push((k+1)+'.'+q.stored+' loses '+(b.sc-m.sc)+' to '+b.bm);}
    L.say(n>0&&bad.length===0,'TC-R212j Cochrane (CHS-09): every move from ply 9 that loses a pawn or more against the engine\'s best is marked in its note'+(bad.length?' - NOT: '+bad.join('; '):''),bad);
    /* #550 helper B [jobs/sweep-for-regexes-checked-in-one-direction-only-2026-10-02]: this read /calls it level/i, the retired wording only,
       so a reworded level verdict - the forms TC-R212i's claim regex above already lists, 'about equal' and 'roughly equal', or a bare
       'level'/'equal' - passed. LEVEL136 is checked both ways: it catches those and not the note that ships ('... slightly better for White'). */
    const LEVEL136=/calls it level|\blevel\b|\bequal(ity)?\b|balanced/i;
    const levelForms136=['the engine calls it level','about equal','roughly equal','the position is level','equality for Black','a balanced game'];
    const notLevel136=['The king is stranded on e6. A knight down for two pawns, but after …Be6? the open lines give full compensation: slightly better for White.'];
    L.say(levelForms136.every(t=>LEVEL136.test(t))&&!notLevel136.some(t=>LEVEL136.test(t))&&!levelForms136.every(t=>/calls it level/i.test(t)),'TC-SUITE-265 (TC-R212j) the no-level pattern catches every level or equal wording and not the shipped note, where /calls it level/i caught one (checked both ways)',{missed:levelForms136.filter(t=>!LEVEL136.test(t)),wronglyCaught:notLevel136.filter(t=>LEVEL136.test(t))});
    L.say(!LEVEL136.test(coc.notes[coc.notes.length-1]||''),'TC-R212j Cochrane: the last note no longer says the engine "calls it level" (that verdict needs Black\'s ...Be6 error)',coc.notes[coc.notes.length-1]);}
  else L.say(false,'TC-R212j the Cochrane Gambit lesson is in lessons.js');
  await sideMoves(byLine('Scotch Gambit',['e4','e5','Nf3','Nc6','d4','exd4','Bc4','Bc5','c3','dxc3']),'w','TC-R212k','Scotch Gambit two-pawn punch (CHS-10)');
  for(const nm of ['Space gives your pieces room','Good bishop, bad bishop']){const s=S(nm);if(!s){L.say(false,'TC-R212l the Strategy card "'+nm+'" is in STRAT');continue;}
    const g=E.fromFEN(s.fen);const b=await best(s.fen);const wp=g.turn==='w'?b.sc:-b.sc;
    L.say(pawns(g,'w')>=pawns(g,'b'),'TC-R212l "'+nm+'" (CHS-11): White, the side the card praises, is not a pawn down ('+pawns(g,'w')+' to '+pawns(g,'b')+')');
    L.say(b.sc!=null&&wp>=-30,'TC-R212l "'+nm+'": the engine does not have White worse ('+wp+' cp for White)',b);}
  const c9=pz(/Kieninger/);
  if(c9){const g=E.fromFEN(c9.fen);const side=g.turn;const nb=count(g,side,'b');
    L.say(!(/grabbed your bishop/i.test(c9.goal)&&nb>1),'TC-R212m c9 Kieninger (CHS-12): the goal says White grabbed Black\'s bishop and Black has '+nb+' bishop(s) left ("'+c9.goal+'")');
    const mates=E.getLegal(g).filter(m=>E.getStatus(E.makeMove(g,m))==='checkmate');
    if(c9.sol.length===1)L.say(mates.length===1&&E.cleanSAN(E.makeMove(g,mates[0]).history.slice(-1)[0].san)===E.cleanSAN(c9.sol[0]),'TC-R212m c9: the stored move is the one mate ('+mates.length+' mating moves)');
    else{const mv=E.findMoveBySAN(g,c9.sol[0]);const x=mv?await near(c9.fen,mv):null;L.say(!!x&&x.ok,'TC-R212m c9: the first move is the engine\'s best or within 0.5'+(x?' ('+fmt(x.m)+' against '+x.b.bm+' '+fmt(x.b)+')':''));}}
  else L.say(false,'TC-R212m curated puzzle "Kieninger Trap" is in PUZZLES');
  const g575=RAW&&RAW[575];
  if(g575){const g=E.fromFEN(g575.f);const b=await best(g575.f);const al=(g575.a&&g575.a['0'])||[];
    L.say(al.length>0,'TC-R212n g575 (CHS-13): the "Sacrifice" puzzle accepts the quiet moves that hold as well ('+(al.join(', ')||'none')+')');
    for(const s of al){const mv=E.findMoveBySAN(g,s);const m=mv?await only(g575.f,mv):null;L.say(!!m&&m.sc>=b.sc-50,'TC-R212n g575: the accepted '+s+' is within 0.5 of the engine\'s best ('+fmt(m)+' against '+b.bm+' '+fmt(b)+')');}}
  { const l=byName('Bishop & Knight Mate'),san='Kg4',ply=6;
    if(!l)L.say(false,'TC-R212o Bishop & Knight Mate is in lessons.js');
    else{const r=replay(l.fen,l.line);const q=r.plies[ply-1];
      if(!q||q.stored!==san)L.say(false,'TC-R212o Bishop & Knight Mate: ply '+ply+' is '+san);
      else{const b=await best(q.fen,ENDDEPTH),m=await only(q.fen,q.mv,ENDDEPTH);const worse=b.sc-m.sc;
        L.say(worse>=100&&/longer/i.test(l.notes[ply-1]||''),'TC-R212o Bishop & Knight Mate (CHS-14): the scripted '+san+' costs the defender '+worse+' cp against '+b.bm+' at depth '+ENDDEPTH+', and its note says the best defence holds out longer ("'+(l.notes[ply-1]||'')+'")');}}}
  { const l=byName('Two Bishops Mate');
    if(!l)L.say(false,'TC-R212o Two Bishops Mate is in lessons.js');
    else{const r=replay(l.fen,l.line);const q=r.plies[0];const nm=/([KQRBN][a-h][1-8][+#]?) mates faster/.exec(l.notes[0]||'');const fm=nm?E.findMoveBySAN(q.g,nm[1]):null;
      const f=fm?await only(q.fen,fm,ENDDEPTH):null,m=await only(q.fen,q.mv,ENDDEPTH);
      L.say(!!f&&f.mate!=null&&f.mate>0&&(m.mate==null||m.mate>f.mate),'TC-R212o Two Bishops Mate (CHS-14): 1.'+q.stored+' is not the quickest mate, and the first note names the quicker move, which the engine confirms ('+(nm?nm[1]:'no move named')+' '+fmt(f)+' against '+q.stored+' '+fmt(m)+' at depth '+ENDDEPTH+')');}}
  const c13=pz(/Lasker/);
  if(c13&&las){const g=E.fromFEN(c13.fen);const qm=E.getLegal(g).find(m=>m.promo&&m.promo.toLowerCase()==='q');const g2=qm?E.makeMove(g,qm):null;const b=g2?await best(fenOf(g2)):null;
    const rep=b&&b.bm?E.getLegal(g2).find(m=>uci(m)===b.bm):null;const repSan=rep?E.cleanSAN(E.makeMove(g2,rep).history.slice(-1)[0].san):'';
    const k=las.line.indexOf('fxg1=N+');const note=las.notes[k]||'';
    L.say(!!repSan&&c13.explain.includes(repSan)&&!/allow Qxd1|met by Qxd1/.test(c13.explain),'TC-R212p c13 (CHS-15): after a new queen the engine answers '+repSan+', and the explanation names it rather than Qxd1');
    L.say(!!repSan&&note.includes(repSan)&&!/met by Qxd1|allow Qxd1/.test(note),'TC-R212p Lasker Trap lesson: the underpromotion note names '+repSan+' too ("'+note+'")');
    const st=c13.sol.length-1;const al=(c13.also&&c13.also[st])||[];let gg=E.fromFEN(c13.fen);for(let i=0;i<st;i++){gg=E.makeMove(gg,E.findMoveBySAN(gg,c13.sol[i]));gg=E.makeMove(gg,E.findMoveBySAN(gg,c13.reply[i]));}
    const qx=E.findMoveBySAN(gg,'Qxd1');const bx=E.findMoveBySAN(gg,c13.sol[st]);const a1=qx?await only(fenOf(gg),qx):null,a2=bx?await only(fenOf(gg),bx):null;
    L.say(al.includes('Qxd1')&&!!a1&&!!a2&&a1.sc>=a2.sc-50,'TC-R212p c13: Qxd1, as good as '+c13.sol[st]+' ('+fmt(a1)+' against '+fmt(a2)+'), is accepted at the last step');}
  else L.say(false,'TC-R212p the Lasker Trap puzzle and lesson are present');
  if(RAW){let n=0;const bad=[];RAW.forEach((r,i)=>{if(!(r.n>0))return;n++;const last=r.s[r.s.length-1];if(!/#$/.test(last))bad.push('g'+i+' '+last);});
    L.say(n===243&&bad.length===0,'TC-R212q every generated mate puzzle writes its mating move with # ('+n+' mates, '+bad.length+' written otherwise'+(bad.length?', e.g. '+bad.slice(0,3).join(', '):'')+'; CHS-16)',bad.slice(0,10));}
  { let n=0;const bad=[],unrep=[];for(const l of LS){const r=replay(l.fen,l.line);if(r.bad){unrep.push(l.name);continue;}for(const q of r.plies){n++;const want=(q.san.match(/[+#]$/)||[''])[0],got=(q.stored.match(/[+#]$/)||[''])[0];if(want!==got)bad.push(l.name+': '+q.stored+' should be '+q.san);}}
    L.say(n>=2000&&bad.length===0,'TC-R212r every lesson move carries its check or mate mark ('+n+' plies over '+(LS.length-unrep.length)+' lines; CHS-17)'+(bad.length?' - NOT: '+bad.slice(0,5).join('; '):''),bad.slice(0,10));
    if(unrep.length)L.note('lines that do not replay from their start (not read by TC-R212r): '+unrep.join(', '));}
  const sta=byName('Stafford Gambit: Mating Trap');
  if(sta){const r=replay(sta.fen,sta.line);const k=sta.line.indexOf('Bxf2+');const q=r.plies[k+1];const capF2=q?E.getLegal(q.g).some(m=>sqOf(m.tr,m.tc)==='f2'):true;
    L.say(!(!capF2&&/forced to take|must take/i.test(sta.notes[k]||'')),'TC-R212s Stafford (CHS-18): the king cannot take on f2, and the note on Bxf2+ does not say it is forced to ("'+(sta.notes[k]||'')+'")');
    /* #550 helper B (as LEVEL136 above): /\bpins?\b/i could not see 'pinned' or 'pinning'. PIN136 is checked both ways against the shipped note. */
    const PIN136=/\bpin(s|ned|ning)?\b/i;
    L.say(['the bishop pins the king','the king is pinned','a pinning check','a pin'].every(t=>PIN136.test(t))&&!PIN136.test('Checkmate! The g4-bishop checks; the f2-bishop and e4-knight take every escape. Mate down a queen.')&&!/\bpins?\b/i.test('the king is pinned'),'TC-SUITE-265 (TC-R212s) the no-pin pattern catches pins, pinned and pinning and not the shipped mate note (checked both ways)');
    L.say(!PIN136.test(sta.notes[sta.notes.length-1]||''),'TC-R212s Stafford: the mate note does not call the mating check a pin',sta.notes[sta.notes.length-1]);
    const c12=pz(/Stafford/);L.say(!!c12&&!/bishop pins/i.test(c12.explain),'TC-R212s c12: the puzzle explanation does not call the mating check a pin');}
  else L.say(false,'TC-R212s the Stafford Gambit: Mating Trap lesson is in lessons.js');
  { const bad=[];let n=0;for(const l of audited){const r=replay(l.fen,l.line);if(r.bad)continue;l.notes.forEach((note,k)=>{const q=r.plies[k];if(!q||!/in front of (?:the|its own) pawn/i.test(note))return;n++;
      const ng=k+1<r.plies.length?r.plies[k+1].g:r.end;let ok=false;for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){const p=ng.board[rr][cc];if(p&&p.t==='p'){const fr=rr+(p.c==='w'?-1:1);if(fr===q.mv.tr&&cc===q.mv.tc)ok=true;}}
      if(!ok)bad.push(l.name+' note '+(k+1)+' ('+q.stored+' to '+sqOf(q.mv.tr,q.mv.tc)+')');});}
    L.say(bad.length===0,'TC-R212t a note that says a piece went "in front of the pawn" names a move to the square in front of a pawn ('+n+' such notes; CHS-19)'+(bad.length?' - NOT: '+bad.join('; '):''),bad);}
  { const bad=[];let n=0;for(const l of LS){const r=replay(l.fen,l.line);if(r.bad)continue;l.notes.forEach((note,k)=>{const q=r.plies[k];if(!q||!/long diagonal/i.test(note))return;const p=q.g.board[q.mv.fr][q.mv.fc];if(!p||p.t!=='b')return;n++;
      const f=q.mv.tc,rk=7-q.mv.tr;if(!(f===rk||f+rk===7))bad.push(l.name+' note '+(k+1)+' ('+q.stored+')');});}
    L.say(bad.length===0,'TC-R212u a note that puts a just-moved bishop on "the long diagonal" moved it onto a1-h8 or h1-a8 ('+n+' such notes; CHS-20)'+(bad.length?' - NOT: '+bad.join('; '):''),bad);}
  { const bad=[];let n=0;for(const l of audited){const r=replay(l.fen,l.line);if(r.bad)continue;l.notes.forEach((note,k)=>{const q=r.plies[k];if(!q||!/only legal move/i.test(note))return;n++;const c=E.getLegal(q.g).length;if(c!==1)bad.push(l.name+' note '+(k+1)+' ('+q.stored+': '+c+' legal)');});}
    L.say(n>0&&bad.length===0,'TC-R212v in the audited lessons, a note that says "the only legal move" is on a position with exactly one ('+n+' such notes; CHS-18)'+(bad.length?' - NOT: '+bad.join('; '):''),bad);}
  const g235=RAW&&RAW[235];
  if(g235){let g=E.fromFEN(g235.f);for(let i=0;i<g235.s.length;i++){g=E.makeMove(g,E.findMoveBySAN(g,g235.s[i]));if(g235.y[i])g=E.makeMove(g,E.findMoveBySAN(g,g235.y[i]));}
    const b=E.getLegal(g).length?await best(fenOf(g)):{sc:0};const drawn=Math.abs(b.sc||0)<100;
    L.say(!(drawn&&/winning/i.test(g235.m)),'TC-R212w g235 (CHS-23): the line ends level ('+fmt(b)+'), so the puzzle is not labelled "'+g235.m+'"');}
  en.quit();
},'136-chess-content-holds');
