// audit/selfantagonist373.js  The build session's own antagonist sweep for #373 (fallback when the agent cannot run):
// the same claims as 30-p1-fixes, in configurations that gate did not use: 320x568, 430x932, landscape, and a stored
// profile with the eval bar above the board. Prints numbers; the human reads them.
'use strict';
process.env.CT_SHOTS=require('path').join(__dirname,'..','shots','antagonist373');
const L=require('../lib');
L.run(async()=>{
  const cfgs=[{geo:'se',store:{}},{geo:'430',store:{}},{geo:{w:844,h:390,safe:'',label:'landscape 844x390'},store:{}},{geo:'kunal',store:{ct_evalunder:'0',ct_evalgraph:'1'}}];
  for(const c of cfgs){
    const lab=(typeof c.geo==='string'?c.geo:c.geo.label)+(Object.keys(c.store).length?' +store '+JSON.stringify(c.store):'');
    const b=await L.launch({geo:c.geo,store:c.store,app:process.env.CT_APP||require('path').join(L.ROOT,'app.js'),name:'anta'});await b.open();
    const hm=await b.rect('[data-ct="home-menu"]');L.say(!!hm&&hm.w>=40&&hm.h>=40,lab+': A-04 home ☰ >= 40px',hm&&[hm.w,hm.h,hm.x,hm.y]);
    await b.tapCt('home-menu',500);const sh=await b.rect('[data-ct="menu-sheet"]');L.say(!!sh&&sh.y+sh.h>=b.geo.h-11&&sh.y+sh.h<=b.geo.h+0.5,lab+': A-16 sheet bottom '+(sh&&Math.round(sh.y+sh.h))+' of '+b.geo.h);
    const links=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="menu-sheet"] a')].map(x=>Math.round(x.getBoundingClientRect().height)));L.note(lab+': footer link heights '+JSON.stringify(links));
    await b.page.mouse.click(4,4);await b.settle(300);
    await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.settle(400);const ov=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="setup-sheet"]');const p=s&&s.parentElement;return p?Math.round(p.scrollHeight-p.clientHeight):null;});L.note(lab+': A-13 Pass & Play sheet overflow '+ov);
    await b.tapText(/^▶ Start game$/,{wait:800});const m0=await b.metrics();for(const [f,t] of [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6']])await b.move(f,t,300);const mA=await b.metrics();
    if(await b.page.locator('button',{hasText:/^Moves$/}).first().isVisible().catch(()=>false)){await b.tapText(/^Moves$/,{wait:600});const m1=await b.metrics();await b.tapText(/^Moves$/,{wait:600});const m2=await b.metrics();
      L.say(mA.board&&m1.board&&m2.board&&Math.abs(mA.board.w-m1.board.w)<0.6&&Math.abs(mA.board.top-m1.board.top)<0.6&&Math.abs(mA.board.w-m2.board.w)<0.6,lab+': A-12 board unchanged across Moves toggles',{w:[m0.board&&m0.board.w,mA.board&&mA.board.w,m1.board&&m1.board.w,m2.board&&m2.board.w],top:[m0.board&&m0.board.top,mA.board&&mA.board.top,m1.board&&m1.board.top,m2.board&&m2.board.top],over:m2.over.over});}
    else L.note(lab+': no Moves button in this layout (wide) - A-12 not applicable');
    const an=await b.rect('[data-ct="moves-analyze"]');L.note(lab+': Analyze tap box '+JSON.stringify(an&&{w:an.w,h:an.h}));
    await b.home();await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900}).catch(()=>{});const sig=(x)=>x.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));return g?[...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-10):'';}).join(''):'';});
    const s0=await sig(b);const nx=b.page.locator('[aria-label="Next puzzle"]').first();if(await nx.isVisible().catch(()=>false)){await nx.click();await b.settle(700);const s1=await sig(b);L.say(s0&&s1&&s0!==s1,lab+': A-10 Next puzzle advances');}else L.note(lab+': no Next puzzle button visible');
    L.say(b.errs.length===0,lab+': zero app errors',b.errs.slice(0,3));await b.shot('anta-'+lab.replace(/[^a-z0-9]+/gi,'_'));await b.close();
  }
},'SELF-ANTAGONIST');
