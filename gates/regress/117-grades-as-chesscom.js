'use strict';
// gates/regress/117-grades-as-chesscom.js - MOVE GRADES AS CHESS.COM GIVES THEM, ON WITH THEIR SWITCH. US-R128 / TC-R196a..h.
//
// WHY [#550 item (20), jobs/reconcile-kevitsch-review-vs-chesscom]: Kunal's answers B9C-GRADE-BEST ("what does chess.com do? Align wiht
// them": Best is the engine's own move and nothing else), B9C-GRADE-GREAT "narrow" ("match to chess.com") and B10-SHIP-ON "on". The rules
// are docs/grade-boundaries-design-2026-11-10's: Forced (one legal move), Great on winning chances (the second line 10 or more worse, not a
// plain recapture, the best line leaving 30 or more), Best only for the engine's move, Miss (the opponent's previous move dropped 12 or
// more, this one 8 or more, the mover still at 20 or more), and the bands 3 / 6 / 10 / 25.
// WHAT IT READS. Blocks A-F are NODE blocks over chess.jsx through gates/engine-extract.js (sfGradePly and classifyMove, the shipped
// functions), each rule asserted on both sides of its line and with the switch off (hist.grades2 false, the old grades). Block Z is a
// BROWSER block over the bundle under test: the New features switch, found by its label.
// CONTROL-RECORD: c33e447 2026-11-11 total=19 red=6 scope=env:CT_SRC=g-def how=GRADES2_DEFAULT false (the old grades) - A1, A2, C1, D3, D4 and E1 red
// CONTROL-RECORD: c33e447 2026-11-11 total=19 red=1 scope=env:CT_SRC=g-bands how=the bands moved to 3 / 8 / 10 / 30 - TC-R196b B1 red alone
// CONTROL-RECORD: c33e447 2026-11-11 total=19 red=1 scope=env:CT_SRC=g-forced how=no Forced in classifyMove - TC-R196c C1 red alone
// CONTROL-RECORD: c33e447 2026-11-11 total=19 red=1 scope=env:CT_SRC=g-recap how=the recapture exclusion removed from Great - TC-R196d D4 red alone
// CONTROL-RECORD: c33e447 2026-11-11 total=19 red=1 scope=env:CT_SRC=g-miss how=Miss with no previous-drop condition - TC-R196e E2 red alone
// CONTROL-RECORD: c33e447 2026-11-11 total=19 red=1 scope=env:CT_SRC=g-prev how=gradeHist never reads the engine's own move as a zero drop - TC-R196f F2 red alone
// CONTROL-RECORD: c33e447 2026-11-11 total=19 red=1 scope=env:CT_SRC=g-book how=Book overrides Forced - TC-R196c C3 red alone
const L=require('../lib');
const E=require('../engine-extract.js');
console.log('117-grades-as-chesscom: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5+' (blocks A-F); bundle '+(process.env.CT_APP||'app.js')+' (block Z)');
const sq=s=>[8-parseInt(s[1],10),'abcdefgh'.indexOf(s[0])];
const mv=(pos,from,to)=>{const [fr,fc]=sq(from),[tr,tc]=sq(to);return E.getLegal(pos).find(m=>m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc&&!m.promo);};
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const grade=(fen,from,to,before,after,ev2,bu,hist)=>{const pos=E.fromFEN(fen),pl=mv(pos,from,to);return pl?E.sfGradePly(pos,pl,before,after,ev2,bu,null,null,1,false,{positions:[pos],i:0,...(hist||{})}).cls.label:null;};

L.run(async()=>{
  // ── A. THE SWITCH AND ITS VERSION ──────────────────────────────────────────────────────────────────────────────────────────
  L.say(E.GRADES2_DEFAULT===true&&E.GRADES2===true,'TC-R196a A1 the item (20) grades are on by default (GRADES2_DEFAULT '+E.GRADES2_DEFAULT+')');
  L.say(E.GRADE_VER===13,'TC-R196a A2 GRADE_VER is 13 by default: rule 3 (3) plus the item (20) grades (10), so every stored review is graded again ('+E.GRADE_VER+')');

  // ── B. THE BANDS: 3 / 6 / 10 / 25, AND BEST IS NEVER A BAND ────────────────────────────────────────────────────────────────
  {const c=(d,t,n,g)=>E.classifyMove(d,t,n,g).label;
   const want=[[0,'Excellent'],[2.99,'Excellent'],[3,'Good'],[5.99,'Good'],[6,'Inaccuracy'],[9.99,'Inaccuracy'],[10,'Mistake'],[24.99,'Mistake'],[25,'Blunder']];
   const bad=want.filter(([d,w])=>c(d,false,20,true)!==w).map(([d,w])=>d+':'+c(d,false,20,true)+'!='+w);
   L.say(bad.length===0,'TC-R196b B1 a move that is not the engine\'s is graded by its drop on 3 / 6 / 10 / 25, and a zero drop is Excellent, not Best',bad);
   L.say(c(0,true,20,true)==='Best'&&c(7,true,20,true)==='Best','TC-R196b B2 the engine\'s own move is Best (whatever the drop reads)');
   L.say(c(0,false,20,false)==='Best'&&c(2,false,20,false)==='Excellent','TC-R196b B3 with the switch off the old bands come back (a zero drop is Best again)');}

  // ── C. FORCED ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {const F='7k/8/8/8/8/8/1q6/K7 w - - 0 1';   // the b2 queen checks a1 and Kxb2 is the only legal move
   L.say(E.getLegal(E.fromFEN(F)).length===1,'TC-R196c C0 PRECONDITION one legal move');
   const g=grade(F,'a1','b2',-800,0,null,'a1b2'),o=grade(F,'a1','b2',-800,0,null,'a1b2',{grades2:false});
   L.say(g==='Forced','TC-R196c C1 the only legal move is Forced ('+g+')');
   L.say(o!=='Forced','TC-R196c C2 with the switch off it is not ('+o+')');
   L.say(E.effCls({label:'Forced'},2,10).label==='Forced','TC-R196c C3 a forced move inside the book plies stays Forced (decided before Book)');}

  // ── D. GREAT, AND THE RECAPTURE ─────────────────────────────────────────────────────────────────────────────────────────────
  {const g=grade(START,'e2','e4',30,30,-500,'e2e4'),b=grade(START,'e2','e4',30,30,0,'e2e4'),l=grade(START,'e2','e4',-800,-800,-2000,'e2e4');
   L.say(g==='Great','TC-R196d D1 the engine\'s move with the second line far worse in winning chances: Great ('+g+')');
   L.say(b==='Best','TC-R196d D2 the second line close: Best ('+b+')');
   L.say(l==='Best','TC-R196d D3 the best line leaves the mover under 30 (lost): no Great ('+l+')');
   const P0=E.fromFEN('3qk3/8/8/3p4/4P3/8/8/4K3 w - - 0 1'),m0=mv(P0,'e4','d5'),P1=E.makeMove(P0,m0),m1=mv(P1,'d8','d5');
   const rc=E.sfGradePly(P1,m1,-50,-50,500,'d8d5',null,null,1,false,{positions:[P0,P1],i:1,prevMove:m0,prevDrop:0}).cls.label;
   const nr=E.sfGradePly(P1,m1,-50,-50,500,'d8d5',null,null,1,false,{positions:[P0,P1],i:1,prevMove:null,prevDrop:0}).cls.label;
   L.say(rc==='Best'&&nr==='Great','TC-R196d D4 a plain recapture (1.exd5 Qxd5) is Best even with the second line far worse; the same move with no capture before it is Great ('+rc+' / '+nr+')');}

  // ── E. MISS ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {const m=grade(START,'e2','e4',0,-100,null,'d2d4',{prevDrop:12}),n=grade(START,'e2','e4',0,-100,null,'d2d4',{prevDrop:11.9}),
     lost=grade(START,'e2','e4',0,-600,null,'d2d4',{prevDrop:30}),o=grade(START,'e2','e4',0,-100,null,'d2d4',{prevDrop:12,grades2:false});
   L.say(m==='Miss','TC-R196e E1 the opponent erred (12) and this move drops about 9 with the mover still near 41: Miss ('+m+')');
   L.say(n==='Inaccuracy','TC-R196e E2 the opponent\'s previous drop 11.9: not a Miss, the band (Inaccuracy) ('+n+')');
   L.say(lost!=='Miss','TC-R196e E3 a move that leaves the mover under 20 is not a Miss ('+lost+')');
   L.say(o!=='Miss','TC-R196e E4 with the switch off the old Miss test reads it ('+o+')');}

  // ── F. THE PREVIOUS PLY, READ FROM THE CACHED EVALUATIONS ─────────────────────────────────────────────────────────────────
  {const P0=E.fromFEN(START),m0=mv(P0,'e2','e4'),P1=E.makeMove(P0,m0);const res={positions:[P0,P1],plies:[{move:m0}]};
   const h1=E.gradeHist(res,[30,-300],['d2d4'],1),h0=E.gradeHist(res,[30,-300],['e2e4'],1);
   L.say(h1.prevMove===m0&&h1.prevDrop>12,'TC-R196f F1 gradeHist: the opponent\'s move and its drop when it was not the engine\'s ('+(h1.prevDrop&&h1.prevDrop.toFixed(2))+')');
   L.say(h0.prevDrop===0,'TC-R196f F2 the same move when it WAS the engine\'s: drop 0, as the review grades it ('+h0.prevDrop+')');}

  // ── Z. THE SWITCH ON THE MENU (bundle under test) ───────────────────────────────────────────────────────────────────────────
  if(!process.env.CT_SRC){
   const b=await L.launch({geo:'kunal761',name:'grades2-switch',store:{}});await b.open();
   const MD=require('../drive/menu');
   const row=async()=>{await MD.states['menu-bottom'](b);await b.settle(400);return b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/^Move grades as chess\.com/.test((e.innerText||'').trim()));if(!x)return null;x.scrollIntoView({block:'center'});const r=x.getBoundingClientRect();return {t:(x.innerText||'').replace(/\s+/g,' ').trim(),x:r.left+r.width/2,y:r.top+r.height/2,key:localStorage.getItem('ct_grades2')};});};
   let r0=null,r1=null,r2=null;try{r0=await row();}catch(e){}
   L.say(!!r0&&/ON$/.test(r0.t)&&r0.key===null,'TC-R196h Z1 on a fresh store the New features section shows the move grades ON (no key stored: the default)',r0);
   if(r0){await b.page.mouse.click(r0.x,r0.y);await b.page.waitForLoadState('domcontentloaded').catch(()=>{});await b.settle(1500);try{r1=await row();}catch(e){}}
   L.say(!!r1&&/OFF$/.test(r1.t)&&r1.key==='0','TC-R196h Z2 a tap turns them OFF: ct_grades2 written 0, the row reads OFF after the reload',r1);
   if(r1){await b.page.mouse.click(r1.x,r1.y);await b.page.waitForLoadState('domcontentloaded').catch(()=>{});await b.settle(1500);try{r2=await row();}catch(e){}}
   L.say(!!r2&&/ON$/.test(r2.t)&&r2.key==='1','TC-R196h Z3 a second tap turns them back ON (written 1)',r2);
   L.say(b.errs.length===0,'TC-R196h Z4 zero app errors',b.errs.slice(0,3));
   await b.close();}
},'117-grades-as-chesscom');
