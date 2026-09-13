// gates/audit/antagonist373-setup372c.js  ANTAGONIST #373: the A-13 before/after pair for the setup sheet's TALLER
// variants (Computer + Viktor + Black + 1 min, and Online), which the gate never measured. Bundle-agnostic measure:
// the sheet is the scrolling ancestor of the "Start game" button (#372 has no data-ct="setup-sheet"). Run with CT_APP
// unset (the pinned #372) and with CT_APP=app.js (#373) for the pair, at kunal / se / 430.
'use strict';
const L=require('../lib');const P=require('../drive/play');
const measure=(b)=>b.page.evaluate(()=>{const sg=[...document.querySelectorAll('button')].find(x=>/Start game|Find a game|Play online|Start/.test(x.innerText||''));const bl=[...document.querySelectorAll('div')].find(d=>/^Build #/.test((d.innerText||'').trim())&&d.children.length===0);let p=(sg||bl)&&(sg||bl).parentElement,sheet=null;while(p&&p!==document.body){const st=getComputedStyle(p);if(st.overflowY==='auto'||st.overflowY==='scroll'){sheet=p;break;}p=p.parentElement;}const r=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {top:Math.round(q.top*10)/10,bottom:Math.round(q.bottom*10)/10};};return {over:sheet?Math.round((sheet.scrollHeight-sheet.clientHeight)*10)/10:null,start:r(sg),startText:sg&&(sg.innerText||'').trim().slice(0,20),build:r(bl),vh:innerHeight,gap:sheet?getComputedStyle(sheet.firstElementChild).gap:null};});
L.run(async()=>{
  const stamp=[];
  for(const [tag,geo] of [['kunal','kunal'],['se','se'],['430','430']]){
    const b=await L.launch({geo,name:'ant-setup372c-'+tag});await b.open();stamp[0]=await b.stamp();
    try{await P.states['setup-bot-viktor'](b);await P.tapBtn(b,/^Black$/,250);try{await b.tapText(/^1 min$/,{wait:250});}catch(e){}await P.scrollSheetTop(b);await b.settle(300);
      const info=await measure(b);L.say(!!info&&info.over<=0,tag+' '+stamp[0]+': A-13 Computer+Viktor+Black+1min sheet does not scroll (over '+(info&&info.over)+'; Start game bottom '+(info&&info.start&&info.start.bottom)+', build line bottom '+(info&&info.build&&info.build.bottom)+' of '+b.geo.h+')',info);
    }catch(e){L.say(false,tag+': computer threw',String(e).slice(0,160));}
    try{await P.states['setup-online'](b);await b.settle(300);
      const info=await measure(b);L.say(!!info&&info.over<=0,tag+' '+stamp[0]+': A-13 Online sheet does not scroll (over '+(info&&info.over)+'; build line bottom '+(info&&info.build&&info.build.bottom)+' of '+b.geo.h+')',info);
    }catch(e){L.say(false,tag+': online threw',String(e).slice(0,160));}
    await b.close();
  }
},'ANT-SETUP372C');
