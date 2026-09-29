// claude/agents/probes/435-render-pair.js  #435
// The before/after pair at 730x375 with a red box on the change [definition of done (d)].
// The defect is LANDSCAPE, so the pair is rendered there; the portrait pair is #434's and is unchanged.
// Two boxes, because this build has two findings in one frame: the status row that did not exist (red),
// and the board that used to shrink (blue, with its width burnt in so the two shots can be compared by eye).
//   CT_APP=<#434 bundle> node claude/agents/probes/435-render-pair.js before
//   node claude/agents/probes/435-render-pair.js after
const L=require('../../../gates/lib');const P=require('../../../gates/drive/play');
const tag=process.argv[2]||'after';
(async()=>{
 for(const opp of ['cpu','pp']){
  const b=await L.launch({geo:{w:730,h:375,safe:''},name:'435-render-'+opp+'-'+tag,store:{ct_pool:'3'}});await b.open();
  if(opp==='pp'){await P.states['pp-m0'](b);}
  else{await P.states['setup'](b);await P.tapBtn(b,/^Pip\n/,200);await P.tapBtn(b,/^▶ Start game$/,900);}
  await b.settle(400);
  const live=await b.board();
  await P.tapBtn(b,/^More$/,700);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1200);
  await b.settle(5600);
  const read=await b.page.evaluate((liveW)=>{
    const mk=(r,col,label)=>{const d=document.createElement('div');
      d.style.cssText='position:fixed;left:'+(r.x-5)+'px;top:'+(r.y-5)+'px;width:'+(r.width+10)+'px;height:'+(r.height+10)+'px;border:2px solid '+col+';border-radius:5px;z-index:99999;pointer-events:none';
      if(label){const t=document.createElement('div');t.textContent=label;
        t.style.cssText='position:absolute;left:0;top:-15px;font:700 11px system-ui;color:'+col+';white-space:nowrap';d.appendChild(t);}
      document.body.appendChild(d);};
    const el=document.querySelector('[data-ct="play-opening"]');
    let slot=null;
    if(el){const r=el.getBoundingClientRect();slot={t:(el.textContent||'').replace(/ /g,' ').trim(),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1)};
      mk(r,'#ff3b30','result line');}
    // the board: the CSS grid with repeat(8,…) columns, the same way gates/lib.js finds it
    let bd=null,best=0;
    for(const d of document.querySelectorAll('div')){const cs=getComputedStyle(d);
      if(!/repeat\(8,/.test(cs.gridTemplateColumns)&&cs.gridTemplateColumns.split(' ').length!==8)continue;
      const r=d.getBoundingClientRect();if(r.width>best){best=r.width;bd=r;}}
    if(bd)mk(bd,'#4a9eff','board '+bd.width.toFixed(2)+'px  (live was '+liveW.toFixed(2)+')');
    return {slot,board:bd&&+bd.width.toFixed(2)};
  },live?live.w:0);
  await b.shot('435-landscape-gameover-'+opp+'-'+tag+'-730x375');
  console.log(tag+' '+opp+': live board '+(live?live.w.toFixed(2):'?')+' -> over board '+read.board+
              '   slot='+JSON.stringify(read.slot&&read.slot.t));
  await b.close();
 }
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
