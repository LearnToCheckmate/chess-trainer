// gates/audit/antagonist373-setup372.js  ANTAGONIST #373: the A-13 before-number. The live #372 bundle has no
// data-ct="setup-sheet", so the sheet is the scrolling ancestor of the "Start game" button. Same measure as
// antagonist373-setup.js: how far the Pass & Play sheet overruns at 320x568 and at kunal. Run with CT_APP unset (#372)
// and with the trial bundle for the pair.
'use strict';
const L=require('../lib');const P=require('../drive/play');
L.run(async()=>{
  for(const [tag,geo] of [['se','se'],['kunal','kunal'],['390','390']]){
    const b=await L.launch({geo,name:'ant-setup372-'+tag});await b.open();
    try{await P.states['setup-passplay'](b);await b.settle(300);
      const info=await b.page.evaluate(()=>{const sg=[...document.querySelectorAll('button')].find(x=>/Start game/.test(x.innerText||''));if(!sg)return null;let p=sg.parentElement,sheet=null;while(p&&p!==document.body){const st=getComputedStyle(p);if(st.overflowY==='auto'||st.overflowY==='scroll'){sheet=p;break;}p=p.parentElement;}const bl=[...document.querySelectorAll('div')].find(d=>/^Build #/.test((d.innerText||'').trim())&&d.children.length===0);const r=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {top:Math.round(q.top*10)/10,bottom:Math.round(q.bottom*10)/10};};return {over:sheet?Math.round((sheet.scrollHeight-sheet.clientHeight)*10)/10:null,start:r(sg),build:r(bl),vh:innerHeight,gap:sheet?getComputedStyle(sheet.firstElementChild).gap:null};});
      L.say(!!info&&info.over<=0,tag+': A-13 Pass & Play sheet does not scroll (over '+(info&&info.over)+'; Start game bottom '+(info&&info.start&&info.start.bottom)+', build line bottom '+(info&&info.build&&info.build.bottom)+' of '+b.geo.h+')',info);
      await b.shot('setup372-'+tag+'-passplay');
    }catch(e){L.say(false,tag+': threw',String(e).slice(0,160));}
    await b.close();
  }
},'ANT-SETUP372');
