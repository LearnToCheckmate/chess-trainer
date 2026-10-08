'use strict';
// gates/regress/74-lesson-card-hit-area.js   TC-R60 (US-R50): a MODAL's own controls own their own centres.
//
// ARRIVED AT #497 for jobs/the-lesson-cta-centre-hit-tests-to-the-lesson-footer-and-a-tap-closes-the-lesson-at-
// 568-tall-2026-10-04 (band 16, P0). The job asked for exactly this and said so in its `case` field: "The case
// must assert, at every geometry, that EVERY interactive element's own centre hit-tests to itself with no
// scrolling, and must include a real tap that proves the consequence."
//
// ── WHAT THE DEFECT IS ────────────────────────────────────────────────────────────────────────────────────
// The lesson intro card (chess.jsx, search `introCard`) is a `position:fixed; inset:0` modal with a dim
// backdrop whose own onClick dismisses it. It carried zIndex 120. The lesson footer (search `lessonFocus`,
// the fixed bar) carries zIndex 471. So the footer painted OVER the modal and won the hit test on whatever
// part of the card reached its band. Measured on the shipped #496 bundle 01387f706cea at 320x568:
//     Four Knights Game   CTA 487.89..531.89, footer top 507, centre hits the footer bar, 75% hits "Forward a move"
//     Queen's Gambit      CTA 495.56..539.56, 25% already hits the bar, centre hits "Forward a move"
//     King's Gambit       CTA 506.41..550.41, 25% hits "Forward a move"
// A real tap at the CTA's own centre LEFT THE CARD UP - it went to the footer - and on Queen's Gambit it
// STEPPED THE DEMO. The fix is one integer: the overlay moves to 472, above the footer and below rev-summary's
// 500. Amber record: flags/amber-497-three-modals-sit-below-the-fixed-bottom-bars.
//
// ── IT IS PER-LESSON, AND THAT IS THE WHOLE REASON NOTHING CAUGHT IT ──────────────────────────────────────
// The overlay is alignItems:'center', so the CTA's y is a function of the CARD's height, which is a function
// of the LESSON's own content: the idea block is capped at 40vh, the plans block at 26vh, and the Related-
// lessons row is present for some lessons only. LESSON ROW 0, THE ITALIAN GAME, IS NOT AFFECTED - its CTA sits
// at 466.20..510.20 and owns its centre on the broken bundle. Every measurement anyone took on the first
// lesson therefore read clean, including this job's own re-check and this build's first probe. Driven over
// every lesson row of Openings and Gambits at 320x568 on the broken bundle: 29 of 128 cards had at least one
// of their three sample points land off the CTA. So a gate that opens ONE lesson is a coin flip, and this one
// drives a NAMED set that includes the worst.
//
// ── WHY NO EXISTING GATE COULD SEE IT, MEASURED RATHER THAN ASSUMED, AND BOTH HALVES MATTER ───────────────
// (a) gates/drive/lesson.js's `intro` state could not hold the card. Its hold-tap walked UP from the CTA to
//     the first fixed-or-absolute ancestor and clicked THAT rect at top+14. The walk stops on the OVERLAY, not
//     on the card panel, and the overlay's own onClick is setIntroCard(false) - so the tap that was meant to
//     HOLD the card DISMISSED it. Measured: the CTA was absent at all five geometries after D.states['intro'].
//     THE DRIVER IS NOT CHANGED IN THIS BUILD AND THAT IS DELIBERATE. Ten gates call D.states, so repairing the
//     shared hold-tap is a wide change that would need the suite to clear it on its own merits; this build spent
//     its diff on the one integer that is the player-facing defect. Instead THIS GATE CARRIES ITS OWN CORRECT
//     HOLD (openHeld below clicks the PANEL, the child of the fixed overlay), and A1 is its control: the card
//     must still be up 4600ms later, past the 4000ms auto-dismiss. The driver repair is one line and is filed
//     as jobs/the-lesson-drivers-intro-state-dismisses-the-card-it-means-to-hold-2026-10-08 with the measurement
//     and the fix, so the next run can land it with the suite behind it.
// (b) gates/regress/48-lesson-flow.js's laidOut() filters out every button with a position:fixed ANCESTOR, so
//     even in a run that reached the state the CTA was excluded from TC-LS-008 - the assertion written for
//     exactly this property. The exclusion is correct for its own purpose (it stops the footer's five buttons
//     being compared against the footer) and it over-excludes. That is CLAUDE.md's recurring trap in its
//     eleventh costume: the guard written to handle fixed elements excused the real defect in a fixed element.
//     48 IS NOT CHANGED HERE. Widening its filter would make it report the #393 false positives this gate is
//     built to avoid; see the scoping note below.
//
// ── THE SCOPING, WHICH IS THE ONLY DIFFICULT PART OF THIS GATE ────────────────────────────────────────────
// A naive "does every button own its centre" sweep is WORTHLESS and this build measured why before writing a
// line of it: run over all seven lesson states at six geometries on main, it returns 12 of 42 states red, and
// ELEVEN of the twelve reds are the lesson's own action-row buttons sitting BEHIND the intro card or behind the
// ... sheet. That is a modal working correctly, and it is #393's trap verbatim - "a naive hit test reports SIX
// SCREENS of false defects, because every button on every screen underneath fails it". #393 tried three
// versions and shipped none of them.
// SO THIS GATE ASSERTS THE PROPERTY ONLY OVER THE TOPMOST MODAL LAYER. The live layer is defined mechanically:
// the full-viewport fixed overlays on screen are collected, the one with the highest effective z-index is the
// live modal, and the assertion runs over ITS OWN DESCENDANTS and nothing else. Everything behind it is
// deliberately unreachable and is not asserted over. When no modal is up, the live layer is the document and
// the fixed bars are part of it, so the footer's own five buttons are in scope and own their centres - which is
// what gate 48 already covers and what this gate's E block re-checks from the other direction.
// AND THE EXCLUSION IS PINNED TO ITS MECHANISM, not to a count [#416's rule about #35's exclusion]: a button is
// skipped only when a STRICTLY HIGHER full-viewport fixed overlay exists that does not contain it. B2 asserts
// the denominator is non-empty in its own L.say, and B3 asserts the assertion is CAPABLE OF FAILING.
//
// ── CONTROL (every assertion below was run both ways) ─────────────────────────────────────────────────────
// CT_APP=<origin/main's own app.js, md5 01387f706cea>  ->  B1 RED. That is the ideal control: free, and the
// actual broken build. On it, A3 is red too (the mechanism), B3 stays GREEN (the cards still reach the bar,
// which is what makes B1 able to fail), and C1 is red on the lessons whose centre is lost.
// Published with the command, per #411: `CT_APP=gates/.trial/mainbundle.js node gates/regress/74-lesson-card-hit-area.js`
//
'use strict';
const L=require('../lib');

const GEOS=(process.env.CT_74_GEOS||'se,short375,kunal730').split(',');
// geometries at which no measured card reached the fixed bar, so B1 could not have failed there
const VACUOUS=[];
// NAMED, not positional: an index is meaningless if a lesson is added, and asserting the name is how this gate
// says "the state I measured is the state I meant" [#385: assert S was actually reached].
const LESSONS=[
  {group:'Openings',row:0, name:/^Italian Game$/,      note:'the control case: this card is SHORT and owns its centre even on the broken bundle'},
  {group:'Openings',row:4, name:/^Four Knights Game$/, note:'measured 487.89..531.89 at 320x568 on #496, centre on the footer bar'},
  {group:'Openings',row:20,name:/^Queen.s Gambit$/,    note:'measured 495.56..539.56 at 320x568 on #496, centre on "Forward a move"'},
  {group:'Gambits', row:0, name:/^King.s Gambit$/,     note:'measured 506.41..550.41 at 320x568 on #496, 25% already on "Forward a move"'},
];

// ---- the live modal layer, and every interactive element inside it ----------------------------------------
const layer=(b)=>b.page.evaluate(()=>{
  const r2=n=>Math.round(n*100)/100;
  const nm=e=>e?((e.innerText||'').replace(/\s+/g,' ').trim()||e.getAttribute('aria-label')||e.tagName):'(null)';
  const zOf=e=>{const z=getComputedStyle(e).zIndex;const n=parseInt(z,10);return isNaN(n)?0:n;};
  // full-viewport fixed overlays: the modal candidates
  const overlays=[...document.querySelectorAll('div')].filter(d=>{
    const s=getComputedStyle(d);if(s.position!=='fixed')return false;
    const r=d.getBoundingClientRect();
    return r.width>=innerWidth-1&&r.height>=innerHeight-1&&r.left<=1&&r.top<=1;});
  let top=null;for(const o of overlays){if(!top||zOf(o)>=zOf(top))top=o;}
  // the fixed bottom bars, for the diagnostics and for E
  const bars=[...document.querySelectorAll('div')].filter(d=>{const s=getComputedStyle(d);const r=d.getBoundingClientRect();
      return s.position==='fixed'&&r.width>=innerWidth-1&&r.bottom>=innerHeight-1&&r.height>1&&r.height<innerHeight*0.4;})
    .map(d=>({z:zOf(d),top:r2(d.getBoundingClientRect().top),h:r2(d.getBoundingClientRect().height),txt:nm(d).slice(0,34)}));
  const scope=top||document.body;
  const els=[...scope.querySelectorAll('button,[role=button],a')].filter(x=>{
    const r=x.getBoundingClientRect();return r.width>=2&&r.height>=2&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;});
  const sample=(x)=>{
    const r=x.getBoundingClientRect();const cx=r.left+r.width/2;
    const pt=(fy)=>{const cy=r.top+r.height*fy;
      if(cx<0||cx>=innerWidth||cy<0||cy>=innerHeight)return {own:false,what:'(outside the viewport)'};
      const e=document.elementFromPoint(cx,cy);return {own:!!(e&&(e===x||x.contains(e))),what:nm(e).slice(0,34)};};
    return {t:nm(x).slice(0,30),rect:[r2(r.left),r2(r.top),r2(r.width),r2(r.height)],bottom:r2(r.bottom),
            p25:pt(.25),p50:pt(.5),p75:pt(.75)};};
  return {modalZ:top?zOf(top):null,hasModal:!!top,overlayCount:overlays.length,bars,
          els:els.map(sample),vw:innerWidth,vh:innerHeight};
});
const cta=(b)=>b.page.evaluate(()=>{const c=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));
  if(!c)return null;const r=c.getBoundingClientRect();
  return {x:r.left+r.width/2,y:r.top+r.height/2,top:Math.round(r.top*100)/100,bottom:Math.round(r.bottom*100)/100};});
const cardUp=(b)=>b.page.evaluate(()=>[...document.querySelectorAll('button')].some(x=>/^Got it/.test((x.innerText||'').trim())));
const inLesson=(b)=>b.page.evaluate(()=>!!document.querySelector('[data-ct="lesson-note"]'));
const rowName=(b,i)=>b.page.evaluate((i)=>{const bs=[...document.querySelectorAll('button')].filter(x=>/[♔♚]/.test((x.innerText||'').slice(0,3))&&x.getBoundingClientRect().width>200);
  const el=bs[i];if(!el)return null;const n=el.querySelector('span[style*="block"]');return ((n||el).innerText||'').split('\n')[0].trim();},i);

// open a lesson row and HOLD the intro card by clicking its PANEL - not the overlay, whose onClick dismisses it
async function openHeld(b,group,i){
  await b.home();await b.tile('Discover');await b.settle(400);
  await b.tapText(new RegExp('^'+group+'$'),{wait:500});
  await b.page.evaluate(()=>window.scrollTo(0,0));await b.settle(150);
  const nm=await rowName(b,i);
  const h=await b.page.evaluateHandle((i)=>{const bs=[...document.querySelectorAll('button')].filter(x=>/[♔♚]/.test((x.innerText||'').slice(0,3))&&x.getBoundingClientRect().width>200);
    const el=bs[i];if(el)el.scrollIntoView({block:'center'});return el||null;},i);
  const el=h.asElement();if(!el)return {name:nm,ok:false,why:'no row '+i};
  const box=await el.boundingBox();if(!box)return {name:nm,ok:false,why:'row '+i+' has no box'};
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(360);
  const panel=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));if(!g)return null;
    let q=g;while(q&&q.parentElement&&getComputedStyle(q.parentElement).position!=='fixed')q=q.parentElement;
    const r=q.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+10};});
  if(!panel)return {name:nm,ok:false,why:'no intro card'};
  await b.page.mouse.click(panel.x,panel.y);await b.page.waitForTimeout(140);
  return {name:nm,ok:true};
}

(async()=>{
for(const geo of GEOS){
  // ── A: INSTRUMENT VALIDATION. Assert the state was reached and the mechanism is as claimed, BEFORE B. ───
  {
    const b=await L.launch({geo,name:'74A-'+geo});await b.open();
    L.note(geo+': bundle stamp in the page = '+(await b.stamp()));
    const o=await openHeld(b,'Openings',4);
    L.say(o.ok,'74 A1a ['+geo+'] the intro card opens on a named lesson row ('+o.name+')',o);
    // A1 IS THE PERMANENT CONTROL ON THE DRIVER REPAIR: the auto-dismiss is 4000ms, so a card still up at
    // 4600ms proves the hold-tap landed on the PANEL. Before this build it landed on the overlay and dismissed.
    await b.page.waitForTimeout(4600);
    const up=await cardUp(b);
    L.say(up,'74 A1 ['+geo+'] the card is STILL UP 4600ms after the hold-tap, so the hold landed on the PANEL and not on the backdrop (the 4000ms auto-dismiss did not fire). This is why this gate does not use D.states[\'intro\'], whose hold-tap lands on the overlay and dismisses the card it means to hold - measured absent at all five geometries',{cardUp:up});
    const ly=await layer(b);
    L.say(ly.bars.length>=1,'74 A2 ['+geo+'] a fixed bottom bar IS on screen, so there is something that could cover the card - without this the whole gate is vacuous',ly.bars);
    const foot=ly.bars.filter(x=>x.z===471)[0]||null;
    L.say(!!foot,'74 A2b ['+geo+'] and one of them is the lesson footer at zIndex 471',ly.bars);
    // A3 ASSERTS THE MECHANISM IN THE BUNDLE UNDER TEST, not only the symptom [#377: assert the thing itself].
    L.say(ly.hasModal&&ly.modalZ!==null&&foot&&ly.modalZ>foot.z,
      '74 A3 ['+geo+'] THE MECHANISM: the intro card\'s own overlay z-index ('+ly.modalZ+') is ABOVE the lesson footer\'s ('+(foot&&foot.z)+'). This is the one integer the defect was. It read 120 against 471 on #496',{modalZ:ly.modalZ,footZ:foot&&foot.z});
    await b.shot('74-'+geo+'-intro-card');
    await b.close();
  }
  // ── B and C: the headline over a RANGE of lessons, and the consequence by a real tap ────────────────────
  let measured=0,lost=0,reachingTheBar=0;const lostDetail=[];
  for(const ls of LESSONS){
    const b=await L.launch({geo,name:'74B-'+geo+'-'+ls.group+ls.row});await b.open();
    const o=await openHeld(b,ls.group,ls.row);
    if(!o.ok){L.say(false,'74 B0 ['+geo+'] could not reach '+ls.group+' row '+ls.row+' - a state this gate asserts over must be reachable, so this is a RED and not a skip',o);await b.close();continue;}
    L.say(ls.name.test(o.name||''),'74 B0b ['+geo+'] '+ls.group+' row '+ls.row+' is still '+ls.name+' ('+o.name+') - if the lesson list is reordered this gate must say so rather than silently measure another card',{got:o.name});
    await b.page.waitForTimeout(4600);
    if(!(await cardUp(b))){L.say(false,'74 B0c ['+geo+'] the card did not survive to be measured on '+o.name,{});await b.close();continue;}
    const ly=await layer(b);
    const c=await cta(b);
    const foot=ly.bars.filter(x=>x.z===471)[0]||null;
    measured++;
    if(c&&foot&&c.bottom>foot.top)reachingTheBar++;
    const bad=ly.els.filter(x=>!(x.p25.own&&x.p50.own&&x.p75.own));
    if(bad.length){lost+=bad.length;lostDetail.push(geo+'/'+o.name+': '+bad.map(x=>x.t+'@'+JSON.stringify(x.rect)+'->'+x.p50.what).join(' ; '));}
    L.say(bad.length===0,
      '74 B1 ['+geo+'] '+o.name+': every control in the LIVE MODAL LAYER owns its own centre, and its 25% and 75% points too ('+ly.els.length+' controls in the layer, modal z '+ly.modalZ+')',
      bad.length?bad:{controls:ly.els.length,ctaBottom:c&&c.bottom,footTop:foot&&foot.top});
    // C: THE CONSEQUENCE, BY A REAL TAP. On the broken bundle the tap went to the footer and the card STAYED UP.
    if(c){
      const wasIn=await inLesson(b);
      await b.page.mouse.click(c.x,c.y);await b.settle(900);
      const stillCard=await cardUp(b), stillIn=await inLesson(b);
      L.say(wasIn&&!stillCard&&stillIn,
        '74 C1 ['+geo+'] '+o.name+': a REAL TAP at the CTA\'s own centre dismisses the card and leaves the player in the lesson. On #496 this tap reached the footer instead and the card STAYED UP',
        {inLessonBefore:wasIn,cardUpAfter:stillCard,inLessonAfter:stillIn});
    }
    await b.close();
  }
  // B2: THE DENOMINATOR, AS ITS OWN ASSERTION. every()/!test() are both TRUE over nothing, so an empty input
  // set would make B1 report PASS loudest exactly when the state had disappeared. Never a conjunct.
  L.say(measured===LESSONS.length,'74 B2 ['+geo+'] THE DENOMINATOR: all '+LESSONS.length+' named lesson cards were actually measured ('+measured+')',{measured,want:LESSONS.length});
  // B3: AND THE ASSERTION MUST BE CAPABLE OF FAILING. If no card reaches the bar's band, B1 cannot fail at this
  // geometry and its green says nothing about the defect. THIS IS REPORTED AND NEVER CREDITED, and it is
  // deliberately a NOTE per geometry rather than a per-geometry FAIL: at 375x730 - Kunal's own phone - NO lesson
  // card reaches the footer (the tallest of the four ends at 627.22 against a footer top of 669), so a red there
  // would be a permanent red on a correct tree, which is how a guard gets switched off. The hard anti-vacuity
  // assertion is B3G below, over the whole run. This is the empty-denominator rule: "make it a red, or an
  // explicit note that says it did not run, and never a PASS".
  if(reachingTheBar>=1){
    L.say(true,'74 B3 ['+geo+'] ANTI-VACUITY: '+reachingTheBar+' of '+measured+' measured cards have their CTA reaching INTO the fixed bar\'s band, so B1 is capable of failing at this geometry',{reachingTheBar,measured});
  }else{
    VACUOUS.push(geo);
    L.note('74 B3 ['+geo+'] NOT EXERCISED HERE, reported rather than credited: 0 of '+measured+' measured cards reach the fixed bar\'s band at this geometry, so B1\'s green above is a POSITIVE CONTROL (nothing collides) and NOT evidence about the defect. This is expected at 375x730 and 375x679: the defect is a SHORT-SCREEN one and the job that raised it says so. No PASS is emitted for B3 at this geometry.');
  }
  L.say(lost===0,'74 B4 ['+geo+'] LOST-CONTROL COUNT over the whole named set is ZERO ('+lost+')',lostDetail.length?lostDetail:'none');
}
// B3G: THE ONE HARD ANTI-VACUITY ASSERTION, over the whole run rather than per geometry. At least one geometry
// in the list must put a card into the bar's band, or B1 and C1 are decoration everywhere and the gate cannot
// fail at all - which is exactly the shape this suite has shipped before (#395's closed flag, #391's predicate).
// It is a GLOBAL check so that adding a tall-screen geometry can never silently disarm the gate.
L.say(VACUOUS.length<GEOS.length,
  '74 B3G ANTI-VACUITY, THE HARD ONE: at least one of the '+GEOS.length+' geometries exercises the defect - i.e. has a card whose CTA reaches the fixed bar - so B1 and C1 are capable of failing somewhere in this run. Geometries that did NOT exercise it: '+(VACUOUS.join(',')||'none'),
  {geometries:GEOS,notExercised:VACUOUS});

// ── E: THE OTHER DIRECTION. With NO modal up, the fixed bars are part of the live layer and their own
//    buttons must own their centres. This is what stops the fix being "raise everything until nothing collides":
//    if the card's overlay were raised so far that it swallowed the bars permanently, E would still pass, but a
//    bar that cannot be used in the ordinary demo state would fail here.
{
  const b=await L.launch({geo:'se',name:'74E'});await b.open();
  const D=require('../drive/lesson');
  await D.states['demo-m0'](b);
  const ly=await layer(b);
  L.say(!ly.hasModal,'74 E0 [se] in the plain demo state no full-viewport modal is up, so the live layer is the document and the fixed bars are in scope',{overlays:ly.overlayCount,modalZ:ly.modalZ});
  const bad=ly.els.filter(x=>!x.p50.own);
  L.say(ly.els.length>0,'74 E1 [se] THE DENOMINATOR: the demo state offers controls to measure ('+ly.els.length+')',{n:ly.els.length});
  L.say(bad.length===0,'74 E2 [se] and every one of them owns its own centre, the lesson footer\'s five included',bad.length?bad.map(x=>x.t+'->'+x.p50.what):'all '+ly.els.length);
  await b.close();
}
L.done();
})().catch(e=>{console.error('74 THREW',e);process.exit(1);});
