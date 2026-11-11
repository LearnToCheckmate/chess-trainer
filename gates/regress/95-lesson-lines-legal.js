'use strict';
// gates/regress/95-lesson-lines-legal.js - EVERY MOVE IN EVERY LESSON LINE IS LEGAL IN ITS OWN POSITION. TC-LS-059, US-LS-13.
//
// WHY [#550, item (85) of directOpening_2026_11_11_batch10; jobs/lessons-teach-the-finish-not-the-method-2026-09-24, work item 4's second
// half, and the job's aContentRuleThisProjectHasEarned: "Every chess line written into a lesson ... must be verified legal in the position
// it describes before it ships. The orchestrator fabricated a refutation line in this project on 2026-09-23 and Kunal caught it."]. No gate
// replayed the library: gates 11, 48 and 84 open lessons in a browser and walk ONE line each, so a typo in any of the other 217 lines - a
// move that does not exist in its position - ships, and the lesson stops at that ply on his phone.
//
// WHAT IT ASSERTS, node only (no browser): lessons.js's window.CTLESSONS (CT_LESSONS names another copy, for a control) is loaded, and every
// lesson's `line` and every `vars[].line` is replayed from its own start (the lesson's or variation's `fen`, else the initial position) with
// the app's OWN move code - findMoveBySAN and makeMove read out of chess.jsx by gates/engine-extract.js, never a second chess library, so
// "legal" means legal to the app that will play it. A SAN that matches no legal move is a red naming the lesson, the ply and the move.
// DENOMINATORS, each its own line: at least 150 lessons and 200 lines were replayed, and at least 2000 plies were played.
//
// WHAT IT DOES NOT ASSERT, named: moves written inside free text (notes, plans, idea, a hint's words) are not parsed; arrows are not checked;
// and work item 4's first half - every technique lesson carries a method field - has no field to test, because the schema has none.
const L=require('../lib');const E=require('../engine-extract');
const path=require('path');
const SRC=process.env.CT_LESSONS||path.join(__dirname,'..','..','lessons.js');

L.run(async()=>{
  L.note('engine-extract chess.jsx md5 '+E.SOURCE_MD5+'; lessons from '+path.relative(process.cwd(),SRC));
  global.window=global.window||{};delete global.window.CTLESSONS;delete require.cache[require.resolve(SRC)];require(SRC);
  const C=global.window.CTLESSONS||{};
  let lessons=0,lines=0,plies=0;const bad=[];
  const run=(name,fen,line)=>{lines++;let g;try{g=fen?E.fromFEN(fen):E.initGame();}catch(e){bad.push(name+': start FEN unreadable');return;}
    for(let i=0;i<(line||[]).length;i++){let m=null;try{m=E.findMoveBySAN(g,line[i]);}catch(e){m=null;}
      if(!m){bad.push(name+' ply '+(i+1)+' '+line[i]);return;}g=E.makeMove(g,m);plies++;}};
  for(const k of Object.keys(C))for(const o of (C[k]||[])){lessons++;run(o.name,o.fen,o.line);for(const v of (o.vars||[]))run(o.name+' / '+v.name,v.fen||o.fen,v.line);}
  L.say(lessons>=150&&lines>=200,'TC-LS-059 DENOMINATOR the library was read: '+lessons+' lessons, '+lines+' lines (each lesson\'s line and every variation)',{lessons,lines});
  L.say(plies>=2000,'TC-LS-059 DENOMINATOR '+plies+' plies were played through the app\'s own findMoveBySAN/makeMove',{plies});
  L.say(bad.length===0,'TC-LS-059 every move of every lesson line is legal in its own position ('+(bad.length?bad.length+' not: '+bad.slice(0,5).join('; '):'all '+lines+' lines')+')',bad.slice(0,20));
},'95-lesson-lines-legal');
