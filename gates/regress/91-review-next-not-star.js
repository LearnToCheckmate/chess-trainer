'use strict';
// gates/regress/91-review-next-not-star.js - A TAP ON NEXT REACHES NEXT, NOT THE STAR. TC-R176a..c, US-R113.
// CONTROL-RECORD: 122ecb3 2026-11-11 total=11 red=4 scope=trial:dbb60cfb5c95 how=#550 item (2): trial t1 (item 1's tree, the button row still directly above the move strip) - TC-R176a (order) and TC-R176b (the star 6pt from the next arrow) red at kunal761 and 320x568; TC-R176c green (the tap reaches the arrow either way, which is why (a) and (b) are the controlled half)
// THE ENGINE BRANCH, STATED RATHER THAN DEFAULTED [#550 item (59); jobs/twenty-four-regress-gates-force-ct-pool-on-every-launch-and-no-harness-route-reaches-the-single-worker-fallback-2026-10-21]: every launch in this file passes ct_pool, so the app runs its POOLED Stockfish path and the single-worker and built-in fallbacks (the harness route is the launch option engineFail 'pool' or 'all', driven by gate 34) are NOT exercised here. Its assertions do NOT depend on that branch: it asserts the order and spacing of the review controls and where a tap lands; no grade enters its assertions.
//
// WHY [#550, item (2) of directOpening_2026_11_11_batch10;
// jobs/review-star-button-sits-on-the-next-move-arrow-so-next-taps-hit-the-star-2026-11-11]. Kunal, about 12:07am EST
// Wed 11 Nov 2026, with a screenshot of the Review board at 24...Ra2: the button row (first, play, last, star) sat directly
// above the move strip (<, moves, >), and he kept hitting the star (next KEY moment) when he meant the strip's > (next
// move). The audit measured the star 88x44 at y 667 and the arrow 26x36 at y 717, 6pt apart (docs/app-audit-2026-11-11,
// AUD-R01). His fix, in his words: the move's explanation goes BETWEEN the button row and the move strip.
//
// WHAT IT ASSERTS, at 375x761 with his insets and at 320x568, on the Opera game at ply 10 (the star mounted, so the
// row is the four-button row he reported): (a) the ORDER - the button row is above the move line, the move line above
// the strip; (b) the GAP between the star's bottom edge and the strip's > top edge is at least 40pt (a thumb's width:
// it was 6); (c) a REAL TAP at the centre of > lands on > (elementFromPoint) and moves the board exactly one ply, not
// to the next key moment. (c) is the one he feels; (a) and (b) say why it now holds.
const L=require('../lib');
const R=require('../drive/review');

(async()=>{
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'next-'+geo,store:{ct_pool:'3'}});await b.open();
    let ok=true;
    try{await R.ensureReview(b,'opera');await R.startReview(b);await R.goPly(b,10);}catch(e){ok=false;L.say(false,geo+': TC-R176a the Review move screen at ply 10 was reached',String(e).slice(0,200));}
    if(ok){
      const m=await b.page.evaluate(()=>{const R=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return {top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,left:r.left,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
        const row=[...document.querySelectorAll('[data-ct="rev-row1"]')].pop(),line=[...document.querySelectorAll('[data-ct="rev-move-line"]')].pop(),strip=[...document.querySelectorAll('[data-ct="strip-row"]')].pop();
        const star=[...document.querySelectorAll('button')].find(x=>/^Next key moment/.test(x.getAttribute('aria-label')||x.title||''));
        /* #550 a21 (his Option B): the strip carries no arrows in the streamlined review - Back and Forward are the bottom toolbar's
           ends, with Key move beside Forward - so 'next' is the toolbar's Next move there, and the strip's elsewhere. */
        const tbar=document.querySelector('[data-ct="rev-toolbar"]');
        const next=(tbar?[...tbar.querySelectorAll('button')]:strip?[...strip.querySelectorAll('button')]:[]).find(x=>x.getAttribute('aria-label')==='Next move')||null;
        const rowEl=tbar||row;
        const ply=(()=>{const t=line&&line.innerText||'';const k=t.match(/(\d+)\/\d+/);return k?+k[1]:null;})();
        return {row:R(rowEl),line:R(line),strip:R(strip),star:R(star),next:R(next),ply,stream:!!tbar};});
      L.say(!!(m.row&&m.line&&m.strip&&m.star&&m.next),geo+': TC-R176a the four things this case reads are on screen: the button row, the move line, the strip, the star and the strip\'s next arrow',{row:!!m.row,line:!!m.line,strip:!!m.strip,star:!!m.star,next:!!m.next});
      if(m.row&&m.line&&m.strip&&m.star&&m.next){
        const between=m.stream?(m.strip.bottom<=m.line.top+0.5&&m.line.bottom<=m.row.top+0.5):(m.row.bottom<=m.line.top+0.5&&m.line.bottom<=m.strip.top+0.5);
        L.say(between,geo+': TC-R176a the order is his: the move line (the explanation) sits BETWEEN the button row and the move strip'+(m.stream?' (streamlined: the strip under the board, the toolbar at the foot)':''),{row:m.row,line:m.line,strip:m.strip});
        /* the gap: vertically stacked, at least 40pt (it was 6, AUD-R01); side by side in the streamlined toolbar of his picked mockup
           (Key move beside Forward), they must not touch and each is a full 44pt target, so a thumb on one is never on the other */
        const gap=m.stream?Math.round((m.next.left-(m.star.left+m.star.width))*10)/10:Math.round((m.next.top-m.star.bottom)*10)/10;
        L.say(m.stream?(gap>=5.5&&m.star.height>=43.5&&m.next.height>=43.5&&m.next.width>=44&&m.star.width>=44):gap>=40,geo+': TC-R176b the star and the next control are apart - '+(m.stream?'side by side in the toolbar, '+gap+'pt between, each a 44pt target':'stacked, '+gap+'pt apart (they were 6pt, AUD-R01)'),{gap,star:m.star,next:m.next});
        const before=m.ply;
        const hit=await b.page.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);const btn=e&&e.closest('button');return btn?(btn.getAttribute('aria-label')||btn.title||btn.innerText):null;},[m.next.cx,m.next.cy]);
        await b.page.mouse.click(m.next.cx,m.next.cy);await b.settle(700);
        const after=await b.page.evaluate(()=>{const line=[...document.querySelectorAll('[data-ct="rev-move-line"]')].pop();const t=line&&line.innerText||'';const k=t.match(/(\d+)\/\d+/);return k?+k[1]:null;});
        L.say(hit==='Next move',geo+': TC-R176c the point at the centre of the next arrow belongs to the next arrow',{hit});
        L.say(before!=null&&after===before+1,geo+': TC-R176c a tap there moves the board exactly one move (ply '+before+' to '+after+'), not to the next key moment',{before,after});
      }
    }
    await b.browser.close();
  }
  L.done('91-review-next-not-star');
})().catch(e=>{L.say(false,'harness threw: '+((e&&e.stack)||e).toString().split('\n').slice(0,3).join(' | '));L.done('91-review-next-not-star');});
