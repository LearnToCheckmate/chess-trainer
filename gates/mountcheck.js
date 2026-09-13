// gates/mountcheck.js - HANDOFF gate 3, run FIRST on any bundle (#351: a gate against a stale or unmountable
// bundle is worse than none). Asserts at Kunal's geometry and 390x844: the root renders, the home tiles are
// there, the build stamp is in the DOM, zero application console errors (network noise from the blocked hosts
// is counted separately), and each of the five tabs opens without an error.
//   CT_APP=/path/app.js node gates/mountcheck.js      (default: the repo's app.js)
//   CT_EXPECT='#373' node gates/mountcheck.js          (also assert the stamp's build number)
'use strict';
const L=require('./lib');
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'mount-'+geo});
    const t0=Date.now();await b.open();const ms=Date.now()-t0;
    const stamp=await b.stamp();
    L.say(!!stamp,geo+': build stamp in the DOM',stamp);
    if(process.env.CT_EXPECT)L.say(stamp&&stamp.startsWith(process.env.CT_EXPECT+' '),geo+': stamp is '+process.env.CT_EXPECT,stamp);
    const tiles=await b.page.evaluate(()=>['Discover','Puzzles','Review','Play'].filter(t=>[...document.querySelectorAll('div')].some(d=>new RegExp('(^|\\n)'+t+'\\n').test(d.innerText||''))));
    L.say(tiles.length===4,geo+': four home tiles render ('+ms+'ms to mount)',tiles);
    L.say(b.errs.length===0,geo+': zero app console errors on Home',b.errs.slice(0,3));
    for(const t of ['Discover','Puzzles','Review','Play']){
      await b.tile(t);await b.settle(700);
      const m=await b.metrics();
      L.say(b.errs.length===0,geo+': '+t+' opens with zero errors',b.errs.slice(0,3));
      L.note(t+' metrics '+JSON.stringify(m));
      await b.home();await b.settle(300);
    }
    await b.shot('mount-'+geo+'-home');
    await b.close();
  }
},'MOUNTCHECK');
