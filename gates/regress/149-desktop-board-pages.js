'use strict';
// gates/regress/149-desktop-board-pages.js - BOARD PAGES ON A COMPUTER WINDOW: ONE CENTRED GROUP THAT FITS, AND NO FLIP AT SQUARE. US-R157 / TC-R225a..g.
//
// WHY [#550, docs/desktop-check-2026-11-12, Kunal 12 Nov on his computer: "when I expand the screen, it looks like this and it looks messy and
// loses all alignment"; he accepted the rule - board pages wider than tall keep the sideways layout, board, column (capped at 520) and corner
// buttons centred as one group]. DSK-03/04 centred the row; these are the board-page findings that were left: DSK-05 the Tactics & strategy
// panel beside the board stretched to the tab rail (870 wide at 1920x970); DSK-10 the lesson column scrolled on laptop heights (278px at the
// demo's end at 1280x600); DSK-11 the Review More sheet scrolled (194px at 1280x600); DSK-12 the layout flipped the instant the width passed
// the height; and the anchored Home and menu buttons sat 11px over the end of the sideways top player bar in a game against the computer
// (the group's pad left out the eval bar, and the bar's slot was 100 for buttons that need 102).
// WHAT IT READS: the bundle under test (CT_APP) at 1280x600, 1366x648, 1440x780, 1920x970 and 2560x1320 (laptops and monitors less Chrome's
// bars) and kunal761. Everything is found by its words or by its role, not by the hooks this build adds (#432): the Tactics panel by its
// Tactics/Strategy tab buttons, the lesson column as the scroller '.ctside', the fold button by its words 'Other lines', the More sheet by
// data-ct rev-sheet (which predates this build), the corner buttons by their aria-labels.
// WHAT IT ASSERTS:
//  (a) TC-R225a Tactics & strategy sideways: the panel beside the board is at most 520 wide and board plus panel are centred in the space
//      left of the tab rail (|dx| <= 4).
//  (b) TC-R225b a sideways lesson's column does not scroll at the end of the demo or at the start of practice on a laptop height (1280x600,
//      1366x648, 1440x780), because the branch chips fold behind one 'Other lines (n)' button; TC-R225c that button opens the chips in place
//      (the branches box appears) - so nothing was removed; and at 1920x970 the chips are shown as before (no button). (On those heights the
//      'What we're trying to do' box also folds to its title, opened by a tap, and the move list scrolls inside itself; not asserted here.)
//  (c) TC-R225d the lesson footer sits under the column, not under the board (its left edge within 30px of the column's, its right edge
//      within 30px of the column's), at every size.
//  (d) TC-R225e the Review More sheet does not scroll at 1280x600, 1366x648 and 1440x780 and its rows are in two columns.
//  (e) TC-R225f in a sideways game (against the computer, and Pass and Play) and the sideways Review the top player bar ends at least 4px
//      before the anchored Home (or menu) button.
//  (f) TC-R225g a window dragged across square does not swap layouts: from 1100x1000 (sideways) to 990x1000 stays sideways, to 900x1000 goes
//      upright, back to 1010x1000 stays upright, to 1100x1000 sideways again.
//  (g) TC-R225h his phone is unchanged: at kunal761 a game against the computer is upright (no sideways column) with the board 375 wide, and
//      the More sheet is one column.
//  (h) TC-R225i [cg4, jobs/desktop-check-remaining-2026-11-12 DSK-03/DSK-05; rule.md item 3 puts the tab rail in the centred group]: on
//      Puzzles and on Tactics & strategy sideways, at the five sizes and 1920x1080, the full-height tab rail starts within 0..16px of the
//      column's right edge (no empty band; it was 121px on Puzzles and 126px on Tactics at 1920x1080, 182/327 at 1920x970/2560x1320) and
//      the window's left margin (to the board) equals its right margin (from the rail) within 4. The rail is found as the full-height tab
//      bar narrower than 120, which predates this build. Phones are not in this block: there the tab bar is the bottom row (TC-R225h).
// KNOW ITS LIMIT: Linux Chromium with the gates' pinned fonts, not his Windows Chrome with Segoe UI (heights run a little taller here, so a fit
// here is pessimistic for his machine); one lesson (the Italian Game); DSK-07 (the Review bottom bar) needs his say and is not built.
// CONTROL-RECORD: bcc4eff 2026-11-13 total=116 red=47 scope=trial:9f4f6f823150 how=#550 t0, the branch tip before these fixes (faa82a9): TC-R225a x5 (panel 598 to 1158 wide), b x11 (278/85, 230/37, 98px over at the three laptop heights; no fold button), d x8 (footer from 615 against the column at 687 at 1280x600, 985 against 1192 at 1920x970), e x6 (sheet 194/155/46 over, one column), f x16 (Review bar 11px over the menu; Home 2px into the bar in Pass and Play, 11 against the computer, at every size), g x1 (990x1000 went upright, 1010x1000 sideways) red; TC-R225c's tall-window arm and h stay green there (unchanged by design), the fold-opens arm does not run (no button: named, not credited); on t3 450fed03791b 119/0 (three more lines: the fold opens at the three laptop heights)
// CONTROL-RECORD: 50bc8e6 2026-11-13 total=147 red=8 scope=trial:2abbad95b07e how=#550 jobs/sideways-lesson-corner-buttons-overlap-the-note-box-2026-11-13: the merged tip's bundle (before the 56px lesson column top) - TC-R225j (written TC-R225i then; renamed at the merge with cg4, which took that id) gap -5 at 1280x620, 1366x700, 1100x800 and 1440x900, demo end and practice (buttons end at 50, note box from 45); the stray-glyph lines and every older line green; on t5 bade581b40e6 147/0
// CONTROL-RECORD: 55ca2c7 2026-11-13 total=147 red=12 scope=trial:85be94e89bc2 how=#550 cg4, the branch tip (claude/exciting-noether-v1swj8 55ca2c7) with the rail at right:0: TC-R225i red at all six sizes on Puzzles (band 41/60/31/176/321/121px, right margin 0) and on Tactics (46/65/36/181/326/126px); every other line green. On t1 93ac17e053d5 147/0
// CONTROL-RECORD: f901598 2026-11-13 total=64 red=13 scope=env:CT_149_TAC_ONLY=1 how=#550 helper B (jobs/tactics-sideways-paints-a-second-page-level-menu-button-2026-11-13): the branch tip (claude/exciting-noether-v1swj8 f901598, trial 1b47cb7113e5) - TC-R225k 'ONE menu button' red at all nine sizes (two: the page-level one at x 1868 at 1920x1080, 1228 at 1280x720, 709 at 761x375) and 'nothing under or over the rail' red at 1280x600, 1440x780, 1280x720, 1440x900 and 761x375 (the page-level menu inside the rail's box); every older Tactics line green. On t1 2ffe57b0de6d 64/0
const L=require('../lib');const LS=require('../drive/lesson');const P=require('../drive/play');const R=require('../drive/review');
/* #550 helper A, r19 audit A4 [jobs/r19-phone-geometry-audit-is-red-on-the-branch-and-a4c-reads-short-as-a-dead-geos-key-2026-11-14]:
   a geometry is asked by its ENTRY (w, h), never its key or label, so a renamed GEOS key throws here instead of silently skipping a branch. */
const geoOf=(geo)=>{const g=typeof geo==='string'?L.GEOS[geo]:geo;if(!g||!(g.w>0))throw new Error('no geometry '+JSON.stringify(geo));return g;};
const isPhone=(geo)=>{const g=geoOf(geo);return g.w===375&&g.h===761;};   // Kunal's phone, R19
const G=(w,h)=>({w,h,safe:'',label:w+'x'+h});
const LAP=[[1280,600],[1366,648],[1440,780]];
const ALL=[...LAP,[1920,970],[2560,1320]];
const rail=(b)=>b.page.evaluate(()=>{const r=document.querySelector('.ctside');if(!r||getComputedStyle(r).display!=='flex')return null;const q=r.getBoundingClientRect();
  const fold=[...document.querySelectorAll('button')].find(x=>/^♟ Other lines \(\d+\)/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);
  const br=[...r.querySelectorAll('div')].find(d=>d.children.length===0&&(d.innerText||'').trim()==='Branches from this opening');
  const f=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).position==='fixed'&&d.getBoundingClientRect().bottom>=innerHeight-1&&[...d.querySelectorAll('button')].some(x=>/Play or pause|More for this lesson/.test(x.getAttribute('aria-label')||'')));
  const fr=f?f.getBoundingClientRect():null;
  return {over:r.scrollHeight-r.clientHeight,l:Math.round(q.left),r:Math.round(q.right),fold:fold?(fold.innerText||'').trim():null,branches:!!br,foot:fr?{l:Math.round(fr.left),r:Math.round(fr.right)}:null};});
const tabRail=(b)=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="tabbar"]');if(!t)return null;const r=t.getBoundingClientRect();return r.height>=innerHeight-1&&r.width<120?{l:Math.round(r.left),r:Math.round(r.right)}:null;});
const BAND=[...ALL,[1920,1080]];
// (a3) TC-R225k [#550 helper B, jobs/tactics-sideways-paints-a-second-page-level-menu-button-2026-11-13]: ONE menu button on Tactics &
//      strategy sideways, and no glyph under or over the tab rail. Every painted button named 'Menu and settings' (or reading ☰) is counted,
//      wherever it sits; and each tab of the rail is hit-tested at its centre and must answer with itself, with no menu button's box crossing
//      the rail. It was two buttons at 1920x1080 (the page-level one at x 1868) and, at 1280x720, 1440x900 and 761x375, one hidden under
//      the rail's Home tab with a faint ☰ above it.
const oneMenu=async(b,tag)=>{const m=await b.page.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';};
    const menus=[...document.querySelectorAll('button')].filter(x=>(/^menu and settings$/i.test(x.getAttribute('aria-label')||'')||/^☰$/.test((x.innerText||'').trim()))&&vis(x)).map(x=>{const r=x.getBoundingClientRect();return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom)};});
    const t=document.querySelector('[data-ct="tabbar"]');if(!t)return {menus,rail:null,tabs:[]};const rr=t.getBoundingClientRect();
    const tabs=[...t.querySelectorAll('button')].filter(vis).map(x=>{const r=x.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {name:(x.getAttribute('aria-label')||x.innerText||'').trim().replace(/\s+/g,' '),self:!!h&&(x===h||x.contains(h))};});
    return {menus,rail:{l:Math.round(rr.left),t:Math.round(rr.top),r:Math.round(rr.right),b:Math.round(rr.bottom)},tabs};});
  L.say(!!m.rail&&m.tabs.length>=3,tag+': TC-R225k PRECONDITION Tactics & strategy: the tab rail and its tabs are found ('+m.tabs.length+')',m.rail);
  L.say(m.menus.length===1,tag+': TC-R225k Tactics & strategy paints ONE menu button ('+m.menus.length+': '+JSON.stringify(m.menus)+')',m.menus);
  if(m.rail){const over=m.menus.filter(q=>q.r>m.rail.l&&q.l<m.rail.r&&q.b>m.rail.t&&q.t<m.rail.b);const lost=m.tabs.filter(x=>!x.self).map(x=>x.name);
    L.say(m.tabs.length>0&&lost.length===0&&over.length===0,tag+': TC-R225k every rail tab answers its own tap and no menu button sits under or over the rail (tabs hit elsewhere: '+(lost.join(', ')||'none')+'; menus crossing the rail: '+over.length+')',{lost,over});}};
L.run(async()=>{
  // (a2) TC-R225i Puzzles sideways on a computer window: the tab rail is part of the centred group (rule.md item 3), so there is no empty band
  //      between the column and the rail (121px at 1920x1080 with the rail at right:0), and the window's left and right margins match.
  for(const [w,h] of (process.env.CT_149_TAC_ONLY?[]:BAND)){const tag=w+'x'+h;   // CT_149_TAC_ONLY=1 runs the Tactics blocks (a, a3) alone
    const b=await L.launch({geo:G(w,h),name:'dsk149-pz'});await b.open();let ok=true;try{await b.tile('Puzzles');await b.settle(900);try{await b.tapText(/^(▶ )?(Continue|Start|Solve|Next puzzle)/i,{wait:900});}catch(e){}await b.settle(900);}catch(e){ok=false;}
    const m=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((x,y)=>y.width-x.width)[0];
      const c=document.querySelector('.ctside');const cr=c&&getComputedStyle(c).display!=='none'?c.getBoundingClientRect():null;if(!g||!cr)return null;return {vw:innerWidth,board:{l:Math.round(g.left),r:Math.round(g.right)},col:{l:Math.round(cr.left),r:Math.round(cr.right)}};});
    const tr=m?await tabRail(b):null;
    L.say(ok&&!!m&&!!tr,tag+': TC-R225 PRECONDITION Puzzles is up sideways, its board, its column and the full-height tab rail found',{m,tr});
    if(m&&tr){const right=Math.max(m.board.r,m.col.r);L.say(tr.l-right>=0&&tr.l-right<=16&&Math.abs(m.board.l-(m.vw-tr.r))<=4,tag+': TC-R225i Puzzles: the tab rail is in the centred group - no band between the column and the rail ('+(tr.l-right)+'px, at most 16) and the window margins match (left '+m.board.l+', right '+(m.vw-tr.r)+')',{m,tr});}
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (Puzzles)',b.errs.slice(0,3));await b.close();}
  // (a) Tactics & strategy
  for(const [w,h] of BAND){const tag=w+'x'+h;
    const b=await L.launch({geo:G(w,h),name:'dsk149-tac'});await b.open();let ok=true;try{await LS.states['tactics'](b);await b.settle(1200);}catch(e){ok=false;}
    const m=await b.page.evaluate(()=>{const tb=(t)=>[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()===t&&x.getBoundingClientRect().width>0);
      const a=tb('Tactics')||tb('🎯 Tactics'),s=tb('Strategy')||tb('♟ Strategy');const bars=[...document.querySelectorAll('button')].filter(x=>/^(🎯 )?Tactics$|^(♟ )?Strategy$/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0).map(x=>x.getBoundingClientRect());
      const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((x,y)=>y.width-x.width)[0];
      if(!bars.length||!g)return null;const row=(a||s)&&(a||s).parentElement?(a||s).parentElement.getBoundingClientRect():null;const pl=Math.min(...bars.map(x=>x.left),row?row.left:1e9),pr=Math.max(...bars.map(x=>x.right),row?row.right:0);
      return {vw:innerWidth,board:{l:Math.round(g.left),r:Math.round(g.right),w:Math.round(g.width)},panel:{l:Math.round(pl),r:Math.round(pr),w:Math.round(pr-pl)}};});
    L.say(ok&&!!m&&m.board.w>=h*0.9,tag+': TC-R225 PRECONDITION Tactics & strategy is up sideways, its board the window height and its two tabs found by their words',m);
    if(m){L.say(m.panel.w<=520,tag+': TC-R225a the panel beside the board is at most 520 wide ('+m.panel.w+')',m.panel);
      const cx=(m.board.l+m.panel.r)/2,want=(m.vw-62-8)/2;L.say(Math.abs(cx-want)<=4||m.panel.r>=m.vw-62-8-14,tag+': TC-R225a board and panel are centred left of the tab rail (centre '+cx+', space centre '+want+')',{cx,want});
      const tr=await tabRail(b);L.say(!!tr&&tr.l-m.panel.r>=0&&tr.l-m.panel.r<=16&&Math.abs(m.board.l-(m.vw-tr.r))<=4,tag+': TC-R225i the tab rail is in the centred group - no band between the panel and the rail ('+(tr?Math.round(tr.l-m.panel.r):'?')+'px, at most 16) and the window margins match (left '+m.board.l+', right '+(tr?Math.round(m.vw-tr.r):'?')+')',{tr,panel:m.panel,board:m.board});}
    if(ok)await oneMenu(b,tag);
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (Tactics)',b.errs.slice(0,3));await b.close();}
  for(const [w,h] of [[1280,720],[1440,900],[761,375]]){const tag=w+'x'+h;
    const b=await L.launch({geo:G(w,h),name:'dsk149-tac1'});await b.open();let ok=true;try{await LS.states['tactics'](b);await b.settle(1200);}catch(e){ok=false;}
    L.say(ok,tag+': TC-R225k PRECONDITION Tactics & strategy is up sideways',null);if(ok)await oneMenu(b,tag);
    L.say(b.errs.length===0,tag+': TC-R225k zero app errors (Tactics)',b.errs.slice(0,3));await b.close();}
  if(process.env.CT_149_TAC_ONLY)return;
  // (b)(c) the lesson column
  for(const [w,h] of [...LAP,[1920,970]]){const tag=w+'x'+h;
    const b=await L.launch({geo:G(w,h),name:'dsk149-les'});await b.open();
    for(const st of ['demo-end','practice-m0']){let ok=true;try{await LS.states[st](b);await b.settle(1200);}catch(e){ok=false;}
      const m=await rail(b);L.say(ok&&!!m,tag+' '+st+': TC-R225 PRECONDITION the sideways lesson is up, its column found',m);if(!m)continue;
      if(h<900){L.say(m.over<=1,tag+' '+st+': TC-R225b the column beside the board does not scroll ('+m.over+'px over)',m);
        L.say(!!m.fold&&!m.branches,tag+' '+st+': TC-R225b the branch chips fold behind one button ("'+m.fold+'")',m);
        if(m.fold&&st==='demo-end'){await b.page.locator('button:visible',{hasText:/Other lines \(/}).first().click().catch(()=>{});await b.settle(600);const m2=await rail(b);
          L.say(!!m2&&m2.branches,tag+' '+st+': TC-R225c the button opens the chips in place (branches box '+(m2&&m2.branches?'shown':'absent')+')',m2);
          await b.page.locator('button:visible',{hasText:/Other lines \(/}).first().click().catch(()=>{});await b.settle(400);}}
      else L.say(!m.fold&&m.branches,tag+' '+st+': TC-R225c on a tall window the chips are shown as before (no fold button, branches box shown)',m);
      L.say(!!m.foot&&Math.abs(m.foot.l-m.l)<=30&&Math.abs(m.foot.r-m.r)<=30,tag+' '+st+': TC-R225d the lesson footer sits under the column ('+JSON.stringify(m.foot)+' against the column '+m.l+'..'+m.r+')',m);}
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (lesson)',b.errs.slice(0,3));await b.close();}
  // (h2) TC-R225j [#550 jobs/sideways-lesson-corner-buttons-overlap-the-note-box-2026-11-13]: in a sideways lesson on a computer the anchored Home
  // and menu buttons (found by their aria-labels) end at least 6px above the first bordered box of the lesson column (the note box), wherever
  // the two overlap across; and no '☰' glyph is painted anywhere but inside a menu button (the checker saw a faint one above Home).
  for(const [w,h] of [[1280,620],[1366,700],[1100,800],[1440,900]]){const tag=w+'x'+h;
    const b=await L.launch({geo:G(w,h),name:'dsk149-corner'});await b.open();
    for(const st of ['demo-end','practice-m0']){let ok=true;try{await LS.states[st](b);await b.settle(1000);}catch(e){ok=false;}
      const m=await b.page.evaluate(()=>{const bt=[...document.querySelectorAll('button')].filter(x=>/^(Home|Menu and settings)$/.test(x.getAttribute('aria-label')||'')&&x.getBoundingClientRect().width>0).map(x=>x.getBoundingClientRect());
        const col=document.querySelector('.ctside');if(!col||!bt.length)return null;
        const box=[...col.querySelectorAll('div')].filter(d=>{const q=d.getBoundingClientRect();return q.width>40&&q.height>10&&parseFloat(getComputedStyle(d).borderTopWidth)>0;}).map(d=>d.getBoundingClientRect()).sort((a,c)=>a.top-c.top)[0];
        if(!box)return null;const over=bt.filter(q=>q.left<box.right&&q.right>box.left);const gap=over.length?Math.min(...over.map(q=>box.top-q.bottom)):null;
        const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;const stray=[];while((n=tw.nextNode())){if(!/\u2630/.test(n.textContent))continue;const el=n.parentElement;const bb=el.closest('button');
          if(bb&&/Menu/.test(bb.getAttribute('aria-label')||''))continue;const g=document.createRange();g.selectNodeContents(n);const q=g.getBoundingClientRect();const cs=getComputedStyle(el);
          if(q.width>0&&q.height>0&&cs.visibility!=='hidden'&&+cs.opacity>0)stray.push(el.tagName+'@'+Math.round(q.left)+','+Math.round(q.top));}
        return {btnBottom:Math.round(Math.max(...bt.map(q=>q.bottom))),boxTop:Math.round(box.top),across:over.length,gap:gap==null?null:Math.round(gap*10)/10,stray};});
      L.say(ok&&!!m&&m.across>0,tag+' '+st+': TC-R225 PRECONDITION the sideways lesson is up, its corner buttons sit across its note box ('+JSON.stringify(m)+')',m);
      if(m&&m.across)L.say(m.gap>=6,tag+' '+st+': TC-R225j the corner buttons end at least 6px above the note box (gap '+m.gap+')',m);
      if(m)L.say(m.stray.length===0,tag+' '+st+': TC-R225j no stray menu glyph is painted outside a menu button ('+(m.stray.join(' ')||'none')+')',m.stray);}
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (corner)',b.errs.slice(0,3));await b.close();}
  // (d) the Review More sheet, (e) the Review corner slot
  for(const [w,h] of [...LAP,[1920,970],['kunal761']]){const ph=typeof w==='string'&&isPhone(w);const tag=ph?w:w+'x'+h;
    const b=await L.launch({geo:ph?w:G(w,h),name:'dsk149-rev',store:{ct_pool:'3'}});await b.open();let ok=true;
    try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,6);await b.settle(900);}catch(e){ok=false;}
    L.say(ok,tag+': TC-R225 PRECONDITION the Opera Game is reviewed, ply 6');
    if(!ph){const c=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pbar-top"]');const m=document.querySelector('button[aria-label="Menu and settings"]');if(!t||!m)return null;return {bar:Math.round(t.getBoundingClientRect().right),menu:Math.round(m.getBoundingClientRect().left)};});
      L.say(!!c&&c.bar<=c.menu-4,tag+': TC-R225f the sideways Review top bar ends before the anchored menu button ('+JSON.stringify(c)+')',c);}
    let sh=null;try{await b.tapCt('rev-more',700);sh=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-sheet"]');if(!s)return null;
      const bs=[...s.querySelectorAll('button')].filter(x=>/^(Show best move|Hide best move|Flip board|Copy PGN|New game|Menu and settings)$/.test((x.innerText||'').trim())).map(x=>Math.round(x.getBoundingClientRect().left));
      return {over:s.scrollHeight-s.clientHeight,cols:[...new Set(bs)].length,n:bs.length};});}catch(e){}
    L.say(!!sh&&sh.n>=4,tag+': TC-R225 PRECONDITION the More sheet is open and its rows found by their words',sh);
    if(sh&&!ph&&h<900){L.say(sh.over<=1,tag+': TC-R225e the More sheet does not scroll ('+sh.over+'px over)',sh);L.say(sh.cols===2,tag+': TC-R225e its rows are in two columns ('+sh.cols+')',sh);}
    if(sh&&ph)L.say(sh.cols===1,'kunal761: TC-R225h his phone\'s More sheet is one column ('+sh.cols+')',sh);
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (Review)',b.errs.slice(0,3));await b.close();}
  // (e) the corner slot in a game
  for(const [w,h] of [...ALL,[761,375]]){const tag=w+'x'+h;
    const b=await L.launch({geo:G(w,h),name:'dsk149-play'});await b.open();
    for(const st of ['cpu-4ply','pp-m0']){let ok=true;try{await P.states[st](b);await b.settle(900);}catch(e){ok=false;}
      const c=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pbar-top"]');const hm=document.querySelector('button[aria-label="Home"]');if(!t||!hm)return null;return {bar:Math.round(t.getBoundingClientRect().right*10)/10,home:Math.round(hm.getBoundingClientRect().left*10)/10};});
      L.say(ok&&!!c,tag+' '+st+': TC-R225 PRECONDITION the sideways game is up, its top bar and Home button found',c);
      if(c)L.say(c.bar<=c.home-4,tag+' '+st+': TC-R225f the top player bar ends at least 4px before the anchored Home button (bar '+c.bar+', Home '+c.home+')',c);}
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (Play)',b.errs.slice(0,3));await b.close();}
  // (f) the dead band at square
  { const b=await L.launch({geo:G(1100,1000),name:'dsk149-band'});await b.open();let ok=true;try{await P.states['cpu-4ply'](b);await b.settle(900);}catch(e){ok=false;}
    const side=()=>b.page.evaluate(()=>{const r=document.querySelector('.ctside');return !!r&&getComputedStyle(r).display==='flex';});
    const seq=[];for(const [w,h] of [[1100,1000],[990,1000],[900,1000],[1010,1000],[1100,1000]]){await b.page.setViewportSize({width:w,height:h});await b.settle(700);seq.push([w+'x'+h,await side()]);}
    L.say(ok&&seq[0][1]===true&&seq[2][1]===false,'TC-R225 PRECONDITION a game against the computer is sideways at 1100x1000 and upright at 900x1000 ('+JSON.stringify(seq)+')',seq);
    L.say(seq[1][1]===true&&seq[3][1]===false&&seq[4][1]===true,'TC-R225g dragging across square does not swap layouts: 990x1000 stays sideways, 1010x1000 stays upright, 1100x1000 is sideways again ('+seq.map(x=>x[0]+'='+(x[1]?'sideways':'upright')).join(', ')+')',seq);
    L.say(b.errs.length===0,'TC-R225 zero app errors (band)',b.errs.slice(0,3));await b.close();}
  // (g) his phone
  { const b=await L.launch({geo:'kunal761',name:'dsk149-phone'});await b.open();let ok=true;try{await P.states['cpu-4ply'](b);await b.settle(900);}catch(e){ok=false;}
    const m=await b.page.evaluate(()=>{const r=document.querySelector('.ctside');const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect().width).sort((x,y)=>y-x)[0];return {side:!!r&&getComputedStyle(r).display==='flex',board:Math.round((g||0)*100)/100};});
    L.say(ok&&!m.side&&Math.abs(m.board-375)<=1,'kunal761: TC-R225h his phone is unchanged - a game against the computer is upright with the board 375 wide (board '+m.board+', sideways '+m.side+')',m);
    L.say(b.errs.length===0,'kunal761: TC-R225 zero app errors (phone)',b.errs.slice(0,3));await b.close();}
},'149-desktop-board-pages');
