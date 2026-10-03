// gates/shots471.js - the #471 before/after render pair at Kunal's 375x730, per the definition of done (d).
// Run twice, ONE PROCESS PER BUNDLE (two L.launch calls with different bundles in one process serve the first
// bundle twice):
//   CT_APP=gates/.trial/app-470-shipped.js CT_TAG=BEFORE-470 node gates/shots471.js
//   CT_APP=app.js                          CT_TAG=AFTER-471  node gates/shots471.js
'use strict';
const L=require('./lib'), P=require('./drive/play');
const TAG=process.env.CT_TAG||'x';

// paint a red box around an element, and a caption carrying THIS frame's own measured numbers
async function box(b,findDesc,caption){
  await b.page.evaluate(([fd,cap])=>{
    const sh=document.querySelector('[data-ct="menu-sheet"]');
    let t=null;
    if(fd==='warn')t=document.querySelector('[data-ct="setup-reset-warn"]');
    if(!t&&sh){for(const e of sh.querySelectorAll('span,div')){if((e.innerText||'').replace(/\s+/g,' ').trim()==='No clock'){const r=e.getBoundingClientRect();if(r.width>10&&r.width<230&&r.height>16&&r.height<46){t=e;break;}}}}
    if(t){const r=t.getBoundingClientRect();const d=document.createElement('div');
      d.style.cssText='position:fixed;z-index:99999;pointer-events:none;border:3px solid #ff2d2d;border-radius:8px;left:'+(r.left-4)+'px;top:'+(r.top-4)+'px;width:'+(r.width+8)+'px;height:'+(r.height+8)+'px';
      document.body.appendChild(d);}
    const c=document.createElement('div');
    c.style.cssText='position:fixed;z-index:99999;left:0;right:0;bottom:0;background:rgba(0,0,0,.86);color:#fff;font:600 11px/1.35 -apple-system,sans-serif;padding:7px 9px;white-space:pre-wrap';
    c.textContent=cap;document.body.appendChild(c);
  },[findDesc,caption]);
}
const plies=(b)=>P.plies(b);
const row=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():'(no move row)';});
const warnTxt=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-reset-warn"]');return e?((e.innerText||'').replace(/\s+/g,' ').trim()||'(reserved, empty)'):'(NO SUCH ROW ON THIS BUNDLE)';});

L.run(async()=>{
  const b=await L.launch({geo:{w:375,h:730},name:'shots471-'+TAG}); await b.open();
  const stamp=await b.stamp();
  // a live game: Pass & Play 1.f3 e5 2.g4 - 3 plies, Black to move, nothing finished
  await P.states['pp-m0'](b); await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4');
  await b.settle(450);
  const p0=await plies(b), r0=await row(b);
  await b.tapCt('play-menu',700);
  const w0=await warnTxt(b);
  await box(b,'warn',TAG+'  '+stamp+'\n1 of 2 - BEFORE THE TAP. A live game is on the board: '+p0+' plies, "'+r0+'".\nThe menu\'s Game setup chips are below. Red box: the row that warns (or does not).\nIt reads: '+w0);
  await b.shot('471-'+TAG+'-1-menu-over-a-live-game');
  // remove the overlay, then ONE tap on the "No clock" chip
  await b.page.evaluate(()=>{[...document.querySelectorAll('div')].filter(d=>/z-index: 99999/.test(d.style.cssText)).forEach(d=>d.remove());});
  const h=await b.page.evaluateHandle(()=>{const sh=document.querySelector('[data-ct="menu-sheet"]');if(!sh)return null;for(const e of sh.querySelectorAll('span,div')){if((e.innerText||'').replace(/\s+/g,' ').trim()!=='No clock')continue;const r=e.getBoundingClientRect();if(r.width>10&&r.width<230&&r.height>16&&r.height<46){e.scrollIntoView({block:'center'});return e;}}return null;});
  const el=h.asElement();
  if(el){const bx=await el.boundingBox();await b.page.mouse.click(bx.x+bx.width/2,bx.y+bx.height/2);await b.page.waitForTimeout(700);}
  const p1=await plies(b), r1=await row(b), w1=await warnTxt(b);
  await box(b,'warn',TAG+'  '+stamp+'\n2 of 2 - AFTER ONE TAP ON THE "No clock" CHIP.\nPlies: '+p0+' -> '+p1+'.   Move row: "'+r1+'"\nThe row now reads: '+w1+'\n'+(p1===p0?'THE GAME SURVIVED the first tap. A second tap on the SAME chip starts the new game.':'THE GAME IS GONE. One tap, no confirmation, no undo.'));
  await b.shot('471-'+TAG+'-2-after-one-tap');
  L.say(true,TAG+' render pair written',{stamp,pliesBefore:p0,pliesAfter:p1,rowAfter:r1,warnBefore:w0,warnAfter:w1});
  await b.close();
},'shots471-'+TAG);
