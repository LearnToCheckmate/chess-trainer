// claude/agents/probes/435-landscape-gameover.js  #435
// jobs/landscape-drops-the-status-row-at-game-over-so-no-result-survives-the-card-2026-09-29
//
// THE JOB SAYS THE BIGGER FINDING FIRST: "the board shrinks 224.00 -> 192.00 at GAME OVER in
// landscape, for both opponents, cause not established. Establish WHAT moves the board before
// deciding where the result goes."  So this probe does not assert anything about the result until
// it has enumerated, frame by frame, every in-flow child of the app root and its height - because
// the board is sized by a measure-and-trim loop (chess.jsx:2763) that reacts to the TOTAL content
// height, so the thing that moves the board is whatever row changed height, not necessarily the
// row anyone is looking at.
//
// Cases: landscape 730x375, resign at move 0, vs Computer (Pip) and Pass & Play - the two the job
// measured - plus the same pair in PORTRAIT 375x730 as the control, because if the board also
// shrinks there the finding is not about `wide` at all.
const L=require('../../../gates/lib');const P=require('../../../gates/drive/play');
const RE=/won|win|lose|lost|Time!|Resigned|Checkmate|Stalemate|draw/i;
const STRENGTH=/strength (now|stays)/i;

// Every in-flow child of the app root, with its height: the exact input the fit loop reads.
async function rootRows(b){
  return b.page.evaluate(()=>{
    const root=document.getElementById('root');if(!root)return null;
    // the app renders one flex column inside #root; walk down to the deepest single-child wrapper
    let host=root;while(host.children.length===1&&host.children[0].tagName==='DIV')host=host.children[0];
    const rb=host.getBoundingClientRect();const out=[];
    for(const c of host.children){
      const r=c.getBoundingClientRect();const cs=getComputedStyle(c);
      if(cs.position==='fixed'||cs.position==='absolute')continue;
      out.push({ct:c.getAttribute('data-ct')||'',h:+r.height.toFixed(2),top:+(r.top-rb.top).toFixed(2),
                txt:(c.innerText||'').replace(/\s+/g,' ').trim().slice(0,34)});
    }
    return {hostH:+rb.height.toFixed(2),rows:out};
  });
}
async function scan(b){
  return b.page.evaluate((src)=>{
    const re=new RegExp(src,'i');const out=[];
    for(const el of document.querySelectorAll('body *')){
      if(el.tagName==='STYLE'||el.tagName==='SCRIPT')continue;
      let t='';for(const n of el.childNodes)if(n.nodeType===3)t+=n.textContent;
      t=t.replace(/\s+/g,' ').trim();
      if(!t||t.length>44||!re.test(t))continue;
      const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
      out.push({t,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1)});
    }
    return out;
  },RE.source);
}
async function frame(b,label){
  const bd=await b.board();const rr=await rootRows(b);const hits=await scan(b);
  const real=hits.filter(h=>!STRENGTH.test(h.t));
  console.log('  '+label.padEnd(26)+' board w='+(bd?bd.w.toFixed(2):'null').padStart(7)+
              ' y='+(bd?bd.y.toFixed(2):'null').padStart(7)+
              '  contentH='+(rr?rr.hostH.toFixed(2):'?').padStart(7)+
              '  result='+(real.length>0?'YES "'+real[0].t+'"':'NO ')+
              (hits.length-real.length?'  [+'+(hits.length-real.length)+' strength-note hit]':''));
  if(rr)console.log('      rows: '+rr.rows.map(r=>(r.ct||'·')+':'+r.h+(r.txt?'("'+r.txt+'")':'')).join('  '));
  return {bd,rr,hits,real};
}
async function resign(b){
  await P.tapBtn(b,/^More$/,700);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1200);
}
(async()=>{
  const cases=[
    {id:'L-cpu  730x375',geo:{w:730,h:375,safe:''},bot:true, pp:false},
    {id:'L-pp   730x375',geo:{w:730,h:375,safe:''},bot:false,pp:true},
    {id:'P-cpu  375x730',geo:'kunal730',          bot:true, pp:false},
    {id:'P-pp   375x730',geo:'kunal730',          bot:false,pp:true},
  ];
  for(const c of cases){
    const b=await L.launch({geo:c.geo,name:'p435-'+c.id.trim().replace(/\s+/g,''),store:{ct_pool:'3'}});await b.open();
    const gl=await b.page.evaluate(()=>innerWidth+'x'+innerHeight);
    if(c.pp){await P.states['pp-m0'](b);}
    else{await P.states['setup'](b);if(c.bot)await P.tapBtn(b,/^Pip\n/,200);await P.tapBtn(b,/^▶ Start game$/,900);}
    await b.settle(400);
    console.log('=== '+c.id+' @ '+gl+' ===');
    await frame(b,'LIVE (before resign)');
    await resign(b);
    await b.settle(600);  await frame(b,'+1.8s card up');
    await b.settle(2600); await frame(b,'+4.4s');
    await b.settle(2400); await frame(b,'+6.8s card gone');
    await b.shot('p435-'+c.id.trim().replace(/\s+/g,''));
    await b.close();
  }
  process.exit(0);
})().catch(e=>{console.error('PROBE ERROR',e);process.exit(1);});
