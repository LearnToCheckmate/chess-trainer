// Companion probe, #424: reach lesson-demo-end the way gate 35 and the headless gallery do - via
// PREVIEW GALLERY CARD 3 - rather than by driving the Italian Game. uat422 measured 8.77px past the
// VIEWPORT at 320x568 on card 3/8; the drive route measures the button 7.70px INSIDE it. Two routes,
// two lessons, so the two numbers are not comparable until this is run. Whichever way it comes out is
// a finding: either the viewport escape is real in a lesson the drive route never visits, or the
// flag's geometry does not reproduce.
const L=require('../lib');
(async()=>{
 for(const [name,w,h] of [['320x568',320,568],['375x568',375,568],['375x730',375,730]]){
  let b=null;
  try{
   b=await L.launch({geo:{w,h,safe:'',label:name},name:'card3-'+name,store:{ct_pool:'3'}});
   await b.open();await b.card(3,2500);
   const r=await b.page.evaluate(()=>{
    const el=document.querySelector('[data-ct="lesson-lines"]');
    const r2=(n)=>Math.round(n*100)/100;
    if(!el)return {absent:true,btns:[...document.querySelectorAll('button')]
      .map(x=>(x.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,14)};
    const row=el.parentElement,rr=row.getBoundingClientRect(),er=el.getBoundingClientRect();
    return {t:(el.innerText||'').trim(),rowX:r2(rr.left),rowR:r2(rr.right),rowW:r2(rr.width),
            x:r2(er.left),r:r2(er.right),w:r2(er.width),
            docSW:document.documentElement.scrollWidth,vw:innerWidth};
   });
   const m=await b.metrics();
   if(r.absent)console.log('=== card3 '+name+' -> lesson-lines ABSENT at 2500ms. Buttons on screen: '+r.btns.join(' | '));
   else console.log('=== card3 '+name+' | board '+(m.board&&m.board.w)+' | "'+r.t+'" | row '+r.rowW+' at '+r.rowX+'..'+r.rowR
     +' | btn '+r.x+'..'+r.r+' (w '+r.w+') | PAST ROW '+Math.round((r.r-r.rowR)*100)/100
     +' | PAST VIEWPORT '+Math.round((r.r-r.vw)*100)/100+' | docSW '+r.docSW+'/'+r.vw);
  }catch(e){console.log('=== card3 '+name+' -> ERR '+String(e.message||e).slice(0,110));}
  if(b)await b.close();
 }
 console.log('CARD3 PROBE COMPLETE');
 process.exit(0);  // #424: L.launch's server keeps the event loop alive, so a probe that merely finishes never EXITS - seven of them accumulated over this run and competed for CPU with the suite.
})();
