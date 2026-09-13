// regress/11-lesson.js  (port of lesson371.js)  k11 / A-01 / Y-01 / Y-02: the lesson board is edge to edge at
// the same top in every phase. Card 3 = the King's Gambit demo at its END, card 4 = practice before the first
// move; then one correct practice move (1.e4) and the board must not change size or move.
'use strict';
const L=require('../lib');
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
},'LESSON');
