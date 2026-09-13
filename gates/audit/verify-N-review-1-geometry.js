// gates/audit/verify-N-review-1-geometry.js - antagonistic re-measure of N-review-1:
// "Page error 'RuntimeError: unreachable' from the Stockfish worker whenever the engine line runs
// (why playout, analysis board)". Metric: b.errs PAGEERROR count after D.states['why-open'] and after
// D.states['analysis'] (the finder's repro), with the pageerror stack and a timestamp per error.
// Geometries: argv[2] comma list, default se,430,kunal (the last is the finder's own geometry).
//   cd /home/user/chess-trainer && timeout 600 node gates/audit/verify-N-review-1-geometry.js [se,430,kunal] [full]
// 'full' as argv[3] mirrors the audit's ordering more closely: moves-last-engine before why-open.
'use strict';
const path=require('path');
process.env.CT_SHOTS=path.join(__dirname,'..','shots','audit','verify');
const L=require('../lib');
const D=require('../drive/review');
const GEOS={kunal:'kunal',k761:{w:375,h:761,safe:'51,31'},'390':'390',se:'se','430':'430'};
const geos=(process.argv[2]||'se,430,kunal').split(',');
const full=process.argv[3]==='full';
const result={};
L.run(async()=>{
  for(const g of geos){
    const b=await L.launch({geo:GEOS[g],store:{ct_pool:'3'},name:'verify-N-review-1-'+g});
    const pe=[];let cur='boot';
    b.page.on('pageerror',e=>{pe.push({t:new Date().toISOString().slice(11,19),state:cur,msg:String(e&&e.message||e).slice(0,120),stack:String(e&&e.stack||'').replace(/\s+/g,' ').slice(0,260)});});
    await b.open();
    L.note(g+' stamp '+await b.stamp());
    const perState={};
    const seq=full?['moves-last-engine','why-open','analysis']:['why-open','analysis'];
    for(const s of seq){
      cur=s;const t0=Date.now();
      try{await D.states[s](b);}catch(e){L.say(false,g+' '+s+' threw: '+String(e).split('\n')[0].slice(0,160));}
      await b.settle(1500); // give a late trap a chance to land before counting
      const m=await b.metrics();
      const pageErrs=b.errs.filter(x=>/^PAGEERROR/.test(x)).length;
      const unreachable=b.errs.filter(x=>/unreachable/.test(x)).length;
      perState[s]={ms:Date.now()-t0,errs:b.errs.length,pageErrs,unreachable,board:m.board,over:m.over.over,engline:await b.page.locator('[data-ct="rev-engline"]').last().isVisible().catch(()=>false)};
      console.log('MEASURE '+g+' '+s+' errs='+b.errs.length+' pageErrs='+pageErrs+' unreachable='+unreachable+' engline='+perState[s].engline+' ms='+perState[s].ms);
      await b.shot(g+'-'+s);
    }
    // does the engine survive the trap? the engine line text and the eval label before and after one more move (Ng1-f3)
    if(process.argv[4]==='probe'){
      const eng=async()=>({line:await b.text('[data-ct="rev-engline"]'),eval:await b.text('[data-ct="eval-bar-num"]')});
      const e0=await eng();await b.settle(10000);const e1=await eng();
      cur='probe-nf3';await b.move('g1','f3',600);await b.settle(4000);const e2=await eng();
      // back to the trap position: chess.jsx caches {line:''} for a FEN whose sfBestLine timed out (7.2 s), so the '…' would be permanent
      cur='probe-undo';await b.tapText(/^↶ Undo$/);await b.settle(2500);const e3=await eng();
      const errsAfter=b.errs.filter(x=>/unreachable/.test(x)).length;
      console.log('PROBE '+g+' engline at 1.e4 e5='+JSON.stringify(e0)+' +10s='+JSON.stringify(e1)+' after Nf3 +4s='+JSON.stringify(e2)+' after Undo (1.e4 e5 again) +2.5s='+JSON.stringify(e3)+' unreachable now='+errsAfter);
      const workers=b.page.workers().length;console.log('PROBE '+g+' live workers='+workers);
      perState['probe']={e0,e1,e2,e3,unreachable:errsAfter,workers};await b.shot(g+'-probe-undo');
    }
    for(const e of pe)console.log('   PAGEERROR '+g+' during '+e.state+' @'+e.t+' '+e.msg+' :: '+e.stack.slice(0,200));
    if(b.noise.length)L.note(g+' network noise x'+b.noise.length);
    result[g]={perState,pageerrors:pe.map(e=>e.state+'@'+e.t+' '+e.msg),otherErrs:b.errs.filter(x=>!/unreachable/.test(x)).slice(0,3)};
    L.say(true,g+' finished; final b.errs='+b.errs.length+' (unreachable '+b.errs.filter(x=>/unreachable/.test(x)).length+')');
    await b.close();
  }
  console.log('RESULT '+JSON.stringify(result));
},'VERIFY-N-review-1');
