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
// KNOW ITS LIMIT: Linux Chromium with the gates' pinned fonts, not his Windows Chrome with Segoe UI (heights run a little taller here, so a fit
// here is pessimistic for his machine); one lesson (the Italian Game); DSK-07 (the Review bottom bar) needs his say and is not built.
// CONTROL-RECORD: bcc4eff 2026-11-13 total=116 red=47 scope=trial:9f4f6f823150 how=#550 t0, the branch tip before these fixes (faa82a9): TC-R225a x5 (panel 598 to 1158 wide), b x11 (278/85, 230/37, 98px over at the three laptop heights; no fold button), d x8 (footer from 615 against the column at 687 at 1280x600, 985 against 1192 at 1920x970), e x6 (sheet 194/155/46 over, one column), f x16 (Review bar 11px over the menu; Home 2px into the bar in Pass and Play, 11 against the computer, at every size), g x1 (990x1000 went upright, 1010x1000 sideways) red; TC-R225c's tall-window arm and h stay green there (unchanged by design), the fold-opens arm does not run (no button: named, not credited); on t3 450fed03791b 119/0 (three more lines: the fold opens at the three laptop heights)
// CONTROL-RECORD: 50bc8e6 2026-11-13 total=147 red=8 scope=trial:2abbad95b07e how=#550 jobs/sideways-lesson-corner-buttons-overlap-the-note-box-2026-11-13: the merged tip's bundle (before the 56px lesson column top) - TC-R225i gap -5 at 1280x620, 1366x700, 1100x800 and 1440x900, demo end and practice (buttons end at 50, note box from 45); the stray-glyph lines and every older line green; on t5 bade581b40e6 147/0
const L=require('../lib');const LS=require('../drive/lesson');const P=require('../drive/play');const R=require('../drive/review');
const G=(w,h)=>({w,h,safe:'',label:w+'x'+h});
const LAP=[[1280,600],[1366,648],[1440,780]];
const ALL=[...LAP,[1920,970],[2560,1320]];
const rail=(b)=>b.page.evaluate(()=>{const r=document.querySelector('.ctside');if(!r||getComputedStyle(r).display!=='flex')return null;const q=r.getBoundingClientRect();
  const fold=[...document.querySelectorAll('button')].find(x=>/^♟ Other lines \(\d+\)/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);
  const br=[...r.querySelectorAll('div')].find(d=>d.children.length===0&&(d.innerText||'').trim()==='Branches from this opening');
  const f=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).position==='fixed'&&d.getBoundingClientRect().bottom>=innerHeight-1&&[...d.querySelectorAll('button')].some(x=>/Play or pause|More for this lesson/.test(x.getAttribute('aria-label')||'')));
  const fr=f?f.getBoundingClientRect():null;
  return {over:r.scrollHeight-r.clientHeight,l:Math.round(q.left),r:Math.round(q.right),fold:fold?(fold.innerText||'').trim():null,branches:!!br,foot:fr?{l:Math.round(fr.left),r:Math.round(fr.right)}:null};});
L.run(async()=>{
  // (a) Tactics & strategy
  for(const [w,h] of ALL){const tag=w+'x'+h;
    const b=await L.launch({geo:G(w,h),name:'dsk149-tac'});await b.open();let ok=true;try{await LS.states['tactics'](b);await b.settle(1200);}catch(e){ok=false;}
    const m=await b.page.evaluate(()=>{const tb=(t)=>[...document.querySelectorAll('button')].find(x=>(x.innerText||'').trim()===t&&x.getBoundingClientRect().width>0);
      const a=tb('Tactics')||tb('🎯 Tactics'),s=tb('Strategy')||tb('♟ Strategy');const bars=[...document.querySelectorAll('button')].filter(x=>/^(🎯 )?Tactics$|^(♟ )?Strategy$/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0).map(x=>x.getBoundingClientRect());
      const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).sort((x,y)=>y.width-x.width)[0];
      if(!bars.length||!g)return null;const row=(a||s)&&(a||s).parentElement?(a||s).parentElement.getBoundingClientRect():null;const pl=Math.min(...bars.map(x=>x.left),row?row.left:1e9),pr=Math.max(...bars.map(x=>x.right),row?row.right:0);
      return {vw:innerWidth,board:{l:Math.round(g.left),r:Math.round(g.right),w:Math.round(g.width)},panel:{l:Math.round(pl),r:Math.round(pr),w:Math.round(pr-pl)}};});
    L.say(ok&&!!m&&m.board.w>=h*0.9,tag+': TC-R225 PRECONDITION Tactics & strategy is up sideways, its board the window height and its two tabs found by their words',m);
    if(m){L.say(m.panel.w<=520,tag+': TC-R225a the panel beside the board is at most 520 wide ('+m.panel.w+')',m.panel);
      const cx=(m.board.l+m.panel.r)/2,want=(m.vw-62-8)/2;L.say(Math.abs(cx-want)<=4||m.panel.r>=m.vw-62-8-14,tag+': TC-R225a board and panel are centred left of the tab rail (centre '+cx+', space centre '+want+')',{cx,want});}
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (Tactics)',b.errs.slice(0,3));await b.close();}
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
  // (h) TC-R225i [#550 jobs/sideways-lesson-corner-buttons-overlap-the-note-box-2026-11-13]: in a sideways lesson on a computer the anchored Home
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
      if(m&&m.across)L.say(m.gap>=6,tag+' '+st+': TC-R225i the corner buttons end at least 6px above the note box (gap '+m.gap+')',m);
      if(m)L.say(m.stray.length===0,tag+' '+st+': TC-R225i no stray menu glyph is painted outside a menu button ('+(m.stray.join(' ')||'none')+')',m.stray);}
    L.say(b.errs.length===0,tag+': TC-R225 zero app errors (corner)',b.errs.slice(0,3));await b.close();}
  // (d) the Review More sheet, (e) the Review corner slot
  for(const [w,h] of [...LAP,[1920,970],['kunal761']]){const tag=w==='kunal761'?w:w+'x'+h;
    const b=await L.launch({geo:w==='kunal761'?w:G(w,h),name:'dsk149-rev',store:{ct_pool:'3'}});await b.open();let ok=true;
    try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,6);await b.settle(900);}catch(e){ok=false;}
    L.say(ok,tag+': TC-R225 PRECONDITION the Opera Game is reviewed, ply 6');
    if(w!=='kunal761'){const c=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pbar-top"]');const m=document.querySelector('button[aria-label="Menu and settings"]');if(!t||!m)return null;return {bar:Math.round(t.getBoundingClientRect().right),menu:Math.round(m.getBoundingClientRect().left)};});
      L.say(!!c&&c.bar<=c.menu-4,tag+': TC-R225f the sideways Review top bar ends before the anchored menu button ('+JSON.stringify(c)+')',c);}
    let sh=null;try{await b.tapCt('rev-more',700);sh=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="rev-sheet"]');if(!s)return null;
      const bs=[...s.querySelectorAll('button')].filter(x=>/^(Show best move|Hide best move|Flip board|Copy PGN|New game|Menu and settings)$/.test((x.innerText||'').trim())).map(x=>Math.round(x.getBoundingClientRect().left));
      return {over:s.scrollHeight-s.clientHeight,cols:[...new Set(bs)].length,n:bs.length};});}catch(e){}
    L.say(!!sh&&sh.n>=4,tag+': TC-R225 PRECONDITION the More sheet is open and its rows found by their words',sh);
    if(sh&&w!=='kunal761'&&h<900){L.say(sh.over<=1,tag+': TC-R225e the More sheet does not scroll ('+sh.over+'px over)',sh);L.say(sh.cols===2,tag+': TC-R225e its rows are in two columns ('+sh.cols+')',sh);}
    if(sh&&w==='kunal761')L.say(sh.cols===1,'kunal761: TC-R225h his phone\'s More sheet is one column ('+sh.cols+')',sh);
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
