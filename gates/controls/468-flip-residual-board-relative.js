/* #468 CONTROL, NOT A GATE. Deliberately NOT in gates/regress/ so the manifest does not see it as an unlisted
   gate, and under a dot-name per the #467 hand-off's trap 1. Deleted before the push.
   IT ANSWERS THE ONE QUESTION A GREEN GATE 48 CANNOT: gate 48 went green at 357 PASS on this bundle, but the
   lesson demo board is multistable and that run may simply have drawn a HEALTHY board - where the DELETED pin
   would have passed too. So a green proves nothing about the change. This forces the board to each of its
   three observed widths and prints, side by side, what the OLD geometry-name pin asserted and what the NEW
   board-relative instrument asserts. Then it runs the negative control the hand-off job named. */
const L=require('../lib');
const D=require('../drive/lesson');
const FLIP_NEEDED=226.77;

const flipRow=(b)=>b.page.evaluate(()=>{
  const r2=(n)=>Math.round(n*100)/100;
  const cand=[...document.querySelectorAll('button')].filter(x=>/^⟳\s*Flip$/.test((x.innerText||'').replace(/\s+/g,' ').trim()));
  let el=null;
  for(const c of cand){const p=c.parentElement;if(!p)continue;
    if([...p.children].some(k=>/Now I'll try it/.test(k.innerText||''))){el=c;break;}}
  if(!el)return {found:false,seen:cand.length};
  const rowEl=el.parentElement,rr=rowEl.getBoundingClientRect(),er=el.getBoundingClientRect();
  const cs=getComputedStyle(rowEl),gap=parseFloat(cs.columnGap)||0;
  const prev=rowEl.style.gridTemplateColumns;
  rowEl.style.gridTemplateColumns='min-content min-content';
  const mcTracks=(getComputedStyle(rowEl).gridTemplateColumns||'').split(/\s+/).map(parseFloat).filter(x=>!isNaN(x));
  rowEl.style.gridTemplateColumns=prev;
  const needed=mcTracks.length?r2(mcTracks.reduce((a,x)=>a+x,0)+gap*(mcTracks.length-1)):null;
  return {found:true,rowR:r2(rr.right),rowW:r2(rr.width),btnR:r2(er.right),past:r2(er.right-rr.right),needed,vw:innerWidth};
});

/* #468 SELF-CAUGHT: MY FIRST VERSION OF THIS FUNCTION DID NOTHING AND THE CONTROL PASSED ANYWAY.
   It set width/minWidth/maxWidth on the widest `repeat(8,...)` grid - the board - and `rowW` came back
   236.39 AT EVERY FORCED WIDTH, so 18 of 33 assertions were vacuous passes and the "DISCRIMINATION" lines
   compared the two instruments in a state where the board had never moved. That is CLAUDE.md's #416 trap
   verbatim ("the board's rect did not move one pixel, because the same element carries an inline width") and
   its rule: PRINT THE BEFORE AND AFTER OF THE MEASURED VALUE, not of the thing you changed.
   THE FIX IS TO FORCE THE QUANTITY THE ASSERTION ACTUALLY READS. `past` is btnR - rowR and the prediction is
   needed - rowW, so the variable the multistability acts THROUGH is the ROW's width. The row IS the board's
   width (#406 re-keyed it), so setting the row to each observed board width reproduces the state faithfully,
   and - unlike forcing the board - it is verified to have moved by returning rowW before and after. */
const forceRow=(b,px)=>b.page.evaluate((px)=>{
  const r2=(n)=>Math.round(n*100)/100;
  const cand=[...document.querySelectorAll('button')].filter(x=>/^\u27f3\s*Flip$/.test((x.innerText||'').replace(/\s+/g,' ').trim()));
  let el=null;
  for(const c of cand){const p=c.parentElement;if(!p)continue;
    if([...p.children].some(k=>/Now I'll try it/.test(k.innerText||''))){el=c;break;}}
  if(!el)return {ok:false,reason:'flip row not found'};
  const rowEl=el.parentElement;
  const before=r2(rowEl.getBoundingClientRect().width);
  if(px!==null){ rowEl.style.width=px+'px'; rowEl.style.minWidth=px+'px'; rowEl.style.maxWidth=px+'px'; }
  const after=r2(rowEl.getBoundingClientRect().width);
  return {ok:true,before,after,moved:r2(after-before)};
},px);

const shiftFlip=(b,px)=>b.page.evaluate((px)=>{
  const cand=[...document.querySelectorAll('button')].filter(x=>/^⟳\s*Flip$/.test((x.innerText||'').replace(/\s+/g,' ').trim()));
  for(const c of cand){const p=c.parentElement;if(!p)continue;
    if([...p.children].some(k=>/Now I'll try it/.test(k.innerText||''))){ c.style.position='relative'; c.style.left=px+'px'; return {ok:true}; }}
  return {ok:false};
},px);

const r2=(n)=>Math.round(n*100)/100;
let pass=0, fail=0;
const say=(ok,msg,data)=>{ console.log((ok?'PASS':'FAIL')+' ctl468: '+msg+(data?'  '+JSON.stringify(data):'')); ok?pass++:fail++; };

L.run(async()=>{
 for(const spec of [{geo:{w:320,h:540,safe:'',label:'320x540'},name:'320x540',oldPin:0},
                    {geo:{w:320,h:520,safe:'',label:'320x520'},name:'320x520',oldPin:0},
                    {geo:{w:375,h:520,safe:'',label:'375x520'},name:'375x520',oldPin:3.58}]){
  const b=await L.launch({geo:spec.geo,name:'ctl468-'+spec.name});
  await b.open();
  await D.states['endgame-demo-end'](b);
  await b.settle(500);

  /* (1) THE NATURAL STATE. Whatever board this run happened to draw. */
  const nat=await flipRow(b);
  const natRow=(await forceRow(b,null)).before;
  const natPred=r2(Math.max(0,nat.needed-nat.rowW));
  say(nat.found, spec.name+' natural: state reached and the Flip row was located', {rowAndBoardWidth:natRow,rowW:nat.rowW,past:nat.past,needed:nat.needed});
  say(Math.abs(nat.past-natPred)<=0.6,
      spec.name+' natural: the NEW board-relative instrument holds at the board this run drew', {rowW:natRow,past:nat.past,predicted:natPred});
  const oldOkNat=Math.abs(nat.past-spec.oldPin)<=0.6;
  console.log('      NOTE '+spec.name+' natural: the DELETED pin ('+spec.oldPin+') would have '+(oldOkNat?'PASSED':'FAILED')+' here (past='+nat.past+', rowW='+natRow+')');

  /* (2) THE THREE OBSERVED BOARD WIDTHS, FORCED. This is the whole point: the pin is keyed to the geometry
     NAME, so it cannot move when the board does. The instrument is keyed to the board, so it must. */
  for(const bw of [236.4,212.39,192.00]){
    const f=await forceRow(b,bw);
    await b.settle(250);
    const m=await flipRow(b);
    const pred=r2(Math.max(0,m.needed-m.rowW));
    const newOk=Math.abs(m.past-pred)<=0.6;
    const oldOk=Math.abs(m.past-spec.oldPin)<=0.6;
    say(Math.abs(m.rowW-bw)<=0.6,
        spec.name+' @board '+bw+': THE CONTROL ACTUALLY MOVED rowW, the quantity the assertion reads - this is the guard my first version lacked',
        {askedFor:bw,rowWNow:m.rowW,movedBy:f.moved});
    say(newOk, spec.name+' @board '+bw+': the NEW instrument predicts the residual exactly (needed '+m.needed+' - rowW '+m.rowW+')',
        {forcedFrom:f.before,forcedTo:f.after,actuallyMoved:f.moved,rowW:m.rowW,past:m.past,predicted:pred});
    say(m.needed!==null&&Math.abs(m.needed-FLIP_NEEDED)<=0.6,
        spec.name+' @board '+bw+': and the SURVIVING needed-vs-FLIP_NEEDED pin is untouched and still holds at '+m.needed,
        {needed:m.needed,pinned:FLIP_NEEDED});
    console.log('      DISCRIMINATION '+spec.name+' @board '+bw+': oldPin('+spec.oldPin+')='+(oldOk?'green':'RED')+'  newInstrument='+(newOk?'green':'RED')+'   past='+m.past+' predicted='+pred);
  }

  /* (3) THE NEGATIVE CONTROL. Shift the Flip button 10px right. `needed` and `rowW` are untouched, so the
     prediction does not move; `past` moves by 10, which is 16x the 0.6 tolerance. The NEW instrument MUST
     go red, or it cannot fail and the change was a loss. This is the control jobs/467... asked for. */
  await forceRow(b,null); await b.settle(250);
  const pre=await flipRow(b); const prePred=r2(Math.max(0,pre.needed-pre.rowW));
  await shiftFlip(b,10); await b.settle(250);
  const post=await flipRow(b); const postPred=r2(Math.max(0,post.needed-post.rowW));
  say(Math.abs(pre.past-prePred)<=0.6, spec.name+' NC baseline: green BEFORE the perturbation', {past:pre.past,predicted:prePred});
  say(Math.abs(post.past-postPred)>0.6,
      spec.name+' NEGATIVE CONTROL: shifting ⟳ Flip 10px right turns the NEW instrument RED - it CAN fail',
      {pastBefore:pre.past,pastAfter:post.past,predictedBefore:prePred,predictedAfter:postPred,moved:r2(post.past-pre.past)});
  say(Math.abs(postPred-prePred)<=0.6,
      spec.name+' NC: and the prediction did NOT move with it, so the two sides are genuinely independent here',
      {predictedBefore:prePred,predictedAfter:postPred});
  await b.close();
 }
 console.log('\nctl468: '+pass+' passed, '+fail+' failed');
 if(fail) process.exitCode=1;
});
