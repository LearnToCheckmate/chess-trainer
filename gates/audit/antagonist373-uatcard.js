// gates/audit/antagonist373-uatcard.js  ANTAGONIST #373: the Review UAT gallery card (card 6, `steps`). The gate ran
// it with ct_pool 3 at kunal. Here the analysis is made SLOW (ct_pool '1', one worker) at kunal, and the default pool
// at 320x568: the strip is sampled every 2 s and each step's caption is checked against the app state 1.5 s after it.
'use strict';
const L=require('../lib');
const STEPS=[{at:52000,id:'US-R03',want:'summary'},{at:58000,id:'US-R04',want:'ply0'},{at:64000,id:'US-R06',want:'ply19'},{at:70000,id:'k12',want:'ply33'},{at:76000,id:'US-R07',want:'analysis'},{at:82000,id:'US-R09',want:'summary'}];
const state=(b)=>b.page.evaluate(()=>{const v=(s)=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};const t=(s)=>{const e=document.querySelector(s);return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;};const btns=[...document.querySelectorAll('button')].map(x=>(x.innerText||'').trim());return {cap:t('[data-ct="rec-cap"]'),summary:v('[data-ct="rev-summary"]'),strip:v('[data-ct="strip-row"]'),ml:t('[data-ct="rev-move-line"]'),num:t('[data-ct="eval-bar-num"]'),undo:btns.some(x=>/Undo/.test(x)),exit:btns.some(x=>/Exit analysis/.test(x)),textarea:!!document.querySelector('textarea'),analysing:/analy[sz]ing|Analyzing|analysing/i.test(document.body.innerText||'')};});
function matches(want,s){switch(want){case 'summary':return s.summary;case 'ply0':return s.strip&&!s.summary&&!s.exit&&!!s.ml&&!/\d/.test(s.ml||'')||(s.strip&&!s.summary&&/^(Start|—|Initial|1\. e4)?/.test(s.ml||'')&&!/Nxb5|Rd8/.test(s.ml||''));case 'ply19':return s.strip&&/Nxb5/.test(s.ml||'')&&!s.exit;case 'ply33':return s.strip&&/Rd8/.test(s.ml||'')&&/1-0/.test(s.num||'');case 'analysis':return s.undo&&s.exit;default:return false;}}
async function runCard(b,tag){
  await b.home();const gb=b.page.locator('button[title="Preview gallery (dev)"]');await gb.waitFor({state:'visible',timeout:8000});await gb.click();await b.settle(400);
  const titles=await b.page.evaluate(()=>[...document.querySelectorAll('button')].map(x=>(x.innerText||'').split('\n')[0]).filter(x=>/^\d+ · /.test(x)));
  const six=titles.find(x=>/^6 · /.test(x));L.say(!!six&&/US-R|Review journey/.test(six)&&!titles.some(x=>/k12 · Review at the last move/.test(x)),tag+': card 6 is the Review journey and the old k12 card is gone',six);
  const c=b.page.locator('button',{hasText:/^6 · /}).first();await c.click();const t0=Date.now();
  const samples=[];let firstSummary=null;
  while(Date.now()-t0<92000){const s=await state(b);const t=Date.now()-t0;s.t=Math.round(t/100)/10;samples.push(s);if(s.summary&&firstSummary==null)firstSummary=s.t;await b.settle(1000);}
  L.note(tag+': summary first visible at '+firstSummary+' s (analysis time under this pool)');
  for(const st of STEPS){const s=samples.find(x=>x.t*1000>=st.at+1500)||samples[samples.length-1];const capOk=!!s.cap&&s.cap.includes(st.id);const ok=matches(st.want,s);
    L.say(capOk&&ok,tag+': step '+st.id+' at '+(st.at/1000)+' s: caption '+(capOk?'shows it':'MISSING')+', app state '+(ok?'matches':'DOES NOT match')+' ('+st.want+')',{t:s.t,cap:s.cap&&s.cap.slice(0,40),summary:s.summary,strip:s.strip,ml:s.ml&&s.ml.slice(0,24),num:s.num,undo:s.undo,exit:s.exit});}
  const last=samples[samples.length-1];L.note(tag+': at 88+ s: '+JSON.stringify({cap:last.cap&&last.cap.slice(0,30),summary:last.summary,strip:last.strip,exit:last.exit}));
  const tl=samples.filter((s,i)=>i%3===0).map(s=>s.t+':'+(s.summary?'S':s.exit?'A':s.strip?'M':s.textarea?'L':'?')+(s.ml?'('+s.ml.slice(0,8)+')':''));L.note(tag+': timeline '+tl.join(' '));
  await b.shot('uat-'+tag+'-end');
}
L.run(async()=>{
  const b1=await L.launch({geo:'kunal',name:'ant-uat-pool1',store:{ct_pool:'1'}});await b1.open();
  try{await runCard(b1,'kunal pool1');}catch(e){L.say(false,'kunal pool1: threw',String(e).slice(0,160));}
  L.say(b1.errs.length===0,'kunal pool1: zero app errors',b1.errs.slice(0,3));await b1.close();
  const b2=await L.launch({geo:'se',name:'ant-uat-se'});await b2.open();
  try{await runCard(b2,'se default-pool');}catch(e){L.say(false,'se default-pool: threw',String(e).slice(0,160));}
  L.say(b2.errs.length===0,'se default-pool: zero app errors',b2.errs.slice(0,3));await b2.close();
},'ANT-UATCARD');
