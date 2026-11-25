'use strict';
// gates/regress/247-invariants-unswept-states-every-ply-and-the-band.js - INVARIANTS 3, 4 AND THE BAND OVER THE STATES GATE 26'S WALK DOES NOT STAND ON: the unswept sheets and
// states (TC-INV-03b, TC-INV-03c, TC-INV-02g), the best-move pill and the move chips at every ply of the reference game (TC-INV-09,
// TC-INV-10), and the eval graph never over the move's explanation in any frame (TC-R239), plus TC-INV-03b's default-run guard.
//
// WHY THIS FILE EXISTS [#553 B2, jobs/gate-26-runs-at-846-of-its-900-seconds-make-it-finish-well-inside-its-limit-2026-11-25; the
// lead's ruling gate26SplitDecision_553, gate number issued in idsIssued_553]: gate 26 ran 895.1 s of the 900 s gates.sh gives every
// gate (trial 18aaa1612b8d, 25 Nov 2026, 630 pass 0 fail), so it could red a full suite by timing out alone. Measured per block on that
// run: the screen walk 420 s, the TC-INV-03b sweep 123 s, the TC-INV-09/10 ply walk 187 s, the TC-R239 band 147 s. The last three are
// independent of the walk (each launches its own browser per geometry or per state), so they moved here BYTE FOR BYTE: no assertion
// text, geometry, settle or wait changed, and PASS(26) + PASS(247) is 630 on one bundle. Every comment below the definitions is the
// comment that stood beside the block in gate 26; the CONTROL-RECORD lines of gate 26 that predate the split stay in gate 26 as its
// history, and this file carries its own from the split on (at its foot).
//   CT_INV_GEOS narrows every block here exactly as it did in gate 26; CT_INV_ONLY=band runs the TC-R239 block alone (the grading
//   machine's pairs use it). Both are opt-in, printed loudly, never set by gates.sh.
// The definitions below are copied from gate 26 unchanged. ROWS, widthOf, ALL_GEOS and GEOS stay in gate 26 too (its walk reads them),
// so a change to one of those is made in both files; ICON_PIN_EXTRA and ICON_PIN_BOTS moved here and live only here.
const L=require('../lib');
const R=require('../drive/review');
const P=require('../drive/play');
const PZ=require('../drive/puzzles');

const ROWS = function(opt){
  const vw=innerWidth, vh=innerHeight;

  let board=null, bw=-1;
  for(const d of document.querySelectorAll('div')){
    if(!/repeat\(8,/.test(d.style.gridTemplateColumns||''))continue;
    const r=d.getBoundingClientRect(); if(r.width<40)continue;
    if(r.width>bw){bw=r.width;board=d;}
  }

  const why=(e)=>{
    const t=e.tagName;
    if(t==='BUTTON')return 'button';
    if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return t.toLowerCase();
    if(e.getAttribute&&e.getAttribute('role')==='button')return 'role';
    if(t==='A'&&e.hasAttribute('href'))return 'a';
    if(e.hasAttribute('onclick'))return 'onclick';
    if(getComputedStyle(e).cursor==='pointer')return 'pointer';
    return null;
  };
  const vis=(r)=>r.width>=1&&r.height>=1&&r.bottom>0&&r.top<vh&&r.right>0&&r.left<vw;

  // THE BOX IS THE MANDATED MEASUREMENT AND THE INK IS THE HONEST ONE, SO BOTH ARE RETURNED.
  // The commission requires the 11-lesson.js method - the SVG's own box, else a Range over the contents - in
  // terms, and for a stated reason: every number already in the flags comes from it, and a second method would
  // make this incomparable with the record it exists to close. So `gh` stays the box and is what invariant 2
  // asserts on. But an SVG's box is its viewBox, NOT its strokes, and the #423 antagonist measured the gap:
  // the lesson footer's chevrons are a 27x27 box carrying a 10.8 x 16.2 polyline, and the puzzle arrows a 20x20
  // box carrying 8 x 12. In both rows the arrows are the SMALLEST ink and the box says they are the largest, so
  // the first version of this file's pin prose described both rows backwards and a fixer acting on it would have
  // shrunk the arrows and made the row worse. `ink` is the union of the painted leaf rects, reported in the log
  // beside every pinned row so the number a fixer reads is the number a player sees.
  const inkH=(e)=>{
    const svg=e.querySelector('svg');
    if(!svg)return null;
    let top=Infinity, bot=-Infinity, n=0;
    const _sw=(k)=>{try{const cs=getComputedStyle(k);if(!cs.stroke||cs.stroke==='none')return 0;const w=parseFloat(cs.strokeWidth)||0;if(!(w>0))return 0;const m=k.getScreenCTM();const sc=m?Math.hypot(m.a,m.b):1;return w*sc/2;}catch(e){return 0;}};   // #550 antagonist A round 2 (P1): the painted ink includes half the stroke; the outline alone read stroked icons ~2px short
    for(const k of svg.querySelectorAll('path,line,circle,ellipse,rect,polyline,polygon,text')){const h=_sw(k);
      for(const r of k.getClientRects()){ if(r.height<0.01&&r.width<0.01)continue; top=Math.min(top,r.top-h); bot=Math.max(bot,r.bottom+h); n++; }
    }
    return n? +(bot-top).toFixed(2) : null;
  };
  // #549 run fix (fixr3d): AN SVG GLYPH IS MEASURED BY ITS UNTRANSFORMED LAYOUT BOX, NOT getBoundingClientRect. The rect
  // includes every transform on the svg and its ancestors, so Home's intro PawnGlyph (viewBox 0 0 48 58, 28px tall in
  // .ct-intro) read 33-35 when it was sampled mid-topple - its wrapper rotates from 1.95s on - and TC-INV-03 / TC-INV-03b went
  // red on a slow machine at kunal730 (33.1) and kunal761 (34.9, 35.5) over a height no icon has. The used width and height
  // from getComputedStyle are the layout box before transforms (plus padding and border when box-sizing is content-box), so
  // the glyph STAYS IN the population and is measured at the size it is drawn at rest; a real size change still moves it.
  // Chosen over excluding the decorative intro subtree because an exclusion would also hide a real resize of that pawn.
  // Falls back to the rect where the computed size does not parse (never seen here).
  const untx=(el)=>{
    const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
    let w=parseFloat(cs.width), h=parseFloat(cs.height);
    if(!isFinite(w)||!isFinite(h))return {w:r.width,h:r.height};
    if(cs.boxSizing!=='border-box'){const s=(a,b)=>(parseFloat(cs[a])||0)+(parseFloat(cs[b])||0);
      w+=s('paddingLeft','paddingRight')+s('borderLeftWidth','borderRightWidth'); h+=s('paddingTop','paddingBottom')+s('borderTopWidth','borderBottomWidth');}
    return {w,h};
  };
  // #549 run fix (fixr5a, antagonist A round 5, A6-R5): THE EXCUSE ABOVE IS FOR ROTATION, NOT FOR SCALE. Computed width and
  // height ignore EVERY transform, so an icon shrunk by transform:scale(0.6) read its unscaled size and TC-INV-03/03b could not
  // see it - #395's "the ink is too small" class, excused by a mechanism wider than the one it was written for (the intro
  // pawn's ctTopL/ctTopR keyframes are rotate + translate, no scale). So the untransformed box is multiplied by the SCALE of the
  // accumulated transform from the svg up to the root (the column norms of the composed 2D matrix, which a rotation or a
  // translation leaves at 1): a toppling pawn still reads 28, and a scaled icon reads its painted size, as it did before 1b6b89e.
  const txScale=(el)=>{
    let M=new DOMMatrix();
    for(let n=el;n&&n.nodeType===1;n=n.parentElement){const cs=getComputedStyle(n);
      let m=new DOMMatrix();
      if(cs.transform&&cs.transform!=='none'){try{m=new DOMMatrix(cs.transform);}catch(_){}}
      if(cs.scale&&cs.scale!=='none'){const p=cs.scale.split(/\s+/).map(parseFloat);if(isFinite(p[0]))m=new DOMMatrix().scale(p[0],isFinite(p[1])?p[1]:p[0]).multiply(m);}
      if(cs.rotate&&cs.rotate!=='none'){/* a rotation contributes no scale */}
      M=m.multiply(M);}
    return {sx:Math.hypot(M.a,M.b),sy:Math.hypot(M.c,M.d)};
  };
  const glyph=(e)=>{
    const svg=e.querySelector('svg');
    if(svg){const g0=untx(svg),k=txScale(svg),g={w:g0.w*k.sx,h:g0.h*k.sy};return {gh:+g.h.toFixed(1),gw:+g.w.toFixed(1),via:'svg',ink:inkH(e)};}
    const rg=document.createRange(); rg.selectNodeContents(e);
    const g=rg.getBoundingClientRect();
    if(g.height<0.5)return null;
    return {gh:+g.height.toFixed(1),gw:+g.width.toFixed(1),via:'range',ink:+g.height.toFixed(2)};
  };
  const label=(e)=>{
    const a=e.getAttribute('aria-label')||e.getAttribute('data-ct')||'';
    if(a)return a.slice(0,34);
    return ((e.innerText||e.textContent||'').trim().replace(/\s+/g,' ')||'<no text>').slice(0,34);
  };
  const path=(e)=>{const b=[];for(let n=e;n&&n!==document.body&&b.length<3;n=n.parentElement){
    b.unshift(n.getAttribute('data-ct')?('['+n.getAttribute('data-ct')+']'):n.tagName.toLowerCase());}return b.join('>');};

  const ctls=[], byWhy={}; let inBoard=0, nested=0, svgKid=0, covered=0; const coveredList=[];
  window.__ctOccl=[];   // TC-INV-13 [#549 item (75)]: every occluded control, kept for REACH below (a JS property, so the DOM is not touched)
  const isCtl=(e)=>!!why(e);
  for(const e of document.querySelectorAll('*')){
    if(!why(e))continue;
    if(board&&board.contains(e)){inBoard++;continue;}
    if(e.namespaceURI&&e.namespaceURI.indexOf('svg')>=0){svgKid++;continue;}
    let anc=false; for(let n=e.parentElement;n;n=n.parentElement){if(isCtl(n)){anc=true;break;}}
    if(anc){nested++;continue;}
    const r=e.getBoundingClientRect(); if(!vis(r))continue;
    // THE THIRD EXCLUSION, AND IT COST A FALSE DEFECT TO FIND. See the header: this app keeps several screens
    // MOUNTED AT ONCE, so laid-out-and-on-screen is not usable. Excluded only when the point at the control's
    // own centre lands on an element that is neither the control, nor inside it, nor an ancestor of it - an
    // ancestor hit means the centre fell on the control's own padding, which is still the control. Excluding
    // shrinks the population, so it can never manufacture a defect; it can only hide one, which is why the
    // count is PINNED per geometry and screen below rather than merely reported.
    // #549 item (74), at kunal761 [the run's finding on dad9bed]: WHEN THE BOX CENTRE IS OFF SCREEN, TC-INV-03b PROBES THE
    // VISIBLE PART. Here a control whose box centre lies OFF the viewport gets elementFromPoint === null, and `hit &&` then
    // counts it as unoccluded. Measured on feedback-home at 375x761 (trial bb925b8d210d): a Home card's 34.85px svg control,
    // box -64..28, sits BEHIND the feedback sheet's 0.62 backdrop with 28px of it on screen; its centre at y=-18 returned
    // null, so it entered TC-INV-03b's set as an added 34. At 375x730 the same card is wholly above the top and vis() drops
    // it, which is why only the inset geometry saw it. The re-probe is OPT-IN (opt.probeVisible, passed by TC-INV-03b only):
    // applied to the main walk it was measured to move the pinned row and occlusion counts on rev-summary at se, kunal730 and
    // short375, rev-more-sheet at se, and TC-INV-03's set at kunal761 - Review header and strip controls partly above the
    // top - which is a population decision for that walk and not this fix.
    let hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    if(!hit && opt && opt.probeVisible) hit=document.elementFromPoint((Math.max(0,r.left)+Math.min(vw,r.right))/2, (Math.max(0,r.top)+Math.min(vh,r.bottom))/2);
    if(hit && hit!==e && !e.contains(hit) && !hit.contains(e)){
      covered++;
      if(coveredList.length<12) coveredList.push({lab:label(e),box:+r.width.toFixed(1)+'x'+r.height.toFixed(1),hitWas:(hit.getAttribute('data-ct')||hit.tagName)});
      window.__ctOccl.push({e,hit,lab:label(e)});
      continue;
    }
    byWhy[why(e)]=(byWhy[why(e)]||0)+1;
    ctls.push({e,w:+r.width.toFixed(1),h:+r.height.toFixed(1),x:+r.left.toFixed(1),y:+r.top.toFixed(1),
               bot:+r.bottom.toFixed(1),rt:+r.right.toFixed(1),g:glyph(e),lab:label(e),p:path(e),
               fs:parseFloat(getComputedStyle(e).fontSize)});
  }

  const kids=new Map();
  for(const c of ctls){const par=c.e.parentElement; if(!par)continue;
    if(!kids.has(par))kids.set(par,[]); kids.get(par).push(c);}
  const rows=[];
  for(const [par,cs] of kids){
    if(cs.length<2)continue;
    const wg=cs.filter(c=>c.g); if(wg.length<2)continue;
    const sorted=wg.slice().sort((a,b)=>a.x-b.x);
    let side=0;
    for(let i=1;i<sorted.length;i++){
      const a=sorted[i-1],b=sorted[i];
      const vOv=Math.min(a.bot,b.bot)-Math.max(a.y,b.y);
      if(vOv>Math.min(a.h,b.h)*0.5&&(b.x-a.rt)>-1)side++;
    }
    if(side<1)continue;
    const hs=wg.map(c=>c.g.gh);
    rows.push({par:path(par), n:wg.length,
               spread:+(Math.max(...hs)-Math.min(...hs)).toFixed(1),
               rawSpread:Math.max(...hs)-Math.min(...hs),   // #545 item (42): compared UNROUNDED, see the filter below
               heights:hs.slice().sort((a,b)=>a-b),
               sig:wg.map(c=>c.lab).sort().join('|'),
               kids:wg.map(c=>({lab:c.lab,gh:c.g.gh,ink:c.g.ink,via:c.g.via,box:c.w+'x'+c.h,fs:c.fs}))});
  }

  // INVARIANT 3's POPULATION IS ICONS, NOT EVERY GLYPH, AND THE DIFFERENCE IS THE WHOLE NUMBER. Measured here:
  // over every glyph the distinct-height count is 20 PER GEOMETRY (22 as a union across three, and an earlier
  // draft of this comment published the union with no scope) and includes 155px, 137.5px and 120.3px entries - those are
  // whole Home CARDS measured through a Range over their multi-line contents. Publishing that as "the app has 22
  // icon sizes" would be #395's container-is-not-its-contents trap with the labels swapped. An icon is an SVG
  // box, or a text node that is ONE grapheme - which is this app's own idiom for an icon (the header hamburger,
  // the wave, the chevron, the pawn). Both counts are reported; only the icon one is asserted.
  const iconH={}, allH={};
  for(const c of ctls){ if(!c.g)continue;
    allH[String(c.g.gh)]=1;
    const txt=(c.e.innerText||c.e.textContent||'').trim();
    const one=[...txt].length<=2&&txt.length>0&&!/^[0-9A-Za-z]+$/.test(txt);
    // #549 item (74) [jobs/invariant-2-and-3-sheets-and-unswept-screens, part (3)]: THE SVG BRANCH ADMITTED ANY SVG BOX, so a
    // 112x112 roadmap rank illustration counted as an 'icon' in a number defended on the ground that it excluded 155px whole
    // cards - the one-grapheme rule disciplined the TEXT half only. An svg now counts as an icon only when its box is at most
    // 48 x 48 (the largest any of the thirteen swept screens carries is 28, so their pinned sets do not move). The 40px coach
    // hair chips on the menu sheet are <=48 and still count; that they are pictures rather than icons is a population call
    // left to jobs/invariant-3-icon-size-target-set, not taken here.
    const svgIcon=c.g.via==='svg'&&c.g.gh<=48&&c.g.gw<=48;
    if(svgIcon||one){ if(!iconH[String(c.g.gh)])iconH[String(c.g.gh)]=[];
      if(iconH[String(c.g.gh)].length<3)iconH[String(c.g.gh)].push(c.lab); }
  }

  // INVARIANT 1's LIST. Reported below every run, and since #545 population (a) of it is asserted as TC-INV-01b
  // (see SMALL_PIN). Before #545 it was reported and not asserted; that deferral is what the list measured.
  const small=ctls.filter(c=>c.w<43.95||c.h<43.95).map(c=>({lab:c.lab,box:c.w+'x'+c.h,p:c.p}));

  return {ctls:ctls.length, byWhy, inBoard, nested, svgKid, covered, coveredList, boardFound:!!board,
          withGlyph:ctls.filter(c=>c.g).length,
          rows:rows.sort((a,b)=>b.spread-a.spread), iconH, allH:Object.keys(allH).map(Number), small};
};


const widthOf=(g)=>L.GEOS[g].w;

// TC-INV-03b's PINNED SETS [#549 item (74)]: the icon heights over the unswept states listed at TC-INV-03b, measured on this run's
// trial bundle by this gate. Same width keying as ICON_PIN, and an unpinned width reports rather than asserts. MEASURED on
// aac698bd851a (#549 trial), identical at se, kunal730 and short375, and at kunal761 and 390 on bb925b8d210d once ROWS re-probes an off-screen centre (below): 17 the sheets' close x (home-newhere, feedback, menu, Look),
// 22 the roadmap's tab bar, 26 the Play setup opponent tiles (Online, Computer, Pass & Play), 30 'More opponents', 40 the bot
// avatars and the menu's coach hair chips. Of antagonist B's five heights 26 and 40 remain; 26.8 (home-newhere) and 36.3
// (feedback-home) no longer occur on this bundle, and 112 (the roadmap illustration) is out by the 48 x 48 svg cap.
// #550 helper B RE-PINNED for Kunal's q44 (08f5354): the 30 was 'More opponents' (bot-row-more), the chevron painted only while the bot row
// scrolled sideways. The opponents now wrap on their own 'Choose your opponent' screen, so the row never overflows and the chip never renders -
// the 30 left with the thing it measured, not with a drifted glyph. Measured by app A on a207ea6 (efa1ab05dd72): 17,20,22,26,40 at se,
// kunal730 and short375. Was {320:[17,20,22,26,30,40], 375:[17,20,22,26,30,40]}.
const ICON_PIN_EXTRA={320:[17,20,22,24.5,25.9,26,32,40], 375:[17,20,22,24.5,25.9,26,40]};   /* RE-PINNED [batch 13 red repair; 1cc57a16, the menu Share row as RowBtn icons]: 24.5 the share icon, 25.9 the feedback bubble (a developer's row), measured on 6e02e303 (trial 0075dfcc49e3) at se, kunal730 and short375. WAS {320:[17,20,22,26,32,40], 375:[17,20,22,26,40]} */   /* #550 helper B, Kunal's q50 (1fe66f4): at 320x568 the Look picker's chips lose their names, so the Symbol set's chip is a bare 32px ♞ glyph - an icon button now, by his design; 375 keeps its names, so its set is unchanged */   /* #550 re-keyed: formatting audit FMT-A-02/A-05/B-03, Kunal's pick 12 Nov (one top row; X left and one ⋯ in the lesson bar; a42 short-phone fold; 20 is the Play setup sheet's new top-right ☰ */
// TC-INV-03c [#550 test-system helper A; jobs/tc-inv-03b-does-not-visit-choose-your-opponent-2026-11-14]: since q44 the bot row lives only
// on 'Choose your opponent', which TC-INV-03b's play-setup state never reached (P.states['setup'] taps Computer, then Back). The state
// setup-bots stays there and joins EXTRA; and because a union over all the unswept states would hide a height that some OTHER state
// already uses (40 is also the menu's coach chips), that screen's own set is pinned too. MEASURED on 17c48e4 (see the CONTROL-RECORD).
const ICON_PIN_BOTS={320:[20,40], 375:[20,40]};   /* 20 the top bar menu button, 40 the bot faces (BotFace); measured at se, kunal730, short375 and kunal761 (width 375, so this pin; CT_INV_GEOS=kunal761 126 pass 0 fail) on 2031e0351c9d */


const ALL_GEOS=['se','kunal730','short375'];
const GEOS=process.env.CT_INV_GEOS?process.env.CT_INV_GEOS.split(','):ALL_GEOS;

L.run(async()=>{
  if(process.env.CT_INV_GEOS) L.note('!! CT_INV_GEOS='+process.env.CT_INV_GEOS+' - GEOMETRY-NARROWED RUN, NOT full coverage. '+GEOS.length+' of '+ALL_GEOS.length+' geometries.');
  // CT_INV_ONLY=band runs ONLY the TC-R239 block at the foot of this run (the grading machine's pair for
  // jobs/gate-26-goes-red-at-ply-31-...-2026-11-18 uses it, about a minute a geometry). Opt-in, printed loudly, never set by gates.sh, and
  // like CT_INV_GEOS it skips the default-run guards, so such a run is never a coverage run.
  const ONLY=process.env.CT_INV_ONLY||'';
  if(ONLY&&ONLY!=='band'){L.say(false,'CT_INV_ONLY names a block this gate has ("band"), so a typo cannot read as a narrowed pass',{ONLY});}
  if(ONLY) L.note('!! CT_INV_ONLY='+ONLY+' - ONE BLOCK OF THIS GATE, NOT a coverage run: the TC-INV-03b sweep and the TC-INV-09/10 ply walk are skipped.');
  if(!ONLY){
  // TC-INV-03b [#549 item (74); jobs/invariant-2-and-3-sheets-and-unswept-screens, part (3)]. INVARIANT 3's DRIFT GUARD ONLY
  // GUARDED THE SCREENS IN SCREENS. antagonist B (#423) ran this file's own icon rule over seventeen unswept states and found five
  // heights outside the pinned set (26 Play setup, 26.8 home-newhere, 36.3 feedback-home, 40 menu coach-hair chips, 112 the
  // roadmap illustration), so a new icon size could arrive anywhere outside the walk and TC-INV-03 stayed green. These states
  // are swept HERE, for invariant 3 ONLY, each from a fresh launch: adding them to SCREENS would put them under every per-screen
  // row, occlusion and pin assertion, which part (1) of the job ties to the ink redesign (jobs/invariant-2-measures-the-box-not-
  // the-ink) - under the box method the menu sheet's rows all read spread 0, so they would add counts and no assertion that
  // can fire. The set asserted is the set over THESE states alone, not unioned with TC-INV-03's: a union would let a height
  // already used somewhere in the walk appear on a sheet unseen. Non-empty is its own line first (a sweep that reached nothing
  // would match an empty pin by construction). A width with no pinned set is reported, never asserted, exactly as TC-INV-03.
  {
    const H=require('../drive/home'), M=require('../drive/menu');
    const EXTRA=[['play-setup',P.states['setup']],['home-newhere',H.states['home-newhere']],['feedback-home',M.states['feedback-home']],
                 ['menu-discover',M.states['menu-discover']],['menu-coach',async(b)=>{await M.states['menu-discover'](b);await M.openCoach(b);}] /* #550 build-menu-one-screen: the Coach look portraits open in place under their row near the TOP of the sheet, so menu-bottom (scrolled to the end) no longer has them on screen */,['menu-bottom',M.states['menu-bottom']],['menu-look',M.states['menu-look']],
                 ['pz-roadmap',PZ.states['roadmap']],['setup-bots',P.states['setup-bots']]];
    for(const g of GEOS){
      const set={}; const reached=[]; const menuRows=[]; const bots={};
      for(const [name,go] of EXTRA){
        const b=await L.launch({geo:g,store:R.SEED,name:'inv3b-'+name+'-'+g}); await b.open();
        try{ await go(b); await b.settle(450);
          const iv=await b.page.evaluate(ROWS,{probeVisible:true}); reached.push(name);
          if(/^menu-/.test(name)) for(const r of iv.rows) menuRows.push({state:name,r});
          for(const k of Object.keys(iv.iconH)){ if(!set[k])set[k]=new Set(); iv.iconH[k].forEach(x=>set[k].add(name+':'+x)); if(name==='setup-bots')bots[k]=iv.iconH[k]; }
        }catch(e){ L.say(false,g+' TC-INV-03b '+name+': the state could not be reached, so its icons are UNRUN, not green',String(e.message||e).slice(0,140)); }
        await b.close();
      }
      const keys=Object.keys(set).map(Number).sort((a,b)=>a-b);
      L.note('    TC-INV-03b, '+g+': '+keys.length+' distinct ICON glyph heights over '+reached.length+' unswept states ('+reached.join(', ')+'): '+keys.join(', '));
      for(const k of keys) L.note('        '+k+'px  '+[...set[String(k)]].slice(0,4).join(' ; '));
      L.say(reached.length===EXTRA.length&&keys.length>0, g+' TC-INV-03b PRECONDITION every one of the '+EXTRA.length+' unswept states was reached and between them carried at least one icon',{reached,heights:keys.length});
      const want=ICON_PIN_EXTRA[widthOf(g)];
      if(want){
        L.say(JSON.stringify(keys)===JSON.stringify(want), g+': TC-INV-03b the set of distinct ICON glyph heights over the unswept sheets and states (Play setup, home-newhere, feedback, the menu sheet top, bottom and Look picker, the puzzle roadmap) is exactly what #549 measured at '+widthOf(g)+'px wide - a drift guard over the states TC-INV-03 does not walk, not a target',
          {width:widthOf(g), want, got:keys, added:keys.filter(x=>!want.includes(x)), gone:want.filter(x=>!keys.includes(x))});
      } else L.note('    TC-INV-03b, '+g+': width '+widthOf(g)+' carries NO pinned set, so this is REPORTED and NOT asserted here');
      {const bk=Object.keys(bots).map(Number).sort((a,b)=>a-b);const bw=ICON_PIN_BOTS[widthOf(g)];
        L.note('    TC-INV-03c, '+g+': Choose your opponent carries '+bk.length+' distinct ICON glyph heights: '+bk.map(k=>k+' ('+bots[String(k)].slice(0,3).join(' ; ')+')').join(', '));
        if(bw) L.say(reached.includes('setup-bots')&&JSON.stringify(bk)===JSON.stringify(bw), g+': TC-INV-03c the distinct ICON glyph heights on the Choose your opponent screen are exactly what #550 measured at '+widthOf(g)+'px wide - its own set, so a height another unswept state already uses cannot hide a change here',
          {width:widthOf(g), want:bw, got:bk, added:bk.filter(x=>!bw.includes(x)), gone:bw.filter(x=>!bk.includes(x))});
        else L.note('    TC-INV-03c, '+g+': width '+widthOf(g)+' carries NO pinned set, so this is REPORTED and NOT asserted here');}
      // TC-INV-02g [#550; jobs/invariant-2-and-3-sheets-and-unswept-screens, part (1), after the orchestrator's answer a5 (11 Nov)
      // made INK the measure invariant 2 is promoted on]. THE MENU SHEET'S ROWS UNDER INVARIANT 2, read from the same menu-discover,
      // menu-bottom and menu-look launches as TC-INV-03b above (not added to SCREENS: those states would then come under every
      // per-screen occlusion and pin assertion, and the sheets are mounted-but-hidden layers with their own occlusion question).
      // MEASURED on trial 45cf62b1a07a at se and kunal761 before this was written: menu-bottom carries the piece-style chips
      // (5 x 14, not a side-by-side row at 320 where they wrap), the coach-hair chips (5 svgs, box 40) and the footer links
      // (4 x 16); menu-look carries the five 52px piece previews at 375; box spread 0 on every row, ink spread 0 on every row
      // but the HAIR chips, whose painted ink is 35 / 33.75 / 31.56 / 34.38 / 37.5 - portraits of a coach, not icons in a row of
      // controls, so that row is PINNED to those readings (a pin that moves either way is red, as TC-INV-02b) rather than held
      // to the 1px ceiling; whether pictures count as icons is jobs/invariant-3-icon-size-target-set's call, not taken here.
      // Part (2) of the job (the Review more-sheet contributing no rows) no longer holds on this tree: rev-more-sheet is in
      // SCREENS and carries 2 rows at every geometry (ROW_PIN, a21), both under TC-INV-02a/02e already.
      const HAIR_SIG='Balding|Combed back|Owl|Receding|Side part', HAIR_INK={'Side part':35,'Receding':33.75,'Balding':31.56,'Combed back':34.38,'Owl':37.5};
      // PINNED [batch 13 red repair; 1cc57a16, jobs/every-button-row-is-icons-only-in-one-style-with-two-kinds-of-arrows-2026-11-18, Kunal's Q24]:
      // the menu's Share row (Share, and for a developer Send feedback) is RowBtn icons since that commit, and the two icons cannot meet both
      // 1px ceilings at once - the share arrow paints 19.5 tall in a 24.5 box, the chat bubble (a squat shape) 15.1 in 25.9; scaling the bubble
      // to 19.5 of ink grows its box to ~33.5. So the row is pinned, both measures, exactly (moves either way is red), like the hair row; whether
      // the bubble should paint taller is the question in this repair's reply. Measured on the head 6e02e303 (trial 0075dfcc49e3) at se,
      // kunal730 and short375, in menu-discover and menu-coach.
      const SHARE_SIG='Send feedback|Share Chess Trainer', SHARE_BOX={'Share Chess Trainer':24.5,'Send feedback':25.9}, SHARE_INK={'Share Chess Trainer':19.5,'Send feedback':15.1};
      if(L.say(menuRows.length>=2, g+': TC-INV-02g PRECONDITION the menu sheet\'s states gave invariant 2 at least two control rows to measure ('+menuRows.length+': '+menuRows.map(x=>x.state+' '+x.r.sig).join(' ; ')+')',{rows:menuRows.map(x=>({state:x.state,sig:x.r.sig}))})){
        const sharePin=menuRows.filter(x=>x.r.sig===SHARE_SIG), shareMoved=[];
        for(const {state,r} of sharePin) for(const k of r.kids){ if(Math.abs(k.gh-SHARE_BOX[k.lab])>0.6||typeof k.ink!=='number'||Math.abs(k.ink-SHARE_INK[k.lab])>0.6) shareMoved.push({state,lab:k.lab,box:k.gh,ink:k.ink,wantBox:SHARE_BOX[k.lab],wantInk:SHARE_INK[k.lab]}); }
        L.say(sharePin.length>=1&&shareMoved.length===0, g+': TC-INV-02g the menu Share row (Share 24.5 box / 19.5 ink, Send feedback 25.9 / 15.1) was measured ('+sharePin.length+'x) and reads exactly its pin within 0.6px - a pin that moves either way is red',{seen:sharePin.length,shareMoved});
        const boxBad=menuRows.filter(x=>x.r.rawSpread>1.0&&x.r.sig!==SHARE_SIG);
        L.say(boxBad.length===0, g+': TC-INV-02g every menu-sheet control row has ONE glyph box height within 1px (the box method TC-INV-02a asserts on the walked screens)',
          boxBad.map(x=>({state:x.state,sig:x.r.sig,spread:x.r.rawSpread,kids:x.r.kids.map(k=>k.lab+' '+k.gh)})));
        const inkBad=[], hairMoved=[]; let hairSeen=0;
        for(const {state,r} of menuRows){
          const ik=r.kids.map(k=>k.ink).filter(x=>typeof x==='number'); if(ik.length<2)continue;
          if(r.sig===SHARE_SIG) continue;   // pinned above
          if(r.sig===HAIR_SIG){ hairSeen++; for(const k of r.kids){ const want=HAIR_INK[k.lab]; if(typeof want!=='number'||typeof k.ink!=='number'||Math.abs(k.ink-want)>0.6) hairMoved.push({state,lab:k.lab,want,got:k.ink}); } continue; }
          const isp=Math.max(...ik)-Math.min(...ik);
          if(isp>1.0) inkBad.push({state,sig:r.sig,isp:+isp.toFixed(2),kids:r.kids.map(k=>k.lab+' '+k.via+' '+k.ink)});
        }
        L.say(inkBad.length===0, g+': TC-INV-02g every menu-sheet control row (the coach-hair portraits excepted, pinned on the next line) PAINTS one height - INK spread within 1px',inkBad);
        L.say(hairSeen>=1&&hairMoved.length===0, g+': TC-INV-02g the coach-hair portrait row was measured ('+hairSeen+'x) and its painted ink still reads exactly the pinned 35 / 33.75 / 31.56 / 34.38 / 37.5 within 0.6px - a pin that moves either way is red',{hairSeen,hairMoved});
      }
    }
  }
  // TC-INV-09 [#548 item (82); jobs/gate-26-rev-best-ply30-pin-covers-one-ply-of-a-class-that-cuts-at-plies-12-20-and-30-2026-10-12].
  // THE rev-best PIN IS A CLASS, NOT ONE PLY. antagonist-b-422 measured the best-move pill cut at EVERY ply that carries it at
  // 320x568 (12, 20 and 30), and this file pinned only rev-best-ply30. So: walk the reference game's 34 positions at each
  // swept geometry, assert the pill appears at EXACTLY the plies it is pinned for (a count moving either way is red), and
  // assert each of those plies separately cuts nothing (scrollWidth against clientWidth of [data-ct="rev-best"], the same
  // reading the pinned residual takes). CONTROL, recorded below: #546's bundle 049b41dfb6f1 at se reads ply 12 client 44 /
  // scroll 44, ply 20 29/59 and ply 30 45/56 - so the per-ply lines go red at 20 and 30 while 12 stays green, which a ply-30
  // pin alone could never report. 375x730 is clean at all three (acceptance C) and is asserted here, not excluded.
  {
    const BEST_PLIES=[12,20,30];
    for(const g of GEOS){
      const b=await L.launch({geo:g,store:R.SEED,name:'inv-revbest-'+g});await b.open();
      const seen=[],hitWalk=[];let drove=true;
      try{
        await R.states['moves-ply0'](b);
        for(let p=0;p<=33;p++){
          await R.goPly(b,p);await b.settle(450);
          const r=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-best"]');if(!e)return null;const q=e.getBoundingClientRect();
            if(q.width<1||q.height<1)return null;return {cw:e.clientWidth,sw:e.scrollWidth};});
          if(r)seen.push(Object.assign({ply:p},r));
          // TC-INV-10 [#548 item (85); jobs/the-review-move-strip-overflows-with-no-scroller-so-a-move-chip-is-unreachable-on-main-
          // 2026-10-07, part (1)]: every move chip's PAINTED region is hittable. The chip rect is intersected with its CLIP box (the
          // nearest ancestor that clips x), not the viewport - a chip past the strip's edge is scrolled to, not lost - and every
          // integer x across what is painted, at the chip's vertical centre, must return the chip from elementFromPoint.
          const hm=await b.page.evaluate(()=>{const st=document.querySelector('[data-mstrip]');if(!st)return null;
            const ptr=(e)=>getComputedStyle(e).cursor==='pointer';
            const chips=[...st.querySelectorAll('*')].filter(e=>{if(!ptr(e))return false;for(let a=e.parentElement;a&&a!==st;a=a.parentElement)if(ptr(a))return false;return true;});
            let painted=0,samples=0;const bad=[];
            for(const c of chips){const q=c.getBoundingClientRect();if(q.width<1||q.height<1)continue;
              let l=Math.max(0,q.left),r=Math.min(innerWidth,q.right);
              for(let a=c.parentElement;a&&a!==document.body;a=a.parentElement){const cs=getComputedStyle(a);
                if(cs.overflowX!=='visible'){const aq=a.getBoundingClientRect();l=Math.max(l,aq.left);r=Math.min(r,aq.right);}}
              if(r-l<1)continue;painted++;const y=(Math.max(q.top,0)+Math.min(q.bottom,innerHeight))/2;
              // ONE PIXEL IS DROPPED AT EACH EDGE, MEASURED: the first run of this went red on every position at ONE column per chip -
              // at 375x730, d4 spans 250.48..279.34 and elementFromPoint(278.5) returns the NEXT chip (Bg4, left 279.34), because hit
              // testing works on device-pixel-snapped boxes. That is the boundary between two chips, not a covered chip. The control
              // this assertion was proved on covers 10px, so it is unaffected.
              for(let x=Math.ceil(l)+1;x<=Math.floor(r)-2;x++){samples++;const h=document.elementFromPoint(x+0.5,y);
                if(!(h&&(h===c||c.contains(h)))){bad.push({chip:(c.innerText||'').trim().slice(0,10),x,hit:h?(h.tagName+(h.getAttribute('data-ct')?'['+h.getAttribute('data-ct')+']':'')):null});}}}
            return {chips:chips.length,painted,samples,bad:bad.slice(0,6),nbad:bad.length};});
          if(hm)hitWalk.push(Object.assign({ply:p},hm));
        }
      }catch(e){drove=false;L.say(false,g+' TC-INV-09 the 34-position walk drove to its end',String(e.message||e));}
      if(drove){
        const plies=seen.map(x=>x.ply);
        L.say(plies.length===BEST_PLIES.length&&BEST_PLIES.every((p,i)=>plies[i]===p),
          g+' TC-INV-09 the best-move pill appears at exactly plies '+BEST_PLIES.join(', ')+' of the reference game - the class the per-ply pins below cover, so a pill gained or lost at any ply is red',{plies});
        for(const p of BEST_PLIES){
          const x=seen.find(s=>s.ply===p);
          L.say(!!x&&x.sw<=x.cw+0.5,g+' TC-INV-09 ply '+p+': the best-move pill cuts nothing (scrollWidth within clientWidth)',x||{absent:true});
        }
        // TC-INV-10: non-empty first, in its own line - a strip that painted no chip would pass the hit test over nothing.
        const painted=hitWalk.reduce((a,h)=>a+h.painted,0),samples=hitWalk.reduce((a,h)=>a+h.samples,0);
        L.say(hitWalk.length>=30&&painted>0&&samples>0,g+' TC-INV-10 PRECONDITION the move strip was found at '+hitWalk.length+' of 34 positions and painted '+painted+' chip(s) across '+samples+' sampled x',{positions:hitWalk.length,painted,samples});
        const badAt=hitWalk.filter(h=>h.nbad>0);
        L.say(painted>0&&badAt.length===0,g+' TC-INV-10 every painted pixel column of every move chip hit-tests to that chip, measured against the strip\'s clip box and not the viewport',
          badAt.length?{positions:badAt.length,first:badAt.slice(0,3).map(h=>({ply:h.ply,nbad:h.nbad,bad:h.bad}))}:{painted,samples});
      }
      await b.close();
    }
  }
  if(!process.env.CT_INV_GEOS){
    const unpinnedX=ALL_GEOS.filter(g=>!ICON_PIN_EXTRA[L.GEOS[g].w]);
    L.say(unpinnedX.length===0, 'TC-INV-03b every geometry the suite sweeps by default carries a pinned unswept-state icon set, so TC-INV-03b never silently downgrades to a report on a full run',{unpinnedWidths:unpinnedX});
  }
  }   // end if(!ONLY)
  // TC-R239 [batch 13; jobs/gate-26-goes-red-at-ply-31-on-the-small-phone-while-the-explanation-is-still-coming-2026-11-18].
  // THE EVAL GRAPH NEVER SITS OVER THE MOVE'S EXPLANATION, IN ANY FRAME. Gate 26 went red 1 in 20 at se rev-ply31 on main ffc8fa2 with
  // one core busy: the centre of the explanation (rev-why-txt, a button when it has more to say) hit an SVG rect of the eval graph. The
  // checker's frame probe on c58695d found why: from the jump until the refutation clause arrived 1.3 to 1.5 s later the reason was one
  // line, and the band (data-ink) put the graph into the box's empty lines over its centre; then, when the clause landed, the graph stayed
  // over the NEW text for one frame, because the band followed the text through a MutationObserver and a requestAnimationFrame. A screen
  // walk scanning at a fixed moment caught whichever of the two its scan landed in. The fix is in the app (chess.jsx, revBandRef and the
  // pending flag reviewText returns): while the clause is coming the reason box is held whole (data-pending), and the band is re-measured in
  // a layout effect, in the frame the text changes. So this block samples EVERY animation frame from the jump until 2 s after the text is
  // final, at each swept geometry, at every ply of the reference game whose reason waits for a clause, and at the last ply - whose
  // one-word final reason ('Checkmate.') must still give its empty lines to the graph (gate 77 TC-S04's case), which is what shows the
  // detector can see a graph in the box at all.
  // The plies: PEND_PLIES are the plies whose first frame carries data-pending (asserted, so a ply that stopped pending is red, not
  // silently easier). 16.Qb8+ (ply 31) pended on c58695d; since c71cd95e (HEX-R-06) it states its mate in two at once and does not pend,
  // so it is walked as a final-at-once ply: its frames are held to the same rule.
  {
    const PEND_PLIES=[19,25];const FINAL_PLIES=[31];const SHORT_PLY=R.OPERA_PLIES;
    const frames=async(b,n,hold,cap,grow)=>b.page.evaluate(async({n,hold,cap,grow})=>{const out=[];const t0=performance.now();let stop=false,lastTxt=null,changedAt=null,changes=0;
      const samp=()=>{const tx=document.querySelector('[data-ct="rev-why-txt"]');const g=document.querySelector('[data-ct="eval-graph"]');
        let ink=null;if(tx){const rg=document.createRange();rg.selectNodeContents(tx);const tb=tx.getBoundingClientRect().bottom;for(const q of rg.getClientRects())if(q.height>0)ink=Math.max(ink==null?-1e9:ink,Math.min(q.bottom,tb));}
        const xr=tx?tx.getBoundingClientRect():null;const gr=g?g.getBoundingClientRect():null;
        let hit=null;if(xr&&xr.height>0){const h=document.elementFromPoint(xr.left+xr.width/2,xr.top+xr.height/2);hit=h?(h.closest('[data-ct="eval-graph"]')?'graph':(h.closest('[data-ct="rev-why-txt"]')?'txt':(h.getAttribute('data-ct')||h.tagName))):null;}
        const pend=tx?tx.getAttribute('data-pending')==='1':false;const t=Math.round(performance.now()-t0);
        const tt=tx?(tx.textContent||'').trim():'';if(lastTxt!==null&&tt!==lastTxt){changedAt=t;changes++;}lastTxt=tt;
        out.push({t,txt:tx?(tx.textContent||'').trim():'',pend,ink:ink==null?null:+ink.toFixed(1),xTop:xr?+xr.top.toFixed(1):null,xBot:xr?+xr.bottom.toFixed(1):null,gTop:(gr&&gr.height>0)?+gr.top.toFixed(1):null,hit});
        if(!stop)requestAnimationFrame(samp);};
      requestAnimationFrame(samp);
      const s=document.querySelectorAll('[data-mstrip] span[style*="cursor: pointer"]');if(!s.length||n>s.length)throw new Error('ply '+n+' is past the strip ('+s.length+' moves)');s[n-1].click();
      /* the window ends HOLD ms after the reason last changed (and not before 3.5s), and on a ply whose reason must grow, not before it has - read from the text, not from the app's mark */
      const T0=performance.now();await new Promise(res=>{const tick=()=>{const t=performance.now()-T0;const quiet=t>=Math.max(3500,(changedAt==null?0:changedAt)+hold);if(t>=cap||(quiet&&(!grow||changes>0)))res();else setTimeout(tick,50);};tick();});
      stop=true;return out;},{n,hold,cap,grow});
    // BAND_GEOS [#553 B1, the lead's ruling on the ply-31 pair, 25 Nov 02:4xZ]: THIS BLOCK ALONE ALSO WALKS kunal761 (his own phone, 375x761).
    // Since FB-07 (c0d52abf, 20 Nov) the review's reason box is ONE line at 320x568 and 375x568 and the graph is not drawn in it (TC-R239e),
    // so the pending hold has no spare lines to keep there and no break of it can show: only kunal730 was left where this block can go red.
    // kunal761 has spare reason lines too, so the hold is exercised on two geometries again. se and short375 stay walked (must pass).
    // CT_INV_GEOS still narrows it, as everywhere in this gate.
    const BAND_GEOS=process.env.CT_INV_GEOS?GEOS:[...ALL_GEOS,'kunal761'];
    for(const g of BAND_GEOS){
      const b=await L.launch({geo:g,store:R.SEED,name:'inv-band-'+g});await b.open();
      try{
        await R.states['moves-ply0'](b);
        for(const n of [...PEND_PLIES,...FINAL_PLIES,SHORT_PLY]){
          await R.goPly(b,0);await b.settle(400);
          const fr=await frames(b,n,2000,9000,PEND_PLIES.includes(n));
          const first=fr[0]||{},last=fr[fr.length-1]||{};
          // "STILL COMING" IS READ FROM THE TEXT, NOT FROM THE APP'S OWN data-pending MARK: a frame is in the window when its reason is
          // not yet the reason the ply ends on. data-pending is the fix's hook, and a precondition keyed to it would go red on the very
          // bundle that lacks the fix for the wrong reason (CLAUDE.md, #432: a check that reads only what the fix added cannot see the
          // defect the fix removes). The mark is reported beside it (markN) and not asserted.
          const pendN=fr.filter(f=>f.txt!==last.txt).length,markN=fr.filter(f=>f.pend).length,graphN=fr.filter(f=>f.gTop!=null).length;
          const overTxt=fr.filter(f=>f.gTop!=null&&f.ink!=null&&f.gTop<f.ink-0.5);
          const inPend=fr.filter(f=>f.txt!==last.txt&&f.gTop!=null&&f.xBot!=null&&f.gTop<f.xBot-0.5);
          const onCentre=fr.filter(f=>f.hit==='graph');
          const finalAt=(fr.find(f=>f.txt===last.txt)||{}).t;
          L.say(fr.length>=60&&last.t>=2000,g+' TC-R239 PRECONDITION ply '+n+': '+fr.length+' animation frames sampled from the jump over '+(last.t||0)+'ms, the reason final from '+finalAt+'ms - the verdicts below are over every frame of that window',{frames:fr.length,ms:last.t,finalAt,firstTxt:first.txt,lastTxt:last.txt});
          if(PEND_PLIES.includes(n)){
            L.say(pendN>0&&first.txt!==last.txt&&String(last.txt).indexOf(String(first.txt))===0,g+' TC-R239a PRECONDITION ply '+n+': the reason WAS still coming at the jump ('+pendN+' frames before it reached its final text, which it then grew to) - the window this block exists for was reached',{pendFrames:pendN,markedPending:markN,pendingTxt:first.txt,finalTxt:last.txt,finalAt});
            L.say(inPend.length===0,g+' TC-R239b ply '+n+': in NO frame while the reason is still coming does the eval graph sit inside the reason\'s box - the box is held whole for the text that is coming',inPend.slice(0,3));
          }
          if(FINAL_PLIES.includes(n)) L.say(pendN===0&&markN===0,g+' TC-R239a ply '+n+': the reason is final from the first frame (16.Qb8+ states its mate in two at once, HEX-R-06) - so this ply has no pending window, and a pending one appearing again is red here first',{pendFrames:pendN,markedPending:markN,txt:last.txt});
          L.say(overTxt.length===0,g+' TC-R239c ply '+n+': in NO frame, from the jump to 2s after the reason is final, does the eval graph\'s top sit above the last painted line of the reason - including the frame the longer text lands in',overTxt.slice(0,3));
          if(n!==SHORT_PLY) L.say(onCentre.length===0,g+' TC-R239d ply '+n+': in NO frame does the centre of the reason hit the eval graph, so a tap on the explanation never jumps the review to another move (the gate 26 red of 17 Nov)',onCentre.slice(0,3));
          // 15d is not asked at the last ply: there a one-word final reason gives its empty lines to the graph BY DESIGN (gate 77 TC-S04), and
          // the box's centre lies in those lines - measured on ca53d655 at 320x568, 'Checkmate.' inks to 457 and the graph starts at 463. That
          // the graph is there and stays there is 15e's claim; what this block forbids is a graph that comes and goes over a reason.
          if(n===SHORT_PLY){
            const ins=fr.filter(f=>f.gTop!=null&&f.xBot!=null&&f.gTop<f.xBot-0.5);
            /* batch 13 (jobs/short-upright-boards-sized-to-height-2026-11-12, FB-07 "full width ... the rows under it giving way"): at 320x568 and
               375x568 the board is now the width and the explanation's box is ONE line (it was three), so there are no empty lines for the
               graph to take and it is not drawn there - the graph gives way to the board. Re-keyed for those two geometries only; the claim
               that the graph never sits over a reason (15c) is unchanged everywhere. */
            if(L.geoIs(g,320,568)||L.geoIs(g,375,568)) L.say(graphN===0,g+' TC-R239e ply '+n+' (a one-line final reason): on this short phone the board is the full width, the reason box is one line, and the eval graph is NOT drawn in it ('+graphN+' of '+fr.length+' frames) - it gives way to the board (batch 13, FB-07)',{graphFrames:graphN,txt:last.txt});
            else L.say(graphN>0&&ins.length>0,g+' TC-R239e ply '+n+' (a one-line final reason): the eval graph IS drawn, and inside the reason box\'s empty lines ('+ins.length+' of '+fr.length+' frames) - the short reason still gives its unused lines to the graph (gate 77 TC-S04), and the detector above can see a graph in the box',{graphFrames:graphN,inBox:ins.length,txt:last.txt,gTop:last.gTop,xBot:last.xBot,ink:last.ink});
          }
        }
      }catch(e){L.say(false,g+' TC-R239 the band walk drove to its end',String(e.message||e));}
      await b.close();
    }
  }
},'247-invariants-unswept-states-every-ply-and-the-band');
