// claude/agents/probes/434-cpu-result-line.js  #434
// Measures the #433 auditor's P1 (jobs/cpu-game-over-says-nothing-three-seconds-later-2026-09-29)
// and the ONE BRANCH THAT JOB NAMES AS UNMEASURED: what the screen says when eloMsg is EMPTY.
//
// Four inputs, one probe, every one at a geometry that is named in the output:
//   A  vs Computer (Pip, 500 Elo), resign at move 0, 375x730  - the reported defect
//   B  vs Computer at the Elo FLOOR (ct_elo 400, no bot tap), resign at move 0, 375x730
//      ne = max(400, 400-50) = 400 == cpuElo, so chess.jsx:3144 never fires and eloMsg stays ''.
//      This is the job's honestCaveat: "where the strength does NOT change, eloMsg is empty and
//      the result should appear - that state is unmeasured and is the first thing to check."
//   C  Pass & Play, resign at move 0, 375x730 - the auditor's control, which keeps its result
//   D  vs Computer (Pip), resign at move 0, 730x375 LANDSCAPE - `wide` is true there, and
//      chess.jsx:5616 does not render the status line AT ALL when a game is over and wide.
//      Nothing in the job covers this; it is the class-sweep site [R06].
//
// The scan is the auditor's own: every painted element whose own text is under 44 chars and
// matches the result vocabulary, head/style excluded, plus the status line read directly.
const L=require('../../../gates/lib');const P=require('../../../gates/drive/play');
const RE=/won|win|lose|lost|Time!|Resigned|Checkmate|Stalemate|draw/i;

async function scan(b){
  return await b.page.evaluate((src)=>{
    const re=new RegExp(src,'i');const out=[];
    for(const el of document.querySelectorAll('body *')){
      if(el.tagName==='STYLE'||el.tagName==='SCRIPT')continue;
      let t='';for(const n of el.childNodes)if(n.nodeType===3)t+=n.textContent;
      t=t.replace(/\s+/g,' ').trim();
      if(!t||t.length>44||!re.test(t))continue;
      const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
      out.push({t,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)});
    }
    return out;
  },RE.source);
}
async function resign(b){
  await P.tapBtn(b,/^More$/,700);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1200);
}
async function readAll(b,label,geoLabel){
  const card=await b.text('[data-ct="result-card"]');
  const line=await b.text('[data-ct="play-opening"]');
  const hits=await scan(b);
  const bd=await b.board();
  console.log(JSON.stringify({case:label,geo:geoLabel,card,statusLine:line,board:bd&&{x:+bd.x.toFixed(2),y:+bd.y.toFixed(2),w:+bd.w.toFixed(2)},resultHits:hits},null,1));
  return {card,line,hits,bd};
}

(async()=>{
  const cases=[
    {id:'A-cpu-pip-500',geo:'kunal730',store:{ct_pool:'3'},bot:true,pp:false},
    {id:'B-cpu-elo-floor-400',geo:'kunal730',store:{ct_pool:'3',ct_elo:'400'},bot:false,pp:false},
    {id:'C-passplay-control',geo:'kunal730',store:{ct_pool:'3'},bot:true,pp:true},
    {id:'D-cpu-pip-LANDSCAPE',geo:{w:730,h:375,safe:''},store:{ct_pool:'3'},bot:true,pp:false},
    {id:'E-passplay-LANDSCAPE',geo:{w:730,h:375,safe:''},store:{ct_pool:'3'},bot:false,pp:true},
  ];
  for(const c of cases){
    const b=await L.launch({geo:c.geo,name:'p434-'+c.id,store:c.store});await b.open();
    const gl=(await b.page.evaluate(()=>innerWidth+'x'+innerHeight));
    if(c.pp){await P.states['pp-m0'](b);}
    else{await P.states['setup'](b);if(c.bot)await P.tapBtn(b,/^Pip\n/,200);await P.tapBtn(b,/^▶ Start game$/,900);}
    await b.settle(300);
    const elo=await b.page.evaluate(()=>{try{return localStorage.getItem('ct_elo');}catch(e){return 'n/a';}});
    const bdLive=await b.board();
    await resign(b);
    console.log('--- '+c.id+' @ '+gl+' (ct_elo before resign: '+elo+'; LIVE board w='+(bdLive&&bdLive.w.toFixed(2))+' y='+(bdLive&&bdLive.y.toFixed(2))+') ---');
    await b.settle(600);await readAll(b,c.id+' @+1.8s (card still up)',gl);
    await b.settle(5000);const r=await readAll(b,c.id+' @+6.8s (card gone)',gl);
    await b.shot('p434-'+c.id);
    console.log('VERDICT '+c.id+': result on screen at +6.8s = '+(r.hits.length>0)+'  statusLine='+JSON.stringify(r.line));
    await b.close();
  }
  process.exit(0);
})().catch(e=>{console.error('PROBE ERROR',e);process.exit(1);});
