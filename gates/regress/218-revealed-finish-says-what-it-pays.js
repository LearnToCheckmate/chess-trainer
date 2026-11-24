'use strict';
// gates/regress/218-revealed-finish-says-what-it-pays.js - A PUZZLE FINISHED AFTER SHOW SAYS, IN FULL, WHAT IT PAID, AND PAYS
// WHAT IT SAYS. TC-R358..360, US-R229.
//
// WHY [#553 batch 14 B2; jobs/puzzle-finished-with-answer-shown-pays-streak-and-xp-2026-11-03]. The job was filed because the screen
// said 'not counted as solved ... nicely done' while the store paid the streak and 60 XP. Kunal's show-no-rank (#547 item (66)) and
// the orchestrator's a10 (11 Nov 2026) keep the streak and the XP and make the words say so; gate 39 R4c holds the words. The
// checker of 15 Nov found gate 39's R4b ('no nicely done') VACUOUS: its reader keeps the first 120 characters of the line and the
// a10 prefix takes 108, so the praise planted back at the end read green. And nothing compared the words with the store. This gate
// reads the line WHOLE, and checks each thing it claims against chesstrainer.progress.v1, beside an unaided solve of the same
// puzzle on the same geometry as the yardstick for what a solve pays.
//
// WHAT IT ASSERTS on training puzzle 1 (Back-rank mate in 2: Re8+ Rf8 Rxf8#, drive/puzzles 'train', fresh store), at kunal761
// (375x761, insets 51/31) and 320x568, each line carrying its geometry:
//  TC-R358 (PRECONDITIONS, own lines) the unaided solve's line says Solved! and its store gains the puzzle; on the revealed run a
//          real tap at the Show button's centre printed its 'Play ...' line, and the puzzle finished (a closing line appeared).
//  TC-R359 the revealed line, read whole (no character cap), says the answer was shown, that it earns no rank, and that it counts
//          for XP and the streak; and it does NOT say Solved!, 'not counted' or 'nicely done'.
//  TC-R360 the store agrees with the line: the solved map is unchanged (no rank), the streak rose by one, and the XP rose by the
//          same amount the unaided solve paid.
// The answer this holds is a10, not q10's open 'neither' option; if Kunal picks 'neither', TC-R359 and TC-R360 change with it.
// CONTROL-RECORD: 4b8fd17 2026-11-24 total=13 red=2 scope=trial:e3fe12f0259c how=#553 B2 (the pair gates/pairs/jobs/puzzle-finished-with-answer-shown-pays-streak-and-xp-2026-11-03.json): ' - nicely done.' put back after the a10 prefix - TC-R359 red at kunal761 and 320x568; the 'not counted as solved' wording (trial:02feda0e8fe6) reds TC-R359 alone at both; a revealed finish paying no XP (trial:36671e6b09df) reds TC-R360 alone at both; the tree (trial:18d731b84249) 13/0. Pairs verdict CHECKED at base 4b8fd17
const L=require('../lib');
const Z=require('../drive/puzzles');
const PZKEY='chesstrainer.progress.v1';
const prog=(b)=>b.page.evaluate((k)=>{let p=null;try{p=JSON.parse(localStorage.getItem(k)||'null');}catch(e){}
  return {solved:p&&p.solved?Object.keys(p.solved).length:0,streak:p?(p.streak||0):0,xp:p?(p.xp||0):0};},PZKEY);
// the closing line, whole: the innermost div whose text starts with the party or the eye glyph
const closing=(b)=>b.page.evaluate(()=>{const d=[...document.querySelectorAll('div')].map(x=>(x.innerText||'').trim()).filter(t=>/^(\u{1F389}|\u{1F441})/u.test(t)&&t.length>12);
  return d.length?d.reduce((a,c)=>c.length<a.length?c:a):null;});
const only=process.env.CT_G218_GEOS?process.env.CT_G218_GEOS.split(','):null;
L.run(async()=>{
  for(const geo of ['kunal761','se']){if(only&&only.indexOf(geo)<0)continue;
    const tag=L.GEOS[geo].w+'x'+L.GEOS[geo].h;
    // the yardstick: an unaided solve of the same puzzle
    let paid=null;
    {const b=await L.launch({geo,name:'r218-plain-'+geo,store:{}});await b.open();
      await Z.states['train'](b);await b.settle(500);const p0=await prog(b);
      await b.move('e1','e8',1300);await b.settle(500);await b.move('e8','f8',1300);await b.settle(900);
      const p1=await prog(b),line=await closing(b);
      L.say(p1.solved===p0.solved+1&&!!line&&/Solved!/.test(line)&&p1.xp>p0.xp,tag+': TC-R358 PRECONDITION an unaided solve says Solved!, gains the puzzle and pays XP ('+(p1.xp-p0.xp)+') and a streak of '+p1.streak,{p0,p1,line});
      paid={xp:p1.xp-p0.xp,streak:p1.streak-p0.streak};
      await b.close();}
    // the revealed finish
    {const b=await L.launch({geo,name:'r218-shown-'+geo,store:{}});await b.open();
      await Z.states['train'](b);await b.settle(500);const p0=await prog(b);
      await b.move('e1','e8',1300);await b.settle(500);
      let tapped=true;try{await Z.tapAria(b,'Show move',600);}catch(e){tapped=false;}
      const msg=await b.page.evaluate(()=>[...document.querySelectorAll('div,span')].map(x=>(x.innerText||'').trim()).find(t=>/^\u{1F441} Play /u.test(t))||null);
      L.say(tapped&&!!msg,tag+': TC-R358 PRECONDITION a real tap on Show printed its "Play ..." line, so the finish below is a revealed one',{tapped,msg});
      await b.move('e8','f8',1300);await b.settle(900);
      const p1=await prog(b),line=await closing(b);
      L.say(!!line&&/^\u{1F441}/u.test(line),tag+': TC-R358 PRECONDITION the puzzle finished: a closing line beginning with the eye is on screen ('+(line?line.length:0)+' characters)',{line});
      const t=line||'';
      const says={shown:/answer shown/i.test(t),noRank:/no rank/i.test(t),xp:/\bXP\b/.test(t),streak:/streak/i.test(t)};
      const bad={solved:/Solved!/.test(t),notCounted:/not counted/i.test(t),praise:/nicely done/i.test(t)};
      L.say(says.shown&&says.noRank&&says.xp&&says.streak&&!bad.solved&&!bad.notCounted&&!bad.praise,
        tag+': TC-R359 the revealed line, read whole, says the answer was shown, it earns no rank and it counts for XP and the streak - with no Solved!, no "not counted" and no "nicely done" anywhere in it',{says,bad,line:t});
      L.say(!!paid&&p1.solved===p0.solved&&p1.streak===p0.streak+1&&p1.xp-p0.xp===paid.xp&&paid.xp>0,
        tag+': TC-R360 the store pays what the line says: solved map unchanged ('+p0.solved+' -> '+p1.solved+'), streak +'+(p1.streak-p0.streak)+', XP +'+(p1.xp-p0.xp)+' (an unaided solve paid +'+(paid&&paid.xp)+')',{p0,p1,paid});
      L.say(b.errs.length===0,tag+': TC-R358 zero app errors',b.errs.slice(0,3));
      await b.close();}
  }
},'218-revealed-finish-says-what-it-pays');
