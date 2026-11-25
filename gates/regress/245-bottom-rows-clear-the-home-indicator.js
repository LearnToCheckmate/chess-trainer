'use strict';
// gates/regress/245-bottom-rows-clear-the-home-indicator.js - THE LOWEST BUTTONS ON PLAY AND REVIEW END ABOVE THE HOME INDICATOR. US-R256 / TC-R445..R447.
//
// WHY [#553 B2, jobs/play-and-review-bottom-rows-sit-inside-the-home-indicator-band-2026-11-23 (P1) and
// jobs/landscape-review-controls-cross-the-bottom-inset-and-two-buttons-are-30-tall-2026-11-23; amber
// flags/amber-553-bottom-rows-clear-the-home-indicator]: on his phone in the Home Screen app the page pads its foot 8, not the 31 of the
// home-indicator band, so his thumb on the lowest Play and Review buttons landed on the indicator. Measured on the tree before (trial
// 16842a2d7e5c, run-branch f79d9f5f) with the insets Chromium itself reports: Play's row ended 793.5 (vs the computer) and 800.5 (Pass and
// Play, live and after mate) against a safe bottom of 781, Review's 798; sideways at 812x375 (21 below) Review's round Analyze button 370
// against 354.
// WHAT IT READS: the bundle under test (CT_APP). Two shapes, insets REAL (env() padded as on a phone), never ct_safe:
//   app   L.HOME_SCREEN_APP: 375x761 layout viewport, the 812 shell (ct_fullh), CDP insets 51/31 - safe bottom 812 - 31 = 781
//   side  812x375 on a 375x812 screen, CDP insets top 0, bottom 21, left/right 59 - safe bottom 354
// States: app - Play against the computer at move 0 and after four plies, Pass and Play after 1.f3 (live) and after its mate (game over),
// Review of the Opera Game at ply 0; side - the same Review. The safe bottom is the painted height (the shell's when it is on) less
// env(safe-area-inset-bottom), both read in the page.
//  TC-R445 DENOMINATOR per state: the insets read back through env() as set; the row is found and holds buttons (Play: play-toolbar, Review
//      upright: rev-toolbar, sideways: the bottom player bar with the round Analyze button); the board is found.
//  TC-R446 every button in that row ends at or above the safe bottom (0.5px slack).
//  TC-R447 the board is no smaller than before the fix: 375.03 wide upright (within 0.5), 374.95 tall sideways (within 0.5); and Review's Back
//      and More, drawn 30 tall, still take a tap over at least 44 of height (hit test down their centre line), where they are shown.
// KNOW ITS LIMIT: Chromium's inset override, not iOS Safari; normal text size; one game per screen. Back and More drawn 30 tall are kept on
// purpose (the lead's ruling, #553): their tap is 44.5 by this hit test (ct-hitdn, gate 144 TC-R220f), and the 32-tall foot buttons at 320x568
// are Kunal's card 74 pick C, so neither is asserted to be drawn 44.
// ON THE REAL TREE: 29 pass, 0 fail on trial d7d55579e1d3 (worktree commit 807a3a28 on f79d9f5f), 25 Nov 2026, about 70 s.
// CONTROL-RECORD: f79d9f5f 2026-11-25 total=29 red=6 scope=trial:16842a2d7e5c how=#553 B2 the tree before the fix (no inset under the rows): TC-R446 red in all six states - Play's row ends 793.5 (cpu-m0, cpu-4ply) and 800.5 (pp-1, pp-mate) past 781, Review's 798, sideways rev-fab 370 past 354; TC-R445 and TC-R447 stay green (the board was already 375.03 / 374.95)
const L=require('../lib');const RV=require('../drive/review');const P=require('../drive/play');
const APP=Object.assign({},L.HOME_SCREEN_APP,{store:Object.assign({ct_pool:'3'},L.HOME_SCREEN_APP.store)});
const SIDE={geo:{w:812,h:375,safe:'',label:'812x375 on a 375x812 screen, insets 0/21, 59 each side'},screen:{w:375,h:812},store:{ct_pool:'3',ct_fullh:'1'}};
const RUNS=[
  ['app','cpu-m0',APP,{ins:[51,31],row:'play-toolbar',boardW:375.03}],
  ['app','cpu-4ply',APP,{ins:[51,31],row:'play-toolbar',boardW:375.03}],
  ['app','pp-1',APP,{ins:[51,31],row:'play-toolbar',boardW:375.03}],
  ['app','pp-mate',APP,{ins:[51,31],row:'play-toolbar',boardW:375.03}],
  ['app','rev-0',APP,{ins:[51,31],row:'rev-toolbar',boardW:375.03}],
  ['side','rev-0',SIDE,{ins:[0,21],lr:59,row:'pbar-bottom',boardH:374.95,cdp:{top:0,bottom:21,left:59,right:59}}],
];
const read=(b,row)=>b.page.evaluate((row)=>{
  const pr=(p)=>{const d=document.createElement('div');const hz=p==='left'||p==='right';d.style.cssText='position:fixed;left:0;top:0;visibility:hidden;width:'+(hz?'env(safe-area-inset-'+p+',0px)':'1px')+';height:'+(hz?'1px':'env(safe-area-inset-'+p+',0px)');document.body.appendChild(d);const r=d.getBoundingClientRect();d.remove();return hz?r.width:r.height;};
  const ins={top:pr('top'),bottom:pr('bottom'),left:pr('left'),right:pr('right')};
  const full=document.documentElement.classList.contains('ct-fullh')?document.documentElement.getBoundingClientRect().height:0;
  const paint=full||innerHeight,safeB=paint-ins.bottom;
  const vis=(e)=>{const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;for(let n=e;n&&n.nodeType===1;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;}return true;};
  const rows=[...document.querySelectorAll('[data-ct="'+row+'"]')].filter(vis);
  const btns=[];for(const r of rows)for(const e of r.querySelectorAll('button,[role="button"]'))if(vis(e)){const q=e.getBoundingClientRect();btns.push({ct:e.getAttribute('data-ct')||'',t:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),top:+q.top.toFixed(1),bot:+q.bottom.toFixed(1)});}
  const grids=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>d.getBoundingClientRect()).filter(r=>r.width>100).sort((a,b)=>b.width-a.width);
  const board=grids[0]?{w:+grids[0].width.toFixed(2),h:+grids[0].height.toFixed(2)}:null;
  const taps=['rev-back','rev-more'].map(ct=>{const e=[...document.querySelectorAll('[data-ct="'+ct+'"]')].find(vis);if(!e)return null;const q=e.getBoundingClientRect();const cx=q.left+q.width/2;let n=0;for(let y=q.top-20;y<=q.bottom+20;y+=0.5){const h=document.elementFromPoint(cx,y);if(h&&(h===e||e.contains(h)))n+=0.5;}return {ct,h:+q.height.toFixed(1),tap:n};}).filter(Boolean);
  return {ins,paint,safeB,nRows:rows.length,btns,board,taps};},row);
L.run(async()=>{
  for(const [shape,st,opts,want] of RUNS){const tag=shape+' '+st;let b=null,m=null,err=null;
    try{const o=Object.assign({name:'g245-'+shape},opts);b=await L.launch(o);
      if(want.cdp){const cdp=await b.ctx.newCDPSession(b.page);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:want.cdp});}
      await b.open();
      if(st.startsWith('rev-')){await RV.importPgn(b,RV.PGN_OPERA,180000);await RV.startReview(b);await b.settle(800);}
      else{await P.states[st](b);await b.settle(700);}
      m=await read(b,want.row);}catch(e){err=String(e.message||e).slice(0,160);}
    const insOk=!!m&&Math.abs(m.ins.top-want.ins[0])<0.5&&Math.abs(m.ins.bottom-want.ins[1])<0.5&&(want.lr==null||(Math.abs(m.ins.left-want.lr)<0.5&&Math.abs(m.ins.right-want.lr)<0.5));
    L.say(!err&&insOk&&m.nRows>0&&m.btns.length>0&&!!m.board,'TC-R445 '+tag+' DENOMINATOR: insets read back '+(m?JSON.stringify(m.ins):'-')+', the '+want.row+' row holds '+(m?m.btns.length:0)+' buttons, the board is found',err||(m&&{ins:m.ins,nRows:m.nRows,board:m.board}));
    if(!m){if(b)await b.close();continue;}
    const past=m.btns.filter(x=>x.bot>m.safeB+0.5);
    L.say(m.btns.length>0&&past.length===0,'TC-R446 '+tag+': every button in the '+want.row+' row ends at or above the safe bottom '+m.safeB+' (lowest '+Math.max(...m.btns.map(x=>x.bot))+'; '+past.length+' of '+m.btns.length+' past)',past);
    if(want.boardW)L.say(!!m.board&&m.board.w>=want.boardW-0.5,'TC-R447 '+tag+': the board is '+(m.board&&m.board.w)+' wide, no smaller than '+want.boardW,m.board);
    if(want.boardH)L.say(!!m.board&&m.board.h>=want.boardH-0.5,'TC-R447 '+tag+': the board is '+(m.board&&m.board.h)+' tall, no smaller than '+want.boardH,m.board);
    if(st.startsWith('rev-')){L.say(m.taps.length===2,'TC-R447 '+tag+' DENOMINATOR: Back and More are shown ('+m.taps.length+' of 2)',m.taps);
      L.say(m.taps.length===2&&m.taps.every(x=>x.tap>=44),'TC-R447 '+tag+': Back and More take a tap over at least 44 of height ('+m.taps.map(x=>x.ct+' drawn '+x.h+', tap '+x.tap).join('; ')+')',m.taps);}
    L.say(b.errs.length===0,'TC-R445 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}
},'245-bottom-rows-clear-the-home-indicator');
