// gates/audit/antagonist373-setup.js  ANTAGONIST #373: A-13 (Play setup sheet fits on short screens). The gate
// measured Pass & Play at kunal and 390 only. Here: 320x568, 430x932, landscape 844x390, kunal, and the taller
// variant (Computer + Viktor + Black + 1 min), which the gate skipped.
'use strict';
const L=require('../lib');const P=require('../drive/play');
const GEOS=[['se','se'],['kunal','kunal'],['430','430'],['land',{w:844,h:390,safe:'',label:'844x390 landscape'}]];
async function measure(b,tag,label){
  const setup=await b.rect('[data-ct="setup-sheet"]');
  const info=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');if(!s)return null;const p=s.parentElement;const st=getComputedStyle(s);const gap=st.gap||st.rowGap;const bl=[...document.querySelectorAll('div')].find(d=>/^Build #/.test((d.innerText||'').trim())&&d.children.length===0);const sg=[...document.querySelectorAll('button')].find(x=>/Start game/.test(x.innerText||''));const r=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {top:Math.round(q.top*10)/10,bottom:Math.round(q.bottom*10)/10,h:Math.round(q.height*10)/10};};const cap=[...document.querySelectorAll('div,span')].find(d=>/Point at a board/.test((d.innerText||'').trim())&&d.children.length===0);return {gap,blMargin:bl?getComputedStyle(bl).marginTop:null,parentOver:Math.round((p.scrollHeight-p.clientHeight)*10)/10,sheetOver:Math.round((s.scrollHeight-s.clientHeight)*10)/10,build:r(bl),start:r(sg),caption:r(cap),vh:innerHeight,docScroll:document.documentElement.scrollHeight-document.documentElement.clientHeight};});
  const vh=b.geo.h;
  L.say(!!info&&info.parentOver<=0&&info.sheetOver<=0,tag+': A-13 '+label+' does not scroll (parent over '+(info&&info.parentOver)+', sheet over '+(info&&info.sheetOver)+')',info&&{gap:info.gap,blMargin:info.blMargin});
  L.say(!!info&&!!info.start&&info.start.bottom<=vh+0.5&&info.start.top>=0,tag+': A-13 '+label+' Start game on screen (bottom '+(info&&info.start&&info.start.bottom)+' of '+vh+')');
  L.say(!!info&&!!info.build&&info.build.bottom<=vh+0.5,tag+': A-13 '+label+' build line on screen (bottom '+(info&&info.build&&info.build.bottom)+' of '+vh+')',info&&info.build);
  L.note(tag+': '+label+' sheet '+JSON.stringify(setup&&{y:Math.round(setup.y),h:Math.round(setup.h)})+' caption '+JSON.stringify(info&&info.caption));
  await b.shot('setup-'+tag+'-'+label.replace(/[^a-z0-9]+/gi,'-'));
  return info;
}
L.run(async()=>{
  for(const [tag,geo] of GEOS){
    const b=await L.launch({geo,name:'ant-setup-'+tag});await b.open();
    try{await P.states['setup-passplay'](b);await b.settle(300);await measure(b,tag,'Pass & Play');}catch(e){L.say(false,tag+': Pass & Play setup threw',String(e).slice(0,150));}
    try{await P.states['setup-bot-viktor'](b);await P.tapBtn(b,/^Black$/,250);try{await b.tapText(/^1 min$/,{wait:250});}catch(e){}await P.scrollSheetTop(b);await b.settle(300);await measure(b,tag,'Computer Viktor Black 1min');}catch(e){L.say(false,tag+': Computer setup threw',String(e).slice(0,150));}
    try{await P.states['setup-online'](b);await b.settle(300);await measure(b,tag,'Online');}catch(e){L.say(false,tag+': Online setup threw',String(e).slice(0,150));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-SETUP');
