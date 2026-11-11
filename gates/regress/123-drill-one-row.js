'use strict';
// gates/regress/123-drill-one-row.js - BOTH DRILLS PUT THEIR FIVE CONTROLS ON ONE ROW, SO THE BOARD TAKES THE HEIGHT. US-R131 / TC-R199a..c.
//
// WHY [#550 item (66), jobs/the-mistakes-drill-board-is-not-full-size-2026-11-11, the audit's AUD-R12]: Kunal asked for the mistakes
// drill board edge to edge, as in the brilliant moves drill, with a case on its width at 375x761 and 320x568. MEASURED before the change
// (trial 36531456ced7): Hint, Show move and Reset wrapped onto rows of their own above Prev and Next, so the bottom area took 104px at
// 375x761 and 155 at 320x568, where the board is fitted to height: 192 wide in the mistakes drill and 216 in the brilliant one.
// WHAT IT READS: the bundle under test (CT_APP), each drill entered from the Review screen with three cards (mistakes) or one (brilliant,
// so the library does not open), at kunal761 and 320x568. The board is the widest repeat(8,...) grid; the controls as below.
// KNOW ITS LIMIT: at 320x568 the mistakes drill's goal line runs to three lines, so its board is still fitted to height (288, not 320);
// the brilliant drill's one-line goal leaves it edge to edge. The pins are those measurements, not a claim that every card fills the width.
const L=require('../lib');
const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'];const UCIS=['b2b7','c2c7','d2d7'];
const rows=(label,n)=>FENS.slice(0,n).map((f,i)=>({fen:f,uci:UCIS[i],label,played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file'}));
const DRILLS=[{k:'mistakes',enter:/find the move you missed/,store:{ct_mymistakes:rows('Blunder',3),ct_pool:'3'}},
              {k:'brilliant',enter:/can you spot them again\?/,store:{ct_mybrilliancies:rows('Brilliant',1),ct_bril_reset_v1:'1',ct_pool:'3'}}];
const WANT={kunal761:{mistakes:375,brilliant:375},se:{mistakes:288,brilliant:320}};   // measured on trial 8b141ccb9067
// FOUND BY WHAT EXISTED BEFORE THIS BUILD, NOT BY WHAT IT ADDED (#432): Prev and Next by their data-ct hooks (#475), the helpers by their
// accessible name OR their glyph, because the old row carried only the text ('💡 Hint', '👁 Show move', '↺ Reset'). A finder keyed on the
// names this build added would go red on the old tree for a missing hook rather than for the two rows.
const NAMES=[['Hint','💡'],['Show move','👁'],['Reset','↺'],['drill-prev',null],['drill-next',null]];
L.run(async()=>{
  for(const geo of ['kunal761','se'])for(const d of DRILLS){
    const tag=geo+' '+d.k;const b=await L.launch({geo,name:'drill-row-'+d.k+'-'+geo,store:d.store});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(700);await b.tapText(d.enter,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(900);}catch(e){ok=false;}
    const r=await b.page.evaluate((NAMES)=>{const bd=[...document.querySelectorAll('div')].filter(x=>/repeat\(8,/.test(x.style.gridTemplateColumns||'')).map(x=>x.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const c=NAMES.map(([n,g])=>{const e=g===null?document.querySelector('[data-ct="'+n+'"]'):[...document.querySelectorAll('button')].find(x=>x.getBoundingClientRect().width>0&&(x.getAttribute('aria-label')===n||(x.innerText||'').trim().startsWith(g)));if(!e||!(e.getBoundingClientRect().width>0))return {n,found:false};const q=e.getBoundingClientRect();
        const h=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return {n,found:true,top:Math.round(q.top*10)/10,h:Math.round(q.height*10)/10,w:Math.round(q.width*10)/10,on:q.top>=0&&q.bottom<=innerHeight,self:!!h&&(h===e||e.contains(h)),cut:e.scrollWidth>e.clientWidth+1};});
      return {vw:innerWidth,board:bd?{w:Math.round(bd.width*100)/100,b:Math.round(bd.bottom)}:null,c};},NAMES);
    L.say(ok&&!!r.board&&r.c.every(x=>x.found),'TC-R199 '+tag+' PRECONDITION the drill is open with its board and all five controls',r);
    const tops=r.c.filter(x=>x.found).map(x=>x.top);
    L.say(tops.length===5&&Math.max(...tops)-Math.min(...tops)<=1,'TC-R199a '+tag+' the five controls sit on ONE row (tops '+tops.join(', ')+')',r.c);
    L.say(r.c.every(x=>x.found&&x.h>=43.5&&x.on&&x.self&&!x.cut),'TC-R199b '+tag+' each is at least 44 tall, on screen, takes a tap at its centre, and no label is cut ('+r.c.map(x=>x.n+' '+x.w+'x'+x.h+(x.cut?' CUT':'')).join('; ')+')',r.c);
    const want=WANT[geo][d.k];
    L.say(!!r.board&&Math.abs(r.board.w-want)<=1,'TC-R199c '+tag+' the board is '+(r.board&&r.board.w)+' wide against '+want+(want>=r.vw-0.5?', edge to edge':' (fitted to height under a three-line goal)'),r.board);
    L.say(b.errs.length===0,'TC-R199 '+tag+' zero app errors',b.errs.slice(0,3));
    await b.close();}
},'123-drill-one-row');
