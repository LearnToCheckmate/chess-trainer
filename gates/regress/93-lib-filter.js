'use strict';
// gates/regress/93-lib-filter.js - A LONG LESSON LIST HAS ONE FILTER BOX AND COUNTS ITS SECTIONS. TC-S08a..c, US-HM-16.
//
// WHY [#550, item (77) of directOpening_2026_11_11_batch10;
// jobs/bench-97-lesson-list-is-5934px-of-scroll-with-no-filter-and-no-position-marker-2026-10-06]. Measured at #549 on bd8c4a7: the
// Openings list was 96 rows and 5867px of scroll (8.71 screens at kunal761) with no search, filter, jump or position marker, and its
// section headers do not stick. Kunal answered on 8 Oct 2026 for counts and a filter on these lists ("Yes, same rule everywhere"), and
// orchestratorRuling_2026_11_07 names the control: ONE 44px filter box under the group header of Openings, Gambits and Endgames,
// matching a lesson's name and idea on either side, and each section's count; no sticky headers and no jump chips.
//
// WHAT IT ASSERTS, per list, at kunal761 and se, nothing stored:
//  (a) [data-ct=lib-filter] is there, 44px tall (within 1), below the header's Back button and above the first lesson row.
//  (b) THE EXPECTED SET IS READ FROM THE PAGE BEFORE ANY FILTERING, not from the filter's own code: every row's name and idea line,
//      unfiltered. Then for each text typed, the rows left must equal BY NAME the unfiltered rows whose name or idea contains the
//      text (lower-cased, accents folded). The texts are chosen so that one holds exactly one row, one holds several, and one holds
//      none (which must also show [data-ct=lib-filter-none]); the 1 / several / 0 shape is itself asserted on the unfiltered set, so
//      a text that stops meaning what it was chosen for goes red instead of quietly testing something else.
//  (c) the list header [data-ct=lib-group-n] reads the row count unfiltered and 'shown of total' filtered (Endgames is one
//      section with no label, so this is its count); every section count [data-ct=lib-sec-n] equals the rows under it, unfiltered and filtered, and so does each group header's
//      count where it has one; after Back and re-entry the box is empty and the full list is back.
// CONTROL-RECORD: 09bc4bd 2026-11-11 total=23 red=16 scope=trial:3ab724514641 how=#550 item (77): origin/main's bundle (no filter box, no counts) - the box, every section-count and header-count line red, and the gate stops typing; the unfiltered DENOMINATORS green
// CONTROL-RECORD: 09bc4bd 2026-11-11 total=97 red=6 scope=trial:e97b154ce4fa how=#550 item (77): libHit matching the NAME only (the idea line dropped) - 'sicilian' 16 of 18, 'gambit' 45 of 47 and 'king' 3 of 19 red at both geometries; the counts stay green because they agree with whatever is shown
const L=require('../lib');const H=require('../drive/home');

const LISTS=[
  {state:'discover-openings',tile:/^🚀 Openings /,name:'Openings',one:'catalan',several:'sicilian',none:'zqxv',accent:'reti'},
  {state:'discover-gambits',tile:/^⚔️ Gambits /,name:'Gambits',one:null,several:'gambit',none:'zqxv'},
  {state:'discover-endgames',tile:/^👑 Endgames /,name:'Endgames',secs:false,one:null,several:'king',none:'zqxv'},
];
const fold=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

async function read(b){return b.page.evaluate(()=>{
  const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
  const rows=[...document.querySelectorAll('button')].filter(x=>vis(x)&&/^[♔♚]/.test((x.textContent||'').trim()));
  const out=rows.map(x=>{const sp=x.children[1];const nm=sp&&sp.children[0]?sp.children[0].childNodes[0]:null;return {name:nm?String(nm.textContent).trim():'',idea:sp&&sp.children[1]?sp.children[1].textContent.trim():'',top:x.getBoundingClientRect().top};});
  const secs=[...document.querySelectorAll('[data-ct="lib-sec-n"]')].filter(vis).map(n=>{const box=n.parentElement.parentElement;return {label:n.parentElement.textContent.replace(n.textContent,'').trim(),n:+n.textContent,rows:[...box.querySelectorAll('button')].filter(x=>/^[♔♚]/.test((x.textContent||'').trim())).length};});
  const heads=[];for(const n of document.querySelectorAll('[data-ct="lib-sec-n"]')){const grp=n.parentElement.parentElement.parentElement;const hd=grp&&grp.firstElementChild;if(!hd||hd.querySelector('[data-ct="lib-sec-n"]'))continue;const num=[...hd.querySelectorAll('span')].map(s=>s.textContent.trim()).filter(t=>/^\d+$/.test(t)).pop();if(num==null)continue;const k=hd.textContent.trim();if(heads.find(h=>h.k===k))continue;heads.push({k,n:+num,rows:[...grp.querySelectorAll('button')].filter(x=>/^[♔♚]/.test((x.textContent||'').trim())).length});}
  const gn=document.querySelector('[data-ct="lib-group-n"]');const gnt=gn?gn.textContent.trim():null;
  const box=document.querySelector('[data-ct="lib-filter"]');const back=[...document.querySelectorAll('button')].find(x=>vis(x)&&/^‹ Back$/.test((x.textContent||'').trim()));
  const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),h:+r.height.toFixed(1)};};
  return {rows:out,secs,heads,gnt,box:R(box),boxVal:box?box.value:null,back:R(back),none:!!document.querySelector('[data-ct="lib-filter-none"]')};});}
async function type(b,t){await b.page.fill('[data-ct="lib-filter"]',t);await b.settle(350);}
async function toTop(b){await H.scrollTo(b,'top');await b.settle(200);}

L.run(async()=>{
  for(const geo of (process.env.CT_S08_GEOS||'kunal761,se').split(',')){
    for(const li of LISTS){
      const tag=geo+' '+li.name+': ';
      const b=await L.launch({geo,name:'lib-'+li.name+'-'+geo,store:{}});await b.open();
      let ok=true;try{await H.states[li.state](b);await b.settle(400);}catch(e){ok=false;L.say(false,tag+'TC-S08a the list was reached',String(e).slice(0,160));}
      if(ok){
        const u=await read(b);
        L.say(u.rows.length>=10,tag+'TC-S08b DENOMINATOR the unfiltered list shows '+u.rows.length+' lesson rows, each with a name',{n:u.rows.length,blank:u.rows.filter(r=>!r.name).length});
        L.say(!!u.box&&Math.abs(u.box.h-44)<=1&&!!u.back&&u.box.top>=u.back.bottom&&u.rows.length>0&&u.box.bottom<=u.rows[0].top,tag+'TC-S08a one filter box, 44px tall, under the header and above the first row',{box:u.box,back:u.back,firstRow:u.rows[0]&&u.rows[0].top});
        L.say(u.gnt===String(u.rows.length),tag+'TC-S08c the list header counts its '+u.rows.length+' lessons (reads "'+u.gnt+'")',{gnt:u.gnt});
        if(li.secs!==false)L.say(u.secs.length>0&&u.secs.every(s=>s.n===s.rows),tag+'TC-S08c every section shows its count and it equals its rows, unfiltered ('+u.secs.map(s=>s.label.slice(0,18)+' '+s.n).join(', ')+')',u.secs);
        if(u.heads.length)L.say(u.heads.every(h=>h.n===h.rows),tag+'TC-S08c each group header count equals its rows, unfiltered',u.heads);
        if(u.box){
          const want=t=>u.rows.filter(r=>fold(r.name+' '+r.idea).includes(fold(t))).map(r=>r.name).sort();
          const texts=[[li.one,'one'],[li.several,'several'],[li.none,'none'],[li.accent,'accent']].filter(x=>x[0]);
          for(const [t,kind] of texts){
            const w=want(t);
            const shape=kind==='one'?w.length===1:kind==='several'?w.length>=2&&w.length<u.rows.length:kind==='none'?w.length===0:w.length>=1;
            L.say(shape,tag+'TC-S08b DENOMINATOR "'+t+'" is a '+kind+' text on the unfiltered rows: '+w.length+' of '+u.rows.length,w);
            await type(b,t);await toTop(b);const f=await read(b);const got=f.rows.map(r=>r.name).sort();
            L.say(JSON.stringify(got)===JSON.stringify(w),tag+'TC-S08b "'+t+'" leaves exactly the '+w.length+' row(s) whose name or idea holds it ('+got.length+' shown)',{want:w,got});
            if(kind==='none')L.say(f.none&&f.rows.length===0,tag+'TC-S08b "'+t+'" shows no rows and says no lesson matches',{none:f.none,rows:f.rows.length});
            L.say(f.gnt===f.rows.length+' of '+u.rows.length,tag+'TC-S08c with "'+t+'" the list header reads shown of total ('+f.gnt+')',{gnt:f.gnt,rows:f.rows.length});
            if(kind!=='none')L.say(f.secs.every(s=>s.n===s.rows)&&f.heads.every(h=>h.n===h.rows),tag+'TC-S08c with "'+t+'" every count equals its rows',{secs:f.secs,heads:f.heads});
          }
          await H.tapBtn(b,/^‹ Back$/,500);await H.tapBtn(b,li.tile,700);await toTop(b);   // re-entered by its tile, NOT by the driver state, which reloads a fresh page and would empty the box by construction

          const r2=await read(b);
          L.say(r2.boxVal===''&&r2.rows.length===u.rows.length,tag+'TC-S08a after Back and re-entry the box is empty and all '+u.rows.length+' rows are back',{val:r2.boxVal,rows:r2.rows.length});
        }
      }
      await b.close();
    }
  }
},'93-lib-filter');
