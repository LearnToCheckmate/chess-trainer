'use strict';
// gates/regress/207-board-letters-keep-their-contrast.js - NO HIGHLIGHT TAKES A BOARD LETTER BELOW ITS OWN SQUARE PAIR, ON EITHER SIDE OF THE
// BOARD. US-R217 / TC-R326..327.
//
// WHY [#553 B1, jobs/a-file-label-under-a-highlight-falls-to-1-58-to-1-contrast-2026-10-04]: the 'e' under a puzzle's Show highlight on e1
// read 1.58:1 (#477's auditor); #548 (8c91a6c) gave each coordinate letter an opaque chip of its own square's colour so nothing under it can
// change what it is read against. The other half of the title - the pair itself is 3.37:1 on Ocean, under AA - is settled by Kunal's
// "Keep today's letter colours" (questions/B9C-COORD-CONTRAST, 10 Nov 2026; DECISIONS-LOG.md, recorded #553), so this gate does NOT ask
// for 4.5:1: it asks that every letter reads exactly its theme's pair, highlighted or not, and is painted above any highlight. The 15 Nov
// checker held gate 39's TC-PZ-LBL short of that (kunal730 and 320x568 only, no flipped board, a floor of 3.0 read off the brightest pixel
// rather than the label's ink); this gate reads each label's own ink and chip.
// WHAT IT READS: the bundle under test (CT_APP), default theme, at 375x761 with his insets (kunal761) and 320x568 (se), in two states:
//  (A) Puzzles > Start training > Show (drive/puzzles 'train-show'): the solution squares highlighted, among them e1, a square with a letter;
//  (B) Play vs Pip as Black (drive/play 'cpu-black'), the board FLIPPED, then the knight on g8 - a bottom-row square with a letter there -
//      tapped, so the selection highlight lies under the 'g'.
// Each label is a [data-ct="sq-file-lbl"] or [data-ct="sq-rank-lbl"]; its ink and chip are their computed colours; a label is HIGHLIGHTED
// when its square holds another painted layer, not a piece and not a label, that lies under the letter's centre (a highlight; a move dot in
// the middle of the square does not count). The ratio is WCAG's.
//  TC-R326 DENOMINATOR 16 letters read, at least one of them on a highlighted square (the Show square / the selected g8).
//  TC-R326 every letter's chip is opaque and the letter reads its theme's light/dark pair (the same ratio on every letter, to 0.02), so the
//          highlighted ones read exactly what the others do - no drop (it was 1.58 against 3.37). The ratio, ink and chip are printed.
//  TC-R327 on each highlighted square the letter is painted ABOVE the highlight: at the letter's centre, elementsFromPoint lists the label
//          before the overlay.
//  TC-R326 zero app errors.
// CONTROL-RECORD: 4f2b8dd2 2026-11-24 total=16 red=4 scope=trial:2f3c02f0b110 how=#553 B1, THE SUBJECT REMOVED: pairs break the-letters-lose-their-chip (#548's chip stripped) - TC-R326 (opaque chip, the pair on every letter) red in both states at kunal761 and 320x568
// CONTROL-RECORD: 4f2b8dd2 2026-11-24 total=16 red=4 scope=trial:7d83cbbc2865 how=#553 pairs break the-letters-sit-under-the-highlight (zIndex 0) - TC-R327 red in both states at both sizes
// CONTROL-RECORD: 4f2b8dd2 2026-11-24 total=16 red=4 scope=trial:d871363f3302 how=#553 pairs break the-file-letters-take-a-faint-ink - TC-R326 red in both states at both sizes
// The grading machine on 4f2b8dd2: CHECKED, real 8/8 at kunal761 and 8/8 at 320x568 (bundle 3869ce1fdcec), the three breaks CAUGHT.
const L=require('../lib');const Z=require('../drive/puzzles');const P=require('../drive/play');
const read=(b)=>b.page.evaluate(()=>{
  const rgb=(s)=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
  const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const ratio=(a,c)=>{const x=lum(a),y=lum(c);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const out=[];
  for(const e of document.querySelectorAll('[data-ct="sq-file-lbl"],[data-ct="sq-rank-lbl"]')){const q=e.getBoundingClientRect();if(q.width<1||q.height<1)continue;
    const cs=getComputedStyle(e);const ink=rgb(cs.color),chip=rgb(cs.backgroundColor);const cell=e.parentElement;
    // a highlight: a painted child of the square that is neither a label nor holds a piece image
    const ov=[...cell.children].find(c=>c!==e&&!/sq-(file|rank)-lbl/.test(c.getAttribute('data-ct')||'')&&!c.querySelector('img')&&c.tagName!=='IMG'&&(()=>{const bg=rgb(getComputedStyle(c).backgroundColor);return bg&&bg.a>0.05;})()&&(()=>{const r=c.getBoundingClientRect(),x=q.left+q.width/2,y=q.top+q.height/2;return r.width>4&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})());   /* only a layer that lies UNDER the letter (a move dot in the square's middle does not) */
    let above=null;if(ov){/* the label is pointer-events:none (a tap goes to the square), which hit-testing skips; turned on for this one reading only, so the paint order is what is read */const pe=e.style.pointerEvents,po=ov.style.pointerEvents;e.style.pointerEvents='auto';ov.style.pointerEvents='auto';const st=document.elementsFromPoint(q.left+q.width/2,q.top+q.height/2);e.style.pointerEvents=pe;ov.style.pointerEvents=po;const iL=st.findIndex(x=>x===e||e.contains(x)),iO=st.indexOf(ov);above=iL>=0&&iO>=0&&iL<iO;}
    out.push({t:(e.textContent||'').trim(),kind:e.getAttribute('data-ct')==='sq-file-lbl'?'file':'rank',ink:cs.color,chip:cs.backgroundColor,chipA:chip?chip.a:0,
      ratio:ink&&chip?+ratio(ink,chip).toFixed(2):null,hl:!!ov,hlBg:ov?getComputedStyle(ov).backgroundColor:null,above,y:+q.top.toFixed(1)});}
  const tops=out.filter(o=>o.kind==='file').map(o=>o.t);
  return {labels:out,fileOrder:tops.join('')};});
const STATES=[
  ['A Show',async(b)=>{await Z.states['train-show'](b);await b.settle(900);}],
  ['B flipped',async(b)=>{await P.states['cpu-black'](b);await b.settle(1200);
    // tap the g8 knight's square: the cell holding the 'g' file letter on the (flipped) bottom row
    const c=await b.page.evaluate(()=>{const l=[...document.querySelectorAll('[data-ct="sq-file-lbl"]')].find(e=>(e.textContent||'').trim()==='g');if(!l)return null;const q=l.parentElement.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};});
    if(c){await b.page.mouse.click(c.x,c.y);await b.settle(700);}}],
];
L.run(async()=>{
  for(const [gn,geo] of [['375x761','kunal761'],['320x568','se']])for(const [sn,go] of STATES){const tag=gn+' '+sn;
    const b=await L.launch({geo,name:'g207-'+geo+'-'+sn.split(' ')[0],store:{ct_pool:'3'}});await b.open();let ok=true;
    try{await go(b);}catch(e){ok=false;L.note(tag+': '+String(e).slice(0,140));}
    const r=await b.page.evaluate(()=>1).then(()=>read(b));const ls=r.labels,hl=ls.filter(o=>o.hl);
    const flippedOK=sn[0]!=='B'||/^h?gfedcba|hgfedcba/.test(r.fileOrder);
    L.say(ok&&ls.length===16&&hl.length>=1&&flippedOK,tag+': TC-R326 DENOMINATOR '+ls.length+' board letters read, '+hl.length+' on a highlighted square ('+hl.map(o=>o.t).join(',')+')'+(sn[0]==='B'?', the board flipped (files '+r.fileOrder+')':''),{n:ls.length,hl:hl.map(o=>({t:o.t,hlBg:o.hlBg})),files:r.fileOrder});
    const rs=ls.map(o=>o.ratio).filter(x=>x!=null);const lo=rs.length?Math.min(...rs):null,hi=rs.length?Math.max(...rs):null;
    const opaque=ls.every(o=>o.chipA>=0.999);
    L.say(ls.length===16&&opaque&&lo!=null&&hi-lo<=0.02&&hl.every(o=>Math.abs(o.ratio-lo)<=0.02),tag+': TC-R326 every letter reads its square pair on an opaque chip, highlighted or not - '+lo+' to '+hi+':1 (highlighted: '+hl.map(o=>o.t+' '+o.ratio).join(', ')+'; ink '+(ls[0]&&ls[0].ink)+' / chip '+(ls[0]&&ls[0].chip)+')',{lo,hi,opaque,hl:hl.map(o=>({t:o.t,ratio:o.ratio,ink:o.ink,chip:o.chip,chipA:o.chipA}))});
    L.say(hl.length>=1&&hl.every(o=>o.above===true),tag+': TC-R327 on each highlighted square the letter is painted above the highlight ('+hl.map(o=>o.t+' '+o.above).join(', ')+')',hl.map(o=>({t:o.t,above:o.above,hlBg:o.hlBg})));
    L.say(b.errs.length===0,tag+': TC-R326 zero app errors',b.errs.slice(0,3));
    await b.close();}
},'207-board-letters-keep-their-contrast');
