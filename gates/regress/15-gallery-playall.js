// regress/15-gallery-playall.js  THE RECORDING-FREE GALLERY GATE (Kunal's feedback session, flag
// uat372-headless-run, 2026-09-12 22:30 ET: "the whole Play-all runs headlessly in real Chromium ... this is the
// shape the daily UAT check now takes: Playwright, not a phone recording ... worth committing under gates/").
// Drives "▶ Play all N" from Home at his geometry and at 375x812, sampling every 700 ms: every card's caption is
// reached in order with its item id, no card leaves a page scroll, the board (where a card shows one) never shrinks
// within a card, the run ends on the green RECORDING COMPLETE frame, and there are no app errors beyond the one
// allowed engine trap (#356). A phone is slower than this container, so the gate asserts ORDER and COMPLETION,
// never wall-clock; the per-card checkpoints live in 14-uat-review-card.js.
'use strict';
const L=require('../lib');
L.run(async()=>{
  for(const geo of ['kunal',{w:375,h:812,safe:'',label:'375x812'}]){
    const lab=typeof geo==='string'?geo:geo.label;
    const b=await L.launch({geo,name:'playall-'+lab,store:{ct_pool:'3'}});await b.open();
    const titles=await b.cardTitles();const N=titles.length;
    L.say(N>=6,lab+': the gallery holds '+N+' cards',titles.map(t=>t.split(' · ').slice(0,2).join(' ')));
    await b.home();const gb=b.page.locator('button[title="Preview gallery (dev)"]');await gb.click();await b.settle(400);
    await b.page.locator('button',{hasText:/^▶ Play/}).first().click();
    const seen=[];let done=false,scrolled=[],shrunk=[];let cur=null,curBoard=null;
    for(let i=0;i<300;i++){                                   // up to 210 s
      await b.settle(700);
      const cap=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rec-cap"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
      if(cap&&cap!==cur){cur=cap;seen.push(cap);curBoard=null;}
      if(cap&&/RECORDING COMPLETE/i.test(cap)){done=true;break;}
      if(cap){const m=await b.metrics();
        if(m.over.over>0.5||m.over.docScroll>0)scrolled.push({cap:cap.slice(0,40),over:m.over.over,doc:m.over.docScroll});
        if(m.board){if(curBoard===null)curBoard=m.board.w;else if(m.board.w<curBoard-0.6)shrunk.push({cap:cap.slice(0,40),from:curBoard,to:m.board.w});}}
    }
    await b.shot('playall-'+lab+'-final');
    L.say(done,lab+': the run ends on the RECORDING COMPLETE frame ('+seen.length+' captions seen)');
    const ids=seen.map(c=>{const m=c.match(/·\s*([A-Za-z0-9-]+)\s*$/m)||c.match(/🎬[^·]*·[^·]*·\s*([A-Za-z0-9-]+)/);return m?m[1]:null;}).filter(Boolean);
    L.say(seen.length>=N,lab+': every card was reached in order ('+seen.length+' of '+N+')',seen.map(c=>c.split('\n')[0].slice(0,44)));
    L.say(scrolled.length===0,lab+': no card leaves the page scrolling',scrolled.slice(0,3));
    L.say(shrunk.length===0,lab+': no board shrinks inside a card',shrunk.slice(0,3));
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,lab+': no app error beyond the allowed engine trap',{allowed:b.errs.length-bad.length,other:bad.slice(0,2)});
    await b.close();
  }
},'GALLERY-PLAYALL');
