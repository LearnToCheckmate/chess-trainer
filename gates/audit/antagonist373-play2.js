// gates/audit/antagonist373-play2.js  ANTAGONIST #373 (second pass): A-11 - the EFFECTIVE tap height of Analyze / Copy
// moves, probed pixel by pixel down the button's centre column with elementFromPoint (the negative margin pulls the
// following content over the box's lower part), then confirmed with real clicks; and whether the Home heading that
// shares pixels with the ☰ (A-04) is painted at all. CT_APP picks the bundle, so this runs on #372 for the before-number.
'use strict';
const L=require('../lib');const P=require('../drive/play');
const GEOS=[['se','se'],['kunal','kunal']];
const column=(b,ct)=>b.page.evaluate((id)=>{const e=document.querySelector('[data-ct="'+id+'"]')||[...document.querySelectorAll('button')].find(x=>new RegExp(id==='moves-analyze'?'Analyze':'Copy moves').test(x.innerText||''));if(!e)return null;const r=e.getBoundingClientRect();const cx=r.left+r.width/2;const rows=[];for(let y=Math.floor(r.top)-12;y<=Math.ceil(r.bottom)+12;y++){const t=document.elementFromPoint(cx,y);rows.push(t&&(t===e||e.contains(t))?1:0);}let best=0,cur=0,start=-1,bs=-1;rows.forEach((v,i)=>{if(v){if(!cur)start=i;cur++;if(cur>best){best=cur;bs=start;}}else cur=0;});const y0=Math.floor(r.top)-12;const span=e.querySelector('span');const sr=span?span.getBoundingClientRect():r;return {box:{top:Math.round(r.top*10)/10,h:Math.round(r.height*10)/10},chip:{top:Math.round(sr.top*10)/10,h:Math.round(sr.height*10)/10},effective:best,effTop:y0+bs,effBottom:y0+bs+best-1,map:rows.join('')};},ct);
L.run(async()=>{
  for(const [tag,geo] of GEOS){
    const b=await L.launch({geo,name:'ant-play2-'+tag});await b.open();
    const head=await b.page.evaluate(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(/What do you want/.test(n.nodeValue)){let e=n.parentElement;const st=getComputedStyle(e);let op=1,p=e;while(p&&p!==document.body){op*=parseFloat(getComputedStyle(p).opacity);p=p.parentElement;}const r=e.getBoundingClientRect();return {tag:e.tagName,opacity:op,visibility:st.visibility,color:st.color,fontSize:st.fontSize,clip:st.clip,h:Math.round(r.height),top:Math.round(r.top),w:Math.round(r.width),painted:op>0.01&&st.visibility!=='hidden'&&r.height>0&&!/rgba\(\d+, \d+, \d+, 0\)/.test(st.color)};}}return null;});
    L.say(!!head&&!head.painted,tag+': A-04 the heading whose line box runs under the ☰ is not painted (opacity '+(head&&head.opacity)+', visibility '+(head&&head.visibility)+')',head);
    try{
      await P.states['pp-captures'](b);await b.settle(300);await P.ensureMovesShown(b);await b.settle(300);
      const an=await column(b,'moves-analyze'),cp=await column(b,'moves-copy');
      L.note(tag+': analyze '+JSON.stringify(an)+'\n     '+tag+': copy '+JSON.stringify(cp));
      L.say(!!an&&an.effective>=40&&!!cp&&cp.effective>=40,tag+': A-11 the EFFECTIVE (hit-tested) tap height of Analyze / Copy is >=40px (analyze '+(an&&an.effective)+', copy '+(cp&&cp.effective)+'; box '+(an&&an.box.h)+', chip '+(an&&an.chip.h)+')');
      // real clicks on Copy: at chip bottom + 6 (inside the 43px box, below the chip) and at chip top - 6
      const cr=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-copy"]')||[...document.querySelectorAll('button')].find(x=>/Copy moves/.test(x.innerText||''));const s=e.querySelector('span')||e;const r=s.getBoundingClientRect();return {cx:r.left+r.width/2,top:r.top,bottom:r.bottom};});
      const label=()=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="moves-copy"]')||[...document.querySelectorAll('button')].find(x=>/Copy|Copied/.test(x.innerText||''));return e?(e.innerText||'').trim():null;});
      await b.page.mouse.click(cr.cx,cr.bottom+6);await b.settle(250);const below=await label();await b.settle(2100);
      await b.page.mouse.click(cr.cx,cr.top-6);await b.settle(250);const above=await label();await b.settle(2100);
      await b.page.mouse.click(cr.cx,cr.bottom-3);await b.settle(250);const inside=await label();
      L.say(/Copied/.test(below||'')&&/Copied/.test(above||''),tag+': A-11 real clicks 6px below and 6px above the Copy chip both fire',{below,above,inside});
    }catch(e){L.say(false,tag+': play section threw',String(e).slice(0,160));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-PLAY2');
