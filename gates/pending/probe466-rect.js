// #466: the one measurement antagonist B asked for and could not take. The new amber note is a LONGER string in
// the TOP slot of a sheet whose own source comment records that "at 375x679 the Pass & Play variant overran the
// screen by 32px", which is why its gap collapses on short screens. Gate 55 asserts the note's TEXT and the
// button's disabled state and NOTHING about either rect, so a clipped or off-screen note would pass all of it.
// This is "measure, do not read", and the point is whether the refusal is READABLE and the exit REACHABLE.
'use strict';
const L=require('../lib'), R=require('../drive/review');
const MATE='[Event "T"]\n[Site "Chess.com"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1';
L.run(async()=>{
  for(const geo of ['kunal730','se','kunal']){   // 375x730 = his phone, 320x568 = narrowest, 375x679 = the one the comment names
    const b=await L.launch({geo,store:{ct_pool:'3'},name:'rect466-'+geo});
    await b.open(); L.note('=== '+geo+' '+b.geo.w+'x'+b.geo.h+'  bundle '+(await b.stamp()));
    try{
      await R.importPgn(b,MATE,180000); await R.startReview(b); await R.goPly(b,999);
      await b.tapCt('rev-more',500); await b.tapText(/^Play from here$/,{wait:900});
      const m=await b.page.evaluate(()=>{
        const g=(s)=>{const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect();
          return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),
                  bottom:+r.bottom.toFixed(2),right:+r.right.toFixed(2),
                  sh:e.scrollHeight,ch:e.clientHeight,sw:e.scrollWidth,cw:e.clientWidth};};
        const sheet=document.querySelector('[data-ct="setup-sheet"]');
        return {note:g('[data-ct="setup-terminal-note"]'),btn:g('[data-ct="setup-start"]'),
                sheet:sheet?{sh:sheet.scrollHeight,ch:sheet.clientHeight,oy:getComputedStyle(sheet).overflowY}:null,
                vw:innerWidth,vh:innerHeight};});
      L.note('note  '+JSON.stringify(m.note));
      L.note('btn   '+JSON.stringify(m.btn));
      L.note('sheet '+JSON.stringify(m.sheet)+'  viewport '+m.vw+'x'+m.vh);
      // THE NOTE: no horizontal spill (the unrecoverable kind), and its own text not clipped by its own box.
      L.say(!!m.note&&m.note.x>=0&&m.note.right<=m.vw+0.5, geo+': the terminal note does not spill the viewport horizontally', m.note&&(m.note.x+'..'+m.note.right+' of '+m.vw));
      L.say(!!m.note&&m.note.sh<=m.note.ch+1, geo+': the terminal note is not CLIPPED by its own box (scrollHeight vs clientHeight)', m.note&&(m.note.sh+' vs '+m.note.ch));
      // THE BUTTON: REACHABILITY, MEASURED BY ACTUALLY SCROLLING, NOT BY ASKING ONE BOX ABOUT ITS overflow.
      // THE FIRST VERSION OF THIS ASSERTION WAS A FALSE RED AT ALL THREE GEOMETRIES and it is the exact trap
      // CLAUDE.md records twice: it read the SHEET's own overflowY ('visible') and concluded the button was
      // unreachable, when `#root` is the app's scroller and index.html says so in terms - "The app scrolls
      // inside here if its content ever overflows - the page never does." Gate 45's TC-PS-006 independently
      // measures this same button as BELOW THE FOLD at five of six geometries AT REST, by design. So below the
      // fold here is the designed state and the only real question is whether a FINGER can bring it on screen.
      // Per gates/regress/40-reachability.js: walk the ancestors for a COMPUTED overflowY of auto|scroll,
      // scroll THAT, and re-read the rect - script can scroll an overflow:hidden box and a finger cannot, so
      // scrollIntoView() would answer yes on a build with the scroller removed.
      const reach=await b.page.evaluate(()=>{
        const e=document.querySelector('[data-ct="setup-start"]'); if(!e)return {ok:false,why:'button absent'};
        const before=e.getBoundingClientRect().bottom;
        if(before<=innerHeight+0.5)return {ok:true,why:'already on screen',before,after:before,scroller:null};
        let n=e.parentElement,sc=null;
        while(n&&n!==document.documentElement){const oy=getComputedStyle(n).overflowY;
          if((oy==='auto'||oy==='scroll')&&n.scrollHeight>n.clientHeight+1){sc=n;break;} n=n.parentElement;}
        if(!sc)return {ok:false,why:'no finger-scrollable ancestor can move it',before,scroller:null};
        const id=sc.id||sc.getAttribute('data-ct')||sc.tagName.toLowerCase();
        sc.scrollTop=sc.scrollHeight;
        const after=e.getBoundingClientRect().bottom;
        return {ok:after<=innerHeight+0.5,why:'scrolled its real ancestor',before:+before.toFixed(2),after:+after.toFixed(2),scroller:id,range:sc.scrollHeight-sc.clientHeight};});
      L.say(reach.ok, geo+': the disabled confirm button is REACHABLE - measured by scrolling the ancestor that can actually move it and re-reading the rect', JSON.stringify(reach));
      L.say(!!m.btn&&m.btn.w>=44&&m.btn.h>=44, geo+': the button still meets the 44pt minimum box', m.btn&&(m.btn.w+'x'+m.btn.h));
    }catch(e){ L.say(false,geo+': harness threw (NOT an app result)',String(e&&e.stack||e).slice(0,160)); }
    L.say(b.errs.length===0,geo+': 0 console errors',b.errs.slice(0,2));
    await b.close();
  }
},'probe466-rect');
