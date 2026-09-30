// PROBE: is gate 12's 350ms baseline the unsettled frame?
// Samples the puzzle board rect and the hint header every 50ms after the card click,
// so the 350ms sample gate 12 uses can be compared to the settled value.
'use strict';
const L=require(__dirname+'/../../../gates/lib');
L.run(async()=>{
  for(const geo of ['kunal','390','se']){
    const b=await L.launch({geo,name:'probe12-'+geo});await b.open();
    // reproduce b.card('A-06') up to the click, then sample ourselves
    await b.home();
    const gb=b.page.locator('button[title="Preview gallery (dev)"]');
    await gb.waitFor({state:'visible',timeout:8000});await gb.click();
    await b.page.waitForTimeout(400);
    const c=b.page.locator('button',{hasText:new RegExp('^\\d+ · A-06 · ')}).first();
    await c.waitFor({state:'visible',timeout:8000});await c.click();
    const samples=[];
    for(let t=50;t<=2200;t+=50){
      await b.page.waitForTimeout(50);
      const s=await b.page.evaluate(()=>{
        const gr=[...document.querySelectorAll('div')]
          .filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''))
          .map(e=>e.getBoundingClientRect()).sort((a,b)=>b.width-a.width)[0];
        const h=document.querySelector('[data-ct="pz-hint-head"]');
        const hr=h?h.getBoundingClientRect():null;
        return {top:gr?+gr.top.toFixed(2):null,w:gr?+gr.width.toFixed(2):null,
                hint:!!h, htext:h?(h.innerText||'').trim().length:0,
                hh:hr?+hr.height.toFixed(2):null};
      });
      samples.push([t,s]);
    }
    const at=ms=>{const f=samples.find(([t])=>t>=ms);return f?f[1]:null;};
    const last=samples[samples.length-1][1];
    const a350=at(350), a700=at(700);
    console.log('\n=== '+geo+' ===');
    console.log('  at 350ms (gate 12 baseline): top='+(a350&&a350.top)+' w='+(a350&&a350.w)+' hint='+(a350&&a350.hint)+' hintTextLen='+(a350&&a350.htext));
    console.log('  at 700ms                   : top='+(a700&&a700.top)+' w='+(a700&&a700.w)+' hint='+(a700&&a700.hint)+' hintTextLen='+(a700&&a700.htext));
    console.log('  settled (2200ms)           : top='+last.top+' w='+last.w+' hint='+last.hint+' hintTextLen='+last.htext+' hintH='+last.hh);
    // when does the board top stop changing?
    let firstStable=null;
    for(let i=0;i<samples.length;i++){
      const v=samples[i][1].top;
      if(v==null) continue;
      if(samples.slice(i).every(([,s])=>s.top!=null&&Math.abs(s.top-last.top)<0.6)){firstStable=samples[i][0];break;}
    }
    console.log('  board top first reaches its final value at: '+firstStable+'ms  (final '+last.top+')');
    const firstHint=samples.find(([,s])=>s.hint);
    console.log('  hint header first present at: '+(firstHint?firstHint[0]+'ms':'never'));
    const tops=[...new Set(samples.map(([,s])=>s.top).filter(v=>v!=null))];
    console.log('  distinct board tops observed: '+JSON.stringify(tops));
    console.log('  GATE12 WOULD COMPARE: |'+(a350&&a350.top)+' - '+last.top+'| = '+(a350&&a350.top!=null?Math.abs(a350.top-last.top).toFixed(2):'?')+'  (threshold 0.6)');
    await b.close();
  }
},'PROBE12');
