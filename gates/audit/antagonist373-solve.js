// gates/audit/antagonist373-solve.js  ANTAGONIST #373: A-10 AFTER solving. The earlier solver could not read the revealed
// squares; this one reads the SAN from the 👁 line ("👁 Play Re8+ — squares highlighted."), takes its destination square,
// and clicks every piece until one offers that target. Then: Next from the solved puzzle, Next again, Previous back,
// and Next from the solved puzzle a second time - at 320x568, kunal and 430x932. Also: solve, walk to the tier END, Next.
'use strict';
const L=require('../lib');
const sig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
const msg=(b)=>b.page.evaluate(()=>{const els=[...document.querySelectorAll('div,span,p')].filter(d=>d.children.length===0&&/^(✗|✓|👁|💡|🎉)/.test((d.innerText||'').trim()));const e=els[els.length-1];return e?(e.innerText||'').trim():null;});
const cells=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const kids=[...g.children].slice(0,64);return kids.map((c,i)=>{const s=getComputedStyle(c);const im=c.querySelector('img');const r=c.getBoundingClientRect();return {i,key:s.boxShadow+'#'+s.backgroundColor+'#'+(c.style.background||'')+'#'+(c.style.outline||'')+'#'+(c.children.length),img:im?im.getAttribute('src'):'',x:r.left+r.width/2,y:r.top+r.height/2};});});
async function marked(b){const cs=await cells(b);const cnt={};cs.forEach(c=>{cnt[c.key]=(cnt[c.key]||0)+1;});return cs.filter(c=>cnt[c.key]<=8);}
async function solve(b,tag){
  for(let step=0;step<6;step++){
    const m0=await msg(b);if(m0&&/^(✓|🎉)/.test(m0))return m0;
    await b.tapText(/^👁 Show/,{wait:450});const m=await msg(b);const san=(m||'').replace(/^👁 Play\s*/,'').split(/\s/)[0];
    const sqm=(san.replace(/=.*/,'').match(/[a-h][1-8]/g)||[]).pop();if(!sqm){L.note(tag+': no destination in "'+m+'"');return null;}
    const bd=await b.board();const f=sqm.charCodeAt(0)-97,r=parseInt(sqm[1]);const dest=bd.flip?(r-1)*8+(7-f):(8-r)*8+f;
    const cs=await cells(b);const base=await marked(b);let done=false;
    for(const c of cs.filter(x=>x.img)){await b.page.mouse.click(c.x,c.y);await b.settle(180);const mk=await marked(b);if(mk.some(x=>x.i===dest&&!base.some(y=>y.i===dest&&y.key===x.key))){const d=cs[dest];await b.page.mouse.click(d.x,d.y);await b.settle(1100);done=true;break;}await b.page.mouse.click(c.x,c.y);await b.settle(80);}
    if(!done){L.note(tag+': no piece offered '+sqm+' for '+san);return null;}
    const m2=await msg(b);if(m2&&/^(✓|🎉)/.test(m2))return m2;
  }
  return null;
}
const next=(b)=>b.page.locator('[aria-label="Next puzzle"]').first().click().then(()=>b.settle(450));
const prev=(b)=>b.page.locator('[aria-label="Previous puzzle"]').first().click().then(()=>b.settle(450));
L.run(async()=>{
  for(const [tag,geo] of [['se','se'],['kunal','kunal'],['430','430']]){
    const b=await L.launch({geo,name:'ant-solve-'+tag});await b.open();
    try{
      await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900});
      const a0=await sig(b);const m=await solve(b,tag);
      L.say(!!m,tag+': A-10 the first puzzle is solved through the 👁 line',m);
      if(m){const nb=await b.page.evaluate(()=>{const e=document.querySelector('[aria-label="Next puzzle"]');if(!e)return null;const r=e.getBoundingClientRect();return {t:(e.innerText||'').trim(),h:Math.round(r.height),w:Math.round(r.width)};});
        await next(b);const a1=await sig(b);await next(b);const a2=await sig(b);
        L.say(a1!==a0&&a2!==a1&&a2!==a0,tag+': A-10 after solving, Next advances and Next again does not return to the solved puzzle',{btn:nb});
        await prev(b);const a3=await sig(b);L.say(a3===a1,tag+': A-10 Previous returns to the puzzle after the solved one');
        await prev(b);const a4=await sig(b);L.say(a4===a0,tag+': A-10 Previous again lands on the solved puzzle');
        const m4=await msg(b);const btns=await b.texts();L.note(tag+': on the solved puzzle again: msg "'+(m4||'')+'" buttons '+btns.join('|').slice(0,120));
        await next(b);const a5=await sig(b);L.say(a5===a1,tag+': A-10 Next from the solved puzzle goes to the one after it');
        // walk to the tier end and press Next there: it should wrap to the tier start, skipping the solved first puzzle (goes to the 2nd)
        let s=a5,steps=0;const seen=new Set([a5]);for(let k=0;k<130;k++){await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(160);s=await sig(b);steps++;if(seen.has(s))break;seen.add(s);}
        L.say(s===a1&&steps>5,tag+': A-10 at the tier END Next wraps past the SOLVED first puzzle to the second one (lap of '+steps+' presses, landed on '+(s===a1?'2nd':s===a0?'SOLVED 1st':'other')+')');
        await b.shot('solve-'+tag+'-after-lap');}
    }catch(e){L.say(false,tag+': threw',String(e).slice(0,200));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-SOLVE');
