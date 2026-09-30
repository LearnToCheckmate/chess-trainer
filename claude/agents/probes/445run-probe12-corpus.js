'use strict';
const L=require(__dirname+'/../../../gates/lib');
const HINTS=require(__dirname+'/445run-hints-corpus.json');
// Does a REAL hint from the shipped corpus get clamped, and does gate 12 L19 see it?
L.run(async()=>{
  for(const geo of ['kunal','se']){
    const b=await L.launch({geo,name:'p12d-'+geo});await b.open();
    await b.card('A-06',350); await b.settle(1800);
    const rows=await b.page.evaluate((hints)=>{
      const h=document.querySelector('[data-ct="pz-hint-head"]');
      const lh=parseFloat(getComputedStyle(h).lineHeight);
      const orig=h.textContent; const out=[];
      for(const t of hints){
        h.textContent='\u{1F4A1} '+t;
        const rg=document.createRange(); rg.selectNodeContents(h);
        const ir=rg.getBoundingClientRect(); const r=h.getBoundingClientRect();
        // clamped? compare rendered ink lines to what the text would need unclamped
        const probe=document.createElement('div');
        const cs=getComputedStyle(h);
        probe.style.cssText='position:absolute;visibility:hidden;width:'+h.clientWidth+'px;font:'+cs.font+';line-height:'+cs.lineHeight+';white-space:normal;';
        probe.textContent=h.textContent; document.body.appendChild(probe);
        const needLines=Math.round(probe.getBoundingClientRect().height/lh*100)/100;
        probe.remove();
        out.push({chars:t.length, needLines,
          drawnLines:+(ir.height/lh).toFixed(2),
          sh:h.scrollHeight, ch:h.clientHeight,
          gate19:h.scrollHeight<=h.clientHeight+1?'PASS':'FAIL',
          clamped: needLines>3.05,
          txt:t.slice(0,34)});
      }
      h.textContent=orig; return {lh,out};
    },HINTS);
    console.log('\n=== '+geo+' (lineHeight '+rows.lh+'px, clamp 3) ===');
    let cut=0;
    for(const r of rows.out.sort((a,b)=>b.chars-a.chars)){
      const flag=r.clamped?'  <<< CLAMPED, TEXT LOST':'';
      if(r.clamped)cut++;
      console.log('  chars='+String(r.chars).padStart(3)+' needs='+String(r.needLines).padStart(5)+' lines  drawn='+String(r.drawnLines).padStart(5)
        +'  sh/ch='+r.sh+'/'+r.ch+'  GATE12-L19='+r.gate19+flag+'  "'+r.txt+'..."');
    }
    console.log('  >>> '+cut+' of '+rows.out.length+' real hints are CLAMPED at '+geo+', and gate 12 L19 reads PASS on every one of them.');
    await b.close();
  }
},'P12D');
