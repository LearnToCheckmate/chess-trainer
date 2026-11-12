'use strict';
// gates/regress/140-messages-move-nothing.js - A MESSAGE APPEARING OR GOING MOVES NOTHING, AND THE SHORT PHONES' PUZZLE BOARD IS FULL WIDTH.
// US-R148 / TC-R216a..d.
//
// WHY [#550, run-answers build__1794388896663-a42, Kunal 12 Nov: "The rule is the board should be maximized every time ... We can do the
// overlays, right? Where the tactics come up and then disappear ... make sure the board is maximized and there are no jumps on the page";
// the orchestrator's ruling: "no box keeps a fixed amount of space for text that comes and goes ... with a gate that a message appearing or
// going moves nothing on the page"]. On a short upright phone the Puzzles screen kept a 30px box under the card for the verdict and a row of
// motif/level chips, so the board was 288 of 320 at 320x568 (277 after the round-7 fix). Now the chips live behind the Hint, a wrong-move or
// step note shows over the top of the board and fades, and the explanation after a solve shows over the bottom of the board until tapped.
// WHAT IT READS: the bundle under test (CT_APP), Puzzles training (gates/drive/puzzles.js states train, train-hint, train-fail, train-step1,
// train-solved, and the fail note 3.5s later) and the mistakes drill (a seeded card: Hint, a wrong move, the solve), at kunal761, 375x667
// and 320x568. For each state it records the board's rect, every visible button's rect, and the app scroller's overflow.
// WHAT IT ASSERTS: (a) in every state the board's rect, and the top and height of every button that is in both states, are what they were at the start, to 0.5px;
// (b) nothing scrolls; (c) at 320x568 and 375x667 the Puzzles board is the full width (>= viewport - 1); (d) the short-screen note is an
// overlay that is gone 3.5s after a wrong move, and the motif is in the hint text.
// CONTROL-RECORD: c5e038e 2026-11-12 total=81 red=5 scope=trial:0b494f6c50db how=#550 the tree before a42's overlays (t140): the 320x568 board is 277 (TC-R216c) and at both short sizes the wrong-move note is in its reserved box, not an overlay, and the hint carries no motif (TC-R216d x2 each); TC-R216a/b stay green there because the reserved box never moved either - they guard the overlays from bringing a jump, and are named, not credited, as controlled by this record; on t141 b35a3777 81/0
// KNOW ITS LIMIT: Puzzles and the mistakes drill; Tactics and lessons are gate 139's (the formatting standard) and Play's hint is gate 130's.
const L=require('../lib');const Z=require('../drive/puzzles');
const GEOS=[['kunal761','kunal761'],[{w:375,h:667,safe:'',label:'375x667'},'375x667'],['se','320x568']];
const snap=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  const R=(e)=>{const r=e.getBoundingClientRect();return [Math.round(r.left*10)/10,Math.round(r.top*10)/10,Math.round(r.width*10)/10,Math.round(r.height*10)/10];};
  const btn={};[...document.querySelectorAll('button')].forEach(x=>{const r=x.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return;if(getComputedStyle(x).visibility==='hidden')return;
    const k=(x.getAttribute('aria-label')||x.innerText||'').replace(/\s+/g,' ').trim().slice(0,24);if(k&&!(k in btn))btn[k]=R(x);});
  const root=document.getElementById('root');const ov=document.querySelector('[data-ct="pz-overlay"]');
  return {board:g?R(g):null,btn,scroll:root?root.scrollHeight-root.clientHeight:null,vw:innerWidth,ov:ov&&getComputedStyle(ov).display!=='none'?{txt:ov.innerText,op:+getComputedStyle(ov).opacity}:null,hintHead:(document.querySelector('[data-ct="pz-hint-head"]')||{}).innerText||''};});
function same(a,b){const out=[];if(!a.board||!b.board)return ['no board'];for(let i=0;i<4;i++)if(Math.abs(a.board[i]-b.board[i])>0.5)out.push('board '+JSON.stringify(a.board)+' -> '+JSON.stringify(b.board));
  for(const k of Object.keys(a.btn))if(k in b.btn){if(Math.abs(a.btn[k][1]-b.btn[k][1])>0.5||Math.abs(a.btn[k][3]-b.btn[k][3])>0.5)out.push('"'+k+'" '+JSON.stringify(a.btn[k])+' -> '+JSON.stringify(b.btn[k]));}return [...new Set(out)];}
/* buttons are compared on their TOP and HEIGHT: a jump is a vertical move. After a solve Next widens across its own row (the chevron becomes the
   row's main button) by design; its top and height hold, which is what this reads. */
L.run(async()=>{
  for(const [geo,tag] of GEOS){
    const shot={};
    for(const st of ['train','train-hint','train-fail','train-step1','train-solved']){
      const b=await L.launch({geo,name:'msg140'});await b.open();let ok=true;try{await Z.states[st](b);}catch(e){ok=false;L.note(tag+' '+st+': '+String(e).slice(0,120));}await b.settle(250);
      shot[st]=ok?await snap(b):null;
      if(st==='train-fail'&&ok){await b.page.waitForTimeout(3500);shot['train-fail-later']=await snap(b);}
      L.say(b.errs.length===0,tag+': TC-R216 '+st+' zero app errors',b.errs.slice(0,3));await b.close();}
    const base=shot['train'];
    L.say(!!base&&!!base.board,tag+': TC-R216 PRECONDITION Puzzles training opened with a board ('+(base&&JSON.stringify(base.board))+')',base&&base.board);
    for(const st of ['train-hint','train-fail','train-fail-later','train-step1','train-solved']){const s=shot[st];if(!base||!s){L.say(false,tag+': TC-R216a '+st+' could not be measured',null);continue;}
      const d=same(base,s);L.say(d.length===0,tag+': TC-R216a Puzzles '+st+': the board and every button stay where they were ('+(d.length?d.slice(0,3).join('; '):'none moved')+')',d);
      L.say(s.scroll!=null&&s.scroll<=0,tag+': TC-R216b Puzzles '+st+': nothing scrolls ('+s.scroll+')',s.scroll);}
    if(tag!=='kunal761'){
      L.say(!!base&&base.board[2]>=base.vw-1,tag+': TC-R216c the Puzzles board is the full width ('+(base&&base.board[2])+' of '+(base&&base.vw)+'; it was 277 at 320x568 and 375 at 375x667)',base&&base.board);
      const f=shot['train-fail'],fl=shot['train-fail-later'];
      L.say(!!f&&!!f.ov&&/^✗/.test(f.ov.txt),tag+': TC-R216d PRECONDITION the wrong-move note shows as an overlay ("'+(f&&f.ov?f.ov.txt:'none')+'")',f&&f.ov);
      L.say(!!fl&&(!fl.ov||fl.ov.op<0.05),tag+': TC-R216d the note is gone 3.5s later (opacity '+(fl&&fl.ov?fl.ov.op:'no overlay')+')',fl&&fl.ov);
      const h=shot['train-hint'];L.say(!!h&&/Back-rank mate/.test(h.hintHead),tag+': TC-R216d the motif lives behind the Hint ("'+(h?h.hintHead.slice(0,80):'')+'")',h&&h.hintHead);}
  }
  // the mistakes drill: the same rule, on a seeded card (marked already re-graded, so the a41 pass leaves it)
  const card={fen:'r5k1/3r1p1p/3p2pP/pp1Pp3/4R3/5N2/Pn3PP1/1R4K1 b - - 0 1',uci:'b2a4',label:'Mistake',played:'Nd3',ts:1791000000000,last:null,wc:{g:'Mistake',drop:20}};
  for(const [geo,tag] of GEOS){
    const b=await L.launch({geo,name:'msg140d',store:{ct_mymistakes:[card],ct_pool:'3'}});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(900);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(700);}catch(e){ok=false;}
    const s0=ok?await snap(b):null;L.say(!!s0&&!!s0.board,tag+': TC-R216 PRECONDITION the mistakes drill opened with a board',s0&&s0.board);
    const steps=[['hint',async()=>{const h=b.page.locator('button[aria-label="Hint"]:visible');if(await h.count())await h.first().click({timeout:4000});await b.settle(700);}],
      ['wrong move',async()=>{await b.move('b2','c4',1200);await b.settle(900);}],['solve',async()=>{await b.move('b2','a4',1500);await b.settle(900);}]];
    for(const [nm,fn] of steps){if(!s0){L.say(false,tag+': TC-R216a drill '+nm+' not reached',null);continue;}try{await fn();}catch(e){L.note(tag+' drill '+nm+': '+String(e).slice(0,100));}
      const s=await snap(b);const d=s.board&&s0.board?[0,1,2,3].filter(i=>Math.abs(s.board[i]-s0.board[i])>0.5):['no board'];
      L.say(d.length===0,tag+': TC-R216a mistakes drill after '+nm+': the board stays where it was ('+JSON.stringify(s0.board)+' -> '+JSON.stringify(s.board)+')',{was:s0.board,now:s.board});
      L.say(s.scroll!=null&&s.scroll<=0,tag+': TC-R216b mistakes drill after '+nm+': nothing scrolls ('+s.scroll+')',s.scroll);}
    L.say(b.errs.length===0,tag+': TC-R216 mistakes drill zero app errors',b.errs.slice(0,3));await b.close();}
},'140-messages-move-nothing');
