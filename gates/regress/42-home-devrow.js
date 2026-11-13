// regress/42-home-devrow.js  THE TWO DEV BUTTONS MUST COVER NOTHING, AND MUST STILL BE REACHABLE.
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED [#550 item (59); jobs/twenty-four-regress-gates-force-ct-pool-on-every-launch-and-no-harness-route-reaches-the-single-worker-fallback-2026-10-21]: every launch in this file passes ct_pool, so the app runs its POOLED Stockfish path and the single-worker and built-in fallbacks (the harness route is the launch option engineFail 'pool' or 'all', driven by gate 34) are NOT exercised here. Its assertions do NOT depend on that branch: it never opens a review or a game: the dev buttons on Home only.
//
// Kunal, A-05: "Keep them, just move them clear." Note empty, so the answer is unconditional - keep the
// buttons, stop them covering things. The gate has to hold BOTH halves, because each is easy to satisfy by
// breaking the other: deleting them covers nothing, and leaving them fixed in the corner keeps them reachable.
//
// WHAT THEY COVERED, measured on #385 before they moved: at 375x730 each overlapped the "New to chess?"
// banner by 7px and the Look-picker row by 9px; at 320x568 BOTH sat entirely on the Review tile - 34x34 of
// full overlap on its 84x84 icon, a primary navigation target. There was no horizontal room to move them
// into (the home column is 339 wide inside 375, so an 18px gutter cannot hold a 34px button), so they moved
// out of `fixed` and into the flow at the foot of the column.
//
// WHICH PUTS THEM BELOW THE FOLD, so this gate carries the reachability rule with it. CLAUDE.md: "below the
// fold" is not "unreachable", `#root` never scrolls BY DESIGN, and the only honest test is to find an
// ancestor that a FINGER can scroll and actually scroll it, then re-read the rect. `scrollIntoView` is not
// that test - script can scroll an overflow:hidden box a finger cannot.
// CONTROL-RECORD: 6180c2b 2026-11-11 total=46 red=6 scope=trial:455ff0ea4f3f how=#550 AUD-H01 (answer a18): the tree before the compact Home (dev buttons 34x34 below the fold) - the six '44x44' lines red at 375x730, 320x568 and 390x844; the in-flow, reach and covers-nothing lines green on both trees. On t52 (28378590a526) 46 of 46 green
// CONTROL-RECORD: e4a169a 2026-11-12 total=46 red=6 scope=trial:3ab724514641 how=#550 re-control of the gate as it stands today (the control audit read ASSERTIONS-MOVED): origin/main's own #549 bundle, which carries none of batch 10 - first red: 375x730: the preview button is 44x44 - the same button, moved into the
'use strict';
const L=require('../lib');

const SELS=[['preview','[data-ct="home-preview"]'],['feedback','[data-ct="home-feedback"]']];

// what each button overlaps: painted, text-bearing, not an ancestor or descendant of it
const covers=(b,sel)=>b.page.evaluate((s)=>{
  const el=document.querySelector(s); if(!el)return null;
  const r=el.getBoundingClientRect(),out=[];
  /* #550 H01: ONLY WHAT THE HOME LAYER PAINTS CAN BE COVERED. Home is a fixed full-viewport layer over the tab screens, which stay
     mounted under it (CLAUDE.md, "the app keeps several screens mounted at once"); once the compact Home put the dev row on the first
     screen at 390x844, the Learn screen's header and Tactics row UNDER the layer read as "covered" - text no finger can reach there. */
  let H=null;for(let p=el.parentElement;p&&p!==document.documentElement;p=p.parentElement){if(getComputedStyle(p).position==='fixed'){H=p;break;}}
  for(const o of document.body.querySelectorAll('*')){
    if(o===el||el.contains(o)||o.contains(el))continue;
    if(H&&!H.contains(o))continue;
    if(o.ownerSVGElement)continue;
    const q=o.getBoundingClientRect();
    if(q.width<2||q.height<2)continue;
    const st=getComputedStyle(o);
    if(st.display==='none'||st.visibility==='hidden'||parseFloat(st.opacity||'1')===0)continue;
    const ix=Math.min(r.right,q.right)-Math.max(r.left,q.left);
    const iy=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);
    if(ix<=1||iy<=1)continue;
    if(o.children.length>3)continue;                       // containers repeat their children's boxes
    const t=(o.innerText||'').replace(/\s+/g,' ').trim();
    if(!t)continue;
    out.push({t:t.slice(0,40),ix:Math.round(ix*10)/10,iy:Math.round(iy*10)/10});
  }
  return out;
},sel);

const geom=(b,sel)=>b.page.evaluate((s)=>{
  const el=document.querySelector(s); if(!el)return null;
  const r=el.getBoundingClientRect(),st=getComputedStyle(el);
  // "IN THE FLOW" IS A QUESTION ABOUT THE ANCESTORS, NOT THE ELEMENT. The first version of this gate asked
  // only for the button's own `position`, and a control that pinned the ROW to the corner sailed past it -
  // the buttons stayed `static` inside a `fixed` parent and were just as much over the content as before.
  // So the chain is what is reported: the nearest pinned ancestor, if there is one.
  let pinned=null;
  for(let p=el;p&&p!==document.documentElement;p=p.parentElement){
    const ps=getComputedStyle(p).position;
    if(ps==='fixed'||ps==='sticky'){pinned={tag:p.tagName.toLowerCase(),ct:p.getAttribute('data-ct'),pos:ps};break;}
  }
  let pinnedFull=false;if(pinned){for(let p=el;p&&p!==document.documentElement;p=p.parentElement){const ps=getComputedStyle(p).position;if(ps==='fixed'||ps==='sticky'){const q=p.getBoundingClientRect();pinnedFull=q.width>=innerWidth-1&&q.height>=innerHeight-1;break;}}}
  return {pos:st.position,pinned,pinnedFull,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,
    top:Math.round(r.top*10)/10,left:Math.round(r.left*10)/10};
},sel);

// THE REACHABILITY RULE, as gates/regress/40-reachability.js implements it: only ancestors a finger can
// scroll count, the scroll is actually performed, the rect is re-read, and the scrollTops are put back.
const reachable=(b,sel)=>b.page.evaluate((s)=>{
  const el=document.querySelector(s); if(!el)return {found:false};
  const before=el.getBoundingClientRect();
  const scrollers=[];
  for(let p=el.parentElement;p&&p!==document.documentElement;p=p.parentElement){
    const oy=getComputedStyle(p).overflowY;
    if((oy==='auto'||oy==='scroll')&&p.scrollHeight>p.clientHeight+1)scrollers.push({el:p,was:p.scrollTop});
  }
  let best=null;
  for(const sc of scrollers){
    sc.el.scrollTop=sc.el.scrollHeight;                     // a finger CAN do this
    const r=el.getBoundingClientRect();
    const onScreen=r.top>=0&&r.bottom<=window.innerHeight+0.5;
    if(onScreen){best={by:sc.el.scrollHeight-sc.was,top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10};}
  }
  const after=el.getBoundingClientRect();
  const moved=Math.abs(after.top-before.top)>1;
  for(const sc of scrollers)sc.el.scrollTop=sc.was;         // leave the page as we found it
  return {found:true,scrollers:scrollers.length,moved,onScreenAfterScroll:!!best,detail:best,
    beforeTop:Math.round(before.top*10)/10,vh:window.innerHeight};
},sel);

L.run(async()=>{
  for(const g of [{k:'kunal730',label:'375x730'},{k:'se',label:'320x568'},{k:{w:390,h:844},label:'390x844'}]){
    const b=await L.launch({geo:g.k,name:'devrow-'+g.label,store:{ct_pool:'3'}});
    await b.home(); await b.settle(700);

    for(const [name,sel] of SELS){
      const gm=await geom(b,sel);
      L.say(!!gm,g.label+': the '+name+' button still exists - "Keep them" is half the answer and deleting them would satisfy the other half',gm);
      if(gm){
        const sc=await reachable(b,sel);
        /* #550 H01: where the compact Home FITS (390x844: nothing scrolls) "moves with the content" cannot be performed, so the
           in-flow half is asserted from the chain instead: no scroller exists, and the nearest pinned ancestor is the full-viewport
           Home layer itself, not a row or corner box - which is what a corner-pinned control would show. */
        L.say(sc.found&&(sc.moved||(sc.scrollers===0&&gm.pinnedFull)),g.label+': the '+name+' button SCROLLS WITH THE CONTENT rather than floating over it - the test is behavioural because the static one is not available: the whole home screen is a legitimate fixed full-viewport layer, so "no fixed ancestor" is red on a correct build, and asking only for the BUTTON\'s own position lets a control that pins the ROW walk straight past. A corner-pinned control does not move when the column scrolls; an in-flow one does',sc);
        L.say(Math.abs(gm.w-44)<0.6&&Math.abs(gm.h-44)<0.6,g.label+': the '+name+' button is 44x44 - the same button, moved into the compact Home\'s one footer row at full tap size [#550 H01; it was 34x34 from #386 to #549]',gm);
      }
      const cv=await covers(b,sel);
      L.say(Array.isArray(cv)&&cv.length===0,g.label+': the '+name+' button covers nothing - measured against every painted, text-bearing element on the screen. Before #386 this was the Review tile at 320 and the banner and Look picker at 375',cv);
    }

    // both sit above the build stamp, which is where "clear" means at the foot of the column
    const st=await geom(b,'[data-ct="home-build"]');
    const pv=await geom(b,'[data-ct="home-preview"]');
    L.say(!!st&&!!pv&&pv.top<st.top,g.label+': the dev row sits above the build stamp at the foot of the column',{row:pv&&pv.top,stamp:st&&st.top});
    const fb=await geom(b,'[data-ct="home-feedback"]');
    L.say(!!pv&&!!fb&&Math.abs(pv.top-fb.top)<0.6&&fb.left>pv.left,g.label+': the two are side by side on one row, preview then feedback',{pv,fb});

    // BELOW THE FOLD IS NOT UNREACHABLE - proved by actually scrolling, not by scrollIntoView
    for(const [name,sel] of SELS){
      const rc=await reachable(b,sel);
      L.say(rc.found&&(rc.beforeTop+34<=rc.vh||rc.onScreenAfterScroll),
        g.label+': the '+name+' button can be brought on screen by a finger - either it is already visible, or an ancestor a finger can scroll brings it there, measured by SCROLLING that ancestor and re-reading the rect',rc);
    }

    // THEY MUST STILL DO SOMETHING, AND THE TAP HAS TO BE THE ONE A USER MAKES. The first version of this
    // assertion tapped where the button sits in the layout and went red at 375x730 and 320x568 while passing
    // at 390x844 - the two geometries where the row is BELOW THE FOLD. That is not the app failing; it is the
    // gate trying to tap something off screen. A user scrolls to it first, so the gate scrolls to it first,
    // using the same finger-scrollable ancestor the reachability check found. Asserting the button is on
    // screen after that scroll is what stops this becoming a tap into empty space that quietly passes.
    const onScreen=await b.page.evaluate(()=>{
      const el=document.querySelector('[data-ct="home-preview"]'); if(!el)return false;
      for(let p=el.parentElement;p&&p!==document.documentElement;p=p.parentElement){
        const oy=getComputedStyle(p).overflowY;
        if((oy==='auto'||oy==='scroll')&&p.scrollHeight>p.clientHeight+1)p.scrollTop=p.scrollHeight;
      }
      const r=el.getBoundingClientRect();
      return r.top>=0&&r.bottom<=window.innerHeight+0.5;
    });
    await b.settle(350);
    L.say(onScreen,g.label+': after scrolling the column to the bottom the preview button is fully on screen, so the tap below lands on a real target rather than into empty space');
    await b.tapCt('home-preview',900);
    // #550 [jobs/an-assertion-keyed-to-a-selector-its-own-build-adds-cannot-control-2026-09-29]: "the gallery opened" is read from the
    // GALLERY - its numbered cards ("N · title", the shape lib.cardTitles reads) painted on screen - not from the home-preview hook (#386,
    // this assertion's own build) having gone. Keyed on the hook's absence, any tap that merely left Home read as "opens the gallery".
    const inPreview=await b.page.evaluate(()=>[...document.querySelectorAll('button')].some(x=>/^\d+ · /.test((x.innerText||'').split('\n')[0])&&x.getBoundingClientRect().height>0));
    L.say(inPreview,g.label+': tapping preview still opens the gallery - a button that covers nothing because it does nothing is not the fix he asked for');

    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,g.label+': zero app errors beyond the allowed engine trap',bad.slice(0,3));
    await b.shot('devrow-'+g.label);
    await b.close();
  }
},'HOME-DEVROW');
// CONTROL-RECORD: 342b80e 2026-11-13 total=46 red=3 scope=trial:851ae98b9f35 how=#550 #432 sweep (the gallery read from its numbered cards): c2, the Preview button leaves Home (setHomeScreen(false)) instead of opening the gallery - 'tapping preview still opens the gallery' red at 375x730, 320x568, 390x844; the hook-absence version (55ca2c7) is GREEN 46/0 on it; on t0 6c4245e05ecc 46/0
