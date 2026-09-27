// #424 post-veto verification. Confirms (a) the vars branch is unchanged by the Flip revert,
// (b) the two new pin values 39.55 and 19.16, (c) the tracks-vs-clone 2.00px gap, and
// (d) the Flip branch is back to 14px and what its own residual now is - the number the veto
// accepted as a recorded residual rather than fixing.
const L=require('../lib');const D=require('../drive/lesson');
const M=()=>{
  const r2=n=>Math.round(n*100)/100;
  const el=document.querySelector('[data-ct="lesson-lines"]');
  const flip=[...document.querySelectorAll('button')].find(b=>/^⟳ Flip$/.test((b.innerText||'').trim()));
  const t=el||flip; if(!t)return {err:'neither lesson-lines nor Flip on screen'};
  const row=t.parentElement,rr=row.getBoundingClientRect(),cs=getComputedStyle(row);
  const tracks=(cs.gridTemplateColumns||'').split(/\s+/).map(parseFloat).filter(x=>!isNaN(x));
  const gap=parseFloat(cs.columnGap)||0;
  const minC=e=>{const c=e.cloneNode(true);c.style.position='absolute';c.style.left='-9999px';
    c.style.width='max-content';c.style.maxWidth='none';document.body.appendChild(c);
    const w=c.getBoundingClientRect().width;c.remove();return r2(w);};
  const kids=[...row.children].map(k=>{const kr=k.getBoundingClientRect(),ks=getComputedStyle(k);
    return {t:(k.innerText||'').replace(/\s+/g,' ').trim(),w:r2(kr.width),minC:minC(k),fs:ks.fontSize,ls:ks.letterSpacing};});
  const er=t.getBoundingClientRect();
  return {which:el?'lesson-lines':'Flip',rowR:r2(rr.right),rowW:r2(rr.width),tracks,gap,kids,
    btnR:r2(er.right),pastRow:r2(er.right-rr.right),pastVP:r2(er.right-innerWidth),
    needed:r2(tracks.reduce((a,b)=>a+b,0)+gap*(tracks.length-1)),
    clone:r2(kids.reduce((s,k)=>s+k.minC,0)+gap*(kids.length-1)),
    text:(t.innerText||'').trim(),docSW:document.documentElement.scrollWidth};
};
(async()=>{
 const CASES=[['vars 320x568',320,568,'demo-end'],['vars 375x568',375,568,'demo-end'],
              ['vars 375x730',375,730,'demo-end'],['vars 320x520',320,520,'demo-end'],
              ['vars 320x540',320,540,'demo-end'],
              ['FLIP 320x568',320,568,'endgame-demo-end'],['FLIP 320x520',320,520,'endgame-demo-end'],
              ['FLIP 375x730',375,730,'endgame-demo-end']];
 for(const [name,w,h,st] of CASES){
  let b=null;
  try{
   b=await L.launch({geo:{w,h,safe:'',label:name},name:'v-'+name.replace(/ /g,'')});
   await b.open(); await D.states[st](b);
   const m=await b.metrics(), r=await b.page.evaluate(M);
   if(r.err){console.log(name,'->',r.err);continue;}
   console.log(name+' ['+r.which+'] board '+(m.board&&m.board.w)+' | row '+r.rowW+' ends '+r.rowR
     +' | tracks '+JSON.stringify(r.tracks)
     +'\n    "'+r.text+'" right '+r.btnR+'  PAST ROW '+r.pastRow+'  PAST VP '+r.pastVP
     +'  | needed(tracks) '+r.needed+'  clone '+r.clone+'  delta '+Math.round((r.needed-r.clone)*100)/100
     +'  | shortfall '+Math.round((r.needed-r.rowW)*100)/100+'  docSW '+r.docSW
     +'\n    kids: '+r.kids.map(k=>'"'+k.t+'" fs'+k.fs+' ls'+k.ls+' w'+k.w+' minC'+k.minC).join(' | '));
  }catch(e){console.log(name,'ERR',String(e.message||e).slice(0,110));}
  if(b)await b.close();
 }
 console.log('VERIFY COMPLETE');
 process.exit(0);  // #424: L.launch's server keeps the event loop alive, so a probe that merely finishes never EXITS - seven of them accumulated over this run and competed for CPU with the suite.
})();
