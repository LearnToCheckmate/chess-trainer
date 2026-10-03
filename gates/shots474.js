// #474 before/after render pair at Kunal's 375x730, red box on the change.
const L=require('/home/user/chess-trainer/gates/lib');
const P=require('/home/user/chess-trainer/gates/drive/play');
const LE=require('/home/user/chess-trainer/gates/drive/lesson');
const TAG=process.env.CT_TAG||'x';
const box=async(b,sel,label)=>b.page.evaluate(([s,lab])=>{
  const e=document.querySelector(s); const d=document.createElement('div');
  const r=e?e.getBoundingClientRect():{left:16,top:60,width:343,height:67};
  Object.assign(d.style,{position:'fixed',left:(r.left-3)+'px',top:(r.top-3)+'px',width:(r.width+6)+'px',
    height:(r.height+6)+'px',border:'3px solid #ff2d55',borderRadius:'14px',zIndex:99999,pointerEvents:'none'});
  const t=document.createElement('div');
  Object.assign(t.style,{position:'fixed',left:'8px',top:(r.top+r.height+8)+'px',width:'359px',font:'600 12px -apple-system,system-ui',
    color:'#ff2d55',zIndex:99999,pointerEvents:'none',lineHeight:'1.35'});
  t.textContent=lab;
  document.body.appendChild(d);document.body.appendChild(t);
  return {rect:{x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10},present:!!e};
},[sel,label]);
(async()=>{
  const b=await L.launch({geo:'kunal730',name:'shots474-'+TAG}); await b.open();
  await P.states['pp-m0'](b);
  await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4');
  await b.page.evaluate(()=>{window.__ctLive=1;});
  await b.tapCt('play-home').catch(()=>{}); await b.settle(400);
  await b.tile('Play'); await b.settle(800);
  await b.tapCt('setup-resume',700).catch(()=>{});
  await LE.states['intro'](b);
  const live=await b.page.evaluate(()=>window.__ctLive===1);
  await b.tapText(/^✕$/).catch(()=>{}); await b.settle(600);
  await b.tile('Play').catch(()=>{}); await b.settle(900);
  const resume=await b.text('[data-ct="setup-resume"]');
  const row=await b.text('[data-ct="play-moverow"]');
  const lab=(resume===null)
    ? 'AFTER #474: no resume row. The board is no longer that game (move row EMPTY), so nothing is offered.'
    : 'BEFORE #473: this row offers "'+String(resume).replace(/^▶ /,'')+'" while the move row behind it is ALREADY EMPTY.';
  const m=await box(b,resume===null?'[data-ct="setup-start"]':'[data-ct="setup-resume"]',lab);
  const p=await b.shot('474-render-'+TAG+'-stale-at-375x730');
  console.log(JSON.stringify({tag:TAG,stamp:await b.stamp(),noReload:live,resume,moverow:row,boxed:m,shot:p}));
  await b.close(); process.exit(0);
})();
