'use strict';
// gates/regress/132-drill-reads-the-position.js - THE MISTAKES DRILL'S HINT AND VERDICT SAY WHAT IS IN THE POSITION, AND A SOLVED CARD
// KEEPS RESET. US-R140 / TC-R208a..d.
//
// WHY [#550, run-answers build__1794388896663-a37; docs/hint-audit-2026-11-12 HEX-T-01 and HEX-T-02; jobs/drill-hints-name-the-positions-
// point-2026-11-12 and jobs/drill-reset-after-solving-2026-11-12]: Kunal, 12 Nov, on his phone: the hints "are again very generic ... you
// could've said something like they left the queen hanging take it with the bishop", and "give me the option to reset the board even after
// I get the answer right so I can redo it". The audit: 44 of 50 real cards read "No tactic to spot here - look for the move that improves
// your worst piece", and 44 of 50 verdicts read "<move> was stronger".
// WHAT IT READS: the bundle under test (CT_APP). Three cards from the audit's own examples are seeded into ct_mymistakes WITH the generic
// hint and the "was stronger" verdict stored on them, exactly as a card captured before this build carries them - so the gate also proves
// the cards he already has are re-read, not only new captures. Each is opened in the mistakes drill at kunal761, Hint tapped, the best
// move played on the board, then Reset tapped on the solved card.
// The #550 a41 fixture change (wc on the seeded cards) re-keys no assertion; the CONTROL-RECORD below still stands for what the gate asserts.
// KNOW ITS LIMIT: three positions; concreteRead's coverage over real cards is a measurement on the job, not this gate.
const L=require('../lib');
const GENERIC=/No tactic to spot here|Look for the most forcing or solid option/;
const CARDS=[
  {id:'save',fen:'r5k1/3r1p1p/3p2pP/pp1Pp3/4R3/5N2/Pn3PP1/1R4K1 b - - 0 1',uci:'b2a4',played:'Nd3',hint:/knight on b2 is under attack from the rook on b1/,why:/Na4 moves the knight out of the attack/},
  {id:'threat',fen:'r4rk1/p1p1qpp1/2pp3Q/2b1p3/4P2P/P1NP1b2/1PP2P2/R3K1R1 b Q - 0 1',uci:'f7f5',played:'g6',hint:/threaten Qxg7 mate/,why:/f5 stops Qxg7 mate/},
  {id:'take',fen:'r4rk1/np6/3pNq1Q/p2p4/2bP4/2P5/3B1PPP/R3R1K1 w - - 0 1',uci:'e6f8',played:'Qh3',hint:/rook on f8 can be taken/,why:/Nxf8 wins the rook/},
];
const rootText=(b)=>b.page.evaluate(()=>document.getElementById('root').innerText.replace(/\s+/g,' '));
L.run(async()=>{
  for(const c of CARDS){
    const san=c.uci.slice(0,2)+'-'+c.uci.slice(2,4);
    const card={fen:c.fen,uci:c.uci,label:'Mistake',played:c.played,ts:1791000000000,last:null,wc:{g:'Mistake',drop:20},   /* #550 a41: marked as already re-graded, so the Home pass (gate 134's subject) does not judge this fixture - the take card's Qh3 still leaves White winning by win chance and the pass rightly drops it */
      
      hint:'No tactic to spot here — look for the move that improves your worst piece.',why:'That was stronger. '+c.played+' went from winning to clearly better.'};
    const b=await L.launch({geo:'kunal761',name:'drill132-'+c.id,store:{ct_mymistakes:[card],ct_pool:'3'}});await b.open();
    let ok=true;try{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(600);}catch(e){ok=false;}
    const goal=ok?await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="pz-top"]');return e?e.innerText.replace(/\s+/g,' '):'';}):'';
    L.say(ok&&goal.includes('you played '+c.played),'TC-R208 '+c.id+' PRECONDITION the seeded card opened in the mistakes drill ("'+goal.slice(0,80)+'")',{ok,goal:goal.slice(0,140)});
    let hint='';
    if(ok){try{const _hb=b.page.locator('button[aria-label="Hint"]:visible');if(await _hb.count())await _hb.first().click({timeout:4000});else await b.tapText(/Hint$/,{wait:700});await b.page.waitForTimeout(700);}catch(e){}   /* by name, else by its word (gate 98's fallback: an older drill row has no aria-label) */
      const t=await rootText(b);const m=t.match(/\u{1F4A1}\s*([^\u{1F4A1}]{8,140}?\.)(?:\s|$)/u);hint=m?m[1]:'';}
    L.say(!!hint&&c.hint.test(hint)&&!GENERIC.test(hint),'TC-R208a '+c.id+': the hint names what is there ("'+hint+'"), not the stored generic line',{hint});
    let solved=false,verdict='';
    if(ok){try{await b.move(c.uci.slice(0,2),c.uci.slice(2,4),1500);}catch(e){}
      solved=await b.page.evaluate(()=>!!document.querySelector('[data-ct="drill-analyse"]'));verdict=await rootText(b);}
    L.say(solved,'TC-R208 '+c.id+' PRECONDITION playing '+san+' solves the card (Analyse shows)',{solved});
    L.say(solved&&c.why.test(verdict)&&!/That was stronger/.test(verdict),'TC-R208b '+c.id+': the verdict says what the move does ('+c.why.source+'), not "was stronger"',{verdict:(verdict.match(c.why)||[''])[0]||verdict.slice(0,200)});
    const rs=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="drill-reset-solved"]');if(!e)return null;const q=e.getBoundingClientRect();return {w:Math.round(q.width),h:Math.round(q.height),on:q.bottom<=innerHeight&&q.right<=innerWidth&&q.top>=0,label:e.getAttribute('aria-label')};});
    L.say(!!rs&&rs.on&&rs.w>=43.5&&rs.h>=43.5&&rs.label==='Reset','TC-R208c '+c.id+': the solved card keeps a Reset, 44pt or more and on screen',rs);
    if(rs){await b.page.click('[data-ct="drill-reset-solved"]').catch(()=>{});await b.settle(900);}
    const back=await b.page.evaluate(()=>({analyse:!!document.querySelector('[data-ct="drill-analyse"]'),hintLive:!!document.querySelector('button[aria-label="Hint"]:not([disabled])')&&getComputedStyle(document.querySelector('button[aria-label="Hint"]').parentElement).visibility!=='hidden'}));
    L.say(!!rs&&!back.analyse&&back.hintLive,'TC-R208d '+c.id+': Reset puts the card back unsolved, so it can be played again',back);
    L.say(b.errs.length===0,'TC-R208 '+c.id+' zero app errors',b.errs.slice(0,3));await b.close();
  }
},'132-drill-reads-the-position');
