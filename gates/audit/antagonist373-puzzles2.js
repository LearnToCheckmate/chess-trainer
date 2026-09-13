// gates/audit/antagonist373-puzzles2.js  ANTAGONIST #373 (second pass): A-10 with the walk cap raised to a full tier
// (921 puzzles / 8 tiers = ~115) at 320x568; Next after SOLVING one (the reveal button reads "👁 Show" on phones) at
// se / 430 / kunal; X-07 at 430x932 (vp.h >= 820 -> the LONG wrong-move form on a phone) and at se / kunal (short form).
'use strict';
const L=require('../lib');
const sig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
const msg=(b)=>b.page.evaluate(()=>{const els=[...document.querySelectorAll('div,span,p')].filter(d=>d.children.length===0&&/^(✗|✓|👁|💡)/.test((d.innerText||'').trim()));const e=els[0];if(!e)return null;const r=e.getBoundingClientRect();const box=e.parentElement;const br=box.getBoundingClientRect();const st=getComputedStyle(e),bst=getComputedStyle(box);const lh=parseFloat(st.lineHeight)||parseFloat(st.fontSize)*1.3;return {text:(e.innerText||'').trim(),w:Math.round(r.width),h:Math.round(r.height*10)/10,lines:Math.round(r.height/lh*10)/10,scrollW:e.scrollWidth,clientW:e.clientWidth,scrollH:e.scrollHeight,clientH:e.clientHeight,boxH:Math.round(br.height*10)/10,boxOverflow:bst.overflow,boxScrollH:box.scrollHeight,boxClientH:box.clientHeight,clipped:(e.scrollWidth>e.clientWidth+1)||(e.scrollHeight>e.clientHeight+1)||(box.scrollHeight>box.clientHeight+1),whiteSpace:st.whiteSpace,fontSize:st.fontSize,bottom:Math.round(r.bottom),vh:innerHeight};});
const cells=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const kids=[...g.children].slice(0,64);return kids.map((c,i)=>{const s=getComputedStyle(c);const im=c.querySelector('img');const r=c.getBoundingClientRect();return {i,bg:c.style.background||c.style.backgroundColor||'',bs:c.style.boxShadow||'',ol:c.style.outline||'',cbs:s.boxShadow,cbg:s.backgroundColor,img:im?im.getAttribute('src'):'',mark:!!c.querySelector(':scope > div:not(:has(img)), :scope > span'),x:r.left+r.width/2,y:r.top+r.height/2};});});
// squares that differ from the two normal square styles (light/dark) - the reveal / selection / target marks
async function marked(b){const cs=await cells(b);const key=(c)=>c.cbs+'#'+c.cbg+'#'+c.bs+'#'+c.ol+'#'+(c.mark?'m':'');const cnt={};cs.forEach(c=>{const k=key(c);cnt[k]=(cnt[k]||0)+1;});return cs.filter(c=>cnt[key(c)]<=8);}
async function solveCurrent(b,tag){
  for(let step=0;step<6;step++){
    const m0=await msg(b);if(m0&&/^✓/.test(m0.text))return true;
    try{await b.tapText(/^👁 Show/,{wait:450});}catch(e){L.note(tag+': no 👁 Show button');return false;}
    const m=await msg(b);const rare=await marked(b);
    const from=rare.find(x=>x.img),to=rare.find(x=>!x.img)||rare.find(x=>x.img&&x.i!==(from&&from.i));
    if(!from||!to){L.note(tag+': could not read the revealed squares: '+JSON.stringify(rare.map(x=>({i:x.i,img:x.img.slice(-8),cbs:x.cbs.slice(0,30),bg:x.bg.slice(0,30)}))).slice(0,300)+' msg '+(m&&m.text));return false;}
    await b.page.mouse.click(from.x,from.y);await b.settle(200);await b.page.mouse.click(to.x,to.y);await b.settle(1000);
    const m2=await msg(b);if(m2&&/^✓/.test(m2.text))return true;
  }
  return false;
}
async function start(b){await b.open();await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900});}
L.run(async()=>{
  for(const [tag,geo,walk] of [['se','se',true],['430','430',false],['kunal','kunal',false]]){
    const b=await L.launch({geo,name:'ant-puz2-'+tag});
    if(walk){try{
      await start(b);const s0=await sig(b);const seen=[s0];let dead=0,wrapAt=-1;
      for(let k=1;k<=140;k++){await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(220);const s=await sig(b);if(s===seen[seen.length-1])dead++;if(s===s0){wrapAt=k;break;}seen.push(s);}
      L.say(wrapAt>1&&dead===0,tag+': A-10 Next walks the whole tier without a dead press and wraps to the first puzzle (distinct '+seen.length+', wrap after '+wrapAt+' presses, dead '+dead+')');
      L.say(new Set(seen).size===seen.length,tag+': A-10 no puzzle repeats inside one lap ('+new Set(seen).size+' of '+seen.length+')');
      if(wrapAt>1){for(let k=1;k<wrapAt;k++){await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(150);}
        const last=await sig(b);await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(400);const wrapped=await sig(b);await b.page.locator('[aria-label="Previous puzzle"]').first().click();await b.settle(400);const back=await sig(b);
        L.say(last===seen[seen.length-1]&&wrapped===s0&&back===last,tag+': A-10 at the tier END: Next wraps to the first, Previous from the first returns to the last',{lastOk:last===seen[seen.length-1],wrapOk:wrapped===s0,backOk:back===last});}
    }catch(e){L.say(false,tag+': walk threw',String(e).slice(0,160));}}
    try{
      await start(b);const a0=await sig(b);const solved=await solveCurrent(b,tag);const m=await msg(b);
      L.say(solved,tag+': A-10 the first puzzle is solved through 👁 Show',m&&m.text);
      if(solved){const nb=await b.page.evaluate(()=>{const e=document.querySelector('[aria-label="Next puzzle"]');const r=e.getBoundingClientRect();return {t:(e.innerText||'').trim(),h:Math.round(r.height),w:Math.round(r.width)};});
        await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(500);const a1=await sig(b);
        await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(500);const a2=await sig(b);
        L.say(a1!==a0&&a2!==a1&&a2!==a0,tag+': A-10 after solving, Next advances and Next again does not return to the solved puzzle',{btn:nb});
        await b.page.locator('[aria-label="Previous puzzle"]').first().click();await b.settle(500);const a3=await sig(b);L.say(a3===a1,tag+': A-10 Previous from there returns to the puzzle after the solved one');
        await b.page.locator('[aria-label="Previous puzzle"]').first().click();await b.settle(500);const a4=await sig(b);const solvedNow=await b.page.evaluate(()=>[...document.querySelectorAll('button')].some(x=>/Next puzzle ›|✓/.test(x.innerText||'')));
        L.say(a4===a0,tag+': A-10 Previous again lands on the solved puzzle (still reachable, marked solved '+solvedNow+')');
        await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(500);const a5=await sig(b);L.say(a5===a1,tag+': A-10 Next from the solved puzzle goes to the one after it (not to a later unsolved)');}
    }catch(e){L.say(false,tag+': solve section threw',String(e).slice(0,160));}
    try{
      await start(b);await b.tapText(/^👁 Show/,{wait:450});const rare=await marked(b);const from=rare.find(x=>x.img),to=rare.find(x=>!x.img)||rare.find(x=>x.img&&x.i!==(from&&from.i));
      const colour=from?(/([wb])[A-Z]\.(svg|png)|\/([wb])[A-Z]|([wb])_[a-z]/.exec(from.img)||[]).slice(1).find(Boolean):null;
      const cs=await cells(b);const own=cs.filter(c=>c.img&&c.i!==(from&&from.i)&&(colour?new RegExp('(^|[/_-])'+colour+'[A-Z_]').test(c.img):true));
      let wrong=null;
      for(const c of own.slice(0,14)){await b.page.mouse.click(c.x,c.y);await b.settle(220);const mk=await marked(b);const tg=mk.filter(x=>x.i!==c.i&&!(from&&x.i===from.i)&&!(to&&x.i===to.i)&&!x.img);if(!tg.length){await b.page.mouse.click(c.x,c.y);await b.settle(120);continue;}
        await b.page.mouse.click(tg[0].x,tg[0].y);await b.settle(800);const mm=await msg(b);if(mm&&/^✗/.test(mm.text)){wrong=mm;break;}await b.page.mouse.click(c.x,c.y);await b.settle(120);}
      L.say(!!wrong,tag+': X-07 a wrong move produced the ✗ line',wrong&&wrong.text);
      if(wrong){const short=/isn't it\. Try again, or tap 💡\.$/.test(wrong.text),long=/Tap 💡 for a hint\.\)$/.test(wrong.text);
        L.say(!wrong.clipped,tag+': X-07 the ✗ line is not clipped (text '+wrong.scrollW+'/'+wrong.clientW+' wide, '+wrong.scrollH+'/'+wrong.clientH+' tall, box '+wrong.boxScrollH+'/'+wrong.boxClientH+', lines '+wrong.lines+', ws '+wrong.whiteSpace+', font '+wrong.fontSize+')',{form:short?'short':(long?'long':'?'),vh:b.geo.h,bottom:wrong.bottom});
        L.note(tag+': vp.h='+b.geo.h+' -> '+(short?'SHORT':(long?'LONG':'unknown'))+' form: "'+wrong.text+'"');await b.shot('puz2-'+tag+'-wrong');}
    }catch(e){L.say(false,tag+': wrong-move section threw',String(e).slice(0,160));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-PUZZLES2');
