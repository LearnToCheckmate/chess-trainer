// regress/84-lesson-free-defender.js   THE FREE-DEFENDER LESSON: Two Bishops Mate practised against a king that chooses.
// #549 item (85), jobs/bench-lesson-one-format-two-content-types-2026-09-28, Kunal's 'one-first' on
// questions/endgame-lessons-should-the-defender-choose-2026-10-10: ONE lesson rebuilt as a trial, so he can judge it before
// anything spreads. TC-LS-054..056 / US-R107. The judgement calls the card did not settle are flags/amber-549-two-bishops-free-defender.
//
// WHAT IT GUARDS
//   TC-LS-054 (node, no browser) the net test itself, read out of chess.jsx by declaration: a stalemate and a piece the lone king
//             can take are refused without an engine; the engine verdict refuses a mate distance that rises by 3 or more, a mate
//             lost once it was 5 or fewer, and a position no longer winning, and accepts the slack Stockfish's own mating play
//             needs (a rise of 1 or 2). lessons.js: Two Bishops Mate carries defender:'free' and it is the ONLY lesson that does.
//   TC-LS-055 (browser, THE LESSON THREE's sizes 375x761 / 320x568 / 390x844 - read by width and height from L.GEOS, never by
//             name) practice from an OFF-BOOK first move (Bc4+, which the scripted format refused as "isn't the line") is
//             accepted, the defender answers with a legal move of its own, at least one of its replies differs from the
//             script's move at that ply, and the run - white played by an engine in the page, independent of the app's -
//             ends in checkmate inside 50 moves with no refusal, and banks the day (ct_learnprog has one day). The lesson
//             screen's pins hold before and after: board top 92, note box 75, footer 61, practice buttons 44, no page scroll,
//             and the practice board is the demo board's size (it does not jump). The progress text reads "move n", not
//             "n of 23", and the line-length strip is not drawn.
//   TC-LS-056 (browser, 375x761) the refusals in the app: Bf6 (the king takes it) is refused and the board does not move; once
//             the in-page engine sees mate in 4 or fewer, the white move that loosens the net most (measured by that engine,
//             and required to be a real loosening: no mate seen, or a mate 3+ moves further) is refused with "out of the net"
//             and the board does not move; the hint on the book line paints the book move; the run still ends in mate and
//             banks nothing, because a refused move is not flawless.
//
// CONTROLS: CT_APP trial bundles, one change each to chess.jsx; NC2 also runs its unit layer on the mutated source (CT_SRC). Baseline on
// the shipped trial a943b81e0a47: 94 pass / 0 fail, twice.
'use strict';
const L=require('../lib');
const D=require('../drive/lesson');
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');

// ── the net test, read out of chess.jsx by declaration (control: CT_SRC) ──────────────────────────────────────────
function freeHelpers(){
  const E=require('../engine-extract.js');
  const src=fs.readFileSync(process.env.CT_SRC||path.join(ROOT,'chess.jsx'),'utf8').split('\n');
  const want=['freeHangs','freeSyncVerdict','freeNetVerdict','freeFallbackReply'];const out={};
  const starts=[];for(let i=0;i<src.length;i++)if(/^(async\s+function|function|const|let|var)\s/.test(src[i]))starts.push(i);
  for(let s=0;s<starts.length;s++){const m=/^(?:function|const)\s+([A-Za-z_$][\w$]*)/.exec(src[starts[s]]);if(m&&want.includes(m[1]))out[m[1]]=src.slice(starts[s],s+1<starts.length?starts[s+1]:src.length).join('\n');}
  if(want.some(n=>!out[n]))return {missing:want.filter(n=>!out[n])};
  const code=want.map(n=>out[n]).join('\n')+'\nreturn {'+want.join(',')+'};';
  const H=new Function('opp','isAttacked','FILES','getStatus','getLegal',code)(E.opp,E.isAttacked,E.FILES,E.getStatus,E.getLegal);
  return {H,E,md5:E.SOURCE_MD5};
}
const sanOf=(E,g,m)=>E.toSAN(g,m,E.applyMove(g.board,m));
const bySan=(E,g,san)=>E.getLegal(g).find(m=>E.cleanSAN(sanOf(E,g,m))===E.cleanSAN(san))||null;
const uciOf=(E,m)=>E.FILES[m.fc]+(8-m.fr)+E.FILES[m.tc]+(8-m.tr);
const sqs=(E,m)=>[E.FILES[m.fc]+(8-m.fr),E.FILES[m.tc]+(8-m.tr)];

// ── page helpers (the same readings gate 48 takes; copied, not imported, because that file is a gate and not a library) ──
const footer=(b)=>b.page.evaluate(()=>{const f=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='471');
  if(!f)return null;const r=f.getBoundingClientRect();return {top:+r.top.toFixed(1),h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)};});
const note=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="lesson-note"]');if(!e)return null;const r=e.getBoundingClientRect();return {h:+r.height.toFixed(1),top:+r.top.toFixed(1)};});
const row=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('button')]
  .filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&/^(Flip board|Hints|Try again|More actions)$/.test(x.getAttribute('aria-label')||'');})
  .map(x=>{const r=x.getBoundingClientRect();return {a:x.getAttribute('aria-label'),h:+r.height.toFixed(1)};}));
const position=(b)=>b.page.evaluate(()=>{
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if(!g)return null;const h=(s)=>{let x=5381;for(let i=0;i<s.length;i++)x=((x*33)^s.charCodeAt(i))>>>0;return x.toString(36)[0];};
  return [...g.children].slice(0,64).map(k=>{const im=k.querySelector('img');return im?h(im.getAttribute('src')||''):'.';}).join('');});
const hintSquares=(b)=>b.page.evaluate(()=>{
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if(!g)return null;const kids=[...g.children].slice(0,64);const bl=kids[56]?(kids[56].innerText||''):'',br=kids[63]?(kids[63].innerText||''):'';
  const flip=/h/.test(bl)&&!/a/.test(bl)?true:(/a/.test(br)&&!/h/.test(br)?true:false);
  const nm=(i)=>{const c=i%8,rw=Math.floor(i/8);const f=flip?7-c:c,r=flip?rw:7-rw;return String.fromCharCode(97+f)+(r+1);};
  const out=[];kids.forEach((k,i)=>{if([...k.children].some(d=>d.style&&d.style.background==='rgba(255, 200, 30, 0.75)'))out.push(nm(i));});return out.sort();});
const near=(a,c,tol)=>a!=null&&c!=null&&Math.abs(a-c)<(tol==null?0.6:tol);
const learnDays=(b)=>b.page.evaluate(()=>{try{const p=JSON.parse(localStorage.getItem('ct_learnprog')||'{}');const c=p['Two Bishops Mate'];return c&&Array.isArray(c.days)?c.days.length:0;}catch(e){return -1;}});
// The pins the card names, read the same way at every moment they are asserted.
async function pins(b,geo,when,demoW){
  const m=await b.metrics(),n=await note(b),f=await footer(b),r=await row(b);
  const sw=await b.page.evaluate(()=>document.documentElement.scrollWidth);
  L.say(!!m.board&&near(m.board.top,92,1)&&(demoW==null||near(m.board.w,demoW,0.6)),'TC-LS-055 '+geo+' '+when+': the board top is 92'+(demoW==null?'':' and the board is the demo board\'s '+demoW+' wide (no jump into practice)'),m.board);
  L.say(!!n&&near(n.h,75),'TC-LS-055 '+geo+' '+when+': the note box is 75 tall',n);
  L.say(!!f&&near(f.h,61),'TC-LS-055 '+geo+' '+when+': the footer is 61 tall',f);
  // At the mate "Try again" gives way to the finished-lesson button (as in every lesson), so three of the four remain.
  const want=/mate/.test(when)?['Flip board','Hints','More actions']:['Flip board','Hints','Try again','More actions'];
  L.say(r.map(x=>x.a).join()===want.join()&&r.every(x=>near(x.h,44)),'TC-LS-055 '+geo+' '+when+': the practice buttons ('+want.length+') are 44 tall',r);
  L.say(m.over.over<=0&&sw===m.vw,'TC-LS-055 '+geo+' '+when+': no page scroll (over '+m.over.over+', scrollWidth '+sw+' of '+m.vw+')');
}
// The white side, played by a Stockfish of the gate's own in the page - a separate worker, so it shares nothing with the app's.
async function sfInit(b){await b.page.evaluate(()=>{window.__g84=new Worker('./stockfish-18-lite-single.js');window.__g84o=[];window.__g84.onmessage=e=>window.__g84o.push(String(e.data));window.__g84.postMessage('uci');window.__g84.postMessage('isready');});
  for(let i=0;i<100;i++){await b.page.waitForTimeout(100);if(await b.page.evaluate(()=>window.__g84o.includes('readyok')))return true;}return false;}
async function sfGo(b,fen,ms){await b.page.evaluate((a)=>{window.__g84o=[];window.__g84.postMessage('position fen '+a[0]);window.__g84.postMessage('go movetime '+a[1]);},[fen,ms]);
  for(let i=0;i<(ms/100+60);i++){await b.page.waitForTimeout(100);const r=await b.page.evaluate(()=>{const bl=window.__g84o.find(x=>x.startsWith('bestmove'));if(!bl)return null;const inf=window.__g84o.filter(x=>/^info .* score /.test(x)&&!/ multipv [2-9]/.test(x));const l=inf[inf.length-1]||'';const mm=l.match(/score mate (-?\d+)/),cm=l.match(/score cp (-?\d+)/);return {best:bl.split(' ')[1],mate:mm?+mm[1]:null,cp:cm?+cm[1]:null};});if(r)return r;}return null;}
// Play one white move by tapping, then wait for the app's answer (the note stops saying the king is thinking).
async function tapMove(b,E,g,m){const [f,t]=sqs(E,m);await b.move(f,t,150);let n='';for(let i=0;i<60;i++){n=(await D.noteText(b))||'';if(!/thinking/.test(n))break;await b.page.waitForTimeout(150);}await b.settle(150);return n;}
async function openPractice(b){await D.openLesson(b,'Endgames',/^Two Bishops Mate$/);await D.startDemoPaused(b);const dm=await b.metrics();await D.toEnd(b);await D.tapBtn(b,/^✋ Now I'll try it$/,700);return dm.board?dm.board.w:null;}
// Drive the rest of the game with the gate's engine; returns {mated, moves, replies:[{ply,san}], refused}
async function driveToMate(b,E,g0,startPly,opts){
  let g=g0,ply=startPly,refused=0,last='';const replies=[];const o=opts||{};
  for(let k=0;k<55;k++){
    if(o.beforeMove){const r=await o.beforeMove(g);if(r&&r.g){g=r.g;}}
    const r=await sfGo(b,E.toFEN(g),400);const mv=r&&E.getLegal(g).find(x=>uciOf(E,x)===r.best);if(!mv)return {mated:false,why:'no engine move',ply,replies,refused,last};
    last=await tapMove(b,E,g,mv);
    if(/checkmate/.test(last))return {mated:true,ply:ply+1,replies,refused,last};
    if(/^✗/.test(last)){refused++;if(refused>3)return {mated:false,why:'refused 4 engine moves',ply,replies,refused,last};continue;}
    g=E.makeMove(g,mv);ply++;
    const rs=(last.match(/answers (\S+?)\./)||[])[1];const rm=rs&&bySan(E,g,rs);if(!rm)return {mated:false,why:'no defender reply read from "'+last+'"',ply,replies,refused,last};
    replies.push({ply,san:sanOf(E,g,rm)});g=E.makeMove(g,rm);ply++;
  }
  return {mated:false,why:'55 moves without mate',ply,replies,refused,last};
}

L.run(async()=>{
  // ════════ TC-LS-054: the net test, no browser ════════
  const X=freeHelpers();
  L.say(!!X.H,'TC-LS-054 PRECONDITION chess.jsx declares freeHangs, freeSyncVerdict, freeNetVerdict and freeFallbackReply'+(X.md5?' (source '+X.md5+')':''),X.missing||null);
  if(X.H){const {H,E}=X;
    const start=E.fromFEN('8/8/4k3/8/3BK3/8/4B3/8 w - - 0 1');
    const after=(fen,san)=>{const g=E.fromFEN(fen);const m=bySan(E,g,san);return m?E.makeMove(g,m):null;};
    const vSt=H.freeSyncVerdict(after('k7/8/1K6/8/8/8/8/2B1B3 w - - 0 1','Bf4'));
    const vHang=H.freeSyncVerdict(after(E.toFEN(start),'Bf6'));
    const vOk=H.freeSyncVerdict(after(E.toFEN(start),'Be5'));
    L.say(vSt.ok===false&&vSt.why==='stalemate','TC-LS-054 a stalemating move (Ka8, Kb6, Bc1 Be1: Bf4) is refused as stalemate, with no engine',vSt);
    L.say(vHang.ok===false&&vHang.why==='hangs'&&vHang.sq==='f6'&&vHang.t==='b','TC-LS-054 Bf6 from the start, where the king takes it, is refused and names the bishop on f6',vHang);
    L.say(vOk.ok===true&&!vOk.mate,'TC-LS-054 the book move Be5 (defended by the king) passes the engine-free check',vOk);
    const mk=(K,mate,cp)=>H.freeNetVerdict(K,{mate,cp});
    const cases=[
      [mk(4,-8,null),false,'looser','mate in 4 -> mate in 8 (a rise of 4)'],
      [mk(4,-7,null),false,'looser','mate in 4 -> mate in 7 (a rise of 3, the first refused)'],
      [mk(4,-6,null),true,null,'mate in 4 -> mate in 6 (a rise of 2: the slack, accepted)'],
      [mk(10,-11,null),true,null,'mate in 10 -> mate in 11 (Stockfish\'s own d5d6 at 300 ms)'],
      [mk(4,-3,null),true,null,'mate in 4 -> mate in 3 (the best move)'],
      [mk(5,null,-900),false,'lost-mate','mate in 5 -> no mate seen (+9.00)'],
      [mk(9,null,-900),true,null,'mate in 9 -> no mate seen (+9.00): too deep to read as a release'],
      [mk(null,null,-50),false,'not-winning','no mate, +0.50: no longer winning'],
      [mk(null,null,-500),true,null,'no mate, +5.00: still winning']];
    for(const [v,ok,why,what] of cases)L.say(v.ok===ok&&(ok||v.why===why),'TC-LS-054 freeNetVerdict '+what+' -> '+(ok?'accepted':'refused ('+why+')'),v);
    const ne=H.freeNetVerdict(4,null);L.say(ne.ok===true&&ne.M===4,'TC-LS-054 with no engine score the verdict accepts and keeps the last mate distance',ne);
    // With no engine the defender's reply is the legal king move nearest the centre: from 5k2/8/8/8/3BK3/8/4B3/8 b (Kf8, free to come
    // in) it must step to e7 (its legal moves are e8, g8, e7 and f7; e7 is the one nearest the centre).
    const gf=E.fromFEN('5k2/8/8/8/3BK3/8/4B3/8 b - - 0 1');const fb=H.freeFallbackReply(gf);
    L.say(!!fb&&uciOf(E,fb)==='f8e7','TC-LS-054 with no engine the defender king steps toward the centre (Kf8 -> Ke7)',fb&&uciOf(E,fb));
  }
  {const LP=process.env.CT_LESSONS||path.join(ROOT,'lessons.js');let C=null;try{const ctx={};new Function('window',fs.readFileSync(LP,'utf8'))(ctx);C=ctx.CTLESSONS;}catch(e){C=null;}
   const all=C?[].concat(C.OPENINGS||[],C.ENDGAMES||[],C.MORE||[]):[];const free=all.filter(o=>o&&o.defender!=null).map(o=>o.name+'='+o.defender);
   L.say(all.length>100,'TC-LS-054 PRECONDITION lessons.js loads ('+all.length+' lessons)');
   L.say(free.length===1&&free[0]==='Two Bishops Mate=free','TC-LS-054 Two Bishops Mate is the one lesson with a free defender, and no other lesson changes format',free);}

  // ════════ TC-LS-055: a flawless off-book run to mate, at THE LESSON THREE's three sizes ════════
  const SIZES=[[375,761],[320,568],[390,844]];
  const geos=SIZES.map(([w,h])=>Object.keys(L.GEOS).find(k=>L.GEOS[k].w===w&&L.GEOS[k].h===h&&(w!==375||!!L.GEOS[k].safe)));
  L.say(geos.every(Boolean),'TC-LS-055 PRECONDITION L.GEOS has the three sizes the card names (375x761 with insets, 320x568, 390x844)',geos);
  const E=require('../engine-extract.js');const BOOK=['Be5','Kd7','Kd5','Kc8','Kd6','Kb7','Kc5','Kc8','Bb5','Kb7','Bg3','Kc8','Kb6','Kd8','Bh4+','Kc8','Bf6','Kb8','Ba6','Ka8','Bb7+','Kb8','Be5#'];
  for(const geo of geos.filter(Boolean)){
    const b=await L.launch({geo,name:'g84-free-'+geo});await b.open();L.note(geo+': bundle stamp '+(await b.stamp()));
    const demoW=await openPractice(b);
    await pins(b,geo,'at practice move 1',demoW);
    const t0=(await D.noteText(b))||'';
    L.say(/· move 1\b/.test(t0)&&!/ of \d/.test(t0),'TC-LS-055 '+geo+': the progress text counts moves ("move 1") and not a fixed length ("1 of 12")',t0);
    L.say(!(await b.page.$('[data-ct="lesson-progress"]')),'TC-LS-055 '+geo+': the line-length progress strip is not drawn in this lesson');
    const ok=await sfInit(b);L.say(ok,'TC-LS-055 '+geo+' PRECONDITION the gate\'s own engine is up in the page');
    let g=E.fromFEN('8/8/4k3/8/3BK3/8/4B3/8 w - - 0 1');const p0=await position(b);
    const first=bySan(E,g,'Bc4+');const n1=await tapMove(b,E,g,first);const p1=await position(b);
    L.say(/^✓ Bc4\+/.test(n1)&&p1!==p0,'TC-LS-055 '+geo+': the off-book first move Bc4+ is ACCEPTED (the scripted lesson refused it as "isn\'t the line") and the board moves',{note:n1});
    const rs=(n1.match(/answers (\S+?)\./)||[])[1];g=E.makeMove(g,first);const rm=rs&&bySan(E,g,rs);
    L.say(!!rm,'TC-LS-055 '+geo+': the defender answers with a legal king move of its own ('+(rs||'none')+')',n1);
    if(!rm){await b.close();continue;}
    const replies=[{ply:1,san:sanOf(E,g,rm)}];g=E.makeMove(g,rm);
    await pins(b,geo,'after the first exchange',demoW);
    const R=await driveToMate(b,E,g,2);replies.push(...R.replies);
    const diff=replies.filter(x=>E.cleanSAN(x.san)!==E.cleanSAN(BOOK[x.ply]||''));
    L.say(diff.length>=1,'TC-LS-055 '+geo+': the defender\'s replies are its own - '+diff.length+' of '+replies.length+' differ from the script\'s move at that ply',replies.map(x=>x.ply+':'+x.san).join(' '));
    L.say(R.mated&&R.refused===0,'TC-LS-055 '+geo+': a game that left the book on move 1 still ends in checkmate, with no engine move refused ('+(R.mated?'mate at ply '+R.ply:R.why)+')',R.last);
    L.say(/Flawless/.test(R.last||'')&&(await learnDays(b))===1,'TC-LS-055 '+geo+': the flawless run banks the day whatever its length (ct_learnprog: '+(await learnDays(b))+' day)',R.last);
    await pins(b,geo,'at the mate',demoW);
    if(geo===geos[0])await b.shot('g84-mate-'+geo);
    await b.close();
  }

  // ════════ TC-LS-056: the refusals, at 375x761 ════════
  if(geos[0]){const geo=geos[0];
    const b=await L.launch({geo,name:'g84-refuse-'+geo});await b.open();
    await openPractice(b);await sfInit(b);
    await D.tapBtn(b,/^Hints$/,400);
    const hs=await hintSquares(b);L.say(!!hs&&hs.join(',')==='d4,e5','TC-LS-056 '+geo+': on the book line the hint paints the book move Be5 (d4, e5)',hs);
    await D.tapBtn(b,/^Hints$/,300);
    let g=E.fromFEN('8/8/4k3/8/3BK3/8/4B3/8 w - - 0 1');
    const p0=await position(b);const nh=await tapMove(b,E,g,bySan(E,g,'Bf6'));const ph=await position(b);
    L.say(/^✗ Bf6 leaves your bishop on f6/.test(nh)&&ph===p0,'TC-LS-056 '+geo+': Bf6, where the king takes the bishop, is refused and the board does not move',nh);
    let tested=null;
    const before=async(gg)=>{if(tested)return null;const r=await sfGo(b,E.toFEN(gg),300);if(!r||r.mate==null||r.mate<=0||r.mate>4)return null;
      const K=r.mate;let worst=null;
      for(const m of E.getLegal(gg)){const ng=E.makeMove(gg,m);if(E.getStatus(ng)!=='playing'&&E.getStatus(ng)!=='check')continue;
        let hang=false;for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){const p=ng.board[rr][cc];if(p&&p.c==='w'&&p.t!=='k'&&E.isAttacked(ng.board,rr,cc,'b')&&!E.isAttacked(ng.board,rr,cc,'w'))hang=true;}if(hang)continue;
        const s=await sfGo(b,E.toFEN(ng),250);const M=(s&&s.mate!=null&&s.mate<0)?-s.mate:99;if(!worst||M>worst.M)worst={m,M};}
      tested={K,worst:worst&&{san:sanOf(E,gg,worst.m),M:worst.M}};
      if(!worst||worst.M<K+3){tested.skip=true;return null;}
      const pa=await position(b);const n=await tapMove(b,E,gg,worst.m);const pb=await position(b);tested.note=n;tested.same=pa===pb;return null;};
    const R=await driveToMate(b,E,g,0,{beforeMove:before});
    L.say(!!tested&&!tested.skip,'TC-LS-056 '+geo+' PRECONDITION the run reached mate in 4 or fewer and found a move that loosens it by 3 or more',tested);
    L.say(!!tested&&!tested.skip&&/^✗ .* lets the king out of the net/.test(tested.note||'')&&tested.same,'TC-LS-056 '+geo+': that loosening move ('+(tested&&tested.worst&&tested.worst.san)+', mate in '+(tested&&tested.K)+' -> '+(tested&&tested.worst&&(tested.worst.M===99?'none seen':tested.worst.M))+') is refused and the board does not move',tested&&tested.note);
    L.say(R.mated,'TC-LS-056 '+geo+': after the refusals the run still ends in checkmate ('+(R.mated?'ply '+R.ply:R.why)+')',R.last);
    L.say(/wrong try/i.test(R.last||'')&&(await learnDays(b))===0,'TC-LS-056 '+geo+': a run with a refused move banks nothing (ct_learnprog: '+(await learnDays(b))+' days)',R.last);
    await b.close();
  }
  L.done();
});
