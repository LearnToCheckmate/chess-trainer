// gates/audit/antagonist373-uatslow.js  ANTAGONIST #373: the Review UAT card (card 6) when the analysis is SLOWER than
// its 52 s first checkpoint. ct_pool '1' did not slow it (summary at 24 s either way), so the renderer is CPU-throttled
// through CDP (Emulation.setCPUThrottlingRate) until the summary lands after 52 s; then each step's caption is checked
// against the app state, and what the fn-driven steps do to a review that is not there yet is recorded.
'use strict';
const L=require('../lib');
const RATE=parseFloat(process.env.CT_RATE||'8');
const STEPS=[{at:52000,id:'US-R03',want:'summary'},{at:58000,id:'US-R04',want:'ply0'},{at:64000,id:'US-R06',want:'ply19'},{at:70000,id:'k12',want:'ply33'},{at:76000,id:'US-R07',want:'analysis'},{at:82000,id:'US-R09',want:'summary'}];
const state=(b)=>b.page.evaluate(()=>{const v=(s)=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};const t=(s)=>{const e=document.querySelector(s);return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;};const btns=[...document.querySelectorAll('button')].map(x=>(x.innerText||'').trim());return {cap:t('[data-ct="rec-cap"]'),summary:v('[data-ct="rev-summary"]'),strip:v('[data-ct="strip-row"]'),ml:t('[data-ct="rev-move-line"]'),num:t('[data-ct="eval-bar-num"]'),undo:btns.some(x=>/Undo/.test(x)),exit:btns.some(x=>/Exit analysis/.test(x)),textarea:!!document.querySelector('textarea'),body:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,90)};});
function matches(want,s){switch(want){case 'summary':return s.summary;case 'ply0':return s.strip&&!s.summary&&!s.exit&&/Start position/.test(s.ml||'');case 'ply19':return s.strip&&/Nxb5/.test(s.ml||'')&&!s.exit;case 'ply33':return s.strip&&/Rd8/.test(s.ml||'')&&/1-0/.test(s.num||'');case 'analysis':return s.undo&&s.exit;default:return false;}}
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'ant-uat-slow'});await b.open();
  const cdp=await b.ctx.newCDPSession(b.page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:RATE});
  await b.home();const gb=b.page.locator('button[title="Preview gallery (dev)"]');await gb.waitFor({state:'visible',timeout:8000});await gb.click();await b.settle(400);
  const c=b.page.locator('button',{hasText:/^6 · /}).first();await c.click();const t0=Date.now();
  const samples=[];let firstSummary=null;
  while(Date.now()-t0<96000){const s=await state(b);const t=Date.now()-t0;s.t=Math.round(t/100)/10;samples.push(s);if(s.summary&&firstSummary==null)firstSummary=s.t;await b.settle(700);}
  L.note('CPU x'+RATE+': summary first visible at '+firstSummary+' s');
  L.say(firstSummary!=null&&firstSummary>52,'CPU x'+RATE+': the analysis is slower than the 52 s checkpoint (summary at '+firstSummary+' s) - the configuration under test');
  for(const st of STEPS){const s=samples.find(x=>x.t*1000>=st.at+1500)||samples[samples.length-1];const capOk=!!s.cap&&s.cap.includes(st.id);const ok=matches(st.want,s);
    L.say(capOk&&ok,'CPU x'+RATE+': step '+st.id+' at '+(st.at/1000)+' s: caption '+(capOk?'shows it':'MISSING')+', app state '+(ok?'matches':'DOES NOT match')+' ('+st.want+')',{t:s.t,cap:s.cap&&s.cap.slice(0,40),summary:s.summary,strip:s.strip,ml:s.ml&&s.ml.slice(0,24),num:s.num,undo:s.undo,exit:s.exit,body:s.body.slice(0,60)});}
  const last=samples[samples.length-1];L.note('at 96 s: '+JSON.stringify({cap:last.cap&&last.cap.slice(0,30),summary:last.summary,strip:last.strip,exit:last.exit,ml:last.ml}));
  const tl=samples.filter((s,i)=>i%4===0).map(s=>s.t+':'+(s.summary?'S':s.exit?'A':s.strip?'M':s.textarea?'L':'?')+(s.ml?'('+s.ml.slice(0,8)+')':''));L.note('timeline '+tl.join(' '));
  await b.shot('uat-slow-x'+RATE+'-end');
  L.say(b.errs.length===0,'CPU x'+RATE+': zero app errors',b.errs.slice(0,3));
  await b.close();
},'ANT-UATSLOW');
