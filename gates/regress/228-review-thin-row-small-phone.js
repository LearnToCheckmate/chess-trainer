'use strict';
// gates/regress/228-review-thin-row-small-phone.js - ON A SMALL PHONE OPENED FROM ITS HOME SCREEN ICON, REVIEW'S BUTTON ROW IS THIN, ICONS
// ONLY, AND THE BOARD GROWS; EVERY OTHER PHONE KEEPS THE 44 ROW. US-R236 / TC-R381..384.
//
// WHY [#553, jobs/short-upright-boards-sized-to-height-2026-11-12; Desk card 74, his pick C at about 7:29am EST Tue 24 Nov 2026,
// docs/run-answers orchestrator-B14-Q2-2026-11-24]: on a 320x568 phone opened from its Home Screen icon even the tightest rows left Review
// only 301 for the board. His pick: "a thinner button row on the small phone, so the board grows part of the way" (to about 313), and "make
// the buttons thinner and make them consistent with the icons that we're using as of yesterday" (card 70's set: the move arrows solid
// triangles). Amber (32 tall, the two labels dropped, only at revFit's last step): flags/amber-553-review-thin-row-small-phone.
// WHAT IT READS: the bundle under test (CT_APP). Review of the Opera Game (drive/review) at ply 16, in four launches:
//   app      320x568 Home Screen app: a 320x548 layout viewport on a 320x568 screen, the shell on (ct_fullh), real insets 20/0 (as gate 184)
//   375x761  kunal761 (his phone, ct_safe 51,31);  320x568  se (no insets: 321 of room for the board, one short of revFit's margin, so this
//            is the case that must NOT thin);  375x667
// The toolbar's members are found by WHAT THEY ARE CALLED (aria-label: Previous move, Next key moment..., Analyze this position, Next move)
// inside [data-ct="rev-toolbar"], never by a hook this build added (CLAUDE.md, #432).
// WHAT IT ASSERTS:
//  381 DENOMINATOR, per launch: Review reached, the board found, all four toolbar members on screen
//  382 app: the board is at least 313.03 wide and centred (it was 301.03), and every member is 32 tall (within 0.5), at least 44 wide, and
//      ends inside the painted 568
//  383 app: icons only - no member paints a letter or a digit; Previous and Next move paint the solid white triangle (card 70)
//  384 every other launch: every member is at least 44 tall (the thin row is the small phone's last step only) and the board is the full width
// CT_G228_ONLY=<regex on the launch name> runs only those launches (a subset is never the whole gate).
// CONTROL-RECORD: 3de0f469 2026-11-24 total=19 red=3 scope=trial:4d3e12a670dc how=THE SUBJECT REMOVED: the branch's start (3de0f469, built as base) - the app launch's board 301.03 and its row 44 tall with the words Key move and Analyze (TC-R382 twice, TC-R383); the fix (trial b7c44d474270) 19 pass 0 fail
const L=require('../lib');
const R=require('../drive/review');
R.shareAnalysis();
const LAUNCHES=[
  ['app',{geo:{w:320,h:548,safe:'',label:'320x568 Home Screen app: 548 layout viewport, the 568 shell, real insets 20/0'},screen:{w:320,h:568},realInsets:'20,0',store:{ct_pool:'3',ct_fullh:'1'}},{thin:true,paint:568,min:313.03}],
  ['375x761',{geo:'kunal761',store:{ct_pool:'3'}},{}],
  ['320x568',{geo:'se',store:{ct_pool:'3'}},{}],
  ['375x667',{geo:{w:375,h:667,safe:'',label:'375x667'},store:{ct_pool:'3'}},{}],
];
const NAMES=[/^Previous move$/,/^(Next key moment|No key moments)/,/^Analyze this position$/,/^Next move$/];
const ONLY=process.env.CT_G228_ONLY?new RegExp(process.env.CT_G228_ONLY):null;
const read=(b,names)=>b.page.evaluate((src)=>{const res=src.map(s=>new RegExp(s));
  const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  const br=g?g.getBoundingClientRect():null;const tb=document.querySelector('[data-ct="rev-toolbar"]');
  const btns=tb?[...tb.querySelectorAll('button')]:[];
  const mem=res.map(re=>{const e=btns.find(x=>re.test(x.getAttribute('aria-label')||''));if(!e)return null;const r=e.getBoundingClientRect();
    const sh=[...e.querySelectorAll('svg polygon,svg polyline')].map(x=>{const cs=getComputedStyle(x);return {tag:x.tagName.toLowerCase(),fill:cs.fill,pts:(x.points&&x.points.numberOfItems)||0};});
    return {n:e.getAttribute('aria-label'),w:+r.width.toFixed(2),h:+r.height.toFixed(2),t:+r.top.toFixed(2),b:+r.bottom.toFixed(2),text:(e.innerText||'').trim(),sh};});
  return {vw:innerWidth,board:br?{l:+br.left.toFixed(2),r:+br.right.toFixed(2),w:+br.width.toFixed(2)}:null,mem};},names.map(x=>x.source));
L.run(async()=>{
  for(const [name,opts,want] of LAUNCHES){
    if(ONLY&&!ONLY.test(name))continue;
    let b=null,ok=true,m=null;
    try{b=await L.launch(opts);await b.open();await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,16);await b.settle(1500);m=await read(b,NAMES);}
    catch(e){ok=false;L.note(name+': '+String(e).slice(0,200));}
    const all=ok&&!!m&&!!m.board&&m.mem.every(Boolean);
    L.say(all,'TC-R381 '+name+': DENOMINATOR - Review at ply 16, the board found and the four toolbar buttons on screen ('+(m?m.mem.map((x,i)=>x?x.n:'MISSING '+NAMES[i].source).join(', '):'no reading')+')',m);
    if(!all){if(b)await b.browser.close().catch(()=>{});continue;}
    const gl=m.board.l,gr=+(m.vw-m.board.r).toFixed(2);
    if(want.thin){
      L.say(m.board.w>=want.min-0.5&&Math.abs(gl-gr)<=1.5,'TC-R382 '+name+': the board is at least '+want.min+' and centred - '+m.board.w+' ('+gl+' left, '+gr+' right; 301.03 before the thin row)',m.board);
      const bad=m.mem.filter(x=>Math.abs(x.h-32)>0.5||x.w<44||x.b>want.paint+0.5);
      L.say(bad.length===0,'TC-R382 '+name+': every toolbar button is 32 tall, at least 44 wide and ends inside '+want.paint+' ('+m.mem.map(x=>x.n.split(' (')[0]+' '+x.w+'x'+x.h+' to '+x.b).join('; ')+')',bad);
      const worded=m.mem.filter(x=>/[\p{L}\p{N}]/u.test(x.text));
      L.say(worded.length===0,'TC-R383 '+name+': icons only - no toolbar button paints a word ('+(worded.length?worded.map(x=>JSON.stringify(x.text)).join(', '):'none of 4')+')',worded);
      const mv=[m.mem[0],m.mem[3]];const solid=x=>x.sh.some(s=>s.tag==='polygon'&&s.pts===3&&s.fill==='rgb(255, 255, 255)')&&!x.sh.some(s=>s.tag==='polyline');
      L.say(mv.every(solid),'TC-R383 '+name+': Previous and Next move paint the solid white triangle (card 70) ('+mv.map(x=>x.n+' '+JSON.stringify(x.sh.map(s=>s.tag+':'+s.fill))).join('; ')+')',mv);
    }else{
      const low=m.mem.filter(x=>x.h<43.5);
      L.say(low.length===0,'TC-R384 '+name+': the toolbar keeps its 44 row here (the thin row is the small phone\'s last step only) ('+m.mem.map(x=>x.n.split(' (')[0]+' '+x.h).join('; ')+')',low);
      L.say(Math.abs(gl)<=1.5&&Math.abs(gr)<=1.5,'TC-R384 '+name+': the board is the full width - '+m.board.w+' of '+m.vw+' ('+gl+' left, '+gr+' right)',m.board);
    }
    L.say(b.errs.length===0,'TC-R381 '+name+': zero app errors',b.errs.slice(0,3));
    await b.browser.close().catch(()=>{});
  }
},'228-review-thin-row-small-phone');
