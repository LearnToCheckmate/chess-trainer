'use strict';
// regress/157-icon-rows-one-size.js   ONE ICON SIZE WITHIN A ROW, JUDGED BY THE PAINTED INK. TC-IR-01..05.
// #550, jobs/lesson-footer-icons-consistent - the remainder its #549 pass left: "the icon sweep of three other rows (Review pbar-top, the
// Puzzles bottom row and its solved row) onto FootBtn glyph sizing, each re-measured with its gate", with the folded-in
// icons-within-one-row-match-the-six-pinned-rows-2026-10-12 ("each get one icon height", drawn size reported) and pz-solved-row-arrow-ink.
// The drill's one row (both drills, gate 123) sits in the same bottom slot and is swept with them.
//
// WHY INK AND NOT THE BOX. Gate 26 pins these rows by the BOX each glyph sits in, and its own notes say the box inverts the finding: the
// puzzle row's chevrons are a 20px box carrying 8x12 of ink. A pixel scan is the measurement a player sees: each button's inside (clear of
// its outline) is screenshotted, each pixel row's background is read from the button's own padding (the buttons carry a vertical gradient
// and an inset shadow), the threshold is derived from the crop's own range (CLAUDE.md, #397: check the polarity, never hard-code it), and
// the ink is split into glyph groups by empty columns. A glyph's SIZE is its larger ink dimension: an arrow is tall, the More dots and the
// eye are wide, and comparing heights alone would call three dots "3px" beside a 14px chevron.
//
// MEASURED ON THE TIP BEFORE THE CHANGE (trial 8e19cb261a48), kunal761 and 320x568 alike:
//   Review Back|More      ← 14x6 beside ⋯ 18x3                     -> Back is the standard corner chevron (10x14), ⋯ at 17 (14.5 wide)
//   puzzle row            chevrons 10x14, 💡 10x14.5, 👁 14x9, ↺ 9x9 -> ↺ at 1.4em (about 14x13)
//   solved puzzle row     chevron 10x14 beside the 4x6 › of Next ›    -> › at 2.3em
//   drill row             💡 14x20.5, 👁 19x12, ↺ 14.6x12.5, ‹ › 4x6    -> ↺ at 1.5em and ‹ › at 3.2em (19px emoji in icon-only buttons)
//
// WHAT IT ASSERTS, per geometry (kunal761, se) and per row:
//   TC-IR-01 PRECONDITION the row is on screen with every member found and every member carries ink (a missing button is red, never a pass)
//   TC-IR-02 the icon glyphs' sizes (larger ink dimension) agree within 2px
//   TC-IR-03 inside a button that carries a glyph AND a word, the glyph's ink centre sits within 2px of the word's (a scaled glyph at
//            lineHeight 0 otherwise drops below the word)
//   TC-IR-04 no member grew: every button is at most 44.5 tall and every glyph's ink stays inside its own button
//   TC-IR-05 the words a finder reads are unchanged: '↺ Reset', 'Next ›', '‹ Prev' (the glyph is scaled, never replaced)
// THE GLYPH SIZE IS NOT THE BOX: gate 26 reads these rows by line box, and the scaled glyphs' boxes grew (Reset 23, Next 38) while their ink
// came into line - its pins moved with this fix and say so. KNOW ITS LIMITS: Review's Back|More at 320x568 was ALREADY within 2px by this
// measure before the change (← 15x6 beside ⋯ 16x4), so that line is green on the control and its fix there is the standard chevron, not a
// size correction; and at 320x568 the Review header's buttons start at y -4 (the 44px buttons overhang a bar squeezed under 44 by the short
// screen) - the ink is on screen (top 11), which is all TC-IR-04 asks, and the overhang is the formatting audit's, recorded, not fixed here.
// THE LESSON ROWS, ADDED BY #550 helper lessons [jobs/lesson-footer-icons-still-differ-6-to-8px-while-gate-157-is-green-2026-11-14]: a
// checker's pixel scan read the lesson footer at 12 to 19 of ink while this gate was green - because this gate never read a lesson row (see
// the note above ROWS.lessondemo). The rows: the demo bar paused (▶), playing (⏸) and at its end (↻), the practice footer (one bar at se
// carrying ⟳ 💡 ↻), the kunal761 practice row (⟳ 💡 '↻ Try again'), and that slot at Complete! ('Next ›') and on a hints-on clean run
// ('✓ Bank it'). Their tolerance is 1px (row.tol), the job's '~1px'; the four older rows keep 2.
// CONTROL: CT_APP=<the tip before the change>.
// CONTROL-RECORD: 01431d7 2026-11-13 total=45 red=7 scope=trial:8e19cb261a48 how=THE SUBJECT REMOVED: the branch tip before the change (Back ←, More at 21/19, ↺ and the arrows unscaled) - TC-IR-02 red on Review at kunal761 (← 14x6 vs ⋯ 18x3), the puzzle row (↺ 9x9), the solved row (› 4x6) and the drill row (‹ › 4x6, ↺ 14x12) at both geometries; se Review green (15 vs 16, see above)
// CONTROL-RECORD: 9bed1b7 2026-11-14 total=99 red=13 scope=trial:9177a64af34a how=#550 helper lessons, THE SUBJECT REMOVED: the branch tip before the lesson glyphs were scaled (one 21px font in the footer, the practice row at 15px) - TC-IR-02 red on all seven lesson rows at kunal761 and six at se (✕ 12x12, ▶ 16x15, ⏸ 8x9, ⋯ 18x4, ⟳ 12x9, ↻ 10x9, › 4x6, ✓ 7x8 beside the chevrons' 15x19); the four older rows green; on beeca0a9f010 99/0
const L=require('../lib');
const R=require('../drive/review');
const PZ=require('../drive/puzzles');
const LS=require('../drive/lesson');
const FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'];const UCIS=['b2b7','c2c7','d2d7'];
const DSTORE={ct_mymistakes:FENS.map((f,i)=>({fen:f,uci:UCIS[i],label:'Blunder',played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',wc:{g:'Blunder',drop:25}})),ct_pool:'3'};

// the ink of one button, split into its ICON and its WORD by their own x-ranges in the layout (a Range per token, an svg's box): the
// horizontal extent of a token is reliable where its vertical one is not (a glyph scaled at lineHeight 0 has a line box unrelated to
// its ink), and splitting by empty columns is not (the three More dots are three groups; "💡 Hint" can merge into one).
async function inkOf(b,handle){
  const lay=await handle.evaluate(e=>{const q=e.getBoundingClientRect();const toks=[];
    const svg=e.querySelector('svg');if(svg){const r=svg.getBoundingClientRect();toks.push({kind:'icon',t:'svg',l:r.left,r:r.right});}
    const tw=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let tn;
    while((tn=tw.nextNode())){const s=tn.nodeValue;const re=/\S+/g;let m;
      while((m=re.exec(s))){const rg=document.createRange();rg.setStart(tn,m.index);rg.setEnd(tn,m.index+m[0].length);const r=rg.getBoundingClientRect();
        toks.push({kind:/[A-Za-z]/.test(m[0])?'word':'icon',t:m[0],l:r.left,r:r.right});}}
    return {box:{x:q.left,y:q.top,w:q.width,h:q.height},toks};});
  const br=lay.box,vp=b.page.viewportSize();
  const clip={x:br.x+2,y:Math.max(0,br.y+6),width:br.w-4,height:Math.min(vp.height,br.y+br.h-6)-Math.max(0,br.y+6)};   // inside the outline, clear of the inset shadows; columns 0-1 and the last two are the button's own padding
  if(clip.width<4||clip.height<4||!lay.toks.length)return {box:br,toks:lay.toks.map(t=>t.kind+':'+t.t),icon:null,word:null};
  // A STABLE CAPTURE: two captures 250ms apart must be byte-identical, up to six tries, so a scan never reads a frame mid-transition (the
  // drill's board fit and the solved row's confetti both repaint after the state is reached). Not the cause of any reading here - the
  // 👁 5-wide reading the first version gave was its median background (below), and it was deterministic.
  let buf=await b.page.screenshot({clip}),stable=false;
  for(let i=0;i<6&&!stable;i++){await b.page.waitForTimeout(250);const nb=await b.page.screenshot({clip});stable=nb.equals(buf);buf=nb;}
  const spans={icon:lay.toks.filter(t=>t.kind==='icon'),word:lay.toks.filter(t=>t.kind==='word')};
  const r=await b.page.evaluate(async({src,clip,spans})=>{const im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=src;});
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
    const W=c.width,H=c.height,d=x.getImageData(0,0,W,H).data,k=W/clip.width;const dist=new Float32Array(W*H);let mx=0;
    // EACH PIXEL ROW'S BACKGROUND IS READ FROM THE BUTTON'S OWN PADDING (its first and last two columns), because the buttons carry a vertical
    // gradient and an inset shadow. The first version took each row's MEDIAN and it was wrong on exactly these rows: a bold word fills
    // most of a 65px button, so through the text the median IS the text, and 👁 read 5 wide where it paints 14.
    for(let y=0;y<H;y++){const ch=[[],[],[]];for(const xx of [0,1,W-2,W-1]){const i=(y*W+xx)*4;ch[0].push(d[i]);ch[1].push(d[i+1]);ch[2].push(d[i+2]);}
      const med=ch.map(a=>a.sort((p,q)=>p-q)[a.length>>1]);
      for(let xx=0;xx<W;xx++){const i=(y*W+xx)*4;const v=Math.max(Math.abs(d[i]-med[0]),Math.abs(d[i+1]-med[1]),Math.abs(d[i+2]-med[2]));dist[y*W+xx]=v;if(v>mx)mx=v;}}
    const T=Math.max(24,mx*0.35);   // from the crop's own range (#397): never a hard-coded polarity
    // a row that is ink across most of the crop is not a glyph (a background estimate gone wrong reads that way: the first, median-based
    // version produced exactly such bands through the word 'Hint'). Such a row is dropped, and counted (dropped), so it cannot widen a glyph.
    let dropped=0;for(let y=0;y<H;y++){let n=0;for(let xx=0;xx<W;xx++)if(dist[y*W+xx]>T)n++;if(n>0.6*W){dropped++;for(let xx=0;xx<W;xx++)dist[y*W+xx]=0;}}
    // THE THRESHOLD IS THE GLYPH'S OWN, not the crop's: the crop's maximum is the white word beside it, and 0.35 of that cut the grey
    // half of 👁 away (it read 5 to 10 wide where it paints 14). So each span's threshold is 0.35 of the brightest ink in its own columns.
    const bbox=(list)=>{if(!list.length)return null;let l=1e9,t=1e9,rr=-1,bt=-1;
      const cols=list.map(s=>[Math.max(0,Math.floor((s.l-clip.x)*k)),Math.min(W-1,Math.ceil((s.r-clip.x)*k)-1)]);   // the token's own columns: a 1px margin took the S of 'Show' into 👁 at 320 wide
      let smx=0;for(const [a,z] of cols)for(let y=0;y<H;y++)for(let xx=a;xx<=z;xx++)if(dist[y*W+xx]>smx)smx=dist[y*W+xx];
      const TS=Math.max(24,smx*0.35);
      for(const [a,z] of cols){
        for(let y=0;y<H;y++)for(let xx=a;xx<=z;xx++)if(dist[y*W+xx]>TS){if(xx<l)l=xx;if(xx>rr)rr=xx;if(y<t)t=y;if(y>bt)bt=y;}}
      if(rr<0)return {w:0,h:0,ext:0,empty:true};const w=+((rr-l+1)/k).toFixed(1),h=+((bt-t+1)/k).toFixed(1);
      return {w,h,ext:Math.max(w,h),cy:+(clip.y+(t+bt+1)/2/k).toFixed(1),top:+(clip.y+t/k).toFixed(1),bot:+(clip.y+(bt+1)/k).toFixed(1)};};
    return {T:Math.round(T),dropped,icon:bbox(spans.icon),word:bbox(spans.word)};
  },{src:'data:image/png;base64,'+buf.toString('base64'),clip,spans});
  return {box:br,stable,toks:lay.toks.map(t=>t.kind+':'+t.t),T:r.T,dropped:r.dropped,icon:r.icon,word:r.word};
}
// each member: how it is found, 'only' (an icon alone) or 'first'/'last' (the icon's side of its word), and the words a finder reads
const ROWS={
  rev:{enter:b=>R.states['moves-ply31'](b),members:[['Back','[data-ct="rev-back"]','only'],['More','[data-ct="rev-more"]','only']]},
  puzzle:{enter:b=>PZ.states['train'](b),members:[['Previous puzzle','[data-ct="pz-bottom"] button[aria-label="Previous puzzle"]','only'],
    ['Hint','[data-ct="pz-bottom"] button:has-text("Hint")','first',/^💡 Hint$/],['Show','[data-ct="pz-bottom"] button:has-text("Show")','first',/^👁 Show$/],
    ['Reset','[data-ct="pz-bottom"] button:has-text("Reset")','first',/^↺ Reset$/],['Next puzzle','[data-ct="pz-bottom"] button[aria-label="Next puzzle"]','only']]},
  solved:{enter:b=>PZ.states['train-solved'](b),members:[['Previous puzzle','[data-ct="pz-bottom"] button[aria-label="Previous puzzle"]','only'],
    ['Next','[data-ct="pz-bottom"] button[aria-label="Next puzzle"]','last',/^Next ›$/]]},
  drill:{store:DSTORE,enter:async b=>{await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="drill-row"]').waitFor({state:'visible',timeout:15000});await b.settle(900);},
    members:[['Hint','[data-ct="drill-row"] button[aria-label="Hint"]','only'],['Show move','[data-ct="drill-row"] button[aria-label="Show move"]','only'],
      ['Reset','[data-ct="drill-row"] button[aria-label="Reset"]','only'],['Prev','[data-ct="drill-prev"]','only'],['Next','[data-ct="drill-next"]','only']]},   // #550 helper B (jobs/transport-row-icon-only, the drill-card extension): Prev and Next are the two arrows now (gate 160), so they are icons alone here
  // THE LESSON ROWS [#550 helper lessons, jobs/lesson-footer-icons-still-differ-6-to-8px-while-gate-157-is-green-2026-11-14]. This gate was
  // green while the lesson footer painted ✕ 12x12 beside chevrons 15x19 and ⋯ 18x4, because it never read a lesson row: the lesson footer's
  // only size checks (gate 11's GLYPH_PIN band, gate 26's lesson-footer pin) read the glyph's LINE BOX, which is 24 for every text glyph at
  // the footer's one font size whatever the ink - the line box measured 17.9x24 around 12x12 of ✕ ink. Both instruments were run on the same
  // buttons on trial f5fa39bac951 and the two ink scans (this gate's and the checker's) agree to the pixel; the box is the wrong one.
  // A member's 5th field names the only geometry it exists at: on a short phone (se) 'Now I'll try it' folds into the demo bar, and the
  // practice row folds into the footer (one bar), so the practice rows are two rows at kunal761 and one at se.
  lessondemo:{tol:1,enter:b=>LS.states['demo-m0'](b),members:[['Close','[data-ct="lesson-footer"] button[aria-label="Close lesson"]','only'],['Back','[data-ct="lesson-footer"] button[aria-label="Back a move"]','only'],
    ['Play','[data-ct="lesson-footer"] button[aria-label="Play or pause"]','only'],['Forward','[data-ct="lesson-footer"] button[aria-label="Forward a move"]','only'],
    ['Try it','[data-ct="lesson-footer"] button[aria-label="Now I\'ll try it"]','only',null,'se'],['More','[data-ct="lesson-footer"] button[aria-label="More for this lesson"]','only']]},
  lessonend:{tol:1,enter:b=>LS.states['demo-end'](b),members:[['Close','[data-ct="lesson-footer"] button[aria-label="Close lesson"]','only'],['Back','[data-ct="lesson-footer"] button[aria-label="Back a move"]','only'],
    ['Replay','[data-ct="lesson-footer"] button[aria-label="Play or pause"]','only'],['Forward','[data-ct="lesson-footer"] button[aria-label="Forward a move"]','only'],
    ['Try it','[data-ct="lesson-footer"] button[aria-label="Now I\'ll try it"]','only',null,'se'],['More','[data-ct="lesson-footer"] button[aria-label="More for this lesson"]','only']]},
  // while the demo plays the Play button carries ⏸ (painted 9x12 beside the others' 19 before it was scaled; probe on trial e664a9a2543b)
  lessonplay:{tol:1,enter:async b=>{await LS.states['demo-m0'](b);await b.settle(400);await b.page.locator('[data-ct="lesson-footer"] button[aria-label="Play or pause"]').click();await b.page.waitForTimeout(150);
      const t=await b.page.locator('[data-ct="lesson-footer"] button[aria-label="Play or pause"]').innerText();if(!/\u23F8/.test(t))throw new Error('Play tapped and the button does not show ⏸ ('+t+')');},
    members:[['Close','[data-ct="lesson-footer"] button[aria-label="Close lesson"]','only'],['Pause','[data-ct="lesson-footer"] button[aria-label="Play or pause"]','only'],
      ['More','[data-ct="lesson-footer"] button[aria-label="More for this lesson"]','only']]},
  lessonfoot:{tol:1,enter:b=>LS.states['practice-m0'](b),members:[['Close','[data-ct="lesson-footer"] button[aria-label="Close lesson"]','only'],
    ['Flip','[data-ct="lesson-footer"] button[aria-label="Flip board"]','only',null,'se'],['Hints','[data-ct="lesson-footer"] button[aria-label="Hints"]','only',null,'se'],
    ['Try again','[data-ct="lesson-footer"] button[aria-label="Try again"]','only',null,'se'],['More','[data-ct="lesson-footer"] button[aria-label="More for this lesson"]','only']]},
  lessonrow:{tol:1,geo:'kunal761',enter:b=>LS.states['practice-m0'](b),members:[['Flip','button[aria-label="Flip board"]','only'],['Hints','button[aria-label="Hints"]','only'],
    ['Try again','button[aria-label="Try again"]','first',/^↻ Try again$/]]},
  lessondone:{tol:1,enter:b=>LS.states['practice-complete'](b),members:[['Flip','button[aria-label="Flip board"]','only'],['Hints','button[aria-label="Hints"]','only'],
    ['Next','button[aria-label^="Next lesson:"]','last',/^(Next: .+|Next lesson|Next) ›$/,'kunal761'],['Next','button[aria-label^="Next lesson:"]','only',null,'se'],
    ['Close','[data-ct="lesson-footer"] button[aria-label="Close lesson"]','only',null,'se'],['More','[data-ct="lesson-footer"] button[aria-label="More for this lesson"]','only',null,'se']]},
  // a clean run with Hints on offers '✓ Bank it' in the same slot (gate 111 TC-R191d's route: practice, Hints on at move 0, the Italian line)
  lessonbank:{tol:1,store:{ct_pool:'3'},enter:async b=>{await LS.states['practice-m0'](b);await LS.tapBtn(b,/^Hints$/,400);
      for(const [f,t] of [['e2','e4'],['g1','f3'],['f1','c4'],['c2','c3'],['d2','d3']]){await b.move(f,t,1100);if(/Complete!/.test((await LS.noteText(b))||''))break;}
      await b.settle(700);await b.page.locator('[data-ct="lesson-bank-it"]').waitFor({state:'visible',timeout:8000});},
    members:[['Flip','button[aria-label="Flip board"]','only'],['Hints','button[aria-label="Hints"]','only'],
      ['Bank it','[data-ct="lesson-bank-it"]','first',/^✓ Bank it(: hints off)?$/,'kunal761'],['Bank it','[data-ct="lesson-bank-it"]','only',null,'se']]},
};
const TOL=2;
L.run(async()=>{
  const geos=(process.env.CT_IR_GEOS||'kunal761,se').split(',');const only=process.env.CT_IR_ROWS?process.env.CT_IR_ROWS.split(','):null;
  for(const geo of geos)for(const [rk,row] of Object.entries(ROWS)){
    if(only&&!only.includes(rk))continue;if(row.geo&&row.geo!==geo)continue;const tag=geo+' '+rk;
    const members=row.members.filter(m=>!m[4]||m[4]===geo);   // a member's 5th field: the only geometry it exists at
    const b=await L.launch({geo,name:'icon-rows-'+rk+'-'+geo,store:row.store});await b.open();let entered=true;
    try{await row.enter(b);}catch(e){entered=false;L.note&&L.note('enter failed: '+e.message);}
    const got=[];
    for(const [lab,sel,which,word] of members){const loc=b.page.locator(sel).filter({visible:true});
      if(!(await loc.count())){got.push({lab,missing:true});continue;}
      const h=await loc.first().elementHandle();const g=await inkOf(b,h);const txt=(await h.evaluate(e=>(e.innerText||'').replace(/\s+/g,' ').trim()));
      const icon=g.icon&&!g.icon.empty?g.icon:null;
      got.push({lab,which,box:{y:+g.box.y.toFixed(1),h:+g.box.h.toFixed(1),w:+g.box.w.toFixed(1)},toks:g.toks,txt,word,icon,wordCy:g.word&&!g.word.empty?g.word.cy:null,
        ok1:!!icon&&(which==='only'?!g.word:!!(g.word&&!g.word.empty))});}
    const found=got.filter(x=>!x.missing&&x.icon);
    L.say(entered&&found.length===members.length&&got.every(x=>x.ok1),'TC-IR-01 '+tag+' PRECONDITION the row is open, all '+members.length+' members found, each carries its glyph'+(members.some(m=>m[2]!=='only')?' and its word':'')+' ('+got.map(x=>x.lab+(x.missing?' MISSING':' ['+x.toks.join(' ')+']')).join(', ')+')',got);
    const ext=found.map(x=>x.icon.ext);const spread=ext.length?+(Math.max(...ext)-Math.min(...ext)).toFixed(1):null;
    L.say(found.length===members.length&&spread!==null&&spread<=(row.tol??TOL),'TC-IR-02 '+tag+' the icon glyphs are one size: '+found.map(x=>x.lab+' '+x.icon.w+'x'+x.icon.h).join(', ')+' - spread '+spread+'px against '+(row.tol??TOL),found.map(x=>({lab:x.lab,icon:x.icon})));
    const mixed=found.filter(x=>x.which!=='only');
    if(mixed.length){const off=mixed.map(x=>({lab:x.lab,d:x.wordCy==null?null:+Math.abs(x.icon.cy-x.wordCy).toFixed(1)}));
      L.say(off.every(o=>o.d!==null&&o.d<=TOL),'TC-IR-03 '+tag+' each glyph sits level with its word: '+off.map(o=>o.lab+' '+o.d+'px').join(', '),off);}
    L.say(found.length===members.length&&found.every(x=>x.box.h<=44.5&&x.icon.top>=x.box.y-0.5&&x.icon.bot<=x.box.y+x.box.h+0.5),'TC-IR-04 '+tag+' no button grew past 44 and every glyph is painted inside its own button ('+found.map(x=>x.lab+' '+x.box.w+'x'+x.box.h).join(', ')+')',found.map(x=>({lab:x.lab,box:x.box,top:x.icon.top,bot:x.icon.bot})));
    const worded=got.filter(x=>x.word);
    if(worded.length)L.say(worded.every(x=>x.word.test(x.txt||'')),'TC-IR-05 '+tag+' the words a finder reads are unchanged: '+worded.map(x=>JSON.stringify(x.txt)).join(', '),worded.map(x=>({lab:x.lab,txt:x.txt})));
    L.say(b.errs.length===0,'TC-IR '+tag+' zero app errors',b.errs.slice(0,3));
    await b.close();
  }
  L.done();
});
// SELECTOR-OPENED: drill-row reading=presence #550 lead, opened by reading: enter() waits for it and TC-IR-01/02/04 require all members found, so a missing hook reds the row
// SELECTOR-OPENED: drill-next reading=presence #550 lead, opened by reading: TC-IR-01 requires every member found by its selector, so a missing Next hook reds
// SELECTOR-OPENED: lesson-bank-it reading=presence #550 test-system helper A, opened by reading and confirmed on m6 46c1c43522a4 (the tip with the six last unopened hooks renamed; tip trial aae17ede75ff green): enter() waits for it and TC-IR-01/02/04 require every member found, so a missing hook reds lessonbank at both geometries
// SELECTOR-OPENED: lesson-footer reading=presence #550 test-system helper A, opened by reading and confirmed on m6 46c1c43522a4 (the tip with the six last unopened hooks renamed; tip trial aae17ede75ff green): every lesson-row member is found inside it, so TC-IR-01/02/04 red for lessondemo, lessonend, lessonplay and lessonfoot (99/0 -> 58/39 with the drill and bank hooks)
