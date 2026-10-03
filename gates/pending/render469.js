// #469 before-and-after at Kunal's 375x730, with a red box on the change.
// Required by the definition of done item (d). Run AFTER the suite, never during it: three subagent
// browsers inside a timing-sensitive suite nearly produced a false red at #419.
// Usage: CT_APP=<bundle> CT_TAG=<before|after> node gates/pending/render469.js
'use strict';
const L=require('../lib');
const P=require('../drive/play');
const TAG=process.env.CT_TAG||'x';

L.run(async()=>{
  const b=await L.launch({geo:{w:375,h:730,safe:'',label:'375x730'},name:'render469-'+TAG});
  await b.open();
  L.note(TAG+': bundle stamp '+(await b.stamp()));
  // a live 3-ply Pass & Play game, left by the house, then back in through the Play tile
  await P.states['pp-m0'](b);
  await b.move('f2','f3'); await b.move('e7','e5'); await b.move('g2','g4');
  await b.settle(350);
  await b.tapCt('play-home',650);
  await b.tile('Play'); await b.settle(700);

  // THE RED BOX goes on the two things that changed, found by WHAT THEY ARE rather than by a hook the
  // fix added - #432's rule, since data-ct="setup-resume" exists only on the after bundle and a box keyed
  // to it would simply be absent on the before, which reads as "nothing changed" instead of "the thing is
  // missing". So: the resume row is located by its text, and the primary button by its own stable data-ct.
  const boxed=await b.page.evaluate(()=>{
    const sheet=document.querySelector('[data-ct="setup-sheet"]');
    if(!sheet)return {err:'no sheet'};
    const out=[];
    const mark=(el,label)=>{
      const r=el.getBoundingClientRect();
      const d=document.createElement('div');
      d.style.cssText=`position:fixed;left:${r.left-3}px;top:${r.top-3}px;width:${r.width+6}px;`
        +`height:${r.height+6}px;border:3px solid #ff2d55;border-radius:14px;z-index:99999;pointer-events:none`;
      document.body.appendChild(d);
      out.push({label,top:Math.round(r.top*100)/100,bottom:Math.round(r.bottom*100)/100,
                w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100,
                txt:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,70)});
    };
    const row=[...sheet.querySelectorAll('button')]
      .find(x=>/resum|game in progress/i.test(x.innerText||''));
    if(row)mark(row,'RESUME ROW (absent on the before bundle - that absence IS the defect)');
    const start=sheet.querySelector('[data-ct="setup-start"]');
    if(start)mark(start,'PRIMARY BUTTON');
    return {sheetH:Math.round(sheet.getBoundingClientRect().height*100)/100,boxed:out};
  });
  L.note(TAG+': '+JSON.stringify(boxed));
  await b.shot('469-'+TAG+'-375x730');
  L.say(!boxed.err,'render469 '+TAG+': the sheet was reached and the boxes drawn',boxed);
  await b.close();
},'render469');
