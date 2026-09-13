// gates/audit/antagonist373-foolsmate.js  ANTAGONIST #373 (N-review-2 follow-up): a mate delivered by BLACK on the
// analysis board with the engine line on (1.f3 e5 2.g4 Qh4#) read "M1" in antagonist373-label.js. Sample the label
// every 500 ms for 8 s after the mating move to tell a race from a steady state; the same with the engine line OFF.
'use strict';
const L=require('../lib');const R=require('../drive/review');
L.run(async()=>{
  for(const eng of [true,false]){
    const b=await L.launch({geo:'kunal',name:'ant-fools-'+(eng?'eng':'noeng'),store:{ct_pool:'3'}});await b.open();
    try{
      await R.states['moves-ply0'](b);await R.engineSet(b,eng);await b.settle(800);await b.tapCt('rev-fab',700);
      await b.move('f2','f3',400);await b.move('e7','e5',400);await b.move('g2','g4',400);const before=await b.text('[data-ct="eval-bar-num"]');await b.move('d8','h4',300);
      const samples=[];for(let i=0;i<16;i++){samples.push((await b.text('[data-ct="eval-bar-num"]'))+'/'+((await b.text('[data-ct="rev-engline"]'))||'-').slice(0,8));await b.settle(500);}
      const ml=await b.text('[data-ct="rev-move-line"]');const last=samples[samples.length-1];
      L.say(/^0-1/.test(last),'kunal engine '+(eng?'ON':'OFF')+': Fool\'s mate on the analysis board: label after 8 s reads 0-1 (before Qh4#: '+before+'; samples '+samples.join(' ')+'; move line '+(ml||'').slice(0,40)+')');
      await b.shot('fools-kunal-'+(eng?'eng':'noeng'));
    }catch(e){L.say(false,'threw',String(e).slice(0,200));}
    await b.close();
  }
},'ANT-FOOLS');
