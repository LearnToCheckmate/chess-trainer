// claude/agents/probes/434-render-pair.js  #434
// The before/after pair at Kunal's geometry with a red box on the change [definition of done (d)].
// Run TWICE, once per bundle, and it names the bundle it read in the file it writes:
//   CT_APP=<#433 bundle> CT_SHOTS=claude/agents/shots node claude/agents/probes/434-render-pair.js before
//   node claude/agents/probes/434-render-pair.js after
// The state is the one the defect lives in: vs Pip at 375x730, resigned at move 0, 6.6s after the
// resignation so the result card has faded and only the status slot is left to say anything.
const L=require('../../../gates/lib');const P=require('../../../gates/drive/play');
const tag=process.argv[2]||'after';
(async()=>{
  const b=await L.launch({geo:'kunal730',name:'434-render-'+tag,store:{ct_pool:'3'}});await b.open();
  await P.states['setup'](b);await P.tapBtn(b,/^Pip\n/,200);await P.tapBtn(b,/^▶ Start game$/,900);
  await b.settle(250);
  await P.tapBtn(b,/^More$/,700);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1200);
  await b.settle(5600);
  const read=await b.page.evaluate(()=>{
    const el=document.querySelector('[data-ct="play-opening"]');
    const r=el.getBoundingClientRect();
    const box=document.createElement('div');
    box.style.cssText='position:fixed;left:'+(r.x-5)+'px;top:'+(r.y-5)+'px;width:'+(r.width+10)+'px;height:'+(r.height+10)+'px;border:2px solid #ff3b30;border-radius:5px;z-index:99999;pointer-events:none';
    document.body.appendChild(box);
    return {text:(el.textContent||'').replace(/ /g,' ').trim(),rect:{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}};
  });
  await b.shot('434-result-slot-'+tag+'-375x730');
  console.log(tag+': slot reads '+JSON.stringify(read.text)+' at '+JSON.stringify(read.rect));
  await b.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
