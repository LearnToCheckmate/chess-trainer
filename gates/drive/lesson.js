// gates/drive/lesson.js - drives the Lesson screen (Discover -> a group list -> a lesson: intro card, demo,
// practice, wrong move, Complete!, the sheets) on the bundle under test. Every state function takes a
// launched+opened `b` from gates/lib.js and puts the app into that state from wherever it is (each one starts at
// Home and composes the previous states), so the regression suite can call any state on its own.
//
//   const D=require('./drive/lesson');  await D.states['practice-wrong'](b);  const m=await b.metrics();
//
// HOW THE SCREEN IS DRIVEN: Home -> Discover tile -> a group tile (Openings / Gambits / Endgames / Tactics) -> a
// list of lesson rows (buttons with a ♔/♚ badge) -> the row opens the lesson with the intro card up (it auto-
// dismisses after 4 s unless the card is touched, so 'intro' touches it). 'Got it — play ▶' starts the demo,
// which AUTOPLAYS a ply every ~2 s: every demo state pauses it at once (the ⏸ in the fixed bottom bar, aria-label
// "Play or pause") and then steps with "Back a move" / "Forward a move" (aria-labels), so the ply is exact.
// The demo ply is read back from the note box (data-ct lesson-note: "▶ Press Play to watch" = 0, "N. san" = 2N-1,
// "N… san" = 2N). Practice moves are piece-tap then target-tap; the app answers for the other side after 420 ms.
// The first opening row is the Italian Game (LIB 0: e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6), the first gambit row the
// King's Gambit, the first endgame row King & Queen Mate (a FEN lesson); the from/to squares of any lesson's line
// can be learned from the demo's last-move highlights (lineSquares) so Complete! is reachable generically.
// TRAP: the intro card's 'Related lessons' chips sit right above 'Got it' - a tap there opens the related lesson
// (Italian Game -> Fried Liver Attack); the hold-tap goes on the card's title.
//
// STATES:
//   discover              the Discover screen (four group tiles)
//   openings-list         Discover -> 🚀 Openings: the list at its top
//   openings-list-end     ... scrolled to its bottom
//   intro                 the first opening lesson (Italian Game) with its intro card held open
//   demo-m0               'Got it' tapped, the demo paused and rewound to ply 0
//   demo-m1               ... Forward a move once (1.e4)
//   demo-m4               ... three more (2...Nc6)
//   demo-end              ... Forward to the end of the line (the play button reads ↻)
//   demo-end-lines        '♟ Other lines (n)' / 'Other lines' tapped at the demo end: the ⋯ sheet
//   demo-more             the bottom bar's ⋯ tapped at the demo end (the same sheet)
//   demo-copy             📋 Copy moves tapped at the demo end
//   demo-analyze          🔍 Analyze tapped at the demo end (leaves the lesson for the analysis board)
//   practice-m0           '✋ Now I'll try it' from the demo end: practice before the first move
//   practice-correct      ... 1.e4 played (correct) and Black's reply
//   practice-wrong        practice from move 0, 1.d4 played (NOT the book move)
//   practice-wrong-hintoff  💡 off, then 1.d4 (the other wording of the miss)
//   practice-complete     the whole line played (learned from the demo): 'Complete!'
//   practice-more         the practice row's ⋯ ("More actions") sheet
//   practice-bottom-more  the bottom bar's ⋯ ("More for this lesson") sheet in practice
//   practice-tryagain     the Try-again button after a wrong move (practice back at move 0). Matched by its
//                         ACCESSIBLE NAME: the visible label is '↻ Try again', '↻ Again' or '↻' depending on
//                         the row's width, and only aria-label='Try again' is the same at every geometry [#544]
//   close                 ✕ from practice: back to the Openings list
//   gambits-list          Discover -> ⚔️ Gambits
//   gambit-demo-end       the first gambit row (King's Gambit) at the demo end
//   gambit-practice-m0    ... practice before the first move
//   gambit-practice-correct  ... 1.e4 and the reply
//   endgames-list         Discover -> 👑 Endgames
//   endgame-demo-end      the first endgame row (King & Queen Mate) at the demo end
//   endgame-practice-m0   ... practice before the first move
//   endgame-practice-complete ... the line played through (checkmate)
//   tactics               Discover -> 💡 Tactics
//   longnote              Endgames -> Back-Rank Mate, demo at ply 1 (the longest 1-ply note: 238 characters)
//   k11-demo-end / k11-practice   the gallery cards 3 and 4 (the reference numbers)
'use strict';

const NOTE='[data-ct="lesson-note"]';
// tap the smallest visible BUTTON whose innerText or aria-label matches (the bottom bar's chevrons have no text)
async function tapBtn(b,re,wait){
  const h=await b.page.evaluateHandle((src)=>{const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;for(const el of document.querySelectorAll('button')){const t=(el.innerText||'').replace(/\s+/g,' ').trim();const a2=el.getAttribute('aria-label')||'';if(!re.test(t)&&!re.test(a2))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best=el;}}if(best)best.scrollIntoView({block:'center',inline:'center'});return best;},[re.source,re.flags]);
  const el=h.asElement();if(!el)throw new Error('tapBtn: no button matches '+re);
  await b.page.waitForTimeout(120);const box=await el.boundingBox();
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?400:wait);return box;
}
async function hasBtn(b,re){return b.page.evaluate((src)=>{const re=new RegExp(src[0],src[1]);return [...document.querySelectorAll('button')].some(el=>{const r=el.getBoundingClientRect();return r.width>1&&(re.test((el.innerText||'').replace(/\s+/g,' ').trim())||re.test(el.getAttribute('aria-label')||''));});},[re.source,re.flags]);}
async function noteText(b){return b.text(NOTE);}
async function demoPly(b){const t=(await noteText(b))||'';if(/Press Play/.test(t))return 0;const m=t.match(/^(\d+)(\.|…)\s/);if(!m)return -1;return m[2]==='.'?2*(+m[1])-1:2*(+m[1]);}
async function playBtnLabel(b){return b.page.evaluate(()=>{const e=document.querySelector('button[aria-label="Play or pause"]');return e?(e.innerText||'').trim():null;});}
// every button on screen: text/aria-label and rect
async function btnRects(b){return b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight;}).map(x=>{const r=x.getBoundingClientRect();return {t:((x.innerText||'').replace(/\s+/g,' ').trim()||x.getAttribute('aria-label')||'').slice(0,30),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};}));}
// rect of the smallest element whose text matches (any element)
async function textRect(b,re){return b.page.evaluate((src)=>{const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;for(const el of document.querySelectorAll('button,[role=button],a,div,span,label')){const t=(el.innerText||'').trim();if(!re.test(t))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best={x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,text:t.slice(0,60),tag:el.tagName,sw:el.scrollWidth,cw:el.clientWidth};}}return best;},[re.source,re.flags]);}
// every scrolling box on screen: scrollHeight vs clientHeight
async function scrollers(b){return b.page.evaluate(()=>{const r=[];for(const el of document.querySelectorAll('div')){const st=getComputedStyle(el);if((st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1){const rc=el.getBoundingClientRect();r.push({top:Math.round(rc.top),h:Math.round(rc.height),sh:el.scrollHeight,ch:el.clientHeight,pos:st.position,scrollTop:Math.round(el.scrollTop)});}}return r;});}
async function inLesson(b){return b.page.evaluate(()=>!!document.querySelector('[data-ct="lesson-note"]'));}
async function closeSheet(b){await b.page.mouse.click(8,8);await b.page.waitForTimeout(300);}

// ---- navigation ----
async function discover(b){await b.home();await b.tile('Discover');await b.settle(400);}
const GROUP_RE={Openings:/^Openings$/,Gambits:/^Gambits$/,Endgames:/^Endgames$/,Tactics:/^Tactics$/};
async function group(b,name){await discover(b);await b.tapText(GROUP_RE[name],{wait:500});await b.page.evaluate(()=>window.scrollTo(0,0));await b.settle(150);}
// the lesson rows of the open list: buttons with the ♔/♚ side badge
async function rows(b){return b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>/[♔♚]/.test((x.innerText||'').slice(0,3))&&x.getBoundingClientRect().width>200).map(x=>{const r=x.getBoundingClientRect();const name=x.querySelector('span[style*="block"]');const idea=name&&name.nextElementSibling;return {name:(name?name.innerText:x.innerText).split('\n')[0].trim(),y:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width),nameSW:name?name.scrollWidth:0,nameCW:name?name.clientWidth:0,ideaSW:idea?idea.scrollWidth:0,ideaCW:idea?idea.clientWidth:0};}));}
// open a lesson row by name (RegExp) or index in the open list; leaves the intro card up and HELD (touched)
async function openRow(b,which){
  const h=await b.page.evaluateHandle((src)=>{const bs=[...document.querySelectorAll('button')].filter(x=>/[♔♚]/.test((x.innerText||'').slice(0,3))&&x.getBoundingClientRect().width>200);let el=null;if(typeof src==='number')el=bs[src];else{const re=new RegExp(src[0],src[1]);el=bs.find(x=>re.test(((x.querySelector('span[style*="block"]')||x).innerText||'').split('\n')[0].trim()));}if(el)el.scrollIntoView({block:'center'});return el||null;},which instanceof RegExp?[which.source,which.flags]:which);
  const el=h.asElement();if(!el)throw new Error('openRow: no lesson row '+which);
  await b.page.waitForTimeout(150);const box=await el.boundingBox();await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await b.page.waitForTimeout(350);
  // ── HOLD THE INTRO CARD. THIS TAP USED TO DISMISS IT, AND EVERY GATE THAT COMPOSES FROM `intro` MEASURED A
  // SCREEN THAT WAS NOT ON THE SCREEN [#544 item (30); jobs/the-lesson-drivers-intro-state-dismisses-the-card-
  // it-means-to-hold-2026-10-08, P1, found at #497 while measuring the band-16 CTA P0].
  // WHAT WAS HERE: a walk UP from the 'Got it' button to the first fixed-or-absolute ancestor, clicking THAT
  // rect at top+14. The loop ADVANCED p before testing it, so it exited on the OVERLAY (the introCard div,
  // position:fixed inset:0) and never on the card panel inside it. The overlay's rect is the whole viewport, so
  // the tap landed at (vw/2, 14) - in the overlay's own padding, ON THE BACKDROP - and the overlay's onClick is
  // setIntroCard(false). THE TAP WRITTEN TO HOLD THE CARD DISMISSED IT.
  // MEASURED IN BOTH DIRECTIONS IN THIS CONTAINER, same probe, same bundle, one launch per arm, 375x730 and
  // 320x568: with the old walk the card is UP before the tap and GONE immediately after it, at both geometries
  // (panel-less overlay rect top 0, tap y 14). With the walk below it is still up immediately AND still up
  // 4600ms later, past the 4000ms auto-dismiss, at both. That is also #497's five-geometry reading reproduced.
  // THE CLAMP IS NOT FUSSINESS AND IT IS CARRIED FROM GATE 74's OWN MEASUREMENT, which is the one gate that had
  // to grow a correct hold of its own while this driver stayed broken: Petroff's panel top is -33.27 at
  // 320x568, so an unclamped click at panelTop+10 lands OFF the screen, the hold never registers and the card
  // is gone before anything can be measured. This driver opens an arbitrary row by name, so it meets that case.
  // (NOT 'Got it' minus 30px: that is the Related-lessons chip row, and a chip opens ANOTHER lesson - found 2026-09-13)
  const card=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));if(!g)return null;
    let q=g;while(q&&q.parentElement&&getComputedStyle(q.parentElement).position!=='fixed')q=q.parentElement;
    const r=q.getBoundingClientRect();const y=Math.min(Math.max(r.top+10,6),innerHeight-6);
    return {x:r.left+r.width/2,y,panelTop:Math.round(r.top*100)/100,clamped:(r.top+10)!==y};});
  // AND THE HOLD IS VERIFIED RATHER THAN ASSUMED, which is the second half of the job's theFIX. A driver that
  // returns a state it did not reach is this project's `fixture-lies` mode: the old code returned normally with
  // the card dismissed, so a consumer could not tell. Now a failed hold THROWS, which every consumer already
  // handles - gate 71:186 wraps this call in try/catch and reds its own B1a ARRIVAL assertion on it - so a
  // regression in the hold is a loud red and never a silent change of state.
  if(card){
    await b.page.mouse.click(card.x,card.y);await b.page.waitForTimeout(120);
    const still=await b.page.evaluate(()=>!![...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim())));
    if(!still)throw new Error('openRow: the hold-tap DISMISSED the intro card instead of holding it (panelTop '+card.panelTop+', tap '+Math.round(card.x)+','+Math.round(card.y)+', clamped '+card.clamped+'). This is the #544 item (30) defect returning: the tap must land on the card PANEL, the child of the fixed overlay, and not on the overlay itself.');
    return {held:true,panelTop:card.panelTop,holdClamped:card.clamped};
  }
  // NO CARD AT ALL is a different thing from a dismissed one and is reported as itself rather than as a hold:
  // nothing was tapped, so nothing can have been dismissed, and a lesson that shows no intro card is a state a
  // caller may legitimately be in.
  return {held:false,noCard:true};
}
async function openLesson(b,grp,which){await group(b,grp);await openRow(b,which);}
// 'Got it', pause the autoplay at once, rewind to ply 0
async function startDemoPaused(b){
  if(await hasBtn(b,/^Got it/))await tapBtn(b,/^Got it/,60);
  await tapBtn(b,/^Play or pause$/,150);
  for(let i=0;i<40;i++){const p=await demoPly(b);if(p<=0)break;await tapBtn(b,/^Back a move$/,90);}
  await b.settle(200);
}
async function fwd(b,n){for(let i=0;i<n;i++)await tapBtn(b,/^Forward a move$/,140);await b.settle(200);}
async function toEnd(b){for(let i=0;i<60;i++){if((await playBtnLabel(b))==='↻')break;await tapBtn(b,/^Forward a move$/,120);}await b.settle(250);}
// from/to squares of every ply, learned from the demo's last-move highlight (the two squares whose background is
// neither of the two dominant colours; the one holding a piece is the target). Leaves the demo at its end.
async function lineSquares(b){
  await startDemoPaused(b);const out=[];
  for(let i=0;i<60;i++){if((await playBtnLabel(b))==='↻')break;await tapBtn(b,/^Forward a move$/,140);
    const mv=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return null;const kids=[...g.children].slice(0,64);const cols={};const bg=kids.map(k=>getComputedStyle(k).backgroundColor);bg.forEach(c=>cols[c]=(cols[c]||0)+1);const top2=Object.entries(cols).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);const odd=kids.map((k,i)=>({i,c:bg[i],piece:!!k.querySelector('svg,img')||/[♔♕♖♗♘♙♚♛♜♝♞♟]/.test(k.innerText||'')})).filter(x=>!top2.includes(x.c));const bl=kids[56]?(kids[56].innerText||''):'';const br=kids[63]?(kids[63].innerText||''):'';const flip=/h/.test(bl)&&!/a/.test(bl)?true:(/a/.test(br)&&!/h/.test(br)?true:false);const nm=(i)=>{const c=i%8,row=Math.floor(i/8);const f=flip?7-c:c,r=flip?row:7-row;return String.fromCharCode(97+f)+(r+1);};return {odd:odd.map(x=>({sq:nm(x.i),piece:x.piece})),flip};});
    out.push(mv);}
  await b.settle(200);return out;
}
// play one practice ply from a learned highlight pair
async function playPair(b,pair){const to=pair.odd.find(x=>x.piece),from=pair.odd.find(x=>!x.piece);if(!to||!from)throw new Error('playPair: no from/to in '+JSON.stringify(pair));await b.move(from.sq,to.sq,700);}
// in practice, play the lesson's own line to the end (my plies only; the app answers the others)
async function playLine(b,pairs,side){
  for(let i=0;i<pairs.length;i++){const mine=(side==='w')?(i%2===0):(i%2===1);if(!mine)continue;await playPair(b,pairs[i]);await b.settle(500);if(/Complete!/.test((await noteText(b))||''))break;}
  await b.settle(600);
}
async function lessonSide(b){return b.page.evaluate(()=>{const e=document.querySelector('[data-ct="lesson-note"]');const t=e?e.innerText:'';const m=t.match(/Your move \((White|Black)\)/);return m?(m[1]==='White'?'w':'b'):null;});}

const S={};
S['discover']=async(b)=>{await discover(b);};
S['openings-list']=async(b)=>{await group(b,'Openings');};
S['openings-list-end']=async(b)=>{await group(b,'Openings');await b.page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await b.settle(300);};
S['intro']=async(b)=>{await openLesson(b,'Openings',0);};
S['demo-m0']=async(b)=>{await S['intro'](b);await startDemoPaused(b);};
S['demo-m1']=async(b)=>{await S['demo-m0'](b);await fwd(b,1);};
S['demo-m4']=async(b)=>{await S['demo-m1'](b);await fwd(b,3);};
S['demo-end']=async(b)=>{await S['demo-m0'](b);await toEnd(b);};
S['demo-end-lines']=async(b)=>{await S['demo-end'](b);await tapBtn(b,/^(?:♟ )?Other lines/,500);};  // #424: the glyph is OPTIONAL here. On a narrow board (boardPx<340) the label is now "Other lines"
// with no pawn and no count - Kunal's Desk answer R2-NARROW-LEVERS - so a selector requiring the glyph
// silently fails to find the button at every narrow geometry, which is the "a bad selector is a reading"
// rule: it would report the sheet as missing rather than the label as changed.
S['demo-more']=async(b)=>{await S['demo-end'](b);await tapBtn(b,/^More for this lesson$/,500);};
/* #430: was tapBtn(b,/Copy moves$/) - a LABEL match, and #430 renamed that label to "Copy", so this state
   threw instead of driving. Tapped by its data-ct now, which survives both the rename and the copyMsg flash
   (the chip renames itself the moment it fires, so a label match loses the element in exactly the state this
   driver creates). Same class as the selector break antagonist A vetoed in gate 48. */
S['demo-copy']=async(b)=>{await S['demo-end'](b);await b.page.click('[data-ct="moves-copy"]');await b.page.waitForTimeout(400);};
S['demo-analyze']=async(b)=>{await S['demo-end'](b);await tapBtn(b,/Analyze$/,900);};
S['practice-m0']=async(b)=>{await S['demo-end'](b);await tapBtn(b,/^✋ Now I'll try it$/,500);};
S['practice-correct']=async(b)=>{await S['practice-m0'](b);await b.move('e2','e4',1200);};
S['practice-wrong']=async(b)=>{await S['practice-m0'](b);await b.move('d2','d4',900);};
S['practice-wrong-hintoff']=async(b)=>{await S['practice-m0'](b);await tapBtn(b,/^Hints$/,300);await b.move('d2','d4',900);};
// #544, item (24); jobs/522-the-lesson-drivers-try-again-selector-is-stale-so-practice-tryagain-throws-on-every-
// bundle-2026-10-14, P2, from #522's own antagonist B at the shipped-surface door.
// THE SELECTOR WAS /^↻ Try again$/ - THE VISIBLE LABEL - AND THE APP HAS THREE OF THEM. chess.jsx:9100 renders
// {rowTiny?'↻':rowNarrow?'↻ Again':'↻ Try again'} with a CONSTANT aria-label="Try again", so the visible text
// depends on how much width the lesson's action row has. MEASURED AT #544 on main's own bundle 049b41dfb6f1,
// five geometries, one launch each, reading every button whose text or aria-label mentions it:
//   320x540          '↻'            72.4px   aria-label 'Try again'   old selector: NO MATCH
//   320x568 (se)     '↻ Again'      98.9px   aria-label 'Try again'   old selector: NO MATCH
//   375x568          '↻ Again'      98.9px   aria-label 'Try again'   old selector: NO MATCH
//   375x679 (kunal)  '↻ Try again'  219px    aria-label 'Try again'   old selector: matches
//   390x844          '↻ Try again'  234px    aria-label 'Try again'   old selector: matches
// ONE CORRECTION TO THE JOB'S OWN READING, offered as a measurement rather than a contradiction [R18]: its
// title says the state "throws on every bundle". It throws at the three SHORT-AND-NARROW geometries and WORKS
// at kunal and 390, because the label tracks the action row's width and the row's width tracks the viewport's
// HEIGHT here - the board is fit to height, so 375x568 and 375x679 render different labels at the same width.
// So the failure is geometry-conditioned, not bundle-conditioned, and it is still a real defect: the two
// geometries this project cares most about at the short end are two of the three that throw.
// THE FIX IS THE ACCESSIBLE NAME, which tapBtn has always been able to match (it tests innerText OR
// aria-label, see its own comment) and which is the one string that is identical at all five geometries.
S['practice-tryagain']=async(b)=>{await S['practice-wrong'](b);await tapBtn(b,/^Try again$/,600);};
S['practice-complete']=async(b)=>{await S['practice-m0'](b);for(const [f,t] of [['e2','e4'],['g1','f3'],['f1','c4'],['c2','c3'],['d2','d3']]){await b.move(f,t,1100);if(/Complete!/.test((await noteText(b))||''))break;}await b.settle(600);};
S['practice-more']=async(b)=>{await S['practice-correct'](b);await tapBtn(b,/^More actions$/,500);};
S['practice-bottom-more']=async(b)=>{await S['practice-correct'](b);await tapBtn(b,/^More for this lesson$/,500);};
S['close']=async(b)=>{await S['practice-correct'](b);await tapBtn(b,/^Close lesson$/,600);};
S['gambits-list']=async(b)=>{await group(b,'Gambits');};
S['gambit-demo-end']=async(b)=>{await openLesson(b,'Gambits',0);await startDemoPaused(b);await toEnd(b);};
S['gambit-practice-m0']=async(b)=>{await S['gambit-demo-end'](b);await tapBtn(b,/^✋ Now I'll try it$/,500);};
S['gambit-practice-correct']=async(b)=>{await S['gambit-practice-m0'](b);await b.move('e2','e4',1200);};
S['endgames-list']=async(b)=>{await group(b,'Endgames');};
S['endgame-demo-end']=async(b)=>{await openLesson(b,'Endgames',0);await startDemoPaused(b);await toEnd(b);};
S['endgame-practice-m0']=async(b)=>{await S['endgame-demo-end'](b);await tapBtn(b,/^✋ Now I'll try it$/,500);};
S['endgame-practice-complete']=async(b)=>{await openLesson(b,'Endgames',0);const pairs=await lineSquares(b);await tapBtn(b,/^✋ Now I'll try it$/,500);const side=(await lessonSide(b))||'w';await playLine(b,pairs,side);};
S['tactics']=async(b)=>{await group(b,'Tactics');};
S['longnote']=async(b)=>{await openLesson(b,'Endgames',/^Back-Rank Mate$/);await startDemoPaused(b);await fwd(b,1);};
S['k11-demo-end']=async(b)=>{await b.card(3,2500);};
S['k11-practice']=async(b)=>{await b.card(4,2500);};

module.exports={states:S,tapBtn,hasBtn,btnRects,textRect,scrollers,rows,noteText,demoPly,playBtnLabel,inLesson,closeSheet,openLesson,openRow,group,startDemoPaused,fwd,toEnd,lineSquares,playLine,lessonSide,NOTE,
  notes:'Discover -> group tile -> lesson row (intro card held by touching it) -> Got it -> pause at once -> Back/Forward a move by aria-label; ply read from the note box; practice moves are piece-tap then target-tap, the app replies after 420 ms; the line squares of any lesson come from the demo highlights (lineSquares).'};
