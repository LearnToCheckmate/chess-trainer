// gates/audit/class-sweep-430-measure.js   [#547 item (60); jobs/the-class-sweep-sites-430-touched-are-unmeasured-except-one-2026-09-29]
// A PROBE, NOT A GATE: it asserts nothing and prints numbers. #430 swept the negative-margin idiom and touched three sites;
// one (the MOVES chips) was measured live, the other two were counted by READING a clone. This takes the three measurements
// that job left owed, at seven geometries (se, kunal, kunal730, kunal761, 390, 430, short375):
//   (1) the play-setup caption (the div after [data-ct="setup-start"]) against that button;
//   (2) the puzzle pin-error line ('Wrong code.', after a wrong code + Enter on the roadmap) against the unlock row;
//   (3) for each, whether the BOX or the INK (a Range over its text) reaches into the sibling above.
// It also prints hit-test row counts, which read 0/0 when the element is below the fold - the box overlap is the
// figure that decides it, because a box that does not reach the sibling has no rows to steal.
// MEASURED at #547 on trial bundle 5ff7bad830f2 (w187b): every geometry, both sites, overlapPx 0 and inkOverlapPx 0 -
// the caption sits 4px under the button (e.g. 375x730: button 873..921, caption 931..946 after the 6px pull-up), the
// pin error 8px under the unlock row (375x730: row 616..660, line 668..683). Neither site is live anywhere measured;
// #430's pointerEvents:'none' stays, for the reason the job gives (it costs nothing).
// RUN: CT_APP=<bundle> node gates/audit/class-sweep-430-measure.js
const L=require('../lib');const P=require('../drive/play');const Z=require('../drive/puzzles');
// measure an element against its previous sibling: box overlap, and how many of its pixel rows (3 x positions) hit-test to itself vs the sibling
const MEAS=(sel)=>(b)=>b.page.evaluate((sel)=>{const el=typeof sel==='string'?eval(sel):null;if(!el)return null;const prev=el.previousElementSibling;const r=el.getBoundingClientRect(),p=prev?prev.getBoundingClientRect():null;
 let rows=0,self=0,stolen=0,inkRows=0;const xs=[r.left+r.width/3,r.left+r.width/2,r.left+2*r.width/3];
 for(let y=Math.ceil(r.top);y<r.bottom;y++){rows++;let s=0,st=0;for(const x of xs){const h=document.elementFromPoint(x,y);if(h&&(h===el||el.contains(h)))s++;else if(h&&prev&&(h===prev||prev.contains(h)))st++;}if(s)self++;if(st)stolen++;}
 // ink: text range rect rows overlapping the sibling
 const rg=document.createRange();rg.selectNodeContents(el);const ir=rg.getBoundingClientRect();
 return {prevTag:prev&&prev.tagName,prevCt:prev&&prev.getAttribute('data-ct'),box:[Math.round(r.top*10)/10,Math.round(r.bottom*10)/10],prev:p&&[Math.round(p.top*10)/10,Math.round(p.bottom*10)/10],overlapPx:p?Math.round(Math.max(0,p.bottom-r.top)*10)/10:null,ink:[Math.round(ir.top*10)/10,Math.round(ir.bottom*10)/10],inkOverlapPx:p?Math.round(Math.max(0,p.bottom-ir.top)*10)/10:null,rows,self,stolenBySibling:stolen,pe:getComputedStyle(el).pointerEvents};},sel);
(async()=>{const GEOS=['se','kunal','kunal730','kunal761','390','430','short375'];
for(const g of GEOS){const b=await L.launch({geo:g,name:'p60a'});await b.open();await P.states['setup'](b);await b.settle(600);
 const r=await MEAS("document.querySelector('[data-ct=\"setup-start\"]')&&document.querySelector('[data-ct=\"setup-start\"]').nextElementSibling")(b);console.log('CAPTION',g,JSON.stringify(r));await b.close();}
for(const g of GEOS){const b=await L.launch({geo:g,name:'p60b'});await b.open();await Z.states['roadmap'](b);await b.settle(500);
 const inp=b.page.locator('input[placeholder="🔑 Unlock code"]').first();let ok=true;try{await inp.scrollIntoViewIfNeeded();await inp.fill('9');await inp.press('Enter');}catch(e){ok=false;}
 const r=await MEAS("[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/^Wrong code/.test((d.textContent||'').trim()))")(b);console.log('PINERR',g,ok,JSON.stringify(r));await b.close();}})();
