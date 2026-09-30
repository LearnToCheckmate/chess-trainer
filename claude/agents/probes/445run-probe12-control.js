'use strict';
const L=require(__dirname+'/../../../gates/lib');
// NEGATIVE CONTROL for gate 12 line 19 ("hint text not clipped", sh<=ch+1).
// Lengthen ONLY the hint text in the DOM and re-read the instrument.
// If sh<=ch+1 still passes while ink is demonstrably lost, the assertion cannot fail.
L.run(async()=>{
  for(const geo of ['kunal','se']){
    const b=await L.launch({geo,name:'p12c-'+geo});await b.open();
    await b.card('A-06',350); await b.settle(1800);
    const out=await b.page.evaluate(()=>{
      const h=document.querySelector('[data-ct="pz-hint-head"]');
      if(!h) return null;
      const lh=parseFloat(getComputedStyle(h).lineHeight);
      const read=label=>{
        const rg=document.createRange(); rg.selectNodeContents(h);
        const ir=rg.getBoundingClientRect(); const r=h.getBoundingClientRect();
        return {label, chars:(h.innerText||'').trim().length,
          sh:h.scrollHeight, ch:h.clientHeight,
          gate19:h.scrollHeight<=h.clientHeight+1?'PASS':'FAIL',
          boxH:+r.height.toFixed(2), inkH:+ir.height.toFixed(2),
          inkLines:+(ir.height/lh).toFixed(2),
          boxLines:+(h.clientHeight/lh).toFixed(2),
          inkBottomPastBox:+(ir.bottom-r.bottom).toFixed(2)};
      };
      const rows=[read('as shipped')];
      const orig=h.textContent;
      const one="It's mate in 2 - start with the most forcing check.";
      for(const [lab,mult] of [['2x text',2],['4x text',4],['8x text',8]]){
        h.textContent='\u{1F4A1} '+Array(mult).fill(one).join(' ');
        rows.push(read(lab));
      }
      h.textContent=orig;
      return {lh, rows};
    });
    console.log('\n=== '+geo+'  (lineHeight '+out.lh+'px) ===');
    for(const r of out.rows){
      console.log('  '+r.label.padEnd(11)+' chars='+String(r.chars).padStart(4)
        +'  box='+r.boxH+'px ('+r.boxLines+' lines)  ink='+r.inkH+'px ('+r.inkLines+' lines)'
        +'  scrollH='+r.sh+' clientH='+r.ch
        +'  ink past box bottom='+r.inkBottomPastBox+'px'
        +'   GATE12-L19='+r.gate19);
    }
    await b.close();
  }
},'P12C');
