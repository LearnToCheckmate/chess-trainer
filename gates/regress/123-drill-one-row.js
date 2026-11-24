'use strict';
// gates/regress/123-drill-one-row.js - BOTH DRILLS PUT THEIR FIVE CONTROLS ON ONE ROW, SO THE BOARD TAKES THE HEIGHT. US-R131 / TC-R199a..c.
//
// WHY [#550 item (66), jobs/the-mistakes-drill-board-is-not-full-size-2026-11-11, the audit's AUD-R12]: Kunal asked for the mistakes
// drill board edge to edge, as in the brilliant moves drill, with a case on its width at 375x761 and 320x568. MEASURED before the change
// (trial 36531456ced7): Hint, Show move and Reset wrapped onto rows of their own above Prev and Next, so the bottom area took 104px at
// 375x761 and 155 at 320x568, where the board is fitted to height: 192 wide in the mistakes drill and 216 in the brilliant one.
// WHAT IT READS: the bundle under test (CT_APP), each drill entered from the Review screen with three cards (mistakes) or one (brilliant,
// so the library does not open), at kunal761 and 320x568. The board is the widest repeat(8,...) grid; the controls as below.
// EDGE TO EDGE AT 320x568 TOO [batch 14 item 3, jobs/short-upright-boards-sized-to-height-2026-11-12 and jobs/the-mistakes-drill-board-is-not-full-size-
// 2026-11-11, amber flags/amber-553-mistakes-drill-short-fit]: the mistakes drill's three-line goal held its board to height, 302 of 320 (288 before the
// formatting audit), while SQ's puzzle reserve counted 20px the column never used (8 of root padding under the fixed tab bar, 6 of top padding an edge
// screen does not have; a 20px band between the controls and the tab bar). It now counts the column as laid out and the top block's gap is 4 under 700
// tall, so the board is 320. TC-R199d/e: the board keeps that width and its top after a wrong move, a Reset and the right move with its verdict up, the
// controls end above the tab bar, and nothing scrolls - at kunal761, 320x568, 375x667 and the Home Screen app (L.HOME_SCREEN_APP, real insets 51/31).
// KNOW ITS LIMIT: the fixture's goal ('you played Kd1 here, a blunder') is three lines at 320, the longest the reserve holds; a card with motif chips is not measured.
// A 320x568 Home Screen app with a 20 top inset is still fitted to height (300, was 282) and is not pinned here.
// CONTROL-RECORD: 2b55ba6 2026-11-11 total=21 red=6 scope=trial:36531456ced7 how=#550 item (66): the tree before the one row (the helpers wrap over Prev/Next) - TC-R199a at both geometries in both drills and TC-R199c at 320x568 red, the preconditions and TC-R199b green
// CONTROL-RECORD: 534ec70 2026-11-24 total=113 red=5 scope=trial:eeb57ae82123 how=#553 batch 14 item 3: the tree before the fix (the reserve with its old terms, the root padding under the tab bar, the 8 gap) - TC-R199c and the four TC-R199d at 320x568 mistakes red (302 against 320), everything else green
const L=require('../lib');
const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'];const UCIS=['b2b7','c2c7','d2d7'];
// the mistakes rows carry the grade the review stored (wc), as gate 72's fixture does since the drill counts only re-graded rows: without it the
// Review screen shows no mistakes card and the drill cannot be entered (found red on the branch tip at #550, formatting audit FMT-A-12).
const rows=(label,n)=>FENS.slice(0,n).map((f,i)=>({fen:f,uci:UCIS[i],label,played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',...(label==='Brilliant'?{}:{wc:{g:label,drop:25}})}));
const DRILLS=[{k:'mistakes',enter:/find the move you missed/,store:{ct_mymistakes:rows('Blunder',3),ct_pool:'3'}},
              {k:'brilliant',enter:/can you spot them again\?/,store:{ct_mybrilliancies:rows('Brilliant',1),ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'}}];   // batch 13 (jobs/brilliancy-library-and-motif-coverage-2026-09-23): since the famous-games shelf, the Your brilliant moves tile opens the library even for a store of one kind; this gate is about the DRILL, so its brilliant store seeds ct_bril_lib '0' and the tile starts the drill at once, as gate 72's stores have since #550 (gates 118 and 168 cover the library)
const WANT={kunal761:{mistakes:375,brilliant:375},se:{mistakes:320,brilliant:320},'375x667':{mistakes:375,brilliant:375},app:{mistakes:375,brilliant:375}};   // batch 14 item 3: se mistakes 302 -> 320 (edge to edge; trial 3e68e54c9e3f), 375x667 and the Home Screen app added
const GEO={kunal761:{geo:'kunal761'},se:{geo:'se'},'375x667':{geo:{w:375,h:667,safe:'',label:'375x667'}},app:L.HOME_SCREEN_APP};   // measured on trial 8b141ccb9067; se mistakes 288 -> 302 re-keyed by formatting audit FMT-A-06/A-12, Kunal's pick 12 Nov: the top row at TOP_Y, the fit loop's stale hold cleared when the stack is measured, and the short-phone card padding (measured on trial 8034b0e23279)
// FOUND BY WHAT EXISTED BEFORE THIS BUILD, NOT BY WHAT IT ADDED (#432): Prev and Next by their data-ct hooks (#475), the helpers by their
// accessible name OR their glyph, because the old row carried only the text ('💡 Hint', '👁 Show move', '↺ Reset'). A finder keyed on the
// names this build added would go red on the old tree for a missing hook rather than for the two rows.
const NAMES=[['Hint','💡'],['Show move','👁'],['Reset','↺'],['drill-prev',null],['drill-next',null]];
L.run(async()=>{
  for(const geo of (process.env.CT_G123_GEOS||'kunal761,se,375x667,app').split(','))for(const d of DRILLS){
    const G=GEO[geo];const tag=geo+' '+d.k;const b=await L.launch(Object.assign({},G,{name:'drill-row-'+d.k+'-'+geo,store:Object.assign({},G.store||{},d.store)}));await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(700);await b.tapText(d.enter,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(900);}catch(e){ok=false;}
    const r=await b.page.evaluate((NAMES)=>{const bd=[...document.querySelectorAll('div')].filter(x=>/repeat\(8,/.test(x.style.gridTemplateColumns||'')).map(x=>x.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const c=NAMES.map(([n,g])=>{const e=g===null?document.querySelector('[data-ct="'+n+'"]'):[...document.querySelectorAll('button')].find(x=>x.getBoundingClientRect().width>0&&(x.getAttribute('aria-label')===n||(x.innerText||'').trim().startsWith(g)));if(!e||!(e.getBoundingClientRect().width>0))return {n,found:false};const q=e.getBoundingClientRect();
        const h=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return {n,found:true,top:Math.round(q.top*10)/10,h:Math.round(q.height*10)/10,w:Math.round(q.width*10)/10,on:q.top>=0&&q.bottom<=innerHeight,self:!!h&&(h===e||e.contains(h)),cut:e.scrollWidth>e.clientWidth+1};});
      return {vw:innerWidth,board:bd?{w:Math.round(bd.width*100)/100,b:Math.round(bd.bottom)}:null,c};},NAMES);
    L.say(ok&&!!r.board&&r.c.every(x=>x.found),'TC-R199 '+tag+' PRECONDITION the drill is open with its board and all five controls',r);
    const tops=r.c.filter(x=>x.found).map(x=>x.top);
    L.say(tops.length===5&&Math.max(...tops)-Math.min(...tops)<=1,'TC-R199a '+tag+' the five controls sit on ONE row (tops '+tops.join(', ')+')',r.c);
    L.say(r.c.every(x=>x.found&&x.h>=43.5&&x.on&&x.self&&!x.cut),'TC-R199b '+tag+' each is at least 44 tall, on screen, takes a tap at its centre, and no label is cut ('+r.c.map(x=>x.n+' '+x.w+'x'+x.h+(x.cut?' CUT':'')).join('; ')+')',r.c);
    const want=WANT[geo][d.k];
    L.say(!!r.board&&Math.abs(r.board.w-want)<=1,'TC-R199c '+tag+' the board is '+(r.board&&r.board.w)+' wide against '+want+(want>=r.vw-0.5?', edge to edge':' (fitted to height under a three-line goal)'),r.board);
    // TC-R199d/e: AFTER INTERACTION (the #370 rule): a wrong move, Reset, then the right move with the verdict up. The board must hold the width
    // it had while asking and not move (a row that can appear reserves its space or floats), the five controls end above the tab bar, and the
    // page does not scroll. Each reading is its own line so a state that never arrived is a red, not a pass (the verdict text is checked present).
    const rd=()=>b.page.evaluate(()=>{const bd=[...document.querySelectorAll('div')].filter(x=>/repeat\(8,/.test(x.style.gridTemplateColumns||'')).map(x=>x.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
      const row=document.querySelector('[data-ct="drill-row"]'),tb=document.querySelector('[data-ct="tabbar"]'),m=document.querySelector('[data-ct="pz-msg"]'),rt=document.getElementById('root'),sc=document.scrollingElement;
      return {w:bd?Math.round(bd.width*100)/100:null,top:bd?Math.round(bd.top*10)/10:null,left:bd?Math.round(bd.left*10)/10:null,rowB:row?Math.round(row.getBoundingClientRect().bottom*10)/10:null,tabT:tb?Math.round(tb.getBoundingClientRect().top*10)/10:null,
        msg:m?(m.innerText||'').slice(0,70):'',scroll:Math.max(rt.scrollHeight-rt.clientHeight,sc.scrollHeight-(window.__ctFullH>0?window.__ctFullH:sc.clientHeight))};});   // in the Home Screen app the page is the shell's 812 in a 761 layout viewport by design (collectDiagnostics, #550 item (1)), so the document is read against the shell
    const st={ask:await rd()};
    try{await b.move('b2','b3');await b.settle(1500);}catch(e){}st.wrong=await rd();
    try{await b.page.locator('[data-ct="drill-reset"]').click({timeout:4000});await b.settle(1200);}catch(e){}st.reset=await rd();
    try{await b.move('b2','b7');await b.settle(2500);}catch(e){}st.right=await rd();
    L.say(/\u2717/.test(st.wrong.msg)&&/\uD83C\uDF89/.test(st.right.msg),'TC-R199d '+tag+' PRECONDITION the wrong move drew its line and the right move its verdict (wrong "'+st.wrong.msg+'"; right "'+st.right.msg+'")',st);
    for(const k of ['ask','wrong','reset','right']){const x=st[k];
      L.say(x.w!=null&&Math.abs(x.w-want)<=1&&Math.abs(x.w-st.ask.w)<=0.5&&Math.abs(x.top-st.ask.top)<=0.5,'TC-R199d '+tag+' '+k+': the board is '+x.w+' wide at top '+x.top+' (asking: '+st.ask.w+' at '+st.ask.top+'), the width it should have and no jump',x);
      L.say(x.rowB!=null&&x.tabT!=null&&x.rowB<=x.tabT+0.5&&x.scroll<=1,'TC-R199e '+tag+' '+k+': the controls end at '+x.rowB+', above the tab bar at '+x.tabT+', and the page scrolls '+x.scroll,x);}
    L.say(b.errs.length===0,'TC-R199 '+tag+' zero app errors',b.errs.slice(0,3));
    await b.close();}
},'123-drill-one-row');
