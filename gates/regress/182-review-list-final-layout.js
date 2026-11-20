'use strict';
// gates/regress/182-review-list-final-layout.js - THE REVIEW LIST'S FINAL LAYOUT (Q25 B): THE SEARCH BOX ON THE YOUR GAMES LINE, THE PRACTICE
// CARDS SIDE BY SIDE, BACK AS AN ICON, AND THREE GAMES ABOVE THE TAB BAR. US-R184 / TC-R258a..k.
//
// WHY [batch 13, jobs/review-list-the-search-box-on-the-your-games-line-and-the-final-layout-2026-11-18; questions/Q25 on the Decision Desk]:
// Kunal picked B at about 11:33pm EST Tue 17 Nov 2026 - "the search box on the Your games line" - after asking for "the search item ... which you
// already have in the app"; with it his earlier picks FB-02 ("don't say back to your analysis. It's too big just say back and game review should
// be centered"), FB-03 (the two practice cards side by side, without their description lines) and FB-05 (the extra text cut, so 3 or 4 game
// cards show without scrolling); and his answer of 18 Nov (decisions/your-games-gets-its-own-section-under-import-2026-11-18): Your games is
// its own section under the Import box, its cards the full content width.
//
// WHAT IT READS: the bundle under test (CT_APP) at 375x761 (kunal761) and 320x568 (se), in the Classic and the Medieval skin, a store of ten
// games (one of them a short 8-ply game) with one saved mistake, so both practice cards show. Everything is found by WHAT IT IS - the title by
// its words, the practice cards by their names, the name box by its accessible name 'Filter by player name' (which the tree before this job
// carries as its placeholder), the Import box as the bordered box holding the site picker - never only by a hook this job added (CLAUDE.md
// #432), so the tree before the change is measured and reddened for its layout, not for a missing selector. Painted text is read from text
// nodes that are drawn (text kept for a screen reader only - clip-path inset(50%) - is not painted).
// WHAT IT ASSERTS, per geometry and skin (every line starts '<WxH> <skin> TC-R258x'):
//  a DENOMINATOR the list is up: ten game cards, the Import box, the name box, both practice cards
//  b the top row: "Game review" centred on the screen within 2px; the menu at the right; no painted "Back to your analysis" anywhere;
//    and the old heading line "Review any game, from anywhere" is not painted
//  c the order down the page: YOUR PROGRESS, the PGN box, the practice cards, the Import box, the Your games line, the cards
//  d the PGN box with its two icons: the '?' and Analyze are 44x44 beside the box on its line, and Analyze paints no letters
//  e the practice cards side by side: one row (tops within 1px), not overlapping, each at least 44 tall, and no description painted
//    (each card paints only its name and its icon glyph)
//  f the import row: the site, the username and the fetch button on one line, the fetch button 44 wide painting no letters
//  g Your games is its own section: below the Import box and outside it, its cards the content width (viewport less 24)
//  h the search box on the Your games line: the name box, the filter button and the count on one line (vertical centres within 4px),
//    the box left of the filter button, the count at the right end; and no "Your games" title is painted (the box is in its place)
//  i the fold: at 375x761 the third card's top is above the tab bar; at 320x568 the games box holds one whole card and the next one starting
//    and runs down to the tab bar (its bottom within 32px of it, gate 164's measure) - read after YOUR PROGRESS was opened and closed
//  j filter open: tapping the filter button opens the chips ABOVE the search box (at 375x761; on the short phone at the top of the games
//    box under it, as since q45), on screen above the tab bar; the page still does not scroll
//  k the search filters by name: typing a name leaves its one game and the count reads '1 of 10'; clearing it brings all ten back
//  l BACK, after a review (Classic only, both sizes): a game is opened, reviewed and left by 'Back to games'; the list's top row then shows the
//    back icon at its left (44x44, no words painted, named 'Back to your analysis' for a screen reader), the title still centred within 2px;
//    tapping it opens that review's summary again
//  m zero app errors
// CT_G182_GEOS=kunal761,se  CT_G182_SKINS=classic,medieval narrow a run (a subset is never the whole gate).
// ON THE REAL TREE: 55/0 (54 TC-R258 lines) on trial b957424375c7 (chess.jsx of c64665d0), 20 Nov 2026.
// CONTROL-RECORD: c64665d0 2026-11-20 total=55 red=42 scope=trial:b9f3716eca72 how=THE SUBJECT REMOVED: the bake-off's base 2c6bdd2f built as it is (the tree before this job) - every TC-R258 letter red somewhere: b (the 'Review any game' line), d (Analyze with its words), e (the practice cards stacked with their sentences), f (Fetch in words), h (the name box under its title), i (the third card's top at 838.6 under the tab bar at 705; at 320x568 the box 88px, 582 against the tab bar at 512, after YOUR PROGRESS opened and closed), j, k, l (the pill under the top row), and at 320x568 a and g (no name box until Filter opens); 13 green, as they should be: the font pin, a, c and g at 375x761 in both skins, the two l denominators, the four zero-errors lines
const L=require('../lib');const R=require('../drive/review');
const GEOS=(process.env.CT_G182_GEOS||'kunal761,se').split(',');
const SKINS=(process.env.CT_G182_SKINS||'classic,medieval').split(',');
const DAY=86400000,D0=1763000000000;
const SHORT='[White "Jsmiller1112"]\n[Black "Shorty"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 *';
const G=[];for(let i=0;i<10;i++)G.push({src:'cc',acct:'jsmiller1112',white:'Jsmiller1112',black:i===0?'Shorty':'Opp'+i,wr:i%2?'win':'resigned',tc:'blitz',date:D0-i*DAY,pgn:i===0?SHORT:R.PGN_OPERA});
const MK=[{fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Blunder',played:'Kd1',ts:1791000000000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',wc:{g:'Blunder',drop:25}}];
const STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':G},ct_mymistakes:MK,ct_pool:'3',ct_bril_reset_v1:'1'};
const near=(a,b,t)=>Math.abs(a-b)<=(t==null?1:t);

// one reading of the list page
function read(){
  const R0=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width,h:q.height,cx:q.left+q.width/2,cy:q.top+q.height/2};};
  const sr=(n)=>{for(let e=n.nodeType===1?n:n.parentElement;e;e=e.parentElement){const c=getComputedStyle(e);if(/inset\(50%\)/.test(c.clipPath||'')||c.display==='none'||c.visibility==='hidden')return true;}return false;};
  // the painted text runs under an element: [text, rect]
  const painted=(root)=>{const out=[];if(!root)return out;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const t=(n.nodeValue||'').trim();if(!t||sr(n))continue;const rg=document.createRange();rg.selectNodeContents(n);const q=rg.getBoundingClientRect();if(q.width<1||q.height<1)continue;out.push({t,r:{l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width,h:q.height,cx:q.left+q.width/2}});}return out;};
  const root=document.getElementById('root');const all=painted(root);const allTxt=all.map(x=>x.t).join(' | ');
  const tb=document.querySelector('[data-ct="tabbar"]');const tab=tb&&tb.getBoundingClientRect().height>0?tb.getBoundingClientRect().top:innerHeight;
  const title=all.find(x=>x.t==='Game review'&&x.r.t<80);
  const btns=[...document.querySelectorAll('button')].filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&q.height>0;});
  const named=(re)=>btns.find(e=>re.test((e.getAttribute('aria-label')||'')+' '+(e.innerText||'')));
  const menu=btns.find(e=>/^Menu and settings$/.test(e.getAttribute('aria-label')||''));
  const back=btns.find(e=>(e.getAttribute('aria-label')||'')==='Back to your analysis');
  const prog=document.querySelector('[data-ct="prog-panel"]');
  const pasteBox=[...document.querySelectorAll('textarea')].find(e=>e.placeholder==='Paste a PGN here');
  const help=btns.find(e=>/How to get a PGN/.test(e.getAttribute('aria-label')||''));
  const ana=btns.find(e=>/Analyze game/.test((e.getAttribute('aria-label')||'')+(e.innerText||'')));
  const card=(name)=>{const leaf=[...root.querySelectorAll('span,div,b')].find(z=>z.children.length===0&&(z.textContent||'').trim()===name&&!sr(z));const e=leaf&&leaf.closest('button');
    return e?{...R0(e),texts:painted(e).map(x=>x.t)}:null;};
  const mk=card('Practice your mistakes'),br=card('Famous brilliant moves')||card('Your brilliant moves');
  const sel=[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='cc'));
  let imp=sel;while(imp&&imp!==root){const c=getComputedStyle(imp);if(parseFloat(c.borderTopWidth)>0&&c.borderTopStyle!=='none'&&imp.getBoundingClientRect().width>innerWidth*0.6)break;imp=imp.parentElement;}
  if(imp===root)imp=null;
  const user=[...document.querySelectorAll('input')].find(e=>/username/i.test(e.placeholder||''));
  const fetch=btns.find(e=>/^Fetch$/.test(((e.getAttribute('aria-label')||'')||(e.innerText||'')).trim())||(e.innerText||'').trim()==='Fetch');
  const nb=[...document.querySelectorAll('input')].filter(e=>(e.placeholder==='Filter by player name'||e.getAttribute('aria-label')==='Filter by player name')&&e.getBoundingClientRect().width>0);
  const tog=document.querySelector('[data-ct="gf-toggle"]');
  const cnt=[...document.querySelectorAll('span')].find(e=>e.children.length===0&&/^\d+ (loaded|of \d+)$/.test((e.innerText||'').trim())&&e.getBoundingClientRect().width>0);
  const rows=[...document.querySelectorAll('[data-ct="game-row"]')];
  const box=document.querySelector('[data-ct="glist-box"]');
  const sec=rows[0]?(()=>{let e=rows[0];while(e&&e!==root){if(e.contains(nb[0]||cnt))return e;e=e.parentElement;}return null;})():null;
  const chips=document.querySelector('[data-ct="gf-bril"]');
  return {vw:innerWidth,vh:innerHeight,tab,title:title?title.r:null,menu:R0(menu),back:R0(back),backPainted:back?painted(back).map(x=>x.t):null,
    backWords:/Back to your analysis/.test(allTxt),oldHead:/Review any game, from anywhere/.test(allTxt),yourGamesTitle:all.some(x=>/^Your games/.test(x.t)),
    prog:R0(prog),paste:R0(pasteBox),help:R0(help),ana:R0(ana),anaPainted:ana?painted(ana).map(x=>x.t).join(''):null,mk,br,
    imp:R0(imp),sel:R0(sel),user:R0(user),fetch:R0(fetch),fetchPainted:fetch?painted(fetch).map(x=>x.t).join(''):null,
    nb:nb.map(R0),nbIn:{imp:!!(imp&&nb[0]&&imp.contains(nb[0]))},tog:R0(tog),cnt:R0(cnt),cntTxt:cnt?(cnt.innerText||'').trim():null,
    rows:rows.map(R0),secOutsideImp:!!(sec&&imp&&!imp.contains(sec)&&!sec.contains(imp)),box:box?{...R0(box),st:box.scrollTop}:null,
    root:{sh:root.scrollHeight,ch:root.clientHeight},chip:chips?{...R0(chips),hit:(()=>{const q=chips.getBoundingClientRect();const h=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return !!h&&(h===chips||chips.contains(h));})()}:null};
}

async function check(b,tag,narrow){
  const m=await b.page.evaluate(read);
  const den=m.rows.length===10&&!!m.imp&&m.nb.length===1&&!!m.mk&&!!m.br;
  L.say(den,tag+' TC-R258a DENOMINATOR the list is up: '+m.rows.length+' game cards, the Import box '+!!m.imp+', the name box x'+m.nb.length+', the practice cards '+!!m.mk+' and '+!!m.br,{rows:m.rows.length,imp:!!m.imp,nb:m.nb.length,mk:!!m.mk,br:!!m.br});
  L.say(!!m.title&&near(m.title.cx,m.vw/2,2)&&!!m.menu&&m.menu.r>m.vw-16&&near(m.menu.cy,m.title.t+m.title.h/2,4)&&!m.backWords&&!m.oldHead,tag+' TC-R258b the top row: "Game review" centred ('+(m.title&&m.title.cx.toFixed(1))+' on '+(m.vw/2)+'), the menu at its right, no "Back to your analysis" painted ('+m.backWords+') and no "Review any game, from anywhere" line ('+m.oldHead+')',{title:m.title,menu:m.menu});
  const ord=[m.prog&&m.prog.b,m.paste&&m.paste.t,m.paste&&m.paste.b,m.mk&&m.mk.t,m.mk&&m.mk.b,m.imp&&m.imp.t,m.imp&&m.imp.b,m.nb[0]&&m.nb[0].t,m.nb[0]&&m.nb[0].b,m.rows[0]&&m.rows[0].t];
  L.say(ord.every(x=>x!=null)&&ord.every((x,i)=>i===0||x>=ord[i-1]-0.5),tag+' TC-R258c the order down the page: YOUR PROGRESS, the PGN box, the practice cards, the Import box, the Your games line, the cards ('+ord.map(x=>x==null?'-':Math.round(x)).join(' <= ')+')',ord);
  L.say(!!m.paste&&!!m.help&&!!m.ana&&[m.help,m.ana].every(x=>near(x.w,44,1)&&near(x.h,44,1)&&near(x.cy,m.paste.cy,2))&&m.help.l>=m.paste.r&&m.ana.l>=m.help.r&&!/[A-Za-z]/.test(m.anaPainted||''),tag+' TC-R258d the PGN box with its two icons: ? and Analyze 44x44 on its line ('+(m.help&&Math.round(m.help.w)+'x'+Math.round(m.help.h))+', '+(m.ana&&Math.round(m.ana.w)+'x'+Math.round(m.ana.h))+'), Analyze paints "'+m.anaPainted+'"',{help:m.help,ana:m.ana});
  const a=m.mk,c=m.br;
  L.say(!!a&&!!c&&near(a.t,c.t,1)&&near(a.h,c.h,1)&&(a.r<=c.l+0.5||c.r<=a.l+0.5)&&a.h>=44-0.5&&c.h>=44-0.5&&a.texts.filter(t=>/[A-Za-z]/.test(t)).join('|')==='Practice your mistakes'&&/^(Famous|Your) brilliant moves$/.test(c.texts.filter(t=>/[A-Za-z]/.test(t)).join('|'))&&a.l>=11&&c.r<=m.vw-11,tag+' TC-R258e the practice cards side by side on one row ('+(a&&Math.round(a.l)+'..'+Math.round(a.r)+' and '+Math.round(c.l)+'..'+Math.round(c.r)+', '+Math.round(a.h)+'px tall')+'), each painting only its name, beside its icon ('+JSON.stringify(a&&a.texts)+', '+JSON.stringify(c&&c.texts)+')',{a,c});
  L.say(!!m.sel&&!!m.user&&!!m.fetch&&near(m.sel.cy,m.fetch.cy,4)&&near(m.user.cy,m.fetch.cy,4)&&m.sel.r<=m.user.l+0.5&&m.user.r<=m.fetch.l+0.5&&near(m.fetch.w,44,1)&&m.fetch.h>=44-0.5&&!/[A-Za-z]/.test(m.fetchPainted||''),tag+' TC-R258f the import row: site, username and the fetch icon on one line (fetch '+(m.fetch&&Math.round(m.fetch.w)+'x'+Math.round(m.fetch.h))+', painting "'+m.fetchPainted+'")',{sel:m.sel,user:m.user,fetch:m.fetch});
  const cw=m.vw-24;
  L.say(m.secOutsideImp&&!m.nbIn.imp&&!!m.imp&&!!m.nb[0]&&m.nb[0].t>=m.imp.b-0.5&&m.rows.length>0&&m.rows.every(r=>near(r.w,cw,1)),tag+' TC-R258g Your games is its own section below the Import box and outside it, its cards the content width ('+(m.rows[0]&&m.rows[0].w.toFixed(1))+' of '+cw+')',{imp:m.imp,nb:m.nb[0],w:m.rows.slice(0,3).map(r=>r.w)});
  const n=m.nb[0];
  L.say(!!n&&!!m.tog&&!!m.cnt&&near(n.cy,m.tog.cy,4)&&near(m.cnt.cy,m.tog.cy,4)&&n.r<=m.tog.l+0.5&&m.tog.r<=m.cnt.l+0.5&&m.cnt.r>=m.vw-12-1&&n.l<=12+1&&!m.yourGamesTitle&&/^10 loaded$/.test(m.cntTxt||''),tag+' TC-R258h the search box on the Your games line: the box ('+(n&&Math.round(n.l)+'..'+Math.round(n.r)+' at '+n.cy.toFixed(1))+'), the filter button ('+(m.tog&&m.tog.cy.toFixed(1))+') and "'+m.cntTxt+'" ('+(m.cnt&&m.cnt.cy.toFixed(1))+') on one line, in the title\'s place (a "Your games" title painted: '+m.yourGamesTitle+')',{n,tog:m.tog,cnt:m.cnt});
  if(!narrow)L.say(m.rows.length>=3&&m.rows[2].t<m.tab-0.5&&m.root.sh<=m.root.ch+1,tag+' TC-R258i at least three game cards show without scrolling: the third card\'s top '+(m.rows[2]&&m.rows[2].t.toFixed(1))+' is above the tab bar at '+m.tab.toFixed(1)+', the page does not scroll',{tops:m.rows.slice(0,4).map(r=>+r.t.toFixed(1)),tab:m.tab});
  else L.say(!!m.box&&m.rows.length>0&&m.box.h>=m.rows[0].h+12&&m.box.b<=m.tab+0.5&&m.tab-m.box.b<=32&&m.root.sh<=m.root.ch+1,tag+' TC-R258i the games box holds one whole card and the next one starting ('+(m.box&&Math.round(m.box.h))+'px for a '+(m.rows[0]&&Math.round(m.rows[0].h))+'px card), running down to the tab bar ('+(m.box&&Math.round(m.box.b))+' to '+Math.round(m.tab)+', within 32 as gate 164), and the page does not scroll',{box:m.box,tab:m.tab});
  return m;
}

L.run(async()=>{
  for(const geo of GEOS)for(const sk of SKINS){
    const narrow=geo==='se';const gn=narrow?'320x568':'375x761';const tag=gn+' '+sk;const med=sk==='medieval';
    const b=await L.launch({geo,dev:false,name:'b182-'+geo+'-'+sk,...(med?{pro:true}:{}),store:{...STORE,...(med?{ct_skin:'2'}:{})}});await b.open();
    try{await b.tile('Review');await b.settle(1500);}catch(e){L.note(tag+' open: '+String(e).slice(0,120));}
    // after an interaction: the progress panel opened and closed again, then read
    try{await b.page.locator('[data-ct="prog-toggle"]').click({timeout:3000});await b.settle(400);await b.page.locator('[data-ct="prog-toggle"]').click({timeout:3000});await b.settle(500);}catch(e){L.note(tag+' progress: '+String(e).slice(0,100));}
    const m=await check(b,tag,narrow);
    // j: filter open
    {let opened=false;try{await b.page.locator('[data-ct="gf-toggle"]').first().click({timeout:3000});await b.settle(700);opened=true;}catch(e){L.note(tag+' filter: '+String(e).slice(0,100));}
     const f=await b.page.evaluate(read);const n=f.nb[0];
     const where=narrow?(!!f.chip&&!!n&&f.chip.t>=n.b-0.5&&!!f.box&&f.chip.t>=f.box.t-0.5):(!!f.chip&&!!n&&f.chip.b<=n.t+0.5);
     L.say(opened&&where&&!!f.chip&&f.chip.t>=0&&f.chip.b<=f.tab+0.5&&f.chip.hit&&f.root.sh<=f.root.ch+1,tag+' TC-R258j filter open: the chips '+(f.chip?Math.round(f.chip.t)+'..'+Math.round(f.chip.b):'(absent)')+' sit '+(narrow?'at the top of the games box under the search box':'above the search box')+' ('+(n&&Math.round(n.t)+'..'+Math.round(n.b))+'), on screen where they take a tap, and the page does not scroll',{chip:f.chip,nb:n,box:f.box});
     try{await b.page.locator('[data-ct="gf-toggle"]').first().click({timeout:3000});await b.settle(500);}catch(e){}}
    // k: the search filters by name
    {const box=b.page.locator('input[placeholder="Filter by player name"],input[aria-label="Filter by player name"]').first();let r1=null,r2=null;
     try{await box.fill('opp3');await b.settle(700);r1=await b.page.evaluate(read);await box.fill('');await b.settle(700);r2=await b.page.evaluate(read);}catch(e){L.note(tag+' search: '+String(e).slice(0,100));}
     L.say(!!r1&&!!r2&&r1.rows.length===1&&r1.cntTxt==='1 of 10'&&r2.rows.length===10&&r2.cntTxt==='10 loaded'&&!!r1.nb[0]&&!!r1.tog&&near(r1.nb[0].cy,r1.tog.cy,4),tag+' TC-R258k the search box filters by name: "opp3" leaves '+(r1&&r1.rows.length)+' game ("'+(r1&&r1.cntTxt)+'"), still on its line; cleared, '+(r2&&r2.rows.length)+' ("'+(r2&&r2.cntTxt)+'")',{r1:r1&&{rows:r1.rows.length,cnt:r1.cntTxt},r2:r2&&{rows:r2.rows.length,cnt:r2.cntTxt}});}
    // l: back, after a review (Classic)
    if(!med){let ok=false,bk=null,again=false;
      try{const i=0;await b.page.locator('[data-ct="game-row"]').nth(i).scrollIntoViewIfNeeded();await b.page.locator('[data-ct="game-opp"]').nth(i).click();
        await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(1000);ok=true;
        await b.tapText(/^‹ Back to games$/,{wait:1200});await b.settle(800);bk=await b.page.evaluate(read);
        if(bk.back){await b.page.mouse.click(bk.back.cx,bk.back.cy);await b.settle(1200);again=await b.page.evaluate(()=>!!document.querySelector('[data-ct="rev-summary"]')&&getComputedStyle(document.querySelector('[data-ct="rev-summary"]')).visibility!=='hidden');}}
      catch(e){L.note(tag+' back: '+String(e).slice(0,140));}
      L.say(ok&&!!bk&&bk.rows.length===10,tag+' TC-R258l DENOMINATOR a game was reviewed and left by Back to games, and the list is up again ('+(bk&&bk.rows.length)+' cards)',{ok});
      L.say(!!bk&&!!bk.back&&near(bk.back.w,44,1)&&near(bk.back.h,44,1)&&bk.back.l<=12&&!!bk.title&&near(bk.back.cy,bk.title.t+bk.title.h/2,4)&&near(bk.title.cx,bk.vw/2,2)&&(bk.backPainted||[]).every(t=>!/[A-Za-z]/.test(t))&&!bk.backWords,tag+' TC-R258l Back is the top row\'s icon: '+(bk&&bk.back?Math.round(bk.back.w)+'x'+Math.round(bk.back.h)+' at x '+Math.round(bk.back.l):'(absent)')+', painting '+JSON.stringify(bk&&bk.backPainted)+', the title still centred ('+(bk&&bk.title&&bk.title.cx.toFixed(1))+'), and no "Back to your analysis" words painted ('+(bk&&bk.backWords)+')',{back:bk&&bk.back,title:bk&&bk.title});
      L.say(again,tag+' TC-R258l tapping the back icon opens that review\'s summary again',{again});}
    L.say(b.errs.length===0,tag+' TC-R258m zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'182-review-list-final-layout');
