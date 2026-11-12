'use strict';
// gates/regress/98-legacy-drill-card-hint.js - A DRILL CARD SAVED WITH NO HINT GETS ITS OWN, NOT "LOOK FOR THE MOST FORCING". TC-R183a..b, US-R116.
//
// WHY [#550, item (89) of directOpening_2026_11_11_batch10; jobs/a-legacy-drill-card-with-no-stored-hint-shows-a-generic-look-for-the-
// most-forcing-line-that-misdirects-on-quiet-cards-2026-11-07, read from source by #549's job 113]. A mistakes-drill card captured before
// #426 stored no `hint`, and the card builder fell back to "There was a better move than the one you chose. Look for the most forcing or
// solid option." - the sentence escapes/generic-hint-on-every-mistake-2026-09-20 retired for new captures, still shown on every old card,
// and wrong on a quiet one, where it sends the player hunting a tactic that is not there. Now the builder computes the same mistakeHint a
// new capture stores, from the card's own position, best move and played move.
//
// WHAT IT ASSERTS, at kunal761, Review > "find the move you missed", one stored card per launch, each WITHOUT a hint field, Hint tapped:
//  (a) TC-R183a a QUIET card (1.e4 e5, best Nf3, played a3): the hint says there is no tactic to spot, and is NOT the generic sentence.
//  (b) TC-R183b a FORCING card (back-rank mate, best Qe8#, played Kf1): the hint says the line ends the game, and is NOT the generic sentence.
// DENOMINATOR per card: the drill opened on that card (its goal names the move played) and the Hint tap produced a hint line.
// CONTROL-RECORD: 719c41e 2026-11-11 total=7 red=2 scope=trial:3ab724514641 how=#550 item (89): origin/main's bundle - both legacy cards show 'Look for the most forcing or solid option', so TC-R183a and TC-R183b's hint lines are red; the four DENOMINATORS and the font pin green
// CONTROL-RECORD: 3835b96 2026-11-12 total=7 red=4 scope=trial:9bceb4fee152 how=#550 round 5, Hint re-key: the drills' Hint button does nothing (onClick no-op) - both DENOMINATOR lines and both own-hint lines red; on 764a0b1dc097 7/0
const L=require('../lib');
const GENERIC=/Look for the most forcing or solid option/;
const CARDS=[
  {id:'TC-R183a',kind:'quiet',fen:'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',uci:'g1f3',played:'a3',want:/No tactic to spot here/},
  {id:'TC-R183b',kind:'forcing',fen:'6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1',uci:'e1e8',played:'Kf1',want:/forcing line here, and it ends the game/},
];
L.run(async()=>{
  for(const c of CARDS){
    const card={fen:c.fen,uci:c.uci,label:'Mistake',played:c.played,ts:1791000000000,last:null,why:'(legacy card, no hint field)'};
    const b=await L.launch({geo:'kunal761',name:'legacy-hint-'+c.kind,store:{ct_mymistakes:[card],ct_pool:'3'}});await b.open();
    let ok=true;try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(600);}catch(e){ok=false;}
    const goal=ok?await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-top"]');return e?e.innerText.replace(/\s+/g,' '):'';}):'';
    L.say(ok&&goal.includes('you played '+c.played),c.id+' DENOMINATOR the '+c.kind+' legacy card opened in the mistakes drill (its goal: "'+goal.slice(0,90)+'")',{ok,goal:goal.slice(0,160)});
    let hint='';
    if(ok){try{const _hb=b.page.locator('button[aria-label="Hint"]:visible');if(await _hb.count()){await _hb.first().click({timeout:4000});await b.page.waitForTimeout(700);}else await b.tapText(/Hint$/,{wait:700});}catch(e){   /* #550 item (66): the drills' Hint is an icon named by aria-label on phones */L.note(c.id+' Hint tap: '+String(e).slice(0,100));}
      hint=await b.page.evaluate(()=>{const t=document.getElementById('root').innerText;const m=t.match(/(No tactic[^\n]*|There is[^\n]*|One move[^\n]*|Moving one piece[^\n]*|A pawn is closer[^\n]*|There was a better move[^\n]*)/);return m?m[1]:'';});}
    L.say(!!hint,c.id+' DENOMINATOR the Hint tap shows a hint line: "'+hint+'"',{hint});
    L.say(!!hint&&c.want.test(hint)&&!GENERIC.test(hint),c.id+' the '+c.kind+' card\'s hint is its own ('+c.want.source+'), not the generic "most forcing or solid option"',{hint});
    await b.close();
  }
},'98-legacy-drill-card-hint');
