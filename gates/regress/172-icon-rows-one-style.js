'use strict';
// gates/regress/172-icon-rows-one-style.js - EVERY BUTTON ROW IS ICONS ONLY, IN ONE STYLE, WITH TWO KINDS OF ARROWS. US-R166 / TC-R237a..e.
//
// WHY [batch 13, jobs/every-button-row-is-icons-only-in-one-style-with-two-kinds-of-arrows-2026-11-18; Kunal's pick on questions/Q24, 'A, icons only',
// 11:15pm EST Tue 17 Nov 2026; FB-13 'none of the buttons should actually have something written on them']: the rows mixed words with icons,
// words under icons, and arrows that meant different things on each screen. The look he picked: every button row icons only, in one shared
// style (same size, shape, background and icon weight); WHITE arrows step through moves (game, puzzle, lesson), BLUE triangles go to the
// previous or next item (puzzle, card, lesson, motif, idea). A screen's single start button keeps its words.
// WHAT IT READS: the bundle under test (CT_APP), at kunal761 and 320x568 (se), in two skins (Classic, the default, and Medieval through Pro),
// every screen state below AFTER INTERACTION (moves played, a puzzle solved, a lesson finished). Each row member is found by WHAT IT IS - its
// accessible name, else its title, else its own words with the glyph stripped - never by a data-ct this build added (CLAUDE.md, #432), so the
// tree before the change is found, measured and reddened for the right reason (its words, its sizes, its arrows), not for a missing hook.
// WHAT IT ASSERTS per row (TC-R237):
//   a PRECONDITION every member is on screen, takes a tap at its centre, and the screen state was reached (a missing member is red, never a pass)
//   b no member shows a letter or a digit (its painted innerText), except the row's named start button
//   c every member (start button aside) is at least 44x44 and all of them are ONE size (width and height within 1px)
//   d every member has the shared face: background rgba(255,255,255,0.08) (a toggle that is ON, aria-pressed=true, the accent tint), no
//     background image, no border, radius 12
//   e each STEP member draws the white chevron (an svg polyline stroked rgb(255,255,255), no filled shape) and each PREVIOUS/NEXT member the
//     blue triangle (an svg polygon filled rgb(91,155,213)) - never the other one
// EXCLUDED, NAMED: the game-review screen (the Review board's transport row, its eval band and summary) - HELD: seat B2 is on the Review screen
// in batch 13; the lead hands that part to this job after B2 merges, and its rows are added to ROWS then. The sideways layouts, the setup
// sheet's choice chips, the tab bar and the top corners are listed in claude/agents/BUTTON-ROWS-B13.md with the reason each is not a row here.
// CT_G172_ONLY=<comma list of row keys> runs only those rows (a subset is never the whole gate).
// CONTROL-RECORD: f62b2460 2026-11-19 total=341 red=174 scope=trial:73dbc284724b how=THE SUBJECT REMOVED: the branch's start (f62b2460, built as base) - every row red for its own reason: words on the game rows, the puzzle and solved rows, Tactics, Strategy, the lesson demo and practice rows and the menu's Share (b); the puzzle, solved, drill, Strategy, game-over, lesson practice and footer rows of two sizes (c; the footer's Play 52 beside 44); the bordered gradient faces (d); Previous/Next drawn as white chevrons or words and the game's Back/Forward as filled triangles (e). 16 of the 174 are the se lesson-demo rows this gate no longer runs (they fold into the bar there), so the current scope reads about 158 red. The real tree (trial 5f278df801f2, drill re-run after its grid) is green: 317/4 on a1b7be1236cf with the drill's flex row 64/76 wide, fixed, then drill 25/0
const L=require('../lib');
const P=require('../drive/play'),Z=require('../drive/puzzles'),D=require('../drive/lesson'),M=require('../drive/menu');
const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'];const UCIS=['b2b7','c2c7','d2d7'];
const DSTORE={ct_mymistakes:FENS.map((f,i)=>({fen:f,uci:UCIS[i],label:'Blunder',played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',wc:{g:'Blunder',drop:25}})),ct_pool:'3'};
const drill=async(b)=>{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(900);};
const strategy=async(b)=>{await D.states.tactics(b);await b.tapText(/^Strategy$/,{wait:700});};
const answered=async(b)=>{await D.states.tactics(b);await b.tapText(/^(Show answer)$/,{wait:900});};
// key -> [state, members, {step:[names], nav:[names], start:[names]}, extra store]. A member is a list of accepted names (alternatives).
const ROWS=[
  ['play-live',b=>P.states['cpu-4ply'](b),[['Moves'],['Back'],['Forward'],['Hint'],['Flip'],['More']],{step:['Back','Forward']}],
  ['play-over',b=>P.states['cpu-resigned'](b),[['Moves'],['Back'],['Forward'],['Review'],['Rematch'],['More']],{step:['Back','Forward']}],
  ['passplay-live',b=>P.states['pp-1'](b),[['Moves'],['Back'],['Forward'],['Hint'],['Flip'],['More']],{step:['Back','Forward']}],
  ['puzzle',b=>Z.states['train-step1'](b),[['Previous puzzle'],['Hint'],['Show move'],['Reset'],['Next puzzle']],{nav:['Previous puzzle','Next puzzle']}],
  ['puzzle-solved',b=>Z.states['train-solved'](b),[['Previous puzzle'],['Next puzzle']],{nav:['Previous puzzle','Next puzzle']}],
  ['drill',drill,[['Hint'],['Show move'],['Reset'],['Previous card'],['Next card']],{nav:['Previous card','Next card']},DSTORE],
  ['tactics',b=>D.states.tactics(b),[['Hint'],['Show answer']],{}],
  ['tactics-answered',answered,[['Next motif']],{nav:['Next motif']}],
  ['strategy',strategy,[['Previous idea','Prev'],['Next idea','Next']],{nav:['Previous idea','Next idea','Prev','Next']}],
  // on a short phone (se) the lesson's row under the board folds into the bar (Now I'll try it is a bar button, Other lines in the ⋯ sheet, #550 a42),
  // so these two rows exist at kunal761 only (the 6th field); the bar is read by lesson-footer at both sizes
  ['lesson-demo',b=>D.states['demo-m1'](b),[["Now I'll try it"],['Flip board','Flip']],{start:["Now I'll try it"]},null,'kunal761'],
  ['lesson-demo-end',b=>D.states['demo-end'](b),[["Now I'll try it"],['Other lines*']],{start:["Now I'll try it"]},null,'kunal761'],
  ['lesson-footer',b=>D.states['demo-m4'](b),[['Close lesson'],['Back a move'],['Play or pause'],['Forward a move'],['More for this lesson']],{step:['Back a move','Forward a move'],primary:['Play or pause']}],
  ['lesson-practice',b=>D.states['practice-wrong'](b),[['Flip board','Flip'],['Hints'],['Try again']],{}],
  ['lesson-complete',b=>D.states['practice-complete'](b),[['Flip board','Flip'],['Hints'],['Next lesson*']],{nav:['Next lesson*']}],
  ['menu-share',b=>M.states['menu-discover'](b),[['Share Chess Trainer','Share','Share Chess Trainer'],['Send feedback','Feedback']],{}],
];
const SKINS=[['classic',{}],['medieval',{ct_skin:'2'},true]];
const ONLY=(process.env.CT_G172_ONLY||'').split(',').filter(Boolean);
const READ=([members,roles])=>{const vw=innerWidth,vh=innerHeight;
  const nm=e=>{const a=(e.getAttribute('aria-label')||'').trim();if(a)return a;const t=(e.getAttribute('title')||'').trim();if(t)return t;return (e.innerText||'').replace(/[^\p{L}\p{N}' ]+/gu,' ').replace(/\s+/g,' ').trim();};
  const hit=(n,alts)=>alts.some(x=>x.endsWith('*')?n.startsWith(x.slice(0,-1)):n===x);
  const vis=e=>{const r=e.getBoundingClientRect();if(!(r.width>1&&r.height>1))return false;if(r.top<0||r.bottom>vh+0.5||r.left<-0.5||r.right>vw+0.5)return false;const s=getComputedStyle(e);if(s.visibility==='hidden')return false;
    const c=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!c&&(c===e||e.contains(c));};
  const all=[...document.querySelectorAll('button')].filter(vis);
  const out=members.map(alts=>{const c=all.filter(e=>hit(nm(e),alts)).sort((a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().top);const e=c[0];if(!e)return {alts,found:false};
    const r=e.getBoundingClientRect(),s=getComputedStyle(e),n=nm(e);
    const svgs=[...e.querySelectorAll('svg')];const shapes=[];
    for(const sv of svgs)for(const g of sv.querySelectorAll('polyline,polygon,path,circle,rect')){const cs=getComputedStyle(g);shapes.push({tag:g.tagName.toLowerCase(),stroke:cs.stroke,fill:cs.fill});}
    return {alts,found:true,name:n,text:(e.innerText||'').trim(),w:+r.width.toFixed(1),h:+r.height.toFixed(1),top:+r.top.toFixed(1),bg:s.backgroundColor,bi:s.backgroundImage,bw:s.borderTopWidth,bs:s.borderTopStyle,rad:s.borderTopLeftRadius,pressed:e.getAttribute('aria-pressed'),shapes};});
  return {out,vw,vh,ac:getComputedStyle(document.getElementById('root')||document.body).fontFamily.split(',')[0].replace(/["']/g,'')};};
const isStep=m=>m.shapes.length>0&&m.shapes.some(x=>x.tag==='polyline'&&/^rgb\(255, 255, 255\)$/.test(x.stroke))&&!m.shapes.some(x=>x.tag==='polygon'||(x.fill&&x.fill!=='none'&&!/rgba\(0, 0, 0, 0\)/.test(x.fill)));
const isNav=m=>m.shapes.some(x=>x.tag==='polygon'&&x.fill==='rgb(91, 155, 213)')&&!m.shapes.some(x=>x.tag==='polyline');
const inRole=(m,list)=>!!list&&list.some(x=>x.endsWith('*')?m.name.startsWith(x.slice(0,-1)):m.name===x);
L.run(async()=>{
  for(const geo of ['kunal761','se'])for(const [skin,sstore,pro] of SKINS)for(const [key,enter,members,roles,xstore,onlyGeo] of ROWS){
    if(ONLY.length&&!ONLY.includes(key))continue;if(onlyGeo&&onlyGeo!==geo)continue;
    const tag=(L.geoIs(geo,375,761)?'375x761':'320x568')+' '+skin+' '+key;
    const b=await L.launch({geo,name:'g172-'+key+'-'+skin+'-'+geo,pro:!!pro,store:{...sstore,...(xstore||{})}});await b.open();let ok=true,err='';
    try{await enter(b);await b.settle(700);}catch(e){ok=false;err=e.message;}
    const r=await b.page.evaluate(READ,[members,roles]);
    const ms=r.out;
    L.say(ok&&ms.every(m=>m.found),'TC-R237a '+tag+' PRECONDITION the state is reached and every member is on screen and takes a tap ('+ms.map(m=>m.found?m.name:'MISSING '+m.alts.join('|')).join(', ')+'; skin font '+r.ac+')',{err,ms:ms.map(m=>({n:m.name||m.alts,f:m.found}))});
    const fm=ms.filter(m=>m.found);const row=fm.filter(m=>!inRole(m,roles.start));
    const worded=row.filter(m=>/[\p{L}\p{N}]/u.test(m.text));
    L.say(fm.length===ms.length&&row.length>0&&worded.length===0,'TC-R237b '+tag+' no row button shows a word ('+(worded.length?worded.map(m=>JSON.stringify(m.text)).join(', '):'none of '+row.length)+')',worded.map(m=>({n:m.name,t:m.text})));
    const ws=row.map(m=>m.w),hs=row.map(m=>m.h);
    const one=row.length>0&&Math.max(...ws)-Math.min(...ws)<=1&&Math.max(...hs)-Math.min(...hs)<=1;
    L.say(fm.length===ms.length&&row.length>0&&row.every(m=>m.w>=43.5&&m.h>=43.5)&&one,'TC-R237c '+tag+' every row button is at least 44x44 and all are one size ('+row.map(m=>m.name+' '+m.w+'x'+m.h).join('; ')+')',row.map(m=>[m.name,m.w,m.h]));
    const face=m=>(inRole(m,roles.primary)||(m.pressed==='true')||m.bg==='rgba(255, 255, 255, 0.08)')&&m.bi==='none'&&(m.bs==='none'||parseFloat(m.bw)===0)&&m.rad==='12px';
    const bad=row.filter(m=>!face(m));
    L.say(fm.length===ms.length&&row.length>0&&bad.length===0,'TC-R237d '+tag+' every row button has the shared face ('+(bad.length?bad.map(m=>m.name+' bg '+m.bg+(m.bi!=='none'?' gradient':'')+' border '+m.bw+' r'+m.rad).join('; '):'all '+row.length)+')',bad);
    const st=fm.filter(m=>inRole(m,roles.step)),nv=fm.filter(m=>inRole(m,roles.nav));
    if(st.length||nv.length||roles.step||roles.nav){
      const want=(roles.step?roles.step.length:0)+(roles.nav?roles.nav.filter(x=>members.some(a=>a.includes(x))).length:0);
      const badA=[...st.filter(m=>!isStep(m)).map(m=>m.name+' (step) draws '+JSON.stringify(m.shapes.map(x=>x.tag+':'+x.stroke+'/'+x.fill))),...nv.filter(m=>!isNav(m)).map(m=>m.name+' (prev/next) draws '+(m.shapes.length?JSON.stringify(m.shapes.map(x=>x.tag+':'+x.stroke+'/'+x.fill)):JSON.stringify(m.text)))];
      L.say(fm.length===ms.length&&(st.length+nv.length)>0&&badA.length===0,'TC-R237e '+tag+' each step arrow is the white chevron and each previous/next the blue triangle ('+(badA.length?badA.join('; '):st.length+' step, '+nv.length+' prev/next')+')',{badA,want});
    }
    L.say(b.errs.length===0,'TC-R237 '+tag+' zero app errors',b.errs.slice(0,3));
    await b.close();}
});
