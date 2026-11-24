'use strict';
// gates/regress/185-drill-bar-before-and-after.js - THE PUZZLES TAB'S ADVANTAGE BAR SHOWS WHERE IT WAS AND WHERE IT IS AFTER HIS MOVE,
// AND NOTHING WHILE HE THINKS. US-R76 (its #553 clause) / TC-R267a..f.
//
// WHY: jobs/puzzles-the-advantage-bar-shows-before-and-after-your-move-2026-11-19 (batch 14 entry 25). Kunal, about 8:56pm EST Thu 19 Nov
// 2026, with a picture of a drill card ("You gave up the bishop on h7 ...", the bar reading +3.3): "it only shows up after you play the
// move so you can't really compare what change". His pick (decisions/puzzles-advantage-bar-shows-before-and-after-your-move-2026-11-19):
// "Before and after" - hidden while he thinks, so it gives no hint; after his move it shows where it was and where it is now, like
// +0.4 to +3.3, on every puzzle result, right or wrong. Amber flags/amber-553-drill-bar-before-after holds the layout calls.
// The bar is the drill's (data-ct drill-eval, in the top row of the brilliant-moves and mistakes drills); it is the only advantage bar on
// the Puzzles tab - the ordinary puzzles draw none, and adding one there is routed as a question, not built.
// WHAT IT READS: the bundle under test (CT_APP). The brilliant-moves drill seeded with three cards whose evaluations are FACTS OF THE
// POSITION (material), never a sibling readout of the same number:
//   W  White Q v nothing, right move Qb7: before AND after are White a queen up - both positive, at least +5 (or a mate for White), and,
//      the move being the engine-safe one, the two agree in sign
//   X  White Q v Black R on a4, the WRONG move Qd7+?? (Kxd7 leaves Black a rook up): before positive (a queen against a rook, and the
//      rook hangs), after NEGATIVE; then the right move Qxa4+ on the same card: before unchanged, after a queen up (at least +5)
//   Y  the same, mirrored for BLACK (the sign test): Black's Q v White's R on a5, the wrong Qd2+?? - before positive FROM BLACK'S SIDE, after
//      negative; White's view would print both the other way round
// WHAT IT ASSERTS, at kunal761 (375x761, ct_safe 51,31) and 320x568:
//  a  before his move there is no bar, no painted evaluation in the drill's top panel and no element named 'Evaluation for you' - while
//     the card's own position IS being searched behind it (no hint)
//  b  after the move the bar reads '<before> -> <after>' in two painted values (drill-eval-before, drill-eval-after), and the values
//     agree with the domain fact for that card and that result, from the PLAYER's side
//  c  after a wrong move the bar stays up while he tries again and the next move re-reads 'after', keeping 'before'
//  d  the board's top and width and the top row's height are the same before the move and after it (the bar shares the row)
//  e  the two values are whole: the value chip sits inside the bar, is not cut (scrollWidth <= clientWidth) and the bar is on screen;
//     also at the text sizes of gates 177/178 (the page zoom, a W/t x H/t sheet): 375 at 125% and 50%, 320 at 125%, 430x932 at 75%
//  f  a new card hides the bar again; no console errors
// KNOW ITS LIMIT: headless Chromium, the single-thread Stockfish worker; values are read once settled (depth 12), and only their sign
// and scale are pinned. His own look on the phone is his.
const L=require('../lib.js');

const CARDS=[{fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Brilliant',ts:1791000000000,last:null,why:'Card W.'},
             {fen:'4k3/8/8/8/r7/8/8/3QK3 w - - 0 1',uci:'d1a4',label:'Brilliant',ts:1791000001000,last:null,why:'Card X.'},
             {fen:'3qk3/8/8/R7/8/8/8/4K3 b - - 0 1',uci:'d8a5',label:'Brilliant',ts:1791000002000,last:null,why:'Card Y.'}];
const num=(t)=>{t=String(t||'').replace('−','-').trim();if(/^#$/.test(t))return 99;if(/^-#$/.test(t))return -99;let m=t.match(/^(-?)M(\d+)$/);if(m)return m[1]?-50:50;m=t.match(/^([+-]?\d+(\.\d+)?)$/);return m?parseFloat(m[1]):null;};

L.run(async()=>{
  for(const G of [{n:'kunal761',geo:'kunal761',zoom:[{w:300,h:609,t:'375@125%'},{w:750,h:1522,t:'375@50%'},{w:573,h:1243,t:'430x932@75%'}]},
                  {n:'320x568',geo:{w:320,h:568,safe:''},zoom:[{w:256,h:454,t:'320@125%'}]}]){
    const tag=G.n;
    const b=await L.launch({geo:G.geo,name:'drill-before-after-'+G.n,store:{ct_mybrilliancies:CARDS,ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'}});
    await b.open();await b.tile('Review');await b.settle(700);
    let ok=true;try{await b.tapText(/can you spot them again\?/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});}catch(e){ok=false;}
    await b.settle(800);
    const rd=()=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');const hr=t&&t.firstElementChild;
      const e=document.querySelector('[data-ct="drill-eval"]'),n=document.querySelector('[data-ct="drill-eval-num"]');
      const bf=document.querySelector('[data-ct="drill-eval-before"]'),af=document.querySelector('[data-ct="drill-eval-after"]');
      const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
      const gr=g&&g.getBoundingClientRect(),er=e&&e.getBoundingClientRect(),nr=n&&n.getBoundingClientRect();
      const R=(x)=>Math.round(x*10)/10;
      return {hdr:hr?R(hr.getBoundingClientRect().height):null,
        bar:e?{l:R(er.left),r:R(er.right),w:R(er.width),h:R(er.height),num:n?n.innerText.replace(/\s+/g,' ').trim():null,
          before:bf?bf.innerText.trim():null,after:af?af.innerText.trim():null,
          chip:nr?{l:R(nr.left),r:R(nr.right),sw:n.scrollWidth,cw:n.clientWidth}:null,label:e.getAttribute('aria-label')}:null,
        board:gr?{w:R(gr.width),top:R(gr.top)}:null,vw:innerWidth,sx:document.documentElement.scrollWidth,
        evw:t?[...t.querySelectorAll('*')].filter(x=>x.getBoundingClientRect().width>0&&((!x.children.length&&/^([+\-−]\d+(\.\d+)?|[+\-−]?M\d+|-?#|…)$/.test((x.innerText||'').trim()))||/^Evaluation for you/.test(x.getAttribute('aria-label')||''))).length:-1};});
    const settled=async()=>{let r=await rd();for(let k=0;k<40&&(!r.bar||num(r.bar.before)==null||num(r.bar.after)==null);k++){await b.page.waitForTimeout(500);r=await rd();}return r;};
    const fits=(r,where)=>{const c=r.bar&&r.bar.chip;
      L.say(!!c&&c.l>=r.bar.l-0.5&&c.r<=r.bar.r+0.5&&c.sw<=c.cw+1&&r.bar.r<=r.vw+0.5&&r.bar.l>=-0.5&&r.sx<=r.vw+1,'TC-R267e '+tag+' '+where+': both values are whole - the chip ('+(c&&c.l)+'..'+(c&&c.r)+', '+(c&&c.sw)+' of '+(c&&c.cw)+') sits inside the bar ('+(r.bar&&r.bar.l)+'..'+(r.bar&&r.bar.r)+') on a '+r.vw+' screen, no sideways scroll',{bar:r.bar,vw:r.vw,sx:r.sx});};
    const next=async()=>{let nx=true;try{await b.page.locator('[data-ct="drill-next"]').click();}catch(e){nx=false;}await b.settle(1200);return nx;};

    const r0=await rd();
    if(!L.say(ok&&!!r0.board&&r0.hdr>0,'TC-R267 PRECONDITION '+tag+' the brilliant-moves drill opened on card W with its top row and a board',{ok,r0})){await b.close();continue;}
    await b.page.waitForTimeout(2500);const r0b=await rd();
    L.say(r0.bar===null&&r0.evw===0&&r0b.bar===null&&r0b.evw===0,'TC-R267a '+tag+' card W, before his move: no bar, no painted evaluation, nothing named "Evaluation for you" (at once and 2.5s on, while the card is searched behind it: '+r0.evw+', '+r0b.evw+')',{r0:r0.bar,r0b:r0b.bar});
    // ── card W: the right move
    await b.move('b2','b7',900);const r1=await settled();
    const w0=num(r1.bar&&r1.bar.before),w1=num(r1.bar&&r1.bar.after);
    L.say(!!r1.bar&&/→/.test(r1.bar.num||'')&&w0!=null&&w1!=null,'TC-R267b '+tag+' card W, right move: the bar reads before -> after in two values: "'+(r1.bar&&r1.bar.num)+'"',r1.bar);
    L.say(w0!=null&&w1!=null&&w0>=5&&w1>=5,'TC-R267b '+tag+' card W: White a queen up reads at least +5 for him before AND after the right move ('+w0+' -> '+w1+')',{w0,w1});
    L.say(!!r1.bar&&/before your move/.test(r1.bar.label||'')&&/after it/.test(r1.bar.label||''),'TC-R267b '+tag+' card W: its accessible name says which value is which: "'+(r1.bar&&r1.bar.label)+'"',{label:r1.bar&&r1.bar.label});
    L.say(r1.hdr===r0.hdr&&!!r1.board&&r1.board.top===r0.board.top&&r1.board.w===r0.board.w,'TC-R267d '+tag+' card W: the top row ('+r0.hdr+' -> '+r1.hdr+') and the board (top '+r0.board.top+' -> '+(r1.board&&r1.board.top)+', width '+r0.board.w+' -> '+(r1.board&&r1.board.w)+') do not move',{before:r0,after:r1});
    fits(r1,'card W');
    // the text sizes of gates 177/178: the same screen on a W/t x H/t sheet
    const vp0=b.page.viewportSize();
    for(const z of G.zoom){await b.page.setViewportSize({width:z.w,height:z.h});await b.settle(900);const rz=await rd();
      if(L.say(!!rz.bar,'TC-R267e PRECONDITION '+tag+' at '+z.t+' ('+z.w+'x'+z.h+') the bar is still up',{bar:rz.bar}))fits(rz,'at '+z.t+' ('+z.w+'x'+z.h+')');}
    await b.page.setViewportSize(vp0);await b.settle(900);
    // ── card X: the wrong move, then the right one
    const nx1=await next();const r2=await rd();
    L.say(nx1&&r2.bar===null&&r2.evw===0,'TC-R267f '+tag+' the next card (X) hides the bar again ('+r2.evw+' painted)',{nx1,bar:r2.bar});
    await b.move('d1','d7',900);const r3=await settled();
    const x0=num(r3.bar&&r3.bar.before),x1=num(r3.bar&&r3.bar.after);
    L.say(!!r3.bar&&x0!=null&&x1!=null,'TC-R267b PRECONDITION '+tag+' card X, WRONG move Qd7+: the bar is up with two values: "'+(r3.bar&&r3.bar.num)+'"',r3.bar);
    L.say(x0!=null&&x1!=null&&x0>=5&&x1<=-2,'TC-R267b '+tag+' card X, wrong move: before, a queen against a hanging rook, is POSITIVE for him (at least +5); after Qd7+?? Kxd7 he is a rook down, NEGATIVE (at most -2): '+x0+' -> '+x1,{x0,x1});
    L.say(r3.hdr===r0.hdr&&!!r3.board&&r3.board.top===r2.board.top&&r3.board.w===r2.board.w,'TC-R267d '+tag+' card X, wrong move: the top row and the board do not move',{before:r2,after:r3});
    fits(r3,'card X wrong move');
    await b.move('d1','a4',900);await b.page.waitForTimeout(600);let r4=await settled();
    for(let k=0;k<30&&r4.bar&&num(r4.bar.after)!=null&&num(r4.bar.after)<0;k++){await b.page.waitForTimeout(500);r4=await rd();}
    const x2=num(r4.bar&&r4.bar.before),x3=num(r4.bar&&r4.bar.after);
    L.say(!!r4.bar&&x2===x0&&x3!=null&&x3>=5,'TC-R267c '+tag+' card X, then the right move Qxa4+: "before" is kept ('+x0+' -> '+x2+') and "after" is re-read, a queen up again (at least +5: '+x3+')',{x2,x3,bar:r4.bar});
    // ── card Y: Black, the wrong move (the sign test)
    const nx2=await next();
    await b.move('d8','d2',900);const r5=await settled();
    const y0=num(r5.bar&&r5.bar.before),y1=num(r5.bar&&r5.bar.after);
    L.say(nx2&&y0!=null&&y1!=null&&y0>=5&&y1<=-2,'TC-R267b '+tag+' card Y (BLACK to move), wrong move Qd2+: the values are HIS - before positive (a queen against a hanging rook, at least +5), after negative (a rook down, at most -2) - where White\'s view prints them the other way round: '+y0+' -> '+y1,{y0,y1,bar:r5.bar});
    L.say(b.errs.length===0,'TC-R267f '+tag+' no console errors',{errs:b.errs.slice(0,2)});
    await b.close();
  }
},'185-drill-bar-before-and-after');
