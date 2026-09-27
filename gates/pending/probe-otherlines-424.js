// Ad-hoc probe, #424. Measures the lesson demo row's two-button grid: the ROW's own right edge as
// well as the viewport's, because the job's doneWhen is "the button fits inside the row" and that is
// the two-element comparison the levers doc asked for. Prints each child's min-content so the
// ladder's arithmetic can be checked rather than assumed. gates/pending is not run by gates.sh.
// Each geometry is time-boxed: a geometry that cannot reach demo-end says so and the run continues,
// rather than hanging the whole probe (which is how v1 of this probe burned six minutes).
const L=require('../lib');const D=require('../drive/lesson');
const GEOS=[['320x568',320,568],['375x568',375,568],['375x730',375,730],['390x844',390,844],
            ['375x520',375,520],['320x520',320,520]];
const MEAS=()=>{
  const el=document.querySelector('[data-ct="lesson-lines"]');
  if(!el)return {err:'no lesson-lines element in the DOM'};
  const row=el.parentElement,rr=row.getBoundingClientRect();
  const minC=(e)=>{const c=e.cloneNode(true);c.style.position='absolute';c.style.left='-9999px';
    c.style.width='max-content';c.style.maxWidth='none';document.body.appendChild(c);
    const w=c.getBoundingClientRect().width;c.remove();return Math.round(w*100)/100;};
  const r2=(n)=>Math.round(n*100)/100;
  const kids=[...row.children].map(k=>{const kr=k.getBoundingClientRect();
    return {t:(k.innerText||'').replace(/\s+/g,' ').trim(),x:r2(kr.left),r:r2(kr.right),
            w:r2(kr.width),minC:minC(k)};});
  const er=el.getBoundingClientRect(),cs=getComputedStyle(el);
  return {rowX:r2(rr.left),rowR:r2(rr.right),rowW:r2(rr.width),
          gtc:getComputedStyle(row).gridTemplateColumns,gap:getComputedStyle(row).columnGap,
          kids,btnX:r2(er.left),btnR:r2(er.right),btnW:r2(er.width),
          fs:cs.fontSize,ls:cs.letterSpacing,pad:cs.padding,
          docSW:document.documentElement.scrollWidth,vw:innerWidth};
};
const box=(p,ms,label)=>Promise.race([p,new Promise((_,rj)=>setTimeout(()=>rj(new Error('timed out after '+ms+'ms: '+label)),ms))]);
(async()=>{
 for(const [name,w,h] of GEOS){
  let b=null;
  try{
   b=await L.launch({geo:{w,h,safe:'',label:name},name:'probe-'+name});
   await b.open();
   await box(D.states['demo-end'](b),60000,'reach demo-end');
   const m=await b.metrics();
   const r=await b.page.evaluate(MEAS);
   if(r.err){console.log(name,'->',r.err);}
   else{
    const pastRow=Math.round((r.btnR-r.rowR)*100)/100, pastVP=Math.round((r.btnR-r.vw)*100)/100;
    console.log('=== '+name+' | board '+(m.board&&m.board.w)+' | row '+r.rowW+' at '+r.rowX+'..'+r.rowR
      +' | tracks '+r.gtc+' gap '+r.gap);
    for(const k of r.kids)console.log('      child "'+k.t+'" box '+k.x+'..'+k.r+' (w '+k.w+') minContent '+k.minC);
    console.log('      lesson-lines: '+r.btnX+'..'+r.btnR+' (w '+r.btnW+')  PAST ROW '+pastRow
      +'  PAST VIEWPORT '+pastVP+'  docScrollWidth '+r.docSW+'/'+r.vw
      +'  fs '+r.fs+' ls '+r.ls+' pad '+r.pad);
    const need=Math.round((r.kids[0].minC+parseFloat(r.gap||6)+r.kids[1].minC-r.rowW)*100)/100;
    console.log('      SUM OF MIN-CONTENTS + gap = '+Math.round((r.kids[0].minC+parseFloat(r.gap||6)+r.kids[1].minC)*100)/100
      +' against a row of '+r.rowW+' -> the grid is blown out by '+need+'px');
   }
  }catch(e){console.log('=== '+name+' -> ERR '+String(e.message||e).slice(0,110));}
  if(b)await b.close();
 }
 console.log('PROBE COMPLETE');
 process.exit(0);  // #424: L.launch's server keeps the event loop alive, so a probe that merely finishes never EXITS - seven of them accumulated over this run and competed for CPU with the suite.
})();
