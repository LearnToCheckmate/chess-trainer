'use strict';
// gates/regress/192-review-list-page-scrolls.js - THE REVIEW LIST SCROLLS AS ONE PAGE: NO GAMES BOX SCROLLING UNDER A FIXED TOP. US-R202 / TC-R310..317.
//
// WHY [#553 B1, jobs/the-review-list-scrolls-the-whole-page-or-the-list-under-a-fixed-top-decided-on-the-desk-with-pictures-first-2026-11-22]:
// Kunal, of the Review list: "I think this page needs to be able to scroll. There's a lot of issues of not noticing with it right now." (chat,
// about 12:12pm EST Sun 22 Nov 2026). On Desk card 69 he picked "whole-page" at 4:08pm EST Mon 23 Nov 2026 ("Scroll the page. I already
// answered this on desk"): the whole Review list page scrolls, its no page scroll rule set aside for this screen on his pick, and Your games
// stays right under Import (his 18 Nov pick). The app scrolls inside #root, never the document (CLAUDE.md "Below the fold is not
// unreachable"), so "the whole page scrolls" is read as: #root is the ONE scroller of this screen and the games box is not a scroller of its
// own. Before it (#550's q45 fixed page) the games box was fitted to what the page left - 266px with two games at 375x761, 88px holding no
// whole game at 320x568 - and on a sideways phone it was a second scroller (min(46vh,340px)) inside a page that also scrolled.
// WHAT IT READS: the bundle under test (CT_APP), PLAYER view, his data's size - 465 stored games under one account (gate 147's shape) - at
// 375x761 with his insets (kunal761), 320x568 (se) and 844x390 (a phone turned). Every line starts '<WxH> TC-R31x'.
//  TC-R310 DENOMINATOR the list is up with its games box and game rows, the count reading '465 loaded'.
//  TC-R311 one scroller: the only painted element that scrolls is #root, and the games box is not one (overflow-y visible, no max-height,
//          its scrollHeight within 1px of its clientHeight) - and #root really does scroll (it holds more than a screen of games).
//  TC-R312 Your games right under Import: the Your games line starts 0..24px under the Import box's bottom, outside that box.
//  TC-R313 the bottom: #root scrolled to its end brings the last game row and the more-games button fully on screen above the tab bar,
//          each taking a tap at its centre.
//  TC-R314 back: #root scrolled to 0 puts the PGN box, the Import box and the first game row exactly where they started (within 1px).
//  TC-R315 filter open (after the scroll and back): the chips open ABOVE the Player name box at every size (the short phone included, where
//          #550 q45 had opened them inside the games box), on screen where they take a tap, and the games box is still not a scroller.
//  TC-R317 the list keeps its place: #root scrolled down, a game on screen opened and reviewed, '< Back to games' - #root is where it was
//          (within 2px). #root is every screen's
//          scroller, so without this the list came back from a review wherever the review left #root (347px down at 375x761, its top row
//          with the back icon scrolled off; gate 182 TC-R258l found it).
//  TC-R316 zero app errors.
// CT_G192_GEOS=kunal761,se,844x390 narrows a run (a subset is never the whole gate).
const L=require('../lib');
const PGN='[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2025.10.01"]\n[White "Kunal2023"]\n[Black "Opp"]\n[Result "1-0"]\n[TimeControl "180"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const games=[],stats={};const t0=1760000000000;
for(let i=0;i<465;i++){const date=t0+i*3600000;games.push({src:'cc',acct:'kunal2023',pgn:PGN,white:'Kunal2023',black:'Opp',wr:'win',tc:'blitz',date});
  stats['cc:'+date+':Kunal2023:Opp']={src:'review',bril:0,great:1,inacc:2,mist:1,blun:0,acc:80};}
const STORE={ct_ccuser:'',ct_liuser:'',ct_accts:['cc:kunal2023'],ct_acctgames:{'cc:kunal2023':games},ct_gamestats:stats,ct_bril_reset_v1:'1',ct_pool:'3'};
const GEOS=(process.env.CT_G192_GEOS||'kunal761,se,844x390').split(',');
const near=(a,b,t)=>a!=null&&b!=null&&Math.abs(a-b)<=(t==null?1:t);

function read(){
  const R0=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {l:+q.left.toFixed(1),t:+q.top.toFixed(1),r:+q.right.toFixed(1),b:+q.bottom.toFixed(1),w:+q.width.toFixed(1),h:+q.height.toFixed(1),cx:q.left+q.width/2,cy:q.top+q.height/2};};
  const hit=(e)=>{if(!e)return false;const q=e.getBoundingClientRect();const h=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return !!h&&(h===e||e.contains(h));};
  const root=document.getElementById('root');
  // the tab bar: at the bottom on an upright phone; a sideways phone has it as a right rail, so the screen's bottom is the floor there
  const tb=document.querySelector('[data-ct="tabbar"]');const tq=tb&&tb.getBoundingClientRect();const tab=tq&&tq.height>0&&tq.top>innerHeight/2?tq.top:innerHeight;
  const scrollers=[...document.querySelectorAll('*')].filter(e=>{const q=e.getBoundingClientRect();if(!q.width||!q.height)return false;
    return (e===root||/auto|scroll/.test(getComputedStyle(e).overflowY))&&e.scrollHeight>e.clientHeight+1;}).map(e=>e.id||e.getAttribute('data-ct')||String(e.className||e.tagName).slice(0,24));
  const box=document.querySelector('[data-ct="glist-box"]');const bs=box&&getComputedStyle(box);
  const rows=[...document.querySelectorAll('[data-ct="game-row"]')];
  // the Import box: the bordered box holding the site picker (gate 182's reading), found by what it is
  const sel=[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='cc'));
  let imp=sel;while(imp&&imp!==root){const c=getComputedStyle(imp);if(parseFloat(c.borderTopWidth)>0&&c.borderTopStyle!=='none'&&box&&imp.getBoundingClientRect().width>=box.getBoundingClientRect().width*0.9)break;imp=imp.parentElement;}
  if(imp===root)imp=null;
  const nb=[...document.querySelectorAll('input')].find(e=>(e.placeholder==='Player name'||e.getAttribute('aria-label')==='Filter by player name')&&e.getBoundingClientRect().width>0);
  const line=nb?nb.parentElement:null;
  const cnt=[...document.querySelectorAll('span')].find(e=>e.children.length===0&&/^\d+ (loaded|of \d+)$/.test((e.innerText||'').trim())&&e.getBoundingClientRect().width>0);
  const title=[...document.querySelectorAll('textarea')].find(e=>e.placeholder==='Paste a PGN here'&&e.getBoundingClientRect().width>0);   /* the PGN box, near the top at every size (a sideways phone has no 'Game review' row) */
  const more=[...document.querySelectorAll('button')].find(e=>e.getAttribute('data-ct')==='glist-more'||/^Show \d+ more|more games/i.test((e.innerText||'').trim()));
  const chip=document.querySelector('[data-ct="gf-bril"]');
  const last=rows[rows.length-1];
  return {vw:innerWidth,vh:innerHeight,tab:+tab.toFixed(1),scrollers,root:{sh:root.scrollHeight,ch:root.clientHeight,st:Math.round(root.scrollTop)},
    box:box?{...R0(box),sh:box.scrollHeight,ch:box.clientHeight,oy:bs.overflowY,mh:bs.maxHeight}:null,rows:rows.length,first:R0(rows[0]),
    last:last?{...R0(last),hit:hit(last)}:null,more:more?{...R0(more),hit:hit(more),txt:(more.innerText||'').trim().slice(0,40)}:null,
    imp:R0(imp),lineInImp:!!(imp&&line&&imp.contains(line)),line:R0(line),nb:R0(nb),cnt:cnt?(cnt.innerText||'').trim():null,title:R0(title),
    chip:chip?{...R0(chip),hit:hit(chip)}:null};
}

L.run(async()=>{
  for(const g0 of GEOS){const geo=/^\d+x\d+$/.test(g0)?{w:+g0.split('x')[0],h:+g0.split('x')[1],safe:''}:g0;
    const gn=g0==='kunal761'?'375x761':g0==='se'?'320x568':g0;
    const b=await L.launch({geo,dev:false,name:'g192-'+gn,store:STORE});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(1500);}catch(e){ok=false;L.note(gn+' open: '+String(e).slice(0,120));}
    const m=await b.page.evaluate(read);
    L.say(ok&&!!m.box&&m.rows>0&&m.cnt==='465 loaded',gn+' TC-R310 DENOMINATOR the Review list is up with its games box and '+m.rows+' game rows, the count reading "'+m.cnt+'"',{rows:m.rows,cnt:m.cnt,box:!!m.box});
    const boxFlat=(x)=>!!x.box&&x.box.oy==='visible'&&x.box.mh==='none'&&x.box.sh<=x.box.ch+1;
    L.say(boxFlat(m)&&m.scrollers.length===1&&m.scrollers[0]==='root'&&m.root.sh>m.root.ch+m.vh,gn+' TC-R311 one scroller: the page (#root '+m.root.sh+' in '+m.root.ch+') is the only thing that scrolls ('+m.scrollers.join(', ')+'), and the games box is not one (overflow-y '+(m.box&&m.box.oy)+', max-height '+(m.box&&m.box.mh)+', '+(m.box&&m.box.sh)+' in '+(m.box&&m.box.ch)+')',{scrollers:m.scrollers,root:m.root,box:m.box});
    L.say(!!m.imp&&!!m.line&&!m.lineInImp&&m.line.t>=m.imp.b-0.5&&m.line.t-m.imp.b<=24,gn+' TC-R312 Your games right under Import: its line starts at '+(m.line&&m.line.t)+', '+(m.imp&&m.line?(m.line.t-m.imp.b).toFixed(1):'-')+'px under the Import box ('+(m.imp&&m.imp.b)+'), outside it ('+!m.lineInImp+')',{imp:m.imp,line:m.line});
    // to the bottom of the page
    await b.page.evaluate(()=>{const r=document.getElementById('root');r.scrollTop=r.scrollHeight;});await b.settle(700);
    const z=await b.page.evaluate(read);
    const onS=(x)=>!!x&&x.t>=-0.5&&x.b<=z.tab+0.5&&x.hit;
    L.say(z.root.st>0&&onS(z.last)&&onS(z.more),gn+' TC-R313 the bottom: #root scrolled to '+z.root.st+' brings the last game row ('+(z.last&&z.last.t+'..'+z.last.b)+') and "'+(z.more&&z.more.txt)+'" ('+(z.more&&z.more.t+'..'+z.more.b)+') fully on screen above '+z.tab+', each taking a tap',{st:z.root.st,last:z.last,more:z.more,tab:z.tab});
    // and back to the top
    await b.page.evaluate(()=>{document.getElementById('root').scrollTop=0;});await b.settle(700);
    const k=await b.page.evaluate(read);
    L.say(k.root.st===0&&!!k.title&&!!m.title&&near(k.title.t,m.title.t)&&near(k.imp&&k.imp.t,m.imp&&m.imp.t)&&near(k.first&&k.first.t,m.first&&m.first.t)&&k.title.t>=0,gn+' TC-R314 back at the top: the PGN box at '+(k.title&&k.title.t)+' (was '+(m.title&&m.title.t)+'), the Import box at '+(k.imp&&k.imp.t)+' (was '+(m.imp&&m.imp.t)+'), the first game at '+(k.first&&k.first.t)+' (was '+(m.first&&m.first.t)+')',{title:[m.title&&m.title.t,k.title&&k.title.t],imp:[m.imp&&m.imp.t,k.imp&&k.imp.t],first:[m.first&&m.first.t,k.first&&k.first.t]});
    // TC-R317 the list keeps its place across a review: #root is every screen's scroller, so the list must come back from a review where he
    // left it - scrolled down, a game on screen opened and reviewed, '< Back to games', and #root is where it was (within 2px)
    {let ok7=true,p0=null,p1=null,t0=Date.now();try{
       p0=await b.page.evaluate(()=>{const r=document.getElementById('root');r.scrollTop=2000;return Math.round(r.scrollTop);});await b.settle(600);
       const idx=await b.page.evaluate(()=>{const tb=document.querySelector('[data-ct="tabbar"]');const tq=tb&&tb.getBoundingClientRect();const fl=tq&&tq.height>0&&tq.top>innerHeight/2?tq.top:innerHeight;
         return [...document.querySelectorAll('[data-ct="game-opp"]')].findIndex(e=>{const q=e.getBoundingClientRect();return q.height>0&&q.top>=0&&q.bottom<=fl;});});
       if(idx<0)throw new Error('no game on screen');
       await b.page.locator('[data-ct="game-opp"]').nth(idx).click();
       await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(1000);
       await b.tapText(/^‹ Back to games$/,{wait:1200});await b.settle(900);
       p1=await b.page.evaluate(()=>Math.round(document.getElementById('root').scrollTop));}catch(e){ok7=false;L.note(gn+' place: '+String(e).slice(0,140));}
     L.say(ok7&&p0>0&&p1!=null&&Math.abs(p1-p0)<=2,gn+' TC-R317 the list keeps its place: scrolled to '+p0+', a game opened and reviewed, Back to games, and it is at '+p1+' ('+Math.round((Date.now()-t0)/1000)+' s)',{p0,p1});
     try{await b.page.evaluate(()=>{document.getElementById('root').scrollTop=0;});await b.settle(500);}catch(e){}}
    // filter open
    let opened=false;try{await b.page.locator('[data-ct="gf-toggle"]').first().click({timeout:3000});await b.settle(700);opened=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="gf-toggle"]');return !!e&&e.getAttribute('aria-expanded')==='true';});}catch(e){L.note(gn+' filter: '+String(e).slice(0,100));}
    const f=await b.page.evaluate(read);
    L.say(opened&&!!f.chip&&!!f.nb&&f.chip.b<=f.nb.t+0.5&&f.chip.t>=-0.5&&f.chip.b<=f.tab+0.5&&f.chip.hit&&boxFlat(f),gn+' TC-R315 filter open: the chips ('+(f.chip?f.chip.t+'..'+f.chip.b:'absent')+') sit above the Player name box ('+(f.nb&&f.nb.t)+'), on screen where they take a tap, and the games box is still not a scroller',{opened,chip:f.chip,nb:f.nb,box:f.box});
    L.say(b.errs.length===0,gn+' TC-R316 zero app errors',b.errs.slice(0,3));
    await b.close();}
},'192-review-list-page-scrolls');
