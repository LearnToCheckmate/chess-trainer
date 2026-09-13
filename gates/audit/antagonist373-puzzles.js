// gates/audit/antagonist373-puzzles.js  ANTAGONIST #373: A-10 (Next puzzle advances before solving; pzNextInTier with
// `from`) and X-07 (wrong-move wording on phones). The gate pressed Next once and Previous once at kunal/390. Here:
// the whole tier walked with Next until it wraps (dead presses? wrap where?), Next after SOLVING a puzzle, Next at the
// END of the tier, at 320x568, 430x932 (vp.h>=820: the LONG wrong-move form on a phone) and kunal.
'use strict';
const L=require('../lib');
const GEOS=[['se','se'],['430','430'],['kunal','kunal']];
const sig=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?im.getAttribute('src').slice(-12):'';}).join('|');});
const msg=(b)=>b.page.evaluate(()=>{const els=[...document.querySelectorAll('div,span,p')].filter(d=>d.children.length===0&&/^(✗|✓|👁|💡)/.test((d.innerText||'').trim()));const e=els[0];if(!e)return null;const r=e.getBoundingClientRect();const box=e.parentElement;const br=box.getBoundingClientRect();const st=getComputedStyle(e),bst=getComputedStyle(box);return {text:(e.innerText||'').trim(),w:Math.round(r.width),h:Math.round(r.height*10)/10,lines:Math.round(r.height/parseFloat(st.lineHeight||st.fontSize)*10)/10,scrollW:e.scrollWidth,clientW:e.clientWidth,boxH:Math.round(br.height*10)/10,boxOverflow:bst.overflow,boxScrollH:box.scrollHeight,boxClientH:box.clientHeight,clipped:(e.scrollWidth>e.clientWidth+1)||(box.scrollHeight>box.clientHeight+1),whiteSpace:st.whiteSpace};});
// squares highlighted after "Show move": cells whose inline style differs from the rest of their colour class
const revealSquares=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const kids=[...g.children].slice(0,64);const st=kids.map(c=>{const s=getComputedStyle(c);return (s.boxShadow||'')+'#'+(s.outline||'')+'#'+(c.style.background||'')+'#'+(c.style.boxShadow||'');});const cnt={};st.forEach(s=>cnt[s]=(cnt[s]||0)+1);const rare=kids.map((c,i)=>({i,s:st[i],img:!!c.querySelector('img'),src:(c.querySelector('img')||{}).getAttribute?(c.querySelector('img').getAttribute('src')):''})).filter(x=>cnt[x.s]<=2);return rare;});
const cellCenter=(b,i)=>b.page.evaluate((i)=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const r=g.children[i].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},i);
async function solveCurrent(b,tag){
  for(let step=0;step<6;step++){
    const t=await b.texts();if(t.some(x=>/Next puzzle/.test(x))&&(await b.page.evaluate(()=>!![...document.querySelectorAll('div,span')].find(d=>d.children.length===0&&/^✓/.test((d.innerText||'').trim())))))return true;
    try{await b.tapText(/Show move/,{wait:400});}catch(e){L.note(tag+': no Show move button: '+t.join('|').slice(0,120));return false;}
    const m=await msg(b);const rare=await revealSquares(b);
    const from=rare.find(x=>x.img),to=rare.find(x=>!x.img)||rare.find(x=>x.img&&x!==from);
    if(!from||!to){L.note(tag+': could not read the revealed squares '+JSON.stringify(rare).slice(0,200)+' msg '+(m&&m.text));return false;}
    const c1=await cellCenter(b,from.i),c2=await cellCenter(b,to.i);await b.page.mouse.click(c1.x,c1.y);await b.settle(200);await b.page.mouse.click(c2.x,c2.y);await b.settle(900);
    const m2=await msg(b);if(m2&&/^✓/.test(m2.text))return true;
  }
  return false;
}
L.run(async()=>{
  for(const [tag,geo] of GEOS){
    const b=await L.launch({geo,name:'ant-puz-'+tag});await b.open();
    try{
      await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900});
      const s0=await sig(b);const seen=[s0];let dead=0,wrapAt=-1;
      for(let k=1;k<=60;k++){await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(350);const s=await sig(b);if(s===seen[seen.length-1])dead++;if(s===s0){wrapAt=k;break;}seen.push(s);}
      L.say(wrapAt>1&&dead===0,tag+': A-10 Next walks the tier without a dead press and wraps to the first puzzle (distinct '+seen.length+', wrap after '+wrapAt+' presses, dead '+dead+')');
      const distinct=new Set(seen).size;L.say(distinct===seen.length,tag+': A-10 no puzzle repeats inside one lap of the tier ('+distinct+' of '+seen.length+')');
      // at the END of the tier (one press before the wrap): Previous then Next must land on the same last puzzle, not the first
      for(let k=1;k<wrapAt;k++){await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(250);}
      const last=await sig(b);await b.page.locator('[aria-label="Previous puzzle"]').first().click();await b.settle(400);const prev=await sig(b);await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(400);const back=await sig(b);
      L.say(last===seen[seen.length-1]&&prev===seen[seen.length-2]&&back===last,tag+': A-10 at the tier END Previous goes back one and Next returns to the last puzzle (not the first)',{lastIsLast:last===seen[seen.length-1],prevOk:prev===seen[seen.length-2],backOk:back===last,backIsFirst:back===s0});
      // Previous from the tier's FIRST puzzle: where does it go?
      await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(400);const first=await sig(b);await b.page.locator('[aria-label="Previous puzzle"]').first().click();await b.settle(400);const beforeFirst=await sig(b);
      L.note(tag+': Previous from the tier start lands on '+(beforeFirst===seen[seen.length-1]?'the tier LAST puzzle (wraps)':(seen.includes(beforeFirst)?'a puzzle inside the tier':'a puzzle OUTSIDE the tier'))+' (first ok '+(first===s0)+')');
    }catch(e){L.say(false,tag+': tier walk threw',String(e).slice(0,160));}
    // solve one, then Next
    try{
      await b.open();await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900});const a0=await sig(b);
      const solved=await solveCurrent(b,tag);const m=await msg(b);
      L.say(solved,tag+': A-10 the first puzzle can be solved through Show move',m&&m.text);
      if(solved){
        const nb=await b.page.evaluate(()=>{const e=document.querySelector('[aria-label="Next puzzle"]');const r=e.getBoundingClientRect();return {t:(e.innerText||'').trim(),h:Math.round(r.height),w:Math.round(r.width)};});
        await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(500);const a1=await sig(b);
        await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(500);const a2=await sig(b);
        L.say(a1!==a0&&a2!==a1&&a2!==a0,tag+': A-10 after solving, Next advances and Next again does not return to the solved puzzle',{btn:nb});
        await b.page.locator('[aria-label="Previous puzzle"]').first().click();await b.settle(500);const a3=await sig(b);
        L.say(a3===a1,tag+': A-10 Previous from there returns to the puzzle after the solved one');
        // walk to the end of the tier after solving p0: Next must never show the solved puzzle again until every other is done
        const walk=[];for(let k=0;k<60;k++){await b.page.locator('[aria-label="Next puzzle"]').first().click();await b.settle(250);const s=await sig(b);walk.push(s);if(s===a1&&k>0)break;}
        L.say(!walk.slice(0,-1).includes(a0),tag+': A-10 one lap after solving p0 never re-shows p0 (lap '+walk.length+' presses)');
      }
    }catch(e){L.say(false,tag+': solve section threw',String(e).slice(0,160));}
    // X-07: a wrong move
    try{
      await b.open();await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900});
      await b.tapText(/Show move/,{wait:400});const rare=await revealSquares(b);const from=rare.find(x=>x.img);const to=rare.find(x=>!x.img)||rare.find(x=>x.img&&x!==from);
      const col=from&&/([wb])[A-Z]/.exec(from.src||'')?/([wb])[A-Z]/.exec(from.src)[1]:null;
      // pick another piece of the side to move and any legal target other than the solution's
      const alt=await b.page.evaluate((from)=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const kids=[...g.children].slice(0,64);const fsrc=(kids[from].querySelector('img')||{}).getAttribute('src');const colour=/\/([wb])[A-Z]/.exec(fsrc||'')||/([wb])[A-Z]\.(svg|png)/.exec(fsrc||'');const c=colour?colour[1]:null;const cand=kids.map((k,i)=>({i,src:(k.querySelector('img')||{getAttribute:()=>''}).getAttribute('src')||''})).filter(x=>x.i!==from&&x.src&&(c?new RegExp('([/_-]|^)'+c+'[A-Z]').test(x.src):true));return {c,fsrc,cand:cand.map(x=>x.i)};},from?from.i:0);
      let wrong=null;
      for(const i of alt.cand.slice(0,12)){const c=await cellCenter(b,i);await b.page.mouse.click(c.x,c.y);await b.settle(200);const t=await revealSquares(b);const tg=t.filter(x=>x.i!==i&&!(from&&to&&(x.i===from.i||x.i===to.i)));
        const legal=await b.page.evaluate((i)=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const kids=[...g.children].slice(0,64);const base={};kids.forEach((k,j)=>{const s=getComputedStyle(k);const key=(s.boxShadow||'')+'#'+(k.style.background||'')+'#'+(k.style.boxShadow||'')+'#'+(k.querySelector('div,span:not(:empty)')?'m':'');base[key]=(base[key]||0)+1;});return kids.map((k,j)=>{const s=getComputedStyle(k);const key=(s.boxShadow||'')+'#'+(k.style.background||'')+'#'+(k.style.boxShadow||'')+'#'+(k.querySelector('div,span:not(:empty)')?'m':'');return {j,n:base[key]};}).filter(x=>x.n<=12&&x.j!==i).map(x=>x.j);},i);
        const target=legal.find(j=>!(to&&j===to.i));
        if(target!=null){const c2=await cellCenter(b,target);await b.page.mouse.click(c2.x,c2.y);await b.settle(700);const m=await msg(b);if(m&&/^✗/.test(m.text)){wrong=m;break;}}
        await b.page.mouse.click(c.x,c.y);await b.settle(150);}
      L.say(!!wrong,tag+': X-07 a wrong move produced the ✗ line',wrong&&wrong.text);
      if(wrong){const short=/isn't it\. Try again, or tap 💡\.$/.test(wrong.text),long=/Tap 💡 for a hint\.\)$/.test(wrong.text);
        L.say(!wrong.clipped,tag+': X-07 the ✗ line is not clipped (text w '+wrong.scrollW+' in '+wrong.clientW+', box '+wrong.boxScrollH+'/'+wrong.boxClientH+', lines '+wrong.lines+')',{form:short?'short':(long?'long':'?'),vh:b.geo.h,ws:wrong.whiteSpace});
        L.note(tag+': vp.h='+b.geo.h+' -> '+(short?'SHORT':(long?'LONG':'unknown'))+' form: "'+wrong.text+'"');
        await b.shot('puz-'+tag+'-wrong');}
    }catch(e){L.say(false,tag+': wrong-move section threw',String(e).slice(0,160));}
    L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'ANT-PUZZLES');
