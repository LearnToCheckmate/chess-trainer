'use strict';
// gates/regress/211-pz-wrong-line-shows-whole.js - A PUZZLE'S WRONG-MOVE LINE SHOWS WHOLE ON HIS PHONE AND THE SMALL ONE, AND THE BOARD STAYS PUT.
// TC-R342..TC-R344 (US-R221). #553 B3, jobs/puzzles-the-second-wrong-move-line-is-cut-on-his-phone-hiding-tap-the-eye-to-see-the-move-2026-11-18,
// Amber: flags/amber-553-pz-long-wrong-line-overlay.
//
// WHY: under 820 tall the Puzzles verdict row is one line (30px, #364). At 375x761 a wrong-move line longer than that row was cut with an
// ellipsis - the second wrong move on the first training puzzle read 'Kf1 is not a check, and the mate needs...' and lost 'Tap 👁 to see the
// move.' (scrollWidth 609 against 362). Gate 39's TC-R86c reads the line's TEXT, so it stayed green. This gate reads what SHOWS.
// WHAT IT READS: the bundle under test (CT_APP). Home -> Puzzles -> Start training (the first puzzle, a back-rank mate in 2), then Kf1 twice
// (two wrong moves). At 375x761 (kunal761, his insets) and 320x568, classic and medieval skins. The wrong-move line is found by its WORDS: every
// painted leaf whose text starts with the cross, wherever it is (the row, the a42 overlay at 320x568, or the #553 overlay over the row at 761).
// Read ~0.9 s after the move, inside the overlay's 2.2 s before it starts to fade.
// TC-R342 each wrong-move line is ONE painted element and shows whole: its scrollWidth is not over its clientWidth, its scrollHeight not over
//         its clientHeight, so no ellipsis and no clipped line, and its box is inside the screen.
// TC-R343 the second wrong move reads 'Kf1 is not a check, and the mate needs one now. Tap 👁 to see the move.' in full - the instruction is there.
// TC-R344 the board has the rect it had before any wrong move (top, left, width), and that rect is the measured one: top 173, width 375 at
//         375x761; top 104, width 320 at 320x568 (measured on the head bundle 1b7693770035 before the fix and on the fix), so a fix that made
//         room by moving or shrinking the board is red even though the board does not move BETWEEN the two readings.
// CT_G211_GEOS=kunal761,se  CT_G211_SKINS=classic,medieval narrow a run (a subset is never the whole gate).
const L=require('../lib');
const Z=require('../drive/puzzles');
const GEOS=(process.env.CT_G211_GEOS||'kunal761,se').split(',');
const SKINS=(process.env.CT_G211_SKINS||'classic,medieval').split(',');
const PIN={'375x761':{top:173,w:375},'320x568':{top:104,w:320}};
const SECOND=/^✗ Kf1 is not a check, and the mate needs one now\. Tap \u{1F441} to see the move\.$/u;
const lines=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^✗/.test((e.textContent||'').trim())).map(e=>{
  const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(!(r.width>0&&r.height>0)||cs.visibility==='hidden'||cs.display==='none')return null;
  return {t:e.textContent.trim(),sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,ell:cs.textOverflow,ws:cs.whiteSpace,op:+cs.opacity,
    r:[Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)],vw:innerWidth,vh:innerHeight,ct:e.getAttribute('data-ct')||(e.parentElement&&e.parentElement.getAttribute('data-ct'))};}).filter(Boolean));
const whole=(x)=>!!x&&x.sw<=x.cw+1&&x.sh<=x.ch+1&&x.op>0.5&&x.r[0]>=-0.5&&x.r[1]>=-0.5&&x.r[2]<=x.vw+0.5&&x.r[3]<=x.vh+0.5;
L.run(async()=>{
  for(const geo of GEOS)for(const sk of SKINS){
    const gn=L.GEOS[geo].w+'x'+L.GEOS[geo].h,tag=gn+' '+sk,med=sk==='medieval';
    const b=await L.launch({geo,name:'g211-'+geo+'-'+sk,...(med?{pro:true}:{}),store:med?{ct_skin:'2'}:{}});await b.open();
    let ok=true,bd0=null,l1=[],l2=[],bd1=null,bd2=null;
    try{await Z.states['train'](b);await b.settle(800);bd0=await b.board();
      await b.move('g1','f1',0);await b.settle(900);l1=await lines(b);bd1=await b.board();
      await b.move('g1','f1',0);await b.settle(900);l2=await lines(b);bd2=await b.board();}
    catch(e){ok=false;L.note(tag+': drive threw: '+String(e&&e.message||e).slice(0,160));}
    L.say(ok&&!!bd0&&l1.length>=1&&l2.length>=1,tag+': TC-R342 PRECONDITION the first training puzzle took two wrong moves (Kf1, Kf1) and each printed a cross line',{l1:l1.map(x=>x.t),l2:l2.map(x=>x.t)});
    L.say(l1.length===1&&whole(l1[0]),tag+': TC-R342 the first wrong-move line shows whole, one element, nothing cut ('+JSON.stringify(l1[0]||null)+')',l1);
    L.say(l2.length===1&&whole(l2[0]),tag+': TC-R342 the second wrong-move line shows whole, one element, nothing cut ('+JSON.stringify(l2[0]||null)+')',l2);
    L.say(l2.length===1&&SECOND.test(l2[0].t),tag+': TC-R343 the second wrong move says why and points at the eye, in full ("'+(l2[0]&&l2[0].t)+'")',l2[0]&&l2[0].t);
    const same=(a,c)=>!!a&&!!c&&Math.abs(a.y-c.y)<0.6&&Math.abs(a.x-c.x)<0.6&&Math.abs(a.w-c.w)<0.6;
    L.say(same(bd0,bd1)&&same(bd0,bd2),tag+': TC-R344 the board keeps its rect through both wrong moves ('+(bd0&&[bd0.x,bd0.y,bd0.w].join(','))+')',{bd0,bd1,bd2});
    const P=PIN[gn];L.say(!!P&&!!bd0&&Math.abs(bd0.y-P.top)<0.6&&Math.abs(bd0.w-P.w)<0.6,tag+': TC-R344 and it is the measured board: top '+(P&&P.top)+', width '+(P&&P.w)+' ('+(bd0&&bd0.y)+', '+(bd0&&bd0.w)+') - no room was made by moving or shrinking it',bd0);
    L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+': TC-R342 no app errors',b.errs.slice(0,2));
    await b.close();
  }
},'211-pz-wrong-line-shows-whole');
