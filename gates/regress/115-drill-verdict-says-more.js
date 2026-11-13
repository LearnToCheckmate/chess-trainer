'use strict';
// gates/regress/115-drill-verdict-says-more.js - A DRILL EXPLANATION THAT RUNS PAST ITS BOX SAYS SO AND SCROLLS; THE BOX AND BOARD KEEP THEIR SIZE. TC-R193a..c, US-R126.
//
// WHY [#550, AUD-R13 of docs/app-audit-2026-11-11 (P1), via jobs/app-audit-findings-2026-11-11]: on the brilliant-moves drill, solved, the
// explanation was cut after a line and a half inside a box that scrolls with nothing saying so. Kunal's ruling on this box (gate 50):
// "Don't change the size just allow the player to scroll through the text" - so the box keeps its size and now SAYS there is more: a fade
// at its foot and a '▾ more' chip that scrolls it.
// WHAT IT ASSERTS, a one-card brilliant drill with a long explanation, solved, at kunal761 and se:
//  (a) TC-R193a the explanation runs past its box (DENOMINATOR) and the '▾ more' chip is on screen, inside the box, 28px or taller.
//  (b) TC-R193b a tap on the chip scrolls the explanation (scrollTop rises).
//  (c) TC-R193c solving did not move the board (same width and top as before the move).
// CONTROL-RECORD: b443dd8 2026-11-11 total=11 red=4 scope=trial:e2b242330e84 how=#550 AUD-R13: the tree before the more chip (the round-3 fixes without it) - TC-R193a and TC-R193b red at kunal761 and se; the denominator, TC-R193c and the error lines green
// CONTROL-RECORD: 359de94 2026-11-13 total=11 red=2 scope=trial:aee112168086 how=#550 jobs/brilliant-drill-explanation-is-never-fully-readable-on-kunals-phone-2026-11-13: TC-R193b re-pointed from 'the tap scrolls' to 'one tap shows every line'; the tip bundle scrolls by part of the box, so TC-R193b is red at kunal761 and se, the rest green; on t4 28bf2e8d6190 11/0
const L=require('../lib');
const WHY='You gave up the queen to open the long diagonal, and the bishop then mates on h7 because the king has no square left and nothing can block the check in time.';
L.run(async()=>{
  for(const geo of ['kunal761','se']){
    const rows=[{fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Brilliant',played:'Kd1',ts:1791000000000,last:null,why:WHY,hint:'look up the file'}];
    const b=await L.launch({geo,name:'drill-more-'+geo,store:{ct_mybrilliancies:rows,ct_bril_reset_v1:'1',ct_pool:'3'}});await b.open();
    let ok=true;try{await b.tile('Review');await b.settle(700);await b.tapText(/can you spot them again\?/,{wait:1500});await b.settle(800);}catch(e){ok=false;L.note(geo+': '+String(e).slice(0,100));}
    const bd0=ok?await b.board():null;if(ok){await b.move('b2','b7',1500);await b.settle(1200);}
    const m=await b.page.evaluate(()=>{const v0=document.querySelector('[data-ct="pz-msg"]');const v=(v0&&v0.querySelector('[data-ct="pz-msg-text"]'))||v0;const c=document.querySelector('[data-ct="pz-msg-more"]');if(!v)return null;const r=v0.getBoundingClientRect(),cr=c&&c.getBoundingClientRect();return {sh:v.scrollHeight,ch:v.clientHeight,st:v.scrollTop,box:[r.top,r.bottom],chip:cr&&{t:cr.top,b:cr.bottom,h:cr.height}};});
    L.say(ok&&!!m&&m.sh>m.ch+1,geo+': TC-R193 DENOMINATOR the solved explanation runs past its box ('+(m&&(m.sh+'/'+m.ch))+')',m);
    L.say(!!m&&!!m.chip&&m.chip.h>=27.5&&m.chip.t>=m.box[0]-0.5&&m.chip.b<=m.box[1]+0.5,geo+': TC-R193a the box says there is more: a "more" chip inside it, a thumb\'s height',m&&m.chip);
    // #550 jobs/brilliant-drill-explanation-is-never-fully-readable-on-kunals-phone-2026-11-13: the tap used to scroll by part of a line (20px
    // against a 21.75 pitch); it now OPENS the explanation whole, so TC-R193b asserts that every line of it is shown after one tap
    let st1=null;if(m&&m.chip){await b.page.locator('[data-ct="pz-msg-more"]').click();await b.settle(400);st1=await b.page.evaluate(()=>{const v0=document.querySelector('[data-ct="pz-msg"]');const v=(v0&&v0.querySelector('[data-ct="pz-msg-text"]'))||v0;if(!v)return null;
      const q=v0.getBoundingClientRect();const g=document.createRange();g.selectNodeContents(v);const L=[...g.getClientRects()].filter(x=>x.width>0.5);return {all:v.scrollHeight<=v.clientHeight+1&&L.every(x=>x.top>=q.top-0.5&&x.bottom<=q.bottom+0.5&&x.bottom<=innerHeight),n:L.length};});}
    L.say(!!st1&&st1.all,geo+': TC-R193b a tap on it shows the whole explanation, every line inside the message and the screen ('+JSON.stringify(st1)+')',{st1});
    const bd1=ok?await b.board():null;
    L.say(!!bd0&&!!bd1&&Math.abs(bd0.w-bd1.w)<0.6&&Math.abs(bd0.y-bd1.y)<0.6,geo+': TC-R193c solving did not move the board ('+(bd0&&bd0.w)+' at '+(bd0&&bd0.y)+')',{bd0,bd1});
    L.say(b.errs.length===0,geo+': TC-R193 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'115-drill-verdict-says-more');
// SELECTOR-OPENED: pz-msg-more reading=presence round 2: the chip must be there and say more; a missing hook is red
// SELECTOR-OPENED: pz-msg-text reading=fallback round 4: falls back to the message box itself
