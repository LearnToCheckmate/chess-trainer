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
// CONTROL-RECORD: f83b4e2 2026-11-11 total=3 red=1 scope=env:CT_LESSONS=c85-lessons.js how=#550 item (85): lessons.js with one SAN of Italian Game / Giuoco Pianissimo (quiet) changed from d6 to Qxh7 - the legality line red at ply 12; both DENOMINATORS green (2281 plies)
// CONTROL-RECORD: f8fb292 2026-11-13 total=5 red=1 scope=env:CT_LESSONS=tip-lessons.js how=#550 HEX-T-14: the branch tip's lessons.js (git show HEAD:lessons.js, before the fill) - TC-LS-062's no-empty-note line red at 20 (the four Rousseau Gambit variations, plies 1 to 5); both denominators and TC-LS-059 green
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
  /* #550 HEX-T-14 (docs/hint-audit-2026-11-12; jobs/lessons-practice-hints-and-wrong-move-reasons-2026-11-12): every move of every line has a
     note - the demo's text under the board, and since HEX-T-13 the practice hint's words. The audit found 20 empty (the four Rousseau Gambit
     variations, moves 1 to 5, which play the main line's own five moves); they now carry the main line's notes. TC-LS-062. */
  let noted=0;const empty=[];
  const notesOf=(name,line,notes)=>{for(let i=0;i<(line||[]).length;i++){const t=String((notes||[])[i]==null?'':(notes||[])[i]).trim();if(t)noted++;else empty.push(name+' ply '+(i+1)+' '+line[i]);}};
  for(const k of Object.keys(C))for(const o of (C[k]||[])){lessons++;run(o.name,o.fen,o.line);notesOf(o.name,o.line,o.notes);for(const v of (o.vars||[])){run(o.name+' / '+v.name,v.fen||o.fen,v.line);notesOf(o.name+' / '+v.name,v.line,v.notes);}}
  L.say(lessons>=150&&lines>=200,'TC-LS-059 DENOMINATOR the library was read: '+lessons+' lessons, '+lines+' lines (each lesson\'s line and every variation)',{lessons,lines});
  L.say(plies>=2000,'TC-LS-059 DENOMINATOR '+plies+' plies were played through the app\'s own findMoveBySAN/makeMove',{plies});
  L.say(bad.length===0,'TC-LS-059 every move of every lesson line is legal in its own position ('+(bad.length?bad.length+' not: '+bad.slice(0,5).join('; '):'all '+lines+' lines')+')',bad.slice(0,20));
  L.say(noted>=2000,'TC-LS-062 DENOMINATOR '+noted+' moves carry a note',{noted});
  L.say(empty.length===0,'TC-LS-062 every move of every lesson line has a note, none empty or missing ('+(empty.length?empty.length+' not: '+empty.slice(0,5).join('; '):'all of them')+') [HEX-T-14]',empty.slice(0,24));
},'95-lesson-lines-legal');
