'use strict';
// gates/regress/214-lesson-hint-words-whole.js - IN LESSON PRACTICE THE HINT WORDS ARE READ WHOLE, WITHOUT A TAP, AFTER EVERY OWN MOVE.
// US-R224 / TC-R346..347.
//
// WHY [#553 B1, jobs/lesson-practice-hint-words-sit-below-the-note-box-edge-2026-11-13, the orchestrator's GAP of 15 Nov 2026]: gate 11's
// TC-LS-061b holds the hint words' line boxes against the note SCROLLER, so a line hidden by the hint span's OWN two-line clamp counted as
// inside, and it walked only move 1, after e4 and after Nf3. The checker found the Italian Game hint after c3 ('Solidly defend e4 (the
// modern, safe way; the old d4 is sharper).') laid out on three lines inside the span's -webkit-line-clamp:2 - the third line not painted,
// the screen reading 'the old d4 is...' and 'more'. This gate reads the SPAN: at move 1 with hints on and after every own move of the line
// (e4, Nf3, Bc4, c3), the hint span is not clamped (scrollHeight <= clientHeight + 1), every line box of its words lies inside the span's
// own painted box AND inside the note's visible box, and the board has not moved.
// WHAT IT READS: the bundle under test (CT_APP), Italian Game practice (drive/lesson practice-m0), Hints tapped on, at kunal761 and se
// (320x568; CT_G214_GEOS overrides, comma list).
//  TC-R346 PRECONDITION each state was reached: the hint words are on screen and are the lesson's note for the NEXT own move.
//  TC-R346 the hint is whole: not clamped, every word line inside the span and the note box as they show. At move 1 only, the hints-on
//          warning keeps its line (painted inside the box) and the hint may instead be clamped at exactly two lines with the more chip up
//          (flags/amber-553-hint-takes-the-third-line).
//  TC-R347 the board's top and width are the same as at move 1 with hints off, in every state; after a move, the confirm line is painted
//          or the more chip is up (the confirm is one tap away).
// CONTROL-RECORD: c96d84c5 2026-11-24 total=43 red=4 scope=trial:3284aff7b649 how=#553 B1, the tree before the fix (hint clamped at two lines) - TC-R346 'the hint is read whole' red at kunal761 after c3 (scrollHeight 57 against 38) and at se after Nf3, Bc4 and c3; on the fix cd23a620459f 43/0
const L=require('../lib');const D=require('../drive/lesson');
const GEOS=(process.env.CT_G214_GEOS||'kunal761,se').split(',').filter(Boolean);
const OWN=[['e2','e4'],['g1','f3'],['f1','c4'],['c2','c3']];
L.run(async()=>{
  for(const geo of GEOS){
    const b=await L.launch({geo,name:'g214-'+geo,store:{}});await b.open();let ok=true;
    try{await D.states['practice-m0'](b);await b.settle(600);}catch(e){ok=false;L.say(false,geo+': TC-R346 practice-m0 was reached',String(e).slice(0,160));}
    if(ok){
      const bd0=await b.board();
      const read=()=>b.page.evaluate(()=>{const n=document.querySelector('[data-ct="lesson-note"]');const sc=n&&n.querySelector('.scroll');const hw=n&&n.querySelector('[data-ct="lesson-hint-words"]');
        const C=window.CTLESSONS||{};let op=null;for(const k of Object.keys(C))for(const o of (C[k]||[]))if(!op&&o.name==='Italian Game')op=o;
        if(!sc)return {notes:op?op.notes:null};const q=sc.getBoundingClientRect();
        if(!hw)return {notes:op?op.notes:null,words:null};
        const hr=hw.getBoundingClientRect();const g=document.createRange();g.selectNodeContents(hw);const rs=[...g.getClientRects()].filter(r=>r.width>0.5&&r.height>2);
        const lh=parseFloat(getComputedStyle(hw).lineHeight)||19;const pr=n.querySelector('[data-ct="lesson-prompt"]');
        return {notes:op?op.notes:null,words:(hw.textContent||'').trim(),clampCss:getComputedStyle(hw).webkitLineClamp,sh:hw.scrollHeight,ch:hw.clientHeight,needLines:Math.round(hw.scrollHeight/lh),
          span:[+hr.top.toFixed(1),+hr.bottom.toFixed(1)],box:[+q.top.toFixed(1),+q.bottom.toFixed(1)],lines:rs.map(r=>Math.round(r.top)+'-'+Math.round(r.bottom)).join(','),
          inSpan:rs.length>0&&rs.every(r=>r.top>=hr.top-0.5&&r.bottom<=hr.bottom+0.5),inBox:rs.length>0&&rs.every(r=>r.top>=q.top-0.5&&r.bottom<=q.bottom+0.5),
          prompt:pr?{text:(pr.textContent||'').trim().slice(0,70),shown:pr.getBoundingClientRect().height>0,clamp:pr.getAttribute('data-clamp')}:null,
          more:!!n.querySelector('[data-ct="lesson-note-more"]'),lh,warn:(()=>{const w=n.querySelector('[data-ct="lesson-hint-warn"]');if(!w)return null;const g2=document.createRange();g2.selectNodeContents(w);const r2=[...g2.getClientRects()].filter(r=>r.width>0.5);return {text:(w.textContent||'').trim(),painted:r2.length>0&&r2[0].top>=q.top-0.5&&r2[0].bottom<=q.bottom+0.5};})()};});
      await D.tapBtn(b,/^Hints$/,400);await b.settle(500);
      for(let i=0;i<=OWN.length;i++){
        const tag=i===0?'move 1':('after '+['e4','Nf3','Bc4','c3'][i-1]);
        if(i>0){try{await b.move(OWN[i-1][0],OWN[i-1][1],1400);await b.settle(600);}catch(e){L.say(false,geo+' '+tag+': TC-R346 the move was played',String(e).slice(0,160));break;}}
        const s=await read();const bd=await b.board();
        const want=s.notes?String(s.notes[2*i]).trim().replace(/\.?$/,''):null;
        L.say(!!s.words&&!!want&&s.words.indexOf(want)>=0,geo+' '+tag+': TC-R346 PRECONDITION the hint words are up and are the note of own move '+(i+1)+' ("'+(s.words||'').slice(0,80)+'")',{want});
        if(i===0){
          // move 1 [amber-553-hint-takes-the-third-line]: the line under the hint carries the hints-on warning the player just triggered, so it
          // keeps its line; the hint is whole, or (only where it needs a third line) clamped at exactly two lines with the 'more' chip up
          L.say(!!s.warn&&/Hints are on/.test(s.warn.text)&&s.warn.painted&&!!s.prompt&&s.prompt.shown,geo+' move 1: TC-R346 the hints-on warning keeps its line and is painted inside the box',{warn:s.warn,prompt:s.prompt});
          L.say(!!s.words&&s.inBox&&(s.sh<=s.ch+1||(Math.abs(s.ch-2*s.lh)<=1&&s.more)),geo+' move 1: TC-R346 the hint is whole, or clamped at exactly two lines with the more chip (scrollHeight '+s.sh+', shows '+s.ch+' at line '+s.lh+', more '+s.more+')',{lines:s.lines});
        }else
        L.say(!!s.words&&s.sh<=s.ch+1&&s.inSpan&&s.inBox,geo+' '+tag+': TC-R346 the hint is read whole without a tap - not clamped (scrollHeight '+s.sh+' against '+s.ch+', '+s.needLines+' line(s), clamp '+s.clampCss+'), its lines '+s.lines+' inside the span '+JSON.stringify(s.span)+' and the note box '+JSON.stringify(s.box),{prompt:s.prompt,more:s.more});
        if(i>0)L.say(!!s.prompt&&(s.prompt.shown||s.more),geo+' '+tag+': TC-R347 the confirm of the move just made is on screen or one tap away behind the more chip (shown '+(s.prompt&&s.prompt.shown)+', more '+s.more+')',s.prompt);
        L.say(!!bd0&&!!bd&&Math.abs(bd0.y-bd.y)<0.5&&Math.abs(bd0.w-bd.w)<0.5,geo+' '+tag+': TC-R347 the board has not moved (top '+(bd&&bd.y)+', width '+(bd&&bd.w)+')',{bd0,bd});
      }
    }
    L.say(b.errs.length===0,geo+': TC-R346 zero app errors',b.errs.slice(0,3));
    await b.close();
  }
});
