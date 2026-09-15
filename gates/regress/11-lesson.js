// regress/11-lesson.js  (port of lesson371.js)  k11 / A-01 / Y-01 / Y-02: the lesson board is edge to edge at
// the same top in every phase. Card 3 = the King's Gambit demo at its END, card 4 = practice before the first
// move; then one correct practice move (1.e4) and the board must not change size or move.
'use strict';
const L=require('../lib');
const D=require('../drive/lesson');
L.run(async()=>{
  for(const geo of ['kunal','390']){
    const b=await L.launch({geo,name:'lesson-'+geo});await b.open();
    await b.card(3,2500);const demoEnd=await b.metrics();await b.shot('lesson-'+geo+'-demo-end');
    const note=await b.rect('[data-ct="lesson-note"]');
    L.say(!!demoEnd.board,geo+': demo end shows a board',demoEnd.board);
    if(geo==='kunal'&&demoEnd.board){L.say(Math.abs(demoEnd.board.w-375)<0.6,'kunal: demo end board is 375 wide ('+demoEnd.board.w+')');L.say(Math.abs(demoEnd.board.top-92)<1,'kunal: demo end board top is 92 ('+demoEnd.board.top+')');}
    L.say(!!note&&Math.abs(note.h-75)<1,geo+': note box is 75px',note&&note.h);
    L.say(demoEnd.over.over<=0&&demoEnd.over.docScroll===0,geo+': no scroll at the demo end',demoEnd.over);
    await b.card(4,2500);const prac=await b.metrics();await b.shot('lesson-'+geo+'-practice');
    L.say(!!prac.board&&!!demoEnd.board&&Math.abs(prac.board.w-demoEnd.board.w)<0.6&&Math.abs(prac.board.top-demoEnd.board.top)<0.6,geo+': practice board = demo board (w '+(prac.board&&prac.board.w)+' top '+(prac.board&&prac.board.top)+')');
    await b.move('e2','e4',1800);const after=await b.metrics();await b.shot('lesson-'+geo+'-practice-e4');
    L.say(!!after.board&&Math.abs(after.board.w-prac.board.w)<0.6&&Math.abs(after.board.top-prac.board.top)<0.6,geo+': board unchanged after one practice move (w '+(after.board&&after.board.w)+' top '+(after.board&&after.board.top)+')');
    L.say(after.over.over<=0&&after.over.docScroll===0,geo+': no scroll after the move',after.over);
    L.say(b.errs.length===0,geo+': zero app errors',b.errs.slice(0,3));
    await b.close();
  }

  // ---- SHORT AND NARROW PHONES, which this gate did not run until #383 and which is why it encoded an
  // assumption that is false there. uat378-lesson-board-not-edge-to-edge reported the lesson board failing to
  // reach the screen edges at 320x568, 360x640 and 375x667 while passing at 375x679 and above, and gallery
  // cards 3/8 and 4/8 assert "board edge to edge" throughout.
  //
  // MEASURED ON #382, and it is NOT a defect in the app: at every one of those geometries the column fills the
  // viewport EXACTLY - bottom equals innerHeight, zero slack - so the board is already as large as the height
  // allows. A square board cannot be as wide as the screen when the screen is shorter than it is wide plus the
  // chrome. At 320x568 the demo board is 270.9 and practice 230.9, and the 40px difference is exactly the extra
  // chrome practice carries: a 56px control row against demo's 44 (+12) and a 98.1px MOVES panel against demo's
  // 70.1 (+28). 12 + 28 = 40. Nothing is stealing width; there is no width to steal.
  //
  // So "edge to edge" is an unachievable absolute at those sizes, and asserting it would be asserting geometry
  // away. What IS testable, and is the real invariant, is that the board is GIVEN EVERYTHING AVAILABLE: no slack
  // below the column, and the leftover width shared evenly so the board stays centred. That is asserted here.
  //
  // NOTE WHAT THIS ALSO EXPOSES about the assertion above: "practice board = demo board" holds only where BOTH
  // are width-bound. It is true at 375x679 and 390x844 and false at 320x568 and 375x667, and it passed for
  // months because this gate ran only the two geometries where it happens to hold.
  for(const [name,g] of [['320x568',{w:320,h:568,safe:''}],['360x640',{w:360,h:640,safe:''}],['375x667',{w:375,h:667,safe:''}]]){
    for(const st of ['demo-end','practice-m0']){
      const b=await L.launch({geo:g,name:'lesson-'+name+'-'+st,store:{}});await b.open();
      await D.states[st](b);await b.settle(600);
      const m=await b.page.evaluate(()=>{
        const root=document.getElementById('root');let bottom=0;
        const walk=(el,d)=>{for(const c of el.children){const s=getComputedStyle(c);
          if(s.position==='fixed'||s.position==='absolute')continue;const r=c.getBoundingClientRect();
          if(r.height>0)bottom=Math.max(bottom,r.bottom);if(d<4)walk(c,d+1);}};
        walk(root,0);
        const gr=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''))
          .map(e=>e.getBoundingClientRect()).sort((a,b)=>b.width-a.width)[0];
        return {vw:innerWidth,vh:innerHeight,bottom:Math.round(bottom*10)/10,
                board:gr?{w:Math.round(gr.width*10)/10,x:Math.round(gr.left*10)/10}:null};
      });
      const tag=name+' '+st;
      L.say(!!m.board,tag+': the lesson board is on screen',m.board);
      // THIS ONE DOES NOT DISCRIMINATE, and it is kept only because it is true and explains the shape.
      // Proved: against a bundle with the board shrunk to 90% it still passes, because the MOVES panel carries
      // flex:'1 1 auto' and stretches to absorb whatever the board gives up, so the column fills the viewport
      // either way. Recorded rather than quietly relied on - it looks like the assertion that matters and is not.
      L.say(Math.abs(m.bottom-m.vh)<2,tag+': the column fills the viewport (bottom '+m.bottom+' of '+m.vh+'). NOTE: this cannot fail while the MOVES panel flexes, so it explains the shape rather than guarding it.',{bottom:m.bottom,vh:m.vh});
      // THIS is the assertion that guards the board. Same fix 10-gameover and A-12 needed: a size compared only
      // to itself, or to an invariant that always holds, cannot see the board get smaller. Measured on #382.
      const WANT={'320x568 demo-end':270.9,'320x568 practice-m0':230.9,'360x640 demo-end':342.4,'360x640 practice-m0':326.4,'375x667 demo-end':375,'375x667 practice-m0':352.2};
      if(WANT[tag]!=null)L.say(!!m.board&&Math.abs(m.board.w-WANT[tag])<1.5,tag+': the board is '+WANT[tag]+' wide - the largest square this height allows once the chrome above and below it is laid out. If a change makes it smaller the board lost space; if larger, the chrome did.',{measured:m.board&&m.board.w,want:WANT[tag]});
      L.say(!!m.board&&m.board.w<=m.vw+0.6,tag+': the board never exceeds the viewport width',m.board);
      L.say(!!m.board&&Math.abs(m.board.x-(m.vw-m.board.w)/2)<1.5,tag+': the width the board cannot use is shared evenly - it stays centred rather than pinned to one side (x '+(m.board&&m.board.x)+', expected '+(m.board?Math.round((m.vw-m.board.w)/2*10)/10:'-')+')',m.board);

      /* #394 (kunal-lesson-footer-icons-small): THE GLYPHS IN THE LESSON FOOTER, NOT THE BOXES.
         He reported the footer icons as too small. The CONTAINERS were never the problem - measured 50.5pt
         square on his phone, above the 44pt minimum - so a container check would have gone green while the
         complaint stood. What is small is the INK: a 9.2pt close x, 13.8 x 18.3 chevrons, 17.2 x 3.1 dots.
         So this asserts the GLYPH, by measuring the text node's own box rather than the button's, and it
         asserts all five agree - "consistent" is what he actually asked for, and one shared size is the only
         way that is a fact rather than a judgement.
         AND IT ASSERTS THE BOXES DID NOT GROW, because the fix had to cost no layout: this row is
         position:fixed with minHeight 44, so the board must be untouched. A version of this fix that bumped
         the container would satisfy "bigger" and break the rule that matters more. */
      const foot=await b.page.evaluate(()=>{
        const vh=innerHeight;
        return [...document.querySelectorAll('button[aria-label]')].map(e=>{
          const r=e.getBoundingClientRect();
          if(r.width<1||r.bottom<vh-140||r.top>vh)return null;
          if(!/Back a move|Forward a move|Play or pause|Close lesson|More for this lesson/.test(e.getAttribute('aria-label')||''))return null;
          let gw=0,gh=0;
          const svg=e.querySelector('svg');
          if(svg){const g=svg.getBoundingClientRect();gw=+g.width.toFixed(1);gh=+g.height.toFixed(1);}
          else{const rg=document.createRange();rg.selectNodeContents(e);const g=rg.getBoundingClientRect();gw=+g.width.toFixed(1);gh=+g.height.toFixed(1);}
          return {aria:e.getAttribute('aria-label'),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
                  fs:parseFloat(getComputedStyle(e).fontSize),gw,gh};
        }).filter(Boolean);
      });
      if(st==='demo-end'){
        L.say(foot.length===5,name+': the lesson footer shows its five buttons (precondition - without this the size checks below pass by measuring nothing)',foot.map(f=>f.aria));
        L.say(foot.every(f=>f.h>=44&&f.h<=46),name+': every footer button is still 44 to 46 tall - the fix had to go INSIDE the box, because this row is fixed and any growth here is board height spent',foot.map(f=>f.h));
        L.say(foot.every(f=>f.gh>=20),name+': every footer GLYPH is at least 20px tall. The boxes were always big enough; the ink was not, and that is what he reported',foot.map(f=>({a:f.aria,gh:f.gh})));
        L.say(foot.every(f=>f.gw>=16),name+': and at least 16px wide',foot.map(f=>({a:f.aria,gw:f.gw})));
        const sizes=[...new Set(foot.map(f=>f.fs))];
        L.say(sizes.length===1,name+': all five carry ONE font size, so "consistent" is a fact rather than a judgement. The play button shipped at 13px because it used to carry the word "Pause" - #347, icons still sized for the labels they stopped carrying',sizes);
        L.say(foot.every(f=>f.gw<=f.w-6&&f.gh<=f.h-6),name+': and no glyph fills its box edge to edge - raising the ink must not make the button look like a solid block',foot.map(f=>({a:f.aria,gw:f.gw,w:f.w})));
      }
      await b.shot('lesson-'+name+'-'+st);
      await b.close();
    }
  }
},'LESSON');
