'use strict';
// gates/regress/241-boards-at-larger-text.js - THE BOARDS STAY ON SCREEN, ABOVE THE TAB BAR AND STILL AT LARGER TEXT: THE PUZZLE BOARD AT THE OTHER
// FOUR OF THE DRILL SEVEN, AND THE MISTAKES DRILL AND LESSON BOARDS. US-R249 / TC-R429..430.
// Job: jobs/the-suite-varies-seven-geometries-and-exactly-one-font-so-no-gate-covers-a-larger-accessibility-font-2026-10-06, the part gate 205 named as
// not covered (#553, seat B1, taken as the least-left job with builder work, orchestrator-B14-PARTLY-BUILT-LEAST-LEFT-2026-11-24).
//   * THE INPUT is gate 205's (gate 205 itself still drives x1.6 and x2.4, past his bar; that is its own record): gates/drive/textscale.js multiplies every text-owning element's font-size and px line-height by S from the first paint and
//     after every re-render. Not iOS Larger Text (fixed px boxes keep their heights; the platform's own layout is not reproduced). The gate proves the
//     input moved the quantity before it reads under it: the text height grew and (for the screens whose board is sized from the text) the board moved.
//   * THE SCREENS: (A) the Puzzles trainer ("Start training", fresh store) at the other four of THE DRILL SEVEN, 360x640, 390x844, 414x896, 440x956
//     (gate 205 holds 320x568, 375x667 and kunal761); (B) the mistakes drill on three seeded K+Q cards (as gate 172) and (C) the lesson demo at ply 4,
//     each at 320x568, 375x667 and kunal761. Scales 1 and 1.25: his bar (see SCALES).
//   * THE INVARIANTS are gate 205's, relative and not absolute pixels: (a) the board's right edge is inside the viewport, (b) its bottom is above the
//     tab bar where the screen has one (the lesson hides it: then above the lesson footer, else the viewport's foot), (c) its width and top are the same
//     across two settles, (d) #root has nothing to scroll.
// NOT COVERED, NAMED: the control-row budget from gate 48 (not exported by gate 48); a real iOS Larger Text (his phone); Review and Play (their boards
// are sized by revFit/playFit row floors, not by the text above them: a separate input).
// CT_G241_ONLY=<regex on 'screen geo'> runs only those launches (a subset is never the whole gate).
// CONTROL-RECORD: 089a17e9 2026-11-25 total=40 red=1 scope=trial:2d13612720bd how=#553 B1, break 241-drill-board-ignores-its-text (pzStackH dropped from the height cap AND the fit loop skipped for the drill), CT_G241_ONLY=^drill: TC-R430d red at drill 320x568 x1.25 (#root 604 of 568), every other line green; the real tree's trial be6e3f495d40 reads 131/0
// CONTROL-RECORD: 089a17e9 2026-11-25 total=92 red=1 scope=trial:18f17af5a150 how=#553 B1, break 241-board-ignores-its-text-and-the-loop-is-blind (pzStackH dropped and the fit loop reading zero overflow), CT_G241_ONLY=^(drill|puzzle): TC-R430d red at drill 320x568 x1.25 (#root 604 of 568); the larger phones and the other sizes have the room, so they are not asked to go red
// TWO BREAKS THAT LOOKED LIKE CONTROLS WERE BLIND AT x1.25 AND ARE NOT SHIPPED: the fit loop skipped for the drill alone, and for the lessons alone (40/0 each) - at his 125% the drill gives way through pzStackH and the lesson board does not need to give way at all.
const L=require('../lib');
const TS=require('../drive/textscale');
const Z=require('../drive/puzzles'),D=require('../drive/lesson');
const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'];const UCIS=['b2b7','c2c7','d2d7'];
const DSTORE={ct_mymistakes:FENS.map((f,i)=>({fen:f,uci:UCIS[i],label:'Blunder',played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',wc:{g:'Blunder',drop:25}})),ct_pool:'3'};
const drill=async(b)=>{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(900);};
const SCREENS=[
  ['puzzle',b=>Z.states['train'](b),['w360','390','w414','w440'],null,true],
  ['drill',drill,['se','w375h667','kunal761'],DSTORE,true],
  ['lesson',b=>D.states['demo-m4'](b),['se','w375h667','kunal761'],null,false],
];
const SCALES=[1,1.25];   // HIS BAR, NOT THE JOB'S [orchestrator-B13-Q25-2026-11-19 part 2, '125 percent (Recommended)', the largest text every screen must
// stay clean at; orchestrator-B13-TEXT-FIXED-2026-11-19, the Home Screen app keeps its text fixed and the zoom axis stays at 125% for Safari users]. The
// job's own x1.6 / x2.4 predate those picks; this gate follows the picks.
const ONLY=process.env.CT_G241_ONLY?new RegExp(process.env.CT_G241_ONLY):null;
const rd=(b)=>b.page.evaluate(()=>{const gs=[...document.querySelectorAll('div')].filter(d=>getComputedStyle(d).gridTemplateColumns.split(' ').length===8&&d.getBoundingClientRect().width>100).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width);
  if(!gs.length)return null;const r=gs[0].getBoundingClientRect();
  const vis=e=>{if(!e)return false;const q=e.getBoundingClientRect();return q.height>0&&q.width>0&&getComputedStyle(e).visibility!=='hidden';};
  const bar=document.querySelector('[data-ct="tabbar"]'),foot=document.querySelector('[data-ct="lesson-footer"]');
  const floor=vis(bar)?bar.getBoundingClientRect().top:(vis(foot)?foot.getBoundingClientRect().top:innerHeight);
  const root=document.getElementById('root');
  return {top:Math.round(r.top*10)/10,right:Math.round(r.right*10)/10,bottom:Math.round(r.bottom*10)/10,w:Math.round(r.width*10)/10,floor:Math.round(floor*10)/10,floorIs:vis(bar)?'tab bar':(vis(foot)?'lesson footer':'viewport foot'),iw:innerWidth,sh:root.scrollHeight,ch:root.clientHeight};});
L.run(async()=>{
  for(const [scr,enter,geos,store,boardFromText] of SCREENS)for(const g of geos){
    const base={};
    for(const S of SCALES){
      const tag=scr+' '+g+' text x'+S;if(ONLY&&!ONLY.test(scr+' '+g))continue;
      const b=await L.launch({geo:g,name:'g241-'+scr+'-'+g+'-'+S,store:store||undefined});await TS.install(b,S);await b.open();let ok=true,err='';
      try{await enter(b);await b.settle(900);}catch(e){ok=false;err=String(e.message||e).slice(0,160);}
      const m1=ok?await rd(b):null;await b.settle(700);const m2=ok?await rd(b):null;const st=await TS.stats(b);
      if(S===1){base.top=m1&&m1.top;base.th=st.textHeight;}
      L.say(!!m1&&!!m2&&st.scaled>=10,'TC-R429 PRECONDITION '+tag+': the board is on screen and the text scaler reached '+st.scaled+' elements'+(err?' - '+err:''),{m1,m2,st});
      if(S>1&&m1){const grew=st.textHeight>=base.th*(1+(S-1)*0.3),moved=!boardFromText||(m1.top-base.top>=3)||(base.w&&m1.w<base.w-3);   /* calibrated at x1.25 on this gate's own first run: the board moved 4 to 7px down at the four puzzle sizes and the drill's shrank 320 -> 284 at 320x568 (gate 205's 10px was read at x1.6 and x2.4) */
        L.say(grew&&moved,'TC-R429 PRECONDITION '+tag+': the larger text moved the measured quantity - the text height grew '+base.th+' -> '+st.textHeight+(boardFromText?(' and the board moved '+(Math.round((m1.top-base.top)*10)/10)+'px down or narrowed '+(base.w?Math.round((base.w-m1.w)*10)/10:'?')+'px'):' (this screen\'s board is not sized from its text, so only the text is asked to move)'),{base,m1,st});}
      if(S===1&&m1)base.w=m1.w;
      if(m1&&m2){
        L.say(m1.right<=m1.iw+0.5&&m2.right<=m2.iw+0.5,'TC-R430a '+tag+': the board\'s right edge ('+m2.right+') is inside the viewport ('+m2.iw+')',{m1,m2});
        const sayOr=(ok,id,msg,d)=>L.say(ok,id+' '+msg,d);
        sayOr(m1.bottom<=m1.floor+0.5&&m2.bottom<=m2.floor+0.5,'TC-R430b',tag+': the board ends above the '+m2.floorIs+' ('+m2.bottom+' against '+m2.floor+')',{m1,m2});
        L.say(Math.abs(m1.w-m2.w)<=0.5&&Math.abs(m1.top-m2.top)<=0.5,'TC-R430c '+tag+': the board is the same size and place across two settles ('+m1.w+' at '+m1.top+' then '+m2.w+' at '+m2.top+')',{m1,m2});
        sayOr(m1.sh<=m1.ch+1&&m2.sh<=m2.ch+1,'TC-R430d',tag+': the screen needs no scrolling - #root holds its content ('+m2.sh+' of '+m2.ch+')',{m1,m2});}
      L.say(b.errs.length===0,'TC-R429 '+tag+' zero app errors',b.errs.slice(0,3));await b.close();}}
},'241-boards-at-larger-text');
