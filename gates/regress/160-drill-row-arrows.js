'use strict';
// gates/regress/160-drill-row-arrows.js - THE DRILL CARD'S PREV AND NEXT ARE TWO ARROWS, EACH A 44 TAP TARGET. TC-R114d..f, US-R104.
//
// WHY [#550 helper B; jobs/transport-row-icon-only, whatIsLeft "the drill-card row ... measured", its 2026-09-23 extension; Kunal: "The buttons
// are too big. I think we need more efficient buttons: instead of Review written or Next written, it should just be those arrows that are easy
// to understand, and much smaller buttons, so we have more space for the explanations"]. The drill row carried two labelled pills, '‹ Prev'
// and 'Next ›', each flex 1.25 (about 84 of 375). They are now the two chevrons, 46x44, as on the puzzle row; the header still says where you
// are, which is the job's condition for arrows alone.
// WHAT IT ASSERTS, in both drills (mistakes, brilliant), at 320x568, 375x761 (kunal761) and 390x844 - three widths, as the job's acceptance
// asks:
//  (d) TC-R114d Prev and Next (found by their data-ct hooks from #475, which predate this build) carry no words - only a drawn arrow - and keep
//      their accessible names ('Previous card', 'Next card').
//  (e) TC-R114e each is at least 44x44 and its centre takes a tap; together they are at most 100 wide (two 46 targets and slack), where the
//      pills were 140 to 170.
//  (f) TC-R114f the row's HEIGHT does not grow: drill-row is 44 tall (+-1) - the extension's "height falls or stays equal". MEASURED: it stays
//      44; the freed WIDTH goes to the three helpers, so the job's claim of vertical space is not made here.
// NOT REACHED: the online (Lichess) puzzle card's '↗ Lichess' / 'Next ›' pills need lichess.org, which gates/lib.js blocks; they are unchanged.
// CONTROL-RECORD: c95453c 2026-11-14 total=31 red=12 scope=trial:954186f79f8f how=#550 helper B: the tree before the change (c95453c, built as t5) - '‹ Prev' / 'Next ›' pills 71.5 / 84 / 87.4 wide at 320 / 375 / 390 (TC-R114d and e red at all three widths in both drills, 12); the denominators, TC-R114f (44 tall either way) and error lines green. On m2 (7edf52c583ef) 31 of 31 green
const L=require('../lib');
const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'];const UCIS=['b2b7','c2c7','d2d7'];
const rows=(label,n)=>FENS.slice(0,n).map((f,i)=>({fen:f,uci:UCIS[i],label,played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',...(label==='Brilliant'?{}:{wc:{g:label,drop:25}})}));
const DRILLS=[{k:'mistakes',enter:/find the move you missed/,store:{ct_mymistakes:rows('Blunder',3),ct_pool:'3'}},
              {k:'brilliant',enter:/can you spot them again\?/,store:{ct_mybrilliancies:rows('Brilliant',1),ct_bril_reset_v1:'1',ct_pool:'3'}}];
const GEOS=[['320x568','se'],['375x761','kunal761'],['390x844','390']];
L.run(async()=>{
  for(const [gn,geo] of GEOS)for(const d of DRILLS){const tag=gn+' '+d.k;
    const b=await L.launch({geo,name:'drill-arrows-'+d.k,store:d.store});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(700);await b.tapText(d.enter,{wait:1800});await b.page.locator('[data-ct="drill-row"]').waitFor({state:'visible',timeout:15000});await b.settle(900);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,140));}
    const r=await b.page.evaluate(()=>{const row=document.querySelector('[data-ct="drill-row"]');const one=(ct)=>{const e=document.querySelector('[data-ct="'+ct+'"]');if(!e)return null;const q=e.getBoundingClientRect();
        const h=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return {w:+q.width.toFixed(1),h:+q.height.toFixed(1),txt:(e.innerText||'').replace(/\s+/g,' ').trim(),svg:!!e.querySelector('svg'),al:e.getAttribute('aria-label'),self:!!h&&(h===e||e.contains(h))};};
      return {row:row?+row.getBoundingClientRect().height.toFixed(1):null,prev:one('drill-prev'),next:one('drill-next')};});
    L.say(ok&&!!r.row&&!!r.prev&&!!r.next,'TC-R114d '+tag+' DENOMINATOR the drill row is up with Prev and Next',r);
    if(r.prev&&r.next){
      L.say(r.prev.txt===''&&r.next.txt===''&&r.prev.svg&&r.next.svg&&r.prev.al==='Previous card'&&r.next.al==='Next card','TC-R114d '+tag+' Prev and Next are arrows with no words, named Previous card / Next card (words "'+r.prev.txt+'" / "'+r.next.txt+'")',{prev:r.prev,next:r.next});
      L.say([r.prev,r.next].every(x=>x.w>=43.5&&x.h>=43.5&&x.self)&&r.prev.w+r.next.w<=100,'TC-R114e '+tag+' each is a 44 tap target that takes a tap at its centre, and the two take '+(r.prev.w+r.next.w).toFixed(1)+' of the row ('+r.prev.w+'x'+r.prev.h+', '+r.next.w+'x'+r.next.h+')',{prev:r.prev,next:r.next});
    }
    L.say(r.row!=null&&Math.abs(r.row-44)<=1,'TC-R114f '+tag+' the row is '+r.row+' tall - it does not grow',{row:r.row});
    L.say(b.errs.length===0,'TC-R114 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
},'160-drill-row-arrows');
// SELECTOR-OPENED: drill-row reading=presence #550 test-system helper A, opened by reading and confirmed on m6 46c1c43522a4 (the tip with the six last unopened hooks renamed; tip trial aae17ede75ff green): the entry waits for it and TC-R114d DENOMINATOR and TC-R114f read its rect, so a missing hook reds every column (31/0 -> 7/12)
