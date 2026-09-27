// Does the min-content override actually answer the question? It must give the SAME number where the grid
// fits and where it is blown out, because min-content is a property of the content and not of the row.
const L=require('../lib');const D=require('../drive/lesson');
(async()=>{
 for(const [n,w,h] of [['320x568',320,568],['320x520',320,520],['375x730',375,730]]){
  const b=await L.launch({geo:{w,h,safe:'',label:n},name:'mc-'+n});await b.open();
  await D.states['demo-end'](b);
  const r=await b.page.evaluate(()=>{
   const r2=x=>Math.round(x*100)/100;
   const el=document.querySelector('[data-ct="lesson-lines"]');const row=el.parentElement;
   const cs=getComputedStyle(row);const gap=parseFloat(cs.columnGap)||0;
   const resolved=(cs.gridTemplateColumns||'').split(/\s+/).map(parseFloat).filter(x=>!isNaN(x));
   const prev=row.style.gridTemplateColumns;
   row.style.gridTemplateColumns='min-content min-content';
   const mc=(getComputedStyle(row).gridTemplateColumns||'').split(/\s+/).map(parseFloat).filter(x=>!isNaN(x));
   row.style.gridTemplateColumns=prev;
   const after=getComputedStyle(row).gridTemplateColumns;
   return {rowW:r2(row.getBoundingClientRect().width),gap,resolved,mc,
     mcSum:r2(mc.reduce((a,b)=>a+b,0)+gap*(mc.length-1)),
     resolvedSum:r2(resolved.reduce((a,b)=>a+b,0)+gap*(resolved.length-1)),
     restored:after===cs.gridTemplateColumns,inline:prev,afterInline:row.style.gridTemplateColumns};
  });
  console.log(n,'row',r.rowW,'| resolvedSum',r.resolvedSum,'| MIN-CONTENT SUM',r.mcSum,
    '| mc tracks',JSON.stringify(r.mc),'| restored',r.restored,'| inline back to',JSON.stringify(r.afterInline));
  await b.close();
 }
 console.log('MC PROBE COMPLETE');
 process.exit(0);  // #424: L.launch's server keeps the event loop alive, so a probe that merely finishes never EXITS - seven of them accumulated over this run and competed for CPU with the suite.
})();
