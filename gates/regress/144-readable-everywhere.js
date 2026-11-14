'use strict';
// gates/regress/144-readable-everywhere.js - THE ACCENT BUTTONS, THE CLOCKS AND THE PLAYER BARS READ AT 4.5 TO 1 IN EVERY THEME, THE GRAPH'S GRADES
// CARRY A SHAPE, AND THE SMALL CONTROLS HAVE 44PX TAP AREAS. US-R152 / TC-R220a..g.
//
// WHY [#550, readability check docs/readability-check-2026-11-12, Kunal's pick 12 Nov "Batch 10, serious first"; his words on his own screenshot:
// "T on top on the white background with white text is very hard to see. This is the kind of thing Fable should catch."]: A11Y-01 the flag's
// letters inherited the root's white on the cream bar (1.23 to 1); A11Y-02 white text on the accent fill read 2.07 to 3.40 to 1 across the twelve
// colour themes; A11Y-03 the running clock on the cream bar read about 3 to 1 (and the low-time amber 1.35, the red 2.97); A11Y-10 the eval graph's
// grade dots were colour alone; A11Y-11 the rating on the cream bar was faded to 3.51; A11Y-15 tab bar buttons 43 tall, sheet close buttons 30x30,
// strip moves 22 tall; A11Y-16 the strip moves and the graph dots could not be reached by keyboard.
// WHAT IT READS: the bundle under test (CT_APP). CONTRAST IS COMPOSITED, NOT READ OFF ONE LAYER (CLAUDE.md, "a threshold needs the whole stack under
// it"): from the text element up to the first OPAQUE background-color, every background colour and every background-image gradient is composited in
// paint order at three rows of the text's own glyph box (top, middle, bottom); a top-to-bottom linear gradient is sampled at the row, any other
// gradient contributes every stop and the worst decides; the ink's alpha is multiplied by every ancestor's opacity. Each line prints its inputs:
// ink, effective background, opaque base and where it came from, layer and gradient counts. The themes are ENUMERATED FROM THE BUNDLE (THEMES'
// name:"..",light: entries), not from a list written here, and the skins likewise (SKINS' key:".." entries).
// (a) Review list (Analyze Game, Fetch: every visible button whose fill is the accent) in every colour theme, Classic skin, Pro.
// (b) the same in the Playful and Medieval skins, each at its own palette.
// (c) Play vs the computer on a 1-minute clock at kunal761: the running clock on the cream (white) bar and the idle one on the dark bar, then the
//     same cream-bar clock in its amber band (under 30 s) and its red band (under 10 s). About 55 s of wall clock.
// (d) the Opera Game reviewed with seeded countries (AT for White, US for Black, ct_country): both flag pictures load; the alt text, which the
//     browser draws when a picture cannot load, takes the bar's ink (the img's computed colour composited on its bar); the rating on the cream bar.
// (e) the eval graph in the Review ⋯ sheet: every grade mark carries a non-colour shape (data-mark, drawn as its own element), distinct grades have
//     distinct shapes, each is a focusable named button with a 24px hit circle, and Enter on one jumps to its move.
// (f) tap areas at kunal761 and 320x568, measured by elementFromPoint walked outward from the control's centre in half-pixel steps (so a pseudo-
//     element hit area counts and a neighbour on top does not): tab bar buttons, the Play setup scan buttons, the menu sheet's close, rev-back and
//     rev-more >= 44 in both axes; strip moves at least the strip's own inner height (the strip is 36 tall at his phone - 44 would move the board).
// KNOW ITS LIMIT: the dark bar's RUNNING clock is not reached (the computer answers within a second) and its low-time inks are not either; the
// cream-bar inks were chosen so all six are >= 4.5 on both pills by the same arithmetic (CLK_INK in chess.jsx), which this gate does not re-derive.
// Headless DejaVu glyphs, not his iOS fonts: ratios are font-independent, glyph boxes are not. Secondary greys (A11Y-12), placeholders (A11Y-07,
// a global rule), field edges (A11Y-08), the Discover badge (A11Y-04), tallies (A11Y-09) and every P3 are NOT read here.
// CONTROL-RECORD: 4baf00d 2026-11-14 total=48 red=2 scope=trial:9d44bba256e6 how=#550 helper app A, FMT-B-03 follow-up: the tree before the short-phone Review corners change (the 44x44 back and more in a 32 bar) - TC-R220f se rev-back and rev-more red (tap area 44x35, drawn from y -4); the fix's bundle 92b13a5b8746 reads 48/0
// CONTROL-RECORD: 34a4a6d 2026-11-13 total=46 red=31 scope=trial:9812f33cea74 how=the branch tip before the change (white ink on every accent, one-colour clock inks, root-white flag alt text, colour-only graph dots, 43px tabs, 30px close): 2.07..3.40 on the accents, cream clock 3.56 / amber 1.44 / red 3.17, AT 1.17; on a11a610b8f51 46/0
const L=require('../lib');
/* #550 helper A, r19 audit A4 [jobs/r19-phone-geometry-audit-is-red-on-the-branch-and-a4c-reads-short-as-a-dead-geos-key-2026-11-14]:
   a geometry is asked by its ENTRY (w, h), never its key or label, so a renamed GEOS key throws here instead of silently skipping a branch. */
const geoOf=(geo)=>{const g=typeof geo==='string'?L.GEOS[geo]:geo;if(!g||!(g.w>0))throw new Error('no geometry '+JSON.stringify(geo));return g;};
const isPhone=(geo)=>{const g=geoOf(geo);return g.w===375&&g.h===761;};   // Kunal's phone, R19
const R=require('../drive/review');
const fs=require('fs'),path=require('path');
const APP=process.env.CT_APP||path.join(__dirname,'..','..','app.js');
const SRC=fs.readFileSync(APP,'utf8');
const THEMES=[...SRC.matchAll(/name:"([^"]+)",light:"#[0-9a-fA-F]{6}"/g)].map(m=>m[1]);
const SKINS=[...SRC.matchAll(/\{key:"([a-z]+)",name:"([A-Za-z]+)"/g)].map(m=>m[1]);
const PAL={};for(const m of SRC.matchAll(/\{key:"([a-z]+)",name:"[A-Za-z]+",blurb:"[^"]*",pal:(\d+)/g))PAL[m[1]]=+m[2];
const AA=4.5;
// ── the compositor, injected into the page ────────────────────────────────────────────────────────────────────────────────────────────────
const COMP=`(()=>{
const pc=(s)=>{const m=String(s||'').match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);return [p[0],p[1],p[2],p.length>3?p[3]:1];};
const lin=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const lum=(c)=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const over=(bot,top)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1];};
const hex=(c)=>'#'+c.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const grads=(img)=>{const out=[];if(!img||img==='none')return out;let depth=0,start=-1;const parts=[];
  for(let i=0;i<img.length;i++){const ch=img[i];if(ch==='('){if(depth===0)start=img.lastIndexOf(' ',i)+1;depth++;}else if(ch===')'){depth--;if(depth===0)parts.push(img.slice(start,i+1).trim().replace(/^,\\s*/,''));}}
  for(const p of parts){if(/^url\\(/.test(p)){out.push({kind:'url'});continue;}
    const head=p.slice(0,p.indexOf('('));const body=p.slice(p.indexOf('(')+1,-1);
    const stops=[];const re=/(rgba?\\([^)]*\\))\\s*([\\d.]+%)?/g;let m;while((m=re.exec(body)))stops.push({c:pc(m[1]),pos:m[2]?parseFloat(m[2])/100:null});
    if(!stops.length)continue;if(stops[0].pos==null)stops[0].pos=0;if(stops[stops.length-1].pos==null)stops[stops.length-1].pos=1;
    for(let i=1;i<stops.length-1;i++)if(stops[i].pos==null){let j=i;while(stops[j].pos==null)j++;const a=stops[i-1].pos,bb=stops[j].pos;for(let k=i;k<j;k++)stops[k].pos=a+(bb-a)*(k-i+1)/(j-i+1);}
    const first=body.split(/,(?![^(]*\\))/)[0].trim();
    const vert=/^linear/.test(head)&&(/^rgba?\\(/.test(first)||/^to bottom$/.test(first)||/^180deg$/.test(first));
    out.push({kind:vert?'v':'other',stops});}
  return out;};
const at=(g,f)=>{const s=g.stops;if(f<=s[0].pos)return s[0].c;for(let i=1;i<s.length;i++)if(f<=s[i].pos){const a=s[i-1],b=s[i];const t=(f-a.pos)/((b.pos-a.pos)||1);return [0,1,2,3].map(k=>a.c[k]+(b.c[k]-a.c[k])*t);}return s[s.length-1].c;};
const stack=(el)=>{const L=[];let n=el;while(n&&n.nodeType===1){const cs=getComputedStyle(n);const bc=pc(cs.backgroundColor);const gs=grads(cs.backgroundImage);
  L.push({bc,gs,r:n.getBoundingClientRect(),tag:n.tagName.toLowerCase()+(n.getAttribute('data-ct')?'['+n.getAttribute('data-ct')+']':'')});
  if(bc&&bc[3]>=0.999)break;n=n.parentElement;}
  const top=L[L.length-1];const ok=!!(top&&top.bc&&top.bc[3]>=0.999);return {L,base:ok?top.bc:[0,0,0,1],baseFrom:ok?top.tag:'(no opaque layer: black assumed)'};};
const bgAt=(S,y)=>{let cands=[[...S.base]];for(let i=S.L.length-1;i>=0;i--){const l=S.L[i];const next=[];
    for(const c0 of cands){let c=c0;if(l.bc&&l.bc[3]>0&&!(i===S.L.length-1&&l.bc[3]>=0.999))c=over(c,l.bc);let cs=[c];
      for(const g of l.gs){if(g.kind==='url')continue;const f=Math.max(0,Math.min(1,(y-l.r.top)/(l.r.height||1)));
        if(g.kind==='v')cs=cs.map(x=>over(x,at(g,f)));else{const nx=[];for(const x of cs)for(const s of g.stops)nx.push(over(x,s.c));cs=nx;}}
      next.push(...cs);}
    cands=next;}
  return cands;};
window.__ctCR=(el)=>{const cs=getComputedStyle(el);const fg=pc(cs.color);let op=1;for(let n=el;n&&n.nodeType===1;n=n.parentElement)op*=parseFloat(getComputedStyle(n).opacity||'1');
  const S=stack(el);let rr=null;try{const rg=document.createRange();rg.selectNodeContents(el);const rs=[...rg.getClientRects()].filter(r=>r.width>0&&r.height>0);if(rs.length)rr={top:Math.min(...rs.map(r=>r.top)),bottom:Math.max(...rs.map(r=>r.bottom))};}catch(e){}
  if(!rr){const r=el.getBoundingClientRect();rr={top:r.top,bottom:r.bottom};}
  let worst=null;for(const y of [rr.top+1,(rr.top+rr.bottom)/2,rr.bottom-1])for(const bg of bgAt(S,y)){const f=over(bg,[fg[0],fg[1],fg[2],fg[3]*op]);const r=cr(f,bg);
    if(!worst||r<worst.ratio)worst={ratio:Math.round(r*100)/100,ink:cs.color+(op<1?' x opacity '+Math.round(op*1000)/1000:''),inkEff:hex(f),bg:hex(bg),y:Math.round(y)};}
  return Object.assign(worst,{base:hex(S.base),baseFrom:S.baseFrom,layers:S.L.length,gradients:S.L.reduce((a,l)=>a+l.gs.length,0),text:(el.innerText||el.getAttribute('alt')||'').trim().slice(0,24)});};
// the TAP area: elementFromPoint walked outward from the centre in half-pixel steps; a hit on the element or a descendant counts
window.__ctHit=(el)=>{const r=el.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const own=(x,y)=>{if(x<0||y<0||x>innerWidth||y>innerHeight)return false;const h=document.elementFromPoint(x,y);return !!h&&(h===el||el.contains(h));};
  if(!own(cx,cy))return {w:0,h:0,drawn:[Math.round(r.width*10)/10,Math.round(r.height*10)/10],centre:false};
  const walk=(dx,dy)=>{let k=0;while(k<40&&own(cx+dx*(k+0.5),cy+dy*(k+0.5)))k+=0.5;return k;};
  return {w:walk(-1,0)+walk(1,0),h:walk(0,-1)+walk(0,1),drawn:[Math.round(r.width*10)/10,Math.round(r.height*10)/10],top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,centre:true};};
})()`;
const fmt=(m)=>m?(m.ratio+':1 "'+m.text+'" ink '+m.ink+' -> '+m.inkEff+' on '+m.bg+' (base '+m.base+' from '+m.baseFrom+', '+m.layers+' layers, '+m.gradients+' gradients, row y'+m.y+')'):'(not measured)';
const ACCENT_BTNS=`(()=>{const pc=(s)=>{const m=String(s||'').match(/rgba?\\(([^)]+)\\)/);return m?m[1].split(/[ ,]+/).filter(Boolean).slice(0,3).map(Number).join(','):null;};
  const host=[...document.querySelectorAll('div')].find(d=>d.style.getPropertyValue('--ac'));const ac=host?host.style.getPropertyValue('--ac').trim():'';
  const t=document.createElement('div');t.style.color=ac;document.body.appendChild(t);const acr=pc(getComputedStyle(t).color);t.remove();
  return {ac,btns:[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&r.top<innerHeight&&r.bottom>0&&pc(getComputedStyle(x).backgroundColor)===acr;}).map(x=>window.__ctCR(x))};})()`;
async function themed(b,skin,theme){await b.page.evaluate(([s,t])=>{localStorage.setItem('ct_skin',String(s));localStorage.setItem('ct_theme',String(t));},[skin,theme]);
  await b.page.reload({waitUntil:'domcontentloaded'});await b.settle(1500);await b.page.evaluate(COMP);await b.tile('Review');await b.settle(700);await b.page.evaluate(COMP);return b.page.evaluate(ACCENT_BTNS);}
L.run(async()=>{
  L.say(THEMES.length>=12&&SKINS.indexOf('classic')>=0&&SKINS.indexOf('playful')>=0&&SKINS.indexOf('medieval')>=0,'TC-R220 PRECONDITION the bundle names '+THEMES.length+' colour themes ('+THEMES.join(', ')+') and the skins '+SKINS.join(', '),{THEMES,SKINS,PAL});
  // ── (a)(b) the accent buttons ──
  {const b=await L.launch({geo:'kunal761',name:'ac144',pro:true});await b.open();await b.settle(800);
   const CL=SKINS.indexOf('classic');let seen=0;
   for(let th=0;th<THEMES.length;th++){let r=null;try{r=await themed(b,CL,th);}catch(e){r={ac:'?',btns:[],err:e.message};}
     seen+=r.btns.length;const w=r.btns.reduce((a,x)=>(!a||x.ratio<a.ratio)?x:a,null);
     L.say(r.btns.length>=2&&r.btns.every(x=>x.ratio>=AA),'TC-R220a theme '+th+' '+THEMES[th]+' (accent '+r.ac+'): '+r.btns.length+' accent-filled buttons on the Review list, worst '+fmt(w),r.btns.map(x=>x.text+' '+x.ratio));}
   L.say(seen>=2*THEMES.length,'TC-R220a DENOMINATOR '+seen+' accent-filled buttons measured over '+THEMES.length+' themes (at least 2 each)');
   for(const sk of ['playful','medieval']){const si=SKINS.indexOf(sk),th=PAL[sk]!=null?PAL[sk]:2;let r=null;try{r=await themed(b,si,th);}catch(e){r={ac:'?',btns:[]};}
     const w=r.btns.reduce((a,x)=>(!a||x.ratio<a.ratio)?x:a,null);
     L.say(r.btns.length>=2&&r.btns.every(x=>x.ratio>=AA),'TC-R220b skin '+sk+' at its palette '+th+' '+(THEMES[th]||'?')+' (accent '+r.ac+'): '+r.btns.length+' accent-filled buttons, worst '+fmt(w),r.btns.map(x=>x.text+' '+x.ratio));}
   L.say(b.errs.length===0,'TC-R220a zero app errors over the theme walk',b.errs.slice(0,3));await b.close();}
  // ── (c) the clocks ──
  {const b=await L.launch({geo:'kunal761',name:'clk144'});await b.open();await b.settle(800);let ok=true;
   try{await b.tile('Play');await b.settle(600);await b.tapText(/^Computer$/).catch(()=>{});await b.settle(500);
     ok=await b.page.evaluate(()=>{const s=[...document.querySelectorAll('span')].find(x=>(x.innerText||'').trim()==='1 min');if(!s)return false;s.click();return true;});await b.settle(400);
     await b.page.evaluate(()=>{const s=[...document.querySelectorAll('button')].find(x=>/Start game/.test(x.innerText));s.scrollIntoView();s.click();});await b.settle(1500);}catch(e){ok=false;}
   await b.page.evaluate(COMP);
   const read=()=>b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="pbar-clock"]')].map(e=>{const bar=e.closest('[data-ct="pbar-top"],[data-ct="pbar-bottom"]');const bb=getComputedStyle(bar).backgroundImage;return {light:/241, 240, 232|#f1f0e8/.test(bb),low:e.getAttribute('data-low')||'',t:e.innerText,m:window.__ctCR(e)};}));
   const c0=ok?await read():[];const lt=c0.find(x=>x.light),dk=c0.find(x=>!x.light);
   L.say(!!lt&&!!dk,'TC-R220c PRECONDITION a 1-minute game vs the computer shows a clock on the cream bar and one on the dark bar',c0.map(x=>(x.light?'cream ':'dark ')+x.t));
   L.say(!!lt&&lt.m.ratio>=AA,'TC-R220c the RUNNING clock on the cream (white) bar: '+fmt(lt&&lt.m));
   L.say(!!dk&&dk.m.ratio>=AA,'TC-R220c the idle clock on the dark bar: '+fmt(dk&&dk.m));
   try{await b.move('e2','e4');await b.settle(2500);}catch(e){}   // a clock starts on the first move; after the computer answers, White's runs
   let amber=null,red=null;const t0=Date.now();
   while(Date.now()-t0<62000&&!(amber&&red)){await b.settle(900);const cs=await read();const l=cs.find(x=>x.light);if(!l)break;if(l.low==='amber'&&!amber)amber=l;if(l.low==='red'&&!red&&l.t!=='0:00')red=l;}
   L.say(!!amber&&amber.m.ratio>=AA,'TC-R220c the cream-bar clock in its AMBER band (under 30 s): '+(amber?amber.t+' ':'not reached ')+fmt(amber&&amber.m));
   L.say(!!red&&red.m.ratio>=AA,'TC-R220c the cream-bar clock in its RED band (under 10 s): '+(red?red.t+' ':'not reached ')+fmt(red&&red.m));
   L.say(b.errs.length===0,'TC-R220c zero app errors',b.errs.slice(0,3));await b.close();}
  // ── (d)(e)(f-review) the Review move screen ──
  for(const geo of ['kunal761','se']){
   const b=await L.launch({geo,name:'rev144-'+geo,store:{ct_pool:'3',ct_country:JSON.stringify({'cc:jsmiller1112':'AT','cc:dukekarlcountisouard99':'US'})}});await b.open();await b.settle(800);
   let ok=true;try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,10);await b.settle(1200);}catch(e){ok=false;}
   await b.page.evaluate(COMP);
   if(isPhone(geo)){
     const d=await b.page.evaluate(()=>({flags:[...document.querySelectorAll('[data-ct^="pbar-flag-"]')].map(e=>({ct:e.getAttribute('data-ct'),nw:e.naturalWidth,m:window.__ctCR(e)})),
       rating:(()=>{const e=document.querySelector('[data-ct="pbar-rating-w"]');return e?window.__ctCR(e):null;})()}));
     const fw=d.flags.find(x=>x.ct==='pbar-flag-w'),fb=d.flags.find(x=>x.ct==='pbar-flag-b');
     L.say(ok&&!!fw&&!!fb&&fw.nw>0&&fb.nw>0,'TC-R220d PRECONDITION both flags are on the bars and their pictures loaded ('+d.flags.map(x=>x.ct+' '+x.nw+'px').join(', ')+')');
     L.say(!!fw&&fw.m.ratio>=AA,'TC-R220d the cream bar flag\'s alt text (drawn when the picture cannot load) takes the bar\'s ink: '+fmt(fw&&fw.m));
     L.say(!!fb&&fb.m.ratio>=AA,'TC-R220d the dark bar flag\'s alt text likewise: '+fmt(fb&&fb.m));
     L.say(!!d.rating&&d.rating.ratio>=AA,'TC-R220d the rating on the cream bar: '+fmt(d.rating));
     // (e) the graph's grade marks, in the ⋯ sheet
     let sh=true;try{await b.tapCt('rev-more',600);}catch(e){sh=false;}
     const g=await b.page.evaluate(()=>{const sheet=document.querySelector('[data-ct="rev-sheet"]');if(!sheet)return null;
       const dots=[...sheet.querySelectorAll('[data-ct="eval-graph-dot"]')];const circles=[...sheet.querySelectorAll('svg circle')].length;
       return {circles,dots:dots.map(e=>{const hit=e.querySelector('[data-ct="eval-graph-hit"]');const hr=hit?hit.getBoundingClientRect():null;const drawn=[...e.children].filter(c=>c!==hit&&c.tagName!=='title');
         return {g:e.getAttribute('data-grade'),mark:e.getAttribute('data-mark'),drawn:drawn.map(c=>c.tagName+(c.tagName==='g'?'('+[...c.children].map(x=>x.tagName).join('+')+')':'')).join(','),tab:e.getAttribute('tabindex'),role:e.getAttribute('role'),name:e.getAttribute('aria-label')||'',hit:hr?Math.round(Math.min(hr.width,hr.height)*10)/10:0};})};});
     const dots=(g&&g.dots)||[];
     L.say(sh&&dots.length>=3,'TC-R220e PRECONDITION the ⋯ sheet\'s eval graph draws '+dots.length+' grade marks (grades '+[...new Set(dots.map(x=>x.g))].join(', ')+'; svg circles in the sheet '+(g?g.circles:'-')+')');
     L.say(dots.length>0&&dots.every(x=>x.mark&&x.drawn),'TC-R220e every grade mark carries a non-colour SHAPE drawn as its own element',dots.map(x=>x.g+':'+x.mark+'='+x.drawn));
     const byG={};for(const x of dots){(byG[x.g]=byG[x.g]||new Set()).add(x.mark+'|'+x.drawn);}
     const sig=Object.entries(byG).map(([k,v])=>k+'->'+[...v].join('/'));const all=Object.values(byG).map(v=>[...v][0]);
     L.say(Object.keys(byG).length>=2&&Object.values(byG).every(v=>v.size===1)&&new Set(all).size===all.length,'TC-R220e distinct grades have distinct shapes ('+sig.join('; ')+')');
     L.say(dots.length>0&&dots.every(x=>x.tab==='0'&&x.role==='button'&&x.name.indexOf(x.g)===0&&x.hit>=23.9),'TC-R220e every mark is a focusable button named by its grade and move, with a 24px hit circle (smallest '+(dots.length?Math.min(...dots.map(x=>x.hit)):'-')+')',dots.slice(0,4).map(x=>x.name+' tab '+x.tab+' hit '+x.hit));
     const before=await b.page.evaluate(()=>[...document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]')].findIndex(x=>x.style.boxShadow&&x.style.boxShadow!=='none')+1);
     let target=null;if(dots.length){target=await b.page.evaluate(()=>{const ds=[...document.querySelectorAll('[data-ct="rev-sheet"] [data-ct="eval-graph-dot"]')];const d=ds[ds.length-1];d.focus();return {name:d.getAttribute('aria-label'),focused:document.activeElement===d};});await b.page.keyboard.press('Enter');await b.settle(900);}
     const after=await b.page.evaluate(()=>({ply:[...document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]')].findIndex(x=>x.style.boxShadow&&x.style.boxShadow!=='none')+1,sheet:!!document.querySelector('[data-ct="rev-sheet"]')}));
     L.say(!!target&&target.focused&&after.ply!==before&&after.ply>0,'TC-R220e the keyboard reaches a mark and Enter jumps to its move ('+(target?target.name:'-')+': ply '+before+' -> '+after.ply+', sheet '+(after.sheet?'open':'closed')+')');
     // strip moves reach the keyboard too
     const sk=await b.page.evaluate(()=>{const s=[...document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]')];return {n:s.length,focusable:s.filter(x=>x.tabIndex===0&&x.getAttribute('role')==='button').length};});
     L.say(sk.n>0&&sk.focusable===sk.n,'TC-R220e every move in the strip is a focusable button ('+sk.focusable+' of '+sk.n+')');
   }
   // (f) tap areas on the Review move screen
   if(await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-sheet"]'))){await b.page.mouse.click(8,8);await b.settle(400);}
   const ht=await b.page.evaluate(()=>{const o={};for(const k of ['rev-back','rev-more']){const e=document.querySelector('[data-ct="'+k+'"]');o[k]=e?window.__ctHit(e):null;}
     const s=[...document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]')];const strip=document.querySelector('[data-mstrip]');const cur=s.find(x=>{const r=x.getBoundingClientRect();return r.left>strip.getBoundingClientRect().left+30&&r.right<strip.getBoundingClientRect().right-30;});
     o.strip=cur?window.__ctHit(cur):null;o.stripInner=strip?strip.clientHeight:0;return o;});
   for(const k of ['rev-back','rev-more']){const t='TC-R220f '+geo+' '+k+' tap area '+(ht[k]?ht[k].w+'x'+ht[k].h+' (drawn '+ht[k].drawn.join('x')+')':'absent');
     // #550 helper app A, FMT-B-03 follow-up: at 320x568 this was a NOTE ('drawn from y-4 and the horizontal eval bar paints over its last
     // 5px'); the corners now draw 30 tall inside the 32 bar with a 44 tap area, so it is asserted at both geometries, with the drawn box
     // inside the screen (top >= 0) - the walk counts no point above y 0, so a button drawn off the top cannot reach 44 by this measure.
     L.say(!!ht[k]&&ht[k].w>=44&&ht[k].h>=44&&ht[k].top>=0,t+', drawn from y '+(ht[k]?ht[k].top:'-')+' (inside the screen, >= 0)');}
   L.say(!!ht.strip&&ht.strip.h>=ht.stripInner-1,'TC-R220f '+geo+' a strip move\'s tap area is the strip\'s full inner height '+ht.stripInner+' (KNOWN LIMIT: not 44 - the strip is that tall and growing it moves the board): '+(ht.strip?ht.strip.w+'x'+ht.strip.h+' drawn '+ht.strip.drawn.join('x'):'absent'));
   // the Review list: the tab bar (on Play setup it sits UNDER the setup layer, so it is read here, where it is on top)
   let rl=true;try{await R.toList(b);}catch(e){rl=false;}
   await b.page.evaluate(COMP);
   const tbh=await b.page.evaluate(()=>{const tb=[...document.querySelectorAll('[data-ct="tabbar"]')].find(t=>t.getBoundingClientRect().height>0);return tb?[...tb.querySelectorAll('button')].map(x=>({t:(x.innerText||'').trim(),h:window.__ctHit(x)})):[];});
   L.say(rl&&tbh.length===5&&tbh.every(x=>x.h.w>=44&&x.h.h>=44),'TC-R220f '+geo+' the five tab bar buttons (Review list) have 44px tap areas: '+tbh.map(x=>x.t+' '+x.h.w+'x'+x.h.h+' (drawn '+x.h.drawn.join('x')+')').join(', '));
   // Play setup: scan buttons, the menu sheet's close
   let ps=true;try{await b.home();await b.tile('Play');await b.settle(600);await b.tapText(/^Computer$/).catch(()=>{});await b.settle(500);}catch(e){ps=false;}
   await b.page.evaluate(COMP);
   const pt=await b.page.evaluate(()=>({sc:['scan-camera','scan-upload'].map(k=>{const e=document.querySelector('[data-ct="'+k+'"]');return {t:k,h:e?window.__ctHit(e):null};})}));
   L.say(ps&&pt.sc.every(x=>x.h&&x.h.w>=44&&x.h.h>=44),'TC-R220f '+geo+' the scan buttons: '+pt.sc.map(x=>x.t+' '+(x.h?x.h.w+'x'+x.h.h+' (drawn '+x.h.drawn.join('x')+')':'absent')).join(', '));
   let mo=true;try{await b.page.evaluate(()=>{const m=[...document.querySelectorAll('button')].filter(x=>(x.innerText||'').trim()==='☰'&&x.getBoundingClientRect().width>0);m[0].click();});await b.settle(600);}catch(e){mo=false;}
   const mc=await b.page.evaluate(()=>{const c=[...document.querySelectorAll('button')].filter(x=>(x.innerText||'').trim()==='✕'&&x.getBoundingClientRect().width>0&&x.getBoundingClientRect().top<innerHeight);return c.map(x=>({name:x.getAttribute('aria-label')||'',h:window.__ctHit(x)}));});
   L.say(mo&&mc.length>=1&&mc.every(x=>x.name==='Close'&&x.h.w>=44&&x.h.h>=44),'TC-R220f '+geo+' the menu sheet\'s close button is named and has a 44px tap area: '+mc.map(x=>'"'+x.name+'" '+x.h.w+'x'+x.h.h+' (drawn '+x.h.drawn.join('x')+')').join(', '));
   L.say(b.errs.length===0,'TC-R220g '+geo+' zero app errors',b.errs.slice(0,3));await b.close();}
},'144-readable-everywhere');
// SELECTOR-OPENED: eval-graph-dot reading=precondition round 2: PRECONDITION dots at least 3
// SELECTOR-OPENED: eval-graph-hit reading=precondition round 2: read inside the dots the precondition requires
